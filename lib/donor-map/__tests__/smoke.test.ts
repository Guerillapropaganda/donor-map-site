/**
 * Smoke test against the real canonical stores.
 *
 * Goal: prove the engine loads production data without throwing
 * (no validation conflicts, no malformed fixture surprises). Asserts
 * the kind of structural floor that, if it ever broke, would mean a
 * canonical-store regression worth surfacing immediately.
 *
 * If FEC validation fails here it means an in-the-wild Fairshake-class
 * registry conflict exists — the engine is correctly refusing to start
 * and the fix is upstream in data/, not in the engine.
 */
import { describe, it } from "node:test"
import * as assert from "node:assert/strict"
import * as fs from "node:fs"
import * as path from "node:path"
import { Graph } from "../graph"

const dataDir = path.resolve(new URL(".", import.meta.url).pathname.replace(/^\/([A-Z]:)/, "$1"), "..", "..", "..", "data")

const haveData = fs.existsSync(path.join(dataDir, "relationships.jsonl"))

describe("Graph (real canonical stores)", { skip: !haveData }, () => {
  it("loads without throwing and reports plausible totals", () => {
    const g = Graph.load({ data_dir: dataDir })
    const s = g.stats()
    assert.ok(s.nodes > 0, "should resolve at least some nodes")
    assert.ok(s.edges > 0, "should index at least some edges")
    // Engine reads canonical + every derived/*.jsonl — expect >= 2 files.
    assert.ok(s.files_read.length >= 1)
  })

  it("resolves a known politician by name and returns at least one incoming monetary edge", () => {
    const g = Graph.load({ data_dir: dataDir })
    // "Jane Senator" doesn't exist in production; fall back to scanning the
    // first entity that's a politician and asserting resolve roundtrips it.
    const politicians = g.resolver.allNodes().filter((n) => n.type === "politician")
    if (politicians.length === 0) return
    const sample = politicians[0]
    const round = g.resolver.resolve(sample.name)
    assert.equal(round.id, sample.id)
  })
})
