import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"
import { classNames } from "../util/lang"
import { simplifySlug } from "../util/path"
import { QuartzPluginData } from "../plugins/vfile"

// ─── Helpers ────────────────────────────────────────────────────────
function findPage(allFiles: QuartzPluginData[], searchTerm: string): QuartzPluginData | undefined {
  const lower = searchTerm.toLowerCase()
  return allFiles.find((f) => {
    const slug = (f.slug ?? "").toLowerCase()
    return slug.endsWith(lower) || slug === lower
  })
}

// ─── Types ──────────────────────────────────────────────────────────
interface FeaturedItem {
  name: string
  detail: string
  search: string
}

interface NavNode {
  name: string
  slugPrefix: string
  children?: NavNode[]
  featured?: FeaturedItem[]
}

// ─── Featured items ─────────────────────────────────────────────────
// Politicians featured list is built dynamically from frontmatter at
// render time (see buildFeaturedPoliticians). #1 is pinned to whoever
// has `current-office: "President"`, #2-5 are top career-total values.

// Parse "$1.6B" / "$100M+" / "$47M" into a comparable number
function parseCareerTotal(str: string): number {
  if (!str) return 0
  const m = str.match(/\$?\s*([\d.]+)\s*([BMK])?/i)
  if (!m) return 0
  const n = parseFloat(m[1])
  const unit = (m[2] || "").toUpperCase()
  const mult = unit === "B" ? 1e9 : unit === "M" ? 1e6 : unit === "K" ? 1e3 : 1
  return n * mult
}

function cleanProfileName(title: string): string {
  return String(title || "")
    .replace(/^_/, "")
    .replace(/\s+Master\s+Profile\s*$/i, "")
    .trim()
}

function buildFeaturedPoliticians(allFiles: QuartzPluginData[]): FeaturedItem[] {
  // Pin current president at #1 (regardless of career-total presence)
  const president = allFiles.find((f) => {
    const fm = f.frontmatter as any
    return (
      fm?.type === "politician" &&
      String(fm?.["current-office"] ?? "").toLowerCase() === "president"
    )
  })

  // Politicians with a career-total, sorted descending
  const withTotals = allFiles
    .filter((f) => {
      const fm = f.frontmatter as any
      return (
        fm?.type === "politician" &&
        fm?.["career-total"] &&
        f !== president
      )
    })
    .sort((a, b) => {
      const av = parseCareerTotal(String((a.frontmatter as any)["career-total"]))
      const bv = parseCareerTotal(String((b.frontmatter as any)["career-total"]))
      return bv - av
    })

  const list = president ? [president, ...withTotals.slice(0, 4)] : withTotals.slice(0, 5)

  return list.map((f) => ({
    name: cleanProfileName((f.frontmatter as any)?.title ?? ""),
    detail: String((f.frontmatter as any)?.["career-total"] ?? ""),
    search: f.slug ?? "",
  }))
}

const featuredDonors: FeaturedItem[] = [
  { name: "Goldman Sachs", detail: "\u{1F3E6}", search: "Wall-Street/Goldman-Sachs" },
  { name: "AIPAC", detail: "\u{1F54E}", search: "Israel-Lobby/AIPAC---American-Israel-Public-Affairs-Committee" },
  { name: "Koch Network", detail: "\u{1F3ED}", search: "Mega-Donors/Koch-Network---Charles-Koch" },
  { name: "Lockheed Martin", detail: "\u{2708}", search: "Defense--and--Intelligence/Lockheed-Martin" },
]

const featuredStories: FeaturedItem[] = [
  { name: "Drug Pricing Theater", detail: "\u{1F48A}", search: "Contradiction-Deep-Dives/Contradiction-03---PhRMA-Kills-Drug-Negotiation-From-Both-Sides" },
  { name: "Defense Budget Bloat", detail: "\u{1F4A3}", search: "Contradiction-Deep-Dives/Contradiction-04---Lockheed-Martin-Buys-Defense-Hawks-in-Both-Parties" },
  { name: "Carried Interest Scam", detail: "\u{1F4B0}", search: "The-Carried-Interest-Loophole---30-Years-of-Survival" },
]

