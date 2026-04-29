/**
 * GET   /api/audit-claude-decisions
 * PATCH /api/audit-claude-decisions      — manual revert
 * POST  /api/audit-claude-decisions      — Tier 2 approve / reject
 *
 * Phase 3 of ADR-0029. Read + revert + decide face for the
 * editorial-decision pipeline audit surface.
 *
 * GET — returns a normalized, filtered list of records across every
 * registered class. Filters via query params:
 *   class           — comma-sep class names (default: all)
 *   decided_by      — comma-sep of david | claude-auto | claude-batch-approved | undecided
 *   state           — comma-sep state values (matched per-class)
 *   since           — ISO date or relative ms (e.g. "7d", "24h")
 *   until           — ISO date
 *   q               — free-text search over name + raw JSON
 *   limit           — default 200, hard cap 2000
 *
 * PATCH — manual revert. Body: { class: string, id: string, reason?: string }
 * Spawns scripts/audit-decisions-revert.cjs which calls
 * pipeline.revertDecision (record-state revert + class-specific side-
 * effect undo if the class supplies one).
 *
 * POST — Tier 2 approve or reject. Body:
 *   { class: string, id: string, action: "approve" | "reject", reason?: string }
 * Spawns scripts/audit-decisions-decide.cjs which calls
 * pipeline.transition + applyApproved. Added 2026-04-29 for Phase 2D
 * data-complete batch approval; class-agnostic so the same endpoint
 * unblocks David's Tier 2 approve queue across every registered class.
 *
 * Auth: admin-only. Audit + revert + decide are Tier 3 actions.
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

// ─── class registry (mirrors scripts/classes/index.cjs) ────────────
//
// Kept in sync manually — adding a new class to scripts/classes/index.cjs
// also requires adding it here. The list is short (currently 2; planned
// 5) and keeping it explicit means the audit page never silently drops
// a class because of a registry mismatch.

interface ClassMeta {
  name: string
  store_file: string
  has_tier1: boolean
  /**
   * Map a raw record to a normalized "primary_label" for list display.
   * Class-specific because the records have different shapes.
   */
  label: (rec: Record<string, unknown>) => string
  /** Sub-label / context line (one line, plain text). */
  sublabel: (rec: Record<string, unknown>) => string
}

