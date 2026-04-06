---
title: Changelog
type: meta
---

# The Donor Map — Development Changelog

A running timeline of every feature, fix, and improvement made to The Donor Map.

---

## 2026-04-05

### Pipeline Fixes (engine repo)
- **ProPublica 990 pipeline was hitting corporations** — the pipeline queried the ProPublica Nonprofit Explorer for ALL donor-type profiles including public corporations. Lockheed Martin matched a tiny foundation ($137K revenue), Devon Energy matched a $1 shell entity. Now skips `entity-type: "Corporation"` and `"Individual Donor"` — 990 data only goes to nonprofits, PACs, and think tanks.
- **Stripped bogus 990 data from 16 corporation profiles** — removed `ein`, `annual-revenue`, `net-assets`, `tax-year`, `employee-count` frontmatter and `Financial Overview` auto-blocks from: Cargill, John Deere, Tyson Foods, Aramark, General Dynamics, Lockheed Martin, Northrop Grumman, Devon Energy, Marathon Petroleum, PG&E, Williams Companies, Humana, Johnson & Johnson, National Rental Home Council, Carlyle Group, Morgan Stanley. **Research Claude: if you built analysis on any of these Financial Overview sections, that data was wrong — it came from unrelated nonprofit EINs, not the actual corporations.**
- **Fixed duplicate `last-updated` frontmatter keys** — consolidated 7 copy-pasted `updateFrontmatter()` functions into `shared.cjs` with key deduplication. Fixed existing duplicates in Adelson Family + Sheldon Adelson.
- **Fixed enrichment pipeline timeout** — step timeout 15→18min, job 20→25min. Replaced heredoc in `$GITHUB_OUTPUT` with temp file so timeouts can't corrupt the output stream and kill the commit step. Every scheduled run was hitting the 15min ceiling; 2 of 4 daily runs were failing.

### Site Polish
- **Listing filter bar** — added Profiles/Notes toggle + per-source-tier filter chips to folder + tag listings, auto-hides when listing has no variety
- **Folder entries enriched** — master-profile folders now inherit their master's frontmatter (party, state, sector, tier, readiness) so they render with dots + meta line + chips like regular profile entries
- **ProfileHeader fixes** — tier badge now reads `TIER 1` (was bare `1`); section-card wrapping falls back to h3 when a profile uses h3 as its top-level heading

### Scope Rules (Code Claude ↔ Research Claude)
- Added scope-boundary sections to both CLAUDE.md files (site + vault) defining who owns what. Triggered by the dossier-folder incident earlier today.
- New rules: handoff files are one-way + only mechanical tasks; Code Claude flags cross-scope user requests instead of silently doing them; Research Claude does the same in reverse.
- Deleted stale April 2 handoff (all items confirmed complete and shipped).
- **Research Claude please note:** `HANDOFF-to-Code-Claude.md` (Session 38n, 2026-04-05) currently lists editorial tasks (dossier merges, profile expansions, backlink passes, voice calibration) that are in your lane, not Code Claude's. Restructure it into your own session task list, keeping only mechanical items (git-commit dossier files after David provides them) in the handoff itself.

### Enrichment Pipeline (engine repo)
- Pipelines now run in parallel — workflow runtime dropped from ~26min to ~15min
- Fixed selection bug that processed the same 15 profiles every run — coverage now rotates via Fisher-Yates shuffle + 30-day miss cache
- `continue-on-error: true` on each pipeline step so one timeout doesn't block the commit step
- Recent runs: 37/43/37 profiles enriched across scheduled runs

### Enrichment Integration — Log + Conflict Handling (engine commit `c9e94d2`)
Fixes the "bot writes surprise Research Claude" problem. Two new engine lib helpers wired into all 7 pipelines (fec, lda, congress, propublica, sam, usaspending, govtrack):

