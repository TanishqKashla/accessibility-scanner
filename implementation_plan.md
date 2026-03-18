# Accessibility Scanner — Implementation Plan

## Overview

Build an enterprise-grade web accessibility scanning platform from scratch using **Next.js (App Router) + Tailwind CSS v4** for the frontend, **BullMQ + Upstash Redis** for job queues, **Playwright + axe-core** for auditing, **MongoDB Atlas** for persistence, and **JWT + Google OAuth** for authentication. The system crawls websites, runs automated WCAG audits, computes compliance scores, and generates exportable reports.

### Confirmed Tech Decisions
| Decision | Choice |
|---|---|
| CSS Framework | Tailwind CSS **v4** |
| Database | **MongoDB Atlas** (cloud) |
| Redis | **Upstash** (serverless) |
| Auth | JWT + **Google OAuth** (console project ready) |
| Screenshots | **None** — no screenshot capture or storage |

> [!IMPORTANT]
> **This is a large project.** The plan is organized into 7 sequential phases. I recommend we build and verify each phase incrementally rather than all at once. I'll start with **Phase 1 (Project Setup)** after approval and checkpoint with you before each subsequent phase.

---

## User Review Required

> [!NOTE]
> All tech decisions confirmed by user. S3 removed. No screenshots — Playwright used only for rendering + axe-core audits.

---

## Project Structure

```
accessibility-scanner-website/
├── app/                          # Next.js App Router
│   ├── layout.tsx                # Root layout (Navbar + Sidebar shell)
│   ├── page.tsx                  # Home / Landing
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   └── register/page.tsx
│   ├── (dashboard)/
│   │   ├── layout.tsx            # Dashboard layout (sidebar)
│   │   ├── page.tsx              # Dashboard home
│   │   ├── scans/
│   │   │   ├── page.tsx          # All Scans page
│   │   │   ├── new/page.tsx      # New Scan form
│   │   │   └── [scanId]/
│   │   │       └── page.tsx      # Scan Detail / Report
│   │   └── settings/page.tsx
│   ├── public/
│   │   └── report/[shareId]/page.tsx  # Public shared report
│   └── api/
│       ├── auth/
│       │   ├── login/route.ts
│       │   ├── register/route.ts
│       │   └── google/route.ts
│       ├── scans/
│       │   ├── route.ts              # POST create scan
│       │   └── [scanId]/
│       │       ├── route.ts          # GET scan status
│       │       └── progress/route.ts # SSE progress
│       ├── reports/
│       │   ├── [reportId]/
│       │   │   ├── route.ts          # GET report
│       │   │   ├── pdf/route.ts      # PDF export
│       │   │   ├── csv/route.ts      # CSV export
│       │   │   └── share/route.ts    # POST create share link
│       └── public/
│           └── report/[shareId]/route.ts
├── lib/
│   ├── db/
│   │   ├── connection.ts         # MongoDB Atlas connection
│   │   └── models/
│   │       ├── User.ts
│   │       ├── Organization.ts
│   │       ├── Scan.ts
│   │       ├── PageResult.ts
│   │       ├── Report.ts
│   │       └── ShareLink.ts
│   ├── auth/
│   │   ├── jwt.ts
│   │   ├── middleware.ts
│   │   └── rbac.ts
│   ├── queue/
│   │   ├── connection.ts         # Redis/BullMQ setup
│   │   ├── queues.ts             # Queue definitions
│   │   └── workers/
│   │       ├── seedWorker.ts
│   │       ├── crawlWorker.ts
│   │       ├── auditWorker.ts
│   │       ├── aggregateWorker.ts
│   │       └── exportWorker.ts
│   ├── scanner/
│   │   ├── normalizer.ts         # URL normalization
│   │   ├── dedup.ts              # Redis deduplication
│   │   ├── sitemap.ts            # Sitemap & robots.txt parser
│   │   ├── priority.ts           # Priority scoring
│   │   ├── browserPool.ts        # Playwright browser pool (no screenshots)
│   │   └── axeRunner.ts          # axe-core injection & run
│   ├── compliance/
│   │   ├── wcagMapping.ts        # axe ruleId → WCAG SC mapping
│   │   ├── scoring.ts            # Weighted scoring engine
│   │   └── engine.ts             # Pass/Partial/Fail logic
│   ├── export/
│   │   ├── pdf.ts
│   │   ├── csv.ts
│   │   └── json.ts
├── components/
│   ├── layout/
│   │   ├── Navbar.tsx
│   │   ├── Sidebar.tsx
│   │   └── MainContent.tsx
│   ├── scans/
│   │   ├── ScanCard.tsx
│   │   ├── ScanFilters.tsx
│   │   └── NewScanForm.tsx
│   ├── reports/
│   │   ├── ScoreRing.tsx
│   │   ├── IssueSummaryChart.tsx
│   │   ├── AffectedPages.tsx
│   │   └── AffectedComponents.tsx
│   └── ui/
│       ├── Button.tsx
│       ├── Card.tsx
│       ├── Table.tsx
│       ├── Badge.tsx
│       └── Loading.tsx
├── workers/                      # Standalone worker process
│   └── index.ts                  # Starts BullMQ workers
├── tailwind.config.ts
├── .env.local                    # Environment variables
└── package.json
```

