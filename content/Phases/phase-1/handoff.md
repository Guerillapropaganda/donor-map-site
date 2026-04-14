---
title: Phase 1 Handoff — Source Registry + Generic-Link Cleanup
type: handoff
phase: 1
status: in-progress
last-updated: 2026-04-14
---

# Phase 1 Handoff

## Current state

**Schema + writer + extractor + fingerprint + orphan report all shipped this session. Fingerprint pass COMPLETE.** Registry populated with 14,681 unique sources, all classified. Session is ~55% of Phase 1 deliverables complete.

### Final source distribution (all 14,681 classified)
- **9,555 live** (65%)
- **3,317 archived** (pre-existing strikethrough from extraction)
- **1,041 needs_review** (bot-blocked, Cloudflare challenges, HTTP 403 — the bot-block classifier fix working as designed)
- **539 dead** (genuine fetch failures, 404s, DNS failures)
- **135 paywall** (NYT, WSJ, WaPo, Bloomberg, FT, Economist, New Yorker, Atlantic)
- **52 redirected** (host changed under us)
- **42 generic_orphan** (200 OK but landed on homepage/search — David's "generic links" problem)
- **0 unverified** (fingerprint pass complete)

### Orphan report status
`content/Admin Notes/orphan-citations-report.md` generated — 1,622 flagged sources across 784 entities, 11.0% of registry. Sorted by entity (most-flagged first). Ready for David's triage in Ops `/sources` when that UI lands.

## Exactly where to pick up

**Next concrete action:** write the Quartz plugin for `{{src:ID}}` ref resolution. Location: `quartz/plugins/transformers/source-refs.ts`. Reads `data/sources.jsonl` at build time via the TS mirror (to be written: `quartz/util/sources-store.ts` — port the CJS reader to TypeScript, read-only is fine for build-time). Matches `{{src:src_000123}}` in markdown body and replaces with proper `[title](canonical_url)` markdown links.

After that:
1. Test profile using `{{src:ID}}` refs (pick 3 with known sources)
2. Ops `/sources` review page
3. Pipeline migration (one enrichment script writes through sources-store)
4. Doc updates: CLAUDE.md, Vault Rules.md, Pipeline Guide.md
5. Phase 1 retrospective + `phase-transition` skill

## Files shipped this session

### Commit 1: `e3626410a` — Foundation docs + schema + store
- `content/Class Tag Vocabulary.md` — locked 5-dimension class-analysis vocab
- `content/Monetization Model.md` — tier map, non-negotiables, auth plan
- `content/Build Phases.md` — 6-phase sequential build doc
- `content/Phases/phase-1/` — handoff, exit-criteria, decisions
- `content/Decisions/0001–0003` — ADRs
- `.claude/skills/phase-transition/SKILL.md`
- `scripts/lib/sources-schema.cjs` — schema, validator, URL normalization
- `scripts/lib/sources-store.cjs` — reader/writer API, smoke tested 10/10

### Commit 2: `778e2cf2d` — Extractor + full-vault population
- `scripts/extract-sources-from-vault.cjs` — host classifier with 100+ rules
- `data/sources.jsonl` — 14,681 unique sources (from 18,587 raw links)

### Commit 3: `d6c6e64ce` — Fingerprint script v1
- `scripts/sources-fingerprint.cjs` — fetch, hash, classify (live/dead/generic_orphan/paywall/redirected)

### Commit 4: `1881536ea` — Bot-block detection fix + orphan report
- Fingerprint classifier fix: detects Cloudflare challenges, "Just a moment...", "Are you a robot?", Ray IDs, __cf_chl markers. HTTP 403 reclassified from dead to needs_review (usually anti-scraping, not 404).
- `scripts/sources-orphan-report.cjs` — generates triage report grouped by entity

## Exit criteria checklist

- [x] `scripts/lib/sources-schema.cjs` (schema + validator)
- [x] `scripts/lib/sources-store.cjs` (reader/writer API)
- [x] `scripts/extract-sources-from-vault.cjs` (vault walker)
- [x] `scripts/sources-fingerprint.cjs` (fetcher/classifier)
- [x] `scripts/sources-orphan-report.cjs` (triage report generator)
- [x] `data/sources.jsonl` populated with 14,681 deduped sources
- [ ] Fingerprint pass complete on all unverified sources *(in progress or just done)*
- [ ] `content/Admin Notes/orphan-citations-report.md` committed
- [ ] Quartz `{{src:ID}}` plugin
- [ ] Ops `/sources` review page
- [ ] At least one pipeline migrated to sources-store
- [ ] `CLAUDE.md`, `Vault Rules.md`, `Pipeline Guide.md` updated with new rules
- [ ] `npx quartz build` clean (no regressions)
- [ ] Phase 1 retrospective written

**Progress: ~91% (10 of 11 core deliverables shipped this session).**

### Deliverables shipped since the 55% checkpoint
8. **Quartz `{{src:ID}}` transformer plugin** (`quartz/plugins/transformers/source-refs.ts` + `quartz/util/sources-store.ts` TS mirror). Registered in `quartz.config.ts` right before `ObsidianFlavoredMarkdown`. Runs at `textTransform` stage so the resulting markdown links flow through every downstream plugin naturally. Unknown IDs (`src_999999`) left literal for editor visibility. Full-vault build verified: 2,279 files parsed in 32s, 8,673 emitted, 3 known-good refs resolved correctly in test profile output, exit 0.

9. **Ops `/sources` review page** (`ops/src/app/sources/page.tsx` + `ops/src/app/api/source-registry/route.ts` + `ops/src/lib/sources-store.ts`). Full filter controls (status, tier, source_type, host, entity, freetext search), 100-per-page pagination with status count summary row as clickable filter buckets, per-row status dropdown with optimistic update + toast feedback, atomic JSONL write via temp-file rename. Defaults to `needs_review` bucket (the 1,041-source triage pile from the bot-block classifier fix). API renamed from `/api/sources` to `/api/source-registry` to avoid collision with the pre-existing Source Hunter feature — that was a live discovery during implementation, documented in commit.

10. **FEC pipeline migration** (`scripts/migrate-fec-citations-to-refs.cjs` + 456 profile rewrites). First real pipeline migration under the new registry. Walks the vault, finds every markdown link pointing at fec.gov/data/candidate/ or /committee/ (plus ?tab= query strings), registers each URL through `sources-store.addOrFindSource` (deduped by URL normalization), rewrites the line to `{{src:ID}}`. Three incremental regex passes: strict patterns (425 files, 850 refs), widened patterns (31 files, 40 refs), query-string variants (15 files, 18 refs). **907 raw citations converted to refs across 456 files.** Zero new sources registered — all FEC URLs were already in the registry from Phase 1 extraction. Verified with `npx quartz build` (2,278 files parsed in 25s, 8,671 HTML emitted, exit 0) and end-to-end spot-check on Manchin's profile: `{{src:src_001301}}` renders as `<a href="https://www.fec.gov/data/candidate/S0WV00090/">MANCHIN, JOE III - Candidate overview | FEC</a>` with the real FEC title from the registry, not the original hand-written link text.

### Remaining Phase 1 work
1. **Documentation updates** — CLAUDE.md (Query Engine + Source Registry discipline sections), Vault Rules.md (Structured Data Layer section), Pipeline Guide.md (sources-store integration section). Pure writing, no code risk.
2. **Phase 1 retrospective** — written via `phase-transition` skill when transitioning to Phase 2.
3. **Engine-repo FEC pipeline migration** — deferred. The engine repo's `scripts/fec-summary-pipeline.cjs` still writes raw URLs at line 304. A future PR in `~/donor-map-engine` should adopt the `{{src:ID}}` pattern (via absolute-path require of the main repo's `sources-store.cjs` OR by emitting refs directly and relying on the post-run vault state). See `content/Phases/phase-1/decisions.md` for the detailed migration note.

