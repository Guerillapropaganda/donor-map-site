---
title: New Pipeline Checklist
type: checklist
scope: any new data ingestion pipeline touching an external API
last-updated: 2026-04-14
authority: Pipeline Research Protocol (CLAUDE.md)
---

# New Pipeline Checklist

Use this whenever you build a pipeline that pulls data from an external API (FEC, Congress.gov, SEC EDGAR, LDA, ProPublica, etc.) and writes it to the vault. The Pipeline Research Protocol in CLAUDE.md is the rule this checklist codifies.

## Phase 0 — Research (BEFORE any code)

- [ ] **Check `content/Pipeline Guide.md` first.** Does a cheatsheet exist for this API?
  - **Yes:** read it end-to-end. Check "Known quirks" + "Known incidents (our vault)" + "Quality signals". The entire subsequent pipeline must respect what's documented. Done with Phase 0.
  - **No:** continue to the next bullet.
- [ ] **Request Perplexity research from David.** Use the prompt template in `content/Admin Notes/perplexity-prompt-library.md` § "New pipeline cheatsheet". Wait for results. Do not start coding blind.
- [ ] **Write a new cheatsheet section in `content/Pipeline Guide.md`** following the existing format:
  - Identity, API access, Core endpoints, Identifiers
  - Canonical URL format for citations
  - Known quirks / gotchas (from public documentation)
  - Quality signals, Fallback sources, Recent changes
  - **Empty "Known incidents (our vault)" subsection** — filled in as incidents occur
- [ ] **If Perplexity can't find research**, revert to common REST logic AND add a prominent warning at the top of the cheatsheet: "No research available — implementation uses generic REST conventions. Every quirk discovered during implementation MUST be logged in 'Known incidents (our vault)'."

## Phase 1 — Implementation

### Authentication
- [ ] **Env vars match the GitHub Secret names** (not random new names). See existing pipelines for convention.
- [ ] **JWT "API key" trap check.** If the auth string starts with `eyJ`, it's a JWT, probably a session token, not a real key. Decode it (`atob` on the middle segment) and check `iss` / `exp`. LobbyView is the one legitimate JWT case.
- [ ] **No secrets committed.** `.env.example` with placeholder values only.

### HTTP layer
- [ ] **Rate limit + exponential backoff** — default: 429 handling with 2^N second backoff, max 5 retries
- [ ] **User-Agent header** set to something identifiable ("Donor Map Pipeline / thedonormap.org")
- [ ] **429 / 403 / 500 are retried; 404 / 400 / 422 are not**
- [ ] **All requests time out** — no indefinite hangs (30s default per request)

### Data writes
- [ ] **Citations route through `sources-store.cjs`** via `addOrFindSource({url, tier, source_type, entity_ref, ...})`. Returns a source ID.
- [ ] **Profile markdown references sources by `{{src:ID}}`** — never raw URL pasted into prose
- [ ] **Relationship edges route through `relationships-store.cjs`** — never frontmatter field writes
- [ ] **Entity records route through `entities-store.cjs`**
- [ ] **Class tags stay `status: proposed`** — never auto-approved. David approves via Ops `/class-tags`.

### Validation
- [ ] **Every record passes its schema validator before it's appended** to the canonical store
- [ ] **Foreign keys resolved before writing** — if citing entity X, confirm entity X exists in `entities.jsonl`
- [ ] **URL validation before citation** — don't register obviously broken URLs (empty, `javascript:`, `data:`, localhost)

### Operability
- [ ] **`--dry-run` mode** that logs intended writes without committing them
- [ ] **`--verbose` mode** for debugging
- [ ] **Batch size configurable** — default conservative, tunable for one-time backfills
- [ ] **Idempotent** — re-running on already-ingested data is a no-op, not a duplicate

### Error handling
- [ ] **Per-record errors are logged + skipped**, not fatal to the whole run
- [ ] **Fatal errors (auth failure, wrong endpoint) exit non-zero** with a clear message
- [ ] **Run summary at the end**: N records ingested, N skipped, N errored, top 5 error types

## Phase 2 — Verification

- [ ] **Dry run on a small sample** (10-50 records) before the full run
- [ ] **Spot-check 5 output records manually** against the API response to confirm field mapping
- [ ] **URL check** — pick 3 citations from the output, confirm they resolve to the right entity on the source site
- [ ] **Schema validator confirms the whole output set is clean** (`node scripts/phase-6-data-integrity-audit.cjs`)

## Phase 3 — Documentation

- [ ] **Pipeline Guide cheatsheet "Known incidents (our vault)" section** updated with anything surprising discovered during implementation. Include: root cause, fix commit hash, what quality-check would have caught it.
- [ ] **A pre-commit quality-check rule added** if the bug is the kind that could recur (e.g. "reject any source with title containing 'Just a moment'" → already in `sources-fingerprint.cjs`)
- [ ] **Ops `/scripts` page** updated to list the new pipeline with its schedule + owner

## What makes a pipeline ready for production

The pipeline is production-ready when:
1. Every checkbox in this file is checked.
2. It has run in dry-run at least once against real API data.
3. It has run in full mode at least once with no fatal errors.
4. The Pipeline Guide cheatsheet is complete, including the "Known incidents" section (even if empty).
5. The first production run's output has been spot-checked by a human.

Until then it's a prototype, not a pipeline.

## Shortcuts that are not allowed

- ❌ Writing a pipeline without a Pipeline Guide cheatsheet
- ❌ Writing a pipeline that pastes raw URLs into profile markdown (must use `{{src:ID}}`)
- ❌ Writing a pipeline that edits frontmatter relationship fields (must use `relationships-store.cjs`)
- ❌ Auto-approving class tags (David is the only approver)
- ❌ "Just ship it, document later" — the cheatsheet is the hand-off, without it the next pipeline bug is one you have no context to debug
