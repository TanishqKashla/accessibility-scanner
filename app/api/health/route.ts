import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db/connection";
import { Redis } from "@upstash/redis";
import mongoose from "mongoose";

export const dynamic = "force-dynamic";

export async function GET() {
  const checks: Record<string, string> = { status: "ok", db: "unknown", redis: "unknown" };
  let healthy = true;

  // Check MongoDB
  try {
    await connectDB();
    checks.db = mongoose.connection.readyState === 1 ? "ok" : "degraded";
    if (checks.db !== "ok") healthy = false;
  } catch {
    checks.db = "error";
    healthy = false;
  }

  // Check Upstash Redis
  try {
    const redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    });
    await redis.ping();
    checks.redis = "ok";
  } catch {
    checks.redis = "error";
    healthy = false;
  }

  checks.status = healthy ? "ok" : "degraded";

  return NextResponse.json(checks, { status: healthy ? 200 : 503 });
}
