---
title: "Session Timeline"
type: reference
content-readiness: raw
last-updated: 2026-04-02
source-tier: 1
parent: null
---

#session-log #vault-maintenance #handoff

---

**Purpose:** Running log of sessions — what was built, what editorial decisions were made, what's queued up.

**For manual sessions:** This is your primary context for session history, editorial direction, and current priorities. Read after CLAUDE.md, Quality Standards, and API Pipeline.

**For automated state runs:** Do NOT read this file. Use the [[Diff Log]] for context and [[State Engine Architecture]] for execution rules. This timeline is updated once daily during the 3 PM VALIDATION summary, not per-run.

**Core reference documents:** [[Quality Standards]] (source verification, readiness gates) · [[API Pipeline]] (data collection) · [[Research Methodology and Data Sources]] (analytical framework, research layers — reference only)

---

## Editorial Direction

**Core thesis:** Donors control politicians, not the other way around. The vault is organized around politicians for navigation, but the analytical backbone is donor-first. When we build a politician profile, we start with who funds them and what those funders got in return. Policy analysis follows from the money — not the other way around.

**Lens:** Class analysis. Every note asks: who benefits, who pays, and what structural function does this politician or policy serve for the donor class? The three custom callouts — `[!money]`, `[!contradiction]`, `[!quote]` — exist to surface these patterns visually.

**Placeholder convention:** When donor research surfaces a politician who doesn't have a full profile yet, we create a placeholder note with tags, `related:` links, key vault connections, and build-out priorities. These are breadcrumbs, not commitments — we come back to them when the vault's web of connections makes a full build worthwhile.

**Donor-first build order:** When expanding the vault, the priority sequence is:
1. Build or deepen donor nodes (follow the money)
2. Create politician placeholders as needed when donors point to them
3. Build full politician profiles only when multiple donor nodes converge on them
4. Policy sub-notes come last — they document what the money bought

---

## Obsidian Configuration

**Theme:** Minimal · **CSS:** `gp-base.css`, `gp-callouts.css`

**Active plugins (16, updated 2026-03-31):**
Advanced Canvas · Advanced Tables · Commander · Dataview · Excalidraw · Hover Editor · Metadata Menu · Periodic Notes · QuickAdd · Style Settings · Supercharged Links · Tag Wrangler · Tasks · Templater

**Templates:** Templater templates for Master Profile, Sub-Note, Donor Node, and Super PAC/Dark Money note types (see `templates/` folder). Use these when creating new vault notes to ensure schema compliance.

**For note anatomy, formatting rules, source tiers, and YAML schema:** See CLAUDE.md and [[Quality Standards]]

---

## Scheduled Tasks — State Engine (Active as of 2026-03-31)

| Task ID | Cron | State | Purpose |
|---------|------|-------|---------|
| `state-structuring` | `0 6 * * *` | STRUCTURING | Structural audit + fix pass |
| `state-node-build` | `0 9 * * *` | NODE BUILD | Single highest-priority profile expansion |
| `state-story` | `0 12 * * *` | STORY | Story discovery + content adaptation |
| `state-validate` | `0 15 * * *` | VALIDATION | Connection mapping + validation + daily summary |

**Previous tasks (20 total, all disabled):** See [[Rollback Record — Pre-State-Engine Tasks]] for full list and restore commands.
**Architecture:** See [[State Engine Architecture]] for state definitions, execution rules, and token optimization.
**Diff Log:** See [[Diff Log]] — primary context source for automated runs (replaces this timeline for that purpose).

---

## Archived Sessions

- **Sessions 1-29 (March 18-22):** [[Archive/Session History Archive]]
- **Sessions 30+ and all automated task entries (March 24-31):** [[Archive/Session History Archive]] (appended 2026-03-31 during state engine refactor; ~17,900 lines of automated entries)

---

## Session Log

### 2026-04-04 — API Pipeline Fix + Site Polish (David + Site Claude, manual session)

**State:** SYSTEM MAINTENANCE + SITE POLISH

**What was done:**

*Enrichment pipeline selection bug (critical fix):*
1. All 7 pipelines (fec, congress, propublica, sam, lda, usaspending, govtrack) were using `targets.slice(0, LIMIT)` which took the first N profiles alphabetically — same ~15 profiles forever, rest of 740-profile vault never touched.
2. Built `selectTargets()` helper in `scripts/lib/shared.cjs`: filters out already-enriched profiles (checks a per-pipeline yaml key), skips profiles in a 30-day not-found cache, shuffles remaining pool (Fisher-Yates), takes first N. Pipelines now rotate coverage across scheduled runs.
3. Fixed two follow-on bugs: `if (limit)` treating 0 as falsy (let 435 donors through when politicians exhausted budget); FEC budget needed 50/50 split between politicians and donors.
4. Added `continue-on-error: true` to workflow steps so a slow step (GovTrack) can't block the final commit step.
5. Parallelized all 7 pipelines into a single workflow step using background processes + `wait`. Wall time: 26min sequential → ~6-8min parallel. Bumped limits on fast pipelines (FEC/Congress/ProPublica: 15→30, LDA: 10→20). SAM/USASpending/GovTrack kept low (slow APIs).
6. Added `actions/cache@v4` persistence for `reports/` dir so not-found caches survive across workflow runs.
7. Full vault saturation projected in ~1 week (was ~2 weeks).

*Site polish:*
8. Listing pages got a filter bar: Profiles/Notes toggle (splits master profiles from story sub-notes with counts), plus T1-T4 source-tier chips when multiple tiers are present. Client-side, persists across nav.
9. Content-readiness indicator extended with text label (RAW/DRAFT/DEV) next to the dot for non-ready profiles. Green "ready" dots stay small and unlabeled.

**Files modified:**
- `donor-map-engine/scripts/lib/shared.cjs` (added selectTargets helper)
- `donor-map-engine/scripts/{fec,congress,propublica,sam,lda,usaspending,govtrack}-pipeline.cjs`
- `donor-map-engine/.github/workflows/api-enrichment.yml`
- `donor-map-site/quartz/components/PageList.tsx`
- `donor-map-site/quartz/components/pages/{FolderContent,TagContent}.tsx`
- `donor-map-site/quartz/styles/custom.scss`

