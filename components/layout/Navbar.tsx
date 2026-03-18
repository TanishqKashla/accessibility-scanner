"use client";

import Link from "next/link";
import { useState } from "react";
import {
  Bell,
  Plus,
  ChevronDown,
  User,
  Settings,
  LogOut,
  Shield,
} from "lucide-react";

export default function Navbar() {
  const [profileOpen, setProfileOpen] = useState(false);

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
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary transition-all duration-200 group-hover:scale-105">
            <Shield className="h-5 w-5 text-white" strokeWidth={2.5} />
          </div>
          <span className="text-lg font-bold text-white tracking-tight">
            EnableUser
          </span>
        </Link>
      </div>

      {/* Nav Links */}
      <div className="hidden md:flex items-center gap-1">
        <NavLink href="/scans">Products</NavLink>
        <NavLink href="/invite">Invite Team</NavLink>
        <NavLink href="/pricing">Plans & Pricing</NavLink>
      </div>

      {/* Right Actions */}
      <div className="flex items-center gap-3">
        {/* New Scan CTA */}
        <Link
          href="/scans/new"
          className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition-all duration-200 hover:bg-primary-hover hover:shadow-lg active:scale-[0.97]"
        >
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">New Scan</span>
        </Link>

        {/* Notifications */}
        <button
          className="relative flex h-9 w-9 items-center justify-center rounded-lg text-white/70 transition-colors hover:bg-white/10 hover:text-white"
          aria-label="Notifications"
        >
          <Bell className="h-5 w-5" />
          <span className="absolute right-1.5 top-1.5 flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75"></span>
            <span className="relative inline-flex h-2 w-2 rounded-full bg-primary"></span>
          </span>
        </button>

        {/* Profile Dropdown */}
        <div className="relative">
          <button
            onClick={() => setProfileOpen(!profileOpen)}
            className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-white/80 transition-colors hover:bg-white/10 hover:text-white"
            aria-expanded={profileOpen}
            aria-haspopup="true"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-linear-to-br from-primary to-blue-400 text-sm font-semibold text-white">
              T
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
                  <p className="text-sm font-semibold text-foreground">
                    Tanishq Kashla
                  </p>
                  <p className="text-xs text-muted">tanishq@example.com</p>
                </div>
                <div className="p-1.5">
                  <DropdownItem href="/settings" icon={Settings}>
                    Settings
                  </DropdownItem>
                  <DropdownItem href="/profile" icon={User}>
                    Profile
                  </DropdownItem>
                  <hr className="my-1.5 border-border" />
                  <DropdownItem href="/logout" icon={LogOut} danger>
                    Sign Out
                  </DropdownItem>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}

function NavLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="rounded-lg px-3 py-2 text-sm font-medium text-white/70 transition-colors hover:bg-white/10 hover:text-white"
    >
      {children}
    </Link>
  );
}

function DropdownItem({
  href,
  icon: Icon,
  children,
  danger = false,
}: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
  danger?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors ${
        danger
          ? "text-fail hover:bg-fail-bg"
          : "text-foreground hover:bg-sidebar-hover"
      }`}
    >
      <Icon className="h-4 w-4" />
      {children}
    </Link>
  );
}
