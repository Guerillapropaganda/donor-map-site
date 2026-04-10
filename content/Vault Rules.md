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

**Type-specific A+ requirements:**

| Type | Must have for A+ |
|------|-----------------|
| Politician (Congress) | Voting records, committee assignments, bills, FEC data, 2+ Tier 1 types |
| Politician (President) | Executive orders, cabinet appointments, FEC data, 2+ Tier 1 types. Voting record N/A-eligible. |
| Politician (Governor) | Executive actions, key state legislation, FEC data, 2+ Tier 1 types. Voting record N/A-eligible. |
| Politician (Cabinet) | Appointment documented, prior role / revolving door, 2+ Tier 1 types. Voting record N/A-eligible. |
| Donor | Politicians funded, contribution amounts, sector, 2+ Tier 1 types |
| Corporation | PAC contributions, lobbying filings, federal contracts, 2+ Tier 1 types |
| Think Tank | Top funders, 990 data, policy positions, 1+ Tier 1 type |
| Lobbying Firm | Client list, lobbying spend, 2+ Tier 1 types (LDA + FARA/FEC) |
| Media Profile | Ownership chain, political lean, connections, 1+ Tier 1 type |
| PAC | FEC data, donors mapped, politicians funded, 2+ Tier 1 types |

All types also require: connections mapped, enriched <90 days, no contradictions, editorial sign-off.

**N/A system:** Items can be marked N/A with a reason (e.g., "Not yet in office", "Private company — no SEC filings"). N/A items don't count against the A+ score. Stored in `checklist-na` frontmatter.

**New frontmatter fields:**
```yaml
source-types:              # distinct Tier 1 sources present (auto-computed)
  - FEC
  - Congress
corroboration-count: 3     # facts backed by 2+ source types (auto-computed)
known-gaps:                # what data is explicitly missing (auto + manual)
  - "No lobbying disclosure data"
last-verified-by: editorial  # "pipeline" or "editorial" — gate for A+
checklist-na:              # items marked N/A with reasons
  - "voting-records: Not yet in office (candidate)"
  - "sec-filings: Private company"
verified-blocks:           # pipeline data blocks reviewed by editor
  - fec-fundraising
  - govtrack
```

**Reclassification:**
- Run `node scripts/reclassify-readiness.cjs` for a dry-run report showing proposed tier changes
- Run with `--write` to apply. Most profiles stay at `ready` (B) — honest assessment
- Very few qualify for `verified` (A+) since it requires editorial sign-off

**Checklist enforcement:**
- The promote button in the Ops profile viewer checks the type-specific checklist before allowing promotion
- If items are failing, the promote button is blocked with a list of what's missing
- A **Bypass** button exists for edge cases — requires confirmation and logs the override
- Bypass is for editorial judgment calls, not for skipping real requirements

**Orphaned Claims from Broken URLs:**

When a URL is archived/broken, any factual claim it was the sole source for becomes unsourced. Research Claude must:
1. Search for a replacement Tier 1 source
2. If none found, rewrite to remove the unsourced assertion — **document every rewrite in the editorial review log** (what was changed and why, preserving the correction trail)
3. If the claim is critical and verifiable but not yet sourced, mark `(URL NEEDED)` — this demotes the profile from ready to draft
4. Add removed/rewritten claims to `corrections` frontmatter array for permanent audit trail

**Editorial Review System (A+ Promotion):**

Three-stage review: Research Claude → Code Claude → Editor (David). Each stage reviews, fixes what it can, documents everything, and hands off.

**The workflow:**

1. **Research Claude** picks a profile from the priority queue. Reviews each block. Immediately fixes what it owns (connections, contradictions, orphan claims, source verification, opposition tagging). Documents everything in the Reviews timeline: FOUND, FIXED, and what's left for Code Claude. Updates frontmatter (`verified-blocks`, `editorial-blockers`).

