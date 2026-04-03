import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"
import { simplifySlug } from "../util/path"

// Only real policy issues, not donor names
const VALID_ISSUES = new Set([
  "Dark Money & Campaign Finance",
  "Technology",
  "Healthcare",
  "Energy & Climate",
  "Wall Street & Finance",
  "Defense & Military",
  "Israel & Foreign Policy",
  "Labor & Workers",
  "Housing",
  "Agriculture",
  "Immigration",
  "Infrastructure",
  "Antitrust & Monopoly",
  "Education",
  "Environment",
  "Trade",
  "Social Safety Net",
  "Tax Policy",
  "Criminal Justice",
  "Voting Rights",
  "Reproductive Rights",
  "Gun Policy",
])

// Issue → color mapping
const ISSUE_COLORS: Record<string, string> = {
  "Dark Money & Campaign Finance": "red",
  "Technology": "blue",
  "Healthcare": "purple",
  "Energy & Climate": "orange",
  "Wall Street & Finance": "green",
  "Defense & Military": "red",
  "Israel & Foreign Policy": "amber",
  "Labor & Workers": "blue",
  "Housing": "orange",
  "Agriculture": "green",
  "Immigration": "amber",
  "Infrastructure": "steel",
  "Antitrust & Monopoly": "steel",
  "Education": "blue",
  "Environment": "green",
  "Trade": "steel",
  "Social Safety Net": "purple",
  "Tax Policy": "amber",
  "Criminal Justice": "red",
  "Voting Rights": "blue",
  "Reproductive Rights": "purple",
  "Gun Policy": "red",
}

interface IssueProfile {
  name: string
  slug: string
  type: string
  sector: string
  party: string
  chamber: string
  readiness: string
}

interface IssueData {
  issue: string
  color: string
  donors: IssueProfile[]
  politicians: IssueProfile[]
  stories: IssueProfile[]
  total: number
}

const IssueExplorer: QuartzComponent = ({
  fileData,
  allFiles,
  cfg,
}: QuartzComponentProps) => {
  const slug = String(fileData.slug ?? "").toLowerCase()
  if (!slug.includes("interactive/issues")) return null

  const baseUrl = cfg.baseUrl ?? ""
  const slashIdx = baseUrl.indexOf("/")
  const basePath = slashIdx >= 0 ? "/" + baseUrl.substring(slashIdx + 1) : ""

  // Build issue → profiles map
  const issueMap = new Map<string, { donors: IssueProfile[]; politicians: IssueProfile[]; stories: IssueProfile[] }>()

  for (const issue of VALID_ISSUES) {
    issueMap.set(issue, { donors: [], politicians: [], stories: [] })
  }

  for (const f of allFiles) {
    const fm = f.frontmatter
    if (!fm) continue
    const issues = Array.isArray(fm.issues) ? fm.issues as string[] : []
    if (issues.length === 0) continue

    const fSlug = (f.slug ?? "").toLowerCase()
    const name = String(fm.title ?? "").replace(/^_/, "").replace(/\s*Master Profile.*/, "")
    const type = String(fm.type ?? "")
    const sector = String(fm.sector ?? "")
    const party = String(fm.party ?? "")
    const chamber = String(fm.chamber ?? "")
    const readiness = String(fm["content-readiness"] ?? "draft")

    const profile: IssueProfile = {
      name,
      slug: `${basePath}/${simplifySlug(f.slug!)}`,
      type,
      sector,
      party,
      chamber,
      readiness,
    }

    for (const issue of issues) {
      if (!VALID_ISSUES.has(issue)) continue
      const bucket = issueMap.get(issue)!
      if (fSlug.startsWith("politicians/")) {
        bucket.politicians.push(profile)
      } else if (fSlug.startsWith("donors--and--power-networks/")) {
        bucket.donors.push(profile)
      } else if (fSlug.startsWith("stories/")) {
        bucket.stories.push(profile)
      } else {
        bucket.donors.push(profile)
      }
    }
  }

  // Build sorted issue list
  const issueList: IssueData[] = []
  for (const [issue, data] of issueMap) {
    const total = data.donors.length + data.politicians.length + data.stories.length
    if (total === 0) continue
    issueList.push({
      issue,
      color: ISSUE_COLORS[issue] || "steel",
      donors: data.donors,
      politicians: data.politicians,
      stories: data.stories,
      total,
    })
  }
  issueList.sort((a, b) => b.total - a.total)

  // Serialize for client-side interaction
  const dataJson = JSON.stringify(issueList)

  return (
    <div class="ie-explorer">
      <div id="ie-data" data-issues={dataJson} style="display:none" />

      {/* Issue grid — tiles to click */}
      <div id="ie-grid" class="ie-grid">
        {issueList.map((issue) => (
          <button class={`ie-tile ie-color-${issue.color}`} data-issue={issue.issue}>
            <span class="ie-tile-name">{issue.issue}</span>
            <div class="ie-tile-counts">
              {issue.donors.length > 0 && (
                <span class="ie-tile-count ie-count-donor">{issue.donors.length} donors</span>
              )}
              {issue.politicians.length > 0 && (
                <span class="ie-tile-count ie-count-pol">{issue.politicians.length} politicians</span>
              )}
              {issue.stories.length > 0 && (
                <span class="ie-tile-count ie-count-story">{issue.stories.length} investigations</span>
              )}
            </div>
            <span class="ie-tile-total">{issue.total} profiles</span>
          </button>
        ))}
      </div>

      {/* Detail view — shown when an issue is clicked */}
      <div id="ie-detail" class="ie-detail" style="display:none">
        <div class="ie-detail-header">
          <h2 id="ie-detail-title" class="ie-detail-title"></h2>
          <button id="ie-back" class="ie-back-btn">All Issues</button>
        </div>
        <div id="ie-detail-content" class="ie-detail-content"></div>
      </div>
    </div>
  )
}

