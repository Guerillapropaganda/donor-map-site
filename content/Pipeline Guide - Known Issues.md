---
title: Pipeline Guide - Known Issues
type: system
last-updated: 2026-04-09
---

# Pipeline Known Issues & Fixes

Technical reference for pipeline bugs, workarounds, and fixes. Both Claudes check this when debugging enrichment problems.

---

## Active Issues

### Congress Pipeline: Hardcoded to 119th Congress
**Status:** Open, engine fix needed
**Impact:** Former members (Cori Bush, Sherrod Brown, etc.) get 0 bills because the pipeline only queries the current Congress.
**Root cause:** `CONGRESS_NUM = 119` in `congress-pipeline.cjs` line 32. Former members served in earlier congresses (117th, 118th).
**Workaround:** Manually set `bills-sponsored` and `bills-cosponsored` from Congress.gov API: `https://api.congress.gov/v3/member/{BIOGUIDE_ID}/sponsored-legislation`
**Fix needed:** Pipeline should detect which congresses a member served in and query all of them, or query without the congress filter.

### FEC Pipeline: Name Search Fails for Some Members
**Status:** Fixed 2026-04-09
**Impact:** Profiles with `fec-candidate-id` in frontmatter were skipped as "already enriched" but never actually enriched. Profiles without the ID relied on name search which fails for names like "Cori Bush" (FEC stores as "BUSH, CORI A").
**Fix:** `processPolitician()` now uses `fec-candidate-id` from frontmatter directly instead of doing a name search. Pushed to engine repo 2026-04-09.

### Pipeline Profile Targeting: Space in Names
**Status:** Fixed 2026-04-09
**Impact:** `--profile="Cori Bush"` was split by shell into `--profile=Cori` and `Bush` as separate args.
**Fix:** Workflow `run_if()` now passes `--profile="$PROFILE"` with proper quoting. Pushed to engine repo 2026-04-09.

---

## Fixed Issues (Reference)

### last-enriched Not Set by Pipelines
**Date fixed:** 2026-04-09
**Impact:** "Enriched within 90 days" checklist item always showed X even after successful enrichment.
**Root cause:** FEC, Congress, GovTrack, and Committee pipelines wrote auto-blocks and updated frontmatter but never set `last-enriched`.
**Fix:** Added `"last-enriched": today()` to the `updates` object in all 5 major pipelines (fec, congress, govtrack, committee, voting-record).

### 58 Profiles Had Wrong Bioguide ID (A000383)
**Date fixed:** 2026-04-09
**Impact:** Pipeline fetched wrong person's data for 58 profiles. A000383 belongs to Alan Armstrong (Oklahoma), was mass-stamped by a pipeline template bug.
**Fix:** Removed `bioguide-id` from all 58 profiles. Built `scripts/fix-fec-ids.cjs` for ongoing validation.

### 33 Profiles Had Wrong FEC Candidate IDs
**Date fixed:** 2026-04-09
**Impact:** Wrong FEC data pulled for 9 profiles with wrong-state IDs, 7 with presidential IDs, 17 with legacy House IDs.
**Fix:** All corrected via FEC.gov lookup. Categories:
- 9 wrong-state (e.g. Bobby Scott/VA had a GA ID)
- 7 presidential → Senate (Booker, Warren, Tim Scott, etc.)
- 17 House → Senate (Markey, Sanders, Duckworth, etc.)

### FEC API URLs With DEMO_KEY in Profiles
**Date fixed:** 2026-04-09
**Impact:** Visitors clicking FEC links hit 40 req/hr rate limit (DEMO_KEY).
**Fix:** Converted 116 API URLs across 70 files from `api.open.fec.gov` to `www.fec.gov/data/` (human-readable pages). Built `scripts/fix-demo-key-urls.cjs`.

### LDA Domain Migration
**Date fixed:** 2026-04-09
**Impact:** 19 files had old `lda.senate.gov` URLs (domain migrated to `lda.gov`).
**Fix:** Replaced domain in 17 profiles + 2 scripts. URLs remain in Archived sections until lda.gov auth works (June 2026).

### Ops Pipeline Trigger Route
**Date fixed:** 2026-04-09
**Impact:** Profile viewer enrichment buttons did nothing (404).
**Root cause:** Frontend called `/api/pipelines/run` but route was `/api/pipelines`.
**Fix:** Changed frontend to call `/api/pipelines`.

### Connection Removal Bug (Aliases)
**Date fixed:** 2026-04-09
**Impact:** Couldn't remove connections using alias names (e.g. "AIPAC" for `[[AIPAC - American Israel Public Affairs Committee|AIPAC]]`).
**Root cause:** Regex matched target as reference name only, not alias position.
**Fix:** Added second regex to match `[[anything|target]]` pattern.

### URL Triage Yellow/Purple Confusion
**Date fixed:** 2026-04-09
**Impact:** Marking a URL yellow (slow) saved as purple (unsure) after reload.
**Root cause:** Both states wrote `(NEEDS REVIEW)` to markdown and saved as `"unsure"` in sidecar JSON.
**Fix:** Yellow now writes `(SLOW: note)` tag, persists as `"yellow"` status. Purple keeps `(NEEDS REVIEW)`.

---

## Pipeline Validation Checklist

When debugging why enrichment didn't work for a profile:

1. **Check `fec-candidate-id` / `bioguide-id`**, wrong ID = wrong data or no match
2. **Check `last-enriched`**, if missing, pipeline may have skipped the profile
3. **Check the auto-block** — empty markers (`<!-- auto:X start --><!-- auto:X end -->`) mean the API returned nothing
4. **Check the enrichment log** — `content/Vault Maintenance/Auto-Enrichment Log.md`
5. **Check if former member** — Congress pipeline only queries 119th Congress (active bug)
6. **Check GitHub Actions logs** — `gh run view RUN_ID --repo Guerillapropaganda/donor-map-engine --log`
7. **Run `scripts/fix-fec-ids.cjs`** — validates FEC IDs by chamber prefix and state code
