"use client";

import Badge from "@/components/ui/Badge";

export interface TopRuleData {
  ruleId: string;
  count: number;
  impact: string;
  wcag: string[];
  principle: string;
}

interface AffectedComponentsProps {
  rules: TopRuleData[];
  className?: string;
}

function impactVariant(impact: string): "critical" | "serious" | "moderate" | "minor" {
  if (impact === "critical") return "critical";
  if (impact === "serious") return "serious";
  if (impact === "moderate") return "moderate";
  return "minor";
}

export default function AffectedComponents({ rules, className = "" }: AffectedComponentsProps) {
  if (rules.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted">
        No component data available
      </p>
    );
  }

  return (
    <div className={`overflow-x-auto ${className}`}>
      <table className="w-full text-sm" role="table">
        <thead>
          <tr className="border-b border-border">
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted">
              Rule
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted w-24">
              Impact
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted w-24">
              WCAG
            </th>
            <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-muted w-20">
              Count
            </th>
          </tr>
        </thead>
        <tbody>
          {rules.map((rule, i) => (
            <tr
              key={i}
              className="border-b border-border-light transition-colors hover:bg-sidebar-hover"
            >
              <td className="px-4 py-3">
                <span className="font-mono text-xs text-foreground">
                  {rule.ruleId}
                </span>
              </td>
              <td className="px-4 py-3">
                <Badge variant={impactVariant(rule.impact)} size="sm" dot>
                  {rule.impact}
                </Badge>
              </td>
              <td className="px-4 py-3">
                <span className="text-xs text-muted">
                  {rule.wcag.length > 0 ? rule.wcag.join(", ") : "--"}
                </span>
              </td>
              <td className="px-4 py-3 text-center font-semibold text-foreground">
                {rule.count}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
