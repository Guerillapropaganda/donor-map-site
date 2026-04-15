---
title: "TypeScript Errors Inventory"
type: admin-note
note-type: data
status: active
last-updated: 2026-04-15
authority: Pillar 4 Foundation Audit
---

# TypeScript Errors Inventory

State of `tsc --noEmit` across both codebases after Pillar 4's build audit (2026-04-15).

## Root Quartz (`tsconfig.json` in repo root)

### ✅ CLEAN — 0 errors

Fixed in Pillar 4. Baseline was 27 errors before; all 27 eliminated. The `.husky/pre-push` hook is now a **blocking** gate (was warn-only) — any future regression will stop the push.

**What was fixed:**
- **20x TS6133** unused-var errors — simple deletions across AdminBar, DiscoveryPanel, EventTimeline, EvidencePanel, NetworkGraph, PartySplitMeter, ProfileHeader, ProfileWidget, graph.inline.ts, networkGraph.inline.ts, networkGraphIndex.ts
- **1x TS7006** implicit-any in `PageList.tsx` — added explicit `string[]` annotation on `const tags`
- **1x TS2367** dead comparison in `ProfileHeader.tsx` — removed `type === "corporation"` branch (type was already narrowed to `"politician" | "donor"` by an earlier early-return, so corporation was unreachable)
- **1x TS2345** (`ArticleNav.tsx`) — `currentSlug` was typed as `FullSlug | ""`; changed to fallback on `"index" as FullSlug`
- **4x TS2345** (D3 types in `networkGraph.inline.ts`) — three `selectAll(...)` calls needed generic type parameters (`<SVGGElement, GraphNode>`) to narrow from `BaseType` to `SVGGElement`. One `removeAllChildren(svgEl)` call needed an `as unknown as HTMLElement` cast.

**Config fix:** the root `tsconfig.json` used to have `"include": ["**/*.ts", "**/*.tsx"]` with no exclude for `ops/`. That meant every `tsc --noEmit` run was scanning ops files with the wrong config and reporting 600+ false positives about missing `@/lib/*` modules. Added `"ops/**/*"` to the exclude list. This was the biggest noise reduction in the audit.

### Pre-push hook: strict gate

`.husky/pre-push` runs `npx tsc --noEmit` and **blocks the push** on any error. No more warn-only. Emergency bypass is `SKIP_HOOKS=1` — use only with documented reason.

---

## Ops (`ops/tsconfig.json`)

### ⚠️ 17 errors — DEFERRED to a future cleanup pass

Ops has its own build job in CI (`ops-build` in `.github/workflows/regression-tests.yml`) that runs `next build` with `OPS_CI_BUILD=1`, which sets `typescript.ignoreBuildErrors: true` in `ops/next.config.js`. Webpack compile still fires (catching broken imports — the 2026-04-15 Clerk incident class), but `tsc --noEmit` strictness is skipped.

**Why deferred:** these errors need more substantive fixes than Quartz's unused-vars did. Most involve shared type definitions (`Profile` vs `ProfileData`) that are used across many components. Fixing them without understanding the full data flow risks breaking runtime behavior. Requires a focused session.

### The 17 errors, categorized

#### Type mismatch on D3 chain (2 errors in 1 file)
- `src/app/money-trail/page.tsx:178` — `g.append("g")` returns `Selection<BaseType, ...>` but `flowGroup` is typed as the stricter `Selection<SVGGElement, ...>`. Same fix pattern as Quartz's networkGraph — add a generic to narrow the selection type. **Effort:** ~5 min.
- `src/app/money-trail/page.tsx:180` — `'flowGroup' is possibly 'null'` — add a null guard. **Effort:** ~1 min.

#### Profile / ProfileData type divergence (9 errors across 7 files)
- `src/components/CardDossier.tsx:15` — `Profile → Record<string, unknown>` cast
- `src/components/CardReceipt.tsx:15` — same
- `src/components/cards/CardPipeline.tsx:15` — same
- `src/components/cards/CardRedacted.tsx:16` — same
- `src/components/cards/CardTicker.tsx:15` — same + `:107` unknown → ReactNode
- `src/components/cards/CardWeb.tsx:15` — same
- `src/components/cards/CardWire.tsx:15` — same
- `src/app/profile/page.tsx:709` — `ProfileData → Profile` parameter mismatch
- `src/app/profile/page.tsx:813` — `ProfileData` missing `folder`, `subfolder` fields from `Profile`

**Common cause:** the Ops app has two similar types, `Profile` (from `@/lib/vault`) and `ProfileData` (defined inline in `/profile/page.tsx`). The card components expect `Profile`; parts of `/profile/page.tsx` pass `ProfileData`. Fix: unify the types or add a conversion helper. **Effort:** ~1-2 hours, requires understanding how each card component uses the data.

#### Other (6 errors)
- `src/app/profile/page.tsx:250` — dead comparison between two non-overlapping string literal types. **Effort:** ~5 min. Likely a leftover from a status enum rename.
- `src/app/relationships/page.tsx:520` — D3 `.call()` overload mismatch. **Effort:** ~10 min.
- `src/app/relationships/page.tsx:1005` — `.stories` property access on a type that doesn't have it. **Effort:** ~5 min. Probably needs updating a stats type to include `stories` field.
- `src/components/VaultGrid.tsx:226` — sort mode type narrower in the state setter than in the dropdown option. **Effort:** ~5 min. Add the missing sort mode to the state type.
- `src/lib/vault.ts:322` — `>=` comparison between `number` and `string | number`. **Effort:** ~5 min. Add a `Number()` cast or narrow the type.

### Total estimated cleanup effort

Roughly **3-4 hours of focused work** to drive Ops to 0 errors. The card component pattern (9 errors) is the biggest chunk — they all have the same `Profile` cast issue, so one type unification fix knocks them all out simultaneously.

### Next step: enable strict gate on Ops build

Once Ops is at 0 errors:
1. Remove the `typescript.ignoreBuildErrors: CI_BUILD` line from `ops/next.config.js`
2. Remove the `OPS_CI_BUILD=1` env var from the CI `ops-build` job
3. Test that `npx next build` succeeds cleanly in CI without the bypass
4. If yes: the Ops build job now enforces TS strictness end-to-end

**Deferred as a distinct Pillar 4 follow-up, not a blocker for anything else.**

---

## Running the check yourself

**Quartz (blocks push):**
```bash
npx tsc --noEmit
```
Should print nothing and exit 0.

**Ops (separate tsconfig, separate directory):**
```bash
cd ops && npx tsc --noEmit
```
Currently prints the 17 errors listed above. Will exit 0 after the deferred cleanup.

---

## Baseline timestamps

- **2026-04-15 (Pillar 4 ship):** Quartz at 0 errors (from 27). Ops at 17 errors (unchanged from pre-audit). Pre-push hook strict.
- **Prior to Pillar 4:** Quartz at 27 errors, Ops at 17 errors, pre-push warn-only.
