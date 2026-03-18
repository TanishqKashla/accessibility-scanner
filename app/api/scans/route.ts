import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db/connection";
import { verifyAuth } from "@/lib/auth/middleware";
import mongoose from "mongoose";
import { seedQueue } from "@/lib/queue/queues";
import axePkg from "axe-core/package.json";
import playwrightPkg from "playwright/package.json";

// POST /api/scans — Create a new scan
export async function POST(req: NextRequest) {
  try {
    const user = await verifyAuth(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { targetUrl, config = {} } = body;

    if (!targetUrl) {
      return NextResponse.json({ error: "targetUrl is required" }, { status: 400 });
    }

    // Validate URL
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(targetUrl);
      if (!["http:", "https:"].includes(parsedUrl.protocol)) {
        throw new Error("Invalid protocol");
      }
    } catch {
      return NextResponse.json({ error: "Invalid URL. Must be a valid http/https URL." }, { status: 400 });
    }

    await connectDB();
    const Scan = mongoose.models.Scan;

    const scanConfig = {
      depth: Math.min(Math.max(config.depth || 3, 1), 10),
      maxPages: Math.min(Math.max(config.maxPages || 100, 1), 1000),
      axeTags: config.axeTags || ["wcag2a", "wcag2aa"],
      respectRobots: config.respectRobots !== false,
    };

    // Create scan record
    const scan = await Scan.create({
      targetUrl: parsedUrl.toString(),
      config: scanConfig,
      status: "queued",
      orgId: user.orgId,
      createdBy: user.userId,
      toolVersions: {
        axe: axePkg.version,
        playwright: playwrightPkg.version,
      },
      progress: {
        phase: "seeding",
        scannedPages: 0,
        totalPages: 0,
      },
    });

    // Enqueue seed job
    await seedQueue.add(
      "seed",
      {
        scanId: scan._id.toString(),
        targetUrl: parsedUrl.toString(),
        config: scanConfig,
      },
      { jobId: `seed-${scan._id}` }
    );

    return NextResponse.json({
      scanId: scan._id,
      status: scan.status,
      targetUrl: scan.targetUrl,
      config: scanConfig,
    }, { status: 201 });
  } catch (error) {
    console.error("[POST /api/scans] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// GET /api/scans — List scans for the authenticated user's org
export async function GET(req: NextRequest) {
  try {
    const user = await verifyAuth(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();
    const Scan = mongoose.models.Scan;

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 100);
    const status = searchParams.get("status");
    const myScans = searchParams.get("myScans") === "true";

    const filter: Record<string, unknown> = { orgId: user.orgId };
    if (status) filter.status = status;
    if (myScans) filter.createdBy = user.userId;

    const [scans, total] = await Promise.all([
      Scan.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Scan.countDocuments(filter),
    ]);

    return NextResponse.json({
      scans,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("[GET /api/scans] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
