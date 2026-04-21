import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"

/**
 * DataCompleteBanner — ADR-0017
 *
 * Renders at the top of `content-readiness: data-complete` profiles to make
 * it unambiguous that the profile is auto-generated from government records
 * and has not been editorially reviewed. Verified profiles do not show this
 * banner; they show a "Verified" badge in ProfileHeader instead.
 *
 * Rule 10 (amended): data-complete is publishable. The banner is the
 * defamation-risk mitigation — it reframes the page as "here's what the
 * government filed" rather than "here's our conclusion."
 */

const BANNER_TYPES = new Set([
  "politician", "state-politician", "local-politician",
  "donor", "corporation", "pac", "think-tank", "lobbying-firm",
])

const DataCompleteBanner: QuartzComponent = ({ fileData }: QuartzComponentProps) => {
  const fm = fileData.frontmatter
  if (!fm) return null

  const readiness = String(fm["content-readiness"] ?? "").toLowerCase()
  if (readiness !== "data-complete") return null

  const type = String(fm.type ?? "")
  if (!BANNER_TYPES.has(type)) return null

  return (
    <aside class="data-complete-banner" role="note" aria-label="Auto-generated profile notice">
      <div class="data-complete-banner-label">AUTO-GENERATED</div>
      <p class="data-complete-banner-body">
        This profile is auto-generated from federal disclosures: FEC filings, IRS 990s,
        USASpending contracts, and STOCK Act transactions. Numbers and relationships
        come from government sources, linked below. This profile has not yet been
        editorially reviewed.
      </p>
    </aside>
  )
}

DataCompleteBanner.css = `
.data-complete-banner {
  border: 2px solid var(--dark);
  border-left: 8px solid #fbbf24;
  background: var(--light);
  padding: 16px 20px;
  margin: 0 0 24px;
  font-family: "Inter", sans-serif;
}

.data-complete-banner-label {
  font-family: "Space Mono", monospace;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.2em;
  color: var(--dark);
  margin-bottom: 8px;
}

.data-complete-banner-body {
  margin: 0;
  font-size: 13px;
  line-height: 1.5;
  color: var(--dark);
}

@media (max-width: 600px) {
  .data-complete-banner {
    padding: 12px 14px;
    margin: 0 0 16px;
    border-left-width: 6px;
  }
  .data-complete-banner-body {
    font-size: 12px;
  }
}
`

export default (() => DataCompleteBanner) satisfies QuartzComponentConstructor
