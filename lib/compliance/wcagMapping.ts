/**
 * Mapping of axe-core rule IDs to WCAG 2.1 success criteria.
 * Each entry maps a rule to its WCAG SC, level, and human-readable principle.
 */

export interface WcagCriterion {
  sc: string;        // e.g. "1.1.1"
  level: "A" | "AA" | "AAA";
  principle: string;  // Perceivable, Operable, Understandable, Robust
  name: string;       // Human-readable name
}

// Comprehensive mapping of axe rule IDs → WCAG success criteria
const AXE_TO_WCAG: Record<string, WcagCriterion[]> = {
  // --- Perceivable ---
  "image-alt": [{ sc: "1.1.1", level: "A", principle: "Perceivable", name: "Non-text Content" }],
  "input-image-alt": [{ sc: "1.1.1", level: "A", principle: "Perceivable", name: "Non-text Content" }],
  "area-alt": [{ sc: "1.1.1", level: "A", principle: "Perceivable", name: "Non-text Content" }],
  "object-alt": [{ sc: "1.1.1", level: "A", principle: "Perceivable", name: "Non-text Content" }],
  "svg-img-alt": [{ sc: "1.1.1", level: "A", principle: "Perceivable", name: "Non-text Content" }],
  "role-img-alt": [{ sc: "1.1.1", level: "A", principle: "Perceivable", name: "Non-text Content" }],

  "video-caption": [{ sc: "1.2.2", level: "A", principle: "Perceivable", name: "Captions (Prerecorded)" }],
  "audio-caption": [{ sc: "1.2.2", level: "A", principle: "Perceivable", name: "Captions (Prerecorded)" }],
  "video-description": [{ sc: "1.2.5", level: "AA", principle: "Perceivable", name: "Audio Description (Prerecorded)" }],

  "p-as-heading": [{ sc: "1.3.1", level: "A", principle: "Perceivable", name: "Info and Relationships" }],
  "heading-order": [{ sc: "1.3.1", level: "A", principle: "Perceivable", name: "Info and Relationships" }],
  "list": [{ sc: "1.3.1", level: "A", principle: "Perceivable", name: "Info and Relationships" }],
  "listitem": [{ sc: "1.3.1", level: "A", principle: "Perceivable", name: "Info and Relationships" }],
  "definition-list": [{ sc: "1.3.1", level: "A", principle: "Perceivable", name: "Info and Relationships" }],
  "dlitem": [{ sc: "1.3.1", level: "A", principle: "Perceivable", name: "Info and Relationships" }],
  "table-duplicate-name": [{ sc: "1.3.1", level: "A", principle: "Perceivable", name: "Info and Relationships" }],
  "th-has-data-cells": [{ sc: "1.3.1", level: "A", principle: "Perceivable", name: "Info and Relationships" }],
  "td-headers-attr": [{ sc: "1.3.1", level: "A", principle: "Perceivable", name: "Info and Relationships" }],
  "scope-attr-valid": [{ sc: "1.3.1", level: "A", principle: "Perceivable", name: "Info and Relationships" }],
  "table-fake-caption": [{ sc: "1.3.1", level: "A", principle: "Perceivable", name: "Info and Relationships" }],
  "td-has-header": [{ sc: "1.3.1", level: "A", principle: "Perceivable", name: "Info and Relationships" }],
  "landmark-unique": [{ sc: "1.3.1", level: "A", principle: "Perceivable", name: "Info and Relationships" }],
  "form-field-multiple-labels": [{ sc: "1.3.1", level: "A", principle: "Perceivable", name: "Info and Relationships" }],

  "css-orientation-lock": [{ sc: "1.3.4", level: "AA", principle: "Perceivable", name: "Orientation" }],
  "autocomplete-valid": [{ sc: "1.3.5", level: "AA", principle: "Perceivable", name: "Identify Input Purpose" }],

  "color-contrast": [{ sc: "1.4.3", level: "AA", principle: "Perceivable", name: "Contrast (Minimum)" }],
  "color-contrast-enhanced": [{ sc: "1.4.6", level: "AAA", principle: "Perceivable", name: "Contrast (Enhanced)" }],
  "link-in-text-block": [{ sc: "1.4.1", level: "A", principle: "Perceivable", name: "Use of Color" }],

  "meta-viewport": [{ sc: "1.4.4", level: "AA", principle: "Perceivable", name: "Resize Text" }],
  "meta-viewport-large": [{ sc: "1.4.4", level: "AA", principle: "Perceivable", name: "Resize Text" }],

  // --- Operable ---
  "accesskeys": [{ sc: "2.1.1", level: "A", principle: "Operable", name: "Keyboard" }],
  "server-side-image-map": [{ sc: "2.1.1", level: "A", principle: "Operable", name: "Keyboard" }],
  "scrollable-region-focusable": [{ sc: "2.1.1", level: "A", principle: "Operable", name: "Keyboard" }],

  "no-autoplay-audio": [{ sc: "1.4.2", level: "A", principle: "Perceivable", name: "Audio Control" }],
  "blink": [{ sc: "2.2.2", level: "A", principle: "Operable", name: "Pause, Stop, Hide" }],
  "marquee": [{ sc: "2.2.2", level: "A", principle: "Operable", name: "Pause, Stop, Hide" }],
  "meta-refresh": [{ sc: "2.2.1", level: "A", principle: "Operable", name: "Timing Adjustable" }],
  "meta-refresh-no-exceptions": [{ sc: "2.2.4", level: "AAA", principle: "Operable", name: "Interruptions" }],

  "bypass": [{ sc: "2.4.1", level: "A", principle: "Operable", name: "Bypass Blocks" }],
  "page-has-heading-one": [{ sc: "2.4.1", level: "A", principle: "Operable", name: "Bypass Blocks" }],
  "region": [{ sc: "2.4.1", level: "A", principle: "Operable", name: "Bypass Blocks" }],

  "document-title": [{ sc: "2.4.2", level: "A", principle: "Operable", name: "Page Titled" }],
  "frame-title": [{ sc: "2.4.2", level: "A", principle: "Operable", name: "Page Titled" }],
  "frame-title-unique": [{ sc: "2.4.2", level: "A", principle: "Operable", name: "Page Titled" }],

  "link-name": [{ sc: "2.4.4", level: "A", principle: "Operable", name: "Link Purpose (In Context)" }],
  "identical-links-same-purpose": [{ sc: "2.4.9", level: "AAA", principle: "Operable", name: "Link Purpose (Link Only)" }],

  "focus-order-semantics": [{ sc: "2.4.3", level: "A", principle: "Operable", name: "Focus Order" }],
  "tabindex": [{ sc: "2.4.3", level: "A", principle: "Operable", name: "Focus Order" }],

  "empty-heading": [{ sc: "2.4.6", level: "AA", principle: "Operable", name: "Headings and Labels" }],
  "label": [{ sc: "2.4.6", level: "AA", principle: "Operable", name: "Headings and Labels" }],

  "target-size": [{ sc: "2.5.5", level: "AAA", principle: "Operable", name: "Target Size" }],
  "label-title-only": [{ sc: "2.5.3", level: "A", principle: "Operable", name: "Label in Name" }],
  "label-content-name-mismatch": [{ sc: "2.5.3", level: "A", principle: "Operable", name: "Label in Name" }],

  // --- Understandable ---
  "html-has-lang": [{ sc: "3.1.1", level: "A", principle: "Understandable", name: "Language of Page" }],
  "html-lang-valid": [{ sc: "3.1.1", level: "A", principle: "Understandable", name: "Language of Page" }],
  "html-xml-lang-mismatch": [{ sc: "3.1.1", level: "A", principle: "Understandable", name: "Language of Page" }],
  "valid-lang": [{ sc: "3.1.2", level: "AA", principle: "Understandable", name: "Language of Parts" }],

  "select-name": [{ sc: "3.3.2", level: "A", principle: "Understandable", name: "Labels or Instructions" }],
  "input-button-name": [{ sc: "3.3.2", level: "A", principle: "Understandable", name: "Labels or Instructions" }],

  // --- Robust ---
  "duplicate-id": [{ sc: "4.1.1", level: "A", principle: "Robust", name: "Parsing" }],
  "duplicate-id-active": [{ sc: "4.1.1", level: "A", principle: "Robust", name: "Parsing" }],
  "duplicate-id-aria": [{ sc: "4.1.1", level: "A", principle: "Robust", name: "Parsing" }],

  "button-name": [{ sc: "4.1.2", level: "A", principle: "Robust", name: "Name, Role, Value" }],
  "aria-allowed-attr": [{ sc: "4.1.2", level: "A", principle: "Robust", name: "Name, Role, Value" }],
  "aria-allowed-role": [{ sc: "4.1.2", level: "A", principle: "Robust", name: "Name, Role, Value" }],
  "aria-command-name": [{ sc: "4.1.2", level: "A", principle: "Robust", name: "Name, Role, Value" }],
  "aria-dialog-name": [{ sc: "4.1.2", level: "A", principle: "Robust", name: "Name, Role, Value" }],
  "aria-hidden-body": [{ sc: "4.1.2", level: "A", principle: "Robust", name: "Name, Role, Value" }],
  "aria-hidden-focus": [{ sc: "4.1.2", level: "A", principle: "Robust", name: "Name, Role, Value" }],
  "aria-input-field-name": [{ sc: "4.1.2", level: "A", principle: "Robust", name: "Name, Role, Value" }],
  "aria-meter-name": [{ sc: "4.1.2", level: "A", principle: "Robust", name: "Name, Role, Value" }],
  "aria-progressbar-name": [{ sc: "4.1.2", level: "A", principle: "Robust", name: "Name, Role, Value" }],
  "aria-required-attr": [{ sc: "4.1.2", level: "A", principle: "Robust", name: "Name, Role, Value" }],
  "aria-required-children": [{ sc: "4.1.2", level: "A", principle: "Robust", name: "Name, Role, Value" }],
  "aria-required-parent": [{ sc: "4.1.2", level: "A", principle: "Robust", name: "Name, Role, Value" }],
  "aria-roledescription": [{ sc: "4.1.2", level: "A", principle: "Robust", name: "Name, Role, Value" }],
  "aria-roles": [{ sc: "4.1.2", level: "A", principle: "Robust", name: "Name, Role, Value" }],
  "aria-text": [{ sc: "4.1.2", level: "A", principle: "Robust", name: "Name, Role, Value" }],
  "aria-toggle-field-name": [{ sc: "4.1.2", level: "A", principle: "Robust", name: "Name, Role, Value" }],
  "aria-tooltip-name": [{ sc: "4.1.2", level: "A", principle: "Robust", name: "Name, Role, Value" }],
  "aria-treeitem-name": [{ sc: "4.1.2", level: "A", principle: "Robust", name: "Name, Role, Value" }],
  "aria-valid-attr": [{ sc: "4.1.2", level: "A", principle: "Robust", name: "Name, Role, Value" }],
  "aria-valid-attr-value": [{ sc: "4.1.2", level: "A", principle: "Robust", name: "Name, Role, Value" }],

  "nested-interactive": [{ sc: "4.1.2", level: "A", principle: "Robust", name: "Name, Role, Value" }],

  "aria-braille-equivalent": [{ sc: "4.1.2", level: "A", principle: "Robust", name: "Name, Role, Value" }],
};

