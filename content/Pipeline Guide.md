---
title: Pipeline Guide
type: system
last-updated: 2026-04-08
---

# Pipeline Guide — The Donor Map

How data flows from government APIs into vault profiles. Code Claude maintains these pipelines. Research Claude reads the output.

---

## API Inventory

| Pipeline | API Source | Tier | Auth | What it provides |
|----------|-----------|------|------|-----------------|
| **FEC** | api.open.fec.gov | 1 | API key | Donor contributions, independent expenditures, politicians-funded |
| **FEC Summary** | api.open.fec.gov | 1 | API key | Total raised/spent, cash on hand, debt per cycle |
| **Congress** | api.congress.gov | 1 | API key | Bills sponsored, policy areas, member details |
| **Committee** | api.congress.gov | 1 | API key | Committee and subcommittee assignments |
| **Senate LDA** | lda.gov (migrated from lda.senate.gov) | 1 | Token | Lobbying filings, spend totals, issues lobbied |
| **LobbyView** | rest-api.lobbyview.org | 1 | Token | Client-bill lobbying networks, NAICS codes |
| **FARA** | fara.us/api | 1 | None | Foreign agent registrations, foreign principals |
| **USASpending** | api.usaspending.gov | 1 | None | Federal contracts, grants, awards |
| **USASpending Awards** | api.usaspending.gov | 1 | None | Subawards, spending breakdowns by agency/NAICS |
| **SAM.gov** | api.sam.gov | 1 | API key | Entity registrations, contract opportunities |
| **GovTrack** | govtrack.us/api | 1 | None | Vote analysis, bill tracking, legislator data |
| **Federal Register** | federalregister.gov/api | 1 | None | Federal rulemaking, proposed rules, notices |
| **SEC EDGAR** | efts.sec.gov | 1 | None | Corporate filings (10-K, 10-Q, DEF 14A, etc.) |
| **SEC Litigation** | efts.sec.gov | 1 | None | SEC enforcement actions, litigation releases |
| **CourtListener** | courtlistener.com/api | 1 | API key | Federal court dockets, RECAP records |
| **DOJ Press** | justice.gov/api | 1 | None | DOJ press releases, enforcement actions |
| **EPA ECHO** | echo.epa.gov/api | 1 | None | Environmental violations, facility compliance |
| **OSHA** | apiprod.dol.gov/v4 | 1 | API key | Workplace safety inspections, penalties |
| **CPSC Recalls** | saferproducts.gov | 1 | None | Consumer product safety recalls |
| **NHTSA Recalls** | api.nhtsa.gov | 1 | None | Vehicle recalls, complaints, investigations |
| **FCC** | publicfiles.fcc.gov | 1 | None | Political ad buys (per-station only, limited) |
| **Stock Watcher** | S3/GitHub bulk data | 1 | None | Congressional stock trades (Senate only) |
| **OFAC SDN** | treasury.gov/ofac | 1 | None | Sanctions list screening (bulk CSV) |
| **GLEIF** | api.gleif.org | 1 | None | Legal Entity Identifiers, corporate ownership |
| **OpenSanctions** | api.opensanctions.org | 2 | API key | PEP screening, international sanctions |
| **Nonprofit 990** | propublica.org/nonprofits | 2 | None | IRS 990 tax filings, revenue, exec comp |
| **Public Accountability** | publicaccountability.org | 2 | None | UC Berkeley public records (1.9B records) |
| **Wikipedia** | wikidata.org + en.wikipedia.org | 3 | None | Entity IDs, descriptions, key facts |
| **Lobbying Cross-Ref** | Local vault analysis | — | None | Influence chains: lobbying → donations → committees |
| **Auto-Connection Engine** | Local vault analysis | — | None | Maps relationships: donor↔politician bidirectional, shared donors, opposition enforcement |
| **RSS** | Various feeds | 2-3 | None | News event matching against profiles |

## Scripts

All scripts live in `donor-map-engine/scripts/`. Run from the engine repo root.

| Script | Targets | Limit | Key frontmatter |
|--------|---------|-------|-----------------|
| `fec-pipeline.cjs` | Politicians + Donors | 30 | `total-raised`, `total-spent`, `politicians-funded` |
| `fec-summary-pipeline.cjs` | Politicians | 20 | `fec-candidate-id`, `fec-cycle`, `cash-on-hand` |
| `congress-pipeline.cjs` | Politicians | 30 | `congress-id`, `bills-sponsored` |
| `committee-pipeline.cjs` | Politicians | 20 | `committees` |
| `lda-pipeline.cjs` | Donors/Corps | 20 | `lobbying-spend`, `lobbying-filings` |
| `lobbyview-pipeline.cjs` | Donors/Corps | 5 | `lobbyview-bills`, `naics-code` |
| `fara-pipeline.cjs` | All entities | 15 | `fara-registrant`, `fara-principals` |
| `usaspending-pipeline.cjs` | Donors/Corps | 10 | `federal-contracts`, `contract-total` |
| `usaspending-awards-pipeline.cjs` | Donors/Corps | 15 | `subawards-issued`, `top-federal-agency` |
| `sam-pipeline.cjs` | Donors/Corps | 10 | `sam-registered` |
| `govtrack-pipeline.cjs` | Politicians | 5 | `govtrack-id`, `leadership-score` |
| `federal-register-pipeline.cjs` | All entities | 20 | `federal-register-mentions`, `regulatory-agencies` |
| `sec-edgar-pipeline.cjs` | Corps/Donors | 15 | `sec-filings`, `sec-form-types` |
| `sec-litigation-pipeline.cjs` | Corps/Donors | 15 | `sec-enforcement-actions` |
| `courtlistener-pipeline.cjs` | All entities | 15 | `court-cases`, `court-jurisdictions` |
| `doj-press-pipeline.cjs` | All entities | 15 | `doj-press-mentions`, `doj-components` |
| `epa-echo-pipeline.cjs` | Corporations | 15 | `epa-violations`, `epa-facilities` |
| `osha-pipeline.cjs` | Corporations | 15 | `osha-inspections`, `osha-penalties` |
| `recall-pipeline.cjs` | Corporations | 15 | `cpsc-recalls` |
| `nhtsa-recalls-pipeline.cjs` | Corporations | 15 | `nhtsa-recalls`, `nhtsa-complaints` |
| `fcc-political-pipeline.cjs` | All entities | 15 | `fcc-political-files` |
| `stock-watcher-pipeline.cjs` | Politicians | all | `stock-trades`, `stock-trade-tickers` |
| `ofac-sdn-pipeline.cjs` | All entities | all | `ofac-sdn-match`, `ofac-programs` |
| `gleif-pipeline.cjs` | Corps/Donors | 30 | `lei`, `lei-jurisdiction`, `lei-parent` |
| `opensanctions-pipeline.cjs` | All entities | 50 | `opensanctions-status`, `opensanctions-matches` |
| `nonprofit-990-pipeline.cjs` | Corps/Donors/Think-tanks | 20 | `ein`, `nonprofit-status`, `total-revenue` |
| `public-accountability-pipeline.cjs` | All entities | 15 | `public-accountability-records` |
| `wikipedia-pipeline.cjs` | All entities | 30 | `wikidata-id`, `wikipedia-url`, `wikipedia-extract` |
| `lobbying-contrib-pipeline.cjs` | All entities | all | Influence cross-reference (body only) |
| `rss-pipeline.cjs` | All profiles | N/A | Creates event draft files |
| `pipeline-coverage-report.cjs` | All profiles | N/A | Reports only (JSON + MD) |
| `opensecrets-replace.cjs` | All files | N/A | Replaces URLs in body |

## Running Pipelines

**Every script follows the same pattern:**
```bash
node scripts/{name}.cjs                    # dry run (preview only)
node scripts/{name}.cjs --write            # apply changes to vault
node scripts/{name}.cjs --write --verbose  # detailed output
node scripts/{name}.cjs --profile="Name"   # target single profile
node scripts/{name}.cjs --write --limit=10 # cap profiles per run
```

**Local runs** require `CONTENT_DIR` pointed at the site repo:
```bash
cd /c/Users/third/donor-map-engine
CONTENT_DIR=/c/Users/third/donor-map-site/content node scripts/fec-pipeline.cjs --write --verbose
```

**GitHub Actions** runs automatically via `api-enrichment.yml`:
```bash
# Trigger from CLI
cd /c/Users/third/donor-map-engine
gh workflow run api-enrichment.yml --field limit=20 --field pipeline=all
gh workflow run api-enrichment.yml --field limit=5 --field pipeline=lobbyview
```

Pipeline options: `fec`, `fec-summary`, `congress`, `committee`, `propublica`, `nonprofit-990`, `sam`, `lda`, `usaspending`, `usaspending-awards`, `govtrack`, `lobbyview`, `fara`, `courtlistener`, `federal-register`, `sec-edgar`, `sec-litigation`, `public-accountability`, `fcc`, `opensanctions`, `doj-press`, `wikipedia`, `ofac-sdn`, `recall`, `nhtsa-recalls`, `lobbying-contrib`, `stock-watcher`, `gleif`, `epa-echo`, `osha`, `all`

## Engine-wide known incidents (shared infrastructure)

These are bugs in the shared libraries (`scripts/lib/`) or the GitHub Actions workflow — they affect multiple pipelines at once and deserve their own section so each pipeline cheatsheet doesn't have to re-document them.

### FileCache null/undefined conflation (fixed 2026-04-11)

**Incident:** `FileCache.get(key)` in `scripts/lib/shared.cjs` returns `null` for BOTH "missing key" and "cached null value" — it never returns `undefined`. Two pipelines short-circuited their own API calls on a cold cache by checking `if (cached !== undefined) return cached`:
- `scripts/wikipedia-pipeline.cjs` (3 sites: wbsearchentities, wbgetentities, Wikipedia summary)
- `scripts/opensanctions-pipeline.cjs` (1 site: match batch cache)

Both pipelines silently reported "not found" / "cached" for every profile on the first run with an empty cache, because `null !== undefined` is always true. Verified against John Boozman, Neil Gorsuch, Jan Koum — all have Wikidata entries but the pipeline never fetched them.

**Fix:** All four sites now use `if (cached != null) return cached` (loose-equality catches both null and undefined). Trade-off: negative results are no longer cached across runs for these pipelines, but the cost is acceptable (single API call per unknown profile, not a hot loop).

**Quality check rule:** When writing any pipeline against `FileCache`, check the return value of `get()` with `!= null`, never `!== undefined`. Consider this a required code-review item. If you genuinely need to distinguish "missing" from "cached null", write a wrapper that stores a sentinel (e.g., empty string) for negative results and checks for it explicitly — do not rely on `undefined`.

### Api-config env-var naming: two valid conventions (2026-04-11)

**Background:** The engine's GitHub Secrets use non-standard names (`FECAPI`, `CONGRESSAPI`, `LDAAPI`, `SAMAPI`, `DOLAPI`, `LOBBYVIEWAPI`, `COURTLISTENERAPI`, `OPENSANCTIONSAPI`) that get written to `.env` by the workflow. For local runs, `scripts/lib/api-config.cjs` expected the conventional names (`FEC_API_KEY`, `CONGRESS_API_KEY`, etc.), so a developer who pasted their GitHub-Secret values verbatim into `donor-map-engine/.env` saw every pipeline fall back to `DEMO_KEY` without any obvious error.

**Fix:** `api-config.cjs` now resolves keys via a `pickKey(...names)` helper that tries multiple name variants in order. **Both** naming conventions work:
```
FEC_API_KEY=...       # standard name
FECAPI=...            # GitHub-Secret name (also accepted)
```
No migration needed — either style resolves correctly.

**Quality check rule:** Any new API added to `api-config.cjs` should register both the standard name and the GitHub-Secret name via `pickKey()`. If you see a `env.FOO_API_KEY || process.env.FOO_API_KEY` pattern elsewhere in the file, refactor it to use `pickKey()` when you're in there.

### Mandated real keys: hard-fail on DEMO_KEY for high-volume pipelines (2026-04-11)

**Incident:** FEC's `DEMO_KEY` has a 40 req/hr limit. Historically the FEC pipeline would print a warning and continue, meaning the first 40-odd profiles succeeded and the rest silently returned "not found" due to 429s. Those 429 responses then poisoned the `fec-not-found-cache` so the profiles STAYED "not found" on subsequent runs until the cache expired.

**Fix:** `apiConfig.requireRealKeys(...names)` now hard-fails the process if a required key is missing or equals `DEMO_KEY`. Currently called by:
- `scripts/fec-pipeline.cjs` → requires `fec`
- `scripts/congress-pipeline.cjs` → requires `congress`

Add `apiConfig.requireRealKeys(...)` near the top of any new pipeline that needs a registered key to function correctly (LDA, SAM, LobbyView, CourtListener, DOL/OSHA, OpenSanctions).

**Override for local debugging only:** `ALLOW_DEMO_KEYS=1 node scripts/fec-pipeline.cjs ...`. Never set this environment variable in CI or in any `--write` run.

### GitHub Actions `api-enrichment.yml` stale-log contamination (fixed 2026-04-11)

**Incident:** The workflow cached the entire `reports/` directory via `actions/cache@v4` with `restore-keys: pipeline-caches-`, and the per-pipeline "Written to vault" counts were grepped out of `reports/logs/*.log` files at commit time. When the parallel-run step hit its 25-minute timeout (happened on both of the 2026-04-09 scheduled runs), the new logs never overwrote the old cached logs. The commit-message step then reported **stale counts from the previous run**, making it look like every run was producing the same per-pipeline write counts (e.g. `courtlistener:14 doj-press:15 fara:2 federal-register:10 gleif:8 govtrack:4 lda:7 nhtsa-recalls:8 nonprofit-990:10 sec-edgar:9 usaspending-awards:3 usaspending:4`) across totally different file totals (93 → 125 → 220 → 452). Smoking gun: commits `f0473ec8`, `0cc2eeeb`, `d19255cf`, `e2cb82cf`, `cdace094`, `6d3dbd68`, `182fde48`, `0cc9bfa0`, `ce987e39` — identical per-pipeline counts, wildly different file totals.

Secondary impact: the `wait` step in the parallel runner never returned when a single slow pipeline hung past 25 minutes, so the auto-connection engine that runs after `wait` never executed on those runs.

**Fix (three-part):**
1. **Exclude `reports/logs/` from the cache path** via `!reports/logs` pattern — only data caches persist across runs.
2. **Wipe `reports/logs/` at the start of each parallel-run step** (`rm -rf reports/logs` before `mkdir -p`) as defence-in-depth.
3. **Bump the parallel-step timeout** from 25 → 30 minutes, and the job timeout from 35 → 40 minutes, to give slow pipelines more headroom.

**Quality check rule:** If two consecutive enrichment commits show **identical** per-pipeline counts in their subject lines but different file-change totals, assume log contamination and investigate. Also: do NOT cache log files — cache DATA files only (the `*-cache.json` inventories that pipelines themselves write to `reports/` for memoization).

**Follow-up TODO:** Some pipelines may genuinely run longer than 30 minutes on a full batch. If the 30-min timeout still fires on scheduled runs, split the workflow into "fast pipelines" (< 5 min each) and "slow pipelines" (> 5 min) running as separate jobs, or trim the `--limit=` on the slowest offenders (candidates from experience: `opensanctions --limit=50`, `wikipedia --limit=30`, `gleif --limit=30`). Measure before cutting.

### GitHub Actions scheduled runs silently stop firing (diagnosed + kicked 2026-04-10)

**Incident:** The `api-enrichment.yml` workflow's scheduled cron (`0 2/8/14/20 * * *`) stopped firing after 2026-04-09 17:44Z. Over the next 24 hours, four expected slots passed with zero `event: schedule` runs in the history — only `event: workflow_dispatch` entries from manual triggers. The workflow metadata still showed `state: active` and the YAML file was unchanged on `main`. No error, no notification, no disabled flag. Silent failure.

**Root cause (suspected):** Both scheduled runs that DID fire on 2026-04-09 (11:33Z and 17:44Z) hit the 25-minute parallel-step timeout (25m14s and 25m24s durations). GitHub Actions has undocumented behavior where repeated scheduled failures can cause the scheduler to pause firing for that workflow without marking it disabled. This is not in GitHub's public docs but is a well-known community workaround. The "stale log contamination" bug documented above was the root cause of the timeouts.

**Fix (two-part):**
1. The timeout fix (documented above) should prevent future scheduled failures.
2. To un-stick the scheduler immediately, toggle the workflow off and on:
   ```bash
   gh workflow disable api-enrichment.yml
   sleep 3
   gh workflow enable api-enrichment.yml
   ```
   Verify via `gh api repos/.../actions/workflows/{id} --jq '.updated_at'` — a fresh timestamp confirms the toggle took effect. Applied 2026-04-10 20:32Z (commit following this Pipeline Guide edit).

**Quality check rule:** Preflight should now include a "scheduled runs health" check: `gh run list --workflow=api-enrichment.yml --limit 5 --json event,createdAt` and look for at least one `schedule` event in the last 12 hours. If none, the scheduler is stuck — apply the disable/enable toggle. Add this to `.claude/commands/preflight.md` as Step 4b when a recurrence forces the issue.

**Follow-up:** If the scheduler stops again after this fix holds, the cause is NOT the timeout-induced pause — it's something else (repo inactivity auto-disable, workflow file corruption, GitHub-side incident). Check `gh api /repos/.../actions/workflows/{id} --jq '.state'` first.

### updateFrontmatter scalar/list hybrid corruption (fixed 2026-04-10)

**Incident:** `scripts/lib/shared.cjs::updateFrontmatter()` had two code paths for writing frontmatter fields — scalar and array — and each had its own regex for finding the existing field. Neither path correctly handled the case where the existing value was in a DIFFERENT form than the new value being written. Specifically: when a pipeline wrote `donors: "comma,separated,string"` to a profile whose existing `donors:` field was a YAML list, the scalar-write regex `/^donors:.*$/m` replaced only the `donors:` line itself but left the indented `  - "..."` continuation lines underneath, creating:

```yaml
donors: "League of Conservation Voters,Trial Lawyers,..."
  - "League of Conservation Voters"   ← orphaned from previous list form
  - "Trial Lawyers Fund"
  - "..."
```

This is invalid YAML (`bad indentation of a mapping entry`) and broke the Quartz deploy on Sheldon Whitehouse's profile in commit `865e0156` ("API enrichment: 412 files"). The bad state then shipped through a second deploy (`24267993437`) before the root cause was identified. Same failure pattern exists in reverse if an array-write lands on a profile with an orphaned scalar.

Smoking gun in the diff: a single 2-line change on 2026-04-10 at 22:59Z converted `donors:` from a clean list to the hybrid state, and the deploy log showed `content/Politicians/Democrats/Senate/Sheldon Whitehouse/_Sheldon Whitehouse Master Profile.md: bad indentation of a mapping entry (64:3)`.

**Fix (fixed in engine commit after this Pipeline Guide edit):** Both write paths in `updateFrontmatter()` now use a single `fullFieldRegex(key)` helper that matches the key line PLUS any indented continuation lines (list items, wrapped values, etc.) before replacement. This guarantees the old field is fully removed regardless of its existing form. Test suite exercises four scenarios: scalar-replacing-list, array-replacing-list, array-replacing-scalar, and new-key insertion — all pass.

**Quality check rule:** Any regex that replaces a YAML mapping entry in frontmatter MUST consume continuation lines (`[ \t]{2,}[^\n]*` pattern) or it will leak orphaned continuation lines when the value type changes. If you see a regex like `^key:.*$` used for frontmatter replacement, assume it's broken and switch to the full-field pattern.

**Preventive: vault-wide YAML sanity scan.** `scripts/yaml-sanity-scan.cjs` in the site repo validates every profile's frontmatter with `js-yaml` and reports any that fail. Run it after any bulk pipeline run that writes frontmatter fields. Zero-tolerance: any broken YAML blocks the Quartz deploy, so catch it pre-commit.

**Root cause of the pipeline passing scalar donors to begin with:** separate issue — some pipeline (suspected: auto-connection or a merge script) was passing a comma-separated string where the field semantically should be an array. The `updateFrontmatter` fix makes this class of mismatch safe regardless of caller intent, but the caller-side bug should still be identified and corrected in a follow-up.

## How Data Lands in Profiles

### 1. Frontmatter (numbers)
Pipeline writes key-value pairs directly into YAML frontmatter:
```yaml
total-raised: 2400000
bills-sponsored: 12
lobbying-spend: 5600000
last-enriched: 2026-04-06
```
Components on the site read these values for live display (Both Sides meter, ProfileWidget stats).

### 2. Auto-blocks (formatted sections)
Pipeline writes formatted content inside HTML comment markers:
```markdown
<!-- auto:fec-fundraising start -->
### FEC Fundraising Summary

| Metric | Value |
|--------|-------|
| Total Raised | $2.4M |
| Individual Contributions | $1.8M |
...

- [Source: FEC](https://www.fec.gov/data/candidate/...) (Tier 1)
<!-- auto:fec-fundraising end -->
```

**Block types currently in use:**
- `auto:fec-fundraising` — FEC financial summary
- `auto:fec-donors` — Top donor contributions
- `auto:fec-summary` — Campaign finance totals per cycle
- `auto:congress-legislation` — Bills, committees, policy areas
- `auto:committee-assignments` — Committee and subcommittee assignments
- `auto:lda-lobbying` — Lobbying activity and spend
- `auto:lobbyview-networks` — Bill-level lobbying networks
- `auto:fara-foreign-agent` — FARA foreign agent registrations
- `auto:usaspending-contracts` — Federal contract awards
- `auto:usaspending-subawards` — Subaward details and spending breakdowns
- `auto:sam-registration` — SAM.gov entity data
- `auto:govtrack-votes` — Voting record and scores
- `auto:federal-register` — Federal rulemaking mentions
- `auto:sec-filings` — SEC EDGAR corporate filings
- `auto:sec-enforcement` — SEC enforcement actions
- `auto:courtlistener-cases` — Federal court records
- `auto:doj-press` — DOJ press releases
- `auto:epa-echo` — EPA environmental violations
- `auto:osha-safety` — OSHA workplace inspections
- `auto:cpsc-recalls` — Consumer product recalls
- `auto:nhtsa-recalls` — Vehicle safety recalls
- `auto:fcc-political-files` — FCC political ad buys
- `auto:stock-trades` — Congressional stock trades
- `auto:ofac-sdn` — OFAC sanctions screening
- `auto:gleif-lei` — Legal Entity Identifiers
- `auto:opensanctions` — PEP/sanctions screening
- `auto:nonprofit-990` — IRS 990 tax filings
- `auto:wikipedia` — Wikipedia/Wikidata entity data
- `auto:influence-cross-ref` — Lobbying → donation → committee chains
- `auto:propublica-990` — Nonprofit tax filings (legacy)

### 3. Conflict resolution
- Fresh data overwrites auto-blocks on each run
- If Research Claude has edited inside an auto-block (hash mismatch detected), the pipeline **parks** new data in a `pending-merge` block below
- Research Claude folds pending-merge data into the editorial content during next session
- Hashes tracked in `reports/enrichment-hashes.json`

## API Keys

Keys live in `.env` (gitignored) locally and as GitHub Secrets for CI.

| Key | .env variable | GitHub Secret | Where to get it |
|-----|--------------|---------------|-----------------|
| FEC | `FEC_API_KEY` | `FECAPI` | https://www.fec.gov/developers/ |
| Congress.gov | `CONGRESS_API_KEY` | `CONGRESSAPI` | https://api.congress.gov/sign-up/ |
| Senate LDA | `LDA_API_KEY` | `LDAAPI` | Token auth (already configured) |
| SAM.gov | `SAM_API_KEY` | `SAMAPI` | https://sam.gov/content/home |
| LobbyView | `LOBBYVIEW_API_KEY` | `LOBBYVIEWAPI` | https://www.lobbyview.org → Sign in → Data Download → API |
| CourtListener | `COURTLISTENER_API_KEY` | `COURTLISTENERAPI` | Profile page on courtlistener.com |
| OpenSanctions | `OPENSANCTIONS_API_KEY` | `OPENSANCTIONSAPI` | https://opensanctions.org (free non-commercial) |
| DOL/OSHA | `DOL_API_KEY` | `DOLAPI` | https://data.dol.gov (free registration) |

**22 pipelines need zero auth**: USASpending (both), GovTrack, Federal Register, SEC EDGAR, SEC Litigation, FARA, DOJ Press, EPA ECHO, CPSC, NHTSA, FCC, Stock Watcher, OFAC SDN, GLEIF, Wikipedia, Public Accountability, Nonprofit 990, Lobbying Cross-Ref, RSS.

## OpenSecrets URL Replacement

OpenSecrets URLs are being systematically replaced with government equivalents:

| OpenSecrets Category | Count | Replacement |
|---------------------|-------|-------------|
| members-of-congress | 1,132 | FEC candidate pages |
| orgs | 824 | FEC committee pages |
| political-action-committees-pacs | 397 | FEC committee pages |
| federal-lobbying | 382 | Senate LDA search |
| news | 428 | No auto-replacement (manual review) |
| outside-spending | 140 | FEC independent expenditures |
| donor-lookup | 129 | FEC individual contributions |

Run: `node scripts/opensecrets-replace.cjs --write`

Old OpenSecrets URLs move to the **Archived** section in profile sources per Vault Rules.

## Auto-Promotion & Staleness Decay

Pipelines can auto-promote profiles through readiness tiers:

| Transition | Trigger | Automatic? |
|-----------|---------|-----------|
| `raw → draft` | Any substantive content added (body > 100 chars or Tier 1 source) | Yes |
| `draft → ready` | Body > 500 chars + Tier 1 sources + enriched + connections exist | Yes |
| `ready → verified` | 2+ Tier 1 source types + no contradictions + human sign-off | **NO — requires editorial** |
| `verified → ready` | 90 days without re-enrichment (staleness decay) | Yes (automatic) |
| `ready → draft` | 180 days without any update (staleness decay) | Yes (automatic) |

### Reclassification Script

Audits all profiles against the 4-tier criteria and reclassifies:
```bash
node scripts/reclassify-readiness.cjs                    # dry run (report)
node scripts/reclassify-readiness.cjs --write            # apply changes
node scripts/reclassify-readiness.cjs --profile="Name"   # single profile
```

Also computes `source-types`, `corroboration-count`, and `known-gaps` for each profile.

### Staleness Decay Script

Demotes stale profiles automatically:
```bash
node scripts/staleness-decay.cjs                          # dry run (report)
node scripts/staleness-decay.cjs --write                  # apply demotions
```

## Reports

Pipeline output goes to `reports/` (gitignored). Key files:
- `{pipeline}-cache.json` — persistent cache per pipeline
- `enrichment-hashes.json` — hash tracking for auto-block conflict detection
- `enrichment-log.json` — what was written, when, any conflicts
- `opensecrets-replacement.json` — URL replacement mapping

---

# Pipeline Cheatsheets

Per-pipeline operational reference. **Merged 2026-04-10 from Perplexity research + vault-specific incident history.**

**Code Claude reads these when building or debugging pipeline scripts.** Research Claude reads the "Canonical URL format" and "Quality signals" sections when citing sources in Verified sections or checking auto-block output.

**Sourcing:**
- **Perplexity-sourced sections** (Identity, API access, Core endpoints, Identifiers, Canonical URLs, Known quirks, Quality signals, Fallback sources, Recent changes): research by David via Perplexity, 2026-04-10
- **Known incidents (our vault)** subsections: documented from actual bugs we hit and fixed in the engine/vault. These are institutional knowledge — don't lose them.

**Rule for both Claudes:** check the `Last verified` date on each section. If more than 90 days old, flag for refresh. APIs change.

## Perplexity Research Checklist

All 12 priority pipelines completed 2026-04-10. Refresh quarterly.

- [x] **1. FEC** — completed 2026-04-10
- [x] **2. Congress.gov** — completed 2026-04-10
- [x] **3. Senate LDA** — completed 2026-04-10
- [x] **4. USASpending.gov / SAM.gov** — completed 2026-04-10 (covered together)
- [x] **5. ProPublica Nonprofit Explorer** — completed 2026-04-10
- [x] **6. SEC EDGAR** — completed 2026-04-10
- [x] **7. GovTrack** — completed 2026-04-10
- [x] **8. FARA** — completed 2026-04-10
- [x] **9. GLEIF** — completed 2026-04-10
- [x] **10. DOJ Press** — completed 2026-04-10
- [x] **11. NHTSA** — completed 2026-04-10
- [x] **12. LobbyView** — completed 2026-04-10

**Tier 2 priority** (post-sprint, for future Perplexity sessions):
- [ ] Federal Register
- [ ] CourtListener
- [ ] EPA ECHO
- [ ] OSHA
- [ ] CPSC Recalls
- [ ] FCC Public Files
- [ ] Stock Watcher
- [ ] OFAC SDN
- [ ] OpenSanctions
- [ ] Public Accountability Project
- [ ] Wikipedia / Wikidata

---

## FEC (OpenFEC API)
**Last verified:** 2026-04-10

### Identity
- **What it is:** The OpenFEC API is a RESTful web service built and maintained by the Federal Election Commission (FEC) that exposes federal campaign finance data filed by candidates, committees, and other political filers.
- **What it covers:**
  - **Candidates** — name, office sought, party, state/district, incumbent/challenger status, principal campaign committee linkage; financial totals (receipts, disbursements, cash-on-hand, debt) per cycle
  - **Committees** — all FEC-registered committees (campaign, PAC, party, super PAC, hybrid PAC, inaugural, etc.); organization type, designation, filing frequency, treasurer, address
  - **Individual contributions (Schedule A)** — contributor name, city, state, ZIP, employer, occupation, contribution date, amount, recipient committee; `is_individual` flag; aggregate year-to-date
  - **Disbursements (Schedule B)** — payee, purpose, date, amount, recipient entity type
  - **Independent expenditures (Schedule E)** — spender, candidate targeted, support/oppose flag, amount, date
  - **Loans (Schedule C)**, **Debts (Schedule D)**, **Party coordinated expenditures (Schedule F)**
  - **Filings** — all FEC forms (F1, F2, F3, F3X, F3P, F5, F7, F99, etc.)
  - **Electioneering communications**, **communication costs**
  - **Calendar / election dates**, **audit reports**, **legal resources**
  - **Efiling** — real-time raw electronic filings; only ~4 months of data; unprocessed/uncoded
- **Tier classification:** Primary government record — data originates from mandatory disclosure filings made directly to the FEC.
- **Authoritative?** Yes — this is the definitive source. FEC is the statutory custodian of all federal campaign finance records under FECA (52 U.S.C. § 30101 et seq.). No other source supersedes it for federal disclosure data.
- **Data freshness:** API data is updated nightly. The FEC's own documentation states "data are updated nightly." Newly filed paper or complex filings have an additional processing lag. The efile endpoints (raw electronic filings) update in near real-time. Bulk data dump files vary from daily (electronic filings compilation) to weekly (Schedule A database dump, updated Sunday).
- **Known staleness risk:** Summary financial totals on candidate and committee pages can lag up to 48 hours after a filing is received. The FEC website explicitly warns "Newly filed summary data may not appear for up to 48 hours." Amendment processing introduces the worst lag — an amended filing may coexist with its predecessor in the API until the nightly job reconciles them. Contributor `employer` and `occupation` fields are self-reported and frequently stale (filer has 30 days to follow up; many never do).

---

### API access
- **Base URL:** `https://api.open.fec.gov/v1/`
- **Auth:** API key passed as a query parameter: `?api_key=YOUR_KEY`. No OAuth. The key is appended to every request URL.
- **How to get an API key:**
  - Sign up at: **https://api.data.gov/signup/**
  - Provide first name, last name, email, and intended use. Approval is instant and automated — key is emailed immediately.
  - Cost: Free. No tiers.
  - For a higher-volume key (7,200 calls/hour = 120 calls/minute), email **APIinfo@fec.gov** with a description of your application. There is no formal SLA on response time for these requests.
- **Rate limit:**
  - Standard registered key: **1,000 requests per hour** (rolling window)
  - `DEMO_KEY` (unauthenticated testing): **30 requests/hour per IP, 50/day per IP**
  - Higher-volume key (by request): **7,200 requests/hour (120/minute)**
  - When exceeded: HTTP **429 Too Many Requests** is returned. The block lifts automatically when the rolling window resets. Headers `X-RateLimit-Limit` and `X-RateLimit-Remaining` are returned on every response.
  - No per-second burst limit is documented publicly for standard keys (though the api.data.gov platform recommends that agencies also apply a short-window sub-limit to prevent flooding — ask FEC if you hit mysterious 429s at low volume).
- **Pagination:**
  - **Default endpoints** (candidates, committees, filings, most aggregates): offset-based pagination using `page` (1-indexed) and `per_page` (default 20, max 100). Response includes `pagination.count`, `pagination.pages`, `pagination.page`, `pagination.per_page`.
  - **Schedule A and Schedule B** (itemized transaction endpoints): **keyset pagination** — do NOT use `page` for large result sets. Use `last_index` and `last_contribution_receipt_date` (Sched A) or `last_disbursement_date` (Sched B) returned in `pagination.last_indexes` to fetch the next page. Naive page-number pagination will miss or duplicate records at scale.
  - **Max page size:** 100 results per request across all endpoints.
  - **Total result cap:** The underlying Elasticsearch index enforces a **10,000-record offset limit** for offset pagination. For sets > 10,000 records, you must use keyset pagination on Sched A/B, or break queries into smaller date or amount slices for other endpoints. The API documentation notes that "counts for large result sets are approximate" on the filings endpoint.
- **User-Agent / headers required:** None documented. No special headers are required beyond the `api_key` query parameter. Standard `Accept: application/json` is assumed. No User-Agent requirement is enforced (confirmed: FEC/apify notes "no proxy, CAPTCHA solving, or special headers are required").

---

### Core endpoints (the most commonly used)

| Endpoint | Purpose | Key params | Response shape highlights |
|---|---|---|---|
| `GET /v1/candidates/` | Search/list candidates | `q` (name/ID search), `office` (H/S/P), `state`, `district`, `party`, `election_year`, `cycle`, `candidate_status`, `is_active_candidate`, `has_raised_funds`, `per_page`, `page` | `results[]`: `candidate_id`, `name`, `party`, `office`, `state`, `district`, `incumbent_challenge`, `principal_committees[]`, `cycles[]` |
| `GET /v1/candidate/{candidate_id}/` | Get single candidate (current) | `candidate_id` (path param) | Single candidate object with full profile and linked committees |
| `GET /v1/candidate/{candidate_id}/totals/` | Financial totals per cycle | `cycle`, `election_full` | Receipts, disbursements, cash on hand, debts; one record per cycle |
| `GET /v1/committees/` | Search/list committees | `q`, `committee_type` (H/S/P/Q/O/V/W/X/Y/etc.), `designation` (A/B/D/J/P/U), `state`, `party`, `cycle`, `organization_type`, `treasurer_name` | `results[]`: `committee_id`, `name`, `committee_type`, `designation`, `organization_type`, `state`, `party`, `cycles[]`, `candidate_ids[]` |
| `GET /v1/committee/{committee_id}/` | Get single committee | `committee_id` (path param) | Full committee profile |
| `GET /v1/committee/{committee_id}/totals/` | Financial totals for a committee | `cycle` | Aggregated Form 3/3X/3P summary data per cycle |
| `GET /v1/schedules/schedule_a/` | Individual contributions (itemized receipts) | `committee_id`, `contributor_name`, `contributor_city`, `contributor_state`, `contributor_zip`, `contributor_employer`, `contributor_occupation`, `min_date`, `max_date`, `min_amount`, `max_amount`, `two_year_transaction_period`, `is_individual`, `contributor_type`, `line_number`, `last_index`, `last_contribution_receipt_date`, `per_page`, `sort` | `results[]`: `contributor_name`, `contributor_city`, `contributor_state`, `contributor_zip`, `contributor_employer`, `contributor_occupation`, `contribution_receipt_date`, `contribution_receipt_amount`, `committee_id`, `candidate_id`, `receipt_type`, `memo_text`, `sub_id`; `pagination.last_indexes` for keyset |
| `GET /v1/schedules/schedule_b/` | Disbursements (committee spending) | `committee_id`, `recipient_name`, `disbursement_purpose_category`, `min_date`, `max_date`, `min_amount`, `max_amount`, `two_year_transaction_period`, `last_index`, `last_disbursement_date` | `results[]`: `committee_id`, `recipient_name`, `disbursement_description`, `disbursement_date`, `disbursement_amount`, `sub_id` |
| `GET /v1/schedules/schedule_e/` | Independent expenditures | `committee_id`, `candidate_id`, `support_oppose_indicator` (S/O), `min_date`, `max_date`, `cycle` | `results[]`: `committee_id`, `candidate_id`, `support_oppose_indicator`, `expenditure_amount`, `expenditure_date`, `payee_name`, `expenditure_description` |
| `GET /v1/filings/` | All FEC filings (reports, statements) | `committee_id`, `candidate_id`, `form_type` (F3/F3X/F1/F2/etc.), `min_receipt_date`, `max_receipt_date`, `is_amended`, `primary_general_indicator`, `report_type` | `results[]`: `filing_id`, `file_number`, `form_type`, `committee_id`, `candidate_id`, `receipt_date`, `coverage_start_date`, `coverage_end_date`, `total_receipts`, `total_disbursements`, `document_description`, `pdf_url` |
| `GET /v1/candidates/search/` | Full-text search for candidates | `q` (name string) | Ranked list of candidates matching the search string; use to find `candidate_id` |
| `GET /v1/committees/` with `q=` | Full-text search for committees | `q` (name string) | Ranked list of committees; use to find `committee_id` |
| `GET /v1/schedules/schedule_a/by_employer/` | Aggregate contributions grouped by employer | `committee_id`, `cycle`, `employer` | Employer-level aggregates for a committee's donors |
| `GET /v1/schedules/schedule_a/by_occupation/` | Aggregate contributions grouped by occupation | `committee_id`, `cycle`, `occupation` | Occupation-level aggregates |
| `GET /v1/schedules/schedule_a/by_state/by_candidate/` | State-level contribution totals per candidate | `candidate_id`, `cycle`, `election_full` | Geographic breakdown of contributions |

---

