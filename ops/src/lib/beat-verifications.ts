import fs from "node:fs"
import path from "node:path"

/**
 * Beat verifications · server-side persistence helpers.
 *
 * Backing store: data/beat-verifications.jsonl
 * The /api/beat-verifications route uses readStore / writeStore directly.
 * Server pages use ensureSeeded() to merge their hardcoded seed list with
 * any persisted statuses, so the editorial workflow can mark items
 * verified across page reloads without losing state.
 */

export type VerificationStatus = "open" | "verified" | "broken" | "unsure" | "wontfix"

export interface VerificationEntry {
  id: string
  beat: string
  label: string
  detail: string
  lane: "Editor" | "Code Claude" | "Perplexity" | "Time-based"
  url?: string
  status: VerificationStatus
  notes?: string
  verifiedBy?: string
  verifiedAt?: string
  updatedAt: string
}

export const STORE_PATH = path.join(process.cwd(), "..", "data", "beat-verifications.jsonl")

export function readStore(): VerificationEntry[] {
  try {
    if (!fs.existsSync(STORE_PATH)) return []
    const text = fs.readFileSync(STORE_PATH, "utf-8")
    return text
      .split("\n")
      .filter((l) => l.trim())
      .map((l) => JSON.parse(l) as VerificationEntry)
  } catch (err) {
    console.error("beat-verifications readStore:", err)
    return []
  }
}

export function writeStore(entries: VerificationEntry[]) {
  const text = entries.map((e) => JSON.stringify(e)).join("\n") + (entries.length ? "\n" : "")
  fs.writeFileSync(STORE_PATH, text, "utf-8")
}

export type VerificationSeed = Omit<VerificationEntry, "status" | "updatedAt">

/** Merge a hardcoded seed list with any persisted statuses. Idempotent.
 *  If a given id already exists in the store, status / notes / verifiedAt
 *  are preserved and label / detail / lane / url are refreshed from the
 *  seed (so editing the seed in the page file doesn't lose verification
 *  history). New seed entries are written with status: open. */
export function ensureSeeded(seeds: VerificationSeed[]): VerificationEntry[] {
  const existing = readStore()
  const byId = new Map(existing.map((e) => [e.id, e]))
  const now = new Date().toISOString()
  const result: VerificationEntry[] = []
  let changed = false
  for (const seed of seeds) {
    const prev = byId.get(seed.id)
    if (prev) {
      const updated: VerificationEntry = {
        ...prev,
        label: seed.label,
        detail: seed.detail,
        lane: seed.lane,
        url: seed.url ?? prev.url,
      }
      result.push(updated)
      if (
        prev.label !== seed.label ||
        prev.detail !== seed.detail ||
        prev.lane !== seed.lane ||
        prev.url !== seed.url
      ) {
        changed = true
      }
      byId.delete(seed.id)
    } else {
      const newEntry: VerificationEntry = {
        ...seed,
        status: "open",
        updatedAt: now,
      }
      result.push(newEntry)
      changed = true
    }
  }
  for (const orphan of byId.values()) result.push(orphan)
  if (changed) writeStore(result)
  return result
}
