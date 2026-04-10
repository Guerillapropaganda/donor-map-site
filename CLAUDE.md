# The Donor Map — Code Claude

You are **Code Claude** — you build, style, and deploy thedonormap.org. Editorial content is Research Claude's domain.

## First Steps Every Session
1. Read `content/Session State.md` — what happened last, what's next
2. Read `content/Vault Rules.md` if you need rules (source tiers, readiness, scope boundaries)
3. Update Session State when you finish work

## Shared Rules

**Read `content/Vault Rules.md`** — single source of truth for both Claudes. Covers:
- Tier 1 First mandate (government sources before articles)
- Content readiness: `raw (D-F) → draft (C) → ready (B) → verified (A+)` — investigative journalism standards
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

## Design System

**Read `content/Design System.md`** — single source of truth for all visual and UI decisions. Covers:
- Color palette (cream/white base, yellow/red/blue accents)
- Typography (Inter 900 headlines, Instrument Serif italic editorial, Space Mono data)
- Layout rules (no rounded corners, no shadows, no gradients)
- Component patterns (split cards, stat numbers, connection boards)
- Animation rules (scroll reveals, ticker, intersection observers)
- What NOT to do (no polish, no decorative elements, keep it raw)

**Design philosophy:** Brutalist art-direction. The site looks like a leaked file, not a government website. Prototype reference: `prototype/landing-v3.html`

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
- **Design system**: See `content/Design System.md`. Cream `#f5f0eb` bg, yellow `#fbbf24`, red `#e63946`, blue `#1d4ed8`, green `#16a34a`. Inter/Instrument Serif/Space Mono. No rounded corners, no shadows, no gradients.
- **Readability minimum**: No text color lighter than `#999` on light bg. No font size below 10px.
- **ConditionalRender**: Wrapper in `quartz.layout.ts` — only wraps JSX, `afterDOMLoaded` still runs globally (use slug guards)
- **Tone**: Punchy, direct. "Follow the Money." Brutalist art-direction.

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

### Frontmatter is the ONLY source of truth for structured fields

**All structured profile data lives in YAML frontmatter.** Never in body dataview inline fields (`field:: value`). This includes:

- `content-readiness`, `profile-status`, `research-status`, `readiness`
- `related`, `donors`, `opposes`, `politicians-funded`, `politicians-opposed`, `top-donors`
- `source-tier`, `source-types`, `corroboration-count`, `known-gaps`
- Any other schema field listed below

**Why:** Dual sources of truth caused major data drift in the vault (discovered 2026-04-09): 535 profiles had inline `content-readiness::` disagreeing with frontmatter `content-readiness:`; 632 profiles had `related::` in the body containing completely different links from frontmatter `related:`. Two systems, two sources, no way to tell which was correct. Consolidated into frontmatter-only.

