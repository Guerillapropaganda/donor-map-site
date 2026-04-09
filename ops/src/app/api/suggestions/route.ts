import { NextResponse } from "next/server"
import fs from "fs"
import path from "path"
import matter from "gray-matter"
import { readFile, writeAndPush } from "@/lib/local-write"

const DATA_DIR = path.join(process.cwd(), "data")
const SUGGESTIONS_FILE = path.join(DATA_DIR, "discovery-suggestions.json")
const ACTIONS_FILE = path.join(DATA_DIR, "suggestion-actions.json")
const NOTES_FILE = path.join(DATA_DIR, "suggestion-notes.json")
const INVESTIGATE_FILE = path.join(DATA_DIR, "investigate-queue.json")

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true })
}

function readJSON(file: string): Record<string, unknown> {
  try { return JSON.parse(fs.readFileSync(file, "utf-8")) } catch { return {} }
}

function writeJSON(file: string, data: unknown) {
  ensureDataDir()
  fs.writeFileSync(file, JSON.stringify(data, null, 2), "utf-8")
}

interface SuggestionAction {
  action: string
  at: string
  reason?: string
  strategies?: string[]
  sourcePath?: string
  targetTitle?: string
  relationshipType?: string
}

interface SuggestionNote {
  note: string
  updatedAt: string
}

interface Suggestion {
  id: string
  source: string
  sourcePath: string
  target: string
  targetPath: string
  type: string
  confidence: string
  strategies: string[]
  strategyCount: number
  evidence: string
  reasoning: string
  autoCreate: boolean
  discoveredAt: string
  transparency?: { score: number; tier: string; tierColor: string; factors: { factor: string; impact: number; detail: string }[] }
  partisan?: { flow: number; label: string; isCrossParty: boolean; sourceLabel: string; targetLabel: string }
  dollars?: { amount: number; display: string | null; tier: string }
  // Merged at query time
  actionState?: string
  actionAt?: string
  actionReason?: string
  note?: string
  investigate?: boolean
  investigateAt?: string
}

