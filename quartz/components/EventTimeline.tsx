import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"
import { simplifySlug } from "../util/path"
import { classNames } from "../util/lang"

const EventTimeline: QuartzComponent = ({
  fileData,
  allFiles,
  cfg,
  displayClass,
}: QuartzComponentProps) => {
  const slug = String(fileData.slug ?? "").toLowerCase()

  // Only show on profile pages (master profiles + donor profiles)
  const isPolitician = slug.startsWith("politicians/") && slug.includes("master-profile")
  const isDonor = slug.startsWith("donors--and--power-networks/")
  if (!isPolitician && !isDonor) return null

  const fm = fileData.frontmatter
  if (!fm) return null

  const baseUrl = cfg.baseUrl ?? ""
  const slashIdx = baseUrl.indexOf("/")
  const basePath = slashIdx >= 0 ? "/" + baseUrl.substring(slashIdx + 1) : ""

  const currentTitle = String(fm.title ?? "")
    .replace(/^_/, "")
    .replace(/\s*Master Profile.*/, "")
    .trim()

  if (!currentTitle) return null

  // Find events that mention this profile
  const events: {
    title: string
    date: string
    source: string
    sourceUrl: string
    slug: string
    profiles: string[]
    category: string
  }[] = []

  for (const f of allFiles) {
    const fSlug = (f.slug ?? "").toLowerCase()
    if (!fSlug.startsWith("events/")) continue

    const fFm = f.frontmatter
    if (!fFm) continue

    // Get profiles array from frontmatter
    const profiles = Array.isArray(fFm.profiles)
      ? (fFm.profiles as string[])
      : []

    // Check if this event mentions the current profile
    const mentions = profiles.some(
      (p) => p.toLowerCase() === currentTitle.toLowerCase()
    )
    if (!mentions) continue

    const title = String(fFm.title ?? "").replace(/^_/, "").trim()
    const date = String(fFm.date ?? "")
    const source = String(fFm.source ?? "")
    const sourceUrl = String(fFm["source-url"] ?? "")
    const type = String(fFm.type ?? "")

    events.push({
      title,
      date,
      source,
      sourceUrl,
      slug: `${basePath}/${simplifySlug(f.slug!)}`,
      profiles,
      category: source.toLowerCase().includes("opensecrets")
        ? "money"
        : source.toLowerCase().includes("propublica") || source.toLowerCase().includes("intercept")
          ? "investigation"
          : source.toLowerCase().includes("congress")
            ? "legislation"
            : "news",
    })
  }

  // Sort by date descending
  events.sort((a, b) => (b.date || "").localeCompare(a.date || ""))

  // Limit to most recent 8
  const recentEvents = events.slice(0, 8)

  if (recentEvents.length === 0) {
    return (
      <div class={classNames(displayClass, "et-panel")}>
        <div class="et-header">
          <div class="et-title">RECENT EVENTS</div>
        </div>
        <div class="et-empty">No recent events tracked for this profile.</div>
      </div>
    )
  }

  const categoryIcons: Record<string, string> = {
    money: "$",
    investigation: "!",
    legislation: "§",
    news: "→",
  }

  const categoryColors: Record<string, string> = {
    money: "#22c55e",
    investigation: "#ef4444",
    legislation: "#5b8dce",
    news: "#a1a1aa",
  }

  return (
    <div class={classNames(displayClass, "et-panel")}>
      <div class="et-header">
        <div class="et-title">RECENT EVENTS</div>
        <div class="et-count">{events.length}</div>
      </div>
      <div class="et-list">
        {recentEvents.map((ev) => {
          const icon = categoryIcons[ev.category] || "→"
          const color = categoryColors[ev.category] || "#a1a1aa"
          const dateStr = ev.date
            ? new Date(ev.date + "T00:00:00").toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
              })
            : ""

          return (
            <div class="et-item">
              <div class="et-icon" style={`color: ${color}; border-color: ${color}`}>
                {icon}
              </div>
              <div class="et-content">
                {ev.sourceUrl ? (
                  <a href={ev.sourceUrl} class="et-link" target="_blank" rel="noopener">
                    {ev.title}
                  </a>
                ) : (
                  <span class="et-link-text">{ev.title}</span>
                )}
                <div class="et-meta">
                  {dateStr && <span class="et-date">{dateStr}</span>}
                  {ev.source && ev.source !== "undefined" && (
                    <span class="et-source">{ev.source.replace(/"/g, "")}</span>
                  )}
                </div>
                {ev.profiles.length > 1 && (
                  <div class="et-also">
                    {ev.profiles
                      .filter((p) => p.toLowerCase() !== currentTitle.toLowerCase())
                      .slice(0, 3)
                      .map((p) => (
                        <span class="et-also-name">{p}</span>
                      ))}
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
      {events.length > 8 && (
        <div class="et-more">
          + {events.length - 8} more events
        </div>
      )}
    </div>
  )
}

EventTimeline.css = `
/* ═══════════════════════════════════════════════
   EVENT TIMELINE — Right sidebar, profile pages
   ═══════════════════════════════════════════════ */

.et-panel {
  border-top: 1px solid #1e1e28;
  margin-top: 16px;
  padding-top: 16px;
}

.et-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.et-title {
  font-family: 'Space Mono', monospace;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 2px;
  color: #8a8a96;
}

.et-empty {
  font-family: 'Space Mono', monospace;
  font-size: 11px;
  color: #7a7a86;
  padding: 12px 0;
}

.et-count {
  font-family: 'Space Mono', monospace;
  font-size: 10px;
  font-weight: 700;
  color: #5b8dce;
  background: rgba(91, 141, 206, 0.1);
  padding: 2px 7px;
  border-radius: 10px;
}

.et-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.et-item {
  display: flex;
  gap: 10px;
  padding: 8px;
  border-radius: 5px;
  transition: background 0.15s;
}

.et-item:hover {
  background: rgba(91, 141, 206, 0.04);
}

.et-icon {
  font-family: 'Space Mono', monospace;
  font-size: 10px;
  font-weight: 700;
  width: 22px;
  height: 22px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid;
  border-radius: 4px;
  flex-shrink: 0;
  margin-top: 1px;
  background: rgba(0, 0, 0, 0.3);
}

.et-content {
  min-width: 0;
  flex: 1;
}

a.et-link,
.et-link-text {
  font-size: 11px;
  font-weight: 600;
  color: #b4b4bc !important;
  text-decoration: none !important;
  line-height: 1.4;
  display: block;
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

a.et-link:hover {
  color: #e4e4e7 !important;
}

.et-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 3px;
}

.et-date {
  font-family: 'Space Mono', monospace;
  font-size: 10px;
  color: #5b8dce;
  font-weight: 600;
}

.et-source {
  font-family: 'Space Mono', monospace;
  font-size: 10px;
  color: #7a7a86;
  letter-spacing: 0.5px;
}

.et-also {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-top: 4px;
}

.et-also-name {
  font-size: 10px;
  color: #8a8a96;
  background: rgba(99, 99, 110, 0.1);
  padding: 1px 6px;
  border-radius: 3px;
}

.et-more {
  font-family: 'Space Mono', monospace;
  font-size: 10px;
  color: #7a7a86;
  text-align: center;
  padding: 8px 0 2px;
  letter-spacing: 0.5px;
}

/* Hide on mobile — right sidebar hides */
@media (max-width: 800px) {
  .et-panel {
    display: none;
  }
}
`

export default (() => EventTimeline) satisfies QuartzComponentConstructor