---

## Proposed Changes — Phase by Phase

---

### Phase 1: Project Setup & Foundation

Initialize the project with all tooling and create the design system + shared layout.

#### [NEW] Project initialization

- Initialize Next.js with App Router + Tailwind CSS v4 (using `create-next-app`)
- Install dependencies: `mongoose`, `@upstash/redis`, `bullmq`, `playwright`, `axe-core`, `jsonwebtoken`, `bcryptjs`, `recharts`, `lucide-react`

#### [NEW] [tailwind.config.ts](file:///d:/TANISHQ%20KASHLA/EnableUser/accessibility-scanner-website/tailwind.config.ts)

Custom theme with design system colors, fonts, spacing from Section 22.4 of the doc.

#### [NEW] [app/globals.css](file:///d:/TANISHQ%20KASHLA/EnableUser/accessibility-scanner-website/app/globals.css)

Tailwind directives + custom utilities for the design system.

#### [NEW] Layout components

- [Navbar.tsx](file:///d:/TANISHQ%20KASHLA/EnableUser/accessibility-scanner-website/components/layout/Navbar.tsx) — sticky top bar, dark navy, logo, nav links, profile, "New Scan" CTA
- [Sidebar.tsx](file:///d:/TANISHQ%20KASHLA/EnableUser/accessibility-scanner-website/components/layout/Sidebar.tsx) — 240px, grouped nav items, active state with blue highlight
- [app/layout.tsx](file:///d:/TANISHQ%20KASHLA/EnableUser/accessibility-scanner-website/app/layout.tsx) — root layout composing Navbar + Sidebar + main area

#### [NEW] Shared UI components

- `Button.tsx`, `Card.tsx`, `Table.tsx`, `Badge.tsx`, `Loading.tsx` — reusable primitives

---

### Phase 2: Authentication & Database

#### [NEW] [lib/db/connection.ts](file:///d:/TANISHQ%20KASHLA/EnableUser/accessibility-scanner-website/lib/db/connection.ts)

MongoDB Atlas connection with Mongoose, singleton pattern for Next.js.



#### [NEW] Mongoose models

- `User.ts` — email, hashedPassword, role, orgId, googleId
- `Organization.ts` — name, settings, thresholds
- `Scan.ts` — targetUrl, config, status, toolVersions, orgId, timestamps
- `PageResult.ts` — scanId, url, normalizedUrl, depth, axeRaw, issues
- `Report.ts` — scanId, score, status, breakdown, hash
- `ShareLink.ts` — reportId, shareId, expiresAt, password

#### [NEW] Auth API routes

- `api/auth/register/route.ts` — create user with bcrypt-hashed password
- `api/auth/login/route.ts` — verify credentials, return JWT
- `api/auth/google/route.ts` — Google OAuth callback

#### [NEW] Auth middleware

- `lib/auth/jwt.ts` — sign/verify JWT tokens
- `lib/auth/middleware.ts` — protect API routes
- `lib/auth/rbac.ts` — role-based access control checks

---

### Phase 3: Core Backend — Scan Engine

This is the heart of the system.

#### [NEW] [lib/queue/connection.ts](file:///d:/TANISHQ%20KASHLA/EnableUser/accessibility-scanner-website/lib/queue/connection.ts)

Upstash Redis connection for BullMQ.



#### [NEW] [lib/queue/queues.ts](file:///d:/TANISHQ%20KASHLA/EnableUser/accessibility-scanner-website/lib/queue/queues.ts)

Define BullMQ queues: `seed`, `crawl`, `audit`, `aggregate`, `export`.

#### [NEW] [lib/scanner/normalizer.ts](file:///d:/TANISHQ%20KASHLA/EnableUser/accessibility-scanner-website/lib/scanner/normalizer.ts)

URL normalization: strip tracking params, fragments, trailing slash, canonicalization.

#### [NEW] [lib/scanner/dedup.ts](file:///d:/TANISHQ%20KASHLA/EnableUser/accessibility-scanner-website/lib/scanner/dedup.ts)

Redis `visited:<scanId>` set for deduplication.

#### [NEW] [lib/scanner/sitemap.ts](file:///d:/TANISHQ%20KASHLA/EnableUser/accessibility-scanner-website/lib/scanner/sitemap.ts)

Parse `robots.txt`, `sitemap.xml`, and `sitemap_index.xml` to seed URLs.

#### [NEW] [lib/scanner/browserPool.ts](file:///d:/TANISHQ%20KASHLA/EnableUser/accessibility-scanner-website/lib/scanner/browserPool.ts)

Playwright browser pool: acquire/release browsers, deterministic viewport/UA, resource blocking. No screenshot capture.

#### [NEW] [lib/scanner/axeRunner.ts](file:///d:/TANISHQ%20KASHLA/EnableUser/accessibility-scanner-website/lib/scanner/axeRunner.ts)

Inject axe-core into page, run with configured tags, return structured results.

#### [NEW] [lib/scanner/priority.ts](file:///d:/TANISHQ%20KASHLA/EnableUser/accessibility-scanner-website/lib/scanner/priority.ts)

Priority scoring: depth, inbound links, page type, URL pattern, length heuristic.

#### [NEW] BullMQ Workers

- `seedWorker.ts` — parse sitemap, seed crawl jobs
- `crawlWorker.ts` — render page, extract links, enqueue audit
- `auditWorker.ts` — run axe-core, store results
- `aggregateWorker.ts` — compute scores after all pages scanned

#### [NEW] Scan API routes

- `POST /api/scans` — create scan, enqueue seed job
- `GET /api/scans/:scanId` — return status/progress
- `GET /api/scans/:scanId/progress` — SSE endpoint for live updates

#### [NEW] [workers/index.ts](file:///d:/TANISHQ%20KASHLA/EnableUser/accessibility-scanner-website/workers/index.ts)

Standalone Node.js process that starts all BullMQ workers.

---

### Phase 4: Compliance Engine

#### [NEW] [lib/compliance/wcagMapping.ts](file:///d:/TANISHQ%20KASHLA/EnableUser/accessibility-scanner-website/lib/compliance/wcagMapping.ts)

Map axe `ruleId` → WCAG 2.1 success criteria.

#### [NEW] [lib/compliance/scoring.ts](file:///d:/TANISHQ%20KASHLA/EnableUser/accessibility-scanner-website/lib/compliance/scoring.ts)

Weighted score calculation: `Score = max(0, 100 - Σ(count × weight))`.

#### [NEW] [lib/compliance/engine.ts](file:///d:/TANISHQ%20KASHLA/EnableUser/accessibility-scanner-website/lib/compliance/engine.ts)

Apply org thresholds, compute Pass/Partial/Fail, version methodology.

---

### Phase 5: Frontend — Dashboard & Scan Pages

#### [NEW] All Scans page

- `app/(dashboard)/scans/page.tsx` — scan list with cards, filters, search
- `ScanCard.tsx` — URL, scan type, time, score ring, issue count
- `ScanFilters.tsx` — tabs (All/My scans), search, filter chips

#### [NEW] New Scan form

- `app/(dashboard)/scans/new/page.tsx` — URL input, depth, maxPages, ruleset config

#### [NEW] Scan Detail / Report page

- `app/(dashboard)/scans/[scanId]/page.tsx` — breadcrumb, tabs (Summary/Issues/Logs)
- `ScoreRing.tsx` — large circular progress chart
- `IssueSummaryChart.tsx` — donut chart with severity breakdown
- `AffectedPages.tsx` — table of pages with scores
- `AffectedComponents.tsx` — table of DOM elements with issue counts

#### [NEW] Dashboard home

- `app/(dashboard)/page.tsx` — overview stats, recent scans

---

### Phase 6: Reporting & Exports

#### [NEW] [lib/export/pdf.ts](file:///d:/TANISHQ%20KASHLA/EnableUser/accessibility-scanner-website/lib/export/pdf.ts)

Render report HTML → PDF via Playwright.

#### [NEW] [lib/export/csv.ts](file:///d:/TANISHQ%20KASHLA/EnableUser/accessibility-scanner-website/lib/export/csv.ts)

Generate CSV issue table.

#### [NEW] Report API routes

- `GET /api/reports/:reportId` — report JSON
- `GET /api/reports/:reportId/pdf` — download PDF
- `GET /api/reports/:reportId/csv` — download CSV
- `POST /api/reports/:reportId/share` — create share link

#### [NEW] Public report page

- `app/public/report/[shareId]/page.tsx` — read-only report view with expiry check

---

### Phase 7: Polish & Testing

- Accessibility audit of own UI (keyboard nav, contrast, ARIA)
- Performance optimizations (route blocking, sampling)
- Empty states, loading skeletons, error handling
- Structured logging and basic monitoring

---

## Verification Plan

### Phase 1 Verification
- **Browser test**: Run `npm run dev`, open in browser, verify layout renders (Navbar, Sidebar, Main area) correctly
- **Visual check**: Confirm design system colors, typography, and spacing match spec

### Phase 2 Verification
- **Manual test**: Register a user via API, login, receive JWT, use JWT to access protected routes
- Verify MongoDB connection and model creation

### Phase 3 Verification
- **Integration test**: Submit a scan for a small test site (e.g., `https://example.com`), verify:
  - Seed job created
  - Pages crawled and stored in DB
  - axe-core results captured
- **Unit tests** (to be written): URL normalization, deduplication logic, priority scoring

### Phase 4 Verification
- **Unit tests** (to be written): Scoring calculation with known inputs, WCAG mapping correctness, Pass/Fail thresholds

### Phase 5 Verification
- **Browser test**: Navigate all pages, verify UI renders correctly, charts display, filters work

### Phase 6 Verification
- **Manual test**: Generate PDF/CSV exports, verify content and formatting
- **Manual test**: Create share link, access via public URL, verify expiry

### Phase 7 Verification
- Run full test suite
- Accessibility audit using the scanner on itself

---

## Recommended Build Order

I recommend building this **phase by phase** and checkpointing after each:

1. **Phase 1** → verify layout & design system
2. **Phase 2** → verify auth flow works
3. **Phase 3** → verify a scan runs end-to-end
4. **Phase 4** → verify scoring produces correct results
5. **Phase 5** → verify all pages render properly
6. **Phase 6** → verify exports work
7. **Phase 7** → final polish
