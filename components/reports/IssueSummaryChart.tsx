"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

interface IssueSummaryChartProps {
  critical: number;
  serious: number;
  moderate: number;
  minor: number;
  className?: string;
}

const SEVERITY_CONFIG = [
  { key: "critical", label: "Critical", color: "#EF4444" },
  { key: "serious", label: "Serious", color: "#8B5CF6" },
  { key: "moderate", label: "Moderate", color: "#F59E0B" },
  { key: "minor", label: "Minor", color: "#9CA3AF" },
];

export default function IssueSummaryChart({
  critical,
  serious,
  moderate,
  minor,
  className = "",
}: IssueSummaryChartProps) {
  const counts: Record<string, number> = { critical, serious, moderate, minor };
  const total = critical + serious + moderate + minor;

  const data = SEVERITY_CONFIG.map((s) => ({
    name: s.label,
    value: counts[s.key],
    color: s.color,
  })).filter((d) => d.value > 0);

  if (total === 0) {
    return (
      <div className={`flex flex-col items-center justify-center py-8 text-center ${className}`}>
        <div className="mb-3 flex h-20 w-20 items-center justify-center rounded-full bg-pass-bg">
          <span className="text-2xl font-bold text-pass">0</span>
        </div>
        <p className="text-sm font-medium text-foreground">No issues found</p>
        <p className="mt-1 text-xs text-muted">This site passed all checks</p>
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-6 ${className}`}>
      {/* Donut chart */}
      <div className="relative h-36 w-36 shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              innerRadius={40}
              outerRadius={65}
              paddingAngle={2}
              dataKey="value"
              strokeWidth={0}
            >
              {data.map((entry, i) => (
                <Cell key={i} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value, name) => [`${value} issues`, name]}
              contentStyle={{
                borderRadius: "8px",
                border: "1px solid var(--color-border)",
                fontSize: "12px",
              }}
            />
          </PieChart>
        </ResponsiveContainer>
        {/* Center label */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xl font-bold text-foreground">{total}</span>
          <span className="text-[10px] text-muted">Total</span>
        </div>
      </div>

      {/* Legend */}
      <div className="space-y-2.5">
        {SEVERITY_CONFIG.map((s) => (
          <div key={s.key} className="flex items-center gap-2.5">
            <span
              className="h-2.5 w-2.5 rounded-full shrink-0"
              style={{ backgroundColor: s.color }}
            />
            <span className="text-xs text-muted w-16">{s.label}</span>
            <span className="text-xs font-semibold text-foreground">
              {counts[s.key]}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
