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
Date: 2026-04-08 (evening)

Done:
- **Ops v1.1 → v1.2 upgrade** — major Relationship Mapper and Source Hunter overhaul
- **Source Hunter expanded: 6 → 15 APIs** — added Senate LDA, SAM.gov, CourtListener, FARA, DOJ Press, ProPublica Nonprofits, OSHA, OpenSanctions, LobbyView. Uses env vars matching GitHub Secrets (FECAPI, CONGRESSAPI, etc.)
- **Auto-Connection Engine** — new pipeline script (`auto-connection-engine.cjs`) in donor-map-engine repo. 5 strategies: donor↔politician bidirectional, shared donor detection, opposition enforcement, top-donors→donors field, politicians-funded backlinks. Runs after all other pipelines in CI workflow.
- **LDA migration complete** — 509 URLs across 163 files migrated from lda.senate.gov → lda.gov. Source Hunter uses lda.gov without auth (tokens not migrated yet), falls back to lda.senate.gov with auth.
- **Relationship editing everywhere** — right-click context menu on Graph and Explorer nodes to change type (Related/Funded By/Opposes) or remove. List View has inline dropdown. API now handles body-text connections (not just frontmatter).
- **Clickable URLs everywhere** — Source Hunter, ProfileDetail sidebar, Profile page URLs all open in new tab
- **Entity type filtering on Add Connection** — filter search results by Politicians/Donors/Corps/Think Tanks/K Street/Media/Stories
- **Connection type change** — `changeConnectionType()` removes old type, adds new, refreshes UI instantly (cache invalidation via globalThis flag)
- **Ctrl+K command palette**, unified Profile page, keyboard shortcuts, visual readiness badges (from earlier in session)

Architecture:
- `auto-connection-engine.cjs` in donor-map-engine runs after all pipelines
- Relationships API (`ops/src/app/api/relationships/route.ts`) rewritten to handle body-text fields
- Connections API cache invalidated immediately on relationship changes
- Source Hunter API reads keys from both `FECAPI` and `FEC_API_KEY` env var formats
- LDA search: tries lda.gov without auth first, falls back to lda.senate.gov with auth

Known issues:
- `.next` cache corruption if app killed mid-compile — `rm -rf ops/.next`
- LDA auth tokens don't work on lda.gov yet (using unauthenticated search)
- donor-map-engine `lda-pipeline.cjs` still generates lda.senate.gov URLs (needs separate fix)

Next:
- Social scheduling for Distribution page (Buffer-like)
- Stale profile detector
- Cross-module profile sidebar
- Fix lda-pipeline.cjs in engine repo to use lda.gov
- Run opensecrets-replace for remaining categories (~3,000 URLs)

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
