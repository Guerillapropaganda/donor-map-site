import { NextRequest, NextResponse } from "next/server"
import {
  listEngagements,
  listEngagementsForTarget,
  logEngagement,
  voidEngagement,
  type EngagementType,
  type EngagementOutcome,
} from "@/lib/distribution-targets"

/**
 * /api/distribution-engagements
 *   GET ?targetId=xxx  list engagements for one target (newest first)
 *   GET                list ALL engagements (newest first)
 *   POST               log a new engagement { targetId, type, platform, ... }
 *   DELETE             void an engagement { id }  (audit-trail-safe)
 */

export async function GET(req: NextRequest) {
  const targetId = req.nextUrl.searchParams.get("targetId")
  const engagements = targetId ? listEngagementsForTarget(targetId) : listEngagements()
  return NextResponse.json({ engagements })
}

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 })
  }
  const targetId = String(body.targetId || "")
  const type = body.type as EngagementType
  const platform = String(body.platform || "").trim()
  if (!targetId) return NextResponse.json({ error: "targetId required" }, { status: 400 })
  if (!type) return NextResponse.json({ error: "type required" }, { status: 400 })
  if (!platform) return NextResponse.json({ error: "platform required" }, { status: 400 })

  const entry = logEngagement({
    targetId,
    type,
    platform,
    date: body.date ? String(body.date) : undefined,
    myPostUrl: body.myPostUrl ? String(body.myPostUrl) : undefined,
    theirPostUrl: body.theirPostUrl ? String(body.theirPostUrl) : undefined,
    receiptUsed: body.receiptUsed ? String(body.receiptUsed) : undefined,
    outcome: (body.outcome as EngagementOutcome) || "pending",
    notes: body.notes ? String(body.notes) : undefined,
  })
  return NextResponse.json({ success: true, engagement: entry })
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
  const ok = voidEngagement(id)
  if (!ok) return NextResponse.json({ error: "engagement not found" }, { status: 404 })
  return NextResponse.json({ success: true })
}
