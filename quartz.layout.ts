import { PageLayout, SharedLayout } from "./quartz/cfg"
import * as Component from "./quartz/components"

// Treat every publishable profile type as a "profile page" (gets
// ProfileHeader + ProfileTabs). Previously only politician + donor
// qualified, which left state-politician, local-politician, pac,
// corporation, think-tank, and lobbying-firm profiles without a
// ProfileHeader — and therefore without the `data-profile-type`
// attribute ProfileTabs needs to detect the page and build the tab
// nav. Fix: extend to the full set from ADR-0017.
const PROFILE_TYPES = new Set([
  "politician", "state-politician", "local-politician",
  "donor", "corporation", "pac", "think-tank", "lobbying-firm",
])
const isProfilePage = (page: any): boolean => {
  const type = String(page.fileData.frontmatter?.type ?? "")
  return PROFILE_TYPES.has(type)
}

// components shared across all pages
export const sharedPageComponents: SharedLayout = {
  head: Component.Head(),
  header: [],
  afterBody: [
    Component.NetworkGraph(),
    Component.InteractiveGraphs(),
    Component.PowerRankings(),
    Component.WhoFundsYourRep(),
    Component.WeeklySpotlight(),
    Component.IssueExplorer(),
    Component.MobileProfile(),
    Component.TipForm(),
    Component.ArticleNav(),
    Component.MobileNav(),
    Component.AdminBar(),
    Component.AnnotationOverlay(),
    Component.CapitolTrades(),
    Component.AskPanel(),
  ],
  footer: Component.Footer({
    links: {
      "Behind the Map": "/Behind-the-Map",
      "Our Sources": "/Our-Sources",
      "The Receipts": "/The-Receipts",
      Corrections: "/corrections",
      Legal: "/legal",
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
    // ADR-0017: DataCompleteBanner removed from layout 2026-04-21.
    // Initial deploy review: the banner sat atop profiles with real
    // editorial substance (Harlan Crow etc.) and felt like a disclaimer
    // on work that was further along than the tier label implied. Also
    // the under-construction strategy is that data-complete profiles
    // don't publish publicly until rendering (tabs + auto-block layout)
    // is right. Component file preserved in quartz/components/ for
    // future re-introduction if the design story calls for it.
    // Component.DataCompleteBanner(),
    Component.ConditionalRender({
      component: Component.HeroContradiction(),
      condition: (page) => {
        const type = String(page.fileData.frontmatter?.type ?? "")
        return ["politician", "state-politician", "local-politician", "donor", "corporation", "pac", "think-tank", "lobbying-firm"].includes(type)
      },
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
    // ProfileReaderGuide moved to right column (compact mode) — see below
    // SummaryInfobox removed from layout 2026-04-17 — its content
    // (total-received-note, custom-stats) now rendered inside the data
    // panel, which lives in the Money tab. Keeps custom-stats grouped
    // with the money data it annotates instead of floating above tabs.
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
      component: Component.ContradictionCard(),
      condition: (page) => !!page.fileData.frontmatter?.["say-vs-pay"],
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
    // "What am I looking at?" — compact, gold-dominant chip in the right
    // sidebar. Out of the main content column so it doesn't interrupt reading.
    Component.ConditionalRender({
      component: Component.ProfileReaderGuide(),
      condition: (page) => {
        const type = String(page.fileData.frontmatter?.type ?? "")
        return ["politician", "state-politician", "local-politician",
          "donor", "corporation", "pac", "think-tank", "lobbying-firm"].includes(type)
      },
    }),
    Component.DesktopOnly(Component.Search()),
    // Profile TOC: custom tab-grouped table of contents for profile
    // pages. Built client-side after ProfileTabs, groups
    // .profile-section-card elements by data-tab, clicks switch
    // tabs + scroll. Only shows when there are ≥3 cards to organize.
    Component.ConditionalRender({
      component: Component.DesktopOnly(Component.ProfileTOC()),
      condition: isProfilePage,
    }),
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
