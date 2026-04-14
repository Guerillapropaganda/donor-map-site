---
title: Class Tag Vocabulary
type: system
status: locked
last-updated: 2026-04-14
authority: ADR-0001
---

# Class Tag Vocabulary

The locked vocabulary for the Donor Map query engine. These tags are the editorial lens through which all structured queries operate. Class analysis is not decoration — it is the schema.

**Locked status.** Changes require a new ADR entry and a migration pass across all tagged entities. Do not rename, remove, or add tags without going through that process.

---

## The five dimensions

Every tagged entity (donor, corporation, network, union, etc.) gets values across five dimensions. Politicians use a mirror vocabulary (see bottom).

### 1. capital_type (pick one primary, optional secondary)

What kind of capital this entity represents.

| Tag | Meaning | Examples |
|---|---|---|
| fossil-capital | Oil, gas, coal, pipelines, refining | Chevron, ExxonMobil, Energy Transfer, Koch Industries |
| extractive-capital | Mining, timber, industrial ag, commodity extraction | Cargill, Weyerhaeuser, Newmont |
| finance-capital | Investment banks, hedge funds, PE, asset managers | Goldman Sachs, Citadel, Apollo, Blackrock |
| rentier-capital | Landlords, REITs, patent holders, royalty extractors | Blackstone Real Estate, pharma IP holders |
| tech-monopoly | Platform capital, data-extraction capital | Google, Meta, Amazon AWS |
| retail-monopoly | Chain retail, logistics, low-wage employers | Walmart, Amazon retail, Dollar General |
| military-industrial | Weapons, defense contracting, mercenary | Lockheed, Raytheon, Booz Allen, Palantir (defense) |
| carceral-capital | Private prisons, bail bonds, surveillance, immigration detention | CoreCivic, GEO Group, Axon, Palantir (ICE) |
| pharma-capital | Drug makers, PBMs, insurers extracting from health | Pfizer, UnitedHealth, CVS/Caremark |
| media-capital | Media owners, owners of the discourse | Murdoch, Sinclair, Bezos/WaPo |
| agribusiness-capital | Factory farms, big ag, anti-farmworker | Tyson, JBS, Farm Bureau |
| small-capital | Genuine small business, not chamber-of-commerce front | Local business PACs |
| professional-class | Doctors, lawyers, academics as a donor bloc | AMA, trial lawyer PACs |
| labor-aligned | Unions, worker co-ops, pension funds voting with workers | AFT, SEIU, UAW |
| dark-money-vehicle | 501c4 networks, DAFs, donor clubs laundering ruling-class organizing | Donors Trust, Concord Fund, Leonard Leo network |
| mixed | Conglomerates spanning multiple types | GE (legacy), Berkshire Hathaway |

### 2. class_position (pick one)

Where in the class structure.

| Tag | Meaning |
|---|---|
| ruling-class | Top 0.1%, owner-class capital, dynastic wealth |
| upper-bourgeois | Top 1%, large business owners, C-suite |
| petty-bourgeois | Small business owners, professionals with capital |
| labor-aligned | Workers, unions, worker orgs |
| ambiguous | Genuinely unclear (dual-class entities) |

### 3. ideological_function (multi-select)

What role this capital plays in politics. Where class analysis gets sharp.

| Tag | Meaning |
|---|---|
| union-busting | Active history of breaking unions, captive-audience meetings |
| climate-denial | Funds climate denial, opposes climate policy |
| deregulatory | Funds rollback of regulatory state |
| libertarian-ideology | Funds Mercatus/Reason/Cato network |
| religious-right | Funds Christian nationalist project |
| carceral-expansion | Funds tough-on-crime, mandatory minimums, policing expansion |
| imperialist-aligned | Funds hawkish foreign policy, weapons exports, interventionism |
| zionist-aligned | Specifically funds Israel-aligned policy (distinct faction) |
| nativist | Funds anti-immigrant, anti-refugee legislation |
| voter-suppression | Funds restrictions on voting access |
| privatization | Funds privatization of public goods (schools, postal, infra) |
| austerity | Funds cuts to social programs, debt-ceiling brinkmanship |
| anti-trust-defender | Funds opposition to antitrust, protects monopoly position |
| tax-avoidance-lobby | Funds carried interest, estate tax repeal, offshore protection |
| astroturf | Funds fake grassroots movements |
| dark-money-networked | Connected to Donors Trust / Leo / Bradley / Koch network |
| progressive-capital | DEI/greenwashing while materially hostile — tagged to surface contradiction |
| labor-organizing | Funds unionization drives, worker power |
| electoral-left | Funds progressive Democratic challengers |
| movement-left | Funds grassroots movements (abolition, climate justice, tenant orgs) |

### 4. worker_relationship (pick one)

How they treat workers.

| Tag | Meaning |
|---|---|
| union-busting | Active, documented union-busting |
| union-hostile | Anti-union position without documented busting |
| low-wage-extractive | Business model depends on poverty wages |
| neutral | Workers aren't central to business model |
| union-neutral-employer | Unionized workforce, not actively hostile |
| union-aligned | Actively pro-labor |
| worker-owned | Co-op or ESOP majority |

### 5. policy_stakes (free-text list, controlled vocabulary grows)

