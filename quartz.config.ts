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
    analytics: null,
    locale: "en-US",
    baseUrl: "guerillapropaganda.github.io/donor-map-site",
    ignorePatterns: ["private", "templates", ".obsidian", "_templates", "Vault Maintenance", "Excalidraw", "Assets", "DRAFT-*", "publish.css", "_VAULT_INDEX.md", "Stories/Internal", "Interactive"],
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
          light: "#0c0c0f",
          lightgray: "#1a1a22",
          gray: "#63636e",
          darkgray: "#b4b4bc",
          dark: "#e4e4e7",
          secondary: "#818cf8",
          tertiary: "#22c55e",
          highlight: "rgba(99, 102, 241, 0.1)",
          textHighlight: "rgba(99, 102, 241, 0.15)",
        },
        darkMode: {
          light: "#0c0c0f",
          lightgray: "#1a1a22",
          gray: "#63636e",
          darkgray: "#b4b4bc",
          dark: "#e4e4e7",
          secondary: "#818cf8",
          tertiary: "#22c55e",
          highlight: "rgba(99, 102, 241, 0.1)",
          textHighlight: "rgba(99, 102, 241, 0.15)",
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
      // Comment out CustomOgImages to speed up build time
      // Plugin.CustomOgImages(),
    ],
  },
}

export default config
