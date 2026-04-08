import { NextResponse } from "next/server"
import fs from "fs"
import path from "path"
import { execSync } from "child_process"

interface UrlChange {
  url: string
  label: string
  tier?: number
  profilePath: string
  profile: string
  newStatus: "ok" | "broken" | "slow" | "unsure" | "yellow"
  note?: string
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

            // Add note about archival
            const tierNote = change.tier ? ` (was Tier ${change.tier}` : ""
            const archiveNote = tierNote ? `${tierNote} — URL broken, archived by Ops)` : " (URL broken, archived by Ops)"
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

          // Remove old (NEEDS REVIEW...) if present (to re-add with possibly new note)
          const oldNeedsReviewRegex = new RegExp(escapeRegex(linkPattern) + "(\\s*\\((?:was )?Tier \\d[^)]*\\))?\\s*\\(NEEDS REVIEW(?::[^)]*)?\\)")
          content = content.replace(oldNeedsReviewRegex, (_, tier) => linkPattern + (tier || ""))

          // Add (NEEDS REVIEW) or (NEEDS REVIEW: note) tag
          const noteText = change.note || (change.newStatus === "yellow" ? "slow/redirect" : "")
          const reviewTag = noteText ? ` (NEEDS REVIEW: ${noteText})` : " (NEEDS REVIEW)"
          if (content.includes(linkPattern) && !content.includes(linkPattern + " (NEEDS REVIEW")) {
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
