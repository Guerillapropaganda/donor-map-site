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

/**
 * Additive-only seed merge.
 *
 * Seeds whose id is NOT yet in the store are inserted with status: "open".
 * Seeds whose id IS already in the store are returned exactly as the
 * store has them - status, url, notes, label, detail, lane are NEVER
 * overwritten by the catalog. This protects David's verification work
 * from being silently reverted when a catalog field is edited later.
 *
 * The store is the source of truth. The catalog provides initial state
 * for never-before-seen ids, full stop.
 *
 * The store file is only written when at least one new seed was
 * inserted. Repeated calls with no new ids are pure reads.
 *
 * If David explicitly wants to re-pull catalog metadata onto an existing
 * entry (e.g. updated label after a refactor), do it through a dedicated
 * "Refresh from catalog" action, not silently on every page render.
 */
export function ensureSeeded(seeds: VerificationSeed[]): VerificationEntry[] {
  const existing = readStore()
  const byId = new Map(existing.map((e) => [e.id, e]))
  const now = new Date().toISOString()
  const result: VerificationEntry[] = []
  const newEntries: VerificationEntry[] = []
  for (const seed of seeds) {
    const prev = byId.get(seed.id)
    if (prev) {
      // Additive-only: keep persisted state exactly as it is.
      result.push(prev)
      byId.delete(seed.id)
    } else {
      const newEntry: VerificationEntry = {
        ...seed,
        status: "open",
        updatedAt: now,
      }
      result.push(newEntry)
      newEntries.push(newEntry)
    }
  }
  // Preserve any orphans that exist in the store but are no longer in
  // the catalog (e.g. a seed removed mid-flight). Don't drop David's work.
  for (const orphan of byId.values()) result.push(orphan)
  if (newEntries.length > 0) writeStore(result)
  return result
}
