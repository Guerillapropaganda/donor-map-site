import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"
import style from "./styles/footer.scss"
import { version } from "../../package.json"
import { i18n } from "../i18n"

interface Options {
  links: Record<string, string>
}

const footerColumns = [
  {
    label: "EXPLORE",
    links: [
      { text: "Politicians", slug: "Politicians" },
      { text: "Donors & Power Networks", slug: "Donors--and--Power-Networks" },
      { text: "Lobbyists & K Street", slug: "Lobbying-Firms--and--K-Street" },
      { text: "Media Pipeline", slug: "Media-Pipeline" },
      { text: "Think Tanks", slug: "Think-Tanks" },
    ],
  },
  {
    label: "INVESTIGATIONS",
    links: [
      { text: "Biggest Findings", slug: "Stories/Published/The-Biggest-Findings" },
      { text: "Guided Tour", slug: "Stories/Follow-the-Money---Guided-Tour" },
      { text: "Browse by Pattern", slug: "Stories/Browse-by-Pattern" },
      { text: "All Stories", slug: "Stories" },
    ],
  },
  {
    label: "ABOUT",
    links: [
      { text: "About The Donor Map", slug: "About-the-Donor-Map" },
      { text: "Methodology", slug: "Methodology" },
    ],
  },
]

export default ((opts?: Options) => {
  const Footer: QuartzComponent = ({ displayClass, cfg }: QuartzComponentProps) => {
    const year = new Date().getFullYear()
    const links = opts?.links ?? []
    const baseUrl = cfg.baseUrl ?? ""
    const slashIdx = baseUrl.indexOf("/")
    const basePath = slashIdx >= 0 ? "/" + baseUrl.substring(slashIdx + 1) : ""

    return (
      <footer class={`${displayClass ?? ""}`}>
        <div class="footer-columns">
          {footerColumns.map((col) => (
            <div class="footer-col">
              <div class="footer-col-label">{col.label}</div>
              <ul class="footer-col-links">
                {col.links.map((link) => (
                  <li>
                    <a href={`${basePath}/${link.slug}`}>{link.text}</a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
          <div class="footer-col">
            <div class="footer-col-label">SUBSCRIBE</div>
            <ul class="footer-col-links">
              <li>
                <a href={`${basePath}/index.xml`} class="footer-rss-link">
                  RSS Feed
                </a>
              </li>
            </ul>
          </div>
        </div>
        <div class="footer-bottom">
          <p>
            {i18n(cfg.locale).components.footer.createdWith}{" "}
            <a href="https://quartz.jzhao.xyz/">Quartz v{version}</a> © {year}
          </p>
          <ul>
            {Object.entries(links).map(([text, link]) => (
              <li>
                <a href={link}>{text}</a>
              </li>
            ))}
          </ul>
        </div>
      </footer>
    )
  }

  Footer.css = style
  return Footer
}) satisfies QuartzComponentConstructor
