---
title: Entity Signals Schema
type: admin-note
note-type: data
priority: normal
status: open
last-updated: '2026-04-29'
---

# Entity Signals Schema

The `signals` field on every record in `data/entities.jsonl` is a
free-form `Record<string, unknown>` — we don't enforce a fixed schema
because new identifier types appear over time and we don't want to
block ingest on every new field. This note is the **conventional**
schema: the keys we use, what they mean, and which scripts read them.

The librarian's resolver and the harness checks read these. If you add
a new key, document it here so future scripts can find it.

## Federal identifiers

| Key | Type | Meaning | Set by |
|-----|------|---------|--------|
| `fec_committee_id` | string | Single primary FEC committee id (`C00865444`) | FEC pipelines |
| `fec_committee_ids` | string[] | All FEC committee ids associated with this entity (multi-committee orgs) | FEC pipelines |
| `fec_candidate_ids` | string[] | FEC candidate ids (politicians) | FEC pipelines |
| `bioguide` | string | Congressional bioguide id (`A000001`) | legislator-registry |
| `ein` | string | IRS EIN (`46-1957345`) | IRS 990 + Cal-Access ingest |
| `sec_cik` | string | SEC Central Index Key (`0001070985`) | EDGAR ingest |

## State identifiers (added 2026-04-29 for Cal-Access)

| Key | Type | Meaning | Set by |
|-----|------|---------|--------|
| `cal_access_filer_id` | string | California FPPC filer id (`1480025`, `1480425-CAO`) | Cal-Access ingest (planned) + Perplexity research import |
| `jurisdiction` | string | Filing jurisdiction: `state` \| `federal` \| `501c4` \| `527` \| `nonprofit` | Cal-Access ingest, FEC pipelines |
| `committee_status` | string | Lifecycle: `active` \| `winding-down` \| `closed` \| `suspended` | Cal-Access ingest, FEC pipelines, manual editorial |

These three were added when the 2026 CA Governor race surfaced the
Cal-Access gap. `cal_access_filer_id` is the parallel to
`fec_committee_id` for state-level money. `jurisdiction` is critical
because a "Hilton for Governor 2026" state committee and a "Steve
Hilton" federal exploratory PAC could otherwise resolve to the same
entity. `committee_status` lets the librarian distinguish active fundraising
committees from wind-down accounts that shouldn't carry "current cycle"
weight in queries.

## Industry / business identifiers

| Key | Type | Meaning | Set by |
|-----|------|---------|--------|
| `lei` | string | Legal Entity Identifier (financial institutions) | Manual / FFIEC ingest (rare) |
| `duns` | string | Dun & Bradstreet number (federal contractors) | USASpending pipeline |
| `cage_code` | string | Commercial and Government Entity code (DOD vendors) | USASpending pipeline |

## Class / classification

| Key | Type | Meaning | Set by |
|-----|------|---------|--------|
| `sector` | string | Free-form sector tag (`Wall Street`, `Big Tech`, `Carceral State`) | Manual + Path B classifier |
| `capital_type` | string | ADR-0001 capital type (`fossil-capital`, `tech-monopoly-capital`, `mega-donors`) | Path B classifier |
| `class_position` | string | ADR-0001 class position | Editorial |
| `ideological_function` | string[] | ADR-0001 ideological function tags | Editorial |

## Fields the duplicate-entity-profiles-check looks at

When you add a NEW identifier signal that uniquely identifies the same
real-world entity (like `cal_access_filer_id`), also extend
`scripts/duplicate-entity-profiles-check.cjs` so the harness catches
duplicates on that key. Otherwise we'll create twin profiles when ingest
runs for the first time.

Currently checked: `fec_committee_id`(s), `ein`, `sec_cik`, normalized name,
prefix-descriptor match. As of 2026-04-29 the harness extension for
`cal_access_filer_id` shipped alongside this note.

## Adding a new signal key

1. Add a row to one of the tables above.
2. Update `scripts/duplicate-entity-profiles-check.cjs` if the new key
   uniquely identifies the same real-world entity.
3. Update the Cal-Access / FEC / etc. ingester that populates it.
4. If consumed by ops surfaces, document where in this file.
