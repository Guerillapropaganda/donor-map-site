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

interface EntityContext {
  name: string
  gloss: string
  blurb?: string
}

interface AskResult {
  question: string
  intent: Intent
  resolved_title?: string | null
  resolved_title_2?: string | null
  did_you_mean?: string[]
  spec?: unknown
  total: number
  rows: unknown[]
  answer?: string                 // headline prose answer
  bullets?: string[]              // supporting bullet points
  interpretation?: string         // "what this means" plain-language explainer
  caveats?: string[]              // data limitations, "note that..."
  context?: EntityContext[]       // 1-sentence explainers for each entity
  follow_ups?: string[]           // suggested next questions, clickable in UI
  citation?: string               // cite-ready paragraph for journalists
  label?: string                  // human-friendly intent label (overrides default)
  summary?: string                // one-line meta
  note?: string
}

const REPO_ROOT = path.resolve(process.cwd(), "..")

// Format dollars at the natural scale (never ".06M")
function fmtUsd(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n) || n === 0) return "$0"
  const a = Math.abs(n)
  if (a >= 1e9) return "$" + (n / 1e9).toFixed(2) + "B"
  if (a >= 10e6) return "$" + Math.round(n / 1e6) + "M"
  if (a >= 1e6) return "$" + (n / 1e6).toFixed(1) + "M"
  if (a >= 10e3) return "$" + Math.round(n / 1e3) + "K"
  if (a >= 1e3) return "$" + (n / 1e3).toFixed(1) + "K"
  return "$" + Math.round(n).toLocaleString()
}

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

// ─── Entity context: 1-sentence explainer + first paragraph from profile ─

