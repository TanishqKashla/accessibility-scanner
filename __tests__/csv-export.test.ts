import { describe, it, expect } from "vitest";
import { generateCsv } from "@/lib/export/csv";

describe("generateCsv", () => {
  it("generates header row", () => {
    const csv = generateCsv([]);
    const lines = csv.split("\n");
    expect(lines[0]).toContain("Page URL");
    expect(lines[0]).toContain("Rule ID");
    expect(lines[0]).toContain("Impact");
    expect(lines[0]).toContain("WCAG Tags");
  });

  it("generates issue rows", () => {
    const csv = generateCsv([
      {
        url: "https://example.com",
        issues: [
          {
            ruleId: "image-alt",
            impact: "serious",
            description: "Images must have alt text",
            help: "Add alt attribute",
            helpUrl: "https://dequeuniversity.com/rules/axe/image-alt",
            wcagTags: ["wcag2a", "wcag111"],
            nodes: [
              {
                html: '<img src="photo.jpg">',
                target: ["img"],
                failureSummary: "Fix any of the following: missing alt",
              },
            ],
          },
        ],
      },
    ]);
    const lines = csv.split("\n");
    expect(lines.length).toBe(2); // header + 1 issue
    expect(lines[1]).toContain("https://example.com");
    expect(lines[1]).toContain("image-alt");
    expect(lines[1]).toContain("serious");
  });

  it("creates one row per node", () => {
    const csv = generateCsv([
      {
        url: "https://example.com",
        issues: [
          {
            ruleId: "image-alt",
            impact: "serious",
            nodes: [
              { html: "<img>", target: [".a"], failureSummary: "fix 1" },
              { html: "<img>", target: [".b"], failureSummary: "fix 2" },
              { html: "<img>", target: [".c"], failureSummary: "fix 3" },
            ],
          },
        ],
      },
    ]);
    const lines = csv.split("\n");
    expect(lines.length).toBe(4); // header + 3 nodes
  });

  it("escapes commas and quotes in CSV values", () => {
    const csv = generateCsv([
      {
        url: "https://example.com",
        issues: [
          {
            ruleId: "test",
            impact: "minor",
            description: 'Has "quotes" and, commas',
            nodes: [{ html: '<div class="test">', target: ["div"] }],
          },
        ],
      },
    ]);
    expect(csv).toContain('"Has ""quotes"" and, commas"');
  });

  it("handles missing optional fields gracefully", () => {
    const csv = generateCsv([
      {
        url: "https://example.com",
        issues: [
          {
            ruleId: "test",
            impact: "minor",
          },
        ],
      },
    ]);
    const lines = csv.split("\n");
    expect(lines.length).toBe(2);
    expect(lines[1]).toContain("test");
  });
});
