import { describe, it } from "node:test"
import * as assert from "node:assert/strict"
import * as fs from "node:fs"
import * as os from "node:os"
import * as path from "node:path"
import { computeVotingDivergence } from "../positions"

/**
 * Build a temporary `data/legislator-positions/` directory with synthetic
 * position files so the divergence query can be tested without 700MB of
 * voteview data.
 */
function makePositionFixture(rows: Array<Record<string, string>>, congress = 99): string {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "positions-"))
  const file = path.join(tmpDir, `${congress}.jsonl`)
  fs.writeFileSync(file, rows.map((r) => JSON.stringify(r)).join("\n") + "\n")
  return tmpDir
}

describe("computeVotingDivergence", () => {
  it("counts participation correctly and skips Not Voting", () => {
    const dir = makePositionFixture([
      { vote_id: "v1", bioguide: "X001", position: "Yea", party: "D", state: "CA" },
      { vote_id: "v2", bioguide: "X001", position: "Nay", party: "D", state: "CA" },
      { vote_id: "v3", bioguide: "X001", position: "Not Voting", party: "D", state: "CA" },
      // Some same-party context so v1/v2 have a majority
      { vote_id: "v1", bioguide: "Y001", position: "Yea", party: "D", state: "NY" },
      { vote_id: "v1", bioguide: "Y002", position: "Yea", party: "D", state: "NY" },
      { vote_id: "v2", bioguide: "Y001", position: "Nay", party: "D", state: "NY" },
      { vote_id: "v2", bioguide: "Y002", position: "Nay", party: "D", state: "NY" },
    ])
    const r = computeVotingDivergence("X001", { data_dir: dir })
    assert.equal(r.votes_participated, 2, "Not Voting excluded")
    assert.equal(r.votes_diverged, 0, "X001 voted with party majority both times")
  })

  it("flags divergent votes when target votes against party majority", () => {
    const dir = makePositionFixture([
      // v1: target votes Nay; party majority Yea (3-1) → divergent
      { vote_id: "v1", bioguide: "TGT", position: "Nay", party: "R", state: "TX" },
      { vote_id: "v1", bioguide: "M1", position: "Yea", party: "R", state: "TX" },
      { vote_id: "v1", bioguide: "M2", position: "Yea", party: "R", state: "TX" },
      { vote_id: "v1", bioguide: "M3", position: "Yea", party: "R", state: "TX" },
      // v2: target votes Yea; party majority Yea (2-1) → not divergent
      { vote_id: "v2", bioguide: "TGT", position: "Yea", party: "R", state: "TX" },
      { vote_id: "v2", bioguide: "M1", position: "Yea", party: "R", state: "TX" },
      { vote_id: "v2", bioguide: "M2", position: "Nay", party: "R", state: "TX" },
    ])
    const r = computeVotingDivergence("TGT", { data_dir: dir })
    assert.equal(r.votes_diverged, 1)
    assert.equal(r.top_divergent[0].vote_id, "v1")
    assert.equal(r.top_divergent[0].position, "Nay")
    assert.equal(r.top_divergent[0].party_majority, "Yea")
    assert.equal(r.top_divergent[0].party_yea, 3)
  })

  it("ignores cross-party tallies when computing majority", () => {
    const dir = makePositionFixture([
      // Target is R, votes Nay. Same-party (R) is split 0-1 — but the
      // opposing-party (D) has many Yea. Without cross-party isolation
      // the algorithm would mistakenly think Yea was the majority.
      { vote_id: "v1", bioguide: "TGT", position: "Nay", party: "R", state: "OH" },
      { vote_id: "v1", bioguide: "DEM1", position: "Yea", party: "D", state: "CA" },
      { vote_id: "v1", bioguide: "DEM2", position: "Yea", party: "D", state: "NY" },
      { vote_id: "v1", bioguide: "DEM3", position: "Yea", party: "D", state: "WA" },
    ])
    const r = computeVotingDivergence("TGT", { data_dir: dir })
    // Only the target's own R vote counted toward party majority — Nay 1-0.
    // Target voted Nay → matched majority → 0 divergent.
    assert.equal(r.votes_diverged, 0, "cross-party D yeas didn't bleed in")
  })

  it("handles tie votes by skipping (no clear majority)", () => {
    const dir = makePositionFixture([
      { vote_id: "v1", bioguide: "TGT", position: "Yea", party: "I", state: "VT" },
      { vote_id: "v1", bioguide: "I2", position: "Nay", party: "I", state: "ME" },
    ])
    const r = computeVotingDivergence("TGT", { data_dir: dir })
    assert.equal(r.votes_participated, 1)
    assert.equal(r.votes_diverged, 0, "tie votes skip divergence detection")
  })

  it("returns empty result + missing_congresses for unknown bioguide", () => {
    const dir = makePositionFixture([
      { vote_id: "v1", bioguide: "OTHER", position: "Yea", party: "D", state: "CA" },
    ])
    const r = computeVotingDivergence("NOPE", { data_dir: dir, congresses: [99, 200] })
    assert.equal(r.votes_participated, 0)
    assert.deepEqual(r.missing_congresses, [200])
  })

  it("ranks top_divergent by party-vote margin", () => {
    const dir = makePositionFixture([
      // v1: target diverges with party 5-1 majority Yea (margin 4)
      { vote_id: "v1", bioguide: "TGT", position: "Nay", party: "D", state: "NY" },
      { vote_id: "v1", bioguide: "A", position: "Yea", party: "D", state: "NY" },
      { vote_id: "v1", bioguide: "B", position: "Yea", party: "D", state: "NY" },
      { vote_id: "v1", bioguide: "C", position: "Yea", party: "D", state: "NY" },
      { vote_id: "v1", bioguide: "D1", position: "Yea", party: "D", state: "NY" },
      { vote_id: "v1", bioguide: "E", position: "Yea", party: "D", state: "NY" },
      // v2: target diverges with party 3-2 majority Yea (margin 1, including target's Nay in tally)
      { vote_id: "v2", bioguide: "TGT", position: "Nay", party: "D", state: "NY" },
      { vote_id: "v2", bioguide: "A", position: "Yea", party: "D", state: "NY" },
      { vote_id: "v2", bioguide: "B", position: "Yea", party: "D", state: "NY" },
      { vote_id: "v2", bioguide: "C", position: "Yea", party: "D", state: "NY" },
      { vote_id: "v2", bioguide: "D2", position: "Nay", party: "D", state: "NY" },
    ])
    const r = computeVotingDivergence("TGT", { data_dir: dir })
    assert.equal(r.votes_diverged, 2)
    assert.equal(r.top_divergent[0].vote_id, "v1", "lopsided party vote ranks higher")
    assert.equal(r.top_divergent[1].vote_id, "v2")
  })
})
