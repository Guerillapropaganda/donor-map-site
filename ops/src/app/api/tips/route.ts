import { NextResponse } from "next/server"
import fs from "fs"
import path from "path"
import matter from "gray-matter"

const TIPS_DIR = "content/Admin Notes/Tips"

function getRepoRoot(): string {
  const fromOps = path.resolve(process.cwd(), "..")
  if (fs.existsSync(path.join(fromOps, "content"))) return fromOps
  if (fs.existsSync(path.join(process.cwd(), "content"))) return process.cwd()
  throw new Error("Cannot find repo root")
}

export interface Tip {
  id: string
  filename: string
  profile: string
  profileUrl: string
  category: string
  email: string
  status: string
  date: string
  message: string
}

function parseTip(filename: string, content: string): Tip {
  const { data, content: body } = matter(content)
  return {
    id: filename.replace(".md", ""),
    filename,
    profile: data.profile || "Unknown",
    profileUrl: data["profile-url"] || "",
    category: data["tip-category"] || "Other",
    email: data["submitter-email"] || "",
    status: data.status || "new",
    date: data.date ? new Date(data.date).toISOString() : "",
    message: body.trim(),
  }
}

// GET — list all tips
export async function GET() {
  try {
    const repoRoot = getRepoRoot()
    const tipsDir = path.join(repoRoot, TIPS_DIR)

    if (!fs.existsSync(tipsDir)) {
      return NextResponse.json({ tips: [] })
    }

    const files = fs.readdirSync(tipsDir).filter((f) => f.endsWith(".md"))
    const tips: Tip[] = files.map((f) => {
      const content = fs.readFileSync(path.join(tipsDir, f), "utf-8")
      return parseTip(f, content)
    })

    tips.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

    return NextResponse.json({ tips })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

// PUT — update tip status
export async function PUT(request: Request) {
  try {
    const body = await request.json()
    const { id, status } = body

    if (!id || !status) {
      return NextResponse.json({ error: "id and status required" }, { status: 400 })
    }

    const validStatuses = ["new", "reviewed", "actioned", "dismissed"]
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ error: `Invalid status. Use: ${validStatuses.join(", ")}` }, { status: 400 })
    }

    const repoRoot = getRepoRoot()
    const filePath = path.join(repoRoot, TIPS_DIR, `${id}.md`)

    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ error: "Tip not found" }, { status: 404 })
    }

    const content = fs.readFileSync(filePath, "utf-8")
    const { data, content: tipBody } = matter(content)
    data.status = status
    if (status === "reviewed" || status === "actioned") {
      data["reviewed-date"] = new Date().toISOString().slice(0, 10)
    }

    const updated = matter.stringify(tipBody, data)
    fs.writeFileSync(filePath, updated, "utf-8")

    return NextResponse.json({ success: true, id, status })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

// DELETE — delete a tip
export async function DELETE(request: Request) {
  try {
    const body = await request.json()
    const { id } = body

    if (!id) {
      return NextResponse.json({ error: "id required" }, { status: 400 })
    }

    const repoRoot = getRepoRoot()
    const filePath = path.join(repoRoot, TIPS_DIR, `${id}.md`)

    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ error: "Tip not found" }, { status: 404 })
    }

    fs.unlinkSync(filePath)

    return NextResponse.json({ success: true, id })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