## Decisions made this session

See `content/Phases/phase-1/decisions.md` — additions from this session:

### Host classification: tier defaults
Conservative classification. `.gov` fallback to `government_primary` tier 1. Wikipedia/Wikidata to `aggregator` tier 3 (reference, not primary). OpenSecrets stays tier 3 (demoted from Tier 1 per Vault Rules). Everything unrecognized is `other` with `tier: null` — David reclassifies in Ops UI.

### Bot-block handling (mid-run discovery)
First fingerprint run classified Bloomberg/Forbes/WSJ/Reuters pages as `dead` based on HTTP 403 or Cloudflare challenge pages. Fixed classifier to detect bot-walls by title regex (`Just a moment...`, `Are you a robot?`, `Access Denied`) and body markers (`cf-browser-verification`, `__cf_chl`, `Ray ID`). These reclassify as `needs_review` so David can eyeball in a real browser.

HTTP 403 specifically is now `needs_review` too — almost always anti-scraping, not a real 404.

### Paywall list
`nytimes.com, wsj.com, washingtonpost.com, bloomberg.com, ft.com, economist.com, thetimes.co.uk, newyorker.com, theatlantic.com`. Checked BEFORE fetch so we skip hitting them entirely. These stay as `paywall` status forever unless David manually re-checks.

