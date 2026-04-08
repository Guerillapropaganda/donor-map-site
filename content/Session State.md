---
title: Session State
type: system
last-updated: 2026-04-08
---

# Session State

Both Code Claude and Research Claude update this at the end of every session. Read this first.

---

## Last Session
Claude: Code
Date: 2026-04-08 (afternoon)

Done:
- **Ops v1.1 upgrade** — major UX improvements to the Operations Center
- **Ctrl+K command palette** — global search across all 1,600+ profiles and pages from anywhere
- **Unified profile page** (`/profile`) — readiness stepper, source quality bars, connections, URLs, clickable source links opening in new tab
- **Rich activity feed** — categorizes commits into Pipeline/Connection/Edit/Deploy/URL/Note with colored icons and filter pills
- **Keyboard shortcuts** — `?` for help, `g+d/p/n/u/r/e` for navigation
- **Visual readiness badges** — VaultGrid cards show colored readiness labels + progress bars + tier/enrichment badges
- **Fixed connections API** — now parses body text `related:`/`donors:`/`opposes:` fields as fallback (250+ profiles had connections in body, not frontmatter). Trump and all profiles now show connections.
- **Relationship Mapper v2** — full rewrite:
  - Search: click input to clear and search again (was stuck on previous profile)
  - Graph: draggable (click+drag to pan), scroll-to-zoom (no Ctrl needed), zoom controls (+/-/Reset), no 24-node limit
  - Explorer: Add Connection form on all three views (List, Explorer, Graph)
  - Sidebar: type category filters, internal docs excluded from No Connections
- **Profile View** — browse/search grid when no profile selected, clickable URLs

Architecture:
- New components: `CommandPalette.tsx`, `ClientProviders.tsx`, `KeyboardShortcuts.tsx`
- New page: `ops/src/app/profile/page.tsx`
- Enhanced: `ActivityFeed.tsx`, `VaultGrid.tsx`, `Sidebar.tsx`, layout.tsx, `relationships/page.tsx`
- Connections API uses `parseBodyField()` fallback + returns all connected profiles (no top-50 cap)

Known issues:
- `.next` cache corruption if app killed mid-compile — `rm -rf ops/.next` fixes it
- Connections API has 2-min cache — changes take up to 2min to appear in Relationships sidebar

Next:
- **Social scheduling** — David wants Buffer-like post scheduling for Distribution page
- Stale profile detector (profiles not enriched in 30+ days)
- Cross-module profile sidebar (see connections/URLs/notes without leaving Editor)
- Run opensecrets-replace for remaining categories (~3,000 URLs)
- LDA migration: lda.senate.gov → lda.gov before June 30, 2026 sunset

---

## Previous Sessions

### Code Claude — 2026-04-08 (early morning)

Done:
- **Built Donor Map Ops v1.0** — 10-module local operations app at `ops/`
- Modules: Dashboard, Pipelines, Notes & Queues, URL Manager, Source Hunter, Relationships, Editor, Publisher, Alerts, Distribution
- **Switched all reads to local filesystem** — zero GitHub API for browsing (was hitting 5,000/hr rate limit)
- **Switched all writes to local filesystem + git push** — saves write to disk, git commit, git push. No GitHub Contents API.
- URL Manager: two-tier triage (active + completed archive), quick-assign buttons, undo from completed, drag-and-drop
- Editor: 4 view modes (Edit/Split/Preview/Live Site), markdown renderer with proper CSS, iframe of live page
- Enrichment Results: plain English breakdown of what each pipeline run gathered, from local git history
- Admin Notes: saved as markdown in `content/Admin Notes/`, both Claudes check these every session
- Desktop launcher, PWA manifest, toast notifications
- Updated CLAUDE.md with full Ops app documentation for both Claudes

Architecture:
- App at `ops/` — Next.js + Tailwind, fully separate from Quartz
- **Reads from local filesystem** (instant, zero API)
- **Writes to local files + git push** (no GitHub API needed)
- GitHub API only for: pipeline triggers (workflow_dispatch), Source Hunter (gov APIs)
- Desktop shortcut: `ops/start-ops.bat`, or `ops/create-shortcut.bat` for desktop icon
- Run: `cd ops && npm run dev` → localhost:3333

David's workflow:
- Opens Ops app daily to browse, edit, triage URLs, leave notes
- Notes in `content/Admin Notes/` are work orders for both Claudes
- URL triage marks broken links as archived (strikethrough) per Vault Rules
- Check `content/Admin Notes/` every session for open notes

Known issues:
- EPA ECHO API flaky (500 errors, has fallback endpoints)
- Public Accountability HTTPS cert issues (falls back to HTTP)
- `.next` cache corrupts if app killed mid-compile — `rm -rf ops/.next` fixes it

Next:
- David testing Ops app, reporting issues for polish
- Check `content/Admin Notes/` for any open notes from David
- Run opensecrets-replace for remaining categories (~3,000 URLs)
- LDA migration: lda.senate.gov → lda.gov before June 30, 2026 sunset
- Pipeline coverage report for enrichment gaps

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
