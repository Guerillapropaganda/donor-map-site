import { NextResponse } from "next/server"
import { Octokit } from "octokit"

const OWNER = "Guerillapropaganda"
const ENGINE_REPO = "donor-map-engine"

function getOctokit(): Octokit {
  const token = process.env.GITHUB_TOKEN
  if (!token) throw new Error("GITHUB_TOKEN not set")
  return new Octokit({ auth: token })
}

// Trigger the enrichment pipeline
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { pipeline = "all", limit = "30" } = body

    const octokit = getOctokit()

    await octokit.rest.actions.createWorkflowDispatch({
      owner: OWNER,
      repo: ENGINE_REPO,
      workflow_id: "api-enrichment.yml",
      ref: "main",
      inputs: {
        pipeline,
        limit: String(limit),
      },
    })

    return NextResponse.json({ success: true, pipeline, limit })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// Get recent workflow runs
export async function GET() {
  try {
    const octokit = getOctokit()

    const { data } = await octokit.rest.actions.listWorkflowRuns({
      owner: OWNER,
      repo: ENGINE_REPO,
      workflow_id: "api-enrichment.yml",
      per_page: 15,
    })

    const runs = data.workflow_runs.map((run) => ({
      id: run.id,
      status: run.status,
      conclusion: run.conclusion,
      createdAt: run.created_at,
      updatedAt: run.updated_at,
      runNumber: run.run_number,
      event: run.event,
      headBranch: run.head_branch,
      url: run.html_url,
      // Extract pipeline and limit from display_title or inputs
      title: run.display_title || run.name || "Enrichment Run",
    }))

    return NextResponse.json({ runs })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
