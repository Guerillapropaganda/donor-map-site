---
name: preflight
description: "Session startup checklist. Reads Session State, checks Admin Notes, runs a YAML parse scan of the vault, reports what happened last and what's next. Run this at the start of every session."
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

6. **Run YAML parse scan across the vault (3-second sanity check):**
   This catches silent build-break states where a recent commit introduced broken YAML frontmatter that Quartz would fail to build. Prior incidents: Sheldon Whitehouse's `donors` field getting corrupted into a hybrid string+list format on 2026-04-10 (fixed in the Ops API `route.ts` commit `5c51da89`), Tucker Carlson / Hillary Clinton / Mark Kelly hitting the same pattern during the overnight merge script run.

   Run this Node script in-process (do NOT shell out to a separate file — keep it inline and fast):
   ```javascript
   node -e "
   const fs = require('fs');
   const path = require('path');
   const yaml = require('js-yaml');
   const CONTENT = 'content';
   const problems = [];
   function walk(dir) {
     for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
       const full = path.join(dir, entry.name);
       if (entry.isDirectory()) walk(full);
       else if (entry.name.endsWith('.md')) {
         const text = fs.readFileSync(full, 'utf-8');
         const m = text.match(/^---\n([\s\S]*?)\n---/);
         if (!m) continue;
         try { yaml.load(m[1]); }
         catch (e) { problems.push({ file: full, error: e.message.split('\n')[0] }); }
       }
     }
   }
   walk(CONTENT);
   if (problems.length === 0) console.log('YAML parse: 0 errors across vault');
   else {
     console.log('YAML parse: ' + problems.length + ' error(s):');
     for (const p of problems.slice(0, 20)) console.log('  ' + p.file + ' — ' + p.error);
     if (problems.length > 20) console.log('  ... and ' + (problems.length - 20) + ' more');
   }
   "
   ```
   **If the scan reports ANY errors:** flag them prominently in the preflight summary — these will block the next `npx quartz build` and should be fixed before any other work. Do NOT start on the session's planned work until the vault parses clean.

7. **Summarize** in 5-10 lines:
   - Last session: what was done
   - Open items: admin notes, uncommitted changes
   - Deploy status: Actions working?
   - **YAML health:** vault parse-clean? (if not, LIST the broken files FIRST in the summary)
   - Today's priorities: from Session State
   - Any blockers

## Rules
- Don't start working until preflight is done
- If Session State mentions "In progress" items, flag those as potential stale work
- If Admin Notes have urgent items, mention them first
- Keep the summary concise — David moves fast
- **If YAML scan fails, fix the broken files FIRST before starting any session work.** A broken vault means the deploy will fail silently and the live site will stop updating. Treat a YAML error the same way you'd treat a red CI check on `v4`.