**Commits:**
- engine: `ccd1585` (selectTargets helper + 7 pipelines)
- engine: `8c98762` (limit=0 falsy fix + FEC budget split)
- engine: `47f1948` (continue-on-error)
- engine: `3b97d60` (parallelize + bump limits)
- site: `c1da0bf6` (listing filter + readiness labels)

**Next priorities:**
1. Check next automated enrichment run hits the expected diverse set of profiles (not the same 15 as before)
2. Continue site audit/polish pass — check issues.md pages, individual profile pages for visual consistency
3. Consider building a public "Vault Dashboard" view showing readiness/tier distributions across the whole vault

---

### 2026-03-31 — State Engine Refactor (David, manual session)

**State:** SYSTEM REFACTOR
**What was done:**
1. Designed state-driven execution model — 5 states replacing 20 independent tasks
2. Disabled all 19 enabled scheduled tasks
3. Created 4 new state-driven scheduled tasks (STRUCTURING, NODE BUILD, STORY, VALIDATE)
4. Created Diff Log (`topics/Vault Maintenance/Diff Log.md`) — rolling change log, primary context for automated runs
5. Created Rollback Record (`topics/Vault Maintenance/Rollback Record — Pre-State-Engine Tasks.md`) — full restore instructions
6. Archived ~17,900 lines of automated entries from this timeline to Session History Archive
7. Compressed Session Timeline from 17,945 lines to ~120 lines

**Files created:**
- `topics/Vault Maintenance/State Engine Architecture.md`
- `topics/Vault Maintenance/Diff Log.md`
- `topics/Vault Maintenance/Rollback Record — Pre-State-Engine Tasks.md`

**Key metrics (before → after):**
- Scheduled tasks: 20 (19 enabled) → 4
- Automated runs per day: ~50+ → 4
- Context tokens per automated run: ~25,000 → ~3,000
- Session Timeline size: 17,945 lines → ~120 lines

**Next priorities:**
1. Run each new state task once manually to pre-approve tool permissions
2. Monitor first full automated cycle (tomorrow 6 AM → 3 PM)
3. Confirm Diff Log is being written to correctly by automated runs

---

### 2026-03-31 — Vault Architecture Resolution + Skill Patches (David, manual session)

**State:** SYSTEM REFACTOR (continued from State Engine Refactor session)
**What was done:**
1. Identified and resolved 6 cross-document contradictions across governing documents (CLAUDE.md, Quality Standards, API Pipeline, State Engine Architecture, Session Timeline, Publish Roadmap)
2. Established document precedence hierarchy (8 levels) — added to CLAUDE.md
3. Stripped duplicated content: Research Methodology (~108 lines removed), Session Timeline (~50 lines removed) — saves ~3,000+ tokens per session
4. Created unified rules: API-first fallback hierarchy, scoped READY gate (content vs. system files), data layer vs. analysis layer boundary, FEC individual contributions citation exception, system completion terminology
5. Fixed State Engine diagram (STRUCTURING had "URL verify" — moved to VALIDATION scope)
6. Patched all 3 skills (profile-builder, donor-research, vault-audit) to align with new architecture: correct doc paths, API-first rule, Quality Standards canonical references, CLAUDE.md temporal mapping table column names
7. Updated vault index with 14 files missing since Session 48
8. Cleaned up Skill Patches delivery folder

**Files created:**
- `topics/Vault Maintenance/Vault Standards Resolution - 2026-03-31.md` — master record of all 6 contradictions and resolutions
- `topics/Vault Maintenance/Skill Patch Queue - 2026-03-31.md` — exact patch specs for skills

**Files modified:**
- CLAUDE.md (precedence hierarchy, automated run path, readiness gate reference)
- `topics/Vault Maintenance/Quality Standards.md` (scoped READY gate, API fallback hierarchy)
- `topics/Vault Maintenance/API Pipeline.md` (FEC individual contributions exception)
- `topics/Vault Maintenance/State Engine Architecture.md` (diagram fix, data/analysis layer boundary)
- `topics/Vault Maintenance/Session Timeline.md` (stripped duplicates, scoped role)
- `topics/Vault Maintenance/Research Methodology and Data Sources.md` (stripped ~108 lines of duplicated content)
- `topics/Vault Maintenance/Publish Roadmap - The Donor Map Database.md` (completion terminology)
- `topics/Vault Maintenance/Diff Log.md` (21 new entries)
- `topics/_VAULT_INDEX.md` (14 files added)
- `.claude/skills/profile-builder/SKILL.md` (5 patches)
- `.claude/skills/donor-research/SKILL.md` (3 patches)
- `.claude/skills/vault-audit/SKILL.md` (2 patches)

**Key architectural decisions:**
- Single-source-of-truth: each rule lives in exactly one document; all others reference it
- Quality Standards owns all readiness gates, source verification, citation format
- CLAUDE.md owns structure, schema, formatting, analytical patterns
- API Pipeline owns endpoints and query patterns
- State Engine owns automation execution rules
- Higher-number documents never override lower-number documents

**Next priorities:**
1. Monitor next automated cycle to confirm state engine reads new architecture correctly
2. First full vault audit using patched vault-audit skill
3. Resume content work from Publish Roadmap current phase

---

### 2026-03-31 — Cuba/Defense Cluster Deep Dive (David, manual session)

