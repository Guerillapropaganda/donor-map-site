/**
 * profile-type-rulebook.ts — reader for config/profile-type-rulebook.json
 *
 * TypeScript mirror of scripts/lib/profile-type-rulebook.cjs. Consumed by
 * the Ops app (dashboard, /rules editor, VerificationChecklist, etc.)
 *
 * KEEP IN SYNC with the CJS copy. Any schema change here requires the
 * same edit in the CJS mirror.
 */
import fs from "fs"
import path from "path"

// ─── JSON schema types ─────────────────────────────────────────────────

export interface TypeVisual {
  "color-light": string
  "color-dark": string
  icon: string
}

export interface TierRequirements {
  required?: string[]
  recommended?: string[]
}

export interface PromotionGates {
  ready?: "auto" | "manual" | "none" | "hybrid"
  verified?: "auto" | "manual" | "none" | "hybrid"
  "s-tier"?: "auto" | "manual" | "none" | "hybrid"
}

export interface BaseRulebook {
  tiers: Record<string, TierRequirements>
  "promotion-gate": PromotionGates
}

export interface SubCategoryOverrides {
  adds?: Record<string, string[]>
  removes?: string[]
  replaces?: Record<string, string>
}

export interface SubCategoryEntry {
  label: string
  visual?: { icon?: string }
  overrides?: SubCategoryOverrides
}

export interface TypeEntry {
  label: string
  description?: string
  visual: TypeVisual
  "voice-scanned"?: boolean
  "hallucination-scanned"?: boolean
  "base-rulebook": BaseRulebook
  "sub-categories"?: Record<string, SubCategoryEntry>
  notes?: Record<string, string>
}

export interface Rulebook {
  $schema?: string
  version: string
  "last-updated"?: string
  "tier-order": string[]
  types: Record<string, TypeEntry>
}

// ─── File loading ──────────────────────────────────────────────────────

// Resolve from the ops working directory (process.cwd() is ops/ when the
// dev server runs) or from the repo root if running a standalone script.
function resolveRulebookPath(): string {
  const candidates = [
    path.resolve(process.cwd(), "..", "config", "profile-type-rulebook.json"),
    path.resolve(process.cwd(), "config", "profile-type-rulebook.json"),
  ]
  for (const c of candidates) {
    if (fs.existsSync(c)) return c
  }
  return candidates[0]
}

let _cache: Rulebook | null = null

export function loadRulebook(): Rulebook {
  if (_cache) return _cache
  const raw = fs.readFileSync(resolveRulebookPath(), "utf-8")
  _cache = JSON.parse(raw) as Rulebook
  return _cache
}

export function clearRulebookCache(): void {
  _cache = null
}

// ─── Public API ────────────────────────────────────────────────────────

export function listAllTypes(): string[] {
  return Object.keys(loadRulebook().types)
}

export function listAllSubCategories(type: string): string[] {
  const entry = getTypeRulebook(type)
  if (!entry) return []
  return Object.keys(entry["sub-categories"] || {})
}

export function getTypeRulebook(type: string): TypeEntry | null {
  const r = loadRulebook()
  return r.types[type] || null
}

export function getSubCategoryOverrides(
  type: string,
  category: string | null | undefined
): SubCategoryEntry | null {
  const entry = getTypeRulebook(type)
  if (!entry || !category) return null
  const subs = entry["sub-categories"] || {}
  return subs[category] || null
}

export function getTierRequirements(
  type: string,
  category: string | null | undefined,
  tier: string
): { required: string[]; recommended: string[] } {
  const entry = getTypeRulebook(type)
  if (!entry) return { required: [], recommended: [] }
  const base = entry["base-rulebook"]?.tiers[tier] || {}
  return {
    required: (base.required || []).slice(),
    recommended: (base.recommended || []).slice(),
  }
}

export function getTypeVisual(type: string): TypeVisual | null {
  const entry = getTypeRulebook(type)
  return entry ? entry.visual : null
}

export function getPromotionGate(
  type: string,
  tier: "ready" | "verified" | "s-tier"
): "auto" | "manual" | "none" | "hybrid" | null {
  const entry = getTypeRulebook(type)
  if (!entry) return null
  const gates = entry["base-rulebook"]?.["promotion-gate"] || {}
  return gates[tier] || null
}

export function isVoiceScanned(type: string): boolean {
  const entry = getTypeRulebook(type)
  if (!entry) return false
  return entry["voice-scanned"] !== false
}

export function isHallucinationScanned(type: string): boolean {
  const entry = getTypeRulebook(type)
  if (!entry) return false
  return entry["hallucination-scanned"] !== false
}

/**
 * Resolve a flat vault type value (e.g. "corporation", "senator",
 * "investigation") to its top-level rulebook type (e.g. "entity",
 * "politician", "story"). Mirrors the CJS `resolveTopLevelType` in
 * scripts/lib/profile-type-rulebook.cjs.
 *
 * Lookup order:
 *   1. If `type` is itself a top-level rulebook entry, return it unchanged.
 *   2. If `type` matches any top-level type's sub-category, return the parent.
 *   3. Otherwise return null.
 */
export function resolveTopLevelType(type: string | undefined | null): string | null {
  if (!type) return null
  const r = loadRulebook()
  if (r.types[type]) return type
  for (const [topName, topEntry] of Object.entries(r.types)) {
    const subs = topEntry["sub-categories"] || {}
    if (type in subs) return topName
  }
  return null
}

/**
 * Compose the effective check list for (type, category, tier) by applying
 * sub-category overrides onto the base rulebook. Mirrors the CJS
 * `resolveChecks` function in scripts/lib/profile-type-rulebook.cjs.
 */
export function resolveChecks(
  type: string,
  category: string | null | undefined,
  tier: string
): { required: string[]; recommended: string[]; removed: string[] } {
  const base = getTierRequirements(type, category, tier)
  const overrides = category ? getSubCategoryOverrides(type, category) : null
  if (!overrides || !overrides.overrides) {
    return { required: base.required, recommended: base.recommended, removed: [] }
  }
  const o = overrides.overrides
  let required = base.required.slice()
  let recommended = base.recommended.slice()
  const removed: string[] = []

  if (o.adds && o.adds[tier]) {
    required = required.concat(o.adds[tier])
  }
  if (Array.isArray(o.removes)) {
    required = required.filter((id) => {
      if (o.removes!.includes(id)) {
        removed.push(id)
        return false
      }
      return true
    })
    recommended = recommended.filter((id) => !o.removes!.includes(id))
  }
  if (o.replaces && typeof o.replaces === "object") {
    required = required.map((id) => o.replaces![id] || id)
    recommended = recommended.map((id) => o.replaces![id] || id)
  }
  return { required, recommended, removed }
}
