import { NextResponse } from "next/server"
import { Octokit } from "octokit"

const OWNER = "Guerillapropaganda"
const ENGINE_REPO = "donor-map-engine"

function getOctokit(): Octokit {
  const token = process.env.GITHUB_TOKEN
  if (!token) throw new Error("GITHUB_TOKEN not set")
  return new Octokit({ auth: token })
}

// GET /api/pipelines/status?after=ISO_TIMESTAMP
// Finds the most recent workflow_dispatch run started after the given timestamp
export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const after = url.searchParams.get("after")

    const octokit = getOctokit()
    const { data } = await octokit.rest.actions.listWorkflowRuns({
      owner: OWNER,
      repo: ENGINE_REPO,
      workflow_id: "api-enrichment.yml",
      event: "workflow_dispatch",
      per_page: 5,
    })

    // Find the run that started after our trigger time
    const afterDate = after ? new Date(after) : new Date(0)
    const run = data.workflow_runs.find(
      (r) => new Date(r.created_at) >= afterDate,
    )

    if (!run) {
      return NextResponse.json({ found: false, status: "pending" })
    }

    return NextResponse.json({
      found: true,
      id: run.id,
      status: run.status,
      conclusion: run.conclusion,
      url: run.html_url,
      createdAt: run.created_at,
      updatedAt: run.updated_at,
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
