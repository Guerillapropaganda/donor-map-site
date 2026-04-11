---
title: Vault Rules
type: system
last-updated: 2026-04-06
related: "[[Ally 1]] · [[Funder 2]]"
---
# Vault Rules — The Donor Map

Single source of truth for both Code Claude and Research Claude. No other methodology doc overrides this file. When in doubt, this wins.

> **Phase 3 — canonical relationships.** As of 2026-04-11, the canonical source for every relationship between profiles lives in `data/relationships.jsonl`. Legacy frontmatter fields (`related`, `donors`, `top-donors`, `politicians-funded`, `opposes`, `stories`) are still readable by existing consumers but **new relationship data should go through the canonical store**. Schema + validator: `scripts/lib/relationship-edge-validator.cjs`. Reader: `scripts/lib/relationships-store.cjs` (CJS) / `ops/src/lib/relationships-store.ts` (TS mirror). See the CLAUDE.md frontmatter-only section for the `-generated` cache-field exception.
>
> **`editor-vouched: true` frontmatter flag.** Long-form story profiles that cite sources in an aggregated Sources section at the bottom (magazine format) can set `editor-vouched: true` to skip `hallucination-catcher`'s inline-citation proximity check. Only use when every claim is genuinely backed by the Sources section or by wikilinks to fully-cited Master Profiles. Does NOT exempt the profile from `voice-drift-detector` or `self-review-mirror` — those catch AI voice and defamation words independently. Setting this flag on a profile with genuinely unsupported claims is a defamation risk. See the CLAUDE.md frontmatter-only section for the full rule.

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

**5-tier grading system** modeled on newsroom fact-check standards. Every tier reflects actual data quality, not just completeness. The NEW S-tier (above A+) is reserved for profiles with genuine original investigative findings — the "no one else has seen this" layer.

| Grade | Status | What it means | Who promotes |
|-------|--------|--------------|-------------|
| D-F | `raw` | Stub — needs everything | Auto-created |
| C | `draft` | Content under active development. **Any missing pipeline data, any blocking known-gap, any "needs fresh pipeline run" note = draft, not ready.** | Pipeline or Research Claude |
| B | `ready` | **99% done. Only David's verified sign-off remains.** All pipeline data populated and clean. All expected auto-blocks present for the profile type. 2+ Tier 1 source types corroborating. Class analysis written. No unresolved contradictions. `known-gaps` contains only non-blocking items (e.g., pre-Congress bio detail). | Pipeline or Research Claude (both must enforce the gate) |
| A+ | `verified` | **Investigative floor.** Everything in `ready` PLUS all four A+ sub-tiers (A/B/C/D below). **Only David signs off.** No pipeline auto-promotion. | Editorial sign-off required (pipeline CANNOT auto-promote) |
| **S** | **`s-tier`** | **Original-finding standard.** Everything in `verified` PLUS `angle:` field populated + 3+ "damning" exclusive-connections + original-finding + TWO sign-offs (janitor automated + David manual). Gate for homepage features (Weekly Spotlight, Power Rankings hero, Landing featured cards). | Janitor `audit-s-tier-passed: true` AND David `editorial-signoff-narrative` — **both required**, neither alone sufficient. |

### § 2a — A+ (verified) sub-tier requirements

For a profile to be promoted `ready → verified (A+)`, ALL four sub-tiers below must pass. The janitor automates most of this via a new `--tier=a-plus` audit mode; the stamped field is `audit-a-plus-passed: YYYY-MM-DD`.

**Tier A — Data Breadth** (raised floor from "2+ Tier 1" to real cross-referencing)
- **3+ Tier 1 source types** (raised from 2 — 2 is the draft-to-ready floor, 3 is the verified floor)
- **Committee-relevant regulatory cross-ref** — conditional on committee assignment, automated via `scripts/lib/committee-pipeline-map.cjs`:
  - Banking / Financial Services → OCC + SEC EDGAR required
  - HELP / Agriculture → FDA required
  - Judiciary → CourtListener + DOJ Press required
  - Intelligence / Foreign Affairs → FARA + OpenSanctions required
  - Armed Services → USASpending contracts required
  - Commerce → FTC required
  - Energy → Federal Register EPA rulemaking required
- **Financial disclosure block** — stock trades + `board-seats` field. N/A-able if the politician isn't in Congress.
- **Nonprofit ties** — IRS 990 via ProPublica Nonprofit for any politician with affiliated foundations. N/A-able.
- **Foreign angle** — FARA + OpenSanctions check. N/A-able if clean.
- **Legal angle** — CourtListener check. N/A-able if clean.

