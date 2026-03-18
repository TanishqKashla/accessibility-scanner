import { describe, it, expect } from "vitest";
import {
  calculatePageScore,
  calculateSiteScore,
  getMethodology,
  IMPACT_WEIGHTS,
} from "@/lib/compliance/scoring";

describe("IMPACT_WEIGHTS", () => {
  it("has correct weights", () => {
    expect(IMPACT_WEIGHTS.critical).toBe(10);
    expect(IMPACT_WEIGHTS.serious).toBe(7);
    expect(IMPACT_WEIGHTS.moderate).toBe(4);
    expect(IMPACT_WEIGHTS.minor).toBe(1);
  });
});

describe("calculatePageScore", () => {
  it("returns 100 for a page with no issues", () => {
    const result = calculatePageScore("https://example.com", []);
    expect(result.score).toBe(100);
    expect(result.totalIssues).toBe(0);
    expect(result.penalty).toBe(0);
  });

  it("deducts 10 per critical node", () => {
    const result = calculatePageScore("https://example.com", [
      { impact: "critical", nodeCount: 2 },
    ]);
    expect(result.score).toBe(80); // 100 - 2*10
    expect(result.totalIssues).toBe(2);
  });

  it("deducts 7 per serious node", () => {
    const result = calculatePageScore("https://example.com", [
      { impact: "serious", nodeCount: 3 },
    ]);
    expect(result.score).toBe(79); // 100 - 3*7 = 79
  });

  it("deducts 4 per moderate node", () => {
    const result = calculatePageScore("https://example.com", [
      { impact: "moderate", nodeCount: 5 },
    ]);
    expect(result.score).toBe(80); // 100 - 5*4 = 80
  });

  it("deducts 1 per minor node", () => {
    const result = calculatePageScore("https://example.com", [
      { impact: "minor", nodeCount: 10 },
    ]);
    expect(result.score).toBe(90); // 100 - 10*1 = 90
  });

  it("clamps score to minimum 0", () => {
    const result = calculatePageScore("https://example.com", [
      { impact: "critical", nodeCount: 20 },
    ]);
    expect(result.score).toBe(0); // 100 - 200 = -100 → 0
  });

  it("handles mixed impacts", () => {
    const result = calculatePageScore("https://example.com", [
      { impact: "critical", nodeCount: 1 },  // 10
      { impact: "serious", nodeCount: 2 },   // 14
      { impact: "moderate", nodeCount: 3 },   // 12
      { impact: "minor", nodeCount: 4 },      // 4
    ]);
    expect(result.score).toBe(60); // 100 - 40 = 60
    expect(result.totalIssues).toBe(10);
    expect(result.issuesByImpact.critical).toBe(1);
    expect(result.issuesByImpact.serious).toBe(2);
    expect(result.issuesByImpact.moderate).toBe(3);
    expect(result.issuesByImpact.minor).toBe(4);
  });
});

describe("calculateSiteScore", () => {
  it("returns 100 for no pages", () => {
    const result = calculateSiteScore([]);
    expect(result.score).toBe(100);
    expect(result.pagesScanned).toBe(0);
  });

  it("averages page scores", () => {
    const page1 = calculatePageScore("https://example.com/a", [
      { impact: "critical", nodeCount: 1 }, // score = 90
    ]);
    const page2 = calculatePageScore("https://example.com/b", [
      { impact: "critical", nodeCount: 5 }, // score = 50
    ]);
    const result = calculateSiteScore([page1, page2]);
    expect(result.score).toBe(70); // (90 + 50) / 2 = 70
    expect(result.pagesScanned).toBe(2);
  });

  it("aggregates issues across pages", () => {
    const page1 = calculatePageScore("https://example.com/a", [
      { impact: "critical", nodeCount: 2 },
    ]);
    const page2 = calculatePageScore("https://example.com/b", [
      { impact: "critical", nodeCount: 3 },
    ]);
    const result = calculateSiteScore([page1, page2]);
    expect(result.issuesByImpact.critical).toBe(5);
    expect(result.totalIssues).toBe(5);
  });
});

describe("getMethodology", () => {
  it("returns versioned methodology", () => {
    const m = getMethodology();
    expect(m.version).toBe("1.0");
    expect(m.formula).toContain("node_count");
    expect(m.weights.critical).toBe(10);
  });
});
