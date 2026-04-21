---
title: Scripts classification report — 2026-04-21
type: admin-note
status: open
lane: code
date: 2026-04-21
---

# Scripts classification — 192 files surveyed

Background scan of every `.cjs` / `.js` in `scripts/` (first ~50 lines of each), cross-referenced against `.husky/` hooks and inter-script imports. Bucket counts:

| Bucket | Count | % |
|---|---|---|
| active-pipeline | 94 | 49% |
| active-audit | 52 | 27% |
| active-sentinel | 17 | 9% |
| active-utility | 9 | 5% |
| one-shot-done | 13 | 7% |
| broken-or-stale | 2 | 1% |
| unknown (needs manual review) | 5 | 3% |

**Finding:** the sprawl is less bad than it looked. 88% of scripts are live pipeline / audit / sentinel / utility code. Only 13 (7%) are confirmed archive candidates. Earlier CLAUDE.md claim of "28 archived scripts with a README catalog" is out of date — `scripts/_archive/` has subdirectories (`_archive/one-time-cleanups/`, `_archive/backfills/`) with scripts already moved, but no top-level archive README.

## Archive candidates (13 scripts)

All carry explicit "one-shot" / "one-off" / "safe to delete" markers in their header comments. Safe to move to `scripts/_archive/one-time-cleanups/` or `_archive/backfills/` based on semantics.

```
scripts/_audit-missing-bioguide.cjs                — "One-off triage — safe to delete"
scripts/_backfill-bioguide.cjs                     — "One-off backfill — safe to delete"
scripts/add-pac-aliases.cjs                        — "One-shot: add aliases frontmatter"
scripts/backfill-and-prune-related-edges.cjs       — "One-shot migration: mirrored wiki-links"
scripts/backfill-suggestion-approvals-to-jsonl.cjs — "One-shot backfill"
scripts/classify-ie-edges.cjs                      — "One-shot cleanup"
scripts/cleanup-corrupt-subaward-fields.cjs        — "One-shot cleanup"
scripts/create-priority-stubs.cjs                  — "One-shot: generate priority stubs"
scripts/deprecate-self-loop-edges.cjs              — "One-shot cleanup"
scripts/fix-registry-paths.cjs                     — "One-shot: normalize vault_profile paths"
scripts/migrate-edge-ids-include-role.cjs          — "One-shot: recompute edge IDs"
scripts/rebuild-relationship-denorm.cjs            — "One-shot cleanup for canonical edge store"
scripts/split-relationships-by-source.cjs          — "One-shot migration: partition JSONL"
```

## Broken / stale (2 scripts — review before deciding)

```
scripts/create-pac-stubs.cjs           — Has TODO/FIXME in header
scripts/profile-template-generator.cjs — Has TODO/FIXME in header
```

## Unknown (5 scripts — header ambiguous, quick manual review)

```
scripts/ops-surface-audit.cjs          — probable active-audit (Pillar 3 ops inventory)
scripts/readiness-promotion-digest.cjs — probable active-audit (promotion digest)
scripts/staleness-decay.cjs            — probable active-pipeline (auto-decay readiness)
scripts/status.cjs                     — probable active-utility (system health)
scripts/tag-conduits.cjs               — probable active-pipeline (WinRed/ActBlue tagging, ADR-0013)
```

## Recommended next steps

1. **Spot-check the top-5 archive candidates** for hidden dependencies, then `git mv` the 13 one-shot-done scripts to `scripts/_archive/one-time-cleanups/` (or `/backfills/` where appropriate).
2. **Write `scripts/_archive/README.md`** catalog that CLAUDE.md references but doesn't actually exist — list each archived script and what it did.
3. **Decide the 2 broken-or-stale** — fix the TODO or archive. Both have "stub" in their path which suggests they were mid-build.
4. **Quick review of the 5 unknowns** — 10 minutes of header reading reclassifies them cleanly.

After this pass: `scripts/` root drops from 192 → ~177 active scripts, with a documented archive holding the 13 completed one-shots. That's meaningful but not dramatic — the real reduction opportunity would require a deeper pass on the 52 `active-audit` scripts, many of which run once a quarter and could be consolidated into a smaller set of parameterized audits.