**Tier B — Investigation Depth** (the layer that distinguishes this from OpenSecrets)
- **Donation-to-Policy Timeline table present** in body — not just a donor list, a structured table: date of donation → bill or vote → policy outcome → beneficiary.
- **1+ contradiction callout with dollar figures** — `> [!contradiction]` or `> [!money]` callout documenting a specific "said X, voted Y, received $Z" pattern.
- **Cross-network 4-hop chain** — at least one chain like "donor → committee → policy → beneficiary." Could be a `## The Chain` heading or a structured sub-section.
- **Revolving door / family network check** — spouse employer, chief-of-staff destinations, pre-Congress career mapped. If clean, say so explicitly. If there's a hit, document it.
- **Dark money chain traced** — every politician has some dark-money intake if you look hard enough. Required outcome: "traced — result: [found chain X / clean / inconclusive]."

**Tier C — Narrative Quality** (the editorial layer)
- **`central-thesis:` frontmatter field** populated — one sentence answering "what is this profile saying?"
- **Core contradiction callout** present in body (`> [!contradiction]`)
- **`## Class Analysis` section** present (already mandatory per ANALYTICAL RULE 1 below)
- **3+ top claims extracted as sub-notes** — each with independent Tier 1 sourcing. The story lives in the sub-notes.
- **`story-grade:` frontmatter field** assigned — `story` (1-4 URLs) / `report` (5-9) / `investigation` (10+, 3+ Tier 1)
- **Automated legal-review pass** — janitor greps body for defamation-prone words (fraud/criminal/corrupt/scheme/conspired/bribed/embezzled/kickback). Each hit must either be inside a blockquote (primary source quote) OR profile must have `legal-review-date:` + `legal-review-result: pass` frontmatter.
- **`lawyer-dispute:` field or `## Legal Exposure` section** — one explicit paragraph answering "what would the subject's lawyer fight us on, and how do we respond?"

**Tier D — Uniqueness (automated, janitor-written)**
- `cross-vault-triangulation-count:` — number of `related:` entries that also appear in 2+ otherwise-unrelated vault profiles. Zero triangulations gets a warning flag but doesn't block A+.
- `anomaly-flags:` — janitor outlier detection vs cohort median (total-received 3x median, votes-against-party 40%+ above peers, unusual donor sector mix, etc.). Informational.
- `both-sides-flag:` — set to `true` if the same entity appears in both `donors:` and `opposes:` frontmatter. Doesn't auto-block A+ but requires Research Claude to address.

### § 2b — S-tier requirements (above A+)

**S-tier is not a quality floor — it's a discovery floor.** A+ means "we did the journalism cleanly." S-tier means "we uncovered something nobody else had." For a profile to reach S-tier, ALL of A+ is required, PLUS:

- **`angle:` frontmatter field populated** — one sentence answering: *"What does this profile show that OpenSecrets, Ballotpedia, and GovTrack do NOT?"* This is THE forcing function. If Research Claude can't write it, the profile is A+ at best.
- **`exclusive-connections:` array with 3+ "damning" entries** — each entry describes a specific connection not visible in mainstream donor-tracking sources AND demonstrating obvious foul play or something genuinely crazy. Three is the minimum; quality bar on each is the real gate.
- **`original-finding:` field populated** — one specific, verifiable, citable claim that this vault surfaces first.
- **`audit-s-tier-passed: true`** — janitor automated audit passed (runs with `node scripts/pipeline-janitor.cjs --tier=s`)
- **`editorial-signoff-narrative:` date** — David manually reviewed narrative and originality

**The two-sign-off rule:** both `audit-s-tier-passed: true` AND `editorial-signoff-narrative` must be present. Setting `content-readiness: s-tier` alone does not make a profile S-tier; the rendering layer in the ops app and public site both double-check via `isSTier(profile)` helper. This is deliberate — prevents accidental promotions, prevents single-point-of-failure audit, and requires both automated data integrity + human narrative judgment.

**S-tier is the gate for homepage features** — Weekly Spotlight, Power Rankings hero, Landing page featured cards. Profiles below S-tier still render normally in grids and detail pages, but cannot be featured. Graceful degradation: if S-tier pool is too small, features fall back to A+ (verified) profiles.

### Promotion rules (updated for 5-tier system)

