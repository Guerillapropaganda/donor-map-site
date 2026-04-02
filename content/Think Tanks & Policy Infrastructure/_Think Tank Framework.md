---
title: "Think Tank & Policy Infrastructure Framework"
type: methodology
content-readiness: ready
last-updated: 2026-03-25
source-tier: null
parent: null
---

#think-tank #methodology #framework #class-analysis

related: [[_Media Pipeline Framework]] · [[Cross-Politician Contradiction Map - The Both-Sides Illusion With Receipts]] · [[Research Methodology and Data Sources]] · [[_VAULT_INDEX]]

---

### Purpose

This section tracks **think tanks and policy organizations that convert donor money into intellectual cover for legislation** — the idea-laundering arm of the donor-to-policy pipeline.

The Donor Map tracks: Donor → Politician → Policy.
The Media Pipeline tracks: Donor → Media → Public Consent.
This section tracks: **Donor → Think Tank → Policy Paper → Politician Cites Paper → Policy Enacted.**

Politicians rarely invent policy. They cite research. That research is funded by the same donors who benefit from the policy. This section maps who paid for the idea that became the law.

> [!money]
> Heritage Foundation wrote Project 2025. The Federalist Society picks the judges. Brookings provides centrist cover for Wall Street deregulation. The ideas aren't neutral — they're purchased. This section maps the purchase orders.

---

### Isolation Rules

**Same architecture as the Media & Influence Pipeline — fully separate from the main Donor Map vault.**

1. **One-way wikilinks only.** Think tank files link TO donor nodes in `Donors & Power Networks/`. Main vault files (politicians, donor nodes, stories) NEVER link back to think tank files. If this section is deleted, zero main vault files break.
2. **Separate YAML type.** All think tank profiles use `type: think-tank`. Excluded from all existing dataview queries, vault audits, and content-readiness statistics.
3. **Excluded from Obsidian Publish** until explicitly added to the Publication Manifest.
4. **Separate index.** `_Think Tank Index.md` tracks these files independently. The main `_VAULT_INDEX.md` references this section as a block.
5. **Separate content-readiness stats.** Main vault percentages exclude think-tank files entirely.
6. **Clean deletion.** Delete `topics/Think Tanks & Policy Infrastructure/` and the vault returns to its pre-existing state with zero broken links.

---

### Folder Structure

```
Think Tanks & Policy Infrastructure/
├── _Think Tank Framework.md        ← This file (methodology)
├── _Think Tank Index.md            ← File manifest with statuses
├── Conservative/
│   ├── Heritage Foundation.md
│   ├── Federalist Society.md
│   ├── Cato Institute.md
│   ├── American Enterprise Institute.md
│   └── Manhattan Institute.md
├── Liberal/
│   ├── Center for American Progress.md
│   ├── Brookings Institution.md
│   ├── Economic Policy Institute.md
│   ├── Roosevelt Institute.md
│   └── [TBD].md
└── Centrist/
    ├── Council on Foreign Relations.md
    ├── RAND Corporation.md
    ├── Bipartisan Policy Center.md
    └── [TBD slots].md
```

**Naming convention:** Plain institutional name. `Heritage Foundation.md`, not `_Heritage Foundation Master Profile.md`. These are not politician profiles — the naming distinction maintains structural separation.

---

### YAML Schema

```yaml
---
title: "Institution Name"
type: think-tank
content-readiness: raw | draft | developed | ready
last-updated: YYYY-MM-DD
source-tier: 1 | 2 | 3 | 4 | null
parent: null
category: conservative | liberal | centrist
tax-status: 501c3 | 501c4 | hybrid | for-profit
---
```

Additional fields:
- `category`: Political orientation. Same caveat as media pipeline — "centrist" is an analytical category to be tested against funding data, not an endorsement.
- `tax-status`: IRS classification matters because it determines disclosure requirements. 501(c)(3) must disclose donors to the IRS (but not publicly). 501(c)(4) has minimal disclosure. This shapes how dark the money is.

---

### Profile Anatomy

1. **Tags** — `#think-tank` required on all, plus `#conservative` / `#liberal` / `#centrist`, topic tags
2. **`related:`** — Wikilinks to donor nodes in `Donors & Power Networks/` ONLY. Never link to politician profiles directly.
3. **`### Who They Are`** — Founded when, by whom, stated mission, annual budget, staff size, physical location, tax status
4. **`### Who Funds Them`** — Specific donors with dollar amounts. IRS 990 data, donor acknowledgment pages, investigative reporting. Wikilink to existing donor nodes. Flag anonymous/dark money funding.
5. **`### What They Produce`** — Key policy papers, model legislation, judicial nominations lists, regulatory frameworks. Link specific outputs to specific policy outcomes.
6. **`### The Policy Pipeline`** — How their research becomes law. Which politicians cite their work? Which staffers rotate between the think tank and government? Which legislative provisions mirror their recommendations word-for-word?
7. **`### The Revolving Door`** — Staff movement between the think tank, government positions, and donor industries. Names, dates, positions.
8. **`### What Their Funders Got`** — Measurable policy outcomes traceable to think tank research. ROI calculation where possible.
9. **`### Class Analysis`** — What structural function does this institution serve? Who benefits from framing donor-serving policy as "independent research"?
10. **`### Sources`** — Same format: `[Source: Description](URL) (Tier X)`

