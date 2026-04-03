import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"
import { simplifySlug } from "../util/path"

interface DonorRankEntry {
  name: string
  slug: string
  sector: string
  entityType: string
  politiciansFunded: string[]
  issues: string[]
  readiness: string
  sourceTier: number
  reachScore: number
}

const PowerRankings: QuartzComponent = ({
  fileData,
  allFiles,
  cfg,
}: QuartzComponentProps) => {
  const slug = String(fileData.slug ?? "").toLowerCase()
  if (!slug.includes("interactive/power-rankings")) return null

  const baseUrl = cfg.baseUrl ?? ""
  const slashIdx = baseUrl.indexOf("/")
  const basePath = slashIdx >= 0 ? "/" + baseUrl.substring(slashIdx + 1) : ""

  // Collect donor data from all files at build time
  const donors: DonorRankEntry[] = []

  for (const f of allFiles) {
    const fSlug = (f.slug ?? "").toLowerCase()
    if (!fSlug.startsWith("donors--and--power-networks/")) continue

    const fm = f.frontmatter
    if (!fm) continue
    const type = String(fm.type ?? "")
    if (!type) continue

    const name = String(fm.title ?? "").replace(/^_/, "")
    if (!name) continue

    const sector = String(fm.sector ?? "")
    const entityType = String(fm["entity-type"] ?? "")
    const politiciansFunded = Array.isArray(fm["politicians-funded"]) ? fm["politicians-funded"] as string[] : []
    const issues = Array.isArray(fm.issues) ? fm.issues as string[] : []
    const readiness = String(fm["content-readiness"] ?? "draft")
    const sourceTier = Number(fm["source-tier"] ?? 3)

    donors.push({
      name,
      slug: `${basePath}/${simplifySlug(f.slug!)}`,
      sector,
      entityType,
      politiciansFunded,
      issues,
      readiness,
      sourceTier,
      reachScore: politiciansFunded.length,
    })
  }

  // Sort by reach score (politicians funded), then by source tier
  donors.sort((a, b) => {
    if (b.reachScore !== a.reachScore) return b.reachScore - a.reachScore
    return a.sourceTier - b.sourceTier
  })

  // Assign ranks
  const ranked = donors.map((d, i) => ({ ...d, rank: i + 1 }))

  // Serialize for client-side sorting/filtering
  const dataJson = JSON.stringify(ranked)

  return (
    <div class="pr-rankings">
      <div id="pr-data" data-donors={dataJson} style="display:none" />
      <div class="pr-controls">
        <div class="pr-filter-row">
          <input type="text" id="pr-search" class="pr-search" placeholder="Search donors..." />
          <select id="pr-sector-filter" class="pr-select">
            <option value="">All Sectors</option>
          </select>
          <select id="pr-sort" class="pr-select">
            <option value="reach">Sort: Reach (Politicians Funded)</option>
            <option value="name">Sort: Name A-Z</option>
            <option value="sector">Sort: Sector</option>
            <option value="tier">Sort: Source Quality</option>
          </select>
        </div>
        <div class="pr-stats">
          <span id="pr-showing">Showing {ranked.length} donors</span>
        </div>
      </div>
      <div class="pr-table-wrap">
        <table class="pr-table">
          <thead>
            <tr>
              <th class="pr-th-rank">#</th>
              <th class="pr-th-name">DONOR</th>
              <th class="pr-th-sector">SECTOR</th>
              <th class="pr-th-reach">REACH</th>
              <th class="pr-th-issues">KEY ISSUES</th>
              <th class="pr-th-status">STATUS</th>
            </tr>
          </thead>
          <tbody id="pr-tbody">
            {ranked.map((d) => (
              <tr class="pr-row" data-sector={d.sector} data-name={d.name.toLowerCase()} data-reach={d.reachScore} data-tier={d.sourceTier}>
                <td class="pr-rank">{d.rank}</td>
                <td class="pr-name">
                  <a href={d.slug} class="internal pr-donor-link">{d.name}</a>
                  {d.entityType && d.entityType !== "undefined" && (
                    <span class="pr-entity-type">{d.entityType}</span>
                  )}
                </td>
                <td class="pr-sector">
                  {d.sector && d.sector !== "undefined" && (
                    <span class={`pr-sector-badge pr-sector-${d.sector.toLowerCase().replace(/[^a-z]/g, "")}`}>
                      {d.sector}
                    </span>
                  )}
                </td>
                <td class="pr-reach">
                  {d.reachScore > 0 && (
                    <span class="pr-reach-count">{d.reachScore}</span>
                  )}
                  {d.reachScore > 0 && (
                    <span class="pr-reach-label">{d.reachScore === 1 ? "politician" : "politicians"}</span>
                  )}
                </td>
                <td class="pr-issues">
                  {d.issues.slice(0, 3).map((issue) => (
                    <span class="pr-issue-tag">{issue}</span>
                  ))}
                </td>
                <td class="pr-status">
                  <span class={`pr-status-badge ${d.readiness === "ready" || d.readiness === "publication-ready" ? "pr-verified" : d.readiness === "draft" ? "pr-draft" : "pr-limited"}`}>
                    {d.readiness === "ready" || d.readiness === "publication-ready" ? "VERIFIED" : d.readiness === "draft" ? "DRAFT" : "LIMITED"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

PowerRankings.afterDOMLoaded = `
function initPowerRankings() {
  var dataEl = document.getElementById('pr-data');
  if (!dataEl) return;
  var donors;
  try { donors = JSON.parse(dataEl.dataset.donors); } catch(e) { return; }

  var search = document.getElementById('pr-search');
  var sectorFilter = document.getElementById('pr-sector-filter');
  var sortSelect = document.getElementById('pr-sort');
  var tbody = document.getElementById('pr-tbody');
  var showing = document.getElementById('pr-showing');

  if (!search || !sectorFilter || !sortSelect || !tbody) return;

  // Populate sector dropdown
  var sectors = {};
  for (var i = 0; i < donors.length; i++) {
    var s = donors[i].sector;
    if (s && s !== 'undefined') sectors[s] = (sectors[s] || 0) + 1;
  }
  var sectorKeys = Object.keys(sectors).sort();
  for (var j = 0; j < sectorKeys.length; j++) {
    var opt = document.createElement('option');
    opt.value = sectorKeys[j];
    opt.textContent = sectorKeys[j] + ' (' + sectors[sectorKeys[j]] + ')';
    sectorFilter.appendChild(opt);
  }

  function applyFilters() {
    var query = (search.value || '').toLowerCase();
    var sector = sectorFilter.value;
    var sort = sortSelect.value;
    var rows = tbody.querySelectorAll('.pr-row');
    var visible = 0;

    // Collect rows for sorting
    var rowArr = Array.from(rows);

    // Sort
    rowArr.sort(function(a, b) {
      if (sort === 'reach') {
        return parseInt(b.dataset.reach || '0') - parseInt(a.dataset.reach || '0');
      } else if (sort === 'name') {
        return (a.dataset.name || '').localeCompare(b.dataset.name || '');
      } else if (sort === 'sector') {
        return (a.dataset.sector || '').localeCompare(b.dataset.sector || '');
      } else if (sort === 'tier') {
        return parseInt(a.dataset.tier || '3') - parseInt(b.dataset.tier || '3');
      }
      return 0;
    });

    // Re-order DOM
    for (var k = 0; k < rowArr.length; k++) {
      tbody.appendChild(rowArr[k]);
    }

    // Filter
    for (var i = 0; i < rowArr.length; i++) {
      var row = rowArr[i];
      var matchSearch = !query || (row.dataset.name || '').indexOf(query) !== -1;
      var matchSector = !sector || row.dataset.sector === sector;
      if (matchSearch && matchSector) {
        row.style.display = '';
        visible++;
        // Update rank
        row.querySelector('.pr-rank').textContent = visible;
      } else {
        row.style.display = 'none';
      }
    }
    showing.textContent = 'Showing ' + visible + ' of ' + donors.length + ' donors';
  }

  search.addEventListener('input', applyFilters);
  sectorFilter.addEventListener('change', applyFilters);
  sortSelect.addEventListener('change', applyFilters);
}

initPowerRankings();
document.addEventListener('nav', function() { setTimeout(initPowerRankings, 150); });
`

PowerRankings.css = `
/* ═══════════════════════════════════════════════
   DONOR POWER RANKINGS
   ═══════════════════════════════════════════════ */

.pr-rankings {
  margin-top: 8px;
}

/* Controls */
.pr-controls {
  margin-bottom: 20px;
}

.pr-filter-row {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  margin-bottom: 10px;
}

.pr-search {
  flex: 1;
  min-width: 200px;
  padding: 10px 14px;
  background: #13131a;
  border: 1px solid #1e1e28;
  border-radius: 6px;
  color: #e4e4e7;
  font-size: 13px;
  font-family: inherit;
  outline: none;
  transition: border-color 0.15s;
}

.pr-search:focus {
  border-color: #5b8dce;
}

.pr-search::placeholder {
  color: #4a4a54;
}

.pr-select {
  padding: 10px 14px;
  background: #13131a;
  border: 1px solid #1e1e28;
  border-radius: 6px;
  color: #a1a1aa;
  font-size: 12px;
  font-family: 'Space Mono', monospace;
  cursor: pointer;
  outline: none;
}

.pr-select:focus {
  border-color: #5b8dce;
}

.pr-stats {
  font-family: 'Space Mono', monospace;
  font-size: 10px;
  color: #63636e;
  letter-spacing: 1px;
}

/* Table */
.pr-table-wrap {
  overflow-x: auto;
  border: 1px solid #1e1e28;
  border-radius: 8px;
}

.pr-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}

.pr-table thead {
  background: linear-gradient(180deg, #13131a 0%, #0e0e14 100%);
  border-bottom: 2px solid #2a2a36;
}

.pr-table th {
  font-family: 'Space Mono', monospace;
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 2px;
  color: #5b8dce;
  padding: 14px 12px;
  text-align: left;
  white-space: nowrap;
}

.pr-th-rank { width: 50px; text-align: center; }
.pr-th-reach { width: 100px; text-align: center; }
.pr-th-status { width: 90px; text-align: center; }

.pr-row {
  border-bottom: 1px solid #1a1a22;
  transition: background 0.1s;
}

.pr-row:hover {
  background: rgba(91, 141, 206, 0.04);
}

.pr-table td {
  padding: 12px;
  vertical-align: middle;
}

/* Rank */
.pr-rank {
  text-align: center;
  font-family: 'Space Mono', monospace;
  font-size: 14px;
  font-weight: 700;
  color: #63636e;
}

.pr-row:nth-child(1) .pr-rank,
.pr-row:nth-child(2) .pr-rank,
.pr-row:nth-child(3) .pr-rank {
  color: #f59e0b;
}

/* Name */
.pr-donor-link {
  color: #e4e4e7 !important;
  text-decoration: none !important;
  font-weight: 600;
  border: none !important;
}

.pr-donor-link:hover {
  color: #5b8dce !important;
}

.pr-entity-type {
  display: block;
  font-family: 'Space Mono', monospace;
  font-size: 9px;
  color: #4a4a54;
  letter-spacing: 0.5px;
  margin-top: 2px;
}

/* Sector badge */
.pr-sector-badge {
  display: inline-block;
  font-family: 'Space Mono', monospace;
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.5px;
  padding: 3px 8px;
  border-radius: 3px;
  white-space: nowrap;
  background: rgba(91, 141, 206, 0.08);
  color: #5b8dce;
}

.pr-sector-wallstreet { color: #22c55e; background: rgba(34, 197, 94, 0.08); }
.pr-sector-defenseintelligence { color: #ef4444; background: rgba(239, 68, 68, 0.08); }
.pr-sector-israellobby { color: #f59e0b; background: rgba(245, 158, 11, 0.08); }
.pr-sector-healthcare,
.pr-sector-pharmahealthcare { color: #a78bfa; background: rgba(167, 139, 250, 0.08); }
.pr-sector-energyutilities { color: #fb923c; background: rgba(251, 146, 60, 0.08); }
.pr-sector-darkmoney { color: #ef4444; background: rgba(239, 68, 68, 0.08); }
.pr-sector-techcrypto { color: #38bdf8; background: rgba(56, 189, 248, 0.08); }
.pr-sector-megadonors { color: #f59e0b; background: rgba(245, 158, 11, 0.08); }
.pr-sector-superpacs { color: #ef4444; background: rgba(239, 68, 68, 0.08); }
.pr-sector-agriculture { color: #22c55e; background: rgba(34, 197, 94, 0.08); }
.pr-sector-realestate { color: #fb923c; background: rgba(251, 146, 60, 0.08); }
.pr-sector-laborunions { color: #3b82f6; background: rgba(59, 130, 246, 0.08); }

/* Reach */
.pr-reach {
  text-align: center;
}

.pr-reach-count {
  font-family: 'Space Mono', monospace;
  font-size: 16px;
  font-weight: 700;
  color: #22c55e;
}

.pr-reach-label {
  display: block;
  font-family: 'Space Mono', monospace;
  font-size: 8px;
  color: #4a4a54;
  letter-spacing: 0.5px;
  margin-top: 1px;
}

/* Issues */
.pr-issues {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.pr-issue-tag {
  font-size: 9px;
  font-family: 'Space Mono', monospace;
  color: #a1a1aa;
  background: rgba(161, 161, 170, 0.06);
  padding: 2px 6px;
  border-radius: 3px;
  white-space: nowrap;
}

/* Status */
.pr-status {
  text-align: center;
}

.pr-status-badge {
  font-family: 'Space Mono', monospace;
  font-size: 8px;
  font-weight: 700;
  letter-spacing: 1px;
  padding: 3px 8px;
  border-radius: 3px;
}

.pr-verified {
  color: #22c55e;
  background: rgba(34, 197, 94, 0.12);
}

.pr-draft {
  color: #f59e0b;
  background: rgba(245, 158, 11, 0.12);
}

.pr-limited {
  color: #ef4444;
  background: rgba(239, 68, 68, 0.12);
}

/* Zebra */
.pr-row:nth-child(even) {
  background: rgba(255, 255, 255, 0.01);
}

/* Mobile */
@media (max-width: 800px) {
  .pr-filter-row {
    flex-direction: column;
  }

  .pr-th-issues,
  .pr-issues {
    display: none;
  }

  .pr-table td, .pr-table th {
    padding: 8px 6px;
    font-size: 11px;
  }

  .pr-reach-count {
    font-size: 13px;
  }
}
`

export default (() => PowerRankings) satisfies QuartzComponentConstructor
