---
title: "ADR-0006: Phase 1 Shipped — Source Registry Live"
type: decision
adr: 6
date: 2026-04-14
status: approved
authors: [Code Claude, David]
extends: ADR-0003
closes: [phase-1]
---

# ADR-0006: Phase 1 Shipped — Source Registry Live

## Context

Phase 1 of the query engine build (per ADR-0003) shipped on 2026-04-14 in a single long session. This ADR records the transition ceremony, documents the mid-phase decisions worth preserving, and bridges to Phase 2 (Query Engine MVP).

## What was built

**Foundation layer:**
- `scripts/lib/sources-schema.cjs` — schema definition, validator, URL normalization for dedupe
- `scripts/lib/sources-store.cjs` — reader/writer API with lazy cache + in-memory URL + ID indexes
- `scripts/extract-sources-from-vault.cjs` — walks `content/**/*.md`, auto-classifies by host (100+ rules), registers via sources-store
- `scripts/sources-fingerprint.cjs` — fetches, hashes, classifies; includes bot-block detection (Cloudflare, HTTP 403 anti-scraping)
- `scripts/sources-orphan-report.cjs` — generates David's triage report

**Quartz integration:**
- `quartz/util/sources-store.ts` — read-only TS mirror for build-time
- `quartz/plugins/transformers/source-refs.ts` — resolves `{{src:ID}}` at the `textTransform` stage

**Ops integration:**
- `ops/src/lib/sources-store.ts` — TS mirror with read + write API
- `ops/src/app/api/source-registry/route.ts` — GET (query/filter) + PATCH (status update)
- `ops/src/app/sources/page.tsx` — full review UI

**Pipeline migration proof:**
- `scripts/migrate-fec-citations-to-refs.cjs` — 907 citations converted across 456 profiles, verified end-to-end via Quartz build + render spot-check on Manchin

**Data shipped:**
- `data/sources.jsonl` — 14,681 unique sources, all classified (9,555 live, 3,317 archived, 1,041 needs_review, 539 dead, 135 paywall, 52 redirected, 42 generic_orphan, 0 unverified)
- `content/Admin Notes/orphan-citations-report.md` — 1,622 flagged sources across 784 entities

**Documentation:**
- CLAUDE.md — "Query Engine & Source Registry" section with core rules and registry discipline
- `content/Vault Rules.md` — Section 4b "Structured Data Layer" + updated Pipeline Data Protocol
- `content/Pipeline Guide.md` — Section 0 "Source Registry First" with the pipeline-adoption pattern

## Mid-phase decisions worth preserving

### Bot-block classifier is mandatory from day 1
The first fingerprint run mis-classified Cloudflare-protected sites (Bloomberg, Forbes, Reuters, WSJ) as `dead` because they return HTTP 403 or challenge pages to non-browser User-Agents. Fixed mid-session with `BOT_BLOCK_TITLE_RE` and `BOT_BLOCK_BODY_RE` that catch "Just a moment...", "Are you a robot?", Cloudflare Ray IDs, `__cf_chl` markers. HTTP 403 reclassified from `dead` to `needs_review` since it's almost always anti-scraping, not a 404.

**Lesson for any future fetch-based classifier:** HTTP 200 isn't proof of content validity, and HTTP 403 isn't proof of content absence. Always include explicit anti-scraping detection.

### In-repo migration script beats cross-repo refactor
ADR-0003 named "the FEC pipeline" as the Phase 1 migration target. That pipeline lives in `~/donor-map-engine`, a separate workspace — modifying it from this worktree violates "stay in the worktree" discipline. The v1 approach: write an in-repo migration script that walks the vault and converts existing raw citations to refs. This proved the pattern end-to-end without touching the engine repo, AND deduplicated citations across profiles, AND gave David an immediately cleaner vault state.

**Lesson:** migrations are cheaper when you treat the existing vault state as the source of truth and convert in-place, rather than trying to change upstream pipeline code first.

### Ops API route collision required runtime discovery
Pre-existing `/api/sources` route (for the Source Hunter feature) collided with the planned new route. Discovered mid-implementation when `git add` silently refused to stage the new Write tool output — the Ops dev server had a file lock on the existing route. Resolution: renamed new route to `/api/source-registry`, kept pre-existing Source Hunter at `/api/sources`. Cost ~15 minutes to discover + clean up.

**Lesson:** before writing a new Ops API route, `ls ops/src/app/api/` to check for namespace collisions. The naming convention for the two routes is now documented in CLAUDE.md.

### Parallel session conflict resolution
Another Code Claude session ran concurrently on 2026-04-14 (relationship engine audit + vault cleanup, ~900 files). Session-save merge required hand-resolution in `Session State.md` and `sprint-schedule.md` plus renumbering of `cc_85-92` → `cc_99-106` to avoid sprint-schedule ID collision. Both sessions' work landed cleanly.

## Lessons learned

