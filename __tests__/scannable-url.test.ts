import { describe, it, expect } from "vitest";
import { isScannableUrl } from "@/lib/scanner/normalizer";

describe("isScannableUrl", () => {
  it("returns true for regular HTML pages", () => {
    expect(isScannableUrl("https://example.com/about")).toBe(true);
    expect(isScannableUrl("https://example.com/")).toBe(true);
    expect(isScannableUrl("https://example.com/contact")).toBe(true);
  });

  it("returns true for paths with no extension", () => {
    expect(isScannableUrl("https://example.com/products/123")).toBe(true);
    expect(isScannableUrl("https://example.com/blog/my-post")).toBe(true);
  });

  it("returns true for .html and .htm files", () => {
    // .html and .htm are not in the reject list — they ARE scannable
    expect(isScannableUrl("https://example.com/page.html")).toBe(true);
    expect(isScannableUrl("https://example.com/page.htm")).toBe(true);
  });

  it("returns false for PDF files", () => {
    expect(isScannableUrl("https://example.com/report.pdf")).toBe(false);
  });

  it("returns false for images", () => {
    expect(isScannableUrl("https://example.com/photo.png")).toBe(false);
    expect(isScannableUrl("https://example.com/photo.jpg")).toBe(false);
    expect(isScannableUrl("https://example.com/photo.jpeg")).toBe(false);
    expect(isScannableUrl("https://example.com/photo.gif")).toBe(false);
    expect(isScannableUrl("https://example.com/photo.webp")).toBe(false);
    expect(isScannableUrl("https://example.com/icon.svg")).toBe(false);
    expect(isScannableUrl("https://example.com/favicon.ico")).toBe(false);
  });

  it("returns false for font files", () => {
    expect(isScannableUrl("https://example.com/font.woff")).toBe(false);
    expect(isScannableUrl("https://example.com/font.woff2")).toBe(false);
    expect(isScannableUrl("https://example.com/font.ttf")).toBe(false);
    expect(isScannableUrl("https://example.com/font.eot")).toBe(false);
  });

  it("returns false for document files", () => {
    expect(isScannableUrl("https://example.com/doc.docx")).toBe(false);
    expect(isScannableUrl("https://example.com/doc.doc")).toBe(false);
    expect(isScannableUrl("https://example.com/sheet.xlsx")).toBe(false);
    expect(isScannableUrl("https://example.com/slides.pptx")).toBe(false);
  });

  it("returns false for archive files", () => {
    expect(isScannableUrl("https://example.com/file.zip")).toBe(false);
    expect(isScannableUrl("https://example.com/file.gz")).toBe(false);
    expect(isScannableUrl("https://example.com/file.tar")).toBe(false);
  });

  it("returns false for media files", () => {
    expect(isScannableUrl("https://example.com/video.mp4")).toBe(false);
    expect(isScannableUrl("https://example.com/audio.mp3")).toBe(false);
    expect(isScannableUrl("https://example.com/audio.wav")).toBe(false);
    expect(isScannableUrl("https://example.com/audio.ogg")).toBe(false);
  });

  it("returns false for static assets", () => {
    expect(isScannableUrl("https://example.com/style.css")).toBe(false);
    expect(isScannableUrl("https://example.com/app.js")).toBe(false);
    expect(isScannableUrl("https://example.com/data.json")).toBe(false);
    expect(isScannableUrl("https://example.com/data.xml")).toBe(false);
    expect(isScannableUrl("https://example.com/data.csv")).toBe(false);
  });

  it("returns false for invalid URLs", () => {
    expect(isScannableUrl("not-a-url")).toBe(false);
  });

  it("is case-insensitive for extensions", () => {
    expect(isScannableUrl("https://example.com/file.PDF")).toBe(false);
    expect(isScannableUrl("https://example.com/image.PNG")).toBe(false);
  });
});
