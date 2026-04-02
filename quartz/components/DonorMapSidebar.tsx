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

// ─── Featured items (curated) ───────────────────────────────────────
const featuredPoliticians: FeaturedItem[] = [
  { name: "Nancy Pelosi", detail: "$14.2M", search: "_nancy-pelosi-master-profile" },
  { name: "Mitch McConnell", detail: "$11.8M", search: "_mitch-mcconnell-master-profile" },
  { name: "Ted Cruz", detail: "$9.4M", search: "_ted-cruz-master-profile" },
  { name: "Chuck Schumer", detail: "$8.7M", search: "_chuck-schumer-master-profile" },
  { name: "Donald Trump", detail: "$7.2M", search: "_donald-trump-master-profile" },
]

const featuredDonors: FeaturedItem[] = [
  { name: "Goldman Sachs", detail: "\u{1F3E6}", search: "wall-street/goldman-sachs" },
  { name: "AIPAC", detail: "\u{1F54E}", search: "aipac---american-israel-public-affairs-committee" },
  { name: "Koch Network", detail: "\u{1F3ED}", search: "koch-network---charles-koch" },
  { name: "Lockheed Martin", detail: "\u{2708}", search: "defense--and--intelligence/lockheed-martin" },
]

const featuredStories: FeaturedItem[] = [
  { name: "Drug Pricing Theater", detail: "\u{1F48A}", search: "contradiction-03---pharma-kills-drug-negotiation-from-both-sides" },
  { name: "Defense Budget Bloat", detail: "\u{1F4A3}", search: "contradiction-04---lockheed-martin-buys-defense-hawks-in-both-parties" },
  { name: "Carried Interest Scam", detail: "\u{1F4B0}", search: "the-carried-interest-loophole---30-years-of-survival" },
]

