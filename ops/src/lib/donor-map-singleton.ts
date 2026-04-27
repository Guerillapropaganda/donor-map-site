/**
 * donor-map graph engine — process singleton for the ops Next.js app.
 *
 * Loading the canonical stores costs ~1.3s on a cold call, and the data
 * doesn't change between requests (writes go through scripts/lib/*-store
 * helpers and don't touch the running ops process). So we load once,
 * cache on globalThis to survive Next.js dev-mode hot reloads, and reuse.
 *
 * 2026-04-26 fix: pass an EXPLICIT data_dir resolved from process.cwd()
 * walk-up. The library's own defaultDataDir() uses import.meta.url to
 * locate <repo>/data, which webpack rewrites in the Next.js server
 * bundle to point inside .next/server/chunks/, so the loader silently
 * read from a non-existent directory and returned empty stores. (My
 * tsx harness preserved import.meta.url and was therefore unaffected
 * — that's why the offline parity check passed but the in-route call
 * returned zero connections globally.) Resolving cwd-walk here
 * detaches us from any bundler's rewrite of source-file paths.
 */
import * as fs from "node:fs"
import * as path from "node:path"
import { Graph } from "../../../lib/donor-map"
import { isStaleSince } from "./mutation-stamp"

/** Walk up from cwd until we find a directory containing data/relationships.jsonl,
 * or fall back to two levels up (the repo root when cwd is ops/). */
function resolveDataDir(): string {
  let dir = process.cwd()
  for (let i = 0; i < 6; i++) {
    if (fs.existsSync(path.join(dir, "data", "relationships.jsonl"))) {
      return path.join(dir, "data")
    }
    const parent = path.dirname(dir)
    if (parent === dir) break
    dir = parent
  }
  return path.resolve(process.cwd(), "..", "data") // best-effort fallback
}

declare global {
  // eslint-disable-next-line no-var
  var __donor_map_graph: Graph | undefined
  // eslint-disable-next-line no-var
  var __donor_map_load_started_at: number | undefined
}

/**
 * Lazy-load the graph engine. First call pays the load cost; subsequent
 * calls return the cached instance instantly. Cache survives HMR via
 * globalThis. Returns null if the load fails — shadow callers should
 * treat that as "skip the diff this time" rather than crashing.
 */
export function getGraph(): Graph | null {
  // ADR-0024 cache-correctness: if the canonical stores have been
  // mutated since we cached this Graph, drop the cache so the next
  // call rebuilds. Cheap (one fs.readFileSync of ~70 bytes) and only
  // fires when something actually wrote to a canonical store.
  if (
    globalThis.__donor_map_graph &&
    isStaleSince(globalThis.__donor_map_load_started_at ?? 0)
  ) {
    globalThis.__donor_map_graph = undefined
  }
  if (globalThis.__donor_map_graph) return globalThis.__donor_map_graph
  try {
    globalThis.__donor_map_load_started_at = Date.now()
    const dataDir = resolveDataDir()
    const g = Graph.load({ data_dir: dataDir })
    const stats = g.stats()
    if (stats.nodes === 0 || stats.edges === 0) {
      // Don't cache an empty graph — it'd persist for the dev server's
      // lifetime and silently serve zeros forever.
      console.error(`[donor-map-singleton] Graph.load returned empty stores (nodes=${stats.nodes}, edges=${stats.edges}). data_dir=${dataDir}. Refusing to cache.`)
      return null
    }
    globalThis.__donor_map_graph = g
    return g
  } catch (err) {
    console.error("[donor-map-singleton] Graph.load failed:", err)
    return null
  }
}

/**
 * Force a reload — used by ops admin to pick up canonical-store changes
 * without restarting the dev server. Not exposed via UI yet; reserved
 * for the eventual `/api/donor-map/reload` admin route.
 */
export function reloadGraph(): Graph | null {
  globalThis.__donor_map_graph = undefined
  return getGraph()
}
