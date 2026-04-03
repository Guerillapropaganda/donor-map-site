import { PageLayout, SharedLayout } from "./quartz/cfg"
import * as Component from "./quartz/components"

// components shared across all pages
export const sharedPageComponents: SharedLayout = {
  head: Component.Head(),
  header: [],
  afterBody: [Component.InteractiveGraphs(), Component.PowerRankings(), Component.WhoFundsYourRep(), Component.WeeklySpotlight(), Component.ArticleNav(), Component.MobileNav()],
  footer: Component.Footer({
    links: {
      "The Donor Map": "https://guerillapropaganda.github.io/donor-map-site/",
      GitHub: "https://github.com/Guerillapropaganda/donor-map-site",
    },
  }),
}

// components for pages that display a single page (e.g. a single note)
export const defaultContentPageLayout: PageLayout = {
  beforeBody: [
    Component.ConditionalRender({
      component: Component.LandingPage(),
      condition: (page) => page.fileData.slug === "index",
    }),
    Component.ConditionalRender({
      component: Component.Breadcrumbs(),
      condition: (page) => page.fileData.slug !== "index",
    }),
    Component.ConditionalRender({
      component: Component.ArticleTitle(),
      condition: (page) => page.fileData.slug !== "index",
    }),
    Component.ConditionalRender({
      component: Component.ContentMeta(),
      condition: (page) => page.fileData.slug !== "index",
    }),
    Component.ConditionalRender({
      component: Component.EvidencePanel(),
      condition: (page) => {
        const slug = page.fileData.slug ?? ""
        if (slug === "index" || slug.endsWith("/index")) return false
        const type = String(page.fileData.frontmatter?.type ?? "")
        return type !== "" && type !== "undefined" && type !== "unknown"
      },
    }),
    Component.ConditionalRender({
      component: Component.ProfileHeader(),
      condition: (page) => {
        const slug = (page.fileData.slug ?? "").toLowerCase()
        return slug.includes("master-profile")
      },
    }),
  ],
  left: [
    Component.DonorMapSidebar(),
    Component.MobileOnly(Component.Spacer()),
    Component.MobileOnly(Component.Search()),
    Component.MobileOnly(Component.Explorer()),
  ],
  right: [
    Component.DesktopOnly(Component.Search()),
    Component.DesktopOnly(Component.Graph({
      localGraph: {
        depth: 1,
        repelForce: 0.5,
        centerForce: 0.3,
        linkDistance: 30,
        fontSize: 0.6,
        focusOnHover: true,
        showTags: false,
      },
      globalGraph: {
        depth: 1,
        repelForce: 0.3,
        centerForce: 0.4,
        linkDistance: 30,
        fontSize: 0.5,
        showTags: false,
      },
    })),
    Component.DesktopOnly(Component.TableOfContents()),
    Component.DesktopOnly(Component.ProfileWidget()),
    Component.Backlinks(),
    Component.RelatedProfiles(),
  ],
}

// components for pages that display lists of pages  (e.g. tags or folders)
export const defaultListPageLayout: PageLayout = {
  beforeBody: [Component.Breadcrumbs(), Component.ArticleTitle(), Component.ContentMeta()],
  left: [
    Component.DonorMapSidebar(),
    Component.MobileOnly(Component.Spacer()),
    Component.MobileOnly(Component.Search()),
    Component.MobileOnly(Component.Explorer()),
  ],
  right: [],
}
