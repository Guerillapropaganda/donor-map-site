import { NextResponse } from "next/server"
import fs from "fs"
import path from "path"

const DATA_DIR = path.join(process.cwd(), "data")
const CONTENT_DIR = path.join(process.cwd(), "..", "content")

function readJSON(file: string): Record<string, unknown> {
  try { return JSON.parse(fs.readFileSync(file, "utf-8")) } catch { return {} }
}

// Lightweight status endpoint for sidebar badges — polls every 60s.
// Alert counts are delegated to /api/alerts so the dashboard card matches
// exactly what the /alerts page lists. Anything else would be a lie —
// previously this endpoint computed a heuristic count that diverged from
// the real alert list.
export async function GET() {
  try {
    // Alert summary: delegate to /api/alerts (which caches internally for 10 min)
    let alertsCritical = 0
    let alertsWarning = 0
    try {
      const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3333"
      const alertsRes = await fetch(`${baseUrl}/api/alerts`, { cache: "no-store" })
      if (alertsRes.ok) {
        const alertsData = (await alertsRes.json()) as {
          summary?: { critical?: number; warning?: number }
        }
        alertsCritical = alertsData.summary?.critical ?? 0
        alertsWarning = alertsData.summary?.warning ?? 0
      }
    } catch { /* alerts endpoint unreachable — leave counts at 0 */ }

    // Notes: open count
    let notesOpen = 0
    const notesDir = path.join(CONTENT_DIR, "Admin Notes")
    if (fs.existsSync(notesDir)) {
      const noteFiles = fs.readdirSync(notesDir).filter(f => f.endsWith(".md"))
      for (const nf of noteFiles) {
        try {
          const content = fs.readFileSync(path.join(notesDir, nf), "utf-8")
          if (content.includes("status: open")) notesOpen++
        } catch { /* skip */ }
      }
    }

    // Suggestions: pending high-confidence count
    let suggestionsHigh = 0
    const suggestionsFile = path.join(DATA_DIR, "discovery-suggestions.json")
    const actionsFile = path.join(DATA_DIR, "suggestion-actions.json")
    if (fs.existsSync(suggestionsFile)) {
      try {
        const raw = JSON.parse(fs.readFileSync(suggestionsFile, "utf-8"))
        const actions = fs.existsSync(actionsFile) ? JSON.parse(fs.readFileSync(actionsFile, "utf-8")) : {}
        suggestionsHigh = (raw.discovered || []).filter((s: { id: string; confidence: string }) =>
          s.confidence === "high" && !actions[s.id]
        ).length
      } catch { /* skip */ }
    }

    // Pipeline: last run status
    let pipelineStatus = "unknown"
    let pipelineLastRun = null
    try {
      const { execSync } = require("child_process")
      const repoRoot = path.resolve(process.cwd(), "..")
      const lastCommit = execSync('git log --oneline -1 --format="%s|%ai"', { cwd: repoRoot, encoding: "utf-8", timeout: 5000 }).trim()
      const [msg, date] = lastCommit.split("|")
      pipelineLastRun = date
      pipelineStatus = msg.toLowerCase().includes("enrichment") || msg.toLowerCase().includes("pipeline") ? "recent" : "idle"
    } catch { /* skip */ }

    return NextResponse.json({
      alerts: { critical: Math.min(alertsCritical, 99), warning: alertsWarning },
      notes: { open: notesOpen },
      suggestions: { highPending: suggestionsHigh },
      pipeline: { status: pipelineStatus, lastRun: pipelineLastRun },
    })
  } catch (error: unknown) {
    return NextResponse.json({ alerts: { critical: 0 }, notes: { open: 0 }, suggestions: { highPending: 0 }, pipeline: { status: "unknown" } })
  }
}

// walkMarkdown was used by the old heuristic alert-counting path which has
// been replaced by delegation to /api/alerts. Deleted to keep this endpoint
// focused on its actual job (sidebar badges).
