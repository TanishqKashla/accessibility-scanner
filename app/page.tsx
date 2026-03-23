import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  Shield,
  BarChart3,
  FileText,
  Globe,
  Zap,
  Monitor,
  Download,
  GitBranch,
  Building2,
  LogIn,
  XCircle,
  ChevronDown,
} from "lucide-react";
import Button from "@/components/ui/Button";

// ── Data ─────────────────────────────────────────────────────────────────────

const problems = [
  "Manual audits are slow and prohibitively expensive",
  "Legal exposure from WCAG non-compliance grows yearly",
  "Development teams lack clear, actionable guidance",
  "Inconsistent reporting across projects and vendors",
];

const solutions = [
  "Automated testing in minutes, not weeks",
  "Real-time WCAG issue detection and compliance scoring",
  "Developer-friendly, prioritised, actionable insights",
  "Exportable, tamper-evident compliance evidence packages",
];

const features = [
  {
    icon: Zap,
    title: "Automated Accessibility Audits",
    description:
      "Playwright + axe-core pipeline delivers deterministic, repeatable WCAG results across your entire site.",
  },
  {
    icon: Shield,
    title: "WCAG 2.1 AA Compliance Engine",
    description:
      "Full coverage of WCAG 2.1 Level AA criteria with impact scoring and remediation priority ranking.",
  },
  {
    icon: FileText,
    title: "Detailed Issue Reports",
    description:
      "Every violation surfaced with element selectors, WCAG success criteria references, and guided fixes.",
  },
  {
    icon: Monitor,
    title: "Continuous Monitoring",
    description:
      "Schedule recurring audits to catch accessibility regressions before they reach production.",
  },
  {
    icon: GitBranch,
    title: "Developer Integrations",
    description:
      "Connect to your CI/CD pipeline via REST API, webhooks, and GitHub Actions support.",
  },
  {
    icon: Download,
    title: "Exportable Reports",
    description:
      "PDF, CSV, and JSON exports with SHA-256 tamper-evident hashing — audit trails built in.",
  },
];

const steps = [
  {
    number: "01",
    title: "Connect your website",
    description:
      "Enter your URL and configure crawl depth. EnableStack handles discovery, sitemap parsing, and page inventory automatically.",
  },
  {
    number: "02",
    title: "Run automated audit",
    description:
      "Our engine crawls every page, executes axe-core against the live DOM, and scores compliance in real time.",
  },
  {
    number: "03",
    title: "Fix with guided insights",
    description:
      "Review violations by severity, export evidence packages, and track remediation progress over time.",
  },
];

const stats = [
  { value: "80%", label: "Reduction in audit time" },
  { value: "100+", label: "WCAG criteria tested" },
  { value: "< 5 min", label: "Time to first report" },
  { value: "Zero", label: "Compliance surprises" },
];

const useCases = [
  {
    icon: Building2,
    title: "Banks & Financial Institutions",
    description:
      "Meet regulatory mandates and reduce legal exposure across digital banking products and customer portals.",
  },
  {
    icon: Globe,
    title: "Government & Public Sector",
    description:
      "Comply with Section 508, ADA, and EN 301 549 with audit trails that withstand procurement scrutiny.",
  },
  {
    icon: Zap,
    title: "SaaS Companies",
    description:
      "Integrate accessibility testing into your release pipeline to ship compliant features without slowing delivery.",
  },
  {
    icon: BarChart3,
    title: "E-commerce Platforms",
    description:
      "Ensure every customer — regardless of ability — can discover, evaluate, and complete their purchase journey.",
  },
];

