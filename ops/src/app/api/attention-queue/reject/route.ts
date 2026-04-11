import { NextRequest, NextResponse } from "next/server"
import fs from "fs"
import path from "path"

/**
 * POST /api/attention-queue/reject
 *
 * Marks a specific Attention Queue entry as a false positive. The rejection
 * is recorded in `content/Admin Notes/.false-positive-log.json` keyed by a
 * stable signature `(source|where|what)`, and the entry is removed from the
 * current queue store. On the next producer run, `addEntries()` will filter
 * out any entries with a matching signature, so the rejection is persistent.
 *
 * Request body:
 *   { source: string, where: string, what: string, reason?: string }
 *
 * Response:
 *   { ok: true, removed: boolean }   // 200
 *   { ok: false, error: string }     // 400/500
 */

interface AttentionEntry {
  bucket: "blocking" | "deciding" | "compounding"
  what: string
  why: string
  where: string
  cost_min: number
  leverage: number
  source: string
  created: string
  metadata?: Record<string, unknown>
}

interface FalsePositiveEntry {
  pattern: string
  context: string
  reason: string
  rejectedAt: string
}

function getContentDir(): string {
  const fromOps = path.resolve(process.cwd(), "..", "content")
  if (fs.existsSync(fromOps)) return fromOps
  return path.resolve(process.cwd(), "content")
}

function regenerateReadableQueue(store: Record<string, AttentionEntry[]>, queuePath: string) {
  // Match the exact layout in scripts/lib/attention-queue.cjs → regenerateQueueFile.
  const all: AttentionEntry[] = []
  for (const entries of Object.values(store)) for (const e of entries) all.push(e)
  const bucketRank: Record<string, number> = { blocking: 0, deciding: 1, compounding: 2 }
  all.sort((a, b) => {
    const r = bucketRank[a.bucket] - bucketRank[b.bucket]
    if (r !== 0) return r
    return b.leverage / b.cost_min - a.leverage / a.cost_min
  })
  const blocking = all.filter((e) => e.bucket === "blocking")
  const deciding = all.filter((e) => e.bucket === "deciding")
  const compounding = all.filter((e) => e.bucket === "compounding")
  const today = new Date().toISOString().slice(0, 10)
  const lines: string[] = []
  lines.push("---")
  lines.push('title: "Attention Queue"')
  lines.push("type: admin-note")
  lines.push("note-type: data")
  lines.push("priority: urgent")
  lines.push("status: open")
  lines.push(`last-updated: '${today}'`)
  lines.push("generated-by: scripts/lib/attention-queue.cjs")
  lines.push("---")
  lines.push("")
  lines.push("# Attention Queue")
  lines.push("")
  lines.push(
    `**${blocking.length}** blocking · **${deciding.length}** editorial decisions · **${compounding.length}** background cleanup`
  )
  lines.push("")
  const renderBucket = (title: string, emoji: string, entries: AttentionEntry[]) => {
    lines.push(`## ${emoji} ${title}`)
    lines.push("")
    if (entries.length === 0) {
      lines.push("_Nothing here right now._")
      lines.push("")
      return
    }
    for (const e of entries) {
      const stars = "*".repeat(e.leverage) + "-".repeat(5 - e.leverage)
      lines.push(`### ${e.what}`)
      lines.push("")
      lines.push(e.why)
      lines.push("")
      lines.push(`- **Where:** \`${e.where}\``)
      lines.push(`- **Cost:** ~${e.cost_min} min`)
      lines.push(`- **Leverage:** ${stars}`)
      lines.push(`- **Surfaced by:** \`${e.source}\``)
      lines.push("")
    }
  }
  renderBucket("Blocking", "[!]", blocking)
  renderBucket("Editorial Decisions", "[?]", deciding)
  renderBucket("Background Cleanup", "[~]", compounding)
  fs.writeFileSync(queuePath, lines.join("\n"), "utf-8")
}

