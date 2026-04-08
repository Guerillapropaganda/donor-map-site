---
title: "Vault Standards and Agent Instructions"
type: reference
content-readiness: ready
last-updated: 2026-03-26
source-tier: 1
parent: null
---

tags: #story

#vault-maintenance #standards #reference #agent-instructions #analysis

related: [[Research Methodology and Data Sources]] [[Session Timeline]]

---

### VAULT STANDARDS AND AGENT INSTRUCTIONS
A single reference document for consistent output across all agents and sessions.

---

### FILE NAMING CONVENTIONS

### Master Profiles
- Format: `_[Full Name] Master Profile.md`
- Example: `_[[_Elizabeth Warren Master Profile|Elizabeth Warren]] Master Profile.md`
- Underscore prefix required
- Full name in title case
- Always stored in the appropriate politician folder

### Sub-Notes (Policy, Voting Records, Biographical)
- Format: `[Descriptive Title].md`
- Example: `2024 Campaign Finance.md`, `Environmental Voting Record.md`
- No underscore prefix
- Title case
- Stored in same folder as their master profile

### Donor Nodes
- Format: `[Full Name or Acronym - Full Name].md`
- Examples: `[[Elon Musk|Elon Musk]].md`, `Koch - Koch Industries.md`, `[[AIPAC - American Israel Public Affairs Committee|AIPAC]].md`
- Organizations: acronym first, dash, full name
- Individuals: full name only
- Stored in appropriate category folder under `Donors & Power Networks/`

### Placeholder Notes
- Format: `_[Full Name] Placeholder.md`
- Same naming as master profiles but with "Placeholder" instead of "Master Profile"
- Stored in appropriate politician folder

---

### FOLDER STRUCTURE

```
topics/
├── Politicians/
│ ├── Democrats/
│ │ ├── Senate/[Name]/
│ │ ├── House/[Name]/
│ │ ├── Governors/[Name]/
│ │ ├── Presidential/[Name]/
│ │ └── CA Governor 2026/[Name]/
│ ├── Republicans/
│ │ ├── Senate/[Name]/
│ │ ├── House/[Name]/
│ │ ├── Governors/[Name]/
│ │ ├── Presidential/[Name]/
│ │ └── CA Governor 2026/[Name]/
│ ├── Independent/[Name]/
│ ├── SCOTUS/[Name]/
│ └── International/[Name]/
├── Donors & Power Networks/
│ ├── [Category]/
│ │ └── [donor-files].md
│ └── [Category]/
├── Stories/
│ ├── Daily Updates/
│ ├── Research Logs/
│ └── Vault Maintenance/
│ ├── Session Timeline.md
│ ├── Research Methodology and Data Sources.md
│ ├── Vault Standards and Agent Instructions.md
│ └── [other maintenance docs]
└── Assets/
 └── [images, attachments]
```

Each politician gets a folder in the appropriate party/chamber/role path. All of that politician's files (master profile, sub-notes, placeholders) live in their folder.

---

### MASTER PROFILE TEMPLATE

Every master profile must follow this exact structure:

```
#[tags-here] #politician #[party-lowercase] #[chamber-or-role]

related: Display Name Donor - Full Name

---

### [POLITICIAN FULL NAME] MASTER PROFILE
---

### Who They Are

[2-3 paragraph biography: background, education, career path before politics, current position]

### The Central Thesis

[1-2 paragraphs: the core argument about this politician's relationship to donors. What donor class do they serve? What structural function do they perform?]

> [!money]
> [Synthesized funding pattern: total raised, dominant sources, geographic clustering if relevant]

### The Core Contradiction

[Key gap between rhetoric and material position. What does this politician promise vs. deliver? Use class analysis lens.]

> [!contradiction]
> [Specific example with dates: when did they promise X? When did they deliver Y instead? What changed? Who benefited?]

### Donor Class Map

| Donor/PAC | Total Donated | Key Policy Outcome | Timeline |
|-----------|---------------|-------------------|----------|
| [Name] | $X | [Policy] | [Date range] |

[Use this to show top 5-10 donors and what they got in return. Organize by size or by policy area.]

### Policy Area Notes

| Sub-Note | Status | Summary |
|----------|--------|---------|
| 2024 Campaign Finance | ready | [1-sentence description] |
| Voting Record - Labor | developed | [1-sentence description] |

[Use dataview query if possible; manual table if not. Shows all sub-notes with content-readiness status.]

### Rhetorical Signature Moves

[List 3-5 key rhetorical patterns this politician uses: how they frame issues, what they blame, what they credit themselves for. How does the rhetoric map to funding?]

### Biographical Facts

[Structured data: current office, district/state, party, elected, committees, website, contact]

### Sources

- [Source Name: Description](#URL-needed) (Tier X)

---

profile-status:: raw
research-status:: active
content-readiness:: raw
```

