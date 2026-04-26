/**
 * Shadow comparator for /api/connections.
 *
 * Per ADR-0024 §"Migration strategy" step 2: every old read also calls
 * the librarian and logs a diff. We do NOT change what the route returns
 * — the goal is one or two scans of diffs to walk with David before the
 * cutover.
 *
 * Scope: the totals + per-profile connection counts. We don't diff the
 * full Connection[] (~63k rows) because at this stage the actionable
 * information is in the rollups: do breakdowns agree, do top-connected
 * profiles agree, and where do per-profile counts disagree.
 *
 * Toggle with DONOR_MAP_SHADOW_CONNECTIONS=1 in ops/.env.local. Defaults
 * to off so production traffic never pays the librarian load cost without
 * an explicit opt-in.
 */
import { promises as fs } from "node:fs"
import * as path from "node:path"
import { getGraph } from "./donor-map-singleton"
import type { Edge, EdgeType } from "../../../lib/donor-map/types"

const LOG_PATH = path.join(
  process.cwd(),
  "..",
  "content",
  "Admin Notes",
  "connections-shadow-diff-log.jsonl",
)

// ─── Legacy enum + mappings (mirror the live route exactly) ────────────
// If these drift, we'd be reporting fake disagreements. Keep them in
// lockstep with ops/src/app/api/connections/route.ts.

type LegacyType = "related" | "donors" | "opposes" | "stories" | "contracts"

function mapToLegacyType(t: EdgeType): LegacyType | null {
  switch (t) {
    case "related": return "related"
    case "monetary": return "donors"
    case "political-opposition": return "opposes"
    case "story-link": return "stories"
    case "government-contract": return "contracts"
    default: return null
  }
}

/** Same orientation flip as the live route: monetary edges store
 * {from: donor, to: politician}, but the legacy "donors:" field is
 * "the politician's view of its donors" — so source/target flip. */
function flipForLegacy(edge: Edge): { source: string; target: string; sourceId: string; targetId: string } {
  if (edge.type === "monetary") {
    return { source: edge.to_raw, target: edge.from_raw, sourceId: edge.to_id, targetId: edge.from_id }
  }
  return { source: edge.from_raw, target: edge.to_raw, sourceId: edge.from_id, targetId: edge.to_id }
}

// ─── Shadow build ──────────────────────────────────────────────────────

interface CacheRollup {
  totalProfiles: number
  totalConnections: number
  totalAmount: number
  breakdown: { related: number; donors: number; opposes: number; stories: number }
  /** title → connectionCount, for per-profile diff. */
  perProfile: Map<string, number>
}

interface LiveResultLite {
  topConnected: { title: string; connectionCount: number; totalAmount: number }[]
  unconnected: { title: string }[]
  unconnectedCount: number
  totalProfiles: number
  breakdown: { related: number; donors: number; opposes: number; stories: number; total: number }
  connections: { source: string; target: string; relationshipType: LegacyType }[]
}

/**
 * Reduce the live route's `result` object to the rollup shape we diff
 * against. We do this on the live side rather than passing the whole
 * result so the comparator stays narrow.
 */
function rollupFromLive(live: LiveResultLite): CacheRollup {
  const perProfile = new Map<string, number>()
  for (const p of live.topConnected) perProfile.set(p.title, p.connectionCount)
  for (const p of live.unconnected) perProfile.set(p.title, 0)

  let totalAmount = 0
  for (const p of live.topConnected) totalAmount += p.totalAmount

  return {
    totalProfiles: live.totalProfiles,
    totalConnections: live.breakdown.total,
    totalAmount,
    breakdown: {
      related: live.breakdown.related,
      donors: live.breakdown.donors,
      opposes: live.breakdown.opposes,
      stories: live.breakdown.stories,
    },
    perProfile,
  }
}

/**
 * Build the same rollup from the librarian. Mirrors the live route's
 * edge walk: filter active, map to legacy, flip monetary, bucket into
 * the source profile, reflect bidirectional types onto the target.
 *
 * Returns null if the librarian can't be loaded — caller treats that
 * as "skip" not "fail."
 */