**State:** CONTENT BUILD — Cuba/Defense/Sugar Cluster
**What was done:**
1. Received and verified Gemini intelligence data on Operation Southern Spear, Fanjul/sugar connections, LARA Fund, MasTec, and Cuba 2026 blockade — ~70% confirmed, ~15% plausible/unverified, ~15% fabricated/corrected
2. Built new Rubio sub-note: **Operation Southern Spear and the Cuba Fuel Blockade** (~200 lines, 20 sources) — full timeline from Jan 2025 naval expansion through March 31 Russian tanker exception, 3 donor clusters mapped, OFAC FAQ 1238 "wedge" analysis, humanitarian cost documentation
3. Upgraded Rubio master profile — added Cuba 2026 section, new donor wikilinks (MasTec, LARA Fund), cluster cross-references
4. Built 2 new donor nodes: **MasTec / Mas Canosa Family** (infrastructure/construction, ~120 lines) and **LARA Fund / Claver-Carone** (private equity revolving door, ~140 lines)
5. Built 6 new politician master profiles: **Mario Diaz-Balart** (Appropriations/sugar/Cuba legislative shield, ~160 lines), **Bob Menendez** (SFRC corruption/Cuba/Egypt bribery, ~170 lines), **Maria Elvira Salazar** (exile communicator, Cuba spy donor scandal), **Carlos Gimenez** (Crowley Maritime double standard, MasTec donor), **Debbie Wasserman Schultz** (Both-Sides Illusion — sugar/AIPAC bipartisan proof), **Mike Waltz** (NSA, Metis Solutions revolving door, $92M defense contractor sale)
6. Upgraded 3 existing profiles with Cuba cluster cross-references: **Rick Scott**, **Brian Mast**, **Ted Cruz** — added Fanjul, Rubio, Diaz-Balart, and Operation Southern Spear wikilinks

**Files created (9):**
- `topics/Politicians/Republicans/Trump Cabinet/Marco Rubio/Operation Southern Spear and the Cuba Fuel Blockade.md`
- `topics/Donors & Power Networks/Real Estate/MasTec - Mas Canosa Family.md`
- `topics/Donors & Power Networks/Dark Money/LARA Fund - Mauricio Claver-Carone.md`
- `topics/Politicians/Republicans/House/Mario Diaz-Balart/_Mario Diaz-Balart Master Profile.md`
- `topics/Politicians/Democrats/Senate/Bob Menendez/_Bob Menendez Master Profile.md`
- `topics/Politicians/Republicans/House/Maria Elvira Salazar/_Maria Elvira Salazar Master Profile.md`
- `topics/Politicians/Republicans/House/Carlos Gimenez/_Carlos Gimenez Master Profile.md`
- `topics/Politicians/Democrats/House/Debbie Wasserman Schultz/_Debbie Wasserman Schultz Master Profile.md`
- `topics/Politicians/Republicans/Trump Cabinet/Mike Waltz/_Mike Waltz Master Profile.md`

**Files modified (4):**
- `topics/Politicians/Republicans/Trump Cabinet/Marco Rubio/_Marco Rubio Master Profile.md` (Cuba 2026 section, new wikilinks, updated date)
- `topics/Politicians/Republicans/Senate/Rick Scott/_Rick Scott Master Profile.md` (Cuba cluster cross-references)
- `topics/Politicians/Republicans/House/Brian Mast/_Brian Mast Master Profile.md` (Cuba cluster cross-references)
- `topics/Politicians/Republicans/Senate/Ted Cruz/_Ted Cruz Master Profile.md` (Cuba cluster cross-references)

**Key findings:**
- Operation Southern Spear: 47+ lethal kinetic strikes, ~156-163 deaths, Cuba grid collapse March 16
- OFAC FAQ 1238 creates privatization-through-fuel-starvation mechanism — fuel to private sector only
- Claver-Carone revolving door: NSC → IDB → Special Envoy → LARA Fund ($750M targeting "distressed" LatAm assets)
- Diaz-Balart is top congressional sugar industry recipient; controls NSRP subcommittee (State Dept funding)
- Menendez convicted on 16 counts including acting as unregistered foreign agent — while controlling Cuba policy via SFRC
- Waltz sold Metis Solutions for $92M before Afghanistan withdrawal; SIGAR found "few to none" deliverables met
- Wasserman Schultz proves Both-Sides Illusion: same sugar PACs + AIPAC money as Republican Cuba hawks

**Gemini data corrections:**
- Fanjul $9.25M figure: unverified, likely overstated (OpenSecrets shows $2.9M Fanjul Corp 2024 cycle)
- "Donroe Doctrine": fabricated name (no results)
- Norman Braman → Inspire America link: no evidence
- Joe Russell = Idaho Forest Group: unverified employer attribution

**Vault metrics update:**
- New files: 9
- Modified files: 4
- All new files at `developed` status — need Chrome URL verification + FEC API passes for promotion to `ready`
- Estimated vault total: ~1,356 files (1,219 ready + 137 below ready)

**Chrome status:** Unavailable this session (tab grouping error). All API data marked (API DATA PENDING). All non-API URLs verified via WebSearch where possible. Non-API work (analysis, wikilinks, formatting) proceeded normally per Quality Standards fallback hierarchy.

**Next priorities:**
1. Chrome session to run FEC API verification on Fanjul individual contributions, Mas family contributions, Diaz-Balart sugar PAC totals, AIPAC contributions for Salazar/Gimenez
2. URL verification pass on all 9 new files (developed → ready promotion)
3. Build sub-notes for Diaz-Balart (LIBERTAD Act/Appropriations) and Waltz (Metis Solutions deep dive)
4. Investigate Bacardi trademark legislation status for Cuba cluster
5. Continue source integrity pass on existing 55 files

---

### 2026-03-31 — URL Fixer Skill + Governance Updates (David, manual session)

**State:** SYSTEM REFACTOR (continued)
**What was done:**
1. Identified gap in Research Methodology — three parallel pipeline sections (Media, Think Tanks, Lobbying) had section-specific research layers not represented in the methodology
2. Added "Section-Specific Research Layers" section to Research Methodology with pointers to each Framework file (no content duplication)
3. Added Senate LDA filings and IRS 990 data sources to Research Methodology's External Databases list
4. Designed and built `url-fixer` skill — single-URL-per-run repair pipeline: API triage → WebSearch → Chrome verification gate → write → audit log
5. Live-tested skill on Akin Gump (3 UNVERIFIED citations → all verified via Chrome, tags removed, logged)
6. Integrated url-fixer into VALIDATION state — updated State Engine Architecture Phase 0 to reference the skill pipeline
7. Updated `state-validate` scheduled task prompt to invoke url-fixer for 1-3 URLs per automated run
8. Added URL Repair Protocol to Quality Standards — canonical remediation steps (API triage, search, Chrome gate, single-pass rule)

