/**
 * JSON export generator for accessibility scan reports.
 * Produces a structured, self-contained JSON document suitable for re-ingestion.
 */

interface JsonExportOptions {
  scan: {
    _id: string;
    targetUrl: string;
    config: Record<string, unknown>;
    toolVersions?: Record<string, string>;
    createdAt: string;
  };
  report: {
    score: number;
    status: string;
    breakdown: Record<string, unknown>;
    hash: string;
  };
  pages: Array<{
    url: string;
    normalizedUrl: string;
    depth?: number;
    issues: Array<Record<string, unknown>>;
    axeRaw?: Record<string, unknown>;
  }>;
}

export function generateJsonExport(data: JsonExportOptions): string {
  const output = {
    exportVersion: "1.0",
    exportedAt: new Date().toISOString(),
    scan: {
      id: data.scan._id,
      targetUrl: data.scan.targetUrl,
      config: data.scan.config,
      toolVersions: data.scan.toolVersions || {},
      createdAt: data.scan.createdAt,
    },
    report: {
      score: data.report.score,
      status: data.report.status,
      breakdown: data.report.breakdown,
      hash: data.report.hash,
    },
    pages: data.pages.map((p) => ({
      url: p.url,
      normalizedUrl: p.normalizedUrl,
      depth: p.depth,
      issueCount: p.issues.length,
      issues: p.issues,
      ...(p.axeRaw ? { axeRaw: p.axeRaw } : {}),
    })),
    meta: {
      totalPages: data.pages.length,
      totalIssues: data.pages.reduce((sum, p) => sum + p.issues.length, 0),
    },
  };

  return JSON.stringify(output, null, 2);
}
