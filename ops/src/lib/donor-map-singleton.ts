/**
 * donor-map graph engine — process singleton for the ops Next.js app.
 *
 * Loading the canonical stores costs ~1.3s on a cold call, and the data
 * doesn't change between requests (writes go through scripts/lib/*-store
 * helpers and don't touch the running ops process). So we load once,
 * cache on globalThis to survive Next.js dev-mode hot reloads, and reuse.
 *
 * Per ADR-0024 §"Migration strategy" — the engine is in shadow mode here.
 * Nothing user-visible reads from it yet; consumers will diff against the
 * existing read paths and cut over once the diffs are reviewed.
 */
import { Graph } from "../../../lib/donor-map"

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
  if (globalThis.__donor_map_graph) return globalThis.__donor_map_graph
  try {
    globalThis.__donor_map_load_started_at = Date.now()
    const g = Graph.load()
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
