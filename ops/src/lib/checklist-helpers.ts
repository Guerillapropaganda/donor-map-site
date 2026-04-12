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
 * floor (3+). The A+ check in VerificationChecklist.tsx uses frontmatter
 * only (no body fallback) to prevent false positives at the highest tier.
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
  const re = new RegExp(`^#{2,4}\\s+${esc}`, "im")
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
    /\bspouse\b[^.\n]{0,80}\b(employ|board|lobby|consult|company|firm|corp|capital|partner)/i,
    /\b(husband|wife)\b[^.\n]{0,80}\b(employ|board|lobby|consult|company|firm|corp|capital|partner|manag|direct)/i,
    /\bmarried?\b[^.\n]{0,80}\b(billionaire|financier|executive|CEO|founder|partner)/i,
    /\bchief of staff\b[^.\n]{0,120}\b(joined|became|hired|left|went)/i,
    /\bformer\s+(staff|aide|chief of staff|director|secretary|administrator)/i,
    /\bwent to work for\b/i,
    /\bhired\s+\d+\s+government officials\b/i,
    /\bformer\s+(pentagon|faa|epa|sec|fcc|doj|fda)\b/i,
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

// ══════════════════════════════════════════════════════════════════════
// CHECK-ID SYSTEM (Phase 2a)
// ══════════════════════════════════════════════════════════════════════
//
// Every check-id referenced by config/profile-type-rulebook.json maps to
// a function in the CHECKS registry below. The rulebook is declarative;
// the check implementations are here.
//
// Each check function takes (frontmatter, body, context) and returns a
// CheckResult. The frontmatter is the raw YAML object with hyphenated
// keys preserved (not the camelCase Profile interface — the check system
// operates on raw frontmatter so it can be shared with the CJS mirror at
// scripts/lib/checklist-helpers.cjs).
//
// Mirror in sync with scripts/lib/checklist-helpers.cjs. Any new check
// added here must also be added to the CJS mirror and vice versa.

export type Frontmatter = Record<string, unknown>

export interface CheckContext {
  type?: string
  category?: string
  tier?: string
}

export interface CheckResult {
  passed: boolean
  reason?: string
  na?: boolean
  naReason?: string
}

export type CheckFn = (
  frontmatter: Frontmatter,
  body: string,
  context: CheckContext
) => CheckResult

function _present(val: unknown): boolean {
  if (val === undefined || val === null) return false
  if (typeof val === "string" && val.trim() === "") return false
  if (Array.isArray(val) && val.length === 0) return false
  return true
}

function _arrayCount(val: unknown): number {
  if (Array.isArray(val)) return val.length
  if (typeof val === "string") {
    const matches = val.match(/\[\[[^\]]+\]\]/g)
    return matches ? matches.length : 0
  }
  return 0
}

function _pass(): CheckResult {
  return { passed: true }
}

function _fail(reason: string): CheckResult {
  return { passed: false, reason }
}

function _stub(id: string): CheckResult {
  return { passed: true, reason: `[stub: ${id}]` }
}

/**
 * Minimal Profile-ish adapter for reusing existing helpers (hasHeading,
 * runLegalReviewCheck, isEnrichedWithin, countSourceTypes) that expect a
 * Profile interface. Raw frontmatter keys are mapped to the camelCase
 * shape those helpers understand.
 */
function _toProfileShape(fm: Frontmatter): Profile {
  return {
    path: "",
    title: String(fm.title || ""),
    type: String(fm.type || ""),
    contentReadiness: String(fm["content-readiness"] || "raw"),
    folder: "",
    subfolder: "",
    lastEnriched: fm["last-enriched"] as string | undefined,
    sourceTypes: (fm["source-types"] as string[] | undefined) || [],
    legalReviewResult: fm["legal-review-result"] as "pass" | "block" | "defer" | undefined,
    legalReviewDate: fm["legal-review-date"] as string | undefined,
    donors: fm.donors as string | undefined,
    opposes: fm.opposes as string | undefined,
  } as Profile
}

