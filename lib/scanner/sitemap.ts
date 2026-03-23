import { normalizeUrl, isSameDomain } from "./normalizer";

// Common browser UA — some servers block or return empty responses for
// requests without a recognized User-Agent (e.g. WordPress security plugins).
const FETCH_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (compatible; EnableStack/1.0; +https://github.com/enablestack)",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
};

export interface SitemapResult {
  urls: string[];
  sitemapFound: boolean;
  robotsTxtFound: boolean;
  disallowedPaths: string[]; // exposed so callers can filter crawled links
}

/**
 * Fetch and parse robots.txt.
 * Returns sitemap URLs and disallowed path prefixes.
 */
async function parseRobotsTxt(
  baseUrl: string
): Promise<{ sitemaps: string[]; disallowed: string[] }> {
  const sitemaps: string[] = [];
  const disallowed: string[] = [];

  try {
    const robotsUrl = new URL("/robots.txt", baseUrl).toString();
    const res = await fetch(robotsUrl, { headers: FETCH_HEADERS, signal: AbortSignal.timeout(10_000) });
    if (!res.ok) return { sitemaps, disallowed };

    const text = await res.text();
    let inRelevantBlock = true; // treat rules before the first User-agent as global

    for (const rawLine of text.split("\n")) {
      const line = rawLine.trim();
      if (!line || line.startsWith("#")) continue;

      if (line.toLowerCase().startsWith("user-agent:")) {
        const agent = line.slice(11).trim();
        inRelevantBlock = agent === "*";
        continue;
      }
      if (line.toLowerCase().startsWith("sitemap:")) {
        sitemaps.push(line.slice(8).trim());
        continue;
      }
      if (inRelevantBlock && line.toLowerCase().startsWith("disallow:")) {
        const path = line.slice(9).trim();
        if (path) disallowed.push(path);
      }
    }
  } catch {
    // robots.txt not available or unreadable — continue without it
  }

  return { sitemaps, disallowed };
}

/**
 * Extract the text content of a <loc> element.
 * Handles: CDATA sections, <loc> tags with attributes (e.g. xml:space="preserve"),
 * and stray whitespace.
 */
function extractLoc(raw: string): string {
  return raw
    .replace(/<loc[^>]*>/gi, "")   // opening tag with any attributes
    .replace(/<\/loc>/gi, "")      // closing tag
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")  // CDATA wrapper
    .trim();
}

/**
 * Fetch and parse a sitemap XML.
 * Handles both sitemap index files and regular URL sitemaps.
 * Recurses into child sitemaps for sitemap index files.
 */
async function parseSitemap(
  sitemapUrl: string,
  maxUrls: number,
  depth = 0
): Promise<string[]> {
  // Guard against infinite recursion from pathological sitemap indexes
  if (depth > 3) return [];

  const urls: string[] = [];

  try {
    const res = await fetch(sitemapUrl, { headers: FETCH_HEADERS, signal: AbortSignal.timeout(15_000) });
    if (!res.ok) return urls;

    const text = await res.text();
    const locMatches = text.match(/<loc[\s>][\s\S]*?<\/loc>/gi) ?? [];

    if (text.includes("<sitemapindex")) {
      // Sitemap index — each <loc> is itself a sitemap URL
      for (const match of locMatches) {
        if (urls.length >= maxUrls) break;
        const childUrl = extractLoc(match);
        if (!childUrl) continue;
        const childUrls = await parseSitemap(childUrl, maxUrls - urls.length, depth + 1);
        urls.push(...childUrls);
      }
    } else {
      // Regular sitemap
      for (const match of locMatches) {
        if (urls.length >= maxUrls) break;
        const loc = extractLoc(match);
        if (loc) urls.push(loc);
      }
    }
  } catch {
    // Sitemap fetch failed — continue with whatever was collected
  }

  return urls;
}

/**
 * Return true if the URL path matches any robots.txt Disallow rule.
 */
export function isDisallowed(urlPath: string, disallowedPaths: string[]): boolean {
  for (const rule of disallowedPaths) {
    if (rule === "/") return true;
    if (urlPath.startsWith(rule)) return true;
  }
  return false;
}

/**
 * Discover URLs for a scan target.
 * 1. Parses robots.txt (sitemap pointers + disallow rules)
 * 2. Fetches sitemap.xml (or sitemap index)
 * 3. Falls back to just the target URL when no sitemap is found
 * 4. Filters to same-domain, normalizes, deduplicates
 */
export async function discoverUrls(
  targetUrl: string,
  options: { respectRobots?: boolean; maxUrls?: number } = {}
): Promise<SitemapResult> {
  const { respectRobots = true, maxUrls = 1000 } = options;
  const allUrls = new Set<string>();
  let sitemapFound = false;
  let robotsTxtFound = false;
  let disallowedPaths: string[] = [];

  // 1. Parse robots.txt
  if (respectRobots) {
    const robots = await parseRobotsTxt(targetUrl);
    disallowedPaths = robots.disallowed;
    robotsTxtFound = robots.sitemaps.length > 0 || robots.disallowed.length > 0;

    // 2. Try sitemaps listed in robots.txt
    for (const sitemapUrl of robots.sitemaps) {
      if (allUrls.size >= maxUrls) break;
      const urls = await parseSitemap(sitemapUrl, maxUrls - allUrls.size);
      urls.forEach((u) => allUrls.add(u));
      if (urls.length > 0) sitemapFound = true;
    }
  }

  // 3. Try default /sitemap.xml if nothing found yet
  if (!sitemapFound) {
    const defaultSitemap = new URL("/sitemap.xml", targetUrl).toString();
    const urls = await parseSitemap(defaultSitemap, maxUrls);
    urls.forEach((u) => allUrls.add(u));
    if (urls.length > 0) sitemapFound = true;
  }

  // 4. Always include the target URL itself
  allUrls.add(targetUrl);

  // 5. Normalize, filter to same domain, apply disallow rules, deduplicate
  const filtered = Array.from(allUrls)
    .filter((u) => isSameDomain(u, targetUrl))
    .map((u) => normalizeUrl(u))
    .filter((u) => {
      if (!respectRobots || disallowedPaths.length === 0) return true;
      try {
        const path = new URL(u).pathname;
        return !isDisallowed(path, disallowedPaths);
      } catch {
        return true;
      }
    })
    .slice(0, maxUrls);

  return {
    urls: [...new Set(filtered)],
    sitemapFound,
    robotsTxtFound,
    disallowedPaths,
  };
}
