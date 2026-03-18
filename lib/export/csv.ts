/**
 * CSV export generator — WCAG 2.1 conformance table format.
 *
 * Layout: SC, Criterion Name, Level, Status, Notes
 * One row per Success Criterion, sorted numerically by SC.
 * Status is "Fail" if the criterion was violated in the scan, "Pass" otherwise.
 * Notes lists the axe rule IDs that caused the violation.
 */

// ─── Complete WCAG 2.1 Level A + AA criteria list ───────────────────────────
const WCAG_21_CRITERIA: Array<{ sc: string; name: string; level: "A" | "AA" }> = [
  // Principle 1: Perceivable
  { sc: "1.1.1", name: "Non-text Content",                              level: "A"  },
  { sc: "1.2.1", name: "Audio-only and Video-only (Prerecorded)",       level: "A"  },
  { sc: "1.2.2", name: "Captions (Prerecorded)",                        level: "A"  },
  { sc: "1.2.3", name: "Audio Description or Media Alternative (Prerecorded)", level: "A" },
  { sc: "1.2.4", name: "Captions (Live)",                               level: "AA" },
  { sc: "1.2.5", name: "Audio Description (Prerecorded)",               level: "AA" },
  { sc: "1.3.1", name: "Info and Relationships",                        level: "A"  },
  { sc: "1.3.2", name: "Meaningful Sequence",                           level: "A"  },
  { sc: "1.3.3", name: "Sensory Characteristics",                       level: "A"  },
  { sc: "1.3.4", name: "Orientation",                                   level: "AA" },
  { sc: "1.3.5", name: "Identify Input Purpose",                        level: "AA" },
  { sc: "1.4.1", name: "Use of Color",                                  level: "A"  },
  { sc: "1.4.2", name: "Audio Control",                                 level: "A"  },
  { sc: "1.4.3", name: "Contrast (Minimum)",                            level: "AA" },
  { sc: "1.4.4", name: "Resize Text",                                   level: "AA" },
  { sc: "1.4.5", name: "Images of Text",                                level: "AA" },
  { sc: "1.4.10", name: "Reflow",                                       level: "AA" },
  { sc: "1.4.11", name: "Non-text Contrast",                            level: "AA" },
  { sc: "1.4.12", name: "Text Spacing",                                 level: "AA" },
  { sc: "1.4.13", name: "Content on Hover or Focus",                    level: "AA" },
  // Principle 2: Operable
  { sc: "2.1.1", name: "Keyboard",                                      level: "A"  },
  { sc: "2.1.2", name: "No Keyboard Trap",                              level: "A"  },
  { sc: "2.1.4", name: "Character Key Shortcuts",                       level: "A"  },
  { sc: "2.2.1", name: "Timing Adjustable",                             level: "A"  },
  { sc: "2.2.2", name: "Pause, Stop, Hide",                             level: "A"  },
  { sc: "2.3.1", name: "Three Flashes or Below Threshold",              level: "A"  },
  { sc: "2.4.1", name: "Bypass Blocks",                                 level: "A"  },
  { sc: "2.4.2", name: "Page Titled",                                   level: "A"  },
  { sc: "2.4.3", name: "Focus Order",                                   level: "A"  },
  { sc: "2.4.4", name: "Link Purpose (In Context)",                     level: "A"  },
  { sc: "2.4.5", name: "Multiple Ways",                                 level: "AA" },
  { sc: "2.4.6", name: "Headings and Labels",                           level: "AA" },
  { sc: "2.4.7", name: "Focus Visible",                                 level: "AA" },
  { sc: "2.5.1", name: "Pointer Gestures",                              level: "A"  },
  { sc: "2.5.2", name: "Pointer Cancellation",                          level: "A"  },
  { sc: "2.5.3", name: "Label in Name",                                 level: "A"  },
  { sc: "2.5.4", name: "Motion Actuation",                              level: "A"  },
  // Principle 3: Understandable
  { sc: "3.1.1", name: "Language of Page",                              level: "A"  },
  { sc: "3.1.2", name: "Language of Parts",                             level: "AA" },
  { sc: "3.2.1", name: "On Focus",                                      level: "A"  },
  { sc: "3.2.2", name: "On Input",                                      level: "A"  },
  { sc: "3.2.3", name: "Consistent Navigation",                         level: "AA" },
  { sc: "3.2.4", name: "Consistent Identification",                     level: "AA" },
  { sc: "3.3.1", name: "Error Identification",                          level: "A"  },
  { sc: "3.3.2", name: "Labels or Instructions",                        level: "A"  },
  { sc: "3.3.3", name: "Error Suggestion",                              level: "AA" },
  { sc: "3.3.4", name: "Error Prevention (Legal, Financial, Data)",     level: "AA" },
  // Principle 4: Robust
  { sc: "4.1.1", name: "Parsing",                                       level: "A"  },
  { sc: "4.1.2", name: "Name, Role, Value",                             level: "A"  },
  { sc: "4.1.3", name: "Status Messages",                               level: "AA" },
];

function escapeCsv(value: string): string {
  if (!value) return "";
  const str = String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function buildCsvRow(values: string[]): string {
  return values.map(escapeCsv).join(",");
}

export interface WcagCsvRule {
  ruleId: string;
  wcag: string[];
  /** Number of pages the rule failed on */
  pagesFailedOn: number;
  /** Human-readable description of what the rule checks */
  description: string;
}

export interface WcagCsvInput {
  /** SC numbers violated in this scan, e.g. ["1.1.1", "1.4.3"] */
  criteriaViolated: string[];
  /** Enriched rule data — one entry per failing rule */
  topRules: WcagCsvRule[];
  /** Total pages scanned — used in the "failed on X/total" note */
  totalPages: number;
}

/**
 * Generate a WCAG 2.1 conformance table CSV.
 * One row per Success Criterion (A + AA), sorted by SC number.
 *
 * Columns:
 *   SC | Criterion Name | Level | Status | Notes | Issue Description
 *
 * Notes:    failing rule IDs with per-page counts, e.g. "image-alt (failed on 10/23 pages)"
 * Issue Description: descriptive text for each failing rule mapped to this criterion.
 */
export function generateCsv(input: WcagCsvInput): string {
  const { criteriaViolated, topRules, totalPages } = input;

  // Build SC → rules[] map
  const scToRules = new Map<string, WcagCsvRule[]>();
  for (const rule of topRules) {
    for (const sc of rule.wcag) {
      const existing = scToRules.get(sc) ?? [];
      existing.push(rule);
      scToRules.set(sc, existing);
    }
  }

  const violatedSet = new Set(criteriaViolated);

  const rows: string[] = [
    buildCsvRow(["SC", "Criterion Name", "Level", "Status", "Notes", "Issue Description"]),
  ];

  for (const criterion of WCAG_21_CRITERIA) {
    const failed = violatedSet.has(criterion.sc);
    const status = failed ? "Fail" : "Pass";

    let notes = "";
    let issueDescription = "";

    if (failed) {
      const rules = scToRules.get(criterion.sc) ?? [];
      notes = rules
        .map((r) => `${r.ruleId} (failed on ${r.pagesFailedOn}/${totalPages} pages)`)
        .join(", ");
      issueDescription = rules
        .map((r) => r.description)
        .filter(Boolean)
        .join(" | ");
    }

    rows.push(buildCsvRow([
      criterion.sc,
      criterion.name,
      criterion.level,
      status,
      notes,
      issueDescription,
    ]));
  }

  return rows.join("\n");
}
