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

import fs from "fs"
import path from "path"
import { pathToFileURL } from "url"

// Turbopack and webpack both refuse to let us require() an arbitrary
// absolute path at runtime — they rewrite require into a bundler-aware
// stub that only knows about modules collected at build time. Dynamic
// import() is the native Node ESM escape hatch: Node loads file:// URLs
// directly off disk, CJS interop wraps the exports as default.
let _engineModulePromise: Promise<any> | null = null

function loadEngineModule(): Promise<any> {
  if (_engineModulePromise) return _engineModulePromise

  _engineModulePromise = (async () => {
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
        `query-engine.cjs not found. Tried: ${enginePath}. cwd=${cwd}.`,
      )
    }

    const url = pathToFileURL(enginePath).href
    try {
      const mod = await import(/* webpackIgnore: true */ /* @vite-ignore */ url)
      // CJS interop: Node wraps module.exports in `default` when imported
      // from ESM. Fall through to the top-level object if not.
      return mod.default ?? mod
    } catch (err) {
      const e = err as Error & { code?: string }
      throw new Error(
        `Failed to load query-engine.cjs: ${e.message}. url=${url} code=${e.code || "unknown"}`,
      )
    }
  })()

  return _engineModulePromise
}

export const createQueryEngine: () => Promise<any> = async () =>
  (await loadEngineModule()).createQueryEngine()

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
