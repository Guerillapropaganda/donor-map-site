---
name: deploy
description: "Merge current worktree branch to v4 and push to deploy. Handles stash, pull, conflicts, merge, push, and verification."
---
name: deploy

# Deploy to v4

You are deploying the current worktree's changes to the v4 branch (production).

## Steps

1. **Check for uncommitted changes in the worktree.** If there are any, commit them first with a descriptive message.

2. **Switch to the main repo** at `C:\Users\third\donor-map-site` (NOT the worktree path).

3. **Stash any uncommitted changes in the main repo:**
   ```
   cd "C:\Users\third\donor-map-site" && git stash
   ```

4. **Pull latest from remote:**
   ```
   git pull --no-rebase origin v4
   ```

5. **Pop stash if there was one** and resolve any conflicts (use `--theirs` for content files, preserve code changes):
   ```
   git stash pop
   ```
   If conflicts, resolve them, `git add` the resolved files, and commit.

6. **Merge the worktree branch:**
   ```
   git merge claude/<worktree-branch-name> --no-edit
   ```
   Get the branch name from `git branch` in the worktree directory.

7. **Push to v4:**
   ```
   git push origin v4
   ```

8. **Poll the deploy workflow for success (Red Flag #7 — 2026-04-10 lesson):**
   A silent deploy failure means the live site stops updating and nobody notices for hours. Don't just check "did it start" — wait for the result.
   ```bash
   # Wait ~10s for GitHub to register the new run, then poll every 20s up to 5 minutes
   sleep 10
   for i in 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15; do
     STATUS=$(gh run list --workflow=deploy.yml --limit 1 --json status,conclusion,databaseId \
       --jq '.[0] | "\(.status)|\(.conclusion)|\(.databaseId)"')
     echo "attempt $i: $STATUS"
     case "$STATUS" in
       completed\|success\|*) echo "✓ deploy succeeded"; break ;;
       completed\|failure\|*|completed\|cancelled\|*|completed\|timed_out\|*)
         echo "✗ DEPLOY FAILED — check https://github.com/Guerillapropaganda/donor-map-site/actions/runs/${STATUS##*|}"
         exit 1 ;;
     esac
     sleep 20
   done
   ```

   **If the workflow is disabled or nothing fired,** fall back to reporting the last known-good deploy run and flag the gap to the user prominently.

9. **Report** the merge commit hash, the deploy run ID, and the final status (success / failure / still-running-at-timeout). If the deploy failed, include a direct link to the run.

## Rules
- Never force push
- Never use `--no-verify`
- If merge conflicts arise in content files, prefer `--theirs` (remote wins for editorial content)
- If merge conflicts arise in code files, resolve manually
- Always pull before merging to avoid diverged branches
- The main repo is at `C:\Users\third\donor-map-site`, worktrees are under `.claude/worktrees/`
- **Never report "deploy triggered" as success.** "Triggered" and "succeeded" are different outcomes. Only report ✓ after the workflow run reaches `status: completed` AND `conclusion: success`.
- If polling times out (5 min without completion), report "deploy still running at N minutes, did not wait" — don't claim success.
