import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"

/**
 * ProfileAsk — per-profile pre-filled Ask buttons.
 *
 * Renders a "ASK ABOUT [NAME]" section on every profile page of a
 * publishable type (politician, donor, corp, pac, think-tank,
 * lobbying-firm). Shows 3 pre-filled prompt buttons tuned to the
 * profile's type. Clicking a button fetches /api/ask inline and
 * renders a simplified response right below the buttons.
 *
 * Every prompt in the button set has been pre-verified against the
 * live Ask engine to ensure it maps to a real intent (not the
 * generic fallback). See the scripts/ask-golden-snapshot harness +
 * the one-off prompt audit in the session that shipped this.
 *
 * Design decisions (see session notes):
 *   - A1 click behavior: inline-expand, keep reader in profile
 *     context; "See full answer" link goes to /Ask for drill-down
 *   - B simplified renderer: answer line + top 5 rows + link
 *   - C current-cycle default: the underlying summary intent
 *     already surfaces current-cycle card from Phase 4
 *   - D prompts cut to verified-working only
 *   - E degrades gracefully when API unreachable (thedonormap.org
 *     has no Ask backend deployed yet — buttons render, click shows
 *     "coming soon" message)
 *   - F type-aware button set means impossible prompts never render
 *     (a donor never sees "who funds them")
 *
 * Free tier v1 = 3 pre-filled prompts. Paid tier (future) adds a
 * free-form input + 2-3 advanced prompts; a data-user-tier attribute
 * on the root element controls this.
 */

const PROFILE_TYPES_WITH_ASK = new Set<string>([
  "politician", "state-politician", "local-politician",
  "donor", "corporation", "pac", "think-tank", "lobbying-firm",
])

const ProfileAsk: QuartzComponent = ({ fileData }: QuartzComponentProps) => {
  const fm = fileData.frontmatter
  if (!fm) return null
  const type = String(fm.type ?? "").toLowerCase()
  if (!PROFILE_TYPES_WITH_ASK.has(type)) return null

  // Pull the display name. Strip "_" prefix + "Master Profile" suffix
  // to match how the rest of the site resolves entity names.
  const rawTitle = String(fm.title ?? "")
  const name = rawTitle.replace(/^_/, "").replace(/\s+Master Profile.*/i, "").trim()
  if (!name) return null

  return (
    <section
      class="profile-ask"
      data-profile-ask-root
      data-profile-name={name}
      data-profile-type={type}
      data-user-tier="free"
    >
      <div class="profile-ask-header">
        <h2 class="profile-ask-title">Ask about {name}</h2>
        <p class="profile-ask-hint">
          Pattern-matched queries against the donor graph — every answer traces to a specific
          edge record. Click a question to see the answer inline, or use the full{" "}
          <a href="/Ask" class="internal">Ask page</a> for free-form queries.
        </p>
      </div>
      <div class="profile-ask-buttons" data-profile-ask-buttons></div>
      <div class="profile-ask-result" data-profile-ask-result></div>
      <div class="profile-ask-footer">
        <span class="profile-ask-tier-badge">Free tier</span>
        <span class="profile-ask-tier-hint">
          3 pre-filled questions shown. Paid tier adds free-form input + advanced queries.
        </span>
      </div>
    </section>
  )
}

