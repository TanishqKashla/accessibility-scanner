const TRACKING_PARAMS = new Set([
  "utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content",
  "fbclid", "gclid", "gclsrc", "dclid", "msclkid",
  "mc_cid", "mc_eid", "ref", "source", "campaign",
]);

/**
 * Normalize a URL for deduplication.
 * - Strips fragments
 * - Removes tracking query params
 * - Normalizes trailing slashes
 * - Lowercases scheme and host
 * - Removes default ports
 * - Resolves /index.html, /index.htm, /index.php
 */
export function normalizeUrl(rawUrl: string, baseUrl?: string): string {
  let url: URL;
  try {
    url = new URL(rawUrl, baseUrl);
  } catch {
    return rawUrl;
  }

  // Only allow http/https
  if (!["http:", "https:"].includes(url.protocol)) {
    return rawUrl;
  }

  // Strip fragment
  url.hash = "";

  // Remove tracking params
  const keysToDelete: string[] = [];
  url.searchParams.forEach((_, key) => {
    if (TRACKING_PARAMS.has(key.toLowerCase())) {
      keysToDelete.push(key);
    }
  });
  keysToDelete.forEach((k) => url.searchParams.delete(k));

  // Sort remaining params for consistency
  url.searchParams.sort();

  // Normalize pathname
  let pathname = url.pathname;

  // Remove index files
  pathname = pathname.replace(/\/index\.(html?|php)$/i, "/");

  // Ensure single trailing slash for root, remove for others
  if (pathname !== "/") {
    pathname = pathname.replace(/\/+$/, "");
  }

  // Collapse double slashes
  pathname = pathname.replace(/\/\/+/g, "/");

  url.pathname = pathname;

  // Remove default ports
  if (
    (url.protocol === "http:" && url.port === "80") ||
    (url.protocol === "https:" && url.port === "443")
  ) {
    url.port = "";
  }

  // Canonicalize www prefix so that example.com and www.example.com are treated
  // as the same site. Without this, the same page can appear twice in the
  // visited set under different hostnames and get crawled/audited twice.
  if (url.hostname.startsWith("www.")) {
    url.hostname = url.hostname.slice(4);
  }

  return url.toString();
}

/**
 * Strip the www. prefix from a hostname for comparison purposes.
 * example.com and www.example.com should be treated as the same domain.
 */
function bareHost(hostname: string): string {
  return hostname.startsWith("www.") ? hostname.slice(4) : hostname;
}

/**
 * Check if a URL belongs to the same domain as the base.
 * Treats www.example.com and example.com as the same domain.
 */
export function isSameDomain(url: string, baseUrl: string): boolean {
  try {
    const u = new URL(url);
    const base = new URL(baseUrl);
    return bareHost(u.hostname) === bareHost(base.hostname);
  } catch {
    return false;
  }
}

/**
 * Extract the domain from a URL.
 */
export function extractDomain(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

/**
 * Non-HTML file extensions that should never be enqueued as crawl jobs.
 * Playwright navigating to a PDF/image/binary hangs or fails silently,
 * wasting a browser slot and potentially stalling the entire scan.
 */
const NON_HTML_EXT = /\.(pdf|zip|docx?|xlsx?|pptx?|png|jpe?g|gif|webp|svg|ico|mp4|mp3|wav|ogg|woff2?|ttf|eot|css|js|json|xml|rss|atom|txt|csv|gz|tar)$/i;

/**
 * Return true if the URL points to a page that can be meaningfully audited
 * with axe-core (i.e. it resolves to an HTML document, not a binary resource).
 */
export function isScannableUrl(url: string): boolean {
  try {
    const { pathname } = new URL(url);
    return !NON_HTML_EXT.test(pathname);
  } catch {
    return false;
  }
}
