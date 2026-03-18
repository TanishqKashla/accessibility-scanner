import mongoose from "mongoose";

// Register all models on import
import "./models/index";

function getMongoUri(): string {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error("Missing MONGODB_URI environment variable.");
  }
  return uri;
}

declare global {
  // eslint-disable-next-line no-var
  var _mongooseConnection: {
    conn: typeof mongoose | null;
    promise: Promise<typeof mongoose> | null;
  } | undefined;
}

const cached = global._mongooseConnection || { conn: null as typeof mongoose | null, promise: null as Promise<typeof mongoose> | null };

export async function connectDB(): Promise<typeof mongoose> {
  if (cached.conn) return cached.conn;

  if (!cached.promise) {
    cached.promise = mongoose.connect(getMongoUri(), {
      bufferCommands: false,
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 10_000,
    });
  }

  cached.conn = await cached.promise;
  global._mongooseConnection = cached;
  return cached.conn;
}

// Alias for backward compatibility
export const connectMongo = connectDB;
export default connectDB;
