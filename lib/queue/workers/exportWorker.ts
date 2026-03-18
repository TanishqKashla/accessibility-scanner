import { Worker, Job } from "bullmq";
import { getRedisConnection } from "../connection";
import { connectDB } from "../../db/connection";
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
  console.log(`[ExportWorker] Processing ${format} export for report ${reportId}`);

  await job.updateProgress(100);

  return { reportId, format, status: "ready" };
}

export function createExportWorker() {
  const worker = new Worker("export", processExportJob, {
    connection: getRedisConnection(),
    concurrency: 2,
  });

  worker.on("completed", (job) => {
    console.log(`[ExportWorker] Job ${job.id} completed:`, job.returnvalue);
  });

  worker.on("failed", (job, err) => {
    console.error(`[ExportWorker] Job ${job?.id} failed:`, err.message);
  });

  return worker;
}
