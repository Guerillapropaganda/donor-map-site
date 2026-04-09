---
title: Session State
type: system
last-updated: 2026-04-08
---

# Session State

Both Code Claude and Research Claude update this at the end of every session. Read this first.

---

## Last Session
Claude: Code + Research
Date: 2026-04-08 (continued — Reviews tab rebuild + editorial quality standards)

Done (Code Claude):
- **Reviews tab simplified** — replaced 3 sub-tabs with blocker lists → single scrollable timeline journal. Color-coded entries by author (blue=Code, green=Research, amber=Editor). Filter pills. Add Entry box.
- **Blockers split by owner** — formal review auto-generates separate Code Claude and Research Claude entries based on blocker keywords
- **URL note input focus fix** — switched to uncontrolled input (defaultValue + onBlur)
- **ProfileData interface** — added all editorial fields so Reviews tab actually displays data
- **Committed editorial review data** — Cori Bush, Carlos Gimenez, Sherrod Brown frontmatter was unstaged, now on v4

Done (Research Claude / with David):
- **Editorial quality block** added to Vault Rules — 7 core sections required for A+: Who They Are, Central Thesis, Core Contradiction, Donor Class Map, Donation-to-Policy Timeline, Rhetorical Signature Moves, Analytical Patterns
- **Review workflow rewritten** — three-stage (Research Claude reviews+fixes → Code Claude fixes pipeline → Editor approves). Review-fix-document-move on, not just find problems.
- **Vault Rules updated** — editorial quality criteria, workflow clarification, decisions log

Done (Research Claude, continued):
- **Cori Bush full editorial review + improvement** (8/10 blocks verified):
  - FIXED: Mapped connections to frontmatter (AIPAC, Justice Democrats, DMFI, AOC, Omar, Wesley Bell in related/donors/opposes)
  - FIXED: Sources reorganized to Verified/Archived two-section layout. Archived bush.house.gov (dead).
  - FIXED: Donation-to-Policy Timeline expanded from 2 to 9 rows with FEC data
  - FIXED: Rhetorical Signature Moves expanded from 1 paragraph to 4 patterns
  - FIXED: Contradiction investigated and cleared with FEC/DOJ sources
  - FIXED: Removed all em dashes from editorial content (new rule: no em dashes, sounds AI)
  - FIXED: Removed empty Sub-Notes and Policy Area sections, stale profile-status lines
  - BLOCKED: Congress auto-block corrupted (shows Republican/Oklahoma). Code Claude needs to fix.
- **Editorial quality block** added to Vault Rules: 7 core sections required (Who They Are, Central Thesis, Core Contradiction, Donor Class Map, Donation-to-Policy Timeline, Rhetorical Signature Moves, Analytical Patterns)
- **No em dashes rule** saved to memory: never use — in profile content

**GitHub Actions reinstated** as of end of session.

Next session priorities:
1. Code Claude: clear backlog from 3 reviews (Cori Bush auto-block, Sherrod Brown FEC ID, Gimenez enrichment)
2. Research Claude: continue Congress batch reviews (Carlos Gimenez, Sherrod Brown full passes)
3. Editor: review Cori Bush profile and approve/send back
4. Graph legend on live site
5. Fix lda-pipeline.cjs domain

---

## Previous Session
Claude: Code + Research
Date: 2026-04-08 (marathon session — ops fixes + contradiction scanner + money trail + governor pipeline + A+ editorial system + first reviews + Reviews tab)

Done (Code Claude):
- **Pipeline buttons on checklists** — ▶ run buttons next to each checklist item
- **URL Manager fixes** — checked URLs persist via sidecar JSON triage, notes input on triage, focus loss bug fixed (uncontrolled input)
- **Spacing fixes** — pipeline buttons, N/A buttons, URL triage buttons all closer to labels (checklist, profile viewer, URL Manager)
- **Trump connections** — moved 30+ related: from body to frontmatter, added donors: field
- **Contradiction scanner** (`scripts/contradiction-scanner.cjs`) — 34 both-sides donors (12 high story), 1 opposition-funded (Musk funds Newsom+Trump), 9 cross-ref mismatches, 9 cross-party connections. Wired into ops alerts.
- **Money Trail visualizer** (`/money-trail` in ops) — force-directed graph, donor→politician→committee→bill flow, search any profile, draggable nodes
- **Governor executive actions pipeline** (`scripts/governor-exec-actions.cjs`) — CA (10 EOs via RSS), FL (25 EOs). NY/TX scrapers need HTML fixes. Written to Newsom/DeSantis profiles.
- **Reviews tab** in profile viewer — 3 sub-tabs (Code Claude, Research Claude, Editor). Each has notepad, blocker lists, action buttons (Fix This ▶, Request Review, Approve for A+). Color-coded status dot on tab.

