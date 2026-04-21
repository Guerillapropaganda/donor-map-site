import { NextRequest, NextResponse } from "next/server"
import { createQueryEngine } from "@/lib/query-engine"
import { requireTier } from "@/lib/auth"
import { checkDailyLimit, checkPerMinuteLimit } from "@/lib/rate-limit"
import fs from "node:fs"
import path from "node:path"

export const dynamic = "force-dynamic"

// ─── /api/ask ────────────────────────────────────────────────────────
// Natural-language wrapper over the query engine. Pattern-matches a
// question string to one of several intents, runs it against the
// canonical stores, returns a structured payload. Intents:
//   - edge_between        two-entity edge: "X funds Y", "did X fund Y"
//   - summary             profile snapshot: "tell me about X"
//   - donors_to           "who funds X", "top donors to X"
//   - recipients_from     "where does X's money go"
//   - grants_from         "biggest grants from X [in YYYY]"
//   - affiliations_from   "what boards is X on"
//   - affiliations_to     "who's on the board of X"
//   - voting_record       "X voting record"
//   - cross_party_donors  "cross party donors"
//   - leaderboard         "top donors", "biggest super PACs", etc.
//   - money_chain         "money chain from X to Y" (1-3 hop BFS)
//   - llm_fallback        last resort if ANTHROPIC_API_KEY set
//   - generic             final fallback, dump of edges touching X

type Intent =
  | "cross_party_donors"
  | "voting_record"
  | "affiliations_from"
  | "affiliations_to"
  | "grants_from"
  | "donors_to"
  | "recipients_from"
  | "edge_between"
  | "summary"
  | "leaderboard"
  | "money_chain"
  | "compare"
  // Phase 2 additions: policy-dimension queries that cross bills / EOs /
  // offshore records with donor + voting dimensions.
  | "bills_sponsored_by"       // "bills sponsored by X" / "what bills did X introduce"
  | "bills_in_policy"          // "health bills", "bills on energy"
  | "executive_orders_by"      // "Trump's EOs", "Biden executive orders 2023"
  | "offshore_for"             // "offshore holdings of X" / "shell companies linked to X"
  | "votes_on_bill"            // "votes on H.R. 1" / "how did congress vote on Inflation Reduction Act"
  | "positions_by"             // "Bernie's nay votes" / "Republicans who voted Yea on X"
  | "vote_detail"              // "roll call s325-118.2" / "show vote h112-117.1"
  | "explain_concept"          // "what are the panama papers", "what is dark money", "what is a 527"
  | "generic"

interface EntityContext {
  name: string
  gloss: string
  blurb?: string
  profile_path?: string  // relative path to the vault markdown file — lets the UI deep-link to the full profile
}

interface AskResult {
  question: string
  intent: Intent
  resolved_title?: string | null
  resolved_title_2?: string | null
  did_you_mean?: string[]
  spec?: unknown
  total: number
  rows: unknown[]
  answer?: string                 // headline prose answer
  bullets?: string[]              // supporting bullet points
  interpretation?: string         // "what this means" plain-language explainer
  caveats?: string[]              // data limitations, "note that..."
  context?: EntityContext[]       // 1-sentence explainers for each entity
  follow_ups?: string[]           // suggested next questions, clickable in UI
  citation?: string               // cite-ready paragraph for journalists
  label?: string                  // human-friendly intent label (overrides default)
  summary?: string                // one-line meta
  note?: string
  // Plain-English overlay fields for normies (money_chain intent). These
  // lead the card with story before the schema. See renderer in
  // ops/src/app/ask/page.tsx for UX layout.
  plain_english?: string          // one-sentence TL;DR translation of the money trail
  visual_flow?: string            // pre-formatted ASCII flow diagram
  is_this_legal?: string          // answers the "is this illegal?" question readers instinctively ask
  why_matters?: string            // stakes paragraph — why this trail matters democratically
  who_is_lead?: { name: string; oneLiner: string }  // promoted "who is X" for well-known operators
  empty_reason?: string           // tag identifying WHY a query returned zero rows (entity_not_found, no_path, etc.)
}

const REPO_ROOT = path.resolve(process.cwd(), "..")

// Format dollars at the natural scale (never ".06M")
function fmtUsd(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n) || n === 0) return "$0"
  const a = Math.abs(n)
  if (a >= 1e9) return "$" + (n / 1e9).toFixed(2) + "B"
  if (a >= 10e6) return "$" + Math.round(n / 1e6) + "M"
  if (a >= 1e6) return "$" + (n / 1e6).toFixed(1) + "M"
  if (a >= 10e3) return "$" + Math.round(n / 1e3) + "K"
  if (a >= 1e3) return "$" + (n / 1e3).toFixed(1) + "K"
  return "$" + Math.round(n).toLocaleString()
}

// ─── Entity index + fuzzy resolver ────────────────────────────────────

interface EntityRec {
  id: string
  name: string
  entity_type?: string
  profile_path?: string
  signals?: Record<string, unknown>
  capital_type?: string | null
  ideological_function?: string[]
}

let entitiesCache: EntityRec[] | null = null
function loadEntities(): EntityRec[] {
  if (entitiesCache) return entitiesCache
  const raw = fs.readFileSync(path.join(REPO_ROOT, "data", "entities.jsonl"), "utf-8")
  entitiesCache = raw
    .split("\n")
    .filter(Boolean)
    .map((l) => { try { return JSON.parse(l) as EntityRec } catch { return null } })
    .filter((e): e is EntityRec => !!e && !!e.name)
  return entitiesCache
}

/**
 * Hand-curated map of persons → vehicles whose name does NOT literally
 * contain the person's name. MAGA Inc is Trump's super PAC, Save America
 * PAC is his leadership PAC, but neither contains "Donald Trump" in its
 * name, so the name-heuristic below misses them. This map fills the gap
 * for high-profile cases. Extend as new launch-50 / high-value figures
 * are added.
 *
 * Keys are canonical vault titles (exact). Values are arrays of vault
 * entity names (exact). Unknown keys fall back to the name heuristic.
 */
const MANUAL_VEHICLE_MAP: Record<string, string[]> = {
  "Donald Trump": [
    "MAGA Inc",
    "Make America Great Again Inc",
    "MAKE AMERICA GREAT AGAIN INC.",
    "Save America PAC",
    "Trump Victory",
    "Trump National Committee JFC",
    "Donald J. Trump for President",
    "DONALD J. TRUMP REPUBLICAN NOMINEE FUND 2024",
    "Team Trump",
    "Right for America",
    "Preserve America",
    "America PAC - Elon Musk", // Musk's PAC ran $90M IE for Trump; pool under both
  ],
  "Kamala Harris": [
    "Harris for President",
    "Harris Victory Fund",
    "KAMALA HARRIS VICTORY FUND",
    "HARRIS VICTORY FUND",
    "FF PAC", // Future Forward - $542M IE support
    "Future Forward USA Action",
    "FUTURE FORWARD USA ACTION",
  ],
  "Joe Biden": ["Biden for President", "Biden Victory Fund", "Biden Action Fund"],
  "Leonard Leo": [
    "Marble Freedom Trust",
    "The 85 Fund",
    "Concord Fund",
    "Judicial Crisis Network",
    "Rule of Law Trust",
    "DonorsTrust",
  ],
  "Charles Koch": [
    "Americans for Prosperity",
    "Americans for Prosperity Action, Inc. (AFP Action) dba CVA Action and dba Libre Action",
    "Stand Together",
    "Koch Industries",
  ],
  "Peter Thiel": ["Palantir Technologies", "Founders Fund"],
  "George Soros": ["Open Society Foundations", "Democracy PAC", "Democracy Alliance"],
  "Reid Hoffman": ["Mainstream Democrats PAC"],
  "Sam Bankman-Fried": ["FTX - Sam Bankman-Fried", "Protect Our Future PAC"],
  "Miriam Adelson": ["Preserve America PAC"],
  "Mitch McConnell": ["Senate Leadership Fund", "SLF PAC", "One Nation"],
  "Chuck Schumer": ["Senate Majority PAC", "Majority Forward"],
  "Nancy Pelosi": ["House Majority PAC", "HMP"],
  "Kevin McCarthy": ["Congressional Leadership Fund", "CLF", "American Action Network"],
  "Hakeem Jeffries": ["House Majority PAC", "HMP"],
  "AIPAC - American Israel Public Affairs Committee": [
    "United Democracy Project - UDP",
    "Standing Strong PAC",
    "People Standing Strong",
  ],
}

// ─── Officer registry (IRS 990 Part VII) ─────────────────────────────
// Loads data/officer-registry.jsonl lazily so "who's on the board of X"
// queries have full 990 coverage (3,060 officers across all filings),
// not just the 24 officer→org edges that survived strict exact-match
// normalization into the canonical edge store.

interface OfficerRegistryRow {
  officer_name: string
  officer_name_normalized: string
  ein: string
  filer_name: string
  titles?: string[]
  years?: number[]
  compensation_total?: number
  vault_entity_id?: string
  vault_org_name?: string
}

let officerRegistryCache: OfficerRegistryRow[] | null = null
function loadOfficerRegistry(): OfficerRegistryRow[] {
  if (officerRegistryCache) return officerRegistryCache
  const file = path.join(REPO_ROOT, "data", "officer-registry.jsonl")
  if (!fs.existsSync(file)) {
    officerRegistryCache = []
    return officerRegistryCache
  }
  officerRegistryCache = fs
    .readFileSync(file, "utf-8")
    .split("\n")
    .filter(Boolean)
    .map((l) => { try { return JSON.parse(l) as OfficerRegistryRow } catch { return null } })
    .filter((x): x is OfficerRegistryRow => !!x)
  return officerRegistryCache
}

/**
 * Look up the 990 officer registry. Returns rows shaped like affiliation
 * edges so the caller can treat them uniformly. Matches:
 *   intent=affiliations_to   (who's on the board of X) → filter by
 *     filer_name / vault_org_name equals X
 *   intent=affiliations_from (what boards does X sit on) → filter by
 *     officer_name matching X
 */
function lookupOfficerRegistry(subject: string, intent: "affiliations_from" | "affiliations_to"): Array<Record<string, unknown>> {
  if (!subject) return []
  const registry = loadOfficerRegistry()
  const lc = subject.toLowerCase().trim()
  const out: Array<Record<string, unknown>> = []
  if (intent === "affiliations_to") {
    // Match by org name — filer_name (as recorded on the 990) or the
    // normalized vault_org_name the ingest attached.
    for (const r of registry) {
      const filer = (r.filer_name || "").toLowerCase()
      const vaultOrg = (r.vault_org_name || "").toLowerCase()
      if (filer === lc || vaultOrg === lc) {
        out.push({
          type: "affiliation",
          from: r.officer_name,
          to: r.vault_org_name || r.filer_name,
          role: (r.titles && r.titles[0]) || "officer",
          titles: r.titles,
          years: r.years,
          compensation: r.compensation_total || 0,
          source: "irs-990-officer-registry",
          ein: r.ein,
        })
      }
    }
  } else {
    // Match by officer name — registry stores uppercase normalized name.
    const needle = subject.toUpperCase().replace(/[.,]/g, "").replace(/\s+/g, " ").trim()
    for (const r of registry) {
      if (r.officer_name_normalized === needle || r.officer_name.toUpperCase() === needle) {
        out.push({
          type: "affiliation",
          from: r.officer_name,
          to: r.vault_org_name || r.filer_name,
          role: (r.titles && r.titles[0]) || "officer",
          titles: r.titles,
          years: r.years,
          compensation: r.compensation_total || 0,
          source: "irs-990-officer-registry",
          ein: r.ein,
        })
      }
    }
  }
  return out
}

/**
 * Given an entity name, return the names of *vehicles they control* — PACs,
 * foundations, DAFs, and donor networks. Combines a hand-curated map
 * (MANUAL_VEHICLE_MAP) for cases where the vehicle name doesn't carry the
 * person's name, plus a heuristic that matches vehicles literally
 * containing the person's full name (e.g. "America PAC - Elon Musk").
 *
 * Without this expansion, a Musk → Trump query misses the whole $147M
 * America PAC Trump-operation stack, and a "who funds Trump" query misses
 * the $55M flowing through MAGA Inc.
 *
 * Heuristic tightness: only match if the vehicle name is LONGER than the
 * person's name (so "Elon Musk" doesn't self-match, but "America PAC -
 * Elon Musk" does). Skip when the person name is ≤ 6 chars (too short to
 * avoid false positives like "Lee" matching every Lee-something PAC).
 */
function vehiclesFor(personName: string): string[] {
  if (!personName) return []
  const out = new Set<string>()
  // Hand map first — authoritative for cases the heuristic misses
  for (const v of MANUAL_VEHICLE_MAP[personName] || []) out.add(v)

  const ents = loadEntities()

  // Discover controlled vehicles via signals.controlled_by. The
  // politician-historical-coverage-backfill writes the politician's
  // name into signals.controlled_by on every campaign committee stub
  // it creates, so this picks up ALL of a politician's historical
  // campaign committees automatically (Bernie's House + Senate + 2020
  // Presidential, Rubio's Senate + 2016 Presidential, etc.).
  for (const e of ents) {
    if (e.name === personName) continue
    const cb = e.signals?.controlled_by
    if (Array.isArray(cb) && cb.includes(personName)) out.add(e.name)
  }

  // Heuristic name-contains match (Musk → America PAC — Elon Musk).
  // Kept as a secondary path; signals-based walk above is more
  // reliable once the backfill runs.
  if (personName.length > 6) {
    const needle = personName.toLowerCase()
    const controllerTypes = new Set(["donor", "pac", "nonprofit", "corporation", "network"])
    for (const e of ents) {
      if (e.name === personName) continue
      if (e.name.length <= personName.length) continue
      if (!controllerTypes.has(e.entity_type || "")) continue
      if (e.name.toLowerCase().includes(needle)) out.add(e.name)
    }
  }
  return [...out]
}

/**
 * Levenshtein distance, bounded cheap version. Returns Infinity if
 * beyond threshold so the caller can early-reject.
 */
function editDistance(a: string, b: string, max = 4): number {
  if (Math.abs(a.length - b.length) > max) return Infinity
  const m = a.length, n = b.length
  if (m === 0) return n
  if (n === 0) return m
  let prev = new Array(n + 1)
  let curr = new Array(n + 1)
  for (let j = 0; j <= n; j++) prev[j] = j
  for (let i = 1; i <= m; i++) {
    curr[0] = i
    let rowMin = curr[0]
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost)
      if (curr[j] < rowMin) rowMin = curr[j]
    }
    if (rowMin > max) return Infinity
    ;[prev, curr] = [curr, prev]
  }
  return prev[n]
}

interface ResolveResult {
  title: string
  candidates: string[]   // non-empty if match was fuzzy; caller can surface as "did you mean"
  exact: boolean
}

// Generate the acronym for an entity name. Takes the first letter of
// each capitalized token, skipping common joining words. "Marble Freedom
// Trust" → "MFT". "Judicial Crisis Network" → "JCN". "Democratic
// Congressional Campaign Committee" → "DCCC". Returns empty string if
// the name has fewer than 2 content tokens.
const ACRONYM_STOPWORDS = new Set([
  "the", "of", "and", "for", "a", "an", "in", "on", "to", "with",
  "at", "by", "from", "as", "into", "&", "-", "",
])
function nameAcronym(name: string): string {
  // Drop parens and punctuation, keep capitalized tokens only.
  const cleaned = name.replace(/\([^)]*\)/g, " ").replace(/[^A-Za-z\s]/g, " ")
  const tokens = cleaned.split(/\s+/).filter((t) => {
    if (!t) return false
    if (ACRONYM_STOPWORDS.has(t.toLowerCase())) return false
    // Content tokens usually start with an uppercase letter in proper
    // names. Single-letter words also count (e.g. "A" in "A16Z").
    return t.length > 0 && /^[A-Z]/.test(t)
  })
  if (tokens.length < 2) return ""
  return tokens.map((t) => t[0].toUpperCase()).join("")
}

// If an entity name is FEC-shape "LAST, FIRST" uppercase, AND there's
// a sibling entity with the title-cased "First Last" form, prefer the
// title-cased one. Edges created by politician-facing ingesters use
// "First Last", so returning the FEC-shape breaks downstream edge
// lookups. Was the Obama "who funds them" empty-state bug.
function preferTitleCasedSibling(match: EntityRec, ents: EntityRec[]): EntityRec {
  const commaParts = match.name.split(",")
  if (commaParts.length !== 2) return match
  const last = commaParts[0].trim()
  const first = commaParts[1].trim()
  const titleCase = (s: string) =>
    s.toLowerCase().replace(/(^|\s|-)(\w)/g, (_m, p, c) => p + c.toUpperCase())
  const target = `${titleCase(first)} ${titleCase(last)}`
  const sibling = ents.find((e) => e.name.toLowerCase() === target.toLowerCase())
  return sibling || match
}

function resolveTitle(fragment: string): ResolveResult {
  const ents = loadEntities()
  const lc = fragment.toLowerCase().trim()
  if (!lc) return { title: fragment, candidates: [], exact: false }

  // 1. exact (case-insensitive)
  const exact = ents.find((e) => e.name.toLowerCase() === lc)
  if (exact) return { title: preferTitleCasedSibling(exact, ents).name, candidates: [], exact: true }

  // 2. startsWith
  const starts = ents.find((e) => e.name.toLowerCase().startsWith(lc))
  if (starts) return { title: preferTitleCasedSibling(starts, ents).name, candidates: [], exact: true }

  // 3. contains
  const contains = ents.find((e) => e.name.toLowerCase().includes(lc))
  if (contains) return { title: preferTitleCasedSibling(contains, ents).name, candidates: [], exact: true }

  // 3b. Acronym match — "MFT" → "Marble Freedom Trust", "JCN" →
  // "Judicial Crisis Network". Query must be 2-6 uppercase-looking
  // characters to be treated as an acronym candidate.
  const uc = fragment.trim().toUpperCase()
  if (/^[A-Z]{2,6}$/.test(uc)) {
    const acronymHits = ents
      .map((e) => ({ name: e.name, acro: nameAcronym(e.name) }))
      .filter((r) => r.acro && r.acro === uc)
    if (acronymHits.length === 1) {
      return { title: acronymHits[0].name, candidates: [], exact: true }
    }
    if (acronymHits.length > 1) {
      // Multiple entities share the same acronym — return the first
      // with the rest as "did you mean" candidates.
      return { title: acronymHits[0].name, candidates: acronymHits.map((r) => r.name), exact: false }
    }
  }

  // 3c. Token-subset match — every token of the query appears in the
  // entity name (in any order). Catches "sixteen thirty" for "Sixteen
  // Thirty Fund" when the user drops the trailing noun, or "leo dark
  // money" for "Leonard Leo". Minimum 2 tokens in query to avoid
  // trivial matches like "fund".
  const queryTokens = lc.split(/\s+/).filter((t) => t.length > 1)
  if (queryTokens.length >= 2) {
    const subsetHits = ents
      .filter((e) => {
        const entTokens = new Set(e.name.toLowerCase().split(/\s+/))
        return queryTokens.every((t) => {
          // Token may be a substring of an entity token (handles
          // "freedom" matching "freedom's") or exact match.
          for (const et of entTokens) if (et.includes(t)) return true
          return false
        })
      })
      .slice(0, 5)
    if (subsetHits.length === 1) {
      return { title: subsetHits[0].name, candidates: [], exact: true }
    }
    if (subsetHits.length > 1) {
      // Prefer shortest name among matches — "sixteen thirty" should
      // resolve to "Sixteen Thirty Fund" rather than a composite page
      // that also contains those tokens.
      subsetHits.sort((a, b) => a.name.length - b.name.length)
      return { title: subsetHits[0].name, candidates: subsetHits.map((r) => r.name), exact: false }
    }
  }

  // 4. fuzzy — Levenshtein on normalized names
  const threshold = Math.max(1, Math.floor(lc.length / 5))
  const ranked = ents
    .map((e) => ({ name: e.name, dist: editDistance(lc, e.name.toLowerCase(), threshold + 2) }))
    .filter((r) => r.dist <= threshold + 1)
    .sort((a, b) => a.dist - b.dist)
    .slice(0, 5)

  if (ranked.length > 0) {
    return { title: ranked[0].name, candidates: ranked.map((r) => r.name), exact: false }
  }
  return { title: fragment, candidates: [], exact: false }
}

// Reverse lookup indexes: ticker, EIN, CIK, FEC committee id, FEC
// candidate id, UEI — so a user asking "$META" or "EIN 23-7327730"
// or "C00618389" or just "NVDA" resolves to the canonical vault
// entity regardless of how they typed it. Built lazily on first
// findEntity call, cached across requests within a process.
let _idIndex: {
  byTicker: Map<string, EntityRec>
  byEin: Map<string, EntityRec>
  byCik: Map<string, EntityRec>
  byFecCommittee: Map<string, EntityRec>
  byFecCandidate: Map<string, EntityRec>
  byUei: Map<string, EntityRec>
} | null = null

function buildIdIndex() {
  const byTicker = new Map<string, EntityRec>()
  const byEin = new Map<string, EntityRec>()
  const byCik = new Map<string, EntityRec>()
  const byFecCommittee = new Map<string, EntityRec>()
  const byFecCandidate = new Map<string, EntityRec>()
  const byUei = new Map<string, EntityRec>()
  const ents = loadEntities()
  for (const e of ents) {
    const s = (e.signals || {}) as Record<string, unknown>
    const ticker = s.ticker as string | undefined
    if (ticker) byTicker.set(String(ticker).toUpperCase(), e)
    const ein = s.ein as string | undefined
    if (ein) {
      const digits = String(ein).replace(/\D/g, "")
      if (digits) byEin.set(digits, e)
    }
    const cik = s.sec_cik as string | undefined
    if (cik) {
      // Accept both zero-padded and raw form.
      const padded = String(cik).padStart(10, "0")
      byCik.set(padded, e)
      byCik.set(String(parseInt(padded, 10)), e)
    }
    const uei = s.uei as string | undefined
    if (uei) byUei.set(String(uei).toUpperCase(), e)
    const cmteIds = (s.fec_committee_ids as string[] | undefined) || []
    const cmteIdScalar = s.fec_committee_id as string | undefined
    for (const id of [...cmteIds, cmteIdScalar].filter(Boolean) as string[]) {
      byFecCommittee.set(String(id).toUpperCase(), e)
    }
    const candIds = (s.fec_candidate_ids as string[] | undefined) || []
    const candScalar = s.fec_candidate_id as string | undefined
    for (const id of [...candIds, candScalar].filter(Boolean) as string[]) {
      byFecCandidate.set(String(id).toUpperCase(), e)
    }
  }
  _idIndex = { byTicker, byEin, byCik, byFecCommittee, byFecCandidate, byUei }
}

