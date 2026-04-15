---
title: Perplexity Prompt Library
type: admin-note
note-type: research
status: active
last-updated: 2026-04-14
authority: CLAUDE.md Rule 13 (Perplexity-first research protocol)
---

# Perplexity Prompt Library

Canonical prompts for research work that's offloadable from Claude. Copy-paste, fill in the variables, run through Perplexity, save the output to the linked destination.

## When to use a Perplexity prompt

Any task that is **research-shaped** (looks up facts, precedent, documentation, prior art) rather than **code-shaped** (edits files, runs scripts, validates data). Specifically:

- Pipeline research before touching a new API
- Legal / defamation precedent research
- Deferred items triage advice
- Class tag proposals for a batch of entities
- Story score calibration against real outcomes
- Source verification / status research (for flagged URLs)

Anything requiring vault knowledge, file edits, script execution, or editorial voice stays with Claude.

---

## A. New pipeline cheatsheet

**Use when:** Building a pipeline for an API not yet in `content/Pipeline Guide.md`.
**Output destination:** new section in `content/Pipeline Guide.md`.

```
I'm building a data pipeline against the {API_NAME} API for a political donor accountability database. Before I write any code, I need a research cheatsheet in this exact format:

1. **Identity** — what is {API_NAME}, who operates it, what data does it expose
2. **API access** — base URL, auth method (API key / OAuth / JWT / none), rate limits, public vs registration-required
3. **Core endpoints** — the 3-5 endpoints most useful for donor/politician/entity data, with query params that matter
4. **Identifiers** — what ID formats does this API use (are they opaque? are they reused across systems? e.g. FEC uses C0XXXXXXX for committees)
5. **Canonical URL format for citations** — the URL shape we should store when citing a record (NOT search result URLs; the permalink for a specific record)
6. **Known quirks / gotchas** — from public documentation: fuzzy name matching issues, pagination edge cases, field name collisions, stale cache behavior, migration status
7. **Quality signals** — how to tell if a response is valid vs a silent failure (empty arrays, default values, wrong entity returned)
8. **Fallback sources** — if {API_NAME} is unavailable, what Tier 1 source covers the same data
9. **Recent changes** — any migration, deprecation, or API version change in the last 24 months

If you can't find information for a section, say "NO DATA" — don't guess.
```

Fill in: `{API_NAME}`

---

## B. Deferred items triage

**Use when:** You have a backlog of TODO / deferred items and need prioritization.
**Output destination:** annotate `content/Phases/phase-6/deferred-items.md` or a follow-up note.

```
I'm triaging a backlog of 267 deferred items from a political donor accountability database build. Categories: legal/defamation, security/auth, performance, regression/tests, documentation, data integrity, pipelines, phase 2.75/4/5 polish, class tags, misc.

I'm pasting the full backlog below. For each item in the {CATEGORY} category, research:
1. Has this pattern caused real problems in similar investigative journalism or open-source data projects? Cite examples if yes.
2. What is the lowest-effort mitigation?
3. Severity: high (blocks public launch) / medium (pre-scaling) / low (nice to have)
4. Recommended action: fix-now / defer / accept / wontfix

Return a table with columns: item_id, severity, recommendation, rationale (1-2 sentences), precedent (if any).

BACKLOG:
{PASTE_DEFERRED_ITEMS_MD}
```

Fill in: `{CATEGORY}` (usually `legal/defamation` or `security/auth`), `{PASTE_DEFERRED_ITEMS_MD}`

---

## C. AIPAC / sensitive page defamation precedent research

**Use when:** A policy page or story touches legally sensitive subject matter.
**NOT legal advice.** Pattern analysis only. David uses this as input for his own review and (optionally) a lawyer conversation.

```
I'm writing a factual accountability page about {SUBJECT} on a political donor database. The page:
- Maps donor → politician → vote relationships using public records (FEC, LDA, Congress.gov, IRS 990)
- Uses class analysis vocabulary (imperialist-aligned, zionist-aligned, capitalist, labor-aligned) as editorial framing
- Avoids words like "bribed", "corrupt", "scheme", "bought", "co-opted"
- Cites every factual claim to a primary source
- Juxtaposes facts rather than drawing inferences in prose

Research: what defamation, libel, or SLAPP patterns have similar journalism projects (Intercept, Grayzone, Electronic Intifada, Mother Jones, ProPublica, OpenSecrets, CREW) been sued over or forced to retract regarding {SUBJECT}? 

For each case:
1. Publication + year
2. Specific claim that was challenged
3. Outcome (dismissed / retracted / settled / won)
4. What phrasing survived vs what got struck
5. Any specific words or framings that consistently trip lawsuits

DO NOT give me legal advice. This is pattern research, not counsel.
```