2. **Code Claude** picks up profiles with Code blockers (corrupted auto-blocks, wrong FEC IDs, missing enrichment, broken pipelines). Fixes them. Adds FIXED entries to the Reviews timeline. If pipelines are offline (e.g., GitHub Actions disabled), Code items go on a backlog — Research Claude continues reviewing other profiles in the meantime.

3. **Editor (David)** reviews the timeline in the Ops profile viewer Reviews tab. If both Claudes have done their work and the profile looks good: approves for A+. If not: adds critique or sends it back with notes for another pass.

**Review, fix, document, move on.** Don't just find problems — fix them in the same session. The Reviews timeline is a work log, not a bug tracker.

**Timeline entry format:**
```
FOUND: [what was discovered]
FIXED: [what was done about it]
Verified: [blocks that passed]
Result: X/Y blocks — PASS/BLOCK
```

**Priority queue**: Run `node scripts/editorial-priority.cjs` to rank profiles by readiness proximity (connections 25% + source density 30% + corroboration 20% + body 10% - gaps 15%).

**Type batching**: Congress → Executive → Donors → Corporations → Think Tanks/PACs → Lobbying/Media.

**Partial sign-off**: Blocks are signed off individually via `verified-blocks`. A+ requires ALL blocks for the profile type to pass.

**Orphan claims check**: Mandatory on every review — verify all archived URLs' claims are still sourced.

**Staleness**: A+ profiles demote to B after 90 days without re-enrichment. Re-review required.

**Review blocks by profile type:**

| Type | Blocks |
|------|--------|
| Politician (Congress) | voting-records, committee-assignments, bills, fec-data, source-diversity, connections, enriched, contradiction-review, orphan-claims, editorial-quality, sign-off |
| Politician (President) | executive-orders, cabinet-appointments, fec-data, source-diversity, connections, enriched, voting-records (N/A), contradiction-review, orphan-claims, editorial-quality, sign-off |
| Politician (Governor) | executive-actions, state-legislation (N/A), fec-data, source-diversity, connections, enriched, voting-records (N/A), contradiction-review, orphan-claims, editorial-quality, sign-off |
| Politician (Cabinet) | appointment, prior-role, fec-data, source-diversity, connections, enriched, voting-records (N/A), contradiction-review, orphan-claims, editorial-quality, sign-off |
| Donor | politicians-funded, contribution-amounts, sector, source-diversity, connections, enriched, orphan-claims, editorial-quality, sign-off |
| Corporation | pac-contributions, lobbying, contracts, sec-filings (N/A), source-diversity, connections, enriched, contradiction-review, orphan-claims, editorial-quality, sign-off |
| Think Tank | funders, 990-data, policy-mapped, source-type (1+), connections, orphan-claims, editorial-quality, sign-off |
| PAC | fec-data, donors-mapped, politicians-funded, source-diversity, connections, orphan-claims, editorial-quality, sign-off |
| Lobbying Firm | client-list, lobbying-spend, fara (N/A), revolving-door (N/A), source-diversity, connections, orphan-claims, editorial-quality, sign-off |
| Media | ownership, political-lean, platform, source-type (N/A), connections, orphan-claims, editorial-quality, sign-off |

**#1 Editorial Rule: Class Analysis Perspective**

Every profile in The Donor Map must be written from a class analysis perspective. This is non-negotiable. The entire project exists to show how money controls politics through class structures. Profiles that don't frame through class analysis miss the point.

- All editorial content must analyze donor-politician relationships through the lens of class interests: who benefits, who pays, what class interests are served
- This applies to ALL profile types: politicians, donors, corporations, think tanks, media, PACs
- "Class Analysis" is a mandatory section in every profile (see below)

**`editorial-quality` block (all types) — Research Claude must check and fix:**

Every profile must have these 8 core sections with substantive content:

| Section | What "passes" means |
|---------|-------------------|
| Who They Are | 2+ paragraphs. Bio, credentials, career arc. Not just a sentence. |
| The Central Thesis | Specific, bold claim about their structural role. Not generic ("takes money from donors"). Names the mechanism. |
| The Core Contradiction | At least one sourced tension between rhetoric and record. Uses `[!contradiction]` callout. |
| Class Analysis | Who benefits from this person's actions? What class interests do their donors represent? How does their career serve capital vs. labor? Every profile must answer these questions explicitly. |
| Donor Class Map | Career totals with amounts. Top donors named. Sector breakdown present. |
| Donation-to-Policy Timeline | Table with actual dates, amounts, and policy outcomes. Shows the money→action connection explicitly. |
| Rhetorical Signature Moves | 2+ identified patterns in how they frame their actions. |
| Analytical Patterns | At least one structural pattern identified (Genuine Win + Structural Limit, Two-Audience Problem, Villain Framing, Donor-Class Override, etc.) |

If a section is missing or thin, Research Claude writes it during the review — not just flags it. The review IS the editorial improvement pass. After the review, the profile should be publishable.

**Story grading (stories, events, sub-notes):**

Stories and editorial content don't require pipeline enrichment. They're graded by source density:

| Level | URL count | Readiness | What it means |
|-------|-----------|-----------|---------------|
| Story | 1-4 sourced URLs | draft (C) | Narrative exists, light sourcing |
| Report | 5-9 sourced URLs | ready (B) | Well-sourced, multiple angles |
| Investigation | 10+ sourced URLs, 3+ Tier 1 | verified (A+) | Full investigative piece, government records |

Stories/events/sub-notes do NOT require: pipeline enrichment, last-enriched dates, FEC/Congress/LDA data.
Stories DO require: sourced URLs, profiles linked via wikilinks, editorial sign-off for A+.

**Contradiction investigation (A+ requirement):**
- `[!contradiction]` callouts flag unresolved contradictions between sources
- A+ profiles MUST have all contradictions investigated and resolved by Research Claude
- Resolution: Research Claude investigates, resolves, and adds `[!contradiction-cleared]` callout
- This is a mandatory Research Claude task — Code Claude flags, Research Claude resolves

**Editorial checks (full framework):**

| Check | What | Owner | Automated? |
|-------|------|-------|-----------|
| Source density | URLs per profile, tier distribution | Code Claude | Yes |
| Source freshness | Data cycle year, last verified | Code Claude | Yes |
| Claim attribution | % of factual claims with sources | Research Claude | Manual |
| Cross-ref consistency | Same facts match across related profiles | Code Claude | Buildable |
| Contradiction investigation | `[!contradiction]` flags resolved | Research Claude | Manual (Code flags) |
| Legal sensitivity | Profiles with strong claims need extra sourcing | Research Claude | Manual |
| Correction history | Past errors documented in `corrections` frontmatter | Both | Manual |
| Wikilink integrity | All `[[links]]` resolve to real profiles | Code Claude | Yes |
| Orphan detection | Profiles with no incoming links | Code Claude | Yes |
| Update cadence | Review frequency matches subject activity | Both | Semi-auto |
| Known gaps | What we don't know, explicitly documented | Both | Semi-auto |
| Orphan claims | Broken URLs' claims still sourced or rewritten | Research Claude | Manual |
| Editorial sign-off | Human reviewed and approved | Research Claude / David | Manual |

---

## 2b. Research Claude + Code Claude Integration

**Code Claude surfaces → Research Claude acts:**
- Pipeline finds data contradiction → flags with `[!contradiction]` → Research Claude investigates
- Reclassification identifies near-A+ profiles → Research Claude reviews + signs off
- Auto-connection engine maps relationship → Research Claude verifies accuracy
- URL checker finds broken source → Research Claude finds replacement
- Cross-ref checker finds mismatched numbers → Research Claude resolves

**Research Claude requests → Code Claude builds:**
- "Need lobbying data" → Code Claude runs LDA pipeline
- "Story needs FEC backing" → Code Claude runs FEC on referenced profiles
- Research Claude writes story → Code Claude verifies wikilinks + URLs work

