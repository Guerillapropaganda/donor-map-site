---
title: Phase 1 Retrospective
type: retrospective
phase: 1
date: 2026-04-14
status: shipped
duration: 1 session (long)
---

# Phase 1 Retrospective — Source Registry + Generic-Link Cleanup

## What shipped

**11 of 11 deliverables** complete. Phase 1 closed in a single long session (2026-04-14 planning + implementation), which was faster than the 2–3 session estimate in ADR-0003.

### Foundation (morning planning + first afternoon commits)
- ADRs 0001, 0002, 0003 (and later 0004, 0005) — the institutional-memory package
- `content/Class Tag Vocabulary.md` — locked 5-dimension schema
- `content/Monetization Model.md` — facts free, tools paid
- `content/Build Phases.md` — 8-phase sequential build plan (including Phase 2.75 + Phase 6 added mid-session)
- `content/Phases/phase-1/` — handoff, exit-criteria, decisions
- `.claude/skills/phase-transition/SKILL.md` — ceremony for phase boundaries

### Code (afternoon)
- `scripts/lib/sources-schema.cjs` — schema + validator + URL normalization
- `scripts/lib/sources-store.cjs` — reader/writer API with lazy cache + dedupe index
- `scripts/extract-sources-from-vault.cjs` — walks vault, registers markdown links with auto-classification by host (100+ rules)
- `scripts/sources-fingerprint.cjs` — fetches, hashes, classifies with bot-block detection
- `scripts/sources-orphan-report.cjs` — generates David's triage report
- `scripts/migrate-fec-citations-to-refs.cjs` — FEC pipeline migration (907 refs across 456 profiles)

### Quartz integration
- `quartz/util/sources-store.ts` — read-only TypeScript mirror
- `quartz/plugins/transformers/source-refs.ts` — resolves `{{src:ID}}` at build time
- Registered in `quartz.config.ts` before ObsidianFlavoredMarkdown

### Ops integration
- `ops/src/lib/sources-store.ts` — TS mirror with read + write API
- `ops/src/app/api/source-registry/route.ts` — GET (query/filter) + PATCH (status update)
- `ops/src/app/sources/page.tsx` — full review UI with filter controls, paginated results, per-row status dropdown, toast feedback

### Data
- `data/sources.jsonl` — 14,681 unique sources registered, all classified
- `content/Admin Notes/orphan-citations-report.md` — 1,622 flagged sources across 784 entities, ready for David's triage

### Documentation updates
- CLAUDE.md — Query Engine & Source Registry section + Decision Log section
- content/Vault Rules.md — Structured Data Layer section 4b + Pipeline Data Protocol update
- content/Pipeline Guide.md — Section 0 "Source Registry First" with pipeline pattern

## Final registry state

```
Total sources:    14,681
  live:            9,555 (65%)
  archived:        3,317 (pre-existing strikethrough)
  needs_review:    1,041 (bot-blocked — classifier fix working)
  dead:              539 (genuine failures)
  paywall:           135
  redirected:         52
  generic_orphan:     42
  unverified:          0
```

## What took longer than expected

**Nothing significantly.** The fingerprint pass was the longest single operation (~25 minutes for 11,000 URLs), but it ran in the background while I worked on other tasks. The rest shipped faster than the ADR-0003 estimate because the 14,681 source population in a single extraction pass proved the store API at scale without any bottlenecks.

## What surprised us

### 1. Bot-block classifier drift
First fingerprint run mis-classified Cloudflare-protected sites (Bloomberg, Forbes, Reuters) as `dead` because they return HTTP 403 or Cloudflare challenge pages to non-browser User-Agents. Fixed mid-run with `BOT_BLOCK_TITLE_RE` and `BOT_BLOCK_BODY_RE` that catch "Just a moment...", "Are you a robot?", Cloudflare Ray IDs, `__cf_chl` markers. HTTP 403 specifically reclassified from `dead` to `needs_review`.

**Lesson:** any fetch-based classifier needs explicit anti-scraping detection from day 1. HTTP 200 isn't proof of content validity, and HTTP 403 isn't proof of content absence.

### 2. 21% citation reuse rate
18,587 raw markdown links deduped to 14,681 unique sources — each URL is cited ~1.3 times on average. Higher reuse than expected but not dramatic. Means fixing a broken URL in the registry propagates to ~1.3 profiles, which is meaningful but not transformative.

### 3. Ops API route collision
Pre-existing `/api/sources` route (for the Source Hunter feature — a government API search tool) collided with my planned new route. Discovered mid-implementation when `git add` silently refused to stage my Write tool's output because the Ops dev server had a file lock on the existing route. Resolution: renamed my new route to `/api/source-registry`, kept the pre-existing Source Hunter at `/api/sources`, restored the original file from git. Lost ~15 minutes to the discovery + cleanup.

**Lesson:** before shipping a new Ops API route, `ls ops/src/app/api/` to check for namespace collisions with pre-existing features. The `/sources` vs `/source-hunter` vs `/source-registry` naming is now documented in CLAUDE.md and Pipeline Guide.md.

### 4. Engine-repo cross-workspace complexity
The FEC pipeline that ADR-0003 named as "the pipeline to migrate" lives in `~/donor-map-engine`, a separate git repo. Modifying it from this worktree violates the "stay in the worktree" discipline. v1 migration approach: write an in-repo migration script that walks the vault and converts existing raw citations to refs. This proved the pattern end-to-end without touching the engine repo. The engine-repo pipeline migration is explicitly deferred to a follow-up PR, with the backlog of 9 engine-repo pipelines catalogued in `content/Phases/phase-1/decisions.md`.

