import mongoose, { Schema, Document } from "mongoose";

export type ScanStatus = "pending" | "queued" | "running" | "completed" | "failed" | "stopped";

export interface IScan extends Document {
  targetUrl: string;
  config?: Record<string, unknown>;
  status: ScanStatus;
  toolVersions?: {
    axe?: string;
    playwright?: string;
    chromium?: string;
  };
  orgId: mongoose.Types.ObjectId;
  createdBy?: mongoose.Types.ObjectId;
  progress?: {
    phase?: string;
    scannedPages?: number;
    totalPages?: number;
    currentUrl?: string;
    sitemapFound?: boolean;
    startedAt?: Date;
    completedAt?: Date;
  };
  error?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ScanSchema = new Schema<IScan>(
  {
    targetUrl: { type: String, required: true },
    config: { type: Schema.Types.Mixed, default: {} },
    status: {
      type: String,
      enum: ["pending", "queued", "running", "completed", "failed", "stopped"],
      default: "pending",
      index: true,
    },
    toolVersions: {
      axe: String,
      playwright: String,
      chromium: String,
    },
    orgId: { type: Schema.Types.ObjectId, ref: "Organization", required: true, index: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
    progress: {
      phase: { type: String, default: "pending" },
      scannedPages: { type: Number, default: 0 },
      totalPages: { type: Number, default: 0 },
      currentUrl: String,
      sitemapFound: Boolean,
      startedAt: Date,
      completedAt: Date,
    },
    error: { type: String },
  },
  { timestamps: true }
);

const Scan = mongoose.models.Scan || mongoose.model<IScan>("Scan", ScanSchema);

export default Scan;