const CLASSES: Record<string, ClassMeta> = {
  "librarian-gap-aliases": {
    name: "librarian-gap-aliases",
    store_file: "data/librarian-gap-decisions.jsonl",
    has_tier1: true,
    label: (rec) => {
      const name = String(rec.name || "?")
      const target = rec.approved_alias_target ? ` → ${rec.approved_alias_target}` : ""
      return `${name}${target}`
    },
    sublabel: (rec) => {
      const apps = rec.appearances ? `${rec.appearances}× appearances` : ""
      const sim = Array.isArray(rec.similar) && rec.similar.length === 1
        ? `similar to "${(rec.similar[0] as { name?: string }).name}"`
        : Array.isArray(rec.similar) && rec.similar.length > 0
          ? `${rec.similar.length} similar candidates`
          : ""
      return [apps, sim].filter(Boolean).join(" · ")
    },
  },
  "frontmatter-orphan-prunes": {
    name: "frontmatter-orphan-prunes",
    store_file: "data/frontmatter-orphan-candidates.jsonl",
    has_tier1: false,
    label: (rec) => {
      const subject = String(rec.subject || "?")
      const field = String(rec.field || "?")
      const name = String(rec.name || "?")
      return `${subject}.${field} ↛ ${name}`
    },
    sublabel: (rec) => {
      const path = String(rec.profile_path || "")
      const opEdges = Number(rec.librarian_opposition_edges || 0)
      const inOpp = rec.in_opposes ? "in-opposes" : ""
      const sig = [inOpp, opEdges > 0 ? `${opEdges} opp-edge${opEdges === 1 ? "" : "s"}` : ""]
        .filter(Boolean)
        .join(" · ")
      return [path, sig].filter(Boolean).join(" — ")
    },
  },
  "duplicate-entity-merges": {
    name: "duplicate-entity-merges",
    store_file: "data/duplicate-entity-merges.jsonl",
    has_tier1: false,
    label: (rec) => {
      const profiles = Array.isArray(rec.profiles) ? rec.profiles as Array<{ name: string }> : []
      const names = profiles.map((p) => p.name || "?").join(" ⇄ ")
      return names || "(unknown duplicate group)"
    },
    sublabel: (rec) => {
      const reason = String(rec.reason || "").replace(/_/g, " ")
      const key = String(rec.key || "")
      const count = Array.isArray(rec.profiles) ? rec.profiles.length : 0
      return [`${count} profiles`, reason, key && `key=${key}`].filter(Boolean).join(" · ")
    },
  },
  "pathless-stub-aliases": {
    name: "pathless-stub-aliases",
    store_file: "data/pathless-stub-aliases.jsonl",
    has_tier1: false,
    label: (rec) => {
      const name = String(rec.name || "?")
      const target = rec.canonical_entity_name ? ` → ${rec.canonical_entity_name}` : ""
      return `${name}${target}`
    },
    sublabel: (rec) => {
      const kind = String(rec.kind || "")
      const edges = typeof rec.edge_count === "number" ? `${rec.edge_count} edge${rec.edge_count === 1 ? "" : "s"}` : ""
      const id = rec.entity_id ? `id=${rec.entity_id}` : ""
      return [kind, edges, id].filter(Boolean).join(" · ")
    },
  },
  "mechanical-readiness-promotion": {
    name: "mechanical-readiness-promotion",
    store_file: "data/mechanical-readiness-decisions.jsonl",
    has_tier1: true,
    label: (rec) => {
      const title = String(rec.profile_title || rec.profile_path || "?")
      const from = String(rec.from_state || "?")
      const to = String(rec.to_state || "?")
      return `${title} : ${from} → ${to}`
    },
    sublabel: (rec) => {
      const type = String(rec.profile_type || "")
      const reasons = Array.isArray(rec.gap_reasons) && rec.gap_reasons.length
        ? `gaps: ${(rec.gap_reasons as string[]).join(", ")}`
        : ""
      const path_ = String(rec.profile_path || "")
      return [type, reasons, path_].filter(Boolean).join(" · ")
    },
  },
  "data-complete-promotion": {
    name: "data-complete-promotion",
    store_file: "data/data-complete-decisions.jsonl",
    has_tier1: false,
    label: (rec) => {
      const title = String(rec.profile_title || rec.profile_path || "?")
      return `${title} : ready → data-complete`
    },
    sublabel: (rec) => {
      const type = String(rec.profile_type || "")
      const passing = Array.isArray(rec.gates_passing) && rec.gates_passing.length
        ? `passing: ${(rec.gates_passing as string[]).join(", ")}`
        : ""
      const reasons = Array.isArray(rec.gap_reasons) && rec.gap_reasons.length
        ? `gaps: ${(rec.gap_reasons as string[]).join(", ")}`
        : ""
      const path_ = String(rec.profile_path || "")
      return [type, passing || reasons, path_].filter(Boolean).join(" · ")
    },
  },
}

// ─── normalized record shape ───────────────────────────────────────

interface NormalizedRecord {
  class: string
  id: string
  state: string
  decided_by: string | null
  decided_at: string | null
  auto_revert_eligible: boolean
  reverted_reason: string | null
  has_tier1: boolean
  primary_label: string
  sublabel: string
  change_log: Array<Record<string, unknown>>
  raw: Record<string, unknown>
}

// ─── helpers ───────────────────────────────────────────────────────

function loadStore(relPath: string): Record<string, unknown>[] {
  const full = path.join(REPO_ROOT, relPath)
  if (!fs.existsSync(full)) return []
  return fs
    .readFileSync(full, "utf-8")
    .split(/\r?\n/)
    .filter(Boolean)
    .map((l) => {
      try { return JSON.parse(l) as Record<string, unknown> }
      catch { return null }
    })
    .filter((r): r is Record<string, unknown> => r !== null)
}

