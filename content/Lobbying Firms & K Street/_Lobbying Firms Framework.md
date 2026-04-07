---
title: "Lobbying Firms & K Street Framework"
type: methodology
content-readiness: ready
last-updated: 2026-03-25
source-tier: null
parent: null
related: "[[_Think Tank Framework]] · [[_Media Pipeline Framework]] · [[Research Methodology and Data Sources]] · [[_VAULT_INDEX]]"
---

#lobbying #k-street #methodology #framework #class-analysis


---

### Purpose

This section tracks **lobbying firms — the intermediaries who convert donor money into legislative access** — the plumbing of the donor-to-policy pipeline.

The Donor Map tracks: Donor → Politician → Policy.
The Media Pipeline tracks: Donor → Media → Public Consent.
The Think Tank section tracks: Donor → Think Tank → Policy Paper → Legislation.
This section tracks: **Donor → Lobbying Firm → Direct Legislative Access → Policy Outcome.**

Lobbying firms are the connective tissue. They employ former staffers who lobby their old bosses. They bundle contributions. They draft bill language. They arrange meetings. They are the literal human infrastructure of legalized corruption.

> [!money]
> In 2024, the top 20 lobbying firms billed over $2 billion combined. Their clients include every major donor node in this vault. Their employees include former chiefs of staff, committee directors, and agency heads from both parties. This section maps the firms, their clients, their revolving door hires, and what they deliver.

---

### Isolation Rules

### Same architecture as Media Pipeline and Think Tank sections — fully separate from the main Donor Map vault.

1. **One-way wikilinks only.** Lobbying firm files link TO donor nodes in `Donors & Power Networks/`. Main vault files NEVER link back. Clean deletion with zero breakage.
2. **Separate YAML type.** All files use `type: lobbying-firm`. Excluded from main vault stats.
3. **Excluded from Obsidian Publish** until explicitly added.
4. **Separate index.** `_Lobbying Firms Index.md` tracks independently.
5. **Clean deletion.** Delete `topics/Lobbying Firms & K Street/` — vault returns to pre-existing state.

---

### Folder Structure

```
Lobbying Firms & K Street/
├── _Lobbying Firms Framework.md    ← This file
├── _Lobbying Firms Index.md        ← File manifest
├── Akin Gump Strauss Hauer & Feld.md
├── Brownstein Hyatt Farber Schreck.md
├── Squire Patton Boggs.md
├── Capitol Counsel.md
├── BGR Group.md
├── Holland & Knight.md
├── K&L Gates.md
├── Invariant.md
├── Thorn Run Partners.md
└── Cornerstone Government Affairs.md
```

**Flat structure** — no subfolders by political orientation. Lobbying firms serve both parties simultaneously. That's the point. Sorting them by party would obscure the analytical finding.

---

### YAML Schema

```yaml
---
title: "Firm Name"
type: lobbying-firm
content-readiness: raw | draft | developed | ready
last-updated: YYYY-MM-DD
source-tier: 1 | 2 | 3 | 4 | null
parent: null
annual-revenue: "$XXM" | null
lobbyist-count: XX | null
revolving-door-pct: "XX%" | null
---
```

Additional fields:
- `annual-revenue`: Total lobbying revenue (from OpenSecrets)
- `lobbyist-count`: Number of registered lobbyists
- `revolving-door-pct`: Percentage of lobbyists who are former government employees (OpenSecrets Revolving Door data)

---

### Profile Anatomy

1. **Tags** — `#lobbying` `#k-street` required, plus client sector tags
2. **`related:`** — Wikilinks to donor nodes in `Donors & Power Networks/` that are clients. NEVER link to politician profiles directly.
3. **`### Who They Are`** — Founded when, headquarters, revenue, headcount, market position
4. **`### Client List`** — Top clients by billing with dollar amounts. Wikilink to donor nodes where they exist. Organize by sector to show diversification.
5. **`### The Revolving Door`** — Former government employees now lobbying. For each key hire: Name, Former Position (which politician/agency), Current Role, What They Lobby On. This is the core analytical section.
6. **`### What They Deliver`** — Specific legislative outcomes traceable to firm lobbying. Bill provisions, regulatory decisions, earmarks, exemptions.
7. **`### The Bipartisan Model`** — How the firm maintains access to both parties simultaneously. Which partners handle Republican relationships? Which handle Democratic? How does the client list span the aisle?
8. **`### Billing vs. Outcomes`** — ROI analysis. What did clients pay, and what policy outcomes can be traced to the lobbying?
9. **`### Class Analysis`** — What structural function does this firm serve? How does professionalizing corruption make it invisible?
10. **`### Sources`** — `[Source: Description](URL) (Tier X)`

