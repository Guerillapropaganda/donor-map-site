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
    const minConf = typeof filters.min_confidence === "number" ? filters.min_confidence : 0
    return all.filter((e) => {
      // Status: default "active" unless "all" requested
      if (filters.status !== "all") {
        const wantStatus = filters.status || "active"
        if (e.status !== wantStatus) return false
      }
      if (filters.from && e.from !== filters.from) return false
      if (filters.to && e.to !== filters.to) return false
      if (filters.from_type && e.from_type !== filters.from_type) return false
      if (filters.to_type && e.to_type !== filters.to_type) return false
      if (filters.type && e.type !== filters.type) return false
      if (typeof e.confidence === "number" && e.confidence < minConf) return false
      if (typeof filters.min_amount === "number") {
        if (typeof e.amount !== "number" || e.amount < filters.min_amount) return false
      }
      if (typeof filters.max_amount === "number") {
        if (typeof e.amount !== "number" || e.amount > filters.max_amount) return false
      }
      if (filters.source && e.source !== filters.source) return false
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

  // ─── Public interface ─────────────────────────────────────────

  function query(spec = {}) {
    const subject = spec.subject || "edges"
    const filters = spec.filters || {}
    const limit = filters.limit ?? 100
    const offset = filters.offset ?? 0

    // Class-analysis composers are special query subjects
    if (subject === "cross_party_donors") {
      const rows = crossPartyDonors({ days: filters.days })
      return { subject, total: rows.length, returned: rows.slice(offset, offset + limit).length, rows: rows.slice(offset, offset + limit) }
    }
    if (subject === "timing_proximity") {
      const rows = timingProximity({
        days: filters.timing_proximity_days ?? 30,
        event_type: filters.event_type || "floor_vote",
      })
      return { subject, total: rows.length, returned: rows.slice(offset, offset + limit).length, rows: rows.slice(offset, offset + limit) }
    }
    if (subject === "top_opposition_donors") {
      const rows = topOppositionDonors({
        sector_affected: filters.sector_affected,
        limit: filters.limit ?? 20,
      })
      return { subject, total: rows.length, returned: rows.length, rows }
    }

    let rows = []
    if (subject === "edges") rows = filterEdges(filters)
    else if (subject === "entities") rows = filterEntities(filters)
    else if (subject === "events") rows = filterEvents(filters)
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
}
