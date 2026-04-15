import { FullSlug, isFolderPath, resolveRelative } from "../util/path"
import { QuartzPluginData } from "../plugins/vfile"
import { Date, getDate } from "./Date"
import { QuartzComponent, QuartzComponentProps } from "./types"
import { GlobalConfiguration } from "../cfg"

export type SortFn = (f1: QuartzPluginData, f2: QuartzPluginData) => number

export function byDateAndAlphabetical(cfg: GlobalConfiguration): SortFn {
  return (f1, f2) => {
    // Sort by date/alphabetical
    if (f1.dates && f2.dates) {
      // sort descending
      return getDate(cfg, f2)!.getTime() - getDate(cfg, f1)!.getTime()
    } else if (f1.dates && !f2.dates) {
      // prioritize files with dates
      return -1
    } else if (!f1.dates && f2.dates) {
      return 1
    }

    // otherwise, sort lexographically by title
    const f1Title = f1.frontmatter?.title.toLowerCase() ?? ""
    const f2Title = f2.frontmatter?.title.toLowerCase() ?? ""
    return f1Title.localeCompare(f2Title)
  }
}

export function byDateAndAlphabeticalFolderFirst(cfg: GlobalConfiguration): SortFn {
  return (f1, f2) => {
    // Sort folders first
    const f1IsFolder = isFolderPath(f1.slug ?? "")
    const f2IsFolder = isFolderPath(f2.slug ?? "")
    if (f1IsFolder && !f2IsFolder) return -1
    if (!f1IsFolder && f2IsFolder) return 1

    // If both are folders or both are files, sort by date/alphabetical
    if (f1.dates && f2.dates) {
      // sort descending
      return getDate(cfg, f2)!.getTime() - getDate(cfg, f1)!.getTime()
    } else if (f1.dates && !f2.dates) {
      // prioritize files with dates
      return -1
    } else if (!f1.dates && f2.dates) {
      return 1
    }

    // otherwise, sort lexographically by title
    const f1Title = f1.frontmatter?.title.toLowerCase() ?? ""
    const f2Title = f2.frontmatter?.title.toLowerCase() ?? ""
    return f1Title.localeCompare(f2Title)
  }
}

type Props = {
  limit?: number
  sort?: SortFn
} & QuartzComponentProps

