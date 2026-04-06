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
- Slimmed CLAUDE.md from 171→107 lines (removed duplicate Autonomy Directive, moved Recent Context to Session State)
- Archived last straggler doc: Publish Settings Guide.md → Vault Maintenance/Archive/
- Created opensecrets-replace.yml GitHub Actions workflow (dry-run + write modes, category filtering)
- Pushed workflow to donor-map-engine, triggered dry run for members-of-congress category

In flight:
- OpenSecrets dry run (GitHub Actions run 24046018866) — waiting on results
- After dry run confirms mappings look right, trigger --write run for members-of-congress
- Then run remaining categories: orgs, pacs, outside-spending, donor-lookup, etc.

Next:
- Review opensecrets dry run results and trigger --write if clean
- Run opensecrets-replace for remaining categories (orgs, pacs, outside-spending, etc.)
- Run full pipeline enrichment cycle to start populating `verified` tier
- Check LobbyView API key is working (couldn't find the pipeline run from last session)

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
- Widened ProfileWidget scope to all profile types (not just master-profile slug)
- Empty states for EventTimeline and ProfileWidget
- Categorization audit: Bush Cabinet folder, Former folders for both parties
- Wired FEC + Congress pipelines into auto-block body section writes
- Auto-populate politicians-funded from FEC recipient data
- Pipeline timeout fixes (18→22min step, 25→30min job)
- Pipeline push conflict resolution (fetch→rebase→merge fallback)

### Code Claude — 2026-04-05
- API enrichment runs: 122 files updated across 4 pipeline runs
- Fixed ProPublica hitting corporations + deduplicated frontmatter keys
- GovTrack, SAM, USASpending pipelines running in parallel

### Research Claude — 2026-04-05
- Vault audit and roadmap (identified ~1,350 total files, 1,204 ready)
- Source integrity pass on 55 files
- URL fix log started
