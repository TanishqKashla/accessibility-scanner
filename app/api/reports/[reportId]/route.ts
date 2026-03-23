import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db/connection";
import { verifyAuth } from "@/lib/auth/middleware";
import { apiLimiter, rateLimitResponse } from "@/lib/ratelimit";
import { logger } from "@/lib/logger";
import mongoose from "mongoose";

// GET /api/reports/:reportId — Get report JSON
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ reportId: string }> }
) {
  try {
    const user = await verifyAuth(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { success, reset } = await apiLimiter.limit(user.userId);
    if (!success) return rateLimitResponse(reset - Date.now());

    const { reportId } = await params;

    await connectDB();
    const Report = mongoose.models.Report;
    const Scan = mongoose.models.Scan;
    const PageResult = mongoose.models.PageResult;

    const report = await Report.findById(reportId).lean();
    if (!report) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }

    const reportData = report as Record<string, unknown>;

    // Verify org access
    const scan = await Scan.findById(reportData.scanId).lean();
    if (!scan) {
      return NextResponse.json({ error: "Scan not found" }, { status: 404 });
    }

    const scanData = scan as Record<string, unknown>;
    if (String(scanData.orgId) !== user.orgId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get page results
    const pages = await PageResult.find({ scanId: reportData.scanId })
      .select("url normalizedUrl depth issues")
      .lean();

    return NextResponse.json({
      report: reportData,
      scan: scanData,
      pages,
    });
  } catch (error) {
    logger.error({ err: error }, "GET /api/reports/:reportId error");
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