**A+ Editorial Review workflow:**
- Research Claude runs editorial review queue → signs off blocks → promotes to A+
- Code Claude builds `scripts/editorial-priority.cjs` to generate the review queue
- Ops app displays editorial review log on the profile Notes tab
- `editorial-result: block` with pipeline blockers → Code Claude runs the needed pipeline

**Shared workspace (Ops app):**
- **Notes tab** = handoff point between Claudes (internal-notes frontmatter)
- **Checklist** = shared progress tracker visible on every profile
- Profiles flagged "Needs Research Claude" in notes = editorial queue
- Profiles flagged "Needs Code Claude" in notes = data/pipeline queue

---

## 3. Relationship Discovery

Automated system for finding and creating connections between profiles. The scanner discovers, David reviews, Research Claude develops.

### Connection Types

| Type | Meaning | Visual | When to create |
|------|---------|--------|---------------|
| Money Trail | Donor to recipient, confirmed by FEC | Green solid | Always. Any dollar amount from Tier 1 source |
| Opposition | IE spending against, documented opposition | Red dashed | Auto-create from FEC IE data. Editorial opposition = flag for review |
| Work/Org | Employment, board membership, co-founding | Blue solid | Always. If body text confirms organizational role |
| Alliance | Co-sponsors, shared caucus, mutual support | Purple thin | Flag for review unless 2+ strategies corroborate |
| Story Link | Connected through investigative story | Pink dotted | When story wikilinks to profile |
| Shared Donor | Two profiles funded by same entity | Amber dotted | Flag for review. Context matters |
| Leak Data | Panama/Paradise Papers, ICIJ offshore | White double | Always flag for review. Too sensitive to auto-create |

### Confidence Tiers

| Tier | Criteria | Action |
|------|----------|--------|
| HIGH | FEC IE data, confirmed $ from Tier 1 source, 3+ strategies agree | Auto-create eligible. David can batch-approve. |
| MEDIUM | Organizational match, shared donors, 2 strategies agree | Review recommended. Research Claude can approve. |
| LOW | Single body text mention, no corroboration | Manual review required. David or Research Claude decides. |

### Auto-Create Rules
- FEC independent expenditures (oppose): ALWAYS auto-create as `opposes`
- FEC independent expenditures (support): ALWAYS auto-create as `donors`
- All other connections: suggest only, require approval

### Bidirectional Enforcement
- When A to B is approved, auto-create B to A
- Exception: `donors` is directional (A funds B, not B funds A)
- `opposes` is always bidirectional (if A opposes B, B opposes A)

### Unnamed Entity Threshold
Create stub profile when:
- Mentioned in 3+ distinct profiles across the vault, OR
- Mentioned with a dollar amount from any Tier 1 source (FEC, Congress, LDA), OR
- Named in Panama Papers, Paradise Papers, or ICIJ leak data
- Must be proper noun, not generic title
- Stub profiles are `raw` readiness with `auto-generated: true`

### Confidence Escalation
- LOW to MEDIUM: if corroborated by a second strategy on next scan
- MEDIUM to HIGH: if corroborated by Tier 1 source data
- Multi-strategy discoveries always get +1 confidence level

### Connection Decay
- Deferred suggestions with no action for 30 days escalate to dashboard alert
- Relationship notes marked "investigate deeper" with no follow-up for 30 days escalate
- Alerts show in Ops Alerts page with link to the suggestion

### Contradiction Detection

A contradiction occurs when the same entity both funds AND opposes the same politician. This is not a data error. It is a signal that the entity is hedging influence, playing both sides to maintain access regardless of outcome.

**How it works:**
- Scanner detects when a committee appears in both the Support and Oppose columns of a politician's FEC IE data (both > $100K)
- Both the `donors` and `opposes` suggestions are tagged with `contradiction` metadata
- Each card shows: this side's amount, the counterpart amount, total influence, and ratio