function rollupFromLibrarian(): CacheRollup | null {
  const g = getGraph()
  if (!g) return null

  // Profiles = nodes with a profile_path. Initialize each at zero so
  // we report the same totalProfiles shape.
  const profileNodeIds = new Set<string>()
  const titleByNodeId = new Map<string, string>()
  const perProfile = new Map<string, number>()
  for (const n of g.resolver.allNodes()) {
    if (!n.profile_path) continue
    profileNodeIds.add(n.id)
    titleByNodeId.set(n.id, n.name)
    perProfile.set(n.name, 0)
  }

  // Walk all outgoing-active edges from every node, dedupe by edge.id
  // (undirected edges are indexed in both directions).
  const seenEdgeIds = new Set<string>()
  let totalConnections = 0
  let totalAmount = 0
  const breakdown = { related: 0, donors: 0, opposes: 0, stories: 0 }
  // Per-profile bucket sets so we don't double-count when an edge appears
  // both A→B and B→A in the canonical store (legacy route dedups via
  // `if (!profile[legacyType].includes(target))`).
  const bucketSets = new Map<string, { related: Set<string>; donors: Set<string>; opposes: Set<string>; stories: Set<string> }>()
  function bucketsFor(title: string) {
    let b = bucketSets.get(title)
    if (!b) {
      b = { related: new Set(), donors: new Set(), opposes: new Set(), stories: new Set() }
      bucketSets.set(title, b)
    }
    return b
  }

  for (const nodeId of profileNodeIds) {
    const edges = g.neighbors(nodeId, { direction: "out", status: "active" })
    for (const edge of edges) {
      if (seenEdgeIds.has(edge.id)) continue
      seenEdgeIds.add(edge.id)

      const legacy = mapToLegacyType(edge.type)
      if (!legacy || legacy === "contracts") continue // breakdown ignores contracts

      const { source, target, sourceId } = flipForLegacy(edge)

      // Source must be a vault profile (legacy route's
      // `if (!sourceMeta) continue` skip).
      if (!profileNodeIds.has(sourceId)) continue

      breakdown[legacy] += 1
      totalConnections += 1

      // Aggregate into source profile's bucket (with dedup vs legacy
      // route's "already in bucket?" check)
      const srcBuckets = bucketsFor(source)
      if (!srcBuckets[legacy].has(target)) {
        srcBuckets[legacy].add(target)
        perProfile.set(source, (perProfile.get(source) ?? 0) + 1)
      }

      // Monetary amount aggregation — legacy route adds to BOTH source
      // and target totals when amount > 0.
      const amt = typeof edge.amount === "number" && Number.isFinite(edge.amount) ? edge.amount : 0
      if (amt > 0 && (edge.type === "monetary" || edge.type === "government-contract")) {
        totalAmount += amt // single counter; live route accumulates per-profile then we sum, equivalent for 'topConnected.totalAmount' aggregation
      }

      // Bidirectional reflect: stories / opposes / related show on the
      // target profile too (matches legacy route lines 293-299).
      if (legacy === "stories" || legacy === "opposes" || legacy === "related") {
        const targetTitle = titleByNodeId.get(flipForLegacy(edge).targetId)
        if (targetTitle) {
          const tgtBuckets = bucketsFor(targetTitle)
          if (!tgtBuckets[legacy].has(source)) {
            tgtBuckets[legacy].add(source)
            perProfile.set(targetTitle, (perProfile.get(targetTitle) ?? 0) + 1)
          }
        }
      }
    }
  }

  return {
    totalProfiles: profileNodeIds.size,
    totalConnections,
    totalAmount,
    breakdown,
    perProfile,
  }
}

// ─── Diff shape ────────────────────────────────────────────────────────