1. **Schema validators in separate modules are load-bearing.** `sources-schema.cjs` as its own file let the Quartz TS mirror, Ops TS mirror, API routes, and store helpers all reuse the enum definitions without reimplementing.
2. **Lazy-load caches with explicit clear are the right shape** for any build-time reader. `loadSources()` + `clearSourcesCache()` pattern carries forward to Phase 2.
3. **`textTransform` is the right Quartz hook for ref resolution** because downstream plugins see resolved markdown links. Use the same hook for future `{{claim:ID}}`, `{{event:ID}}`, etc.
4. **Widen regexes in incremental passes.** The FEC migration took 3 sweeps (strict, widened, query-string). Committing between passes was safer than one-shot mega-regex attempts.
5. **Background long-running tasks free up the session.** The 25-minute fingerprint pass ran in the background while other work progressed.

## Tech debt documented (not addressed in Phase 1)

1. **Engine-repo pipeline migration backlog** — 9 pipelines in `~/donor-map-engine` still write raw URLs (FEC individual, Congress, LDA, ProPublica, SEC, GovTrack, USAspending, SAM, DOJ). Each needs its own in-repo migration script + follow-up engine-repo PR.
2. **~16 edge-case FEC citations** untouched by the migration (strikethrough archived URLs, wikilinks nested in markdown links, broken `*(source unavailable)*` markers). All intentional.
3. **29% "other" source_type classification** — ~5,341 sources don't match any host rule. David reclassifies via Ops `/sources` as he triages.
4. **Two `/sources`-adjacent Ops routes** with similar names (`/api/sources` Source Hunter vs `/api/source-registry` Phase 1 registry). Rename deferred to Phase 6 cleanup.
5. **No regression tests for the source registry.** 10/10 smoke tests passed during dev but aren't checked in. Phase 6 deliverable.
6. **Source fingerprint not scheduled to re-run.** Will be a Phase 6 add to `scripts/attention-dispatcher.cjs` as a weekly producer.
7. **`data/sources.jsonl` rewrite-whole-file persistence** is fine at 14,681 records, fragile at 100k. Revisit in Phase 6 if it matters.

## Deferred exit criteria items

- **Archive.org auto-archive for Tier 1** — deferred to Phase 6 (not a Phase 1 blocker, was aspirational)
- **Ops `/sources` bulk-select UI** — per-row dropdown covers the 80% use case; bulk selection deferred to Phase 6
- **Top-50 orphan triage** — deferred to David (the report is ready and waiting in `content/Admin Notes/orphan-citations-report.md`)
- **Ops runtime verification at <2s page load** — deferred to David (Next build has a pre-existing Turbopack workspace-root issue unrelated to Phase 1 code; `npm run dev` is unaffected)

## Phase 2 context (immediate next work)

Phase 2 is **Query Engine MVP** — ship a public `/query` page with class-analysis filters over the structured data stores. First concrete action: class tag batch proposal script (`scripts/batch-propose-class-tags.cjs`) for ~450 donors. See `content/Phases/phase-2/handoff.md` for the full pickup plan.

**Hard dependencies baked into Phase 2 schema (for Phase 2.75):**
- `events.jsonl.policy_id` (nullable)
- `events.jsonl.obstruction_type` (enum: `floor_vote`, `chair_bottled_up`, `filibustered`, `held_for_concessions`, `pocket_vetoed`, `procedural_kill`)
- `relationships.jsonl` edges queryable by capital_type aggregation (via join with `entity-class-tags.jsonl`)

These CANNOT be deferred without forcing a Phase 2.75 retrofit.

## What this closes

- Phase 1 scope (source registry foundation)
- The "are profiles going to stop embedding raw URLs" question (yes, via `{{src:ID}}` refs)
- The editorial firewall layer for citations (every citation goes through the registry, every registry entry has a status, editor triage is centralized in Ops `/sources`)

## What this opens

- Phase 2 work (class tagging + query engine + events.jsonl)
- Ongoing: source fingerprint drift (URLs rot over time, titles change, paywalls appear) — needs scheduled re-run in Phase 6
- Ongoing: engine-repo pipeline migration backlog
- Ongoing: David's triage of the 1,622 flagged sources in the orphan report

## Research Claude workflow changes

Research Claude should now:
1. **When researching new sources for a profile,** propose them through Ops `/sources` (or flag to Code Claude to register via `addOrFindSource`). Never embed raw URLs in profile bodies.
2. **Be ready for Phase 2 class tag proposals.** When Phase 2 class tagging starts, Research Claude will run the batch proposal script against the locked vocabulary in ADR-0001. Familiarize with `content/Class Tag Vocabulary.md` before that session.
3. **Existing profiles with raw FEC citations** have already been migrated to `{{src:ID}}` refs by the FEC pipeline migration. If Research Claude edits those profiles, preserve the `{{src:ID}}` refs — do not convert them back to raw markdown links.

Note added to Session State.md current phase section.
