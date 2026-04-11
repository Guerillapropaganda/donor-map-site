/**
 * checklist-helpers.cjs — Shared check logic (CJS copy)
 *
 * Parallel to ops/src/lib/checklist-helpers.ts. CommonJS so it can be
 * required from scripts/pipeline-janitor.cjs and other engine scripts.
 *
 * KEEP THIS FILE IN SYNC WITH THE TS COPY. A lint script in plan step 4
 * will enforce the mirror via normalized string comparison.
 *
 * Rule: all body-text checks use the frontmatter-first, body-fallback
 * pattern. See the TS copy at ops/src/lib/checklist-helpers.ts for
 * full documentation.
 */

// ─── Auto-block detection ──────────────────────────────────────────────

function hasAutoBlock(raw, name) {
  return raw.includes(`<!-- auto:${name} start`)
    || raw.includes(`<!-- auto:${name}-`)
}

function hasAnyAutoBlock(raw, names) {
  return names.some(n => hasAutoBlock(raw, n))
}

// ─── Tier 1 source counting ───────────────────────────────────────────

function countTier1InBody(raw) {
  return (raw.match(/\(Tier 1\)/g) || []).length
}

function countSourceTypes(profile, raw) {
  const fm = (profile["source-types"] || []).length
  if (fm > 0) return fm
  return countTier1InBody(raw)
}

// ─── Structural body checks ───────────────────────────────────────────

function hasHeading(raw, heading) {
  const esc = heading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
  const re = new RegExp(`^#{2,3}\\s+${esc}`, "im")
  return re.test(raw)
}

function hasCallout(raw, kind) {
  const esc = kind.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
  const re = new RegExp(`>\\s*\\[!${esc}\\]`, "i")
  return re.test(raw)
}

function hasDonationPolicyTimeline(raw) {
  if (/^#{2,4}\s*Donation[- ]to[- ]Policy Timeline/im.test(raw)) return true
  if (/\|\s*Date\s*\|\s*Donor\s*\|\s*Amount\s*\|\s*Given\s*\|\s*Policy Outcome/i.test(raw)) return true
  return false
}

function hasDarkMoneyTrace(raw) {
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

function hasRevolvingDoor(raw) {
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
 * Takes a YAML frontmatter object (raw keys with hyphens) and the raw body.
 * Unlike the TS copy, this reads `profile["legal-review-result"]` directly
 * since the engine parses frontmatter via gray-matter or js-yaml without
 * camelCase normalization.
 */
function runLegalReviewCheck(profile, raw) {
  if (profile["legal-review-result"] === "pass" && !!profile["legal-review-date"]) {
    return { passed: true, hits: [] }
  }
  const lines = raw.split(/\r?\n/)
  const hits = []
  for (const line of lines) {
    if (!DEFAMATION_PRONE_WORDS.test(line)) continue
    if (/^\s*>/.test(line)) continue
    hits.push(line.trim().slice(0, 200))
  }
  return { passed: hits.length === 0, hits }
}

// ─── Both-sides flag detection ────────────────────────────────────────

function detectBothSidesEntities(profile) {
  const donors = normalizeEntityList(profile.donors)
  const opposes = normalizeEntityList(profile.opposes)
  if (donors.length === 0 || opposes.length === 0) return []
  const donorSet = new Set(donors.map(normalizeEntityName))
  return opposes.filter(o => donorSet.has(normalizeEntityName(o)))
}

function normalizeEntityList(field) {
  if (!field) return []
  if (Array.isArray(field)) return field.map(String)
  if (typeof field !== "string") return []
  const matches = field.match(/\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g)
  if (matches) {
    return matches.map(m => m.replace(/^\[\[/, "").replace(/\]\]$/, "").split("|")[0])
  }
  return [field]
}

function normalizeEntityName(name) {
  return String(name)
    .toLowerCase()
    .replace(/\s*\([^)]*\)\s*/g, " ")
    .replace(/\s*-\s*.*$/, "")
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

// ─── Enrichment freshness ─────────────────────────────────────────────

function isEnrichedWithin(profile, days) {
  const lastEnriched = profile["last-enriched"] || profile.lastEnriched
  if (!lastEnriched) return false
  const d = new Date(lastEnriched)
  if (isNaN(d.getTime())) return false
  return (Date.now() - d.getTime()) / 86400000 <= days
}

// ─── URL and wikilink counting ────────────────────────────────────────

function countMarkdownUrls(raw) {
  return (raw.match(/\[[^\]]+\]\(https?:\/\/[^)]+\)/g) || []).length
}

function countWikilinks(raw) {
  return (raw.match(/\[\[[^\]]+\]\]/g) || []).length
}

module.exports = {
  hasAutoBlock,
  hasAnyAutoBlock,
  countTier1InBody,
  countSourceTypes,
  hasHeading,
  hasCallout,
  hasDonationPolicyTimeline,
  hasDarkMoneyTrace,
  hasRevolvingDoor,
  runLegalReviewCheck,
  detectBothSidesEntities,
  normalizeEntityList,
  normalizeEntityName,
  isEnrichedWithin,
  countMarkdownUrls,
  countWikilinks,
  DEFAMATION_PRONE_WORDS,
}
