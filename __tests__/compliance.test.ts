import { describe, it, expect } from "vitest";
import {
  evaluateCompliance,
  determineStatus,
  DEFAULT_THRESHOLDS,
} from "@/lib/compliance/engine";
import { getWcagCriteria, getWcagFromTags, getWcagLevel } from "@/lib/compliance/wcagMapping";

describe("determineStatus", () => {
  it("returns pass for score >= 80", () => {
    expect(determineStatus(80)).toBe("pass");
    expect(determineStatus(100)).toBe("pass");
    expect(determineStatus(95)).toBe("pass");
  });

  it("returns partial for score >= 50 and < 80", () => {
    expect(determineStatus(50)).toBe("partial");
    expect(determineStatus(79)).toBe("partial");
    expect(determineStatus(65)).toBe("partial");
  });

  it("returns fail for score < 50", () => {
    expect(determineStatus(0)).toBe("fail");
    expect(determineStatus(49)).toBe("fail");
    expect(determineStatus(25)).toBe("fail");
  });

  it("respects custom thresholds", () => {
    const custom = { passScore: 90, partialScore: 70 };
    expect(determineStatus(90, custom)).toBe("pass");
    expect(determineStatus(80, custom)).toBe("partial");
    expect(determineStatus(60, custom)).toBe("fail");
  });
});

describe("evaluateCompliance", () => {
  it("returns pass for pages with no issues", () => {
    const result = evaluateCompliance([
      { url: "https://example.com", issues: [] },
    ]);
    expect(result.score).toBe(100);
    expect(result.status).toBe("pass");
    expect(result.hash).toMatch(/^sha256:/);
    expect(result.generatedAt).toBeTruthy();
  });

  it("returns fail for pages with many critical issues", () => {
    const result = evaluateCompliance([
      {
        url: "https://example.com",
        issues: [
          {
            ruleId: "image-alt",
            impact: "critical",
            nodes: [{}, {}, {}, {}, {}, {}, {}, {}, {}, {}], // 10 nodes × 10 = 100 penalty
          },
        ],
      },
    ]);
    expect(result.score).toBe(0);
    expect(result.status).toBe("fail");
  });

  it("includes WCAG summary", () => {
    const result = evaluateCompliance([
      {
        url: "https://example.com",
        issues: [
          {
            ruleId: "image-alt",
            impact: "serious",
            wcagTags: ["wcag2a", "wcag111"],
            nodes: [{}],
          },
          {
            ruleId: "color-contrast",
            impact: "serious",
            wcagTags: ["wcag2aa", "wcag143"],
            nodes: [{}, {}],
          },
        ],
      },
    ]);
    expect(result.wcagSummary.criteriaViolated.length).toBeGreaterThan(0);
    expect(result.wcagSummary.topRules.length).toBe(2);
    expect(result.wcagSummary.topRules[0].count).toBeGreaterThanOrEqual(1);
  });

  it("includes methodology in result", () => {
    const result = evaluateCompliance([
      { url: "https://example.com", issues: [] },
    ]);
    expect(result.methodology.version).toBe("1.0");
    expect(result.thresholds).toEqual(DEFAULT_THRESHOLDS);
  });

  it("generates unique hash for different results", () => {
    const r1 = evaluateCompliance([{ url: "https://a.com", issues: [] }]);
    const r2 = evaluateCompliance([
      {
        url: "https://b.com",
        issues: [{ ruleId: "x", impact: "critical", nodes: [{}] }],
      },
    ]);
    expect(r1.hash).not.toBe(r2.hash);
  });
});

describe("getWcagCriteria", () => {
  it("maps image-alt to WCAG 1.1.1", () => {
    const criteria = getWcagCriteria("image-alt");
    expect(criteria.length).toBeGreaterThan(0);
    expect(criteria[0].sc).toBe("1.1.1");
    expect(criteria[0].level).toBe("A");
    expect(criteria[0].principle).toBe("Perceivable");
  });

  it("maps color-contrast to WCAG 1.4.3", () => {
    const criteria = getWcagCriteria("color-contrast");
    expect(criteria[0].sc).toBe("1.4.3");
    expect(criteria[0].level).toBe("AA");
  });

  it("returns empty array for unknown rules", () => {
    expect(getWcagCriteria("nonexistent-rule")).toEqual([]);
  });
});

describe("getWcagFromTags", () => {
  it("extracts SC numbers from axe tags", () => {
    const result = getWcagFromTags(["wcag2a", "wcag111", "wcag143"]);
    expect(result).toContain("1.1.1");
    expect(result).toContain("1.4.3");
  });

  it("ignores non-SC tags", () => {
    const result = getWcagFromTags(["wcag2a", "wcag2aa", "best-practice"]);
    expect(result).toEqual([]);
  });

  it("deduplicates", () => {
    const result = getWcagFromTags(["wcag111", "wcag111"]);
    expect(result).toEqual(["1.1.1"]);
  });
});

describe("getWcagLevel", () => {
  it("returns correct level for known rules", () => {
    expect(getWcagLevel("image-alt")).toBe("A");
    expect(getWcagLevel("color-contrast")).toBe("AA");
    expect(getWcagLevel("color-contrast-enhanced")).toBe("AAA");
  });

  it("returns unknown for unmapped rules", () => {
    expect(getWcagLevel("nonexistent-rule")).toBe("unknown");
  });
});
