# The Donor Map — Quartz Site Project Status

**Last Updated:** April 1, 2026
**Live Site:** https://guerillapropaganda.github.io/donor-map-site/
**Repo:** https://github.com/Guerillapropaganda/donor-map-site
**Branch:** `v4` (Quartz convention — NOT main)
**Repo Location on Machine:** `C:\Users\third\donor-map-site`
**Vault Location:** `C:\Users\third\Documents\The Donor Map`

---

## Architecture

- **Quartz 4** static site generator converts the Obsidian vault into a GitHub Pages site
- **GitHub Actions** deploys on push to `v4` branch (workflow: `.github/workflows/deploy.yml`)
- **SPA mode** enabled with popover previews
- **Content source:** The Obsidian vault (`The Donor Map`) is the `content/` folder for Quartz
- **~1,400+ notes** in the vault

## Theme & Styling

- **Color scheme:** Purple/green dark dashboard
  - Primary: `#818cf8` (purple) for accents, active states, links
  - Secondary: `#22c55e` (green) for money amounts, success callouts
  - Background: `#0c0c0f` (near-black)
  - Dark mode forced (light and dark mode colors are identical)
- **Fonts:** Space Grotesk (headers/body), Space Mono (code/monospace elements)
- **Custom CSS:** `quartz/styles/custom.scss` — extensive overrides including:
  - H2: purple left border
  - H3: monospace uppercase green
  - H4: monospace uppercase purple
  - Internal links: purple with bottom border underline
  - Tags: gray monospace pills
  - Callouts: purple default, green tip/success, red contradiction/warning, amber pattern
  - Tables: dark background, green money column, purple pill links
  - Money amounts (`strong > code`): green monospace
  - Darkmode toggle hidden (forced dark)
  - `.page-title { display: none }` — hidden since custom sidebar has logo

## Custom Components

### DonorMapSidebar (`quartz/components/DonorMapSidebar.tsx`)

Custom left sidebar replacing the default Quartz explorer. Features:
- **"DM" badge + "Donor Map_"** with blinking CSS cursor animation
- **Dynamic node count** from `allFiles.length`
- **POLITICIANS section** — 5 featured politicians with green dollar amounts + active page detection
- **DONOR NODES** — 4 featured donors with emoji icons
- **CONTRADICTIONS** — 3 featured contradiction deep dives with emoji icons
- **INTERACTIVE** — 3 tool links with emoji icons
- **Purple active state** — left border + background highlight when on that politician's page

**CRITICAL: Dynamic slug resolution (as of April 1, 2026)**
The sidebar uses `resolveRelative()` from Quartz's path utilities + `allFiles` lookup instead of hardcoded paths. Each sidebar entry has a `search` key that matches the end of a Quartz slug. The `findPage()` helper searches `allFiles` at build time to resolve the correct path. This means:
- No hardcoded file paths that break when files move
- Uses the same resolution method as Quartz's built-in Backlinks/RecentNotes components
- If a page can't be found, link falls back to `#` instead of 404

**Search keys currently used:**
- Politicians: `_nancy-pelosi-master-profile`, `_mitch-mcconnell-master-profile`, etc.
- Donors: `wall-street/goldman-sachs`, `aipac---american-israel-public-affairs-committee`, `koch-network---charles-koch`, `defense--and--intelligence/lockheed-martin`
- Contradictions: `contradiction-03---pharma-kills-drug-negotiation-from-both-sides`, `contradiction-04---lockheed-martin-buys-defense-hawks-in-both-parties`, `the-carried-interest-loophole---30-years-of-survival`
- Tools: `donors--and--power-networks`, `stories/published`, `contradiction-deep-dives`

### Component Registration

- **`quartz/components/index.ts`** — imports and exports `DonorMapSidebar`
- **`quartz.layout.ts`** — `DonorMapSidebar()` is first component in `left` array for both `defaultContentPageLayout` and `defaultListPageLayout`

## Layout (`quartz.layout.ts`)

