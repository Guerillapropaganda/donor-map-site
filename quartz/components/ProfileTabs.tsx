import { QuartzComponent, QuartzComponentConstructor } from "./types"

const ProfileTabs: QuartzComponent = () => {
  return <div class="profile-tabs-mount" data-profile-tabs-mount hidden />
}

ProfileTabs.afterDOMLoaded = `
(function() {
  var TABS = [
    { id: 'overview', label: 'Overview' },
    { id: 'donors', label: 'Donors' },
    { id: 'voting', label: 'Voting' },
    { id: 'analysis', label: 'Analysis' },
    { id: 'sources', label: 'Sources' }
  ];

  function isProfilePage() {
    var slug = (document.body.dataset.slug || '').toLowerCase();
    return slug.indexOf('master-profile') !== -1;
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

    // Count cards per tab
    var cardsByTab = {};
    TABS.forEach(function(t) { cardsByTab[t.id] = []; });
    cards.forEach(function(card) {
      var tab = card.dataset.tab || 'overview';
      if (!cardsByTab[tab]) cardsByTab[tab] = [];
      cardsByTab[tab].push(card);
    });

    // Build tab nav
    var nav = document.createElement('nav');
    nav.className = 'profile-tabs';
    nav.setAttribute('role', 'tablist');

    TABS.forEach(function(tabDef, idx) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'profile-tab-btn';
      btn.dataset.tab = tabDef.id;
      btn.setAttribute('role', 'tab');
      btn.textContent = tabDef.label;
      var count = (cardsByTab[tabDef.id] || []).length;
      if (count === 0) {
        btn.classList.add('profile-tab-empty');
        btn.setAttribute('aria-disabled', 'true');
      }
      btn.addEventListener('click', function() { activateTab(tabDef.id); });
      nav.appendChild(btn);
    });

    // Empty state placeholder for tabs without content
    TABS.forEach(function(tabDef) {
      if ((cardsByTab[tabDef.id] || []).length === 0) {
        var placeholder = document.createElement('div');
        placeholder.className = 'profile-section-card profile-tab-placeholder';
        placeholder.dataset.tab = tabDef.id;
        placeholder.dataset.placeholder = 'true';
        placeholder.innerHTML = '<h2>' + tabDef.label + '</h2><p class="profile-tab-empty-msg">No data yet for this section.</p>';
        article.appendChild(placeholder);
      }
    });

    // Insert nav before the first card (after any preamble)
    var firstCard = article.querySelector('.profile-section-card');
    if (firstCard) {
      article.insertBefore(nav, firstCard);
    } else {
      article.appendChild(nav);
    }

    article.dataset.profileTabsBuilt = 'true';

    // Restore last active tab from sessionStorage
    var savedTab = null;
    try { savedTab = sessionStorage.getItem('dm-profile-tab'); } catch(e) {}
    var initialTab = savedTab && cardsByTab[savedTab] ? savedTab : 'overview';
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
}
.profile-tab-btn.profile-tab-empty:hover {
  color: #7a7a86;
}

/* Hidden section cards */
.profile-section-card.profile-tab-hidden {
  display: none;
}

/* Empty tab placeholder */
.profile-tab-placeholder .profile-tab-empty-msg {
  color: #7a7a86;
  font-style: italic;
  font-size: 14px;
}

/* Accordion mode on mobile: show everything, hide tab nav */
article.profile-mode-accordion nav.profile-tabs {
  display: none;
}
article.profile-mode-accordion .profile-section-card.profile-tab-hidden {
  display: block;
}
article.profile-mode-accordion .profile-section-card.profile-tab-placeholder {
  display: none;
}

@media (max-width: 800px) {
  nav.profile-tabs {
    display: none;
  }
  .profile-section-card.profile-tab-hidden {
    display: block;
  }
  .profile-tab-placeholder {
    display: none;
  }
}
`

export default (() => ProfileTabs) satisfies QuartzComponentConstructor
