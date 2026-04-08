import { NextResponse } from "next/server"
import { readFile, writeAndPush } from "@/lib/local-write"

export async function POST(request: Request) {
  try {
    const { path: filePath, checklistNa, verifiedBlocks } = await request.json()

    if (!filePath) {
      return NextResponse.json({ error: "Missing path" }, { status: 400 })
    }

    const content = readFile(filePath)
    let updated = content

    const titleMatch = updated.match(/^title:\s*(.+)$/m)
    const title = titleMatch ? titleMatch[1].trim().replace(/^["']|["']$/g, "") : "Unknown"

    // Update checklist-na
    if (checklistNa !== undefined) {
      // Remove existing field
      updated = updated.replace(/^checklist-na:[\s\S]*?(?=^[a-zA-Z][\w-]*:|^---$)/m, "")

      if (Array.isArray(checklistNa) && checklistNa.length > 0) {
        const yaml = `checklist-na:\n${checklistNa.map((n: string) => `  - "${n.replace(/"/g, '\\"')}"`).join("\n")}\n`
        updated = updated.replace(/\n---\n/, `\n${yaml}---\n`)
      }
    }

    // Update verified-blocks
    if (verifiedBlocks !== undefined) {
      updated = updated.replace(/^verified-blocks:[\s\S]*?(?=^[a-zA-Z][\w-]*:|^---$)/m, "")

      if (Array.isArray(verifiedBlocks) && verifiedBlocks.length > 0) {
        const yaml = `verified-blocks:\n${verifiedBlocks.map((b: string) => `  - "${b}"`).join("\n")}\n`
        updated = updated.replace(/\n---\n/, `\n${yaml}---\n`)
      }
    }

    if (updated === content) {
      return NextResponse.json({ success: true, message: "No changes" })
    }

    writeAndPush(filePath, updated, `${title}: update verification checklist`)

    return NextResponse.json({ success: true, title })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