Done (Research Claude):
- **A+ Editorial Review System** designed with David — section-by-section sign-off, priority scoring, type-batched reviews, orphan claims rule, correction trail
- **Vault Rules updated** — editorial review system, orphan claims from broken URLs, new frontmatter schema, review blocks per profile type, decisions log
- **editorial-priority.cjs** — scores 899 ready profiles. Batches: Congress(94), Executive(7), Donors(185), Corporations(141), Think Tanks/PACs(54), Lobbying/Media(84)
- **First 3 A+ reviews** — all BLOCKED:
  - Cori Bush (70): 4/10 pass. Corrupted Congress auto-block, sparse connections, unresolved contradiction
  - Carlos Gimenez (55.3): 5/10 pass. No last-enriched, Crowley contradiction, broken Wikipedia URL
  - Sherrod Brown (47.5): 1/10 pass. Wrong FEC ID (House not Senate), 0/0 bills wrong, OpenSecrets archived
- **vault.ts** updated with editorial review fields

Known issues:
- GitHub Actions still disabled
- NY/TX governor scrapers need HTML pattern fixes
- lda-pipeline.cjs still generates lda.senate.gov URLs
- Sherrod Brown FEC ID needs fixing (H2OH13033 → S6OH00163)
- Cori Bush Congress auto-block corrupted (shows Republican/Oklahoma)

Next session priorities:
1. Fix Code Claude blockers from first 3 reviews (FEC IDs, auto-blocks, enrichment)
2. Continue A+ reviews — Congress batch (91 remaining)
3. Graph legend on live site
4. Fix lda-pipeline.cjs domain
5. Write stories from both-sides donor data (AIPAC, Goldman Sachs, Boeing)
6. Fix NY/TX governor scrapers

---

## Previous Session
Claude: Research (then Code)
Date: 2026-04-08 (A+ editorial review system + contradiction scanner + money trail + governor pipeline)

Done (Research Claude):
- **A+ Editorial Review System** — designed and implemented with David:
  - Section-by-section sign-off via `verified-blocks` array
  - Priority scoring: connections(25%) + sources(30%) + corroboration(20%) + body(10%) - gaps(15%)
  - Type-batched reviews: Congress(94) → Executive(7) → Donors(185) → Corporations(141) → Think Tanks/PACs(54) → Lobbying/Media(84)
  - Detailed review log in frontmatter (date, reviewer, result, blocks reviewed, blockers, notes)
  - `orphan-claims` block mandatory on every review — broken URLs' claims must be re-sourced or rewritten
  - All rewrites documented in `corrections` frontmatter for permanent audit trail
  - 10 profile types with type-specific block checklists
- **Vault Rules updated** — orphaned claims rule, editorial review system, new frontmatter schema, review blocks table, decisions log entry
- **editorial-priority.cjs** — scores and ranks 899 ready (B) profiles. Top candidates: Cori Bush (70), League of Conservation Voters (74.5), Lennar Corp (71.5)
- **vault.ts** — editorial review fields added to Profile interface

Next session priorities (Research Claude):
1. Start A+ reviews — Congress batch first (94 profiles, top: Cori Bush, Carlos Gimenez, Sherrod Brown)
2. Fix cross-ref mismatches from contradiction scanner (Peter Thiel → 6 media profiles)
3. Review 9 cross-party connections flagged by scanner
4. Write stories from both-sides donor data (AIPAC, Goldman Sachs, Boeing)

---

