import { NextResponse } from "next/server"
import { execSync } from "child_process"
import fs from "fs"
import path from "path"

const DATA_DIR = path.join(process.cwd(), "data")

interface ActivityItem {
  id: string
  type: "git" | "suggestion" | "pipeline" | "url" | "note"
  actor: string
  action: string
  detail: string
  timestamp: string
  link?: string
}

function getActor(message: string, author: string): string {
  if (author.includes("Claude") || message.includes("Co-Authored-By: Claude")) return "Code Claude"
  if (message.includes("API Enrichment") || message.includes("pipeline")) return "Pipeline"
  if (message.includes("Research Claude")) return "Research Claude"
  return "David"
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const limit = parseInt(url.searchParams.get("limit") || "30")
    const typeFilter = url.searchParams.get("type") || "all"

    const items: ActivityItem[] = []
    const repoRoot = path.resolve(process.cwd(), "..")

    // 1. Git commits (last 20)
    if (typeFilter === "all" || typeFilter === "git") {
      try {
        const log = execSync(
          'git log --oneline -20 --format="%H|%s|%an|%ai"',
          { cwd: repoRoot, encoding: "utf-8", timeout: 10000 }
        ).trim()
        for (const line of log.split("\n").filter(Boolean)) {
          const [hash, message, author, date] = line.split("|")
          if (!hash || !message) continue
          items.push({
            id: `git-${hash.slice(0, 8)}`,
            type: "git",
            actor: getActor(message, author),
            action: message.length > 80 ? message.slice(0, 77) + "..." : message,
            detail: "",
            timestamp: date,
          })
        }
      } catch { /* skip */ }
    }

    // 2. Suggestion actions
    if (typeFilter === "all" || typeFilter === "suggestion") {
      const actionsFile = path.join(DATA_DIR, "suggestion-actions.json")
      if (fs.existsSync(actionsFile)) {
        try {
          const actions = JSON.parse(fs.readFileSync(actionsFile, "utf-8"))
          for (const [id, action] of Object.entries(actions) as [string, { action: string; at: string; reason?: string }][]) {
            const parts = id.split("::")
            const source = parts[0]?.slice(0, 30) || id.slice(0, 30)
            const target = parts[1]?.slice(0, 30) || ""
            items.push({
              id: `sug-${id.slice(0, 20)}`,
              type: "suggestion",
              actor: "David",
              action: `${action.action === "approve" ? "Approved" : action.action === "reject" ? "Rejected" : "Deferred"} relationship`,
              detail: `${source}${target ? ` \u2192 ${target}` : ""}`,
              timestamp: action.at,
              link: "/relationships",
            })
          }
        } catch { /* skip */ }
      }
    }

    // 3. URL triages
    if (typeFilter === "all" || typeFilter === "url") {
      const triageFile = path.join(DATA_DIR, "url-triage.json")
      if (fs.existsSync(triageFile)) {
        try {
          const triage = JSON.parse(fs.readFileSync(triageFile, "utf-8"))
          let urlCount = 0
          let lastDate = ""
          for (const [key, val] of Object.entries(triage) as [string, { status: string; date: string; profile: string }][]) {
            if (urlCount >= 5) break // only show last 5
            if (val.date && val.date > lastDate) lastDate = val.date
            urlCount++
          }
          if (urlCount > 0 && lastDate) {
            items.push({
              id: `url-batch-${lastDate}`,
              type: "url",
              actor: "David",
              action: `Triaged ${Object.keys(triage).length} URLs`,
              detail: "",
              timestamp: lastDate,
              link: "/urls",
            })
          }
        } catch { /* skip */ }
      }
    }

    // Sort by timestamp descending
    items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

    return NextResponse.json({
      items: items.slice(0, limit),
      total: items.length,
    })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
