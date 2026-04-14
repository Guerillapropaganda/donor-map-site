#!/usr/bin/env node
/**
 * story-candidate-scorer.cjs — Phase 5 / Story Score
 *
 * Producer that finds story candidates from the canonical data stores,
 * scores them via scripts/lib/story-scorer.cjs, ranks them, and writes
 * the top N to the attention queue via addEntries("story-candidate-
 * scorer", ...).
 *
 * Candidate-finding strategies in v1:
 *
 *   1. TIMING PROXIMITY — donors who funded a politician within ±N
 *      days of that politician's vote on a tracked event. Uses the
 *      query engine's timing_proximity subject.
 *
 *   2. CROSS-PARTY BIG DONORS — donors funding both major parties
 *      with total spend above a threshold. Uses the query engine's
 *      cross_party_donors subject.
 *
 *   3. DARK-MONEY NETWORK OPPOSITION — donors tagged with
 *      dark-money-networked ideological function whose edge targets
 *      include politicians who voted on hot-issue topics.
 *
 * Each strategy produces candidate records with the same shape:
 *   {
 *     strategy: "timing_proximity" | "cross_party" | "dark_money_network",
 *     headline: "human-readable what",
 *     details:  "human-readable why",
 *     target_url: "/profile path or /query link",
 *     inputs: { money_amount, days_to_event, is_cross_party, ... }
 *   }
 *
 * After scoring, the top N candidates flow into the attention queue
 * as entries with:
 *   bucket: "compounding"  (story leads aren't blockers, they're
 *                          compounding value — worth investigating)
 *   leverage: derived from score tier (high=5, medium=3, low=2)
 *   cost_min: estimated investigation time
 *
 * Usage:
 *   node scripts/story-candidate-scorer.cjs             # dry-run
 *   node scripts/story-candidate-scorer.cjs --write
 *   node scripts/story-candidate-scorer.cjs --limit 50
 *   node scripts/story-candidate-scorer.cjs --verbose
 */

const { createQueryEngine } = require("./lib/query-engine.cjs")
const { scoreCandidates } = require("./lib/story-scorer.cjs")
const hotIssues = require("./lib/hot-issues-store.cjs")
const attentionQueue = require("./lib/attention-queue.cjs")
const entitiesStore = require("./lib/entities-store.cjs")

const WRITE = process.argv.includes("--write")
const VERBOSE = process.argv.includes("--verbose")
const limitFlag = process.argv.indexOf("--limit")
const LIMIT = limitFlag !== -1 ? parseInt(process.argv[limitFlag + 1], 10) : 20

const SOURCE_NAME = "story-candidate-scorer"

// ─── Candidate-finding strategies ────────────────────────────────────

function findTimingProximity(engine) {
  const result = engine.query({
    subject: "timing_proximity",
    filters: { timing_proximity_days: 60, limit: 200 },
  })
  return result.rows.map((hit) => {
    // Look up entity class tags for the donor to compute news_cycle_relevance
    const donorEntity = entitiesStore.findByName(hit.donor)
    const donorCapitalTypes = donorEntity?.capital_type ? [donorEntity.capital_type] : []

    const matchingHots = hotIssues.matchingHotIssues({ capital_types: donorCapitalTypes })
    const newsMultiplier =
      matchingHots.length > 0
        ? Math.max(...matchingHots.map((h) => h.weight))
        : 1.0

    return {
      strategy: "timing_proximity",
      headline: `${hit.donor} → ${hit.politician} ${hit.days_between >= 0 ? hit.days_between + "d before" : Math.abs(hit.days_between) + "d after"} vote on ${hit.event_title.slice(0, 60)}`,
      details: `${hit.donor} gave ${hit.amount ? "$" + hit.amount.toLocaleString() : "an undisclosed amount"} to ${hit.politician} on ${hit.donation_date} — ${Math.abs(hit.days_between)} days from the ${hit.event_title} vote (${hit.event_date})`,
      target_url: `/query?subject=edges&from=${encodeURIComponent(hit.donor)}&to=${encodeURIComponent(hit.politician)}`,
      inputs: {
        money_amount: hit.amount || 0,
        days_to_event: Math.abs(hit.days_between),
        is_cross_party: false, // not computed for this strategy
        rhetoric_contradiction: false,
        press_coverage_count: 0,
        source_tier_weight: 2.0,
        age_days: daysBetween(hit.event_date, new Date().toISOString()),
        news_cycle_relevance: newsMultiplier,
      },
    }
  })
}

