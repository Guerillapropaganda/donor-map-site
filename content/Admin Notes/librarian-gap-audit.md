---
title: Librarian Gap Audit
status: open
type: audit-report
auto-generated: false
last-refresh: 2026-04-28
owners: code-claude, david
auto-resolve-when: by_class.unresolvable.count == 0 AND by_class.alias-candidate.count == 0
---

# Librarian Gap Audit

## What this is

The librarian (`lib/donor-map/`, ADR-0024) is the source of truth for "is X
connected to Y." Frontmatter caches drift from it (ADR-0027). The orphan-
candidates store (ADR-0027 P1) tells us *which* names don't connect; this
audit answers *why*.

Run via the harness every 15 min (`vault-audit.cjs → librarian-gap-audit`).
JSON output at `content/Admin Notes/vault-audit-latest.json`. Report
findings here.

## Gap classes (ranked by leverage to fix)

The audit classifies every wikilink in every guarded frontmatter field
(`politicians-funded`, `donors`, `top-donors`, `opposes`, `related`) into
one of five buckets:

1. **`unresolvable`** — Wikilink name has zero awareness in entities.jsonl
   AND zero edge endpoints across canonical + derived stores. Either a
   typo, an aliased form, or an entity that never got a registry row.

2. **`node-isolated`** — Name exists in entities.jsonl OR as an edge
   endpoint, but has zero edges in any direction. Registered but no
   relationship data ever written. Pipeline coverage gap.

3. **`fec-committee-suspect`** — Wikilink shape matches FEC committee
   patterns (ALL CAPS, "FOR CONGRESS / SENATE", committee_id form).
   Subject of the documented multi-session committee-stub-resolution
   project (`content/Admin Notes/fec-committee-stub-resolution.md`).

4. **`alias-candidate`** — Name resolves and has edges, AND there's a
   high-similarity variant in the corpus that's likely the same entity
   (e.g. "Bank of America" vs "BANK OF AMERICA,NA"). Closable by alias
   unification work.

5. **`ok`** — Name resolves cleanly to a node with edges. Not a gap.

## Latest snapshot (2026-04-28)

```
11,244 unique wikilinks across guarded fields
   7,463  ok
   3,090  alias-candidate
     655  unresolvable
      18  node-isolated
      18  fec-committee-suspect
```

**Top closable buckets by appearance volume:**

### 1. The `_Foo Master Profile` wikilink convention (~1,500 appearances)

Quartz's file naming convention is `_Politician Master Profile.md`. Many
profiles wikilink the file stem (`[[_Donald Trump Master Profile]]`)
instead of the canonical name (`[[Donald Trump]]`). The librarian's
resolver uses the entity's `name` field, which doesn't include the
`_Master Profile` prefix. Top offenders:

```
306  _Donald Trump Master Profile
150  _Jon Ossoff Master Profile
141  _Marco Rubio Master Profile
127  _Gavin Newsom Master Profile
120  _Ted Cruz Master Profile
116  _Nancy Pelosi Master Profile
106  _Kamala Harris Master Profile
 92  _Tim Scott Master Profile
... (40+ more)
```

**Fix shape:** Either (a) add an alias resolution rule in
`scripts/lib/canonical-name-resolver.cjs` that strips leading `_` and
trailing ` Master Profile`, OR (b) sweep the vault and rewrite the
wikilinks to the canonical form. Aliasing is cheaper and reversible.

### 2. Real entities aliased to FEC variants (~3,000 appearances)

The vault uses editorial wikilinks ("Bank of America"), the FEC bulk
ingest uses raw committee names ("BANK OF AMERICA,NA"). The librarian
sees them as distinct nodes; alias unification merges them. Top:

```
353  National Association of Realtors      ← NATIONAL ASSOCIATION OF REALTORS FUND
277  Let America Vote PAC                  ← Let America Vote
186  Bank of America                       ← BANK OF AMERICA,NA / BANK OF AMERICA-CC
184  Nancy Pelosi For Congress             [committee form, alias to Pelosi]
175  Emily's List                          ← Emilys List (apostrophe variant)
174  Save America PAC                      ← SAVE AMERICA
173  NEA Fund for Children and Public Education
162  JIM JORDAN FOR CONGRESS               [committee form, alias to Jordan]
125  National Republican Senatorial Committee
120  iHeartMedia                           ← IHEART MEDIA
```

