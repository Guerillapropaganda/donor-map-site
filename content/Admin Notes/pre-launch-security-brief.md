---
title: "Pre-Launch Security Brief"
type: admin-note
note-type: security
status: reference
source: cross-session-claude-research
date-received: 2026-04-15
disposition: filed-for-reference
implementation-timeline: near-future
do-not-act: "David handed this to current Claude as reference material. Current Claude should NOT implement any of these tasks. Another Claude session is implementing them. This file is for situational awareness only."
---

# Pre-Launch Security Brief

**Source:** Another Claude session working in the Donor Map vault produced this sprint-ready task list for David.
**Status:** Reference material, NOT an active work queue for this Claude.
**Purpose:** Situational awareness so this session doesn't duplicate work or create merge conflicts with the other session's security sprint.

> **Instruction from David (2026-04-15):** "Just read do not act."

---

## The brief (as received)

### Sprint-ready task list with everything prioritized by tier and implementation order

#### Part 1 — Licensing (1-2 hours, ship first)
- 1.1 `LICENSE` file (MIT) for code
- 1.2 `CONTENT-LICENSE` file (CC-BY-SA 4.0) for editorial
- 1.3 Public `/legal` page linked from footer
- 1.4 Trademark registration flagged for David

#### Part 2 — Security, four tiers

- **Tier 1 (non-negotiable before launch):**
  - gitleaks full-history scan
  - pseudonymity audit
  - Clerk dev/prod separation
  - deps CVE scan wired into CI

- **Tier 2 (before remote Ops or paid API):**
  - rate limiting middleware
  - query engine cost limits with new contract tests

- **Tier 3 (launch hardening):**
  - corrections policy + log
  - DMCA/legal playbook
  - backup/recovery playbook

- **Tier 4 (nice to have):**
  - source corroboration audit

Each task has: a file path for the deliverable, a behavior spec, the rationale, and what NOT to do (so the other session doesn't over-engineer).

---

## Key things flagged as blockers for David

Five decisions the other Claude session can't make on David's behalf, listed at the bottom of the original brief:

1. **Attribution name for the LICENSE copyright line** — real name, project name, or pseudonym?
2. **Pseudonymity stance** — needed before the identity audit runs, so the report has a standard to evaluate against
3. **Corrections email** — pick an address + set up domain mail
4. **Second Git remote** for backups — pick a provider
5. **Trademark registration** — just a reminder, not a Code task

---

## Suggested workflow (from the other Claude session)

> Read `content/Admin Notes/pre-launch-security-brief.md` and implement in tier order. Start with Part 1 (licensing) — it's 1-2 hours and the highest-leverage work. Ask me the five blocker questions at the bottom before touching anything that depends on them.

---

## Coordination notes from current Claude session (2026-04-15 foundation-phase work)

**⚠ Sentinel numbering has shifted since this brief was written.**

The brief says "Task 2.6 (query cost limits) becomes sentinel 8" and mentions the other session will modify `.husky/pre-commit` and `.github/workflows/regression-tests.yml`. Important context for whichever session picks this up:

- **As of this filing (2026-04-15), the pre-commit hook is at 9 sentinels, not 7.** Pillar 1 (auth audit) added `auth-smoke-tests` as sentinel 9 in commit `ff383d9b8`.
- So Task 2.6's query-cost-limits sentinel would become **sentinel 10**, not sentinel 8.
- Current 9 sentinels are:
  1. self-review-mirror
  2. yaml-sanity-scan
  3. duplicate-bioguide-sentinel
  4. relationship-edge-sentinel
  5. canonical-store-sentinel
  6. phase-6-regression-tests
  7. query-engine-contract-tests
  8. deps-staging-sentinel
  9. auth-smoke-tests (NEW — Pillar 1)
- The new `.husky/pre-push` hook is now a **strict blocking TS gate** (flipped from warn-only in Pillar 4, commit `6cb9e1a59`). The other session should be aware — any file with a TS error will stop the push.

**Other relevant state the other session should know about:**

- **OPS_AUTH_BYPASS exists** (ADR-0009 + bug-001 fix). It's gated on `NODE_ENV !== "production"` + explicit env var, but the other session should NOT disable this when they do the Clerk dev/prod separation work (Tier 1, Task 2.3). It's the primary local dev auth path per ADR-0009, not a workaround. See `content/Admin Notes/phase-2.5-setup.md § Recovery from Clerk lockout` + `content/Decisions/0009-auth-architecture.md`.

- **Ops `/system-health` dashboard already flags the "50 public API routes" gap** (Pillar 3, commit `3ddb32051`). 50 of 59 Ops API routes don't call `requireTier` or `requireAdmin` — they predate Phase 2.5 auth. The pseudonymity audit (Tier 1, Task 2.2) and any rate-limiting work (Tier 2, Task 2.5) should start by reading the manifest at `ops/src/data/ops-surfaces.json` + the live dashboard to see which routes need gating.

- **Ops `/bugs` dashboard exists** (Pillar 5, commit `47f004341`) and reads `content/Admin Notes/bug-queue.md` + `content/Phases/phase-6/deferred-items.md`. Any security-related deferred items can be filtered by category (security/auth = 16 items in the current backlog). The other session may want to triage these items as part of Tier 1 work.

- **Quartz TS baseline is 0 errors** (Pillar 4). Ops TS baseline is 17 errors, DOCUMENTED AS DEFERRED in `content/Admin Notes/ts-errors-inventory.md`. The other session should not be blocked by the Ops TS errors — they're scoped out of the `ops-build` CI job via `OPS_CI_BUILD=1` env gate in `ops/next.config.js`.

- **Pre-commit canonical-store-sentinel** (#5) blocks hand-edits to frontmatter relationship fields. The other session's backup/recovery playbook (Tier 3) should not try to restore via frontmatter edits — restore through `data/relationships.jsonl` directly.

---

## When the other session implements this

Current Claude is NOT implementing any of this in-session. When the other Claude starts this sprint, they should:

1. Read this file first for context
2. Read `content/Decisions/0009-auth-architecture.md` for the auth state
3. Read `content/Admin Notes/phase-2.5-setup.md` for Clerk dev/prod context
4. Read `content/Admin Notes/ops-surface-audit.md` for the "50 public APIs" finding
5. Read `content/Admin Notes/ts-errors-inventory.md` to know what's already gated vs deferred
6. Read the 9-sentinel pre-commit hook at `.husky/pre-commit` before adding sentinel 10
7. Ask David the 5 blocker questions BEFORE doing any work that depends on them

---

*Filed on 2026-04-15 during the foundation-stabilization marathon session (Pillars 1, 3, 4, 5). Current session did NOT act on the content — purely reference.*