export const PageList: QuartzComponent = ({ cfg, fileData, allFiles, limit, sort }: Props) => {
  const sorter = sort ?? byDateAndAlphabeticalFolderFirst(cfg)
  let list = allFiles.sort(sorter)
  if (limit) {
    list = list.slice(0, limit)
  }

  // Build filter controls based on what variety exists in this listing.
  const tiersPresent = new Set<string>()
  let profileCount = 0
  let noteCount = 0
  for (const page of list) {
    const fm: any = page.frontmatter ?? {}
    const t = fm["source-tier"]
    if (t != null) tiersPresent.add(String(t))
    const type = String(fm.type ?? "").toLowerCase()
    if (type === "politician" || type === "donor" || type === "corporation") {
      profileCount++
    } else {
      noteCount++
    }
  }
  const tierOrder = ["1", "2", "3", "4"].filter((t) => tiersPresent.has(t))
  const hasTierFilter = tierOrder.length > 1
  const hasTypeFilter = profileCount > 0 && noteCount > 0
  const showFilterBar = hasTierFilter || hasTypeFilter

  return (
    <>
      {showFilterBar && (
        <nav class="listing-filter-bar" aria-label="Filter listing">
          {hasTypeFilter && (
            <>
              <button type="button" class="listing-filter-btn active" data-type="all">
                All ({list.length})
              </button>
              <button type="button" class="listing-filter-btn" data-type="profile">
                Profiles ({profileCount})
              </button>
              <button type="button" class="listing-filter-btn" data-type="note">
                Notes ({noteCount})
              </button>
              {hasTierFilter && <span class="listing-filter-sep"></span>}
            </>
          )}
          {hasTierFilter && (
            <>
              {!hasTypeFilter && (
                <button type="button" class="listing-filter-btn active" data-tier="all">
                  All
                </button>
              )}
              {tierOrder.map((t) => (
                <button type="button" class="listing-filter-btn" data-tier={t}>
                  T{t}
                </button>
              ))}
            </>
          )}
        </nav>
      )}
    <ul class="section-ul">
      {list.map((page) => {
        const fm: any = page.frontmatter ?? {}
        const rawTitle = String(fm.title ?? "")
        const title = rawTitle.replace(/^_/, "").replace(/\s+Master\s+Profile\s*$/i, "").trim()
        const tags: string[] = Array.isArray(fm.tags) ? (fm.tags as string[]) : []

        // Enrichment fields (present on ~most profiles via enrich-frontmatter)
        const type = String(fm.type ?? "").toLowerCase()
        const party = String(fm.party ?? "")
        const chamber = String(fm.chamber ?? "")
        const state = String(fm["state-abbr"] ?? fm.state ?? "")
        const currentOffice = String(fm["current-office"] ?? "")
        const sector = String(fm.sector ?? "")
        const sourceTier = fm["source-tier"]
        const readiness = String(fm["content-readiness"] ?? "").toLowerCase()

        const partyKey = party.toLowerCase().startsWith("democrat")
          ? "D"
          : party.toLowerCase().startsWith("republican")
          ? "R"
          : party
          ? "I"
          : ""

        // Build the inline meta line (skip if nothing to say)
        const metaBits: string[] = []
        if (currentOffice) metaBits.push(currentOffice)
        if (chamber && chamber !== currentOffice) metaBits.push(chamber)
        if (state) metaBits.push(state)
        if (type === "donor" || type === "corporation") {
          if (sector) metaBits.push(sector)
        }

        return (
          <li
            class="section-li"
            data-profile-type={type || undefined}
            data-tier={sourceTier != null ? String(sourceTier) : "none"}
            data-kind={type === "politician" || type === "donor" || type === "corporation" ? "profile" : "note"}
          >
            <div class="section">
              {partyKey && (
                <span
                  class={`listing-party-dot listing-party-${partyKey.toLowerCase()}`}
                  title={party}
                  aria-label={party}
                ></span>
              )}
              {(type === "donor" || type === "corporation") && (
                <span class="listing-party-dot listing-party-donor" title="Donor" aria-label="Donor"></span>
              )}
              <div class="desc">
                <h3>
                  <a href={resolveRelative(fileData.slug!, page.slug!)} class="internal">
                    {title}
                  </a>
                </h3>
                {metaBits.length > 0 && (
                  <p class="listing-meta-line">{metaBits.join(" · ")}</p>
                )}
              </div>
              <div class="listing-chips">
                {readiness && (
                  <span
                    class={`listing-ready listing-ready-${readiness}`}
                    title={`Content readiness: ${readiness}`}
                    aria-label={`Content readiness: ${readiness}`}
                  >
                    <span class="listing-ready-dot"></span>
                    {readiness === "verified" && (
                      <span class="listing-ready-label">A+</span>
                    )}
                    {readiness !== "ready" && readiness !== "publication-ready" && readiness !== "verified" && (
                      <span class="listing-ready-label">
                        {readiness === "draft" ? "DRAFT" : "RAW"}
                      </span>
                    )}
                  </span>
                )}
                {sourceTier && (
                  <span
                    class={`listing-tier listing-tier-${sourceTier}`}
                    title={`Source tier ${sourceTier}`}
                  >
                    T{sourceTier}
                  </span>
                )}
                {page.dates && (
                  <span class="listing-date">
                    <Date date={getDate(cfg, page)!} locale={cfg.locale} />
                  </span>
                )}
              </div>
              {tags.length > 0 && (
                <ul class="tags">
                  {tags.slice(0, 3).map((tag) => (
                    <li>
                      <a
                        class="internal tag-link"
                        href={resolveRelative(fileData.slug!, `tags/${tag}` as FullSlug)}
                      >
                        {tag}
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </li>
        )
      })}
    </ul>
    </>
  )
}

PageList.afterDOMLoaded = `
(function() {
  function wireFilterBar(bar) {
    if (bar._wired) return
    bar._wired = true
    var list = bar.nextElementSibling
    while (list && list.tagName !== 'UL') list = list.nextElementSibling
    if (!list) return
    var state = { type: 'all', tier: 'all' }
    function apply() {
      var items = list.querySelectorAll('.section-li')
      items.forEach(function(item) {
        var itemKind = item.getAttribute('data-kind')
        var itemTier = item.getAttribute('data-tier')
        var typeOk = state.type === 'all' || itemKind === state.type
        var tierOk = state.tier === 'all' || itemTier === state.tier
        item.style.display = (typeOk && tierOk) ? '' : 'none'
      })
    }
    bar.querySelectorAll('.listing-filter-btn').forEach(function(btn) {
      btn.addEventListener('click', function() {
        var tier = btn.getAttribute('data-tier')
        var type = btn.getAttribute('data-type')
        var selector = tier != null ? '[data-tier]' : '[data-type]'
        bar.querySelectorAll('.listing-filter-btn' + selector).forEach(function(b) {
          b.classList.remove('active')
        })
        btn.classList.add('active')
        if (tier != null) state.tier = tier
        if (type != null) state.type = type
        apply()
      })
    })
  }
  function init() {
    document.querySelectorAll('.listing-filter-bar').forEach(wireFilterBar)
  }
  init()
  document.addEventListener('nav', init)
})()
`

PageList.css = `
.section h3 {
  margin: 0;
}

.section > .tags {
  margin: 0;
}
`
