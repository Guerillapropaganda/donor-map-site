import { NextResponse } from "next/server"
import fs from "fs"
import path from "path"
import { execSync } from "child_process"

/**
 * URL triage save API — ops/src/app/api/urls/save/route.ts
 *
 * RULES (critical — re-learned 2026-04-09):
 * 1. URL fixing is EDITOR-ONLY. Only David (the human editor) triages URLs
 *    through the Ops URL Manager UI. Neither Research Claude nor Code Claude
 *    is permitted to:
 *    - Hunt for replacement URLs
 *    - Auto-verify URLs
 *    - Write automated URL-fixing scripts or pipelines
 *    - Populate this endpoint from a bot or scheduled job
 *    This endpoint is called exclusively by the Ops URL Manager page when
 *    David clicks a triage button. If any new caller appears, flag it.
 * 2. Statuses this endpoint accepts: ok, broken, slow, unsure, yellow.
 *    "broken" gets strikethrough in the profile; "unsure"/"yellow" gets a
 *    `(NEEDS REVIEW)` marker. Both Claudes must honor those markers and
 *    never overwrite them.
 * 3. Profile body writes here are the one exception to the frontmatter-only
 *    rule: they modify the inline markdown link text for an archived URL.
 *    That is David's triage action and intentional.
 *
 * If a future feature needs to bulk-update URLs, stop and ask David.
 */

interface UrlChange {
  url: string
  label: string
  tier?: number
  profilePath: string
  profile: string
  newStatus: "ok" | "broken" | "slow" | "unsure" | "yellow"
  note?: string
}

interface TriageEntry {
  status: string
  date: string
  label: string
  profile: string
  profilePath: string
  note?: string
}

function getTriagePath(): string {
  return path.join(process.cwd(), "data", "url-triage.json")
}

function loadTriage(): Record<string, TriageEntry> {
  const p = getTriagePath()
  if (fs.existsSync(p)) {
    try { return JSON.parse(fs.readFileSync(p, "utf-8")) } catch { return {} }
  }
  return {}
}

