import { describe, it, expect, beforeEach } from "vitest";

// Ensure no Redis env vars leak in from the host running the tests —
// we want to exercise the in-memory path deterministically.
delete process.env.UPSTASH_REDIS_REST_URL;
delete process.env.UPSTASH_REDIS_REST_TOKEN;

const { checkRateLimit } = await import("@/lib/rate-limit");

describe("rate limiting (in-memory store)", () => {
  it("allows requests up to the limit", async () => {
    const routeKey = `test-route-${Math.random()}`;
    for (let i = 0; i < 3; i++) {
      const allowed = await checkRateLimit({ identifier: "user_a", routeKey, limit: 3, windowSeconds: 60 });
      expect(allowed).toBe(true);
    }
  });

  it("rejects requests once the limit is exceeded", async () => {
    const routeKey = `test-route-${Math.random()}`;
    for (let i = 0; i < 3; i++) {
      await checkRateLimit({ identifier: "user_b", routeKey, limit: 3, windowSeconds: 60 });
    }
    const fourth = await checkRateLimit({ identifier: "user_b", routeKey, limit: 3, windowSeconds: 60 });
    expect(fourth).toBe(false);
  });

  it("tracks separate identifiers independently", async () => {
    const routeKey = `test-route-${Math.random()}`;
    for (let i = 0; i < 3; i++) {
      await checkRateLimit({ identifier: "user_c1", routeKey, limit: 3, windowSeconds: 60 });
    }
    // A different identifier on the same route should still be allowed —
    // this is what stops one abusive user/IP from locking out everyone else.
    const otherUser = await checkRateLimit({ identifier: "user_c2", routeKey, limit: 3, windowSeconds: 60 });
    expect(otherUser).toBe(true);
  });

  it("tracks separate route keys independently for the same identifier", async () => {
    const routeA = `test-route-a-${Math.random()}`;
    const routeB = `test-route-b-${Math.random()}`;
    for (let i = 0; i < 3; i++) {
      await checkRateLimit({ identifier: "user_d", routeKey: routeA, limit: 3, windowSeconds: 60 });
    }
    const onOtherRoute = await checkRateLimit({ identifier: "user_d", routeKey: routeB, limit: 3, windowSeconds: 60 });
    expect(onOtherRoute).toBe(true);
  });
});
