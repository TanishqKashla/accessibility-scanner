# Accessibility Scanner — Project Requirements

**Version:** 0.1

**Date:** 2026-03-17

---

# 1. Overview

This document captures the project requirements for an enterprise-grade, compliance-focused web accessibility scanning platform. The platform accepts a website URL, crawls the site, runs automated accessibility audits (using axe-core + Playwright), aggregates results into a compliance decision, stores scans and artifacts, and allows users to export and share official reports.

The target use case includes organizations mandated to report accessibility compliance to government authorities and therefore requires repeatability, traceability, and defensible audit reports.

---

# 2. Goals & Success Criteria

* Provide accurate, repeatable accessibility audits that map to WCAG success criteria.
* Produce an auditable, tamper-evident compliance report (PDF/JSON/CSV) that can be submitted to regulators.
* Be modular and scalable to handle sites of 200–1000 pages per scan.
* Be fast and efficient: parallelize crawling/auditing while remaining polite to target sites.
* Maintain traceability: record versions of tools, config, and raw outputs for every scan.

Success metrics:

* Scan completion within acceptable SLA for typical targets (configurable).
* Reproducible results given same input + config + tool versions.
* Report includes required evidence: raw axe JSON, page screenshots, timestamps, tool versions.

---

# 3. Scope

## In scope

* URL submission, sitemap ingestion, site crawling (same-domain), and URL discovery.
* Page rendering using Playwright (Chromium) and axe-core audits.
* Deduplication, URL normalization, and priority URL selection.
* Job orchestration using BullMQ + Redis, worker pool running Playwright.
* Aggregation into a compliance score and pass/fail decision using a configurable Compliance Engine.
* Persistent storage of raw outputs and artifacts (MongoDB + S3), exports (PDF/CSV/JSON), and shareable links.
* Basic auth and multi-tenant (org) support with RBAC.

## Out of scope (initial MVP)

* Human-in-the-loop manual review UI (may be added later).
* Deep visual AI analysis for alt text quality (optional later feature).
* On-premise deployments (could be planned later).

---

# 4. Users & Roles

* **Org Admin**: configure scans, thresholds, view all organization reports, manage share links.
* **Auditor / Developer**: run scans, review detailed page-level results, export artifacts.
* **Viewer (Public)**: access shared reports via expirable share links (no auth).
* **System / DevOps**: maintain infrastructure, monitor system health.

---

# 5. Functional Requirements

1. **Scan Submission**

   * Accept a target URL and scan configuration (depth, maxPages, ruleset, scheduled scan options).
   * Validate and normalize submitted URL.

2. **Sitemap Ingestion**

   * Detect and parse `robots.txt` and `sitemap.xml` / `sitemap_index.xml` and seed URLs.

3. **Crawl & Audit**

   * Discover internal links and enqueue crawl/audit jobs.
   * Render pages in Playwright and run axe-core audits.
   * Extract DOM snapshots, HTML snippets, and screenshots for evidence.

4. **Deduplication & Normalization**

   * Normalize URLs (strip tracking params, fragments, canonicalization, trailing slash rules).
   * Maintain a per-scan visited set (Redis) to avoid duplicate work.

5. **Priority Selection & Sampling**

   * Compute a priority score for discovered URLs (depth, inbound link count, page type, pattern grouping).
   * Prioritize high-impact pages (homepage, contact, product/service, checkout flows).
   * Apply sampling policy for repetitive templates (e.g., product pages): audit top N per pattern.

6. **Queue & Work Distribution**

   * Use BullMQ (Redis) for job queues and retries.
   * Use job types: `seed`, `crawl`, `audit`, `aggregate`, `export`.

7. **Playwright Worker Behavior**

   * Pool browsers/contexts carefully, abort images/fonts/media for speed.
   * Use deterministic settings: viewport, user agent, tool versions.
   * Inject axe-core and run configured rules/tags.

8. **Aggregation & Compliance Engine**

   * Map axe rule IDs to WCAG success criteria.
   * Apply configurable weighting to compute page-level and site-level scores.
   * Apply organizational thresholds and return a Pass/Fail compliance decision.
   * Persist the exact methodology & config used for each scan.

9. **Reporting & Exports**

   * Store raw axe JSON, per-page issues, screenshots, and site-level aggregates.
   * Provide exports: PDF (official report), CSV (issues table), JSON (raw data).
   * Generate immutable report artifacts and optionally sign or hash for tamper evidence.

