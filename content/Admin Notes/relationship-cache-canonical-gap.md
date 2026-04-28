---
title: Relationship cache canonical-gap audit
type: report
status: open
kind: report
last-updated: '2026-04-28'
auto-generated: true
harness-check: relationship-cache-canonical-gap
auto-resolve-when: '/relationship cache canonical-gap audit/i'
---

# Relationship cache canonical-gap audit

Phase A of the librarian-rewrite plan (ADR-0026 follow-up).

This report compares frontmatter relationship caches (`donors:`, `opposes:`, `politicians-funded:`) against the canonical relationships graph. Generated automatically; re-run `node scripts/relationship-cache-canonical-gap.cjs --report` to refresh.

**Audit scope:** 3246 profiles, 236279 graph edges, 1553ms.

## Headline numbers

| Field | Profiles with data | Profiles with gap | Total entries | Exact match | Alias drift | Frontmatter-only | Graph-only |
|---|---:|---:|---:|---:|---:|---:|---:|
| **donors** | 1203 | 1110 (92.3%) | 55791 | 43886 (78.7%) | 12 (0.0%) | 3011 (5.4%) | 8882 (15.9%) |
| **opposes** | 175 | 156 (89.1%) | 431 | 79 (18.3%) | 34 (7.9%) | 63 (14.6%) | 255 (59.2%) |
| **politicians_funded** | 1273 | 1142 (89.7%) | 88385 | 34898 (39.5%) | 23 (0.0%) | 9680 (11.0%) | 43784 (49.5%) |

## Categories explained

- **Exact match** — frontmatter and graph agree on this entity, after lowercase + whitespace normalization. No action needed.
- **Alias drift** — the same entity is referenced under two different spellings (e.g. `United Democracy Project` vs `United Democracy Project - UDP`). Fixable with an alias map; recurring pairs are auto-fix candidates.
- **Frontmatter-only** — entity in frontmatter but not in the graph. Two sub-cases: (1) editorial assertion that should be lifted into the graph (e.g. indirect opposition: "Mainstream Democrats PAC opposes Cori Bush because it funded her primary opponent Wesley Bell"), or (2) stale entry that should be removed from frontmatter.
- **Graph-only** — entity in graph but not in frontmatter. The `rebuild-relationship-caches.cjs` script already handles backfilling these into frontmatter caches; if the count is non-zero, that script may not have been run recently.

## Top recurring alias pairs (auto-fix candidates)

These pairs appear repeatedly across profiles. Each one represents the same entity under two spellings. Adding the pair to a canonical alias map would fix all instances at once.

| Count | Frontmatter spelling | Graph spelling |
|---:|---|---|
| 7 | `nrsc - national republican senatorial committee` | `national republican senatorial committee` |
| 3 | `moskowitz` | `wilson,elser,moskowitz,edelman dicker llp pac` |
| 2 | `dscc - democratic senatorial campaign committee` | `democratic senatorial campaign committee` |

## Frontmatter-only `opposes` examples

These are entries the editor put in frontmatter that have no corresponding `political-opposition` edge in the graph. The Wesley-Bell pattern (donor of primary opponent → opposer of original) is the most common case — frontmatter captures editorial intent the graph can't infer today.

- **Sfa Fund, Inc** — `Ron DeSantis`
- **The Sentinel Action Fund** — `Mark Kelly`
- **Congressional Leadership Fund** — `Kyrsten Sinema Master Profile`
- **NRA Political Victory Fund** — `George W. Bush`
- **Senate Leadership Fund** — `Raphael Warnock Master Profile`, `Mark Kelly`, `John Fetterman Master Profile`, `Catherine Cortez Masto`
- **Senate Majority PAC** — `Shelley Moore Capito`
- **Don Lemon** — `Fox Corp - Rupert Murdoch`
- **Mehdi Hasan** — `Fox Corp - Rupert Murdoch`
- **Alexandria Ocasio-Cortez Master Profile** — `_Donald Trump Master Profile`, `AIPAC - American Israel Public Affairs Committee`
- **Ayanna Pressley Master Profile** — `Predatory lenders`, `Private prison industry`
- **Cori Bush** — `AIPAC`, `Mainstream Democrats PAC`, `Wesley Bell`
- **Hakeem Jeffries Master Profile** — `Progressive caucus insurgents (via gatekeeping mechanisms)`

## Graph-only `opposes` examples (backfill candidates)