IssueExplorer.afterDOMLoaded = `
function initIssueExplorer() {
  var dataEl = document.getElementById('ie-data');
  if (!dataEl) return;
  var issues;
  try { issues = JSON.parse(dataEl.dataset.issues); } catch(e) { return; }

  var grid = document.getElementById('ie-grid');
  var detail = document.getElementById('ie-detail');
  var detailTitle = document.getElementById('ie-detail-title');
  var detailContent = document.getElementById('ie-detail-content');
  var backBtn = document.getElementById('ie-back');

  if (!grid || !detail || !detailContent || !backBtn) return;

  function showIssue(issueName) {
    var issue = issues.find(function(i) { return i.issue === issueName; });
    if (!issue) return;

    grid.style.display = 'none';
    detail.style.display = 'block';
    detailTitle.textContent = issueName;

    var html = '';
    html += '<div class="ie-summary">';
    html += '<span class="ie-summary-stat">' + issue.donors.length + ' donors</span>';
    html += '<span class="ie-summary-divider">|</span>';
    html += '<span class="ie-summary-stat">' + issue.politicians.length + ' politicians</span>';
    if (issue.stories.length > 0) {
      html += '<span class="ie-summary-divider">|</span>';
      html += '<span class="ie-summary-stat">' + issue.stories.length + ' investigations</span>';
    }
    html += '</div>';

    // Donors
    if (issue.donors.length > 0) {
      html += '<div class="ie-section">';
      html += '<div class="ie-section-label">DONORS & NETWORKS</div>';
      html += '<div class="ie-profile-grid">';
      for (var d = 0; d < issue.donors.length; d++) {
        var donor = issue.donors[d];
        var status = (donor.readiness === 'ready' || donor.readiness === 'publication-ready') ? 'VERIFIED' : 'DRAFT';
        var statusClass = status === 'VERIFIED' ? 'ie-verified' : 'ie-draft';
        html += '<a href="' + donor.slug + '" class="ie-profile-card internal">';
        html += '<span class="ie-profile-name">' + donor.name + '</span>';
        if (donor.sector && donor.sector !== 'undefined') {
          html += '<span class="ie-profile-sector">' + donor.sector + '</span>';
        }
        html += '<span class="ie-profile-status ' + statusClass + '">' + status + '</span>';
        html += '</a>';
      }
      html += '</div></div>';
    }

    // Politicians
    if (issue.politicians.length > 0) {
      html += '<div class="ie-section">';
      html += '<div class="ie-section-label">POLITICIANS</div>';
      html += '<div class="ie-profile-grid">';
      for (var p = 0; p < issue.politicians.length; p++) {
        var pol = issue.politicians[p];
        var partyLetter = pol.party === 'Democrat' ? 'D' : pol.party === 'Republican' ? 'R' : 'I';
        var partyClass = pol.party === 'Democrat' ? 'ie-dem' : pol.party === 'Republican' ? 'ie-rep' : 'ie-ind';
        html += '<a href="' + pol.slug + '" class="ie-profile-card internal">';
        html += '<div class="ie-pol-row">';
        html += '<span class="ie-party-badge ' + partyClass + '">' + partyLetter + '</span>';
        html += '<span class="ie-profile-name">' + pol.name + '</span>';
        html += '</div>';
        if (pol.chamber && pol.chamber !== 'undefined') {
          html += '<span class="ie-profile-sector">' + pol.chamber + '</span>';
        }
        html += '</a>';
      }
      html += '</div></div>';
    }

    // Stories
    if (issue.stories.length > 0) {
      html += '<div class="ie-section">';
      html += '<div class="ie-section-label">INVESTIGATIONS</div>';
      html += '<div class="ie-profile-grid">';
      for (var s = 0; s < issue.stories.length; s++) {
        var story = issue.stories[s];
        html += '<a href="' + story.slug + '" class="ie-profile-card ie-story-card internal">';
        html += '<span class="ie-profile-name">' + story.name + '</span>';
        html += '</a>';
      }
      html += '</div></div>';
    }

    detailContent.innerHTML = html;
    window.scrollTo({ top: detail.offsetTop - 80, behavior: 'smooth' });
  }

  // Tile clicks
  var tiles = grid.querySelectorAll('.ie-tile');
  for (var t = 0; t < tiles.length; t++) {
    tiles[t].addEventListener('click', function() {
      showIssue(this.dataset.issue);
    });
  }

  // Back
  backBtn.addEventListener('click', function() {
    detail.style.display = 'none';
    grid.style.display = 'grid';
  });
}

initIssueExplorer();
document.addEventListener('nav', function() { setTimeout(initIssueExplorer, 150); });
`