## Previous Session
Claude: Code
Date: 2026-04-08 (contradiction scanner + money trail + governor pipeline + ops fixes)

Done:
- **Checklist pipeline buttons** — ▶ run buttons next to each checklist item (fec, govtrack, lda, etc.)
- **URL Manager fix** — checked URLs no longer revert to unchecked after save (sidecar JSON triage)
- **URL notes** — optional note input when triaging URLs (both URL Manager and profile viewer)
- **Spacing fixes** — pipeline buttons, N/A buttons, URL triage buttons all closer to labels
- **Trump connections fixed** — moved 30+ related: connections from body to frontmatter, added donors: field
- **Internal-notes audit** — only 5 files have internal-notes, all valid YAML (no corruption)
- **Contradiction scanner** (`scripts/contradiction-scanner.cjs`) — 4 checks:
  - 34 both-sides donors (12 high story potential: AIPAC 18 pols, Goldman Sachs 17, Boeing 10)
  - 1 opposition-funded contradiction (Elon Musk funds Newsom + Trump)
  - 9 cross-ref mismatches (Peter Thiel listed by 6 media figures not in his profile)
  - 9 cross-party connections to review
  - Results wired into ops alerts dashboard
- **Money Trail visualizer** (`/money-trail` in ops) — force-directed graph:
  - Default: top 15 both-sides donors with cross-party flows
  - Profile view: full donor→politician→committee→bill flow
  - Draggable nodes, zoom, hover highlights, arrows, legend
  - Color-coded: donors=amber, Dem=blue, Rep=red, committees=green
- **Governor executive actions pipeline** (`scripts/governor-exec-actions.cjs`):
  - California: 10 EOs via gov.ca.gov RSS (Tier 1)
  - Florida: 25 EOs from flgov.com (Tier 1)
  - NY/TX scrapers need HTML pattern fixes (0 results currently)
  - Data written to Newsom and DeSantis profiles

Known issues:
- GitHub Actions still disabled (David awaiting reinstatement)
- NY/TX governor scraper patterns need fixing (different HTML structures)
- lda-pipeline.cjs still generates lda.senate.gov URLs (not yet fixed)

Next session priorities:
1. Graph legend on live site (Stories, Opposition, entity types)
2. Fix NY/TX governor scraper HTML patterns
3. Fix lda-pipeline.cjs domain (lda.senate.gov → lda.gov)
4. Social scheduling for Distribution page
5. Run contradiction scanner periodically (add to pipeline schedule)
6. Verify live site build when GitHub Actions is back

---

## Previous Session
Claude: Code
Date: 2026-04-08 (readiness overhaul + ops v2 + profile viewer rebuild + type-specific checklists)

Done:
- **Readiness tier overhaul** — removed "developed", established 4-tier grading (raw/draft/ready/verified) with investigative journalism standards
- **Profile viewer overhaul** — Notes tab (internal, per-profile), connection editor (search + add/remove + commit), sources merged into URLs tab, readiness scroller, A-Z bar, completeness rings, promote/demote buttons, refresh button
- **Dashboard redesign** — 3-panel stats bar (Grades/Quality/Health), readiness scroller pills, "Sort: Nearest to A+" option, legend bar
- **Reclassification scripts** — reclassify-readiness.cjs + staleness-decay.cjs (not yet run with --write)
- **New APIs** — POST /api/profile/readiness, /api/profile/notes, /api/profile/connections
- Built `reclassify-readiness.cjs` — scans all profiles, computes source diversity, corroboration, known gaps. Dry-run: 592 ready (B), 371 draft (C), 0 verified (A+), 483 A+ candidates
- Built `staleness-decay.cjs` — auto-demotes verified→ready (90d), ready→draft (180d)
- New frontmatter: `source-types`, `corroboration-count`, `known-gaps`, `last-verified-by`
- Gold A+ badge on live site for verified profiles, green "SOURCED" for ready
- Near-verified + decay candidate alerts in Ops dashboard
- **Stale profile detector** — alerts API + dashboard cards for stale/never-enriched
- **A-Z navigation bar** — letter filter on vault grid, disabled letters dimmed
- **"What's needed" per profile** — color-coded next-action on cards and detail panel
- **"View Full Profile" button** — dashboard detail → profile viewer navigation
- Updated all docs: Vault Rules, CLAUDE.md, Pipeline Guide

