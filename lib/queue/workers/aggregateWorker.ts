import { Worker, Job } from "bullmq";
import { getRedisConnection } from "../connection";
import { logger } from "../../logger";
import { connectDB } from "../../db/connection";
import { clearVisited } from "../../scanner/dedup";
import { evaluateCompliance } from "../../compliance/engine";
import mongoose from "mongoose";

interface AggregateJobData {
  scanId: string;
  partial?: boolean; // true when scan was stopped early or timed out
}

async function processAggregateJob(job: Job<AggregateJobData>) {
  const { scanId, partial = false } = job.data;

  await connectDB();
  const PageResult = mongoose.models.PageResult;
  const Report = mongoose.models.Report;
  const Scan = mongoose.models.Scan;

  await job.updateProgress(10);

  // Fetch all page results for this scan
  const pages = await PageResult.find({ scanId }).lean();

  if (pages.length === 0) {
    await Scan.findByIdAndUpdate(scanId, {
      status: partial ? "stopped" : "failed",
      error: partial ? "Scan was stopped before any pages were processed" : "No pages were scanned",
    });
    return { error: "No pages scanned" };
  }

  await job.updateProgress(30);

  // Fetch org thresholds if available
  const scan = await Scan.findById(scanId).lean();
  let thresholds;
  if (scan) {
    const scanData = scan as Record<string, unknown>;
    const Organization = mongoose.models.Organization;
    if (Organization && scanData.orgId) {
      const org = await Organization.findById(scanData.orgId).lean();
      if (org) {
        const orgData = org as Record<string, unknown>;
        const orgThresholds = orgData.thresholds as Record<string, number> | undefined;
        if (orgThresholds?.passScore && orgThresholds?.partialScore) {
          thresholds = {
            passScore: orgThresholds.passScore,
            partialScore: orgThresholds.partialScore,
          };
        }
      }
    }
  }

  await job.updateProgress(50);

  // Transform page data for compliance engine
  const pageInputs = pages.map((p) => {
    const page = p as Record<string, unknown>;
    return {
      url: page.url as string,
      issues: ((page.issues as Array<Record<string, unknown>>) || []).map((i) => ({
        ruleId: (i.ruleId as string) || "unknown",
        impact: (i.impact as string) || "minor",
        wcagTags: (i.wcagTags as string[]) || [],
        nodes: (i.nodes as unknown[]) || [],
      })),
    };
  });

  // Run compliance engine
  const result = evaluateCompliance(pageInputs, thresholds);

  await job.updateProgress(70);

  // Fetch the scan's configured totalPages for partial scan metadata
  const configuredTotal =
    (scan as Record<string, unknown> | null)
      ? ((((scan as Record<string, unknown>).progress as Record<string, unknown> | undefined)?.totalPages as number) || 0)
      : 0;

  // Build breakdown for storage
  const breakdown = {
    totalIssues: result.siteScore.totalIssues,
    issuesByImpact: result.siteScore.issuesByImpact,
    pagesScanned: result.siteScore.pagesScanned,
    wcagSummary: result.wcagSummary,
    methodology: result.methodology,
    thresholds: result.thresholds,
    pageScores: result.siteScore.pageScores.map((ps) => ({
      url: ps.url,
      score: ps.score,
      totalIssues: ps.totalIssues,
      issuesByImpact: ps.issuesByImpact,
    })),
    // Partial scan metadata
    isPartial: partial,
    partialMeta: partial
      ? {
          scannedPages: pages.length,
          configuredMaxPages: configuredTotal,
          reason: "Scan was stopped or timed out before completion",
        }
      : undefined,
  };

  // Create report
  const report = await Report.create({
    scanId,
    score: result.score,
    status: result.status,
    breakdown,
    hash: result.hash,
  });

  await job.updateProgress(90);

  // Update scan as completed (or stopped if this was a partial aggregation)
  await Scan.findByIdAndUpdate(scanId, {
    status: partial ? "stopped" : "completed",
    "progress.phase": partial ? "stopped" : "completed",
    "progress.completedAt": new Date(),
  });

  // Clean up all Redis keys for this scan
  const redis = getRedisConnection();
  await Promise.all([
    clearVisited(scanId),
    redis.del(`crawl-done:${scanId}`),
    redis.del(`crawl-pending:${scanId}`),
    redis.del(`aggregate-lock:${scanId}`),
  ]);

  await job.updateProgress(100);

  return {
    reportId: report._id.toString(),
    score: result.score,
    status: result.status,
    totalIssues: result.siteScore.totalIssues,
    pagesScanned: result.siteScore.pagesScanned,
    criteriaViolated: result.wcagSummary.criteriaViolated.length,
  };
}

export function createAggregateWorker() {
  const worker = new Worker("aggregate", processAggregateJob, {
    connection: getRedisConnection(),
    concurrency: 2,
  });

  worker.on("completed", (job) => {
    logger.info({ jobId: job.id, result: job.returnvalue }, "AggregateWorker completed");
  });

  worker.on("failed", (job, err) => {
    logger.error({ jobId: job?.id, err: err.message }, "AggregateWorker failed");
  });

  return worker;
}