### Critical elements:
- Tags at line 1 (include party, chamber/role)
- `related::` at top with wikilinks to connected politicians and donors
- Use `###` (H3) headers for all sections — no H1, H2, or bold-text-as-headers
- Dataview table showing linked sub-notes with status
- Callouts integrated inline (`[!money]`, `[!contradiction]`)
- All sources with tier labels and clickable URLs
- Footer metadata fields required

---

### SUB-NOTE TEMPLATE

Policy notes, voting records, biographical dives — all follow this pattern:

```
#[tags] #[politician-or-donor-name] #[topic]

related: Display Policy Sub-Note Sibling Related Donor

donors: Donor - Full Name Another Donor

---

### [DESCRIPTIVE TITLE]
---

### [Section 1: Context or Timeline]

[Paragraph] [Source: Description](#URL-needed) (Tier X)

> [!money]
> [Funding pattern or donor connection flagged here]

### [Section 2: The Record or Analysis]

[Paragraph with inline sources]

> [!contradiction]
> [Gap between stated position and actual outcome]

### [Section 3: Impact or Class Analysis]

[Who benefited? What structural function did this serve for the donor class?]

### Sources

- [Source Name: Description](#URL-needed) (Tier X)

---

content-readiness:: raw
research-status:: [reference|active|archived]
```

### Critical elements:
- Tags at top (include politician name and topic)
- `related::` with wikilinks to master profile and sibling sub-notes
- `donors::` field listing relevant donor nodes
- Callouts integrated inline at point of claim
- Inline sources with tier labels (not a list at top)
- All claims traceable to a source
- Footer metadata

---

### DONOR NODE TEMPLATE

```
#donor #[name-or-acronym-tag] #[category] #[industry-or-faction]

related: Name Rival Donor

---

### [DONOR NAME OR ORG]
---

### Who They Are

[2-3 paragraphs: background, wealth/funding source, known networks, key positions held]

### What They Want

[Policy goals, structural changes, regulatory positions. What does this donor's business model require?]

### Who They Fund

| Politician | Total Donated | Policy Outcome | Notes |
|-----------|---------------|----------------|-------|
| [Name] | $X | [Policy] | [Connection] |

[Table showing top 5-10 politicians funded by this donor and what those politicians delivered]

> [!money]
> [Synthesis: total spent, geographic or partisan pattern, sectors targeted]

### What They've Gotten

[Explicit policy wins, regulatory shifts, staffing placement, legislative language. Organize chronologically or by outcome.]

### Class Analysis

[What structural function does this donor's influence serve? Who pays? Who benefits? How does this connect to the broader political economy?]

### Enemies / Opposition

[Who publicly opposes this donor? Which politicians refuse their money? Is that opposition genuine or theatrical?]

### Connected Policy Areas

[Links to relevant policy notes in the vault]

### Sources

- [Source Name: Description](#URL-needed) (Tier X)

---

research-status:: [reference|active|archived]
content-readiness:: raw
```

### Critical elements:
- Tags at top (include donor name/acronym and category)
- `related::` with wikilinks to funded politicians and policy areas
- Table showing funding relationships and outcomes
- Chronological or policy-organized "What They've Gotten" section
- Class analysis section required
- All claims sourced with tier labels
- Footer metadata

---

### PLACEHOLDER TEMPLATE

When a politician appears in donor research but doesn't yet have a full profile:

