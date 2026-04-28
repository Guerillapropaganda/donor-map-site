/**
 * story-evidence.ts — assembles the money trail + evidence picture for one
 * Story record by querying the librarian (lib/donor-map). Used by:
 *   /api/stories/money               (shallow — money trail only)
 *   /api/stories/evidence            (deep — adds shared donors + cross-targets)
 *   /api/stories/draft-from-evidence (calls deep, formats markdown brief)
 *
 * Per Rule 4 (CLAUDE.md): every dollar / cite assembled here traces to a
 * canonical edge. The brief writer never asserts a new fact — receipts only,
 * editorial framing is left blank for David / Research Claude.
 *
 * Per ADR-0024: every read goes through the Graph singleton. Never read
 * profile frontmatter for $ figures — those belong in the canonical stores.
 */
import type { Edge } from "../../../lib/donor-map/types"
import type { Graph } from "../../../lib/donor-map/graph"
import { classifyEdge } from "../../../lib/donor-map/edge-taxonomy"

// ─── Types ─────────────────────────────────────────────────────────────────

export interface ResolvedNode {
  name: string
  type: string
  profile_path: string | null
}

export interface MoneyEdge {
  /** Original from-name on the canonical edge (kept for receipts). */
  from: string
  to: string
  amount: number | null
  cycle: string | number | null
  source: string
  source_url: string | null
  category: string
  label: string
  evidence: string[]
}

export interface MoneyBucket {
  total_amount: number
  edge_count: number
  /** Up to 12 highest-$ edges, sorted desc. */
  top_edges: MoneyEdge[]
}

export interface PairEvidence {
  subject_ref: string
  counterparty_ref: string
  resolved: { subject: ResolvedNode | null; counterparty: ResolvedNode | null }
  unresolved_reason: string | null
  money_for: MoneyBucket
  money_against: MoneyBucket
  /** Contracts / grants from counterparty → subject (rare for PAC×politician). */
  other_money: MoneyBucket
  /** Non-monetary edges (affiliation, related, political-opposition). */
  non_money_edges: { category: string; label: string; count: number }[]
}

export interface SharedDonor {
  name: string
  to_subject_amount: number
  to_counterparty_amount: number
  combined_amount: number
}

export interface CrossTarget {
  /** Other subject the counterparty plays both-sides on. */
  subject_name: string
  subject_profile_path: string | null
  money_for_amount: number
  money_against_amount: number
  has_political_opposition_edge: boolean
}

export interface FullEvidence {
  pair: PairEvidence
  /** Top shared donors who fund both subject and counterparty. */
  shared_donors: SharedDonor[]
  /** Other politicians where counterparty plays both donor AND opponent. */
  cross_targets: CrossTarget[]
  notes: string[]
}

// ─── Helpers ───────────────────────────────────────────────────────────────

const MONEY_FOR_CATEGORIES = new Set([
  "direct-contribution",
  "ie-support",
  "527-contribution",
  "philanthropic-grant",
])
const MONEY_AGAINST_CATEGORIES = new Set(["ie-oppose"])
const OTHER_MONEY_CATEGORIES = new Set([
  "government-contract",
  "federal-grant",
  "campaign-expenditure",
  "527-expenditure",
])

function stripWikilink(s: string): string {
  if (!s) return ""
  const m = s.match(/^\[\[(.+?)\]\]$/)
  return (m ? m[1] : s).trim()
}

function safeClassify(e: Edge): { category: string; label: string } {
  try {
    const r = classifyEdge({
      type: e.type,
      role: e.role,
      source: e.source,
      amount: e.amount,
      cycle: e.cycle,
      from: e.from_raw,
      to: e.to_raw,
      metadata: e.raw?.metadata as Record<string, unknown> | null,
    })
    return { category: r.category, label: r.label }
  } catch {
    return { category: "unknown", label: "Unknown" }
  }
}

function toMoneyEdge(e: Edge, c: { category: string; label: string }): MoneyEdge {
  return {
    from: e.from_raw,
    to: e.to_raw,
    amount: e.amount,
    cycle: e.cycle,
    source: e.source,
    source_url: e.source_url,
    category: c.category,
    label: c.label,
    evidence: Array.isArray(e.evidence) ? e.evidence.slice(0, 3) : [],
  }
}