These are `political-opposition` edges in the graph that aren't reflected in the profile's frontmatter `opposes:` field. Running `node scripts/rebuild-relationship-caches.cjs --write` should pick these up if the script is configured to handle the opposes field (currently it handles only monetary edges).

- **Americans for Tax Reform - Grover Norquist** — `Raul Grijalva`
- **Federalist Society** — `Sheldon Whitehouse`
- **Freedom Partners Chamber of Commerce** — `Catherine Cortez Masto`
- **Judicial Crisis Network** — `Sheldon Whitehouse`
- **Marathon Petroleum** — `Rashida Tlaib`
- **DMFI - Democratic Majority for Israel** — `Summer Lee`, `Nina Turner`, `Rashida Tlaib`
- **AFSCME - American Federation of State County and Municipal Employees** — `Linda McMahon`
- **UA Political Action Committee** — `Ashley Hinson`
- **Leonard Leo** — `Sheldon Whitehouse`
- **Koch Network - Charles Koch** — `Sheldon Whitehouse`, `Rashida Tlaib`

## Graph-only `donors` examples (most extreme cases)

These profiles have many graph monetary edges that aren't in their frontmatter `donors:` field — a sign that `rebuild-relationship-caches.cjs` hasn't run recently against these profiles.

- **ActBlue** — 152 edges in graph; sample: `Abdul El-Sayed`, `MEDICARE FOR ALL`, `PEOPLE FOR PATTY MURRAY U S SENATE CAMPAIGN`, `Joe Manchin`, `Mark Warner`
- **America Votes** — 73 edges in graph; sample: `Giffords PAC`, `Emily's List`, `Sixteen Thirty Fund`, `Sentinel Action Fund`, `League of Conservation Voters`
- **Aramark** — 37 edges in graph; sample: `FRIENDS OF MARIA`, `MENENDEZ FOR CONGRESS`, `Donald Trump`, `Mitt Romney`, `Barack Obama`
- **Alliance Defending Freedom** — 24 edges in graph; sample: `Mitt Romney`, `Barack Obama`, `Michael Guest`, `Tammy Duckworth`, `John Fetterman`
- **ACLU Foundation** — 12 edges in graph; sample: `Vanguard Charitable Endowment Program`, `Fidelity Investments`, `American Endowment Foundation`, `Rockefeller Philanthropy Advisors`, `Goldman Sachs Philanthropy Fund`
- **Tyson Foods** — 10 edges in graph; sample: `George W. Bush`, `Barack Obama`, `Michael Bennet`, `Ron DeSantis`, `Joe Biden`
- **America First Policy Institute** — 7 edges in graph; sample: `Schwab Charitable Fund`, `Goldman Sachs Philanthropy Fund`, `National Philanthropic Trust`, `Donors Trust`, `Fidelity Investments`
- **Prison Policy Initiative** — 5 edges in graph; sample: `Goldman Sachs Philanthropy Fund`, `Rockefeller Philanthropy Advisors`, `Silicon Valley Community Foundation`, `New Venture Fund`, `Fidelity Investments`

## What's automatable vs editorial

Based on the gap distribution, here's what we can automate:

**Definitely automatable:**
- **Alias drift** — recurring alias pairs become a canonical alias map. One-time setup, fixes all instances forever.
- **Graph-only entries** — `rebuild-relationship-caches.cjs` already does this for monetary edges; extending it to `political-opposition` is a small edit.

**Partially automatable (editorial review needed):**
- **Frontmatter-only opposes** — the indirect-opposition pattern (donor of primary opponent → opposer of original) can be derived from FEC data + same-cycle same-office matching. Confidence: ~0.6. Needs human sign-off before lifting into the graph.

**Not automatable (purely editorial):**
- Entries where the frontmatter assertion is genuinely editorial (e.g. "AIPAC opposes Cori Bush" based on policy positions, not direct funding). These should stay in frontmatter and we should amend Rule 1 to recognize that some editorial fields aren't pure graph caches.

## Next steps

After David reviews this report, decide:

- **Phase B**: Build the alias map + extend `rebuild-relationship-caches.cjs` to cover `political-opposition`. Estimated 2-3 hours.
- **Phase C**: Build `derive-indirect-opposition-edges.cjs` (FEC-driven). Estimated 3-4 hours.
- **Phase D**: Rewrite contradiction-miner against the librarian. Estimated 2-3 hours.
- **Phase E**: Cleanup, harness wiring, Rule 1 amendment if needed. Estimated 1 hour.
