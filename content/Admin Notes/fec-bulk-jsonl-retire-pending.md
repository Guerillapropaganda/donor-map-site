---
title: Retire data/derived/fec-bulk.jsonl (Layer 2 follow-up)
status: open
type: cleanup-required
auto-generated: false
last-updated: 2026-04-28
owners: code-claude, david
---

# Retire data/derived/fec-bulk.jsonl

## Context

Surfaced 2026-04-28 PM via the Bowman/Fairshake $2M ghost-donation
investigation. The librarian had a `fec-bulk` source edge claiming
Fairshake PAC contributed $2.08M to Jamaal Bowman in cycle 2024, but
Fairshake actually spent that money in IE-oppose against Bowman. The
edge had `role: null`, which the edge-taxonomy classifier silently
defaulted to `direct-contribution`.

## Layer 3 (shipped 2026-04-28)

`lib/donor-map/edge-taxonomy.ts` + `scripts/lib/edge-role-taxonomy.cjs`
no longer silently default empty/null roles on monetary edges. They
throw. Consumers (story-evidence, build-relationships-per-profile)
already wrap classifyEdge in try/catch, so the throw causes them to
SKIP the bad edge rather than miscount it. Effect:

- 14,294 fec-bulk role=null monetary edges → invisible to the librarian's
  classification logic (still in the canonical store, but not counted
  as donations)
- 2,201 irs-990-bulk role=undefined monetary edges → same
- New ingest paths can't reintroduce the silent-default failure mode

## Layer 2 (still pending — this note)

**The data is still there, just unclassified.** That's safe but
incomplete. The proper fix is to retire `data/derived/fec-bulk.jsonl`
entirely, because:

1. The CURRENT `ingest-fec-bulk.cjs` code is correct (calls
   classifyTransaction). The 14,294 buggy edges are stale output from
   an EARLIER version of the script that didn't classify. Nobody
   re-ingested after the upgrade.
2. The parallel `ingest-fec-pas2-bulk.cjs` → `aggregate-pas2-to-edges.cjs`
   path produces `data/derived/fec-pas2.jsonl` (67,511 edges, fully
   role-tagged, covering 1980-2026). It's more complete + correct.
3. `fec-bulk.jsonl` and `fec-pas2.jsonl` are partial duplicates of the
   same FEC source data with different entity-resolution paths. The
   fec-bulk path uses a custom `normalizeName()` heuristic that
   bypasses the librarian's resolver; the fec-pas2 path uses the
   resolver. The fec-pas2 path is canonically correct per ADR-0024.

## Why this can't ship today

Today's audit showed:
- 17,983 fec-bulk pair-cycle keys
- 1,746 also exist in fec-pas2 (good)
- **16,237 are unique to fec-bulk** (concerning)

The 16,237 unique pairs are mostly entity-resolution differences
(same FEC transaction, different from/to names because fec-bulk's
normalizeName produces different canonical names than the resolver).
But some may be legitimate edges fec-pas2 doesn't have because it
skipped over committees that were unmapped FEC stubs at ingest time.

**Today's stub-resolution (commit aed29c154) added 371 committee →
entity mappings.** A fresh re-ingest via `ingest-fec-pas2-bulk.cjs`
would now correctly resolve those committees and produce
properly-roled edges. After that, fec-bulk.jsonl can be retired safely.

## Required to close this

1. Re-ingest cycles 2022/2024/2026 (and ideally 2020) via:
   ```
   node scripts/ingest-fec-pas2-bulk.cjs --cycles 2020,2022,2024,2026
   node scripts/aggregate-pas2-to-edges.cjs
   ```
   (zips already on disk at `C:\donor-map-data\bulk\Contributions from
    comitt. to candidates & independent expenditures\` — 25-29MB each)

2. Diff: confirm fec-pas2.jsonl now covers every (from→to, cycle)
   pair currently in fec-bulk.jsonl. Specifically verify
   Fairshake PAC → Jamaal Bowman now appears in fec-pas2 with
   `role: ie-oppose` and `amount: 2078023`.

3. If diff is clean: delete `data/derived/fec-bulk.jsonl`, retire
   `scripts/ingest-fec-bulk.cjs`, drop the `fec-bulk` source from
   the source-tier registry.

4. Re-run `frontmatter-orphan-check`, `librarian-gap-audit`,
   `relationship-overlap-check`. None should regress.

## Why this is gated

Per CLAUDE.md Rule 3 + David's "all pipelines local-runs only" call
2026-04-28, scheduled API pipelines stay paused. Local CSV bulk
scripts in `data/bulk/` are explicitly allowed but the FEC PAS2 zips
live at `C:\donor-map-data\bulk\` (outside the repo). Re-ingest is
local-CSV-bulk-shape, so it's allowed — but it's its own session
because:

- Re-ingest takes 20-40 min wall-clock for 4 cycles
- Diff + delete + verify needs careful eyeballing
- Doing it tail-end of a long session risks rushed verification

## Estimated scope when picked up

~1.5-2 hours. Re-ingest (30 min) + diff (15 min) + delete + verify
across 3 harness checks (45 min) + commit + push.

## What today's Layer 3 fix already protects against

If FEC bulk ingest is run AGAIN someday with old code (or a vendor
changes their CSV format and we don't notice), the silent-default
failure mode is gone. Empty roles throw immediately. Bug 1 can't
recur silently.