// GET — load, filter, paginate suggestions
export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const confidence = url.searchParams.get("confidence") || "all"
    const strategy = url.searchParams.get("strategy") || "all"
    const status = url.searchParams.get("status") || "pending"
    const type = url.searchParams.get("type") || "all"
    const partisan = url.searchParams.get("partisan") || "all"
    const sort = url.searchParams.get("sort") || "confidence"
    const search = url.searchParams.get("search") || ""
    const limit = parseInt(url.searchParams.get("limit") || "30")
    const offset = parseInt(url.searchParams.get("offset") || "0")

    if (!fs.existsSync(SUGGESTIONS_FILE)) {
      return NextResponse.json({ discovered: [], stats: { total: 0, high: 0, medium: 0, low: 0 }, newProfiles: [], scannedAt: null, totalFiltered: 0, hasMore: false })
    }

    const raw = JSON.parse(fs.readFileSync(SUGGESTIONS_FILE, "utf-8"))
    const actions = readJSON(ACTIONS_FILE) as Record<string, SuggestionAction>
    const notes = readJSON(NOTES_FILE) as Record<string, SuggestionNote>
    const investigate = readJSON(INVESTIGATE_FILE) as Record<string, unknown>

    let discovered: Suggestion[] = (raw.discovered || []).map((s: Suggestion) => {
      const act = actions[s.id]
      const note = notes[s.id]
      const inv = investigate[s.id] as { flaggedAt: string } | undefined
      return {
        ...s,
        actionState: act?.action,
        actionAt: act?.at,
        actionReason: act?.reason,
        note: note?.note,
        investigate: !!inv,
        investigateAt: inv?.flaggedAt,
      }
    })

    // Filter by search term (source or target name)
    if (search) {
      const q = search.toLowerCase()
      discovered = discovered.filter(s => s.source.toLowerCase().includes(q) || s.target.toLowerCase().includes(q))
    }

    // Filter by confidence
    if (confidence !== "all") {
      discovered = discovered.filter(s => s.confidence === confidence)
    }

    // Filter by strategy
    if (strategy !== "all") {
      discovered = discovered.filter(s => s.strategies.includes(strategy))
    }

    // Filter by status
    if (status === "pending") {
      discovered = discovered.filter(s => !s.actionState || s.actionState === "pending")
    } else if (status === "acted") {
      discovered = discovered.filter(s => s.actionState && s.actionState !== "pending")
    }
    // "all" shows everything

    // Filter by connection type
    if (type !== "all") {
      const typeMap: Record<string, string[]> = {
        "related": ["related"],
        "funded-by": ["donors", "funded-by"],
        "opposes": ["opposes"],
        "stories": ["stories"],
      }
      const allowed = typeMap[type] || [type]
      discovered = discovered.filter(s => allowed.includes(s.type))
    }

    // Filter by partisan
    if (partisan !== "all") {
      discovered = discovered.filter(s => {
        if (!s.partisan) return partisan === "neutral"
        const label = s.partisan.label.toLowerCase()
        if (partisan === "dem") return label.includes("democrat")
        if (partisan === "gop") return label.includes("republican")
        if (partisan === "cross") return s.partisan.isCrossParty
        if (partisan === "neutral") return label.includes("neutral") || label.includes("bipartisan")
        return true
      })
    }

    const totalFiltered = discovered.length

    // Sort
    const CONFIDENCE_ORDER: Record<string, number> = { high: 0, medium: 1, low: 2 }
    switch (sort) {
      case "confidence":
        discovered.sort((a, b) => (CONFIDENCE_ORDER[a.confidence] ?? 3) - (CONFIDENCE_ORDER[b.confidence] ?? 3))
        break
      case "least-transparent":
        discovered.sort((a, b) => (a.transparency?.score ?? 50) - (b.transparency?.score ?? 50))
        break
      case "most-transparent":
        discovered.sort((a, b) => (b.transparency?.score ?? 50) - (a.transparency?.score ?? 50))
        break
      case "highest-dollar":
        discovered.sort((a, b) => (b.dollars?.amount ?? 0) - (a.dollars?.amount ?? 0))
        break
      case "lowest-dollar":
        discovered.sort((a, b) => (a.dollars?.amount ?? 0) - (b.dollars?.amount ?? 0))
        break
      case "most-dem":
        discovered.sort((a, b) => (a.partisan?.flow ?? 0) - (b.partisan?.flow ?? 0))
        break
      case "most-gop":
        discovered.sort((a, b) => (b.partisan?.flow ?? 0) - (a.partisan?.flow ?? 0))
        break
    }

    // Paginate
    const page = discovered.slice(offset, offset + limit)

    // Compute action stats from full actions file
    const actionValues = Object.values(actions)
    const actionStats = {
      approved: actionValues.filter(a => a.action === "approve").length,
      rejected: actionValues.filter(a => a.action === "reject").length,
      deferred: actionValues.filter(a => a.action === "defer").length,
    }

    return NextResponse.json({
      discovered: page,
      stats: raw.stats || { total: 0, high: 0, medium: 0, low: 0 },
      actionStats,
      newProfiles: offset === 0 ? (raw.newProfiles || []) : [],
      scannedAt: raw.scannedAt,
      totalFiltered,
      hasMore: offset + limit < totalFiltered,
    })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

