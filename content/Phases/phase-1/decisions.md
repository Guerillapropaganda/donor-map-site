---
title: Phase 1 Mid-Phase Decisions
type: log
phase: 1
last-updated: 2026-04-14
---

# Phase 1 Mid-Phase Decisions

Decisions made during Phase 1 implementation that aren't big enough for a full ADR but need to be recorded for continuity.

Format: one entry per decision, dated, signed with session identifier.

---

## 2026-04-14 — Foundation session (Code Claude)

### Source ID format: `src_NNNNNN` zero-padded
Chose 6 digits (supports up to 1M sources — way beyond foreseeable need). Sequential, no UUIDs. Rationale: stable, human-readable in diffs, sortable. Stored as string to avoid any JSON number truncation surprises.

### JSONL append-only with in-memory dedupe index
Following the `relationships-store.cjs` pattern. Store is lazy-loaded on first call, cached for the life of the process. `addOrFindSource` checks the URL dedupe index before writing. Updates mutate in-memory then rewrite the whole file (acceptable for ~10k sources; revisit if we hit 100k).

### Schema validator lives in separate module
Mirrors `relationship-edge-validator.cjs` pattern. `sources-schema.cjs` exports `validate(record)` that returns `{ ok, errors }`. Store calls it on every write. Pre-commit sentinel (future) can call the same validator.

### Status enum
Locked to: `unverified`, `live`, `dead`, `redirected`, `generic_orphan`, `archived`, `needs_review`, `paywall`. `paywall` is new vs the original spec — needed for NYT/WSJ case where we can't reasonably content-check.

### URL normalization for dedupe
Lowercase host, strip trailing slash, strip common tracking params (`utm_*`, `fbclid`, `gclid`), preserve query params that affect content (`?id=`, `?q=`). Applied only for dedupe key, original URL preserved in the record.

### Timestamp format
ISO 8601 with Z suffix (`2026-04-14T16:30:00Z`). No timezone conversion. All writes use `new Date().toISOString()`.

### Pipeline migration v1: migrate existing vault citations, not the engine-repo script
The engine repo's `scripts/fec-summary-pipeline.cjs` lives in a separate workspace (`~/donor-map-engine`) and writes raw FEC citation lines at line 304. Modifying it from this worktree violates the "stay in the worktree" discipline and would require cross-repo coordination.

**The v1 migration approach instead:** write an in-repo migration script (`scripts/migrate-fec-citations-to-refs.cjs`) that walks the vault, finds every existing FEC citation in profile bodies, registers it through sources-store (dedup-by-URL), and rewrites the line to `{{src:ID}}`. This proves the pattern end-to-end without touching the engine repo, AND it deduplicates FEC citations across profiles (many cite the same URL), AND it gives David an immediately cleaner vault state.

Result on 2026-04-14: **907 raw FEC citations → refs across 456 files. Zero new sources registered (all FEC URLs were already in the registry from Phase 1 extraction).** Verified via full `npx quartz build` and end-to-end render spot-check on Manchin.

**For the engine-repo fec-summary-pipeline.cjs (deferred to a follow-up PR):**
1. The cleanest path is to teach that pipeline to call `addOrFindSource` and emit `{{src:ID}}` directly when it writes the citation line. Options:
   - Absolute-path require: `require("C:/Users/third/donor-map-site/scripts/lib/sources-store.cjs")` — brittle but no file duplication
   - Copy sources-schema.cjs + sources-store.cjs into the engine repo's `scripts/lib/` with a maintenance note to keep them in sync
   - Symlink (not reliable on Windows)
2. After the engine-repo migration ships, running this vault migration script should be a no-op (there'll be no raw FEC citations to rewrite).
3. Until then: any new profiles enriched by the engine FEC pipeline will land with raw URLs, but running `node scripts/migrate-fec-citations-to-refs.cjs --write` in this repo as a post-enrichment step will convert them to refs. This is an acceptable temporary workaround.

### Engine-repo broader pipeline migration backlog
Every pipeline in `~/donor-map-engine/scripts/` that writes URL citations into profile bodies needs similar migration. Known candidates beyond fec-summary:
- `fec-pipeline.cjs` (individual contributions)
- `congress-summary-pipeline.cjs` (Congress.gov)
- `lda-pipeline.cjs` (Lobbying Disclosure Act)
- `propublica-nonprofit-pipeline.cjs`
- `sec-edgar-pipeline.cjs`
- `govtrack-pipeline.cjs`
- `usaspending-pipeline.cjs`
- `sam-pipeline.cjs`
- `doj-press-pipeline.cjs`

The same in-repo vault-migration script pattern (grep for raw URLs, register, rewrite to refs) can be applied to each one as a v1 — and then the engine-repo scripts can be migrated in a follow-up PR. Phase 1 only requires ONE pipeline migrated end-to-end, which is now done via FEC. The rest can be Phase 6 hardening work or continuous cleanup.
