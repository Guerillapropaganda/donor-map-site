---
title: "2026-03-18 Vault Audit"
type: reference
content-readiness: draft
last-updated: 2026-03-22
source-tier: null
parent: null
---

tags: #story

#vault-audit #maintenance #work-order #analysis

**Date:** 2026-03-18
**Files scanned:** 94 .md files
**Run:** automated — gp-vault-maintenance scheduled task

---

## STATUS SNAPSHOT

### content-readiness distribution (57 notes):
— ready: 12
— developed: 31
— raw: 6
— placeholder: 8

### research-status distribution (31 donor nodes):
— core role documented: 15
— role documented (partial): 3
— documented/verified: 2
— specialized variants (company, institutional, california, etc.): 8
— both tracked (federal + state): 1
— prop documented: 1
— partially documented: 1

### profile-status (3 master profiles):
— framework: 3 (Newsom, Trump, Bianco — all exist, none marked complete)

---

## FLAG: FORMATTING GAPS

### Missing tags line — 1 file
- `Stories/Khamenei is dead-Trump inciting revolution.md`

### Missing `related:` line — 4 files
These need wikilink anchors added:
- `Politicians/[[_Chad Bianco Master Profile|Chad Bianco]]/[[_Chad Bianco Master Profile|Chad Bianco]] Master Profile.md`
- `Politicians/[[_Donald Trump Master Profile|Donald Trump]]/[[_Donald Trump Master Profile|Donald Trump]] Master Profile.md`
- `Politicians/[[_Gavin Newsom Master Profile|Gavin Newsom]]/[[_Gavin Newsom Master Profile|Gavin Newsom]] Master Profile.md`
- `Stories/Khamenei is dead-Trump inciting revolution.md`

Note: The three master profiles are the most-linked files in the vault (Newsom: 64 incoming links, Trump: 23, Bianco: 14). They should have `related:` lines pointing outward to key sub-nodes.

### Missing status marker — 1 file
- `Stories/Khamenei is dead-Trump inciting revolution.md` — no `content-readiness::` set

### Missing sources — 9 files (no `**Sources**` block or `[Tier` citations)
These are either stubs or incomplete builds:
- `Politicians/[[_Benjamin Netanyahu Master Profile|Benjamin Netanyahu]].md` — placeholder, no source block needed until built
- `Politicians/[[_David Sacks Master Profile|David Sacks]].md` — placeholder
- `Politicians/[[_Elizabeth Warren Master Profile|Elizabeth Warren]].md` — placeholder
- `Politicians/[[_Greg Abbott Master Profile|Greg Abbott]].md` — placeholder
- `Politicians/[[_JD Vance Master Profile|JD Vance]].md` — placeholder
- `Politicians/[[_Jared Kushner Master Profile|Jared Kushner]].md` — placeholder
- `Politicians/[[_Ron DeSantis Master Profile|Ron DeSantis]].md` — placeholder
- `Politicians/[[_Gavin Newsom Master Profile|Gavin Newsom]]/Labor/Labor - Donors and Backers.md` — **action needed**: this is a developed hub note with no source block despite listing "Primary sources to pull"
- `Stories/Khamenei is dead-Trump inciting revolution.md` — story draft, no sources

**Priority fix:** `Labor - Donors and Backers.md` is the only non-placeholder missing sources. It has 16 incoming wikilinks (third-most in vault) and its source block needs to be formalized from the "primary sources to pull" section already in the note.

---

## TOP 5 PLACECARDS READY FOR BUILDOUT
*Ranked by incoming wikilink count — these are nodes the vault already depends on*