**Files created:**
- `.claude/skills/url-fixer/SKILL.md` (installed as skill)

**Files modified:**
- `topics/Vault Maintenance/Research Methodology and Data Sources.md` (section-specific research layers, new data sources)
- `topics/Vault Maintenance/State Engine Architecture.md` (VALIDATION Phase 0 updated with url-fixer pipeline)
- `topics/Vault Maintenance/Quality Standards.md` (URL Repair Protocol added)
- `topics/Vault Maintenance/Source URL Audit Log.md` (3 Akin Gump URLs logged as VALID)
- `topics/Lobbying Firms & K Street/Akin Gump Strauss Hauer & Feld.md` (3 UNVERIFIED tags removed)
- `topics/Vault Maintenance/Session Timeline.md` (this entry)

**Source integrity progress:** 7 UNVERIFIED → 4 UNVERIFIED (3 cleared in Akin Gump). 48 URL NEEDED unchanged.

**Next priorities:**
1. Run `state-validate` manually once to pre-approve tool permissions for url-fixer integration
2. Test url-fixer on a `(URL NEEDED)` file (harder case — requires search + verify, not just verify)
3. Continue source integrity pass — clear remaining 4 UNVERIFIED files
4. Monitor first automated VALIDATION cycle with url-fixer

---

### 2026-03-31 — Thin Profile Expansion: Lennar Corporation (automated, thin-profile-expansion task)

**State:** NODE BUILD
**What was done:**
1. Scanned vault for thin profiles: all 23 "raw" files are redirect stubs (functioning as intended — skipped)
2. Identified thin "ready" files under 60 lines in Politicians/ and Donors & Power Networks/ — found 40+ candidates
3. Selected **Lennar Corporation** (33 lines, marked "ready" but only had Who They Are + Sources — missing 5 of 7 required donor node sections)
4. Researched via web search: OpenSecrets data, FEC Stuart Miller shell company scandal (Tread Standard LLC), Florida state lobbying (Jason Garcia/Seeking Rents investigative series), NAHB BUILD-PAC, Hunters Point Shipyard contamination, federal tax rebate lobbying
5. Verified 7 URLs via WebFetch (all VALID), 5 OpenSecrets/FEC URLs marked KNOWN VALID (standard patterns), 1 Ballotpedia URL UNVERIFIED
6. Expanded from 33 lines to ~200 lines with full sections: Who They Are, What They Want (federal + Florida state), Who They Fund (incl. Tread Standard LLC dark money scandal), What They've Gotten, Donation-to-Policy Timeline, Hunters Point environmental racism section, Class Analysis
7. Updated YAML: content-readiness ready → developed, last-updated → 2026-03-31
8. Logged all URLs in Source URL Audit Log
9. Updated Diff Log

**Key findings:**
- Stuart Miller created a Delaware shell company (Tread Standard LLC) specifically to make anonymous political contributions — $275K total to Jeb Bush, Herschel Walker, and Carlos Gimenez Super PACs. FEC dismissed the case April 2025 with no penalty.
- Lennar's Florida lobbying operation literally writes legislation: SB 812 (fast-track permitting) was authored by Lennar lobbyists and filed by Rep. Tiffany Esposito as her own bill
- 2009 political spending quintupled to $1.1M preceding $1.5B in federal tax rebates (1,364:1 ROI)
- Hunters Point Shipyard: ~350 homes sold at ~$1M each on contaminated former naval shipyard; $6.3M settlement ($18K/household)

**Status change:** ready → developed (was incorrectly marked ready; now fully sectioned but needs remaining URL verification for promotion)

**Files modified:**
- `topics/Donors & Power Networks/Real Estate/Lennar Corporation.md`
- `topics/Vault Maintenance/Source URL Audit Log.md`
- `topics/Vault Maintenance/Diff Log.md`
- `topics/Vault Maintenance/Session Timeline.md`

**Note:** OpenSecrets ID corrected from D000048706 (previous file) to D000053016 (verified via web search as the correct Lennar Corp org ID on OpenSecrets)

---

### 2026-03-31 — Daily Summary

| State | Files Modified | Key Changes |
|-------|---------------|-------------|
| STRUCTURING | 2 files | Blackstone Real Estate: 2 bold headers → ###. Invitation Homes: 2 bold headers → ###. NAR flagged for type review. |
| NODE BUILD | 2 files | Lennar Corporation: expanded 33→200 lines, full donor node sections (raw→developed). Cryptocurrency Industry: added What They've Gotten + Timeline, corrected Fairshake total to $260M (developed→ready). |
| STORY | 1 file | 2026-03-31 Story Discovery: 4 stories classified (1 Diamond, 2 Gold-new, 1 Gold-update, 1 Silver). Crossover flag: crypto Both-Sides Illusion. |
| CONNECTION MAPPING | 12 files | Lennar: 6 outgoing links added, reciprocals in NAR, Blackstone, Invitation Homes, DeSantis, Newsom. Crypto Industry: 6 reciprocal links added (Fairshake PAC ×2, Winklevoss Twins, Coinbase, Crypto Industry Bloc, Marc Andreessen & Horowitz). |
| VALIDATION | 5 files | BGR Group: 3 UNVERIFIED URLs Chrome-verified → tags removed. Cryptocurrency Industry: 7/7 URLs verified, content gates pass, 2 broken wikilinks fixed — **ready status confirmed**. Cornerstone Gov Affairs: 2 UNVERIFIED URLs Chrome-verified (cgagroup.com press releases) → tags removed. MasTec: OpenSecrets org ID corrected (D000037223→D000035672, was mapping to Rose Assoc) + Chrome-verified. All 3 logged to Source URL Audit Log. |

**System changes today:** State Engine Architecture created. 20 tasks → 4 state-driven tasks. Diff Log created. Vault Standards Resolution published (6 cross-doc contradictions resolved). 3 skills patched (profile-builder, donor-research, vault-audit). CLAUDE.md/Quality Standards/API Pipeline/Session Timeline patched for consistency.

