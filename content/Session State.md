---
title: Session State
type: system
last-updated: 2026-04-11
---

# Session State

Both Code Claude and Research Claude update this at the end of every session. Read this first.

---

## Last Session
Claude: Code
Date: 2026-04-11 (Phase 1 Day 2 — deep pipeline bug sweep, 13 fixes across two sweeps, Katie Porter + vault FEC ID audit, LobbyView / DOJ Press retired from CI, session-save wired to update calendar)

### Theme
Ran a thorough pipeline health check with real API keys after David pasted them. Tested every pipeline locally with small limits, documented failures, and fixed them at root. This was the session that turned the pipelines from "mostly broken silently" to "known-good or known-dead-and-guarded".

### Done — First sweep (6 bugs)

- **Congress.gov `/member?query=` parameter is silently ignored.** Verified against `?query=Bernie Sanders`, `?query=Sanders`, and empty `?query=` — all three returned the same default page of 5 members (Joaquin Castro, Kristen McDonald Rivet, Jason Crow, Alan Armstrong, Markwayne Mullin), none of which were Sanders. Every politician without a pre-populated `bioguide-id` was silently dropped. **Fix:** `scripts/congress-pipeline.cjs` now uses `/member/congress/{N}/{stateCode}` (the only endpoint that honours state filtering), fetches each state delegation once per run (cached), and matches locally with nickname-aware first-name logic. Verified on Bernie Sanders, Lisa Murkowski, Chuck Schumer, Mark Green, Diaz-Balart, Rick Larsen — all 5/5 found across parties/chambers.

- **GovTrack `/person?q=Jim Risch` returns 0 results** because GovTrack stores him as "James Risch". Every senator/rep whose vault profile uses a nickname (Jim/James, Bill/William, Bob/Robert, Bernie/Bernard, Chuck/Charles, etc.) was silently dropped. **Fix:** `searchPerson()` in `scripts/govtrack-pipeline.cjs` now queries by last name only and does nickname-aware first-name matching via a `NICKNAMES` table.

- **ProPublica Nonprofit `bestMatch()` had an A000383-class `return results[0]` fallback.** Searching "Coinbase" (for-profit, not a nonprofit) returned "Coinwise Foundation" (EIN 882190767) with a completely unrelated 990. **Fix:** strict match only (exact or full-phrase substring with ≤3 extra boilerplate tokens), returns null rather than guess.

- **Wikipedia + OpenSanctions cold-cache short-circuit.** Four sites checked `if (cached !== undefined) return cached`, but `FileCache.get()` returns `null` for missing keys (not `undefined`), so every profile was short-circuited on first run without ever hitting the API. **Fix:** changed all 4 sites to `if (cached != null) return cached`. Verified John Boozman now resolves.

- **api-config dual env-var naming.** Keys in David's `.env` used GitHub-Secret naming (`FECAPI`, `CONGRESSAPI`, `LOBBYVIEWAPI`) but api-config.cjs only read standard names (`FEC_API_KEY`, `CONGRESS_API_KEY`). Pipelines were falling back to DEMO_KEY silently. **Fix:** added `pickKey(...names)` helper that tries both naming conventions. Added `requireRealKeys(...)` that hard-fails on DEMO_KEY for fec/congress pipelines, with `ALLOW_DEMO_KEYS=1` escape hatch.

- **`api-enrichment.yml` stale-log cache contamination.** Identified by noticing identical per-pipeline counts across many commits with wildly different file totals (9 commits in a row showing `courtlistener:14 doj-press:15 fara:2 ...` despite file counts of 93→125→220). The parallel step cached `reports/` including `logs/`, and when the step timed out at 25 min the stale logs from the previous run remained in cache. The commit-message grep then counted fresh + stale writes together. **Fix:** exclude `reports/logs` from cache path, wipe `reports/logs` at step start as defence-in-depth, bump timeout 25→30 and job timeout 35→40.

### Done — Second sweep (7 more bugs)

- **NHTSA `/recalls/recallsByManufacturer` and `/complaints/complaintsByManufacturer` are DEAD (HTTP 403 "Missing Authentication Token"),** `/investigations?manufacturer=X` still works. **Fix:** `fetchRecalls()` now queries DOT Socrata `datahub.transportation.gov/resource/6axg-epim.json` with a LIKE filter on manufacturer name and normalizes Socrata snake_case back to the legacy PascalCase shape so `parseRecall()` doesn't need changes. Complaints stubbed to `[]` until a replacement source is found. Verified Ford Motor Company → 500 recalls (hit cap) + 10 investigations.

- **DOJ Press pipeline is DEAD** — `/api/v1/press_releases.json ?keyword=` is silently ignored (returns the 264,553-record index for every query) and the `/news` fallback is behind Akamai Bot Manager with `bm-verify` meta-refresh gates. **Fix:** dead-guard at top of `main()` that exits(0) with a clear message. Override: `ALLOW_DOJ_DEAD=1`.

- **Congress.gov v3 API does NOT expose committee membership anywhere.** Neither `/member/{bioguideId}` nor `/committee/{chamber}/{code}` returns a members list. Verified against Bernie Sanders (S000033) and Senate Budget (ssbu00). The old `committee-pipeline.cjs` burned 33 API calls per politician looking for members that weren't there, returned 0 committees for everyone. **Fix:** rewrote `fetchCommitteeAssignments()` to use GovTrack's `/api/v2/committee_member?person={id}` endpoint. Verified Bernie → 5 committees + 9 subcommittees in 2 API calls.

- **committee-pipeline.cjs line 448 syntax error** — stray `"last-enriched": today(),` outside an object literal prevented the script from parsing at all. **Fix:** brace placement in the `updates = {}` literal.

- **committee-pipeline.cjs null congress bug** — empty `&congress=` produced "nullth Congress" URLs. **Fix:** added `DEFAULT_CONGRESS = 119`.

- **SAM.gov wrong awardee JSON path.** `summarizeContracts()` was reading `c.coreData?.awardeeOrRecipient?.legalBusinessName` — a path that doesn't exist in the actual response schema. Real path is `awardSummary[i].awardeeData.awardeeHeader.legalBusinessName` (plus `.awardeeName`, `.awardeeAlternateName`, `.awardeeNameFromContract`). Every record resolved to `""`, the token-hit matcher returned 0 for every sample, and the 60% threshold rejected everything as "name-mismatch (0/5 matched)". Secondary finding: SAM.gov's `awardeeLegalBusinessName=Kaiser Permanente` filter is so loose it returns "Kaiser, Curtis" (individual trash service) in the top hits. **Fix:** correct paths + require every significant token to appear in the awardee name (prevents single-token false matches).

- **FEC `/candidates/totals/?sort=-cycle` returns HTTP 422** — `cycle` isn't a valid sort field. Valid options: `election_year`, `name`, `party`, `state`, `office`, `district`, `receipts`, `disbursements`, `individual_itemized_contributions`, `candidate_id`. **Fix:** swapped to `sort=-election_year`.

### Done — Katie Porter FEC ID bug + vault-wide audit

- **Katie Porter's frontmatter had `fec-candidate-id: "H8CA45076"`** — an ID that returns 0 results from the FEC API. Her real IDs are **`H8CA45130`** (House, 4 cycles 2018–2024, $26M in 2022) and **`S4CA00522`** (Senate, 2024 primary, $32.5M). Fixed the frontmatter to use `fec-candidate-id: "S4CA00522"` (most recent federal campaign) + added new `fec-candidate-id-house: "H8CA45130"` field. Verified end-to-end on fec-summary-pipeline: Katie Porter now returns $32.5M raised (2024), $31.1M spent, $1.4M COH. Commit `b6594eed`.

- **Built `scripts/verify-fec-candidate-ids.cjs`** — a read-only vault audit that probes every politician's `fec-candidate-id` against the FEC `/candidate/{id}/` endpoint and reports any that return 0 results, with suggested replacements via `/candidates/search/`. Ran across all 187 politicians with FEC IDs. **Result: 186 valid, 1 real bug (Katie Porter — already fixed), 5 transient rate-limit false positives.** The 5 false positives (Daniel Biss, Chris Murphy, Mallory McMorrow, Sheldon Whitehouse, Tim Walberg) all verified clean on direct re-check. TODO: add retry logic to the verify script.

### Done — LobbyView + doj-press dropped from CI

David spent ~30 minutes fighting a token paste for LobbyView and confirmed it's not worth the effort. LobbyView uses 1-hour Firebase ID tokens that cannot be stored as long-lived GitHub Secrets without a refresh-token flow, AND LobbyView's data is derivative of Senate LDA (which is Tier 1 and already working in CI). **Action:** commented out `run_if lobbyview` and `run_if doj-press` in `.github/workflows/api-enrichment.yml`. Both pipelines retain their hard-fail guards for safety. LobbyView re-enables once a Firebase refresh flow is wired. DOJ Press re-enables when a replacement source is built (CourtListener already covers DOJ litigation). Commit `0ade14c`.

### Done — session-save wired to update the Ops calendar

David noticed the Ops calendar at `/calendar` was showing stale state (cc_07 still "blocked", cc_05/cc_06/cc_08 still "pending") because previous session-save runs updated `Session State.md` but not `content/Admin Notes/sprint-schedule.md`. The calendar reads from sprint-schedule.md as its single source of truth. **Action:**
- Updated `C:\Users\third\.claude\skills\session-save\skill.md` with a new Step 3 that requires updating sprint-schedule.md on every session-save (mark existing tasks done, append ad-hoc cc_NN tasks with `added_adhoc: true` flag, update last-updated date, North Star metrics, Phase progress).
- Updated `.claude/commands/session-save.md` and `.claude/commands/sessionsave.md` (alias) with the same rule.
- Wrote `feedback_session_save_updates_calendar.md` memory and added it to `MEMORY.md` index so the rule survives any skill reload.
- Updated sprint-schedule.md with cc_05 through cc_13 (cc_05/06/08 retroactively marked done, cc_07 blocker refined, cc_09/10/11/12/13 added as ad-hoc work). Bumped North Star `pipeline_bugs_closed` from 3 to 20.

### Known issues / still outstanding

- **Scheduled `api-enrichment.yml` runs stopped firing after 2026-04-09 17:44Z.** Workflow is still marked `state: active`. Both scheduled runs that DID fire hit the 25-min parallel step timeout (25m14s / 25m24s durations). Unknown whether the timeout fix will cause the scheduler to resume — we'll know after the next scheduled slot (8/14/20/02 UTC).
- **`verify-fec-candidate-ids.cjs` has no retry logic** — produced 5 transient rate-limit false positives in its first run. Safe but noisy. Follow-up: wrap `probeCandidate()` in a 2–3 attempt retry with exponential backoff.
- **EPA ECHO DFR endpoint returns HTTP 500** for every query. Likely transient upstream outage; no fix on our end.
- **DOL OSHA inspection search returns HTTP 500** for every query. Same — transient upstream.
- **`datasette.publicaccountability.org` full outage** (ECONNREFUSED + 502 on HTTPS+HTTP). Third-party service down. Pipeline degrades gracefully.
- **SAM.gov rate limit is very aggressive** — single test calls trigger 60-second backoffs. The CI workflow limit of `--limit=10` should be fine, but local ad-hoc testing hits the limit fast.
- **LobbyView requires Firebase refresh-token flow** for any scheduled/CI use. Not yet wired. Dropped from CI for now.

### Next session priorities (Phase 1 Day 3, 2026-04-12)

1. **Verify scheduled `api-enrichment.yml` runs resumed** — check `gh run list --workflow=api-enrichment.yml --limit 5` for any new `schedule` event entries after 2026-04-11 20:00Z or 2026-04-12 02:00Z UTC. If still stuck, disable/re-enable the workflow to kick the scheduler.
2. **Add retry logic to `verify-fec-candidate-ids.cjs`** — wrap `probeCandidate()` in 3-attempt retry with 2s backoff, then re-run the audit for a clean baseline.
3. **Continue Research Claude depth reviews** — Brian Schatz (paused mid-review 2026-04-10), Jon Ossoff, Fetterman, Gary Peters, Chris Murphy, Martin Heinrich, Ed Markey, Tammy Baldwin.
4. **David: continue conflict triage** (`readiness-conflicts.md`, target 27/day, ~528 remaining).
5. **David: review 6 verified-candidates from 2026-04-10 + Cori Bush re-review.** Phase 1 exit target is ≥12 verified by 2026-04-16.
6. **Pipeline TODO: wire a vault data audit into preflight** — add a 3-second pipeline-health check that runs `verify-fec-candidate-ids.cjs --limit=20` as a sample and flags any broken IDs at session start.
7. **David (optional): decide whether to build FTC/FDA/OCC pipelines next** (my recommended data.gov additions — FTC first for highest leverage on corporate regulatory exposure).

### Commits this session

Engine repo (donor-map-engine, branch `main`):
- `0bec4b7` — First sweep: 6 root-cause fixes + hard-fail on DEMO_KEY (api-enrichment.yml, congress-pipeline.cjs, fec-pipeline.cjs, govtrack-pipeline.cjs, api-config.cjs, opensanctions-pipeline.cjs, propublica-pipeline.cjs, wikipedia-pipeline.cjs)
- `7cc28d4` — Second sweep: 7 more fixes (committee-pipeline.cjs, doj-press-pipeline.cjs, fec-summary-pipeline.cjs, lobbyview-pipeline.cjs, nhtsa-recalls-pipeline.cjs, sam-pipeline.cjs)
- `0ade14c` — CI: drop lobbyview + doj-press from api-enrichment parallel run, add verify-fec-candidate-ids.cjs

Site repo (donor-map-site, branch `v4`):
- `0c7b458d` — Pipeline Guide: document first sweep (6 incidents)
- `6a349653` — Pipeline Guide: document second sweep (7 incidents + engine-wide section)
- `2fe56158` — Merge claude/upbeat-saha into v4 (Katie Porter fix)
- (this session-save commit coming next)

---

## Previous Session
Claude: Research + Code (both hats, single operator)
Date: 2026-04-10 afternoon (root-cause fix for recurring Whitehouse YAML bug, Cori Bush cleanup + promotion to ready, Pipeline Guide Perplexity merge documented)

### Root-cause fix: Recurring donors-field YAML corruption

**The bug that kept coming back:** Sheldon Whitehouse's `donors` frontmatter field kept getting corrupted into a hybrid string+list format that broke YAML parsing. I fixed it twice in this session and it came back each time. Mark Kelly, Tucker Carlson, and Hillary Clinton hit the same pattern during yesterday's merge script run.