### Identifiers
- **Primary ID (candidates):** `candidate_id` — 9-character alphanumeric. First character indicates office: `H` = House, `S` = Senate, `P` = President. Characters 3–4 are the state postal abbreviation for congressional candidates (`US` for president). Remaining characters are digits. Example: `H8VA01233` (House, Virginia), `P80001571` (Presidential). The ID is **persistent across election cycles** as long as the candidate runs for the same office. Running for a different office creates a new candidate ID.
- **Primary ID (committees):** `committee_id` — 9 characters, always starts with `C` followed by 8 digits. Example: `C00401224` (ActBlue), `C00828541` (Trump 2024). The ID is **permanent** — it never changes for a given committee.
- **Transaction ID (Schedule A/B):** `sub_id` — unique identifier for a single transaction line item. Use `GET /v1/schedules/schedule_a/{sub_id}/` to fetch a specific contribution. Sub IDs are stable references for individual transactions.
- **Filing ID:** `file_number` (integer) — unique per filing event. Every submission, amendment, and notice has a unique file number.
- **Image number:** `image_number` — identifier for the scanned page of a paper filing. Used to link to PDF images.
- **Secondary IDs:** None formally defined, but `contributor_id` appears in some contexts as a cross-reference key for individual contributors — this is not a persistent identifier (FEC does not maintain a canonical contributor registry; the same person may appear under slightly different name spellings across filings).
- **How to look up an entity:**
  1. **By name (candidates):** `GET /v1/candidates/search/?q=LASTNAME+FIRSTNAME` — returns candidate objects with `candidate_id`
  2. **By name (committees):** `GET /v1/committees/?q=COMMITTEE+NAME` — returns committee objects with `committee_id`
  3. **Direct lookup:** `GET /v1/candidate/{candidate_id}/` or `GET /v1/committee/{committee_id}/`
  4. **Via FEC.gov search UI:** https://www.fec.gov/data/candidates/ or https://www.fec.gov/data/committees/ — the URL contains the ID once you click through
- **Known ID gotchas:**
  - A presidential candidate who previously ran for Senate will have **two different candidate IDs** (one `S...`, one `P...`). Obama has `P80003338` as president and older Senate IDs. The API does not link these automatically.
  - A candidate can have **multiple principal campaign committees** across cycles if they dissolve and re-form a committee — each gets a new `committee_id`.
  - Many committees are **unauthorized** relative to a candidate (super PACs, outside groups) but may still carry `candidate_id` references in their filings. This does not mean the candidate controls them.
  - `committee_id` starting with `C00` is the most common pattern for campaign committees, but `C00` is not meaningful — all committee IDs start with `C0`.
  - The candidate-committee linkage file is the authoritative source for `candidate_id` ↔ `committee_id` relationships by cycle; the API surface `/candidate/{candidate_id}/committees/` exposes this.

---

### Canonical URL format (for citing sources on a website)

- **Candidate page:**
  ```
  https://www.fec.gov/data/candidate/{candidate_id}/
  ```
  Example: `https://www.fec.gov/data/candidate/P80001571/` (Trump)

- **Committee page:**
  ```
  https://www.fec.gov/data/committee/{committee_id}/
  ```
  Example: `https://www.fec.gov/data/committee/C00401224/` (ActBlue)

- **Individual contributions search (with filters):**
  ```
  https://www.fec.gov/data/receipts/individual-contributions/?two_year_transaction_period=2024&contributor_name=SMITH
  ```
  The FEC UI generates shareable/bookmarkable URLs with filter state encoded in query params.

- **All candidates search:**
  ```
  https://www.fec.gov/data/candidates/?office=H&state=NY&election_year=2024
  ```

- **All committees search:**
  ```
  https://www.fec.gov/data/committees/?committee_type=O
  ```

- **A specific filing (PDF):**
  ```
  https://docquery.fec.gov/pdf/{image_number}/{image_number}.pdf
  ```
  Or via the filing record's `pdf_url` field returned by the API.

- **Search URL format:** Use `https://www.fec.gov/data/` paths above; the advanced search tab is at `https://www.fec.gov/data/advanced/?tab=api` (for API guidance) or `https://www.fec.gov/data/advanced/?tab=bulk-data` (for bulk downloads).

- **URLs to AVOID citing:**
  - `https://api.open.fec.gov/v1/...` — these are API endpoints, not human-readable pages; they require an API key and return raw JSON
  - `https://docquery.fec.gov/cgi-bin/...` — legacy CGI-based query pages; unstable URL structure, may break
  - Any URL containing `beta.fec.gov` — the beta site has been deprecated and redirects may break
  - URLs containing session tokens or temporary parameters from the FEC UI's internal state
  - Third-party aggregator pages (OpenSecrets, Ballotpedia, etc.) — cite FEC.gov directly for authoritative attribution

---

### Known quirks / gotchas

1. **Amendment duplication in Schedule A/B.** When a committee files an amended report, the old transaction line items may remain in the API alongside the new amended versions until the nightly reconciliation completes. The `is_amended` flag on filings and `amendment_indicator` on transactions help, but filtering for `amendment_indicator=N` (original, not superseded) is not always reliable. For highest accuracy on contribution totals, use the `committee/{committee_id}/totals/` endpoint (pre-aggregated) rather than summing Schedule A raw lines.

2. **Schedule A 10,000-record offset cap.** Offset pagination (`page=`) silently fails or errors once you page past ~10,000 records. Always use keyset pagination (`last_index` + `last_contribution_receipt_date`) for full Schedule A retrieval. This is not documented prominently in the API's own UI.

3. **`two_year_transaction_period` vs. `cycle`.** Schedule A uses `two_year_transaction_period` (an odd-even 2-year period ending in an even year, e.g., 2024 covers Jan 2023–Dec 2024); other endpoints use `cycle` which is the same concept but named differently. Do not conflate the two — the field names differ by endpoint. Failing to pass `two_year_transaction_period` on Schedule A will return data across all cycles, which is very slow and often hits the result cap.

4. **Counts are approximate for large result sets.** The `pagination.count` field on the filings endpoint (and others backed by large Elasticsearch indexes) is an estimate, not an exact count. Do not use it for precise record counts. Page through until results are empty.

5. **Efiling endpoints are raw and incomplete.** `GET /v1/schedules/schedule_a/efile/` returns real-time electronic filings but only for the **most recent ~4 months**, and the data is unprocessed — contributor names/addresses are not standardized, and `candidate_id` may be absent. Do not mix efile and processed data in totals.

6. **`is_individual` field is not perfectly reliable.** The FEC applies a methodology to classify transactions as individual (vs. committee-to-committee), but edge cases exist — joint fundraiser transfers, earmarked contributions, and conduit contributions can be misclassified. The FEC publishes its methodology at https://www.fec.gov/campaign-finance-data/about-campaign-finance-data/about-receipt-data/.

7. **Employer and occupation data quality is poor.** These are self-reported by the contributor to the committee, then transcribed by the committee into FEC filings. Common issues: free-text field with no validation (so "self-employed," "Self Employed," "SELF-EMPLOYED," and "SE" all appear as distinct values); "information requested" / "none" / blank as placeholders; employer names that include abbreviations inconsistent across filings. Do not rely on exact-string matching across years.

8. **Name standardization does not exist.** The FEC does not deduplicate contributor records. The same individual may appear as "JOHN SMITH," "SMITH, JOHN," "JOHN A SMITH," etc. across different filings. There is no canonical contributor ID. Building a contributor graph requires fuzzy matching on name + city + ZIP + employer.

9. **Presidential candidate ID = `P80001571` for Trump** is the 2016-cycle ID and is reused. Confirm the correct ID for each cycle via `candidate/{id}/history/`. Similarly, Hillary Clinton has both a Senate ID (`S0NY00188`) and a Presidential ID (`P00003392`).

10. **DEMO_KEY is throttled heavily.** At 30 requests/hour and 50/day, `DEMO_KEY` is only suitable for manual testing. Any automated script must use a registered key.

11. **Rate limit headers are your only signal.** There is no documented webhook, backpressure queue, or retry-after header beyond the rolling-window reset. Implement exponential backoff on 429 responses.

12. **No `User-Agent` enforcement, but be courteous.** Setting a descriptive `User-Agent` (e.g., `thedonormap.org/1.0`) is good practice and helps FEC staff identify legitimate high-volume users if your IP is flagged.

13. **Legal restriction on use of contributor data.** Under 52 U.S.C. § 30111(a)(4), individual contributor information (name, address, occupation, employer) from FEC reports **may not be used for soliciting contributions or for commercial purposes**. This applies to using it to build or enhance donor prospect lists, even indirectly (e.g., as a model input for fundraising scoring). Research, journalism, and transparency uses are permitted. FEC has issued civil penalties ($16,000 in a 2021 case) for using FEC data in fundraising algorithms. **Displaying donor data for public transparency research (as on thedonormap.org) is permissible** — the restriction is on using it to solicit or target donors.

14. **FEC lost quorum in 2025.** As of late 2025, the FEC had only 2 of 6 commissioners (below the 4 needed for a quorum), meaning enforcement actions and advisory opinions were suspended. This does not affect API availability, but means the FEC could not issue new guidance or take enforcement actions during this period.

15. **FECFile software update (September 2, 2025).** Version 8.5 of the FEC's electronic filing specifications was released, requiring changes to how joint fundraising participants, Form 99 submissions, and loan agreements are reported. This may affect the structure of filings submitted after that date in ways that create inconsistencies with pre-8.5 data in the same API fields.

---

### Quality signals
- **For candidate/committee totals:** Cross-check `candidate/{id}/totals/` against `committee/{committee_id}/totals/` — if they disagree, a filing amendment may be in flight.
- **For Schedule A records:** Check `amendment_indicator` — `N` = original, `A` = amendment, `T` = termination amendment. Prefer `N` records unless you want all versions.
- **For contribution accuracy:** Verify against the source filing PDF via `pdf_url` in the filing record. The filing is the ground truth; API parsing can occasionally introduce encoding artifacts in contributor names (special characters, accents).
- **For employer/occupation:** Treat as categorical signal only, not exact identity. Normalize to uppercase, strip punctuation, collapse common variants before aggregating.
- **Missing amounts:** If `contribution_receipt_amount` is null or negative, the record may be a refund, memo line, or in-kind contribution. Check `receipt_type` and `memo_code`.
- **Approximate totals flag:** If `pagination.count` is much larger than expected for a narrow query, the filter may not be applied correctly. Verify by adding additional constraining parameters.
- **Stale totals:** If a committee's reported totals seem lower than recent news, check the `coverage_end_date` of the most recent filing — the committee may not have filed yet for the most recent period.

---

