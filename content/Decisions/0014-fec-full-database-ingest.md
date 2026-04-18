---
title: "ADR-0014 — FEC Full-Database Ingest Pipeline"
type: decision
decision-number: 0014
status: active
date: 2026-04-18
supersedes: null
superseded-by: null
---

# ADR-0014 — FEC Full-Database Ingest Pipeline

## Context

Building profile-by-profile FEC traces (Pelosi, Rubio, Trump) was the validation pass. Each profile required re-extracting the same pas2 and indiv zips. Extracting indiv24.zip (4.2GB zipped, ~15GB extracted) separately per politician is O(50 * 15GB) = 750GB of redundant extraction for the launch 50 alone, taking ~16-21 hours.

The fix is to ingest FEC bulk data once into persistent derived stores keyed for O(1) lookup, then render profile auto-panels from those stores. The data is the same; the extraction cost collapses from per-profile to per-refresh.

The FEC bulk data becomes **the feed into the vault** — profile Mega-Donors sections, contradiction cards, and class-analysis panels all render from the derived stores at build time.

## Decision

Build three one-time ingest scripts producing persistent derived stores at `C:\donor-map-data\fec\` (external, survives worktree cleanup):

**1. `scripts/ingest-fec-pas2-bulk.cjs`** — runs the classifier from `scripts/lib/fec-txn-types.cjs` (ADR-0013) across every pas2 zip and emits five split files by transaction bucket:
- `pas2-direct-donors.jsonl` (24K legit contributions)
- `pas2-ie-support.jsonl` (24E support)
- `pas2-ie-oppose.jsonl` (24A oppose)
- `pas2-party.jsonl` (24N/24C/24P from whitelisted party committees)
- `pas2-anomalies.jsonl` (miscoded / super-PAC using direct-contribution codes)

**2. `scripts/ingest-fec-masters-bulk.cjs`** — ingests Committee Master (cm), Candidate Master (cn), and Candidate-Committee Linkages (ccl) into lookup JSONL:
- `committee-master.jsonl`
- `candidate-master.jsonl`
- `candidate-committees.jsonl`

**3. `scripts/ingest-fec-indiv-aggregate.cjs`** — streams every indiv zip and aggregates in-memory to `indiv-by-committee.jsonl` (rolled up to `{committee, donor_name, donor_employer, donor_occupation, donor_state, total, count, first_cycle, last_cycle}`). Raw indiv rows are NOT persisted — 100M+ rows exceed practical storage. The aggregation is the durable form.

All three scripts:
- Use per-zip checkpointing (`C:\donor-map-data\fec\.checkpoints\{pipeline}.json`) so interrupted runs resume at the next un-processed zip.
- Use two-file write pattern (`.partial.jsonl` → rename to `.jsonl` on complete) so crashes never leave half-written output files.
- Accept `--resume` flag (idempotent: already-complete zips skip).
- Emit progress lines on every zip completion (stream-friendly for background monitoring).
- Import from `scripts/lib/fec-txn-types.cjs` — the ADR-0013 taxonomy remains the single source of truth.

## Rationale

**Speed.** Per-profile trace is O(profiles * extraction). Database-backed rendering is O(extraction + profiles). For 50 profiles at ~25 min each versus one ~90-min pas2 pass plus ~8-hour indiv pass, the crossover happens at around 3 profiles. Past that, the database wins decisively. For 2800+ vault profiles, it wins by three orders of magnitude.

**Durability.** The derived stores are the facts. Profile markdown reads from them at build time via the existing `build-profile-data-panels.cjs` pattern. A profile never contains hand-typed FEC amounts that can drift from reality.

**Resumability.** Checkpointing per zip means a 12-hour run can survive: sleep, terminal close, crash, disk-full, reboot. Resume picks up at the last complete zip. Worst case loss is one zip's worth of work (~3-5 min).

**Persistence.** Writing to `C:\donor-map-data\fec\` (not `data/fec/`) means worktree cleanup doesn't nuke 8 hours of ingest work. Matches the bulk raw data location (`C:\donor-map-data\bulk\`).

**Storage.** Derived total is ~5-10GB across all files. Lives outside git (too large) but inside the persistent data root. Gitignored.

**Classifier-shared.** All pas2 ingest goes through `classifyTransaction`. Anomaly detection runs "for free" during ingest (the anomaly bucket IS an output file). Pre-commit sentinels (ADR-0013 opens) consume `pas2-anomalies.jsonl` as their flagged-list source.

## Consequences

**Code Claude work:**
- Write and ship the three ingest scripts.
- Kick them off once in background. Total wall time ~12-24 hours.
- Update `scripts/build-profile-data-panels.cjs` to read from the derived stores (adds a top-donor "Lifetime" column alongside existing Tier 1/Tier 2 panels).
- Add `scripts/setup-fec-junction.cjs` (or extend `setup-bulk-junction.cjs`) to mirror `data/fec/` → `C:\donor-map-data\fec\` via Windows junction so scripts can read via `data/fec/...` path.
- Schedule a weekly incremental refresh via attention-dispatcher: re-ingest only the latest cycle (~30-60 min) and merge.

**Research Claude work:**
- Going forward, profile Mega-Donors sections cite the auto-rendered panel. Narrative mega-donor character sketches stay editorial; the dollar amounts and top-donor lists render from the stores.

**David's decisions:**
- Whether to run the one-time ingest overnight or across a day.
- Whether to junction `data/fec/` (convenient) or keep the absolute path `C:\donor-map-data\fec\` explicit in scripts.
- Whether to add the weekly refresh schedule now or after the initial build completes.

## Closes

- Per-profile extraction waste (750GB redundant indiv extractions projected for 50-profile batch eliminated).
- The "can't scale past 3 profiles" bottleneck.
- The "FEC data takes 20 minutes to load into a profile" problem.

## Opens

- `scripts/build-profile-data-panels.cjs` extension to render FEC lifetime panels from the derived stores.
- Weekly incremental-refresh scheduled task.
- Pre-commit sentinel consuming `pas2-anomalies.jsonl` to block verified-tier profile commits referencing flagged committees in Mega-Donors sections.
- Query engine extension in `scripts/lib/query-engine.cjs` to expose committee/candidate/donor lookups against the derived stores.
