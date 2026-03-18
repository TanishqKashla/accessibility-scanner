"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Globe,
  ArrowRight,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Clock,
} from "lucide-react";
import Card, { CardHeader, CardTitle } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import ScanCard, { type ScanData } from "@/components/scans/ScanCard";
import { SkeletonCard } from "@/components/ui/Loading";

export default function DashboardPage() {
  const [recentScans, setRecentScans] = useState<ScanData[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalScans: 0,
    totalIssues: 0,
    avgScore: "--",
    scansThisWeek: 0,
  });

  useEffect(() => {
    async function fetchData() {
      try {
        const token = localStorage.getItem("token");
        if (!token) {
          setLoading(false);
          return;
        }

        const res = await fetch("/api/scans?limit=5", {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (res.ok) {
          const data = await res.json();
          const scans: ScanData[] = data.scans || [];
          setRecentScans(scans);

          // Calculate stats
          const total = data.pagination?.total || scans.length;
          const completed = scans.filter((s: ScanData) => s.status === "completed");
          const weekAgo = new Date();
          weekAgo.setDate(weekAgo.getDate() - 7);
          const thisWeek = scans.filter(
            (s: ScanData) => new Date(s.createdAt) >= weekAgo
          ).length;

          setStats({
            totalScans: total,
            totalIssues: 0, // Would need separate aggregation endpoint
            avgScore: completed.length > 0 ? "--" : "--",
            scansThisWeek: thisWeek,
          });
        }
      } catch (err) {
        console.error("Failed to fetch dashboard data:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="mt-1 text-sm text-muted">
            Overview of your accessibility scanning activity
          </p>
        </div>
        <Link href="/scans/new">
          <Button icon={<Globe className="h-4 w-4" />}>New Scan</Button>
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total Scans"
          value={String(stats.totalScans)}
          icon={<Globe className="h-5 w-5 text-primary" />}
        />
        <StatCard
          label="Issues Found"
          value={String(stats.totalIssues)}
          icon={<AlertTriangle className="h-5 w-5 text-moderate" />}
        />
        <StatCard
          label="Avg. Score"
          value={stats.avgScore}
          icon={<TrendingUp className="h-5 w-5 text-pass" />}
        />
        <StatCard
          label="Scans This Week"
          value={String(stats.scansThisWeek)}
          icon={<Clock className="h-5 w-5 text-serious" />}
        />
      </div>

      {/* Recent Scans */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Scans</CardTitle>
          <Link
            href="/scans"
            className="flex items-center gap-1 text-sm font-medium text-primary hover:text-primary-hover transition-colors"
          >
            View all
            <ArrowRight className="h-4 w-4" />
          </Link>
        </CardHeader>

        {loading ? (
          <div className="space-y-3">
            <SkeletonCard />
            <SkeletonCard />
          </div>
        ) : recentScans.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-50">
              <Globe className="h-8 w-8 text-primary" />
            </div>
            <h3 className="mb-2 text-base font-semibold text-foreground">
              No scans yet
            </h3>
            <p className="mb-6 max-w-sm text-sm text-muted">
              Start by scanning a website to discover accessibility issues and
              generate compliance reports.
            </p>
            <Link href="/scans/new">
              <Button>
                Start Your First Scan
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {recentScans.map((scan) => (
              <ScanCard key={scan._id} scan={scan} />
            ))}
          </div>
        )}
      </Card>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <QuickActionCard
          title="Scan a Website"
          description="Enter a URL to run a full accessibility audit"
          icon={<Globe className="h-6 w-6" />}
          href="/scans/new"
          color="primary"
        />
        <QuickActionCard
          title="View Reports"
          description="Browse your scan history and compliance reports"
          icon={<CheckCircle2 className="h-6 w-6" />}
          href="/scans"
          color="pass"
        />
        <QuickActionCard
          title="Documentation"
          description="Learn how to configure scans and interpret results"
          icon={<AlertTriangle className="h-6 w-6" />}
          href="/docs"
          color="moderate"
        />
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
}) {
  return (
    <Card hover>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-muted">{label}</p>
          <p className="mt-1.5 text-2xl font-bold text-foreground">{value}</p>
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sidebar">
          {icon}
        </div>
      </div>
    </Card>
  );
}

function QuickActionCard({
  title,
  description,
  icon,
  href,
  color,
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
  href: string;
  color: string;
}) {
  const colorMap: Record<string, string> = {
    primary: "bg-primary-50 text-primary group-hover:bg-primary-light",
    pass: "bg-pass-bg text-pass group-hover:bg-green-100",
    moderate: "bg-moderate-bg text-moderate group-hover:bg-amber-100",
  };

  return (
    <Link href={href}>
      <Card hover className="group cursor-pointer transition-all duration-200 hover:-translate-y-0.5">
        <div className="flex items-start gap-4">
          <div
            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl transition-colors ${colorMap[color] || colorMap.primary}`}
          >
            {icon}
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
              {title}
            </h3>
            <p className="mt-1 text-xs text-muted">{description}</p>
          </div>
        </div>
      </Card>
    </Link>
  );
}
