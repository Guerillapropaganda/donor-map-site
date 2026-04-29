---
title: Operator Commands
type: system
last-updated: 2026-04-29
---

# Operator Commands

A cheatsheet of "I see X alarm — what command do I run?" for the harness checks and other operational surfaces. Open this any time you see a `/attention` entry and don't remember the fix.

Every command runs from the **main repo root** (`C:\Users\third\donor-map-site`) unless noted. From a worktree, `cd` to main first or copy the `node ...` command verbatim — the scripts auto-detect which repo they're in.

---

## Worktree drift — `worktree-data-mirror` alarm

**You see:** `worktree-data-mirror` harness check showing N findings (`missing` or `size-mismatched` derived files).

**What it means:** This worktree's `data/derived/*.jsonl` files are out of date relative to main repo. Detector scripts run from this worktree are operating on incomplete data.

**Fix:**
```bash
node scripts/bootstrap-worktree-data.cjs
```
Optional flags:
- `--dry-run` — preview what would copy, don't touch anything
- `--force` — also re-copy already-in-sync files

---

## Dispatcher dead — `dispatcher-alive` alarm

**You see:** `dispatcher-alive` harness check showing 1 finding (`Dispatcher log file does not exist` or `Dispatcher log is N minutes stale`).

**What it means:** The background worker that runs all your producers (contradiction-miner, voice-drift-detector, etc.) every 15-30 min has died. Harness counts will go stale until restarted.

**Fix (foreground, current session):**
```powershell
Start-Process -FilePath "C:\Program Files\nodejs\node.exe" `
  -ArgumentList '--max-old-space-size=4096', 'C:\Users\third\donor-map-site\scripts\attention-dispatcher.cjs' `
  -WorkingDirectory "C:\Users\third\donor-map-site" `
  -WindowStyle Hidden `
  -RedirectStandardOutput "C:\Users\third\donor-map-site\content\Admin Notes\.attention-dispatcher.log" `
  -RedirectStandardError "C:\Users\third\donor-map-site\content\Admin Notes\.attention-dispatcher.err"
```

**Fix (persistent — re-installs the scheduled task):**
```powershell
cd C:\Users\third\donor-map-site
powershell -ExecutionPolicy Bypass -File scripts\install-attention-dispatcher-task.ps1
```
The script refuses to delete a running task without `-Force`; if it complains, that's the safety guard working — the dispatcher is already alive.

---

## Stories integrity drifted — `story-pages-integrity` alarm

**You see:** N stale / broken-ref / duplicate findings in stories.

**What it means:** Some auto-generated story candidates no longer have librarian backing (the underlying monetary edge moved or was deprecated). Read-only scan by default; the dispatcher writes the flags.

**Fix (refresh stamps now):**
```bash
node scripts/story-pages-integrity-check.cjs --write
```

**Fix (triage individual stale):** open `/stories` ops page, archive or re-investigate per case.

---

## Sprint task done — record it

**You see:** you finished a `cc_NN` / `rc_NN` / `dc_NN` task and need to mark it done in the calendar.

**Fix:**
```bash
node scripts/sprint-task-update.cjs --mark-done cc_p3_148 \
  --note "1-3 sentence summary. File paths and commit hashes valued."
```
Optional flags:
- `--list --status pending --claude cc` — see what's still open
- `--dry-run` — preview the change

The session-save skill calls this automatically — only run by hand if you're not running session-save.

---

## Frontmatter orphan triage — names with no librarian backing

**You see:** `frontmatter-orphan-candidates` finding count growing, or you want to clean up stale wikilinks.

**What it means:** Profile frontmatter has names in `donors:` / `politicians-funded:` / `opposes:` with no edges in the librarian backing them. Likely typos or dead aliases.

**Fix (triage):** open ops `/relationships/orphans`. Per record, choose ✂ prune / 🔒 keep / 🚧 librarian-gap.

**Fix (after approving prunes — actually strip them):**
```bash
node scripts/rebuild-relationship-caches.cjs --apply-approved
```

---

## PAS2 missing — `Fairshake → Bowman` shows no edge

**You see:** the librarian probe for an FEC IE-spending pair returns false even though you know the edge exists; or `data/derived/fec-pas2.jsonl` is missing on disk.

**What it means:** The PAS2 derived file got truncated or deleted. Affects ~122K monetary edges including all ie-oppose claims.

**Fix:**
```bash
cd C:\Users\third\donor-map-site
node scripts/aggregate-pas2-to-edges.cjs --write
```
~1.5 sec runtime. Reads from `C:\donor-map-data\fec\` external CSV source.

---

## Calibration drift — `calibration-drift` alarm

**You see:** the harness reports `calibration-drift` findings; an ops page or `vault-audit` summary lists `<profile>/<bucket>` entries.

**What it means:** A curated top-N fact ("Pfizer top-15 must include Clyburn, McCarthy, Hoyer") no longer holds in `data/relationships-per-profile.json`. Catches the structural class of bug behind the 2026-04-28 cascade — stale artifact, role-tag drift, classifier regression all surface here.

**Fix (most common cause first):**
```bash
# 1. Rebuild the artifact (handles stale-artifact case — 90% of fires)
node scripts/build-relationships-per-profile.cjs