Next priorities:
- NAR type field review (flagged: `corporation` may be incorrect — lobbying org → `donor`)
- Booker-Scott Donor Class Mirror: 12 UNVERIFIED URLs (all standard Tier 1-2 sources, likely quick Chrome verifications)
- Thom Tillis IP & Banking Donor Pipeline: 5 UNVERIFIED URLs (Sludge, Axios ×2, American Prospect, IPWatchdog)

---

### 2026-04-01 — Batch Processing: Koch/Real Estate/Fossil Fuel/Manchin/Epstein (David, manual session)

**State:** CONTENT BUILD — Deep research integration across 5 research batches + Epstein vault buildout + vault cleanup

**What was done:**

*Koch Network batch (3 uploads → 4 vault targets):*
1. DonorsTrust expanded 117→~1,100 lines (corrected EIN, tax status, added founding narrative, 15-year 990 financials, 14 recipient org histories, Format 4 money flow table)
2. ALEC expanded 231→526 lines (Koch funding timeline, model legislation pipeline, Brookings stats, SPN integration)
3. Koch Network - Charles Koch expanded 665→969 lines (two passes: TCJA ROI, EPA rollbacks, Paris withdrawal, climate denial infrastructure $168.4M)
4. Koch Industries expanded 448→649 lines (two passes: Flint Hills refinery detail, Koch Pipeline, Koch Minerals petcoke, KAES Wever acquisition)

*Real Estate batch (1 upload → 5 vault targets):*
5. NAR expanded 125→~319 lines (15-year lobbying table, RPAC bipartisan split, APOA dark money)
6. Blackstone Real Estate expanded 51→~165 lines ($315.4B RE AUM, Invitation Homes, BREIT, anti-rent-control spending)
7. Stephen Schwarzman expanded 105→~145 lines (~$40M personal 2024, Trump pivot timeline)
8. REBNY expanded 52→~131 lines ($21.7M 2014 cycle, Glenwood/Litwin shell companies, 421-a ROI)
9. Invitation Homes expanded 60→~189 lines (86K→94K homes, Blackstone origin, NRHC, 32 states preemption)

*Fossil Fuel batch (3 uploads → 5 vault targets):*
10. ExxonMobil expanded 210→~343 lines (13-cycle PAC table, 25-year lobbying $293M, climate knowledge timeline, denial funding $33.8M)
11. API expanded 145→~850 lines (25-year lobbying $141.5M, $252M budget, dark money, 1998 Victory Memo, 17-row timeline)
12. Chevron expanded 89→~240 lines (two passes: 13-cycle PAC table $58.2M, 15-year lobbying, Richmond refinery, CA climate policy)
13. ConocoPhillips expanded 50→~280 lines (two passes: full PAC/lobbying tables, Willow Project, Lundquist revolving door, Marathon Oil acquisition)
14. Marathon Petroleum expanded 49→~320 lines (two passes: Andeavor $23B merger, covert anti-EV 7-tactic campaign, FEC fine, AFPM)

*Manchin batch (1 upload → 3 vault targets):*
15. Joe Manchin Master Profile updated (cycle-by-cycle fossil fuel donation table, career totals $1.2M+)
16. Enersystems sub-note updated (year-by-year income, Farmington Resources, Grant Town health damages)
17. BBB Kill sub-note updated (14-company donor table, Q3 2021 donors, IRA 6 concessions, Energy Committee power moves)

*Epstein vault buildout (1 upload → 9 new investigation files):*
18. Created 9 files in GP-Epstein-Research/Active-Investigation/ (1,460 lines total): Political Donations, Access Network, 2008 NPA, Philanthropy, Wexner Pipeline, Clinton, Trump, Intelligence, Post-Arrest Fallout
19. Updated Active-Investigation/00-INDEX.md and Verification Log (Entry 10)

*Vault cleanup:*
20. Deleted 6 files: 2 empty Untitled.md stubs, 1 empty Edit Flags.md, 2 duplicate Excalidraw drawings, 1 Section 4 redirect stub in epstein_vault
21. Audited 17 redirect nodes — all intentional wikilink resolvers, kept
22. Fixed Obsidian Publish hash mismatch on Koch Network and Marathon Petroleum files

**Status changes:** 15 files downgraded ready→developed (UNVERIFIED URLs added). 2 files stayed developed (Koch Network, Koch Industries). Estimated ready count: ~1,204. UNVERIFIED URL count significantly increased across all modified files.

**Next priorities:**
1. Chrome URL verification pass on highest-impact UNVERIFIED files
2. Think tank expansion — deep dives on donor-funded policy opposition (Medicare for All, nationalization, etc.)
3. Continue source integrity pass
4. Blackstone Real Estate Political Operation consolidation review

---

### Session 10 — April 1, 2026 (continued)

**Context:** Continuation of Session 9 after context compaction. Picked up the Mercatus Center research merge that was pending.

**Work completed:**

*Think Tank Policy Kill Map — Mercatus Center (1 upload → 1 vault target):*
1. Merged `mercatus-center-investigation.md` (362 lines of deep research) into existing Mercatus Center profile
2. Profile expanded from 181→389 lines — the first "Policy Kill Map" expansion
3. Added new `### Policies Donors Pay to Kill` section with 5 policy domains:
   - **Labor Deregulation:** 4 named anti-minimum-wage papers, overtime protection opposition, OSHA enforcement weakening, gig worker classification opposition, Koch/Georgia-Pacific safety violations (527→644 injuries, 6 deaths, $648K OSHA fine)
   - **Healthcare Deregulation:** Blahous M4A $32.6T study with buried $2.054T savings finding and media deployment strategy, 3 ACA opposition papers, CON law repeal campaign
   - **Environmental & Climate Deregulation:** 2001 climate denial comment, Wendy Gramm 2002 "hit list" (44 CAA regs, OMB adopted 14/23), Clean Power Plan, CAFE, pesticides. Koch Industries $718M+ violation table (10 entries across subsidiaries)
   - **Financial Deregulation:** 3 Dodd-Frank papers, CFPB "menace" characterization, Wendy Gramm-Enron connection (CFTC→Enron board→Mercatus→Enron Loophole→CFMA 2000→2008 crisis), Hester Peirce SEC placement, S.2155 rollback
   - **DOGE Partnership 2025-2026:** Cicero Institute citations, Keith Hall CBO connection, de Rugy critique arc (support→confusion→"$150B not $2T"→structural), Cato documenting spending increased $248B
