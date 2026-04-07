import { NextResponse } from "next/server"
import { getVaultTree } from "@/lib/github"
import { computeStats } from "@/lib/vault"
import type { Profile } from "@/lib/vault"

// Cache vault data for 5 minutes to avoid hitting rate limits
let cache: { profiles: Profile[]; stats: ReturnType<typeof computeStats>; timestamp: number } | null = null
const CACHE_TTL = 300_000 // 5 minutes

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const refresh = searchParams.get("refresh") === "true"

  try {
    if (cache && !refresh && Date.now() - cache.timestamp < CACHE_TTL) {
      return NextResponse.json({ profiles: cache.profiles, stats: cache.stats })
    }

    // Get the full file tree in ONE API call (uses Git Trees API)
    const tree = await getVaultTree()

    // Build profiles from file paths alone — no individual file fetches needed
    const profiles: Profile[] = tree
      .filter((f) => {
        const p = f.path
        if (!p.startsWith("content/")) return false
        if (!p.endsWith(".md")) return false
        if (p.includes("/Assets/")) return false
        if (p.endsWith("index.md")) return false
        if (p === "content/Vault Rules.md") return false
        if (p === "content/Pipeline Guide.md") return false
        if (p === "content/Session State.md") return false
        if (p === "content/Changelog.md") return false
        if (p === "content/About The Donor Map.md") return false
        if (p === "content/Browse by Pattern.md") return false
        if (p.includes("/Admin Notes/")) return false
        if (p.includes("/Vault Maintenance/")) return false
        return true
      })
      .map((f) => profileFromPath(f.path))

    const stats = computeStats(profiles)

    cache = { profiles, stats, timestamp: Date.now() }

    return NextResponse.json({ profiles, stats })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// Extract profile metadata from the file path — zero API calls
function profileFromPath(path: string): Profile {
  const parts = path.replace("content/", "").split("/")
  const folder = parts[0] || ""
  const subfolder = parts[1] || ""
  const filename = parts[parts.length - 1].replace(".md", "")

  // Determine type from folder
  let type = "unknown"
  if (folder === "Politicians") type = "politician"
  else if (folder === "Donors & Power Networks") type = "donor"
  else if (folder === "Think Tanks & Policy Groups") type = "think-tank"
  else if (folder === "Lobbying Firms & K Street") type = "lobbying-firm"
  else if (folder.includes("Media")) type = "media-profile"
  else if (folder === "Stories") type = "story"
  else if (folder === "Events") type = "event"
  else if (folder === "Interactive") type = "story"

  // Extract title from filename
  let title = filename
  if (filename.startsWith("_") && filename.includes("Master Profile")) {
    title = filename.replace(/^_/, "").replace(/ Master Profile$/, "")
  }

  // Extract party from politician paths
  let party: string | undefined
  let chamber: string | undefined
  if (type === "politician") {
    if (subfolder === "Democrats" || subfolder.startsWith("Democrat")) party = "Democrat"
    else if (subfolder === "Republicans" || subfolder.startsWith("Republican")) party = "Republican"
    else if (subfolder === "Independents") party = "Independent"

    const chamberPart = parts[2] || ""
    if (chamberPart === "House") chamber = "House"
    else if (chamberPart === "Senate") chamber = "Senate"
    else if (chamberPart === "Governors") chamber = "Governor"
    else if (chamberPart === "Presidential") chamber = "President"
    else if (chamberPart.includes("Cabinet")) chamber = "Cabinet"
  }

  // Extract sector for donors
  let sector: string | undefined
  if (type === "donor") {
    sector = subfolder
  }

  return {
    path,
    title,
    type,
    party,
    chamber,
    sector,
    contentReadiness: "ready", // Default — actual value comes from individual file fetch
    folder,
    subfolder,
  }
}
