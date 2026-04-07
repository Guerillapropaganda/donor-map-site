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

// Save edited content to a profile
export async function PUT(request: Request) {
  try {
    const body = await request.json()
    const { path, content, message } = body

    if (!path || !content) {
      return NextResponse.json({ error: "path and content required" }, { status: 400 })
    }

    const octokit = getOctokit()

    // Get current file to get its SHA
    const { data: fileData } = await octokit.rest.repos.getContent({
      owner: OWNER,
      repo: REPO,
      path,
      ref: BRANCH,
    })

    if (!("sha" in fileData)) {
      return NextResponse.json({ error: "File not found" }, { status: 404 })
    }

    await octokit.rest.repos.createOrUpdateFileContents({
      owner: OWNER,
      repo: REPO,
      path,
      message: message || `Edit: ${path.split("/").pop()}`,
      content: Buffer.from(content).toString("base64"),
      sha: fileData.sha,
      branch: BRANCH,
    })

    return NextResponse.json({ success: true, path })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json({ error: message }, { status: 500 })
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

    const octokit = getOctokit()

    const { data: fileData } = await octokit.rest.repos.getContent({
      owner: OWNER,
      repo: REPO,
      path,
      ref: BRANCH,
    })

    if (!("sha" in fileData)) {
      return NextResponse.json({ error: "File not found" }, { status: 404 })
    }

    await octokit.rest.repos.createOrUpdateFileContents({
      owner: OWNER,
      repo: REPO,
      path,
      message: `Delete: ${path.split("/").pop()}`,
      sha: fileData.sha,
      branch: BRANCH,
      content: "", // Required but ignored for delete
    })

    // Actually delete uses a different method
    await octokit.rest.repos.deleteFile({
      owner: OWNER,
      repo: REPO,
      path,
      message: `Delete: ${path.split("/").pop()}`,
      sha: fileData.sha,
      branch: BRANCH,
    })

    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
