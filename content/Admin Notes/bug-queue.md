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

### bug-005: Enrichment pipeline dark — only 5 of ~25 pipelines running
- **reported:** 2026-04-15 (Pillar 2b investigation)
- **severity:** high
- **where:** `donor-map-engine` repo (external pipeline orchestrator); symptom visible in `content/Vault Maintenance/Auto-Enrichment Log.md` and in the enrichment-history API that feeds the Ops pipeline-health page
- **what:** Audit of the last 200 `API Enrichment Bot` commits shows only 5 pipelines have been running recently (`gleif`, `lda`, `ofac-sdn`, `propublica`, `stock-watcher`). The commits look normal — `API enrichment: 260 files (gleif:5 lda:7 ofac-sdn:22 propublica:13 stock-watcher:20)` — but the 20+ other pipelines in `ops/src/app/api/enrichment-history/route.ts`'s PIPELINE_LABELS map (congress, govtrack, usaspending, sec-edgar, courtlistener, fara, doj-press, federal-register, nonprofit-990, nhtsa-recalls, sec-litigation, lobbyview, fec, fec-summary, etc.) are SILENT.
- **specific FEC finding:** `fec-summary` ran exactly 3 times in the last 200 enrichment commits (April 10–11, 2026: `fec-summary:8`, `fec-summary:11`, `fec-summary:19`). Full `fec:N` (Schedule A/E receipts) has **never** appeared in any enrichment commit. This is why 1,098 pre-existing monetary edges in `data/relationships.jsonl` had null `amount` and null `cycle` — the pipeline that was supposed to fill them never ran.
- **impact:**
  - Policy donor tables look thin because per-donor amounts aren't in the canonical store (worked around by Pillar 2b.1 body-table migration, but that's a one-time backfill, not a durable fix).
  - Any non-FEC pipeline that depends on an ID the vault hasn't acquired (e.g. `fec-candidate-id` missing on 546 of 730 politicians) stays empty.
  - Enrichment-history dashboard shows inflated "files changed" counts that don't reflect actual work (the counts include pending-merge log additions, not real vault mutations).
- **root cause:** Unknown — must be diagnosed in the `donor-map-engine` repo. Suspects: (1) env config dropping pipeline entries, (2) silent per-pipeline failures swallowed by the orchestrator, (3) a quiet commit that shrank the default pipeline list after April 11.
- **workaround:** None in this repo. Pillar 2b body-table migration extracted the amounts the `fec-summary` pipeline DID emit (in April) into the canonical store. Future enrichment data requires the pipelines to actually run.
- **next step:** Diagnose in `donor-map-engine` — look at recent commits + orchestrator config + per-run logs. Once fixed, the new FEC Committee Registry (`data/fec-committee-registry.json` + `scripts/lib/fec-committee-registry.cjs`) should be plumbed into the `fec-summary` pipeline so it writes both body tables AND structured edges via `upsertEdges()` on the same run.

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
