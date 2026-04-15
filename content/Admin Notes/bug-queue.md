---
title: Bug Queue
type: admin-note
note-type: bug
status: active
last-updated: 2026-04-15
---

# Bug Queue

Single dumping ground for bugs David finds while using Ops. Format is
intentionally lightweight — just enough to triage. Every bug gets a
`bug-NNN` ID for referencing in commits + chat.

**How to add a bug:**

Option 1 — tell Claude in chat: "bug on the /query page — HTTP 401
after server restart" — Claude appends it here under the right section
with a new ID.

Option 2 — type it into this file yourself, no particular format needed.
Claude will normalize it on the next visit.

**Severity levels:**
- **blocker** — David can't do his job; drop everything and fix
- **high** — real functionality broken, workaround exists
- **medium** — rough edge, minor loss of function
- **low** — polish, nice-to-have, cosmetic

---

## open

*(no open bugs — all clear)*

---

## resolved (archive)

### bug-001: Clerk dev-mode sign-in fails ("Couldn't find your account")
- **reported:** 2026-04-15
- **resolved:** 2026-04-15 (ADR-0009, Pillar 1 auth audit)
- **severity:** blocker
- **where:** Ops sign-in page (`/sign-in`)
- **what:** After `npm install` + server restart, the Clerk sign-in form rejected `guerillapropaganda@proton.me` with "Couldn't find your account."
- **root cause:** Clerk's dev-mode instance is ephemeral. Three distinct failure modes identified in ADR-0009:
  - **Mode A** — Clerk dev-mode account ephemerality (accounts dropped by Clerk infrastructure events, OAuth provider config shifts between deploys)
  - **Mode B** — `clerk_id` drift after resets (new session has new clerk_id; our `addOrFindUser` has email fallback but it only fires when Clerk exposes the email to our code)
  - **Mode C** — undocumented recovery path (`seed-admin-user.cjs` + email-fallback both existed but weren't documented)
- **fixes shipped:**
  - `OPS_AUTH_BYPASS` dev escape hatch — primary local dev auth path (not a workaround). Set `OPS_AUTH_BYPASS=1` in `ops/.env.local`, restart dev, admin session.
  - Yellow banner on every page when bypass active + console warning every 60s
  - Sign-in page now shows a "locked out?" note with the bypass recovery steps
  - `currentUser()` logs a LOUD warning when it falls through to creating a new free-auth record (Mode C detector)
  - [ADR-0009](../Decisions/0009-auth-architecture.md) documents the auth architecture + failure modes + decision
  - [phase-2.5-setup.md § Recovery from Clerk lockout](./phase-2.5-setup.md) documents all three recovery paths
  - 21 auth smoke tests wired into pre-commit sentinel #9 + CI job to lock the architecture in place
- **long-term:** upgrade Clerk from dev-mode to production (~$25/mo) before public launch. Pre-launch checklist item, not foundation-phase blocker.

### bug-005: Enrichment pipeline dark — only 5 of ~25 pipelines running
- **reported:** 2026-04-15
- **resolved:** 2026-04-15 (this session)
- **severity:** high
- **root cause:** All 25+ pipelines were in a single api-enrichment.yml step with a 30-minute job timeout. Launched in parallel, most pipelines were killed by the timeout before completing. LDA additionally had a dead auth token (lda.senate.gov → lda.gov migration).
- **fix:** Redesigned orchestration into 5 batch workflows in `donor-map-engine`:
  - `batch1-bulk.yml` — ofac-sdn, stock-watcher, gleif, nhtsa-recalls (every 6 hrs, parallel, 25 min timeout)
  - `batch2-fecapi.yml` — fec, fec-summary, ftc, occ, fda (twice daily, SEQUENTIAL to avoid shared api.data.gov rate limit, 55 min timeout)
  - `batch3-congress.yml` — congress, committee, usaspending, sam, govtrack (twice daily, parallel)
  - `batch4-independent-gov.yml` — fara, federal-register, epa-echo, osha, courtlistener, voting-record, executive-orders, lobbying-contrib (twice daily, parallel)
  - `batch5-corporate.yml` — sec-edgar, propublica, nonprofit-990, opensanctions, wikipedia, fcc, public-accountability (once daily, parallel)
  - `api-enrichment.yml` — removed all schedules, now manual-only for debugging
  - LDA disabled: `api-config.cjs` lda entry set `disabled: true`, CSV import planned post-June 2026 migration
- **next:** FEC pipeline should write structured edges via `upsertEdges()` (open item for next session)

### bug-002: HTTP 401 on /query page Entities tab
- **reported:** 2026-04-15
- **resolved:** 2026-04-15 (same fix as bug-001)
- **severity:** high
- **where:** Ops `/query` page, Entities tab (first tab)
- **what:** Immediately returned HTTP 401 with a red banner. Every query subject had the same issue.
- **root cause:** same Clerk session ephemerality as bug-001 — `/api/query` calls `requireTier("free-auth")` which rejected the session because Clerk no longer recognized David's account.
- **fix:** resolved by the `OPS_AUTH_BYPASS` bypass shipped for bug-001. With the bypass active, `requireTier` returns a synthetic admin user so the 401 stops across every `/api/*` route including `/api/query`.
- **verify:** after activating `OPS_AUTH_BYPASS=1`, open `/query` and click the Entities tab — should return query results instead of 401.

*Entries move here when the `resolved` field is filled in. Keep this
section for the last 5-10 fixes as a quick "what recently changed"
reference.*

---

*This file is read by future Claude sessions. New bugs should be
appended to `## open` with the next available `bug-NNN` ID.*
