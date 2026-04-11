---
name: session-save
description: "Save session state: update Session State.md + sprint-schedule.md calendar with what was done, commit all work, merge to v4, push. Run this before ending any session."
---
name: session-save

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

3. **Update `content/Admin Notes/sprint-schedule.md`** — this is the single source of truth for the Ops calendar. Both Claudes AND the calendar component read this file. Session-save MUST keep it in sync with reality.

   a. **Mark existing tasks done.** For every `cc_NN` / `rc_NN` / `dc_NN` task you actually completed this session, update:
      - `status: done` (or `status: blocked` / `in-progress` if appropriate)
      - `completed_date: YYYY-MM-DD` (today, absolute date)
      - `completed_at:` — full ISO 8601 timestamp with local offset, e.g. `'2026-04-11T14:32:00-07:00'`. Use the actual wall-clock time you're saving the session at. This is what drives the calendar's "hours today" meter — `completed_date` alone defaults to midnight and undercounts. If you genuinely do not know the time, you may omit this field and the calendar will fall back to midnight.
      - `notes:` — 1–3 sentences on what was actually done. File paths, commit hashes, and verification details are valued.

   b. **Add ad-hoc tasks you completed that weren't on the schedule.** Append them to the current phase's `code_claude:` / `research_claude:` / `design_claude:` list under a new ID following the existing numbering (cc_09, cc_10, ...). Each ad-hoc task MUST have:
      - `id:`
      - `task:` — one-line description
      - `status: done`
      - `completed_date: YYYY-MM-DD`
      - `completed_at:` — ISO timestamp with offset (see 3a above)
      - `added_adhoc: true` — flag so future-you can tell it wasn't in the original plan
      - `notes:` — 1–3 sentences with file paths / commit hashes

   c. **Update `last-updated: 'YYYY-MM-DD'`** in the frontmatter and the **"Schedule last updated: YYYY-MM-DD"** footer line at the bottom. These are used by the calendar cache-bust logic.

   d. **Update North Star `current:` metrics** if you moved any of them (pipeline_bugs_closed, draft_to_ready_promotions, verified_profile_count, public_launch_shipped).

   e. **Update `## Phase N — must-complete tasks` exit criteria progress** if you hit a threshold — the calendar uses this to show progress bars.

4. **Stage and commit** all uncommitted changes in the worktree:
   ```
   git add -A
   git commit -m "Session state: <brief description>

   Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
   ```
   Be selective with `git add` — don't add `.env`, `node_modules`, or `.next` files. Prefer adding specific files by name.

5. **Deploy** using the /deploy workflow (merge to v4, push). The deploy workflow now polls the GitHub Actions `deploy.yml` run for completion and reports success/failure — do NOT treat "push succeeded" as "deploy succeeded". Wait for the actual build to finish.

6. **Report** what was saved and the commit hash, include a line listing which sprint-schedule task IDs were updated or added (e.g., "calendar: cc_07 blocked→done, added cc_09, cc_10, cc_11"), AND include the deploy status (e.g., "deploy ✓ run 24256583626" or "deploy ✗ see https://.../runs/...").

## Rules
- Always convert relative dates to absolute dates ("tomorrow" → "2026-04-12")
- Be specific in "Done" items — file paths, component names, line counts
- "Next session priorities" should be actionable, not vague
- Don't truncate previous sessions — keep at least 3 previous session blocks
- If the session state is getting too long, summarize older sessions (keep last 5 detailed)
- **Never skip step 3.** The Ops calendar is how David sees sprint progress. If sprint-schedule.md isn't updated, David sees a lie when he opens the calendar — the North Star bars and day cells show stale state. The calendar update is not optional.
- **If there is no active sprint** (no `sprint-schedule.md` in `content/Admin Notes/` or its `status:` frontmatter is not `active`), skip step 3 and note "no active sprint" in the commit message.