**What contradiction means for the project:**
- Contradictions are among the most newsworthy patterns in the vault. They reveal the donor class operating above partisan loyalty.
- Every contradiction should be investigated by Research Claude for the class analysis angle
- Profile write-ups should call out contradictions explicitly in the Class Analysis section
- On the website, contradiction connections should have a visible marker (split-color line, asterisk, or star icon) on all views: profile widgets, graph overlay, power rankings, and landing page split cards
- Future: extend beyond FEC-IE. A company lobbying FOR a bill while donating to a politician who votes AGAINST it is the same pattern.

**Role assignments:**
- **Code Claude**: detect contradictions in scanner, surface in Ops UI, build visual markers for website components
- **Research Claude**: investigate every flagged contradiction, write class analysis context, verify the FEC data tells the full story (primary vs general, cycle timing)

### Rejection Rules
- Rejection requires a reason (stored in suggestion-actions.json)
- Rejected pairs are not re-suggested unless new evidence appears (new strategy finds them)
- "New evidence" = a strategy that was not in the original suggestion

### Transparency Score

Every discovered connection gets a Transparency Score (0-100) measuring how easy it is for a citizen to follow the money. This is not an accusation of corruption. It is a measurement of structural transparency. Low transparency is a problem regardless of legality.

**Tiers:**

| Score | Label | Color | What it means |
|-------|-------|-------|---------------|
| 90-100 | TRANSPARENT | Green | Fully disclosed, direct contribution, no intermediaries. Democracy functioning. |
| 60-89 | DISCLOSED | Blue | Public record but complex structure. Legal, traceable with effort. |
| 30-59 | OPAQUE | Amber | Dark money layers, suspicious timing, sector-committee alignment. Legal but designed to obscure. |
| 0-29 | OBSCURED | Red | Untraceable intermediaries, leak data exposure, under investigation. The system hiding itself. |

**Scoring factors (each adds or subtracts from a base of 70):**

| Factor | Measurement | Score impact |
|--------|-------------|-------------|
| Disclosure layers | How many entities between original donor and recipient | -10 per intermediary layer (PAC to PAC, 501c4 pass-through) |
| Timing correlation | Days between donation and favorable policy action | <30 days: -15. 30-90 days: -10. 90-180 days: -5. >180 days: 0 |
| Dollar magnitude | Size of contribution relative to typical donations | >$1M: -10. >$100K: -5. <$10K: +5 |
| Dark money indicators | 501(c)(4), LLC donors, anonymous contributions in body text | -15 per indicator found |
| Revolving door | Lobbyist/staffer movement between donor org and politician's office | -10 if detected |
| Sector-committee alignment | Donor's industry matches politician's committee jurisdiction | -10 if aligned |
| Pattern repetition | Same donor type, same policy outcome, across multiple cycles | -5 per repeated pattern |
| Legal scrutiny | DOJ investigation, FEC complaint, enforcement action | -20 if under investigation |
| Leak exposure | Panama/Paradise/Pandora Papers, ICIJ data | -25 if referenced |
| Direct FEC disclosure | Clean FEC filing, no intermediaries | +10 |
| Small donor funded | Majority small-dollar contributions | +10 |

**The framing principle:** We measure transparency, not morality. "How easy is it to follow this money?" If the answer is "you need to dig through 4 shell entities," that is a transparency problem. The reader decides what it means.

**Display:** Every suggestion card shows the Transparency Score as a colored bar with the tier label. Connections with scores below 30 (OBSCURED) get flagged for priority editorial review.

### Roles
- **Code Claude**: Owns the discovery scanner, suggestions API, auto-create pipeline, transparency scoring. Does NOT approve editorial connections.
- **Research Claude**: Reviews suggestions at session start. Approves/rejects medium-confidence connections. Develops stub profiles. Flags new relationships during editorial reviews. Investigates OBSCURED connections.
- **David (Editor)**: Approves/rejects in Ops UI. Batch-approves high-confidence. Final say on edge cases. Prioritizes OBSCURED connections for editorial.

