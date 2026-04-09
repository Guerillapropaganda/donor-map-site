---
name: preflight
description: "Session startup checklist. Reads Session State, checks Admin Notes, reports what happened last and what's next. Run this at the start of every session."
---
name: preflight

# Preflight Check

You are starting a new session. Run this checklist to get oriented.

## Steps

1. **Read Session State:**
   ```
   Read content/Session State.md
   ```
   Report: what Claude type ran last, date, what was done, what's next.

2. **Check Admin Notes for open items:**
   ```
   Grep for "status: open" in content/Admin Notes/
   ```
   Report any open notes tagged for your lane (code/data/style for Code Claude, research/question for Research Claude).

3. **Check for uncommitted changes:**
   ```
   git status -u (in both worktree and main repo)
   ```
   Report if there's uncommitted work that might need attention.

4. **Check GitHub Actions status:**
   ```
   gh run list --workflow=deploy.yml --limit 1
   ```
   Report if Actions are enabled and if the last deploy succeeded.

5. **Check current branch and worktree:**
   Report the current branch name, worktree path, and whether you're in a worktree or main repo.

6. **Summarize** in 5-10 lines:
   - Last session: what was done
   - Open items: admin notes, uncommitted changes
   - Deploy status: Actions working?
   - Today's priorities: from Session State
   - Any blockers

## Rules
- Don't start working until preflight is done
- If Session State mentions "In progress" items, flag those as potential stale work
- If Admin Notes have urgent items, mention them first
- Keep the summary concise — David moves fast
