import fs from "fs"
import path from "path"
import matter from "gray-matter"
import type { Profile } from "./vault"
import { completenessScore, countSources } from "./vault"

// Resolve the vault content directory — works from ops/ or repo root
function getContentDir(): string {
  // Try relative to ops/ (normal run)
  const fromOps = path.resolve(process.cwd(), "..", "content")
  if (fs.existsSync(fromOps)) return fromOps

  // Try from repo root
  const fromRoot = path.resolve(process.cwd(), "content")
  if (fs.existsSync(fromRoot)) return fromRoot

  throw new Error("Cannot find content directory. Expected at ../content or ./content")
}

// Recursively find all .md files
function findMarkdownFiles(dir: string, base: string): string[] {
  const results: string[] = []

  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true })
    for (const entry of entries) {
      const full = path.join(dir, entry.name)
      const relative = path.join(base, entry.name).replace(/\\/g, "/")

      if (entry.isDirectory()) {
        if (entry.name === "Assets" || entry.name === "node_modules" || entry.name === ".obsidian") continue
        results.push(...findMarkdownFiles(full, relative))
      } else if (entry.name.endsWith(".md")) {
        results.push(relative)
      }
    }
  } catch {
    // Permission error or similar — skip
  }

  return results
}

// Get all vault profiles by reading the local filesystem
export function getLocalProfiles(): Profile[] {
  const contentDir = getContentDir()
  const files = findMarkdownFiles(contentDir, "content")

  return files
    .filter((f) => {
      if (f.endsWith("index.md")) return false
      if (f === "content/Vault Rules.md") return false
      if (f === "content/Pipeline Guide.md") return false
      if (f === "content/Session State.md") return false
      if (f === "content/Changelog.md") return false
      if (f === "content/About The Donor Map.md") return false
      if (f === "content/Browse by Pattern.md") return false
      if (f.includes("/Admin Notes/")) return false
      if (f.includes("/Vault Maintenance/")) return false
      if (f.includes("/Assets/")) return false
      return true
    })
    .map((filePath) => {
      const fullPath = path.join(contentDir, "..", filePath)
      return profileFromFile(filePath, fullPath)
    })
}

// Read a single file's full content
export function getLocalFileContent(filePath: string): string {
  const contentDir = getContentDir()
  const fullPath = path.join(contentDir, "..", filePath)
  return fs.readFileSync(fullPath, "utf-8")
}

// Check if local vault exists
export function hasLocalVault(): boolean {
  try {
    getContentDir()
    return true
  } catch {
    return false
  }
}

// Build a profile from local file — reads frontmatter for accurate data
function profileFromFile(filePath: string, fullPath: string): Profile {
  const parts = filePath.replace("content/", "").split("/")
  const folder = parts[0] || ""
  const subfolder = parts[1] || ""
  const filename = parts[parts.length - 1].replace(".md", "")

  // Default title from filename
  let title = filename
  if (filename.startsWith("_") && filename.includes("Master Profile")) {
    title = filename.replace(/^_/, "").replace(/ Master Profile$/, "")
  }

  // Try to read frontmatter for accurate data
  try {
    const content = fs.readFileSync(fullPath, "utf-8")
    const { data } = matter(content)

    const profile: Profile = {
      path: filePath,
      title: data.title || title,
      type: data.type || typeFromFolder(folder),
      party: data.party,
      chamber: data.chamber,
      state: data.state || data["state-abbr"],
      sector: data.sector || (typeFromFolder(folder) === "donor" ? subfolder : undefined),
      contentReadiness: data["content-readiness"] || "ready",
      sourceTier: data["source-tier"],
      lastUpdated: data["last-updated"],
      lastEnriched: data["last-enriched"],
      totalRaised: data["total-raised"],
      lobbyingSpend: data["lobbying-spend"],
      related: data.related,
      opposes: data.opposes,
      donors: data.donors,
      folder,
      subfolder,
      // Editorial / checklist fields — needed by the dashboard "S-Tier Insights"
      // cards, the /signoff-queue page, and the Calendar live meters.
      // Without these reads the new UI always shows 0. Added 2026-04-11 after
      // discovering profileFromFile() diverged from parseProfile() in vault.ts.
      sourceTypes: data["source-types"],
      corroborationCount: data["corroboration-count"],
      lastVerifiedBy: data["last-verified-by"],
      knownGaps: data["known-gaps"],
      checklistNa: data["checklist-na"],
      committees: data.committees,
      billsSponsored: data["bills-sponsored"] ? parseInt(data["bills-sponsored"]) : undefined,
      billsCosponsored: data["bills-cosponsored"] ? parseInt(data["bills-cosponsored"]) : undefined,
      // A+ baseline additions stamped by the janitor
      centralThesis: data["central-thesis"],
      storyGrade: data["story-grade"],
      bothSidesFlag: data["both-sides-flag"],
      crossVaultTriangulationCount: data["cross-vault-triangulation-count"],
      anomalyFlags: data["anomaly-flags"],
      auditAPlusPassed: data["audit-a-plus-passed"],
      // S-tier fields
      angle: data.angle,
      exclusiveConnections: data["exclusive-connections"],
      originalFinding: data["original-finding"],
      auditSTierPassed: data["audit-s-tier-passed"],
      editorialSignoffData: data["editorial-signoff-data"],
      editorialSignoffNarrative: data["editorial-signoff-narrative"],
    }
    profile.completeness = completenessScore(profile, content)
    return profile
  } catch {
    // File read failed — return path-derived data
    return {
      path: filePath,
      title,
      type: typeFromFolder(folder),
      folder,
      subfolder,
      contentReadiness: "ready",
    }
  }
}

function typeFromFolder(folder: string): string {
  if (folder === "Politicians") return "politician"
  if (folder === "Donors & Power Networks") return "donor"
  if (folder === "Think Tanks & Policy Groups") return "think-tank"
  if (folder === "Lobbying Firms & K Street") return "lobbying-firm"
  if (folder.includes("Media")) return "media-profile"
  if (folder === "Stories") return "story"
  if (folder === "Events") return "event"
  return "unknown"
}
