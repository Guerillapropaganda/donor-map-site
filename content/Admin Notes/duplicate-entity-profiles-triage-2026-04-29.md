---
title: Duplicate-entity-profile triage 2026-04-29
type: admin-note
status: open
tags: [editorial, librarian, duplicates]
last-updated: 2026-04-29
---

# 11 duplicate-entity-profile groups — editorial triage

`duplicate-entity-profiles-check` found 11 cases where two (or more) profiles share an FEC committee ID, EIN, or SEC CIK. Some are obvious editorial duplicates; others are legitimate distinctions that share an ID for real-world reasons.

David's lane — these all need editorial judgment, not automation.

## Category A — obvious dash-prefix duplicates (5 groups)

These look like ingest artifacts where the same entity got two profiles, one with a "X - Long Name" prefix and one canonical. Recommend: keep the one without the dash-prefix as canonical, redirect the other.

| Canonical (recommended) | Duplicate | Shared key |
|---|---|---|
| `Western States Petroleum Association` | `WSPA - Western States Petroleum Association` | EIN 950596680 |
| `Walmart` | `Walmart - Walton Family` | SEC CIK 0000104169 |
| `PG&E` | `PG&E - Pacific Gas and Electric` | SEC CIK 0001004980 |
| `CoreCivic` | `CoreCivic - Private Prisons` | SEC CIK 0001070985 |

Wait — that's 4. The 5th obvious one is the Anthem case:

| `Anthem - Elevance Health Political Operation` | `Anthem PAC` | FEC C00198069 |

Anthem renamed to Elevance in 2022 — the longer name reflects the rename. Both could survive (PAC vs corporate parent), or merge into one with the rename in the body.

## Category B — same FEC committee, different editorial treatment (2 groups)

| Profiles | Shared key | Likely call |
|---|---|---|
| `Club for Growth` + `Club for Growth INC PAC` | FEC C00432260 | Same org, two profiles. Pick canonical, redirect the other. |
| `National Right to Life PAC` + `National Right to Life Victory Fund` | FEC C00509893 | The Victory Fund IS the PAC's IE arm — distinct legally but same FEC ID is suspicious. Worth a check whether the FEC ID is correct on both. |

## Category C — intentionally distinct, share an ID for real-world reasons (4 groups)

These are NOT duplicates — they're correctly separated by editorial choice. Two options:
1. Mark them as "intentionally distinct" so the harness check stops flagging them (would need a `siblings: [other_id]` or `intentionally_distinct: true` field on the entity record + harness check honoring it).
2. Re-examine the shared-ID assignment — sometimes one of them shouldn't have the ID.

| Profile A | Profile B | Shared key | Reason they're distinct |
|---|---|---|---|
| `Citadel - Kenneth Griffin` | `Kenneth Griffin` | EIN 362167797 | Firm vs person. Likely Citadel's EIN is on Griffin's profile incorrectly — Griffin himself doesn't have an EIN; that's Citadel. |
| `Reclaim America PAC` | `Save America PAC` | EIN 933113620 | Trump's two PACs sharing an EIN is suspicious. Worth a verification — likely one ID is wrong. |
| `Miriam Adelson` | `Sheldon & Miriam Adelson` | EIN 886063073 | Sheldon died 2021. Same family wealth, different legal entity. Could merge into one "Adelson Family" profile or keep both with cross-link. |
| `Walmart - Walton Family` | `Walton Family Foundation` | EIN 472066714 | Corp + family wealth vs charitable foundation. Genuinely distinct — the Foundation is a 501(c)(3); Walmart is a corp. EIN sharing is wrong on one of them. |

## Summary by action

- **5 ingest-artifact merges** (Category A) — pick canonical, redirect other, run dedupe-entities.cjs
- **2 same-org-different-treatment** (Category B) — pick canonical or verify the FEC ID
- **4 likely-incorrect-shared-IDs** (Category C) — verify which one actually has the EIN/CIK and remove from the other; the harness flag goes away once the IDs are unique

## What I did not do

- **No merges.** Every group needs editorial decision.
- **No ID corrections.** Same.
- **No new "intentionally distinct" field.** That'd be a Rule-22-shaped change to the harness check + entity schema; design before code.
