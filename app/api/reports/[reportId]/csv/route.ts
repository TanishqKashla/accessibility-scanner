import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db/connection";
import { verifyAuth } from "@/lib/auth/middleware";
import { generateCsv } from "@/lib/export/csv";
import mongoose from "mongoose";

// GET /api/reports/:reportId/csv — Download CSV export
export async function GET(
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

    // Get page results with issues
    const pages = await PageResult.find({ scanId: reportData.scanId })
      .select("url issues")
      .lean();

    const pageData = (pages as Array<Record<string, unknown>>).map((p) => ({
      url: p.url as string,
      issues: (p.issues as Array<Record<string, unknown>> || []).map((i) => ({
        ruleId: i.ruleId as string,
        impact: i.impact as string,
        description: i.description as string,
        help: i.help as string,
        helpUrl: i.helpUrl as string,
        wcagTags: i.wcagTags as string[],
        nodes: i.nodes as Array<{ html?: string; target?: string[]; failureSummary?: string }>,
      })),
    }));

    const csv = generateCsv(pageData);
    const domain = (() => {
      try { return new URL(scanData.targetUrl as string).hostname; } catch { return "report"; }
    })();

    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${domain}-accessibility-report.csv"`,
      },
    });
  } catch (error) {
    console.error("[GET /api/reports/:reportId/csv] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
