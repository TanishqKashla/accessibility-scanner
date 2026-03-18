import mongoose, { Schema, Document } from "mongoose";

export interface IOrganization extends Document {
  name: string;
  settings?: Record<string, unknown>;
  thresholds?: {
    passScore?: number;
    partialScore?: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

const OrganizationSchema = new Schema<IOrganization>(
  {
    name: { type: String, required: true, trim: true },
    settings: { type: Schema.Types.Mixed, default: {} },
    thresholds: {
      passScore: { type: Number, default: 90 },
      partialScore: { type: Number, default: 70 },
    },
  },
  { timestamps: true }
);

const Organization =
  mongoose.models.Organization ||
  mongoose.model<IOrganization>("Organization", OrganizationSchema);

export default Organization;
