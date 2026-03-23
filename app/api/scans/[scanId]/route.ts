import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db/connection";
import { verifyAuth } from "@/lib/auth/middleware";
import { apiLimiter, rateLimitResponse } from "@/lib/ratelimit";
import { logger } from "@/lib/logger";
import mongoose from "mongoose";

// GET /api/scans/:scanId — Get scan status and details
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ scanId: string }> }
) {
  try {
    const user = await verifyAuth(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { success, reset } = await apiLimiter.limit(user.userId);
    if (!success) return rateLimitResponse(reset - Date.now());

    const { scanId } = await params;

    await connectDB();
    const Scan = mongoose.models.Scan;
    const PageResult = mongoose.models.PageResult;
    const Report = mongoose.models.Report;

    const scan = await Scan.findOne({ _id: scanId, orgId: user.orgId }).lean();
    if (!scan) {
      return NextResponse.json({ error: "Scan not found" }, { status: 404 });
    }

    // Get page count and issue summary
    const [pageCount, report] = await Promise.all([
      PageResult.countDocuments({ scanId }),
      Report.findOne({ scanId }).lean(),
    ]);

    return NextResponse.json({
      scan,
      pageCount,
      report: report || null,
    });
  } catch (error) {
    logger.error({ err: error }, "GET /api/scans/:scanId error");
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
