---
title: Phase 1 Handoff — Source Registry + Generic-Link Cleanup
type: handoff
phase: 1
status: in-progress
last-updated: 2026-04-14
---

# Phase 1 Handoff

## Current state
Planning complete. Schema + writer library shipped this session. Foundation in place for source extraction, orphan detection, Ops UI, and pipeline integration work in the next session.

## Exactly where to pick up

**Next concrete action:** Write `scripts/extract-sources-from-vault.cjs` — walks all `content/**/*.md`, pulls every markdown link with a regex, dedupes by URL, calls `sourcesStore.addOrFindSource()` for each with `tier: null` and `entity_ref` derived from the containing profile's title.

Then write `scripts/orphan-citation-detector.cjs` — fetches each registered URL, computes:
- Final URL path depth (after redirects)
- Title vs generic blocklist (`Home`, `Search`, `404`, `Page Not Found`)
- Whether citing-profile entity name appears in fetched page
- Whether dollar figures / dates from profile appear
Scores 0–4, writes report to `content/Admin Notes/orphan-citations-report.md` sorted by score.

After that: Ops `/sources` review page, Quartz plugin for `{{src:ID}}` resolution, first pipeline migration.

## Files touched so far

### Shipped this session
- `scripts/lib/sources-schema.cjs` — schema definition + validator
- `scripts/lib/sources-store.cjs` — reader/writer API
- `content/Class Tag Vocabulary.md`
- `content/Monetization Model.md`
- `content/Build Phases.md`
- `content/Phases/phase-1/handoff.md` (this file)
- `content/Phases/phase-1/exit-criteria.md`
- `content/Phases/phase-1/decisions.md`
- `content/Decisions/0001-class-tag-vocabulary.md`
- `content/Decisions/0002-monetization-model.md`
- `content/Decisions/0003-phased-query-engine-build.md`
- `.claude/skills/phase-transition/SKILL.md`

### Not yet touched
- `scripts/extract-sources-from-vault.cjs`
- `scripts/orphan-citation-detector.cjs`
- `ops/src/app/sources/` (Ops review page)
- `quartz/plugins/transformers/source-refs.ts` (Quartz plugin for `{{src:ID}}`)
- Any actual pipeline migration
- `.claude/CLAUDE.md` additions (query engine + source registry sections)
- `content/Vault Rules.md` (structured data layer section)
- `content/Pipeline Guide.md` (sources-store integration section)

## Decisions made this session

See `content/Phases/phase-1/decisions.md` and ADRs 0001-0003.

Key implementation decisions carried from planning:
- Content hash (not TF-IDF) for fingerprinting — simpler, good enough
- Archive.org auto-archive only for Tier 1 sources (cost control)
- Paywall host whitelist skips generic check (WSJ, NYT, etc.)
- Pipelines must use `sources-store.cjs` for all new citations — no raw URLs
- Source IDs are `src_NNNNNN` (zero-padded 6 digits), sequential
- Store is append-only JSONL with in-memory dedupe index by URL

## Known issues / surprises

- Windows has directories in vault with trailing spaces / illegal chars (seen in `content/Events/Drafts/`, `content/Think Tanks & Policy Infrastructure/`). The source extractor must `try/catch` directory reads and log-skip on error, not crash.
- Some profile markdown links are malformed (no closing paren, mixed quote styles). Extractor regex needs to tolerate and report, not crash.
- Main repo v4 branch is currently diverged (34 local vs 7 remote) — another session is handling cleanup. Don't attempt merges to v4 from this worktree this session.

## Open questions for David

None pending — planning session locked everything. If edge cases emerge during extraction, log in `decisions.md` and surface in the next session's opening summary.

## Tests / verification plan

For the source extractor next session:
1. Run on a single folder first (`content/Donors & Power Networks/Agriculture/`)
2. Verify deduplication works across profiles
3. Verify content hash stable across re-fetches
4. Spot-check orphan detection on 10 known-bad links (ask David for examples)

For sources-store (done this session):
- [x] `addOrFindSource` on new URL returns new ID
- [x] `addOrFindSource` on same URL returns same ID (dedupe works)
- [x] `getSource` returns the full record
- [x] `updateStatus` persists correctly
- [x] Store survives reload (cache invalidation works)

## Progress log

### 2026-04-14 — Planning + foundation session (Code Claude)
- Planning session produced full phase architecture with ADRs 0001-0003
- Created Class Tag Vocabulary, Monetization Model, Build Phases docs
- Created Phases/phase-1 folder structure
- Shipped `scripts/lib/sources-schema.cjs` with full schema + validator
- Shipped `scripts/lib/sources-store.cjs` with reader/writer API
- Smoke-tested store API (add, find, update, reload)
- Phase 1 is ~15% complete (2 of 11 deliverables done)
- Handoff prepared for next session to pick up the extractor + orphan detector
