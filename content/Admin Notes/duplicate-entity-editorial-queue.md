---
title: Duplicate Entity Profiles — Editorial Queue
status: open
created: 2026-04-25
owner: David
tags: [data, editorial, duplicate-entity]
note-kind: ticket
---

# Duplicate Entity Profiles — Editorial Queue

The 5th harness check (`scripts/duplicate-entity-profiles-check.cjs`) flagged 14 groups of vault entities that share an FEC committee ID, EIN, or SEC CIK on 2026-04-25.

**3 of the 14** were caused by an architectural bug in `auto-link-committee-affiliates.cjs` — that script wrote committees into an entity's `signals.fec_committee_ids` whenever the committee declared the entity as its FEC `connected_org`, conflating "I am a sub-account of X" with "I share a treasurer with X". The fix landed 2026-04-25 and `scripts/scrub-affiliate-id-pollution.cjs` cleaned the pollution. **Resolved:** Equality Project / Resolute Courage, NEA / NEA Advocacy Fund, NNU / NNU for Patient Protection.

**The remaining 11 require editorial decisions** — they're either true duplicate profiles that need merging, sibling-entity profiles where one side has the wrong external ID, or parent-org / affiliated-PAC pairs where the right ID assignment depends on intent.

Run `node scripts/duplicate-entity-profiles-check.cjs` for the live list. As of 2026-04-25:

## FEC committee ID collisions (3)

### `C00432260` — CLUB FOR GROWTH PAC
- `ent_000083` Club for Growth → [profile](../Donors%20%26%20Power%20Networks/Super%20PACs/Club%20for%20Growth.md)
- `ent_001326` Club for Growth INC PAC → [profile](../Donors%20%26%20Power%20Networks/Super%20PACs/Club%20for%20Growth%20INC%20PAC.md)
- **Likely true duplicate.** `ent_001326` is an auto-stub created by `scripts/create-top-fec-pac-stubs.cjs` for the same PAC `ent_000083` already represents. Merge: pick `ent_000083` as canonical, archive the stub profile, reroute any incoming edges.

### `C00198069` — ANTHEM INSURANCE COMPANIES INC GOOD GOVERNMENT PROGRAM PAC
- `ent_000140` Anthem PAC → [profile](../Donors%20%26%20Power%20Networks/Pharma%20%26%20Healthcare/Anthem%20PAC.md)
- `ent_000274` Anthem - Elevance Health Political Operation → [profile](../Donors%20%26%20Power%20Networks/Healthcare/Anthem%20-%20Elevance%20Health%20Political%20Operation.md)
- **Decide: parent corporation vs its PAC, or duplicate?** The committee is the corporate PAC. If "Anthem - Elevance Health" is the corporate parent profile and "Anthem PAC" is the PAC, the FEC ID belongs on the PAC profile and the parent should reference it via a relationship edge — not duplicate the ID. If they're truly the same entity profiled twice, merge.

### `C00509893` — NATIONAL RIGHT TO LIFE VICTORY FUND
- `ent_001187` National Right to Life PAC → [profile](../Donors%20%26%20Power%20Networks/Super%20PACs/National%20Right%20to%20Life%20PAC.md)
- `ent_001251` National Right to Life Victory Fund → [profile](../Donors%20%26%20Power%20Networks/Dark%20Money/National%20Right%20to%20Life%20Victory%20Fund.md)
- **The committee is the Victory Fund.** Strip from `ent_001187` if NRTL PAC is intended as a separate entity (its own committee should be `C00111278` per the existing `fec_committee_ids` array).

## EIN collisions (4)

### `362167797` — Citadel-related EIN
- `ent_000014` Citadel - Kenneth Griffin → [profile](../Donors%20%26%20Power%20Networks/Wall%20Street/Citadel%20-%20Kenneth%20Griffin.md)
- `ent_000185` Kenneth Griffin → [profile](../Donors%20%26%20Power%20Networks/Mega-Donors/Kenneth%20Griffin.md)
- **EIN belongs to Citadel LLC (the firm), not the human Griffin.** Strip EIN from `ent_000185`. Verify `ent_000014` is the firm-level profile.