const _blurbCache = new Map<string, string>()
function loadBlurb(profilePath: string | undefined): string {
  if (!profilePath) return ""
  if (_blurbCache.has(profilePath)) return _blurbCache.get(profilePath)!
  try {
    const abs = path.join(REPO_ROOT, profilePath)
    if (!fs.existsSync(abs)) return ""
    const text = fs.readFileSync(abs, "utf-8")
    // Strip frontmatter + auto-blocks, find first real "Who They Are"/"Who
    // He Is"/"Who She Is" paragraph, else first real paragraph under any
    // H2.
    const body = text.replace(/^---\n[\s\S]*?\n---\n/, "").replace(/<!-- auto:[^\n]*start[\s\S]*?<!-- auto:[^\n]*end -->/g, "")
    const whoMatch = body.match(/##\s+(?:Who They Are|Who (?:He|She) Is|About)[^\n]*\n+([^\n#][\s\S]*?)(?=\n##|\n\n\n|$)/i)
    let para = whoMatch ? whoMatch[1] : ""
    if (!para) {
      const anyH2 = body.match(/##\s+[^\n]+\n+([^\n#][\s\S]*?)(?=\n##|\n\n\n|$)/)
      para = anyH2 ? anyH2[1] : ""
    }
    para = para
      .replace(/<!--[\s\S]*?-->/g, "")  // kill HTML comments
      .replace(/\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g, "$1")  // wikilinks -> plain
      .replace(/\*\*([^*]+)\*\*/g, "$1")
      .replace(/\s+/g, " ")
      .trim()
    // Trim to first 2 sentences, cap length
    const sentences = para.split(/(?<=[.!?])\s+/).slice(0, 2).join(" ")
    const trimmed = sentences.length > 400 ? sentences.slice(0, 397) + "..." : sentences
    _blurbCache.set(profilePath, trimmed)
    return trimmed
  } catch {
    return ""
  }
}

// Read a tiny set of frontmatter fields off the profile file directly.
// Cheaper than loading the whole YAML; just regex.
const _fmCache = new Map<string, { nonprofit_status?: string; committee_id?: string; entity_type_fm?: string }>()
function loadFmSignals(profilePath: string | undefined): { nonprofit_status?: string; committee_id?: string; entity_type_fm?: string } {
  if (!profilePath) return {}
  if (_fmCache.has(profilePath)) return _fmCache.get(profilePath)!
  try {
    const abs = path.join(REPO_ROOT, profilePath)
    if (!fs.existsSync(abs)) return {}
    const text = fs.readFileSync(abs, "utf-8")
    const m = text.match(/^---\n([\s\S]*?)\n---/)
    if (!m) { _fmCache.set(profilePath, {}); return {} }
    const fm = m[1]
    const ns = fm.match(/\bnonprofit-status:\s*["']?([^"'\n]+)["']?/)?.[1]?.trim()
    const ci = fm.match(/\b(?:committee-id|fec-committee-id|fec-cmte-id):\s*["']?([A-Z0-9]+)["']?/)?.[1]
    const et = fm.match(/\bentity-type:\s*["']?([^"'\n]+)["']?/)?.[1]?.trim()
    const out = { nonprofit_status: ns, committee_id: ci, entity_type_fm: et }
    _fmCache.set(profilePath, out)
    return out
  } catch {
    return {}
  }
}

// Build a clickable-source citation for a single edge. Returns the
// human-readable filing label plus a URL the user can open.
function citeEdge(e: Record<string, unknown>): { label: string; url?: string } {
  const src = (e.source as string) || ""
  const cycle = (e.cycle as string) || ""
  if (src === "irs-990-bulk") {
    const from = (e.from as string) || ""
    const fromEnt = findEntity(from)
    const ein = (fromEnt?.signals as any)?.ein
    if (ein) {
      return {
        label: `IRS 990 Schedule I, ${from} (EIN ${ein})${cycle ? ", tax year " + cycle : ""}`,
        url: `https://projects.propublica.org/nonprofits/organizations/${ein}`,
      }
    }
    return { label: `IRS 990 Schedule I${cycle ? ", tax year " + cycle : ""}` }
  }
  if (src === "fec-bulk" || src === "fec-api" || src === "fec-individual-bulk") {
    return {
      label: `FEC bulk filings${cycle ? ", " + cycle + " cycle" : ""}`,
      url: `https://www.fec.gov/data/filings/`,
    }
  }
  if (src === "lda-api") return { label: `Senate LDA lobbying disclosure${cycle ? " " + cycle : ""}`, url: `https://lda.senate.gov/` }
  if (src === "usaspending" || src === "usaspending-bulk" || src === "usaspending-grants-bulk") {
    return { label: `USAspending.gov${cycle ? " " + cycle : ""}`, url: `https://usaspending.gov/` }
  }
  if (src === "frontmatter-migration" || src === "body-migration-april-9") {
    return { label: "Vault-side editorial annotation (not a filing)" }
  }
  return { label: src || "unknown source" }
}

// Generate a plain-language interpretation of the findings. Looks at
// the shape of the result (intent + what entities are involved) and
// emits a 1-2 sentence "what this means" card. No jargon.
function interpret(res: AskResult): string | undefined {
  const ctx = res.context || []
  const hasDAF = ctx.some((c) => c.gloss.includes("donor-advised fund"))
  const hasC4 = ctx.some((c) => c.gloss.includes("501(c)(4)"))
  const hasC3 = ctx.some((c) => c.gloss.includes("501(c)(3) public charity"))
  const hasSuperPAC = ctx.some((c) => c.gloss.includes("Super PAC"))

  if (res.intent === "money_chain" && res.total > 0) {
    if (hasDAF) {
      return (
        `This is the textbook dark-money laundering pattern. Money leaves the first org, passes through a donor-advised fund (DAF), and lands at the destination. The DAF step is the point — commercial DAFs are legally allowed to conceal who originally gave the money, so once the flow passes through one, the paper trail to the true donor is broken. Any of these ${res.total} paths would give the final recipient deniability about where the cash started.`
      )
    }
    if (hasC4 && hasSuperPAC) {
      return (
        `Classic c4-to-super-PAC handoff. 501(c)(4) "social welfare" groups can accept unlimited anonymous donations but aren't supposed to be "primarily political." They transfer money to a super PAC sibling, which is allowed to spend on elections but has to disclose donors — except the disclosed donor is the c4, not the actual person who gave. This is how "dark money" becomes "disclosed" spending without the original donor ever being named.`
      )
    }
    return `These ${res.total} paths show indirect money flows. None are single-hop direct gifts — each goes through at least one intermediary organization. Intermediaries are often where the public record of who gave what ends.`
  }

  if (res.intent === "edge_between") {
    const hasDirectDollars = (res.rows || []).some((r: any) => r.type === "monetary" && r.amount)
    if (!hasDirectDollars && res.total > 0) {
      return `These two organizations are linked in the vault (related wikilinks and/or board overlap), but no direct dollar flow between them is in the canonical store. If you want to trace money between them, try the "money chain" version of this question — it walks up to 3 hops through intermediaries.`
    }
  }

  if (res.intent === "donors_to") {
    const summaryParts = (res.summary || "").match(/(\d+) support edges, (\d+) opposition edges/)
    if (summaryParts && parseInt(summaryParts[2]) > 0) {
      return `The "donors" shown here are groups whose money landed with the subject — direct contributions, party committee support, and super-PAC ads running in their favor. Separately, ${summaryParts[2]} super PAC(s) spent money running ads AGAINST the subject, which shows up in the meta line. Opposition edges are excluded from the total above so they don't inflate the "who funds them" answer.`
    }
  }

  if (res.intent === "summary" && hasC4) {
    const personMode = (res.context || []).some((c) => c.gloss.includes("entity") || !c.gloss.includes("501") && !c.gloss.includes("DAF") && !c.gloss.includes("Super"))
    if (personMode && res.total > 0) {
      return `Most of this person's tracked financial footprint flows through the organizations they chair or sit on the board of, not under their personal name. Federal law doesn't require individuals to disclose gifts they direct through 501(c)(4) vehicles, which is why the personal name lookup shows zero direct edges. The board-seat rows above tell you where the real money is.`
    }
  }

  return undefined
}

// Generate follow-up question suggestions. Keeps users exploring.
function suggestFollowUps(res: AskResult): string[] {
  const out: string[] = []
  const a = res.resolved_title
  const b = res.resolved_title_2

  if (res.intent === "edge_between" && a && b) {
    out.push(`money chain from ${a} to ${b}`)
    out.push(`tell me about ${a}`)
    out.push(`tell me about ${b}`)
    out.push(`what else has ${a} funded`)
  } else if (res.intent === "money_chain" && a && b) {
    out.push(`who funds ${a}`)
    out.push(`where does ${a}'s money go`)
    out.push(`tell me about ${b}`)
  } else if (res.intent === "donors_to" && a) {
    out.push(`where does ${a}'s money go`)
    out.push(`tell me about ${a}`)
    out.push(`${a} voting record`)
    out.push(`what boards is ${a} on`)
  } else if (res.intent === "recipients_from" && a) {
    out.push(`who funds ${a}`)
    out.push(`tell me about ${a}`)
    out.push(`what boards is ${a} on`)
  } else if (res.intent === "summary" && a) {
    out.push(`who funds ${a}`)
    out.push(`where does ${a}'s money go`)
    out.push(`what boards is ${a} on`)
  } else if (res.intent === "affiliations_from" && a) {
    out.push(`tell me about ${a}`)
    out.push(`${a} voting record`)
  } else if (res.intent === "leaderboard") {
    out.push("top donors")
    out.push("top super pacs")
    out.push("top politicians")
    out.push("top dafs")
  }

  // dedupe, remove same question
  const seen = new Set<string>([res.question.toLowerCase()])
  return out.filter((q) => {
    const k = q.toLowerCase()
    if (seen.has(k)) return false
    seen.add(k)
    return true
  }).slice(0, 5)
}

// Build a cite-ready paragraph for journalists to paste into stories.
function buildCitation(res: AskResult): string | undefined {
  if (res.intent === "money_chain" && res.rows.length > 0) {
    const top = res.rows[0] as any
    if (!top?.path || !top?.edges) return undefined
    const steps: string[] = []
    for (let i = 0; i < top.edges.length; i++) {
      const from = top.path[i]
      const to = top.path[i + 1]
      const e = top.edges[i]
      const amt = fmtUsd(e.amount)
      const cy = e.cycle ? ` (tax year ${e.cycle})` : ""
      steps.push(`${from} transferred ${amt} to ${to}${cy}`)
    }
    return `According to IRS 990 filings, ${steps.join("; ")}. Source: ${top.edges.map((e: any) => citeEdge(e).label).filter((v: string, i: number, a: string[]) => a.indexOf(v) === i).join("; ")}.`
  }
  if (res.intent === "donors_to" && res.rows.length > 0) {
    const top5 = (res.rows as any[]).filter((e) => e.amount).slice(0, 5)
    if (top5.length === 0) return undefined
    const parts = top5.map((e) => `${e.from} (${fmtUsd(e.amount)}${e.cycle ? ", " + e.cycle : ""}) per ${citeEdge(e).label}`)
    return `Top tracked donors to ${res.resolved_title}: ${parts.join("; ")}.`
  }
  return undefined
}

function explainEntity(name: string): EntityContext {
  const ent = findEntity(name)
  if (!ent) return { name, gloss: "(not in vault)" }
  const kind = ent.entity_type || "entity"
  const sector = (ent.signals as any)?.sector as string | undefined
  const ein = (ent.signals as any)?.ein as string | undefined
  const fm = loadFmSignals(ent.profile_path)
  const classTags: string[] = []
  if (ent.capital_type) classTags.push(ent.capital_type)
  if (ent.ideological_function?.length) classTags.push(...ent.ideological_function)

  // Structural type: nonprofit-status frontmatter is the authoritative
  // signal (it's per-entity truth). Fall back to name heuristics for
  // orgs without nonprofit-status (FEC-only committees, etc.), then to
  // the vault's folder-derived sector.
  const lower = name.toLowerCase()
  let structural = ""
  const ns = (fm.nonprofit_status || "").toLowerCase()
  const hasDAFMarker = lower.includes("charitable fund") || lower.includes("philanthropy fund") ||
    lower.includes("charitable gift fund") || lower.includes("donor advised") || lower.includes("endowment program") ||
    (fm.entity_type_fm || "").toLowerCase().includes("donor-advised")

  if (hasDAFMarker) {
    structural = " Commercial donor-advised fund (DAF) — donor identities are obscured from the public; money enters from one donor, flows out under the DAF's name."
  } else if (ns.includes("501(c)(4)") || ns.includes("501c4")) {
    structural = " 501(c)(4) social-welfare org — can accept unlimited donations, is not required to publicly disclose donors. Classic dark-money structure."
  } else if (ns.includes("501(c)(3)") || ns.includes("501c3")) {
    structural = " 501(c)(3) public charity — donors are not publicly disclosed (except via grant disclosures by grant-makers on Schedule I)."
  } else if (ns.includes("527") || /super pac/i.test(ns)) {
    structural = " Super PAC / 527 — accepts unlimited donations but must disclose donors to the FEC."
  } else if (fm.committee_id) {
    structural = " FEC-registered political committee — donors are disclosed via FEC filings."
  } else if (lower.includes("foundation") && kind === "donor") {
    structural = " Tax-exempt foundation."
  } else if (sector && /dark money/i.test(sector)) {
    structural = " 501(c)(4) dark-money network entity — donor identities are not required to be disclosed."
  } else if (sector && /super pac/i.test(sector)) {
    structural = " Super PAC / independent-expenditure committee — accepts unlimited donations, discloses donors to FEC."
  }

  const tagStr = classTags.length > 0 ? ` Class tags: ${classTags.join(", ")}.` : ""
  const sectorForGloss = ns
    ? ns // prefer nonprofit-status in the gloss header when we have it
    : sector
  const gloss = `${kind}${sectorForGloss ? " (" + sectorForGloss + ")" : ""}${ein ? ", EIN " + ein : ""}.${structural}${tagStr}`.trim()
  const blurb = loadBlurb(ent.profile_path)
  return { name, gloss, blurb: blurb || undefined }
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
  // Split support vs opposition on each direction so we don't describe
  // attack spending as "direct flows."
  const fwdSupport = monetaryForward.filter((e: any) => e.role !== "ie-oppose")
  const fwdOppose = monetaryForward.filter((e: any) => e.role === "ie-oppose")
  const revSupport = monetaryReverse.filter((e: any) => e.role !== "ie-oppose")
  const revOppose = monetaryReverse.filter((e: any) => e.role === "ie-oppose")
  const fwdTotal = fwdSupport.reduce((acc: number, e: any) => acc + Number(e.amount), 0)
  const revTotal = revSupport.reduce((acc: number, e: any) => acc + Number(e.amount), 0)
  const fwdOpposeTotal = fwdOppose.reduce((acc: number, e: any) => acc + Number(e.amount), 0)
  const revOpposeTotal = revOppose.reduce((acc: number, e: any) => acc + Number(e.amount), 0)

  // If direct monetary edges exist, great — just show them.
  if (monetaryForward.length + monetaryReverse.length + affiliationForward.length + affiliationReverse.length > 0) {
    const kindFor = (e: any) => e.role === "ie-oppose" ? "attack $" : e.role === "ie-support" ? "IE support $" : "direct $"
    const rows = [
      ...monetaryForward.map((e: any) => ({ direction: "→", kind: kindFor(e), ...e })),
      ...monetaryReverse.map((e: any) => ({ direction: "←", kind: kindFor(e), ...e })),
      ...affiliationForward.map((e: any) => ({ direction: "→", kind: "affiliation", ...e })),
      ...affiliationReverse.map((e: any) => ({ direction: "←", kind: "affiliation", ...e })),
    ]
    const parts: string[] = []
    if (fwdSupport.length) parts.push(`${a.title} → ${b.title}: ${fwdSupport.length} monetary edge(s), ${fmtUsd(fwdTotal)}`)
    if (fwdOppose.length) parts.push(`${a.title} AGAINST ${b.title}: ${fwdOppose.length} IE-oppose edge(s), ${fmtUsd(fwdOpposeTotal)}`)
    if (revSupport.length) parts.push(`${b.title} → ${a.title}: ${revSupport.length} monetary edge(s), ${fmtUsd(revTotal)}`)
    if (revOppose.length) parts.push(`${b.title} AGAINST ${a.title}: ${revOppose.length} IE-oppose edge(s), ${fmtUsd(revOpposeTotal)}`)
    if (affiliationForward.length || affiliationReverse.length) parts.push(`${affiliationForward.length + affiliationReverse.length} affiliation edge(s)`)

    const supportSum = fwdTotal + revTotal
    const opposeSum = fwdOpposeTotal + revOpposeTotal
    let answer: string
    if (supportSum > 0 && opposeSum > 0) {
      answer = `**${a.title}** and **${b.title}** have ${fmtUsd(supportSum)} in tracked direct flows, PLUS ${fmtUsd(opposeSum)} in attack (IE-oppose) spending between them.`
    } else if (supportSum > 0) {
      answer = `**${a.title}** and **${b.title}** have ${fmtUsd(supportSum)} in tracked direct flows${affiliationForward.length + affiliationReverse.length > 0 ? ` plus ${affiliationForward.length + affiliationReverse.length} officer/board affiliation(s)` : ""}.`
    } else if (opposeSum > 0) {
      answer = `**${a.title}** and **${b.title}** have NO direct donations, but ${fmtUsd(opposeSum)} in attack (IE-oppose) spending${fwdOppose.length ? ` from ${a.title} against ${b.title}` : ""}${revOppose.length ? ` from ${b.title} against ${a.title}` : ""}.`
    } else {
      answer = `**${a.title}** and **${b.title}** are linked only by ${affiliationForward.length + affiliationReverse.length} affiliation edge(s). No direct dollar flows in the store.`
    }
    const bullets: string[] = []
    for (const e of [...monetaryForward, ...monetaryReverse].sort((x: any, y: any) => y.amount - x.amount).slice(0, 5)) {
      const arrow = e.role === "ie-oppose" ? "AGAINST" : "→"
      bullets.push(`${e.from} ${arrow} ${e.to}: ${fmtUsd(Number(e.amount))}${e.cycle ? ` (${e.cycle})` : ""} [${e.source}]`)
    }
    for (const e of [...affiliationForward, ...affiliationReverse].slice(0, 3)) {
      bullets.push(`${e.from} — ${e.role || "affiliation"} — ${e.to}${e.date_range ? ` (${e.date_range.slice(0, 4)}–${e.date_range.slice(-10, -6)})` : ""}`)
    }

    return {
      question,
      intent: "edge_between",
      resolved_title: a.title,
      resolved_title_2: b.title,
      did_you_mean: [...(a.candidates || []), ...(b.candidates || [])].filter(Boolean).slice(0, 5),
      total: rows.length,
      rows: rows.slice(0, 50),
      answer,
      bullets,
      context: [explainEntity(a.title), explainEntity(b.title)],
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

  const inflowsRaw = await engine.query({ subject: "edges", filters: { to: name, type: "monetary" }, limit: 500 })
  const outflows = await engine.query({ subject: "edges", filters: { from: name, type: "monetary" }, limit: 500 })

  // Split support vs opposition. The role field carries "ie-support" /
  // "ie-oppose" on independent-expenditure edges. Without it, an
  // opposition ad-spend super-PAC (American Crossroads $78M "against"
  // Raphael Warnock) will otherwise surface as a top donor.
  const inflows = {
    total: inflowsRaw.rows.filter((e: any) => e.role !== "ie-oppose").length,
    rows: inflowsRaw.rows.filter((e: any) => e.role !== "ie-oppose"),
  }
  const oppoEdges = inflowsRaw.rows.filter((e: any) => e.role === "ie-oppose")
  const oppoTotal = oppoEdges.filter((e: any) => e.amount).reduce((a: number, e: any) => a + Number(e.amount), 0)
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

  // Build narrative answer
  const typeSector = `${ent?.entity_type || "unknown entity"}${ent?.signals?.sector ? " in " + (ent.signals.sector as string) : ""}`
  const bullets: string[] = []

  if (boards.length > 0) {
    const boardStr = boards.map((b: any) => {
      const role = b.role ? ` (${b.role}${b.date_range ? ", " + b.date_range.slice(0, 4) + "–" + b.date_range.slice(-10, -6) : ""})` : ""
      return `${b.to}${role}`
    }).join(", ")
    bullets.push(`Chairs/sits on: ${boardStr}`)
  }

  if (topIn.length > 0) {
    const totalIn = inflows.rows.filter((e: any) => e.amount).reduce((a: number, e: any) => a + Number(e.amount), 0)
    const oppoNote = oppoEdges.length > 0
      ? ` (Plus ${fmtUsd(oppoTotal)} spent AGAINST them by ${oppoEdges.length} opposition edge${oppoEdges.length === 1 ? "" : "s"} — excluded.)`
      : ""
    bullets.push(`Received ~${fmtUsd(totalIn)} across ${inflows.total} donors. Top: ${topIn.slice(0, 3).map((e: any) => e.from + " " + fmtUsd(e.amount)).join(", ")}.${oppoNote}`)
  }
  if (topOut.length > 0) {
    const totalOut = outflows.rows.filter((e: any) => e.amount).reduce((a: number, e: any) => a + Number(e.amount), 0)
    bullets.push(`Distributed ~${fmtUsd(totalOut)} across ${outflows.total} recipients. Top: ${topOut.slice(0, 3).map((e: any) => e.to + " " + fmtUsd(e.amount)).join(", ")}`)
  }

  if (viaOrgs.length > 0) {
    const perOrg: Record<string, { inDollars: number; outDollars: number; topOut: Array<{ to: string; amount: number }> }> = {}
    for (const v of viaOrgs) {
      const orgMatch = String(v.kind).match(/^via (.+?) \((in|out)\)$/)
      if (!orgMatch) continue
      const [, org, dir] = orgMatch
      if (!perOrg[org]) perOrg[org] = { inDollars: 0, outDollars: 0, topOut: [] }
      const amt = Number(v.amount) || 0
      if (dir === "in") perOrg[org].inDollars += amt
      else {
        perOrg[org].outDollars += amt
        perOrg[org].topOut.push({ to: v.to as string, amount: amt })
      }
    }
    for (const [org, d] of Object.entries(perOrg)) {
      const outStr = d.topOut.length
        ? ` Out: ${d.topOut.sort((a, b) => b.amount - a.amount).slice(0, 3).map((x) => x.to + " " + fmtUsd(x.amount)).join(", ")}.`
        : ""
      bullets.push(
        `Via ${org}: ${d.inDollars > 0 ? "received " + fmtUsd(d.inDollars) + ". " : ""}${d.outDollars > 0 ? "moved " + fmtUsd(d.outDollars) + " out." : ""}${outStr}`,
      )
    }
  }

  if (classTags.length > 0) bullets.push(`Class tags: ${classTags.join(", ")}`)

  const answer =
    `**${name}** — ${typeSector}.` +
    (topIn.length === 0 && topOut.length === 0 && boards.length > 0
      ? ` Most flows move through the ${boards.length} org${boards.length === 1 ? "" : "s"} this person chairs, not their personal name.`
      : "")

  // Also explain the top orgs this person/entity is connected to
  const contextNames = new Set<string>([name])
  for (const b of boards.slice(0, 3)) if (b.to) contextNames.add(b.to as string)
  const context = [...contextNames].map((n) => explainEntity(n))

  return {
    question,
    intent: "summary",
    resolved_title: name,
    did_you_mean: r.candidates.slice(0, 5),
    total: rows.length,
    rows,
    answer,
    bullets,
    context,
    summary: `${inflows.total} inbound, ${outflows.total} outbound, ${affiliations_from.total + affiliations_to.total} affiliations${viaOrgs.length > 0 ? ", " + viaOrgs.length + " via-org flows" : ""}.`,
  }
}

async function handleLeaderboard(c: ClassifiedQuestion, question: string, _engine: any): Promise<AskResult> {
  // All leaderboard variants run off the relationships.jsonl edge store directly
  const topic = c.extra?.topic || "top_donors"
  const raw = fs.readFileSync(path.join(REPO_ROOT, "data", "relationships.jsonl"), "utf-8")
  type Agg = { edges: number; total: number; support: number; oppose: number; donation: number }
  const mkAgg = (): Agg => ({ edges: 0, total: 0, support: 0, oppose: 0, donation: 0 })
  const byFrom = new Map<string, Agg>()
  const byTo = new Map<string, Agg>()
  for (const line of raw.split("\n")) {
    if (!line.trim()) continue
    try {
      const e = JSON.parse(line)
      if (e.type !== "monetary" || !e.amount) continue
      const amt = Number(e.amount) || 0
      const bucket = e.role === "ie-oppose" ? "oppose" : e.role === "ie-support" ? "support" : "donation"
      const a = byFrom.get(e.from) || mkAgg()
      a.edges++; a.total += amt; a[bucket] += amt; byFrom.set(e.from, a)
      const b = byTo.get(e.to) || mkAgg()
      b.edges++; b.total += amt; b[bucket] += amt; byTo.set(e.to, b)
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
  // For "donor" leaderboards, rank by positive spend (direct donation + IE
  // support). Attack spending (ie-oppose) is tracked separately as
  // attack_spend so the UI can surface it as a distinct column. Sorting by
  // raw total would elevate SLF PAC — a $500M attack operation — as a "top
  // donor," which it is not.
  const rowShape = (name: string, v: Agg) => ({
    name,
    edges: v.edges,
    total: v.total,
    positive_spend: v.donation + v.support,
    attack_spend: v.oppose,
    direct_donations: v.donation,
    ie_support: v.support,
    ie_oppose: v.oppose,
  })
  if (topic === "top_donors") {
    rows = [...byFrom.entries()]
      .map(([name, v]) => rowShape(name, v))
      .sort((a, b) => b.positive_spend - a.positive_spend)
      .slice(0, 25)
    summary = `Top 25 donors by positive spend (direct donations + IE support). Attack spend shown separately.`
  } else if (topic === "top_superpacs") {
    rows = [...byFrom.entries()]
      .filter(([name]) => typeMatch(name, "superpac"))
      .map(([name, v]) => rowShape(name, v))
      .sort((a, b) => b.total - a.total)
      .slice(0, 25)
    summary = `Top 25 super PACs by total IE + direct spend. Support and attack broken out per row.`
  } else if (topic === "top_pacs") {
    rows = [...byFrom.entries()]
      .filter(([name]) => typeMatch(name, "pac"))
      .map(([name, v]) => rowShape(name, v))
      .sort((a, b) => b.total - a.total)
      .slice(0, 25)
    summary = `Top 25 PACs / political committees by total spend. Support and attack broken out per row.`
  } else if (topic === "top_politicians") {
    rows = [...byTo.entries()]
      .filter(([name]) => typeMatch(name, "politician"))
      .map(([name, v]) => rowShape(name, v))
      .sort((a, b) => b.positive_spend - a.positive_spend)
      .slice(0, 25)
    summary = `Top 25 politicians by positive money received. Attack spending against them tracked separately.`
  } else if (topic === "top_dafs") {
    rows = [...byFrom.entries()]
      .filter(([name]) => typeMatch(name, "daf"))
      .map(([name, v]) => rowShape(name, v))
      .sort((a, b) => b.positive_spend - a.positive_spend)
      .slice(0, 25)
    summary = `Top 25 donor-advised funds / charitable vehicles by grant dollars out.`
  }

  const topName = rows[0] ? ` Top: **${rows[0].name}** at ${fmtUsd((rows[0].positive_spend as number) || (rows[0].total as number))}.` : ""
  const answer = `${summary}${topName}`
  const bullets = rows.slice(0, 10).map((r: any) => {
    const primary = r.positive_spend || r.total
    const parts: string[] = [`${r.name}: ${fmtUsd(primary)}`]
    if (r.attack_spend > 0) parts.push(`${fmtUsd(r.attack_spend)} attack`)
    parts.push(`${r.edges} edge${r.edges === 1 ? "" : "s"}`)
    return parts.join(" · ")
  })
  return { question, intent: "leaderboard", total: rows.length, rows, answer, bullets, summary }
}

async function handleMoneyChain(c: ClassifiedQuestion, question: string): Promise<AskResult> {
  const a = resolveTitle(c.subjectName as string)
  const b = resolveTitle(c.objectName as string)
  // Build adjacency from monetary edges only. Exclude IE-oppose: an
  // opposition ad-spend edge documents money spent AGAINST a politician,
  // not a transfer TO them, so treating it as a graph edge produces
  // nonsense "money chains" where cash appears to flow to a target who
  // was actually being attacked.
  const raw = fs.readFileSync(path.join(REPO_ROOT, "data", "relationships.jsonl"), "utf-8")
  const adj = new Map<string, Array<{ to: string; amount: number; cycle?: string; source: string }>>()
  for (const line of raw.split("\n")) {
    if (!line.trim()) continue
    try {
      const e = JSON.parse(line)
      if (e.type !== "monetary" || !e.amount) continue
      if (e.role === "ie-oppose") continue
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

  // Collect distinct intermediary entities seen across top-ranked paths
  // so we can explain what each node is.
  const nodesSeen = new Set<string>([a.title, b.title])
  for (const p of paths.slice(0, 5)) for (const n of p.path) nodesSeen.add(n)
  const context = [...nodesSeen].map((name) => explainEntity(name))

  let answer: string
  const bullets: string[] = []
  if (paths.length === 0) {
    answer = `No money chain from **${a.title}** to **${b.title}** within ${maxDepth} hops. They may not be connected through tracked dollar flows yet.`
  } else {
    const top = paths[0]
    const chainStr = top.path.map((p, i) => {
      if (i === 0) return p
      const e = top.edges[i - 1]
      return `→ ${fmtUsd(e.amount)} → ${p}`
    }).join(" ")
    answer = `**${a.title}** → **${b.title}**: ${paths.length} path${paths.length === 1 ? "" : "s"} found (up to ${maxDepth} hops). Strongest flow: ${chainStr}.`
    for (const p of paths.slice(0, 5)) {
      const bullet = p.path.map((n, i) => {
        if (i === 0) return n
        const e = p.edges[i - 1]
        return `→ ${fmtUsd(e.amount)} (${e.cycle || "?"}) → ${n}`
      }).join(" ")
      bullets.push(`${bullet}  [bottleneck ${fmtUsd(p.min_amount)}]`)
    }
  }

  // Humanize rows: "path" becomes a readable arrow string, "bottleneck"
  // becomes "Smallest link", "total_pass_through" becomes "Total dollars
  // through chain". Keep raw edge arrays hidden in an _edges field so
  // power users can still see them if they want.
  const humanRows = paths.slice(0, 10).map((p) => {
    const steps: string[] = []
    for (let i = 0; i < p.edges.length; i++) {
      const e: any = p.edges[i]
      steps.push(`${p.path[i]} → ${fmtUsd(e.amount)}${e.cycle ? " (" + e.cycle + ")" : ""}`)
    }
    steps.push(p.path[p.path.length - 1])
    return {
      trail: steps.join(" → "),
      smallest_link: fmtUsd(p.min_amount),
      total_through_chain: fmtUsd(p.total_pass_through),
      sources: [...new Set(p.edges.map((e: any) => citeEdge(e).label))].join("; "),
    }
  })

  // Build citation from raw paths BEFORE they're humanized
  let citation: string | undefined
  if (paths.length > 0) {
    const top = paths[0]
    const steps: string[] = []
    for (let i = 0; i < top.edges.length; i++) {
      const e: any = top.edges[i]
      steps.push(`${top.path[i]} transferred ${fmtUsd(e.amount)} to ${top.path[i + 1]}${e.cycle ? " (tax year " + e.cycle + ")" : ""}`)
    }
    const sources = [...new Set(top.edges.map((e: any) => citeEdge(e).label))].join("; ")
    citation = `According to IRS 990 filings, ${steps.join("; ")}. Source: ${sources}.`
  }

  const result: AskResult = {
    question,
    intent: "money_chain",
    label: "Money trail",
    resolved_title: a.title,
    resolved_title_2: b.title,
    total: paths.length,
    rows: humanRows,
    answer,
    bullets,
    context,
    caveats: paths.length > 0 && context.some((c) => c.gloss.includes("donor-advised fund"))
      ? ["A donor-advised fund (DAF) sits in the middle of this chain. DAFs let the ultimate donor stay anonymous — the public record shows the DAF as the giver, not the person who originally wrote the check."]
      : [],
    summary: paths.length === 0 ? `0 paths within ${maxDepth} hops` : `${paths.length} path(s) examined (${examined} nodes visited).`,
  }
  result.interpretation = interpret(result)
  result.follow_ups = suggestFollowUps(result)
  result.citation = citation
  return result
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

function finalize(res: AskResult): AskResult {
  if (!res.interpretation) res.interpretation = interpret(res)
  if (!res.follow_ups) res.follow_ups = suggestFollowUps(res)
  if (!res.citation) res.citation = buildCitation(res)

  // Humanize intent labels for display
  const labels: Record<string, string> = {
    cross_party_donors: "Cross-party donors",
    voting_record: "Voting record",
    affiliations_from: "Board seats held",
    affiliations_to: "People on this board",
    grants_from: "Grants out",
    donors_to: "Who funds them",
    recipients_from: "Where their money goes",
    edge_between: "Connection",
    summary: "Profile snapshot",
    leaderboard: "Leaderboard",
    money_chain: "Money trail",
    generic: "General lookup",
  }
  if (!res.label) res.label = labels[res.intent] || res.intent

  return res
}

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
    return finalize({ question, intent: c.intent, total: r.total || r.rows.length, rows: r.rows, summary: `${r.total || r.rows.length} donors giving to BOTH major parties within the last 365 days.` })
  }
  if (c.intent === "voting_record") {
    const name = resolveTitle(c.subjectName as string)
    const bio = findBioguide(name.title)
    if (!bio) return finalize({ question, intent: c.intent, resolved_title: name.title, did_you_mean: name.candidates.slice(0, 5), total: 0, rows: [], note: `No bioguide-id found for "${name.title}".` })
    return finalize(showVotingRecord(bio, name.title, question))
  }
  if (c.intent === "leaderboard") return finalize(await handleLeaderboard(c, question, engine))
  if (c.intent === "money_chain") return finalize(await handleMoneyChain(c, question))
  if (c.intent === "edge_between") return finalize(await handleEdgeBetween(c, question, engine))
  if (c.intent === "summary") return finalize(await handleSummary(c, question, engine))

  if (c.intent === "affiliations_from" || c.intent === "affiliations_to") {
    const name = resolveTitle(c.subjectName as string)
    const side = c.intent === "affiliations_from" ? "from" : "to"
    const r = await engine.query({ subject: "edges", filters: { [side]: name.title, type: "affiliation" }, limit: 50 })
    return finalize({
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
    })
  }
  if (c.intent === "grants_from") {
    const name = resolveTitle(c.subjectName as string)
    const filters: Record<string, unknown> = { from: name.title, type: "monetary", source: "irs-990-bulk" }
    if (c.extra?.year) filters.cycle = c.extra.year
    const r = await engine.query({ subject: "edges", filters, limit: 200 })
    const rows = [...r.rows].sort((a: any, b: any) => (b.amount || 0) - (a.amount || 0)).slice(0, 50)
    const total$ = rows.reduce((acc: number, e: any) => acc + (Number(e.amount) || 0), 0)
    return finalize({ question, intent: c.intent, resolved_title: name.title, did_you_mean: name.candidates.slice(0, 5), total: r.total, rows, summary: `${name.title}${c.extra?.year ? " (" + c.extra.year + ")" : ""}: ${r.total} grants totaling ~${fmtUsd(total$)} across top 50.` })
  }
  if (c.intent === "donors_to") {
    const name = resolveTitle(c.subjectName as string)
    const r = await engine.query({ subject: "edges", filters: { to: name.title, type: "monetary" }, limit: 500 })
    // Split IE-support vs IE-oppose: super-PAC ads "opposing" X are not
    // donors TO X. The edge.role field carries ie-support / ie-oppose.
    const supporters = r.rows.filter((e: any) => e.role !== "ie-oppose")
    const opposers = r.rows.filter((e: any) => e.role === "ie-oppose")
    const rows = [...supporters].sort((a: any, b: any) => (b.amount || 0) - (a.amount || 0)).slice(0, 50)
    const total$ = rows.filter((e: any) => e.amount).reduce((acc: number, e: any) => acc + (Number(e.amount) || 0), 0)
    const oppose$ = opposers.filter((e: any) => e.amount).reduce((acc: number, e: any) => acc + (Number(e.amount) || 0), 0)
    const top5 = rows.filter((e: any) => e.amount).slice(0, 5)

    const opposeNote = opposers.length > 0
      ? ` (Plus ${fmtUsd(oppose$)} spent AGAINST them by ${opposers.length} super-PAC opposition edge${opposers.length === 1 ? "" : "s"} — excluded from the totals above.)`
      : ""

    const answer =
      total$ > 0
        ? `**${name.title}** received **${fmtUsd(total$)}** in tracked support edges from **${supporters.length}** donors/committees.${opposeNote}`
        : `**${name.title}** has ${supporters.length} donor edges in the store without dollar amounts.${opposeNote}`
    const bullets = top5.map((e: any) => `${e.from}: ${fmtUsd(e.amount)}${e.cycle ? ` (${e.cycle})` : ""}${e.source ? ` [${citeEdge(e).label}]` : ""}`)
    return finalize({ question, intent: c.intent, resolved_title: name.title, did_you_mean: name.candidates.slice(0, 5), total: r.total, rows, answer, bullets, summary: `${supporters.length} support edges, ${opposers.length} opposition edges. Support ~${fmtUsd(total$)}, opposition ~${fmtUsd(oppose$)}.` })
  }
  if (c.intent === "recipients_from") {
    const name = resolveTitle(c.subjectName as string)
    const ent = findEntity(name.title)
    const isPolitician = ent?.entity_type === "politician" || ent?.entity_type === "state-politician"
    const r = await engine.query({ subject: "edges", filters: { from: name.title, type: "monetary" }, limit: 500 })
    const rows = [...r.rows].sort((a: any, b: any) => (b.amount || 0) - (a.amount || 0)).slice(0, 50)
    const total$ = rows.filter((e: any) => e.amount).reduce((acc: number, e: any) => acc + (Number(e.amount) || 0), 0)

    // Politicians don't "give" money in our monetary-edge model — they
    // receive it. Redirect the user rather than silently returning 0.
    if (isPolitician && total$ === 0) {
      return finalize({
        question,
        intent: c.intent,
        resolved_title: name.title,
        did_you_mean: name.candidates.slice(0, 5),
        total: 0,
        rows: [],
        answer: `**${name.title}** is a politician, not a grant-making organization. Politicians don't "give" money in this database — they receive it from donors and spend it through their campaign committee.`,
        note: `Use "who funds ${name.title}" or "tell me about ${name.title}" for what you probably want. Campaign-committee expenditures (FEC oppexp data) are tracked separately and not yet exposed via the ask UI.`,
        follow_ups: [
          `who funds ${name.title}`,
          `tell me about ${name.title}`,
          `${name.title} voting record`,
        ],
        summary: `Politician outflows are not in this view.`,
      })
    }

    const top5 = rows.filter((e: any) => e.amount).slice(0, 5)
    // Split ie-oppose vs ie-support vs direct: a super-PAC's top "recipient"
    // is often a politician they spent AGAINST, not one they funded. Frame
    // the outflow accurately.
    const supportEdges = rows.filter((e: any) => e.role !== "ie-oppose" && e.amount)
    const opposeEdges = rows.filter((e: any) => e.role === "ie-oppose" && e.amount)
    const supportTotal = supportEdges.reduce((a: number, e: any) => a + Number(e.amount), 0)
    const opposeTotal = opposeEdges.reduce((a: number, e: any) => a + Number(e.amount), 0)
    const answer =
      total$ > 0
        ? (opposeTotal > 0
            ? `**${name.title}** moved **${fmtUsd(total$)}** across **${r.total}** edges: **${fmtUsd(supportTotal)}** in donations / IE support, plus **${fmtUsd(opposeTotal)}** in attack (IE-oppose) spending against ${opposeEdges.length} politician${opposeEdges.length === 1 ? "" : "s"}.`
            : `**${name.title}** moved **${fmtUsd(total$)}** across **${r.total}** recipient edges.`)
        : `**${name.title}** has ${r.total} outgoing edges but no dollar amounts attached.`
    const bullets = top5.map((e: any) => {
      const arrow = e.role === "ie-oppose" ? "AGAINST" : "→"
      return `${arrow} ${e.to}: ${fmtUsd(e.amount)}${e.cycle ? ` (${e.cycle})` : ""}${e.source ? ` [${citeEdge(e).label}]` : ""}`
    })
    return finalize({ question, intent: c.intent, resolved_title: name.title, did_you_mean: name.candidates.slice(0, 5), total: r.total, rows, answer, bullets, summary: `${name.title} outflows: ${supportEdges.length} support / ${opposeEdges.length} oppose edges, ~${fmtUsd(supportTotal)} support · ~${fmtUsd(opposeTotal)} attack.` })
  }

  // Generic fallback
  const r = resolveTitle(c.subjectName as string)
  const out = await engine.query({ subject: "edges", filters: { from: r.title }, limit: 25 })
  const inc = await engine.query({ subject: "edges", filters: { to: r.title }, limit: 25 })
  return finalize({
    question,
    intent: "generic",
    resolved_title: r.title,
    did_you_mean: r.candidates.slice(0, 5),
    total: out.total + inc.total,
    rows: [...(out.rows || []).map((x: any) => ({ dir: "out", ...x })), ...(inc.rows || []).map((x: any) => ({ dir: "in", ...x }))],
    summary: `Generic lookup on "${r.title}": ${out.total} outgoing + ${inc.total} incoming edges. Try a more specific pattern or tell me about ${r.title}.`,
  })
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

  // In-memory answer cache. /api/ask runs a full store-load + intent
  // classifier + synthesis on every call; identical repeat questions
  // (e.g. follow-up chips that echo an earlier question) should not
  // re-walk 75K edges. TTL is short (5 min) because the edge store is
  // mutable — a classify-ie-edges run or ingest should invalidate.
  const cacheKey = question.toLowerCase().replace(/\s+/g, " ").trim()
  const cached = ASK_CACHE.get(cacheKey)
  if (cached && Date.now() - cached.at < ASK_CACHE_TTL_MS) {
    return NextResponse.json({ ...cached.result, _cache: "hit" })
  }

  try {
    const result = await handleQuestion(question)
    ASK_CACHE.set(cacheKey, { at: Date.now(), result })
    if (ASK_CACHE.size > ASK_CACHE_MAX) {
      // Drop oldest ~25% to keep bounded
      const keys = [...ASK_CACHE.keys()].slice(0, Math.floor(ASK_CACHE_MAX / 4))
      for (const k of keys) ASK_CACHE.delete(k)
    }
    return NextResponse.json(result)
  } catch (err) {
    return NextResponse.json({ error: String(err instanceof Error ? err.message : err) }, { status: 500 })
  }
}

// Module-level cache (per Next.js route instance). Survives until the
// Next dev server restarts or the serverless instance cycles.
const ASK_CACHE_TTL_MS = 5 * 60 * 1000
const ASK_CACHE_MAX = 500
const ASK_CACHE = new Map<string, { at: number; result: any }>()
