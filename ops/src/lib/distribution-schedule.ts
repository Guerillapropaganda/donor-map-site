import fs from "node:fs"
import path from "node:path"
import matter from "gray-matter"

/**
 * Distribution schedule loader.
 *
 * Source of truth: content/Admin Notes/distribution-schedule.md
 * Frontmatter parses to structured data via gray-matter (which uses
 * js-yaml under the hood); body is raw markdown for the
 * algorithm-levers long-form notes.
 *
 * Mirrors the sprint-schedule pattern: editor edits ONE file in the
 * vault; every distribution surface re-reads on each request.
 */

export type DayType = "anchor" | "engagement" | "receipt-drop" | "working-notes" | "off" | "other"

export interface DayRhythm {
  day: string
  type: DayType
  note: string
}

export interface PlatformRecord {
  id: string
  handle: string
  url?: string
  postsPerWeek: number
  bestTimes: string[]
  priority: number
  contentType: string
  note: string
}

export interface TargetRecord {
  handle: string
  platform: string
  tier: number
  /** "why" for adversarial; "alignment" for friendly */
  reason: string
  receipts?: string[]
  lastEngaged: string | null
  note?: string
}

export interface HashtagCohort {
  id: string
  tags: string[]
}

export interface AlgorithmLever {
  lever: string
  note: string
  status: "testing" | "confirmed" | "killed" | string
}

export interface WeeklyGoals {
  followersX?: number
  followersBluesky?: number
  followersInstagram?: number
  patreonSupporters?: number
  engagementRate?: number
}

/**
 * Same shape as WeeklyGoals; the live numbers David updates manually
 * after each weekly review. Used to compute deltas in the Algorithm tab.
 */
export type WeeklyActual = WeeklyGoals

export interface DistributionSchedule {
  title: string
  status: string
  lastUpdated: string
  operatingPrinciple: string
  weeklyRhythm: DayRhythm[]
  platforms: PlatformRecord[]
  adversarialTargets: TargetRecord[]
  friendlyTargets: TargetRecord[]
  hashtagCohorts: HashtagCohort[]
  weeklyGoals: WeeklyGoals
  weeklyActual: WeeklyActual
  algorithmLevers: AlgorithmLever[]
  /** Markdown body after the frontmatter, raw text */
  body: string
}

const FILE_REL = "content/Admin Notes/distribution-schedule.md"

export class DistributionScheduleNotFoundError extends Error {}

function repoPath(rel: string): string {
  return path.join(process.cwd(), "..", rel)
}

function asString(v: unknown, fallback = ""): string {
  if (typeof v === "string") return v
  if (typeof v === "number") return String(v)
  return fallback
}

function asNumber(v: unknown): number {
  if (typeof v === "number") return v
  if (typeof v === "string") {
    const parsed = parseFloat(v)
    return isNaN(parsed) ? 0 : parsed
  }
  return 0
}

function asArray(v: unknown): string[] {
  if (Array.isArray(v)) return v.filter((x): x is string => typeof x === "string")
  return []
}

function asObject(v: unknown): Record<string, unknown> {
  if (v && typeof v === "object" && !Array.isArray(v)) return v as Record<string, unknown>
  return {}
}

export function parseDistributionSchedule(): DistributionSchedule {
  const fp = repoPath(FILE_REL)
  if (!fs.existsSync(fp)) {
    throw new DistributionScheduleNotFoundError(`Expected file: ${FILE_REL}`)
  }
  const raw = fs.readFileSync(fp, "utf-8")
  const parsed = matter(raw)
  const fm = parsed.data as Record<string, unknown>

  // Weekly rhythm: object of day -> { type, note }
  const weeklyMap = asObject(fm["weekly-rhythm"])
  const weeklyRhythm: DayRhythm[] = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"].map((day) => {
    const node = asObject(weeklyMap[day])
    return {
      day,
      type: (asString(node.type) as DayType) || "other",
      note: asString(node.note),
    }
  })

  const rawPlatforms = Array.isArray(fm.platforms) ? (fm.platforms as Record<string, unknown>[]) : []
  const platforms: PlatformRecord[] = rawPlatforms.map((p) => ({
    id: asString(p.id),
    handle: asString(p.handle),
    url: asString(p.url) || undefined,
    postsPerWeek: asNumber(p["posts-per-week"]),
    bestTimes: asArray(p["best-times"]),
    priority: asNumber(p.priority),
    contentType: asString(p["content-type"]),
    note: asString(p.note),
  }))

  function readTargets(rawList: unknown): TargetRecord[] {
    if (!Array.isArray(rawList)) return []
    return (rawList as Record<string, unknown>[]).map((t) => {
      const lastRaw = t["last-engaged"]
      const lastEngaged = lastRaw === null || lastRaw === undefined || lastRaw === "" ? null : asString(lastRaw)
      return {
        handle: asString(t.handle),
        platform: asString(t.platform),
        tier: asNumber(t.tier),
        reason: asString(t.why) || asString(t.alignment),
        receipts: Array.isArray(t.receipts) && (t.receipts as unknown[]).length > 0 ? asArray(t.receipts) : undefined,
        lastEngaged,
        note: asString(t.note) || undefined,
      }
    })
  }

  const adversarialTargets = readTargets(fm["adversarial-targets"])
  const friendlyTargets = readTargets(fm["friendly-targets"])

  const cohortsMap = asObject(fm["hashtag-cohorts"])
  const hashtagCohorts: HashtagCohort[] = Object.keys(cohortsMap).map((id) => ({
    id,
    tags: asArray(cohortsMap[id]),
  }))

  function readGoals(node: unknown): WeeklyGoals {
    const m = asObject(node)
    return {
      followersX: asNumber(m["followers-x"]) || undefined,
      followersBluesky: asNumber(m["followers-bluesky"]) || undefined,
      followersInstagram: asNumber(m["followers-instagram"]) || undefined,
      patreonSupporters: asNumber(m["patreon-supporters"]) || undefined,
      engagementRate: asNumber(m["engagement-rate"]) || undefined,
    }
  }
  const weeklyGoals = readGoals(fm["weekly-goals"])
  const weeklyActual = readGoals(fm["weekly-actual"])

  const rawLevers = Array.isArray(fm["algorithm-levers"]) ? (fm["algorithm-levers"] as Record<string, unknown>[]) : []
  const algorithmLevers: AlgorithmLever[] = rawLevers.map((l) => ({
    lever: asString(l.lever),
    note: asString(l.note),
    status: asString(l.status) || "testing",
  }))

  return {
    title: asString(fm.title, "Distribution Schedule"),
    status: asString(fm.status, "draft"),
    lastUpdated: asString(fm["last-updated"]),
    operatingPrinciple: asString(fm["operating-principle"]),
    weeklyRhythm,
    platforms,
    adversarialTargets,
    friendlyTargets,
    hashtagCohorts,
    weeklyGoals,
    weeklyActual,
    algorithmLevers,
    body: parsed.content,
  }
}
