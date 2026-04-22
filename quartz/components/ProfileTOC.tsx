import { QuartzComponent, QuartzComponentConstructor } from "./types"

/**
 * ProfileTOC — per-profile table of contents, grouped by tab.
 *
 * On dense profiles (Koch Network has ~100 section-cards), the tab
 * system lets you switch between areas but doesn't surface WHICH
 * specific data tables live inside each tab. This TOC scans all
 * .profile-section-card elements in the article, groups them by
 * data-tab, and renders a sidebar list:
 *
 *   FINANCIALS (12)
 *     ▸ FEC Lifetime Giving
 *     ▸ IRS Form 990
 *     ▸ SEC Filings
 *     ▸ ProPublica Nonprofit Explorer
 *     ...
 *   ANALYSIS (5)
 *     ▸ Class Analysis
 *     ▸ Cross-Profile Influence
 *     ...
 *
 * Clicking an entry switches to that tab (via ProfileTabs' activate
 * behavior) and scrolls the card into view.
 *
 * Only renders on profile pages (detected via .ph-header existence).
 * Dormant SSR placeholder; real work happens client-side after
 * ProfileTabs has built the tab nav.
 */

const ProfileTOC: QuartzComponent = () => {
  return <div class="profile-toc-mount" data-profile-toc-mount hidden />
}

ProfileTOC.afterDOMLoaded = `
(function() {
  var TAB_LABELS = {
    overview:      'Overview',
    contradiction: 'Contradiction',
    recipients:    'Financials',     // donor tab uses "Financials" label
    donors:        'The Money',      // politician tab uses "The Money"
    voting:        'Key Votes',
    executive:     'Executive Actions',
    wins:          'Policy Wins',
    analysis:      'Analysis',
    timeline:      'Timeline',
    sources:       'Sources',
  };

  function cardTitle(card) {
    // First h3/h2 inside the card is the card title.
    var h = card.querySelector('h3, h2');
    if (!h) return null;
    // Strip anchor link SVG if present.
    var clone = h.cloneNode(true);
    var anchor = clone.querySelector('a[role="anchor"]');
    if (anchor) anchor.remove();
    var text = clone.textContent.trim();
    return text && text.length <= 80 ? text : text.slice(0, 77) + '...';
  }

  function cardId(card) {
    var h = card.querySelector('h3[id], h2[id]');
    return h ? h.id : null;
  }

  function buildTOC() {
    var mount = document.querySelector('.profile-toc-mount');
    if (!mount) return;
    // Only render on profile pages
    if (!document.querySelector('.ph-header')) return;

    // Find all cards with valid titles; skip placeholders (.profile-tab-placeholder)
    var cards = document.querySelectorAll('article .profile-section-card');
    if (cards.length < 3) return;  // not worth a TOC if there's nothing to organize

    // Group by tab, preserving document order within each tab.
    var groups = {};
    var tabOrder = [];  // preserve first-encountered tab order
    cards.forEach(function(card) {
      if (card.classList.contains('profile-tab-placeholder')) return;
      var tab = card.dataset.tab || 'overview';
      var title = cardTitle(card);
      if (!title) return;
      var id = cardId(card);
      if (!groups[tab]) {
        groups[tab] = [];
        tabOrder.push(tab);
      }
      groups[tab].push({ title: title, id: id, card: card });
    });

    if (Object.keys(groups).length === 0) return;

    // Build the TOC DOM
    var container = document.createElement('nav');
    container.className = 'profile-toc';
    container.setAttribute('aria-label', 'Profile table of contents');
    var header = document.createElement('div');
    header.className = 'profile-toc-header';
    header.textContent = 'CONTENTS';
    container.appendChild(header);

    tabOrder.forEach(function(tab) {
      var items = groups[tab];
      var groupEl = document.createElement('div');
      groupEl.className = 'profile-toc-group';
      groupEl.dataset.tab = tab;

      var label = document.createElement('div');
      label.className = 'profile-toc-group-label';
      label.textContent = (TAB_LABELS[tab] || tab).toUpperCase() + ' (' + items.length + ')';
      groupEl.appendChild(label);

      var list = document.createElement('ul');
      list.className = 'profile-toc-list';
      items.forEach(function(item) {
        var li = document.createElement('li');
        var a = document.createElement('a');
        a.href = '#' + (item.id || '');
        a.className = 'profile-toc-link';
        a.textContent = item.title;
        a.dataset.tab = tab;
        a.addEventListener('click', function(ev) {
          ev.preventDefault();
          // Switch to the tab via ProfileTabs button click
          var btn = document.querySelector('button.profile-tab-btn[data-tab="' + tab + '"]');
          if (btn) btn.click();
          // Scroll to the card after tab switch paints
          setTimeout(function() {
            item.card.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }, 60);
        });
        li.appendChild(a);
        list.appendChild(li);
      });
      groupEl.appendChild(list);
      container.appendChild(groupEl);
    });

    mount.innerHTML = '';
    mount.appendChild(container);
    mount.removeAttribute('hidden');
  }

  // Wait for ProfileTabs to build first (it runs setTimeout 150ms).
  setTimeout(buildTOC, 300);

  // Rebuild on SPA navigation
  document.addEventListener('nav', function() {
    setTimeout(buildTOC, 350);
  });
})();
`

ProfileTOC.css = `
.profile-toc-mount {
  display: block;
}

.profile-toc {
  font-family: "Inter", sans-serif;
  margin-bottom: 20px;
  padding: 14px 16px;
  border: 2px solid var(--dark);
  background: var(--light);
}

.profile-toc-header {
  font-family: "Space Mono", monospace;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.2em;
  color: var(--dark);
  padding-bottom: 10px;
  margin-bottom: 10px;
  border-bottom: 1px solid #ddd;
}

.profile-toc-group {
  margin-bottom: 14px;
}

.profile-toc-group:last-child {
  margin-bottom: 0;
}

.profile-toc-group-label {
  font-family: "Space Mono", monospace;
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.18em;
  color: var(--darkgray);
  margin-bottom: 6px;
}

.profile-toc-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.profile-toc-list li {
  padding: 0;
  margin: 0 0 3px 0;
}

.profile-toc-link {
  display: block;
  padding: 4px 6px;
  font-size: 12px;
  line-height: 1.35;
  color: var(--dark) !important;
  text-decoration: none !important;
  border-left: 2px solid transparent;
  transition: border-color 0.1s, background 0.1s, color 0.1s;
}

.profile-toc-link:hover {
  background: rgba(251, 191, 36, 0.15);  /* yellow accent */
  border-left-color: #fbbf24;
  color: var(--dark) !important;
}

@media (max-width: 800px) {
  /* In accordion mode the TOC is redundant with the full vertical
     layout. Hide it to save space. */
  .profile-mode-accordion ~ .right .profile-toc-mount,
  .profile-mode-accordion .profile-toc-mount {
    display: none;
  }
}
`

export default (() => ProfileTOC) satisfies QuartzComponentConstructor
