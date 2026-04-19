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

import { useState } from "react"

type Row = Record<string, unknown>

interface AskResponse {
  question: string
  intent: string
  resolved_title?: string | null
  resolved_title_2?: string | null
  did_you_mean?: string[]
  total: number
  rows: Row[]
  answer?: string
  bullets?: string[]
  summary?: string
  note?: string
  error?: string
}

// Minimal bold renderer: splits text on `**...**` and wraps in <strong>
function renderRichText(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*)/g)
  return parts.map((p, i) => {
    if (p.startsWith("**") && p.endsWith("**")) return <strong key={i}>{p.slice(2, -2)}</strong>
    return <span key={i}>{p}</span>
  })
}

const EXAMPLES = [
  "who funds marble freedom trust",
  "tell me about leonard leo",
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

  async function submit(q: string) {
    if (!q.trim()) return
    setLoading(true)
    setResult(null)
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

  return (
    <div style={styles.wrap}>
      <h1 style={styles.h1}>Ask</h1>
      <p style={styles.hint}>
        Plain-English donor-map queries. Pattern-matched to the relationship edge store and IRS 990 data. Not fuzzy AI — matches specific question shapes.
      </p>

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

      {result && <ResultCard r={result} />}

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

function ResultCard({ r }: { r: AskResponse }) {
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

  return (
    <div style={styles.card}>
      <div style={styles.cardHead}>
        <div style={styles.cardLabel}>{r.intent.replace(/_/g, " ").toUpperCase()}</div>

        {r.answer && <div style={styles.answer}>{renderRichText(r.answer)}</div>}

        {r.bullets && r.bullets.length > 0 && (
          <ul style={styles.bullets}>
            {r.bullets.map((b, i) => (
              <li key={i} style={styles.bulletItem}>{renderRichText(b)}</li>
            ))}
          </ul>
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

      {r.rows.length > 0 && (
        <details style={styles.detailsWrap}>
          <summary style={styles.detailsSummary}>
            Evidence ({r.rows.length} row{r.rows.length === 1 ? "" : "s"})
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

      {r.rows.length === 0 && !r.note && !r.answer && (
        <div style={styles.empty}>No rows matched.</div>
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
  bullets: { margin: "6px 0 12px 0", padding: "0 0 0 20px", color: "#ddd" },
  bulletItem: { fontSize: 14, lineHeight: 1.55, marginBottom: 4 },
  resolved: { fontSize: 12, color: "#888", marginBottom: 4 },
  summary: { fontSize: 12, color: "#777", marginTop: 8, fontStyle: "italic" },
  note: { fontSize: 13, color: "#ccc", fontStyle: "italic" },
  detailsWrap: { marginTop: 12, borderTop: "1px solid #222", paddingTop: 8 },
  detailsSummary: { cursor: "pointer", fontSize: 11, color: "#888", textTransform: "uppercase", letterSpacing: 1, userSelect: "none", marginBottom: 8 },
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
