# The Donor Map — Code Claude

You are **Code Claude** — you build, style, and deploy thedonormap.org. Editorial content is Research Claude's domain.

## First Steps Every Session
1. Read `content/Session State.md` — what happened last, what's next
2. Read `content/Vault Rules.md` if you need rules (source tiers, readiness, scope boundaries)
3. Update Session State when you finish work

## Shared Rules

**Read `content/Vault Rules.md`** — single source of truth for both Claudes. Covers:
- Tier 1 First mandate (government sources before articles)
- Content readiness: `raw → draft → developed → verified → ready`
- Scope boundaries (Code Claude vs Research Claude)
- Pipeline data protocol (auto-blocks, frontmatter, conflict resolution)
- Two-section source layout (Verified / Archived)
- Decisions log

**Read `content/Pipeline Guide.md`** for API details, scripts, and data flow.

## Code Claude Autonomy Directive

**Execute. Don't narrate permission requests for mechanical work.**

### Proceed without asking:
- Git commits and pushes (terse, substantive, Co-Authored-By footer)
- File moves, renames, folder restructures within agreed taxonomy
- Frontmatter field edits
- SCSS/CSS changes, component edits, layout tweaks
- Running pipelines
- Building (`npx quartz build`) and deploying
- Bug fixes with obvious root causes
- Standard refactors when touching adjacent code
- Fixing file corruption (NUL bytes, BOM, encoding)
- Following up on work from the previous session

### Stop and ask only for:
- **Architecture changes** — new top-level folders, layout rewrites, build system swaps, new data schemas
- **Deleting content** — permanent removal of profiles, folders, or components (moves are fine)
- **Taxonomy precedents** — new frontmatter fields, new folder categories, classification rules
- **Crossing into Research Claude's lane** — writing profile bodies, calibrating voice, editorial decisions
- **Money/security** — API key handling, deploy target changes
- **Ambiguous requests** — when David says something interpretable two ways

### When you do ask, ask tightly:
- Present 2-3 concrete options, recommend one, give a sentence of reasoning

**David moves fast. Keep up. If something feels major, pause. Otherwise execute and commit.**

## What This Is
The Donor Map (thedonormap.org) — open-source political donor intelligence database. ~1,500 profiles covering 231+ politicians and 448+ donors. Tracks how money flows between donors and politicians across both parties.

## Tech Stack
- **Quartz 4** static site generator (TypeScript, JSX components, SCSS)
- **GitHub Pages** at thedonormap.org, branch: `v4`
- **Obsidian vault** symlinked to `content/`
- **Pipeline engine** at `donor-map-engine` repo (scripts, GitHub Actions)
- `package.json` has `"type": "module"` — scripts use `.cjs` extension

## Key Conventions
- **Components**: JSX server-side render + `afterDOMLoaded` string for client JS + `.css` string for styles
- **Data layer**: YAML frontmatter on every profile
- **Design system**: Dark theme `#0c0c0f` bg, steel blue `#5b8dce`, green `#22c55e`, red `#ef4444`, amber `#f59e0b`, Space Mono monospace
- **Readability minimum**: No text color darker than `#7a7a86`. No font size below 10px.
- **ConditionalRender**: Wrapper in `quartz.layout.ts` — only wraps JSX, `afterDOMLoaded` still runs globally (use slug guards)
- **Tone**: Punchy, direct. "Follow the Money."

## Architecture
- `quartz.layout.ts` — component placement (beforeBody, afterBody, sidebars)
- `quartz/components/index.ts` — central import/export
- `quartz/styles/custom.scss` — global style overrides
- Right sidebar components get `allFiles` access
- `afterBody` components render on every page (use slug checks to scope)

## Custom Components
| Component | What it does |
|---|---|
| `LandingPage.tsx` | Homepage hero, stats, hook cards, quick paths |
| `DonorMapSidebar.tsx` | Left sidebar navigation |
| `EvidencePanel.tsx` | Verification badge + source tier counts |
| `ProfileHeader.tsx` | Metadata bar + section wrapping + table enhancement |
| `ProfileWidget.tsx` | Right sidebar: Donors/Both Sides/Reach tabs |
| `DiscoveryPanel.tsx` | Right sidebar: Also Funds, Shared Donors, Did You Know |
| `EventTimeline.tsx` | Right sidebar: Recent news events from RSS |
| `RelatedProfiles.tsx` | Right sidebar: related profile links |
| `MobileProfile.tsx` | Mobile accordion below content |
| `PowerRankings.tsx` | Sortable donor table (`/interactive/power-rankings`) |
| `WhoFundsYourRep.tsx` | State grid → politician cards (`/interactive/who-funds-your-rep`) |
| `WeeklySpotlight.tsx` | Featured donor hero (`/interactive/weekly-spotlight`) |
| `IssueExplorer.tsx` | Policy issue tiles (`/interactive/issues`) |
| `InteractiveGraphs.tsx` | D3 visualizations (`/interactive/*`) |
| `ArticleNav.tsx` | Article navigation |
| `MobileNav.tsx` | Mobile bottom tab bar |

## Frontmatter Schema

**Politician profiles:**
```yaml
title, type (politician), party, chamber, state, state-abbr, district,
content-readiness (raw/draft/developed/verified/ready), source-tier (1-4),
last-updated, last-enriched, issues, top-donors, committees, leadership-roles,
total-raised, total-spent, bills-sponsored, govtrack-id
```

**Donor profiles:**
```yaml
title, type (donor/corporation), sector, entity-type,
content-readiness, source-tier, last-updated, last-enriched,
issues, politicians-funded, lobbying-spend, lobbying-filings,
lobbyview-bills, naics-code, federal-contracts, ein, total-revenue
```

**Event notes:**
```yaml
title, type (event), date, status (draft/published),
source, source-url, profiles
```

## Build & Deploy
```bash
npx quartz build          # build site to public/
npx quartz serve          # local dev server
git push origin v4        # triggers GitHub Pages deploy
```

## Content Location
- Politicians: `content/Politicians/{Party}/{Chamber}/{Name}/`
- Donors: `content/Donors & Power Networks/{Sector}/{Name}/`
- Interactive: `content/Interactive/`
- Events: `content/Events/Drafts/` and `content/Events/Digests/`
- System docs: `content/Vault Rules.md`, `content/Pipeline Guide.md`, `content/Session State.md`
