/**
 * GET /api/relationships/orphans
 * PATCH /api/relationships/orphans
 *
 * Read + write face for ADR-0027 P2: editor triage of frontmatter
 * orphan candidates. Backed by data/frontmatter-orphan-candidates.jsonl
 * (the canonical store P1 shipped).
 *
 * GET query params:
 *   state             — candidate | approved-prune | kept | blocked-by-librarian-gap | resolved
 *                       (default: candidate)
 *   only_strong       — if "true", filter to in_opposes=true OR
 *                       librarian_opposition_edges>0 records first
 *   limit             — max records (default 200)
 *
 * PATCH body: { id: string, state: "approved-prune" | "kept" | "blocked-by-librarian-gap", editorial_note?: string }
 *
 * Per ADR-0027 + canonical-store-sentinel: this route is on the authority
 * allowlist for data/frontmatter-orphan-candidates.jsonl writes. Edits
 * here pass the gate; ad-hoc edits to the store fail. The actual prune
 * happens later in P3 via rebuilder --apply-approved.
 */

import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/auth"
import path from "path"
import fs from "fs"

export const dynamic = "force-dynamic"

function findRepoRoot(startDir: string): string {
  let dir = startDir
  for (let i = 0; i < 8; i++) {
    if (fs.existsSync(path.join(dir, "data", "frontmatter-orphan-candidates.jsonl"))) return dir
    if (fs.existsSync(path.join(dir, ".git"))) return dir
    const parent = path.dirname(dir)
    if (parent === dir) break
    dir = parent
  }
  return startDir
}

const REPO_ROOT = findRepoRoot(process.cwd())
const STORE_FILE = path.join(REPO_ROOT, "data", "frontmatter-orphan-candidates.jsonl")

const VALID_TARGET_STATES = new Set([
  "approved-prune",
  "kept",
  "blocked-by-librarian-gap",
  "candidate", // allow undo back to candidate
])

interface OrphanRecord {
  id: string
  profile_path: string
  subject: string
  field: string
  name: string
  in_opposes: boolean
  librarian_monetary_edges: number
  librarian_opposition_edges: number
  first_detected: string
  last_seen: string
  state: string
  resolved_at: string | null
  editorial_note: string | null
}

function loadAll(): OrphanRecord[] {
  if (!fs.existsSync(STORE_FILE)) return []
  return fs
    .readFileSync(STORE_FILE, "utf-8")
    .split(/\r?\n/)
    .filter(Boolean)
    .map((l) => { try { return JSON.parse(l) } catch { return null } })
    .filter(Boolean)
}

function persistAll(records: OrphanRecord[]): void {
  const tmp = STORE_FILE + ".tmp"
  const lines = records.map((r) => JSON.stringify(r))
  fs.writeFileSync(tmp, lines.join("\n") + (lines.length ? "\n" : ""), "utf-8")
  fs.renameSync(tmp, STORE_FILE)
}

export async function GET(req: NextRequest) {
  const gate = await requireAdmin(req)
  if (!gate.ok) return gate.response

  const { searchParams } = new URL(req.url)
  const filterState = searchParams.get("state") || "candidate"
  const onlyStrong = searchParams.get("only_strong") === "true"
  const limit = parseInt(searchParams.get("limit") || "200", 10)

  const all = loadAll()
  const byState: Record<string, number> = {}
  for (const r of all) byState[r.state] = (byState[r.state] || 0) + 1

  let filtered = all.filter((r) => r.state === filterState)
  if (onlyStrong) {
    // Strict signal: BOTH editorial-typo signal (in_opposes) AND librarian
    // sees the relationship (opposition edges > 0). Aligned with the
    // harness check's "strong-signal" definition so this view matches the
    // count surfaced in /attention.
    filtered = filtered.filter(
      (r) => r.in_opposes && r.librarian_opposition_edges > 0,
    )
  }

  // Editor signal ranking: in_opposes weighs 2, has-opposition-edges weighs 1
  filtered.sort((a, b) => {
    const aw = (a.in_opposes ? 2 : 0) + (a.librarian_opposition_edges > 0 ? 1 : 0)
    const bw = (b.in_opposes ? 2 : 0) + (b.librarian_opposition_edges > 0 ? 1 : 0)
    if (bw !== aw) return bw - aw
    // Tiebreak: more opposition edges = stronger signal
    return b.librarian_opposition_edges - a.librarian_opposition_edges
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
  if (!gate.ok) return gate.response

  let body: Record<string, unknown>
  try { body = await req.json() } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 })
  }
  const id = typeof body.id === "string" ? body.id : null
  const state = typeof body.state === "string" ? body.state : null
  const editorialNote = typeof body.editorial_note === "string" ? body.editorial_note : null
  if (!id) return NextResponse.json({ error: "id (string) is required" }, { status: 400 })
  if (!state || !VALID_TARGET_STATES.has(state)) {
    return NextResponse.json(
      { error: `state must be one of: ${[...VALID_TARGET_STATES].join(", ")}` },
      { status: 400 },
    )
  }

  const all = loadAll()
  const idx = all.findIndex((r) => r.id === id)
  if (idx === -1) return NextResponse.json({ error: `record ${id} not found` }, { status: 404 })

  const now = new Date().toISOString()
  const merged: OrphanRecord = {
    ...all[idx],
    state,
    last_seen: now,
    editorial_note: editorialNote ?? all[idx].editorial_note,
    resolved_at: state === "resolved" ? now : all[idx].resolved_at,
  }
  all[idx] = merged
  persistAll(all)

  return NextResponse.json({ record: merged })
}