**Root cause identified — 3 Ops API routes with the same bug:**
1. `ops/src/app/api/relationships/route.ts` line 71
2. `ops/src/app/api/suggestions/route.ts` line 232
3. `ops/src/app/api/profile/connections/route.ts` (regex-based approach that ignores multi-line YAML lists)

**The bug pattern:**
```typescript
const fmValue = fm[relationshipType] as string | undefined
// ...
fm[relationshipType] = fmValue ? `${fmValue} · ${wikilink}` : wikilink
```

The TypeScript cast LIES. When `donors` is a YAML list in the file, `fmValue` is a JS array at runtime. The template literal `${fmValue}` calls `Array.prototype.toString()`, which joins with `,` (no spaces), producing corrupted output like `"item1,item2,item3 · [[new]]"`. gray-matter then writes this as a string value at `donors:`, and on the next read the old list items orphan below it — YAML parse fails.

**Reproduced the bug in an isolated Node test** using gray-matter to confirm.

**Fix applied:** Added `normalizeFieldForCheck()` and `appendRelationship()` helpers that:
- Detect whether the existing value is an array or string
- Preserve the existing shape (array stays array, string stays string)
- **CRITICAL:** never use template literal on an array value

Applied the fix to all three routes (both POST adds and DELETE removes). Rewrote `profile/connections/route.ts` entirely to use gray-matter + shared helpers instead of regex (the regex version only matched the first line of multi-line YAML lists, which is why it was silently corrupting profiles with list-format fields for months before anyone noticed).

**Verification:** Ran a unit test with 3 input cases (array, string, undefined) — all produce correct output. Ran a vault-wide YAML parse scan — 0 errors after the fix. Sheldon Whitehouse's donors field is now a clean 10-item YAML list, no hybrid state.

**Documented in `content/Pipeline Guide.md`** under the new "Ops application frontmatter write rules" section. Explains the bug pattern, the critical rule ("never stringify an array via template literal"), and notes that if a 4th frontmatter writer is added, the helpers should be copied verbatim or extracted to `ops/src/lib/`.

### Cori Bush: Pass 2 — pipeline integration editorial pass (commit `e7985c62`)

After Pass 1 cleanup (below), ran a second editorial pass to integrate fresh pipeline data into the body narrative. Research Claude lane — cites auto-block facts in the body, does NOT edit auto-blocks themselves.

**What the pass produced:**

- **Central Thesis** — integrated **H.Res. 786** (Oct 25, 2023 ceasefire resolution) as the named trigger event that moved Bush from AIPAC watchlist to primary target. Previously the narrative said "ceasefire resolutions" generically; now cites the specific resolution number with Congress.gov link. Added the 3.3-to-1 opposition-to-fundraising ratio ($13.97M opposition IE vs $4.17M own fundraising) as the disciplinary-scale spending signal.

- **Donor Class Map** — rewrote with fresh FEC data:
  - 5-cycle fundraising arc table (2018 $177K → 2020 $1.43M → 2022 $2.45M → 2024 $4.17M → 2026 $534K)
  - Full 2024 IE spending breakdown (UDP $9.96M opposed, Fairshake $2.79M, Mainstream Democrats PAC $992K opposed, Justice Democrats $2.76M supporting, WFP $878K supporting)
  - 3.17-to-1 outside spending ratio documented as largest anti-Squad ratio of 2024

- **Donation-to-Policy Timeline** — expanded from 9 rows to 15:
  - Oct 25, 2023 H.Res. 786 ceasefire resolution bolded as trigger event
  - H.Res. 634 (Unhoused Persons Bill of Rights), H.Con.Res. 92 (Mary Meachum Freedom Crossing), H.R. 8470 (Helping Families Heal Act) — all cited by number with Congress.gov links
  - Iron Dome no-vote specific context (420-9 vote, 1 of 9)
  - 2026 cycle: $534K raised, $0 PAC, 70.6% individual
  - 38 bills sponsored / 756 cosponsored / 2,239 total votes from fresh GovTrack

- **Rhetorical Signature Moves** — Grassroots-Only Rebrand strengthened with concrete $0 PAC number

