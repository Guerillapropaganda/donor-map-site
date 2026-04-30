/**
 * GET /api/races/ca-gov-2026
 *
 * California Governor 2026 race curation surface. Reads the 10 candidate
 * profiles in content/Politicians/Races/CA Governor 2026/, joins them
 * with the librarian's federal-money totals + connection counts, and
 * returns one row per candidate.
 *
 * Federal-only money (FEC + USASpending + IRS 990 — whatever's loaded
 * into the librarian). California gubernatorial filings live in Cal-Access
 * which has no pipeline yet — see content/Admin Notes/cal-access-pipeline-plan.md
 * for the handoff. Cal-Access amounts will appear here once that pipeline lands.
 *
 * Auth: admin.
 */
import { NextRequest, NextResponse } from "next/server"
import * as fs from "node:fs"
import * as path from "node:path"
import { requireAdmin } from "@/lib/auth"
import { getGraph } from "@/lib/donor-map-singleton"

export const dynamic = "force-dynamic"

interface CandidateRow {
  name: string
  profile_path: string
  readiness: string
  party: string | null
  body_chars: number
  citation_count: number
  url_needed_flags: number
  unverified_flags: number
  needs_review_flags: number
  last_updated: string | null
  has_summary_infobox: boolean
  // Librarian-derived (federal money only)
  resolved: boolean
  federal_money_in: number
  monetary_edge_count: number
  total_connections: number
}

function findRepoRoot(): string {
  let dir = process.cwd()
  for (let i = 0; i < 6; i++) {
    if (fs.existsSync(path.join(dir, "data", "relationships.jsonl"))) return dir
    const parent = path.dirname(dir)
    if (parent === dir) break
    dir = parent
  }
  return path.resolve(process.cwd(), "..")
}

function parseFrontmatter(text: string): { fm: Record<string, unknown>; body: string } {
  const m = text.match(/^---\n([\s\S]*?)\n---\n?/)
  if (!m) return { fm: {}, body: text }
  const yamlText = m[1]
  const fm: Record<string, unknown> = {}
  // Cheap line-based YAML parse — sufficient for our shallow lookups
  // (content-readiness, party, last-updated, title). Avoids a js-yaml
  // dependency in the API route.
  for (const line of yamlText.split("\n")) {
    const idx = line.indexOf(":")
    if (idx === -1) continue
    const key = line.slice(0, idx).trim()
    let val: string | unknown = line.slice(idx + 1).trim()
    if (typeof val === "string") {
      val = val.replace(/^["']|["']$/g, "")
    }
    if (key && !(key in fm)) fm[key] = val
  }
  return { fm, body: text.slice(m[0].length) }
}

function readCandidate(repoRoot: string, candidateName: string, file: string): CandidateRow {
  const abs = path.join(repoRoot, file)
  const text = fs.readFileSync(abs, "utf-8")
  const { fm, body } = parseFrontmatter(text)
  const readiness = String(fm["content-readiness"] ?? "?")
  const party = (fm.party as string) || (fm.affiliation as string) || null
  const lastUpdatedRaw = fm["last-updated"]
  const lastUpdated = typeof lastUpdatedRaw === "string" ? lastUpdatedRaw : null

  return {
    name: candidateName,
    profile_path: file,
    readiness,
    party,
    body_chars: body.length,
    citation_count: (body.match(/\[\^\d+\]:/g) ?? []).length,
    url_needed_flags: (body.match(/\(URL NEEDED\)/g) ?? []).length,
    unverified_flags: (body.match(/\(UNVERIFIED\)/g) ?? []).length,
    needs_review_flags: (body.match(/\(NEEDS REVIEW\)/g) ?? []).length,
    last_updated: lastUpdated,
    has_summary_infobox: body.includes("## Summary") || body.includes("summary-infobox"),
    resolved: false,
    federal_money_in: 0,
    monetary_edge_count: 0,
    total_connections: 0,
  }
}

export async function GET(req: NextRequest) {
  const gate = await requireAdmin(req)
  if (!gate.ok) return gate.response!

  const repoRoot = findRepoRoot()
  const raceDir = path.join(repoRoot, "content/Politicians/Races/CA Governor 2026")

  if (!fs.existsSync(raceDir)) {
    return NextResponse.json({ error: "race directory not found", path: raceDir }, { status: 500 })
  }

  // Discover candidates: each subdir with a "_<name> Master Profile.md"
  // OR a flat <name>.md at the race root.
  const rows: CandidateRow[] = []
  for (const entry of fs.readdirSync(raceDir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      const profile = path.join(raceDir, entry.name, `_${entry.name} Master Profile.md`)
      if (!fs.existsSync(profile)) continue
      rows.push(
        readCandidate(
          repoRoot,
          entry.name,
          path.relative(repoRoot, profile).replace(/\\/g, "/"),
        ),
      )
    } else if (entry.name.endsWith(".md")) {
      const name = entry.name.replace(/\.md$/, "")
      rows.push(
        readCandidate(
          repoRoot,
          name,
          path.relative(repoRoot, path.join(raceDir, entry.name)).replace(/\\/g, "/"),
        ),
      )
    }
  }

  // Layer in librarian totals where the candidate resolves.
  const graph = getGraph()
  if (graph) {
    for (const row of rows) {
      try {
        const node = graph.resolver.resolve({ kind: "name", value: row.name })
        const moneyIn = graph.aggregate(row.name, {
          direction: "in",
          edge_types: ["monetary"],
        })
        const allEdges = graph.neighbors(row.name)
        row.resolved = true
        row.federal_money_in = moneyIn.total_amount
        row.monetary_edge_count = moneyIn.edge_count
        row.total_connections = allEdges.length
        void node
      } catch {
        // Unresolvable — leave row as resolved=false. Common for state-
        // only politicians with no federal record (Bianco, Mahan, etc.).
      }
    }
  }

  rows.sort((a, b) => a.name.localeCompare(b.name))

  return NextResponse.json({
    race: "CA Governor 2026",
    candidate_count: rows.length,
    candidates: rows,
    cal_access_status: "not yet ingested — see content/Admin Notes/cal-access-pipeline-plan.md",
  })
}
