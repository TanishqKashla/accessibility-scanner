/**
 * Compliance Engine — determines Pass/Partial/Fail and generates compliance reports.
 */

import { calculatePageScore, calculateSiteScore, getMethodology, type PageScore, type SiteScore } from "./scoring";
import { getWcagCriteria, getWcagFromTags, getWcagPrinciple } from "./wcagMapping";
import crypto from "crypto";

export type ComplianceStatus = "pass" | "partial" | "fail";

export interface ComplianceThresholds {
  passScore: number;    // Score >= this = PASS (default: 80)
  partialScore: number; // Score >= this = PARTIAL (default: 50)
}

export const DEFAULT_THRESHOLDS: ComplianceThresholds = {
  passScore: 80,
  partialScore: 50,
};

export interface ComplianceResult {
  score: number;
  status: ComplianceStatus;
  thresholds: ComplianceThresholds;
  siteScore: SiteScore;
  wcagSummary: WcagSummary;
  methodology: ReturnType<typeof getMethodology>;
  hash: string;
  generatedAt: string;
}

export interface WcagSummary {
  /** Unique WCAG criteria violated */
  criteriaViolated: string[];
  /** Issues grouped by WCAG principle */
  byPrinciple: Record<string, number>;
  /** Issues grouped by WCAG level */
  byLevel: Record<string, number>;
  /** Top rules by issue count */
  topRules: Array<{ ruleId: string; count: number; impact: string; wcag: string[]; principle: string }>;
}

interface PageIssueInput {
  ruleId: string;
  impact: string;
  wcagTags?: string[];
  nodes?: Array<unknown>;
}

interface PageInput {
  url: string;
  issues: PageIssueInput[];
}

/**
 * Determine compliance status from a score and thresholds.
 */
export function determineStatus(
  score: number,
  thresholds: ComplianceThresholds = DEFAULT_THRESHOLDS
): ComplianceStatus {
  if (score >= thresholds.passScore) return "pass";
  if (score >= thresholds.partialScore) return "partial";
  return "fail";
}

/**
 * Build a WCAG summary from page results.
 */
function buildWcagSummary(pages: PageInput[]): WcagSummary {
  const criteriaSet = new Set<string>();
  const byPrinciple: Record<string, number> = {
    Perceivable: 0,
    Operable: 0,
    Understandable: 0,
    Robust: 0,
  };
  const byLevel: Record<string, number> = { A: 0, AA: 0, AAA: 0 };
  const ruleCount: Record<string, { count: number; impact: string; wcag: string[]; principle: string }> = {};

  for (const page of pages) {
    for (const issue of page.issues) {
      const nodeCount = issue.nodes?.length || 1;

      // Get WCAG criteria from mapping or tags
      const mappedCriteria = getWcagCriteria(issue.ruleId);
      const tagCriteria = issue.wcagTags ? getWcagFromTags(issue.wcagTags) : [];
      const allCriteria = [
        ...mappedCriteria.map((c) => c.sc),
        ...tagCriteria,
      ];
      const uniqueCriteria = [...new Set(allCriteria)];
      uniqueCriteria.forEach((sc) => criteriaSet.add(sc));

      // Count by principle
      const principle = getWcagPrinciple(issue.ruleId);
      if (principle in byPrinciple) {
        byPrinciple[principle] += nodeCount;
      }

      // Count by level
      for (const mc of mappedCriteria) {
        if (mc.level in byLevel) {
          byLevel[mc.level] += nodeCount;
        }
      }

      // Track rule counts
      if (!ruleCount[issue.ruleId]) {
        ruleCount[issue.ruleId] = {
          count: 0,
          impact: issue.impact,
          wcag: uniqueCriteria,
          principle,
        };
      }
      ruleCount[issue.ruleId].count += nodeCount;
    }
  }

  // Top rules sorted by count
  const topRules = Object.entries(ruleCount)
    .map(([ruleId, data]) => ({ ruleId, ...data }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 20);

  return {
    criteriaViolated: [...criteriaSet].sort(),
    byPrinciple,
    byLevel,
    topRules,
  };
}

/**
 * Run the full compliance engine on a set of page results.
 */
export function evaluateCompliance(
  pages: PageInput[],
  thresholds: ComplianceThresholds = DEFAULT_THRESHOLDS
): ComplianceResult {
  // Calculate per-page scores
  const pageScores: PageScore[] = pages.map((page) => {
    const issues = page.issues.map((i) => ({
      impact: i.impact,
      nodeCount: i.nodes?.length || 1,
    }));
    return calculatePageScore(page.url, issues);
  });

  // Calculate site-level score
  const siteScore = calculateSiteScore(pageScores);

  // Determine compliance status
  const status = determineStatus(siteScore.score, thresholds);

  // Build WCAG summary
  const wcagSummary = buildWcagSummary(pages);

  // Get methodology
  const methodology = getMethodology();

  // Generate tamper-evidence hash
  const reportPayload = JSON.stringify({
    score: siteScore.score,
    status,
    siteScore,
    wcagSummary,
    methodology,
    thresholds,
  });
  const hash = `sha256:${crypto.createHash("sha256").update(reportPayload).digest("hex")}`;

  return {
    score: siteScore.score,
    status,
    thresholds,
    siteScore,
    wcagSummary,
    methodology,
    hash,
    generatedAt: new Date().toISOString(),
  };
}