function findCrossParty(engine) {
  const result = engine.query({
    subject: "cross_party_donors",
    filters: { days: 730 }, // 2-year window
  })
  return result.rows.slice(0, 30).map((donor) => {
    const donorEntity = entitiesStore.findByName(donor.name)
    const donorCapitalTypes = donorEntity?.capital_type ? [donorEntity.capital_type] : []
    const matchingHots = hotIssues.matchingHotIssues({ capital_types: donorCapitalTypes })
    const newsMultiplier =
      matchingHots.length > 0 ? Math.max(...matchingHots.map((h) => h.weight)) : 1.0

    return {
      strategy: "cross_party",
      headline: `${donor.name} funded BOTH parties — $${donor.total.toLocaleString()} total (balance ${donor.balance.toFixed(2)})`,
      details: `${donor.name} gave $${donor.d_spend.toLocaleString()} to Democrats AND $${donor.r_spend.toLocaleString()} to Republicans in the last 2 years. Balance score ${donor.balance.toFixed(2)} (1.0 = perfectly split).`,
      target_url: `/query?subject=cross_party_donors`,
      inputs: {
        money_amount: donor.total || 0,
        is_cross_party: true,
        press_coverage_count: 1, // assume some baseline coverage
        source_tier_weight: 3.0,
        age_days: 30, // aggregate over recent window
        news_cycle_relevance: newsMultiplier,
      },
    }
  })
}

// Load proposed tags as a supplemental lookup so the Phase 5 scorer
// can surface candidates BEFORE David has triaged every approval. v2
// will only use approved tags, but for v1 the proposed heuristic is
// our main signal.
const fs = require("fs")
const path = require("path")

function loadProposedTagsByEntityId() {
  const file = path.join(__dirname, "..", "data", "entity-class-tags-proposed.jsonl")
  const map = new Map()
  if (!fs.existsSync(file)) return map
  const raw = fs.readFileSync(file, "utf-8")
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed) continue
    try {
      const p = JSON.parse(trimmed)
      if (p.entity_id && p.tags) map.set(p.entity_id, p.tags)
    } catch (_) {}
  }
  return map
}

function findDarkMoneyNetwork() {
  const entities = entitiesStore.loadEntities()
  const proposed = loadProposedTagsByEntityId()

  // Prefer approved tags, fall back to proposed
  function tagsFor(entity) {
    if (entity.tags_approved) return entity
    const p = proposed.get(entity.id)
    if (!p) return null
    return {
      capital_type: p.capital_type || entity.capital_type,
      ideological_function: p.ideological_function || entity.ideological_function || [],
      class_position: p.class_position || entity.class_position,
    }
  }

  return entities
    .map((e) => ({ entity: e, tags: tagsFor(e) }))
    .filter((x) => x.tags && (x.tags.ideological_function || []).includes("dark-money-networked"))
    .map(({ entity: e, tags }) => {
      // shadow the outer e for the rest of the mapper
      const _ = { e, tags }
      return _
    })
    .map(({ e, tags }) => {
      const matchingHots = hotIssues.matchingHotIssues({
        capital_types: tags.capital_type ? [tags.capital_type] : [],
      })
      const newsMultiplier =
        matchingHots.length > 0 ? Math.max(...matchingHots.map((h) => h.weight)) : 1.2

      const totalSpend =
        (e.signals && typeof e.signals.total_political_spend === "number"
          ? e.signals.total_political_spend
          : 0) || 0

      return {
        strategy: "dark_money_network",
        headline: `${e.name} — dark-money-networked, $${totalSpend.toLocaleString()} tracked political spend`,
        details: `${e.name} is tagged dark-money-networked${tags.capital_type ? ` with capital_type=${tags.capital_type}` : ""}. Total tracked political spend: $${totalSpend.toLocaleString()}. Investigate cross-references with other dark-money network members.`,
        target_url: `/query?subject=entities&capital_type=${encodeURIComponent(tags.capital_type || "")}`,
        inputs: {
          money_amount: totalSpend,
          is_cross_party: false,
          rhetoric_contradiction: false,
          press_coverage_count: 2,
          source_tier_weight: 2.5,
          // Dark-money network entities are structural / ongoing
          // actors, not breaking news — use a short age so the
          // recency decay doesn't penalize them. Real time-decay
          // applies to timing_proximity (date-anchored hits), not
          // to "this network member is large and active."
          age_days: 7,
          news_cycle_relevance: newsMultiplier,
        },
      }
    })
}

