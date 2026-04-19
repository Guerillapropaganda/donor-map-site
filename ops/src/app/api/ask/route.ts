import { NextRequest, NextResponse } from "next/server"
import { createQueryEngine } from "@/lib/query-engine"
import { requireTier } from "@/lib/auth"
import { checkDailyLimit, checkPerMinuteLimit } from "@/lib/rate-limit"
import fs from "node:fs"
import path from "node:path"

export const dynamic = "force-dynamic"

// ─── /api/ask ────────────────────────────────────────────────────────
// Natural-language wrapper over the query engine. Pattern-matches a
// question string to a QuerySpec, runs it, returns { question, spec,
// intent, rows, total, summary }.
//
// Mirrors scripts/ask.cjs. When in doubt on wording, extend the CLI
// and copy patterns here so behavior stays in sync.

type Intent =
  | "cross_party_donors"
  | "voting_record"
  | "affiliations_from"
  | "affiliations_to"
  | "grants_from"
  | "donors_to"
  | "recipients_from"
  | "generic"

interface AskResult {
  question: string
  intent: Intent
  resolved_title?: string | null
  spec?: unknown
  total: number
  rows: unknown[]
  summary?: string
  note?: string
}

const REPO_ROOT = path.resolve(process.cwd(), "..")

let entitiesCache: Array<{ name: string }> | null = null
function loadEntities() {
  if (entitiesCache) return entitiesCache
  const raw = fs.readFileSync(path.join(REPO_ROOT, "data", "entities.jsonl"), "utf-8")
  entitiesCache = raw
    .split("\n")
    .filter(Boolean)
    .map((l) => { try { return JSON.parse(l) } catch { return null } })
    .filter((e): e is { name: string } => !!e && !!e.name)
  return entitiesCache
}

function resolveTitle(fragment: string): string {
  const ents = loadEntities()
  const lc = fragment.toLowerCase().trim()
  const exact = ents.find((e) => e.name.toLowerCase() === lc)
  if (exact) return exact.name
  const starts = ents.find((e) => e.name.toLowerCase().startsWith(lc))
  if (starts) return starts.name
  const contains = ents.find((e) => e.name.toLowerCase().includes(lc))
  if (contains) return contains.name
  return fragment
}

