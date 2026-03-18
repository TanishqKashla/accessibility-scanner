/**
 * Excel export generator — styled WCAG 2.1 conformance matrix.
 * Uses ExcelJS for cell formatting, merged cells, borders and colours.
 */

import ExcelJS from "exceljs";

// ─── Colours ────────────────────────────────────────────────────────────────
const COLOUR = {
  darkPurple:  "3D1A78",
  teal:        "008080",
  white:       "FFFFFF",
  black:       "000000",
  darkGray:    "444444",
  passGreen:   "C6EFCE",
  failRed:     "FFC7CE",
  reviewBlue:  "BDD7EE",
  notTestedGray: "EDEDED",
};

// ─── Column definitions ──────────────────────────────────────────────────────
const COLUMNS: Array<{ header: string; key: string; width: number; alignment: ExcelJS.Alignment }> = [
  { header: "SC",                key: "sc",          width: 8,   alignment: { horizontal: "center", vertical: "middle" } },
  { header: "Criterion Name",    key: "name",        width: 42,  alignment: { horizontal: "left",   vertical: "middle" } },
  { header: "Level",             key: "level",       width: 8,   alignment: { horizontal: "center", vertical: "middle" } },
  { header: "Status",            key: "status",      width: 14,  alignment: { horizontal: "center", vertical: "middle" } },
  { header: "Notes",             key: "notes",       width: 46,  alignment: { horizontal: "left",   vertical: "middle" } },
  { header: "Issue Description", key: "description", width: 58,  alignment: { horizontal: "left",   vertical: "middle" } },
];

const LAST_COL = COLUMNS.length; // 6 = column F

const DISCLAIMER =
  "This report is generated through an automated accessibility evaluation process based on " +
  "WCAG 2.1 guidelines. While efforts have been made to ensure accuracy, automated tools may " +
  "not detect all accessibility issues. Manual testing and expert review are recommended to " +
  "achieve full compliance. This report is provided for informational purposes only and does " +
  "not constitute legal certification or guarantee of compliance.";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function solidFill(hex: string): ExcelJS.Fill {
  return { type: "pattern", pattern: "solid", fgColor: { argb: `FF${hex}` } };
}

function thinBorder(): Partial<ExcelJS.Borders> {
  const side: ExcelJS.BorderStyle = "thin";
  return { top: { style: side }, bottom: { style: side }, left: { style: side }, right: { style: side } };
}

function applyHeaderStyle(
  cell: ExcelJS.Cell,
  bgHex: string,
  bold = false,
  size = 11
) {
  cell.fill  = solidFill(bgHex);
  cell.font  = { color: { argb: `FF${COLOUR.white}` }, bold, size };
  cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
}

// ─── Public interface ─────────────────────────────────────────────────────────

export interface ExcelCsvRule {
  ruleId: string;
  wcag: string[];
  pagesFailedOn: number;
  description: string;
}

export interface ExcelCsvInput {
  criteriaViolated: string[];
  topRules: ExcelCsvRule[];
  totalPages: number;
  targetUrl: string;
  scanDate: string; // ISO date string
}

