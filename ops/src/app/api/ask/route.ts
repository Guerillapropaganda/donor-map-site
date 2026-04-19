import { NextRequest, NextResponse } from "next/server"
import { createQueryEngine } from "@/lib/query-engine"
import { requireTier } from "@/lib/auth"
import { checkDailyLimit, checkPerMinuteLimit } from "@/lib/rate-limit"
import fs from "node:fs"
import path from "node:path"

export const dynamic = "force-dynamic"

// ─── /api/ask ────────────────────────────────────────────────────────
// Natural-language wrapper over the query engine. Pattern-matches a
// question string to one of several intents, runs it against the
// canonical stores, returns a structured payload. Intents:
//   - edge_between        two-entity edge: "X funds Y", "did X fund Y"
//   - summary             profile snapshot: "tell me about X"
//   - donors_to           "who funds X", "top donors to X"
//   - recipients_from     "where does X's money go"
//   - grants_from         "biggest grants from X [in YYYY]"
//   - affiliations_from   "what boards is X on"
//   - affiliations_to     "who's on the board of X"
//   - voting_record       "X voting record"
//   - cross_party_donors  "cross party donors"
//   - leaderboard         "top donors", "biggest super PACs", etc.
//   - money_chain         "money chain from X to Y" (1-3 hop BFS)
//   - llm_fallback        last resort if ANTHROPIC_API_KEY set
//   - generic             final fallback, dump of edges touching X

type Intent =
  | "cross_party_donors"
  | "voting_record"
  | "affiliations_from"
  | "affiliations_to"
  | "grants_from"
  | "donors_to"
  | "recipients_from"
  | "edge_between"
  | "summary"
  | "leaderboard"
  | "money_chain"
  | "generic"

interface AskResult {
  question: string
  intent: Intent
  resolved_title?: string | null
  resolved_title_2?: string | null
  did_you_mean?: string[]
  spec?: unknown
  total: number
  rows: unknown[]
  summary?: string
  note?: string
}

const REPO_ROOT = path.resolve(process.cwd(), "..")

// ─── Entity index + fuzzy resolver ────────────────────────────────────

interface EntityRec {
  id: string
  name: string
  entity_type?: string
  profile_path?: string
  signals?: Record<string, unknown>
  capital_type?: string | null
  ideological_function?: string[]
}

let entitiesCache: EntityRec[] | null = null
function loadEntities(): EntityRec[] {
  if (entitiesCache) return entitiesCache
  const raw = fs.readFileSync(path.join(REPO_ROOT, "data", "entities.jsonl"), "utf-8")
  entitiesCache = raw
    .split("\n")
    .filter(Boolean)
    .map((l) => { try { return JSON.parse(l) as EntityRec } catch { return null } })
    .filter((e): e is EntityRec => !!e && !!e.name)
  return entitiesCache
}

/**
 * Levenshtein distance, bounded cheap version. Returns Infinity if
 * beyond threshold so the caller can early-reject.
 */
function editDistance(a: string, b: string, max = 4): number {
  if (Math.abs(a.length - b.length) > max) return Infinity
  const m = a.length, n = b.length
  if (m === 0) return n
  if (n === 0) return m
  let prev = new Array(n + 1)
  let curr = new Array(n + 1)
  for (let j = 0; j <= n; j++) prev[j] = j
  for (let i = 1; i <= m; i++) {
    curr[0] = i
    let rowMin = curr[0]
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost)
      if (curr[j] < rowMin) rowMin = curr[j]
    }
    if (rowMin > max) return Infinity
    ;[prev, curr] = [curr, prev]
  }
  return prev[n]
}

interface ResolveResult {
  title: string
  candidates: string[]   // non-empty if match was fuzzy; caller can surface as "did you mean"
  exact: boolean
}

function resolveTitle(fragment: string): ResolveResult {
  const ents = loadEntities()
  const lc = fragment.toLowerCase().trim()
  if (!lc) return { title: fragment, candidates: [], exact: false }

  // 1. exact (case-insensitive)
  const exact = ents.find((e) => e.name.toLowerCase() === lc)
  if (exact) return { title: exact.name, candidates: [], exact: true }

  // 2. startsWith
  const starts = ents.find((e) => e.name.toLowerCase().startsWith(lc))
  if (starts) return { title: starts.name, candidates: [], exact: true }

  // 3. contains
  const contains = ents.find((e) => e.name.toLowerCase().includes(lc))
  if (contains) return { title: contains.name, candidates: [], exact: true }

  // 4. fuzzy — Levenshtein on normalized names
  const threshold = Math.max(1, Math.floor(lc.length / 5))
  const ranked = ents
    .map((e) => ({ name: e.name, dist: editDistance(lc, e.name.toLowerCase(), threshold + 2) }))
    .filter((r) => r.dist <= threshold + 1)
    .sort((a, b) => a.dist - b.dist)
    .slice(0, 5)

  if (ranked.length > 0) {
    return { title: ranked[0].name, candidates: ranked.map((r) => r.name), exact: false }
  }
  return { title: fragment, candidates: [], exact: false }
}

