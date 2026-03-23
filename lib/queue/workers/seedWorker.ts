import { Worker, Job } from "bullmq";
import crypto from "crypto";
import { getRedisConnection } from "../connection";
import { crawlQueue } from "../queues";
import { logger } from "../../logger";
import { discoverUrls, isDisallowed } from "../../scanner/sitemap";
import { normalizeUrl, isScannableUrl } from "../../scanner/normalizer";
import { markVisited } from "../../scanner/dedup";
import { getUrlPattern } from "../../scanner/priority";
import { connectDB } from "../../db/connection";
import mongoose from "mongoose";

interface SeedJobData {
  scanId: string;
  targetUrl: string;
  config: {
    depth: number;
    maxPages: number;
    axeTags: string[];
    respectRobots: boolean;
  };
}

/**
 * Maximum number of URLs we'll queue for any single URL structural pattern.
 * e.g. if a sitemap has 500 blog posts (/blog/:slug), we sample at most this many.
 * This prevents flooding the queue with hundreds of near-identical pages.
 */
const MAX_URLS_PER_PATTERN = 5;

async function processSeedJob(job: Job<SeedJobData>) {
  const { scanId, targetUrl, config } = job.data;
  const redis = getRedisConnection();

  await connectDB();
  const Scan = mongoose.models.Scan;

  // Update scan status to running
  await Scan.findByIdAndUpdate(scanId, {
    status: "running",
    "progress.phase": "crawling",
    "progress.startedAt": new Date(),
  });

  await job.updateProgress(10);

  // --- 1. URL Discovery ---
  const { urls, sitemapFound, disallowedPaths } = await discoverUrls(targetUrl, {
    respectRobots: config.respectRobots,
    maxUrls: config.maxPages * 2, // Discover more than maxPages so sampling has room to pick
  });

  await job.updateProgress(40);

  // --- 2. Filter, Normalize, Sample, and Enqueue ---
  const wcagLevel = config.axeTags.includes("wcag2aaa")
    ? "AAA"
    : config.axeTags.includes("wcag2aa")
    ? "AA"
    : "A";

  // Pattern frequency map — limits how many similar pages we crawl
  // (e.g., /blog/:slug, /products/:id — avoids 500 near-identical audits)
  const patternCount = new Map<string, number>();

  // Ensure the root URL is always included and processed first
  const rootNormalized = normalizeUrl(targetUrl);
  const orderedUrls = [
    rootNormalized,
    ...urls.filter((u) => normalizeUrl(u) !== rootNormalized),
  ];

  // --- 3. Initialize Redis counters BEFORE enqueuing ---
  // crawl-pending is INCR'd before each crawlQueue.add() and DECR'd when
  // each job finishes. Initializing to 0 here (before the loop) prevents a
  // race where a fast worker finishes and DECRs before we SET the final count.
  // crawl-done tracks completed audits for the UI progress counter.
  // TTL of 2h covers any reasonable scan duration.
  await Promise.all([
    redis.set(`crawl-pending:${scanId}`, 0, "EX", 7_200),
    redis.set(`crawl-done:${scanId}`, 0, "EX", 7_200),
  ]);

  let enqueued = 0;

  for (const url of orderedUrls) {
    if (enqueued >= config.maxPages) break;

    const normalized = normalizeUrl(url);

    // Skip non-HTML resources — PDFs, images, binaries etc. can't be audited
    if (!isScannableUrl(normalized)) continue;

    // Skip disallowed paths when robots.txt is respected
    if (config.respectRobots && disallowedPaths.length > 0) {
      try {
        const path = new URL(normalized).pathname;
        if (isDisallowed(path, disallowedPaths)) continue;
      } catch {
        continue;
      }
    }

    // Pattern-based sampling: skip if we already have MAX_URLS_PER_PATTERN
    // for this URL template. Root URL "/" always bypasses this.
    const pattern = getUrlPattern(normalized);
    if (pattern !== "/") {
      const count = patternCount.get(pattern) ?? 0;
      if (count >= MAX_URLS_PER_PATTERN) continue;
      patternCount.set(pattern, count + 1);
    }

    // Atomic dedup: SADD returns 1 only if the URL was newly added
    const isNew = await markVisited(scanId, normalized);
    if (!isNew) continue;

    // INCR pending BEFORE enqueuing — prevents the counter from momentarily
    // reaching 0 between this seed job finishing and child jobs being registered.
    await redis.incr(`crawl-pending:${scanId}`);

    const urlHash = crypto.createHash("sha256").update(normalized).digest("base64url").slice(0, 22);
    await crawlQueue.add(
      "crawl",
      {
        scanId,
        url: normalized,
        targetUrl,
        depth: 0,
        maxDepth: config.depth,
        maxPages: config.maxPages,
        wcagLevel,
      },
      {
        jobId: `crawl-${scanId}-${urlHash}`,
      }
    );

    enqueued++;
  }

  if (enqueued === 0) {
    // Nothing to crawl — mark as failed immediately
    await Scan.findByIdAndUpdate(scanId, {
      status: "failed",
      error: "No crawlable URLs found for this target",
    });
    // Clean up the counters we initialized above
    await Promise.all([
      redis.del(`crawl-pending:${scanId}`),
      redis.del(`crawl-done:${scanId}`),
    ]);
  }

  // --- 4. Update scan metadata ---
  // Store disallowedPaths in the scan config so crawl workers can enforce
  // robots.txt rules on BFS-discovered URLs (not just sitemap ones).
  await Scan.findByIdAndUpdate(scanId, {
    "progress.totalPages": enqueued,
    "progress.sitemapFound": sitemapFound,
    "config.disallowedPaths": disallowedPaths,
  });

  await job.updateProgress(100);

  return { enqueued, sitemapFound, urlsDiscovered: urls.length };
}

export function createSeedWorker() {
  const worker = new Worker("seed", processSeedJob, {
    connection: getRedisConnection(),
    concurrency: 2,
  });

  worker.on("completed", (job) => {
    logger.info({ jobId: job.id, result: job.returnvalue }, "SeedWorker done");
  });

  worker.on("failed", (job, err) => {
    logger.error({ jobId: job?.id, err: err.message }, "SeedWorker failed");
  });

  return worker;
}
