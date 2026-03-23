import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db/connection";
import { verifyAuth } from "@/lib/auth/middleware";
import { apiLimiter, rateLimitResponse } from "@/lib/ratelimit";
import { logger } from "@/lib/logger";
import { generateCsv } from "@/lib/export/csv";
import mongoose from "mongoose";

// GET /api/reports/:reportId/csv — Download CSV export
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

    // Extract WCAG summary from report breakdown
    const breakdown = reportData.breakdown as Record<string, unknown> | undefined;
    const wcagSummary = breakdown?.wcagSummary as Record<string, unknown> | undefined;
    const rawTopRules = (wcagSummary?.topRules as Array<Record<string, unknown>>) ?? [];
    const totalPages = (breakdown?.pagesScanned as number) ?? 1;

    // Query PageResults to compute per-rule page counts and descriptions.
    // Only fetch the fields we need to keep the query lightweight.
    const pages = await PageResult.find({ scanId: reportData.scanId })
      .select("issues")
      .lean() as Array<{ issues: Array<Record<string, unknown>> }>;

    // Build ruleId → { pageCount, description } from page results
    const rulePageSets = new Map<string, Set<number>>(); // ruleId → set of page indices
    const ruleDescriptions = new Map<string, string>();  // ruleId → description text

    pages.forEach((page, pageIndex) => {
      for (const issue of page.issues ?? []) {
        const ruleId = issue.ruleId as string;
        if (!ruleId) continue;

        if (!rulePageSets.has(ruleId)) rulePageSets.set(ruleId, new Set());
        rulePageSets.get(ruleId)!.add(pageIndex);

        if (!ruleDescriptions.has(ruleId) && issue.description) {
          ruleDescriptions.set(ruleId, issue.description as string);
        }
      }
    });

    const csv = generateCsv({
      criteriaViolated: (wcagSummary?.criteriaViolated as string[]) ?? [],
      totalPages,
      topRules: rawTopRules.map((r) => {
        const ruleId = (r.ruleId as string) ?? "";
        return {
          ruleId,
          wcag: (r.wcag as string[]) ?? [],
          pagesFailedOn: rulePageSets.get(ruleId)?.size ?? 0,
          description: ruleDescriptions.get(ruleId) ?? "",
        };
      }),
    });
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
    logger.error({ err: error }, "GET /api/reports/:reportId/csv error");
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
