import { Worker, Job } from "bullmq";
import crypto from "crypto";
import { getRedisConnection } from "../connection";
import { crawlQueue, aggregateQueue } from "../queues";
import { logger } from "../../logger";
import { normalizeUrl, isSameDomain, isScannableUrl } from "../../scanner/normalizer";
import { markVisited, getVisitedCount } from "../../scanner/dedup";
// Priority scoring removed — BullMQ v5's prioritized sorted set mechanism
// doesn't work reliably on all Redis providers (e.g. Upstash). FIFO is fine
// since seed worker already orders URLs by importance.
import { isDisallowed } from "../../scanner/sitemap";
import { acquireContext, releaseContext, navigateTo, extractLinks } from "../../scanner/browserPool";
import type { Page } from "playwright";
import { runAxeAudit } from "../../scanner/axeRunner";
import { connectDB } from "../../db/connection";
import mongoose from "mongoose";

interface CrawlJobData {
  scanId: string;
  url: string;
  targetUrl: string;
  depth: number;
  maxDepth: number;
  maxPages: number;
  wcagLevel: string;
}

const PENDING_KEY = (scanId: string) => `crawl-pending:${scanId}`;
const LOCK_KEY = (scanId: string) => `aggregate-lock:${scanId}`;

/**
 * Decrement the per-scan pending counter and trigger aggregation when it
 * reaches zero. A Redis SET NX lock prevents duplicate aggregate jobs.
 */
async function decrementAndMaybeAggregate(scanId: string): Promise<void> {
  const redis = getRedisConnection();
  const pending = await redis.decr(PENDING_KEY(scanId));

  if (pending <= 0) {
    const acquired = await redis.set(LOCK_KEY(scanId), "1", "EX", 300, "NX");
    if (acquired) {
      logger.info({ scanId }, "All crawl jobs done, triggering aggregation");
      await aggregateQueue.add(
        "aggregate",
        { scanId },
        { jobId: `aggregate-${scanId}` }
      );
      await connectDB();
      const Scan = mongoose.models.Scan;
      await Scan.findByIdAndUpdate(scanId, { "progress.phase": "aggregating" });
    }
  }
}