### 5. Two parallel sessions on the same day
Another Code Claude session ran concurrently on 2026-04-14, doing a relationship engine audit + vault cleanup (900+ files). When I merged to v4 at session-save, there were conflicts in `Session State.md` and `sprint-schedule.md` that required hand-resolution (preserving BOTH sessions' work) and renumbering my `cc_85-92` tasks to `cc_99-106` to avoid collision with Session A's `cc_85-98`.

**Lesson:** when parallel sessions are live, session-save merges need manual conflict resolution in the shared state files. The `phase-transition` skill should eventually grow a conflict-detection hint, but that's Phase 6 work.

## Lessons to carry forward

### For Phase 2 (Query Engine MVP)
- **Schema validators first, not last.** `sources-schema.cjs` being a separate module was load-bearing — it meant the Ops TS mirror could reuse the enum definitions, and the query API could validate inputs without reimplementing logic. Repeat this pattern for `events.jsonl`, `entity-class-tags.jsonl`, `policies.jsonl`.
- **Lazy-load caches with explicit clear.** `loadSources()` + `clearSourcesCache()` is the right shape for any build-time reader. Quartz plugins call this pattern well.
- **`textTransform` is the right hook for ref resolution.** The Quartz `source-refs` plugin runs at the earliest stage, so downstream plugins (OFM wikilinks, CrawlLinks, TOC) see resolved markdown links. Use the same hook for any future ref-like patterns (`{{claim:ID}}`, `{{event:ID}}`, etc.).

### For the pipeline migration backlog
- **In-repo migration scripts are cheaper than cross-repo refactors.** For each pending engine-repo pipeline, write a `scripts/migrate-X-citations-to-refs.cjs` first, run it on the existing vault state, verify via Quartz build, then coordinate the engine-repo pipeline script change as a separate PR.
- **Widen the regex in incremental passes.** The FEC migration took 3 regex passes: strict patterns, widened link-text, query-string support. Running each pass end-to-end + committing before widening was safer than one-shot mega-regex attempts.

### For session discipline
- **Windows file locks by the Ops dev server silently break `git add`.** If a new file you just Wrote isn't showing up in `git status`, ask the user to close the Node app before debugging anything else.
- **Background fingerprint-style operations should use `run_in_background: true`** in the Bash tool. The blocking approach tied up the Bash tool during the 25-minute fetch run; the non-blocking approach let me keep working.
- **Concurrent sessions need renumbering awareness.** Before assigning `cc_NN` IDs at session-save, grep the schedule for the last used ID across ALL ranges (not just the obvious one).

## Tech debt introduced

### Acceptable (documented, deferred)
1. **Engine-repo pipeline migration** — 9 pipelines in `~/donor-map-engine` still write raw URLs. Migration backlog in `content/Phases/phase-1/decisions.md`. Will be addressed in follow-up PRs outside this phase.
2. **~16 edge-case FEC citations** not converted by the migration script:
   - Strikethrough archived URLs (intentional, per URL Manager convention)
   - Wikilinks nested inside markdown links (too risky)
   - Broken-string URLs with `*(source unavailable)*` markers (already flagged for triage)
   - URLs with no candidate ID in the path
3. **29% "other" source_type classification** — ~5,341 sources don't match any host rule in the extractor. Not a bug; David can reclassify via Ops `/sources` dropdown when he triages. Fingerprinting doesn't depend on classification.
4. **Two `/sources`-adjacent Ops routes** with similar names (`/api/sources` for Source Hunter, `/api/source-registry` for the Phase 1 registry). Naming is documented in CLAUDE.md but could be cleaner. Rename deferred to Phase 6 cleanup.

### Needs attention in Phase 2+
1. **No regression tests** for the source registry. `scripts/lib/sources-store.cjs` was validated via a 10/10 smoke test run during development, but those tests aren't checked in. Phase 6 scope — regression test suite is a Phase 6 deliverable.
2. **Source fingerprint is not scheduled to re-run.** The initial pass ran once on 2026-04-14. Sources will drift (URLs rot, titles change, paywalls appear). A scheduled re-fingerprint job is not yet wired up. Option: add to `scripts/attention-dispatcher.cjs` as a weekly producer. Phase 6 scope.
3. **`data/sources.jsonl` is append-only with full-file rewrite on every update.** At 14,681 records (~7.3 MB), this is fine. At 100k records this would start to hurt. Revisit in Phase 6 if/when it matters.

## Commit hashes (reference)

```
e3626410a  Phase 1 foundation (docs + schema + store + ADRs 0001-0003 + phase-transition skill)
778e2cf2d  Source extractor + 14,681 unique sources registered
d6c6e64ce  Fingerprint script v1
1881536ea  Bot-block classifier fix + orphan report script
39e167d9a  Phase 1 handoff mid-session update
9fac02d5e  Phase 2.75 Policy Battles planning (ADR-0004)
6b715e530  Fingerprint pass complete + orphan report generated
3fe0a0858  Session State + sprint schedule update (mid-session save)
6212147f5  Phase 6 Bug Hunt planning (ADR-0005)
35b1cc25b  Quartz {{src:ID}} transformer plugin + TS mirror
57b600724  Ops /sources review page + /api/source-registry
85283da96  Handoff update to 82%
354b107e9  FEC pipeline migration (907 citations, 456 files)
5efaff857  Handoff update to 91% + engine-repo backlog in decisions
```

## Exit criteria met

All 25 checkboxes in `content/Phases/phase-1/exit-criteria.md` are complete. See that file for the detailed verification state.

## Transition

Phase 1 is shipped. Running the `phase-transition` skill next to advance to Phase 2 (Query Engine MVP).