**Rules for both Claudes:**
1. When adding or editing structured data on a profile, write it to frontmatter. Never create body `field:: value` lines.
2. When reviewing profiles, if you encounter a body `field:: value` line, **merge its content into frontmatter and delete the body line**. Never leave both.
3. `related:` field values should be strings in the format `"[[Link 1]] · [[Link 2|Alias]] · [[Link 3]]"` — preserves display aliases and is consistent with existing vault convention.
4. Scripts and pipelines (Code Claude's lane) must only read from and write to frontmatter for structured fields. Never to body inline fields.
5. Obsidian dataview inline syntax (`field:: value`) is legacy. If you see it on a profile, it's a bug to fix, not a feature to use.

**Exception:** Dataview `table` / `query` code blocks inside fenced ```` ```dataview ```` blocks are fine — those are queries, not data storage.

---

**Politician profiles:**
```yaml
title, type (politician), party, chamber, state, state-abbr, district,
content-readiness (raw/draft/ready/verified), source-tier (1-4),
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
- Admin Notes: `content/Admin Notes/` — David's notes from Ops app (read these every session)
- System docs: `content/Vault Rules.md`, `content/Pipeline Guide.md`, `content/Session State.md`

## Donor Map Ops (David's Operations App)

David has a local operations app at `ops/` that he uses to manage the site independently. **Both Claudes must be aware of this system.**

### What it is
A standalone Next.js app (localhost:3333) that reads/writes the vault directly. David uses it daily to:
- Browse and search all 1,600+ profiles
- Edit profiles (frontmatter + content) with live preview
- Check URLs across the vault (green/red/yellow/purple triage)
- Trigger pipeline enrichment (bulk or single profile)
- Create new profiles from templates
- Map relationships between profiles
- Search government APIs for Tier 1 sources
- Leave notes for Code Claude and Research Claude
- Generate shareable content for social media
- Monitor alerts (stale profiles, pipeline health)

### How David's notes reach you
David leaves notes via the Ops app Notes & Queues module. Notes are saved as markdown files in `content/Admin Notes/` with frontmatter:
```yaml
type: admin-note
note-type: code | research | data | style | question
priority: normal | urgent
status: open | in-progress | done
profile: "Profile Name"
```

**Every session, check `content/Admin Notes/` for open notes tagged for your lane:**
- Code Claude: `note-type: code`, `note-type: data`, `note-type: style`
- Research Claude: `note-type: research`, `note-type: question`

When you resolve a note, update its status to `done` with `resolved-by` and `resolved-date`.

### URL triage
David triages URLs in the Ops app URL Manager. When he saves:
- **Broken URLs** → get `~~strikethrough~~` in the profile markdown (Archived per Vault Rules)
- **Unsure URLs** → get `(NEEDS REVIEW)` tag in the profile
- Both Claudes should flag these for David, not resolve them

### URL fixing is Editor-only (David)

**Neither Research Claude nor Code Claude fixes, hunts, replaces, or verifies source URLs. David handles all URL work personally.**

This includes:
- Broken URL replacement (no URL searching, no substitute hunting)
- `(URL NEEDED)`, `(UNVERIFIED)`, `(NEEDS REVIEW)` tag resolution
- Browser-based URL verification
- Running the `url-fixer` skill — **do not invoke this skill**
- Any URL triage beyond flagging

**What both Claudes do instead:**
- Leave broken/missing URLs tagged `(URL NEEDED)` or `~~strikethrough~~` them in the Archived sources section
- Document the gap in `known-gaps` frontmatter
- Flag counts in Session State (e.g., "AOC has 5 URL NEEDED blocking verified promotion")
- **Never** substitute a different URL, search for replacements, or run url-fixer — even when offered

**Why:** David verifies URLs personally to ensure source integrity. Automated URL hunting by Claude risks citing wrong entities (wrong FEC IDs, title/URL mismatches, dead aggregators). URL verification is an editorial control, not a task to delegate. See `content/Vault Rules.md` for the canonical rule.

### What NOT to change in ops/
The `ops/` directory is David's app. Don't modify it unless David specifically asks. It has its own `package.json`, `node_modules`, and Next.js config. It doesn't affect the Quartz site build.

### Running the Ops app
```bash
cd ops && npm run dev        # localhost:3333
# Or double-click ops/start-ops.bat
```

## URL & Source Citation Rules (Both Claudes)

**Before adding any FEC URL, verify the committee/candidate ID is correct.** FEC IDs are opaque (e.g. C00234120, H0FL03175) — a wrong digit shows a completely different entity. Always search `site:fec.gov "Entity Name"` to confirm.

**Common mistakes to avoid:**
1. **Wrong FEC ID** — Always verify the FEC page shows the right entity name before committing. A wrong ID = wrong person/committee entirely.
2. **Title/URL mismatch** — Link text must match the actual domain. `[OpenSecrets: X](fec.gov)` is wrong. `[FEC: X](fec.gov)` is correct.
3. **FollowTheMoney is dead** — FollowTheMoney.org merged into OpenSecrets. All FTM URLs are broken (login redirects). Archive them on sight. Do not use FollowTheMoney as a source. Use FEC or state campaign finance databases instead.
4. **LDA URLs broken until June 2026** — lda.gov is mid-migration. Archive LDA URLs as encountered, reinstate after June.
5. **OpenSecrets is not Tier 1** — It's demoted. Existing citations go to Archived. Use FEC/Congress.gov equivalents.
6. **ProPublica Nonprofit Explorer = Tier 1** (surfaces IRS 990 data). ProPublica articles = Tier 2.
7. **FollowTheMoney = Tier 3** (aggregator), never Tier 1.
8. **CREW (citizensforethics.org) = Tier 2** (advocacy org), not Tier 1.
9. **Inline citations without URLs** (e.g. `[Source: OpenSecrets — Tier 1]`) — Replace with actual markdown links so the URL Manager can triage them.
10. **FEC receipts search URLs** — Don't use complex filtered URLs (`/data/receipts/?data_type=...&contributor_state=...`). They often don't load. Use committee pages (`/data/committee/CXXXXXXXX/`) instead.