**Reclassification executed**: 963 profiles audited, 387 reclassified. 598 ready (B), 365 draft (C), 525 A+ candidates.

Bug fixes: URL dedup, nested bracket regex, internal-notes YAML corruption (newlines), refresh button loading, search matching paths.

Additional done:
- **Type-specific A+ checklists** — VerificationChecklist component with role-aware requirements:
  Congress (voting records, committees, bills), President (executive orders, cabinet appointments),
  Governor (executive actions, state legislation), Cabinet (appointment, revolving door),
  Donor, Corporation, Media, Think Tank, Lobbying Firm, PAC — each with tailored criteria
- **N/A system** — edge cases (candidate not in office, private company, independent media) can mark
  items N/A with a reason, stored in checklist-na frontmatter. N/A items excluded from A+ scoring.
- **Pipeline Data Viewer** — expandable read-only view of all auto-blocks (voting records, committees,
  bills, FEC, executive orders, lobbying, contracts). Priority-sorted by profile type.
- **Executive orders pipeline** — proper pipeline in engine repo, ran for 5 presidents:
  Trump (474 EOs), Obama (294), Clinton (310), Biden (162), Bush W (294). Write run in progress.
- **Prev/Next navigation** on profile viewer
- **URL deduplication**, nested bracket regex fix, internal-notes YAML corruption fix
- **Connection type editor** — hover any connection to change type via dropdown (Related/Funded By/Opposes)
- **Editor auto-loads** profile from ?profile= query param
- Removed redundant ReadinessChart, added ContentBreakdown by category
- GitHub support ticket responded to (Actions disabled, awaiting re-enablement)

Known issues:
- Trump's `related:`/`donors:` in body not frontmatter — shows 0 connections in profile viewer
- Executive orders --write run may not have completed (check next session)
- Some profiles may have corrupted internal-notes from early auto-check runs

Executive orders pipeline ran with --write: Obama, Clinton, Biden, Bush W inserted. Trump parked (manual edit detected). Minor flushLog error (non-critical).

Back/Forward nav buttons added to sidebar (site-wide). Fixed exec orders pipeline bug (passed content instead of filePath to updateFrontmatter).

Editorial framework discussion with David — agreed on:
- Checklist must ENFORCE readiness (not just visual) + bypass button for edge cases
- Contradictions reworded: "Contradiction investigation complete (Research Claude)" — mandatory for A+
- Story grading: Story (1-4 URLs/draft) → Report (5-9/ready) → Investigation (10+/verified)
- Stories/events/sub-notes don't require pipeline enrichment
- Research Claude + Code Claude integration protocol (surfaces → acts, requests → builds)
- Additional editorial checks: cross-ref consistency, claim attribution, legal sensitivity, correction history, wikilink integrity, orphan detection, update cadence

Additional done (continued):
- **Editorial framework implemented** — checklist enforces readiness with bypass button, story grading (story/report/investigation by URL count), contradiction reworded as Research Claude requirement
- **Story/event/sub-note checklists** — editorial types get editorial criteria, no enrichment required
- **Vault integrity scanner** built — 499 broken wikilinks, 23 orphans, 10 cross-ref mismatches
- **Integrity alerts wired into Ops** — reads from reports/vault-integrity.json
- **New frontmatter fields** — corrections, update-cadence, legal-sensitivity
- **Reclassification v2 run** — 1,493 files, 351 changes. Final: 899 ready, 565 draft, 29 raw, 0 verified, 0 developed
- **Back/Forward nav** in sidebar (site-wide)
- **Executive orders pipeline** ran — Obama, Clinton, Biden, Trump, Bush W all written
- **Vault Rules** fully updated with editorial framework, integration protocol, story grading, contradiction protocol

Next session priorities:
1. Graph legend on live site (Stories, Opposition, entity types)
2. Contradiction scanner — auto-find shared-donor contradictions
3. Money trail visualizer — donor→politician→committee→bill flow
4. Fix lda-pipeline.cjs domain
5. Governor executive actions pipeline (state-level)
6. Verify live site build with all readiness/component changes
7. Social scheduling for Distribution page