const featuredMedia: FeaturedItem[] = [
  { name: "Fox News", detail: "\u{1F4FA}", search: "Fox-News---Murdoch-Media-Empire" },
  { name: "Ben Shapiro", detail: "\u{1F399}", search: "Right/Ben-Shapiro" },
  { name: "Pod Save America", detail: "\u{1F3A7}", search: "Left/Pod-Save-America" },
  { name: "Joe Rogan", detail: "\u{1F3A4}", search: "Centrist/Joe-Rogan" },
  { name: "Daily Wire", detail: "\u{1F4F0}", search: "Right/Daily-Wire" },
]

const featuredThinkTanks: FeaturedItem[] = [
  { name: "Heritage Foundation", detail: "\u{1F3DB}", search: "Conservative/Heritage-Foundation" },
  { name: "Brookings Institution", detail: "\u{1F4DA}", search: "Centrist/Brookings-Institution" },
  { name: "ALEC", detail: "\u{2696}", search: "ALEC---American-Legislative-Exchange-Council" },
  { name: "Cato Institute", detail: "\u{1F5FD}", search: "Conservative/Cato-Institute" },
  { name: "Center for American Progress", detail: "\u{1F4CB}", search: "Liberal/Center-for-American-Progress" },
]

const featuredKStreet: FeaturedItem[] = [
  { name: "Akin Gump", detail: "\u{1F4BC}", search: "Akin-Gump-Strauss-Hauer--and--Feld" },
  { name: "Squire Patton Boggs", detail: "\u{1F4BC}", search: "Squire-Patton-Boggs" },
  { name: "Brownstein Hyatt", detail: "\u{1F4BC}", search: "Brownstein-Hyatt-Farber-Schreck" },
  { name: "BGR Group", detail: "\u{1F4BC}", search: "BGR-Group" },
  { name: "Holland & Knight", detail: "\u{1F4BC}", search: "Holland--and--Knight" },
]

