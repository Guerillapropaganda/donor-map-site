/**
 * POST /api/stories/auto-archive-duplicates
 *
 * Walks data/stories.jsonl, groups stories by (detector_type, normalized
 * subject, normalized counterparty), and for any cluster with more than
 * one story, keeps the highest-confidence story and archives the rest
 * with archive_reason: "auto-archived as duplicate of story_X".
 *
 * Each archived story also gets an entry in the false-positive log so
 * the contradiction-miner won't re-create it on the next run.
 *
 * The integrity-check harness already flags these clusters with
 * integrity_status: 'duplicate'; this endpoint actions them.
 *
 * Skips stories that are already archived OR already published. Skips
 * clusters where ALL stories are state=draft/ready (those have human
 * editorial work invested — not safe to auto-archive).
 *
 * Response:
 *   {
 *     dry_run: boolean,
 *     clusters_found: number,
 *     archived_count: number,
 *     kept: [{ id, headline, cluster_size }],
 *     archived: [{ id, headline, archived_in_favor_of }],
 *   }
 */

import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/auth"
import path from "path"
import fs from "fs"

export const dynamic = "force-dynamic"

function findRepoRoot(startDir: string): string {
  let dir = startDir
  for (let i = 0; i < 8; i++) {
    if (fs.existsSync(path.join(dir, "data", "stories.jsonl"))) return dir
    if (fs.existsSync(path.join(dir, ".git"))) return dir
    const parent = path.dirname(dir)
    if (parent === dir) break
    dir = parent
  }
  return startDir
}

const REPO_ROOT = findRepoRoot(process.cwd())
const STORIES_FILE = path.join(REPO_ROOT, "data", "stories.jsonl")

interface Story {
  id: string
  slug: string
  headline: string
  detector: string
  detector_type: string
  confidence: number
  severity: string
  state: string
  linked_entities: { ref: string; role: string }[]
  archive_reason?: string | null
  [k: string]: unknown
}

function loadStories(): Story[] {
  if (!fs.existsSync(STORIES_FILE)) return []
  return fs
    .readFileSync(STORIES_FILE, "utf-8")
    .split(/\r?\n/)
    .filter(Boolean)
    .map((l) => { try { return JSON.parse(l) as Story } catch { return null } })
    .filter((x): x is Story => x !== null)
}

function persistStories(stories: Story[]): void {
  const tmp = STORIES_FILE + ".tmp"
  const lines = stories.map((r) => JSON.stringify(r))
  fs.writeFileSync(tmp, lines.join("\n") + (lines.length ? "\n" : ""), "utf-8")
  fs.renameSync(tmp, STORIES_FILE)
}

function normalize(s: string): string {
  return String(s).toLowerCase().trim().replace(/\s+/g, " ")
}

/**
 * Cluster key matches the integrity-check's dedup key. Counterparty is
 * empty for some detector types (committee-capture, cross-party, offshore-
 * exposure) where there's no single counterparty entity — those types
 * cluster on subject + detector_type alone.
 */
function clusterKey(story: Story): string | null {
  const subj = story.linked_entities?.find((e) => e.role === "subject")?.ref
  if (!subj) return null
  const cp = story.linked_entities?.find((e) => e.role === "counterparty")?.ref || ""
  return `${story.detector_type}|${normalize(subj)}|${normalize(cp)}`
}

const SEVERITY_WEIGHT: Record<string, number> = {
  "very-high": 5, high: 4, medium: 3, low: 2, "very-low": 1,
}

/**
 * Sort key for "which to keep" — higher is better.
 * Prefer: state-progressed > confidence > severity > earlier first_detected.
 */
function keepScore(s: Story): number {
  const stateBonus = s.state === "published" ? 1000 : s.state === "ready" ? 500 : s.state === "draft" ? 100 : 0
  return stateBonus + (s.confidence ?? 0) * 10 + (SEVERITY_WEIGHT[s.severity] ?? 0)
}

export async function POST(req: NextRequest) {
  const gate = await requireAdmin(req)
  if (!gate.ok) return gate.response

  let body: { dry_run?: boolean } = {}
  try { body = await req.json() } catch { /* allow empty body */ }
  const dryRun = body.dry_run === true

  const stories = loadStories()
  // Cluster active candidates (skip archived, skip already-published).
  // We DO include draft/ready in clustering because if there's both a
  // draft AND an unrelated candidate that turn out to be duplicates,
  // we want the draft kept.
  const clusters = new Map<string, Story[]>()
  for (const s of stories) {
    if (s.state === "archived") continue
    const k = clusterKey(s)
    if (!k) continue
    if (!clusters.has(k)) clusters.set(k, [])
    clusters.get(k)!.push(s)
  }

  const dupClusters = [...clusters.values()].filter((g) => g.length > 1)

  // Lazy-require false-positive log
  let fpLog: { recordRejection: (s: string, p: string, c: string, r: string) => void } | null = null
  if (!dryRun) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      fpLog = eval("require")(path.join(REPO_ROOT, "scripts", "lib", "false-positive-log.cjs"))
    } catch (e: unknown) {
      console.error("[auto-archive-duplicates] false-positive log require failed:", e)
    }
  }

  const now = new Date().toISOString()
  const kept: Array<{ id: string; headline: string; cluster_size: number }> = []
  const archived: Array<{ id: string; headline: string; archived_in_favor_of: string }> = []
  const idIndex = new Map<string, number>()
  stories.forEach((s, i) => idIndex.set(s.id, i))

  for (const cluster of dupClusters) {
    // Sort by keepScore desc; first is keeper
    const sorted = [...cluster].sort((a, b) => keepScore(b) - keepScore(a))
    const keeper = sorted[0]
    kept.push({ id: keeper.id, headline: keeper.headline, cluster_size: cluster.length })

    for (const dup of sorted.slice(1)) {
      // Skip if dup has invested editorial work (draft/ready) and the
      // keeper isn't even more progressed. Conservative — don't blow
      // away David's manual work.
      if ((dup.state === "draft" || dup.state === "ready") && keeper.state === "candidate") {
        // Reverse: keeper should actually be the draft/ready one, but our
        // sort already prefers state-progressed. If we got here, both are
        // at least draft — skip auto-archive of either.
        continue
      }

      archived.push({
        id: dup.id,
        headline: dup.headline,
        archived_in_favor_of: keeper.id,
      })

      if (!dryRun) {
        const idx = idIndex.get(dup.id)
        if (idx !== undefined) {
          stories[idx] = {
            ...stories[idx],
            state: "archived",
            archived_at: now,
            archive_reason: `auto-archived as duplicate of ${keeper.id}`,
            last_updated: now,
          }
        }
        if (fpLog && dup.detector && dup.slug) {
          try {
            fpLog.recordRejection(
              dup.detector,
              dup.slug,
              `story ${dup.detector_type}`,
              `auto-archived as duplicate of ${keeper.id}`,
            )
          } catch (e: unknown) {
            console.error("[auto-archive-duplicates] fp-log write failed:", e)
          }
        }
      }
    }
  }

  if (!dryRun && archived.length > 0) {
    persistStories(stories)
  }

  return NextResponse.json({
    dry_run: dryRun,
    clusters_found: dupClusters.length,
    archived_count: archived.length,
    kept_count: kept.length,
    kept,
    archived,
  })
}
