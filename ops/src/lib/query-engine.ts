/**
 * query-engine.ts — thin Ops adapter to scripts/lib/query-engine.cjs
 *
 * The canonical query engine lives in CJS (scripts/lib/query-engine.cjs)
 * so it can be used by both Node scripts and the Quartz build. Next/Ops
 * pulls it in via createRequire so we don't need to maintain a parallel
 * TS implementation.
 *
 * If Phase 6 swaps the in-memory backend to SQLite, only the CJS file
 * changes — this adapter stays put.
 */

import { createRequire } from "module"
import path from "path"

const require = createRequire(import.meta.url)

function findRepoRoot(startDir: string): string {
  let dir = startDir
  const fs = require("fs")
  for (let i = 0; i < 8; i++) {
    if (fs.existsSync(path.join(dir, "scripts", "lib", "query-engine.cjs"))) return dir
    if (fs.existsSync(path.join(dir, ".git"))) return dir
    const parent = path.dirname(dir)
    if (parent === dir) break
    dir = parent
  }
  return startDir
}

const root = findRepoRoot(process.cwd())
const enginePath = path.join(root, "scripts", "lib", "query-engine.cjs")

// eslint-disable-next-line @typescript-eslint/no-var-requires
const engineModule = require(enginePath)
export const createQueryEngine: () => any = engineModule.createQueryEngine

export type QuerySpec = {
  subject:
    | "edges"
    | "entities"
    | "events"
    | "cross_party_donors"
    | "timing_proximity"
    | "top_opposition_donors"
  filters?: Record<string, any>
}

export type QueryResult = {
  subject: string
  total: number
  returned: number
  rows: any[]
}