# 2. Re-run the check
node scripts/calibration-drift-check.cjs

# 3. If still failing, the underlying data really has drifted.
#    Inspect the failing profile's bucket:
node -e "console.log(JSON.stringify(require('./data/relationships-per-profile.json')['<PROFILE>']['<BUCKET>'].slice(0,5),null,2))"
```

**Fixture lives at:** `data/calibration-fixture.jsonl`. To add a fact, append a JSONL line: `{"profile":"…","bucket":"monetary-detail","top_n":15,"must_include":[…],"snapshot_date":"…","note":"…"}`. Re-snapshot after deliberate editorial changes.

---

## Pipeline frozen — `pipeline-frozen` state in Tier 1 output

**You see:** running `--tier1` returns `⏸ pipeline frozen — skipping Tier 1 auto-apply`.

**What it means:** Either the volume hard limit (200 claude-auto decisions/hour) was breached and the pipeline auto-froze, or someone froze it manually. Until lifted, every `pipeline.runTier1()` call returns `{ skipped: 'pipeline-frozen' }`. New candidates accumulate but nothing auto-applies. The propose --apply-decisions + --apply-approved flow still works for human-decided records.

**Inspect:**
```bash
node scripts/editorial-pipeline-freeze.cjs --status
```
Shows the freeze state, who set it, and the recent history.

**Lift after investigating the cause:**
```bash
node scripts/editorial-pipeline-freeze.cjs --clear --reason "<note explaining why it's safe>"
```

**Manually freeze (rare; usually auto-freeze handles it):**
```bash
node scripts/editorial-pipeline-freeze.cjs --set --reason "<why>"
```

The history list in the freeze JSON is append-only; it survives unfreezes for audit.

---

## Calibration auto-revert — Claude's Tier 1 mistake gets caught

**You see:** the `auto-revert-pending` harness reports findings; or you check on a profile and notice a record sitting in `state=candidate` with `reverted_reason: calibration-drift:<fixture>` set.

**What it means:** Claude auto-applied a Tier 1 decision recently. The calibration harness flagged that one of the protected fixtures (Pfizer top-N, ADM top-N, AOC top-N, etc.) broke. The auto-revert hook walked the registered classes, identified claude-auto decisions in the fixture's blast radius from the last 24h, and reverted them to candidate state. The decision is now flagged for human re-review.

**The auto-revert does NOT undo the external side effect** (alias appended to entities.jsonl, frontmatter modified). It only signals. To re-review:

```bash
# Find which records were reverted
node scripts/auto-revert-pending-check.cjs

# Inspect a specific record
node -e "const fs=require('fs');const j=fs.readFileSync('data/<store>.jsonl','utf-8').split('\n').filter(Boolean).map(JSON.parse).find(r=>r.id==='<id>');console.log(JSON.stringify(j,null,2))"
```

Three resolutions:
- **Calibration was a false positive** — re-snapshot the fixture, manually re-approve the decision via the review-list workflow. The class's `apply_decision` re-runs.
- **Predicate was wrong** — tighten the Tier 1 predicate in `scripts/classes/<class>.cjs` so this record class won't match next time. Mark this record `rejected`.
- **Decision genuinely was wrong** — leave reverted. The reverted_reason captures audit trail.

**Schedule:** runs every 15 min at offset minutes (5, 20, 35, 50) — slightly after the calibration check at 0/15/30/45.

---

## Editorial decision pipeline — Claude-auto vs David-approved (ADR-0029)

**Concept:** mechanical editorial decisions (alias merges, dedup, frontmatter-orphan triage, mechanical readiness promotion) flow through a tiered pipeline. Tier 1 is auto-applied with calibration safety net. Tier 2 is Claude-recommended, you batch-approve. Tier 3 stays David-only.

**Run a Tier 1 sweep across a class:**
```bash
node scripts/librarian-gap-propose.cjs --tier1
```
Predicate-matched candidates auto-resolve with `decided_by: claude-auto`. Calibration-drift hook will revert any that broke a fixture.

**Spot-check Claude's recent auto-applies:**
```bash
node -e "const p=require('./scripts/lib/editorial-decision-pipeline.cjs'); require('./scripts/classes/index.cjs'); console.log(JSON.stringify(p.sampleTier1Decisions({limit:20}), null, 2))"
```

**Or use the Ops audit page (Phase 3 of ADR-0029):**
- `/audit-claude-decisions` — two-pane surface listing every decision across every registered class. Filter by class / decided_by / state / date / search. Detail panel shows the full `change_log[]` timeline. One-click revert (also strips alias from entities.jsonl for librarian-gap-aliases). Sample 20 button pulls random Tier 1 from last 7d for the weekly audit cadence. Filters live in the URL — bookmark or share specific views. Keyboard nav: j/k = nav, r = revert.

**Manual revert from CLI (same path the Ops page uses):**
```bash
node scripts/audit-decisions-revert.cjs --class librarian-gap-aliases --id <gap_xxx>
```

**Audit harness (new in this ADR — runs every 15 min via dispatcher):**
- `editorial-decision-provenance` — every non-candidate record has decided_by + decided_at
- `tier1-fixture-coverage` — every Tier 1 class has fixture coverage (Rule 16)
- `claude-decision-volume` — alarm if >50 claude-auto decisions/hour (soft) or >200 (hard)
- `auto-revert-pending` — records calibration drift reverted, awaiting re-review

**Add a new decision class:**
1. Create `scripts/classes/<your-class>.cjs` that calls `pipeline.register({...})`
2. If Tier 1, add fixture coverage in `data/calibration-fixture.jsonl` BEFORE registering
3. Add `require('./<your-class>.cjs')` to `scripts/classes/index.cjs`
4. The pipeline rejects registration without fixture coverage (Rule 16, mechanical enforcement)

---

## Librarian gap review — wikilinks the librarian can't resolve

**You see:** the harness shows `librarian-gap-decisions` with N candidate findings; or you want to clear out alias gaps that are silently dropping edges (e.g. "International Association of Firefighters Interested in Registration and Education PAC" appears 416× but resolves to nothing).

**What it means:** Wikilinks in guarded fields point at names that don't match any entity in `entities.jsonl`. Most are alias gaps (the entity exists but is missing this name as an alias). Adding the alias resolves all appearances at once.

**Workflow:**
```bash
# 1. Refresh candidates from the gap audit (top-N high-leverage per class)
node scripts/librarian-gap-propose.cjs --report

