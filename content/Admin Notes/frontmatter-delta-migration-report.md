---
title: Frontmatter Delta Migration Report
type: admin-note
note-type: data
status: open
last-updated: 2026-04-15
generator: scripts/migrate-frontmatter-delta.cjs
---

# Frontmatter Delta Migration Report

Generated: 2026-04-15T20:24:56.042Z
Mode: **DRY RUN** (no files written)

Re-scans vault frontmatter for relationship fields and upserts edges into `data/relationships.jsonl`. Unlike the original Phase 3 Part 1 migration, this script uses `relationships-store.upsertEdges()` to MERGE with existing edges, preserving all non-frontmatter sources (pipelines, manual-ops, etc.).

## Summary

- Profiles scanned: 2849
- Profiles with relationships: 1765
- Raw wikilink targets: 19075
- Edge candidates built: 18736
- Skipped (missing target): 334
- Skipped (missing source): 0
- Skipped (collision): 0
- Skipped (self-link): 5

## By field

| Field | Edges built |
|---|---:|
| `related` | 14972 |
| `donors` | 1576 |
| `politicians-funded` | 1423 |
| `top-donors` | 602 |
| `opposes` | 133 |
| `stories` | 17 |
| `politicians-opposed` | 13 |

## By type

| Type | Edges built |
|---|---:|
| `related` | 14972 |
| `monetary` | 3601 |
| `political-opposition` | 146 |
| `story-link` | 17 |

## Top missing targets (wikilinks with no matching profile)

These are wikilinks in frontmatter that don't resolve to any profile in the title index. They might be typos, or references to profiles that haven't been created yet.

| Target | Referenced by N profiles |
|---|---:|
| AIPAC | 22 |
| EMILY's List | 8 |
| Fox Corp - Rupert Murdoch | 8 |
| [] | 6 |
| Ripple Labs | 5 |
| United Democracy Project | 5 |
| SENATE LEADERSHIP FUND | 4 |
| America First Legal | 3 |
| Koch - Koch Industries | 3 |
| Small Dollar Donors (ActBlue) | 3 |
| SEIU | 3 |
| How Money Captures Media — The Donor Map Media Pipeline | 3 |
| Donna Edwards | 2 |
| Marc Andreessen | 2 |
| Restaurant & Food Industry | 2 |
| Haley Stevens | 2 |
| GENIUS Act | 2 |
| Comcast Corporation | 2 |
| First Look Media | 2 |
| Real Estate Donors | 2 |

---

*Regenerate: `node scripts/migrate-frontmatter-delta.cjs --write`. Safe to re-run — idempotent.*