// Try to resolve an arbitrary user input string against federal
// identifier indexes. Handles common prefixes ($META, EIN 12-3456789,
// CIK 0001045810). Returns null if the string doesn't look like any
// known identifier.
function resolveByFederalId(input: string): EntityRec | null {
  if (!_idIndex) buildIdIndex()
  const idx = _idIndex!
  const raw = input.trim()
  if (!raw) return null

  // Ticker: $SYM or 1-5 uppercase letters, possibly trailing.
  const tickerMatch = raw.match(/^\$?([A-Za-z]{1,5})$/)
  if (tickerMatch && idx.byTicker.has(tickerMatch[1].toUpperCase())) {
    return idx.byTicker.get(tickerMatch[1].toUpperCase())!
  }

  // FEC committee id: C + 8 digits.
  const cmteMatch = raw.match(/\b(C\d{8})\b/i)
  if (cmteMatch && idx.byFecCommittee.has(cmteMatch[1].toUpperCase())) {
    return idx.byFecCommittee.get(cmteMatch[1].toUpperCase())!
  }

  // FEC candidate id: {S|H|P}{digit}{2 letters}{5 digits} — e.g. S8WA00194, H2WA01054, P00009423.
  const candMatch = raw.match(/\b([SHP]\d[A-Z]{2}\d{5}|P\d{8})\b/i)
  if (candMatch && idx.byFecCandidate.has(candMatch[1].toUpperCase())) {
    return idx.byFecCandidate.get(candMatch[1].toUpperCase())!
  }

  // EIN: 9 digits, optionally formatted XX-XXXXXXX. Accept "EIN 12-3456789".
  const einMatch = raw.match(/\b(?:EIN[:\s]+)?(\d{2}-?\d{7})\b/i)
  if (einMatch) {
    const digits = einMatch[1].replace(/\D/g, "")
    if (digits.length === 9 && idx.byEin.has(digits)) {
      return idx.byEin.get(digits)!
    }
  }

  // CIK: up to 10 digits, optionally prefixed "CIK". Skip if it's
  // actually an EIN (9 digits) — EIN already ran above.
  const cikMatch = raw.match(/\bCIK[:\s]+0*(\d{1,10})\b/i) || raw.match(/^0*(\d{10})$/)
  if (cikMatch) {
    const padded = cikMatch[1].padStart(10, "0")
    if (idx.byCik.has(padded)) return idx.byCik.get(padded)!
  }

  // UEI: 12 alphanumeric characters, no vowels adjacent to numbers in
  // positions SAM.gov specifies — for practical match, any 12-char
  // alpha-num uppercase token.
  const ueiMatch = raw.match(/\b([A-Z0-9]{12})\b/)
  if (ueiMatch && idx.byUei.has(ueiMatch[1])) {
    return idx.byUei.get(ueiMatch[1])!
  }

  return null
}

function findEntity(title: string): EntityRec | null {
  const ents = loadEntities()
  // 1. Direct name match (existing behavior — most common path).
  const byName = ents.find((e) => e.name === title)
  if (byName) return byName
  // 2. FEC-shape normalization: entities.jsonl sometimes carries names
  //    as "OBAMA, BARACK" (LAST, FIRST uppercase) from FEC ingesters,
  //    while user queries arrive as "Barack Obama". Try each normalized
  //    candidate. Same helper used by findBioguide.
  for (const cand of normalizeToTitleCase(title)) {
    const hit = ents.find((e) => e.name === cand || e.name.toLowerCase() === cand.toLowerCase())
    if (hit) return hit
  }
  // 3. Federal identifier fallback: ticker, EIN, CIK, FEC id, UEI.
  return resolveByFederalId(title)
}

// ─── Entity context: 1-sentence explainer + first paragraph from profile ─

