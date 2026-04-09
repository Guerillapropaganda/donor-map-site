import { QuartzComponent, QuartzComponentConstructor } from "./types"

const ProfileTabs: QuartzComponent = () => {
  return <div class="profile-tabs-mount" data-profile-tabs-mount hidden />
}

ProfileTabs.afterDOMLoaded = `
(function() {
  var POLITICIAN_TABS = [
    { id: 'overview', label: 'Overview' },
    { id: 'donors', label: 'Donors' },
    { id: 'voting', label: 'Voting' },
    { id: 'analysis', label: 'Analysis' },
    { id: 'sources', label: 'Sources' }
  ];
  var PRESIDENTIAL_TABS = [
    { id: 'overview', label: 'Overview' },
    { id: 'donors', label: 'Donors' },
    { id: 'executive', label: 'Executive Orders' },
    { id: 'analysis', label: 'Analysis' },
    { id: 'sources', label: 'Sources' }
  ];
  var DONOR_TABS = [
    { id: 'overview', label: 'Overview' },
    { id: 'recipients', label: 'Recipients' },
    { id: 'wins', label: 'Policy Wins' },
    { id: 'analysis', label: 'Analysis' },
    { id: 'sources', label: 'Sources' }
  ];

  function getProfileType() {
    var article = document.querySelector('article');
    if (article && article.dataset.profileType) return article.dataset.profileType;
    var ph = document.querySelector('.ph-header[data-profile-type]');
    return ph ? ph.getAttribute('data-profile-type') : null;
  }

  function isPresidential() {
    var bc = document.querySelector('.breadcrumb-container, nav.breadcrumbs');
    if (bc && bc.textContent && bc.textContent.indexOf('Presidential') !== -1) return true;
    if (bc && bc.textContent && bc.textContent.indexOf('Cabinet') !== -1) return false;
    var slug = window.location.pathname.toLowerCase();
    return slug.indexOf('/presidential/') !== -1;
  }

  function isProfilePage() {
    return getProfileType() !== null;
  }

  function getTabs() {
    if (getProfileType() === 'donor') return DONOR_TABS;
    if (isPresidential()) return PRESIDENTIAL_TABS;
    return POLITICIAN_TABS;
  }

  function isMobileViewport() {
    return window.matchMedia('(max-width: 800px)').matches;
  }

  function buildProfileTabs() {
    if (!isProfilePage()) return;

    var article = document.querySelector('article');
    if (!article) return;
    if (article.dataset.profileTabsBuilt === 'true') return;

    // Clear previously built tabs/placeholders
    var oldNav = article.querySelector('nav.profile-tabs');
    if (oldNav) oldNav.remove();
    var oldPlaceholders = article.querySelectorAll('.profile-tab-placeholder');
    oldPlaceholders.forEach(function(el) { el.remove(); });

    var cards = article.querySelectorAll('.profile-section-card');
    if (cards.length === 0) return;

    var tabs = getTabs();

    // Count cards per tab
    var isPres = isPresidential();
    var cardsByTab = {};
    tabs.forEach(function(t) { cardsByTab[t.id] = []; });
    cards.forEach(function(card) {
      var tab = card.dataset.tab || 'overview';
      // Remap voting → executive for presidential profiles
      if (isPres && tab === 'voting') tab = 'executive';
      if (!cardsByTab[tab]) cardsByTab[tab] = [];
      cardsByTab[tab].push(card);
    });

    // Build tab nav
    var nav = document.createElement('nav');
    nav.className = 'profile-tabs';
    nav.setAttribute('role', 'tablist');

    tabs.forEach(function(tabDef, idx) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'profile-tab-btn';
      btn.dataset.tab = tabDef.id;
      btn.setAttribute('role', 'tab');
      btn.textContent = tabDef.label;
      var count = (cardsByTab[tabDef.id] || []).length;
      var isEmpty = count === 0;
      if (isEmpty) {
        btn.classList.add('profile-tab-empty');
        // Create a placeholder card for empty tabs
        var placeholder = document.createElement('div');
        placeholder.className = 'profile-section-card profile-tab-placeholder';
        placeholder.dataset.tab = tabDef.id;
        placeholder.innerHTML = '<div class="profile-tab-empty-msg">' + tabDef.label + ' data not yet available for this profile.</div>';
        cardsByTab[tabDef.id] = [placeholder];
      }
      btn.addEventListener('click', function() {
        activateTab(tabDef.id);
      });
      nav.appendChild(btn);
    });

    // Insert nav before the first card (after any preamble)
    var firstCard = article.querySelector('.profile-section-card');
    if (firstCard) {
      article.insertBefore(nav, firstCard);
    } else {
      article.appendChild(nav);
    }

    // Append placeholder cards for empty tabs
    var allPlaceholders = article.querySelectorAll('.profile-tab-placeholder');
    allPlaceholders.forEach(function(el) { el.remove(); });
    tabs.forEach(function(tabDef) {
      var items = cardsByTab[tabDef.id] || [];
      items.forEach(function(item) {
        if (item.classList && item.classList.contains('profile-tab-placeholder')) {
          article.appendChild(item);
        }
      });
    });

    article.dataset.profileTabsBuilt = 'true';

    // Restore last active tab from sessionStorage (skip empty tabs)
    var savedTab = null;
    try { savedTab = sessionStorage.getItem('dm-profile-tab'); } catch(e) {}
    var initialTab = 'overview';
    if (savedTab && cardsByTab[savedTab] && cardsByTab[savedTab].length > 0) {
      initialTab = savedTab;
    } else if ((cardsByTab['overview'] || []).length === 0) {
      // fall through to first populated tab
      for (var ti = 0; ti < tabs.length; ti++) {
        if ((cardsByTab[tabs[ti].id] || []).length > 0) { initialTab = tabs[ti].id; break; }
      }
    }
    activateTab(initialTab);

    // Toggle between tabs and accordion based on viewport
    applyViewportMode();
  }

  function activateTab(tabId) {
    var article = document.querySelector('article');
    if (!article) return;

    // Update button active state
    var btns = article.querySelectorAll('.profile-tab-btn');
    btns.forEach(function(b) {
      if (b.dataset.tab === tabId) {
        b.classList.add('profile-tab-active');
        b.setAttribute('aria-selected', 'true');
      } else {
        b.classList.remove('profile-tab-active');
        b.setAttribute('aria-selected', 'false');
      }
    });

    // Show/hide cards
    var isPres = isPresidential();
    var cards = article.querySelectorAll('.profile-section-card');
    cards.forEach(function(card) {
      var cardTab = card.dataset.tab || 'overview';
      if (isPres && cardTab === 'voting') cardTab = 'executive';
      if (cardTab === tabId) {
        card.classList.remove('profile-tab-hidden');
      } else {
        card.classList.add('profile-tab-hidden');
      }
    });

    try { sessionStorage.setItem('dm-profile-tab', tabId); } catch(e) {}
  }

  function applyViewportMode() {
    var article = document.querySelector('article');
    if (!article) return;
    if (isMobileViewport()) {
      article.classList.add('profile-mode-accordion');
    } else {
      article.classList.remove('profile-mode-accordion');
    }
  }

  // Initial build (after ProfileHeader wraps sections)
  setTimeout(buildProfileTabs, 150);

  // SPA navigation
  document.addEventListener('nav', function() {
    setTimeout(function() {
      var art = document.querySelector('article');
      if (art) art.dataset.profileTabsBuilt = '';
      buildProfileTabs();
    }, 250);
  });

  // Responsive toggle
  window.addEventListener('resize', function() {
    applyViewportMode();
  });
})();
`

