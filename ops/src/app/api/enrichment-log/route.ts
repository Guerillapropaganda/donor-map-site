import { NextResponse } from "next/server"
import fs from "fs"
import path from "path"

interface LogEntry {
  date: string
  pipeline: string
  profileCount: number
  profiles: { name: string; detail: string; conflict: boolean }[]
  conflictCount: number
}

interface LogBatch {
  date: string
  entries: LogEntry[]
  totalProfiles: number
  totalConflicts: number
}

/**
 * Parses content/Vault Maintenance/Auto-Enrichment Log.md into structured
 * per-pipeline, per-profile results. Returns the most recent N batches
 * (grouped by timestamp within 15 min windows).
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const limit = Math.min(parseInt(searchParams.get("limit") || "5"), 20)

  try {
    const repoRoot = path.resolve(process.cwd(), "..")
    const logPath = path.join(repoRoot, "content", "Vault Maintenance", "Auto-Enrichment Log.md")

    if (!fs.existsSync(logPath)) {
      return NextResponse.json({ batches: [], error: "Enrichment log not found" })
    }

    const text = fs.readFileSync(logPath, "utf-8")

    // Parse sections: each starts with ## DATE — N profiles
    const sectionRegex = /^## (\d{4}-\d{2}-\d{2} \d{2}:\d{2}) UTC — (\d+) profiles?$/gm
    const sections: { date: string; count: number; startIdx: number }[] = []
    let match: RegExpExecArray | null
    while ((match = sectionRegex.exec(text)) !== null) {
      sections.push({ date: match[1], count: parseInt(match[2]), startIdx: match.index + match[0].length })
    }

    // Parse each section
    const entries: LogEntry[] = []
    for (let i = 0; i < sections.length; i++) {
      const sec = sections[i]
      const endIdx = i + 1 < sections.length ? sections[i + 1].startIdx - 100 : text.length
      const body = text.slice(sec.startIdx, endIdx)

      // Extract pipeline name: **PipelineName — N profiles:**
      const pipelineMatch = body.match(/\*\*(.+?) — \d+ profiles?:\*\*/)
      const pipeline = pipelineMatch ? pipelineMatch[1] : "unknown"

      // Extract profiles: lines starting with "- "
      const profiles: { name: string; detail: string; conflict: boolean }[] = []
      for (const line of body.split("\n")) {
        const profileMatch = line.match(/^- (.+)$/)
        if (!profileMatch) continue
        const raw = profileMatch[1]
        const conflict = raw.includes("CONFLICT")
        // Split on first " — " to separate name from detail
        const dashIdx = raw.indexOf(" — ")
        const name = dashIdx > -1 ? raw.slice(0, dashIdx).trim() : raw.replace(/⚠️ CONFLICT/, "").trim()
        const detail = dashIdx > -1 ? raw.slice(dashIdx + 3).replace(/⚠️ CONFLICT/, "").trim() : ""
        profiles.push({ name, detail, conflict })
      }

      // Extract conflict count
      const conflictMatch = body.match(/\*\*Conflicts detected: (\d+)\*\*/)
      const conflictCount = conflictMatch ? parseInt(conflictMatch[1]) : 0

      entries.push({
        date: sec.date,
        pipeline,
        profileCount: sec.count,
        profiles,
        conflictCount,
      })
    }

    // Group into batches: entries within 15 min of each other belong to the same run
    const batches: LogBatch[] = []
    let currentBatch: LogEntry[] = []
    let batchDate = ""

    for (const entry of entries) {
      if (!batchDate) {
        batchDate = entry.date
        currentBatch = [entry]
        continue
      }

      const prevTime = new Date(batchDate.replace(" ", "T") + ":00Z").getTime()
      const curTime = new Date(entry.date.replace(" ", "T") + ":00Z").getTime()

      if (Math.abs(prevTime - curTime) <= 15 * 60 * 1000) {
        currentBatch.push(entry)
      } else {
        batches.push({
          date: batchDate + " UTC",
          entries: currentBatch,
          totalProfiles: currentBatch.reduce((s, e) => s + e.profileCount, 0),
          totalConflicts: currentBatch.reduce((s, e) => s + e.conflictCount, 0),
        })
        batchDate = entry.date
        currentBatch = [entry]
      }
    }
    if (currentBatch.length > 0) {
      batches.push({
        date: batchDate + " UTC",
        entries: currentBatch,
        totalProfiles: currentBatch.reduce((s, e) => s + e.profileCount, 0),
        totalConflicts: currentBatch.reduce((s, e) => s + e.conflictCount, 0),
      })
    }

    return NextResponse.json({ batches: batches.slice(0, limit) })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