// ─── Complete WCAG 2.1 Level A + AA criteria ─────────────────────────────────
const WCAG_21_CRITERIA: Array<{ sc: string; name: string; level: "A" | "AA" }> = [
  { sc: "1.1.1",  name: "Non-text Content",                                    level: "A"  },
  { sc: "1.2.1",  name: "Audio-only and Video-only (Prerecorded)",              level: "A"  },
  { sc: "1.2.2",  name: "Captions (Prerecorded)",                               level: "A"  },
  { sc: "1.2.3",  name: "Audio Description or Media Alternative (Prerecorded)", level: "A"  },
  { sc: "1.2.4",  name: "Captions (Live)",                                      level: "AA" },
  { sc: "1.2.5",  name: "Audio Description (Prerecorded)",                      level: "AA" },
  { sc: "1.3.1",  name: "Info and Relationships",                               level: "A"  },
  { sc: "1.3.2",  name: "Meaningful Sequence",                                  level: "A"  },
  { sc: "1.3.3",  name: "Sensory Characteristics",                              level: "A"  },
  { sc: "1.3.4",  name: "Orientation",                                          level: "AA" },
  { sc: "1.3.5",  name: "Identify Input Purpose",                               level: "AA" },
  { sc: "1.4.1",  name: "Use of Color",                                         level: "A"  },
  { sc: "1.4.2",  name: "Audio Control",                                        level: "A"  },
  { sc: "1.4.3",  name: "Contrast (Minimum)",                                   level: "AA" },
  { sc: "1.4.4",  name: "Resize Text",                                          level: "AA" },
  { sc: "1.4.5",  name: "Images of Text",                                       level: "AA" },
  { sc: "1.4.10", name: "Reflow",                                               level: "AA" },
  { sc: "1.4.11", name: "Non-text Contrast",                                    level: "AA" },
  { sc: "1.4.12", name: "Text Spacing",                                         level: "AA" },
  { sc: "1.4.13", name: "Content on Hover or Focus",                            level: "AA" },
  { sc: "2.1.1",  name: "Keyboard",                                             level: "A"  },
  { sc: "2.1.2",  name: "No Keyboard Trap",                                     level: "A"  },
  { sc: "2.1.4",  name: "Character Key Shortcuts",                              level: "A"  },
  { sc: "2.2.1",  name: "Timing Adjustable",                                    level: "A"  },
  { sc: "2.2.2",  name: "Pause, Stop, Hide",                                    level: "A"  },
  { sc: "2.3.1",  name: "Three Flashes or Below Threshold",                     level: "A"  },
  { sc: "2.4.1",  name: "Bypass Blocks",                                        level: "A"  },
  { sc: "2.4.2",  name: "Page Titled",                                          level: "A"  },
  { sc: "2.4.3",  name: "Focus Order",                                          level: "A"  },
  { sc: "2.4.4",  name: "Link Purpose (In Context)",                            level: "A"  },
  { sc: "2.4.5",  name: "Multiple Ways",                                        level: "AA" },
  { sc: "2.4.6",  name: "Headings and Labels",                                  level: "AA" },
  { sc: "2.4.7",  name: "Focus Visible",                                        level: "AA" },
  { sc: "2.5.1",  name: "Pointer Gestures",                                     level: "A"  },
  { sc: "2.5.2",  name: "Pointer Cancellation",                                 level: "A"  },
  { sc: "2.5.3",  name: "Label in Name",                                        level: "A"  },
  { sc: "2.5.4",  name: "Motion Actuation",                                     level: "A"  },
  { sc: "3.1.1",  name: "Language of Page",                                     level: "A"  },
  { sc: "3.1.2",  name: "Language of Parts",                                    level: "AA" },
  { sc: "3.2.1",  name: "On Focus",                                             level: "A"  },
  { sc: "3.2.2",  name: "On Input",                                             level: "A"  },
  { sc: "3.2.3",  name: "Consistent Navigation",                                level: "AA" },
  { sc: "3.2.4",  name: "Consistent Identification",                            level: "AA" },
  { sc: "3.3.1",  name: "Error Identification",                                 level: "A"  },
  { sc: "3.3.2",  name: "Labels or Instructions",                               level: "A"  },
  { sc: "3.3.3",  name: "Error Suggestion",                                     level: "AA" },
  { sc: "3.3.4",  name: "Error Prevention (Legal, Financial, Data)",            level: "AA" },
  { sc: "4.1.1",  name: "Parsing",                                              level: "A"  },
  { sc: "4.1.2",  name: "Name, Role, Value",                                    level: "A"  },
  { sc: "4.1.3",  name: "Status Messages",                                      level: "AA" },
];

/**
 * Build and return an ExcelJS Workbook buffer containing the styled
 * WCAG 2.1 AA Compliance Matrix.
 */
