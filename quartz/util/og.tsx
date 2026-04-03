import { promises as fs } from "fs"
import { FontWeight, SatoriOptions } from "satori/wasm"
import { GlobalConfiguration } from "../cfg"
import { QuartzPluginData } from "../plugins/vfile"
import { JSXInternal } from "preact/src/jsx"
import { FontSpecification, getFontSpecificationName, ThemeKey } from "./theme"
import path from "path"
import { QUARTZ } from "./path"
import { formatDate, getDate } from "../components/Date"
import readingTime from "reading-time"
import { i18n } from "../i18n"
import { styleText } from "util"

const defaultHeaderWeight = [700]
const defaultBodyWeight = [400]

export async function getSatoriFonts(headerFont: FontSpecification, bodyFont: FontSpecification) {
  // Get all weights for header and body fonts
  const headerWeights: FontWeight[] = (
    typeof headerFont === "string"
      ? defaultHeaderWeight
      : (headerFont.weights ?? defaultHeaderWeight)
  ) as FontWeight[]
  const bodyWeights: FontWeight[] = (
    typeof bodyFont === "string" ? defaultBodyWeight : (bodyFont.weights ?? defaultBodyWeight)
  ) as FontWeight[]

  const headerFontName = typeof headerFont === "string" ? headerFont : headerFont.name
  const bodyFontName = typeof bodyFont === "string" ? bodyFont : bodyFont.name

  // Fetch fonts for all weights and convert to satori format in one go
  const headerFontPromises = headerWeights.map(async (weight) => {
    const data = await fetchTtf(headerFontName, weight)
    if (!data) return null
    return {
      name: headerFontName,
      data,
      weight,
      style: "normal" as const,
    }
  })

  const bodyFontPromises = bodyWeights.map(async (weight) => {
    const data = await fetchTtf(bodyFontName, weight)
    if (!data) return null
    return {
      name: bodyFontName,
      data,
      weight,
      style: "normal" as const,
    }
  })

  const [headerFonts, bodyFonts] = await Promise.all([
    Promise.all(headerFontPromises),
    Promise.all(bodyFontPromises),
  ])

  // Filter out any failed fetches and combine header and body fonts
  const fonts: SatoriOptions["fonts"] = [
    ...headerFonts.filter((font): font is NonNullable<typeof font> => font !== null),
    ...bodyFonts.filter((font): font is NonNullable<typeof font> => font !== null),
  ]

  return fonts
}

/**
 * Get the `.ttf` file of a google font
 * @param fontName name of google font
 * @param weight what font weight to fetch font
 * @returns `.ttf` file of google font
 */
export async function fetchTtf(
  rawFontName: string,
  weight: FontWeight,
): Promise<Buffer<ArrayBufferLike> | undefined> {
  const fontName = rawFontName.replaceAll(" ", "+")
  const cacheKey = `${fontName}-${weight}`
  const cacheDir = path.join(QUARTZ, ".quartz-cache", "fonts")
  const cachePath = path.join(cacheDir, cacheKey)

  // Check if font exists in cache
  try {
    await fs.access(cachePath)
    return fs.readFile(cachePath)
  } catch (error) {
    // ignore errors and fetch font
  }

  // Get css file from google fonts
  const cssResponse = await fetch(
    `https://fonts.googleapis.com/css2?family=${fontName}:wght@${weight}`,
  )
  const css = await cssResponse.text()

  // Extract .ttf url from css file
  const urlRegex = /url\((https:\/\/fonts.gstatic.com\/s\/.*?.ttf)\)/g
  const match = urlRegex.exec(css)

  if (!match) {
    console.log(
      styleText(
        "yellow",
        `\nWarning: Failed to fetch font ${rawFontName} with weight ${weight}, got ${cssResponse.statusText}`,
      ),
    )
    return
  }

  // fontData is an ArrayBuffer containing the .ttf file data
  const fontResponse = await fetch(match[1])
  const fontData = Buffer.from(await fontResponse.arrayBuffer())
  await fs.mkdir(cacheDir, { recursive: true })
  await fs.writeFile(cachePath, fontData)

  return fontData
}

export type SocialImageOptions = {
  /**
   * What color scheme to use for image generation (uses colors from config theme)
   */
  colorScheme: ThemeKey
  /**
   * Height to generate image with in pixels (should be around 630px)
   */
  height: number
  /**
   * Width to generate image with in pixels (should be around 1200px)
   */
  width: number
  /**
   * Whether to use the auto generated image for the root path ("/", when set to false) or the default og image (when set to true).
   */
  excludeRoot: boolean
  /**
   * JSX to use for generating image. See satori docs for more info (https://github.com/vercel/satori)
   */
  imageStructure: (
    options: ImageOptions & {
      userOpts: UserOpts
      iconBase64?: string
    },
  ) => JSXInternal.Element
}

export type UserOpts = Omit<SocialImageOptions, "imageStructure">

export type ImageOptions = {
  /**
   * what title to use as header in image
   */
  title: string
  /**
   * what description to use as body in image
   */
  description: string
  /**
   * header + body font to be used when generating satori image (as promise to work around sync in component)
   */
  fonts: SatoriOptions["fonts"]
  /**
   * `GlobalConfiguration` of quartz (used for theme/typography)
   */
  cfg: GlobalConfiguration
  /**
   * full file data of current page
   */
  fileData: QuartzPluginData
}

