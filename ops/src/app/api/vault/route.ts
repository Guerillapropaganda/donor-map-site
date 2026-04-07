import { NextResponse } from "next/server"
import { getLocalProfiles, hasLocalVault } from "@/lib/local-vault"
import { computeStats } from "@/lib/vault"
import type { Profile } from "@/lib/vault"

// Cache vault data for 30 seconds (local reads are fast)
let cache: { profiles: Profile[]; stats: ReturnType<typeof computeStats>; timestamp: number } | null = null
const CACHE_TTL = 30_000

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const refresh = searchParams.get("refresh") === "true"

  try {
    if (cache && !refresh && Date.now() - cache.timestamp < CACHE_TTL) {
      return NextResponse.json({ profiles: cache.profiles, stats: cache.stats, source: "cache" })
    }

    if (!hasLocalVault()) {
      return NextResponse.json({
        error: "Content directory not found. Make sure you're running from the donor-map-site/ops/ directory.",
        profiles: [],
        stats: { totalProfiles: 0, byType: {}, byReadiness: {}, enriched: 0, notEnriched: 0, withTier1: 0 },
      })
    }

    // Read directly from local filesystem — zero API calls
    const profiles = getLocalProfiles()
    const stats = computeStats(profiles)

    cache = { profiles, stats, timestamp: Date.now() }

    return NextResponse.json({ profiles, stats, source: "local" })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
