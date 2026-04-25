/**
 * Shadow comparator for the /api/profile/edges read path.
 *
 * Per ADR-0024 §"Migration strategy" step 2 — every old read also calls
 * the new library and logs the diff. We do NOT change what the client
 * sees yet. The goal is one week of diffs to walk with David before the
 * cutover.
 *
 * Scope this session: the `related` field only. It's the simplest
 * semantic (type === 'related', profile is `from`) and the cleanest
 * baseline for proving the shadow harness works end-to-end. Adding
 * donors / politicians-funded requires porting the edge-role-taxonomy
 * classifier from CJS to TS — deferred to a follow-up session.
 */
import { promises as fs } from "node:fs"
import * as path from "node:path"
import { getGraph } from "./donor-map-singleton"

const LOG_PATH = path.join(
  process.cwd(),
  "..",
  "content",
  "Admin Notes",
  "profile-shadow-diff-log.jsonl",
)

export interface RelatedDiff {
  /** Profile title the request asked about (post-normalization). */
  title: string
  /** Names in librarian's answer but not in cache's. */
  only_in_librarian: string[]
  /** Names in cache's answer but not in librarian's. */
  only_in_cache: string[]
  /** Total counts on each side, for quick at-a-glance health. */
  counts: { librarian: number; cache: number }
  /** ISO timestamp. */
  ts: string
  /** True iff the lists agree (regardless of order). */
  agree: boolean
}

/**
 * Compute the librarian's `related` answer for a given profile title and
 * compare against the cache's answer. Returns the diff.
 *
 * If the librarian can't be loaded (smoke-mode failure, validation
 * error), returns null — caller should treat that as "skip" not "fail."
 */
export function shadowRelated(title: string, cacheRelated: string[]): RelatedDiff | null {
  const graph = getGraph()
  if (!graph) return null

  const node = graph.resolver.tryResolve({ kind: "name", value: title })
  if (!node) {
    // The librarian doesn't know this profile by name. Common during
    // ambiguous-alias collisions; logged so we can see how often.
    return {
      title,
      only_in_librarian: [],
      only_in_cache: cacheRelated,
      counts: { librarian: 0, cache: cacheRelated.length },
      ts: new Date().toISOString(),
      agree: cacheRelated.length === 0,
    }
  }

  const edges = graph.neighbors(node.id, {
    edge_types: ["related"],
    direction: "out",
  })

  // Project to display names — match the cache's "list of strings" shape.
  // Use raw to-name from the edge so we compare against what the rebuilder
  // actually wrote, not the resolver's canonical name (which may differ
  // for aliased entities and would create false-positive diffs).
  const librarianNames = new Set<string>()
  for (const e of edges) librarianNames.add(e.to_raw)

  const cacheSet = new Set(cacheRelated)

  const only_in_librarian = [...librarianNames].filter((n) => !cacheSet.has(n)).sort()
  const only_in_cache = [...cacheSet].filter((n) => !librarianNames.has(n)).sort()

  return {
    title,
    only_in_librarian,
    only_in_cache,
    counts: { librarian: librarianNames.size, cache: cacheSet.size },
    ts: new Date().toISOString(),
    agree: only_in_librarian.length === 0 && only_in_cache.length === 0,
  }
}

/**
 * Append a diff to the log. Fire-and-forget — never blocks the response.
 * Skips writing on agree=true unless `LOG_AGREES=1` is set, to keep the
 * log focused on actionable disagreements.
 */
export async function logDiff(diff: RelatedDiff): Promise<void> {
  if (diff.agree && process.env.LOG_AGREES !== "1") return
  try {
    await fs.appendFile(LOG_PATH, JSON.stringify(diff) + "\n", "utf-8")
  } catch (err) {
    console.error("[donor-map-shadow] log append failed:", err)
  }
}
