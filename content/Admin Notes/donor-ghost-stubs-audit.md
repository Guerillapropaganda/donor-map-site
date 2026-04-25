---
title: Donor Ghost Stubs Audit
generated: 2026-04-25T21:37:23.263Z
source-script: scripts/audit-donor-ghost-stubs.cjs
---

# Donor Ghost Stubs Audit — 2026-04-25

Diagnostic for the 411 donor entity records flagged by `pathless-stub-entities-check.cjs` whose names look like FEC campaign committee names (TIM SHEEHY FOR MONTANA, FRIENDS OF STEVE DAINES, RAND PAUL FOR US SENATE, etc.). Phase 3 cache-builder cutover blocker.

Each entry exists as a separate entity that the librarian-backed cache builds an empty bucket for, while the candidate's real vault profile sits separately. The fix path: ensure each committee resolves to the candidate's entity via `data/fec-committee-registry.json`.

## Headline counts

- Total donor ghosts: **411**
- CLEAN (registry already maps; ghost record can be deleted): **237**
- REGISTRY_GAP (registry has committee but no vault_profile): **0**
- REGISTRY_MISSING (committee not in registry at all): **174**
- NO_FEC_COMMITTEE_ID (ghost has no committee_id; manual lookup): **0**

- Total edges across all ghost names: **25,666**

## CLEAN — registry already maps; ghost record deletable (237)

### STEVE DAINES FOR MONTANA  *(ent_001555)*

- **diagnosis:** CLEAN — registry already maps committee to a vault profile; ghost record is redundant and can be deleted
- committee: `C00491357`
- edges: 129
- target profile: `content/Politicians/Republicans/Senate/Steve Daines/_Steve Daines Master Profile.md`

### RAND PAUL FOR US SENATE  *(ent_001558)*

- **diagnosis:** CLEAN — registry already maps committee to a vault profile; ghost record is redundant and can be deleted
- committee: `C00496075`
- edges: 146
- target profile: `content/Politicians/Republicans/Senate/Rand Paul/_Rand Paul Master Profile.md`

### PETE RICKETTS FOR SENATE  *(ent_001560)*

- **diagnosis:** CLEAN — registry already maps committee to a vault profile; ghost record is redundant and can be deleted
- committee: `C00832436`
- edges: 43
- target profile: `content/Politicians/Republicans/Senate/Pete Ricketts/_Pete Ricketts Master Profile.md`

### MULLIN FOR AMERICA  *(ent_001566)*

- **diagnosis:** CLEAN — registry already maps committee to a vault profile; ghost record is redundant and can be deleted
- committee: `C00498345`
- edges: 87
- target profile: `content/Politicians/Republicans/Senate/Markwayne Mullin/_Markwayne Mullin Master Profile.md`

### JOHN CURTIS FOR UTAH  *(ent_001569)*

- **diagnosis:** CLEAN — registry already maps committee to a vault profile; ghost record is redundant and can be deleted
- committee: `C00647339`
- edges: 78
- target profile: `content/Politicians/Republicans/Senate/John R. Curtis/_John R. Curtis Master Profile.md`

### MORAN FOR KANSAS  *(ent_001571)*

- **diagnosis:** CLEAN — registry already maps committee to a vault profile; ghost record is redundant and can be deleted
- committee: `C00458315`
- edges: 69
- target profile: `content/Politicians/Republicans/Senate/Jerry Moran/_Jerry Moran Master Profile.md`

### ALASKANS FOR DAN SULLIVAN  *(ent_001575)*

- **diagnosis:** CLEAN — registry already maps committee to a vault profile; ghost record is redundant and can be deleted
- committee: `C00570994`
- edges: 49
- target profile: `content/Politicians/Republicans/Senate/Dan Sullivan/_Dan Sullivan Master Profile.md`

### CINDY HYDE-SMITH FOR US SENATE  *(ent_001577)*

- **diagnosis:** CLEAN — registry already maps committee to a vault profile; ghost record is redundant and can be deleted
- committee: `C00675348`
- edges: 61
- target profile: `content/Politicians/Republicans/Senate/Cindy Hyde-Smith/_Cindy Hyde-Smith Master Profile.md`

### YOUNG KIM FOR CONGRESS  *(ent_001582)*

- **diagnosis:** CLEAN — registry already maps committee to a vault profile; ghost record is redundant and can be deleted
- committee: `C00665638`
- edges: 114
- target profile: `content/Politicians/Republicans/House/Young Kim/_Young Kim Master Profile.md`

### HUNT FOR SENATE  *(ent_001585)*

- **diagnosis:** CLEAN — registry already maps committee to a vault profile; ghost record is redundant and can be deleted
- committee: `C00701003`
- edges: 77
- target profile: `content/Politicians/Republicans/House/Wesley Hunt/_Wesley Hunt Master Profile.md`

*...and 227 more — see JSON output for full list*

## REGISTRY_MISSING — committee not in registry (174)

### TIM SHEEHY FOR MONTANA  *(ent_001553)*

- **diagnosis:** REGISTRY_MISSING — committee not in fec-committee-registry — fix by setting registry vault_profile to content/Politicians/Republicans/Senate/Tim Sheehy/_Tim Sheehy Master Profile.md
- committee: `C00844159`
- edges: 120
- target profile: `content/Politicians/Republicans/Senate/Tim Sheehy/_Tim Sheehy Master Profile.md`
- candidate: SHEEHY, TIM (`S4MT00183`, year undefined, bioguide `S001232`)

