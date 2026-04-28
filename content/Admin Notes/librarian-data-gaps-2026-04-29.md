---
title: Librarian data gaps surfaced 2026-04-29 — PAS2 missing + worktree copy gap + Bush alias
type: admin-note
status: open
tags: [code, librarian, data-integrity]
last-updated: 2026-04-29
---

# Librarian data gaps surfaced 2026-04-29

While verifying today's contradiction-miner + story-pages-integrity librarian-gating refactors (commits `74cc5724e`, `116b18308`), three data gaps surfaced. This note documents them, the recovery, and what's still open.

## Gap 1 — `data/derived/fec-pas2.jsonl` was missing

**Symptom:** `hasMonetaryEdge(Fairshake, Jamaal Bowman)` returned `false` despite yesterday's session handoff explicitly verifying the $2,078,023 ie-oppose edge. Initial investigation found zero `fec-pas2` source edges in `data/relationships.jsonl` and zero PAS2 output files in `data/derived/`. The April 21 backup files (`fec-pas2.jsonl.pre-dedupe.bak`, 36.9 MB) were the only PAS2 artifacts on disk.

**Cause (probable):** `relationships-store.cjs::writeEdgesPartitioned()` includes a "truncate any derived file that USED to have edges but no longer does" step. If a script called the writer with no `fec-pas2`-source edges in its in-memory set, the file would get emptied. From there, an actual `fs.unlink` somewhere (not yet identified) erased the empty file. Yesterday's handoff claim of "re-aggregated all 24 PAS2 cycles producing 122k edges" must have been DRY-RUN output — the file was never actually written.

**Recovery:** ran `node scripts/aggregate-pas2-to-edges.cjs --write` from the main repo. Regenerated 122,074 edges (4,301 ie-support, 2,270 ie-oppose, 113,707 direct-donor, 1,104 coordinated-party, 692 party). Upsert: 121,311 added, 763 updated.

**Verification:** post-regen probes confirm Fairshake → Bowman is monetary-backed again, plus 4 of the 6 previously-stale story candidates (Sinema/DefendArizona, McMahon/AFSCME, DeSantis/SFA Fund, Bush/NRA-PVF probe-side) flip to backed.

**Lesson:** the aggregator's `--write` flag should never be assumed from the run output alone. Future session-save steps that claim "re-ingested X" should include a quick `ls -lah data/derived/<file>` proof in the handoff.

## Gap 2 — Worktree-side data divergence (fec-indiv-by-committee.jsonl)

**Symptom:** running today's contradiction-miner refactor in this worktree produced "dropped 175 cross-party profiles — frontmatter ≥2 funded but <2 librarian-backed." Some of those drops were legitimate (now-correctly-gated frontmatter typos) but most were false-drops because the worktree was missing 138K committee-receipt edges.

**Cause:** `data/derived/fec-indiv-by-committee.jsonl` is gitignored. Git worktrees check out tracked content only — untracked files in the main repo's working tree don't appear in the worktree. Result: the worktree has 9 derived files; the main repo has 10 (the same 9 plus `fec-indiv-by-committee.jsonl`, 66 MB, 138,753 monetary edges).

**Recovery:** copied `fec-indiv-by-committee.jsonl` and the freshly-regenerated `fec-pas2.jsonl` from main repo's `data/derived/` into the worktree's `data/derived/`. Pair-index size went from 35,486 unique sources → 133,202 (~3.7×) after the copy.

**Lesson:** worktree startup should mirror main-repo's untracked-but-load-bearing data files. Either:
- A worktree-bootstrap script that symlinks (or junctions) `data/derived/*.jsonl` from main repo (won't survive `git worktree remove` cleanup, so think about cleanup semantics)
- A pre-flight harness check `worktree-data-mirror` that warns when the worktree is missing files the main repo has
- Document explicitly: "if you're running detector verification in a worktree, manually copy `data/derived/` from main repo first"

This is a real footgun — every detector that uses `librarian-monetary-pairs.cjs` (relationship-overlap, contradiction-miner, story-pages-integrity, future graduations) is silently incomplete in a worktree by default.

## Gap 3 — George W. Bush alias gap (1 librarian entry)

**Symptom:** post-PAS2-regen, 2 of the 6 originally-stale story findings remained stale: `Bush has NRA POLITICAL VICTORY FUND in both donors and opposes` and `Bush has NATIONAL RIGHT TO LIFE POLITICAL ACTION COMMITTEE in both donors and opposes`. Manual probe with the canonical name `George W. Bush` (period) returned `hasMonetaryEdge: true`, but the integrity check returned stale.

**Cause:** the story records' `linked_entities` reference uses `[[George W Bush]]` (no period), inherited from however the contradiction-miner was reading the profile title at the time of seed creation. The canonical entity is `George W. Bush` (period). The resolver has no alias bridging the two. After `stripWikilink`, the lookup uses `George W Bush` which falls through.

**Recovery (not done):** add `George W Bush` as an alias to the canonical entity record in `data/entities.jsonl`. Closes both Bush stale findings. One-line editorial fix.

**Lesson:** story-record `linked_entities` should canonicalize names through the resolver at seed time, not store raw frontmatter title strings. Otherwise alias drift between writer and reader produces these false-stales. Future fix: have `addOrFindStory()` (or the contradiction-miner before calling it) run subject names through `resolver.entityFor(name)?.name || name` before storing. Keeps the linked_entities canonical regardless of how editorial titles drift.

## Companion incident — dispatcher death

A separate but related incident this session: the AtStartup install attempt's `schtasks /Delete` step killed the running dispatcher (PID 40280) for 3.5 hours before we noticed via the `dispatcher-alive` harness check. Restarted as PID 40912. The install script now has a preflight check that refuses to delete a running task without `-Force`. Captured separately in `scripts/install-attention-dispatcher-task.ps1` docstring + the `project_dispatcher_atstartup_blocked.md` memory note.

## Summary state — 2026-04-29 ~11:30 CT

- ✓ `fec-pas2.jsonl` regenerated, 122K edges restored
- ✓ Worktree's `data/derived/` mirrored from main repo
- ✓ Today's detector refactors (`74cc5724e`, `116b18308`) produce correct output against complete data
- ⚠ 3 still-stale story findings (1 real, 2 due to the Bush alias gap) — editorial fix pending
- ⚠ Worktree-data-mirror automation not built — every fresh worktree will re-hit gap 2

## Recommended next-session work

1. Add `George W Bush` alias entry to `data/entities.jsonl` for the canonical `George W. Bush` record
2. Patch `addOrFindStory()` (or the contradiction-miner upstream) to canonicalize subject names through the resolver before storing — prevents future story records from carrying non-canonical names
3. Decide on worktree-data-mirror approach (junction / bootstrap script / harness warning) and ship it
4. Investigate WHO deleted `fec-pas2.jsonl` originally — grep for `unlink.*fec-pas2`, check git log for any cleanup scripts that might have done it
