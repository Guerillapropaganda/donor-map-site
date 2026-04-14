/**
 * claims-store.ts — read-only TypeScript mirror of scripts/lib/claims-store.cjs
 *
 * Loads data/claims/{slug}.jsonl + data/claims/{slug}-synthesis.md for
 * the Quartz ClaimObject transformer. Same repo-root resolution pattern
 * as quartz/util/sources-store.ts.
 *
 * Part of Phase 4 — Claim-Object Experiment. See ADR-0003 / Phase 4
 * handoff for context.
 */

import fs from "fs"
import path from "path"

export type ClaimCategory =
  | "identity"
  | "funding_pattern"
  | "voting_record"
  | "stated_position"
  | "policy_outcome"
  | "contradiction"
  | "event_participation"
  | "relationship"
  | "other"

export type ClaimConfidence = "high" | "medium" | "low"

export interface ClaimRecord {
  id: string
  profile_slug: string
  text: string
  category: ClaimCategory
  section_key: string
  source_ref: string | null
  source_fallback_url: string | null
  confidence: ClaimConfidence
  corroborated_by: string[]
  data: Record<string, any> | null
  added: string
  added_by: string
  verified: boolean
  verified_at: string | null
  verified_by: string | null
  editor_notes: string
}

const _claimsCache = new Map<string, ClaimRecord[]>()
const _synthesisCache = new Map<string, string>()

function findRepoRoot(startDir: string): string {
  let dir = startDir
  for (let i = 0; i < 6; i++) {
    if (fs.existsSync(path.join(dir, "data", "claims"))) return dir
    if (fs.existsSync(path.join(dir, ".git"))) return dir
    const parent = path.dirname(dir)
    if (parent === dir) break
    dir = parent
  }
  return startDir
}

function claimsFileFor(slug: string): string {
  const root = findRepoRoot(process.cwd())
  return path.join(root, "data", "claims", `${slug}.jsonl`)
}

function synthesisFileFor(slug: string): string {
  const root = findRepoRoot(process.cwd())
  return path.join(root, "data", "claims", `${slug}-synthesis.md`)
}

export function loadClaimsForProfile(slug: string): ClaimRecord[] {
  if (_claimsCache.has(slug)) return _claimsCache.get(slug)!
  const file = claimsFileFor(slug)
  if (!fs.existsSync(file)) {
    _claimsCache.set(slug, [])
    return []
  }
  const raw = fs.readFileSync(file, "utf-8")
  const records: ClaimRecord[] = []
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed) continue
    try {
      records.push(JSON.parse(trimmed) as ClaimRecord)
    } catch {}
  }
  _claimsCache.set(slug, records)
  return records
}

export function loadSynthesis(slug: string): string | null {
  if (_synthesisCache.has(slug)) return _synthesisCache.get(slug)!
  const file = synthesisFileFor(slug)
  if (!fs.existsSync(file)) {
    _synthesisCache.set(slug, "")
    return null
  }
  const text = fs.readFileSync(file, "utf-8")
  _synthesisCache.set(slug, text)
  return text
}

export function clearClaimsCache(): void {
  _claimsCache.clear()
  _synthesisCache.clear()
}
