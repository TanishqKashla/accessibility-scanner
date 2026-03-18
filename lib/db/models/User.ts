import mongoose, { Schema, Document } from "mongoose";

export type UserRole = "admin" | "auditor" | "viewer";

export interface IUser extends Document {
  email: string;
  hashedPassword?: string;
  googleId?: string;
  role: UserRole;
  orgId: mongoose.Types.ObjectId;
  name?: string;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    hashedPassword: { type: String },
    googleId: { type: String, index: true },
    role: {
      type: String,
      enum: ["admin", "auditor", "viewer"],
      default: "viewer",
    },
    orgId: { type: Schema.Types.ObjectId, ref: "Organization", required: true },
    name: { type: String, trim: true },
  },
  { timestamps: true }
);

const User = mongoose.models.User || mongoose.model<IUser>("User", UserSchema);

export default User;
