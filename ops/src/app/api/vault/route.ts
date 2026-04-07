import { NextResponse } from "next/server"
import { getVaultTree, getFilesContent } from "@/lib/github"
import { parseProfile, computeStats } from "@/lib/vault"

// Cache vault data for 60 seconds to avoid hammering GitHub API
let cache: { profiles: ReturnType<typeof parseProfile>[]; stats: ReturnType<typeof computeStats>; timestamp: number } | null = null
const CACHE_TTL = 60_000

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const refresh = searchParams.get("refresh") === "true"

  try {
    if (cache && !refresh && Date.now() - cache.timestamp < CACHE_TTL) {
      return NextResponse.json({ profiles: cache.profiles, stats: cache.stats })
    }

    // Get all markdown files in content/
    const tree = await getVaultTree()

    // Filter to profile-like files (skip system docs, index files, assets)
    const profilePaths = tree
      .filter((f) => {
        const p = f.path
        if (p.includes("/Assets/")) return false
        if (p.endsWith("index.md")) return false
        if (p === "content/Vault Rules.md") return false
        if (p === "content/Pipeline Guide.md") return false
        if (p === "content/Session State.md") return false
        if (p === "content/Changelog.md") return false
        return true
      })
      .map((f) => f.path)

    // Fetch content in batches
    const contents = await getFilesContent(profilePaths)

    // Parse all profiles
    const profiles = Array.from(contents.entries()).map(([path, content]) => parseProfile(path, content))

    const stats = computeStats(profiles)

    cache = { profiles, stats, timestamp: Date.now() }

    return NextResponse.json({ profiles, stats })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