const pricing = [
  {
    name: "Starter",
    price: "Free",
    period: null,
    description: "For individuals exploring accessibility compliance.",
    features: [
      "5 scans per month",
      "Up to 10 pages per scan",
      "PDF & CSV export",
      "Email support",
    ],
    cta: "Start Free",
    href: "/register",
    highlight: false,
  },
  {
    name: "Pro",
    price: "$49",
    period: "/month",
    description: "For teams serious about continuous compliance.",
    features: [
      "Unlimited scans",
      "Up to 500 pages per scan",
      "Scheduled audits",
      "Shareable report links",
      "Priority support",
      "API access",
    ],
    cta: "Start Pro Trial",
    href: "/register",
    highlight: true,
  },
  {
    name: "Enterprise",
    price: "Custom",
    period: null,
    description: "For organisations with advanced requirements.",
    features: [
      "Unlimited everything",
      "SSO & SAML",
      "Custom integrations",
      "Dedicated success manager",
      "SLA guarantees",
      "On-premise option",
    ],
    cta: "Contact Sales",
    href: "/register",
    highlight: false,
  },
];

const faqs = [
  {
    q: "What is WCAG 2.1 AA?",
    a: "WCAG (Web Content Accessibility Guidelines) 2.1 Level AA is the internationally recognised standard for digital accessibility. Meeting AA compliance is legally required in many jurisdictions and ensures your content is accessible to users with disabilities.",
  },
  {
    q: "Is web accessibility legally required?",
    a: "Yes — in many countries and sectors. The ADA (USA), EN 301 549 (EU), AODA (Canada), and similar legislation require digital accessibility. Non-compliance can result in litigation, fines, and significant reputational harm.",
  },
  {
    q: "How accurate is the automated testing?",
    a: "EnableStack uses axe-core, the industry-leading accessibility engine trusted by Microsoft, Google, and Deloitte. Automated tools detect approximately 30–40% of WCAG violations. We surface all automatable issues and clearly flag areas that require manual review.",
  },
  {
    q: "Does EnableStack replace manual audits?",
    a: "No — and we are transparent about that. Automated scanning accelerates and supplements expert review. Our reports identify every automatable violation and guide your team through the manual checks that remain, giving you a complete compliance picture.",
  },
  {
    q: "What integrations are supported?",
    a: "EnableStack provides a REST API, webhook notifications, and CI/CD pipeline support. Native integrations for GitHub Actions, GitLab CI, and Jira are on the roadmap. Enterprise plans include custom integration support.",
  },
];

const complianceBadges = [
  "SOC 2 Ready",
  "GDPR Compliant",
  "WCAG 2.1 AA",
  "ADA",
  "Section 508",
  "EN 301 549",
];