⚠ **Some are false positives.** Edit-distance matching surfaces
"NANCY PELOSI FOR CONGRESS" ↔ "NANCY MACE FOR CONGRESS" (d=6) which are
distinct people. Editorial review before any alias mapping is committed.

**Fix shape:** Per-entity alias entries in `data/entities.jsonl` (extend
the `aliases` field). Closes all appearances at once.

### 3. Real entities with no edges (`node-isolated`, ~600 appearances)

All media figures and outlets profiled in the vault but never enriched
through any relationship pipeline. The Media & Influence Pipeline
covered some of these but ingest may not have completed:

```
58  Tenet Media
58  Michael Knowles
58  Jeremy Boreing
57  TYT Network - The Young Turks
56  The Free Press
55  Valuetainment
54  Joe Scarborough
53  Jake Tapper
52  Chris Wallace
51  Abby Phillip
51  Chris Cuomo
```

These appear ONLY in `related:` fields, never in `donors`/`opposes`/
`politicians-funded`. Coverage gap, not editorial typo.

**Fix shape:** Run the Media & Influence Pipeline ingest on these
entities. Or accept them as relational-only (no $-flow expected).

### 4. FEC committee stubs (~80 appearances, but architecturally important)

Subject of the documented committee-stub-resolution project:

```
15  NATIONAL RIFLE ASSOCIATION OF AMERICA POLITICAL VICTORY FUND
13  NATIONAL RIGHT TO LIFE POLITICAL ACTION COMMITTEE
 9  WITH HONOR FUND, INC.
 8  _VAULT_INDEX                                                   [system noise — strip]
 6  NATIONAL ASSOCIATION OF REALTORS POLITICAL ACTION COMMITTEE
 6  AMERICANS FOR PROSPERITY ACTION, INC. (AFP ACTION) DBA CVA ACTION AND DBA LIBRE ACTION
 5  NATIONAL ASSOCIATION OF REALTORS CONGRESSIONAL FUND
 3  SEIU COPE
 3  CRYPTO INNOVATION
 1  REPUBLICAN NATIONAL COMMITTEE
... and 8 more
```

Lower volume than alias-candidates, but Bowman ↔ Fairshake (yesterday's
finding) is exactly this shape. Volume understates leverage — fixing
committee resolution unlocks correct edge counts for major PACs.

**Fix shape:** `content/Admin Notes/fec-committee-stub-resolution.md`
documents the ~10hr multi-session project. Adds vault_profile mappings
to `data/fec-committee-registry.json`, then re-runs FEC ingestion.

## Priority order (recommended)

| # | Action | Effort | Closes |
|---|--------|--------|--------|
| 1 | Add `_Foo Master Profile` alias rule in resolver | ~1hr | ~1,500 appearances |
| 2 | Sweep `_VAULT_INDEX` and similar system noise from `related:` | ~30min | ~10 |
| 3 | Add aliases for top-20 by-volume alias-candidates (Emily's List → Emilys List, etc.) | ~2hr | ~2,500 appearances |
| 4 | FEC committee-stub-resolution (separate ~10hr project) | ~10hr | ~80 + journalistic accuracy on Fairshake-shape stories |
| 5 | Run Media & Influence Pipeline on node-isolated outlets | ~2hr | ~600 |
| 6 | Editorial review of remaining alias-candidates (false-positive screening) | ongoing | ~500+ |

## What auto-resolves vs needs manual work

| Class | Auto-resolves on what? |
|-------|------------------------|
| `unresolvable` | Resolver alias rule lands → those names re-classify on next harness tick |
| `node-isolated` | Pipeline ingest writes edges → re-classify |
| `fec-committee-suspect` | Committee-registry entry lands → re-classify |
| `alias-candidate` | Per-entity alias merge → re-classify |

The harness re-runs every 15 min. Closing one alias rule and watching
the count drop is the feedback loop.

## Open questions

- Are `_VAULT_INDEX` and similar meta-wikilinks intentional? If yes,
  add to a known-meta exclusion list so they stop appearing in this
  audit.
- Should the alias-candidate class apply confidence thresholds (e.g.
  edit distance ≤ 2 only)? Current threshold of `max(2, len/4)` catches
  obvious aliases but also surfaces false positives like Pelosi/Mace.
- Does `node-isolated` for media figures want a sub-class for "entities
  we never expected to ingest" (talk-show hosts) vs "entities we should
  have data for but pipeline didn't run" (PACs)?

These shape v2 of the audit. v1 is intentionally narrow to ship the
priority queue today.
