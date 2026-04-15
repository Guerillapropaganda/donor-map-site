/**
 * /sign-in — Phase 2.5 Clerk sign-in page
 *
 * Standard Clerk catch-all route. The <SignIn /> component handles
 * email + password, magic link, password reset, all of it. No UI work
 * on our side — Clerk renders a themed form that picks up our dark
 * mode via the ClerkProvider in app/layout.tsx.
 *
 * The [[...sign-in]] folder name is required by Clerk so the component
 * can handle sub-routes like /sign-in/verify-email internally.
 *
 * Recovery note: we can't inject content into the Clerk <SignIn />
 * widget itself, but we render a "locked out?" note below the widget
 * that points at the OPS_AUTH_BYPASS recovery path documented in
 * content/Admin Notes/phase-2.5-setup.md. This exists because Clerk
 * dev-mode accounts are ephemeral (ADR-0009) and locking yourself out
 * of your own dev Ops app is a real and recurring failure mode.
 */

"use client"

import { SignIn } from "@clerk/nextjs"
import { useEffect, useState } from "react"

export default function SignInPage() {
  const [bypassActive, setBypassActive] = useState(false)
  const [bypassKnown, setBypassKnown] = useState(false)

  useEffect(() => {
    fetch("/api/auth/bypass-status", { credentials: "include" })
      .then((r) => r.json())
      .then((data) => {
        setBypassActive(!!data.bypass_active)
        setBypassKnown(true)
      })
      .catch(() => setBypassKnown(true))
  }, [])

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        minHeight: "70vh",
        padding: "2rem 1rem",
      }}
    >
      {bypassActive && (
        <div
          style={{
            maxWidth: 500,
            marginBottom: "2rem",
            padding: "1rem",
            background: "#fef3c7",
            border: "2px solid #f59e0b",
            borderRadius: 4,
            color: "#78350f",
            fontFamily: "monospace",
            fontSize: 13,
            textAlign: "center",
          }}
        >
          <strong>OPS_AUTH_BYPASS is already active.</strong> You don't need to
          sign in. Go to{" "}
          <a href="/" style={{ color: "#b45309", textDecoration: "underline" }}>
            the dashboard
          </a>
          .
        </div>
      )}

      <SignIn />

      {bypassKnown && !bypassActive && (
        <div
          style={{
            maxWidth: 500,
            marginTop: "2rem",
            padding: "1rem",
            background: "#1c1917",
            border: "1px solid #44403c",
            borderRadius: 4,
            color: "#a8a29e",
            fontFamily: "monospace",
            fontSize: 12,
            lineHeight: 1.6,
          }}
        >
          <div
            style={{ color: "#fbbf24", fontWeight: 700, marginBottom: 6 }}
          >
            Locked out of your own dev Ops app?
          </div>
          <div style={{ marginBottom: 10 }}>
            Clerk dev-mode accounts are ephemeral and can be dropped across
            server restarts or Clerk's own infrastructure events. The
            recovery path is the <code>OPS_AUTH_BYPASS</code> env var:
          </div>
          <ol style={{ marginLeft: 18, marginBottom: 10, padding: 0 }}>
            <li>
              Add <code>OPS_AUTH_BYPASS=1</code> to{" "}
              <code>ops/.env.local</code>
            </li>
            <li>
              Restart your dev server (<code>Ctrl+C</code>,{" "}
              <code>npm run dev</code>)
            </li>
            <li>Hard refresh this tab — you're in.</li>
          </ol>
          <div style={{ fontSize: 11, color: "#78716c" }}>
            Full recovery guide:{" "}
            <code>content/Admin Notes/phase-2.5-setup.md</code> § "Recovery
            from Clerk lockout" · ADR-0009
          </div>
        </div>
      )}
    </div>
  )
}
