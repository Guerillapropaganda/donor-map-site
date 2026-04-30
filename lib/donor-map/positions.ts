/**
 * positions.ts — per-legislator vote position store.
 *
 * Reads `data/legislator-positions/{congress}.jsonl` files (output of
 * scripts/ingest-voteview-bulk.cjs). Position rows are too high-volume
 * for the relationships graph (~4.79M for congresses 108-114), so they
 * live in a parallel store that's loaded on demand for vote-divergence
 * queries rather than indexed into the graph.
 *
 * Per row shape (matches voteview ingest output):
 *   { vote_id, bioguide, position, party, state }
 *
 * `position` values: "Yea", "Nay", "Not Voting", "Present", "Paired Yea",
 * "Paired Nay" (per Voteview cast_code mapping).
 */
import * as fs from "node:fs"
import * as path from "node:path"
import { readJsonl } from "./loader"

export interface Position {
  vote_id: string
  bioguide: string
  position: string
  party: string
  state: string
}

export interface VotingDivergenceOpts {
  /** Limit to these congresses. Default: all available. */
  congresses?: number[]
  /** Cap on returned divergent-vote details. Default 25. */
  limit?: number
  /** Override the data dir (mostly for tests). */
  data_dir?: string
}

export interface DivergentVote {
  vote_id: string
  position: string
  party_majority: string
  party_yea: number
  party_nay: number
}

export interface VotingDivergenceResult {
  bioguide: string
  votes_participated: number
  votes_diverged: number
  divergence_rate: number
  top_divergent: DivergentVote[]
  /** Congresses scanned for this query. */
  congresses: number[]
  /** Honest data-gap signal: which congresses asked for had no positions file. */
  missing_congresses: number[]
}

const COUNTS_AS_VOTE = new Set(["Yea", "Nay", "Paired Yea", "Paired Nay"])
const NORMALIZE: Record<string, string> = {
  "Paired Yea": "Yea",
  "Paired Nay": "Nay",
}

function defaultPositionsDir(): string {
  return path.resolve(new URL(".", import.meta.url).pathname.replace(/^\/([A-Z]:)/, "$1"), "..", "..", "data", "legislator-positions")
}

/**
 * Compute voting-divergence stats for a single legislator (by bioguide).
 *
 * Algorithm: streams every relevant {congress}.jsonl in two passes per file —
 *   1. Find every vote_id the target voted on, plus their position.
 *   2. Re-scan to build same-party Yea/Nay tallies for those vote_ids.
 *
 * For each vote:
 *   - Compare target's normalized position (Yea/Nay) to party majority
 *     (more Yea than Nay among same-party legislators on the same vote).
 *   - "Diverged" = target voted differently from party majority.
 *   - Skip votes the target abstained on (Not Voting / Present) — they
 *     can't diverge from a position they didn't take.
 *
 * Returns stats + the top-N most-divergent votes.
 *
 * Cost: ~5-15s cold for the full 108-114 corpus (4.79M rows). Cache the
 * result at the route layer if calling repeatedly.
 */
export function computeVotingDivergence(bioguide: string, opts: VotingDivergenceOpts = {}): VotingDivergenceResult {
  const dir = opts.data_dir ?? defaultPositionsDir()
  const limit = opts.limit ?? 25
  const askedCongresses = opts.congresses ?? null

  // Discover available congress files.
  const filesByCongress = new Map<number, string>()
  if (fs.existsSync(dir)) {
    for (const f of fs.readdirSync(dir)) {
      const m = /^(\d+)\.jsonl$/.exec(f)
      if (m) filesByCongress.set(Number(m[1]), path.join(dir, f))
    }
  }
  const congressesToScan = askedCongresses ?? Array.from(filesByCongress.keys()).sort((a, b) => a - b)
  const missingCongresses: number[] = []
  for (const c of congressesToScan) {
    if (!filesByCongress.has(c)) missingCongresses.push(c)
  }

  // Pass 1: find the target's positions.
  const targetByVote = new Map<string, { position: string; party: string }>()
  for (const c of congressesToScan) {
    const file = filesByCongress.get(c)
    if (!file) continue
    readJsonl<Position>(file, (rec) => {
      if (rec.bioguide === bioguide) {
        targetByVote.set(rec.vote_id, { position: rec.position, party: rec.party })
      }
    })
  }

  if (targetByVote.size === 0) {
    return {
      bioguide,
      votes_participated: 0,
      votes_diverged: 0,
      divergence_rate: 0,
      top_divergent: [],
      congresses: congressesToScan,
      missing_congresses: missingCongresses,
    }
  }

  // Pass 2: same-party tallies for each vote_id the target was in.
  /** vote_id -> { yea, nay } among target's party */
  const partyTallies = new Map<string, { yea: number; nay: number }>()
  const targetParty = (() => {
    const counts: Record<string, number> = {}
    for (const { party } of targetByVote.values()) counts[party] = (counts[party] ?? 0) + 1
    let best = ""; let bestN = -1
    for (const [p, n] of Object.entries(counts)) if (n > bestN) { best = p; bestN = n }
    return best
  })()

  for (const c of congressesToScan) {
    const file = filesByCongress.get(c)
    if (!file) continue
    readJsonl<Position>(file, (rec) => {
      if (!targetByVote.has(rec.vote_id)) return
      if (rec.party !== targetParty) return
      const norm = NORMALIZE[rec.position] ?? rec.position
      if (norm !== "Yea" && norm !== "Nay") return
      let t = partyTallies.get(rec.vote_id)
      if (!t) { t = { yea: 0, nay: 0 }; partyTallies.set(rec.vote_id, t) }
      if (norm === "Yea") t.yea++
      else t.nay++
    })
  }

  // Compare per-vote
  let participated = 0
  const divergent: DivergentVote[] = []
  for (const [vote_id, { position }] of targetByVote) {
    const norm = NORMALIZE[position] ?? position
    if (!COUNTS_AS_VOTE.has(position)) continue
    participated++
    const t = partyTallies.get(vote_id)
    if (!t) continue // shouldn't happen — the target's own vote was tallied
    const majority = t.yea > t.nay ? "Yea" : t.nay > t.yea ? "Nay" : "Tie"
    if (majority === "Tie") continue
    if (norm !== majority) {
      divergent.push({
        vote_id,
        position: norm,
        party_majority: majority,
        party_yea: t.yea,
        party_nay: t.nay,
      })
    }
  }

  // Rank top-N by margin of party majority (the more lopsided the party
  // vote, the more interesting the divergence).
  divergent.sort((a, b) => Math.abs(b.party_yea - b.party_nay) - Math.abs(a.party_yea - a.party_nay))

  return {
    bioguide,
    votes_participated: participated,
    votes_diverged: divergent.length,
    divergence_rate: participated > 0 ? divergent.length / participated : 0,
    top_divergent: divergent.slice(0, limit),
    congresses: congressesToScan,
    missing_congresses: missingCongresses,
  }
}
