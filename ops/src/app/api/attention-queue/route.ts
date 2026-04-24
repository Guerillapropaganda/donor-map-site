import { NextResponse } from "next/server"
import fs from "fs"
import path from "path"

/**
 * /api/attention-queue — returns the current ranked Attention Queue
 *
 * Reads content/Admin Notes/.attention-queue-store.json (the structured
 * JSON backing store managed by scripts/lib/attention-queue.cjs) and
 * flattens + ranks the entries into a format the /attention page
 * and the dashboard card can render.
 */

function getStorePath(): string {
  // Ops app runs from ops/, content is at ../content
  const fromOps = path.resolve(process.cwd(), "..", "content", "Admin Notes", ".attention-queue-store.json")
  if (fs.existsSync(fromOps)) return fromOps
  const fromRoot = path.resolve(process.cwd(), "content", "Admin Notes", ".attention-queue-store.json")
  return fromRoot
}

interface AttentionEntry {
  bucket: "blocking" | "deciding" | "compounding"
  what: string
  why: string
  where: string
  cost_min: number
  leverage: number
  source: string
  created: string
  metadata?: Record<string, unknown>
}

export async function GET() {
  const storePath = getStorePath()

  if (!fs.existsSync(storePath)) {
    return NextResponse.json({
      total: 0,
      buckets: { blocking: [], deciding: [], compounding: [] },
      ranked: [],
      sources: [],
      lastUpdated: null,
      empty: true,
    })
  }

  let store: Record<string, AttentionEntry[]> = {}
  try {
    store = JSON.parse(fs.readFileSync(storePath, "utf-8"))
  } catch (e) {
    return NextResponse.json(
      { error: "Failed to parse attention queue store", details: (e as Error).message },
      { status: 500 }
    )
  }

  // Flatten
  const all: AttentionEntry[] = []
  for (const entries of Object.values(store)) {
    for (const e of entries) all.push(e)
  }

  // Rank: blocking first, then by leverage / cost_min ratio
  const bucketRank: Record<string, number> = { blocking: 0, deciding: 1, compounding: 2 }
  all.sort((a, b) => {
    const bDiff = (bucketRank[a.bucket] ?? 99) - (bucketRank[b.bucket] ?? 99)
    if (bDiff !== 0) return bDiff
    const aRatio = a.leverage / a.cost_min
    const bRatio = b.leverage / b.cost_min
    return bRatio - aRatio
  })

  // Per-source freshness: newest entry's `created` timestamp per source.
  // Avoids the "store file mtime lies about per-producer freshness" bug
  // (P-026): if any producer writes, the file mtime updates, making the
  // whole queue look fresh when individual sources may be days stale.
  const perSourceLastUpdated: Record<string, string | null> = {}
  for (const [src, entries] of Object.entries(store)) {
    const newest = entries.reduce<number>((max, e) => {
      const t = e.created ? new Date(e.created).getTime() : 0
      return t > max ? t : max
    }, 0)
    perSourceLastUpdated[src] = newest > 0 ? new Date(newest).toISOString() : null
  }

  // Overall "last updated" is the newest entry across all sources (the
  // freshest thing in the queue), NOT the file mtime.
  const overallLastUpdated = Object.values(perSourceLastUpdated)
    .filter((x): x is string => !!x)
    .sort()
    .pop() || null

  const stat = fs.statSync(storePath)
  return NextResponse.json({
    total: all.length,
    buckets: {
      blocking: all.filter((e) => e.bucket === "blocking"),
      deciding: all.filter((e) => e.bucket === "deciding"),
      compounding: all.filter((e) => e.bucket === "compounding"),
    },
    ranked: all,
    sources: Object.keys(store),
    // `lastUpdated` is now per-entry-based, not file-mtime-based
    lastUpdated: overallLastUpdated,
    perSourceLastUpdated,
    // Kept for backwards compat if anything depends on it — file mtime
    // still means "queue was last written to" which is different from
    // "newest entry in queue" (perSourceLastUpdated is the latter)
    storeMtime: stat.mtime.toISOString(),
    empty: false,
  })
}