// ─── Navigation tree structure ──────────────────────────────────────
// slugPrefix must match Quartz's slug encoding:
//   spaces → hyphens, & → --and--, _ prefix preserved
const navTree: NavNode[] = [
  {
    name: "Politicians",
    slugPrefix: "Politicians",
    // featured set dynamically at render time via buildFeaturedPoliticians()
    children: [
      {
        name: "Democrats",
        slugPrefix: "Politicians/Democrats",
        children: [
          { name: "Senate", slugPrefix: "Politicians/Democrats/Senate" },
          { name: "House", slugPrefix: "Politicians/Democrats/House" },
          { name: "Governors", slugPrefix: "Politicians/Democrats/Governors" },
          { name: "Presidential", slugPrefix: "Politicians/Democrats/Presidential" },
          { name: "Biden Cabinet", slugPrefix: "Politicians/Democrats/Biden-Cabinet" },
          { name: "Former", slugPrefix: "Politicians/Democrats/Former" },
        ],
      },
      {
        name: "Republicans",
        slugPrefix: "Politicians/Republicans",
        children: [
          { name: "Senate", slugPrefix: "Politicians/Republicans/Senate" },
          { name: "House", slugPrefix: "Politicians/Republicans/House" },
          { name: "Governors", slugPrefix: "Politicians/Republicans/Governors" },
          { name: "Presidential", slugPrefix: "Politicians/Republicans/Presidential" },
          { name: "Trump Cabinet", slugPrefix: "Politicians/Republicans/Trump-Cabinet" },
          { name: "Bush Cabinet", slugPrefix: "Politicians/Republicans/Bush-Cabinet" },
          { name: "Former", slugPrefix: "Politicians/Republicans/Former" },
        ],
      },
      {
        name: "Races",
        slugPrefix: "Politicians/Races",
        children: [
          { name: "CA Governor 2026", slugPrefix: "Politicians/Races/CA-Governor-2026" },
          { name: "OH Governor 2026", slugPrefix: "Politicians/Races/OH-Governor-2026" },
        ],
      },
      { name: "SCOTUS", slugPrefix: "Politicians/SCOTUS" },
      { name: "Independent", slugPrefix: "Politicians/Independent" },
      { name: "International", slugPrefix: "Politicians/International" },
    ],
  },
  {
    name: "Donors & Power Networks",
    slugPrefix: "Donors--and--Power-Networks",
    featured: featuredDonors,
    children: [
      { name: "Agriculture", slugPrefix: "Donors--and--Power-Networks/Agriculture" },
      { name: "Carceral State", slugPrefix: "Donors--and--Power-Networks/Carceral-State" },
      { name: "Corporate", slugPrefix: "Donors--and--Power-Networks/Corporate" },
      { name: "Dark Money", slugPrefix: "Donors--and--Power-Networks/Dark-Money" },
      { name: "Defense & Intelligence", slugPrefix: "Donors--and--Power-Networks/Defense--and--Intelligence" },
      { name: "Education", slugPrefix: "Donors--and--Power-Networks/Education" },
      { name: "Energy & Utilities", slugPrefix: "Donors--and--Power-Networks/Energy--and--Utilities" },
      { name: "Foreign", slugPrefix: "Donors--and--Power-Networks/Foreign" },
      { name: "Gig Economy", slugPrefix: "Donors--and--Power-Networks/Gig-Economy" },
      { name: "Healthcare", slugPrefix: "Donors--and--Power-Networks/Healthcare" },
      { name: "Healthcare Industry", slugPrefix: "Donors--and--Power-Networks/Healthcare-Industry" },
      { name: "Israel Lobby", slugPrefix: "Donors--and--Power-Networks/Israel-Lobby" },
      { name: "Labor Unions", slugPrefix: "Donors--and--Power-Networks/Labor-Unions" },
      { name: "Law Enforcement", slugPrefix: "Donors--and--Power-Networks/Law-Enforcement" },
      { name: "Media & Entertainment", slugPrefix: "Donors--and--Power-Networks/Media--and--Entertainment" },
      { name: "Mega-Donors", slugPrefix: "Donors--and--Power-Networks/Mega-Donors" },
      { name: "Pharma & Healthcare", slugPrefix: "Donors--and--Power-Networks/Pharma--and--Healthcare" },
      { name: "Real Estate", slugPrefix: "Donors--and--Power-Networks/Real-Estate" },
      { name: "Real Estate & Housing", slugPrefix: "Donors--and--Power-Networks/Real-Estate--and--Housing" },
      { name: "Restaurant & Food", slugPrefix: "Donors--and--Power-Networks/Restaurant--and--Food" },
      { name: "Super PACs", slugPrefix: "Donors--and--Power-Networks/Super-PACs" },
      { name: "Tech & Crypto", slugPrefix: "Donors--and--Power-Networks/Tech--and--Crypto" },
      { name: "Wall Street", slugPrefix: "Donors--and--Power-Networks/Wall-Street" },
    ],
  },
  {
    name: "Stories",
    slugPrefix: "Stories",
    featured: featuredStories,
    children: [
      { name: "Contradiction Deep Dives", slugPrefix: "Stories/Published/Contradiction-Deep-Dives" },
      { name: "Cross-Politician Analysis", slugPrefix: "Stories/Published/Cross-Politician-Analysis" },
      { name: "Investigations", slugPrefix: "Stories/Published/Investigations" },
      { name: "2026 Senate Races", slugPrefix: "Stories/Published/2026-Senate-Races" },
      { name: "2026 House Races", slugPrefix: "Stories/Published/2026-House-Races" },
      { name: "2028 Presidential", slugPrefix: "Stories/Published/2028-Presidential-Race" },
    ],
  },
  {
    name: "Media Pipeline",
    slugPrefix: "Media--and--Influence-Pipeline",
    featured: featuredMedia,
    children: [
      { name: "Right", slugPrefix: "Media--and--Influence-Pipeline/Right" },
      { name: "Left", slugPrefix: "Media--and--Influence-Pipeline/Left" },
      { name: "Centrist", slugPrefix: "Media--and--Influence-Pipeline/Centrist" },
    ],
  },
  {
    name: "Think Tanks",
    slugPrefix: "Think-Tanks--and--Policy-Infrastructure",
    featured: featuredThinkTanks,
    children: [
      { name: "Conservative", slugPrefix: "Think-Tanks--and--Policy-Infrastructure/Conservative" },
      { name: "Liberal", slugPrefix: "Think-Tanks--and--Policy-Infrastructure/Liberal" },
      { name: "Centrist", slugPrefix: "Think-Tanks--and--Policy-Infrastructure/Centrist" },
    ],
  },
  {
    name: "K Street",
    slugPrefix: "Lobbying-Firms--and--K-Street",
    featured: featuredKStreet,
    children: [
      { name: "Top Firms", slugPrefix: "Lobbying-Firms--and--K-Street" },
    ],
  },
]

