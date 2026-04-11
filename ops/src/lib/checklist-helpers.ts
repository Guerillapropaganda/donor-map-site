/**
 * checklist-helpers.ts — Shared check logic for verification checklist
 *
 * Extracted from VerificationChecklist.tsx and pipeline-janitor.cjs in
 * plan step 2 (see C:\Users\third\.claude\plans\keen-inventing-wall.md).
 *
 * RULE: all body-text checks use the frontmatter-first, body-fallback
 * pattern established in commit e13b8df3 — a check passes if the
 * frontmatter field is populated OR the expected body marker is present.
 * This prevents false negatives when a pipeline has run but hasn't yet
 * updated the frontmatter (or vice versa).
 *
 * A parallel CJS copy lives at `scripts/lib/checklist-helpers.cjs` for
 * use by `scripts/pipeline-janitor.cjs`. Both files stay in sync by hand
 * — a lint check in step 4 will enforce the mirror.
 */
import type { Profile } from "./vault"

// ─── Auto-block detection ──────────────────────────────────────────────

/**
 * Check whether a body contains a pipeline auto-block for the given name.
 * Matches both `<!-- auto:name start` and `<!-- auto:name-xxx start` variants
 * since many pipelines use composite names like `auto:fec-politician`.
 */
export function hasAutoBlock(raw: string, name: string): boolean {
  return raw.includes(`<!-- auto:${name} start`)
    || raw.includes(`<!-- auto:${name}-`)
}

/**
 * Check whether a body contains ANY of the given auto-block names.
 * Useful when a single concept has multiple pipeline aliases
 * (e.g. fec-fundraising / fec-politician / fec-donor).
 */
export function hasAnyAutoBlock(raw: string, names: string[]): boolean {
  return names.some(n => hasAutoBlock(raw, n))
}

// ─── Tier 1 source counting ───────────────────────────────────────────

/**
 * Count occurrences of "(Tier 1)" markers in the body.
 * This is the cheap fallback for the source-diversity check when the
 * frontmatter `source-types` array hasn't been populated by the pipeline.
 */
export function countTier1InBody(raw: string): number {
  return (raw.match(/\(Tier 1\)/g) || []).length
}

/**
 * Count unique source types. Prefers the frontmatter array (authoritative),
 * falls back to counting `(Tier 1)` body markers as a proxy for type diversity.
 * NOTE: the fallback overcounts when the same source-type appears multiple
 * times — a profile with 5 FEC citations and nothing else registers as 5.
 * That's acceptable for the "draft → ready" floor (2+) but NOT for the A+
 * floor (3+). For A+, prefer reading the frontmatter array directly.
 */
export function countSourceTypes(profile: Profile, raw: string): number {
  const fm = (profile.sourceTypes || []).length
  if (fm > 0) return fm
  return countTier1InBody(raw)
}

// ─── Structural body checks ───────────────────────────────────────────

/**
 * Check whether the body contains an H2 or H3 heading matching the given text.
 * Case-insensitive, matches across the whole body.
 */
export function hasHeading(raw: string, heading: string): boolean {
  const esc = heading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
  const re = new RegExp(`^#{2,3}\\s+${esc}`, "im")
  return re.test(raw)
}

/**
 * Check whether the body contains an Obsidian-style callout of the given kind.
 * Matches `> [!contradiction]`, `> [!money]`, etc.
 */
export function hasCallout(raw: string, kind: string): boolean {
  const esc = kind.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
  const re = new RegExp(`>\\s*\\[!${esc}\\]`, "i")
  return re.test(raw)
}

/**
 * Check whether a body contains a Donation-to-Policy Timeline table.
 * Looks for the canonical heading pattern or a table row with the
 * signature columns (Date, Donor, Amount, Policy Outcome).
 */
