---
title: Profile Polish Patterns
type: admin-note
note-type: code
priority: high
status: open
last-updated: 2026-04-17
---

# Profile Polish Patterns — Running Playbook

Running notebook of patterns discovered while polishing Launch-50 profiles. When we find a new issue on a profile that applies generally, add it here so future sessions (and this one, later) apply the fix consistently instead of rediscovering every time.

**First polished:** Trump (2026-04-17), Rubio (2026-04-17), Pelosi (2026-04-17 in progress)

---

## The playbook — do these in order for every new profile

1. **Read the whole profile** + survey structure with `grep -nE '^##[^#]|<!-- auto:'`
2. **Fix frontmatter corruption** — see "Frontmatter bugs" below
3. **Re-run `build-profile-data-panels.cjs`** — it now auto-relocates stale panels into the Money section
4. **Re-run `build-relationships-per-profile.cjs`** — only needed if the canonical edge store changed
5. **Section order check** — see "9-section template order" below
6. **Rename section headings to validator-accepted variants** — see "Heading renames" below
7. **Add missing template sections** — Related Figures, Policy Executed (Cabinet), Key Votes (current legislators)
8. **Voting record** — if politician with bioguide-id or fec-candidate-id, run `ingest-voting-record-csv.cjs` against a CSV in `data/bulk/voting-records/`
9. **Add to `data/public-routes.json`** — new profiles 404 until allowlisted, even for David's review
10. **Commit + deploy + hard-refresh browser** (Ctrl+Shift+R) — browser caches `postscript.js` for 4h by default

---

## Frontmatter bugs to watch for

### Corrupted `central-thesis`
Past YAML-edit scripts collided delimiter characters with dollar signs and bumped adjacent fields into the string. Signature: a thesis string containing literal `content-readiness: ready` or `source-tier:` etc. mid-sentence.

**Fix:** rewrite the thesis cleanly. The original narrative intent is usually recoverable from the body's "Central Thesis" section.

**Seen on:** Pelosi (`$1.6 billion` corrupted into `content-readiness: ready.6 billion`).

### Stale `known-gaps`
Profiles created before the full pipeline ran list "No voting record data", "No mapped relationships", "No legislative record from Congress.gov" as gaps — but the pipelines have since filled these.

**Fix:** empty to `[]` unless an actual gap persists. Verify by checking `auto:congress-legislation`, `auto:fec-politician`, relationships-per-profile.json.

**Seen on:** Rubio, Pelosi.

### Malformed stray frontmatter in body
Line like `donors: [[Name]] · [[Name]]` sitting in the body after the real `---` closer, sometimes with a dangling `---` separator trying to open a second frontmatter block.

**Fix:** delete the stray line + bare separators. Real frontmatter stays in the real block.

**Seen on:** Rubio, Pelosi (same exact shape — `donors: [[...]] · [[...]]` body line followed by `---`/`---` double separator, sitting between the hashtag tag line and the first H2).

### Nested `top-donors` under `say-vs-pay`
Some profiles have a sub-structured `say-vs-pay.top-donors:` array with `{name, amount}` objects, *and* a separate top-level `top-donors:` flat list. Unclear which is canonical.

**Status:** needs investigation. If the canonical-store has amounts, collapse the `say-vs-pay.top-donors` nested form into top-level.

**Seen on:** Pelosi.

---

## 9-section template order (per `scripts/profile-template-validator.cjs`)

Required H2 sections, in this order:
1. (Summary Infobox — rendered by SummaryInfobox.tsx from frontmatter, no markdown heading)
2. **Who They Are** (variants: Who He Is, Who She Is, Bio, Biography, Background, About)
3. **Class Analysis**
4. **The Money** (variants: Money, Funding, **The Donor Class Map**, The Donors, Campaign Finance)
5. **Type-specific:**
   - Politician: Key Votes, Key Votes + Actions, Voting Record
   - Presidential/Cabinet: Executive Actions, **Policy Executed**, Department Actions, Diplomatic Record
   - Donor/PAC: Politicians Funded, Allied Donors + Politicians Funded
   - Corporation: Contracts + Lobbying
   - Think-tank: Policy Positions, Influence
   - Lobbying-firm: Clients + Issues
6. **The Contradictions** (variant: The Core Contradiction)
7. **Timeline** (variants: Chronology, History)
8. **Related Figures** (variants: Related, Related Profiles, Connections, Network)
9. **Sources** (variants: References, Citations, Bibliography)

**Most common order violation:** Class Analysis (pos 3) appears near the bottom of the file, with Core Contradiction (pos 6) up near the top. Seen on Trump (before fix), Rubio, Pelosi. Fix: cut-paste Class Analysis up to right after Central Thesis / Who They Are; push Core Contradiction down to after the Money/Type-Specific sections.

**Extra sections** are allowed between the required 9 — the validator only enforces relative ordering of required sections. Common extras: `## The Central Thesis` (intro framing), `## Rhetorical Signature Moves`, `## Analytical Patterns`, `## Influence Network (Cross-Reference)` (auto-block).