10. **Shareable Links**

    * Create expirable public share links and optional password protection.

11. **Scheduling & Monitoring**

    * Support scheduled/recurring scans.
    * Track scan progress, failures and retries; provide live progress updates.

12. **Security & Data Governance**

    * Multi-tenant isolation, encrypted storage, audit logs of access.
    * Retention and deletion policies.

13. **Auditability**

    * Store tool versions (axe, Playwright, Chromium), scan config, and raw outputs.
    * Provide an immutable audit trail and the ability to reproduce a scan with stored config.

---

# 6. Non-Functional Requirements

* **Scalability**: horizontally scalable worker pool and stateless services.
* **Performance**: parallel workers, resource optimizations (route blocking), and sampling strategies.
* **Reliability**: retries, exponential backoff, and job monitoring.
* **Security**: TLS, encrypted storage, role-based access, tamper-evident reports.
* **Observability**: metrics (pages/sec, job latency, failures), structured logs, traces.
* **Compliance**: preserve raw outputs and methodology versions for legal audits.

---

# 7. High-level Architecture

Components:

* **Frontend (Next.js)** — UI, WebSockets/SSE for progress, print-friendly report pages used by PDF generator.
* **API Gateway / Auth** — REST/GraphQL endpoints, authentication, rate limits.
* **Orchestrator Service** — seeds URLs (sitemap/robots), validates scan configs.
* **Queue (BullMQ + Redis)** — job store, priorities, retries.
* **Worker Pool (Playwright Workers)** — crawl + render + run axe-core + extract links + screenshots.
* **Aggregation / Compliance Engine** — score calculation, mapping of rules → WCAG, Pass/Fail.
* **Database (MongoDB)** — scans, page results, metadata.
* **Artifact Store (S3)** — screenshots, raw axe JSON, exported PDFs/CSVs.
* **Export Service** — render report HTML → PDF (Puppeteer/Playwright), CSV/JSON generators.
* **Sharing Service** — public links, expiry, password protection.
* **Monitoring & Logging** — Prometheus/Grafana, structured logs, alerts.

---

# 8. Data Models (examples)

## Scan

```json
{
  "_id":"scanId",
  "orgId":"orgId",
  "targetUrl":"https://example.com",
  "config":{ "depth":3, "maxPages":1000, "axeTags":["wcag2a","wcag2aa"] },
  "status":"running",
  "createdAt":"ISO",
  "toolVersions": { "axe":"4.x", "playwright":"1.x", "chromium":"..."}
}
```

## PageResult

```json
{
  "scanId":"scanId",
  "url":"https://example.com/about",
  "normalizedUrl":"...",
  "depth":1,
  "links":["..."],
  "axeRaw": {...},
  "issues":[{"ruleId":"image-alt","impact":"serious","nodes": [...] }],
  "screenshot":"s3://bucket/...png",
  "createdAt":"ISO"
}
```

## Report

```json
{
  "scanId":"scanId",
  "score":82,
  "status":"pass",
  "breakdown":{ "contrast": {...}, "labels": {...} },
  "evidenceSummary":[ {"url":"...","screenshot":"s3://..."}],
  "hash":"sha256:..."
}
```

---

# 9. API Contract (abridged)

```
POST /api/scans                 # create a scan (returns scanId)
GET /api/scans/:scanId/status   # get scan status and progress
GET /api/reports/:reportId      # fetch report JSON
GET /api/reports/:reportId/pdf  # download report PDF
GET /api/reports/:reportId/csv  # download CSV
POST /api/reports/:reportId/share  # create share link
GET /public/report/:shareId     # public view of shared report
```

Authentication: JWT bearer tokens for org users.

---

# 10. Crawling & Deduplication Strategy

## URL Discovery

* Priority of sources: `sitemap.xml` → internal links → manually submitted URLs.
* Respect `robots.txt` (configurable per-scan).

## Normalization rules

* Strip tracking query params (configurable blacklist e.g., `utm_*`).
* Remove fragment (`#...`).
* Normalize trailing slash and index pages.
* Use `<link rel="canonical">` when present as guidance.

## Deduplication

* Use Redis set per scan: `visited:<scanId>`.
* Before enqueueing a URL, normalize and check membership.

---

# 11. Priority Selection & Sampling

Priority score factors:

