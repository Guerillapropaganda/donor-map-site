import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"

/**
 * HeroContradiction — top-of-profile contradiction banner
 *
 * Pulls the "Core Contradiction" / "Contradictions" section content from the
 * profile body and renders it as a prominent banner at the top of the page,
 * above tabs and all other content. This is the "reader sees the hypocrisy
 * first" moment — the distilled thesis of why this profile exists.
 *
 * Rendering rules:
 *   - Only renders for profile types in VERIFIED_TYPES
 *   - Only renders if profile has a "## The Core Contradiction" /
 *     "## The Contradictions" / "## Contradictions" section
 *   - Extracts the content up to the next H2
 *   - Prefers the first blockquote (usually the "brand claim") + first
 *     paragraph after it (usually the "record vs claim" revelation)
 *   - Falls back to the first 1-2 paragraphs of content if no blockquote
 *   - Links to the full section for readers who want more
 *
 * Placement: in quartz.layout.ts beforeBody, between ArticleTitle and
 * EvidencePanel. The reader sees the contradiction BEFORE any money data
 * or tab navigation.
 */

const VERIFIED_TYPES = new Set([
  "politician", "state-politician", "local-politician",
  "donor", "corporation", "pac", "think-tank", "lobbying-firm",
])

/**
 * Find the Contradictions section in the body and return its content
 * (everything between its H2 and the next H2).
 */
