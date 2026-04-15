/**
 * auth.ts — Phase 2.5 Auth & Gating helpers
 *
 * Bridges Clerk authentication (session lookups) with our own users.jsonl
 * tier system via ops/src/lib/users-store.ts (TS-native, webpack-
 * compatible). Every /api/* route that needs gating calls requireTier()
 * at the top.
 *
 * Usage in an API route:
 *
 *   import { requireTier } from "@/lib/auth"
 *   export async function POST(req: NextRequest) {
 *     const gate = await requireTier(req, "researcher")
 *     if (!gate.ok) return gate.response!
 *     // ... normal handler, gate.user is populated ...
 *   }
 *
 * Anonymous users get a 401. Logged-in users below the required tier
 * get a 402 Payment Required. Rate-limited users get a 429 (rate
 * limits live in lib/rate-limit.ts).
 *
 * ADMIN bypass: users with is_admin=true bypass all tier checks.
 */

import { NextRequest, NextResponse } from "next/server"
import {
  addOrFindUser,
  getUserByClerkId,
  tierAtLeast,
  type UserRecord,
  type Tier,
} from "./users-store"

export type { UserRecord, Tier }

// ─── Dev auth bypass ─────────────────────────────────────────────────
//
// When OPS_AUTH_BYPASS=1 AND NODE_ENV !== "production", every
// requireTier / requireAdmin call returns a synthetic admin user.
// This exists because Clerk's dev-mode instance periodically drops
// user accounts, leaving David locked out of his own Ops app (2026-04-15
// bug-001). The bypass is the escape hatch that lets local dev work
// without fighting Clerk's ephemeral state.
//
// Guardrails:
//   - Production builds hard-disable the bypass regardless of env var
//   - A loud warning prints on first use (and every ~60s after)
//   - The Ops UI shows a persistent yellow banner (DevModeBanner)
//     when the bypass is active so you can't forget it's on
//   - The synthetic user's ID is stable ("usr_dev_bypass") so rate
//     limit buckets still work
//
// Turn it on: set OPS_AUTH_BYPASS=1 in ops/.env.local + restart.
// Turn it off: remove the line + restart. That's it.

const AUTH_BYPASS_ENABLED =
  process.env.OPS_AUTH_BYPASS === "1" && process.env.NODE_ENV !== "production"

const DEV_BYPASS_USER: UserRecord = {
  id: "usr_dev_bypass",
  clerk_id: "dev_bypass_clerk_id",
  email: "dev@localhost",
  tier: "admin" as Tier,
  stripe_customer_id: null,
  stripe_subscription_id: null,
  created: "2026-04-15T00:00:00Z",
  last_seen: new Date().toISOString(),
  expires: null,
  cancelled_at: null,
  team_id: null,
  is_admin: true,
  rate_limit_override: null,
  student_discount: false,
  student_verification: null,
  editor_notes: "synthetic user from OPS_AUTH_BYPASS — dev only",
}

let _lastBypassWarning = 0
function warnBypass(source: string): void {
  const now = Date.now()
  if (now - _lastBypassWarning < 60_000) return
  _lastBypassWarning = now
  console.warn(
    `[auth] ⚠ OPS_AUTH_BYPASS active — ${source} returning synthetic admin. Never ship this in production. Disable: remove OPS_AUTH_BYPASS from ops/.env.local.`,
  )
}

/**
 * Client-readable flag exposed via /api/auth/bypass-status so the
 * Ops UI can render a banner when the bypass is active.
 */
export function isAuthBypassActive(): boolean {
  return AUTH_BYPASS_ENABLED
}

// ─── Clerk session lookup ────────────────────────────────────────────

async function getClerkUserId(): Promise<string | null> {
  try {
    const clerk = await import("@clerk/nextjs/server").catch(() => null)
    if (!clerk || typeof (clerk as any).auth !== "function") return null
    const session = await (clerk as any).auth()
    return session?.userId || null
  } catch {
    return null
  }
}

async function getClerkUserEmail(): Promise<string | null> {
  try {
    const clerk = await import("@clerk/nextjs/server").catch(() => null)
    if (!clerk || typeof (clerk as any).currentUser !== "function") return null
    const user = await (clerk as any).currentUser()
    return user?.emailAddresses?.[0]?.emailAddress || null
  } catch {
    return null
  }
}

// ─── User resolution ─────────────────────────────────────────────────

