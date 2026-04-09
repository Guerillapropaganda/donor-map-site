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

8. **Verify the push succeeded.** Check for GitHub Actions deployment:
   ```
   gh run list --workflow=deploy.yml --limit 1
   ```
   If Actions are disabled, inform the user.

9. **Report** the merge commit hash and whether deploy triggered.

## Rules
- Never force push
- Never use `--no-verify`
- If merge conflicts arise in content files, prefer `--theirs` (remote wins for editorial content)
- If merge conflicts arise in code files, resolve manually
- Always pull before merging to avoid diverged branches
- The main repo is at `C:\Users\third\donor-map-site`, worktrees are under `.claude/worktrees/`