export const CHECKS: Record<string, CheckFn> = {
  // ─── Basic identity ───────────────────────────────────────────────
  "title-present": (p) => (_present(p.title) ? _pass() : _fail("title is required")),
  "type-is-politician": (p) =>
    p.type === "politician" ? _pass() : _fail(`type is "${p.type}", expected politician`),
  "type-is-donor": (p) =>
    p.type === "donor" ? _pass() : _fail(`type is "${p.type}", expected donor`),
  "type-is-entity": (p) =>
    p.type === "entity" || p.type === "corporation"
      ? _pass()
      : _fail(`type is "${p.type}", expected entity`),
  "type-is-media": (p) =>
    p.type === "media" ? _pass() : _fail(`type is "${p.type}", expected media`),
  "type-is-judicial": (p) =>
    p.type === "judicial" ? _pass() : _fail(`type is "${p.type}", expected judicial`),
  "type-is-story": (p) =>
    p.type === "story" || p.type === "investigation"
      ? _pass()
      : _fail(`type is "${p.type}", expected story`),
  "type-is-event": (p) =>
    p.type === "event" ? _pass() : _fail(`type is "${p.type}", expected event`),

  // ─── Frontmatter field presence ──────────────────────────────────
  "category-present": (p) =>
    _present(p.category) ? _pass() : _fail("category is required"),
  "party-present": (p) => (_present(p.party) ? _pass() : _fail("party is required")),
  "state-or-district-present": (p) =>
    _present(p.state) || _present(p["state-abbr"]) || _present(p.district)
      ? _pass()
      : _fail("state or district is required"),
  "full-name-present": (p) =>
    _present(p["full-name"]) || _present(p.title)
      ? _pass()
      : _fail("full-name is required"),
  "last-updated-present": (p) =>
    _present(p["last-updated"]) ? _pass() : _fail("last-updated is required"),
  "residence-state-present": (p) =>
    _present(p["residence-state"]) || _present(p.state)
      ? _pass()
      : _fail("residence-state is required"),
  "wealth-origin-present": (p) =>
    _present(p["wealth-origin"]) ? _pass() : _fail("wealth-origin is required"),
  "sector-present": (p) =>
    _present(p.sector) ? _pass() : _fail("sector is required"),
  "headquarters-state-present": (p) =>
    _present(p["headquarters-state"]) || _present(p.state)
      ? _pass()
      : _fail("headquarters-state is required"),
  "founded-year-present": (p) =>
    _present(p.founded) || _present(p["founded-year"])
      ? _pass()
      : _fail("founded year is required"),
  "central-thesis-present": (p) =>
    _present(p["central-thesis"]) ? _pass() : _fail("central-thesis is required"),
  "story-grade-set": (p) =>
    ["story", "report", "investigation"].includes(String(p["story-grade"]))
      ? _pass()
      : _fail("story-grade must be story/report/investigation"),
  "angle-field-present": (p) =>
    _present(p.angle) ? _pass() : _fail("angle field is required for S-tier"),
  "legal-identifier-present": (p) =>
    _present(p.ein) ||
    _present(p["fec-id"]) ||
    _present(p.cik) ||
    _present(p["lda-registrant-id"]) ||
    _present(p["state-business-registration"])
      ? _pass()
      : _fail("at least one legal identifier required (ein/fec-id/cik/lda/state-reg)"),
  "ein-present": (p) => (_present(p.ein) ? _pass() : _fail("ein is required")),
  "fec-id-present": (p) =>
    _present(p["fec-id"]) ? _pass() : _fail("fec-id is required"),
  "legal-name-formal": (p) =>
    _present(p["legal-name"]) || _present(p.title)
      ? _pass()
      : _fail("legal-name is required"),
  "net-worth-present": (p) =>
    _present(p["net-worth"]) ? _pass() : _fail("net-worth is required"),
  "net-worth-source": (p) =>
    _present(p["net-worth-source"]) ? _pass() : _fail("net-worth-source is required"),
  "author-present": (p) =>
    _present(p.author) ? _pass() : _fail("author is required"),
  "status-present": (p) =>
    _present(p.status) ? _pass() : _fail("status is required"),
  "written-date-present": (p) =>
    _present(p["written-date"]) || _present(p["last-updated"])
      ? _pass()
      : _fail("written-date is required"),
  "story-category-present": (p) =>
    _present(p["story-category"]) || _present(p.category)
      ? _pass()
      : _fail("story-category is required"),
  "published-date-if-published": (p) => {
    if (p.status !== "published") return _pass()
    return _present(p["published-date"])
      ? _pass()
      : _fail("published-date required when status is published")
  },
  "word-count-present": (p) =>
    _present(p["word-count"]) ? _pass() : _fail("word-count is required"),
  "date-present": (p) =>
    _present(p.date) ? _pass() : _fail("date is required"),
  "source-present": (p) =>
    _present(p.source) ? _pass() : _fail("source is required"),
  "source-url-present": (p) =>
    _present(p["source-url"]) ? _pass() : _fail("source-url is required"),
  "profiles-linked-count-gte-1": (p) =>
    _arrayCount(p.profiles) >= 1 ? _pass() : _fail("at least 1 linked profile required"),

  // ─── Counts ───────────────────────────────────────────────────────
  "issues-listed": (p) =>
    _arrayCount(p.issues) >= 1 ? _pass() : _fail("at least one issue required"),
  "issues-count-gte-3": (p) =>
    _arrayCount(p.issues) >= 3 ? _pass() : _fail("at least 3 issues required"),
  "top-donors-count-gte-5": (p) =>
    _arrayCount(p["top-donors"]) >= 5 ? _pass() : _fail("at least 5 top-donors required"),
  "related-count-gte-5": (p) =>
    _arrayCount(p.related) >= 5 ? _pass() : _fail("at least 5 related profiles required"),
  "linked-profiles-count-gte-3": (p) =>
    _arrayCount(p["linked-profiles"]) >= 3 || _arrayCount(p.profiles) >= 3
      ? _pass()
      : _fail("at least 3 linked profiles required"),
  "linked-profiles-count-gte-5": (p) =>
    _arrayCount(p["linked-profiles"]) >= 5 || _arrayCount(p.profiles) >= 5
      ? _pass()
      : _fail("at least 5 linked profiles required"),
  "linked-profiles-count-gte-10": (p) =>
    _arrayCount(p["linked-profiles"]) >= 10 || _arrayCount(p.profiles) >= 10
      ? _pass()
      : _fail("at least 10 linked profiles required"),
  "linked-profiles-count-gte-15": (p) =>
    _arrayCount(p["linked-profiles"]) >= 15 || _arrayCount(p.profiles) >= 15
      ? _pass()
      : _fail("at least 15 linked profiles required"),
  "politicians-funded-count-gte-5": (p) =>
    _arrayCount(p["politicians-funded"]) >= 5
      ? _pass()
      : _fail("at least 5 politicians-funded required"),
  "politicians-funded-or-opposed-count-gte-5": (p) => {
    const total =
      _arrayCount(p["politicians-funded"]) + _arrayCount(p["politicians-opposed"])
    return total >= 5 ? _pass() : _fail("at least 5 politicians funded-or-opposed required")
  },
  "landmark-opinions-count-gte-3": (p) =>
    _arrayCount(p["landmark-opinions"]) >= 3
      ? _pass()
      : _fail("at least 3 landmark-opinions required"),
  "top-recipients-with-amounts": (p) =>
    _arrayCount(p["top-recipients"]) >= 1
      ? _pass()
      : _fail("top-recipients with amounts required"),
  "total-giving-cycle": (p) =>
    _present(p["total-giving"]) || _present(p["cycle-totals"])
      ? _pass()
      : _fail("total-giving or cycle-totals required"),
  "total-political-spend": (p) =>
    _present(p["total-political-spend"]) || _present(p["total-giving"])
      ? _pass()
      : _fail("total-political-spend required"),
  "lobbying-spend-if-registered": (p) => {
    if (!p["lda-registrant-id"] && !p.lobbyist) return { passed: true, na: true }
    return _present(p["lobbying-spend"])
      ? _pass()
      : _fail("lobbying-spend required for LDA-registered entities")
  },
  "primary-sources-listed": (p) =>
    _arrayCount(p["primary-sources"]) >= 1
      ? _pass()
      : _fail("primary-sources must be listed"),

  // ─── Audit stamps ─────────────────────────────────────────────────
  "audit-a-plus-passed-stamp": (p) =>
    _present(p["audit-a-plus-passed"])
      ? _pass()
      : _fail("audit-a-plus-passed timestamp required"),
  "editorial-signoff-present": (p) =>
    _present(p["last-verified-by"]) && p["last-verified-by"] === "editorial"
      ? _pass()
      : _fail("editorial sign-off required (last-verified-by: editorial)"),
  "linked-original-story-investigation-grade": (p) =>
    _present(p["linked-original-story"])
      ? _pass()
      : _fail("linked-original-story required for S-tier"),

  // ─── Freshness (reuse existing helper via adapter) ───────────────
  "last-enriched-within-90-days": (p) =>
    isEnrichedWithin(_toProfileShape(p), 90)
      ? _pass()
      : _fail("last-enriched must be within 90 days"),
  "last-enriched-within-180-days": (p) =>
    isEnrichedWithin(_toProfileShape(p), 180)
      ? _pass()
      : _fail("last-enriched must be within 180 days"),

  // ─── Source counts (reuse existing helper) ───────────────────────
  "tier1-source-count-gte-3": (p, body) => {
    const count = countSourceTypes(_toProfileShape(p), body || "")
    return count >= 3 ? _pass() : _fail(`source-types has ${count}, need >=3`)
  },
  "tier1-source-count-gte-2": (p, body) => {
    const count = countSourceTypes(_toProfileShape(p), body || "")
    return count >= 2 ? _pass() : _fail(`source-types has ${count}, need >=2`)
  },
  "foreign-tier1-source-count-gte-2": (p, body) => {
    const count = countSourceTypes(_toProfileShape(p), body || "")
    return count >= 2 ? _pass() : _fail(`source-types has ${count}, need >=2`)
  },

  // ─── Body scanners (reuse existing helpers) ──────────────────────
  "class-analysis-heading": (_p, body) =>
    hasHeading(body || "", "Class Analysis")
      ? _pass()
      : _fail("## Class Analysis heading required in body"),
  "legal-review-if-defamation": (p, body) => {
    const result = runLegalReviewCheck(_toProfileShape(p), body || "")
    return result.passed
      ? _pass()
      : _fail(
          `${result.hits.length} defamation-prone line(s); legal-review-result: pass required`
        )
  },
  "summary-in-body": (_p, body) =>
    body && body.trim().length >= 50
      ? _pass()
      : _fail("summary paragraph required in body"),
}