function findBioguide(title: string): string | null {
  // Scan politician profiles for matching title → bioguide-id
  const root = path.join(REPO_ROOT, "content", "Politicians")
  const stack = [root]
  while (stack.length) {
    const dir = stack.pop() as string
    let entries
    try { entries = fs.readdirSync(dir, { withFileTypes: true }) } catch { continue }
    for (const e of entries) {
      if (e.name.startsWith(".")) continue
      const full = path.join(dir, e.name)
      if (e.isDirectory()) stack.push(full)
      else if (e.name.endsWith(".md")) {
        let text
        try { text = fs.readFileSync(full, "utf-8") } catch { continue }
        const m = text.match(/^---\n([\s\S]*?)\n---/)
        if (!m) continue
        // Parse minimal title + bioguide without full yaml to stay fast
        const tm = m[1].match(/\btitle:\s*['"]?([^'"\n]+?)['"]?\s*\n/)
        const bm = m[1].match(/\bbioguide-id:\s*['"]?([A-Z0-9]+)['"]?/)
        if (!tm || !bm) continue
        const profileTitle = tm[1].trim()
        if (profileTitle === title || profileTitle.replace(" Master Profile", "") === title) {
          return bm[1]
        }
      }
    }
  }
  return null
}

function showVotingRecord(bioguide: string, title: string): AskResult {
  const votesPath = path.join(REPO_ROOT, "data", "votes.jsonl")
  const posPath = path.join(REPO_ROOT, "data", "legislator-positions.jsonl")
  const voteMeta = new Map<string, { chamber: string; congress: number; session: number; date?: string; bill?: { type: string; number: string } }>()
  for (const line of fs.readFileSync(votesPath, "utf-8").split("\n")) {
    if (!line.trim()) continue
    try { const v = JSON.parse(line); voteMeta.set(v.vote_id, v) } catch {}
  }
  const positions: Array<{ vote_id: string; position: string }> = []
  for (const line of fs.readFileSync(posPath, "utf-8").split("\n")) {
    if (!line.trim()) continue
    try { const p = JSON.parse(line); if (p.bioguide === bioguide) positions.push(p) } catch {}
  }
  let y = 0, n = 0
  for (const p of positions) {
    if (p.position === "Aye" || p.position === "Yea") y++
    else if (p.position === "No" || p.position === "Nay") n++
  }
  const byCong: Record<string, number> = {}
  for (const p of positions) {
    const v = voteMeta.get(p.vote_id)
    if (!v) continue
    const k = `${v.chamber} ${v.congress}/${v.session}`
    byCong[k] = (byCong[k] || 0) + 1
  }
  return {
    question: title,
    intent: "voting_record",
    resolved_title: title,
    total: positions.length,
    rows: Object.entries(byCong).sort().map(([k, count]) => ({ session: k, vote_count: count })),
    summary: `${title} (bioguide ${bioguide}): ${positions.length.toLocaleString()} roll-call positions. Yes: ${y}, No: ${n}, Other: ${positions.length - y - n}.`,
  }
}

function stripQW(s: string): string {
  return s.replace(/^(who|what|where|how|show me|tell me|list|find|get)\s+/i, "").trim()
}

function classify(
  q: string
): { intent: Intent; subjectName?: string; extra?: { year?: string } } {
  const lower = q.toLowerCase()
  if (/cross[- ]party/.test(lower)) return { intent: "cross_party_donors" }
  let m
  m = lower.match(/^(.+?)\s+voting record$/) || lower.match(/^how did (.+?) vote/)
  if (m) return { intent: "voting_record", subjectName: m[1] }
  m = lower.match(/what boards?.+is\s+(.+?)\s+on$/) || lower.match(/^(.+?)'?s\s+boards?$/)
  if (m) return { intent: "affiliations_from", subjectName: m[1] }
  m = lower.match(/who.*board of\s+(.+?)$/) || lower.match(/^board of\s+(.+?)$/)
  if (m) return { intent: "affiliations_to", subjectName: m[1] }
  m = lower.match(/(?:biggest|top)?\s*grants? from\s+(.+?)(?:\s+in\s+(\d{4}))?$/)
  if (m) return { intent: "grants_from", subjectName: m[1], extra: { year: m[2] } }
  m =
    lower.match(/top donors? (?:to|for)\s+(.+?)$/) ||
    lower.match(/(?:who funds|funders of|who funded)\s+(.+?)$/)
  if (m) return { intent: "donors_to", subjectName: m[1] }
  m =
    lower.match(/where does\s+(.+?)(?:'s)?\s+money go/) ||
    lower.match(/(?:what does|where does)\s+(.+?)\s+fund/) ||
    lower.match(/(?:top recipients (?:of|from))\s+(.+?)$/)
  if (m) return { intent: "recipients_from", subjectName: m[1] }
  return { intent: "generic", subjectName: stripQW(q) }
}

async function handleQuestion(question: string): Promise<AskResult> {
  const c = classify(question)
  const engine = createQueryEngine()

  if (c.intent === "cross_party_donors") {
    const r = await engine.query({
      subject: "cross_party_donors",
      filters: { days: 365 },
      limit: 25,
    })
    return {
      question,
      intent: c.intent,
      total: r.total || r.rows.length,
      rows: r.rows,
      summary: `${r.total || r.rows.length} donors who gave to candidates in BOTH major parties within the last 365 days.`,
    }
  }

  if (c.intent === "voting_record") {
    const name = resolveTitle(c.subjectName as string)
    const bio = findBioguide(name)
    if (!bio)
      return {
        question,
        intent: c.intent,
        total: 0,
        rows: [],
        note: `No bioguide found for "${name}". Voting record requires a politician profile with bioguide-id in frontmatter.`,
      }
    return showVotingRecord(bio, name)
  }

  if (c.intent === "affiliations_from" || c.intent === "affiliations_to") {
    const name = resolveTitle(c.subjectName as string)
    const side = c.intent === "affiliations_from" ? "from" : "to"
    const r = await engine.query({
      subject: "edges",
      filters: { [side]: name, type: "affiliation" },
      limit: 50,
    })
    return {
      question,
      intent: c.intent,
      resolved_title: name,
      total: r.total,
      rows: r.rows,
      summary:
        c.intent === "affiliations_from"
          ? `${name} appears as an officer on ${r.total} board(s)`
          : `${r.total} officer(s) recorded on ${name}'s board(s)`,
    }
  }

  if (c.intent === "grants_from") {
    const name = resolveTitle(c.subjectName as string)
    const filters: Record<string, unknown> = {
      from: name,
      type: "monetary",
      source: "irs-990-bulk",
    }
    if (c.extra?.year) filters.cycle = c.extra.year
    const r = await engine.query({ subject: "edges", filters, limit: 200 })
    const rows = [...r.rows].sort((a: any, b: any) => (b.amount || 0) - (a.amount || 0)).slice(0, 50)
    const total$ = rows.reduce((acc: number, e: any) => acc + (Number(e.amount) || 0), 0)
    return {
      question,
      intent: c.intent,
      resolved_title: name,
      total: r.total,
      rows,
      summary: `${name}${c.extra?.year ? " (" + c.extra.year + ")" : ""}: ${r.total} grants totaling ~$${(total$ / 1e6).toFixed(1)}M across top 50 shown.`,
    }
  }

  if (c.intent === "donors_to") {
    const name = resolveTitle(c.subjectName as string)
    const r = await engine.query({
      subject: "edges",
      filters: { to: name, type: "monetary" },
      limit: 500,
    })
    const rows = [...r.rows].sort((a: any, b: any) => (b.amount || 0) - (a.amount || 0)).slice(0, 50)
    const total$ = rows.filter((e: any) => e.amount).reduce((acc: number, e: any) => acc + (Number(e.amount) || 0), 0)
    return {
      question,
      intent: c.intent,
      resolved_title: name,
      total: r.total,
      rows,
      summary: `Top donors to ${name}: ${r.total} total edges, ~$${(total$ / 1e6).toFixed(1)}M tracked across top 50.`,
    }
  }

  if (c.intent === "recipients_from") {
    const name = resolveTitle(c.subjectName as string)
    const r = await engine.query({
      subject: "edges",
      filters: { from: name, type: "monetary" },
      limit: 500,
    })
    const rows = [...r.rows].sort((a: any, b: any) => (b.amount || 0) - (a.amount || 0)).slice(0, 50)
    const total$ = rows.filter((e: any) => e.amount).reduce((acc: number, e: any) => acc + (Number(e.amount) || 0), 0)
    return {
      question,
      intent: c.intent,
      resolved_title: name,
      total: r.total,
      rows,
      summary: `${name} outflows: ${r.total} total edges, ~$${(total$ / 1e6).toFixed(1)}M tracked across top 50.`,
    }
  }

  // generic fallback
  const name = resolveTitle(c.subjectName as string)
  const out = await engine.query({ subject: "edges", filters: { from: name }, limit: 25 })
  const inc = await engine.query({ subject: "edges", filters: { to: name }, limit: 25 })
  return {
    question,
    intent: "generic",
    resolved_title: name,
    total: out.total + inc.total,
    rows: [...(out.rows || []).map((r: any) => ({ dir: "out", ...r })), ...(inc.rows || []).map((r: any) => ({ dir: "in", ...r }))],
    summary: `Generic lookup on "${name}": ${out.total} outgoing + ${inc.total} incoming edges. Try a more specific question pattern for better results (see /ask examples).`,
  }
}

export async function POST(req: NextRequest) {
  const gate = await requireTier(req, "free-auth")
  if (!gate.ok) return gate.response!

  const minute = checkPerMinuteLimit(gate.user, "/api/ask")
  if (!minute.allowed) {
    return NextResponse.json(
      { error: "rate limit (per-minute)", retry_after_seconds: minute.retry_after_seconds, limit: minute.limit },
      { status: 429, headers: { "Retry-After": String(minute.retry_after_seconds || 60) } },
    )
  }
  const daily = checkDailyLimit(gate.user, "/api/ask")
  if (!daily.allowed) {
    return NextResponse.json(
      { error: "rate limit (daily)", retry_after_seconds: daily.retry_after_seconds, limit: daily.limit },
      { status: 429 },
    )
  }

  let body: { question?: string }
  try { body = await req.json() } catch { return NextResponse.json({ error: "invalid json body" }, { status: 400 }) }
  const question = (body.question || "").trim()
  if (!question) return NextResponse.json({ error: "question required" }, { status: 400 })
  if (question.length > 400) return NextResponse.json({ error: "question too long (max 400 chars)" }, { status: 400 })

  try {
    const result = await handleQuestion(question)
    return NextResponse.json(result)
  } catch (err) {
    return NextResponse.json({ error: String(err instanceof Error ? err.message : err) }, { status: 500 })
  }
}
