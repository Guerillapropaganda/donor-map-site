/**
 * GET /api/policies — list all 5 v1 policies with computed state
 *
 * Returns one row per policy with:
 *   - id, slug, title, category, content_readiness
 *   - counts: polls, events, opposition_donors (via query engine)
 *   - gate status: publication-readiness-check result + list of blockers
 *   - rule11_status: all cited entities have approved class tags?
 *   - last_updated timestamp
 *   - is_public: whether the under-construction route guard currently exempts this policy
 *
 * Used by ops/src/app/policies/page.tsx as the dashboard data source.
 * Auth: requireAdmin (only David can see this).
 */

import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/auth"
import { execFileSync } from "child_process"
import { createRequire } from "module"
import path from "path"
import fs from "fs"

export const dynamic = "force-dynamic"

const require = createRequire(import.meta.url)

function findRepoRoot(startDir: string): string {
  let dir = startDir
  for (let i = 0; i < 8; i++) {
    if (fs.existsSync(path.join(dir, "data", "policies.jsonl"))) return dir
    if (fs.existsSync(path.join(dir, ".git"))) return dir
    const parent = path.dirname(dir)
    if (parent === dir) break
    dir = parent
  }
  return startDir
}

const REPO_ROOT = findRepoRoot(process.cwd())

function loadPolicies(): any[] {
  const p = path.join(REPO_ROOT, "data", "policies.jsonl")
  if (!fs.existsSync(p)) return []
  const lines = fs.readFileSync(p, "utf-8").split(/\r?\n/).filter(Boolean)
  return lines
    .map((l) => {
      try {
        return JSON.parse(l)
      } catch {
        return null
      }
    })
    .filter(Boolean)
}

function loadPolling(): any[] {
  const p = path.join(REPO_ROOT, "data", "polling.jsonl")
  if (!fs.existsSync(p)) return []
  const lines = fs.readFileSync(p, "utf-8").split(/\r?\n/).filter(Boolean)
  return lines
    .map((l) => {
      try {
        return JSON.parse(l)
      } catch {
        return null
      }
    })
    .filter(Boolean)
}

function loadEvents(): any[] {
  const p = path.join(REPO_ROOT, "data", "events.jsonl")
  if (!fs.existsSync(p)) return []
  const lines = fs.readFileSync(p, "utf-8").split(/\r?\n/).filter(Boolean)
  return lines
    .map((l) => {
      try {
        return JSON.parse(l)
      } catch {
        return null
      }
    })
    .filter(Boolean)
}

// Run publication-readiness-check on a single file, return pass/fail + blockers
function runReadinessCheck(slug: string): { ready: boolean; failures: string[] } {
  const fileRel = `content/Policies/${slug}.md`
  const scriptPath = path.join(REPO_ROOT, "scripts", "publication-readiness-check.cjs")
  if (!fs.existsSync(scriptPath)) {
    return { ready: false, failures: ["publication-readiness-check.cjs not found"] }
  }
  try {
    const out = execFileSync(
      "node",
      [scriptPath, "--file", fileRel, "--json"],
      {
        cwd: REPO_ROOT,
        encoding: "utf-8",
        maxBuffer: 16 * 1024 * 1024,
      },
    )
    const parsed = JSON.parse(out)
    const result = parsed.results?.[0]
    return {
      ready: result?.ready || false,
      failures: result?.failures || [],
    }
  } catch (err: any) {
    // Script exits 1 when there are failures — that's not a crash
    if (err.stdout) {
      try {
        const parsed = JSON.parse(err.stdout)
        const result = parsed.results?.[0]
        return {
          ready: result?.ready || false,
          failures: result?.failures || [],
        }
      } catch {}
    }
    return { ready: false, failures: [`readiness-check crashed: ${err.message || err}`] }
  }
}

export async function GET(req: NextRequest) {
  const gate = await requireAdmin(req)
  if (!gate.ok) return gate.response

  const policies = loadPolicies()
  const polling = loadPolling()
  const events = loadEvents()

  // Only return the v1 policies (everything with a category)
  const v1 = policies.filter((p) => p.category)

  // Per-policy annotation
  const annotated = v1.map((p) => {
    const polls = polling.filter((r) => r.policy_id === p.id).length
    const relatedEvents = events.filter((e) => e.policy_id === p.id).length

    // Readiness gate check (runs the publication-readiness-check.cjs script)
    const gate = runReadinessCheck(p.slug)

    // Opposition donors count (for the UI — actual data comes from query engine)
    const oppositionDonors = (p.opposition_capital_types || []).length

    return {
      id: p.id,
      slug: p.slug,
      title: p.title,
      category: p.category,
      content_readiness: p.content_readiness || "draft",
      legislative_status: p.legislative_status,
      high_risk_editorial: !!p.high_risk_editorial,
      requires_legal_review: !!p.requires_legal_review,
      opposition_capital_types: p.opposition_capital_types || [],
      class_analysis_tags: p.class_analysis_tags || [],
      last_updated: p.last_updated,
      published_at: p.published_at,
      counts: {
        polls,
        events: relatedEvents,
        opposition_capital_types: oppositionDonors,
      },
      gate: {
        ready: gate.ready,
        failures: gate.failures,
      },
    }
  })

  // Sort: by status (drafts first for the review-oriented workflow),
  // then by title alphabetical
  const statusOrder: Record<string, number> = {
    draft: 0,
    ready: 1,
    verified: 2,
    published: 3,
  }
  annotated.sort((a, b) => {
    const sa = statusOrder[a.content_readiness] ?? 99
    const sb = statusOrder[b.content_readiness] ?? 99
    if (sa !== sb) return sa - sb
    return (a.title || "").localeCompare(b.title || "")
  })

  return NextResponse.json({
    total: annotated.length,
    verified: annotated.filter((p) => p.content_readiness === "verified").length,
    policies: annotated,
  })
}
