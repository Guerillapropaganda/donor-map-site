---
status: open
tags: [ops, harness, audit, code-claude]
date: 2026-04-24
author: Code Claude
---

# Ops pages vs. vault-audit harness — compliance audit

Follow-up to the 2026-04-24 afternoon "Ops display rule" codified in CLAUDE.md. Every ops page that shows **counts, statuses, or health signals** must source those numbers from the vault-audit harness (via `/api/vault-audit`) rather than from per-profile frontmatter stamps. This note inventories where each ops page stands.

## Plain-English framing

The harness is a single script (`scripts/vault-audit.cjs`) that re-runs 14 checks against the vault from scratch every time. Its results land in `content/Admin Notes/vault-audit-latest.json`. Reading that file is the only way to be sure what a page shows matches what is currently true. Reading frontmatter stamps like `audit-a-plus-passed` gives you a number that was true the last time a background script ran — which may have been days ago, or never, if that script is paused or broken.

## Done this session

Commit coming from worktree `bold-tu-f7e64f`.

| Page | Change |
|---|---|
| **/signoff-queue** | Added `HarnessChip`. Added a 4th stat card "Still below A+ bar" sourced live from the harness `type-specific-a-plus` check. Still reads `audit-a-plus-passed` stamps for the per-profile table — see "Known gap" below. |
| **/bugs** | Added `HarnessChip` in the header. The bugs manifest is a separate artifact, but showing harness freshness here gives the reader a background trust signal. |
| **/system-health** | Added `HarnessChip` in the header alongside the existing VaultAuditPanel + "Re-run checks" button. |
| **ops/src/components/HarnessChip.tsx** (new) | Shared, self-contained component. Fetches `/api/vault-audit` on mount, auto-POSTs to re-run if age > 15 min, click-to-rerun, exposes `onLoad` callback so callers can read `findings_count` per check. |

## Known gap: /signoff-queue per-profile table

**The queue table itself still reads the `audit-a-plus-passed` frontmatter stamp** via `/api/vault`. This is the exact anti-pattern the Ops display rule warns against — but fixing it requires either:

- **Option A:** Extend the harness `type-specific-a-plus` check (or `pipeline-janitor`) to emit the list of *passing* profiles (path, title, type, triangulation count) into the artifact, not just a findings_count. `/signoff-queue` then renders the table from the artifact.
- **Option B:** Build a new live endpoint `/api/signoff-queue` that recomputes the pass/fail per profile on demand (duplicating janitor logic, not ideal).

**Recommendation:** Option A. The janitor already does this computation; we just need to teach the harness wrapper to capture the passing set. Follow-up task in this session or next.

Mitigation in place: the "Still below A+ bar" card is live, so if the janitor is dead David sees a stale stamp count *next to* a live upstream count, and the discrepancy becomes visible.

## Pages with stamp-read patterns that are *not* violations

Rule 9 (`reclassify-readiness.cjs` as single owner of the `content-readiness` stamp) makes these fine — the stamp is the authoritative published value, not a cache of computation:

- `/calendar` — reads `content-readiness` for sprint calendar items
- `/distribution` — reads `content-readiness` for publication funnel
- `/editor` — reads `content-readiness` to show profile status
- `/notes` — `content-readiness` + admin notes
- `/profile` — `content-readiness` on profile detail
- `/publisher` — `content-readiness` for publication queue
- `/scripts` — `content-readiness` for affected-profiles counts
- `/signoff-launch` — `content-readiness` + `promotedToVerified` for launch checklist

None of these display a *quality signal* the way the Dashboard/Sign-off Queue/System Health do, so they don't need the HarnessChip.

## Pages that show counts but are not harness-sourced and not violations

These show domain data from canonical stores (not quality/health signals), so the harness is not the right source:

| Page | Data source | Health signal needed? |
|---|---|---|
| /alerts | /api/alerts (activity + stamps) | Maybe — current alerts feature could benefit from harness `dispatcher-alive` freshness |
| /attention | /api/attention-queue | No — attention queue is its own pipeline |
| /capitol-trades | capitol-trades.json | No |
| /class-tags | class tag registry | No |
| /money-trail | canonical transactions | No |
| /operations | security + costs dashboards | Maybe — operations overview might be a candidate for ambient harness chip |
| /policies | policy registry | No |
| /pipelines | pipeline status (separate system) | Has its own liveness; harness `enrichment-freshness` check overlaps |
| /query | ad-hoc query UI | No |
| /relationships | /api/relationships (review queue) | No |
| /rules | rulebook | No |
| /source-hunter | source-hunter pipeline | No |
| /urls | /api/urls (URL triage) | No |

## Recommended follow-up (bug queue entries)

1. **Extend harness `type-specific-a-plus` to emit passing-profile list** — blocks full /signoff-queue compliance.
2. **Consider adding `HarnessChip` to `/operations`** — it's a daily-use dashboard; ambient freshness signal would help.
3. **Audit pages that show "last enriched" timestamps** for stamp-vs-live drift — `/pipelines` in particular.
4. **Consolidate `/system-health`'s VaultAuditPanel `onRerun` button and the new HarnessChip** — currently both wire to POST /api/vault-audit independently; only one should be the authority.

## Patterns worth keeping

The HarnessChip component encapsulates the whole fetch-auto-rerun-render cycle. Any new ops page can import it and drop it in a header with zero plumbing:

```tsx
import HarnessChip from "@/components/HarnessChip"
// ...
<HarnessChip onLoad={setHarness} />
```

If the page needs a specific check's findings_count, it passes `onLoad` and pulls from `harness.checks.find(c => c.name === "name")?.findings_count`.

---

**Resolution criteria:** Close this note when (a) the /signoff-queue deeper rewire above is done and (b) `/operations` either gets a chip or is documented as not needing one.
