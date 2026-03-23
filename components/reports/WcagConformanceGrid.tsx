"use client";

interface WcagCriterion {
  sc: string;
  level: "A" | "AA";
  name: string;
}

interface WcagConformanceGridProps {
  criteriaViolated: string[];
  className?: string;
}

// Criteria automatically tested by axe-core (from wcagMapping.ts)
const TESTED_CRITERIA = new Set([
  "1.1.1", "1.2.2", "1.2.5", "1.3.1", "1.3.4", "1.3.5",
  "1.4.1", "1.4.2", "1.4.3", "1.4.4",
  "2.1.1", "2.2.1", "2.2.2", "2.4.1", "2.4.2", "2.4.3",
  "2.4.4", "2.4.6", "2.5.3",
  "3.1.1", "3.1.2", "3.3.2",
  "4.1.1", "4.1.2",
]);

const WCAG_CRITERIA: Record<string, WcagCriterion[]> = {
  Perceivable: [
    { sc: "1.1.1", level: "A",  name: "Non-text Content" },
    { sc: "1.2.2", level: "A",  name: "Captions (Prerecorded)" },
    { sc: "1.2.4", level: "AA", name: "Captions (Live)" },
    { sc: "1.2.5", level: "AA", name: "Audio Description" },
    { sc: "1.3.1", level: "A",  name: "Info and Relationships" },
    { sc: "1.3.2", level: "A",  name: "Meaningful Sequence" },
    { sc: "1.3.3", level: "A",  name: "Sensory Characteristics" },
    { sc: "1.3.4", level: "AA", name: "Orientation" },
    { sc: "1.3.5", level: "AA", name: "Input Purpose" },
    { sc: "1.4.1", level: "A",  name: "Use of Color" },
    { sc: "1.4.2", level: "A",  name: "Audio Control" },
    { sc: "1.4.3", level: "AA", name: "Contrast (Minimum)" },
    { sc: "1.4.4", level: "AA", name: "Resize Text" },
    { sc: "1.4.5", level: "AA", name: "Images of Text" },
    { sc: "1.4.10", level: "AA", name: "Reflow" },
    { sc: "1.4.11", level: "AA", name: "Non-text Contrast" },
    { sc: "1.4.12", level: "AA", name: "Text Spacing" },
    { sc: "1.4.13", level: "AA", name: "Content on Hover" },
  ],
  Operable: [
    { sc: "2.1.1", level: "A",  name: "Keyboard" },
    { sc: "2.1.2", level: "A",  name: "No Keyboard Trap" },
    { sc: "2.1.4", level: "AA", name: "Character Key Shortcuts" },
    { sc: "2.2.1", level: "A",  name: "Timing Adjustable" },
    { sc: "2.2.2", level: "A",  name: "Pause, Stop, Hide" },
    { sc: "2.3.1", level: "A",  name: "Three Flashes" },
    { sc: "2.4.1", level: "A",  name: "Bypass Blocks" },
    { sc: "2.4.2", level: "A",  name: "Page Titled" },
    { sc: "2.4.3", level: "A",  name: "Focus Order" },
    { sc: "2.4.4", level: "A",  name: "Link Purpose" },
    { sc: "2.4.5", level: "AA", name: "Multiple Ways" },
    { sc: "2.4.6", level: "AA", name: "Headings and Labels" },
    { sc: "2.4.7", level: "AA", name: "Focus Visible" },
    { sc: "2.5.1", level: "A",  name: "Pointer Gestures" },
    { sc: "2.5.2", level: "A",  name: "Pointer Cancellation" },
    { sc: "2.5.3", level: "A",  name: "Label in Name" },
    { sc: "2.5.4", level: "A",  name: "Motion Actuation" },
  ],
  Understandable: [
    { sc: "3.1.1", level: "A",  name: "Language of Page" },
    { sc: "3.1.2", level: "AA", name: "Language of Parts" },
    { sc: "3.2.1", level: "A",  name: "On Focus" },
    { sc: "3.2.2", level: "A",  name: "On Input" },
    { sc: "3.2.3", level: "AA", name: "Consistent Navigation" },
    { sc: "3.2.4", level: "AA", name: "Consistent Identification" },
    { sc: "3.3.1", level: "A",  name: "Error Identification" },
    { sc: "3.3.2", level: "A",  name: "Labels or Instructions" },
    { sc: "3.3.3", level: "AA", name: "Error Suggestion" },
    { sc: "3.3.4", level: "AA", name: "Error Prevention" },
  ],
  Robust: [
    { sc: "4.1.1", level: "A",  name: "Parsing" },
    { sc: "4.1.2", level: "A",  name: "Name, Role, Value" },
    { sc: "4.1.3", level: "AA", name: "Status Messages" },
  ],
};

