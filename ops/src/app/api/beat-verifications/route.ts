import { NextRequest, NextResponse } from "next/server"
import { readStore, writeStore, type VerificationStatus } from "@/lib/beat-verifications"

/**
 * Beat verifications API · 2026-05-02
 *
 * Endpoints:
 *   GET ?beat=<slug>  → list verifications for a beat (or all if no beat)
 *   PATCH             → update status { id, status, notes?, verifiedBy? }
 *
 * Status transitions:
 *   open → verified   (URL pass complete; quote matches; cite is good)
 *   open → broken     (URL is dead, paywalled, or moved)
 *   open → unsure     (URL works but needs editorial follow-up)
 *   open → wontfix    (will not upgrade further; e.g. Tier 2 attribution)
 *   any  → open       (re-open for re-verification)
 */

export async function GET(req: NextRequest) {
  const beat = req.nextUrl.searchParams.get("beat")
  const all = readStore()
  const entries = beat ? all.filter((e) => e.beat === beat) : all
  return NextResponse.json({ entries })
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json()
    const { id, status, notes, verifiedBy } = body as {
      id?: string
      status?: VerificationStatus
      notes?: string
      verifiedBy?: string
    }
    if (!id || !status) {
      return NextResponse.json({ error: "id and status required" }, { status: 400 })
    }
    const entries = readStore()
    const idx = entries.findIndex((e) => e.id === id)
    if (idx < 0) return NextResponse.json({ error: `unknown id: ${id}` }, { status: 404 })
    const now = new Date().toISOString()
    const wasVerified = entries[idx].status === "verified"
    const isVerifying = status === "verified"
    entries[idx] = {
      ...entries[idx],
      status,
      notes: notes ?? entries[idx].notes,
      verifiedBy: isVerifying ? verifiedBy ?? "editor" : entries[idx].verifiedBy,
      verifiedAt: isVerifying && !wasVerified ? now : entries[idx].verifiedAt,
      updatedAt: now,
    }
    writeStore(entries)
    return NextResponse.json({ entry: entries[idx] })
  } catch (err) {
    console.error("PATCH /api/beat-verifications:", err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
