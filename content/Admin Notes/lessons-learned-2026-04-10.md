---
title: Lessons Learned — 2026-04-10
type: admin-note
note-type: research
priority: normal
status: open
created: '2026-04-10'
created-by: Research Claude
tags: [postmortem, operating-rules, data-integrity]
---

# Lessons Learned — 2026-04-10

Documenting red flags and good ideas from the Apr 9-10 sprint kickoff so future sessions don't re-learn them. Each entry has a short description and an actionable prevention rule.

This file is append-only. When a new session discovers a new red flag or good idea, add it with a date header.

---

## Red Flags (problems discovered that should not repeat)

### 1. YAML folded-scalar syntax on structured fields breaks the merge script

**What happened:** Yesterday's `consolidate-dual-related-fields.py` captured the YAML folded-scalar marker `>-` as literal text inside a quoted string when re-writing parsed values. On 2 profiles that used the folded-scalar format (`related: >-` with indented continuation lines), the script produced `related: ">- · [[Link]]"` with the `>-` INSIDE the quoted string, which YAML then re-parsed as another folded scalar — breaking the entire frontmatter block. **Every push since then failed the Quartz build for hours before anyone noticed.**

**Affected files (fixed):** Tucker Carlson, Hillary Clinton.

**Preventive cleanup:** 11 additional profiles using folded-scalar YAML on structured fields were converted to inline format as a precaution (Cortez Masto, Mark Kelly, Fetterman, Sinema, MTG, George W Bush, Hinson, Hawley, Tillis, Linda McMahon, Michael Waltz).

**Prevention rules (now in Vault Rules):**
1. **Never use YAML folded-scalar (`>` / `>-`) or literal-block (`|` / `|-`) syntax on these frontmatter fields:** `related`, `donors`, `opposes`, `politicians-funded`, `politicians-opposed`, `top-donors`. Use inline single-line quoted strings with ` · ` separators: `related: "[[Link 1]] · [[Link 2]] · [[Link 3]]"`.
2. **Before running any vault-wide frontmatter script**, run a YAML parse scan on every profile to catch latent bombs. Takes 3 seconds. Catches breakage immediately.
3. **The `consolidate-dual-related-fields.py` script has a latent bug** (still not fixed at time of writing): it doesn't strip YAML scalar indicators before re-quoting parsed values. Fix before next full-vault run.

---

### 2. Vault-wide DOJ contamination was invisible for weeks

**What happened:** 177 profiles had the SAME ~264,413 "DOJ Press Mentions" number from the DOJ API returning the index size instead of actual matches. Every profile with a `auto:doj-press` block was polluted. Nobody noticed because each profile looked "real." The bug was only discovered when reviewing Ayanna Pressley closely during a depth review — her block showed random DOJ press releases about drug trafficking and tax fraud that had nothing to do with her.

**The fix:** Code Claude engine-level sanity cap (commit `d1ceb91`) rejects results >10K as API index-size bug and validates 60% name match. Research Claude vault-layer sweep stripped all 177 contaminated blocks (Research Claude lane: editorial cleanup).

**Prevention rules:**
1. **When pipelines populate numeric fields, spot-check absurd values.** A hedge fund with 7,670 DOD contracts, a congresswoman with 264K DOJ mentions, a profile with 0 bills sponsored when frontmatter says 39 — these are all signs of contamination. Any value >10K for a single entity mention count should be treated as suspect.
2. **Pipeline sanity caps should be deployed at the engine layer, not hand-cleaned per profile.** Code Claude's approach was correct: fix the root cause first, then clean the vault-layer data, then let fresh pipeline runs repopulate cleanly.
3. **When a contamination pattern is found on one profile, sweep vault-wide for the same pattern.** Pressley's 264K mentions led to finding 177 more. Don't assume you got lucky — assume the bug is systemic.

---

### 3. Auto-blocks can silently trample editorial changes (but there's a new fix pattern)

**What happened:** On 2026-04-10, Code Claude cleaned 95 profiles' A000383 contamination while Research Claude was working in parallel. The merge to v4 from my worktree produced conflicts on profiles both sessions had touched (Cori Bush, Bowman, Ramaswamy, Mark Kelly, Hillary Clinton, Sheldon Whitehouse + ~90 others). Some of those conflicts were real editorial disagreements (my Cori Bush promotion vs. main's demotion), others were automated rewrites (related field auto-connection engine vs. my frontmatter merges).

**The good fix:** Code Claude introduced the `<!-- auto:* pending-merge -->` block pattern. When pipeline data would overwrite manual edits, the pipeline drops the new data in a marked block for manual review instead of overwriting. Seen first on Cori Bush's govtrack block.

