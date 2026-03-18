/**
 * CSV export generator for accessibility scan reports.
 */

interface CsvIssue {
  pageUrl: string;
  ruleId: string;
  impact: string;
  description: string;
  help: string;
  helpUrl: string;
  wcagTags: string;
  nodeHtml: string;
  nodeTarget: string;
  failureSummary: string;
}

function escapeCsv(value: string): string {
  if (!value) return "";
  const str = String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function buildCsvRow(values: string[]): string {
  return values.map(escapeCsv).join(",");
}

const HEADERS = [
  "Page URL",
  "Rule ID",
  "Impact",
  "Description",
  "Help",
  "Help URL",
  "WCAG Tags",
  "HTML Element",
  "CSS Selector",
  "Failure Summary",
];

/**
 * Generate a CSV string from page results.
 */
export function generateCsv(
  pages: Array<{
    url: string;
    issues: Array<{
      ruleId?: string;
      impact?: string;
      description?: string;
      help?: string;
      helpUrl?: string;
      wcagTags?: string[];
      nodes?: Array<{
        html?: string;
        target?: string[];
        failureSummary?: string;
      }>;
    }>;
  }>
): string {
  const rows: string[] = [buildCsvRow(HEADERS)];

  for (const page of pages) {
    for (const issue of page.issues) {
      const nodes = issue.nodes || [{}];
      for (const node of nodes) {
        rows.push(
          buildCsvRow([
            page.url,
            issue.ruleId || "",
            issue.impact || "",
            issue.description || "",
            issue.help || "",
            issue.helpUrl || "",
            (issue.wcagTags || []).join("; "),
            node.html || "",
            (node.target || []).join(" > "),
            node.failureSummary || "",
          ])
        );
      }
    }
  }

  return rows.join("\n");
}
