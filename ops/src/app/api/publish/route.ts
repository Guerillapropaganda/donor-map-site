import { NextResponse } from "next/server"
import { writeAndPush, fileExists } from "@/lib/local-write"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { path, content, title } = body

    if (!path || !content) {
      return NextResponse.json({ error: "path and content required" }, { status: 400 })
    }

    if (fileExists(path)) {
      return NextResponse.json({ error: `File already exists: ${path}` }, { status: 409 })
    }

    writeAndPush(path, content, `New profile: ${title || path}`)

    return NextResponse.json({ success: true, path })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