**Prevention rules:**
1. **Use the `auto:* pending-merge` pattern for all pipeline enrichments that would overwrite manually-edited data.** Detect prior edits (hash tracking, field content diff), if detected, write new data into a `<!-- auto:FIELD pending-merge YYYY-MM-DD -->` block that the editor can manually fold in.
2. **Research Claude should NOT edit inside `auto:*` blocks.** The rule was codified in Vault Rules 2026-04-06. When encountering stale or bogus pipeline data, flag it in Session State for Code Claude — don't hand-edit auto-blocks except to STRIP bogus data (editorial cleanup).
3. **Before merging a Research Claude worktree to v4, check if Code Claude has pushed changes to overlapping profiles.** If yes, reverse-merge first (`git merge origin/v4`), resolve conflicts with care for both editorial and pipeline intent.

---

### 4. Linter or auto-merger can corrupt YAML mid-save

**What happened:** My Sheldon Whitehouse profile had a clean structured `donors:` YAML list (10 items as `- "item"` format). After some linter or auto-merger ran (notified via system reminders), the `donors:` field became a malformed hybrid: a string value (`donors: "item1,item2,..."`) AT THE SAME KEY as a YAML list (`  - "item1"`, `  - "item2"`). YAML parser rejected this as invalid and every subsequent push would have re-broken the build.

**The fix:** Manually rewrote the `donors` field as a single clean YAML list. Verified with `yaml.safe_load()`.

**Prevention rules:**
1. **After editing a profile's frontmatter, verify YAML parses before commit.** Can be a pre-commit hook. Can be a manual spot-check. Either way — don't commit YAML you haven't parsed.
2. **Unknown: what tool produced the string+list hybrid.** Could be Obsidian plugin, could be Ops app save handler, could be a linter. Code Claude to investigate by reproducing the sequence that caused it. Until then, YAML scans are the safety net.
3. **The `auto:* pending-merge` pattern should be extended to frontmatter field updates, not just body auto-blocks.** If a pipeline or automated tool is about to overwrite a manually-edited frontmatter field, it should drop the new value in a temporary `frontmatter-pending-merge` field for review.

---

### 5. OpenSecrets citations are everywhere despite the Tier 1 demotion rule

**What happened:** The rule "OpenSecrets is no longer Tier 1, use FEC/Congress.gov equivalents instead" was codified in Vault Rules weeks ago, but during individual profile reviews on 2026-04-10 I found OpenSecrets still cited as Tier 1 on Tlaib, Omar, Pressley, Jeffries, Khanna, Whitehouse, AOC — nearly every profile I reviewed. The rule was written but the vault was never swept.

**Prevention rules:**
1. **When a Vault Rules change demotes or elevates a source tier, run a vault-wide sweep immediately.** Don't let hundreds of profiles accumulate stale tier labels.
2. **Each profile review should treat OpenSecrets citations as a checklist item** until a vault-wide sweep clears them. Move to Archived, cite the equivalent FEC URL instead.
3. **Future source-tier changes should be announced in Session State AND immediately followed by a sweep PR.**

---

### 6. Inline dataview markers keep resurfacing despite the frontmatter-only rule

**What happened:** Yesterday's vault-wide cleanup removed 879 profiles' inline dataview markers (`content-readiness::`, `profile-status::`, etc.) per the new frontmatter-only rule. But during today's depth reviews, I found the markers STILL on Pressley, Ro Khanna, Whitehouse, Warnock, Hakeem Jeffries. Either the yesterday sweep missed edge cases, or something is re-adding them.

**Prevention rules:**
1. **Investigate the source of re-added inline markers.** Is it Obsidian templates? Ops app save handlers? Pipeline scripts? Code Claude to trace.
2. **Until the source is identified, every profile review should strip inline markers as a checklist item.**
3. **The `frontmatter-only rule` is codified in CLAUDE.md, Vault Rules, and auto-memory — but if automated tools are ignoring it, we need a test/linter that fails the build on inline marker violations.**

---

### 7. GitHub Actions deploy failures were silent for hours

**What happened:** The Quartz build started failing on 2026-04-10 morning after my data quality sweep commits. Every subsequent push also failed (because the Tucker Carlson + Hillary Clinton YAML bug was already in v4). The build was broken for ~3 hours before the user mentioned "I got notifications that build runs were unsuccessful." No in-session alert, no proactive check. I only discovered it when the user flagged it.

**Prevention rules:**
1. **`/session-save` and `/deploy` skills should verify the build succeeded** by polling `gh run list` after the push and reporting status before declaring success.
2. **Every commit that touches `content/` should trigger a post-push check** within 60-90 seconds.
3. **A build failure during a session should be treated as high priority** — stop current work, diagnose, fix, verify, then resume.

