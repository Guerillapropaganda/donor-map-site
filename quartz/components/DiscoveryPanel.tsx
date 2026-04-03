import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"
import { simplifySlug } from "../util/path"
import { classNames } from "../util/lang"

interface ProfileLink {
  name: string
  slug: string
  party?: string
  sector?: string
  type?: string
}

const DiscoveryPanel: QuartzComponent = ({
  fileData,
  allFiles,
  cfg,
  displayClass,
}: QuartzComponentProps) => {
  const slug = String(fileData.slug ?? "").toLowerCase()
  if (slug === "index" || slug.endsWith("/index")) return null

  const fm = fileData.frontmatter
  if (!fm) return null
  const type = String(fm.type ?? "")
  if (!type || type === "unknown" || type === "undefined") return null

  const baseUrl = cfg.baseUrl ?? ""
  const slashIdx = baseUrl.indexOf("/")
  const basePath = slashIdx >= 0 ? "/" + baseUrl.substring(slashIdx + 1) : ""

  const currentTitle = String(fm.title ?? "").replace(/^_/, "").replace(/\s*Master Profile.*/, "").trim()

  // Build lookup maps
  const donorToPols = new Map<string, ProfileLink[]>()
  const polToDonors = new Map<string, ProfileLink[]>()
  const donorSlugs = new Map<string, string>()
  const polSlugs = new Map<string, string>()

  for (const f of allFiles) {
    const fFm = f.frontmatter
    if (!fFm) continue
    const fSlug = (f.slug ?? "").toLowerCase()
    const fTitle = String(fFm.title ?? "").replace(/^_/, "").replace(/\s*Master Profile.*/, "").trim()
    if (!fTitle) continue

    if (fSlug.startsWith("donors--and--power-networks/")) {
      const pols = Array.isArray(fFm["politicians-funded"]) ? fFm["politicians-funded"] as string[] : []
      donorSlugs.set(fTitle, `${basePath}/${simplifySlug(f.slug!)}`)
      if (pols.length > 0) {
        donorToPols.set(fTitle, pols.map(p => ({
          name: p,
          slug: "",
          party: "",
        })))
      }
    }

    if (fSlug.startsWith("politicians/") && fSlug.includes("master-profile")) {
      const donors = Array.isArray(fFm["top-donors"]) ? fFm["top-donors"] as string[] : []
      const party = String(fFm.party ?? "")
      const chamber = String(fFm.chamber ?? "")
      polSlugs.set(fTitle, `${basePath}/${simplifySlug(f.slug!)}`)
      if (donors.length > 0) {
        polToDonors.set(fTitle, donors.map(d => ({
          name: d,
          slug: "",
          sector: "",
        })))
      }
    }
  }

  // Resolve slugs
  for (const [donor, pols] of donorToPols) {
    for (const p of pols) {
      p.slug = polSlugs.get(p.name) ?? ""
    }
  }
  for (const [pol, donors] of polToDonors) {
    for (const d of donors) {
      d.slug = donorSlugs.get(d.name) ?? ""
    }
  }

  // ── For DONOR profiles: "Also funds these politicians" ──
  let alsoFunds: ProfileLink[] = []
  if (slug.startsWith("donors--and--power-networks/")) {
    const pols = donorToPols.get(currentTitle)
    if (pols && pols.length > 0) {
      alsoFunds = pols.filter(p => p.slug)
    }
  }

  // ── For POLITICIAN profiles: "These donors also fund..." ──
  let sharedDonors: { donor: ProfileLink; alsoPols: ProfileLink[] }[] = []
  if (slug.includes("master-profile") && slug.startsWith("politicians/")) {
    const myDonors = polToDonors.get(currentTitle)
    if (myDonors) {
      for (const d of myDonors) {
        const otherPols = donorToPols.get(d.name)
        if (otherPols && otherPols.length > 1) {
          const others = otherPols.filter(p => p.name !== currentTitle && p.slug)
          if (others.length > 0) {
            sharedDonors.push({
              donor: { name: d.name, slug: donorSlugs.get(d.name) ?? "" },
              alsoPols: others.slice(0, 5),
            })
          }
        }
      }
    }
  }

  // ── "Did You Know" facts — curated surprising stats ──
  const facts = [
    "AIPAC and its Super PAC spent $121.2M in 2024 — funding candidates in both parties to maintain a 97-3 Senate vote on Israel aid.",
    "Koch Network donated $2.9M to McConnell. The 2017 tax cuts were worth $1.9 trillion. That is a 655,172x return on investment.",
    "The same 5 donors fund the top politicians in both parties. Different jerseys, identical policy outcomes on drug pricing, defense, and Wall Street regulation.",
    "Raytheon funds 22 politicians across both parties. Its board members rotate through Pentagon leadership positions.",
    "PhRMA spent $2.1M to kill drug pricing negotiation worth $450 billion to the American public.",
    "Goldman Sachs funds both Pelosi ($2.1M) and McConnell ($1.5M). The carried interest loophole has survived 30+ years.",
    "The Fanjul sugar dynasty funded both Rubio and Menendez. Cuba sanctions — which eliminate their agricultural competition — are bipartisan.",
    "National Association of Realtors funds Pelosi ($1.8M), Schumer ($1.6M), McConnell ($1.4M), and Trump ($1.2M). Housing deregulation is bipartisan.",
  ]

  // Pick a fact based on the page slug (deterministic but varied)
  let hash = 0
  for (let i = 0; i < slug.length; i++) {
    hash = ((hash << 5) - hash + slug.charCodeAt(i)) | 0
  }
  const factIdx = Math.abs(hash) % facts.length
  const fact = facts[factIdx]

  // Don't render if we have nothing to show
  if (alsoFunds.length === 0 && sharedDonors.length === 0) return null

  return (
    <div class={classNames(displayClass, "dp-panel")}>
      {/* Also Funds — for donor profiles */}
      {alsoFunds.length > 0 && (
        <div class="dp-section">
          <div class="dp-section-label">THIS DONOR ALSO FUNDS</div>
          <div class="dp-chip-grid">
            {alsoFunds.map((p) => (
              <a href={p.slug} class="dp-chip internal">
                {p.name}
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Shared Donors — for politician profiles */}
      {sharedDonors.length > 0 && (
        <div class="dp-section">
          <div class="dp-section-label">SHARED DONORS</div>
          {sharedDonors.map((sd) => (
            <div class="dp-shared-row">
              <a href={sd.donor.slug} class="dp-donor-name internal">
                {sd.donor.name}
              </a>
              <div class="dp-also-text">also funds</div>
              <div class="dp-also-list">
                {sd.alsoPols.map((p) => (
                  <a href={p.slug} class="dp-also-chip internal">
                    {p.name}
                  </a>
                ))}
                {sharedDonors.length > 0 && (
                  <span></span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Did You Know */}
      <div class="dp-fact">
        <div class="dp-fact-label">DID YOU KNOW</div>
        <p class="dp-fact-text">{fact}</p>
      </div>
    </div>
  )
}

DiscoveryPanel.css = `
/* ═══════════════════════════════════════════════
   DISCOVERY PANEL — Right sidebar
   ═══════════════════════════════════════════════ */

.dp-panel {
  border-top: 1px solid #1e1e28;
  margin-top: 16px;
  padding-top: 16px;
}

.dp-section {
  margin-bottom: 16px;
}

.dp-section-label {
  font-family: 'Space Mono', monospace;
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 2px;
  color: #63636e;
  margin-bottom: 10px;
}

/* Also Funds chips */
.dp-chip-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
}

.dp-chip {
  font-size: 11px;
  font-weight: 500;
  color: #b4b4bc !important;
  background: rgba(91, 141, 206, 0.06);
  border: 1px solid #1e1e28;
  padding: 4px 10px;
  border-radius: 4px;
  text-decoration: none !important;
  transition: all 0.15s;
}

.dp-chip:hover {
  background: rgba(91, 141, 206, 0.12);
  border-color: rgba(91, 141, 206, 0.3);
  color: #e4e4e7 !important;
}

/* Shared Donors rows */
.dp-shared-row {
  padding: 10px;
  background: rgba(255, 255, 255, 0.015);
  border-radius: 6px;
  margin-bottom: 6px;
  border: 1px solid #1a1a22;
}

.dp-donor-name {
  font-size: 12px;
  font-weight: 700;
  color: #22c55e !important;
  text-decoration: none !important;
}

.dp-donor-name:hover {
  color: #4ade80 !important;
}

.dp-also-text {
  font-family: 'Space Mono', monospace;
  font-size: 8px;
  color: #4a4a54;
  letter-spacing: 1px;
  margin: 4px 0;
}

.dp-also-list {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.dp-also-chip {
  font-size: 10px;
  color: #a1a1aa !important;
  background: rgba(161, 161, 170, 0.06);
  padding: 2px 8px;
  border-radius: 3px;
  text-decoration: none !important;
}

.dp-also-chip:hover {
  color: #e4e4e7 !important;
  background: rgba(91, 141, 206, 0.08);
}

/* Did You Know */
.dp-fact {
  margin-top: 16px;
  padding: 12px;
  background: rgba(245, 158, 11, 0.04);
  border: 1px solid rgba(245, 158, 11, 0.12);
  border-radius: 6px;
}

.dp-fact-label {
  font-family: 'Space Mono', monospace;
  font-size: 8px;
  font-weight: 700;
  letter-spacing: 2px;
  color: #f59e0b;
  margin-bottom: 6px;
}

.dp-fact-text {
  font-size: 11px;
  line-height: 1.6;
  color: #a1a1aa;
  margin: 0;
}

/* Hide on mobile — right sidebar hides */
@media (max-width: 800px) {
  .dp-panel {
    display: none;
  }
}
`

export default (() => DiscoveryPanel) satisfies QuartzComponentConstructor
