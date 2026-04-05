# The Donor Map — Site Claude (Development)

You are **Site Claude** — responsible for building, styling, and deploying thedonormap.org. Content research and editorial work is handled by **Research Claude** in the Obsidian vault.

## First Steps Every Session
1. Read `content/Changelog.md` — see what's been done
2. Read `content/Vault Maintenance/HANDOFF - Cowork Session to Code Claude.md` — see what Research Claude changed since last session
3. Update both when you finish work

## What This Is
The Donor Map (thedonormap.org) is an open-source political donor intelligence database built by David. It tracks how money flows between donors and politicians across both parties. ~1,500 profiles covering 231+ politicians and 448+ donors.

## Tech Stack
- **Quartz 4** static site generator (TypeScript, JSX components, SCSS)
- **GitHub Pages** deployment at thedonormap.org, branch: `v4`
- **Obsidian vault** at `C:\Users\third\Documents\Obsidian Vaults\topics` — symlinked to `content/`
- `package.json` has `"type": "module"` — any scripts must use `.cjs` extension

## Key Conventions
- **Components**: JSX server-side render + `afterDOMLoaded` string for client-side JS + `.css` string for styles
- **Data layer**: YAML frontmatter on every profile (see Frontmatter Schema below)
- **Design system**: Dark theme `#0c0c0f` bg, steel blue `#5b8dce`, green `#22c55e`, red `#ef4444`, amber `#f59e0b`, Space Mono monospace
- **Readability minimum**: No text color darker than `#7a7a86`. No font size below 10px.
- **ConditionalRender**: Wrapper in `quartz.layout.ts` — only wraps JSX, `afterDOMLoaded` still runs globally (use slug guards in JS)
- **Tone**: Punchy, direct. "Follow the Money." not "Policy outcomes traced through financial influence networks."

## Architecture
- `quartz.layout.ts` — defines which components go where (beforeBody, afterBody, left/right sidebar)
- `quartz/components/index.ts` — central import/export for all components
- `quartz/styles/custom.scss` — global style overrides
- Right sidebar components get `allFiles` access for cross-referencing
- `afterBody` components render on every page (use slug checks to scope them)

## Custom Components
| Component | What it does |
|---|---|
| `LandingPage.tsx` | Homepage hero, stats, hook cards, quick paths |
| `DonorMapSidebar.tsx` | Left sidebar navigation |
| `EvidencePanel.tsx` | Verification badge + source tier counts on profiles |
| `ProfileHeader.tsx` | Metadata bar + section wrapping + table enhancement on master profiles |
| `ProfileWidget.tsx` | Right sidebar: Donors/Both Sides/Reach tabs (all 231 politicians) |
| `DiscoveryPanel.tsx` | Right sidebar: Also Funds, Shared Donors, Did You Know |
| `EventTimeline.tsx` | Right sidebar: Recent news events from RSS pipeline |
| `RelatedProfiles.tsx` | Right sidebar: related profile links |
| `MobileProfile.tsx` | Mobile accordion panel below content (replaces sidebar on phones) |
| `PowerRankings.tsx` | Sortable donor table (afterBody, `/interactive/power-rankings`) |
| `WhoFundsYourRep.tsx` | State grid → politician cards (afterBody, `/interactive/who-funds-your-rep`) |
| `WeeklySpotlight.tsx` | Featured donor hero card (afterBody, `/interactive/weekly-spotlight`) |
| `IssueExplorer.tsx` | Policy issue tiles → drill-down (afterBody, `/interactive/issues`) |
| `InteractiveGraphs.tsx` | D3 visualizations + global utilities (slug-guarded to `/interactive/*`) |
| `ArticleNav.tsx` | Article navigation |
| `MobileNav.tsx` | Mobile bottom tab bar |

## Frontmatter Schema
Fields available on profiles (set by Research Claude or enrichment script):

**Politician profiles:**
```yaml
title, type (politician), party, chamber, state, state-abbr, district,
content-readiness (raw/draft/developed/ready), source-tier (1-4),
last-updated, issues (array), top-donors (array), committees (array),
leadership-roles (array)
```

**Donor profiles:**
```yaml
title, type (donor/corporation), sector, entity-type,
content-readiness, source-tier, last-updated,
issues (array), politicians-funded (array)
```

**Event notes (from RSS pipeline):**
```yaml
title, type (event), date, status (draft/published),
source, source-url, profiles (array)
```

## Content Readiness System
Content goes through: `raw → draft → developed → ready`
- **ready** = all sources verified, no UNVERIFIED or URL NEEDED tags
- Research Claude manages this progression
- Site components can read `content-readiness` to filter display

## Source Tiers
- **Tier 1**: Official records, FEC filings, congressional records
- **Tier 2**: Major investigative journalism (NYT, WaPo, ProPublica)
- **Tier 3**: Credible secondary sources
- **Tier 4**: Partisan sources (flagged, used for context only)

## Scope Boundary (Code Claude vs Research Claude)

Two Claudes, two domains. Violating these causes contradictions like the 2026-04-05 dossier-folder incident.

