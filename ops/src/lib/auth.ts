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
 */
export async function currentUser(
  _req?: NextRequest,
): Promise<UserRecord | null> {
  const clerkId = await getClerkUserId()
  if (!clerkId) return null

  const existing = getUserByClerkId(clerkId)
  if (existing) return existing

  // First-login backfill
  const email = (await getClerkUserEmail()) || `${clerkId}@unknown.clerk`
  return addOrFindUser({
    clerk_id: clerkId,
    email,
    tier: "free-auth",
  })
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
