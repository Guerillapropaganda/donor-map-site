/**
 * GET /api/stories/verify?id=story_xxx — re-validates a story candidate
 * against the LIVE source profile data. The integrity harness check
 * (run every 15 min) already writes flags into the record, but this
 * endpoint gives the user an on-demand deep dive: shows the actual
 * donors/opposes lists, where the counterparty matches (or doesn't),
 * and close-match suggestions when nothing matches exactly.
 *
 * Reply shape:
 *   {
 *     verdict: "confirmed" | "stale" | "alias-mismatch" | "profile-not-found" | "no-counterparty",
 *     subject_profile: "content/.../Foo.md" | null,
 *     subject_ref: "[[Cori Bush]]",
 *     counterparty_ref: "Fairshake PAC",
 *     counterparty_in_donors: boolean,
 *     counterparty_in_opposes: boolean,
 *     donors_count: number,
 *     opposes_count: number,
 *     donors_sample: string[],            // first 12
 *     opposes_sample: string[],           // up to 30
 *     alias_candidates: { source: "donors"|"opposes", value: string, distance: number }[]
 *   }
 *
 * Used by the /stories page's "🔍 Verify" button. Read-only (does not
 * mutate the story record); pair with the integrity harness check
 * which writes status flags on its own cadence.
 */

import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/auth"
import path from "path"
import fs from "fs"

export const dynamic = "force-dynamic"

function findRepoRoot(startDir: string): string {
  let dir = startDir
  for (let i = 0; i < 8; i++) {
    if (fs.existsSync(path.join(dir, "data", "stories.jsonl"))) return dir
    if (fs.existsSync(path.join(dir, ".git"))) return dir
    const parent = path.dirname(dir)
    if (parent === dir) break
    dir = parent
  }
  return startDir
}

const REPO_ROOT = findRepoRoot(process.cwd())
const STORIES_FILE = path.join(REPO_ROOT, "data", "stories.jsonl")
const CONTENT_DIR = path.join(REPO_ROOT, "content")

// Profile index — name → file path. Built once per process.
let _profileIndex: Map<string, string> | null = null
function buildProfileIndex(): Map<string, string> {
  if (_profileIndex) return _profileIndex
  const idx = new Map<string, string>()
  function walk(dir: string) {
    let entries
    try { entries = fs.readdirSync(dir, { withFileTypes: true }) } catch { return }
    for (const entry of entries) {
      const full = path.join(dir, entry.name)
      if (entry.isDirectory()) {
        if (entry.name.startsWith(".") || entry.name === "node_modules") continue
        walk(full)
      } else if (entry.name.endsWith(".md")) {
        const stem = entry.name
          .replace(/\.md$/, "")
          .replace(/^_/, "")
          .replace(/ Master Profile$/, "")
        if (!idx.has(stem.toLowerCase())) idx.set(stem.toLowerCase(), full)
      }
    }
  }
  walk(CONTENT_DIR)
  _profileIndex = idx
  return idx
}

function resolveProfileFile(ref: string): string | null {
  if (!ref) return null
  let cleaned = ref.trim()
  const m = cleaned.match(/^\[\[(.+?)\]\]$/)
  if (m) cleaned = m[1]
  return buildProfileIndex().get(cleaned.toLowerCase()) || null
}

function loadStory(id: string): any | null {
  if (!fs.existsSync(STORIES_FILE)) return null
  for (const line of fs.readFileSync(STORIES_FILE, "utf-8").split(/\r?\n/)) {
    if (!line.trim()) continue
    try {
      const r = JSON.parse(line)
      if (r.id === id) return r
    } catch { /* skip */ }
  }
  return null
}

function parseFrontmatter(text: string): Record<string, unknown> | null {
  const m = text.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)/)
  if (!m) return null
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  let yaml: { load: (s: string) => unknown }
  try { yaml = eval("require")("js-yaml") } catch { return null }
  try { return yaml.load(m[1]) as Record<string, unknown> } catch { return null }
}

function normalize(s: string): string {
  return String(s).toLowerCase().trim().replace(/\s+/g, " ")
}

/**
 * Pull a list of entity names out of a frontmatter field that may be
 * either a YAML array OR a single delimited string. Vault schema is
 * inconsistent here:
 *   - Some profiles: donors: ["Name A", "Name B"]
 *   - Some profiles: donors: "[[Name A]] · [[Name B]] · [[Name C]]"
 * Strips wikilink brackets so downstream comparison is on plain names.
 */
function extractEntityList(field: unknown): string[] {
  if (!field) return []
  if (Array.isArray(field)) {
    return field
      .filter((x): x is string => typeof x === "string")
      .map(stripWikilink)
      .filter((s) => s.trim().length > 0)
  }
  if (typeof field === "string") {
    // Common separators in the wild: " · ", ", ", "; ", " | "
    return field
      .split(/\s+[·,;|]\s+/g)
      .map((s) => s.trim())
      .filter((s) => s.length > 0)
      .map(stripWikilink)
  }
  return []
}

function stripWikilink(s: string): string {
  const m = s.match(/^\[\[(.+?)\]\]$/)
  return m ? m[1].trim() : s.trim()
}

