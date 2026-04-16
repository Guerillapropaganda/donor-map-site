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
 *       min_amount, max_amount, source, status,
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

// ─── Adapter: in-memory implementation ────────────────────────────────

function createInMemoryEngine() {
  // Lazy-load all stores on first use, cache in closure
  let _loaded = false
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

  // ─── Class-analysis composers ───────────────────────────────────

  /**
   * Cross-party donor detection. Donors who funded both major parties
   * in the last `days` days (or all time if days not set).
   */
  function crossPartyDonors({ days = null } = {}) {
    ensureLoaded()
    const all = edgesStore.loadEdges().filter((e) => e.type === "monetary" && e.amount)
    const byDonor = new Map()
    const cutoff = days
      ? new Date(Date.now() - days * 864e5).toISOString()
      : null

    for (const e of all) {
      if (cutoff && e.date && e.date < cutoff) continue
      const donor = e.from
      if (!byDonor.has(donor)) byDonor.set(donor, { D: 0, R: 0, total: 0 })
      const party = getPartyFor(e.to)
      if (party === "D" || party === "R") byDonor.get(donor)[party] += e.amount || 0
      byDonor.get(donor).total += e.amount || 0
    }

    return [...byDonor.entries()]
      .filter(([_, c]) => c.D > 0 && c.R > 0)
      .map(([name, c]) => ({
        name,
        d_spend: c.D,
        r_spend: c.R,
        total: c.total,
        balance: Math.min(c.D, c.R) / Math.max(c.D, c.R),
      }))
      .sort((a, b) => b.total - a.total)
  }

  // Helper: best-effort party lookup from entity record
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
    return _partyCache.get(politicianName) || null
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
   */
  function topOppositionDonors({ sector_affected = null, limit = 20 } = {}) {
    ensureLoaded()
    let events = eventsStore.queryEvents({})
    if (sector_affected) {
      events = events.filter((e) => (e.sector_affected || []).includes(sector_affected))
    }

    const politiciansInEvents = new Set()
    for (const ev of events) {
      for (const s of ev.stakeholders || []) politiciansInEvents.add(s)
    }

    const byDonor = new Map()
    const edges = edgesStore.loadEdges().filter((e) => e.type === "monetary")
    for (const edge of edges) {
      if (!politiciansInEvents.has(edge.to)) continue
      if (!byDonor.has(edge.from)) {
        byDonor.set(edge.from, { amount: 0, count: 0, politicians: new Set() })
      }
      const r = byDonor.get(edge.from)
      r.amount += edge.amount || 0
      r.count += 1
      r.politicians.add(edge.to)
    }

    return [...byDonor.entries()]
      .map(([name, r]) => ({
        name,
        total_spend: r.amount,
        edge_count: r.count,
        politicians_count: r.politicians.size,
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

  const MAX_PAGE_SIZE = 500
  const QUERY_TIMEOUT_MS = 5000

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
  const UNBOUNDED_SUBJECTS = new Set(["edges", "entities", "events"])

  // ─── Public interface ─────────────────────────────────────────

  function query(spec = {}) {
    const subject = spec.subject || "edges"
    const filters = spec.filters || {}
    const limit = clampLimit(filters.limit ?? 100)
    const offset = filters.offset ?? 0

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
          ? "from, to, from_type, to_type, type, min_confidence, min_amount, max_amount, source, status"
          : subject === "entities"
          ? "entity_type, capital_type, class_position, worker_relationship, tags_approved, ideological_function, search"
          : "event_type, obstruction_type, policy_id, chamber, outcome, stakeholder, sector_affected, since, until")
      )
    }

    let rows = []
    if (subject === "edges") rows = enforceTimeout(() => filterEdges(filters), "edges")
    else if (subject === "entities") rows = enforceTimeout(() => filterEntities(filters), "entities")
    else if (subject === "events") rows = enforceTimeout(() => filterEvents(filters), "events")
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
