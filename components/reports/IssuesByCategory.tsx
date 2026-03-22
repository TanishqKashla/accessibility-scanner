"use client";

import type { TopRuleData } from "./AffectedComponents";

interface IssuesByCategoryProps {
  byPrinciple?: Record<string, number>;
  topRules?: TopRuleData[];
  className?: string;
}

const PRINCIPLE_CONFIG: Record<string, { color: string; bg: string; bar: string; icon: string }> = {
  Perceivable:    { color: "text-violet-700", bg: "bg-violet-50",  bar: "bg-violet-500",  icon: "👁" },
  Operable:       { color: "text-blue-700",   bg: "bg-blue-50",    bar: "bg-blue-500",    icon: "⌨" },
  Understandable: { color: "text-amber-700",  bg: "bg-amber-50",   bar: "bg-amber-500",   icon: "💬" },
  Robust:         { color: "text-emerald-700",bg: "bg-emerald-50", bar: "bg-emerald-500", icon: "🔧" },
};

const IMPACT_CONFIG: Record<string, { color: string; dot: string }> = {
  critical: { color: "text-red-600",    dot: "bg-red-500" },
  serious:  { color: "text-purple-600", dot: "bg-purple-500" },
  moderate: { color: "text-amber-600",  dot: "bg-amber-500" },
  minor:    { color: "text-gray-500",   dot: "bg-gray-400" },
};

export default function IssuesByCategory({
  byPrinciple = {},
  topRules = [],
  className = "",
}: IssuesByCategoryProps) {
  // Build principle breakdown from byPrinciple or derive from topRules
  const principleData: Record<string, number> = Object.keys(byPrinciple).length > 0
    ? byPrinciple
    : topRules.reduce<Record<string, number>>((acc, r) => {
        acc[r.principle] = (acc[r.principle] || 0) + r.count;
        return acc;
      }, {});

  const maxCount = Math.max(...Object.values(principleData), 1);
  const totalIssues = Object.values(principleData).reduce((s, n) => s + n, 0);

  const entries = Object.entries(principleData).sort(([, a], [, b]) => b - a);

  if (entries.length === 0) {
    return (
      <p className={`py-8 text-center text-sm text-muted ${className}`}>
        No category data available
      </p>
    );
  }

  return (
    <div className={`space-y-3 ${className}`}>
      {entries.map(([principle, count]) => {
        const cfg = PRINCIPLE_CONFIG[principle] || {
          color: "text-gray-700",
          bg: "bg-gray-50",
          bar: "bg-gray-500",
          icon: "📋",
        };
        const pct = totalIssues > 0 ? Math.round((count / totalIssues) * 100) : 0;
        const barWidth = Math.round((count / maxCount) * 100);

        return (
          <div key={principle} className={`rounded-xl p-3.5 ${cfg.bg}`}>
            <div className="mb-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm" aria-hidden="true">{cfg.icon}</span>
                <span className={`text-sm font-semibold ${cfg.color}`}>{principle}</span>
              </div>
              <div className="text-right">
                <span className={`text-sm font-bold ${cfg.color}`}>{count}</span>
                <span className="ml-1 text-xs text-muted">({pct}%)</span>
              </div>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-white/60">
              <div
                className={`h-full rounded-full transition-all duration-700 ${cfg.bar}`}
                style={{ width: `${barWidth}%` }}
                role="progressbar"
                aria-valuenow={count}
                aria-valuemin={0}
                aria-valuemax={maxCount}
                aria-label={`${principle}: ${count} issues`}
              />
            </div>
          </div>
        );
      })}

      {/* Top rules breakdown */}
      {topRules.length > 0 && (
        <div className="mt-4 border-t border-border pt-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
            Top Failing Rules
          </p>
          <div className="space-y-2">
            {topRules.slice(0, 5).map((rule, i) => {
              const impact = IMPACT_CONFIG[rule.impact] || IMPACT_CONFIG.minor;
              return (
                <div key={i} className="flex items-center justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <span className={`h-2 w-2 shrink-0 rounded-full ${impact.dot}`} />
                    <span className="truncate font-mono text-xs text-foreground" title={rule.ruleId}>
                      {rule.ruleId}
                    </span>
                  </div>
                  <span className={`shrink-0 text-xs font-semibold ${impact.color}`}>
                    {rule.count}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
