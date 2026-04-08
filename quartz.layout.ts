import { PageLayout, SharedLayout } from "./quartz/cfg"
import * as Component from "./quartz/components"

// Treat politician/donor master profiles as "profile pages" (get ProfileHeader + ProfileTabs)
const isProfilePage = (page: any): boolean => {
  const type = String(page.fileData.frontmatter?.type ?? "")
  return type === "politician" || type === "donor"
}

// components shared across all pages
export const sharedPageComponents: SharedLayout = {
  head: Component.Head(),
  header: [],
  afterBody: [
    Component.NetworkGraph(),
    Component.InteractiveGraphs(),
    Component.NetworkGraph(),
    Component.PowerRankings(),
    Component.WhoFundsYourRep(),
    Component.WeeklySpotlight(),
    Component.IssueExplorer(),
    Component.MobileProfile(),
    Component.ArticleNav(),
    Component.MobileNav(),
    Component.AdminBar(),
  ],
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
      condition: isProfilePage,
    }),
    Component.ConditionalRender({
      component: Component.VotingRecord(),
      condition: (page) => String(page.fileData.frontmatter?.type ?? "").toLowerCase() === "politician",
    }),
    Component.ConditionalRender({
      component: Component.PartySplitMeter(),
      condition: (page) => {
        const type = String(page.fileData.frontmatter?.type ?? "")
        return type === "donor" || type === "corporation"
      },
    }),
    Component.ConditionalRender({
      component: Component.ProfileTabs(),
      condition: isProfilePage,
    }),
  ],
  left: [
    Component.DonorMapSidebar(),
    Component.MobileOnly(Component.Spacer()),
    Component.MobileOnly(Component.Search()),
    Component.MobileOnly(Component.Explorer({
      filterFn: (node) => {
        const seg = (node.slugSegment ?? "").toLowerCase()
        return seg !== "tags" && seg !== "events" && seg !== "changelog" &&
          seg !== "vault-maintenance" && seg !== "interactive" &&
          seg !== "site-status"
      },
    })),
  ],
  right: [
    Component.DesktopOnly(Component.Search()),
    Component.ConditionalRender({
      component: Component.DesktopOnly(Component.TableOfContents()),
      condition: (page) => !isProfilePage(page),
    }),
    Component.DesktopOnly(Component.ProfileWidget()),
    Component.EventTimeline(),
    Component.RelatedProfiles(),
    Component.DiscoveryPanel(),
  ],
}

// components for pages that display lists of pages  (e.g. tags or folders)
export const defaultListPageLayout: PageLayout = {
  beforeBody: [Component.Breadcrumbs(), Component.ArticleTitle(), Component.ContentMeta(), Component.AlphabetJump()],
  left: [
    Component.DonorMapSidebar(),
    Component.MobileOnly(Component.Spacer()),
    Component.MobileOnly(Component.Search()),
    Component.MobileOnly(Component.Explorer({
      filterFn: (node) => {
        const seg = (node.slugSegment ?? "").toLowerCase()
        return seg !== "tags" && seg !== "events" && seg !== "changelog" &&
          seg !== "vault-maintenance" && seg !== "interactive" &&
          seg !== "site-status"
      },
    })),
  ],
  right: [],
}
