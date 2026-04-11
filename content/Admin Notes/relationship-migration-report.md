---
title: Relationship Migration Report
type: admin-note
note-type: data
priority: normal
status: open
last-updated: 2026-04-11
---

# Relationship Migration Report

Generated: 2026-04-11T20:13:47.328Z
Mode: WRITE
Script: [scripts/migrate-frontmatter-to-relationships-jsonl.cjs](../../scripts/migrate-frontmatter-to-relationships-jsonl.cjs)

## Summary

- Profiles scanned: **1858**
- Profiles with relationship fields: **1391**
- Raw edge candidates extracted: **14218**
- Edges emitted to `data/relationships.jsonl`: **12737**
- Deduped corroborated edges (seen from both endpoints): **291**

## Skipped

- Target profile not found: **752**
- Source profile not found: **0**
- Title collision (ambiguous target): **424**
- Validation failure: **0**

## By relationship type

| Type | Count |
|------|-------|
| `related` | 11745 |
| `monetary` | 928 |
| `political-opposition` | 47 |
| `story-link` | 17 |

## By source frontmatter field

| Field | Contributed edges |
|-------|-------------------|
| `related` | 11745 |
| `politicians-funded` | 608 |
| `top-donors` | 290 |
| `opposes` | 36 |
| `donors` | 30 |
| `stories` | 17 |
| `politicians-opposed` | 11 |

## Top missing targets

Wikilinks pointing to profiles that do not exist in the vault. These edges were
dropped during migration. The future categorizer or a content session can either
create the missing profiles or remove the dangling links.

| Target title | Dangling references |
|--------------|----------------------|
| PhRMA | 42 |
| Raytheon (RTX) | 25 |
| Media Pipeline Framework | 25 |
| AIPAC | 25 |
| GEO Group | 18 |
| Pfizer | 18 |
| EMILY's List | 9 |
| Lobbying Firms Framework | 9 |
| Koch Network | 9 |
| Blackstone | 9 |
| Jeff Yass | 8 |
| VAULT_INDEX | 8 |
| Think Tank Framework | 8 |
| Fox Corp - Rupert Murdoch | 8 |
| Wilks Brothers | 8 |
| United Democracy Project | 7 |
| Raytheon | 6 |
| AT&T - WarnerMedia | 6 |
| Fairshake PAC - Crypto Super PAC | 6 |
| [] | 6 |
| DMFI PAC | 6 |
| Helms-Burton Title III and the Bacardi Trademark Wars | 5 |
| Ripple Labs | 5 |
| Palantir | 5 |
| Freedom Caucus | 5 |
| Goldman Sachs - Wall Street Titan | 5 |
| SEIU | 5 |
| CalSTRS | 4 |
| Google | 4 |
| Meta | 4 |
| _...and 374 more_ | |

## Title collisions encountered

Target titles that matched multiple profiles. These edges were skipped —
disambiguation via `from_slug` / `to_slug` requires manual review.

| Target title | References that collided |
|--------------|--------------------------|
| Heritage Foundation | 60 |
| Federalist Society | 59 |
| PhRMA - Pharmaceutical Research and Manufacturers of America | 38 |
| Labor - Donors and Backers | 37 |
| David Sacks | 36 |
| Center for American Progress | 34 |
| American Enterprise Institute | 32 |
| Environment - Donors and Backers | 29 |
| Healthcare - Donors and Backers | 24 |
| Ballard Partners | 18 |
| JB Pritzker | 17 |
| Education - Donors and Backers | 13 |
| Juliana Stratton | 12 |
| Housing - Donors and Backers | 11 |
| Sarah Huckabee Sanders | 4 |

## Notes

- All edges are tagged `source: frontmatter-migration`, `confidence: 0.5`. Corroborated edges
  (where the same relationship was found on both endpoints' frontmatter) are upgraded to `0.6`.
- Monetary edges have `null` amount / cycle — they are exempt from the type-required-extras
  check via the `MIGRATION_SOURCES` allowlist in `scripts/lib/relationship-edge-validator.cjs`.
  The Phase 3 Part 2 categorizer will upgrade them once Tier 1 pipeline data (FEC, LDA) fills
  in the missing metadata.
- No profile `.md` files were modified. Frontmatter fields are still the canonical legacy view.
  Phase 3 Parts 2–4 will gradually rewire consumers to read from `data/relationships.jsonl`.
