---
title: "Research Methodology and Data Sources"
type: methodology
content-readiness: draft
last-updated: 2026-04-13
source-tier: 1
parent: null
related: "[[Vault Standards and Agent Instructions]] · [[API Pipeline — Data Collection Layer]] · [[Think Tank & Policy Infrastructure Framework]] · [[Voting Record Layer - When Donors Vote Through Their Politicians]] · [[Media & Influence Pipeline Framework]] · [[Lobbying Firms & K Street Framework]] · [[Session Timeline]] · [[Quality Standards]] · [[API Pipeline]] · [[Vault Integrity Audit - Methodology and Tracker]] · [[Methodology Compliance Audit - March 2026]] · [[Sources Master Node]] · [[Analytical Quality Audit - March 2026]] · [[Intra-Republican Contradiction Map]] · [[Intra-Democratic Contradiction Map - The Progressive vs Moderate Illusion]] · [[Geographic Donor Clustering - Where the Money Actually Comes From]] · [[Cross-Politician Contradiction Map - The Both-Sides Illusion With Receipts]] · [[How Money Captures Media — The Donor Map Media Pipeline]]"
source-types:
  - LDA
---
#methodology #research #data-sources #class-analysis #vault-maintenance #analysis

---

### RESEARCH METHODOLOGY AND DATA SOURCES

This document defines the analytical framework, research layers, and external data sources unique to the Donor Map Database. It does NOT restate rules that live in other documents.

**For source verification and citation format:** See [[Quality Standards]]
**For API endpoints and query patterns:** See [[API Pipeline]]
**For pipeline report integration (FEC, Congress, URL check auto-sync):** See [[API Pipeline]] → "Pipeline Reports Integration Protocol"
**For vault structure, YAML schema, and note formatting:** See CLAUDE.md
**For source tier definitions:** See CLAUDE.md (Source Tier System section)

---

### EXTERNAL DATABASES — SECONDARY SOURCES (USE WHEN API UNAVAILABLE)

- **OpenSecrets** (opensecrets.org) — federal campaign finance, PAC money, congressional donations. Use for federal-level politicians and any donor with federal exposure. Note: FEC API now provides the underlying raw data directly — use API first, OpenSecrets for synthesis and visualization.

- **FollowTheMoney.org** — state-level campaign finance. Primary source for California politicians and donors. API available but not yet tested — use web interface as fallback.

- **FPPC** (fppc.ca.gov) — California state filing system. Primary source, raw data. Always Tier 1. No API — Chrome only.

- **ProPublica Nonprofit Explorer** — nonprofit funding flows. Use for Tides Foundation, think tanks, any 501c3 node.

- **VoteSmart** (votesmart.org) — voting records and interest group ratings across all government levels.

- **OpenSecrets Revolving Door tracker** — staff moving between political offices, regulatory agencies, and industries.

- **Senate LDA filings** (lda.gov) — lobbying disclosure quarterly filings. Primary source for lobbying expenditures, client lists, registrant data. Tier 1. API available — see [[API Pipeline]].

- **IRS 990 filings via ProPublica Nonprofit Explorer** — annual tax returns for 501c3/501c4 organizations. Primary source for think tank revenue, donor disclosure (where applicable), executive compensation. Tier 1.

---

### RESEARCH LAYERS TO BUILD AND MAINTAIN

- **Temporal mapping** — always record the date of every donation AND the date of every corresponding policy decision. The sequence between donation and outcome is the argument. Flag every case where a policy decision follows a donation within 6-18 months.

- **Voting record layer** — for every politician who has served in a legislature, pull their voting record and cross reference against their donor list. Document every vote that directly benefited a donor. Document every convenient abstention.

- **Revolving door layer** — track staff movement between politician offices, regulatory agencies, and donor industries. Build revolving door entries into every relevant politician and donor node.

- **Geographic donor clustering** — track where donations come from physically. Flag politicians whose donor base is geographically disconnected from their constituency or clusters in wealthy zip codes.

- **Legislative language layer** — when a politician introduces a bill, check if the language matches model legislation from ALEC, donor-connected think tanks, or industry lobbying arms. Document matches explicitly.

- **Cross-politician contradiction mapping** — document every case where two politicians in the vault share a donor but publicly perform opposition to each other. This is the both-sides illusion with receipts.

---

### SECTION-SPECIFIC RESEARCH LAYERS

The six core research layers above apply vault-wide. Three parallel pipeline sections add specialized analytical toolkits documented in their own Framework files. Each Framework is the canonical source for its section's profile anatomy, YAML schema, data sources, and analytical patterns. This section maps the toolkit — it does not restate the rules.

**Media & Influence Pipeline** — [[_Media Pipeline Framework]]

Tracks media personalities who receive money and use their platforms to push policy outcomes. Research layers unique to this section: audience capture model (how funding shapes content away from audience interests toward funder interests), platform dependency analysis (revenue tied to algorithmic engagement), sponsor veto dynamics (advertiser constraints on editorial boundaries), dark money laundering through shell companies (Tenet Media model), independence theater ("independent" branding masking corporate dependency), centrist laundering (nonpartisan branding obscuring donor-class alignment). Primary data sources: FEC individual contributions via API (mandatory `fecDonorLookup()` verification for every profile), platform financial disclosures, sponsorship records. Multi-host profiles (Breaking Points, Pod Save America) require per-host FEC sub-sections.

**Think Tanks & Policy Infrastructure** — [[_Think Tank Framework]]

