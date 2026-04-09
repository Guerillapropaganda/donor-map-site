---
name: sessionsave
description: "Save session state: update Session State.md with what was done, commit all work, merge to v4, push. Run this before ending any session."
---
name: sessionsave

# Save Session

You are saving the current session's progress before ending.

## Steps

1. **Read the current Session State.md** at `content/Session State.md`.

2. **Update the "Last Session" section** with:
   - Claude type (Code / Research / Both)
   - Today's date
   - Short description of the session theme
   - **Done:** bullet list of everything accomplished (be specific — file names, component names, what changed)
   - **Known issues:** anything broken or incomplete
   - **In progress:** work started but not finished
   - **Next session priorities:** numbered list, most important first
   - Move the previous "Last Session" content down to "Previous Session"

3. **Stage and commit** all uncommitted changes in the worktree:
   ```
   git add -A
   git commit -m "Session state: <brief description>

   Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
   ```
   Be selective with `git add` — don't add `.env`, `node_modules`, or `.next` files. Prefer adding specific files by name.

4. **Deploy** using the /deploy workflow (merge to v4, push).

5. **Report** what was saved and the commit hash.

## Rules
- Always convert relative dates to absolute dates ("tomorrow" → "2026-04-10")
- Be specific in "Done" items — file paths, component names, line counts
- "Next session priorities" should be actionable, not vague
- Don't truncate previous sessions — keep at least 3 previous session blocks
- If the session state is getting too long, summarize older sessions (keep last 5 detailed)