// Shared logic for adding a connection to a profile file
function addConnectionToVault(sourcePath: string, targetTitle: string, relationshipType: string): { success: boolean; error?: string } {
  try {
    const content = readFile(sourcePath)
    const { data: fm, content: bodyContent } = matter(content)

    const wikilink = `[[${targetTitle}]]`

    // Check if connection already exists
    const fmValue = fm[relationshipType] as string | undefined
    if (fmValue && fmValue.includes(targetTitle)) {
      return { success: true } // already exists, no-op
    }
    const bodyRegex = new RegExp(`^${relationshipType}:.*${targetTitle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`, "m")
    if (bodyRegex.test(bodyContent)) {
      return { success: true } // already exists in body
    }

    // Add to body field if it exists there, otherwise frontmatter
    const fieldRegex = new RegExp(`^(${relationshipType}:\\s*)(.+)$`, "m")
    let updatedBody = bodyContent
    if (fieldRegex.test(bodyContent)) {
      updatedBody = bodyContent.replace(fieldRegex, `$1$2 \u00b7 ${wikilink}`)
    } else {
      fm[relationshipType] = fmValue ? `${fmValue} \u00b7 ${wikilink}` : wikilink
    }

    fm["last-updated"] = new Date().toISOString().split("T")[0]
    const updated = matter.stringify(updatedBody, fm)
    writeAndPush(sourcePath, updated, `Add ${relationshipType}: ${fm.title || sourcePath} \u2192 ${targetTitle}`)

    return { success: true }
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error"
    return { success: false, error: msg }
  }
}

// Shared logic for removing a connection from a profile file
function removeConnectionFromVault(sourcePath: string, targetTitle: string, relationshipType: string): { success: boolean; error?: string } {
  try {
    const content = readFile(sourcePath)
    const { data: fm, content: bodyContent } = matter(content)

    let found = false
    let updatedBody = bodyContent

    // Try frontmatter first
    const fmValue = fm[relationshipType] as string | undefined
    if (fmValue && fmValue.includes(targetTitle)) {
      const links = fmValue.split("\u00b7").map((s: string) => s.trim()).filter((s: string) => !s.includes(targetTitle))
      if (links.length === 0) delete fm[relationshipType]
      else fm[relationshipType] = links.join(" \u00b7 ")
      found = true
    }

    // Try body text
    if (!found) {
      const regex = new RegExp(`^(${relationshipType}:\\s*)(.+)$`, "m")
      const match = bodyContent.match(regex)
      if (match && match[2].includes(targetTitle)) {
        const links = match[2].split("\u00b7").map((s: string) => s.trim()).filter((s: string) => !s.includes(targetTitle))
        if (links.length === 0) {
          updatedBody = bodyContent.replace(regex, "").replace(/\n{3,}/g, "\n\n")
        } else {
          updatedBody = bodyContent.replace(regex, `${match[1]}${links.join(" \u00b7 ")}`)
        }
        found = true
      }
    }

    if (!found) return { success: true } // nothing to remove

    fm["last-updated"] = new Date().toISOString().split("T")[0]
    const updated = matter.stringify(updatedBody, fm)
    writeAndPush(sourcePath, updated, `Undo ${relationshipType}: ${fm.title || sourcePath} \u2715 ${targetTitle}`)

    return { success: true }
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error"
    return { success: false, error: msg }
  }
}

interface InvestigateItem {
  flaggedAt: string
  priority: "normal" | "urgent"
  note?: string
  source: string
  target: string
  type: string
  reasoning?: string
}

// Add to investigate queue (called by both approve and manual flag)
function addToInvestigateQueue(id: string, suggestion: Suggestion, priority: "normal" | "urgent") {
  const queue = readJSON(INVESTIGATE_FILE) as Record<string, InvestigateItem>
  const notes = readJSON(NOTES_FILE) as Record<string, SuggestionNote>
  const existing = queue[id]

  // Manual flag always upgrades to urgent; never downgrade urgent to normal
  if (existing && existing.priority === "urgent" && priority === "normal") {
    return // already urgent, don't downgrade
  }

  queue[id] = {
    flaggedAt: existing?.flaggedAt || new Date().toISOString(),
    priority,
    note: notes[id]?.note,
    source: suggestion.source,
    target: suggestion.target,
    type: suggestion.type,
    reasoning: suggestion.reasoning,
  }
  writeJSON(INVESTIGATE_FILE, queue)
  writeInvestigateAdminNote(queue)
}

