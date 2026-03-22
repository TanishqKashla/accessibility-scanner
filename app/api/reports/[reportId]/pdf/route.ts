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

    const report = await Report.findById(reportId).lean();
    if (!report) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }

    const reportData = report as Record<string, unknown>;

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
    const criteriaViolated: string[] = (wcagSummary.criteriaViolated as string[]) || [];

    const domain = (() => {
      try { return new URL(scanData.targetUrl as string).hostname; } catch { return "report"; }
    })();

    const score = reportData.score as number;
    const reportStatus = reportData.status as string;
    const pagesScanned = breakdown.pagesScanned as number || 0;
    const totalIssues = (issuesByImpact.critical || 0) + (issuesByImpact.serious || 0) + (issuesByImpact.moderate || 0) + (issuesByImpact.minor || 0);
    const scanDate = new Date(scanData.createdAt as string).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
    const generatedDate = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" });

    const scoreColor = score >= 80 ? "#16a34a" : score >= 50 ? "#d97706" : "#dc2626";
    const isCompliant = reportStatus === "pass";

    // ── WCAG Checkpoint groups ──────────────────────────────────────────────
    // Criteria automatically covered by axe-core in this project
    const TESTED = new Set([
      "1.1.1","1.2.2","1.2.5","1.3.1","1.3.4","1.3.5",
      "1.4.1","1.4.2","1.4.3","1.4.4",
      "2.1.1","2.2.1","2.2.2","2.4.1","2.4.2","2.4.3",
      "2.4.4","2.4.6","2.5.3",
      "3.1.1","3.1.2","3.3.2",
      "4.1.1","4.1.2",
    ]);

    const violatedSet = new Set(criteriaViolated);

    const CHECKPOINT_GROUPS: Array<{ id: string; name: string; criteria: string[] }> = [
      { id: "1.1", name: "Text Alternatives",        criteria: ["1.1.1"] },
      { id: "1.2", name: "Time-based Media",         criteria: ["1.2.1","1.2.2","1.2.3","1.2.4","1.2.5"] },
      { id: "1.3", name: "Adaptable",                criteria: ["1.3.1","1.3.2","1.3.3","1.3.4","1.3.5"] },
      { id: "1.4", name: "Distinguishable",          criteria: ["1.4.1","1.4.2","1.4.3","1.4.4","1.4.5","1.4.10","1.4.11","1.4.12","1.4.13"] },
      { id: "2.1", name: "Keyboard Accessible",      criteria: ["2.1.1","2.1.2","2.1.4"] },
      { id: "2.2", name: "Enough Time",              criteria: ["2.2.1","2.2.2"] },
      { id: "2.3", name: "Seizures & Physical",      criteria: ["2.3.1"] },
      { id: "2.4", name: "Navigable",                criteria: ["2.4.1","2.4.2","2.4.3","2.4.4","2.4.5","2.4.6","2.4.7"] },
      { id: "2.5", name: "Input Modalities",         criteria: ["2.5.1","2.5.2","2.5.3","2.5.4"] },
      { id: "3.1", name: "Readable",                 criteria: ["3.1.1","3.1.2"] },
      { id: "3.2", name: "Predictable",              criteria: ["3.2.1","3.2.2","3.2.3","3.2.4"] },
      { id: "3.3", name: "Input Assistance",         criteria: ["3.3.1","3.3.2","3.3.3","3.3.4"] },
      { id: "4.1", name: "Compatible",               criteria: ["4.1.1","4.1.2","4.1.3"] },
    ];

    interface GroupStats { passed: number; needsReview: number; failed: number }

    const groupStats = CHECKPOINT_GROUPS.map((g) => {
      const stats: GroupStats = { passed: 0, needsReview: 0, failed: 0 };
      g.criteria.forEach((sc) => {
        if (violatedSet.has(sc))      stats.failed++;
        else if (TESTED.has(sc))      stats.passed++;
        else                          stats.needsReview++;
      });
      return { ...g, ...stats };
    });

    // Status icon for each group
    function groupIcon(s: GroupStats & { criteria: string[] }): string {
      if (s.failed > 0)    return `<span class="icon-fail">✗</span>`;
      if (s.passed > 0)    return `<span class="icon-pass">✓</span>`;
      if (s.needsReview > 0) return `<span class="icon-warn">!</span>`;
      return `<span class="icon-na">⊘</span>`;
    }

    // ── Impact rows for summary ────────────────────────────────────────────
    const impactRows = [
      { label: "Critical", count: issuesByImpact.critical || 0, color: "#dc2626", bg: "#fee2e2" },
      { label: "Serious",  count: issuesByImpact.serious  || 0, color: "#7c3aed", bg: "#ede9fe" },
      { label: "Moderate", count: issuesByImpact.moderate || 0, color: "#d97706", bg: "#fef3c7" },
      { label: "Minor",    count: issuesByImpact.minor    || 0, color: "#6b7280", bg: "#f3f4f6" },
    ];

    // ── Build HTML ─────────────────────────────────────────────────────────
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>WCAG Accessibility Report — ${domain}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
      background: #e8e8e8;
      color: #1e293b;
      font-size: 13px;
      line-height: 1.5;
    }

    .page {
      max-width: 760px;
      margin: 0 auto;
      background: #e8e8e8;
      padding: 16px;
    }

    /* ── App Bar ── */
    .app-bar {
      background: #330064;
      border-radius: 4px 4px 0 0;
      padding: 12px 16px;
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .app-logo {
      width: 40px;
      height: 40px;
      flex-shrink: 0;
    }

    .app-title {
      font-size: 17px;
      font-weight: 700;
      color: #fff;
      letter-spacing: -0.3px;
    }

    .app-subtitle {
      font-size: 11px;
      color: rgba(255,255,255,0.65);
      margin-top: 1px;
    }

    /* ── Document Info Card ── */
    .doc-card {
      background: #fff;
      border: 1px solid #c0c0c0;
      border-top: none;
      padding: 14px 16px;
    }

    .doc-meta-label {
      font-size: 10px;
      color: #666;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }

    .doc-meta-value {
      font-size: 13px;
      font-weight: 600;
      color: #1e293b;
    }

    .doc-meta-value.red { color: #dc2626; }
    .doc-meta-value.normal { font-weight: 400; }

    .doc-meta-row { margin-bottom: 8px; }

    .doc-meta-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 0 16px;
      margin-top: 4px;
      padding-top: 8px;
      border-top: 1px solid #f1f5f9;
    }

    /* ── Compliance Banner ── */
    .compliance-banner {
      padding: 10px 16px;
      display: flex;
      align-items: center;
      gap: 10px;
      border: 1px solid #c0c0c0;
      border-top: none;
      background: ${isCompliant ? "#f0fdf4" : "#fef2f2"};
    }

    .compliance-icon {
      width: 22px;
      height: 22px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-size: 12px;
      font-weight: 900;
      flex-shrink: 0;
      background: ${isCompliant ? "#16a34a" : "#dc2626"};
    }

    .compliance-text {
      font-size: 13px;
      font-weight: 700;
      color: ${isCompliant ? "#15803d" : "#b91c1c"};
    }

    /* ── Checkpoint Table ── */
    .content-panel {
      background: white;
      border: 1px solid #c0c0c0;
      border-top: none;
    }

    .checkpoint-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 12px;
    }

    .checkpoint-table th {
      padding: 7px 12px;
      text-align: left;
      border-bottom: 1px solid #d1d5db;
      color: #555;
      font-weight: 600;
      font-size: 11px;
      background: #fafafa;
    }

    .checkpoint-table th.num-col { text-align: center; width: 80px; }

    .checkpoint-table td {
      padding: 6px 12px;
      border-bottom: 1px solid #f1f5f9;
      color: #374151;
    }

    .checkpoint-table td.num-col { text-align: center; font-weight: 500; }
    .checkpoint-table tr:last-child td { border-bottom: none; }

    .checkpoint-name-cell { display: flex; align-items: center; gap: 8px; }
    .checkpoint-id { font-weight: 600; }

    .icon-pass {
      display: inline-flex; align-items: center; justify-content: center;
      width: 17px; height: 17px; border-radius: 50%;
      background: #16a34a; color: white; font-size: 10px; font-weight: 900; flex-shrink: 0;
    }
    .icon-fail {
      display: inline-flex; align-items: center; justify-content: center;
      width: 17px; height: 17px; border-radius: 50%;
      background: #dc2626; color: white; font-size: 10px; font-weight: 900; flex-shrink: 0;
    }
    .icon-warn {
      display: inline-flex; align-items: center; justify-content: center;
      width: 17px; height: 17px; border-radius: 50%;
      background: #d97706; color: white; font-size: 10px; font-weight: 900; flex-shrink: 0;
    }
    .icon-na {
      display: inline-flex; align-items: center; justify-content: center;
      width: 17px; height: 17px; border-radius: 50%;
      background: transparent; border: 2px solid #9ca3af;
      color: #9ca3af; font-size: 10px; font-weight: 900; flex-shrink: 0;
    }

    /* ── Section blocks ── */
    .section {
      background: white;
      margin-top: 12px;
    }

    .section-header {
      padding: 9px 16px;
      border-bottom: 1px solid #e5e7eb;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: #555;
      background: #fafafa;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-top: 3px solid #330064;
    }

    .count-pill {
      background: #330064;
      color: white;
      border-radius: 9999px;
      padding: 1px 8px;
      font-size: 10px;
      font-weight: 700;
    }

    /* ── Score + Impact ── */
    .summary-body {
      padding: 16px;
      display: flex;
      gap: 20px;
      align-items: flex-start;
    }

    .score-circle-wrap { text-align: center; flex-shrink: 0; }

    .score-circle {
      width: 88px; height: 88px; border-radius: 50%;
      border: 6px solid ${scoreColor};
      display: flex; flex-direction: column;
      align-items: center; justify-content: center;
      margin: 0 auto 6px;
    }

    .score-num { font-size: 26px; font-weight: 800; color: ${scoreColor}; line-height: 1; }
    .score-sub { font-size: 10px; color: #64748b; margin-top: 2px; }

    .score-status {
      display: inline-block; padding: 2px 10px; border-radius: 9999px;
      font-size: 10px; font-weight: 700;
      background: ${isCompliant ? "#dcfce7" : "#fee2e2"};
      color: ${isCompliant ? "#16a34a" : "#dc2626"};
    }

    .impact-list { flex: 1; display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }

    .impact-item {
      padding: 10px 12px; border-radius: 6px; border: 1px solid #e5e7eb;
    }

    .impact-count { font-size: 22px; font-weight: 800; line-height: 1; }
    .impact-name { font-size: 10px; color: #64748b; margin-top: 2px; }

    /* ── Data tables ── */
    .data-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 11px;
    }

    .data-table th {
      padding: 7px 10px;
      text-align: left;
      border-bottom: 1px solid #d1d5db;
      color: #555;
      font-weight: 600;
      font-size: 10px;
      background: #fafafa;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }

    .data-table th.center { text-align: center; }

    .data-table td {
      padding: 6px 10px;
      border-bottom: 1px solid #f1f5f9;
      vertical-align: middle;
    }

    .data-table tr:last-child td { border-bottom: none; }

    .mono { font-family: 'Courier New', monospace; font-size: 10px; }

    .impact-badge {
      display: inline-block; padding: 1px 7px;
      border-radius: 9999px; font-size: 10px; font-weight: 600;
    }

    .score-badge {
      display: inline-block; padding: 1px 7px;
      border-radius: 9999px; font-size: 10px; font-weight: 700;
    }

    /* ── Scan Details ── */
    .details-grid {
      display: grid; grid-template-columns: 1fr 1fr;
      gap: 10px; padding: 14px 16px; font-size: 11px;
    }

    .detail-label {
      color: #64748b; font-size: 10px;
      text-transform: uppercase; letter-spacing: 0.04em;
    }

    .detail-value {
      font-weight: 600; color: #1e293b;
      margin-top: 1px; word-break: break-all;
    }

    /* ── Legal Disclaimer ── */
    .disclaimer {
      page-break-before: always;
      page-break-inside: avoid;
      margin-top: 0;
      padding: 24px 20px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-left: 4px solid #94a3b8;
      border-radius: 0 4px 4px 0;
    }

    .disclaimer-title {
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: #475569;
      margin-bottom: 5px;
    }

    .disclaimer-text {
      font-size: 10px;
      color: #64748b;
      line-height: 1.6;
    }

    /* ── Print ── */
    @page { size: A4; margin: 12mm 10mm; }
    @media print { body { background: #e8e8e8; } }
  </style>
</head>
<body>
<div class="page">

  <!-- App Bar -->
  <div class="app-bar">
    <svg class="app-logo" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <polygon points="20,2 36,11 36,29 20,38 4,29 4,11" fill="rgba(255,255,255,0.15)" stroke="rgba(255,255,255,0.5)" stroke-width="1.5"/>
      <text x="20" y="25" text-anchor="middle" font-family="Arial" font-size="15" font-weight="900" fill="white">A</text>
    </svg>
    <div>
      <div class="app-title">WCAG Accessibility Report</div>
      <div class="app-subtitle">WCAG 2.1 AA — EnableUser Scanner</div>
    </div>
  </div>

  <!-- Document Info -->
  <div class="doc-card">
    <div class="doc-meta-row">
      <div class="doc-meta-label">Website</div>
      <div class="doc-meta-value">${domain}</div>
    </div>
    <div class="doc-meta-row">
      <div class="doc-meta-label">Full URL</div>
      <div class="doc-meta-value normal" style="font-size:11px; color:#555;">${scanData.targetUrl}</div>
    </div>
    <div class="doc-meta-grid">
      <div>
        <div class="doc-meta-label">Scan Date</div>
        <div class="doc-meta-value normal">${scanDate}</div>
      </div>
      <div>
        <div class="doc-meta-label">Pages</div>
        <div class="doc-meta-value">${pagesScanned}</div>
      </div>
      <div>
        <div class="doc-meta-label">Total Issues</div>
        <div class="doc-meta-value ${totalIssues > 0 ? "red" : ""}">${totalIssues > 0 ? totalIssues : "None"}</div>
      </div>
      <div>
        <div class="doc-meta-label">Score</div>
        <div class="doc-meta-value" style="color:${scoreColor}">${score} / 100</div>
      </div>
    </div>
  </div>

  <!-- Compliance Banner -->
  <div class="compliance-banner">
    <div class="compliance-icon">${isCompliant ? "✓" : "✗"}</div>
    <span class="compliance-text">
      ${isCompliant
        ? `This website meets WCAG 2.1 AA requirements. Score: ${score}/100`
        : `This website does not meet WCAG 2.1 AA requirements. ${criteriaViolated.length} criteria failed. Score: ${score}/100`
      }
    </span>
  </div>

  <!-- Checkpoint Table -->
  <div class="content-panel">
    <table class="checkpoint-table">
      <thead>
        <tr>
          <th>Checkpoint</th>
          <th class="num-col">Passed</th>
          <th class="num-col">Needs Review</th>
          <th class="num-col">Failed</th>
        </tr>
      </thead>
      <tbody>
        ${groupStats.map((g) => `
          <tr>
            <td>
              <div class="checkpoint-name-cell">
                ${groupIcon(g)}
                <span class="checkpoint-id">${g.id}</span>
                <span>${g.name}</span>
              </div>
            </td>
            <td class="num-col">${g.passed}</td>
            <td class="num-col">${g.needsReview}</td>
            <td class="num-col" style="${g.failed > 0 ? "color:#dc2626; font-weight:700;" : ""}">${g.failed}</td>
          </tr>
        `).join("")}
      </tbody>
    </table>
  </div>

  <!-- Score & Impact -->
  <div class="section">
    <div class="section-header">Accessibility Score &amp; Issue Breakdown</div>
    <div class="summary-body">
      <div class="score-circle-wrap">
        <div class="score-circle">
          <div class="score-num">${score}</div>
          <div class="score-sub">/ 100</div>
        </div>
        <div class="score-status">${reportStatus.toUpperCase()}</div>
      </div>
      <div class="impact-list">
        ${impactRows.map((r) => `
          <div class="impact-item">
            <div class="impact-count" style="color:${r.color}">${r.count}</div>
            <div class="impact-name">${r.label}</div>
          </div>
        `).join("")}
      </div>
    </div>
  </div>

  <!-- Top Failing Rules -->
  ${topRules.length > 0 ? `
  <div class="section">
    <div class="section-header">
      <span>Top Failing Rules</span>
      <span class="count-pill">${topRules.length} rules</span>
    </div>
    <table class="data-table">
      <thead>
        <tr>
          <th>Rule ID</th>
          <th>Impact</th>
          <th>WCAG Criteria</th>
          <th class="center">Instances</th>
        </tr>
      </thead>
      <tbody>
        ${topRules.slice(0, 20).map((r) => {
          const ic: Record<string, { bg: string; color: string }> = {
            critical: { bg: "#fee2e2", color: "#dc2626" },
            serious:  { bg: "#ede9fe", color: "#7c3aed" },
            moderate: { bg: "#fef3c7", color: "#d97706" },
            minor:    { bg: "#f3f4f6", color: "#6b7280" },
          };
          const c = ic[(r.impact as string)] || ic.minor;
          return `
            <tr>
              <td class="mono">${r.ruleId}</td>
              <td><span class="impact-badge" style="background:${c.bg}; color:${c.color}">${r.impact}</span></td>
              <td style="color:#555; font-size:10px;">${((r.wcag as string[]) || []).join(", ") || "—"}</td>
              <td style="text-align:center; font-weight:700;">${r.count}</td>
            </tr>`;
        }).join("")}
      </tbody>
    </table>
  </div>
  ` : ""}

  <!-- Pages Scanned -->
  ${pageScores.length > 0 ? `
  <div class="section">
    <div class="section-header">
      <span>Pages Scanned</span>
      <span class="count-pill">${pageScores.length} pages</span>
    </div>
    <table class="data-table">
      <thead>
        <tr><th>Page URL</th><th>Score</th><th>Issues</th></tr>
      </thead>
      <tbody>
        ${pageScores.slice(0, 30).map((p) => {
          const ps = p.score as number;
          const ss = ps >= 80 ? "background:#dcfce7;color:#16a34a" : ps >= 50 ? "background:#fef3c7;color:#d97706" : "background:#fee2e2;color:#dc2626";
          let dp = String(p.url);
          try { dp = new URL(String(p.url)).pathname; } catch { /* keep full */ }
          if (dp.length > 70) dp = dp.slice(0, 67) + "...";
          return `
            <tr>
              <td class="mono">${dp}</td>
              <td><span class="score-badge" style="${ss}">${ps}</span></td>
              <td>${p.totalIssues}</td>
            </tr>`;
        }).join("")}
      </tbody>
    </table>
  </div>
  ` : ""}

  <!-- Scan Details -->
  <div class="section">
    <div class="section-header">Scan Details</div>
    <div class="details-grid">
      <div>
        <div class="detail-label">Target URL</div>
        <div class="detail-value" style="font-size:10px;">${scanData.targetUrl}</div>
      </div>
      <div>
        <div class="detail-label">Scan Date</div>
        <div class="detail-value">${scanDate}</div>
      </div>
      <div>
        <div class="detail-label">Report Generated</div>
        <div class="detail-value">${generatedDate}</div>
      </div>
      <div>
        <div class="detail-label">Pages Scanned</div>
        <div class="detail-value">${pagesScanned}</div>
      </div>
      ${(scanData.toolVersions as Record<string, string> | undefined)?.axe ? `
      <div>
        <div class="detail-label">axe-core Version</div>
        <div class="detail-value">${(scanData.toolVersions as Record<string, string>).axe}</div>
      </div>` : ""}
      <div>
        <div class="detail-label">Report Hash</div>
        <div class="detail-value" style="font-family:monospace; font-size:9px;">${reportData.hash || "N/A"}</div>
      </div>
    </div>
  </div>

  <!-- Legal Disclaimer -->
  <div class="disclaimer">
    <div class="disclaimer-title">Legal Disclaimer</div>
    <div class="disclaimer-text">
      This report is generated through an automated accessibility evaluation process based on WCAG 2.1 guidelines.
      While efforts have been made to ensure accuracy, automated tools may not detect all accessibility issues.
      Manual testing and expert review are recommended to achieve full compliance. This report is provided for
      informational purposes only and does not constitute legal certification or guarantee of compliance.
    </div>
  </div>

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