function normalize(className: string, rec: Record<string, unknown>): NormalizedRecord {
  const cls = CLASSES[className]
  return {
    class: className,
    id: String(rec.id || ""),
    state: String(rec.state || "candidate"),
    decided_by: rec.decided_by ? String(rec.decided_by) : null,
    decided_at: rec.decided_at ? String(rec.decided_at) : null,
    auto_revert_eligible: Boolean(rec.auto_revert_eligible),
    reverted_reason: rec.reverted_reason ? String(rec.reverted_reason) : null,
    has_tier1: cls.has_tier1,
    primary_label: cls.label(rec),
    sublabel: cls.sublabel(rec),
    change_log: Array.isArray(rec.change_log) ? rec.change_log as Array<Record<string, unknown>> : [],
    raw: rec,
  }
}

/** Parse "7d", "24h", "30m", or ISO date. Returns ms-since-epoch or null. */
function parseSince(s: string | null): number | null {
  if (!s) return null
  const rel = /^(\d+)\s*([dhm])$/i.exec(s)
  if (rel) {
    const n = parseInt(rel[1], 10)
    const unit = rel[2].toLowerCase()
    const ms = unit === "d" ? n * 86400_000 : unit === "h" ? n * 3600_000 : n * 60_000
    return Date.now() - ms
  }
  const t = Date.parse(s)
  return isNaN(t) ? null : t
}

// ─── GET — list ────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const gate = await requireAdmin(req)
  if (!gate.ok) return gate.response!

  const { searchParams } = new URL(req.url)
  const classFilter = (searchParams.get("class") || "").split(",").filter(Boolean)
  const decidedByFilter = (searchParams.get("decided_by") || "").split(",").filter(Boolean)
  const stateFilter = (searchParams.get("state") || "").split(",").filter(Boolean)
  const search = (searchParams.get("q") || "").toLowerCase()
  const sinceMs = parseSince(searchParams.get("since"))
  const untilMs = parseSince(searchParams.get("until"))
  const limit = Math.min(parseInt(searchParams.get("limit") || "200", 10), 2000)

  const activeClasses = classFilter.length
    ? classFilter.filter((c) => c in CLASSES)
    : Object.keys(CLASSES)

  // Aggregate stats across all classes (unfiltered counts for the header
  // chips). Filtered counts are in `total` below.
  const stats: Record<string, {
    total: number
    by_state: Record<string, number>
    by_decided_by: Record<string, number>
    has_tier1: boolean
  }> = {}

  let all: NormalizedRecord[] = []

  for (const className of Object.keys(CLASSES)) {
    const cls = CLASSES[className]
    const records = loadStore(cls.store_file).map((r) => normalize(className, r))

    const classStats = { total: records.length, by_state: {} as Record<string, number>, by_decided_by: {} as Record<string, number>, has_tier1: cls.has_tier1 }
    for (const r of records) {
      classStats.by_state[r.state] = (classStats.by_state[r.state] || 0) + 1
      const db = r.decided_by || "undecided"
      classStats.by_decided_by[db] = (classStats.by_decided_by[db] || 0) + 1
    }
    stats[className] = classStats

    if (activeClasses.includes(className)) {
      all = all.concat(records)
    }
  }

  // Filter
  let filtered = all
  if (decidedByFilter.length) {
    filtered = filtered.filter((r) => {
      const db = r.decided_by || "undecided"
      return decidedByFilter.includes(db)
    })
  }
  if (stateFilter.length) {
    filtered = filtered.filter((r) => stateFilter.includes(r.state))
  }
  if (sinceMs !== null) {
    filtered = filtered.filter((r) => r.decided_at && Date.parse(r.decided_at) >= sinceMs)
  }
  if (untilMs !== null) {
    filtered = filtered.filter((r) => r.decided_at && Date.parse(r.decided_at) <= untilMs)
  }
  if (search) {
    filtered = filtered.filter((r) =>
      r.primary_label.toLowerCase().includes(search) ||
      r.sublabel.toLowerCase().includes(search) ||
      r.id.toLowerCase().includes(search)
    )
  }

  // Sort: most recent decided_at first; undecided records last.
  filtered.sort((a, b) => {
    if (!a.decided_at && !b.decided_at) return 0
    if (!a.decided_at) return 1
    if (!b.decided_at) return -1
    return Date.parse(b.decided_at) - Date.parse(a.decided_at)
  })

  const total = filtered.length

  return NextResponse.json({
    records: filtered.slice(0, limit),
    total,
    classes: Object.values(CLASSES).map((c) => ({
      name: c.name,
      has_tier1: c.has_tier1,
    })),
    stats,
  })
}

