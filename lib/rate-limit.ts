/**
 * Rate limiting for sensitive endpoints (login, register, payment
 * initialize, file-access-token issuance).
 *
 * Default store is in-memory — fine for a single-instance deploy (one
 * Railway/Render/Fly container) but WRONG for multi-instance serverless
 * (Vercel): each function invocation can land on a different instance with
 * its own memory, so limits won't actually be shared. For that setup, set
 * RATE_LIMIT_REDIS_URL to an Upstash Redis REST URL/token and this module
 * automatically switches to the Redis-backed store — see
 * getRedisConfig() below for exactly what env vars that needs.
 */

type Bucket = { count: number; resetAt: number };

const memoryStore = new Map<string, Bucket>();

function getRedisConfig() {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  return { url, token };
}

async function checkRedis(key: string, limit: number, windowSeconds: number): Promise<boolean> {
  const config = getRedisConfig();
  if (!config) return checkMemory(key, limit, windowSeconds);

  // Upstash's REST API supports atomic INCR + EXPIRE via pipelining.
  // Kept dependency-free (plain fetch) so this file doesn't require
  // @upstash/redis to be installed for the in-memory path to work.
  const res = await fetch(`${config.url}/pipeline`, {
    method: "POST",
    headers: { Authorization: `Bearer ${config.token}`, "Content-Type": "application/json" },
    body: JSON.stringify([
      ["INCR", key],
      ["EXPIRE", key, String(windowSeconds), "NX"],
    ]),
  });
  if (!res.ok) {
    // Fail open (allow the request) rather than take the whole app down if
    // Redis is briefly unreachable — a rate limiter outage shouldn't become
    // a site outage. Falls back to in-memory for this one check.
    return checkMemory(key, limit, windowSeconds);
  }
  const [incrResult] = await res.json();
  const count = Number(incrResult?.result ?? 0);
  return count <= limit;
}

function checkMemory(key: string, limit: number, windowSeconds: number): boolean {
  const now = Date.now();
  const existing = memoryStore.get(key);

  if (!existing || existing.resetAt < now) {
    memoryStore.set(key, { count: 1, resetAt: now + windowSeconds * 1000 });
    return true;
  }

  existing.count += 1;
  return existing.count <= limit;
}

/**
 * Returns true if the request is within the limit, false if it should be
 * rejected (caller should respond 429).
 *
 * @param identifier something stable per-caller — IP address, user id, or
 *   email being attempted, depending on what you're protecting.
 * @param routeKey a short name for the thing being limited, so the same
 *   identifier can have independent limits per route.
 */
export async function checkRateLimit(params: {
  identifier: string;
  routeKey: string;
  limit: number;
  windowSeconds: number;
}): Promise<boolean> {
  const key = `ratelimit:${params.routeKey}:${params.identifier}`;
  if (getRedisConfig()) {
    return checkRedis(key, params.limit, params.windowSeconds);
  }
  return checkMemory(key, params.limit, params.windowSeconds);
}

/** Best-effort caller IP extraction behind common proxies/load balancers. */
export function getClientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}

// Named presets so every call site uses consistent, reviewed limits.
export const RATE_LIMITS = {
  login: { limit: 10, windowSeconds: 60 }, // 10 attempts/min per email+IP
  register: { limit: 5, windowSeconds: 60 * 10 }, // 5 accounts/10min per IP
  paymentInitialize: { limit: 5, windowSeconds: 60 }, // 5 checkout starts/min per user
  fileAccessToken: { limit: 30, windowSeconds: 60 }, // 30 token mints/min per user
} as const;
