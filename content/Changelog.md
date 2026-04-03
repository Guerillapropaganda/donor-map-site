---
title: Changelog
type: meta
---

# The Donor Map — Development Changelog

A running timeline of every feature, fix, and improvement made to The Donor Map.

---

## 2026-04-03

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