4. Expanded `### Who Funds Them` with: FY2011-2024 revenue table ($11.7M→$50.1M peak→$39.3M), complete donor landscape table (13 entities, GMU Foundation $51M top), detailed 2018 FOIA (10 agreements, 2/5 Koch committee seats, pressure clause, Cabrera admission, post-reform status)
5. Expanded `### The Policy Pipeline` with: McLaughlin July 2016 testimony detail, EO 13771 cost savings table (FY2017-2019, $50.9B cumulative claimed), Susan Dudley Mercatus→OIRA revolving door, Brookings methodology critique
6. Expanded timeline with 20+ new entries
7. Expanded Revolving Door with Dudley, Hall, Gramm additions
8. 35+ new sources added, all marked (UNVERIFIED)
9. Status downgraded ready→developed (UNVERIFIED URLs)
10. Updated Think Tank Index (Mercatus entry, section status line)

**Status changes:** Mercatus Center downgraded ready→developed. Think tank section now 24/25 profiles ready, 1 developed.

**Estimated vault metrics:**
- Ready count: ~1,203 (1 additional downgrade from ~1,204)
- Think tank section: 24/25 ready + 3/4 cross-comparison ready

**Next priorities:**
1. Process remaining 4 think tank research uploads when David runs them (Cato, AEI, Brookings, Heritage)
2. Chrome URL verification pass on Mercatus Center (35+ UNVERIFIED)
3. Chrome URL verification on other high-impact UNVERIFIED files
4. Blackstone Real Estate Political Operation consolidation review

---

### 2026-04-01 — Daily Summary

| State | Files Modified | Key Changes |
|-------|---------------|-------------|
| STRUCTURING | 0 | Clean pass — 10 files scanned, zero errors. |
| NODE BUILD | 1 file | DMFI - Democratic Majority for Israel: added ### What They Want (5 policy goals) + ### Donation-to-Policy Timeline (Format 2, 8 rows, [!money] callout). 149→194 lines. Status remains developed (UNVERIFIED URLs block promotion). |
| STORY | 1 file | 2026-04-01 Story Discovery: 5 stories classified (3 Gold, 2 Silver). AIPAC Illinois primary $22M, AI super PAC network emergence ($100M+$65M), Public Citizen 100+ enforcement cases. Crossover flag: a16z funds both crypto + AI PACs across both parties. Chrome unavailable — all URLs marked (UNVERIFIED). |
| CONNECTION MAPPING | 5 files | DMFI: added UDP + Jamaal Bowman to related:. UDP: added reciprocal DMFI. AIPAC: added reciprocal DMFI. Jamaal Bowman: added DMFI to related:. 5 reciprocal links added. |
| VALIDATION | 1 file assessed | DMFI content-readiness gates: 182 lines ✓, 10 sources ✓, 10 sections ✓, class analysis ✓, timeline ✓, [!money] ✓, [!contradiction] ✓. **BLOCKER: 6/10 URLs UNVERIFIED — ready promotion blocked.** Structural flag: malformed wikilink-in-tag on line 11 (pre-existing). Chrome unavailable — no URL verification possible. |

**Chrome status:** Unavailable all 4 runs (tab grouping error). URL repair (Phase 0) and URL verification skipped. All new URLs marked (UNVERIFIED).

Next priorities:
- Chrome session to clear DMFI 6 UNVERIFIED URLs (Wikipedia, DMFI.org ×2, Sludge, Ryan Grim Substack, Times of Israel)
- NAR type field review (flagged 2026-03-31: `corporation` may be incorrect → `donor`)
- DMFI line 11 malformed tag fix (wikilink embedded in hashtag)
- Mercatus Center 35+ UNVERIFIED URLs
- Continue source integrity pass on high-impact UNVERIFIED files

---

### 2026-04-04 — Daily Summary

| State | Files Modified | Key Changes |
|-------|---------------|-------------|
| STRUCTURING | (6 files scanned) | Clean pass on all files modified since 2026-04-03. Zero YAML errors, zero header violations, zero wikilink issues. Flagged: DMFI + Wall Street Finance Networks `entity-type: "Individual Donor"` likely incorrect (PAC/org + network node). No change per stop rule. |
| NODE BUILD | Wall Street Finance Networks.md | Added Top Individual Contributors 2024 Cycle table (5 donors, $495M: Mellon $197M, Griffin $108.5M, Yass $101.5M, Schwarzman $46.8M, Hoffman $41.5M) + [!money] callout on post-Citizens United concentration. Added Revolving Door table (7 Goldman/Wall Street → Treasury/WH/SEC: Rubin, Paulson, Geithner, Cohn, Mnuchin, Clayton, Bessent). Fixed entity-type flag → "Network". 120 → 180 lines. draft → developed. |
| STORY | 2026-04-04 Story Discovery.md | 6 items + 1 crossover flag (2 Gold new: Herrera Velutini $3.5M straw-donor → Jan 2026 pardon, Musk $10M KY Senate; 2 Gold updates: Trump PACs $400M 2025, Walczak pardon pipeline $2B; 2 Silver). Chrome unavailable — all URLs UNVERIFIED. Sub-Op 3 skipped (Saturday). |
| CONNECTION MAPPING | Goldman Sachs, JPMorgan Chase | Added reciprocal `[[Wall Street Finance Networks]]` to both (`related:` fields). 2 reciprocal links added. |
| VALIDATION | Wall Street Finance Networks.md | YAML/footer MISMATCH fix: YAML `draft` → `developed` (NODE BUILD left YAML stale). Content gates pass for developed (180 lines, 4 sources, 7 sections, class analysis, Format 2 timeline, 2 [!money] + 1 [!contradiction]). **Ready promotion BLOCKED:** 1 UNVERIFIED + 2 URL NEEDED remain. Chrome unavailable — no URL verification attempted. |

