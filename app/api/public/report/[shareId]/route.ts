import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db/connection";
import { apiLimiter, rateLimitResponse } from "@/lib/ratelimit";
import { logger } from "@/lib/logger";
import mongoose from "mongoose";

// GET /api/public/report/:shareId — Public report data (no auth required)
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ shareId: string }> }
) {
  try {
    const { shareId } = await params;

    const ip = req.headers.get("x-forwarded-for")?.split(",")[0] ?? "anonymous";
    const { success, reset } = await apiLimiter.limit(ip);
    if (!success) return rateLimitResponse(reset - Date.now());

    await connectDB();
    const ShareLink = mongoose.models.ShareLink;
    const Report = mongoose.models.Report;
    const Scan = mongoose.models.Scan;
    const PageResult = mongoose.models.PageResult;

    const link = await ShareLink.findOne({ shareId }).lean();
    if (!link) {
      return NextResponse.json({ error: "Share link not found" }, { status: 404 });
    }

    const linkData = link as Record<string, unknown>;

    // Check expiry
    if (linkData.expiresAt && new Date(linkData.expiresAt as string) < new Date()) {
      return NextResponse.json({ error: "This share link has expired" }, { status: 410 });
    }

    // Check password if set
    if (linkData.password) {
      const providedPassword = req.headers.get("x-share-password");
      if (!providedPassword) {
        return NextResponse.json(
          { error: "Password required", passwordRequired: true },
          { status: 401 }
        );
      }

      const bcrypt = await import("bcryptjs");
      const valid = await bcrypt.compare(providedPassword, linkData.password as string);
      if (!valid) {
        return NextResponse.json(
          { error: "Invalid password", passwordRequired: true },
          { status: 401 }
        );
      }
    }

    // Fetch report and scan
    const report = await Report.findById(linkData.reportId).lean();
    if (!report) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }

    const reportData = report as Record<string, unknown>;
    const scan = await Scan.findById(reportData.scanId)
      .select("targetUrl config toolVersions createdAt")
      .lean();

    // Fetch pages (limited fields for public view)
    const pages = await PageResult.find({ scanId: reportData.scanId })
      .select("url issues.ruleId issues.impact issues.nodes")
      .lean();

    return NextResponse.json({
      report: reportData,
      scan,
      pageCount: pages.length,
      expiresAt: linkData.expiresAt,
    });
  } catch (error) {
    logger.error({ err: error }, "GET /api/public/report/:shareId error");
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
