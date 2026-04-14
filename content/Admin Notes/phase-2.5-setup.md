---
title: "Phase 2.5 Setup — Clerk + Stripe"
type: admin-note
note-type: code
priority: normal
status: open
last-updated: 2026-04-14
authority: ADR-0002, ADR-0003
editor-vouched: true
---

# Phase 2.5 Setup — Clerk + Stripe

This is the step-by-step activation guide for Phase 2.5 Auth & Gating. All the code is shipped (`e8a00425c` → current); what's left is the external service setup only David can do (create accounts, paste secrets into `.env.local`).

The Ops app runs in a "pre-install degraded mode" until these steps are done — it boots, public routes work, but all gated routes return 503 with a pointer to this doc.

---

## Step 1: Install npm packages

```bash
cd ops
npm install @clerk/nextjs stripe
```

Two packages. ~15 MB total, no native dependencies. Don't commit yet — verify steps 2-4 work first.

---

## Step 2: Create Clerk application

1. Go to [clerk.com](https://clerk.com) and sign in
2. Create new application: **"The Donor Map"**
3. Enable sign-in methods: email + password (add Google / magic link if you want)
4. Go to **API Keys** in the Clerk dashboard
5. Copy the **Publishable Key** and **Secret Key**

---

## Step 3: Create Stripe products

In [Stripe Dashboard](https://dashboard.stripe.com) → Products:

| Product | Price | Billing | Notes |
|---|---|---|---|
| Researcher | $20.00 | monthly recurring | Main tier |
| Researcher (Student) | $10.00 | monthly recurring | 50% off, honor system |
| Newsroom | $150.00 | monthly recurring | Includes 3 team seats (manual) |
| Patron | $500.00 | one-time | Lifetime |

For each, copy the **price ID** (format: `price_1XXXXXXXXXXXXXXX`) — you'll paste them into `.env.local` below.

Also in Stripe Dashboard → Developers → API keys: copy the **Secret Key** (`sk_live_*` or `sk_test_*` for testing).

---

## Step 4: Set up Stripe webhook

In [Stripe Dashboard](https://dashboard.stripe.com) → Developers → Webhooks:

1. Click **Add endpoint**
2. Endpoint URL: `https://your-ops-domain.com/api/stripe/webhook` (or use Stripe CLI for local testing, see Step 6)
3. Select events to listen for:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_failed`
4. Copy the **Signing secret** (format: `whsec_*`)

---

## Step 5: Create `ops/.env.local`

```bash
# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_your_key_here
CLERK_SECRET_KEY=sk_test_your_secret_here
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/account
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/account

# Stripe
STRIPE_SECRET_KEY=sk_test_your_secret_here
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here

# Stripe price IDs (from Step 3)
STRIPE_PRICE_RESEARCHER=price_1_your_researcher_price_id
STRIPE_PRICE_RESEARCHER_STUDENT=price_1_your_student_discount_price_id
STRIPE_PRICE_NEWSROOM=price_1_your_newsroom_price_id
STRIPE_PRICE_PATRON=price_1_your_patron_price_id
```

`ops/.env.local` is gitignored by Next.js by default. Never commit it.

---

## Step 6: Test locally with Stripe CLI

For webhook testing on localhost, install the [Stripe CLI](https://stripe.com/docs/stripe-cli) and run:

```bash
stripe login
stripe listen --forward-to localhost:3333/api/stripe/webhook
```

The CLI prints a webhook signing secret — paste that into `STRIPE_WEBHOOK_SECRET` in `.env.local` for local testing. (Use the real signing secret from Step 4 in production.)

Then in another terminal:

```bash
cd ops
npm run dev
```

Visit `http://localhost:3333/pricing`, click **Subscribe** on the Researcher tier — you'll be bounced to Clerk sign-in (if not logged in), then to Stripe Checkout, then redirected to `/account` with your tier upgraded.

---

## Step 7: Seed yourself as admin

First time you sign up via Clerk on localhost, the system auto-creates a free-auth user record in `data/users.jsonl`. To bump yourself to admin, run:

```bash
node scripts/seed-admin-user.cjs --email your@email.com
```

(Or edit `data/users.jsonl` directly and set `"is_admin": true` on your record.)

Admin bypasses ALL tier gates and rate limits. You need admin for `/api/class-tags`, `/api/source-registry`, and `/sources` / `/class-tags` UI pages — they check `requireAdmin()`.

---

## Step 8: Verify the gates

### `/api/query`
- Anonymous: `401 authentication required`
- Free-auth user: 5 queries/day, then `429 rate limit (daily)`
- Researcher+: unlimited queries, 60/minute cap
- Admin: unlimited everything

### `/api/class-tags` + `/api/source-registry`
- Non-admin: `403 admin access required`
- Admin: full access

### `/pricing`
- Public — anyone can view
- Subscribe button POSTs to `/api/stripe/checkout`
- Anonymous click → redirected to `/sign-in`
- Free-auth click → redirected to Stripe Checkout

### `/account`
- Shows current tier, renewal date, rate limit overview
- Shows "Upgrade" CTA if below researcher

---

## How the gates work (for reference)

Every gated route imports from `ops/src/lib/auth.ts`:

```typescript
import { requireTier, requireAdmin } from "@/lib/auth"

export async function GET(req: NextRequest) {
  const gate = await requireTier(req, "free-auth")  // or "researcher", or requireAdmin(req)
  if (!gate.ok) return gate.response!
  // gate.user is the authenticated UserRecord
  // normal handler logic here
}
```

Rate-limited routes also import `checkDailyLimit` / `checkPerMinuteLimit` from `@/lib/rate-limit`.

`requireTier` does:
1. Pull Clerk session → user id
2. Look up user record in `data/users.jsonl`
3. If user is admin → bypass
4. If user tier ≥ required tier → OK
5. Else return 401 (anonymous) or 402 (insufficient tier)

`requireAdmin` is the same but stricter — only `is_admin: true` users pass.

---

## Phase 2.5 data files

- `data/users.jsonl` — user records (clerk_id, email, tier, stripe_customer_id)
- `data/.rate-limits.json` — per-user rate counter (gitignored-worthy; daily auto-GC)

Both live in `data/` alongside the other Phase 2 stores. The schema is defined in `scripts/lib/users-schema.cjs`.

---

## Common problems

**"stripe SDK not installed"** — run Step 1, `npm install stripe` in ops/

**"STRIPE_SECRET_KEY not set"** — create `.env.local` per Step 5

**Webhook returns 400 `invalid signature`** — the `STRIPE_WEBHOOK_SECRET` in `.env.local` doesn't match the webhook endpoint's actual signing secret. For local testing with Stripe CLI, use the secret the CLI prints; for production, use the one from Step 4.

**`/sign-in` 404s** — Clerk's pre-built sign-in component needs a catch-all route. Add:
```
ops/src/app/sign-in/[[...sign-in]]/page.tsx
ops/src/app/sign-up/[[...sign-up]]/page.tsx
```
containing:
```typescript
import { SignIn } from "@clerk/nextjs"
export default function Page() { return <SignIn /> }
```

This is the standard Clerk pattern — skipped in this phase commit because it depends on @clerk/nextjs being installed first.

**"Failed to look up user record"** — `data/users.jsonl` might not exist yet. It's created on first sign-up. You can manually create it with an empty file.

---

## What's shipped in this phase commit

Code (all in the worktree, ready to activate):
- `scripts/lib/users-schema.cjs` — schema + tier enum + `tierAtLeast()`
- `scripts/lib/users-store.cjs` — reader/writer API
- `ops/src/lib/auth.ts` — `currentUser()`, `requireTier()`, `requireAdmin()`
- `ops/src/lib/rate-limit.ts` — daily + per-minute counters backed by `data/.rate-limits.json`
- `ops/src/middleware.ts` — Clerk auth middleware with graceful pre-install fallback
- `ops/src/app/api/stripe/checkout/route.ts` — Checkout session creator
- `ops/src/app/api/stripe/webhook/route.ts` — Webhook event handler (4 event types)
- `ops/src/app/account/page.tsx` — User tier + limits dashboard
- `ops/src/app/pricing/page.tsx` — 4-tier comparison with Stripe Checkout buttons
- `/api/query` updated: `requireTier("free-auth")` + daily + per-minute rate limits
- `/api/class-tags` updated: `requireAdmin()` on GET + PATCH
- `/api/source-registry` updated: `requireAdmin()` on GET + PATCH

Docs:
- This setup doc (`content/Admin Notes/phase-2.5-setup.md`)
- ADR for the phase lands in a separate commit after you verify the setup works

What's NOT in this commit (intentional):
- `@clerk/nextjs` / `stripe` npm packages (install yourself in Step 1)
- `ops/.env.local` (Step 5)
- Clerk sign-in/sign-up catch-all routes (add after Step 1)
- Actual Clerk app / Stripe account (Steps 2, 3, 4)

---

**Ready when you are.** Work through Steps 1-8 in order. Each step is independently verifiable — if Step 5 env vars fail, the routes return 503 with a pointer to this exact doc.
