/**
 * Standalone worker process.
 * Run with: npm run workers
 *
 * This starts all BullMQ workers that process scan jobs,
 * plus a scan completion monitor that catches any stuck scans.
 */

import "dotenv/config";
import { createSeedWorker } from "../lib/queue/workers/seedWorker";
import { createCrawlWorker } from "../lib/queue/workers/crawlWorker";
import { createAggregateWorker } from "../lib/queue/workers/aggregateWorker";
import { createExportWorker } from "../lib/queue/workers/exportWorker";
import { closeBrowser } from "../lib/scanner/browserPool";
import { aggregateQueue, crawlQueue } from "../lib/queue/queues";
import { getRedisConnection } from "../lib/queue/connection";
import { connectDB } from "../lib/db/connection";
import { logger } from "../lib/logger";
import mongoose from "mongoose";

logger.info("Accessibility Scanner Worker Process starting");

const workers = [
  createSeedWorker(),
  createCrawlWorker(),
  createAggregateWorker(),
  createExportWorker(),
];

logger.info(
  { count: workers.length, workers: ["SeedWorker", "CrawlWorker", "AggregateWorker", "ExportWorker"] },
  "Workers started"
);
logger.info("Waiting for jobs");

/**
 * Queue state logger — runs every 10 seconds during active scans.
 */
async function logQueueState() {
  try {
    const counts = await crawlQueue.getJobCounts("waiting", "active", "prioritized", "delayed", "failed");
    const total = (counts.waiting ?? 0) + (counts.active ?? 0) + (counts.prioritized ?? 0) + (counts.delayed ?? 0);
    if (total > 0) {
      logger.info({ queue: "crawl", ...counts }, "Queue state");
    }
  } catch { /* ignore */ }
}

const queueLogInterval = setInterval(logQueueState, 10_000);

/**
 * Scan completion monitor — runs every 15 seconds.
 * Catches scans stuck in "running" where all crawl jobs have finished
 * but the aggregate was never triggered (safety net).
 */
async function monitorStuckScans() {
  try {
    await connectDB();
    const Scan = mongoose.models.Scan;
    const Report = mongoose.models.Report;
    if (!Scan || !Report) return;

    // Find scans that have been "running" for more than 5 minutes without progress
    const stuckScans = await Scan.find({
      status: "running",
      updatedAt: { $lt: new Date(Date.now() - 5 * 60_000) }, // Not updated in 5 min
    }).lean();

    const redis = getRedisConnection();

    for (const scan of stuckScans) {
      const scanData = scan as Record<string, unknown>;
      const scanId = String(scanData._id);

      // Skip if report already exists
      const existingReport = await Report.findOne({ scanId }).lean();
      if (existingReport) continue;

      // Use the Redis pending counter (set by seedWorker, managed by crawlWorker).
      // A value of 0 or missing means all jobs finished but aggregate wasn't triggered.
      const pending = await redis.get(`crawl-pending:${scanId}`);
      const pendingCount = pending === null ? 0 : parseInt(pending, 10);

      if (pendingCount <= 0) {
        // Attempt to acquire the aggregate lock — prevents races with crawlWorker
        const acquired = await redis.set(
          `aggregate-lock:${scanId}`, "1", "EX", 300, "NX"
        );
        if (!acquired) continue; // crawlWorker already triggered it

        logger.warn({ scanId, pendingCount }, "Scan stuck >5 min, triggering partial aggregation");

        await aggregateQueue.add(
          "aggregate",
          { scanId, partial: true },
          { jobId: `aggregate-${scanId}-monitor` }
        );

        await Scan.findByIdAndUpdate(scanId, { "progress.phase": "aggregating" });
      }
    }
  } catch (err) {
    // Don't crash the monitor
    logger.error({ err }, "Monitor error");
  }
}

// Start the monitor
const monitorInterval = setInterval(monitorStuckScans, 15_000);

// Graceful shutdown
async function shutdown() {
  logger.info("Shutting down workers");
  clearInterval(monitorInterval);
  clearInterval(queueLogInterval);
  await Promise.all(workers.map((w) => w.close()));
  await closeBrowser();
  await mongoose.disconnect().catch(() => {});
  logger.info("Workers stopped");
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