/**
 * Resolve the request to one of our user records. Creates a free-auth
 * record on first login if the Clerk user isn't in our store yet.
 * Returns null if the request is anonymous.
 *
 * If OPS_AUTH_BYPASS is active, always returns the synthetic admin user.
 *
 * Fall-through logging (ADR-0009): when we have a Clerk session but
 * neither clerk_id NOR email matches an existing user record, we log a
 * LOUD warning. This is the only way we'd ever notice Mode C happening
 * in the wild — Clerk session exists, our store has no match, we
 * silently create a new free-auth user, and the user (possibly an
 * admin) is orphaned. Without this log, the failure is invisible.
 */
export async function currentUser(
  _req?: NextRequest,
): Promise<UserRecord | null> {
  if (AUTH_BYPASS_ENABLED) {
    warnBypass("currentUser")
    return DEV_BYPASS_USER
  }

  const clerkId = await getClerkUserId()
  if (!clerkId) return null

  const existing = getUserByClerkId(clerkId)
  if (existing) return existing

  // First-login backfill — if we have an email, addOrFindUser will
  // match by email as a fallback. The result is either:
  //   (A) existing user record with backfilled clerk_id (clerk_id drift
  //       recovered via email match — good, admin status preserved)
  //   (B) new free-auth record (true first login OR complete drift
  //       where neither clerk_id nor email matched — suspicious)
  const email = (await getClerkUserEmail()) || `${clerkId}@unknown.clerk`
  const result = addOrFindUser({
    clerk_id: clerkId,
    email,
    tier: "free-auth",
  })

  // Loud warning on Mode C (see ADR-0009): if the resulting record is
  // brand new (matches the just-passed clerk_id AND is free-auth AND
  // has <2 seconds of life), this was a first-login or a complete
  // drift orphan. Real first logins are normal; drift orphans are
  // the bug we want visibility on. Both look the same from here, so
  // we log both and let the operator investigate if one of their
  // admin users suddenly shows up as free-auth.
  const now = Date.now()
  const created = result.created ? new Date(result.created).getTime() : now
  const isBrandNew = result.clerk_id === clerkId && now - created < 2000
  if (isBrandNew && result.tier === "free-auth") {
    console.warn(
      `[auth] fall-through first-login: created new user ${result.id} (email=${email}, clerk_id=${clerkId}, tier=free-auth). If this email was previously an admin, run 'node scripts/seed-admin-user.cjs --email ${email} --clerk-id ${clerkId}' to rebind. See ADR-0009.`,
    )
  }
  return result
}

// ─── Tier gating ─────────────────────────────────────────────────────

export interface GateResult {
  ok: boolean
  response?: NextResponse
  user: UserRecord | null
}

export async function requireTier(
  req: NextRequest,
  requiredTier: Tier,
): Promise<GateResult> {
  // Dev bypass short-circuit — returns synthetic admin
  if (AUTH_BYPASS_ENABLED) {
    warnBypass("requireTier")
    return { ok: true, user: DEV_BYPASS_USER }
  }

  const user = await currentUser(req)

  // Admin bypass
  if (user && user.is_admin) {
    return { ok: true, user }
  }

  if (!user) {
    if (requiredTier === "anonymous") return { ok: true, user: null }
    return {
      ok: false,
      user: null,
      response: NextResponse.json(
        {
          error: "authentication required",
          required_tier: requiredTier,
          upgrade_url: "/pricing",
        },
        { status: 401 },
      ),
    }
  }

  if (!tierAtLeast(user.tier, requiredTier)) {
    return {
      ok: false,
      user,
      response: NextResponse.json(
        {
          error: "tier upgrade required",
          current_tier: user.tier,
          required_tier: requiredTier,
          upgrade_url: "/pricing",
        },
        { status: 402 },
      ),
    }
  }

  return { ok: true, user }
}

export async function requireAdmin(req: NextRequest): Promise<GateResult> {
  // Dev bypass short-circuit
  if (AUTH_BYPASS_ENABLED) {
    warnBypass("requireAdmin")
    return { ok: true, user: DEV_BYPASS_USER }
  }

  const user = await currentUser(req)
  if (!user || !user.is_admin) {
    return {
      ok: false,
      user,
      response: NextResponse.json(
        { error: "admin access required" },
        { status: 403 },
      ),
    }
  }
  return { ok: true, user }
}