// ─── Navigation tree structure ──────────────────────────────────────
// slugPrefix must match Quartz's slug encoding:
//   spaces → hyphens, & → --and--, _ prefix preserved
const navTree: NavNode[] = [
  {
    name: "Politicians",
    slugPrefix: "Politicians",
    featured: featuredPoliticians,
    children: [
      {
        name: "Democrats",
        slugPrefix: "Politicians/Democrats",
        children: [
          { name: "Senate", slugPrefix: "Politicians/Democrats/Senate" },
          { name: "House", slugPrefix: "Politicians/Democrats/House" },
          { name: "Governors", slugPrefix: "Politicians/Democrats/Governors" },
          { name: "Presidential", slugPrefix: "Politicians/Democrats/Presidential" },
          { name: "CA Governor 2026", slugPrefix: "Politicians/Democrats/CA-Governor-2026" },
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
          { name: "CA Governor 2026", slugPrefix: "Politicians/Republicans/CA-Governor-2026" },
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
    children: [
      { name: "Right", slugPrefix: "Media--and--Influence-Pipeline/Right" },
      { name: "Left", slugPrefix: "Media--and--Influence-Pipeline/Left" },
      { name: "Centrist", slugPrefix: "Media--and--Influence-Pipeline/Centrist" },
    ],
  },
  {
    name: "Think Tanks",
    slugPrefix: "Think-Tanks--and--Policy-Infrastructure",
    children: [
      { name: "Conservative", slugPrefix: "Think-Tanks--and--Policy-Infrastructure/Conservative" },
      { name: "Liberal", slugPrefix: "Think-Tanks--and--Policy-Infrastructure/Liberal" },
      { name: "Centrist", slugPrefix: "Think-Tanks--and--Policy-Infrastructure/Centrist" },
    ],
  },
  {
    name: "K Street",
    slugPrefix: "Lobbying-Firms--and--K-Street",
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
          return (
            <a
              href={href}
              class={`dm-featured-link ${isActive ? "dm-nav-active" : ""}`}
              data-no-popover
            >
              <span class="dm-featured-name">{item.name}</span>
              <span class="dm-featured-detail">{item.detail}</span>
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
            {node.featured && node.featured.length > 0 && renderFeatured(node.featured)}
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
          <span class="dm-logo-text"> Donor Map<span class="dm-cursor">$</span></span>
        </a>
        <div class="dm-subtitle">v2.0 — {allFiles.length.toLocaleString()} nodes tracked</div>
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
  color: #5b8dce;
  background: rgba(91, 141, 206, 0.15);
  padding: 2px 6px;
  border-radius: 3px;
  margin-right: 8px;
}

.dm-logo-text {
  font-family: 'Space Grotesk', sans-serif;
  font-size: 18px;
  font-weight: 700;
  color: #e4e4e7;
}

.dm-cursor {
  color: #22c55e;
  text-shadow: 0 0 8px rgba(34, 197, 94, 0.6);
  animation: pulse-glow 2.5s ease-in-out infinite;
}

@keyframes pulse-glow {
  0%, 100% { opacity: 1; text-shadow: 0 0 8px rgba(34, 197, 94, 0.6); }
  50% { opacity: 0.3; text-shadow: 0 0 2px rgba(34, 197, 94, 0.2); }
}

.dm-subtitle {
  font-family: 'Space Mono', monospace;
  font-size: 10px;
  letter-spacing: 0.5px;
  color: #63636e;
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
  background: #1e1e28;
  border-radius: 3px;
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
  border-radius: 4px;
  color: #a1a1aa;
  transition: background 0.15s, color 0.15s;
  user-select: none;
}

.dm-nav-branch > summary::-webkit-details-marker {
  display: none;
}

.dm-nav-branch > summary:hover {
  background: rgba(91, 141, 206, 0.06);
  color: #e4e4e7;
}

/* ── Chevron icon ── */
.dm-nav-chevron {
  flex-shrink: 0;
  color: #4a4a54;
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
  color: #63636e;
  padding: 8px 6px;
  margin-top: 4px;
}

.dm-nav-root > .dm-nav-item:first-child .depth-0 > summary {
  margin-top: 0;
}

.dm-nav-branch.depth-0 > summary:hover {
  color: #5b8dce;
  background: rgba(91, 141, 206, 0.04);
}

.dm-nav-branch.depth-0 > summary > .dm-nav-chevron {
  color: #63636e;
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
  border-radius: 4px;
  border: none !important;
  background: none !important;
  transition: background 0.15s, color 0.15s;
  border-left: 2px solid transparent !important;
}

.dm-nav-leaf:hover {
  background: rgba(91, 141, 206, 0.06) !important;
  color: #c8c8d0 !important;
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
  color: #63636e !important;
  text-decoration: none !important;
  border-radius: 4px;
  border: none !important;
  background: none !important;
  transition: background 0.15s, color 0.15s;
  margin-top: 4px;
}

.dm-nav-section-link:hover {
  color: #5b8dce !important;
  background: rgba(91, 141, 206, 0.04) !important;
}

/* ── Active state ── */
.dm-nav-active {
  color: #e4e4e7 !important;
  background: rgba(91, 141, 206, 0.1) !important;
  border-left: 2px solid #5b8dce !important;
}

.dm-nav-active .dm-nav-count {
  color: #63636e;
}

.dm-nav-active .dm-featured-detail {
  color: #4ade80 !important;
}

/* ── Count badges ── */
.dm-nav-count {
  font-family: 'Space Mono', monospace;
  font-size: 9px;
  color: #3a3a44;
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
  color: #b4b4bc !important;
  text-decoration: none !important;
  border-radius: 4px;
  border: none !important;
  background: none !important;
  transition: background 0.15s, color 0.15s;
  border-left: 2px solid transparent !important;
}

.dm-featured-link:hover {
  background: rgba(91, 141, 206, 0.08) !important;
  color: #e4e4e7 !important;
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
  color: #22c55e;
  margin-left: auto;
  padding-left: 8px;
  flex-shrink: 0;
}

/* ── Hide on mobile ── */
@media (max-width: 800px) {
  .donor-map-sidebar {
    display: none;
  }
}
`

export default (() => DonorMapSidebar) satisfies QuartzComponentConstructor
