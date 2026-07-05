import { Redis } from "@upstash/redis";
import { Ratelimit } from "@upstash/ratelimit";

// ---------------------------------------------------------------------------
// Upstash Redis client — lazily initialised so it only connects when used.
// ---------------------------------------------------------------------------

let _redis: Redis | null = null;

function getRedis(): Redis {
  if (_redis) return _redis;

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    throw new Error(
      "UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN must be set in .env",
    );
  }

  _redis = new Redis({ url, token });
  return _redis;
}

// ---------------------------------------------------------------------------
// Pre-configured rate limiters
// ---------------------------------------------------------------------------

/**
 * General API rate limiter — 100 requests per 60 s per IP.
 * Used in middleware for all `/api/*` routes.
 */
export const apiLimiter = new Ratelimit({
  redis: getRedis(),
  limiter: Ratelimit.slidingWindow(100, "60 s"),
  analytics: true,
  prefix: "rl:api",
});

/**
 * Strict rate limiter for auth endpoints (login, password reset, etc.).
 * 5 requests per 60 s per IP to prevent brute-force attacks.
 */
export const authLimiter = new Ratelimit({
  redis: getRedis(),
  limiter: Ratelimit.slidingWindow(5, "60 s"),
  analytics: true,
  prefix: "rl:auth",
});

/**
 * Medium rate limiter for state-changing operations (create/update/delete).
 * 30 requests per 60 s per IP.
 */
export const mutationLimiter = new Ratelimit({
  redis: getRedis(),
  limiter: Ratelimit.slidingWindow(30, "60 s"),
  analytics: true,
  prefix: "rl:mutation",
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Extract a stable identifier for the client from a Request.
 * Uses x-forwarded-for (respecting proxies) with a fallback to x-real-ip.
 */
export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return request.headers.get("x-real-ip") || "127.0.0.1";
}

/**
 * Apply a rate limiter and return a 429 Response if the limit is exceeded.
 * Returns `null` if the request is allowed (caller should continue).
 */
export async function checkRateLimit(
  limiter: Ratelimit,
  request: Request,
): Promise<Response | null> {
  try {
    const ip = getClientIp(request);
    const { success, limit, remaining, reset } = await limiter.limit(ip);

    if (!success) {
      const resetSeconds = Math.ceil((reset - Date.now()) / 1000);
      return new Response(
        JSON.stringify({
          error: "Too many requests. Please try again later.",
          retryAfter: resetSeconds,
        }),
        {
          status: 429,
          headers: {
            "Content-Type": "application/json",
            "Retry-After": String(resetSeconds),
            "X-RateLimit-Limit": String(limit),
            "X-RateLimit-Remaining": String(remaining),
            "X-RateLimit-Reset": String(reset),
          },
        },
      );
    }

    return null; // allowed
  } catch (err) {
    // If Redis is unreachable, fail open — don't block legitimate traffic.
    console.error("Rate limiter error (failing open):", err);
    return null;
  }
}