---

### 8. Cori Bush and Bowman "verified" promotions were made on contaminated data

**What happened:** I promoted Bowman to `verified (A+)` on 2026-04-09 counting Congress.gov as one of 3 Tier 1 source types. The underlying Congress.gov auto-block was A000383-contaminated (fuzzy match to wrong member). When Code Claude fixed the contamination on 2026-04-10 and demoted Cori Bush ready→draft for the same reason, I had to retroactively demote Bowman verified→ready.

**Prevention rules (now codified):**
1. **Research Claude flags `editorial-result: verified-candidate`, NEVER self-promotes to `content-readiness: verified`.** Only David's sign-off makes a profile truly verified. This is the #2 risk in the sprint plan risk register.
2. **Before trusting any source as Tier 1, verify the auto-block isn't contaminated.** Check that the bioguide-id / FEC-id / EIN matches the profile's actual identity. Spot-check one or two specific claims from the auto-block data.
3. **Corroboration-count should reflect VALIDATED Tier 1 types, not just present ones.** If Congress.gov data is garbage but it's in source-types, that's a count of 0 for that source type.

---

## Good Ideas (patterns to repeat)

### 1. Vault-wide data quality sweeps are cheap and high-leverage

**What happened:** This session ran 8 vault-wide sweeps:
- NUL byte sweep (54 files cleaned 2026-04-09)
- Inline marker cleanup (879 files cleaned 2026-04-09, 528 conflicts flagged for editor)
- Double `---` sweep (0 hits, clean)
- Dual `related` field merge (1,193 files, frontmatter+body unioned)
- Non-standard callout fix (3 files)
- DOJ false-positive cleanup (177 files stripped 2026-04-10)
- YAML parse error fix (2 critical + 11 preventive)
- Vault-wide YAML parse scan (ongoing defensive check)

**Each sweep caught dozens to hundreds of issues that would have eaten individual reviews one at a time.** Without the sweeps, I'd have fixed each problem as I encountered it on per-profile reviews — slower, less consistent, more oversight gaps.

**Prevention rule:** **At the start of every phase**, run the standard data quality sweep suite. At the start of every session, run a YAML parse scan as a safety net. Fix vault-wide bugs vault-wide.

---

### 2. The `auto:* pending-merge` block pattern

**What happened:** Code Claude introduced it on Cori Bush. When the govtrack pipeline re-enriched her profile and detected prior Research Claude edits, it dropped the new data in a `<!-- auto:govtrack pending-merge 2026-04-10 -->` block with a `> [!attention] Fresh API data available — needs manual merge` header. The editor can manually fold in what's useful without losing prior edits or silently overwriting them.

**Prevention rule:** **Extend this pattern to every auto-block that writes to manually-editable sections.** Extend it to frontmatter fields too (as a `field-pending-merge` convention). Keep this pattern.

---

### 3. Editorial review fields in frontmatter for handoff

**What happened:** The `editorial-review-date`, `editorial-reviewer`, `editorial-result: verified-candidate`, `editorial-notes` pattern lets Research Claude flag candidates and David filter them in the Ops app without ambiguity. Used on 6 profiles this session (Tlaib, Omar, Pressley, Khanna, Whitehouse, Warnock).

**Prevention rule:** **Continue this pattern for all Research Claude reviews.** David's Ops app should have a filter view for `editorial-result: verified-candidate` so he can work through the backlog efficiently.

---

### 4. When fixing a bug, search for the same pattern elsewhere

**What happened:** After fixing the YAML parse error on Tucker Carlson and Hillary Clinton, I scanned the vault for the same pattern and found 11 more latent bombs (profiles using folded-scalar YAML on structured fields, currently parsing but vulnerable to the next merge script run). Each preventive fix averted a future build failure.

**Prevention rule:** **When you fix a bug, always search for the same pattern vault-wide before declaring the bug fixed.** Defensive scans are cheap; future build failures are expensive.

---

### 5. Pipeline Guide cheatsheet template

**What happened:** Wrote a standardized per-pipeline cheatsheet template into `content/Pipeline Guide.md` with 12 priority pipelines pre-filled with known gotchas from today's fixes (A000383, QVT false positives, DOJ sanity cap, GovTrack cache invalidation, redirect enrichment). David can drop Perplexity research into the blanks, Code Claude can reference the whole thing in future sessions.

**Prevention rule:** **Use the same template-with-prefilled-gotchas pattern for other reference documentation.** Future Code Claude sessions pick up institutional knowledge without having to re-derive it from incidents.

---

### 6. Commit in logical chunks with multi-paragraph commit messages

