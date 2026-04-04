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

  function isProfilePage() {
    return getProfileType() !== null;
  }

  function getTabs() {
    return getProfileType() === 'donor' ? DONOR_TABS : POLITICIAN_TABS;
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
    var cardsByTab = {};
    tabs.forEach(function(t) { cardsByTab[t.id] = []; });
    cards.forEach(function(card) {
      var tab = card.dataset.tab || 'overview';
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
        btn.setAttribute('aria-disabled', 'true');
        btn.title = 'No ' + tabDef.label.toLowerCase() + ' data yet for this profile';
      }
      btn.addEventListener('click', function() {
        if (isEmpty) return;
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
    var cards = article.querySelectorAll('.profile-section-card');
    cards.forEach(function(card) {
      if ((card.dataset.tab || 'overview') === tabId) {
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

/* Tab navigation bar */
nav.profile-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 2px;
  margin: 0 0 1.4rem 0;
  padding: 0;
  border-bottom: 1px solid #1a1a22;
}
.profile-tab-btn {
  background: transparent;
  border: none;
  border-bottom: 2px solid transparent;
  color: #9a9aa6;
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
  color: #5b8dce;
  border-bottom-color: #5b8dce;
}
.profile-tab-btn.profile-tab-empty {
  color: #4a4a54;
  cursor: not-allowed;
}
.profile-tab-btn.profile-tab-empty:hover {
  color: #4a4a54;
  background: transparent;
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