Fill in: `{SUBJECT}` (e.g. "AIPAC and its influence on US Congress", "Pfizer lobbying")

---

## D. Class tag batch proposal

**Use when:** A batch of donor/corporation entities need class_tags researched — either because the heuristic proposer skipped them (no sector keyword match, no body-snippet signal) or because Research Claude needs stronger-than-heuristic proposals for a high-profile entity.

**Output destination:** A markdown code block containing JSONL, one record per line. David saves this to `data/perplexity-class-tag-proposals-{YYYY-MM-DD}.jsonl`. From there, a one-shot loader script (`scripts/load-perplexity-class-tag-proposals.cjs` — to be written) merges records into `data/entity-class-tags-proposed.jsonl` with `proposed_by: "perplexity-{MODEL}"` so they flow into the same Ops `/class-tags` approval queue David already uses for heuristic proposals.

**Authority:** ADR-0001 (locked class-tag vocabulary). Do NOT invent new values.

```
You are helping class-tag entities for a political donor accountability database (The Donor Map, thedonormap.org). The analytical framework is class analysis: each entity is tagged along 5 dimensions that locate it in the class structure.

I have {N} donor/corporation entities that need class-tag proposals. The deterministic heuristic proposer already ran and either skipped them (no sector keyword match) or produced low-confidence guesses. Research each one properly: use public FEC filings, IRS 990s, OpenSecrets, ProPublica Nonprofit Explorer, SEC filings, news coverage, and scholarly sources on political economy / class composition.

=== LOCKED VOCABULARY (ADR-0001 — do not invent new values) ===

capital_type — the primary industry / form of capital this entity represents. Pick ONE.
  fossil-capital          — oil, gas, coal, fossil-fuel utilities
  extractive-capital      — mining, timber, commodities, non-fossil extraction
  finance-capital         — banks, hedge funds, private equity, asset managers, Wall Street
  rentier-capital         — real estate, landlords, REITs, intellectual-property licensing
  tech-monopoly           — Big Tech, platform companies, gig-economy labor arbitrage
  retail-monopoly         — Walmart, Amazon retail, logistics giants
  military-industrial     — defense contractors, weapons, intelligence contractors
  carceral-capital        — private prisons, bail bonds, immigration detention, surveillance tech
  pharma-capital          — drug companies, PBMs, health-insurance underwriters
  media-capital           — media conglomerates, entertainment, publishing
  agribusiness-capital    — factory farms, agricultural conglomerates, food processing
  small-capital           — small business, locally owned firms, franchise owners
  professional-class      — law firms, consultancies, professional services (non-capital-owning)
  labor-aligned           — unions, worker co-ops, labor federations
  dark-money-vehicle      — 501(c)(4)s, donor-advised funds, dark-money pass-throughs
  mixed                   — conglomerates or holding companies spanning multiple above (use sparingly)

class_position — where this entity sits in the class structure.
  ruling-class            — ultra-rich individuals (>$100M net worth), billionaire families, strategically-positioned capital
  upper-bourgeois         — owners of significant capital but below ruling class; corporate executives; top 1% earners
  petty-bourgeois         — small business owners, independent professionals, small capital holders
  labor-aligned           — unions and worker-controlled organizations (ALWAYS for any real labor organization, regardless of spend)
  ambiguous               — can't confidently assign; explain why in rationale

ideological_function — what political work the entity does. Multi-select (array, can be empty).
  union-busting           — direct union-busting activity (not just anti-labor)
  climate-denial          — climate denial or delay machine
  deregulatory            — general deregulation / regulatory-capture agenda
  libertarian-ideology    — libertarian / free-market-fundamentalist
  religious-right         — Christian right, religious-right political organizing
  carceral-expansion      — expansion of the carceral state (policing, prisons, detention)
  imperialist-aligned     — pro-imperial foreign policy, regime change, interventionism
  zionist-aligned         — explicitly pro-Israel-lobby positioning (AIPAC, UDP, etc.)
  nativist                — anti-immigration, nativist, "great replacement" rhetoric
  voter-suppression       — voter ID laws, voter purges, election-integrity theater
  privatization           — privatization of public services (schools, infrastructure, etc.)
  austerity               — public-sector austerity advocacy
  anti-trust-defender     — opposing anti-trust enforcement
  tax-avoidance-lobby     — tax-cut lobbying, tax-haven defense
  astroturf               — astroturf / fake grassroots
  dark-money-networked    — embedded in dark-money donor networks
  progressive-capital     — capital-aligned "progressive" (corporate liberalism)
  labor-organizing        — actively organizes workers
  electoral-left          — electoral left politics (DSA-aligned, Squad, etc.)
  movement-left           — movement left (protest movements, abolition, climate justice)

worker_relationship — how the entity relates to the working class. Pick ONE.
  union-busting           — actively busts unions (Amazon, Starbucks, Tesla pattern)
  union-hostile           — resists unionization but not a serial buster
  low-wage-extractive     — business model depends on low-wage workforce (fast food, warehousing)
  neutral                 — no meaningful worker relationship (finance firms, dark-money groups)
  union-neutral-employer  — unionized workforce, management-union relationship is functional
  union-aligned           — explicitly labor-aligned org
  worker-owned            — worker cooperative or worker-owned firm

=== OVERRIDE RULES ===

1. Any real labor union / labor federation → capital_type: labor-aligned AND class_position: labor-aligned AND worker_relationship: union-aligned, regardless of spend or other signals.

2. 501(c)(4)s and 501(c)(3)s funded primarily by billionaire donors that push pro-capital policy → capital_type: dark-money-vehicle, class_position: ruling-class, add ideological_function: dark-money-networked.

3. Trade associations (US Chamber, NAM, etc.) → class_position: upper-bourgeois (NOT ruling-class unless founded/controlled by named billionaires).

4. Individual donors: use net-worth as the class_position signal. >$100M net worth → ruling-class. $10M-$100M → upper-bourgeois. Below that → petty-bourgeois.

5. Foreign government / state-linked actors → class_position: ambiguous (state capital doesn't fit the domestic class framework), ideological_function: imperialist-aligned or nativist as applicable.

6. If you genuinely can't confidently assign → class_position: ambiguous AND confidence: low AND explain why in rationale. Do NOT force a guess.

=== REQUIRED RETURN FORMAT ===

Return ONLY a fenced markdown code block tagged as `jsonl`, containing one JSON object per line. One line per entity. No other prose.

Each record MUST have this exact shape:

{"entity_id":"<ent_NNNNNN from input>","entity_name":"<name>","capital_type":"<one value or null>","secondary_capital_type":"<one value or null>","class_position":"<one value>","ideological_function":["<value>","<value>"],"worker_relationship":"<one value or null>","rationale":"<1-2 sentence class-analysis explanation grounded in specific evidence>","sources":["<url1>","<url2>"],"confidence":"high|medium|low"}

Rules for the fields:
- `entity_id` MUST match the input's ent_NNNNNN. This is how the records get merged back in.
- `capital_type` may be null only if the entity is clearly not a capital holder (e.g. a union — labor-aligned fits there too though).
- `secondary_capital_type` is for entities with meaningful exposure to a second industry (e.g. Koch Industries is fossil-capital primary + finance-capital secondary). Null if not applicable.
- `ideological_function` is an array, can be empty [].
- `worker_relationship` may be null for entities with no direct worker relationship (e.g. a dark-money PAC that doesn't employ anyone).
- `rationale` must cite specific evidence (filing, ruling, policy stance, funding source) — not vague generalizations.
- `sources` is an array of 2-5 URLs you used. Prefer Tier 1 (FEC, IRS 990 via ProPublica Nonprofit Explorer, SEC filings, Congress.gov) over Tier 2 (newspapers, OpenSecrets articles) over Tier 3 (aggregators).
- `confidence` must reflect how much hard evidence you found. high = multiple Tier 1 filings directly support the tags. medium = Tier 2 sources + reasonable inference. low = inference dominates.

=== ENTITIES TO TAG ===

{PASTE_ENTITY_SIGNALS}
```