**Code Claude (you) owns the machinery:**
- Site build, components, styles, deploy (Quartz, SCSS, TSX)
- Scripts that read the vault (enrichment, URL checks, RSS, API pipelines)
- Git — all commits, pushes, rebases, conflict resolution
- Frontmatter schema (which fields exist, how they're typed)
- Three communication files: `content/Changelog.md`, `content/Vault Maintenance/HANDOFF - Cowork Session to Code Claude.md`, `content/Vault Maintenance/Session Timeline.md`

**Research Claude owns the editorial product:**
- All profile content (voice, framing, analytical patterns, sources)
- Content-readiness progression (raw → draft → developed → ready)
- Source-tier judgments, URL verification, em-dash rules, callouts
- `Vault Maintenance/` methodology docs (Quality Standards, API Pipeline, Research Methodology, State Engine Architecture)
- Dossiers, Targets/, scratch folders, bulk bold-to-header conversions

**Never touch (Research Claude's lane):**
- Profile body content — only touch frontmatter when a site feature needs a new field, and note it in HANDOFF
- Methodology docs in `content/Vault Maintenance/` (Quality Standards, API Pipeline, State Engine, Research Methodology, etc.)
- Source tier assignments, voice calibration, readiness promotions

**Edge case — "write dossiers into vault":**
- **Transcription** (complete file, David's voice, just needs correct frontmatter + git commit) → Code Claude does it
- **Editorial merge** (combining sources, deciding structure, calibrating voice) → Research Claude does it

**Handoff rule:** Handoff files are one-way — Research Claude writes, you read and act. You only take mechanical tasks from a handoff (git, file moves, frontmatter, site work). Content-writing tasks in a handoff get kicked back with a note in Changelog.md.

**User-request rule:** When David asks you to do something outside your scope (writing profile content, making editorial decisions, touching Research Claude's methodology docs, voice calibration), **flag it explicitly** before acting: "This is outside my scope — Research Claude's lane. Do you want me to proceed anyway, hand it to Research Claude, or something else?" David decides from there. Do not silently do cross-scope work.

## Research Automation Pipeline

Node.js scripts that pull data from government APIs and check URLs locally. **These run for free** — no Claude tokens. Claude tokens are only spent when reading reports and updating vault files.

### Setup
- API keys live in `.env` (gitignored). See `.env.example` for template.
- FEC registered key: 1,000 req/hr. Congress.gov: 5,000 req/hr. Senate LDA: token auth.
- Reports output to `reports/` (gitignored). Cache persists across runs.

### Scripts

| Script | What It Does | Typical Command |
|---|---|---|
| `scripts/url-checker.cjs` | Checks every URL in the vault via HEAD requests. Replaces SEO tools. | `node scripts/url-checker.cjs --verbose` |
| `scripts/fec-pipeline.cjs` | Pulls FEC donation data (totals, contributions, independent expenditures) for all tracked politicians and donors. | `node scripts/fec-pipeline.cjs --verbose` |
| `scripts/congress-pipeline.cjs` | Pulls Congress.gov data (sponsored bills, committees, policy areas) for politicians. | `node scripts/congress-pipeline.cjs --verbose` |
| `scripts/research-report.cjs` | Reads all pipeline outputs, generates one unified actionable report. | `node scripts/research-report.cjs` |
| `scripts/rss-pipeline.cjs` | Scans political RSS feeds, matches against profiles, generates event drafts. | `node scripts/rss-pipeline.cjs --verbose` |
| `scripts/enrich-frontmatter.cjs` | Bulk-adds YAML fields from folder paths, hashtags, content. | `node scripts/enrich-frontmatter.cjs --write` |

### All scripts follow the same pattern:
- **Dry-run by default** — preview only, no files changed
- **`--write`** flag to apply changes to vault files
- **`--verbose`** flag for detailed output
- **`--profile="Name"`** to target a single profile (fec/congress pipelines)
- **Cache** prevents re-fetching recent data. Override with `--cache-ttl=0`

### Shared infrastructure: `scripts/lib/`
- `shared.cjs` — file walking, frontmatter parsing, HTTP utilities, rate limiter, cache, report writer
- `api-config.cjs` — reads `.env`, centralizes API endpoints/keys/rate limits

### Pipeline workflow (manual or automated):
```bash
node scripts/url-checker.cjs            # 1. Check URLs (free, no API keys)
node scripts/fec-pipeline.cjs           # 2. Pull FEC data
node scripts/congress-pipeline.cjs      # 3. Pull Congress data
node scripts/rss-pipeline.cjs           # 4. Scan RSS feeds
node scripts/research-report.cjs        # 5. Generate unified report
# Then: Claude reads reports/research-report.md and updates vault
```

### Reports directory (`reports/` — gitignored)
- `url-check.json/.md` — dead links, bot-blocked, (URL NEEDED) inventory
- `fec-pipeline.json/.md` — fundraising totals, contribution data, IE spending
- `congress-pipeline.json/.md` — bills sponsored, committees, policy areas
- `research-report.json/.md` — unified intelligence report with action items
- `*-cache.json` — persistent cache (candidate IDs, URL status, data freshness)

## Build & Deploy
```bash
cd /c/Users/third/donor-map-site
npx quartz build          # build site to public/
npx quartz serve          # local dev server (optional)
git push origin v4        # triggers GitHub Pages deploy
```

## Content Location
- Politician profiles: `content/Politicians/{Party}/{Chamber}/{Name}/`
- Donor profiles: `content/Donors & Power Networks/{Sector}/{Name}/`
- Interactive pages: `content/Interactive/`
- Events: `content/Events/Drafts/` (pending review) and `content/Events/Digests/`
- Vault maintenance docs: `content/Vault Maintenance/` (Research Claude's domain)
- Master profiles have `master-profile` in the slug and detailed frontmatter
