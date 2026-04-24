import { NextResponse } from "next/server"
import fs from "fs"
import path from "path"

const DATA_DIR = path.join(process.cwd(), "data")
const CONTENT_DIR = path.join(process.cwd(), "..", "content")

function readJSON(file: string): Record<string, unknown> {
  try { return JSON.parse(fs.readFileSync(file, "utf-8")) } catch { return {} }
}

// Lightweight status endpoint for sidebar badges — polls every 60s.
// "alerts.critical" is now sourced from the attention-queue's blocking
// bucket (the /alerts page was retired 2026-04-24 in favor of /attention,
// which has the same producers writing through the unified queue). The
// field name is preserved for backwards-compat with the Sidebar consumer.
export async function GET() {
  try {
    let alertsCritical = 0
    let alertsWarning = 0
    try {
      const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3333"
      const queueRes = await fetch(`${baseUrl}/api/attention-queue`, { cache: "no-store" })
      if (queueRes.ok) {
        const queueData = (await queueRes.json()) as {
          buckets?: { blocking?: unknown[]; deciding?: unknown[] }
        }
        alertsCritical = queueData.buckets?.blocking?.length ?? 0
        alertsWarning = queueData.buckets?.deciding?.length ?? 0
      }
    } catch { /* attention queue unreachable — leave counts at 0 */ }

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

    // Tips: new count
    let tipsNew = 0
    const tipsDir = path.join(CONTENT_DIR, "Admin Notes", "Tips")
    if (fs.existsSync(tipsDir)) {
      const tipFiles = fs.readdirSync(tipsDir).filter(f => f.endsWith(".md"))
      for (const tf of tipFiles) {
        try {
          const content = fs.readFileSync(path.join(tipsDir, tf), "utf-8")
          if (content.includes("status: new")) tipsNew++
        } catch { /* skip */ }
      }
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
      alerts: { critical: alertsCritical, warning: alertsWarning },
      notes: { open: notesOpen },
      suggestions: { highPending: suggestionsHigh },
      tips: { new: tipsNew },
      pipeline: { status: pipelineStatus, lastRun: pipelineLastRun },
    })
  } catch (error: unknown) {
    return NextResponse.json({ alerts: { critical: 0 }, notes: { open: 0 }, suggestions: { highPending: 0 }, pipeline: { status: "unknown" } })
  }
}

// walkMarkdown was used by the old heuristic alert-counting path which has
// been replaced by delegation to /api/alerts. Deleted to keep this endpoint
// focused on its actual job (sidebar badges).
