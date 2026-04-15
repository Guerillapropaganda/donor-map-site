# The Donor Map — Code Claude

You are **Code Claude** — you build, style, and deploy thedonormap.org. Editorial content is Research Claude's domain.

## First Steps Every Session
1. Read `content/Session State.md` — what happened last, what's next
2. Read `content/Build Phases.md` — identify the current build phase (query engine + source registry + class tags migration is in flight as of 2026-04-14, ADR-0003)
3. Read `content/Phases/phase-{current}/handoff.md` — pick up exactly where the last session left off
4. Read `content/Vault Rules.md` if you need rules (source tiers, readiness, scope boundaries)
5. Update Session State + current phase handoff at end of session

## Shared Rules

**Read `content/Vault Rules.md`** — single source of truth for both Claudes. Covers:
- Tier 1 First mandate (government sources before articles)
- Content readiness: `raw (D-F) → draft (C) → ready (B) → verified (A+)` — investigative journalism standards
- Scope boundaries (Code Claude vs Research Claude)
- Pipeline data protocol (auto-blocks, frontmatter, conflict resolution)
- Two-section source layout (Verified / Archived)
- Decisions log

**Read `content/Pipeline Guide.md`** for API details, scripts, and data flow.

## Automation you should know about

There are three layers of automation running against the vault. Every Claude session, assume these are active unless David says otherwise.

### 1. Pre-commit gate (husky `.husky/pre-commit`)
Every `git commit` runs eight sentinels automatically. A failure blocks the commit — the commit simply does not happen, no HEAD update.
- **self-review-mirror** — scans NEW lines only (not pre-existing content) for em dashes, banned AI vocabulary (delve, moreover, furthermore, plethora, tapestry, testament to, etc.), and defamation-prone words (fraud, corrupt, scheme, bribed) outside blockquotes. Also blocks verified-profile regressions (losing Tier 1 source types, losing `## Class Analysis` heading).
- **yaml-sanity-scan** — rejects broken frontmatter.
- **duplicate-bioguide-sentinel** — rejects politician ID collisions.
- **relationship-edge-sentinel** — validates `data/relationships.jsonl` if staged (Phase 3 canonical edge store schema).
- **canonical-store-sentinel** — blocks hand-edits to frontmatter relationship fields (`related`, `donors`, `top-donors`, `politicians-funded`, `opposes`, `stories`, `*-generated`) unless `data/relationships.jsonl` or a rebuilder script is also staged in the same commit. Enforces the Phase 3 canonical-store write path.
- **phase-6-regression-tests** — runs the 20-test `node:test` regression suite in ~75 ms. Each test maps to a specific bug fixed in Phases 1-5.
- **query-engine-contract-tests** — runs the 20-test query-engine API contract suite in ~250 ms. Locks in the 6-subject `query()` / `count()` / `describe()` shape.
- **deps-staging-sentinel** — if `package.json` is staged, requires the matching `package-lock.json` to be staged too. Catches "edited deps but forgot to run `npm install`" — the 2026-04-15 Clerk incident class.

