#!/usr/bin/env node
/**
 * migrate-ops-add-clerk-stripe.cjs — Phase 2.5
 *
 * Adds Clerk and Stripe service + cost entries to the Ops app's
 * cost-tracker.json file. Idempotent: no-op if they're already there.
 *
 * The seed data in ops/src/app/api/operations/route.ts has these
 * entries, but new installs auto-seed on first access. Existing
 * installs (where cost-tracker.json already exists) need this
 * migration to pick up the new entries.
 *
 * Run this once after pulling the Phase 2.5 activation scaffolds.
 *
 * Usage:
 *   node scripts/migrate-ops-add-clerk-stripe.cjs              # dry-run
 *   node scripts/migrate-ops-add-clerk-stripe.cjs --write
 */

const fs = require("fs")
const path = require("path")

const WRITE = process.argv.includes("--write")

const COSTS_FILE = path.join(
  __dirname,
  "..",
  "ops",
  "data",
  "cost-tracker.json",
)

const now = () => new Date().toISOString()

const CLERK_SERVICE = {
  id: "svc-clerk",
  name: "Clerk",
  accountEmail: "",
  plan: "Free (up to 10k MAU)",
  signupDate: "2026-04-14",
  loginUrl: "https://dashboard.clerk.com",
  notes:
    "WHY: authentication for the Ops app + subscriber tier gating (Phase 2.5). WHAT IT DOES: email/password + OAuth sign-in, session cookies, password reset, email verification. Our code integrates via @clerk/nextjs — see content/Admin Notes/phase-2.5-setup.md for the full setup walkthrough.",
  updatedAt: now(),
}

const STRIPE_SERVICE = {
  id: "svc-stripe",
  name: "Stripe",
  accountEmail: "",
  plan: "Standard (2.9% + 30¢/txn)",
  signupDate: "2026-04-14",
  loginUrl: "https://dashboard.stripe.com",
  notes:
    "WHY: payment processing for Researcher ($20/mo), Newsroom ($150/mo), Patron ($500 one-time), and Researcher Student ($10/mo) tiers. WHAT IT DOES: Stripe Checkout handles the payment page, recurring billing, cancellation flow, receipts, chargebacks, tax. We never touch card numbers ourselves. Webhook at /api/stripe/webhook receives subscription state events and updates user tier in data/users.jsonl. Setup: content/Admin Notes/phase-2.5-setup.md.",
  updatedAt: now(),
}

const CLERK_COST = {
  id: "clerk",
  service: "Clerk",
  category: "tools",
  amount: 0,
  billingCycle: "monthly",
  startDate: "2026-04-14",
  notes:
    "Auth provider — login, signup, session management for the Ops app and any paid-tier gating. Free tier covers up to 10,000 monthly active users; no charge until we outgrow that.",
  updatedAt: now(),
}

const STRIPE_COST = {
  id: "stripe",
  service: "Stripe",
  category: "tools",
  amount: 0,
  billingCycle: "usage-based",
  startDate: "2026-04-14",
  notes:
    "Payment processor for Researcher/Newsroom/Patron subscriptions and student discount. Takes 2.9% + 30¢ per transaction — no monthly fee, cost scales with actual paid signups.",
  updatedAt: now(),
}

function main() {
  console.log("")
  console.log("═══ migrate-ops-add-clerk-stripe ═══")
  console.log(`  target:  ${COSTS_FILE}`)
  console.log(`  dry-run: ${!WRITE}`)
  console.log("")

  if (!fs.existsSync(COSTS_FILE)) {
    console.log(
      "  cost-tracker.json doesn't exist yet — nothing to migrate. The seed will populate it on first /api/operations request.",
    )
    return
  }

  const data = JSON.parse(fs.readFileSync(COSTS_FILE, "utf-8"))
  if (!Array.isArray(data.services)) data.services = []
  if (!Array.isArray(data.costs)) data.costs = []

  const hasClerkSvc = data.services.some((s) => s.id === "svc-clerk")
  const hasStripeSvc = data.services.some((s) => s.id === "svc-stripe")
  const hasClerkCost = data.costs.some((c) => c.id === "clerk")
  const hasStripeCost = data.costs.some((c) => c.id === "stripe")

  const changes = []

  if (!hasClerkSvc) {
    data.services.push(CLERK_SERVICE)
    changes.push("added service svc-clerk")
  } else {
    console.log("  · svc-clerk already present — skipped")
  }

  if (!hasStripeSvc) {
    data.services.push(STRIPE_SERVICE)
    changes.push("added service svc-stripe")
  } else {
    console.log("  · svc-stripe already present — skipped")
  }

  if (!hasClerkCost) {
    data.costs.push(CLERK_COST)
    changes.push("added cost clerk")
  } else {
    console.log("  · cost clerk already present — skipped")
  }

  if (!hasStripeCost) {
    data.costs.push(STRIPE_COST)
    changes.push("added cost stripe")
  } else {
    console.log("  · cost stripe already present — skipped")
  }

  if (changes.length === 0) {
    console.log("")
    console.log("  no changes needed — file already up to date")
    return
  }

  for (const change of changes) {
    console.log(`  + ${change}`)
  }

  if (WRITE) {
    const tmp = COSTS_FILE + ".tmp"
    fs.writeFileSync(tmp, JSON.stringify(data, null, 2), "utf-8")
    fs.renameSync(tmp, COSTS_FILE)
    console.log("")
    console.log("  file updated")
  } else {
    console.log("")
    console.log("  DRY RUN — re-run with --write to persist")
  }
}

main()
