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
Date: 2026-04-07 (evening)

Done:
- Restored 626 content files lost during worktree-v4 merge conflicts (246 politicians, 139 donors, 59 stories, 49 events, 48 media, 12 think tanks, 11 interactive)
- Fixed CI pipeline merge conflicts: changed api-enrichment.yml from `git pull --rebase` to `git pull --no-rebase -X theirs`
- Deployed graph widget to ALL profile types: donors, think tanks, media, K Street, PACs (was politicians-only)
- Non-politician profiles build graph from `related:`/`donors:` wikilinks and `politicians-funded` frontmatter
- Full-screen graph now has contextual filter bar at top — toggle Donors/Politicians/Think Tanks/K Street/Media on/off
- Filter buttons are contextual: only shows types that exist in the graph data
- Sidebar graph: Expand Network + Full Screen buttons only (no filters in mini view)
- Restored 6 missing profiles: Lockheed Martin, Ben Shapiro, Joe Rogan, Pod Save America, Tucker Carlson, Brookings Institution
- Reverted sidebar featured items to originals: Brookings (was Aspen), Carried Interest (was Both-Sides Illusion)
- Fixed landing page: 6 broken links, story search paths with Contradiction-Deep-Dives prefix
- ProfileTabs: empty tabs show "not available" message, presidents get Executive Orders tab
- MobileNav box-sizing fix, landing page count spacing fix

Known issues:
- EPA ECHO API flaky (500 errors, has fallback endpoints)
- Public Accountability HTTPS cert issues (falls back to HTTP)
- Stale worktree `angry-easley` can be cleaned up
- Junk Unicode directory `\357\200\242content/` in main repo (filesystem artifact, harmless)

Next:
- Run opensecrets-replace for remaining categories (orgs, pacs, outside-spending — ~3,000 URLs)
- Run pipeline coverage report to identify enrichment gaps
- LDA migration: lda.senate.gov → lda.gov before June 30, 2026 sunset
- Split CI into fast/slow workflows if timeout issues arise
- Add `govtrack-id` to Schumer's frontmatter so pipeline can populate legislative data
- Re-tag Trump's EO content from `data-tab="overview"` to `data-tab="executive"` (Research Claude)

---

## Previous Sessions

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