What specific policy outcomes benefit this capital. Examples: `offshore-drilling-leases`, `carried-interest-loophole`, `pharma-patent-extension`, `private-prison-contracts`, `military-aid-israel`, `right-to-work-laws`, `immigration-detention-contracts`, `mandatory-minimum-sentencing`, `charter-school-expansion`, `epa-rollback`, `section-230-preservation`, `antitrust-enforcement-limits`.

New stakes can be added without a new ADR — this is the only mutable dimension. The controlled vocabulary lives in `data/policy-stakes-vocab.jsonl` and grows as entities are tagged.

---

## Worked examples

### Chevron
```yaml
capital_type: fossil-capital
class_position: ruling-class
ideological_function:
  - climate-denial
  - deregulatory
  - imperialist-aligned
  - tax-avoidance-lobby
worker_relationship: union-hostile
policy_stakes:
  - offshore-drilling-leases
  - pipeline-approvals
  - epa-rollback
  - foreign-oil-concessions
  - carbon-accounting-loopholes
```

### CoreCivic
```yaml
capital_type: carceral-capital
class_position: upper-bourgeois
ideological_function:
  - carceral-expansion
  - nativist
  - privatization
  - astroturf
worker_relationship: low-wage-extractive
policy_stakes:
  - federal-prison-contracts
  - ice-detention-contracts
  - mandatory-minimum-sentencing
  - immigration-enforcement-budget
  - prison-labor-programs
```

### Koch Industries / Donors Trust network
```yaml
capital_type: fossil-capital
secondary_capital_type: dark-money-vehicle
class_position: ruling-class
ideological_function:
  - libertarian-ideology
  - climate-denial
  - deregulatory
  - union-busting
  - dark-money-networked
  - voter-suppression
  - tax-avoidance-lobby
worker_relationship: union-busting
policy_stakes:
  - right-to-work-laws
  - epa-rollback
  - carried-interest-loophole
  - estate-tax-repeal
  - citizens-united-defense
```

### AFT (American Federation of Teachers)
```yaml
capital_type: labor-aligned
class_position: labor-aligned
ideological_function:
  - labor-organizing
  - electoral-left
worker_relationship: union-aligned
policy_stakes:
  - public-school-funding
  - charter-oversight
  - pension-protection
  - student-debt-relief
```

### Amazon
```yaml
capital_type: tech-monopoly
secondary_capital_type: retail-monopoly
class_position: ruling-class
ideological_function:
  - union-busting
  - anti-trust-defender
  - tax-avoidance-lobby
  - progressive-capital
worker_relationship: union-busting
policy_stakes:
  - warehouse-labor-law
  - aws-government-contracts
  - antitrust-enforcement-limits
  - delivery-driver-classification
  - corporate-tax-rate
```

---

## Politician mirror vocabulary

Politicians use a parallel schema focused on alignment, not identity.

### serves_capital_type (multi-select)
Which capital fractions does their voting record benefit. Derived from relationships + votes, reviewable by David.

### class_origin (pick one)
- inherited-wealth
- professional-class
- small-business
- labor-background
- working-class
- military-career

### stated_positions (object)
Issue → claimed public position. Free-form.

### voting_record (object)
Issue → actual voting pattern. Computed from events.jsonl.

### contradiction_index (computed)
Divergence between stated_positions and voting_record. 0–1 scale.

### bloc_membership (multi-select)
progressive-caucus, squad, freedom-caucus, blue-dog, new-democrats, problem-solvers, congressional-black-caucus, etc.

### primary_funders_class (pick one)
- ruling-class
- upper-bourgeois
- mixed
- grassroots-small-dollar
- labor-aligned

### Worked politician examples

**AOC:**
```yaml
class_origin: working-class
serves_capital_type: [labor-aligned]
bloc_membership: [progressive-caucus, squad]
primary_funders_class: grassroots-small-dollar
contradiction_index: low
```

**Joe Manchin:**
```yaml
class_origin: upper-bourgeois
serves_capital_type: [fossil-capital, finance-capital]
bloc_membership: [blue-dog]
primary_funders_class: ruling-class
contradiction_index: high
```

**Ted Cruz:**
```yaml
class_origin: professional-class
serves_capital_type: [fossil-capital, finance-capital, military-industrial, dark-money-vehicle]
bloc_membership: [freedom-caucus-aligned]
primary_funders_class: ruling-class
contradiction_index: low
```

---

## Governance

### Adding a new tag
1. Open ADR entry in `content/Decisions/NNNN-add-tag-{name}.md`
2. Document: proposed tag, rationale, 3+ example entities it applies to, overlap analysis with existing tags
3. David reviews and approves
4. Migration script tags existing entities where applicable
5. Ops `/class-tags` UI dropdowns update
6. This doc updates with a dated note

### Changing a tag name
1. ADR entry with rename rationale
2. Migration script renames in `data/entity-class-tags.jsonl`
3. Notify both Claudes via Session State before the rename
4. Update this doc

### Retiring a tag
1. ADR entry
2. Migration: entities with the retired tag move to nearest equivalent or `ambiguous`
3. Remove from UI dropdowns after migration verified
4. This doc strikes the tag with retirement date

### Policy stakes (mutable)
`policy_stakes` can grow without ADR. New stakes added via Ops `/class-tags` are appended to `data/policy-stakes-vocab.jsonl`. Quarterly review by David to merge near-duplicates.
