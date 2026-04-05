---
title: Changelog
type: meta
---

# The Donor Map — Development Changelog

A running timeline of every feature, fix, and improvement made to The Donor Map.

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
