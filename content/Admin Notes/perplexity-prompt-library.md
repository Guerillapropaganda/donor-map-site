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

**Use when:** A batch of entities need class_tags researched (on top of or replacing the heuristic pass).
**Output destination:** JSONL that Research Claude loads into the approval queue.

```
I have {N} entities from a political donor database that need class tag proposals. For each, propose:

- `capital_type` from: industrial / financial / rentier / labor-aligned / petty-bourgeois / state-capital
- `class_position` from: ruling-class / capitalist / professional-managerial / labor-aligned / ambiguous
- `ideological_function` array from: [climate-denial, union-busting, privatization, deregulation, surveillance-state, carceral-state, imperialist-aligned, zionist-aligned, christian-nationalist, corporate-liberal, progressive, socialist, labor-militant, tenants-rights, ...]

Override rules:
- Labor unions ALWAYS get `capital_type: labor-aligned` AND `class_position: labor-aligned`, regardless of spend
- Foundations and 501(c)(3)s that are funded by billionaires and push market-friendly policy get `capital_type: financial` AND `class_position: ruling-class`
- Trade associations get `class_position: capitalist` (not ruling-class unless explicitly billionaire-funded)
- If you can't confidently tag an entity, set `class_position: ambiguous` and explain why

Return as JSONL, one record per line, with: entity_name, capital_type, class_position, ideological_function, rationale (1 sentence), confidence (high/medium/low).

ENTITIES (with signal data: revenue, lobbying spend, sector, NAICS code, description):
{PASTE_ENTITY_SIGNALS}
```

Fill in: `{N}`, `{PASTE_ENTITY_SIGNALS}`

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