- **Left sidebar:** DonorMapSidebar, mobile-only Search/Explorer
- **Right sidebar:** desktop-only Search, desktop-only TableOfContents, Backlinks
- **beforeBody:** Breadcrumbs (conditional — hidden on index), ArticleTitle, ContentMeta
- **Footer:** Links to The Donor Map homepage and GitHub repo
- **Removed components:** Graph (froze browser with 1,400+ nodes), Darkmode toggle (forced dark), TagList (caused duplicate tags)

## Config (`quartz.config.ts`)

- `baseUrl: "guerillapropaganda.github.io/donor-map-site"`
- `pageTitleSuffix: " - Follow the Money"`
- `enableSPA: true`
- `enablePopovers: true`
- `ignorePatterns: ["private", "templates", ".obsidian", "_templates", "Vault Maintenance", "Excalidraw", "Assets"]`

## Quartz URL Encoding Rules

Quartz converts vault filenames to URL slugs:
- **Spaces → hyphens** (`Nancy Pelosi` → `Nancy-Pelosi`)
- **`&` → `--and--`** (`Donors & Power Networks` → `Donors--and--Power-Networks`)
- **` - ` (space-hyphen-space) → `---`** (`AIPAC - American Israel` → `AIPAC---American-Israel`)
- **Files starting with `_`** keep the underscore (`_Nancy Pelosi Master Profile` → `_Nancy-Pelosi-Master-Profile`)

## File Sync Workflow

When editing Quartz files via Cowork/Claude:
1. **If Claude has direct mount access to `C:\Users\third\donor-map-site`** — edit files directly, then user runs `git add/commit/push` in PowerShell
2. **If no direct access** — stage files in vault `Assets/quartz-v3-update/`, user copies with `Copy-Item` then pushes
3. **Method 1 is strongly preferred** — use `mcp__cowork__request_cowork_directory` with path `C:\Users\third\donor-map-site`

## Known Issues & Quirks

- **SPA caching:** After pushing changes, user MUST hard refresh (Ctrl+Shift+R) to clear SPA cache. Old pages cached by the SPA router will serve stale sidebar HTML with old paths.
- **Tag links:** Tags link to `/tags/...` without the `/donor-map-site/` prefix — this is a known Quartz issue with GitHub Pages subdirectory deployments. Not yet fixed.
- **Assets excluded from build:** The `Assets` folder is in `ignorePatterns`, so interactive tools (Money Flow, ROI Calculator, Both-Sides) that lived there won't be served. The sidebar "INTERACTIVE" section currently links to existing vault sections as placeholders.
- **Homepage (`content/index.md`):** May need updating — a previous version with a blockquote section failed to copy over due to a PowerShell error.

## Completed Work

1. Created GitHub Actions deploy workflow (`.github/workflows/deploy.yml`) targeting `v4` branch
2. Built custom DonorMapSidebar JSX component with full inline CSS
3. Purple/green dark dashboard theme matching user's mockup
4. Removed Graph component (performance), Darkmode toggle (forced dark), TagList (duplicate tags)
5. Fixed 404 navigation errors — rewrote sidebar to use dynamic `resolveRelative()` + `allFiles` lookup instead of hardcoded paths
6. Registered custom component in `index.ts` and both layout configurations

## Pending / Future Work

- [ ] **Verify dynamic sidebar links work** — after latest push, hard refresh and test clicking multiple links in sequence
- [ ] **Fix tag links** — tags go to `/tags/...` instead of `/donor-map-site/tags/...`
- [ ] **Update homepage** (`content/index.md`) — add blockquote intro, featured profiles table, "Explore the Data" section
- [ ] **Mockup structural elements** that require vault markdown changes: stats bar (TOTAL TRACKED / DONOR LINKS / SECTORS / CONTRADICTIONS), "READY" badge, "// KEY FINDING" callouts, "// CONTRADICTION FLAGGED" callouts
- [ ] **Interactive tools** — need alternative hosting or remove Assets from ignorePatterns to serve Money Flow, ROI Calculator, Both-Sides tools
- [ ] **Custom domain setup** — user mentioned wanting this eventually
- [ ] **Add more politicians/donors/contradictions to sidebar** — or make sidebar sections expandable/searchable
