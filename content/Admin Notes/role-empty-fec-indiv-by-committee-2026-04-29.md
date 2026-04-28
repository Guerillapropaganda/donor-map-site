---
title: 138,753 role-empty edges in fec-indiv-by-committee.jsonl — needs coordinated re-aggregate
type: admin-note
status: resolved
priority: high
tags: [code, librarian, ingester-bug, data-integrity]
last-updated: 2026-04-28
---

> **RESOLVED 2026-04-28.** Truncate-then-regenerate executed. Aggregator wrote 134,731 role-tagged edges (42 self-loops correctly rejected — same FEC self-funding pattern as the open reconciliation note). `role-empty-monetary-edges` harness count: 138,753 → 0. Downstream `relationships-per-profile.json` rebuilt; `rebuild-relationship-caches.cjs --write` updated 156 frontmatters.
>
> **AOC $45M claim was overstated.** Investigation found the source file `C:/donor-map-data/fec/indiv-by-committee.jsonl` contains 188K lines covering only 617 committees — a partial dataset, not comprehensive individual-donor history. AOC's regenerated artifact has 46 monetary-detail entries (max $8K). The fix is real and meaningful for harness correctness, but does NOT unblock $45M of small-dollar visibility — that requires a full upstream FEC bulk ingest pass (separate session). The "$54K" symptom on AOC's profile was reflecting both the role-empty bug AND the source-data thinness; only the former is fixed.

# 138,753 role-empty monetary edges — pre-existing, newly visible

## What the harness saw

`role-empty-monetary-edges` check fired with **138,753 findings** today after I copied `data/derived/fec-indiv-by-committee.jsonl` from main repo into the worktree. Yesterday's session reported "16,495 → 0 active role-empty monetary edges (-100%)" — that count was real for the files that were loaded but did NOT include `fec-indiv-by-committee.jsonl`.

## What's actually wrong

100% of the 138,753 active monetary edges in `fec-indiv-by-committee.jsonl` have `role: null`. Sample:

```json
{
  "from": "Roger Dale Linebarger", "to": "DCCC - Democratic Congressional Campaign Committee",
  "type": "monetary", "amount": 12500, "cycle": "2008",
  "role": null,                                    ← bug
  "source": "fec-indiv-by-committee",
  "first_seen": "2026-04-19T21:44:57.292Z"
}
```

## Why

The producer script `scripts/aggregate-indiv-to-edges.cjs` was patched April 21 morning (commit `40fa6d87e`) to set `role: 'direct-contribution'` on every emitted edge. The patch comment explained why:

> Individual FEC contributions to a candidate committee are direct-contribution edges. Previous null role left them out of Pattern A's isSupport / isPolitical filters, which is why AOC's $45M small-dollar base showed $54K on the donors_to panel — Pattern A's filter treated null-role as "neither support nor oppose."

But the file has `first_seen: 2026-04-19` on every edge — generated **two days BEFORE the role-fix commit** and never re-aggregated since. The role-tagging fix is in the script; nobody ran the script.

This is the same regression-shape pattern as the PAS2 deletion: the fix was made but the data wasn't refreshed.

## Why this matters

- AOC's $45M small-dollar base reads as $54K on her profile (per the original commit's diagnosis) — and similar collapses for every politician with significant individual contributions
- Any cross-policy aggregator that filters by role drops these 138K edges silently
- Today's contradiction-miner gating accepts these as monetary edges (because it tests `type === 'monetary'`, not role), so the gating is sound — but downstream consumers that DO check role miss them

## Why I didn't fix it now

`upsertEdges` writes by edge ID. Edge ID is computed from from/to/source/cycle/role/amount. **Adding a role to existing edges changes their ID.** Running `aggregate-indiv-to-edges.cjs --write` today would:

- Write 138,753 NEW role-tagged edges (with new IDs)
- Leave 138,753 role-null edges in place (old IDs, no longer auto-overwritten)
- Net: ~277K total edges in the file, double-counting every donor → committee pair

## The right fix (separate session)

Two-step coordinated:

1. **Pre-deprecate** the existing role-null edges in `fec-indiv-by-committee.jsonl`. Either:
   - Set `status: 'deprecated'` on each old edge with audit-trail evidence (matches the Bowman-shape deprecation pattern from yesterday)
   - OR truncate the file (acceptable since the aggregator is the only writer)

2. **Run the aggregator with `--write`**:
   ```bash
   node scripts/aggregate-indiv-to-edges.cjs --write
   ```
   Reads `C:/donor-map-data/fec/indiv-by-committee.jsonl`, re-emits with role=direct-contribution. Runtime estimate: 30s-2min based on input size.

3. **Verify**: `role-empty-monetary-edges` harness check should report 0 again.

Optional: also re-aggregate any DOWNSTREAM consumers that derived from these edges (relationships-per-profile, top-donors panels) so the AOC-style undercounts heal.

## Why this needs David's approval

- Touches the canonical store at scale (138K edges)
- Affects every politician's "individual donor" panel readings
- Need to confirm: deprecate-old-then-regenerate, or truncate-then-regenerate
- Worth checking that `C:/donor-map-data/fec/indiv-by-committee.jsonl` source file is current before running

## Status

- **Caught**: yes, by yesterday's `role-empty-monetary-edges` harness check (Layer B)
- **Fixed**: no — the fix is in the script, the data hasn't been refreshed
- **Lesson**: prevention layer + harness + repair pattern works exactly as designed; the gap is in operator awareness ("who runs the aggregator after a script fix?"). Worth wiring the harness output to suggest the remediation command.