function saveTriage(data: Record<string, TriageEntry>): void {
  const p = getTriagePath()
  const dir = path.dirname(p)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(p, JSON.stringify(data, null, 2), "utf-8")
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

function getRepoRoot(): string {
  const fromOps = path.resolve(process.cwd(), "..")
  if (fs.existsSync(path.join(fromOps, "content"))) return fromOps
  if (fs.existsSync(path.join(process.cwd(), "content"))) return process.cwd()
  throw new Error("Cannot find repo root")
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { changes } = body as { changes: UrlChange[] }

    if (!changes || !Array.isArray(changes) || changes.length === 0) {
      return NextResponse.json({ error: "changes array required" }, { status: 400 })
    }

    const repoRoot = getRepoRoot()
    const modifiedFiles = new Set<string>()
    let archived = 0
    let confirmed = 0
    let flagged = 0

    // Group changes by profile file
    const byFile = new Map<string, UrlChange[]>()
    for (const change of changes) {
      const existing = byFile.get(change.profilePath) || []
      existing.push(change)
      byFile.set(change.profilePath, existing)
    }

    for (const [filePath, fileChanges] of byFile.entries()) {
      const fullPath = path.join(repoRoot, filePath)
      if (!fs.existsSync(fullPath)) continue

      let content = fs.readFileSync(fullPath, "utf-8")
      let modified = false

      for (const change of fileChanges) {
        if (change.newStatus === "broken") {
          // Move to Archived: wrap in strikethrough
          // Find the link: [label](url) and wrap with ~~
          const linkPattern = `[${change.label}](${change.url})`
          const archivedLink = `~~${linkPattern}~~`

          if (content.includes(linkPattern) && !content.includes(archivedLink)) {
            content = content.replace(linkPattern, archivedLink)

            // Add note about archival.
            // NOTE: comma (not em dash) — the vault-wide no-em-dash rule applies.
            // The unarchive regex below matches any paren content ending in
            // "archived by Ops" so format changes here are backward-compatible.
            const tierNote = change.tier ? ` (was Tier ${change.tier}` : ""
            const archiveNote = tierNote ? `${tierNote}, URL broken, archived by Ops)` : " (URL broken, archived by Ops)"
            content = content.replace(archivedLink, archivedLink + archiveNote)

            modified = true
            archived++
          }
        } else if (change.newStatus === "ok") {
          // URL confirmed working — unarchive if needed, add (VERIFIED) marker
          const linkPattern = `[${change.label}](${change.url})`
          const archivedPattern = `~~${linkPattern}~~`

          // Unarchive if strikethrough
          if (content.includes(archivedPattern)) {
            // Remove strikethrough and any archive note
            const archiveNoteRegex = new RegExp(
              escapeRegex(`~~${linkPattern}~~`) + "(?:\\s*\\([^)]*archived by Ops\\))?",
            )
            content = content.replace(archiveNoteRegex, linkPattern)
            modified = true
          }

          // Remove (NEEDS REVIEW...) if present
          const needsReviewRegex = new RegExp(escapeRegex(linkPattern) + "\\s*\\(NEEDS REVIEW(?::[^)]*)?\\)")
          if (needsReviewRegex.test(content)) {
            content = content.replace(needsReviewRegex, linkPattern)
            modified = true
          }

          // Remove old (VERIFIED...) if present (to re-add with possibly new note)
          const oldVerifiedRegex = new RegExp(escapeRegex(linkPattern) + "(\\s*\\(Tier \\d\\))?\\s*\\(VERIFIED(?::[^)]*)?\\)")
          content = content.replace(oldVerifiedRegex, (_, tier) => linkPattern + (tier || ""))

          // Add (VERIFIED) or (VERIFIED: note) after link+tier
          const verifiedTag = change.note ? ` (VERIFIED: ${change.note})` : " (VERIFIED)"
          if (content.includes(linkPattern) && !content.includes(linkPattern + " (VERIFIED")) {
            const tierPattern = new RegExp(
              escapeRegex(linkPattern) + "(\\s*\\(Tier \\d\\))?",
            )
            content = content.replace(tierPattern, (match) => match + verifiedTag)
            modified = true
          }
          confirmed++
        } else if (change.newStatus === "unsure" || change.newStatus === "yellow") {
          const linkPattern = `[${change.label}](${change.url})`
          const archivedPattern = `~~${linkPattern}~~`

          // Unarchive if strikethrough (must do first so subsequent regexes can find the plain link)
          if (content.includes(archivedPattern)) {
            const archiveNoteRegex = new RegExp(
              escapeRegex(`~~${linkPattern}~~`) + "(?:\\s*\\([^)]*archived by Ops\\))?",
            )
            content = content.replace(archiveNoteRegex, linkPattern)
            modified = true
          }

          // Remove (VERIFIED...) if present
          const oldVerifiedRegex2 = new RegExp(escapeRegex(linkPattern) + "(\\s*\\((?:was )?Tier \\d[^)]*\\))?\\s*\\(VERIFIED(?::[^)]*)?\\)")
          content = content.replace(oldVerifiedRegex2, (_, tier) => linkPattern + (tier || ""))

          // Remove old (NEEDS REVIEW...) and (SLOW...) tags if present
          const oldNeedsReviewRegex = new RegExp(escapeRegex(linkPattern) + "(\\s*\\((?:was )?Tier \\d[^)]*\\))?\\s*\\((?:NEEDS REVIEW|SLOW)(?::[^)]*)?\\)")
          content = content.replace(oldNeedsReviewRegex, (_, tier) => linkPattern + (tier || ""))

          // Yellow = SLOW tag, Unsure = NEEDS REVIEW tag
          const isYellow = change.newStatus === "yellow"
          const tagPrefix = isYellow ? "SLOW" : "NEEDS REVIEW"
          const noteText = change.note || (isYellow ? "slow/redirect" : "")
          const reviewTag = noteText ? ` (${tagPrefix}: ${noteText})` : ` (${tagPrefix})`
          if (content.includes(linkPattern) && !content.includes(linkPattern + ` (${tagPrefix}`)) {
            const tierPattern = new RegExp(
              escapeRegex(linkPattern) + "(\\s*\\((?:was )?Tier \\d[^)]*\\))?",
            )
            content = content.replace(tierPattern, (match) => match + reviewTag)
            modified = true
          }
          flagged++
        }
      }

      if (modified) {
        fs.writeFileSync(fullPath, content, "utf-8")
        modifiedFiles.add(filePath)
      }
    }

    // Persist triage status to sidecar JSON (reliable source of truth)
    const triage = loadTriage()
    for (const change of changes) {
      const key = `${change.profilePath}::${change.url}`
      triage[key] = {
        status: change.newStatus === "slow" ? "yellow" : change.newStatus,
        date: new Date().toISOString().slice(0, 10),
        label: change.label,
        profile: change.profile,
        profilePath: change.profilePath,
        note: change.note || undefined,
      }
    }
    saveTriage(triage)

    // Git commit and push all modified files
    if (modifiedFiles.size > 0) {
      try {
        for (const f of modifiedFiles) {
          execSync(`git add "${f}"`, { cwd: repoRoot, timeout: 10000 })
        }
        const msg = `URL triage: ${archived} archived, ${confirmed} confirmed, ${flagged} flagged for review`
        execSync(`git commit -m "${msg}"`, { cwd: repoRoot, timeout: 10000 })
        execSync("git push origin v4", { cwd: repoRoot, timeout: 30000 })
      } catch (e) {
        console.error("Git push failed (local changes saved):", e)
      }
    }

    return NextResponse.json({
      success: true,
      summary: {
        archived,
        confirmed,
        flagged,
        filesModified: modifiedFiles.size,
      },
    })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
