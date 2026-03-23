"use client";

import { useState, useEffect, useCallback, use, useRef } from "react";
import { createPortal } from "react-dom";
import { useSession } from "next-auth/react";
import Link from "next/link";
import {
  ChevronRight,
  Share2,
  Download,
  Calendar,
  Hash,
  Loader2,
  AlertCircle,
  RefreshCw,
  Square,
  TriangleAlert,
  Globe,
  FileText,
  Activity,
  FileDown,
  ChevronDown,
} from "lucide-react";
import Card, { CardHeader, CardTitle } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import { LoadingPage } from "@/components/ui/Loading";
import ScoreRing from "@/components/reports/ScoreRing";
import IssueSummaryChart from "@/components/reports/IssueSummaryChart";
import AffectedPages, { type PageScoreData } from "@/components/reports/AffectedPages";
import AffectedComponents, { type TopRuleData } from "@/components/reports/AffectedComponents";
import WcagConformanceGrid from "@/components/reports/WcagConformanceGrid";
import IssuesByCategory from "@/components/reports/IssuesByCategory";

type Tab = "summary" | "issues" | "logs";

interface ScanDetail {
  _id: string;
  targetUrl: string;
  status: string;
  config?: Record<string, unknown>;
  toolVersions?: Record<string, string>;
  progress?: {
    phase?: string;
    scannedPages?: number;
    totalPages?: number;
    currentUrl?: string;
  };
  createdAt: string;
  error?: string;
}

interface ReportDetail {
  _id: string;
  score: number;
  status: string;
  breakdown: {
    totalIssues: number;
    issuesByImpact: Record<string, number>;
    pagesScanned: number;
    wcagSummary?: {
      criteriaViolated: string[];
      byPrinciple: Record<string, number>;
      byLevel: Record<string, number>;
      topRules: TopRuleData[];
    };
    pageScores?: PageScoreData[];
  };
  hash: string;
}

