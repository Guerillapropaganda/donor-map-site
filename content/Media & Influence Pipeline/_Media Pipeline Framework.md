---
title: "Media & Influence Pipeline Framework"
type: methodology
content-readiness: ready
last-updated: 2026-04-08
source-tier: null
parent: null
related: "[[Cross-Politician Contradiction Map - The Both-Sides Illusion With Receipts]] · [[Research Methodology and Data Sources]] · [[_VAULT_INDEX]] · [[Think Tank & Policy Infrastructure Framework]] · [[Lobbying Firms & K Street Framework]]"
---

#media-pipeline #methodology #framework #class-analysis

---

### Purpose

This section tracks **media personalities who receive money and use their platforms to push policy outcomes** — the propaganda arm of the donor-to-policy pipeline. The Donor Map tracks how money flows from donors to politicians to policy. The Media & Influence Pipeline tracks the parallel flow: how money flows from donors (and platforms, sponsors, foreign governments) to media personalities to public opinion to political cover.

Same analytical framework. Same source standards. Same class analysis lens. Different delivery mechanism.

> [!money]
> Politicians deliver votes. Media personalities deliver consent. The same donor class funds both. This section maps the second pipeline.

---

### Isolation Rules

### This section is architecturally separate from the main Donor Map vault.

1. **One-way wikilinks only.** Media files link TO donor nodes in `Donors & Power Networks/`. Main vault files (politicians, donor nodes, stories) NEVER link back to media files. If this section is deleted, zero main vault files break.
2. **Separate YAML type.** All media profiles use `type: media-profile`. This excludes them from all existing dataview queries, vault audits, and content-readiness statistics.
3. **Excluded from Obsidian Publish** until explicitly added to the Publication Manifest.
4. **Separate index.** The `_Media Pipeline Index.md` tracks these files independently. The main `_VAULT_INDEX.md` references this section as a block, not individual files.
5. **Separate content-readiness stats.** The vault's 96%+ ready number is calculated from `Politicians/`, `Donors & Power Networks/`, and `Stories/` only. Media pipeline files have their own readiness tracking.
6. **Clean deletion.** Delete `topics/Media & Influence Pipeline/` and the vault returns to its pre-existing state with zero broken links, zero missing references, zero stat changes.

---

### Folder Structure

```
Media & Influence Pipeline/
├── _Media Pipeline Framework.md     ← This file (methodology)
├── _Media Pipeline Index.md         ← File manifest with statuses
├── Right/
│   ├── Tucker Carlson.md
│   ├── Tim Pool.md
│   ├── Steven Crowder.md
│   ├── Ben Shapiro.md
│   └── Charlie Kirk.md
├── Left/
│   ├── Ethan Klein.md
│   ├── Cenk Uygur.md
│   ├── Hasan Piker.md
│   ├── Pod Save America.md
│   └── [TBD].md
└── Centrist/
    ├── Joe Rogan.md
    ├── Megyn Kelly.md
    ├── Bill Maher.md
    ├── Lex Fridman.md
    └── [TBD].md
```

**Naming convention:** Plain name, no prefix. `Tucker Carlson.md`, not `_Tucker Carlson Master Profile.md`. These are not master profiles — they are media influence profiles. The naming distinction keeps them visually and structurally separate from the politician database.

---

### YAML Schema

```yaml
---
title: "Human-readable name"
type: media-profile
content-readiness: raw | draft | developed | ready
last-updated: YYYY-MM-DD
source-tier: 1 | 2 | 3 | 4 | null
parent: null
category: right | left | centrist
platform: youtube | podcast | substack | twitter | rumble | multi-platform
---
```

Additional fields beyond the standard vault schema:
- `category`: Political lane (right, left, centrist). Centrist is an analytical category, not an endorsement — the analysis will interrogate what "centrist" actually means in funding terms.
- `platform`: Primary distribution platform. Most will be `multi-platform`.

---

### Profile Anatomy

Every media profile follows this structure:

1. **Tags** — `#media-pipeline` required on all, plus `#right` / `#left` / `#centrist`, topic tags
2. **`related:`** — Wikilinks to donor nodes in `Donors & Power Networks/` that fund this personality. NEVER link to politician master profiles directly.
3. **`### Who They Are`** — Platform, audience size, content type, reach metrics
4. **`### The Funding Model`** — Where the money comes from. Sponsorships, platform ad revenue, subscription revenue, dark money, corporate partners, foreign money. Dollar amounts where findable.
5. **`### Who Funds Them`** — Specific donors, sponsors, corporate backers, platform deals. This is the donor class map equivalent. Wikilink to donor nodes where they exist.
6. **`### What They Push`** — Policy positions and narratives that serve funder interests. Map specific content to specific funder interests the way the main vault maps votes to donations.
7. **`### The Audience Capture Model`** — How the funding model shapes content. Platform incentives, sponsor constraints, audience feedback loops. This replaces the politician's "Two-Audience Problem" pattern.
8. **`### What Their Funders Got`** — Measurable outcomes: narrative shifts, political cover provided, policy positions normalized, candidates boosted/destroyed. The ROI section.
9. **`### Class Analysis`** — Who benefits from this person's platform existing? What structural function do they serve for the donor class? How does their audience capture serve capital?
10. **`### Capture Architecture`** — 3-5 line structural summary mapping platform funder, income dependency, and editorial red lines.
11. **`### Sources`** — Same format as main vault: `[Source: Description](URL) (Tier X)`. FEC individual contributions cite the FEC website receipts search URL.

