---
name: phase-transition
description: Mark a build phase complete and initialize the next one with full ceremony
---

# Phase Transition

Use when a build phase is complete and ready to advance to the next. Enforces exit criteria, retrospective writing, and clean handoff.

## When to use
- Every exit criteria box in the current phase is checked
- You are ready to move to the next phase
- NEVER use to skip phases — only to transition sequentially

## Steps

1. **Verify exit criteria.**
   Read `content/Phases/phase-{N}/exit-criteria.md`. Every checkbox must be checked. If any are not, STOP and report which are incomplete.

2. **Run the relevant build / test verification.**
   - `npx quartz build` must complete clean
   - All pre-commit sentinels must pass on current state
   - Phase-specific tests (see phase handoff doc)

3. **Write the retrospective.**
   Create `content/Phases/phase-{N}/retrospective.md`:
   - What was shipped (bullet list)
   - What took longer than expected
   - What surprised us
   - Lessons to carry forward
   - Tech debt introduced (if any)
   - Commit hashes of major changes

4. **Update `content/Build Phases.md`.**
   - Mark phase N as ✅ shipped
   - Mark phase N+1 as 🔨 in-progress
   - Update "Current phase" line at top

5. **Create next phase folder.**
   ```
   content/Phases/phase-{N+1}/
     handoff.md       (from template, first entry: "Ready to start")
     exit-criteria.md (copy from Build Phases.md section, expand)
     decisions.md     (empty log, ready for entries)
   ```

6. **Write the transition ADR.**
   Create `content/Decisions/NNNN-phase-{N}-shipped.md`:
   - Context: what was built
   - Decisions made mid-phase worth preserving
   - Lessons learned
   - Next phase context

7. **Update Session State.md.**
   Update the Current Build Phase section:
   ```
   Phase: {N+1}
   Status: in-progress
   Handoff doc: content/Phases/phase-{N+1}/handoff.md
   Next concrete action: {from new handoff doc}
   ```

8. **If the transition affects Research Claude's workflow**, add a note to Research Claude's section of Session State or Admin Notes.

9. **Commit with ceremony.**
   ```
   Phase {N} shipped — transitioning to Phase {N+1}

   [summary of what was built]

   Exit criteria: all met (see content/Phases/phase-{N}/retrospective.md)
   ADR: content/Decisions/NNNN-phase-{N}-shipped.md

   Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
   ```

10. **Announce in chat.**
    Report to David:
    - Phase N shipped summary
    - Phase N+1 first concrete action
    - Any open questions requiring his input before Phase N+1 starts

## Rules
- Never transition if exit criteria are incomplete
- Never skip phases (Phase 2 must ship before 2.5; 2.5 before 3; etc.)
- Always write the retrospective — it's the institutional memory
- Always write the transition ADR — it's the audit trail
- Commit message must reference the retrospective and ADR paths