```
#politician #placeholder #[party] #[chamber-or-role]

related: Donor - Name Related Politician 

---

### _[NAME] PLACEHOLDER
---

Placeholder — Build Out Pending

This note exists as a breadcrumb. [Name] appears in the vault as [connection: e.g., "a major recipient of Koch Industries funding" or "a co-sponsor of legislation benefiting [[AIPAC - American Israel Public Affairs Committee|AIPAC]]"]. Full profile build-out is queued pending additional donor convergence.

### Key Connections Documented Elsewhere

- Appears in Donor - Name donor node with $X total received
- Co-sponsors with Politician on [legislation]
- Voted on [key issue] related to 

### Build-Out Priorities

1. [What donor research is needed?]
2. [What voting record analysis is needed?]
3. [What biographical/revolving door research is needed?]

---

content-readiness:: placeholder
research-status:: reference
profile-status:: placeholder
```

---

### WIKILINK CONVENTIONS

### Always use full filename in wikilinks:
- Correct: `[[_Elizabeth Warren Master Profile]]`
- Correct: `[[_Elizabeth Warren Master Profile|Elizabeth Warren]]` (for readable display text)
- Incorrect: `[[_Elizabeth Warren Master Profile|Elizabeth Warren]]` (short form)

**Why:** Obsidian resolves wikilinks by filename, not by path. Using full filenames ensures links survive folder reorganization and prevents conflicts.

### Donor wikilinks also use full filename:
- Correct: `[[Koch - Koch Industries]]`
- Display text for readability: `[[Koch - Koch Industries|Koch Industries]]`

### Practice:
- When linking to a politician's master profile for the first time in a note, use display text: `Name`
- Use the full filename in all wikilinks
- Dataview queries use `` syntax to reference files

---

### CUSTOM CALLOUTS

Three callouts are used inline to surface patterns. They are visually distinctive and help readers scan for key arguments.

**`[!money]`** — Donor connection or funding pattern
- Use to flag how money moved, who benefited, or what a donor relationship reveals
- Keep it concise; link to full analysis elsewhere
- Example: `> [!money]\n> Koch Industries has donated $2.3M to this politician's campaigns since 2016. The politician voted for three pieces of legislation directly benefiting Koch's petrochemical division.`

**`[!contradiction]`** — Gap between rhetoric and action
- Use to flag where a politician's stated position differs from their material position or voting record
- Include dates if available
- Example: `> [!contradiction]\n> Claimed in 2019 to support climate action (campaign press release). Voted against carbon tax bill in 2021 after receiving $500k from oil and gas donors. Supported watered-down version in 2023.`

**`[!quote]`** — Direct quotation with attribution
- Use for key quotes that reveal mindset, acknowledge contradictions, or show class analysis in action
- Always include source and date
- Example: `> [!quote]\n> "We need to support our small business donors while ensuring regulatory certainty." — Internal memo, 2022. Translation: protecting wealthy donor interests under progressive language.`

**Do not overuse.** Callouts are visually heavy; use them to surface key arguments only.

---

### DATAVIEW METADATA FIELDS

All notes include metadata fields at footer. These enable sorting, filtering, and automated audits.

### Master profiles:
- `profile-status:: raw` (or `placeholder` for placeholder notes)
- `research-status:: active` (options: `reference`, `active`, `archived`)
- `content-readiness:: raw`

### Sub-notes and donor nodes:
- `research-status:: active` (options: `reference`, `active`, `archived`)
- `content-readiness:: raw`

### Politician profiles additionally include:
- `office:: [Senate|House|Governor|Presidential|SCOTUS|Other]`
- `state:: [CA|NY|etc]` (for state-level politicians)
- `party:: [Democrat|Republican|Independent]`

### Definitions:
- `content-readiness`:
 - `raw`: Minimal content, just created — placeholder with tags and wikilinks only
 - `draft`: Some content but major gaps — has text but missing sources, formatting, or key sections
 - `developed`: Substantial content, needs polish — 50+ lines, has sources/sections, but needs citation pass or gap-filling
 - `ready`: Fully sourced, formatted, publishable — every claim cited, all wikilinks resolve, ### headers throughout
