import { NextResponse } from "next/server"
import fs from "fs"
import path from "path"

export type UrlTriageStatus = "verified" | "broken" | "unsure" | "unchecked"

export interface VaultUrl {
  id: string
  url: string
  label: string
  tier?: number
  archived: boolean
  triageStatus: UrlTriageStatus
  profile: string
  profilePath: string
  domain: string
}

function getRepoRoot(): string {
  const fromOps = path.resolve(process.cwd(), "..")
  if (fs.existsSync(path.join(fromOps, "content"))) return fromOps
  if (fs.existsSync(path.join(process.cwd(), "content"))) return process.cwd()
  throw new Error("Cannot find repo root")
}

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
  } catch { /* skip */ }
  return results
}

// Cache URLs for 2 minutes
let cache: { urls: VaultUrl[]; timestamp: number } | null = null
const CACHE_TTL = 120_000

// GET — extract all URLs from the vault
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const refresh = searchParams.get("refresh") === "true"

  if (cache && !refresh && Date.now() - cache.timestamp < CACHE_TTL) {
    return NextResponse.json({ urls: cache.urls, total: cache.urls.length })
  }

  try {
    const repoRoot = getRepoRoot()
    const contentDir = path.join(repoRoot, "content")
    const files = findMarkdownFiles(contentDir, "content")

    const urls: VaultUrl[] = []
    let idCounter = 0

    for (const filePath of files) {
      if (filePath.includes("/Admin Notes/")) continue
      if (filePath.includes("/Vault Maintenance/")) continue
      if (filePath.endsWith("index.md")) continue

      const fullPath = path.join(repoRoot, filePath)
      let content: string
      try {
        content = fs.readFileSync(fullPath, "utf-8")
      } catch { continue }

      // Extract profile title from frontmatter
      const titleMatch = content.match(/^title:\s*(.+)$/m)
      const profileTitle = titleMatch ? titleMatch[1].trim().replace(/^["']|["']$/g, "") : filePath.split("/").pop()?.replace(".md", "") || "Unknown"

      // Extract URLs with markdown link syntax
      const linkRegex = /(~~)?\[([^\]]+)\]\((https?:\/\/[^)]+)\)(~~)?(?:\s*\(Tier (\d)\))?(?:\s*\(VERIFIED\))?(?:\s*\(NEEDS REVIEW\))?/g
      let match

      while ((match = linkRegex.exec(content)) !== null) {
        const full = match[0]
        const isArchived = !!(match[1] || match[4])
        const isVerified = full.includes("(VERIFIED)")
        const isUnsure = full.includes("(NEEDS REVIEW)")
        const triageStatus: UrlTriageStatus = isArchived ? "broken" : isVerified ? "verified" : isUnsure ? "unsure" : "unchecked"
        const url = match[3]
        let domain = ""
        try { domain = new URL(url).hostname.replace("www.", "") } catch { /* skip */ }

        urls.push({
          id: `url-${idCounter++}`,
          url,
          label: match[2],
          tier: match[5] ? parseInt(match[5]) : undefined,
          archived: isArchived,
          triageStatus,
          profile: profileTitle,
          profilePath: filePath,
          domain,
        })
      }
    }

    cache = { urls, timestamp: Date.now() }

    return NextResponse.json({ urls, total: urls.length })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
