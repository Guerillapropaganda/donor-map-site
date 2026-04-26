---
title: Data Quality Follow-Ups (post-ADR-0024 Phase 3 surgery)
type: admin-note
note-type: data
status: open
priority: high
lane: code
created: 2026-04-25
note-kind: log
---

# Data Quality Follow-Ups

Survey of code-Claude-lane data-quality issues remaining after the
2026-04-25 cleanup arc (affiliate-id pollution fix, PAS2 precision
fix, self-loop scrub, cache rebuild filter). Two real issues surface
in the `verify-all.cjs --tier=1` warns that aren't yet addressed.

## 1. Phantom overcount: cross-source edge duplication

**Symptom:** `verify-all.cjs --tier 1` reports **7,035 warnings** in
the edge-consistency check, all of the form:

> `2 identical edges ($5.0K International Association of Firefighters
> Interested in Registration and Education PAC→Lisa Blunt Rochester
> cycle 2024) across sources [fec-bulk, fec-pas2] — phantom overcount
> $5.0K`

**Root cause hypothesis:** Each ingestion source (fec-bulk, fec-pas2,
fec-individual-bulk, etc.) writes to its own per-source derived file
under `data/derived/`. `computeEdgeId(edge)` is deterministic per
`(from | to | type | cycle [| role])`. So if two sources emit a
matching tuple (which is normal — fec-bulk and fec-pas2 cover
overlapping FEC datasets), they produce the same edge id but live in
separate files. `relationships-store.loadEdges()` merges files but
does not dedup across them.

**Impact:** Money totals on every leaderboard, profile, and aggregation
are inflated by the cross-source duplication. The 7,035 warned cases
are probably a lower bound — that's just what the verifier flagged.

**Fix scope (one session of code-Claude work):**
- Patch `scripts/lib/relationships-store.cjs:loadEdges()` to dedup by
  `edge.id` after merging derived-file edges. When two edges share an
  id, keep the one with the highest confidence; otherwise the first
  by source-priority order (canonical > fec-pas2 > fec-bulk > others).
- Re-run `scripts/build-relationships-per-profile.cjs` to refresh the
  librarian cache.
- Re-run `verify-all.cjs --tier 1` to confirm warning count drops
  toward zero.
- Ops display dashboards (donor totals, top donors, etc.) get a
  silent correctness improvement.

**Risk:** Low. The dedup is defensive — keeping one of two identical
records can only reduce overcounting. No semantic change.

## 2. Missing entity records: 2,479 unresolved entity references

**Symptom:** `verify-all.cjs --tier 1` reports **2,479 warnings** in
the entity-resolution check. Entity names appear in edges but have no
record in `entities.jsonl`. Top offenders by edge count:

| Name | Edges | Type |
|---|---:|---|
| French Hill | 394 | politician (sitting US Rep, AR-2) |
| Manhattan Institute for Policy Research | 40 | entity (think-tank) |
| Ash Kalra | 28 | state-politician (CA Assembly) |
| Peck Madigan Jones (now Tiber Creek Group) | 20 | entity (lobbying firm) |
| Subject Matter (now Avoq) | 20 | entity (lobbying firm) |
| Kathy Hochul | 19 | state-politician (NY Governor) |
| Crossroads Strategies | 18 | entity (lobbying firm) |
| Volodymyr Zelenskyy | 11 | politician (foreign) |
| Laphonza Butler | 10 | politician (former US Sen, CA) |

**Mixed lane:** Three categories:
- **Federal politicians missing entity records (e.g. French Hill,
  Laphonza Butler)** — code-Claude lane: probably the
  legislator-registry backfill missed them. Worth a one-shot script.
- **Lobbying firms with renamed parents** — editorial: needs canonical
  profile + alias for the old name.
- **State / foreign politicians** — vault is federal-focused per
  cc_p3_83's "AFSCME-class display loss" investigation. Librarian
  correctly drops these. May not need action, but the 2479 warning
  count includes them. A `--exclude-state` flag on the verifier would
  cut noise.

**Fix scope (per category):**
- Federal-pol gap: 1 hour code-Claude (legislator-registry backfill
  pass for unresolved-by-name federal politicians). Possibly resolves
  several hundred warnings on its own.
- Lobbying firm aliases: editorial; surface to David in attention queue.
- State/foreign: either update verifier to exclude these as expected,
  or document in the rule.

## 3. Multi-committee non-collision pollution (deferred)

From the affiliate-id investigation earlier this evening: 25 entities
have multi-committee `signals.fec_committee_ids` arrays that may still
contain pollution but aren't currently colliding with another vault
entity. The duplicate-entity-profiles check doesn't fire on them.

Examples surfaced in the dry-run scrub:
- AT&T: includes `C00368811` (AT&T Mobility LLC PAC) and `C00377044`
  (AT&T Inc Ohio PAC) — both connected_org-only matches from the old
  auto-link logic.
- Pfizer Inc.: includes `C00449173` (Pfizer Inc PAC - CT) — same
  shape.
- AFL-CIO: includes ~50 state/local affiliate committees — likely the
  largest pollution source.

These don't trip a harness check but inflate money totals quietly.
Lower priority than #1 and #2 above; should be addressed after the
cross-source dedup lands (which would also reduce some of the noise).

## Suggested ordering

1. **Cross-source dedup in `loadEdges()`** (#1) — biggest bang per
   session. Affects every leaderboard.
2. **Federal politician backfill** (#2 subset) — surfaces missing
   profiles to editorial. Quick win.
3. **Multi-committee non-collision scrub** (#3) — same flavor as
   tonight's affiliate-id surgery; probably benefits from the
   editorial-type-aware classification we'd build for the auto-link
   v2 (currently deferred).
4. **Verifier exclusions** for state/foreign politicians — cuts noise
   from the warn count, which makes the rest of the warns easier to
   triage.
