import mongoose, { Schema, Document } from "mongoose";

export interface IPageIssueNode {
  html?: string;
  target?: string[];
  failureSummary?: string;
}

export interface IPageIssue {
  impact?: "critical" | "serious" | "moderate" | "minor";
  ruleId?: string;
  description?: string;
  help?: string;
  helpUrl?: string;
  wcagTags?: string[];
  nodes?: IPageIssueNode[];
}

export interface IPageResult extends Document {
  scanId: mongoose.Types.ObjectId;
  url: string;
  normalizedUrl: string;
  depth?: number;
  axeRaw?: Record<string, unknown>;
  issues?: IPageIssue[];
  links?: string[];
  createdAt: Date;
  updatedAt: Date;
}

const IssueNodeSchema = new Schema(
  {
    html: String,
    target: [String],
    failureSummary: String,
  },
  { _id: false }
);

const IssueSchema = new Schema<IPageIssue>(
  {
    impact: { type: String, enum: ["critical", "serious", "moderate", "minor"] },
    ruleId: String,
    description: String,
    help: String,
    helpUrl: String,
    wcagTags: [String],
    nodes: [IssueNodeSchema],
  },
  { _id: false }
);

const PageResultSchema = new Schema<IPageResult>(
  {
    scanId: { type: Schema.Types.ObjectId, ref: "Scan", required: true, index: true },
    url: { type: String, required: true },
    normalizedUrl: { type: String, required: true, index: true },
    depth: Number,
    axeRaw: Schema.Types.Mixed,
    issues: [IssueSchema],
    links: [String],
  },
  { timestamps: true }
);

const PageResult =
  mongoose.models.PageResult ||
  mongoose.model<IPageResult>("PageResult", PageResultSchema);

export default PageResult;
