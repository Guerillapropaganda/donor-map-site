import { NextRequest, NextResponse } from "next/server"
import {
  querySources,
  countByStatus,
  updateSourceStatus,
  getSource,
  SourceStatus,
  SOURCE_STATUSES,
  SourceType,
  SOURCE_TYPES,
  Tier,
} from "@/lib/sources-store"
import { requireAdmin } from "@/lib/auth"

// ─── /api/source-registry ────────────────────────────────────────────
//
// Phase 1 Source Registry read/write API. Serves the Ops `/sources` review
// page. NOT to be confused with `/api/sources` which is the Source Hunter
// feature (government API search for new citations during enrichment).
//
// This route is the interface to data/sources.jsonl specifically.
//
// GET query params:
//   status={status}
//   tier={1|2|3|4|null}
//   source_type={type}
//   entity_ref={exact match}
//   host={substring match on URL or final_host}
//   search={substring match on url|title|entity_ref}
//   limit={default 100, max 500}
//   offset={default 0}
// Also returns countByStatus for sidebar summaries.

export async function GET(req: NextRequest) {
  const gate = await requireAdmin(req)
  if (!gate.ok) return gate.response!
  try {
    const { searchParams } = new URL(req.url)

    const statusParam = searchParams.get("status")
    const status =
      statusParam && (SOURCE_STATUSES as string[]).includes(statusParam)
        ? (statusParam as SourceStatus)
        : undefined

    const tierParam = searchParams.get("tier")
    let tier: Tier | undefined = undefined
    if (tierParam === "null") tier = null
    else if (tierParam && /^[1-4]$/.test(tierParam)) tier = parseInt(tierParam, 10) as Tier

    const sourceTypeParam = searchParams.get("source_type")
    const source_type =
      sourceTypeParam && (SOURCE_TYPES as string[]).includes(sourceTypeParam)
        ? (sourceTypeParam as SourceType)
        : undefined

    const entity_ref = searchParams.get("entity_ref") || undefined
    const host = searchParams.get("host") || undefined
    const search = searchParams.get("search") || undefined

    const limitRaw = parseInt(searchParams.get("limit") || "100", 10)
    const limit = Math.min(Math.max(1, isNaN(limitRaw) ? 100 : limitRaw), 500)
    const offsetRaw = parseInt(searchParams.get("offset") || "0", 10)
    const offset = Math.max(0, isNaN(offsetRaw) ? 0 : offsetRaw)

    const result = querySources({
      status,
      tier,
      source_type,
      entity_ref,
      host,
      search,
      limit,
      offset,
    })

    const counts = countByStatus()

    return NextResponse.json({
      ...result,
      counts,
    })
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "failed to load sources" },
      { status: 500 },
    )
  }
}

// PATCH /api/source-registry?id={src_NNNNNN}
// Body: { status?: SourceStatus, editor_notes?: string }
// Admin-only.
export async function PATCH(req: NextRequest) {
  const gate = await requireAdmin(req)
  if (!gate.ok) return gate.response!
  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get("id")
    if (!id || !/^src_\d{6}$/.test(id)) {
      return NextResponse.json({ error: "invalid or missing id" }, { status: 400 })
    }

    const body = await req.json()
    const patch: { status?: SourceStatus; editor_notes?: string } = {}

    if (body.status !== undefined) {
      if (!(SOURCE_STATUSES as string[]).includes(body.status)) {
        return NextResponse.json(
          { error: `invalid status; must be one of: ${SOURCE_STATUSES.join(", ")}` },
          { status: 400 },
        )
      }
      patch.status = body.status as SourceStatus
    }

    if (body.editor_notes !== undefined) {
      if (typeof body.editor_notes !== "string") {
        return NextResponse.json({ error: "editor_notes must be a string" }, { status: 400 })
      }
      patch.editor_notes = body.editor_notes
    }

    if (patch.status === undefined && patch.editor_notes === undefined) {
      return NextResponse.json(
        { error: "no-op: supply status or editor_notes" },
        { status: 400 },
      )
    }

    const existing = getSource(id)
    if (!existing) {
      return NextResponse.json({ error: `source ${id} not found` }, { status: 404 })
    }

    const updated = updateSourceStatus(id, patch)
    return NextResponse.json({ source: updated })
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "failed to update source" },
      { status: 500 },
    )
  }
}