function bucketize(edges: Edge[], categoryFilter: Set<string>): MoneyBucket {
  let total = 0
  const items: MoneyEdge[] = []
  for (const e of edges) {
    const c = safeClassify(e)
    if (!categoryFilter.has(c.category)) continue
    if (typeof e.amount === "number" && Number.isFinite(e.amount)) total += e.amount
    items.push(toMoneyEdge(e, c))
  }
  items.sort((a, b) => (b.amount ?? 0) - (a.amount ?? 0))
  return { total_amount: total, edge_count: items.length, top_edges: items.slice(0, 12) }
}

function tryResolveNode(graph: Graph, ref: string): ResolvedNode | null {
  const cleaned = stripWikilink(ref)
  if (!cleaned) return null
  try {
    const n = graph.resolve({ kind: "name", value: cleaned })
    return { name: n.name, type: n.type, profile_path: n.profile_path }
  } catch {
    return null
  }
}

// ─── Per-pair evidence ─────────────────────────────────────────────────────

/**
 * Build the (subject, counterparty) money picture: every edge between them
 * in either direction, classified and bucketed. Bails gracefully when one
 * or both can't be resolved by the librarian.
 */
export function buildPairEvidence(
  graph: Graph,
  subjectRef: string,
  counterpartyRef: string,
): PairEvidence {
  const subject = tryResolveNode(graph, subjectRef)
  const counterparty = tryResolveNode(graph, counterpartyRef)

  const empty: MoneyBucket = { total_amount: 0, edge_count: 0, top_edges: [] }
  if (!subject || !counterparty) {
    const missing = !subject && !counterparty ? "both" : !subject ? "subject" : "counterparty"
    return {
      subject_ref: subjectRef,
      counterparty_ref: counterpartyRef,
      resolved: { subject, counterparty },
      unresolved_reason:
        `Could not resolve ${missing} via the librarian. ` +
        `The name in the story record may not match any canonical entity. ` +
        `Use the alias resolver on this card or fix the entity registry.`,
      money_for: empty,
      money_against: empty,
      other_money: empty,
      non_money_edges: [],
    }
  }

  // All edges incident to counterparty (both directions). Filter to those
  // touching the subject node id. Cheaper than computing intersection on the
  // graph since the librarian already returns all neighbors of one node.
  const subjectId = graph.resolve({ kind: "name", value: subject.name }).id
  const counterpartyId = graph.resolve({ kind: "name", value: counterparty.name }).id

  const cpEdges = graph.neighbors(counterparty.name, { direction: "both", status: "active" })
  const between: Edge[] = cpEdges.filter(
    (e) =>
      (e.from_id === counterpartyId && e.to_id === subjectId) ||
      (e.from_id === subjectId && e.to_id === counterpartyId),
  )

  // Bucket
  const moneyFor = bucketize(between, MONEY_FOR_CATEGORIES)
  const moneyAgainst = bucketize(between, MONEY_AGAINST_CATEGORIES)
  const otherMoney = bucketize(between, OTHER_MONEY_CATEGORIES)

  // Non-monetary tally (related, political-opposition, affiliation, story-link)
  const nonMoneyMap = new Map<string, { label: string; count: number }>()
  for (const e of between) {
    const c = safeClassify(e)
    if (
      MONEY_FOR_CATEGORIES.has(c.category) ||
      MONEY_AGAINST_CATEGORIES.has(c.category) ||
      OTHER_MONEY_CATEGORIES.has(c.category)
    )
      continue
    const key = c.category
    const existing = nonMoneyMap.get(key)
    if (existing) existing.count++
    else nonMoneyMap.set(key, { label: c.label, count: 1 })
  }
  const nonMoneyEdges = Array.from(nonMoneyMap.entries()).map(([category, v]) => ({
    category,
    label: v.label,
    count: v.count,
  }))

  return {
    subject_ref: subjectRef,
    counterparty_ref: counterpartyRef,
    resolved: { subject, counterparty },
    unresolved_reason: null,
    money_for: moneyFor,
    money_against: moneyAgainst,
    other_money: otherMoney,
    non_money_edges: nonMoneyEdges,
  }
}