---

## Heading renames (validator-accepted)

| Non-compliant | Rename to | Why |
|---|---|---|
| `## Donor Class Map` | `## The Donor Class Map` | Validator needs "The" prefix for Money section match |
| `## Donation-to-Policy Timeline` | `## Timeline` (subtitle italicized below) | Validator only accepts Timeline / Chronology / History exactly |
| `### Voting Record` (H3) | `## Voting Record` (H2) | Tab system only buckets H2 sections |
| `## Connections to Existing Vault` | `## Related Figures` | Template-standard |

---

## Tab routing (per `quartz/components/ProfileHeader.tsx`)

The profile-sections-to-tabs wrapper buckets H2 sections to tab IDs based on heading text + section variant class. If a heading doesn't match any pattern, it lands in 'overview' by default, which makes the intended tab show "data not yet available".

**Heading → tab routing** (case-insensitive substring match):
- Overview: `who `, `bio`, `background`, `about`, `class analysis`
- Donors/Recipients (Money): `the money`, `the donor class`, `personal grift`, `tax cuts`, `epstein`, `mega-donor`, `industry sector`, or class `psc-donors`
- Voting/Executive: `executive action`, `key vote`, **`voting record`**, **`policy executed`**, **`department action`**, **`diplomatic record`**, or class `psc-executive` / `psc-voting` / `psc-wins`
- Timeline: `timeline`, `donation-to-policy`, or class `psc-timeline`
- Analysis: `influence network`, `connections`, or class `psc-contradiction` / `psc-patterns`
- Sources: `related`, `archived`, or class `psc-sources`

**If you add a new heading text that doesn't match any pattern,** either rename it OR update `ProfileHeader.tsx` line ~229 to add a new text match.

**Cabinet members get POLITICIAN_TABS (Key Votes)**, not PRESIDENTIAL_TABS (Executive Actions), per `ProfileTabs.tsx:43-44`. Only `/presidential/` in the URL path triggers Executive Actions.

---

## Data panel placement

The `<!-- auto:data-panel -->` block must live INSIDE `## The Money` / `## The Donor Class Map` (or the other Money variants). If it's above all H2 sections, the ProfileHeader wrapper treats it as preamble and it renders in the body above the tab nav instead of inside the Money tab.

Generator (`scripts/build-profile-data-panels.cjs`) now **relocates** existing panels into the Money section on every run. If a profile still has a stranded panel, re-run the generator.

---

## Relationships-per-profile — key normalization

Edges in `data/relationships.jsonl` use inconsistent name shapes:
- FEC bulk ingest uses `_Foo Master Profile` (filename-style)
- Frontmatter migration uses clean `Foo`
- Discovery scanner uses whatever

`build-relationships-per-profile.cjs` now normalizes `_Foo Master Profile` ↔ `Foo` to the same key when writing the artifact, so ProfileWidget's lookup finds all the data under the clean display name.

**Rubio stress test:** went from 1 donor visible to 114 after this fix. 159 profiles were similarly split before.

---

## Voting record ingestion

**Script:** `scripts/ingest-voting-record-csv.cjs`

**Expected CSV schema:**
```
Date,Chamber,Bill_Number,Description,Vote,Result,Key_Vote,Category
```

**Usage:**
```bash
node scripts/ingest-voting-record-csv.cjs \
  --profile "Nancy Pelosi" \
  --csv data/bulk/voting-records/pelosi_key_votes.csv \
  --write
```

