/**
 * query-engine.cjs — Phase 2 Query Engine MVP core library
 *
 * In-memory adapter over the canonical JSONL stores (relationships,
 * entities, events, sources). Composes filters with class-analysis
 * awareness for the /query public page and /api/query endpoint.
 *
 * Per phase-2/decisions.md §Phase 2 launch decision #2: in-memory v1,
 * adapter pattern lets Phase 6 swap to SQLite without touching consumers.
 *
 * Public API:
 *   createQueryEngine()           → engine instance
 *     .query(spec)                → QueryResult
 *     .count(spec)                → number
 *     .describe(spec)             → human-readable explanation
 *     .topOppositionDonors(opts)  → cross-policy enemy list aggregate
 *     .clear()                    → drop all caches (for testing)
 *
 * QuerySpec shape:
 *   {
 *     subject: "edges" | "entities" | "events",
 *     filters: {
 *       // common
 *       limit, offset,
 *       // edges (relationships.jsonl)
 *       from, to, from_type, to_type, type, min_confidence,
 *       min_amount, max_amount, source, status, role, exclude_role,
 *       // entities (entities.jsonl)
 *       entity_type, capital_type, class_position,
 *       ideological_function, worker_relationship,
 *       tags_approved,
 *       // events (events.jsonl)
 *       event_type, obstruction_type, policy_id, chamber,
 *       outcome, since, until, sector_affected,
 *       // cross-store
 *       timing_proximity_days,   // edges × events same day-window
 *       class_cross_party,       // donors funding both parties on same issue
 *     }
 *   }
 */

/**
 * EDGE_TIER_PRESETS — Named filter presets for the three visibility tiers.
 * Components and API endpoints use these instead of hardcoding thresholds.
 *
 * Usage:
 *   const { EDGE_TIER_PRESETS } = require('./query-engine.cjs')
 *   engine.query({ subject: 'edges', filters: { ...EDGE_TIER_PRESETS.public, from: 'AIPAC' } })
 *
 * | Tier     | Who sees it     | Edge types                          | Confidence floor |
 * |----------|-----------------|-------------------------------------|------------------|
 * | public   | Everyone        | monetary + government-contract      | 0.85             |
 * | paid     | Subscribers     | monetary + contract + opposition    | 0.7              |
 * | internal | Ops + Claude    | everything                          | 0.0              |
 */
const EDGE_TIER_PRESETS = {
  public: {
    min_confidence: 0.85,
    _allowed_types: ['monetary', 'government-contract'],
  },
  paid: {
    min_confidence: 0.7,
    _allowed_types: ['monetary', 'government-contract', 'political-opposition'],
  },
  internal: {
    min_confidence: 0,
    _allowed_types: null, // all types
  },
}

const edgesStore = require("./relationships-store.cjs")
const entitiesStore = require("./entities-store.cjs")
const eventsStore = require("./events-store.cjs")
const sourcesStore = require("./sources-store.cjs")
const txnTypes = require("./fec-txn-types.cjs")
const { createCanonicalNameResolver } = require("./canonical-name-resolver.cjs")
const fs = require("fs")
const path = require("path")

// ─── Lightweight stores for bills / executive_actions / offshore_entities
// These are single-file JSONL stores written by ingest pipelines. Loaded
// lazily + cached. Separate from the full edge/entity stores because the
// records are their own subjects, not graph edges.

const ROOT_DIR = path.resolve(__dirname, "..", "..")
const BILLS_FILE = path.join(ROOT_DIR, "data", "bills.jsonl")
const EA_FILE = path.join(ROOT_DIR, "data", "executive-actions.jsonl")
const OFFSHORE_FILE = path.join(ROOT_DIR, "data", "offshore-entities.jsonl")
const VOTES_FILE = path.join(ROOT_DIR, "data", "votes.jsonl")
const POSITIONS_FILE = path.join(ROOT_DIR, "data", "legislator-positions.jsonl")
const POSITIONS_DIR = path.join(ROOT_DIR, "data", "legislator-positions")

let _billsCache = null
let _eaCache = null
let _offshoreCache = null
let _votesCache = null
let _positionsCache = null

