---
title: Bug Queue
type: admin-note
note-type: bug
status: active
last-updated: 2026-04-29
note-kind: ticket
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


### bug-009: audit-thesis-data-vs-sources voteview rollcall parser uses bioguide where voteview keys by ICPSR
- **reported:** 2026-04-30
- **severity:** low
- **where:** scripts/audit-thesis-data-vs-sources.cjs (Audit 3, currently deferred)
- **what:** voteview.com rollcall pages render member positions in JSON keyed by ICPSR member ID, not bioguide. The original audit pass tried to bioguide-grep the rendered page; 10 fetches landed inconclusive. Audit 3 has been disabled in code; positions are validated transitively via Audit 2 (clerk.house.gov / senate.gov which use bioguide).
- **next:** if positions audit becomes a priority, load HSall_members.csv (already in data/bulk/), build a bioguide → icpsr map at fetch time, then match against voteview's ICPSR-keyed JSON.
- **linked fetch ids (ADR-0030 §9):** caf_8ee17df873fc, caf_b9050743d8eb, caf_ffc4ff4f14b6, caf_5431165d981e, caf_95a6de903dc0, caf_ea2ef1554f19, caf_28b5a8e10ec8, caf_c2022b100fc8, caf_1ad20be8ec03, caf_8770040fc21d

### bug-010: audit-thesis-data-vs-sources Senate XML schema variance — older votes use unrecognized result tag pattern
- **reported:** 2026-04-30
- **severity:** low
- **where:** scripts/audit-thesis-data-vs-sources.cjs Audit 2
- **what:** 6 of 30 sampled senate.gov fetches returned XML with a result tag pattern the regex didn't recognize. The 4 most recent regex updates handle the modern shape (`<vote_result>` / `<vote_result_text>`). Older votes likely use a third schema variant. Spot-check confirmed clerk.house.gov + senate.gov are reachable (status=ok); the parser just didn't extract.
- **next:** curl one of the affected XMLs, add a fourth fallback regex. Low priority — 80% of Audit 2 samples verified successfully.
- **linked fetch ids (ADR-0030 §9):** caf_87f0e6026fc7, caf_775f0e867635, caf_e47b3e72e38f, caf_1eb4e5f1fe5d, caf_56e28e9a7928, caf_b19aafcde743

### bug-008: votes.jsonl Senate `result` field overcaptured XML markup (RESOLVED)
- **reported:** 2026-04-30
- **resolved:** 2026-04-30 (fix-votes-jsonl-result-corruption.cjs, commit 809ddbdd7)
- **severity:** high
- **where:** data/votes.jsonl, all senate.gov-sourced records
- **what:** 949 of 24,023 vote records (4.0%, all Senate) had corrupted `result` field where the regex captured XML markup beyond the canonical `<vote_result>` tag content. Pattern was always: `"{clean text} ({tally})</vote_result_text>...<vote_result>{clean text}"`. Surfaced by audit-thesis-data-vs-sources.cjs spot-checking against senate.gov source XML. The current ingest-congress-votes.cjs regex extracts cleanly when re-tested — corruption pre-dates the current code.
- **fix:** scripts/fix-votes-jsonl-result-corruption.cjs runs three fallback strategies (last `<vote_result>` tail, then pre-paren prefix, then pre-tag prefix). 949 records repaired, 0 give-ups.
- **linked fetch ids (ADR-0030 §9):** caf_248871872b70, caf_336def7b738c, caf_a0e91bd598a7
- **verify:** spot-check `s465-117.1` — should read `"result": "Nomination Confirmed"` (was 350+ chars of XML garbage).


### bug-007: Pre-existing data corruption: 18 profiles have "content-readiness: ready" injected into central-thesis text where dollar amounts (e.g. , ) used to be
<!-- auto-bug-key: 2b05384c308c -->
<!-- auto-resolve-when: regex=^# (RESOLVED) source=content/Admin Notes/data-corruption-fix-2026-04-29.md -->
- **reported:** 2026-04-29
- **severity:** high
- **where:** content/Politicians/**/_*.md (~18 files)
- **what:** 18 profiles in the vault have central-thesis text like "(content-readiness: ready65K+)" where the original was "(5K+)". Caused by a prior reclassify script with a String.replace() backreference bug. Tom Cotton, JD Vance, Joe Biden, Greg Abbott, Joe Manchin, etc. Discovered 2026-04-29 while building Phase 2C mechanical-readiness-promotion. The files need editorial repair (substitute "content-readiness: ready" back to the original dollar amount). Affected files: ops-audit-2026-04-23.md (admin note, separate), Tom Cotton, John Boozman, Deb Fischer, Carlos Gimenez, Sarah Huckabee Sanders, Greg Abbott, Joe Manchin, Joe Biden, Summer Lee, Saikat Chakrabarti, Amy Acton, Brett Kavanaugh, Steve Bannon, Volodymyr Zelenskyy, Rick Scott, Glenn Youngkin, Dick Cheney.
- **producer:** data-corruption-discovery (auto-logged)
- **discovered-during:** ADR-0029 Phase 2C build
- **affected-count:** 18

## resolved (archive)

### bug-006: Smoke test bug entry
<!-- auto-bug-key: 7f0b2a60b89a -->
<!-- auto-resolve-when: file-exists=scripts/lib/this-file-does-not-exist.cjs -->
- **reported:** 2026-04-29
- **resolved:** 2026-04-29 (smoke test cleanup)
- **severity:** low
- **where:** scripts/lib/bugs-store.cjs
- **what:** Just a smoke test — should auto-resolve when this file is gone
- **producer:** test (auto-logged)

---

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
