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

  return (
    <ul class="section-ul">
      {list.map((page) => {
        const fm: any = page.frontmatter ?? {}
        const rawTitle = String(fm.title ?? "")
        const title = rawTitle.replace(/^_/, "").replace(/\s+Master\s+Profile\s*$/i, "").trim()
        const tags = fm.tags ?? []

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
          <li class="section-li" data-profile-type={type || undefined}>
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
                  ></span>
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
  )
}

PageList.css = `
.section h3 {
  margin: 0;
}

.section > .tags {
  margin: 0;
}
`
