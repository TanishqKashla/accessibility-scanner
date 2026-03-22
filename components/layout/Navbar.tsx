"use client";

import Link from "next/link";
import { useState } from "react";
import { useSession, signOut } from "next-auth/react";
import {
  Plus,
  ChevronDown,
  LogOut,
  Shield,
} from "lucide-react";

export default function Navbar() {
  const { data: session } = useSession();
  const [profileOpen, setProfileOpen] = useState(false);

  const userName = session?.user?.name ?? session?.user?.email ?? "User";
  const userEmail = session?.user?.email ?? "";
  const initials = userName.charAt(0).toUpperCase();

  const handleSignOut = async () => {
    setProfileOpen(false);
    await signOut({ callbackUrl: "/login" });
  };

  return (
    <nav
      className="sticky top-0 z-50 flex h-16 items-center justify-between border-b border-white/10 bg-navbar px-6"
      style={{ boxShadow: "var(--shadow-navbar)" }}
      role="navigation"
      aria-label="Main navigation"
    >
      {/* Logo + Product Name */}
      <div className="flex items-center gap-3">
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/15 border border-white/25 transition-all duration-200 group-hover:scale-105">
            <Shield className="h-5 w-5 text-white" strokeWidth={2.5} />
          </div>
          <span className="text-lg font-bold text-white tracking-tight">
            EnableUser
          </span>
        </Link>
      </div>

      {/* Right Actions */}
      <div className="flex items-center gap-3">
        {/* New Scan CTA */}
        <Link
          href="/scans/new"
          className="flex items-center gap-2 rounded-lg bg-white/15 px-4 py-2 text-sm font-semibold text-white transition-all duration-200 hover:bg-white/25 hover:shadow-lg active:scale-[0.97] border border-white/20"
        >
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">New Scan</span>
        </Link>

        {/* Profile Dropdown */}
        <div className="relative">
          <button
            onClick={() => setProfileOpen(!profileOpen)}
            className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-white/80 transition-colors hover:bg-white/10 hover:text-white"
            aria-expanded={profileOpen}
            aria-haspopup="true"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 border border-white/30 text-sm font-semibold text-white">
              {initials}
            </div>
            <ChevronDown
              className={`h-4 w-4 transition-transform duration-200 ${profileOpen ? "rotate-180" : ""}`}
            />
          </button>

          {profileOpen && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setProfileOpen(false)}
              />
              <div className="absolute right-0 top-12 z-50 w-56 overflow-hidden rounded-xl border border-border bg-card shadow-xl animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="border-b border-border p-3">
                  <p className="text-sm font-semibold text-foreground truncate">
                    {userName}
                  </p>
                  <p className="text-xs text-muted truncate">{userEmail}</p>
                </div>
                <div className="p-1.5">
                  <button
                    onClick={handleSignOut}
                    className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-fail transition-colors hover:bg-fail-bg"
                  >
                    <LogOut className="h-4 w-4" />
                    Sign Out
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}

