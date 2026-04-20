/**
 * askPanel.inline.ts — client-side logic for the public Ask page.
 *
 * Mirrors the ops /ask behavior: POST to a backend, render the layered
 * response. Backend URL is configurable via window.ASK_API_URL; defaults
 * to http://localhost:3333/api/ask (the running ops dev server).
 *
 * Keep vanilla — no framework. Runs directly in the browser as emitted
 * text. Quartz's afterDOMLoaded convention wraps this in a function call.
 */

// Shape the backend returns. Matches ops/src/app/api/ask/route.ts AskResult.
interface AskResponse {
  question: string
  intent: string
  label?: string
  resolved_title?: string | null
  resolved_title_2?: string | null
  did_you_mean?: string[]
  total: number
  rows: Array<Record<string, unknown>>
  answer?: string
  bullets?: string[]
  interpretation?: string
  caveats?: string[]
  context?: Array<{ name: string; gloss: string; blurb?: string; profile_path?: string }>
  follow_ups?: string[]
  citation?: string
  summary?: string
  note?: string
  error?: string
  plain_english?: string
  visual_flow?: string
  is_this_legal?: string
  why_matters?: string
  who_is_lead?: { name: string; oneLiner: string }
  empty_reason?: string
}

declare global {
  interface Window {
    ASK_API_URL?: string
  }
}

// Glossary with plain-English hover definitions. Underlined term in the
// rendered text gets a tooltip. Lowercased keys for case-insensitive match.
const GLOSSARY: Record<string, string> = {
  "501(c)(4)":
    "A type of nonprofit that's allowed to spend money on politics AND keep its donors secret. The main 'dark money' vehicle in US politics.",
  "501(c)(3)":
    "A tax-deductible charity. Allowed to do limited political work. Donor names are usually private.",
  "527":
    "A political organization that MUST publicly disclose its donors. Includes super PACs and party committees.",
  DAF:
    "Donor-Advised Fund. An anonymous checking account for charity: a rich person deposits money, later tells the fund who to pay. The public record only shows the DAF as the giver.",
  "donor-advised fund":
    "An anonymous checking account for charity: a rich person deposits money, later tells the fund who to pay. The public record only shows the DAF as the giver.",
  "Super PAC":
    "An independent-expenditure committee. Can accept and spend unlimited money on political ads, but can't coordinate with a campaign. Must disclose donors to the FEC.",
  "super pac":
    "An independent-expenditure committee. Can accept and spend unlimited money on political ads, but can't coordinate with a campaign. Must disclose donors to the FEC.",
  "dark-money":
    "Political spending where the original source of the money is not publicly disclosed, typically via 501(c)(4)s and shell LLCs.",
  "dark money":
    "Political spending where the original source of the money is not publicly disclosed, typically via 501(c)(4)s and shell LLCs.",
  EIN:
    "Employer Identification Number. A 9-digit federal tax ID. Every nonprofit or PAC has one.",
  "Schedule I":
    "The section of IRS Form 990 listing every grant a nonprofit gave to other organizations, with amounts and recipient names.",
  "independent-expenditure":
    "Political-ad spending that is NOT coordinated with any candidate campaign. Allows unlimited amounts.",
  "ie-support":
    "Independent-expenditure spending in SUPPORT of a candidate — usually ads saying nice things about them.",
  "ie-oppose":
    "Independent-expenditure spending AGAINST a candidate — attack ads.",
}

// Escape HTML for safe insertion.
function esc(s: string): string {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}

// Render markdown-ish rich text: **bold** and *italic*. The API emits
// these inline markers in plain_english, answer, etc.
function renderRichText(text: string): string {
  let out = esc(text)
  out = out.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
  out = out.replace(/\*([^*]+)\*/g, "<em>$1</em>")
  return out
}

