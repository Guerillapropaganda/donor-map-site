---
title: "Diff Log"
type: reference
content-readiness: ready
last-updated: 2026-04-02
source-tier: null
parent: null
---

### Diff Log

Rolling log of vault file changes. Maximum 50 entries — oldest entries archived monthly to `Archive/Diff Log Archive.md`. This is the primary context source for all automated state runs. State tasks read this instead of the Session Timeline.

---

### Log Format

| Date | State | File | Action | Lines Changed | Status Before → After |
|------|-------|------|--------|---------------|----------------------|

---

### Active Log

| Date | State | File | Action | Lines Changed | Status Before → After |
|------|-------|------|--------|---------------|----------------------|
| 2026-03-31 | SYSTEM | State Engine Architecture.md | CREATED — state-driven execution model | ~350 | new file |
| 2026-03-31 | SYSTEM | Rollback Record — Pre-State-Engine Tasks.md | CREATED — rollback record for 20 disabled tasks | ~100 | new file |
| 2026-03-31 | SYSTEM | Diff Log.md | CREATED — this file | ~30 | new file |
| 2026-03-31 | NODE BUILD | Lennar Corporation.md | EXPANDED — thin stub to full corporation donor node (Who They Are, What They Want, Who They Fund, What They've Gotten, Timeline, Hunters Point, Class Analysis) | 33 → ~200 | ready → developed |
| 2026-03-31 | CONNECTION MAPPING | Lennar Corporation.md | Updated `related:` — removed dead NAHB link, added 6 outgoing: Real Estate Industry Bloc, Real Estate Development Industry Bloc, Gavin Newsom, Ron DeSantis, Donald Trump, Bipartisan Policy Center. Added inline `[[Ron DeSantis]]` wikilink. | 2 lines | developed (no change) |
| 2026-03-31 | CONNECTION MAPPING | National Association of Realtors.md | Added reciprocal `[[Lennar Corporation]]` + `[[Real Estate Industry Bloc]]` to `related:` | 1 line | developed (no change) |
| 2026-03-31 | CONNECTION MAPPING | Blackstone Real Estate.md | Added reciprocal `[[Lennar Corporation]]` to `related:` | 1 line | ready (no change) |
| 2026-03-31 | CONNECTION MAPPING | Invitation Homes - Institutional Landlords.md | Added reciprocal `[[Lennar Corporation]]` to `related:` | 1 line | ready (no change) |
| 2026-03-31 | CONNECTION MAPPING | _Ron DeSantis Master Profile.md | Added `[[Lennar Corporation]]` to `donors:` field — $50K to FL GOP ahead of inauguration + FL real estate developer bloc | 1 line | ready (no change) |
| 2026-03-31 | CONNECTION MAPPING | _Gavin Newsom Master Profile.md | Added `[[Lennar Corporation]]` + `[[National Association of Realtors]]` to `donors:` — $32.4K direct + housing policy pipeline | 1 line | ready (no change) |
| 2026-03-31 | SYSTEM | State Engine Architecture.md | Added Phase 0 Broken Links Queue to VALIDATION state — queue-driven batch processing (5-10 links/run), 4 status marks (VALID/REMOVE/FIXED/SOURCE REQUIRED) | ~30 lines | developed (no change) |
| 2026-03-31 | SYSTEM | state-validate (scheduled task) | Updated prompt — added Phase 0 Broken Links Queue before Phase 1/2, batch limit 10, no URL fabrication, status marks written to queue file | prompt rewrite | N/A |
| 2026-03-31 | SYSTEM | state-validate (scheduled task) | REPLACED Phase 0 — Source URL Audit Log is now the primary queue (replaces standalone Broken Links file). Processes BROKEN/UNVERIFIED entries 5-10/run. Marks: VALID/REMOVE/FIXED/SOURCE REQUIRED. Skips already-resolved entries. | prompt rewrite | N/A |
| 2026-03-31 | SYSTEM | state-structuring (scheduled task) | REMOVED URL processing from STRUCTURING scope. Audit log and all URL work owned exclusively by state-validate. Added explicit scope boundaries. | prompt rewrite | N/A |
| 2026-03-31 | SYSTEM | State Engine Architecture.md | Updated STRUCTURING: removed "Fix or remove broken source URLs" and "Broken URLs detected in audit log" trigger. Added scope boundaries section. Updated VALIDATION Phase 0: Audit Log replaces Broken Links file as queue source. | ~20 lines changed | developed (no change) |
| 2026-03-31 | STRUCTURING | Blackstone Real Estate.md | Fixed 2 bold sub-section headers → ### in ready file: **Housing Financialization:** → ### Housing Financialization; **1031 Exchange Preservation:** → ### 1031 Exchange Preservation. Updated last-updated to 2026-03-31. | 4 lines | ready (no status change) |
| 2026-03-31 | STRUCTURING | Invitation Homes - Institutional Landlords.md | Fixed 2 bold sub-section headers → ### in ready file: **Federal Policy Inaction on Corporate Homebuying:** → ### Federal Policy Inaction on Corporate Homebuying; **REIT Tax Advantage Preservation:** → ### REIT Tax Advantage Preservation. Updated last-updated to 2026-03-31. | 4 lines | ready (no status change) |
| 2026-03-31 | STRUCTURING | National Association of Realtors.md | Flagged for review: type: corporation may be incorrect — NAR is a lobbying org, type taxonomy maps that to donor not corporation. No change made per stop rule (unclear = skip + flag). | 0 lines | developed (no change) |
| 2026-03-31 | STRUCTURING | Diff Log.md (prior entry) | Flagged for review: Lennar Corporation entry shows "ready → developed" (Status Before → After). Should likely be "raw → developed" — Diff Log entry error, not a vault file error. No action taken (out of STRUCTURING scope). | 0 lines | N/A |
| 2026-03-31 | NODE BUILD | Cryptocurrency Industry.md | EXPANDED — added ### What They've Gotten (Gensler removal, Sacks appointment, GENIUS Act signing Jul 18 2025, SEC enforcement standdown) + ### Donation-to-Policy Timeline (Format 2, 7 rows). 2 new Tier 1 sources (SEC.gov Gensler press release, NPR GENIUS Act). Updated Fairshake total raised to $260M (corrected from $202M per current OpenSecrets data). ~46 lines added. | 117 → 153 | developed → ready |
| 2026-03-31 | SYSTEM | Vault Standards Resolution - 2026-03-31.md | CREATED — unified resolution of 6 cross-document contradictions. Final rules, patches, precedence hierarchy, enforcement notes. | ~200 | new file |
| 2026-03-31 | SYSTEM | API Pipeline.md | PATCHED — fixed internal citation contradiction. Lines 51-58 general FEC section now carves out individual contributions exception, references Quality Standards as canonical source. Removed "CRITICAL: Never use raw API endpoint URLs" blanket prohibition. | ~15 lines | developed (no change) |
| 2026-03-31 | SYSTEM | Quality Standards.md | PATCHED — (1) Scoped READY gate: content files strict, system files exempt from tag-string false positives. (2) Added API-First Fallback Hierarchy (4-tier decision tree for Chrome unavailability). | ~25 lines | ready (no change) |
| 2026-03-31 | SYSTEM | CLAUDE.md | PATCHED — (1) Split Quick Start into manual-session and automated-run paths. (2) Added document precedence hierarchy (8-level). (3) Scoped Source URL Audit Log instruction to search-only, not full read. | ~30 lines | ready (no change) |
| 2026-03-31 | SYSTEM | State Engine Architecture.md | PATCHED — Added Data Layer vs. Analysis Layer boundary rules after Execution Rules section. Defines strict/interpretive layers, permitted inference, causal language rules, state-specific application. | ~40 lines | developed (no change) |
| 2026-03-31 | SYSTEM | Session Timeline.md | PATCHED — Replaced "Read this first" with scoped role declaration. Manual sessions: read for context. Automated runs: do not read. Updated core reference documents list. | ~8 lines | raw (no change) |
| 2026-03-31 | SYSTEM | Research Methodology and Data Sources.md | REDUCED — Stripped ~110 lines of duplicated content (API summary, source tiers, citation format, note formatting, analytical patterns). Kept unique content (external databases, research layers, analytical framework, cross-section integration, YAML roadmap). Added cross-references to canonical sources. 233 → ~125 lines. | 233 → ~125 | ready (no change) |
| 2026-03-31 | SYSTEM | Publish Roadmap - The Donor Map Database.md | PATCHED — Added terminology definitions (file-ready, section-ready, publish-ready, scope-complete). Updated dashboard to use precise terms. Added publish-ready and scope-complete status lines. | ~15 lines | ready (no change) |
| 2026-03-31 | SYSTEM | Session Timeline.md | STRIPPED — Removed ~50 lines of duplicated content (Style & Formatting Rules, Note anatomy ×4, Source tiers). Replaced with 3-line config summary + cross-reference to CLAUDE.md and Quality Standards. | ~50 lines removed | raw (no change) |
| 2026-03-31 | SYSTEM | CLAUDE.md | PATCHED — Content readiness Status System now references Quality Standards as canonical for promotion gates. Removed detailed promotion rules from CLAUDE.md (kept status definitions). | ~8 lines | ready (no change) |
| 2026-03-31 | SYSTEM | State Engine Architecture.md | FIXED — System diagram: replaced "URL verify" under STRUCTURING with "Header fix" (URLs are VALIDATION's scope, per state definition). | 1 line | developed (no change) |
| 2026-03-31 | SYSTEM | state-structuring (scheduled task) | FIXED description — removed "broken URLs" reference. STRUCTURING does not process URLs per State Engine scope boundaries. | description only | N/A |
| 2026-03-31 | SYSTEM | Skill Patch Queue - 2026-03-31.md | CREATED — Exact patches for 3 read-only skills (profile-builder, donor-research, vault-audit). Covers: wrong doc paths, missing API-first, duplicated source tiers/readiness criteria, missing scoped READY gate. | ~180 lines | new file |
| 2026-03-31 | SYSTEM | profile-builder (skill) | PATCHED — 5 fixes: (A) wrong doc path → correct path + Quality Standards + API Pipeline refs, (B) pre-API research list → API-first priority order, (C) duplicated Steps 6-7 → compact Quality Standards reference, (D) Template A timeline columns → Format 1 (Money In / Policy Out), (E) Template C timeline columns → Format 2 (Recipient/Target / Policy Return). Saved to Skill Patches/ for manual install. | ~40 lines changed | N/A |
| 2026-03-31 | STORY | 2026-03-31 Story Discovery.md | CREATED — 4 stories classified (1 Diamond update, 2 Gold new, 1 Gold update, 1 Silver update, 1 Crossover flag). Diamond: SpaceX-xAI merger escalation (NBC News late-addition disclosure, drone contest). Gold-new: SEC/CFTC March 17 crypto commodity ruling (named tokens = named inaugural donors). Gold-new: Intuit/Direct File kill ($1M inaugural → free filing eliminated). Gold-update: Public Citizen tracker now at 31 corporations. Silver: Ballroom NCPC delay to April 2 + AI policy overlap (OpenSecrets). Crossover flag: crypto both-party Both-Sides Illusion (Fairshake PAC + Trump inaugural donors). All sources Chrome-verified 2026-03-31. Sub-Op 2 skipped (no adapt queue). Sub-Op 3 skipped (not Friday). | new file ~200 lines | new file |
| 2026-03-31 | SYSTEM | donor-research (skill) | PATCHED — 3 fixes: (A) wrong doc path → correct path + Quality Standards + API Pipeline refs, (B) added API-first rule + FEC API citation note before Tier 1 table, (C) added FEC API citation format example + Quality Standards canonical reference to source citation section. Saved to Skill Patches/ for manual install. | ~15 lines changed | N/A |
| 2026-03-31 | SYSTEM | vault-audit (skill) | PATCHED — 2 fixes: (A) updated IMPORTANT line to reference Quality Standards as canonical for promotion criteria, (B) added scoped READY gate (content files strict, system files exempt from tag-string false positives) to Audit 5 after promotion criteria table. Saved to Skill Patches/ for manual install. | ~8 lines changed | N/A |
| 2026-03-31 | VALIDATION | BGR Group.md | URL REPAIR — Chrome-verified 3 (UNVERIFIED) URLs: bgrdc.com Kellogg advisory board, foxbusiness.com Kellogg joins BGR, bgrdc.com Charlie Chapman VP. All VALID. Removed (UNVERIFIED) tags. Logged to Source URL Audit Log. | 3 lines | ready (no change) |
| 2026-03-31 | CONNECTION MAPPING | Fairshake PAC.md | Added reciprocal `[[Cryptocurrency Industry]]` to `related:` | 1 line | ready (no change) |
| 2026-03-31 | CONNECTION MAPPING | Fairshake PAC - Crypto Super PAC.md | Added reciprocal `[[Cryptocurrency Industry]]` to `related:` | 1 line | ready (no change) |
| 2026-03-31 | CONNECTION MAPPING | Winklevoss Twins.md | Added reciprocal `[[Cryptocurrency Industry]]` to `related:` | 1 line | ready (no change) |
| 2026-03-31 | CONNECTION MAPPING | Coinbase.md | Added reciprocal `[[Cryptocurrency Industry]]` to `related:` | 1 line | ready (no change) |
| 2026-03-31 | VALIDATION | Cryptocurrency Industry.md | FULL VALIDATION — 7/7 source URLs Chrome-verified VALID. Content gates pass (153 lines, 7 sources, 8 sections, class analysis present, timeline Format 2 w/ 7 rows). Fixed 2 broken wikilinks: removed `[[_David Sacks Master Profile\|Sacks]]` (no file), changed `[[Andreessen Horowitz]]` → `[[Marc Andreessen & Horowitz\|Andreessen Horowitz]]`. YAML/footer match. **ready status CONFIRMED.** | 1 line | ready (confirmed) |
| 2026-03-31 | VALIDATION | Cornerstone Government Affairs.md | URL REPAIR — Chrome-verified 2 (UNVERIFIED) URLs: cgagroup.com Juliano+Ulmer expansion, cgagroup.com Juliano career background. Both VALID. Removed (UNVERIFIED) tags. Logged to Source URL Audit Log. | 2 lines | ready (no change) |
| 2026-03-31 | VALIDATION | MasTec - Mas Canosa Family.md | URL REPAIR — Fixed wrong OpenSecrets org ID: D000037223 (Rose Assoc) → D000035672 (MasTec Inc). Chrome-verified VALID. Removed (UNVERIFIED) tag. Logged to Source URL Audit Log. | 1 line | developed (no change) |
| 2026-03-31 | CONNECTION MAPPING | Crypto Industry Bloc.md | Added reciprocal `[[Cryptocurrency Industry]]` to `related:` | 1 line | ready (no change) |
| 2026-03-31 | CONNECTION MAPPING | Marc Andreessen & Horowitz.md | Added reciprocal `[[Cryptocurrency Industry]]` to `related:` | 1 line | developed (no change) |
| 2026-04-01 | STRUCTURING | (10 files scanned) | Clean pass — scanned all files modified since last STRUCTURING (2026-03-31): Cryptocurrency Industry.md, 2026-03-31 Story Discovery.md, MasTec - Mas Canosa Family.md, Lennar Corporation.md, + 6 CONNECTION MAPPING single-line edits. Zero YAML errors, zero header violations, zero content-readiness mismatches. | 0 lines | no changes |
| 2026-04-01 | NODE BUILD | DMFI - Democratic Majority for Israel.md | EXPANDED — added ### What They Want (5 policy goals: primary enforcement, progressive defeat, framing, military aid protection, BDS suppression) + ### Donation-to-Policy Timeline (Format 2, 8 rows covering 2020-2024 cycle, [!money] callout on silence-as-product). No new sources — timeline data from existing citations. Chrome unavailable; no API calls. ~45 lines added. | 149 → ~194 | developed (no status change — UNVERIFIED sources block promotion) |
| 2026-04-01 | STORY | 2026-04-01 Story Discovery.md | CREATED — 5 stories classified (3 Gold, 2 Silver, 1 Crossover flag). Gold: Public Citizen 100+ enforcement cases canceled (update from Silver). Gold-new: AIPAC Illinois primary $22M spent, 2-2 record. Gold-new: AI super PAC network emergence (Leading the Future $100M + Meta $65M). Silver: Fairshake $191M war chest update. Silver: Musk $30M midterm donations. Crossover: a16z funds both crypto + AI PACs across both parties. Chrome unavailable — all URLs marked (UNVERIFIED). Sub-Op 2 skipped (no adapt queue). Sub-Op 3 skipped (not Friday). | new file ~200 lines | new file |
| 2026-04-01 | CONNECTION MAPPING | DMFI - Democratic Majority for Israel.md | Added `[[United Democracy Project - UDP\|UDP]]` + `[[_Jamaal Bowman Master Profile\|Jamaal Bowman]]` to `related:` | 1 line | developed (no change) |
| 2026-04-01 | CONNECTION MAPPING | United Democracy Project - UDP.md | Added reciprocal `[[DMFI - Democratic Majority for Israel\|DMFI]]` to `related:` | 1 line | ready (no change) |
| 2026-04-01 | CONNECTION MAPPING | AIPAC - American Israel Public Affairs Committee.md | Added reciprocal `[[DMFI - Democratic Majority for Israel\|DMFI]]` to `related:` | 1 line | developed (no change) |
| 2026-04-01 | CONNECTION MAPPING | _Jamaal Bowman Master Profile.md | Added `[[DMFI - Democratic Majority for Israel\|DMFI]]` to `related:` — DMFI spent $95K+ against Bowman 2024 primary | 1 line | ready (no change) |
| 2026-04-01 | VALIDATION | DMFI - Democratic Majority for Israel.md | Content-readiness gate check: 182 lines ✓, 10 sources ✓, 10 sections ✓, class analysis ✓, timeline Format 2 ✓, YAML/footer match ✓. **BLOCKER: 6/10 URLs UNVERIFIED — ready promotion blocked.** Structural flag: malformed wikilink-in-tag line 11 (pre-existing). Chrome unavailable — no URL verification. | 0 lines | developed (no change, promotion blocked) |
| 2026-04-02 | NODE BUILD | NORPAC.md | EXPANDED — added Donation-to-Policy Timeline (Format 2, 8 rows), expanded What They Want (6 policy priorities), expanded Who They Are (founding details, AIPAC auxiliary role, Chouake leadership), added Historical Growth table (FEC API, 7 cycles 2002-2024), added Operational Model section, [!money] callout on bundling premium + access model. 5 new sources (2 Tier 1: FEC API + OpenSecrets recipients, 3 Tier 3: Militarist Monitor + Wikipedia + JNS). 2 UNVERIFIED tags removed (Jewish Link, Schweikert.house.gov — Chrome-verified). ~50 lines added. | 103 → 153 | developed (no status change — 3 UNVERIFIED sources remain, promotion blocked) |
| 2026-04-02 | STORY | 2026-04-02 Story Discovery.md | CREATED — 8 items (3 Gold new: MAGA Inc $305M pipeline, tariff exemptions as payback, anti-AIPAC counter-PAC; 2 Gold updates: AIPAC shell PAC dark money, Public Citizen $3.1B; 2 Silver: crypto $288M midterm, Prospect super PAC piece; 1 Crossover flag: crypto both-party parallel PACs). Chrome unavailable — all URLs UNVERIFIED. Sub-Op 2 skipped (no adapt queue). Sub-Op 3 skipped (Thursday). | new file ~250 lines | new file |
| 2026-04-02 | VALIDATION | NORPAC.md | URL REPAIR — Chrome-verified 3 (UNVERIFIED) URLs: norpac.net, Scribd Jewish Standard doc, Jewish Standard Huckabee article. All VALID. Removed (UNVERIFIED) tags. | 3 lines | developed (no change yet) |
| 2026-04-02 | CONNECTION MAPPING | AIPAC - American Israel Public Affairs Committee.md | Added reciprocal `[[NORPAC]]` to `related:` | 1 line | developed (no change) |
| 2026-04-02 | CONNECTION MAPPING | DMFI - Democratic Majority for Israel.md | Added reciprocal `[[NORPAC]]` to `related:` | 1 line | developed (no change) |
| 2026-04-02 | CONNECTION MAPPING | Republican Jewish Coalition.md | Added reciprocal `[[NORPAC]]` to `related:` | 1 line | ready (no change) |
| 2026-04-02 | CONNECTION MAPPING | United Democracy Project - UDP.md | Added reciprocal `[[NORPAC]]` to `related:` | 1 line | ready (no change) |
| 2026-04-02 | CONNECTION MAPPING | Miriam Adelson.md | Added reciprocal `[[NORPAC]]` to `related:` | 1 line | developed (no change) |
| 2026-04-02 | CONNECTION MAPPING | _Jamaal Bowman Master Profile.md | Added `[[NORPAC]]` to `related:` — NORPAC bundled $53.4K to Latimer in Bowman primary defeat | 1 line | ready (no change) |
| 2026-04-02 | CONNECTION MAPPING | Ritchie Torres.md | Added `[[NORPAC]]` to `donors:` — top NORPAC recipient $136K 2024 cycle | 1 line | ready (no change) |
| 2026-04-02 | VALIDATION | NORPAC.md | FULL VALIDATION — 12/12 source URLs Chrome-verified VALID. Content gates pass (153 lines, 12 sources, 8 sections, class analysis present, timeline Format 2 w/ 8 rows, 2 [!money] callouts). All wikilinks resolve. YAML/footer match. **Promoted developed → ready.** | 2 lines | developed → ready |

---

### Confirmed $0 FEC Records

Do not re-query these names unless 6 months have passed or David requests it.

| Name Queried | Variants Checked | Date Confirmed | Source Run |
|---|---|---|---|
| Sean Hannity | HANNITY, SEAN | 2026-03-27 | media-profile-builder run 18 |
| Jake Tapper | TAPPER, JAKE / TAPPER, JACOB | 2026-03-27 | media-profile-builder run 18 |
| Nicolle Wallace | WALLACE, NICOLLE / WALLACE, NICOLE | 2026-03-27 | media-profile-builder run 18 |
| Chris Wallace | WALLACE, CHRIS / WALLACE, CHRISTOPHER | 2026-03-27 | media-profile-builder run 16 |
| Ana Navarro | NAVARRO, ANA | 2026-03-27 | media-profile-builder run 16 |
| Jeremy Boreing | BOREING, JEREMY | 2026-03-27 | media-profile-builder run 13 |
| Will Menaker | MENAKER, WILL | 2026-03-27 | media-profile-builder run 13 |
| Felix Biederman | BIEDERMAN, FELIX | 2026-03-27 | media-profile-builder run 13 |
| Matt Christman | CHRISTMAN, MATT | 2026-03-27 | media-profile-builder run 13 |
| Amber Frost | FROST, AMBER | 2026-03-27 | media-profile-builder run 13 |
| Dasha Nekrasova | NEKRASOVA, DASHA | 2026-03-27 | media-profile-builder run 13 |
| Anna Khachiyan | KHACHIYAN, ANNA | 2026-03-27 | media-profile-builder run 13 |
| Lee Camp | CAMP, LEE | 2026-03-27 | media-profile-builder run 13 |
| Greg Gutfeld | GUTFELD, GREG | 2026-03-27 | media-profile-builder run 16 |