// ─── Component ──────────────────────────────────────────────────────
const DonorMapSidebar: QuartzComponent = ({
  fileData,
  cfg,
  displayClass,
  allFiles,
}: QuartzComponentProps) => {
  const currentSlug = (fileData.slug ?? "").toLowerCase()

  // Build dynamic featured list for Politicians node from frontmatter
  const dynamicFeaturedPoliticians = buildFeaturedPoliticians(allFiles)

  // Extract the base path from cfg.baseUrl for absolute URL construction.
  // Relative URLs are unreliable on subdirectory deployments (GitHub Pages)
  // because SPA navigation is inconsistent about trailing slashes on folder
  // pages, causing pathToRoot-based relative resolution to break.
  // Absolute paths bypass this entirely.
  const baseUrl = cfg.baseUrl ?? ""
  const slashIdx = baseUrl.indexOf("/")
  const basePath = slashIdx >= 0 ? "/" + baseUrl.substring(slashIdx + 1) : ""
  // basePath = "/donor-map-site" (or "" for root deployments)

  // Count files whose slug starts with a given prefix
  function countInFolder(prefix: string): number {
    const lp = prefix.toLowerCase()
    return allFiles.filter((f) => {
      const s = (f.slug ?? "").toLowerCase()
      return s.startsWith(lp + "/") || s === lp
    }).length
  }

  // Absolute href: always resolves correctly regardless of current page URL
  function absHref(targetSlug: string): string {
    return `${basePath}/${targetSlug}`
  }

  // Resolve a slug to an absolute URL for folder pages
  function getFolderHref(slugPrefix: string): string {
    return absHref(slugPrefix)
  }

  // Resolve a search term to an absolute profile page URL
  function getProfileHref(search: string): string {
    const page = findPage(allFiles, search)
    if (page?.slug) return absHref(simplifySlug(page.slug))
    return "#"
  }

  // Render the featured/highlighted items within a section
  function renderFeatured(items: FeaturedItem[]): any {
    return (
      <div class="dm-featured">
        {items.map((item) => {
          const href = getProfileHref(item.search)
          const nameSlug = item.name.toLowerCase().replace(/ /g, "-")
          const isActive = currentSlug.includes(nameSlug)
          // Prefer career-total from the profile frontmatter when present
          const page = findPage(allFiles, item.search)
          const careerTotal = page?.frontmatter?.["career-total"] as string | undefined
          const detail = careerTotal && careerTotal.trim() ? careerTotal : item.detail
          return (
            <a
              href={href}
              class={`dm-featured-link ${isActive ? "dm-nav-active" : ""}`}
              data-no-popover
            >
              <span class="dm-featured-name">{item.name}</span>
              <span class="dm-featured-detail">{detail}</span>
            </a>
          )
        })}
      </div>
    )
  }

  // Recursively render a navigation tree node
  function renderNode(node: NavNode, depth: number): any {
    const count = countInFolder(node.slugPrefix)
    const isInSection = currentSlug.startsWith(node.slugPrefix.toLowerCase() + "/") ||
                        currentSlug === node.slugPrefix.toLowerCase()

    // Leaf node — link to folder listing page
    if (!node.children || node.children.length === 0) {
      // If it's a top-level leaf (no children, depth 0), still render as expandable header style
      if (depth === 0) {
        return (
          <li class="dm-nav-item">
            <a
              href={getFolderHref(node.slugPrefix)}
              class={`dm-nav-section-link ${isInSection ? "dm-nav-active" : ""}`}
            >
              <span class="dm-nav-name">{node.name}</span>
              {count > 0 && <span class="dm-nav-count">{count}</span>}
            </a>
          </li>
        )
      }
      return (
        <li class="dm-nav-item">
          <a
            href={getFolderHref(node.slugPrefix)}
            class={`dm-nav-leaf ${isInSection ? "dm-nav-active" : ""}`}
          >
            <span class="dm-nav-name">{node.name}</span>
            {count > 0 && <span class="dm-nav-count">{count}</span>}
          </a>
        </li>
      )
    }

    // Branch node — expandable with <details>
    return (
      <li class="dm-nav-item">
        <details class={`dm-nav-branch depth-${depth}`} {...(isInSection ? { open: true } : {})}>
          <summary class="dm-nav-summary">
            <svg class="dm-nav-chevron" viewBox="0 0 10 10" width="10" height="10">
              <path d="M3 1 L7 5 L3 9" fill="none" stroke="currentColor" stroke-width="1.5" />
            </svg>
            <span class="dm-nav-name">{node.name}</span>
            {count > 0 && <span class="dm-nav-count">{count}</span>}
          </summary>
          <div class="dm-nav-children">
            {(() => {
              const featured =
                node.name === "Politicians" ? dynamicFeaturedPoliticians : node.featured
              return featured && featured.length > 0 ? renderFeatured(featured) : null
            })()}
            <ul class="dm-nav-list">
              {node.children.map((child) => renderNode(child, depth + 1))}
            </ul>
          </div>
        </details>
      </li>
    )
  }

  return (
    <div class={classNames(displayClass, "donor-map-sidebar")}>
      {/* Logo */}
      <div class="dm-logo">
        <a href={absHref("")}>
          <span class="dm-logo-dm">DM</span>
          <span class="dm-logo-text"> The Donor Map<span class="dm-cursor">$</span></span>
          <span class="dm-beta">BETA</span>
        </a>
        <div class="dm-subtitle">v2.0 — {allFiles.length.toLocaleString()} nodes tracked</div>
      </div>

      {/* Profile search — autocomplete against profile-index.json.
          Sidebar placement is compact (see profileSearch.scss). Wired
          by ProfileSearch.afterDOMLoaded, registered in
          quartz.layout.ts afterBody. */}
      <div class="profile-search profile-search-sidebar" data-profile-search-root data-placement="sidebar">
        <label class="profile-search-label">
          <span class="profile-search-icon" aria-hidden="true">⌕</span>
          <input
            type="text"
            class="profile-search-input"
            placeholder="Search…"
            autocomplete="off"
            spellcheck={false}
            data-profile-search-input
          />
        </label>
        <div class="profile-search-dropdown" data-profile-search-dropdown hidden></div>
      </div>

      {/* Expandable navigation tree */}
      <nav class="dm-nav">
        <ul class="dm-nav-list dm-nav-root">
          {navTree.map((section) => renderNode(section, 0))}
        </ul>
      </nav>
    </div>
  )
}

