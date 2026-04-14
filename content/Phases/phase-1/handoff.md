---
title: Phase 1 Handoff — Source Registry + Generic-Link Cleanup
type: handoff
phase: 1
status: in-progress
last-updated: 2026-04-14
---

# Phase 1 Handoff

## Current state

**Schema + writer + extractor + fingerprint + orphan report all shipped this session.** Registry populated with 14,681 unique sources. Fingerprint pass running (or just finished — check `data/sources.jsonl` `status` distribution). Session is ~45% of Phase 1 deliverables complete.

### What's running when you read this
If the session was saved mid-fingerprint, check for the background task. The fingerprint pass processes ~11,000 unverified sources at ~11/s, so a full run takes roughly 16–20 minutes. It is safe to kill and resume (it only re-processes `status=unverified`).

## Exactly where to pick up

### If the fingerprint run has NOT finished
```bash
node scripts/sources-fingerprint.cjs           # resumes on unverified only
node scripts/sources-orphan-report.cjs         # generates triage report
git add data/sources.jsonl content/Admin\ Notes/orphan-citations-report.md
git commit -m "Phase 1 — finish fingerprint pass, generate orphan report"
```

### If the fingerprint run HAS finished and orphan report exists
**Next concrete action:** write the Quartz plugin for `{{src:ID}}` ref resolution. Location: `quartz/plugins/transformers/source-refs.ts`. Reads `data/sources.jsonl` at build time via the TS mirror (to be written: `quartz/util/sources-store.ts` — port the CJS reader to TypeScript, read-only is fine for build-time). Matches `{{src:src_000123}}` in markdown body and replaces with proper `[title](canonical_url)` markdown links.

After that:
1. Test profile using `{{src:ID}}` refs (pick 3 with known sources)
2. Ops `/sources` review page
3. Pipeline migration (one enrichment script writes through sources-store)
4. Doc updates: CLAUDE.md, Vault Rules.md, Pipeline Guide.md
5. Phase 1 retrospective + `phase-transition` skill

## Files shipped this session

### Commit 1: `e3626410a` — Foundation docs + schema + store
- `content/Class Tag Vocabulary.md` — locked 5-dimension class-analysis vocab
- `content/Monetization Model.md` — tier map, non-negotiables, auth plan
- `content/Build Phases.md` — 6-phase sequential build doc
- `content/Phases/phase-1/` — handoff, exit-criteria, decisions
- `content/Decisions/0001–0003` — ADRs
- `.claude/skills/phase-transition/SKILL.md`
- `scripts/lib/sources-schema.cjs` — schema, validator, URL normalization
- `scripts/lib/sources-store.cjs` — reader/writer API, smoke tested 10/10

### Commit 2: `778e2cf2d` — Extractor + full-vault population
- `scripts/extract-sources-from-vault.cjs` — host classifier with 100+ rules
- `data/sources.jsonl` — 14,681 unique sources (from 18,587 raw links)

### Commit 3: `d6c6e64ce` — Fingerprint script v1
- `scripts/sources-fingerprint.cjs` — fetch, hash, classify (live/dead/generic_orphan/paywall/redirected)

### Commit 4: `1881536ea` — Bot-block detection fix + orphan report
- Fingerprint classifier fix: detects Cloudflare challenges, "Just a moment...", "Are you a robot?", Ray IDs, __cf_chl markers. HTTP 403 reclassified from dead to needs_review (usually anti-scraping, not 404).
- `scripts/sources-orphan-report.cjs` — generates triage report grouped by entity

## Exit criteria checklist

- [x] `scripts/lib/sources-schema.cjs` (schema + validator)
- [x] `scripts/lib/sources-store.cjs` (reader/writer API)
- [x] `scripts/extract-sources-from-vault.cjs` (vault walker)
- [x] `scripts/sources-fingerprint.cjs` (fetcher/classifier)
- [x] `scripts/sources-orphan-report.cjs` (triage report generator)
- [x] `data/sources.jsonl` populated with 14,681 deduped sources
- [ ] Fingerprint pass complete on all unverified sources *(in progress or just done)*
- [ ] `content/Admin Notes/orphan-citations-report.md` committed
- [ ] Quartz `{{src:ID}}` plugin
- [ ] Ops `/sources` review page
- [ ] At least one pipeline migrated to sources-store
- [ ] `CLAUDE.md`, `Vault Rules.md`, `Pipeline Guide.md` updated with new rules
- [ ] `npx quartz build` clean (no regressions)
- [ ] Phase 1 retrospective written

