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
    label: "INTERACTIVE TOOLS",
    links: [
      { text: "Money Flow", slug: "Interactive/Money-Flow" },
      { text: "Donor Networks", slug: "Interactive/Donor-Networks" },
      { text: "Say vs Pay", slug: "Interactive/Contradictions" },
      { text: "Sector ROI", slug: "Interactive/Sector-Spending" },
      { text: "ROI Calculator", slug: "Interactive/ROI-Calculator" },
      { text: "Both Sides", slug: "Interactive/Both-Sides" },
      { text: "Policy Costs", slug: "Interactive/Policy-Costs" },
    ],
  },
  {
    label: "ABOUT",
    links: [
      { text: "About The Donor Map", slug: "About-The-Donor-Map" },
      { text: "Methodology Detail", slug: "Even-More-About-This-Website" },
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
                <a
                  href={`${basePath}/index.xml`}
                  class="footer-rss-link"
                  target="_blank"
                  rel="noopener"
                >
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