**FEC data requirement:** Every U.S.-eligible media profile must include a standardized `### FEC Record` section. Use `fecDonorLookup()` from `api-toolkit.js` for research; cite the FEC website receipts URL for reader verification. All FEC data is also aggregated in the **FEC Filings — Consolidated Media Pipeline Table** in [[_Media Pipeline Index]] — update the table when adding or modifying any profile's FEC data.

### `### FEC Record` section spec — placement: after `### The Funding Model`, before `### Who Funds Them`:

### For profiles with contributions (table format):
```
### FEC Record

**Total:** $X,XXX | **Contributions:** N | **Party split:** X% Democratic, Y% Republican
**API-verified:** YYYY-MM-DD

| Date | Recipient | Amount | Party | Employer at Filing |
|------|-----------|--------|-------|--------------------|
| YYYY-MM-DD | Committee Name | $X,XXX | DEM/REP | Employer |

> [!money]
> [1-3 sentence analytical read — what the FEC record reveals about this person's actual political commitments vs. on-air positioning]

- [FEC: [Name] individual contributions (N results, $X,XXX)](https://www.fec.gov/data/receipts/?contributor_name=[NAME]) (Tier 1)
```

### For profiles with $0 confirmed (always explain what the API returned):
```
### FEC Record

**Total:** $0 | **Contributions:** 0 | **API-verified:** YYYY-MM-DD

No FEC individual contributions found. The FEC API returns [N] results for "[name]" — [brief explanation of who those results belong to and why none match]. [1 sentence analytical read.]

- [FEC: [Name] individual contributions ([N] results)](https://www.fec.gov/data/receipts/?contributor_name=[NAME]) (Tier 1)
```

**Rule: Always show your work on disambiguation.** When the API returns results for a common name but none belong to the subject, say so — name the count, explain why they don't match (wrong state, wrong employer, wrong occupation), and confirm $0 for the actual person. Silence is not the same as absence. Readers clicking the API link will see those results and need to understand why we're reporting $0.

### For non-U.S. citizens:
```
### FEC Record

**Status:** N/A — [nationality] citizen; ineligible for U.S. federal campaign contributions.
```

### Multi-host profiles (Breaking Points, Pod Save America, etc.):

When a profile covers an organization with multiple hosts or principals, give each person their own `####` sub-section inside `### FEC Record`. Each sub-section gets:
- Individual summary line (total, count, party split, API-verified date)
- Individual table (or $0/$N/A note)
- Individual analytical callout
- Individual API citation link

Structure:
```
### FEC Record

#### [Host 1 Name]

**Total:** $X,XXX | **Contributions:** N | **Party split:** ...
**API-verified:** YYYY-MM-DD

| Date | Recipient | Amount | Party | Employer at Filing |
|------|-----------|--------|-------|--------------------|

> [!money]
> [analytical read for this host]

- [FEC API link] (Tier 1)

#### [Host 2 Name]

**Total:** $0 | **Contributions:** 0 | **API-verified:** YYYY-MM-DD

No FEC individual contributions found. [disambiguation note]

- [FEC API link] (Tier 1)
```

The consolidated FEC table in [[_Media Pipeline Index]] lists multi-host profiles once per host (e.g., Breaking Points appears twice — once for Ball, once for Enjeti).

---

### Analytical Patterns

The main vault's patterns apply here, plus media-specific additions:

| Pattern | Description |
|---------|-------------|
| **Audience Capture** | Content shifts to match what the funding model rewards, not what the audience needs |
| **Platform Dependency** | Revenue tied to a platform whose algorithm shapes content toward engagement over accuracy |
| **Sponsor Veto** | Content boundaries set by advertiser/sponsor tolerance, not editorial judgment |
| **Dark Money Laundering** | Foreign or undisclosed money flowing through shell companies to media personalities (Tim Pool/Tenet Media model) |
| **Revolving Door (Media)** | Movement between political staff, lobbying, and media (Pod Save America model) |
| **Both-Sides Illusion (Media)** | Left and right media personalities funded by overlapping corporate sponsors while performing opposition |
| **Independence Theater** | "Independent" media personality whose funding model is actually corporate or dark money dependent |
| **Centrist Laundering** | "Centrist" or "nonpartisan" branding that obscures a funding model aligned with one side's donor class |

