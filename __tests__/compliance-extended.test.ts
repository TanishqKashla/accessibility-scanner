import { describe, it, expect } from "vitest";
import {
  evaluateCompliance,
  determineStatus,
  DEFAULT_THRESHOLDS,
} from "@/lib/compliance/engine";

describe("determineStatus edge cases", () => {
  it("returns pass for exactly passScore", () => {
    expect(determineStatus(80)).toBe("pass");
  });

  it("returns partial for exactly partialScore", () => {
    expect(determineStatus(50)).toBe("partial");
  });

  it("returns fail for 0", () => {
    expect(determineStatus(0)).toBe("fail");
  });

  it("returns pass for 100", () => {
    expect(determineStatus(100)).toBe("pass");
  });

  it("handles fractional scores correctly", () => {
    expect(determineStatus(79.9)).toBe("partial");
    expect(determineStatus(80.0)).toBe("pass");
    expect(determineStatus(49.9)).toBe("fail");
    expect(determineStatus(50.0)).toBe("partial");
  });

  it("handles negative scores", () => {
    expect(determineStatus(-10)).toBe("fail");
  });
});

describe("evaluateCompliance multi-page scenarios", () => {
  it("averages scores across multiple pages", () => {
    const result = evaluateCompliance([
      { url: "https://example.com/a", issues: [] }, // score 100
      { url: "https://example.com/b", issues: [] }, // score 100
    ]);
    expect(result.score).toBe(100);
    expect(result.status).toBe("pass");
  });

  it("handles a mix of clean and heavily violated pages", () => {
    const result = evaluateCompliance([
      { url: "https://example.com/clean", issues: [] }, // score 100
      {
        url: "https://example.com/bad",
        issues: [
          // v2.0 log: penalty = 10 × log₂(21) ≈ 43.92 → score = 56
          { ruleId: "image-alt", impact: "critical", nodes: Array(20).fill({}) },
        ],
      },
    ]);
    // Average of 100 and 56 = 78 → partial
    expect(result.score).toBe(78);
    expect(result.status).toBe("partial");
  });

  it("handles empty pages array", () => {
    const result = evaluateCompliance([]);
    expect(result.score).toBe(100);
    expect(result.status).toBe("pass");
    expect(result.siteScore.pagesScanned).toBe(0);
  });

  it("handles single page with no issues", () => {
    const result = evaluateCompliance([
      { url: "https://example.com", issues: [] },
    ]);
    expect(result.score).toBe(100);
    expect(result.wcagSummary.criteriaViolated).toHaveLength(0);
  });
});

describe("evaluateCompliance WCAG summary", () => {
  it("populates criteriaViolated from mapped rules", () => {
    const result = evaluateCompliance([
      {
        url: "https://example.com",
        issues: [
          { ruleId: "image-alt", impact: "serious", nodes: [{}] },
          { ruleId: "color-contrast", impact: "serious", nodes: [{}] },
        ],
      },
    ]);
    expect(result.wcagSummary.criteriaViolated).toContain("1.1.1");
    expect(result.wcagSummary.criteriaViolated).toContain("1.4.3");
  });

  it("extracts criteria from wcagTags when mapping doesn't cover it", () => {
    const result = evaluateCompliance([
      {
        url: "https://example.com",
        issues: [
          { ruleId: "custom-rule", impact: "minor", wcagTags: ["wcag111"], nodes: [{}] },
        ],
      },
    ]);
    expect(result.wcagSummary.criteriaViolated).toContain("1.1.1");
  });

  it("counts by principle correctly", () => {
    const result = evaluateCompliance([
      {
        url: "https://example.com",
        issues: [
          { ruleId: "image-alt", impact: "serious", nodes: [{}, {}] }, // Perceivable
          { ruleId: "bypass", impact: "moderate", nodes: [{}] },       // Operable
        ],
      },
    ]);
    expect(result.wcagSummary.byPrinciple.Perceivable).toBe(2);
    expect(result.wcagSummary.byPrinciple.Operable).toBe(1);
  });

  it("topRules sorted by count descending", () => {
    const result = evaluateCompliance([
      {
        url: "https://example.com",
        issues: [
          { ruleId: "image-alt", impact: "serious", nodes: [{}, {}, {}] },   // 3
          { ruleId: "color-contrast", impact: "serious", nodes: Array(10).fill({}) }, // 10
          { ruleId: "button-name", impact: "moderate", nodes: [{}] },        // 1
        ],
      },
    ]);
    const top = result.wcagSummary.topRules;
    expect(top[0].ruleId).toBe("color-contrast");
    expect(top[0].count).toBe(10);
    expect(top[1].ruleId).toBe("image-alt");
    expect(top[1].count).toBe(3);
    expect(top[2].ruleId).toBe("button-name");
    expect(top[2].count).toBe(1);
  });

  it("limits topRules to 20 entries", () => {
    const issues = Array.from({ length: 25 }, (_, i) => ({
      ruleId: `rule-${i}`,
      impact: "minor",
      nodes: [{}],
    }));
    const result = evaluateCompliance([{ url: "https://example.com", issues }]);
    expect(result.wcagSummary.topRules.length).toBeLessThanOrEqual(20);
  });
});