Tracks the policy factories that translate donor money into legislative language. Research layers unique to this section: idea laundering (donor funds research → research supports policy → politician cites as "independent"), model legislation pipeline (think tank drafts bill → ALEC distributes → verbatim state introductions), regulatory capture pipeline (training future regulators to implement donor preferences), bipartisan credibility shield (token bipartisan boards masking one-sided funding), academic capture (university-adjacent branding for legitimacy). Primary data sources: IRS 990 filings via ProPublica Nonprofit Explorer (Tier 1), congressional testimony transcripts, government agency citations of think tank research. Tax-status classification (`501c3`, `501c4`, `hybrid`, `for-profit`) determines disclosure requirements and is a core analytical variable.

**Lobbying Firms & K Street** — [[_Lobbying Firms Framework]]

Tracks the intermediaries who deliver the donor class's ask to Congress. Research layers unique to this section: revolving door as a hub-level metric (firm value measured by percentage of staff with government experience), bipartisan access machine architecture (simultaneous relationships with both party leaderships), bill language authorship forensics (lobbying firm language appearing verbatim in enacted legislation), bundling operations (lobbyists serving as campaign contribution bundlers for politicians they lobby), client conflict laundering (representing competing clients and extracting from both sides). Primary data sources: Senate LDA quarterly filings (Tier 1), OpenSecrets Lobbying Database (revenue, client lists, issue areas — Tier 1), OpenSecrets Revolving Door tracker (Tier 1). Flat folder structure — no political orientation subfolders, because firms serve both parties simultaneously.

---

### ANALYTICAL FRAMEWORK — APPLY TO ALL RESEARCH

- Who do they actually serve?
- Where does their money come from?
- What did they promise vs. what did they do?
- When they act, who benefits?
- Have they flipped positions and what changed when they did?

---

### CLASS ANALYSIS LENS

- Donor class Democrats: progressive on social issues, capital-aligned on economic structure
- Always distinguish between rhetorical position and material position
- Document the gap between the two explicitly
- Acknowledge genuine working class wins honestly — credibility depends on it

---

### CROSS-REFERENCING TASK — RUN PERIODICALLY

- Go through every donor node
- List every politician connected to that donor
- Flag every case where two connected politicians publicly perform opposition to each other while sharing the same donor
- Flag every case where a donation date precedes a policy outcome within 18 months
- Flag every politician note that mentions a donor by name without a corresponding wikilink to that donor's node

---

### CROSS-SECTION INTEGRATION PROTOCOL

The vault has six content sections (Politicians, Donors & Power Networks, Stories, Media & Influence Pipeline, Think Tanks & Policy Infrastructure, Lobbying Firms & K Street). These sections were built in layers over time. Early profiles don't reference later sections because those sections didn't exist yet.

**Rules — apply to every file edit going forward:**

1. **Touch-and-link rule.** Every time a file is opened for any reason (promotion, source fix, content update, formatting), check: does this file link to profiles in other sections it should? Add missing wikilinks in the same edit.

2. **New section sweep.** When a new section is completed, the final task is a cross-linking sweep: scan all existing donor nodes and politician profiles for connections to the new section.

3. **Hub node priority.** The Big Five (Trump, Koch, Newsom, AIPAC, Musk) plus any donor node with 50+ vault references gets a dedicated cross-section check whenever any connected section is updated.

4. **What to add.** Cross-section links should appear in the most relevant existing section of a file — not a new standalone section. Keep it organic, not bureaucratic.

5. **Wikilink format.** Use alias syntax: `[[Tucker Carlson|Carlson]]`, `[[Heritage Foundation - Conservative Think Tank|Heritage Foundation]]`. Match the display name the reader expects, not the filename.

6. **Analytical connective tissue.** A bare wikilink is better than nothing, but the goal is a sentence that explains the connection.

---

### VERSION CONTROL — GITHUB

**Repository:** `github.com/Guerillapropaganda/donor-map-vault` (private)
**Branch:** `main`
**Initialized:** 2026-03-26

The full vault is version-controlled on GitHub. Future sessions should commit changes at session end with a descriptive message.

**Session-end commit protocol:** Stage modified files by name (not `git add -A`), write a commit message summarizing what changed, push to `origin main`.

---

### YAML EXPANSION ROADMAP (FUTURE — NOT ACTIVE)

The current YAML schema (`type`, `content-readiness`, `last-updated`, `source-tier`, `parent`) is stable and working. The following fields are planned for incremental adoption — added to files as they're actively touched during normal workflow, not via bulk migration:

- `contradiction_count` — Number of documented contradictions in politician profiles.
- `segment_history` — List of Substack posts or stream segments that have used this note.
- `source_tiers_used` — List of tier numbers present in the note's sources.

**Do not run a bulk migration session for these fields.** The incremental approach propagates them naturally through regular work at zero additional cost.

---

### AI-TOOL ATTRIBUTION POLICY

All vault content is published under the Donor Map Database editorial identity. Research may be compiled using a variety of tools, search engines, databases, and synthesis methods — including AI-assisted research tools. However:

- **No AI tool, model name, or platform is attributed in any vault note.** Notes do not reference which tools were used to compile, draft, or research the content.
- **All factual claims must be independently sourced** to verifiable, cited references (Tier 1–4 per the source tier system). The research tool used to discover a source is irrelevant — what matters is that the source itself is real, verifiable, and correctly cited.
- **The editorial standard is the claim and its source, not the method of discovery.** A fact verified via government filing is Tier 1 regardless of how the researcher found it.
- **Remove any tool-specific branding, watermarks, or attribution** from research inputs before integration into vault notes. This includes headers, footers, or metadata that reference specific AI platforms, search aggregators, or synthesis engines.
- **Rationale:** The vault's credibility rests on source quality and analytical rigor, not on disclosure of internal research workflows. Readers verify claims through cited sources. The research pipeline is an internal methodology detail.

This policy applies to all vault sections: Stories, Contradiction Deep Dives, Master Profiles, Sub-Notes, and Donor Nodes.

---