**Fill in:** `{N}` (count), `{PASTE_ENTITY_SIGNALS}` (the export from `scripts/export-class-tag-research-batch.cjs` — one entity block per target, containing: ent_id, name, type, sector, edge_count, total_political_spend, top_politicians_funded, body_snippet, profile_path. TODO: this exporter is yet to be built; for now, manually copy the relevant rows from `content/Admin Notes/class-tag-research-queue.md` Bucket B).

**Loader destination:** `data/entity-class-tags-proposed.jsonl` via `scripts/load-perplexity-class-tag-proposals.cjs` (TODO: yet to be built). Until then, David can paste the returned JSONL into a new file under `content/Admin Notes/perplexity-research/class-tags-{YYYY-MM-DD}.md` as a fenced block, and Code Claude will write the loader when that file lands.

---

## E. Story score calibration

**Use when:** Tuning `scripts/lib/story-scorer.cjs` against real-world story outcomes.
**Output destination:** new section in phase-5 decisions or a calibration note.

```
I have a story scoring formula for a political donor database. It assigns a score to potential stories based on: money amount, days to upcoming event, cross-party spending, rhetoric contradiction, press coverage count, source tier weight, age in days, news cycle relevance. Scores bucket into low/medium/high tiers.

Here are 20 real political-money stories from the last 12 months with their outcomes (social shares, reposts, news pickups, downstream coverage). For each, I'm telling you what my formula SCORED it, and you tell me what it SHOULD have scored based on the actual reach.

Research: where are the calibration mismatches? Specifically:
1. Which formula weights are too high?
2. Which formula weights are too low?
3. What signals does my formula miss entirely?
4. Does the recency decay curve match real-world story half-life?

Return a calibration report: weight-by-weight recommendations with rationale.

STORIES + CURRENT SCORES:
{PASTE_STORIES}

FORMULA DEFINITION:
{PASTE_STORY_SCORER_CJS}
```

