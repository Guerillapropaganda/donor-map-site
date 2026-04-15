/**
 * GET /api/auth/bypass-status — reports whether OPS_AUTH_BYPASS is active
 *
 * Used by the DevModeBanner component to decide whether to show the
 * yellow "auth bypassed" bar at the top of every page. Public route
 * (no auth gate) because the banner needs to render on the sign-in
 * page too, before the user is authenticated.
 */

import { NextResponse } from "next/server"
import { isAuthBypassActive } from "@/lib/auth"

export const dynamic = "force-dynamic"

export async function GET() {
  return NextResponse.json({
    bypass_active: isAuthBypassActive(),
    node_env: process.env.NODE_ENV || "development",
  })
}