// Write investigate queue to Admin Notes for Research Claude
function writeInvestigateAdminNote(queue: Record<string, InvestigateItem>) {
  const items = Object.entries(queue)
  if (items.length === 0) {
    // Clean up the admin note if queue is empty
    const adminNotesDir = path.join(process.cwd(), "..", "content", "Admin Notes")
    const notePath = path.join(adminNotesDir, "investigate-queue.md")
    if (fs.existsSync(notePath)) fs.unlinkSync(notePath)
    return
  }

  // Sort: urgent first, then by date
  items.sort((a, b) => {
    if (a[1].priority !== b[1].priority) return a[1].priority === "urgent" ? -1 : 1
    return new Date(b[1].flaggedAt).getTime() - new Date(a[1].flaggedAt).getTime()
  })

  const urgentCount = items.filter(([, v]) => v.priority === "urgent").length
  const normalCount = items.length - urgentCount

  const lines = [
    "---",
    "title: Investigation Queue",
    "type: admin-note",
    "note-type: research",
    `priority: ${urgentCount > 0 ? "urgent" : "normal"}`,
    "status: open",
    `last-updated: ${new Date().toISOString().split("T")[0]}`,
    "---",
    "",
    "# Investigation Queue",
    "",
    `${items.length} relationships queued for Research Claude.${urgentCount > 0 ? ` **${urgentCount} PRIORITY** (David flagged).` : ""} ${normalCount > 0 ? `${normalCount} standard (auto-queued from approvals).` : ""}`,
    "",
  ]

  if (urgentCount > 0) {
    lines.push("## PRIORITY (David flagged)")
    lines.push("")
    for (const [id, item] of items.filter(([, v]) => v.priority === "urgent")) {
      lines.push(`### ${item.source} \u2192 ${item.target}`)
      lines.push(`- **Type**: ${item.type}`)
      lines.push(`- **Flagged**: ${new Date(item.flaggedAt).toLocaleDateString()}`)
      if (item.note) lines.push(`- **David's note**: ${item.note}`)
      if (item.reasoning) lines.push(`- **Scanner reasoning**: ${item.reasoning}`)
      lines.push(`- **ID**: \`${id}\``)
      lines.push("")
    }
  }

  if (normalCount > 0) {
    lines.push("## Standard (approved relationships)")
    lines.push("")
    for (const [id, item] of items.filter(([, v]) => v.priority === "normal")) {
      lines.push(`### ${item.source} \u2192 ${item.target}`)
      lines.push(`- **Type**: ${item.type}`)
      lines.push(`- **Flagged**: ${new Date(item.flaggedAt).toLocaleDateString()}`)
      if (item.note) lines.push(`- **David's note**: ${item.note}`)
      lines.push(`- **ID**: \`${id}\``)
      lines.push("")
    }
  }

  const adminNotesDir = path.join(process.cwd(), "..", "content", "Admin Notes")
  if (!fs.existsSync(adminNotesDir)) fs.mkdirSync(adminNotesDir, { recursive: true })
  fs.writeFileSync(path.join(adminNotesDir, "investigate-queue.md"), lines.join("\n"), "utf-8")
}

