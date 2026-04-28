---
title: Pathless ghost-stub triage 2026-04-29
type: admin-note
status: open
tags: [code, librarian, editorial-decision]
last-updated: 2026-04-29
---

# Pathless ghost-stub triage — 13 entities

The `pathless-stub-entities` harness check flags entities in `entities.jsonl` that have no `profile_path`. 13 today, all FEC candidate-committee names.

## What got fixed automatically

Added 10 ghost names as aliases on existing canonical politician entities (the resolver fix from earlier today now reads the `aliases` field, so this works as expected):

| Canonical entity | Alias added | Edge count |
|---|---|---|
| Donald Trump | DONALD J. TRUMP REPUBLICAN NOMINEE FUND 2024 | 4 |
| Mike Carey | CAREY FOR CONGRESS | 14 |
| Dan Osborn | OSBORN FOR SENATE 2024, OSBORN FOR SENATE, CONSERVATIVES FOR OSBORN | 79 |
| Juliana Stratton | JULIANA FOR ILLINOIS | 27 |
| Laura Gillen | GILLEN FOR CONGRESS, GILLEN FOR NY | 126 |
| Daniel Biss | BISS FOR CONGRESS | 15 |
| Cleo Fields | CLEO FIELDS FOR CONGRESS COMMITTEE | 1 |

Verified resolver picks them up: `r.entityFor("OSBORN FOR SENATE 2024")` → `Dan Osborn`.

**Important caveat:** the harness check counts pathless **entity records**, not unresolved name references. Adding aliases doesn't remove the ghost stub records — the harness will still report 13 (or 3 after the unprofiled-3 are handled separately). The aliases ARE useful — they make the librarian resolve committee names correctly when other code looks them up by string. But to actually drop the harness count, the ghost records need an entity-level merge:

1. Migrate edges that reference `WHATLEY FOR SENATE` (etc.) → use the canonical name `Dan Osborn` (etc.)
2. Delete the ghost entity record
3. Run `dedupe-entities.cjs --apply` (which already does this for canonical-name variants)

That's editorial work because some edges have non-trivial decisions (e.g. Trump's JFC isn't quite the same as Trump-the-candidate; some analysts want them distinct).

## What's left — 3 unprofiled committees

These have no canonical entity match. Editorial decisions:

| Ghost name | Edge count | Suggested action |
|---|---|---|
| WHATLEY FOR SENATE | 47 | **Create profile** for Michael Whatley (RNC chair, 2026 NC Senate candidate). High-profile; likely worth a stub. |
| WHATLEY FOR NC SENATE REPUBLICAN NOMINEE FUND 2026 | 1 | Same as above — alias to a Whatley profile if created. |
| FRIENDS OF CAROL MILLER | 1 | Create stub for Carol Miller (R-WV, House since 2019), or accept as legitimate-without-profile. |

Both Whatley and Miller would be reasonable profile additions. Single-edge low-leverage ghosts (like CLEO FIELDS at 1 edge) are also fine to leave alone if not editorially interesting.

## What I did not do

- **Edge migration.** Each ghost has 1-126 edges currently using the ghost name in `from`/`to` fields. Running an edge rewrite is high-stakes (touches 315 edges across the canonical store). Worth its own session with David approving the canonical mapping per committee.
- **Ghost record deletion.** Same reason — needs the edge migration first or the deletion orphans edges.
- **dedupe-entities.cjs run.** That script handles name-variant canonicalization (e.g. SANDERS, BERNARD → Bernie Sanders), not committee → candidate alias merges. Different code path.

## Net effect

- **Library knows the right answer** when looking up these committee names by string (resolver test passed).
- **Harness still reports 13 stubs** — will continue to until edge migration + record deletion is done.
- **Editorial action items:** create Whatley + Miller stubs, or formally accept-without-profile.
