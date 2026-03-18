import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db/connection";
import { verifyAuth } from "@/lib/auth/middleware";
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
    console.error("[GET /api/scans/:scanId] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
