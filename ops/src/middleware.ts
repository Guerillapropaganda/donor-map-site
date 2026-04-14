/**
 * middleware.ts — Phase 2.5 Clerk auth middleware
 *
 * Next.js middleware that runs on every request. Wraps the Clerk
 * authMiddleware to handle session resolution and redirects for
 * authenticated routes. Tier-check gating happens at the API route
 * level via `requireTier()` from lib/auth.ts, NOT here — this file
 * only ensures the Clerk session is available on the request.
 *
 * Public routes (no auth required):
 *   /                  Ops landing
 *   /pricing           tier comparison + Stripe checkout CTAs
 *   /api/stripe/webhook Stripe -> webhook, must be public to receive
 *
 * Everything else requires a Clerk session to READ; individual API
 * routes then call requireTier() with their specific tier threshold.
 *
 * Dynamic import is used so this file can be loaded even when
 * @clerk/nextjs isn't installed yet (Phase 2.5 pre-install state).
 * If the import fails, the middleware is a no-op pass-through.
 */

import { NextRequest, NextResponse } from "next/server"

// Paths that bypass auth entirely
const PUBLIC_PATHS = [
  "/",
  "/pricing",
  "/sign-in",
  "/sign-up",
  "/api/stripe/webhook",
  "/favicon.ico",
]

function isPublicPath(pathname: string): boolean {
  for (const p of PUBLIC_PATHS) {
    if (pathname === p || pathname.startsWith(p + "/")) return true
  }
  return false
}

// Gracefully degrade if Clerk isn't installed — pre-install Phase 2.5
// mode lets the app still boot and serve public routes.
let clerkMiddleware: ((req: NextRequest) => Promise<NextResponse | undefined>) | null = null

try {
  // @ts-ignore — dynamic import, may not resolve at build time yet
  const mod = require("@clerk/nextjs/server")
  if (mod && typeof mod.clerkMiddleware === "function") {
    clerkMiddleware = mod.clerkMiddleware((auth: any, req: NextRequest) => {
      if (isPublicPath(req.nextUrl.pathname)) return
      // Clerk will redirect to sign-in if there's no session
      auth().protect()
    })
  }
} catch {
  clerkMiddleware = null
}

export async function middleware(req: NextRequest) {
  // Pre-install mode: allow everything through so Ops still boots
  if (!clerkMiddleware) return NextResponse.next()
  return clerkMiddleware(req)
}

export const config = {
  matcher: [
    // Match everything except Next internals and static assets
    "/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)",
    "/(api|trpc)(.*)",
  ],
}
