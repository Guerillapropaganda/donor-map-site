import { NextRequest, NextResponse } from "next/server"
import {
  queryProposals,
  updateProposal,
  applyApprovedTagsToEntity,
  CAPITAL_TYPES,
  type CapitalType,
  type ProposalStatus,
  type ProposedTags,
} from "@/lib/class-tag-proposals-store"

// ─── /api/class-tags ──────────────────────────────────────────────────
//
// Phase 2 class tag review API. Serves the Ops /class-tags page.
//
// GET params:
//   status=pending|approved|rejected|edited
//   confidence=high|medium|low
//   capital_type={type}
//   search={substring on entity_name}
//   limit={default 50, max 200}
//   offset={default 0}
//
// Returns counts by status + confidence (for the summary header) plus
// the paginated proposal list with embedded entity snapshots.
//
// PATCH ?entity_id={ent_NNNNNN}
// Body:
//   status: approved | rejected | edited   (required)
//   tags: { capital_type?, class_position?, ... }  (required for approved/edited)
//   reject_reason: string (optional, used on rejected)
//
// On `approved` or `edited`: writes the tags onto the entity record in
// data/entities.jsonl and marks the proposal reviewed.
// On `rejected`: marks the proposal reviewed with optional reason; the
// entity record is NOT touched (entity stays in untagged state, future
// proposal runs should skip re-proposing from the rejection log — that's
// a Phase 2 follow-up, not wired yet).

const ALLOWED_STATUSES: ProposalStatus[] = ["pending", "approved", "rejected", "edited"]

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)

    const statusParam = searchParams.get("status")
    const status =
      statusParam && (ALLOWED_STATUSES as string[]).includes(statusParam)
        ? (statusParam as ProposalStatus)
        : undefined

    const confParam = searchParams.get("confidence")
    const confidence =
      confParam === "high" || confParam === "medium" || confParam === "low"
        ? confParam
        : undefined

    const capParam = searchParams.get("capital_type")
    const capital_type =
      capParam && (CAPITAL_TYPES as string[]).includes(capParam)
        ? (capParam as CapitalType)
        : undefined

    const search = searchParams.get("search") || undefined

    const limitRaw = parseInt(searchParams.get("limit") || "50", 10)
    const limit = Math.min(Math.max(1, isNaN(limitRaw) ? 50 : limitRaw), 200)
    const offsetRaw = parseInt(searchParams.get("offset") || "0", 10)
    const offset = Math.max(0, isNaN(offsetRaw) ? 0 : offsetRaw)

    const result = queryProposals({
      status,
      confidence,
      capital_type,
      search,
      limit,
      offset,
    })

    return NextResponse.json(result)
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "failed to load proposals" },
      { status: 500 },
    )
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const entityId = searchParams.get("entity_id")
    if (!entityId || !/^ent_\d{6}$/.test(entityId)) {
      return NextResponse.json({ error: "invalid or missing entity_id" }, { status: 400 })
    }

    const body = await req.json()
    const { status, tags, reject_reason } = body as {
      status: ProposalStatus
      tags?: Partial<ProposedTags>
      reject_reason?: string
    }

    if (!status || !(ALLOWED_STATUSES as string[]).includes(status)) {
      return NextResponse.json(
        { error: `status is required and must be one of: ${ALLOWED_STATUSES.join(", ")}` },
        { status: 400 },
      )
    }

    if ((status === "approved" || status === "edited") && !tags) {
      return NextResponse.json(
        { error: "tags payload required for approved/edited status" },
        { status: 400 },
      )
    }

    const updated = updateProposal(entityId, { status, tags, reject_reason })
    if (!updated) {
      return NextResponse.json({ error: `proposal ${entityId} not found` }, { status: 404 })
    }

    // If approved or edited, write the approved tags onto the entity record
    if (status === "approved" || status === "edited") {
      const ok = applyApprovedTagsToEntity(entityId, updated.tags)
      if (!ok) {
        return NextResponse.json(
          {
            error: `proposal updated but entity ${entityId} not found in entities.jsonl`,
            proposal: updated,
          },
          { status: 500 },
        )
      }
    }

    return NextResponse.json({ proposal: updated })
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "failed to update proposal" },
      { status: 500 },
    )
  }
}