function extractContradictionSection(body: string): string | null {
  // Match ## The Core Contradiction / ## The Contradictions / ## Contradictions
  const headingRe = /^##\s+(?:The\s+(?:Core\s+)?)?Contradictions?\s*$/mi
  const lines = body.split("\n")
  let startIdx = -1
  for (let i = 0; i < lines.length; i++) {
    if (headingRe.test(lines[i])) { startIdx = i; break }
  }
  if (startIdx === -1) return null
  let endIdx = lines.length
  for (let i = startIdx + 1; i < lines.length; i++) {
    if (/^##\s+/.test(lines[i])) { endIdx = i; break }
  }
  return lines.slice(startIdx + 1, endIdx).join("\n").trim()
}

/**
 * From a section body, extract:
 *   1. The first blockquote (lines starting with `>`) — usually the "brand claim"
 *   2. The first non-blockquote paragraph after it — usually the reveal
 * Falls back to the first paragraph if no blockquote present.
 */
function extractHook(section: string): { claim: string; revelation: string } {
  const lines = section.split("\n")
  // Skip any auto-generator markers or HTML comments
  const blockquoteLines: string[] = []
  const paragraphLines: string[] = []
  let sawBlockquote = false
  let collectedFirstPara = false
  let currentParaBuffer: string[] = []

  for (const line of lines) {
    const trimmed = line.trim()
    if (trimmed.startsWith("<!--") || trimmed.startsWith("[!")) continue

    if (trimmed.startsWith(">")) {
      // Strip `> [!callout]` Obsidian callout header
      const clean = trimmed.replace(/^>\s*\[!\w+\]\s*/, "").replace(/^>\s*/, "").trim()
      if (clean) blockquoteLines.push(clean)
      sawBlockquote = true
      continue
    }

    // Blank line
    if (!trimmed) {
      if (sawBlockquote && currentParaBuffer.length === 0) continue // waiting for first paragraph after blockquote
      if (currentParaBuffer.length > 0 && !collectedFirstPara) {
        // end of first paragraph
        paragraphLines.push(currentParaBuffer.join(" "))
        collectedFirstPara = true
      }
      currentParaBuffer = []
      continue
    }

    if (!collectedFirstPara) {
      currentParaBuffer.push(trimmed)
    }
  }
  // Flush trailing paragraph
  if (!collectedFirstPara && currentParaBuffer.length > 0) {
    paragraphLines.push(currentParaBuffer.join(" "))
  }

  const claim = blockquoteLines.join(" ").trim()
  const revelation = (paragraphLines[0] || "").trim()

  // If no blockquote: use first two paragraphs as claim + revelation
  if (!claim && paragraphLines.length >= 1) {
    return { claim: paragraphLines[0], revelation: paragraphLines[1] || "" }
  }

  return { claim, revelation }
}

const HeroContradiction: QuartzComponent = ({ fileData }: QuartzComponentProps) => {
  const fm = fileData.frontmatter
  if (!fm) return null

  const type = String(fm.type ?? "")
  if (!VERIFIED_TYPES.has(type)) return null

  const body = fileData.text ?? ""
  if (!body) return null

  const section = extractContradictionSection(body)
  if (!section) return null

  const { claim, revelation } = extractHook(section)
  if (!claim && !revelation) return null

  return (
    <div class="hero-contradiction">
      <div class="hero-contradiction-marker">
        <span class="hero-contradiction-dot"></span>
        <span class="hero-contradiction-label">CONTRADICTION DETECTED</span>
      </div>
      {claim && (
        <blockquote class="hero-contradiction-claim">
          <div class="hero-contradiction-claim-label">THE PITCH</div>
          <p>{claim}</p>
        </blockquote>
      )}
      {revelation && (
        <div class="hero-contradiction-revelation">
          <div class="hero-contradiction-revelation-label">THE RECORD</div>
          <p>{revelation}</p>
        </div>
      )}
      <a href="#the-contradictions" class="hero-contradiction-link" data-target-tab="analysis">
        Full analysis →
      </a>
    </div>
  )
}

HeroContradiction.afterDOMLoaded = `
(function() {
  function wireHeroLink() {
    var link = document.querySelector('.hero-contradiction-link');
    if (!link || link.dataset.wired === 'true') return;
    link.dataset.wired = 'true';
    link.addEventListener('click', function(e) {
      e.preventDefault();
      var targetTab = link.getAttribute('data-target-tab') || 'analysis';
      var article = document.querySelector('article');
      if (!article) return;
      var btn = article.querySelector('.profile-tab-btn[data-tab="' + targetTab + '"]');
      if (btn) {
        btn.click();
        setTimeout(function() {
          var card = article.querySelector('.profile-section-card[data-tab="' + targetTab + '"]:not(.profile-tab-hidden)');
          if (card) card.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 50);
      }
    });
  }
  wireHeroLink();
  document.addEventListener('nav', function() { setTimeout(wireHeroLink, 200); });
})();
`

HeroContradiction.css = `
.hero-contradiction {
  border: 3px solid #e63946;
  background: linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%);
  padding: 20px 24px;
  margin: 0 0 32px;
  position: relative;
  font-family: "Inter", sans-serif;
}

.hero-contradiction-marker {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: #e63946;
  color: #fff;
  padding: 4px 12px;
  font-family: "Space Mono", monospace;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.2em;
  margin-bottom: 16px;
}

.hero-contradiction-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #fff;
  display: inline-block;
  animation: hero-pulse 2s ease-in-out infinite;
}

@keyframes hero-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}

.hero-contradiction-claim {
  margin: 0 0 16px;
  padding: 0;
  border-left: 4px solid #e63946;
  padding-left: 16px;
  background: rgba(255, 255, 255, 0.5);
  padding-top: 10px;
  padding-bottom: 10px;
}

.hero-contradiction-claim-label,
.hero-contradiction-revelation-label {
  font-family: "Space Mono", monospace;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.15em;
  color: #e63946;
  margin-bottom: 6px;
}

.hero-contradiction-claim p,
.hero-contradiction-revelation p {
  font-family: "Instrument Serif", serif;
  font-size: 18px;
  line-height: 1.5;
  color: var(--dark);
  margin: 0;
  font-style: italic;
}

.hero-contradiction-revelation {
  background: rgba(255, 255, 255, 0.5);
  padding: 10px 16px;
  border-left: 4px solid var(--dark);
  margin-bottom: 12px;
}

.hero-contradiction-revelation p {
  font-style: normal;
  font-weight: 500;
}

.hero-contradiction-link {
  display: inline-block;
  color: #e63946;
  font-family: "Space Mono", monospace;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-decoration: none;
  border-bottom: 1px solid currentColor;
  padding-bottom: 2px;
  transition: color 0.15s ease;
}

.hero-contradiction-link:hover {
  color: var(--dark);
}

@media (max-width: 600px) {
  .hero-contradiction {
    padding: 16px 16px;
    margin: 0 0 20px;
  }
  .hero-contradiction-claim p,
  .hero-contradiction-revelation p {
    font-size: 16px;
  }
}
`

export default (() => HeroContradiction) satisfies QuartzComponentConstructor
