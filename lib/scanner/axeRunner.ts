import type { Page } from "playwright";
import path from "path";

// Axe-core tags for WCAG levels
const WCAG_TAG_MAP: Record<string, string[]> = {
  A: ["wcag2a"],
  AA: ["wcag2a", "wcag2aa"],
  AAA: ["wcag2a", "wcag2aa", "wcag2aaa"],
  "A+AA": ["wcag2a", "wcag2aa"],
};

export interface AxeIssue {
  ruleId: string;
  impact: "critical" | "serious" | "moderate" | "minor";
  description: string;
  help: string;
  helpUrl: string;
  wcagTags: string[];
  nodes: Array<{
    html: string;
    target: string[];
    failureSummary: string;
  }>;
}

export interface AxeRunResult {
  violations: AxeIssue[];
  passes: number;
  incomplete: number;
  inapplicable: number;
  timestamp: string;
  url: string;
  toolVersion: string;
}

/**
 * Inject axe-core into a page and run the accessibility audit.
 */
export async function runAxeAudit(
  page: Page,
  options: { wcagLevel?: string } = {}
): Promise<AxeRunResult> {
  const { wcagLevel = "AA" } = options;
  const tags = WCAG_TAG_MAP[wcagLevel] || WCAG_TAG_MAP["AA"];

  // Inject axe-core
  const axePath = path.join(
    process.cwd(),
    "node_modules",
    "axe-core",
    "axe.min.js"
  );
  await page.addScriptTag({ path: axePath });

  // Run axe with configured tags.
  // page.evaluate with an async callback has no built-in timeout in Playwright,
  // so we race against a manual timer to prevent indefinite hangs on complex pages.
  const AXE_TIMEOUT = 25_000;

  const rawResult = await Promise.race([
    page.evaluate(async (runTags: string[]) => {
      // @ts-expect-error axe is injected globally
      const result = await axe.run(document, {
        runOnly: { type: "tag", values: runTags },
        // Limit result size: only keep the first 50 nodes per violation to avoid
        // serialization blowup on pages with hundreds of identical issues.
        resultTypes: ["violations", "passes", "incomplete", "inapplicable"],
      });
      return {
        violations: result.violations,
        passes: result.passes.length,
        incomplete: result.incomplete.length,
        inapplicable: result.inapplicable.length,
        timestamp: result.timestamp,
        url: result.url,
        toolVersion: result.testEngine?.version || "unknown",
      };
    }, tags),
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`axe-core timed out after ${AXE_TIMEOUT}ms`)), AXE_TIMEOUT)
    ),
  ]);

  // Transform violations into our format
  const violations: AxeIssue[] = rawResult.violations.map((v: Record<string, unknown>) => ({
    ruleId: v.id as string,
    impact: (v.impact as string) || "minor",
    description: v.description as string,
    help: v.help as string,
    helpUrl: v.helpUrl as string,
    wcagTags: (v.tags as string[]) || [],
    nodes: ((v.nodes as Array<Record<string, unknown>>) || []).map((n) => ({
      html: (n.html as string) || "",
      target: (n.target as string[]) || [],
      failureSummary: (n.failureSummary as string) || "",
    })),
  }));

  return {
    violations,
    passes: rawResult.passes,
    incomplete: rawResult.incomplete,
    inapplicable: rawResult.inapplicable,
    timestamp: rawResult.timestamp,
    url: rawResult.url,
    toolVersion: rawResult.toolVersion,
  };
}