IssueExplorer.css = `
/* ═══════════════════════════════════════════════
   ISSUE EXPLORER
   ═══════════════════════════════════════════════ */

.ie-explorer {
  margin-top: 8px;
}

/* Issue tile grid */
.ie-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 10px;
}

.ie-tile {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  padding: 20px;
  background: #111118;
  border: 1px solid #1e1e28;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.15s;
  text-align: left;
  border-left: 3px solid #5b8dce;
}

.ie-tile:hover {
  background: #13131a;
  border-color: rgba(91, 141, 206, 0.3);
}

.ie-color-red { border-left-color: #ef4444; }
.ie-color-blue { border-left-color: #3b82f6; }
.ie-color-green { border-left-color: #22c55e; }
.ie-color-amber { border-left-color: #f59e0b; }
.ie-color-orange { border-left-color: #fb923c; }
.ie-color-purple { border-left-color: #a78bfa; }
.ie-color-steel { border-left-color: #5b8dce; }

.ie-color-red:hover { border-left-color: #ef4444; border-color: rgba(239, 68, 68, 0.3); }
.ie-color-blue:hover { border-left-color: #3b82f6; border-color: rgba(59, 130, 246, 0.3); }
.ie-color-green:hover { border-left-color: #22c55e; border-color: rgba(34, 197, 94, 0.3); }
.ie-color-amber:hover { border-left-color: #f59e0b; border-color: rgba(245, 158, 11, 0.3); }
.ie-color-orange:hover { border-left-color: #fb923c; border-color: rgba(251, 146, 60, 0.3); }
.ie-color-purple:hover { border-left-color: #a78bfa; border-color: rgba(167, 139, 250, 0.3); }

.ie-tile-name {
  font-size: 15px;
  font-weight: 600;
  color: #e4e4e7;
  margin-bottom: 10px;
}

.ie-tile-counts {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 8px;
}

.ie-tile-count {
  font-family: 'Space Mono', monospace;
  font-size: 9px;
  letter-spacing: 0.5px;
  padding: 2px 8px;
  border-radius: 3px;
}

.ie-count-donor {
  color: #22c55e;
  background: rgba(34, 197, 94, 0.08);
}

.ie-count-pol {
  color: #5b8dce;
  background: rgba(91, 141, 206, 0.08);
}

.ie-count-story {
  color: #f59e0b;
  background: rgba(245, 158, 11, 0.08);
}

.ie-tile-total {
  font-family: 'Space Mono', monospace;
  font-size: 10px;
  color: #4a4a54;
}

/* Detail view */
.ie-detail-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 1px solid #1e1e28;
}

.ie-detail-title {
  font-size: 28px !important;
  font-weight: 700 !important;
  color: #e4e4e7 !important;
  margin: 0 !important;
  border: none !important;
  padding: 0 !important;
}

.ie-back-btn {
  font-family: 'Space Mono', monospace;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 1px;
  color: #5b8dce;
  background: rgba(91, 141, 206, 0.08);
  border: 1px solid rgba(91, 141, 206, 0.2);
  border-radius: 4px;
  padding: 8px 16px;
  cursor: pointer;
  transition: all 0.15s;
}

.ie-back-btn:hover {
  background: rgba(91, 141, 206, 0.15);
  border-color: #5b8dce;
}

.ie-summary {
  display: flex;
  gap: 12px;
  align-items: center;
  margin-bottom: 24px;
  flex-wrap: wrap;
}

.ie-summary-stat {
  font-family: 'Space Mono', monospace;
  font-size: 12px;
  font-weight: 700;
  color: #a1a1aa;
}

.ie-summary-divider {
  color: #2a2a36;
}

/* Sections */
.ie-section {
  margin-bottom: 28px;
}

.ie-section-label {
  font-family: 'Space Mono', monospace;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 2px;
  color: #63636e;
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid #1a1a22;
}

.ie-profile-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 8px;
}

.ie-profile-card {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 14px 16px;
  background: #111118;
  border: 1px solid #1e1e28;
  border-radius: 6px;
  text-decoration: none !important;
  color: inherit !important;
  transition: border-color 0.15s;
}

.ie-profile-card:hover {
  border-color: rgba(91, 141, 206, 0.3);
}

.ie-story-card {
  border-left: 2px solid #f59e0b;
}

.ie-pol-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.ie-party-badge {
  font-family: 'Space Mono', monospace;
  font-size: 10px;
  font-weight: 700;
  width: 22px;
  height: 22px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  flex-shrink: 0;
}

.ie-dem { color: #3b82f6; background: rgba(59, 130, 246, 0.15); }
.ie-rep { color: #ef4444; background: rgba(239, 68, 68, 0.15); }
.ie-ind { color: #f59e0b; background: rgba(245, 158, 11, 0.15); }

.ie-profile-name {
  font-size: 13px;
  font-weight: 600;
  color: #e4e4e7;
}

.ie-profile-sector {
  font-family: 'Space Mono', monospace;
  font-size: 9px;
  color: #63636e;
  letter-spacing: 0.5px;
}

.ie-profile-status {
  font-family: 'Space Mono', monospace;
  font-size: 8px;
  font-weight: 700;
  letter-spacing: 1px;
  align-self: flex-start;
  padding: 2px 6px;
  border-radius: 2px;
}

.ie-verified { color: #22c55e; background: rgba(34, 197, 94, 0.1); }
.ie-draft { color: #f59e0b; background: rgba(245, 158, 11, 0.1); }

/* Mobile */
@media (max-width: 800px) {
  .ie-grid {
    grid-template-columns: 1fr;
  }

  .ie-profile-grid {
    grid-template-columns: 1fr;
  }

  .ie-detail-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }

  .ie-detail-title {
    font-size: 22px !important;
  }
}
`

export default (() => IssueExplorer) satisfies QuartzComponentConstructor