- `research-status`:
 - `active`: Currently being researched or maintained
 - `reference`: Complete, not expecting major updates
 - `archived`: Old research, kept for historical reference

---

### SOURCE STANDARDS

### API-First Rule:
**Always use API sources before manual browsing.** For donation amounts, fundraising totals, independent expenditures, federal contracts, voting records, bill sponsorship, and lobbying expenditures — use the API pipeline first. See [[API Pipeline]] for documentation, `api-toolkit.js` for reusable functions. All API calls execute via Chrome JavaScript context.

### Tier System (from Research Methodology):
- **Tier 1:** Government documents (FPPC filings, FEC filings, FEC API data, USASpending API data, Congress.gov API data, Senate LDA API data, court records, official transcripts, voting records)
- **Tier 2:** Major investigative journalism (ProPublica, The Intercept, Capital & Main, CalMatters, LA Times, Washington Post)
- **Tier 3:** Secondary/mainstream reporting (NPR, CNN, local news, Ballotpedia, encyclopedic sources)
- **Tier 4:** Partisan sources, single-source claims, unverified (America First Legal, campaign websites, opinion)

**Note:** All API-sourced data is automatically Tier 1 — it comes directly from government databases.

### Web-Ready Format:
Every source must be a working URL. This vault is built for public web publication — readers must verify every claim independently.

**API source format — link to web interface, NOT raw API endpoint:**
```
- [FEC: [Name] individual contributions ([N] results, $[total])](https://www.fec.gov/data/receipts/?two_year_transaction_period=2026&min_date=01/01/2025&max_date=12/31/2026individual-contributions/?two_year_transaction_period=2026&min_date=01/01/2025&max_date=12/31/2026?contributor_name=[name]) (Tier 1)
```

**CRITICAL:** Never use raw API endpoint URLs (e.g., `api.open.fec.gov/v1/schedules/...`) as citation links. They return JSON, not a readable web page. Always link to the corresponding web interface (fec.gov, usaspending.gov, congress.gov, lda.gov).

**Chrome source format:**
```
- [Source Name: Description](https://actual-working-url) (Tier X)
```

Examples:
```
- [FEC: Matt Taibbi individual contributions (7 results, $7,089.15 total)](https://www.fec.gov/data/receipts/?two_year_transaction_period=2026&min_date=01/01/2025&max_date=12/31/2026individual-contributions/?two_year_transaction_period=2026&min_date=01/01/2025&max_date=12/31/2026?contributor_name=taibbi%2C+matt) (Tier 1)
- [FEC Candidate: Elizabeth Warren donor summary](https://www.fec.gov/data/candidate/P00009621/) (Tier 1)
- [ProPublica: How Koch Industries profits from California's water crisis]((URL NEEDED)) (Tier 2)
```

### Verification requirements before adding a source:
- **Check API availability first** — use API data for donations, contracts, votes, lobbying
- URL must load and point to claimed content
- Use permanent/canonical URLs (not search results or redirects)
- For government databases: use API first, then link directly to filing or query results
- For news: link to original publication (not syndicated copies)
- If paywalled: include URL with `(paywalled)` note
- If URL cannot be found: keep the descriptive citation with `(URL needed)` for later completion

### Archive preservation:
- High-value sources should be captured at archive.org where possible
- Note the archive link alongside the original

---

### CUSTOM CALLOUT CSS

The vault uses two CSS snippets for styling. Custom callouts are rendered with:
- `[!money]` — styled with money/donor iconography and color
- `[!contradiction]` — styled to highlight tension/contradiction
- `[!quote]` — styled to highlight quoted text

See `gp-callouts.css` for implementation. These are not Obsidian default callouts — they require the CSS file.

---

### NOTE FORMATTING RULES

### Header structure:
- Use `###` (H3) headers for all section labels — not bold text, not H1 or H2
- Section dividers use `---` (horizontal rule) between major sections
- Ready notes must have all section headers as `###`, never `**Bold Section Labels**`
- This aligns with CLAUDE.md formatting rules (updated March 25, 2026)

### Mandatory elements on every note:
- Line 1: Tags (`#tag1 #tag2 #tag3`)
- Line 2+: `related::` field with wikilinks to connected notes
- Content with inline sources (not footnotes)
- Footer: metadata fields (e.g., `content-readiness:: ready`)