- **`scripts/lib/enrichment-log.cjs`** — every run appends a dated section to `Vault Maintenance/Auto-Enrichment Log.md`, grouped by pipeline, listing each profile touched with a one-line summary ("2024 raised $5M", "$1.9M spend, 51 filings", etc.). 30-day rolling window, auto-pruned on every write.
- **`scripts/lib/enrichment-markers.cjs`** — hashes the body of every `<!-- auto:* -->` block when written. On the next run:
  - Block unchanged from stored hash → overwrite with fresh data (status: `updated`)
  - Block edited by a human → leave it alone, park fresh data in a `<!-- auto:* pending-merge -->` block directly below with an `[!attention]` callout (status: `parked`, conflict: true)
- **Richer commit messages** — the GitHub Action now writes commits like `API enrichment: 37 files (fec:12 lda:8 sam:5 …)` with a body listing per-pipeline counts, any parked-merge count, and the file list. This makes `git log` on the vault a scannable activity feed.

**Research Claude — new workflow:**
1. Skim `Vault Maintenance/Auto-Enrichment Log.md` at the top of each session to see what fresh data landed.
2. When you edit a bot-written auto-block (rewording, adding analysis), the bot will detect your edit next run and park fresh data in a `pending-merge` block below instead of clobbering you. Your job: fold in whatever's useful from the parked block, then delete the `<!-- auto:* pending-merge ... -->` block. Once removed, the bot treats the current version as the new baseline on its next run.
3. Prompt to kick this off (paste into a fresh Research Claude session):
   > New enrichment integration landed in the engine (commit `c9e94d2`). Two things are now live: (1) `Vault Maintenance/Auto-Enrichment Log.md` — bot-written, rolling 30 days, grouped by pipeline, read this at session start to see what API data just landed. (2) Auto-blocks (`<!-- auto:lda-lobbying start -->`, `<!-- auto:propublica-990 start -->`, etc.) are now hash-guarded. When you rewrite one, the next bot run parks fresh data in a `pending-merge` block below your version. Fold in what's useful, then delete the `pending-merge` block to accept your version as the new baseline. Read `content/Vault Maintenance/Auto-Enrichment Log.md` (once the first bot run populates it) and confirm you understand the new flow.

---

## 2026-04-04

### Profile Page Polish
- **Lifted article surface** — center column now reads as a raised `#13131a` document with border/radius/padding; sidebars stay pure black for chrome/content separation
- **Section cards cleaned** — removed top/bottom borders so cards separate by margin + color-coded left edge only, eliminating faint horizontal lines between cards
- **Card bg bumped** to `#1a1a24` so variants pop against the new lifted article surface
- **Stripped leading underscore** from 119 master-profile title frontmatter fields — filenames keep `_` for Obsidian sort, displayed titles now read clean everywhere (article title, backlinks, related profiles)
- **Footer links fixed** — corrected About slug capitalization (was 404), replaced dead Methodology link with `Even-More-About-This-Website`
- **Sidebar dollar amounts wired to frontmatter** — featured items now read `career-total` from each profile's frontmatter, falling back to hardcoded values when absent. Infrastructure ready for per-profile population.

### Methodology / About Consolidation
- Merged duplicate first-person essay content between About and Methodology pages
- Created `Even More About This Website.md` with the detailed evidentiary standards, source tiers, unit definitions, ROI methodology, limitations
- About now links to the detail page; Methodology.md deleted (alias added to About for legacy URL)

### Profile Tabs — Type-Aware
- Tabs now render differently for politician vs donor profiles (Overview/Donors/Voting/Analysis/Sources for politicians; Overview/Recipients/Policy Wins/Analysis/Sources for donors)
- Empty tabs become non-interactive with hover tooltip ("No X data yet for this profile")
- Duplicate tab-nav bug fixed (old nav now cleared before each rebuild)
- Active tab persisted across SPA navigation via sessionStorage

### Dataview Field Hiding
- Inline dataview paragraphs (`related:`, `donors:`, `party:`, etc.) at the start of paragraphs are now hidden on profile pages — bloat removed without touching the markdown
- Fixed template-string escape bug (`\s` → `\\s`) that was silently stripping the regex and preventing any matches

