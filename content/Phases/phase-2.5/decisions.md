---
title: Phase 2.5 Mid-Phase Decisions
type: log
phase: 2.5
last-updated: 2026-04-14
---

# Phase 2.5 Mid-Phase Decisions

Decisions made during Phase 2.5 implementation that aren't big enough for a full ADR but need to be recorded for continuity.

---

## 2026-04-14 — Pre-install degraded mode

Every piece of Phase 2.5 code was written to import `@clerk/nextjs` and `stripe` **dynamically** with try/catch fallbacks, so the Ops app boots cleanly even before those packages are installed. Gated routes return 503 with setup doc pointers instead of crashing the app.

Rationale: lets the phase code ship and commit as a normal PR without forcing a simultaneous `npm install` commit that could break other sessions' builds. David runs `npm install` on his own timeline, everything activates automatically.

## 2026-04-14 — Middleware is pass-through, routes self-gate

First version of `middleware.ts` called `auth.protect()` on every non-public path. That broke the dashboard because internal API routes (for alerts, vault stats, pipeline health) returned HTML redirects to `/sign-in` instead of JSON, and the dashboard client code crashed on "Unexpected token '<'".

Rewrote middleware as a pure pass-through: Clerk context attached to every request, but no blocking. Individual route handlers self-gate via `requireTier()` / `requireAdmin()` from `lib/auth.ts`. Cleaner pattern anyway — gating lives next to the handler that needs it, not in a central middleware that has to understand every route's requirements.

## 2026-04-14 — TS-native users-store for Ops

Webpack can't follow `require(path.join(...))` dynamic requires into the scripts/lib CJS store at build time. First attempt was `ops/src/lib/auth.ts` using `createRequire` + dynamic path join; worked locally but failed at runtime with "Cannot find module users-store.cjs" because webpack bundled it as an empty context.

Fix: wrote `ops/src/lib/users-store.ts` as a full TS-native reader/writer that imports normally. The CJS version in `scripts/lib/users-store.cjs` stays for Node script consumers (seed-admin-user.cjs, etc). Both files write to the same `data/users.jsonl` — same source of truth, two language bindings.

**Rule for future stores:** if a store needs to be read from BOTH Node scripts AND the Ops Next.js runtime, write it twice (CJS + TS) and keep them in sync. Trying to share a single file via `createRequire` works for simple imports but breaks on dynamic paths.

## 2026-04-14 — Stripe activation deferred

David ran through the Clerk half of Phase 2.5 activation end-to-end during the live session. The Stripe half (creating 4 products, pasting price IDs + webhook secret into `.env.local`, testing the full subscribe flow with the test card) is deferred.

Rationale:
- Stripe activation isn't blocking any other phase. `/pricing` renders fine (it's public), Subscribe buttons return 503 with a setup pointer instead of crashing.
- Without Stripe config, the code path through `/api/stripe/checkout` exits cleanly before touching the Stripe SDK.
- Test-mode activation is the right first pass and requires no business verification. Real-money activation requires business entity + tax info + bank setup, which David will do when actually taking payments.

**Unblocking cost when David is ready:** ~20 minutes of clicking through Stripe dashboard. Full walkthrough in `content/Admin Notes/phase-2.5-setup.md` steps 3-7.

**What still works without Stripe:** Clerk auth, tier gating, admin bypass, rate limits, `/account`, and the 3 existing gated API routes (`/api/query`, `/api/class-tags`, `/api/source-registry`). Phase 3 profile data panels and Phase 2.75 policy pages unaffected — they're public static content.

## 2026-04-14 — Admin promotion via email match, not Clerk id

`scripts/seed-admin-user.cjs` takes an `--email` argument and looks up the existing user record by email (case-sensitive match). This is what David uses to bootstrap himself after first sign-up.

Alternative would be taking `--clerk-id user_xxx` directly, but that requires David to first go find his Clerk user id in the Clerk dashboard, which is friction. Email is what he already knows.

The lazy-create flow in `auth.ts#currentUser()` backfills `clerk_id` on first `/account` visit, so by the time David runs seed-admin-user, the record already exists with the right clerk_id linked. The script just flips `tier: admin` and `is_admin: true` on the existing record.