export async function generateExcel(input: ExcelCsvInput): Promise<Buffer> {
  const { criteriaViolated, topRules, totalPages, targetUrl, scanDate } = input;

  // ── Pre-process: SC → rules map ───────────────────────────────────────────
  const scToRules = new Map<string, ExcelCsvRule[]>();
  for (const rule of topRules) {
    for (const sc of rule.wcag) {
      const arr = scToRules.get(sc) ?? [];
      arr.push(rule);
      scToRules.set(sc, arr);
    }
  }
  const violatedSet = new Set(criteriaViolated);

  // Format date for header
  const dateStr = (() => {
    try {
      return new Date(scanDate).toLocaleDateString("en-GB", {
        day: "2-digit", month: "long", year: "numeric",
      });
    } catch {
      return scanDate;
    }
  })();

  // ── Workbook / sheet setup ────────────────────────────────────────────────
  const wb = new ExcelJS.Workbook();
  wb.creator = "Enable User";
  wb.created = new Date();

  const ws = wb.addWorksheet("WCAG 2.1 Compliance", {
    pageSetup: { paperSize: 9, orientation: "landscape", fitToPage: true, fitToWidth: 1 },
    views: [{ state: "frozen", xSplit: 0, ySplit: 3 }], // freeze header rows
  });

  // Set column widths (must be done before adding rows)
  ws.columns = COLUMNS.map((c) => ({ key: c.key, width: c.width }));

  // ── Row 1: Title ──────────────────────────────────────────────────────────
  const titleRow = ws.addRow([`WCAG 2.1 AA Compliance Matrix - ${targetUrl}`]);
  titleRow.height = 28;
  ws.mergeCells(1, 1, 1, LAST_COL);
  applyHeaderStyle(titleRow.getCell(1), COLOUR.darkPurple, true, 13);

  // ── Row 2: Subtitle ───────────────────────────────────────────────────────
  const subRow = ws.addRow([`${dateStr} | Prepared by Enable User`]);
  subRow.height = 20;
  ws.mergeCells(2, 1, 2, LAST_COL);
  applyHeaderStyle(subRow.getCell(1), COLOUR.teal, false, 10);

  // ── Row 3: Column headers ─────────────────────────────────────────────────
  const headerRow = ws.addRow(COLUMNS.map((c) => c.header));
  headerRow.height = 20;
  headerRow.eachCell((cell) => {
    cell.fill      = solidFill(COLOUR.darkPurple);
    cell.font      = { color: { argb: `FF${COLOUR.white}` }, bold: true, size: 10 };
    cell.alignment = { horizontal: "center", vertical: "middle" };
    cell.border    = thinBorder();
  });

  // ── Rows 4+: Data ─────────────────────────────────────────────────────────
  for (const criterion of WCAG_21_CRITERIA) {
    const failed = violatedSet.has(criterion.sc);
    const status = failed ? "Fail" : "Pass";

    let notes = "";
    let issueDescription = "";

    if (failed) {
      const rules = scToRules.get(criterion.sc) ?? [];
      notes = rules
        .map((r) => `${r.ruleId} (failed on ${r.pagesFailedOn}/${totalPages} pages)`)
        .join("\n");
      issueDescription = rules
        .map((r) => r.description)
        .filter(Boolean)
        .join("\n");
    }

    const lineCount = Math.max(
      notes.split("\n").length,
      issueDescription.split("\n").length,
      1
    );
    const dataRow = ws.addRow([criterion.sc, criterion.name, criterion.level, status, notes, issueDescription]);
    dataRow.height = lineCount > 1 ? 14 * (lineCount + 1) : 18;

    // Apply column-level alignment and borders to every data cell
    COLUMNS.forEach((col, i) => {
      const cell = dataRow.getCell(i + 1);
      cell.alignment = { ...col.alignment, wrapText: true };
      cell.border    = thinBorder();
      cell.font      = { color: { argb: `FF${COLOUR.black}` }, size: 10 };
      cell.fill      = solidFill(COLOUR.white);
    });

    // Status cell colour override (column 4)
    const statusCell = dataRow.getCell(4);
    const statusColour =
      status === "Pass"          ? COLOUR.passGreen   :
      status === "Fail"          ? COLOUR.failRed     :
      status === "Needs Review"  ? COLOUR.reviewBlue  :
      COLOUR.notTestedGray;
    statusCell.fill = solidFill(statusColour);
    statusCell.font = { bold: true, size: 10, color: { argb: `FF${COLOUR.black}` } };
  }

  // ── Empty spacer row ──────────────────────────────────────────────────────
  ws.addRow([]);

  // ── Footer / Disclaimer ───────────────────────────────────────────────────
  const lastDataRowNum = ws.rowCount;
  const footerRow = ws.addRow([DISCLAIMER]);
  footerRow.height = 72;
  ws.mergeCells(lastDataRowNum + 1, 1, lastDataRowNum + 1, LAST_COL);
  const footerCell = footerRow.getCell(1);
  footerCell.font      = { size: 8, color: { argb: `FF${COLOUR.darkGray}` } };
  footerCell.alignment = { horizontal: "left", vertical: "top", wrapText: true };

  // ── Serialise to buffer ───────────────────────────────────────────────────
  const arrayBuffer = await wb.xlsx.writeBuffer();
  return Buffer.from(arrayBuffer);
}
