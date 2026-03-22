import { describe, it, expect } from "vitest";
import { generateCsv } from "@/lib/export/csv";
import type { WcagCsvInput } from "@/lib/export/csv";

describe("generateCsv", () => {
  it("generates header row with correct columns", () => {
    const csv = generateCsv({ criteriaViolated: [], topRules: [], totalPages: 0 });
    const lines = csv.split("\n");
    expect(lines[0]).toBe("SC,Criterion Name,Level,Status,Notes,Issue Description");
  });

  it("generates rows for all 50 WCAG 2.1 A+AA criteria", () => {
    const csv = generateCsv({ criteriaViolated: [], topRules: [], totalPages: 1 });
    const lines = csv.split("\n");
    // header + 50 criteria rows
    expect(lines.length).toBe(51);
  });

  it("marks violated criteria as Fail", () => {
    const csv = generateCsv({
      criteriaViolated: ["1.1.1"],
      topRules: [
        { ruleId: "image-alt", wcag: ["1.1.1"], pagesFailedOn: 5, description: "Images must have alt text" },
      ],
      totalPages: 10,
    });
    const lines = csv.split("\n");
    const row111 = lines.find((l) => l.startsWith("1.1.1,"));
    expect(row111).toBeTruthy();
    expect(row111).toContain("Fail");
    expect(row111).toContain("image-alt");
    expect(row111).toContain("5/10 pages");
  });

  it("marks non-violated criteria as Pass", () => {
    const csv = generateCsv({
      criteriaViolated: ["1.1.1"],
      topRules: [],
      totalPages: 10,
    });
    const lines = csv.split("\n");
    // 1.4.3 (Contrast) is not violated
    const row143 = lines.find((l) => l.startsWith("1.4.3,"));
    expect(row143).toBeTruthy();
    expect(row143).toContain("Pass");
  });

  it("maps multiple rules to the same SC", () => {
    const csv = generateCsv({
      criteriaViolated: ["1.1.1"],
      topRules: [
        { ruleId: "image-alt", wcag: ["1.1.1"], pagesFailedOn: 3, description: "Alt text missing" },
        { ruleId: "input-image-alt", wcag: ["1.1.1"], pagesFailedOn: 1, description: "Input image needs alt" },
      ],
      totalPages: 10,
    });
    const lines = csv.split("\n");
    const row111 = lines.find((l) => l.startsWith("1.1.1,"));
    expect(row111).toContain("image-alt");
    expect(row111).toContain("input-image-alt");
  });

  it("escapes commas and quotes in CSV values", () => {
    const csv = generateCsv({
      criteriaViolated: ["1.1.1"],
      topRules: [
        { ruleId: "test-rule", wcag: ["1.1.1"], pagesFailedOn: 1, description: 'Has "quotes" and, commas' },
      ],
      totalPages: 5,
    });
    expect(csv).toContain('"Has ""quotes"" and, commas"');
  });

  it("handles empty topRules for violated criteria gracefully", () => {
    const csv = generateCsv({
      criteriaViolated: ["2.4.1"],
      topRules: [],
      totalPages: 10,
    });
    const lines = csv.split("\n");
    const row241 = lines.find((l) => l.startsWith("2.4.1,"));
    expect(row241).toContain("Fail");
  });

  it("handles zero totalPages without division errors", () => {
    const csv = generateCsv({
      criteriaViolated: ["1.1.1"],
      topRules: [
        { ruleId: "image-alt", wcag: ["1.1.1"], pagesFailedOn: 0, description: "Alt text" },
      ],
      totalPages: 0,
    });
    const lines = csv.split("\n");
    expect(lines.length).toBe(51);
    const row111 = lines.find((l) => l.startsWith("1.1.1,"));
    expect(row111).toContain("Fail");
  });
});