function daysBetween(a, b) {
  if (!a || !b) return 0
  const da = new Date(a).getTime()
  const db = new Date(b).getTime()
  if (isNaN(da) || isNaN(db)) return 0
  return Math.abs(Math.round((db - da) / 864e5))
}

// ─── Ranking + attention queue wiring ───────────────────────────────

function leverageFromTier(tier) {
  if (tier === "high") return 5
  if (tier === "medium") return 3
  return 2
}

function costFromStrategy(strategy) {
  switch (strategy) {
    case "timing_proximity":
      return 45 // need to verify the donation-vote coincidence is meaningful
    case "cross_party":
      return 60 // need to understand why the donor plays both sides
    case "dark_money_network":
      return 90 // network research is slower
    default:
      return 30
  }
}

function toAttentionEntry(scored) {
  return {
    bucket: "compounding",
    what: scored.headline,
    why: `${scored.details} [${scored.strategy}, score ${scored.score}, tier ${scored.tier}]`,
    where: scored.target_url,
    cost_min: costFromStrategy(scored.strategy),
    leverage: leverageFromTier(scored.tier),
    metadata: {
      strategy: scored.strategy,
      score: scored.score,
      tier: scored.tier,
      breakdown: scored.breakdown,
      decay: scored.decay,
      news_multiplier: scored.news_multiplier,
    },
  }
}

// ─── Main ────────────────────────────────────────────────────────────

function main() {
  console.log("")
  console.log("═══ story-candidate-scorer ═══")
  console.log(`  dry-run: ${!WRITE}`)
  console.log(`  limit:   top ${LIMIT}`)
  console.log("")

  const engine = createQueryEngine()
  entitiesStore.loadEntities()
  hotIssues.loadHotIssues()

  console.log("--- strategy: timing_proximity ---")
  const timing = findTimingProximity(engine)
  console.log(`  found ${timing.length} candidates`)

  console.log("--- strategy: cross_party ---")
  const crossParty = findCrossParty(engine)
  console.log(`  found ${crossParty.length} candidates`)

  console.log("--- strategy: dark_money_network ---")
  const darkMoney = findDarkMoneyNetwork()
  console.log(`  found ${darkMoney.length} candidates`)
  console.log("")

  const all = [...timing, ...crossParty, ...darkMoney]
  const scored = scoreCandidates(all)
  const top = scored.slice(0, LIMIT)

  console.log(`═══ top ${top.length} of ${scored.length} ═══`)
  console.log("")
  for (let i = 0; i < top.length; i++) {
    const c = top[i]
    console.log(
      `  ${String(i + 1).padStart(2)}. [${c.tier.padEnd(6)}] score=${c.score.toString().padStart(6)}  ${c.strategy.padEnd(20)}  ${c.headline.slice(0, 90)}`,
    )
    if (VERBOSE) {
      console.log(`        breakdown: ${JSON.stringify(c.breakdown)}`)
    }
  }
  console.log("")

  if (WRITE) {
    const entries = top.map(toAttentionEntry)
    const written = attentionQueue.addEntries(SOURCE_NAME, entries)
    console.log(`  wrote ${written} entries to attention queue (source=${SOURCE_NAME})`)
  } else {
    console.log("  DRY RUN — no attention queue write")
  }
  console.log("")
}

main()