**Chrome status:** Unavailable (tab grouping error) — VALIDATION URL verification aborted per stop rule. All URL fixes deferred to next Chrome-available run.

Next priorities:
- Wall Street Finance Networks — 1 UNVERIFIED + 2 URL NEEDED (unblock developed → ready when Chrome available)
- DMFI + Wall Street Finance Networks entity-type review (both flagged 2026-04-04)
- NAR type field review (flagged 2026-03-31)
- Mercatus Center 35+ UNVERIFIED URLs
- 2026-04-01 / 04-02 / 04-03 / 04-04 Story Discovery UNVERIFIED URL clearance
- Eric Schmidt 11 UNVERIFIED URLs
- Google - Alphabet 17 UNVERIFIED URLs

---

### 2026-04-03 — Daily Summary

| State | Files Modified | Key Changes |
|-------|---------------|-------------|
| STRUCTURING | DMFI.md (+ 8 others scanned) | 1 error found: DMFI YAML `ready` mismatched footer `developed` — corrected YAML to `developed`. All other files clean. |
| NODE BUILD | Wall Street Finance Networks.md | Expanded raw stub (24 lines) to full donor node (~120 lines). Added Who They Are, What They Want, Who They Fund, Timeline (Format 2, 7 rows), Class Analysis. 3 sources (2 Tier 1 OpenSecrets). FEC API rate-limited — used OpenSecrets aggregates. raw → draft. |
| STORY | 2026-04-03 Story Discovery.md, 2026-04-03 Follow the Money Weekly.md | Discovery: 6 items (2 Gold new: AIPAC IL $22M reckoning + Fago pardon-donation $1M→20 days; 2 Gold updates; 1 Silver update; 1 Silver new). Weekly roundup compiled (Friday). Chrome unavailable at story run — all URLs UNVERIFIED. |
| CONNECTION MAPPING | 3 files | DMFI reciprocal links: Cori Bush Master Profile (related:), Reid Hoffman (related:), DMFI outgoing (added Bush + Hoffman). 4 reciprocal links added. |
| VALIDATION | DMFI - Democratic Majority for Israel.md | URL REPAIR: 6 UNVERIFIED → VALID (Wikipedia, demmajorityforisrael.org, dmfipac.org, Sludge, Ryan Grim, Times of Israel). FULL VALIDATION: 10/10 URLs Chrome-verified. All gates pass (191 lines, 10 sources, 10 sections, class analysis, Format 2 timeline). Fixed malformed wikilink-in-tag. **Promoted developed → ready.** |

**Chrome status:** Available for 3 PM VALIDATION run. NODE BUILD and STORY ran without Chrome (9 AM / 12 PM).

Next priorities:
- NAR type field review (flagged 2026-03-31: `corporation` may be incorrect → `donor`)
- Wall Street Finance Networks.md — 2 URL NEEDED tags, unblocking draft → developed
- Mercatus Center 35+ UNVERIFIED URLs (large batch — multi-session)
- 2026-04-01 / 2026-04-02 / 2026-04-03 Story Discovery UNVERIFIED URL clearance
- Eric Schmidt 11 UNVERIFIED URLs
- Google - Alphabet 17 UNVERIFIED URLs

---

### 2026-04-02 — Daily Summary

| State | Files Modified | Key Changes |
|-------|---------------|-------------|
| STRUCTURING | (not scheduled today) | — |
| NODE BUILD | NORPAC.md | Added Donation-to-Policy Timeline (Format 2, 8 rows), expanded What They Want (6 priorities), expanded Who They Are (founding details, Chouake leadership), added Historical Growth table (7 cycles FEC API), added Operational Model section, [!money] callout. 5 new sources. 103→153 lines. |
| STORY | 2026-04-02 Story Discovery.md | 8 items classified (3 Gold new: MAGA Inc $305M pipeline, tariff exemptions as payback, anti-AIPAC counter-PAC; 2 Gold updates: AIPAC shell PAC dark money, Public Citizen $3.1B; 2 Silver; 1 Crossover flag). Chrome unavailable at story run — all URLs UNVERIFIED. |
| CONNECTION MAPPING | 7 files | NORPAC reciprocal links: AIPAC, DMFI, Republican Jewish Coalition, UDP, Miriam Adelson, Jamaal Bowman (related:), Ritchie Torres (donors:). 7 reciprocal links added. |
| VALIDATION | NORPAC.md | URL REPAIR: 3 UNVERIFIED → VALID (norpac.net, Scribd Jewish Standard, Jewish Standard Huckabee). FULL VALIDATION: 12/12 URLs Chrome-verified. All gates pass. **Promoted developed → ready.** |

**Chrome status:** Available for 3 PM VALIDATION run. NODE BUILD and STORY ran without Chrome (9 AM / 12 PM).

Next priorities:
- DMFI 6 UNVERIFIED URLs — Chrome clear pass (highest-impact: unblocks developed → ready promotion)
- NAR type field review (flagged 2026-03-31: `corporation` may be incorrect → `donor`)
- DMFI line 11 malformed tag fix (wikilink embedded in hashtag)
- Mercatus Center 35+ UNVERIFIED URLs
- 2026-04-01 + 2026-04-02 Story Discovery UNVERIFIED URL clearance

---

### 2026-04-04 — Code Claude Session (David, manual)

**Context:** Working in donor-map-site repo with Code Claude. Built research automation pipeline, cleaned up duplicates, fixed homepage counter, generated build queues, received first Perplexity dossiers.

**What was done:**

