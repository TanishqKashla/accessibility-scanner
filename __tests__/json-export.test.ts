import { describe, it, expect } from "vitest";
import { generateJsonExport } from "@/lib/export/json";

const baseScan = {
  _id: "scan123",
  targetUrl: "https://example.com",
  config: { depth: 3, maxPages: 100 },
  toolVersions: { axe: "4.11.1", playwright: "1.58.2" },
  createdAt: "2026-01-15T10:00:00.000Z",
};

const baseReport = {
  score: 85,
  status: "pass",
  breakdown: { pagesScanned: 5 },
  hash: "sha256:abc123",
};

describe("generateJsonExport", () => {
  it("returns valid JSON string", () => {
    const result = generateJsonExport({ scan: baseScan, report: baseReport, pages: [] });
    expect(() => JSON.parse(result)).not.toThrow();
  });

  it("includes exportVersion and exportedAt", () => {
    const result = JSON.parse(generateJsonExport({ scan: baseScan, report: baseReport, pages: [] }));
    expect(result.exportVersion).toBe("1.0");
    expect(result.exportedAt).toBeTruthy();
    // Should be a valid ISO date
    expect(new Date(result.exportedAt).toISOString()).toBe(result.exportedAt);
  });

  it("maps scan fields correctly", () => {
    const result = JSON.parse(generateJsonExport({ scan: baseScan, report: baseReport, pages: [] }));
    expect(result.scan.id).toBe("scan123");
    expect(result.scan.targetUrl).toBe("https://example.com");
    expect(result.scan.config.depth).toBe(3);
    expect(result.scan.toolVersions.axe).toBe("4.11.1");
    expect(result.scan.createdAt).toBe("2026-01-15T10:00:00.000Z");
  });

  it("maps report fields correctly", () => {
    const result = JSON.parse(generateJsonExport({ scan: baseScan, report: baseReport, pages: [] }));
    expect(result.report.score).toBe(85);
    expect(result.report.status).toBe("pass");
    expect(result.report.hash).toBe("sha256:abc123");
  });

  it("computes meta totals correctly", () => {
    const pages = [
      { url: "https://example.com/a", normalizedUrl: "https://example.com/a", issues: [{ ruleId: "x" }, { ruleId: "y" }] },
      { url: "https://example.com/b", normalizedUrl: "https://example.com/b", issues: [{ ruleId: "z" }] },
    ];
    const result = JSON.parse(generateJsonExport({ scan: baseScan, report: baseReport, pages }));
    expect(result.meta.totalPages).toBe(2);
    expect(result.meta.totalIssues).toBe(3);
  });

  it("includes issueCount per page", () => {
    const pages = [
      { url: "https://example.com/a", normalizedUrl: "https://example.com/a", issues: [{ ruleId: "x" }] },
    ];
    const result = JSON.parse(generateJsonExport({ scan: baseScan, report: baseReport, pages }));
    expect(result.pages[0].issueCount).toBe(1);
  });

  it("includes axeRaw only when present", () => {
    const withRaw = [
      { url: "https://example.com/a", normalizedUrl: "a", issues: [], axeRaw: { data: true } },
    ];
    const withoutRaw = [
      { url: "https://example.com/b", normalizedUrl: "b", issues: [] },
    ];

    const resultWith = JSON.parse(generateJsonExport({ scan: baseScan, report: baseReport, pages: withRaw }));
    const resultWithout = JSON.parse(generateJsonExport({ scan: baseScan, report: baseReport, pages: withoutRaw }));

    expect(resultWith.pages[0].axeRaw).toEqual({ data: true });
    expect(resultWithout.pages[0].axeRaw).toBeUndefined();
  });

  it("handles empty pages array", () => {
    const result = JSON.parse(generateJsonExport({ scan: baseScan, report: baseReport, pages: [] }));
    expect(result.pages).toEqual([]);
    expect(result.meta.totalPages).toBe(0);
    expect(result.meta.totalIssues).toBe(0);
  });

  it("defaults toolVersions to empty object when missing", () => {
    const scanNoTools = { ...baseScan, toolVersions: undefined };
    const result = JSON.parse(generateJsonExport({ scan: scanNoTools, report: baseReport, pages: [] }));
    expect(result.scan.toolVersions).toEqual({});
  });

  it("preserves page depth when present", () => {
    const pages = [
      { url: "https://example.com/deep", normalizedUrl: "https://example.com/deep", depth: 3, issues: [] },
    ];
    const result = JSON.parse(generateJsonExport({ scan: baseScan, report: baseReport, pages }));
    expect(result.pages[0].depth).toBe(3);
  });
});
