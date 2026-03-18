"use client";

import { useState, useEffect, useCallback, use } from "react";
import Link from "next/link";
import {
  ChevronRight,
  Share2,
  GitCompare,
  Download,
  Calendar,
  Hash,
  Loader2,
  AlertCircle,
  RefreshCw,
  Square,
  TriangleAlert,
} from "lucide-react";
import Card, { CardHeader, CardTitle } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import { LoadingPage } from "@/components/ui/Loading";
import ScoreRing from "@/components/reports/ScoreRing";
import IssueSummaryChart from "@/components/reports/IssueSummaryChart";
import AffectedPages, { type PageScoreData } from "@/components/reports/AffectedPages";
import AffectedComponents, { type TopRuleData } from "@/components/reports/AffectedComponents";

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
  const [scan, setScan] = useState<ScanDetail | null>(null);
  const [report, setReport] = useState<ReportDetail | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>("summary");
  const [error, setError] = useState("");
  const [exporting, setExporting] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [shareUrl, setShareUrl] = useState("");
  const [stopping, setStopping] = useState(false);

  const fetchScan = useCallback(async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        setError("Unauthorized");
        setLoading(false);
        return;
      }

      const res = await fetch(`/api/scans/${scanId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        setError("Failed to load scan");
        setLoading(false);
        return;
      }

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
    fetchScan();
  }, [fetchScan]);

  // SSE for live progress when scan is running
  useEffect(() => {
    if (!scan || (scan.status !== "running" && scan.status !== "queued")) return;

    const token = localStorage.getItem("token");
    if (!token) return;

    // Use polling instead of native EventSource to include auth headers
    const pollInterval = setInterval(async () => {
      try {
        const res = await fetch(`/api/scans/${scanId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setScan(data.scan);
          if (data.report) setReport(data.report);
          setPageCount(data.pageCount || 0);

          // Stop polling when done
          if (["completed", "failed", "stopped"].includes(data.scan.status)) {
            clearInterval(pollInterval);
          }
        }
      } catch {
        // Ignore polling errors
      }
    }, 3000);

    return () => {
      clearInterval(pollInterval);
    };
  }, [scan?.status, scanId]);

  const domain = scan
    ? (() => { try { return new URL(scan.targetUrl).hostname; } catch { return scan.targetUrl; } })()
    : "";

  const isRunning = scan?.status === "running" || scan?.status === "queued";
  const isStopped = scan?.status === "stopped";
  const isPartial = !!(report?.breakdown as Record<string, unknown> | undefined)?.isPartial;
  const ibd = report?.breakdown?.issuesByImpact || { critical: 0, serious: 0, moderate: 0, minor: 0 };

  function downloadBlob(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  const handleExport = async (format: "excel" | "pdf" | "json") => {
    if (!report) return;
    setExporting(true);
    setShowExportMenu(false);
    try {
      const token = localStorage.getItem("token");
      if (format === "json") {
        const res = await fetch(`/api/reports/${report._id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
        downloadBlob(blob, `${domain}-report.json`);
      } else {
        const res = await fetch(`/api/reports/${report._id}/${format}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const blob = await res.blob();
        const ext = format === "pdf" ? "pdf" : "xlsx";
        downloadBlob(blob, `${domain}-wcag-compliance.${ext}`);
      }
    } catch (err) {
      console.error("Export failed:", err);
    } finally {
      setExporting(false);
    }
  };

  const handleShare = async () => {
    if (!report) return;
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`/api/reports/${report._id}/share`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ expiresInDays: 7 }),
      });
      if (res.ok) {
        const data = await res.json();
        setShareUrl(data.url);
        navigator.clipboard?.writeText(data.url);
      }
    } catch (err) {
      console.error("Share failed:", err);
    }
  };

  const handleStop = async () => {
    if (!confirm("Stop this scan? A partial report will be generated from pages scanned so far.")) return;
    setStopping(true);
    try {
      const token = localStorage.getItem("token");
      await fetch(`/api/scans/${scanId}/stop`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      // Refresh immediately
      await fetchScan();
    } catch (err) {
      console.error("Stop failed:", err);
    } finally {
      setStopping(false);
    }
  };

  if (loading) return <LoadingPage />;

  if (error || !scan) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <AlertCircle className="h-12 w-12 text-fail mb-4" />
        <h2 className="text-lg font-semibold text-foreground">{error || "Scan not found"}</h2>
        <Link href="/scans" className="mt-4 text-sm text-primary hover:text-primary-hover">
          Back to scans
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-sm text-muted">
        <Link href="/scans" className="hover:text-foreground transition-colors">
          All Scans
        </Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="font-medium text-foreground">{domain}</span>
      </nav>

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-foreground">{domain}</h1>
            {isRunning && (
              <Badge variant="partial" size="sm">
                <Loader2 className="h-3 w-3 animate-spin" />
                {scan.progress?.phase || "Running"}
              </Badge>
            )}
            {scan.status === "completed" && !isPartial && <Badge variant="pass" size="sm">Completed</Badge>}
            {scan.status === "stopped" && <Badge variant="fail" size="sm">Stopped</Badge>}
            {scan.status === "failed" && <Badge variant="fail" size="sm">Failed</Badge>}
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-muted">
            <span className="flex items-center gap-1.5">
              <Calendar className="h-4 w-4" />
              {new Date(scan.createdAt).toLocaleDateString("en-US", {
                year: "numeric", month: "long", day: "numeric",
              })}
            </span>
            <span className="flex items-center gap-1.5">
              <Hash className="h-4 w-4" />
              {scanId.slice(0, 8)}
            </span>
            {pageCount > 0 && (
              <span className="text-xs">{pageCount} pages scanned</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isRunning && (
            <>
              <Button variant="secondary" size="sm" icon={<RefreshCw className="h-3.5 w-3.5" />} onClick={fetchScan}>
                Refresh
              </Button>
              <Button
                variant="secondary"
                size="sm"
                loading={stopping}
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
                <Button
                  size="sm"
                  loading={exporting}
                  icon={<Download className="h-3.5 w-3.5" />}
                  onClick={() => setShowExportMenu(!showExportMenu)}
                >
                  Export
                </Button>
                {showExportMenu && (
                  <div className="absolute right-0 top-full mt-1 z-10 w-36 rounded-lg border border-border bg-card py-1 shadow-lg">
                    <button onClick={() => handleExport("pdf")}   className="w-full px-4 py-2 text-left text-sm text-foreground hover:bg-sidebar-hover">PDF Report</button>
                    <button onClick={() => handleExport("excel")} className="w-full px-4 py-2 text-left text-sm text-foreground hover:bg-sidebar-hover">Excel (.xlsx)</button>
                    <button onClick={() => handleExport("json")}  className="w-full px-4 py-2 text-left text-sm text-foreground hover:bg-sidebar-hover">JSON Data</button>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Running Progress */}
      {isRunning && scan.progress && (
        <Card className="border-partial/30 bg-partial-bg/30">
          <div className="flex items-center gap-4">
            <Loader2 className="h-5 w-5 animate-spin text-partial" />
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground">
                Scan in progress — {scan.progress.phase || "working"}
              </p>
              <p className="text-xs text-muted mt-0.5">
                {(() => {
                  const done = scan.progress?.scannedPages ?? 0;
                  const total = scan.progress?.totalPages ?? 0;
                  // totalPages grows as BFS discovers new URLs, so it can be
                  // larger than scannedPages. Show "discovering..." if seeding
                  // hasn't set a total yet.
                  if (total === 0) return "Discovering pages…";
                  if (done > total) return `${done} pages audited (${total} discovered)`;
                  return `${done} of ${total} pages audited`;
                })()}
                {scan.progress.currentUrl && (
                  <span className="ml-2 text-muted-light truncate max-w-xs inline-block align-bottom">
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
                  <div className="h-2 rounded-full bg-border overflow-hidden">
                    <div
                      className="h-full rounded-full bg-partial transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <p className="text-xs text-muted text-right mt-0.5">{pct}%</p>
                </div>
              );
            })()}
          </div>
        </Card>
      )}

      {/* Partial Scan Banner */}
      {isPartial && report && (
        <Card className="border-amber-500/30 bg-amber-500/5">
          <div className="flex items-start gap-3">
            <TriangleAlert className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-foreground">Partial scan report</p>
              <p className="text-xs text-muted mt-0.5">
                {(() => {
                  const meta = (report.breakdown as Record<string, unknown>)?.partialMeta as Record<string, unknown> | undefined;
                  const scanned = (meta?.scannedPages as number) || pageCount;
                  const total = (meta?.configuredMaxPages as number) || 0;
                  return total > 0
                    ? `${scanned} of ${total} pages were scanned before the scan was stopped. Results reflect only the pages processed.`
                    : `${scanned} pages were scanned before the scan was stopped. Results reflect only the pages processed.`;
                })()}
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Failed Error */}
      {scan.status === "failed" && scan.error && (
        <Card className="border-fail/30 bg-fail-bg/30">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-fail shrink-0" />
            <p className="text-sm text-fail">{scan.error}</p>
          </div>
        </Card>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-border">
        <TabButton active={activeTab === "summary"} onClick={() => setActiveTab("summary")}>
          Summary
        </TabButton>
        <TabButton active={activeTab === "issues"} onClick={() => setActiveTab("issues")}>
          All Issues
        </TabButton>
        <TabButton active={activeTab === "logs"} onClick={() => setActiveTab("logs")}>
          Scan Logs
        </TabButton>
      </div>

      {/* Summary Tab */}
      {activeTab === "summary" && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {/* Score Card */}
          <Card>
            <CardHeader>
              <CardTitle>Accessibility Score</CardTitle>
              {report && (
                <>
                  <Badge
                    variant={report.status === "pass" ? "pass" : report.status === "partial" ? "partial" : "fail"}
                    size="sm"
                  >
                    {report.status.toUpperCase()}
                  </Badge>
                  {isPartial && (
                    <Badge variant="partial" size="sm">
                      PARTIAL SCAN
                    </Badge>
                  )}
                </>
              )}
            </CardHeader>
            {report ? (
              <div className="flex items-center gap-8">
                <ScoreRing score={report.score} />
                <div className="space-y-2.5">
                  <ScoreRow label="Critical" count={ibd.critical || 0} variant="critical" />
                  <ScoreRow label="Serious" count={ibd.serious || 0} variant="serious" />
                  <ScoreRow label="Moderate" count={ibd.moderate || 0} variant="moderate" />
                  <ScoreRow label="Minor" count={ibd.minor || 0} variant="minor" />
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center py-8">
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

          {/* Issue Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Issue Summary</CardTitle>
            </CardHeader>
            {report ? (
              <IssueSummaryChart
                critical={ibd.critical || 0}
                serious={ibd.serious || 0}
                moderate={ibd.moderate || 0}
                minor={ibd.minor || 0}
              />
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                {isRunning ? (
                  <div className="flex items-center gap-2 text-sm text-muted">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Analyzing issues...
                  </div>
                ) : (
                  <>
                    <p className="text-3xl font-bold text-foreground">0</p>
                    <p className="mt-1 text-sm text-muted">Total issues</p>
                  </>
                )}
              </div>
            )}
          </Card>

          {/* Affected Pages */}
          <Card>
            <CardHeader>
              <CardTitle>Affected Pages</CardTitle>
              {report?.breakdown?.pagesScanned && (
                <span className="text-xs text-muted">{report.breakdown.pagesScanned} pages</span>
              )}
            </CardHeader>
            <AffectedPages pages={report?.breakdown?.pageScores || []} />
          </Card>

          {/* Affected Components */}
          <Card>
            <CardHeader>
              <CardTitle>Top Issues by Rule</CardTitle>
            </CardHeader>
            <AffectedComponents rules={report?.breakdown?.wcagSummary?.topRules || []} />
          </Card>
        </div>
      )}

      {/* All Issues Tab */}
      {activeTab === "issues" && (
        <Card>
          <CardHeader>
            <CardTitle>All Issues</CardTitle>
          </CardHeader>
          {report?.breakdown?.wcagSummary?.topRules ? (
            <div className="space-y-0">
              {report.breakdown.wcagSummary.topRules.map((rule, i) => (
                <div
                  key={i}
                  className="flex items-start gap-4 border-b border-border-light px-4 py-4 last:border-0"
                >
                  <Badge variant={rule.impact as "critical" | "serious" | "moderate" | "minor"} size="sm" dot>
                    {rule.impact}
                  </Badge>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground font-mono">
                      {rule.ruleId}
                    </p>
                    <p className="text-xs text-muted mt-0.5">
                      WCAG: {rule.wcag.length > 0 ? rule.wcag.join(", ") : "N/A"} | {rule.principle}
                    </p>
                  </div>
                  <span className="shrink-0 text-sm font-semibold text-foreground">
                    {rule.count} {rule.count === 1 ? "instance" : "instances"}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="py-8 text-center text-sm text-muted">
              {isRunning ? "Scan in progress..." : "No issues data available"}
            </p>
          )}
        </Card>
      )}

      {/* Scan Logs Tab */}
      {activeTab === "logs" && (
        <Card>
          <CardHeader>
            <CardTitle>Scan Configuration</CardTitle>
          </CardHeader>
          <div className="space-y-3 text-sm">
            <LogRow label="Target URL" value={scan.targetUrl} />
            <LogRow label="Status" value={scan.status} />
            <LogRow label="Pages Scanned" value={String(pageCount)} />
            {scan.config && (
              <>
                <LogRow label="Max Depth" value={String((scan.config as Record<string, unknown>).depth || "N/A")} />
                <LogRow label="Max Pages" value={String((scan.config as Record<string, unknown>).maxPages || "N/A")} />
              </>
            )}
            {scan.toolVersions && (
              <>
                <LogRow label="axe-core" value={scan.toolVersions.axe || "N/A"} />
                <LogRow label="Playwright" value={scan.toolVersions.playwright || "N/A"} />
              </>
            )}
            {isPartial && (() => {
              const meta = (report?.breakdown as Record<string, unknown>)?.partialMeta as Record<string, unknown> | undefined;
              return meta ? (
                <LogRow label="Partial Scan" value={`${meta.scannedPages as number} of ${meta.configuredMaxPages as number} pages — ${meta.reason as string}`} />
              ) : null;
            })()}
            {report?.hash && (
              <LogRow label="Report Hash" value={report.hash} mono />
            )}
          </div>
        </Card>
      )}
    </div>
  );
}

function TabButton({
  active = false,
  onClick,
  children,
}: {
  active?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
        active
          ? "border-primary text-primary"
          : "border-transparent text-muted hover:border-border hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}

function ScoreRow({
  label,
  count,
  variant,
}: {
  label: string;
  count: number;
  variant: "critical" | "serious" | "moderate" | "minor";
}) {
  return (
    <div className="flex items-center justify-between gap-6">
      <div className="flex items-center gap-2">
        <Badge variant={variant} size="sm" dot>
          {label}
        </Badge>
      </div>
      <span className="text-sm font-semibold text-foreground">{count}</span>
    </div>
  );
}

function LogRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-border-light pb-3 last:border-0">
      <span className="text-muted shrink-0">{label}</span>
      <span className={`text-foreground text-right ${mono ? "font-mono text-xs break-all" : ""}`}>
        {value}
      </span>
    </div>
  );
}
