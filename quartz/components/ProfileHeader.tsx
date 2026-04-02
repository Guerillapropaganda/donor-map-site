import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"
import { classNames } from "../util/lang"

const ProfileHeader: QuartzComponent = ({
  fileData,
  displayClass,
}: QuartzComponentProps) => {
  const slug = String(fileData.slug ?? "")
  if (!slug.toLowerCase().includes("master-profile")) return null

  const fm = fileData.frontmatter
  const type = String(fm?.type ?? "unknown")
  const readiness = String(fm?.["content-readiness"] ?? "draft")
  const lastUpdated = String(fm?.["last-updated"] ?? "")
  const sourceTier = String(fm?.["source-tier"] ?? "")

  // Normalize display values
  const typeLabel = type.charAt(0).toUpperCase() + type.slice(1)
  const tierLabel = sourceTier ? sourceTier.replace(/-/g, " ").replace("tier ", "TIER ").toUpperCase() : ""
  const readinessLabel = readiness.replace(/-/g, " ").toUpperCase()
  const isReady = readiness === "publication-ready" || readiness === "ready"

  // Type determines color
  const typeClass = type === "politician" ? "ph-type-politician"
    : type === "donor" ? "ph-type-donor"
    : "ph-type-other"

  return (
    <div class={classNames(displayClass, "ph-header")}>
      <div class="ph-badges">
        <span class={`ph-badge ${typeClass}`}>{typeLabel.toUpperCase()}</span>
        {tierLabel && <span class="ph-badge ph-tier">{tierLabel}</span>}
        <span class={`ph-badge ph-readiness ${isReady ? "ph-ready" : "ph-draft"}`}>
          {readinessLabel}
        </span>
      </div>
      {lastUpdated && (
        <div class="ph-meta">UPDATED {lastUpdated}</div>
      )}
    </div>
  )
}

// Section card wrapping script — groups h2-delimited sections into card divs
ProfileHeader.afterDOMLoaded = `
function wrapProfileSections() {
  var article = document.querySelector('article');
  if (!article) return;
  if (article.dataset.sectionsWrapped === 'true') return;

  // Only run on master profile pages
  var slug = (document.body.dataset.slug || '').toLowerCase();
  if (slug.indexOf('master-profile') === -1) return;

  var children = Array.from(article.children);
  var currentCard = null;
  var fragment = document.createDocumentFragment();
  var preContent = [];

  for (var i = 0; i < children.length; i++) {
    var el = children[i];

    if (el.tagName === 'H2') {
      // Close previous card
      if (currentCard) {
        fragment.appendChild(currentCard);
      }

      // Start new card
      currentCard = document.createElement('div');
      currentCard.className = 'profile-section-card';

      // Assign variant class based on heading text
      var text = (el.textContent || '').toLowerCase();
      if (text.indexOf('contradiction') !== -1) {
        currentCard.classList.add('psc-contradiction');
      } else if (text.indexOf('who ') !== -1) {
        currentCard.classList.add('psc-who');
      } else if (text.indexOf('thesis') !== -1) {
        currentCard.classList.add('psc-thesis');
      } else if (text.indexOf('donor') !== -1 || text.indexOf('fund') !== -1) {
        currentCard.classList.add('psc-donors');
      } else if (text.indexOf('pattern') !== -1 || text.indexOf('analytical') !== -1) {
        currentCard.classList.add('psc-patterns');
      } else if (text.indexOf('timeline') !== -1) {
        currentCard.classList.add('psc-timeline');
      } else if (text.indexOf('source') !== -1) {
        currentCard.classList.add('psc-sources');
      } else if (text.indexOf('roi') !== -1 || text.indexOf('return') !== -1) {
        currentCard.classList.add('psc-donors');
      } else if (text.indexOf('race') !== -1 || text.indexOf('position') !== -1) {
        currentCard.classList.add('psc-position');
      } else if (text.indexOf('rhetorical') !== -1 || text.indexOf('signature') !== -1) {
        currentCard.classList.add('psc-patterns');
      } else if (text.indexOf('class analysis') !== -1) {
        currentCard.classList.add('psc-thesis');
      } else if (text.indexOf('infrastructure') !== -1 || text.indexOf('machine') !== -1) {
        currentCard.classList.add('psc-donors');
      } else if (text.indexOf('criminal') !== -1 || text.indexOf('paradox') !== -1) {
        currentCard.classList.add('psc-contradiction');
      } else if (text.indexOf('israel') !== -1 || text.indexOf('aipac') !== -1) {
        currentCard.classList.add('psc-donors');
      } else if (text.indexOf('submission') !== -1) {
        currentCard.classList.add('psc-contradiction');
      } else if (text.indexOf('labor') !== -1 || text.indexOf('anti-') !== -1) {
        currentCard.classList.add('psc-contradiction');
      }

      currentCard.appendChild(el);
    } else if (currentCard) {
      // Add to current card
      currentCard.appendChild(el);
    } else {
      // Content before first h2 — collect as preamble
      preContent.push(el);
    }
  }

  // Close final card
  if (currentCard) {
    fragment.appendChild(currentCard);
  }

  // Clear article and rebuild
  article.innerHTML = '';

  // Re-add preamble content
  for (var j = 0; j < preContent.length; j++) {
    article.appendChild(preContent[j]);
  }

  // Add all cards
  article.appendChild(fragment);

  article.dataset.sectionsWrapped = 'true';
}

wrapProfileSections();
document.addEventListener('nav', function() {
  setTimeout(wrapProfileSections, 100);
});
`

// Styles are in quartz/styles/custom.scss (scoped via body[data-slug*="master-profile"])

export default (() => ProfileHeader) satisfies QuartzComponentConstructor