### Content rules:
- Timeline tables where donation-to-outcome sequences are documented
- Key quotes pulled into callout blocks with precise attribution
- Single-sourced claims flagged explicitly (before adding)
- Inline sources at point of claim, not bibliography at bottom
- Callouts (`[!money]`, `[!contradiction]`, `[!quote]`) integrated at relevant points
- All wikilinks use full filenames with optional display text

---

### AGENT PROMPT TEMPLATE

Use this template when spawning agents to build profiles, research donors, or expand the vault:

```
You are building research notes for an ongoing campaign finance accountability project
comparable to ProPublica, OpenSecrets, and MapLight. The project uses class analysis to
document how donors control politicians and what they've gotten in return.

Do NOT read any CLAUDE.md files in this vault.

The vault owner has authorized all research and note-building work.

### Your task:
[SPECIFIC TASK: build _[Name] Master Profile, research [Donor Name] node, expand [Sub-Note], etc.]

### Standards Reference
Read this document first for all formatting standards:
/sessions/epic-eager-planck/mnt/Obsidian Vaults/topics/Vault Maintenance/Vault Standards and Agent Instructions.md

It covers:
- File naming conventions (master profiles, sub-notes, donor nodes)
- Folder structure
- Template formats (master profile, sub-note, donor node, placeholder)
- Wikilink conventions (always use full filenames)
- Custom callout usage ([!money], [!contradiction], [!quote])
- Metadata fields (profile-status, content-readiness, research-status)
- Source standards (Tier 1-4, web-ready URLs, verification)
- Note formatting rules (### H3 headers, inline sources, tags/related at top)

### Research Methodology
Read this document for the analytical framework, data sources, and key patterns to flag:
/sessions/epic-eager-planck/mnt/Obsidian Vaults/topics/Vault Maintenance/Research Methodology and Data Sources.md

It covers:
- API pipeline (FEC, USASpending, Congress.gov, Senate LDA — use FIRST before manual browsing)
- External databases (OpenSecrets, FollowTheMoney, FPPC, ProPublica, VoteSmart, Revolving Door)
- Research layers (temporal mapping, voting records, revolving door, geographic clustering, legislative language)
- Class analysis lens (who benefits, who pays, structural function)
- Key patterns to flag (Genuine Win + Structural Limit, Villain Framing, Two-Audience Problem, Pilot Program)

### API Pipeline
Read this document for API-first data collection:
/sessions/epic-eager-planck/mnt/Obsidian Vaults/topics/Vault Maintenance/API Pipeline.md

Reusable JavaScript functions for Chrome execution:
/sessions/epic-eager-planck/mnt/Obsidian Vaults/topics/Vault Maintenance/api-toolkit.js

API-first research protocol:
1. FEC API — individual contributions, candidate totals, independent expenditures
2. Congress.gov API — member profiles, voting records, sponsored legislation
3. USASpending API — federal contracts for donor companies (run from usaspending.gov domain)
4. Senate LDA API — lobbying filings for donor companies (run from lda.gov domain)
5. ONLY use Chrome manual browsing for data NOT available via API

### Output
Create/update notes that follow the templates exactly. Ensure:
- All quantitative data sourced via API where available (FEC, USASpending, Congress.gov, Senate LDA)
- All sources are Tier 1 or 2 where possible (API data, FPPC, FEC, major journalism)
- Every URL loads and points to claimed content
- All wikilinks use full filenames
- Callouts are integrated inline, not overused
- Metadata fields are included in footer
- Content-readiness reflects actual research depth

### Key patterns to surface
Apply class analysis: Who benefits from this policy/relationship? Who pays? What structural
function does it serve for the donor class? Flag contradictions between rhetoric and material
position explicitly.
```

---

### SESSION TIMELINE CONVENTIONS

The Session Timeline is the handoff document for all future sessions. Every session ends by updating it.