**What happened:** Every commit this session had a multi-paragraph message explaining WHAT changed, WHY, and WHAT to watch for. Examples:
- `"Rules codification: frontmatter-only + URL editor-only + sprint plan"` — explains 2 new rules and the plan's relationship
- `"Vault-wide data quality sweep + readiness review pass"` — documents 5 sweeps and their cleanup counts
- `"CRITICAL FIX: YAML parse errors breaking Quartz build"` — explains the bug, the 2 affected files, the root cause analysis, and flags the script for Code Claude
- `"Warnock depth review + 11 preventive YAML folded-scalar conversions"` — links the individual review to the broader pattern discovery

**Prevention rule:** **Every non-trivial commit should have a multi-paragraph message.** One-line commits for typo fixes only. Future sessions will read `git log` to understand context and will thank you for the detail.

---

### 7. Parallel Claude sessions with git as the sync point

**What happened:** Research Claude (me) worked in the `reverent-hugle` worktree while Code Claude ran in a different context doing pipeline fixes and api enrichment. Git branches + periodic pushes kept us in sync. Only one real merge conflict (Mark Kelly), resolved in 2 minutes. Parallel work was net positive.

**Prevention rule:** **Keep doing this.** Different lanes, different file areas, git as handshake, regular commits, `/preflight` at session start to pull latest.

---

### 8. Session State as inter-session handshake

**What happened:** Each session starts with `/preflight` reading `content/Session State.md` to catch up on what the previous session(s) did. Flags for Code Claude, flags for Research Claude, flags for David — all documented in one place and passed forward. Multiple times today I referenced prior session notes to decide what to do next.

**Prevention rule:** **Never end a session without updating Session State.** Use `/session-save` at the end of every session. The next session's `/preflight` depends on it.

---

### 9. "Flag for David" not "fix for David" — keep humans in the loop for irreversible decisions

**What happened:** Multiple rules codified this session (URL editor-only, verified-candidate flagging, don't-delete-content) keep David in the loop for irreversible or high-risk decisions. Research Claude and Code Claude do the mechanical work; David makes the judgment calls.

**Prevention rule:** **When a decision is reversible and low-risk, automate it. When it's irreversible or high-risk, flag it.** This is the core pattern of the three-lane system (Research / Code / Editor).

---

### 10. Defensive YAML parse scan as session-start ritual

**What happened:** After the Tucker Carlson / Hillary Clinton fix, I added a YAML parse scan to my mental workflow. Ran it again after the pipeline merge and confirmed 0 parse errors. A 3-second scan that prevents hours of build-failure diagnosis.

**Prevention rule:** **`/preflight` should include a YAML parse scan.** Add it to the skill definition. If any profile has parse errors at session start, alert the operator immediately.

---

## Index of new rules codified this session

Rules that were added to `content/Vault Rules.md` or `CLAUDE.md` based on these lessons:

1. **URL fixing is Editor-only (David).** Neither Claude hunts, replaces, or verifies source URLs. (Vault Rules § Orphaned Claims, CLAUDE.md Ops section)
2. **Frontmatter is the ONLY source of truth for structured fields.** Never write `field:: value` inline in the body. (Vault Rules § Profile Schema, CLAUDE.md Frontmatter Schema)
3. **Research Claude flags `verified-candidate`, only David signs off on `verified`.** Protects A+ tier from self-grading inflation. (Implemented via `editorial-result: verified-candidate` frontmatter field)
4. **(PENDING) Never use YAML folded-scalar syntax on structured fields.** Add to Vault Rules as part of this session-save.
5. **(PENDING) Run YAML parse scan before any vault-wide operation.** Add as operational discipline.

---

## Open questions for future sessions

1. **What tool is re-adding inline dataview markers to profiles after the sweep?** Yesterday's cleanup removed 879 files, but today's depth reviews still found `profile-status::` and `content-readiness::` on ~6 profiles. Needs root-cause investigation.

2. **What linter/auto-merger corrupted Sheldon Whitehouse's `donors` field?** Combined a string-format value with a list-format value at the same YAML key. Code Claude to investigate.

3. **Can `/preflight` run a YAML parse scan as part of its checklist?** Would catch build-breaking bugs in ~3 seconds at session start. Worth adding to the skill.

4. **Can `/session-save` and `/deploy` verify build success before declaring success?** `gh run list --limit 2` after the push would catch failures immediately. Reduces silent build-broken states.

5. **Should we add a `content-readiness-previous` field to track readiness-state history?** Would make it easier to catch retroactive demotions (like the Cori Bush draft → ready → verified → draft cycle) and understand decision trails.

6. **How do we prevent the 528 readiness conflicts from regenerating?** David is working through them manually, but if the underlying cause (dual state from inline markers + frontmatter) isn't prevented at the source, new conflicts will accumulate.