---

### Analytical Patterns

Main vault patterns apply, plus think-tank-specific additions:

| Pattern | Description |
|---------|-------------|
| **Idea Laundering** | Donor funds research → research supports donor's preferred policy → politician cites "independent research" to justify vote |
| **Model Legislation Pipeline** | Think tank drafts bill language → ALEC or similar distributes → state legislators introduce verbatim |
| **Revolving Door (Policy)** | Staff moves between think tank, regulatory agency, and lobbying — carrying the same policy agenda across all three |
| **Bipartisan Credibility Shield** | Think tank maintains token bipartisan advisory board to claim independence while funding comes overwhelmingly from one side |
| **Academic Capture** | University-adjacent think tanks using academic branding to legitimize donor-funded research |
| **Regulatory Capture Pipeline** | Think tank trains future regulators who then implement the think tank's (i.e., the donors') preferred regulatory framework |

---

### Temporal Mapping Tables

Think tank profiles use **Format 2** (donor node format) adapted for institutional context:

`### Donation-to-Policy Timeline`

`| Date | Recipient/Target | Amount | Policy Return | Time Gap |`

Where Recipient/Target = the politician, agency, or legislative body that received the think tank's output, and Policy Return = the specific policy outcome.

---

### Source Tier System

Same as main vault. No changes.

**Additional source types specific to think tanks:**
- **Tier 1:** IRS 990 filings (ProPublica Nonprofit Explorer), Congressional testimony transcripts, government agency citations of think tank research
- **Tier 2:** Investigative reporting on think tank funding (ProPublica, The Intercept, New Yorker "Dark Money" reporting)
- **Tier 3:** Think tank's own publications (useful for mapping output, but treat self-reported impact claims as Tier 4)

---

### Connection Model

Same architecture as Media Pipeline:

```
[Think Tank Profile] --wikilink--> [Donor Node] <--wikilink-- [Politician Profile]
```

Example: `Heritage Foundation.md` links to `[[Koch Network - Charles Koch]]` and `[[Leonard Leo]]`. Those donor nodes already link to politician profiles. The graph view shows the think tank cluster connected to the same donor nodes as the political cluster — three clusters bridged by donors.

---

### The "Centrist" Question

Same analytical approach as the media pipeline. "Centrist" think tanks will be tested against their funding. If Brookings receives significant funding from Wall Street and produces research favorable to financial deregulation, the analysis says so regardless of the "centrist" label. If the Council on Foreign Relations' defense policy recommendations align with defense contractor donor interests, the receipts speak.

---

### Build Priority

**Phase 1 — Initial 12-15 profiles:**

| # | Name | Category | Why First |
|---|------|----------|-----------|
| 1 | Heritage Foundation | Conservative | Project 2025, largest conservative policy factory, massive donor documentation |
| 2 | Federalist Society | Conservative | Judicial nomination pipeline, Leonard Leo connection already in vault |
| 3 | Center for American Progress | Liberal | Podesta-founded, corporate Democratic policy shop |
| 4 | Brookings Institution | Centrist | Wall Street-funded "independent" research, largest think tank by budget |
| 5 | Cato Institute | Conservative | Koch-founded, libertarian policy factory |
| 6 | American Enterprise Institute | Conservative | Neoconservative policy, defense contractor connections |
| 7 | Manhattan Institute | Conservative | NYC-based, housing/criminal justice policy |
| 8 | Economic Policy Institute | Liberal | Union-funded counter to corporate think tanks |
| 9 | Council on Foreign Relations | Centrist | Foreign policy establishment, defense/energy donor overlap |
| 10 | RAND Corporation | Centrist | Defense-funded policy research, government contract model |

**Phase 2:** Additional profiles + cross-think-tank comparison pieces
**Phase 3:** Model legislation tracking (think tank paper → bill language comparison)

---

### Quality Gates

Identical to main vault. A think tank profile cannot be promoted to `ready` without:
- Every source URL Chrome-verified
- All wikilinks to donor nodes verified as resolving
- Source tier labels on every citation
- At least one `> [!money]` callout with receipts
- Class analysis section present
- Timeline table with minimum 6 rows
- IRS 990 data cited where available (ProPublica Nonprofit Explorer)

---

### Deletion Protocol

1. Delete `topics/Think Tanks & Policy Infrastructure/` (one folder)
2. Remove the Think Tank section from `_VAULT_INDEX.md` (one edit)
3. Done. Zero main vault files affected.

content-readiness:: ready
