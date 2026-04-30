/**
 * contradictions.ts — peer-comparison helper for politicianContradictions.
 *
 * Lives outside graph.ts to keep the position-streaming pattern parallel
 * to positions.ts (votingDivergence). The Graph method calls into this
 * helper rather than importing positions.ts directly so the dependency
 * graph stays one-way (graph → contradictions → positions-files; never
 * positions → graph).
 *
 * "Find votes where target voted differently from a peer set's majority."
 * Same single-pass-per-file pattern as positions.ts: pass 1 finds the
 * target's positions, pass 2 tallies peer positions on those vote_ids.
 */
import * as fs from "node:fs"
import * as path from "node:path"
import { readJsonl } from "./loader"
import type { Position } from "./positions"
import type { ContradictionVote } from "./types"

export interface ContradictionInput {
  target_bioguide: string
  peer_bioguides: string[]
  min_peers_per_vote?: number
  congresses?: number[]
  data_dir?: string
  limit?: number
}

export interface ContradictionOutput {
  contradictions: ContradictionVote[]
  votes_evaluated: number
  missing_congresses: number[]
}

const NORMALIZE: Record<string, string> = {
  "Paired Yea": "Yea",
  "Paired Nay": "Nay",
}

function defaultPositionsDir(): string {
  return path.resolve(new URL(".", import.meta.url).pathname.replace(/^\/([A-Z]:)/, "$1"), "..", "..", "data", "legislator-positions")
}

export function findContradictionsAgainstPeers(input: ContradictionInput): ContradictionOutput {
  const dir = input.data_dir ?? defaultPositionsDir()
  const limit = input.limit ?? 25
  const minPeers = input.min_peers_per_vote ?? 3
  const peerSet = new Set(input.peer_bioguides)

  // Discover available congress files.
  const filesByCongress = new Map<number, string>()
  if (fs.existsSync(dir)) {
    for (const f of fs.readdirSync(dir)) {
      const m = /^(\d+)\.jsonl$/.exec(f)
      if (m) filesByCongress.set(Number(m[1]), path.join(dir, f))
    }
  }
  const askedCongresses = input.congresses ?? null
  const congressesToScan = askedCongresses ?? Array.from(filesByCongress.keys()).sort((a, b) => a - b)
  const missingCongresses: number[] = []
  for (const c of congressesToScan) {
    if (!filesByCongress.has(c)) missingCongresses.push(c)
  }

  // Pass 1: target's positions.
  const targetByVote = new Map<string, string>() // vote_id → normalized position
  for (const c of congressesToScan) {
    const file = filesByCongress.get(c)
    if (!file) continue
    readJsonl<Position>(file, (rec) => {
      if (rec.bioguide === input.target_bioguide) {
        const norm = NORMALIZE[rec.position] ?? rec.position
        if (norm === "Yea" || norm === "Nay") targetByVote.set(rec.vote_id, norm)
      }
    })
  }

  if (targetByVote.size === 0) {
    return { contradictions: [], votes_evaluated: 0, missing_congresses: missingCongresses }
  }

  // Pass 2: peer tallies for each vote_id the target took a position on.
  const peerTallies = new Map<string, { yea: number; nay: number }>()
  for (const c of congressesToScan) {
    const file = filesByCongress.get(c)
    if (!file) continue
    readJsonl<Position>(file, (rec) => {
      if (!peerSet.has(rec.bioguide)) return
      if (!targetByVote.has(rec.vote_id)) return
      const norm = NORMALIZE[rec.position] ?? rec.position
      if (norm !== "Yea" && norm !== "Nay") return
      let t = peerTallies.get(rec.vote_id)
      if (!t) { t = { yea: 0, nay: 0 }; peerTallies.set(rec.vote_id, t) }
      if (norm === "Yea") t.yea++
      else t.nay++
    })
  }

  // Compare per vote.
  let evaluated = 0
  const contradictions: ContradictionVote[] = []
  for (const [vote_id, position] of targetByVote) {
    const t = peerTallies.get(vote_id)
    if (!t) continue
    const total = t.yea + t.nay
    if (total < minPeers) continue
    evaluated++
    const majority = t.yea > t.nay ? "Yea" : t.nay > t.yea ? "Nay" : "Tie"
    if (majority === "Tie") continue
    if (position !== majority) {
      contradictions.push({
        vote_id,
        position,
        siblings_voted: total,
        siblings_majority: majority,
        siblings_yea: t.yea,
        siblings_nay: t.nay,
      })
    }
  }

  // Rank by lopsidedness — bigger margin = more newsworthy contradiction.
  contradictions.sort((a, b) => Math.abs(b.siblings_yea - b.siblings_nay) - Math.abs(a.siblings_yea - a.siblings_nay))

  return {
    contradictions: contradictions.slice(0, limit),
    votes_evaluated: evaluated,
    missing_congresses: missingCongresses,
  }
}