### Fallback sources
- **Bulk downloads (FEC's own):** https://www.fec.gov/data/browse-data/?tab=bulk-data — full database dumps in CSV/pipe-delimited format, updated daily to weekly. More reliable for full-history analysis than repeated API calls. Schedule A dump updates weekly (Sunday).
- **FEC electronic filings feed (daily ZIP):** https://www.fec.gov/data/browse-data/?tab=bulk-data — "Daily compilation of electronically filed reports and statements" — useful for real-time ingestion.
- **OpenSecrets (opensecrets.org):** Derived from FEC data with additional standardization (employer name normalization, industry coding). Covers congressional and presidential campaigns. API available (separate key). Not authoritative — use as cross-reference only. Data lags FEC by days to weeks.
- **ProPublica Campaign Finance API:** `https://api.propublica.org/campaign-finance/v1/` — FEC-derived, cycle-based. Coverage 1980–present for some entities. Requires ProPublica API key. Note: ProPublica has reduced investment in this API; verify current availability before depending on it.
- **FEC FOIA:** For specific records not available via API (e.g., internal audit documents), submit a FOIA request to FOIA@fec.gov. Response within 20 business days standard.
- **FEC status:** No dedicated status page; monitor `api.open.fec.gov` directly. GitHub issues at https://github.com/fecgov/openFEC/issues sometimes surface API outages.

---

### Recent changes / deprecations

**2025:**
- **FEC lost quorum (April 2025):** Commissioner Dickerson resigned April 30, 2025; Commissioner Trainor resigned October 3, 2025, leaving only 2 commissioners. The agency cannot take enforcement or advisory actions, but data collection and API operations continue. Significant staff attrition (~52 separations in FY2025) may affect processing speed and API maintenance responsiveness.
- **FECFile v8.5 released September 2, 2025:** New electronic filing specifications required for all filings on or after that date. Changes: (1) joint fundraising participants must now include committee name, ID, and type on Form 1/1S; (2) Form 99 must categorize submission type (miscellaneous report, frequency change notice, loan agreement, etc.); (3) loan agreement/forgiveness Form 99 submissions may now attach PDFs up to 150 pages. Filings before September 2025 and after may differ in structure for these form types.
- **FECFile modernization:** FEC received Technology Modernization Fund approval to replace the nearly 30-year-old Windows-only FECFile desktop application. A web-based replacement is in development; no public release date as of early 2026. This is expected to eventually improve data quality at the source.

**2024–2025 (API/data):**
- **Inaugural committee donation tables added (Sprint 27.6, March 2025):** The API and fec.gov data pages now expose donation tables for inaugural committees — a new entity type visible through the standard endpoints.
- **PostgreSQL 15 migration testing (Sprint 27.7, January 2025):** The FEC team is testing migration of the API's database from PostgreSQL to version 15. If completed, this should be transparent to API consumers, but brief maintenance windows are possible.
- **Psycopg3 upgrade (in progress as of March 2025):** The API's database adapter is being upgraded, flagged as a pipeline-blocked item. Potential for brief instability during rollout.
- **Advisory opinion search improvements (Sprint 27.7):** Sort-by-date added to AO search in the legal/citations endpoint.
- **Issue #6091 (January 2025): Possible switch to FullDate type for endpoints** — the FEC team is evaluating changing date field types, which could affect date filtering behavior. No breaking change deployed as of early 2026; monitor.
- **Schedule B load-date filters (Issue #5993, September 2024):** A long-standing feature request to add `load_date` filters to Schedule B remains open as of early 2026 — use `min_date`/`max_date` on `disbursement_date` as the current workaround.

**No formal endpoint deprecations have been announced for 2024–2026.** The `/v1/` prefix remains current. There is no `/v2/` migration underway.

---

### Known incidents (our vault)

**No major incidents to date.** FEC is the vault's most reliable pipeline. Always verify committee/candidate ID matches the entity name before citing — a wrong digit shows a completely different entity.

**Vault convention:** FEC URLs in profiles should always use canonical committee/candidate page format, never complex receipts search URLs (which are unstable and often fail to load).

---

**`/candidates/totals/?sort=-cycle` returns HTTP 422 (fixed 2026-04-11):** `scripts/fec-summary-pipeline.cjs` was requesting the candidates/totals endpoint with `sort=-cycle`, but the FEC API does NOT allow sorting on `cycle`. Valid sort fields on `/candidates/totals/` (per 422 error body verified 2026-04-11):

```
election_year, name, party, party_full, state, office, district,
receipts, disbursements, individual_itemized_contributions,
candidate_id
```

Every fec-summary request was failing with HTTP 422 and returning `null` totals, so every profile silently reported "No financial totals available". **Fix:** use `sort=-election_year` instead (semantically equivalent — election_year increments monotonically with each 2-year cycle).

---

**Vault data bug: Katie Porter's `fec-candidate-id` frontmatter is wrong (flagged 2026-04-11, NOT yet fixed):** Her profile has `fec-candidate-id: H8CA45076`. That ID returns 0 results from both `/candidate/H8CA45076/` and `/candidate/H8CA45076/totals/`. The correct FEC candidate ID for her is **`H8CA45130`** (legal name: "PORTER, KATHERINE", House cycles 2018, 2020, 2022, 2024 — verified via `/candidates/search/?q=Porter&state=CA&office=H`). She also ran for Senate in 2024 under a separate Senate candidate ID starting with `S`.

This is not a pipeline bug — it's a vault frontmatter data error. The fec-summary pipeline is working correctly (trusts the frontmatter ID, queries it, gets 0 results, reports "No financial totals available"). **Action item:** search the vault for other profiles with `fec-candidate-id` values that return 0 on the FEC API and fix them. A one-off `scripts/verify-fec-candidate-ids.cjs` would scan the entire vault and list all mismatches — worth building before cc_07 runs enrich-everything.

## Congress.gov API
**Last verified:** 2026-04-10

### Identity
- **What it is:** The Congress.gov API (v3) is a REST API maintained by the Library of Congress that provides machine-readable access to the legislative data collections housed on Congress.gov.
- **What it covers:** Bills, amendments, bill summaries, bill text, members of Congress, committees, committee reports, committee meetings, committee prints, hearings, nominations, treaties, laws, Congressional Record (daily and bound), CRS reports, House roll call votes, House/Senate communications, Senate communications, and Congress session metadata. Key data fields include member biographical info (name, party, state, district, bioguide ID, photo URL, office address, phone), sponsored/cosponsored legislation, bill status/actions/subjects/titles/text, vote results (by party and by member), committee membership and history, and nomination details.
- **Tier classification:** Official government / primary source
- **Authoritative?** Yes — operated by the Library of Congress, which co-maintains Congress.gov with the Government Publishing Office (GPO). This is the authoritative source for member identifiers (bioguide IDs), bill text, and legislative actions for the modern era (93rd Congress, 1973–present). Pre-1973 data exists but is less complete.
- **Data freshness:** Most collections update at 8:00 a.m. ET daily. Bill text update times vary (depends on GPO publication schedule; Senate bills typically take at least 5 business days after introduction). House roll call votes update on a varying schedule. The Daily Congressional Record is usually available by 10:00 a.m. ET. CRS products update on a varying schedule.
- **Known staleness risk:** Senate bill text can lag 5+ business days behind introduction. Bill `<updateDate>` in the API reflects the date Congress.gov last updated its record — not the legislative action date — so sorting by `updateDate` can be misleading. The `<currentMember>` flag and party fields have had documented inaccuracy bugs (both fixed as of late 2024). Newly appointed/sworn members (e.g., vacancy appointments) may have a gap before their record appears.

---

### API access
- **Base URL:** `https://api.congress.gov/v3/` (also accessible via the alias `https://api.data.gov/congress/v3/`)
- **Auth:** API key passed as a query parameter `?api_key=YOUR_KEY` or as the `X-Api-Key` HTTP header. Both methods are supported.
- **How to get an API key:** Sign up at [https://api.data.gov/signup/](https://api.data.gov/signup/) — the same key infrastructure used by other federal data.gov APIs. Free, no approval process required.
- **Rate limit:** **5,000 requests per hour** per API key (raised from 1,000 in March 2024). The special `DEMO_KEY` (usable without registration) is limited to 30 requests/hour and 50 requests/day per IP address. Rate limit status is returned in response headers `X-RateLimit-Limit` and `X-RateLimit-Remaining`. Exceeding the limit returns HTTP 429.
- **Pagination:** Default page size is 20 results; maximum is 250 (if you request more than 250 only 250 are returned). Use `?limit=250&offset=0` to request up to 250 at a time. The response `pagination` object contains `count` (total items), `next` (URL to next page), and optionally `prev` (URL to previous page when offset > 0). Paginate by incrementing `offset` by the `limit` value.
- **User-Agent / headers required:** No custom `User-Agent` is required. Pass the API key via `X-Api-Key` header or `api_key` query param. Responses are available in JSON (`format=json`) or XML (default or `format=xml`). Specify `format=json` explicitly for all requests to avoid XML parsing overhead.

---

### Core endpoints (the 5-10 most commonly used)

| Endpoint | Purpose | Key params | Response shape highlights |
|---|---|---|---|
| `GET /v3/member` | List all members (current and historical) | `currentMember=true/false`, `limit`, `offset` | `members[]` with `bioguideId`, `name`, `state`, `partyName`, `district`, `terms[]`, `depiction.imageUrl`, `url` |
| `GET /v3/member/{bioguideId}` | Full detail for one member | `bioguideId` (e.g., `L000174`) | `member` with `firstName`, `lastName`, `party`, `state`, `birthYear`, `addressInformation`, `sponsoredLegislation.count`, `cosponsoredLegislation.count`, `currentMember`, `terms[]`, `leadership[]` |
| `GET /v3/member/congress/{congress}` | Members by congress number | `congress` (e.g., `119`), `currentMember`, `state`, `district` | Same shape as list endpoint but scoped to that congress |
| `GET /v3/bill/{congress}/{billType}` | List bills by congress and type | `congress`, `billType` (HR/S/HJRES/SJRES/HCONRES/SCONRES/HRES/SRES), `sort`, `fromDateTime`, `toDateTime` | `bills[]` with `congress`, `type`, `number`, `title`, `latestAction`, `updateDate`, `updateDateIncludingText` |
| `GET /v3/bill/{congress}/{billType}/{billNumber}` | Full bill detail | `congress`, `billType`, `billNumber` | `bill` with `sponsors[]` (bioguideId), `cosponsors.count`, `actions.count`, `subjects`, `policyArea`, `committees`, `laws`, `cboCostEstimates`, `textVersions`, `titles` |
| `GET /v3/member/{bioguideId}/sponsored-legislation` | All legislation sponsored by one member | `bioguideId`, `limit`, `offset` | `sponsoredLegislation[]` with bill type/number/title/congress/latestAction |
| `GET /v3/committee/{chamber}/{systemCode}` | Committee detail and sub-resources | `chamber` (house/senate/joint), `systemCode` (e.g., `hspw00`) | `committee` with `isCurrent`, `subcommittees[]`, `bills.count`, `reports.count`, `history[]` |
| `GET /v3/house-vote/{congress}/{session}/{rollCallVoteNumber}` | House roll call vote detail (beta) | `congress`, `session` (1 or 2), `rollCallVoteNumber` | `houseRollCallVote` with `result`, `voteType`, `votePartyTotal[]` (yea/nay by party), `legislationUrl` |
| `GET /v3/house-vote/{congress}/{session}/{rollCallVoteNumber}/members` | Individual member votes for a roll call | `congress`, `session`, `rollCallVoteNumber` | `results[]` with `bioguideId`, `voteCast` (Aye/Nay/Present/Not Voting), `voteParty`, `voteState` |
| `GET /v3/crsreport/{reportNumber}` | CRS report detail (added March 2025) | `reportNumber` (e.g., `R47001`) | Report with `title`, `publishDate`, `currentVersion`, `author`, `formats[]`, `previousVersions[]` (added Sep 2025) |

**Additional available endpoints (less commonly used):**
`/v3/amendment`, `/v3/congress`, `/v3/law`, `/v3/nomination`, `/v3/treaty`, `/v3/summaries`, `/v3/committee-report`, `/v3/committee-meeting`, `/v3/committee-print`, `/v3/hearing`, `/v3/house-communication`, `/v3/senate-communication`, `/v3/daily-congressional-record`, `/v3/bound-congressional-record`, `/v3/crsreport`

---

### Identifiers
- **Primary ID:** Bioguide ID — format is one uppercase letter followed by 6 digits (e.g., `L000174`, `A000383`). Assigned by the Biographical Directory of the United States Congress. Letters are loosely correlated to last name initial, numbers are sequential within that letter group but not strictly chronological. The full directory lives at [https://bioguide.congress.gov/](https://bioguide.congress.gov/).
- **Secondary IDs:**
  - **THOMAS ID** — legacy ID from the now-defunct THOMAS system. Still present in some external datasets (e.g., the ProPublica Congress API used it). Not exposed in the Congress.gov API responses.
  - **LIS ID (lis_member_id)** — Senate-specific identifier used in Senate roll call vote XML (published at [senate.gov](https://www.senate.gov/about/senator-lookup.xml)). The Congress.gov API uses bioguide IDs for member identification, not LIS IDs. Requires a crosswalk table to map between the two.
  - **Committee system code** — identifies committees and subcommittees (e.g., `hspw00` for House Transportation and Infrastructure full committee; ends in `00` for full committees, other digits for subcommittees).
  - **FEC candidate ID** — not part of the Congress.gov API; maintained by the FEC and needed for donor research cross-referencing.
- **How to look up an entity:**
  - Member by bioguide: `https://api.congress.gov/v3/member/{bioguideId}?format=json&api_key=KEY`
  - Member by current congress + state + district: `https://api.congress.gov/v3/member/congress/119/TX/15?currentMember=true&format=json&api_key=KEY`
  - All current members: `https://api.congress.gov/v3/member?currentMember=true&limit=250&format=json&api_key=KEY`
  - Bioguide search by name: use [https://bioguide.congress.gov/](https://bioguide.congress.gov/) (no API, web only)
- **Known ID gotchas:**
  - **A000383 — Alan Armstrong (appointed Senator from Oklahoma, March 24, 2026):** Armstrong was appointed to fill the seat vacated by Markwayne Mullin, who became DHS Secretary. Because Armstrong is newly appointed with no prior congressional service, his bioguide record is a fresh assignment (A000383). The API bug context for this ID is that **newly appointed mid-Congress members historically have a lag** before their record populates correctly in all Congress.gov API endpoints — particularly the `/member/congress/{congress}` list-level endpoint and the `currentMember=true` filter. In November 2024, a related bug was fixed where pre-118th Congress member district data was inaccurate (Issue #263), and separately the `currentMember=True` filter returned inaccurate results (Issue #269, fixed October 2024). Any donor research database consuming the API around a vacancy appointment date should expect a window where the new member either doesn't appear or appears with incomplete term data.
  - **Bioguide ID reuse/duplicates for name changes:** Women members who changed their surname after marriage historically received two separate bioguide entries. The `unitedstates/congress-legislators` project documents these with a `bioguide_previous` field. The secondary ID was likely removed from bioguide.congress.gov but may still circulate in third-party datasets.
  - **250 triplicate duplicates in member list (Issue #183, fixed ~Feb 2024):** When paginating through the full `/v3/member` list endpoint, 250 members appeared three times each. The `pagination.count` reported 2,518 total but only 2,018 unique members existed. Deduplicate by bioguide ID when consuming the full list. This bug was fixed in early 2024.
  - **Member list limit bug (Issue #212, fixed Nov 2024):** When using `limit=20` on the member endpoint, only 19 results were returned. Fixed November 2024.
  - **Pre-118th Congress member data bug (Issue #263, fixed Nov 2024):** The `/member/congress/{congress}` endpoint returned incorrect data for congresses prior to the 118th. Fixed November 2024.
  - **Congress.gov URL duplicates for certain members (Issue #156, fixed Jan 2024):** Congress.gov URLs were duplicating for certain members in the `/member` endpoint. Fixed January 2024.
  - **`currentMember=True` inaccuracy (Issue #269, fixed Oct 2024):** The `currentMember=True` filter returned inaccurate results. Fixed October 2024.
  - **Party changes not reflected:** The `<party>` field on a member record does not reflect mid-term party changes (e.g., independents who were elected as Democrats/Republicans). Still an open limitation as of April 2026.
  - **Bill number collisions in same congress:** Within a single congress, two bills from different sessions can legitimately share the same number. Congress.gov adds introduction date to their web URLs to disambiguate, but the API does not expose this distinction — you may retrieve one when you expected the other.

---

### Canonical URL format (for citing sources on a website)

- **Primary entity page URL format:**
  - **Member:** `https://www.congress.gov/member/{slug}/{bioguideId}` — e.g., `https://www.congress.gov/member/patrick-leahy/L000174`. The slug is a lowercase hyphenated version of the full name. Only the bioguide ID portion is the stable identifier; the slug can vary or redirect but the bioguide ID in the path is required.
  - **Bill:** `https://www.congress.gov/bill/{ordinal}-congress/{chamber-bill-type}/{number}` — e.g., `https://www.congress.gov/bill/117th-congress/house-bill/3076`. Bill type values: `house-bill` (HR), `senate-bill` (S), `house-joint-resolution` (HJRES), `senate-joint-resolution` (SJRES), `house-concurrent-resolution` (HCONRES), `senate-concurrent-resolution` (SCONRES), `house-resolution` (HRES), `senate-resolution` (SRES).
  - **Committee:** `https://www.congress.gov/committee/{chamber}/{name-slug}`
  - **Bioguide directory entry:** `https://bioguide.congress.gov/search/bio/{bioguideId}` — e.g., `https://bioguide.congress.gov/search/bio/L000174`

- **Search URL format:**
  - Member search: `https://www.congress.gov/search?q={"source":"members","search":"QUERY"}`
  - Bill search: `https://www.congress.gov/search?q={"source":"legislation","search":"QUERY"}`
  - (URL-encode the JSON query string in practice)

- **URLs to AVOID citing:**
  - `https://gpo.congress.gov/...` — old GPO-hosted mirror that was causing incorrect Google search results; a canonical URL fix was deployed in March 2025 (Issue #302). Do not use gpo.congress.gov URLs.
  - `https://bioguideretro.congress.gov/...` — the legacy retro bioguide site. Still functional but the new canonical bioguide URL is `https://bioguide.congress.gov/`. Links using `bioguideretro` should be updated.
  - `https://thomas.loc.gov/...` — THOMAS is permanently offline. Any THOMAS URLs are dead links.
  - Direct API response URLs (`https://api.congress.gov/v3/...`) — machine-readable endpoints, not human-readable citation URLs.

---

### Known quirks / gotchas

1. **A000383 / newly appointed member lag:** When a vacancy occurs mid-Congress and a new member is appointed (as with Alan Armstrong, A000383, appointed 2026-03-24 to fill Markwayne Mullin's Oklahoma Senate seat), the member record may not appear in API responses immediately. The `currentMember=true` filter and the congress-level list endpoint are the most likely places to see stale results. Build a retry/cache-invalidation strategy for vacancy appointment dates.

2. **Triplicate member duplicates (Issue #183):** 250 members appeared three times in the full member list during 2023–early 2024. Always deduplicate by `bioguideId` when iterating the full member list.

3. **Member list under-counts (Issue #212):** `limit=20` on the member endpoint returned 19 results. Use `limit=250` for bulk fetches and validate response count against `pagination.count`.

4. **`currentMember=True` was inaccurate (Issue #269):** The filter returned stale values for some members through most of 2024. Fixed October 2024. Do not rely on historical snapshots from before that date.

5. **`<party>` field does not reflect party changes:** If a member switches parties mid-term, the top-level `<party>` field still shows the party at last record update, not necessarily the party they were elected under.

6. **`<updateDate>` is a Congress.gov metadata date, not an action date:** Do not use `updateDate` to determine when a legislative action occurred. Use `latestAction.actionDate` instead.

7. **Bill 404 vs. 500 confusion (fixed May 2025):** Requesting a non-existent bill used to return HTTP 500 instead of 404. Fixed May 2025. Older error-handling code that catches 500 for "not found" may need to be updated.

8. **Committee name reversion bug (fixed Feb 2025):** Committee names were reverting to older congress-era names. Fixed February 2025. Any committee name data cached before that date may be stale.

9. **House roll call votes are beta and have limited coverage:** The `/house-vote` endpoints were released in May 2025 (beta). Coverage is 118th Congress (2023) to present. Non-legislation votes (e.g., Election of the Speaker) were added in June 2025. There is no Senate roll call vote equivalent in this API — use [senate.gov XML data](https://www.senate.gov/legislative/votes_new.htm) with LIS IDs.

10. **Senate roll call votes use LIS IDs, not bioguide IDs:** Senate roll call vote XML from senate.gov uses `lis_member_id`, not bioguide IDs. A crosswalk is required. The LIS ID list is at [https://www.senate.gov/about/senator-lookup.xml](https://www.senate.gov/about/senator-lookup.xml).

11. **August 2025 infinite redirect outage (Issue #360):** Starting approximately August 22, 2025, all requests to `api.congress.gov/v3` entered an infinite redirect loop (each redirect re-appended `authkey` and `api_key` parameters). New key signups via `api.congress.gov/sign-up/` were also broken. The issue was closed on GitHub but no official Library of Congress statement or root cause was published. Plan for unannounced outages; implement circuit breakers and fall back to GPO bulk data.

12. **Historical bills (pre-93rd Congress / pre-1973):** Metadata is sparse. Bills from the 6th–14th Congresses (1799–1817) were not numbered — the numbers in API URLs for these bills are not authoritative bill numbers. Do not use pre-1973 API data for citation-quality work without cross-checking primary sources.

13. **Bill number collision within a congress:** Two bills with the same number can exist in the same congress (from different sessions). Congress.gov disambiguates with introduction dates in their web URL, but the API does not surface this distinction.

14. **CRS reports added March 2025:** The `/crsreport` and `/crsreport/{reportNumber}` endpoints are new as of March 2025. Not present in any pre-2025 API consumers.

15. **`legislationUrl` element added to bills August 2025:** The `/bill/{congress}/{billType}/{billNumber}` endpoint gained a `<legislationUrl>` element linking to the Congress.gov web page (Issue #268). Useful for generating canonical citation links from API data.

16. **`<previousNames>` container added to member endpoint July 2025:** Useful for tracking members who changed their name during service.

17. **API rate limit was 1,000/hour before March 2024:** Any documentation or code written before March 2024 may reference the old 1,000/hour limit.

---

### Quality signals

- **`<currentMember>` field:** Verify against the official Clerk of the House vacancy list ([https://clerk.house.gov/](https://clerk.house.gov/)) for vacancies within the last 30 days; the flag may lag appointments/resignations.
- **`<updateDate>` vs. `<updateDateIncludingText>`:** If these two dates diverge significantly on a bill record, it means text has been updated but metadata actions haven't — or vice versa. Both fields should be checked when looking for "latest" bill state.
- **`pagination.count` vs. actual unique records:** Always deduplicate by the entity's primary ID (`bioguideId`, bill `number`+`type`+`congress`, etc.) because list endpoints have had duplicate-record bugs historically.
- **`partyName` values in member responses:** Valid values are `"Democratic"`, `"Republican"`, `"Independent"`, `"Independent Democrat"`, `"Libertarian"`. Unexpected values indicate data quality issues.
- **Missing `district` on Senate records:** Senators do not have districts; the field will be absent or null. Validate this when routing member lookups.
- **Photo URLs:** Member photos are at `https://www.congress.gov/img/member/{lowercase-bioguide}_200.jpg`. If the image 404s, the member is either very new or has no official photo on file.
- **HTTP 500 responses:** Prior to May 2025, 500s were returned for non-existent resources. After May 2025, non-existent bills correctly return 404. Treat any 500 as a signal to retry and then alert — do not treat as "not found."
- **Bill sponsor `bioguideId` is the crosswalk key to member records:** Confirm the sponsoring member's `bioguideId` in bill responses matches a valid record in the member endpoint; mismatches indicate data issues.

---

### Fallback sources

| Situation | Fallback |
|---|---|
| Full API outage (as in Aug 2025) | **GPO Bulk Data Repository** ([https://www.govinfo.gov/bulkdata](https://www.govinfo.gov/bulkdata)) — provides bill XML/JSON and Congressional Record data in bulk. Slower but authoritative. |
| Member/legislator data | **unitedstates/congress-legislators** GitHub repo ([https://github.com/unitedstates/congress-legislators](https://github.com/unitedstates/congress-legislators)) — YAML/JSON/CSV updated by a community project, includes bioguide IDs, FEC IDs, and social media handles. Good crosswalk table source. |
| Senate roll call votes | **senate.gov XML** ([https://www.senate.gov/legislative/votes_new.htm](https://www.senate.gov/legislative/votes_new.htm)) — uses LIS IDs, not bioguide IDs. |
| House roll call votes (non-API) | **Clerk of the House** ([https://clerk.house.gov/Votes](https://clerk.house.gov/Votes)) — XML feed, uses bioguide IDs. |
| Member photos | `https://www.congress.gov/img/member/{lowercase-bioguide}_200.jpg` (direct URL, no API call needed) |
| FEC donor–member crosswalk | **FEC API** (`https://api.open.fec.gov/v1/candidates/`) — use FEC candidate ID, which the unitedstates/congress-legislators dataset includes as a crosswalk field. |
| Bioguide lookup (human web) | [https://bioguide.congress.gov/](https://bioguide.congress.gov/) |
| ProPublica Congress API | **Shut down** — no longer available as of 2024/2025. Do not use. |
| GovTrack bulk data/API | **Shut down** — ended in 2017. Do not use. |
| OpenSecrets API | **Discontinued** — do not rely on it. |

---

### Recent changes / deprecations (2024–2026)

**2024**
- **March 2024:** Rate limit raised from 1,000 to **5,000 requests/hour**. (Major change — update any throttling code.)
- **June 2024:** Fixed invalid Clerk roll call vote links for vote numbers 70+ in 118th Congress (bill actions endpoint).
- **July 2024:** Fixed inconsistency in amendment action counts between endpoints.
- **Aug 2024:** Fixed network errors in `/member/congress/{congress}/{stateCode}/{district}`; added `<updateDate>` and `<updateDateIncludingText>` to bill list-level.
- **Sep 2024:** Fixed 14 missing 118th Congress bills; added `<updateDate>` and `<updateDateIncludingText>` to bill list-level.
- **Oct 2024:** Fixed `currentMember=True` inaccuracy across all member endpoints (Issue #269); added `<updateDate>` to committee list-level; fixed House amendments text error.
- **Nov 2024:** Fixed member list limit bug (`limit=20` returning 19 items, Issue #212); fixed pre-118th Congress member data (Issue #263); fixed member district data accuracy (Issue #243).
- **Dec 2024:** Default sort by `<updateDate>` added to daily-congressional-record and committee-report endpoints.

**2025**
- **Jan 2025:** Fixed bill list sort order bug with `sort=updateDate+desc` (Issue #231); added `<updateDate>` element to Congress endpoint; fixed treaty lowercase suffix errors.
- **Feb 2025:** On-behalf-of sponsor data added to bill and amendment endpoints; committee-meeting `fromDateTime`/`toDateTime` filter added; committee name reversion bug fixed.
- **Mar 2025 (major):** **New CRS Reports endpoints** launched (`/crsreport` and `/crsreport/{reportNumber}`) — Issue #19; canonical URL fixed for Google search (gpo.congress.gov redirect resolved, Issue #302).
- **Apr 2025:** Fixed missing/duplicated amendments in list-level amendment endpoint (Issue #321); fixed committee meeting `<title>` showing committee name instead of meeting title (Issue #327).
- **May 2025 (major):** **New House Roll Call Votes endpoints** released in beta (`/house-vote`, `/house-vote/{congress}`, etc.) for 118th–119th Congresses (Issue #64); fixed 500→404 for non-existent bills.
- **Jun 2025:** Added `<textVersions>` container to amendment endpoint (Issue #317); non-legislation votes (Election of the Speaker, etc.) added to House vote endpoints for 2023-present; added `<continuation>` data to committee meetings for multi-day events.
- **Jul 2025:** `<previousNames>` container added to `/member/{bioguideId}` endpoint.
- **Aug 2025 (incident):** **API-wide infinite redirect outage** starting ~Aug 22, 2025. Every request looped infinitely; new key signup also broken. Closed on GitHub without public root cause statement.
- **Aug 2025 (upcoming):** `<legislationUrl>` element to be added to bill detail endpoint (Issue #268); default sort by amendment ID for amendment list endpoint (Issue #228).
- **Sep 2025 (upcoming):** `<version>` on CRS report endpoint to be renamed `<currentVersion>`; `<previousVersions>` container to be added.
- **Oct 2025 (upcoming):** Default sort by congress ID for `/congress` endpoint; optional congress filter for committee endpoints.

**Deprecations / end-of-life**
- **ProPublica Congress API:** Shut down (no new keys, no updates). Do not depend on it.
- **GovTrack bulk data/API:** Shut down 2017.
- **THOMAS system:** Permanently offline. All thomas.loc.gov URLs are dead.
- **gpo.congress.gov URLs:** Canonical URL fix deployed March 2025 — existing gpo.congress.gov links should be updated to www.congress.gov equivalents.
- **HTML "Formatted Text" for entire Daily Congressional Record issues:** Removed from the API response (no HTML available for full issues). Individual section HTML links remain (Jan 2025, Issue #220).

---

### Known incidents (our vault)

**A000383 fuzzy-match bug (fixed 2026-04-10 at engine layer, commit `bc24819`):** The pipeline was accepting `data.members[0]` from a name-only search without state or last-name verification, returning the wrong member for 95 profiles. Vivek Ramaswamy's profile showed Oklahoma data because A000383 (an Oklahoma rep) was fuzzy-matched to his name.

**Engine fix:** `scripts/congress-pipeline.cjs` now REQUIRES `state` match AND last-name verification before accepting a member result. Non-congressional politicians (governors, candidates, cabinet, SCOTUS) are skipped entirely.

**Vault cleanup:** 95 profiles had contaminated `auto:congress-legislation`, `auto:committee-assignments`, and `auto:voting-record` blocks stripped by `scripts/clean-a000383-contamination.cjs` on 2026-04-10. Affected profiles include Ramaswamy, Kash Patel, Marco Rubio, Michael Waltz, Pam Bondi, Rex Tillerson, Russell Vought, Scott Bessent, Amy Coney Barrett, Neil Gorsuch, Kathy Hochul, JB Pritzker, Amy Acton, Josh Green, Janet Mills, Cori Bush, Jamaal Bowman.

**Quality check rule:** Before accepting any `auto:congress-*` block as a Tier 1 source, verify the bioguide-id in the source URL matches the profile's frontmatter `bioguide-id` field. If they diverge, the block is contaminated — strip it and await fresh pipeline run.

---

**`/member?query=` parameter is silently ignored (discovered + fixed 2026-04-11):** The v3 `/member?query=Bernie+Sanders` endpoint returns the same default page of members regardless of the `query` value. Verified against the live API: `?query=Sanders`, `?query=Bernie+Sanders`, and `?query=` (empty) all returned the identical 5-member page starting with Joaquin Castro, Kristen McDonald Rivet, Jason Crow, Alan Armstrong, Markwayne Mullin — none of which are Sanders. The `state=XX` and `stateCode=XX` params are also silently ignored on the `/member` collection endpoint.

**Impact:** Every politician profile WITHOUT a pre-populated `bioguide-id` in frontmatter silently returned "not found" after the 2026-04-10 fix tightened the match rules. The earlier A000383 guard (require state + last-name match) turned a silent wrong-match bug into a silent zero-match bug because the upstream query was returning the wrong pool of candidates to filter.

**Engine fix:** `scripts/congress-pipeline.cjs` now uses `/member/congress/{congressNumber}/{stateCode}` — this IS honored by the API and returns the full state delegation. The pipeline fetches each state delegation once per run (cached by `state-delegation:{congress}:{stateAbbr}` key for CACHE_TTL hours) and matches profiles locally against that list using nickname-aware first-name matching (Bernie↔Bernard, Jim↔James, Bill↔William, etc.). Falls back to `congress - 1` for recently-departed members. The broken `query=name` URL is never constructed.

**Verified working after fix:** Bernie Sanders (Independent, VT, S000033), Lisa Murkowski, Chuck Schumer, Mark Green, Mario Diaz-Balart, Rick Larsen — all found across parties and chambers. A state-delegation fetch costs 1 API call and is cached, so the pipeline is actually *cheaper* than per-profile searches.

**Quality check rule:** If a Congress.gov pipeline run reports "Not found" for more than ~5% of current congressional profiles without an explicit `bioguide-id` override, investigate immediately — it means either the `/member/congress/{N}/{stateCode}` endpoint has been retired, or the `CURRENT_CONGRESS` constant in the pipeline needs bumping (January of odd years).

**Do NOT use on the `/member` collection:** `query`, `state`, `stateCode`, `district`, `party`, or any other filter param you might expect from a REST API. They are accepted without error and silently ignored. Use path parameters instead: `/member/{bioguideId}`, `/member/congress/{N}`, `/member/congress/{N}/{stateCode}`, `/member/congress/{N}/{stateCode}/{district}`.

---

**Committee membership is NOT exposed by the Congress.gov v3 API at all (discovered + worked around 2026-04-11):** Neither `/member/{bioguideId}` nor `/committee/{chamber}/{systemCode}` returns committee member lists. Verified 2026-04-11 against Bernie Sanders (S000033) and the Senate Budget Committee (ssbu00):

- `/member/S000033` returns: `addressInformation`, `bioguideId`, `birthYear`, `cosponsoredLegislation`, `currentMember`, `depiction`, `directOrderName`, `firstName`, `honorificName`, `invertedOrderName`, `lastName`, `nickName`, `officialWebsiteUrl`, `partyHistory`, `previousNames`, `sponsoredLegislation`, `state`, `terms`, `updateDate`. **No `committees` field.**
- `/committee/senate/ssbu00` returns: `bills`, `committeeWebsiteUrl`, `communications`, `history`, `isCurrent`, `nominations`, `reports`, `systemCode`, `type`, `updateDate`. **No `members` field.**

The old `committee-pipeline.cjs` ran a Strategy 3 loop that iterated committees and checked each committee's member list — but since that list is never returned, every politician got 0 assignments after 33 wasted API calls. A stray `"last-enriched": today(),` on a bare line (line 448) compounded the problem by causing a `SyntaxError: Unexpected token ':'` that prevented the pipeline from parsing at all.

**Engine fix:** `scripts/committee-pipeline.cjs`:
- Syntax error fixed (brace placement in the `updates = {}` literal).
- `DEFAULT_CONGRESS = 119` (current, 2025–2027) added so the previously-empty `&congress=` path parameter no longer produces "nullth Congress" URLs. Bump alongside `CURRENT_CONGRESS` in `congress-pipeline.cjs` every January of odd years.
- `fetchCommitteeAssignments()` rewritten to use **GovTrack** as the data source:
  ```
  GET https://www.govtrack.us/api/v2/committee_member?person={govtrack_id}&limit=100
  ```
  GovTrack tracks committee membership with roles (`member`, `chair`, `ranking_member`, `exofficio`) and parent-committee relationships for subcommittees. No API key needed.
- `searchPerson` step before the committee fetch uses the same nickname-aware last-name matching as `govtrack-pipeline.cjs` (Bernie↔Bernard, Jim↔James, …).
- `current` filter is NOT supported on the GovTrack `committee_member` endpoint — passing it returns HTTP 400 `FieldError("Cannot resolve keyword 'current'")`. The endpoint returns only current assignments by default; historical membership lives in a separate endpoint.

**Verified working post-fix:** Bernie Sanders → 5 committees (Environment, Finance, HELP, VA, Budget) + 9 subcommittees, 14 total assignments, 2 API calls (vs. 33 in the broken version).

**Quality check rule:** If a sitting member of Congress shows 0 committees in their auto-block, it's almost certainly a pipeline regression, not reality — every current member serves on at least one committee. Watch for this as a Phase 1 data-quality metric.

## Senate LDA API
**Last verified:** 2026-04-10

### Identity
- **What it is:** The official U.S. Senate Lobbying Disclosure Act (LDA) REST API, operated by the Senate Office of Public Records. It exposes all electronically filed LDA documents as machine-readable JSON.
- **What it covers:**
  - **LD-1** — Lobbying registrations (registrant + client relationship, issue areas, lobbyists named)
  - **LD-2** — Quarterly activity reports (income/expenses, government entities contacted, specific lobbying issues, lobbyist activity)
  - **LD-203** — Semi-annual contribution reports filed by registrants and individual lobbyists under HLOGA § 203 (PAC contributions, FECA donations, honoraria, etc.)
  - Coverage runs from **1999 to present** (~1.9 M filings, ~655 K contribution reports as of April 2026)
- **Tier classification:** Primary / authoritative government source. No intermediary — this is the canonical filing system of record.
- **Authoritative?** Yes. Mandated by the Lobbying Disclosure Act as amended by HLOGA 2007 (2 U.S.C. § 1605). The Senate Office of Public Records is the official custodian.
- **Data freshness:** Filings appear within hours of electronic submission. Quarterly reports are due ~20 days after quarter end (e.g., Q1 due ~April 20). `dt_posted` timestamp on each filing reflects the exact submission time.
- **Known staleness risk:**
  - Filers self-report; income/expense figures are unaudited estimates.
  - Pre-2008 data is sparse and converted from older XML dumps — `dt_posted` timestamps on old records are unreliable (some show dates like "1905-06-24", clearly corrupt legacy data).
  - Amendments can change figures retroactively; always check `filing_type` for `*A*` (amendment) variants.
  - No-activity reports (`*Y` filing types) contain no dollar amounts and no lobbyist activity detail.

---

### API access
- **Base URL:** `https://lda.gov/api/v1/`
  - **Migration note:** The old base URL `https://lda.senate.gov/api/v1/` is **deprecated** and will be **sunset on 2026-06-30**. Both currently serve identical data. Update all hard-coded URLs to `lda.gov` immediately. The old domain displays a "We're Moving!" banner on every page.
- **Auth:** Token-based. Send `Authorization: Token <your_key>` HTTP header. No auth is also accepted (anonymous tier).
- **How to get an API key:** Self-service registration at `https://lda.gov/api/register/`. Fill in name/email/purpose; key is emailed. No approval queue — typically instant. To reset a forgotten password: `https://lda.gov/api/register/` (same page has reset link).
- **Rate limit:**
  | Auth type | Limit |
  |---|---|
  | API key (registered) | **120 requests/minute** |
  | Anonymous | **15 requests/minute** |
  - Exceeding the limit returns **HTTP 429** with a `Retry-After` header.
  - Rate limiting does **not** apply to constants endpoints or HTML/PDF document fetches.
- **Pagination:**
  - Default page size: **25 results**
  - Maximum page size: **25** (requesting `page_size=100` is silently capped at 25)
  - Parameters: `page` (integer, 1-based) and `page_size` (integer, max 25)
  - Response envelope: `{ "count": <total>, "next": "<url|null>", "previous": "<url|null>", "results": [...] }`
  - **Critical constraint:** The `/filings/` and `/contributions/` endpoints require **at least one non-pagination query parameter** to paginate beyond page 1. Sending only `?page=2` with no filter will return an error or page 1 again. Always include at least one filter (e.g., `filing_year=2025`) when paginating these two endpoints.
- **User-Agent / headers required:**
  - No special `User-Agent` is required.
  - For authenticated requests: `Authorization: Token <key>`
  - For JSON responses: `Accept: application/json` (or append `?format=json` to the URL)
  - The API is Django REST Framework; the browsable HTML UI is the default if `Accept` is not set.

---

### Core endpoints (the 5-10 most commonly used)

| Endpoint | Purpose | Key params | Response shape highlights |
|---|---|---|---|
| `GET /api/v1/filings/` | List/search LD-1 registrations and LD-2 quarterly activity reports | `filing_year`, `filing_period` (`first_quarter` \| `second_quarter` \| `third_quarter` \| `fourth_quarter` \| `mid_year` \| `year_end`), `filing_type` (e.g., `Q1`, `Q2`, `Q3`, `Q4`, `RR`), `registrant_id`, `registrant_name`, `client_id`, `client_name`, `lobbyist_id`, `lobbyist_name`, `filing_amount_reported_min/max`, `filing_dt_posted_after/before`, `filing_specific_lobbying_issues` (full-text), `foreign_entity_listed_indicator` (bool), `affiliated_organization_listed_indicator` (bool), `ordering`, `page`, `page_size` | `filing_uuid` (UUID), `filing_type`, `filing_year`, `filing_period`, `income`, `expenses`, nested `registrant` object (with integer `id`), nested `client` object (with integer `id`), `lobbying_activities[]` array (each has `general_issue_code`, `description`, `lobbyists[]`, `government_entities[]`) |
| `GET /api/v1/filings/{filing_uuid}/` | Retrieve a single filing by UUID | Path param: UUID string | Full filing object including all nested arrays (`lobbying_activities`, `foreign_entities`, `affiliated_organizations`, `conviction_disclosures`) |
| `GET /api/v1/contributions/` | List/search LD-203 contribution reports | `filing_year`, `filing_period` (`mid_year` \| `year_end`), `filing_type` (`MM`, `MA`, `YY`, `YA`), `registrant_id`, `registrant_name`, `lobbyist_id`, `lobbyist_name`, `lobbyist_exclude` (bool — exclude lobbyist-filed reports, keep only registrant-filed), `contribution_date_after/before`, `contribution_amount_min/max`, `contribution_type` (`feca`\|`he`\|`me`\|`ple`\|`pic`), `contribution_contributor`, `contribution_payee`, `contribution_honoree`, `filing_dt_posted_after/before`, `page`, `page_size` | `filing_uuid`, `filer_type` (`registrant` or `lobbyist`), nested `registrant`, nested `lobbyist` (name fields only — no address), `no_contributions` (bool), `pacs[]` (list of PAC name strings), `contribution_items[]` array (each: `contribution_type`, `contributor_name`, `payee_name`, `honoree_name`, `amount`, `date`) |
| `GET /api/v1/contributions/{filing_uuid}/` | Retrieve a single contribution report | Path param: UUID string | Full contribution report with all `contribution_items[]` |
| `GET /api/v1/registrants/` | List/search lobbying registrant firms | `id`, `registrant_name`, `state`, `country`, `ppb_country`, `dt_updated_after/before`, `ordering`, `page`, `page_size` | Integer `id`, `house_registrant_id`, `name`, address fields, `contact_name`, `contact_telephone`, `dt_updated` |
| `GET /api/v1/registrants/{id}/` | Retrieve a single registrant by integer ID | Path param: integer | Full registrant object |
| `GET /api/v1/clients/` | List/search clients (the entities being lobbied on behalf of) | `id`, `client_name`, `client_state`, `client_country`, `client_ppb_state`, `client_ppb_country`, `registrant_id`, `registrant_name`, `ordering`, `page`, `page_size` | Integer `id` (= `client_id`), `name`, `general_description`, `client_government_entity` (bool), `client_self_select` (bool), nested `registrant` object |
| `GET /api/v1/lobbyists/` | List/search individual lobbyists | `id`, `lobbyist_name`, `registrant_id`, `registrant_name`, `ordering`, `page`, `page_size` | Integer `id`, `first_name`, `last_name`, `middle_name`, `nickname`, `prefix`, `suffix`, nested `registrant` object |
| `GET /api/v1/constants/filing/lobbyingactivityissues/` | Reference list of all 79 LDA issue area codes | None | Array of `{ "value": "HCR", "display": "Health Issues" }` objects — use `value` in filing filters |
| `GET /api/v1/constants/filing/governmententities/` | Reference list of all contactable government entities | None | Array of `{ "id": 1, "name": "SENATE" }` — use to decode `government_entities[]` in filing responses |

**Advanced text search syntax** (applies to `registrant_name`, `client_name`, `lobbyist_name`, `filing_specific_lobbying_issues`, etc.):
- Unquoted terms: OR between words (`drug alcohol` → drug OR alcohol)
- `"quoted phrase"`: exact phrase match
- `OR`: explicit OR operator
- `-term`: NOT operator (exclude term)

---

### Identifiers

- **Primary ID (filings & contributions):** `filing_uuid` — a UUID v4 string, e.g., `455edc06-55d1-41ed-878e-70a4040f953c`. This is the canonical identifier for any individual filing. Present on both LD-1/LD-2 filings and LD-203 contribution reports. Use this for deduplication and linking.
- **Primary ID (registrants):** `id` — a plain integer, e.g., `9181`. Also has `house_registrant_id` (integer), which is the House system's parallel ID for the same registrant. The two IDs do not match.
- **Primary ID (clients):** `id` integer (= `client_id` — these two fields are always identical in the API). Clients are scoped to a registrant: the same real-world company lobbied by two different registrants appears as two separate client records with different `id` values.
- **Primary ID (lobbyists):** `id` — plain integer. Lobbyists are similarly scoped to a registrant; the same human appearing at two firms will have two separate integer IDs.
- **Secondary IDs:**
  - `house_registrant_id` on registrants — parallel ID in the House electronic filing system (lobbyingdisclosure.house.gov)
  - `registrant_id` filter parameter maps to `registrant.id` (Senate integer)
  - `filing_document_url` — URL to the human-readable PDF or HTML version of the filing document: `https://lda.gov/filings/public/filing/{filing_uuid}/print/` (LD-1/LD-2) or `https://lda.gov/filings/public/contribution/{filing_uuid}/print/` (LD-203)
- **How to look up an entity:**
  - By name: `GET /api/v1/registrants/?registrant_name=Akin+Gump` (partial/fuzzy text search)
  - By client: `GET /api/v1/clients/?client_name=Boeing`
  - By lobbyist: `GET /api/v1/lobbyists/?lobbyist_name=Smith`
  - Cross-reference: `GET /api/v1/filings/?registrant_id=9181&filing_year=2025`
- **Known ID gotchas:**
  - **Clients and lobbyists have no stable global identifier across registrants.** If Boeing is lobbied by both Akin Gump and Covington & Burling, it appears as two separate `client` records with different integer IDs. There is no master entity ID that unifies them. Matching requires fuzzy name normalization.
  - **Lobbyists likewise have no global ID.** A person who moves from one firm to another gets a new `lobbyist.id` at the new firm. Name deduplication across firms requires manual or probabilistic matching.
  - **`registrant.id` is stable**, but `house_registrant_id` may be `null` for some registrants (especially older/inactive ones).
  - **`client_id` = `id`** — the API exposes both fields on client objects but they are always identical. Don't be confused by the apparent redundancy.
  - Some legacy filings have `dt_posted` values in implausible years (1905, 1940) — these are data corruption artifacts from the pre-2008 XML migration, not actual filing dates.

---

### Canonical URL format (for citing sources on a website)

- **Primary entity page URL format:**
  - Filing detail (human-readable): `https://lda.gov/filings/public/filing/{filing_uuid}/print/`
  - Contribution report (human-readable): `https://lda.gov/filings/public/contribution/{filing_uuid}/print/`
  - Filing API resource: `https://lda.gov/api/v1/filings/{filing_uuid}/`
  - Registrant API resource: `https://lda.gov/api/v1/registrants/{id}/`
  - Client API resource: `https://lda.gov/api/v1/clients/{id}/`
  - Lobbyist API resource: `https://lda.gov/api/v1/lobbyists/{id}/`

- **Search URL format (for citing a filtered search):**
  - `https://lda.gov/filings/public/filing/search/?registrant=Akin+Gump&report_year=2025`
  - `https://lda.gov/filings/public/contribution/search/` (LD-203 search)

- **URLs to AVOID citing:**
  - **Do NOT use `lda.senate.gov` URLs** in any public-facing links or stored records. This domain will go dark on 2026-06-30. Any URL like `https://lda.senate.gov/filings/public/filing/{uuid}/print/` will break. Replace with the `lda.gov` equivalent.
  - **Do NOT cite API URLs** (`/api/v1/...`) as human-facing source links on thedonormap.org — they return raw JSON or the DRF browsable interface. Use the `/filings/public/filing/{uuid}/print/` HTML URLs instead.
  - **Do NOT cite** `lda.congress.gov` — that is the e-filing submission portal for registrants, not the public disclosure search system.

---

### Known quirks / gotchas

1. **Domain migration deadline — hard cutoff June 30, 2026.** `lda.senate.gov` will go offline. Every stored URL, every hard-coded base URL, every link in thedonormap.org must be migrated to `lda.gov` before that date.

2. **Filings and contributions endpoints require at least one filter to paginate past page 1.** Sending `GET /api/v1/filings/?page=2` with no other parameters will not work correctly. Always include a substantive filter (e.g., `filing_year=2025`) when iterating through large result sets.

3. **`page_size` is hard-capped at 25.** Requesting `page_size=100` silently returns 25. There is no way to get more than 25 records per request. For a full-dataset pull, you must iterate all pages.

4. **Clients and lobbyists are not globally deduplicated.** The same real-world entity (person or company) appears under multiple integer IDs if they appear with multiple registrant firms. Building a clean entity graph requires fuzzy name matching and cross-referencing.

5. **No-activity filings contain almost no data.** Filing types ending in `Y` (e.g., `Q1Y`, `RRY`, `MMY`) are "no activity" reports. They will have `income: null`, `expenses: null`, and empty or minimal `lobbying_activities`. Don't treat a null income as zero — it means "no reportable activity this period," which is different from $0.

6. **Amendment filings (`*A*` types) update but do not replace originals.** Both the original and the amendment exist in the API with different `filing_uuid` values. If you display the most recent version of a filing, filter for the latest by `dt_posted` within the same `filing_year` + `filing_period` + `registrant_id` + `client_id` combination.

7. **`income` vs `expenses` are mutually exclusive.** Registrant firms (hired lobbyists) report `income`; in-house lobbyists report `expenses`. A filing will have one or the other, not both. Check `expenses_method` (`lump_sum`, `estimate`, `undetermined`) for in-house filers.

8. **Contribution `filer_type`** can be `"registrant"` or `"lobbyist"`. Use `lobbyist_exclude=true` to restrict to registrant-level LD-203 filings. Lobbyist-level filings have an individual `lobbyist` object; registrant-level filings have `lobbyist: null`.

9. **`general_issue_code` is a short code string** (e.g., `"HCR"` for Health Issues), not a readable label. Always decode using `GET /api/v1/constants/filing/lobbyingactivityissues/` — cache this response; it is static.

10. **Text search is not case-sensitive** but is **prefix-sensitive** for some fields. `registrant_name=akin` will match "AKIN GUMP"; `registrant_name=gump` may not. Test both directions when searching by partial name.

11. **The OpenAPI spec at `https://lda.gov/api/openapi/v1/`** has a YAML parsing error that breaks the ReDoc UI (`https://lda.gov/api/redoc/v1/`). The spec content is valid and machine-readable but the ReDoc renderer fails. Fetch the raw spec directly if you need the schema programmatically.

12. **Pre-2008 data quality is poor.** The LDA electronic filing requirement was phased in from 1999–2007. Filings from this era were converted from XML dumps; expect missing fields, garbled `dt_posted` timestamps, and inconsistent formatting.

13. **Foreign entity and affiliated organization data** can be empty arrays even on filings where such entities exist, if the filer left those sections blank. Treat as "not disclosed" rather than "confirmed absent."

---

### Quality signals

- **Good data indicators:**
  - `filing_uuid` present and in valid UUID format
  - `dt_posted` in a plausible year (2000–present)
  - `income` or `expenses` is a non-null decimal string
  - `lobbying_activities` array is non-empty with at least one `general_issue_code`
  - `registrant.id` is a small-to-medium integer (not an 8-9 digit number, which indicates a legacy data artifact)

- **Bad data / red flags:**
  - `dt_posted` year is pre-1999 or clearly wrong (1905, 1940) → legacy migration artifact
  - `income` and `expenses` both null → no-activity filing or pre-electronic era
  - `registrant.name` = "UNDETERMINED" or address city = "UNDETERMINED" → incomplete legacy record
  - `filing_type` ends in `Y` → no-activity report, minimal content
  - `filing_type` contains `A` → amendment; check for a more recent version
  - `house_registrant_id` is null → registrant may not have completed House registration or is very old
  - Duplicate `filing_uuid` values in your database → should never happen; if it does, the API returned a corrupted response

- **Detecting amendments:** Sort filings by `dt_posted` descending within `(filing_year, filing_period, registrant_id, client_id)`. The latest `dt_posted` is the operative version. Flag earlier filings as superseded.

---

### Fallback sources

If the LDA API is down or returning errors:
1. **Bulk XML/CSV downloads** — `https://lda.gov/filings/` offers annual bulk download files (XML format) for all years. Slower but complete. Good for initial database seeding.
2. **OpenSecrets (opensecrets.org)** — mirrors and normalizes LDA data with entity deduplication. Not authoritative but useful for validation and cross-referencing. Updated with a lag.
3. **ProPublica Lobbying Database** — aggregated LDA data with a public API (`https://projects.propublica.org/api-docs/lobbying/`). Also not authoritative; good for spot-checks.
4. **Senate SOPR direct contact** — Senate Office of Public Records: (202) 224-0758. For missing or corrupted filings.
5. **lobbyingdisclosure.house.gov** — House Clerk's parallel system. Covers the same filings from the House side; use `house_registrant_id` to cross-reference.

---

### Recent changes / deprecations

- **2025 (announced, effective 2026-06-30): Domain migration from `lda.senate.gov` to `lda.gov`.**
  - The new domain `lda.gov` is already live and serving all the same data.
  - `lda.senate.gov` will be decommissioned on **June 30, 2026**.
  - Both domains currently return identical data. The old domain displays a "We're Moving!" banner.
  - The OpenAPI spec at `https://lda.gov/api/openapi/v1/` still lists `lda.senate.gov` as the base URL in its server block — this is a documentation bug. Use `lda.gov`.
  - Action required: update all hardcoded URLs, stored filing document links, and citation URLs before June 30, 2026.

- **2025: Pending legislative changes (not yet enacted as of April 2026).**
  - The **Disclosing Foreign Influence in Lobbying Act** (S. 856) passed the Senate in late 2025 but has not passed the House. If enacted, it would require registrants to disclose foreign government entities that "participate in the direction, planning, supervision, or control" of lobbying activities — expanding the `foreign_entities` field.
  - The **Lobbying Disclosure Improvement Act** (S. 865) also passed the Senate. If enacted, all LDA registrants would be required to indicate whether they are registering under the LDA to satisfy a FARA obligation — a new boolean field would likely appear in the API.
  - Neither bill has House cosponsors or received a markup as of April 2026. Monitor for API schema changes if either passes.

- **2019-08-22: Current TOS last modified date.** The Terms of Service on both domains reflects this date. Rate limits (120/min authenticated, 15/min anonymous) have not changed since at least 2019.

- **~2022: API v1 launch.** The current REST API (`/api/v1/`) replaced an older download-only system. The v1 API is the only active version; there is no v2 in any public documentation.

- **Pre-2008 data: legacy XML migration.** All filings predating the electronic filing mandate were converted from older XML bulk files. These are the source of the data quality issues described above (corrupt timestamps, missing fields). No further changes to this historical data are expected.

---

### Known incidents (our vault)

**Domain migration lda.senate.gov to lda.gov (mid-2025):** Old URLs break. Archive on sight, use new domain URLs.

**Redirect file enrichment bug (fixed 2026-04-10 at engine layer, commit `d1ceb91`):** The pipeline was enriching redirect files (files tagged with `#redirect`) with full LDA data, showing fabricated lobbying totals on Jeff Yass's redirect file (among 6 affected redirects). The `isRedirectProfile()` helper in `scripts/lib/shared.cjs` now detects `#redirect` tag, `(Redirect)` title, `redirect: true` frontmatter, or "this file is a redirect" body text — pipelines skip these.

**Vault cleanup:** 6 redirect files cleaned of bogus LDA auto-blocks on 2026-04-10: Jeff Yass, Blackstone, Google, Meta, Raytheon, Meta Facebook Political Operation.

## USASpending.gov / SAM.gov
**Last verified:** 2026-04-10

---

### Identity
- **What it is:** Two complementary federal systems operated by the U.S. government.
  - **SAM.gov (System for Award Management)** — operated by GSA; the authoritative registry of every entity (company, nonprofit, individual) that does business with the federal government. Assigns Unique Entity Identifiers (UEIs), stores registration data, publishes exclusions (debarments/suspensions), and as of March 2025 hosts subaward reporting (formerly FSRS).
  - **USASpending.gov** — operated by Treasury's Bureau of the Fiscal Service; the public-facing database of all federal awards (contracts, grants, loans, direct payments, IDVs) mandated by FFATA and the DATA Act. Pulls entity/recipient data from SAM.
- **What it covers:**
  - SAM: entity registration, UEI issuance, active/expired status, CAGE codes, exclusions list, reps & certs, responsibility/qualification (past proceedings), subaward reporting
  - USASpending: prime award transactions and summaries going back to FY2001 (contracts) and FY2008 (assistance), subaward data, agency budgets, disaster/emergency spending (DEFC codes), account-level data (File C)
- **Tier classification:** Tier 1 — primary government source for both entity identity (SAM) and federal spending (USASpending)
- **Authoritative?** Yes — SAM is the authoritative source for UEIs, CAGE codes, and exclusion status. USASpending is the authoritative aggregation point for award data (though it is downstream of agency source systems like FPDS-NG for contracts and G-Invoicing for grants).
- **Data freshness:**
  - SAM: entity registrations updated in near-real-time; exclusions typically posted within 1–2 business days of agency action
  - USASpending: award data refreshed daily; account-level data (File C) submitted monthly by agencies
- **Known staleness risk:**
  - USASpending is only as current as agency submissions — agencies that are late or incorrect in reporting will have stale/missing data. Historical assistance award data (pre-DATA Act, i.e., before FY2017 Q2) is particularly incomplete.
  - SAM registrations expire annually; a registered entity with an expired registration still has a UEI and still appears in the system, but its `registrationStatus` will show `E` (Expired). Award recipients are not required to maintain active SAM registrations after award, so their data may lag.
  - Subaward data (moved from FSRS to SAM.gov in March 2025) can have significant duplication — prime recipients often re-report all subawards for a period rather than only new ones.

---

### API access (USASpending)
- **Base URL:** `https://api.usaspending.gov/api/v2/`
- **Auth:** None required. No API key, no registration, no token. All endpoints are fully open. ([Source](https://api.usaspending.gov/docs/endpoints))
- **Rate limit:** **1,000 requests per any 300-second (5-minute) rolling window** (i.e., ~200 req/min sustained). This is enforced per IP. Exceeding it produces intermittent 500 errors or connection drops rather than a clean 429. Bulk download endpoints (`/bulk_download/`, `/download/`) are resource-intensive; concurrent large downloads from the same IP frequently time out even under the rate limit. ([Source](https://onevoicecrm.my.site.com/usaspending/s/question/0D5eq00001AwRpCCAV/api-rate-limitation))
- **Pagination:**
  - GET endpoints: use query params like `?page=1&limit=100`
  - POST endpoints (`/search/spending_by_award/`, etc.): pass `"page"` and `"limit"` (or `"size"`) in JSON body
  - Default page size varies by endpoint; `"limit": 100` is common for search endpoints
  - Advanced Search caps at **10,000 records** via the API; use bulk download endpoints for larger sets
  - Advanced Search downloads cap at **500,000 records** per request; split by time period or filter if needed

---

### API access (SAM.gov Entity Management)
- **Base URL:** `https://api.sam.gov/entity-information/v4/entities` (current recommended version as of Dec 2024) ([Source](https://open.gsa.gov/api/entity-api/))
  - Previous versions v1–v3 still available but v4 is the latest
  - Alpha/sandbox: `https://api-alpha.sam.gov/entity-information/v4/entities`
- **Auth:** API key required. Pass as query param `?api_key=YOUR_KEY` or HTTP header `X-Api-Key: YOUR_KEY`.
  - Public data: personal API key (free)
  - FOUO (For Official Use Only) data: system account with "Read FOUO" permission
  - Sensitive data: system account with "Read Sensitive" permission; POST required with Basic Auth header (`Authorization: Basic base64(username:password)`)
- **How to get an API key:**
  1. Create an account at [SAM.gov](https://sam.gov)
  2. Go to your profile → **Profile/Details page** → find the **"Public API Key"** field
  3. For system accounts: use the **System Accounts** widget in your workspace
  - URL: `https://sam.gov/profile/details` ([Source](https://open.gsa.gov/api/entity-api/))
- **Rate limit:**

| Account type | Key type | Daily limit |
|---|---|---|
| Non-federal, no SAM role | Personal | 10 req/day |
| Non-federal, has SAM role | Personal | 1,000 req/day |
| Federal user | Personal | 1,000 req/day |
| Non-federal system account | System | 1,000 req/day |
| Federal system account | System | 10,000 req/day |

  For the **donor research use case at thedonormap.org**: register a SAM account and get a role assigned to reach 1,000/day. For bulk needs, use the asynchronous Extract API (returns a downloadable file link) which can return up to **1,000,000 records** per request.

- **Pagination:**
  - Synchronous API: 10 records per page (default); max `size=10` per page; `page` param is 0-indexed; max 10,000 total records accessible
  - Params: `page=0&size=10`
  - Response includes `links.selfLink` and (when applicable) `links.nextLink`
  - For more than 10,000 records: use the **Extract API** by adding `&format=json` or `&format=csv` to the same endpoint URL — this triggers an async job that returns a download link

---

### Core endpoints (the 5–10 most commonly used across both)

| Endpoint | API | Purpose | Key params | Response shape highlights |
|---|---|---|---|---|
| `POST /api/v2/search/spending_by_award/` | USASpending | Search prime awards by any combination of filters | `filters` (award_type_codes, time_period, recipient_uei, recipient_name, agencies, place_of_performance_locations, award_amounts, keywords); `fields`; `page`; `limit`; `sort`; `order` | `results[]` with requested fields; `page_metadata` with `count`, `page`, `has_next_page` |
| `GET /api/v2/awards/<AWARD_ID>/` | USASpending | Fetch full detail for a single award | `<AWARD_ID>` is the generated internal key (e.g., `CONT_AWD_...` or `ASST_AWD_...`) | Full award object: recipient, agency, amounts, dates, NAICS, PSC, place of performance |
| `GET /api/v2/recipient/<HASH_VALUE>/` | USASpending | Recipient profile overview | `<HASH_VALUE>` is a UUID-like hash (not UEI); retrieve from `/autocomplete/recipient/` or `/recipient/` POST | `name`, `uei`, `total_transaction_amount`, `total_transactions`, `location`, `business_types` |
| `POST /api/v2/recipient/` | USASpending | Search/list recipients | `keyword`, `award_type`, `filters` | Paginated list of recipients with name, UEI, hash, amounts |
| `GET /api/v2/recipient/children/<UEI_OR_DUNS>/` | USASpending | Get child entities under a parent recipient UEI | `<UEI_OR_DUNS>` | Array of child recipient objects with name, UEI, location |
| `POST /api/v2/bulk_download/awards/` | USASpending | Async bulk download of awards as CSV/ZIP | `filters` (same as spending_by_award); `columns`; `file_format` | Returns `file_url` and `status` — poll `/bulk_download/status/` |
| `GET https://api.sam.gov/entity-information/v4/entities` | SAM.gov | Search entities by UEI, CAGE, name, address, etc. | `ueiSAM`, `cageCode`, `legalBusinessName`, `registrationStatus`, `includeSections`, `api_key` | JSON with `entityData[]`, `totalRecords`, `links` |
| `GET https://api.sam.gov/entity-information/v4/exclusions` | SAM.gov | Search active exclusions (debarments/suspensions) | `ueiSAM`, `cageCode`, `exclusionName`, `classification` (Firm/Individual), `stateProvince`, `country`, `api_key` | `totalRecords`, `excludedEntity[]` with `exclusionDetails`, `exclusionIdentification`, `exclusionActions` |
| `GET https://api.sam.gov/entity-information/v4/entities?format=json` | SAM.gov (Extract) | Async bulk extract of up to 1M entity records | `format=json` or `format=csv` plus any filter params + `api_key` | Async: response contains a download token/URL; fetch file from `/download-entities?token=...` |
| `POST /api/v2/autocomplete/recipient/` | USASpending | Autocomplete/search recipient names and UEIs | `search_text`, `limit` | `results[]` with `recipient_name`, `uei` |

---

### Identifiers
- **Primary ID:** **UEI (Unique Entity Identifier)** — 12-character alphanumeric, case-insensitive, assigned by SAM.gov.
  - Format rules ([GSA UEI spec](https://www.gsa.gov/about-us/organization/federal-acquisition-service/fas-initiatives/integrated-award-environment/iae-systems-information-kit/uei-technical-specifications-and-api-information)):
    - Exactly 12 characters, alphanumeric
    - Letters `O` and `I` are excluded (to avoid confusion with `0` and `1`)
    - First character is never `0` (to prevent spreadsheet truncation)
    - No 9-digit sequences (avoids collision with DUNS or TIN)
    - First 5 characters are structured to avoid collision with CAGE codes
    - Final character is a checksum of the first 11
    - Example: `RV56IG5JM6G9`
  - In SAM API: field name is `ueiSAM`
  - In USASpending API/downloads: field names are `recipient_uei` and `recipient_parent_uei`
  - Became the sole official entity identifier on **April 4, 2022** (replacing DUNS)

- **Secondary IDs:**
  - **CAGE Code** (Commercial and Government Entity Code) — 5-character alphanumeric, issued by DLA (Defense Logistics Agency). Required for DoD contracting. Non-US entities use NCAGE. Field: `cageCode`.
  - **DUNS Number** — 9-digit numeric, formerly issued by Dun & Bradstreet. **Officially retired April 4, 2022.** Still appears in historical USASpending records for awards before the transition. SAM API field `ueiDUNS` was removed in v3 (April 2022). Field name in old USASpending downloads: `recipient_duns`.
  - **EIN/TIN** (Employer Identification Number / Taxpayer Identification Number) — 9-digit IRS identifier. Used in SAM registration for US entities. Not exposed publicly via API; used for IRS validation only.
  - **DoDAAC** (Department of Defense Activity Address Code) — 9-character alphanumeric for DoD entities. Field: `dodaac`.
  - **USASpending Recipient Hash** — an internal UUID-like hash used in USASpending to uniquely identify a recipient profile. Not the same as UEI. Used in the URL `/recipient/<HASH_VALUE>/`. Retrieve it by searching `/recipient/` or `/autocomplete/recipient/`.
  - **PIID** (Procurement Instrument Identifier) — the contract/award number for procurement awards. Format defined in FAR 4.16.
  - **FAIN** (Federal Award Identification Number) — the award ID for financial assistance (grants/loans). Format set by awarding agency.
  - **USASpending Award ID** — internal generated key. Format: `CONT_AWD_<PIID>_<AGENCY>` (contracts) or `ASST_AWD_<FAIN>_<AGENCY>` (assistance).

- **How to look up an entity:**
  1. **By UEI:** `GET https://api.sam.gov/entity-information/v4/entities?ueiSAM=<UEI>&api_key=<KEY>`
  2. **By CAGE code:** `GET https://api.sam.gov/entity-information/v4/entities?cageCode=<CAGE>&api_key=<KEY>`
  3. **By name:** `GET https://api.sam.gov/entity-information/v4/entities?legalBusinessName=<NAME>&api_key=<KEY>` (fuzzy matching; exact name required for best results)
  4. **On USASpending by UEI:** `POST /api/v2/search/spending_by_award/` with `"recipient_uei": ["<UEI>"]` in filters, or use `/autocomplete/recipient/` with the UEI as search text
  5. **On SAM.gov website:** `https://sam.gov/search/?index=ei&page=1&sort=-score&sfm[sfm_status][0]=status:Active&sfm[sfm_status][1]=status:Inactive&keywords=<UEI_or_name>`

- **Known ID gotchas:**
  - **DUNS → UEI transition (April 4, 2022):** DUNS was completely replaced. SAM API v1/v2 returned DUNS via `ueiDUNS`; v3+ returns blanks for that field. In USASpending, pre-April 2022 award records have `recipient_duns` populated but `recipient_uei` null. Post-April 2022 records have `recipient_uei` and null DUNS. The GitHub issue [#3847](https://github.com/fedspendingtransparency/usaspending-api/issues/3847) (opened June 2023, still open as of this writing) documents that `spending_by_award` and `spending_by_transaction` endpoints do not yet support `recipient_uei` as a requestable field (only `Recipient DUNS Number` is in the field list), even though UEI is the current standard.
  - **QVT false-positive issue:** "QVT" in the SAM.gov exclusion screening context refers to broad-match false positives when searching common names without unique identifiers. SAM.gov's exclusion search uses name-matching that returns all records containing the search string — searching "John Smith" returns multiple unrelated exclusion records. The official guidance is to **always cross-check using unique identifiers** (UEI, CAGE/NCAGE, NPI, SSN/EIN) rather than name alone, and to document negative determinations. Third-party compliance vendors call this a "QVT" (Qualifications Vetting Tool) false positive. The SAM Exclusions API v4 (`/entity-information/v4/exclusions`) supports lookup by `ueiSAM` and `cageCode` directly to reduce false matches. There is no known named software bug by the acronym "QVT" in SAM.gov's own documentation; the term originates from commercial compliance software that screens against SAM.
  - **EVS (Entity Validation Service) false negatives:** In April 2022, GSA switched its Entity Validation Service provider. Legitimate businesses can fail validation if their name/address doesn't match the new EVS's authoritative sources (Secretary of State filings, USPS, utility records). Common triggers: suite number stripping causing "duplicate entity" flags, punctuation mismatches (`&` vs `and`), DBA names vs legal names, and new businesses whose Secretary of State records haven't propagated to the EVS database yet (typically a 2–4 week lag).
  - **One UEI per legal entity:** SAM enforces a strict one-UEI-per-(name + physical address) rule. Subsidiaries or divisions at different physical addresses get different UEIs. This creates parent/child hierarchies in both SAM and USASpending.
  - **DUNS+4 / EFT Indicator:** The old "DUNS+4" field is now called "EFT Indicator" in SAM. It is a separate 4-character field from the UEI; it identifies additional bank accounts. It does NOT form part of the UEI.

---

### Canonical URL format (for citing sources on a website)

- **Primary entity page URL format:**
  - **SAM.gov entity:** `https://sam.gov/entity/<UEI>/core-data` — e.g., `https://sam.gov/entity/RV56IG5JM6G9/core-data`. The UEI is the stable identifier in the path.
  - **USASpending recipient profile:** `https://www.usaspending.gov/recipient/<HASH_VALUE>/<FISCAL_YEAR>` — e.g., `https://www.usaspending.gov/recipient/ab1234cd-5678-efgh-ijkl-mn0987654321/latest` — where `<HASH_VALUE>` is an internal UUID retrieved via API, and `<FISCAL_YEAR>` can be a year (e.g., `2024`) or `latest`.
  - **USASpending award profile:** `https://www.usaspending.gov/award/<AWARD_ID>/` — e.g., `https://www.usaspending.gov/award/CONT_AWD_FA87301C0015_9700_-NONE-_-NONE-/`

- **Search URL format:**
  - SAM.gov entity search: `https://sam.gov/search/?index=ei&keywords=<SEARCH_TERM>`
  - SAM.gov exclusion search: `https://sam.gov/search/?index=ex&keywords=<NAME>`
  - USASpending advanced search: `https://www.usaspending.gov/search/?filters=<BASE64_ENCODED_FILTER_HASH>` (filters are encoded; simpler to deep-link via the UI or reconstruct with `/api/v2/references/filter/`)

- **URLs to AVOID citing:**
  - Any third-party aggregator that re-hosts SAM or USASpending data (e.g., govtribe.com, fpds.gov UI pages, usacompanies.info, opencorporates.com pages sourcing SAM data, federalprocessingregistry.com) — these are not authoritative and may be outdated
  - `https://fpds.gov` — the Federal Procurement Data System; superseded by USASpending for public citations
  - `https://fsrs.gov` — decommissioned March 6, 2025
  - SAM API URLs (`https://api.sam.gov/...`) — these require API keys and are not user-facing; cite the SAM.gov entity page instead
  - USASpending API URLs — same issue; cite the profile page

---

### Known quirks / gotchas

1. **`spending_by_award` / `spending_by_transaction` missing `recipient_uei` field (open bug):** These two core search endpoints only expose `Recipient DUNS Number` as a named field, not `recipient_uei`. The UEI is present in bulk downloads but not in the API response fields list. Workaround: filter by UEI using the `recipient_search_text` filter or look up via `/autocomplete/recipient/`, then use the hash-based recipient endpoint. ([GitHub issue #3847](https://github.com/fedspendingtransparency/usaspending-api/issues/3847))

2. **Pre-2022 UEI backfill is incomplete:** Awards made before April 2022 may have `recipient_uei = null` even if the entity later obtained a UEI. USASpending progressively backfills, but some old records still only carry DUNS.

3. **Recipient hash is not stable across parent/child:** The USASpending recipient hash is generated from the UEI + fiscal year context. The same legal entity can appear under multiple hashes if it has both a parent-level and child-level profile. Use the `/recipient/children/<UEI>/` endpoint to navigate the hierarchy.

4. **Subaward data duplication:** Prime recipients frequently re-report all subawards to date rather than only new actions. This inflates subaward totals in USASpending. A known issue acknowledged in USASpending's own data documentation — when a subaward total exceeds the prime award amount, duplication is the likely cause. (Controls added in March 2025 when subaward reporting migrated to SAM.gov from FSRS may reduce this going forward.)

5. **SAM.gov exclusions API v1–v3 removed September 13, 2024:** If any pipeline uses the old exclusions endpoints, they have been disabled. Only v4 (`/entity-information/v4/exclusions`) is active. V4 added the `isFASCSAOrder` field for Federal Acquisition Supply Chain Security Act orders. ([GSA bulletin](https://content.govdelivery.com/accounts/USGSA/bulletins/3afb0a1))

6. **SAM `registrationStatus` parameter behavior changed in v3:** In v1/v2, `samRegistered=Yes` was the only option (default returned only active registrations). In v3/v4, `samRegistered=No` returns ID-Assigned-only entities (those with a UEI but no full registration — e.g., subawardees). Default still returns only registered entities.

7. **Forbidden characters in SAM API params:** The characters `& | { } ^ \` cannot appear in parameter values — they will break the query without a clear error.

8. **USASpending rate limit is silent:** There is no `X-RateLimit-Remaining` header. The only signal of rate limit breach is intermittent 500 errors or connection resets. Build in retry logic with exponential backoff at 5–10 seconds.

9. **`exclusionStatusFlag` field semantics differ by API version:** In SAM v1/v2, the field returned `D` (debarred) or null. In v3/v4, it returns `Y` or `N`. When an entity has `exclusionStatusFlag=Y`, the response also populates `exclusionURL` with the link to the specific exclusion record.

10. **Common name false positives in SAM exclusions:** Searching by name alone (e.g., "John Smith") will surface multiple unrelated exclusion records. The SAM.gov UI itself warns about this. When building automated screening, always match on UEI or CAGE+name combination; document that no UEI match was found.

11. **SAM entity data is self-reported:** Entities enter their own business type codes, NAICS codes, and socioeconomic certifications (small business, woman-owned, veteran-owned, etc.). These are not independently verified by SAM at registration. Treasury audits (2025) have found material misclassifications, particularly in Section 8(a) and small business set-aside categories.

12. **USASpending data quality for financial assistance (pre-DATA Act):** GAO found that for FY2012, only 2–7% of assistance awards were fully consistent across all 21 data elements. Post-DATA Act (FY2017+) data quality is substantially better, but still subject to agency-specific reporting errors. Contracts data from FPDS-NG has historically been more reliable.

13. **Aggregate/redacted recipient records:** Awards to individuals (Social Security recipients, small grants) are aggregated or have PII redacted. These appear with `recipient_name = "MULTIPLE RECIPIENTS"` or similar and have no UEI. Do not attempt entity lookups on these records.

---

### Quality signals

- **Check `registrationStatus`:** Active = `A`, Expired = `E`. An expired SAM registration does not mean the entity is debarred, but it means they cannot currently receive new federal awards.
- **Check `exclusionStatusFlag`:** `Y` in SAM v3/v4 means the entity has an active exclusion. Always follow the `exclusionURL` to confirm scope and active/inactive status.
- **Compare `recipient_uei` vs `recipient_duns` presence:** If `recipient_uei` is null but `recipient_duns` is populated, the record predates April 2022. If both are null, the record is an aggregate/redacted individual award.
- **Award linkage check (`about-the-data`):** USASpending publishes an "About the Data" download with a list of unlinked awards — awards in agency financial systems (File C) that don't match any File D1/D2 award record. High unlinked counts for an agency indicate data quality problems.
- **Subaward sanity check:** If `subaward_total_amount > prime_award_amount` for a given prime award, suspect duplicate subaward reporting.
- **`last_updated_date` in SAM:** Indicates when the entity last changed its registration. Entities that haven't updated in 12+ months may have an expired registration (SAM requires annual renewal).
- **`ueiStatus` field in SAM v2+:** Values include `Active` (has UEI, may or may not be registered), useful for distinguishing true registrants from ID-Assigned-only entities.
- **Historical DUNS cross-check:** For research purposes, Dun & Bradstreet's public records (OpenCorporates, prior D&B lookups) can help confirm a DUNS–UEI mapping for entities that registered before 2022, since GSA migrated DUNS-to-UEI mapping programmatically.

---

### Fallback sources

- **FPDS-NG (Federal Procurement Data System — Next Generation):** `https://www.fpds.gov` — the upstream source for all contract awards in USASpending. More granular contract modification history; can be queried via its own API (separate from USASpending). Use when USASpending contract data appears incomplete or modification history is needed.
- **Grants.gov:** `https://www.grants.gov` — upstream source for grant opportunity listings. Awards data flows to USASpending after obligation; use Grants.gov for pre-award research.
- **Beta.SAM.gov / SAM.gov Public Entity Extract:** A weekly full extract of all public SAM entity data is available at `https://sam.gov/data-services/Entity%20Management/Public` — downloadable as a pipe-delimited ZIP. Useful for bulk database loads rather than API polling.
- **USASpending Award Data Archive:** `https://www.usaspending.gov/download_center/award_data_archive` — pre-generated full fiscal year CSVs by agency and award type. Updated monthly by the 15th. Best option for full-history database ingestion.
- **Treasury GTAS:** For agency-level account data and budgetary resources when USASpending account data is insufficient.
- **OpenSecrets / FEC.gov:** For the political donor research use case at thedonormap.org — FEC filing data is the authoritative source for individual political contributions; USASpending is authoritative for federal contracts/grants to companies. Cross-referencing entity UEIs with FEC employer/organization fields enables donor-to-contractor analysis.

---

### Recent changes / deprecations

| Date | Change |
|---|---|
| **April 4, 2022** | DUNS Number officially retired as the federal entity identifier. UEI (Unique Entity Identifier) became the sole standard. SAM API v3 released, removing `ueiDUNS` field. All federal systems required to complete UEI transition. |
| **September 13, 2024** | SAM.gov Exclusions API versions 1, 2, and 3 **permanently retired**. Only v4 is now active. V4 adds the `isFASCSAOrder` field for Federal Acquisition Supply Chain Security Act orders. All consumers must use `https://api.sam.gov/entity-information/v4/exclusions`. ([GSA bulletin](https://content.govdelivery.com/accounts/USGSA/bulletins/3afb0a1)) |
| **December 6, 2024** | SAM.gov Entity Management API **v4 launched** (v4.6). Adds `Exceeds Domestic Threshold` field in Reps and Certs section. No breaking changes from v3; backward compatible. ([Source](https://open.gsa.gov/api/entity-api/)) |
| **December 31, 2024** | FSRS.gov announced for decommission; subaward reporting migration to SAM.gov announced. |
| **March 6, 2025** | **FSRS.gov fully decommissioned.** All subaward reporting (FFATA compliance) moved to SAM.gov. Historical FSRS data migrated to SAM. SAM entity administrators must now assign a "Subaward Reporter" role to staff. ([Source](https://www.grfcpa.com/resource/retirement-of-fsrs-gov-what-you-need-to-know-if-you-are-reporting-subawards/)) |
| **March 8, 2025** | Subaward reporting and viewing functionality live on SAM.gov. USASpending downstream pipeline for subaward data updated to pull from SAM instead of FSRS. Additional duplicate-prevention controls added to subaward ingestion. |
| **Ongoing 2025** | SAM.gov gradually refreshing entity registration UI pages (Business Information, Taxpayer Information, Business Types, Entity Relationships, Financial Information sections modernized through Q3 2025). Data collected is unchanged. ([SAM.gov announcement](https://sam.gov/announcements/improvements-samgov-entity-registration-process)) |
| **Open (as of April 2026)** | USASpending GitHub issue [#3847](https://github.com/fedspendingtransparency/usaspending-api/issues/3847): `spending_by_award` and `spending_by_transaction` endpoints still do not expose `recipient_uei` as a requestable response field, only the legacy `Recipient DUNS Number`. No fix date announced. |
| **V1 USASpending endpoints** | Deprecated — use v2 only. `https://api.usaspending.gov` notes "V1 endpoints are currently Deprecated." |

---

### Quick-reference code snippets

**Search all awards to a recipient by UEI (USASpending):**
```python
import requests

resp = requests.post(
    "https://api.usaspending.gov/api/v2/search/spending_by_award/",
    json={
        "filters": {
            "recipient_search_text": ["PLACE_UEI_HERE"],
            "award_type_codes": ["A","B","C","D","02","03","04","05"]
        },
        "fields": ["Award ID", "Recipient Name", "Award Amount", "Start Date", "Award Type"],
        "page": 1,
        "limit": 100,
        "sort": "Award Amount",
        "order": "desc"
    }
)
data = resp.json()
# data["results"] — list of awards
# data["page_metadata"]["has_next_page"] — bool
```

**Look up a SAM entity by UEI:**
```python
import requests

API_KEY = "YOUR_SAM_API_KEY"
uei = "RV56IG5JM6G9"

resp = requests.get(
    "https://api.sam.gov/entity-information/v4/entities",
    params={
        "ueiSAM": uei,
        "includeSections": "entityRegistration,coreData",
        "api_key": API_KEY
    }
)
data = resp.json()
# data["entityData"][0]["coreData"]["entityHierarchyInformation"]
```

**Check for active exclusions by UEI:**
```python
resp = requests.get(
    "https://api.sam.gov/entity-information/v4/exclusions",
    params={
        "ueiSAM": uei,
        "api_key": API_KEY
    }
)
data = resp.json()
is_excluded = data.get("totalRecords", 0) > 0
```

---

### Known incidents (our vault)

**SAM.gov fuzzy name-match bug (fixed 2026-04-10 at engine layer, commit `d1ceb91`):** Name searches returned loose fuzzy matches, polluting QVT Financial with 7,670 fake federal contracts. Engine fix validates `awardeeLegalBusinessName` matches search term on first 5 samples (60% threshold) before committing any auto-block data.

**Vault cleanup:** QVT Financial manually stripped of `auto:sam-contracts` (7670 fake entries) on 2026-04-10. Other potentially-affected entities should be spot-checked.

**Red flag for editorial review:** If an entity with more than 100 federal contracts is a hedge fund, pure financial firm, think tank, or similar non-contracting entity — suspect false positive. Spot-check contractor legal names against entity title.

---

**Wrong awardee JSON path made the sanity check fire on everything (fixed 2026-04-11):** The `summarizeContracts()` validator in `scripts/sam-pipeline.cjs` was reading awardee names from `c.coreData?.awardeeOrRecipient?.legalBusinessName` — a path that **does not exist** in the actual SAM.gov `/contract-awards/v1/search` response schema. Every record's `coreData` only contains contracting-organization data (`federalOrganization`, `acquisitionData`, `legislativeMandates`, `principalPlaceOfPerformance`, `productOrServiceInformation`, …) — no awardee info at all.

The real awardee names live at `awardSummary[i].awardeeData.awardeeHeader.legalBusinessName` (plus `.awardeeName`, `.awardeeAlternateName`, `.awardeeNameFromContract`).

Consequence: every record's computed awardee name was `""`. The token-hit matcher (`searchTokens.filter(t => awardeeName.includes(t)).length`) returned 0 for every sample, the 60% threshold failed, and `summarizeContracts()` returned `rejected: name-mismatch (0/5 matched)` for every profile. Verified 2026-04-11 against Kaiser Permanente, Tyson Foods, Nvidia — all three rejected despite being legitimate federal contractors.

Secondary finding: the SAM.gov filter `awardeeLegalBusinessName=Kaiser+Permanente` is **very** loose — the top results for that query include "Kaiser, Curtis" (an individual trash-service proprietor with UEI NWG5RMQKE965) and "Kaiser Trash Service". SAM is matching on any substring containing "Kaiser". The post-filter match verification is not optional; it's the only thing protecting the vault from wrong-contractor contamination.

**Engine fix:**
- `summarizeContracts()` now reads awardee names from the correct `awardeeData.awardeeHeader.*` fields, with fallbacks to the old path and to a top-level `awardeeLegalBusinessName` in case SAM rotates the schema again.
- Match logic now requires **every** significant search token (≥3 chars) to appear in at least one of the candidate awardee fields, not just 60% of tokens. This is what rejects "Kaiser, Curtis" when searching for "Kaiser Permanente" while still accepting "Kaiser Foundation Hospitals" or "Kaiser Permanente Inc".
- 60% cross-sample threshold retained on top of the stricter per-record match.

**Follow-up TODO:** Ideally SAM queries should use the Entity API (`/entity-information/v3/entities`) to resolve a UEI first, then filter contract searches by `awardeeUEI=<exact>` instead of by legal business name. UEIs are stable unique identifiers and bypass the fuzzy name matching entirely. Not yet implemented because the Entity API uses a different auth path (header instead of query param) and is rate-limited separately.

**Quality check rule:** If a vault profile's `auto:sam-contracts` block shows a small number of contracts (under 20) and the top awardee legal names don't obviously correspond to the profile, suspect the fuzzy-match problem and audit before citing as Tier 1.

## ProPublica Nonprofit Explorer API
**Last verified:** 2026-04-10

### Identity
- **What it is:** A free, no-auth REST API exposing IRS Form 990 data (plus links to PDF/XML filings) for U.S. tax-exempt organizations. Built and maintained by ProPublica since 2013; currently at version 2.
- **What it covers:**
  - **Structured financial summary data** (40–120 fields depending on form type) for Form 990, Form 990-EZ, and Form 990-PF filings processed by the IRS during calendar years 2012–2019. This covers filings for fiscal years roughly 2011–2018, though more recent filings are linked as PDF/XML.
  - **PDF links** for all available scanned 990 filings going back to 2001 (older filings via Public.Resource.Org/Internet Archive; 2017+ from IRS directly).
  - **XML links** (full e-file data: financial details, officer names, tax schedules) for electronically filed forms from 2010 onward; pre-October 2021 e-files also available via Amazon Web Services.
  - **Federal audit links** for nonprofits spending ≥$750,000 in federal grant money per year, from fiscal year 2015 onward (Federal Audit Clearinghouse).
  - Organization profile metadata: name, EIN, address, subsection code (501(c) type), NTEE code, ruling date, asset/income codes (from the IRS EO Business Master File).
  - All 27 subsections of 501(c), plus 4947(a)(1) charitable trusts and private foundations (Form 990-PF filers).
- **Tier classification:** Tier 1 — free, no registration, no API key. Public domain data; commercial users should contact ProPublica per their Data Terms of Use.
- **Authoritative?** Semi-authoritative. ProPublica is a secondary aggregator; the upstream source is the IRS (EO Business Master File and Annual Extract of Tax-Exempt Organization Financial Data). Treat as a reliable convenience layer over IRS data. For litigation-grade accuracy, verify against primary IRS records.
- **Data freshness:** Organization profiles update when IRS releases new EO Business Master File extracts. Financial summary data updates when IRS releases the Annual Extract of Tax-Exempt Organization Financial Data (historically each spring). Full 990 PDF/XML documents are ingested on a rolling basis as the IRS posts them. As of early April 2026, the most recent data source label observed in live API responses is `current_2026_03_10`, and FY2024 filings are already present for some organizations.
- **Known staleness risk:**
  - The IRS had a severe publication backlog from 2020–2023 (COVID staffing, system migrations, accidental release of nonpublic data). ProPublica resolved this with a major catch-up update in June 2023 (added 1M+ filings covering FY2020–2022). As of early 2025, releases appear to have resumed more regularly.
  - DOGE-related IRS staffing cuts in early 2025 (widely reported by ProPublica and others) pose a potential future risk to IRS data release cadence; monitor for new gaps.
  - Structured financial summary data in `filings_with_data` is limited to IRS-processed years 2012–2019; filings after that appear as PDF/XML only in `filings_without_data` until the IRS releases annual extract updates.
  - Amended returns may not be reflected; duplicate PDF links may indicate amendments.

---

### API access
- **Base URL:** `https://projects.propublica.org/nonprofits/api/v2`
- **Auth:** None. No API key required. Requests work anonymously.
- **How to get an API key:** N/A. Commercial users should contact ProPublica ([email protected]) — the API Terms of Use prohibit redistributing raw data, charging for access to it, or sub-licensing it.
- **Rate limit:** Not publicly documented for the Nonprofit API. PDF download links (`pdf_url`) are explicitly noted as rate-limited in the API docs. The ProPublica Congress API (a separate product) uses 5,000 requests/day — do not assume this applies here. For bulk PDF downloads, use IRS bulk downloads directly (filings processed since 2017 are available from the IRS).
- **Pagination:** `page` parameter (zero-indexed). Default is page 0. Returns **25 results per page** (reduced from 100 on September 12, 2023). Response includes `num_pages`, `cur_page`, `per_page`, and `page_offset` fields. The Organization endpoint does not paginate — it returns all filings for a given EIN in one response.
- **User-Agent / headers required:** None required. Standard JSON responses without special headers. JSONP available via `?callback=` parameter.

---

### Core endpoints

| Endpoint | Purpose | Key params | Response shape highlights |
|---|---|---|---|
| `GET /search.json` | Search organizations by name, state, NTEE category, or 501(c) type | `q` (keyword), `page` (0-indexed), `state[id]` (2-letter code; "ZZ" for non-US), `ntee[id]` (1–10), `c_code[id]` (2–28, 92 for 4947(a)(1)) | `total_results`, `num_pages`, `per_page`=25, `organizations` array of Organization objects (no financial data in search results — use org endpoint for filings) |
| `GET /organizations/:ein.json` | Full profile + all filings for a single org by EIN | `:ein` in URL only (integer EIN, no dashes) | `organization` object, `filings_with_data` array (structured financial fields), `filings_without_data` array (PDF-only records), `api_version` |

**Output format modifiers** (append to `/search.json` via `output=` param):
- `output=flat` — filing fields flattened into filing object; no nested `organization` sub-object
- `output=noorg` — strip org metadata from filing objects; retrieve separately via org endpoint

**Key filing fields returned** (form-type-dependent; 40–120 fields total):

| Field | Description |
|---|---|
| `ein` | Integer EIN (leading zeros stripped) |
| `tax_prd` | Tax period end in YYYYMM format |
| `tax_prd_yr` | Tax period year only |
| `formtype` | 0=Form 990, 1=Form 990-EZ, 2=Form 990-PF |
| `pdf_url` | Link to PDF (rate-limited; may be null) |
| `totrevenue` | Total revenue (normalized convenience alias) |
| `totfuncexpns` | Total functional expenses |
| `totassetsend` | Total assets, end of year |
| `totliabend` | Total liabilities, end of year |
| `pct_compnsatncurrofcr` | Officer/director compensation as % of expenses |
| `compnsatncurrofcr` | Dollar amount of officer/director compensation |
| `othrsalwages` | Other salaries and wages |
| `totcntrbgfts` | Total contributions and gifts |
| `totprgmrevnue` | Program service revenue |
| `invstmntinc` | Investment income |

Full form-specific fields use IRS "element names" from the IRS Annual Extract documentation.

---

### Identifiers
- **Primary ID:** EIN (Employer Identification Number). **In the API, EIN is always stored and transmitted as an integer** — leading zeros are stripped. Example: an org with EIN `01-0165097` appears as `10165097` in the `ein` field.
- **Secondary IDs:**
  - `strein`: formatted EIN string in `XX-XXXXXXX` notation with leading zeros preserved (e.g., `01-0191203`). Present in the Organization object.
  - `id`: same integer value as `ein` in the Organization object.
  - `ntee_code`: NTEE classification (e.g., `A20`).
  - `subseccd` / `subsection_code`: 501(c) subsection integer (3 = 501(c)(3), 4 = 501(c)(4), etc.).
  - `latest_object_id`: IRS object ID for the most recent filing (used to construct IRS XML download URLs).
- **How to look up an entity:**
  1. If you have the EIN: `GET https://projects.propublica.org/nonprofits/api/v2/organizations/{ein_as_integer}.json`
  2. If you have the name: `GET https://projects.propublica.org/nonprofits/api/v2/search.json?q={name}` — optionally add `c_code%5Bid%5D=4` (for 501(c)(4)) or `state%5Bid%5D=NY`. Search searches organization name, alternate name, and city.
  3. Web search: `https://projects.propublica.org/nonprofits/?c_code%5Bid%5D=4&q={name}`
- **Known ID gotchas:**
  - **Leading zeros**: An EIN like `01-0165097` must be submitted to the API as `10165097` (9 digits without leading zero and without dash). The URL `https://projects.propublica.org/nonprofits/api/v2/organizations/010165097.json` (with leading zero) may return a result, but the canonical integer form is `10165097`. Confirm with the `strein` field in the response.
  - **No dashes in URL**: The API endpoint uses the bare integer, not the hyphenated format.
  - **Unique filing key**: Filing records are unique on `ein` + `tax_prd` (YYYYMM). An org can have multiple filings per year if it filed amendments.
  - **Form type mixing**: A search response without a `formtype` filter will return filings of all types (990, 990-EZ, 990-PF) — field schemas differ substantially between types.

---

### Canonical URL format
- **Primary entity page URL format:** `https://projects.propublica.org/nonprofits/organizations/{ein_integer}`
  - Example: `https://projects.propublica.org/nonprofits/organizations/142007220` (ProPublica Inc, EIN 14-2007220)
- **Search URL format:** `https://projects.propublica.org/nonprofits/?q={query}&state%5Bid%5D={state}&c_code%5Bid%5D={code}`
  - Example 501(c)(4) search in New York: `https://projects.propublica.org/nonprofits/?q=civic&state%5Bid%5D=NY&c_code%5Bid%5D=4`
- **API base for citation:** `https://projects.propublica.org/nonprofits/api`
- **URLs to AVOID citing:**
  - Old v1 API URLs (removed July 13, 2023): `https://projects.propublica.org/nonprofits/api/v1/...`
  - `guidestar_url` field in API response: links to Candid/GuideStar which now requires a login for most data
  - `nccs_url` field: points to NCCS/Urban Institute which has reorganized its data; URLs may be stale

---

### Known quirks / gotchas
- **Board members and officers are NOT in the structured API fields.** The `filings_with_data` financial summary does not include officer/board member names. Those are only available in the full Form 990 XML e-files (for electronic filers) or PDFs (for paper filers). ProPublica's web UI surfaces up to 25 key employees and board members per year (added May 2021), but this data is not exposed through the `/organizations/:ein.json` API endpoint.
- **Grant recipients are NOT in the API.** Schedule I (grants to domestic organizations) and Schedule F (foreign grants) data is only in the full XML filings — not in the summary financial fields.
- **501(c)(4) donor lists are not available anywhere in the data.** Since a 2018 Treasury/IRS ruling, 501(c)(4) organizations are no longer required to disclose donor identities on Schedule B to the IRS. This data does not exist in the 990 filings ProPublica ingests.
- **Small organizations ($0–$50K gross receipts) are entirely excluded.** They file Form 990-N (e-Postcard) which contains only 8 basic fields and no financial data. ProPublica does not include these.
- **Form 990-EZ filers ($0–$200K revenue, <$500K assets) have fewer structured fields** than full 990 filers. `filings_with_data` includes them but the field set is smaller.
- **`filings_with_data` vs. `filings_without_data`:** Structured financial data exists only for electronically filed returns captured in the IRS Annual Extract (primarily 2012–2019 processed filings). More recent years often appear only in `filings_without_data` as PDF links until the IRS releases new annual extracts.
- **The search endpoint returns only Organization objects** (no financial data). You must call the Organization endpoint separately for filings.
- **EIN integer trimming**: The `ein` integer field drops leading zeros. Always use `strein` when displaying EINs to users or writing to databases that expect the standard `XX-XXXXXXX` format.
- **`pdf_url` can be null** even when a filing exists — PDF availability depends on IRS release and rate limits on the ProPublica download server.
- **Summary data note**: The "About This Data" section on ProPublica states that structured summary data covers IRS-processed years 2012–2019. This is the IRS Annual Extract dataset. Filings processed after 2019 appear as linked XML/PDFs but may not have all summary fields populated until the next annual extract is ingested.
- **Amended returns** may not be reflected; the API does not have a dedicated field flagging amendments.

---

### Quality signals
- `updated` on the Organization object: ISO 8601 timestamp of when the org profile was last synced from the IRS Business Master File.
- `updated` on each Filing object: when that filing's extracted data was last refreshed.
- `data_source` field in responses: contains a plain-text citation identifying which IRS datasets the data came from and their URLs.
- `filings_with_data` vs. `filings_without_data`: presence in `filings_with_data` means structured numeric fields are available; presence only in `filings_without_data` means only PDF metadata is available.
- `have_extracts` and `have_pdfs` on the Organization object (observed in live API; not documented): boolean flags for data availability.
- For freshness, check the `tax_period` field on the Organization object — it reflects the most recent tax period on file, e.g., `2024-12-01` means a FY2024 filing exists.

---

### Fallback sources
| Source | Use case | Notes |
|---|---|---|
| [IRS Tax Exempt Organization Search](https://apps.irs.gov/app/eos/) | Current exemption status, revocations, determination letters | Authoritative; updated more frequently than ProPublica's BMF snapshot |
| [IRS EO BMF Extract](https://www.irs.gov/charities-non-profits/exempt-organizations-business-master-file-extract-eo-bmf) | Bulk organization profiles | Raw source for ProPublica's org metadata |
| [IRS Annual Extract](https://www.irs.gov/uac/soi-tax-stats-annual-extract-of-tax-exempt-organization-financial-data) | Bulk financial summary data | Raw source for ProPublica's `filings_with_data` |
| [IRS 990 XML e-files](https://www.irs.gov/charities-non-profits/form-990-series-which-forms-do-exempt-organizations-file-filing-phase-in) | Full filing data including officer names, schedules, grant recipients | Required for board members, Schedule I/F grants, detailed compensation; only for e-filers |
| [Candid / GuideStar](https://www.candid.org/) | Richer org profiles, mission statements, recent leadership | Requires account; more current org data |
| [ProPublica 527 Explorer](https://projects.propublica.org/527s/) | Political organizations (527s) | Separate tool; 527s file different returns |
| [OpenSecrets](https://www.opensecrets.org/dark-money) | Dark money / 501(c)(4) spending on elections | Tracks independent expenditures; not 990 data |
| [Federal Audit Clearinghouse](https://facdissem.census.gov/) | Single audits for federal grant recipients | Linked from ProPublica for orgs ≥$750K federal spend |

---

### Recent changes / deprecations
- **September 12, 2023**: Search endpoint results per page reduced from 100 to 25. Code that relied on 100-item pages will silently under-paginate — update all page-iteration logic.
- **July 13, 2023**: v1 API permanently removed. Any code using `https://projects.propublica.org/nonprofits/api/v1/...` will 404.
- **June 2023**: ProPublica added 1M+ new filings to the database (FY2020–2022) after a multi-year IRS release backlog caused by COVID staffing shortages and accidental release of nonpublic data. FY2022 data is now available for most organizations.
- **May 2021**: ProPublica added key employee and officer display to org pages (web UI only; not exposed in API structured fields). 24M+ employee records added.
- **2018 (IRS ruling, not ProPublica change)**: 501(c)(4), 501(c)(5), and 501(c)(6) organizations no longer required to disclose donor identities on Schedule B. This donor data does not exist in any 990-based source going forward.
- **2024–2026 API schema**: No documented breaking API changes since September 2023. The API changelog on the documentation page has not been updated since Sept 2023, but data continues to be refreshed (observed `data_source: current_2026_03_10` in live responses as of April 2026).
- **DOGE/IRS staffing risk (2025)**: Significant IRS workforce reductions in early-mid 2025 may slow future 990 data releases. Monitor ProPublica's Nonprofit Explorer update announcements and the IRS EO BMF release schedule for gaps.

---

*Sources: [ProPublica Nonprofit Explorer API v2 documentation](https://projects.propublica.org/nonprofits/api); [ProPublica Nonprofit Explorer main page](https://projects.propublica.org/nonprofits/); live API response verified April 2026 (`https://projects.propublica.org/nonprofits/api/v2/organizations/142007220.json`); [ProPublica: Nonprofit Explorer Adds More than a Million New Form 990s (June 2023)](https://www.propublica.org/article/nonprofit-explorer-adds-a-million-new-form-990s); [ProPublica: New: View an Organization's Employees and Officers (May 2021)](https://www.propublica.org/nerds/new-view-an-organizations-employees-and-officers-on-nonprofit-explorer); [ProPublica Data Terms of Use](https://www.propublica.org/datastore/terms).*

---

### Known incidents (our vault)

**Fuzzy-match first-result fallback bug (fixed 2026-04-11):** `bestMatch()` in `scripts/propublica-pipeline.cjs` had a silent `return results[0]` fallback for any search that didn't produce an exact or bidirectional-substring match. Searching `Coinbase` (a for-profit, not a nonprofit) returned a false-positive match to "Coinwise Foundation" (EIN 882190767) — a completely unrelated org that happened to rank first in ProPublica's search results. This is an A000383-class bug: wrong EIN silently written into frontmatter, wrong 990 filings cited as Tier 1 sources on the profile. We don't yet know how many profiles were affected historically; the previous logic would have produced wrong matches for any donor whose profile name doesn't exactly exist in IRS 990 records.

**Engine fix:** `bestMatch()` now only returns a result on (1) exact normalized-name match, or (2) full-target-phrase contiguous substring match where the result name adds at most 3 additional tokens (for boilerplate like "Foundation", "Inc", "of"). Returns `null` otherwise — refuses to guess. Token-level filtering rejects any single-word target matched against a 4+-token org name.

**Vault cleanup:** Needed. Flag for audit — scan all profiles with `auto:propublica-990` blocks and verify the `ein` cited in the block matches the actual entity. Short-term: check any profile whose EIN does NOT appear in its frontmatter `ein` field, or where the ProPublica org name in the auto-block differs substantively from the profile title.

**Quality check rule:** Before citing a ProPublica 990 auto-block as Tier 1, confirm the org name returned by the API matches the profile title modulo common corporate-form suffixes (Inc / LLC / Foundation / Fund / Corporation / Trust). Single-word targets (e.g., "Coinbase", "Meta", "X") are particularly prone to false-positive fuzzy matches and should be hand-verified.

**Vault convention:** Use EIN-direct lookup (9-digit) whenever possible — authoritative and prevents disambiguation issues. DMFI (EIN 833298146), QVT Financial-adjacent 990 entries, and mega-donor family foundations use this pattern.

**Known gap:** Many 501(c)(4) dark money vehicles don't file detailed 990s by design. Profiles showing "0 filings on record" for a real 501c4 are not contaminated data — that's a legitimate data gap.

## SEC EDGAR
**Last verified:** 2026-04-10

### Identity
- **What it is:** The SEC's Electronic Data Gathering, Analysis, and Retrieval system. The primary public repository for all mandatory disclosure filings by U.S. public companies, insiders, funds, and individuals regulated under federal securities law. Programmatic access is provided via two separate systems: the `data.sec.gov` REST API (structured JSON metadata and XBRL financials) and the `efts.sec.gov` full-text search system (indexes the actual text content of every filing).
- **What it covers:** Every filing submitted electronically since 1993 (full-text search since 2001). Covers 10-K/10-Q annual and quarterly reports, 8-K current reports, DEF 14A proxy statements (board members, exec compensation, Say-on-Pay), Form 4/3/5 insider transactions, Form D private offering notices, Schedule 13D/13G beneficial ownership, S-1 registration statements, Form ADV (investment advisors, via separate IAPD system), and hundreds of other form types. Filers include public companies, fund managers, insiders (directors, officers, 10%+ owners), and private issuers using Reg D.
- **Tier classification:** Tier 1 — primary U.S. government source. All data is the original submission from the filer, made under penalty of law. Authoritative for what was filed; accuracy of the underlying disclosure is the filer's legal responsibility.
- **Authoritative?** Yes, for the fact that a filing was made and for the content of the filing as submitted. EDGAR does not validate the truth of disclosures; it only verifies format compliance.
- **Data freshness:** Near real-time. Submissions accepted until 10:00 PM ET on business days appear on SEC.gov within 1–3 minutes of acceptance. The `data.sec.gov` submissions API updates in under 1 second; XBRL APIs update within about 1 minute. Nightly index files build by ~3:00 AM ET. Some late filings (after 5:30 PM ET, or 10:00 PM ET for Forms 3/4/5) appear on the next business day's index.
- **Known staleness risk:** (1) Paper filings prior to 1994 are not in EDGAR. (2) Some older filings (pre-1996) were submitted in paper or early SGML and may be incomplete or machine-unreadable. (3) The CIK-to-ticker mapping files (`company_tickers.json`) are updated periodically but not guaranteed to be current or comprehensive — they cover ~10,000 publicly traded companies, not all filers. (4) XBRL-structured financial data only goes back to 2009 for large accelerated filers (2011 for all filers). Pre-XBRL filings exist as HTML/text only. (5) Form ADV (investment advisers) is NOT on EDGAR — it is on the separate IAPD system at `https://www.adviserinfo.sec.gov`.

---

### API access
- **Base URL:**
  - Filing metadata & XBRL financials: `https://data.sec.gov/`
  - Full-text filing search: `https://efts.sec.gov/LATEST/search-index`
  - Filing document archives: `https://www.sec.gov/Archives/edgar/data/`
  - Bulk CIK/ticker mapping: `https://www.sec.gov/files/company_tickers.json`
  - Legacy company search (still functional, use sparingly): `https://www.sec.gov/cgi-bin/browse-edgar`

- **Auth:** No API key or authentication required for any public read endpoint. However, a `User-Agent` header identifying your organization and contact email is **mandatory** — requests without it are blocked with a 403 or "Undeclared Automated Tool" error.

- **Rate limit:** **10 requests per second maximum**, enforced across all EDGAR and `data.sec.gov` endpoints combined, regardless of how many machines or IP addresses you use. Exceeding this threshold triggers a temporary IP block (approximately 10 minutes). The limit has been in place since July 27, 2021. There is no documented daily cap — continuous access at under 10 req/sec is permitted. Best practice: add a 100–150ms delay between requests.

- **Pagination:**
  - **Submissions API:** The `filings.recent` object in `CIK##########.json` contains at least 1 year's filings or up to 1,000 entries (whichever is more) in parallel columnar arrays. If the filer has more historical filings, the response's `filings.files` array lists additional JSON files (e.g., `CIK0001318605-submissions-001.json`) covering older date ranges, each of which must be fetched separately from `https://data.sec.gov/submissions/`.
  - **EFTS full-text search:** Use `from` (integer, default 0) and `size` (integer, default 10, max 100) query parameters. Paginate by incrementing `from` by `size`. Maximum total results retrievable per query: 10,000.
  - **XBRL APIs:** No pagination — entire dataset returned per company in a single JSON response (can be large for established companies).

- **User-Agent / headers required:** The SEC's own documentation specifies this exact format:

  ```
  User-Agent: Sample Company Name AdminContact@<sample company domain>.com
  Accept-Encoding: gzip, deflate
  Host: www.sec.gov
  ```

  The required pattern is: `<Organization or name> <email address>`. The email must be present and valid so the SEC can contact you if your usage causes problems. A personal-use format like `Personal Research yourname@gmail.com` is also acceptable in practice. **Without this header, automated requests receive a 403 error.** The `Accept-Encoding: gzip, deflate` and `Host` headers are good practice but the User-Agent with email is the hard requirement. Source: [SEC Accessing EDGAR Data](https://www.sec.gov/os/accessing-edgar-data) and [SEC Webmaster FAQ – Developers section](https://www.sec.gov/os/webmaster-faq#developers).

---

### Core endpoints

| Endpoint | Purpose | Key params | Response shape highlights |
|---|---|---|---|
| `GET https://data.sec.gov/submissions/CIK{##########}.json` | Filing history for any entity. Primary entry point for all filer research. | CIK must be zero-padded to exactly 10 digits (e.g., `CIK0000320193`) | Top-level: `name`, `cik`, `sic`, `sicDescription`, `tickers[]`, `exchanges[]`, `addresses{}`, `filings.recent{}` (columnar arrays: `accessionNumber[]`, `filingDate[]`, `form[]`, `primaryDocument[]`, `reportDate[]`), `filings.files[]` (links to older filing pages) |
| `GET https://data.sec.gov/api/xbrl/companyfacts/CIK{##########}.json` | All XBRL-tagged financial facts ever reported by a company. Best for 10-K/10-Q financial data. | CIK zero-padded | `facts.us-gaap.{Concept}.units.USD[]` — each entry has `val`, `end` (period end date), `form` (e.g., `"10-K"`), `filed`, `accn` (accession number), `fy`, `fp` |
| `GET https://data.sec.gov/api/xbrl/companyconcept/CIK{##########}/{taxonomy}/{concept}.json` | Single XBRL concept across all periods for one company. Faster than companyfacts for targeted queries. | `taxonomy`: `us-gaap`, `ifrs-full`, `dei`, `srt`; `concept`: e.g., `Revenues`, `NetIncomeLoss`, `Assets` | Same structure as companyfacts but scoped to one concept |
| `GET https://data.sec.gov/api/xbrl/frames/{taxonomy}/{concept}/{unit}/CY{YEAR}.json` | One XBRL concept for all reporting companies in a given calendar period. Cross-company comparison. | Period format: `CY2024` (annual), `CY2024Q1` (quarterly), `CY2024Q1I` (instantaneous/balance-sheet) | `data[]` array, each entry: `accn`, `cik`, `entityName`, `loc`, `end`, `val` |
| `GET https://efts.sec.gov/LATEST/search-index` | Full-text search across all EDGAR filing content since 2001. Use for DEF 14A text, Form D content, narrative sections not in XBRL. | `q` (search string; quoted phrases for exact match; `NOT`, `OR`, `NEAR(n)` operators); `forms` (comma-separated form types, e.g., `DEF+14A,DEF+14A/A`); `dateRange=custom&startdt=YYYY-MM-DD&enddt=YYYY-MM-DD`; `from` (offset); `size` (1–100) | `hits.total.value` (total match count), `hits.hits[]`: each has `_id` (accession+filename, format: `0001234567-24-000001:filename.htm`), `_source.entity_name`, `_source.file_date`, `_source.form_type`, `_source.period_of_report`, `_source.file_num` |
| `GET https://www.sec.gov/files/company_tickers.json` | Ticker-to-CIK bulk mapping. Download once and cache locally for ticker lookups. | None | JSON object keyed by index; each entry: `cik_str` (integer, no leading zeros), `ticker`, `title` (company name). Covers ~10,000 publicly traded companies only. |
| `GET https://www.sec.gov/files/company_tickers_exchange.json` | Same as above plus exchange information. | None | Adds `exchange` field (`"Nasdaq"`, `"NYSE"`, etc.) |
| `GET https://www.sec.gov/Archives/edgar/data/{CIK}/{accession_no_dashes}/{accession_no}-index.htm` | Filing index page listing all documents in a submission. Use to locate the primary document or specific exhibits. | CIK without leading zeros (as stored in archives); accession number with dashes removed for directory path, with dashes retained for filename | HTML page listing all filed documents with filenames, descriptions, and types |
| `GET https://www.sec.gov/Archives/edgar/daily-index/xbrl/companyfacts.zip` | Bulk ZIP of all XBRL companyfacts JSON. Updated nightly ~3 AM ET. | None | ZIP containing one JSON per CIK. Most efficient for large-scale financial database builds. |
| `GET https://www.sec.gov/Archives/edgar/daily-index/bulkdata/submissions.zip` | Bulk ZIP of all submission history JSON files. Updated nightly. | None | ZIP containing one JSON per CIK (same format as submissions API). |
| `GET https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&company={NAME}&CIK=&type={FORM_TYPE}&dateb=&owner=include&count=40&search_text=&output=atom` | Legacy company/form-type search. Returns Atom feed. Still functional but prefer submissions API or EFTS for programmatic use. | `company` (name search), `CIK` (exact), `type` (form type), `count` (results per page, max 40 per request), `output=atom` for machine-readable | Atom XML feed with filing entries |

---

### Identifiers

- **Primary ID:** CIK (Central Index Key). A unique integer assigned by EDGAR to every filer — companies, individuals, funds, filing agents. **Must be zero-padded to exactly 10 digits** when used in `data.sec.gov` API URLs (e.g., `CIK0000320193`). CIK values are permanent and never recycled. Example: Apple = `320193` (unpadded) / `CIK0000320193` (in API URLs). CIK is assigned to both companies AND individuals who file (insiders file Forms 3, 4, 5 under their own personal CIK, distinct from the company's CIK).

- **Secondary IDs:**
  - **Ticker symbol:** Not stored in EDGAR filing metadata directly; maintained in the `company_tickers.json` mapping file (periodically updated, not guaranteed accurate for delisted or recently renamed entities). Individuals (insiders) do not have tickers.
  - **Accession number:** The unique identifier for each individual filing submission. Format: `{filer_CIK_10digit}-{YY}-{sequence}`, e.g., `0001193125-24-001234`. The first 10 digits are the CIK of the submitter (which may be a filing agent, not the company). In archive directory paths, dashes are stripped: `000119312524001234/`. In filenames, dashes are retained.
  - **CUSIP / ISIN:** Not natively searchable via EDGAR API. CUSIPs appear in filing text and can be found via EFTS full-text search, but there is no structured CUSIP-to-CIK endpoint. (The 13(f) securities list is published only as PDF due to S&P/CUSIP licensing restrictions.)
  - **SIC code:** Available in the submissions API response. Useful for filtering by industry.
  - **EIN (Employer Identification Number):** Present in filing headers; searchable via EFTS full-text search. Also available in XBRL Financial Statement datasets from DERA.

- **How to look up an entity:**
  1. **By ticker (companies only):** Download `https://www.sec.gov/files/company_tickers.json` once; query locally by `ticker` field. Returns `cik_str` (unpadded integer).
  2. **By company name:** Use EFTS search UI at `https://efts.sec.gov/LATEST/search-index?q={name}` or the EDGAR search at `https://www.sec.gov/cgi-bin/browse-edgar?company={name}&action=getcompany`. Name matching is not exact.
  3. **By individual name (for insider/Form 4 research):** Use EFTS full-text search `q="First Last"&forms=4` to find their filings, then extract the reporting owner's CIK from the filing. Individuals are not in `company_tickers.json`.
  4. **Direct CIK lookup page:** `https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK={CIK}&type=&dateb=&owner=include&count=40`

- **Known ID gotchas:**
  - **Zero-padding is mandatory in API URLs:** `data.sec.gov/submissions/CIK0000320193.json` works; `data.sec.gov/submissions/CIK320193.json` returns 404. The `company_tickers.json` file stores CIKs as integers without leading zeros (`cik_str: 320193`), so you must pad to 10 digits before use.
  - **Individual CIKs are separate from company CIKs:** A director of Apple has a different CIK than Apple Inc. When researching a person's insider trades across multiple companies, search by the individual's personal CIK, not by any company CIK. A single individual must have only one set of EDGAR credentials — if they have multiple CIKs (rare, but happens due to historical duplicates), look for the canonical one.
  - **Accession number submitter CIK ≠ company CIK:** The first 10 digits of an accession number are the CIK of whoever submitted the filing — often a financial printer or filing agent (e.g., `0001193125` is Edgar Online/Donnelley). This is NOT the company's CIK.
  - **`company_tickers.json` coverage gap:** Only includes publicly traded companies with registered tickers. Private issuers (Form D filers), individuals, funds without tickers, and inactive filers are NOT in this file. For those, use the full EDGAR company search or EFTS.
  - **Bioguide/congressional crosswalk:** There is no official SEC EDGAR crosswalk to congressional bioguide IDs. Matching politically active donors to Form 4 filers or Form D issuers requires name-matching heuristics (name + state + employer) or external datasets — no native cross-reference exists.
  - **CIK numbering has no meaning:** CIKs are assigned sequentially as filers register; the number itself carries no information about the entity type, size, or industry.

---

### Canonical URL format

- **Primary entity page URL format:**
  `https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK={CIK}&type=&dateb=&owner=include&count=40`
  Example (Apple): `https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0000320193`
  Or the cleaner direct landing page (newer): `https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=320193&type=&dateb=&owner=include&count=40`

- **Filing index URL format (preferred for citation):**
  `https://www.sec.gov/Archives/edgar/data/{CIK}/{accession_no_dashes}/{accession_no}-index.htm`
  Example: `https://www.sec.gov/Archives/edgar/data/320193/000032019324000123/0000320193-24-000123-index.htm`
  Note: CIK in archive path does NOT require leading zeros.

- **Filing document URL format:**
  `https://www.sec.gov/Archives/edgar/data/{CIK}/{accession_no_dashes}/{filename}`
  Example: `https://www.sec.gov/Archives/edgar/data/320193/000032019324000123/aapl-20240928.htm`

- **EDGAR full-text search URL format (EFTS UI):**
  `https://efts.sec.gov/LATEST/search-index?q={query}&forms={form_type}&dateRange=custom&startdt={YYYY-MM-DD}&enddt={YYYY-MM-DD}`
  Human-readable search UI: `https://efts.sec.gov/LATEST/search-index` (redirects to `https://www.sec.gov/cgi-bin/srqsb` or `https://efts.sec.gov/LATEST/search-index`)
  EDGAR search portal: `https://www.sec.gov/edgar/search/`

- **URLs to AVOID citing:**
  - `https://www.sec.gov/cgi-bin/browse-edgar` URLs (dynamically generated, not stable; parameters change; not bookmarkable for specific filings)
  - Any URL containing a session token or `&action=getcompany` with transient parameters — these may not resolve consistently
  - `https://www.sec.gov/data/...` paths for ticker files (the `/data/` path has been deprecated; use `/files/` instead: `https://www.sec.gov/files/company_tickers.json`)
  - Direct archive `.txt` complete submission files (`0001234567-24-001234.txt`) — these are SGML bundles, not human-readable; cite the `-index.htm` page instead
  - `efts.sec.gov` direct API URLs in end-user citations (use the `efts.sec.gov/LATEST/search-index` API for programmatic use, but cite the human-readable `www.sec.gov/cgi-bin/srqsb` or `edgar/search/` URL for citations)

---

### Known quirks / gotchas

1. **Submissions API parallel array structure:** The `filings.recent` object does NOT return an array of filing objects. Instead, it returns an object where each key (`form`, `filingDate`, `accessionNumber`, etc.) is a parallel array of the same length. To reconstruct a filing record, zip the arrays by index. This is intentional for compactness but trips up many first-time users.

2. **Older filings require extra fetches:** If a company has more than 1,000 filings (or more than 1 year's worth), the `filings.files` array in the submissions JSON contains additional JSON filenames (e.g., `CIK0001318605-submissions-001.json`). These must be fetched from `https://data.sec.gov/submissions/` individually to get complete filing history. Many users miss this and assume the initial response is comprehensive.

3. **DEF 14A has no XBRL:** Proxy statements (DEF 14A) are NOT tagged in XBRL. Board compensation tables, director biographies, and governance data exist only as unstructured HTML/text. Use EFTS full-text search to locate filings, then parse the HTML directly.

4. **Form 4 is XML, not HTML:** Form 4 (insider trading) filings are submitted as machine-readable XML. The human-readable version is rendered from the XML by EDGAR. For bulk processing, fetch the `.xml` document directly from the filing index; do not rely on the rendered HTML.

5. **Form D full-text search caveat:** Form D filings are XML files. EFTS indexes the text content of XML elements but does not associate element names with values. Searching `"Hedge Fund" AND "Pooled Investment Fund"` in Form D works because those strings appear in XML element values, but you cannot query structured fields (e.g., `totalOfferingAmount > 1000000`) through EFTS. For structured Form D queries, use the DERA Form D Data Sets at `https://www.sec.gov/data-research/sec-markets-data/form-d-data-sets`.

6. **EFTS `forms` parameter is case-sensitive and uses exact form type strings:** Use `DEF+14A` (URL-encoded space as `+`), `4`, `10-K`, `10-Q`, `D`, etc. Amended forms have separate types: `DEF+14A/A`, `4/A`, `10-K/A`. You must include both base and amended types if you want complete coverage.

7. **EFTS returns max 10,000 results per query:** If your search matches more than 10,000 filings, narrow with date ranges (iterate month by month) or additional filters. The `hits.total.value` field tells you the true count; the `relation` field (`"eq"` vs `"gte"`) tells you if the count is exact.

8. **EFTS does not support stop words:** Common words (`the`, `is`, `at`, `which`, `on`) are not indexed and will be ignored in searches. Searching for exact names is generally reliable; searching for common phrases may miss variations.

9. **`company_tickers_exchange.json` path changed:** The old path `https://www.sec.gov/data/company_tickers_exchange.json` is deprecated. The current path is `https://www.sec.gov/files/company_tickers_exchange.json`. A redirect is in place but do not hardcode the old path. Same applies to `company_tickers_mf.json`.

10. **data.sec.gov does not support CORS:** Client-side JavaScript in browsers cannot directly call `data.sec.gov` API endpoints due to CORS restrictions. Server-side proxy required for web applications.

11. **EDGAR filing lag for late-day submissions:** Filings submitted to EDGAR between 5:30 PM and 10:00 PM ET (or the 10:00 PM cutoff for Forms 3/4/5) may not appear in that day's index files. They will appear the following business day. Real-time monitoring via the RSS feed at `https://www.sec.gov/cgi-bin/browse-edgar?action=getcurrent&type=4&dateb=&owner=include&count=40&output=atom` is more reliable than daily index files for time-sensitive tracking.

12. **Accession number leading zeros and filer agent CIK:** Many filings are submitted by large filing agents (Donnelley Financial = `0001193125`; EDGAR Online = `0000313828`). The first 10 digits of the accession number will be the agent's CIK, not the company's. Always verify the company CIK from the filing index or submissions API.

---

### Quality signals

- **Freshness indicator:** Check `filings.recent.filingDate[0]` in the submissions response — this is the most recent filing date. For active public companies, this should be within 90 days.
- **XBRL data completeness:** The `companyfacts` response may be sparse or empty for companies that recently went public, use custom taxonomies, or have inconsistently tagged historical filings. Cross-check using `Revenues` vs `RevenueFromContractWithCustomerExcludingAssessedTax` — companies use different tags for equivalent concepts.
- **Form 4 reporting delay:** Insiders are required to file Form 4 within 2 business days of a transaction. Late filings (filed more than 2 days after the transaction date) indicate possible compliance issues. Check `filingDate` vs `reportDate` in the filing index.
- **DEF 14A completeness signal:** A company that files a DEF 14A but no 10-K (or vice versa) is unusual; may indicate a shell company, merger target, or regulatory anomaly.
- **Entity type inference:** If the CIK is for an individual (e.g., a Form 4 reporting owner), the `submissions` API will show `entityType: "person"` or similar, and the `filings.recent` array will contain only ownership forms (3, 4, 5, SC 13G, etc.), not 10-K/10-Q.

---

### Fallback sources

| Use case | Fallback |
|---|---|
| Structured Form D data (with field-level filtering) | [SEC DERA Form D Data Sets](https://www.sec.gov/data-research/sec-markets-data/form-d-data-sets) — quarterly downloads with parsed XML fields |
| Pre-2001 full-text search (filings 1993–2000) | [EDGAR Boolean Archive Search](https://efts.sec.gov/LATEST/search-index) does NOT cover pre-2001. Use quarterly index files at `https://www.sec.gov/Archives/edgar/full-index/{YEAR}/QTR{N}/` and fetch raw filing text directly |
| Investment adviser data (Form ADV) | [IAPD – SEC Investment Adviser Public Disclosure](https://www.adviserinfo.sec.gov) — not on EDGAR |
| Municipal bond issuers | MSRB EMMA system — not on EDGAR |
| Non-XBRL financial extraction (pre-2009) | Parse HTML/text filing documents directly; no structured API exists |
| Bulk insider trading data (Form 4) | DERA data sets or bulk download of daily SGML feeds at `https://www.sec.gov/Archives/edgar/Feed/` |
| CIK-to-bioguide crosswalk for political research | No official source. Manual matching required using name + employer data from FEC filings cross-referenced with bioguide or VoteSmart; OpenSecrets maintains some such mappings |
| CUSIP-to-CIK mapping | No official EDGAR endpoint. Third-party: Bloomberg, Refinitiv, or OpenFIGI API |

---

### Recent changes / deprecations (2024–2026)

**EDGAR Next (adopted September 27, 2024; full compliance required December 19, 2025):**
- Affects *filers* (submitters), not data consumers. If your use case is read-only research (accessing public filings), EDGAR Next does NOT affect you.
- Mandatory for filers: individual Login.gov credentials with MFA replace shared CCC/passphrase system. All filers must have enrolled by December 19, 2025, or they must submit a new Form ID to regain access.
- New optional machine-to-machine filer APIs (15 new endpoints) allow programmatic submission, status checking, and account management — these are for submitting filings, not consuming public data.
- Timeline: Beta opened September 30, 2024; new platform live March 24, 2025; legacy system discontinued September 15, 2025; grace period through December 19, 2025.
- Source: [SEC press release 2024-155](https://www.sec.gov/newsroom/press-releases/2024-155)

**`company_tickers_exchange.json` and `company_tickers_mf.json` path migration (noted in 2024 documentation update):**
- Old path: `https://www.sec.gov/data/company_tickers_exchange.json`
- New canonical path: `https://www.sec.gov/files/company_tickers_exchange.json`
- A redirect exists from the old path, but update any hardcoded references.

**Rate control enforcement (effective July 27, 2021, still in force as of 2026):**
- 10 requests/second hard cap; no daily limit. IP-level blocking for violations, typically lasting ~10 minutes.

**SEC API documentation page update (April 8, 2025):**
- The canonical API documentation page at `https://www.sec.gov/edgar/sec-api-documentation` was last updated April 8, 2025. No new public read API endpoints were added; the additions were all filer-side submission APIs under EDGAR Next.

**XBRL inline tagging expansion:**
- Inline XBRL (iXBRL) is now the required format for financial statements in 10-K and 10-Q filings for all filers. This improves machine-readability but the `data.sec.gov` API already handles the extraction — no change required for API consumers.

**No deprecations to core read APIs as of April 2026:**
- `data.sec.gov/submissions/`, `data.sec.gov/api/xbrl/`, and `efts.sec.gov/LATEST/search-index` are all active and current. The `cgi-bin/browse-edgar` legacy search remains functional but is not being actively improved.

---

### Known incidents (our vault)

**No major incidents to date.** SEC EDGAR is reliable but requires a descriptive User-Agent header identifying the caller. Requests without User-Agent are blocked.

**Vault convention:** Use CIK (10-digit zero-padded) for entity lookup. Canonical citation URL for filing history is the `browse-edgar` endpoint, not individual filing archives.

**Form type strictness:** Filing type codes are strict — `10-K` not `10K`, `SC 13D/A` not `13DA`. If a profile's `sec-form-types` field contains freeform text instead of valid form codes, it's probably a data quality issue.

## GovTrack.us API
**Last verified:** 2026-04-10

### Identity
- **What it is:** Free, open-access REST API for U.S. Congressional data operated by GovTrack.us (Civic Impulse, LLC), running as a Django/Haystack/Tastypie-style `simplegetapi` service behind nginx.
- **What it covers:** All U.S. Congress members (historical back to the 1st Congress), roll-call votes (113,000+), bills (427,000+), committee memberships, and cosponsorships. Vote data goes back to 1789 via VoteView/keithpoole data; modern votes (1973+) sourced directly from house.gov and senate.gov. Current 119th Congress (2025–2027) data is live.
- **Tier classification:** Free public API — no API key, no registration required.
- **Authoritative?** Semi-authoritative. GovTrack aggregates from official sources (house.gov, senate.gov, congress.gov/GovInfo) and the [unitedstates/congress](https://github.com/unitedstates/congress) community scrapers. Not itself an official government source. For voting records, the underlying roll-call data is sourced directly from chamber clerk XML files. Bioguide IDs cross-reference to the official [Biographical Directory of the U.S. Congress](https://bioguide.congress.gov/).
- **Data freshness:** Votes typically appear within hours of the chamber publishing XML. The `generated-at` response header shows when a cached response was last generated. The nginx proxy caches all 200 responses for **3 hours** (`proxy_cache_valid 200 3h`), so vote results may lag by up to 3 hours. Bill status can lag further depending on scraper run cadence.
- **Known staleness risk:** The 3-hour nginx cache is the primary staleness vector. Append `?nocache=1` to bypass it (confirmed via `proxy_no_cache $arg_nocache` in nginx.conf). The `generated-at` response header is always present and can be checked to assess cache age.

---

### API access
- **Base URL:** `https://www.govtrack.us/api/v2/`
- **Auth:** None. No API key, no OAuth. Open access.
- **Rate limit:** **15 requests/second per IP**, burst of 20. Returns HTTP 429 on excess. Enforced by nginx `limit_req` (confirmed in `conf/nginx.conf`). No documented daily/monthly quota. No published per-endpoint limits. Be conservative; the server runs on Ubuntu with gunicorn and is not infinitely scalable.
- **Pagination:** Offset/limit style.
  - `?limit=N` — number of records (no documented hard cap; tested up to 600 successfully; response time degrades at high values).
  - `?offset=N` — zero-based offset.
  - Response envelope: `{"meta": {"limit": N, "offset": N, "total_count": N}, "objects": [...]}`.
  - Iterate by incrementing `offset` by `limit` until `offset >= total_count`.
- **User-Agent / headers required:** None required. The API returns `Access-Control-Allow-Origin: *` (open CORS). Standard `curl` and HTTP client behavior works fine. Do not send `?nocache=1` on every request in production — it bypasses the caching layer and increases server load.

---

### Core endpoints

| Endpoint | Purpose | Key params | Response shape highlights |
|---|---|---|---|
| `GET /api/v2/person` | List/filter all legislators (historical + current) | `q=` (full-text), `firstname=`, `lastname=`, `bioguideid=`, `limit=`, `offset=` | `objects[].link` encodes integer ID at end of URL path; `bioguideid`, `osid` (OpenSecrets), `cspanid`, `twitterid` fields present |
| `GET /api/v2/person/{id}` | Fetch single person by GovTrack integer ID | Path param: integer ID (e.g., `400314`) | Same fields as list endpoint; **no explicit `id` field** — must parse from `link` URL |
| `GET /api/v2/person/search/` | Full-text name search | `q=` (required) | Same envelope and fields as `/person`; uses different search path and does **not** have the offset-3 bug |
| `GET /api/v2/role` | List/filter congressional roles (service terms) | `current=true` (active members), `party=`, `state=`, `role_type=senator\|representative`, `person=` (integer ID), `limit=`, `offset=` | `person` sub-object embedded; `congress_numbers[]`, `startdate`, `enddate`, `party`, `district`, `senator_class`, `extra.address` |
| `GET /api/v2/vote` | List/filter roll-call votes | `congress=`, `chamber=house\|senate`, `session=`, `number=`, `category=`, `sort=-created` for newest first | `link` field contains canonical vote URL; `question`, `result`, `passed`, `total_plus`, `total_minus`, `total_other`, `source` (`house`/`senate`/`keithpoole`) |
| `GET /api/v2/vote/{id}` | Fetch single vote by GovTrack integer ID | Path param: integer vote ID (e.g., `128564`) | Full vote object with embedded `related_bill` |
| `GET /api/v2/vote_voter` | Individual member vote records | `vote=` (integer vote ID), `person=` (integer person ID), `limit=`, `offset=` | `option.key`: `+` = Aye/Yea, `-` = No/Nay, `0` = Not Voting, `P` = Present; `voter_type` field; `person` and `person_role` sub-objects embedded |
| `GET /api/v2/bill` | List/filter bills and resolutions | `congress=`, `bill_type=house_bill\|senate_bill\|house_resolution\|senate_resolution\|house_joint_resolution\|senate_joint_resolution\|house_concurrent_resolution\|senate_concurrent_resolution`, `number=`, `current_status=`, `is_current=true` | `sponsor` sub-object embedded; `display_number`, `introduced_date`, `current_status_label`, `is_alive`, `related_bills[]` |
| `GET /api/v2/cosponsorship` | List cosponsor records | `person=` (integer ID), `bill=` (integer bill ID), `limit=`, `offset=` | `joined`, `withdrawn` (nullable), `person`, `bill`, `role` (integer role ID) |
| `GET /api/v2/committee` | List/filter committees | `committee_type=senate\|house\|joint`, `obsolete=false` | `code` (e.g., `SSGA`), `name`, `jurisdiction`, `obsolete` |
| `GET /api/v2/committee_member` | Current committee memberships | `committee=` (committee code), `person=` (integer ID) | `person` sub-object embedded; `role` (chair/ranking/member) |

---

### Identifiers
- **Primary ID:** GovTrack integer person ID — an internal database integer (e.g., `400314` for Nancy Pelosi, `300025` for Susan Collins). **Not exposed as an explicit `id` field in API responses.** Must be extracted from the trailing integer in the `link` field: `https://www.govtrack.us/congress/members/{name-slug}/{id}`.
  - Senate members tend to use IDs in the `3xxxxx` range.
  - House members (post-2000 era) tend to use IDs in the `4xxxxx` range.
  - Newer members use IDs in the `4xxxxx–45xxxx` range (e.g., `456920` for Rep. LaLota, elected 2022).
- **Secondary IDs (all present on person objects):**
  - `bioguideid` — Bioguide ID (e.g., `P000197`); the standard cross-reference to the official [Biographical Directory](https://bioguide.congress.gov/). **Most reliable cross-reference.**
  - `osid` — OpenSecrets candidate ID (e.g., `N00007360`); starts with `N`, 8 digits.
  - `cspanid` — C-SPAN person ID (integer).
  - `twitterid` — Twitter/X username (string, may be null or outdated).
  - `youtubeid` — YouTube channel name (string, may be null).
  - `fediverse_webfinger` — Mastodon/ActivityPub webfinger address (added ~2022; almost universally null as of 2026).
  - `pvsid` — Project Vote Smart ID (deprecated/null for most records as of 2024+; PVS shut down).
- **How to look up an entity:**
  1. **By name:** `GET /api/v2/person/search/?q={name}` — uses full-text search, returns best match. Works correctly for any name length.
  2. **By bioguide ID:** `GET /api/v2/person?bioguideid={id}` — filter parameter; reliable cross-reference lookup. **Note: returns empty `objects[]` if limit ≤ 3 due to the offset-3 bug (see below); use `limit=4` or higher.**
  3. **By GovTrack integer ID:** `GET /api/v2/person/{id}` — direct single-record fetch, always works.
  4. **Current members only:** `GET /api/v2/role?current=true` — returns all 540 current roles; no offset bug (uses ORM, not Haystack).
- **Known ID gotchas:**
  - **The 0/0 offset bug (person endpoint):** `GET /api/v2/person?limit=N` silently skips the first 3 results of every Haystack result set. With `limit=1`, `limit=2`, or `limit=3`, `objects` is always empty despite `total_count` being non-zero. With `limit=4`, only 1 result is returned (the 4th). This is a bug in how the person Haystack search backend calculates slice boundaries, not a caching issue per se — though a stale nginx cache (up to 3 hours) can freeze this broken response.
    - **Workaround 1:** Always use `limit ≥ 4` when paginating `/api/v2/person`. Treat returned count as `limit - 3`.
    - **Workaround 2:** Use `/api/v2/person/search/?q={query}` for name-based lookups (does not exhibit the bug).
    - **Workaround 3:** Use `/api/v2/role?current=true` for current-member lookups (ORM endpoint, no bug).
    - **Workaround 4:** Fetch by integer ID directly: `/api/v2/person/{id}` always works.
    - The `bill` endpoint also uses Haystack but does **not** exhibit this bug. Only the `person` Haystack index is affected.
  - The `pvsid` field is null for virtually all records post-2024 (Project Vote Smart suspended operations).
  - The `vote` and `vote_voter` endpoints expose integer IDs only through direct URL access (`/api/v2/vote/{id}`) or the `vote` field in vote_voter records — not as a named `id` field in list responses.

---

### Canonical URL format
- **Primary entity page URL format:**
  - Person: `https://www.govtrack.us/congress/members/{firstname-lastname}/{govtrack-id}` (e.g., `https://www.govtrack.us/congress/members/nancy_pelosi/400314`)
  - Vote: `https://www.govtrack.us/congress/votes/{congress}-{year}/{chamber-letter}{number}` (e.g., `https://www.govtrack.us/congress/votes/119-2026/h108`)
  - Bill: `https://www.govtrack.us/congress/bills/{congress}/{bill-type-abbr}{number}` (e.g., `https://www.govtrack.us/congress/bills/119/hr1`)
  - All are present in the `link` field of API responses.
- **Search URL format:**
  - Members: `https://www.govtrack.us/congress/members/current` or `https://www.govtrack.us/congress/members/all`
  - Votes: `https://www.govtrack.us/congress/votes`
  - Bills: `https://www.govtrack.us/congress/bills`
- **URLs to AVOID citing:**
  - Do not cite the old `/person/{id}` path (redirects but non-canonical).
  - Do not cite any `/states/` paths — state-level legislative tracking was discontinued August 2015 (redirects to blog post).
  - The `/developers/api` and `/developers` pages return HTTP 403 (blocked by robots/server rules) — do not reference these as documentation links; the API has no publicly accessible HTML docs page as of 2026.

---

### Known quirks / gotchas
1. **Person endpoint offset-3 bug:** As described above — `objects[]` is always 3 items short. Always use `limit ≥ 4` or use `/person/{id}` or `/person/search/`.
2. **nginx 3-hour response cache:** All API responses are cached at the nginx layer for up to 3 hours. Append `?nocache=1` to bypass. The `generated-at` response header (e.g., `generated-at: 2026-04-10T12:04:16.604922`) shows when the cached response was generated. Stale caches can return incorrect data (e.g., a vote result that hasn't been refreshed).
3. **Person endpoint: no explicit `id` field.** The integer person ID must be extracted from the `link` field using a regex like `/(\d+)$`.
4. **Vote endpoint: no explicit `id` field either.** The integer vote ID is present only in vote_voter records (as `option.vote`) and accessible via direct path `/api/v2/vote/{id}`. To find a vote ID, filter by `congress`, `chamber`, `session`, `number`.
5. **`bill` endpoint also uses Haystack** but without the offset-3 bug. Bill queries with `q=` do full-text search.
6. **`person?q=` vs `/person/search/?q=`:** The `/api/v2/person?q=Biden` form does full-text search through Haystack (subject to offset-3 bug when `limit ≤ 3`). The `/api/v2/person/search/?q=Biden` form returns broader fuzzy results and avoids the offset bug entirely.
7. **`pvsid` is defunct.** Project Vote Smart IDs (`pvsid` field) are null for essentially all records. Do not attempt to cross-reference.
8. **Voter type field:** `vote_voter` records have a `voter_type` field that distinguishes regular members from paired votes. Historical votes (pre-1973) sourced from VoteView/keithpoole have `source: "keithpoole"` and may have `voteview_extra_code` set.
9. **`fediverse_webfinger`:** Added to the person schema circa 2022. Null for almost all members as of April 2026.
10. **HTTP 400 on unrecognized parameters:** The API returns `400 Bad Request` (with a plain 32-byte HTML response) if an unknown query parameter is passed (confirmed: `?_nocache=1` returns 400; use `?nocache=1` not `?_nocache=1`).
11. **Amendment endpoint:** `/api/v2/amendment` returns 404 — amendments are **not** exposed via the v2 API. The `related_amendment` field in vote records contains an integer amendment ID but there is no corresponding API endpoint to look them up.
12. **Rate limiting returns 429, not 503.** The nginx `limit_req_status 429` directive ensures overloaded requests get 429 Too Many Requests, not a generic server error.

---

### Quality signals
- **Coverage completeness:** ~12,794 persons (all historical + current members), ~113,331 votes, ~427,803 bills as of April 2026. Complete historical coverage.
- **Vote data source quality:** Modern votes (post-1973) come directly from house.gov and senate.gov clerk XML files (`source: "house"` or `source: "senate"`). Historical votes carry `source: "keithpoole"` (VoteView.com) and are complete but may lack individual voter records for some early congresses.
- **`missing_data` flag:** The `vote` object has a `missing_data: true` flag when individual vote records are known to be incomplete. Check this before relying on vote_voter totals.
- **Person record quality:** Bioguide IDs present for virtually all members. OpenSecrets IDs (`osid`) present for most modern members. Twitter/YouTube IDs often stale for retired members.
- **Data is current through the 119th Congress** (Jan 2025 – Jan 2027). As of April 2026, latest House vote indexed is H.Res. 1142 (March 27, 2026); latest Senate vote is a cloture motion (March 26, 2026).
- **Bulk data download:** Static Django fixture files available at `https://www.govtrack.us/data/db/`:
  - `django-fixture-people.json` (~22 MB, updated regularly — last update 25 Mar 2026 confirmed)
  - `django-fixture-committees.json` (~559 KB)
  - `django-fixture-billterms.json` (static, 2016)

---

### Fallback sources
- **[congress-legislators (unitedstates/congress-legislators)](https://github.com/unitedstates/congress-legislators):** YAML/JSON files on GitHub maintained by the open government community. Contains bioguide, FEC, OpenSecrets, and other cross-reference IDs. The authoritative source for legislator identity data that GovTrack itself sources from. Use this for bulk ID crosswalks.
- **[ProPublica Congress API](https://projects.propublica.org/api-docs/congress-api/):** Free API (requires key) with overlapping coverage. More comprehensive for committee votes, party loyalty scores.
- **[congress.gov API](https://api.congress.gov/):** Official Library of Congress API. Authoritative for bill text, status, and amendments. Requires free API key registration.
- **[VoteView.com API](https://voteview.com/data):** Source for historical vote ideology scores (DW-NOMINATE). GovTrack pulls historical data from VoteView.
- **[OpenFEC API](https://api.open.fec.gov/):** FEC campaign finance data; cross-references to GovTrack `osid` field.

---

### Recent changes / deprecations
- **2024–2026 confirmed active:** API endpoints confirmed live as of April 10, 2026. No deprecation notices or versioning changes observed. The API has been at `/api/v2/` since at least 2014 with no v3 announced.
- **`fediverse_webfinger` field added (2022+):** Present in all person/role objects; appears in API schema but is null for all current members as of April 2026.
- **`pvsid` effectively deprecated (2024):** Project Vote Smart shut down in 2023; the `pvsid` field remains in the schema but is null for essentially all records.
- **Django/Python version bumps (2022–2024):** The govtrack.us-web repo shows migration from Python 3.8/Django 3.x to Python 3.8+/Django 4.1. No API-breaking changes observed in endpoint behavior.
- **State legislature tracking discontinued (August 2015):** Any `/states/` URLs redirect to a blog post. Not relevant to federal congressional data.
- **No `/api/v1/` (old Sunlight Foundation API):** The original Sunlight Foundation Congress API that GovTrack previously relied on was shut down; GovTrack's own v2 API has been the sole interface since ~2014.
- **`/developers/api` page inaccessible (2025+):** The official HTML API documentation page now returns a robots/server block error. The API itself remains functional; use this cheatsheet and the live API as the documentation source.
- **Nginx AI-block list added (2025):** The nginx config includes an `ai-block-list.conf` include, suggesting some AI crawler user-agents may be blocked. Use a standard browser or curl User-Agent.

---

### Known incidents (our vault)

**Stale cache + impossible state bug (fixed 2026-04-10 at engine layer, commit `bc24819`):** The pipeline was serving stale cached data even when the cache contained impossible states. Cori Bush's profile showed `auto:govtrack` with 0 bills sponsored / 0 cosponsored while her frontmatter correctly showed 39/756. The cache had never been invalidated because the enrichedKey lock prevented refetch.

**Engine fix:** If cached result has `votes > 0` but `bills == 0 AND cosponsored == 0`, the pipeline now refetches. Frontmatter re-enrichment for profiles with `bills-sponsored: 0` breaks the enrichedKey lock.

**Related fix:** Chamber filter added — non-congressional politicians (governors, candidates, cabinet, SCOTUS) no longer get GovTrack auto-blocks.

**Quality check rule:** If a profile's `auto:govtrack` shows 0 bills but frontmatter says bills exist, OR if total votes cast > 0 but bills sponsored + cosponsored == 0, the cache is stale. Strip the block and await fresh pipeline run.

---

**Nickname lookup bug — legal-name-only matching (fixed 2026-04-11):** GovTrack's `/person?q=` endpoint does strict full-string matching against legal names. Searching `q=Jim Risch` returned **0 results** even though GovTrack stores him as "James Risch" (ID 412322); `q=Risch` alone returns 1 result. Every senator/rep whose vault profile uses a nickname that differs from their legal first name was silently dropped: Jim/James, Bill/William, Bob/Robert, Dick/Richard, Joe/Joseph, Mike/Michael, Chuck/Charles, Tom/Thomas, etc.

**Engine fix:** `searchPerson()` in `scripts/govtrack-pipeline.cjs` now queries by last name only (`q=Risch&limit=40`) and performs nickname-aware matching locally via a `NICKNAMES` lookup table and a `firstNamesMatch()` helper that also accepts 3-character prefix matches. Falls back to a full-name query only if the last-name query returns nothing (unusual surname case).

**Quality check rule:** After a full GovTrack pipeline run, scan for sitting members-of-congress profiles with `auto:govtrack` either missing or showing 0 bills/0 cosponsored/0 votes. If any senator or currently-serving rep is in that bucket, the first thing to test is whether their vault profile uses a nickname — add the nickname to the `NICKNAMES` table in `scripts/govtrack-pipeline.cjs` if so.

## FARA (Foreign Agents Registration Act)
**Last verified:** 2026-04-10

### Identity
- **What it is:** DOJ/NSD database of persons and entities registered as agents of foreign principals under the Foreign Agents Registration Act of 1938. Administered by the FARA Unit within the Counterintelligence and Export Control Section (CES) of the National Security Division. Public disclosure registry — every document filed is a public record.
- **What it covers:** Foreign agent registrations (primary registrant firms/individuals), individual short-form filers (employees/partners of registered firms), and foreign principals (foreign governments, political parties, individuals, and organizations on whose behalf the agent acts). Also covers all filed documents: Registration Statements, Supplemental Statements (semi-annual activity reports), Exhibit AB (contract), Informational Materials, Amendments, and Short-Form filings.
- **Tier classification:** Tier 1 — primary government source; authoritative disclosure registry with no intermediary.
- **Authoritative?** Yes. Filings are submitted directly to DOJ under penalty of law (22 U.S.C. §§ 611–620). The eFile system is the official system of record.
- **Data freshness:** Bulk data files updated daily. API reflects the same underlying dataset. New registrants must file within 10 days of agreeing to act as an agent; Supplemental Statements (activity reports) filed semi-annually. MFA migration completed February 6, 2026 — no impact on public API access.
- **Known staleness risk:** Registrants sometimes file late. Short-form individuals may appear in bulk CSV/XML but not resolve via the API for registrations that have not yet been fully processed. The API's `ShortFormRegistrants` and `ForeignPrincipals` per-registrant endpoints intermittently return `{ Success: false, Message: "Error loading API - Unable to retrieve data set" }` for some valid registration numbers — this is a server-side bug, not an auth issue. Use bulk data as the reliable alternative for completeness.

### API access
- **Base URL:** `https://efile.fara.gov` (all API paths prefixed here; e.g., `https://efile.fara.gov/api/v1/Registrants/json/Active`)
- **Auth:** None. All public endpoints require no API key, no token, no login. (The MFA/DOJ Login change as of February 6, 2026 affects only the eFile submission system for registrants — not the public read API.)
- **Rate limit:** 5 requests per 10-second rolling window, shared across all endpoints. Exceeding returns HTTP 429 `"Request rate too high"`. The window is not clock-aligned; add ~2-second delays between calls to be safe.
- **Pagination:** None. All list endpoints return the complete dataset in a single response (e.g., `/Registrants/json/Active` returns all ~559 active registrants at once; `/Registrants/json/Terminated` returns all ~6,483 terminated registrants). No `page`, `offset`, or cursor parameters exist. For large polling workflows, prefer the bulk data ZIP downloads.
- **User-Agent / headers required:** None required. Standard `curl` user-agent accepted. Response `Content-Type` is `application/json;charset=ISO-8859-1`. **Encoding gotcha:** response body is iso-8859-1 (ANSI), not UTF-8 — decode accordingly or use XML endpoint if character encoding matters for non-ASCII names.

### Core endpoints

| Endpoint | Purpose | Key params | Response shape highlights |
|---|---|---|---|
| `GET /api/v1/Registrants/json/Active` | All active primary registrants | none | `{"REGISTRANTS_ACTIVE":{"ROW":[{Registration_Number, Name, Address_1, Address_2, City, State, Zip, Registration_Date}]}}` |
| `GET /api/v1/Registrants/json/Terminated` | All terminated primary registrants | none | Same shape + `Termination_Date` field; key is `REGISTRANTS_TERMINATED` |
| `GET /api/v1/Registrants/json/New?from=MM-DD-YYYY&to=MM-DD-YYYY` | Registrants by registration date range | `from`, `to` (both required, MM-DD-YYYY format) | Same shape as Active; useful for incremental polling |
| `GET /api/v1/ForeignPrincipals/json/{Active\|Terminated}/{registrationNumber}` | Foreign principals for a specific registrant | `registrationNumber` (integer, path param) | `{"ROWSET":{"ROW":{REG_NUMBER, FP_NAME, COUNTRY_NAME, CITY, STATE, ADDRESS_1, ADDRESS_2, REG_DATE, FP_REG_DATE, REGISTRANT_NAME}}}` — single principal returns object; multiple returns array |
| `GET /api/v1/ShortFormRegistrants/json/{Active\|Terminated}/{registrationNumber}` | Individual short-form filers (employees/partners) for a registrant | `registrationNumber` (integer, path param) | `{"ROWSET":{"ROW":[{REG_NUMBER, SF_FIRST_NAME, SF_LAST_NAME, REGISTRANT_NAME, SHORTFORM_DATE, REG_DATE, ADDRESS_1, ADDRESS_2, CITY, STATE, ZIP}]}}` |
| `GET /api/v1/RegDocs/json/{registrationNumber}` | All filing document metadata + PDF URLs for a registrant | `registrationNumber` (integer, path param); optional `country` and `docType` query params (currently broken — return 500) | `{"ROWSET":{"ROW":[{DATE_STAMPED, REGISTRATION_NUMBER, REGISTRANT_NAME, DOCUMENT_TYPE, FOREIGN_PRINCIPAL_NAME, FOREIGN_PRINCIPAL_COUNTRY, SHORT_FORM_NAME, URL}]}}` — URL points to PDF at `https://efile.fara.gov/docs/` |

**Format variants:** Every endpoint accepts `json`, `csv`, `xml`, or `html` in the path segment (e.g., `/api/v1/Registrants/csv/Active`). JSON is recommended. CSV/XML are iso-8859-1 encoded. The `RegDocs` JSON endpoint issues an HTTP 302 redirect internally before returning data — always follow redirects (`curl -L` or equivalent).

**Document types returned by RegDocs:** `Registration Statement`, `Amendment`, `Exhibit AB`, `Exhibit C`, `Supplemental Statement`, `Short-Form`, `Informational Materials`

### Identifiers
- **Primary ID:** `Registration_Number` — a plain integer (no leading zeros, no prefix). Range observed: 1–7712 as of April 2026. Current active max is 7712; new registrations are sequential. Example: `3718` for Holland & Knight.
- **Secondary IDs:** None in the API. Short-form individuals are identified by first + last name within their primary registrant's registration number (no separate numeric ID for individuals). Foreign principals have no standalone ID — they are anchored to the registrant's `Registration_Number`.
- **How to look up an entity:**
  1. Fetch `/api/v1/Registrants/json/Active` or `/Terminated` to get all registrants and their numbers (full list, no search by name).
  2. Match by name client-side (names are not normalized — expect abbreviations, d/b/a suffixes, and inconsistent capitalization).
  3. Then call `/api/v1/ForeignPrincipals/json/Active/{number}` and `/Terminated/{number}` to get their principals.
  4. Call `/api/v1/RegDocs/json/{number}` to get all filed documents.
  5. For individuals: call `/api/v1/ShortFormRegistrants/json/Active/{number}` or `/Terminated/{number}`.
- **Known ID gotchas:**
  - No name-search endpoint exists — you must download the full list and filter.
  - A single firm can have both active and terminated principals simultaneously. You must query both `Active` and `Terminated` variants of ForeignPrincipals to get a complete picture.
  - `Registration_Number` is returned as an integer (not a string) in JSON — some downstream parsers may coerce it to float if not typed carefully.
  - Some registration numbers that appear valid (present in the Registrants list) return `{ Success: false, Message: "Error loading API - Unable to retrieve data set" }` on the ShortFormRegistrants and ForeignPrincipals endpoints — this is a server-side inconsistency, not an auth or format error. Fall back to bulk data XML/CSV for those.

### Canonical URL format
- **Primary entity page URL format:** No stable deep-link URL exists for individual registrant profiles in the public-facing UI. The eFile portal home redirects to `https://efile.fara.gov/ords/fara/f?p=2000` (Oracle APEX session-based URLs), which are not linkable. Use the DOJ search at `https://efile.fara.gov/ords/fara/f?p=1235:10` (Search Filings by field) — but note this is also a session-based UI, not a stable permalink.
- **Search URL format:** `https://efile.fara.gov/ords/fara/f?p=1235:10` — Search Filings interface (by registrant number, document type, date range). Non-session-based search: Active Registrants by Country at `https://efile.fara.gov/ords/fara/f?p=185:11`.
- **PDF document URL format:** `https://efile.fara.gov/docs/{reg_number}-{DocType}-{YYYYMMDD}-{seq}.pdf` — e.g., `https://efile.fara.gov/docs/3718-Supplemental-Statement-20260330-48.pdf`. These are stable, direct-accessible public URLs (HTTP 200, no auth).
- **Bulk data download base:** `https://efile.fara.gov/ords/fara/r/fara_ws/api/bulkdata` — ZIP files available at `FARA_All_Registrants.csv.zip`, `FARA_All_RegistrantDocs.csv.zip`, `FARA_All_ShortForms.csv.zip`, `FARA_All_ForeignPrincipals.csv.zip`.
- **URLs to AVOID citing:** Session-based APEX URLs (any URL with `p=XXXX:` pattern other than the known stable search pages). Old format `https://efile.fara.gov/ords/f?p=135` (legacy FARA document search — still responds HTTP 200 but returns Oracle internal server error JSON). The `efile.fara.gov/api` path (returns 404 directly).

### Known quirks / gotchas
- **Not valid JSON for error responses:** The error response `{ Success: false, Message: "..." }` uses unquoted boolean `false` (JavaScript syntax), which is not valid JSON and will fail standard JSON parsers. Catch as text first and check before parsing.
- **Single-item vs. array inconsistency:** When a registrant has exactly one foreign principal or one short-form individual, the `ROW` field in the ROWSET is a JSON object. When there are multiple, it's a JSON array. Must handle both cases.
- **RegDocs requires redirect follow:** The `/api/v1/RegDocs/json/{number}` endpoint returns HTTP 302 before the actual data. Always use redirect-following HTTP clients. The redirect target is `https://efile.fara.gov/CallAPI/GetJSON?a=...`.
- **iso-8859-1 encoding:** JSON responses are encoded in iso-8859-1, not UTF-8. Non-ASCII characters in names (accented letters) may be garbled if decoded as UTF-8.
- **No entity search:** There is no full-text search, no fuzzy match, no name-based lookup in the API. You must download the full registrants list and match client-side.
- **Dates in two formats:** Registrant list dates are `MM/DD/YYYY` strings; ForeignPrincipals and ShortForm dates are ISO 8601 timestamps (`2026-02-05T00:00:00`). Normalize before comparing.
- **Active ≠ current activity:** "Active" status means the registration has not been formally terminated. A registrant may have no recent Supplemental Statements but still appear as Active.
- **MFA system change (February 6, 2026):** DOJ migrated the eFile submission system to DOJ Login with MFA. This does NOT affect the public read API — it only affects firms submitting filings.
- **Scheduled downtime:** DOJ performs periodic server maintenance (observed April 11–12, 2026 window). Plan for downtime windows.

### Quality signals
- **Coverage:** As of April 2026, ~559 active registrants and ~6,483 terminated registrants — this represents the complete population of FARA filers since 1938. Not a sample.
- **Completeness risk:** Some registrants use the LDA (Lobbying Disclosure Act) exemption and do NOT appear in FARA — they register with Congress instead. FARA primarily captures agents of foreign governments, political parties, and cases where the "principal beneficiary" is a foreign government.
- **Document availability:** The vast majority of filings since the mid-2000s are available as PDFs. Older documents may not be scanned or may require an in-person visit to the FARA Unit public office.
- **OpenSanctions cross-reference:** OpenSanctions ingests FARA bulk data weekly and maps it to FollowTheMoney entities — useful for entity deduplication and cross-source matching. As of 2026-03, OpenSanctions shows ~50,907 entities derived from FARA.
- **Data Rescue Project:** University of Maryland HCIJ archives FARA PDFs and CSVs daily as a continuity backup at `portal.datarescueproject.org` — useful if efile.fara.gov is down.

### Fallback sources
- **Bulk data ZIP files** (`https://efile.fara.gov/ords/fara/r/fara_ws/api/bulkdata`): More reliable than per-record API calls; updated daily; covers all records including those that return API errors per-endpoint.
- **OpenSanctions** (`https://www.opensanctions.org/datasets/us_fara_filings/`): Normalized FollowTheMoney JSON derived from FARA bulk XML; updated weekly; includes entity deduplication. Free for non-commercial use; commercial license required for business use.
- **DOJ Justice.gov FARA page** (`https://www.justice.gov/nsd-fara`): Primary landing page for regulatory context, semi-annual reports to Congress listing all active agents, enforcement actions, advisory opinions.
- **FARA Unit direct contact:** `fara.public@usdoj.gov` / (202) 233-0777 for documents not available online.

### Recent changes / deprecations
- **February 6, 2026 — MFA/DOJ Login migration:** The eFile submission portal now requires DOJ Login with MFA for all registrants filing documents. The public read API and bulk data repository are unaffected.
- **December 20, 2024 — Proposed NPRM:** DOJ published a Notice of Proposed Rulemaking to update FARA regulations for the first time since 2007. Key proposed changes: narrowing the commercial exemption, updating the legal representation exemption, modernizing informational materials labeling (including social media), requiring FARA registration number in conspicuous statements, and mandating eFile submission for informational materials. Public comment period closed March 3, 2025. Final rule not yet published as of April 2026 — regulatory changes pending.
- **API V1 status:** Still labeled "V1" with promises of additional endpoints "following the transition of FARA eFile registration to online forms-based collection." No V2 API has been released. The endpoint set has not changed since initial launch.
- **RegDocs country/docType query filters:** Documented as available on the RegDocs endpoint page but currently return `{ Success: false, Message: "Error loading API - Unable to retrieve data set" }` — treat as non-functional. Filter client-side from the unfiltered response instead.
- **eFile v4.0 launched:** The FARA eFile portal was upgraded to v4.0 (Oracle APEX-based). The previous document search at `https://efile.fara.gov/ords/f?p=135` now returns an Oracle internal server error. Use `https://efile.fara.gov/ords/fara/f?p=1235:10` for document search.

---

### Known incidents (our vault)

**Low volume in vault, high signal when present.** No major incidents to date. FARA data is relatively clean because the registration set is small and DOJ maintains the system directly.

**Vault convention:** Few profiles have FARA data (only entities actually registered as foreign agents). When present, treat as Tier 1 primary source and cite the FARA registration filing directly.

## GLEIF (Global LEI System)
**Last verified:** 2026-04-10

### Identity
- **What it is:** The Global Legal Entity Identifier Foundation (GLEIF) operates the Global LEI System — the authoritative, ISO 17442–compliant registry of Legal Entity Identifiers (LEIs). Every LEI record is issued and maintained by an accredited Local Operating Unit (LOU). GLEIF aggregates all LOU data into the unified Golden Copy database, which backs the public API.
- **What it covers:** Legal entities worldwide that have registered for an LEI: corporations, LLCs, partnerships, funds, trusts, government entities, and other organizations that participate in financial transactions. As of Q1 2026, ~2.93 million active LEIs across all jurisdictions. Covers Level 1 data (legal name, registered address, HQ address, jurisdiction of incorporation, legal form, entity status, registration status, managing LOU) and Level 2 data (direct and ultimate parent/subsidiary relationships, reporting exceptions explaining why relationship data is absent). Also cross-maps BIC, ISIN, OpenCorporates IDs, and S&P Global IDs where available.
- **Tier classification:** Tier 1 — primary authoritative source. GLEIF is the single canonical registry for LEI data; no upstream source supersedes it for LEI-specific records.
- **Authoritative?** Yes, for LEI records and corporate ownership chains as self-reported by registrants. The underlying entity data is validated against official business registries (FULLY_CORROBORATED) or accepted as entity-supplied only (ENTITY_SUPPLIED_ONLY). GLEIF does not independently verify accuracy beyond cross-checking against registered business register IDs.
- **Data freshness:** Golden Copy database updated up to 10× daily by LOUs; three full Golden Copy snapshot exports published at 02:00, 10:00, and 18:00 UTC. The API reflects the most recent Golden Copy publication. The `meta.goldenCopy.publishDate` field in every API response shows the exact timestamp of the current data snapshot.
- **Known staleness risk:** Up to 24-hour lag between a LOU-side update and API reflection (LOUs may upload files up to 10× daily but on varying schedules). Annual renewal cycle means ~40% of LEIs may be LAPSED at any given time (renewal rate ~57% globally in Q4 2025, better in EU at ~61%). Self-reported parent relationships — entities may not file Level 2 data, or file a reporting exception. Only ~86.5% of Level 1 records are fully corroborated against a business register (Q4 2024). For political donor research: always check `registration.status`, `conformityFlag`, and whether parent data is present or only a reporting exception.

---

### API access
- **Base URL:** `https://api.gleif.org/api/v1`
- **Auth:** None. Fully open, no API key or registration required. No charge for use.
- **Rate limit:** 60 requests per minute per user (IP-based). Enforced for all users equally. Batch up to ~50 LEIs per request using comma-separated `filter[lei]` values to stay within limits.
- **Pagination:** `page[number]` (1-based) and `page[size]` (default 15, max not officially documented but works up to 100 in practice). Response `meta.pagination` object returns `currentPage`, `perPage`, `from`, `to`, `total`, `lastPage`. `links` object contains `first` and `last` page URLs.
- **User-Agent / headers required:** None required. Standard HTTP GET. Responses are `Content-Type: application/vnd.api+json` (JSON API specification). No special headers needed for public use.

---

### Core endpoints

| Endpoint | Purpose | Key params | Response shape highlights |
|---|---|---|---|
| `GET /lei-records` | Search/filter LEI records (Level 1) | `filter[lei]`, `filter[entity.legalName]`, `filter[fulltext]`, `filter[bic]`, `filter[isin]`, `filter[entity.legalAddress.country]`, `filter[entity.category]`, `filter[registration.status]`, `filter[owns]` (parent lookup), `filter[ownedBy]` (child lookup), `sort`, `page[number]`, `page[size]` | `data[]` array of `lei-records` objects; each has `attributes.lei`, `attributes.entity.*`, `attributes.registration.*`, `attributes.conformityFlag`, `attributes.ocid`, `attributes.bic`, `attributes.spglobal[]`; `relationships` object with links to parent/child/managing-lou endpoints |
| `GET /lei-records/{LEI}` | Direct lookup by LEI code | Path param: 20-char LEI | Single `data` object; same shape as above; `relationships` block shows which parent/child links are present (presence depends on whether Level 2 data has been reported) |
| `GET /lei-records/{LEI}/direct-parent` | Fetch the direct parent LEI record | Path param: LEI | Full `lei-records` object for the direct parent entity; absent if no relationship record (check for `reporting-exception` link instead) |
| `GET /lei-records/{LEI}/ultimate-parent` | Fetch the ultimate (top-of-tree) parent LEI record | Path param: LEI | Full `lei-records` object for ultimate parent; same caveat as above |
| `GET /lei-records/{LEI}/direct-parent-relationship` | Fetch the relationship record for the direct parent link | Path param: LEI | `relationship-records` object; `attributes.relationship.type` = `IS_DIRECTLY_CONSOLIDATED_BY`; `startNode.id` = child LEI, `endNode.id` = parent LEI; `registration.corroborationLevel` shows quality of evidence |
| `GET /lei-records/{LEI}/ultimate-parent-relationship` | Fetch the relationship record for the ultimate parent link | Path param: LEI | Same as above but `type` = `IS_ULTIMATELY_CONSOLIDATED_BY` |
| `GET /lei-records/{LEI}/direct-children` | List all direct-child LEI records | Path param: LEI; supports pagination | Array of `lei-records` for subsidiaries that have filed this entity as their direct parent |
| `GET /lei-records/{LEI}/ultimate-children` | List all ultimate-children LEI records | Path param: LEI; supports pagination | Array of all entities in the entire subtree for which this entity is the ultimate parent |
| `GET /lei-records/{LEI}/direct-parent-reporting-exception` | Fetch reporting exception if parent data is absent | Path param: LEI | Exception reason: `NO_KNOWN_PERSON`, `NON_PUBLIC`, `NATURAL_PERSONS`, `FUND_MANAGEMENT`, `LEGAL_OBSTACLES`, etc. Presence of this link (vs. `lei-record` link) under `relationships.direct-parent` tells you whether parent data exists |
| `GET /lei-records/{LEI}/ultimate-parent-reporting-exception` | Fetch reporting exception for ultimate parent | Path param: LEI | Same exception structure for ultimate parent |
| `GET /lei-records/{LEI}/managing-lou` | Fetch details of the LOU that manages this LEI | Path param: LEI | `lei-records` object for the LOU entity |
| `GET /lei-records/{LEI}/isins` | List ISINs associated with this LEI | Path param: LEI; supports pagination | Array of ISIN-LEI mapping objects |
| `GET /lei-records/{LEI}/field-modifications` | Audit trail of field-level changes | Path param: LEI | Array of change events with field, old value, new value, timestamp |
| `GET /fuzzycompletions` | Fuzzy name/fulltext search for entity matching | `q` (search term), `field` (`entity.legalName`, `fulltext`, `owns`, `ownedBy`) | Matched term fragments with `related` links to full `lei-records`; NOT full records — follow the link |
| `GET /autocomplete-entities` | Autocomplete-style name lookup | `q`, `field` | Lightweight name matches for UI autocomplete use cases |
| `GET /relationship-records` | Query relationship records directly | `filter[relationship.startNode.id]`, `filter[relationship.type]`, `filter[relationship.status]` | Array of `relationship-records` with start/end node LEIs, relationship type, periods, and corroboration level |
| `GET /reporting-exceptions` | Query reporting exceptions directly | `filter[lei]`, `filter[exception.category]`, `filter[exception.reason]` | Array of exception records explaining why Level 2 data is absent |
| `GET /lei-issuers` | List all accredited LEI issuers (LOUs) | None required | Array of LOU records with name, LEI, jurisdiction, and status |
| `GET /fields` | Full data dictionary of all searchable/filterable fields | None | Field metadata: type, operators, sortability, CDF XPath, enum values |

---

### Identifiers
- **Primary ID:** LEI — 20-character alphanumeric code (ISO 17442). Structure: chars 1–4 = LOU prefix, chars 5–6 = always `00` (reserved), chars 7–18 = entity-unique identifier, chars 19–20 = ISO 7064 MOD 97-10 check digits. All uppercase. Example: `7ZW8QJWVPR4P1J1KQY45` (Google LLC).
- **Secondary IDs:** 
  - `bic` — SWIFT BIC code (financial institutions only, mapped via ANNA)
  - `isin` — ISIN security identifier(s), accessible via `/lei-records/{LEI}/isins`
  - `ocid` — OpenCorporates ID in the form `jurisdiction_code/company_number` (e.g., `us_de/3582691`); present in API response since GLEIF–OpenCorporates mapping project (April 2023, updated bi-weekly)
  - `spglobal[]` — S&P Global company ID(s)
  - `mic` — Market Identifier Code (trading venues)
  - `qcc` — Quasi-corporate codes (rarely populated)
  - `registeredAs` — the business registry number in the jurisdiction's local register (e.g., Delaware file number), alongside `registeredAt.id` which is the GLEIF Registration Authority code (e.g., `RA000602` = Delaware Division of Corporations)
- **How to look up an entity:**
  1. **Known LEI:** `GET /lei-records/{LEI}` — fastest, exact.
  2. **Known BIC:** `GET /lei-records?filter[bic]=ALETITMMXXX`
  3. **Known ISIN:** `GET /lei-records?filter[isin]=DE000ST8MPP0`
  4. **Known legal name (exact or partial):** `GET /lei-records?filter[entity.legalName]=citibank`
  5. **Fuzzy name match:** `GET /fuzzycompletions?field=entity.legalName&q=<name>` — then follow `related` link
  6. **Find parent of known LEI:** `GET /lei-records?filter[owns]={LEI}` or `/lei-records/{LEI}/direct-parent`
  7. **Find subsidiaries of known LEI:** `GET /lei-records?filter[ownedBy]={LEI}` or `/lei-records/{LEI}/direct-children`
  8. **By jurisdiction + name:** combine `filter[entity.legalAddress.country]=US&filter[entity.legalName]=...`
- **Known ID gotchas:**
  - LEI chars 5–6 are always `00` — validate this; codes with other chars 5–6 are malformed.
  - Check digits (chars 19–20) are verifiable via ISO 7064 MOD 97-10. Invalid check digits indicate data entry errors.
  - LAPSED LEIs are still returned in search results — always check `registration.status`. A LAPSED LEI is not invalid for historical lookup but the entity data may be stale.
  - DUPLICATE status means the LEI was superseded — check `entity.successorEntities[]` or the old `entity.successorEntity` field for the surviving LEI.
  - ANNULLED = issued in error; treat as unreliable. RETIRED = entity dissolved.
  - The `filter[lei]` parameter accepts comma-separated lists (batch lookup), but the old GLEIF v1 API documented a 200-LEI cap per request; in practice batches of 50 are recommended to avoid timeouts.
  - `ocid` field is present only for LEIs mapped to OpenCorporates (~50%+ of population); absence does not indicate a problem.

---

### Canonical URL format
- **Primary entity page URL format:** `https://www.gleif.org/lei/{LEI}` — e.g., `https://www.gleif.org/lei/7ZW8QJWVPR4P1J1KQY45`
- **Search URL format:** `https://search.gleif.org/#/search?query={name}` (GLEIF LEI Search 2.0 web UI)
- **API self-link format:** `https://api.gleif.org/api/v1/lei-records/{LEI}` — use this as the canonical API reference URL
- **URLs to AVOID citing:** 
  - Third-party LEI lookup aggregators (e.g., lei-lookup.com, lei-search.com, gleif-lei.com) — these repackage GLEIF data and may be stale or incomplete.
  - Any `http://` variant — API is HTTPS only.
  - The old Postman demo URL `https://api.gleif.org/demo` — the demo application, not a data endpoint.
  - Golden Copy file download URLs (`goldencopy.gleif.org/...`) — use these only for bulk download, not as entity citation URLs.

---

### Known quirks / gotchas
- **Self-reported Level 2 data:** Parent/subsidiary relationships are reported by the legal entity itself (or its LOU), not independently verified. An entity can file a reporting exception (`NON_PUBLIC`, `NO_KNOWN_PERSON`, `NATURAL_PERSONS`, etc.) to avoid disclosing ownership. Many private companies and funds file exceptions. Never assume absence of a `/direct-parent` link means the entity has no parent — check for a `/direct-parent-reporting-exception` link.
- **`filter[owns]` vs. `/direct-parent`:** `filter[owns]={LEI}` on `/lei-records` returns the LEI records of entities that own the specified LEI — i.e., the parents. This is counterintuitive naming. `filter[ownedBy]={LEI}` returns the children.
- **Relationship record vs. LEI record presence:** In the `relationships` block of a `lei-records` response, each parent/child link appears under one of two sub-keys: `lei-record` (relationship data exists) OR `reporting-exception` (no relationship data, exception filed). If neither is present, the entity has not filed Level 2 data at all. Code defensively for all three cases.
- **`conformityFlag` field:** Added to the API in April 2024. Values: `CONFORMING` (LEI is renewed and Level 2 data is complete or excepted) or `NON_CONFORMING`. Critical signal for data quality in political donor/corporate verification workflows — a NON_CONFORMING flag means the LEI is either lapsed or missing ownership data.
- **Headquarters vs. legal address:** Both fields are present and often differ. `entity.legalAddress` = jurisdiction of incorporation registered address. `entity.headquartersAddress` = operational HQ. For jurisdiction of incorporation, use `entity.jurisdiction` (ISO 3166-1 alpha-2 or ISO 3166-2 for subnational, e.g., `US-DE` for Delaware) — not the address country.
- **`entity.category` values:** `GENERAL` (standard corporation), `FUND` (investment fund — often no parent LEI, uses fund manager relationship), `SOLE_PROPRIETOR`, `BRANCH`. Funds use different relationship types: `IS_FUND-MANAGED_BY`, `IS_SUBFUND_OF`, `IS_FEEDER_TO`.
- **Fuzzy search false positives:** `fuzzycompletions` is statistical and returns phonetically/statistically similar results. It will confidently return wrong entities. Always cross-check candidate LEIs against address, jurisdiction, and business register ID before accepting a match.
- **No versioning / change history in main API:** The `/field-modifications` endpoint provides an audit trail of field changes per LEI, but the main `/lei-records` endpoint returns current state only. Historical snapshots require Golden Copy delta files.
- **Golden Copy lag:** API reflects the most recent Golden Copy publish (shown in `meta.goldenCopy.publishDate`). There can be up to 24 hours between a LOU-side update and the API reflecting it.
- **Fund/branch relationship types (added in RR CDF 3.1):** Newer relationship types (`IS_FUND-MANAGED_BY`, `IS_SUBFUND_OF`, `IS_FEEDER_TO`, `IS_INTERNATIONAL_BRANCH_OF`) appear in the API only if a relationship record exists. These are distinct from standard consolidation relationships and require separate endpoint calls.
- **`entity.successorEntity` (singular, deprecated) vs. `entity.successorEntities[]` (plural, current):** When a company merges or is acquired, the surviving entity's LEI is listed in `successorEntities`. The old singular field is retained for backward compatibility but will only contain the first successor. Always use `successorEntities[]`.

---

### Quality signals
| Signal | Where to find it | What it means |
|---|---|---|
| `registration.status` = `ISSUED` | `attributes.registration.status` | LEI is current and valid |
| `registration.status` = `LAPSED` | `attributes.registration.status` | Annual renewal overdue; entity data may be stale |
| `registration.corroborationLevel` = `FULLY_CORROBORATED` | `attributes.registration.corroborationLevel` | Entity data cross-validated against an official business registry |
| `registration.corroborationLevel` = `ENTITY_SUPPLIED_ONLY` | `attributes.registration.corroborationLevel` | Data accepted as-is from entity; not registry-verified |
| `conformityFlag` = `CONFORMING` | `attributes.conformityFlag` | LEI renewed on time AND Level 2 data complete or excepted (launched April 2024) |
| Parent link type: `lei-record` | `relationships.direct-parent.links.lei-record` | Actual parent LEI record exists — follow to get parent |
| Parent link type: `reporting-exception` | `relationships.direct-parent.links.reporting-exception` | No parent LEI filed; exception reason available at that URL |
| No parent link at all | Absence in `relationships` | Entity has never filed Level 2 data — treat as unknown |
| `entity.status` = `ACTIVE` vs. `INACTIVE` | `attributes.entity.status` | Whether the underlying legal entity is operating |
| `registration.nextRenewalDate` | `attributes.registration.nextRenewalDate` | Date after which LEI will LAPSE if not renewed |

For the political donor / corporate verification use case: require `registration.status` = `ISSUED`, `conformityFlag` = `CONFORMING`, and `registration.corroborationLevel` = `FULLY_CORROBORATED` for highest confidence. Flag any LAPSED, NON_CONFORMING, or ENTITY_SUPPLIED_ONLY records for manual review.

---

### Fallback sources
- **OpenCorporates** (`https://opencorporates.com`) — largest open business registry aggregator; GLEIF publishes bi-weekly LEI↔OpenCorporates ID mapping files. Use `ocid` field from GLEIF API to cross-reference. OpenCorporates carries historical filings, director data, and filing documents that GLEIF does not.
- **GLEIF Golden Copy bulk files** (`https://goldencopy.gleif.org/api/v2/golden-copies/publishes`) — for bulk processing, download full or delta CSV/JSON/XML files rather than hitting the API. Updated 3× daily (02:00, 10:00, 18:00 UTC). Better for building a local mirror than paginating through the API.
- **National business registries** — for jurisdiction-of-incorporation data: SEC EDGAR (US public companies), Companies House (UK), Handelsregister (Germany), SIREN/SIRENE (France), etc. GLEIF's `registeredAs` + `registeredAt.id` fields link to these registries via GLEIF's Registration Authority code list (`https://www.gleif.org/en/about-lei/gleif-registration-authorities-list`).
- **S&P Global Market Intelligence** — `spglobal[]` field in GLEIF API response carries S&P's company IDs; use for cross-referencing financial data.
- **vLEI (verifiable LEI)** — for entities that have obtained a cryptographic vLEI credential, GLEIF's vLEI ecosystem provides automated machine-readable identity verification. Separate from the standard LEI API; relevant for digital identity workflows but not yet broadly adopted for most legal entities.

---

### Recent changes / deprecations
- **April 2024 — Policy Conformity Flag launched:** `conformityFlag` field added to `lei-records` API responses. Values: `CONFORMING` / `NON_CONFORMING`. Criteria: LEI renewed on time + Level 2 reporting complete or excepted. FSB progress report (Oct 2024) confirmed this as a key enhancement to LEI data quality signaling.
- **RR CDF 3.1 fund relationship types (in API):** New Level 2 relationship types `IS_FUND-MANAGED_BY`, `IS_SUBFUND_OF`, `IS_FEEDER_TO` added to the API alongside existing direct/ultimate consolidation types. Also added: `IS_INTERNATIONAL_BRANCH_OF` (branch relationships, RR CDF 2.1). These appear as new relationship links in the `relationships` block.
- **`entity.successorEntities[]` (plural) added:** Replaces single `entity.successorEntity`. Old field retained for backward compatibility but deprecated — always use the array.
- **New LEI Record attributes (CDF format updates):** `entity.creationDate`, `entity.subCategory`, `entity.eventGroups[]` (grouped legal entity events with validation documents and timestamps) added to `lei-records` responses. Fully backward-compatible.
- **`relationships.successor-entities` (plural) link:** New relationship link added alongside deprecated `relationships.successor-entity` (singular, kept for backward compat).
- **`reporting-exception` link type:** Clarified in API changes doc that the presence of `reporting-exception` vs. `lei-record` under parent relationship links is the correct way to detect whether an entity has filed a reporting exception.
- **OpenCorporates mapping (April 2023, ongoing):** `ocid` field populated in API responses for ~50%+ of LEIs. Bi-weekly CSV mapping file also available for bulk cross-referencing.
- **LEI population growth:** Over 2.93 million active LEIs as of end-2025 (13.5% annual growth). EU DORA (Digital Operational Resilience Act) enforcement in 2025 drove significant new LEI issuance for ICT service providers.
- **No v2 API announced as of 2026-04-10:** The current production API remains v1. No public roadmap for a v2 deprecation cycle found. The Golden Copy API at `goldencopy.gleif.org` is a separate service (v2 at that domain) for bulk file retrieval only.

---

*Sources: [GLEIF API documentation (Postman)](https://documenter.getpostman.com/view/7679680/SVYrrxuU) · [GLEIF API page](https://www.gleif.org/en/lei-data/gleif-api) · [GLEIF API Changes doc](https://www.gleif.org/content/4_lei-data/1_access-and-use-lei-data/6_supporting-documents/GLEIF-API-Changes-Documentation.html) · [Policy Conformity Flag](https://www.gleif.org/en/lei-data/access-and-use-lei-data/policy-conformity-flag) · [GLEIF Golden Copy spec](https://www.gleif.org/en/lei-data/gleif-golden-copy) · [FSB LEI Progress Report Oct 2024](https://www.fsb.org/uploads/P211024-2.pdf) · [ISO 17442 LEI format](https://cdn.standards.iteh.ai/samples/75998/2b77042cb3a346fda3b26dfd6bfd42ca/ISO-17442-2019.pdf) · Live API responses verified 2026-04-10*

---

### Known incidents (our vault)

**No major incidents to date.** GLEIF is highly reliable as a verification layer for corporate identity — LEIs are ISO 17442 standardized and maintained by accredited Local Operating Units (LOUs).

**Vault convention:** Use LEI lookup as a cross-reference to verify entity identity before citing SEC EDGAR or other corporate sources. Used on QVT Financial (`549300JMMSS9C5S2HO30`) and other hedge fund / corporate profiles.

**Quality check rule:** LEI must be exactly 20 characters alphanumeric. Any other format is data corruption.

## DOJ Press Releases / Enforcement Actions
**Last verified:** 2026-04-10

### Identity
- **What it is:** The official DOJ press release system operated by the Office of Public Affairs (OPA) on justice.gov, plus district-level releases from all 94 U.S. Attorney offices (USAO). There is a lightweight JSON REST API (`/api/v1/`) that surfaces all content.
- **What it covers:** Federal criminal indictments, pleas, sentencings, civil settlements, False Claims Act recoveries, deferred prosecution agreements, consent decrees, corporate fines, forfeiture actions, and national security/FARA enforcement. Covers all DOJ divisions (Criminal, Civil, Antitrust, NSD, Tax, ENRD, Civil Rights) plus all USAOs. Both corporate and individual defendants.
- **Tier classification:** Primary / authoritative. This is the U.S. government's own publication of enforcement actions — no intermediate publisher.
- **Authoritative?** Yes. Each press release is the official DOJ announcement. Numbers like `26-323` are the sequential OPA press release number for that calendar year. Actual court documents are referenced (often linked) but not hosted here.
- **Data freshness:** Real-time. Press releases are published on the day of announcement (indictment, plea, sentencing, settlement). API reflects additions within minutes.
- **Known staleness risk:** Pre-January 20, 2025 OPA releases are now "archived" — their canonical URLs changed (see Identifiers). Older links in databases or web pages pointing to `/opa/pr/` redirect correctly (HTTP 301), but stored URLs may silently break if code follows only exact-match comparisons.

---

### API access
- **Base URL:** `https://www.justice.gov/api/v1/` — documented at [justice.gov/developer/api-documentation/api_v1](https://www.justice.gov/developer/api-documentation/api_v1)
- **Auth:** None. Public, unauthenticated JSON API.
- **Rate limit:** **4 requests/second** per IP. Exceeding this causes degraded performance and potential blocking. No documented daily cap.
- **Pagination:** Zero-based page index. Default page size = 20. Max page size = 50 (enforced server-side; requesting higher silently caps at 50). Use `page=N` and `pagesize=50` together. As of 2026-04-10: **264,531 total records** across all DOJ components, accessible across 5,291 pages at pagesize=50.

---

### Core access methods

| Method | Purpose | Key params | Notes |
|---|---|---|---|
| `GET /api/v1/press_releases.json` | List/search press releases | `pagesize`, `page`, `sort`, `direction`, `fields`, `parameters[title]`, `parameters[date]` | Primary access method. Returns full JSON. |
| `GET /api/v1/press_releases/[uuid].json` | Fetch one release by UUID | `uuid`, `fields` | UUID is stable identifier. |
| `GET /api/v1/blog_entries.json` | OPA blog posts (policy memos etc.) | Same as above | ~3,215 entries |
| `GET /api/v1/blog_entries/[uuid].json` | Fetch one blog entry | `uuid`, `fields` | |
| `GET /news/press-releases` (HTML) | Current press releases post-Jan 20, 2025 | N/A | HTML only. Shows "1,442 Results" as of 2026-04. Links to archives for pre-Jan 2025 content. |
| `GET /usao/pressreleases` (HTML) | All USAO press releases with component/topic filters | N/A | HTML only; useful for manual browsing by district, topic, year. |

**Available sort fields:** `date`, `created`, `changed`  
**Available sort directions:** `ASC`, `DESC`  
**Available fields:** `title`, `date`, `url`, `uuid`, `body`, `teaser`, `number`, `component`, `topic`, `attachment`, `image`, `created`, `changed`

---

### Identifiers
- **Primary ID:** UUID (e.g., `98baba74-8922-41de-95f1-73a82695a3d1`). Stable across URL migrations. Use this for deduplication and tracking.
- **Secondary ID:** Press release number (`number` field), e.g., `26-323` = 2026 calendar year, release #323. **Only OPA press releases have this field**; USAO district releases have an empty `number` field. Useful filter: if `number != ""`, the release came from OPA headquarters rather than a district office.
- **How to look up an entity:** Use `parameters[title]=CompanyName` — this performs a substring/fuzzy match on press release titles only. Returns accurate filtered counts (count=12 for Pfizer, count=29 for Boeing). For broader body-text matching, use the web search at `https://www.justice.gov/search` (requires browser/scraping — the API `parameters[body]` filter is broken, see below).
- **Known ID gotchas:**
  - **`/opa/pr/` → `/archives/opa/pr/` migration (January 20, 2025):** All OPA press releases published before January 20, 2025 had their canonical URL changed. Old `/opa/pr/{slug}` paths now return HTTP 301 redirect to `/archives/opa/pr/{slug}`. The API returns the new `/archives/opa/pr/` URL directly for all pre-2025 OPA content. OPA press releases published on or after January 20, 2025 remain at `/opa/pr/{slug}` with no `/archives/` prefix.
  - **USAO releases are never archived** under this scheme; district releases at `/usao-{district}/pr/` remain at their original paths indefinitely.
  - The API's `url` field already reflects the correct canonical URL (archived or live) — follow the API-returned URL, not a stored `/opa/pr/` link.

---

### Canonical URL format
- **Current OPA press release (post Jan 20, 2025):**  
  `https://www.justice.gov/opa/pr/{slug}`  
  Example: `https://www.justice.gov/opa/pr/false-claims-act-settlements-and-judgments-exceed-68b-fiscal-year-2025`

- **Archived OPA press release (pre Jan 20, 2025):**  
  `https://www.justice.gov/archives/opa/pr/{slug}`  
  Example: `https://www.justice.gov/archives/opa/pr/pfizer-pay-145-million-illegal-marketing-drug-detrol`  
  _(Old `/opa/pr/` paths still work via 301 redirect but should not be stored as canonical)_

- **USAO district press release (any date):**  
  `https://www.justice.gov/usao-{district}/pr/{slug}`  
  Examples: `/usao-sdny/pr/...`, `/usao-ndca/pr/...`, `/usao-edva/pr/...`

- **API single-record URL:**  
  `https://www.justice.gov/api/v1/press_releases/{uuid}.json`

- **Search URL format (HTML):**  
  `https://www.justice.gov/search?query={terms}` — returns HTML, not JSON. The `section=opa` parameter exists but is blocked (HTTP 403 when called programmatically).

- **URLs to AVOID citing / storing:**
  - `https://www.justice.gov/opa/pr/{slug}` **for pre-Jan-2025 content** — this path redirects but is not canonical anymore; stored links may break silently in code that doesn't follow redirects.
  - Any URL constructed from `parameters[body]` filter results — **the body filter is broken** and returns wrong results (see quirks).
  - The developer docs example shows `count: "246868"` — this is outdated (circa August 2024); live count is now 264,531+.

---

### Known quirks / gotchas

1. **`parameters[body]` filter is broken (the 264K false-positive):** When you pass `parameters[body]=SomeText` to the API, the filter is silently ignored — the endpoint returns the full 264,531-record dataset and ignores the body filter. The metadata `count` returns 264,531 regardless of the body parameter, making it appear you have 264K matches when in fact zero filtering occurred. This is the "264K false positive bug." **Workaround:** Use `parameters[title]=` for title-based search (works correctly), or parse the full-text `body` field client-side after fetching pages.

2. **`parameters[component]` and `parameters[topic]` filters also return the full 264,531 count** — they appear to silently fail as filters. Only `parameters[title]` and `parameters[date]` are confirmed to filter correctly.

3. **The API covers ALL of DOJ, not just OPA.** Of 264,531 total records: ~239,973 are from U.S. Attorney offices (USAO district releases), and the remainder are from FBI, DEA, ATF, Criminal Division, Civil Rights, NSD, Tax, etc. The developer docs description ("14,000+ press releases from OPA") is outdated and understates total scope. To isolate OPA-only releases, filter for `number != ""` on API results, or restrict URL pattern to `/opa/pr/` or `/archives/opa/pr/`.

4. **No RSS feed exists for OPA press releases.** The Antitrust Division has RSS feeds for its press releases, and USAO has per-district RSS feeds listed at `https://www.justice.gov/usao/rss`, but there is no working OPA-wide RSS feed (tested paths return 404 or 403).

5. **`date` field is Unix timestamp as a string.** Parse as `int()` before doing date arithmetic. The `created` and `changed` fields are returned as HTML `<time>` tags, not raw timestamps — strip the HTML to extract the datetime string.

6. **Pagination is zero-indexed.** First page is `page=0`, not `page=1`. Passing `page=1` skips the first 50 records.

7. **USAO press releases do not have a `number` field.** The `number` field (e.g., `26-323`) is populated only for OPA/headquarters-level releases. For USAO releases, `number` returns an empty string.

8. **`sort=date` vs `sort=created` differ.** The `date` field is the press release's publication date (what's shown on the page). The `created` field is when the CMS node was created (usually same day, but can differ for backdated or corrected releases). Use `sort=date&direction=DESC` to get most recently dated releases; use `sort=created&direction=DESC` to get most recently added to the system.

9. **API docs page count example is stale.** The official docs at `/developer/api-documentation/api_v1` (last updated December 2025) show example count of `246,868` — this was accurate circa August 2024. The live API returns 264,531+ as of April 2026.

---

### Quality signals

- **OPA releases are high-quality corporate/financial enforcement signals** — these are headquarters announcements involving major defendants, large dollar amounts, or national-level significance. They almost always have a `number` field populated.
- **USAO district releases are high-volume, lower-threshold** — 240K+ records, mostly individual criminal cases (drug trafficking, firearms, fraud). Valuable for tracking individuals but noisy for corporate research. Look for `component` tags like `Criminal Division`, `FBI`, `DEA` to identify multi-agency corporate cases in USAO releases.
- **Press release number sequential tracking:** The `YY-NNN` numbering allows gap detection — if you see `26-320` and `26-325`, you can query for the missing numbers. DOJ numbering restarts each calendar year.
- **Component field for source validation:** Each release tags one or more DOJ components. `Criminal Division` + large dollar amount = corporate criminal enforcement. `Civil Division` = civil False Claims Act or FCPA civil. `NSD` = national security/FARA. `Tax Division` = tax enforcement.
- **Topic field for subject classification:** Includes values like `Financial Fraud`, `False Claims Act`, `Public Corruption`, `Cybercrime`, `Drug Trafficking`, `Violent Crime`, `Health Care Fraud`. Not all releases have topics; USAO releases are better tagged than OPA releases.
- **Body text is the authoritative source** — press releases name defendants, corporate entities, dollar amounts, statutes violated. Full-text parsing of the `body` field (HTML) is required for entity extraction.

---

### Fallback sources

| Source | What it adds | URL |
|---|---|---|
| **PACER / CourtListener** | Underlying court documents (indictments, plea agreements, judgments) linked from press releases | courtlistener.com |
| **SEC EDGAR** | For cases involving public companies — enforcement actions often parallel SEC actions | sec.gov/litigation |
| **FinCEN / OFAC** | Financial enforcement, sanctions — separate from DOJ but often concurrent | fincen.gov, ofac.treas.gov |
| **DOJ FARA database** | Foreign agent registrations and enforcement | fara.gov (API available) |
| **Corporate Prosecution Registry** (Univ. of Virginia) | Curated DPA/NPA database, better structured for corporate research | lib.law.virginia.edu/Garrett/prosecution-registry |
| **GIR / MLex** | Commercial legal enforcement news with better entity extraction | paid services |

---

### Recent changes / deprecations

- **January 20, 2025 — OPA archive migration:** All OPA press releases dated before January 20, 2025 moved from `/opa/pr/` to `/archives/opa/pr/`. The old paths issue HTTP 301 redirects. The API was updated to return new canonical `/archives/opa/pr/` URLs for these records. The new DOJ administration created a new "current" press releases section at `/news/press-releases` (HTML only) showing only post-inauguration content.
- **January 20, 2025 — Administration change:** DOJ enforcement priorities shifted significantly. The Biden-era DOJ archive is accessible at `https://www.justice.gov/archives/doj-archive`. OPA blogged content and speeches from pre-Jan 2025 are at `/archives/opa/`.
- **API documentation updated December 2025** — the `/developer/api-documentation/api_v1` page now shows a stale example count (246,868). Live count is 264,531+.
- **No new API version announced** — the API remains at `v1`. No changelog or versioning announcements are published. The API has been in place since December 2014 ([original launch announcement](https://www.justice.gov/archives/opa/pr/department-justice-launches-new-digital-services)).
- **RSS feeds for Antitrust Division** — the ATR-specific RSS feeds (`/atr/...`) appear to no longer resolve (return 404 as of April 2026), though the documentation page remains at [justice.gov/atr/news-feeds](https://www.justice.gov/atr/news-feeds).
- **USAO press release count growth rate:** ~17,000–20,000 new records per year system-wide (roughly 350–400 per week across all districts). Plan for ~1,500–2,000 new records per month if doing incremental pulls.

---

### Known incidents (our vault)

**DOJ API index-size bug (fixed 2026-04-10 at engine layer, commit `d1ceb91`):** The DOJ press release search API was returning the total index size (~264,413) for every entity search that matched nothing specific. **177 profiles** in the vault had contaminated `auto:doj-press` blocks showing this exact same number — every profile with a DOJ auto-block was polluted. QVT Financial showed 264,349 "DOJ Press Mentions" which turned out to be the API's total index.

**Engine fix:** Sanity cap rejects results with more than 10K total as API bug. Validates that 60% or more of top 5 press releases actually mention the search entity name before committing the count.

**Vault cleanup:** All 177 profiles stripped of the contaminated `auto:doj-press` block on 2026-04-10 by Research Claude. Blocks will repopulate correctly on next pipeline run.

**Quality check rule:** Any `doj-press-mentions` count greater than 10,000 for a single entity is almost certainly the API index-size bug. Reject. Any count greater than 1,000 for a sitting politician or small nonprofit should be spot-checked against a sample of 3 press releases to verify they actually mention the entity.

---

**DOJ Press API is DEAD and pipeline is DISABLED (2026-04-11):** Two separate failures make `/api/v1/press_releases.json` unusable:

1. The `keyword=X` filter parameter is **silently ignored**. Verified 2026-04-11 with `keyword=Raytheon`, `keyword="Raytheon"`, `keyword=asdfgibberish` — all three returned `metadata.resultset.count = 264553` (the entire press-release index) and the identical first result (a 2008 Mukasey statement). The previous sanity-cap detection catches and rejects the 264K count, but no query ever produces real results.

2. The fallback HTML/JSON endpoints at `https://www.justice.gov/news?_format=json&search=X` are now protected by **Akamai Bot Manager**. Responses contain `bm-verify=...` meta-refresh redirects instead of data, and cannot be consumed programmatically without a headless browser.

**Engine fix:** `scripts/doj-press-pipeline.cjs` is now guarded by a hard-fail at the top of `main()`. It prints a clear dead-API message and exits(0) so the parent `api-enrichment.yml` workflow doesn't fail the whole run. Override for local debugging only with `ALLOW_DOJ_DEAD=1`.

**Vault cleanup:** Not yet done. Any existing `auto:doj-press` blocks written BEFORE the 2026-04-10 sanity cap may cite wrong press releases (the API returned the default index page as "results"). Blocks written AFTER the cap are safe (they're empty). Audit any profile with `doj-press-mentions > 50` — if the cited releases do not actually mention the profile, strip the block.

**Alternative data sources for future rebuild:**
- **CourtListener** — already have a pipeline, covers DOJ litigation
- **DOJ Office of Public Affairs RSS** — if they publish one (none found 2026-04-11)
- **Google Custom Search JSON API** with `site:justice.gov/opa/pr` — requires Google Cloud key + quota
- **Direct scraping of `/opa/pr/` via headless browser** — bot-blocked, expensive

**Quality check rule:** Treat the DOJ Press pipeline as dead until a replacement source is wired in. Do NOT remove the dead-guard until both the keyword-param bug and the Akamai bot gate are resolved upstream.

## NHTSA
**Last verified:** 2026-04-10

### Identity
- **What it is:** The National Highway Traffic Safety Administration's public-facing data APIs and flat-file datasets, operated by the U.S. Department of Transportation. Covers three distinct API surfaces: (1) the **Recalls/Complaints/Safety Ratings API** at `api.nhtsa.gov`; (2) the **Vehicle Product Information Catalog (vPIC) API** at `vpic.nhtsa.dot.gov/api`; and (3) downloadable flat-file datasets at `static.nhtsa.gov/odi/`.
- **What it covers:** Motor vehicle safety recalls (1967–present), consumer complaints filed with the Office of Defects Investigation (ODI) (1949–present), NCAP crash-test safety star ratings (1990–present), VIN decoding and manufacturer registration data, safety defect investigations. Covers vehicles, tires, child restraints, and equipment sold or registered in the U.S.
- **Tier classification:** Primary government source — U.S. federal regulatory agency. Data originates directly from manufacturer Part 573 filings and consumer complaint submissions to NHTSA.
- **Authoritative?** Yes — for U.S. vehicle safety recalls and ODI complaints, NHTSA is the sole authoritative source. Manufacturers are legally required (49 CFR Part 573) to file recall reports within 5 business days of determining a defect exists. VIN decode data in vPIC is populated from manufacturer 565 submittals and is considered authoritative for vehicles intended for U.S. sale.
- **Data freshness:** Recall and complaint flat files update **daily** (files timestamped ~3–7 AM ET). Safety ratings update **annually**. vPIC releases a new database version approximately **monthly** (release notes published; current version 3.66 as of 11/15/2025, with 3.67 on 12/13/2025 as latest). The API endpoint layer reflects underlying flat-file updates without a defined SLA.
- **Known staleness risk:** Recall remedy completion status (whether a specific VIN has been repaired at a dealer) is **not available** in any public NHTSA API — it exists only in manufacturer internal dealer systems. The API returns all campaigns ever issued for a make/model/year, including fully remedied ones. Complaint data reflects filings received by ODI; there is typically a processing lag before new complaints appear. Safety ratings can lag model year availability by 6–12 months.

---

### API access
- **Base URL:**
  - Recalls, Complaints, Safety Ratings: `https://api.nhtsa.gov`
  - VIN decode / manufacturer data (vPIC): `https://vpic.nhtsa.dot.gov/api`
  - Flat-file downloads: `https://static.nhtsa.gov/odi/ffdd/`
- **Auth:** None. No API key, no registration, no OAuth. Fully open under the Open Government Directive. Both `api.nhtsa.gov` and `vpic.nhtsa.dot.gov/api` are unauthenticated GET-only interfaces.
- **Rate limit:**
  - `api.nhtsa.gov` (Recalls/Complaints/Safety Ratings): Undocumented hard limit. The use policy states bulk VIN lookups "will be controlled by an automated traffic rate control mechanism." No specific requests-per-minute figure is published. The policy page explicitly warns against bulk VIN lookups.
  - `vpic.nhtsa.dot.gov/api` (vPIC): No documented daily query limit. The FAQ states "No there is no limit to the amount of actions that can be run on the API per day." Practical throughput stated as **1,000–2,000 transactions/minute** during business hours (6AM–6PM EST). For large batch jobs, NHTSA asks users to schedule runs **evenings or weekends**. A batch VIN decode endpoint exists (max 50 VINs per batch POST).
- **Pagination:**
  - `api.nhtsa.gov` endpoints: No pagination. Each endpoint returns all matching records in a single response. Results are not truncated by a page parameter — the full set (which can be large for popular makes/models) is returned.
  - `vpic.nhtsa.dot.gov/api` (GetAllManufacturers, GetParts): Supports `?page=N` parameter for list-type endpoints. Page size is fixed by the API.
  - Response format: All endpoints support `?format=json` (default), `?format=xml`, and `?format=csv`. Always specify `format=json` explicitly for programmatic use.

---

### Core endpoints

| Endpoint | Purpose | Key params | Response shape highlights |
|---|---|---|---|
| `GET https://api.nhtsa.gov/recalls/recallsByVehicle` | All recall campaigns for a vehicle make/model/year | `make`, `model`, `modelYear` (all required) | Array of recall objects: `NHTSACampaignNumber`, `Component`, `Summary`, `Consequence`, `Remedy`, `ReportReceivedDate`, `ParkIt` (bool), `ParkOutside` (bool) |
| `GET https://api.nhtsa.gov/recalls/campaignNumber` | Recall campaign detail by NHTSA campaign number | `campaignNumber` (required, e.g. `12V176000`) | Same shape as above; returns the specific campaign record(s) |
| `GET https://api.nhtsa.gov/complaints/complaintsByVehicle` | All consumer complaints for a vehicle make/model/year | `make`, `model`, `modelYear` (all required) | Array of complaint objects: `odiNumber`, `manufacturer`, `crash` (bool), `fire` (bool), `injuries`, `deaths`, `dateOfIncident`, `failedComponent`, `description` |
| `GET https://api.nhtsa.gov/complaints/odinumber` | Single complaint by ODI number | `odinumber` (required, e.g. `11184030`) | Single complaint record |
| `GET https://api.nhtsa.gov/products/vehicle/modelYears` | Available model years for recall or complaint lookup | `issueType=r` (recalls) or `issueType=c` (complaints) | List of model year values |
| `GET https://api.nhtsa.gov/products/vehicle/makes` | Available makes for a given model year | `modelYear`, `issueType` | List of make strings |
| `GET https://api.nhtsa.gov/products/vehicle/models` | Available models for a given year+make | `modelYear`, `make`, `issueType` | List of model strings |
| `GET https://api.nhtsa.gov/SafetyRatings/modelyear/{year}/make/{make}/model/{model}` | NCAP crash test variants for a vehicle | Path params: `year`, `make`, `model` | List of vehicle variants with `VehicleId` and description |
| `GET https://api.nhtsa.gov/SafetyRatings/VehicleId/{id}` | Full NCAP star ratings for a specific variant | Path param: `VehicleId` | Star ratings: overall, front crash, side crash, rollover; links to crash test photos/video |
| `GET https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVin/{vin}` | Decode a 17-char VIN into vehicle specs | Path param: VIN (17 chars, `*` as wildcard for check digit); `?format=json`; optional `&modelyear=` | 150+ fields: Make, Model, ModelYear, BodyClass, EngineHP, PlantCountry, ManufacturerId, etc. |
| `GET https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVinValues/{vin}` | Same as above but flat key-value format | Same as DecodeVin | Flat object — easier to consume programmatically |
| `POST https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVINValuesBatch` | Batch VIN decode (up to 50 per request) | POST body: semicolon-delimited VINs, optionally with year (`VIN,YEAR;VIN2,YEAR2`) | Array of flat decoded objects |
| `GET https://vpic.nhtsa.dot.gov/api/vehicles/GetAllManufacturers` | List all registered manufacturers | `?format=json&page=N`; optional `ManufacturerType` filter | Paginated list with `Mfr_ID`, `Mfr_Name`, `Mfr_CommonName`, `Country` |
| `GET https://vpic.nhtsa.dot.gov/api/vehicles/GetManufacturerDetails/{manufacturer}` | Details for a specific manufacturer | Name string or numeric `Mfr_ID` | `Mfr_ID`, `Mfr_Name`, `Mfr_CommonName`, `VehicleTypes`, `Country`, address |
| `GET https://vpic.nhtsa.dot.gov/api/vehicles/GetMakeForManufacturer/{manufacturer}` | Makes produced by a manufacturer | Name string or numeric `Mfr_ID` | List of `Make_ID`, `Make_Name`, `Mfr_Name` |
| `GET https://vpic.nhtsa.dot.gov/api/vehicles/GetModelsForMakeYear/make/{make}/modelyear/{year}` | Models for a make and year | Path params | List of `Model_ID`, `Model_Name`, `Make_Name` |

---

### Identifiers

- **Primary ID:** **NHTSA Campaign Number** (field `CAMPNO`, `NHTSACampaignNumber`). Format: `YY[TYPE]NNNNNN` — a 9–12 character alphanumeric string.
  - `YY` = 2-digit calendar year the recall was filed (e.g., `26` = 2026)
  - `[TYPE]` = single letter indicating the product class:
    - `V` — Vehicle (e.g., `26V189000`)
    - `E` — Equipment (e.g., `26E014000`)
    - `T` — Tire (e.g., `22T-020` — note: tire recalls sometimes appear with a hyphen in human-readable form but the canonical `CAMPNO` uses no hyphen: `22T020`)
    - `C` — Child Restraint / Car Seat (e.g., `24C001`)
  - `NNNNNN` = zero-padded 6-digit sequential number within that year and type (e.g., `047000` = 47th recall of that type in that year; the trailing `000` is always present in the standard format)
  - Full example: `23V047000` = the 47th vehicle recall filed in 2023.
  - The `CAMPNO` field in the flat file is defined as `CHAR(12)`, so expect zero-padding.

- **Secondary IDs:**
  - **ODI Number** (`odiNumber`): Consumer complaint identifier. Numeric, ~8 digits (e.g., `11184030`). Assigned by NHTSA's Office of Defects Investigation when a complaint is logged. Used exclusively to identify individual complaints, not recalls.
  - **VehicleId** (NCAP Safety Ratings): Numeric integer, uniquely identifies a tested vehicle variant within the NCAP program (e.g., `7520`). Not related to VIN or campaign numbers.
  - **Mfr_ID** (vPIC manufacturer): Numeric integer identifying manufacturers in the vPIC system. Stable across API calls.
  - **Make_ID** (vPIC): Numeric integer for vehicle makes.
  - **RECORD_ID** (flat file): Running sequence number within the NHTSA recall flat file. Not stable across file refreshes — do not use as a foreign key.
  - **Manufacturer Campaign Number** (`MFGCAMPNO`): The manufacturer's own internal recall identifier (e.g., Ford's `26C18`). Available in flat files but not reliable for cross-manufacturer lookups. Different manufacturers use entirely different formats.
  - **VIN** (17-char): Not a NHTSA-assigned identifier, but the primary lookup key for the vPIC decode API and the consumer recall lookup tool at nhtsa.gov/recalls.

- **How to look up an entity:**
  - To find all recalls for a known automaker's vehicles: query `recallsByVehicle` iterating over make/model/year combinations. There is no manufacturer-level recall rollup endpoint — you must enumerate by vehicle.
  - To look up a specific recall: use `campaignNumber` endpoint with the exact `CAMPNO`.
  - To find complaints about a vehicle: use `complaintsByVehicle` with make/model/year.
  - To find which makes a manufacturer produces: use vPIC `GetMakeForManufacturer/{name}` with the legal entity name (e.g., `Ford Motor Company`) or `Mfr_ID`.
  - To find a manufacturer's registration details: use vPIC `GetManufacturerDetails/{name}`.
  - Bulk recall lookups: download the flat file `FLAT_RCL_POST_2010.zip` from `static.nhtsa.gov/odi/ffdd/rcl/` for server-side filtering.

- **Known ID gotchas — the hedge-fund-car-recall false positive matching issue:**
  This is the most critical issue for a political donor research database that also processes financial entities:

  **The core problem:** NHTSA recall data contains `MFGNAME` and `MFGTXT` fields that hold the legal name of the **vehicle manufacturer** (e.g., `"GENERAL MOTORS, LLC"`). Many hedge funds, private equity firms, and financial holding companies share partial name strings with auto manufacturers or their subsidiaries. Common false positive patterns:
  
  1. **"Capital" and "Partners" collisions:** Recall records for `FORD MOTOR COMPANY` subsidiaries or affiliates in the flat file occasionally appear with manufacturer names containing financial-sounding terms. More importantly, a naïve fuzzy-match on a firm like `"GM Capital"` or `"Chrysler Capital"` (the auto financing arms) will match both the auto manufacturer and unrelated financial firms with "Capital" in the name.
  
  2. **Conglomerate overlap:** Companies like `"TOYOTA MOTOR CREDIT CORPORATION"` or `"FORD MOTOR CREDIT COMPANY"` appear in NHTSA data as manufacturers or affiliated entities and are legitimate auto-adjacent financial entities — but a system matching on "Toyota" or "Ford" as a company name could incorrectly attribute their recall filings to an unrelated donor named "Toyota Financial Services Inc." or similar.

  3. **Equipment recall cross-contamination:** Equipment recalls (`E` type) include recalls filed by non-vehicle companies — fleet operators, upfitters, equipment manufacturers — whose company names may overlap with financial firm names. For example, a company named `"Summit Equipment"` filing an equipment recall could false-match a private equity firm also named `"Summit"`.

  4. **Campaign number as a ticker/code match:** The campaign number format `26V189000` contains a numeric sequence that is never a financial ticker but could be misinterpreted by pattern-matching logic looking for 8-digit reference numbers or fund identifiers.
  
  **Mitigation strategy for this database:**
  - Match on **both** `MFGNAME` and `RCLTYPECD` (`V`/`E`/`T`/`C`) to disambiguate: only `V` (vehicle) recalls are relevant for auto-adjacent corporations; filter out `E`, `T`, `C` type recalls from the matching pool.
  - Use vPIC `GetManufacturerDetails` to get the canonical legal `Mfr_Name` and match against that, not against free-text recall description fields.
  - Require a **VIN-decodable make** match: if the entity cannot be resolved to a vPIC `Make_ID`, it is unlikely to be a legitimate vehicle manufacturer filing recalls.
  - Do not fuzzy-match on `MFGTXT` (the "manufacturers of recalled vehicles" free text field) — it is inconsistently formatted and not normalized.

---

### Canonical URL format

- **Primary entity page URL format:**
  - Recall detail page: `https://www.nhtsa.gov/recalls?nhtsaId={CAMPNO}`
    - Example: `https://www.nhtsa.gov/recalls?nhtsaId=26V189000`
  - Manufacturer page: No stable canonical URL format for manufacturer entities on nhtsa.gov. Use vPIC API instead.
  - Investigation page: `https://www.nhtsa.gov/vehicle-safety-defects-and-recalls?nhtsaId={investigationId}` (format varies; investigations use alphanumeric IDs like `PE24007`)

- **Search URL format:**
  - Consumer recall search: `https://www.nhtsa.gov/recalls` (interactive, not API-addressable by URL parameter except for `?nhtsaId=`)
  - Datasets page: `https://www.nhtsa.gov/nhtsa-datasets-and-apis`
  - vPIC human UI: `https://vpic.nhtsa.dot.gov/decoder/`

- **URLs to AVOID citing:**
  - `https://www.safercar.gov` — this domain **redirected to nhtsa.gov** (SaferCar.gov was decommissioned; links are now broken or redirect). Do not store safercar.gov URLs.
  - `https://www-odi.nhtsa.dot.gov/` — legacy ODI portal. Superseded by `nhtsa.gov/recalls`. Links to old ODI pages may be dead or return stale cached content.
  - Third-party aggregators (Carfax, AutoCheck, NADA, KBB recall pages) — these repackage NHTSA data with potential staleness and are not authoritative for citation.
  - `api.nhtsa.gov` response URLs embedded in JSON (e.g., crash photo CDN links) — these are internal CDN URLs that may not be stable long-term.

---

### Known quirks / gotchas

1. **robots.txt blocks direct API calls from some clients:** `api.nhtsa.gov` endpoints return `bad_robots_code` errors for automated HTTP clients that include a `User-Agent` identifying them as bots. The vPIC API (`vpic.nhtsa.dot.gov`) is more permissive. Use a browser-like `User-Agent` header when hitting `api.nhtsa.gov` endpoints programmatically.

2. **Case sensitivity on all parameters:** NHTSA explicitly states "request parameters and method names are case sensitive" for `api.nhtsa.gov`. `make=Ford` and `make=ford` may return different results. Use lowercase make/model strings as shown in official examples (e.g., `make=acura&model=rdx`).

3. **VIN recall lookup vs. API recall lookup differ:** The consumer-facing `nhtsa.gov/recalls` VIN lookup (using manufacturer database access) can show recalls that are **not yet in the public API** — manufacturers have access to pre-publish their recall status. The `recallsByVehicle` API only shows publicly filed campaigns.

4. **Recall API does not confirm VIN-level remedy status:** The `recallsByVehicle` endpoint returns all campaigns ever issued for a make/model/year configuration — including ones where the specific VIN has already been repaired. Remedy completion data is not available in the public API.

5. **Flat files are the only way to filter by date:** The `api.nhtsa.gov` recall/complaint endpoints have no date filter parameter. To get recalls filed after a specific date, you must download the flat file and filter locally on `RCDATE` (YYYYMMDD format).

6. **No endpoint for investigations:** Safety defect investigations (Preliminary Evaluations and Engineering Analyses) are not directly queryable via `api.nhtsa.gov`. Investigation data is only available as a flat-file download: `FLAT_INV.zip` at `static.nhtsa.gov/odi/ffdd/FLAT_INV.zip`.

7. **vPIC confidence degrades for pre-1995 vehicles:** vPIC VIN decode is ~99% reliable for MY1995+, drops to 60–65% for MY1980–1994, and is not available for pre-1980 vehicles (pre-standardization era).

8. **Manufacturer name normalization is inconsistent across systems:** The same legal entity may appear differently in vPIC (`"FORD MOTOR COMPANY"`), recall flat files (`"Ford Motor Company"`), complaint data (`"FORD"`), and manufacturer communications. Do not rely on exact string matching across tables — use vPIC `Mfr_ID` or `Make_ID` as stable cross-system keys.

9. **Flat file schema changed in May 2025:** Fields #19 was reduced to `CHAR(3)` and fields #20 and #22 were increased to 6,000 characters. Fields #28 (`DO_NOT_DRIVE`) and #29 (`PARK_OUTSIDE`) were added. Any parser built before May 2025 may break on the new schema.

10. **Upcoming flat file change (April 30, 2026):** The complaints flat file (`FLAT_CMPL.zip`) will add two new fields — Field #50 (`Vehicle Operator`) and Field #51 (`State of Incident`) — effective April 30, 2026. Update parsers before that date.

---

### Quality signals

- **Completeness:** Recall data is legally required (Part 573) and generally complete for all U.S. market vehicle recalls. Complaint data is voluntary and represents a biased sample (motivated complainants only — actual defect rates are higher than complaint counts suggest).
- **Timeliness:** Manufacturers must file within 5 business days of a recall decision; the flat file updates daily. However, the recall determination itself may lag the actual defect discovery by months or years.
- **Recall scope accuracy:** `POTAFF` (potentially affected units) is self-reported by manufacturers and frequently revised. Early filings often undercount affected vehicles.
- **Component field quality:** `COMPNAME` (component description) is inconsistently formatted across manufacturers and years. Do not use for machine classification without normalization.
- **Reliability flag:** The `INFLUENCED_BY` field (`MFR`/`OVSC`/`ODI`) indicates whether the recall was self-initiated by the manufacturer or pushed by NHTSA investigation — useful as a severity signal for political/regulatory risk analysis.

---

### Fallback sources

- **Data.transportation.gov recalls dataset:** `https://data.transportation.gov/api/views/6axg-epim/rows.csv?accessType=DOWNLOAD` — NHTSA recalls in normalized CSV with additional fields including `Recall Type` and `Completion Rate %`. Updated regularly. Useful for analysis when the ODI flat file format is cumbersome.
- **NHTSA ODI flat files (static.nhtsa.gov):** The definitive bulk source. For recalls: `FLAT_RCL_POST_2010.zip`; for complaints: `FLAT_CMPL.zip`; for investigations: `FLAT_INV.zip`. These are the upstream source for all API responses.
- **Recall Communications PDF archive:** `https://static.nhtsa.gov/odi/ffdd/rcl/Recall_Communications.pdf` (~179 MB as of 2025) — full text of owner notification letters, useful for understanding recall scope and remedy details not available in structured fields.
- **VIN-level recall check (manufacturer-sourced):** `https://www.nhtsa.gov/recalls` with VIN input — pulls from manufacturer databases and may show unrepaired status before it appears in the public API.
- **Auto.dev Open Recalls API:** `https://docs.auto.dev/v2/products/open-recalls` — a third-party API that filters NHTSA recall data to active/unresolved campaigns only. Useful for "open recall" queries but is not authoritative (derives from NHTSA).
- **NHTSA vPIC standalone database download:** Available at `vpic.nhtsa.dot.gov/api` (Downloads module) — full vPIC SQLite/SQL Server database for local offline queries. Updated monthly with each vPIC release.

---

### Recent changes / deprecations

- **May 2025 — Recall flat file schema change:** Fields #19 reduced to CHAR(3); fields #20 and #22 expanded to 6,000 chars; fields #28 (`DO_NOT_DRIVE`) and #29 (`PARK_OUTSIDE`) added. Any parsing code built against the pre-May 2025 schema needs updating. ([Source: RCL.txt data dictionary](https://static.nhtsa.gov/odi/ffdd/rcl/RCL.txt))

- **April 30, 2026 — Complaints flat file schema change (upcoming):** Fields #50 (`Vehicle Operator`) and #51 (`State of Incident`) will be added to `FLAT_CMPL.zip`. ([Source: NHTSA Datasets and APIs page](https://www.nhtsa.gov/nhtsa-datasets-and-apis))

- **December 2025 (vPIC v3.67) — vPICList_lite database location changed:** The download link for the standalone vPIC lite database was moved to a new Downloads module on the vPIC home page. Any hardcoded download URLs for the lite database may be broken. ([Source: vPIC release notes](https://vpic.nhtsa.dot.gov/api/Home/Index/ReleaseNotes))

- **March 2025 (vPIC v3.58) — New VIN decode fields added:** `Combined Braking System (CBS)`, `Wheelie Mitigation`, `Fuel-Tank Type`, and `Fuel-Tank Material` variables added to all VIN decode endpoints. Existing parsers that enumerate all fields are unaffected; parsers that validate against a fixed field schema need updating.

- **May 2024 (vPIC v3.47) — GetManufacturerDetails URL updated:** The paginated endpoint URL was updated to include explicit `&page=` parameter in documentation. Previously documented as `/vehicles/GetManufacturerDetails/str?page=2`, now clarified.

- **SaferCar.gov decommissioned (pre-2024):** All SaferCar.gov URLs now redirect to nhtsa.gov. Stored links to safercar.gov should be updated.

- **No new public recall/complaint API endpoints added 2024–2026:** The `api.nhtsa.gov` surface has been stable with no new endpoint additions in this period. Rate-limit policy unchanged (undocumented but enforced for bulk VIN lookups). The API use policy page was last updated January 2023.

- **2025 ADS reporting streamlined:** NHTSA amended its Standing General Order for Level 2 ADAS and ADS vehicles in 2025 to reduce redundant manufacturer reporting requirements. This affects EWR (Early Warning Reporting) data which feeds into ODI complaint and investigation pipelines — may affect complaint data volume for AV-related incidents.

---

### Known incidents (our vault)

**NHTSA-to-non-auto matching bug (fixed 2026-04-10 at engine layer, commit `d1ceb91`):** The pipeline was applying NHTSA vehicle recall data to non-automotive entities. QVT Financial (a hedge fund) was showing vehicle recalls and investigations for Tesla FSD collisions. Meta was showing NHTSA data despite not making vehicles. Raytheon (defense contractor) had vehicle recall data.

**Engine fix:** `scripts/nhtsa-recalls-pipeline.cjs` now filters the corporation pool to auto-adjacent entities only — name contains `auto` / `motor` / `vehicle`, NAICS code 3361-3363 (Motor Vehicle Manufacturing), or known auto brand names. Hedge funds, defense contractors, tech companies, and financial firms are skipped.

**Vault cleanup:** 6 redirect files + QVT Financial cleaned of bogus NHTSA data on 2026-04-10. Other non-automotive profiles with NHTSA auto-blocks should be stripped.

**Quality check rule:** If a profile's type is not `corporation` in the auto sector (or NAICS 3361-3363), any `auto:nhtsa-recalls` block is almost certainly contaminated. Spot-check against the entity's actual industry before accepting.

---

**NHTSA `/recalls/recallsByManufacturer` and `/complaints/complaintsByManufacturer` endpoints went DEAD (fixed 2026-04-11):** As of 2026-04-11, both manufacturer-scoped endpoints on `api.nhtsa.gov` return HTTP 403 `{"message":"Missing Authentication Token"}`. The `/investigations?manufacturer=X` endpoint on the same host still works. The `/recalls/recallsByVehicle?make=X&model=Y&modelYear=Z` (vehicle-scoped, different query shape) also still works. Only the two manufacturer-scoped endpoints are affected. Verified 2026-04-11 against Honda.

**Engine fix:** `fetchRecalls()` in `scripts/nhtsa-recalls-pipeline.cjs` now queries the **DOT Socrata open-data platform** instead:
```
https://datahub.transportation.gov/resource/6axg-epim.json
  ?$where=upper(manufacturer) like '%HONDA%'
  &$order=report_received_date DESC
  &$limit=500
```
Socrata's `6axg-epim` resource is the "NHTSA Recalls" dataset, kept in sync with the same upstream feed that fed the dead `api.nhtsa.gov` endpoint. Records are normalized to the legacy PascalCase shape (`NHTSACampaignNumber`, `Manufacturer`, `Subject`, `Component`, `ReportReceivedDate`, `Summary`, `Consequence`, `Remedy`, `PotentialNumberofUnitsAffected`) inside `fetchRecalls()` so `parseRecall()` doesn't need to change.

`fetchInvestigations()` is unchanged — the investigations endpoint on `api.nhtsa.gov` still works.

`fetchComplaints()` is **stubbed to return []**. No drop-in replacement has been located — the ODI Complaints datasets listed in the Socrata catalog (`pve6-prnz`, `s84w-cs4i`, `8qbs-9p4c`, etc.) return HTTP 403 "no row or column access to non-tabular tables" when queried via SODA. When a working complaints source is found (possibly the ODI flat files at `static.nhtsa.gov/odi/ffdd/`), restore the fetch logic and update this section.

**Verified working post-fix:** Ford Motor Company → 500 recalls (hit cap, latest "Incorrectly Installed Piston Circlips") + 10 investigations, 2 API calls total.

**Quality check rule:** If a new NHTSA pipeline run reports 0 recalls for a known auto-industry profile that previously had recall data, check the console for HTTP 500 or 403 — an upstream Socrata outage or endpoint change would look like that. Watch for the `$where` filter getting rejected (Socrata occasionally rotates reserved-word behavior); if it starts failing, try `$select=count(*)` on the same endpoint to verify connectivity before diagnosing deeper.

## LobbyView (MIT)
**Last verified:** 2026-04-10

### Identity
- **What it is:** Academic lobbying research database maintained by Prof. In Song Kim's lab at MIT Political Science. Parses and disambiguates the full universe of federal Lobbying Disclosure Act (LDA) LD-2 filings since 1999 into a structured relational database. Provides a public REST API and bulk CSV/DTA/JSON dataset downloads.
- **What it covers:** Federal lobbying activity under the LDA of 1995 — clients (interest groups/firms), registrants (lobbying firms), individual lobbyists, lobbied congressional bills, issue area codes (79 categories), government entities targeted, and legislator–client network linkages. Coverage: 1999–present (1.6M+ reports, $87B+ in disclosed expenditures). Does **not** cover state-level lobbying.
- **Tier classification:** Lower-priority academic source. Useful for historical lobbying relationships, client–legislator network data, and bill-level lobbying linkages. Not a real-time source.
- **Authoritative?** No — LobbyView is a derived/processed dataset. Primary authority is the Senate Office of Public Records (lda.senate.gov) and House Clerk (lobbyingdisclosure.house.gov). LobbyView adds name disambiguation and relational structure that the raw LDA data lacks.
- **Data freshness:** Continuously updated as new LDA quarterly filings are published. Bulk dataset downloads timestamped — e.g., report-level data labeled "1999–2024," bill-level data updated October 2024.
- **Known staleness risk:** API quota is 100 requests/day and 10,000 rows/day, making full refresh of large entity sets slow. The Python package was still in pre-release ("expected December 2024 for widespread use") as of late 2024 — the `clients` method was explicitly flagged as "NOT FULLY IMPLEMENTED YET." Quarter-level network and bill-client network endpoints require special permission. Dataset updates lag LDA filings by at least one quarter. Name disambiguation is imperfect for firms with complex M&A histories.

---

### API access
- **Base URL:** `https://rest-api.lobbyview.org` (HTTPS only; connection via `http.client.HTTPSConnection('rest-api.lobbyview.org')`)
- **Auth:** HTTP header: `token: <your_api_token>`. To obtain a token:
  1. Create a free account at https://www.lobbyview.org (sign in via the user icon → "Sign Up" with email + organization)
  2. Navigate to **Data Download → Get Started under "LobbyView's API"**
  3. Scroll down to copy your API token
  - To increase quota or access private endpoints (`quarter_level_networks`, `bill_client_networks`), email: lobbydata@gmail.com
- **Rate limit:** **100 requests per 24-hour period** per user; **100 rows per request**; **10,000 rows per 24-hour period** maximum. Exceeding the limit returns HTTP 429 (`TooManyRequestsError` in the Python wrapper). To increase quota, contact lobbydata@gmail.com.
- **Pagination:** Page-number based. Add `?page=N` to any query (default `page=1`). Each page returns up to 100 rows. The Python wrapper's `paginate()` method uses lazy evaluation (generator) and prints "Retrieving page 1…", "Retrieving page 2…" etc. A `PartialContentError` (HTTP 206) is raised if results are incomplete. Response objects expose `.page_info()` returning `current_page` and `total_pages`.

---

### Core endpoints

All endpoints: `GET https://rest-api.lobbyview.org/api/<resource>`  
Query parameters use PostgREST-style operators (e.g., `field=eq.VALUE`, `field=ilike.VALUE`, `field=cs.{VALUE}`).

| Endpoint | Purpose | Key params | Response shape highlights |
|---|---|---|---|
| `GET /api/legislators` | Look up Congress members | `legislator_id` (Bioguide), `legislator_govtrack_id`, `legislator_first_name`, `legislator_last_name`, `legislator_full_name`, `legislator_gender`, `birthday`, `min_birthday`, `max_birthday`, `page` | `legislator_id` (Bioguide), `legislator_govtrack_id`, `legislator_other_ids` (nested object with fec, lis, icpsr, thomas, govtrack, maplight, wikidata, votesmart, opensecrets, ballotpedia, google_entity_id), `legislator_full_name`, `legislator_birthday`, `legislator_gender` |
| `GET /api/bills` | Look up congressional bills | `congress_number`, `bill_chamber` (H/S), `bill_resolution_type`, `bill_number`, `bill_state`, `legislator_id` (sponsor), `min_introduced_date`, `max_introduced_date`, `min_updated_date`, `max_updated_date`, `page` | `congress_number`, `bill_chamber`, `bill_resolution_type`, `bill_number`, `bill_introduced_datetime`, `bill_date_updated`, `bill_state` (e.g. `ENACTED:SIGNED`), `legislator_id` (sponsor Bioguide), `bill_url` (congress.gov link) |
| `GET /api/clients` | Look up lobbying clients (interest groups/firms) | `client_uuid`, `client_name` (ilike partial match), `min_naics`, `max_naics`, `naics_description` (exact cs match), `page` | `client_uuid` (UUID v5), `client_name`, `primary_naics` (6-digit NAICS code), `naics_description` (array of NAICS label strings) |
| `GET /api/reports` | Look up LD-2 quarterly lobbying reports | `report_uuid`, `client_uuid`, `registrant_uuid`, `registrant_name`, `report_year`, `report_quarter_code` (1–4), `min_report_year`, `max_report_year`, `min_report_quarter_code`, `max_report_quarter_code`, `min_amount`, `max_amount`, `is_no_activity`, `is_client_self_filer`, `is_amendment`, `page` | `report_uuid`, `client_uuid`, `registrant_uuid`, `registrant_name`, `report_year`, `report_quarter_code` (returned as string), `amount` (string like `"$11,680,000.00"`), `is_no_activity`, `is_client_self_filer`, `is_amendment` |
| `GET /api/issues` | Per-issue breakdown within a report (issue area codes) | `report_uuid`, `issue_ordi`, `issue_code` (3-letter LDA code e.g. `TRD`, `HCR`), `gov_entity` (ilike), `page` | `report_uuid`, `issue_ordi` (ordinal position within report), `issue_code`, `gov_entity` (array of targeted agencies/chambers) |
| `GET /api/texts` | Free-text issue descriptions (Section 16 of LD-2) | `report_uuid`, `issue_ordi`, `issue_code`, `issue_text` (ilike partial match), `page` | `report_uuid`, `issue_ordi`, `issue_code`, `issue_text` (raw lobbying description string) |
| `GET /api/networks` | Annual client–legislator network linkages (bills sponsored) | `client_uuid`, `legislator_id`, `report_year`, `min_report_year`, `max_report_year`, `min_bills_sponsored`, `max_bills_sponsored`, `page` | `client_uuid`, `legislator_id`, `report_year`, `n_bills_sponsored` |
| `GET /api/quarter_level_networks` ⚠️ | Same as networks but at quarter granularity — **private, requires special permission** | Same as networks plus `report_quarter_code`, `min_report_quarter_code`, `max_report_quarter_code` | `client_uuid`, `legislator_id`, `report_year`, `report_quarter_code`, `n_bills_sponsored` |
| `GET /api/bill_client_networks` ⚠️ | Bill–client linkages — **private, requires special permission** | `congress_number`, `bill_id` (format: `H.R.1174-114`), `bill_chamber`, `bill_resolution_type`, `bill_number`, `report_uuid`, `issue_ordi`, `client_uuid`, `page` | `congress_number`, `bill_chamber`, `bill_resolution_type`, `bill_number`, `report_uuid`, `issue_ordi`, `client_uuid` |

⚠️ = Requires special permission; returns `UnauthorizedError` (HTTP 401) without it. Contact lobbydata@gmail.com.

---

### Identifiers
- **Primary ID (clients/firms):** `client_uuid` — a UUID v5 (deterministic hash), format `44563806-56d2-5e99-84a1-95d22a7a69b3`. Also exposed in datasets as `lob_id` for the disambiguated firm identifier used to match across name variations (e.g., "Apple" vs. "Apple Computer"; "Meta" vs. "Facebook").
- **Primary ID (reports):** `report_uuid` — UUID v5, format `4b799814-3e94-5ee1-8dd4-b32aead9aca6`.
- **Primary ID (registrants):** `registrant_uuid` — UUID v5 format.
- **Primary ID (legislators):** `legislator_id` = Bioguide ID (e.g., `M000303` for John McCain). This is the canonical LobbyView legislator key.
- **Bill composite key:** No single `bill_id` field in the API — bills are identified by the composite (`congress_number`, `bill_chamber`, `bill_resolution_type`, `bill_number`). In the `bill_client_networks` endpoint, a `bill_id` shorthand format `H.R.1174-114` is accepted.
- **Secondary IDs (legislators):** `legislator_other_ids` object contains: `fec`, `lis`, `cspan`, `icpsr`, `thomas`, `bioguide` (same as `legislator_id`), `govtrack`, `maplight`, `wikidata`, `votesmart`, `wikipedia`, `ballotpedia`, `opensecrets`, `house_history`, `google_entity_id`.
- **How to look up an entity:**
  - *Legislator by name:* `GET /api/legislators?legislator_first_name=ilike.John&legislator_last_name=ilike.McCain`
  - *Client by name:* `GET /api/clients?client_name=ilike.Microsoft%20Corporation`
  - *Client by UUID:* `GET /api/clients?client_uuid=eq.44563806-56d2-5e99-84a1-95d22a7a69b3`
  - *Reports for a client:* `GET /api/reports?client_uuid=eq.<uuid>&report_year=eq.2023`
- **Known ID gotchas:**
  - The `client_uuid` is LobbyView-internal and does not correspond to any LDA system ID. A client entity may have *multiple* UUIDs if LobbyView's disambiguation assigned registrant-client combos separately (e.g., "Microsoft Corporation" direct vs. "PCT Government Relations on behalf of Microsoft Corporation" are different UUIDs).
  - `lob_id` (in bulk datasets) and `client_uuid` (in the API) are related but document different things — `lob_id` is the disambiguated firm entity, while `client_uuid` is the report-filing relationship.
  - `report_quarter_code` is returned as a **string** in API responses even though it is passed as an integer in queries.
  - `amount` is returned as a formatted string (`"$11,680,000.00"`), not a number — must be parsed before arithmetic.
  - Bioguide IDs match the `legislator_id` field exactly. The `legislator_id` is also stored as `bioguide` inside the `legislator_other_ids` object.

---

### Canonical URL format
- **Primary entity page URL format:** `https://www.lobbyview.org` (no stable deep-link URL pattern for individual clients or reports by UUID; the site uses a search-based UI at `/advanced-search`)
- **Search URL format:** `https://www.lobbyview.org/advanced-search` (web UI; not API)
- **REST API base:** `https://rest-api.lobbyview.org/api/<resource>?<params>`
- **API documentation:** `https://rest-api.lobbyview.org` (OpenAPI/Swagger UI — title: "LobbyView API (1.0.0)")
- **Dataset downloads:** `https://www.lobbyview.org/data-download/datasets`
- **URLs to AVOID citing:** 
  - `https://web.mit.edu/insong/www/pdf/lobbyview.pdf` — the 2018 working paper; technically the canonical citation but describes older internal architecture, not the current REST API.
  - Any cached/aggregator copies of LDA data — always prefer the LobbyView API or the raw Senate LDA system (lda.senate.gov) for primary sourcing.

---

### Known quirks / gotchas
1. **Severely restrictive API quota:** 100 requests/day and 10,000 rows/day. At 100 rows/request, you can retrieve at most 10,000 rows per day. Bulk analysis requires either the downloadable CSV datasets or a quota increase via email.
2. **`amount` field is a string:** Returned as `"$11,680,000.00"` — requires stripping `$` and `,` before numeric use.
3. **`clients` method flagged incomplete:** The Python wrapper docs explicitly note "NOT FULLY IMPLEMENTED YET" for the clients endpoint. Validate responses carefully.
4. **Private endpoints are silent about access:** `quarter_level_networks` and `bill_client_networks` raise `UnauthorizedError` rather than returning a helpful error message if you lack permission. You must request access in advance.
5. **`report_quarter_code` type inconsistency:** Passed as `int` in queries but returned as `string` in responses.
6. **Name disambiguation is approximate:** LobbyView uses NLP + collaborative filtering to match firm names across reports. Errors occur for companies with M&A histories, subsidiaries, and DBA names. The project provides a community error-reporting link.
7. **Bill composite key, no single bill ID:** Bill lookups require up to 4 fields (congress, chamber, resolution type, number). The `bill_id` shorthand (`H.R.1174-114`) only works in `bill_client_networks`.
8. **Legacy LDA data pre-2008 is semi-annual, not quarterly:** HLOGA (2007) switched LDA to quarterly reporting. Pre-2008 filings are biannual; the `report_quarter_code` field reflects this.
9. **lob_id vs. client_uuid:** The `lob_id` identifier (datasets) disambiguates firm entities across all reports; `client_uuid` (API) identifies client–registrant filing relationships and is not always the same entity-level grouping.
10. **OpenAPI spec title includes a date:** The Swagger page title reads "LobbyView REST API Documentation Test 1.24.2024" — the "Test" and date in the title suggests this Swagger UI may not be the fully finalized production documentation.

---

### Quality signals
- **Coverage depth:** 1.6M+ LDA reports, 87B+ USD in disclosed expenditures, 1999–present. Represents the full LDA filing universe, not a sample.
- **Academic peer review:** Underlying database methodology published by In Song Kim (MIT); used in peer-reviewed work in APSR, Political Analysis, and multiple Nature/Science-family journals (e.g., arxiv:2503.11745, Feb 2026).
- **Cross-linkage richness:** `legislator_other_ids` contains 14+ external IDs (FEC, OpenSecrets, Bioguide, GovTrack, ICPSR, Wikidata, VoteSmart, Ballotpedia, etc.) — strong for cross-database joins.
- **External validation:** Dataset linked to Compustat, Moody's Orbis, BoardEx, NOMINATE/VoteView.
- **Active maintenance:** GitHub commit history shows activity through November 2024; 2026 arxiv paper cites LobbyView as "continuously updated."
- **Usage signal (as of verification date):** API page shows 293 registered users and 81,299 total requests — small research community, not production-scale infrastructure.
- **Weakness:** The REST API is publicly described as pre-release (as of late 2024). The platform is an academic project, not a commercial data product — SLA, uptime guarantees, and long-term availability are not formally committed.

---

### Fallback sources
- **Senate LDA system (primary authority):** https://lda.senate.gov — official raw LD-2 filings. REST API available at https://lda.senate.gov/api/redoc/v1/ *(note: as of June 2026, the lda.senate.gov v1 API will be retired — migrate to lda.senate.gov)*
- **House Clerk lobbying disclosure:** https://lobbyingdisclosure.house.gov — parallel filing system
- **OpenSecrets:** https://www.opensecrets.org — broader lobbying + campaign finance combined; covers political donations alongside lobbying. Commercial API available.
- **BICAM (MIT, companion dataset):** https://bicam.net — MIT-produced congressional bills database with improved LDA bill-lobbying linkages; provides better record linkage between bills and LDA reports than LobbyView's bill-matching algorithm.
- **ProPublica Congress API:** Discontinued in 2024; no longer a fallback.

---

### Recent changes / deprecations
- **Nov 2024 — Python package pre-release:** GitHub shows last commit November 14, 2024 (`d052453`). The package was described as targeting "December 2024" for widespread public release. As of verification, the `clients` endpoint remains flagged as not fully implemented.
- **Oct 2024 — Dataset updates:** Bill-level dataset updated October 2024 per the dataset page. Report-level dataset covers 1999–2024.
- **2024 — Individual lobbyist dataset added:** The datasets page now lists "The first-ever dataset that provides unique identifiers for individual lobbyists, including educational, occupational, and demographic background details" — a new addition not present in the original 2018 LobbyView publication.
- **Feb 2026 — Major companion paper:** arxiv:2503.11745 (Bacik, Ondras, Rudkin, Dunkel, Kim) formally introduces LobbyView as a public resource for quantitative interdisciplinary research, signaling the database is now considered production-quality for academic use.
- **2026 — Senate LDA API v1 retirement:** https://lda.senate.gov/api/redoc/v1/ will be retired after June 30, 2026. LobbyView's upstream data source is migrating; watch for any LobbyView data gaps around this transition.
- **No deprecations of existing API endpoints observed** in 2024–2026 based on available documentation.
### Known incidents (our vault)

**Academic access token may rotate.** LobbyView is an MIT-maintained academic database built on top of Senate LDA data. Authentication may require periodic re-registration.

**Vault convention:** LobbyView is used as a cross-reference for lobbying bills and NAICS code classification. It's derivative of Senate LDA (Tier 1), so cite Senate LDA directly when the data is available there.

**Upstream bug warning:** LobbyView inherits any Senate LDA data quality issues. The domain migration (lda.senate.gov to lda.gov) may affect LobbyView's refresh cadence. Check last-updated dates before trusting values.

---

**Wrong auth header + missing PostgREST operators + Firebase token (fixed 2026-04-11):** Three stacked bugs made the LobbyView pipeline fail silently for every profile:

1. **Wrong HTTP auth header.** The pipeline was sending `Authorization: Token <x>` (some APIs use this shape). LobbyView actually expects a custom header named **`token`** (lowercase, no `Bearer`/`Token` prefix) containing the JWT value. Wrong header returned HTTP 400 with an empty response body.

2. **Missing PostgREST operator prefixes.** LobbyView's REST is a PostgREST front. Every filter param requires an operator prefix:
   - `client_name=eq.Apple` — exact match
   - `client_name=ilike.*apple*` — case-insensitive wildcard
   - `client_uuid=eq.<uuid>` — UUID lookup
   Bare `client_name=Apple` returns HTTP 400. The pipeline was sending bare values for all four endpoints (`/api/clients`, `/api/reports`, `/api/networks`, `/api/issues`).

3. **Expired Firebase ID token.** `LOBBYVIEWAPI=` in `donor-map-engine/.env` was a ~969-char JWT starting with `eyJhbGciOiJSUzI1NiI...`. Decoding revealed it was a Firebase ID token (`iss: https://securetoken.google.com/github-73504`) that expired on 2026-04-08 03:29 UTC, 2.6 days before the pipeline was tested.

**Important distinction — DO NOT flag LobbyView JWTs as "wrong" by default.** LobbyView's official docs page (https://rest-api.lobbyview.org) hands out Firebase ID tokens as the intended auth mechanism — the "Your Token" box auto-refreshes a fresh JWT on every page load and users are explicitly told to paste it as the `token:` header. Firebase ID tokens live ~1 hour. The trap is that they look like "real API keys" in `.env` but decay silently.

**Engine fix:**
- `fetchLobbyView()` now sends `token: ${LV_KEY}` as the HTTP header.
- `searchClient()` now sends `client_name=ilike.*${escaped}*`. Added a `postgrestSafe()` escaper that strips PostgREST-reserved `,` and `*` from input.
- `getClientReports()`, `getClientNetworks()`, `getClientIssues()` all use `client_uuid=eq.${uuid}`.
- Startup check decodes the JWT and hard-fails with a clear "token is EXPIRED" message + the "Your Token" URL, so future stale tokens don't burn the daily request budget.

**Follow-up for CI/scheduled runs:** Scheduled runs via `api-enrichment.yml` cannot use a static JWT from GitHub Secrets — by the time a cron job fires, the token is stale. Need to either (a) wire the Firebase refresh-token flow into the workflow's `Create .env from secrets` step, or (b) swap LobbyView for BICAM/direct LDA as a CI-safe alternative. Not yet implemented.

**API key sanity check (general lesson):** A long base64-ish string starting with `eyJ` and two `.` separators is a JWT. If you can decode the middle segment and see an `iss` claim pointing at `securetoken.google.com` / `accounts.google.com` / `appleid.apple.com`, the key is a session token from an OAuth/Firebase flow, not a traditional API key. Build decode-and-expiry-check logic into any pipeline that consumes JWT-style credentials — expired tokens should hard-fail with a loud error, not run silently and burn the quota. See `feedback_jwt_api_key_trap.md` in Claude's memory.

---

## FDA (openFDA)
**Last verified:** 2026-04-11

### Identity
- **What it is:** openFDA, the REST/JSON API published by the FDA at `api.fda.gov`, Elasticsearch-backed, covering drug/device/food recalls (enforcement reports), adverse events (FAERS + MAUDE), drug approvals (Drugs@FDA), 510(k) clearances, PMA approvals, and structured drug labels. Tier 1 primary source for pharma/device/food accountability.
- **Auth:** OPTIONAL api_key from `https://open.fda.gov/apis/authentication/`. The openFDA signup is SEPARATE from `api.data.gov` — no shared key. Without a key the rate limit is 240 requests/minute per IP, 1000/day per IP, which is plenty for our 15-per-run batches.
- **Rate limit with key:** 240 requests/minute per key, 120,000/day per key.
- **Known gotcha:** 0 results returns HTTP 404, not 200-with-empty-array. Pipeline handles this as "no data found", not an error.
- **Date format:** `YYYYMMDD` (no separators) in enforcement records. Pipeline normalizes to ISO.
- **Schema quirk:** `recall_number` is the publicly-cited ID (`D-321-2016` for drugs, `Z-2372-2023` for devices, `F-0276-2017` for food); `event_id` is an internal numeric key. Cite `recall_number`.

### Pipeline behaviour
- **File:** `scripts/fda-pipeline.cjs`
- **Profile filter:** `isFDAAdjacent()` — includes NAICS 3254 (pharma), 3391 (medical equipment), 311 (food manufacturing), 445 (food & beverage stores), plus ~40 hard-coded big-pharma / big-device / big-food brand names (pfizer, j&j, merck, abbvie, lilly, moderna, medtronic, tyson, cargill, nestle, pepsico, coca-cola, kraft, altria, etc.). Filtered 384 → 38 in testing.
- **Endpoints queried per profile:** `/drug/enforcement.json`, `/device/enforcement.json`, `/food/enforcement.json` — 3 API calls per profile, each with `search=recalling_firm:"NAME"`.
- **Strict firm verification:** After fetching, every returned record is re-checked against the profile name using a token-based word-boundary match. `extractFirmTokens()` strips corporate suffixes (`inc`, `corp`, `llc`, `pharmaceuticals`, etc.) before matching so "Pfizer Inc." tokenizes to just `["pfizer"]` instead of `["pfizer", "inc"]`. This prevents the A000383-class substring bugs ("meta" matching "metals", "amgen" matching "amgenesis").
- **Summary includes:** total recalls, drug/device/food breakdown, **Class I (life-threatening) count highlighted**, Class II/III counts, ongoing count, date range, variant firm names for audit.
- **Frontmatter written:** `fda-recalls`, `fda-recalls-class-i`, `last-enriched`.
- **Auto-block inserted:** `### FDA Enforcement (openFDA)` with metric table, Class I highlight, 6 most-recent recalls, variant firm names.

### Verified working
- Pfizer Inc. → 103 recalls (100 drug, 3 device, 0 food), **14 Class I life-threatening**, 15 ongoing. Latest: 2025-08-04 epinephrine vial label.
- Johnson & Johnson → 110 recalls (24 drug, 86 device), 2 Class I, 41 ongoing. Latest: 2025-06-12 ACUVUE OASYS MAX.

### Known incidents (our vault)
**None yet — pipeline is new as of 2026-04-11.**

**Quality check rule:** If an `auto:fda-enforcement` block shows Class I counts > 20 for a non-pharma profile (e.g., a hedge fund or bank), suspect a profile-filter leak — the strict firm-verification step should reject non-matches, but audit before citing as Tier 1. Class I recalls are the highest-impact number on the page and deserve manual verification for any profile with >10.

---

## OCC (Office of the Comptroller of the Currency)
**Last verified:** 2026-04-11

### Identity
- **What it is:** OCC is the federal regulator of national banks and federal savings associations. Enforcement actions back to August 1989 are published via `api.occ.gov`. This is the authoritative source for national bank accountability — no secondary source is more complete. State-chartered banks (Goldman Sachs Bank USA, Morgan Stanley Bank) are supervised by FDIC/Fed, NOT OCC — check `CharterType` before assuming.
- **Auth:** API key via `api.data.gov` infrastructure. **Shares the same key as FEC, Congress.gov, FTC, USDA, NASA, SAM.gov, and every other api.data.gov-fronted API.** Our `api-config.cjs` falls back to the FEC key automatically if no dedicated `OCC_API_KEY` / `OCCAPI` env var is set.
- **Rate limit:** 1,000 requests/hour per key (api.data.gov standard tier).
- **Key quirks:**
  - `Amount` is a STRING, not a number. Values include `"2614456.00"`, `"0.00"`, `"See Order"`, `""`. Pipeline parses defensively.
  - `TerminationDate` of `""` means still active; `"N/A"` means non-terminable (CMPs never terminate by design); a date string means terminated.
  - `SubjectMatters` array is EMPTY for pre-2012 actions. Don't infer topic absence from empty arrays on old records.
  - No pagination — all results for a keyword return in a single array.
  - **Critical gotcha:** Bank names in enforcement records reflect the institution's name at the time the action became final, NOT the current legal name. JPMorgan Chase appears under predecessor names (Chase Manhattan, Bank One, etc.) in pre-merger actions.

### Pipeline behaviour
- **File:** `scripts/occ-pipeline.cjs`
- **Profile filter:** `isOCCAdjacent()` — includes NAICS 5221 (depository credit), 5223 (credit intermediation), 5231 (securities/commodity), financial-services keywords, and ~35 hard-coded big-bank names. Filtered 384 → 30 in testing.
- **Endpoint queried:** `/EnforcementActions/list/{keyword}` ONLY. We DO NOT use `/Institutions/List/1` because that keyword search is broken — searching for "JPMorgan" returns Charter 1 (Wells Fargo's predecessors CoreStates/Wachovia) instead of JPMorgan. Verified 2026-04-11.
- **Name variants:** Vault titles like "JPMorgan - Chase Bank" are split on `-` into variants `["JPMorgan", "Chase Bank"]` (with corporate suffixes stripped). Pipeline queries enforcement for each variant and dedupes by `DocketNumber`.
- **Strict verification:** Each returned action is filtered so its `Institution` / `Company` / `Individual` field contains every significant token from AT LEAST ONE variant as a full-word match. Prevents "Chase" from matching "Chase Creek Bank".
- **Charter numbers:** Derived FROM the matched actions (not from a separate lookup step), ensuring what we display is what OCC attributed to the entity.
- **Canonical institution name:** The most-common `Institution` value across matched actions. Handles predecessor cases where a bank has multiple historical legal names.
- **Frontmatter written:** `occ-enforcement-actions`, `occ-active-actions`, `occ-charter-numbers` (array), `occ-cmp-dollars` (if > 0), `last-enriched`.
- **Auto-block inserted:** `### OCC Enforcement Actions` with legal name + charter number table, action type breakdown, subject areas (2012+), still-active actions list with PDF links, recent enforcement history.

### Verified working
- Wells Fargo → **116 actions, 95 active, $899,171,205 in civil money penalties.** Latest: 2024-12-23 Prohibition/Removal Orders.
- JPMorgan Chase → **78 actions, 58 active, $1,222,035,000 in CMPs** (~$1.22B). Latest: 2025-12-15 1829 Prohibition Notification.

### Known incidents (our vault)
**None yet — pipeline is new as of 2026-04-11.**

**`/Institutions/List/1` is broken** — documented above. Pipeline avoids it entirely.

**Quality check rule:** If an `auto:occ-enforcement` block shows `CMP dollars > $100M`, verify by spot-checking 2 of the cited docket numbers against the OCC EASearch UI (`https://apps.occ.gov/EASearch`). CMP dollar totals are load-bearing for donor accountability stories.

---

## FTC (Federal Trade Commission)
**Last verified:** 2026-04-11

### Identity
- **What it is:** FTC publishes a thin API (`api.ftc.gov/v0`) with only TWO endpoints: HSR Early Termination Notices (real-time merger filings with granted ET) and Do Not Call complaints. There is NO enforcement action search API. Historical enforcement data exists only as three static CSVs last updated FY2021 (`ftc_merger_enforcement_actions_2.csv`, `ftc_nonmerger_enforcement_actions_2.csv`, `ftc_civil_penalty_actions_2.csv`). Post-2021 cases are HTML-only on ftc.gov/legal-library.
- **Auth:** Same `api.data.gov` key as FEC/OCC. Pipeline reuses the FEC key via `api-config.cjs`.
- **Coverage gap:** Enforcement CSVs end at FY2020/2021. For post-2021 cases, pipeline documents the gap in the auto-block and links to the FTC Legal Library search UI.
- **HSR early termination gap:** February 2021 – February 2025, the ET program was suspended. No ET notices exist for that window — this is expected, not a data bug.

### Pipeline behaviour
- **File:** `scripts/ftc-pipeline.cjs`
- **Profile filter:** `isFTCAdjacent()` — all corporation/donor profiles EXCEPT pure individuals, PACs, and bloc/aggregate profiles (which would never match by strict name). Filtered 384 → 151 in testing.
- **CSV load:** One-time fetch of all three enforcement CSVs at pipeline startup (644 records total as of 2026-04-11). Cached in memory for the full run. Minimal in-tree CSV parser handles quoted fields with embedded commas — no csv library dependency.
- **HSR API:** Queried per name variant via `/hsr-early-termination-notices?filter[title][value]=X&filter[title][operator]=CONTAINS` (JSON:API format). Dedupe by entry ID.
- **Name variants:** `nameVariants()` splits vault titles like "Meta - Facebook" on `-` and strips corporate suffixes, producing candidates like `["Meta", "Facebook"]`. Each variant is queried/filtered independently.
- **Strict match:** `strictMatchAnyVariant()` checks whether ANY variant's tokens all appear as full words in the target field. **Full word-boundary regex on both sides** — prevents "meta" matching "metals" in "Commercial Metals Company" (actual false positive caught in testing).
- **Frontmatter written:** `ftc-enforcement-actions`, `ftc-hsr-notices`, `last-enriched`.
- **Auto-block inserted:** `### FTC Enforcement & Merger Review` with enforcement + HSR counts, enforcement-by-type breakdown, recent actions list with links, HSR filings list, explicit CSV-cutoff caveat.

### Verified working
- Meta – Facebook → 1 historical enforcement (Facebook/Instagram 2020), 0 HSR (correct — Meta files under "Meta Platforms" which post-dates the 2021 CSV cutoff), 0 false positives (earlier "Commercial Metals Company" false match eliminated by the word-boundary fix).

### Known incidents (our vault)
**None yet — pipeline is new as of 2026-04-11.**

**`\b${token}` regex without trailing `\b` is dangerous.** The first version of the pipeline matched "Meta" against "Commercial Metals Company" because `\bmeta` allowed any suffix. Fix: use `\b${token}\b` on both sides. Same trap fixed in `fda-pipeline.cjs` simultaneously. Watch for this when writing any future pipeline that uses regex-based strict matching.

**Quality check rule:** FTC CSVs are frozen at FY2021. If a high-profile post-2021 enforcement action is missing from a profile (e.g., Amazon/Prime FTC lawsuit from 2023, Meta/Cambridge Analytica follow-on), it's NOT a bug — it's the documented cutoff. The auto-block includes a footer link to the current FTC Legal Library search so editors can check manually.

---

## How to use these cheatsheets

**Code Claude:**
1. At session start, scan the Perplexity Research Checklist at the top — what's done, what's pending
2. **BEFORE touching any pipeline script, read the relevant cheatsheet section.** Check the "Known quirks / gotchas", "Known incidents (our vault)", and "Quality signals" sections first — they'll tell you about bugs we've already hit.
3. When fixing a pipeline bug, update the "Known incidents (our vault)" subsection with the new fix (commit hash, date, root cause, vault cleanup done).
4. Reference the canonical URL format when generating auto-block source links.
5. **When building a NEW pipeline (for an API not listed here):** STOP and request Perplexity research from David before starting implementation. See "Pipeline research protocol" below.

**Research Claude:**
1. When citing a source in a profile's Verified section, use the "Canonical URL format" section of the relevant cheatsheet to get the right URL shape.
2. When reviewing an auto-block for editorial sign-off, use "Quality signals" to detect contamination.
3. When writing new profiles, reference the "Data field to Frontmatter mapping" (where Perplexity provided it) to know which schema fields are pipeline-populated vs editor-populated.
4. If you spot a Research Claude-relevant gap in a cheatsheet (bad URL format, missing mapping, stale incident note), flag it for David to update.

**David:**
1. Research one Tier 2 priority pipeline per week using Perplexity (checklist above).
2. Refresh the top 12 Tier 1 cheatsheets every 90 days (check `Last verified` dates).
3. When Code Claude asks for research before building a new pipeline, provide it — see "Pipeline research protocol" below.

---

## Pipeline research protocol (new rule 2026-04-10)

**Before building, fixing, or significantly modifying any pipeline, both Claudes must check this Pipeline Guide first.**

### When fixing an existing pipeline bug:
1. **Read the cheatsheet section for that pipeline.** Check "Known quirks", "Known incidents (our vault)", "Quality signals" sections.
2. **If the bug matches a documented quirk/incident,** use the documented fix pattern. Update the "Known incidents (our vault)" subsection with the new fix (commit hash, date, impact).
3. **If the bug is NEW,** fix it, then add a new entry to "Known incidents (our vault)" documenting the root cause, fix commit, vault cleanup done, and any quality check rule that would have caught it.

### When building a NEW pipeline (API not listed in the Tier 1 checklist):
1. **STOP.** Do not start implementation blind.
2. **Request Perplexity research from David.** Ask him to run the Perplexity prompt template (see "Cheatsheet Template" below) against the new API. Wait for results.
3. **If research is provided,** add it as a new section in this Pipeline Guide following the existing format. Include an empty "Known incidents (our vault)" subsection to fill in as incidents occur.
4. **If research cannot be found** (obscure API, no Perplexity signal, no public documentation):
   - Revert to common logic: use generic REST API conventions (base URL, offset/limit pagination, JSON responses, 429 rate limit handling, exponential backoff).
   - Document the gap in the new section with a warning "No research available — implementation uses generic REST conventions" at the top.
   - Every incident or quirk discovered during implementation MUST be documented in "Known incidents (our vault)" as you learn it.
5. **Never build a pipeline without a cheatsheet section.** If you can't write the cheatsheet before coding, ask David for more information.

### Ops application frontmatter write rules (2026-04-10 incident learnings)

The Ops app has three API routes that add/remove relationships on profile frontmatter:
- `ops/src/app/api/relationships/route.ts` — generic add/remove
- `ops/src/app/api/suggestions/route.ts` — auto-suggestion approval flow
- `ops/src/app/api/profile/connections/route.ts` — profile-scoped connections

**All three routes MUST use gray-matter to parse frontmatter, not regex.** Regex-based matching only catches the first line of multi-line YAML fields (e.g., `donors:` followed by `- item1`, `- item2`), and any field update then corrupts the file.

**All three routes MUST preserve the existing field shape** when appending a new relationship:
- If the existing value is a **YAML list** (array in the parsed object), push the new target onto the list. Do NOT convert to string.
- If the existing value is a **string** (inline ` · ` separated wikilinks), concat with ` · ` and the new wikilink.
- If the field doesn't exist yet, create a new single-wikilink string.

**CRITICAL: Never stringify a JS array via template literal.** `${fmValue}` on an array calls `Array.prototype.toString()`, which joins with `,` (no spaces). The result looks like `"item1,item2,item3 · [[new]]"` in the file, and on the next read gray-matter sees a STRING at the `donors` key but the OLD LIST is still in the file as orphan list items. YAML fails to parse. Build breaks. This was the Whitehouse bug.

**Shared helper functions** — both relationships and suggestions routes have these locally (see `normalizeFieldForCheck` and `appendRelationship` in each route). If adding a fourth writer, copy these helpers verbatim or extract to `ops/src/lib/` as a shared module.

**Quality check rule:** Before any commit that touches relationship fields in frontmatter, run a YAML parse scan on the affected file. A 3-second check prevents hours of build-failure diagnosis.

### Why this rule exists

Yesterday and today we hit 6 separate pipeline bugs that could have been prevented with upfront research:

- **A000383 fuzzy-match bug** — would have been caught if the Congress.gov cheatsheet documented that name-only lookups require state + last-name verification (now documented).
- **DOJ API index-size bug** — would have been caught if the DOJ cheatsheet documented that unmatched searches return the total index size (now documented).
- **SAM.gov fuzzy name-match bug** — would have been caught if the SAM.gov cheatsheet documented that awardee legal name must be validated (now documented).
- **NHTSA non-auto entity bug** — would have been caught if the NHTSA cheatsheet documented that matching must filter to auto-adjacent entities (now documented).
- **Redirect file enrichment bug** — would have been caught if the LDA cheatsheet documented that redirect files should be skipped (now documented).
- **GovTrack stale cache impossible-state bug** — would have been caught if the GovTrack cheatsheet documented cache invalidation rules (now documented).

**All 6 of these cost hours to diagnose and required retroactive vault cleanup.** The cost of Perplexity research up-front (about 20 minutes per pipeline) is far lower than the cost of debugging a production pipeline bug (hours + vault cleanup + potential trust damage from wrong-entity contamination).

### Cheatsheet Template

When researching a new pipeline, use this template (same format as the Tier 1 pipelines above):

```markdown
## {Pipeline Name}
**Last verified:** YYYY-MM-DD (source, e.g. David via Perplexity)

### Identity
- **What it is:**
- **What it covers:**
- **Tier classification:** (Tier 1 government record / Tier 2 journalism / Tier 3 aggregator / Tier 4 advocacy)
- **Authoritative?**
- **Data freshness:**
- **Known staleness risk:**

### API access
- **Base URL:**
- **Auth:** (API key / OAuth / public / token)
- **How to get an API key:**
- **Rate limit:**
- **Pagination:**
- **User-Agent / headers required:**

### Core endpoints
| Endpoint | Purpose | Key params | Response shape highlights |
|---|---|---|---|
|  |  |  |  |

### Identifiers
- **Primary ID:** (format and example)
- **Secondary IDs:**
- **How to look up an entity:** (preferred search method)
- **Known ID gotchas:** (fuzzy-match risks, ID reuse, format changes)

### Canonical URL format
- **Entity page URL format:**
- **Search URL format:**
- **URLs to AVOID:**

### Known quirks / gotchas (from public documentation)

### Quality signals (how to detect contaminated data)

### Fallback sources

### Recent changes / deprecations

### Known incidents (our vault)
_No incidents yet. Add entries here as bugs are discovered and fixed._
```

---