/** Levenshtein distance — used for alias suggestions */
function distance(a: string, b: string): number {
  if (a === b) return 0
  if (!a.length) return b.length
  if (!b.length) return a.length
  const dp = Array.from({ length: a.length + 1 }, () => new Array<number>(b.length + 1).fill(0))
  for (let i = 0; i <= a.length; i++) dp[i][0] = i
  for (let j = 0; j <= b.length; j++) dp[0][j] = j
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost,
      )
    }
  }
  return dp[a.length][b.length]
}

/**
 * Find close matches to the target string within a list. Returns up to
 * `limit` items sorted by distance. Threshold: distance < target.length / 3
 * (typo / alias variant range).
 */
function aliasCandidates(
  target: string,
  pool: string[],
  source: "donors" | "opposes",
  limit = 5,
): Array<{ source: string; value: string; distance: number }> {
  const t = normalize(target)
  const threshold = Math.max(2, Math.floor(t.length / 3))
  const candidates: Array<{ source: string; value: string; distance: number }> = []
  for (const item of pool) {
    if (typeof item !== "string") continue
    const n = normalize(item)
    if (n === t) continue  // exact match handled separately
    const d = distance(n, t)
    if (d <= threshold) candidates.push({ source, value: item, distance: d })
  }
  candidates.sort((a, b) => a.distance - b.distance)
  return candidates.slice(0, limit)
}

export async function GET(req: NextRequest) {
  const gate = await requireAdmin(req)
  if (!gate.ok) return gate.response

  const { searchParams } = new URL(req.url)
  const id = searchParams.get("id")
  if (!id) {
    return NextResponse.json({ error: "id query param is required" }, { status: 400 })
  }

  const story = loadStory(id)
  if (!story) {
    return NextResponse.json({ error: `story ${id} not found` }, { status: 404 })
  }

  const subject = (story.linked_entities || []).find((e: any) => e.role === "subject")
  const counterparty = (story.linked_entities || []).find((e: any) => e.role === "counterparty")

  const subjectRef = subject?.ref || ""
  const counterpartyRef = counterparty?.ref || ""

  if (!counterpartyRef) {
    return NextResponse.json({
      verdict: "no-counterparty",
      subject_ref: subjectRef,
      counterparty_ref: counterpartyRef,
      message: "This story has no counterparty entity to verify against.",
    })
  }

  const profileFile = resolveProfileFile(subjectRef)
  if (!profileFile) {
    return NextResponse.json({
      verdict: "profile-not-found",
      subject_profile: null,
      subject_ref: subjectRef,
      counterparty_ref: counterpartyRef,
      message: `Could not find a profile matching ${subjectRef}. Likely an alias mismatch or the profile was renamed.`,
    })
  }

  let text: string
  try { text = fs.readFileSync(profileFile, "utf-8") } catch (e: unknown) {
    return NextResponse.json({
      verdict: "profile-not-found",
      subject_profile: profileFile,
      subject_ref: subjectRef,
      counterparty_ref: counterpartyRef,
      message: `Could not read profile file: ${e instanceof Error ? e.message : String(e)}`,
    })
  }

  const data = parseFrontmatter(text)
  if (!data) {
    return NextResponse.json({
      verdict: "profile-not-found",
      subject_profile: profileFile,
      subject_ref: subjectRef,
      counterparty_ref: counterpartyRef,
      message: "Profile frontmatter could not be parsed.",
    })
  }

  // Profiles store donors/opposes inconsistently:
  //   - Some as a YAML array: ["Name 1", "Name 2"]
  //   - Some as a single delimited string: "[[Name 1]] · [[Name 2]]"
  // Both forms must be handled. The string form is a vault schema bug we
  // have to live with for now. extractEntityList normalizes both to
  // a clean string array (wikilink wrappers stripped).
  const donorsRaw = [
    ...extractEntityList(data.donors),
    ...extractEntityList((data as any)["top-donors"]),
  ]
  const opposesRaw = extractEntityList((data as any).opposes)

  const target = normalize(counterpartyRef)
  const inDonors = donorsRaw.some((x) => normalize(x) === target)
  const inOpposes = opposesRaw.some((x) => normalize(x) === target)

  let verdict: string
  if (inDonors && inOpposes) verdict = "confirmed"
  else if (!inDonors && !inOpposes) verdict = "alias-mismatch"
  else verdict = "stale"

  // Alias suggestions (only when not confirmed)
  let aliases: Array<{ source: string; value: string; distance: number }> = []
  if (verdict !== "confirmed") {
    aliases = [
      ...aliasCandidates(counterpartyRef, donorsRaw, "donors", 5),
      ...aliasCandidates(counterpartyRef, opposesRaw, "opposes", 5),
    ].sort((a, b) => a.distance - b.distance).slice(0, 8)
  }

  return NextResponse.json({
    verdict,
    subject_profile: path.relative(REPO_ROOT, profileFile).replace(/\\/g, "/"),
    subject_ref: subjectRef,
    counterparty_ref: counterpartyRef,
    counterparty_in_donors: inDonors,
    counterparty_in_opposes: inOpposes,
    donors_count: donorsRaw.length,
    opposes_count: opposesRaw.length,
    donors_sample: donorsRaw.slice(0, 12),
    opposes_sample: opposesRaw.slice(0, 30),
    alias_candidates: aliases,
    checked_at: new Date().toISOString(),
  })
}