export interface ConnectionsDiff {
  ts: string
  agree: boolean
  totals: {
    cache: { profiles: number; connections: number; totalAmount: number }
    librarian: { profiles: number; connections: number; totalAmount: number }
  }
  breakdown: {
    cache: CacheRollup["breakdown"]
    librarian: CacheRollup["breakdown"]
    delta: CacheRollup["breakdown"]
  }
  /** Distribution of per-profile count agreement. */
  profile_distribution: {
    same: number
    librarian_higher: number
    cache_higher: number
    only_in_cache: number
    only_in_librarian: number
  }
  /** Top 25 per-profile count disagreements by abs(delta). */
  top_count_diffs: { title: string; cache: number; librarian: number; delta: number; in: "both" | "only_cache" | "only_librarian" }[]
}

function buildDiff(cache: CacheRollup, librarian: CacheRollup): ConnectionsDiff {
  const allTitles = new Set<string>([...cache.perProfile.keys(), ...librarian.perProfile.keys()])
  const dist = { same: 0, librarian_higher: 0, cache_higher: 0, only_in_cache: 0, only_in_librarian: 0 }
  type CountDiff = { title: string; cache: number; librarian: number; delta: number; in: "both" | "only_cache" | "only_librarian" }
  const allDiffs: CountDiff[] = []

  for (const title of allTitles) {
    const c = cache.perProfile.get(title)
    const l = librarian.perProfile.get(title)
    if (c === undefined && l !== undefined) {
      dist.only_in_librarian += 1
      if (l > 0) allDiffs.push({ title, cache: 0, librarian: l, delta: l, in: "only_librarian" })
      continue
    }
    if (l === undefined && c !== undefined) {
      dist.only_in_cache += 1
      if (c > 0) allDiffs.push({ title, cache: c, librarian: 0, delta: -c, in: "only_cache" })
      continue
    }
    if (c === l) { dist.same += 1; continue }
    if ((l ?? 0) > (c ?? 0)) dist.librarian_higher += 1
    else dist.cache_higher += 1
    allDiffs.push({ title, cache: c ?? 0, librarian: l ?? 0, delta: (l ?? 0) - (c ?? 0), in: "both" })
  }

  allDiffs.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))

  const breakdownDelta = {
    related: librarian.breakdown.related - cache.breakdown.related,
    donors: librarian.breakdown.donors - cache.breakdown.donors,
    opposes: librarian.breakdown.opposes - cache.breakdown.opposes,
    stories: librarian.breakdown.stories - cache.breakdown.stories,
  }

  const agree =
    cache.totalProfiles === librarian.totalProfiles &&
    cache.totalConnections === librarian.totalConnections &&
    breakdownDelta.related === 0 && breakdownDelta.donors === 0 &&
    breakdownDelta.opposes === 0 && breakdownDelta.stories === 0 &&
    dist.only_in_cache === 0 && dist.only_in_librarian === 0 &&
    dist.librarian_higher === 0 && dist.cache_higher === 0

  return {
    ts: new Date().toISOString(),
    agree,
    totals: {
      cache: { profiles: cache.totalProfiles, connections: cache.totalConnections, totalAmount: cache.totalAmount },
      librarian: { profiles: librarian.totalProfiles, connections: librarian.totalConnections, totalAmount: librarian.totalAmount },
    },
    breakdown: { cache: cache.breakdown, librarian: librarian.breakdown, delta: breakdownDelta },
    profile_distribution: dist,
    top_count_diffs: allDiffs.slice(0, 25),
  }
}

/**
 * Compute and log a diff. Fire-and-forget — never blocks the response.
 * Skips writing on agree=true unless LOG_AGREES=1, to keep the log
 * focused on actionable disagreements.
 */
export async function shadowConnectionsAndLog(live: LiveResultLite): Promise<void> {
  try {
    const cache = rollupFromLive(live)
    const librarian = rollupFromLibrarian()
    if (!librarian) return // graph load failed — silent skip
    const diff = buildDiff(cache, librarian)
    if (diff.agree && process.env.LOG_AGREES !== "1") return
    await fs.appendFile(LOG_PATH, JSON.stringify(diff) + "\n", "utf-8")
  } catch (err) {
    console.error("[connections-shadow] failed:", err)
  }
}