Next session priorities:
1. Run reclassify-readiness.cjs --write after David reviews report
2. Run staleness-decay.cjs --write
3. Graph legend on live site (Stories, Opposition, entity types)
4. Contradiction scanner — auto-find shared-donor contradictions
5. Money trail visualizer — donor→politician→committee→bill flow
6. Fix lda-pipeline.cjs domain

---

## Previous Session
Claude: Code
Date: 2026-04-08 (marathon session — Ops v1.0 → v1.5, live site upgrades)

Biggest session in the project's history. Ops v1.0→v1.5, live site voting records, responsive tables, graph fixes.

**Ops v1.1**: Ctrl+K command palette, unified Profile page, rich activity feed, keyboard shortcuts, visual readiness badges
**Ops v1.2**: Source Hunter 6→15 APIs, auto-connection engine (8 strategies, 5,733 connections), LDA migration (509 URLs), relationship editing everywhere, clickable URLs, entity type filtering
**Ops v1.3**: Voting Record pipeline, pipeline action categories (Auto-Fill/Source Discovery/Needs Review/Relationship), visible edit controls
**Ops v1.4**: Pipeline diff viewer, profile completeness score (0-100% ring), stories connection type
**Ops v1.5**: VotingRecord live site component, View Logs button, blockquote vote format, draggable graph nodes (whole bubble), responsive tables site-wide

**Live site changes:**
- `VotingRecord.tsx` component — party loyalty ring, ideology spectrum, leadership score, auto-renders on politician profiles
- `ProfileWidget.tsx` — opposition edges fixed for ALL profile types (was only non-politicians), stories field added
- Responsive tables — ALL tables in article content stack vertically (no horizontal scroll)
- Obama profile cleaned (NUL bytes), David Sacks YAML fixed (build failure)

**Ops app changes:**
- Relationship Mapper: draggable nodes (entire bubble, container-level tracking), stories type, fuzzy name matching, context menu, entity filters
- Pipelines: action categories, View Logs (per-pipeline found/not-found/errors from GitHub Actions), voting record in pipeline list
- Source Hunter: 15 APIs with env vars matching GitHub Secret names
- Dashboard: completeness rings, diff viewer, activity feed

**Engine repo changes:**
- `auto-connection-engine.cjs` — 8 strategies for all profile types
- `voting-record-pipeline.cjs` — Congress.gov + GovTrack, blockquote format
- `auto-connect.yml` — standalone workflow with Run Auto-Connect button
- Voting record added to enrichment workflow

**Key lesson:** Verify UI changes in preview before pushing. The draggable nodes took 4 iterations because changes were pushed untested. Memory saved: `feedback_verify_before_push.md`.

Known issues:
- `.next` cache corruption if app killed mid-compile — `rm -rf ops/.next`
- LDA auth tokens don't work on lda.gov yet
- `lda-pipeline.cjs` in engine repo still generates lda.senate.gov URLs
- Voting record: some profiles "not found" on Congress.gov (name mismatches)

Next session priorities:
1. **Graph legend on live site** — Stories, Opposition, entity types in legend
2. **Stale profile detector** — surface profiles not enriched in 30+ days
3. **Contradiction scanner** — auto-find shared-donor contradictions
4. **Money trail visualizer** — donor→politician→committee→bill flow
5. **Auto-story generator** — draft stories from detected patterns
6. Fix lda-pipeline.cjs domain
7. Social scheduling for Distribution
8. Riff on live site graph improvements

---

## Previous Sessions

### Code Claude — 2026-04-08 (earlier sessions combined)
2. **Profile completeness score** — percentage ring on every profile card
3. **Stale profile detector** — surface profiles needing attention
4. **Contradiction scanner** — auto-find shared-donor contradictions for stories
5. **Money trail visualizer** — donor→politician→committee→bill flow diagram
6. **Auto-story generator** — draft story skeletons from detected patterns
7. Fix lda-pipeline.cjs domain
8. Social scheduling for Distribution page

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
