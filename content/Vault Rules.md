---
title: Vault Rules
type: system
last-updated: 2026-04-06
---

# Vault Rules — The Donor Map

Single source of truth for both Code Claude and Research Claude. No other methodology doc overrides this file. When in doubt, this wins.

---

## 1. Tier 1 First (The Core Rule)

Every factual claim in the vault must cite a government record. Articles provide context, not evidence.

**Source Tiers:**

| Tier | What it is | Examples | URL Stability |
|------|-----------|----------|---------------|
| **1 — Government Records** | Official filings, votes, contracts, disclosures | FEC, Congress.gov, Senate LDA, USASpending, SAM.gov, GovTrack, LobbyView, FARA | Permanent |
| **2 — Investigative Journalism** | Major newsroom investigations with original reporting | ProPublica, NYT, WaPo, The Intercept, Politico | Medium (paywalls) |
| **3 — Secondary Sources** | Reference and aggregation sites | Ballotpedia, Wikipedia, VoteSmart, Ground News | Stable but editable |
| **4 — Partisan/Advocacy** | Single-perspective sources | Heritage, Cato, Breitbart, Jacobin, campaign sites | Unstable — flag always |

**Rules:**
- A factual claim (dollar amount, vote, filing, contract) without a Tier 1 citation is incomplete, not wrong — flag it for pipeline enrichment
- Tier 2-3 citations provide narrative context ("NYT reported that...") — they support analysis, not data
- Tier 4 citations are always flagged with the perspective they represent — never used as evidence
- OpenSecrets: historically Tier 1, now unreliable (blocks, rate limits, site changes). Existing OpenSecrets citations move to Archived Sources. New citations use FEC/Congress.gov equivalents instead

**Citation Format:**
```
[Source Name: Description](URL) (Tier X)
```

**Two-Section Source Layout (all profiles):**

```markdown
## Sources

### Verified
- [FEC: Total Raised $2.4M, 2024 Cycle](https://www.fec.gov/data/candidate/H0CA27085/) (Tier 1)
- [Congress.gov: 12 Bills Sponsored, 118th Congress](https://www.congress.gov/member/...) (Tier 1)
- [ProPublica: Investigation into PAC spending](https://propublica.org/...) (Tier 2)

### Archived
- ~~[OpenSecrets: Donor Summary](https://opensecrets.org/...)~~ (was Tier 1 — site unavailable, data preserved in FEC section above)
- ~~[Newsweek: Campaign finance report](https://newsweek.com/...)~~ (Tier 2 — URL dead, claim verified via FEC)
```

- **Verified**: Working URLs with confirmed data. Tier 1 first, then Tier 2-4.
- **Archived**: Broken links, 404s, paywalled-beyond-access. Struck through. Shows the research trail without pretending the link works. When pipeline data replaces an archived source, note it.

---

## 2. Content Readiness (Investigative Journalism Standards)

4-tier grading system modeled on newsroom fact-check standards. Every tier reflects actual data quality, not just completeness.

| Grade | Status | What it means | Who promotes |
|-------|--------|--------------|-------------|
| D-F | `raw` | Stub — needs everything | Auto-created |
| C | `draft` | Some content, missing key pieces. Under active development | Pipeline or Research Claude |
| B | `ready` | Has body + sources + pipeline enrichment + connections. May have gaps or single-source claims | Pipeline (auto-promotes when criteria met) |
| A+ | `verified` | Gold standard. 2+ Tier 1 source types corroborating. Connections mapped. No contradictions. Enriched within 90 days. Human sign-off. Known gaps documented | Editorial sign-off required (pipeline CANNOT auto-promote) |

**Promotion rules:**
- `raw → draft`: Any substantive content added (body > 100 chars or Tier 1 source exists)
- `draft → ready`: Body > 500 chars + Tier 1 sources + pipeline enriched + connections mapped. Pipeline can auto-promote.
- `ready → verified`: 2+ Tier 1 source types (e.g., FEC + Congress) + no unresolved contradictions + enriched within 90 days + editorial sign-off (`last-verified-by: editorial`). **Pipeline cannot auto-promote to this tier.**

**Staleness decay (automatic demotion):**
- `verified → ready`: After 90 days without re-enrichment. A+ profiles must stay current.
- `ready → draft`: After 180 days without any update (enrichment or manual edit).
- Decay is automatic — run `node scripts/staleness-decay.cjs --write` to apply.
- Demotion is not failure — it's the system being honest about data freshness.