type CriterionStatus = "fail" | "pass" | "needs-review" | "not-tested";

function getStatus(sc: string, violated: Set<string>): CriterionStatus {
  if (violated.has(sc)) return "fail";
  if (TESTED_CRITERIA.has(sc)) return "pass";
  return "not-tested";
}

const STATUS_STYLES: Record<CriterionStatus, string> = {
  fail:         "bg-red-100 text-red-700 border border-red-200 font-semibold",
  pass:         "bg-emerald-100 text-emerald-700 border border-emerald-200",
  "needs-review": "bg-blue-100 text-blue-700 border border-blue-200",
  "not-tested": "bg-gray-100 text-gray-400 border border-gray-200",
};

const STATUS_LABEL: Record<CriterionStatus, string> = {
  fail:           "Fail",
  pass:           "Pass",
  "needs-review": "Review",
  "not-tested":   "Not tested",
};

const PRINCIPLE_ICONS: Record<string, string> = {
  Perceivable:   "👁",
  Operable:      "⌨",
  Understandable: "💬",
  Robust:        "🔧",
};

const PRINCIPLE_COLORS: Record<string, { bg: string; border: string; label: string }> = {
  Perceivable:    { bg: "bg-card",  border: "border-border", label: "text-foreground" },
  Operable:       { bg: "bg-card",  border: "border-border", label: "text-foreground" },
  Understandable: { bg: "bg-card",  border: "border-border", label: "text-foreground" },
  Robust:         { bg: "bg-card",  border: "border-border", label: "text-foreground" },
};

export default function WcagConformanceGrid({
  criteriaViolated,
  className = "",
}: WcagConformanceGridProps) {
  const violatedSet = new Set(criteriaViolated);

  // Compute summary counts per principle
  const summary = Object.entries(WCAG_CRITERIA).map(([principle, criteria]) => {
    const counts = { fail: 0, pass: 0, notTested: 0 };
    criteria.forEach((c) => {
      const s = getStatus(c.sc, violatedSet);
      if (s === "fail") counts.fail++;
      else if (s === "pass") counts.pass++;
      else counts.notTested++;
    });
    return { principle, counts, total: criteria.length };
  });

  return (
    <div className={className}>
      {/* Legend */}
      <div className="mb-4 flex flex-wrap items-center gap-4 text-xs text-muted">
        <span className="font-medium text-foreground">Legend:</span>
        {(["pass", "fail", "not-tested"] as CriterionStatus[]).map((s) => (
          <span key={s} className="flex items-center gap-1.5">
            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${STATUS_STYLES[s]}`}>
              1.1.1
            </span>
            <span>{STATUS_LABEL[s]}</span>
          </span>
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Object.entries(WCAG_CRITERIA).map(([principle, criteria]) => {
          const sumData = summary.find((s) => s.principle === principle)!;
          const colors = PRINCIPLE_COLORS[principle];

          return (
            <div
              key={principle}
              className={`rounded-xl border p-4 ${colors.bg} ${colors.border}`}
            >
              {/* Principle header */}
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-base" aria-hidden="true">
                    {PRINCIPLE_ICONS[principle]}
                  </span>
                  <h4 className={`text-sm font-semibold ${colors.label}`}>
                    {principle}
                  </h4>
                </div>
                <span className={`text-xs font-medium ${colors.label} opacity-70`}>
                  {sumData.counts.pass}/{sumData.total - sumData.counts.notTested} tested
                </span>
              </div>

              {/* Fail / Pass counts */}
              <div className="mb-3 flex items-center gap-3 text-xs">
                {sumData.counts.fail > 0 && (
                  <span className="flex items-center gap-1 font-semibold text-red-600">
                    <span className="h-1.5 w-1.5 rounded-full bg-red-500 inline-block" />
                    {sumData.counts.fail} failing
                  </span>
                )}
                {sumData.counts.pass > 0 && (
                  <span className="flex items-center gap-1 text-emerald-600">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 inline-block" />
                    {sumData.counts.pass} passing
                  </span>
                )}
              </div>

              {/* Criterion badges */}
              <div className="flex flex-wrap gap-1.5">
                {criteria.map((c) => {
                  const status = getStatus(c.sc, violatedSet);
                  return (
                    <span
                      key={c.sc}
                      className={`inline-flex cursor-default items-center rounded-full px-2 py-0.5 text-[11px] font-medium transition-opacity hover:opacity-80 ${STATUS_STYLES[status]}`}
                      title={`${c.sc} ${c.name} (Level ${c.level}) — ${STATUS_LABEL[status]}`}
                      aria-label={`${c.sc} ${STATUS_LABEL[status]}`}
                    >
                      {c.sc}
                    </span>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
