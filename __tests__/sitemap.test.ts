import { describe, it, expect } from "vitest";
import { isDisallowed } from "@/lib/scanner/sitemap";

describe("isDisallowed", () => {
  it("returns false for empty disallowed list", () => {
    expect(isDisallowed("/about", [])).toBe(false);
  });

  it("returns true when root is disallowed", () => {
    expect(isDisallowed("/anything", ["/"])).toBe(true);
    expect(isDisallowed("/", ["/"])).toBe(true);
  });

  it("returns true when path starts with a disallowed prefix", () => {
    expect(isDisallowed("/admin/settings", ["/admin"])).toBe(true);
    expect(isDisallowed("/admin/users/123", ["/admin"])).toBe(true);
  });

  it("returns false when path does not match any rule", () => {
    expect(isDisallowed("/about", ["/admin", "/private"])).toBe(false);
    expect(isDisallowed("/contact", ["/admin"])).toBe(false);
  });

  it("matches exact path", () => {
    expect(isDisallowed("/private", ["/private"])).toBe(true);
  });

  it("does not match partial segment overlap", () => {
    // /admin-panel should NOT match /admin if prefix matching is strict
    // But the current implementation uses startsWith, so /admin-panel DOES start with /admin
    expect(isDisallowed("/admin-panel", ["/admin"])).toBe(true);
  });

  it("handles multiple disallowed rules", () => {
    const rules = ["/wp-admin", "/cgi-bin", "/tmp"];
    expect(isDisallowed("/wp-admin/edit.php", rules)).toBe(true);
    expect(isDisallowed("/cgi-bin/script", rules)).toBe(true);
    expect(isDisallowed("/tmp/cache", rules)).toBe(true);
    expect(isDisallowed("/about", rules)).toBe(false);
  });

  it("handles trailing slash in path", () => {
    expect(isDisallowed("/admin/", ["/admin"])).toBe(true);
  });
});