# 2. Generate a review markdown at content/Admin Notes/librarian-gap-review.md
node scripts/librarian-gap-propose.cjs --review-list

# 3. Open the file in Obsidian. For each `decision:` line, set one of:
#       approved-alias: <canonical entity name from entities.jsonl>
#       rejected: <one-line reason>
#       needs-research:
#    Save.

# 4. Persist your decisions into the canonical store
node scripts/librarian-gap-propose.cjs --apply-decisions

# 5. Apply approved aliases to entities.jsonl
node scripts/librarian-gap-propose.cjs --apply-approved

# 6. Propagate the new aliases through the librarian + panels
node scripts/build-relationships-per-profile.cjs
node scripts/build-profile-data-panels.cjs --write
```

**Decisions store:** `data/librarian-gap-decisions.jsonl` (Rule 1 canonical store; never hand-edit; states: candidate / approved-alias / rejected / needs-research / resolved).

**Stats:** `node scripts/librarian-gap-propose.cjs --stats` shows state distribution + top 10 by appearances.

---

## Per-profile artifact stale — panels show wrong top recipients

**You see:** a profile's data-panel block lists implausible top-N (e.g. random freshmen instead of the senator you'd expect; tiny dollar amounts where you expect $50K+).

**What it means:** `data/relationships-per-profile.json` was generated from older relationship data, and `build-profile-data-panels` consumed the stale artifact.

**Fix:**
```bash
node scripts/build-relationships-per-profile.cjs   # ~10s
node scripts/build-profile-data-panels.cjs --write # ~1.5s, updates ~3K profiles
```

The artifact regenerates daily at 3:25 AM (changed from weekly 2026-04-28 after the Pfizer/ADM/AOC cascade). If it's still showing stale, the dispatcher may be paused or the daily run failed — check `content/Admin Notes/.attention-dispatcher.log`.

---

## Rebuild relationship caches (after editorial frontmatter edits)

**You see:** you hand-edited a profile's `donors:` / `opposes:` / `politicians-funded:` frontmatter and want the librarian to pick it up.

**Fix:**
```bash
node scripts/rebuild-relationship-caches.cjs
```
Reads frontmatter, writes through to `data/relationships.jsonl`. Idempotent.

---

## Run the full harness now (don't wait for the dispatcher)

```bash
node scripts/vault-audit.cjs
```
~30-45 sec. Runs all 30 checks. Output goes to `content/Admin Notes/vault-audit-latest.json`. The Dashboard auto-re-runs this if the artifact is >15 min old.

---

## Quick deploy from worktree to live site

```bash
git push origin claude/<your-worktree-branch>     # push branch
cd C:\Users\third\donor-map-site                  # main repo
git fetch origin
git merge --no-ff origin/claude/<your-worktree-branch> -m "Merge: <description>"
git push origin v4                                 # triggers GitHub Pages deploy
```
Or use the `/deploy` skill if you're in Claude.

---

## Where to find this list again

Ops app → **Build → Reference** (the /docs page). This file shows up in the docs panel as "Operator Commands."