function regenerateReadableFpLog(log: Record<string, FalsePositiveEntry[]>, fpReadablePath: string) {
  const today = new Date().toISOString().slice(0, 10)
  const lines: string[] = []
  lines.push("---")
  lines.push('title: "False Positive Log"')
  lines.push("type: admin-note")
  lines.push("note-type: data")
  lines.push("priority: normal")
  lines.push("status: open")
  lines.push(`last-updated: '${today}'`)
  lines.push("generated-by: ops/src/app/api/attention-queue/reject/route.ts")
  lines.push("---")
  lines.push("")
  lines.push("# False Positive Log")
  lines.push("")
  const total = Object.values(log).reduce((n, arr) => n + arr.length, 0)
  lines.push(`**${total}** rejections across **${Object.keys(log).length}** scripts.`)
  lines.push("")
  for (const [source, entries] of Object.entries(log)) {
    lines.push(`## ${source}`)
    lines.push("")
    lines.push(`${entries.length} rejection${entries.length === 1 ? "" : "s"}.`)
    lines.push("")
    const recent = [...entries]
      .sort((a, b) => (b.rejectedAt || "").localeCompare(a.rejectedAt || ""))
      .slice(0, 20)
    for (const e of recent) {
      const date = (e.rejectedAt || "").slice(0, 10)
      lines.push(`- **${e.pattern}** _(${date})_`)
      if (e.reason) lines.push(`  - Reason: ${e.reason}`)
      if (e.context) lines.push(`  - Context: ${e.context.slice(0, 150)}`)
    }
    lines.push("")
  }
  if (total === 0) lines.push("_No rejections recorded yet._")
  fs.writeFileSync(fpReadablePath, lines.join("\n"), "utf-8")
}

export async function POST(req: NextRequest) {
  let body: { source?: string; where?: string; what?: string; reason?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ ok: false, error: "invalid JSON body" }, { status: 400 })
  }
  const { source, where, what, reason } = body
  if (!source || !where || !what) {
    return NextResponse.json(
      { ok: false, error: "source, where, and what are required" },
      { status: 400 }
    )
  }

  const contentDir = getContentDir()
  const storePath = path.join(contentDir, "Admin Notes", ".attention-queue-store.json")
  const queuePath = path.join(contentDir, "Admin Notes", "Attention Queue.md")
  const fpLogPath = path.join(contentDir, "Admin Notes", ".false-positive-log.json")
  const fpReadablePath = path.join(contentDir, "Admin Notes", "False Positive Log.md")

  // 1. Load and modify the store
  let store: Record<string, AttentionEntry[]> = {}
  if (fs.existsSync(storePath)) {
    try {
      store = JSON.parse(fs.readFileSync(storePath, "utf-8"))
    } catch {
      return NextResponse.json(
        { ok: false, error: "could not parse attention queue store" },
        { status: 500 }
      )
    }
  }
  const entries = store[source] || []
  const idx = entries.findIndex((e) => e.where === where && e.what === what)
  if (idx === -1) {
    return NextResponse.json({ ok: true, removed: false })
  }
  const removed = entries[idx]
  entries.splice(idx, 1)
  store[source] = entries
  fs.writeFileSync(storePath, JSON.stringify(store, null, 2), "utf-8")
  regenerateReadableQueue(store, queuePath)

  // 2. Append to the false-positive log
  let fpLog: Record<string, FalsePositiveEntry[]> = {}
  if (fs.existsSync(fpLogPath)) {
    try {
      fpLog = JSON.parse(fs.readFileSync(fpLogPath, "utf-8"))
    } catch {
      fpLog = {}
    }
  }
  if (!fpLog[source]) fpLog[source] = []
  const signature = `${source}|${removed.where}|${removed.what}`
  const existingIdx = fpLog[source].findIndex((e) => e.pattern === signature)
  const rejection: FalsePositiveEntry = {
    pattern: signature,
    context: `${removed.what} @ ${removed.where}`,
    reason: reason || "rejected from /attention UI",
    rejectedAt: new Date().toISOString(),
  }
  if (existingIdx >= 0) {
    fpLog[source][existingIdx] = rejection
  } else {
    fpLog[source].push(rejection)
  }
  fs.writeFileSync(fpLogPath, JSON.stringify(fpLog, null, 2), "utf-8")
  regenerateReadableFpLog(fpLog, fpReadablePath)

  return NextResponse.json({ ok: true, removed: true, signature })
}