// Wrap glossary terms in <span class="ask-gloss" data-def="..."> so CSS
// tooltips can show their definition on hover. Run AFTER renderRichText
// so the existing HTML doesn't get tokenized.
function decorateGlossary(html: string): string {
  for (const term of Object.keys(GLOSSARY)) {
    const def = GLOSSARY[term]
    // Build a case-insensitive regex that matches the term as a whole
    // word and doesn't already sit inside an HTML attribute.
    const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
    const re = new RegExp(`(?<![A-Za-z0-9\\-])(${escaped})(?![A-Za-z0-9\\-])`, "gi")
    html = html.replace(re, (match) => `<span class="ask-gloss" data-def="${esc(def)}">${match}</span>`)
  }
  return html
}

function renderAndGloss(text: string): string {
  return decorateGlossary(renderRichText(text))
}

// Turn a profile_path into a Quartz relative URL. Strips the content/
// prefix + .md suffix, slugifies the rest in the way Quartz does at
// build time. For now we use a simple heuristic — Quartz's path resolver
// converts slashes to "/", strips spaces to nothing/hyphens, lowercases
// — matching that exactly would require importing Quartz util, so we
// keep it conservative: just strip content/ and .md, leave as-is.
// Users clicking a broken deep-link will fall back to manual navigation.
function profileHref(profile_path?: string): string | null {
  if (!profile_path) return null
  // content/Foo/Bar.md → /Foo/Bar
  let rel = profile_path.replace(/\\/g, "/")
  if (rel.startsWith("content/")) rel = rel.slice(8)
  if (rel.endsWith(".md")) rel = rel.slice(0, -3)
  return "/" + rel
}

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

