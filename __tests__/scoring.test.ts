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

  // v2.0 logarithmic: penalty = weight × log₂(nodeCount + 1)
  // critical(10) × log₂(2+1) = 10 × 1.585 = 15.85 → score = round(84.15) = 84
  it("applies logarithmic penalty for critical nodes", () => {
    const result = calculatePageScore("https://example.com", [
      { impact: "critical", nodeCount: 2 },
    ]);
    expect(result.score).toBe(84);
    expect(result.totalIssues).toBe(2);
  });

  // serious(7) × log₂(3+1) = 7 × 2 = 14 → score = round(86) = 86
  it("applies logarithmic penalty for serious nodes", () => {
    const result = calculatePageScore("https://example.com", [
      { impact: "serious", nodeCount: 3 },
    ]);
    expect(result.score).toBe(86);
  });

  // moderate(4) × log₂(5+1) = 4 × 2.585 = 10.34 → score = round(89.66) = 90
  it("applies logarithmic penalty for moderate nodes", () => {
    const result = calculatePageScore("https://example.com", [
      { impact: "moderate", nodeCount: 5 },
    ]);
    expect(result.score).toBe(90);
  });

  // minor(1) × log₂(10+1) = 1 × 3.459 = 3.459 → score = round(96.54) = 97
  it("applies logarithmic penalty for minor nodes", () => {
    const result = calculatePageScore("https://example.com", [
      { impact: "minor", nodeCount: 10 },
    ]);
    expect(result.score).toBe(97);
  });

  // critical(10) × log₂(20+1) = 10 × 4.392 = 43.92 → score = round(56.08) = 56
  it("logarithmic scale prevents extreme penalties", () => {
    const result = calculatePageScore("https://example.com", [
      { impact: "critical", nodeCount: 20 },
    ]);
    expect(result.score).toBe(56);
    expect(result.score).toBeGreaterThan(0);
  });

  it("clamps score to minimum 0 for extreme violations", () => {
    // 100 critical nodes: penalty = 10 × log₂(101) = 10 × 6.658 = 66.58
    // Still above 0. Need much more to get to 0.
    // Multiple rules: 5 critical rules × 1000 nodes each → 5 × 10 × 9.97 = 498 → 0
    const result = calculatePageScore("https://example.com", [
      { impact: "critical", nodeCount: 1000 },
      { impact: "critical", nodeCount: 1000 },
      { impact: "critical", nodeCount: 1000 },
    ]);
    expect(result.score).toBe(0);
  });

  it("handles mixed impacts with logarithmic scoring", () => {
    const result = calculatePageScore("https://example.com", [
      { impact: "critical", nodeCount: 1 },  // 10 × log₂(2) = 10
      { impact: "serious", nodeCount: 2 },   // 7 × log₂(3) = 11.095
      { impact: "moderate", nodeCount: 3 },   // 4 × log₂(4) = 8
      { impact: "minor", nodeCount: 4 },      // 1 × log₂(5) = 2.322
    ]);
    // total penalty ≈ 31.417 → score = round(68.58) = 69
    expect(result.score).toBe(69);
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
      { impact: "critical", nodeCount: 1 }, // penalty = 10 → score = 90
    ]);
    const page2 = calculatePageScore("https://example.com/b", [
      { impact: "critical", nodeCount: 5 }, // penalty = 10 × log₂(6) = 25.85 → score = 74
    ]);
    const result = calculateSiteScore([page1, page2]);
    expect(result.score).toBe(82); // round((90 + 74) / 2) = 82
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
    expect(m.version).toBe("2.0");
    expect(m.formula).toContain("log₂");
    expect(m.weights.critical).toBe(10);
  });
});
