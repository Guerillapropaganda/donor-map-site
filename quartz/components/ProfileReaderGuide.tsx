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

  function setState(guide, open) {
    var toggle = guide.querySelector('.prg-toggle');
    var details = guide.querySelector('.prg-details');
    var icon = guide.querySelector('.prg-toggle-icon');
    if (!toggle || !details) return;
    if (open) {
      details.removeAttribute('hidden');
      details.style.display = 'block';
      toggle.setAttribute('aria-expanded', 'true');
      if (icon) icon.textContent = '▲';
      guide.classList.add('prg-open');
      try { localStorage.setItem(STORAGE_KEY, '1'); } catch(e) {}
    } else {
      details.setAttribute('hidden', '');
      details.style.display = 'none';
      toggle.setAttribute('aria-expanded', 'false');
      if (icon) icon.textContent = '▼';
      guide.classList.remove('prg-open');
    }
  }

  function initGuide() {
    var guide = document.querySelector('.prg-guide');
    if (!guide) return;
    // First-time visitors see expanded. Returning readers see collapsed.
    var seen = false;
    try { seen = localStorage.getItem(STORAGE_KEY) === '1'; } catch(e) {}
    setState(guide, !seen);
  }

  // Event delegation on document — survives SPA nav, reattaching to new
  // DOM instances without needing per-element wiring flags.
  if (!window.__prgDelegated) {
    window.__prgDelegated = true;
    document.addEventListener('click', function(e) {
      var target = e.target;
      if (!target || !target.closest) return;
      var hit = target.closest('.prg-toggle, .prg-summary, .prg-header');
      if (!hit) return;
      var guide = hit.closest('.prg-guide');
      if (!guide) return;
      e.preventDefault();
      e.stopPropagation();
      var isOpen = guide.classList.contains('prg-open');
      setState(guide, !isOpen);
    });
  }

  initGuide();
  document.addEventListener('nav', function() { setTimeout(initGuide, 100); });
})();
`

ProfileReaderGuide.css = `
.prg-guide {
  border: 2px solid #0a0a0a;
  background: #fbbf24;
  padding: 10px 12px;
  margin: 0 0 12px;
  font-family: "Inter", "Space Grotesk", sans-serif;
  position: relative;
  box-shadow: 3px 3px 0 #0a0a0a;
}

.prg-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  cursor: pointer;
  user-select: none;
}

.prg-label {
  font-family: "Inter", sans-serif;
  font-size: 10px;
  font-weight: 900;
  letter-spacing: 0.08em;
  color: #0a0a0a;
  text-transform: uppercase;
  line-height: 1;
}

.prg-toggle {
  background: #0a0a0a;
  border: 1.5px solid #0a0a0a;
  width: 20px;
  height: 20px;
  font-size: 9px;
  font-family: "Space Mono", monospace;
  font-weight: 700;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  color: #fbbf24;
  transition: all 0.15s;
  flex-shrink: 0;
}

.prg-toggle:hover {
  background: #fff;
  color: #0a0a0a;
}

.prg-guide.prg-open .prg-toggle {
  background: #fff;
  color: #0a0a0a;
}

.prg-toggle-icon {
  line-height: 1;
}

.prg-summary {
  font-family: "Inter", "Space Grotesk", sans-serif;
  font-size: 11px;
  line-height: 1.35;
  color: #0a0a0a;
  font-weight: 500;
  cursor: pointer;
  user-select: none;
  margin-top: 6px;
}

.prg-summary strong {
  font-weight: 900;
  letter-spacing: -0.01em;
  display: block;
  margin-bottom: 2px;
  font-size: 12px;
}

.prg-details {
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1.5px solid #0a0a0a;
}

.prg-details-label {
  font-family: "Inter", sans-serif;
  font-size: 9px;
  font-weight: 900;
  letter-spacing: 0.12em;
  color: #0a0a0a;
  text-transform: uppercase;
  margin-bottom: 6px;
  padding: 2px 5px;
  background: #0a0a0a;
  color: #fbbf24;
  display: inline-block;
}

.prg-tabs-list {
  list-style: none;
  padding: 0;
  margin: 0 0 8px;
}

.prg-tab-row {
  font-family: "Inter", "Space Grotesk", sans-serif;
  font-size: 10px;
  line-height: 1.4;
  padding: 2px 0;
  color: #0a0a0a;
}

.prg-tab-name {
  font-weight: 800;
  color: #0a0a0a;
  text-transform: uppercase;
  font-size: 9px;
  letter-spacing: 0.04em;
  display: block;
  margin-bottom: 1px;
}

.prg-tab-dash {
  display: none;
}

.prg-tab-what {
  color: #0a0a0a;
  font-weight: 500;
  opacity: 0.8;
}

.prg-closer {
  font-family: "Inter", "Space Grotesk", sans-serif;
  font-size: 10px;
  line-height: 1.4;
  color: #0a0a0a;
  padding-top: 6px;
  margin-top: 6px;
  border-top: 1px solid rgba(10,10,10,0.25);
  font-weight: 500;
}
`

export default (() => ProfileReaderGuide) satisfies QuartzComponentConstructor