// ─── Styles ─────────────────────────────────────────────────────────
DonorMapSidebar.css = `
/* ── Sidebar container ── */
.donor-map-sidebar {
  display: flex;
  flex-direction: column;
  gap: 0;
  padding: 0;
  position: sticky;
  top: 2rem;
  max-height: calc(100vh - 4rem);
}

/* ── Logo (unchanged) ── */
.dm-logo {
  margin-bottom: 1.25rem;
  flex-shrink: 0;
}

.dm-logo a {
  text-decoration: none !important;
  display: flex;
  align-items: center;
  gap: 0;
}

.dm-logo-dm {
  font-family: 'Space Mono', monospace;
  font-size: 14px;
  font-weight: 700;
  color: #0a0a0a;
  background: rgba(91, 141, 206, 0.15);
  padding: 2px 6px;
  border-radius: 0;
  margin-right: 8px;
}

.dm-logo-text {
  font-family: 'Space Grotesk', sans-serif;
  font-size: 18px;
  font-weight: 700;
  color: #0a0a0a;
}

.dm-cursor {
  color: #16a34a;
  text-shadow: 0 0 8px rgba(34, 197, 94, 0.6);
  animation: pulse-glow 2.5s ease-in-out infinite;
}

.dm-beta {
  font-family: 'Space Mono', monospace;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 1.5px;
  color: #fbbf24;
  background: rgba(245, 158, 11, 0.12);
  border: 1px solid rgba(245, 158, 11, 0.3);
  padding: 1px 5px;
  border-radius: 0;
  margin-left: 8px;
  vertical-align: middle;
  position: relative;
  top: -1px;
}

@keyframes pulse-glow {
  0%, 100% { opacity: 1; text-shadow: 0 0 8px rgba(34, 197, 94, 0.6); }
  50% { opacity: 0.3; text-shadow: 0 0 2px rgba(34, 197, 94, 0.2); }
}

.dm-subtitle {
  font-family: 'Space Mono', monospace;
  font-size: 10px;
  letter-spacing: 0.5px;
  color: #999;
  margin-top: 4px;
  margin-left: 2px;
}

/* ── Scrollable nav area ── */
.dm-nav {
  overflow-y: auto;
  overflow-x: hidden;
  flex: 1;
  min-height: 0;
  padding-right: 4px;
}

.dm-nav::-webkit-scrollbar {
  width: 3px;
}

.dm-nav::-webkit-scrollbar-track {
  background: transparent;
}

.dm-nav::-webkit-scrollbar-thumb {
  background: #ddd;
  border-radius: 0;
}

/* ── List resets ── */
.dm-nav-list {
  list-style: none !important;
  padding: 0 !important;
  margin: 0 !important;
}

.dm-nav-item {
  list-style: none !important;
  margin: 0 !important;
  padding: 0 !important;
}

.dm-nav-item::before,
.dm-nav-item::marker {
  display: none !important;
  content: none !important;
}

/* ── Branch nodes (expandable) ── */
.dm-nav-branch {
  border: none;
  margin: 0;
  padding: 0;
}

.dm-nav-branch > summary {
  list-style: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 8px;
  border-radius: 0;
  color: #777;
  transition: background 0.15s, color 0.15s;
  user-select: none;
}

.dm-nav-branch > summary::-webkit-details-marker {
  display: none;
}

.dm-nav-branch > summary:hover {
  background: rgba(91, 141, 206, 0.06);
  color: #0a0a0a;
}

/* ── Chevron icon ── */
.dm-nav-chevron {
  flex-shrink: 0;
  color: #999;
  transition: transform 0.15s ease;
}

details[open] > summary > .dm-nav-chevron {
  transform: rotate(90deg);
}

/* ── Depth 0: top-level section headers ── */
.dm-nav-branch.depth-0 > summary {
  font-family: 'Space Mono', monospace;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 1.5px;
  text-transform: uppercase;
  color: #999;
  padding: 8px 6px;
  margin-top: 4px;
}

.dm-nav-root > .dm-nav-item:first-child .depth-0 > summary {
  margin-top: 0;
}

.dm-nav-branch.depth-0 > summary:hover {
  color: #0a0a0a;
  background: rgba(91, 141, 206, 0.04);
}

.dm-nav-branch.depth-0 > summary > .dm-nav-chevron {
  color: #999;
}

/* ── Depth 1: subcategory headers ── */
.dm-nav-branch.depth-1 > summary {
  font-size: 13px;
  font-weight: 600;
  color: #8a8a96;
  padding: 5px 6px;
}

/* ── Leaf links (navigate to folder pages) ── */
.dm-nav-leaf {
  display: flex;
  align-items: center;
  padding: 4px 6px 4px 22px;
  font-size: 13px;
  color: #8a8a96 !important;
  text-decoration: none !important;
  border-radius: 0;
  border: none !important;
  background: none !important;
  transition: background 0.15s, color 0.15s;
  border-left: 2px solid transparent !important;
}

.dm-nav-leaf:hover {
  background: rgba(91, 141, 206, 0.06) !important;
  color: #333 !important;
}

/* ── Top-level leaf links (sections with no children) ── */
.dm-nav-section-link {
  display: flex;
  align-items: center;
  padding: 8px 6px;
  font-family: 'Space Mono', monospace;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 1.5px;
  text-transform: uppercase;
  color: #999 !important;
  text-decoration: none !important;
  border-radius: 0;
  border: none !important;
  background: none !important;
  transition: background 0.15s, color 0.15s;
  margin-top: 4px;
}

.dm-nav-section-link:hover {
  color: #0a0a0a !important;
  background: rgba(91, 141, 206, 0.04) !important;
}

/* ── Active state ── */
.dm-nav-active {
  color: #0a0a0a !important;
  background: rgba(91, 141, 206, 0.1) !important;
  border-left: 2px solid #0a0a0a !important;
}

.dm-nav-active .dm-nav-count {
  color: #999;
}

.dm-nav-active .dm-featured-detail {
  color: #4ade80 !important;
}

/* ── Count badges ── */
.dm-nav-count {
  font-family: 'Space Mono', monospace;
  font-size: 10px;
  color: #999;
  margin-left: auto;
  padding-left: 8px;
  flex-shrink: 0;
}

/* ── Name (truncate long names) ── */
.dm-nav-name {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* ── Children container (indentation) ── */
.dm-nav-children {
  padding-left: 10px;
}

/* ── Featured items ── */
.dm-featured {
  padding: 4px 0 6px 0;
  margin-bottom: 2px;
  border-bottom: 1px solid rgba(30, 30, 40, 0.6);
}

.dm-featured-link {
  display: flex;
  align-items: center;
  padding: 4px 8px;
  font-size: 13px;
  color: #333 !important;
  text-decoration: none !important;
  border-radius: 0;
  border: none !important;
  background: none !important;
  transition: background 0.15s, color 0.15s;
  border-left: 2px solid transparent !important;
}

.dm-featured-link:hover {
  background: rgba(91, 141, 206, 0.08) !important;
  color: #0a0a0a !important;
}

.dm-featured-name {
  flex: 1;
  font-weight: 500;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.dm-featured-detail {
  font-family: 'Space Mono', monospace;
  font-size: 11px;
  color: #16a34a;
  margin-left: auto;
  padding-left: 8px;
  flex-shrink: 0;
}

/* ── Mobile: show logo only, hide nav ── */
@media (max-width: 800px) {
  .donor-map-sidebar {
    display: flex;
    width: 100%;
    max-height: none;
    position: static;
  }

  .donor-map-sidebar .dm-logo {
    display: flex;
    flex-direction: column;
    align-items: center;
    margin-bottom: 0.5rem;
    width: 100%;
  }

  .donor-map-sidebar .dm-nav {
    display: none;
  }
}
`

export default (() => DonorMapSidebar) satisfies QuartzComponentConstructor