ProfileTabs.css = `
.profile-tabs-mount { display: none; }

/* Tab navigation bar — sticky at top of article */
nav.profile-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 2px;
  margin: 0 0 1.4rem 0;
  padding: 2px 0 0 0;
  border-bottom: 1px solid #ddd;
  position: sticky;
  top: 0;
  z-index: 20;
  background: #ece6dd;
}
.profile-tab-btn {
  background: transparent;
  border: none;
  border-bottom: 2px solid transparent;
  color: #777;
  font-family: "Space Mono", monospace;
  font-size: 13px;
  font-weight: 500;
  padding: 10px 16px;
  cursor: pointer;
  transition: color 0.12s, border-color 0.12s, background 0.12s;
  letter-spacing: 0.02em;
  margin-bottom: -1px;
}
.profile-tab-btn:hover {
  color: #e4e4ea;
  background: #14141a;
}
.profile-tab-btn.profile-tab-active {
  color: #0a0a0a;
  border-bottom-color: #0a0a0a;
}
.profile-tab-btn.profile-tab-empty {
  color: #999;
  cursor: pointer;
}
.profile-tab-btn.profile-tab-empty:hover {
  color: #777;
}
.profile-tab-empty-msg {
  color: #999;
  font-family: "Space Mono", monospace;
  font-size: 13px;
  text-align: center;
  padding: 2rem 1rem;
  border: 1px dashed #ddd;
  border-radius: 0;
  margin: 1rem 0;
}

/* Hidden section cards */
.profile-section-card.profile-tab-hidden {
  display: none;
}

/* Accordion mode on mobile: show everything, hide tab nav */
article.profile-mode-accordion nav.profile-tabs {
  display: none;
}
article.profile-mode-accordion .profile-section-card.profile-tab-hidden {
  display: block;
}

@media (max-width: 800px) {
  nav.profile-tabs {
    display: none;
  }
  .profile-section-card.profile-tab-hidden {
    display: block;
  }
}
`

export default (() => ProfileTabs) satisfies QuartzComponentConstructor
