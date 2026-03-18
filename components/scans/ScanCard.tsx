"use client";

import Link from "next/link";
import { Globe, Clock, ArrowRight, Loader2 } from "lucide-react";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";

export interface ScanData {
  _id: string;
  targetUrl: string;
  status: "pending" | "queued" | "running" | "completed" | "failed";
  config?: {
    depth?: number;
    maxPages?: number;
    axeTags?: string[];
  };
  progress?: {
    scannedPages?: number;
    totalPages?: number;
    phase?: string;
  };
  createdAt: string;
  score?: number;
  totalIssues?: number;
}

interface ScanCardProps {
  scan: ScanData;
}

function getStatusBadge(status: string) {
  switch (status) {
    case "completed":
      return <Badge variant="pass" size="sm">Completed</Badge>;
    case "running":
      return (
        <Badge variant="partial" size="sm">
          <Loader2 className="h-3 w-3 animate-spin" />
          Running
        </Badge>
      );
    case "queued":
      return <Badge variant="default" size="sm">Queued</Badge>;
    case "failed":
      return <Badge variant="fail" size="sm">Failed</Badge>;
    default:
      return <Badge variant="default" size="sm">Pending</Badge>;
  }
}

function getScoreColor(score: number): string {
  if (score >= 80) return "text-pass";
  if (score >= 50) return "text-partial";
  return "text-fail";
}

function timeAgo(dateStr: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return "Just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function extractDomain(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

export default function ScanCard({ scan }: ScanCardProps) {
  return (
    <Link href={`/scans/${scan._id}`}>
      <Card hover className="group cursor-pointer transition-all duration-200 hover:-translate-y-0.5">
        <div className="flex items-start justify-between gap-4">
          {/* Left: URL and meta */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2.5 mb-2">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary-50">
                <Globe className="h-4 w-4 text-primary" />
              </div>
              <div className="min-w-0">
                <h3 className="truncate text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
                  {extractDomain(scan.targetUrl)}
                </h3>
                <p className="truncate text-xs text-muted">{scan.targetUrl}</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 mt-3">
              {getStatusBadge(scan.status)}

              <span className="flex items-center gap-1 text-xs text-muted">
                <Clock className="h-3 w-3" />
                {timeAgo(scan.createdAt)}
              </span>

              {scan.progress && scan.status === "running" && (
                <span className="text-xs text-muted">
                  {scan.progress.scannedPages || 0}/{scan.progress.totalPages || "?"} pages
                </span>
              )}
            </div>
          </div>

          {/* Right: Score + CTA */}
          <div className="flex items-center gap-4 shrink-0">
            {scan.status === "completed" && scan.score !== undefined && (
              <div className="text-right">
                <p className={`text-2xl font-bold ${getScoreColor(scan.score)}`}>
                  {scan.score}
                </p>
                <p className="text-[10px] text-muted uppercase tracking-wide">Score</p>
              </div>
            )}

            <ArrowRight className="h-4 w-4 text-muted-light group-hover:text-primary transition-colors" />
          </div>
        </div>
      </Card>
    </Link>
  );
}
