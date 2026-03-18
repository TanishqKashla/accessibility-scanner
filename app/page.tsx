import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  Shield,
  Activity,
  Globe,
  BarChart3,
  LogIn,
} from "lucide-react";
import Card, { CardHeader, CardTitle } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";

const highlights = [
  {
    title: "Automated WCAG audits",
    description: "Playwright + axe-core pipeline tuned for deterministic, repeatable results.",
    icon: Shield,
  },
  {
    title: "Queue-first architecture",
    description: "BullMQ + Upstash Redis orchestrate crawl, audit, and export jobs at scale.",
    icon: Activity,
  },
  {
    title: "Compliance-grade reports",
    description: "Versioned methodology, CSV/PDF exports, and shareable links for stakeholders.",
    icon: BarChart3,
  },
];

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Landing Navbar */}
      <nav className="sticky top-0 z-50 flex h-16 items-center justify-between border-b border-border bg-card px-6">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
            <Shield className="h-5 w-5 text-white" strokeWidth={2.5} />
          </div>
          <span className="text-lg font-bold text-foreground tracking-tight">
            EnableUser
          </span>
        </Link>
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

      {/* Content */}
      <div className="mx-auto flex max-w-6xl flex-col gap-10 p-6 lg:p-8">
        {/* Hero */}
        <section className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center pt-8">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full bg-primary-50 px-3 py-1 text-xs font-semibold text-primary">
              <span className="h-2 w-2 rounded-full bg-primary" aria-hidden />
              Enterprise accessibility scanner
            </div>
            <div className="space-y-3">
              <h1 className="text-3xl font-bold leading-tight text-foreground sm:text-4xl">
                Ship compliant experiences with automated WCAG audits.
              </h1>
              <p className="text-base text-muted">
                Crawl sites, run axe-core at scale, and generate tamper-evident reports.
                Built for orgs that need repeatability, traceability, and export-ready evidence.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link href="/register">
                <Button size="lg" icon={<Globe className="h-4 w-4" />}>
                  Start Free
                </Button>
              </Link>
              <Link href="/login">
                <Button variant="outline" size="lg" icon={<ArrowRight className="h-4 w-4" />}>
                  Sign In
                </Button>
              </Link>
            </div>
            <div className="flex flex-wrap gap-3 text-sm text-muted">
              <Badge variant="pass" size="sm" dot>WCAG 2.1 ready</Badge>
              <Badge variant="moderate" size="sm" dot>Queue-driven workers</Badge>
              <Badge variant="serious" size="sm" dot>Exportable evidence</Badge>
            </div>
          </div>

          {/* Preview Card */}
          <Card className="border-0 bg-linear-to-br from-card to-primary-50 shadow-xl" padding="lg">
            <CardHeader className="items-start">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Platform preview</p>
                <CardTitle className="mt-2 text-xl">What you get</CardTitle>
              </div>
            </CardHeader>
            <div className="space-y-4">
              <FeatureRow icon={<CheckCircle2 className="h-4 w-4 text-pass" />} text="Automated site crawling + axe-core audits" />
              <FeatureRow icon={<CheckCircle2 className="h-4 w-4 text-pass" />} text="WCAG compliance scoring (Pass/Partial/Fail)" />
              <FeatureRow icon={<CheckCircle2 className="h-4 w-4 text-pass" />} text="PDF, CSV, and JSON report exports" />
              <FeatureRow icon={<CheckCircle2 className="h-4 w-4 text-pass" />} text="Shareable report links with expiry" />
              <FeatureRow icon={<CheckCircle2 className="h-4 w-4 text-pass" />} text="SHA-256 tamper-evident report hashing" />
              <FeatureRow icon={<CheckCircle2 className="h-4 w-4 text-pass" />} text="Real-time scan progress tracking" />
            </div>
          </Card>
        </section>

        {/* Highlights */}
        <section className="grid gap-4 md:grid-cols-3">
          {highlights.map(({ title, description, icon: Icon }) => (
            <Card key={title} hover>
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary-50 text-primary">
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-foreground">{title}</h3>
                  <p className="mt-1 text-sm text-muted">{description}</p>
                </div>
              </div>
            </Card>
          ))}
        </section>

        {/* CTA */}
        <section className="rounded-2xl border border-border bg-card p-6 lg:p-8 text-center">
          <h2 className="text-xl font-semibold text-foreground">
            Ready to audit your website?
          </h2>
          <p className="mt-2 text-sm text-muted max-w-md mx-auto">
            Create an account, enter a URL, and get a full accessibility report in minutes.
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <Link href="/register">
              <Button size="lg">Create Account</Button>
            </Link>
            <Link href="/login">
              <Button variant="secondary" size="lg">Sign In</Button>
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}

function FeatureRow({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-3">
      {icon}
      <span className="text-sm text-foreground">{text}</span>
    </div>
  );
}