---

### Temporal Mapping Tables

Media profiles use **Format 3** (narrative timeline) adapted for media context:

`### Timeline`

`| Date | Event | Key Players | Amount | Significance |`

Events include: platform launches, sponsor deals, content shifts, advertiser boycotts, funding revelations, audience growth inflection points, political endorsements or attacks.

---

### Source Tier System

Same as main vault. No changes.

| Tier | Description |
|------|-------------|
| **Tier 1** | FEC filings, DOJ indictments, court documents, SEC filings, tax records, platform financial disclosures |
| **Tier 2** | Major investigative journalism (ProPublica, NYT, WaPo, The Intercept, etc.) |
| **Tier 3** | Secondary reporting, named sources, trade press (Variety, Hollywood Reporter, Tubefilter, etc.) |
| **Tier 4** | Partisan sources, self-reported data, leaked documents without independent verification |

---

### Connection Model

The media pipeline connects to the main vault ONLY through donor nodes:

```
[Media Profile] --wikilink--> [Donor Node] <--wikilink-- [Politician Profile]
```

Example: `Tucker Carlson.md` links to `[[Koch Network - Charles Koch]]`. The Koch Network node already links to dozens of politician profiles. The graph view shows Tucker connected to the same donor cluster as the politicians — without any direct media-to-politician links.

This means:
- Deleting the media section severs zero main vault connections
- The donor nodes gain richer context (they fund BOTH politicians and propaganda) without being modified
- The graph view naturally produces two clusters bridged by donor nodes

---

### The "Centrist" Question

The `centrist` category is an analytical hypothesis, not an accepted label. The working thesis:

> "Centrist" in media funding terms typically means: corporate-sponsored, advertiser-dependent, and structurally aligned with the donor class that benefits from political inaction. The "both sides" framing serves capital by treating structural inequality as a matter of reasonable disagreement rather than a policy choice made by identifiable donors.

Each centrist profile will test this thesis against the actual funding data. If a personality's funding model is genuinely independent of donor class interests, the analysis will say so. If "centrist" is functioning as a branding strategy for corporate-aligned content, the receipts will show it.

---

### Build Priority

### Phase 1 — Initial 15 profiles (draft quality):

| # | Name | Category | Why First |
|---|------|----------|-----------|
| 1 | Tim Pool | Right | DOJ indictment, clearest dark money case, Tenet Media receipts |
| 2 | Tucker Carlson | Right | Fox → independent transition, funding model shift, Putin interview |
| 3 | Steven Crowder | Right | Daily Wire contract leak, Wilks brothers connection |
| 4 | Ben Shapiro | Right | Daily Wire founder, Wilks brothers, political action expansion |
| 5 | Charlie Kirk | Right | TPUSA donor network, mega-donor pipeline to youth politics |
| 6 | Ethan Klein | Left | Sponsor-driven model, platform dependency, audience capture |
| 7 | Cenk Uygur | Left | TYT funding history (Buddy Roemer, Jeffrey Katzenberg), 2024 presidential run |
| 8 | Hasan Piker | Left | Twitch/Amazon revenue model, socialist content on corporate platform |
| 9 | Pod Save America | Left | Crooked Media, ex-Obama staff revolving door, corporate sponsors |
| 10 | [TBD — 5th left] | Left | Candidates: Sam Seder, Briahna Joy Gray, David Pakman |
| 11 | Joe Rogan | Centrist | Spotify $250M deal, UFC/Dana White connection, political influence without political identity |
| 12 | Megyn Kelly | Centrist | Fox → NBC → independent, funding model transitions |
| 13 | Bill Maher | Centrist | HBO corporate backing, donor-class comedy, "real talk" branding |
| 14 | Lex Fridman | Centrist | Tech billionaire interview pipeline, MIT branding, sponsor model |
| 15 | [TBD — 5th centrist] | Centrist | Candidates: Chris Cuomo, Glenn Greenwald, Russell Brand |

**Phase 2:** Cross-media comparison pieces (same format as Trump-Newsom crossover but for media pairs)
**Phase 3:** Integration stories mapping donor → media → politician → policy pipelines end-to-end

---

### Quality Gates

Same as main vault. A media profile cannot be promoted to `ready` without:
- Every source URL Chrome-verified
- All wikilinks to donor nodes verified as resolving
- Source tier labels on every citation
- At least one `> [!money]` callout with receipts
- Class analysis section present
- Timeline table with minimum 6 rows
- FEC individual contribution data included (even if $0; N/A for non-U.S. citizens)
- FEC data added to the consolidated FEC Filings table in [[_Media Pipeline Index]]

---

### Deletion Protocol

If this section doesn't work out:

1. Delete `topics/Media & Influence Pipeline/` (one folder)
2. Remove the Media Pipeline section from `_VAULT_INDEX.md` (one edit)
3. Done. Zero main vault files affected. Zero broken links. Zero stat changes.