export default function ScanDetailPage({
  params,
}: {
  params: Promise<{ scanId: string }>;
}) {
  const { scanId } = use(params);
  const { status } = useSession();
  const [scan, setScan] = useState<ScanDetail | null>(null);
  const [report, setReport] = useState<ReportDetail | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>("summary");
  const [error, setError] = useState("");
  const [exporting, setExporting] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [exportMenuPos, setExportMenuPos] = useState({ top: 0, right: 0 });
  const [shareUrl, setShareUrl] = useState("");
  const exportBtnRef = useRef<HTMLButtonElement>(null);
  const exportMenuRef = useRef<HTMLDivElement>(null);
  const [stopping, setStopping] = useState(false);

  const fetchScan = useCallback(async () => {
    try {
      const res = await fetch(`/api/scans/${scanId}`);
      if (!res.ok) { setError("Failed to load scan"); setLoading(false); return; }
      const data = await res.json();
      setScan(data.scan);
      setReport(data.report);
      setPageCount(data.pageCount || 0);
    } catch {
      setError("Something went wrong");
    } finally {
      setLoading(false);
    }
  }, [scanId]);

  useEffect(() => {
    if (status === "authenticated") fetchScan();
  }, [fetchScan, status]);

  useEffect(() => {
    if (!scan || (scan.status !== "running" && scan.status !== "queued")) return;
    const pollInterval = setInterval(async () => {
      try {
        const res = await fetch(`/api/scans/${scanId}`);
        if (res.ok) {
          const data = await res.json();
          setScan(data.scan);
          if (data.report) setReport(data.report);
          setPageCount(data.pageCount || 0);
          if (["completed", "failed", "stopped"].includes(data.scan.status)) clearInterval(pollInterval);
        }
      } catch { /* ignore */ }
    }, 3000);
    return () => clearInterval(pollInterval);
  }, [scan?.status, scanId]);

  // Close export menu on scroll
  useEffect(() => {
    if (!showExportMenu) return;
    const close = () => setShowExportMenu(false);
    window.addEventListener("scroll", close, { passive: true });
    return () => window.removeEventListener("scroll", close);
  }, [showExportMenu]);

  const domain = scan
    ? (() => { try { return new URL(scan.targetUrl).hostname; } catch { return scan.targetUrl; } })()
    : "";

  const isRunning = scan?.status === "running" || scan?.status === "queued";
  const isPartial = !!(report?.breakdown as Record<string, unknown> | undefined)?.isPartial;
  const ibd = report?.breakdown?.issuesByImpact || { critical: 0, serious: 0, moderate: 0, minor: 0 };
  const totalIssues = (ibd.critical || 0) + (ibd.serious || 0) + (ibd.moderate || 0) + (ibd.minor || 0);

  function downloadBlob(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  }

  const handleExport = async (format: "excel" | "pdf" | "json") => {
    if (!report) return;
    setExporting(true); setShowExportMenu(false);
    try {
      if (format === "json") {
        const res = await fetch(`/api/reports/${report._id}`);
        const data = await res.json();
        downloadBlob(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }), `${domain}-report.json`);
      } else {
        const res = await fetch(`/api/reports/${report._id}/${format}`);
        downloadBlob(await res.blob(), `${domain}-wcag-compliance.${format === "pdf" ? "pdf" : "xlsx"}`);
      }
    } catch (err) { console.error("Export failed:", err); }
    finally { setExporting(false); }
  };

  const handleShare = async () => {
    if (!report) return;
    try {
      const res = await fetch(`/api/reports/${report._id}/share`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ expiresInDays: 7 }),
      });
      if (res.ok) {
        const data = await res.json();
        setShareUrl(data.url);
        navigator.clipboard?.writeText(data.url);
      }
    } catch (err) { console.error("Share failed:", err); }
  };

  const handleStop = async () => {
    if (!confirm("Stop this scan? A partial report will be generated from pages scanned so far.")) return;
    setStopping(true);
    try { await fetch(`/api/scans/${scanId}/stop`, { method: "POST" }); await fetchScan(); }
    catch (err) { console.error("Stop failed:", err); }
    finally { setStopping(false); }
  };

  if (loading) return <LoadingPage />;

  if (error || !scan) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <AlertCircle className="h-12 w-12 text-fail mb-4" />
        <h2 className="text-lg font-semibold text-foreground">{error || "Scan not found"}</h2>
        <Link href="/scans" className="mt-4 text-sm text-primary hover:text-primary-hover">Back to scans</Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-5">

      {/* ── Breadcrumb ── */}
      <nav className="flex items-center gap-1.5 text-sm text-muted">
        <Link href="/scans" className="hover:text-foreground transition-colors">All Scans</Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="font-medium text-foreground">{domain}</span>
      </nav>

      {/* ── Dashboard Header Card ── */}
      <div
        className="rounded-2xl border border-border overflow-hidden"
        style={{ boxShadow: "var(--shadow-card)" }}
      >
        {/* Top banner */}
        <div
          className="px-6 py-5"
          style={{ background: "linear-gradient(135deg, #330064 0%, #5a0096 100%)" }}
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            {/* Left: project info */}
            <div className="flex items-start gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/15">
                <Globe className="h-5 w-5 text-white" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2.5">
                  <h1 className="text-xl font-bold text-white">{domain}</h1>
                  {/* Scan status badge */}
                  {isRunning && (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-400/20 px-2.5 py-0.5 text-xs font-semibold text-amber-200">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      {scan.progress?.phase || "Running"}
                    </span>
                  )}
                  {scan.status === "completed" && !isPartial && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-400/20 px-2.5 py-0.5 text-xs font-semibold text-emerald-200">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                      Completed
                    </span>
                  )}
                  {scan.status === "stopped" && (
                    <span className="inline-flex rounded-full bg-red-400/20 px-2.5 py-0.5 text-xs font-semibold text-red-200">Stopped</span>
                  )}
                  {scan.status === "failed" && (
                    <span className="inline-flex rounded-full bg-red-400/20 px-2.5 py-0.5 text-xs font-semibold text-red-200">Failed</span>
                  )}
                  {isPartial && (
                    <span className="inline-flex rounded-full bg-amber-400/20 px-2.5 py-0.5 text-xs font-semibold text-amber-200">Partial Scan</span>
                  )}
                </div>
                <div className="mt-1.5 flex flex-wrap items-center gap-3 text-sm text-white/60">
                  <span className="flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5" />
                    {new Date(scan.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Hash className="h-3.5 w-3.5" />
                    {scanId.slice(0, 8)}
                  </span>
                  {pageCount > 0 && (
                    <span className="flex items-center gap-1.5">
                      <FileText className="h-3.5 w-3.5" />
                      {pageCount} pages scanned
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Right: actions */}
            <div className="flex shrink-0 items-center gap-2">
              {isRunning && (
                <>
                  <Button variant="secondary" size="sm" icon={<RefreshCw className="h-3.5 w-3.5" />} onClick={fetchScan}>
                    Refresh
                  </Button>
                  <Button
                    variant="secondary" size="sm" loading={stopping}
                    icon={<Square className="h-3.5 w-3.5 fill-current text-fail" />}
                    onClick={handleStop}
                  >
                    Stop Scan
                  </Button>
                </>
              )}
              {report && (
                <>
                  <Button variant="secondary" size="sm" icon={<Share2 className="h-3.5 w-3.5" />} onClick={handleShare}>
                    {shareUrl ? "Copied!" : "Share"}
                  </Button>
                  <div className="relative">
                    <button
                      ref={exportBtnRef}
                      disabled={exporting}
                      onClick={() => {
                        if (!showExportMenu && exportBtnRef.current) {
                          const r = exportBtnRef.current.getBoundingClientRect();
                          setExportMenuPos({ top: r.bottom + 8, right: window.innerWidth - r.right });
                        }
                        setShowExportMenu((v) => !v);
                      }}
                      className={`inline-flex items-center gap-1.5 rounded-lg border border-primary bg-primary px-3 py-1.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-primary-hover disabled:opacity-60 ${showExportMenu ? "bg-primary-hover" : ""}`}
                    >
                      {exporting
                        ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        : <FileDown className="h-3.5 w-3.5" />
                      }
                      Export
                      <ChevronDown className={`h-3 w-3 transition-transform duration-150 ${showExportMenu ? "rotate-180" : ""}`} />
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Tabs bar */}
        <div className="flex items-center gap-1 border-b border-border bg-card px-2">
          <TabButton active={activeTab === "summary"} icon={<Activity className="h-3.5 w-3.5" />} onClick={() => setActiveTab("summary")}>
            Summary
          </TabButton>
          <TabButton active={activeTab === "issues"} icon={<AlertCircle className="h-3.5 w-3.5" />} onClick={() => setActiveTab("issues")}>
            All Issues
          </TabButton>
          <TabButton active={activeTab === "logs"} icon={<FileText className="h-3.5 w-3.5" />} onClick={() => setActiveTab("logs")}>
            Scan Logs
          </TabButton>
        </div>
      </div>

      {/* ── Running Progress ── */}
      {isRunning && scan.progress && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-5 py-4">
          <div className="flex items-center gap-4">
            <Loader2 className="h-5 w-5 animate-spin text-amber-500 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-amber-900">
                Scan in progress — {scan.progress.phase || "working"}
              </p>
              <p className="text-xs text-amber-700 mt-0.5">
                {(() => {
                  const done = scan.progress?.scannedPages ?? 0;
                  const total = scan.progress?.totalPages ?? 0;
                  if (total === 0) return "Discovering pages…";
                  if (done > total) return `${done} pages audited (${total} discovered)`;
                  return `${done} of ${total} pages audited`;
                })()}
                {scan.progress.currentUrl && (
                  <span className="ml-2 text-amber-600 truncate max-w-xs inline-block align-bottom">
                    {scan.progress.currentUrl}
                  </span>
                )}
              </p>
            </div>
            {(() => {
              const done = scan.progress?.scannedPages ?? 0;
              const total = scan.progress?.totalPages ?? 0;
              if (total <= 0) return null;
              const pct = Math.min(100, Math.round((done / total) * 100));
              return (
                <div className="shrink-0 w-32">
                  <div className="h-2 rounded-full bg-amber-200 overflow-hidden">
                    <div className="h-full rounded-full bg-amber-500 transition-all duration-500" style={{ width: `${pct}%` }} />
                  </div>
                  <p className="text-xs text-amber-600 text-right mt-0.5">{pct}%</p>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* ── Partial Scan Banner ── */}
      {isPartial && report && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-5 py-4">
          <div className="flex items-start gap-3">
            <TriangleAlert className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-amber-900">Partial scan report</p>
              <p className="text-xs text-amber-700 mt-0.5">
                {(() => {
                  const meta = (report.breakdown as Record<string, unknown>)?.partialMeta as Record<string, unknown> | undefined;
                  const scanned = (meta?.scannedPages as number) || pageCount;
                  const total = (meta?.configuredMaxPages as number) || 0;
                  return total > 0
                    ? `${scanned} of ${total} pages were scanned. Results reflect only the pages processed.`
                    : `${scanned} pages were scanned. Results reflect only the pages processed.`;
                })()}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── Failed Error ── */}
      {scan.status === "failed" && scan.error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-5 py-4">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-red-500 shrink-0" />
            <p className="text-sm text-red-700">{scan.error}</p>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════
          SUMMARY TAB
      ══════════════════════════════════════ */}
      {activeTab === "summary" && (
        <div className="space-y-5">

          {/* Row 1: Score + Issue Chart */}
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-5">

            {/* Score card (2/5) */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Accessibility Score</CardTitle>
                {report && (
                  <div className="flex items-center gap-1.5">
                    <Badge
                      variant={report.status === "pass" ? "pass" : report.status === "partial" ? "partial" : "fail"}
                      size="sm"
                    >
                      {report.status.toUpperCase()}
                    </Badge>
                    {isPartial && <Badge variant="partial" size="sm">PARTIAL</Badge>}
                  </div>
                )}
              </CardHeader>

              {report ? (
                <div className="flex flex-col items-center gap-6 sm:flex-row">
                  <ScoreRing score={report.score} size={148} />
                  <div className="w-full space-y-2.5 sm:flex-1">
                    <ScoreRow label="Critical" count={ibd.critical || 0} variant="critical" />
                    <ScoreRow label="Serious"  count={ibd.serious  || 0} variant="serious" />
                    <ScoreRow label="Moderate" count={ibd.moderate || 0} variant="moderate" />
                    <ScoreRow label="Minor"    count={ibd.minor    || 0} variant="minor" />
                    <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
                      <span className="text-xs font-medium text-muted">Total Issues</span>
                      <span className="text-base font-bold text-foreground">{totalIssues}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center py-10">
                  {isRunning ? (
                    <div className="flex items-center gap-2 text-sm text-muted">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Waiting for scan to complete...
                    </div>
                  ) : (
                    <p className="text-sm text-muted">No score available</p>
                  )}
                </div>
              )}
            </Card>

            {/* Issue Summary (3/5) */}
            <Card className="lg:col-span-3">
              <CardHeader>
                <CardTitle>Issue Severity Distribution</CardTitle>
                {report && (
                  <span className="text-xs text-muted">
                    {report.breakdown.pagesScanned} page{report.breakdown.pagesScanned !== 1 ? "s" : ""} scanned
                  </span>
                )}
              </CardHeader>
              {report ? (
                <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
                  <IssueSummaryChart
                    critical={ibd.critical || 0}
                    serious={ibd.serious || 0}
                    moderate={ibd.moderate || 0}
                    minor={ibd.minor || 0}
                  />
                  {/* Stat pills */}
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 sm:flex-1">
                    {[
                      { label: "Critical", count: ibd.critical || 0, bg: "bg-red-50",    text: "text-red-700",    border: "border-red-100" },
                      { label: "Serious",  count: ibd.serious  || 0, bg: "bg-purple-50", text: "text-purple-700", border: "border-purple-100" },
                      { label: "Moderate", count: ibd.moderate || 0, bg: "bg-amber-50",  text: "text-amber-700",  border: "border-amber-100" },
                      { label: "Minor",    count: ibd.minor    || 0, bg: "bg-gray-50",   text: "text-gray-600",   border: "border-gray-100" },
                    ].map(({ label, count, bg, text, border }) => (
                      <div key={label} className={`rounded-xl border p-3.5 ${bg} ${border}`}>
                        <p className={`text-2xl font-bold ${text}`}>{count}</p>
                        <p className="mt-0.5 text-xs font-medium text-muted">{label}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center py-10">
                  {isRunning ? (
                    <div className="flex items-center gap-2 text-sm text-muted">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Analyzing issues...
                    </div>
                  ) : (
                    <p className="text-sm text-muted">No data available</p>
                  )}
                </div>
              )}
            </Card>
          </div>

          {/* Row 2: WCAG 2.1 AA Conformance Grid */}
          <Card>
            <CardHeader>
              <div>
                <CardTitle>WCAG 2.1 AA Conformance Summary</CardTitle>
                <p className="mt-0.5 text-xs text-muted">
                  Automated coverage via axe-core — manual review required for complete conformance
                </p>
              </div>
              {report?.breakdown?.wcagSummary && (
                <div className="flex items-center gap-2 text-xs text-muted">
                  <span className="font-semibold text-red-600">
                    {report.breakdown.wcagSummary.criteriaViolated.length} criteria failed
                  </span>
                </div>
              )}
            </CardHeader>
            {report?.breakdown?.wcagSummary ? (
              <WcagConformanceGrid
                criteriaViolated={report.breakdown.wcagSummary.criteriaViolated}
              />
            ) : (
              <div className="flex items-center justify-center py-10">
                {isRunning ? (
                  <div className="flex items-center gap-2 text-sm text-muted">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Building conformance report...
                  </div>
                ) : (
                  <p className="text-sm text-muted">No conformance data available</p>
                )}
              </div>
            )}
          </Card>

          {/* Row 3: Affected Pages + Issues by Category */}
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">

            {/* Affected Pages (2/3) */}
            <Card className="lg:col-span-2" padding="none">
              <div className="px-6 pt-5 pb-4">
                <CardHeader className="mb-0">
                  <CardTitle>Affected Pages</CardTitle>
                  {report?.breakdown?.pagesScanned != null && (
                    <span className="text-xs text-muted">{report.breakdown.pagesScanned} total</span>
                  )}
                </CardHeader>
              </div>
              <AffectedPages pages={report?.breakdown?.pageScores || []} />
            </Card>

            {/* Issues by Category (1/3) */}
            <Card>
              <CardHeader>
                <CardTitle>Issues by Category</CardTitle>
              </CardHeader>
              <IssuesByCategory
                byPrinciple={report?.breakdown?.wcagSummary?.byPrinciple}
                topRules={report?.breakdown?.wcagSummary?.topRules}
              />
            </Card>
          </div>

          {/* Row 4: Affected Components */}
          <Card padding="none">
            <div className="px-6 pt-5 pb-4">
              <CardHeader className="mb-0">
                <CardTitle>Top Issues by Rule</CardTitle>
                {report?.breakdown?.wcagSummary?.topRules && (
                  <span className="text-xs text-muted">
                    {report.breakdown.wcagSummary.topRules.length} rules
                  </span>
                )}
              </CardHeader>
            </div>
            <AffectedComponents rules={report?.breakdown?.wcagSummary?.topRules || []} />
          </Card>
        </div>
      )}

      {/* ══════════════════════════════════════
          ALL ISSUES TAB
      ══════════════════════════════════════ */}
      {activeTab === "issues" && (
        <Card padding="none">
          <div className="px-6 pt-5 pb-4 border-b border-border">
            <CardHeader className="mb-0">
              <CardTitle>All Issues</CardTitle>
              {report?.breakdown?.wcagSummary?.topRules && (
                <span className="rounded-full bg-primary-50 px-2.5 py-0.5 text-xs font-semibold text-primary">
                  {report.breakdown.wcagSummary.topRules.length} rules
                </span>
              )}
            </CardHeader>
          </div>

          {report?.breakdown?.wcagSummary?.topRules ? (
            <div>
              {report.breakdown.wcagSummary.topRules.map((rule, i) => (
                <div
                  key={i}
                  className="flex items-start gap-4 border-b border-border-light px-6 py-4 last:border-0 hover:bg-sidebar-hover transition-colors"
                >
                  <div className="shrink-0 pt-0.5">
                    <Badge variant={rule.impact as "critical" | "serious" | "moderate" | "minor"} size="sm" dot>
                      {rule.impact}
                    </Badge>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground font-mono">{rule.ruleId}</p>
                    <p className="text-xs text-muted mt-0.5">
                      {rule.principle}
                      {rule.wcag.length > 0 && (
                        <span className="ml-2 text-muted-light">
                          WCAG: {rule.wcag.join(", ")}
                        </span>
                      )}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <span className="text-sm font-bold text-foreground">{rule.count}</span>
                    <p className="text-[10px] text-muted">instance{rule.count !== 1 ? "s" : ""}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="py-12 text-center text-sm text-muted">
              {isRunning ? "Scan in progress..." : "No issues data available"}
            </p>
          )}
        </Card>
      )}

      {/* ══════════════════════════════════════
          SCAN LOGS TAB
      ══════════════════════════════════════ */}
      {activeTab === "logs" && (
        <Card>
          <CardHeader>
            <CardTitle>Scan Configuration</CardTitle>
          </CardHeader>
          <div className="space-y-3 text-sm">
            <LogRow label="Target URL"    value={scan.targetUrl} />
            <LogRow label="Status"        value={scan.status} />
            <LogRow label="Pages Scanned" value={String(pageCount)} />
            {scan.config && (
              <>
                <LogRow label="Max Depth" value={String((scan.config as Record<string, unknown>).depth || "N/A")} />
                <LogRow label="Max Pages" value={String((scan.config as Record<string, unknown>).maxPages || "N/A")} />
              </>
            )}
            {scan.toolVersions && (
              <>
                <LogRow label="axe-core"   value={scan.toolVersions.axe || "N/A"} />
                <LogRow label="Playwright" value={scan.toolVersions.playwright || "N/A"} />
              </>
            )}
            {isPartial && (() => {
              const meta = (report?.breakdown as Record<string, unknown>)?.partialMeta as Record<string, unknown> | undefined;
              return meta ? (
                <LogRow label="Partial Scan" value={`${meta.scannedPages as number} of ${meta.configuredMaxPages as number} pages — ${meta.reason as string}`} />
              ) : null;
            })()}
            {report?.breakdown?.wcagSummary?.byLevel && (
              <>
                <div className="border-t border-border pt-3 mt-1">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted mb-3">WCAG Level Breakdown</p>
                  <div className="grid grid-cols-3 gap-3">
                    {Object.entries(report.breakdown.wcagSummary.byLevel).map(([level, count]) => (
                      <div key={level} className="rounded-xl bg-sidebar p-3 text-center">
                        <p className="text-xl font-bold text-foreground">{count}</p>
                        <p className="text-xs text-muted">Level {level}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
            {report?.hash && (
              <LogRow label="Report Hash" value={report.hash} mono />
            )}
          </div>
        </Card>
      )}

      {/* ── Export dropdown portal (escapes overflow-hidden parents) ── */}
      {showExportMenu && typeof document !== "undefined" && createPortal(
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setShowExportMenu(false)}
          />
          {/* Menu */}
          <div
            ref={exportMenuRef}
            style={{ position: "fixed", top: exportMenuPos.top, right: exportMenuPos.right, zIndex: 50 }}
            className="w-56 overflow-hidden rounded-xl border border-border bg-card shadow-2xl"
          >
            <div className="border-b border-border-light px-4 py-2.5">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted">Export as</p>
            </div>
            <div className="py-1">
              <button
                onClick={() => handleExport("pdf")}
                className="flex w-full flex-col px-4 py-2.5 text-left transition-colors hover:bg-sidebar-hover"
              >
                <p className="text-sm font-medium text-foreground">PDF Report</p>
                <p className="text-xs text-muted">Full report with WCAG details</p>
              </button>
              <button
                onClick={() => handleExport("excel")}
                className="flex w-full flex-col px-4 py-2.5 text-left transition-colors hover:bg-sidebar-hover"
              >
                <p className="text-sm font-medium text-foreground">Excel (.xlsx)</p>
                <p className="text-xs text-muted">Spreadsheet with all issues</p>
              </button>
              <button
                onClick={() => handleExport("json")}
                className="flex w-full flex-col px-4 py-2.5 text-left transition-colors hover:bg-sidebar-hover"
              >
                <p className="text-sm font-medium text-foreground">JSON Data</p>
                <p className="text-xs text-muted">Raw report data</p>
              </button>
            </div>
          </div>
        </>,
        document.body
      )}
    </div>
  );
}

/* ─── Sub-components ─── */

function TabButton({
  active = false,
  icon,
  onClick,
  children,
}: {
  active?: boolean;
  icon?: React.ReactNode;
  onClick?: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
        active
          ? "border-primary text-primary"
          : "border-transparent text-muted hover:border-border hover:text-foreground"
      }`}
    >
      {icon}
      {children}
    </button>
  );
}

function ScoreRow({
  label, count, variant,
}: {
  label: string;
  count: number;
  variant: "critical" | "serious" | "moderate" | "minor";
}) {
  return (
    <div className="flex items-center justify-between gap-6">
      <Badge variant={variant} size="sm" dot>{label}</Badge>
      <span className="text-sm font-semibold text-foreground">{count}</span>
    </div>
  );
}

function LogRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-border-light pb-3 last:border-0">
      <span className="text-muted shrink-0">{label}</span>
      <span className={`text-foreground text-right ${mono ? "font-mono text-xs break-all" : ""}`}>{value}</span>
    </div>
  );
}
