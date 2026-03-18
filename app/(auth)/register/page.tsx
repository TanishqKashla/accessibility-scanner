"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Shield, Mail, Lock, User, Building2, Eye, EyeOff } from "lucide-react";
import Button from "@/components/ui/Button";

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    orgName: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const update = (field: string, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.email || !form.password) return;

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Registration failed");
        setLoading(false);
        return;
      }

      // Store token and user info
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));

      router.push("/scans");
    } catch {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md">
      {/* Logo */}
      <div className="mb-8 text-center">
        <Link href="/" className="inline-flex items-center gap-2.5">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary">
            <Shield className="h-6 w-6 text-white" strokeWidth={2.5} />
          </div>
          <span className="text-2xl font-bold text-foreground tracking-tight">
            EnableUser
          </span>
        </Link>
        <p className="mt-3 text-sm text-muted">
          Create your account to start scanning
        </p>
      </div>

      {/* Form Card */}
      <div className="rounded-2xl border border-border bg-card p-8" style={{ boxShadow: "var(--shadow-card)" }}>
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Error */}
          {error && (
            <div className="rounded-lg border border-fail/20 bg-fail-bg px-4 py-3 text-sm text-fail">
              {error}
            </div>
          )}

          {/* Name */}
          <div>
            <label htmlFor="name" className="mb-1.5 block text-sm font-medium text-foreground">
              Full Name
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-muted-light" />
              <input
                id="name"
                type="text"
                value={form.name}
                onChange={(e) => update("name", e.target.value)}
                placeholder="John Doe"
                autoComplete="name"
                className="h-11 w-full rounded-lg border border-border bg-card pl-10 pr-4 text-sm text-foreground placeholder-muted-light outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </div>
          </div>

          {/* Email */}
          <div>
            <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-foreground">
              Email <span className="text-fail">*</span>
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-muted-light" />
              <input
                id="email"
                type="email"
                value={form.email}
                onChange={(e) => update("email", e.target.value)}
                placeholder="you@company.com"
                required
                autoComplete="email"
                className="h-11 w-full rounded-lg border border-border bg-card pl-10 pr-4 text-sm text-foreground placeholder-muted-light outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-foreground">
              Password <span className="text-fail">*</span>
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-muted-light" />
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                value={form.password}
                onChange={(e) => update("password", e.target.value)}
                placeholder="Min. 8 characters"
                required
                minLength={8}
                autoComplete="new-password"
                className="h-11 w-full rounded-lg border border-border bg-card pl-10 pr-11 text-sm text-foreground placeholder-muted-light outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-light hover:text-muted"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* Organization */}
          <div>
            <label htmlFor="orgName" className="mb-1.5 block text-sm font-medium text-foreground">
              Organization <span className="text-xs text-muted">(optional)</span>
            </label>
            <div className="relative">
              <Building2 className="absolute left-3 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-muted-light" />
              <input
                id="orgName"
                type="text"
                value={form.orgName}
                onChange={(e) => update("orgName", e.target.value)}
                placeholder="Your company name"
                autoComplete="organization"
                className="h-11 w-full rounded-lg border border-border bg-card pl-10 pr-4 text-sm text-foreground placeholder-muted-light outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </div>
          </div>

          {/* Submit */}
          <Button type="submit" loading={loading} className="w-full h-11">
            Create Account
          </Button>
        </form>
      </div>

      {/* Login Link */}
      <p className="mt-6 text-center text-sm text-muted">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-primary hover:text-primary-hover">
          Sign in
        </Link>
      </p>
    </div>
  );
}