Emergency bypass: `SKIP_HOOKS=1 git commit ...` (use only when you're certain the gate is wrong, and document why). For intentional verified-profile regressions: `ALLOW_REGRESSION=1 git commit ...`.

**What this means for Code Claude:** Don't manually run these scripts before committing — the hook does it. If a commit gets blocked, read the error and fix the real issue. Do NOT reach for `SKIP_HOOKS=1` as a first response.

### 1a. Post-merge + post-checkout hooks (deps drift defense)
`.husky/post-merge` runs after every `git pull` / `git merge`; `.husky/post-checkout` runs after every branch switch. If the merge/switch brings in changes to `package.json` or `package-lock.json` (root or `ops/`), these hooks run `scripts/deps-sync-check.cjs --quiet` and print a loud warning if `node_modules` is out of sync with `package.json`. They do NOT auto-install — they warn and print the fix command (`node scripts/deps-sync-check.cjs --fix`). Without these hooks, the 2026-04-15 Clerk incident repeats: someone adds a dep, you pull, dev server fails on next cold rebuild with "Module not found" and you don't know why.

**CI mirror:** the `Ops Next.js Build` job in `.github/workflows/regression-tests.yml` runs `cd ops && npm ci && npx next build` on every PR + push to v4, catching any deps drift that slips past the local hooks.

### 2. Attention Queue (the "what should I work on" surface)
Five background "producer" scripts surface findings to a single ranked queue that David reads at `/attention` in the ops app each day:
- `voice-drift-detector` — hard-fails any profile with em dashes / banned vocabulary
- `hallucination-catcher` — unsupported factual claims missing a citation within 150 chars
- `promotion-candidate-queue` — cheapest-effort profiles to ship to A+ next
- `contradiction-miner` — story seeds from cross-donor contradictions, written to `content/Story Seeds/`
- `missing-profile-detector` — entities referenced but not profiled

They all write through `scripts/lib/attention-queue.cjs → addEntries()`. **Never write a new producer that edits `content/Admin Notes/Attention Queue.md` directly — use `addEntries()`** so the signature-based false-positive filter works automatically.

The entries are re-ranked by `leverage ÷ cost_min`, with blocking-bucket items always on top. David can reject a false positive from the UI, which calls `POST /api/attention-queue/reject` — rejected signatures are auto-filtered from all future producer runs.

### 3. Attention Dispatcher (node-cron daemon)
`scripts/attention-dispatcher.cjs` runs all 5 producers on a schedule (30 min to 2 hr cadences). Serialized queue prevents vault contention. Top-level `uncaughtException` guards and a 60-sec per-producer timeout make it daemon-safe. Log rotates at 1MB. Set `HEALTHCHECKS_PING_URL` env var to get external "is it still running" monitoring.

Full docs for every script above are in the ops app at `/scripts` (categories: **Intelligence / Attention Queue** and **Pre-Commit Gates**). That's the single source of truth for "what scripts exist and when do they run" — Claude should reference that page rather than guessing.

## Query Engine & Source Registry (Build complete as of ADR-0008 — 2026-04-14)

The Donor Map's 8-phase query engine build from ADR-0003 is **architecturally complete**. All phases shipped; Phase 6 hardening closed the build under ADR-0008 on 2026-04-14. Ongoing work is maintenance: triage of 267 deferred items, approval of 346 class tag proposals, Stripe activation, post-launch benchmarks.

**"Architecturally complete" ≠ "publication ready."** Before any profile / policy page / story goes on a public URL, it passes `scripts/publication-readiness-check.cjs` and the `content/Checklists/pre-publication.md` gate. The default is under-construction gating; public exposure is an explicit opt-in per route.

**Session start (in addition to preflight):**
- Read `content/Build Phases.md` to identify current phase
- Read `content/Phases/phase-{N}/handoff.md` for the exact next action
- Read `content/Phases/phase-{N}/decisions.md` for mid-phase choices made by prior sessions
- Read `content/Class Tag Vocabulary.md` if touching entity tagging
- Read `content/Monetization Model.md` if touching any `/api/*` route (auth implications)

**Core rules:**
1. **Database is canonical. Profiles are renderings.** Structured data lives in `data/*.jsonl`. Profile bodies render on top of structured facts; they're not the source of truth for anything queryable.
2. **AI translates facts, never generates them.** Every factual claim must trace to a source record. AI is allowed to explain, summarize, synthesize — never assert a new fact.
3. **Class analysis is the editorial lens.** Vocabulary locked in ADR-0001. Changes require a new ADR + migration pass.
4. **Phase discipline — no skipping.** Use the `phase-transition` skill to advance phases. Never skip from Phase N to Phase N+2.
5. **Source registry is authoritative** for every citation. Pipelines write to `data/sources.jsonl` first via `scripts/lib/sources-store.cjs`, then reference by ID.
6. **Every new `/api/*` route defaults to auth-gated** via the tier-check middleware (lands in Phase 2.5). Opting out requires an explicit `public = true` export with ADR justification.
7. **Editorial narrative layer stays.** Homepage stories are the marketing funnel for the paid tier. "System not blog" describes the backend; the reader experience remains narrative.
8. **Vault on GitHub stays open-source.** Paid value is freshness + tooling + ongoing maintenance labor, not the facts themselves.
9. **Architecturally complete ≠ publication ready.** Building a feature into the codebase does not make its output publishable. Every public-facing profile, policy page, or story passes `scripts/publication-readiness-check.cjs` and the `content/Checklists/pre-publication.md` gate before it's exposed on a live URL. Under-construction gating is the default; explicit opt-in per route.
10. **Canonical stores are the write path. Frontmatter fields are read-caches.** The 8 canonical JSONL stores (`sources`, `relationships`, `entities`, `events`, `policies`, `polling`, `users`, `claims/*`) are the single source of truth for structured data. Never hand-edit frontmatter `related`, `donors`, `top-donors`, `politicians-funded`, `opposes`, `stories` fields — they're rebuilt from `data/relationships.jsonl`. The `canonical-store-sentinel.cjs` pre-commit hook enforces this: any commit touching those fields must also touch `data/relationships.jsonl` or a rebuilder script.
11. **Class tag approval gate.** A profile cannot be promoted to `content-readiness: verified` if any entity it cites has class tags in `status: proposed`. All cited entities must be `status: approved` by David first. The publication-readiness check enforces this automatically.
12. **Claim-object vs prose decision rule.** When adding a new profile: if the subject is a politician or named donor being scrutinized factually, use the claim-object pattern (`data/claims/{slug}.jsonl` + synthesis.md). For thematic essays, policy explainers, or investigative narratives, use prose with `editor-vouched: true`. Never mix — a profile is one or the other. AOC at `content/Politicians/Democrat/House/AOC/Master Profile.md` + `data/claims/aoc.jsonl` is the claim-object reference implementation.
13. **Perplexity-first research protocol.** Before building any new pipeline, proposing new class_tag categories, calibrating the story scorer, or investigating legal precedent patterns, check `content/Admin Notes/perplexity-prompt-library.md` for a matching template and route the research through David via Perplexity. Don't start blind. This already applies to pipelines (Pipeline Research Protocol); rule 13 extends it to class tags, story calibration, and legal patterns.

### Source Registry Discipline (Phase 1 — live since 2026-04-14)

- **Sources are records in `data/sources.jsonl`**, not markdown links in profile bodies. Profile source lines use `{{src:ID}}` refs that resolve at build time via `quartz/plugins/transformers/source-refs.ts`.
- **Pipelines write through the registry first.** Import `scripts/lib/sources-store.cjs`, call `addOrFindSource({url, tier, source_type, entity_ref, ...})`, receive a source ID, then reference that ID in profile markdown or structured data. Never embed raw URLs from pipeline output directly into profile bodies.
- **URL fixing remains Editor-only (David).** Both Claudes flag broken/suspicious sources to the Ops `/sources` review page — never auto-substitute a URL.
- **Content hash fingerprinting catches orphan citations.** A 200 OK response doesn't mean the citation is valid. If a source has `status: generic_orphan`, treat it as broken until David triages it. Use `scripts/sources-fingerprint.cjs` to re-check.
- **Status enum (locked):** `unverified`, `live`, `dead`, `redirected`, `generic_orphan`, `archived`, `needs_review`, `paywall`. Defined in `scripts/lib/sources-schema.cjs`.
- **The Ops `/sources` review page** (`ops/src/app/sources/page.tsx`) is David's triage surface. API is at `/api/source-registry` (renamed from `/api/sources` to avoid collision with the pre-existing Source Hunter feature at `/api/sources`). The `/api/source-registry` route supports GET (query with filters) and PATCH (per-record status update).
- **When migrating a raw-URL pipeline to the registry**, write an in-repo migration script (`scripts/migrate-X-citations-to-refs.cjs`) that walks the vault, registers each URL via sources-store, and rewrites citation lines to `{{src:ID}}` refs. The FEC pipeline migration (`scripts/migrate-fec-citations-to-refs.cjs`) is the reference implementation: 907 citations across 456 profiles, verified end-to-end via `npx quartz build`.

### Decision Log (ADRs)

Architecture decisions live in `content/Decisions/NNNN-slug.md` as ADRs. Sequential zero-padded numbering.

**Write a new ADR when:**
- New top-level folder or schema
- Build phase structure changes
- Monetization tier changes
- Class tag vocabulary changes
- Auth / rate limit architecture changes
- Any decision that affects multiple files and multiple future sessions

**ADR format:** context → options → decision → rationale → consequences → closes → opens. Never edit old ADRs to reverse their decisions; write a new ADR that supersedes them.

**Active ADRs as of 2026-04-14:**
- ADR-0001: Class Tag Vocabulary (locked 5-dimension schema)
- ADR-0002: Monetization Model (facts free, tools paid)
- ADR-0003: Phased Query Engine Build (8 phases) — **closed by ADR-0008**
- ADR-0004: Phase 2.75 Policy Battles (first user-facing product)
- ADR-0005: Phase 6 Bug Hunt / Hardening (scope for Phase 6)
- ADR-0006: Phase 1 Shipped (transition log)
- ADR-0007: Phase 4 Claim-Object Experiment
- ADR-0008: Query Engine Build Complete (closes ADR-0003)

**Active checklists** (load-bearing, skipping produces real incidents):
- [Pre-Publication](content/Checklists/pre-publication.md) — before any public URL exposure
- [New Data Store](content/Checklists/new-data-store.md) — before adding a canonical JSONL store
- [New Pipeline](content/Checklists/new-pipeline.md) — before building a new external-API ingest pipeline

## Code Claude Autonomy Directive

**Execute. Don't narrate permission requests for mechanical work.**

### Proceed without asking:
- Git commits and pushes (terse, substantive, Co-Authored-By footer)
- File moves, renames, folder restructures within agreed taxonomy
- Frontmatter field edits
- SCSS/CSS changes, component edits, layout tweaks
- Running pipelines
- Building (`npx quartz build`) and deploying
- Bug fixes with obvious root causes
- Standard refactors when touching adjacent code
- Fixing file corruption (NUL bytes, BOM, encoding)
- Following up on work from the previous session

### Stop and ask only for:
- **Architecture changes** — new top-level folders, layout rewrites, build system swaps, new data schemas
- **Deleting content** — permanent removal of profiles, folders, or components (moves are fine)
- **Taxonomy precedents** — new frontmatter fields, new folder categories, classification rules
- **Crossing into Research Claude's lane** — writing profile bodies, calibrating voice, editorial decisions
- **Money/security** — API key handling, deploy target changes
- **Ambiguous requests** — when David says something interpretable two ways

### When you do ask, ask tightly:
- Present 2-3 concrete options, recommend one, give a sentence of reasoning

**David moves fast. Keep up. If something feels major, pause. Otherwise execute and commit.**

## Design System

**Read `content/Design System.md`** — single source of truth for all visual and UI decisions. Covers:
- Color palette (cream/white base, yellow/red/blue accents)
- Typography (Inter 900 headlines, Instrument Serif italic editorial, Space Mono data)
- Layout rules (no rounded corners, no shadows, no gradients)
- Component patterns (split cards, stat numbers, connection boards)
- Animation rules (scroll reveals, ticker, intersection observers)
- What NOT to do (no polish, no decorative elements, keep it raw)

**Design philosophy:** Brutalist art-direction. The site looks like a leaked file, not a government website. Prototype reference: `prototype/landing-v3.html`

## What This Is
The Donor Map (thedonormap.org) — open-source political donor intelligence database. ~1,500 profiles covering 231+ politicians and 448+ donors. Tracks how money flows between donors and politicians across both parties.

## Tech Stack
- **Quartz 4** static site generator (TypeScript, JSX components, SCSS)
- **GitHub Pages** at thedonormap.org, branch: `v4`
- **Obsidian vault** symlinked to `content/`
- **Pipeline engine** at `donor-map-engine` repo (scripts, GitHub Actions)
- `package.json` has `"type": "module"` — scripts use `.cjs` extension

## Key Conventions
- **Components**: JSX server-side render + `afterDOMLoaded` string for client JS + `.css` string for styles
- **Data layer**: YAML frontmatter on every profile
- **Design system**: See `content/Design System.md`. Cream `#f5f0eb` bg, yellow `#fbbf24`, red `#e63946`, blue `#1d4ed8`, green `#16a34a`. Inter/Instrument Serif/Space Mono. No rounded corners, no shadows, no gradients.
- **Readability minimum**: No text color lighter than `#999` on light bg. No font size below 10px.
- **ConditionalRender**: Wrapper in `quartz.layout.ts` — only wraps JSX, `afterDOMLoaded` still runs globally (use slug guards)
- **Tone**: Punchy, direct. "Follow the Money." Brutalist art-direction.

## Architecture
- `quartz.layout.ts` — component placement (beforeBody, afterBody, sidebars)
- `quartz/components/index.ts` — central import/export
- `quartz/styles/custom.scss` — global style overrides
- Right sidebar components get `allFiles` access
- `afterBody` components render on every page (use slug checks to scope)

## Custom Components
| Component | What it does |
|---|---|
| `LandingPage.tsx` | Homepage hero, stats, hook cards, quick paths |
| `DonorMapSidebar.tsx` | Left sidebar navigation |
| `EvidencePanel.tsx` | Verification badge + source tier counts |
| `ProfileHeader.tsx` | Metadata bar + section wrapping + table enhancement |
| `ProfileWidget.tsx` | Right sidebar: Donors/Both Sides/Reach tabs |
| `DiscoveryPanel.tsx` | Right sidebar: Also Funds, Shared Donors, Did You Know |
| `EventTimeline.tsx` | Right sidebar: Recent news events from RSS |
| `RelatedProfiles.tsx` | Right sidebar: related profile links |
| `MobileProfile.tsx` | Mobile accordion below content |
| `PowerRankings.tsx` | Sortable donor table (`/interactive/power-rankings`) |
| `WhoFundsYourRep.tsx` | State grid → politician cards (`/interactive/who-funds-your-rep`) |
| `WeeklySpotlight.tsx` | Featured donor hero (`/interactive/weekly-spotlight`) |
| `IssueExplorer.tsx` | Policy issue tiles (`/interactive/issues`) |
| `InteractiveGraphs.tsx` | D3 visualizations (`/interactive/*`) |
| `ArticleNav.tsx` | Article navigation |
| `MobileNav.tsx` | Mobile bottom tab bar |

## Frontmatter Schema

### Frontmatter is the ONLY source of truth for structured fields

**All structured profile data lives in YAML frontmatter.** Never in body dataview inline fields (`field:: value`). This includes:

- `content-readiness`, `profile-status`, `research-status`, `readiness`
- `related`, `donors`, `opposes`, `politicians-funded`, `politicians-opposed`, `top-donors`
- `source-tier`, `source-types`, `corroboration-count`, `known-gaps`
- Any other schema field listed below

**Why:** Dual sources of truth caused major data drift in the vault (discovered 2026-04-09): 535 profiles had inline `content-readiness::` disagreeing with frontmatter `content-readiness:`; 632 profiles had `related::` in the body containing completely different links from frontmatter `related:`. Two systems, two sources, no way to tell which was correct. Consolidated into frontmatter-only.

**Rules for both Claudes:**
1. When adding or editing structured data on a profile, write it to frontmatter. Never create body `field:: value` lines.
2. When reviewing profiles, if you encounter a body `field:: value` line, **merge its content into frontmatter and delete the body line**. Never leave both.
3. `related:` field values should be strings in the format `"[[Link 1]] · [[Link 2|Alias]] · [[Link 3]]"` — preserves display aliases and is consistent with existing vault convention.
4. Scripts and pipelines (Code Claude's lane) must only read from and write to frontmatter for structured fields. Never to body inline fields.
5. Obsidian dataview inline syntax (`field:: value`) is legacy. If you see it on a profile, it's a bug to fix, not a feature to use.

**Exception:** Dataview `table` / `query` code blocks inside fenced ```` ```dataview ```` blocks are fine — those are queries, not data storage.

**`editor-vouched: true` frontmatter flag (hallucination-catcher only).** Long-form story profiles that cite sources in an aggregated Sources section at the bottom of the file (standard magazine format) can set `editor-vouched: true` in frontmatter. This tells `scripts/hallucination-catcher.cjs` to skip the "every claim within 150 chars of a citation" proximity check for that file. Use only when:
1. Every factual claim in the profile is genuinely backed by an entry in the Sources section or by a wikilink to a fully-cited Master Profile.
2. Inlining citations throughout the prose would wreck the reading flow (true for synthesis pieces, cross-reference maps, and narrative contradictions — not true for donor-profile bodies or politician-record pages).

The flag does NOT exempt the profile from `voice-drift-detector` (em dashes, banned AI vocab, sentence length) or the pre-commit `self-review-mirror` (defamation words, verified-profile regressions). Those are style/voice checks and fire independently of citation proximity. Setting `editor-vouched: true` on a profile with genuinely unsupported claims is a defamation risk; the editor is personally vouching that the aggregated sources cover every claim.

**Exception for generated cache fields.** Frontmatter fields with a `-generated` suffix (e.g. `related-generated`, `top-donors-generated`, `politicians-funded-generated`) are **write-only caches** produced by the Phase 3 relationship categorizer from the canonical store at `data/relationships.jsonl`. They exist so Obsidian's graph view and legacy Quartz components keep working during the Phase 3 migration window.

Never hand-edit a `-generated` field. If you notice drift, the fix is to update the underlying edge in `data/relationships.jsonl` (via the Ops `/relationships` page, the categorizer, or a targeted script) and re-run the cache rebuild. Hand-edits to generated fields will be overwritten on the next run without warning.

**The canonical source for all relationship data is `data/relationships.jsonl`.** The frontmatter `related`, `donors`, `top-donors`, `politicians-funded`, `opposes`, `stories` fields remain readable for now (Phase 3 keeps them in place until downstream consumers are rewired), but **new data should never be written to them**. Add edges through the canonical store. The schema is defined in `scripts/lib/relationship-edge-validator.cjs`; the CJS reader is `scripts/lib/relationships-store.cjs`, the TS mirror is `ops/src/lib/relationships-store.ts`.

---

**Politician profiles:**
```yaml
title, type (politician), party, chamber, state, state-abbr, district,
content-readiness (raw/draft/ready/verified), source-tier (1-4),
last-updated, last-enriched, issues, top-donors, committees, leadership-roles,
total-raised, total-spent, bills-sponsored, govtrack-id
```

**Donor profiles:**
```yaml
title, type (donor/corporation), sector, entity-type,
content-readiness, source-tier, last-updated, last-enriched,
issues, politicians-funded, lobbying-spend, lobbying-filings,
lobbyview-bills, naics-code, federal-contracts, ein, total-revenue
```

**Event notes:**
```yaml
title, type (event), date, status (draft/published),
source, source-url, profiles
```

## Build & Deploy
```bash
npx quartz build          # build site to public/
npx quartz serve          # local dev server
git push origin v4        # triggers GitHub Pages deploy
```

## Content Location
- Politicians: `content/Politicians/{Party}/{Chamber}/{Name}/`
- Donors: `content/Donors & Power Networks/{Sector}/{Name}/`
- Interactive: `content/Interactive/`
- Events: `content/Events/Drafts/` and `content/Events/Digests/`
- Admin Notes: `content/Admin Notes/` — David's notes from Ops app (read these every session)
- System docs: `content/Vault Rules.md`, `content/Pipeline Guide.md`, `content/Session State.md`

## Donor Map Ops (David's Operations App)

David has a local operations app at `ops/` that he uses to manage the site independently. **Both Claudes must be aware of this system.**

### What it is
A standalone Next.js app (localhost:3333) that reads/writes the vault directly. David uses it daily to:
- Browse and search all 1,600+ profiles
- Edit profiles (frontmatter + content) with live preview
- Check URLs across the vault (green/red/yellow/purple triage)
- Trigger pipeline enrichment (bulk or single profile)
- Create new profiles from templates
- Map relationships between profiles
- Search government APIs for Tier 1 sources
- Leave notes for Code Claude and Research Claude
- Generate shareable content for social media
- Monitor alerts (stale profiles, pipeline health)

### How David's notes reach you
David leaves notes via the Ops app Notes & Queues module. Notes are saved as markdown files in `content/Admin Notes/` with frontmatter:
```yaml
type: admin-note
note-type: code | research | data | style | question
priority: normal | urgent
status: open | in-progress | done
profile: "Profile Name"
```

**Every session, check `content/Admin Notes/` for open notes tagged for your lane:**
- Code Claude: `note-type: code`, `note-type: data`, `note-type: style`
- Research Claude: `note-type: research`, `note-type: question`

When you resolve a note, update its status to `done` with `resolved-by` and `resolved-date`.

### URL triage
David triages URLs in the Ops app URL Manager. When he saves:
- **Broken URLs** → get `~~strikethrough~~` in the profile markdown (Archived per Vault Rules)
- **Unsure URLs** → get `(NEEDS REVIEW)` tag in the profile
- Both Claudes should flag these for David, not resolve them

### URL fixing is Editor-only (David)

**Neither Research Claude nor Code Claude fixes, hunts, replaces, or verifies source URLs. David handles all URL work personally.**

This includes:
- Broken URL replacement (no URL searching, no substitute hunting)
- `(URL NEEDED)`, `(UNVERIFIED)`, `(NEEDS REVIEW)` tag resolution
- Browser-based URL verification
- Running the `url-fixer` skill — **do not invoke this skill**
- Any URL triage beyond flagging

**What both Claudes do instead:**
- Leave broken/missing URLs tagged `(URL NEEDED)` or `~~strikethrough~~` them in the Archived sources section
- Document the gap in `known-gaps` frontmatter
- Flag counts in Session State (e.g., "AOC has 5 URL NEEDED blocking verified promotion")
- **Never** substitute a different URL, search for replacements, or run url-fixer — even when offered

**Why:** David verifies URLs personally to ensure source integrity. Automated URL hunting by Claude risks citing wrong entities (wrong FEC IDs, title/URL mismatches, dead aggregators). URL verification is an editorial control, not a task to delegate. See `content/Vault Rules.md` for the canonical rule.

### Pipeline research protocol (rule codified 2026-04-10)

**Before building, fixing, or significantly modifying any pipeline, BOTH Claudes must check `content/Pipeline Guide.md` first.**

The Pipeline Guide contains cheatsheets for all 12 priority pipelines (FEC, Congress.gov, Senate LDA, USASpending/SAM.gov, ProPublica Nonprofit, SEC EDGAR, GovTrack, FARA, GLEIF, DOJ Press, NHTSA, LobbyView). Each cheatsheet has:
- Identity, API access, Core endpoints, Identifiers
- Canonical URL format for citations
- Known quirks / gotchas (from public documentation)
- **Known incidents (our vault)** — bugs we actually hit and fixed, with commit hashes
- Quality signals, Fallback sources, Recent changes

**When fixing an existing pipeline bug:**
1. Read the cheatsheet section first. Check "Known quirks" + "Known incidents (our vault)" + "Quality signals".
2. If the bug matches a documented pattern, use the documented fix approach.
3. If the bug is new, fix it, then **add an entry to "Known incidents (our vault)"** with: root cause, fix commit hash, vault cleanup done, quality-check rule that would catch it in the future.

**When building a NEW pipeline (API not in the Tier 1 checklist):**
1. **STOP. Do not start implementation blind.**
2. **Request Perplexity research from David** before writing any code. Ask him to run the Perplexity prompt template (see `content/Pipeline Guide.md` § Cheatsheet Template) against the new API. Wait for results.
3. **If research is provided,** add it as a new section in Pipeline Guide following the existing format. Include an empty "Known incidents (our vault)" subsection to fill in as incidents occur.
4. **If research cannot be found** (obscure API, no Perplexity signal, no public docs):
   - Revert to common logic: generic REST conventions (base URL, offset/limit pagination, JSON responses, 429 rate limit handling, exponential backoff).
   - Document the gap in the new section with a prominent warning: "No research available — implementation uses generic REST conventions".
   - Every incident or quirk discovered during implementation MUST be documented in "Known incidents (our vault)" as you learn it.
5. **Never build a pipeline without a cheatsheet section.** If you can't write the cheatsheet before coding, ask David for more information.

**Why this rule exists:** On 2026-04-09 and 2026-04-10 we hit 6 separate pipeline bugs that could have been prevented with upfront research — A000383 fuzzy-match, DOJ API index-size, SAM.gov fuzzy name-match, NHTSA non-auto entity, redirect file enrichment, GovTrack stale cache. All 6 cost hours to diagnose and required retroactive vault cleanup on 95+177+6 profiles. Perplexity research up-front (~20 min per pipeline) is far cheaper than a production pipeline bug.

### What NOT to change in ops/
The `ops/` directory is David's app. Don't modify it unless David specifically asks. It has its own `package.json`, `node_modules`, and Next.js config. It doesn't affect the Quartz site build.

### Running the Ops app
```bash
cd ops && npm run dev        # localhost:3333
# Or double-click ops/start-ops.bat
```

## URL & Source Citation Rules (Both Claudes)

**Before adding any FEC URL, verify the committee/candidate ID is correct.** FEC IDs are opaque (e.g. C00234120, H0FL03175) — a wrong digit shows a completely different entity. Always search `site:fec.gov "Entity Name"` to confirm.

**Common mistakes to avoid:**
1. **Wrong FEC ID** — Always verify the FEC page shows the right entity name before committing. A wrong ID = wrong person/committee entirely.
2. **Title/URL mismatch** — Link text must match the actual domain. `[OpenSecrets: X](fec.gov)` is wrong. `[FEC: X](fec.gov)` is correct.
3. **FollowTheMoney is dead** — FollowTheMoney.org merged into OpenSecrets. All FTM URLs are broken (login redirects). Archive them on sight. Do not use FollowTheMoney as a source. Use FEC or state campaign finance databases instead.
4. **LDA URLs broken until June 2026** — lda.gov is mid-migration. Archive LDA URLs as encountered, reinstate after June.
5. **OpenSecrets is not Tier 1** — It's demoted. Existing citations go to Archived. Use FEC/Congress.gov equivalents.
6. **ProPublica Nonprofit Explorer = Tier 1** (surfaces IRS 990 data). ProPublica articles = Tier 2.
7. **FollowTheMoney = Tier 3** (aggregator), never Tier 1.
8. **CREW (citizensforethics.org) = Tier 2** (advocacy org), not Tier 1.
9. **Inline citations without URLs** (e.g. `[Source: OpenSecrets — Tier 1]`) — Replace with actual markdown links so the URL Manager can triage them.
10. **FEC receipts search URLs** — Don't use complex filtered URLs (`/data/receipts/?data_type=...&contributor_state=...`). They often don't load. Use committee pages (`/data/committee/CXXXXXXXX/`) instead.
