---
title: "Audit item #5 (tagged_by audit trail backfill) — closed as obsolete"
type: resolution
status: done
resolved: 2026-04-27
related-items: ["audit-item-5"]
---

# Audit item #5 — closed as obsolete

## Original ask

From the 2026-04-26 system audit, deferred item #5:

> backfill `tagged_by` audit trail on 341 entities tagged outside the proposal queue

## Why it's obsolete

Verified 2026-04-27 — the gap this item was trying to close no longer exists.

The class-tag reconciler that ran on 2026-04-26 (commit `8f28800db`, "ADR-0024 surface migration arc + UX redesign + system audit fixes") retroactively created proposal records for every previously-untracked tagged entity. Re-checked today:

- **341** entities have `tags_approved=true`
- **341 of 341** have a corresponding proposal record in `data/entity-class-tags-proposed.jsonl`
- **0** are tagged outside the proposal queue today

Proposal-status breakdown across the 341:

| status | count | meaning |
|---|---|---|
| `superseded` | 324 | retroactive proposals confirming what was already there |
| `approved` | 4 | went through the formal approve flow |
| `augmentation` | 11 | proposals to add tags to already-tagged entities (open editorial) |
| `conflict` | 2 | proposals conflict with current tags (open editorial) |

## Audit trail today

Every tagged entity carries:

- `tags_approved: true`
- `tags_approved_by: "david"` (always — david is the only approver)
- `tags_approved_at: <timestamp>`
- `tags_proposed_by: "heuristic-v1"` or `"perplexity-research-2026-04-15"` (source of the proposal)
- corresponding proposal record in `entity-class-tags-proposed.jsonl`

The `tagged_by` field mentioned in the original deferred item doesn't exist as a schema field. It would have been a *cosmetic* consolidation (e.g. `"david via heuristic-v1"`) of fields that already exist separately. Marginal value; not worth implementing.

## Edge case found

One entity (`ent_000119` Starbucks) has `tags_approved=true` with only a `worker_relationship: "union-busting"` tag and no other tag fields populated. This is correct (worker_relationship is a valid tag), just unusual shape. Not a bug. Confirmed via:

```js
ents.filter(e => e.tags_approved === true && !e.capital_type && !e.class_position && !(e.ideological_function?.length))
// → [ent_000119 Starbucks] with worker_relationship: "union-busting"
```

## What's still open in this lane

Not part of #5, but worth flagging here for cross-reference:

- **13 reconciled rows pending editorial review** (11 augmentation + 2 conflict). Surfaced in `/attention` via the `class-tag-staleness` harness check.
- **156 pending proposals** in the queue (after the 4 orphan superseded earlier today — see `c0db04842` for the orphan-cleanup commit). David's editorial lane.

## Closing

This item is **closed-as-obsolete**. Future audits should skip it. If a `tagged_by` consolidated field becomes desirable for UI display, that's a small new item — not a backfill.
