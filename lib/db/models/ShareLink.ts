import mongoose, { Schema, Document } from "mongoose";

export interface IShareLink extends Document {
  reportId: mongoose.Types.ObjectId;
  shareId: string;
  expiresAt?: Date;
  password?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ShareLinkSchema = new Schema<IShareLink>(
  {
    reportId: { type: Schema.Types.ObjectId, ref: "Report", required: true, index: true },
    shareId: { type: String, required: true, unique: true },
    expiresAt: Date,
    password: String,
  },
  { timestamps: true }
);

const ShareLink =
  mongoose.models.ShareLink ||
  mongoose.model<IShareLink>("ShareLink", ShareLinkSchema);

export default ShareLink;
