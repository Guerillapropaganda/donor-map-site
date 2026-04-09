import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"

const AdminBar: QuartzComponent = () => {
  return (
    <div id="admin-bar-root" style={{ display: "none" }}>
      {/* Login screen */}
      <div id="admin-login" class="admin-login">
        <div class="admin-login-card">
          <div class="admin-login-header">DONOR MAP OPS</div>
          <input type="password" id="admin-password" class="admin-input" placeholder="Password" />
          <button id="admin-login-btn" class="admin-btn admin-btn-primary">Log In</button>
          <div id="admin-login-error" class="admin-error" style={{ display: "none" }}>Wrong password</div>
        </div>
      </div>

      {/* Admin toolbar */}
      <div id="admin-toolbar" class="admin-toolbar" style={{ display: "none" }}>
        <div class="admin-toolbar-left">
          <span class="admin-toolbar-logo">OPS</span>
          <span class="admin-toolbar-page" id="admin-page-title"></span>
        </div>
        <div class="admin-toolbar-center">
          <button id="admin-check-urls" class="admin-tool-btn">
            <span class="admin-tool-icon">&#x1F517;</span> Check URLs
          </button>
          <button id="admin-add-note" class="admin-tool-btn">
            <span class="admin-tool-icon">&#x1F4DD;</span> Add Note
          </button>
          <button id="admin-view-queue" class="admin-tool-btn">
            <span class="admin-tool-icon">&#x1F4CB;</span> Queue <span id="admin-queue-count" class="admin-badge">0</span>
          </button>
        </div>
        <div class="admin-toolbar-right">
          <span id="admin-status" class="admin-status"></span>
          <button id="admin-logout" class="admin-tool-btn admin-tool-btn-dim">Logout</button>
        </div>
      </div>

      {/* URL check results overlay */}
      <div id="admin-url-results" class="admin-panel" style={{ display: "none" }}>
        <div class="admin-panel-header">
          <span>URL Health Check</span>
          <button id="admin-url-close" class="admin-close">&times;</button>
        </div>
        <div id="admin-url-list" class="admin-panel-body"></div>
        <div class="admin-panel-footer">
          <span id="admin-url-summary"></span>
        </div>
      </div>

      {/* Notes panel */}
      <div id="admin-notes-panel" class="admin-panel admin-panel-right" style={{ display: "none" }}>
        <div class="admin-panel-header">
          <span>Page Notes</span>
          <button id="admin-notes-close" class="admin-close">&times;</button>
        </div>
        <div id="admin-notes-list" class="admin-panel-body"></div>
        <div class="admin-notes-form">
          <select id="admin-note-type" class="admin-select">
            <option value="code">Code Fix</option>
            <option value="research">Research</option>
            <option value="data">Data Issue</option>
            <option value="style">Style Issue</option>
            <option value="question">Question</option>
          </select>
          <select id="admin-note-priority" class="admin-select">
            <option value="normal">Normal</option>
            <option value="urgent">Urgent</option>
          </select>
          <textarea id="admin-note-text" class="admin-textarea" placeholder="Describe the issue..."></textarea>
          <button id="admin-note-save" class="admin-btn admin-btn-primary">Save Note</button>
        </div>
      </div>

      {/* Queue panel */}
      <div id="admin-queue-panel" class="admin-panel admin-panel-right" style={{ display: "none" }}>
        <div class="admin-panel-header">
          <span>Fix Queue</span>
          <button id="admin-queue-close" class="admin-close">&times;</button>
        </div>
        <div id="admin-queue-list" class="admin-panel-body"></div>
      </div>
    </div>
  )
}