// POST — handle actions (approve, reject, defer, investigate, undo, note)
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { id, action, reason, note, source, target, type: overrideType, reasoning } = body as { id: string; action: string; reason?: string; note?: string; source?: string; target?: string; type?: string; reasoning?: string }

    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 })

    // Handle note-saving
    if (action === "note") {
      const notes = readJSON(NOTES_FILE) as Record<string, SuggestionNote>
      if (note) {
        notes[id] = { note, updatedAt: new Date().toISOString() }
      } else {
        delete notes[id]
      }
      writeJSON(NOTES_FILE, notes)
      return NextResponse.json({ success: true })
    }

    // Load suggestions to find this one
    const raw = fs.existsSync(SUGGESTIONS_FILE) ? JSON.parse(fs.readFileSync(SUGGESTIONS_FILE, "utf-8")) : { discovered: [] }
    const suggestion = (raw.discovered || []).find((s: Suggestion) => s.id === id)

    if (!suggestion && action !== "undo" && action !== "investigate" && action !== "uninvestigate") {
      return NextResponse.json({ error: "Suggestion not found" }, { status: 404 })
    }

    const actions = readJSON(ACTIONS_FILE) as Record<string, SuggestionAction>

    // Handle investigate toggle (manual = urgent priority)
    if (action === "investigate") {
      // Support direct source/target/type for new-profile flags
      const item = suggestion || { source: source || id, target: target || id, type: overrideType || "unknown", reasoning: reasoning || "" } as Suggestion
      addToInvestigateQueue(id, item, "urgent")
      return NextResponse.json({ success: true })
    }

    // Handle un-investigate
    if (action === "uninvestigate") {
      const queue = readJSON(INVESTIGATE_FILE) as Record<string, InvestigateItem>
      delete queue[id]
      writeJSON(INVESTIGATE_FILE, queue)
      writeInvestigateAdminNote(queue)
      return NextResponse.json({ success: true })
    }

    // Handle undo
    if (action === "undo") {
      const prev = actions[id]
      if (!prev) return NextResponse.json({ error: "No action to undo" }, { status: 404 })

      // If it was approved and wrote to vault, reverse it
      if (prev.action === "approve" && prev.sourcePath && prev.targetTitle && prev.relationshipType) {
        const result = removeConnectionFromVault(prev.sourcePath, prev.targetTitle, prev.relationshipType)
        if (!result.success) {
          return NextResponse.json({ error: `Undo vault write failed: ${result.error}` }, { status: 500 })
        }
      }

      delete actions[id]
      writeJSON(ACTIONS_FILE, actions)
      return NextResponse.json({ success: true, undone: prev.action })
    }

    // Handle approve — write to vault
    if (action === "approve") {
      // If source has no vault file, write to the target profile instead
      const hasSource = suggestion.sourcePath && suggestion.sourcePath.length > 0
      const hasTarget = suggestion.targetPath && suggestion.targetPath.length > 0
      const writePath = hasSource ? `content/${suggestion.sourcePath}` : hasTarget ? `content/${suggestion.targetPath}` : null
      const writeTarget = hasSource ? suggestion.target : suggestion.source

      if (!writePath) {
        // Neither source nor target has a vault file — record the action but skip vault write
        actions[id] = {
          action: "approve",
          at: new Date().toISOString(),
          strategies: suggestion.strategies,
        }
        writeJSON(ACTIONS_FILE, actions)
        return NextResponse.json({ success: true, written: false, reason: "No vault file for source or target" })
      }

      const result = addConnectionToVault(writePath, writeTarget, suggestion.type)
      if (!result.success) {
        return NextResponse.json({ error: `Vault write failed: ${result.error}` }, { status: 500 })
      }

      actions[id] = {
        action: "approve",
        at: new Date().toISOString(),
        strategies: suggestion.strategies,
        sourcePath: writePath,
        targetTitle: writeTarget,
        relationshipType: suggestion.type,
      }
      writeJSON(ACTIONS_FILE, actions)

      // Auto-queue for Research Claude at normal priority
      addToInvestigateQueue(id, suggestion, "normal")

      // Invalidate connections cache
      ;(globalThis as Record<string, unknown>).__connectionsInvalidated = Date.now()

      return NextResponse.json({ success: true, written: true })
    }

    // Handle reject
    if (action === "reject") {
      if (!reason) return NextResponse.json({ error: "Rejection reason required" }, { status: 400 })
      actions[id] = {
        action: "reject",
        at: new Date().toISOString(),
        reason,
        strategies: suggestion?.strategies,
      }
      writeJSON(ACTIONS_FILE, actions)
      return NextResponse.json({ success: true })
    }

    // Handle defer
    if (action === "defer") {
      actions[id] = {
        action: "defer",
        at: new Date().toISOString(),
        strategies: suggestion?.strategies,
      }
      writeJSON(ACTIONS_FILE, actions)
      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
