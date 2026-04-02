import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"
import { classNames } from "../util/lang"
import { resolveRelative } from "../util/path"
import { QuartzPluginData } from "../plugins/vfile"

// Lookup helper: find a page in allFiles by matching the end of its slug
// e.g. searchTerm "_Nancy-Pelosi-Master-Profile" matches
// "Politicians/Democrats/House/Nancy-Pelosi/_Nancy-Pelosi-Master-Profile"
function findPage(allFiles: QuartzPluginData[], searchTerm: string): QuartzPluginData | undefined {
  const lower = searchTerm.toLowerCase()
  // Try exact end-of-slug match first (most precise)
  return allFiles.find((f) => {
    const slug = (f.slug ?? "").toLowerCase()
    return slug.endsWith(lower) || slug === lower
  })
}

// Sidebar entry definitions — only need display name + a unique search key
// The search key matches the END of the Quartz slug (filename portion)
const politicians = [
  { name: "Nancy Pelosi", amount: "$14.2M", search: "_nancy-pelosi-master-profile" },
  { name: "Mitch McConnell", amount: "$11.8M", search: "_mitch-mcconnell-master-profile" },
  { name: "Ted Cruz", amount: "$9.4M", search: "_ted-cruz-master-profile" },
  { name: "Chuck Schumer", amount: "$8.7M", search: "_chuck-schumer-master-profile" },
  { name: "Donald Trump", amount: "$7.2M", search: "_donald-trump-master-profile" },
]

const donors = [
  { name: "Goldman Sachs", icon: "\u{1F3E6}", search: "wall-street/goldman-sachs" },
  { name: "AIPAC", icon: "\u{1F54E}", search: "aipac---american-israel-public-affairs-committee" },
  { name: "Koch Network", icon: "\u{1F3ED}", search: "koch-network---charles-koch" },
  { name: "Lockheed Martin", icon: "\u{2708}", search: "defense--and--intelligence/lockheed-martin" },
]

const contradictions = [
  { name: "Drug Pricing Theater", icon: "\u{1F48A}", search: "contradiction-03---pharma-kills-drug-negotiation-from-both-sides" },
  { name: "Defense Budget Bloat", icon: "\u{1F4A3}", search: "contradiction-04---lockheed-martin-buys-defense-hawks-in-both-parties" },
  { name: "Carried Interest Scam", icon: "\u{1F4B0}", search: "the-carried-interest-loophole---30-years-of-survival" },
]

const DonorMapSidebar: QuartzComponent = ({
  fileData,
  cfg,
  displayClass,
  allFiles,
}: QuartzComponentProps) => {
  const currentSlug = (fileData.slug ?? "").toLowerCase()

  // Resolve a search term to a proper relative URL using Quartz's own resolver
  function getHref(searchTerm: string): string {
    const page = findPage(allFiles, searchTerm)
    if (page?.slug) {
      return resolveRelative(fileData.slug!, page.slug)
    }
    // Fallback: return "#" if page not found (won't 404, just stays on page)
    return "#"
  }

  return (
    <div class={classNames(displayClass, "donor-map-sidebar")}>
      <div class="dm-logo">
        <a href={resolveRelative(fileData.slug!, "index" as any)}>
          <span class="dm-logo-dm">DM</span>
          <span class="dm-logo-text"> Donor Map<span class="dm-cursor">_</span></span>
        </a>
        <div class="dm-subtitle">v2.0 — {allFiles.length.toLocaleString()} nodes tracked</div>
      </div>

      <nav class="dm-nav">
        <div class="dm-section">
          <div class="dm-section-label">POLITICIANS</div>
          <ul class="dm-list">
            {politicians.map((p) => {
              const href = getHref(p.search)
              const isActive = currentSlug.includes(p.name.toLowerCase().replace(/ /g, "-"))
              return (
                <li class={`dm-list-item ${isActive ? "dm-active" : ""}`}>
                  <a href={href} class={`dm-link ${isActive ? "dm-active-link" : ""}`}>
                    <span class="dm-name">{p.name}</span>
                    <span class="dm-amount">{p.amount}</span>
                  </a>
                </li>
              )
            })}
          </ul>
        </div>

        <div class="dm-section">
          <div class="dm-section-label">DONOR NODES</div>
          <ul class="dm-list">
            {donors.map((d) => {
              const href = getHref(d.search)
              return (
                <li class="dm-list-item">
                  <a href={href} class="dm-link">
                    <span class="dm-icon">{d.icon}</span>
                    <span class="dm-name">{d.name}</span>
                  </a>
                </li>
              )
            })}
          </ul>
        </div>

        <div class="dm-section">
          <div class="dm-section-label">CONTRADICTIONS</div>
          <ul class="dm-list">
            {contradictions.map((c) => {
              const href = getHref(c.search)
              return (
                <li class="dm-list-item">
                  <a href={href} class="dm-link">
                    <span class="dm-icon">{c.icon}</span>
                    <span class="dm-name">{c.name}</span>
                  </a>
                </li>
              )
            })}
          </ul>
        </div>

      </nav>
    </div>
  )
}

DonorMapSidebar.css = `
.donor-map-sidebar {
  display: flex;
  flex-direction: column;
  gap: 0;
  padding: 0;
  position: sticky;
  top: 2rem;
}

/* Logo */
.dm-logo {
  margin-bottom: 1.5rem;
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
  color: #818cf8;
  background: rgba(99, 102, 241, 0.15);
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
  color: #818cf8;
  animation: blink 1.2s step-end infinite;
}

@keyframes blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0; }
}

.dm-subtitle {
  font-family: 'Space Mono', monospace;
  font-size: 10px;
  letter-spacing: 0.5px;
  color: #63636e;
  margin-top: 4px;
  margin-left: 2px;
}

/* Navigation */
.dm-nav {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.dm-section-label {
  font-family: 'Space Mono', monospace;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 2px;
  color: #63636e;
  margin-bottom: 6px;
}

.dm-list {
  list-style: none !important;
  padding: 0 !important;
  margin: 0 !important;
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.dm-list-item {
  margin: 0 !important;
  padding: 0 !important;
  list-style: none !important;
}

.dm-list-item::before,
.dm-list-item::marker {
  display: none !important;
  content: none !important;
}

.dm-link {
  display: flex;
  align-items: center;
  padding: 7px 10px;
  border-radius: 6px;
  text-decoration: none !important;
  transition: background 0.15s, color 0.15s;
  font-size: 14px;
  color: #a1a1aa !important;
  background: none !important;
  border: none !important;
  border-left: 3px solid transparent !important;
  gap: 8px;
}

.dm-link:hover {
  background: rgba(99, 102, 241, 0.08) !important;
  color: #e4e4e7 !important;
}

/* Active state — purple left border + highlight */
.dm-active-link {
  color: #e4e4e7 !important;
  font-weight: 600 !important;
  background: rgba(99, 102, 241, 0.12) !important;
  border-left: 3px solid #818cf8 !important;
}

.dm-active-link .dm-amount {
  color: #4ade80 !important;
}

.dm-name {
  font-weight: 500;
  flex: 1;
}

.dm-amount {
  font-family: 'Space Mono', monospace;
  font-size: 12px;
  font-weight: 600;
  color: #22c55e;
  margin-left: auto;
}

.dm-icon {
  font-size: 14px;
  width: 20px;
  text-align: center;
  flex-shrink: 0;
}

/* Hide on mobile */
@media (max-width: 800px) {
  .donor-map-sidebar {
    display: none;
  }
}
`

export default (() => DonorMapSidebar) satisfies QuartzComponentConstructor
