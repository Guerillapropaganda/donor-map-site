/**
 * query-engine.ts — thin Ops adapter to scripts/lib/query-engine.cjs
 *
 * The canonical query engine lives in CJS (scripts/lib/query-engine.cjs)
 * so it can be used by both Node scripts and the Quartz build. Next/Ops
 * pulls it in via createRequire so we don't need to maintain a parallel
 * TS implementation.
 *
 * IMPORTANT — LAZY LOAD:
 * The CJS require() is deferred until createQueryEngine() is actually
 * called. If we resolved it at module-load time, `next build` would
 * fail during "Collecting page data" because the build-time evaluator
 * runs every route module to discover its export shape, and
 * createRequire(absolute-path-outside-webpack) throws MODULE_NOT_FOUND
 * in that context. Lazy-loading means module load is side-effect-free
 * and the require only fires at actual request time, where Node's
 * createRequire works correctly.
 *
 * Caught by the ops-build CI job on 2026-04-15 — run 24432519675.
 *
 * If Phase 6 swaps the in-memory backend to SQLite, only the CJS file
 * changes — this adapter stays put.
 */

import { createRequire } from "module"
import path from "path"

let _engineModule: any = null

function loadEngineModule() {
  if (_engineModule) return _engineModule

  // Use process.cwd() as the createRequire base rather than import.meta.url.
  // In Next.js dev mode the latter resolves to a webpack chunk URL that
  // createRequire can't use to resolve node_modules or downstream relative
  // requires inside the CJS file — even when we pass an absolute path, the
  // transitive require('./relationships-store.cjs') fails.
  // process.cwd() is always a real filesystem directory.
  const cwd = process.cwd()
  const anchorPath = path.join(cwd, "package.json")
  // createRequire needs a file path or file:// URL — using a pseudo "package.json"
  // anchor in cwd is always valid. If package.json doesn't exist at cwd, fall
  // back to the dir itself (createRequire accepts a directory on most Node versions).
  const fs = require("fs") as typeof import("fs")
  const anchor = fs.existsSync(anchorPath) ? anchorPath : path.join(cwd, "index.js")
  const req = createRequire(anchor)

  function findRepoRoot(startDir: string): string {
    let dir = startDir
    for (let i = 0; i < 8; i++) {
      if (fs.existsSync(path.join(dir, "scripts", "lib", "query-engine.cjs"))) return dir
      if (fs.existsSync(path.join(dir, ".git"))) return dir
      const parent = path.dirname(dir)
      if (parent === dir) break
      dir = parent
    }
    return startDir
  }

  const root = findRepoRoot(cwd)
  const enginePath = path.join(root, "scripts", "lib", "query-engine.cjs")
  if (!fs.existsSync(enginePath)) {
    throw new Error(
      `query-engine.cjs not found. Tried: ${enginePath}. cwd=${cwd}. ` +
        `Ensure the Ops dev server was started from the repo root or ops/ directory.`,
    )
  }
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  _engineModule = req(enginePath)
  return _engineModule
}

export const createQueryEngine: () => any = () => loadEngineModule().createQueryEngine()

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