---

## 2026-04-03

### SAM.gov Federal Contracts Pipeline
- Created `scripts/sam-pipeline.cjs` — pulls federal contract award data from SAM.gov
- Tracks which companies win government contracts after donating to politicians
- Data: contract counts, dollar amounts, contracting agencies, date ranges, top contracts
- Tested: Lockheed Martin → 638,842 contracts, $2.9B top single award (Dept of Defense)
- Updates profile frontmatter (`federal-contracts` field) and inserts Federal Contracts markdown section
- Auto-update markers: `<!-- auto:sam-contracts start/end -->`
- Integrated into API Enrichment GitHub Action (runs 4x daily)

### ProPublica Nonprofit 990 Pipeline
- Created `scripts/propublica-pipeline.cjs` — pulls IRS 990 tax filing data via ProPublica's free API
- Extracts: revenue, expenses, net assets, contributions, officer compensation, lobbying spend, political expenditures, employee count
- Tested: Heritage Foundation → $106.3M revenue, $387.7M net assets, EIN 237327730
- Updates profile frontmatter (`ein`, `annual-revenue`, `net-assets`, `tax-year`, `employee-count`)
- Inserts Financial Overview markdown section with auto-update markers
- No API key needed — completely free

### GitHub Actions Automation (6 workflows)
- **RSS Pipeline** (`.github/workflows/rss-pipeline.yml`) — 3x daily (8am/2pm/8pm ET), scans feeds, auto-commits events
- **Broken Link Checker** (`.github/workflows/link-checker.yml`) — weekly Sunday, creates GitHub Issues with broken links
- **Content Stats Dashboard** (`.github/workflows/content-stats.yml`) — daily, generates `content/Interactive/site-status.md`
- **Frontmatter Validation** (`.github/workflows/frontmatter-check.yml`) — every push, validates YAML fields
- **Stale Profile Detection** (`.github/workflows/stale-profiles.yml`) — weekly Monday, flags profiles 90+ days old
- **API Enrichment** (`.github/workflows/api-enrichment.yml`) — 4x daily, runs FEC + Congress + ProPublica + SAM pipelines
- All free on public GitHub repo — replaced 3 Claude Code scheduled tasks that were burning API credits
- GitHub Secrets configured: `FECAPI`, `LDAAPI`, `SAMAPI`

### API Research Pipeline Overhaul
- Updated `scripts/lib/api-config.cjs` — removed dead APIs (OpenSecrets discontinued, FollowTheMoney merged into OpenSecrets)
- Added active APIs: ProPublica Nonprofit (free, no key), SAM.gov, GovTrack (free, no key)
- Lowered FARA rate limit to 30/hr (was getting 429s)
- Added `--limit` flag to FEC and Congress pipelines for batched enrichment
- Rewrote `.env.example` with current API landscape
- Strategy: free government APIs cover 80%+ of data needs, saving hundreds vs Chrome browsing / Perplexity

### Homepage Improvements
- Removed empty Graph component from homepage (was rendering blank in top right)
- Added BETA badge to left sidebar logo (amber, styled)
- Added featured items to Media Pipeline, Think Tanks, and K Street nav sections (top 5 each)
- K Street changed from leaf node to branch with children

### Table Fix (Chuck Schumer + site-wide)
- Fixed broken table rendering — `overflow: hidden` on `.center` was killing horizontal scroll
- Changed to `overflow-x: clip; overflow-y: visible` on `.center`, `overflow: visible` on article
- Tables now use `width: max-content; min-width: 100%` for proper scrolling
- Table headers: bumped font from 9px→10px, color from `#63636e`→`#7a7a86`, added `white-space: nowrap`