// ─── Shared donors ─────────────────────────────────────────────────────────

/**
 * Top entities that send money to BOTH the subject and the counterparty.
 * Sums per from_id across direct-contribution + ie-support + 527 + grant
 * edges (anything `countsAsMoneyGiven` and not opposition-spending).
 */
export function buildSharedDonors(
  graph: Graph,
  subject: ResolvedNode,
  counterparty: ResolvedNode,
  limit = 10,
): SharedDonor[] {
  const subjectInbound = graph.neighbors(subject.name, { direction: "in", status: "active" })
  const cpInbound = graph.neighbors(counterparty.name, { direction: "in", status: "active" })

  function sumInboundByDonor(edges: Edge[]): Map<string, { name: string; amount: number }> {
    const map = new Map<string, { name: string; amount: number }>()
    for (const e of edges) {
      const c = safeClassify(e)
      if (!MONEY_FOR_CATEGORIES.has(c.category)) continue
      if (typeof e.amount !== "number" || !Number.isFinite(e.amount)) continue
      const key = e.from_id
      const slot = map.get(key)
      if (slot) slot.amount += e.amount
      else map.set(key, { name: e.from_raw, amount: e.amount })
    }
    return map
  }

  const subjectMap = sumInboundByDonor(subjectInbound)
  const cpMap = sumInboundByDonor(cpInbound)

  const overlap: SharedDonor[] = []
  for (const [donorId, sub] of subjectMap.entries()) {
    const cp = cpMap.get(donorId)
    if (!cp) continue
    overlap.push({
      name: sub.name,
      to_subject_amount: sub.amount,
      to_counterparty_amount: cp.amount,
      combined_amount: sub.amount + cp.amount,
    })
  }
  overlap.sort((a, b) => b.combined_amount - a.combined_amount)
  return overlap.slice(0, limit)
}

// ─── Cross-targets (the "playbook" angle) ──────────────────────────────────

/**
 * Other politicians where the counterparty appears as both donor AND opponent.
 * Walks the counterparty's outgoing edges, groups by target, returns targets
 * that have at least one money_for and at least one political-opposition edge.
 *
 * Excludes the current subject from the result.
 */
export function buildCrossTargets(
  graph: Graph,
  counterparty: ResolvedNode,
  excludeSubjectName: string,
  limit = 10,
): CrossTarget[] {
  const out = graph.neighbors(counterparty.name, { direction: "out", status: "active" })

  type Slot = {
    targetId: string
    targetName: string
    money_for: number
    money_against: number
    has_political_opposition: boolean
    profile_path: string | null
  }
  const byTarget = new Map<string, Slot>()

  function ensure(id: string, name: string): Slot {
    let s = byTarget.get(id)
    if (!s) {
      let profilePath: string | null = null
      try {
        const n = graph.resolve({ kind: "name", value: name })
        profilePath = n.profile_path
      } catch {
        /* skip */
      }
      s = {
        targetId: id,
        targetName: name,
        money_for: 0,
        money_against: 0,
        has_political_opposition: false,
        profile_path: profilePath,
      }
      byTarget.set(id, s)
    }
    return s
  }

  for (const e of out) {
    const c = safeClassify(e)
    const slot = ensure(e.to_id, e.to_raw)
    const amt = typeof e.amount === "number" && Number.isFinite(e.amount) ? e.amount : 0
    if (MONEY_FOR_CATEGORIES.has(c.category)) slot.money_for += amt
    else if (MONEY_AGAINST_CATEGORIES.has(c.category)) slot.money_against += amt
    if (c.category === "political-opposition" || c.category === "ie-oppose") {
      slot.has_political_opposition = true
    }
  }

  const exclude = excludeSubjectName.toLowerCase()
  const out2: CrossTarget[] = []
  for (const s of byTarget.values()) {
    const isBoth =
      s.money_for > 0 && (s.money_against > 0 || s.has_political_opposition)
    if (!isBoth) continue
    if (s.targetName.toLowerCase() === exclude) continue
    out2.push({
      subject_name: s.targetName,
      subject_profile_path: s.profile_path,
      money_for_amount: s.money_for,
      money_against_amount: s.money_against,
      has_political_opposition_edge: s.has_political_opposition,
    })
  }
  out2.sort((a, b) => {
    const aw = a.money_for_amount + a.money_against_amount
    const bw = b.money_for_amount + b.money_against_amount
    return bw - aw
  })
  return out2.slice(0, limit)
}

