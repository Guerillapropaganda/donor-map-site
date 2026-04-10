import { NextResponse } from "next/server"
import { readFile, writeAndPush } from "@/lib/local-write"

/**
 * Readiness update API — ops/src/app/api/profile/readiness/route.ts
 *
 * RULES:
 * 1. FRONTMATTER-ONLY. This endpoint updates `content-readiness` in the
 *    YAML frontmatter via regex on `^content-readiness:\s*.+$`. NEVER add
 *    a codepath that writes `content-readiness::` inline in the body — that
 *    is Obsidian Dataview legacy syntax and is banned per Vault Rules.
 *    The 2026-04-10 cleanup sweep removed 562 files that had the legacy
 *    pattern; don't reintroduce it.
 * 2. `verified` is David-only. Research Claude flags
 *    `editorial-result: verified-candidate`; only David's sign-off promotes
 *    to `content-readiness: verified`. Do not wire auto-promote logic here
 *    or anywhere upstream.
 * 3. This endpoint commits + pushes via `writeAndPush`. Any failure leaves
 *    local state but not upstream — callers should surface the error.
 */

const VALID_TIERS = ["raw", "draft", "ready", "verified"]
const TIER_LABELS: Record<string, string> = {
  raw: "D-F",
  draft: "C",
  ready: "B",
  verified: "A+",
}

export async function POST(request: Request) {
  try {
    const { path: filePath, newReadiness, signOff } = await request.json()

    if (!filePath || !newReadiness) {
      return NextResponse.json({ error: "Missing path or newReadiness" }, { status: 400 })
    }

    if (!VALID_TIERS.includes(newReadiness)) {
      return NextResponse.json({ error: `Invalid readiness: ${newReadiness}` }, { status: 400 })
    }

    // Read current file
    const content = readFile(filePath)

    // Update content-readiness in frontmatter
    let updated = content
    if (/^content-readiness:\s*.+$/m.test(updated)) {
      updated = updated.replace(/^content-readiness:\s*.+$/m, `content-readiness: ${newReadiness}`)
    } else {
      // Add content-readiness before closing ---
      updated = updated.replace(/\n---\n/, `\ncontent-readiness: ${newReadiness}\n---\n`)
    }

    // If promoting to verified, add editorial sign-off
    if (newReadiness === "verified" && signOff) {
      if (/^last-verified-by:\s*.+$/m.test(updated)) {
        updated = updated.replace(/^last-verified-by:\s*.+$/m, "last-verified-by: editorial")
      } else {
        updated = updated.replace(/\n---\n/, "\nlast-verified-by: editorial\n---\n")
      }
    }

    // If demoting from verified, remove sign-off
    if (newReadiness !== "verified") {
      updated = updated.replace(/^last-verified-by:\s*.+\n/m, "")
    }

    // Extract title for commit message
    const titleMatch = updated.match(/^title:\s*(.+)$/m)
    const title = titleMatch ? titleMatch[1].trim().replace(/^["']|["']$/g, "") : "Unknown"

    const oldMatch = content.match(/^content-readiness:\s*(.+)$/m)
    const oldReadiness = oldMatch ? oldMatch[1].trim() : "unknown"

    const commitMsg = `${title}: ${oldReadiness} (${TIER_LABELS[oldReadiness] || "?"}) → ${newReadiness} (${TIER_LABELS[newReadiness] || "?"})`

    writeAndPush(filePath, updated, commitMsg)

    return NextResponse.json({
      success: true,
      title,
      from: oldReadiness,
      to: newReadiness,
      message: commitMsg,
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
