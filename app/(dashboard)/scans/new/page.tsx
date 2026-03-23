"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  Globe,
  Settings2,
  ChevronDown,
  ArrowLeft,
  Play,
  Info,
} from "lucide-react";
import Link from "next/link";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";

export default function NewScanPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const isAdmin = (session?.user as { role?: string })?.role === "admin";
  const [url, setUrl] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [config, setConfig] = useState({
    depth: 3,
    maxPages: 100,
    ruleset: "wcag2aa",
    respectRobots: true,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const rulesetToTags = (ruleset: string): string[] => {
    switch (ruleset) {
      case "wcag2a": return ["wcag2a"];
      case "wcag2aa": return ["wcag2a", "wcag2aa"];
      case "wcag2aaa": return ["wcag2a", "wcag2aa", "wcag2aaa"];
      case "wcag21a": return ["wcag2a", "wcag2aa"];
      default: return ["wcag2a", "wcag2aa"];
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;

    setLoading(true);
    setError("");

    try {
      if (!session) {
        setError("You must be logged in to start a scan.");
        setLoading(false);
        return;
      }

      const res = await fetch("/api/scans", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          targetUrl: url,
          config: isAdmin
            ? {
              depth: config.depth,
              maxPages: config.maxPages,
              axeTags: rulesetToTags(config.ruleset),
              respectRobots: config.respectRobots,
            }
            : {},
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to create scan.");
        setLoading(false);
        return;
      }

      const data = await res.json();
      router.push(`/scans/${data.scanId}`);
    } catch {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* Back */}
      <Link
        href="/scans"
        className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to scans
      </Link>

      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">New Scan</h1>
        <p className="mt-1 text-sm text-muted">
          Enter a URL to run an accessibility audit
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit}>
        <Card className="space-y-6">
          {/* Error */}
          {error && (
            <div className="rounded-lg border border-fail/20 bg-fail-bg px-4 py-3 text-sm text-fail">
              {error}
            </div>
          )}

          {/* URL Input */}
          <div>
            <label
              htmlFor="scan-url"
              className="mb-2 block text-sm font-semibold text-foreground"
            >
              Website URL
            </label>
            <div className="relative">
              <Globe className="absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-light" />
              <input
                id="scan-url"
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://example.com"
                required
                className="h-12 w-full rounded-xl border border-border bg-card pl-11 pr-4 text-base text-foreground placeholder-muted-light outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <p className="mt-1.5 flex items-center gap-1 text-xs text-muted-light">
              <Info className="h-3 w-3" />
              Enter the full URL including https://
            </p>
          </div>

          {/* Advanced Settings Toggle — admin only */}
          {isAdmin && (
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex items-center gap-2 text-sm font-medium text-primary hover:text-primary-hover transition-colors"
            >
              <Settings2 className="h-4 w-4" />
              Advanced Settings
              <ChevronDown
                className={`h-4 w-4 transition-transform duration-200 ${showAdvanced ? "rotate-180" : ""}`}
              />
            </button>
          )}

          {/* Advanced Settings */}
          {isAdmin && showAdvanced && (
            <div className="space-y-4 rounded-xl border border-border bg-sidebar p-4">
              {/* Crawl Depth */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="depth"
                    className="mb-1.5 block text-sm font-medium text-foreground"
                  >
                    Crawl Depth
                  </label>
                  <input
                    id="depth"
                    type="number"
                    min={1}
                    max={10}
                    value={config.depth}
                    onChange={(e) =>
                      setConfig({ ...config, depth: Number(e.target.value) })
                    }
                    className="h-10 w-full rounded-lg border border-border bg-card px-3 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                  />
                </div>

                {/* Max Pages */}
                <div>
                  <label
                    htmlFor="maxPages"
                    className="mb-1.5 block text-sm font-medium text-foreground"
                  >
                    Max Pages
                  </label>
                  <input
                    id="maxPages"
                    type="number"
                    min={1}
                    max={1000}
                    value={config.maxPages}
                    onChange={(e) =>
                      setConfig({ ...config, maxPages: Number(e.target.value) })
                    }
                    className="h-10 w-full rounded-lg border border-border bg-card px-3 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                  />
                </div>
              </div>

              {/* Ruleset */}
              <div>
                <label
                  htmlFor="ruleset"
                  className="mb-1.5 block text-sm font-medium text-foreground"
                >
                  WCAG Ruleset
                </label>
                <select
                  id="ruleset"
                  value={config.ruleset}
                  onChange={(e) =>
                    setConfig({ ...config, ruleset: e.target.value })
                  }
                  className="h-10 w-full rounded-lg border border-border bg-card px-3 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                >
                  <option value="wcag2a">WCAG 2.1 Level A</option>
                  <option value="wcag2aa">WCAG 2.1 Level AA</option>
                  <option value="wcag2aaa">WCAG 2.1 Level AAA</option>
                  <option value="wcag21a">WCAG 2.1 A + AA</option>
                </select>
              </div>

              {/* Respect robots.txt */}
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.respectRobots}
                  onChange={(e) =>
                    setConfig({ ...config, respectRobots: e.target.checked })
                  }
                  className="h-4 w-4 rounded border-border text-primary focus:ring-primary/20"
                />
                <span className="text-sm text-foreground">
                  Respect robots.txt
                </span>
              </label>
            </div>
          )}

          {/* Submit */}
          <div className="flex justify-end gap-3 pt-2">
            <Link href="/scans">
              <Button type="button" variant="secondary">
                Cancel
              </Button>
            </Link>
            <Button
              type="submit"
              loading={loading}
              icon={<Play className="h-4 w-4" />}
            >
              Start Scan
            </Button>
          </div>
        </Card>
      </form>
    </div>
  );
}
