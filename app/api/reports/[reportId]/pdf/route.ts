import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db/connection";
import { verifyAuth } from "@/lib/auth/middleware";
import { generatePdfFromHtml } from "@/lib/export/pdf";
import mongoose from "mongoose";

// GET /api/reports/:reportId/pdf — Download PDF export
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ reportId: string }> }
) {
  try {
    const user = await verifyAuth(req);
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

    const breakdown = reportData.breakdown as Record<string, unknown> || {};
    const issuesByImpact = breakdown.issuesByImpact as Record<string, number> || {};
    const wcagSummary = breakdown.wcagSummary as Record<string, unknown> || {};
    const topRules = (wcagSummary.topRules as Array<Record<string, unknown>>) || [];
    const pageScores = (breakdown.pageScores as Array<Record<string, unknown>>) || [];

    const domain = (() => {
      try { return new URL(scanData.targetUrl as string).hostname; } catch { return "report"; }
    })();

    const scoreColor = (reportData.score as number) >= 80 ? "#22c55e" : (reportData.score as number) >= 50 ? "#f59e0b" : "#ef4444";

    // Build print-friendly HTML
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Accessibility Report — ${domain}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #1e293b; line-height: 1.5; padding: 40px; }
    h1 { font-size: 24px; margin-bottom: 4px; }
    h2 { font-size: 18px; margin: 32px 0 12px; border-bottom: 2px solid #e5e7eb; padding-bottom: 8px; }
    h3 { font-size: 14px; margin: 16px 0 8px; }
    .meta { color: #64748b; font-size: 12px; margin-bottom: 24px; }
    .score-box { display: inline-flex; align-items: center; gap: 12px; padding: 16px 24px; border-radius: 12px; background: #f8fafc; border: 1px solid #e5e7eb; margin: 16px 0; }
    .score-num { font-size: 48px; font-weight: 800; color: ${scoreColor}; }
    .score-label { font-size: 14px; color: #64748b; }
    .badge { display: inline-block; padding: 2px 8px; border-radius: 9999px; font-size: 11px; font-weight: 600; }
    .badge-pass { background: #dcfce7; color: #16a34a; }
    .badge-partial { background: #fef3c7; color: #d97706; }
    .badge-fail { background: #fee2e2; color: #dc2626; }
    .badge-critical { background: #fee2e2; color: #ef4444; }
    .badge-serious { background: #ede9fe; color: #8b5cf6; }
    .badge-moderate { background: #fef3c7; color: #f59e0b; }
    .badge-minor { background: #f3f4f6; color: #9ca3af; }
    table { width: 100%; border-collapse: collapse; margin: 8px 0 24px; font-size: 12px; }
    th { text-align: left; padding: 8px; border-bottom: 2px solid #e5e7eb; font-size: 11px; text-transform: uppercase; color: #64748b; letter-spacing: 0.05em; }
    td { padding: 8px; border-bottom: 1px solid #f1f5f9; }
    tr:hover { background: #f8fafc; }
    .summary-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin: 16px 0; }
    .summary-item { padding: 12px; border-radius: 8px; border: 1px solid #e5e7eb; text-align: center; }
    .summary-item .num { font-size: 24px; font-weight: 700; }
    .summary-item .label { font-size: 11px; color: #64748b; margin-top: 4px; }
    .footer { margin-top: 40px; padding-top: 16px; border-top: 1px solid #e5e7eb; font-size: 11px; color: #94a3b8; }
    .mono { font-family: monospace; font-size: 11px; }
    @media print { body { padding: 0; } }
  </style>
</head>
<body>
  <h1>Accessibility Compliance Report</h1>
  <p class="meta">${domain} — Generated ${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</p>

  <div class="score-box">
    <span class="score-num">${reportData.score}</span>
    <div>
      <div><span class="badge badge-${reportData.status}">${(reportData.status as string).toUpperCase()}</span></div>
      <div class="score-label">out of 100</div>
    </div>
  </div>

  <div class="summary-grid">
    <div class="summary-item"><div class="num" style="color:#ef4444">${issuesByImpact.critical || 0}</div><div class="label">Critical</div></div>
    <div class="summary-item"><div class="num" style="color:#8b5cf6">${issuesByImpact.serious || 0}</div><div class="label">Serious</div></div>
    <div class="summary-item"><div class="num" style="color:#f59e0b">${issuesByImpact.moderate || 0}</div><div class="label">Moderate</div></div>
    <div class="summary-item"><div class="num" style="color:#9ca3af">${issuesByImpact.minor || 0}</div><div class="label">Minor</div></div>
  </div>

  <h2>Top Issues</h2>
  <table>
    <thead><tr><th>Rule</th><th>Impact</th><th>WCAG</th><th>Count</th></tr></thead>
    <tbody>
      ${topRules.slice(0, 25).map((r) => `
        <tr>
          <td class="mono">${r.ruleId}</td>
          <td><span class="badge badge-${r.impact}">${r.impact}</span></td>
          <td>${((r.wcag as string[]) || []).join(", ") || "—"}</td>
          <td>${r.count}</td>
        </tr>
      `).join("")}
    </tbody>
  </table>

  ${pageScores.length > 0 ? `
  <h2>Pages Scanned</h2>
  <table>
    <thead><tr><th>Page</th><th>Score</th><th>Issues</th></tr></thead>
    <tbody>
      ${pageScores.slice(0, 50).map((p) => `
        <tr>
          <td class="mono">${(() => { try { return new URL(p.url as string).pathname; } catch { return p.url; } })()}</td>
          <td><span class="badge badge-${(p.score as number) >= 80 ? "pass" : (p.score as number) >= 50 ? "partial" : "fail"}">${p.score}</span></td>
          <td>${p.totalIssues}</td>
        </tr>
      `).join("")}
    </tbody>
  </table>
  ` : ""}

  <h2>Scan Details</h2>
  <table>
    <tbody>
      <tr><td><strong>Target URL</strong></td><td>${scanData.targetUrl}</td></tr>
      <tr><td><strong>Scan Date</strong></td><td>${new Date(scanData.createdAt as string).toLocaleDateString()}</td></tr>
      <tr><td><strong>Pages Scanned</strong></td><td>${breakdown.pagesScanned || 0}</td></tr>
      <tr><td><strong>Report Hash</strong></td><td class="mono">${reportData.hash || "N/A"}</td></tr>
    </tbody>
  </table>

  <div class="footer">
    <p>Generated by EnableUser Accessibility Scanner — Report hash: ${reportData.hash || "N/A"}</p>
    <p>Methodology v1.0: Score = max(0, 100 - Σ(node_count × impact_weight))</p>
  </div>
</body>
</html>`;

    const pdfBuffer = await generatePdfFromHtml(html);

    return new Response(new Uint8Array(pdfBuffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${domain}-accessibility-report.pdf"`,
      },
    });
  } catch (error) {
    console.error("[GET /api/reports/:reportId/pdf] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