- `raw → draft`: Any substantive content added (body > 100 chars or Tier 1 source exists)
- `draft → ready`: Body > 500 chars + all expected pipeline auto-blocks populated + 2+ Tier 1 source types + class analysis written + connections mapped + **no known-gap that references missing pipeline data, stale data, or a pending re-enrichment**. Pipeline can auto-promote when every gate passes.
- `ready → verified (A+)`: Everything in ready PLUS all four sub-tiers (A/B/C/D in § 2a). Janitor stamps `audit-a-plus-passed:` when automated checks clear, David adds `last-verified-by: editorial`. **Pipeline cannot auto-promote to this tier.**
- `verified → s-tier`: `angle:` + 3+ damning `exclusive-connections:` + `original-finding:` + `audit-s-tier-passed: true` (janitor) + `editorial-signoff-narrative:` (David). **Pipeline cannot auto-promote. Neither David's sign-off alone nor the janitor's audit alone is sufficient.**

**Hard rule: `ready` means David's sign-off is the only thing left for A+.**
If a profile has any of these, it is `draft` — not `ready`:
- Missing pipeline auto-blocks expected for its type
- `known-gaps` mentions "needs fresh pipeline run", "awaits pipeline", "not yet enriched", etc.
- `internal-notes` says data was stripped/contaminated and needs repopulation
- Any blocking issue Research Claude or Code Claude would need to fix before David could sign off
- Fewer than 2 Tier 1 source types
- Missing class analysis section

**Both Claudes must enforce this gate.** If Research Claude encounters a profile marked `ready` that fails any of the above, demote to `draft` and document the blocker in `editorial-notes`. Do not leave it at `ready` with a caveat.

**Hard rule: `verified (A+)` means David has signed off on investigative quality.**
A profile cannot reach A+ if any of the four sub-tiers fail. Research Claude cannot promote to A+; only David can, and only after the janitor's `--tier=a-plus` audit stamps `audit-a-plus-passed:`.

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
1. Rewrite to remove the unsourced assertion — **document every rewrite in the editorial review log** (what was changed and why, preserving the correction trail)
2. If the claim is critical and verifiable but not yet sourced, mark `(URL NEEDED)` — this demotes the profile from ready to draft
3. Add removed/rewritten claims to `corrections` frontmatter array for permanent audit trail

**URL fixing is Editor-only (David).**

Neither Research Claude nor Code Claude fixes, hunts, replaces, or verifies source URLs. David handles all URL work personally. This includes:
- Broken URL replacement (no URL searching, no substitute hunting)
- `(URL NEEDED)` tag resolution
- `(UNVERIFIED)` tag resolution
- Browser-based URL verification
- Running the `url-fixer` skill
- Any URL triage beyond flagging

**What both Claudes should do instead:**
- When you find a broken or missing URL, leave it tagged `(URL NEEDED)` or `~~strikethrough~~` it in the Archived section
- Document the gap in `known-gaps` frontmatter so the editor can see it
- Flag counts in Session State ("AOC has 5 URL NEEDED blocking verified promotion")
- **Never substitute a different URL, never search for replacements, never run url-fixer**

**Why:** David verifies URLs personally to ensure source integrity. Automated URL hunting by Claude risks citing wrong entities (the exact problem documented in CLAUDE.md under "Common mistakes to avoid" — wrong FEC IDs, title/URL mismatches, dead aggregators). URL verification is an editorial control, not a task to delegate.

**Pipeline Research Protocol (rule codified 2026-04-10).**

Before building, fixing, or significantly modifying any pipeline, BOTH Claudes must check `content/Pipeline Guide.md` first. The Pipeline Guide has cheatsheets for all 12 priority pipelines with API mechanics, identifiers, canonical URLs, known quirks, known incidents (our vault), quality signals, and fallback sources.

**When fixing an existing pipeline bug:**
1. Read the cheatsheet section first. Check "Known quirks" + "Known incidents (our vault)" + "Quality signals".
2. If the bug matches a documented pattern, use the documented fix approach.
3. If the bug is new, fix it, then **add an entry to "Known incidents (our vault)"** with root cause, fix commit, vault cleanup, and a quality-check rule.

**When building a NEW pipeline (API not in the Tier 1 checklist):**
1. **STOP.** Do not start implementation blind.
2. **Request Perplexity research from David** before writing code. Wait for results.
3. If research is provided, add it to Pipeline Guide following the existing cheatsheet format.
4. **If research cannot be found**, revert to common logic (generic REST conventions: offset/limit pagination, JSON, 429 handling, exponential backoff). Document the gap with a "No research available" warning. Document every quirk in "Known incidents (our vault)" as you learn it.
5. **Never build a pipeline without a cheatsheet section.** If you can't write the cheatsheet before coding, ask David for more information.

