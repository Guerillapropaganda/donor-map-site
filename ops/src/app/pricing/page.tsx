"use client"

/**
 * /pricing — Phase 2.5 tier comparison + Stripe checkout
 *
 * Public page (listed in middleware.ts PUBLIC_PATHS). Any visitor can
 * view it. Clicking "Subscribe" POSTs to /api/stripe/checkout which
 * returns a Stripe Checkout redirect URL.
 *
 * Anonymous users get redirected to /sign-in when they click. Free-auth
 * users (signed in, no subscription) proceed directly to Stripe.
 *
 * Per ADR-0002, the tier structure is locked. Don't change prices here
 * without updating ADR-0002 too.
 */

import { useState } from "react"
import Link from "next/link"

interface TierCard {
  id: "free-auth" | "researcher" | "newsroom" | "patron"
  label: string
  price: string
  period: string
  cta: string
  color: string
  features: string[]
  recommended?: boolean
}

const TIERS: TierCard[] = [
  {
    id: "free-auth",
    label: "Free",
    price: "$0",
    period: "forever",
    cta: "Sign up",
    color: "#6b7280",
    features: [
      "All profile content",
      "Homepage stories",
      "Source links",
      "Site search",
      "5 queries per day",
      "Data panel teaser (top 10 rows)",
    ],
  },
  {
    id: "researcher",
    label: "Researcher",
    price: "$20",
    period: "per month",
    cta: "Subscribe",
    color: "#22c55e",
    recommended: true,
    features: [
      "Everything in Free",
      "Unlimited queries",
      "Full profile data panels",
      "CSV export",
      "Unlimited saved queries",
      "Email alerts",
      "\"Explain this row\" AI",
    ],
  },
  {
    id: "newsroom",
    label: "Newsroom",
    price: "$150",
    period: "per month",
    cta: "Subscribe",
    color: "#3b82f6",
    features: [
      "Everything in Researcher",
      "API access (600/min)",
      "Bulk export (full JSONL)",
      "3 team seats",
      "Early story candidates",
      "Priority on data gap requests",
    ],
  },
  {
    id: "patron",
    label: "Patron",
    price: "$500",
    period: "one-time",
    cta: "Become a patron",
    color: "#a855f7",
    features: [
      "Everything in Researcher",
      "Lifetime access",
      "Name in credits (optional)",
      "No recurring billing",
    ],
  },
]

export default function PricingPage() {
  const [loading, setLoading] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const onCheckout = async (tier: string) => {
    setLoading(tier)
    setError(null)
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier }),
      })
      if (res.status === 401) {
        window.location.href = `/sign-in?redirect_url=${encodeURIComponent("/pricing")}`
        return
      }
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`)
      if (json.url) {
        window.location.href = json.url
      } else {
        throw new Error("no checkout URL returned")
      }
    } catch (e: any) {
      setError(e?.message || "checkout failed")
      setLoading(null)
    }
  }

  return (
    <div
      style={{
        padding: "2rem",
        fontFamily: "system-ui, sans-serif",
        color: "#e5e7eb",
        maxWidth: "1200px",
        margin: "0 auto",
      }}
    >
      <header style={{ marginBottom: "2rem", textAlign: "center" }}>
        <h1 style={{ fontSize: "2rem", margin: 0, color: "#f3f4f6" }}>Pricing</h1>
        <p
          style={{
            margin: "0.5rem auto 0",
            color: "#9ca3af",
            maxWidth: "640px",
            fontSize: "0.95rem",
          }}
        >
          Facts free. Research tools paid. The database stays public; the tools for serious work keep this running.
        </p>
      </header>

      {error && (
        <div
          style={{
            margin: "0 auto 1rem",
            maxWidth: "640px",
            padding: "0.75rem 1rem",
            background: "#7f1d1d",
            color: "#fecaca",
            borderRadius: "0.375rem",
          }}
        >
          {error}
        </div>
      )}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
          gap: "1rem",
        }}
      >
        {TIERS.map((t) => (
          <div
            key={t.id}
            style={{
              padding: "1.5rem",
              background: "#111827",
              border: `2px solid ${t.recommended ? t.color : "#1f2937"}`,
              borderRadius: "0.5rem",
              position: "relative",
              display: "flex",
              flexDirection: "column",
            }}
          >
            {t.recommended && (
              <div
                style={{
                  position: "absolute",
                  top: "-0.75rem",
                  left: "50%",
                  transform: "translateX(-50%)",
                  padding: "0.25rem 0.75rem",
                  background: t.color,
                  color: "#0f172a",
                  fontSize: "0.7rem",
                  fontWeight: 700,
                  borderRadius: "0.25rem",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                }}
              >
                Recommended
              </div>
            )}
            <div style={{ fontSize: "0.9rem", color: "#9ca3af", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>
              {t.label}
            </div>
            <div style={{ marginTop: "0.5rem", display: "flex", alignItems: "baseline", gap: "0.375rem" }}>
              <div style={{ fontSize: "2rem", fontWeight: 900, color: t.color }}>{t.price}</div>
              <div style={{ fontSize: "0.85rem", color: "#9ca3af" }}>{t.period}</div>
            </div>

            <ul style={{ marginTop: "1rem", paddingLeft: "1.25rem", flex: 1, lineHeight: "1.8", fontSize: "0.85rem", color: "#d1d5db" }}>
              {t.features.map((f) => (
                <li key={f}>{f}</li>
              ))}
            </ul>

            <div style={{ marginTop: "1rem" }}>
              {t.id === "free-auth" ? (
                <Link
                  href="/sign-up"
                  style={{
                    display: "block",
                    padding: "0.625rem",
                    background: "#1f2937",
                    color: "#e5e7eb",
                    textAlign: "center",
                    textDecoration: "none",
                    borderRadius: "0.375rem",
                    fontWeight: 600,
                    fontSize: "0.85rem",
                  }}
                >
                  {t.cta}
                </Link>
              ) : (
                <button
                  onClick={() => onCheckout(t.id)}
                  disabled={loading !== null}
                  style={{
                    width: "100%",
                    padding: "0.625rem",
                    background: t.color,
                    color: "#0f172a",
                    border: "none",
                    borderRadius: "0.375rem",
                    fontWeight: 700,
                    fontSize: "0.85rem",
                    cursor: loading === null ? "pointer" : "not-allowed",
                    opacity: loading === null ? 1 : 0.5,
                  }}
                >
                  {loading === t.id ? "Loading..." : t.cta}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      <div style={{ marginTop: "2rem", textAlign: "center", fontSize: "0.85rem", color: "#9ca3af" }}>
        Student / independent journalist? Email <code>editor@thedonormap.org</code> for the 50% discount on Researcher. Honor system + email verification.
      </div>

      <div
        style={{
          marginTop: "2rem",
          padding: "1rem 1.25rem",
          background: "#111827",
          border: "1px solid #1f2937",
          borderRadius: "0.5rem",
          fontSize: "0.8rem",
          color: "#9ca3af",
          maxWidth: "720px",
          margin: "2rem auto 0",
        }}
      >
        <strong style={{ color: "#f3f4f6" }}>What stays free forever:</strong>{" "}
        all profile content, all source links, site search, homepage stories, RSS feeds, attention queue output, and the open-source GitHub vault. Paying tiers unlock research tools — they don't paywall the facts. See ADR-0002.
      </div>
    </div>
  )
}