**Corroboration requirement (A+ only):**
- A factual claim is "corroborated" when 2+ independent Tier 1 source types confirm it (e.g., FEC + Congress.gov both show the same committee assignment).
- Profiles must have a `corroboration-count` >= 2 to qualify for verified.
- Source types are detected by URL domain (fec.gov → FEC, congress.gov → Congress, lda.gov → LDA, etc.).

**Known gaps (all profiles):**
- Every profile should document what data is explicitly missing in `known-gaps` frontmatter.
- Auto-populated by the reclassification script based on profile type (e.g., politicians missing Congress.gov data).
- Transparency about gaps is strength, not weakness.

**New frontmatter fields:**
```yaml
source-types:              # distinct Tier 1 sources present (auto-computed)
  - FEC
  - Congress
corroboration-count: 3     # facts backed by 2+ source types (auto-computed)
known-gaps:                # what data is explicitly missing (auto + manual)
  - "No lobbying disclosure data"
last-verified-by: editorial  # "pipeline" or "editorial" — gate for A+
```

**Reclassification:**
- Run `node scripts/reclassify-readiness.cjs` for a dry-run report showing proposed tier changes
- Run with `--write` to apply. Most profiles stay at `ready` (B) — honest assessment
- Very few qualify for `verified` (A+) since it requires editorial sign-off

---

## 3. Scope Boundaries

Two Claudes, one vault. Clear lanes prevent contradictions.

### Code Claude owns:
- Site build: Quartz, TSX components, SCSS, deploy
- Pipeline scripts: FEC, Congress, LDA, ProPublica, GovTrack, SAM, USASpending, LobbyView, RSS, URL checker, OpenSecrets replacement
- Git: all commits, pushes, rebases, conflict resolution
- Frontmatter schema: which fields exist, how they're typed
- Auto-block sections: machine-written content inside `<!-- auto:* -->` markers
- These files: `Changelog.md`, `Session State.md`, `CLAUDE.md`

### Research Claude owns:
- All profile editorial content: voice, framing, analysis, source selection
- Content-readiness promotions (except `developed → verified` which pipeline can do)
- Source verification: checking URLs, confirming claims, tier assignments
- Two-section source layout: deciding what moves to Archived vs stays Verified
- Profile structure: section ordering, callout usage, narrative flow
- **Opposition tagging**: ensuring `related:` vs `opposes:` is correct on every profile touched. This is mandatory — never leave an adversarial connection in `related:`

### Shared:
- `Vault Rules.md` (this file) — either Claude can update with David's approval
- `Session State.md` — both update at session end
- Frontmatter values: Code Claude writes pipeline data fields, Research Claude writes editorial fields
- File moves and folder structure: either can do mechanical moves, but new folder categories need David's approval

