import { QuartzConfig } from "./quartz/cfg"
import * as Plugin from "./quartz/plugins"

/**
 * Quartz 4 Configuration
 *
 * See https://quartz.jzhao.xyz/configuration for more information.
 */
const config: QuartzConfig = {
  configuration: {
    pageTitle: "The Donor Map",
    pageTitleSuffix: " - Follow the Money",
    enableSPA: true,
    enablePopovers: true,
    analytics: {
      provider: "goatcounter",
      websiteId: "guerillapropaganda",
    },
    locale: "en-US",
    baseUrl: "thedonormap.org",
    ignorePatterns: ["private", "templates", ".obsidian", "_templates", "Vault Maintenance", "Excalidraw", "Assets", "Admin Notes", "DRAFT-*", "publish.css", "_VAULT_INDEX.md", "**/Internal/**", "**/_README*", "**/README*", "**/Jeffrey Epstein*", "**/Daily Updates/**", "flagged-urls-for-bulk-check.md", "remaining-unverified-urls-for-bulk-check.md"],
    defaultDateType: "modified",
    theme: {
      fontOrigin: "googleFonts",
      cdnCaching: true,
      typography: {
        header: "Space Grotesk",
        body: "Space Grotesk",
        code: "Space Mono",
      },
      colors: {
        lightMode: {
          light: "#f5f0eb",
          lightgray: "#ddd",
          gray: "#999",
          darkgray: "#333",
          dark: "#0a0a0a",
          secondary: "#e63946",
          tertiary: "#fbbf24",
          highlight: "rgba(251, 191, 36, 0.1)",
          textHighlight: "rgba(251, 191, 36, 0.15)",
        },
        darkMode: {
          light: "#f5f0eb",
          lightgray: "#ddd",
          gray: "#999",
          darkgray: "#333",
          dark: "#0a0a0a",
          secondary: "#e63946",
          tertiary: "#fbbf24",
          highlight: "rgba(251, 191, 36, 0.1)",
          textHighlight: "rgba(251, 191, 36, 0.15)",
        },
      },
    },
  },
  plugins: {
    transformers: [
      Plugin.FrontMatter(),
      Plugin.CreatedModifiedDate({
        priority: ["frontmatter", "git", "filesystem"],
      }),
      Plugin.SyntaxHighlighting({
        theme: {
          light: "github-light",
          dark: "github-dark",
        },
        keepBackground: false,
      }),
      Plugin.ClaimObject(),
      Plugin.SourceRefs(),
      Plugin.ObsidianFlavoredMarkdown({ enableInHtmlEmbed: false }),
      Plugin.GitHubFlavoredMarkdown(),
      Plugin.TableOfContents(),
      Plugin.CrawlLinks({ markdownLinkResolution: "shortest" }),
      Plugin.Description(),
      // Plugin.Latex({ renderEngine: "katex" }), // disabled — breaks $ currency amounts across the site
    ],
    filters: [],
    emitters: [
      Plugin.AliasRedirects(),
      Plugin.ComponentResources(),
      Plugin.ContentPage(),
      Plugin.FolderPage(),
      Plugin.TagPage(),
      Plugin.ContentIndex({
        enableSiteMap: true,
        enableRSS: true,
      }),
      Plugin.Assets(),
      Plugin.Static(),
      Plugin.Favicon(),
      Plugin.NotFoundPage(),
      Plugin.CustomOgImages({
        colorScheme: "darkMode",
      }),
      Plugin.NetworkGraphIndex(),
    ],
  },
}

export default config
