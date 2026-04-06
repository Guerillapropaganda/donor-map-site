---
title: Session State
type: system
last-updated: 2026-04-06
---

# Session State

Both Code Claude and Research Claude update this at the end of every session. Read this first.

---

## Last Session
Claude: Code
Date: 2026-04-06

Done:
- Slimmed CLAUDE.md from 171→107 lines (removed duplicate Autonomy Directive, moved Recent Context here)
- Archived last straggler doc: Publish Settings Guide.md → Vault Maintenance/Archive/
- Created opensecrets-replace.yml GitHub Actions workflow (dry-run + write modes, category filtering)
- Fixed opensecrets-replace.cjs: skip generic sub-page slugs (summary, contributors, industries, etc.)
- Ran opensecrets-replace --write for `members-of-congress`: **997 URLs replaced across 346 files**
- 127 URLs skipped (generic sub-pages with CRP IDs but no name slug — need CRP-to-FEC mapping or manual review)
- 3,011 OpenSecrets URLs remain in other categories (orgs, pacs, outside-spending, etc.)

In flight:
- Nothing — all commits pushed to v4

Next:
- Run opensecrets-replace --write for remaining categories: orgs, pacs, outside-spending, donor-lookup, federal-lobbying
- After all categories done, review the 127 skipped member URLs (add CRP ID lookup to script?)
- Check LobbyView API key — couldn't find the earlier pipeline run
- Run full pipeline enrichment cycle to populate `verified` tier
- Consider adding `orgs` category to the workflow's scheduled runs

---

## Previous Sessions

### Code Claude — 2026-04-06 (earlier)
- Built LobbyView pipeline (lobbyview-pipeline.cjs) — client-bill lobbying networks, 100 req/day
- Built OpenSecrets URL replacement script (opensecrets-replace.cjs) — maps 4,075 URLs to FEC/Congress.gov/LDA equivalents
- Added LobbyView to api-config.cjs and GitHub Actions workflow
- Rewrote vault methodology: Vault Rules.md + Pipeline Guide.md + Session State.md replace 10 old docs
- New readiness tier: `verified` (has Tier 1 pipeline data). Existing `ready` files stay published.

### Code Claude — 2026-04-06 (earlier)
- Party dots on profiles (blue D, red R, grey I)
- Fixed sidebar nav links (Fox News, Daily Wire, pod paths)
- Widened ProfileWidget scope to all profile types
- Empty states for EventTimeline and ProfileWidget
- Categorization audit: Bush Cabinet folder, Former folders
- Wired FEC + Congress pipelines into auto-block body section writes
- Pipeline timeout fixes and push conflict resolution

### Code Claude — 2026-04-05
- API enrichment runs: 122 files updated across 4 pipeline runs
- Fixed ProPublica hitting corporations + deduplicated frontmatter keys
- GovTrack, SAM, USASpending pipelines running in parallel

### Research Claude — 2026-04-05
- Vault audit and roadmap (identified ~1,350 total files, 1,204 ready)
- Source integrity pass on 55 files
- URL fix log started
