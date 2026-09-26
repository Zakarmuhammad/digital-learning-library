import { describe, it, expect } from "vitest";
import { validateUpload } from "@/lib/upload-validation";

describe("upload validation", () => {
  it("accepts a valid PDF for ebook-file", () => {
    const result = validateUpload("ebook-file", { type: "application/pdf", size: 5 * 1024 * 1024, name: "book.pdf" });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.storageKey).toMatch(/^ebooks\//);
      expect(result.storageKey.endsWith(".pdf")).toBe(true);
    }
  });

  it("rejects a non-PDF for ebook-file", () => {
    const result = validateUpload("ebook-file", { type: "image/png", size: 1024, name: "cover.png" });
    expect(result.ok).toBe(false);
  });

  it("rejects an ebook-file over the size ceiling", () => {
    const result = validateUpload("ebook-file", {
      type: "application/pdf",
      size: 200 * 1024 * 1024,
      name: "huge.pdf",
    });
    expect(result.ok).toBe(false);
  });

  it("accepts an MP4 for lesson-video", () => {
    const result = validateUpload("lesson-video", { type: "video/mp4", size: 50 * 1024 * 1024, name: "lesson1.mp4" });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.storageKey).toMatch(/^lesson-videos\//);
  });

  it("rejects an unsupported video format", () => {
    const result = validateUpload("lesson-video", { type: "video/x-flv", size: 1024, name: "old.flv" });
    expect(result.ok).toBe(false);
  });

  it("accepts a PDF or zip for lesson-resource", () => {
    expect(validateUpload("lesson-resource", { type: "application/pdf", size: 1024, name: "notes.pdf" }).ok).toBe(true);
    expect(validateUpload("lesson-resource", { type: "application/zip", size: 1024, name: "assets.zip" }).ok).toBe(true);
  });

  it("generates a different storage key on each call (no filename collisions)", () => {
    const a = validateUpload("ebook-file", { type: "application/pdf", size: 1024, name: "same-name.pdf" });
    const b = validateUpload("ebook-file", { type: "application/pdf", size: 1024, name: "same-name.pdf" });
    expect(a.ok && b.ok && a.storageKey !== b.storageKey).toBe(true);
  });
});