**Why:** On 2026-04-09 and 2026-04-10 we hit 6 pipeline bugs that could have been prevented with upfront research — A000383 fuzzy-match, DOJ API index-size, SAM.gov fuzzy name-match, NHTSA non-auto entity, redirect file enrichment, GovTrack stale cache. All 6 cost hours of diagnosis + retroactive vault cleanup on 95+177+6 profiles. Perplexity research up-front is far cheaper.

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

### Frontmatter is the ONLY source of truth for structured fields

**All structured profile data lives in YAML frontmatter. Never in body dataview inline fields (`field:: value`).**

This rule was adopted 2026-04-09 after a vault-wide cleanup discovered systemic dual-source data drift:
- **535 profiles** had inline `content-readiness:: ready` while frontmatter said `draft` (or vice versa)
- **632 profiles** had `related::` in the body containing completely different wikilinks from the frontmatter `related:` field (zero overlap on the sample)
- The two systems had no way to reconcile. Half of the relationship graph was hidden in body dataview fields that scripts and the site renderer couldn't see.

**Scope — these fields must ONLY appear in frontmatter, never as body `field::` lines:**
- `content-readiness`, `profile-status`, `research-status`, `readiness`
- `related`, `donors`, `opposes`, `politicians-funded`, `politicians-opposed`, `top-donors`
- `source-tier`, `source-types`, `corroboration-count`, `known-gaps`, `verified-blocks`
- `editorial-review-date`, `editorial-reviewer`, `editorial-result`, `editorial-blockers`, `last-verified-by`
- Any other schema field defined below