// ═══════════════════════════════════════════════
// THE DONOR MAP — Custom OG Image Template
// Branded social cards for political intelligence
// ═══════════════════════════════════════════════
export const defaultImage: SocialImageOptions["imageStructure"] = ({
  cfg,
  userOpts,
  title,
  description,
  fileData,
  iconBase64,
}) => {
  const { colorScheme } = userOpts
  const bodyFont = getFontSpecificationName(cfg.theme.typography.body)
  const headerFont = getFontSpecificationName(cfg.theme.typography.header)

  // Clean title
  const cleanTitle = title
    .replace(/^_/, "")
    .replace(/\s*Master Profile.*/, "")
    .replace(/ - Follow the Money$/, "")
    .trim()

  const fontBreakPoint = 28
  const useSmallerFont = cleanTitle.length > fontBreakPoint

  // Profile metadata from frontmatter
  const fm = fileData.frontmatter ?? {}
  const type = String(fm.type ?? "").toLowerCase()
  const party = String(fm.party ?? "")
  const chamber = String(fm.chamber ?? "")
  const sector = String(fm.sector ?? "")
  const state = String(fm.state ?? "")

  // Determine badge
  let badge = ""
  let badgeColor = "#5b8dce"
  if (type === "politician") {
    badge = "POLITICIAN"
    badgeColor = party === "Democrat" ? "#3b82f6" : party === "Republican" ? "#ef4444" : "#5b8dce"
  } else if (type === "donor" || type === "corporation") {
    badge = "DONOR"
    badgeColor = "#22c55e"
  } else if (type === "story" || type === "investigation") {
    badge = "INVESTIGATION"
    badgeColor = "#f59e0b"
  } else if (type === "lobbyist") {
    badge = "LOBBYIST"
    badgeColor = "#a855f7"
  }

  // Context line
  const contextParts: string[] = []
  if (party) contextParts.push(party)
  if (chamber && chamber !== "undefined") contextParts.push(chamber)
  if (state && state !== "undefined") contextParts.push(state)
  if (sector && sector !== "undefined") contextParts.push(sector)
  const contextLine = contextParts.join(" · ")

  // Top donors or politicians funded for stats
  const topDonors = Array.isArray(fm["top-donors"]) ? fm["top-donors"] as string[] : []
  const polsFunded = Array.isArray(fm["politicians-funded"]) ? fm["politicians-funded"] as string[] : []
  const statValue = topDonors.length > 0 ? `${topDonors.length} donors tracked` : polsFunded.length > 0 ? `Funds ${polsFunded.length} politicians` : ""

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        width: "100%",
        backgroundColor: "#0c0c0f",
        padding: "0",
        fontFamily: bodyFont,
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Left accent bar */}
      <div
        style={{
          display: "flex",
          position: "absolute",
          left: 0,
          top: 0,
          bottom: 0,
          width: "6px",
          backgroundColor: badgeColor,
        }}
      />

      {/* Content area */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          height: "100%",
          padding: "2.5rem 3rem 2.5rem 3.5rem",
        }}
      >
        {/* Top row: brand + badge */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "1.5rem",
          }}
        >
          {/* Brand */}
          <div
            style={{
              display: "flex",
              alignItems: "baseline",
              gap: "0",
              fontSize: 28,
              fontWeight: 700,
              color: "#e4e4e7",
              fontFamily: headerFont,
              letterSpacing: "-0.5px",
            }}
          >
            <span>The Donor Map</span>
            <span style={{ color: "#22c55e" }}>$</span>
          </div>

          {/* Badge */}
          {badge && (
            <div
              style={{
                display: "flex",
                padding: "0.4rem 1.2rem",
                backgroundColor: `${badgeColor}22`,
                border: `1px solid ${badgeColor}66`,
                borderRadius: "6px",
                fontSize: 18,
                fontWeight: 700,
                color: badgeColor,
                letterSpacing: "2px",
              }}
            >
              {badge}
            </div>
          )}
        </div>

        {/* Title */}
        <div
          style={{
            display: "flex",
            marginBottom: "1rem",
          }}
        >
          <h1
            style={{
              margin: 0,
              fontSize: useSmallerFont ? 52 : 64,
              fontFamily: headerFont,
              fontWeight: 700,
              color: "#e4e4e7",
              lineHeight: 1.15,
              display: "-webkit-box",
              WebkitBoxOrient: "vertical",
              WebkitLineClamp: 2,
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {cleanTitle}
          </h1>
        </div>

        {/* Context line */}
        {contextLine && (
          <div
            style={{
              display: "flex",
              fontSize: 24,
              color: "#8a8a96",
              marginBottom: "1rem",
              letterSpacing: "0.5px",
            }}
          >
            {contextLine}
          </div>
        )}

        {/* Description */}
        <div
          style={{
            display: "flex",
            flex: 1,
            fontSize: 28,
            color: "#a1a1aa",
            lineHeight: 1.5,
          }}
        >
          <p
            style={{
              margin: 0,
              display: "-webkit-box",
              WebkitBoxOrient: "vertical",
              WebkitLineClamp: 3,
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {description}
          </p>
        </div>

        {/* Footer */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginTop: "1.5rem",
            paddingTop: "1.5rem",
            borderTop: "1px solid #1e1e28",
          }}
        >
          {/* Stat */}
          {statValue && (
            <div
              style={{
                display: "flex",
                fontSize: 22,
                color: "#22c55e",
                fontWeight: 600,
                letterSpacing: "0.5px",
              }}
            >
              {statValue}
            </div>
          )}

          {/* URL */}
          <div
            style={{
              display: "flex",
              fontSize: 22,
              color: "#5b8dce",
              fontWeight: 500,
            }}
          >
            thedonormap.org
          </div>
        </div>
      </div>
    </div>
  )
}
