import { NextResponse } from "next/server"
import { readFile, writeAndPush } from "@/lib/local-write"

export async function POST(request: Request) {
  try {
    const { path: filePath, notes } = await request.json()

    if (!filePath) {
      return NextResponse.json({ error: "Missing path" }, { status: 400 })
    }

    const content = readFile(filePath)

    let updated = content

    // Flatten notes to single line and escape for YAML
    const flatNotes = (notes || "").replace(/\n/g, " | ").replace(/"/g, '\\"').trim()

    // Remove existing internal-notes field (may span multiple lines if corrupted)
    // Match from "internal-notes:" to next YAML key or closing ---
    updated = updated.replace(/^internal-notes:[\s\S]*?(?=^[a-zA-Z][\w-]*:|^---$)/m, "")

    // Add back if non-empty, before closing ---
    if (flatNotes) {
      updated = updated.replace(/\n---\n/, `\ninternal-notes: "${flatNotes}"\n---\n`)
    }

    if (updated === content) {
      return NextResponse.json({ success: true, message: "No changes" })
    }

    const titleMatch = updated.match(/^title:\s*(.+)$/m)
    const title = titleMatch ? titleMatch[1].trim().replace(/^["']|["']$/g, "") : "Unknown"

    writeAndPush(filePath, updated, `${title}: update internal notes`)

    return NextResponse.json({ success: true, title })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
