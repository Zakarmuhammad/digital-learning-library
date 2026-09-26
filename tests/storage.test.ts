import { describe, it, expect, beforeEach, vi } from "vitest";

// These env vars must be set before importing lib/storage.ts, since it
// reads FILE_SIGNING_SECRET at module load time.
process.env.FILE_SIGNING_SECRET = "test-signing-secret";
process.env.STORAGE_DRIVER = "local";

const { signAccessToken, verifyAccessToken } = await import("@/lib/storage");

describe("signed file access tokens", () => {
  it("a freshly signed token verifies successfully for the same user+resource", () => {
    const { token } = signAccessToken({ userId: "user_1", resourceId: "ebook_1" });
    expect(verifyAccessToken({ userId: "user_1", resourceId: "ebook_1", token })).toBe(true);
  });

  it("rejects a token when the userId doesn't match", () => {
    const { token } = signAccessToken({ userId: "user_1", resourceId: "ebook_1" });
    expect(verifyAccessToken({ userId: "user_2", resourceId: "ebook_1", token })).toBe(false);
  });

  it("rejects a token when the resourceId doesn't match", () => {
    const { token } = signAccessToken({ userId: "user_1", resourceId: "ebook_1" });
    expect(verifyAccessToken({ userId: "user_1", resourceId: "ebook_2", token })).toBe(false);
  });

  it("rejects a tampered token", () => {
    const { token } = signAccessToken({ userId: "user_1", resourceId: "ebook_1" });
    const tampered = token.slice(0, -2) + "00";
    expect(verifyAccessToken({ userId: "user_1", resourceId: "ebook_1", token: tampered })).toBe(false);
  });

  it("rejects a malformed token", () => {
    expect(verifyAccessToken({ userId: "user_1", resourceId: "ebook_1", token: "not-a-real-token" })).toBe(false);
    expect(verifyAccessToken({ userId: "user_1", resourceId: "ebook_1", token: "" })).toBe(false);
  });

  it("rejects an expired token", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));
    const { token } = signAccessToken({ userId: "user_1", resourceId: "ebook_1" });

    // Token TTL is 5 minutes — advance 6 minutes.
    vi.setSystemTime(new Date("2026-01-01T00:06:00Z"));
    expect(verifyAccessToken({ userId: "user_1", resourceId: "ebook_1", token })).toBe(false);
    vi.useRealTimers();
  });

  it("accepts a token that hasn't expired yet", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));
    const { token } = signAccessToken({ userId: "user_1", resourceId: "ebook_1" });

    vi.setSystemTime(new Date("2026-01-01T00:02:00Z")); // +2 min, within the 5 min TTL
    expect(verifyAccessToken({ userId: "user_1", resourceId: "ebook_1", token })).toBe(true);
    vi.useRealTimers();
  });
});
