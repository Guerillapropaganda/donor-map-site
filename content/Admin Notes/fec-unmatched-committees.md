---
title: "FEC Unmatched Committees"
type: admin-note
note-type: data
status: active
last-updated: 2026-04-15
authority: Pillar 2b migration
---

# FEC Unmatched Committees

Committees found in `auto:fec-politician` body tables that could not be resolved to a vault profile via title, alias, or simple suffix strip. Total: **22** unique committees / **26** rows.

**Fix**: add an `aliases:` entry to the parent profile's frontmatter (the `buildTitleIndex` walker reads it), or create a stub profile for the committee. Re-run `migrate-fec-body-tables-to-edges.cjs --write` to pick up the new mapping.

Sorted by total dollar volume (support + oppose).

| Committee | Count | Support $ | Oppose $ | Example politicians |
|-----------|-------|-----------|----------|---------------------|
| UNITED DEMOCRACY PROJECT (UDP) | 2 | $223,200 | $3,205,379 | Shontel Brown, Summer Lee |
| CONSERVATIVE OUTSIDER PAC | 1 | $0 | $1,936,000 | Bill Hagerty |
| WFP NATIONAL PAC | 1 | $1,872,561 | $0 | Summer Lee |
| ENDING SPENDING FUND | 1 | $0 | $1,724,864 | Harry Reid |
| CULAC THE PAC OF CREDIT UNION NATIONAL ASSOCIATION | 1 | $346,842 | $0 | Pete Aguilar |
| CLEARPATH ACTION, INC. | 1 | $322,299 | $0 | Elise Stefanik |
| LEAGUE OF CONSERVATION VOTERS VICTORY FUND | 1 | $319,383 | $0 | Pete Aguilar |
| NEA FUND FOR CHILDREN AND PUBLIC EDUCATION; THE (FKA NEAPAC) | 1 | $0 | $221,568 | Rick Larsen |
| POLICE OFFICERS DEFENSE ALLIANCE LLC | 1 | $0 | $100,000 | Nancy Pelosi |
| DEMOCRATIC CONGRESSIONAL CAMPAIGN COMMITTEE - EXPENDITURES | 2 | $0 | $80,164 | Rick Larsen, Adam Schiff |
| NATIONAL REPUBLICAN CONGRESSIONAL COMMITTEE EXPENDITURES | 1 | $0 | $35,076 | John Boozman |
| AMERICAN FEDERATION OF STATE COUNTY & MUNICIPAL EMPLOYEES - P E O P L E, QUALIFIED | 2 | $20,000 | $0 | Bennie Thompson, Bennie Thompson |
| PLANNED PARENTHOOD LA ADVOCACY PROJECT | 1 | $0 | $10,023 | Adam Schiff |
| MASSACHUSETTS FREEZE VOTER '84 | 1 | $0 | $9,015 | Ed Markey |
| MAYDAY PAC | 1 | $7,717 | $0 | Jamie Raskin |
| LABORERS' POLITICAL LEAGUE-LABORERS' INTERNATIONAL UNION OF NA | 1 | $0 | $7,500 | Debbie Stabenow |
| THE COMMITTEE TO DEFEND THE PRESIDENT | 1 | $5,000 | $0 | John Ratcliffe |
| FLIP THE WEST | 1 | $0 | $4,333 | Roger Williams |
| HUMANEUSA POLITICAL ACTION COMMITTEE | 1 | $0 | $2,799 | Maria Cantwell |
| KNIGHT, MARILYN | 1 | $0 | $1,232 | Maria Cantwell |
| ZB, N.A. DBA AMEGY BANK PAC | 1 | $1,000 | $0 | Roger Williams |
| TRANSPORTATION POLITICAL EDUCATION LEAGUE | 2 | $0 | $77 | Maria Cantwell, Bernie Sanders |
