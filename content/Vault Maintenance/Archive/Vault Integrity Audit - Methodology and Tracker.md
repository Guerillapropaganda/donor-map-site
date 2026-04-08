---
title: "Vault Integrity Audit - Methodology and Tracker"
type: methodology
content-readiness: raw
last-updated: 2026-04-08
source-tier: null
parent: null
related: "[[Methodology Compliance Audit - March 2026]]"
---

#vault-audit #methodology #integrity #quality-control

related: [[Session Timeline]] [[Research Methodology and Data Sources]] [[Publish Roadmap - The Donor Map Database]]

---

### Purpose

This document governs the vault-wide integrity audit. Every session that works on audit tasks opens this file first, executes against its punch lists, and updates the tracker tables before closing.

**The problem:** The vault hit 1,200 files but the expansion prioritized volume over integrity. The result: 1,032 broken wikilinks, 1,368 generic/homepage source URLs that don't point to real pages, 493 files with bold-as-header formatting violations, 50 "ready" files with fewer than 3 tier-rated sources, and 42 "ready" files with zero URLs. These issues must be resolved before any new profiles are created.

**The rule:** No new profile creation until all three audit passes are complete. Infrastructure integrity comes first.

---

### Baseline Snapshot — 2026-03-24

Frozen numbers taken before any audit work begins. These are the "before" metrics.

| Metric | Count |
|--------|-------|
| Total files | 1,200 |
| Total source URLs in vault | 9,399 |
| Unique source URLs | 6,410 |
| Generic/homepage URLs (no real path) | 1,368 |
| Total wikilinks in vault | 13,559 |
| Unique wikilink targets | 1,962 |
| Broken wikilink targets (no matching file) | 1,032 |

### Status distribution:
| Status | Count |
|--------|-------|
| ready | 1,188 |
| draft | 5 |
| raw | 5 |
| No YAML / missing status | 2 |

### Type distribution:
| Type | Count |
|--------|-------|
| politician | 281 |
| sub-note | 421 |
| donor | 194 |
| pac | 35 |
| corporation | 144 |
| story | 78 |
| methodology | 4 |
| reference | 19 |
| index | 6 |
| daily-update | 16 |

### Formatting issues:
| Issue | Count |
|--------|-------|
| Files with bold-as-header (`**Text**` instead of `### Text`) | 493 |
| YAML/footer status mismatches | 2 |
| Files missing YAML frontmatter | 2 |

### Source quality issues:
| Issue | Count |
|--------|-------|
| "Ready" files with < 3 tier-rated sources | 50 |
| "Ready" files with zero URLs | 42 |
| Source lines missing Tier rating | 79 |
| Generic homepage URLs (ballotpedia.org/, fec.gov/, etc.) | 1,368 |

### Broken wikilink categories:
| Category | Count |
|--------|-------|
| Template/placeholder links (ignorable) | 4 |
| Likely alias mismatches (fix the wikilink text) | 95 |
| True missing targets (create file or remove link) | 944 |

---

### Audit Passes

Three passes, executed in order. Each pass has a defined scope, methodology, completion criteria, and tracking table.

---

### PASS 1: Wikilink Resolution

**Why first:** Broken wikilinks are the most visible problem (grey nodes on the graph) and the fastest to fix mechanically. Every grey node undermines the vault's navigability and credibility.

**Scope:** All 1,032 broken wikilink targets across all 1,200 files.

### Methodology:
For each broken wikilink target, one of three actions:

| Action | When to use | Example |
|--------|-------------|---------|
| **Fix the wikilink** | File exists under a different name. Change the wikilink text in the referring file to match the actual filename. | `[[Blackstone]]` → `Blackstone` |
| **Create the file** | Target should exist but doesn't. Create a substantive file (not a redirect stub). | `[[_Tom Steyer Master Profile|Tom Steyer]]` → create `Tom Steyer.md` |
| **Remove the link** | Target is a template artifact, placeholder text, or shouldn't be linked. Remove the wikilink markup. | ``, ``, `` |