### Entry format:
```
### Session [number] — [Date] (context)

Focus: [1-2 sentences on what this session prioritized]

What was built:
- [Specific notes created or substantially updated]
- [Specific research findings documented]

Files created/updated:
- `/topics/Politicians/[path]/_[Name] Master Profile.md`
- `/topics/Donors & Power Networks/[Category]/[Name].md`

Key findings:
- [Major donor-politician relationship uncovered]
- [Policy contradiction documented]
- [Structural pattern identified]

Editorial decisions:
- [Any decisions about vault direction, priority changes, or methodology refinements]

Next session priorities:
- [Specific task 1: e.g., "Build _[Name] Master Profile using Koch Industries and climate policy sub-notes"]
- [Specific task 2: e.g., "Research [Donor] funding to [State House members]"]
- [Specific task 3: e.g., "Create placeholder profiles for all [State] 2026 gubernatorial candidates"]
```

### Session numbering:
- Sequential integers: Session 1, Session 2, Session 3
- Sub-sessions (rare): use letters (Session 10a, 10b, 10c)
- Automated tasks: use 11a–11z format for scheduled task runs

### Required subsections:
- `Focus` — what was prioritized
- `What was built` — bullet list of new/updated notes
- `Files created/updated` — bullet list of absolute paths
- `Key findings` — substantive discoveries made
- `Editorial decisions` — vault direction choices made
- `Next session priorities` — queued tasks for next session

**Always update "Next session priorities"** before the session ends. This is how future sessions orient.

---

### ICON-FOLDER CONFIGURATION

The vault uses Obsidian's icon-folder plugin for visual navigation:

- **Politicians folder** → `LiLandmark` icon
- **Donors & Power Networks folder** → `LiDollarSign` icon
- **Stories folder** → `LiNewspaper` icon
- **Any file with "Master Profile" in name** → `LiCrosshair` icon (colored red, `#b84a4a`)

These are set in the icon-folder plugin settings. Maintain consistency as new folders and profiles are added.

---

### OBSIDIAN THEME AND PLUGINS

**Theme:** Minimal (Obsidian community theme) — clean, text-focused interface

### CSS snippets:
- `gp-base.css` — base styling (dark text, muted red H3s, warm gold wikilinks, square corners)
- `gp-callouts.css` — custom callout styling for `[!money]`, `[!contradiction]`, `[!quote]`

### Required plugins:
- `dataview` — used for dynamic tables showing sub-notes, funding relationships
- `banners` — used for visual header images on some profiles
- `callout-manager` — enables custom callout styling
- `style-settings` — allows CSS customization
- `icon-folder` — enables folder and file icons

Ensure all plugins are installed and enabled before building or updating notes.

---

### QUICK REFERENCE CHECKLIST

Use this when building or updating notes:

### Before creating a master profile:
- [ ] Politician has a folder in correct party/chamber/role path
- [ ] **FEC API queried** — candidate totals, top donors, independent expenditures
- [ ] **Congress.gov API queried** — member profile, voting record, sponsored legislation
- [ ] Research completed: top 5-10 donors identified (API + OpenSecrets)
- [ ] Voting record pulled via API (if legislator)
- [ ] Class analysis angle identified
- [ ] Core contradiction documented with dates

### Before creating a donor node:
- [ ] At least 3-5 politicians funded identified
- [ ] **FEC API queried** — donor's individual contributions across all recipients
- [ ] **USASpending API checked** — federal contracts for donor's company
- [ ] **Senate LDA API checked** — lobbying filings for donor's company
- [ ] Policy outcomes documented for top relationships
- [ ] Class analysis written (what structural function?)
- [ ] Sources are Tier 1-2 where possible (API data = automatic Tier 1)

### Before publishing any note:
- [ ] All sources have working URLs
- [ ] All wikilinks use full filenames
- [ ] Tags included at top
- [ ] `related::` field populated
- [ ] Inline sources at point of claim with Tier labels
- [ ] Metadata fields included in footer
- [ ] Callouts are integrated (not overused)
- [ ] Content-readiness matches actual research depth

### At session end:
- [ ] Session Timeline updated with new entry
- [ ] All new files listed in Files created/updated
- [ ] Key findings documented
- [ ] Next session priorities queued and specific

---

research-status:: reference
content-readiness:: ready