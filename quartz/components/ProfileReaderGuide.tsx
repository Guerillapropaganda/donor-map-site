import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"

/**
 * ProfileReaderGuide — "What am I looking at?" callout for normies
 *
 * Sits between HeroContradiction and the tabs on every profile page.
 * Type-aware: politicians, donors, corporations, PACs, think-tanks, and
 * lobbying firms each get their own copy. Collapsed by default after the
 * first visit (localStorage gated). Click to expand inline — not a modal.
 *
 * Design per David: assume the reader arrived angry, not curious. Tell
 * them *what* quickly, not *why they should care*. Brutalist aesthetic —
 * no welcome popup, no tour overlay, no hand-holding.
 */

const SUPPORTED_TYPES = new Set([
  "politician", "state-politician", "local-politician",
  "donor", "corporation", "pac", "think-tank", "lobbying-firm",
])

type GuideCopy = {
  headline: string
  summary: string
  tabsLabel: string
  tabs: Array<{ name: string; what: string }>
  closer: string
}

function copyForType(type: string): GuideCopy {
  const t = type.toLowerCase()
  if (t.startsWith("state-") || t.startsWith("local-") || t === "politician") {
    return {
      headline: "A politician profile.",
      summary: "Scroll to see who funds them, how they vote, and the gap between the two.",
      tabsLabel: "THE TABS",
      tabs: [
        { name: "Overview", what: "the thesis in two minutes" },
        { name: "The Money", what: "every tracked donor, ranked by amount" },
        { name: "Key Votes", what: "how they actually voted on the bills that mattered" },
        { name: "Analysis", what: "the class lens — who wins, who loses" },
        { name: "Timeline", what: "dated receipts across their career" },
        { name: "Sources", what: "every claim traces back to a document you can click" },
      ],
      closer: "Right sidebar: live donor graph. Yellow nodes = direct money. Red = political opposition. Click any node to jump to that profile.",
    }
  }
  if (t === "donor" || t === "corporation" || t === "pac") {
    return {
      headline: t === "pac" ? "A political committee profile." : t === "corporation" ? "A corporation profile." : "A donor profile.",
      summary: "Scroll to see who they fund on both sides, what policy they got in return, and how the money moves.",
      tabsLabel: "THE TABS",
      tabs: [
        { name: "Overview", what: "the thesis in two minutes" },
        { name: "The Money", what: "politicians they fund, ranked by amount" },
        { name: "Policy Wins", what: "what they paid for and what they got" },
        { name: "Analysis", what: "the class lens — whose interests they serve" },
        { name: "Timeline", what: "dated receipts, cycle by cycle" },
        { name: "Sources", what: "every claim traces back to a document you can click" },
      ],
      closer: "Right sidebar: shared-donor network. See which politicians receive money from the same people.",
    }
  }
  if (t === "think-tank" || t === "lobbying-firm") {
    return {
      headline: t === "think-tank" ? "A think tank profile." : "A lobbying firm profile.",
      summary: "Scroll to see who funds them, which policies they push, and which politicians they staff or advise.",
      tabsLabel: "THE TABS",
      tabs: [
        { name: "Overview", what: "the thesis in two minutes" },
        { name: "The Money", what: "funders ranked by amount" },
        { name: "Policy Reach", what: "bills and regulations they've touched" },
        { name: "Analysis", what: "the class lens — whose interests they serve" },
        { name: "Timeline", what: "dated activity" },
        { name: "Sources", what: "every claim traces back to a document you can click" },
      ],
      closer: "Right sidebar: staffing and policy network.",
    }
  }
  // Fallback — still give normies *something*
  return {
    headline: "A profile.",
    summary: "Scroll for the money, the record, and the gap between what they say and what they do.",
    tabsLabel: "THE TABS",
    tabs: [
      { name: "Overview", what: "the thesis in two minutes" },
      { name: "The Money", what: "every tracked dollar" },
      { name: "Analysis", what: "the class lens" },
      { name: "Timeline", what: "dated receipts" },
      { name: "Sources", what: "every claim traces back to a document you can click" },
    ],
    closer: "Right sidebar: connections network.",
  }
}

