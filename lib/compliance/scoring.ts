/**
 * Weighted scoring engine for accessibility compliance.
 *
 * Methodology v1.0:
 *   Score = max(0, 100 - Σ(node_count × impact_weight))
 *
 * Impact weights:
 *   critical = 10, serious = 7, moderate = 4, minor = 1
 */

export const METHODOLOGY_VERSION = "1.0";

export const IMPACT_WEIGHTS: Record<string, number> = {
  critical: 10,
  serious: 7,
  moderate: 4,
  minor: 1,
};

export interface IssueForScoring {
  impact: string;
  nodeCount: number;
}

export interface PageScore {
  url: string;
  score: number;
  totalIssues: number;
  issuesByImpact: Record<string, number>;
  penalty: number;
}

export interface SiteScore {
  score: number;
  totalIssues: number;
  totalNodes: number;
  issuesByImpact: Record<string, number>;
  pageScores: PageScore[];
  penalty: number;
  pagesScanned: number;
}

/**
 * Calculate the score for a single page.
 */
export function calculatePageScore(
  url: string,
  issues: IssueForScoring[]
): PageScore {
  const issuesByImpact: Record<string, number> = {
    critical: 0,
    serious: 0,
    moderate: 0,
    minor: 0,
  };

  let penalty = 0;
  let totalIssues = 0;

  for (const issue of issues) {
    const impact = issue.impact || "minor";
    const count = issue.nodeCount || 1;
    issuesByImpact[impact] = (issuesByImpact[impact] || 0) + count;
    penalty += count * (IMPACT_WEIGHTS[impact] || 1);
    totalIssues += count;
  }

  const score = Math.max(0, Math.round(100 - penalty));

  return { url, score, totalIssues, issuesByImpact, penalty };
}

/**
 * Aggregate page scores into a site-level score.
 * Uses the average of page scores weighted by issue severity.
 */
export function calculateSiteScore(pageScores: PageScore[]): SiteScore {
  if (pageScores.length === 0) {
    return {
      score: 100,
      totalIssues: 0,
      totalNodes: 0,
      issuesByImpact: { critical: 0, serious: 0, moderate: 0, minor: 0 },
      pageScores: [],
      penalty: 0,
      pagesScanned: 0,
    };
  }

  const siteIssuesByImpact: Record<string, number> = {
    critical: 0,
    serious: 0,
    moderate: 0,
    minor: 0,
  };

  let totalNodes = 0;
  let totalPenalty = 0;
  let totalIssues = 0;

  for (const page of pageScores) {
    for (const [impact, count] of Object.entries(page.issuesByImpact)) {
      siteIssuesByImpact[impact] = (siteIssuesByImpact[impact] || 0) + count;
    }
    totalNodes += page.totalIssues;
    totalPenalty += page.penalty;
    totalIssues += page.totalIssues;
  }

  // Site score: average of page scores
  const avgScore = Math.round(
    pageScores.reduce((sum, p) => sum + p.score, 0) / pageScores.length
  );

  return {
    score: avgScore,
    totalIssues,
    totalNodes,
    issuesByImpact: siteIssuesByImpact,
    pageScores,
    penalty: totalPenalty,
    pagesScanned: pageScores.length,
  };
}

/**
 * Get the methodology document for inclusion in reports.
 */
export function getMethodology() {
  return {
    version: METHODOLOGY_VERSION,
    formula: "Score = max(0, 100 - Σ(node_count × impact_weight))",
    siteFormula: "Site Score = average of all page scores",
    weights: { ...IMPACT_WEIGHTS },
    description:
      "Each accessibility violation node is weighted by its impact severity. " +
      "The page score starts at 100 and is reduced by the sum of weighted violations. " +
      "The site-level score is the average of all page scores.",
  };
}
