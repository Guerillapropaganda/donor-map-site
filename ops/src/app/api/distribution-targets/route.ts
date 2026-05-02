import { NextRequest, NextResponse } from "next/server"
import {
  listTargetsWithMetrics,
  addTarget,
  updateTarget,
  deleteTarget,
  type TargetKind,
  type TargetStatus,
} from "@/lib/distribution-targets"

/**
 * /api/distribution-targets
 *   GET     list all targets with computed metrics
 *   POST    add a new target { handle, platform, kind, tier, reason, ... }
 *   PATCH   update an existing target { id, ...patch }
 *   DELETE  remove a target { id }
 */

export async function GET() {
  const targets = listTargetsWithMetrics()
  return NextResponse.json({ targets })
}

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 })
  }

  const handle = String(body.handle || "").trim()
  const platform = String(body.platform || "").trim()
  const kind = body.kind as TargetKind
  const tier = Number(body.tier)
  const reason = String(body.reason || "").trim()

  if (!handle) return NextResponse.json({ error: "handle required" }, { status: 400 })
  if (!platform) return NextResponse.json({ error: "platform required" }, { status: 400 })
  if (kind !== "adversarial" && kind !== "friendly") return NextResponse.json({ error: "kind must be 'adversarial' or 'friendly'" }, { status: 400 })
  if (tier !== 1 && tier !== 2 && tier !== 3) return NextResponse.json({ error: "tier must be 1, 2, or 3" }, { status: 400 })
  if (!reason) return NextResponse.json({ error: "reason required" }, { status: 400 })

  const receipts = Array.isArray(body.receipts) ? (body.receipts as unknown[]).filter((r): r is string => typeof r === "string") : undefined
  const notes = body.notes ? String(body.notes) : undefined
  const status = (body.status as TargetStatus) || "active"
  const verified = Boolean(body.verified)

  const entry = addTarget({ handle, platform, kind, tier: tier as 1 | 2 | 3, reason, receipts, status, verified, notes })
  return NextResponse.json({ success: true, target: entry })
}

export async function PATCH(req: NextRequest) {
  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 })
  }
  const id = String(body.id || "")
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 })

  // Build a sanitized patch object
  const patch: Record<string, unknown> = {}
  if ("handle" in body) patch.handle = String(body.handle).trim()
  if ("platform" in body) patch.platform = String(body.platform).trim()
  if ("kind" in body && (body.kind === "adversarial" || body.kind === "friendly")) patch.kind = body.kind
  if ("tier" in body && (Number(body.tier) === 1 || Number(body.tier) === 2 || Number(body.tier) === 3)) patch.tier = Number(body.tier)
  if ("reason" in body) patch.reason = String(body.reason).trim()
  if ("status" in body) patch.status = body.status
  if ("verified" in body) patch.verified = Boolean(body.verified)
  if ("notes" in body) patch.notes = body.notes ? String(body.notes) : undefined
  if ("receipts" in body && Array.isArray(body.receipts)) {
    patch.receipts = (body.receipts as unknown[]).filter((r): r is string => typeof r === "string")
  }

  const updated = updateTarget(id, patch)
  if (!updated) return NextResponse.json({ error: "target not found" }, { status: 404 })
  return NextResponse.json({ success: true, target: updated })
}

export async function DELETE(req: NextRequest) {
  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 })
  }
  const id = String(body.id || "")
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 })
  const ok = deleteTarget(id)
  if (!ok) return NextResponse.json({ error: "target not found" }, { status: 404 })
  return NextResponse.json({ success: true })
}
