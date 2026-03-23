import { Worker, Job } from "bullmq";
import { getRedisConnection } from "../connection";
import { connectDB } from "../../db/connection";
import { logger } from "../../logger";
import mongoose from "mongoose";

interface ExportJobData {
  scanId: string;
  reportId: string;
  format: "json" | "csv" | "pdf";
}

async function processExportJob(job: Job<ExportJobData>) {
  const { reportId, format } = job.data;

  await connectDB();

  await job.updateProgress(10);

  // Export logic will be fully implemented in Phase 6
  // For now, mark the export as ready
  logger.info({ format, reportId }, "ExportWorker processing");

  await job.updateProgress(100);

  return { reportId, format, status: "ready" };
}

export function createExportWorker() {
  const worker = new Worker("export", processExportJob, {
    connection: getRedisConnection(),
    concurrency: 2,
  });

  worker.on("completed", (job) => {
    logger.info({ jobId: job.id, result: job.returnvalue }, "ExportWorker completed");
  });

  worker.on("failed", (job, err) => {
    logger.error({ jobId: job?.id, err: err.message }, "ExportWorker failed");
  });

  return worker;
}