// CSV export. Mirrors the ops page's downloadCsv.
function downloadCsv(r: AskResponse) {
  if (!r.rows || r.rows.length === 0) return
  const preferred = ["name", "from", "to", "amount", "cycle", "source", "role", "type"]
  const allKeys = new Set<string>()
  for (const row of r.rows) for (const k of Object.keys(row)) allKeys.add(k)
  const ordered: string[] = []
  for (const p of preferred) if (allKeys.has(p)) { ordered.push(p); allKeys.delete(p) }
  for (const k of [...allKeys].sort()) ordered.push(k)

  const escCsv = (v: unknown): string => {
    if (v == null) return ""
    const s = typeof v === "object" ? JSON.stringify(v) : String(v)
    if (/[",\n]/.test(s)) return '"' + s.replace(/"/g, '""') + '"'
    return s
  }
  const lines = [ordered.join(",")]
  for (const row of r.rows) lines.push(ordered.map((k) => escCsv((row as any)[k])).join(","))

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

function initAskPanel() {
  const panel = document.querySelector(".ask-panel") as HTMLElement | null
  if (!panel) return

  const _input = document.getElementById("ask-input") as HTMLInputElement | null
  const _submit = document.getElementById("ask-submit") as HTMLButtonElement | null
  const _share = document.getElementById("ask-share") as HTMLButtonElement | null
  const _loading = document.getElementById("ask-loading") as HTMLElement | null
  const _resultEl = document.getElementById("ask-result") as HTMLElement | null
  if (!_input || !_submit || !_resultEl || !_loading) return
  // Non-null bindings after guard — TS doesn't propagate narrowing into
  // nested closures, so we rebind locally.
  const input: HTMLInputElement = _input
  const submit: HTMLButtonElement = _submit
  const share: HTMLButtonElement | null = _share
  const loading: HTMLElement = _loading
  const resultEl: HTMLElement = _resultEl

  let currentResult: AskResponse | null = null

  const API_URL = window.ASK_API_URL || "http://localhost:3333/api/ask"

  function setShareVisible(v: boolean) {
    if (share) share.style.display = v ? "inline-block" : "none"
  }

  async function submitQuestion(q: string) {
    if (!q.trim()) return
    loading.style.display = "block"
    resultEl.innerHTML = ""
    currentResult = null
    setShareVisible(false)

    // Write to URL so page is shareable / bookmarkable.
    try {
      const u = new URL(window.location.href)
      u.searchParams.set("q", q)
      window.history.replaceState({}, "", u.toString())
    } catch {}

    try {
      const res = await fetch(API_URL, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ question: q }),
      })
      const json: AskResponse = await res.json()
      currentResult = json
      renderResult(json)
      if (!json.error) setShareVisible(true)
    } catch (err: any) {
      resultEl.innerHTML = `
        <div class="ask-card ask-error">
          <div class="ask-error-heading">Couldn't reach the Ask backend</div>
          <div class="ask-error-body">
            The Ask UI calls an API that's not currently reachable. In local development this is
            usually because the ops server isn't running. From the repo root:
            <pre>cd ops &amp;&amp; npm run dev</pre>
            and then try again. Error detail: <code>${esc(String(err?.message || err))}</code>
          </div>
        </div>`
    } finally {
      loading.style.display = "none"
    }
  }

  function renderResult(r: AskResponse) {
    if (r.error) {
      resultEl.innerHTML = `<div class="ask-card ask-error"><div class="ask-error-heading">Error</div><div class="ask-error-body">${esc(r.error)}</div></div>`
      return
    }

    const blocks: string[] = []
    blocks.push(`<div class="ask-card">`)
    if (r.label) blocks.push(`<div class="ask-card-label">${esc(r.label.toUpperCase())}</div>`)

    // 1. Plain-English TL;DR (blue accent)
    if (r.plain_english) {
      blocks.push(`<div class="ask-tldr">${renderAndGloss(r.plain_english)}</div>`)
    }

    // 2. Headline answer
    if (r.answer) {
      blocks.push(`<div class="ask-answer">${renderRichText(r.answer)}</div>`)
    }

    // 3. Bullets (paths, key data points, etc.)
    if (r.bullets && r.bullets.length > 0) {
      blocks.push(`<ul class="ask-bullets">`)
      for (const b of r.bullets) blocks.push(`<li>${renderAndGloss(b)}</li>`)
      blocks.push(`</ul>`)
    }

    // 4. Visual flow (ASCII)
    if (r.visual_flow) {
      blocks.push(`<div class="ask-visual-flow-wrap">
        <div class="ask-section-label">The trail, visualized</div>
        <pre class="ask-visual-flow">${esc(r.visual_flow)}</pre>
      </div>`)
    }

    // 5. Is this legal? (green)
    if (r.is_this_legal) {
      blocks.push(`<div class="ask-legality">
        <div class="ask-section-label ask-legality-label">Is this illegal?</div>
        <div>${renderAndGloss(r.is_this_legal)}</div>
      </div>`)
    }

    // 6. Why should I care? (indigo)
    if (r.why_matters) {
      blocks.push(`<div class="ask-why-care">
        <div class="ask-section-label ask-why-care-label">Why should I care?</div>
        <div>${renderAndGloss(r.why_matters)}</div>
      </div>`)
    }

    // 7. Interpretation / "What this means" (yellow)
    if (r.interpretation) {
      blocks.push(`<div class="ask-interpretation">
        <div class="ask-section-label ask-interpretation-label">What this means</div>
        <div>${renderAndGloss(r.interpretation)}</div>
      </div>`)
    }

    // 8. Caveats (red)
    if (r.caveats && r.caveats.length > 0) {
      blocks.push(`<div class="ask-caveats">
        <div class="ask-section-label ask-caveats-label">Important caveat</div>`)
      for (const c of r.caveats) blocks.push(`<div>${renderAndGloss(c)}</div>`)
      blocks.push(`</div>`)
    }

    // 9. Compare intent — side-by-side table
    if (r.intent === "compare" && r.rows && r.rows.length > 0) {
      blocks.push(`<div class="ask-compare">
        <div class="ask-compare-head-row">
          <div class="ask-compare-metric-cell"></div>
          <div class="ask-compare-entity-cell">${esc(String(r.resolved_title || ""))}</div>
          <div class="ask-compare-entity-cell">${esc(String(r.resolved_title_2 || ""))}</div>
        </div>`)
      const rows = r.rows as Array<{ metric: string; a: string; b: string }>
      rows.forEach((row, i) => {
        const bgClass = i % 2 === 0 ? "ask-compare-row-even" : "ask-compare-row-odd"
        blocks.push(`<div class="ask-compare-row ${bgClass}">
          <div class="ask-compare-metric-label">${esc(row.metric)}</div>
          <div class="ask-compare-value-cell">${renderAndGloss(String(row.a))}</div>
          <div class="ask-compare-value-cell">${renderAndGloss(String(row.b))}</div>
        </div>`)
      })
      blocks.push(`</div>`)
    }

    // 10. Promoted "Who is X?" when backend identifies a lead operator
    if (r.who_is_lead) {
      blocks.push(`<div class="ask-who-is-lead">
        <div class="ask-who-is-lead-label">Who is ${esc(r.who_is_lead.name)}?</div>
        <div>${renderAndGloss(r.who_is_lead.oneLiner)}</div>
      </div>`)
    }

    // 11. Context — entity glosses with deep-link on the name
    if (r.context && r.context.length > 0) {
      blocks.push(`<div class="ask-context">
        <div class="ask-section-label">Who these are</div>`)
      for (const c of r.context) {
        const href = profileHref(c.profile_path)
        const nameHtml = href
          ? `<a class="ask-context-link" href="${esc(href)}">${esc(c.name)}</a>`
          : esc(c.name)
        blocks.push(`<div class="ask-context-item">
          <div class="ask-context-name">${nameHtml}</div>
          <div class="ask-context-gloss">${renderAndGloss(c.gloss)}</div>
          ${c.blurb ? `<div class="ask-context-blurb">${renderAndGloss(c.blurb)}</div>` : ""}
        </div>`)
      }
      blocks.push(`</div>`)
    }

    // 12. Follow-ups
    if (r.follow_ups && r.follow_ups.length > 0) {
      blocks.push(`<div class="ask-followups">
        <div class="ask-section-label">Follow-up questions</div>
        <div class="ask-followup-row">`)
      for (const q of r.follow_ups) {
        blocks.push(`<button class="ask-followup-chip" data-q="${esc(q)}">${esc(q)}</button>`)
      }
      blocks.push(`</div></div>`)
    }

    // 13. Citation
    if (r.citation) {
      blocks.push(`<div class="ask-citation">
        <div class="ask-section-label">Cite-ready paragraph</div>
        <div class="ask-citation-text">${esc(r.citation)}</div>
        <button class="ask-citation-copy" data-citation="${esc(r.citation)}">Copy</button>
      </div>`)
    }

    // 14. Empty-result rescue (API may also have populated plain_english,
    // but this fires if rows=0 and answer is also empty).
    if ((!r.rows || r.rows.length === 0) && !r.answer && !r.plain_english) {
      blocks.push(`<div class="ask-empty-rescue">
        <div class="ask-empty-rescue-heading">Nothing matched this query.</div>
        <div>A few possible reasons:
          <ul>
            <li><strong>Entity not in the index yet.</strong> Some profiles exist as articles but aren't searchable.</li>
            <li><strong>Name doesn't match exactly.</strong> Try the full registered name.</li>
            <li><strong>Query shape not recognized.</strong> Check the "How to use this" panel.</li>
            <li><strong>Data genuinely isn't there.</strong> Dark-money flows are often legally hidden.</li>
          </ul>
        </div>
        <div class="ask-empty-rescue-try">
          <strong>Queries that reliably work:</strong>
          <div class="ask-empty-rescue-row">
            <button class="ask-followup-chip" data-q="who funds marble freedom trust">who funds marble freedom trust</button>
            <button class="ask-followup-chip" data-q="tell me about leonard leo">tell me about leonard leo</button>
            <button class="ask-followup-chip" data-q="top donors">top donors</button>
          </div>
        </div>
      </div>`)
    }

    // 15. Evidence expander (non-compare)
    if (r.rows && r.rows.length > 0 && r.intent !== "compare") {
      blocks.push(`<details class="ask-evidence">
        <summary class="ask-evidence-summary">
          Evidence (${r.rows.length} row${r.rows.length === 1 ? "" : "s"})
          <button class="ask-evidence-csv" data-csv="1">Download CSV</button>
        </summary>
        <div class="ask-evidence-table-wrap">
          ${buildEvidenceTable(r.rows)}
        </div>
      </details>`)
    }

    blocks.push(`</div>`)
    resultEl.innerHTML = blocks.join("")

    // Wire up dynamic buttons (follow-ups, CSV, citation copy).
    resultEl.querySelectorAll<HTMLButtonElement>(".ask-followup-chip").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.preventDefault()
        const q = btn.getAttribute("data-q") || ""
        if (q) {
          input!.value = q
          submitQuestion(q)
        }
      })
    })
    resultEl.querySelectorAll<HTMLButtonElement>(".ask-evidence-csv").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.preventDefault()
        e.stopPropagation()
        if (currentResult) downloadCsv(currentResult)
      })
    })
    resultEl.querySelectorAll<HTMLButtonElement>(".ask-citation-copy").forEach((btn) => {
      btn.addEventListener("click", async (e) => {
        e.preventDefault()
        const c = btn.getAttribute("data-citation") || ""
        try {
          await navigator.clipboard.writeText(c)
          btn.textContent = "copied!"
          setTimeout(() => { btn.textContent = "Copy" }, 1500)
        } catch {
          btn.textContent = "copy failed"
          setTimeout(() => { btn.textContent = "Copy" }, 1500)
        }
      })
    })
  }

  function buildEvidenceTable(rows: Array<Record<string, unknown>>): string {
    if (rows.length === 0) return ""
    const preferred = ["name", "from", "to", "amount", "cycle", "source", "role", "type"]
    const allKeys = new Set<string>()
    for (const row of rows) for (const k of Object.keys(row)) allKeys.add(k)
    const ordered: string[] = []
    for (const p of preferred) if (allKeys.has(p)) { ordered.push(p); allKeys.delete(p) }
    for (const k of [...allKeys].sort()) ordered.push(k)

    const cap = rows.slice(0, 50)
    const head = `<thead><tr>${ordered.map((k) => `<th>${esc(k)}</th>`).join("")}</tr></thead>`
    const body = `<tbody>${cap.map((r, i) => `<tr class="${i % 2 === 0 ? "" : "ask-tr-alt"}">${ordered.map((k) => {
      const v = r[k]
      if (k === "amount" && typeof v === "number") return `<td class="ask-td-right">${esc(fmtUsd(v))}</td>`
      if (v == null) return `<td></td>`
      if (typeof v === "object") return `<td>${esc(JSON.stringify(v))}</td>`
      return `<td>${esc(String(v))}</td>`
    }).join("")}</tr>`).join("")}</tbody>`
    const more = rows.length > 50 ? `<div class="ask-evidence-more">… ${rows.length - 50} more rows not shown. Download CSV for full set.</div>` : ""
    return `<table class="ask-evidence-table">${head}${body}</table>${more}`
  }

  // Wire up static buttons
  submit.addEventListener("click", () => submitQuestion(input.value))
  input.addEventListener("keydown", (e) => {
    if ((e as KeyboardEvent).key === "Enter") submitQuestion(input.value)
  })
  if (share) {
    share.addEventListener("click", async () => {
      if (!currentResult) return
      const u = new URL(window.location.href)
      u.searchParams.set("q", currentResult.question)
      try {
        await navigator.clipboard.writeText(u.toString())
        share.textContent = "copied!"
        setTimeout(() => { share.textContent = "Share" }, 1500)
      } catch {
        share.textContent = "copy failed"
        setTimeout(() => { share.textContent = "Share" }, 1500)
      }
    })
  }
  panel.querySelectorAll<HTMLButtonElement>(".ask-example-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.preventDefault()
      const q = btn.getAttribute("data-q") || btn.textContent || ""
      if (q) {
        input.value = q
        submitQuestion(q)
      }
    })
  })

  // Auto-submit on page load if ?q= is present
  try {
    const startQ = new URL(window.location.href).searchParams.get("q")
    if (startQ && startQ.trim()) {
      input.value = startQ
      submitQuestion(startQ)
    }
  } catch {}
}

// Quartz wraps this file into a function body after DOM loaded.
initAskPanel()

export {}