### SHEEHY FOR MT SENATE REPUBLICAN NOMINEE FUND 2024  *(ent_001554)*

- **diagnosis:** REGISTRY_MISSING — committee not in fec-committee-registry — fix by setting registry vault_profile to content/Politicians/Republicans/Senate/Tim Sheehy/_Tim Sheehy Master Profile.md
- committee: `C00829465`
- edges: 2
- target profile: `content/Politicians/Republicans/Senate/Tim Sheehy/_Tim Sheehy Master Profile.md`
- candidate: SHEEHY, TIM (`S4MT00183`, year undefined, bioguide `S001232`)

### FRIENDS OF STEVE DAINES  *(ent_001556)*

- **diagnosis:** REGISTRY_MISSING — committee not in fec-committee-registry — fix by setting registry vault_profile to content/Politicians/Republicans/Senate/Steve Daines/_Steve Daines Master Profile.md
- committee: `C00705715`
- edges: 0
- target profile: `content/Politicians/Republicans/Senate/Steve Daines/_Steve Daines Master Profile.md`
- candidate: DAINES, STEVE (`S2MT00096`, year undefined, bioguide `D000618`)

### RAND PAUL FOR US SENATE 2010  *(ent_001557)*

- **diagnosis:** REGISTRY_MISSING — committee not in fec-committee-registry — fix by setting registry vault_profile to content/Politicians/Republicans/Senate/Rand Paul/_Rand Paul Master Profile.md
- committee: `C00462069`
- edges: 32
- target profile: `content/Politicians/Republicans/Senate/Rand Paul/_Rand Paul Master Profile.md`
- candidate: PAUL, RAND (`S0KY00156`, year undefined, bioguide `P000603`)

### ROUNDS FOR SENATE  *(ent_001561)*

- **diagnosis:** REGISTRY_MISSING — committee not in fec-committee-registry — fix by setting registry vault_profile to content/Politicians/Republicans/Senate/Mike Rounds/_Mike Rounds Master Profile.md
- committee: `C00532465`
- edges: 64
- target profile: `content/Politicians/Republicans/Senate/Mike Rounds/_Mike Rounds Master Profile.md`
- candidate: ROUNDS, MIKE (`S4SD00049`, year undefined, bioguide `R000605`)

### FRIENDS OF MIKE ROUNDS  *(ent_001562)*

- **diagnosis:** REGISTRY_MISSING — committee not in fec-committee-registry — fix by setting registry vault_profile to content/Politicians/Republicans/Senate/Mike Rounds/_Mike Rounds Master Profile.md
- committee: `C00705566`
- edges: 0
- target profile: `content/Politicians/Republicans/Senate/Mike Rounds/_Mike Rounds Master Profile.md`
- candidate: ROUNDS, MIKE (`S4SD00049`, year undefined, bioguide `R000605`)

### WHATLEY FOR NC SENATE REPUBLICAN NOMINEE FUND 2026  *(ent_001564)*

- **diagnosis:** REGISTRY_MISSING — committee not in fec-committee-registry — candidate S6NC00415 has no bioguide in legislator-registry (likely state/local or pre-Congress)
- committee: `C00909416`
- edges: 1
- candidate: WHATLEY, MICHAEL (`S6NC00415`, year undefined, bioguide `-`)

### WHATLEY FOR SENATE  *(ent_001565)*

- **diagnosis:** REGISTRY_MISSING — committee not in fec-committee-registry — candidate S6NC00415 has no bioguide in legislator-registry (likely state/local or pre-Congress)
- committee: `C00913996`
- edges: 26
- candidate: WHATLEY, MICHAEL (`S6NC00415`, year undefined, bioguide `-`)

### LISA MURKOWSKI FOR US SENATE  *(ent_001567)*

- **diagnosis:** REGISTRY_MISSING — committee not in fec-committee-registry — fix by setting registry vault_profile to content/Politicians/Republicans/Senate/Lisa Murkowski/_Lisa Murkowski Master Profile.md
- committee: `C00384529`
- edges: 112
- target profile: `content/Politicians/Republicans/Senate/Lisa Murkowski/_Lisa Murkowski Master Profile.md`
- candidate: MURKOWSKI, LISA (`S4AK00099`, year undefined, bioguide `M001153`)

### CURTIS FOR UT SENATE REPUBLICAN NOMINEE FUND 2024  *(ent_001568)*

- **diagnosis:** REGISTRY_MISSING — committee not in fec-committee-registry — fix by setting registry vault_profile to content/Politicians/Republicans/Senate/John R. Curtis/_John R. Curtis Master Profile.md
- committee: `C00850545`
- edges: 6
- target profile: `content/Politicians/Republicans/Senate/John R. Curtis/_John R. Curtis Master Profile.md`
- candidate: CURTIS, JOHN (`S4UT00282`, year undefined, bioguide `C001114`)

*...and 164 more — see JSON output for full list*

## Next steps

1. **CLEAN ghosts** — delete entity record. The librarian already routes the committee name to the candidate via fec-committee-registry alias attachment (resolver.ts Step 3). Removing the ghost stops it from creating an empty bucket.
2. **REGISTRY_GAP ghosts** — patch the registry entry: set `vault_profile` to the candidate's entity profile_path. Then delete the entity record.
3. **REGISTRY_MISSING ghosts** — add a registry entry with `vault_profile` set, then delete the entity record.
4. **NO_FEC_COMMITTEE_ID ghosts** — manual review. May not be FEC-shaped at all.
