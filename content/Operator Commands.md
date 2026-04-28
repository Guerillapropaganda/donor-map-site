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
