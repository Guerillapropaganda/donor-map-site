---
title: Session State
type: system
last-updated: 2026-04-07
---

# Session State

Both Code Claude and Research Claude update this at the end of every session. Read this first.

---

## Last Session
Claude: Code
Date: 2026-04-07 (late night)

Done:
- **Built Donor Map Ops v1.0 — complete 9-module operations app** across 10 sessions
- All modules: Dashboard, Pipeline Control, Notes & Queues, Source Hunter, Relationship Mapper, Profile Editor, Content Publisher, Alerts Monitor, Distribution
- Admin Bar overlay on live site (URL checker, notes, fix queue) — may deprecate in favor of Ops app Editor
- Desktop launcher: double-click `ops/start-ops.bat` to run, or `ops/create-shortcut.bat` for desktop icon
- PWA manifest: Chrome "Install as app" support for native-like window
- Fixed Tailwind CSS compilation issues (SVG sizing, launch.json cwd)
- Zero Claude/AI cost to operate — pure JavaScript + GitHub API

Architecture:
- App lives at `ops/` — Next.js + Tailwind, separate from Quartz
- Reads from GitHub API (live v4 branch), writes via GitHub API
- 11 pages, 8 API routes, all building clean
- Run: double-click `start-ops.bat` or `cd ops && npm run dev` → localhost:3333

Known issues:
- EPA ECHO API flaky (500 errors, has fallback endpoints)
- Public Accountability HTTPS cert issues (falls back to HTTP)

Next:
- David tests Ops app with real GitHub token, reports issues
- Run opensecrets-replace for remaining categories (~3,000 URLs)
- LDA migration: lda.senate.gov → lda.gov before June 30, 2026 sunset
- Pipeline coverage report for enrichment gaps
- Session 9: Distribution Dashboard module
- Session 10: Polish, animations, edge cases

Next (site maintenance — ongoing):
- Run opensecrets-replace for remaining categories (~3,000 URLs)
- Pipeline coverage report for enrichment gaps
- LDA migration: lda.senate.gov → lda.gov before June 30, 2026 sunset
- Add `govtrack-id` to Schumer's frontmatter

---

## Previous Sessions

### Code Claude — 2026-04-07 (evening)
- Restored 626 content files lost during worktree-v4 merge conflicts
- Fixed CI pipeline merge conflicts: `git pull --no-rebase -X theirs`
- Deployed graph widget to ALL profile types
- Full-screen graph contextual filter bar
- Restored 6 missing profiles, reverted sidebar featured items
- Fixed landing page broken links, ProfileTabs empty states, MobileNav fix

### Code Claude — 2026-04-07 (earlier)
- Fixed front page 404 caused by wholesale v4 file sync — reverted 4 core files, surgically added NetworkGraph registrations
- Graph tab moved to first position in ProfileWidget with Expand Network button
- Built shared-donor bridge: expanded graph now shows think tanks, K Street, and media figures connected through shared donors
- Migrated `related:` and `donors:` from body text into YAML frontmatter for 155 think tank, K Street, and media profiles
- Confirmed FCC pipeline unfixable (per-station API, no global search)
- Confirmed House Stock Watcher dead (GitHub repo deleted, S3 returns 403, site offline)

### Code Claude — 2026-04-06 (evening)

Done:
- **Built 11 new pipelines**, bringing total from 21 → 32 data source pipelines
- New pipelines: OSHA, Nonprofit 990, SEC Litigation, FEC Summary, DOJ Press, Wikipedia/Wikidata, Committee Assignments, OFAC SDN, CPSC Recalls, USASpending Awards, NHTSA Recalls, Lobbying Cross-Reference
- All 32 wired into CI workflow (api-enrichment.yml), running 4x daily in parallel
- Built pipeline coverage dashboard (`pipeline-coverage-report.cjs`) — scans vault against 26 enrichment markers
- Created data sources page (`content/Interactive/data-sources.md`) documenting all 32 pipelines
- Bumped CI timeout to 35min job / 25min pipeline step
- All API keys configured (user added DOLAPI this session)
- 22 of 32 pipelines need zero auth

Known issues:
- FCC pipeline returns 0 results (needs correct endpoint paths)
- House Stock Watcher data URL 404s (Senate works fine)
- EPA ECHO API flaky (500 errors, has fallback endpoints)
- Public Accountability HTTPS cert issues (falls back to HTTP)

In flight:
- CI run triggered with limit=3 to test all 32 pipelines
- Session State and Pipeline Guide updates need finishing (agents hit rate limit)

Next:
- Fix FCC endpoint paths (research Swagger UI)
- Fix House stock watcher data URL
- Update Pipeline Guide with all 32 pipeline entries
- Run opensecrets-replace for remaining categories (orgs, pacs, outside-spending)
- LDA migration: lda.senate.gov → lda.gov before June 30, 2026 sunset
- Run pipeline coverage report to identify enrichment gaps
- Split CI into fast/slow workflows if timeout issues arise

---

## Previous Sessions

### Code Claude — 2026-04-06 (afternoon)
- Built FARA, CourtListener, Federal Register, SEC EDGAR, Public Accountability, FCC, OpenSanctions, Stock Watcher, GLEIF, EPA ECHO pipelines (10 new, bringing total from 11 → 21)
- Completed FARA two-phase matching strategy with correct API field names
- Fixed loadProfiles `donors` bucket to use `all` for broad entity matching
- Researched 30+ potential data sources from Perplexity suggestions, categorized as Build/Defer/Skip

### Code Claude — 2026-04-06 (earlier)
- Slimmed CLAUDE.md from 171→107 lines
- Created opensecrets-replace.yml workflow + ran for members-of-congress (997 URLs across 346 files)
- 127 URLs skipped (generic sub-pages), 3,011 remain in other categories

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