1. **[[_David Sacks Master Profile|David Sacks]]** — 4 incoming links — connected to Trump, Thiel, Musk, Vance networks. AI/crypto czar. High relevance to current administration coverage.
2. **[[_JD Vance Master Profile|JD Vance]]** — 3 incoming links — Thiel protégé, VP. Cross-referenced in Trump profile and multiple donor nodes.
3. **[[_Benjamin Netanyahu Master Profile|Benjamin Netanyahu]]** — 3 incoming links — already has a build-out priorities list in the note. Adelson network, Gaza policy, corruption cases.
4. **[[_Jared Kushner Master Profile|Jared Kushner]]** — 1 incoming link — Gulf State money, Abraham Accords, Affinity Partners. Connects the [[Gulf State Money - Saudi Arabia, UAE, Qatar|Gulf State Money]] donor node to the Trump orbit.
5. **[[_Susan Collins Master Profile|Susan Collins]] / [[_Greg Abbott Master Profile|Greg Abbott]] / [[_Ron DeSantis Master Profile|Ron DeSantis]]** — 0 incoming links each — lowest priority among placeholders; build after the above four.

**Recommended build order:** Sacks → Vance → Netanyahu → Kushner. All four connect to already-developed vault nodes and will immediately improve the Trump Master Profile's web of connections.

---

## TOP 5 RESEARCH GAPS

1. **FPPC bulk pull — gig economy donors** — [[Uber|Uber]], [[Lyft|Lyft]], [[DoorDash|DoorDash]] all have `research needed` FPPC flags. These are interconnected through Prop 22 (the most-referenced policy note by incoming links at 10). A single FPPC session pulling their state PAC filings would upgrade three donor nodes and confirm the Prop 22 donor map simultaneously.

2. **FPPC bulk pull — [[CCPOA - California Correctional Peace Officers Association|CCPOA]]** — Flagged in both the [[CCPOA - California Correctional Peace Officers Association|CCPOA]] donor node and `Criminal Justice - Donors and Backers.md`. The CCPOA note is one of the 10 most-linked files (10 incoming links). Current figures are marked unverified for the current cycle. This is the highest-value single donor to confirm given Newsom's ongoing criminal justice positioning.

3. **Pro-Israel donor network FPPC/behested payments** — `Pro-Israel Donor Network Deep Dive.md` (11 incoming links) has three separate `Research needed` blocks: direct [[JPAC - Jewish Public Affairs Committee of California|JPAC]] contributions, [[Haim Saban|Haim Saban]] filings, and tech-sector donors (Ellison, Hoffman). These feed directly into the Israel policy notes which are already `ready` status.

4. **[[_Chad Bianco Master Profile|Chad Bianco]] — RSA cycle-by-cycle figures** — The [[IBEW Local 440 - Riverside|Riverside]] Sheriffs' Association has 9 incoming links but its `research-status` is `core role documented — FPPC primary source research needed for exact cycle-by-cycle totals`. With Bianco running for governor in 2026, this is time-sensitive.

5. **Behested payment disclosures — [[PG&E|PG&E]], UnitedHealth, Blue Shield** — Three donor nodes flagged for behested payment research. This is the least-documented form of Newsom's donor relationships and would differentiate the vault's analysis from standard campaign finance coverage.

---

## SINGLE HIGHEST-IMPACT NEXT ACTION

### Run a dedicated FPPC research session targeting CCPOA + gig economy ([[Uber|Uber]]/[[Lyft|Lyft]]/[[DoorDash|DoorDash]]) contribution data.
These five donor nodes share a single primary source (fppc.ca.gov), are already partially built, and are cross-referenced across the vault's highest-traffic sections (Labor, Criminal Justice, Prop 22). Pulling their 2018–2026 contribution histories in one session would:
— upgrade CCPOA donor node to `research-status:: documented`
— upgrade Uber, Lyft, [[DoorDash|DoorDash]] to `research-status:: documented`
— allow `Prop 22 - The $200M Corporate Rollback.md` and `Labor - Donors and Backers.md` to move from `developed` to `ready`
— confirm dollar figures for the most-cited policy note in the vault by incoming links

This is a single-source, multi-node unlock. Do it before building any new placecards.

---

*Next audit scheduled automatically. Manual trigger available via gp-vault-maintenance task.*
