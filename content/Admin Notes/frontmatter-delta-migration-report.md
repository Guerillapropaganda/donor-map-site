---
title: Frontmatter Delta Migration Report
type: admin-note
note-type: data
status: open
last-updated: 2026-04-15
generator: scripts/migrate-frontmatter-delta.cjs
---

# Frontmatter Delta Migration Report

Generated: 2026-04-15T04:22:36.023Z
Mode: WRITE

Re-scans vault frontmatter for relationship fields and upserts edges into `data/relationships.jsonl`. Unlike the original Phase 3 Part 1 migration, this script uses `relationships-store.upsertEdges()` to MERGE with existing edges, preserving all non-frontmatter sources (pipelines, manual-ops, etc.).

## Summary

- Profiles scanned: 2564
- Profiles with relationships: 1399
- Raw wikilink targets: 16757
- Edge candidates built: 16097
- Skipped (missing target): 654
- Skipped (missing source): 0
- Skipped (collision): 0
- Skipped (self-link): 6

## By field

| Field | Edges built |
|---|---:|
| `related` | 14644 |
| `politicians-funded` | 713 |
| `top-donors` | 343 |
| `donors` | 253 |
| `opposes` | 114 |
| `stories` | 17 |
| `politicians-opposed` | 13 |

## By type

| Type | Edges built |
|---|---:|
| `related` | 14644 |
| `monetary` | 1309 |
| `political-opposition` | 127 |
| `story-link` | 17 |

## Applied to canonical store

- Edges before: 27594
- Edges after: 30213
- Net new: **+2619**
- upsertEdges added: 2619
- upsertEdges updated: 13146
- upsertEdges skipped (no-change): 332
- upsertEdges invalid: 0

## Top missing targets (wikilinks with no matching profile)

These are wikilinks in frontmatter that don't resolve to any profile in the title index. They might be typos, or references to profiles that haven't been created yet.

| Target | Referenced by N profiles |
|---|---:|
| PhRMA | 41 |
| AIPAC | 26 |
| Raytheon (RTX) | 25 |
| Media Pipeline Framework | 25 |
| GEO Group | 18 |
| Pfizer | 18 |
| EMILY's List | 9 |
| Lobbying Firms Framework | 9 |
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
| Helms-Burton Title III and the Bacardi Trademark Wars | 5 |

---

*Regenerate: `node scripts/migrate-frontmatter-delta.cjs --write`. Safe to re-run — idempotent.*
