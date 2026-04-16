# Archived Scripts

Scripts in this folder are preserved for reference but no longer run in the active pipeline. Moved here 2026-04-16 during the pre-launch architecture cleanup.

**Nothing here is deleted.** Each script is one `git mv` away from being live again. Git history follows the file.

## How to resurrect a script

```bash
# Move back to scripts/ root
git mv scripts/_archive/<category>/<script-name>.cjs scripts/

# Run normally
node scripts/<script-name>.cjs
```

---

## Categories

### `migrations/` — one-time data migrations (already run)

These migrated existing data into new canonical stores. Running them again would either be a no-op or would duplicate records. Keep for reference.

| Script | What it did | When |
|--------|------------|------|
| `migrate-fec-body-tables-to-edges.cjs` | Parsed FEC body tables in profiles → canonical monetary edges in `data/relationships.jsonl` | Phase 2b.1, 2026-04-15 |
| `migrate-fec-citations-to-refs.cjs` | Rewrote FEC URL citations to `{{src:ID}}` refs via the source registry | Phase 1, 2026-04-14 |
| `migrate-frontmatter-delta.cjs` | Upserted frontmatter relationship fields into `data/relationships.jsonl` | Pillar 2a, 2026-04-15 |
| `migrate-frontmatter-to-relationships-jsonl.cjs` | Original Phase 3 Part 1 migration | Phase 3, 2026-02 |
| `migrate-ops-add-clerk-stripe.cjs` | Ops auth bootstrap (Clerk + Stripe setup) | Phase 2.5, 2026-04-14 |
| `migrate-strikethrough-sources-to-archived.cjs` | Moved strikethrough-marked dead sources to Archived sections | 2026-04 |

### `backfills/` — one-time historical loads (already run)

These loaded historical data once. New data comes in through scheduled pipelines or CSV ingest now.

| Script | What it did |
|--------|------------|
| `financial-disclosures-backfill.cjs` | Loaded STOCK Act PTR history. Current data flows through `financial-disclosures-pipeline.cjs` (still active in attention-dispatcher). |
| `senate-disclosures-backfill.cjs` | Senate disclosure backfill. Same pattern. |

### `one-time-cleanups/` — bug fixes and data repair (already applied)

These scripts fixed specific data-integrity bugs that have since been resolved. Code is kept as a template for similar fixes in the future.

| Script | What it fixed |
|--------|---------------|
| `clean-a000383-contamination.cjs` | Cleared 95 profiles contaminated with A000383 (Alan Armstrong) bioguide from a bad fuzzy-match |
| `clean-inline-fields.cjs` | Removed legacy Obsidian Dataview `field:: value` body fields |
| `clean-redirect-contamination.cjs` | Cleaned up redirect files the pipeline had enriched |
| `fix-demo-key-urls.cjs` | Removed `DEMO_KEY` URLs from profile citations |
| `fix-entity-name-mismatches.cjs` | Entity consolidation repair |
| `fix-fec-ids.cjs` | One-off FEC ID repair (see Katie Porter case cc_10 in sprint schedule) |
| `strip-em-dashes.cjs` | Removed em dashes from existing profile content |
| `strip-inline-dataview.cjs` | Companion to `clean-inline-fields.cjs` for Dataview syntax cleanup |
| `strip-master-profile-title-suffix.cjs` | Normalized "X Master Profile" title formatting |
| `classify-mistyped-politicians.cjs` | Fixed `type: politician` that should have been state/local |
| `find-mistyped-politicians.cjs` | Audit companion |
| `apply-type-reclassification.cjs` | Bulk type migration (rulebook-driven) |
| `archive-followthemoney.cjs` | FollowTheMoney source migration after it merged into OpenSecrets |

### `deprecated-experiments/` — experiments that concluded

| Script | Outcome |
|--------|---------|
| `batch-propose-class-tags-heuristic.cjs` | Heuristic class-tag pass. 346 proposals approved; heuristic retired. Ongoing work uses manual approvals. |
| `batch-gather-entity-signals.cjs` | Signal collection for class-tag heuristic — companion to above |
| `gen-perplexity-batches.cjs` | Generated batch research requests for Perplexity. Workflow now ad-hoc per pipeline per protocol in CLAUDE.md rule 13. |
| `load-perplexity-class-tag-proposals.cjs` | Integrated Perplexity research into proposals |
| `integrate-perplexity-research.cjs` | Same workflow |
| `match-fec-pdf.cjs` | Incomplete PDF-matcher experiment |
| `phase-6-deferred-items-collector.cjs` | Phase 6 is closed (ADR-0008) |

---

## What did NOT get archived (and why)

- **All `ingest-*-bulk.cjs`** — these read CSVs from `data/bulk/` and are the active data-intake path. Active Tier 1.
- **9 scheduled producers** (voice-drift-detector, hallucination-catcher, etc.) — running in `attention-dispatcher.cjs`
- **`financial-disclosures-pipeline.cjs`** — active daily STOCK Act scraper
- **`committee-assignments-fetch.cjs`** — Congress.gov committee data (one of 3 kept API pipelines)
- **`seed-events-from-crypto-votes.cjs`** — GovTrack (one of 3 kept)
- **Query engine** (`lib/query-engine.cjs`, `query-engine-contract-tests.cjs`) — Tier 1 core
- **All pre-commit sentinels** (`self-review-mirror`, `canonical-store-sentinel`, etc.)
- **`fix-bioguide-contamination.cjs` + `recover-bioguide.cjs`** — kept as a template pair for any future bioguide contamination issue
- **`launch-50-*.cjs`** — active launch sprint scripts

## Tier 2 consolidation candidates (future work, not archived)

These stay in `scripts/` root but overlap — candidates for merging in a later pass:

- `reclassify-readiness.cjs`, `staleness-decay.cjs`, `pipeline-janitor.cjs` → single `readiness-adjudicator.cjs`
- `normalize-related-bidirectionality.cjs`, `relationship-bidirectional.cjs`, `renormalize-edge-types.cjs`, `prune-orphan-edges.cjs` → evaluate merge
- `add-fec-pac-aliases.cjs`, `add-pac-aliases.cjs` → possible merge

---

**Archive created:** 2026-04-16
**Context:** Pre-launch architecture cleanup — moved 28 scripts out of active surface to reduce confusion and script-vs-script collision risk. Full context: `content/Admin Notes/sprint-schedule.md` entry for 2026-04-16.