const ProfileReaderGuide: QuartzComponent = ({ fileData }: QuartzComponentProps) => {
  const fm = fileData.frontmatter
  if (!fm) return null

  const type = String(fm.type ?? "")
  if (!SUPPORTED_TYPES.has(type)) return null

  const copy = copyForType(type)

  return (
    <div class="prg-guide" data-guide-type={type}>
      <div class="prg-header">
        <span class="prg-label">WHAT AM I LOOKING AT?</span>
        <button class="prg-toggle" aria-expanded="false" aria-label="Expand reader guide">
          <span class="prg-toggle-icon">▼</span>
        </button>
      </div>
      <div class="prg-summary">
        <strong>{copy.headline}</strong> {copy.summary}
      </div>
      <div class="prg-details" hidden>
        <div class="prg-details-label">{copy.tabsLabel}</div>
        <ul class="prg-tabs-list">
          {copy.tabs.map((t) => (
            <li class="prg-tab-row">
              <span class="prg-tab-name">{t.name}</span>
              <span class="prg-tab-dash">—</span>
              <span class="prg-tab-what">{t.what}</span>
            </li>
          ))}
        </ul>
        <div class="prg-closer">{copy.closer}</div>
      </div>
    </div>
  )
}

ProfileReaderGuide.afterDOMLoaded = `
(function() {
  var STORAGE_KEY = 'donormap:reader-guide-seen';
  function wireGuide() {
    var guide = document.querySelector('.prg-guide');
    if (!guide || guide.dataset.wired === 'true') return;
    guide.dataset.wired = 'true';

    var toggle = guide.querySelector('.prg-toggle');
    var details = guide.querySelector('.prg-details');
    var icon = guide.querySelector('.prg-toggle-icon');
    if (!toggle || !details || !icon) return;

    // First-time visitors see the guide expanded. Repeat readers see it
    // collapsed (they already know how to read the page).
    var seen = false;
    try { seen = localStorage.getItem(STORAGE_KEY) === '1'; } catch(e) {}
    if (!seen) {
      details.hidden = false;
      toggle.setAttribute('aria-expanded', 'true');
      icon.textContent = '▲';
    }

    toggle.addEventListener('click', function() {
      var nowOpen = details.hidden;
      details.hidden = !nowOpen;
      toggle.setAttribute('aria-expanded', nowOpen ? 'true' : 'false');
      icon.textContent = nowOpen ? '▲' : '▼';
      if (nowOpen) {
        try { localStorage.setItem(STORAGE_KEY, '1'); } catch(e) {}
      }
    });

    // Clicking the summary bar itself also toggles — bigger hit target
    var summary = guide.querySelector('.prg-summary');
    if (summary) {
      summary.style.cursor = 'pointer';
      summary.addEventListener('click', function() { toggle.click(); });
    }
  }
  wireGuide();
  document.addEventListener('nav', function() { setTimeout(wireGuide, 100); });
})();
`

ProfileReaderGuide.css = `
.prg-guide {
  border: 2px solid #0a0a0a;
  border-left: 6px solid #fbbf24;
  background: #fff;
  padding: 12px 16px;
  margin: 0 0 20px;
  font-family: "Space Grotesk", sans-serif;
}

.prg-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.prg-label {
  font-family: "Space Mono", monospace;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.2em;
  color: #0a0a0a;
  text-transform: uppercase;
}

.prg-toggle {
  background: none;
  border: 1px solid #0a0a0a;
  width: 24px;
  height: 24px;
  font-size: 10px;
  font-family: "Space Mono", monospace;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  color: #0a0a0a;
  transition: background 0.15s;
}

.prg-toggle:hover {
  background: #fbbf24;
}

.prg-toggle-icon {
  line-height: 1;
}

.prg-summary {
  font-size: 15px;
  line-height: 1.4;
  color: #0a0a0a;
}

.prg-summary strong {
  font-weight: 800;
}

.prg-details {
  margin-top: 14px;
  padding-top: 12px;
  border-top: 1px solid #e5e5e5;
}

.prg-details-label {
  font-family: "Space Mono", monospace;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.2em;
  color: #666;
  text-transform: uppercase;
  margin-bottom: 8px;
}

.prg-tabs-list {
  list-style: none;
  padding: 0;
  margin: 0 0 12px;
}

.prg-tab-row {
  font-size: 13px;
  line-height: 1.5;
  padding: 3px 0;
  color: #222;
}

.prg-tab-name {
  font-weight: 700;
  color: #0a0a0a;
}

.prg-tab-dash {
  margin: 0 6px;
  color: #999;
}

.prg-tab-what {
  color: #555;
}

.prg-closer {
  font-size: 13px;
  line-height: 1.5;
  color: #444;
  padding-top: 8px;
  border-top: 1px dashed #e5e5e5;
}

@media (max-width: 600px) {
  .prg-guide {
    padding: 10px 12px;
  }
  .prg-summary {
    font-size: 14px;
  }
  .prg-tab-row {
    font-size: 12px;
  }
}
`

export default (() => ProfileReaderGuide) satisfies QuartzComponentConstructor
