"use client";

import { useState, useEffect, use } from "react";
import {
  Shield,
  Calendar,
  Lock,
  AlertCircle,
  Clock,
} from "lucide-react";
import Card, { CardHeader, CardTitle } from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import { LoadingPage } from "@/components/ui/Loading";
import ScoreRing from "@/components/reports/ScoreRing";
import IssueSummaryChart from "@/components/reports/IssueSummaryChart";

interface PublicReport {
  score: number;
  status: string;
  breakdown: {
    totalIssues: number;
    issuesByImpact: Record<string, number>;
    pagesScanned: number;
    wcagSummary?: {
      criteriaViolated: string[];
      topRules: Array<{ ruleId: string; count: number; impact: string; wcag: string[] }>;
    };
  };
  hash: string;
}

interface PublicScan {
  targetUrl: string;
  toolVersions?: Record<string, string>;
  createdAt: string;
}

export default function PublicReportPage({
  params,
}: {
  params: Promise<{ shareId: string }>;
}) {
  const { shareId } = use(params);
  const [report, setReport] = useState<PublicReport | null>(null);
  const [scan, setScan] = useState<PublicScan | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [needsPassword, setNeedsPassword] = useState(false);
  const [password, setPassword] = useState("");
  const [expired, setExpired] = useState(false);

  const fetchReport = async (pwd?: string) => {
    try {
      setLoading(true);
      setError("");

      const headers: Record<string, string> = {};
      if (pwd) headers["x-share-password"] = pwd;

      const res = await fetch(`/api/public/report/${shareId}`, { headers });

      if (res.status === 401) {
        const data = await res.json();
        if (data.passwordRequired) {
          setNeedsPassword(true);
          if (pwd) setError("Invalid password");
          setLoading(false);
          return;
        }
      }

      if (res.status === 410) {
        setExpired(true);
        setLoading(false);
        return;
      }

      if (!res.ok) {
        setError("Report not found");
        setLoading(false);
        return;
      }

      const data = await res.json();
      setReport(data.report);
      setScan(data.scan);
      setPageCount(data.pageCount || 0);
      setNeedsPassword(false);
    } catch {
      setError("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [shareId]);

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password) fetchReport(password);
  };

  if (loading) return <LoadingPage />;

  if (expired) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-sidebar p-4">
        <Card className="max-w-md text-center">
          <Clock className="mx-auto h-12 w-12 text-moderate mb-4" />
          <h2 className="text-lg font-semibold text-foreground mb-2">Link Expired</h2>
          <p className="text-sm text-muted">
            This shared report link has expired. Please request a new link from the report owner.
          </p>
        </Card>
      </div>
    );
  }

  if (needsPassword) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-sidebar p-4">
        <Card className="max-w-sm w-full">
          <div className="text-center mb-6">
            <Lock className="mx-auto h-10 w-10 text-primary mb-3" />
            <h2 className="text-lg font-semibold text-foreground">Password Required</h2>
            <p className="text-sm text-muted mt-1">
              This report is password protected.
            </p>
          </div>
          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            {error && (
              <p className="text-sm text-fail text-center">{error}</p>
            )}
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              className="h-10 w-full rounded-lg border border-border bg-card px-3 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              autoFocus
            />
            <Button type="submit" className="w-full">
              View Report
            </Button>
          </form>
        </Card>
      </div>
    );
  }

  if (error || !report || !scan) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-sidebar p-4">
        <Card className="max-w-md text-center">
          <AlertCircle className="mx-auto h-12 w-12 text-fail mb-4" />
          <h2 className="text-lg font-semibold text-foreground mb-2">{error || "Not Found"}</h2>
          <p className="text-sm text-muted">This report could not be loaded.</p>
        </Card>
      </div>
    );
  }

  const domain = (() => {
    try { return new URL(scan.targetUrl).hostname; } catch { return scan.targetUrl; }
  })();

  const ibd = report.breakdown?.issuesByImpact || { critical: 0, serious: 0, moderate: 0, minor: 0 };

  return (
    <div className="min-h-screen bg-sidebar">
      {/* Header Bar */}
      <div className="border-b border-border bg-card px-6 py-4">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <div className="flex items-center gap-3">
            <Shield className="h-6 w-6 text-primary" />
            <span className="text-sm font-semibold text-foreground">
              EnableUser Accessibility Report
            </span>
          </div>
          <Badge variant="default" size="sm">
            Shared Report
          </Badge>
        </div>
      </div>

      {/* Report Content */}
      <div className="mx-auto max-w-5xl p-6 space-y-6">
        {/* Title */}
        <div>
          <h1 className="text-2xl font-bold text-foreground">{domain}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-muted">
            <span className="flex items-center gap-1.5">
              <Calendar className="h-4 w-4" />
              {new Date(scan.createdAt).toLocaleDateString("en-US", {
                year: "numeric", month: "long", day: "numeric",
              })}
            </span>
            <span>{pageCount} pages scanned</span>
          </div>
        </div>

        {/* Score + Issue Summary */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Accessibility Score</CardTitle>
              <Badge
                variant={report.status === "pass" ? "pass" : report.status === "partial" ? "partial" : "fail"}
                size="sm"
              >
                {report.status.toUpperCase()}
              </Badge>
            </CardHeader>
            <div className="flex items-center gap-8">
              <ScoreRing score={report.score} />
              <div className="space-y-2.5">
                <ScoreRow label="Critical" count={ibd.critical || 0} variant="critical" />
                <ScoreRow label="Serious" count={ibd.serious || 0} variant="serious" />
                <ScoreRow label="Moderate" count={ibd.moderate || 0} variant="moderate" />
                <ScoreRow label="Minor" count={ibd.minor || 0} variant="minor" />
              </div>
            </div>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Issue Summary</CardTitle>
            </CardHeader>
            <IssueSummaryChart
              critical={ibd.critical || 0}
              serious={ibd.serious || 0}
              moderate={ibd.moderate || 0}
              minor={ibd.minor || 0}
            />
          </Card>
        </div>

        {/* Top Issues */}
        {report.breakdown?.wcagSummary?.topRules && report.breakdown.wcagSummary.topRules.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Top Issues</CardTitle>
            </CardHeader>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted">Rule</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted w-24">Impact</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted">WCAG</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-muted w-20">Count</th>
                  </tr>
                </thead>
                <tbody>
                  {report.breakdown.wcagSummary.topRules.slice(0, 15).map((rule, i) => (
                    <tr key={i} className="border-b border-border-light">
                      <td className="px-4 py-3 font-mono text-xs text-foreground">{rule.ruleId}</td>
                      <td className="px-4 py-3">
                        <Badge variant={rule.impact as "critical" | "serious" | "moderate" | "minor"} size="sm" dot>
                          {rule.impact}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted">{rule.wcag.join(", ") || "—"}</td>
                      <td className="px-4 py-3 text-center font-semibold text-foreground">{rule.count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {/* Footer */}
        <div className="text-center text-xs text-muted py-4">
          <p>Report hash: <code className="font-mono">{report.hash}</code></p>
          <p className="mt-1">Generated by EnableUser Accessibility Scanner</p>
        </div>
      </div>
    </div>
  );
}

function ScoreRow({ label, count, variant }: { label: string; count: number; variant: "critical" | "serious" | "moderate" | "minor" }) {
  return (
    <div className="flex items-center justify-between gap-6">
      <Badge variant={variant} size="sm" dot>{label}</Badge>
      <span className="text-sm font-semibold text-foreground">{count}</span>
    </div>
  );
}
