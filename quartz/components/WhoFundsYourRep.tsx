import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"
import { simplifySlug } from "../util/path"

interface RepEntry {
  name: string
  slug: string
  party: string
  chamber: string
  state: string
  stateAbbr: string
  district: string
  topDonors: string[]
  issues: string[]
  readiness: string
  committees: string[]
}

const WhoFundsYourRep: QuartzComponent = ({
  fileData,
  allFiles,
  cfg,
}: QuartzComponentProps) => {
  const slug = String(fileData.slug ?? "").toLowerCase()
  if (!slug.includes("interactive/who-funds-your-rep")) return null

  const baseUrl = cfg.baseUrl ?? ""
  const slashIdx = baseUrl.indexOf("/")
  const basePath = slashIdx >= 0 ? "/" + baseUrl.substring(slashIdx + 1) : ""

  // Collect politician data at build time
  const reps: RepEntry[] = []

  for (const f of allFiles) {
    const fSlug = (f.slug ?? "").toLowerCase()
    if (!fSlug.startsWith("politicians/")) continue
    if (!fSlug.includes("master-profile")) continue

    const fm = f.frontmatter
    if (!fm) continue

    const name = String(fm.title ?? "").replace(/^_/, "").replace(/\s*Master Profile.*/, "")
    const party = String(fm.party ?? "")
    const chamber = String(fm.chamber ?? "")
    const state = String(fm.state ?? "")
    const stateAbbr = String(fm["state-abbr"] ?? "")
    const district = String(fm.district ?? "")
    const topDonors = Array.isArray(fm["top-donors"]) ? fm["top-donors"] as string[] : []
    const issues = Array.isArray(fm.issues) ? fm.issues as string[] : []
    const readiness = String(fm["content-readiness"] ?? "draft")
    const committees = Array.isArray(fm.committees) ? fm.committees as string[] : []

    if (!state || state === "undefined") continue

    reps.push({
      name,
      slug: `${basePath}/${simplifySlug(f.slug!)}`,
      party,
      chamber,
      state,
      stateAbbr,
      district,
      topDonors,
      issues,
      readiness,
      committees,
    })
  }

  // Sort by state, then chamber (Senate first), then name
  reps.sort((a, b) => {
    if (a.state !== b.state) return a.state.localeCompare(b.state)
    const chamberOrder = { Senate: 0, House: 1, Governor: 2 }
    const ao = chamberOrder[a.chamber as keyof typeof chamberOrder] ?? 3
    const bo = chamberOrder[b.chamber as keyof typeof chamberOrder] ?? 3
    if (ao !== bo) return ao - bo
    return a.name.localeCompare(b.name)
  })

  // Get unique states
  const states = [...new Set(reps.map((r) => r.state))].sort()

  const dataJson = JSON.stringify(reps)

  return (
    <div class="wf-tool">
      <div id="wf-data" data-reps={dataJson} style="display:none" />

      {/* State selector */}
      <div class="wf-selector">
        <div class="wf-selector-label">SELECT YOUR STATE</div>
        <div class="wf-state-grid">
          {states.map((s) => {
            const abbr = reps.find((r) => r.state === s)?.stateAbbr ?? ""
            const count = reps.filter((r) => r.state === s).length
            return (
              <button class="wf-state-btn" data-state={s} data-abbr={abbr}>
                <span class="wf-state-abbr">{abbr}</span>
                <span class="wf-state-count">{count}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Results area */}
      <div id="wf-results" class="wf-results" style="display:none">
        <div class="wf-results-header">
          <h2 id="wf-state-title" class="wf-state-title"></h2>
          <button id="wf-back" class="wf-back-btn">All States</button>
        </div>
        <div id="wf-cards" class="wf-cards"></div>
      </div>
    </div>
  )
}

WhoFundsYourRep.afterDOMLoaded = `
function initWhoFunds() {
  var dataEl = document.getElementById('wf-data');
  if (!dataEl) return;
  var reps;
  try { reps = JSON.parse(dataEl.dataset.reps); } catch(e) { return; }

  var stateGrid = document.querySelector('.wf-state-grid');
  var results = document.getElementById('wf-results');
  var stateTitle = document.getElementById('wf-state-title');
  var cardsContainer = document.getElementById('wf-cards');
  var backBtn = document.getElementById('wf-back');
  var selector = document.querySelector('.wf-selector');

  if (!stateGrid || !results || !cardsContainer || !backBtn || !selector) return;

  function showState(stateName) {
    var stateReps = reps.filter(function(r) { return r.state === stateName; });
    if (stateReps.length === 0) return;

    selector.style.display = 'none';
    results.style.display = 'block';
    stateTitle.textContent = stateName;

    var html = '';

    // Group by chamber
    var chambers = ['Senate', 'House', 'Governor', 'Cabinet', 'SCOTUS', 'Presidential'];
    for (var c = 0; c < chambers.length; c++) {
      var chamberReps = stateReps.filter(function(r) { return r.chamber === chambers[c]; });
      if (chamberReps.length === 0) continue;

      html += '<div class="wf-chamber-group">';
      html += '<div class="wf-chamber-label">' + chambers[c].toUpperCase() + '</div>';

      for (var i = 0; i < chamberReps.length; i++) {
        var r = chamberReps[i];
        var partyClass = r.party === 'Democrat' ? 'wf-dem' : r.party === 'Republican' ? 'wf-rep' : 'wf-ind';
        var partyLetter = r.party === 'Democrat' ? 'D' : r.party === 'Republican' ? 'R' : 'I';
        var statusClass = (r.readiness === 'verified' || r.readiness === 'ready' || r.readiness === 'publication-ready') ? 'wf-sourced' : 'wf-draft';
        var statusText = (r.readiness === 'verified' || r.readiness === 'ready' || r.readiness === 'publication-ready') ? 'SOURCED' : 'DRAFT';

        html += '<a href="' + r.slug + '" class="wf-rep-card internal">';
        html += '<div class="wf-rep-top">';
        html += '<div class="wf-rep-identity">';
        html += '<span class="wf-party-badge ' + partyClass + '">' + partyLetter + '</span>';
        html += '<div class="wf-rep-name-block">';
        html += '<span class="wf-rep-name">' + r.name + '</span>';
        var meta = r.chamber;
        if (r.district && r.district !== 'undefined') meta += ' - District ' + r.district;
        html += '<span class="wf-rep-meta">' + meta + '</span>';
        html += '</div>';
        html += '</div>';
        html += '<span class="wf-status ' + statusClass + '">' + statusText + '</span>';
        html += '</div>';

        // Top donors
        if (r.topDonors && r.topDonors.length > 0) {
          html += '<div class="wf-donors-section">';
          html += '<div class="wf-donors-label">TOP DONORS</div>';
          html += '<div class="wf-donors-list">';
          var maxDonors = Math.min(r.topDonors.length, 6);
          for (var d = 0; d < maxDonors; d++) {
            html += '<span class="wf-donor-chip">' + r.topDonors[d] + '</span>';
          }
          if (r.topDonors.length > 6) {
            html += '<span class="wf-donor-more">+' + (r.topDonors.length - 6) + ' more</span>';
          }
          html += '</div>';
          html += '</div>';
        }

        // Committees
        if (r.committees && r.committees.length > 0) {
          html += '<div class="wf-committees">';
          for (var cm = 0; cm < r.committees.length; cm++) {
            html += '<span class="wf-committee-tag">' + r.committees[cm] + '</span>';
          }
          html += '</div>';
        }

        // Issues
        if (r.issues && r.issues.length > 0) {
          html += '<div class="wf-issues">';
          var maxIssues = Math.min(r.issues.length, 4);
          for (var is = 0; is < maxIssues; is++) {
            html += '<span class="wf-issue-tag">' + r.issues[is] + '</span>';
          }
          html += '</div>';
        }

        html += '</a>';
      }

      html += '</div>';
    }

    cardsContainer.innerHTML = html;
    window.scrollTo({ top: results.offsetTop - 80, behavior: 'smooth' });
  }

  // State button clicks
  var btns = stateGrid.querySelectorAll('.wf-state-btn');
  for (var b = 0; b < btns.length; b++) {
    btns[b].addEventListener('click', function() {
      showState(this.dataset.state);
    });
  }

  // Back button
  backBtn.addEventListener('click', function() {
    results.style.display = 'none';
    selector.style.display = 'block';
  });
}

initWhoFunds();
document.addEventListener('nav', function() { setTimeout(initWhoFunds, 150); });
`

WhoFundsYourRep.css = `
/* ═══════════════════════════════════════════════
   WHO FUNDS YOUR REP
   ═══════════════════════════════════════════════ */

.wf-tool {
  margin-top: 8px;
}

/* State selector */
.wf-selector-label {
  font-family: 'Space Mono', monospace;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 2px;
  color: #999;
  margin-bottom: 16px;
}

.wf-state-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(70px, 1fr));
  gap: 6px;
}

.wf-state-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 12px 4px;
  background: #ece6dd;
  border: 1px solid #ddd;
  border-radius: 0;
  cursor: pointer;
  transition: all 0.15s;
}

.wf-state-btn:hover {
  border-color: #0a0a0a;
  background: rgba(91, 141, 206, 0.06);
}

.wf-state-abbr {
  font-family: 'Space Mono', monospace;
  font-size: 16px;
  font-weight: 700;
  color: #0a0a0a;
  letter-spacing: 1px;
}

.wf-state-count {
  font-family: 'Space Mono', monospace;
  font-size: 10px;
  color: #999;
  margin-top: 2px;
}

/* Results */
.wf-results-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 1px solid #ddd;
}

.wf-state-title {
  font-size: 28px !important;
  font-weight: 700 !important;
  color: #0a0a0a !important;
  margin: 0 !important;
  border: none !important;
  padding: 0 !important;
}

.wf-back-btn {
  font-family: 'Space Mono', monospace;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 1px;
  color: #0a0a0a;
  background: rgba(91, 141, 206, 0.08);
  border: 1px solid rgba(91, 141, 206, 0.2);
  border-radius: 0;
  padding: 8px 16px;
  cursor: pointer;
  transition: all 0.15s;
}

.wf-back-btn:hover {
  background: rgba(91, 141, 206, 0.15);
  border-color: #0a0a0a;
}

/* Chamber groups */
.wf-chamber-group {
  margin-bottom: 24px;
}

.wf-chamber-label {
  font-family: 'Space Mono', monospace;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 2px;
  color: #999;
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid #ddd;
}

/* Rep cards */
.wf-rep-card {
  display: block;
  background: #ece6dd;
  border: 1px solid #ddd;
  border-radius: 0;
  padding: 20px;
  margin-bottom: 10px;
  text-decoration: none !important;
  color: inherit !important;
  transition: border-color 0.15s;
}

.wf-rep-card:hover {
  border-color: rgba(91, 141, 206, 0.3);
}

.wf-rep-top {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 14px;
}

.wf-rep-identity {
  display: flex;
  align-items: center;
  gap: 12px;
}

.wf-party-badge {
  font-family: 'Space Mono', monospace;
  font-size: 14px;
  font-weight: 700;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 0;
  flex-shrink: 0;
}

.wf-dem {
  color: #3b82f6;
  background: rgba(59, 130, 246, 0.15);
}

.wf-rep {
  color: #e63946;
  background: rgba(239, 68, 68, 0.15);
}

.wf-ind {
  color: #fbbf24;
  background: rgba(245, 158, 11, 0.15);
}

.wf-rep-name-block {
  display: flex;
  flex-direction: column;
}

.wf-rep-name {
  font-size: 16px;
  font-weight: 600;
  color: #0a0a0a;
}

.wf-rep-meta {
  font-family: 'Space Mono', monospace;
  font-size: 10px;
  color: #999;
  letter-spacing: 0.5px;
  margin-top: 2px;
}

.wf-status {
  font-family: 'Space Mono', monospace;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 1px;
  padding: 3px 8px;
  border-radius: 0;
  flex-shrink: 0;
}

.wf-verified {
  color: #16a34a;
  background: rgba(34, 197, 94, 0.12);
}

.wf-draft {
  color: #fbbf24;
  background: rgba(245, 158, 11, 0.12);
}

/* Donors section */
.wf-donors-section {
  margin-bottom: 10px;
}

.wf-donors-label {
  font-family: 'Space Mono', monospace;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 1.5px;
  color: #16a34a;
  margin-bottom: 8px;
}

.wf-donors-list {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
}

.wf-donor-chip {
  font-size: 11px;
  font-weight: 500;
  color: #333;
  background: rgba(34, 197, 94, 0.06);
  border: 1px solid rgba(34, 197, 94, 0.12);
  padding: 4px 10px;
  border-radius: 0;
}

.wf-donor-more {
  font-family: 'Space Mono', monospace;
  font-size: 10px;
  color: #999;
  padding: 4px 8px;
}

/* Committees */
.wf-committees {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-bottom: 8px;
}

.wf-committee-tag {
  font-family: 'Space Mono', monospace;
  font-size: 10px;
  color: #0a0a0a;
  background: rgba(91, 141, 206, 0.06);
  padding: 2px 8px;
  border-radius: 0;
}

/* Issues */
.wf-issues {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.wf-issue-tag {
  font-family: 'Space Mono', monospace;
  font-size: 10px;
  color: #777;
  background: rgba(161, 161, 170, 0.06);
  padding: 2px 6px;
  border-radius: 0;
}

/* Mobile */
@media (max-width: 800px) {
  .wf-state-grid {
    grid-template-columns: repeat(auto-fill, minmax(56px, 1fr));
    gap: 4px;
  }

  .wf-state-btn {
    padding: 8px 2px;
  }

  .wf-state-abbr {
    font-size: 13px;
  }

  .wf-rep-card {
    padding: 14px;
  }

  .wf-rep-name {
    font-size: 14px;
  }

  .wf-party-badge {
    width: 28px;
    height: 28px;
    font-size: 12px;
  }
}
`

export default (() => WhoFundsYourRep) satisfies QuartzComponentConstructor
