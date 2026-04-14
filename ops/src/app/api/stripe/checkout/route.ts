/**
 * /api/stripe/checkout — Phase 2.5
 *
 * Creates a Stripe Checkout session for a given tier. Called from
 * /pricing when the user clicks a tier's "Subscribe" button.
 *
 * Body:
 *   { tier: "researcher" | "newsroom" | "patron", student_discount?: boolean }
 *
 * Returns:
 *   { url: "https://checkout.stripe.com/..." }  — redirect the user here
 *
 * Requires auth: user must be signed in. Anonymous users get a 401
 * and should be redirected to /sign-in first.
 *
 * NOTE: imports `stripe` dynamically so the Ops app still boots in
 * Phase 2.5 pre-install mode. When @stripe/stripe-node isn't available,
 * the route returns 503 with a setup pointer.
 */

import { NextRequest, NextResponse } from "next/server"
import { requireTier } from "@/lib/auth"

// Tier → Stripe price_id env var mapping. Set these in .env.local
// after creating the products in Stripe Dashboard.
const TIER_TO_PRICE_ENV: Record<string, string> = {
  researcher: "STRIPE_PRICE_RESEARCHER",
  newsroom: "STRIPE_PRICE_NEWSROOM",
  patron: "STRIPE_PRICE_PATRON",
  researcher_student: "STRIPE_PRICE_RESEARCHER_STUDENT",
}

export async function POST(req: NextRequest) {
  // Must be at least free-auth (signed in) to create a checkout session
  const gate = await requireTier(req, "free-auth")
  if (!gate.ok) return gate.response!

  const body = await req.json().catch(() => ({}))
  const { tier, student_discount } = body as {
    tier?: string
    student_discount?: boolean
  }

  if (!tier || !(tier in TIER_TO_PRICE_ENV)) {
    return NextResponse.json(
      { error: "invalid tier", allowed: Object.keys(TIER_TO_PRICE_ENV) },
      { status: 400 },
    )
  }

  const priceKey =
    tier === "researcher" && student_discount ? "researcher_student" : tier
  const priceIdEnvVar = TIER_TO_PRICE_ENV[priceKey]
  const priceId = process.env[priceIdEnvVar]
  if (!priceId) {
    return NextResponse.json(
      {
        error: "pricing not configured",
        missing_env: priceIdEnvVar,
        setup_doc: "content/Admin Notes/phase-2.5-setup.md",
      },
      { status: 503 },
    )
  }

  // Dynamic import so missing SDK gives a nice error instead of
  // crashing the whole Ops app
  let Stripe: any
  try {
    Stripe = (await import("stripe")).default
  } catch {
    return NextResponse.json(
      {
        error: "stripe SDK not installed",
        fix: "cd ops && npm install stripe",
      },
      { status: 503 },
    )
  }

  const stripeSecret = process.env.STRIPE_SECRET_KEY
  if (!stripeSecret) {
    return NextResponse.json(
      { error: "STRIPE_SECRET_KEY not set", setup_doc: "content/Admin Notes/phase-2.5-setup.md" },
      { status: 503 },
    )
  }

  const stripe = new Stripe(stripeSecret, { apiVersion: "2024-11-20.acacia" })

  const mode = tier === "patron" ? "payment" : "subscription"
  const origin = req.headers.get("origin") || "http://localhost:3333"

  try {
    const session = await stripe.checkout.sessions.create({
      mode,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${origin}/account?checkout=success&tier=${tier}`,
      cancel_url: `${origin}/pricing?checkout=cancelled`,
      customer_email: gate.user!.email,
      metadata: {
        user_id: gate.user!.id,
        tier,
        student_discount: student_discount ? "true" : "false",
      },
    })

    return NextResponse.json({ url: session.url })
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "stripe checkout failed" },
      { status: 500 },
    )
  }
}