export function hasDonationPolicyTimeline(raw: string): boolean {
  if (/^#{2,4}\s*Donation[- ]to[- ]Policy Timeline/im.test(raw)) return true
  // Secondary signal: table header with the canonical column names
  if (/\|\s*Date\s*\|\s*Donor\s*\|\s*Amount\s*\|\s*Given\s*\|\s*Policy Outcome/i.test(raw)) return true
  return false
}

/**
 * Heuristic check for "dark money chain traced" narrative. Looks for
 * mentions of key dark-money actors or the explicit phrase "dark money".
 */
export function hasDarkMoneyTrace(raw: string): boolean {
  const terms = [
    /\bdark money\b/i,
    /\b501\(c\)\(4\)/i,
    /DonorsTrust/i,
    /Bradley Foundation/i,
    /Leonard Leo/i,
    /Marble Freedom Trust/i,
    /Judicial Crisis Network/i,
    /Federalist Society/i,
  ]
  return terms.some(r => r.test(raw))
}

/**
 * Heuristic for "revolving door / family network" coverage. Looks for
 * common phrasings documenting spouse employment, chief-of-staff
 * destinations, or pre/post-Congress career moves.
 */
export function hasRevolvingDoor(raw: string): boolean {
  const terms = [
    /\brevolving door\b/i,
    /\bspouse\b[^.\n]{0,80}\b(employ|board|lobby|consult)/i,
    /\bchief of staff\b[^.\n]{0,120}\b(joined|became|hired)/i,
    /\bformer\s+(staff|aide|chief of staff)/i,
    /\bwent to work for\b/i,
  ]
  return terms.some(r => r.test(raw))
}

// ─── Legal review pass ────────────────────────────────────────────────

const DEFAMATION_PRONE_WORDS = /\b(fraud|criminal|corrupt|scheme|conspired|bribed|embezzled|kickback)\b/i

/**
 * Automated legal-review pass. A profile passes if EITHER:
 *   (a) No defamation-prone words appear anywhere in the body outside a
 *       blockquote (primary-source quotes are safe), OR
 *   (b) The profile has `legal-review-result: pass` with a date.
 *
 * Returns `{ passed: boolean, hits: string[] }` — hits is the list of
 * problematic lines for review.
 */
export function runLegalReviewCheck(profile: Profile, raw: string): { passed: boolean; hits: string[] } {
  if (profile.legalReviewResult === "pass" && !!profile.legalReviewDate) {
    return { passed: true, hits: [] }
  }
  const lines = raw.split(/\r?\n/)
  const hits: string[] = []
  for (const line of lines) {
    if (!DEFAMATION_PRONE_WORDS.test(line)) continue
    // Lines that start with `>` are blockquotes — primary source quotes are safe
    if (/^\s*>/.test(line)) continue
    hits.push(line.trim().slice(0, 200))
  }
  return { passed: hits.length === 0, hits }
}

// ─── Both-sides flag detection ────────────────────────────────────────

/**
 * Detects whether the same entity appears in both `donors:` and `opposes:`.
 * This isn't inherently wrong (some entities both fund and attack the same
 * politician at different times), but it warrants a Research Claude review.
 *
 * Returns an array of entity names that appear in both. Empty array means
 * no collision.
 */
export function detectBothSidesEntities(profile: Profile): string[] {
  const donors = normalizeEntityList(profile.donors)
  const opposes = normalizeEntityList(profile.opposes)
  if (donors.length === 0 || opposes.length === 0) return []
  const donorSet = new Set(donors.map(normalizeEntityName))
  return opposes.filter(o => donorSet.has(normalizeEntityName(o)))
}

/**
 * Convert a donors/opposes field (which may be a YAML list OR a wikilink
 * string like "[[A]] · [[B]]") to a flat array of entity names.
 */
export function normalizeEntityList(field: unknown): string[] {
  if (!field) return []
  if (Array.isArray(field)) return field.map(String)
  if (typeof field !== "string") return []
  // Parse wikilink format: "[[Name]] · [[Other|Alias]]"
  const matches = field.match(/\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g)
  if (matches) {
    return matches.map(m => m.replace(/^\[\[/, "").replace(/\]\]$/, "").split("|")[0])
  }
  // Fallback: treat as a single entity
  return [field]
}

/**
 * Normalize an entity name for comparison. Lowercase, strip punctuation
 * and extra spaces. Used for fuzzy matching across donors/opposes lists
 * where one might say "AIPAC" and the other "AIPAC - American Israel Public Affairs Committee".
 */
export function normalizeEntityName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s*\([^)]*\)\s*/g, " ") // strip parenthetical notes
    .replace(/\s*-\s*.*$/, "")          // strip everything after " - " (alias text)
    .replace(/[^a-z0-9 ]/g, " ")        // punctuation → space
    .replace(/\s+/g, " ")
    .trim()
}

// ─── Enrichment freshness ─────────────────────────────────────────────

/**
 * Returns true if a profile was enriched within the last N days.
 * Returns false if no last-enriched date is set at all.
 */
export function isEnrichedWithin(profile: Profile, days: number): boolean {
  if (!profile.lastEnriched) return false
  const d = new Date(profile.lastEnriched)
  if (isNaN(d.getTime())) return false
  return (Date.now() - d.getTime()) / 86400000 <= days
}

// ─── URL and wikilink counting ────────────────────────────────────────

/**
 * Count Markdown URL citations in the body. Used by story/report/investigation
 * grading (story: 1-4 URLs, report: 5-9, investigation: 10+ with 3+ Tier 1).
 */
export function countMarkdownUrls(raw: string): number {
  return (raw.match(/\[[^\]]+\]\(https?:\/\/[^)]+\)/g) || []).length
}

/**
 * Count wikilinks in the body.
 */
export function countWikilinks(raw: string): number {
  return (raw.match(/\[\[[^\]]+\]\]/g) || []).length
}
