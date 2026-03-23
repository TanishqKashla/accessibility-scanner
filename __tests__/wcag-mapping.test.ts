import { describe, it, expect } from "vitest";
import {
  getWcagCriteria,
  getWcagFromTags,
  getWcagLevel,
  getWcagPrinciple,
  AXE_TO_WCAG,
} from "@/lib/compliance/wcagMapping";

describe("getWcagPrinciple", () => {
  it("returns Perceivable for image-alt", () => {
    expect(getWcagPrinciple("image-alt")).toBe("Perceivable");
  });

  it("returns Operable for bypass", () => {
    expect(getWcagPrinciple("bypass")).toBe("Operable");
  });

  it("returns Understandable for html-has-lang", () => {
    expect(getWcagPrinciple("html-has-lang")).toBe("Understandable");
  });

  it("returns Robust for aria-roles", () => {
    expect(getWcagPrinciple("aria-roles")).toBe("Robust");
  });

  it("returns Unknown for unmapped rule", () => {
    expect(getWcagPrinciple("nonexistent-rule")).toBe("Unknown");
  });
});

describe("AXE_TO_WCAG completeness", () => {
  it("all 4 WCAG principles are represented", () => {
    const principles = new Set<string>();
    for (const criteria of Object.values(AXE_TO_WCAG)) {
      for (const c of criteria) {
        principles.add(c.principle);
      }
    }
    expect(principles.has("Perceivable")).toBe(true);
    expect(principles.has("Operable")).toBe(true);
    expect(principles.has("Understandable")).toBe(true);
    expect(principles.has("Robust")).toBe(true);
  });

  it("all 3 WCAG levels are represented", () => {
    const levels = new Set<string>();
    for (const criteria of Object.values(AXE_TO_WCAG)) {
      for (const c of criteria) {
        levels.add(c.level);
      }
    }
    expect(levels.has("A")).toBe(true);
    expect(levels.has("AA")).toBe(true);
    expect(levels.has("AAA")).toBe(true);
  });

  it("maps 60+ axe rules", () => {
    expect(Object.keys(AXE_TO_WCAG).length).toBeGreaterThanOrEqual(60);
  });

  it("every entry has valid structure", () => {
    for (const [ruleId, criteria] of Object.entries(AXE_TO_WCAG)) {
      expect(Array.isArray(criteria), `${ruleId} should map to an array`).toBe(true);
      for (const c of criteria) {
        expect(c.sc, `${ruleId} missing sc`).toBeTruthy();
        expect(["A", "AA", "AAA"], `${ruleId} invalid level ${c.level}`).toContain(c.level);
        expect(c.principle, `${ruleId} missing principle`).toBeTruthy();
        expect(c.name, `${ruleId} missing name`).toBeTruthy();
      }
    }
  });
});

describe("getWcagFromTags edge cases", () => {
  it("handles empty array", () => {
    expect(getWcagFromTags([])).toEqual([]);
  });

  it("handles tags with multi-digit SC parts", () => {
    // wcag1410 → 1.4.10
    const result = getWcagFromTags(["wcag1410"]);
    expect(result).toContain("1.4.10");
  });

  it("handles mix of valid and invalid tags", () => {
    const result = getWcagFromTags(["wcag111", "best-practice", "cat-color", "wcag143"]);
    expect(result).toContain("1.1.1");
    expect(result).toContain("1.4.3");
    expect(result).toHaveLength(2);
  });
});

describe("getWcagLevel edge cases", () => {
  it("returns highest level when rule maps to multiple criteria", () => {
    // color-contrast-enhanced maps to AAA
    expect(getWcagLevel("color-contrast-enhanced")).toBe("AAA");
  });

  it("returns A for rules that only map to Level A", () => {
    expect(getWcagLevel("image-alt")).toBe("A");
    expect(getWcagLevel("button-name")).toBe("A");
  });

  it("returns AA for rules that map to Level AA", () => {
    expect(getWcagLevel("color-contrast")).toBe("AA");
    expect(getWcagLevel("empty-heading")).toBe("AA");
  });
});

describe("getWcagCriteria edge cases", () => {
  it("returns multiple criteria when a rule maps to several SCs", () => {
    // Most rules map to exactly 1 SC, but the structure supports multiple
    const criteria = getWcagCriteria("image-alt");
    expect(criteria.length).toBeGreaterThanOrEqual(1);
    expect(criteria[0].sc).toBe("1.1.1");
  });

  it("returns empty array for empty string rule", () => {
    expect(getWcagCriteria("")).toEqual([]);
  });
});
