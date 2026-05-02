import { NextRequest, NextResponse } from "next/server"
import fs from "node:fs"
import path from "node:path"
import { randomUUID } from "node:crypto"
import { getMeme, getBeat, type BeatSlug } from "@/lib/memes-catalog"
import type { Platform } from "@/lib/social-config"

/**
 * Meme publish queue API · 2026-05-02
 *
 * Backing store: data/meme-publish-queue.jsonl (one JSON object per line).
 * Each entry tracks a meme's progression through draft → approved → posted.
 *
 * Endpoints:
 *   GET   → list all queue entries
 *   POST  → add a new draft entry { memeId, beat, platform, caption? }
 *   PATCH → update an entry's status { id, status, postedUrl? }
 *
 * Status states: draft | approved | posted | rejected | archived
 *
 * The actual posting is manual: the ops UI hands off to X/Bluesky compose
 * intent URLs. After posting, the user marks the entry posted in the queue
 * and pastes the resulting tweet/post URL for the record.
 */

interface QueueEntry {
  id: string
  memeId: string
  beat: BeatSlug
  platform: Platform
  caption: string
  status: "draft" | "approved" | "posted" | "rejected" | "archived"
  createdAt: string
  updatedAt: string
  postedAt: string | null
  postedUrl: string | null
}

const QUEUE_PATH = path.join(process.cwd(), "..", "data", "meme-publish-queue.jsonl")

function readQueue(): QueueEntry[] {
  try {
    if (!fs.existsSync(QUEUE_PATH)) return []
    const text = fs.readFileSync(QUEUE_PATH, "utf-8")
    return text
      .split("\n")
      .filter((l) => l.trim())
      .map((l) => JSON.parse(l) as QueueEntry)
  } catch (err) {
    console.error("readQueue:", err)
    return []
  }
}

function writeQueue(entries: QueueEntry[]) {
  const text = entries.map((e) => JSON.stringify(e)).join("\n") + (entries.length ? "\n" : "")
  fs.writeFileSync(QUEUE_PATH, text, "utf-8")
}

export async function GET() {
  const entries = readQueue()
  // Newest first
  entries.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  return NextResponse.json({ entries })
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { memeId, beat, platform, caption } = body as {
      memeId?: string
      beat?: BeatSlug
      platform?: Platform
      caption?: string
    }
    if (!memeId || !beat || !platform) {
      return NextResponse.json({ error: "memeId, beat, platform required" }, { status: 400 })
    }
    const meme = getMeme(memeId)
    if (!meme) return NextResponse.json({ error: `unknown memeId: ${memeId}` }, { status: 400 })
    if (!getBeat(beat)) return NextResponse.json({ error: `unknown beat: ${beat}` }, { status: 400 })

    const now = new Date().toISOString()
    const entry: QueueEntry = {
      id: randomUUID().slice(0, 8),
      memeId,
      beat,
      platform,
      caption: caption || meme.caption,
      status: "draft",
      createdAt: now,
      updatedAt: now,
      postedAt: null,
      postedUrl: null,
    }
    const entries = readQueue()
    entries.push(entry)
    writeQueue(entries)
    return NextResponse.json({ entry })
  } catch (err) {
    console.error("POST /api/meme-queue:", err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json()
    const { id, status, postedUrl } = body as {
      id?: string
      status?: QueueEntry["status"]
      postedUrl?: string | null
    }
    if (!id || !status) {
      return NextResponse.json({ error: "id and status required" }, { status: 400 })
    }
    const entries = readQueue()
    const idx = entries.findIndex((e) => e.id === id)
    if (idx < 0) return NextResponse.json({ error: `unknown id: ${id}` }, { status: 404 })
    const now = new Date().toISOString()
    entries[idx] = {
      ...entries[idx],
      status,
      updatedAt: now,
      postedAt: status === "posted" ? now : entries[idx].postedAt,
      postedUrl: postedUrl ?? entries[idx].postedUrl,
    }
    writeQueue(entries)
    return NextResponse.json({ entry: entries[idx] })
  } catch (err) {
    console.error("PATCH /api/meme-queue:", err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
