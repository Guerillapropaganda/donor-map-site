import { NextResponse } from "next/server"
import matter from "gray-matter"
import { readFile, writeAndPush } from "@/lib/local-write"

const VALID_TYPES = ["related", "donors", "opposes", "stories"]

// Find and remove a wikilink from a body-text field line like "related: [[A]] · [[B]]"
function removeFromBodyField(body: string, field: string, targetTitle: string): { updated: string; found: boolean } {
  const regex = new RegExp(`^(${field}:\\s*)(.+)$`, "m")
  const match = body.match(regex)
  if (!match) return { updated: body, found: false }

  const line = match[2]
  if (!line.includes(targetTitle)) return { updated: body, found: false }

  // Remove the wikilink containing targetTitle
  const links = line.split("·").map((s) => s.trim()).filter((s) => !s.includes(targetTitle))
  if (links.length === 0) {
    // Remove entire line
    return { updated: body.replace(regex, "").replace(/\n{3,}/g, "\n\n"), found: true }
  }
  return { updated: body.replace(regex, `${match[1]}${links.join(" · ")}`), found: true }
}

// Add a wikilink to a body-text field line
function addToBodyField(body: string, field: string, targetTitle: string): string {
  const wikilink = `[[${targetTitle}]]`
  const regex = new RegExp(`^(${field}:\\s*)(.+)$`, "m")
  const match = body.match(regex)
  if (match) {
    return body.replace(regex, `${match[1]}${match[2]} · ${wikilink}`)
  }
  // No existing line — don't add to body, let frontmatter handle it
  return body
}

/**
 * Normalize a frontmatter relationship field value for containment checks.
 * The field can be:
 *  - undefined (no value yet)
 *  - a string with ` · ` separated wikilinks, e.g. "[[A]] · [[B]]"
 *  - a YAML list (array of strings), e.g. ["A", "B"]
 * Returns a lowercased string suitable for `.includes()` target checks.
 */
function normalizeFieldForCheck(value: unknown): string {
  if (!value) return ""
  if (Array.isArray(value)) return value.map((s) => String(s)).join(" · ").toLowerCase()
  return String(value).toLowerCase()
}

/**
 * Append a wikilink to a frontmatter field value, preserving its existing shape.
 *  - If the existing value is a YAML list (array), push the bare target title onto the list.
 *    Obsidian wikilinks inside YAML list items are legitimate if the callers write them as
 *    "[[Title]]" strings, but the convention in this vault is bare titles in list form and
 *    bracketed wikilinks in string form. Use the form that matches the existing field.
 *  - If the existing value is a string, concat with ` · ` separator.
 *  - If undefined/null, return a new single-wikilink string.
 *
 * CRITICAL: never stringify an array via template literal (`${arr}` = Array.toString() =
 * comma-joined). That was the source of a recurring bug that corrupted frontmatter on
 * profiles with list-format relationship fields. See Pipeline Guide § Known incidents (our vault)
 * for the April 10, 2026 bug report.
 */
function appendRelationship(existing: unknown, targetTitle: string): string | string[] {
  const wikilink = `[[${targetTitle}]]`
  if (Array.isArray(existing)) {
    // Preserve list form — push the bare title so the item looks the same as neighbors.
    // Most list-form donor/opposes fields in the vault use bare strings, not wikilinks.
    return [...existing.map((s) => String(s)), targetTitle]
  }
  if (existing) {
    return `${String(existing)} · ${wikilink}`
  }
  return wikilink
}

