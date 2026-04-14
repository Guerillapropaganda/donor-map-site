import { NextRequest, NextResponse } from "next/server"
import { createQueryEngine, type QuerySpec } from "@/lib/query-engine"

// ─── /api/query ──────────────────────────────────────────────────────
//
// Phase 2 public query engine endpoint. Serves the Ops /query researcher
// page and (in Phase 2.75) Policy Battles page data panels.
//
// POST body is a QuerySpec:
//   { subject: "edges" | "entities" | "events" | "cross_party_donors"
//              | "timing_proximity" | "top_opposition_donors",
//     filters: { ...see scripts/lib/query-engine.cjs for field list } }
//
// GET is also supported with the same spec encoded in querystring for
// simple cases:
//   /api/query?subject=entities&capital_type=fossil-capital&limit=20
//
// AUTH MIDDLEWARE HOOK (Phase 2.5):
// This route is currently pass-through. When Phase 2.5 ships the tier-
// check middleware (per ADR-0002), add a guard here:
//   if (!user.tier in ['researcher', 'newsroom', 'patron']) return 402
// Do NOT remove this comment until Phase 2.5 wires it up — it's the
// tracking marker for routes that still need gating.

// Singleton engine — created once per server process, lazy-loads data
// on first query and caches forever
let _engine: ReturnType<typeof createQueryEngine> | null = null
function getEngine() {
  if (!_engine) _engine = createQueryEngine()
  return _engine
}

function runSpec(spec: QuerySpec) {
  const engine = getEngine()
  return engine.query(spec)
}

function specFromSearchParams(searchParams: URLSearchParams): QuerySpec {
  const subject = (searchParams.get("subject") as QuerySpec["subject"]) || "entities"
  const filters: Record<string, any> = {}

  for (const [k, v] of searchParams.entries()) {
    if (k === "subject") continue
    // Type coercion for numeric fields
    if (
      k === "limit" ||
      k === "offset" ||
      k === "min_amount" ||
      k === "max_amount" ||
      k === "min_confidence" ||
      k === "timing_proximity_days" ||
      k === "days"
    ) {
      const n = parseFloat(v)
      if (!isNaN(n)) filters[k] = n
      continue
    }
    // Boolean for tags_approved
    if (k === "tags_approved") {
      filters[k] = v === "true" || v === "1"
      continue
    }
    // Array for ideological_function (comma-separated)
    if (k === "ideological_function") {
      filters[k] = v.split(",").map((s) => s.trim()).filter(Boolean)
      continue
    }
    filters[k] = v
  }

  return { subject, filters }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const spec = specFromSearchParams(searchParams)
    const result = runSpec(spec)
    return NextResponse.json(result)
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "query failed" },
      { status: 500 },
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    if (!body || !body.subject) {
      return NextResponse.json(
        { error: "body must include { subject, filters? }" },
        { status: 400 },
      )
    }
    const spec: QuerySpec = { subject: body.subject, filters: body.filters || {} }
    const result = runSpec(spec)
    return NextResponse.json(result)
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "query failed" },
      { status: 500 },
    )
  }
}