---

## 4. Scope Boundaries

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

### Editorial voice (both Claudes must follow when writing any profile content):
- **No em dashes.** Never use the — character in profile content. It reads as AI-generated. Use periods, commas, or restructure the sentence. Colons and parentheses are fine in tables and metadata.
- **Short sentences.** Punchy and direct. If a sentence has three clauses, break it into two or three sentences.
- **No hedge words.** Don't write "it is worth noting that" or "it should be noted" or "interestingly." Just state the fact.
- **No filler transitions.** Don't write "moreover," "furthermore," "additionally," "in conclusion." Start the next sentence.
- **Name the mechanism.** Don't write "money influences politics." Write "AIPAC spent $8.5M to defeat Bush in the primary." Specifics, not abstractions.
- **Active voice.** Not "the campaign was funded by" but "Goldman Sachs funded the campaign."
- **The Donor Map tone:** Follow the money. Show the receipts. Let the data do the talking.

---

## 5. Pipeline Data Protocol

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

## 6. File Standards

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

### Editorial review fields (on reviewed profiles):
```yaml
editorial-review-date: YYYY-MM-DD
editorial-reviewer: "Research Claude" | "David"
editorial-result: pass | block | defer
editorial-blockers:
  - "Missing Congress.gov data"
editorial-review-log:
  - date: YYYY-MM-DD
    reviewer: "Research Claude"
    result: pass | block | defer
    blocks-reviewed: [block-ids...]
    blockers: []
    notes: "freetext — include all rewrites from orphan claims"
corrections:                          # permanent audit trail of editorial changes
  - "2026-04-09: Removed $2.4M claim — source URL dead, no replacement found"
```

### Callouts:
- `[!money]` — funding connections
- `[!contradiction]` — policy gaps
- `[!contradiction-cleared]` — resolved contradiction (by Research Claude)
- `[!quote]` — direct quotes with source and date

---

## 7. Session Protocol

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

## 8. Mechanical Hygiene

Either Claude can perform these without handoff:
- Fix NUL bytes, BOM artifacts, encoding corruption
- Fix duplicate YAML keys
- Normalize line endings
- Fix malformed wikilinks (syntax errors, not editorial choices)
- Move files to correct folders per established taxonomy

Flag in Session State when doing bulk hygiene sweeps.

---

## 9. Decisions Log

Permanent record of architectural and editorial decisions that affect the whole vault. Add new entries at the top.

| Date | Decision | Made by |
|------|----------|---------|
| 2026-04-08 | A+ Editorial Review System: three-stage workflow (Research Claude reviews+fixes → Code Claude fixes pipeline items → Editor approves). Review-fix-document-move on, not just find problems. Reviews timeline in Ops app. Code Claude backlog when GitHub Actions offline. | David |
| 2026-04-08 | Editorial framework: checklist enforces readiness (with bypass), story grading (story/report/investigation by URL count), contradiction investigation mandatory for A+, Research+Code Claude integration protocol, cross-ref/wikilink/orphan checks planned | David |
| 2026-04-08 | Readiness overhaul: "developed" removed, 4-tier system (raw/draft/ready/verified). Investigative journalism standards: corroboration, staleness decay, known-gaps, editorial sign-off gate. Verified = A+, Ready = B. | David |
| 2026-04-08 | Senate LDA (lda.gov) temporarily removed from Tier 1 — site mid-migration from lda.senate.gov, URLs broken. Reinstate after June 2026 when migration completes. Existing LDA citations stay as Archived until then. | David |
| 2026-04-08 | FollowTheMoney.org merged into OpenSecrets — all FTM URLs are dead. Archive on sight, do not use as a source. Use FEC or state campaign finance databases instead. | David |
| 2026-04-08 | ProPublica Nonprofit Explorer = Tier 1 (surfaces IRS 990 government data). ProPublica investigative articles = Tier 2. | David |
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