### The bright line:
- Code Claude never writes editorial prose in profiles
- Research Claude never modifies auto-block sections (they're pipeline-owned)
- If unsure, flag it and ask David

---

## 4. Pipeline Data Protocol

Pipelines write data into profiles automatically. This data must coexist with editorial content without clashing.

### How it works:
1. Pipeline pulls data from government API (FEC, Congress.gov, etc.)
2. Data lands in two places:
   - **Frontmatter**: numbers and metadata (`total-raised`, `bills-sponsored`, `lobbying-spend`, `lobbyview-bills`, etc.)
   - **Auto-blocks**: formatted sections wrapped in `<!-- auto:blockType start/end -->` markers
3. Auto-blocks are machine-owned. Research Claude does not edit inside them.
4. If Research Claude has edited an auto-block (detected by hash mismatch), the pipeline parks new data in a `pending-merge` block below. Research Claude folds it in during next session.

### Auto-update behavior:
- Pipeline reruns overwrite auto-blocks with fresh data (unless human-edited)
- Frontmatter numbers update automatically
- Editorial prose that references numbers should use general language ("raised millions") not hardcoded figures, OR reference frontmatter values directly
- Components on the site read frontmatter for live numbers (Both Sides meter, ProfileWidget stats)

### What triggers promotion:
- Pipeline sets `last-enriched: YYYY-MM-DD` in frontmatter on every enrichment run
- Pipeline can auto-promote `raw → draft` and `draft → ready` when criteria are met (see Section 2)
- Pipeline CANNOT promote to `verified` (A+) — that requires editorial sign-off via `last-verified-by: editorial`
- Pipeline also computes `source-types` and `corroboration-count` from detected Tier 1 URLs

---

## 5. File Standards

### Naming:
- Master profiles: `_Name Master Profile.md` (underscore prefix)
- Sub-notes: `Name - Topic.md` (no prefix)
- Donor nodes: `Name.md` or `Acronym - Full Name.md`
- Index files: `index.md` (for folder pages in Quartz)

### Folder structure:
- Politicians: `content/Politicians/{Party}/{Chamber}/{Name}/`
- Donors: `content/Donors & Power Networks/{Sector}/{Name}/`
- Stories: `content/Stories/{Type}/`
- Events: `content/Events/Drafts/` and `content/Events/Digests/`
- Interactive: `content/Interactive/`

### Frontmatter (required on every profile):
```yaml
title: Name
type: politician | donor | corporation | pac | think-tank | lobbying-firm | media-profile | event | story
content-readiness: raw | draft | ready | verified
source-tier: 1-4 (highest tier source in the file)
last-updated: YYYY-MM-DD
```

### Relationship fields (on profiles with connections):
```yaml
related: "[[Ally 1]] · [[Funder 2]]"     # allied, funding, or organizational connections
donors: "[[Funder 1]] · [[Funder 2]]"     # funding sources
opposes: "[[Adversary 1]] · [[Target 2]]" # adversarial relationships — critics, targets, opponents
```

**Opposition tagging rule:** Every profile must correctly distinguish allied vs adversarial connections. If an entity in `related:` is an ideological opponent, subject of criticism, or adversarial target — it belongs in `opposes:`, not `related:`. This is mandatory for Research Claude during any profile review or creation. The graph renders `opposes:` connections as red dashed lines to prevent misrepresenting adversarial relationships as alliances.

### Wikilinks:
- Always use full filename: `[[_Elizabeth Warren Master Profile|Elizabeth Warren]]`
- Alias syntax for readability

### Callouts:
- `[!money]` — funding connections
- `[!contradiction]` — policy gaps
- `[!quote]` — direct quotes with source and date

---

## 6. Session Protocol

### Starting a session:
1. Read `Session State.md` (auto-loaded or in vault)
2. Read `Vault Rules.md` (this file) if unfamiliar
3. Check what's in flight from last session
4. Start work

### Ending a session:
1. Update `Session State.md` with: what was done, what's in flight, what's next
2. Update `Changelog.md` with substantive changes
3. Commit and push (Code Claude)

### Session State format:
```markdown
## Last Session
Claude: Code | Research
Date: YYYY-MM-DD
Done:
- (3-5 bullets)
In flight:
- (unfinished work)
Next:
- (priority for next session)
```

Rolling 5-session history. Oldest drops off.

---

## 7. Mechanical Hygiene

Either Claude can perform these without handoff:
- Fix NUL bytes, BOM artifacts, encoding corruption
- Fix duplicate YAML keys
- Normalize line endings
- Fix malformed wikilinks (syntax errors, not editorial choices)
- Move files to correct folders per established taxonomy

Flag in Session State when doing bulk hygiene sweeps.

---

## 8. Decisions Log

Permanent record of architectural and editorial decisions that affect the whole vault. Add new entries at the top.

| Date | Decision | Made by |
|------|----------|---------|
| 2026-04-08 | Readiness overhaul: "developed" removed, 4-tier system (raw/draft/ready/verified). Investigative journalism standards: corroboration, staleness decay, known-gaps, editorial sign-off gate. Verified = A+, Ready = B. | David |
| 2026-04-07 | `opposes:` frontmatter field mandatory. Research Claude must tag adversarial connections on every profile review. Graph renders as red dashed lines. | David |
| 2026-04-06 | New readiness tier: `verified` (has Tier 1 data). Existing `ready` files stay published, pipeline promotes through `verified` organically | David |
| 2026-04-06 | Tier 1 First mandate — every factual claim needs government source | David |
| 2026-04-06 | Two-section source layout: Verified / Archived. Broken links preserved as research trail | David |
| 2026-04-06 | OpenSecrets demoted from Tier 1 — unreliable, existing URLs archived, replaced by FEC/Congress.gov | David |
| 2026-04-06 | Unified Vault Rules replaces 10 methodology docs. Old docs archived. | David |
| 2026-04-06 | LobbyView pipeline added (100 req/day, client-bill networks) | David |
| 2026-04-05 | Epstein content excluded from publication scope. If it surfaces, stop and ask David. | David |
| 2026-04-05 | Politicians whose careers end in a cabinet post go to their administration's Cabinet folder | David |
| 2026-04-05 | `running-for:` frontmatter for candidate tracking when no race folder exists | David |
