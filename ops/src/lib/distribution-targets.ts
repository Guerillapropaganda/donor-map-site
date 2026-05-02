import fs from "node:fs"
import path from "node:path"

/**
 * Distribution targets + engagements · CRM for social-ops accounts.
 *
 * Two backing stores:
 *
 * - data/distribution-targets.jsonl
 *   One entry per target. Handle + platform tuple is the natural
 *   identity; we also stamp a uuid-style id so engagements can
 *   point at a stable key even if a target's handle changes.
 *
 * - data/distribution-engagements.jsonl
 *   Append-only log of every interaction with a target. New entries
 *   never modify old ones; deletes happen via a separate "void" entry.
 *   Keeps a clean audit trail.
 *
 * Editorial workflow:
 *   - Adversarial = quote-reply with receipts
 *   - Friendly = amplify and tag
 *   - Watched = on the radar but not active engagement
 *   - Do-not-engage = blocked / hostile / waste of time
 *
 * Per Rule 13, Editor must verify a target's handle on the platform
 * before tier 1/2 engagement. The verification field tracks this.
 */

export type TargetKind = "adversarial" | "friendly"
export type TargetStatus = "active" | "watched" | "do-not-engage" | "archived"
export type EngagementType =
  | "quote-reply"
  | "reply"
  | "dm"
  | "mention"
  | "tag"
  | "follow"
  | "like"
  | "repost"
  | "reposted-me"
  | "reply-to-me"
  | "blocked-me"
  | "ignored-me"
export type EngagementOutcome = "no-response" | "engaged" | "reposted" | "blocked" | "argued" | "deleted" | "pending"

export interface TargetRecord {
  id: string
  handle: string
  platform: string
  kind: TargetKind
  tier: 1 | 2 | 3
  /** "why" for adversarial; "alignment" for friendly. Same field, different framing. */
  reason: string
  /** Beat slugs whose receipts work against this target */
  receipts?: string[]
  status: TargetStatus
  /** Has the editor verified the handle on the platform? Rule 13. */
  verified: boolean
  notes?: string
  addedAt: string
  addedBy: string
  updatedAt: string
}

export interface EngagementRecord {
  id: string
  targetId: string
  date: string // YYYY-MM-DD
  type: EngagementType
  platform: string
  /** URL of my post (the quote-reply, the reply, the DM thread) */
  myPostUrl?: string
  /** URL of their post that I'm engaging with */
  theirPostUrl?: string
  /** Beat slug for the receipt I used */
  receiptUsed?: string
  /** Their response, if any */
  outcome: EngagementOutcome
  /** Free-text notes */
  notes?: string
  loggedAt: string
  /** A "voided" engagement is treated as deleted; we don't actually remove rows */
  voided?: boolean
  /**
   * Filename of an attached screenshot, served from the local filesystem
   * via /api/distribution-screenshots/[filename]. Files live in
   * data/distribution-screenshots/ and are gitignored (personal records).
   * The filename is `{engagement-id}.{ext}` to make orphan-cleanup easy.
   */
  screenshot?: string
}

const TARGETS_PATH = path.join(process.cwd(), "..", "data", "distribution-targets.jsonl")
const ENGAGEMENTS_PATH = path.join(process.cwd(), "..", "data", "distribution-engagements.jsonl")

function readJsonl<T>(filePath: string): T[] {
  try {
    if (!fs.existsSync(filePath)) return []
    const text = fs.readFileSync(filePath, "utf-8")
    return text
      .split("\n")
      .filter((l) => l.trim())
      .map((l) => {
        try {
          return JSON.parse(l) as T
        } catch {
          return null
        }
      })
      .filter((x): x is T => x !== null)
  } catch {
    return []
  }
}

function writeJsonl<T>(filePath: string, entries: T[]) {
  const text = entries.map((e) => JSON.stringify(e)).join("\n") + (entries.length ? "\n" : "")
  fs.writeFileSync(filePath, text, "utf-8")
}

function appendJsonl<T>(filePath: string, entry: T) {
  const line = JSON.stringify(entry) + "\n"
  fs.appendFileSync(filePath, line, "utf-8")
}

function makeId(prefix: string): string {
  // Short readable id: prefix-base36-timestamp + 4 random chars
  const ts = Date.now().toString(36)
  const rand = Math.random().toString(36).slice(2, 6)
  return `${prefix}-${ts}-${rand}`
}

// ─── Targets ─────────────────────────────────────────────────────────

export function listTargets(): TargetRecord[] {
  return readJsonl<TargetRecord>(TARGETS_PATH)
}

export function getTarget(id: string): TargetRecord | null {
  return listTargets().find((t) => t.id === id) || null
}

