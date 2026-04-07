import { NextResponse } from "next/server"
import { writeAndPush, deleteAndPush, readFile } from "@/lib/local-write"

// Save edited content to a profile
export async function PUT(request: Request) {
  try {
    const body = await request.json()
    const { path, content, message } = body

    if (!path || !content) {
      return NextResponse.json({ error: "path and content required" }, { status: 400 })
    }

    const commitMsg = message || `Edit: ${path.split("/").pop()}`
    writeAndPush(path, content, commitMsg)

    return NextResponse.json({ success: true, path })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

// Delete a profile
export async function DELETE(request: Request) {
  try {
    const body = await request.json()
    const { path } = body

    if (!path) {
      return NextResponse.json({ error: "path required" }, { status: 400 })
    }

    deleteAndPush(path, `Delete: ${path.split("/").pop()}`)

    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
