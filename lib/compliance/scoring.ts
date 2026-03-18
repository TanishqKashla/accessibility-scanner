/**
 * Weighted scoring engine for accessibility compliance.
 *
 * Methodology v2.0 — logarithmic penalty:
 *   penalty_per_issue = impactWeight × log₂(nodeCount + 1)
 *   pageScore = max(0, 100 - Σ(penalty_per_issue))
 *   siteScore = average(pageScores)
 *
 * Why logarithmic?
 *   Repeated violations on many nodes no longer destroy the score linearly.
 *   The first few affected nodes carry full weight; additional nodes add
 *   diminishing penalty — reflecting real-world user impact more accurately.
 *
 * Impact weights:
 *   critical = 10, serious = 7, moderate = 4, minor = 1
 */

export const METHODOLOGY_VERSION = "2.0";

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
    const nodeCount = issue.nodeCount || 1;
    const weight = IMPACT_WEIGHTS[impact] ?? 1;

    // Track node counts per impact level for reporting
    issuesByImpact[impact] = (issuesByImpact[impact] || 0) + nodeCount;
    totalIssues += nodeCount;

    // Logarithmic penalty: severity × log₂(nodeCount + 1)
    // Avoids log(0) via +1; diminishing returns beyond first few nodes.
    penalty += weight * Math.log2(nodeCount + 1);
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
    formula: "penalty = impactWeight × log₂(nodeCount + 1); pageScore = max(0, 100 - Σ(penalty))",
    siteFormula: "siteScore = average(pageScores)",
    weights: { ...IMPACT_WEIGHTS },
    description:
      "Each violation is penalised using a logarithmic function of the number of affected DOM nodes. " +
      "This prevents pages with many repeated violations (e.g. 57 contrast failures) from being " +
      "scored disproportionately worse than pages with fewer but equally impactful issues. " +
      "The site score is the arithmetic mean of all page scores.",
  };
}
