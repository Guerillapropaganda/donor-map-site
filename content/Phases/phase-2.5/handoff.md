---
title: Phase 2.5 Handoff — Auth & Gating
type: handoff
phase: 2.5
status: partial-shipped
last-updated: 2026-04-14
---

# Phase 2.5 Handoff

## Current state

**Sprint 1 shipped + Clerk activated end-to-end. Stripe activation deferred.**

Commits: `7d96757d2` (code foundation), `22b01376b` (activation scaffolds), `9cb9a68c4` (sidebar nav + Ops services).

David walked through Clerk setup live during the 2026-04-14 session:
- Signed up clerk.com admin account (via GitHub OAuth)
- Created Clerk application, copied publishable + secret keys
- Wrote `ops/.env.local` with Clerk keys (via PowerShell, not Notepad — avoided the "Notepad-saves-to-wrong-folder" trap)
- Signed up as first user at `localhost:3333/sign-up`
- Ran `scripts/seed-admin-user.cjs --email ...` to promote to admin
- Verified `/account`, `/sources`, `/class-tags`, `/query` all accessible with admin bypass

Four sequential runtime bugs surfaced during activation and were fixed:
1. Env file named `.env.local.example` instead of `.env.local` — Windows/Notepad issue, renamed
2. Clerk v7 middleware API change: `auth().protect()` → `auth.protect()` — fixed in `middleware.ts`
3. Middleware force-protecting every non-public path broke internal dashboard API JSON responses (returned HTML redirects) — rewrote middleware as pass-through, routes self-gate
4. Webpack couldn't follow `require(path.join(...))` into CJS users-store — wrote TS-native `ops/src/lib/users-store.ts`

## What's shipped

Stores (CJS for scripts, TS for Ops):
- `scripts/lib/users-schema.cjs` + `users-store.cjs` — Tier enum, tierAtLeast(), record validator
- `ops/src/lib/users-store.ts` — TS-native mirror for Next.js runtime (webpack can't follow dynamic CJS requires)

Auth helpers (`ops/src/lib/`):
- `auth.ts` — currentUser(), requireTier(), requireAdmin() with graceful Clerk SDK degradation
- `rate-limit.ts` — file-backed daily + per-minute counters in `data/.rate-limits.json`

Middleware (`ops/src/middleware.ts`):
- Pass-through after bugfix #3. Clerk context attached to requests; individual routes self-gate via `requireTier()` / `requireAdmin()`.

Stripe routes (graceful degrade without config):
- `api/stripe/checkout/route.ts` — POST creates Checkout session, requires free-auth
- `api/stripe/webhook/route.ts` — handles 4 event types (completed, updated, deleted, payment_failed)

UI:
- `/account` — tier dashboard, rate limits, upgrade CTA
- `/pricing` — 4-tier public comparison, Stripe Checkout trigger
- `/sign-in/[[...sign-in]]` + `/sign-up/[[...sign-up]]` — Clerk-rendered auth forms
- `<ClerkProvider>` wrapping `app/layout.tsx`

Gates applied:
- `/api/query` — `requireTier("free-auth")` + daily + per-minute rate limits (returns 429 with Retry-After)
- `/api/class-tags` — `requireAdmin()` on GET + PATCH
- `/api/source-registry` — `requireAdmin()` on GET + PATCH

Navigation:
- Sidebar updated with 5 new nav items: /sources, /class-tags, /query, /account, /pricing

Setup doc: `content/Admin Notes/phase-2.5-setup.md` (8 steps, test mode first)

Ops Operations page:
- Clerk + Stripe added to services list with WHY/WHAT IT DOES notes
- Clerk + Stripe added to costs list (Clerk free up to 10k MAU, Stripe 2.9% + 30¢/txn usage-based)

## What's deferred (Stripe activation)

Steps 3-7 of `content/Admin Notes/phase-2.5-setup.md`:
- Create 4 Stripe products (Researcher $20/mo, Student $10/mo, Newsroom $150/mo, Patron $500 one-time)
- Copy 4 price IDs + Stripe secret key
- Create webhook endpoint + copy signing secret
- Append Stripe block to `.env.local`
- Test full signup → checkout → tier upgrade flow with test card 4242

**Unblocking cost:** ~20 minutes of clicking through Stripe dashboard. Test mode only; real-money mode requires business entity + tax info + bank setup.

**What still works without Stripe:** everything else in Phase 2.5 (Clerk auth, tier gating, admin bypass, rate limits, `/account`, gated API routes). Only impact: clicking Subscribe on `/pricing` returns 503 with a pointer to the setup doc instead of charging anyone.

## Exit criteria

- [x] Clerk SDK installed
- [x] ClerkProvider wraps Ops app
- [x] Sign-in / sign-up routes created
- [x] User store + schema
- [x] Auth helpers (requireTier, requireAdmin)
- [x] Rate limit counters
- [x] Middleware pass-through + route-level gating
- [x] `/account` + `/pricing` pages
- [x] 3 existing API routes gated
- [x] Sidebar navigation entries
- [x] Ops Operations page lists Clerk + Stripe
- [x] Setup doc for activation
- [x] David activated Clerk end-to-end
- [ ] Stripe SDK installed (comes with @clerk/nextjs install — already done)
- [ ] Stripe products created (**deferred**)
- [ ] Stripe webhook endpoint configured (**deferred**)
- [ ] `.env.local` populated with Stripe keys (**deferred**)
- [ ] Full subscribe → checkout → tier upgrade verified (**deferred**)
- [ ] Phase 2.5 retrospective written (**after Stripe ships**)

## Next session pickup (when David is ready)

Read `content/Admin Notes/phase-2.5-setup.md` steps 3-7. That walkthrough was written specifically for the Stripe half. Should take ~20 minutes including account creation.

No code changes expected — everything in the codebase already handles Stripe gracefully. Activation is pure configuration.
