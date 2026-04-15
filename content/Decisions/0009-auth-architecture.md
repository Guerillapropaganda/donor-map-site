---
title: "ADR-0009: Auth Architecture — Clerk Dev-Mode + OPS_AUTH_BYPASS"
type: decision
adr: 9
date: 2026-04-15
status: approved
authors: [Code Claude, David]
closes: bug-001, bug-002
---

# ADR-0009: Auth Architecture — Clerk Dev-Mode + OPS_AUTH_BYPASS

## Context

Phase 2.5 (ADR-0002 monetization model) added Clerk-based authentication to the Ops app so tier-gating, rate limits, and admin privileges could be enforced on every `/api/*` route. The Ops app runs locally at `localhost:3333` and is currently David's sole surface for daily vault management.

On 2026-04-15 David hit a full lockout: the Clerk sign-in form rejected his email (`guerillapropaganda@proton.me`) with "Couldn't find your account," blocking him from his own Ops app. The same session also surfaced an HTTP 401 on the `/query` page (bug-002, same root cause). Investigation revealed that our auth architecture has three latent failure modes and that foundation-level documentation didn't exist for any of them.

This ADR documents what we found, the decisions we made, and the recovery paths.

## The three failure modes (all observed)

### Mode A — Clerk dev-mode account ephemerality
Our Clerk instance is a **development** environment (`pk_test_*` / `sk_test_*` keys). Dev-mode instances have documented limitations:
- 5-user cap on free-tier
- Accounts can be dropped across Clerk's own infrastructure events
- OAuth provider config can shift between deploys (especially the built-in "shared dev OAuth" providers Clerk provisions for new instances)
- Sessions can be invalidated by server restarts or env var changes

David's original signup was via OAuth (Google or GitHub — unclear from history). When he tried to sign in again today, Clerk's dev instance either no longer had his account, or the OAuth provider he originally used was no longer enabled. The email/password form on the current sign-in page rejected his email because it was never associated with an email/password identity, only an OAuth one.

### Mode B — clerk_id drift after Clerk resets
Even if David could successfully sign in again with a new identity method, Clerk would assign him a **new clerk_id**. Our user record in `data/users.jsonl` has:

```json
{"id":"usr_000001","clerk_id":"user_3CMoSUgVxqvsmJQ3cSCLmycOkMA","email":"guerillapropaganda@proton.me","tier":"admin","is_admin":true,...}
```

`currentUser()` in `ops/src/lib/auth.ts` first looks up by `clerk_id`. If a new Clerk session has a different `clerk_id` than the one stored, the lookup fails. The function then falls through to `addOrFindUser({clerk_id, email, tier:"free-auth"})`.

**Mitigating factor (discovered during investigation):** `addOrFindUser` in `ops/src/lib/users-store.ts` already has email-fallback matching. If the new `clerk_id` doesn't exist but the email matches an existing record, it backfills the new `clerk_id` onto that record and returns it. So admin status IS preserved across clerk_id drift, IF David can successfully complete a Clerk sign-in with the same email.

**Where this still breaks:** OAuth accounts don't always expose the email field to our `currentUser()` helper, so the fallback can miss.

### Mode C — Undocumented recovery path
Even with the `seed-admin-user.cjs` script and email-fallback mechanism both existing in the codebase, **no documentation surfaced the recovery path**. `content/Admin Notes/phase-2.5-setup.md` covered the happy path (activate Clerk, seed admin, sign in) but not the failure path (locked out, Clerk wiped account, need to rebind). David, trying to sign in, had no guidance beyond the sign-in form's own error message.

## Options considered

1. **Accept the failure modes, rely on David remembering the docs.** Rejected — this is exactly what just broke, and "remember the docs" is not a strategy.

