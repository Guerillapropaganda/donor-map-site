/**
 * /account — Phase 2.5 user account page
 *
 * Shows the current user's tier, subscription state, rate limit
 * status, and upgrade/downgrade CTAs. Server component that reads
 * the user from requireTier().
 */

import { NextRequest } from "next/server"
import { cookies, headers } from "next/headers"
import Link from "next/link"
import { currentUser, type UserRecord } from "@/lib/auth"

// Stub NextRequest-like object from headers for currentUser()
// In a server component, we can't use NextRequest directly; we use
// the headers() API to build a compatible minimal shape.
async function fakeRequestFromHeaders(): Promise<any> {
  const h = await headers()
  return {
    headers: {
      get: (name: string) => h.get(name),
    },
    nextUrl: { pathname: "/account" },
  }
}

export default async function AccountPage() {
  let user: UserRecord | null = null
  try {
    const req = await fakeRequestFromHeaders()
    user = await currentUser(req)
  } catch {
    user = null
  }

  if (!user) {
    return (
      <div
        style={{
          padding: "2rem",
          fontFamily: "system-ui, sans-serif",
          color: "#e5e7eb",
          maxWidth: "800px",
          margin: "0 auto",
        }}
      >
        <h1 style={{ fontSize: "1.75rem", margin: 0 }}>Account</h1>
        <p style={{ color: "#9ca3af", marginTop: "1rem" }}>
          You're not signed in. Visit <Link href="/sign-in" style={{ color: "#fbbf24" }}>/sign-in</Link> to continue.
        </p>
        <p style={{ color: "#6b7280", fontSize: "0.85rem", marginTop: "2rem" }}>
          (If /sign-in gives an error, the Phase 2.5 auth setup isn't complete yet. See
          <code style={{ color: "#d1d5db", marginLeft: "0.25rem" }}>
            content/Admin Notes/phase-2.5-setup.md
          </code>
          .)
        </p>
      </div>
    )
  }

  const isAdmin = user.is_admin
  const tierLabel = isAdmin ? "admin" : user.tier

  return (
    <div
      style={{
        padding: "2rem",
        fontFamily: "system-ui, sans-serif",
        color: "#e5e7eb",
        maxWidth: "800px",
        margin: "0 auto",
      }}
    >
      <h1 style={{ fontSize: "1.75rem", margin: 0 }}>Account</h1>
      <p style={{ color: "#9ca3af", marginTop: "0.25rem", fontSize: "0.9rem" }}>
        Your tier, subscription state, and rate limit overview.
      </p>

      {/* Identity card */}
      <div
        style={{
          marginTop: "1.5rem",
          padding: "1rem 1.25rem",
          background: "#111827",
          border: "1px solid #1f2937",
          borderRadius: "0.5rem",
        }}
      >
        <div style={{ fontSize: "0.7rem", color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em" }}>
          Identity
        </div>
        <div style={{ marginTop: "0.25rem", fontSize: "1rem" }}>
          <strong>{user.email}</strong>
        </div>
        <div style={{ marginTop: "0.25rem", fontSize: "0.8rem", color: "#9ca3af" }}>
          user id: <code>{user.id}</code>
          {user.clerk_id && (
            <>
              {" · "}clerk id: <code>{user.clerk_id}</code>
            </>
          )}
        </div>
      </div>

      {/* Tier card */}
      <div
        style={{
          marginTop: "1rem",
          padding: "1rem 1.25rem",
          background: "#111827",
          border: `1px solid ${tierBorderColor(tierLabel)}`,
          borderRadius: "0.5rem",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start" }}>
          <div>
            <div
              style={{
                fontSize: "0.7rem",
                color: "#6b7280",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}
            >
              Tier
            </div>
            <div
              style={{
                marginTop: "0.25rem",
                fontSize: "1.5rem",
                fontWeight: 700,
                color: tierBorderColor(tierLabel),
              }}
            >
              {tierLabel}
            </div>
            {user.expires && (
              <div style={{ marginTop: "0.25rem", fontSize: "0.8rem", color: "#9ca3af" }}>
                renews: {user.expires.slice(0, 10)}
              </div>
            )}
            {user.cancelled_at && (
              <div style={{ marginTop: "0.25rem", fontSize: "0.8rem", color: "#ef4444" }}>
                cancelled: {user.cancelled_at.slice(0, 10)}
              </div>
            )}
          </div>
          <div>
            {!isAdmin && user.tier !== "researcher" && user.tier !== "newsroom" && user.tier !== "patron" && (
              <Link
                href="/pricing"
                style={{
                  padding: "0.5rem 0.875rem",
                  background: "#fbbf24",
                  color: "#0f172a",
                  borderRadius: "0.375rem",
                  fontWeight: 700,
                  textDecoration: "none",
                  fontSize: "0.85rem",
                }}
              >
                Upgrade →
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Rate limit guide */}
      <div
        style={{
          marginTop: "1rem",
          padding: "1rem 1.25rem",
          background: "#111827",
          border: "1px solid #1f2937",
          borderRadius: "0.5rem",
          fontSize: "0.85rem",
          color: "#9ca3af",
        }}
      >
        <div style={{ fontSize: "0.7rem", color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em" }}>
          Your limits
        </div>
        <ul style={{ marginTop: "0.5rem", paddingLeft: "1.25rem", lineHeight: "1.8" }}>
          <li>
            Daily query cap: <code>{describeDailyLimit(tierLabel, user.rate_limit_override)}</code>
          </li>
          <li>
            API per-minute: <code>{describePerMinuteLimit(tierLabel)}</code>
          </li>
          <li>
            Data panel depth:{" "}
            <code>{tierLabel === "anonymous" ? "3 rows" : tierLabel === "free-auth" ? "10 rows" : "full"}</code>
          </li>
        </ul>
      </div>

      <div style={{ marginTop: "2rem", fontSize: "0.75rem", color: "#6b7280" }}>
        Phase 2.5 Auth & Gating. Subscription managed by Stripe. Tier state cached in data/users.jsonl and updated via the Stripe webhook at /api/stripe/webhook.
      </div>
    </div>
  )
}

function tierBorderColor(tier: string): string {
  switch (tier) {
    case "admin":
      return "#a855f7"
    case "newsroom":
      return "#3b82f6"
    case "researcher":
    case "patron":
      return "#22c55e"
    case "free-auth":
      return "#fbbf24"
    default:
      return "#6b7280"
  }
}

function describeDailyLimit(tier: string, override: number | null): string {
  if (override) return `${override} (override)`
  switch (tier) {
    case "admin":
    case "newsroom":
    case "researcher":
    case "patron":
      return "unlimited"
    case "free-auth":
      return "5 / day"
    default:
      return "0 (sign in)"
  }
}

function describePerMinuteLimit(tier: string): string {
  switch (tier) {
    case "admin":
      return "unlimited"
    case "newsroom":
      return "600 / minute"
    case "researcher":
    case "patron":
      return "60 / minute"
    case "free-auth":
      return "10 / minute"
    default:
      return "0"
  }
}