* Page importance (homepage, contact, product listing)
* Link depth (lower depth = higher priority)
* Internal inbound link count
* URL pattern / template grouping
* URL length heuristic
* Content heuristics (presence of forms/buttons/main)

Selection strategy:

* Hybrid: Top N by score + K per pattern + random sample for coverage.
* Audit sample size configurable (e.g., 10% or up to X pages).

---

# 12. Playwright Worker Design & Optimizations

Worker responsibilities (per job):

1. Acquire normalized URL and check `visited` set.
2. Launch page using pooled browser/context with deterministic config.
3. Route block images, fonts, media, trackers.
4. Wait heuristically (networkidle + DOM checks) before running axe.
5. Inject axe-core and run axe.run with configured tags/rules.
6. Capture full page screenshot and minimal HTML snapshot.
7. Extract internal links and push new crawl jobs.
8. Persist raw results and artifacts to DB/S3 and emit events.

Optimizations:

* Use browser contexts and reuse browser process where safe.
* Limit concurrent pages per process to avoid memory exhaustion.
* Abort heavy network resources to speed rendering.
* Use timeouts and graceful retries.

Pseudocode (worker):

```javascript
async function handleAuditJob(job) {
  const url = job.data.url;
  const normalized = normalizeUrl(url, job.data.scanId);
  if (await redis.sismember(`visited:${job.data.scanId}`, normalized)) return;
  await redis.sadd(`visited:${job.data.scanId}`, normalized);

  const browser = await pool.acquire();
  const page = await browser.newPage({ viewport, userAgent });
  await page.route('**/*', route => {
    if (['image','font','media'].includes(route.request().resourceType())) route.abort();
    else route.continue();
  });

  await page.goto(normalized, { waitUntil: 'networkidle', timeout: PAGE_TIMEOUT });
  await page.addScriptTag({ path: require.resolve('axe-core') });
  const axeResult = await page.evaluate(async (axeConfig) => axe.run(document, axeConfig));
  const links = await extractLinks(page);

  const screenshot = await page.screenshot({ fullPage: true });
  await s3.upload(screenshot);
  await db.pages.insertOne({ scanId, url: normalized, axeRaw: axeResult, screenshot: s3Url, links });

  for (const link of links) {
    const n = normalizeUrl(link, job.data.scanId);
    if (!await redis.sismember(`visited:${job.data.scanId}`, n)) {
      await queue.add('crawl', { url: n, scanId }, { priority: computePriority(n) });
    }
  }
  pool.release(browser);
}
```

---

# 13. Compliance Engine & Scoring

Responsibilities:

* Map axe `ruleId` and `impact` → WCAG success criteria and internal severity.
* Apply a configurable weighting scheme for each issue type/severity.
* Compute page-level partial scores and an aggregated site-level score.
* Apply organizational/regulatory thresholds (configurable per org or per regulation).
* Produce final decision: `PASS` / `PARTIAL` / `FAIL`.

Example weighting model:

| Impact   | Weight (points) |
| -------- | --------------- |
| critical | 10              |
| serious  | 7               |
| moderate | 4               |
| minor    | 1               |

Sample score calculation (illustrative):

```text
Score = max(0, 100 - sum(issue_count * weight_for_issue))
```

Important:

* The methodology MUST be versioned and included with every report.
* Provide a clear public methodology document suitable for government submission.

---

# 14. Reporting & Exports

Report must contain:

* Report ID, generated timestamp, scan config, and tool versions.
* Site-level score, Pass/Fail status, and threshold used.
* Per-page findings with severity, affected nodes, HTML snippets, and screenshots.
* Raw axe JSON attached or stored with a link.
* Evidence hashes and optional signed certificate for tamper-evidence.

Export formats:

* PDF — official, print-ready report (use Playwright/Puppeteer to render report HTML → PDF).
* CSV — tabular listing of issues (for auditors or developers).
* JSON — raw data for re-ingestion or analysis.

Share links:

* `report/<shareId>` public read-only view.
* Support expiry and optional password protection.

---

# 15. Security, Data Governance & Auditability

* TLS for all traffic, encrypt at rest (DB and S3).
* Multi-tenant data isolation by `orgId`.
* RBAC for user roles and actions.
* Immutable archive of raw scan outputs and versioned methodology.
* Access logs for all report downloads and views.
* Retention and deletion policies configurable per org.
* Consider report signing or storing report hashes on an external ledger for high-assurance use-cases.

