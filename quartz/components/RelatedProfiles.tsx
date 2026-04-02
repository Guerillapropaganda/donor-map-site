import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"
import { resolveRelative, simplifySlug } from "../util/path"
import { classNames } from "../util/lang"

const RelatedProfiles: QuartzComponent = ({
  fileData,
  allFiles,
  displayClass,
}: QuartzComponentProps) => {
  const slug = simplifySlug(fileData.slug!)
  const currentLinks = new Set(fileData.links ?? [])

  if (currentLinks.size === 0) return null

  // Find pages that share the most outgoing links with the current page
  const scored = allFiles
    .filter((f) => {
      const fSlug = simplifySlug(f.slug!)
      // Skip self, index pages, and folder pages
      if (fSlug === slug) return false
      if (fSlug === "index" || fSlug.endsWith("/index")) return false
      return true
    })
    .map((f) => {
      const fLinks = new Set(f.links ?? [])
      let shared = 0
      for (const link of fLinks) {
        if (currentLinks.has(link)) shared++
      }
      return { file: f, shared }
    })
    .filter(({ shared }) => shared >= 2) // need at least 2 shared links
    .sort((a, b) => b.shared - a.shared)
    .slice(0, 8) // top 8

  if (scored.length === 0) return null

  // Determine content type from slug
  function getType(s: string): string {
    const lower = s.toLowerCase()
    if (lower.startsWith("politicians/")) return "POLITICIAN"
    if (lower.startsWith("donors")) return "DONOR"
    if (lower.startsWith("stories/")) return "STORY"
    if (lower.startsWith("lobbying") || lower.startsWith("k-street")) return "K STREET"
    if (lower.startsWith("media")) return "MEDIA"
    if (lower.startsWith("think")) return "THINK TANK"
    return ""
  }

  function getTypeClass(type: string): string {
    switch (type) {
      case "POLITICIAN": return "rp-type-pol"
      case "DONOR": return "rp-type-donor"
      case "STORY": return "rp-type-story"
      default: return "rp-type-other"
    }
  }

  return (
    <div class={classNames(displayClass, "related-profiles")}>
      <h3>Related Profiles</h3>
      <p class="rp-subtitle">Pages sharing the most connections with this one</p>
      <ul class="rp-list">
        {scored.map(({ file, shared }) => {
          const type = getType(file.slug ?? "")
          return (
            <li class="rp-item">
              <a href={resolveRelative(fileData.slug!, file.slug!)} class="internal rp-link">
                {type && <span class={`rp-badge ${getTypeClass(type)}`}>{type}</span>}
                <span class="rp-name">{file.frontmatter?.title ?? file.slug}</span>
                <span class="rp-shared">{shared} shared</span>
              </a>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

RelatedProfiles.css = `
.related-profiles {
  border-top: 1px solid #1e1e28;
  margin-top: 16px;
  padding-top: 16px;
}

.related-profiles > h3 {
  font-family: 'Space Mono', monospace !important;
  font-size: 11px !important;
  letter-spacing: 2px !important;
  text-transform: uppercase !important;
  color: #63636e !important;
  margin-bottom: 4px;
}

.rp-subtitle {
  font-size: 10px;
  color: #4a4a54;
  margin-bottom: 12px;
}

.rp-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.rp-item {
  margin: 0;
  padding: 0;
}

.rp-link {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 8px;
  border-radius: 4px;
  text-decoration: none !important;
  border: none !important;
  transition: background 0.15s;
  color: #b4b4bc !important;
  font-size: 13px;
}

.rp-link:hover {
  background: rgba(91, 141, 206, 0.08);
}

.rp-badge {
  font-family: 'Space Mono', monospace;
  font-size: 8px;
  font-weight: 700;
  letter-spacing: 1px;
  padding: 2px 5px;
  border-radius: 3px;
  white-space: nowrap;
  flex-shrink: 0;
}

.rp-type-pol {
  background: rgba(91, 141, 206, 0.15);
  color: #5b8dce;
}

.rp-type-donor {
  background: rgba(34, 197, 94, 0.15);
  color: #22c55e;
}

.rp-type-story {
  background: rgba(239, 68, 68, 0.15);
  color: #ef4444;
}

.rp-type-other {
  background: rgba(245, 158, 11, 0.15);
  color: #f59e0b;
}

.rp-name {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: #c8c8d0;
}

.rp-shared {
  font-family: 'Space Mono', monospace;
  font-size: 10px;
  color: #4a4a54;
  flex-shrink: 0;
}
`

export default (() => RelatedProfiles) satisfies QuartzComponentConstructor