Fill in: `{PASTE_STORIES}`, `{PASTE_STORY_SCORER_CJS}`

---

## F. Source URL deep triage

**Use when:** A batch of URLs are flagged as `generic_orphan`, `needs_review`, or `dead` by the fingerprint classifier and need manual verification before David triages.

```
I have {N} URLs flagged as needing manual review by a content fingerprint classifier for a political accountability database. For each URL, research its current status:

1. Is it live? Dead? Redirected? Bot-blocked (Cloudflare / Imperva / DataDome)? Paywalled? Archive-only?
2. If dead, is there an archive.org snapshot? Give the snapshot URL.
3. If redirected, where does it redirect to? Is the destination still relevant to the original citation?
4. If bot-blocked, can a human browser still access it? (yes/no — test if possible)
5. Recommended disposition: live / dead (replace with archive) / needs_review (David triage) / paywall / redirected / archive

Return as JSONL: source_url, status, archive_url (if applicable), redirect_target (if applicable), recommendation, confidence (high/medium/low).

URLS:
{PASTE_URL_LIST}
```

Fill in: `{N}`, `{PASTE_URL_LIST}`

---

## G. Competitive / prior art check

**Use when:** Before publishing a story, confirm the angle is novel and not already covered by larger outlets.

```
I'm about to publish a story about {STORY_SUBJECT}. The angle is: {STORY_ANGLE}.

Research: has any major outlet (NYT, WaPo, ProPublica, Intercept, Mother Jones, Guardian, AP, Reuters, Politico, Axios, Bloomberg, WSJ, OpenSecrets, CREW) already covered this specific angle in the last 24 months?

For each prior-art match:
1. Outlet + publication date
2. Headline
3. Specific angle covered
4. Overlap % with my angle (0-100%)
5. Is my angle still novel after their coverage? (yes / partial / no)

If no prior art: confirm and suggest which outlets would be natural reposting partners.
```

Fill in: `{STORY_SUBJECT}`, `{STORY_ANGLE}`

---

## How to file Perplexity results back into the vault

1. Save the raw Perplexity output to `content/Admin Notes/perplexity-research/{date}-{topic}.md` with frontmatter:
   ```yaml
   type: perplexity-research
   topic: ...
   date: YYYY-MM-DD
   prompt-template: A | B | C | D | E | F | G
   ```
2. Flag the relevant follow-up as a Code Claude or Research Claude note in `content/Admin Notes/` (standard admin-note frontmatter).
3. When Code Claude actions the research, it should cite the source note in its commit message.

## When Perplexity doesn't know

If Perplexity returns "no data" or clearly fabricates, **do not use the output**. Either:
- Ask David to do a manual search
- Fall back to documented conventions (for pipelines: generic REST; for class tags: heuristic pass)
- Flag the gap in the destination doc prominently

Fabrication risk is highest in C (legal precedent) and G (prior art) — always spot-check 2-3 cited cases against real search results before trusting the output.