/**
 * Look up WCAG criteria for a given axe rule ID.
 */
export function getWcagCriteria(ruleId: string): WcagCriterion[] {
  return AXE_TO_WCAG[ruleId] || [];
}

/**
 * Look up WCAG criteria from axe tags (e.g. ["wcag2a", "wcag111"]).
 * Extracts SC numbers from tags like "wcag111" → "1.1.1".
 */
export function getWcagFromTags(tags: string[]): string[] {
  const criteria: string[] = [];
  for (const tag of tags) {
    // Match patterns like wcag111 → 1.1.1, wcag143 → 1.4.3
    const match = tag.match(/^wcag(\d)(\d)(\d+)$/);
    if (match) {
      criteria.push(`${match[1]}.${match[2]}.${match[3]}`);
    }
  }
  return [...new Set(criteria)];
}

/**
 * Get the WCAG level for a rule (returns highest level found).
 */
export function getWcagLevel(ruleId: string): "A" | "AA" | "AAA" | "unknown" {
  const criteria = AXE_TO_WCAG[ruleId];
  if (!criteria || criteria.length === 0) return "unknown";
  // Return highest level
  if (criteria.some((c) => c.level === "AAA")) return "AAA";
  if (criteria.some((c) => c.level === "AA")) return "AA";
  return "A";
}

/**
 * Get the WCAG principle for a rule.
 */
export function getWcagPrinciple(ruleId: string): string {
  const criteria = AXE_TO_WCAG[ruleId];
  if (!criteria || criteria.length === 0) return "Unknown";
  return criteria[0].principle;
}

export { AXE_TO_WCAG };