export function addTarget(input: {
  handle: string
  platform: string
  kind: TargetKind
  tier: 1 | 2 | 3
  reason: string
  receipts?: string[]
  status?: TargetStatus
  verified?: boolean
  notes?: string
  addedBy?: string
}): TargetRecord {
  const all = listTargets()
  const now = new Date().toISOString()
  // Dedup by handle+platform: if exists, return existing
  const existing = all.find((t) => t.handle.toLowerCase() === input.handle.toLowerCase() && t.platform === input.platform)
  if (existing) return existing
  const entry: TargetRecord = {
    id: makeId("tgt"),
    handle: input.handle,
    platform: input.platform,
    kind: input.kind,
    tier: input.tier,
    reason: input.reason,
    receipts: input.receipts,
    status: input.status || "active",
    verified: input.verified ?? false,
    notes: input.notes,
    addedAt: now,
    addedBy: input.addedBy || "editor",
    updatedAt: now,
  }
  all.push(entry)
  writeJsonl(TARGETS_PATH, all)
  return entry
}

export function updateTarget(id: string, patch: Partial<Omit<TargetRecord, "id" | "addedAt" | "addedBy">>): TargetRecord | null {
  const all = listTargets()
  const idx = all.findIndex((t) => t.id === id)
  if (idx < 0) return null
  const updated: TargetRecord = {
    ...all[idx],
    ...patch,
    id: all[idx].id,
    addedAt: all[idx].addedAt,
    addedBy: all[idx].addedBy,
    updatedAt: new Date().toISOString(),
  }
  all[idx] = updated
  writeJsonl(TARGETS_PATH, all)
  return updated
}

export function deleteTarget(id: string): boolean {
  const all = listTargets()
  const idx = all.findIndex((t) => t.id === id)
  if (idx < 0) return false
  all.splice(idx, 1)
  writeJsonl(TARGETS_PATH, all)
  return true
}

// ─── Engagements ─────────────────────────────────────────────────────

export function listEngagements(): EngagementRecord[] {
  return readJsonl<EngagementRecord>(ENGAGEMENTS_PATH).filter((e) => !e.voided)
}

export function listEngagementsForTarget(targetId: string): EngagementRecord[] {
  return listEngagements()
    .filter((e) => e.targetId === targetId)
    .sort((a, b) => (a.loggedAt < b.loggedAt ? 1 : -1))
}

export function logEngagement(input: {
  targetId: string
  date?: string
  type: EngagementType
  platform: string
  myPostUrl?: string
  theirPostUrl?: string
  receiptUsed?: string
  outcome?: EngagementOutcome
  notes?: string
  screenshot?: string
}): EngagementRecord {
  const now = new Date().toISOString()
  const entry: EngagementRecord = {
    id: makeId("eng"),
    targetId: input.targetId,
    date: input.date || now.slice(0, 10),
    type: input.type,
    platform: input.platform,
    myPostUrl: input.myPostUrl,
    theirPostUrl: input.theirPostUrl,
    receiptUsed: input.receiptUsed,
    outcome: input.outcome || "pending",
    notes: input.notes,
    loggedAt: now,
    screenshot: input.screenshot,
  }
  appendJsonl(ENGAGEMENTS_PATH, entry)
  return entry
}

export function attachScreenshotToEngagement(id: string, filename: string): boolean {
  const all = readJsonl<EngagementRecord>(ENGAGEMENTS_PATH)
  const idx = all.findIndex((e) => e.id === id)
  if (idx < 0) return false
  all[idx] = { ...all[idx], screenshot: filename }
  writeJsonl(ENGAGEMENTS_PATH, all)
  return true
}

export function voidEngagement(id: string): boolean {
  const all = readJsonl<EngagementRecord>(ENGAGEMENTS_PATH)
  const idx = all.findIndex((e) => e.id === id)
  if (idx < 0) return false
  all[idx] = { ...all[idx], voided: true }
  writeJsonl(ENGAGEMENTS_PATH, all)
  return true
}

// ─── Aggregate helpers ───────────────────────────────────────────────

export interface TargetWithMetrics extends TargetRecord {
  engagementCount: number
  lastEngagedAt: string | null
  daysSinceLastEngaged: number | null
  positiveResponses: number // engaged + reposted
  negativeResponses: number // blocked + argued
}

export function listTargetsWithMetrics(): TargetWithMetrics[] {
  const targets = listTargets()
  const engagements = listEngagements()
  return targets.map((t) => {
    const mine = engagements.filter((e) => e.targetId === t.id)
    const lastEngagedAt = mine.length ? mine.map((e) => e.loggedAt).sort().slice(-1)[0] : null
    const daysSince = lastEngagedAt ? Math.floor((Date.now() - new Date(lastEngagedAt).getTime()) / 86400000) : null
    const positive = mine.filter((e) => e.outcome === "engaged" || e.outcome === "reposted").length
    const negative = mine.filter((e) => e.outcome === "blocked" || e.outcome === "argued").length
    return {
      ...t,
      engagementCount: mine.length,
      lastEngagedAt,
      daysSinceLastEngaged: daysSince,
      positiveResponses: positive,
      negativeResponses: negative,
    }
  })
}

/** Recent engagements across all targets, most recent first. */
export function listRecentEngagements(limit = 50): Array<EngagementRecord & { target?: TargetRecord }> {
  const targets = listTargets()
  const targetById = new Map(targets.map((t) => [t.id, t]))
  return listEngagements()
    .sort((a, b) => (a.loggedAt < b.loggedAt ? 1 : -1))
    .slice(0, limit)
    .map((e) => ({ ...e, target: targetById.get(e.targetId) }))
}
