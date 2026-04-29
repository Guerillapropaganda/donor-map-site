/**
 * GET /api/audit-claude-decisions/sample
 *
 * Random sample of recent claude-auto (Tier 1) decisions for the weekly
 * David spot-audit. Mirrors pipeline.sampleTier1Decisions() in TS so we
 * don't need to spawn for a read-only operation.
 *
 * Query params:
 *   limit       — sample size (default 20, hard cap 200)
 *   since       — relative ("7d", "24h") or ISO. Default 7d.
 *   class       — optional comma-sep filter
 *
 * Returns the same NormalizedRecord shape as the list endpoint so the UI
 * can splice the sample into its main list without remapping.
 */

import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/auth"
import path from "path"
import fs from "fs"

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

// Mirrors the route.ts class registry. Only Tier 1 classes are sampled.
const TIER1_CLASSES: Record<string, { store_file: string }> = {
  "librarian-gap-aliases": { store_file: "data/librarian-gap-decisions.jsonl" },
}

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

function parseSince(s: string | null): number {
  if (!s) return Date.now() - 7 * 86400_000
  const rel = /^(\d+)\s*([dhm])$/i.exec(s)
  if (rel) {
    const n = parseInt(rel[1], 10)
    const unit = rel[2].toLowerCase()
    const ms = unit === "d" ? n * 86400_000 : unit === "h" ? n * 3600_000 : n * 60_000
    return Date.now() - ms
  }
  const t = Date.parse(s)
  return isNaN(t) ? Date.now() - 7 * 86400_000 : t
}

export async function GET(req: NextRequest) {
  const gate = await requireAdmin(req)
  if (!gate.ok) return gate.response!

  const { searchParams } = new URL(req.url)
  const limit = Math.min(parseInt(searchParams.get("limit") || "20", 10), 200)
  const sinceMs = parseSince(searchParams.get("since"))
  const classFilter = (searchParams.get("class") || "").split(",").filter(Boolean)

  const eligible: Array<{ class: string; id: string }> = []

  for (const [className, cls] of Object.entries(TIER1_CLASSES)) {
    if (classFilter.length && !classFilter.includes(className)) continue
    const records = loadStore(cls.store_file)
    for (const r of records) {
      if (r.decided_by !== "claude-auto") continue
      if (!r.decided_at) continue
      if (Date.parse(String(r.decided_at)) < sinceMs) continue
      eligible.push({ class: className, id: String(r.id || "") })
    }
  }

  // Fisher-Yates shuffle, then cap.
  for (let i = eligible.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[eligible[i], eligible[j]] = [eligible[j], eligible[i]]
  }
  const sample = eligible.slice(0, limit)

  return NextResponse.json({
    sample,
    eligible_total: eligible.length,
    requested_limit: limit,
    since_ms: sinceMs,
    classes_considered: Object.keys(TIER1_CLASSES),
  })
}