**Where to put CSVs:** `data/bulk/voting-records/` (junctioned to `C:\donor-map-data\bulk\voting-records\`, survives worktree cleanup).

**Data sources:**
- Voteview: `https://voteview.com/articles/data_help_members` (bulk roll calls per congress, free, no key)
- Clerk.House.gov: `https://clerk.house.gov/evs/{year}/ROLL_{roll#}.xml` (per-vote XML)
- Senate.gov: `https://www.senate.gov/legislative/LIS/roll_call_lists/vote_menu_{congress}_{session}.xml`
- Congress.gov API: free with signup at api.congress.gov
- GovTrack: `https://www.govtrack.us/api/v2/vote_voter?person={govtrack_id}` (no key, good for per-member queries)

**ProPublica Congress API is DEAD** (shut down Feb 2024). Don't use old scripts that reference `api.propublica.org/congress/v1/`.

**For now we're using curated key-votes CSVs** (Key_Vote: Yes/No flag in the CSV). Full roll-call ingestion pipeline is a future build — see `sprint-schedule.md` cc_p3_05..13 notes.

---

## Donor dedup residuals not caught by the scanner

`scripts/propose-donor-dedup.cjs` finds 142 clusters via text normalization. What it misses:

- **Acronym-vs-full-name pairs**: SEIU vs Service Employees International Union. Text similarity can't bridge these; needs FEC-ID-first matching against `data/fec-committee-registry.json`.
- **Successor PACs with same branding**: MAGA Inc (FEC C00892471) and MAKE AMERICA GREAT AGAIN INC. (C00825851) share "MAGA" branding but are genuinely different committees. Don't merge.

When in doubt, check the FEC committee ID before merging. If IDs differ, they're different committees regardless of name similarity.

---

## IE-opposition in frontmatter

**Pattern:** profiles that ran through `rebuild-relationship-caches.cjs` before the role filter was added have anti-them PACs listed as their donors. Example: Joe Biden had MAKE AMERICA GREAT AGAIN INC. listed as a donor.

**One-time fix:** `node scripts/prune-ie-oppose-from-frontmatter.cjs --write` — already ran 2026-04-17, 106 profiles cleaned. Re-run after any cache rebuild to keep clean.

---

## Publication gating — `data/public-routes.json`

Only explicitly-listed routes serve publicly. Everything else 404s (by design per CLAUDE.md rule 10).

**When polishing a profile David wants to review,** add its slug to the allowlist. Don't wait for verified promotion — the review gate shouldn't block the polish gate.

Slug format: `Politicians/{Party}/{Chamber}/{Name-With-Hyphens}/_Name-With-Hyphens-Master-Profile`

Current allowlist (2026-04-17):
- `index`
- `Politicians/Republicans/Presidential/Donald-Trump/_Donald-Trump-Master-Profile`
- `Politicians/Republicans/Trump-Cabinet/Marco-Rubio/_Marco-Rubio-Master-Profile`
- `Politicians/Democrats/House/Nancy-Pelosi/_Nancy-Pelosi-Master-Profile`
- `legal`, `corrections`, `Behind-the-Map`, `Our-Sources`, `The-Receipts`

---

## Browser-native `title=` tooltips

Don't use `title="..."` attributes on hover affordances — browsers render them as grey system tooltips we can't style. Use `aria-label=` for accessibility + a CSS `::after` pseudo-element for the visible hint.

**Seen on:** EvidencePanel `signal-trail-clickable` bars (fixed 2026-04-17).

---

## Chrome console filter gotcha

When debugging a profile on the live site, Chrome's default console filter hides `console.log` (Info level). Our diagnostic logs for AnnotationOverlay (`[anno]`) and ProfileWidget (`[pw-graph]`) now use `console.warn` so they always show.

When writing new client-side debug logs: use `console.warn`, not `console.log`. David shouldn't need to wrangle filter dropdowns to see them.

---

## Deploy cache gotcha

Cloudflare/browser `Cache-Control: max-age=14400` gives a 4-hour browser cache on `postscript.js`. After deploy, a regular refresh won't pull the new JS.

**Always tell David to hard-refresh** (Ctrl+Shift+R) when asking him to verify a JS change on the live site. If he's seeing old behavior, cache is the first suspect.

---

## Bills frontmatter vs auto-block drift

Politicians have bills metadata in two places that can drift apart:

1. **`auto:congress-legislation` body block** — populated from Congress.gov API, shows **career totals** across all terms served. "Scope | Career Total" header.
2. **Frontmatter `bills-sponsored`/`bills-cosponsored`/`bills-enacted` fields** — previously overwritten by `scripts/ingest-congress-bills-bulk.cjs` with **single-congress** (usually 118th) totals. Clobbered the larger API career numbers.

**Symptom:** Pelosi showed `bills-sponsored: 2` (118th only) in the data panel while her auto-block correctly reported `199` (career). Across 85 politician profiles, frontmatter numbers were drastically understated.

**Fix shipped 2026-04-17:**
- `scripts/sync-bills-frontmatter-from-auto-block.cjs` — one-shot sync that reads the auto-block's career numbers and writes them back to frontmatter when larger. Ran against 85 profiles. Adds a `bills-data-scope` field to each profile marking the source.
- `scripts/ingest-congress-bills-bulk.cjs` — added a guard so it no longer clobbers larger existing values. Pass `--force-bills-overwrite` to override when doing a legitimate full-career bulk re-ingest.

**Operational pattern going forward:**
- Congress.gov API pipeline is source of truth for career totals
- Bulk XML ingest stays single-congress (fast, incremental) but writes only when new value > existing
- Rerun `sync-bills-frontmatter-from-auto-block.cjs` after any full API pipeline refresh to pick up new career data

---

## Open questions / backlog

- [ ] Build Senate + House roll-call bulk ingest pipeline so we don't need per-profile CSVs forever
- [ ] Investigate PRIORITIES USA → Trump $72K 2022 direct-contribution edge (possible mis-ingest)
- [ ] Systemic cleanup of 23k+ pre-existing `to_type`/`to_subcategory` denormalization drift (sentinel flags them on every commit)
- [ ] FEC-ID-first matching for the dedup scanner (catch acronym/full-name variants)
- [ ] When `say-vs-pay.top-donors` exists nested, decide whether to promote to top-level or drop

---

**Updates:** append a new dated section for each profile-polish session. Don't edit old sections retroactively — keep the audit trail.
