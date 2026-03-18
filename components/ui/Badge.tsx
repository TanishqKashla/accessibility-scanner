import React from "react";

type BadgeVariant = "critical" | "serious" | "moderate" | "minor" | "pass" | "fail" | "partial" | "default";
type BadgeSize = "sm" | "md";

interface BadgeProps {
  variant?: BadgeVariant;
  size?: BadgeSize;
  children: React.ReactNode;
  className?: string;
  dot?: boolean;
}

const variantClasses: Record<BadgeVariant, string> = {
  critical: "bg-critical-bg text-critical border-critical/20",
  serious: "bg-serious-bg text-serious border-serious/20",
  moderate: "bg-moderate-bg text-moderate border-moderate/20",
  minor: "bg-minor-bg text-minor border-minor/20",
  pass: "bg-pass-bg text-pass border-pass/20",
  fail: "bg-fail-bg text-fail border-fail/20",
  partial: "bg-partial-bg text-partial border-partial/20",
  default: "bg-sidebar text-muted border-border",
};

const dotColors: Record<BadgeVariant, string> = {
  critical: "bg-critical",
  serious: "bg-serious",
  moderate: "bg-moderate",
  minor: "bg-minor",
  pass: "bg-pass",
  fail: "bg-fail",
  partial: "bg-partial",
  default: "bg-muted",
};

const sizeClasses: Record<BadgeSize, string> = {
  sm: "px-2 py-0.5 text-[11px]",
  md: "px-2.5 py-1 text-xs",
};

export default function Badge({
  variant = "default",
  size = "md",
  children,
  className = "",
  dot = false,
}: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border font-semibold ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
    >
      {dot && (
        <span
          className={`h-1.5 w-1.5 rounded-full ${dotColors[variant]}`}
        />
      )}
      {children}
    </span>
  );
}