function loadJsonlChunked(filePath) {
  // Chunked reader for files that may exceed V8 string cap (~500MB).
  if (!fs.existsSync(filePath)) return []
  const out = []
  const fd = fs.openSync(filePath, "r")
  try {
    const CHUNK = 64 * 1024 * 1024
    const size = fs.fstatSync(fd).size
    let off = 0, carry = ""
    while (off < size) {
      const len = Math.min(CHUNK, size - off)
      const buf = Buffer.alloc(len)
      fs.readSync(fd, buf, 0, len, off)
      off += len
      const chunk = carry + buf.toString("utf-8")
      const lines = chunk.split(/\r?\n/)
      carry = lines.pop()
      for (const l of lines) {
        if (!l.trim()) continue
        try { out.push(JSON.parse(l)) } catch {}
      }
    }
    if (carry.trim()) { try { out.push(JSON.parse(carry.trim())) } catch {} }
  } finally { fs.closeSync(fd) }
  return out
}

function loadBills() { if (!_billsCache) _billsCache = loadJsonlChunked(BILLS_FILE); return _billsCache }
function loadExecActions() { if (!_eaCache) _eaCache = loadJsonlChunked(EA_FILE); return _eaCache }
function loadOffshoreEntities() { if (!_offshoreCache) _offshoreCache = loadJsonlChunked(OFFSHORE_FILE); return _offshoreCache }
function loadVotes() { if (!_votesCache) _votesCache = loadJsonlChunked(VOTES_FILE); return _votesCache }
function loadPositions() {
  if (_positionsCache) return _positionsCache
  // 2.5M+ positions; spread operator on an array this large blows the
  // call stack. Iterate and push.
  const out = []
  function ingest(rows) { for (const r of rows) out.push(r) }
  if (fs.existsSync(POSITIONS_FILE) && fs.statSync(POSITIONS_FILE).size > 0) {
    ingest(loadJsonlChunked(POSITIONS_FILE))
  } else if (fs.existsSync(POSITIONS_DIR)) {
    for (const f of fs.readdirSync(POSITIONS_DIR).filter((n) => n.endsWith(".jsonl")).sort()) {
      ingest(loadJsonlChunked(path.join(POSITIONS_DIR, f)))
    }
  }
  _positionsCache = out
  return _positionsCache
}

// ─── Adapter: in-memory implementation ────────────────────────────────

