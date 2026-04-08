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

// Cache for 2 minutes
let cache: { data: unknown; timestamp: number } | null = null
const CACHE_TTL = 120_000

export async function GET() {
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
        const { data: fm } = matter(content)
        const relPath = path.relative(repoRoot, file).replace(/\\/g, "/")
        const folder = relPath.replace("content/", "").split("/")[0]
        const title = fm.title || path.basename(file, ".md").replace(/^_/, "").replace(/ Master Profile$/, "")
        const type = fm.type || typeFromFolder(folder)

        const related = parseWikilinks(fm.related)
        const donors = parseWikilinks(fm.donors)
        const opposes = parseWikilinks(fm.opposes)

        const profile: ConnectedProfile = {
          title, path: relPath, type,
          connectionCount: related.length + donors.length + opposes.length,
          related, donors, opposes,
        }
        profileMap.set(title, profile)

        for (const t of related) connections.push({ source: title, sourcePath: relPath, sourceType: type, target: t, relationshipType: "related" })
        for (const t of donors) connections.push({ source: title, sourcePath: relPath, sourceType: type, target: t, relationshipType: "donors" })
        for (const t of opposes) connections.push({ source: title, sourcePath: relPath, sourceType: type, target: t, relationshipType: "opposes" })
      } catch { /* skip bad files */ }
    }

    // Stats
    const allProfiles = Array.from(profileMap.values())
    const connected = allProfiles.filter((p) => p.connectionCount > 0)
    const unconnected = allProfiles.filter((p) => p.connectionCount === 0)
    const topConnected = [...connected].sort((a, b) => b.connectionCount - a.connectionCount).slice(0, 50)

    // Recent: sort by file mtime
    const recentFiles = files
      .map((f) => ({ file: f, mtime: fs.statSync(f).mtimeMs }))
      .sort((a, b) => b.mtime - a.mtime)
      .slice(0, 30)

    const recentConnections: Connection[] = []
    for (const { file } of recentFiles) {
      const profile = profileMap.get(
        path.basename(file, ".md").replace(/^_/, "").replace(/ Master Profile$/, "")
      )
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
