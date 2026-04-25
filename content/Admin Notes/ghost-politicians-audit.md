---
title: Ghost Politicians Audit
generated: 2026-04-25T21:19:35.895Z
source-script: scripts/audit-ghost-politicians.cjs
---

# Ghost Politicians Audit — 2026-04-25

Diagnostic for the politician entity records flagged by `pathless-stub-entities-check.cjs` — entries with `entity_type=politician` and no `profile_path`.

Each row was created on 2026-04-19 in a single batch by `scripts/politician-historical-coverage-backfill.cjs`. The script matched FEC candidate-master records by name only, with a "skip if >15 records" guard rail. That guard is too loose: when a name maps to multiple real politicians (Bob Casey Sr/Jr, multiple Mark Kellys, etc.), all their FEC records get glommed into a single entity. The aggregated edges then look like one person's donor data while actually belonging to several distinct humans. Defamation-adjacent if rendered.

## Headline counts

- Total ghosts: **0**
- Clean (single bioguide, FEC IDs all match): **0**
- Clean-registry-gap (extra FEC IDs are same person, registry just hasn't listed them): **0**
- Ambiguous (extra FEC IDs name-match the ghost, but ≥2 distinct people share the name in FEC master — can't auto-resolve): **0**
- Contaminated (extra FEC IDs from a DIFFERENT person — defamation risk): **0**
- Multi-person chimera (name maps to ≥2 bioguides): **0**
- No bioguide match (manual lookup needed): **0**

- Total edges across all ghost names: **0**

## Per-ghost detail

## Next steps

1. **CLEAN ghosts** — safe to enrich. Set `profile_path`, set `bioguide_id`, run auto-blocks. No edge cleanup needed.
2. **CONTAMINATED ghosts** — prune the suspect FEC IDs from the entity, then identify which edges originated from those IDs (via committee ownership in `fec-committee-registry.json`) and either reassign or delete. Then enrich.
3. **MULTI_PERSON chimeras** — split into multiple entities, one per bioguide, and reassign edges per FEC ID ownership. Highest-effort.
4. **NO_BIOGUIDE_MATCH** — manual lookup; could be retired/defeated/state-level officials not in the federal registry.