**Rules for both Claudes:**
1. When creating or editing a profile, put structured data in frontmatter. Never write `field:: value` inline in the body.
2. When reviewing a profile, if you find a body `field:: value` line, merge its content into frontmatter and delete the body line. Never leave both.
3. Scripts and pipelines (Code Claude's lane) must only read from and write to frontmatter for structured fields. Do not write to body inline fields, ever.
4. If you see `field:: value` anywhere in body text, it's a legacy bug to fix, not a pattern to preserve.

**Rules for David / Ops app:**
- The Ops app profile editor must write structured fields to frontmatter only.
- The Ops app must not create new body `field:: value` lines.
- Any existing ops scripts that populate inline dataview fields need to be updated to populate frontmatter.

**Exception:** Dataview `table` / `query` code blocks inside fenced ` ```dataview ` blocks are fine — those are queries for display, not data storage.

### YAML formatting for structured fields

Adopted 2026-04-10 after a merge-script bug on Tucker Carlson and Hillary Clinton broke the Quartz build for hours.

**Never use YAML folded-scalar (`>`, `>-`, `>+`) or literal-block (`|`, `|-`, `|+`) syntax on these frontmatter fields:**
- `related`, `donors`, `opposes`, `politicians-funded`, `politicians-opposed`, `top-donors`

**Always use one of these two valid formats:**

1. **Single-line quoted string with ` · ` separator (preferred for short-to-medium lists with aliases):**
```yaml
related: "[[Link 1]] · [[Link 2|Alias]] · [[Link 3]]"
```

2. **Block-style YAML list (preferred for structured data without aliases):**
```yaml
donors:
  - "Labor unions ($278K career)"
  - "Ideological donors"
  - "Small dollar grassroots"
```

**Why this rule exists:** YAML folded-scalar syntax (`related: >-` with indented continuation lines) is valid YAML and parses correctly on fresh reads, BUT any script that extracts the parsed value and re-writes it as a quoted string will capture the `>-` marker as LITERAL TEXT inside the new string. YAML then re-parses that text as another folded-scalar indicator, breaking the entire frontmatter block. This has happened twice (2026-04-09 and 2026-04-10) and cost hours of build-failure diagnosis.

**Preventive scan:** Before running any vault-wide frontmatter script, run this 3-second check to catch latent bombs:
```python
import re
PATTERN = re.compile(r'^(related|donors|opposes|politicians-funded|politicians-opposed|top-donors):\s*[>|][-+]?\s*$', re.MULTILINE)
# ... scan every .md file's frontmatter, report hits
```
If this scan returns any files, convert them to inline format before proceeding. Keep running this as a session-start sanity check.

### Frontmatter (required on every profile):
```yaml
title: Name
type: politician | state-politician | local-politician | donor | corporation | pac | think-tank | lobbying-firm | media-profile | event | story
content-readiness: raw | draft | ready | verified
source-tier: 1-4 (highest tier source in the file)
last-updated: YYYY-MM-DD
```

### Politician type taxonomy (three tiers, added 2026-04-11)

| `type:` value | Covers | Example | Pipeline behavior |
|--------------|--------|---------|-------------------|
| `politician` | Sitting or former **U.S. federal** officials — House, Senate, President, VP | Bernie Sanders, Nancy Pelosi, Donald Trump | Full: Congress.gov + GovTrack + FEC + Committee assignments all fire. Expects `bioguide-id`. |
| `state-politician` | Sitting or former **state-level** elected officials — Governors, Lt Governors, state legislators, state AGs, state treasurers, etc. | Roy Cooper (former NC Gov), Juliana Stratton (IL Lt Gov), Zach Wahls (IA state senate) | FEC fires if `fec-candidate-id` exists (federal campaign filings are legitimate). Congress.gov + GovTrack + Committee assignments are SKIPPED — no bioguide expected. Janitor exempts these from missing-auto-block checks. |
| `local-politician` | Sitting or former **municipal / county** elected officials — Mayors, city council, county commissioners, DAs, sheriffs, school board, etc. | Daniel Biss (Evanston Mayor), Donna Miller (Cook County Commissioner) | FEC fires only if they've filed federally. All federal-data pipelines otherwise SKIPPED. Janitor exempts. |

**Key rule:** Having `fec-candidate-id` does NOT make someone a federal officeholder. State and local politicians legitimately file with the FEC when running for federal office. The `type` field is about their actual office, not their filing history.

**Janitor handling:** `state-politician` and `local-politician` are in `EXEMPT_TYPES` in `scripts/pipeline-janitor.cjs`. The janitor will not flag them as zombies for missing Congress.gov or GovTrack auto-blocks because those pipelines don't run on them.

### Candidate tracking (optional field, added 2026-04-11)

A separate `candidate-for:` field marks anyone — of any `type:` — who is currently running for federal office but not yet elected. This is additive, not a replacement for `type:`.

```yaml
candidate-for: "US Senate 2026 (IL, Democratic primary)"
```

Valid on `state-politician`, `local-politician`, and `politician` (for incumbents running for higher office, e.g., a House member running for Senate). Remove the field once the election is decided — if they win, they become `politician` on the next sync; if they lose, they revert to their original type.

### Relationship fields (on profiles with connections):
```yaml
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

## 9. Automation Layers (Both Claudes)

The vault has three layers of background automation. Both Claudes must understand what's running so they don't duplicate work, run blocked scripts manually, or bypass gates without cause.

### 9a. Pre-commit gate (`.husky/pre-commit`)
Every `git commit` automatically runs:
1. **self-review-mirror**. Em dashes, banned AI vocabulary, defamation-prone words outside blockquotes, verified-profile regressions. Scans NEW lines only (via `git diff --cached`), not pre-existing content.
2. **yaml-sanity-scan**. Broken frontmatter blocks the commit.
3. **duplicate-bioguide-sentinel**. Politician ID collisions block the commit.

**Emergency bypass:** `SKIP_HOOKS=1 git commit ...` (documented bypass only). For intentional verified-profile regressions: `ALLOW_REGRESSION=1 git commit ...`.

**Claude must never reach for `SKIP_HOOKS=1` as a first response to a blocked commit.** Read the error, fix the real issue.

### 9b. Attention Queue (`/attention` ops page)
Five producer scripts write to a single ranked queue David reads daily. Producers live in `scripts/`:
- `voice-drift-detector`, `hallucination-catcher`, `promotion-candidate-queue`, `contradiction-miner`, `missing-profile-detector`

All producers write through `scripts/lib/attention-queue.cjs` `addEntries()`, which auto-filters entries against the false-positive log. **Never edit `content/Admin Notes/Attention Queue.md` directly.** It's regenerated by the helper on every write and your edits will be clobbered.

Rejected items are stored with a `(source|where|what)` signature so rejection is universal across all producers. David rejects from the UI; the next producer run filters that signature out.

### 9c. Attention Dispatcher (`scripts/attention-dispatcher.cjs`)
Node-cron daemon. Runs every producer on its own cadence (30 min to 2 hr). Serialized queue, 60-sec timeout per producer, log rotation at 1MB, top-level crash guards. Optional `HEALTHCHECKS_PING_URL` env var for external monitoring.

**When a producer misfires:** don't patch the dispatcher, patch the producer. The dispatcher is infrastructure; the producers are the intelligence.

Full docs for every script are at `/scripts` in the ops app under the **Intelligence / Attention Queue** and **Pre-Commit Gates** categories. Use that page as the canonical "what scripts exist and when do they run" reference.

---

## 10. Decisions Log

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
