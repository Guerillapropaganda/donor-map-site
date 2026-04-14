/**
 * rate-limit.ts — Phase 2.5 per-user rate limiting
 *
 * File-backed sliding-window counter. Simple enough to debug, robust
 * enough for v1. Keyed on user_id + endpoint. Resets daily at UTC
 * midnight for daily caps, per-minute for API limits.
 *
 * Tier limits (per ADR-0002):
 *   anonymous    0 queries / day   (blocked before reaching the rate check)
 *   free-auth    5 queries / day
 *   researcher   unlimited queries, 60 requests / minute on API
 *   newsroom     unlimited queries, 600 requests / minute on API
 *   patron       same as researcher
 *   admin        unlimited everything
 *
 * Override: users.rate_limit_override (if set) replaces the default
 * for that user. Useful for abuse management or hand-granted
 * allowances.
 *
 * Storage: data/.rate-limits.json — simple JSON keyed on
 * `${userId}:${endpoint}:${bucket}` where bucket is the time window
 * (YYYY-MM-DD for daily, YYYY-MM-DDTHH:MM for per-minute).
 */

import fs from "fs"
import path from "path"
import type { UserRecord, Tier } from "./auth"

function findRepoRoot(startDir: string): string {
  let dir = startDir
  for (let i = 0; i < 8; i++) {
    if (fs.existsSync(path.join(dir, ".git"))) return dir
    const parent = path.dirname(dir)
    if (parent === dir) break
    dir = parent
  }
  return startDir
}

const root = findRepoRoot(process.cwd())
const RATE_LIMIT_FILE = path.join(root, "data", ".rate-limits.json")

interface Counter {
  bucket: string
  count: number
}

type RateLimitStore = Record<string, Counter>

let _cache: RateLimitStore | null = null

function loadStore(): RateLimitStore {
  if (_cache) return _cache
  if (!fs.existsSync(RATE_LIMIT_FILE)) {
    _cache = {}
    return _cache
  }
  try {
    _cache = JSON.parse(fs.readFileSync(RATE_LIMIT_FILE, "utf-8"))
    return _cache!
  } catch {
    _cache = {}
    return _cache
  }
}

function persistStore(): void {
  if (!_cache) return
  const dir = path.dirname(RATE_LIMIT_FILE)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  const tmp = RATE_LIMIT_FILE + ".tmp"
  fs.writeFileSync(tmp, JSON.stringify(_cache), "utf-8")
  fs.renameSync(tmp, RATE_LIMIT_FILE)
}

function dailyBucket(): string {
  return new Date().toISOString().slice(0, 10)
}

function perMinuteBucket(): string {
  return new Date().toISOString().slice(0, 16)
}

function garbageCollect(store: RateLimitStore): void {
  // Drop counters older than 2 days to keep the file small. Not
  // strictly necessary for correctness — the bucket key already makes
  // counters self-expiring — but keeps the file from growing forever.
  const today = dailyBucket()
  const yesterday = new Date(Date.now() - 864e5).toISOString().slice(0, 10)
  for (const key of Object.keys(store)) {
    const counter = store[key]
    if (!counter || (counter.bucket !== today && counter.bucket !== yesterday &&
        !counter.bucket.startsWith(today) && !counter.bucket.startsWith(yesterday))) {
      delete store[key]
    }
  }
}

// ─── Tier limits ─────────────────────────────────────────────────────

interface TierLimit {
  daily_queries: number | "unlimited"
  api_per_minute: number | "unlimited"
}

const TIER_LIMITS: Record<Tier, TierLimit> = {
  anonymous: { daily_queries: 0, api_per_minute: 0 },
  "free-auth": { daily_queries: 5, api_per_minute: 10 },
  researcher: { daily_queries: "unlimited", api_per_minute: 60 },
  newsroom: { daily_queries: "unlimited", api_per_minute: 600 },
  patron: { daily_queries: "unlimited", api_per_minute: 60 },
  admin: { daily_queries: "unlimited", api_per_minute: "unlimited" },
}

export interface RateLimitResult {
  allowed: boolean
  limit: number | "unlimited"
  remaining: number | "unlimited"
  bucket: string
  retry_after_seconds?: number
}

/**
 * Check daily query limit for a user on a specific endpoint. Increments
 * the counter if allowed. Returns detailed state so the caller can set
 * X-RateLimit-* headers.
 */
export function checkDailyLimit(
  user: UserRecord | null,
  endpoint: string,
): RateLimitResult {
  const tier: Tier = (user?.tier as Tier) || "anonymous"
  const override = user?.rate_limit_override
  const limit =
    typeof override === "number" ? override : TIER_LIMITS[tier].daily_queries

  const bucket = dailyBucket()

  if (limit === "unlimited") {
    return { allowed: true, limit: "unlimited", remaining: "unlimited", bucket }
  }
  if (limit === 0) {
    return {
      allowed: false,
      limit: 0,
      remaining: 0,
      bucket,
      retry_after_seconds: 60, // anonymous can try again after next free-auth login
    }
  }

  const store = loadStore()
  const key = `${user?.id || "anon"}:${endpoint}:${bucket}`
  const counter = store[key] || { bucket, count: 0 }

  if (counter.count >= limit) {
    // Time until UTC midnight
    const now = new Date()
    const tomorrow = new Date(now.getTime() + 864e5)
    tomorrow.setUTCHours(0, 0, 0, 0)
    const retryAfter = Math.round((tomorrow.getTime() - now.getTime()) / 1000)
    return {
      allowed: false,
      limit,
      remaining: 0,
      bucket,
      retry_after_seconds: retryAfter,
    }
  }

  counter.count += 1
  store[key] = counter
  garbageCollect(store)
  persistStore()

  return {
    allowed: true,
    limit,
    remaining: limit - counter.count,
    bucket,
  }
}

/**
 * Check per-minute API limit for a user on a specific endpoint. Same
 * increment-if-allowed pattern as checkDailyLimit.
 */
export function checkPerMinuteLimit(
  user: UserRecord | null,
  endpoint: string,
): RateLimitResult {
  const tier: Tier = (user?.tier as Tier) || "anonymous"
  const limit = TIER_LIMITS[tier].api_per_minute

  const bucket = perMinuteBucket()

  if (limit === "unlimited") {
    return { allowed: true, limit: "unlimited", remaining: "unlimited", bucket }
  }
  if (limit === 0) {
    return {
      allowed: false,
      limit: 0,
      remaining: 0,
      bucket,
      retry_after_seconds: 60,
    }
  }

  const store = loadStore()
  const key = `${user?.id || "anon"}:${endpoint}:${bucket}`
  const counter = store[key] || { bucket, count: 0 }

  if (counter.count >= limit) {
    return { allowed: false, limit, remaining: 0, bucket, retry_after_seconds: 60 }
  }

  counter.count += 1
  store[key] = counter
  persistStore()

  return { allowed: true, limit, remaining: limit - counter.count, bucket }
}
