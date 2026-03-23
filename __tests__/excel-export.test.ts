import { describe, it, expect } from "vitest";
import { generateExcel } from "@/lib/export/excel";
import type { ExcelCsvInput } from "@/lib/export/excel";
import ExcelJS from "exceljs";

async function parseExcel(buffer: Buffer) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);
  return workbook;
}

const baseInput: ExcelCsvInput = {
  criteriaViolated: [],
  topRules: [],
  totalPages: 10,
  targetUrl: "https://example.com",
  scanDate: "2026-01-15T10:00:00.000Z",
};

describe("generateExcel", () => {
  it("returns a Buffer", async () => {
    const result = await generateExcel(baseInput);
    expect(Buffer.isBuffer(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
  });

  it("creates a valid XLSX workbook", async () => {
    const buffer = await generateExcel(baseInput);
    const wb = await parseExcel(buffer);
    expect(wb.worksheets.length).toBeGreaterThanOrEqual(1);
  });

  it("contains the WCAG 2.1 Compliance sheet", async () => {
    const buffer = await generateExcel(baseInput);
    const wb = await parseExcel(buffer);
    const sheet = wb.getWorksheet("WCAG 2.1 Compliance");
    expect(sheet).toBeTruthy();
  });

  it("has all 49 WCAG criteria rows plus header rows", async () => {
    const buffer = await generateExcel(baseInput);
    const wb = await parseExcel(buffer);
    const sheet = wb.getWorksheet("WCAG 2.1 Compliance")!;
    // Row 1: title, Row 2: subtitle, Row 3: column headers, Rows 4-52: 49 criteria, then disclaimer
    // At minimum, rows should be > 49 + 3 headers
    expect(sheet.rowCount).toBeGreaterThanOrEqual(52);
  });

  it("marks violated criteria as Fail", async () => {
    const input: ExcelCsvInput = {
      ...baseInput,
      criteriaViolated: ["1.1.1"],
      topRules: [
        { ruleId: "image-alt", wcag: ["1.1.1"], pagesFailedOn: 5, description: "Images need alt text" },
      ],
    };
    const buffer = await generateExcel(input);
    const wb = await parseExcel(buffer);
    const sheet = wb.getWorksheet("WCAG 2.1 Compliance")!;

    // Find the row with SC = 1.1.1 (should be row 4, the first data row)
    let foundFail = false;
    sheet.eachRow((row) => {
      const scCell = row.getCell(1).value;
      const statusCell = row.getCell(4).value;
      if (scCell === "1.1.1" && statusCell === "Fail") {
        foundFail = true;
      }
    });
    expect(foundFail).toBe(true);
  });

  it("marks non-violated criteria as Pass", async () => {
    const buffer = await generateExcel(baseInput);
    const wb = await parseExcel(buffer);
    const sheet = wb.getWorksheet("WCAG 2.1 Compliance")!;

    let foundPass = false;
    sheet.eachRow((row) => {
      const scCell = row.getCell(1).value;
      const statusCell = row.getCell(4).value;
      if (scCell === "1.1.1" && statusCell === "Pass") {
        foundPass = true;
      }
    });
    expect(foundPass).toBe(true);
  });

  it("handles multiple violated criteria", async () => {
    const input: ExcelCsvInput = {
      ...baseInput,
      criteriaViolated: ["1.1.1", "1.4.3", "2.4.2"],
      topRules: [
        { ruleId: "image-alt", wcag: ["1.1.1"], pagesFailedOn: 3, description: "Alt text" },
        { ruleId: "color-contrast", wcag: ["1.4.3"], pagesFailedOn: 7, description: "Contrast" },
        { ruleId: "document-title", wcag: ["2.4.2"], pagesFailedOn: 1, description: "Title" },
      ],
    };
    const buffer = await generateExcel(input);
    const wb = await parseExcel(buffer);
    const sheet = wb.getWorksheet("WCAG 2.1 Compliance")!;

    const failSCs: string[] = [];
    sheet.eachRow((row) => {
      if (row.getCell(4).value === "Fail") {
        failSCs.push(String(row.getCell(1).value));
      }
    });
    expect(failSCs).toContain("1.1.1");
    expect(failSCs).toContain("1.4.3");
    expect(failSCs).toContain("2.4.2");
  });
});