describe("evaluateCompliance custom thresholds", () => {
  it("uses custom thresholds for status determination", () => {
    const strict = { passScore: 95, partialScore: 80 };
    const result = evaluateCompliance(
      [{ url: "https://example.com", issues: [] }],
      strict
    );
    expect(result.score).toBe(100);
    expect(result.status).toBe("pass");
    expect(result.thresholds).toEqual(strict);
  });

  it("fails with strict thresholds on minor issues", () => {
    const strict = { passScore: 95, partialScore: 80 };
    const result = evaluateCompliance(
      [{
        url: "https://example.com",
        issues: [
          { ruleId: "image-alt", impact: "critical", nodes: [{}, {}] }, // ~80 score
        ],
      }],
      strict
    );
    expect(result.status).toBe("partial");
  });
});

describe("evaluateCompliance hash integrity", () => {
  it("generates sha256 prefixed hash", () => {
    const result = evaluateCompliance([{ url: "https://example.com", issues: [] }]);
    expect(result.hash).toMatch(/^sha256:[a-f0-9]{64}$/);
  });

  it("produces same hash for same input (deterministic)", () => {
    const pages = [{ url: "https://example.com", issues: [] }];
    const r1 = evaluateCompliance(pages);
    const r2 = evaluateCompliance(pages);
    expect(r1.hash).toBe(r2.hash);
  });

  it("produces different hash for different input", () => {
    const r1 = evaluateCompliance([{ url: "https://a.com", issues: [] }]);
    const r2 = evaluateCompliance([
      {
        url: "https://b.com",
        issues: [{ ruleId: "image-alt", impact: "critical", nodes: [{}] }],
      },
    ]);
    expect(r1.hash).not.toBe(r2.hash);
  });
});

describe("evaluateCompliance includes methodology", () => {
  it("has methodology version", () => {
    const result = evaluateCompliance([{ url: "https://example.com", issues: [] }]);
    expect(result.methodology.version).toBeTruthy();
  });

  it("includes default thresholds when none specified", () => {
    const result = evaluateCompliance([{ url: "https://example.com", issues: [] }]);
    expect(result.thresholds).toEqual(DEFAULT_THRESHOLDS);
  });

  it("includes generatedAt timestamp", () => {
    const result = evaluateCompliance([{ url: "https://example.com", issues: [] }]);
    expect(result.generatedAt).toBeTruthy();
    expect(new Date(result.generatedAt).toISOString()).toBe(result.generatedAt);
  });
});

describe("evaluateCompliance issues without nodes default to 1", () => {
  it("treats missing nodes array as 1 node", () => {
    const result = evaluateCompliance([
      {
        url: "https://example.com",
        issues: [
          { ruleId: "image-alt", impact: "critical" }, // no nodes field
        ],
      },
    ]);
    expect(result.siteScore.totalIssues).toBe(1);
  });

  it("treats empty nodes array as 1 node", () => {
    const result = evaluateCompliance([
      {
        url: "https://example.com",
        issues: [
          { ruleId: "image-alt", impact: "critical", nodes: [] }, // empty nodes
        ],
      },
    ]);
    // || 1 means empty array length (0) falls back to 1
    expect(result.siteScore.totalIssues).toBe(1);
  });
});