function findEntity(title: string): EntityRec | null {
  const ents = loadEntities()
  return ents.find((e) => e.name === title) || null
}

// ─── Bioguide lookup for voting records ──────────────────────────────

function findBioguide(title: string): string | null {
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
        const tm = m[1].match(/\btitle:\s*['"]?([^'"\n]+?)['"]?\s*\n/)
        const bm = m[1].match(/\bbioguide-id:\s*['"]?([A-Z0-9]+)['"]?/)
        if (!tm || !bm) continue
        const pt = tm[1].trim()
        if (pt === title || pt.replace(" Master Profile", "") === title) return bm[1]
      }
    }
  }
  return null
}

// ─── Voting record ────────────────────────────────────────────────────

function showVotingRecord(bioguide: string, title: string, question: string): AskResult {
  const votesPath = path.join(REPO_ROOT, "data", "votes.jsonl")
  const posPath = path.join(REPO_ROOT, "data", "legislator-positions.jsonl")
  const voteMeta = new Map<string, { chamber: string; congress: number; session: number; date?: string; bill?: { type: string; number: string } }>()
  for (const line of fs.readFileSync(votesPath, "utf-8").split("\n")) {
    if (!line.trim()) continue
    try { const v = JSON.parse(line); voteMeta.set(v.vote_id, v) } catch {}
  }
  const positions: Array<{ vote_id: string; position: string; party?: string }> = []
  for (const line of fs.readFileSync(posPath, "utf-8").split("\n")) {
    if (!line.trim()) continue
    try { const p = JSON.parse(line); if (p.bioguide === bioguide) positions.push(p) } catch {}
  }

  // party loyalty: compare this member's Y/N against their party's majority
  const byVote = new Map<string, { R?: { Y: number; N: number }; D?: { Y: number; N: number }; I?: { Y: number; N: number } }>()
  for (const line of fs.readFileSync(posPath, "utf-8").split("\n")) {
    if (!line.trim()) continue
    try {
      const p = JSON.parse(line)
      if (!byVote.has(p.vote_id)) byVote.set(p.vote_id, {})
      const tally = byVote.get(p.vote_id)!
      const norm = p.position === "Aye" || p.position === "Yea" ? "Y" : p.position === "No" || p.position === "Nay" ? "N" : null
      if (!norm) continue
      if (!tally[p.party as "R" | "D" | "I"]) (tally as any)[p.party] = { Y: 0, N: 0 }
      ;(tally as any)[p.party][norm]++
    } catch {}
  }

  let y = 0, n = 0, withParty = 0, devCount = 0
  const deviations: Array<{ vote_id: string; position: string; party_majority: string; date?: string; bill?: string }> = []
  for (const p of positions) {
    const norm = p.position === "Aye" || p.position === "Yea" ? "Y" : p.position === "No" || p.position === "Nay" ? "N" : null
    if (!norm) continue
    if (norm === "Y") y++
    else n++
    const tally = byVote.get(p.vote_id)
    if (!tally || !p.party) continue
    const partyTally = (tally as any)[p.party]
    if (!partyTally) continue
    const maj = partyTally.Y > partyTally.N ? "Y" : partyTally.N > partyTally.Y ? "N" : null
    if (!maj) continue
    if (norm === maj) withParty++
    else {
      devCount++
      const v = voteMeta.get(p.vote_id)
      deviations.push({
        vote_id: p.vote_id,
        position: p.position,
        party_majority: maj,
        date: v?.date?.slice(0, 10),
        bill: v?.bill ? `${v.bill.type} ${v.bill.number}` : undefined,
      })
    }
  }
  const substantive = y + n
  const loyalty = substantive > 0 ? ((withParty / substantive) * 100).toFixed(1) + "%" : "—"

  deviations.sort((a, b) => (b.date || "").localeCompare(a.date || ""))

  return {
    question,
    intent: "voting_record",
    resolved_title: title,
    total: positions.length,
    rows: deviations.slice(0, 25),
    summary: `${title} (bioguide ${bioguide}): ${positions.length.toLocaleString()} roll-calls tracked, ${substantive} substantive Y/N, party-line loyalty ${loyalty}, ${devCount} deviations. Showing ${Math.min(25, deviations.length)} most-recent deviations.`,
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────

function stripQW(s: string): string {
  return s.replace(/^(who|what|where|how|show me|tell me|list|find|get)\s+/i, "").trim()
}

// ─── Classifier ──────────────────────────────────────────────────────

interface ClassifiedQuestion {
  intent: Intent
  subjectName?: string
  objectName?: string
  extra?: { year?: string; topic?: string }
}

function classify(q: string): ClassifiedQuestion {
  const lower = q.toLowerCase().trim()

  // Cross-party composer
  if (/cross[- ]party/.test(lower)) return { intent: "cross_party_donors" }

  // Voting record
  let m = lower.match(/^(.+?)\s+voting record$/) || lower.match(/^how did (.+?) vote/)
  if (m) return { intent: "voting_record", subjectName: m[1] }

  // Leaderboards (no subject entity, just an aggregate)
  if (/^top\s+(donors|givers|funders)($|\s+overall)/.test(lower)) return { intent: "leaderboard", extra: { topic: "top_donors" } }
  if (/^(top|biggest)\s+super[- ]?pacs?$/.test(lower)) return { intent: "leaderboard", extra: { topic: "top_superpacs" } }
  if (/^(top|most[- ]?funded)\s+(politicians|candidates)/.test(lower)) return { intent: "leaderboard", extra: { topic: "top_politicians" } }
  if (/^(biggest|top)\s+(pacs?|committees)$/.test(lower)) return { intent: "leaderboard", extra: { topic: "top_pacs" } }
  if (/^top\s+daf\b/.test(lower) || /^top\s+donor[- ]advised/.test(lower)) return { intent: "leaderboard", extra: { topic: "top_dafs" } }

  // Money chain (multi-hop) — "money chain from X to Y" / "flow from X to Y" / "how does money get from X to Y"
  m =
    lower.match(/(?:money chain|money flow|flow|path|chain)\s+from\s+(.+?)\s+to\s+(.+?)$/) ||
    lower.match(/how does money (?:get|flow|move)\s+from\s+(.+?)\s+to\s+(.+?)$/)
  if (m) return { intent: "money_chain", subjectName: m[1], objectName: m[2] }

  // Single-entity donor/recipient lookups — MUST run before edge_between
  // so "who funds X" doesn't get swallowed by the "X funds Y" pattern.

  // Affiliations — "what boards is X on"
  m = lower.match(/what boards?.+is\s+(.+?)\s+on$/) || lower.match(/^(.+?)'?s\s+boards?$/)
  if (m) return { intent: "affiliations_from", subjectName: m[1] }
  m = lower.match(/who.*board of\s+(.+?)$/) || lower.match(/^board of\s+(.+?)$/)
  if (m) return { intent: "affiliations_to", subjectName: m[1] }

  // Grants from X [in YYYY]
  m = lower.match(/(?:biggest|top)?\s*grants? from\s+(.+?)(?:\s+in\s+(\d{4}))?$/)
  if (m) return { intent: "grants_from", subjectName: m[1], extra: { year: m[2] } }

  // Donors to X
  m =
    lower.match(/top donors? (?:to|for)\s+(.+?)$/) ||
    lower.match(/(?:who funds|funders of|who funded)\s+(.+?)$/)
  if (m) return { intent: "donors_to", subjectName: m[1] }

  // Recipients from X
  m =
    lower.match(/where does\s+(.+?)(?:'s)?\s+money go/) ||
    lower.match(/(?:what does|where does)\s+(.+?)\s+fund/) ||
    lower.match(/(?:top recipients (?:of|from))\s+(.+?)$/)
  if (m) return { intent: "recipients_from", subjectName: m[1] }

  // Edge between two entities — "X funds Y" / "X gave to Y" / "X to Y" / "does X fund Y".
  // Runs after donors_to/recipients_from so single-entity phrasings match first.
  // Guard: reject if subject is a bare question word (who/what/where/etc) that
  // slipped past — those should have hit donors_to above.
  m =
    lower.match(/^does\s+(.+?)\s+(?:fund|support|give to|donate to)\s+(.+?)[\?]?$/) ||
    lower.match(/^did\s+(.+?)\s+(?:fund|support|give to|donate to)\s+(.+?)[\?]?$/) ||
    lower.match(/^(.+?)\s+(?:funds|funded|gives to|gave to|donates to|donated to)\s+(.+?)$/) ||
    lower.match(/^(.+?)\s+to\s+(.+?)\s+money$/)
  if (m && !lower.includes("cross") && m[1].split(" ").length <= 6 && m[2].split(" ").length <= 6) {
    const subj = m[1].trim()
    if (!/^(who|what|where|how|did|does|tell|show|find|get|list|about)$/.test(subj)) {
      return { intent: "edge_between", subjectName: subj, objectName: m[2] }
    }
  }

  // Summary / profile snapshot
  m =
    lower.match(/^(?:tell me about|about|summary of|summarize|snapshot of|profile of|who is|what is)\s+(.+?)$/) ||
    lower.match(/^(.+?)\s+summary$/) ||
    lower.match(/^(.+?)\s+snapshot$/)
  if (m) return { intent: "summary", subjectName: m[1] }

  // Fallback
  return { intent: "generic", subjectName: stripQW(q) }
}

// ─── Intent handlers ─────────────────────────────────────────────────

async function handleEdgeBetween(c: ClassifiedQuestion, question: string, engine: any): Promise<AskResult> {
  const a = resolveTitle(c.subjectName as string)
  const b = resolveTitle(c.objectName as string)

  const r1 = await engine.query({ subject: "edges", filters: { from: a.title, to: b.title }, limit: 100 })
  const r2 = await engine.query({ subject: "edges", filters: { from: b.title, to: a.title }, limit: 100 })
  const forward = r1.rows || []
  const reverse = r2.rows || []

  // Separate monetary edges (the ones with real dollars) from "related"
  // and other weak-signal types that exist only because one side was
  // wiki-linked from the other.
  const monetaryForward = forward.filter((e: any) => e.type === "monetary" && e.amount)
  const monetaryReverse = reverse.filter((e: any) => e.type === "monetary" && e.amount)
  const affiliationForward = forward.filter((e: any) => e.type === "affiliation")
  const affiliationReverse = reverse.filter((e: any) => e.type === "affiliation")
  const fwdTotal = monetaryForward.reduce((acc: number, e: any) => acc + Number(e.amount), 0)
  const revTotal = monetaryReverse.reduce((acc: number, e: any) => acc + Number(e.amount), 0)

  // If direct monetary edges exist, great — just show them.
  if (monetaryForward.length + monetaryReverse.length + affiliationForward.length + affiliationReverse.length > 0) {
    const rows = [
      ...monetaryForward.map((e: any) => ({ direction: "→", kind: "direct $", ...e })),
      ...monetaryReverse.map((e: any) => ({ direction: "←", kind: "direct $", ...e })),
      ...affiliationForward.map((e: any) => ({ direction: "→", kind: "affiliation", ...e })),
      ...affiliationReverse.map((e: any) => ({ direction: "←", kind: "affiliation", ...e })),
    ]
    const parts: string[] = []
    if (monetaryForward.length) parts.push(`${a.title} → ${b.title}: ${monetaryForward.length} monetary edge(s), $${(fwdTotal / 1e6).toFixed(2)}M`)
    if (monetaryReverse.length) parts.push(`${b.title} → ${a.title}: ${monetaryReverse.length} monetary edge(s), $${(revTotal / 1e6).toFixed(2)}M`)
    if (affiliationForward.length || affiliationReverse.length) parts.push(`${affiliationForward.length + affiliationReverse.length} affiliation edge(s)`)
    return {
      question,
      intent: "edge_between",
      resolved_title: a.title,
      resolved_title_2: b.title,
      did_you_mean: [...(a.candidates || []), ...(b.candidates || [])].filter(Boolean).slice(0, 5),
      total: rows.length,
      rows: rows.slice(0, 50),
      summary: parts.join("; "),
    }
  }

  // No direct monetary / affiliation edges. Fall through to money-chain BFS
  // so the user sees intermediary paths (this is the common case — e.g.
  // "elon musk funds donald trump" flows through America PAC, not directly).
  const chain = await handleMoneyChain(
    { intent: "money_chain", subjectName: a.title, objectName: b.title },
    question,
  )

  const haveRelatedOnly = [...forward, ...reverse].filter((e: any) => e.type === "related").length > 0

  return {
    ...chain,
    intent: "edge_between",
    resolved_title: a.title,
    resolved_title_2: b.title,
    did_you_mean: [...(a.candidates || []), ...(b.candidates || [])].filter(Boolean).slice(0, 5),
    summary:
      chain.total > 0
        ? `No direct monetary edge in the store. Found ${chain.total} money-chain path(s) through intermediaries (up to 3 hops). ${haveRelatedOnly ? "The two profiles are also linked via vault-side 'related' references. " : ""}Ranked by min-edge bottleneck.`
        : `No direct monetary edge AND no money chain within 3 hops. They may not be connected through tracked dollar flows yet. Try asking for one side's donors/recipients.`,
  }
}

async function handleSummary(c: ClassifiedQuestion, question: string, engine: any): Promise<AskResult> {
  const r = resolveTitle(c.subjectName as string)
  const name = r.title
  const ent = findEntity(name)

  const inflows = await engine.query({ subject: "edges", filters: { to: name, type: "monetary" }, limit: 500 })
  const outflows = await engine.query({ subject: "edges", filters: { from: name, type: "monetary" }, limit: 500 })
  const affiliations_from = await engine.query({ subject: "edges", filters: { from: name, type: "affiliation" }, limit: 20 })
  const affiliations_to = await engine.query({ subject: "edges", filters: { to: name, type: "affiliation" }, limit: 20 })

  const topIn = [...(inflows.rows || [])]
    .filter((e: any) => e.amount)
    .sort((a: any, b: any) => (b.amount || 0) - (a.amount || 0))
    .slice(0, 5)
    .map((e: any) => ({ kind: "top-donor", from: e.from, to: name, amount: e.amount, cycle: e.cycle, source: e.source }))

  const topOut = [...(outflows.rows || [])]
    .filter((e: any) => e.amount)
    .sort((a: any, b: any) => (b.amount || 0) - (a.amount || 0))
    .slice(0, 5)
    .map((e: any) => ({ kind: "top-recipient", from: name, to: e.to, amount: e.amount, cycle: e.cycle, source: e.source }))

  const boards = [...(affiliations_from.rows || [])].slice(0, 10).map((e: any) => ({
    kind: "board-seat",
    from: name,
    to: e.to,
    role: e.role,
    date_range: e.date_range,
  }))
  const officers = [...(affiliations_to.rows || [])].slice(0, 10).map((e: any) => ({
    kind: "officer",
    from: e.from,
    to: name,
    role: e.role,
    date_range: e.date_range,
  }))

  const classTags: string[] = []
  if (ent?.capital_type) classTags.push(`capital_type:${ent.capital_type}`)
  if (ent?.ideological_function && ent.ideological_function.length > 0)
    classTags.push(...ent.ideological_function.map((f) => `ideological_function:${f}`))
  const tagRows = classTags.map((t) => ({ kind: "class-tag", tag: t }))

  // For PEOPLE (or anyone with 0 direct edges), also pull flows from the
  // orgs they chair. Money doesn't usually flow through a person's name —
  // it flows through their foundation / c4 / super PAC. Show those.
  const viaOrgs: Array<Record<string, unknown>> = []
  if (topIn.length === 0 && topOut.length === 0 && boards.length > 0) {
    for (const b of boards.slice(0, 3)) {
      const orgName = b.to as string
      if (!orgName) continue
      const orgIn = await engine.query({ subject: "edges", filters: { to: orgName, type: "monetary" }, limit: 50 })
      const orgOut = await engine.query({ subject: "edges", filters: { from: orgName, type: "monetary" }, limit: 50 })
      ;[...(orgIn.rows || [])]
        .filter((e: any) => e.amount)
        .sort((a: any, b: any) => (b.amount || 0) - (a.amount || 0))
        .slice(0, 3)
        .forEach((e: any) =>
          viaOrgs.push({ kind: `via ${orgName} (in)`, from: e.from, to: orgName, amount: e.amount, cycle: e.cycle, source: e.source }),
        )
      ;[...(orgOut.rows || [])]
        .filter((e: any) => e.amount)
        .sort((a: any, b: any) => (b.amount || 0) - (a.amount || 0))
        .slice(0, 3)
        .forEach((e: any) =>
          viaOrgs.push({ kind: `via ${orgName} (out)`, from: orgName, to: e.to, amount: e.amount, cycle: e.cycle, source: e.source }),
        )
    }
  }

  const rows = [...tagRows, ...topIn, ...topOut, ...boards, ...officers, ...viaOrgs]

  return {
    question,
    intent: "summary",
    resolved_title: name,
    did_you_mean: r.candidates.slice(0, 5),
    total: rows.length,
    rows,
    summary:
      `${name} (${ent?.entity_type || "unknown"}${ent?.signals?.sector ? ", " + (ent.signals.sector as string) : ""}): ` +
      `${inflows.total} inbound edges, ${outflows.total} outbound edges, ${affiliations_from.total + affiliations_to.total} affiliations` +
      (viaOrgs.length > 0 ? ` (plus ${viaOrgs.length} flows surfaced via orgs this person chairs)` : "") +
      `. ` +
      (classTags.length > 0 ? `Class tags: ${classTags.join(", ")}.` : "No class tags approved."),
  }
}

async function handleLeaderboard(c: ClassifiedQuestion, question: string, _engine: any): Promise<AskResult> {
  // All leaderboard variants run off the relationships.jsonl edge store directly
  const topic = c.extra?.topic || "top_donors"
  const raw = fs.readFileSync(path.join(REPO_ROOT, "data", "relationships.jsonl"), "utf-8")
  const byFrom = new Map<string, { edges: number; total: number }>()
  const byTo = new Map<string, { edges: number; total: number }>()
  for (const line of raw.split("\n")) {
    if (!line.trim()) continue
    try {
      const e = JSON.parse(line)
      if (e.type !== "monetary" || !e.amount) continue
      const a = byFrom.get(e.from) || { edges: 0, total: 0 }
      a.edges++; a.total += Number(e.amount) || 0; byFrom.set(e.from, a)
      const b = byTo.get(e.to) || { edges: 0, total: 0 }
      b.edges++; b.total += Number(e.amount) || 0; byTo.set(e.to, b)
    } catch {}
  }

  const ents = loadEntities()
  const entByName = new Map(ents.map((e) => [e.name, e] as const))

  function typeMatch(name: string, wanted: string): boolean {
    const ent = entByName.get(name)
    if (!ent) return false
    if (wanted === "pac" || wanted === "superpac") {
      const secSuper = (ent.signals as any)?.sector?.toLowerCase?.() || ""
      return (ent.entity_type === "pac" || ent.entity_type === "donor") && (secSuper.includes("super") || secSuper.includes("pac") || wanted === "pac")
    }
    if (wanted === "politician") return ent.entity_type === "politician" || ent.entity_type === "state-politician"
    if (wanted === "daf") {
      const kind = ((ent.signals as any)?.entity_type_label || "").toString().toLowerCase()
      const sec = ((ent.signals as any)?.sector || "").toString().toLowerCase()
      return kind.includes("donor-advised") || sec.includes("wall street") || ent.name.toLowerCase().includes("charitable")
    }
    return true
  }

  let rows: Array<Record<string, unknown>> = []
  let summary = ""
  if (topic === "top_donors") {
    rows = [...byFrom.entries()]
      .map(([name, v]) => ({ name, edges: v.edges, total: v.total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 25)
    summary = `Top 25 donors by total monetary-edge dollars out.`
  } else if (topic === "top_superpacs") {
    rows = [...byFrom.entries()]
      .filter(([name]) => typeMatch(name, "superpac"))
      .map(([name, v]) => ({ name, edges: v.edges, total: v.total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 25)
    summary = `Top 25 super PACs by dollars out (entity_type=pac or donor + sector match).`
  } else if (topic === "top_pacs") {
    rows = [...byFrom.entries()]
      .filter(([name]) => typeMatch(name, "pac"))
      .map(([name, v]) => ({ name, edges: v.edges, total: v.total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 25)
    summary = `Top 25 PACs / political committees by dollars out.`
  } else if (topic === "top_politicians") {
    rows = [...byTo.entries()]
      .filter(([name]) => typeMatch(name, "politician"))
      .map(([name, v]) => ({ name, edges: v.edges, total: v.total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 25)
    summary = `Top 25 politicians by dollars received.`
  } else if (topic === "top_dafs") {
    rows = [...byFrom.entries()]
      .filter(([name]) => typeMatch(name, "daf"))
      .map(([name, v]) => ({ name, edges: v.edges, total: v.total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 25)
    summary = `Top 25 donor-advised funds / charitable vehicles by grant dollars out.`
  }

  return { question, intent: "leaderboard", total: rows.length, rows, summary }
}

async function handleMoneyChain(c: ClassifiedQuestion, question: string): Promise<AskResult> {
  const a = resolveTitle(c.subjectName as string)
  const b = resolveTitle(c.objectName as string)
  // Build adjacency from monetary edges only
  const raw = fs.readFileSync(path.join(REPO_ROOT, "data", "relationships.jsonl"), "utf-8")
  const adj = new Map<string, Array<{ to: string; amount: number; cycle?: string; source: string }>>()
  for (const line of raw.split("\n")) {
    if (!line.trim()) continue
    try {
      const e = JSON.parse(line)
      if (e.type !== "monetary" || !e.amount) continue
      const arr = adj.get(e.from) || []
      arr.push({ to: e.to, amount: Number(e.amount), cycle: e.cycle, source: e.source })
      adj.set(e.from, arr)
    } catch {}
  }

  // BFS up to 3 hops from A to B, keep all paths, rank by min-amount along path
  const maxDepth = 3
  const paths: Array<{ path: string[]; edges: any[]; min_amount: number; total_pass_through: number }> = []
  const queue: Array<{ node: string; path: string[]; edges: any[] }> = [{ node: a.title, path: [a.title], edges: [] }]
  let examined = 0
  const budget = 20000
  while (queue.length && examined < budget) {
    const cur = queue.shift()!
    examined++
    if (cur.node === b.title && cur.edges.length > 0) {
      const min = Math.min(...cur.edges.map((e) => e.amount))
      const total = cur.edges.reduce((acc, e) => acc + e.amount, 0)
      paths.push({ path: cur.path, edges: cur.edges, min_amount: min, total_pass_through: total })
      continue
    }
    if (cur.path.length > maxDepth) continue
    const nexts = adj.get(cur.node) || []
    for (const next of nexts) {
      if (cur.path.includes(next.to)) continue // no cycles
      queue.push({ node: next.to, path: [...cur.path, next.to], edges: [...cur.edges, next] })
    }
  }

  paths.sort((x, y) => y.min_amount - x.min_amount)

  return {
    question,
    intent: "money_chain",
    resolved_title: a.title,
    resolved_title_2: b.title,
    total: paths.length,
    rows: paths.slice(0, 10),
    summary:
      paths.length === 0
        ? `No ${maxDepth}-hop money chain found from ${a.title} to ${b.title}. They may not be connected in the canonical store yet, or the chain exceeds ${maxDepth} hops.`
        : `${paths.length} path(s) found (up to ${maxDepth} hops). Ranked by min-edge amount (the bottleneck). Examined ${examined} nodes.`,
  }
}

// ─── LLM fallback (optional, requires ANTHROPIC_API_KEY) ─────────────

async function llmClassify(question: string): Promise<ClassifiedQuestion | null> {
  const key = process.env.ANTHROPIC_API_KEY
  if (!key) return null
  const intents = [
    "donors_to: who funds X",
    "recipients_from: where does X's money go",
    "edge_between: X → Y edge lookup",
    "summary: profile snapshot of X",
    "affiliations_from: what boards is X on",
    "affiliations_to: who's on the board of X",
    "grants_from: biggest grants from X",
    "voting_record: X's voting record",
    "cross_party_donors: donors to both parties",
    "leaderboard: top donors / top PACs / top politicians / top DAFs",
    "money_chain: multi-hop path from X to Y",
  ]
  const prompt = `You're a question classifier for a political donor-map database. Map the user's question to ONE intent + entity names. Respond ONLY in JSON of the shape {"intent":"...","subjectName":"...","objectName":"...","year":"..."}.
Available intents:
${intents.join("\n")}

Question: ${question}`
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5",
        max_tokens: 150,
        messages: [{ role: "user", content: prompt }],
      }),
    })
    if (!res.ok) return null
    const j = await res.json()
    const text: string = j?.content?.[0]?.text || ""
    const m = text.match(/\{[\s\S]*\}/)
    if (!m) return null
    const parsed = JSON.parse(m[0])
    return {
      intent: parsed.intent as Intent,
      subjectName: parsed.subjectName,
      objectName: parsed.objectName,
      extra: parsed.year ? { year: parsed.year } : undefined,
    }
  } catch {
    return null
  }
}

// ─── Main handler ────────────────────────────────────────────────────

async function handleQuestion(question: string): Promise<AskResult> {
  let c = classify(question)
  const engine = await createQueryEngine()

  // If pattern-match fell into the generic bucket, try LLM fallback
  if (c.intent === "generic" && process.env.ANTHROPIC_API_KEY) {
    const llm = await llmClassify(question)
    if (llm && llm.intent && llm.intent !== "generic") {
      c = llm
    }
  }

  if (c.intent === "cross_party_donors") {
    const r = await engine.query({ subject: "cross_party_donors", filters: { days: 365 }, limit: 25 })
    return { question, intent: c.intent, total: r.total || r.rows.length, rows: r.rows, summary: `${r.total || r.rows.length} donors giving to BOTH major parties within the last 365 days.` }
  }
  if (c.intent === "voting_record") {
    const name = resolveTitle(c.subjectName as string)
    const bio = findBioguide(name.title)
    if (!bio) return { question, intent: c.intent, resolved_title: name.title, did_you_mean: name.candidates.slice(0, 5), total: 0, rows: [], note: `No bioguide-id found for "${name.title}".` }
    return showVotingRecord(bio, name.title, question)
  }
  if (c.intent === "leaderboard") return handleLeaderboard(c, question, engine)
  if (c.intent === "money_chain") return handleMoneyChain(c, question)
  if (c.intent === "edge_between") return handleEdgeBetween(c, question, engine)
  if (c.intent === "summary") return handleSummary(c, question, engine)

  if (c.intent === "affiliations_from" || c.intent === "affiliations_to") {
    const name = resolveTitle(c.subjectName as string)
    const side = c.intent === "affiliations_from" ? "from" : "to"
    const r = await engine.query({ subject: "edges", filters: { [side]: name.title, type: "affiliation" }, limit: 50 })
    return {
      question,
      intent: c.intent,
      resolved_title: name.title,
      did_you_mean: name.candidates.slice(0, 5),
      total: r.total,
      rows: r.rows,
      summary:
        c.intent === "affiliations_from"
          ? `${name.title} appears as officer on ${r.total} board(s)`
          : `${r.total} officer(s) recorded on ${name.title}'s board`,
    }
  }
  if (c.intent === "grants_from") {
    const name = resolveTitle(c.subjectName as string)
    const filters: Record<string, unknown> = { from: name.title, type: "monetary", source: "irs-990-bulk" }
    if (c.extra?.year) filters.cycle = c.extra.year
    const r = await engine.query({ subject: "edges", filters, limit: 200 })
    const rows = [...r.rows].sort((a: any, b: any) => (b.amount || 0) - (a.amount || 0)).slice(0, 50)
    const total$ = rows.reduce((acc: number, e: any) => acc + (Number(e.amount) || 0), 0)
    return { question, intent: c.intent, resolved_title: name.title, did_you_mean: name.candidates.slice(0, 5), total: r.total, rows, summary: `${name.title}${c.extra?.year ? " (" + c.extra.year + ")" : ""}: ${r.total} grants totaling ~$${(total$ / 1e6).toFixed(1)}M across top 50.` }
  }
  if (c.intent === "donors_to") {
    const name = resolveTitle(c.subjectName as string)
    const r = await engine.query({ subject: "edges", filters: { to: name.title, type: "monetary" }, limit: 500 })
    const rows = [...r.rows].sort((a: any, b: any) => (b.amount || 0) - (a.amount || 0)).slice(0, 50)
    const total$ = rows.filter((e: any) => e.amount).reduce((acc: number, e: any) => acc + (Number(e.amount) || 0), 0)
    return { question, intent: c.intent, resolved_title: name.title, did_you_mean: name.candidates.slice(0, 5), total: r.total, rows, summary: `Top donors to ${name.title}: ${r.total} edges, ~$${(total$ / 1e6).toFixed(1)}M tracked.` }
  }
  if (c.intent === "recipients_from") {
    const name = resolveTitle(c.subjectName as string)
    const r = await engine.query({ subject: "edges", filters: { from: name.title, type: "monetary" }, limit: 500 })
    const rows = [...r.rows].sort((a: any, b: any) => (b.amount || 0) - (a.amount || 0)).slice(0, 50)
    const total$ = rows.filter((e: any) => e.amount).reduce((acc: number, e: any) => acc + (Number(e.amount) || 0), 0)
    return { question, intent: c.intent, resolved_title: name.title, did_you_mean: name.candidates.slice(0, 5), total: r.total, rows, summary: `${name.title} outflows: ${r.total} edges, ~$${(total$ / 1e6).toFixed(1)}M tracked.` }
  }

  // Generic fallback
  const r = resolveTitle(c.subjectName as string)
  const out = await engine.query({ subject: "edges", filters: { from: r.title }, limit: 25 })
  const inc = await engine.query({ subject: "edges", filters: { to: r.title }, limit: 25 })
  return {
    question,
    intent: "generic",
    resolved_title: r.title,
    did_you_mean: r.candidates.slice(0, 5),
    total: out.total + inc.total,
    rows: [...(out.rows || []).map((x: any) => ({ dir: "out", ...x })), ...(inc.rows || []).map((x: any) => ({ dir: "in", ...x }))],
    summary: `Generic lookup on "${r.title}": ${out.total} outgoing + ${inc.total} incoming edges. Try a more specific pattern or tell me about ${r.title}.`,
  }
}

// ─── Route ───────────────────────────────────────────────────────────

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
