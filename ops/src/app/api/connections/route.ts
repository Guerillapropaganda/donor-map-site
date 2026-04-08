import { NextResponse } from "next/server"
import fs from "fs"
import path from "path"
import matter from "gray-matter"

export interface Connection {
  source: string
  sourcePath: string
  sourceType: string
  target: string
  relationshipType: "related" | "donors" | "opposes"
}

export interface ConnectedProfile {
  title: string
  path: string
  type: string
  connectionCount: number
  related: string[]
  donors: string[]
  opposes: string[]
  stories: string[]
}

function getRepoRoot(): string {
  const fromOps = path.resolve(process.cwd(), "..")
  if (fs.existsSync(path.join(fromOps, "content"))) return fromOps
  if (fs.existsSync(path.join(process.cwd(), "content"))) return process.cwd()
  throw new Error("Cannot find repo root")
}

function typeFromFolder(folder: string): string {
  if (folder === "Politicians") return "politician"
  if (folder === "Donors & Power Networks") return "donor"
  if (folder === "Think Tanks & Policy Groups") return "think-tank"
  if (folder === "Lobbying Firms & K Street") return "lobbying-firm"
  if (folder.includes("Media")) return "media-profile"
  return "unknown"
}

function findMdFiles(dir: string): string[] {
  const results: string[] = []
  try {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name)
      if (entry.isDirectory()) {
        if (["Assets", "node_modules", ".obsidian", "Events", "Stories", "Interactive", "Admin Notes", "Vault Maintenance"].includes(entry.name)) continue
        results.push(...findMdFiles(full))
      } else if (entry.name.endsWith(".md") && !entry.name.startsWith("index")) {
        results.push(full)
      }
    }
  } catch { /* skip */ }
  return results
}

function parseWikilinks(value: string): string[] {
  if (!value) return []
  const matches = value.match(/\[\[([^\]]+)\]\]/g) || []
  return matches.map((m) => {
    const inner = m.replace("[[", "").replace("]]", "")
    return inner.split("|").pop() || inner
  })
}

function parseBodyField(body: string, field: string): string[] {
  const regex = new RegExp(`^${field}:\\s*(.+)`, "m")
  const match = body.match(regex)
  if (!match) return []
  return parseWikilinks(match[1])
}

// Cache for 2 minutes, invalidated by relationship changes
let cache: { data: unknown; timestamp: number } | null = null
const CACHE_TTL = 120_000
let lastInvalidation = 0

export async function GET() {
  // Check if relationships API invalidated the cache
  const inv = (globalThis as Record<string, unknown>).__connectionsInvalidated as number || 0
  if (inv > lastInvalidation) {
    lastInvalidation = inv
    cache = null
  }

  if (cache && Date.now() - cache.timestamp < CACHE_TTL) {
    return NextResponse.json(cache.data)
  }

  try {
    const repoRoot = getRepoRoot()
    const contentDir = path.join(repoRoot, "content")
    const files = findMdFiles(contentDir)

    const connections: Connection[] = []
    const profileMap = new Map<string, ConnectedProfile>()

    for (const file of files) {
      try {
        const content = fs.readFileSync(file, "utf-8")
        const { data: fm, content: body } = matter(content)
        const relPath = path.relative(repoRoot, file).replace(/\\/g, "/")
        const folder = relPath.replace("content/", "").split("/")[0]
        const title = fm.title || path.basename(file, ".md").replace(/^_/, "").replace(/ Master Profile$/, "")
        const type = fm.type || typeFromFolder(folder)

        // Check frontmatter first, fall back to body text
        const fmRelated = parseWikilinks(fm.related)
        const fmDonors = parseWikilinks(fm.donors)
        const fmOpposes = parseWikilinks(fm.opposes)
        const fmStories = parseWikilinks(fm.stories)
        const related = fmRelated.length > 0 ? fmRelated : parseBodyField(body, "related")
        const donors = fmDonors.length > 0 ? fmDonors : parseBodyField(body, "donors")
        const opposes = fmOpposes.length > 0 ? fmOpposes : parseBodyField(body, "opposes")
        const stories = fmStories.length > 0 ? fmStories : parseBodyField(body, "stories")

        const profile: ConnectedProfile = {
          title, path: relPath, type,
          connectionCount: related.length + donors.length + opposes.length + stories.length,
          related, donors, opposes, stories,
        }
        profileMap.set(title, profile)

        for (const t of related) connections.push({ source: title, sourcePath: relPath, sourceType: type, target: t, relationshipType: "related" })
        for (const t of donors) connections.push({ source: title, sourcePath: relPath, sourceType: type, target: t, relationshipType: "donors" })
        for (const t of opposes) connections.push({ source: title, sourcePath: relPath, sourceType: type, target: t, relationshipType: "opposes" })
        for (const t of stories) connections.push({ source: title, sourcePath: relPath, sourceType: type, target: t, relationshipType: "stories" })
      } catch { /* skip bad files */ }
    }

    // Stats
    const allProfiles = Array.from(profileMap.values())
    const connected = allProfiles.filter((p) => p.connectionCount > 0)
    const unconnected = allProfiles.filter((p) => p.connectionCount === 0)
    const topConnected = [...connected].sort((a, b) => b.connectionCount - a.connectionCount)

    // Recent: sort by file mtime
    const recentFiles = files
      .map((f) => ({ file: f, mtime: fs.statSync(f).mtimeMs }))
      .sort((a, b) => b.mtime - a.mtime)
      .slice(0, 30)

    // Build file→title lookup for recent connections
    const fileToTitle = new Map<string, string>()
    for (const f of files) {
      const rp = path.relative(repoRoot, f).replace(/\\/g, "/")
      for (const [t, p] of profileMap) { if (p.path === rp) { fileToTitle.set(f, t); break } }
    }

    const recentConnections: Connection[] = []
    for (const { file } of recentFiles) {
      const profile = profileMap.get(fileToTitle.get(file) || "")
      if (profile && profile.connectionCount > 0) {
        for (const t of profile.related) recentConnections.push({ source: profile.title, sourcePath: profile.path, sourceType: profile.type, target: t, relationshipType: "related" })
        for (const t of profile.donors) recentConnections.push({ source: profile.title, sourcePath: profile.path, sourceType: profile.type, target: t, relationshipType: "donors" })
        for (const t of profile.opposes) recentConnections.push({ source: profile.title, sourcePath: profile.path, sourceType: profile.type, target: t, relationshipType: "opposes" })
        if (recentConnections.length > 40) break
      }
    }

    // Breakdown
    const breakdown = {
      related: connections.filter((c) => c.relationshipType === "related").length,
      donors: connections.filter((c) => c.relationshipType === "donors").length,
      opposes: connections.filter((c) => c.relationshipType === "opposes").length,
      stories: connections.filter((c) => c.relationshipType === "stories").length,
      total: connections.length,
    }

    const result = {
      connections,
      topConnected,
      unconnected: unconnected.slice(0, 100),
      unconnectedCount: unconnected.length,
      recentConnections,
      breakdown,
      totalProfiles: allProfiles.length,
    }

    cache = { data: result, timestamp: Date.now() }
    return NextResponse.json(result)
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