// ─── Story-shaped wrapper ──────────────────────────────────────────────────

interface StoryLite {
  id: string
  detector_type: string
  linked_entities: { ref: string; role: string }[]
}

/**
 * Pick the (subject, counterparty) pair to build evidence for. Some detector
 * types have a clean pair (both-sides, issue-contradiction). Others have
 * subject-only (cross-party, offshore-exposure) — for those we pick no
 * counterparty and the caller should render a degraded view.
 *
 * Returns the chosen pair plus a flag indicating whether evidence is
 * supported for this story shape.
 */
export function pickPair(story: StoryLite): {
  subject_ref: string | null
  counterparty_ref: string | null
  supported: boolean
  reason: string | null
} {
  const subject = story.linked_entities.find((e) => e.role === "subject")
  const counterparty = story.linked_entities.find((e) => e.role === "counterparty")
  if (!subject) {
    return {
      subject_ref: null,
      counterparty_ref: null,
      supported: false,
      reason: "Story has no subject entity.",
    }
  }
  if (!counterparty) {
    return {
      subject_ref: subject.ref,
      counterparty_ref: null,
      supported: false,
      reason:
        "This story has no counterparty entity (detector_type=" +
        story.detector_type +
        "). The money/evidence view is built around a subject↔counterparty pair. " +
        "For subject-only stories, use the subject's profile page directly.",
    }
  }
  return {
    subject_ref: subject.ref,
    counterparty_ref: counterparty.ref,
    supported: true,
    reason: null,
  }
}

export function buildFullEvidence(graph: Graph, story: StoryLite): FullEvidence | null {
  const pick = pickPair(story)
  if (!pick.supported || !pick.subject_ref || !pick.counterparty_ref) {
    const empty: MoneyBucket = { total_amount: 0, edge_count: 0, top_edges: [] }
    return {
      pair: {
        subject_ref: pick.subject_ref ?? "",
        counterparty_ref: pick.counterparty_ref ?? "",
        resolved: { subject: null, counterparty: null },
        unresolved_reason: pick.reason,
        money_for: empty,
        money_against: empty,
        other_money: empty,
        non_money_edges: [],
      },
      shared_donors: [],
      cross_targets: [],
      notes: pick.reason ? [pick.reason] : [],
    }
  }

  const pair = buildPairEvidence(graph, pick.subject_ref, pick.counterparty_ref)
  const notes: string[] = []
  let shared: SharedDonor[] = []
  let crossTargets: CrossTarget[] = []
  if (pair.resolved.subject && pair.resolved.counterparty) {
    shared = buildSharedDonors(graph, pair.resolved.subject, pair.resolved.counterparty, 10)
    crossTargets = buildCrossTargets(
      graph,
      pair.resolved.counterparty,
      pair.resolved.subject.name,
      10,
    )
  } else if (pair.unresolved_reason) {
    notes.push(pair.unresolved_reason)
  }
  return { pair, shared_donors: shared, cross_targets: crossTargets, notes }
}

// ─── Brief formatter (Rule 4: receipts only, no editorial framing) ─────────

function fmt(n: number): string {
  if (!Number.isFinite(n) || n === 0) return "$0"
  const abs = Math.abs(n)
  if (abs >= 1_000_000) return "$" + (n / 1_000_000).toFixed(2).replace(/\.?0+$/, "") + "M"
  if (abs >= 1_000) return "$" + (n / 1_000).toFixed(1).replace(/\.?0+$/, "") + "k"
  return "$" + n.toFixed(0)
}

/**
 * Format the evidence as a markdown brief suitable for editorial_notes.
 * Receipts only. Editorial framing placeholders are clearly marked so
 * David / Research Claude know exactly what to fill in.
 */