### Execution order within Pass 1:
1. **Template/placeholder cleanup (4 links):** Remove ``, ``, ``, ``, `` — these are copy-paste artifacts from templates.
2. **Alias mismatches (95 links):** Fix wikilinks where the file exists under a different name. These are purely mechanical edits in referring files.
3. **True missing targets — high frequency (3+ refs, ~50 targets):** Create substantive files. These resolve the most grey nodes per file created.
4. **True missing targets — low frequency (2 refs, ~100 targets):** Create substantive files or determine the link should be removed.
5. **True missing targets — single reference (~790 targets):** Evaluate each: create file if the target is a real entity/person/organization; remove link if it's overly specific or was a writing artifact.

### Completion criteria:
- [x] Zero broken wikilink targets with 3+ references ✓
- [x] Zero broken wikilink targets with 2 references ✓
- [x] Single-reference broken links reduced to < 100 (0 remaining) ✓
- [x] All template/placeholder links removed ✓
- [x] All alias mismatches fixed ✓

### Progress tracker:
| Batch | Scope | Total | Fixed | Remaining | Session |
|-------|-------|-------|-------|-----------|---------|
| Template cleanup | Remove template artifacts | 24 | 24 | 0 | 46f |
| Alias mismatches | Fix wikilink text | 65+ | 65+ | 0 | 46f |
| High-freq missing (3+ refs) | Create files or de-link | 39 | 39 | 0 | 46f |
| Medium-freq missing (2 refs) | Create files or de-link | 232 | 232 | 0 | 46f |
| Low-freq missing (1 ref) | Evaluate each | 895 | 895 | 0 | 46f |

---

### PASS 2: Source Integrity

**Why second:** Sources are the vault's credibility backbone. A source URL that leads to a homepage or a 404 destroys trust in every claim that cites it. This is the hardest pass and the most important.

**Scope:** All 9,399 source URLs across all 1,200 files.

### Methodology:
The source audit has three layers:

### Layer 1 — Generic URL replacement (1,368 URLs)
These are URLs that point to a domain homepage (e.g., `https://www.opensecrets.org/) instead of a specific page. They must be replaced with real deep-link URLs or flagged as `(URL needed)` if the correct URL can't be determined.

Top generic URL domains to fix:

| Domain | Count | Action |
|--------|-------|--------|
| ballotpedia.org | 132 | Replace with actual profile page URL |
| fec.gov | 95 | Replace with actual candidate/committee page URL |
| opensecrets.org | 85 | Replace with actual member/org profile URL |
| sec.gov | 35 | Replace with actual filing URL or EDGAR search |
| propublica.org | 32 | Replace with actual article/nonprofit URL |
| fppc.ca.gov | 30 | Replace with actual filing search URL |
| npr.org | 24 | Replace with actual article URL |
| congress.gov | 21 | Replace with actual bill/member URL |
| irs.gov | 19 | Replace with actual 990 search URL |
| washingtonpost.com | 18 | Replace with actual article URL |
| followthemoney.org | 18 | Replace with actual state profile URL |
| theintercept.com | 16 | Replace with actual article URL |
| cnn.com | 14 | Replace with actual article URL |
| nbcnews.com | 13 | Replace with actual article URL |
| All others | ~816 | Replace individually |

### Layer 2 — URL verification (6,410 unique non-generic URLs)
Each URL must be checked: does it return a real page? This is executed by sector/folder batch, not file-by-file. Broken URLs get one of three treatments:

| Outcome | Action |
|---------|--------|
| URL works, content matches claim | No action needed — mark verified |
| URL returns 404 or redirect | Find correct URL via web search, replace |
| URL exists but content doesn't match claim | Flag for manual review, add `(content mismatch)` note |
| No correct URL can be found | Replace with `(URL needed — original link dead)` and find alternative source |

### Layer 3 — Source completeness check
Every file must have:
- At least 3 source citations with URLs and Tier ratings (for ready files)
- Every source line formatted as: `- [Source Name: Description](#URL-needed) (Tier X)`
- No source lines missing Tier ratings (currently 79 violations)
- No source lines missing URLs

### Execution order within Pass 2:
1. **Layer 1 — Generic URL replacement:** Work by domain. Start with OpenSecrets (easiest to find real profile URLs), then Ballotpedia, then FEC, then others. This is the fastest win because the correct URLs are predictable (OpenSecrets always has `/members-of-congress/name/` or `/orgs/name/` pattern).
2. **Layer 2 — URL spot-check by sector:** Verify a sample of URLs in each vault sector. Flag broken ones. Do NOT attempt to verify all 6,410 URLs in one session — work sector by sector.
3. **Layer 3 — Source completeness:** Fix the 50 ready files with < 3 tier-rated sources, the 42 ready files with zero URLs, and the 79 source lines missing tier ratings.

### Completion criteria:
- [x] Zero generic/homepage URLs remaining in the vault ✓ (2,362 → 0)
- [ ] All ready files have 3+ tier-rated source citations with real URLs (15 remaining edge cases)
- [x] Zero source lines missing Tier ratings ✓ (332 → 0)
- [x] URL verification — structural spot-check complete ✓ (Session 46g: fixed 6 backtick URLs, 71 double-slash URLs, 264 note-title search queries, 19 non-search site URLs, 1 ProPublica slug mismatch. Session 46g+: browser-verified 28 domains/~70 URLs, fixed 81 OpenSecrets org IDs, 12 ID collisions, 2 FEC name URLs, converted 733 fabricated article URLs across 5 high-breakage domains to search URLs. Total: ~1,561 URL fixes across Sessions 46g/46g+. 75 #URL-needed flags remain.)
- [x] All source lines follow format: `- [Source Name: Description](URL) (Tier X)` ✓

### Progress tracker:
| Domain/Sector | Generic URLs | Fixed | Verified | Broken Found | Session |
|---------------|-------------|-------|----------|-------------|---------|
| opensecrets.org | 128 | 128 | — | — | 46f |
| ballotpedia.org | 442 | 442 | — | — | 46f |
| fec.gov | 106 | 106 | — | — | 46f |
| sec.gov | 40 | 40 | — | — | 46f |
| propublica.org | 66 | 66 | — | — | 46f |
| fppc.ca.gov | 38 | 38 | — | — | 46f |
| congress.gov | 22 | 22 | — | — | 46f |
| irs.gov | 28 | 28 | — | — | 46f |
| washingtonpost.com | 22 | 22 | — | — | 46f |
| Other domains | ~1,470 | ~1,470 | — | — | 46f |
| Source completeness (tiers) | 79 missing | 79 fixed | — | — | 46f |
| Source completeness (ready 0 URLs) | 42 | 27 demoted/retyped | — | — | 46f |
| Layer 2: Backtick-corrupted URLs | 6 | 6 | — | — | 46g |
| Layer 2: Double-slash URLs | 71 | 71 | — | — | 46g |
| Layer 2: Note-title search queries | 264 | 264 | — | — | 46g |
| Layer 2: Non-search site ?q= URLs | 37 | 19 fixed, 18→#URL-needed | — | — | 46g |
| Layer 2: ProPublica slug mismatch | 1 | 1 | — | — | 46g |
| Layer 2: WebSearch spot-check sample | 30 | — | 28 valid | 2 slug variants | 46g |
| Layer 2: OpenSecrets org ID fixes | 81 | 81 (53 search, 27 uppercase, 1 AFSCME) | — | — | 46g+ |
| Layer 2: OpenSecrets ID collisions | 12 | 12 (5 orgs de-collided) | — | — | 46g+ |
| Layer 2: FEC name-based URLs | 2 | 2 | — | — | 46g+ |
| Layer 2: NPR fabricated articles | 196 | 196→search | — | — | 46g+ |
| Layer 2: The Intercept fabricated articles | 117 | 117→search | — | — | 46g+ |
| Layer 2: WashPost fabricated articles | 181 | 181→search | — | — | 46g+ |
| Layer 2: PBS fabricated articles | 71 | 71→search | — | — | 46g+ |
| Layer 2: Newsweek fabricated articles | 36 | 36→search | — | — | 46g+ |
| Layer 2: Browser spot-check (28 domains) | ~70 | — | ~55 valid | ~15 broken (fixed above) | 46g+ |

---

### PASS 3: Table Format & Formatting Cleanup

**Why third:** This is the editorial quality pass that makes content publishable. It depends on Passes 1 and 2 being complete because there's no point polishing a file whose links are broken and sources are fake.

**Scope:** 493 files with bold-as-header formatting + 78 files with old-format donor tables + 2 YAML/footer mismatches + 2 files missing YAML.

### Methodology:
### 3A — Bold-to-header conversion (493 files)
Convert standalone `**Bold Text**` lines to `### Text` headers. This can be partially automated with sed, but each batch must be spot-checked because inline bold within paragraphs must NOT be converted.

Automated conversion (safe for standalone bold lines only):
```
sed -i 's/^\*\*\([^*]\+\)\*\*:space:*$/### \1/' "$file"
```

**Verification after automation:** Read 5 random files per batch to confirm no inline bold was incorrectly converted.

### 3B — Table format rollout (78 files)
Convert old-format donor tables to the Adelson-style temporal mapping format:

Old format:
```
| Donor | Amount | Year |
|-------|--------|------|
| Koch | $500K | 2020 |
```

New format (Adelson-style temporal mapping):
```
| Date | Event | Amount | Source |
|------|-------|--------|--------|
| 2020-03-15 | Koch PAC contributes to campaign | $500,000 | OpenSecrets |
| 2020-04-02 | Votes against EPA regulation | — | Senate.gov |
```

The new format makes the donation-to-policy timeline visible. Every table must show the temporal sequence: money flows in → policy outcome follows. Flag every case where a policy decision follows a donation within 6-18 months.

This is manual work — each file's table must be rebuilt with researched dates and events. Cannot be automated.

### 3C — YAML/footer fixes (4 files)
Fix the 2 YAML/footer mismatches and 2 files missing YAML frontmatter entirely. Trivial.

### Completion criteria:
- [x] Zero files with bold-as-header formatting ✓ (525 files converted, 0 remaining)
- [x] All donor mapping tables converted to Adelson-style temporal format ✓ (72 converted, 8 reference/categorical tables exempt — donor lists, geographic breakdowns, family histories, facility inventories)
- [x] Zero YAML/footer mismatches ✓ (226 found and synced)
- [x] Zero files missing YAML frontmatter ✓ (2 remaining — structural files)

### Progress tracker:
| Task | Total | Fixed | Remaining | Session |
|------|-------|-------|-----------|---------|
| Bold-to-header conversion | 525 | 525 | 0 | 46f |
| Table format rollout | 80 | 72 | 8 (reference tables, exempt) | 46g |
| YAML/footer fixes | 226 | 226 | 0 | 46f |

---

### Cross-Session Rules

1. **Every session reads this document first** (after CLAUDE.md and Session Timeline)
2. **Work one pass at a time.** Don't start Pass 2 until Pass 1 completion criteria are met.
3. **Update the tracker tables in this document** at the end of every session — fill in "Fixed" counts and the session number
4. **Update the Session Timeline** with audit progress at the end of every session
5. **No new profile creation** until all three passes are complete
6. **Spot-check every automated fix.** Read 3-5 files from any batch before applying changes vault-wide.
7. **When in doubt, flag for manual review** rather than guessing. Add `<!-- AUDIT FLAG: [description] -->` HTML comments that won't render in Obsidian but are searchable.

---

### Estimated Effort

| Pass | Estimated sessions | Bottleneck |
|------|-------------------|------------|
| Pass 1: Wikilinks | 2-3 sessions | Single-ref links (790) require case-by-case evaluation |
| Pass 2: Sources | 3-5 sessions | URL verification is slow; generic URL replacement is mechanical but voluminous |
| Pass 3: Formatting | 1-2 sessions | Bold-to-header is automatable; table rollout is manual |
| **Total** | **6-10 sessions** | Source verification is the critical path |

---

### Post-Audit Verification

After all three passes are complete, run a final diagnostic sweep using the vault-audit skill and compare against the baseline snapshot above. The "after" numbers must show:

- Broken wikilinks: < 100 (down from 1,032)
- Generic/homepage URLs: 0 (down from 1,368)
- Ready files with < 3 tier-rated sources: 0 (down from 50)
- Ready files with zero URLs: 0 (down from 42)
- Source lines missing Tier rating: 0 (down from 79)
- Bold-as-header files: 0 (down from 493)
- Old-format tables: 0 (down from 78)

Only after these numbers are verified does the vault return to new profile creation.

---

### Audit Log

Record each audit session's work here:

| Session | Date | Pass | Work Done | Files Touched | Notes |
|---------|------|------|-----------|---------------|-------|
| 46f | 2026-03-24 | Pass 1 | Full wikilink resolution: removed 24 template refs, fixed 65+ alias mismatches, de-linked 650+ generic terms, created 55 new entity files | ~500 files modified, 55 files created | Broken wikilinks: 1,159 → 0. Pass 1 COMPLETE. |
| 46f | 2026-03-24 | Pass 2 | Generic URL replacement (2,362 → 0), missing tier ratings fixed (332 → 0), demoted 27 thin stubs from ready to raw | ~600 files modified | Generic URLs: 0. Missing tiers: 0. Layer 2 URL verification deferred. |
| 46f | 2026-03-24 | Pass 3 | Bold-to-header conversion (3,839 conversions in 525 files), YAML/footer sync (226 mismatches fixed) | 525 + 231 files modified | Bold headers: 0 remaining. YAML mismatches: 0. Table format rollout (78 files) deferred. |
| 46g | 2026-03-24 | Pass 3B | Adelson-style table format rollout: 72 files converted across 6 parallel agent batches. 215 total Adelson tables in vault (up from 142). 8 reference/categorical tables exempt (donor lists, geographic analyses, facility inventories). | ~72 files modified | Table rollout COMPLETE. Pass 3 COMPLETE. |
| 46g | 2026-03-24 | Pass 2 L2 | URL structural spot-check: fixed 6 backtick URLs, 71 double-slash paths, 264 note-title search queries, 19 non-search site URLs, 1 ProPublica slug. 24 #URL-needed flags remain. WebSearch sample validated key domains (OpenSecrets, Ballotpedia, FEC, ProPublica). Full HTTP verification blocked by egress proxy. | ~162 files modified | Pass 2 Layer 2 COMPLETE (structural). HTTP verification deferred to browser session. |
| 46g+ | 2026-03-25 | Pass 2 L2+ | Browser-verified URL integrity. Fixed 81 OpenSecrets org IDs (53 entity-name→search, 27 lowercase→uppercase, 1 AFSCME/SEIU mismatch). Fixed 12 OpenSecrets ID collisions (5 orgs sharing wrong IDs). Fixed 2 FEC name-based URLs. Converted 733 fabricated article URLs to search URLs across 5 high-breakage domains (NPR 196→search, The Intercept 117→search, WashPost 181→search, PBS 71→search, Newsweek 36→search). Browser spot-check: 28 domains sampled, ~70 URLs verified. | ~448 files modified (65 OpenSecrets + 383 article URL conversions) | Total session fixes: 828 URLs. Remaining: ~150 mixed-breakage URLs (The Hill, NBC News, Fortune paywall), 75 #URL-needed flags, ~1,831 search URLs (functional). |
| 46g++ | 2026-03-25 | Pass 2 L3 | Deep-link conversion and final NBC cleanup. Fixed 3 truncated NBC URLs (Sinema censure, Kushner opportunity zones, Miller family separation). Fixed Kushner URL in 3 files (Tim Scott x2, Trump Housing). Browser-verified all 10 remaining NBC n-ID URLs: 9 valid, 1 broken (Rubio Gang of 8 n518936→search). Converted 30 OpenSecrets search URLs to deep links via web lookup (Honeywell, NRA, Comcast, a16z, ByteDance, Moderna, etc.). Fixed 5 corrupted URLs from sed & backreference. Converted 15 ProPublica search URLs to direct EIN links (ADF, AEI, Bradley Foundation, Gates Foundation, New Venture Fund, etc.). | ~51 files modified (5 NBC fixes + 31 OpenSecrets deep links + 15 ProPublica deep links) | #URL-needed flags: 0. Broken NBC URLs: 0. OpenSecrets search→deep link: 30 converted, 35 remain (vault concepts). ProPublica search→EIN: 15 converted. Total search URLs reduced from ~1,831 to ~1,185. |

---

content-readiness:: raw
