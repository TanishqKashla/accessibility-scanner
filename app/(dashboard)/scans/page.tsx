"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import {
  Plus,
  Search,
  Filter,
  Globe,
  ArrowRight,
  X,
} from "lucide-react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import ScanCard, { type ScanData } from "@/components/scans/ScanCard";
import { SkeletonCard } from "@/components/ui/Loading";

type TabType = "all" | "my";

export default function AllScansPage() {
  const { status } = useSession();
  const [activeTab, setActiveTab] = useState<TabType>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [scans, setScans] = useState<ScanData[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchScans = useCallback(async () => {
    if (status !== "authenticated") return;

    try {
      const params = new URLSearchParams();
      if (activeTab === "my") params.set("myScans", "true");

      const res = await fetch(`/api/scans?${params.toString()}`);

      if (res.ok) {
        const data = await res.json();
        setScans(data.scans || []);
      }
    } catch (err) {
      console.error("Failed to fetch scans:", err);
    } finally {
      setLoading(false);
    }
  }, [activeTab, status]);

  useEffect(() => {
    fetchScans();
  }, [fetchScans]);

  // Filter by search query
  const filtered = searchQuery
    ? scans.filter((s) =>
        s.targetUrl.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : scans;

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">All Scans</h1>
          <p className="mt-1 text-sm text-muted">
            View and manage your accessibility scans
          </p>
        </div>
        <Link href="/scans/new">
          <Button icon={<Plus className="h-4 w-4" />}>New Scan</Button>
        </Link>
      </div>

      {/* Filters Row */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-1 rounded-lg bg-sidebar p-1">
          <TabButton
            active={activeTab === "all"}
            onClick={() => setActiveTab("all")}
          >
            All scans
          </TabButton>
          <TabButton
            active={activeTab === "my"}
            onClick={() => setActiveTab("my")}
          >
            My scans
          </TabButton>
        </div>

        <div className="flex items-center gap-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-light" />
            <input
              type="text"
              placeholder="Search by URL..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-9 rounded-lg border border-border bg-card pl-9 pr-3 text-sm text-foreground placeholder-muted-light outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20 w-64"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-light hover:text-muted"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Filters */}
          <Button variant="secondary" size="sm" icon={<Filter className="h-3.5 w-3.5" />}>
            Filters
          </Button>
        </div>
      </div>

      {/* Scan List */}
      {loading ? (
        <div className="grid gap-4">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : filtered.length === 0 ? (
        <Card className="py-20">
          <div className="flex flex-col items-center justify-center text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-50">
              <Globe className="h-8 w-8 text-primary" />
            </div>
            <h3 className="mb-2 text-base font-semibold text-foreground">
              {searchQuery ? "No matching scans" : "No scans yet"}
            </h3>
            <p className="mb-6 max-w-sm text-sm text-muted">
              {searchQuery
                ? "Try adjusting your search query."
                : "Run your first accessibility scan to start identifying issues and improving your website's compliance."}
            </p>
            {!searchQuery && (
              <Link href="/scans/new">
                <Button>
                  Start Your First Scan
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            )}
          </div>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filtered.map((scan) => (
            <ScanCard key={scan._id} scan={scan} />
          ))}
        </div>
      )}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-md px-4 py-1.5 text-sm font-medium transition-all duration-150 ${
        active
          ? "bg-card text-foreground shadow-sm"
          : "text-muted hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}