export function formatBrief(evidence: FullEvidence, story: StoryLite): string {
  const lines: string[] = []
  const pair = evidence.pair

  lines.push("## Evidence brief")
  lines.push(
    "_Auto-assembled from the librarian (data/relationships.jsonl + data/derived/). " +
      "Receipts only — editorial framing below is yours to write._",
  )
  lines.push("")

  if (pair.unresolved_reason) {
    lines.push("> ⚠ " + pair.unresolved_reason)
    lines.push("")
  }

  lines.push("**Subject:** " + (pair.resolved.subject?.name ?? pair.subject_ref))
  lines.push("**Counterparty:** " + (pair.resolved.counterparty?.name ?? pair.counterparty_ref))
  lines.push("")

  // Money for
  lines.push("### Money flowing FROM counterparty TO subject")
  if (pair.money_for.edge_count === 0) {
    lines.push("_No supporting-money edges found between this pair._")
  } else {
    lines.push(
      "**Total:** " +
        fmt(pair.money_for.total_amount) +
        " across " +
        pair.money_for.edge_count +
        " edge(s)",
    )
    for (const e of pair.money_for.top_edges) {
      lines.push(
        "- " +
          fmt(e.amount ?? 0) +
          " · " +
          e.label +
          " · " +
          (e.cycle ?? "?") +
          " · [" +
          e.source +
          "](" +
          (e.source_url ?? "#") +
          ")",
      )
    }
  }
  lines.push("")

  // Money against
  lines.push("### Money spent AGAINST subject by counterparty")
  if (pair.money_against.edge_count === 0) {
    lines.push("_No opposition-spending edges found between this pair._")
  } else {
    lines.push(
      "**Total:** " +
        fmt(pair.money_against.total_amount) +
        " across " +
        pair.money_against.edge_count +
        " edge(s)",
    )
    for (const e of pair.money_against.top_edges) {
      lines.push(
        "- " +
          fmt(e.amount ?? 0) +
          " · " +
          e.label +
          " · " +
          (e.cycle ?? "?") +
          " · [" +
          e.source +
          "](" +
          (e.source_url ?? "#") +
          ")",
      )
    }
  }
  lines.push("")

  // Non-monetary edges
  if (pair.non_money_edges.length > 0) {
    lines.push("### Non-monetary edges between this pair")
    for (const n of pair.non_money_edges) {
      lines.push("- " + n.label + ": " + n.count)
    }
    lines.push("")
  }

  // Shared donors
  if (evidence.shared_donors.length > 0) {
    lines.push("### Shared donors (fund both subject and counterparty)")
    for (const d of evidence.shared_donors) {
      lines.push(
        "- **" +
          d.name +
          "** — " +
          fmt(d.to_subject_amount) +
          " to subject, " +
          fmt(d.to_counterparty_amount) +
          " to counterparty",
      )
    }
    lines.push("")
  }

  // Cross-targets
  if (evidence.cross_targets.length > 0) {
    lines.push("### Counterparty also plays both sides on")
    lines.push(
      "_Other politicians where this counterparty appears as both donor AND opponent._",
    )
    for (const t of evidence.cross_targets) {
      const oppositionNote = t.has_political_opposition_edge
        ? " + political-opposition edge"
        : ""
      lines.push(
        "- **" +
          t.subject_name +
          "** — " +
          fmt(t.money_for_amount) +
          " for, " +
          fmt(t.money_against_amount) +
          " against" +
          oppositionNote,
      )
    }
    lines.push("")
  }

  // Notes
  if (evidence.notes.length > 0) {
    lines.push("### Notes")
    for (const n of evidence.notes) lines.push("- " + n)
    lines.push("")
  }

  // Editorial placeholders — Rule 4
  lines.push("---")
  lines.push("")
  lines.push("## Editorial framing _(David / Research Claude — fill in)_")
  lines.push("")
  lines.push("**Why this is a story:** _<one sentence — what makes this worth telling>_")
  lines.push("")
  lines.push("**The angle:** _<is this transactional both-sides? genuine contradiction? PAC vs entity layering? timing arbitrage?>_")
  lines.push("")
  lines.push("**What we're claiming:** _<the testable factual claim — kept narrow enough that the receipts above support it>_")
  lines.push("")

  return lines.join("\n")
}
