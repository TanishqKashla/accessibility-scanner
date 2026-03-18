import mongoose, { Schema, Document } from "mongoose";

export type ReportStatus = "pending" | "processing" | "ready" | "failed" | "pass" | "partial" | "fail";

export interface IReport extends Document {
  scanId: mongoose.Types.ObjectId;
  score?: number;
  status: ReportStatus;
  breakdown?: Record<string, unknown>;
  hash?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ReportSchema = new Schema<IReport>(
  {
    scanId: { type: Schema.Types.ObjectId, ref: "Scan", required: true, index: true },
    score: Number,
    status: {
      type: String,
      enum: ["pending", "processing", "ready", "failed", "pass", "partial", "fail"],
      default: "pending",
    },
    breakdown: Schema.Types.Mixed,
    hash: String,
  },
  { timestamps: true }
);

const Report = mongoose.models.Report || mongoose.model<IReport>("Report", ReportSchema);

export default Report;
