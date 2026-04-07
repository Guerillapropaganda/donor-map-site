import { NextResponse } from "next/server"
import { Octokit } from "octokit"

const OWNER = "Guerillapropaganda"
const REPO = "donor-map-site"
const BRANCH = "v4"

function getOctokit(): Octokit {
  const token = process.env.GITHUB_TOKEN
  if (!token) throw new Error("GITHUB_TOKEN not set")
  return new Octokit({ auth: token })
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { path, content, title } = body

    if (!path || !content) {
      return NextResponse.json({ error: "path and content required" }, { status: 400 })
    }

    const octokit = getOctokit()

    // Check if file already exists
    try {
      await octokit.rest.repos.getContent({
        owner: OWNER,
        repo: REPO,
        path,
        ref: BRANCH,
      })
      return NextResponse.json({ error: `File already exists: ${path}` }, { status: 409 })
    } catch (e: unknown) {
      // 404 means file doesn't exist — good, we can create it
      if (e && typeof e === "object" && "status" in e && (e as { status: number }).status !== 404) {
        throw e
      }
    }

    // Create the file
    await octokit.rest.repos.createOrUpdateFileContents({
      owner: OWNER,
      repo: REPO,
      path,
      message: `New profile: ${title || path}`,
      content: Buffer.from(content).toString("base64"),
      branch: BRANCH,
    })

    return NextResponse.json({ success: true, path })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