ProfileAsk.afterDOMLoaded = `
(function() {
  // Client-side wiring for the per-profile Ask widget. Reads the
  // profile's name + type from the root element's data-* attributes,
  // renders the right 3 prompt buttons, and handles click -> fetch ->
  // simplified render inline.
  //
  // Backend URL resolution mirrors askPanel.inline.ts: window.ASK_API_URL
  // override first, then localhost:3333 default. On the public live
  // site neither is reachable yet — we render the buttons but the
  // click shows a "coming soon" card. Degradation is intentional.
  var API_URL = (typeof window !== 'undefined' && window.ASK_API_URL) || 'http://localhost:3333/api/ask';

  // Prompt set per profile type. Every entry here was verified against
  // the live Ask engine to map to a real intent (not generic fallback).
  // If you add a prompt, TEST IT FIRST. Generic-fallback buttons
  // embarrass the product.
  var PROMPTS = {
    'politician':         ['tell me about {name}',    'who funds {name}',     '{name} voting record'],
    'state-politician':   ['tell me about {name}',    'who funds {name}',     '{name} voting record'],
    'local-politician':   ['tell me about {name}',    'who funds {name}',     '{name} voting record'],
    'donor':              ['tell me about {name}',    'what does {name} fund', 'what boards is {name} on'],
    'corporation':        ['tell me about {name}',    'what does {name} fund', 'who is on the board of {name}'],
    'pac':                ['tell me about {name}',    'what does {name} fund', 'who is on the board of {name}'],
    'think-tank':         ['tell me about {name}',    'who funds {name}',      'who is on the board of {name}'],
    'lobbying-firm':      ['tell me about {name}',    'what does {name} fund', 'who is on the board of {name}'],
  };

  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function fmtUsd(n) {
    var num = typeof n === 'number' ? n : Number(n);
    if (!num || isNaN(num)) return '—';
    var a = Math.abs(num);
    if (a >= 1e9) return '$' + (num / 1e9).toFixed(2) + 'B';
    if (a >= 10e6) return '$' + Math.round(num / 1e6) + 'M';
    if (a >= 1e6) return '$' + (num / 1e6).toFixed(1) + 'M';
    if (a >= 10e3) return '$' + Math.round(num / 1e3) + 'K';
    if (a >= 1e3) return '$' + (num / 1e3).toFixed(1) + 'K';
    return '$' + Math.round(num).toLocaleString();
  }

  function initProfileAsk() {
    var root = document.querySelector('[data-profile-ask-root]');
    if (!root) return;
    var name = root.getAttribute('data-profile-name') || '';
    var type = (root.getAttribute('data-profile-type') || '').toLowerCase();
    var btnContainer = root.querySelector('[data-profile-ask-buttons]');
    var resultContainer = root.querySelector('[data-profile-ask-result]');
    if (!btnContainer || !resultContainer) return;

    var promptList = PROMPTS[type] || [];
    if (promptList.length === 0) return;

    // Render buttons
    promptList.forEach(function(tpl) {
      var q = tpl.replace('{name}', name);
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'profile-ask-btn';
      btn.textContent = q;
      btn.addEventListener('click', function() { runPrompt(q); });
      btnContainer.appendChild(btn);
    });

    function runPrompt(q) {
      // Clear prior result, mark the clicked button as active
      resultContainer.innerHTML = '<div class="profile-ask-loading">Querying the donor graph…</div>';
      Array.prototype.forEach.call(btnContainer.querySelectorAll('.profile-ask-btn'), function(b) {
        b.classList.toggle('profile-ask-btn-active', b.textContent === q);
      });
      fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: q }),
      })
        .then(function(r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
        .then(function(data) { renderResult(data, q); })
        .catch(function(err) { renderUnreachable(q, err); });
    }

    function renderResult(data, q) {
      if (!data) { renderUnreachable(q, new Error('empty response')); return; }
      var blocks = [];
      blocks.push('<div class="profile-ask-response">');
      if (data.intent === 'generic' && data.total === 0) {
        // This should be rare given we pre-verified prompts, but belt-and-
        // suspenders: render the rephrase hint instead of zero rows.
        blocks.push('<div class="profile-ask-answer">' + esc(data.plain_english || "Couldn't match this to a query shape — try the full Ask page.") + '</div>');
      } else {
        // Answer line (markdown ** → <strong>)
        if (data.answer) {
          var ans = esc(data.answer).replace(/\\*\\*([^*]+)\\*\\*/g, '<strong>$1</strong>');
          blocks.push('<div class="profile-ask-answer">' + ans + '</div>');
        }
        // Top 5 rows — simplified table
        if (data.rows && data.rows.length > 0) {
          var top5 = data.rows.slice(0, 5);
          blocks.push('<table class="profile-ask-table"><tbody>');
          top5.forEach(function(r) {
            var lhs = r.from || r.name || '';
            var rhs = r.to && r.to !== lhs ? ' → ' + r.to : '';
            var amt = typeof r.amount === 'number' ? fmtUsd(r.amount) : '';
            var cycle = r.cycle ? ' <span class="profile-ask-cycle">(' + esc(String(r.cycle)) + ')</span>' : '';
            blocks.push('<tr><td>' + esc(lhs) + esc(rhs) + cycle + '</td><td class="profile-ask-amt">' + esc(amt) + '</td></tr>');
          });
          blocks.push('</tbody></table>');
          if (data.total > 5) {
            blocks.push('<div class="profile-ask-more-note">Showing 5 of ' + data.total + ' results.</div>');
          }
        }
      }
      blocks.push('<div class="profile-ask-drill"><a class="internal" href="/Ask?q=' + encodeURIComponent(q) + '">See full answer on Ask page →</a></div>');
      blocks.push('</div>');
      resultContainer.innerHTML = blocks.join('');
    }

    function renderUnreachable(q, err) {
      resultContainer.innerHTML =
        '<div class="profile-ask-unreachable">' +
        '<div class="profile-ask-answer">Ask backend not reachable from this site yet.</div>' +
        '<div class="profile-ask-more-note">The graph query engine currently runs locally only. A public endpoint is planned for May 2026. Until then this button is a feature preview.</div>' +
        '<div class="profile-ask-drill"><a class="internal" href="/Ask?q=' + encodeURIComponent(q) + '">Open in /Ask →</a></div>' +
        '</div>';
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initProfileAsk);
  } else {
    initProfileAsk();
  }
})();
`

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore — Quartz convention for raw-text SCSS imports
import profileAskStyle from "./styles/profileAsk.scss"
ProfileAsk.css = profileAskStyle

export default (() => ProfileAsk) satisfies QuartzComponentConstructor
