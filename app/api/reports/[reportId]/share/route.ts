import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db/connection";
import { verifyAuth } from "@/lib/auth/middleware";
import crypto from "crypto";
import mongoose from "mongoose";

// POST /api/reports/:reportId/share — Create a share link
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ reportId: string }> }
) {
  try {
    const user = verifyAuth(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { reportId } = await params;

    await connectDB();
    const Report = mongoose.models.Report;
    const Scan = mongoose.models.Scan;
    const ShareLink = mongoose.models.ShareLink;

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

    // Parse options
    const body = await req.json().catch(() => ({}));
    const expiresInDays = body.expiresInDays || 7;
    const password = body.password || undefined;

    // Generate unique share ID
    const shareId = crypto.randomBytes(16).toString("hex");

    // Calculate expiry
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiresInDays);

    // Hash password if provided
    let hashedPassword: string | undefined;
    if (password) {
      const bcrypt = await import("bcryptjs");
      hashedPassword = await bcrypt.hash(password, 10);
    }

    const shareLink = await ShareLink.create({
      reportId,
      shareId,
      expiresAt,
      password: hashedPassword,
    });

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    return NextResponse.json({
      shareId: shareLink.shareId,
      url: `${appUrl}/public/report/${shareLink.shareId}`,
      expiresAt: shareLink.expiresAt,
      passwordProtected: !!password,
    }, { status: 201 });
  } catch (error) {
    console.error("[POST /api/reports/:reportId/share] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