// ── Page ─────────────────────────────────────────────────────────────────────

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background">

      {/* ── Navbar ─────────────────────────────────────────────────────────── */}
      <nav
        className="sticky top-0 z-50 flex h-16 items-center justify-between border-b border-border bg-white/95 backdrop-blur-sm px-6 lg:px-10"
        role="navigation"
        aria-label="Main navigation"
      >
        <Link href="/" className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
            <Shield className="h-5 w-5 text-white" strokeWidth={2.5} />
          </div>
          <span className="text-lg font-bold text-foreground tracking-tight">
            EnableStack
          </span>
        </Link>

        <div className="hidden md:flex items-center gap-8 text-sm font-medium text-muted">
          <a href="#features" className="hover:text-foreground transition-colors">
            Features
          </a>
          <a href="#how-it-works" className="hover:text-foreground transition-colors">
            How it works
          </a>
          <a href="#pricing" className="hover:text-foreground transition-colors">
            Pricing
          </a>
          <a href="#faq" className="hover:text-foreground transition-colors">
            FAQ
          </a>
        </div>

        <div className="flex items-center gap-3">
          <Link href="/login">
            <Button variant="ghost" size="sm" icon={<LogIn className="h-4 w-4" />}>
              Sign In
            </Button>
          </Link>
          <Link href="/register">
            <Button size="sm">Get Started</Button>
          </Link>
        </div>
      </nav>

      {/* ── Hero ───────────────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-6 lg:px-10 pt-20 pb-24">
        <div className="grid gap-14 lg:grid-cols-2 lg:items-center">

          {/* Left — copy + CTAs */}
          <div className="space-y-8">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary-50 px-4 py-1.5 text-xs font-semibold text-primary">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" aria-hidden="true" />
              Compliance-grade accessibility auditing
            </div>

            <div className="space-y-5">
              <h1 className="text-5xl font-bold leading-[1.1] tracking-tight text-foreground lg:text-6xl">
                Accessibility<br />Compliance,{" "}
                <span className="text-primary">Simplified.</span>
              </h1>
              <p className="text-lg text-muted leading-relaxed max-w-xl">
                Audit, test, and ensure your digital products meet WCAG&nbsp;2.1&nbsp;AA
                standards — automatically, at scale, with evidence your legal team
                will thank you for.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link href="/register">
                <Button size="lg" icon={<ArrowRight className="h-4 w-4" />}>
                  Start Free Audit
                </Button>
              </Link>
              <Link href="/register">
                <Button variant="outline" size="lg">
                  Request Demo
                </Button>
              </Link>
            </div>

            <div className="flex flex-wrap items-center gap-6 text-sm text-muted pt-1">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-pass" aria-hidden="true" />
                No credit card required
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-pass" aria-hidden="true" />
                WCAG 2.1 AA ready
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-pass" aria-hidden="true" />
                First report in 5 minutes
              </span>
            </div>
          </div>

          {/* Right — product preview */}
          <div
            className="rounded-2xl border border-border bg-card p-6 space-y-5"
            style={{ boxShadow: "var(--shadow-card-hover)" }}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-primary">
                  Live Audit Preview
                </p>
                <p className="mt-1 text-sm font-semibold text-foreground">example.com</p>
              </div>
              <div className="flex items-center gap-2 rounded-lg border border-pass/30 bg-pass-bg px-3 py-1.5">
                <span className="h-2 w-2 rounded-full bg-pass" aria-hidden="true" />
                <span className="text-xs font-bold text-pass">88 / 100</span>
              </div>
            </div>

            <div className="h-px bg-border" />

            <div className="space-y-2">
              {[
                { label: "Critical", count: 0, color: "text-critical", bg: "bg-critical-bg" },
                { label: "Serious", count: 3, color: "text-serious", bg: "bg-serious-bg" },
                { label: "Moderate", count: 7, color: "text-moderate", bg: "bg-moderate-bg" },
                { label: "Minor", count: 12, color: "text-minor", bg: "bg-minor-bg" },
              ].map(({ label, count, color, bg }) => (
                <div
                  key={label}
                  className="flex items-center justify-between rounded-lg border border-border px-4 py-2.5"
                >
                  <span className="text-sm font-medium text-foreground">{label}</span>
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${bg} ${color}`}>
                    {count} {count === 1 ? "issue" : "issues"}
                  </span>
                </div>
              ))}
            </div>

            <div className="h-px bg-border" />

            <div className="space-y-2">
              {[
                "Automated site crawling + axe-core audits",
                "PDF, CSV, and JSON report exports",
                "SHA-256 tamper-evident hashing",
                "Shareable report links with expiry",
              ].map((text) => (
                <div key={text} className="flex items-center gap-2.5 text-sm text-foreground">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-pass" aria-hidden="true" />
                  {text}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Trust Bar ──────────────────────────────────────────────────────── */}
      <div className="border-y border-border bg-sidebar py-10">
        <div className="mx-auto max-w-4xl px-6 lg:px-10 text-center">
          <p className="text-sm text-muted">
            Trusted by{" "}
            <span className="font-semibold text-foreground">1,000+ compliance teams</span>{" "}
            at banks, government agencies, and enterprise organisations worldwide.
          </p>
        </div>
      </div>

      {/* ── Problem → Solution ─────────────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-6 lg:px-10 py-20">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-foreground lg:text-4xl">
            Accessibility auditing shouldn&apos;t be this hard.
          </h2>
          <p className="mt-4 text-base text-muted max-w-2xl mx-auto">
            Most organisations are caught between slow manual processes and incomplete
            tooling. EnableStack closes the gap.
          </p>
        </div>

        <div className="grid gap-5 lg:grid-cols-2">
          <div
            className="rounded-2xl border border-border bg-card p-8 space-y-5"
            style={{ boxShadow: "var(--shadow-card)" }}
          >
            <p className="text-xs font-semibold uppercase tracking-widest text-fail">
              The problem
            </p>
            <h3 className="text-xl font-semibold text-foreground">Without EnableStack</h3>
            <div className="space-y-3">
              {problems.map((p) => (
                <div key={p} className="flex items-start gap-3 text-sm text-muted">
                  <XCircle className="h-4 w-4 mt-0.5 shrink-0 text-fail" aria-hidden="true" />
                  {p}
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-primary/20 bg-primary-50 p-8 space-y-5">
            <p className="text-xs font-semibold uppercase tracking-widest text-primary">
              The solution
            </p>
            <h3 className="text-xl font-semibold text-foreground">With EnableStack</h3>
            <div className="space-y-3">
              {solutions.map((s) => (
                <div key={s} className="flex items-start gap-3 text-sm text-foreground">
                  <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0 text-pass" aria-hidden="true" />
                  {s}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Features ───────────────────────────────────────────────────────── */}
      <section id="features" className="border-t border-border bg-sidebar py-20">
        <div className="mx-auto max-w-6xl px-6 lg:px-10">
          <div className="text-center mb-12">
            <p className="text-xs font-semibold uppercase tracking-widest text-primary mb-3">
              Platform capabilities
            </p>
            <h2 className="text-3xl font-bold text-foreground lg:text-4xl">
              Everything you need to stay compliant.
            </h2>
            <p className="mt-4 text-base text-muted max-w-2xl mx-auto">
              Built for compliance officers, developers, and QA teams who need
              reliable, reproducible accessibility evidence.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {features.map(({ icon: Icon, title, description }) => (
              <div
                key={title}
                className="rounded-2xl border border-border bg-card p-6 transition-shadow duration-200 hover:shadow-[var(--shadow-card-hover)]"
                style={{ boxShadow: "var(--shadow-card)" }}
              >
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-primary-50 text-primary">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </div>
                <h3 className="text-base font-semibold text-foreground">{title}</h3>
                <p className="mt-2 text-sm text-muted leading-relaxed">{description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How It Works ───────────────────────────────────────────────────── */}
      <section id="how-it-works" className="mx-auto max-w-6xl px-6 lg:px-10 py-20">
        <div className="text-center mb-12">
          <p className="text-xs font-semibold uppercase tracking-widest text-primary mb-3">
            Simple process
          </p>
          <h2 className="text-3xl font-bold text-foreground lg:text-4xl">
            From URL to compliance report in minutes.
          </h2>
        </div>

        <div className="grid gap-10 lg:grid-cols-3">
          {steps.map(({ number, title, description }) => (
            <div key={number} className="space-y-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-white text-sm font-bold tracking-wide">
                {number}
              </div>
              <h3 className="text-base font-semibold text-foreground">{title}</h3>
              <p className="text-sm text-muted leading-relaxed">{description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── ROI Stats ──────────────────────────────────────────────────────── */}
      <div className="bg-primary py-16">
        <div className="mx-auto max-w-6xl px-6 lg:px-10">
          <div className="grid grid-cols-2 gap-10 lg:grid-cols-4">
            {stats.map(({ value, label }) => (
              <div key={label} className="text-center">
                <p className="text-4xl font-bold text-white">{value}</p>
                <p className="mt-2 text-sm text-white/70">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Use Cases ──────────────────────────────────────────────────────── */}
      <section className="border-t border-border bg-sidebar py-20">
        <div className="mx-auto max-w-6xl px-6 lg:px-10">
          <div className="text-center mb-12">
            <p className="text-xs font-semibold uppercase tracking-widest text-primary mb-3">
              Built for your industry
            </p>
            <h2 className="text-3xl font-bold text-foreground lg:text-4xl">
              Accessibility compliance across every sector.
            </h2>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {useCases.map(({ icon: Icon, title, description }) => (
              <div
                key={title}
                className="flex items-start gap-4 rounded-2xl border border-border bg-card p-6"
                style={{ boxShadow: "var(--shadow-card)" }}
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary-50 text-primary">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-foreground">{title}</h3>
                  <p className="mt-1.5 text-sm text-muted leading-relaxed">{description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Enterprise Trust ───────────────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-6 lg:px-10 py-16">
        <div
          className="rounded-2xl border border-border bg-card p-8 lg:p-10 text-center"
          style={{ boxShadow: "var(--shadow-card)" }}
        >
          <p className="text-xs font-semibold uppercase tracking-widest text-primary mb-4">
            Security &amp; compliance
          </p>
          <h2 className="text-2xl font-bold text-foreground">
            Built to enterprise security standards.
          </h2>
          <p className="mt-3 text-sm text-muted max-w-xl mx-auto leading-relaxed">
            EnableStack is designed with security-first principles. Scan data is
            encrypted at rest and in transit. Every report is tamper-evident with
            SHA-256 hashing.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            {complianceBadges.map((badge) => (
              <div
                key={badge}
                className="rounded-lg border border-border bg-sidebar px-4 py-2 text-xs font-semibold text-foreground"
              >
                {badge}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ────────────────────────────────────────────────────────── */}
      <section id="pricing" className="border-t border-border bg-sidebar py-20">
        <div className="mx-auto max-w-6xl px-6 lg:px-10">
          <div className="text-center mb-12">
            <p className="text-xs font-semibold uppercase tracking-widest text-primary mb-3">
              Transparent pricing
            </p>
            <h2 className="text-3xl font-bold text-foreground lg:text-4xl">
              Start free. Scale with confidence.
            </h2>
            <p className="mt-4 text-base text-muted max-w-xl mx-auto">
              No hidden fees. No lock-in. Cancel anytime.
            </p>
          </div>

          <div className="grid gap-5 lg:grid-cols-3">
            {pricing.map(({ name, price, period, description, features: fs, cta, href, highlight }) => (
              <div
                key={name}
                className={`flex flex-col gap-6 rounded-2xl border p-8 ${
                  highlight ? "border-primary bg-primary" : "border-border bg-card"
                }`}
                style={{ boxShadow: "var(--shadow-card)" }}
              >
                <div>
                  <p
                    className={`text-xs font-semibold uppercase tracking-widest ${
                      highlight ? "text-white/60" : "text-muted"
                    }`}
                  >
                    {name}
                  </p>
                  <div className="mt-2 flex items-baseline gap-1">
                    <span
                      className={`text-4xl font-bold ${
                        highlight ? "text-white" : "text-foreground"
                      }`}
                    >
                      {price}
                    </span>
                    {period && (
                      <span className={`text-sm ${highlight ? "text-white/60" : "text-muted"}`}>
                        {period}
                      </span>
                    )}
                  </div>
                  <p className={`mt-2 text-sm ${highlight ? "text-white/70" : "text-muted"}`}>
                    {description}
                  </p>
                </div>

                <div className="flex-1 space-y-3">
                  {fs.map((f) => (
                    <div key={f} className="flex items-center gap-2.5 text-sm">
                      <CheckCircle2
                        className={`h-4 w-4 shrink-0 ${highlight ? "text-white/70" : "text-pass"}`}
                        aria-hidden="true"
                      />
                      <span className={highlight ? "text-white/90" : "text-foreground"}>{f}</span>
                    </div>
                  ))}
                </div>

                <Link href={href} className="block">
                  <Button
                    className="w-full justify-center"
                    variant={highlight ? "secondary" : "primary"}
                    size="lg"
                  >
                    {cta}
                  </Button>
                </Link>
              </div>
            ))}
          </div>

          <p className="mt-8 text-center text-sm text-muted">
            Need custom volumes or on-premise deployment?{" "}
            <Link href="/register" className="font-semibold text-primary hover:underline">
              Contact our sales team →
            </Link>
          </p>
        </div>
      </section>

      {/* ── FAQ ────────────────────────────────────────────────────────────── */}
      <section id="faq" className="mx-auto max-w-3xl px-6 lg:px-10 py-20">
        <div className="text-center mb-12">
          <p className="text-xs font-semibold uppercase tracking-widest text-primary mb-3">
            Common questions
          </p>
          <h2 className="text-3xl font-bold text-foreground lg:text-4xl">
            Frequently asked questions.
          </h2>
        </div>

        <div className="space-y-2">
          {faqs.map(({ q, a }) => (
            <details
              key={q}
              className="group rounded-xl border border-border bg-card overflow-hidden"
            >
              <summary className="flex cursor-pointer items-center justify-between gap-4 px-6 py-4 text-sm font-semibold text-foreground hover:bg-sidebar transition-colors [list-style:none] [&::-webkit-details-marker]:hidden">
                {q}
                <ChevronDown
                  className="h-4 w-4 shrink-0 text-muted transition-transform duration-200 group-open:rotate-180"
                  aria-hidden="true"
                />
              </summary>
              <div className="border-t border-border px-6 pb-5 pt-4 text-sm text-muted leading-relaxed">
                {a}
              </div>
            </details>
          ))}
        </div>
      </section>

      {/* ── Final CTA ──────────────────────────────────────────────────────── */}
      <section className="bg-primary py-20">
        <div className="mx-auto max-w-3xl px-6 lg:px-10 text-center">
          <h2 className="text-3xl font-bold text-white lg:text-4xl">
            Make Accessibility Your<br />Competitive Advantage.
          </h2>
          <p className="mt-4 text-base text-white/70 max-w-xl mx-auto leading-relaxed">
            Join thousands of teams using EnableStack to ship compliant, inclusive
            digital experiences — without slowing down delivery.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Link href="/register">
              <Button variant="secondary" size="lg" icon={<ArrowRight className="h-4 w-4" />}>
                Start Free Audit
              </Button>
            </Link>
            <Link
              href="/register"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/30 px-6 py-3 text-base font-semibold text-white transition-all duration-200 hover:bg-white/10 active:scale-[0.98]"
            >
              Book Demo
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────────────────────────────── */}
      <footer className="border-t border-border bg-card py-16">
        <div className="mx-auto max-w-6xl px-6 lg:px-10">
          <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1fr]">

            {/* Brand */}
            <div className="space-y-4">
              <Link href="/" className="inline-flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
                  <Shield className="h-5 w-5 text-white" strokeWidth={2.5} />
                </div>
                <span className="text-base font-bold text-foreground tracking-tight">
                  EnableStack
                </span>
              </Link>
              <p className="text-sm text-muted leading-relaxed max-w-xs">
                Enterprise-grade accessibility auditing platform. WCAG&nbsp;2.1&nbsp;AA
                compliance made scalable.
              </p>
              <p className="text-xs text-muted-light">
                © {new Date().getFullYear()} EnableStack. All rights reserved.
              </p>
            </div>

            {/* Product */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-foreground mb-4">
                Product
              </p>
              <ul className="space-y-3 text-sm text-muted">
                {[
                  ["Features", "#features"],
                  ["How it works", "#how-it-works"],
                  ["Pricing", "#pricing"],
                  ["Changelog", "#"],
                ].map(([label, href]) => (
                  <li key={label}>
                    <a href={href} className="hover:text-foreground transition-colors">
                      {label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Company */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-foreground mb-4">
                Company
              </p>
              <ul className="space-y-3 text-sm text-muted">
                {[
                  ["About", "#"],
                  ["Blog", "#"],
                  ["Careers", "#"],
                  ["Contact", "#"],
                ].map(([label, href]) => (
                  <li key={label}>
                    <a href={href} className="hover:text-foreground transition-colors">
                      {label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Legal */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-foreground mb-4">
                Legal
              </p>
              <ul className="space-y-3 text-sm text-muted">
                {[
                  ["Privacy Policy", "#"],
                  ["Terms of Service", "#"],
                  ["Cookie Policy", "#"],
                  ["Accessibility", "#"],
                ].map(([label, href]) => (
                  <li key={label}>
                    <a href={href} className="hover:text-foreground transition-colors">
                      {label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </footer>

    </div>
  );
}