### `933113620` — Trump-orbit PAC EIN
- `ent_000105` Reclaim America PAC → [profile](../Donors%20%26%20Power%20Networks/Super%20PACs/Reclaim%20America%20PAC.md)
- `ent_000106` Save America PAC → [profile](../Donors%20%26%20Power%20Networks/Super%20PACs/Save%20America%20PAC.md)
- **Different PACs.** Verify which one the EIN actually belongs to (URL-verification is David's lane); strip from the other.

### `886063073` — Adelson-related EIN
- `ent_000194` Miriam Adelson → [profile](../Donors%20%26%20Power%20Networks/Mega-Donors/Miriam%20Adelson.md)
- `ent_000212` Sheldon & Miriam Adelson → [profile](../Donors%20%26%20Power%20Networks/Mega-Donors/Sheldon%20Adelson.md)
- **Likely duplicate person/family profile.** Decide canonical (probably the joint profile) and merge.

### `472066714` — Walton-related EIN
- `ent_000221` Walmart - Walton Family → [profile](../Donors%20%26%20Power%20Networks/Mega-Donors/Walmart%20-%20Walton%20Family.md)
- `ent_000340` Walton Family Foundation → [profile](../Donors%20%26%20Power%20Networks/Education/Walton%20Family%20Foundation.md)
- **Walton Family Foundation has its own EIN** (different from Walmart Inc). Verify which entity 47-2066714 actually belongs to; strip from the other.

## SEC CIK collisions (3) + WSPA EIN

### `0000104169` — Walmart CIK
- `ent_000035` Walmart → [profile](../Donors%20%26%20Power%20Networks/Wall%20Street/Walmart.md)
- `ent_000221` Walmart - Walton Family → [profile](../Donors%20%26%20Power%20Networks/Mega-Donors/Walmart%20-%20Walton%20Family.md)
- **Likely duplicate corporate profile.** Pick canonical (probably the Wall Street one) and merge.

### `0001004980` — PG&E CIK
- `ent_000325` PG&E - Pacific Gas and Electric → [profile](../Donors%20%26%20Power%20Networks/Energy%20%26%20Utilities/PG%26E%20-%20Pacific%20Gas%20and%20Electric.md)
- `ent_000326` PG&E → [profile](../Donors%20%26%20Power%20Networks/Energy%20%26%20Utilities/PG%26E.md)
- **True duplicate corporate profile.** Merge.

### `0001070985` — CoreCivic CIK
- `ent_000435` CoreCivic - Private Prisons → [profile](../Donors%20%26%20Power%20Networks/Carceral%20State/CoreCivic%20-%20Private%20Prisons.md)
- `ent_000436` CoreCivic → [profile](../Donors%20%26%20Power%20Networks/Carceral%20State/CoreCivic.md)
- **True duplicate corporate profile.** Merge.

### `950596680` — WSPA EIN
- `ent_000329` Western States Petroleum Association → [profile](../Donors%20%26%20Power%20Networks/Energy%20%26%20Utilities/Western%20States%20Petroleum%20Association.md)
- `ent_000331` WSPA - Western States Petroleum Association → [profile](../Donors%20%26%20Power%20Networks/Energy%20%26%20Utilities/WSPA%20-%20Western%20States%20Petroleum%20Association.md)
- **True duplicate.** Merge.

## How to resolve

For **strip-an-ID** cases (Citadel/Griffin EIN, Walton EIN, Trump-PAC EIN, NRTL committee, Anthem committee):
- Edit the wrong entity's record in `data/entities.jsonl` to null/remove the field.
- Run `node scripts/build-relationships-per-profile.cjs` to refresh the librarian cache.
- Run `node scripts/duplicate-entity-profiles-check.cjs` to confirm.

For **merge** cases (everything else):
- Pick canonical (usually the longer profile, or the one in the more semantically correct folder).
- Move incoming edges from the loser to the winner (use existing `merge-phantom-entity-records.cjs` as a pattern).
- Move any unique frontmatter fields / body content to the winner.
- Archive the loser to `Vault Maintenance/Archive/`.
- Update the loser's entity record to mark it merged (or remove it from `entities.jsonl`).
- Refresh librarian cache + re-run the check.