2. **Upgrade to production Clerk (~$25/mo).** Partially accepted — production Clerk eliminates Mode A (accounts persist indefinitely) and makes Mode B much rarer (stable OAuth provider config). It does NOT eliminate Mode C (we'd still need recovery docs for the production-level failures that exist, e.g. Clerk outage, expired card, etc.). Worth doing BEFORE public launch; not urgent for foundation work.

3. **Rip out Clerk entirely, roll our own auth.** Rejected — auth is a solved problem David doesn't need to own. Clerk's bad path is dev-mode; production Clerk is fine.

4. **Keep `OPS_AUTH_BYPASS` as the primary dev path.** Accepted. The bypass (shipped earlier in this session) is a clean dev-only escape hatch: `OPS_AUTH_BYPASS=1` in `ops/.env.local` + dev server restart = synthetic admin user for all `requireTier`/`requireAdmin` calls. Guardrails: hard-disabled in production, loud console warning every 60s, yellow banner across every Ops page. Local dev never needs to fight Clerk.

5. **Document + strengthen the recovery path.** Accepted. Updates to `phase-2.5-setup.md`, explicit awareness in the sign-in page itself, and a more resilient `currentUser()` that logs loudly when it falls through to a new record.

## Decision

**Four-part decision, all shipping in this ADR's implementation commit:**

### 1. `OPS_AUTH_BYPASS` is the **primary** local dev auth path
Not an emergency escape hatch — the recommended default for running Ops locally. Clerk dev-mode is too ephemeral to depend on for daily work. The bypass:
- Returns a synthetic admin user from `currentUser`, `requireTier`, `requireAdmin`
- Only activates when `NODE_ENV !== "production"` AND `OPS_AUTH_BYPASS=1` in `.env.local`
- Banner on every page when active
- Server warning every 60s
- Production builds hard-disable it regardless of env var

### 2. Production Clerk is the launch gate, not the foundation gate
We upgrade to paid Clerk **before public launch**, not before. For every foundation-phase session, the bypass is the workflow. For every public-facing deploy with real users, Clerk must be in production mode. A pre-launch checklist item.

### 3. Sign-in page gets bypass-aware guidance
When `OPS_AUTH_BYPASS` is not set and the sign-in page is rendered in dev mode, show a subtle note at the bottom of the page:

> **Locked out?** This is a dev-mode Clerk instance. To bypass Clerk entirely, set `OPS_AUTH_BYPASS=1` in `ops/.env.local` and restart your dev server. See `content/Admin Notes/phase-2.5-setup.md` § "Recovery from Clerk lockout" for full instructions.

Cannot inject into the Clerk `<SignIn />` component itself (it's Clerk-owned), so we add the note outside the component in the sign-in page wrapper.

### 4. `currentUser()` logs fall-throughs
When a Clerk session exists but we can't find the user by clerk_id OR email, log a LOUD warning (not silent). This is the only way we'd ever detect Mode C happening again in the wild.

## Consequences

- David can always get back into his own Ops app in under 60 seconds via the bypass, regardless of what Clerk did.
- New developers don't need Clerk credentials to run Ops locally (onboarding simplification).
- The bypass leaves an unmistakable UI footprint so it can't accidentally ship to production.
- Production Clerk upgrade becomes a single line item on the pre-launch checklist, not an urgent blocker.
- `seed-admin-user.cjs` remains the recovery path for environments where the bypass isn't an option (e.g. future CI/staging environments).
- The recovery flow is now documented end-to-end in `phase-2.5-setup.md`.

## Closes
- bug-001 (Clerk dev-mode sign-in rejection)
- bug-002 (HTTP 401 on /query page — same root cause)

## What this opens
- **Pre-launch checklist item:** "Upgrade Clerk to production, disable bypass, verify Clerk session persists across server restart"
- **Future ADR candidate:** if/when we add staging environments, we need to decide whether the bypass stays dev-only or gets a staging-mode variant
- **Pillar 3 (Ops surface audit):** with auth stabilized, we can now systematically walk every Ops page and verify it works
