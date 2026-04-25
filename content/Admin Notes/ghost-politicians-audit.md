---
title: Ghost Politicians Audit
generated: 2026-04-25T21:01:32.486Z
source-script: scripts/audit-ghost-politicians.cjs
---

# Ghost Politicians Audit — 2026-04-25

Diagnostic for the politician entity records flagged by `pathless-stub-entities-check.cjs` — entries with `entity_type=politician` and no `profile_path`.

Each row was created on 2026-04-19 in a single batch by `scripts/politician-historical-coverage-backfill.cjs`. The script matched FEC candidate-master records by name only, with a "skip if >15 records" guard rail. That guard is too loose: when a name maps to multiple real politicians (Bob Casey Sr/Jr, multiple Mark Kellys, etc.), all their FEC records get glommed into a single entity. The aggregated edges then look like one person's donor data while actually belonging to several distinct humans. Defamation-adjacent if rendered.

## Headline counts

- Total ghosts: **14**
- Clean (single bioguide, FEC IDs all match): **9**
- Clean-registry-gap (extra FEC IDs are same person, registry just hasn't listed them): **0**
- Ambiguous (extra FEC IDs name-match the ghost, but ≥2 distinct people share the name in FEC master — can't auto-resolve): **4**
- Contaminated (extra FEC IDs from a DIFFERENT person — defamation risk): **0**
- Multi-person chimera (name maps to ≥2 bioguides): **0**
- No bioguide match (manual lookup needed): **1**

- Total edges across all ghost names: **8,609**

## Per-ghost detail

### Bill Hagerty  *(ent_001538)*

- **diagnosis:** CLEAN — single bioguide, all FEC IDs match
- edges observed: 563
- FEC candidate IDs on entity: `S0TN00169`
- canonical bioguide: `H000601`
- canonical FEC IDs (from legislator registry): `S0TN00169`
- ✓ matched FEC IDs (keep): `S0TN00169`

### Mark Kelly  *(ent_001539)*

- **diagnosis:** CLEAN — single bioguide, all FEC IDs match
- edges observed: 941
- FEC candidate IDs on entity: `S0AZ00350`
- canonical bioguide: `K000377`
- canonical FEC IDs (from legislator registry): `S0AZ00350`
- ✓ matched FEC IDs (keep): `S0AZ00350`

### Katie Britt  *(ent_001540)*

- **diagnosis:** CLEAN — single bioguide, all FEC IDs match
- edges observed: 561
- FEC candidate IDs on entity: `S2AL00145`
- canonical bioguide: `B001319`
- canonical FEC IDs (from legislator registry): `S2AL00145`
- ✓ matched FEC IDs (keep): `S2AL00145`

### Catherine Cortez Masto  *(ent_001541)*

- **diagnosis:** CLEAN — single bioguide, all FEC IDs match
- edges observed: 386
- FEC candidate IDs on entity: `S6NV00200`
- canonical bioguide: `C001113`
- canonical FEC IDs (from legislator registry): `S6NV00200`
- ✓ matched FEC IDs (keep): `S6NV00200`

### Ritchie Torres  *(ent_001542)*

- **diagnosis:** CLEAN — single bioguide, all FEC IDs match
- edges observed: 572
- FEC candidate IDs on entity: `H0NY15160`
- canonical bioguide: `T000486`
- canonical FEC IDs (from legislator registry): `H0NY15160`
- ✓ matched FEC IDs (keep): `H0NY15160`

### Nancy Mace  *(ent_001543)*

- **diagnosis:** AMBIGUOUS — 1 suspect FEC ID(s) match the ghost name but 2 distinct candidates share that name in the FEC master, can't auto-resolve
- edges observed: 614
- FEC candidate IDs on entity: `S4SC00281`, `H0SC01394`
- canonical bioguide: `M000194`
- canonical FEC IDs (from legislator registry): `H0SC01394`
- ✓ matched FEC IDs (keep): `H0SC01394`
- candidates with name "Nancy Mace" in FEC master: 2
- suspect FEC IDs (in entity, not in registry's canonical list):
  - `S4SC00281` → MACE, NANCY, office=S, state=SC, year=2014  — ? AMBIGUOUS — name matches but multiple humans share it

### Bernie Moreno  *(ent_001544)*

- **diagnosis:** CLEAN — single bioguide, all FEC IDs match
- edges observed: 566
- FEC candidate IDs on entity: `S4OH00192`
- canonical bioguide: `M001242`
- canonical FEC IDs (from legislator registry): `S4OH00192`
- ✓ matched FEC IDs (keep): `S4OH00192`

### Barbara Lee  *(ent_001545)*

- **diagnosis:** AMBIGUOUS — 1 suspect FEC ID(s) match the ghost name but 2 distinct candidates share that name in the FEC master, can't auto-resolve
- edges observed: 677
- FEC candidate IDs on entity: `H8CA09060`, `S4CA00589`
- canonical bioguide: `L000551`
- canonical FEC IDs (from legislator registry): `H8CA09060`
- ✓ matched FEC IDs (keep): `H8CA09060`
- candidates with name "Barbara Lee" in FEC master: 2
- suspect FEC IDs (in entity, not in registry's canonical list):
  - `S4CA00589` → LEE, BARBARA, office=S, state=CA, year=2024  — ? AMBIGUOUS — name matches but multiple humans share it

### Bob Casey  *(ent_001546)*

- **diagnosis:** AMBIGUOUS — 3 suspect FEC ID(s) match the ghost name but 4 distinct candidates share that name in the FEC master, can't auto-resolve
- edges observed: 780
- FEC candidate IDs on entity: `H4MI10065`, `S6PA00217`, `H6PA18037`, `P60003332`
- canonical bioguide: `C001070`
- canonical FEC IDs (from legislator registry): `S6PA00217`
- ✓ matched FEC IDs (keep): `S6PA00217`
- candidates with name "Bob Casey" in FEC master: 4
- suspect FEC IDs (in entity, not in registry's canonical list):
  - `H4MI10065` → CASEY, ROBERT D, office=H, state=MI, year=2006  — ? AMBIGUOUS — name matches but multiple humans share it
  - `H6PA18037` → CASEY, ROBERT J., office=H, state=PA, year=1978  — ? AMBIGUOUS — name matches but multiple humans share it
  - `P60003332` → CASEY, ROBERT P, office=P, state=US, year=1996  — ? AMBIGUOUS — name matches but multiple humans share it

### Adam Schiff  *(ent_001547)*

- **diagnosis:** CLEAN — single bioguide, all FEC IDs match
- edges observed: 820
- FEC candidate IDs on entity: `H0CA27085`, `S4CA00555`
- canonical bioguide: `S001150`
- canonical FEC IDs (from legislator registry): `H0CA27085`, `S4CA00555`
- ✓ matched FEC IDs (keep): `H0CA27085`, `S4CA00555`

### Sherrod Brown  *(ent_001548)*

- **diagnosis:** CLEAN — single bioguide, all FEC IDs match
- edges observed: 969
- FEC candidate IDs on entity: `H2OH13033`, `S6OH00163`
- canonical bioguide: `B000944`
- canonical FEC IDs (from legislator registry): `H2OH13033`, `S6OH00163`
- ✓ matched FEC IDs (keep): `H2OH13033`, `S6OH00163`

### Chris Christie  *(ent_001549)*

- **diagnosis:** NO_BIOGUIDE_MATCH — name not in legislator-registry; needs manual lookup
- edges observed: 431
- FEC candidate IDs on entity: `P60008521`

### Dianne Feinstein  *(ent_001551)*

- **diagnosis:** CLEAN — single bioguide, all FEC IDs match
- edges observed: 426
- FEC candidate IDs on entity: `S0CA00199`
- canonical bioguide: `F000062`
- canonical FEC IDs (from legislator registry): `S0CA00199`
- ✓ matched FEC IDs (keep): `S0CA00199`

### Michael Bennet  *(ent_001552)*

- **diagnosis:** AMBIGUOUS — 1 suspect FEC ID(s) match the ghost name but 2 distinct candidates share that name in the FEC master, can't auto-resolve
- edges observed: 303
- FEC candidate IDs on entity: `S0CO00211`, `P00011833`
- canonical bioguide: `B001267`
- canonical FEC IDs (from legislator registry): `S0CO00211`
- ✓ matched FEC IDs (keep): `S0CO00211`
- candidates with name "Michael Bennet" in FEC master: 2
- suspect FEC IDs (in entity, not in registry's canonical list):
  - `P00011833` → BENNET, MICHAEL F., office=P, state=US, year=2020  — ? AMBIGUOUS — name matches but multiple humans share it

## Next steps

1. **CLEAN ghosts** — safe to enrich. Set `profile_path`, set `bioguide_id`, run auto-blocks. No edge cleanup needed.
2. **CONTAMINATED ghosts** — prune the suspect FEC IDs from the entity, then identify which edges originated from those IDs (via committee ownership in `fec-committee-registry.json`) and either reassign or delete. Then enrich.
3. **MULTI_PERSON chimeras** — split into multiple entities, one per bioguide, and reassign edges per FEC ID ownership. Highest-effort.
4. **NO_BIOGUIDE_MATCH** — manual lookup; could be retired/defeated/state-level officials not in the federal registry.