function createInMemoryEngine() {
  // Lazy-load all stores on first use, cache in closure
  let _loaded = false
  // ADR-0024: canonical-name resolver for alias unification in
  // aggregators (topOppositionDonors, crossPartyDonors). Lazy.
  let _canonicalResolver = null
  function getCanonicalResolver() {
    if (!_canonicalResolver) _canonicalResolver = createCanonicalNameResolver()
    return _canonicalResolver
  }
  function canonical(name) {
    return getCanonicalResolver().resolve(name)
  }

  function ensureLoaded() {
    if (_loaded) return
    edgesStore.loadEdges()
    entitiesStore.loadEntities()
    eventsStore.loadEvents()
    sourcesStore.loadSources()
    _loaded = true
  }

  function clearAll() {
    edgesStore.clearEdgesCache()
    entitiesStore.clearEntitiesCache()
    eventsStore.clearEventsCache()
    sourcesStore.clearSourcesCache()
    if (_canonicalResolver) _canonicalResolver.clear()
    _canonicalResolver = null
    _billsCache = null
    _eaCache = null
    _offshoreCache = null
    _votesCache = null
    _positionsCache = null
    _loaded = false
  }

  // ─── Filter dispatchers per subject ─────────────────────────────

  function filterEdges(filters = {}) {
    ensureLoaded()
    const all = edgesStore.loadEdges()

    // Apply tier preset if specified (merges preset filters with explicit ones)
    let resolved = { ...filters }
    if (filters.tier && EDGE_TIER_PRESETS[filters.tier]) {
      const preset = EDGE_TIER_PRESETS[filters.tier]
      resolved = { ...preset, ...filters }
    }

    const minConf = typeof resolved.min_confidence === "number" ? resolved.min_confidence : 0
    const allowedTypes = resolved._allowed_types || null // null = all types

    return all.filter((e) => {
      // Status: default "active" unless "all" requested
      if (resolved.status !== "all") {
        const wantStatus = resolved.status || "active"
        if (e.status !== wantStatus) return false
      }
      if (resolved.from && e.from !== resolved.from) return false
      if (resolved.to && e.to !== resolved.to) return false
      if (resolved.from_type && e.from_type !== resolved.from_type) return false
      if (resolved.to_type && e.to_type !== resolved.to_type) return false
      // Single type filter (existing behavior)
      if (resolved.type && e.type !== resolved.type) return false
      // Multi-type filter via tier preset
      if (allowedTypes && !allowedTypes.includes(e.type)) return false
      if (typeof e.confidence === "number" && e.confidence < minConf) return false
      if (typeof resolved.min_amount === "number") {
        if (typeof e.amount !== "number" || e.amount < resolved.min_amount) return false
      }
      if (typeof resolved.max_amount === "number") {
        if (typeof e.amount !== "number" || e.amount > resolved.max_amount) return false
      }
      if (resolved.source && e.source !== resolved.source) return false
      // Cycle filter (e.g., "2024" or "FY2024")
      if (resolved.cycle && e.cycle !== resolved.cycle) return false
      // Role filter: accepts string or array. "null" matches role === null/undefined.
      if (resolved.role !== undefined && resolved.role !== null && resolved.role !== "") {
        const want = Array.isArray(resolved.role) ? resolved.role : [resolved.role]
        const edgeRole = e.role == null ? "null" : e.role
        if (!want.includes(edgeRole)) return false
      }
      // Exclude role: accepts string or array. Common use: exclude_role='ie-oppose'
      // to hide opposition-spending from "top donors" rankings.
      if (resolved.exclude_role !== undefined && resolved.exclude_role !== null && resolved.exclude_role !== "") {
        const reject = Array.isArray(resolved.exclude_role) ? resolved.exclude_role : [resolved.exclude_role]
        const edgeRole = e.role == null ? "null" : e.role
        if (reject.includes(edgeRole)) return false
      }
      return true
    })
  }

  function filterEntities(filters = {}) {
    ensureLoaded()
    const all = entitiesStore.loadEntities()
    return all.filter((r) => {
      if (filters.entity_type && r.entity_type !== filters.entity_type) return false
      if (filters.capital_type && r.capital_type !== filters.capital_type) return false
      if (filters.class_position && r.class_position !== filters.class_position) return false
      if (
        filters.worker_relationship &&
        r.worker_relationship !== filters.worker_relationship
      )
        return false
      if (filters.tags_approved !== undefined && r.tags_approved !== filters.tags_approved)
        return false
      if (filters.ideological_function) {
        const want = Array.isArray(filters.ideological_function)
          ? filters.ideological_function
          : [filters.ideological_function]
        for (const f of want) {
          if (!r.ideological_function.includes(f)) return false
        }
      }
      if (filters.serves_capital_type) {
        const want = Array.isArray(filters.serves_capital_type)
          ? filters.serves_capital_type
          : [filters.serves_capital_type]
        for (const ct of want) {
          if (!r.serves_capital_type.includes(ct)) return false
        }
      }
      if (filters.search) {
        const q = filters.search.toLowerCase()
        if (!r.name.toLowerCase().includes(q)) return false
      }
      return true
    })
  }

  function filterEvents(filters = {}) {
    ensureLoaded()
    return eventsStore.queryEvents({
      type: filters.event_type,
      obstruction_type: filters.obstruction_type,
      policy_id: filters.policy_id,
      chamber: filters.chamber,
      outcome: filters.outcome,
      stakeholder: filters.stakeholder,
      sector_affected: filters.sector_affected,
      since: filters.since,
      until: filters.until,
    })
  }

  // ─── Bill / Executive Action / Offshore Entity filters ──────────────
  // Lightweight subjects backed by single-file JSONL stores.

  function filterBills(filters = {}) {
    const all = loadBills()
    return all.filter((b) => {
      if (filters.congress !== undefined && Number(b.congress) !== Number(filters.congress)) return false
      if (filters.type && b.type !== filters.type) return false
      if (filters.policy_area && b.policy_area !== filters.policy_area) return false
      if (filters.became_law !== undefined && Boolean(b.became_law) !== Boolean(filters.became_law)) return false
      if (filters.sponsor_bioguide) {
        const want = Array.isArray(filters.sponsor_bioguide) ? filters.sponsor_bioguide : [filters.sponsor_bioguide]
        const hit = (b.sponsor_bioguides || []).some((bg) => want.includes(bg))
        if (!hit) return false
      }
      if (filters.cosponsor_bioguide) {
        // cosponsor_bioguides isn't stored per-bill (we only kept count + sponsor bioguides).
        // Cosponsor queries should use edges subject (type=sponsorship, role=cosponsor).
        // Fail-safe: treat as no-match since the data's not here.
        return false
      }
      if (filters.subject) {
        const want = Array.isArray(filters.subject) ? filters.subject : [filters.subject]
        const hit = (b.subjects || []).some((s) => want.some((w) => String(s).toLowerCase().includes(String(w).toLowerCase())))
        if (!hit) return false
      }
      if (filters.since) {
        if (!b.introduced_date || b.introduced_date < filters.since) return false
      }
      if (filters.until) {
        if (!b.introduced_date || b.introduced_date > filters.until) return false
      }
      if (filters.search) {
        const q = String(filters.search).toLowerCase()
        if (!(b.title || "").toLowerCase().includes(q)) return false
      }
      return true
    })
  }

  function filterExecutiveActions(filters = {}) {
    const all = loadExecActions()
    return all.filter((ea) => {
      if (filters.president) {
        const want = Array.isArray(filters.president) ? filters.president : [filters.president]
        if (!want.some((p) => String(ea.president || "").toLowerCase() === String(p).toLowerCase())) return false
      }
      if (filters.type) {
        const want = Array.isArray(filters.type) ? filters.type : [filters.type]
        if (!want.includes(ea.type)) return false
      }
      if (filters.since) {
        if (!ea.date || ea.date < filters.since) return false
      }
      if (filters.until) {
        if (!ea.date || ea.date > filters.until) return false
      }
      if (filters.year !== undefined) {
        if (!ea.date || ea.date.slice(0, 4) !== String(filters.year)) return false
      }
      if (filters.search) {
        const q = String(filters.search).toLowerCase()
        if (!(ea.title || "").toLowerCase().includes(q) && !(ea.text_excerpt || "").toLowerCase().includes(q)) return false
      }
      return true
    })
  }

  function filterVotes(filters = {}) {
    const all = loadVotes()
    return all.filter((v) => {
      if (filters.congress !== undefined && Number(v.congress) !== Number(filters.congress)) return false
      if (filters.chamber && v.chamber !== filters.chamber) return false
      if (filters.session !== undefined && Number(v.session) !== Number(filters.session)) return false
      if (filters.vote_id && v.vote_id !== filters.vote_id) return false
      if (filters.rc_number !== undefined && Number(v.rc_number) !== Number(filters.rc_number)) return false
      if (filters.bill_type && v.bill?.type !== filters.bill_type) return false
      if (filters.bill_number !== undefined && Number(v.bill?.number) !== Number(filters.bill_number)) return false
      if (filters.result) {
        const want = Array.isArray(filters.result) ? filters.result : [filters.result]
        if (!want.some((r) => String(v.result || "").toLowerCase().includes(String(r).toLowerCase()))) return false
      }
      if (filters.since && (!v.date || v.date < filters.since)) return false
      if (filters.until && (!v.date || v.date > filters.until)) return false
      if (filters.search) {
        const q = String(filters.search).toLowerCase()
        if (!(v.question || "").toLowerCase().includes(q)) return false
      }
      return true
    })
  }

  function filterPositions(filters = {}) {
    const all = loadPositions()
    return all.filter((p) => {
      if (filters.vote_id && p.vote_id !== filters.vote_id) return false
      if (filters.bioguide) {
        const want = Array.isArray(filters.bioguide) ? filters.bioguide : [filters.bioguide]
        if (!want.includes(p.bioguide)) return false
      }
      if (filters.position) {
        const want = Array.isArray(filters.position) ? filters.position : [filters.position]
        if (!want.includes(p.position)) return false
      }
      if (filters.party) {
        const want = Array.isArray(filters.party) ? filters.party : [filters.party]
        if (!want.includes(p.party)) return false
      }
      if (filters.congress !== undefined) {
        const m = String(p.vote_id || "").match(/-(\d+)\./)
        if (!m || Number(m[1]) !== Number(filters.congress)) return false
      }
      if (filters.chamber) {
        const c = String(p.vote_id || "").charAt(0)
        const want = filters.chamber === "house" ? "h" : filters.chamber === "senate" ? "s" : null
        if (want && c !== want) return false
      }
      return true
    })
  }

  function filterOffshoreEntities(filters = {}) {
    const all = loadOffshoreEntities()
    return all.filter((o) => {
      if (filters.jurisdiction) {
        const want = Array.isArray(filters.jurisdiction) ? filters.jurisdiction : [filters.jurisdiction]
        if (!want.some((j) => String(o.jurisdiction || "").toLowerCase().includes(String(j).toLowerCase()))) return false
      }
      if (filters.leak) {
        const want = Array.isArray(filters.leak) ? filters.leak : [filters.leak]
        if (!want.some((l) => String(o.sourceID || "").toLowerCase().includes(String(l).toLowerCase()))) return false
      }
      if (filters.linked_vault_entity) {
        const want = Array.isArray(filters.linked_vault_entity) ? filters.linked_vault_entity : [filters.linked_vault_entity]
        const hit = (o.linked_vault_entities || []).some((v) => want.includes(v))
        if (!hit) return false
      }
      if (filters.kind && o.kind !== filters.kind) return false
      if (filters.search) {
        const q = String(filters.search).toLowerCase()
        if (!(o.name || "").toLowerCase().includes(q)) return false
      }
      return true
    })
  }

  // ─── Class-analysis composers ───────────────────────────────────

  /**
   * Cross-party donor detection. Donors who funded both major parties
   * in the last `days` days (or all time if days not set).
   */
  function crossPartyDonors({ days = null } = {}) {
    ensureLoaded()
    // Political roles only — see scripts/lib/fec-txn-types.cjs for the
    // shared taxonomy. Operating-expense + employee-contributions are
    // excluded because they're vendor payments and aggregate reporting,
    // not actual cross-party political spending.
    const all = edgesStore.loadEdges().filter((e) =>
      e.amount && txnTypes.isPolitical(e)
    )
    const byDonor = new Map()
    const cutoff = days
      ? new Date(Date.now() - days * 864e5).toISOString()
      : null

    for (const e of all) {
      if (cutoff && e.date && e.date < cutoff) continue
      // ADR-0024: bucket by canonical donor name so aliases like
      // "AIPAC" / "AIPAC PAC" / "DSCC" / "Democratic Senatorial Campaign
      // Committee" collapse onto one row.
      const donor = canonical(e.from)
      if (!byDonor.has(donor)) byDonor.set(donor, { D: 0, R: 0, total: 0 })
      const recipientParty = getPartyFor(e.to)
      // ie-oppose attribution: opposing a Republican is effectively
      // pro-Democrat spending, and vice versa. Without this flip, the
      // DSCC ($179M spent OPPOSING Republicans in IE) looked like $179M
      // OF spending to Republicans — inverting the cross-party column.
      let attributedParty = recipientParty
      if (e.role === "ie-oppose") {
        attributedParty = recipientParty === "D" ? "R" : recipientParty === "R" ? "D" : null
      }
      if (attributedParty === "D" || attributedParty === "R") {
        byDonor.get(donor)[attributedParty] += e.amount || 0
        byDonor.get(donor).total += e.amount || 0
      }
    }

    // Minimum balance to qualify as "cross-party": weaker side must be
    // at least 5% of the stronger side. Without this floor, a $1k stray
    // contribution from an otherwise-partisan committee to the other
    // party makes them look "cross-party" — DSCC with 0.00 balance,
    // NRCC with 0.00 balance, etc. 5% filters those out while keeping
    // real both-sides donors (Club for Growth 0.44, Sfa Fund 0.55,
    // United Democracy Project 0.69) prominent.
    const MIN_BALANCE = 0.05
    return [...byDonor.entries()]
      .filter(([_, c]) => c.D > 0 && c.R > 0)
      .map(([name, c]) => ({
        name,
        d_spend: c.D,
        r_spend: c.R,
        total: c.total,
        balance: Math.min(c.D, c.R) / Math.max(c.D, c.R),
      }))
      .filter((r) => r.balance >= MIN_BALANCE)
      .sort((a, b) => b.total - a.total)
  }

  // Helper: best-effort party lookup from entity record. ADR-0024:
  // also try canonical resolution so an edge with `to: "BERNARD SANDERS"`
  // (FEC bulk casing) finds Bernie Sanders's party via alias unification.
  let _partyCache = null
  function getPartyFor(politicianName) {
    if (!_partyCache) {
      _partyCache = new Map()
      const entities = entitiesStore.loadEntities()
      for (const e of entities) {
        if (e.entity_type !== "politician") continue
        const party = e.signals && e.signals.party
        if (party) {
          const normalized =
            /democrat/i.test(party) ? "D" : /republican/i.test(party) ? "R" : party
          _partyCache.set(e.name, normalized)
        }
      }
    }
    const direct = _partyCache.get(politicianName)
    if (direct) return direct
    // Fallback: resolve through canonical-name map and retry. Catches
    // FEC casing variants and committee names that unify onto a candidate.
    const c = canonical(politicianName)
    if (c && c !== politicianName) {
      const viaCanonical = _partyCache.get(c)
      if (viaCanonical) return viaCanonical
    }
    return null
  }

  /**
   * Timing proximity: donors who gave to a politician within N days
   * of a vote by that politician. Requires dated monetary edges AND
   * dated events.
   */
  function timingProximity({ days = 30, event_type = "floor_vote" } = {}) {
    ensureLoaded()
    const events = eventsStore.queryEvents({ type: event_type }).filter((e) => e.date)
    const hits = []
    const edges = edgesStore.loadEdges().filter((e) => e.type === "monetary" && e.date && e.amount)

    for (const event of events) {
      const eventDate = new Date(event.date).getTime()
      const windowStart = eventDate - days * 864e5
      const windowEnd = eventDate + days * 864e5

      for (const edge of edges) {
        // Only consider edges where the recipient is a stakeholder in the event
        if (!event.stakeholders.includes(edge.to)) continue
        const edgeDate = new Date(edge.date).getTime()
        if (edgeDate < windowStart || edgeDate > windowEnd) continue

        hits.push({
          event_id: event.id,
          event_title: event.title,
          event_date: event.date,
          politician: edge.to,
          donor: edge.from,
          amount: edge.amount,
          donation_date: edge.date,
          days_between: Math.round((eventDate - edgeDate) / 864e5),
        })
      }
    }

    return hits.sort((a, b) => Math.abs(a.days_between) - Math.abs(b.days_between))
  }

  /**
   * Top opposition donors across multiple events/sectors. The core of
   * the /who-blocks-us enemy list for Phase 2.75.
   *
   * Each aggregated row now breaks down its total by role so the caller
   * can distinguish $X in direct donations vs $Y in independent-
   * expenditure support vs $Z in opposition spending. A PAC that spends
   * $500M attacking Democrats is NOT a "top donor to Democrats" — it's
   * a top opponent.
   */
  function topOppositionDonors({ sector_affected = null, limit = 20 } = {}) {
    ensureLoaded()
    let events = eventsStore.queryEvents({})
    if (sector_affected) {
      events = events.filter((e) => (e.sector_affected || []).includes(sector_affected))
    }

    // ADR-0024: canonicalize event stakeholders so an edge whose `to`
    // is "BERNARD SANDERS" matches an event listing "Bernie Sanders" as
    // stakeholder (and vice versa).
    const politiciansInEvents = new Set()
    for (const ev of events) {
      for (const s of ev.stakeholders || []) {
        politiciansInEvents.add(canonical(s))
      }
    }

    const byDonor = new Map()
    const edges = edgesStore.loadEdges().filter((e) => e.type === "monetary")
    for (const edge of edges) {
      const recipientCanonical = canonical(edge.to)
      if (!politiciansInEvents.has(recipientCanonical)) continue
      // Bucket by canonical donor name (alias unification — AIPAC variants
      // collapse, KAMALA HARRIS FOR SENATE folds into Kamala Harris, etc.)
      const donorCanonical = canonical(edge.from)
      if (!byDonor.has(donorCanonical)) {
        byDonor.set(donorCanonical, {
          amount: 0,
          count: 0,
          politicians: new Set(),
          support_amount: 0,
          oppose_amount: 0,
          donation_amount: 0,
        })
      }
      const r = byDonor.get(donorCanonical)
      const amt = edge.amount || 0
      r.amount += amt
      r.count += 1
      r.politicians.add(recipientCanonical)
      if (edge.role === "ie-oppose") r.oppose_amount += amt
      else if (edge.role === "ie-support") r.support_amount += amt
      else r.donation_amount += amt
    }

    return [...byDonor.entries()]
      .map(([name, r]) => ({
        name,
        total_spend: r.amount,
        edge_count: r.count,
        politicians_count: r.politicians.size,
        support_amount: r.support_amount,
        oppose_amount: r.oppose_amount,
        donation_amount: r.donation_amount,
      }))
      .sort((a, b) => b.total_spend - a.total_spend)
      .slice(0, limit)
  }

  // ─── Cost limits (security hardening) ──────────────────────────
  //
  // Prevents abuse of the query engine via unbounded scans.
  // Added as part of pre-launch security sprint (2026-04-15).
  //
  // Rules:
  //   1. Max 500 rows per page (hard ceiling, cannot be overridden)
  //   2. Unbounded queries on edges/entities/events require at least
  //      one filter beyond limit/offset — prevents full table scans
  //   3. 5-second wall-clock timeout on any query execution

  // Bumped from 500 → 2000. The indiv-to-edges ingest produces big
  // entities: MAGA Inc at 967 inflow edges, Trump Victory at 1,197,
  // ActBlue/WinRed at 1,000+. A 500-row ceiling silently truncated the
  // donors_to totals — MAGA Inc reported $342M instead of the real
  // $973M. 2000 accommodates the biggest vault committees with headroom.
  const MAX_PAGE_SIZE = 2000
  // 2026-04-20: raised 5s → 15s after edge count crossed 1M, then
  // 15s → 30s after Bill Status added 861K sponsorship edges (now 2.3M+
  // total). The monetary-type filter on the full edge set linear-scans
  // in ~12-18s cold cache. Future: build a secondary type-index so
  // type-only filters don't scan. Until then, accept the budget (the
  // MAX_PAGE_SIZE cap still prevents huge response payloads).
  // Timeout raised from 30s → 120s after the 2026-04-21 $1K-floor
  // indiv re-ingest expanded data/derived/fec-indiv-by-committee.jsonl
  // from ~200k to 3.7M edges (1.7GB). Unfiltered queries legitimately
  // take 30-60s to iterate that volume. Contract-test edges-query at
  // MAX_PAGE_SIZE now runs in ~45s. Bump to 120s gives headroom as the
  // store grows further. Consumers should always filter anyway; this
  // is the no-filter fallback bound.
  const QUERY_TIMEOUT_MS = 120000

  // Filter keys that count as "real" filters (not pagination)
  const PAGINATION_KEYS = new Set(["limit", "offset"])

  function hasRealFilters(filters) {
    if (!filters) return false
    for (const [k, v] of Object.entries(filters)) {
      if (PAGINATION_KEYS.has(k)) continue
      if (v !== undefined && v !== null && v !== "") return true
    }
    return false
  }

  function clampLimit(requestedLimit) {
    if (typeof requestedLimit !== "number" || requestedLimit < 0) return 100
    return Math.min(requestedLimit, MAX_PAGE_SIZE)
  }

  function enforceTimeout(fn, label) {
    const start = Date.now()
    const result = fn()
    const elapsed = Date.now() - start
    if (elapsed > QUERY_TIMEOUT_MS) {
      throw new Error(
        `Query timeout: ${label} took ${elapsed}ms (limit: ${QUERY_TIMEOUT_MS}ms). ` +
        `Add filters to narrow the query.`
      )
    }
    return result
  }

  // Subjects that require at least one real filter for unbounded queries
  const UNBOUNDED_SUBJECTS = new Set(["edges", "entities", "events", "bills", "executive_actions", "offshore_entities", "votes", "positions"])

  // ─── Public interface ─────────────────────────────────────────

  function query(spec = {}) {
    const subject = spec.subject || "edges"
    const filters = spec.filters || {}
    // Accept limit/offset at BOTH the spec level and inside filters. Many
    // callers naturally write `engine.query({ subject, filters: {...},
    // limit: 500 })` expecting the top-level limit to apply; the original
    // API only read `filters.limit`, silently truncating those calls to
    // the default of 100 rows. Every call site in ops/src/app/api/ask/
    // hit this bug and missed the tail of 150+-edge donor lists (FF PAC
    // $542M / Fairshake $312M to Harris were being dropped below the cut).
    // Fix: read spec.limit first, fall back to filters.limit, then 100.
    const limit = clampLimit(spec.limit ?? filters.limit ?? 100)
    const offset = spec.offset ?? filters.offset ?? 0

    // Class-analysis composers are special query subjects (pre-aggregated,
    // always bounded by their own logic, so no unbounded-query gate needed)
    if (subject === "cross_party_donors") {
      const rows = enforceTimeout(
        () => crossPartyDonors({ days: filters.days }),
        "cross_party_donors"
      )
      return { subject, total: rows.length, returned: rows.slice(offset, offset + limit).length, rows: rows.slice(offset, offset + limit) }
    }
    if (subject === "timing_proximity") {
      const rows = enforceTimeout(
        () => timingProximity({
          days: filters.timing_proximity_days ?? 30,
          event_type: filters.event_type || "floor_vote",
        }),
        "timing_proximity"
      )
      return { subject, total: rows.length, returned: rows.slice(offset, offset + limit).length, rows: rows.slice(offset, offset + limit) }
    }
    if (subject === "top_opposition_donors") {
      const cappedLimit = clampLimit(filters.limit ?? 20)
      const rows = enforceTimeout(
        () => topOppositionDonors({
          sector_affected: filters.sector_affected,
          limit: cappedLimit,
        }),
        "top_opposition_donors"
      )
      return { subject, total: rows.length, returned: rows.length, rows }
    }

    // Unbounded-query gate: edges/entities/events MUST have at least
    // one real filter. This prevents full table scans from the public API.
    if (UNBOUNDED_SUBJECTS.has(subject) && !hasRealFilters(filters)) {
      throw new Error(
        `Unbounded query on "${subject}" requires at least one filter. ` +
        `Supported filter fields: ` +
        (subject === "edges"
          ? "from, to, from_type, to_type, type, min_confidence, min_amount, max_amount, source, status, role, exclude_role"
          : subject === "entities"
          ? "entity_type, capital_type, class_position, worker_relationship, tags_approved, ideological_function, search"
          : subject === "events"
          ? "event_type, obstruction_type, policy_id, chamber, outcome, stakeholder, sector_affected, since, until"
          : subject === "bills"
          ? "congress, type, policy_area, became_law, sponsor_bioguide, subject, since, until, search"
          : subject === "executive_actions"
          ? "president, type, year, since, until, search"
          : subject === "offshore_entities"
          ? "jurisdiction, leak, linked_vault_entity, kind, search"
          : subject === "votes"
          ? "congress, chamber, session, vote_id, rc_number, bill_type, bill_number, result, since, until, search"
          : subject === "positions"
          ? "vote_id, bioguide, position, party, congress, chamber"
          : "unknown")
      )
    }

    let rows = []
    if (subject === "edges") rows = enforceTimeout(() => filterEdges(filters), "edges")
    else if (subject === "entities") rows = enforceTimeout(() => filterEntities(filters), "entities")
    else if (subject === "events") rows = enforceTimeout(() => filterEvents(filters), "events")
    else if (subject === "bills") rows = enforceTimeout(() => filterBills(filters), "bills")
    else if (subject === "executive_actions") rows = enforceTimeout(() => filterExecutiveActions(filters), "executive_actions")
    else if (subject === "offshore_entities") rows = enforceTimeout(() => filterOffshoreEntities(filters), "offshore_entities")
    else if (subject === "votes") rows = enforceTimeout(() => filterVotes(filters), "votes")
    else if (subject === "positions") rows = enforceTimeout(() => filterPositions(filters), "positions")
    else throw new Error(`unknown subject: ${subject}`)

    const total = rows.length
    const page = rows.slice(offset, offset + limit)

    return { subject, total, returned: page.length, rows: page }
  }

  function count(spec = {}) {
    const subject = spec.subject || "edges"
    const filters = spec.filters || {}
    if (subject === "edges") return filterEdges(filters).length
    if (subject === "entities") return filterEntities(filters).length
    if (subject === "events") return filterEvents(filters).length
    if (subject === "bills") return filterBills(filters).length
    if (subject === "executive_actions") return filterExecutiveActions(filters).length
    if (subject === "offshore_entities") return filterOffshoreEntities(filters).length
    if (subject === "votes") return filterVotes(filters).length
    if (subject === "positions") return filterPositions(filters).length
    if (subject === "cross_party_donors") return crossPartyDonors({ days: filters.days }).length
    return 0
  }

  function describe(spec = {}) {
    const subject = spec.subject || "edges"
    const filters = spec.filters || {}
    const parts = [`subject: ${subject}`]
    for (const [k, v] of Object.entries(filters)) {
      if (v !== undefined && v !== null && v !== "") parts.push(`${k}=${JSON.stringify(v)}`)
    }
    return parts.join(" · ")
  }

  return {
    query,
    count,
    describe,
    topOppositionDonors,
    crossPartyDonors,
    timingProximity,
    clear: clearAll,
  }
}

module.exports = {
  createQueryEngine: createInMemoryEngine,
  EDGE_TIER_PRESETS,
}
