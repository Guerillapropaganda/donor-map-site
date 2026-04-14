/**
 * users-store.ts — Ops TypeScript mirror of scripts/lib/users-store.cjs
 *
 * Webpack can't follow `require(path.join(...))` dynamic requires into
 * the scripts/lib CJS store at build time, so the Ops app needs its own
 * TS-native reader/writer. Keep this in sync with the CJS version —
 * both are single source of truth for their runtimes.
 *
 * Used by ops/src/lib/auth.ts for Clerk session → user record lookup.
 */

import fs from "fs"
import path from "path"

export type Tier = "anonymous" | "free-auth" | "researcher" | "newsroom" | "patron" | "admin"

export const TIERS: Tier[] = [
  "anonymous",
  "free-auth",
  "researcher",
  "newsroom",
  "patron",
  "admin",
]

const TIER_ORDER: Record<Tier, number> = {
  anonymous: 0,
  "free-auth": 1,
  researcher: 2,
  patron: 2,
  newsroom: 3,
  admin: 99,
}

export function tierAtLeast(userTier: string, requiredTier: string): boolean {
  const u = (TIER_ORDER as any)[userTier] ?? 0
  const r = (TIER_ORDER as any)[requiredTier] ?? 0
  return u >= r
}

export interface UserRecord {
  id: string
  clerk_id: string | null
  email: string
  tier: Tier
  stripe_customer_id: string | null
  stripe_subscription_id: string | null
  created: string
  last_seen: string | null
  expires: string | null
  cancelled_at: string | null
  team_id: string | null
  is_admin: boolean
  rate_limit_override: number | null
  student_discount: boolean
  student_verification: string | null
  editor_notes: string
}

// ─── File resolution ─────────────────────────────────────────────────

function findRepoRoot(startDir: string): string {
  let dir = startDir
  for (let i = 0; i < 8; i++) {
    if (fs.existsSync(path.join(dir, "data", "users.jsonl"))) return dir
    if (fs.existsSync(path.join(dir, ".git"))) return dir
    const parent = path.dirname(dir)
    if (parent === dir) break
    dir = parent
  }
  return startDir
}

function getUsersFilePath(): string {
  const root = findRepoRoot(process.cwd())
  return path.join(root, "data", "users.jsonl")
}

// ─── In-memory cache + indexes ───────────────────────────────────────

let _cache: UserRecord[] | null = null
let _byId: Map<string, UserRecord> | null = null
let _byClerkId: Map<string, UserRecord> | null = null
let _byEmail: Map<string, UserRecord> | null = null
let _nextId = 1
let _cachedPath: string | null = null

export function loadUsers(): UserRecord[] {
  const file = getUsersFilePath()
  if (_cache && _cachedPath === file) return _cache

  const records: UserRecord[] = []
  if (fs.existsSync(file)) {
    const raw = fs.readFileSync(file, "utf-8")
    for (const line of raw.split(/\r?\n/)) {
      const trimmed = line.trim()
      if (!trimmed) continue
      try {
        records.push(JSON.parse(trimmed) as UserRecord)
      } catch {}
    }
  }
  _cache = records
  _cachedPath = file
  rebuildIndexes()
  return _cache
}

export function clearUsersCache(): void {
  _cache = null
  _byId = null
  _byClerkId = null
  _byEmail = null
  _nextId = 1
  _cachedPath = null
}

function rebuildIndexes(): void {
  _byId = new Map()
  _byClerkId = new Map()
  _byEmail = new Map()
  _nextId = 1
  for (const rec of _cache || []) {
    _byId.set(rec.id, rec)
    if (rec.clerk_id) _byClerkId.set(rec.clerk_id, rec)
    if (rec.email) _byEmail.set(rec.email.toLowerCase(), rec)
    const m = /^usr_(\d{6})$/.exec(rec.id || "")
    if (m) {
      const n = parseInt(m[1], 10)
      if (n >= _nextId) _nextId = n + 1
    }
  }
}

function persist(): void {
  if (!_cache) return
  const file = getUsersFilePath()
  const dir = path.dirname(file)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  const lines = _cache.map((r) => JSON.stringify(r))
  const tmp = file + ".tmp"
  fs.writeFileSync(tmp, lines.join("\n") + (lines.length ? "\n" : ""), "utf-8")
  fs.renameSync(tmp, file)
}

function mintId(): string {
  const id = `usr_${String(_nextId).padStart(6, "0")}`
  _nextId += 1
  return id
}

// ─── Read API ────────────────────────────────────────────────────────

export function getUser(id: string): UserRecord | null {
  if (!_byId) loadUsers()
  return _byId!.get(id) || null
}

export function getUserByClerkId(clerkId: string): UserRecord | null {
  if (!_byClerkId) loadUsers()
  return _byClerkId!.get(clerkId) || null
}

export function getUserByEmail(email: string | null | undefined): UserRecord | null {
  if (!email) return null
  if (!_byEmail) loadUsers()
  return _byEmail!.get(email.toLowerCase()) || null
}

export function countUsers(): number {
  if (!_cache) loadUsers()
  return _cache!.length
}

// ─── Write API ──────────────────────────────────────────────────────

function newRecord(partial: Partial<UserRecord> = {}): UserRecord {
  const now = new Date().toISOString()
  return {
    id: (partial.id as string) || "",
    clerk_id: partial.clerk_id ?? null,
    email: partial.email || "",
    tier: (partial.tier as Tier) || "free-auth",
    stripe_customer_id: partial.stripe_customer_id ?? null,
    stripe_subscription_id: partial.stripe_subscription_id ?? null,
    created: partial.created || now,
    last_seen: partial.last_seen ?? null,
    expires: partial.expires ?? null,
    cancelled_at: partial.cancelled_at ?? null,
    team_id: partial.team_id ?? null,
    is_admin: partial.is_admin ?? false,
    rate_limit_override: partial.rate_limit_override ?? null,
    student_discount: partial.student_discount ?? false,
    student_verification: partial.student_verification ?? null,
    editor_notes: partial.editor_notes || "",
  }
}

export function addOrFindUser(partial: Partial<UserRecord>): UserRecord {
  loadUsers()

  if (partial.clerk_id) {
    const existing = getUserByClerkId(partial.clerk_id)
    if (existing) return existing
  }
  if (partial.email) {
    const existing = getUserByEmail(partial.email)
    if (existing) {
      // Backfill clerk_id on first login
      if (partial.clerk_id && !existing.clerk_id) {
        return updateUser(existing.id, { clerk_id: partial.clerk_id }) || existing
      }
      return existing
    }
  }

  const rec = newRecord(partial)
  rec.id = mintId()

  if (!_cache) _cache = []
  _cache.push(rec)
  _byId!.set(rec.id, rec)
  if (rec.clerk_id) _byClerkId!.set(rec.clerk_id, rec)
  if (rec.email) _byEmail!.set(rec.email.toLowerCase(), rec)
  persist()
  return rec
}

export function updateUser(id: string, patch: Partial<UserRecord>): UserRecord | null {
  loadUsers()
  const rec = _byId!.get(id)
  if (!rec) return null

  const { id: _ignoreId, ...safe } = patch
  Object.assign(rec, safe)
  rec.last_seen = new Date().toISOString()

  // Refresh secondary indexes if identity fields changed
  if (patch.clerk_id) _byClerkId!.set(patch.clerk_id, rec)
  if (patch.email) _byEmail!.set(patch.email.toLowerCase(), rec)

  persist()
  return rec
}
