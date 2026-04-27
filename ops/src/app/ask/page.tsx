"use client"

/**
 * /ask — natural-language donor map querier (Ops, Clerk-gated).
 *
 * Type a question, hit submit, see the answer. Pattern-matches to the
 * underlying query engine via /api/ask. Mirrors scripts/ask.cjs CLI.
 *
 * Example questions:
 *   "who funds marble freedom trust"
 *   "where does fidelity charitable's money go"
 *   "top donors to kamala harris"
 *   "what boards is leonard leo on"
 *   "who's on the board of america first policy institute"
 *   "biggest grants from new venture fund in 2020"
 *   "cross party donors"
 *   "mark kelly voting record"
 */

import { useState, useEffect } from "react"
import { PageHeader } from "@/components/PageHeader"

type Row = Record<string, unknown>

// Build a CSV from the evidence rows on an AskResponse and trigger a
// download. Column order is deterministic: use orderedHeaders from
// the first row if the response carries rows, else fall back to
// Object.keys. Handles escaping quotes + commas.
function downloadCsv(r: { question?: string; intent?: string; rows: Array<Record<string, unknown>> }) {
  if (!r.rows || r.rows.length === 0) return
  // Column order: union of all row keys, preferring natural shape
  // (name/from/to/amount/cycle first if present).
  const preferred = ["name", "from", "to", "amount", "cycle", "source", "role", "type"]
  const allKeys = new Set<string>()
  for (const row of r.rows) for (const k of Object.keys(row)) allKeys.add(k)
  const ordered: string[] = []
  for (const p of preferred) if (allKeys.has(p)) { ordered.push(p); allKeys.delete(p) }
  for (const k of [...allKeys].sort()) ordered.push(k)

  const esc = (v: unknown): string => {
    if (v == null) return ""
    const s = typeof v === "object" ? JSON.stringify(v) : String(v)
    if (/[",\n]/.test(s)) return '"' + s.replace(/"/g, '""') + '"'
    return s
  }
  const lines = [ordered.join(",")]
  for (const row of r.rows) lines.push(ordered.map((k) => esc((row as any)[k])).join(","))

  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = `ask-${(r.intent || "result").replace(/\W+/g, "-")}-${Date.now()}.csv`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

// Helper: turn a vault profile_path into an ops profile viewer URL.
// The ops app has /profile?path=... for browsing any markdown file.
// Falls back to just the entity name as plain text if no path is set.
function profileHref(profile_path?: string | null): string | null {
  if (!profile_path) return null
  const clean = profile_path.replace(/\\/g, "/")
  return `/profile?path=${encodeURIComponent(clean)}`
}

interface EntityContext {
  name: string
  gloss: string
  blurb?: string
  profile_path?: string
}

interface AskResponse {
  question: string
  intent: string
  label?: string
  resolved_title?: string | null
  resolved_title_2?: string | null
  did_you_mean?: string[]
  total: number
  rows: Row[]
  answer?: string
  bullets?: string[]
  interpretation?: string
  caveats?: string[]
  context?: EntityContext[]
  follow_ups?: string[]
  citation?: string
  summary?: string
  note?: string
  error?: string
  // Plain-English overlay fields
  plain_english?: string
  visual_flow?: string
  is_this_legal?: string
  why_matters?: string
  who_is_lead?: { name: string; oneLiner: string }
  empty_reason?: string
  // ADR-0016 labeled breakdown — labeled slices instead of one total
  breakdown?: Array<{
    label: string
    value: string
    numeric?: number
    citation?: string
    note?: string
    legal_shield?: boolean
  }>
  breakdown_a?: Array<{
    label: string
    value: string
    numeric?: number
    citation?: string
    note?: string
    legal_shield?: boolean
  }>
  breakdown_b?: Array<{
    label: string
    value: string
    numeric?: number
    citation?: string
    note?: string
    legal_shield?: boolean
  }>
}

// Glossary: terms we automatically decorate with hover tooltips.
// Definitions intentionally plain-English. Goal: someone who's never
// heard the term should understand it in one breath. Technical precision
// matters less than comprehension for a first-time reader.
const GLOSSARY: Record<string, string> = {
  "501(c)(4)":
    "A type of nonprofit that's allowed to spend money on politics AND keep its donors secret. Legally called a 'social welfare' org. The main vehicle for 'dark money' in US politics.",
  "501(c)(3)":
    "A tax-deductible charity (think: your church, Red Cross, your kid's school). Allowed to do limited political work. Donor names are usually private.",
  "527":
    "A political organization that MUST publicly disclose its donors. Includes super PACs and party committees.",
  DAF:
    "Donor-Advised Fund. Think of it like an anonymous checking account for charity: a rich person deposits money, later tells the fund who to pay. The public record only shows the DAF as the giver — the original donor stays hidden.",
  "donor-advised fund":
    "Think of it like an anonymous checking account for charity: a rich person deposits money, later tells the fund who to pay. The public record only shows the DAF as the giver — the original donor stays hidden.",
  "Super PAC":
    "An independent-expenditure political committee. Can accept and spend unlimited money for or against federal candidates but cannot coordinate with a campaign. Must disclose donors to the FEC.",
  "super pac":
    "An independent-expenditure political committee. Can accept and spend unlimited money for or against federal candidates but cannot coordinate with a campaign. Must disclose donors to the FEC.",
  "independent-expenditure":
    "Spending on political ads that is NOT coordinated with any candidate campaign. Allows unlimited amounts.",
  "dark-money":
    "Political spending where the original source of the money is not publicly disclosed, typically via 501(c)(4)s and shell LLCs.",
  "bundler":
    "A person who solicits contributions from many donors and presents them as a package to a campaign. Bundlers' identities are not required to be disclosed in most cases.",
  EIN:
    "Employer Identification Number. A 9-digit federal tax ID. Every nonprofit or PAC has one. Used to look up their IRS filings.",
  "Schedule I":
    "The section of IRS Form 990 where a nonprofit lists every grant they gave to other organizations, with dollar amounts and recipient names.",
  "c4":
    "Shorthand for 501(c)(4). A tax-exempt social welfare nonprofit that does not have to disclose donors.",
  "c3":
    "Shorthand for 501(c)(3). A tax-exempt public charity where donations are tax-deductible.",
}

function renderWithGlossary(text: string): React.ReactNode {
  // Build a regex of all glossary terms, longest-first to avoid partial matches
  const terms = Object.keys(GLOSSARY).sort((a, b) => b.length - a.length)
  const escaped = terms.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
  const re = new RegExp(`(${escaped.join("|")})`, "gi")
  const parts = text.split(re)
  return parts.map((p, i) => {
    const hit = Object.keys(GLOSSARY).find((k) => k.toLowerCase() === p.toLowerCase())
    if (hit) {
      return (
        <span key={i} title={GLOSSARY[hit]} style={{ borderBottom: "1px dotted #fbbf24", cursor: "help" }}>
          {p}
        </span>
      )
    }
    return <span key={i}>{p}</span>
  })
}

// Bold renderer with glossary-tooltip integration
function renderRichText(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*)/g)
  return parts.map((p, i) => {
    if (p.startsWith("**") && p.endsWith("**")) return <strong key={i}>{renderWithGlossary(p.slice(2, -2))}</strong>
    return <span key={i}>{renderWithGlossary(p)}</span>
  })
}

const EXAMPLES = [
  "who funds marble freedom trust",
  "tell me about leonard leo",
  "compare Sixteen Thirty Fund vs Marble Freedom Trust",
  "elon musk funds donald trump",
  "does marble freedom trust fund the 85 fund",
  "money chain from fidelity investments to america votes",
  "top donors",
  "top super pacs",
  "top politicians",
  "top dafs",
  "where does fidelity charitable's money go",
  "top donors to kamala harris",
  "what boards is leonard leo on",
  "who's on the board of america first policy institute",
  "biggest grants from new venture fund in 2020",
  "cross party donors",
  "mark kelly voting record",
]

function fmtUsd(n: unknown): string {
  const num = typeof n === "number" ? n : Number(n)
  if (!num || Number.isNaN(num)) return "—"
  const a = Math.abs(num)
  if (a >= 1e9) return "$" + (num / 1e9).toFixed(2) + "B"
  if (a >= 10e6) return "$" + Math.round(num / 1e6) + "M"
  if (a >= 1e6) return "$" + (num / 1e6).toFixed(1) + "M"
  if (a >= 10e3) return "$" + Math.round(num / 1e3) + "K"
  if (a >= 1e3) return "$" + (num / 1e3).toFixed(1) + "K"
  return "$" + Math.round(num).toLocaleString()
}

export default function AskPage() {
  const [question, setQuestion] = useState("")
  const [result, setResult] = useState<AskResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [history, setHistory] = useState<AskResponse[]>([])
  const [shareFeedback, setShareFeedback] = useState("")

  async function submit(q: string) {
    if (!q.trim()) return
    setLoading(true)
    setResult(null)
    // Write the query to the URL so the page is shareable/bookmarkable.
    // Uses history.replaceState so back/forward stacks aren't polluted
    // by every keystroke-submitted query.
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href)
      url.searchParams.set("q", q)
      window.history.replaceState({}, "", url.toString())
    }
    try {
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ question: q }),
      })
      const json: AskResponse = await res.json()
      setResult(json)
      if (!json.error) setHistory((h) => [json, ...h].slice(0, 10))
    } catch (err) {
      setResult({
        question: q,
        intent: "error",
        total: 0,
        rows: [],
        error: String(err instanceof Error ? err.message : err),
      })
    } finally {
      setLoading(false)
    }
  }

  // Auto-submit if the page loads with ?q=... in the URL. Lets users
  // share specific queries by link ("ops/ask?q=who+funds+marble+freedom+trust")
  // without having to manually re-type or paste into the input.
  useEffect(() => {
    if (typeof window === "undefined") return
    const q = new URL(window.location.href).searchParams.get("q")
    if (q && q.trim()) {
      setQuestion(q)
      submit(q)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div style={styles.wrap}>
      <PageHeader
        title="Ask"
        whatThisDoes='Plain-English donor-map queries. Pattern-matched to specific question shapes (e.g., "who funds X", "where does X money go", "X voting record") — NOT fuzzy AI. Every answer cites specific edge records from the canonical store.'
        action='Type a question, hit submit. Use the patterns shown in the help panel below ("who is X" / "who funds X" / "compare X vs Y" / "top donors" / etc.). Switch to Raw query tab for filter-driven structured queries.'
      />

      {/* Sibling-page tab — Query and Ask share a sidebar slot. */}
      <div style={{ display: "flex", gap: "0.25rem", marginTop: "0.25rem", marginBottom: "1rem", borderBottom: "1px solid #1f2937" }}>
        <a
          href="/query"
          style={{
            padding: "0.5rem 0.875rem",
            color: "#9ca3af",
            fontSize: "0.85rem",
            textDecoration: "none",
            borderBottom: "2px solid transparent",
          }}
        >
          ← Raw query (filters + table)
        </a>
        <span
          style={{
            padding: "0.5rem 0.875rem",
            background: "#1f2937",
            color: "#fbbf24",
            borderTopLeftRadius: "0.375rem",
            borderTopRightRadius: "0.375rem",
            borderBottom: "2px solid #fbbf24",
            fontSize: "0.85rem",
            fontWeight: 600,
          }}
        >
          ▼ Natural-language ask
        </span>
      </div>

      <details style={styles.howtoDetails}>
        <summary style={styles.howtoSummary}>How to use this — click to expand</summary>
        <div style={styles.howtoBody}>
          <div style={styles.howtoSection}>
            <div style={styles.howtoHeading}>What this is</div>
            <div>
              A query engine over a structured database of political money flows. Every answer traces back to a specific
              edge record (donor → recipient, with dollar amount and source). Two audiences: <strong>readers</strong> who
              want a plain-English explainer, and <strong>researchers</strong> who want cite-ready paragraphs and source IDs.
              Both get served — read what makes sense and ignore the rest.
            </div>
          </div>

          <div style={styles.howtoSection}>
            <div style={styles.howtoHeading}>Question shapes that work</div>
            <div>
              This isn't a chatbot. It matches specific phrasings to specific query types. Use these patterns:
              <ul style={styles.howtoList}>
                <li><strong>who is X</strong> / <strong>tell me about X</strong> — profile snapshot with flows in and out</li>
                <li><strong>who funds X</strong> — donors to X, ranked by dollar amount</li>
                <li><strong>where does X's money go</strong> — recipients of X, ranked</li>
                <li><strong>does X fund Y</strong> / <strong>money chain from X to Y</strong> — traces the path (up to 3 hops) with a visual flow diagram</li>
                <li><strong>compare X vs Y</strong> / <strong>X vs Y</strong> — side-by-side structural comparison of two entities (great for revealing left/right dark-money symmetry)</li>
                <li><strong>what boards is X on</strong> — director/trustee affiliations</li>
                <li><strong>who's on the board of X</strong> — the reverse</li>
                <li><strong>top donors</strong> / <strong>top super pacs</strong> / <strong>top dafs</strong> / <strong>top politicians</strong> — leaderboards</li>
                <li><strong>cross party donors</strong> — entities that fund both sides</li>
                <li><strong>X voting record</strong> — for politicians only</li>
              </ul>
            </div>
          </div>

          <div style={styles.howtoSection}>
            <div style={styles.howtoHeading}>How to read an answer card</div>
            <div>
              Cards are layered from normie to researcher, top to bottom:
              <ol style={styles.howtoList}>
                <li><strong>In plain English</strong> (blue left-border) — one-sentence translation. Start here.</li>
                <li><strong>The trail, visualized</strong> — ASCII flow diagram, arrows with dollar amounts</li>
                <li><strong>Is this illegal?</strong> (green) — preempts the instinctive first question</li>
                <li><strong>Why should I care?</strong> (indigo) — stakes, not mechanics</li>
                <li><strong>What this means</strong> (yellow) — jargon-tolerant explanation</li>
                <li><strong>Important caveat</strong> (red) — data limitations worth knowing</li>
                <li><strong>Who these are</strong> — one-sentence gloss per entity involved</li>
                <li><strong>Follow-up questions</strong> — blue chips, click to pivot</li>
                <li><strong>Cite-ready paragraph</strong> — copy/paste into articles, includes source IDs</li>
                <li><strong>Evidence (N rows)</strong> — collapsible, raw edge table with source citations</li>
              </ol>
            </div>
          </div>

          <div style={styles.howtoSection}>
            <div style={styles.howtoHeading}>Jargon glossary</div>
            <div>
              Underlined terms (<u>like this</u>) have hover tooltips. Technical terms that show up a lot:
              <ul style={styles.howtoList}>
                <li><strong>501(c)(4)</strong> — a "social welfare" nonprofit that doesn't disclose donors. The main dark-money vehicle.</li>
                <li><strong>DAF</strong> (donor-advised fund) — an anonymous middleman that legally erases the original donor's name from the paper trail.</li>
                <li><strong>Super PAC</strong> — can raise unlimited money but must disclose donors.</li>
                <li><strong>EIN</strong> — the 9-digit federal tax ID for a nonprofit. Useful for researchers looking up IRS filings.</li>
                <li><strong>Schedule I</strong> — the IRS form page where nonprofits list every grant they gave, with amounts.</li>
              </ul>
            </div>
          </div>

          <div style={styles.howtoSection}>
            <div style={styles.howtoHeading}>What this DOESN'T do</div>
            <div>
              <ul style={styles.howtoList}>
                <li>It doesn't do fuzzy matching yet. "MFT" may not resolve to "Marble Freedom Trust." Type the full name.</li>
                <li>Not every profile is searchable. Some media personalities and think tanks exist as articles but aren't in the query index yet.</li>
                <li>It's not a chatbot. Philosophical questions, open-ended analysis, anything vague — use a real profile page instead.</li>
                <li>Dollar figures reflect only what's in the structured database. Some dark-money flows are legally hidden and can't be traced.</li>
              </ul>
            </div>
          </div>

          <div style={styles.howtoSection}>
            <div style={styles.howtoHeading}>If a query doesn't work</div>
            <div>
              Try rephrasing using one of the patterns above. If you know the entity exists but the query fails, try
              "tell me about [exact name]" first to see how the system has the entity registered. Names are sensitive
              to exact spelling right now.
            </div>
          </div>
        </div>
      </details>

      <details style={styles.howtoDetails}>
        <summary style={styles.howtoSummary}>What's in the data — coverage & sources (click to expand)</summary>
        <div style={styles.howtoBody}>
          <div style={styles.howtoSection}>
            <div style={styles.howtoHeading}>Query subjects you can filter</div>
            <div>
              Every answer card you see below is built from structured records in these subjects. You can address them directly in Ask (Phase-2 intents below), or the engine routes natural-language questions to them for you.
              <ul style={styles.howtoList}>
                <li><strong>entities</strong> — ~2,200 vault profiles (politicians, donors, corps, nonprofits, PACs, media figures). Filter by <code>entity_type</code>, <code>sector</code>, <code>class_position</code>.</li>
                <li><strong>edges</strong> — ~2.3M relationships (monetary, affiliation, sponsorship, offshore, etc.). Filter by <code>from</code>, <code>to</code>, <code>type</code>, <code>source</code>, <code>min_amount</code>, <code>cycle</code>.</li>
                <li><strong>events</strong> — floor votes, filings, obstruction events (from events-store).</li>
                <li><strong>bills</strong> — 141,803 bills, 108th–119th Congress. Filter by <code>congress</code>, <code>policy_area</code>, <code>became_law</code>, <code>sponsor_bioguide</code>, <code>subject</code>.</li>
                <li><strong>executive_actions</strong> — 12,198 EOs + proclamations + directives, 2000–2026. Filter by <code>president</code>, <code>year</code>, <code>type</code>.</li>
                <li><strong>offshore_entities</strong> — 401 shell companies + officers from Panama/Paradise/Pandora/Offshore Leaks, linked to vault entities. Filter by <code>linked_vault_entity</code>, <code>jurisdiction</code>, <code>leak</code>.</li>
                <li><strong>votes</strong> — 9,639 roll calls across 115th–119th Congress. Filter by <code>congress</code>, <code>chamber</code>, <code>bill_type</code>, <code>bill_number</code>, <code>result</code>.</li>
                <li><strong>positions</strong> — 2.5M legislator vote positions. Filter by <code>bioguide</code>, <code>vote_id</code>, <code>position</code>, <code>party</code>, <code>congress</code>.</li>
              </ul>
            </div>
          </div>

          <div style={styles.howtoSection}>
            <div style={styles.howtoHeading}>New Phase-2 question shapes</div>
            <div>
              Recently added. These resolve to the new query subjects above.
              <ul style={styles.howtoList}>
                <li><strong>bills sponsored by [legislator]</strong> — full sponsorship list for any politician, with enacted-law flags</li>
                <li><strong>[health|energy|taxation|defense|labor|crypto|…] bills</strong> — bills in a policy area, across all 12 Congresses</li>
                <li><strong>[Trump|Biden|Obama|Clinton|Bush]'s EOs</strong> / <strong>executive orders by [president] [year]</strong> — signed actions with titles + dates</li>
                <li><strong>offshore holdings of [entity]</strong> / <strong>panama papers [entity]</strong> — ICIJ records linked to vault entities (with disclaimer)</li>
                <li><strong>votes on H.R. [N]</strong> / <strong>how did congress vote on [bill]</strong> — roll calls tied to a bill</li>
                <li><strong>[legislator]'s nay votes</strong> / <strong>[legislator]'s yea votes</strong> — filtered positions by legislator</li>
                <li><strong>roll call [vote-id]</strong> (e.g. s325-118.2) — full detail + party breakdown for a single vote</li>
              </ul>
            </div>
          </div>

          <div style={styles.howtoSection}>
            <div style={styles.howtoHeading}>Data sources we use</div>
            <div>
              Every edge / record traces to one of these upstream pipelines. If you want to audit a number, the edge's <code>source</code> field tells you which source it came from.
              <ul style={styles.howtoList}>
                <li><strong>FEC bulk</strong> (fec.gov) — candidate-master, committee-master, individual contributions (1980–2026), committee transfers (1980–2026), PAS2 contributions, operating expenditures, candidate-committee linkages. ~1.4M monetary edges.</li>
                <li><strong>IRS Form 990 XML</strong> (irs.gov bulk) — nonprofit grants + officers. ~2,200 grant edges + officer affiliations.</li>
                <li><strong>IRS POFD 8871/8872</strong> (irs.gov Political Org filings) — 527 political org EINs + contributions + expenditures. ~8,100 edges.</li>
                <li><strong>IRS EO BMF</strong> (irs.gov Exempt Orgs Master File) — nonprofit EIN lookup (2M records indexed).</li>
                <li><strong>USAspending contracts</strong> (usaspending.gov FY25+FY26 bulk) — federal contract edges + recipient UEIs. ~550 contract edges.</li>
                <li><strong>GovInfo Bill Status</strong> (govinfo.gov BILLSTATUS bulk) — 141,803 bills sponsor/cosponsor lineage (108th–119th Congress).</li>
                <li><strong>GovInfo PLAW</strong> (govinfo.gov Public/Private Laws bulk) — 2,132 enacted laws tied back to bills.</li>
                <li><strong>GovInfo Federal Register</strong> (govinfo.gov FR bulk, 2000–2026) — 12,198 executive actions.</li>
                <li><strong>ICIJ Offshore Leaks</strong> (offshoreleaks.icij.org bulk) — Panama/Paradise/Pandora/Offshore/Bahamas Papers combined. 412 affiliation edges, 401 shells linked.</li>
                <li><strong>Congress.gov + senate.gov + clerk.house.gov XML</strong> — roll-call votes, 115th–119th Congress. 9,639 votes + 2.5M positions.</li>
                <li><strong>unitedstates/congress-legislators</strong> (GitHub) — bioguide ↔ FEC ↔ LIS cross-walks.</li>
                <li><strong>SEC EDGAR company_tickers.json</strong> — ticker ↔ CIK ↔ title for 11,366 public corps.</li>
                <li><strong>STOCK Act PTR scraper</strong> — daily scrape of Senate EFDS + House Clerk, congressional trading disclosures.</li>
                <li><strong>Editorial + community</strong> — frontmatter migrations, manual ops, bidirectional normalizer, relationship-discovery scanner.</li>
              </ul>
            </div>
          </div>

          <div style={styles.howtoSection}>
            <div style={styles.howtoHeading}>What's NOT in here (yet)</div>
            <div>
              Transparency about gaps matters. Current known limits:
              <ul style={styles.howtoList}>
                <li>Pre-2016 individual itemized donor contributions (FEC schema changed; older data uses different column layout, ingest not yet extended).</li>
                <li>State-level campaign finance (~29 state politicians — Abbott, Youngkin, Shapiro, etc. — have no federal FEC record).</li>
                <li>Lobbying Disclosure Act filings (LDA pipeline broken upstream until June 2026).</li>
                <li>SEC 13F institutional holdings (what hedge funds own). Not ingested.</li>
                <li>County-level real-estate records (no aggregator we trust).</li>
                <li>OpenCorporates private LLC data (needs paid bulk license).</li>
              </ul>
            </div>
          </div>

          <div style={styles.howtoSection}>
            <div style={styles.howtoHeading}>Freshness</div>
            <div>
              STOCK Act trades: refreshed daily 6am via scheduled producer. Everything else: refreshed per-release when upstream bulk files update (~monthly for FEC, weekly for GovInfo, one-shot for ICIJ leaks). Every edge carries <code>first_seen</code> and <code>last_verified</code> timestamps if you need to check staleness.
            </div>
          </div>
        </div>
      </details>

      <div style={styles.row}>
        <input
          style={styles.input}
          type="text"
          placeholder="e.g. who funds marble freedom trust"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") submit(question)
          }}
          autoFocus
        />
        <button style={styles.btn} onClick={() => submit(question)} disabled={loading}>
          {loading ? "..." : "Ask"}
        </button>
        {result && !result.error && (
          <button
            style={styles.shareBtn}
            onClick={async () => {
              if (typeof window === "undefined") return
              const url = new URL(window.location.href)
              url.searchParams.set("q", result.question)
              try {
                await navigator.clipboard.writeText(url.toString())
                setShareFeedback("copied!")
                setTimeout(() => setShareFeedback(""), 1500)
              } catch {
                setShareFeedback("copy failed")
                setTimeout(() => setShareFeedback(""), 1500)
              }
            }}
            title="Copy a shareable link to this query"
          >
            {shareFeedback || "Share"}
          </button>
        )}
      </div>

      <div style={styles.examples}>
        <div style={styles.exLabel}>Try:</div>
        {EXAMPLES.map((ex) => (
          <button
            key={ex}
            style={styles.exBtn}
            onClick={() => {
              setQuestion(ex)
              submit(ex)
            }}
          >
            {ex}
          </button>
        ))}
      </div>

      {result && <ResultCard r={result} onFollowUp={(q) => { setQuestion(q); submit(q) }} />}

      {history.length > 1 && (
        <div style={styles.histWrap}>
          <h3 style={styles.h3}>Recent</h3>
          {history.slice(1).map((h, i) => (
            <button
              key={i}
              style={styles.histItem}
              onClick={() => {
                setQuestion(h.question)
                setResult(h)
              }}
            >
              → {h.question} <span style={styles.histMeta}>({h.intent}, {h.total})</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function ResultCard({ r, onFollowUp }: { r: AskResponse; onFollowUp: (q: string) => void }) {
  if (r.error) {
    return (
      <div style={{ ...styles.card, borderColor: "#e63946" }}>
        <div style={styles.cardLabel}>ERROR</div>
        <div>{r.error}</div>
      </div>
    )
  }

  // Collect keys from ALL rows — rows can have heterogeneous shapes
  // (summary intent mixes class-tag, board-seat, top-donor, top-recipient
  // rows with different field sets).
  const headerSet = new Set<string>()
  for (const row of r.rows) for (const k of Object.keys(row as Row)) headerSet.add(k)
  const headers = [...headerSet]
  const prioritized = [
    "kind",
    "tag",
    "cycle",
    "direction",
    "from",
    "to",
    "amount",
    "type",
    "role",
    "date_range",
    "source",
    "session",
    "vote_count",
    "name",
    "total_spend",
    "politicians_count",
  ]
  const orderedHeaders = [
    ...prioritized.filter((h) => headers.includes(h)),
    ...headers.filter((h) => !prioritized.includes(h) && h !== "id" && !h.endsWith("_slug") && !h.endsWith("_subcategory") && h !== "evidence" && h !== "confidence" && h !== "direction" && h !== "status" && h !== "first_seen" && h !== "last_verified"),
  ]

  const label = r.label || r.intent.replace(/_/g, " ")
  async function copyCitation() {
    if (!r.citation) return
    try { await navigator.clipboard.writeText(r.citation) } catch {}
  }

  return (
    <div style={styles.card}>
      <div style={styles.cardHead}>
        <div style={styles.cardLabel}>{label.toUpperCase()}</div>

        {/* Plain-English TL;DR leads the card — normie translation before jargon */}
        {r.plain_english && (
          <div style={styles.tldrWrap}>
            <div style={styles.tldrText}>{renderRichText(r.plain_english)}</div>
          </div>
        )}

        {r.answer && <div style={styles.answer}>{renderRichText(r.answer)}</div>}

        {/* ADR-0016 labeled breakdown */}
        {r.breakdown && r.breakdown.length > 0 && (
          <div style={styles.breakdownWrap}>
            <div style={styles.breakdownHeading}>Breakdown</div>
            {r.breakdown.map((row, i) => (
              <div key={i} style={row.legal_shield ? styles.breakdownRowShield : styles.breakdownRow}>
                <div style={styles.breakdownLabel}>{row.label}</div>
                <div style={styles.breakdownValue}>
                  {renderRichText(row.value)}
                  {row.citation && <span style={styles.breakdownCite}> [{row.citation}]</span>}
                </div>
                {row.note && <div style={styles.breakdownNote}>{renderRichText(row.note)}</div>}
              </div>
            ))}
          </div>
        )}

        {r.bullets && r.bullets.length > 0 && (
          <ul style={styles.bullets}>
            {r.bullets.map((b, i) => (
              <li key={i} style={styles.bulletItem}>{renderRichText(b)}</li>
            ))}
          </ul>
        )}

        {/* Visual flow diagram — ASCII arrows with source-laundering annotation */}
        {r.visual_flow && (
          <div style={styles.visualFlowWrap}>
            <div style={styles.visualFlowLabel}>The trail, visualized</div>
            <pre style={styles.visualFlow}>{r.visual_flow}</pre>
          </div>
        )}

        {/* Is this legal? — preempts the first question every reader asks.
            Label intentionally phrased positively so a "Yes." answer in the
            body reads as "yes it's legal" (not "yes it's illegal" — that
            framing confused users). */}
        {r.is_this_legal && (
          <div style={styles.legalityWrap}>
            <div style={styles.legalityLabel}>Is this legal?</div>
            <div style={styles.legality}>{renderRichText(r.is_this_legal)}</div>
          </div>
        )}

        {/* Why should I care? — stakes, not schema */}
        {r.why_matters && (
          <div style={styles.whyCareWrap}>
            <div style={styles.whyCareLabel}>Why should I care?</div>
            <div style={styles.whyCare}>{renderRichText(r.why_matters)}</div>
          </div>
        )}

        {r.interpretation && (
          <div style={styles.interpretationWrap}>
            <div style={styles.interpretationLabel}>What this means</div>
            <div style={styles.interpretation}>{renderWithGlossary(r.interpretation)}</div>
          </div>
        )}

        {r.caveats && r.caveats.length > 0 && (
          <div style={styles.caveatsWrap}>
            <div style={styles.caveatsLabel}>Important caveat</div>
            {r.caveats.map((c, i) => (
              <div key={i} style={styles.caveatItem}>{renderWithGlossary(c)}</div>
            ))}
          </div>
        )}

        {/* Promoted "Who is X?" for well-known dark-money operators so readers
            don't have to infer the operator from context. */}
        {r.who_is_lead && (
          <div style={styles.whoIsLeadWrap}>
            <div style={styles.whoIsLeadLabel}>Who is {r.who_is_lead.name}?</div>
            <div style={styles.whoIsLead}>{renderWithGlossary(r.who_is_lead.oneLiner)}</div>
          </div>
        )}

        {r.context && r.context.length > 0 && (
          <div style={styles.contextWrap}>
            <div style={styles.contextLabel}>Who these are</div>
            {r.context.map((c, i) => {
              const href = profileHref(c.profile_path)
              return (
                <div key={i} style={styles.contextItem}>
                  <div style={styles.contextName}>
                    {href ? (
                      <a href={href} style={styles.contextNameLink}>{c.name}</a>
                    ) : (
                      c.name
                    )}
                  </div>
                  <div style={styles.contextGloss}>{renderWithGlossary(c.gloss)}</div>
                  {c.blurb && <div style={styles.contextBlurb}>{renderWithGlossary(c.blurb)}</div>}
                </div>
              )
            })}
          </div>
        )}

        {r.follow_ups && r.follow_ups.length > 0 && (
          <div style={styles.followWrap}>
            <div style={styles.followLabel}>Follow-up questions</div>
            <div style={styles.followChipsRow}>
              {r.follow_ups.map((q) => (
                <button key={q} style={styles.followChip} onClick={() => onFollowUp(q)}>
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {r.citation && (
          <div style={styles.citeWrap}>
            <div style={styles.citeLabel}>Cite-ready paragraph</div>
            <div style={styles.citeText}>{r.citation}</div>
            <button style={styles.citeBtn} onClick={copyCitation}>Copy</button>
          </div>
        )}

        {r.resolved_title && r.resolved_title !== r.question && !r.answer && (
          <div style={styles.resolved}>
            resolved to: <strong>{r.resolved_title}</strong>
            {r.resolved_title_2 ? <> + <strong>{r.resolved_title_2}</strong></> : null}
          </div>
        )}
        {r.did_you_mean && r.did_you_mean.length > 0 && (
          <div style={styles.resolved}>
            did you mean: {r.did_you_mean.slice(0, 5).join(" · ")}
          </div>
        )}
        {r.summary && <div style={styles.summary}>{r.summary}</div>}
        {r.note && <div style={styles.note}>{r.note}</div>}
      </div>

      {/* Compare-intent gets its own side-by-side renderer. The rows
          are already shaped as {metric, a, b} — turn each row into a
          two-column comparison line with entity names as column heads.
          Default Evidence expander is suppressed for this intent since
          the rows ARE the answer, not supporting detail. */}
      {r.intent === "compare" && r.rows.length > 0 && (
        <div style={styles.compareWrap}>
          <div style={styles.compareHeadRow}>
            <div style={styles.compareMetricCell}></div>
            <div style={styles.compareEntityCell}>{r.resolved_title}</div>
            <div style={styles.compareEntityCell}>{r.resolved_title_2}</div>
          </div>
          {(r.rows as Array<{ metric: string; a: string; b: string }>).map((row, i) => (
            <div key={i} style={{ ...styles.compareRow, background: i % 2 === 0 ? "#0f0f0f" : "#141414" }}>
              <div style={styles.compareMetricLabel}>{row.metric}</div>
              <div style={styles.compareValueCell}>{renderRichText(String(row.a))}</div>
              <div style={styles.compareValueCell}>{renderRichText(String(row.b))}</div>
            </div>
          ))}
          {(r.breakdown_a && r.breakdown_a.length > 0) || (r.breakdown_b && r.breakdown_b.length > 0) ? (
            <div style={styles.compareBreakdownWrap}>
              <div style={styles.compareBreakdownHeadRow}>
                <div style={styles.compareMetricCell}>Breakdown</div>
                <div style={styles.compareEntityCell}>{r.resolved_title}</div>
                <div style={styles.compareEntityCell}>{r.resolved_title_2}</div>
              </div>
              {(() => {
                const la = r.breakdown_a || []
                const lb = r.breakdown_b || []
                const labels = Array.from(new Set([...la.map((x) => x.label), ...lb.map((x) => x.label)]))
                return labels.map((label, i) => {
                  const rowA = la.find((x) => x.label === label)
                  const rowB = lb.find((x) => x.label === label)
                  const shield = rowA?.legal_shield || rowB?.legal_shield
                  return (
                    <div key={i} style={{ ...styles.compareRow, ...(shield ? styles.compareRowShield : {}), background: i % 2 === 0 ? "#0f0f0f" : "#141414" }}>
                      <div style={styles.compareMetricLabel}>{label}</div>
                      <div style={styles.compareValueCell}>
                        {rowA ? <>{renderRichText(rowA.value)}{rowA.citation && <span style={styles.breakdownCite}> [{rowA.citation}]</span>}</> : "—"}
                        {rowA?.note && <div style={styles.breakdownNote}>{renderRichText(rowA.note)}</div>}
                      </div>
                      <div style={styles.compareValueCell}>
                        {rowB ? <>{renderRichText(rowB.value)}{rowB.citation && <span style={styles.breakdownCite}> [{rowB.citation}]</span>}</> : "—"}
                        {rowB?.note && <div style={styles.breakdownNote}>{renderRichText(rowB.note)}</div>}
                      </div>
                    </div>
                  )
                })
              })()}
            </div>
          ) : null}
        </div>
      )}

      {r.rows.length > 0 && r.intent !== "compare" && (
        <details style={styles.detailsWrap}>
          <summary style={styles.detailsSummary}>
            Evidence ({r.rows.length} row{r.rows.length === 1 ? "" : "s"})
            <button
              style={styles.csvBtn}
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                downloadCsv(r)
              }}
              title="Download these evidence rows as CSV"
            >
              Download CSV
            </button>
          </summary>
          <div style={styles.tableWrap}>
          <table style={styles.table}>
            <thead>
              <tr>
                {orderedHeaders.map((h) => (
                  <th key={h} style={styles.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {r.rows.slice(0, 50).map((row, i) => (
                <tr key={i} style={i % 2 === 0 ? styles.trEven : undefined}>
                  {orderedHeaders.map((h) => {
                    const v = (row as Row)[h]
                    const isMoney = h === "amount" || h === "total_spend"
                    const display = isMoney
                      ? fmtUsd(v)
                      : typeof v === "object" && v !== null
                      ? JSON.stringify(v).slice(0, 60)
                      : v == null
                      ? ""
                      : String(v)
                    return (
                      <td
                        key={h}
                        style={{
                          ...styles.td,
                          ...(isMoney ? styles.tdRight : {}),
                          ...(h === "from" || h === "to" || h === "name" ? styles.tdBold : {}),
                        }}
                      >
                        {display}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
          {r.rows.length > 50 && (
            <div style={styles.more}>... {r.rows.length - 50} more rows not shown</div>
          )}
          </div>
        </details>
      )}

      {/* Empty-result rescue — when a query finds nothing, don't just say
          "No rows matched." Give the reader a useful off-ramp: common
          reasons + 3 questions that reliably work. This turns a dead-end
          into a next step. */}
      {r.rows.length === 0 && !r.note && !r.answer && !r.plain_english && (
        <div style={styles.emptyRescue}>
          <div style={styles.emptyRescueHeading}>Nothing matched this query.</div>
          <div style={styles.emptyRescueBody}>
            A few things this could mean:
            <ul style={styles.emptyRescueList}>
              <li><strong>Entity not in the query index yet.</strong> Some profiles exist as articles but aren't searchable by this tool. Media personalities, think tanks, and lobby firms are the most common gaps.</li>
              <li><strong>Name doesn't match exactly.</strong> Try the full registered name ("Marble Freedom Trust" instead of "MFT"). Fuzzy matching isn't on yet.</li>
              <li><strong>Question shape isn't recognized.</strong> This isn't a chatbot. Try one of the patterns from the "How to use this" panel above.</li>
              <li><strong>The data genuinely isn't there.</strong> Dark-money flows are often legally hidden and can't be traced even in principle.</li>
            </ul>
            <div style={styles.emptyRescueTryBlock}>
              <strong>Queries that reliably work:</strong>
              <div style={styles.emptyRescueChipsRow}>
                {[
                  "who funds marble freedom trust",
                  "tell me about leonard leo",
                  "top donors",
                  "does marble freedom trust fund the 85 fund",
                ].map((q) => (
                  <button key={q} style={styles.followChip} onClick={() => onFollowUp(q)}>
                    {q}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  wrap: { padding: 24, maxWidth: 1200, margin: "0 auto", fontFamily: "system-ui, sans-serif", color: "#e8e8e8" },
  h1: { fontSize: 32, fontWeight: 900, margin: "0 0 6px 0" },
  h3: { fontSize: 14, fontWeight: 600, margin: "16px 0 8px 0", textTransform: "uppercase", letterSpacing: 1, color: "#999" },
  hint: { color: "#999", fontSize: 13, margin: "0 0 16px 0" },
  row: { display: "flex", gap: 8, marginBottom: 12 },
  input: {
    flex: 1,
    padding: "10px 12px",
    fontSize: 15,
    background: "#1a1a1a",
    color: "#e8e8e8",
    border: "1px solid #333",
    outline: "none",
    fontFamily: "inherit",
  },
  btn: {
    padding: "10px 18px",
    fontSize: 15,
    fontWeight: 700,
    background: "#fbbf24",
    color: "#111",
    border: "none",
    cursor: "pointer",
  },
  shareBtn: {
    padding: "10px 14px",
    fontSize: 13,
    fontWeight: 600,
    background: "#222",
    color: "#eaeaea",
    border: "1px solid #444",
    cursor: "pointer",
  },
  csvBtn: {
    marginLeft: 12,
    padding: "2px 10px",
    fontSize: 11,
    fontWeight: 600,
    background: "#1d4ed8",
    color: "#fff",
    border: "none",
    cursor: "pointer",
    letterSpacing: 0.5,
  },
  examples: { display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 24, alignItems: "center" },
  exLabel: { color: "#666", fontSize: 12, marginRight: 4 },
  exBtn: {
    fontSize: 11,
    padding: "4px 8px",
    background: "#222",
    color: "#bbb",
    border: "1px solid #333",
    cursor: "pointer",
    fontFamily: "inherit",
  },
  card: {
    border: "1px solid #333",
    background: "#141414",
    padding: 16,
    marginTop: 16,
  },
  cardHead: { marginBottom: 12 },
  cardLabel: { fontSize: 11, fontWeight: 700, color: "#fbbf24", letterSpacing: 2, marginBottom: 8 },
  answer: { fontSize: 17, color: "#fff", lineHeight: 1.45, marginBottom: 10 },
  // ADR-0016 labeled breakdown — ops dark theme
  breakdownWrap: { margin: "10px 0 14px 0", padding: "10px 14px", background: "#0a0f1a", borderLeft: "3px solid #60a5fa" },
  breakdownHeading: { fontSize: 11, fontWeight: 800, color: "#888", letterSpacing: 2, textTransform: "uppercase" as const, marginBottom: 8 },
  breakdownRow: { marginBottom: 8, paddingBottom: 8, borderBottom: "1px dashed #222" },
  breakdownRowShield: { marginBottom: 8, paddingBottom: 8, borderBottom: "1px dashed #222", borderLeft: "3px solid #fbbf24", paddingLeft: 8, background: "rgba(251, 191, 36, 0.06)" },
  breakdownLabel: { fontSize: 11, fontWeight: 700, color: "#888", letterSpacing: 0.5, textTransform: "uppercase" as const, marginBottom: 2 },
  breakdownValue: { fontSize: 15, color: "#eee", fontFamily: "'Space Mono', monospace", fontWeight: 600 },
  breakdownCite: { fontSize: 11, color: "#666", fontWeight: 400, marginLeft: 4 },
  breakdownNote: { fontSize: 13, color: "#aaa", marginTop: 4, fontStyle: "italic" as const, lineHeight: 1.45 },
  compareBreakdownWrap: { marginTop: 14, borderTop: "1px solid #222", paddingTop: 10 },
  compareBreakdownHeadRow: { display: "grid", gridTemplateColumns: "200px 1fr 1fr", borderBottom: "2px solid #60a5fa", borderTop: "1px solid #222", background: "#0a0f1a" },
  compareRowShield: { borderLeft: "3px solid #fbbf24", background: "rgba(251, 191, 36, 0.06)" },
  bullets: { margin: "6px 0 12px 0", padding: "0 0 0 20px", color: "#ddd" },
  bulletItem: { fontSize: 14, lineHeight: 1.55, marginBottom: 4 },
  resolved: { fontSize: 12, color: "#888", marginBottom: 4 },
  summary: { fontSize: 12, color: "#777", marginTop: 8, fontStyle: "italic" },
  note: { fontSize: 13, color: "#ccc", fontStyle: "italic" },
  detailsWrap: { marginTop: 12, borderTop: "1px solid #222", paddingTop: 8 },
  detailsSummary: { cursor: "pointer", fontSize: 11, color: "#888", textTransform: "uppercase", letterSpacing: 1, userSelect: "none", marginBottom: 8 },
  contextWrap: { marginTop: 14, padding: "12px 14px", background: "#0f0f0f", border: "1px solid #2a2a2a" },
  contextLabel: { fontSize: 10, fontWeight: 700, color: "#888", letterSpacing: 2, textTransform: "uppercase", marginBottom: 8 },
  contextItem: { marginBottom: 10 },
  contextName: { fontSize: 14, fontWeight: 700, color: "#fbbf24" },
  contextNameLink: { color: "#fbbf24", textDecoration: "underline", textDecorationColor: "#5a4015" },
  contextGloss: { fontSize: 13, color: "#bbb", marginBottom: 3 },
  contextBlurb: { fontSize: 12, color: "#999", lineHeight: 1.5, fontStyle: "italic" },

  interpretationWrap: { marginTop: 14, padding: "12px 14px", background: "#1a1408", border: "1px solid #fbbf24" },
  interpretationLabel: { fontSize: 10, fontWeight: 700, color: "#fbbf24", letterSpacing: 2, textTransform: "uppercase", marginBottom: 6 },
  interpretation: { fontSize: 14, color: "#eee", lineHeight: 1.55 },

  // Plain-English TL;DR — visually leads the card. Left border + slightly
  // larger type so it's the first thing the eye lands on.
  tldrWrap: { marginBottom: 14, padding: "14px 16px", background: "#0c1220", borderLeft: "3px solid #60a5fa" },
  tldrText: { fontSize: 16, color: "#eaf2ff", lineHeight: 1.55 },

  // Visual ASCII flow — monospace, dark background, let the arrows breathe.
  visualFlowWrap: { marginTop: 12, padding: "12px 14px", background: "#0a0a0a", border: "1px solid #2a2a2a" },
  visualFlowLabel: { fontSize: 10, fontWeight: 700, color: "#888", letterSpacing: 2, textTransform: "uppercase", marginBottom: 8 },
  visualFlow: { fontSize: 12, color: "#fbbf24", lineHeight: 1.5, margin: 0, fontFamily: "ui-monospace, monospace", whiteSpace: "pre-wrap" as const, overflowX: "auto" as const },

  // "Is this illegal?" — green/neutral border to reassure reader this is
  // legally-scandalous-but-legal, not a crime allegation.
  legalityWrap: { marginTop: 12, padding: "12px 14px", background: "#0f1a10", border: "1px solid #16a34a" },
  legalityLabel: { fontSize: 10, fontWeight: 700, color: "#4ade80", letterSpacing: 2, textTransform: "uppercase", marginBottom: 6 },
  legality: { fontSize: 14, color: "#eee", lineHeight: 1.55 },

  // "Why should I care?" — soft neutral callout; stakes, not alarm.
  whyCareWrap: { marginTop: 12, padding: "12px 14px", background: "#11121a", border: "1px solid #6366f1" },
  whyCareLabel: { fontSize: 10, fontWeight: 700, color: "#a5b4fc", letterSpacing: 2, textTransform: "uppercase", marginBottom: 6 },
  whyCare: { fontSize: 14, color: "#eee", lineHeight: 1.55 },

  // Promoted "Who is X?" — framed like the rest of "Who these are" but
  // more prominent type.
  whoIsLeadWrap: { marginTop: 14, padding: "12px 14px", background: "#0f0f0f", border: "1px solid #fbbf24" },
  whoIsLeadLabel: { fontSize: 12, fontWeight: 700, color: "#fbbf24", letterSpacing: 1, marginBottom: 6 },
  whoIsLead: { fontSize: 14, color: "#eaeaea", lineHeight: 1.55 },

  // "How to use this" collapsible help panel — lives above the input,
  // default collapsed so it doesn't dominate the page for repeat users.
  howtoDetails: { marginTop: 8, marginBottom: 16, padding: "8px 12px", background: "#0d0d0d", border: "1px solid #2a2a2a" },
  howtoSummary: { cursor: "pointer", fontSize: 13, color: "#aaa", fontWeight: 600, letterSpacing: 0.3, userSelect: "none" as const, padding: "4px 0" },
  howtoBody: { marginTop: 10, paddingTop: 10, borderTop: "1px solid #222", fontSize: 13, color: "#ccc", lineHeight: 1.6 },
  howtoSection: { marginBottom: 14 },
  howtoHeading: { fontSize: 11, fontWeight: 700, color: "#fbbf24", letterSpacing: 1.5, textTransform: "uppercase" as const, marginBottom: 6 },
  howtoList: { margin: "6px 0 0 18px", padding: 0 },

  // Side-by-side comparison table. Three columns: metric label + two
  // entity-value columns. Alternating row backgrounds for easy scanning.
  // Pedagogically the point is to make symmetry (or asymmetry) visible
  // in one glance — e.g. Sixteen Thirty Fund and Marble Freedom Trust
  // as structural mirrors.
  compareWrap: { marginTop: 14, border: "1px solid #333", background: "#0a0a0a" },
  compareHeadRow: { display: "grid", gridTemplateColumns: "200px 1fr 1fr", borderBottom: "2px solid #fbbf24" },
  compareMetricCell: { padding: "10px 14px", background: "#1a1a1a" },
  compareEntityCell: { padding: "10px 14px", fontSize: 15, fontWeight: 700, color: "#fbbf24", borderLeft: "1px solid #333" },
  compareRow: { display: "grid", gridTemplateColumns: "200px 1fr 1fr" },
  compareMetricLabel: { padding: "10px 14px", fontSize: 12, color: "#888", fontWeight: 600, textTransform: "uppercase" as const, letterSpacing: 0.5, borderRight: "1px solid #222" },
  compareValueCell: { padding: "10px 14px", fontSize: 14, color: "#eaeaea", borderLeft: "1px solid #222" },

  // Empty-result rescue — friendly off-ramp when a query finds nothing.
  emptyRescue: { marginTop: 12, padding: "14px 16px", background: "#0d0d0d", border: "1px solid #2a2a2a" },
  emptyRescueHeading: { fontSize: 15, color: "#fbbf24", fontWeight: 700, marginBottom: 10 },
  emptyRescueBody: { fontSize: 13, color: "#ccc", lineHeight: 1.6 },
  emptyRescueList: { margin: "8px 0 12px 18px", padding: 0 },
  emptyRescueTryBlock: { marginTop: 12, paddingTop: 10, borderTop: "1px solid #222" },
  emptyRescueChipsRow: { display: "flex", flexWrap: "wrap", gap: 6, marginTop: 6 },

  caveatsWrap: { marginTop: 12, padding: "10px 14px", background: "#1a0c0c", border: "1px solid #e63946" },
  caveatsLabel: { fontSize: 10, fontWeight: 700, color: "#e63946", letterSpacing: 2, textTransform: "uppercase", marginBottom: 6 },
  caveatItem: { fontSize: 13, color: "#ddd", lineHeight: 1.55, marginBottom: 4 },

  followWrap: { marginTop: 14 },
  followLabel: { fontSize: 10, fontWeight: 700, color: "#888", letterSpacing: 2, textTransform: "uppercase", marginBottom: 6 },
  followChipsRow: { display: "flex", flexWrap: "wrap", gap: 6 },
  followChip: { fontSize: 12, padding: "6px 10px", background: "#1d4ed8", color: "#fff", border: "none", cursor: "pointer", fontFamily: "inherit" },

  citeWrap: { marginTop: 14, padding: "10px 14px", background: "#0f0f0f", border: "1px solid #2a2a2a", position: "relative" },
  citeLabel: { fontSize: 10, fontWeight: 700, color: "#888", letterSpacing: 2, textTransform: "uppercase", marginBottom: 6 },
  citeText: { fontSize: 13, color: "#ccc", lineHeight: 1.55, fontFamily: "ui-monospace, monospace", whiteSpace: "pre-wrap" as const, paddingRight: 60 },
  citeBtn: { position: "absolute" as const, top: 8, right: 8, fontSize: 11, padding: "4px 10px", background: "#fbbf24", color: "#111", border: "none", cursor: "pointer", fontWeight: 700 },
  tableWrap: { overflowX: "auto" },
  table: { width: "100%", borderCollapse: "collapse", fontSize: 12 },
  th: { textAlign: "left", padding: "6px 8px", background: "#222", color: "#aaa", fontWeight: 600, fontSize: 11, textTransform: "uppercase", letterSpacing: 1 },
  td: { padding: "6px 8px", borderBottom: "1px solid #222", color: "#ddd" },
  tdRight: { textAlign: "right", fontFamily: "ui-monospace, monospace", fontWeight: 700 },
  tdBold: { fontWeight: 600, color: "#fff" },
  trEven: { background: "#181818" },
  empty: { color: "#777", textAlign: "center", padding: 20 },
  more: { color: "#666", fontSize: 11, marginTop: 8, textAlign: "center" },
  histWrap: { marginTop: 24, borderTop: "1px solid #222", paddingTop: 16 },
  histItem: {
    display: "block",
    width: "100%",
    textAlign: "left",
    background: "transparent",
    border: "none",
    color: "#888",
    fontSize: 12,
    padding: "4px 0",
    cursor: "pointer",
    fontFamily: "inherit",
  },
  histMeta: { color: "#555" },
}