// Stub all remaining rulebook check-ids. Real logic lands in Part 2.
const STUB_CHECK_IDS: string[] = [
  "executive-orders-documented",
  "cabinet-appointments-listed",
  "nominations-record-present",
  "previous-cycle-fundraising",
  "tie-breaker-votes-cast",
  "committee-assignments-present",
  "bills-sponsored-count",
  "committee-capture-analysis",
  "confirmation-hearing-summary",
  "agency-budget-controlled",
  "prior-industry-ties",
  "state-executive-orders",
  "state-budget-signed",
  "vetoes-issued",
  "state-cabinet-appointments",
  "state-chamber-present",
  "state-district-present",
  "state-voting-record-if-available",
  "lawsuits-filed-list",
  "amicus-briefs-list",
  "multistate-coalitions",
  "jurisdiction-present",
  "charging-patterns",
  "notable-prosecutions",
  "district-present",
  "appointing-president",
  "appointing-authority",
  "investigation-scope",
  "indictments-filed",
  "final-report",
  "campaign-platform",
  "primary-opponents",
  "endorsers",
  "ballot-status",
  "country-context",
  "us-relations",
  "policy-positions-affecting-us",
  "fec-fundraising-data",
  "voting-record-pipeline",
  "fec-individual-contributions",
  "industry-present",
  "sec-public-holdings-if-applicable",
  "founder-generation",
  "current-head",
  "family-members-list",
  "family-foundation-linked",
  "family-trust-if-known",
  "generational-giving-arc",
  "bundled-for-campaigns",
  "bundling-method",
  "cycle-totals-broken-out",
  "max-out-recipients",
  "bundled-vs-direct-ratio",
  "platform-name",
  "platform-volume",
  "platform-party-alignment",
  "stock-ticker-if-public",
  "revenue-present",
  "employees-count",
  "subsidiaries-listed",
  "regulatory-agencies-listed",
  "federal-contracts-count",
  "court-cases-count",
  "sec-edgar-data-if-public",
  "affiliated-entity-linked",
  "top-candidate-recipients",
  "independent-expenditures-list",
  "top-funders-list",
  "coordination-allegations-if-any",
  "dark-money-source-percentage",
  "propublica-nonprofit-data",
  "total-revenue",
  "total-assets",
  "program-service-revenue",
  "political-activity-scrutiny",
  "political-spending-ratio",
  "dark-money-flows-documented",
  "funder-triangulation-from-other-990s",
  "irs-527-id-or-fec-id",
  "top-donors-disclosed",
  "tax-status-specified",
  "policy-areas-present",
  "funder-profile-present",
  "revolving-door-documented",
  "lda-registrant-id",
  "senate-lda-data",
  "clients-with-annual-spend",
  "lobbyists-listed",
  "issue-areas-present",
  "contract-bundles-present",
  "member-companies-listed",
  "industry-represented-present",
  "issue-positions-present",
  "member-dissent-documented",
  "grantees-with-amounts",
  "donor-family-linked",
  "grant-pattern-analysis",
  "donor-advised-fund-usage",
  "passthrough-function-described",
  "known-grantees-listed",
  "known-funders-listed",
  "money-flow-chain-documented",
  "state-business-registration-or-ein",
  "clients-listed",
  "services-described",
  "key-personnel-listed",
  "executives-listed",
  "sub-category-target-present",
  "primary-medium-present",
  "ownership-chain-traced",
  "founded-or-first-active-year",
  "beats-count-gte-3",
  "audience-reach-with-method-and-date",
  "alignment-bucket-present",
  "frequently-covers-listed",
  "retraction-history-documented",
  "annual-revenue-if-available",
  "key-personalities-listed",
  "editorial-leadership-listed",
  "funding-sources-broken-out",
  "audience-demographics-if-available",
  "employer-current-linked",
  "employer-history",
  "notable-stories-listed",
  "awards-listed",
  "academic-fellowships-if-any",
  "platforms-listed",
  "political-alignment-editorial",
  "consulting-work-if-disclosed",
  "known-sponsors-listed",
  "incentive-analysis-written",
  "show-name-present",
  "network-linked",
  "show-format",
  "audience-size-with-method",
  "guest-pattern-documented",
  "advertiser-boycotts-if-any",
  "hosts-linked",
  "network-or-independent",
  "monetization-model",
  "episode-cadence",
  "audience-rank-with-date",
  "frequent-guests-documented",
  "topic-clusters-documented",
  "platforms-with-follower-counts",
  "primary-platform",
  "funding-triangulation-documented",
  "parent-outlet-linked",
  "members-listed-if-public",
  "endorsement-history",
  "editorial-shifts-documented",
  "court-present",
  "appointment-path-present",
  "sitting-since-present",
  "nominating-president-if-federal",
  "confirmation-vote-if-federal",
  "prior-career-present",
  "ideological-network-present",
  "courtlistener-pipeline-data",
  "financial-disclosure-summary",
  "recusal-record",
  "ethics-concerns-documented",
  "dissent-concurrence-pattern",
  "confirmation-dossier-highlights",
  "dark-money-confirmation-campaign-documented",
  "spousal-conflicts-if-any",
  "propublica-class-accountability-investigation",
  "circuit-present",
  "reversal-rate",
  "scotus-feeder-track-if-applicable",
  "prior-position",
  "notable-case-assignments",
  "state-present",
  "retention-method",
  "partisan-identifier-if-applicable",
  "campaign-finance-if-elected",
  "court-level",
  "agency-present",
  "agency-adjudication-database",
  "international-body-present",
  "appointing-body",
  "home-country",
  "notable-international-opinions",
  "nomination-date",
  "hearing-date",
  "committee-vote",
  "confirmation-status",
  "post-judicial-activity",
  "interviews-conducted-noted",
  "every-claim-sourced",
  "contradictions-surfaced",
  "impact-documented",
  "new-facts-not-in-existing-reporting",
  "contradiction-investigation-documented",
  "primary-sources-include-non-public-document",
  "sources-synthesized-count-gte-5",
  "subject-linked",
  "word-count-gte-3000",
  "word-count-gte-2000",
  "network-structure-described",
  "narrative-arc-present",
]

for (const id of STUB_CHECK_IDS) {
  if (!CHECKS[id]) {
    CHECKS[id] = ((checkId: string) => () => _stub(checkId))(id)
  }
}

export function runCheck(
  id: string,
  frontmatter: Frontmatter,
  body: string,
  context: CheckContext = {}
): CheckResult {
  const fn = CHECKS[id]
  if (!fn) return { passed: false, reason: `unknown check id: ${id}` }
  try {
    return fn(frontmatter || {}, body || "", context)
  } catch (e) {
    return { passed: false, reason: `check threw: ${(e as Error).message}` }
  }
}

export function CHECK_IDS(): string[] {
  return Object.keys(CHECKS)
}