- **Analytical Patterns** — expanded from 2 to 5 to match the depth of the other verified-candidates:
  1. Donor-Class Override (strengthened with exact numbers)
  2. Villain Framing (strengthened with bills-that-triggered vs bills-that-didn't)
  3. **Multi-Pressure Vector Targeting** (NEW) — documents compound-pressure sequence
  4. **Fundraising Arc Inversion** (NEW) — frames comeback as AIPAC enforcement reversal test
  5. **Grassroots Insulation Limit** (NEW) — asks whether there's a floor below which grassroots model fails

**Analytical depth parity check:**

| Profile | Analytical Patterns |
|---|---|
| Tlaib | 3 |
| Omar | 3 |
| Pressley | 4 |
| Khanna | 6 |
| Whitehouse | 4 |
| Warnock | 4 |
| **Cori Bush (post-integration)** | **5** |

304 lines total (up from 261), all YAML parses clean, 0 auto-block edits. She's now at the same depth as the other verified-candidates and ready for David's verified sign-off decision.

**Cori Bush status:** `content-readiness: ready`, `editorial-result: pass`, two-pass review logged in `editorial-notes`. Not flagged as verified-candidate per the rule (Research Claude flags, David signs off). David's call whether to re-promote her alongside the other 6 verified-candidates from this morning.

### Cori Bush: Pass 1 — pipeline verification + cleanup + promoted to ready

**Pipeline verification after this morning's engine fixes + 452-file API enrichment batch:**

All 6 engine-layer fixes from 2026-04-10 morning HELD for Cori Bush:
- ✅ `auto:congress-legislation` — clean, bioguide `B001224`, Missouri, 117-118 Congress, 39 bills sponsored, 756 cosponsored. **A000383 bug fixed.**
- ✅ `auto:fec-politician` — clean, 2026 cycle $534,492 raised for comeback, accurate top outside spenders (UDP $9.96M opposed, Fairshake $2.79M opposed)
- ✅ `auto:voting-record` — clean, actual 118th Congress votes
- ✅ `auto:govtrack pending-merge` — clean data (38/756/2,239), **GovTrack cache invalidation fix worked**
- ✅ No `auto:doj-press` block (engine DOJ sanity cap working)
- ✅ No `auto:nhtsa-recalls` block (non-auto matching fix working — she's not auto-adjacent)
- ✅ No `auto:sam-contracts` block (she's not a contractor)
- ✅ Committee assignments correctly empty (she's not in 119th Congress)

**Editorial cleanup applied (7 issues):**
1. Folded `auto:govtrack pending-merge` block into main `auto:govtrack` block (Code Claude's pending-merge pattern worked — fresh data preserved without overwriting prior edits)
2. Fixed non-standard `[!contradiction-cleared]` → `[!contradiction]`
3. Fixed broken wikilinks in `related`: `[[Jamaal Bowman Master Profile]]` → `[[_Jamaal Bowman Master Profile|Jamaal Bowman]]`, `[[Justice Democrats]]` → `[[Justice Democrats and Brand New Congress - The Infrastructure He Built]]`, `[[Ayanna Pressley Master Profile]]` → `[[_Ayanna Pressley Master Profile|Ayanna Pressley]]`
4. Expanded `related` with UDP, Fairshake PAC
5. Structured `donors` as YAML list (3 items) and `opposes` as YAML list (5 items)
6. Added `issues` field (6 items), `fec-committee-id` (C00638767), `known-gaps` (restored — was lost in a merge)
7. Updated `editorial-review-date` from stale 2026-04-08 → 2026-04-10, `editorial-result: block` → `pass`, `chamber: House` → `Former House`, added N/A note under dangling empty Committee Assignments section
8. **Promoted `content-readiness: draft` → `ready`** for David's review

**NOT promoted to verified-candidate** — awaiting David's explicit sign-off per the rule (Research Claude flags, David signs off). David previously said Cori Bush was "the only REAL A+" before the contamination was discovered, so she's close, but the call is his.

### Also this session (context for the above work)

- Pushed Pipeline Guide merge with Perplexity research for all 12 Tier 1 pipelines (commit `3777470e`, pushed to origin/v4 as `5b2bcb72`). 2,562 lines total, each pipeline has its own "Known incidents (our vault)" subsection with the specific bugs we fixed 2026-04-10 documented with commit hashes.
- Pipeline Research Protocol codified in 3 locations: `CLAUDE.md`, `content/Vault Rules.md`, and auto-memory (`feedback_pipeline_research_protocol.md`). The rule: before building or fixing any pipeline, check the Pipeline Guide cheatsheet first. When building a NEW pipeline, request Perplexity research from David first. If research unavailable, revert to common REST conventions and document quirks as learned.
- Merged Code Claude's cc_05 (562 profiles dataview cleanup) + cc_06 (Ops editor rule comments) from origin/v4.

### Sprint progress after this afternoon's work

| Metric | Status |
|---|---|
| Verified-candidates flagged for David sign-off | 6 (Tlaib, Omar, Pressley, Khanna, Whitehouse, Warnock) — all from this morning |
| Cori Bush status | Back at `ready` (was draft after Code Claude demoted for contamination). Awaiting David's decision on verified-candidate re-flag. |
| Pipeline bugs closed | **7 of 7** — all known pipeline bugs now resolved (6 engine-layer + 1 Ops API array-toString bug fixed this afternoon) |
| Critical build fixes | 3 (Tucker Carlson morning, Hillary Clinton morning, Whitehouse afternoon — root cause now fixed at source) |
| Draft→ready promotions this session | 8 (7 morning + Cori Bush afternoon) |

### Next session priorities (Phase 1 Day 2, 2026-04-11)

1. **David: review 6 verified-candidates + Cori Bush re-review.** Phase 1 exit target is ≥12 verified profiles by 2026-04-16.
2. **David: deploy the Ops relationship-writer bug fix.** Ops app needs a restart/rebuild for the fix to take effect on the running instance (the code change is committed but the running server may still have the old module loaded).
3. **Continue Research Claude depth reviews** — Brian Schatz (paused mid-review this morning), then Jon Ossoff, Fetterman, Gary Peters, Chris Murphy, Martin Heinrich, Ed Markey, Tammy Baldwin.
4. **David: continue conflict triage** (readiness-conflicts.md, target 25-30/day, ~528 remaining).
5. **Research Claude: build out Summer Lee stub from raw → ready** (already has substantive body content, just needs source restructuring).
6. **David: Perplexity research one Tier 2 pipeline** (Federal Register, CourtListener, or EPA ECHO next).
7. **Quarterly refresh target: 2026-07-10.** Pipeline Guide cheatsheets should be re-verified every 90 days per the `Last verified` date discipline.

---

## Previous Session
Claude: Code
Date: 2026-04-10 (Phase 1 Day 1 — Calendar tab + cc_05 root-cause + cc_06 rule comments)

Done (Ops Calendar tab — shipped earlier this session):
- New `/calendar` route in ops app with month grid Apr 10-30, 3 phase bands, 4 North Star progress bars, 21 day cells, 36 task checkboxes, day-detail modal. Reads `content/Admin Notes/sprint-schedule.md` live via a YAML block parser. Writes mutable completion state to `ops/data/sprint-state.json` (gitignored). Task toggles persist via `/api/sprint-state/task` and survive reload. Initial state seeded from the schedule's `status:` fields — cc_01-04 show done, cc_07+rc_05 show blocked.
- Files added: `ops/src/app/calendar/{page,Calendar,MonthGrid,DayCell,PhaseBar,TaskCheckbox,DayModal,utils,types}.tsx`, `ops/src/lib/{sprint-schedule-parser,sprint-state}.ts`, `ops/src/app/api/sprint-state/{route,task/route,day/route,snapshot/route}.ts`, sidebar nav item.
- js-yaml installed in ops/ (spec said "already in deps" but wasn't). Parser uses JSON_SCHEMA so ISO dates stay as strings.
- Design decision: the Ops app is **excluded** from `content/Design System.md`. Cream/brutalist rules are website-only; Ops stays dark. Saved to memory (`feedback_ops_excluded_from_design_system.md`).

Done (cc_05 — root-caused + fixed the inline-dataview resurgence):
- **Root cause analysis:** NUL-byte variant (54 files) was cleaned 2026-04-09 by Research Claude's sweep, so NULs are 0 now. But 562 files still had `` `content-readiness:: ready `` (and `profile-status::`, 1 `last-updated::`) as stale body-level Obsidian Dataview inline fields with NO NUL byte. Git blame on a sample traces these lines back to `f5590025 Quartz site initial setup` — they are **legacy Obsidian vault import cruft** from before the frontmatter-only rule was codified, not output from any actively-running script. **No current code writes `field::` inline dataview syntax**, so cc_05 was a cleanup, not a code fix.
- **New script** `scripts/strip-inline-dataview.cjs` (199 lines) — walks content/, splits frontmatter from body, strips body lines matching `/^\s*\`?(content-readiness|profile-status|source-tier|last-updated|last-enriched|last-verified-by|content-type|editorial-result|editorial-reviewer|editorial-review-date|corroboration-count)::/m`, collapses any 3+ newline runs back to 2, never touches frontmatter. Dry-run default, `--write` to apply, `--verbose` for per-file output.
- **Sweep applied:** 562 files touched, 731 lines removed (content-readiness 571, profile-status 159, last-updated 1). Post-sweep re-run reports 0 remaining matches.

Done (cc_06 — rule comments on Ops profile editor sources):
- Added block-comment rule headers to 6 files so future edits honor the frontmatter-only rule, URL editor-only rule, and the Research-flags/David-signs verified-promotion rule:
  - `ops/src/app/editor/page.tsx` — profile editor UI
  - `ops/src/app/api/edit/route.ts` — PUT/DELETE content
  - `ops/src/app/api/profile/readiness/route.ts` — readiness tier updates
  - `ops/src/lib/local-write.ts` — low-level vault writer
  - `ops/src/app/api/urls/save/route.ts` — URL triage save endpoint
  - `ops/src/app/urls/page.tsx` — URL Manager UI
- Comments are advisory only; no runtime behavior changes. Rules trace to Vault Rules.md + CLAUDE.md.

Commits on v4 (all pushed):
- `59e2bd79` cc_05: strip-inline-dataview.cjs sweep script
- `3829e3eb` cc_05: strip 731 legacy body-dataview lines from 562 profiles
- `15e76204` cc_06: rule comment headers on Ops profile editor sources
- (Earlier same session: calendar feature chunks + `aa64f85f` conflict resolution + merge)

Known issues / still outstanding:
- **cc_07** — 12 stub enrichment still blocked on GitHub Actions re-enablement.
- Investigate-queue.md was updated externally mid-session (37 → 38 items, +OPPORTUNITY MATTERS FUND→Ashley Hinson). Left uncommitted since it's an external edit.
- Research Claude's open question #2 (Sheldon Whitehouse `donors` field string+list hybrid corruption) not yet investigated.
- Research Claude's prevention rule suggestion: extend `auto:* pending-merge` pattern to frontmatter field updates — not yet implemented.

Next session priorities:
1. **cc_07** when GitHub Actions re-enabled: trigger pipeline runs for the 12 stubs + the 95 cleaned profiles + Cori Bush/Bowman re-review with fresh govtrack data.
2. **Wire Breadcrumbs** to all Ops pages + migrate pages to use global `useToast()`.
3. **Build-success polling** in `/session-save` and `/deploy` — per Research Claude's lesson-learned Red Flag #7, poll `gh run list --limit 2` after push and alert on failure.
4. **YAML parse scan** in `/preflight` — per lesson-learned Good Idea #10, 3-second scan at session start prevents silent build-break states.
5. **Investigate Sheldon Whitehouse `donors` string+list hybrid** — find the tool that can produce a frontmatter field with both string and list values at the same key.
6. **Contradiction markers for website** — split-color graph lines, asterisks on profile widgets.

---

## Previous Session
Claude: Research
Date: 2026-04-10 (Phase 1 Day 1: 7 depth reviews + critical build fix + vault cleanups + pipeline cheatsheet template + lessons-learned doc)

### Part 1: Phase 1 Kickoff — Overnight Merge Resolution

Resolved overnight merge between Research Claude's `claude/reverent-hugle` worktree and main repo's v4 branch. Main had advanced 9 commits with Code Claude's pipeline quality fixes (A000383 cleanup, QVT false positives, GovTrack cache, redirect enrichment, 6 redirect files cleaned, Cori Bush demotion, auto-connection engine run).

Strategy:
- **Reverse merge** `origin/v4` into the worktree branch
- **94 conflicts** resolved:
  - 55 whitespace-only → took ours (my inline marker removals stand)
  - 30 related-field → unioned both sides' wikilinks with dedup
  - 7 mixed-field → kept both (e.g., my `related:` + their `donors:` on same profile)
  - Cori Bush → took theirs (respects demotion for A000383 contamination)
  - **Jamaal Bowman → demoted verified→ready** (same A000383 reasoning — his 3 Tier 1 source types included contaminated Congress.gov data)
  - AOC, David Sacks → took ours (inline marker removals per frontmatter-only rule)
  - QVT Financial → kept mine for source-tier 1, noted pipeline fixes resolved the flags

Merge commit: `3c1028d9`. Pushed via fast-forward to `origin/v4`.

### Part 2: Sprint Infrastructure (schedule + calendar spec + pipeline cheatsheet template)

Wrote three companion files committed as `572f5cc2`:

1. **`content/Admin Notes/sprint-schedule.md`** — Structured schedule for Apr 10-30 sprint with YAML blocks for phases, daily block template, phase-specific tasks by owner (Code Claude / Research Claude / David), risk register, April 30 review process. Parseable by the Ops calendar component. Single source of truth for both Claude sessions AND the calendar UI.

2. **`content/Admin Notes/calendar-spec.md`** — Self-contained build spec for Code Claude to build the Ops Calendar tab. Reads sprint-schedule.md, writes mutable completion state to `ops/data/sprint-state.json` (gitignored). Month-grid view for Apr 10-30 with phase coloring. Brutalist design per Design System. v1 desktop-only, mobile Phase 2.

3. **`content/Pipeline Guide.md`** — Added new Cheatsheets section with standardized 12-pipeline template pre-filled with known gotchas from today's fixes (A000383 bug, QVT false positives, DOJ sanity cap, GovTrack cache, redirect enrichment). Perplexity research checklist at top. David filling in one per day during the sprint.

### Part 3: Phase 1 Day 1 Depth Reviews (7 profiles)

Squad/leadership depth review per the sprint plan `rc_03` task. **6 profiles flagged as verified-candidates** for David's sign-off (only David signs off per the rule). **1 profile promoted to `ready` only** (insufficient Tier 1 source types).

Profiles reviewed:

| # | Profile | Before | After | Verified-candidate? | Tier 1 source types |
|---|---|---|---|---|---|
| 1 | **Rashida Tlaib** (MI-12) | draft | ready | ✅ Yes | 4 (FEC, Congress, GovTrack, House Oversight primary) |
| 2 | **Ilhan Omar** (MN-5) | draft | ready | ✅ Yes | 3 (Congress bioguide O000173, FEC, omar.house.gov) |
| 3 | **Ayanna Pressley** (MA-7) | draft | ready | ✅ Yes | 4 (Congress P000617, FEC, GovTrack, House.gov) |
| 4 | **Greg Casar** (TX-35) | — | — | — | **GAP** — no profile exists, added to stub build backlog |
| 5 | **Hakeem Jeffries** (NY-8) | draft | ready | ❌ No | Only 1 (FEC). Needs Congress.gov + House leadership page. |
| 6 | **Ro Khanna** (CA-17) | draft | ready | ✅ Yes | 4 (FEC, Congress K000389, GovTrack, khanna.house.gov) |
| 7 | **Sheldon Whitehouse** (RI Senate) | draft | ready | ✅ Yes | 4+ (FEC, Congress DISCLOSE Act, multiple whitehouse.senate.gov primary speeches, Senate Budget Committee) |
| 8 | **Raphael Warnock** (GA Senate) | draft | ready | ✅ Yes | 4 (FEC, Congress W000790, GovTrack, warnock.senate.gov) |

**Verified-candidates flagged for David sign-off (6 total):**
1. Rashida Tlaib — MI-12 Squad
2. Ilhan Omar — MN-5 Squad
3. Ayanna Pressley — MA-7 Squad
4. Ro Khanna — CA-17 progressive-tech
5. Sheldon Whitehouse — RI Senate dark money watchdog
6. Raphael Warnock — GA Senate

Standard fixes applied to each: frontmatter cleanup (bioguide-id added, fec-committee-id added where known, `known-gaps` fixed from "No mapped relationships" to real gaps, structured `opposes`/`donors`/`issues` fields, committees/former-committees expanded), sources restructured with Verified/Archived sections, OpenSecrets Tier 1 citations moved to Archived per Vault Rules, inline dataview markers removed, `editorial-result: verified-candidate` flag added with detailed notes.

### Part 4: Vault-Wide Data Quality Cleanups

Three vault-wide sweeps this session:

1. **DOJ false-positive cleanup** — **177 profiles** had contaminated `auto:doj-press` blocks showing ~264,413 mentions (the API index-size bug main fixed at the engine layer but never retroactively cleaned from vault data). All 177 stripped with a removal note documenting the fix and that blocks will repopulate correctly on next pipeline run. Commit `f3a6da46`.

2. **CRITICAL: YAML parse error fix** — Tucker Carlson and Hillary Clinton profiles had malformed `related`/`donors` fields. **Every push since 2026-04-09 was breaking the Quartz build for hours** before the user noticed. Root cause: yesterday's `consolidate-dual-related-fields.py` captured the YAML folded-scalar marker `>-` as literal text inside a quoted string. YAML re-parsed the marker inside the value, breaking the frontmatter. Fixed by rewriting both as inline single-line quoted strings with all 25+3 wikilinks preserved. Verified build succeeded. Commit `2c3ee728`.

3. **Preventive YAML folded-scalar conversion** — Vault-wide scan found 11 additional profiles using folded-scalar YAML on structured fields (Cortez Masto, Mark Kelly, Fetterman, Sinema, MTG, George W Bush, Hinson, Hawley, Tillis, Linda McMahon, Michael Waltz). Currently parsing fine but vulnerable to the same merge script bug. Converted all 11 to inline format. Commit `4df3f172`.

Bonus cleanup: Sheldon Whitehouse profile was corrupted mid-session by an unknown linter/auto-merger that combined a string-format `donors:` with a list-format `donors:` on the same YAML key, breaking parse. Fixed with a clean list.

### Part 5: Pipeline Enrichment Merge

`origin/v4` advanced during work with Code Claude's 537-file API enrichment batch (`69552d45`). Merged into worktree, resolved Mark Kelly conflict (unioned related field with new Boeing wikilink from pipeline, kept my inline `opposes` format). Merge commit: `e29ecd40`.

**Important pattern discovered:** Code Claude's pipeline enrichment now uses `<!-- auto:* pending-merge -->` blocks. When the pipeline detects prior Research Claude edits, it drops new data in a marked block for manual review instead of overwriting. Seen on Cori Bush's govtrack block. **Keep this pattern. Extend to other auto blocks and eventually to frontmatter fields.**

### Part 6: Rules Codification

Added new universal rule to `content/Vault Rules.md` (§ YAML formatting for structured fields):

> **Never use YAML folded-scalar (`>`, `>-`, `>+`) or literal-block (`|`, `|-`, `|+`) syntax on `related`, `donors`, `opposes`, `politicians-funded`, `politicians-opposed`, or `top-donors` fields.**
>
> Always use single-line quoted string with ` · ` separator OR block-style YAML list.

Prevention rationale documented in the rule: merge scripts that parse and re-quote values capture the scalar indicator as literal text, creating second-order YAML parse errors that break the Quartz build.

### Part 7: Lessons Learned Document

Wrote `content/Admin Notes/lessons-learned-2026-04-10.md` — append-only postmortem documenting 8 red flags + 10 good ideas from this session. Each red flag has a prevention rule. Each good idea has a repeat pattern. Future sessions should read this on kickoff.

Key red flags for Code Claude to investigate:
1. **`consolidate-dual-related-fields.py` has a latent bug** — doesn't strip YAML scalar indicators before re-quoting. Fix before next full-vault run.
2. **Unknown linter/auto-merger corrupted Sheldon Whitehouse's YAML** — combined string + list at same key. Reproducing the sequence to identify the tool.
3. **Something is re-adding inline dataview markers** to profiles after the 2026-04-09 sweep. Source unknown.
4. **GitHub Actions build failures were silent for hours.** `/session-save` should verify build success before declaring done.

### Done list (condensed)

- Merged overnight Code Claude pipeline fixes into worktree, resolved 94 conflicts
- Wrote sprint-schedule.md, calendar-spec.md, Pipeline Guide cheatsheet template
- 6 Squad/leadership profiles promoted draft→ready + flagged verified-candidate (Tlaib, Omar, Pressley, Khanna, Whitehouse, Warnock)
- 1 profile promoted draft→ready only (Jeffries — insufficient Tier 1 sources)
- 1 profile gap flagged (Greg Casar — no master profile exists)
- Jamaal Bowman demoted verified→ready (A000383 contamination affected his Congress source count)
- 177 profiles stripped of bogus DOJ press auto-blocks (vault-wide sweep)
- 2 profiles YAML-parse-error fixed (Tucker Carlson, Hillary Clinton) — unblocked Quartz build
- 11 profiles preventively converted from folded-scalar to inline YAML
- Sheldon Whitehouse YAML corruption repaired (linter/auto-merger bug)
- Merged Code Claude's 537-file pipeline enrichment run, resolved Mark Kelly conflict
- Added YAML folded-scalar prohibition rule to Vault Rules
- Wrote lessons-learned-2026-04-10.md (8 red flags + 10 good ideas + open questions)

### Known issues carried forward

- **`/session-save` and `/deploy` should verify build success** via `gh run list` after push. Today's build failures were silent for hours.
- **`consolidate-dual-related-fields.py` needs YAML scalar indicator stripping** before next full-vault run.
- **Something is re-adding inline dataview markers** — tool unknown, investigate.
- **Something corrupted Sheldon Whitehouse's YAML** — tool unknown, investigate.
- **Pipeline enrichment runs are still blocked on GitHub Actions** for the 12 new stubs built 2026-04-09 + re-review of Cori Bush and Bowman after contamination cleanup.
- **Only Nancy Pelosi has say-vs-pay data** (carried from earlier sessions) — ContradictionCard shows on 1 profile.
- **Mobile layout not yet polished** for Signal Bar / ContradictionCard / ProfileHeader (Phase 2 task).
- **Interactive pages contrast issues** (Power Rankings, Issue Explorer, etc — Phase 2 task).

### In progress (paused for session-save)

- **Brian Schatz depth review** — read the file (lines 1-80), identified the profile structure, haven't committed edits yet. Resume next Research Claude session as next depth candidate.
- **Pipeline cheatsheet merge** — user provided Perplexity research file at `C:\Users\third\Downloads\00-MASTER-PIPELINE-CHEATSHEETS.md`. Queued to merge into `content/Pipeline Guide.md` after session-save.

### Next session priorities (Phase 1 Day 2, 2026-04-11)

1. **Merge Perplexity pipeline cheatsheets** from `C:\Users\third\Downloads\00-MASTER-PIPELINE-CHEATSHEETS.md` into `content/Pipeline Guide.md`. Reconcile with pre-filled gotchas. Update Perplexity research checklist.
2. **Resume Brian Schatz depth review** (next on the Phase 1 Senate candidate list).
3. **Continue depth reviews from the draft queue**: Jon Ossoff (GA), Gary Peters (MI), John Fetterman (PA), Martin Heinrich (NM), Chris Murphy (CT), Tammy Baldwin (WI), Ed Markey (MA), Brian Schatz (HI). Target: 4 more verified-candidates by end of Day 2.
4. **David: review 6 verified-candidates flagged today** (Tlaib, Omar, Pressley, Khanna, Whitehouse, Warnock) and sign off on any that pass editorial review. Target: 2-4 true `verified` promotions to hit the Phase 1 exit target of ≥12 verified total.
5. **David: continue conflict triage** from `content/Admin Notes/readiness-conflicts.md` (target: 25-30/day × 6 days remaining in Phase 1 = 150-180 more resolved, bringing backlog from 528 → ~350).
6. **Code Claude: investigate and fix the `consolidate-dual-related-fields.py` YAML scalar indicator bug** before running it again.
7. **Code Claude: investigate the inline dataview marker re-addition source** and the Sheldon Whitehouse YAML corruption source.
8. **Code Claude: build the Ops Calendar tab** per `content/Admin Notes/calendar-spec.md` (in parallel, separate session).
9. **Code Claude: run pipeline enrichment** on the 12 new stubs once GitHub Actions re-enabled.
10. **David: Perplexity research one more pipeline** for the Pipeline Guide (top priority: FEC if not already submitted, then Congress.gov, then Senate LDA).

### Phase 1 progress vs targets

- **Verified profiles:** 3 (baseline). Today: 0 new `verified` (6 verified-candidates awaiting David sign-off). Phase 1 exit target: ≥12. **Status: behind target pending David's review.**
- **Draft → ready promotions:** 7 today (Tlaib, Omar, Pressley, Jeffries, Khanna, Whitehouse, Warnock). Phase 1 exit target: ≥25 this week. **Status: on track.**
- **Pipeline bugs closed:** 4 of 7 (A000383, QVT false positives, redirect enrichment, GovTrack cache). Remaining: NUL-padding script root cause, Ops profile editor rule comments, pipeline enrichment runs. **Status: 57% done, on track.**
- **Readiness conflicts triaged:** 0 today (David's task). Phase 1 exit target: ≥175. **Status: David's backlog, not blocking.**
- **Ops rule docs (`ops/CLAUDE.md`, `ops/RULES.md`):** not started. **Status: behind, move to Day 2.**

---

## Previous Session
Claude: Research
Date: 2026-04-09 (full day: queue resolution + readiness promotions + 12 stubs + data quality sweeps + rules codification + Apr 10-30 sprint plan)

### Part 6: Apr 10-30 Sprint Plan Written

Plan file at `C:\Users\third\.claude\plans\cheeky-knitting-fox.md`. **22-day sprint** with 4 targets (in priority order):
1. **Depth:** ≥ 40 verified profiles by Apr 30 (from 3 today)
2. **Breadth:** ≥ 100 draft → ready promotions (from 288 to ≤ 188)
3. **Systems:** All Code Claude pipeline bugs cleared + 528 conflicts triaged + Ops rule codified
4. **Polish:** Public launch Apr 30 with mobile polish, interactive pages, feedback/correction systems

Three-phase structure:
- **Phase 1 (Apr 10-16):** Fix the plumbing. Pipeline bugs first. Target 12 verified, 175 conflicts resolved.
- **Phase 2 (Apr 17-23):** Depth acceleration. Mobile polish. Target 32 verified, 75 promotions.
- **Phase 3 (Apr 24-30):** Launch prep. Legal review. Soft launch Apr 27. Public Apr 30. Target 40 verified, 100 promotions, 0 conflicts.

Budget: 215 hours across 22 days at ~10 hours/day baseline. Daily template batches Research Claude / Code Claude / David-only work to minimize context switching. Hard 8:30pm stop most days, Sunday half-day off, max 3 crunch days (14 hours).

**Key discipline built into plan:** verified (A+) tier is protected — Research Claude flags candidates, only David's sign-off makes a profile truly verified. This is risk mitigation against Research-Claude-self-grading tier inflation (the issue that produced the old "ready" bloat).

**April 30 review process:** measure actuals, snapshot vault, write retrospective, delete this plan file, write a fresh May plan from what actually happened. Short horizons, honest resets.

### Part 5: Stream Deck Prompts Merged with Session Protocol

Both Research Claude and Code Claude Stream Deck prompts updated with:
- Session protocol (/preflight at start, /session-save at end on trigger words)
- Reference to plan file at C:\Users\third\.claude\plans\
- Corrected readiness tiers: raw → draft → ready → verified (was wrongly listed as raw→draft→developed→verified→ready)
- Frontmatter-only rule for structured fields (new rule, codified today)
- URL editor-only rule (new rule, codified today)
- Research Claude: explicit "flag verified candidates, only David signs off" protection

### Part 4: Red Flag Sweep (vault-wide data quality cleanup)

5 data quality sweeps run across entire vault in Research Claude's lane:

1. **NUL byte corruption** — 54 files had NUL bytes (41 profiles with 1 NUL each, 13 Contradiction Deep Dive stories with 19 NULs each). All cleaned. Pattern: all NULs followed `content-readiness:: ready\n` — root cause is a script writing that line with NUL padding. **Flagged for Code Claude: find and fix the script.**

2. **Inline dataview marker cleanup** — 1,448 files had legacy dataview inline markers (`content-readiness::`, `profile-status::`, `research-status::`) in body. Found **535 state conflicts** where inline said one thing and frontmatter said another. Cleaned 879 non-conflicting files (1,196 lines removed). **528 conflicts written to `content/Admin Notes/readiness-conflicts.md`** for David's manual triage (batch 25-30/day).

3. **Double `---` after frontmatter** — 0 hits after the inline marker cleanup (earlier manual fixes + sweep collapsed triple newlines). Clean.

4. **Dual `related` fields** — 632 files had `related` in BOTH frontmatter and body. **Sample check revealed ZERO overlap** — frontmatter and body versions contained completely different wikilink sets. **Merged 1,193 files** (632 dual + 561 body-only) into frontmatter with union, dedup, and alias preservation. Body lines removed. Half the relationship graph was hidden in body dataview fields before this merge.

5. **Non-standard callouts** — only 3 vault-wide. Fixed `[!class-analysis]` → `[!money]`, `[!pattern]` → `[!note]`, `[!donor-first]` → `[!money]`.

### Part 3.5: Rules Codification (Data Integrity Protection)

Two new vault-wide rules adopted and codified in 4 locations:

**Rule 1: URL fixing is Editor-only (David)**
- Neither Research nor Code Claude fixes, hunts, replaces, or verifies URLs
- Reason: automated URL hunting risks citing wrong entities (wrong FEC IDs, dead aggregators, title/URL mismatches)
- Locations: `CLAUDE.md`, `content/Vault Rules.md`, auto-memory (`feedback_url_fixing_editor_only.md`), Session State

**Rule 2: Frontmatter is the ONLY source of truth for structured fields**
- All structured data (content-readiness, related, donors, opposes, source-tier, etc.) goes in YAML frontmatter
- Never in body dataview inline fields (`field:: value`)
- Reason: the dual-source drift discovered 2026-04-09 — 535 readiness conflicts + 632 disjoint `related` fields = data loss
- When reviewing a profile, merge any body inline field into frontmatter and delete the body line
- Exception: fenced ` ```dataview ` query blocks are fine
- Locations: `CLAUDE.md`, `content/Vault Rules.md`, auto-memory (`feedback_frontmatter_only_structured_fields.md`), Session State

**Still pending for Code Claude (Phase 1 Must-Do):**
- Write `ops/CLAUDE.md` and `ops/RULES.md` documenting both rules (Research Claude task per plan)
- Add rule comments to ops profile editor source (Code Claude task per plan)

### Part 3: 12 Profile Stubs Built (preserve vault connections)

### Part 3: 12 Profile Stubs Built (preserve vault connections)

After the readiness pass revealed 3 missing profiles (Summer Lee, Nina Turner, George Latimer), a full sweep identified 11 more missing profiles that are heavily cross-referenced in the vault but have no master file. All 12 stubs built at `content-readiness: raw` to preserve wikilink integrity and document what's already known from vault cross-references.

**Politician stubs (5):**
- **Summer Lee** (`content/Politicians/Democrats/House/Summer Lee/`) — Built with full body content (vault-sourced): PA-12, first Black congresswoman from PA, AIPAC survivor (2022 and 2024). The counterexample to Bowman/Bush in the Donor-Class Override pattern. This one has a central thesis and class analysis; others are slimmer.
- **Nina Turner** (`content/Politicians/Democrats/House/Nina Turner/`) — Former OH state senator, Sanders 2020 co-chair, lost OH-11 to Shontel Brown twice (2021, 2022). DMFI's earliest high-profile target.
- **George Latimer** (`content/Politicians/Democrats/House/George Latimer/`) — NY-16 Democrat, Bowman's replacement, beneficiary of $14.9M UDP spending.
- **Wesley Bell** (`content/Politicians/Democrats/House/Wesley Bell/`) — MO-01 Democrat, Bush's replacement, former St. Louis County Prosecuting Attorney.
- **Shontel Brown** (`content/Politicians/Democrats/House/Shontel Brown/`) — OH-11 Democrat, defeated Turner twice. Established the DMFI primary-enforcement precedent.

**Donor stubs (6):**
- **Bernie Marcus** (`content/Donors & Power Networks/Mega-Donors/Bernie Marcus.md`) — Home Depot co-founder, $2M to UDP, ~$7M to Trump, died Nov 2024.
- **Mark Mellman** (`content/Donors & Power Networks/Israel Lobby/Mark Mellman.md`) — DMFI founder (Jan 2019), Democratic pollster, architect of the primary enforcement model.
- **Brian Armstrong** (`content/Donors & Power Networks/Tech & Crypto/Brian Armstrong.md`) — Coinbase CEO, $131.5M cumulative Coinbase + $1M personal to Fairshake.
- **Ben Horowitz** (`content/Donors & Power Networks/Tech & Crypto/Ben Horowitz.md`) — a16z co-founder, $9.5M personal to Fairshake 2023, $2.5M to Right For America 2024. Standalone profile to complement existing `[[Marc Andreessen & Horowitz]]` combined entry.
- **Chris Larsen** (`content/Donors & Power Networks/Tech & Crypto/Chris Larsen.md`) — Ripple co-founder, $10M XRP to Harris via Future Forward. The crypto industry's Democratic outlier.
- **Brad Garlinghouse** (`content/Donors & Power Networks/Tech & Crypto/Brad Garlinghouse.md`) — Ripple CEO, GENIUS Act drafting input, Mar-a-Lago meetings, SEC settlement operator.

**Trump appointee stub (1):**
- **Paul Atkins** (`content/Politicians/Republicans/Trump Cabinet/Paul Atkins/`) — SEC Chair (April 2025–), central node of 2025 SEC enforcement collapse. The regulatory end of the crypto industry's $195M 2024 political investment.

**Profiles found to already exist (during sweep — no stub needed):**
- Paul Singer (Mega-Donors folder)
- Haim Saban (Israel Lobby folder)
- Jan Koum (Mega-Donors folder)
- Jeff Yass (two profiles — Donors root + Mega-Donors folder; potential duplicate to consolidate)
- David Sacks (Trump Cabinet folder + Mega-Donors operation file; potential duplicate)
- Marc Andreessen (Tech & Crypto folder, combined with Horowitz + standalone)
- Winklevoss Twins (Mega-Donors folder)
- Ilhan Omar (Democrats/House)
- Rashida Tlaib (Democrats/House)

### Part 2: Readiness Review Round 2 (4 profiles)

- **Cori Bush** — promoted `ready` → `verified` (A+). Editorial sign-off given, cleared editorial-result from `block` to `pass`. Added issues, expanded related links, structured donors/opposes as YAML lists. Flagged pipeline bugs: Committee Assignments uses wrong bioguide A000383 (same as Ramaswamy), GovTrack 0 bills discrepancy.
- **AOC master profile** — promoted `draft` → `ready`. **Fixed NUL byte corruption** (1 NUL at byte 25362). Duplicate `---` removed, inline status markers removed, Sources split Verified/Archived, 4 duplicate FEC URLs consolidated, 5 URL NEEDED items moved to dedicated blocking section. Cannot promote to verified due to URL NEEDED tags.
- **Katie Porter** — promoted `draft` → `ready`. **Fixed chamber field** (`Governor` → `Candidate` + running-for). Added fec-candidate-id, bioguide-id, issues, opposes/donors structured, 7 URL NEEDED sources flagged as verified-blocking.
- **Saikat Chakrabarti** — promoted `draft` → `verified` (A+). 3 Tier 1 source types (FEC, House Financial Disclosure, ProPublica 990). Editorial sign-off given. Chamber corrected to `Candidate` + running-for, checklist-na for voting/committees (never held office).

### Part 1: Investigation Queue Resolution (7 profiles)

All 7 investigation queue items **RESOLVED** in `content/Admin Notes/investigate-queue.md`. Queue status: done.
- **Vivek Ramaswamy** (+ Roivant sub-note) — promoted `draft` → `ready`. Sources restructured, QVT Financial relationship formalized.
- **Jamaal Bowman** — promoted `draft` → `verified` (A+).
- **United Democracy Project (UDP)** — stays `ready`; 12 headings fixed, sources split, politicians-funded/opposed corrected.
- **FAIRSHAKE** — promoted `draft` → `ready`. Massive profile (70+ sources, many UNVERIFIED needing browser check).
- **DMFI PAC** — stays `ready`. **Fixed type error** (donor/Individual Donor → pac/PAC). Politicians-funded rewritten (had Sanders/Bowman/Netanyahu listed as funded — all opposed).
- **Justice Democrats** (sub-note) — promoted `raw` → `ready`. **Fixed broken FEC URLs** that had `*(source unavailable)*` text inserted mid-URL.
- **Courage to Change** (sub-note) — promoted `raw` → `ready`. Fixed malformed `[!contradiction]` callouts.

### Flags for Code Claude:
- **Ramaswamy/Bush Congress.gov auto-block has wrong bioguide ID (A000383, shows Oklahoma).** Pipeline bug — same wrong ID applied across multiple profiles. Needs pipeline fix to handle candidate-only profiles AND correctly look up bioguide IDs.
- **QVT Financial pipeline false positives**: DOJ (264,349 generic mentions), NHTSA (vehicle data for hedge fund), SAM.gov (7,670 contracts wrong entity match). Pipeline matching is overly loose.
- **FAIRSHAKE 70+ UNVERIFIED URLs** need browser verification pass before `verified` promotion.
- **GovTrack pipeline query gap**: Multiple profiles (Bush, Porter) show 0 bills sponsored/cosponsored when Congress.gov data confirms real counts. Different GovTrack query.
- **12 new stub profiles** (content-readiness: raw) need pipeline enrichment runs to populate FEC, Congress.gov, GovTrack auto-blocks where applicable.
- **Potential duplicate profiles** found during sweep: Jeff Yass (2 files), David Sacks (2 files), Marc Andreessen (2 files). Consolidation needed.

### Known issues (carried from prior session):
- Only Nancy Pelosi has say-vs-pay data — ContradictionCard shows on 1 profile. Research Claude needs template to add across top profiles.
- Mobile layout not yet polished for new Signal Bar, ContradictionCard, ProfileHeader elements.
- Interactive pages (Power Rankings, Issue Explorer, etc) still have some faint contrast issues.

### Next session priorities (Phase 1 of Apr 10-30 sprint — see plan file):

**Code Claude — Phase 1 Must-Do (pipeline foundation):**
1. Fix A000383 bioguide pipeline bug (Ramaswamy shows Oklahoma, pollutes Bush and others)
2. Fix GovTrack query gap (0 bills when Congress.gov confirms real counts)
3. Fix QVT Financial false positives (DOJ/NHTSA/SAM.gov loose matching)
4. Fix pipeline enriching redirect files (`Jeff Yass.md` LDA block bleeding through)
5. Root-cause the `content-readiness:: ready\n\0` NUL-padding script
6. Add rule comments to ops profile editor source (per frontmatter-only + URL editor-only rules)
7. Run pipeline enrichment on the 12 new stubs built today (Summer Lee, Nina Turner, George Latimer, Wesley Bell, Shontel Brown, Bernie Marcus, Mark Mellman, Brian Armstrong, Ben Horowitz, Chris Larsen, Brad Garlinghouse, Paul Atkins)

**Research Claude — Phase 1 Must-Do (depth + docs):**
1. Write `ops/CLAUDE.md` and `ops/RULES.md` (frontmatter-only rule + URL editor-only rule)
2. Begin depth work on Squad/leadership verified candidates (Tlaib, Omar, Pressley, Casar, Jeffries, AOC)
3. Flag verified candidates for David's sign-off — do NOT self-promote to verified
4. Build out Summer Lee stub from raw → draft → ready first (already has substantive body content)

**David — Phase 1 Must-Do (backlog + setup):**
1. Start batch conflict triage at `content/Admin Notes/readiness-conflicts.md` (target 25/day × 7 days = 175 resolved)
2. First URL verification pass (AOC 5 URL NEEDED, Porter 7 URL NEEDED, Fairshake top priorities)
3. Sign off on verified candidates Research Claude flags
4. Review the plan file at `C:\Users\third\.claude\plans\cheeky-knitting-fox.md` once more before Phase 1 execution begins

**Phase 1 exit checkpoint (Apr 16):** 0 pipeline bugs, ≥ 12 verified profiles total, ≥ 175 conflicts resolved, ~25 draft→ready promotions, ops rule files written.

---

## Previous Session: 2026-04-09 Research (Parts 1-3 earlier in the day)
Claude: Research
Date: 2026-04-09 (readiness review pass on 7 investigation queue profiles + queue resolution)

Done:
- **Investigation Queue fully resolved** — all 7 items marked RESOLVED in `content/Admin Notes/investigate-queue.md`. Queue status: done.
- **Vivek Ramaswamy** — promoted `draft` → `ready`. Fixed sources (Verified/Archived split, OpenSecrets archived, FEC candidate URL), removed inline status duplicates, expanded issues, fixed Roivant sub-note (10 headings h3→h2, added Verified/Archived split). QVT Financial relationship formalized.
- **Jamaal Bowman** — promoted `draft` → `verified` (A+ with editorial sign-off). 3 Tier 1 source types (FEC, Congress.gov, GovTrack), exhaustive class analysis, 7 headings h3→h2, Sources split, DMFI added to opposes.
- **United Democracy Project (UDP)** — stays `ready` (only 1 Tier 1: FEC). 12 headings h3→h2, Sources split (3 OpenSecrets archived), politicians-funded/opposed corrected, fec-committee-id added.
- **FAIRSHAKE** — promoted `draft` → `ready`. Massive profile (70+ sources). 16 headings h3→h2, politicians-funded cleaned (Porter was opposed), fec-committee-id added. 70+ UNVERIFIED URLs need browser verification by Code Claude for `verified` promotion.
- **DMFI PAC** — stays `ready`. **Fixed type error** (was `donor/Individual Donor` → `pac/PAC`). Rewrote politicians-funded (had Sanders/Bowman/Netanyahu listed as funded — all opposed). 11 headings h3→h2, Sources split Verified/Archived with 3 OpenSecrets archived + ProPublica 990 added as Tier 1.
- **Justice Democrats (sub-note)** — promoted `raw` → `ready`. **Fixed broken FEC URLs** that had `*(source unavailable)*` text inserted mid-URL. 9 headings h3→h2, Sources split, source-types/corroboration-count added.
- **Courage to Change (sub-note)** — promoted `raw` → `ready`. Fixed malformed `[!contradiction]` callouts (missing `>` prefix), 7 headings h3→h2, Sources rewritten with proper markdown links, fec-committee-id added.

Flags for Code Claude:
- **Ramaswamy Congress.gov auto-block has wrong bioguide ID (A000383, shows Oklahoma).** He's never served in Congress. Pipeline needs to handle candidate-only profiles (no Congress data).
- **QVT Financial pipeline false positives**: DOJ (264,349 generic mentions), NHTSA (vehicle data for a hedge fund), SAM.gov (7,670 contracts wrong entity match). Pipeline matching is overly loose.
- **FAIRSHAKE 70+ UNVERIFIED URLs** need browser verification pass before promoting to `verified`.
- **Justice Democrats PAC has no standalone master profile** in Donors & Power Networks folder — only exists as sub-note under Saikat Chakrabarti. Consider creating one.
- **Courage to Change** has 5 URLs marked `URL NEEDED` (Reuters, CNN, Politico, City & State NY, SF Chronicle) that need hunting.

Known issues (carried from prior session):
- Only Nancy Pelosi has say-vs-pay data — ContradictionCard shows on 1 profile. Research Claude needs template to add across top profiles.
- Mobile layout not yet polished for new Signal Bar, ContradictionCard, ProfileHeader elements.
- Interactive pages (Power Rankings, Issue Explorer, etc) still have some faint contrast issues.

Next session priorities:
1. Continue readiness promotions — next batch of profiles (Cori Bush, Summer Lee, other Squad members frequently referenced in this pass).
2. **Say-vs-pay data system** — build template/guide for Research Claude to add contradiction data to top 20-50 profiles.
3. Mobile polish (Code Claude).
4. Interactive pages contrast audit.
5. Consider creating standalone Justice Democrats PAC master profile in Donors & Power Networks.
6. URL hunt pass for Courage to Change and Fairshake UNVERIFIED sources.

---

## Previous Session
Claude: Code
Date: 2026-04-10 (Phase 1 Day 1 — Ops Calendar tab shipped)

Done (Ops Calendar tab — `ops/src/app/calendar/`):
- **New worktree** `.claude/worktrees/calendar` on branch `claude/calendar` (Research Claude is parallel on `reverent-hugle`, no collision — I only touch `ops/`).
- **Sprint schedule parser** (`ops/src/lib/sprint-schedule-parser.ts`) — reads `content/Admin Notes/sprint-schedule.md` on every request (no cache), extracts ```yaml fenced blocks under each H2 heading via js-yaml with JSON_SCHEMA so ISO dates stay strings. Handles missing file with a readable error.
- **Mutable sprint state lib** (`ops/src/lib/sprint-state.ts`) — atomic writes to `ops/data/sprint-state.json` (already gitignored). First-load seeds task_states from the schedule's status fields so cc_01-04 show as done and cc_07/rc_05 show as blocked.
- **API routes** — `GET/POST /api/sprint-state`, `POST /api/sprint-state/task`, `POST /api/sprint-state/day`, `POST /api/sprint-state/snapshot`.
- **Calendar components** — `page.tsx` (server component, dynamic = "force-dynamic"), `Calendar.tsx` (client, optimistic task toggle), `PhaseBar.tsx` (3 color-coded segments), `MonthGrid.tsx` (7-col Mon-Sun with empty pad cells for the Fri-start + Thu-end), `DayCell.tsx` (weekday, day #, phase label, task count, scrollable task list, phase-exit / launch / hard-stop markers), `TaskCheckbox.tsx` (status-aware, owner chip, blocked disabled), `DayModal.tsx` (daily template + anchored tasks, ESC to close), `utils.ts` (client-safe helpers split out so client bundle doesn't pull fs), `types.ts` (phase colors, owner colors, progressFraction, tasksByDay).
- **Sidebar nav item** — `Calendar` added between Money Trail and Alerts with a calendar SVG.
- **js-yaml installed** — spec said "already in deps" but wasn't. `npm install js-yaml @types/js-yaml` in ops/.

Acceptance criteria verified via preview_eval at `localhost:3334/calendar`:
- 21 day cells ✓ · 36 task checkboxes ✓ · 3 phase bar segments ✓ · 4 North Star progress bars ✓
- TODAY marker on Apr 10 ✓ · SOFT LAUNCH on Apr 27 ✓ · PUBLIC LAUNCH on Apr 30 ✓
- Task toggle POST persists to `ops/data/sprint-state.json`, survives reload ✓
- Initial state correctly seeds cc_01-04 as done, cc_07/rc_05 as blocked ✓
- No console errors, no NaN rendering after switching js-yaml to JSON_SCHEMA ✓

Design decision saved to memory (`feedback_ops_excluded_from_design_system.md`):
- The ops/ app is **excluded** from `content/Design System.md`. The brutalist cream/yellow/square rules are website-only. Ops stays dark (`--color-bg: #0c0c0f`, Tailwind utility classes, rounded corners OK). David clarified mid-build: "this is specifically for the Operations App. Those visual aspects are/should be excluded inside the Operations build. The cream bg is for the website."

Commits on `claude/calendar`:
- `5461c70c` ops: add js-yaml for sprint schedule parsing
- `9cbced5b` ops: sprint schedule parser + mutable sprint-state lib
- `cd9acbcd` ops: /api/sprint-state routes
- `7fe9b30c` ops: Calendar tab with month grid, phase bar, day modal

Known issues:
- `content/Admin Notes/sprint-schedule.md` and `calendar-spec.md` live in Research Claude's `reverent-hugle` worktree. They're excluded from my calendar worktree via `.git/info/exclude` so dev testing works without polluting my commits. Once Research Claude merges their worktree to v4, the spec files land via pull. Until then, if you run the calendar at a fresh v4 checkout, add `content/Admin Notes/sprint-schedule.md` first.
- `content-readiness:: ready\n\0` NUL-padding script root cause (cc_05) still pending.
- Ops profile editor frontmatter-only + URL editor-only rule comments (cc_06) still pending.
- 12 stub enrichment (cc_07) still blocked on GitHub Actions re-enablement.

Next session priorities:
1. **cc_05** — find and fix the NUL-padding script
2. **cc_06** — add rule comments to Ops profile editor source
3. **Test the calendar at `localhost:3333`** after Research Claude's spec file lands on v4 (verify default ops-dashboard port still works)
4. **Wire Breadcrumbs** to all Ops pages + migrate ToastProvider usage
5. **cc_07** — trigger pipeline runs when GitHub Actions re-enabled

---

## Previous Session
Claude: Code
Date: 2026-04-10 (Pipeline quality fixes + red flag cleanup — redirect contamination, A000383 bug, GovTrack stale cache, Cori Bush demotion)

Done (Pipeline Quality Fixes in `donor-map-engine`):
- **`scripts/lib/shared.cjs`**: Added `isRedirectProfile()` helper + `loadProfiles()` now skips redirect files from all pipelines (detects `#redirect` tag, `(Redirect)` title, `redirect: true` frontmatter, "this file is a redirect" body text). Fixes pipelines enriching redirect files with fabricated data.
- **`scripts/doj-press-pipeline.cjs`**: Sanity cap rejects results with >10K total (API returning index size). Validates 60%+ of press releases actually mention the search name. Fixes QVT Financial getting 264,349 fake DOJ mentions.
- **`scripts/sam-pipeline.cjs`**: Validates `awardeeLegalBusinessName` matches search on first 5 samples (60% threshold). Fixes QVT Financial getting 7,670 fake federal contracts.
- **`scripts/nhtsa-recalls-pipeline.cjs`**: Filters corporation pool to auto-adjacent only (name contains auto/motor/vehicle, NAICS 3361-3363, known brand names). Prevents hedge funds/defense contractors/tech companies from getting vehicle recall data.
- **`scripts/congress-pipeline.cjs`**: (1) Skip non-congressional politicians (governors, candidates, cabinet, SCOTUS) — accept former members only with explicit bioguide-id. (2) Name search now REQUIRES state match AND last name verification. No state = refuse to guess instead of grabbing `data.members[0]`. Prevents the A000383 fuzzy-match bug.
- **`scripts/committee-pipeline.cjs`**: Same chamber filter applied.
- **`scripts/govtrack-pipeline.cjs`**: Same chamber filter + cache invalidation (if cached result has votes>0 but bills==0 AND cosponsored==0, refetch) + frontmatter re-enrichment for profiles with `bills-sponsored: 0` (breaks the enrichedKey lock).
- Engine commits: `d1ceb91` (redirect/doj/sam/nhtsa fixes), `bc24819` (congress/committee/govtrack fixes).

Done (Vault Cleanup in `donor-map-site`):
- **`scripts/clean-redirect-contamination.cjs`**: Built cleanup script that strips auto-blocks and enrichment frontmatter from redirect files. Cleaned 6 redirect files: Jeff Yass (bogus LDA lobbying), Blackstone (DOJ + SAM), Google (DOJ), Meta (NHTSA — Meta doesn't make cars!), Raytheon (NHTSA + USASpending — defense contractor, not automotive), Meta Facebook Political Operation (DOJ + NHTSA).
- **QVT Financial manually cleaned**: Removed auto:doj-press (264K fake mentions), auto:nhtsa-recalls (hedge fund, not auto), auto:sam-contracts (7670 fake contracts). Kept legitimate auto:gleif-lei + auto:sec-edgar.
- **`scripts/clean-a000383-contamination.cjs`**: Built cleanup script removing `auto:congress-legislation`, `auto:committee-assignments`, `auto:voting-record` blocks containing the bogus A000383 bioguide ID. **Cleaned 95 profiles, removed 129 contaminated blocks.** Affected: Vivek Ramaswamy, Kash Patel, Marco Rubio, Michael Waltz, Pam Bondi, Rex Tillerson, Russell Vought, Scott Bessent (Trump cabinet), Amy Coney Barrett, Neil Gorsuch (SCOTUS), Kathy Hochul, JB Pritzker, Amy Acton, Josh Green, Janet Mills (governors), Cori Bush, Jamaal Bowman (former members).
- **3 orphan A000383 links struck through**: Gary Peters, John Kennedy, Shelley Moore Capito (real sitting senators whose auto-blocks were clean but source links had the wrong bioguide URL).
- Vault commit: `9a64489f` (95 profiles cleaned).

Done (Investigation + Demotion):
- **Vivek Ramaswamy "critical flag" investigated**: He was never in Congress but pipeline wrote 3 bogus congress auto-blocks. All stripped.
- **GovTrack 0/0 bills investigated**: Tested GovTrack API directly — Cori Bush sponsor=456829 returns 38 sponsored + 756 cosponsored. The profile body showed 0/0 from a stale cache. Pipeline fix added cache invalidation for impossible states.
- **Cori Bush demoted** `ready` → `draft` (commit `d7ac0262`): (1) Previous A000383 congress blocks contained wrong member. (2) Body auto:govtrack said 0/0 but frontmatter had 39/756 — stripped for fresh run. (3) Body falsely marked "(VERIFIED)" on stale data. Added internal-note documenting demotion reason. Previous session's "A+ promoted" claim was inaccurate — she was actually at `ready` (B), not `verified` (A+).

Known issues:
- GitHub Actions still disabled (per previous sessions) — cannot trigger pipeline runs to refresh the cleaned profiles. Blocks the "12 new stubs" enrichment task.
- GovTrack cache invalidation fix deployed but won't take effect until next pipeline run.
- Breadcrumbs component still not wired to pages (from previous session).
- ToastProvider still not migrated into individual pages (from previous session).

Next session priorities:
1. **Trigger pipeline runs** when GitHub Actions re-enabled — will refresh all 95 cleaned profiles + stubs with correct congress/committee/govtrack data using the new chamber-filtered pipelines.
2. **Wire breadcrumbs** to all Ops pages + migrate pages to use global useToast()
3. **Tune scanner** — reduce LOW noise from wikilink-mention strategy (8K+ results)
4. **Build contradiction markers for website** — split-color graph lines, asterisks on profile widgets
5. **Add relationship discovery rules to Ops Rules tab**
6. **Test all profile types after design reskin** — politician, donor, corporation, think tank
7. **Turn off construction mode** when GitHub Actions re-enabled

---

## Previous Session
Claude: Code
Date: 2026-04-09 (Ops app professional polish + suggestions system + contradiction detection)

Done (Suggestions System):
- Built full suggestions API from scratch (`ops/src/app/api/suggestions/route.ts`) — GET with filtering/pagination/search + POST handling 8 action types. Approve writes wikilinks to vault (handles empty sourcePath by writing to target). Undo reverses vault writes. Per-card notepad. Priority research flag (manual=urgent, approve=normal auto-queue). Pending/All/History toggle, history stats, search box, compact mode, bulk select + batch actions. New Profiles: Flag for Research on unnamed entities.
- Partisan flow fix — opposes now shows attacker's alignment, not target's.
- **Contradiction detection**: scanner flags same entity funding AND opposing same candidate (4 cards, 2 pairs — NRA + National Right to Life hedging on Bush). Yellow star badge + "BOTH SIDES" banner with amounts/ratio. Vault Rules Section 3 updated with full spec.

Done (Ops App Polish):
- ToastProvider (`ops/src/components/ToastProvider.tsx`) + wrapped in ClientProviders
- Sidebar badges (`ops/src/components/Sidebar.tsx`) + GET /api/status endpoint
- Dashboard overhaul (`ops/src/app/page.tsx`) — Quick Actions, Vault Health gauge, unified Activity Feed
- GET /api/activity aggregating git + suggestions + URLs
- Alerts upgrade (`ops/src/app/alerts/page.tsx`) — sort, resolve/unresolve, auto-refresh
- Editor upgrade — inline Add Field form replaces prompt(), beforeunload warning
- Pipelines grid — 8 pipeline cards with hover-to-reveal Run buttons
- Breadcrumbs component built (not yet wired to pages)

---

## Previous Session
Claude: Code + Research
Date: 2026-04-09 (Ops polish run + congress pipeline fix + Cori Bush A+ review)

Done:
- Ops polish run COMPLETE (10/10 items audited). Key fixes: 46 bioguide URLs archived, 7 bogus IDs removed, search focus bug fixed, connection count flash fixed, mobile responsive tabs.
- Congress/committee/govtrack pipeline fixes (all-congresses default, bioguide-first lookup).
- Cori Bush promoted to A+ verified.
- Relationship Discovery Engine: scanner built (7 strategies, 11,735 suggestions), Vault Rules Section 3, suggestions UI with filters/meters/pagination, transparency scores, partisan flow, dollar magnitude.

---

## Previous Session
Claude: Code
Date: 2026-04-09 (design overhaul — brutalist prototyping, Design System doc, construction page live)

Done:
- **Brutalist landing page prototype v2** (dark version) — `prototype/landing-v2.html`. Pure black bg, yellow accents, live ticker, scroll-triggered connection board, split-screen contradiction cards, state lookup, explore grid. All working with animations.
- **Brutalist landing page prototype v3** (final direction) — `prototype/landing-v3.html`. White/cream bg, yellow highlight blocks, serif italic editorial voice, monospace data labels, graph-paper connection board, split cards with verdict bars, state grid lookup. David approved this direction.
- **Design System doc** — `content/Design System.md`. Full design bible covering colors, typography, layout, components, animations, responsive rules, and "What NOT to Do" list. Single source of truth for all visual decisions.
- **CLAUDE.md updated** — Design system section added, old dark theme colors replaced with new palette reference.
- **Ops Rules tab updated** — Design System now shows as 5th tab in Ops app Rules page.
- **Prototype server** — `prototype/server.cjs` serves prototypes at localhost:8096. `/` = v3 (white), `/v2` = v2 (dark). Launch config added to `.claude/launch.json`.
- **Construction page pushed live** — new brutalist construction page deployed to thedonormap.org via v4 push. Cream bg, yellow highlights, 655,172x teaser card, "LAUNCHING SOON".
- **Design decisions finalized** — hybrid light/dark, split card colors (red say/blue pay), danger vs party red separated, serif=rhetoric monospace=receipts, animation budget per page type, mobile secondary but functional, state lookup committed.
- **Ops Rules tab** — Design System added as 5th tab (both worktree and main repo).
- **Landing page v3 ported to Quartz** — full `LandingPage.tsx` rewrite with all 6 sections (hero, receipt, connection board, split cards, state lookup, explore grid). Client-side JS for ticker, scroll reveals, connection board animation, state lookup from build-time data. 778 lines of new SCSS. All pushed to v4 (behind construction mode flag).

In progress:
- Landing page v3 is BEHIND construction mode. To see it locally, set `isConstructionMode = false` in `quartz/constructionMode.ts`.
- State lookup pulls senator data from frontmatter at build time. Works for states with senator profiles that have `state-abbr` and `top-donors` frontmatter fields.
- Global chrome reskin (sidebar, nav for non-landing pages) still pending.

Done (continued):
- **Landing page v3 tested in Quartz** — all 6 sections rendering correctly at 1280px viewport
- **CSS overflow fixes** — reduced all section max-widths from 1000px to 900px, fixed ROI number clamp, fixed lookup title size
- **Yellow highlight block fixed** — `isolation: isolate` solves z-index stacking in Quartz
- **Quartz layout override solved** — `body:has(.lp-v3)` pattern works for full-width pages. Key learning: use `100%` not `100vw` to avoid HiDPI doubling.
- **Site-wide reskin pushed** — custom.scss fully swapped from dark to light (288 lines changed). All dark colors → cream/light equivalents. All border-radius → 0. All shadows removed.
- **29 component files reskinned** — EvidencePanel, ProfileWidget, ProfileTabs, NetworkGraph, PowerRankings, InteractiveGraphs, IssueExplorer, VotingRecord, MobileProfile, MobileNav, DonorMapSidebar, DiscoveryPanel, EventTimeline, AdminBar, and 15 more. 650 lines changed across all components.
- **Profile page verified** — Cori Bush profile rendering on cream bg with dark text, dark sidebar, dark graph widget. Evidence panel still slightly dark (minor fix needed). Body text readable.
- **GitHub Actions disabled again** — David contacted GitHub support. Waiting for re-enablement.

Known issues remaining:
- Evidence panel background still slightly dark (inline or base style override)
- Need to test more profile types (donor, corporation, think tank)
- Some component colors in the sidebar/right widgets may need fine-tuning after visual testing on live

Done (continued, same session):
- **Profile page yellow accents** — H2 headers get yellow left border, article title gets yellow underline, active tab yellow indicator, type badge yellow bg, section card yellow borders, callout key findings yellow borders. Profile pages now pop like the homepage.
- **Both sidebars now light** — David changed from hybrid to full light sidebars. Header also light.
- **Evidence panel simplified** — shows only: yellow POLITICIAN badge + context (Democrat · House · MO) + UPDATED date + HOW WE VERIFY link. Source counts, tier badges, readiness removed (editorial, not for readers).
- **Profile header simplified** — removed TIER 1 and READY badges. Shows only: party dot + type badge (POLITICIAN/DONOR).
- **Sources section fixed** — was dark bg (#14141a missed by bulk replace), now cream with readable links.
- **Politician blue heavier** — #1e3a5f for text on cream bg (old #5b8dce was too light).
- **Table text darker** — #0a0a0a for td (was #333, too grey).
- **29 component files reskinned** — bulk color swap across all TSX components.
- **Remaining dark colors cleaned** — #1a1a24, #151520, #14141a, #8a8a96, #1a1a22, #10b981 all fixed.
- **4 Claude Code skills built** — /deploy, /session-save, /design-audit, /preflight. Pushed to both main repo and worktree.
- **GitHub Actions still disabled** — David contacted support, waiting for re-enablement.

Next session priorities:
1. **Test all profile types** — politician, donor, corporation, think tank. Verify colors/readability across types.
2. **Fine-tune remaining component colors** — search overlay, mobile nav, network graph on light bg, any remaining dark colors.
3. **Run /design-audit** — catch any remaining Design System violations.
4. **Turn off construction mode** when GitHub Actions re-enabled.
5. **State lookup data coverage** — ensure senator profiles have `top-donors` in frontmatter.
6. Continue A+ reviews.
7. Fix congress pipeline (engine).
8. Fix lda-pipeline.cjs domain (engine).

Design direction approved by David:
- Brutalist art-direction. **Hybrid light/dark** — not full light, not full dark.
- **Light where text is read** (profiles, stories, landing content, listings). **Dark where data is visual** (nav, sidebar, graphs, interactive tools, verdict bars).
- Yellow (`#fbbf24`) as primary UI accent. Red (`#e63946`) for Republican ONLY. Blue (`#1d4ed8`) for Democrat ONLY. Separate `--danger` (`#dc2626`) for warnings/negative.
- Split cards: red label "What they say" (rhetoric), blue label "Who pays them" (money). Verdict bar: black bg, yellow text.
- Serif italic (Instrument Serif) for politician quotes. Monospace (Space Mono) for data/evidence next to quotes. The contrast IS the design.
- Cream vs pure white: TBD, test during implementation. Readability first.
- Landing page: full animation (ticker, scroll reveals, connection board). Profiles: light animation only.
- Mobile: secondary but must work. Desktop-first.
- State lookup: committed feature. Needs build-time data serialization from politician frontmatter.
- No rounded corners, no shadows, no gradients. Ever.
- "Looks like a leaked file, not a government website."

Next session priorities:
1. **Port landing page to Quartz** — rewrite `LandingPage.tsx` from v3 prototype, update `custom.scss` foundation
2. **Global chrome reskin** — topbar/sidebar stays dark, content areas go light
3. **State lookup data** — build-time plugin to serialize politician+donor data for client-side lookup
4. Continue A+ reviews after design port
5. Fix congress pipeline to query all congresses (engine)
6. Fix lda-pipeline.cjs domain in engine repo

---

## Previous Session
Claude: Code
Date: 2026-04-09 (marathon — ID cleanup, construction mode, pipeline debugging, Ops features)

Done:
- **Under-construction mode** — `CONSTRUCTION_MODE=true` in deploy.yml. Only homepage deploys to production. All profile pages 404. Local dev unaffected. Live on thedonormap.org.
- **67 wrong bioguide/FEC IDs fixed** — removed 58 bogus A000383 bioguide IDs, corrected 33 FEC candidate IDs (wrong state, presidential, legacy House)
- **Pipeline trigger fix** — Ops profile viewer enrichment buttons now work (route was 404)
- **Single-profile enrichment** — `--profile` flag added to engine workflow. Ops sends profile name when triggering. Shell quoting fixed for names with spaces.
- **FEC pipeline: use frontmatter ID** — `processPolitician()` now uses `fec-candidate-id` from frontmatter instead of unreliable name search. Fixes Cori Bush and similar.
- **last-enriched fix** — all 5 major pipelines (fec, congress, govtrack, committee, voting-record) now set `last-enriched` in frontmatter on write.
- **116 FEC API URLs → website URLs** — removed DEMO_KEY rate limiting from profile links across 70 files.
- **19 LDA URLs updated** — `lda.senate.gov` → `lda.gov` domain migration.
- **Connection removal bug fixed** — regex now matches aliases (e.g., `[[Full Name|AIPAC]]`).
- **URL triage yellow/purple fixed** — distinct `(SLOW)` vs `(NEEDS REVIEW)` tags, persistent states.
- **Network graph expanded** — think tanks, lobbying firms, media profiles now included (~300 more nodes).
- **Enrichment logging** — pipeline results logged in Reviews timeline, auto-pull after completion, checklist refreshes.
- **Rules tab in Ops sidebar** — read-only view of Vault Rules, CLAUDE.md, Pipeline Guide with timestamps.
- **Class analysis mandate** — #1 editorial rule. "Class Analysis" is 8th required section for A+.
- **Pipeline Known Issues doc** — `content/Pipeline Guide - Known Issues.md` tracks bugs, fixes, debugging checklist.
- **Cori Bush bill counts fixed** — 39 sponsored, 756 cosponsored (congress pipeline returned 0 due to 119th Congress bug).

Known issues:
- Congress pipeline hardcoded to 119th Congress — former members get 0 bills (engine fix needed)
- `lda-pipeline.cjs` in engine repo still generates old domain (site-side URLs fixed, engine not yet)
- NY/TX governor scrapers need HTML pattern fixes

In progress:
- **Relationship notes on graph** — note input on connections that Research Claude reads as work orders

Next session priorities:
1. Fix congress pipeline to query all congresses a member served in (engine)
2. Fix lda-pipeline.cjs domain in engine repo
3. Cori Bush: editorial sign-off remaining (only blocker left after bills fix)
4. Continue A+ reviews — Congress batch
5. Run enrichment on profiles with corrected FEC IDs (33 senators should get fresh data now)

---

## Previous Session
Claude: Code
Date: 2026-04-09 (ID cleanup + construction mode + pipeline fixes)

Done:
- **Pipeline trigger fix** — Ops profile viewer was calling `/api/pipelines/run` (404). Fixed to `/api/pipelines`. Pipeline enrichment buttons now work.
- **GitHub token for Ops** — David created fine-grained token scoped to donor-map-engine with Actions write. Stored in `ops/.env.local`. Enrichment triggers confirmed working.
- **58 bogus bioguide IDs removed** — A000383 (Alan Armstrong) was mass-stamped across 58 profiles by a pipeline bug. All removed.
- **9 wrong FEC IDs fixed** — Bobby Scott, Chris Murphy, Mark Green, Tom Cole, John Kennedy, Ron Johnson, Adam Smith, Jason Smith, Paul Ryan all had wrong-person/wrong-state IDs. Corrected via FEC lookup.
- **FEC ID audit script** built (`scripts/fix-fec-ids.cjs`) — validates FEC IDs by chamber prefix and state code. Reusable.
- **Under-construction mode** — `CONSTRUCTION_MODE=true` env var in deploy.yml. Only homepage emits to production. All other pages 404. Local dev unaffected. Live on thedonormap.org now.
- **GitHub Actions reinstated** — David's account unflagged, pipelines running.

David's feedback (next session):
1. **Enrichment result logging** — when pipeline runs from profile viewer, log success/failure in the Reviews tab timeline
2. **Reviews tab change log** — timestamped log of all changes, persists permanently
3. **Connection removal bug** — can't remove AIPAC from Cori Bush "funded by" (and possibly other categories). Investigate Ops connection editor.
4. **Class analysis editorial rule** — ALL profiles must be written from class analysis perspective. Add "Class Analysis" as mandatory section. This is #1 editorial rule.

Next session priorities:
1. Fix connection removal bug in Ops profile viewer
2. Add enrichment result logging to Reviews tab
3. Add class analysis mandate to Vault Rules + editorial quality block
4. Continue FEC ID fixes (18 Senators with legacy House IDs, 9 with presidential IDs)
5. Graph legend on live site
6. Fix lda-pipeline.cjs domain

---

## Previous Session
Claude: Code + Research
Date: 2026-04-08 (continued — Reviews tab rebuild + editorial quality standards)

Done (Code Claude):
- **Reviews tab simplified** — replaced 3 sub-tabs with blocker lists → single scrollable timeline journal. Color-coded entries by author (blue=Code, green=Research, amber=Editor). Filter pills. Add Entry box.
- **Blockers split by owner** — formal review auto-generates separate Code Claude and Research Claude entries based on blocker keywords
- **URL note input focus fix** — switched to uncontrolled input (defaultValue + onBlur)
- **ProfileData interface** — added all editorial fields so Reviews tab actually displays data
- **Committed editorial review data** — Cori Bush, Carlos Gimenez, Sherrod Brown frontmatter was unstaged, now on v4

Done (Research Claude / with David):
- **Editorial quality block** added to Vault Rules — 7 core sections required for A+: Who They Are, Central Thesis, Core Contradiction, Donor Class Map, Donation-to-Policy Timeline, Rhetorical Signature Moves, Analytical Patterns
- **Review workflow rewritten** — three-stage (Research Claude reviews+fixes → Code Claude fixes pipeline → Editor approves). Review-fix-document-move on, not just find problems.
- **Vault Rules updated** — editorial quality criteria, workflow clarification, decisions log

Done (Research Claude, continued):
- **Cori Bush full editorial review + improvement** (8/10 blocks verified):
  - FIXED: Mapped connections to frontmatter (AIPAC, Justice Democrats, DMFI, AOC, Omar, Wesley Bell in related/donors/opposes)
  - FIXED: Sources reorganized to Verified/Archived two-section layout. Archived bush.house.gov (dead).
  - FIXED: Donation-to-Policy Timeline expanded from 2 to 9 rows with FEC data
  - FIXED: Rhetorical Signature Moves expanded from 1 paragraph to 4 patterns
  - FIXED: Contradiction investigated and cleared with FEC/DOJ sources
  - FIXED: Removed all em dashes from editorial content (new rule: no em dashes, sounds AI)
  - FIXED: Removed empty Sub-Notes and Policy Area sections, stale profile-status lines
  - BLOCKED: Congress auto-block corrupted (shows Republican/Oklahoma). Code Claude needs to fix.
- **Editorial quality block** added to Vault Rules: 7 core sections required (Who They Are, Central Thesis, Core Contradiction, Donor Class Map, Donation-to-Policy Timeline, Rhetorical Signature Moves, Analytical Patterns)
- **No em dashes rule** saved to memory: never use — in profile content

**GitHub Actions reinstated** as of end of session.

Next session priorities:
1. Code Claude: clear backlog from 3 reviews (Cori Bush auto-block, Sherrod Brown FEC ID, Gimenez enrichment)
2. Research Claude: continue Congress batch reviews (Carlos Gimenez, Sherrod Brown full passes)
3. Editor: review Cori Bush profile and approve/send back
4. Graph legend on live site
5. Fix lda-pipeline.cjs domain

---

## Previous Session
Claude: Code + Research
Date: 2026-04-08 (marathon session — ops fixes + contradiction scanner + money trail + governor pipeline + A+ editorial system + first reviews + Reviews tab)

Done (Code Claude):
- **Pipeline buttons on checklists** — ▶ run buttons next to each checklist item
- **URL Manager fixes** — checked URLs persist via sidecar JSON triage, notes input on triage, focus loss bug fixed (uncontrolled input)
- **Spacing fixes** — pipeline buttons, N/A buttons, URL triage buttons all closer to labels (checklist, profile viewer, URL Manager)
- **Trump connections** — moved 30+ related: from body to frontmatter, added donors: field
- **Contradiction scanner** (`scripts/contradiction-scanner.cjs`) — 34 both-sides donors (12 high story), 1 opposition-funded (Musk funds Newsom+Trump), 9 cross-ref mismatches, 9 cross-party connections. Wired into ops alerts.
- **Money Trail visualizer** (`/money-trail` in ops) — force-directed graph, donor→politician→committee→bill flow, search any profile, draggable nodes
- **Governor executive actions pipeline** (`scripts/governor-exec-actions.cjs`) — CA (10 EOs via RSS), FL (25 EOs). NY/TX scrapers need HTML fixes. Written to Newsom/DeSantis profiles.
- **Reviews tab** in profile viewer — 3 sub-tabs (Code Claude, Research Claude, Editor). Each has notepad, blocker lists, action buttons (Fix This ▶, Request Review, Approve for A+). Color-coded status dot on tab.

Done (Research Claude):
- **A+ Editorial Review System** designed with David — section-by-section sign-off, priority scoring, type-batched reviews, orphan claims rule, correction trail
- **Vault Rules updated** — editorial review system, orphan claims from broken URLs, new frontmatter schema, review blocks per profile type, decisions log
- **editorial-priority.cjs** — scores 899 ready profiles. Batches: Congress(94), Executive(7), Donors(185), Corporations(141), Think Tanks/PACs(54), Lobbying/Media(84)
- **First 3 A+ reviews** — all BLOCKED:
  - Cori Bush (70): 4/10 pass. Corrupted Congress auto-block, sparse connections, unresolved contradiction
  - Carlos Gimenez (55.3): 5/10 pass. No last-enriched, Crowley contradiction, broken Wikipedia URL
  - Sherrod Brown (47.5): 1/10 pass. Wrong FEC ID (House not Senate), 0/0 bills wrong, OpenSecrets archived
- **vault.ts** updated with editorial review fields

Known issues:
- GitHub Actions still disabled
- NY/TX governor scrapers need HTML pattern fixes
- lda-pipeline.cjs still generates lda.senate.gov URLs
- Sherrod Brown FEC ID needs fixing (H2OH13033 → S6OH00163)
- Cori Bush Congress auto-block corrupted (shows Republican/Oklahoma)

Next session priorities:
1. Fix Code Claude blockers from first 3 reviews (FEC IDs, auto-blocks, enrichment)
2. Continue A+ reviews — Congress batch (91 remaining)
3. Graph legend on live site
4. Fix lda-pipeline.cjs domain
5. Write stories from both-sides donor data (AIPAC, Goldman Sachs, Boeing)
6. Fix NY/TX governor scrapers

---

## Previous Session
Claude: Research (then Code)
Date: 2026-04-08 (A+ editorial review system + contradiction scanner + money trail + governor pipeline)

Done (Research Claude):
- **A+ Editorial Review System** — designed and implemented with David:
  - Section-by-section sign-off via `verified-blocks` array
  - Priority scoring: connections(25%) + sources(30%) + corroboration(20%) + body(10%) - gaps(15%)
  - Type-batched reviews: Congress(94) → Executive(7) → Donors(185) → Corporations(141) → Think Tanks/PACs(54) → Lobbying/Media(84)
  - Detailed review log in frontmatter (date, reviewer, result, blocks reviewed, blockers, notes)
  - `orphan-claims` block mandatory on every review — broken URLs' claims must be re-sourced or rewritten
  - All rewrites documented in `corrections` frontmatter for permanent audit trail
  - 10 profile types with type-specific block checklists
- **Vault Rules updated** — orphaned claims rule, editorial review system, new frontmatter schema, review blocks table, decisions log entry
- **editorial-priority.cjs** — scores and ranks 899 ready (B) profiles. Top candidates: Cori Bush (70), League of Conservation Voters (74.5), Lennar Corp (71.5)
- **vault.ts** — editorial review fields added to Profile interface

Next session priorities (Research Claude):
1. Start A+ reviews — Congress batch first (94 profiles, top: Cori Bush, Carlos Gimenez, Sherrod Brown)
2. Fix cross-ref mismatches from contradiction scanner (Peter Thiel → 6 media profiles)
3. Review 9 cross-party connections flagged by scanner
4. Write stories from both-sides donor data (AIPAC, Goldman Sachs, Boeing)

---

## Previous Session
Claude: Code
Date: 2026-04-08 (contradiction scanner + money trail + governor pipeline + ops fixes)

Done:
- **Checklist pipeline buttons** — ▶ run buttons next to each checklist item (fec, govtrack, lda, etc.)
- **URL Manager fix** — checked URLs no longer revert to unchecked after save (sidecar JSON triage)
- **URL notes** — optional note input when triaging URLs (both URL Manager and profile viewer)
- **Spacing fixes** — pipeline buttons, N/A buttons, URL triage buttons all closer to labels
- **Trump connections fixed** — moved 30+ related: connections from body to frontmatter, added donors: field
- **Internal-notes audit** — only 5 files have internal-notes, all valid YAML (no corruption)
- **Contradiction scanner** (`scripts/contradiction-scanner.cjs`) — 4 checks:
  - 34 both-sides donors (12 high story potential: AIPAC 18 pols, Goldman Sachs 17, Boeing 10)
  - 1 opposition-funded contradiction (Elon Musk funds Newsom + Trump)
  - 9 cross-ref mismatches (Peter Thiel listed by 6 media figures not in his profile)
  - 9 cross-party connections to review
  - Results wired into ops alerts dashboard
- **Money Trail visualizer** (`/money-trail` in ops) — force-directed graph:
  - Default: top 15 both-sides donors with cross-party flows
  - Profile view: full donor→politician→committee→bill flow
  - Draggable nodes, zoom, hover highlights, arrows, legend
  - Color-coded: donors=amber, Dem=blue, Rep=red, committees=green
- **Governor executive actions pipeline** (`scripts/governor-exec-actions.cjs`):
  - California: 10 EOs via gov.ca.gov RSS (Tier 1)
  - Florida: 25 EOs from flgov.com (Tier 1)
  - NY/TX scrapers need HTML pattern fixes (0 results currently)
  - Data written to Newsom and DeSantis profiles

Known issues:
- GitHub Actions still disabled (David awaiting reinstatement)
- NY/TX governor scraper patterns need fixing (different HTML structures)
- lda-pipeline.cjs still generates lda.senate.gov URLs (not yet fixed)

Next session priorities:
1. Graph legend on live site (Stories, Opposition, entity types)
2. Fix NY/TX governor scraper HTML patterns
3. Fix lda-pipeline.cjs domain (lda.senate.gov → lda.gov)
4. Social scheduling for Distribution page
5. Run contradiction scanner periodically (add to pipeline schedule)
6. Verify live site build when GitHub Actions is back

---

## Previous Session
Claude: Code
Date: 2026-04-08 (readiness overhaul + ops v2 + profile viewer rebuild + type-specific checklists)

Done:
- **Readiness tier overhaul** — removed "developed", established 4-tier grading (raw/draft/ready/verified) with investigative journalism standards
- **Profile viewer overhaul** — Notes tab (internal, per-profile), connection editor (search + add/remove + commit), sources merged into URLs tab, readiness scroller, A-Z bar, completeness rings, promote/demote buttons, refresh button
- **Dashboard redesign** — 3-panel stats bar (Grades/Quality/Health), readiness scroller pills, "Sort: Nearest to A+" option, legend bar
- **Reclassification scripts** — reclassify-readiness.cjs + staleness-decay.cjs (not yet run with --write)
- **New APIs** — POST /api/profile/readiness, /api/profile/notes, /api/profile/connections
- Built `reclassify-readiness.cjs` — scans all profiles, computes source diversity, corroboration, known gaps. Dry-run: 592 ready (B), 371 draft (C), 0 verified (A+), 483 A+ candidates
- Built `staleness-decay.cjs` — auto-demotes verified→ready (90d), ready→draft (180d)
- New frontmatter: `source-types`, `corroboration-count`, `known-gaps`, `last-verified-by`
- Gold A+ badge on live site for verified profiles, green "SOURCED" for ready
- Near-verified + decay candidate alerts in Ops dashboard
- **Stale profile detector** — alerts API + dashboard cards for stale/never-enriched
- **A-Z navigation bar** — letter filter on vault grid, disabled letters dimmed
- **"What's needed" per profile** — color-coded next-action on cards and detail panel
- **"View Full Profile" button** — dashboard detail → profile viewer navigation
- Updated all docs: Vault Rules, CLAUDE.md, Pipeline Guide

**Reclassification executed**: 963 profiles audited, 387 reclassified. 598 ready (B), 365 draft (C), 525 A+ candidates.

Bug fixes: URL dedup, nested bracket regex, internal-notes YAML corruption (newlines), refresh button loading, search matching paths.

Additional done:
- **Type-specific A+ checklists** — VerificationChecklist component with role-aware requirements:
  Congress (voting records, committees, bills), President (executive orders, cabinet appointments),
  Governor (executive actions, state legislation), Cabinet (appointment, revolving door),
  Donor, Corporation, Media, Think Tank, Lobbying Firm, PAC — each with tailored criteria
- **N/A system** — edge cases (candidate not in office, private company, independent media) can mark
  items N/A with a reason, stored in checklist-na frontmatter. N/A items excluded from A+ scoring.
- **Pipeline Data Viewer** — expandable read-only view of all auto-blocks (voting records, committees,
  bills, FEC, executive orders, lobbying, contracts). Priority-sorted by profile type.
- **Executive orders pipeline** — proper pipeline in engine repo, ran for 5 presidents:
  Trump (474 EOs), Obama (294), Clinton (310), Biden (162), Bush W (294). Write run in progress.
- **Prev/Next navigation** on profile viewer
- **URL deduplication**, nested bracket regex fix, internal-notes YAML corruption fix
- **Connection type editor** — hover any connection to change type via dropdown (Related/Funded By/Opposes)
- **Editor auto-loads** profile from ?profile= query param
- Removed redundant ReadinessChart, added ContentBreakdown by category
- GitHub support ticket responded to (Actions disabled, awaiting re-enablement)

Known issues:
- Trump's `related:`/`donors:` in body not frontmatter — shows 0 connections in profile viewer
- Executive orders --write run may not have completed (check next session)
- Some profiles may have corrupted internal-notes from early auto-check runs

Executive orders pipeline ran with --write: Obama, Clinton, Biden, Bush W inserted. Trump parked (manual edit detected). Minor flushLog error (non-critical).

Back/Forward nav buttons added to sidebar (site-wide). Fixed exec orders pipeline bug (passed content instead of filePath to updateFrontmatter).

Editorial framework discussion with David — agreed on:
- Checklist must ENFORCE readiness (not just visual) + bypass button for edge cases
- Contradictions reworded: "Contradiction investigation complete (Research Claude)" — mandatory for A+
- Story grading: Story (1-4 URLs/draft) → Report (5-9/ready) → Investigation (10+/verified)
- Stories/events/sub-notes don't require pipeline enrichment
- Research Claude + Code Claude integration protocol (surfaces → acts, requests → builds)
- Additional editorial checks: cross-ref consistency, claim attribution, legal sensitivity, correction history, wikilink integrity, orphan detection, update cadence

Additional done (continued):
- **Editorial framework implemented** — checklist enforces readiness with bypass button, story grading (story/report/investigation by URL count), contradiction reworded as Research Claude requirement
- **Story/event/sub-note checklists** — editorial types get editorial criteria, no enrichment required
- **Vault integrity scanner** built — 499 broken wikilinks, 23 orphans, 10 cross-ref mismatches
- **Integrity alerts wired into Ops** — reads from reports/vault-integrity.json
- **New frontmatter fields** — corrections, update-cadence, legal-sensitivity
- **Reclassification v2 run** — 1,493 files, 351 changes. Final: 899 ready, 565 draft, 29 raw, 0 verified, 0 developed
- **Back/Forward nav** in sidebar (site-wide)
- **Executive orders pipeline** ran — Obama, Clinton, Biden, Trump, Bush W all written
- **Vault Rules** fully updated with editorial framework, integration protocol, story grading, contradiction protocol

Next session priorities:
1. Graph legend on live site (Stories, Opposition, entity types)
2. Contradiction scanner — auto-find shared-donor contradictions
3. Money trail visualizer — donor→politician→committee→bill flow
4. Fix lda-pipeline.cjs domain
5. Governor executive actions pipeline (state-level)
6. Verify live site build with all readiness/component changes
7. Social scheduling for Distribution page

Next session priorities:
1. Run reclassify-readiness.cjs --write after David reviews report
2. Run staleness-decay.cjs --write
3. Graph legend on live site (Stories, Opposition, entity types)
4. Contradiction scanner — auto-find shared-donor contradictions
5. Money trail visualizer — donor→politician→committee→bill flow
6. Fix lda-pipeline.cjs domain

---

## Previous Session
Claude: Code
Date: 2026-04-08 (marathon session — Ops v1.0 → v1.5, live site upgrades)

Biggest session in the project's history. Ops v1.0→v1.5, live site voting records, responsive tables, graph fixes.

**Ops v1.1**: Ctrl+K command palette, unified Profile page, rich activity feed, keyboard shortcuts, visual readiness badges
**Ops v1.2**: Source Hunter 6→15 APIs, auto-connection engine (8 strategies, 5,733 connections), LDA migration (509 URLs), relationship editing everywhere, clickable URLs, entity type filtering
**Ops v1.3**: Voting Record pipeline, pipeline action categories (Auto-Fill/Source Discovery/Needs Review/Relationship), visible edit controls
**Ops v1.4**: Pipeline diff viewer, profile completeness score (0-100% ring), stories connection type
**Ops v1.5**: VotingRecord live site component, View Logs button, blockquote vote format, draggable graph nodes (whole bubble), responsive tables site-wide

**Live site changes:**
- `VotingRecord.tsx` component — party loyalty ring, ideology spectrum, leadership score, auto-renders on politician profiles
- `ProfileWidget.tsx` — opposition edges fixed for ALL profile types (was only non-politicians), stories field added
- Responsive tables — ALL tables in article content stack vertically (no horizontal scroll)
- Obama profile cleaned (NUL bytes), David Sacks YAML fixed (build failure)

**Ops app changes:**
- Relationship Mapper: draggable nodes (entire bubble, container-level tracking), stories type, fuzzy name matching, context menu, entity filters
- Pipelines: action categories, View Logs (per-pipeline found/not-found/errors from GitHub Actions), voting record in pipeline list
- Source Hunter: 15 APIs with env vars matching GitHub Secret names
- Dashboard: completeness rings, diff viewer, activity feed

**Engine repo changes:**
- `auto-connection-engine.cjs` — 8 strategies for all profile types
- `voting-record-pipeline.cjs` — Congress.gov + GovTrack, blockquote format
- `auto-connect.yml` — standalone workflow with Run Auto-Connect button
- Voting record added to enrichment workflow

**Key lesson:** Verify UI changes in preview before pushing. The draggable nodes took 4 iterations because changes were pushed untested. Memory saved: `feedback_verify_before_push.md`.

Known issues:
- `.next` cache corruption if app killed mid-compile — `rm -rf ops/.next`
- LDA auth tokens don't work on lda.gov yet
- `lda-pipeline.cjs` in engine repo still generates lda.senate.gov URLs
- Voting record: some profiles "not found" on Congress.gov (name mismatches)

Next session priorities:
1. **Graph legend on live site** — Stories, Opposition, entity types in legend
2. **Stale profile detector** — surface profiles not enriched in 30+ days
3. **Contradiction scanner** — auto-find shared-donor contradictions
4. **Money trail visualizer** — donor→politician→committee→bill flow
5. **Auto-story generator** — draft stories from detected patterns
6. Fix lda-pipeline.cjs domain
7. Social scheduling for Distribution
8. Riff on live site graph improvements

---

## Previous Sessions

### Code Claude — 2026-04-08 (earlier sessions combined)
2. **Profile completeness score** — percentage ring on every profile card
3. **Stale profile detector** — surface profiles needing attention
4. **Contradiction scanner** — auto-find shared-donor contradictions for stories
5. **Money trail visualizer** — donor→politician→committee→bill flow diagram
6. **Auto-story generator** — draft story skeletons from detected patterns
7. Fix lda-pipeline.cjs domain
8. Social scheduling for Distribution page

---

## Previous Sessions

### Code Claude — 2026-04-08 (early morning)

Done:
- **Built Donor Map Ops v1.0** — 10-module local operations app at `ops/`
- Modules: Dashboard, Pipelines, Notes & Queues, URL Manager, Source Hunter, Relationships, Editor, Publisher, Alerts, Distribution
- **Switched all reads to local filesystem** — zero GitHub API for browsing (was hitting 5,000/hr rate limit)
- **Switched all writes to local filesystem + git push** — saves write to disk, git commit, git push. No GitHub Contents API.
- URL Manager: two-tier triage (active + completed archive), quick-assign buttons, undo from completed, drag-and-drop
- Editor: 4 view modes (Edit/Split/Preview/Live Site), markdown renderer with proper CSS, iframe of live page
- Enrichment Results: plain English breakdown of what each pipeline run gathered, from local git history
- Admin Notes: saved as markdown in `content/Admin Notes/`, both Claudes check these every session
- Desktop launcher, PWA manifest, toast notifications
- Updated CLAUDE.md with full Ops app documentation for both Claudes

Architecture:
- App at `ops/` — Next.js + Tailwind, fully separate from Quartz
- **Reads from local filesystem** (instant, zero API)
- **Writes to local files + git push** (no GitHub API needed)
- GitHub API only for: pipeline triggers (workflow_dispatch), Source Hunter (gov APIs)
- Desktop shortcut: `ops/start-ops.bat`, or `ops/create-shortcut.bat` for desktop icon
- Run: `cd ops && npm run dev` → localhost:3333

David's workflow:
- Opens Ops app daily to browse, edit, triage URLs, leave notes
- Notes in `content/Admin Notes/` are work orders for both Claudes
- URL triage marks broken links as archived (strikethrough) per Vault Rules
- Check `content/Admin Notes/` every session for open notes

Known issues:
- EPA ECHO API flaky (500 errors, has fallback endpoints)
- Public Accountability HTTPS cert issues (falls back to HTTP)
- `.next` cache corrupts if app killed mid-compile — `rm -rf ops/.next` fixes it

Next:
- David testing Ops app, reporting issues for polish
- Check `content/Admin Notes/` for any open notes from David
- Run opensecrets-replace for remaining categories (~3,000 URLs)
- LDA migration: lda.senate.gov → lda.gov before June 30, 2026 sunset
- Pipeline coverage report for enrichment gaps

---

## Previous Sessions

### Code Claude — 2026-04-07 (evening)
- Restored 626 content files lost during worktree-v4 merge conflicts
- Fixed CI pipeline merge conflicts: `git pull --no-rebase -X theirs`
- Deployed graph widget to ALL profile types
- Full-screen graph contextual filter bar
- Restored 6 missing profiles, reverted sidebar featured items
- Fixed landing page broken links, ProfileTabs empty states, MobileNav fix

### Code Claude — 2026-04-07 (earlier)
- Fixed front page 404 caused by wholesale v4 file sync — reverted 4 core files, surgically added NetworkGraph registrations
- Graph tab moved to first position in ProfileWidget with Expand Network button
- Built shared-donor bridge: expanded graph now shows think tanks, K Street, and media figures connected through shared donors
- Migrated `related:` and `donors:` from body text into YAML frontmatter for 155 think tank, K Street, and media profiles
- Confirmed FCC pipeline unfixable (per-station API, no global search)
- Confirmed House Stock Watcher dead (GitHub repo deleted, S3 returns 403, site offline)

### Code Claude — 2026-04-06 (evening)

Done:
- **Built 11 new pipelines**, bringing total from 21 → 32 data source pipelines
- New pipelines: OSHA, Nonprofit 990, SEC Litigation, FEC Summary, DOJ Press, Wikipedia/Wikidata, Committee Assignments, OFAC SDN, CPSC Recalls, USASpending Awards, NHTSA Recalls, Lobbying Cross-Reference
- All 32 wired into CI workflow (api-enrichment.yml), running 4x daily in parallel
- Built pipeline coverage dashboard (`pipeline-coverage-report.cjs`) — scans vault against 26 enrichment markers
- Created data sources page (`content/Interactive/data-sources.md`) documenting all 32 pipelines
- Bumped CI timeout to 35min job / 25min pipeline step
- All API keys configured (user added DOLAPI this session)
- 22 of 32 pipelines need zero auth

Known issues:
- FCC pipeline returns 0 results (needs correct endpoint paths)
- House Stock Watcher data URL 404s (Senate works fine)
- EPA ECHO API flaky (500 errors, has fallback endpoints)
- Public Accountability HTTPS cert issues (falls back to HTTP)

In flight:
- CI run triggered with limit=3 to test all 32 pipelines
- Session State and Pipeline Guide updates need finishing (agents hit rate limit)

Next:
- Fix FCC endpoint paths (research Swagger UI)
- Fix House stock watcher data URL
- Update Pipeline Guide with all 32 pipeline entries
- Run opensecrets-replace for remaining categories (orgs, pacs, outside-spending)
- LDA migration: lda.senate.gov → lda.gov before June 30, 2026 sunset
- Run pipeline coverage report to identify enrichment gaps
- Split CI into fast/slow workflows if timeout issues arise

---

## Previous Sessions

### Code Claude — 2026-04-06 (afternoon)
- Built FARA, CourtListener, Federal Register, SEC EDGAR, Public Accountability, FCC, OpenSanctions, Stock Watcher, GLEIF, EPA ECHO pipelines (10 new, bringing total from 11 → 21)
- Completed FARA two-phase matching strategy with correct API field names
- Fixed loadProfiles `donors` bucket to use `all` for broad entity matching
- Researched 30+ potential data sources from Perplexity suggestions, categorized as Build/Defer/Skip

### Code Claude — 2026-04-06 (earlier)
- Slimmed CLAUDE.md from 171→107 lines
- Created opensecrets-replace.yml workflow + ran for members-of-congress (997 URLs across 346 files)
- 127 URLs skipped (generic sub-pages), 3,011 remain in other categories

### Code Claude — 2026-04-06 (earlier)
- Built LobbyView pipeline (lobbyview-pipeline.cjs) — client-bill lobbying networks, 100 req/day
- Built OpenSecrets URL replacement script (opensecrets-replace.cjs) — maps 4,075 URLs to FEC/Congress.gov/LDA equivalents
- Added LobbyView to api-config.cjs and GitHub Actions workflow
- Rewrote vault methodology: Vault Rules.md + Pipeline Guide.md + Session State.md replace 10 old docs
- New readiness tier: `verified` (has Tier 1 pipeline data). Existing `ready` files stay published.

### Code Claude — 2026-04-06 (earlier)
- Party dots on profiles (blue D, red R, grey I)
- Fixed sidebar nav links (Fox News, Daily Wire, pod paths)
- Widened ProfileWidget scope to all profile types
- Empty states for EventTimeline and ProfileWidget
- Categorization audit: Bush Cabinet folder, Former folders
- Wired FEC + Congress pipelines into auto-block body section writes
- Pipeline timeout fixes and push conflict resolution

### Code Claude — 2026-04-05
- API enrichment runs: 122 files updated across 4 pipeline runs
- Fixed ProPublica hitting corporations + deduplicated frontmatter keys
- GovTrack, SAM, USASpending pipelines running in parallel

### Research Claude — 2026-04-05
- Vault audit and roadmap (identified ~1,350 total files, 1,204 ready)
- Source integrity pass on 55 files
- URL fix log started