const _blurbCache = new Map<string, string>()
function loadBlurb(profilePath: string | undefined): string {
  if (!profilePath) return ""
  if (_blurbCache.has(profilePath)) return _blurbCache.get(profilePath)!
  try {
    const abs = path.join(REPO_ROOT, profilePath)
    if (!fs.existsSync(abs)) return ""
    const text = fs.readFileSync(abs, "utf-8")
    // Strip frontmatter + auto-blocks, find first real "Who They Are"/"Who
    // He Is"/"Who She Is" paragraph, else first real paragraph under any
    // H2.
    const body = text.replace(/^---\n[\s\S]*?\n---\n/, "").replace(/<!-- auto:[^\n]*start[\s\S]*?<!-- auto:[^\n]*end -->/g, "")
    const whoMatch = body.match(/##\s+(?:Who They Are|Who (?:He|She) Is|About)[^\n]*\n+([^\n#][\s\S]*?)(?=\n##|\n\n\n|$)/i)
    let para = whoMatch ? whoMatch[1] : ""
    if (!para) {
      const anyH2 = body.match(/##\s+[^\n]+\n+([^\n#][\s\S]*?)(?=\n##|\n\n\n|$)/)
      para = anyH2 ? anyH2[1] : ""
    }
    para = para
      .replace(/<!--[\s\S]*?-->/g, "")  // kill HTML comments
      .replace(/\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g, "$1")  // wikilinks -> plain
      .replace(/\*\*([^*]+)\*\*/g, "$1")
      .replace(/\s+/g, " ")
      .trim()
    // Trim to first 2 sentences, cap length
    const sentences = para.split(/(?<=[.!?])\s+/).slice(0, 2).join(" ")
    const trimmed = sentences.length > 400 ? sentences.slice(0, 397) + "..." : sentences
    _blurbCache.set(profilePath, trimmed)
    return trimmed
  } catch {
    return ""
  }
}

// Read a tiny set of frontmatter fields off the profile file directly.
// Cheaper than loading the whole YAML; just regex.
const _fmCache = new Map<string, { nonprofit_status?: string; committee_id?: string; entity_type_fm?: string }>()
function loadFmSignals(profilePath: string | undefined): { nonprofit_status?: string; committee_id?: string; entity_type_fm?: string } {
  if (!profilePath) return {}
  if (_fmCache.has(profilePath)) return _fmCache.get(profilePath)!
  try {
    const abs = path.join(REPO_ROOT, profilePath)
    if (!fs.existsSync(abs)) return {}
    const text = fs.readFileSync(abs, "utf-8")
    const m = text.match(/^---\n([\s\S]*?)\n---/)
    if (!m) { _fmCache.set(profilePath, {}); return {} }
    const fm = m[1]
    const ns = fm.match(/\bnonprofit-status:\s*["']?([^"'\n]+)["']?/)?.[1]?.trim()
    const ci = fm.match(/\b(?:committee-id|fec-committee-id|fec-cmte-id):\s*["']?([A-Z0-9]+)["']?/)?.[1]
    const et = fm.match(/\bentity-type:\s*["']?([^"'\n]+)["']?/)?.[1]?.trim()
    const out = { nonprofit_status: ns, committee_id: ci, entity_type_fm: et }
    _fmCache.set(profilePath, out)
    return out
  } catch {
    return {}
  }
}

// Build a clickable-source citation for a single edge. Returns the
// human-readable filing label plus a URL the user can open.
function citeEdge(e: Record<string, unknown>): { label: string; url?: string } {
  const src = (e.source as string) || ""
  const cycle = (e.cycle as string) || ""
  if (src === "irs-990-bulk") {
    const from = (e.from as string) || ""
    const fromEnt = findEntity(from)
    const ein = (fromEnt?.signals as any)?.ein
    if (ein) {
      return {
        label: `IRS 990 Schedule I, ${from} (EIN ${ein})${cycle ? ", tax year " + cycle : ""}`,
        url: `https://projects.propublica.org/nonprofits/organizations/${ein}`,
      }
    }
    return { label: `IRS 990 Schedule I${cycle ? ", tax year " + cycle : ""}` }
  }
  if (src === "fec-bulk" || src === "fec-api" || src === "fec-individual-bulk") {
    return {
      label: `FEC bulk filings${cycle ? ", " + cycle + " cycle" : ""}`,
      url: `https://www.fec.gov/data/filings/`,
    }
  }
  if (src === "lda-api") return { label: `Senate LDA lobbying disclosure${cycle ? " " + cycle : ""}`, url: `https://lda.senate.gov/` }
  if (src === "usaspending" || src === "usaspending-bulk" || src === "usaspending-grants-bulk") {
    return { label: `USAspending.gov${cycle ? " " + cycle : ""}`, url: `https://usaspending.gov/` }
  }
  if (src === "frontmatter-migration" || src === "body-migration-april-9") {
    return { label: "Vault-side editorial annotation (not a filing)" }
  }
  return { label: src || "unknown source" }
}

// Generate a plain-language interpretation of the findings. Looks at
// the shape of the result (intent + what entities are involved) and
// emits a 1-2 sentence "what this means" card. No jargon.
function interpret(res: AskResult): string | undefined {
  const ctx = res.context || []
  const hasDAF = ctx.some((c) => c.gloss.includes("donor-advised fund"))
  const hasC4 = ctx.some((c) => c.gloss.includes("501(c)(4)"))
  const hasC3 = ctx.some((c) => c.gloss.includes("501(c)(3) public charity"))
  const hasSuperPAC = ctx.some((c) => c.gloss.includes("Super PAC"))

  if (res.intent === "money_chain" && res.total > 0) {
    if (hasDAF) {
      return (
        `This is the textbook dark-money laundering pattern. Money leaves the first org, passes through a donor-advised fund (DAF), and lands at the destination. The DAF step is the point — commercial DAFs are legally allowed to conceal who originally gave the money, so once the flow passes through one, the paper trail to the true donor is broken. Any of these ${res.total} paths would give the final recipient deniability about where the cash started.`
      )
    }
    if (hasC4 && hasSuperPAC) {
      return (
        `Classic c4-to-super-PAC handoff. 501(c)(4) "social welfare" groups can accept unlimited anonymous donations but aren't supposed to be "primarily political." They transfer money to a super PAC sibling, which is allowed to spend on elections but has to disclose donors — except the disclosed donor is the c4, not the actual person who gave. This is how "dark money" becomes "disclosed" spending without the original donor ever being named.`
      )
    }
    return `These ${res.total} paths show indirect money flows. None are single-hop direct gifts — each goes through at least one intermediary organization. Intermediaries are often where the public record of who gave what ends.`
  }

  if (res.intent === "edge_between") {
    const hasDirectDollars = (res.rows || []).some((r: any) => r.type === "monetary" && r.amount)
    if (!hasDirectDollars && res.total > 0) {
      return `These two organizations are linked in the vault (related wikilinks and/or board overlap), but no direct dollar flow between them is in the canonical store. If you want to trace money between them, try the "money chain" version of this question — it walks up to 3 hops through intermediaries.`
    }
  }

  if (res.intent === "donors_to") {
    const summaryParts = (res.summary || "").match(/(\d+) support edges, (\d+) opposition edges/)
    if (summaryParts && parseInt(summaryParts[2]) > 0) {
      return `The "donors" shown here are groups whose money landed with the subject — direct contributions, party committee support, and super-PAC ads running in their favor. Separately, ${summaryParts[2]} super PAC(s) spent money running ads AGAINST the subject, which shows up in the meta line. Opposition edges are excluded from the total above so they don't inflate the "who funds them" answer.`
    }
  }

  if (res.intent === "summary" && hasC4) {
    const personMode = (res.context || []).some((c) => c.gloss.includes("entity") || !c.gloss.includes("501") && !c.gloss.includes("DAF") && !c.gloss.includes("Super"))
    if (personMode && res.total > 0) {
      return `Most of this person's tracked financial footprint flows through the organizations they chair or sit on the board of, not under their personal name. Federal law doesn't require individuals to disclose gifts they direct through 501(c)(4) vehicles, which is why the personal name lookup shows zero direct edges. The board-seat rows above tell you where the real money is.`
    }
  }

  return undefined
}

// Cheap lookup: does this entity name resolve to a politician in the
// vault? Used to gate legislator-only follow-ups (voting record,
// bills sponsored, committees served) — otherwise a DAF or super PAC
// gets nonsensical "voting record" suggestions.
function entityTypeFor(name: string | undefined): string | null {
  if (!name) return null
  const ents = loadEntities()
  const hit = ents.find((e) => e.name === name) || ents.find((e) => e.name.toLowerCase() === name.toLowerCase())
  return hit ? (hit.entity_type as string) || null : null
}

// Generate follow-up question suggestions. Keeps users exploring.
function suggestFollowUps(res: AskResult): string[] {
  const out: string[] = []
  const a = res.resolved_title
  const b = res.resolved_title_2
  const aType = entityTypeFor(a)
  const bType = entityTypeFor(b)
  const aIsPolitician = aType === "politician"
  const bIsPolitician = bType === "politician"
  const aIsOrg = aType && aType !== "politician"

  if (res.intent === "edge_between" && a && b) {
    out.push(`money chain from ${a} to ${b}`)
    out.push(`tell me about ${a}`)
    out.push(`tell me about ${b}`)
    out.push(`what else has ${a} funded`)
  } else if (res.intent === "money_chain" && a && b) {
    out.push(`who funds ${a}`)
    out.push(`where does ${a}'s money go`)
    out.push(`tell me about ${b}`)
  } else if (res.intent === "donors_to" && a) {
    out.push(`where does ${a}'s money go`)
    out.push(`tell me about ${a}`)
    // Voting record only makes sense for politicians — suppress for
    // DAFs, super PACs, corporations, etc. (the Fidelity Charitable
    // "voting record" suggestion bug).
    if (aIsPolitician) out.push(`${a} voting record`)
    // "What boards is X on" maps to affiliations; applies to both
    // individuals (politicians or donors) but not to organizations.
    // Organizations have board members, not board seats.
    if (aIsPolitician) out.push(`what boards is ${a} on`)
    else if (aIsOrg) out.push(`who's on ${a}'s board`)
  } else if (res.intent === "recipients_from" && a) {
    out.push(`who funds ${a}`)
    out.push(`tell me about ${a}`)
    if (aIsPolitician) out.push(`what boards is ${a} on`)
    else if (aIsOrg) out.push(`who's on ${a}'s board`)
  } else if (res.intent === "summary" && a) {
    out.push(`who funds ${a}`)
    out.push(`where does ${a}'s money go`)
    if (aIsPolitician) {
      out.push(`${a} voting record`)
      out.push(`what boards is ${a} on`)
    } else if (aIsOrg) {
      out.push(`who's on ${a}'s board`)
    }
    // Also suggest a compare if the entity looks like a dark-money
    // vehicle — its structural mirror is usually the most pedagogical
    // next query.
    const COMPARE_PAIRS: Record<string, string> = {
      "marble freedom trust": "Sixteen Thirty Fund",
      "sixteen thirty fund": "Marble Freedom Trust",
      "the 85 fund": "New Venture Fund",
      "new venture fund": "The 85 Fund",
      "judicial crisis network": "Demand Justice",
      "demand justice": "Judicial Crisis Network",
      "americans for prosperity": "Working Families Party",
      "working families party": "Americans for Prosperity",
    }
    const pair = COMPARE_PAIRS[a.toLowerCase()]
    if (pair) out.push(`compare ${a} vs ${pair}`)
  } else if (res.intent === "compare" && a && b) {
    out.push(`tell me about ${a}`)
    out.push(`tell me about ${b}`)
    out.push(`money chain from ${a} to ${b}`)
  } else if (res.intent === "affiliations_from" && a) {
    out.push(`tell me about ${a}`)
    if (aIsPolitician) out.push(`${a} voting record`)
  } else if (res.intent === "leaderboard") {
    out.push("top donors")
    out.push("top super pacs")
    out.push("top politicians")
    out.push("top dafs")
  }

  // dedupe, remove same question
  const seen = new Set<string>([res.question.toLowerCase()])
  return out.filter((q) => {
    const k = q.toLowerCase()
    if (seen.has(k)) return false
    seen.add(k)
    return true
  }).slice(0, 5)
}

// Build a cite-ready paragraph for journalists to paste into stories.
function buildCitation(res: AskResult): string | undefined {
  if (res.intent === "money_chain" && res.rows.length > 0) {
    const top = res.rows[0] as any
    if (!top?.path || !top?.edges) return undefined
    const steps: string[] = []
    for (let i = 0; i < top.edges.length; i++) {
      const from = top.path[i]
      const to = top.path[i + 1]
      const e = top.edges[i]
      const amt = fmtUsd(e.amount)
      const cy = e.cycle ? ` (tax year ${e.cycle})` : ""
      steps.push(`${from} transferred ${amt} to ${to}${cy}`)
    }
    return `According to IRS 990 filings, ${steps.join("; ")}. Source: ${top.edges.map((e: any) => citeEdge(e).label).filter((v: string, i: number, a: string[]) => a.indexOf(v) === i).join("; ")}.`
  }
  if (res.intent === "donors_to" && res.rows.length > 0) {
    const top5 = (res.rows as any[]).filter((e) => e.amount).slice(0, 5)
    if (top5.length === 0) return undefined
    const parts = top5.map((e) => `${e.from} (${fmtUsd(e.amount)}${e.cycle ? ", " + e.cycle : ""}) per ${citeEdge(e).label}`)
    return `Top tracked donors to ${res.resolved_title}: ${parts.join("; ")}.`
  }
  return undefined
}

function explainEntity(name: string): EntityContext {
  const ent = findEntity(name)
  if (!ent) return { name, gloss: "(not in vault)" }
  const kind = ent.entity_type || "entity"
  const sector = (ent.signals as any)?.sector as string | undefined
  const ein = (ent.signals as any)?.ein as string | undefined
  const fm = loadFmSignals(ent.profile_path)
  const classTags: string[] = []
  if (ent.capital_type) classTags.push(ent.capital_type)
  if (ent.ideological_function?.length) classTags.push(...ent.ideological_function)

  // Structural type: nonprofit-status frontmatter is the authoritative
  // signal (it's per-entity truth). Fall back to name heuristics for
  // orgs without nonprofit-status (FEC-only committees, etc.), then to
  // the vault's folder-derived sector.
  const lower = name.toLowerCase()
  let structural = ""
  const ns = (fm.nonprofit_status || "").toLowerCase()
  const hasDAFMarker = lower.includes("charitable fund") || lower.includes("philanthropy fund") ||
    lower.includes("charitable gift fund") || lower.includes("donor advised") || lower.includes("endowment program") ||
    (fm.entity_type_fm || "").toLowerCase().includes("donor-advised")

  if (hasDAFMarker) {
    structural = " Commercial donor-advised fund (DAF) — donor identities are obscured from the public; money enters from one donor, flows out under the DAF's name."
  } else if (ns.includes("501(c)(4)") || ns.includes("501c4")) {
    structural = " 501(c)(4) social-welfare org — can accept unlimited donations, is not required to publicly disclose donors. Classic dark-money structure."
  } else if (ns.includes("501(c)(3)") || ns.includes("501c3")) {
    structural = " 501(c)(3) public charity — donors are not publicly disclosed (except via grant disclosures by grant-makers on Schedule I)."
  } else if (ns.includes("527") || /super pac/i.test(ns)) {
    structural = " Super PAC / 527 — accepts unlimited donations but must disclose donors to the FEC."
  } else if (fm.committee_id) {
    structural = " FEC-registered political committee — donors are disclosed via FEC filings."
  } else if (lower.includes("foundation") && kind === "donor") {
    structural = " Tax-exempt foundation."
  } else if (sector && /dark money/i.test(sector)) {
    structural = " 501(c)(4) dark-money network entity — donor identities are not required to be disclosed."
  } else if (sector && /super pac/i.test(sector)) {
    structural = " Super PAC / independent-expenditure committee — accepts unlimited donations, discloses donors to FEC."
  }

  // Class tags are internal categorization (dark-money-networked,
  // judicial-capture, etc.). They're useful signal but readable to
  // analysts only. Hide from the public-facing gloss — the structural
  // sentence above already conveys "this is a dark-money vehicle" in
  // prose. Keep tags available on the entity object for programmatic
  // consumers.
  const sectorForGloss = ns
    ? ns // prefer nonprofit-status in the gloss header when we have it
    : sector
  // Append a data caveat to the gloss when the entity shares its EIN
  // with a larger parent (e.g. Hoover Institution uses Stanford's EIN
  // 941156365, so any 990 figures we ingest reflect Stanford-as-a-whole
  // rather than Hoover-only). Readers seeing e.g. "$1.24B inbound"
  // deserve to know it's the parent's consolidated number.
  const einCaveat = (ent.signals as any)?.ein_data_caveat as string | undefined
  const gloss = `${kind}${sectorForGloss ? " (" + sectorForGloss + ")" : ""}${ein ? ", EIN " + ein : ""}.${structural}${einCaveat ? " ⚠ " + einCaveat : ""}`.trim()
  const blurb = loadBlurb(ent.profile_path)
  return { name, gloss, blurb: blurb || undefined, profile_path: ent.profile_path || undefined }
}

// ─── Concept explainer ───────────────────────────────────────────────
// Normalize a concept phrase ("the Panama Papers" / "Panama papers" /
// "panama paper") to a canonical key used in KNOWN_CONCEPTS.
function conceptKey(s: string): string {
  return s.toLowerCase()
    .replace(/^(the|a|an)\s+/, "")
    .replace(/papers?$/, "papers")
    .replace(/s$/, (m, _o, whole) => {
      // plural → singular (loose), but keep canonical plurals that CONCEPTS
      // is keyed on (panama/paradise/pandora papers). Also protect "ss".
      if (whole.endsWith("ss") || whole.endsWith("papers")) return m
      return ""
    })
    .trim()
}

// Concept dictionary. Each value = { explanation, in_our_data, examples }.
// The `in_our_data` note lets us wire the user into the right query to see
// actual records: e.g. after reading "what are the Panama Papers", they
// can click "offshore_entities from Panama Papers" to see the 74 linked
// vault entities.
const CONCEPTS: Record<string, { explanation: string; in_our_data?: string; followUps?: string[] }> = {
  "panama papers": {
    explanation: "The **Panama Papers** are 11.5 million leaked documents from Panamanian law firm Mossack Fonseca, published April 2016 by the International Consortium of Investigative Journalists (ICIJ). They exposed how wealthy individuals and politicians worldwide used offshore shell companies in tax havens (Panama, BVI, Cayman, etc.) to hide assets and, in some cases, evade taxes or launder money.",
    in_our_data: "We've cross-referenced the ICIJ Panama Papers entity list against our vault. Several politically-active US entities appear in the leak including vault corporations and donor networks.",
    followUps: ["offshore holdings of Apple", "offshore holdings of Blackstone", "panama papers Oracle"],
  },
  "paradise papers": {
    explanation: "The **Paradise Papers** are 13.4 million leaked documents from Bermuda law firm Appleby + corporate registries in 19 tax jurisdictions, published November 2017 by ICIJ. They revealed the offshore dealings of major corporations (Apple, Nike, etc.), political figures, and wealthy individuals.",
    in_our_data: "Cross-referenced against vault. Paradise Papers entities appear alongside Panama Papers in our offshore_entities dataset.",
    followUps: ["offshore holdings of Apple", "offshore holdings of Oracle"],
  },
  "pandora papers": {
    explanation: "The **Pandora Papers** are 11.9 million leaked documents from 14 offshore services firms, published October 2021 by ICIJ. The biggest offshore leak ever, exposing hidden wealth of 330+ politicians + world leaders.",
    in_our_data: "ICIJ merged Pandora Papers into their combined Offshore Leaks Database; we've ingested that combined set.",
    followUps: ["offshore_entities from pandora papers"],
  },
  "offshore leak": {
    explanation: "**Offshore Leaks** was the first ICIJ offshore project (2013), 2.5M leaked documents exposing secret offshore dealings. Now part of ICIJ's combined Offshore Leaks Database alongside Panama/Paradise/Pandora/Bahamas.",
    in_our_data: "Ingested.",
    followUps: ["offshore_entities"],
  },
  "dark money": {
    explanation: "**Dark money** = political spending where the ORIGINAL donor is not disclosed. In US campaign finance, this happens primarily via 501(c)(4) social welfare nonprofits and certain LLCs, which aren't legally required to reveal their donors. Classic dark-money vehicles: Marble Freedom Trust, Sixteen Thirty Fund, Crossroads GPS.",
    in_our_data: "We tag vault entities with `sector: Dark Money` when they're classic vehicles. ~40+ vault entities carry this tag.",
    followUps: ["tell me about Marble Freedom Trust", "top dafs", "tell me about Sixteen Thirty Fund"],
  },
  "527": {
    explanation: "**527 organizations** are tax-exempt groups named after IRS Section 527, organized primarily to influence elections. Must report donors AND expenditures to the IRS, unlike 501(c)(4) dark-money nonprofits. PACs and super PACs are legally 527s too.",
    in_our_data: "We've ingested the IRS POFD (Political Organization Filing & Disclosure) bulk; every 527 since 2000 with their filings.",
    followUps: ["top super pacs"],
  },
  "501 c 4": {
    explanation: "**501(c)(4) social welfare organization** — an IRS tax classification that can engage in political activity (as long as it's not their 'primary purpose') AND does NOT have to disclose donors. This is the legal structure most dark-money groups use.",
    in_our_data: "Many dark-money vehicles in the vault carry this classification in their EIN frontmatter (Marble Freedom Trust, Americans for Prosperity, etc.).",
    followUps: ["top dafs", "tell me about Americans for Prosperity"],
  },
  "501 c 3": {
    explanation: "**501(c)(3) public charity** — an IRS tax classification for charitable/educational orgs. These CANNOT do most political campaign activity (or they lose the tax exemption), though they can engage in policy research + advocacy. Donations are tax-deductible.",
    followUps: [],
  },
  "super pac": {
    explanation: "**Super PAC** (technically 'independent expenditure-only committee') — a 527 that can raise UNLIMITED amounts from individuals, corporations, and unions for independent political spending, but CANNOT coordinate with candidates or donate directly to them. Created by the Citizens United decision (2010).",
    in_our_data: "~100+ super PACs profiled in the vault. Every one has FEC committee ID + filings.",
    followUps: ["top super pacs", "top donors to kamala harris"],
  },
  "pac": {
    explanation: "**PAC (political action committee)** — any group registered with the FEC that raises money to donate to federal candidates. Subject to contribution limits (unlike super PACs). Often organized by corporations, unions, or trade associations.",
    followUps: ["top pacs"],
  },
  "ein": {
    explanation: "**EIN (Employer Identification Number)** — the IRS's 9-digit identifier for any US tax-exempt organization, nonprofit, business, or political org. Like a Social Security Number for organizations. We use EINs as the primary key when cross-referencing IRS records against our vault entities.",
    followUps: [],
  },
  "bioguide": {
    explanation: "**bioguide-id** — a unique identifier for every person who has served in the US Congress since 1789, assigned by the Biographical Directory of the US Congress. Used throughout our vault to tie votes, sponsorships, and profile pages to a single legislator.",
    followUps: [],
  },
  "cycle": {
    explanation: "**Election cycle** — the two-year period US federal elections operate on. Named by the year of the general election (so 'the 2024 cycle' = Jan 2023 through Dec 2024). FEC filings are organized by cycle. The current cycle is 2026.",
    followUps: [],
  },
  "independent expenditure": {
    explanation: "**Independent expenditure (IE)** — political spending that expressly advocates for or against a candidate but is NOT coordinated with the candidate's campaign. Super PACs do IEs. IEs have no contribution limits. Our data tags these with role=ie-support or role=ie-oppose.",
    followUps: [],
  },
  "ie": { explanation: "See 'independent expenditure'.", followUps: ["what is an independent expenditure"] },
  "donor advised fund": {
    explanation: "**Donor-advised fund (DAF)** — a charitable giving vehicle where the donor receives an immediate tax deduction for contributing, but the money can sit in the DAF indefinitely before being granted out. Because the DAF SPONSOR is the listed donor on the grant (not the original DAF contributor), DAFs are a massive dark-money channel.",
    in_our_data: "Fidelity Charitable, Schwab Charitable, Vanguard Charitable, and the National Christian Foundation are the largest DAFs; all profiled in the vault.",
    followUps: ["top dafs", "where does fidelity charitable's money go"],
  },
  "daf": { explanation: "See 'donor advised fund'.", followUps: ["what is a donor advised fund"] },
  "uei": {
    explanation: "**UEI (Unique Entity Identifier)** — 12-character alphanumeric ID assigned by SAM.gov to every entity that receives federal contracts or grants. Replaced the DUNS number in 2022.",
    followUps: [],
  },
  "cik": {
    explanation: "**CIK (Central Index Key)** — SEC's 10-digit identifier for any public company or individual who has filed with the SEC. We use CIKs to cross-reference vault corporations against SEC EDGAR data.",
    followUps: [],
  },
  "fec": {
    explanation: "**FEC (Federal Election Commission)** — independent agency that administers and enforces US federal campaign finance law. Collects + publishes every federal political contribution and expenditure. The backbone of the donor map.",
    followUps: [],
  },
  "form 990": {
    explanation: "**IRS Form 990** — annual tax return every tax-exempt nonprofit (501(c)(3), (4), etc.) must file. Includes financial data, officer compensation, major donations out (Schedule I grants), and officer names (Schedule B). A major journalism source for nonprofit money flows.",
    in_our_data: "We've ingested the IRS 990 XML bulk archive for every vault nonprofit's filings — ~1,441 filing records.",
    followUps: [],
  },
  "form 8871": {
    explanation: "**IRS Form 8871** — the initial registration form every 527 political organization files with the IRS. Contains the org's EIN, purpose, officers, and directors. Our POFD ingest uses these for EIN ↔ vault-entity matching.",
    followUps: [],
  },
  "form 8872": {
    explanation: "**IRS Form 8872** — the periodic financial disclosure form 527 political organizations must file, listing contributors (Schedule A) and expenditures (Schedule B). The 527 equivalent of FEC filings.",
    followUps: [],
  },
  "citizens united": {
    explanation: "**Citizens United v. FEC (2010)** — Supreme Court decision that ruled corporations + unions have 1st Amendment rights to make unlimited independent political expenditures. Gave birth to super PACs and the modern dark-money ecosystem.",
    followUps: [],
  },
  "stock act": {
    explanation: "**STOCK Act** — 2012 law requiring Congress members + senior execs to disclose personal stock trades within 45 days. We scrape STOCK Act Periodic Transaction Reports (PTRs) daily to track congressional trading.",
    in_our_data: "Daily 6am scrape of Senate EFDS + House Clerk PTR filings.",
    followUps: [],
  },
  "ptr": { explanation: "See 'STOCK Act'. PTR = Periodic Transaction Report.", followUps: [] },
  "roll call": {
    explanation: "**Roll call vote** — a vote in which each legislator's position (Yea/Nay/Present/Not Voting) is individually recorded. Contrast with voice vote (no individual record). Every roll call has a unique ID like 's325-118.2' (Senate, roll #325, 118th Congress, 2nd session).",
    followUps: ["pelosi voting record", "bernie sanders voting record"],
  },
}

const KNOWN_CONCEPTS = new Set(Object.keys(CONCEPTS))

// ─── Bioguide lookup for voting records ──────────────────────────────

// Entities store sometimes holds FEC-shaped names like "OBAMA, BARACK"
// (LAST, FIRST). Profile frontmatter uses "Barack Obama". Generate the
// title-cased "First Last" form so findBioguide can match both shapes.
function normalizeToTitleCase(name: string): string[] {
  const variants = new Set<string>([name])
  const commaParts = name.split(",")
  if (commaParts.length === 2) {
    const last = commaParts[0].trim()
    const first = commaParts[1].trim()
    const titleCase = (s: string) =>
      s.toLowerCase().replace(/(^|\s|-)(\w)/g, (_m, p, c) => p + c.toUpperCase())
    variants.add(`${titleCase(first)} ${titleCase(last)}`)
  }
  return Array.from(variants)
}

// Returns the matched profile's {title, bioguide} if any profile in
// content/Politicians matches the queried name. profileTitle is set
// whenever a profile with a matching title exists, even if that profile
// has no bioguide-id — the caller can distinguish "not in Congress"
// (profile exists, no bioguide) from "no profile at all" (null title).
function findPoliticianProfile(title: string): { profileTitle: string | null; bioguide: string | null } {
  const root = path.join(REPO_ROOT, "content", "Politicians")
  const candidates = normalizeToTitleCase(title)
  const stack = [root]
  let matchedTitle: string | null = null
  while (stack.length) {
    const dir = stack.pop() as string
    let entries
    try { entries = fs.readdirSync(dir, { withFileTypes: true }) } catch { continue }
    for (const e of entries) {
      if (e.name.startsWith(".")) continue
      const full = path.join(dir, e.name)
      if (e.isDirectory()) stack.push(full)
      else if (e.name.endsWith(".md")) {
        let text
        try { text = fs.readFileSync(full, "utf-8") } catch { continue }
        const m = text.match(/^---\n([\s\S]*?)\n---/)
        if (!m) continue
        const tm = m[1].match(/\btitle:\s*['"]?([^'"\n]+?)['"]?\s*\n/)
        if (!tm) continue
        const pt = tm[1].trim()
        const hit = candidates.some((c) => pt === c || pt.replace(" Master Profile", "") === c)
        if (!hit) continue
        const bm = m[1].match(/\bbioguide-id:\s*['"]?([A-Z0-9]+)['"]?/)
        return { profileTitle: pt, bioguide: bm ? bm[1] : null }
      }
    }
  }
  return { profileTitle: matchedTitle, bioguide: null }
}

function findBioguide(title: string): string | null {
  return findPoliticianProfile(title).bioguide
}

// Cache legislator-registry lookups to describe a bioguide's tenure.
// Used by the voting_record handler when positions.length === 0 to
// explain "our vote coverage is 115th+; this legislator served earlier".
let _registryByBio: Map<string, { name: string; first?: string; last?: string; end?: string; start?: string; chamber?: string }> | null = null
function registryFor(bioguide: string) {
  if (!_registryByBio) {
    _registryByBio = new Map()
    const p = path.join(REPO_ROOT, "data", "legislator-registry.jsonl")
    if (fs.existsSync(p)) {
      for (const line of fs.readFileSync(p, "utf-8").split("\n")) {
        if (!line.trim()) continue
        try {
          const r = JSON.parse(line)
          _registryByBio.set(r.bioguide, {
            name: r.name_official || `${r.name_first} ${r.name_last}`,
            first: r.name_first, last: r.name_last,
            end: r.current_term?.end, start: r.current_term?.start,
            chamber: r.current_term?.chamber,
          })
        } catch {}
      }
    }
  }
  return _registryByBio.get(bioguide) || null
}

// ─── Voting record ────────────────────────────────────────────────────

function showVotingRecord(bioguide: string, title: string, question: string): AskResult {
  const votesPath = path.join(REPO_ROOT, "data", "votes.jsonl")
  const mergedPositions = path.join(REPO_ROOT, "data", "legislator-positions.jsonl")
  const splitDir = path.join(REPO_ROOT, "data", "legislator-positions")
  // Prefer merged file if present (local dev / scraper runtime). Fall
  // back to the split directory (committed state, files split by
  // congress to stay under GitHub's 100MB per-file limit).
  const positionSources: string[] = []
  if (fs.existsSync(mergedPositions) && fs.statSync(mergedPositions).size > 0) {
    positionSources.push(mergedPositions)
  } else if (fs.existsSync(splitDir)) {
    for (const f of fs.readdirSync(splitDir).filter((n) => n.endsWith(".jsonl")).sort()) {
      positionSources.push(path.join(splitDir, f))
    }
  }
  if (positionSources.length === 0) {
    return {
      question, intent: "voting_record", resolved_title: title,
      total: 0, rows: [],
      note: `No voting-record data found. Expected either data/legislator-positions.jsonl or data/legislator-positions/{115..119}.jsonl under the repo root. Run ingest-congress-votes.cjs / scrape-missing-votes.cjs to populate.`
    } as AskResult
  }
  const voteMeta = new Map<string, { chamber: string; congress: number; session: number; date?: string; bill?: { type: string; number: string } }>()
  for (const line of fs.readFileSync(votesPath, "utf-8").split("\n")) {
    if (!line.trim()) continue
    try { const v = JSON.parse(line); voteMeta.set(v.vote_id, v) } catch {}
  }
  const positions: Array<{ vote_id: string; position: string; party?: string }> = []
  for (const src of positionSources) {
    for (const line of fs.readFileSync(src, "utf-8").split("\n")) {
      if (!line.trim()) continue
      try { const p = JSON.parse(line); if (p.bioguide === bioguide) positions.push(p) } catch {}
    }
  }

  // party loyalty: compare this member's Y/N against their party's majority
  const byVote = new Map<string, { R?: { Y: number; N: number }; D?: { Y: number; N: number }; I?: { Y: number; N: number } }>()
  for (const src of positionSources) {
    for (const line of fs.readFileSync(src, "utf-8").split("\n")) {
      if (!line.trim()) continue
      try {
        const p = JSON.parse(line)
        if (!byVote.has(p.vote_id)) byVote.set(p.vote_id, {})
        const tally = byVote.get(p.vote_id)!
        const norm = p.position === "Aye" || p.position === "Yea" ? "Y" : p.position === "No" || p.position === "Nay" ? "N" : null
        if (!norm) continue
        if (!tally[p.party as "R" | "D" | "I"]) (tally as any)[p.party] = { Y: 0, N: 0 }
        ;(tally as any)[p.party][norm]++
      } catch {}
    }
  }

  // Build bill_id → title map from data/bills.jsonl. Done once per
  // request. ~72MB file → ~141K bill records with titles, loaded
  // lazily only when voting-record is queried.
  const billsPath = path.join(REPO_ROOT, "data", "bills.jsonl")
  const billTitles = new Map<string, string>()  // e.g. "HR.5009-118" → "National Defense Authorization Act..."
  if (fs.existsSync(billsPath)) {
    for (const line of fs.readFileSync(billsPath, "utf-8").split("\n")) {
      if (!line.trim()) continue
      try {
        const b = JSON.parse(line)
        if (b.id && b.title) billTitles.set(b.id, String(b.title))
      } catch {}
    }
  }

  // Human-readable date parser. votes.jsonl stores ISO for House
  // (2024-10-25T17:05:00-04:00) but Senate pre-2023 uses natural
  // format ("October 25, 2024, 04:47 PM"). Return "Oct 25, 2024".
  function humanDate(raw?: string): string {
    if (!raw) return "—"
    let d = new Date(raw)
    if (isNaN(d.getTime())) {
      // Try Senate format.
      const m = raw.match(/(\w+ \d+,\s*\d{4})/)
      if (m) d = new Date(m[1])
    }
    if (isNaN(d.getTime())) return raw.slice(0, 20)
    return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })
  }

  // Normalize bill type for lookup (H.R. → HR, H.J.Res → HJRES).
  function billLookup(bill: { type?: string; number?: string | number } | undefined, congress?: number): { label: string; title?: string; key?: string } {
    if (!bill || !bill.type || !bill.number) return { label: "—" }
    const normType = String(bill.type).toUpperCase().replace(/[^A-Z]/g, "")
    const key = congress ? `${normType}.${bill.number}-${congress}` : null
    const title = key ? billTitles.get(key) : undefined
    const label = `${bill.type} ${bill.number}`
    return { label, title, key: key || undefined }
  }

  // Translate institutional position → plain English.
  function plainPosition(pos: string): string {
    if (pos === "Yea" || pos === "Aye" || pos === "Yes") return "For"
    if (pos === "Nay" || pos === "No") return "Against"
    if (pos === "Present") return "Present (abstained)"
    if (pos === "Not Voting") return "Did not vote"
    return pos
  }

  // Decode vote_id like "s269-118.1" → "Senate · Roll Call #269 · 118th Congress, 1st Session"
  function decodeVoteId(vid: string): string {
    const m = vid.match(/^([hs])(\d+)-(\d+)\.(\d+)$/)
    if (!m) return vid
    const chamber = m[1] === "h" ? "House" : "Senate"
    const ord = (n: number) => {
      const s = ["th", "st", "nd", "rd"], v = n % 100
      return n + (s[(v - 20) % 10] || s[v] || s[0])
    }
    const session = m[4] === "1" ? "1st Session" : m[4] === "2" ? "2nd Session" : `Session ${m[4]}`
    return `${chamber} · Roll Call #${m[2]} · ${ord(Number(m[3]))} Congress, ${session}`
  }

  let y = 0, n = 0, withParty = 0, devCount = 0
  const deviations: Array<Record<string, unknown>> = []
  for (const p of positions) {
    const norm = p.position === "Aye" || p.position === "Yea" ? "Y" : p.position === "No" || p.position === "Nay" ? "N" : null
    if (!norm) continue
    if (norm === "Y") y++
    else n++
    const tally = byVote.get(p.vote_id)
    if (!tally || !p.party) continue
    const partyTally = (tally as any)[p.party]
    if (!partyTally) continue
    const maj = partyTally.Y > partyTally.N ? "Y" : partyTally.N > partyTally.Y ? "N" : null
    if (!maj) continue
    if (norm === maj) withParty++
    else {
      devCount++
      const v = voteMeta.get(p.vote_id) as any
      const bill = billLookup(v?.bill, v?.congress)
      deviations.push({
        date: humanDate(v?.date),
        vote: plainPosition(p.position),
        party_voted: maj === "Y" ? "For" : "Against",
        deviated: true,
        bill: bill.title ? `${bill.label} — ${bill.title.slice(0, 100)}` : bill.label,
        question: v?.question || "—",
        result: v?.result || "—",
        roll_call: decodeVoteId(p.vote_id),
        raw_vote_id: p.vote_id,
      })
    }
  }
  const substantive = y + n
  const loyalty = substantive > 0 ? ((withParty / substantive) * 100).toFixed(1) + "%" : "—"

  deviations.sort((a, b) => {
    // Sort by a secondary sortable-ISO from raw_vote_id (extracts "s269-118.1")
    // using vote meta. Prefer the ISO date from voteMeta for accuracy.
    const va = voteMeta.get(a.raw_vote_id as string)
    const vb = voteMeta.get(b.raw_vote_id as string)
    return String(vb?.date || "").localeCompare(String(va?.date || ""))
  })

  if (positions.length === 0) {
    // Bioguide is valid but no positions landed for it in our window.
    // Describe their tenure from the legislator registry so the user
    // understands this is coverage, not a broken lookup.
    const reg = registryFor(bioguide)
    let tenure = ""
    if (reg) {
      const startYear = reg.start ? reg.start.slice(0, 4) : "?"
      const endYear = reg.end ? reg.end.slice(0, 4) : "?"
      const chamber = reg.chamber ? reg.chamber.charAt(0).toUpperCase() + reg.chamber.slice(1) : "Congress"
      tenure = ` Registry shows a ${chamber} term ${startYear}–${endYear}.`
    }
    return {
      question, intent: "voting_record", resolved_title: title,
      total: 0, rows: [],
      note: `${title} has a bioguide-id (${bioguide}) but no roll-call positions in our dataset. Vote coverage currently spans the 115th–119th Congress (Jan 2017–present).${tenure} Expanding backward to earlier Congresses is on the roadmap.`,
    } as AskResult
  }
  return {
    question,
    intent: "voting_record",
    resolved_title: title,
    total: positions.length,
    rows: deviations.slice(0, 25),
    summary: `${title} cast ${positions.length.toLocaleString()} recorded votes in Congress. Of those, ${substantive} were substantive Yes/No votes; they voted with their party's majority ${withParty.toLocaleString()} times (${loyalty} loyalty) and broke with the majority on ${devCount} votes. Showing the ${Math.min(25, deviations.length)} most-recent times they broke from party — the "signature" story in a voting record. Each row shows the bill, how they voted vs. the party majority, and the vote outcome.`,
  }
}

// ─── Edge role taxonomy ──────────────────────────────────────────────
// MIRROR of scripts/lib/fec-txn-types.cjs. The CJS file is the authority
// (imported by every Node script + the query engine); this TS copy is
// duplicated here because bundling a CJS module into Next.js route
// handlers is flaky. If you change one, change the other.
//
// Why this matters: before centralizing these, six handlers used
// `e.role !== "ie-oppose"` as the "support" filter — which silently
// counted operating-expense (vendor payments) and employee-contributions
// as political support. That produced AOC $239K (100x low), Kerry as a
// cross-party donor via vendor expenses, and Fidelity Investments with
// $6.4B in inflated cross-party TOTAL.
const POLITICAL_SUPPORT_ROLES = new Set<string>([
  "direct-contribution",
  "ie-support",
  "coordinated-party-expense",
  "party-coordinated",
])
const POLITICAL_OPPOSE_ROLES = new Set<string>(["ie-oppose"])
const POLITICAL_ROLES = new Set<string>([...POLITICAL_SUPPORT_ROLES, ...POLITICAL_OPPOSE_ROLES])
function isSupport(e: any): boolean {
  return !!e && e.type === "monetary" && POLITICAL_SUPPORT_ROLES.has(e.role)
}
function isOppose(e: any): boolean {
  return !!e && e.type === "monetary" && POLITICAL_OPPOSE_ROLES.has(e.role)
}
function isPolitical(e: any): boolean {
  return !!e && e.type === "monetary" && POLITICAL_ROLES.has(e.role)
}

// ─── Helpers ─────────────────────────────────────────────────────────

function stripQW(s: string): string {
  return s.replace(/^(who|what|where|how|show me|tell me|list|find|get)\s+/i, "").trim()
}

// ─── Classifier ──────────────────────────────────────────────────────

interface ClassifiedQuestion {
  intent: Intent
  subjectName?: string
  objectName?: string
  extra?: { year?: string; topic?: string }
}

function classify(q: string): ClassifiedQuestion {
  const lower = q.toLowerCase().trim()

  // Concept explainers — "what are the Panama Papers", "what is dark money",
  // "what is a 527", "define EIN", "explain cycle". These are definitional
  // questions, not entity lookups. Match early so they don't fall through
  // to generic entity resolution.
  const conceptMatch = lower.match(/^(?:what (?:are|is)(?: the| a| an)?|define|explain|tell me what(?: is| are)? (?:is|are)(?: the| a)?)\s+(.+?)(?:\?)?$/)
  if (conceptMatch) {
    const concept = conceptMatch[1].trim()
    if (KNOWN_CONCEPTS.has(conceptKey(concept))) {
      return { intent: "explain_concept", subjectName: concept }
    }
  }

  // Cross-party composer
  if (/cross[- ]party/.test(lower)) return { intent: "cross_party_donors" }

  // Compare X vs Y — handle before single-subject intents so "compare
  // Sixteen Thirty Fund vs Marble Freedom Trust" doesn't fall through
  // to something else. Recognized phrasings:
  //   compare X (vs|versus|and|with|to) Y
  //   X vs Y        (bare "vs" shape — only if BOTH sides look like entities,
  //                  i.e. not "top vs bottom" or generic words)
  //   X versus Y
  let mCmp =
    lower.match(/^compare\s+(.+?)\s+(?:vs\.?|versus|and|with|to)\s+(.+?)$/) ||
    lower.match(/^(.+?)\s+(?:vs\.?|versus)\s+(.+?)$/)
  if (mCmp) {
    const left = mCmp[1].trim()
    const right = mCmp[2].trim()
    // Cheap sanity filter: each side has ≥3 chars and doesn't start
    // with a question word (so "who vs what" doesn't trip it).
    if (left.length >= 3 && right.length >= 3 && !/^(who|what|how|why|which)\b/.test(left)) {
      return { intent: "compare", subjectName: left, objectName: right }
    }
  }

  // Voting record. The "how did X vote" shape is for individual legislators
  // only — exclude congress/house/senate so bill-direction queries like
  // "how did congress vote on H.R. 1" fall through to votes_on_bill below.
  let m = lower.match(/^(.+?)\s+voting record$/) || lower.match(/^how did (?!(?:congress|the house|the senate)\b)(.+?) vote/)
  if (m) return { intent: "voting_record", subjectName: m[1] }

  // Phase 2: Bills sponsored by X
  //   "bills sponsored by Ted Cruz"
  //   "what bills did Pelosi introduce"
  //   "Bernie Sanders bills" / "Sanders sponsorship"
  m = lower.match(/^bills?\s+sponsored\s+by\s+(.+?)$/)
    || lower.match(/^what bills?\s+(?:did|has)\s+(.+?)\s+(?:introduce|sponsor|author)/)
    || lower.match(/^(.+?)\s+(?:sponsorship|sponsored bills?)$/)
  if (m) return { intent: "bills_sponsored_by", subjectName: m[1] }

  // Phase 2: Bills in a policy area
  //   "health bills", "bills on energy", "taxation bills"
  m = lower.match(/^(health|energy|taxation|defense|environmental?|agricultural?|labor|transportation|housing|immigration|finance|banking|crypto|tech(?:nology)?)\s+bills?$/)
    || lower.match(/^bills?\s+(?:on|about|in)\s+(health|energy|taxation|defense|environment(?:al)?|agricultur(?:e|al)|labor|transportation|housing|immigration|finance|banking|crypto|tech(?:nology)?)$/)
  if (m) return { intent: "bills_in_policy", extra: { topic: m[1] } }

  // Phase 2: Executive orders / proclamations by president
  //   "Trump EOs", "Trump executive orders", "Biden's EOs 2023"
  //   "executive orders by Obama", "Trump proclamations"
  m = lower.match(/^(.+?)'?s?\s+(?:eos|executive orders?|proclamations?|directives?)(?:\s+(\d{4}))?$/)
    || lower.match(/^(?:eos|executive orders?|proclamations?|directives?)\s+(?:by|signed by|from)\s+(.+?)(?:\s+(?:in\s+)?(\d{4}))?$/)
  if (m) return { intent: "executive_orders_by", subjectName: m[1].trim(), extra: { year: m[2] } }

  // Phase 2: Offshore holdings
  //   "offshore holdings of Apple", "shell companies linked to Blackstone"
  //   "Apple offshore", "panama papers Apple"
  m = lower.match(/^offshore\s+(?:holdings?|entities|records?|exposure)\s+(?:of|for|linked to)\s+(.+?)$/)
    || lower.match(/^shell\s+compan(?:y|ies)\s+(?:of|for|linked to)\s+(.+?)$/)
    || lower.match(/^(.+?)\s+offshore(?:\s+(?:holdings?|records?|exposure))?$/)
    || lower.match(/^(?:panama|paradise|pandora)\s+papers?\s+(.+?)$/)
  if (m) return { intent: "offshore_for", subjectName: m[1] }

  // Phase 2b: Vote detail by roll-call ID — "roll call s325-118.2",
  // "show vote h112-117.1", "vote s200-118.2"
  m = lower.match(/^(?:roll call|vote|show vote)\s+([hs]\d+-\d+\.\d+)$/)
    || lower.match(/^([hs]\d+-\d+\.\d+)$/)
  if (m) return { intent: "vote_detail", subjectName: m[1] }

  // Phase 2b: Votes on a specific bill — "votes on H.R. 1",
  // "how did congress vote on H.R. 5009", "votes on HR 1 in 118th"
  // Bill-ref shape tolerates: H.R. 1 / HR 1 / H.J.Res 5 / S. 500 / S.J.Res 12.
  // The inner [jr]? covers both "J" (joint resolution) and "R" (house resolution).
  m = lower.match(/^(?:how did (?:congress|the house|the senate) vote on|votes on)\s+([hs]\.?\s*[jr]?\.?\s*(?:res\.?)?\s*\d+)(?:\s+in\s+(\d+)(?:th)?)?$/i)
  if (m) {
    const billRef = m[1].toUpperCase().replace(/\s+/g, "").replace(/\./g, "")
    return { intent: "votes_on_bill", subjectName: billRef, extra: { year: m[2] } }
  }

  // Phase 2b: Positions by legislator filtered by vote type.
  //   "Bernie's nay votes" / "AOC yes votes" / "Ted Cruz no votes"
  //   "Republicans who voted yea on H.R. 1"
  m = lower.match(/^(.+?)'?s\s+(nay|no|yea|aye|yes)\s+votes?$/)
  if (m) {
    const pos = m[2].toLowerCase()
    const mapped = pos === "nay" || pos === "no" ? "Nay" : pos === "yea" || pos === "aye" || pos === "yes" ? "Yea" : pos
    return { intent: "positions_by", subjectName: m[1], extra: { topic: mapped } }
  }

  // Leaderboards (no subject entity, just an aggregate)
  if (/^top\s+(donors|givers|funders)($|\s+overall)/.test(lower)) return { intent: "leaderboard", extra: { topic: "top_donors" } }
  if (/^(top|biggest)\s+super[- ]?pacs?$/.test(lower)) return { intent: "leaderboard", extra: { topic: "top_superpacs" } }
  if (/^(top|most[- ]?funded)\s+(politicians|candidates)/.test(lower)) return { intent: "leaderboard", extra: { topic: "top_politicians" } }
  if (/^(biggest|top)\s+(pacs?|committees)$/.test(lower)) return { intent: "leaderboard", extra: { topic: "top_pacs" } }
  if (/^top\s+daf\b/.test(lower) || /^top\s+donor[- ]advised/.test(lower)) return { intent: "leaderboard", extra: { topic: "top_dafs" } }

  // Money chain (multi-hop) — "money chain from X to Y" / "flow from X to Y" / "how does money get from X to Y"
  m =
    lower.match(/(?:money chain|money flow|flow|path|chain)\s+from\s+(.+?)\s+to\s+(.+?)$/) ||
    lower.match(/how does money (?:get|flow|move)\s+from\s+(.+?)\s+to\s+(.+?)$/)
  if (m) return { intent: "money_chain", subjectName: m[1], objectName: m[2] }

  // Single-entity donor/recipient lookups — MUST run before edge_between
  // so "who funds X" doesn't get swallowed by the "X funds Y" pattern.

  // Affiliations — "what boards is X on"
  m = lower.match(/what boards?.+is\s+(.+?)\s+on$/) || lower.match(/^(.+?)'?s\s+boards?$/)
  if (m) return { intent: "affiliations_from", subjectName: m[1] }
  m = lower.match(/who.*board of\s+(.+?)$/) || lower.match(/^board of\s+(.+?)$/)
  if (m) return { intent: "affiliations_to", subjectName: m[1] }

  // Grants from X [in YYYY]
  m = lower.match(/(?:biggest|top)?\s*grants? from\s+(.+?)(?:\s+in\s+(\d{4}))?$/)
  if (m) return { intent: "grants_from", subjectName: m[1], extra: { year: m[2] } }

  // Donors to X
  m =
    lower.match(/top donors? (?:to|for)\s+(.+?)$/) ||
    lower.match(/(?:who funds|funders of|who funded)\s+(.+?)$/)
  if (m) return { intent: "donors_to", subjectName: m[1] }

  // Recipients from X
  m =
    lower.match(/where does\s+(.+?)(?:'s)?\s+money go/) ||
    lower.match(/(?:what does|where does)\s+(.+?)\s+fund/) ||
    lower.match(/(?:top recipients (?:of|from))\s+(.+?)$/)
  if (m) return { intent: "recipients_from", subjectName: m[1] }

  // Edge between two entities — "X funds Y" / "X gave to Y" / "X to Y" / "does X fund Y" /
  // "money between X and Y" / "is there money from X to Y" / "connections between X and Y".
  // Runs after donors_to/recipients_from so single-entity phrasings match first.
  // Guard: reject if subject is a bare question word (who/what/where/etc) that
  // slipped past — those should have hit donors_to above.
  m =
    lower.match(/^does\s+(.+?)\s+(?:fund|support|give to|donate to)\s+(.+?)[\?]?$/) ||
    lower.match(/^did\s+(.+?)\s+(?:fund|support|give to|donate to)\s+(.+?)[\?]?$/) ||
    lower.match(/^(.+?)\s+(?:funds|funded|gives to|gave to|donates to|donated to)\s+(.+?)$/) ||
    lower.match(/^(?:money|ties|connections?|flows?|relationship)\s+between\s+(.+?)\s+and\s+(.+?)$/) ||
    lower.match(/^(?:is there|any)\s+money\s+(?:from|between)\s+(.+?)\s+(?:to|and)\s+(.+?)[\?]?$/) ||
    lower.match(/^(.+?)\s+to\s+(.+?)\s+money$/)
  if (m && !lower.includes("cross") && m[1].split(" ").length <= 6 && m[2].split(" ").length <= 6) {
    const subj = m[1].trim()
    if (!/^(who|what|where|how|did|does|tell|show|find|get|list|about)$/.test(subj)) {
      return { intent: "edge_between", subjectName: subj, objectName: m[2] }
    }
  }

  // Summary / profile snapshot
  m =
    lower.match(/^(?:tell me about|about|summary of|summarize|snapshot of|profile of|who is|what is)\s+(.+?)$/) ||
    lower.match(/^(.+?)\s+summary$/) ||
    lower.match(/^(.+?)\s+snapshot$/)
  if (m) return { intent: "summary", subjectName: m[1] }

  // Fallback
  return { intent: "generic", subjectName: stripQW(q) }
}

// ─── Intent handlers ─────────────────────────────────────────────────

async function handleEdgeBetween(c: ClassifiedQuestion, question: string, engine: any): Promise<AskResult> {
  const a = resolveTitle(c.subjectName as string)
  const b = resolveTitle(c.objectName as string)

  // Expand both sides by vehicles they control — an "Elon Musk funds
  // Donald Trump" question should pick up America PAC → Trump (and
  // America PAC → Trump's committees) as direct edges, not fall through
  // to a multi-hop BFS that finds an incidental $600 chain.
  const aSources = [a.title, ...vehiclesFor(a.title)]
  const bTargets = [b.title, ...vehiclesFor(b.title)]
  const forward: any[] = []
  const reverse: any[] = []
  for (const from of aSources) {
    for (const to of bTargets) {
      const r = await engine.query({ subject: "edges", filters: { from, to }, limit: 50 })
      for (const row of r.rows) forward.push({ ...row, _from_via: from !== a.title ? from : undefined, _to_via: to !== b.title ? to : undefined })
    }
  }
  for (const from of bTargets) {
    for (const to of aSources) {
      const r = await engine.query({ subject: "edges", filters: { from, to }, limit: 50 })
      for (const row of r.rows) reverse.push({ ...row, _from_via: from !== b.title ? from : undefined, _to_via: to !== a.title ? to : undefined })
    }
  }

  // Separate monetary edges (the ones with real dollars) from "related"
  // and other weak-signal types that exist only because one side was
  // wiki-linked from the other.
  const monetaryForward = forward.filter((e: any) => e.type === "monetary" && e.amount)
  const monetaryReverse = reverse.filter((e: any) => e.type === "monetary" && e.amount)
  const affiliationForward = forward.filter((e: any) => e.type === "affiliation")
  const affiliationReverse = reverse.filter((e: any) => e.type === "affiliation")
  // Split support vs opposition on each direction so we don't describe
  // attack spending as "direct flows." Uses the shared role taxonomy;
  // the previous `role !== "ie-oppose"` filter silently counted
  // operating-expense + employee-contributions as "support."
  const fwdSupport = monetaryForward.filter(isSupport)
  const fwdOppose = monetaryForward.filter(isOppose)
  const revSupport = monetaryReverse.filter(isSupport)
  const revOppose = monetaryReverse.filter(isOppose)
  const fwdTotal = fwdSupport.reduce((acc: number, e: any) => acc + Number(e.amount), 0)
  const revTotal = revSupport.reduce((acc: number, e: any) => acc + Number(e.amount), 0)
  const fwdOpposeTotal = fwdOppose.reduce((acc: number, e: any) => acc + Number(e.amount), 0)
  const revOpposeTotal = revOppose.reduce((acc: number, e: any) => acc + Number(e.amount), 0)

  // If direct monetary edges exist, great — just show them.
  if (monetaryForward.length + monetaryReverse.length + affiliationForward.length + affiliationReverse.length > 0) {
    const kindFor = (e: any) => e.role === "ie-oppose" ? "attack $" : e.role === "ie-support" ? "IE support $" : "direct $"
    const rows = [
      ...monetaryForward.map((e: any) => ({ direction: "→", kind: kindFor(e), ...e })),
      ...monetaryReverse.map((e: any) => ({ direction: "←", kind: kindFor(e), ...e })),
      ...affiliationForward.map((e: any) => ({ direction: "→", kind: "affiliation", ...e })),
      ...affiliationReverse.map((e: any) => ({ direction: "←", kind: "affiliation", ...e })),
    ]
    const parts: string[] = []
    if (fwdSupport.length) parts.push(`${a.title} → ${b.title}: ${fwdSupport.length} monetary edge(s), ${fmtUsd(fwdTotal)}`)
    if (fwdOppose.length) parts.push(`${a.title} AGAINST ${b.title}: ${fwdOppose.length} IE-oppose edge(s), ${fmtUsd(fwdOpposeTotal)}`)
    if (revSupport.length) parts.push(`${b.title} → ${a.title}: ${revSupport.length} monetary edge(s), ${fmtUsd(revTotal)}`)
    if (revOppose.length) parts.push(`${b.title} AGAINST ${a.title}: ${revOppose.length} IE-oppose edge(s), ${fmtUsd(revOpposeTotal)}`)
    if (affiliationForward.length || affiliationReverse.length) parts.push(`${affiliationForward.length + affiliationReverse.length} affiliation edge(s)`)

    const supportSum = fwdTotal + revTotal
    const opposeSum = fwdOpposeTotal + revOpposeTotal
    let answer: string
    if (supportSum > 0 && opposeSum > 0) {
      answer = `**${a.title}** and **${b.title}** have ${fmtUsd(supportSum)} in tracked direct flows, PLUS ${fmtUsd(opposeSum)} in attack (IE-oppose) spending between them.`
    } else if (supportSum > 0) {
      answer = `**${a.title}** and **${b.title}** have ${fmtUsd(supportSum)} in tracked direct flows${affiliationForward.length + affiliationReverse.length > 0 ? ` plus ${affiliationForward.length + affiliationReverse.length} officer/board affiliation(s)` : ""}.`
    } else if (opposeSum > 0) {
      answer = `**${a.title}** and **${b.title}** have NO direct donations, but ${fmtUsd(opposeSum)} in attack (IE-oppose) spending${fwdOppose.length ? ` from ${a.title} against ${b.title}` : ""}${revOppose.length ? ` from ${b.title} against ${a.title}` : ""}.`
    } else {
      answer = `**${a.title}** and **${b.title}** are linked only by ${affiliationForward.length + affiliationReverse.length} affiliation edge(s). No direct dollar flows in the store.`
    }
    const bullets: string[] = []
    for (const e of [...monetaryForward, ...monetaryReverse].sort((x: any, y: any) => y.amount - x.amount).slice(0, 5)) {
      const arrow = e.role === "ie-oppose" ? "AGAINST" : "→"
      const fromLabel = e._from_via ? `${e._from_via} (a ${a.title} vehicle)` : e.from
      const toLabel = e._to_via ? `${e._to_via} (a ${b.title} vehicle)` : e.to
      bullets.push(`${fromLabel} ${arrow} ${toLabel}: ${fmtUsd(Number(e.amount))}${e.cycle ? ` (${e.cycle})` : ""} [${e.source}]`)
    }
    for (const e of [...affiliationForward, ...affiliationReverse].slice(0, 3)) {
      bullets.push(`${e.from} — ${e.role || "affiliation"} — ${e.to}${e.date_range ? ` (${e.date_range.slice(0, 4)}–${e.date_range.slice(-10, -6)})` : ""}`)
    }

    return {
      question,
      intent: "edge_between",
      resolved_title: a.title,
      resolved_title_2: b.title,
      did_you_mean: [...(a.candidates || []), ...(b.candidates || [])].filter(Boolean).slice(0, 5),
      total: rows.length,
      rows: rows.slice(0, 50),
      answer,
      bullets,
      context: [explainEntity(a.title), explainEntity(b.title)],
      summary: parts.join("; "),
    }
  }

  // No direct monetary / affiliation edges. Fall through to money-chain BFS
  // so the user sees intermediary paths (this is the common case — e.g.
  // "elon musk funds donald trump" flows through America PAC, not directly).
  const chain = await handleMoneyChain(
    { intent: "money_chain", subjectName: a.title, objectName: b.title },
    question,
  )

  const haveRelatedOnly = [...forward, ...reverse].filter((e: any) => e.type === "related").length > 0

  return {
    ...chain,
    intent: "edge_between",
    resolved_title: a.title,
    resolved_title_2: b.title,
    did_you_mean: [...(a.candidates || []), ...(b.candidates || [])].filter(Boolean).slice(0, 5),
    summary:
      chain.total > 0
        ? `No direct monetary edge in the store. Found ${chain.total} money-chain path(s) through intermediaries (up to 3 hops). ${haveRelatedOnly ? "The two profiles are also linked via vault-side 'related' references. " : ""}Ranked by min-edge bottleneck.`
        : `No direct monetary edge AND no money chain within 3 hops. They may not be connected through tracked dollar flows yet. Try asking for one side's donors/recipients.`,
  }
}

async function handleSummary(c: ClassifiedQuestion, question: string, engine: any): Promise<AskResult> {
  const r = resolveTitle(c.subjectName as string)
  const name = r.title
  const ent = findEntity(name)

  const inflowsRaw = await engine.query({ subject: "edges", filters: { to: name, type: "monetary" }, limit: 2000 })
  const outflows = await engine.query({ subject: "edges", filters: { from: name, type: "monetary" }, limit: 2000 })

  // Split support vs opposition using the shared role taxonomy. The
  // prior `role !== "ie-oppose"` pattern counted vendor payments and
  // employee-contribution aggregates as "donors" — responsible for
  // the AOC $239K-total bug where individual contributions were
  // filtered out entirely.
  const inflows = {
    total: inflowsRaw.rows.filter(isSupport).length,
    rows: inflowsRaw.rows.filter(isSupport),
  }
  const oppoEdges = inflowsRaw.rows.filter(isOppose)
  const oppoTotal = oppoEdges.filter((e: any) => e.amount).reduce((a: number, e: any) => a + Number(e.amount), 0)
  const affiliations_from = await engine.query({ subject: "edges", filters: { from: name, type: "affiliation" }, limit: 20 })
  const affiliations_to = await engine.query({ subject: "edges", filters: { to: name, type: "affiliation" }, limit: 20 })
  // Pull additional affiliations from the 990 officer registry so the
  // summary shows board/officer relationships even when no edge was
  // minted (only 24 survived strict name-match ingest). "Tell me about
  // Marble Freedom Trust" will now list its officers even if none of
  // them exist as vault-side person entities yet.
  const regOfficers = lookupOfficerRegistry(name, "affiliations_to")
  const regBoards = lookupOfficerRegistry(name, "affiliations_from")

  const topIn = [...(inflows.rows || [])]
    .filter((e: any) => e.amount)
    .sort((a: any, b: any) => (b.amount || 0) - (a.amount || 0))
    .slice(0, 5)
    .map((e: any) => ({ kind: "top-donor", from: e.from, to: name, amount: e.amount, cycle: e.cycle, source: e.source }))

  const topOut = [...(outflows.rows || [])]
    .filter((e: any) => e.amount)
    .sort((a: any, b: any) => (b.amount || 0) - (a.amount || 0))
    .slice(0, 5)
    .map((e: any) => ({ kind: "top-recipient", from: name, to: e.to, amount: e.amount, cycle: e.cycle, source: e.source }))

  const boardsCombined = [...(affiliations_from.rows || []), ...regBoards]
  const officersCombined = [...(affiliations_to.rows || []), ...regOfficers]
  const boards = boardsCombined.slice(0, 10).map((e: any) => ({
    kind: "board-seat",
    from: name,
    to: e.to,
    role: e.role || (Array.isArray(e.titles) ? e.titles[0] : undefined),
    date_range: e.date_range,
    years: e.years,
    source: e.source,
  }))
  const officers = officersCombined.slice(0, 10).map((e: any) => ({
    kind: "officer",
    from: e.from,
    to: name,
    role: e.role || (Array.isArray(e.titles) ? e.titles[0] : undefined),
    date_range: e.date_range,
    years: e.years,
    compensation: e.compensation,
    source: e.source,
  }))

  const classTags: string[] = []
  if (ent?.capital_type) classTags.push(`capital_type:${ent.capital_type}`)
  if (ent?.ideological_function && ent.ideological_function.length > 0)
    classTags.push(...ent.ideological_function.map((f) => `ideological_function:${f}`))
  const tagRows = classTags.map((t) => ({ kind: "class-tag", tag: t }))

  // For PEOPLE, pull flows from vehicles they control — PACs, foundations,
  // DAFs whose name carries theirs. Musk's direct giving is a few thousand
  // dollars; America PAC (which his name is on) put $147M into the Trump
  // operation. We ALWAYS show vehicles for persons now, not just when
  // there are zero direct edges — otherwise small direct donations mask
  // the much larger flows moving through the person's named vehicles.
  const vehiclesControlled = vehiclesFor(name)
  const viaOrgs: Array<Record<string, unknown>> = []
  const boardOrgs = boards.slice(0, 3).map((b: any) => b.to).filter(Boolean) as string[]
  const orgsToProbe = [...new Set([...vehiclesControlled, ...boardOrgs])].slice(0, 5)
  if (orgsToProbe.length > 0) {
    for (const orgName of orgsToProbe) {
      if (!orgName) continue
      // Bumped from 50 — the summary aggregates top-3 per-org but we
      // want totals. For big vehicles (MAGA Inc 967 inflows, Trump
      // Victory 1,197) 50 silently truncates. The aggregation then
      // reads the wrong dollar total from the truncated set.
      const orgIn = await engine.query({ subject: "edges", filters: { to: orgName, type: "monetary" }, limit: 1500 })
      const orgOut = await engine.query({ subject: "edges", filters: { from: orgName, type: "monetary" }, limit: 1500 })
      // Push ALL edges, not just top 3 — the per-org aggregation below
      // sums every entry, so slicing here silently truncated totals.
      // For Marble Freedom Trust the real outflow is $803M across 10
      // edges; the top-3 slice was reporting $461M (57% of real total).
      // Display-time capping happens in the render step (topSupport /
      // topAttack .slice(0, 3)), so the narrative still shows top 3
      // recipients — just with the correct aggregate total.
      ;[...(orgIn.rows || [])]
        .filter((e: any) => e.amount)
        .forEach((e: any) =>
          viaOrgs.push({ kind: `via ${orgName} (in)`, from: e.from, to: orgName, amount: e.amount, cycle: e.cycle, source: e.source }),
        )
      ;[...(orgOut.rows || [])]
        .filter((e: any) => e.amount)
        .forEach((e: any) => {
          const label = e.role === "ie-oppose"
            ? `via ${orgName} AGAINST`
            : e.role === "ie-support"
            ? `via ${orgName} supports`
            : `via ${orgName} (out)`
          viaOrgs.push({ kind: label, from: orgName, to: e.to, amount: e.amount, cycle: e.cycle, source: e.source, role: e.role })
        })
    }
  }

  const rows = [...tagRows, ...topIn, ...topOut, ...boards, ...officers, ...viaOrgs]

  // Build narrative answer
  const typeSector = `${ent?.entity_type || "unknown entity"}${ent?.signals?.sector ? " in " + (ent.signals.sector as string) : ""}`
  const bullets: string[] = []

  // Summary receipts (from the FEC weball all-candidates ingest) —
  // essential for small-dollar campaigns where itemized donor edges
  // are sparse by design. If a politician has fec_receipts_lifetime
  // populated, lead with the headline number and cycle breakdown so
  // Bernie's $550M across 20 cycles doesn't get hidden behind "0 direct
  // donor edges."
  if (ent?.entity_type === "politician" && typeof ent?.signals?.fec_receipts_lifetime === "number" && ent.signals.fec_receipts_lifetime > 0) {
    const life = ent.signals.fec_receipts_lifetime as number
    const byCycle = (ent.signals.fec_receipts_by_cycle as Record<string, number> | undefined) || {}
    const cyclesAsc = Object.keys(byCycle).sort()
    const recentCycles = cyclesAsc.slice(-4)
    const recentStr = recentCycles.map((c) => `${c}: ${fmtUsd(byCycle[c])}`).join(" · ")
    const indivStr = typeof ent.signals.fec_indiv_contrib_lifetime === "number"
      ? ` (${fmtUsd(ent.signals.fec_indiv_contrib_lifetime)} from individuals)`
      : ""
    bullets.push(`FEC lifetime receipts: **${fmtUsd(life)}** across ${cyclesAsc.length} cycle${cyclesAsc.length === 1 ? "" : "s"}${indivStr}`)
    if (recentCycles.length > 0) bullets.push(`Recent cycles — ${recentStr}`)
  }

  if (boards.length > 0) {
    const boardStr = boards.map((b: any) => {
      const role = b.role ? ` (${b.role}${b.date_range ? ", " + b.date_range.slice(0, 4) + "–" + b.date_range.slice(-10, -6) : ""})` : ""
      return `${b.to}${role}`
    }).join(", ")
    bullets.push(`Chairs/sits on: ${boardStr}`)
  }

  if (topIn.length > 0) {
    const totalIn = inflows.rows.filter((e: any) => e.amount).reduce((a: number, e: any) => a + Number(e.amount), 0)
    const oppoNote = oppoEdges.length > 0
      ? ` (Plus ${fmtUsd(oppoTotal)} spent AGAINST them by ${oppoEdges.length} opposition edge${oppoEdges.length === 1 ? "" : "s"} — excluded.)`
      : ""
    bullets.push(`Received ~${fmtUsd(totalIn)} across ${inflows.total} donors. Top: ${topIn.slice(0, 3).map((e: any) => e.from + " " + fmtUsd(e.amount)).join(", ")}.${oppoNote}`)
  }
  if (topOut.length > 0) {
    const totalOut = outflows.rows.filter((e: any) => e.amount).reduce((a: number, e: any) => a + Number(e.amount), 0)
    bullets.push(`Distributed ~${fmtUsd(totalOut)} across ${outflows.total} recipients. Top: ${topOut.slice(0, 3).map((e: any) => e.to + " " + fmtUsd(e.amount)).join(", ")}`)
  }

  if (viaOrgs.length > 0) {
    const perOrg: Record<string, { inDollars: number; supportOut: number; attackOut: number; donationOut: number; topSupport: Array<{ to: string; amount: number }>; topAttack: Array<{ to: string; amount: number }> }> = {}
    for (const v of viaOrgs) {
      const kind = String(v.kind)
      // Recognize all kind shapes: "via X (in)", "via X (out)", "via X AGAINST", "via X supports"
      const m = kind.match(/^via (.+?)(?: \((in|out)\)| AGAINST| supports)?$/)
      if (!m) continue
      const org = m[1]
      const isIn = kind.endsWith("(in)")
      if (!perOrg[org]) perOrg[org] = { inDollars: 0, supportOut: 0, attackOut: 0, donationOut: 0, topSupport: [], topAttack: [] }
      const amt = Number(v.amount) || 0
      if (isIn) perOrg[org].inDollars += amt
      else if (v.role === "ie-oppose") {
        perOrg[org].attackOut += amt
        perOrg[org].topAttack.push({ to: v.to as string, amount: amt })
      } else if (v.role === "ie-support") {
        perOrg[org].supportOut += amt
        perOrg[org].topSupport.push({ to: v.to as string, amount: amt })
      } else {
        perOrg[org].donationOut += amt
        perOrg[org].topSupport.push({ to: v.to as string, amount: amt })
      }
    }
    for (const [org, d] of Object.entries(perOrg)) {
      const parts: string[] = []
      if (d.inDollars > 0) parts.push(`received ${fmtUsd(d.inDollars)}`)
      const outPositive = d.supportOut + d.donationOut
      if (outPositive > 0) parts.push(`moved ${fmtUsd(outPositive)} to allies`)
      if (d.attackOut > 0) parts.push(`spent ${fmtUsd(d.attackOut)} AGAINST opponents`)
      const supStr = d.topSupport.length
        ? ` Support: ${d.topSupport.sort((a, b) => b.amount - a.amount).slice(0, 3).map((x) => x.to + " " + fmtUsd(x.amount)).join(", ")}.`
        : ""
      const attStr = d.topAttack.length
        ? ` Attacks: ${d.topAttack.sort((a, b) => b.amount - a.amount).slice(0, 3).map((x) => x.to + " " + fmtUsd(x.amount)).join(", ")}.`
        : ""
      bullets.push(`Via ${org}: ${parts.join("; ")}.${supStr}${attStr}`)
    }
  }

  if (classTags.length > 0) bullets.push(`Class tags: ${classTags.join(", ")}`)

  // Build a richer answer line with the headline totals so users aren't
  // staring at just "donor in Dark Money." — that read as broken.
  // Numbers come from the same filtered inflows/outflows/boards in scope.
  const inTotal$ = (inflows.rows || []).filter((e: any) => e.amount).reduce((a: number, e: any) => a + Number(e.amount), 0)
  const outTotal$ = (outflows.rows || []).filter((e: any) => e.amount).reduce((a: number, e: any) => a + Number(e.amount), 0)
  const parts: string[] = [`**${name}** — ${typeSector}.`]
  const factBits: string[] = []
  if (inTotal$ > 0) factBits.push(`${fmtUsd(inTotal$)} in tracked inflows from ${inflows.total} donor edge${inflows.total === 1 ? "" : "s"}`)
  if (outTotal$ > 0) factBits.push(`${fmtUsd(outTotal$)} in outflows across ${outflows.total} recipient edge${outflows.total === 1 ? "" : "s"}`)
  if (oppoTotal > 0) factBits.push(`${fmtUsd(oppoTotal)} in attack (IE-oppose) spending from ${oppoEdges.length} edge${oppoEdges.length === 1 ? "" : "s"}`)
  if (boards.length > 0) factBits.push(`${boards.length} board / affiliation seat${boards.length === 1 ? "" : "s"}`)
  if (officers.length > 0) factBits.push(`${officers.length} tracked officer${officers.length === 1 ? "" : "s"}`)
  if (factBits.length) parts.push(factBits.join(" · "))
  if (topIn.length === 0 && topOut.length === 0 && boards.length > 0) {
    parts.push(`Most flows move through the org${boards.length === 1 ? "" : "s"} this entity chairs, not their personal name.`)
  }
  const answer = parts.join(" ")

  // Also explain the top orgs this person/entity is connected to
  const contextNames = new Set<string>([name])
  for (const b of boards.slice(0, 3)) if (b.to) contextNames.add(b.to as string)
  const context = [...contextNames].map((n) => explainEntity(n))

  // ─── Plain-English overlay for normies ──────────────────────────
  // Extend the same TL;DR / is-this-legal / why-matters treatment
  // used on money_chain cards to single-entity summaries. Only fires
  // for dark-money vehicles and operators — corporate / politician
  // summaries stay schema-first (they already read naturally enough).
  const sectorLower = String(ent?.signals?.sector || "").toLowerCase()
  const ideo = (ent?.ideological_function || []).join(" ").toLowerCase()
  const capital = String(ent?.capital_type || "").toLowerCase()
  const isDarkMoneyVehicle =
    sectorLower.includes("dark money") ||
    ideo.includes("dark-money") ||
    ideo.includes("dark money") ||
    capital.includes("dark-money") ||
    ent?.signals?.structural_role === "dark-money-vehicle"

  let plain_english: string | undefined
  let is_this_legal: string | undefined
  let why_matters: string | undefined

  if (isDarkMoneyVehicle && ent) {
    const totalIn = inflows.rows
      .filter((e: any) => e.amount)
      .reduce((a: number, e: any) => a + Number(e.amount), 0)
    const totalOut = outflows.rows
      .filter((e: any) => e.amount)
      .reduce((a: number, e: any) => a + Number(e.amount), 0)
    const kind = ent.entity_type || "entity"

    if (kind === "donor" || kind === "corporation" || kind === "nonprofit") {
      // Build a one-sentence TL;DR for the vehicle
      const moneyBit = (totalIn > 0 || totalOut > 0)
        ? ` On the books: received ${fmtUsd(totalIn)} from ${inflows.total} donor${inflows.total === 1 ? "" : "s"}, distributed ${fmtUsd(totalOut)} to ${outflows.total} recipient${outflows.total === 1 ? "" : "s"}.`
        : ""
      plain_english = `**In plain English:** ${name} is a dark-money vehicle — a nonprofit that can legally accept unlimited donations and is not required to publicly disclose who gave.${moneyBit} The named donors in the list below are the ones the IRS forced into the open through Schedule I grant disclosures by *other* nonprofits. The rest of the money arrived anonymously by design.`

      is_this_legal = `**Yes — and that's the structural problem.** 501(c)(4) "social welfare" nonprofits are permitted by federal law to spend unlimited sums on political advocacy without ever disclosing their donors. ${name} is using a legal framework — the scandal is that the framework exists, not that anyone's breaking it.`

      why_matters = `When a single vehicle concentrates ${fmtUsd(totalOut || totalIn)} of politically-directed money with no public accountability for who funded it, voters can't evaluate whose interests are actually being served by the ads, lobbying, and ${kind === "nonprofit" ? "grant programs" : "political spending"} it pays for. That opacity is the point, and the reason this class of vehicle exists.`
    } else if (kind === "individual" || kind === "person") {
      plain_english = `**In plain English:** ${name} is a dark-money operator — someone whose political influence runs mostly through nonprofits they control or chair, not direct personal giving. Their personal FEC donations are typically small; the real scale is in the vehicles listed below.`

      is_this_legal = `**Yes, it's legal.** Chairing a 501(c)(4) that doesn't disclose donors is not a crime. The structural question is whether the legal framework around these vehicles should exist at this scale, not whether any specific operator is breaking rules.`

      why_matters = `Concentrated political spending by a single operator — hundreds of millions routed through controlled vehicles — bypasses the campaign-finance disclosure system entirely. When you can't trace money from its original source to the political outcome it bought, you can't hold anyone accountable for that influence. That's the democratic cost of this structure.`
    }
  }

  return {
    question,
    intent: "summary",
    resolved_title: name,
    did_you_mean: r.candidates.slice(0, 5),
    total: rows.length,
    rows,
    answer,
    bullets,
    context,
    plain_english,
    is_this_legal,
    why_matters,
    summary: `${inflows.total} inbound, ${outflows.total} outbound, ${affiliations_from.total + affiliations_to.total} affiliations${viaOrgs.length > 0 ? ", " + viaOrgs.length + " via-org flows" : ""}.`,
  }
}

// ─── Compare X vs Y ───────────────────────────────────────────────────
// Side-by-side structural comparison of two entities. The key UX goal:
// reveal symmetry (or its absence) between organizations that normally
// read as oppositional but are actually structurally identical —
// Sixteen Thirty Fund vs Marble Freedom Trust, Fairshake vs traditional
// industry blocs, Trump vs Harris fundraising structure. A good compare
// card teaches the reader the SHAPE of power, not just the numbers.

async function handleCompare(c: ClassifiedQuestion, question: string, engine: any): Promise<AskResult> {
  const rA = resolveTitle(c.subjectName as string)
  const rB = resolveTitle(c.objectName as string)
  const a = rA.title
  const b = rB.title
  const entA = findEntity(a)
  const entB = findEntity(b)

  async function fetchSide(name: string) {
    const inflowsRaw = await engine.query({ subject: "edges", filters: { to: name, type: "monetary" }, limit: 2000 })
    const outflows = await engine.query({ subject: "edges", filters: { from: name, type: "monetary" }, limit: 2000 })
    const affOut = await engine.query({ subject: "edges", filters: { from: name, type: "affiliation" }, limit: 20 })
    const inflows = inflowsRaw.rows.filter(isSupport)
    const oppo = inflowsRaw.rows.filter(isOppose)
    const totalIn = inflows.filter((e: any) => e.amount).reduce((s: number, e: any) => s + Number(e.amount), 0)
    const totalOut = outflows.rows.filter((e: any) => e.amount).reduce((s: number, e: any) => s + Number(e.amount), 0)
    const totalAttack = oppo.filter((e: any) => e.amount).reduce((s: number, e: any) => s + Number(e.amount), 0)

    // Aggregate top donors / recipients by from/to (sum across cycles)
    const byFrom = new Map<string, number>()
    for (const e of inflows) if (e.from && e.amount) byFrom.set(e.from, (byFrom.get(e.from) || 0) + Number(e.amount))
    const byTo = new Map<string, number>()
    for (const e of outflows.rows) if (e.to && e.amount) byTo.set(e.to, (byTo.get(e.to) || 0) + Number(e.amount))

    const topDonors = [...byFrom.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([nm, amt]) => ({ name: nm, amount: amt }))
    const topRecipients = [...byTo.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([nm, amt]) => ({ name: nm, amount: amt }))

    const boards = (affOut.rows || []).slice(0, 5).map((e: any) => ({ to: e.to, role: e.role || (Array.isArray(e.titles) ? e.titles[0] : undefined) }))

    return {
      name,
      totalIn,
      totalOut,
      totalAttack,
      donorCount: byFrom.size,
      recipientCount: byTo.size,
      topDonors,
      topRecipients,
      boards,
    }
  }

  const [dataA, dataB] = await Promise.all([fetchSide(a), fetchSide(b)])

  // Build the side-by-side rows. Each row is { metric, a, b } keyed for
  // the UI's comparison table renderer.
  const metricOf = (d: typeof dataA) => ({
    total_received: fmtUsd(d.totalIn),
    donor_count: `${d.donorCount} donors`,
    total_distributed: fmtUsd(d.totalOut),
    recipient_count: `${d.recipientCount} recipients`,
    attack_spend: d.totalAttack > 0 ? fmtUsd(d.totalAttack) : "—",
    top_donor: d.topDonors[0] ? `${d.topDonors[0].name} (${fmtUsd(d.topDonors[0].amount)})` : "—",
    top_recipient: d.topRecipients[0] ? `${d.topRecipients[0].name} (${fmtUsd(d.topRecipients[0].amount)})` : "—",
  })
  const ma = metricOf(dataA)
  const mb = metricOf(dataB)

  // Per-row explainer: when a number looks surprising (0 donors, $0
  // received, etc.) we annotate with WHY so the reader isn't left
  // scratching their head. This directly fixes the "Marble Freedom
  // Trust: 0 donors, $995M distributed" confusion.
  function rowNote(metric: string, valueA: string, valueB: string, entA: any, entB: any): string | undefined {
    const isDark = (ent: any) => {
      const s = String(ent?.signals?.sector || "").toLowerCase()
      return s.includes("dark money") || String(ent?.entity_type || "") === "nonprofit" && s.includes("501")
    }
    const zeroishA = valueA === "$0" || valueA === "0 donors" || valueA === "0 recipients" || valueA === "—"
    const zeroishB = valueB === "$0" || valueB === "0 donors" || valueB === "0 recipients" || valueB === "—"

    if (metric === "Donor count" && (zeroishA || zeroishB)) {
      const which = zeroishA && zeroishB ? `Both ${a} and ${b}` : zeroishA ? a : b
      const isDarkZero = zeroishA ? isDark(entA) : isDark(entB)
      if (isDarkZero) {
        return `${which} shows 0 donors because it's a **dark-money entity** — 501(c)(4) nonprofits are NOT legally required to disclose their donors. The $0 "total received" (and blank top donor) means the same thing: we have no records of inflows because the law doesn't require those records to exist publicly. This is the entire POINT of dark money: the public can see the money leave (grants + spending) but not where it came from.`
      }
      return `${which} shows 0 donors in our data. This could mean: (a) the entity's funding is pre-2016 and predates our itemized-contribution coverage, (b) donations came through a conduit we haven't traced yet, or (c) the entity is funded by a single private source we don't have an edge for.`
    }

    if (metric === "Total received" && (zeroishA || zeroishB)) {
      const which = zeroishA && zeroishB ? `Both ${a} and ${b}` : zeroishA ? a : b
      const isDarkZero = zeroishA ? isDark(entA) : isDark(entB)
      if (isDarkZero) {
        return `${which}'s "$0 received" is not what it looks like. Dark-money 501(c)(4) nonprofits don't have to report donors or total receipts publicly — what you're seeing is the ABSENCE of disclosure, not the absence of money. Check the "Total distributed" row below: if that number is large, it means money definitely came in, we just can't trace the source.`
      }
    }

    if (metric === "Total distributed" && (zeroishA || zeroishB)) {
      const which = zeroishA && zeroishB ? `Both ${a} and ${b}` : zeroishA ? a : b
      return `${which} has no tracked outflows. For a DONOR or PAC this is normal if they're a recipient not a distributor. For a FOUNDATION or dark-money vehicle this may mean they're sitting on assets without granting them out this cycle.`
    }

    if (metric === "Top donor" && (zeroishA || zeroishB)) {
      const which = zeroishA ? a : b
      const isDarkZero = zeroishA ? isDark(entA) : isDark(entB)
      if (isDarkZero) {
        return `Top donor is blank for ${which} for the same reason the donor count is 0: dark-money entities don't disclose donors. The *real* top donor may be known from investigative journalism (e.g. Barre Seid gave Marble Freedom Trust $1.6B in 2021 per NYT reporting) but that doesn't show up as a structured edge in our data.`
      }
    }
    return undefined
  }

  // Determine structural type of each for framing
  function typeLabel(ent: any): string {
    if (!ent) return "unknown"
    const sector = String(ent.signals?.sector || "").toLowerCase()
    const kind = ent.entity_type || "entity"
    if (sector.includes("dark money")) return "dark-money vehicle"
    if (sector.includes("super pac")) return "super PAC"
    if (kind === "politician") return "politician"
    if (kind === "corporation") return "corporation"
    if (kind === "nonprofit") return "nonprofit"
    return String(kind)
  }
  const tA = typeLabel(entA)
  const tB = typeLabel(entB)
  const sameType = tA === tB

  // Rows for the rendered table — ordered so the most-human-interesting
  // lines come first.
  const rawRows: Array<{ metric: string; a: string; b: string }> = [
    { metric: "Type", a: tA, b: tB },
    { metric: "Sector", a: String(entA?.signals?.sector || "—"), b: String(entB?.signals?.sector || "—") },
    { metric: "Total received", a: ma.total_received, b: mb.total_received },
    { metric: "Donor count", a: ma.donor_count, b: mb.donor_count },
    { metric: "Total distributed", a: ma.total_distributed, b: mb.total_distributed },
    { metric: "Recipient count", a: ma.recipient_count, b: mb.recipient_count },
    { metric: "Attack spending (against)", a: ma.attack_spend, b: mb.attack_spend },
    { metric: "Top donor", a: ma.top_donor, b: mb.top_donor },
    { metric: "Top recipient", a: ma.top_recipient, b: mb.top_recipient },
  ]
  // Attach row-level explanatory notes for surprising zeros.
  const rows = rawRows.map((r) => {
    const note = rowNote(r.metric, r.a, r.b, entA, entB)
    return note ? { ...r, note } : r
  })

  // Plain-English framing — the most pedagogical part. Recognizes the
  // common "structural mirror" pattern (same type on opposing sides of
  // the spectrum) and frames accordingly.
  let plain_english: string
  let why_matters: string | undefined

  const aIsDark = tA === "dark-money vehicle"
  const bIsDark = tB === "dark-money vehicle"
  if (sameType && aIsDark && bIsDark) {
    plain_english = `**In plain English:** ${a} and ${b} are structural mirrors of each other. Both are dark-money vehicles — 501(c)(4) nonprofits that can accept unlimited donations and don't have to disclose donors. The numbers side-by-side show two networks operating by the same mechanics, just pointed at opposing political goals. When people say "both sides do it," THIS is what they mean — but notice that "doing it" here means "the same legal structure can launder any donor's money, regardless of which party they're backing."`
    why_matters = `The symmetry is the point. Dark-money networks on the left and right aren't mirror images by accident — they emerged in the same decade (post-*Citizens United*), use the same tax structures, employ similar consulting firms, and face the same disclosure rules (none). When a reader sees the structure identical, they stop asking "which side is dirtier" and start asking "why does this structure exist for either side."`
  } else if (sameType && (tA === "super PAC" || tB === "super PAC")) {
    plain_english = `**In plain English:** ${a} and ${b} are both super PACs. Both can raise unlimited money and spend it on political ads, but neither can coordinate directly with candidates. Look at the attack-spend numbers — super PAC wars are usually more about negative ads than positive ones, and the side with more attack firepower often dominates the airwaves even when their positive-spend is lower.`
  } else if (sameType && tA === "politician") {
    plain_english = `**In plain English:** Comparing two politicians' money profiles. The most revealing numbers are usually the top donors — they tell you which industries or donor classes each candidate has attracted, which correlates strongly with who they'll serve in office. Totals matter less than composition.`
  } else if (!sameType) {
    plain_english = `**In plain English:** ${a} (${tA}) and ${b} (${tB}) are different structural types, so this comparison highlights what each can and can't do in the campaign-finance system. Read the "Top donor" and "Top recipient" rows carefully — those are the real reveal of each organization's role.`
  } else {
    plain_english = `**In plain English:** Side-by-side structural profile for two entities of the same type. The numbers that stand out are usually where the asymmetry lives — which side has more attack spend, which has more donors, which has a single concentrated funder.`
  }

  const summary = `Compare: ${a} ↔ ${b}. ${sameType ? "Same type (" + tA + ")." : tA + " vs " + tB + "."}`
  const answer = `**${a}** vs **${b}** — ${summary}`

  const context = [explainEntity(a), explainEntity(b)]

  return {
    question,
    intent: "compare",
    resolved_title: a,
    resolved_title_2: b,
    total: rows.length,
    rows,
    answer,
    context,
    plain_english,
    why_matters,
    summary,
    // Make sure the UI knows to render this as a comparison table
    // rather than the default key/value dump. The page will branch on
    // intent === "compare" to pick the right renderer.
  }
}

async function handleLeaderboard(c: ClassifiedQuestion, question: string, _engine: any): Promise<AskResult> {
  // All leaderboard variants run off the relationships.jsonl edge store directly
  const topic = c.extra?.topic || "top_donors"
  const _mainRaw = fs.existsSync(path.join(REPO_ROOT, "data", "relationships.jsonl"))
      ? fs.readFileSync(path.join(REPO_ROOT, "data", "relationships.jsonl"), "utf-8")
      : ""
    const _derivedDir = path.join(REPO_ROOT, "data", "derived")
    const _derivedParts: string[] = []
    if (fs.existsSync(_derivedDir)) {
      for (const df of fs.readdirSync(_derivedDir).sort()) {
        if (df.endsWith(".jsonl")) _derivedParts.push(fs.readFileSync(path.join(_derivedDir, df), "utf-8"))
      }
    }
    const raw = _mainRaw + "\n" + _derivedParts.join("\n")
  // Political leaderboards default to fec-* sourced edges. IRS 990 grants
  // reflect DAF-to-nonprofit flows (Fidelity Charitable $843M → Silicon
  // Valley Community Foundation, etc.) — real data but not political
  // giving, and dominant enough to bury actual political donors when
  // mixed in. For political questions, filter them out.
  const POLITICAL_TOPICS = new Set(["top_donors", "top_superpacs", "top_pacs", "top_politicians"])
  const politicalOnly = POLITICAL_TOPICS.has(topic)
  // Default time window: last 2 full election cycles (4 years). Without
  // this, ex-politicians like Paul Ryan (retired 2019) dominate the
  // "top politicians" list on lifetime totals from edges going back to
  // 2003. If the question explicitly asks for all-time (e.g. "top
  // politicians all time" / "lifetime top donors"), the window is
  // dropped.
  const questionLower = (question || "").toLowerCase()
  const isAllTime = /\b(all[- ]time|lifetime|ever|since 200|historic)\b/.test(questionLower)
  const WINDOW_YEARS = 4
  const cutoffDate = isAllTime ? null : (() => {
    const d = new Date()
    d.setFullYear(d.getFullYear() - WINDOW_YEARS)
    return d.toISOString().slice(0, 10)
  })()
  const cutoffYear = cutoffDate ? parseInt(cutoffDate.slice(0, 4), 10) : null
  const windowLabel = cutoffDate ? ` (last ${WINDOW_YEARS} years — ${cutoffYear}+)` : " (all-time)"

  type Agg = { edges: number; total: number; support: number; oppose: number; donation: number }
  const mkAgg = (): Agg => ({ edges: 0, total: 0, support: 0, oppose: 0, donation: 0 })
  const byFrom = new Map<string, Agg>()
  const byTo = new Map<string, Agg>()
  for (const line of raw.split("\n")) {
    if (!line.trim()) continue
    try {
      const e = JSON.parse(line)
      if (e.type !== "monetary" || !e.amount) continue
      // Drop self-edges (Honeywell→Honeywell employee-aggregation artifacts,
      // Morgan Stanley GIF→itself DAF accounting, etc.) — 406 in the store
      if (e.from === e.to) continue
      // For political leaderboards, exclude IRS 990 grantmaking flows.
      if (politicalOnly && e.source === "irs-990-bulk") continue
      // Employee-contributions are pass-through aggregate signal via
      // conduits — exclude from "top donor" rankings to avoid double-
      // counting the same dollars already tallied under the corporate PAC
      if (politicalOnly && e.role === "employee-contributions") continue
      // Time window filter — drop edges outside the cutoff unless the
      // user explicitly asked for all-time. Edge dates come as either
      // ISO string in e.date or 4-digit string in e.cycle. Either is
      // acceptable for coarse year-level filtering.
      if (cutoffDate) {
        const edgeDate = typeof e.date === "string" ? e.date : null
        const edgeCycle = e.cycle != null ? parseInt(String(e.cycle), 10) : null
        const keep =
          (edgeDate && edgeDate >= cutoffDate) ||
          (edgeCycle != null && cutoffYear != null && edgeCycle >= cutoffYear)
        if (!keep) continue
      }
      const amt = Number(e.amount) || 0
      const bucket = e.role === "ie-oppose" ? "oppose" : e.role === "ie-support" ? "support" : "donation"
      const a = byFrom.get(e.from) || mkAgg()
      a.edges++; a.total += amt; a[bucket] += amt; byFrom.set(e.from, a)
      const b = byTo.get(e.to) || mkAgg()
      b.edges++; b.total += amt; b[bucket] += amt; byTo.set(e.to, b)
    } catch {}
  }

  const ents = loadEntities()
  const entByName = new Map(ents.map((e) => [e.name, e] as const))

  function typeMatch(name: string, wanted: string): boolean {
    const ent = entByName.get(name)
    if (!ent) return false
    if (wanted === "pac" || wanted === "superpac") {
      const secSuper = (ent.signals as any)?.sector?.toLowerCase?.() || ""
      return (ent.entity_type === "pac" || ent.entity_type === "donor") && (secSuper.includes("super") || secSuper.includes("pac") || wanted === "pac")
    }
    if (wanted === "politician") return ent.entity_type === "politician" || ent.entity_type === "state-politician"
    if (wanted === "daf") {
      const kind = ((ent.signals as any)?.entity_type_label || "").toString().toLowerCase()
      const sec = ((ent.signals as any)?.sector || "").toString().toLowerCase()
      return kind.includes("donor-advised") || sec.includes("wall street") || ent.name.toLowerCase().includes("charitable")
    }
    return true
  }

  let rows: Array<Record<string, unknown>> = []
  let summary = ""
  // For "donor" leaderboards, rank by positive spend (direct donation + IE
  // support). Attack spending (ie-oppose) is tracked separately as
  // attack_spend so the UI can surface it as a distinct column. Sorting by
  // raw total would elevate SLF PAC — a $500M attack operation — as a "top
  // donor," which it is not.
  const rowShape = (name: string, v: Agg) => ({
    name,
    edges: v.edges,
    total: v.total,
    positive_spend: v.donation + v.support,
    attack_spend: v.oppose,
    direct_donations: v.donation,
    ie_support: v.support,
    ie_oppose: v.oppose,
  })
  if (topic === "top_donors") {
    rows = [...byFrom.entries()]
      .map(([name, v]) => rowShape(name, v))
      .sort((a, b) => b.positive_spend - a.positive_spend)
      .slice(0, 25)
    summary = `Top 25 donors by positive spend (direct donations + IE support)${windowLabel}. Attack spend shown separately.`
  } else if (topic === "top_superpacs") {
    rows = [...byFrom.entries()]
      .filter(([name]) => typeMatch(name, "superpac"))
      .map(([name, v]) => rowShape(name, v))
      .sort((a, b) => b.total - a.total)
      .slice(0, 25)
    summary = `Top 25 super PACs by total IE + direct spend${windowLabel}. Support and attack broken out per row.`
  } else if (topic === "top_pacs") {
    rows = [...byFrom.entries()]
      .filter(([name]) => typeMatch(name, "pac"))
      .map(([name, v]) => rowShape(name, v))
      .sort((a, b) => b.total - a.total)
      .slice(0, 25)
    summary = `Top 25 PACs / political committees by total spend${windowLabel}. Support and attack broken out per row.`
  } else if (topic === "top_politicians") {
    rows = [...byTo.entries()]
      .filter(([name]) => typeMatch(name, "politician"))
      .map(([name, v]) => rowShape(name, v))
      .sort((a, b) => b.positive_spend - a.positive_spend)
      .slice(0, 25)
    summary = `Top 25 politicians by positive money received${windowLabel}. Attack spending against them tracked separately.`
  } else if (topic === "top_dafs") {
    rows = [...byFrom.entries()]
      .filter(([name]) => typeMatch(name, "daf"))
      .map(([name, v]) => rowShape(name, v))
      .sort((a, b) => b.positive_spend - a.positive_spend)
      .slice(0, 25)
    summary = `Top 25 donor-advised funds / charitable vehicles by grant dollars out${windowLabel}.`
  }

  const topName = rows[0] ? ` Top: **${rows[0].name}** at ${fmtUsd((rows[0].positive_spend as number) || (rows[0].total as number))}.` : ""
  const answer = `${summary}${topName}`

  // Visual bars: scale each row's primary spend as a proportion of
  // the #1 entity. Bar made of Unicode block chars — renders in any
  // monospace cell without needing SVG. 20-char wide bars.
  const topValue = rows.length > 0 ? ((rows[0].positive_spend as number) || (rows[0].total as number) || 1) : 1
  function bar(primary: number): string {
    const frac = Math.max(0, Math.min(1, primary / topValue))
    const width = Math.round(frac * 20)
    return "█".repeat(width) + "░".repeat(20 - width)
  }

  const bullets = rows.slice(0, 10).map((r: any) => {
    const primary = r.positive_spend || r.total
    const parts: string[] = [`${bar(primary)} **${r.name}**: ${fmtUsd(primary)}`]
    if (r.attack_spend > 0) parts.push(`${fmtUsd(r.attack_spend)} attack`)
    parts.push(`${r.edges} edge${r.edges === 1 ? "" : "s"}`)
    return parts.join(" · ")
  })

  // ─── Plain-English layer for leaderboards ──────────────────────
  // A normie sees "$2.49B RNC" and has no context. Frame the list:
  // what it means, what the visible order tells you structurally
  // (disclosed party committees at top = expected; dark-money vehicles
  // appearing high = signal).
  let plain_english: string | undefined
  let is_this_legal: string | undefined
  let why_matters: string | undefined

  if (rows.length > 0) {
    const top = rows[0]
    const topAmount = (top.positive_spend as number) || (top.total as number)
    const topAttack = (top.attack_spend as number) || 0
    const third = rows[2]
    const thirdAmount = third ? ((third.positive_spend as number) || (third.total as number)) : 0
    const totalAllRows = rows.reduce((a: number, r: any) => a + (((r.positive_spend as number) || (r.total as number)) || 0), 0)

    if (topic === "top_donors") {
      plain_english = `**In plain English:** These are the biggest political spenders we can see. "Positive spend" means money that went toward supporting candidates (direct donations plus ads supporting them). "Attack spend" is money spent on ads AGAINST candidates. The top 3 (${top.name}, ${rows[1]?.name || ""}, ${third?.name || ""}) all publicly disclose their donors — they're party committees and super PACs that have to. **The more interesting dollars are the dark-money vehicles further down the list** where the original donors are legally hidden.`
      is_this_legal = `**Yes — but that's the whole point of the list.** Everyone ranked here is operating within campaign-finance law. What the rankings reveal is *scale* — how much concentrated political money a single vehicle can mobilize in a cycle. The top entries total ${fmtUsd(totalAllRows)} of trackable political spending.`
      why_matters = `A leaderboard like this is the closest thing to a scoreboard in US politics. It shows which organizations bought the most visibility in the latest cycles. The ranking reveals structural power: party committees (RNC, DCCC) sit at the top because they aggregate donations from many sources. Individual mega-donors and dark-money pools usually appear lower but move outsized influence per dollar because they don't have to justify themselves to a base.`
    } else if (topic === "top_superpacs") {
      plain_english = `**In plain English:** Super PACs can raise unlimited money and spend it on ads supporting or attacking candidates — as long as they don't coordinate with the campaign. ${top.name} leads with ${fmtUsd(topAmount)} in total spend${topAttack > 0 ? ` (including ${fmtUsd(topAttack)} spent on attack ads)` : ""}. Unlike 501(c)(4)s, super PACs must disclose their donors, so the money here is at least traceable back to source — though the source may itself be a dark-money vehicle.`
      is_this_legal = `**Yes, and it's the legal structure that reshaped American campaigns after *Citizens United* (2010).** Before that ruling, corporations and unions couldn't spend unlimited money on elections. Super PACs are the mechanism created to spend that money in the decade since.`
      why_matters = `Super PACs are where most political ad spending happens now. They dominate negative-ad production (which is cheaper and more effective per dollar than positive ads), and they concentrate political power in the hands of whoever funds the biggest ones. When you see attack-ad wars in Senate races, this leaderboard is where the money came from.`
    } else if (topic === "top_politicians") {
      plain_english = `**In plain English:** These are the politicians receiving the most tracked political money — combining direct campaign donations and independent-expenditure support (ads run on their behalf without coordination). ${top.name} tops the list at ${fmtUsd(topAmount)}. "Attack spend" against each politician is tracked separately.`
      is_this_legal = `**Yes.** Federal candidates are legally allowed to raise unlimited amounts through their campaigns, leadership PACs, joint-fundraising committees, and aligned super PACs. What matters structurally isn't the receipt, it's who's giving and what they want.`
      why_matters = `Total raise is an imperfect proxy for political clout, but it correlates strongly with who can afford paid media, field operations, and staff. Politicians ranked highest here are the ones their donors are betting biggest on — tracking these lists cycle over cycle shows who the donor class sees as the most important players.`
    } else if (topic === "top_dafs") {
      plain_english = `**In plain English:** Donor-advised funds are the single most-used tool for making political giving disappear from the paper trail. A rich donor contributes to a DAF, gets a tax deduction, then later tells the DAF who to grant money to. The public record only shows the DAF as the giver. ${top.name} distributed ${fmtUsd(topAmount)} — but the original donors behind that money are mostly legally hidden.`
      is_this_legal = `**Yes, fully legal, and that's the structural scandal.** DAFs were created for charitable giving but have become a primary dark-money conduit. The law allows them to break donor identification between contribution and grant.`
      why_matters = `Every dollar flowing through a DAF is a dollar of political influence that can't be traced back to its source. The rise of DAFs as political vehicles over the past decade has fundamentally undermined campaign-finance disclosure as a tool for accountability.`
    } else if (topic === "top_pacs") {
      plain_english = `**In plain English:** These are the top political committees by total spend. Unlike super PACs, regular PACs have per-cycle contribution limits — they can only accept $5K per donor per year. But they can give money directly to candidates, which super PACs can't. ${top.name} tops the list at ${fmtUsd(topAmount)}.`
      is_this_legal = `**Yes.** PACs are the oldest and most regulated form of campaign-finance vehicle — they disclose donors, have contribution limits, and can give directly to candidates.`
      why_matters = `Traditional PACs are where industry and labor concentrate their political donations. Pharma PACs, defense PACs, teacher-union PACs — these lists show which sectors are mobilizing hardest in the current cycle and which candidates they're betting on.`
    }
  }

  return { question, intent: "leaderboard", total: rows.length, rows, answer, bullets, summary, plain_english, is_this_legal, why_matters }
}

async function handleMoneyChain(c: ClassifiedQuestion, question: string): Promise<AskResult> {
  const a = resolveTitle(c.subjectName as string)
  const b = resolveTitle(c.objectName as string)
  // Build adjacency from monetary edges only. Exclude IE-oppose: an
  // opposition ad-spend edge documents money spent AGAINST a politician,
  // not a transfer TO them, so treating it as a graph edge produces
  // nonsense "money chains" where cash appears to flow to a target who
  // was actually being attacked.
  const _mainRaw = fs.existsSync(path.join(REPO_ROOT, "data", "relationships.jsonl"))
      ? fs.readFileSync(path.join(REPO_ROOT, "data", "relationships.jsonl"), "utf-8")
      : ""
    const _derivedDir = path.join(REPO_ROOT, "data", "derived")
    const _derivedParts: string[] = []
    if (fs.existsSync(_derivedDir)) {
      for (const df of fs.readdirSync(_derivedDir).sort()) {
        if (df.endsWith(".jsonl")) _derivedParts.push(fs.readFileSync(path.join(_derivedDir, df), "utf-8"))
      }
    }
    const raw = _mainRaw + "\n" + _derivedParts.join("\n")
  const adj = new Map<string, Array<{ to: string; amount: number; cycle?: string; source: string; role?: string }>>()
  for (const line of raw.split("\n")) {
    if (!line.trim()) continue
    try {
      const e = JSON.parse(line)
      if (e.type !== "monetary" || !e.amount) continue
      if (e.role === "ie-oppose") continue
      if (e.from === e.to) continue  // no self-edges in BFS graph
      const arr = adj.get(e.from) || []
      arr.push({ to: e.to, amount: Number(e.amount), cycle: e.cycle, source: e.source, role: e.role })
      adj.set(e.from, arr)
    } catch {}
  }

  // Expand both endpoints to include vehicles they control — a money chain
  // from Elon Musk to Donald Trump should traverse America PAC ($147M IE
  // spend) even though Musk's direct donations are only a few hundred
  // dollars. Any vehicle whose name contains the person's full name is
  // treated as an alternate start/end node.
  const sources = [a.title, ...vehiclesFor(a.title)]
  const targets = new Set<string>([b.title, ...vehiclesFor(b.title)])

  // BFS up to 3 hops from any source to any target. Each path carries the
  // original source/target labels so the response can say "Elon Musk
  // via America PAC → Donald Trump" accurately.
  const maxDepth = 3
  const paths: Array<{ path: string[]; edges: any[]; min_amount: number; total_pass_through: number }> = []
  const queue: Array<{ node: string; path: string[]; edges: any[] }> = sources.map(s => ({ node: s, path: [s], edges: [] }))
  let examined = 0
  const budget = 20000
  while (queue.length && examined < budget) {
    const cur = queue.shift()!
    examined++
    if (targets.has(cur.node) && cur.edges.length > 0) {
      const min = Math.min(...cur.edges.map((e) => e.amount))
      const total = cur.edges.reduce((acc, e) => acc + e.amount, 0)
      paths.push({ path: cur.path, edges: cur.edges, min_amount: min, total_pass_through: total })
      continue
    }
    if (cur.path.length > maxDepth) continue
    const nexts = adj.get(cur.node) || []
    for (const next of nexts) {
      if (cur.path.includes(next.to)) continue // no cycles
      queue.push({ node: next.to, path: [...cur.path, next.to], edges: [...cur.edges, next] })
    }
  }

  paths.sort((x, y) => y.min_amount - x.min_amount)

  // Collect distinct intermediary entities seen across top-ranked paths
  // so we can explain what each node is.
  const nodesSeen = new Set<string>([a.title, b.title])
  for (const p of paths.slice(0, 5)) for (const n of p.path) nodesSeen.add(n)
  const context = [...nodesSeen].map((name) => explainEntity(name))

  let answer: string
  const bullets: string[] = []
  if (paths.length === 0) {
    answer = `No money chain from **${a.title}** to **${b.title}** within ${maxDepth} hops. They may not be connected through tracked dollar flows yet.`
  } else {
    const top = paths[0]
    const chainStr = top.path.map((p, i) => {
      if (i === 0) return p
      const e = top.edges[i - 1]
      return `→ ${fmtUsd(e.amount)} → ${p}`
    }).join(" ")
    answer = `**${a.title}** → **${b.title}**: ${paths.length} path${paths.length === 1 ? "" : "s"} found (up to ${maxDepth} hops). Strongest flow: ${chainStr}.`
    for (const p of paths.slice(0, 5)) {
      const bullet = p.path.map((n, i) => {
        if (i === 0) return n
        const e = p.edges[i - 1]
        return `→ ${fmtUsd(e.amount)} (${e.cycle || "?"}) → ${n}`
      }).join(" ")
      bullets.push(`${bullet}  [bottleneck ${fmtUsd(p.min_amount)}]`)
    }
  }

  // Humanize rows: "path" becomes a readable arrow string, "bottleneck"
  // becomes "Smallest link", "total_pass_through" becomes "Total dollars
  // through chain". Keep raw edge arrays hidden in an _edges field so
  // power users can still see them if they want.
  const humanRows = paths.slice(0, 10).map((p) => {
    const steps: string[] = []
    for (let i = 0; i < p.edges.length; i++) {
      const e: any = p.edges[i]
      steps.push(`${p.path[i]} → ${fmtUsd(e.amount)}${e.cycle ? " (" + e.cycle + ")" : ""}`)
    }
    steps.push(p.path[p.path.length - 1])
    return {
      trail: steps.join(" → "),
      smallest_link: fmtUsd(p.min_amount),
      total_through_chain: fmtUsd(p.total_pass_through),
      sources: [...new Set(p.edges.map((e: any) => citeEdge(e).label))].join("; "),
    }
  })

  // Build citation from raw paths BEFORE they're humanized
  let citation: string | undefined
  if (paths.length > 0) {
    const top = paths[0]
    const steps: string[] = []
    for (let i = 0; i < top.edges.length; i++) {
      const e: any = top.edges[i]
      steps.push(`${top.path[i]} transferred ${fmtUsd(e.amount)} to ${top.path[i + 1]}${e.cycle ? " (tax year " + e.cycle + ")" : ""}`)
    }
    const sources = [...new Set(top.edges.map((e: any) => citeEdge(e).label))].join("; ")
    citation = `According to IRS 990 filings, ${steps.join("; ")}. Source: ${sources}.`
  }

  // ─── Plain-English layer for normies ─────────────────────────────
  // The money-trail page historically led with jargon: "3 hops",
  // "bottleneck", "501(c)(4)", "DAF", "Schedule I". Readers who aren't
  // already fluent in dark-money mechanics bounced. Compute a set of
  // plain-English overlays so the page leads with story, not schema.
  const hasDAF = paths.length > 0 && context.some((c) => c.gloss.includes("donor-advised fund") || c.gloss.includes("DAF"))
  const hasDarkMoney = paths.length > 0 && context.some((c) => c.gloss.includes("dark-money") || c.gloss.includes("dark money") || c.gloss.includes("social-welfare org"))

  let plain_english: string | undefined
  let visual_flow: string | undefined
  let is_this_legal: string | undefined
  let why_matters: string | undefined
  let who_is_lead: { name: string; oneLiner: string } | undefined

  if (paths.length > 0) {
    const top = paths[0]
    const start = top.path[0]
    const end = top.path[top.path.length - 1]
    const firstAmt = top.edges[0]?.amount
    const midNode = top.path.length >= 3 ? top.path[1] : null
    const midIsDAF = midNode
      ? context.find((c) => c.name === midNode)?.gloss?.includes("donor-advised fund") || context.find((c) => c.name === midNode)?.gloss?.includes("DAF")
      : false

    // TL;DR: one-sentence translation
    if (midIsDAF) {
      plain_english = `**In plain English:** ${start} moved ${fmtUsd(firstAmt)} to ${end}, but routed it through ${midNode} first. ${midNode} is a donor-advised fund, which by law lets the original sender's identity disappear from the paper trail. So when the money arrives at ${end}, the public record shows it came from ${midNode} — not from ${start}.`
    } else if (hasDarkMoney && top.path.length >= 3) {
      plain_english = `**In plain English:** ${start} sent ${fmtUsd(firstAmt)} toward ${end} through ${top.path.length - 2} intermediary organization${top.path.length - 2 === 1 ? "" : "s"}. These intermediaries are 501(c)(4) "dark money" nonprofits, which don't have to publicly disclose where their money originally came from — so chasing the trail from ${start} to ${end} hits a legal wall at the middle step.`
    } else if (top.path.length >= 3) {
      plain_english = `**In plain English:** ${fmtUsd(firstAmt)} flowed from ${start} through ${top.path.length - 2} intermediary organization${top.path.length - 2 === 1 ? "" : "s"} before reaching ${end}. Follow the arrows below to trace the steps.`
    } else {
      plain_english = `**In plain English:** ${start} sent ${fmtUsd(firstAmt)} directly to ${end}.`
    }

    // Visual flow diagram (ASCII)
    if (top.path.length >= 2) {
      const lines: string[] = []
      const step = top.path.map((n, i) => {
        if (i === 0) return n
        return `── ${fmtUsd(top.edges[i - 1].amount)} ──▶ ${n}`
      }).join(" ")
      lines.push(step)
      if (midIsDAF && midNode) {
        const arrowCol = step.indexOf(midNode)
        if (arrowCol > 0) {
          lines.push(" ".repeat(arrowCol + Math.floor(midNode.length / 2)) + "↑")
          lines.push(" ".repeat(Math.max(0, arrowCol - 10)) + "source gets legally erased here")
        }
      }
      visual_flow = lines.join("\n")
    }

    // Is this legal?
    if (midIsDAF || hasDarkMoney) {
      is_this_legal = `**Yes, and that's the scandal.** Donor-advised funds and 501(c)(4) "social welfare" nonprofits are *designed* to break the paper trail between the original donor and the final recipient. Billionaires use this pattern routinely and it's perfectly legal. The trail breaks by design, not by crime.`
    }

    // Why should I care?
    if (midIsDAF || hasDarkMoney) {
      why_matters = `When ultra-wealthy donors can hide where political money originated, voters can't evaluate whose interests are being served. ${end} deploys these funds toward political goals — ad buys, judicial confirmation campaigns, advocacy — without the public knowing who actually wrote the first check. That's the core democratic problem with the structure revealed here.`
    }

    // "Who is X?" — prepend a friendly intro for the lead entity if
    // it's a well-known dark-money operator.
    const leadContext = context.find((c) => c.name === start)
    if (leadContext && (leadContext.gloss?.includes("dark-money") || leadContext.gloss?.includes("dark money") || leadContext.blurb?.toLowerCase().includes("leonard leo") || leadContext.blurb?.toLowerCase().includes("dark money"))) {
      who_is_lead = {
        name: start,
        oneLiner: leadContext.blurb || leadContext.gloss || "",
      }
    }
  }

  const result: AskResult = {
    question,
    intent: "money_chain",
    label: "Money trail",
    resolved_title: a.title,
    resolved_title_2: b.title,
    total: paths.length,
    rows: humanRows,
    answer,
    bullets,
    context,
    caveats: hasDAF
      ? ["A donor-advised fund (DAF) sits in the middle of this chain. DAFs let the ultimate donor stay anonymous — the public record shows the DAF as the giver, not the person who originally wrote the check."]
      : [],
    plain_english,
    visual_flow,
    is_this_legal,
    why_matters,
    who_is_lead,
    summary: paths.length === 0 ? `0 paths within ${maxDepth} hops` : `${paths.length} path(s) examined (${examined} nodes visited).`,
  }
  result.interpretation = interpret(result)
  result.follow_ups = suggestFollowUps(result)
  result.citation = citation
  return result
}

// ─── LLM fallback (optional, requires ANTHROPIC_API_KEY) ─────────────

async function llmClassify(question: string): Promise<ClassifiedQuestion | null> {
  const key = process.env.ANTHROPIC_API_KEY
  if (!key) return null
  const intents = [
    "donors_to: who funds X",
    "recipients_from: where does X's money go",
    "edge_between: X → Y edge lookup",
    "summary: profile snapshot of X",
    "affiliations_from: what boards is X on",
    "affiliations_to: who's on the board of X",
    "grants_from: biggest grants from X",
    "voting_record: X's voting record",
    "cross_party_donors: donors to both parties",
    "leaderboard: top donors / top PACs / top politicians / top DAFs",
    "money_chain: multi-hop path from X to Y",
  ]
  const prompt = `You're a question classifier for a political donor-map database. Map the user's question to ONE intent + entity names. Respond ONLY in JSON of the shape {"intent":"...","subjectName":"...","objectName":"...","year":"..."}.
Available intents:
${intents.join("\n")}

Question: ${question}`
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5",
        max_tokens: 150,
        messages: [{ role: "user", content: prompt }],
      }),
    })
    if (!res.ok) return null
    const j = await res.json()
    const text: string = j?.content?.[0]?.text || ""
    const m = text.match(/\{[\s\S]*\}/)
    if (!m) return null
    const parsed = JSON.parse(m[0])
    return {
      intent: parsed.intent as Intent,
      subjectName: parsed.subjectName,
      objectName: parsed.objectName,
      extra: parsed.year ? { year: parsed.year } : undefined,
    }
  } catch {
    return null
  }
}

// ─── Main handler ────────────────────────────────────────────────────

function finalize(res: AskResult): AskResult {
  if (!res.interpretation) res.interpretation = interpret(res)
  if (!res.follow_ups) res.follow_ups = suggestFollowUps(res)
  if (!res.citation) res.citation = buildCitation(res)

  // Fuzzy-match transparency: when the entity resolver had to fall back
  // to did-you-mean candidates AND the resolved_title doesn't trivially
  // appear in the raw question, prepend an explicit disambiguation note
  // to the answer. Prevents the "John Smith → Jason Smith (silently)"
  // class of bug where we look up the wrong person without telling the
  // user.
  if (
    res.did_you_mean && res.did_you_mean.length >= 2 && res.resolved_title &&
    res.answer && !res.answer.startsWith("**Showing results for")
  ) {
    const qLower = String(res.question || "").toLowerCase()
    const titleLower = String(res.resolved_title).toLowerCase()
    // Heuristic: if the full resolved title isn't a substring of the
    // question, the match is fuzzy and worth flagging.
    const isFuzzy = !qLower.includes(titleLower)
    if (isFuzzy) {
      const others = res.did_you_mean.filter((n) => n !== res.resolved_title).slice(0, 4)
      const list = others.length > 0 ? ` (or: ${others.join(", ")})` : ""
      res.answer = `**Showing results for "${res.resolved_title}"**${list}. ` + res.answer
    }
  }

  // Humanize intent labels for display
  const labels: Record<string, string> = {
    cross_party_donors: "Cross-party donors",
    voting_record: "Voting record",
    affiliations_from: "Board seats held",
    affiliations_to: "People on this board",
    grants_from: "Grants out",
    donors_to: "Who funds them",
    recipients_from: "Where their money goes",
    edge_between: "Connection",
    summary: "Profile snapshot",
    leaderboard: "Leaderboard",
    money_chain: "Money trail",
    compare: "Side-by-side comparison",
    generic: "General lookup",
  }
  if (!res.label) res.label = labels[res.intent] || res.intent

  // API-side empty-result rescue — when a query came back with zero
  // rows AND there's no narrative answer, figure out WHY it failed
  // and explain it specifically rather than leaving the UI to show
  // a generic "nothing matched" block.
  if ((!res.rows || res.rows.length === 0) && !res.answer && !res.plain_english) {
    const subj = res.resolved_title
    const obj = res.resolved_title_2
    // Entity-resolution failure: user named a subject that didn't
    // resolve to anything. candidates field carries close matches.
    if (!subj && res.intent !== "generic" && res.intent !== "leaderboard") {
      res.empty_reason = "entity_not_found"
      res.plain_english = `**Couldn't find an entity matching your question.** This usually means the name isn't in the search index yet, or it's spelled differently than how we have it stored. Try a different phrasing or a nearby entity you know exists.`
    } else if (res.intent === "voting_record" && subj) {
      res.empty_reason = "no_voting_record"
      res.plain_english = `**No voting record found for ${subj}.** Voting records are only tracked for federal politicians (US House and Senate). If ${subj} is a state legislator, ex-official, or non-politician, this query type doesn't apply.`
    } else if (res.intent === "affiliations_from" && subj) {
      res.empty_reason = "no_board_seats"
      res.plain_english = `**No board or director seats tracked for ${subj}.** This is usually because the entity is an organization rather than a person, or because IRS 990 officer data hasn't yet linked a person's name to board positions they hold.`
    } else if (res.intent === "affiliations_to" && subj) {
      res.empty_reason = "no_board_members"
      res.plain_english = `**No board members tracked for ${subj}.** The IRS 990 officer-registry pass hasn't surfaced named people on this board yet. Try querying the entity's profile directly for an officer list.`
    } else if (res.intent === "grants_from" && subj) {
      res.empty_reason = "no_grants"
      res.plain_english = `**No grants tracked from ${subj}.** This tool reads grants from IRS 990 Schedule I filings, which only public charities and private foundations file. If ${subj} is a 501(c)(4), super PAC, or for-profit, grants aren't reported publicly.`
    } else if (res.intent === "donors_to" && subj) {
      res.empty_reason = "no_donors"
      res.plain_english = `**No donors tracked to ${subj}.** This could mean: ${subj} is a dark-money 501(c)(4) whose donors are legally hidden; ${subj} is new and hasn't filed yet; or ${subj} receives money only through intermediary vehicles we haven't connected to them yet.`
    } else if (res.intent === "recipients_from" && subj) {
      res.empty_reason = "no_recipients"
      res.plain_english = `**No outflows tracked from ${subj}.** Either ${subj} is primarily on the receiving side of political money, or its outflows run through vehicles whose names don't clearly tie back to ${subj}. Try "tell me about ${subj}" for a broader view.`
    } else if (res.intent === "edge_between" && subj && obj) {
      res.empty_reason = "no_direct_edge"
      res.plain_english = `**No direct monetary edge between ${subj} and ${obj}.** They may still be connected indirectly — try "money chain from ${subj} to ${obj}" to look for paths through intermediary organizations.`
    } else if (res.intent === "money_chain" && subj && obj) {
      res.empty_reason = "no_path"
      res.plain_english = `**No money path found between ${subj} and ${obj} within 3 hops.** They may genuinely not be connected through tracked dollar flows, or the path runs through entities we haven't ingested yet. Try broader queries: "tell me about ${subj}" then "tell me about ${obj}" to see each side's known flows.`
    } else {
      res.empty_reason = "no_match"
      res.plain_english = `**This query pattern didn't return any results.** Try rephrasing using one of the shapes shown in the "How to use this" panel, or pick a follow-up question that's known to work.`
    }
  }

  return res
}

async function handleQuestion(question: string): Promise<AskResult> {
  let c = classify(question)
  const engine = await createQueryEngine()

  // If pattern-match fell into the generic bucket, try LLM fallback
  if (c.intent === "generic" && process.env.ANTHROPIC_API_KEY) {
    const llm = await llmClassify(question)
    if (llm && llm.intent && llm.intent !== "generic") {
      c = llm
    }
  }

  if (c.intent === "explain_concept") {
    const concept = String(c.subjectName || "")
    const key = conceptKey(concept)
    const entry = CONCEPTS[key]
    if (!entry) {
      return finalize({ question, intent: "explain_concept", total: 0, rows: [], note: `No canned explanation for "${concept}". Try a specific entity lookup instead.` })
    }
    const followUps = entry.followUps || []
    const summary = entry.explanation + (entry.in_our_data ? `\n\n**In this database:** ${entry.in_our_data}` : "")
    return finalize({
      question, intent: "explain_concept",
      resolved_title: concept,
      total: 1,
      rows: [],
      summary,
      follow_ups: followUps,
    } as AskResult)
  }
  if (c.intent === "cross_party_donors") {
    const r = await engine.query({ subject: "cross_party_donors", filters: { days: 365 }, limit: 25 })
    return finalize({ question, intent: c.intent, total: r.total || r.rows.length, rows: r.rows, summary: `${r.total || r.rows.length} donors giving to BOTH major parties within the last 365 days.` })
  }
  if (c.intent === "voting_record") {
    const name = resolveTitle(c.subjectName as string)
    const prof = findPoliticianProfile(name.title)
    // Three empty states, distinguished so the user gets useful feedback:
    //   1. No profile at all → probably a misspelling or someone we haven't
    //      written up; offer did-you-mean candidates.
    //   2. Profile exists, no bioguide-id → never served in Congress
    //      (Biden cabinet, governors who didn't come from Congress, etc.).
    //      Voting records are structurally N/A — say so explicitly.
    //   3. Profile + bioguide, but 0 positions → bioguide is real but their
    //      tenure falls outside our 115th–119th Congress window. Tell the
    //      user when they served instead of "cast 0 votes".
    if (!prof.profileTitle) {
      return finalize({ question, intent: c.intent, resolved_title: name.title, did_you_mean: name.candidates.slice(0, 5), total: 0, rows: [], note: `No profile found for "${name.title}". ${name.candidates.length ? "Did you mean one of: " + name.candidates.slice(0, 5).join(", ") + "?" : ""}`.trim() })
    }
    if (!prof.bioguide) {
      return finalize({ question, intent: c.intent, resolved_title: prof.profileTitle, total: 0, rows: [], note: `${prof.profileTitle} isn't a federal legislator in our records — voting records apply only to members of Congress. (Cabinet secretaries, governors, and other appointed/elected officials outside Congress don't cast roll-call votes.)` })
    }
    return finalize(showVotingRecord(prof.bioguide, prof.profileTitle, question))
  }

  // Phase 2 intents — policy-dimension queries backed by the three
  // new query-engine subjects.
  if (c.intent === "bills_sponsored_by") {
    const name = resolveTitle(c.subjectName as string)
    const bio = findBioguide(name.title)
    if (!bio) return finalize({ question, intent: c.intent, resolved_title: name.title, did_you_mean: name.candidates.slice(0, 5), total: 0, rows: [], note: `No bioguide-id found for "${name.title}".` })
    const r = await engine.query({ subject: "bills", filters: { sponsor_bioguide: bio, limit: 50 } })
    const enacted = (r.rows as Array<Record<string, unknown>>).filter((b) => b.became_law).length
    const summary = `${name.title} sponsored ${r.total} bills${enacted > 0 ? ` (${enacted} enacted into law)` : ''} across the 108th–119th Congress.`
    return finalize({ question, intent: c.intent, resolved_title: name.title, total: r.total, rows: r.rows, summary })
  }

  if (c.intent === "bills_in_policy") {
    const topic = (c.extra as any)?.topic as string | undefined
    if (!topic) return finalize({ question, intent: c.intent, total: 0, rows: [], note: "No policy topic parsed." })
    // Map short topic keywords to full policyArea names used in bills.jsonl.
    const POLICY_MAP: Record<string, string> = {
      health: "Health",
      energy: "Energy",
      taxation: "Taxation",
      defense: "Armed Forces and National Security",
      environment: "Environmental Protection",
      environmental: "Environmental Protection",
      agriculture: "Agriculture and Food",
      agricultural: "Agriculture and Food",
      labor: "Labor and Employment",
      transportation: "Transportation and Public Works",
      housing: "Housing and Community Development",
      immigration: "Immigration",
      finance: "Finance and Financial Sector",
      banking: "Finance and Financial Sector",
      crypto: "Finance and Financial Sector",
      tech: "Science, Technology, Communications",
      technology: "Science, Technology, Communications",
    }
    const policy = POLICY_MAP[topic.toLowerCase()] || topic
    const r = await engine.query({ subject: "bills", filters: { policy_area: policy, limit: 100 } })
    return finalize({ question, intent: c.intent, total: r.total, rows: r.rows, summary: `${r.total} bills introduced in policy area "${policy}" (108th–119th Congress).` })
  }

  if (c.intent === "executive_orders_by") {
    const subj = (c.subjectName as string || "").trim()
    // Map common forms: "trump" / "Donald Trump" / "DJT" → "Trump" etc.
    const PRES_MAP: Record<string, string> = {
      trump: "Trump", "donald trump": "Trump", djt: "Trump",
      biden: "Biden", "joe biden": "Biden",
      obama: "Obama", "barack obama": "Obama",
      "g.w. bush": "G.W. Bush", "george w bush": "G.W. Bush", "george w. bush": "G.W. Bush", "w bush": "G.W. Bush",
      clinton: "Clinton", "bill clinton": "Clinton",
    }
    const pres = PRES_MAP[subj.toLowerCase()] || subj
    const year = (c.extra as any)?.year
    const filters: Record<string, unknown> = { president: pres, limit: 100 }
    if (year) filters.year = year
    const r = await engine.query({ subject: "executive_actions", filters })
    const rows = r.rows as Array<Record<string, unknown>>
    const byType: Record<string, number> = {}
    for (const row of rows) { const t = String(row.type || "other"); byType[t] = (byType[t] || 0) + 1 }
    const breakdown = Object.entries(byType).map(([t, n]) => `${n} ${t}`).join(", ")
    return finalize({ question, intent: c.intent, resolved_title: pres, total: r.total, rows: r.rows, summary: `${pres}: ${r.total} presidential actions${year ? ` in ${year}` : ''} (${breakdown}).` })
  }

  if (c.intent === "offshore_for") {
    const name = resolveTitle(c.subjectName as string)
    const r = await engine.query({ subject: "offshore_entities", filters: { linked_vault_entity: name.title, limit: 100 } })
    const rows = r.rows as Array<Record<string, unknown>>
    if (r.total === 0) {
      return finalize({ question, intent: c.intent, resolved_title: name.title, total: 0, rows: [], note: `${name.title} does not appear in the ICIJ Offshore Leaks Database records we track. (That's either because they're genuinely not in the leaks, OR because the name-matching heuristic didn't catch a variant spelling.)` })
    }
    const leaks = new Set<string>()
    const jurisdictions = new Set<string>()
    for (const row of rows) {
      if (row.sourceID) leaks.add(String(row.sourceID))
      if (row.jurisdiction) jurisdictions.add(String(row.jurisdiction))
    }
    const summary = `${name.title} appears in ${r.total} ICIJ Offshore Leaks records across ${leaks.size} leak source${leaks.size === 1 ? '' : 's'} (${[...leaks].slice(0, 4).join(', ')})${jurisdictions.size > 0 ? `; top jurisdictions: ${[...jurisdictions].slice(0, 4).join(', ')}` : ''}. Appearing in these files does not imply wrongdoing.`
    return finalize({ question, intent: c.intent, resolved_title: name.title, total: r.total, rows: r.rows, summary })
  }

  // Phase 2b: Vote detail — "roll call s325-118.2" or raw id
  if (c.intent === "vote_detail") {
    const voteId = String(c.subjectName || "").trim()
    const v = await engine.query({ subject: "votes", filters: { vote_id: voteId, limit: 1 } })
    if (v.total === 0) return finalize({ question, intent: c.intent, total: 0, rows: [], note: `No vote found with ID ${voteId}. Format: h{N}-{cong}.{sess} (House) or s{N}-{cong}.{sess} (Senate).` })
    const p = await engine.query({ subject: "positions", filters: { vote_id: voteId, limit: 2000 } })
    const positions = p.rows as Array<Record<string, unknown>>
    const tally: Record<string, number> = {}
    const byParty: Record<string, Record<string, number>> = {}
    for (const pos of positions) {
      const k = String(pos.position || "")
      tally[k] = (tally[k] || 0) + 1
      const party = String(pos.party || "?")
      byParty[party] = byParty[party] || {}
      byParty[party][k] = (byParty[party][k] || 0) + 1
    }
    const voteMeta = v.rows[0] as Record<string, unknown>
    const tallyStr = Object.entries(tally).map(([k, n]) => `${n} ${k}`).join(", ")
    const summary = `${voteId} (${voteMeta.chamber}, ${voteMeta.date?.toString().slice(0, 10) || 'undated'}): ${voteMeta.result || 'result unknown'}. ${positions.length} positions cast: ${tallyStr}.`
    return finalize({ question, intent: c.intent, resolved_title: voteId, total: positions.length, rows: [voteMeta, { by_party: byParty }, ...positions.slice(0, 50)], summary })
  }

  // Phase 2b: Votes on a specific bill
  if (c.intent === "votes_on_bill") {
    const billRef = String(c.subjectName || "").toUpperCase()
    // Parse e.g. "HR1" → type=HR, number=1. Accept "HR.1", "HJRES24", "S870".
    const m = billRef.match(/^(HR|S|HJRES|SJRES|HCONRES|SCONRES|HRES|SRES)\.?(\d+)$/)
    if (!m) return finalize({ question, intent: c.intent, total: 0, rows: [], note: `Couldn't parse bill reference "${billRef}". Try formats like "H.R. 1", "S. 870", "H.J.Res. 24".` })
    const billType = m[1]
    const billNumber = Number(m[2])
    const filters: Record<string, unknown> = { bill_type: billType, bill_number: billNumber, limit: 50 }
    const r = await engine.query({ subject: "votes", filters })
    const rows = r.rows as Array<Record<string, unknown>>
    if (r.total === 0) return finalize({ question, intent: c.intent, total: 0, rows: [], note: `No roll calls found on ${billType} ${billNumber}. (Not every bill gets a roll-call vote — many pass by voice vote or die in committee.)` })
    const latest = rows.sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")))[0]
    const summary = `${r.total} roll-call vote${r.total === 1 ? '' : 's'} on ${billType} ${billNumber}. Latest: ${latest.vote_id} on ${latest.date?.toString().slice(0, 10)} — ${latest.result}.`
    return finalize({ question, intent: c.intent, resolved_title: `${billType} ${billNumber}`, total: r.total, rows: r.rows, summary })
  }

  // Phase 2b: Positions by legislator filtered by vote type
  if (c.intent === "positions_by") {
    const name = resolveTitle(c.subjectName as string)
    const bio = findBioguide(name.title)
    if (!bio) return finalize({ question, intent: c.intent, resolved_title: name.title, did_you_mean: name.candidates.slice(0, 5), total: 0, rows: [], note: `No bioguide-id for "${name.title}".` })
    const posFilter = (c.extra as any)?.topic as string | undefined
    const filters: Record<string, unknown> = { bioguide: bio, limit: 200 }
    if (posFilter === "Nay") filters.position = ["Nay", "No"]
    else if (posFilter === "Yea") filters.position = ["Yea", "Aye", "Yes"]
    const r = await engine.query({ subject: "positions", filters })
    const summary = `${name.title} cast ${r.total} ${posFilter || "tracked"} position${r.total === 1 ? '' : 's'} across the 115th-119th Congress.`
    return finalize({ question, intent: c.intent, resolved_title: name.title, total: r.total, rows: r.rows, summary })
  }

  if (c.intent === "leaderboard") return finalize(await handleLeaderboard(c, question, engine))
  if (c.intent === "money_chain") return finalize(await handleMoneyChain(c, question))
  if (c.intent === "edge_between") return finalize(await handleEdgeBetween(c, question, engine))
  if (c.intent === "summary") return finalize(await handleSummary(c, question, engine))
  if (c.intent === "compare") return finalize(await handleCompare(c, question, engine))

  if (c.intent === "affiliations_from" || c.intent === "affiliations_to") {
    const name = resolveTitle(c.subjectName as string)
    const side = c.intent === "affiliations_from" ? "from" : "to"
    const r = await engine.query({ subject: "edges", filters: { [side]: name.title, type: "affiliation" }, limit: 50 })

    // Fall back to the officer-registry (data/officer-registry.jsonl,
    // 3,060 rows built from IRS 990 Part VII) when edge coverage is thin.
    // Only 24 officer→org affiliation EDGES exist today because exact
    // name-matching with vault person profiles is very strict. The
    // officer registry has the full raw officer data — querying it
    // directly unlocks "who's on the board of Marble Freedom Trust"
    // answers even when no vault-side person entity exists.
    const registryRows = lookupOfficerRegistry(name.title, c.intent)
    const combinedRows: any[] = [...(r.rows || []), ...registryRows]
    const totalCount = r.total + registryRows.length

    const bullets: string[] = []
    if (c.intent === "affiliations_to") {
      // Sort by compensation desc (named leaders first), then by role
      const sorted = [...combinedRows].sort((a: any, b: any) => {
        const ca = Number(a.compensation ?? a.compensation_total ?? 0)
        const cb = Number(b.compensation ?? b.compensation_total ?? 0)
        return cb - ca
      }).slice(0, 15)
      for (const e of sorted) {
        const who = e.from || e.officer_name || "unknown"
        const role = e.role || (Array.isArray(e.titles) ? e.titles[0] : "") || "officer"
        const years = Array.isArray(e.years) && e.years.length
          ? ` (${e.years[0]}–${e.years[e.years.length - 1]})`
          : e.date_range ? ` (${e.date_range.slice(0, 4)})` : ""
        const comp = Number(e.compensation ?? e.compensation_total ?? 0)
        const compStr = comp > 0 ? ` · ${fmtUsd(comp)} comp` : ""
        bullets.push(`${who} — ${role}${years}${compStr}`)
      }
    } else {
      // affiliations_from: boards this person sits on
      const sorted = [...combinedRows].slice(0, 15)
      for (const e of sorted) {
        const org = e.to || e.filer_name || e.vault_org_name || "unknown"
        const role = e.role || (Array.isArray(e.titles) ? e.titles[0] : "") || "officer"
        const years = Array.isArray(e.years) && e.years.length
          ? ` (${e.years[0]}–${e.years[e.years.length - 1]})`
          : ""
        bullets.push(`${org} — ${role}${years}`)
      }
    }

    return finalize({
      question,
      intent: c.intent,
      resolved_title: name.title,
      did_you_mean: name.candidates.slice(0, 5),
      total: totalCount,
      rows: combinedRows.slice(0, 50),
      answer:
        c.intent === "affiliations_from"
          ? `**${name.title}** sits on **${totalCount}** board${totalCount === 1 ? "" : "s"} (per IRS 990 officer filings + vault affiliation edges).`
          : `**${totalCount}** officer${totalCount === 1 ? "" : "s"} recorded on **${name.title}**'s board (per IRS 990 officer filings + vault affiliation edges).`,
      bullets,
      summary:
        c.intent === "affiliations_from"
          ? `${r.total} vault-tracked affiliation edge${r.total === 1 ? "" : "s"} + ${registryRows.length} officer-registry hit${registryRows.length === 1 ? "" : "s"}.`
          : `${r.total} vault-tracked officer${r.total === 1 ? "" : "s"} + ${registryRows.length} additional 990 officer${registryRows.length === 1 ? "" : "s"}.`,
    })
  }
  if (c.intent === "grants_from") {
    const name = resolveTitle(c.subjectName as string)
    // Pool grants from the named entity AND any foundation / DAF whose
    // name contains theirs — "biggest grants from Leonard Leo" should find
    // Marble Freedom Trust + 85 Fund + Concord Fund flows, not just grants
    // literally emitted by a "Leonard Leo" entity record.
    const vehicles = vehiclesFor(name.title)
    const allRows: any[] = []
    const baseFilters: Record<string, unknown> = { type: "monetary", source: "irs-990-bulk" }
    if (c.extra?.year) baseFilters.cycle = c.extra.year
    const mainR = await engine.query({ subject: "edges", filters: { ...baseFilters, from: name.title }, limit: 1500 })
    allRows.push(...mainR.rows)
    for (const v of vehicles.slice(0, 8)) {
      const vr = await engine.query({ subject: "edges", filters: { ...baseFilters, from: v }, limit: 1500 })
      for (const row of vr.rows) allRows.push({ ...row, _via: v })
    }
    const rows = allRows.sort((a: any, b: any) => (b.amount || 0) - (a.amount || 0)).slice(0, 50)
    const total$ = rows.reduce((acc: number, e: any) => acc + (Number(e.amount) || 0), 0)
    return finalize({
      question,
      intent: c.intent,
      resolved_title: name.title,
      did_you_mean: name.candidates.slice(0, 5),
      total: allRows.length,
      rows,
      summary: `${name.title}${c.extra?.year ? " (" + c.extra.year + ")" : ""}: ${allRows.length} grants${vehicles.length ? " (pooled with " + vehicles.length + " controlled foundations)" : ""} totaling ~${fmtUsd(total$)} across top 50.`,
    })
  }
  if (c.intent === "donors_to") {
    const name = resolveTitle(c.subjectName as string)
    // Vehicles controlled by the target — a question like "who funds
    // Donald Trump" should pool donors to Trump Victory, Save America PAC,
    // MAGA Inc, etc., not just edges where target === literal "Donald
    // Trump." Otherwise we miss the vast majority of the actual money.
    const vehicles = vehiclesFor(name.title)
    const poolSet = new Set([name.title, ...vehicles])
    const allEdges: any[] = []
    const mainRes = await engine.query({ subject: "edges", filters: { to: name.title, type: "monetary" }, limit: 2000 })
    allEdges.push(...mainRes.rows)
    for (const v of vehicles.slice(0, 8)) {
      const vr = await engine.query({ subject: "edges", filters: { to: v, type: "monetary" }, limit: 1500 })
      for (const row of vr.rows) allEdges.push({ ...row, _via: v })
    }
    // Drop self-ref edges. Do NOT drop intra-pool transfers — when
    // Future Forward USA Action (c4) → FF PAC (super PAC) → Harris,
    // the c4-side donor data is undisclosed, so dropping the intra-
    // pool flow erases hundreds of millions we can actually count.
    // Accept ~10% JFC-loop overcounting for Trump/JFC-heavy candidates
    // as a documented tradeoff — total reads as "gross flow through
    // the candidate's ecosystem" rather than "unique external donor
    // dollars," which matches OpenSecrets reporting conventions.
    const filtered = allEdges.filter((e: any) => e.from !== e.to)
    const r = { total: filtered.length, rows: filtered }
    // Split IE-support vs IE-oppose: super-PAC ads "opposing" X are not
    // donors TO X. Uses the shared role taxonomy so vendor payments and
    // employee aggregates don't leak into the supporter count.
    const supporters = r.rows.filter(isSupport)
    const opposers = r.rows.filter(isOppose)
    const rows = [...supporters].sort((a: any, b: any) => (b.amount || 0) - (a.amount || 0)).slice(0, 50)
    const total$ = rows.filter((e: any) => e.amount).reduce((acc: number, e: any) => acc + (Number(e.amount) || 0), 0)
    const oppose$ = opposers.filter((e: any) => e.amount).reduce((acc: number, e: any) => acc + (Number(e.amount) || 0), 0)
    const top5 = rows.filter((e: any) => e.amount).slice(0, 5)

    const opposeNote = opposers.length > 0
      ? ` (Plus ${fmtUsd(oppose$)} spent AGAINST them by ${opposers.length} super-PAC opposition edge${opposers.length === 1 ? "" : "s"} — excluded from the totals above.)`
      : ""

    // Tally by vehicle so we can explain "$X direct + $Y via Trump Victory + ..."
    const viaTotals: Record<string, number> = {}
    let directTotal = 0
    for (const e of supporters) {
      if (!e.amount) continue
      const via = (e as any)._via
      if (via) viaTotals[via] = (viaTotals[via] || 0) + Number(e.amount)
      else directTotal += Number(e.amount)
    }
    const viaParts = Object.entries(viaTotals)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)
      .map(([v, amt]) => `${fmtUsd(amt)} via **${v}**`)
    const viaBreakdown = viaParts.length > 0
      ? ` Breakdown: ${fmtUsd(directTotal)} direct; ${viaParts.join("; ")}.`
      : ""

    // Empty-state copy branches on entity type. A DAF shouldn't read
    // "0 donor edges without dollar amounts" — that suggests a broken
    // query. For DAFs and 501(c)(4) dark-money vehicles, explicitly
    // explain that donor disclosure is legally shielded.
    //
    // Detection uses entity-store signals when available, but falls
    // back to name patterns so profiles that haven't been ingested
    // into entities.jsonl still get the right framing (Fidelity
    // Charitable, Schwab Charitable, etc. don't appear in the entity
    // store but are unambiguously DAFs by name).
    const ent = findEntity(name.title) as any
    const entType = ent?.entity_type as string | undefined
    const entSector = ent?.signals?.sector as string | undefined
    const entCapital = ent?.capital_type as string | undefined
    const nameLower = name.title.toLowerCase()
    const DAF_NAME_PATTERNS = [
      /\bcharitable\s+(fund|gift|trust)\b/,          // Fidelity Charitable Gift Fund, Schwab Charitable Fund
      /\b(fidelity|schwab|vanguard)\s+charitable\b/, // shorter aliases for the big three
      /\bdonor[\s-]?advised\b/,
      /\bnational philanthropic trust\b/,
      /\bcommunity foundation\b/,
    ]
    const isDAF = entSector === "DAF" || entCapital === "daf" ||
      DAF_NAME_PATTERNS.some((rx) => rx.test(nameLower))
    const isDarkMoney = !isDAF && (entSector === "Dark Money" || entCapital === "dark-money-vehicle")

    let emptyNote: string
    if (isDAF) {
      emptyNote = `**${name.title}** is a donor-advised fund. DAFs are legally permitted to shield the identity of their original donors — the IRS Form 990 lists grants OUT of the fund, but grants IN arrive without donor identification. That's by design, not missing data.${opposeNote}`
    } else if (isDarkMoney) {
      emptyNote = `**${name.title}** is a 501(c)(4) dark-money vehicle. By law it isn't required to publicly disclose its donors, so we can't show a tracked inflow list. What we can show: where its money goes (grants out), which is the other half of the story.${opposeNote}`
    } else if (entType && entType !== "politician") {
      emptyNote = `**${name.title}** has no tracked donor inflows in the vault yet. This is an organization, not a politician — donor data may only appear here once someone gives it IRS 990 grants, PAC contributions, or recorded lobbying transfers.${opposeNote}`
    } else {
      emptyNote = `**${name.title}** has ${supporters.length} donor edges in the store without dollar amounts. If this is a politician, see [G1 ingest status] — individual contribution edges are being re-bridged to politician profiles.${opposeNote}`
    }

    // Dual-layer display for politicians. FEC itemizes only donors
    // giving ≥$200, and our indiv ingest aggregates at ≥$10K/cycle — so
    // small-dollar specialists (AOC, Bernie) show vanishingly little
    // itemized detail while actually raising tens of millions. When
    // we have a politician's candidate-summary totals, surface those
    // so users understand the headline vs itemized gap.
    const isPolitician = entType === "politician" || entType === "state-politician"
    const fecLifetime = ent?.signals?.fec_receipts_lifetime as number | undefined
    const fecIndiv = ent?.signals?.fec_indiv_contrib_lifetime as number | undefined
    const summaryLayer = isPolitician && (fecLifetime || fecIndiv)
      ? ` *(FEC candidate-summary total across all cycles: ${fecLifetime ? fmtUsd(fecLifetime) : "—"}${fecIndiv ? `; individual contributions ${fmtUsd(fecIndiv)}` : ""}. The figure above shows only donor-level edges in the graph; small-dollar donors below the $10K aggregation floor are reflected in the summary total but not listed individually.)*`
      : ""

    const answer =
      total$ > 0
        ? `**${name.title}** received **${fmtUsd(total$)}** in tracked support edges from **${supporters.length}** donors/committees${vehicles.length > 0 ? ` (pooled across ${vehicles.length + 1} entities including controlled vehicles)` : ""}.${viaBreakdown}${opposeNote}${summaryLayer}`
        : emptyNote
    const bullets = top5.map((e: any) => {
      const via = e._via ? ` → ${e._via}` : ""
      return `${e.from}${via}: ${fmtUsd(e.amount)}${e.cycle ? ` (${e.cycle})` : ""}${e.source ? ` [${citeEdge(e).label}]` : ""}`
    })
    return finalize({
      question,
      intent: c.intent,
      resolved_title: name.title,
      did_you_mean: name.candidates.slice(0, 5),
      total: r.total,
      rows,
      answer,
      bullets,
      summary: `${supporters.length} support edges (pooled across ${name.title}${vehicles.length ? " + " + vehicles.length + " controlled vehicles" : ""}), ${opposers.length} opposition edges. Support ~${fmtUsd(total$)}, opposition ~${fmtUsd(oppose$)}.`,
    })
  }
  if (c.intent === "recipients_from") {
    const name = resolveTitle(c.subjectName as string)
    const ent = findEntity(name.title)
    const isPolitician = ent?.entity_type === "politician" || ent?.entity_type === "state-politician"
    // Pool outflows from the entity AND from vehicles they control —
    // "where does Elon Musk's money go" should include America PAC's $147M
    // IE spend, not just Musk's own $2K in direct donations.
    const vehicles = vehiclesFor(name.title)
    const poolSet = new Set([name.title, ...vehicles])
    const allEdges: any[] = []
    const mainRes = await engine.query({ subject: "edges", filters: { from: name.title, type: "monetary" }, limit: 2000 })
    allEdges.push(...mainRes.rows)
    for (const v of vehicles.slice(0, 8)) {
      const vr = await engine.query({ subject: "edges", filters: { from: v, type: "monetary" }, limit: 1500 })
      for (const row of vr.rows) allEdges.push({ ...row, _via: v })
    }
    // Drop self-edges. Filter out operating-expense vendor payments
    // from the total — Koch Industries' $681K headline was 99%
    // vendor payments (INTRUST BANK, etc.), which misrepresents
    // "where their money goes" as political spending. Shared role
    // taxonomy from Pattern A does the separation; ops expenses are
    // still retained in the rows array so the EVIDENCE table shows
    // them with clear role labels, but they no longer inflate the
    // headline total$.
    const filtered = allEdges.filter((e: any) => e.from !== e.to)
    const r = { total: filtered.length, rows: filtered }
    const politicalRows = filtered.filter((e: any) => isPolitical(e))
    const rows = [...politicalRows].sort((a: any, b: any) => (b.amount || 0) - (a.amount || 0)).slice(0, 50)
    const total$ = politicalRows.filter((e: any) => e.amount).reduce((acc: number, e: any) => acc + (Number(e.amount) || 0), 0)
    const opsTotal = filtered.filter((e: any) => e.role === "operating-expense" && e.amount)
      .reduce((acc: number, e: any) => acc + (Number(e.amount) || 0), 0)

    // Politicians don't "give" money in our monetary-edge model — they
    // receive it. Redirect the user rather than silently returning 0.
    if (isPolitician && total$ === 0) {
      return finalize({
        question,
        intent: c.intent,
        resolved_title: name.title,
        did_you_mean: name.candidates.slice(0, 5),
        total: 0,
        rows: [],
        answer: `**${name.title}** is a politician, not a grant-making organization. Politicians don't "give" money in this database — they receive it from donors and spend it through their campaign committee.`,
        note: `Use "who funds ${name.title}" or "tell me about ${name.title}" for what you probably want. Campaign-committee expenditures (FEC oppexp data) are tracked separately and not yet exposed via the ask UI.`,
        follow_ups: [
          `who funds ${name.title}`,
          `tell me about ${name.title}`,
          `${name.title} voting record`,
        ],
        summary: `Politician outflows are not in this view.`,
      })
    }

    const top5 = rows.filter((e: any) => e.amount).slice(0, 5)
    // Split ie-oppose vs ie-support vs direct: a super-PAC's top "recipient"
    // is often a politician they spent AGAINST, not one they funded. Uses
    // the shared role taxonomy — vendor payments and employee aggregates
    // are excluded from both sides.
    const supportEdges = rows.filter((e: any) => isSupport(e) && e.amount)
    const opposeEdges = rows.filter((e: any) => isOppose(e) && e.amount)
    const supportTotal = supportEdges.reduce((a: number, e: any) => a + Number(e.amount), 0)
    const opposeTotal = opposeEdges.reduce((a: number, e: any) => a + Number(e.amount), 0)
    // Ops-expense context: if there's significant non-political spend,
    // surface it explicitly so the user knows why the headline isn't
    // their whole wallet. Koch Industries had $100M+ in vendor payments
    // that previously inflated "money goes" totals by 100x.
    const opsNote = opsTotal > total$
      ? ` (Plus ${fmtUsd(opsTotal)} in vendor / operating expenses — law firms, printers, travel, etc. — excluded from the political total.)`
      : ""
    const answer =
      total$ > 0
        ? (opposeTotal > 0
            ? `**${name.title}** moved **${fmtUsd(total$)}** in political spending across **${politicalRows.length}** edges: **${fmtUsd(supportTotal)}** in donations / IE support, plus **${fmtUsd(opposeTotal)}** in attack (IE-oppose) spending against ${opposeEdges.length} politician${opposeEdges.length === 1 ? "" : "s"}.${opsNote}`
            : `**${name.title}** moved **${fmtUsd(total$)}** in political spending across **${politicalRows.length}** recipient edges.${opsNote}`)
        : opsTotal > 0
          ? `**${name.title}** has ${opsTotal ? fmtUsd(opsTotal) : ""} in vendor / operating expenses (law firms, printers, travel, etc.) but no political spending edges in the store.`
          : `**${name.title}** has ${r.total} outgoing edges but no dollar amounts attached.`
    const bullets = top5.map((e: any) => {
      const arrow = e.role === "ie-oppose" ? "AGAINST" : "→"
      const via = e._via ? ` (via ${e._via})` : ""
      return `${arrow} ${e.to}${via}: ${fmtUsd(e.amount)}${e.cycle ? ` (${e.cycle})` : ""}${e.source ? ` [${citeEdge(e).label}]` : ""}`
    })
    // Vehicle breakdown so the user sees "$147M via America PAC" etc.
    const viaTotals: Record<string, { support: number; oppose: number; donation: number }> = {}
    let directSupport = 0, directOppose = 0
    for (const e of rows) {
      if (!e.amount) continue
      const via = (e as any)._via
      const amt = Number(e.amount)
      const bucket: "support" | "oppose" | "donation" = e.role === "ie-oppose" ? "oppose" : e.role === "ie-support" ? "support" : "donation"
      if (via) {
        viaTotals[via] = viaTotals[via] || { support: 0, oppose: 0, donation: 0 }
        viaTotals[via][bucket] += amt
      } else if (bucket === "oppose") directOppose += amt
      else directSupport += amt
    }
    const viaSummary = Object.entries(viaTotals).length > 0
      ? ` Vehicle breakdown: ${Object.entries(viaTotals).sort((a, b) => (b[1].support + b[1].oppose + b[1].donation) - (a[1].support + a[1].oppose + a[1].donation)).slice(0, 4).map(([v, t]) => {
          const parts: string[] = []
          if (t.support + t.donation > 0) parts.push(`${fmtUsd(t.support + t.donation)} support`)
          if (t.oppose > 0) parts.push(`${fmtUsd(t.oppose)} attack`)
          return `**${v}** (${parts.join(", ")})`
        }).join("; ")}.`
      : ""
    const enrichedAnswer = answer + viaSummary
    return finalize({ question, intent: c.intent, resolved_title: name.title, did_you_mean: name.candidates.slice(0, 5), total: r.total, rows, answer: enrichedAnswer, bullets, summary: `${name.title} outflows (${vehicles.length ? "incl. " + vehicles.length + " controlled vehicles" : "direct only"}): ${supportEdges.length} support / ${opposeEdges.length} oppose edges, ~${fmtUsd(supportTotal)} support · ~${fmtUsd(opposeTotal)} attack.` })
  }

  // Generic fallback. If the raw query resolved to a known vault
  // entity with real inflow/outflow edges, escalate the intent to
  // summary rather than telling the user to "try a more specific
  // pattern". Bare entity names like "AOC", "Kamala Harris", "MFT"
  // should all render a profile snapshot by default.
  const r = resolveTitle(c.subjectName as string)
  const knownEntity = !!findEntity(r.title)
  const out = await engine.query({ subject: "edges", filters: { from: r.title }, limit: 25 })
  const inc = await engine.query({ subject: "edges", filters: { to: r.title }, limit: 25 })
  if (knownEntity && (out.total > 0 || inc.total > 0)) {
    // Fall through to the summary handler with the resolved name.
    return finalize(await handleSummary({ intent: "summary", subjectName: r.title }, question, engine))
  }
  return finalize({
    question,
    intent: "generic",
    resolved_title: r.title,
    did_you_mean: r.candidates.slice(0, 5),
    total: out.total + inc.total,
    rows: [...(out.rows || []).map((x: any) => ({ dir: "out", ...x })), ...(inc.rows || []).map((x: any) => ({ dir: "in", ...x }))],
    summary: `Generic lookup on "${r.title}": ${out.total} outgoing + ${inc.total} incoming edges. Try a more specific pattern or tell me about ${r.title}.`,
  })
}

// ─── Route ───────────────────────────────────────────────────────────

// CORS for local dev cross-origin calls from the public Quartz site
// (localhost:8080) to this ops API (localhost:3333). Allowlist-based
// so in production we won't accidentally open the ops API to the
// public web. Extend DEV_CORS_ORIGINS once the public Ask backend is
// hosted elsewhere and you want to deliberately enable origins.
const DEV_CORS_ORIGINS = new Set([
  "http://localhost:8080",
  "http://localhost:8081",
  "http://localhost:3000",
  "http://127.0.0.1:8080",
])

function corsHeadersFor(req: NextRequest): Record<string, string> {
  const origin = req.headers.get("origin") || ""
  if (!DEV_CORS_ORIGINS.has(origin)) return {}
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "content-type",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin",
  }
}

// Preflight handler for cross-origin fetch from the public Quartz Ask
// page in local dev. Without this, browsers block the POST from
// localhost:8080 to localhost:3333 before it even reaches the auth gate.
export async function OPTIONS(req: NextRequest) {
  const headers = corsHeadersFor(req)
  return new NextResponse(null, { status: 204, headers })
}

export async function POST(req: NextRequest) {
  const cors = corsHeadersFor(req)
  const gate = await requireTier(req, "free-auth")
  if (!gate.ok) {
    // Wrap the auth error with CORS headers so the browser can read it.
    const r = gate.response!
    for (const [k, v] of Object.entries(cors)) r.headers.set(k, v)
    return r
  }
  const minute = checkPerMinuteLimit(gate.user, "/api/ask")
  if (!minute.allowed) {
    return NextResponse.json(
      { error: "rate limit (per-minute)", retry_after_seconds: minute.retry_after_seconds, limit: minute.limit },
      { status: 429, headers: { "Retry-After": String(minute.retry_after_seconds || 60) } },
    )
  }
  const daily = checkDailyLimit(gate.user, "/api/ask")
  if (!daily.allowed) {
    return NextResponse.json(
      { error: "rate limit (daily)", retry_after_seconds: daily.retry_after_seconds, limit: daily.limit },
      { status: 429 },
    )
  }

  let body: { question?: string }
  try { body = await req.json() } catch { return NextResponse.json({ error: "invalid json body" }, { status: 400 }) }
  const question = (body.question || "").trim()
  if (!question) return NextResponse.json({ error: "question required" }, { status: 400 })
  if (question.length > 400) return NextResponse.json({ error: "question too long (max 400 chars)" }, { status: 400 })

  // In-memory answer cache. /api/ask runs a full store-load + intent
  // classifier + synthesis on every call; identical repeat questions
  // (e.g. follow-up chips that echo an earlier question) should not
  // re-walk 75K edges. TTL is short (5 min) because the edge store is
  // mutable — a classify-ie-edges run or ingest should invalidate.
  // Bust the cache whenever underlying data changes on disk. Without
  // this, cached answers + in-memory store caches serve stale results
  // for up to 5 min after an ingest / classifier / reclassification
  // run. Check the mtime of relationships.jsonl, entities.jsonl, and
  // officer-registry.jsonl against the last-seen mtime; if any is
  // newer, invalidate all caches. Cheap stat() per request.
  try {
    let maxMtime = 0
    for (const rel of ["data/relationships.jsonl", "data/entities.jsonl", "data/officer-registry.jsonl"]) {
      try {
        const stat = fs.statSync(path.join(REPO_ROOT, rel))
        if (stat.mtimeMs > maxMtime) maxMtime = stat.mtimeMs
      } catch {}
    }
    // Also watch every file in data/derived/ — FEC + IRS ingest targets
    // after the 2026-04 canonical/derived split.
    try {
      const derivedDir = path.join(REPO_ROOT, "data", "derived")
      if (fs.existsSync(derivedDir)) {
        for (const df of fs.readdirSync(derivedDir)) {
          if (!df.endsWith(".jsonl")) continue
          try {
            const stat = fs.statSync(path.join(derivedDir, df))
            if (stat.mtimeMs > maxMtime) maxMtime = stat.mtimeMs
          } catch {}
        }
      }
    } catch {}
    if (maxMtime > ASK_CACHE_LAST_DATA_MTIME) {
      ASK_CACHE.clear()
      entitiesCache = null
      officerRegistryCache = null
      ASK_CACHE_LAST_DATA_MTIME = maxMtime
      // Also flush the query-engine's underlying store caches. These
      // live in scripts/lib/*-store.cjs at module scope — survive
      // across createQueryEngine() calls — so without an explicit
      // clear, the engine keeps serving edges from the last disk read.
      // Without this, the UI kept reporting Trump at $228M even after
      // the indiv-aggregation ingest landed 83K new edges on disk.
      try {
        const engine = await createQueryEngine()
        if (engine && typeof engine.clear === "function") engine.clear()
      } catch {}
    }
  } catch {}

  const cacheKey = question.toLowerCase().replace(/\s+/g, " ").trim()
  const cached = ASK_CACHE.get(cacheKey)
  if (cached && Date.now() - cached.at < ASK_CACHE_TTL_MS) {
    return NextResponse.json({ ...cached.result, _cache: "hit" }, { headers: cors })
  }

  try {
    const result = await handleQuestion(question)
    ASK_CACHE.set(cacheKey, { at: Date.now(), result })
    if (ASK_CACHE.size > ASK_CACHE_MAX) {
      // Drop oldest ~25% to keep bounded
      const keys = [...ASK_CACHE.keys()].slice(0, Math.floor(ASK_CACHE_MAX / 4))
      for (const k of keys) ASK_CACHE.delete(k)
    }
    return NextResponse.json(result, { headers: cors })
  } catch (err) {
    return NextResponse.json({ error: String(err instanceof Error ? err.message : err) }, { status: 500, headers: cors })
  }
}

// Module-level cache (per Next.js route instance). Survives until the
// Next dev server restarts or the serverless instance cycles.
const ASK_CACHE_TTL_MS = 5 * 60 * 1000
const ASK_CACHE_MAX = 500
const ASK_CACHE = new Map<string, { at: number; result: any }>()
let ASK_CACHE_LAST_DATA_MTIME = 0