---

# 16. Monitoring, Observability & SLOs

Metrics to collect:

* Pages/sec, average page render time, queue length, job failure rate, scan completion time.
* Worker memory/CPU usage and browser process health.

Logging & Tracing:

* Structured logs with trace IDs for long-running scans.
* Distributed tracing for orchestration → worker → aggregation flows.

SLO suggestions:

* Worker job success rate ≥ 99%
* Average page audit latency < 10s (subject to site complexity)
* Queue backlog under threshold

---

# 17. Testing Strategy

* Unit tests for normalization, priority scoring, and compliance calculations.
* Integration tests for worker pipelines against a seeded test site.
* E2E tests simulating full scans in sandbox environment.
* Snapshot testing for report render outputs.

---

# 18. DevOps & Deployment

(DevOps / CI-CD requirements removed for current scope. Can be added later as the system scales.)

---

# 19. Roadmap & Milestones

**MVP (4 weeks)**

* Next.js frontend, API layer, orchestrator.
* Redis + BullMQ queue, 2–3 Playwright workers.
* Basic sitemap seeding, crawl, axe-run, store raw axe JSON, JSON export.

**v1 (8–12 weeks)**

* PDF & CSV exports, share links, priority selection & sampling, basic compliance scoring, scheduled scans, RBAC, multi-tenant support.

**Enterprise (3+ months)**

* Immutable audit logs & report signing, advanced compliance engine with mapping and config, scheduled monitoring, advanced UI for auditors, trend analytics, SLAs.

---

# 20. Acceptance Criteria (Examples)

* Given a valid URL and scan config, the system seeds crawl jobs and completes a scan storing per-page axe results.
* Generated report includes: tool versions, raw axe JSON reference, screenshots for violations, and a computed compliance score.
* Share links provide a public read-only view of the report and obey expiry settings.
* System uses Redis `visited:<scanId>` to avoid duplicate crawl jobs for the same normalized URL.

---

# 21. Next Steps (Recommended immediate tasks)

1. Finalize scoring methodology and version it publicly.
2. Draft API contracts for core endpoints and DB schema migrations.
3. Implement worker skeleton (Playwright container + axe invocation) and local BullMQ queue for testing.
4. Build a minimal Next.js UI to submit scans and show progress.

---

# Appendix

* **Important references**: axe-core documentation, WCAG 2.1 spec, Playwright docs, BullMQ docs.
* **Design decisions**: Use Playwright (multi-browser support, stability) + axe-core for audits; BullMQ + Redis for queue; MongoDB for metadata; S3 for artifacts.

---

---

# 22. UI / UX Design Guide (Inspired by Reference Screens)

## 22.1 Design Philosophy

* Clean, minimal, enterprise SaaS feel
* Data-first UI (reports > decoration)
* Fast scannability (cards, charts, summaries)
* Consistent layout across dashboard and reports
* Accessible UI (ironically important for your product)

---

## 22.2 Layout Structure

### Overall Layout

```
[ Top Navbar ]
[ Sidebar ] [ Main Content Area ]
```

---

### 1. Navbar (Top Bar)

**Purpose:** Global navigation + actions

**Elements:**

* Logo + Product name (left)
* Navigation items:

  * Products
  * Invite Team
  * Plans & Pricing
* Icons:

  * Notifications 🔔
  * Profile avatar
* Primary CTA (right):

  * "New Scan" / "Contact Sales"

**Design Specs:**