// POST — add a relationship between two profiles
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { sourcePath, targetTitle, relationshipType } = body

    if (!sourcePath || !targetTitle || !relationshipType) {
      return NextResponse.json({ error: "sourcePath, targetTitle, and relationshipType required" }, { status: 400 })
    }

    if (!VALID_TYPES.includes(relationshipType)) {
      return NextResponse.json({ error: "relationshipType must be: related, donors, or opposes" }, { status: 400 })
    }

    const content = readFile(sourcePath)
    const { data: fm, content: bodyContent } = matter(content)

    // Check both frontmatter and body for existing connection.
    // fmValue can be a string OR a YAML list (array). Normalize before containment check.
    const fmValue = fm[relationshipType]
    const fmValueNormalized = normalizeFieldForCheck(fmValue)
    if (fmValueNormalized && fmValueNormalized.includes(targetTitle.toLowerCase())) {
      return NextResponse.json({ error: "Connection already exists", existing: true }, { status: 409 })
    }
    if (bodyContent.match(new RegExp(`^${relationshipType}:.*${targetTitle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`, "m"))) {
      return NextResponse.json({ error: "Connection already exists in body text", existing: true }, { status: 409 })
    }

    // Try to add to body field first (if one exists), otherwise use frontmatter.
    // CRITICAL: preserve the existing frontmatter field shape (string or YAML list).
    // Do NOT stringify a list via template literal — that was the April 2026 bug that
    // corrupted Sheldon Whitehouse's donors field repeatedly (Array.toString produces
    // comma-joined string, leaving list items orphaned below).
    const bodyRegex = new RegExp(`^${relationshipType}:\\s*.+$`, "m")
    let updatedBody = bodyContent
    if (bodyRegex.test(bodyContent)) {
      updatedBody = addToBodyField(bodyContent, relationshipType, targetTitle)
    } else {
      fm[relationshipType] = appendRelationship(fmValue, targetTitle)
    }

    fm["last-updated"] = new Date().toISOString().split("T")[0]

    const updated = matter.stringify(updatedBody, fm)
    writeAndPush(sourcePath, updated, `Add ${relationshipType} connection: ${fm.title || sourcePath} → ${targetTitle}`)

    // Invalidate connections cache
    invalidateCache()

    return NextResponse.json({ success: true, field: relationshipType })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

// DELETE — remove a relationship
export async function DELETE(request: Request) {
  try {
    const body = await request.json()
    const { sourcePath, targetTitle, relationshipType } = body

    if (!sourcePath || !targetTitle || !relationshipType) {
      return NextResponse.json({ error: "sourcePath, targetTitle, and relationshipType required" }, { status: 400 })
    }

    const content = readFile(sourcePath)
    const { data: fm, content: bodyContent } = matter(content)

    let found = false
    let updatedBody = bodyContent

    // Try frontmatter first. Handle both string ("[[A]] · [[B]]") and YAML list (["A", "B"]).
    const fmValue = fm[relationshipType]
    if (Array.isArray(fmValue)) {
      // List form: filter out items matching the target title (normalized, case-insensitive)
      const targetLower = targetTitle.toLowerCase()
      const filtered = fmValue.filter((item) => !String(item).toLowerCase().includes(targetLower))
      if (filtered.length !== fmValue.length) {
        if (filtered.length === 0) delete fm[relationshipType]
        else fm[relationshipType] = filtered
        found = true
      }
    } else if (typeof fmValue === "string" && fmValue.includes(targetTitle)) {
      // String form: split on ` · ` and filter
      const links = fmValue.split("·").map((s: string) => s.trim()).filter((s: string) => !s.includes(targetTitle))
      if (links.length === 0) delete fm[relationshipType]
      else fm[relationshipType] = links.join(" · ")
      found = true
    }

    // Also try body text
    if (!found) {
      const result = removeFromBodyField(bodyContent, relationshipType, targetTitle)
      if (result.found) {
        updatedBody = result.updated
        found = true
      }
    }

    if (!found) {
      return NextResponse.json({ error: `Connection not found in ${relationshipType}` }, { status: 404 })
    }

    fm["last-updated"] = new Date().toISOString().split("T")[0]

    const updated = matter.stringify(updatedBody, fm)
    writeAndPush(sourcePath, updated, `Remove ${relationshipType} connection: ${fm.title || sourcePath} ✕ ${targetTitle}`)

    // Invalidate connections cache
    invalidateCache()

    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

// Invalidate connections API cache by touching a global
function invalidateCache() {
  try {
    // Import and clear the cache from connections route
    // We'll use a simpler approach: the connections route checks cache TTL
    // Setting a global flag that the connections route can check
    ;(globalThis as Record<string, unknown>).__connectionsInvalidated = Date.now()
  } catch { /* skip */ }
}
