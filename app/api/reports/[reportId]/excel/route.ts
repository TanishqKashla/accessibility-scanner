import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db/connection";
import { verifyAuth } from "@/lib/auth/middleware";
import { generateExcel } from "@/lib/export/excel";
import mongoose from "mongoose";

// GET /api/reports/:reportId/excel — Download styled Excel export
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

    const breakdown  = reportData.breakdown as Record<string, unknown> | undefined;
    const wcagSummary = breakdown?.wcagSummary as Record<string, unknown> | undefined;
    const rawTopRules = (wcagSummary?.topRules as Array<Record<string, unknown>>) ?? [];
    const totalPages  = (breakdown?.pagesScanned as number) ?? 1;

    // Build per-rule page counts and descriptions from PageResults
    const pages = await PageResult.find({ scanId: reportData.scanId })
      .select("issues")
      .lean() as Array<{ issues: Array<Record<string, unknown>> }>;

    const rulePageSets   = new Map<string, Set<number>>();
    const ruleDescriptions = new Map<string, string>();

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

    const buffer = await generateExcel({
      criteriaViolated: (wcagSummary?.criteriaViolated as string[]) ?? [],
      totalPages,
      targetUrl: (scanData.targetUrl as string) ?? "",
      scanDate:  (reportData.createdAt as Date | string | undefined)?.toString() ?? new Date().toISOString(),
      topRules: rawTopRules.map((r) => {
        const ruleId = (r.ruleId as string) ?? "";
        return {
          ruleId,
          wcag:         (r.wcag as string[]) ?? [],
          pagesFailedOn: rulePageSets.get(ruleId)?.size ?? 0,
          description:   ruleDescriptions.get(ruleId) ?? "",
        };
      }),
    });

    const domain = (() => {
      try { return new URL(scanData.targetUrl as string).hostname; } catch { return "report"; }
    })();

    return new Response(buffer, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${domain}-wcag-compliance.xlsx"`,
      },
    });
  } catch (error) {
    console.error("[GET /api/reports/:reportId/excel] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
