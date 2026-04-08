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

    // Escape notes for YAML — use quoted string for multiline safety
    const escapedNotes = (notes || "").replace(/"/g, '\\"')

    if (/^internal-notes:\s*/m.test(updated)) {
      // Replace existing — handle both single-line and multi-line
      updated = updated.replace(/^internal-notes:\s*"?[^"\n]*"?\s*$/m, `internal-notes: "${escapedNotes}"`)
    } else if (notes && notes.trim()) {
      // Add before closing ---
      updated = updated.replace(/\n---\n/, `\ninternal-notes: "${escapedNotes}"\n---\n`)
    }

    // If notes are empty, remove the field
    if (!notes || !notes.trim()) {
      updated = updated.replace(/^internal-notes:\s*"?[^"\n]*"?\s*\n/m, "")
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
