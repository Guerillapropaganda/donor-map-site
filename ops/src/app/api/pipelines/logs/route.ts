import { NextResponse } from "next/server"
import { Octokit } from "octokit"

const OWNER = "Guerillapropaganda"
const ENGINE_REPO = "donor-map-engine"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const runId = searchParams.get("runId")

  if (!runId) {
    return NextResponse.json({ error: "runId required" }, { status: 400 })
  }

  try {
    const token = process.env.GITHUB_TOKEN
    if (!token) throw new Error("GITHUB_TOKEN not set")
    const octokit = new Octokit({ auth: token })

    // Get the jobs for this run
    const { data: jobsData } = await octokit.rest.actions.listJobsForWorkflowRun({
      owner: OWNER,
      repo: ENGINE_REPO,
      run_id: parseInt(runId),
    })

    const job = jobsData.jobs[0]
    if (!job) return NextResponse.json({ error: "No jobs found" }, { status: 404 })

    // Download logs
    const { data: logs } = await octokit.rest.actions.downloadJobLogsForWorkflowRun({
      owner: OWNER,
      repo: ENGINE_REPO,
      job_id: job.id,
    })

    const logText = typeof logs === "string" ? logs : String(logs)

    // Parse into pipeline summaries
    const summaries = parsePipelineLogs(logText)

    return NextResponse.json({
      runId,
      jobId: job.id,
      status: job.status,
      conclusion: job.conclusion,
      summaries,
    })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

interface PipelineSummary {
  name: string
  found: number
  notFound: number
  written: number
  errors: number
  details: string[]
}

function parsePipelineLogs(logs: string): PipelineSummary[] {
  const summaries: PipelineSummary[] = []
  const lines = logs.split("\n")

  let currentPipeline: string | null = null
  let currentDetails: string[] = []
  let currentFound = 0
  let currentNotFound = 0
  let currentWritten = 0
  let currentErrors = 0

  for (const raw of lines) {
    // Strip timestamp prefix
    const line = raw.replace(/^\d{4}-\d{2}-\d{2}T[\d:.]+Z\s*/, "").trim()

    // Detect pipeline headers
    const headerMatch = line.match(/THE DONOR MAP\s*[—–-]\s*(.+?)(?:\s*Pipeline)?$/i)
    if (headerMatch) {
      // Save previous pipeline
      if (currentPipeline) {
        summaries.push({
          name: currentPipeline,
          found: currentFound,
          notFound: currentNotFound,
          written: currentWritten,
          errors: currentErrors,
          details: currentDetails,
        })
      }
      currentPipeline = headerMatch[1].trim()
      currentDetails = []
      currentFound = 0
      currentNotFound = 0
      currentWritten = 0
      currentErrors = 0
      continue
    }

    if (!currentPipeline) continue

    // Parse stats
    const foundMatch = line.match(/Found:\s*(\d+)/i)
    if (foundMatch) currentFound = parseInt(foundMatch[1])

    const notFoundMatch = line.match(/Not found:\s*(\d+)/i)
    if (notFoundMatch) currentNotFound += parseInt(notFoundMatch[1])

    const writtenMatch = line.match(/Written:\s*(\d+)/i)
    if (writtenMatch) currentWritten = parseInt(writtenMatch[1])

    const errorsMatch = line.match(/Errors:\s*(\d+)/i)
    if (errorsMatch) currentErrors = parseInt(errorsMatch[1])

    // Capture individual profile results
    if (line.includes("found") || line.includes("not found") || line.includes("Written") || line.includes("error")) {
      if (line.length < 200 && !line.includes("═") && !line.includes("─")) {
        currentDetails.push(line)
      }
    }
  }

  // Save last pipeline
  if (currentPipeline) {
    summaries.push({
      name: currentPipeline,
      found: currentFound,
      notFound: currentNotFound,
      written: currentWritten,
      errors: currentErrors,
      details: currentDetails,
    })
  }

  return summaries.filter((s) => s.found > 0 || s.notFound > 0 || s.written > 0 || s.errors > 0)
}