* Height: 56–64px
* Background: dark/navy (#0F172A or similar)
* Text: white
* Sticky position

---

### 2. Sidebar

**Purpose:** Feature navigation

**Sections (grouped):**

**Main**

* Home
* Dashboard

**Scan & Monitor**

* Website Scanner (active highlight)

**Manual Testing**

* Workflow Analyzer
* Assisted Tests
* Screen Readers

**Automation**

* Automated Tests

**Other**

* Integrations
* Documentation

---

**Design Specs:**

* Width: 240–260px
* Background: light gray (#F8FAFC)
* Active item:

  * Blue highlight
  * Icon + text bold
* Icons: outline style (Heroicons/Lucide)

---

### 3. Main Content Area

Dynamic based on page:

---

## 22.3 Key Screens

---

### A. All Scans Page

**Layout:**

```
Header (All Scans + CTA)
Filters + Search
Scan List (cards/rows)
```

---

#### Header

* Title: "All Scans"
* CTA: "+ New Scan" (Primary button)

---

#### Filters Row

* Tabs:

  * All scans
  * My scans
* Search input
* Filters dropdown
* Active filter chips

---

#### Scan Card

Each scan shows:

* URL
* Scan type
* Time ("1 hour ago")
* Summary card:

  * Issues count
  * Score (circular progress)
  * Browser used

CTA:

* "View Report"
* "Scan History"

---

### B. Report / Scan Detail Page

---

#### Top Section

* Breadcrumb:

  * All Scans > Domain
* Title: domain name
* Meta:

  * Date
  * Scan ID

---

#### Action Buttons

* Share
* Compare
* Export (Primary CTA)

---

#### Tabs

* Summary (default)
* All Issues
* Scan Logs

---

### Summary Tab Layout

Grid-based card system:

```
[ Score Card ]   [ Issue Summary ]
[ Affected Pages ] [ Affected Components ]
```

---

### 1. Accessibility Score Card

* Circular progress (large)

* Score (0–100)

* Breakdown table:

  * Critical
  * Serious
  * Moderate
  * Minor

* "View score calculation" link

---

### 2. Issue Summary Card

* Donut chart
* Total issues count
* Legend with severity colors:

  * 🔴 Critical
  * 🟣 Serious
  * 🟡 Moderate
  * ⚪ Minor

---

### 3. Affected Pages

* Table:

  * Page URL
  * Score
  * Issues count

---

### 4. Affected Components

* Table of:

  * DOM elements / selectors
  * Issue count

---

### C. Issue Detail Page (Future)

* Issue description
* WCAG mapping
* Code snippet
* Screenshot highlight
* Fix suggestion

---

## 22.4 Design System

---

### Colors

Primary:

* Blue: #2563EB

Neutral:

* Background: #F8FAFC
* Card: #FFFFFF
* Border: #E5E7EB

Severity:

* Critical: #EF4444 (red)
* Serious: #8B5CF6 (purple)
* Moderate: #F59E0B (yellow)
* Minor: #9CA3AF (gray)

---

### Typography

* Font: Inter / system-ui
* Headings: semibold
* Body: regular
* Small text: muted gray

---

### Components

#### Cards

* Rounded: 12–16px
* Shadow: subtle
* Padding: 16–24px

#### Buttons

* Primary: blue filled
* Secondary: outlined

#### Tables

* Clean, spaced rows
* Hover highlight

#### Charts

* Donut charts
* Progress rings

---

### Spacing System

* 4 / 8 / 12 / 16 / 24 / 32 scale

---

## 22.5 UX Guidelines

* Show loading states (scan in progress)
* Use skeleton loaders for reports
* Real-time updates via WebSockets
* Provide empty states ("No scans yet")
* Keep actions obvious (Export, Share, View)
* Prioritize readability over density

---

## 22.6 Accessibility (Important)

* Keyboard navigable UI
* Proper contrast ratios
* ARIA labels for charts
* Focus states visible

---

# 23. Updated Tech Stack (Revised)

## Frontend

* Next.js (App Router)
* Tailwind CSS
* WebSockets / SSE for live scan progress
* Notification system (toasts + alerts)
* Charting (Recharts / Chart.js)
* Print-friendly report pages (for PDF generation)

## Backend Core

* API Gateway / Auth (Node.js / Next API)

  * REST endpoints
  * Rate limiting
  * JWT authentication

* Authentication

  * Google OAuth
  * Email + Password (JWT-based)

* Orchestrator Service

  * Sitemap parsing
  * Scan initialization
  * URL seeding

* Queue System

  * BullMQ + Redis
  * Priority jobs
  * Retry handling

* Worker Pool

  * Playwright
  * axe-core integration
  * Screenshot capture
  * Link extraction

* Aggregation / Compliance Engine

  * WCAG mapping
  * Scoring system
  * Pass/Fail logic

## Data Layer

* MongoDB

  * Scans
  * Page results
  * Reports

## Export & Sharing

* Export Service

  * PDF (Playwright rendering)
  * CSV / JSON generation

* Sharing Service

  * Public links
  * Expiry
  * Password protection

## Monitoring & Infra

* Prometheus + Grafana
* Structured logging
* Alerts & monitoring

---

*End of document.*
