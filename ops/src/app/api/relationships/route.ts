import { NextResponse } from "next/server"
import matter from "gray-matter"
import { readFile, writeAndPush } from "@/lib/local-write"

// POST — add a relationship between two profiles
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { sourcePath, targetTitle, relationshipType } = body

    if (!sourcePath || !targetTitle || !relationshipType) {
      return NextResponse.json({ error: "sourcePath, targetTitle, and relationshipType required" }, { status: 400 })
    }

    if (!["related", "donors", "opposes"].includes(relationshipType)) {
      return NextResponse.json({ error: "relationshipType must be: related, donors, or opposes" }, { status: 400 })
    }

    const content = readFile(sourcePath)
    const { data: fm, content: bodyContent } = matter(content)

    const wikilink = `[[${targetTitle}]]`
    const currentValue = fm[relationshipType] as string | undefined

    if (currentValue && currentValue.includes(targetTitle)) {
      return NextResponse.json({ error: "Connection already exists", existing: true }, { status: 409 })
    }

    fm[relationshipType] = currentValue ? `${currentValue} · ${wikilink}` : wikilink
    fm["last-updated"] = new Date().toISOString().split("T")[0]

    const updated = matter.stringify(bodyContent, fm)
    writeAndPush(sourcePath, updated, `Add ${relationshipType} connection: ${fm.title || sourcePath} → ${targetTitle}`)

    return NextResponse.json({ success: true, field: relationshipType, value: fm[relationshipType] })
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

    const currentValue = fm[relationshipType] as string | undefined
    if (!currentValue) {
      return NextResponse.json({ error: "No connections in this field" }, { status: 404 })
    }

    const links = currentValue.split("·").map((s: string) => s.trim()).filter((s: string) => !s.includes(targetTitle))
    if (links.length === 0) delete fm[relationshipType]
    else fm[relationshipType] = links.join(" · ")

    fm["last-updated"] = new Date().toISOString().split("T")[0]

    const updated = matter.stringify(bodyContent, fm)
    writeAndPush(sourcePath, updated, `Remove ${relationshipType} connection: ${fm.title || sourcePath} ✕ ${targetTitle}`)

    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
