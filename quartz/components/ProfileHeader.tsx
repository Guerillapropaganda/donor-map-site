import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"
import { classNames } from "../util/lang"

const ProfileHeader: QuartzComponent = ({
  fileData,
  displayClass,
}: QuartzComponentProps) => {
  const fm = fileData.frontmatter
  const type = String(fm?.type ?? "unknown")
  if (type !== "politician" && type !== "donor") return null
  const readiness = String(fm?.["content-readiness"] ?? "draft")
  const lastUpdated = String(fm?.["last-updated"] ?? "")
  const sourceTier = String(fm?.["source-tier"] ?? "")

  // Normalize display values
  const typeLabel = type.charAt(0).toUpperCase() + type.slice(1)
  const tierLabel = sourceTier
    ? /^\d+$/.test(sourceTier)
      ? `TIER ${sourceTier}`
      : sourceTier.replace(/-/g, " ").replace(/^tier /i, "TIER ").toUpperCase()
    : ""
  const readinessLabel = readiness.replace(/-/g, " ").toUpperCase()
  const isVerified = readiness === "verified"
  const isReady = readiness === "publication-ready" || readiness === "ready"

  // Party for politicians
  const party = String(fm?.party ?? "")
  const partyKey = party.toLowerCase().startsWith("democrat")
    ? "D"
    : party.toLowerCase().startsWith("republican")
    ? "R"
    : party.toLowerCase().startsWith("independent")
    ? "I"
    : ""
  const partyLabel = partyKey === "D" ? "Democrat" : partyKey === "R" ? "Republican" : partyKey === "I" ? "Independent" : ""

  // Type determines color
  const typeClass = type === "politician" ? "ph-type-politician"
    : type === "donor" ? "ph-type-donor"
    : "ph-type-other"

  // Say vs Pay data from frontmatter
  const svp = fm?.["say-vs-pay"] as any
  const svpJson = svp ? JSON.stringify(svp) : ""

  return (
    <div class={classNames(displayClass, "ph-header")} data-profile-type={type}>
      <div class="ph-badges">
        {partyKey && (
          <span class={`ph-party-dot ph-party-${partyKey.toLowerCase()}`} title={partyLabel}></span>
        )}
        <span class={`ph-badge ${typeClass}`}>{typeLabel.toUpperCase()}</span>
      </div>
      {lastUpdated && (
        <div class="ph-meta">UPDATED {lastUpdated}</div>
      )}
      {svpJson && (
        <div id="svp-data" data-svp={svpJson} style="display:none" />
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

  // Only run on profile pages (identified by data-profile-type on ph-header)
  var phEl = document.querySelector('.ph-header[data-profile-type]');
  if (!phEl) return;
  var profileType = phEl.getAttribute('data-profile-type') || 'politician';
  article.dataset.profileType = profileType;

  var children = Array.from(article.children);
  // Prefer h2 as the section boundary, but fall back to h3 when a profile
  // authored in Obsidian uses h3 as its top-level section heading.
  var sectionTag = article.querySelector('h2') ? 'H2' : 'H3';
  var currentCard = null;
  var fragment = document.createDocumentFragment();
  var preContent = [];

  for (var i = 0; i < children.length; i++) {
    var el = children[i];

    // Detect "paragraph-as-heading" misuse: long h3s or ones with → arrows
    // are not real section boundaries — they're narrative content authored
    // as a heading by mistake. Keep them inside the current card.
    var isSection = el.tagName === sectionTag;
    if (isSection) {
      var rawText = (el.textContent || '').trim();
      if (rawText.length > 120 || rawText.indexOf('→') !== -1) {
        isSection = false;
      }
    }

    if (isSection) {
      // Close previous card
      if (currentCard) {
        fragment.appendChild(currentCard);
      }

      // Start new card
      currentCard = document.createElement('div');
      currentCard.className = 'profile-section-card';

      // Assign variant class based on heading text
      var text = (el.textContent || '').toLowerCase();
      // Wins / policy outcomes (donors: "What They've Gotten"; check before contradiction)
      if (text.indexOf('gotten') !== -1 || text.indexOf("what they've") !== -1 || text.indexOf('victor') !== -1 || text.indexOf('policy win') !== -1 || text.indexOf('what they got') !== -1) {
        currentCard.classList.add('psc-wins');
      } else if (text.indexOf('executive order') !== -1) {
        currentCard.classList.add('psc-executive');
      } else if (text.indexOf('vote') !== -1 || text.indexOf('voting record') !== -1 || text.indexOf('bills sponsored') !== -1 || text.indexOf('cosponsor') !== -1 || text.indexOf('legislation') !== -1 || text.indexOf('legislative') !== -1 || text.indexOf('committee') !== -1 || text.indexOf('floor speech') !== -1) {
        currentCard.classList.add('psc-voting');
      } else if (text.indexOf('contradiction') !== -1) {
        currentCard.classList.add('psc-contradiction');
      } else if (text.indexOf('who ') !== -1) {
        currentCard.classList.add('psc-who');
      } else if (text.indexOf('thesis') !== -1) {
        currentCard.classList.add('psc-thesis');
      } else if (text.indexOf('donor') !== -1 || text.indexOf('fund') !== -1 || text.indexOf('grassroots') !== -1 || text.indexOf('small-dollar') !== -1 || text.indexOf('small dollar') !== -1) {
        currentCard.classList.add('psc-donors');
      } else if (text.indexOf('industry') !== -1 || text.indexOf('pharma') !== -1 || text.indexOf('insurance') !== -1 || text.indexOf('wall street') !== -1 || text.indexOf('silicon valley') !== -1 || text.indexOf('healthcare deal') !== -1 || text.indexOf('fossil fuel') !== -1 || text.indexOf('oil ') !== -1 || text.indexOf('sector') !== -1) {
        currentCard.classList.add('psc-donors');
      } else if (text.indexOf('pattern') !== -1 || text.indexOf('analytical') !== -1) {
        currentCard.classList.add('psc-patterns');
      } else if (text.indexOf('timeline') !== -1) {
        currentCard.classList.add('psc-timeline');
      } else if (text.indexOf('source') !== -1 || text.indexOf('citation') !== -1 || text.indexOf('reference') !== -1 || text.indexOf('methodology') !== -1) {
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

      // Map variant class to tab bucket for ProfileTabs (type-aware)
      var variant = currentCard.className;
      var tab = 'overview';
      if (profileType === 'donor') {
        if (variant.indexOf('psc-donors') !== -1 || variant.indexOf('psc-timeline') !== -1) tab = 'recipients';
        else if (variant.indexOf('psc-wins') !== -1 || variant.indexOf('psc-voting') !== -1) tab = 'wins';
        else if (variant.indexOf('psc-contradiction') !== -1 || variant.indexOf('psc-patterns') !== -1) tab = 'analysis';
        else if (variant.indexOf('psc-sources') !== -1) tab = 'sources';
      } else {
        if (variant.indexOf('psc-donors') !== -1 || variant.indexOf('psc-timeline') !== -1) tab = 'donors';
        else if (variant.indexOf('psc-executive') !== -1 || variant.indexOf('psc-voting') !== -1 || variant.indexOf('psc-wins') !== -1) tab = 'voting';
        else if (variant.indexOf('psc-contradiction') !== -1 || variant.indexOf('psc-patterns') !== -1) tab = 'analysis';
        else if (variant.indexOf('psc-sources') !== -1) tab = 'sources';
      }
      currentCard.dataset.tab = tab;

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

function hideDuplicateNotices() {
  var article = document.querySelector('article');
  if (!article) return;
  var callouts = article.querySelectorAll('.callout');
  for (var i = 0; i < callouts.length; i++) {
    var title = callouts[i].querySelector('.callout-title-inner');
    if (title && (title.textContent || '').indexOf('DUPLICATE') !== -1) {
      callouts[i].style.display = 'none';
    }
  }
}

function hideDataviewFields() {
  var article = document.querySelector('article');
  if (!article) return;
  // Matches dataview inline fields at paragraph start:
  // - "word:: value" (raw double-colon, Obsidian inline field)
  // - "related: value" / "donors: value" (Quartz strips one colon on render)
  var INLINE_FIELDS = /^(related|donors|content-readiness|last-updated|party|office|district|state|profile-status|research-status|type|source-tier|sector|entity-type|issues|politicians-funded|committees|leadership-roles|chamber|state-abbr|parent|aliases):\\s/i;
  var ps = article.querySelectorAll('p');
  for (var i = 0; i < ps.length; i++) {
    var t = (ps[i].textContent || '').trim();
    if (t.match(/[a-z_-]+::\\s/) || t.match(INLINE_FIELDS)) {
      ps[i].style.display = 'none';
    }
  }
}

function renderSayVsPay() {
  var dataEl = document.getElementById('svp-data');
  if (!dataEl) return;
  var existing = document.getElementById('svp-card');
  if (existing) return;
  var raw = dataEl.dataset.svp;
  if (!raw) return;
  var d;
  if (raw.charAt(0) !== '{') return;
  d = JSON.parse(raw);

  var html = '<div id="svp-card" class="svp-card">';
  html += '<div class="svp-header">SAY VS. PAY</div>';
  html += '<div class="svp-columns">';

  // Left column: public record
  html += '<div class="svp-col">';
  html += '<div class="svp-col-label svp-passed-label">THE PUBLIC RECORD</div>';
  if (d.passed) {
    for (var i = 0; i < d.passed.length; i++) {
      html += '<div class="svp-item svp-pass"><span class="svp-check">&#10003;</span> ' + d.passed[i] + '</div>';
    }
  }
  if (d.blocked) {
    html += '<div class="svp-col-label svp-blocked-label">WHAT DIDN' + "'" + 'T PASS</div>';
    for (var j = 0; j < d.blocked.length; j++) {
      html += '<div class="svp-item svp-block"><span class="svp-x">&#10007;</span> ' + d.blocked[j] + '</div>';
    }
  }
  html += '</div>';

  // Right column: money trail
  html += '<div class="svp-col">';
  html += '<div class="svp-col-label svp-money-label">THE MONEY TRAIL</div>';
  if (d['top-donors']) {
    for (var k = 0; k < d['top-donors'].length; k++) {
      var donor = d['top-donors'][k];
      html += '<div class="svp-donor"><span class="svp-donor-name">' + donor.name + '</span><span class="svp-donor-amt">' + donor.amount + '</span></div>';
    }
  }
  html += '</div>';
  html += '</div>'; // end columns

  if (d['gap-stat']) {
    html += '<div class="svp-gap">' + d['gap-stat'] + '</div>';
  }
  html += '</div>';

  // Insert into contradiction card
  var cards = document.querySelectorAll('.psc-contradiction');
  if (cards.length > 0) {
    var heading = cards[0].querySelector('h2, h3');
    if (heading) {
      heading.insertAdjacentHTML('afterend', html);
    }
  }
}

function enhanceTables() {
  var tables = document.querySelectorAll('article table');
  for (var t = 0; t < tables.length; t++) {
    var table = tables[t];
    if (table.dataset.enhanced) continue;
    table.dataset.enhanced = 'true';

    // Wrap table in scroll container
    if (!table.parentElement.classList.contains('table-scroll-wrap')) {
      var wrap = document.createElement('div');
      wrap.className = 'table-scroll-wrap';
      table.parentNode.insertBefore(wrap, table);
      wrap.appendChild(table);
    }

    // Add data-label for responsive mobile stacking
    var headers = table.querySelectorAll('th');
    var headerLabels = [];
    for (var h = 0; h < headers.length; h++) {
      headerLabels.push((headers[h].textContent || '').trim());
    }
    if (headerLabels.length > 0) {
      var rows = table.querySelectorAll('tbody tr');
      for (var r = 0; r < rows.length; r++) {
        var rowCells = rows[r].querySelectorAll('td');
        for (var rc = 0; rc < rowCells.length; rc++) {
          if (headerLabels[rc]) {
            rowCells[rc].setAttribute('data-label', headerLabels[rc]);
          }
        }
      }
    }

    // Scan cells for content-based styling
    var cells = table.querySelectorAll('td');
    for (var c = 0; c < cells.length; c++) {
      var cell = cells[c];
      var text = (cell.textContent || '').trim();
      if (text.match(/^\$[\d,.]+[KkMmBbTt]?$/)) {
        cell.classList.add('cell-money');
      }
      if (text.match(/^(19|20)\d{2}/) || text.match(/^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)/i)) {
        cell.classList.add('cell-date');
      }
      if (text.match(/same\s+(day|week|month)/i) || text.match(/^\d+\s+(day|week|hour|month)/i) || text.match(/immediate/i)) {
        cell.classList.add('cell-gap-fast');
      }
    }
  }
}

wrapProfileSections();
hideDataviewFields();
hideDuplicateNotices();
renderSayVsPay();
enhanceTables();
document.addEventListener('nav', function() {
  var art = document.querySelector('article');
  if (art) art.dataset.sectionsWrapped = '';
  setTimeout(function() { wrapProfileSections(); hideDataviewFields(); hideDuplicateNotices(); renderSayVsPay(); enhanceTables(); animateProfile(); }, 100);
});

// ─── Profile page animations ───
function animateProfile() {
  // Only on profile pages
  if (!document.querySelector('.ph-header')) return;

  // Section cards: fade in + slide up on scroll
  var cards = document.querySelectorAll('.profile-section-card');
  if (cards.length) {
    var cardObs = new IntersectionObserver(function(entries) {
      entries.forEach(function(e) {
        if (e.isIntersecting) {
          e.target.style.opacity = '1';
          e.target.style.transform = 'translateY(0)';
        }
      });
    }, { threshold: 0.1 });

    cards.forEach(function(card, i) {
      card.style.opacity = '0';
      card.style.transform = 'translateY(16px)';
      card.style.transition = 'opacity 0.5s ease ' + (i * 0.05) + 's, transform 0.5s ease ' + (i * 0.05) + 's';
      cardObs.observe(card);
    });
  }

  // Article title: slide in
  var title = document.querySelector('.article-title');
  if (title) {
    title.style.opacity = '0';
    title.style.transform = 'translateY(12px)';
    title.style.transition = 'opacity 0.4s ease, transform 0.4s ease';
    setTimeout(function() {
      title.style.opacity = '1';
      title.style.transform = 'translateY(0)';
    }, 100);
  }

  // Evidence panel badge: pop in
  var badge = document.querySelector('.ep-type-badge');
  if (badge) {
    badge.style.opacity = '0';
    badge.style.transform = 'scale(0.9)';
    badge.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
    setTimeout(function() {
      badge.style.opacity = '1';
      badge.style.transform = 'scale(1)';
    }, 300);
  }

  // Profile header badges: stagger in
  var badges = document.querySelectorAll('.ph-badge, .ph-party-dot');
  badges.forEach(function(b, i) {
    b.style.opacity = '0';
    b.style.transition = 'opacity 0.3s ease ' + (0.2 + i * 0.1) + 's';
    setTimeout(function() { b.style.opacity = '1'; }, 50);
  });
}

animateProfile();
`

// Styles are in quartz/styles/custom.scss (scoped via body[data-slug*="master-profile"])

export default (() => ProfileHeader) satisfies QuartzComponentConstructor
