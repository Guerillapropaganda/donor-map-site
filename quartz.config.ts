import { QuartzConfig } from "./quartz/cfg"
import * as Plugin from "./quartz/plugins"

const config: QuartzConfig = {
  configuration: {
    pageTitle: "The Donor Map",
    pageTitleSuffix: " - Follow the Money",
    enableSPA: true,
    enablePopovers: true,
    analytics: null,
    locale: "en-US",
    baseUrl: "guerillapropaganda.github.io/donor-map-site",
    ignorePatterns: ["private", "templates", ".obsidian", "_templates", "Vault Maintenance", "Excalidraw", "Assets"],
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
          lightgray: "#1e1e28",
          gray: "#63636e",
          darkgray: "#a1a1aa",
          dark: "#e4e4e7",
          secondary: "#818cf8",
          tertiary: "#22c55e",
          highlight: "rgba(99, 102, 241, 0.12)",
          textHighlight: "rgba(99, 102, 241, 0.2)",
        },
        darkMode: {
          light: "#0c0c0f",
          lightgray: "#1e1e28",
          gray: "#63636e",
          darkgray: "#a1a1aa",
          dark: "#e4e4e7",
          secondary: "#818cf8",
          tertiary: "#22c55e",
          highlight: "rgba(99, 102, 241, 0.12)",
          textHighlight: "rgba(99, 102, 241, 0.2)",
        },
      },
    },
  },
  plugins: {
    transformers: [
      Plugin.FrontMatter(),
      Plugin.CreatedModifiedDate({ priority: ["frontmatter", "git", "filesystem"] }),
      Plugin.SyntaxHighlighting({ theme: { light: "github-light", dark: "github-dark" }, keepBackground: false }),
      Plugin.ObsidianFlavoredMarkdown({ enableInHtmlEmbed: false }),
      Plugin.GitHubFlavoredMarkdown(),
      Plugin.TableOfContents(),
      Plugin.CrawlLinks({ markdownLinkResolution: "shortest" }),
      Plugin.Description(),
      Plugin.Latex({ renderEngine: "katex" }),
    ],
    filters: [],
    emitters: [
      Plugin.AliasRedirects(),
      Plugin.ComponentResources(),
      Plugin.ContentPage(),
      Plugin.FolderPage(),
      Plugin.TagPage(),
      Plugin.ContentIndex({ enableSiteMap: true, enableRSS: true }),
      Plugin.Assets(),
      Plugin.Static(),
      Plugin.Favicon(),
      Plugin.NotFoundPage(),
    ],
  },
}

export default config