---

### Analytical Patterns

| Pattern | Description |
|---------|-------------|
| **Revolving Door Hub** | Firm whose primary value is employing former staffers who lobby their old offices |
| **Bipartisan Access Machine** | Firm that maintains active relationships with both party leaderships simultaneously |
| **Bill Language Authorship** | Cases where lobbying firm drafted legislative language that appeared verbatim in enacted legislation |
| **Bundling Operation** | Firm whose lobbyists serve as campaign contribution bundlers for the politicians they lobby |
| **Regulatory Shuttle** | Lobbyists who move between the firm, regulatory agencies, and back — carrying client priorities both ways |
| **Client Conflict Laundering** | Firm representing competing clients (e.g., pharma company AND health insurer) — extracting fees from both sides of the same policy fight |

---

### Key Data Sources

| Source | What It Provides | Tier |
|--------|-----------------|------|
| **OpenSecrets Lobbying Database** | Firm revenue, client lists, issue areas, lobbyist registrations | Tier 1 |
| **Senate Lobbying Disclosure Act filings** | Quarterly disclosure reports, specific lobbying contacts | Tier 1 |
| **OpenSecrets Revolving Door** | Former government employees registered as lobbyists, with government positions | Tier 1 |
| **House/Senate financial disclosures** | Spousal employment at lobbying firms (indirect influence) | Tier 1 |
| **ProPublica** | Investigative reporting on lobbying influence | Tier 2 |
| **The Intercept / Revolving Door Project** | Revolving door tracking, lobbying investigations | Tier 2 |

---

### Temporal Mapping Tables

Lobbying firm profiles use **Format 2** (donor node format):

`### Lobbying-to-Policy Timeline`

`| Date | Recipient/Target | Amount | Policy Return | Time Gap |`

Where Recipient/Target = the politician, committee, or agency lobbied, Amount = lobbying expenditure or client billing, and Policy Return = the specific legislative or regulatory outcome.

---

### Connection Model

```
[Lobbying Firm] --wikilink--> [Donor Node (client)] <--wikilink-- [Politician Profile]
```

The lobbying firm profiles connect to donor nodes as CLIENTS of the firm. The donor nodes already connect to politician profiles. Graph view shows: lobbying firms on one side, politicians on the other, donor nodes in the middle paying both.

---

### Build Priority

### Phase 1 — Top 10 firms by lobbying revenue:

| # | Firm | Why First |
|---|------|-----------|
| 1 | Akin Gump Strauss Hauer & Feld | #1 by revenue (~$53M/yr), bipartisan, pharma/defense/finance clients |
| 2 | Brownstein Hyatt Farber Schreck | Top 5, energy/real estate/cannabis, heavy revolving door |
| 3 | Squire Patton Boggs | Top 5, global firm, defense/trade clients |
| 4 | Capitol Counsel | Midsize but extremely high revolving door percentage |
| 5 | BGR Group | Republican-leaning, Haley Barbour founded, foreign government clients |
| 6 | Holland & Knight | Top 10, bipartisan, healthcare/telecom/defense |
| 7 | K&L Gates | Top 10, global, energy/finance |
| 8 | Invariant | Newer firm, tech industry focus, high-profile Silicon Valley clients |
| 9 | Thorn Run Partners | Democratic-leaning, labor/healthcare |
| 10 | Cornerstone Government Affairs | Energy/agriculture, bipartisan |

**Phase 2:** Additional firms + cross-firm analysis (which firms share clients, compete for same politicians)
**Phase 3:** Lobbying-to-legislation forensics (matching bill language to lobbying firm output)

---

### Quality Gates

Identical to main vault:
- Every source URL Chrome-verified
- All wikilinks to donor nodes verified
- Source tier labels on every citation
- At least one `> [!money]` callout
- Class analysis present
- Timeline table with minimum 6 rows
- OpenSecrets lobbying data cited where available

---

### Deletion Protocol

1. Delete `topics/Lobbying Firms & K Street/` (one folder)
2. Remove the Lobbying Firms section from `_VAULT_INDEX.md` (one edit)
3. Done.

content-readiness:: ready
