import fs from "node:fs"
import path from "node:path"
import { readStore } from "./beat-verifications"
import type { BeatRecord } from "./beats-catalog"

/**
 * Preflight gates for "publish this beat".
 *
 * Each gate returns pass/fail/info plus a one-line explanation. The
 * Publish button is disabled until every blocking gate passes.
 *
 * Blocking gates (must be green to publish):
 *   - prototype HTML file exists
 *   - all Editor-lane verifications resolved (verified or wontfix)
 *   - prototype HTML em-dash count = 0 (per editorial standard)
 *   - data/public-routes.json readable
 *
 * Informational gates (display only, do not block):
 *   - already in public-routes.json (means already live)
 *   - companion donor-list HTML exists, if declared
 *   - non-Editor lane verifications still open (Time-based, Code Claude,
 *     Perplexity) - these don't block since they're tracked separately
 */

export interface PreflightGate {
  /** Stable id for the row */
  id: string
  /** Short label, brutalist style */
  label: string
  /** One-line explanation of pass/fail */
  detail: string
  /** "pass" / "fail" / "info" */
  status: "pass" | "fail" | "info"
  /** True if this gate blocks publishing when failed */
  blocking: boolean
}

export interface PreflightResult {
  gates: PreflightGate[]
  /** True if every blocking gate passed and the beat is not already live */
  canPublish: boolean
  /** True if the beat slug is already in public-routes.json */
  isLive: boolean
  /** Count of failed blocking gates */
  failingCount: number
}

const REPO_ROOT = path.join(process.cwd(), "..")

function repoPath(rel: string): string {
  return path.join(REPO_ROOT, rel)
}

function fileExists(rel: string): boolean {
  try {
    return fs.statSync(repoPath(rel)).isFile()
  } catch {
    return false
  }
}

function readPublicRoutes(): { routes: string[]; readable: boolean } {
  try {
    const text = fs.readFileSync(repoPath("data/public-routes.json"), "utf-8")
    const parsed = JSON.parse(text)
    if (!Array.isArray(parsed)) return { routes: [], readable: false }
    return { routes: parsed.filter((x): x is string => typeof x === "string"), readable: true }
  } catch {
    return { routes: [], readable: false }
  }
}

function countEmDashes(rel: string): number | null {
  try {
    const text = fs.readFileSync(repoPath(rel), "utf-8")
    return (text.match(/—/g) || []).length
  } catch {
    return null
  }
}

export function runPreflight(beat: BeatRecord): PreflightResult {
  const gates: PreflightGate[] = []
  const { routes, readable } = readPublicRoutes()
  const isLive = routes.includes(beat.publicSlug)

  // Gate 1: prototype file exists
  const prototypeRel = `prototype/${beat.prototypeFile}`
  const protoExists = fileExists(prototypeRel)
  gates.push({
    id: "prototype-exists",
    label: "Prototype HTML file exists",
    detail: protoExists ? `${prototypeRel} found in worktree` : `${prototypeRel} NOT FOUND`,
    status: protoExists ? "pass" : "fail",
    blocking: true,
  })

  // Gate 2: em-dash count = 0
  const emDashCount = protoExists ? countEmDashes(prototypeRel) : null
  gates.push({
    id: "em-dash-zero",
    label: "Em-dash count is zero",
    detail:
      emDashCount === null
        ? "could not read prototype file"
        : emDashCount === 0
          ? "0 em-dashes found in prototype HTML"
          : `${emDashCount} em-dash(es) found - replace with comma, period, or colon before publishing`,
    status: emDashCount === 0 ? "pass" : "fail",
    blocking: true,
  })

  // Gate 3: Editor-lane verifications resolved
  const allVerifications = readStore().filter((v) => v.beat === beat.slug)
  const editorVerifications = allVerifications.filter((v) => v.lane === "Editor")
  const editorOpen = editorVerifications.filter((v) => v.status === "open" || v.status === "broken" || v.status === "unsure")
  gates.push({
    id: "editor-verifications-resolved",
    label: "All Editor-lane URLs verified or won't-fix",
    detail:
      editorVerifications.length === 0
        ? "no Editor-lane verifications declared for this beat"
        : editorOpen.length === 0
          ? `${editorVerifications.length} Editor-lane URLs all resolved (verified or wontfix)`
          : `${editorOpen.length} of ${editorVerifications.length} Editor-lane URLs still open (${editorOpen.map((v) => v.id).slice(0, 3).join(", ")}${editorOpen.length > 3 ? "..." : ""})`,
    status: editorOpen.length === 0 ? "pass" : "fail",
    blocking: true,
  })

  // Gate 4: data/public-routes.json readable
  gates.push({
    id: "public-routes-readable",
    label: "data/public-routes.json readable",
    detail: readable ? "public-routes.json parses cleanly" : "could not parse data/public-routes.json",
    status: readable ? "pass" : "fail",
    blocking: true,
  })

  // Info gate: already live?
  gates.push({
    id: "already-live",
    label: "Already in public-routes.json?",
    detail: isLive
      ? `${beat.publicSlug} is already in public-routes.json - this beat is LIVE`
      : `${beat.publicSlug} is not yet in public-routes.json - publish action will add it`,
    status: "info",
    blocking: false,
  })

  // Info gate: companion donor list, if declared
  if (beat.donorListFile) {
    const donorRel = `prototype/${beat.donorListFile}`
    const donorExists = fileExists(donorRel)
    gates.push({
      id: "donor-list-exists",
      label: "Companion donor list HTML exists",
      detail: donorExists
        ? `${donorRel} found`
        : `${donorRel} declared in catalog but NOT FOUND - is this expected?`,
      status: donorExists ? "info" : "fail",
      blocking: false,
    })
  }

  // Info gate: non-Editor open verifications (Time-based, Code Claude, Perplexity)
  const nonEditorOpen = allVerifications.filter(
    (v) => v.lane !== "Editor" && (v.status === "open" || v.status === "broken" || v.status === "unsure"),
  )
  if (nonEditorOpen.length > 0) {
    gates.push({
      id: "non-editor-open",
      label: "Non-blocking verifications still open",
      detail: `${nonEditorOpen.length} non-Editor verification(s) still open: ${nonEditorOpen.map((v) => `${v.lane}/${v.id}`).slice(0, 3).join(", ")}. These do not block publishing but are tracked.`,
      status: "info",
      blocking: false,
    })
  }

  const failingCount = gates.filter((g) => g.blocking && g.status === "fail").length
  const canPublish = failingCount === 0 && !isLive

  return { gates, canPublish, isLive, failingCount }
}
