/**
 * /api/stripe/webhook — Phase 2.5
 *
 * Stripe webhook handler. Stripe POSTs signed event payloads here when
 * subscription state changes. We verify the signature, parse the event,
 * and update the user's tier in data/users.jsonl accordingly.
 *
 * Events we handle:
 *   checkout.session.completed          → set tier on first successful checkout
 *   customer.subscription.updated       → handle tier upgrades/downgrades
 *   customer.subscription.deleted       → revoke tier on cancellation
 *   invoice.payment_failed              → log for manual review
 *
 * This route is intentionally PUBLIC (listed in middleware.ts
 * PUBLIC_PATHS) because Stripe's servers need to reach it without
 * a session cookie. Security comes from the webhook secret signature
 * check, NOT from auth.
 *
 * Setup: after creating products in Stripe Dashboard, configure a
 * webhook endpoint pointing at /api/stripe/webhook with the events
 * listed above, and set STRIPE_WEBHOOK_SECRET in .env.local.
 */

import { NextRequest, NextResponse } from "next/server"
import { createRequire } from "module"
import path from "path"

const require = createRequire(import.meta.url)

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

export async function POST(req: NextRequest) {
  let Stripe: any
  try {
    Stripe = (await import("stripe")).default
  } catch {
    return NextResponse.json(
      { error: "stripe SDK not installed" },
      { status: 503 },
    )
  }

  const stripeSecret = process.env.STRIPE_SECRET_KEY
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
  if (!stripeSecret || !webhookSecret) {
    return NextResponse.json(
      { error: "stripe secrets not configured" },
      { status: 503 },
    )
  }

  const stripe = new Stripe(stripeSecret, { apiVersion: "2024-11-20.acacia" })

  const signature = req.headers.get("stripe-signature") || ""
  const body = await req.text()

  let event: any
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
  } catch (e: any) {
    return NextResponse.json(
      { error: `invalid signature: ${e?.message}` },
      { status: 400 },
    )
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object
        const userId = session.metadata?.user_id
        const tier = session.metadata?.tier
        const customerId = session.customer
        const subscriptionId = session.subscription

        if (userId && tier) {
          const patch: any = {
            tier,
            stripe_customer_id: customerId || null,
          }
          if (subscriptionId) patch.stripe_subscription_id = subscriptionId
          if (tier === "patron") {
            patch.expires = null // lifetime
          }
          usersStore.updateUser(userId, patch)
        }
        break
      }

      case "customer.subscription.updated": {
        const sub = event.data.object
        const customerId = sub.customer
        const status = sub.status // active | past_due | canceled | unpaid | ...

        // Find our user by stripe_customer_id
        const all = usersStore.loadUsers()
        const user = all.find((u: any) => u.stripe_customer_id === customerId)
        if (user) {
          if (status === "active") {
            // Keep their current tier; just refresh expires
            usersStore.updateUser(user.id, {
              expires: new Date(sub.current_period_end * 1000).toISOString(),
            })
          } else if (status === "canceled" || status === "unpaid") {
            usersStore.updateUser(user.id, {
              tier: "free-auth",
              cancelled_at: new Date().toISOString(),
            })
          }
        }
        break
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object
        const customerId = sub.customer
        const all = usersStore.loadUsers()
        const user = all.find((u: any) => u.stripe_customer_id === customerId)
        if (user) {
          usersStore.updateUser(user.id, {
            tier: "free-auth",
            cancelled_at: new Date().toISOString(),
          })
        }
        break
      }

      case "invoice.payment_failed": {
        // Log for manual review — don't downgrade immediately, Stripe
        // handles retries and the subscription.updated event will fire
        // with status=past_due or canceled if retries exhaust.
        console.warn(`[stripe-webhook] payment failed: ${event.id}`)
        break
      }

      default:
        // Unhandled event type — just acknowledge it
        break
    }

    return NextResponse.json({ received: true, type: event.type })
  } catch (e: any) {
    console.error(`[stripe-webhook] handler error:`, e)
    return NextResponse.json(
      { error: e?.message || "webhook handler failed" },
      { status: 500 },
    )
  }
}
