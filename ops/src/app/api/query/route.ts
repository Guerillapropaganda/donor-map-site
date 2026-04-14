import { NextRequest, NextResponse } from "next/server"
import { createQueryEngine, type QuerySpec } from "@/lib/query-engine"
import { requireTier } from "@/lib/auth"
import { checkDailyLimit, checkPerMinuteLimit } from "@/lib/rate-limit"

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
// AUTH + RATE LIMIT (Phase 2.5 — live):
// Requires at least free-auth tier. Anonymous → 401.
// Daily query cap + per-minute API cap enforced per tier.
// Admin users bypass both caps.

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

async function gateAndLimit(req: NextRequest) {
  const gate = await requireTier(req, "free-auth")
  if (!gate.ok) return { response: gate.response, user: null }

  const minute = checkPerMinuteLimit(gate.user, "/api/query")
  if (!minute.allowed) {
    return {
      response: NextResponse.json(
        { error: "rate limit (per-minute)", retry_after_seconds: minute.retry_after_seconds, limit: minute.limit },
        { status: 429, headers: { "Retry-After": String(minute.retry_after_seconds || 60) } },
      ),
      user: null,
    }
  }

  const daily = checkDailyLimit(gate.user, "/api/query")
  if (!daily.allowed) {
    return {
      response: NextResponse.json(
        { error: "rate limit (daily)", retry_after_seconds: daily.retry_after_seconds, limit: daily.limit, upgrade_url: "/pricing" },
        { status: 429, headers: { "Retry-After": String(daily.retry_after_seconds || 60) } },
      ),
      user: null,
    }
  }

  return { response: null, user: gate.user, daily, minute }
}

export async function GET(req: NextRequest) {
  const gated = await gateAndLimit(req)
  if (gated.response) return gated.response
  try {
    const { searchParams } = new URL(req.url)
    const spec = specFromSearchParams(searchParams)
    const result = runSpec(spec)
    return NextResponse.json({
      ...result,
      _limits: {
        daily_remaining: gated.daily?.remaining ?? null,
        minute_remaining: gated.minute?.remaining ?? null,
      },
    })
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "query failed" },
      { status: 500 },
    )
  }
}

export async function POST(req: NextRequest) {
  const gated = await gateAndLimit(req)
  if (gated.response) return gated.response
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
    return NextResponse.json({
      ...result,
      _limits: {
        daily_remaining: gated.daily?.remaining ?? null,
        minute_remaining: gated.minute?.remaining ?? null,
      },
    })
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "query failed" },
      { status: 500 },
    )
  }
}
