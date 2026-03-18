"use client";

import { ExternalLink } from "lucide-react";
import Badge from "@/components/ui/Badge";

export interface PageScoreData {
  url: string;
  score: number;
  totalIssues: number;
  issuesByImpact: Record<string, number>;
}

interface AffectedPagesProps {
  pages: PageScoreData[];
  className?: string;
}

function getScoreVariant(score: number): "pass" | "partial" | "fail" {
  if (score >= 80) return "pass";
  if (score >= 50) return "partial";
  return "fail";
}

function truncateUrl(url: string, max = 50): string {
  try {
    const { pathname } = new URL(url);
    const display = pathname === "/" ? url : pathname;
    return display.length > max ? display.slice(0, max) + "..." : display;
  } catch {
    return url.length > max ? url.slice(0, max) + "..." : url;
  }
}

export default function AffectedPages({ pages, className = "" }: AffectedPagesProps) {
  if (pages.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted">
        No page data available
      </p>
    );
  }

  // Sort by score ascending (worst first)
  const sorted = [...pages].sort((a, b) => a.score - b.score);

  return (
    <div className={`overflow-x-auto ${className}`}>
      <table className="w-full text-sm" role="table">
        <thead>
          <tr className="border-b border-border">
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted">
              Page
            </th>
            <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-muted w-20">
              Score
            </th>
            <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-muted w-20">
              Issues
            </th>
          </tr>
        </thead>
        <tbody>
          {sorted.slice(0, 20).map((page, i) => (
            <tr
              key={i}
              className="border-b border-border-light transition-colors hover:bg-sidebar-hover"
            >
              <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                  <ExternalLink className="h-3.5 w-3.5 shrink-0 text-muted-light" />
                  <span
                    className="text-foreground truncate max-w-xs"
                    title={page.url}
                  >
                    {truncateUrl(page.url)}
                  </span>
                </div>
              </td>
              <td className="px-4 py-3 text-center">
                <Badge variant={getScoreVariant(page.score)} size="sm">
                  {page.score}
                </Badge>
              </td>
              <td className="px-4 py-3 text-center font-medium text-foreground">
                {page.totalIssues}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {pages.length > 20 && (
        <p className="px-4 py-2 text-xs text-muted">
          Showing top 20 of {pages.length} pages
        </p>
      )}
    </div>
  );
}
