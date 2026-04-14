/**
 * auth.ts — Phase 2.5 Auth & Gating helpers
 *
 * Bridges Clerk authentication (session lookups) with our own users.jsonl
 * tier system. Every /api/* route that needs gating calls requireTier()
 * at the top.
 *
 * Usage in an API route:
 *
 *   import { requireTier } from "@/lib/auth"
 *   export async function POST(req: NextRequest) {
 *     const gate = await requireTier(req, "researcher")
 *     if (!gate.ok) return gate.response
 *     // ... normal handler, gate.user is populated ...
 *   }
 *
 * Anonymous users get a 401. Logged-in users below the required tier
 * get a 402 Payment Required. Rate-limited users get a 429.
 *
 * ADMIN bypass: users with is_admin=true bypass all tier checks.
 *
 * NOTE: The Clerk SDK import at the top will fail until someone runs
 * `npm install @clerk/nextjs` in the ops/ directory. The setup steps
 * are documented in content/Admin Notes/phase-2.5-setup.md.
 */

import { NextRequest, NextResponse } from "next/server"
import { createRequire } from "module"
import path from "path"

const require = createRequire(import.meta.url)

// ─── Repo root + users store (via CJS) ───────────────────────────────

function findRepoRoot(startDir: string): string {
  const fs = require("fs")
  let dir = startDir
  for (let i = 0; i < 8; i++) {
    if (fs.existsSync(path.join(dir, "scripts", "lib", "users-store.cjs"))) return dir
    if (fs.existsSync(path.join(dir, ".git"))) return dir
    const parent = path.dirname(dir)
    if (parent === dir) break
    dir = parent
  }
  return startDir
}

const root = findRepoRoot(process.cwd())
const usersStore = require(path.join(root, "scripts", "lib", "users-store.cjs"))
const usersSchema = require(path.join(root, "scripts", "lib", "users-schema.cjs"))

export type Tier = "anonymous" | "free-auth" | "researcher" | "newsroom" | "patron" | "admin"

export interface UserRecord {
  id: string
  clerk_id: string | null
  email: string
  tier: Tier
  stripe_customer_id: string | null
  stripe_subscription_id: string | null
  is_admin: boolean
  rate_limit_override: number | null
  expires: string | null
  [k: string]: any
}

// ─── Clerk session lookup ────────────────────────────────────────────

/**
 * Fetch the current Clerk session's user id. Returns null if anonymous.
 *
 * This dynamically imports @clerk/nextjs so the route file still type-
 * checks (and still builds the rest of the module) even if the Clerk
 * package isn't installed yet. The auth() call throws in that case,
 * and we treat throw as "anonymous" for graceful degradation during
 * the Phase 2.5 rollout.
 */
async function getClerkUserId(req: NextRequest): Promise<string | null> {
  try {
    // Dynamic import so the module loads before @clerk/nextjs is installed
    const clerk = await import("@clerk/nextjs/server").catch(() => null)
    if (!clerk || typeof (clerk as any).auth !== "function") {
      // SDK not installed yet — Phase 2.5 pre-install mode
      return null
    }
    const session = await (clerk as any).auth()
    return session?.userId || null
  } catch {
    return null
  }
}

/**
 * Fetch the current Clerk session's user email. Same graceful-fallback
 * pattern as getClerkUserId.
 */
async function getClerkUserEmail(req: NextRequest): Promise<string | null> {
  try {
    const clerk = await import("@clerk/nextjs/server").catch(() => null)
    if (!clerk || typeof (clerk as any).currentUser !== "function") return null
    const user = await (clerk as any).currentUser()
    return user?.emailAddresses?.[0]?.emailAddress || null
  } catch {
    return null
  }
}

// ─── User lookup (ours, backed by users.jsonl) ───────────────────────

/**
 * Resolve the request to one of our user records. Creates a record on
 * first login (free-auth tier) if the Clerk user isn't in our store yet.
 * Returns null if the request is anonymous.
 */
export async function currentUser(req: NextRequest): Promise<UserRecord | null> {
  const clerkId = await getClerkUserId(req)
  if (!clerkId) return null

  let rec = usersStore.getUserByClerkId(clerkId)
  if (rec) return rec

  // First-login backfill — create a free-auth record
  const email = (await getClerkUserEmail(req)) || `${clerkId}@unknown.clerk`
  rec = usersStore.addOrFindUser({
    clerk_id: clerkId,
    email,
    tier: "free-auth",
  })
  return rec
}

// ─── Tier gating ─────────────────────────────────────────────────────

export interface GateResult {
  ok: boolean
  response?: NextResponse
  user: UserRecord | null
}

/**
 * Returns a gate result. If `ok` is true, the caller proceeds with the
 * request handler (and can read gate.user). If false, the caller returns
 * gate.response directly.
 *
 * Admin users bypass ALL gates regardless of required tier.
 */
export async function requireTier(
  req: NextRequest,
  requiredTier: Tier,
): Promise<GateResult> {
  const user = await currentUser(req)

  // Admin bypass
  if (user && user.is_admin) {
    return { ok: true, user }
  }

  // Anonymous path
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

  // Tier hierarchy check
  const passes = usersSchema.tierAtLeast(user.tier, requiredTier)
  if (!passes) {
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

/**
 * Admin-only gate. Returns 403 for any non-admin user. Use this on
 * Ops-internal routes like /api/class-tags and /api/source-registry.
 */
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
