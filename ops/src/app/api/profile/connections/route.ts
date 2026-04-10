import { NextResponse } from "next/server"
import matter from "gray-matter"
import { readFile, writeAndPush } from "@/lib/local-write"

/**
 * Profile-connections API — add/remove wikilink relationships on a profile frontmatter.
 *
 * CRITICAL: this route uses gray-matter (not regex) so it safely handles both
 * string-form and YAML-list-form frontmatter fields. The regex-based version that
 * previously lived here corrupted profiles with multi-line YAML list fields
 * (e.g., Sheldon Whitehouse's donors list) because the regex only matched the
 * first line of the field. See Pipeline Guide § Known incidents (our vault)
 * for the April 10, 2026 bug report.
 */

// Helper: normalize a frontmatter relationship field value for containment checks.
function normalizeFieldForCheck(value: unknown): string {
  if (!value) return ""
  if (Array.isArray(value)) return value.map((s) => String(s)).join(" \u00b7 ").toLowerCase()
  return String(value).toLowerCase()
}

// Helper: append a new relationship to a frontmatter field value, preserving its shape.
// CRITICAL: never stringify an array via template literal — Array.toString() produces
// comma-joined output that breaks YAML on the next read.
function appendRelationship(existing: unknown, targetTitle: string): string | string[] {
  const wikilink = `[[${targetTitle}]]`
  if (Array.isArray(existing)) {
    return [...existing.map((s) => String(s)), targetTitle]
  }
  if (existing) {
    return `${String(existing)} \u00b7 ${wikilink}`
  }
  return wikilink
}

// Helper: remove a target from a relationship field value, preserving its shape.
function removeRelationship(existing: unknown, targetTitle: string): { value: string | string[] | undefined; changed: boolean } {
  const targetLower = targetTitle.toLowerCase()
  if (Array.isArray(existing)) {
    const filtered = existing.map((s) => String(s)).filter((item) => !item.toLowerCase().includes(targetLower))
    if (filtered.length === existing.length) return { value: existing as string[], changed: false }
    if (filtered.length === 0) return { value: undefined, changed: true }
    return { value: filtered, changed: true }
  }
  if (typeof existing === "string" && existing.toLowerCase().includes(targetLower)) {
    const escaped = targetTitle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
    const newVal = existing
      .replace(new RegExp(`\\[\\[[^\\]]*\\|${escaped}\\]\\]`), "")
      .replace(new RegExp(`\\[\\[${escaped}(\\|[^\\]]+)?\\]\\]`), "")
      .replace(/\s*\u00b7\s*\u00b7\s*/g, " \u00b7 ")
      .replace(/^\s*\u00b7\s*/, "")
      .replace(/\s*\u00b7\s*$/, "")
      .trim()
    if (!newVal) return { value: undefined, changed: true }
    return { value: newVal, changed: true }
  }
  return { value: existing as string | string[] | undefined, changed: false }
}

export async function POST(request: Request) {
  try {
    const { path: filePath, action, target, field } = await request.json()

    if (!filePath || !action || !target || !field) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    if (!["related", "donors", "opposes"].includes(field)) {
      return NextResponse.json({ error: `Invalid field: ${field}` }, { status: 400 })
    }

    const content = readFile(filePath)
    const { data: fm, content: bodyContent } = matter(content)
    const profileTitle = String(fm.title || "Unknown").replace(/^["']|["']$/g, "")

    if (action === "add") {
      const existing = fm[field]
      const normalized = normalizeFieldForCheck(existing)
      if (normalized && normalized.includes(target.toLowerCase())) {
        return NextResponse.json({ success: true, message: `${target} already in ${field}` })
      }
      fm[field] = appendRelationship(existing, target)
      const updated = matter.stringify(bodyContent, fm)
      writeAndPush(filePath, updated, `${profileTitle}: add ${field} \u2192 ${target}`)
      return NextResponse.json({ success: true, message: `Added ${target} as ${field}` })

    } else if (action === "remove") {
      const existing = fm[field]
      const { value, changed } = removeRelationship(existing, target)
      if (!changed) {
        return NextResponse.json({ success: true, message: "Target not found in field" })
      }
      if (value === undefined) {
        delete fm[field]
      } else {
        fm[field] = value
      }
      const updated = matter.stringify(bodyContent, fm)
      writeAndPush(filePath, updated, `${profileTitle}: remove ${field} \u2190 ${target}`)
      return NextResponse.json({ success: true, message: `Removed ${target} from ${field}` })
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
