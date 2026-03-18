/**
 * Priority scoring for URL selection.
 * Higher score = higher priority (processed first).
 * BullMQ uses lower number = higher priority, so we invert at the end.
 */

const HIGH_PRIORITY_PATTERNS = [
  /^\/$/, // homepage
  /^\/(about|contact|help|support|faq)/i,
  /^\/(login|register|signup|sign-in|sign-up)/i,
  /^\/(checkout|cart|payment)/i,
  /^\/(products?|services?|pricing)/i,
  /^\/(accessibility|privacy|terms)/i,
];

const LOW_PRIORITY_PATTERNS = [
  /\/(tag|category|archive|page\/\d+)/i,
  /\.(pdf|zip|png|jpg|gif|svg|mp4|mp3)$/i,
  /\/(wp-content|wp-admin|wp-includes)/i,
  /\/(feed|rss|atom)/i,
];

interface PriorityInput {
  url: string;
  depth: number;
  inboundLinkCount?: number;
}

/**
 * Compute a priority score for a URL.
 * Returns a BullMQ priority value (lower = higher priority).
 */
export function computePriority(input: PriorityInput): number {
  let score = 50; // Base score

  const { url, depth, inboundLinkCount = 0 } = input;

  let pathname: string;
  try {
    pathname = new URL(url).pathname;
  } catch {
    return 50;
  }

  // Depth penalty: deeper pages get lower priority
  score -= depth * 5;

  // High-priority page types
  if (HIGH_PRIORITY_PATTERNS.some((p) => p.test(pathname))) {
    score += 20;
  }

  // Low-priority page types
  if (LOW_PRIORITY_PATTERNS.some((p) => p.test(pathname))) {
    score -= 15;
  }

  // Inbound link boost
  score += Math.min(inboundLinkCount * 2, 20);

  // Short URL bonus (simpler pages tend to be more important)
  if (pathname.split("/").filter(Boolean).length <= 2) {
    score += 10;
  }

  // URL length penalty
  if (url.length > 150) {
    score -= 5;
  }

  // Clamp to 1-100 range, then invert for BullMQ (1 = highest priority)
  const clamped = Math.max(1, Math.min(100, score));
  return 101 - clamped;
}

/**
 * Determine the URL pattern/template for sampling.
 * Groups URLs by their structural pattern (e.g., /blog/:slug, /products/:id).
 */
export function getUrlPattern(url: string): string {
  try {
    const { pathname } = new URL(url);
    return pathname
      .split("/")
      .map((segment) => {
        if (!segment) return "";
        // Replace numeric IDs, UUIDs, and long hex strings with placeholders
        if (/^\d+$/.test(segment)) return ":id";
        if (/^[0-9a-f]{8}-[0-9a-f]{4}-/i.test(segment)) return ":uuid";
        if (/^[0-9a-f]{24}$/i.test(segment)) return ":objectId";
        return segment;
      })
      .join("/") || "/";
  } catch {
    return url;
  }
}