**Progress: ~45% (6 of 11 core deliverables shipped this session).**

## Decisions made this session

See `content/Phases/phase-1/decisions.md` — additions from this session:

### Host classification: tier defaults
Conservative classification. `.gov` fallback to `government_primary` tier 1. Wikipedia/Wikidata to `aggregator` tier 3 (reference, not primary). OpenSecrets stays tier 3 (demoted from Tier 1 per Vault Rules). Everything unrecognized is `other` with `tier: null` — David reclassifies in Ops UI.

### Bot-block handling (mid-run discovery)
First fingerprint run classified Bloomberg/Forbes/WSJ/Reuters pages as `dead` based on HTTP 403 or Cloudflare challenge pages. Fixed classifier to detect bot-walls by title regex (`Just a moment...`, `Are you a robot?`, `Access Denied`) and body markers (`cf-browser-verification`, `__cf_chl`, `Ray ID`). These reclassify as `needs_review` so David can eyeball in a real browser.

HTTP 403 specifically is now `needs_review` too — almost always anti-scraping, not a real 404.

### Paywall list
`nytimes.com, wsj.com, washingtonpost.com, bloomberg.com, ft.com, economist.com, thetimes.co.uk, newyorker.com, theatlantic.com`. Checked BEFORE fetch so we skip hitting them entirely. These stay as `paywall` status forever unless David manually re-checks.

### Classification philosophy
Default to `needs_review` when uncertain, `dead` only when there's genuine evidence (DNS fail, 404, 5xx, no bot-block signals). David can batch-triage in Ops UI. Better to over-flag than silently file a "dead" link that's actually bot-walled.

## Known issues / surprises

1. **Windows illegal-char directories** — `content/Events/Drafts/` has some dirs with trailing spaces. The extractor's `readdirSync` wrapped in try/catch handles gracefully. No crashes.
2. **Malformed markdown links** — zero encountered in full-vault run (0/18,587). Either the vault is cleaner than expected or the regex is permissive enough.
3. **29% "other" source_type** — roughly 5,341 links didn't match any host rule. Not a bug; expected given the diversity of source material. David can reclassify in Ops or add host rules later. Fingerprinting doesn't depend on classification.
4. **Citation reuse rate is 21%** — 18,587 raw links deduped to 14,681 unique. Means each source is cited ~1.3× on average. Once profiles use `{{src:ID}}` refs, fixing one broken URL propagates to ~1.3 profiles. Good leverage but not dramatic.
5. **Main repo v4 is still diverged** — 34 local vs 7 remote as of session start. Another session is handling that cleanup. Don't merge from this worktree to v4 until that's resolved.

## Open questions for David

None blocking. Classification vocabulary can be expanded in future sessions. David can triage the orphan report when it lands in `content/Admin Notes/`.

## Tests / verification done

- [x] sources-schema.cjs: schema validator rejects bad records
- [x] sources-store.cjs: 10/10 smoke tests (add, dedupe-by-normalized-URL, get, update, query, count, reload)
- [x] extract-sources-from-vault.cjs: dry-run on Agriculture folder, then full-vault dry-run, then full-vault live run
- [x] sources-fingerprint.cjs: smoke test on 20 URLs (18 live, 1 dead, 1 generic_orphan), then aborted full run revealed bot-block issue, then fixed and re-run
- [x] sources-orphan-report.cjs: validated output format on partial fingerprint data

## Progress log

### 2026-04-14 — Planning + foundation session (Code Claude)
Morning: planning session produced ADR-0001/0002/0003 and the full documentation package. Shipped schema + store as foundation.

Afternoon: built and ran extractor, hit the full vault at 18,587 links, registered 14,681 unique sources. Built fingerprint script with bot-block detection fix after first run hit false-dead on Cloudflare-protected sites. Built orphan report generator. Re-ran fingerprint pass in background.

Phase 1 now ~45% complete. Next session picks up Quartz `{{src:ID}}` plugin.
