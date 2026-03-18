import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db/connection";
import { verifyAuth } from "@/lib/auth/middleware";
import { aggregateQueue } from "@/lib/queue/queues";
import mongoose from "mongoose";

// POST /api/scans/:scanId/stop — Manually stop a running scan and generate a partial report
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ scanId: string }> }
) {
  try {
    const user = await verifyAuth(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { scanId } = await params;

    await connectDB();
    const Scan = mongoose.models.Scan;
    const Report = mongoose.models.Report;

    const scan = await Scan.findOne({ _id: scanId, orgId: user.orgId }).lean();
    if (!scan) {
      return NextResponse.json({ error: "Scan not found" }, { status: 404 });
    }

    const scanData = scan as Record<string, unknown>;
    const currentStatus = scanData.status as string;

    if (!["running", "queued"].includes(currentStatus)) {
      return NextResponse.json(
        { error: `Scan cannot be stopped — current status is "${currentStatus}"` },
        { status: 409 }
      );
    }

    // Check if a report already exists
    const existingReport = await Report.findOne({ scanId }).lean();
    if (existingReport) {
      return NextResponse.json({ error: "Report already exists for this scan" }, { status: 409 });
    }

    // Mark scan as stopped immediately so workers know to skip new jobs
    await Scan.findByIdAndUpdate(scanId, {
      status: "stopped",
      "progress.phase": "stopped",
      "progress.completedAt": new Date(),
    });

    // Enqueue partial aggregation — uses whatever PageResults exist so far
    await aggregateQueue.add(
      "aggregate",
      { scanId, partial: true },
      { jobId: `aggregate-${scanId}-stop` }
    );

    return NextResponse.json({
      message: "Scan stopped. Generating partial report from data collected so far.",
      scanId,
    });
  } catch (error) {
    console.error("[POST /api/scans/:scanId/stop] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
