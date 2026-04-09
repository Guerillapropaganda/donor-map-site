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

  // ── "Did You Know" — generate facts specific to THIS profile ──
  const facts: string[] = []

  if (slug.startsWith("politicians/") && slug.includes("master-profile")) {
    // Politician: facts about their donors
    const myDonors = polToDonors.get(currentTitle) ?? []
    const party = String(fm.party ?? "")

    if (myDonors.length > 0) {
      facts.push(`${currentTitle} has ${myDonors.length} top donors tracked in this database.`)
    }
    if (sharedDonors.length > 0) {
      const crossParty = sharedDonors.filter(sd =>
        sd.alsoPols.some(p => {
          // Check if any "also funds" politician is from the other party
          for (const f2 of allFiles) {
            const n = String(f2.frontmatter?.title ?? "").replace(/^_/, "").replace(/\s*Master Profile.*/, "").trim()
            if (n === p.name) {
              const otherParty = String(f2.frontmatter?.party ?? "")
              return otherParty && otherParty !== party
            }
          }
          return false
        })
      )
      if (crossParty.length > 0) {
        facts.push(`${crossParty.length} of ${currentTitle}'s donors also fund politicians in the opposing party.`)
      }
    }
    if (sharedDonors.length >= 2) {
      const names = sharedDonors.slice(0, 2).map(sd => sd.donor.name).join(" and ")
      facts.push(`${names} both fund ${currentTitle} — and also fund politicians on the other side of the aisle.`)
    }
    const issues = Array.isArray(fm.issues) ? fm.issues as string[] : []
    if (issues.length > 0) {
      facts.push(`${currentTitle} is tracked across ${issues.length} policy issue${issues.length > 1 ? "s" : ""}: ${issues.slice(0, 3).join(", ")}.`)
    }
  } else if (slug.startsWith("donors--and--power-networks/")) {
    // Donor: facts about their reach
    if (alsoFunds.length > 0) {
      facts.push(`${currentTitle} funds ${alsoFunds.length} politician${alsoFunds.length > 1 ? "s" : ""} tracked in this database.`)
    }
    if (alsoFunds.length >= 5) {
      facts.push(`${currentTitle} has a reach score of ${alsoFunds.length} — placing them among the most connected donors in the database.`)
    }
    const sector = String(fm.sector ?? "")
    if (sector && sector !== "undefined") {
      facts.push(`${currentTitle} operates in the ${sector} sector — one of the most active in political spending.`)
    }
    const issues = Array.isArray(fm.issues) ? fm.issues as string[] : []
    if (issues.length > 0) {
      facts.push(`${currentTitle} is linked to ${issues.length} policy area${issues.length > 1 ? "s" : ""}: ${issues.join(", ")}.`)
    }
  }

  // Fallback if no specific facts generated
  if (facts.length === 0) {
    facts.push("This profile is part of a database tracking how political money shapes policy outcomes across both parties.")
  }

  // Pick a fact deterministically based on slug
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
  border-top: 1px solid #ddd;
  margin-top: 16px;
  padding-top: 16px;
}

.dp-section {
  margin-bottom: 16px;
}

.dp-section-label {
  font-family: 'Space Mono', monospace;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 2px;
  color: #8a8a96;
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
  color: #333 !important;
  background: rgba(91, 141, 206, 0.06);
  border: 1px solid #ddd;
  padding: 4px 10px;
  border-radius: 0;
  text-decoration: none !important;
  transition: all 0.15s;
}

.dp-chip:hover {
  background: rgba(91, 141, 206, 0.12);
  border-color: rgba(91, 141, 206, 0.3);
  color: #0a0a0a !important;
}

/* Shared Donors rows */
.dp-shared-row {
  padding: 10px;
  background: rgba(255, 255, 255, 0.015);
  border-radius: 0;
  margin-bottom: 6px;
  border: 1px solid #ddd;
}

.dp-donor-name {
  font-size: 12px;
  font-weight: 700;
  color: #16a34a !important;
  text-decoration: none !important;
}

.dp-donor-name:hover {
  color: #4ade80 !important;
}

.dp-also-text {
  font-family: 'Space Mono', monospace;
  font-size: 10px;
  color: #999;
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
  color: #777 !important;
  background: rgba(161, 161, 170, 0.06);
  padding: 2px 8px;
  border-radius: 0;
  text-decoration: none !important;
}

.dp-also-chip:hover {
  color: #0a0a0a !important;
  background: rgba(91, 141, 206, 0.08);
}

/* Did You Know */
.dp-fact {
  margin-top: 16px;
  padding: 12px;
  background: rgba(245, 158, 11, 0.04);
  border: 1px solid rgba(245, 158, 11, 0.12);
  border-radius: 0;
}

.dp-fact-label {
  font-family: 'Space Mono', monospace;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 2px;
  color: #fbbf24;
  margin-bottom: 6px;
}

.dp-fact-text {
  font-size: 11px;
  line-height: 1.6;
  color: #777;
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
