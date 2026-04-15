---
title: "Profile Dedup Queue"
type: admin-note
note-type: data
priority: normal
status: open
last-updated: '2026-04-15'
progress: "4 of 6 groups drained (GEO Group, Raytheon, Meta, Blackstone). Remaining 2 need new profiles (Research Claude lane): Fox Corp - Rupert Murdoch, EMILY's List."
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

### Blackstone (DONE 2026-04-15)

- ✓ `content/Donors & Power Networks/Wall Street/Blackstone Group.md` (509 lines — parent company canonical)
- ✓ `content/Donors & Power Networks/Real Estate/Blackstone Real Estate.md` (304 lines — subsidiary canonical, kept separate. Added aliases, federal-contracts, source-types)
- **[handled]** `content/Donors & Power Networks/Mega-Donors/Blackstone.md` → redirect (cleaned stub body, points to both Group and Real Estate)
- **[handled]** `content/Donors & Power Networks/Wall Street/Blackstone Real Estate Political Operation.md` → redirect to [[Blackstone Real Estate]] (lobbying/OFAC/SAM data already identical)
- Entity store: removed orphan `ent_000009`

### Raytheon (DONE 2026-04-15)

- ✓ `content/Donors & Power Networks/Defense & Intelligence/Raytheon (RTX).md` (canonical, `title: Raytheon (RTX Corporation)`, already had aliases including `Raytheon Technologies`)
- **[handled]** `content/Donors & Power Networks/Mega-Donors/Raytheon.md` → redirect
- **[handled]** `content/Donors & Power Networks/Mega-Donors/Raytheon Technologies.md` → redirect. Federal Register enrichment data (28 mentions, regulatory-agencies list, recent activity table) copied into canonical body + frontmatter. Em dashes replaced with periods to keep voice-drift sentinel clean.
- Entity store: removed orphan `ent_000201` (0 edges)

### Meta / Facebook (DONE 2026-04-15)

- ✓ `content/Donors & Power Networks/Tech & Crypto/Meta - Facebook.md` — canonical, already had aliases `Meta`, `Facebook`, `Meta - Facebook Political Operation`
- **[handled]** `content/Donors & Power Networks/Mega-Donors/Meta.md` → redirect (cleaned stub body)
- **[handled]** `content/Donors & Power Networks/Tech & Crypto/Meta - Facebook Political Operation.md` → redirect (cleaned stub body)
- Entity store had no orphans (only `ent_000060` for the canonical)

### Pfizer / PhRMA

- ✓ `content/Donors & Power Networks/Pharma & Healthcare/Pfizer.md` (title: "Pfizer Inc.")
- ✓ `content/Donors & Power Networks/Pharma & Healthcare/PhRMA.md` (title: "PhRMA - Pharmaceutical Research and Manufacturers of America")
- Not dupes — but `[[Pfizer]]` and `[[PhRMA]]` wikilinks need filename aliases to resolve (fixed 2026-04-15 via `buildTitleIndex` patch)
- 35 dangling `[[PhRMA]]` and 13 `[[Pfizer]]` wikilinks should now resolve after the filename-alias fix

### GEO Group (DONE 2026-04-15)

- ✓ `content/Donors & Power Networks/Carceral State/GEO Group.md` (title: "GEO Group - Private Prison Industrial Complex") — canonical, added aliases `GEO Group`, `GEO Group - Private Prisons`, `GEO Group Inc`
- **[handled]** `content/Donors & Power Networks/Dark Money/GEO Group - Private Prisons.md` → redirect stub (stripped wrong-EIN 474543845 nonprofit-990 data, a $144K 501(c)(3) false match)
- Entity store: removed orphan `ent_000398` (0 edges)
- Class-tag proposals: removed stale `dark-money-vehicle` proposal for ent_000398

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