### Classification philosophy
Default to `needs_review` when uncertain, `dead` only when there's genuine evidence (DNS fail, 404, 5xx, no bot-block signals). David can batch-triage in Ops UI. Better to over-flag than silently file a "dead" link that's actually bot-walled.

## Known issues / surprises

1. **Windows illegal-char directories** — `content/Events/Drafts/` has some dirs with trailing spaces. The extractor's `readdirSync` wrapped in try/catch handles gracefully. No crashes.
2. **Malformed markdown links** — zero encountered in full-vault run (0/18,587). Either the vault is cleaner than expected or the regex is permissive enough.
3. **29% "other" source_type** — roughly 5,341 links didn't match any host rule. Not a bug; expected given the diversity of source material. David can reclassify in Ops or add host rules later. Fingerprinting doesn't depend on classification.
4. **Citation reuse rate is 21%** — 18,587 raw links deduped to 14,681 unique. Means each source is cited ~1.3× on average. Once profiles use `{{src:ID}}` refs, fixing one broken URL propagates to ~1.3 profiles. Good leverage but not dramatic.
5. **Main repo v4 is still diverged** — 34 local vs 7 remote as of session start. Another session is handling that cleanup. Don't merge from this worktree to v4 until that's resolved.

## Open questions for David

None blocking. Classification vocabulary can be expanded in future sessions. David can triage the orphan report when it lands in `content/Admin Notes/`.

## Tests / verification done

- [x] sources-schema.cjs: schema validator rejects bad records
- [x] sources-store.cjs: 10/10 smoke tests (add, dedupe-by-normalized-URL, get, update, query, count, reload)
- [x] extract-sources-from-vault.cjs: dry-run on Agriculture folder, then full-vault dry-run, then full-vault live run
- [x] sources-fingerprint.cjs: smoke test on 20 URLs (18 live, 1 dead, 1 generic_orphan), then aborted full run revealed bot-block issue, then fixed and re-run
- [x] sources-orphan-report.cjs: validated output format on partial fingerprint data

## Progress log

### 2026-04-14 — Planning + foundation session (Code Claude)
Morning: planning session produced ADR-0001/0002/0003 and the full documentation package. Shipped schema + store as foundation.

Afternoon: built and ran extractor, hit the full vault at 18,587 links, registered 14,681 unique sources. Built fingerprint script with bot-block detection fix after first run hit false-dead on Cloudflare-protected sites. Built orphan report generator. Re-ran fingerprint pass in background.

Phase 1 now ~45% complete. Next session picks up Quartz `{{src:ID}}` plugin.