// ─── PATCH — revert ────────────────────────────────────────────────

export async function PATCH(req: NextRequest) {
  const gate = await requireAdmin(req)
  if (!gate.ok) return gate.response!

  let body: Record<string, unknown>
  try { body = await req.json() } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 })
  }
  const className = typeof body.class === "string" ? body.class : null
  const id = typeof body.id === "string" ? body.id : null
  const reason = typeof body.reason === "string" ? body.reason : "manual-audit-revert"

  if (!className || !(className in CLASSES)) {
    return NextResponse.json({ error: `class must be one of: ${Object.keys(CLASSES).join(", ")}` }, { status: 400 })
  }
  if (!id) {
    return NextResponse.json({ error: "id (string) is required" }, { status: 400 })
  }

  // Spawn the CLI helper so the pipeline + classes are loaded in a clean
  // child process. Passes the admin user's email/id as decided_by so the
  // change_log notes who pulled the trigger (defaults to 'david' if the
  // session has no email).
  const decidedBy = "david"

  const result = spawnSync(
    process.execPath,
    [
      path.join(REPO_ROOT, "scripts", "audit-decisions-revert.cjs"),
      "--class", className,
      "--id", id,
      "--decided-by", decidedBy,
      "--reason", reason,
    ],
    { cwd: REPO_ROOT, encoding: "utf-8", maxBuffer: 16 * 1024 * 1024, timeout: 30_000 }
  )

  // The CLI prints a single line of JSON. Surface it verbatim plus exit
  // status so the UI can show a precise error.
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
          || "revert failed",
        cli_result: parsed,
        cli_exit: result.status,
        cli_stderr: (result.stderr || "").slice(0, 1000),
      },
      { status: 500 },
    )
  }

  return NextResponse.json({ ok: true, result: parsed })
}

// ─── POST — approve / reject (Tier 2 batch decisions) ──────────────

export async function POST(req: NextRequest) {
  const gate = await requireAdmin(req)
  if (!gate.ok) return gate.response!

  let body: Record<string, unknown>
  try { body = await req.json() } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 })
  }
  const className = typeof body.class === "string" ? body.class : null
  const id = typeof body.id === "string" ? body.id : null
  const action = typeof body.action === "string" ? body.action : null
  const reason = typeof body.reason === "string" ? body.reason : null

  if (!className || !(className in CLASSES)) {
    return NextResponse.json({ error: `class must be one of: ${Object.keys(CLASSES).join(", ")}` }, { status: 400 })
  }
  if (!id) {
    return NextResponse.json({ error: "id (string) is required" }, { status: 400 })
  }
  if (action !== "approve" && action !== "reject") {
    return NextResponse.json({ error: "action must be 'approve' or 'reject'" }, { status: 400 })
  }

  const cliArgs = [
    path.join(REPO_ROOT, "scripts", "audit-decisions-decide.cjs"),
    "--class", className,
    "--id", id,
    "--action", action,
  ]
  if (reason) cliArgs.push("--reason", reason)

  const result = spawnSync(
    process.execPath,
    cliArgs,
    { cwd: REPO_ROOT, encoding: "utf-8", maxBuffer: 16 * 1024 * 1024, timeout: 30_000 }
  )

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
