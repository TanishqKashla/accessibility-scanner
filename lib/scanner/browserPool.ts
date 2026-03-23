import { chromium, Browser, BrowserContext, Page } from "playwright";
import { logger } from "../logger";

const VIEWPORT = { width: 1280, height: 720 };
const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

/**
 * Stylesheets are intentionally NOT blocked — axe-core needs computed styles
 * for contrast ratio checks, visibility detection, and focus-indicator audits.
 * Only media/binary resources that don't affect the accessibility tree are blocked.
 */
const BLOCKED_RESOURCE_TYPES = new Set(["image", "font", "media"]);

export const PAGE_TIMEOUT = 30_000;

// Maximum concurrent contexts open at once.
// Must be >= crawl worker concurrency (3) to prevent the spin-wait from
// blocking the event loop. Set slightly above concurrency to absorb bursts.
const MAX_CONCURRENT_CONTEXTS = 6;
let activeContexts = 0;
let browserInstance: Browser | null = null;

/**
 * Get or (re)launch the shared Playwright browser instance.
 * One browser is shared across the whole worker process — only individual
 * browser CONTEXTS are created/closed per crawl job.
 */
async function getBrowser(): Promise<Browser> {
  if (browserInstance?.isConnected()) {
    return browserInstance;
  }

  browserInstance = await chromium.launch({
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu",
      "--disable-extensions",
      // NOTE: --single-process intentionally omitted — it disables process
      // isolation between tabs and causes Chromium to crash after a few pages.
    ],
  });

  browserInstance.on("disconnected", () => {
    logger.warn("Browser disconnected, will relaunch on next request");
    browserInstance = null;
    activeContexts = 0;
  });

  return browserInstance;
}

/**
 * Acquire a fresh BrowserContext for one crawl job.
 *
 * Each job gets its OWN context (not a pooled/reused one) to prevent:
 *  - Cookie / localStorage state leaking between pages
 *  - Unclosed pages from a previous job polluting the context
 * The browser instance itself is shared, so the per-context overhead is low.
 *
 * Spin-waits if MAX_CONCURRENT_CONTEXTS is reached (matches BullMQ concurrency).
 */
export async function acquireContext(): Promise<BrowserContext> {
  while (activeContexts >= MAX_CONCURRENT_CONTEXTS) {
    await new Promise((r) => setTimeout(r, 200));
  }

  const browser = await getBrowser();

  const context = await browser.newContext({
    viewport: VIEWPORT,
    userAgent: USER_AGENT,
    ignoreHTTPSErrors: true,
    javaScriptEnabled: true,
  });

  // Route is attached once per context — blocks heavy binary resources
  // while keeping stylesheets so axe-core can compute accurate styles.
  await context.route("**/*", (route) => {
    if (BLOCKED_RESOURCE_TYPES.has(route.request().resourceType())) {
      return route.abort();
    }
    return route.continue();
  });

  activeContexts++;
  return context;
}

/**
 * Release and CLOSE a context after a crawl job finishes.
 * Closing the context also closes any pages still open inside it.
 */
export async function releaseContext(context: BrowserContext): Promise<void> {
  try {
    await context.close();
  } catch {
    // Already closed (e.g. browser crashed)
  }
  activeContexts = Math.max(0, activeContexts - 1);
}

/**
 * Navigate to a URL and wait for the page to be interactive.
 *
 * Strategy:
 *  1. "load" — fires once HTML + subresources are parsed. Fast and reliable
 *     for most sites.
 *  2. Fallback to "domcontentloaded" + 1s settle if "load" times out.
 *     Covers SPAs that poll or use WebSockets (which never reach networkidle).
 *
 * "networkidle" is intentionally avoided — sites with analytics scripts,
 * WebSockets, or polling connections never reach true idle, causing frequent
 * 30-second timeouts.
 */
export async function navigateTo(context: BrowserContext, url: string): Promise<Page> {
  const page = await context.newPage();

  try {
    await page.goto(url, { waitUntil: "load", timeout: PAGE_TIMEOUT });
  } catch {
    try {
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: PAGE_TIMEOUT });
      await page.waitForTimeout(1_000);
    } catch {
      // Return as-is — page may have partial content; axe will still run
    }
  }

  return page;
}

/**
 * Extract all internal links from a rendered page.
 * Resolves relative hrefs, skips non-navigational schemes, deduplicates.
 */
export async function extractLinks(page: Page, baseUrl: string): Promise<string[]> {
  try {
    const links = await page.evaluate((base: string) => {
      const hrefs: string[] = [];
      document.querySelectorAll("a[href]").forEach((a) => {
        const href = a.getAttribute("href");
        if (!href) return;
        if (
          href.startsWith("#") ||
          href.startsWith("mailto:") ||
          href.startsWith("tel:") ||
          href.startsWith("javascript:")
        ) return;
        try {
          hrefs.push(new URL(href, base).toString());
        } catch { /* invalid URL */ }
      });
      return hrefs;
    }, baseUrl);

    return [...new Set(links)];
  } catch {
    return [];
  }
}

/**
 * Gracefully shut down the browser.
 */
export async function closeBrowser(): Promise<void> {
  if (browserInstance) {
    try { await browserInstance.close(); } catch { /* already closed */ }
    browserInstance = null;
    activeContexts = 0;
  }
}

export { VIEWPORT, USER_AGENT };
