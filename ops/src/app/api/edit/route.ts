import { NextResponse } from "next/server"
import { writeAndPush, deleteAndPush, readFile } from "@/lib/local-write"

/**
 * Profile edit API — ops/src/app/api/edit/route.ts
 *
 * RULES:
 * 1. FRONTMATTER-ONLY for structured fields. Callers of PUT must hand in
 *    content whose structured fields live in the YAML frontmatter block,
 *    NOT as `field:: value` body-inline dataview. The editor page uses
 *    gray-matter's `matter.stringify` which does this correctly. Do not
 *    accept content from new callers without verifying the same.
 * 2. DELETE is used by David from the Ops app only. Never call DELETE as
 *    part of an automated cleanup — deleting profiles requires explicit
 *    operator confirmation per the session protocol.
 * 3. URL editing: neither Claude is permitted to rewrite URLs. If a future
 *    PUT payload looks like a URL replacement, that must be routed through
 *    the URL Manager triage workflow (David-only), not this endpoint.
 */

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
