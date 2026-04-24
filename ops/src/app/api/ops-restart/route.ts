/**
 * /api/ops-restart — restart the Next.js dev server.
 *
 * Called from the Dashboard's "Restart dev server" button. Exits the
 * current Node process with code 0 after returning its response. The
 * wrapper loop in scripts/ops-dev-loop.bat notices the exit and re-
 * launches `next dev` automatically. The Dashboard polls /api/status
 * until it gets a 200 and then reloads the page with fresh code.
 *
 * Prerequisites:
 *   - The ops app must have been launched via scripts/ops-dev-loop.bat.
 *     If launched directly via `npx next dev`, the server will exit
 *     and NOT re-launch — the user will see a dead connection.
 *   - Clerk-authenticated admin (or OPS_AUTH_BYPASS=1). requireAdmin
 *     enforces this.
 *
 * Addresses P-038 in content/Admin Notes/ops-audit-2026-04-23.md:
 * Next.js hot-reload can't always pick up changes that add new React
 * hooks or state. A full server restart always works; this endpoint
 * makes it one click instead of "drop to terminal, Ctrl+C, retype".
 */

import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/auth"

export const dynamic = "force-dynamic"

export async function POST(req: NextRequest) {
  const gate = await requireAdmin(req)
  if (!gate.ok) return gate.response

  // Schedule the exit AFTER the response has been sent.
  // 250ms is enough for Node to flush the response and close the
  // socket cleanly on Windows; any less and curl sees a truncated body.
  setTimeout(() => {
    // eslint-disable-next-line no-console
    console.log("[/api/ops-restart] exiting for wrapper-respawn")
    process.exit(0)
  }, 250)

  return NextResponse.json({
    ok: true,
    restarting: true,
    message:
      "dev server exiting; scripts/ops-dev-loop.bat wrapper will re-launch in ~1s",
  })
}

export async function GET(req: NextRequest) {
  // Lightweight endpoint for the Dashboard to detect when the server
  // is back up after a restart. Admin-gated so we don't leak restart
  // capability to anonymous probes.
  const gate = await requireAdmin(req)
  if (!gate.ok) return gate.response
  return NextResponse.json({
    ok: true,
    uptime_sec: Math.round(process.uptime()),
    pid: process.pid,
  })
}