*Research automation pipeline (in donor-map-engine private repo):*
1. Built `scripts/lib/shared.cjs` + `scripts/lib/api-config.cjs` — shared utilities, API config loader
2. Built `scripts/url-checker.cjs` — native Node HEAD request URL checker (replaces SEO tools / Chrome)
3. Built `scripts/fec-pipeline.cjs` — FEC campaign finance data via registered API key (1000 req/hr)
4. Built `scripts/congress-pipeline.cjs` — Congress.gov bills / committees / policy areas
5. Built `scripts/research-report.cjs` — unified report aggregator
6. Built `scripts/target-gap-analysis.cjs` — compares target lists vs vault profiles
7. Built `scripts/merge-duplicates.cjs` — auto-merges wikilinks + deletes stub duplicates
8. Tested end-to-end: Elizabeth Warren $131.3M FEC lookup confirmed working

*Editorial voice work:*
9. Replaced `content/Methodology.md` and `content/About The Donor Map.md` with first-person voice essay ("Behind The Methodology"). David wrote opening. 6 editorial sections follow: Why Tier 1 Sources, Why I Flag Contradictions, Why I Publish My Standards, Why I Use AI, Why This Matters Now. No em-dashes, first-person singular throughout.
10. Created Strategy, Manifesto Draft, and Methodology Draft files in `content/Assets/` (excluded from build)

*Homepage counter fix:*
11. Fixed `quartz/components/LandingPage.tsx` to count only entity profiles (politician, donor, corporation, pac, think-tank, lobbying-firm, media-profile) instead of all files. Homepage now shows 859 instead of 1,514.
12. Pushed to v4 (commit 8a7c7c87)

*Target gap analysis + build queues:*
13. Received 5 Perplexity target lists: politicians (1,002 targets), donors (294), think tanks (138), K Street (186 after expansion), media (191). Total 1,811 targets.
14. Saved to `content/Vault Maintenance/Targets/` (excluded from Quartz build)
15. Generated priority build queues. Gave David Top 100 (Tier A hub donors, think tanks, congressional leaders, media, lobbyists) and 101-200.

*Duplicate cleanup (30 files deleted):*
16. Deleted 3 DRAFT stubs (DRAFT-About.md, DRAFT-Guided-Tour.md, DRAFT-Homepage.md)
17. Merged 27 duplicate profiles — wikilinks preserved in keepers, short stubs deleted. Examples: Koch Industries (Mega-Donors dupe → Energy & Utilities 657L), Palantir (Tech dupe → Mega-Donors 215L), JPMorgan, EMILY's List, 23 politician "Name.md" stubs replaced by "_Name Master Profile.md" versions (Ro Khanna, Dick Durbin, Cory Booker, Jon Ossoff, Kevin McCarthy, etc.)

*First Perplexity dossiers received:*
18. Saved Tier A research dossiers to `content/Vault Maintenance/Targets/Dossiers/`: Elon Musk (544L), Timothy Mellon (573L), combined Tier A entries 1-5 (2,883L — includes Koch, Adelson, Uihlein). Fact-only, Tier 1/2 sourced, no editorial interpretation. Ready for Claude editorial synthesis pass.

**Vault stats (end of session):**
- Total files: 1,588 (down 30 from 1,618 after duplicate cleanup)
- Entity profiles: 859 (homepage counter reflects this)
- Ready: 1,416 · Developed: 3 · Draft: 48 · Raw: 36 · No status: 85

**Target coverage vs Perplexity lists:**
| Category | Targets | In Vault | Missing | Coverage |
|---|---|---|---|---|
| Politicians | 1,002 | 191 | 811 | 19% |
| Donors | 294 | 104 | 183 | 35% |
| Think Tanks | 138 | 29 | 109 | 21% |
| K Street | 186 | 21 | 165 | 11% |
| Media | 191 | 48 | 143 | 25% |
| **TOTAL** | **1,811** | **393** | **1,411** | **22%** |

**~1,411 profiles to build** to hit full coverage of target lists.

**Priority build queue:**
- Priority 1 missing: 140 profiles (hub donors, congressional leaders, policy factories, Fox/MSNBC hosts, lobbying kingmakers)
- Priority 2 missing: 290 profiles (state AGs, federal judges, second-tier mega-donors, PACs, trade associations)
- Priority 3+ missing: 981 profiles (state legislators, backbenchers, smaller outlets)

**Workflow established:**
1. Perplexity → data dossier only (no class analysis, no interpretation)
2. Claude (research mode) → editorial synthesis, pattern naming, cross-linking
3. David → voice correction, callout placement, final readiness gate

**Files created/updated:**
- `content/Methodology.md` (replaced with voice essay)
- `content/About The Donor Map.md` (replaced with voice essay)
- `content/Assets/Draft - About The Donor Map Manifesto.md`
- `content/Assets/Draft - Behind The Methodology.md`
- `content/Assets/Strategy - Competitive Position and AI Defense.md`
- `content/Vault Maintenance/Targets/politicians.md` (1,002 targets)
- `content/Vault Maintenance/Targets/donors.md` (294 targets)
- `content/Vault Maintenance/Targets/think-tanks.md` (138 targets)
- `content/Vault Maintenance/Targets/k-street.md` (186 targets)
- `content/Vault Maintenance/Targets/media.md` (191 targets)
- `content/Vault Maintenance/Targets/Dossiers/dossier-01-elon-musk.md`
- `content/Vault Maintenance/Targets/Dossiers/dossier-02-timothy-mellon.md`
- `content/Vault Maintenance/Targets/Dossiers/research-dossier-tier-a-entries-1-5.md`
- `quartz/components/LandingPage.tsx` (counter fix)
- `CLAUDE.md` (research automation pipeline section added)
- `.env` (FEC API key added)
- `.env.example` (template)
- `.gitignore` (reports/, .env added)

**Files deleted (30):**
- 3 DRAFT stubs at repo root
- 27 duplicate profiles (smaller versions merged into larger)

**Next priorities:**
1. Editorial synthesis pass on Tier A dossiers (Musk, Mellon, Koch, Adelson, Uihlein) — merge into existing profiles using class analysis lens
2. Priority 1 build queue (140 remaining profiles) — feed to Perplexity, then Claude editorial, then David voice pass
3. thedonormap.org DNS TXT verification — GitHub waiting on Namecheap TXT record propagation
4. Commit + push target files and cleanup work to v4

---
