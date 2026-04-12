import { NextResponse } from "next/server"
import { execSync } from "child_process"
import path from "path"

export interface PipelineStatus {
  name: string
  label: string
  lastRun: string | null
  runsLast7d: number
  runsLast30d: number
  totalProfilesLast30d: number
  status: "healthy" | "stale" | "dead"
}

export interface PipelineHealthResponse {
  pipelines: PipelineStatus[]
  summary: {
    total: number
    healthy: number
    stale: number
    dead: number
    healthPct: number
    lastEnrichment: string | null
    totalRunsLast7d: number
  }
}

const PIPELINE_LABELS: Record<string, string> = {
  fec: "FEC Campaign Finance",
  "fec-summary": "FEC Candidate Summary",
  congress: "Congress.gov",
  committee: "Committee Assignments",
  govtrack: "GovTrack",
  lda: "Senate Lobbying",
  lobbyview: "LobbyView",
  "lobbying-contrib": "Lobbying Cross-Ref",
  usaspending: "USASpending",
  "usaspending-awards": "USASpending Awards",
  sam: "SAM.gov",
  "nonprofit-990": "IRS 990",
  "federal-register": "Federal Register",
  fara: "FARA",
  "ofac-sdn": "OFAC Sanctions",
  recall: "CPSC Recalls",
  "nhtsa-recalls": "NHTSA Recalls",
  courtlistener: "Court Cases",
  "sec-edgar": "SEC Filings",
  "sec-litigation": "SEC Enforcement",
  "doj-press": "DOJ Press",
  propublica: "ProPublica",
  opensanctions: "OpenSanctions",
  wikipedia: "Wikipedia",
  fcc: "FCC Broadcasting",
  gleif: "GLEIF Entities",
  "fda-enforcement": "FDA Enforcement",
  "occ-enforcement": "OCC Enforcement",
  "ftc-enforcement": "FTC Enforcement",
  "auto-connect": "Auto-Connect",
}

let cache: { data: PipelineHealthResponse; ts: number } | null = null
const CACHE_TTL = 5 * 60 * 1000 // 5 min

export async function GET() {
  try {
    if (cache && Date.now() - cache.ts < CACHE_TTL) {
      return NextResponse.json(cache.data)
    }

    const repoRoot = path.resolve(process.cwd(), "..")
    const now = new Date()
    const d7 = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const d30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

    // Get last 30 days of enrichment commits
    const log = execSync(
      `git log --author="API Enrichment Bot" --since="${d30.toISOString()}" --format="%ai|%s" -100`,
      { cwd: repoRoot, encoding: "utf-8", timeout: 10000 }
    ).trim()

    // Track per-pipeline activity
    const pipelineRuns: Record<string, { dates: Date[]; profileCounts: number[] }> = {}

    // Initialize all known pipelines
    for (const name of Object.keys(PIPELINE_LABELS)) {
      pipelineRuns[name] = { dates: [], profileCounts: [] }
    }

    let lastEnrichment: string | null = null

    for (const line of log.split("\n").filter(Boolean)) {
      const sepIdx = line.indexOf("|")
      if (sepIdx < 0) continue
      const dateStr = line.slice(0, sepIdx).trim()
      const message = line.slice(sepIdx + 1).trim()
      const commitDate = new Date(dateStr)

      if (!lastEnrichment) lastEnrichment = commitDate.toISOString()

      // Parse pipeline counts: "API enrichment: 114 files (courtlistener:10 doj-press:15 ...)"
      const pipelineSection = message.match(/\((.+)\)/)
      if (pipelineSection) {
        for (const pair of pipelineSection[1].split(" ")) {
          const [name, countStr] = pair.split(":")
          if (!name || !countStr) continue
          const normalizedName = name.toLowerCase()
          if (!pipelineRuns[normalizedName]) {
            pipelineRuns[normalizedName] = { dates: [], profileCounts: [] }
          }
          pipelineRuns[normalizedName].dates.push(commitDate)
          pipelineRuns[normalizedName].profileCounts.push(parseInt(countStr) || 0)
        }
      }
    }

    // Build per-pipeline status
    const pipelines: PipelineStatus[] = []
    for (const [name, data] of Object.entries(pipelineRuns)) {
      const lastRun = data.dates.length > 0
        ? data.dates.reduce((a, b) => (a > b ? a : b)).toISOString()
        : null
      const runsLast7d = data.dates.filter(d => d >= d7).length
      const runsLast30d = data.dates.length
      const totalProfilesLast30d = data.profileCounts.reduce((s, n) => s + n, 0)

      let status: "healthy" | "stale" | "dead" = "dead"
      if (runsLast7d > 0) status = "healthy"
      else if (runsLast30d > 0) status = "stale"

      // Only include pipelines that have run at least once or are in the known set
      if (runsLast30d > 0 || PIPELINE_LABELS[name]) {
        pipelines.push({
          name,
          label: PIPELINE_LABELS[name] || name,
          lastRun,
          runsLast7d,
          runsLast30d,
          totalProfilesLast30d,
          status,
        })
      }
    }

    // Sort: healthy first, then stale, then dead; within each group by last run
    pipelines.sort((a, b) => {
      const order = { healthy: 0, stale: 1, dead: 2 }
      if (order[a.status] !== order[b.status]) return order[a.status] - order[b.status]
      if (a.lastRun && b.lastRun) return b.lastRun.localeCompare(a.lastRun)
      if (a.lastRun) return -1
      if (b.lastRun) return 1
      return a.name.localeCompare(b.name)
    })

    const healthy = pipelines.filter(p => p.status === "healthy").length
    const stale = pipelines.filter(p => p.status === "stale").length
    const dead = pipelines.filter(p => p.status === "dead").length
    const total = pipelines.length
    const healthPct = total > 0 ? Math.round((healthy / total) * 100) : 0
    const totalRunsLast7d = pipelines.reduce((s, p) => s + p.runsLast7d, 0)

    const result: PipelineHealthResponse = {
      pipelines,
      summary: { total, healthy, stale, dead, healthPct, lastEnrichment, totalRunsLast7d },
    }

    cache = { data: result, ts: Date.now() }
    return NextResponse.json(result)
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json({ error: msg, pipelines: [], summary: { total: 0, healthy: 0, stale: 0, dead: 0, healthPct: 0, lastEnrichment: null, totalRunsLast7d: 0 } }, { status: 500 })
  }
}
