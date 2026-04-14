/**
 * sources-store.ts — read-only TypeScript mirror of scripts/lib/sources-store.cjs
 *
 * Loads data/sources.jsonl for build-time consumers (the {{src:ID}} transformer
 * plugin, the /sources index page emitter, etc.). Never writes — all writes go
 * through the CJS version during vault extraction and fingerprinting.
 *
 * Part of Phase 1 — Source Registry. See content/Build Phases.md and
 * content/Phases/phase-1/handoff.md for context.
 */

import fs from "fs"
import path from "path"

export type SourceStatus =
  | "unverified"
  | "live"
  | "dead"
  | "redirected"
  | "generic_orphan"
  | "archived"
  | "needs_review"
  | "paywall"

export type SourceType =
  | "government_primary"
  | "government_secondary"
  | "court_record"
  | "news_major"
  | "news_regional"
  | "investigative"
  | "academic"
  | "trade_press"
  | "advocacy"
  | "social"
  | "company_direct"
  | "aggregator"
  | "archive"
  | "other"

export interface SourceRecord {
  id: string
  url: string
  canonical_url: string | null
  final_host: string | null
  title: string | null
  content_hash: string | null
  expected_strings: string[]
  tier: 1 | 2 | 3 | 4 | null
  source_type: SourceType
  entity_ref: string | null
  claim_ref: string | null
  status: SourceStatus
  first_seen: string
  last_checked: string | null
  last_verified_live: string | null
  archive_url: string | null
  editor_notes: string
}

let _cache: SourceRecord[] | null = null
let _byId: Map<string, SourceRecord> | null = null

function resolveRegistryPath(): string {
  // Walk up from this file until we find a directory containing data/sources.jsonl.
  // In dev from the repo root, Quartz imports this as quartz/util/sources-store.ts,
  // and process.cwd() is the repo root — so the relative path is data/sources.jsonl.
  // Fall back to walking up from __dirname for robustness.
  const cwdGuess = path.join(process.cwd(), "data", "sources.jsonl")
  if (fs.existsSync(cwdGuess)) return cwdGuess

  let dir = __dirname
  for (let i = 0; i < 6; i++) {
    const candidate = path.join(dir, "data", "sources.jsonl")
    if (fs.existsSync(candidate)) return candidate
    dir = path.dirname(dir)
  }
  // Return the cwd guess anyway so error messages point to a sensible path.
  return cwdGuess
}

export function loadSources(): SourceRecord[] {
  if (_cache !== null) return _cache

  const file = resolveRegistryPath()
  if (!fs.existsSync(file)) {
    _cache = []
    _byId = new Map()
    return _cache
  }

  const raw = fs.readFileSync(file, "utf-8")
  const records: SourceRecord[] = []
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed) continue
    try {
      records.push(JSON.parse(trimmed) as SourceRecord)
    } catch {
      // Skip malformed lines silently — the pre-commit sentinel should have
      // blocked them, and we don't want a build to crash on one bad record.
    }
  }
  _cache = records
  _byId = new Map(records.map((r) => [r.id, r]))
  return _cache
}

export function clearSourcesCache(): void {
  _cache = null
  _byId = null
}

export function getSource(id: string): SourceRecord | null {
  if (_byId === null) loadSources()
  return _byId!.get(id) ?? null
}

export function countSources(): number {
  if (_cache === null) loadSources()
  return _cache!.length
}

/** Resolve a source to a display link: [title](url). Returns null if unknown. */
export function resolveSourceLink(id: string): { title: string; url: string } | null {
  const rec = getSource(id)
  if (!rec) return null
  const url = rec.canonical_url || rec.url
  // Prefer the stored title; fall back to the final host; finally the URL itself.
  const title = rec.title?.trim() || rec.final_host || rec.url
  return { title, url }
}
