# Accessibility Scanner — Project Build Plan

## Phase 1: Project Setup & Foundation
- [x] Initialize Next.js project with App Router + Tailwind CSS v4
- [x] Set up project structure (folders, configs, environment)
- [x] Install core dependencies (MongoDB, Redis, BullMQ, Playwright, axe-core)
- [x] Set up design system (colors, typography, spacing, components)
- [x] Create shared layout (Navbar, Sidebar, Main Content Area)

## Phase 2: Authentication & Database
- [x] Set up MongoDB connection (Mongoose models)
- [x] Define data models: Scan, PageResult, Report, User, Organization, ShareLink
- [x] Implement JWT-based auth (email + password)
- [ ] Implement Google OAuth
- [x] Add RBAC middleware (Org Admin, Auditor, Viewer)

## Phase 3: Core Backend — Scan Engine
- [x] Build Orchestrator Service (scan initiation, URL seeding, sitemap parsing)
- [x] Implement URL normalization & deduplication (Redis visited set)
- [x] Set up BullMQ + Redis queue system (job types: seed, crawl, audit, aggregate, export)
- [x] Build Playwright Worker Pool (crawl + render + axe-core + link extraction)
- [x] Implement priority scoring for URL selection

## Phase 4: Compliance Engine & Aggregation
- [x] Map axe rule IDs → WCAG success criteria (70+ rules)
- [x] Implement configurable weighting/scoring model
- [x] Compute page-level and site-level scores
- [x] Implement Pass/Partial/Fail compliance decision logic

## Phase 5: Frontend — Dashboard & Scan Pages
- [x] Build "All Scans" page (list, filters, search, scan cards)
- [x] Build "New Scan" form (URL input, config options, API integration)
- [x] Build Scan Detail / Report page (Summary, Issues, Logs tabs)
- [x] Implement live progress via polling
- [x] Build charts (ScoreRing, IssueSummaryChart, AffectedPages, AffectedComponents)

## Phase 6: Reporting & Exports
- [x] Build Export Service (PDF rendering via Playwright, CSV, JSON)
- [x] Add tamper-evidence (SHA-256 hash)
- [x] Build shareable links with expiry & password protection
- [x] Public shared report page (read-only, password gate, expiry check)
- [x] Export dropdown on scan detail page (PDF/CSV/JSON)

## Phase 7: Polish & Testing
- [x] Unit tests — 65 tests across 5 test files (normalizer, priority, scoring, compliance, CSV export)
- [x] Accessibility: skip-to-content link, focus-visible styles, ARIA labels, reduced motion support
- [x] Print styles for reports
- [ ] Integration tests (worker pipeline) — requires live Redis/MongoDB
- [ ] E2E tests (full scan flow) — requires live services
- [ ] Google OAuth implementation