async function processCrawlJob(job: Job<CrawlJobData>) {
  const { scanId, url, targetUrl, depth, maxDepth, maxPages, wcagLevel } = job.data;

  await connectDB();
  const PageResult = mongoose.models.PageResult;
  const Scan = mongoose.models.Scan;

  // --- Early exit: skip if scan was stopped ---
  const scan = await Scan.findById(scanId).select("status config").lean() as Record<string, unknown> | null;
  if (!scan || ["stopped", "failed", "completed"].includes(scan.status as string)) {
    // Still decrement so the counter doesn't stall
    await decrementAndMaybeAggregate(scanId);
    return { skipped: true, reason: scan?.status ?? "not found" };
  }

  const context = await acquireContext();
  let page: Page | null = null;
  let newJobsEnqueued = 0;

  try {
    await job.updateProgress(10);

    // --- Navigate to page ---
    page = await navigateTo(context, url);
    await job.updateProgress(30);

    // --- Run axe-core audit ---
    const axeResult = await runAxeAudit(page, { wcagLevel });
    await job.updateProgress(60);

    // --- Extract links for BFS crawling ---
    const rawLinks = await extractLinks(page, url);

    // Close page as soon as we're done with it — frees memory within the context
    await page.close().catch(() => {});
    page = null;

    // --- Store PageResult ---
    const issues = axeResult.violations.map((v) => ({
      ruleId: v.ruleId,
      impact: v.impact,
      description: v.description,
      help: v.help,
      helpUrl: v.helpUrl,
      wcagTags: v.wcagTags,
      nodes: v.nodes.map((n) => ({
        html: n.html,
        target: n.target,
        failureSummary: n.failureSummary,
      })),
    }));

    await PageResult.create({
      scanId,
      url,
      normalizedUrl: normalizeUrl(url),
      depth,
      axeRaw: {
        violations: axeResult.violations,
        passes: axeResult.passes,
        incomplete: axeResult.incomplete,
        inapplicable: axeResult.inapplicable,
        timestamp: axeResult.timestamp,
        toolVersion: axeResult.toolVersion,
      },
      issues,
      links: rawLinks.slice(0, 100),
    });

    await job.updateProgress(80);

    // --- BFS: discover and enqueue child URLs ---
    const redis = getRedisConnection();
    const scanConfig = scan.config as Record<string, unknown> | undefined;
    const respectRobots = scanConfig?.respectRobots !== false;
    const disallowedPaths = (scanConfig?.disallowedPaths as string[]) ?? [];

    if (depth < maxDepth) {
      // Budget: how many more URLs can we add before hitting maxPages?
      // getVisitedCount is the authoritative "total URLs committed to scanning".
      // Soft limit: concurrent workers may slightly overshoot, but markVisited
      // (atomic SADD) ensures no URL is ever processed twice.
      const currentVisited = await getVisitedCount(scanId);
      const slotsLeft = Math.max(0, maxPages - currentVisited);

      const newJobsData: Array<{ url: string }> = [];

      for (const link of rawLinks) {
        if (newJobsData.length >= slotsLeft) break;
        if (!isSameDomain(link, targetUrl)) continue;

        const normalized = normalizeUrl(link, targetUrl);

        // Skip non-HTML resources — PDFs, images, binaries can't be audited
        if (!isScannableUrl(normalized)) continue;

        // Enforce robots.txt Disallow rules on BFS-discovered URLs.
        // disallowedPaths was written to the scan config by the seed worker.
        if (respectRobots && disallowedPaths.length > 0) {
          try {
            const path = new URL(normalized).pathname;
            if (isDisallowed(path, disallowedPaths)) continue;
          } catch { continue; }
        }

        const isNew = await markVisited(scanId, normalized);
        if (!isNew) continue;

        newJobsData.push({ url: normalized });
      }

      if (newJobsData.length > 0) {
        // INCR pending BEFORE enqueuing — prevents the counter from
        // momentarily reaching 0 between this job finishing and child jobs
        // being registered, which would cause premature aggregation.
        await redis.incrby(PENDING_KEY(scanId), newJobsData.length);

        for (const { url: childUrl } of newJobsData) {
          await crawlQueue.add(
            "crawl",
            { scanId, url: childUrl, targetUrl, depth: depth + 1, maxDepth, maxPages, wcagLevel },
            { jobId: `crawl-${scanId}-${crypto.createHash("sha256").update(childUrl).digest("base64url").slice(0, 22)}` }
          );
          newJobsEnqueued++;
        }
      }
    }

    // --- Update live progress ---
    // scannedPages: how many pages have been fully audited (crawl-done counter)
    // totalPages:   how many URLs have been committed to scanning so far (visited set)
    //               This grows as BFS discovers new pages — fixes "17 of 1" display.
    const doneCount = Number(await redis.incr(`crawl-done:${scanId}`));
    const totalDiscovered = await getVisitedCount(scanId);
    await Scan.findByIdAndUpdate(scanId, {
      "progress.scannedPages": doneCount,
      "progress.totalPages": totalDiscovered,
      "progress.currentUrl": url,
    });

    await job.updateProgress(100);

    return { url, issuesFound: issues.length, newJobs: newJobsEnqueued };
  } finally {
    // Close page if it wasn't already closed (e.g. error before explicit close)
    if (page) await page.close().catch(() => {});
    await releaseContext(context);
    // Always decrement self — runs whether the job succeeded or threw.
    // If it threw, BullMQ will retry; decrement happens on every attempt end.
    // The aggregate lock prevents duplicate triggers even if counter goes
    // negative on retries.
    await decrementAndMaybeAggregate(scanId);
  }
}

export function createCrawlWorker() {
  const worker = new Worker("crawl", processCrawlJob, {
    connection: getRedisConnection(),
    concurrency: 3,
    // lockDuration: how long a job can be active before BullMQ considers it
    // stalled and re-queues it. Must be longer than the worst-case page audit
    // (navigate 30s + axe 25s + margin) = ~90s total.
    lockDuration: 90_000,
    // Renew the lock every 15s so long-running (but not hung) jobs aren't
    // falsely marked stalled mid-execution.
    lockRenewTime: 15_000,
  });

  worker.on("active", (job) => {
    logger.info({ url: job.data.url }, "CrawlWorker starting");
  });

  worker.on("completed", (job) => {
    logger.info({ url: job.data.url, issues: job.returnvalue?.issuesFound ?? 0 }, "CrawlWorker done");
  });

  worker.on("failed", (job, err) => {
    logger.error({ url: job?.data?.url, err: err.message }, "CrawlWorker failed");
  });

  worker.on("stalled", (jobId) => {
    logger.warn({ jobId }, "CrawlWorker stalled job detected");
  });

  return worker;
}
