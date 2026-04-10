import { NextResponse } from "next/server"
import fs from "fs"
import path from "path"

const DATA_DIR = path.join(process.cwd(), "data")
const CONTENT_DIR = path.join(process.cwd(), "..", "content")

function readJSON(file: string): Record<string, unknown> {
  try { return JSON.parse(fs.readFileSync(file, "utf-8")) } catch { return {} }
}

// Lightweight status endpoint for sidebar badges — polls every 60s
export async function GET() {
  try {
    // Alert counts (scan for critical issues)
    let alertsCritical = 0
    let alertsWarning = 0
    try {
      // Quick heuristic: count profiles missing key frontmatter
      const contentFiles = walkMarkdown(CONTENT_DIR)
      for (const f of contentFiles) {
        try {
          const content = fs.readFileSync(f, "utf-8").replace(/\0/g, "")
          const fmMatch = content.match(/^---\n([\s\S]*?)\n---/)
          if (!fmMatch) continue
          const fm = fmMatch[1]
          if (fm.includes("type: politician") || fm.includes("type: donor") || fm.includes("type: corporation")) {
            if (!fm.includes("content-readiness:")) alertsCritical++
            else if (fm.includes("content-readiness: raw")) alertsWarning++
          }
        } catch { /* skip binary/corrupt */ }
      }
    } catch { /* skip */ }

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

function walkMarkdown(dir: string): string[] {
  const results: string[] = []
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true })
    for (const e of entries) {
      const full = path.join(dir, e.name)
      if (e.isDirectory() && !e.name.startsWith(".") && e.name !== "node_modules") {
        results.push(...walkMarkdown(full))
      } else if (e.isFile() && e.name.endsWith(".md")) {
        results.push(full)
      }
    }
  } catch { /* skip */ }
  return results
}