AdminBar.css = `
/* Admin Bar — only visible in admin mode */
#admin-bar-root { z-index: 99999; }

.admin-login {
  position: fixed; inset: 0;
  background: rgba(12, 12, 15, 0.95);
  display: flex; align-items: center; justify-content: center;
  z-index: 100000;
}
.admin-login-card {
  background: #e5dfd6; border: 1px solid #ddd; border-radius: 12px;
  padding: 32px; width: 320px; text-align: center;
}
.admin-login-header {
  font-family: "Space Mono", monospace; font-size: 11px;
  letter-spacing: 0.2em; color: #0a0a0a; margin-bottom: 24px;
}
.admin-input {
  width: 100%; background: #f5f0eb; border: 1px solid #ddd;
  border-radius: 0; padding: 12px 16px; color: #0a0a0a;
  font-family: "Space Mono", monospace; font-size: 13px;
  outline: none; margin-bottom: 12px; box-sizing: border-box;
}
.admin-input:focus { border-color: #0a0a0a; }
.admin-error { color: #e63946; font-size: 11px; margin-top: 8px; font-family: "Space Mono", monospace; }

.admin-btn {
  padding: 10px 20px; border-radius: 0; border: none;
  font-family: "Space Mono", monospace; font-size: 12px;
  cursor: pointer; transition: all 0.2s;
}
.admin-btn-primary {
  background: rgba(91, 141, 206, 0.15); color: #0a0a0a;
  border: 1px solid rgba(91, 141, 206, 0.3); width: 100%;
}
.admin-btn-primary:hover { background: rgba(91, 141, 206, 0.25); }

.admin-toolbar {
  position: fixed; top: 0; left: 0; right: 0; height: 40px;
  background: #e5dfd6; border-bottom: 1px solid #ddd;
  display: flex; align-items: center; justify-content: space-between;
  padding: 0 16px; z-index: 99999;
  font-family: "Space Mono", monospace;
}
.admin-toolbar-left { display: flex; align-items: center; gap: 12px; }
.admin-toolbar-center { display: flex; align-items: center; gap: 4px; }
.admin-toolbar-right { display: flex; align-items: center; gap: 12px; }
.admin-toolbar-logo {
  font-size: 10px; font-weight: bold; letter-spacing: 0.15em;
  color: #0a0a0a; background: rgba(91, 141, 206, 0.1);
  padding: 3px 8px; border-radius: 0;
}
.admin-toolbar-page {
  font-size: 10px; color: #999; max-width: 200px;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.admin-tool-btn {
  background: transparent; border: 1px solid transparent;
  color: #0a0a0a; font-family: "Space Mono", monospace;
  font-size: 11px; padding: 5px 12px; border-radius: 0;
  cursor: pointer; transition: all 0.2s; display: flex;
  align-items: center; gap: 5px;
}
.admin-tool-btn:hover { background: #ddd; border-color: #ddd; }
.admin-tool-btn-dim { color: #999; }
.admin-tool-icon { font-size: 13px; }
.admin-badge {
  font-size: 9px; background: #e63946; color: white;
  padding: 1px 5px; border-radius: 0; min-width: 14px;
  text-align: center;
}
.admin-status {
  font-size: 9px; color: #999;
}

/* Panels */
.admin-panel {
  position: fixed; top: 40px; left: 50%; transform: translateX(-50%);
  width: 600px; max-height: 70vh; background: #e5dfd6;
  border: 1px solid #ddd; border-radius: 0 0 12px 12px;
  z-index: 99998; display: flex; flex-direction: column;
  font-family: "Space Mono", monospace;
}
.admin-panel-right {
  left: auto; right: 16px; transform: none;
  width: 380px; border-radius: 0 0 12px 12px;
}
.admin-panel-header {
  display: flex; justify-content: space-between; align-items: center;
  padding: 12px 16px; border-bottom: 1px solid #ddd;
  font-size: 11px; color: #0a0a0a; font-weight: bold;
}
.admin-close {
  background: none; border: none; color: #999; font-size: 18px;
  cursor: pointer; padding: 0 4px;
}
.admin-close:hover { color: #0a0a0a; }
.admin-panel-body {
  flex: 1; overflow-y: auto; padding: 12px 16px;
}
.admin-panel-footer {
  padding: 10px 16px; border-top: 1px solid #ddd;
  font-size: 10px; color: #999;
}

/* URL check items */
.admin-url-item {
  display: flex; align-items: flex-start; gap: 8px;
  padding: 6px 0; border-bottom: 1px solid #ddd;
  font-size: 10px;
}
.admin-url-dot {
  width: 8px; height: 8px; border-radius: 50%;
  flex-shrink: 0; margin-top: 3px;
}
.admin-url-dot-ok { background: #16a34a; }
.admin-url-dot-fail { background: #e63946; }
.admin-url-dot-slow { background: #fbbf24; }
.admin-url-dot-checking { background: #0a0a0a; animation: pulse-admin 1s infinite; }
.admin-url-info { flex: 1; min-width: 0; }
.admin-url-label { color: #0a0a0a; margin-bottom: 2px; }
.admin-url-link { color: #999; word-break: break-all; font-size: 9px; }
.admin-url-status { font-size: 9px; color: #999; flex-shrink: 0; }
.admin-url-flag {
  background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.3);
  color: #e63946; font-size: 9px; padding: 2px 6px; border-radius: 0;
  cursor: pointer; flex-shrink: 0; font-family: "Space Mono", monospace;
}
.admin-url-flag:hover { background: rgba(239, 68, 68, 0.2); }

/* Notes */
.admin-notes-form {
  padding: 12px 16px; border-top: 1px solid #ddd;
  display: flex; flex-direction: column; gap: 8px;
}
.admin-select {
  background: #f5f0eb; border: 1px solid #ddd; border-radius: 0;
  padding: 6px 10px; color: #0a0a0a; font-family: "Space Mono", monospace;
  font-size: 10px; outline: none;
}
.admin-textarea {
  background: #f5f0eb; border: 1px solid #ddd; border-radius: 0;
  padding: 8px 10px; color: #0a0a0a; font-family: "Space Mono", monospace;
  font-size: 11px; outline: none; resize: vertical; min-height: 60px;
}
.admin-textarea:focus, .admin-select:focus { border-color: #0a0a0a; }

.admin-note-item {
  background: #f5f0eb; border-radius: 0; padding: 10px;
  margin-bottom: 8px; font-size: 10px;
}
.admin-note-meta {
  display: flex; gap: 6px; margin-bottom: 4px;
}
.admin-note-tag {
  font-size: 8px; padding: 1px 5px; border-radius: 0;
  text-transform: uppercase; letter-spacing: 0.05em;
}
.admin-note-tag-code { background: rgba(91, 141, 206, 0.15); color: #0a0a0a; }
.admin-note-tag-research { background: rgba(168, 85, 247, 0.15); color: #a855f7; }
.admin-note-tag-data { background: rgba(34, 197, 94, 0.15); color: #16a34a; }
.admin-note-tag-style { background: rgba(245, 158, 11, 0.15); color: #fbbf24; }
.admin-note-tag-question { background: rgba(6, 182, 212, 0.15); color: #06b6d4; }
.admin-note-tag-urgent { background: rgba(239, 68, 68, 0.15); color: #e63946; }
.admin-note-text { color: #0a0a0a; line-height: 1.5; }
.admin-note-date { color: #999; margin-top: 4px; font-size: 9px; }

/* Queue items */
.admin-queue-item {
  display: flex; align-items: center; gap: 8px;
  padding: 8px 0; border-bottom: 1px solid #ddd; font-size: 10px;
}
.admin-queue-status { font-size: 8px; padding: 2px 6px; border-radius: 0; text-transform: uppercase; }
.admin-queue-open { background: rgba(239, 68, 68, 0.15); color: #e63946; }
.admin-queue-done { background: rgba(34, 197, 94, 0.15); color: #16a34a; }

/* Push body down when toolbar active */
body.admin-mode { padding-top: 40px !important; }

@keyframes pulse-admin {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}
`

