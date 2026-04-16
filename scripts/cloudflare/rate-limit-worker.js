/**
 * rate-limit-worker.js — Cloudflare Worker for edge rate limiting
 *
 * Tracks requests by IP using Cloudflare KV. Rejects IPs that exceed
 * the configured threshold within a sliding window.
 *
 * This Worker sits in FRONT of your origin (GitHub Pages). Requests
 * that pass the rate check are forwarded to the origin. Blocked
 * requests get a 429 response without ever touching your server.
 *
 * SETUP:
 * 1. In Cloudflare dashboard: Workers & Pages > Create Worker
 * 2. Paste this code
 * 3. Go to Settings > Variables > KV Namespace Bindings
 * 4. Add binding: Variable name = RATE_LIMIT, KV Namespace = create a new one called "rate-limit-store"
 * 5. Go to your domain's DNS/Workers Routes
 * 6. Add route: thedonormap.org/api/* -> this worker (only rate-limit API paths)
 *    OR: *.thedonormap.org/* -> this worker (rate-limit everything)
 *
 * CONFIGURATION:
 * Adjust WINDOW_SECONDS and MAX_REQUESTS below. Defaults: 60 requests
 * per 60 seconds per IP. Generous for normal browsing, blocks scrapers.
 */

// ── Configuration ───────────────────────────────────────────────
const WINDOW_SECONDS = 60
const MAX_REQUESTS = 60 // per IP per window

// Paths that are exempt from rate limiting (static assets, etc.)
const EXEMPT_PREFIXES = [
  "/static/",
  "/.well-known/",
  "/favicon",
]

// ── Worker handler ──────────────────────────────────────────────

export default {
  async fetch(request, env) {
    const url = new URL(request.url)

    // Skip rate limiting for exempt paths
    for (const prefix of EXEMPT_PREFIXES) {
      if (url.pathname.startsWith(prefix)) {
        return fetch(request)
      }
    }

    // Get client IP
    const ip = request.headers.get("CF-Connecting-IP") || "unknown"
    const key = `rl:${ip}`

    // Check KV for existing count
    const now = Math.floor(Date.now() / 1000)
    let record = null

    try {
      const raw = await env.RATE_LIMIT.get(key)
      if (raw) {
        record = JSON.parse(raw)
      }
    } catch {
      // KV read failed — fail open (allow the request)
      return fetch(request)
    }

    // Initialize or reset window
    if (!record || now - record.windowStart >= WINDOW_SECONDS) {
      record = { windowStart: now, count: 1 }
    } else {
      record.count++
    }

    // Check limit
    if (record.count > MAX_REQUESTS) {
      const retryAfter = WINDOW_SECONDS - (now - record.windowStart)
      return new Response(
        JSON.stringify({
          error: "Rate limit exceeded",
          retry_after: retryAfter,
          limit: MAX_REQUESTS,
          window: WINDOW_SECONDS,
        }),
        {
          status: 429,
          headers: {
            "Content-Type": "application/json",
            "Retry-After": String(retryAfter),
            "X-RateLimit-Limit": String(MAX_REQUESTS),
            "X-RateLimit-Remaining": "0",
            "X-RateLimit-Reset": String(record.windowStart + WINDOW_SECONDS),
          },
        }
      )
    }

    // Write updated count back to KV (TTL = window size + buffer)
    try {
      await env.RATE_LIMIT.put(key, JSON.stringify(record), {
        expirationTtl: WINDOW_SECONDS + 10,
      })
    } catch {
      // KV write failed — fail open
    }

    // Forward to origin with rate limit headers
    const response = await fetch(request)
    const newResponse = new Response(response.body, response)
    newResponse.headers.set("X-RateLimit-Limit", String(MAX_REQUESTS))
    newResponse.headers.set("X-RateLimit-Remaining", String(MAX_REQUESTS - record.count))
    newResponse.headers.set("X-RateLimit-Reset", String(record.windowStart + WINDOW_SECONDS))

    return newResponse
  },
}
