/**
 * GET /api/librarian-gaps
 * PATCH /api/librarian-gaps
 *
 * Editorial work surface for librarian-gap-aliases (ADR-0029 Tier 2).
 * Reads data/librarian-gap-decisions.jsonl (canonical store), surfaces
 * candidate records for batch approval. PATCH transitions a single
 * record through the editorial-decision-pipeline (provenance + change_log
 * guaranteed).
 *
 * Distinct from /api/audit-claude-decisions:
 *   - audit endpoint is retrospective + revert
 *   - this endpoint is prospective + approve/reject
 *
 * Auth: admin-only.
 *
 * GET query:
 *   state         — candidate | approved-alias | rejected | needs-research | resolved
 *                   default: candidate
 *   only_with_similar — if "true", only show records that have at least
 *                   one candidate librarian match (faster triage).
 *   min_appearances — minimum appearances filter; default 0.
 *   limit         — default 200, hard cap 2000
 *
 * PATCH body: { id, action, target?, reason? }
 *   action: "approve" | "reject" | "needs-research" | "candidate" (undo)
 *   target (required for approve): the canonical entity name to alias to
 *   reason (optional, for reject)
 */

import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/auth"
import path from "path"
import fs from "fs"
import { spawnSync } from "child_process"

export const dynamic = "force-dynamic"

function findRepoRoot(startDir: string): string {
  let dir = startDir
  for (let i = 0; i < 8; i++) {
    if (fs.existsSync(path.join(dir, "data", "librarian-gap-decisions.jsonl"))) return dir
    if (fs.existsSync(path.join(dir, ".git"))) return dir
    const parent = path.dirname(dir)
    if (parent === dir) break
    dir = parent
  }
  return startDir
}

const REPO_ROOT = findRepoRoot(process.cwd())
const STORE_FILE = path.join(REPO_ROOT, "data", "librarian-gap-decisions.jsonl")

interface GapRecord {
  id: string
  name: string
  gap_class: string
  appearances: number
  by_field: Record<string, number>
  sample_profiles: string[]
  similar: Array<{ name: string; distance: number }>
  state: string
  approved_alias_target: string | null
  rejected_reason: string | null
  decided_by?: string
  decided_at: string | null
  resolved_at: string | null
  change_log?: Array<Record<string, unknown>>
  [k: string]: unknown
}

function loadAll(): GapRecord[] {
  if (!fs.existsSync(STORE_FILE)) return []
  return fs
    .readFileSync(STORE_FILE, "utf-8")
    .split(/\r?\n/)
    .filter(Boolean)
    .map((l) => { try { return JSON.parse(l) as GapRecord } catch { return null } })
    .filter((r): r is GapRecord => r !== null)
}

const VALID_GET_STATES = new Set(["candidate", "approved-alias", "rejected", "needs-research", "resolved"])
const VALID_ACTIONS = new Set(["approve", "reject", "needs-research", "candidate"])

export async function GET(req: NextRequest) {
  const gate = await requireAdmin(req)
  if (!gate.ok) return gate.response!

  const { searchParams } = new URL(req.url)
  const filterState = searchParams.get("state") || "candidate"
  const onlyWithSimilar = searchParams.get("only_with_similar") === "true"
  const minAppearances = parseInt(searchParams.get("min_appearances") || "0", 10)
  const limit = Math.min(parseInt(searchParams.get("limit") || "200", 10), 2000)

  if (!VALID_GET_STATES.has(filterState)) {
    return NextResponse.json({ error: `state must be one of: ${[...VALID_GET_STATES].join(", ")}` }, { status: 400 })
  }

  const all = loadAll()
  const byState: Record<string, number> = {}
  for (const r of all) byState[r.state] = (byState[r.state] || 0) + 1

  let filtered = all.filter((r) => r.state === filterState)
  if (onlyWithSimilar) filtered = filtered.filter((r) => Array.isArray(r.similar) && r.similar.length > 0)
  if (minAppearances > 0) filtered = filtered.filter((r) => (r.appearances || 0) >= minAppearances)

  // Highest-leverage first: appearances desc, then single-similar matches first.
  filtered.sort((a, b) => {
    const ba = b.appearances || 0
    const aa = a.appearances || 0
    if (ba !== aa) return ba - aa
    const bs = (b.similar?.length || 0) === 1 ? 1 : 0
    const as = (a.similar?.length || 0) === 1 ? 1 : 0
    return bs - as
  })

  return NextResponse.json({
    records: filtered.slice(0, limit),
    total_in_state: filtered.length,
    total_records: all.length,
    by_state: byState,
  })
}

export async function PATCH(req: NextRequest) {
  const gate = await requireAdmin(req)
  if (!gate.ok) return gate.response!

  let body: Record<string, unknown>
  try { body = await req.json() } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 })
  }
  const id = typeof body.id === "string" ? body.id : null
  const action = typeof body.action === "string" ? body.action : null
  const target = typeof body.target === "string" ? body.target.trim() : null
  const reason = typeof body.reason === "string" ? body.reason.trim() : null

  if (!id) return NextResponse.json({ error: "id (string) is required" }, { status: 400 })
  if (!action || !VALID_ACTIONS.has(action)) {
    return NextResponse.json({ error: `action must be one of: ${[...VALID_ACTIONS].join(", ")}` }, { status: 400 })
  }
  if (action === "approve" && !target) {
    return NextResponse.json({ error: "approve requires target (canonical entity name)" }, { status: 400 })
  }

  // Spawn a CJS bridge that invokes pipeline.transition with provenance.
  // Same pattern as audit-decisions-revert.cjs — keeps the TS API clean
  // of the CJS pipeline + class registration tree.
  const helperPath = path.join(REPO_ROOT, "scripts", "librarian-gaps-decide.cjs")
  if (!fs.existsSync(helperPath)) {
    return NextResponse.json({ error: `helper script missing: ${helperPath}` }, { status: 500 })
  }

  const args = [helperPath, "--id", id, "--action", action]
  if (target) args.push("--target", target)
  if (reason) args.push("--reason", reason)

  const result = spawnSync(process.execPath, args, {
    cwd: REPO_ROOT, encoding: "utf-8", maxBuffer: 16 * 1024 * 1024, timeout: 30_000,
  })

  let parsed: Record<string, unknown> | null = null
  const stdout = (result.stdout || "").trim()
  if (stdout) {
    try { parsed = JSON.parse(stdout.split("\n").pop() || "") } catch { parsed = null }
  }

  if (result.status !== 0 || !parsed || parsed.ok === false) {
    return NextResponse.json(
      {
        error: (parsed && typeof parsed.error === "string" ? parsed.error : null)
          || (result.stderr || "").slice(0, 500)
          || "decide failed",
        cli_result: parsed,
        cli_exit: result.status,
        cli_stderr: (result.stderr || "").slice(0, 1000),
      },
      { status: 500 },
    )
  }

  return NextResponse.json({ ok: true, result: parsed })
}