### Event Draft Fix
- Added slug skip in `contentPage.tsx` emitter — event drafts no longer publish as standalone pages
- Fixed HTML entity artifacts (&#8217; etc.) in RSS pipeline's `stripHtml()` function
- Events remain in `allFiles` for EventTimeline and MobileProfile components

### Two-Claude Governance System
- Created `CLAUDE.md` in site repo — Site Claude's governance file with full component table, frontmatter schema, build/deploy instructions, cross-references to Research Claude
- Updated Vault `CLAUDE.md` — added "Working with Site Claude" section, shared data layer docs, Changelog in Quick Start sequence, Handoff doc in Key Reference Documents
- Renamed Handoff doc from session-specific to standing communication channel (Research Claude → Site Claude)
- Communication flow: Research Claude updates Handoff doc → Site Claude reads it. Site Claude updates Changelog → Research Claude reads it.
- Stale governance files (DONOR-MAP-SITE-STATUS, DESIGNER-PROMPT, QUARTZ-SETUP-GUIDE) confirmed already cleaned up

### Phase 6 — Current Events Layer
- Created `scripts/rss-pipeline.cjs` — RSS intelligence pipeline
- Scans 8 feeds: The Hill, OpenSecrets, ProPublica, The Intercept, Congress.gov
- Matches stories against all 1,150 profile names in database
- Generates draft event notes in `content/Events/Drafts/` for Obsidian review
- Generates daily digest in `content/Events/Digests/` with matched stories, profile update suggestions, new name detection
- Created `EventTimeline.tsx` — right sidebar component on profile pages
- Shows recent news events mentioning the current profile with source links, dates, category icons
- Color-coded by category: money ($), investigation (!), legislation (§), news (→)
- Shows co-mentioned profiles as chips
- First run: 252 items fetched, 106 matched, 60 drafts written, 9 update suggestions, 4 new names detected

### Mobile Profile Experience
- Created `MobileProfile.tsx` — accordion panel below article content on mobile (≤800px)
- Collapsible sections: Top Donors, Both Sides, Donor Reach, Recent News
- Each section has explanation text, count badges, tap-to-expand
- First section auto-opens on load
- Mobile-optimized: larger tap targets, readable fonts (14px names, 12-13px meta)
- Brings all right sidebar intel to mobile users who previously saw none of it
- Added "News" link to mobile bottom nav (replaces "Findings"), linking to Events section

### Phase 7 — Open Graph Social Cards
- Custom OG image template with Donor Map$ branding (green $)
- Profile type badges: POLITICIAN (blue/red by party), DONOR (green), INVESTIGATION (amber)
- Shows context line (party, chamber, state, sector) on card
- Footer shows donor/politician stats + thedonormap.org URL
- Dark theme matching site design (#0c0c0f background)
- Left accent bar colored by profile type
- Every shared link now shows branded preview on Twitter/Facebook/Discord

### Site-Wide Readability Fix
- Boosted all dark grey text: `#4a4a54` → `#7a7a86`, `#63636e` → `#8a8a96` across 5 components
- Bumped minimum font sizes from 7-8px to 10px across DiscoveryPanel, EventTimeline, ProfileWidget
- Components fixed: ProfileWidget, DiscoveryPanel, EventTimeline, EvidencePanel, RelatedProfiles

### Interactive Tools Removed from Profile Pages
- Removed `injectProfileTools()` — the 6-tab interactive tools block (Money Flow, ROI, Both Sides, etc.) no longer appears at the bottom of master profile pages
- Added slug guard to InteractiveGraphs afterDOMLoaded so interactive rendering only runs on `/interactive/*` pages
- Root cause: Quartz's ConditionalRender passes `afterDOMLoaded` through unconditionally — the JS ran on every page regardless of the condition

### ProfileWidget Readability Improvements
- Added explanation text under each tab explaining what the data means
- Boosted text contrast: donor names `#b4b4bc` → `#d4d4dc`, sectors `#63636e` → `#8a8a96`, chamber labels `#4a4a54` → `#8a8a96`
- Section labels brightened to `#8a8a96`

### Table Fix
- Fixed broken table rendering caused by InteractiveGraphs optimization
- Added CSS-only scroll fallback with `min-width: 600px`
- Moved `enhanceTables()` JS into ProfileHeader's afterDOMLoaded

### Phase 0 — Frontmatter Enrichment
- Created `scripts/enrich-frontmatter.cjs` to bulk-enrich all profile YAML
- Enriched 715 profiles with 2,756 new structured fields
- Fields added: `issues`, `sector`, `entity-type`, `chamber`, `party`, `politicians-funded`, `state`, `state-abbr`, `top-donors`, `committees`, `district`, `leadership-roles`
- Data sourced from folder paths, hashtags, and content body parsing

### Phase 1 — Donor Power Rankings
- Created `PowerRankings.tsx` — sortable, filterable table of all 448 donors
- Search, sector filter dropdown, sort by reach/name/sector/tier
- Color-coded sector badges, reach scores computed from politicians-funded count
- Standalone page: `/interactive/power-rankings`

### Phase 2 — Who Funds Your Rep
- Created `WhoFundsYourRep.tsx` — state grid → politician cards with donor data
- 48 states, 178 politicians with cards showing party badge, donors, committees, issues
- Grouped by chamber (Senate → House → Governor)
- Standalone page: `/interactive/who-funds-your-rep`

### Phase 3 — Weekly Donor Spotlight
- Created `WeeklySpotlight.tsx` — featured donor hero card + queue + archive
- Reads `featured-date`, `spotlight-reason`, `shareable-stat` from frontmatter
- Seeded 3 spotlights: AIPAC (Apr 3), Raytheon (Apr 10), Koch Network (Apr 17)
- Standalone page: `/interactive/weekly-spotlight`

### Phase 4 — Issue Explorer
- Created `IssueExplorer.tsx` — 22 policy issues as color-coded tiles
- Click tile → drill down to donors, politicians, investigations for that issue
- VALID_ISSUES whitelist filters noise from enrichment
- Standalone page: `/interactive/issues`

### Phase 5 — Discovery Panel
- Created `DiscoveryPanel.tsx` — right sidebar widget on all profile pages
- "THIS DONOR ALSO FUNDS" — chips linking to funded politicians
- "SHARED DONORS" — donors funding politicians in both parties
- "DID YOU KNOW" — contextual facts specific to each profile

### Credibility System — Evidence Panel
- Created `EvidencePanel.tsx` — verification badge on every profile page
- Shows source tier counts (Tier 1/2/3) parsed from content
- Status badges: VERIFIED, IN PROGRESS, DRAFT, LIMITED SOURCES, NEEDS REVIEW
- Context line: party · chamber · state · sector

### Homepage Restructure
- Updated `LandingPage.tsx` headline to "Follow the Money."
- Badge: "DONOR INFLUENCE TRACKING SYSTEM"
- Stats section now shows dynamic "Verified" count
- Hook cards: "IT TRACKS / IT STORES / IT INVESTIGATES"
- Quick Paths: Biggest Findings, Browse by Pattern, About & Methodology
- Beta notice reframed as "Transparent by design"

### ProfileWidget Rebuild
- Rewrote `ProfileWidget.tsx` to work on ALL 231 politician profiles (was hardcoded to 5)
- Three tabs: Donors (top donors + sectors), Both Sides (cross-party funding), Reach (donor network size)
- All entries are clickable links to donor/politician profiles
- Uses `allFiles` frontmatter cross-referencing instead of hardcoded data

### InteractiveGraphs Optimization
- Wrapped `InteractiveGraphs` in ConditionalRender — only loads on `/interactive/*` pages
- Eliminates ~2,600 lines of unused JS from all non-interactive pages

### Infrastructure
- Fixed backtick escaping bug in WhoFundsYourRep CSS
- Fixed hook card number wrapping with `white-space: nowrap`
- Fixed "Did You Know" showing wrong profile's facts (now contextual per profile)
- Clean build: 1,456 files → 6,742 output files, zero errors