AdminBar.afterDOMLoaded = `
(function() {
  const STORAGE_KEY = 'donor-map-admin';
  const QUEUE_KEY = 'donor-map-fix-queue';
  const NOTES_KEY = 'donor-map-notes';

  const root = document.getElementById('admin-bar-root');
  if (!root) return;

  // Check if admin mode requested
  const params = new URLSearchParams(window.location.search);
  const isAdminUrl = params.has('admin');
  const savedSession = localStorage.getItem(STORAGE_KEY);

  if (!isAdminUrl && !savedSession) return;

  // Show admin root
  root.style.display = 'block';

  // Password hash check (simple but effective for single user)
  const PASS_HASH = 'bf2e7784ae3f082f5c9728a1e8dd9b478eac07a355981ceb7b0076d49b573efb'; // default: 'donormap'

  async function hashPassword(pw) {
    const encoder = new TextEncoder();
    const data = encoder.encode(pw);
    const hash = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
  }

  // Get stored password hash
  function getStoredHash() {
    return localStorage.getItem('donor-map-admin-hash') || PASS_HASH;
  }

  function setPassword(hash) {
    localStorage.setItem('donor-map-admin-hash', hash);
  }

  // Elements
  const loginScreen = document.getElementById('admin-login');
  const toolbar = document.getElementById('admin-toolbar');
  const passwordInput = document.getElementById('admin-password');
  const loginBtn = document.getElementById('admin-login-btn');
  const loginError = document.getElementById('admin-login-error');
  const pageTitle = document.getElementById('admin-page-title');
  const statusEl = document.getElementById('admin-status');

  // If we have a saved session, skip login
  if (savedSession) {
    loginScreen.style.display = 'none';
    toolbar.style.display = 'flex';
    document.body.classList.add('admin-mode');
    initAdmin();
  }

  // Login handler
  loginBtn?.addEventListener('click', async () => {
    const pw = passwordInput.value;
    const hash = await hashPassword(pw);
    const stored = getStoredHash();

    if (hash === stored) {
      localStorage.setItem(STORAGE_KEY, 'true');
      loginScreen.style.display = 'none';
      toolbar.style.display = 'flex';
      document.body.classList.add('admin-mode');
      loginError.style.display = 'none';

      // Clean URL
      const url = new URL(window.location.href);
      url.searchParams.delete('admin');
      window.history.replaceState({}, '', url);

      initAdmin();
    } else {
      loginError.style.display = 'block';
      passwordInput.value = '';
    }
  });

  passwordInput?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') loginBtn.click();
  });

  // Logout
  document.getElementById('admin-logout')?.addEventListener('click', () => {
    localStorage.removeItem(STORAGE_KEY);
    root.style.display = 'none';
    document.body.classList.remove('admin-mode');
    toolbar.style.display = 'none';
  });

  // ===== Admin functionality =====
  function initAdmin() {
    // Set page title
    const h1 = document.querySelector('article h1, .article-title');
    pageTitle.textContent = h1?.textContent || document.title || 'Unknown Page';

    // Load queue count
    updateQueueBadge();
    loadNotes();

    // URL checker
    document.getElementById('admin-check-urls')?.addEventListener('click', checkUrls);
    document.getElementById('admin-url-close')?.addEventListener('click', () => {
      document.getElementById('admin-url-results').style.display = 'none';
    });

    // Notes
    document.getElementById('admin-add-note')?.addEventListener('click', () => {
      closeAllPanels();
      document.getElementById('admin-notes-panel').style.display = 'flex';
      loadNotes();
    });
    document.getElementById('admin-notes-close')?.addEventListener('click', () => {
      document.getElementById('admin-notes-panel').style.display = 'none';
    });
    document.getElementById('admin-note-save')?.addEventListener('click', saveNote);

    // Queue
    document.getElementById('admin-view-queue')?.addEventListener('click', () => {
      closeAllPanels();
      document.getElementById('admin-queue-panel').style.display = 'flex';
      loadQueue();
    });
    document.getElementById('admin-queue-close')?.addEventListener('click', () => {
      document.getElementById('admin-queue-panel').style.display = 'none';
    });

    // Keyboard shortcut — press 'A' to toggle panels
    document.addEventListener('keydown', (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      if (e.key === 'Escape') closeAllPanels();
    });
  }

  function closeAllPanels() {
    document.getElementById('admin-url-results').style.display = 'none';
    document.getElementById('admin-notes-panel').style.display = 'none';
    document.getElementById('admin-queue-panel').style.display = 'none';
  }

  function getPageSlug() {
    return window.location.pathname.replace(/\\/$/, '') || '/index';
  }

  // ===== URL Checker =====
  async function checkUrls() {
    closeAllPanels();
    const panel = document.getElementById('admin-url-results');
    const list = document.getElementById('admin-url-list');
    const summary = document.getElementById('admin-url-summary');
    panel.style.display = 'flex';
    list.innerHTML = '';
    summary.textContent = 'Checking...';
    statusEl.textContent = 'Scanning URLs...';

    // Find all links in the article content
    const article = document.querySelector('article') || document.querySelector('.center');
    if (!article) {
      list.innerHTML = '<div style="color:#999;font-size:11px;padding:20px 0;">No content found on this page</div>';
      summary.textContent = '';
      statusEl.textContent = '';
      return;
    }

    const links = Array.from(article.querySelectorAll('a[href^="http"]'));
    if (links.length === 0) {
      list.innerHTML = '<div style="color:#999;font-size:11px;padding:20px 0;">No external URLs found</div>';
      summary.textContent = '';
      statusEl.textContent = '';
      return;
    }

    let ok = 0, fail = 0, slow = 0;

    for (const link of links) {
      const url = link.href;
      const label = link.textContent?.trim() || url;
      const item = document.createElement('div');
      item.className = 'admin-url-item';
      item.innerHTML = '<div class="admin-url-dot admin-url-dot-checking"></div>' +
        '<div class="admin-url-info"><div class="admin-url-label">' + escHtml(label) + '</div>' +
        '<div class="admin-url-link">' + escHtml(url) + '</div></div>' +
        '<div class="admin-url-status">Checking...</div>';
      list.appendChild(item);

      try {
        const start = Date.now();
        const res = await fetch(url, { method: 'HEAD', mode: 'no-cors', signal: AbortSignal.timeout(8000) });
        const elapsed = Date.now() - start;

        // no-cors returns opaque response, so we can only tell if it didn't throw
        const dot = item.querySelector('.admin-url-dot');
        const status = item.querySelector('.admin-url-status');

        if (elapsed > 5000) {
          dot.className = 'admin-url-dot admin-url-dot-slow';
          status.textContent = elapsed + 'ms (slow)';
          slow++;
        } else {
          dot.className = 'admin-url-dot admin-url-dot-ok';
          status.textContent = elapsed + 'ms';
          ok++;
        }
      } catch (e) {
        const dot = item.querySelector('.admin-url-dot');
        const status = item.querySelector('.admin-url-status');
        dot.className = 'admin-url-dot admin-url-dot-fail';
        status.textContent = 'Failed';
        fail++;

        // Add flag button
        const flagBtn = document.createElement('button');
        flagBtn.className = 'admin-url-flag';
        flagBtn.textContent = 'Flag';
        flagBtn.addEventListener('click', () => flagUrl(url, label));
        item.appendChild(flagBtn);
      }

      summary.textContent = ok + ' OK / ' + fail + ' broken / ' + slow + ' slow — ' + (ok + fail + slow) + '/' + links.length;
    }

    statusEl.textContent = fail > 0 ? fail + ' broken URLs' : 'All URLs OK';
  }

  function flagUrl(url, label) {
    const queue = JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]');
    queue.push({
      url, label,
      page: getPageSlug(),
      pageTitle: pageTitle.textContent,
      status: 'open',
      date: new Date().toISOString(),
    });
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
    updateQueueBadge();
    statusEl.textContent = 'URL flagged for fix';
  }

  // ===== Notes =====
  function loadNotes() {
    const allNotes = JSON.parse(localStorage.getItem(NOTES_KEY) || '[]');
    const pageNotes = allNotes.filter(n => n.page === getPageSlug());
    const list = document.getElementById('admin-notes-list');
    if (!list) return;

    if (pageNotes.length === 0) {
      list.innerHTML = '<div style="color:#999;font-size:11px;padding:20px 0;">No notes on this page yet</div>';
      return;
    }

    list.innerHTML = pageNotes.map(n => {
      const tagClass = 'admin-note-tag-' + n.type;
      return '<div class="admin-note-item">' +
        '<div class="admin-note-meta">' +
        '<span class="admin-note-tag ' + tagClass + '">' + n.type + '</span>' +
        (n.priority === 'urgent' ? '<span class="admin-note-tag admin-note-tag-urgent">urgent</span>' : '') +
        '</div>' +
        '<div class="admin-note-text">' + escHtml(n.text) + '</div>' +
        '<div class="admin-note-date">' + new Date(n.date).toLocaleDateString() + '</div>' +
        '</div>';
    }).join('');
  }

  function saveNote() {
    const text = document.getElementById('admin-note-text').value.trim();
    if (!text) return;

    const type = document.getElementById('admin-note-type').value;
    const priority = document.getElementById('admin-note-priority').value;
    const allNotes = JSON.parse(localStorage.getItem(NOTES_KEY) || '[]');

    allNotes.push({
      text, type, priority,
      page: getPageSlug(),
      pageTitle: pageTitle.textContent,
      date: new Date().toISOString(),
      status: 'open',
    });

    localStorage.setItem(NOTES_KEY, JSON.stringify(allNotes));
    document.getElementById('admin-note-text').value = '';
    loadNotes();
    statusEl.textContent = 'Note saved';
  }

  // ===== Queue =====
  function loadQueue() {
    const queue = JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]');
    const allNotes = JSON.parse(localStorage.getItem(NOTES_KEY) || '[]');
    const list = document.getElementById('admin-queue-list');
    if (!list) return;

    const items = [
      ...queue.map(q => ({ ...q, kind: 'url' })),
      ...allNotes.map(n => ({ ...n, kind: 'note' })),
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    if (items.length === 0) {
      list.innerHTML = '<div style="color:#999;font-size:11px;padding:20px 0;">Queue is empty</div>';
      return;
    }

    list.innerHTML = items.map(item => {
      if (item.kind === 'url') {
        return '<div class="admin-queue-item">' +
          '<span class="admin-queue-status admin-queue-open">broken url</span>' +
          '<div style="flex:1;min-width:0;">' +
          '<div style="color:#0a0a0a;margin-bottom:2px;">' + escHtml(item.label || item.url) + '</div>' +
          '<div style="color:#999;font-size:9px;">' + escHtml(item.pageTitle || item.page) + '</div>' +
          '</div>' +
          '<div style="color:#999;font-size:9px;">' + new Date(item.date).toLocaleDateString() + '</div>' +
          '</div>';
      } else {
        const tagClass = 'admin-note-tag-' + item.type;
        return '<div class="admin-queue-item">' +
          '<span class="admin-note-tag ' + tagClass + '">' + item.type + '</span>' +
          '<div style="flex:1;min-width:0;">' +
          '<div style="color:#0a0a0a;margin-bottom:2px;">' + escHtml(item.text?.substring(0, 80)) + '</div>' +
          '<div style="color:#999;font-size:9px;">' + escHtml(item.pageTitle || item.page) + '</div>' +
          '</div>' +
          '<div style="color:#999;font-size:9px;">' + new Date(item.date).toLocaleDateString() + '</div>' +
          '</div>';
      }
    }).join('');
  }

  function updateQueueBadge() {
    const queue = JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]');
    const notes = JSON.parse(localStorage.getItem(NOTES_KEY) || '[]');
    const count = queue.length + notes.filter(n => n.status === 'open').length;
    const badge = document.getElementById('admin-queue-count');
    if (badge) {
      badge.textContent = count;
      badge.style.display = count > 0 ? 'inline' : 'none';
    }
  }

  function escHtml(str) {
    const div = document.createElement('div');
    div.textContent = str || '';
    return div.innerHTML;
  }
})();
`

export default (() => AdminBar) satisfies QuartzComponentConstructor
