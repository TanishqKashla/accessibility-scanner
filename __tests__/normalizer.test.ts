import { describe, it, expect } from "vitest";
import { normalizeUrl, isSameDomain, extractDomain } from "@/lib/scanner/normalizer";

describe("normalizeUrl", () => {
  it("strips tracking params (utm_*)", () => {
    const result = normalizeUrl("https://example.com/page?utm_source=google&utm_medium=cpc&foo=bar");
    expect(result).toBe("https://example.com/page?foo=bar");
  });

  it("strips fbclid, gclid, msclkid", () => {
    const result = normalizeUrl("https://example.com/?fbclid=abc&gclid=xyz&msclkid=123");
    expect(result).toBe("https://example.com/");
  });

  it("removes fragment", () => {
    const result = normalizeUrl("https://example.com/page#section");
    expect(result).toBe("https://example.com/page");
  });

  it("removes index.html and normalizes trailing slash", () => {
    const result = normalizeUrl("https://example.com/dir/index.html");
    expect(result).toBe("https://example.com/dir");
  });

  it("removes index.php and normalizes trailing slash", () => {
    const result = normalizeUrl("https://example.com/dir/index.php");
    expect(result).toBe("https://example.com/dir");
  });

  it("normalizes trailing slash for non-root paths", () => {
    const result = normalizeUrl("https://example.com/about/");
    expect(result).toBe("https://example.com/about");
  });

  it("keeps trailing slash for root", () => {
    const result = normalizeUrl("https://example.com/");
    expect(result).toBe("https://example.com/");
  });

  it("collapses double slashes", () => {
    const result = normalizeUrl("https://example.com//about//page");
    expect(result).toBe("https://example.com/about/page");
  });

  it("removes default port 443 for https", () => {
    const result = normalizeUrl("https://example.com:443/page");
    expect(result).toBe("https://example.com/page");
  });

  it("removes default port 80 for http", () => {
    const result = normalizeUrl("http://example.com:80/page");
    expect(result).toBe("http://example.com/page");
  });

  it("sorts query params for consistency", () => {
    const result = normalizeUrl("https://example.com/?z=1&a=2&m=3");
    expect(result).toBe("https://example.com/?a=2&m=3&z=1");
  });

  it("resolves relative URLs with a base", () => {
    const result = normalizeUrl("/about", "https://example.com");
    expect(result).toBe("https://example.com/about");
  });

  it("returns raw string for invalid URLs", () => {
    const result = normalizeUrl("not-a-url");
    expect(result).toBe("not-a-url");
  });

  it("rejects non-http protocols", () => {
    const result = normalizeUrl("ftp://example.com/file");
    expect(result).toBe("ftp://example.com/file");
  });
});

describe("isSameDomain", () => {
  it("returns true for same domain", () => {
    expect(isSameDomain("https://example.com/page", "https://example.com")).toBe(true);
  });

  it("returns false for different domain", () => {
    expect(isSameDomain("https://other.com/page", "https://example.com")).toBe(false);
  });

  it("returns false for subdomain", () => {
    expect(isSameDomain("https://blog.example.com", "https://example.com")).toBe(false);
  });

  it("returns false for invalid URLs", () => {
    expect(isSameDomain("not-a-url", "https://example.com")).toBe(false);
  });
});

describe("extractDomain", () => {
  it("extracts hostname from URL", () => {
    expect(extractDomain("https://www.example.com/page")).toBe("www.example.com");
  });

  it("returns input for invalid URL", () => {
    expect(extractDomain("not-a-url")).toBe("not-a-url");
  });
});
