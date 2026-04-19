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

let _engineModule: any = null

function loadEngineModule() {
  if (_engineModule) return _engineModule

  // Escape webpack module resolution. Next.js bundles imports from
  // "module" and "fs" into runtime stubs that mis-resolve filesystem
  // paths. Using (0, eval)("require") gets the real Node require()
  // at request time, untransformed. All three calls (path, fs, and
  // the engine itself) live inside this lazy function so module-load
  // stays side-effect-free for next-build's page-data phase.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const nodeRequire: NodeRequire = (0, eval)("require")
  const path: typeof import("path") = nodeRequire("path")
  const fs: typeof import("fs") = nodeRequire("fs")

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

  const cwd = process.cwd()
  const root = findRepoRoot(cwd)
  const enginePath = path.join(root, "scripts", "lib", "query-engine.cjs")
  if (!fs.existsSync(enginePath)) {
    throw new Error(
      `query-engine.cjs not found. Tried: ${enginePath}. cwd=${cwd}. ` +
        `Ensure the Ops dev server was started from the repo root or ops/.`,
    )
  }
  _engineModule = nodeRequire(enginePath)
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
