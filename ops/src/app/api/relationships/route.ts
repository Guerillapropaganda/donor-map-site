import { NextResponse } from "next/server"
import { Octokit } from "octokit"
import matter from "gray-matter"

const OWNER = "Guerillapropaganda"
const REPO = "donor-map-site"
const BRANCH = "v4"

function getOctokit(): Octokit {
  const token = process.env.GITHUB_TOKEN
  if (!token) throw new Error("GITHUB_TOKEN not set")
  return new Octokit({ auth: token })
}

// POST — add a relationship between two profiles
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { sourcePath, targetTitle, relationshipType } = body

    if (!sourcePath || !targetTitle || !relationshipType) {
      return NextResponse.json(
        { error: "sourcePath, targetTitle, and relationshipType required" },
        { status: 400 }
      )
    }

    if (!["related", "donors", "opposes"].includes(relationshipType)) {
      return NextResponse.json(
        { error: "relationshipType must be: related, donors, or opposes" },
        { status: 400 }
      )
    }

    const octokit = getOctokit()

    // Get current file content
    const { data: fileData } = await octokit.rest.repos.getContent({
      owner: OWNER,
      repo: REPO,
      path: sourcePath,
      ref: BRANCH,
    })

    if (!("content" in fileData) || !fileData.content) {
      return NextResponse.json({ error: "File not found" }, { status: 404 })
    }

    const content = Buffer.from(fileData.content, "base64").toString("utf-8")
    const { data: fm, content: bodyContent } = matter(content)

    // Build the wikilink
    const wikilink = `[[${targetTitle}]]`

    // Get current value of the relationship field
    const currentValue = fm[relationshipType] as string | undefined

    if (currentValue) {
      // Check if already connected
      if (currentValue.includes(targetTitle)) {
        return NextResponse.json({ error: "Connection already exists", existing: true }, { status: 409 })
      }
      // Append with separator
      fm[relationshipType] = `${currentValue} · ${wikilink}`
    } else {
      fm[relationshipType] = wikilink
    }

    fm["last-updated"] = new Date().toISOString().split("T")[0]

    const updated = matter.stringify(bodyContent, fm)

    await octokit.rest.repos.createOrUpdateFileContents({
      owner: OWNER,
      repo: REPO,
      path: sourcePath,
      message: `Add ${relationshipType} connection: ${fm.title || sourcePath} → ${targetTitle}`,
      content: Buffer.from(updated).toString("base64"),
      sha: fileData.sha,
      branch: BRANCH,
    })

    return NextResponse.json({ success: true, field: relationshipType, value: fm[relationshipType] })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// DELETE — remove a relationship between two profiles
export async function DELETE(request: Request) {
  try {
    const body = await request.json()
    const { sourcePath, targetTitle, relationshipType } = body

    if (!sourcePath || !targetTitle || !relationshipType) {
      return NextResponse.json({ error: "sourcePath, targetTitle, and relationshipType required" }, { status: 400 })
    }

    const octokit = getOctokit()

    const { data: fileData } = await octokit.rest.repos.getContent({
      owner: OWNER,
      repo: REPO,
      path: sourcePath,
      ref: BRANCH,
    })

    if (!("content" in fileData) || !fileData.content) {
      return NextResponse.json({ error: "File not found" }, { status: 404 })
    }

    const content = Buffer.from(fileData.content, "base64").toString("utf-8")
    const { data: fm, content: bodyContent } = matter(content)

    const currentValue = fm[relationshipType] as string | undefined
    if (!currentValue) {
      return NextResponse.json({ error: "No connections in this field" }, { status: 404 })
    }

    // Remove the wikilink
    const links = currentValue.split("·").map((s: string) => s.trim()).filter((s: string) => !s.includes(targetTitle))

    if (links.length === 0) {
      delete fm[relationshipType]
    } else {
      fm[relationshipType] = links.join(" · ")
    }

    fm["last-updated"] = new Date().toISOString().split("T")[0]

    const updated = matter.stringify(bodyContent, fm)

    await octokit.rest.repos.createOrUpdateFileContents({
      owner: OWNER,
      repo: REPO,
      path: sourcePath,
      message: `Remove ${relationshipType} connection: ${fm.title || sourcePath} ✕ ${targetTitle}`,
      content: Buffer.from(updated).toString("base64"),
      sha: fileData.sha,
      branch: BRANCH,
    })

    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
