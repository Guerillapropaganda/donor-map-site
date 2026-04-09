import { NextResponse } from "next/server"
import { readFile, writeAndPush } from "@/lib/local-write"

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
    let updated = content

    const titleMatch = updated.match(/^title:\s*(.+)$/m)
    const profileTitle = titleMatch ? titleMatch[1].trim().replace(/^["']|["']$/g, "") : "Unknown"
    const wikilink = `[[${target}]]`
    const fieldRegex = new RegExp(`^${field}:\\s*(.*)$`, "m")

    if (action === "add") {
      const match = updated.match(fieldRegex)
      if (match) {
        const existing = match[1].trim().replace(/^["']|["']$/g, "")
        if (existing.includes(target)) {
          return NextResponse.json({ success: true, message: `${target} already in ${field}` })
        }
        const newVal = existing ? `${existing} · ${wikilink}` : wikilink
        updated = updated.replace(fieldRegex, `${field}: "${newVal}"`)
      } else {
        updated = updated.replace(/\n---\n/, `\n${field}: "${wikilink}"\n---\n`)
      }
      writeAndPush(filePath, updated, `${profileTitle}: add ${field} → ${target}`)
      return NextResponse.json({ success: true, message: `Added ${target} as ${field}` })

    } else if (action === "remove") {
      const match = updated.match(fieldRegex)
      if (!match) {
        return NextResponse.json({ success: true, message: "Field not found" })
      }
      const existing = match[1].trim().replace(/^["']|["']$/g, "")
      const escaped = target.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
      // Match target as reference name OR as alias: [[target|...]] or [[...|target]] or [[target]]
      let newVal = existing
        .replace(new RegExp(`\\[\\[[^\\]]*\\|${escaped}\\]\\]`), "")  // [[anything|target]]
        .replace(new RegExp(`\\[\\[${escaped}(\\|[^\\]]+)?\\]\\]`), "")  // [[target|...]] or [[target]]
        .replace(/\s*·\s*·\s*/g, " · ")
        .replace(/^\s*·\s*/, "")
        .replace(/\s*·\s*$/, "")
        .trim()

      if (newVal) {
        updated = updated.replace(fieldRegex, `${field}: "${newVal}"`)
      } else {
        updated = updated.replace(new RegExp(`^${field}:.*\\n`, "m"), "")
      }
      writeAndPush(filePath, updated, `${profileTitle}: remove ${field} ← ${target}`)
      return NextResponse.json({ success: true, message: `Removed ${target} from ${field}` })
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
