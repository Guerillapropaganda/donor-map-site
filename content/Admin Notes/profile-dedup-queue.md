---
title: "Profile Dedup Queue"
type: admin-note
note-type: data
priority: normal
status: open
last-updated: '2026-04-15'
---

# Profile Dedup Queue

Entities with multiple profile files in the vault that should be merged into a single canonical profile. Discovered during the 2026-04-15 foundation sprint while investigating dangling wikilinks. These drive the cache-drift audit's "multiple title-index entries" skip path and fragment relationship-edge resolution.

Each group lists the suggested canonical file (marked ✓) and the duplicates to merge or redirect.

**Merge approach for each group:**
1. Pick the canonical (largest, most recent, most complete)
2. Copy unique fields from dupes into canonical frontmatter
3. Add dupe titles to canonical `aliases:` field
4. Change dupe files' `type:` to `redirect` and add `editorial-status: redirect` + `redirect-target:` pointing at canonical
5. The signal gatherer's redirect filter will then skip them
6. Re-run `scripts/migrate-frontmatter-delta.cjs --write` to absorb the newly-resolvable edges

## Groups

### Blackstone (partially handled 2026-04-15)

- ✓ `content/Donors & Power Networks/Wall Street/Blackstone Group.md` (509 lines — canonical)
- **[handled]** `content/Donors & Power Networks/Mega-Donors/Blackstone.md` → marked as redirect
- `content/Donors & Power Networks/Real Estate/Blackstone Real Estate.md` — separate entity? (Blackstone Real Estate is a subsidiary, may warrant its own profile)
- `content/Donors & Power Networks/Real Estate/Blackstone Real Estate Political Operation.md` — also separate entity vs dupe — needs review

### Raytheon (partially handled 2026-04-15)

- ✓ `content/Donors & Power Networks/Defense & Intelligence/Raytheon (RTX).md` (603 lines — canonical, `title: Raytheon (RTX Corporation)`)
- **[handled]** `content/Donors & Power Networks/Mega-Donors/Raytheon.md` → marked as redirect
- `content/Donors & Power Networks/Mega-Donors/Raytheon Technologies.md` (136 lines, has real enrichment data) — MERGE needed: copy `federal-register-mentions`, `regulatory-agencies`, `last-enriched` into canonical, then convert to redirect

### Meta / Facebook

- Candidates:
  - `content/Donors & Power Networks/Mega-Donors/Meta.md`
  - `content/Donors & Power Networks/Tech & Crypto/Meta - Facebook.md`
  - `content/Donors & Power Networks/Tech & Crypto/Meta - Facebook Political Operation.md`
- Needs review: which is canonical, whether "Meta - Facebook Political Operation" is a separate entity
- 4 dangling `[[Meta]]` wikilinks waiting on resolution

### Pfizer / PhRMA

- ✓ `content/Donors & Power Networks/Pharma & Healthcare/Pfizer.md` (title: "Pfizer Inc.")
- ✓ `content/Donors & Power Networks/Pharma & Healthcare/PhRMA.md` (title: "PhRMA - Pharmaceutical Research and Manufacturers of America")
- Not dupes — but `[[Pfizer]]` and `[[PhRMA]]` wikilinks need filename aliases to resolve (fixed 2026-04-15 via `buildTitleIndex` patch)
- 35 dangling `[[PhRMA]]` and 13 `[[Pfizer]]` wikilinks should now resolve after the filename-alias fix

### GEO Group

- Candidates:
  - `content/Donors & Power Networks/Carceral State/GEO Group.md`
  - `content/Donors & Power Networks/Dark Money/GEO Group - Private Prisons.md`
- Needs review: are these the same entity at different framing angles, or dupes?
- 16 dangling `[[GEO Group]]` wikilinks

### Fox Corp - Rupert Murdoch (8 dangling wikilinks)

- Need to find the canonical Fox/Murdoch profile path. May need a new profile if none exists.

### EMILY's List (7 dangling wikilinks)

- Need profile — or wikilink alias on an existing adjacent profile.

### Others flagged

- Marc Andreessen (2)
- Ripple Labs (4)
- SENATE LEADERSHIP FUND (4)
- America First Legal (3)
- Koch - Koch Industries (3) — alias collision with "Koch Network - Charles Koch"

## How to close this queue

Each group is a focused 15-30 min session of: read both files, copy non-duplicate data, mark dupes as redirects, re-run migrate-frontmatter-delta.cjs to verify edges land. Aim for one group per commit so regressions are easy to isolate.
