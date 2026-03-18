import { describe, it, expect } from "vitest";
import { computePriority, getUrlPattern } from "@/lib/scanner/priority";

describe("computePriority", () => {
  it("gives homepage highest priority (lowest number)", () => {
    const homepage = computePriority({ url: "https://example.com/", depth: 0 });
    const deep = computePriority({ url: "https://example.com/a/b/c/d", depth: 4 });
    expect(homepage).toBeLessThan(deep);
  });

  it("penalizes deeper pages", () => {
    const depth0 = computePriority({ url: "https://example.com/page", depth: 0 });
    const depth3 = computePriority({ url: "https://example.com/page", depth: 3 });
    expect(depth0).toBeLessThan(depth3);
  });

  it("prioritizes high-priority patterns (contact, about)", () => {
    const contact = computePriority({ url: "https://example.com/contact", depth: 1 });
    const random = computePriority({ url: "https://example.com/xyz123", depth: 1 });
    expect(contact).toBeLessThan(random);
  });

  it("deprioritizes low-priority patterns (archives, tags)", () => {
    const archive = computePriority({ url: "https://example.com/archive/2024", depth: 1 });
    const page = computePriority({ url: "https://example.com/services", depth: 1 });
    expect(archive).toBeGreaterThan(page);
  });

  it("boosts pages with inbound links", () => {
    const noLinks = computePriority({ url: "https://example.com/page", depth: 1, inboundLinkCount: 0 });
    const manyLinks = computePriority({ url: "https://example.com/page", depth: 1, inboundLinkCount: 10 });
    expect(manyLinks).toBeLessThan(noLinks);
  });

  it("returns a value between 1 and 100", () => {
    const result = computePriority({ url: "https://example.com/", depth: 0 });
    expect(result).toBeGreaterThanOrEqual(1);
    expect(result).toBeLessThanOrEqual(100);
  });
});

describe("getUrlPattern", () => {
  it("replaces numeric IDs with :id", () => {
    expect(getUrlPattern("https://example.com/products/12345")).toBe("/products/:id");
  });

  it("replaces UUIDs with :uuid", () => {
    expect(getUrlPattern("https://example.com/item/a1b2c3d4-e5f6-7890-abcd-ef1234567890")).toBe("/item/:uuid");
  });

  it("replaces MongoDB ObjectIds with :objectId", () => {
    expect(getUrlPattern("https://example.com/scan/507f1f77bcf86cd799439011")).toBe("/scan/:objectId");
  });

  it("preserves non-dynamic segments", () => {
    expect(getUrlPattern("https://example.com/about/team")).toBe("/about/team");
  });

  it("returns / for root", () => {
    expect(getUrlPattern("https://example.com/")).toBe("/");
  });
});
