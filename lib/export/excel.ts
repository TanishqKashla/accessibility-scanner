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
const COLUMNS: Array<{ header: string; key: string; width: number; alignment: Partial<ExcelJS.Alignment> }> = [
  { header: "SC",                key: "sc",          width: 8,   alignment: { horizontal: "center", vertical: "middle" } },
  { header: "Criterion Name",    key: "name",        width: 42,  alignment: { horizontal: "left",   vertical: "middle" } },
  { header: "Level",             key: "level",       width: 8,   alignment: { horizontal: "center", vertical: "middle" } },
  { header: "Status",            key: "status",      width: 14,  alignment: { horizontal: "center", vertical: "middle" } },
  { header: "Notes",              key: "notes",       width: 56,  alignment: { horizontal: "left",   vertical: "middle" } },
  { header: "Issue Description",  key: "description", width: 58,  alignment: { horizontal: "left",   vertical: "middle" } },
  { header: "Why It's Important", key: "rationale",   width: 58,  alignment: { horizontal: "left",   vertical: "middle" } },
];

const LAST_COL = COLUMNS.length; // 7 = column G

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

// ─── WCAG 2.1 rationale map (SC → why it matters) ────────────────────────────
const WCAG_RATIONALE: Record<string, string> = {
  "1.1.1":  "Ensures screen reader users can understand images and visual elements via alt text.",
  "1.2.1":  "Provides alternatives so deaf or blind users can access media content.",
  "1.2.2":  "Allows deaf users to understand spoken content in videos.",
  "1.2.3":  "Helps blind users understand visual information in videos.",
  "1.2.4":  "Makes live video content accessible to deaf users in real time.",
  "1.2.5":  "Improves accessibility of visual-only content in videos.",
  "1.3.1":  "Ensures proper structure so assistive technologies can interpret content correctly.",
  "1.3.2":  "Maintains logical reading order for screen reader users.",
  "1.3.3":  "Prevents reliance on visual cues like color or position alone.",
  "1.3.4":  "Allows usage in both portrait and landscape for better accessibility.",
  "1.3.5":  "Helps autofill and assistive tools support users with cognitive disabilities.",
  "1.4.1":  "Ensures colorblind users don't miss important information.",
  "1.4.2":  "Prevents interference with screen readers from auto-playing audio.",
  "1.4.3":  "Improves readability for users with low vision.",
  "1.4.4":  "Allows users to enlarge text without breaking layout.",
  "1.4.5":  "Ensures text remains readable and accessible to assistive tools.",
  "1.4.10": "Prevents horizontal scrolling for users with low vision.",
  "1.4.11": "Ensures UI elements like buttons are clearly visible.",
  "1.4.12": "Supports users who need adjusted spacing for readability.",
  "1.4.13": "Prevents hidden content from disappearing unexpectedly.",
  "2.1.1":  "Enables users with motor disabilities to navigate without a mouse.",
  "2.1.2":  "Ensures users don't get stuck while navigating via keyboard.",
  "2.1.4":  "Prevents accidental activation of shortcuts by assistive tech users.",
  "2.2.1":  "Gives users enough time to read and interact with content.",
  "2.2.2":  "Allows users to control moving or auto-updating content.",
  "2.3.1":  "Prevents seizures in users with photosensitive epilepsy.",
  "2.4.1":  "Lets users skip repetitive navigation using keyboard.",
  "2.4.2":  "Helps users understand the purpose of each page.",
  "2.4.3":  "Maintains logical navigation order for keyboard users.",
  "2.4.4":  "Ensures links are understandable without extra context.",
  "2.4.5":  "Provides different navigation methods like search or menus.",
  "2.4.6":  "Improves navigation and understanding of content structure.",
  "2.4.7":  "Shows clear focus indicators for keyboard users.",
  "2.5.1":  "Avoids complex gestures that are difficult for motor-impaired users.",
  "2.5.2":  "Prevents accidental clicks from causing actions.",
  "2.5.3":  "Supports voice control users by matching visible labels.",
  "2.5.4":  "Ensures functionality without requiring device motion.",
  "3.1.1":  "Helps screen readers pronounce content correctly.",
  "3.1.2":  "Ensures correct pronunciation of mixed-language content.",
  "3.2.1":  "Prevents unexpected changes when elements receive focus.",
  "3.2.2":  "Avoids sudden changes when users enter data.",
  "3.2.3":  "Reduces confusion through consistent layouts.",
  "3.2.4":  "Ensures UI elements behave consistently.",
  "3.3.1":  "Helps users understand what went wrong in forms.",
  "3.3.2":  "Provides clear guidance for user inputs.",
  "3.3.3":  "Helps users fix mistakes easily.",
  "3.3.4":  "Prevents serious mistakes in important actions.",
  "4.1.1":  "Ensures clean code for compatibility with assistive technologies.",
  "4.1.2":  "Allows assistive tech to understand UI components properly.",
  "4.1.3":  "Ensures screen readers announce dynamic updates.",
};

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
        .map((r) => `${r.ruleId} (Failed on ${totalPages > 0 ? Math.round((r.pagesFailedOn / totalPages) * 100) : 0}% pages)`)
        .join("\n");
      issueDescription = rules
        .map((r) => r.description)
        .filter(Boolean)
        .join("\n");
    } else {
      notes = "No issues detected. All automated checks passed for this criterion.";
    }

    const lineCount = Math.max(
      notes.split("\n").length,
      issueDescription.split("\n").length,
      1
    );
    const dataRow = ws.addRow([criterion.sc, criterion.name, criterion.level, status, notes, issueDescription, WCAG_RATIONALE[criterion.sc] ?? ""]);
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
