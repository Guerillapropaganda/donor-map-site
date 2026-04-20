import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"

/**
 * AskPanel — public-site mirror of the ops /ask query UI.
 *
 * Renders a Quartz-native Ask page at content/Ask.md with:
 *   - question input + submit + share button
 *   - collapsible "How to use this" primer
 *   - dynamically-populated result container
 *
 * Client behavior (in scripts/askPanel.inline.ts):
 *   - POST /api/ask with { question }
 *   - Render the layered response: plain_english → visual_flow →
 *     is_this_legal → why_matters → interpretation → caveats → context
 *     → follow-ups → citation → compare table → evidence rows
 *   - Glossary tooltips on hover
 *   - Shareable URL via ?q= query param + Share button
 *   - CSV export for evidence rows
 *
 * Backend: the inline script reads window.ASK_API_URL. Default is
 * http://localhost:3333/api/ask — i.e. the running ops dev server.
 * Override at build time by setting ASK_API_URL env var (picked up by
 * the .md page via a frontmatter or script override).
 *
 * Styling: cream background + yellow accents + brutalist. Matches the
 * public site's design system rather than the ops dark theme.
 */
const AskPanel: QuartzComponent = ({ fileData }: QuartzComponentProps) => {
  const slug = String(fileData.slug ?? "").toLowerCase()
  // Only render on the /Ask page — the component is dropped into the
  // shared afterBody list, so it has to guard its own rendering.
  if (slug !== "ask") return null

  return (
    <div class="ask-panel">
      <div class="ask-header">
        <h1 class="ask-h1">Ask</h1>
        <p class="ask-hint">
          Plain-English queries against the donor map's relationship edge store and IRS 990 data.
          Not a chatbot — pattern-matched to specific question shapes. See the "How to use this"
          panel below for phrasings that work.
        </p>
      </div>

      <details class="ask-howto">
        <summary class="ask-howto-summary">How to use this — click to expand</summary>
        <div class="ask-howto-body">
          <div class="ask-howto-section">
            <div class="ask-howto-heading">What this is</div>
            <p>
              A query engine over a structured database of political money flows. Every answer
              traces back to a specific edge record (donor → recipient, with dollar amount and
              source). Two audiences served: <strong>readers</strong> who want a plain-English
              explainer, and <strong>researchers</strong> who want cite-ready paragraphs and source
              IDs. Read what makes sense, ignore the rest.
            </p>
          </div>

          <div class="ask-howto-section">
            <div class="ask-howto-heading">Question shapes that work</div>
            <ul class="ask-howto-list">
              <li><strong>who is X</strong> / <strong>tell me about X</strong> — profile snapshot</li>
              <li><strong>who funds X</strong> — donors to X, ranked by amount</li>
              <li><strong>where does X's money go</strong> — recipients of X, ranked</li>
              <li><strong>does X fund Y</strong> / <strong>money chain from X to Y</strong> — traces the path (up to 3 hops) with a visual flow diagram</li>
              <li><strong>compare X vs Y</strong> — side-by-side structural comparison</li>
              <li><strong>what boards is X on</strong> — director/trustee affiliations</li>
              <li><strong>top donors</strong> / <strong>top super pacs</strong> / <strong>top dafs</strong> / <strong>top politicians</strong> — leaderboards</li>
              <li><strong>cross party donors</strong> — entities that fund both sides</li>
              <li><strong>X voting record</strong> — for federal politicians only</li>
            </ul>
          </div>

          <div class="ask-howto-section">
            <div class="ask-howto-heading">How to read a result</div>
            <ol class="ask-howto-list">
              <li><strong>In plain English</strong> (blue) — one-sentence translation. Start here.</li>
              <li><strong>The trail, visualized</strong> — arrows with dollar amounts</li>
              <li><strong>Is this illegal?</strong> (green) — preempts the first question</li>
              <li><strong>Why should I care?</strong> (indigo) — stakes, not mechanics</li>
              <li><strong>What this means</strong> (yellow) — technical explanation</li>
              <li><strong>Who these are</strong> — one-sentence glosses per entity (click a name to open its profile)</li>
              <li><strong>Follow-up questions</strong> — click to pivot</li>
              <li><strong>Cite-ready paragraph</strong> — copy/paste for articles</li>
              <li><strong>Evidence</strong> — collapsible raw rows with a CSV download</li>
            </ol>
          </div>

          <div class="ask-howto-section">
            <div class="ask-howto-heading">Jargon (hover underlined terms for definitions)</div>
            <ul class="ask-howto-list">
              <li><strong>501(c)(4)</strong> — nonprofit that can spend on politics and keep donors secret. The main dark-money vehicle.</li>
              <li><strong>DAF</strong> — donor-advised fund. An anonymous charity middleman that legally erases the original donor's identity.</li>
              <li><strong>Super PAC</strong> — unlimited fundraising, must disclose donors, can't coordinate with campaigns.</li>
              <li><strong>EIN</strong> — 9-digit federal tax ID for a nonprofit.</li>
              <li><strong>Schedule I</strong> — the IRS form section listing grants a nonprofit gave, with amounts.</li>
            </ul>
          </div>

          <div class="ask-howto-section">
            <div class="ask-howto-heading">If a query doesn't work</div>
            <p>
              Try rephrasing using one of the shapes above. Names are sensitive to spelling — try
              "tell me about [exact name]" first to see how the system has an entity registered.
              Acronyms (MFT, JCN, DCCC) usually resolve; very short strings often don't.
            </p>
          </div>
        </div>
      </details>

      <div class="ask-input-row">
        <input
          type="text"
          id="ask-input"
          class="ask-input"
          placeholder="e.g. who funds marble freedom trust"
          autocomplete="off"
        />
        <button id="ask-submit" class="ask-submit-btn">Ask</button>
        <button id="ask-share" class="ask-share-btn" style="display:none" title="Copy a shareable link to this query">Share</button>
      </div>

      <div class="ask-examples">
        <span class="ask-examples-label">Try:</span>
        <button class="ask-example-btn" data-q="who funds marble freedom trust">who funds marble freedom trust</button>
        <button class="ask-example-btn" data-q="tell me about leonard leo">tell me about leonard leo</button>
        <button class="ask-example-btn" data-q="compare Sixteen Thirty Fund vs Marble Freedom Trust">compare Sixteen Thirty Fund vs Marble Freedom Trust</button>
        <button class="ask-example-btn" data-q="does marble freedom trust fund the 85 fund">does marble freedom trust fund the 85 fund</button>
        <button class="ask-example-btn" data-q="elon musk funds donald trump">elon musk funds donald trump</button>
        <button class="ask-example-btn" data-q="top donors">top donors</button>
        <button class="ask-example-btn" data-q="top super pacs">top super pacs</button>
        <button class="ask-example-btn" data-q="top dafs">top dafs</button>
        <button class="ask-example-btn" data-q="cross party donors">cross party donors</button>
      </div>

      <div id="ask-loading" class="ask-loading" style="display:none">Querying…</div>
      <div id="ask-result" class="ask-result"></div>
    </div>
  )
}

// Client-side behavior — big enough to live in its own file.
// See quartz/components/scripts/askPanel.inline.ts for the logic.
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore — Quartz convention for raw-text script imports
import askPanelScript from "./scripts/askPanel.inline"
AskPanel.afterDOMLoaded = askPanelScript

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore — Quartz convention for raw-text SCSS imports
import askPanelStyle from "./styles/askPanel.scss"
AskPanel.css = askPanelStyle

export default (() => AskPanel) satisfies QuartzComponentConstructor
