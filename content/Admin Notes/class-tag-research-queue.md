---
title: "Class-tag research queue"
type: admin-note
note-type: research
priority: normal
status: open
last-updated: '2026-04-15'
generated-by: scripts/tmp-list-skipped-class-tags.cjs
note-kind: ticket
---

# Class-tag research queue

**315 donor/corporation entities** processed by
`batch-propose-class-tags-heuristic.cjs` where NO heuristic rule fired.

The heuristic looks at three things per entity:
1. **`sector`** field → `capital_type` (via keyword scan of SECTOR_MAP)
2. **`total_political_spend`** → `class_position` (threshold-based)
3. **`body_snippet`** → `worker_relationship` + `ideological_function` (keyword scan)

Everything here is split into two buckets:
- **Bucket A: Stub profiles** — auto-created stubs with no body content yet.
  These are Research Claude's initial-pass queue. Once bodies are written,
  the body-snippet keyword scan will fire and the heuristic can generate
  proposals for free. **No research action needed yet.**
- **Bucket B: Real profiles needing research/heuristic expansion** — these
  are the actual class-tag research queue. Either the sector label isn't
  in SECTOR_MAP (e.g. "Mega-Donors", "Foreign Influence") or the body
  is too short/doesn't contain target keywords.

---

## Bucket B — real profiles needing research (91)

Sorted by canonical-store edge count desc (highest-impact first).

**Highest-leverage fix**: expand SECTOR_MAP in `scripts/batch-propose-class-tags-heuristic.cjs`
to cover the categorical sectors ("Mega-Donors" → default to `class_position: ruling-class`,
"Foreign Influence" → `ideological_function: imperialist-aligned`, etc.). One allowlist
change would clear most of this bucket automatically. See sector distribution below.

### Sector distribution (Bucket B only)

| Sector | Count |
|--------|------:|
| Mega-Donors | 43 |
| Super PACs | 24 |
| Foreign Influence | 6 |
| Education | 6 |
| Law Enforcement | 3 |
| — | 3 |
| Leonard Leo.md | 1 |
| Corporate | 1 |
| Jeffrey Epstein Network.md | 1 |
| Restaurant & Food | 1 |
| Jeff Yass.md | 1 |
| _README.md | 1 |

### Full list

| # | Entity | Type | Sector | Edges | Spend | Profile |
|---|--------|------|--------|------:|------:|---------|
| 1 | Koch Network - Charles Koch | donor | Mega-Donors | 27 | — | [md](content/Donors%20&%20Power%20Networks/Mega-Donors/Koch%20Network%20-%20Charles%20Koch.md) |
| 2 | Peter Thiel | donor | Mega-Donors | 13 | — | [md](content/Donors%20&%20Power%20Networks/Mega-Donors/Peter%20Thiel.md) |
| 3 | Leonard Leo | donor | Leonard Leo.md | 11 | — | [md](content/Donors%20&%20Power%20Networks/Leonard%20Leo.md) |
| 4 | Miriam Adelson | donor | Mega-Donors | 8 | — | [md](content/Donors%20&%20Power%20Networks/Mega-Donors/Miriam%20Adelson.md) |
| 5 | Club for Growth | donor | Super PACs | 7 | $9,118 | [md](content/Donors%20&%20Power%20Networks/Super%20PACs/Club%20for%20Growth.md) |
| 6 | Michael Bloomberg | donor | Mega-Donors | 7 | — | [md](content/Donors%20&%20Power%20Networks/Mega-Donors/Michael%20Bloomberg.md) |
| 7 | David McIntosh | donor | Mega-Donors | 5 | $53,369 | [md](content/Donors%20&%20Power%20Networks/Mega-Donors/David%20McIntosh.md) |
| 8 | Jeffrey Yass | donor | Mega-Donors | 5 | — | [md](content/Donors%20&%20Power%20Networks/Mega-Donors/Jeffrey%20Yass.md) |
| 9 | Bacardi - Bacardi USA | corporation | Corporate | 5 | — | [md](content/Donors%20&%20Power%20Networks/Corporate/Bacardi%20-%20Bacardi%20USA.md) |
| 10 | MAGA Inc | donor | Super PACs | 4 | — | [md](content/Donors%20&%20Power%20Networks/Super%20PACs/MAGA%20Inc.md) |
| 11 | Larry Ellison | donor | Mega-Donors | 4 | $10,212 | [md](content/Donors%20&%20Power%20Networks/Mega-Donors/Larry%20Ellison.md) |
| 12 | Palantir Technologies | corporation | Mega-Donors | 4 | — | [md](content/Donors%20&%20Power%20Networks/Mega-Donors/Palantir.md) |
| 13 | Timothy Mellon | donor | Mega-Donors | 4 | — | [md](content/Donors%20&%20Power%20Networks/Mega-Donors/Timothy%20Mellon.md) |
| 14 | Jeffrey Epstein Network | donor | Jeffrey Epstein Network.md | 3 | — | [md](content/Donors%20&%20Power%20Networks/Jeffrey%20Epstein%20Network.md) |
| 15 | Great Lakes Conservatives Fund | donor | Super PACs | 3 | — | [md](content/Donors%20&%20Power%20Networks/Super%20PACs/Great%20Lakes%20Conservatives%20Fund.md) |
| 16 | Illinois Future PAC | donor | Super PACs | 3 | — | [md](content/Donors%20&%20Power%20Networks/Super%20PACs/Illinois%20Future%20PAC.md) |
| 17 | MAGA Small Dollar Base | donor | Super PACs | 3 | — | [md](content/Donors%20&%20Power%20Networks/Super%20PACs/MAGA%20Small%20Dollar%20Base.md) |
| 18 | Cambridge Analytica and the Data Weaponization of Elections | donor | Mega-Donors | 3 | — | [md](content/Donors%20&%20Power%20Networks/Mega-Donors/Cambridge%20Analytica%20and%20the%20Data%20Weaponization%20of%20Elections.md) |
| 19 | Kelcy Warren | donor | Mega-Donors | 3 | — | [md](content/Donors%20&%20Power%20Networks/Mega-Donors/Kelcy%20Warren.md) |
| 20 | Koch network | donor | Mega-Donors | 3 | — | [md](content/Donors%20&%20Power%20Networks/Mega-Donors/Koch%20network.md) |
| 21 | Narya Capital | donor | Mega-Donors | 3 | — | [md](content/Donors%20&%20Power%20Networks/Mega-Donors/Narya%20Capital.md) |
| 22 | Gulf State Money - Saudi Arabia, UAE, Qatar | donor | Foreign Influence | 3 | — | [md](content/Donors%20&%20Power%20Networks/Foreign/Gulf%20State%20Money%20-%20Saudi%20Arabia,%20UAE,%20Qatar.md) |
| 23 | Mohammed bin Salman | donor | Foreign Influence | 3 | — | [md](content/Donors%20&%20Power%20Networks/Foreign/Mohammed%20bin%20Salman.md) |
| 24 | Americans for Prosperity | donor | Super PACs | 2 | — | [md](content/Donors%20&%20Power%20Networks/Super%20PACs/Americans%20for%20Prosperity.md) |
| 25 | House Majority PAC | donor | Super PACs | 2 | — | [md](content/Donors%20&%20Power%20Networks/Super%20PACs/House%20Majority%20PAC.md) |
| 26 | Save America PAC | donor | Super PACs | 2 | — | [md](content/Donors%20&%20Power%20Networks/Super%20PACs/Save%20America%20PAC.md) |
| 27 | Winning for Women PAC | donor | Super PACs | 2 | — | [md](content/Donors%20&%20Power%20Networks/Super%20PACs/Winning%20for%20Women%20PAC.md) |
| 28 | Breitbart News and the Mercer-Bannon Media Pipeline | donor | Mega-Donors | 2 | — | [md](content/Donors%20&%20Power%20Networks/Mega-Donors/Breitbart%20News%20and%20the%20Mercer-Bannon%20Media%20Pipeline.md) |
| 29 | Dustin Moskovitz | donor | Mega-Donors | 2 | — | [md](content/Donors%20&%20Power%20Networks/Mega-Donors/Dustin%20Moskovitz.md) |
| 30 | Kelcy Warren - Energy Transfer Partners | donor | Mega-Donors | 2 | — | [md](content/Donors%20&%20Power%20Networks/Mega-Donors/Kelcy%20Warren%20-%20Energy%20Transfer%20Partners.md) |
| 31 | Les Wexner - Wexner Family Enterprises | donor | Mega-Donors | 2 | — | [md](content/Donors%20&%20Power%20Networks/Mega-Donors/Les%20Wexner%20-%20Wexner%20Family%20Enterprises.md) |
| 32 | Rupert Murdoch | donor | Mega-Donors | 2 | — | [md](content/Donors%20&%20Power%20Networks/Mega-Donors/Rupert%20Murdoch.md) |
| 33 | PORAC - Peace Officers Research Association of California | donor | Law Enforcement | 2 | — | [md](content/Donors%20&%20Power%20Networks/Law%20Enforcement/PORAC%20-%20Peace%20Officers%20Research%20Association%20of%20California.md) |
| 34 | CTA - California Teachers Association | corporation | Education | 2 | — | [md](content/Donors%20&%20Power%20Networks/Education/CTA%20-%20California%20Teachers%20Association.md) |
| 35 | DeVos Family | donor | Education | 2 | — | [md](content/Donors%20&%20Power%20Networks/Education/DeVos%20Family.md) |
| 36 | Student Loan Servicer Industry | donor | Education | 2 | — | [md](content/Donors%20&%20Power%20Networks/Education/Student%20Loan%20Servicer%20Industry.md) |
| 37 | Walton Family Foundation | donor | Education | 2 | — | [md](content/Donors%20&%20Power%20Networks/Education/Walton%20Family%20Foundation.md) |
| 38 | America PAC - Elon Musk | donor | Super PACs | 1 | — | [md](content/Donors%20&%20Power%20Networks/Super%20PACs/America%20PAC%20-%20Elon%20Musk.md) |
| 39 | Democratic Governors Association | donor | Super PACs | 1 | — | [md](content/Donors%20&%20Power%20Networks/Super%20PACs/Democratic%20Governors%20Association.md) |
| 40 | Democratic Senatorial Campaign Committee | donor | Super PACs | 1 | — | [md](content/Donors%20&%20Power%20Networks/Super%20PACs/Democratic%20Senatorial%20Campaign%20Committee.md) |
| 41 | DonorsTrust | donor | Super PACs | 1 | — | [md](content/Donors%20&%20Power%20Networks/Super%20PACs/DonorsTrust.md) |
| 42 | DSCC - Democratic Senatorial Campaign Committee | donor | Super PACs | 1 | — | [md](content/Donors%20&%20Power%20Networks/Super%20PACs/DSCC%20-%20Democratic%20Senatorial%20Campaign%20Committee.md) |
| 43 | National Rifle Association | donor | Super PACs | 1 | — | [md](content/Donors%20&%20Power%20Networks/Super%20PACs/National%20Rifle%20Association.md) |
| 44 | Susan B. Anthony Pro-Life America PAC | donor | Super PACs | 1 | — | [md](content/Donors%20&%20Power%20Networks/Super%20PACs/Susan%20B.%20Anthony%20Pro-Life%20America%20PAC.md) |
| 45 | Trump Victory | donor | Super PACs | 1 | — | [md](content/Donors%20&%20Power%20Networks/Super%20PACs/Trump%20Victory.md) |
| 46 | WinRed | donor | Super PACs | 1 | — | [md](content/Donors%20&%20Power%20Networks/Super%20PACs/WinRed.md) |
| 47 | California Restaurant Association | corporation | Restaurant & Food | 1 | — | [md](content/Donors%20&%20Power%20Networks/Restaurant%20&%20Food/California%20Restaurant%20Association.md) |
| 48 | Adelson Family | donor | Mega-Donors | 1 | $1,000 | [md](content/Donors%20&%20Power%20Networks/Mega-Donors/Adelson%20Family.md) |
| 49 | Ajay Royan | donor | Mega-Donors | 1 | — | [md](content/Donors%20&%20Power%20Networks/Mega-Donors/Ajay%20Royan.md) |
| 50 | Centene Corporation PAC | donor | Mega-Donors | 1 | — | [md](content/Donors%20&%20Power%20Networks/Mega-Donors/Centene%20Corporation%20PAC.md) |
| 51 | Gates Foundation | donor | Mega-Donors | 1 | — | [md](content/Donors%20&%20Power%20Networks/Mega-Donors/Gates%20Foundation.md) |
| 52 | Laurene Powell Jobs | donor | Mega-Donors | 1 | — | [md](content/Donors%20&%20Power%20Networks/Mega-Donors/Laurene%20Powell%20Jobs.md) |
| 53 | Palantir Technologies Political Operation | corporation | Mega-Donors | 1 | — | [md](content/Donors%20&%20Power%20Networks/Mega-Donors/Palantir%20Technologies%20Political%20Operation.md) |
| 54 | Reid Hoffman | donor | Mega-Donors | 1 | — | [md](content/Donors%20&%20Power%20Networks/Mega-Donors/Reid%20Hoffman.md) |
| 55 | Richard and Elizabeth Uihlein | donor | Mega-Donors | 1 | — | [md](content/Donors%20&%20Power%20Networks/Mega-Donors/Richard%20and%20Elizabeth%20Uihlein.md) |
| 56 | Ross Stevens | donor | Mega-Donors | 1 | — | [md](content/Donors%20&%20Power%20Networks/Mega-Donors/Ross%20Stevens.md) |
| 57 | Sheldon & Miriam Adelson | donor | Mega-Donors | 1 | — | [md](content/Donors%20&%20Power%20Networks/Mega-Donors/Sheldon%20Adelson.md) |
| 58 | Susquehanna International Group | donor | Mega-Donors | 1 | $500 | [md](content/Donors%20&%20Power%20Networks/Mega-Donors/Susquehanna%20International%20Group.md) |
| 59 | Walmart - Walton Family | corporation | Mega-Donors | 1 | — | [md](content/Donors%20&%20Power%20Networks/Mega-Donors/Walmart%20-%20Walton%20Family.md) |
| 60 | Winklevoss Twins | donor | Mega-Donors | 1 | — | [md](content/Donors%20&%20Power%20Networks/Mega-Donors/Winklevoss%20Twins.md) |
| 61 | Riverside Sheriffs Association | donor | Law Enforcement | 1 | — | [md](content/Donors%20&%20Power%20Networks/Law%20Enforcement/Riverside%20Sheriffs%20Association.md) |
| 62 | California Charter Schools Association | donor | Education | 1 | — | [md](content/Donors%20&%20Power%20Networks/Education/California%20Charter%20Schools%20Association.md) |
| 63 | Eli Broad Foundation | corporation | Education | 1 | — | [md](content/Donors%20&%20Power%20Networks/Education/Eli%20Broad%20Foundation.md) |
| 64 | Jeff Yass (Redirect) | donor | Jeff Yass.md | 0 | — | [md](content/Donors%20&%20Power%20Networks/Jeff%20Yass.md) |
| 65 | README - Donors and Power Networks | other | _README.md | 0 | — | [md](content/Donors%20&%20Power%20Networks/_README.md) |
| 66 | Emilys List | donor | Super PACs | 0 | — | [md](content/Donors%20&%20Power%20Networks/Super%20PACs/Emilys%20List.md) |
| 67 | Fairshake PAC - Crypto Super PAC (Redirect) | donor | Super PACs | 0 | — | [md](content/Donors%20&%20Power%20Networks/Super%20PACs/Fairshake%20PAC%20-%20Crypto%20Super%20PAC.md) |
| 68 | Priorities USA Action | donor | Super PACs | 0 | — | [md](content/Donors%20&%20Power%20Networks/Super%20PACs/Priorities%20USA%20Action.md) |
| 69 | Reclaim America PAC | donor | Super PACs | 0 | — | [md](content/Donors%20&%20Power%20Networks/Super%20PACs/Reclaim%20America%20PAC.md) |
| 70 | Sentinel Action Fund | donor | Super PACs | 0 | — | [md](content/Donors%20&%20Power%20Networks/Super%20PACs/Sentinel%20Action%20Fund.md) |
| 71 | SV&B PAC | donor | Super PACs | 0 | — | [md](content/Donors%20&%20Power%20Networks/Super%20PACs/SV&B%20PAC.md) |
| 72 | Blackstone (Redirect) | corporation | Mega-Donors | 0 | — | [md](content/Donors%20&%20Power%20Networks/Mega-Donors/Blackstone.md) |
| 73 | Charles Koch | donor | Mega-Donors | 0 | — | [md](content/Donors%20&%20Power%20Networks/Mega-Donors/Charles%20Koch.md) |
| 74 | David Sacks Political Operation (Redirect) | donor | Mega-Donors | 0 | — | [md](content/Donors%20&%20Power%20Networks/Mega-Donors/David%20Sacks%20Political%20Operation.md) |
| 75 | Google / Alphabet Inc. (Redirect) | corporation | Mega-Donors | 0 | — | [md](content/Donors%20&%20Power%20Networks/Mega-Donors/Google.md) |
| 76 | Meta (Redirect) | corporation | Mega-Donors | 0 | — | [md](content/Donors%20&%20Power%20Networks/Mega-Donors/Meta.md) |
| 77 | Raytheon Technologies | corporation | Mega-Donors | 0 | — | [md](content/Donors%20&%20Power%20Networks/Mega-Donors/Raytheon%20Technologies.md) |
| 78 | Raytheon (Redirect) | corporation | Mega-Donors | 0 | — | [md](content/Donors%20&%20Power%20Networks/Mega-Donors/Raytheon.md) |
| 79 | Renaissance Technologies and the 7 Billion Dollar Tax Settlement | donor | Mega-Donors | 0 | — | [md](content/Donors%20&%20Power%20Networks/Mega-Donors/Renaissance%20Technologies%20and%20the%207%20Billion%20Dollar%20Tax%20Settlement.md) |
| 80 | Tim Geithner Political Operation | donor | Mega-Donors | 0 | — | [md](content/Donors%20&%20Power%20Networks/Mega-Donors/Tim%20Geithner%20Political%20Operation.md) |
| 81 | United Auto Workers | donor | Mega-Donors | 0 | — | [md](content/Donors%20&%20Power%20Networks/Mega-Donors/United%20Auto%20Workers.md) |
| 82 | Wexner Family - Ohio Wealth & Political Networks | donor | Mega-Donors | 0 | — | [md](content/Donors%20&%20Power%20Networks/Mega-Donors/Wexner%20Family%20-%20Ohio%20Wealth%20&%20Political%20Networks.md) |
| 83 | Wilks Brothers — Dan and Farris Wilks | donor | Mega-Donors | 0 | — | [md](content/Donors%20&%20Power%20Networks/Mega-Donors/Wilks%20Brothers.md) |
| 84 | International Association of Chiefs of Police | donor | Law Enforcement | 0 | — | [md](content/Donors%20&%20Power%20Networks/Law%20Enforcement/International%20Association%20of%20Chiefs%20of%20Police.md) |
| 85 | Israel - Government Lobbying Operation | donor | Foreign Influence | 0 | — | [md](content/Donors%20&%20Power%20Networks/Foreign/Israel%20-%20Government%20Lobbying%20Operation.md) |
| 86 | Saudi Arabia - Kingdom Investment | donor | Foreign Influence | 0 | — | [md](content/Donors%20&%20Power%20Networks/Foreign/Saudi%20Arabia%20-%20Kingdom%20Investment.md) |
| 87 | Turkey - Erdogan Lobbying Operation | donor | Foreign Influence | 0 | — | [md](content/Donors%20&%20Power%20Networks/Foreign/Turkey%20-%20Erdogan%20Lobbying%20Operation.md) |
| 88 | United Arab Emirates - Influence Operation | donor | Foreign Influence | 0 | — | [md](content/Donors%20&%20Power%20Networks/Foreign/United%20Arab%20Emirates%20-%20Influence%20Operation.md) |
| 89 | Zach Wahls Master Profile | other | — | 0 | — | [md](content/Politicians/Democrats/Senate/Zach%20Wahls/_Zach%20Wahls%20Master%20Profile.md) |
| 90 | Roy Cooper Master Profile | other | — | 0 | — | [md](content/Politicians/Democrats/Senate/Roy%20Cooper/_Roy%20Cooper%20Master%20Profile.md) |
| 91 | Juliana Stratton Master Profile | other | — | 0 | — | [md](content/Politicians/Democrats/Senate/Juliana%20Stratton/_Juliana%20Stratton%20Master%20Profile.md) |

---

## Bucket A — stubs awaiting Research Claude's initial pass (224)

These are auto-created frontmatter-only stubs (most from the 2026-04-15
FEC super PAC migration). They're waiting on Research Claude to write
editorial bodies, at which point the body-snippet keyword scan will fire
automatically. **No class-tag research action needed here right now.**

| # | Entity | Sector | Edges | Profile |
|---|--------|--------|------:|---------|
| 1 | Justice Democrats PAC | Political Committees | 2 | [md](content/Donors%20&%20Power%20Networks/Super%20PACs/Justice%20Democrats%20PAC.md) |
| 2 | NARAL Pro-Choice America | Political Committees | 2 | [md](content/Donors%20&%20Power%20Networks/Super%20PACs/NARAL%20Pro-Choice%20America.md) |
| 3 | Courage to Change PAC | Political Committees | 1 | [md](content/Donors%20&%20Power%20Networks/Super%20PACs/Courage%20to%20Change%20PAC.md) |
| 4 | Worker Power PAC for Georgia | Political Committees | 1 | [md](content/Donors%20&%20Power%20Networks/Super%20PACs/Worker%20Power%20PAC%20for%20Georgia.md) |
| 5 | Crypto Innovation PAC | Political Committees | 0 | [md](content/Donors%20&%20Power%20Networks/Tech%20&%20Crypto/Crypto%20Innovation%20PAC.md) |
| 6 | A Great America PAC | Political Committees | 0 | [md](content/Donors%20&%20Power%20Networks/Super%20PACs/A%20Great%20America%20PAC.md) |
| 7 | American Crossroads | Political Committees | 0 | [md](content/Donors%20&%20Power%20Networks/Super%20PACs/American%20Crossroads.md) |
| 8 | American Future Fund | Political Committees | 0 | [md](content/Donors%20&%20Power%20Networks/Super%20PACs/American%20Future%20Fund.md) |
| 9 | American Jobs and Growth PAC | Political Committees | 0 | [md](content/Donors%20&%20Power%20Networks/Super%20PACs/American%20Jobs%20and%20Growth%20PAC.md) |
| 10 | American Patriots PAC | Political Committees | 0 | [md](content/Donors%20&%20Power%20Networks/Super%20PACs/American%20Patriots%20PAC.md) |
| 11 | Campaign for Community Change | Political Committees | 0 | [md](content/Donors%20&%20Power%20Networks/Super%20PACs/Campaign%20for%20Community%20Change.md) |
| 12 | Conservative Leadership PAC | Political Committees | 0 | [md](content/Donors%20&%20Power%20Networks/Super%20PACs/Conservative%20Leadership%20PAC.md) |
| 13 | DCCC - Democratic Congressional Campaign Committee | Political Committees | 0 | [md](content/Donors%20&%20Power%20Networks/Super%20PACs/DCCC%20-%20Democratic%20Congressional%20Campaign%20Committee.md) |
| 14 | Defend US PAC | Political Committees | 0 | [md](content/Donors%20&%20Power%20Networks/Super%20PACs/Defend%20US%20PAC.md) |
| 15 | DefendArizona | Political Committees | 0 | [md](content/Donors%20&%20Power%20Networks/Super%20PACs/DefendArizona.md) |
| 16 | DNC - Democratic National Committee | Political Committees | 0 | [md](content/Donors%20&%20Power%20Networks/Super%20PACs/DNC%20-%20Democratic%20National%20Committee.md) |
| 17 | Fair Share Action | Political Committees | 0 | [md](content/Donors%20&%20Power%20Networks/Super%20PACs/Fair%20Share%20Action.md) |
| 18 | Georgians for Strong Families | Political Committees | 0 | [md](content/Donors%20&%20Power%20Networks/Super%20PACs/Georgians%20for%20Strong%20Families.md) |
| 19 | Good Fight PAC | Political Committees | 0 | [md](content/Donors%20&%20Power%20Networks/Super%20PACs/Good%20Fight%20PAC.md) |
| 20 | Kentuckians for Strong Leadership | Political Committees | 0 | [md](content/Donors%20&%20Power%20Networks/Super%20PACs/Kentuckians%20for%20Strong%20Leadership.md) |
| 21 | MoveOn.org Political Action | Political Committees | 0 | [md](content/Donors%20&%20Power%20Networks/Super%20PACs/MoveOn.org%20Political%20Action.md) |
| 22 | National Right to Life PAC | Political Committees | 0 | [md](content/Donors%20&%20Power%20Networks/Super%20PACs/National%20Right%20to%20Life%20PAC.md) |
| 23 | NEA Advocacy Fund | Political Committees | 0 | [md](content/Donors%20&%20Power%20Networks/Super%20PACs/NEA%20Advocacy%20Fund.md) |
| 24 | Never Back Down | Political Committees | 0 | [md](content/Donors%20&%20Power%20Networks/Super%20PACs/Never%20Back%20Down.md) |
| 25 | NRA Political Victory Fund | Political Committees | 0 | [md](content/Donors%20&%20Power%20Networks/Super%20PACs/NRA%20Political%20Victory%20Fund.md) |
| 26 | NRCC - National Republican Congressional Committee | Political Committees | 0 | [md](content/Donors%20&%20Power%20Networks/Super%20PACs/NRCC%20-%20National%20Republican%20Congressional%20Committee.md) |
| 27 | NRSC - National Republican Senatorial Committee | Political Committees | 0 | [md](content/Donors%20&%20Power%20Networks/Super%20PACs/NRSC%20-%20National%20Republican%20Senatorial%20Committee.md) |
| 28 | Opportunity Matters Fund | Political Committees | 0 | [md](content/Donors%20&%20Power%20Networks/Super%20PACs/Opportunity%20Matters%20Fund.md) |
| 29 | Patriots Prevail PAC | Political Committees | 0 | [md](content/Donors%20&%20Power%20Networks/Super%20PACs/Patriots%20Prevail%20PAC.md) |
| 30 | Peachtree PAC | Political Committees | 0 | [md](content/Donors%20&%20Power%20Networks/Super%20PACs/Peachtree%20PAC.md) |
| 31 | Ready to Win | Political Committees | 0 | [md](content/Donors%20&%20Power%20Networks/Super%20PACs/Ready%20to%20Win.md) |
| 32 | Republican Party of Florida | Political Committees | 0 | [md](content/Donors%20&%20Power%20Networks/Super%20PACs/Republican%20Party%20of%20Florida.md) |
| 33 | RNC - Republican National Committee | Political Committees | 0 | [md](content/Donors%20&%20Power%20Networks/Super%20PACs/RNC%20-%20Republican%20National%20Committee.md) |
| 34 | Special Operations for America | Political Committees | 0 | [md](content/Donors%20&%20Power%20Networks/Super%20PACs/Special%20Operations%20for%20America.md) |
| 35 | Stop Union Political Abuse | Political Committees | 0 | [md](content/Donors%20&%20Power%20Networks/Super%20PACs/Stop%20Union%20Political%20Abuse.md) |
| 36 | Take Me Home WV Action | Political Committees | 0 | [md](content/Donors%20&%20Power%20Networks/Super%20PACs/Take%20Me%20Home%20WV%20Action.md) |
| 37 | The Lincoln Project | Political Committees | 0 | [md](content/Donors%20&%20Power%20Networks/Super%20PACs/The%20Lincoln%20Project.md) |
| 38 | VIEW PAC - Value in Electing Women | Political Committees | 0 | [md](content/Donors%20&%20Power%20Networks/Super%20PACs/VIEW%20PAC%20-%20Value%20in%20Electing%20Women.md) |
| 39 | With Honor Fund | Political Committees | 0 | [md](content/Donors%20&%20Power%20Networks/Super%20PACs/With%20Honor%20Fund.md) |
| 40 | UA Political Action Committee | Political Committees | 0 | [md](content/Donors%20&%20Power%20Networks/Labor%20Unions/UA%20Political%20Action%20Committee.md) |
| 41 | 27th Congressional District Democratic Club | Political Committees | 0 | [md](content/Donors%20&%20Power%20Networks/Super%20PACs/27th%20Congressional%20District%20Democratic%20Club.md) |
| 42 | 314 Action Fund | Political Committees | 0 | [md](content/Donors%20&%20Power%20Networks/Super%20PACs/314%20Action%20Fund.md) |
| 43 | AFSCME Working Families Fund | Political Committees | 0 | [md](content/Donors%20&%20Power%20Networks/Super%20PACs/AFSCME%20Working%20Families%20Fund.md) |
| 44 | Alhambra Democratic Club | Political Committees | 0 | [md](content/Donors%20&%20Power%20Networks/Super%20PACs/Alhambra%20Democratic%20Club.md) |
| 45 | Alice B. Toklas LGBTQ Democratic Club Federal PAC | Political Committees | 0 | [md](content/Donors%20&%20Power%20Networks/Super%20PACs/Alice%20B.%20Toklas%20LGBTQ%20Democratic%20Club%20Federal%20PAC.md) |
| 46 | Alliance Coal, LLC PAC | Political Committees | 0 | [md](content/Donors%20&%20Power%20Networks/Super%20PACs/Alliance%20Coal,%20LLC%20PAC.md) |
| 47 | America 360 Committee | Political Committees | 0 | [md](content/Donors%20&%20Power%20Networks/Super%20PACs/America%20360%20Committee.md) |
| 48 | American Chemistry Council, INC | Political Committees | 0 | [md](content/Donors%20&%20Power%20Networks/Super%20PACs/American%20Chemistry%20Council,%20INC.md) |
| 49 | American College of Radiology Association PAC | Political Committees | 0 | [md](content/Donors%20&%20Power%20Networks/Super%20PACs/American%20College%20of%20Radiology%20Association%20PAC.md) |
| 50 | American Commitment Action Fund | Political Committees | 0 | [md](content/Donors%20&%20Power%20Networks/Super%20PACs/American%20Commitment%20Action%20Fund.md) |
| 51 | American Conservative Union | Political Committees | 0 | [md](content/Donors%20&%20Power%20Networks/Super%20PACs/American%20Conservative%20Union.md) |
| 52 | American Dream Federal Action | Political Committees | 0 | [md](content/Donors%20&%20Power%20Networks/Super%20PACs/American%20Dream%20Federal%20Action.md) |
| 53 | American Future Fund Political Action | Political Committees | 0 | [md](content/Donors%20&%20Power%20Networks/Super%20PACs/American%20Future%20Fund%20Political%20Action.md) |
| 54 | American Hospital Association PAC | Political Committees | 0 | [md](content/Donors%20&%20Power%20Networks/Super%20PACs/American%20Hospital%20Association%20PAC.md) |
| 55 | American Principles Fund | Political Committees | 0 | [md](content/Donors%20&%20Power%20Networks/Super%20PACs/American%20Principles%20Fund.md) |
| 56 | American Worker Inc, the | Political Committees | 0 | [md](content/Donors%20&%20Power%20Networks/Super%20PACs/American%20Worker%20Inc,%20the.md) |
| 57 | Americans for Common Sense | Political Committees | 0 | [md](content/Donors%20&%20Power%20Networks/Super%20PACs/Americans%20for%20Common%20Sense.md) |
| 58 | Americans for Job Security | Political Committees | 0 | [md](content/Donors%20&%20Power%20Networks/Super%20PACs/Americans%20for%20Job%20Security.md) |
| 59 | Arizonans for Affordable Electricity | Political Committees | 0 | [md](content/Donors%20&%20Power%20Networks/Super%20PACs/Arizonans%20for%20Affordable%20Electricity.md) |
| 60 | Blue America PAC | Political Committees | 0 | [md](content/Donors%20&%20Power%20Networks/Super%20PACs/Blue%20America%20PAC.md) |
| 61 | Blue Majority Project | Political Committees | 0 | [md](content/Donors%20&%20Power%20Networks/Super%20PACs/Blue%20Majority%20Project.md) |
| 62 | Bluegreen Alliance | Political Committees | 0 | [md](content/Donors%20&%20Power%20Networks/Super%20PACs/Bluegreen%20Alliance.md) |
| 63 | Building a Better PA | Political Committees | 0 | [md](content/Donors%20&%20Power%20Networks/Super%20PACs/Building%20a%20Better%20PA.md) |
| 64 | Californians for Innovation | Political Committees | 0 | [md](content/Donors%20&%20Power%20Networks/Super%20PACs/Californians%20for%20Innovation.md) |
| 65 | Californians for Sacred Sites Protection | Political Committees | 0 | [md](content/Donors%20&%20Power%20Networks/Super%20PACs/Californians%20for%20Sacred%20Sites%20Protection.md) |
| 66 | Campaign for Working Families | Political Committees | 0 | [md](content/Donors%20&%20Power%20Networks/Super%20PACs/Campaign%20for%20Working%20Families.md) |
| 67 | Care Action Now Inc. | Political Committees | 0 | [md](content/Donors%20&%20Power%20Networks/Super%20PACs/Care%20Action%20Now%20Inc..md) |
| 68 | Care Action | Political Committees | 0 | [md](content/Donors%20&%20Power%20Networks/Super%20PACs/Care%20Action.md) |
| 69 | Central Coast Values PAC | Political Committees | 0 | [md](content/Donors%20&%20Power%20Networks/Super%20PACs/Central%20Coast%20Values%20PAC.md) |
| 70 | Change Now | Political Committees | 0 | [md](content/Donors%20&%20Power%20Networks/Super%20PACs/Change%20Now.md) |
| 71 | Citizen Super PAC | Political Committees | 0 | [md](content/Donors%20&%20Power%20Networks/Super%20PACs/Citizen%20Super%20PAC.md) |
| 72 | Citizens for Responsible Energy Solutions Inc. | Political Committees | 0 | [md](content/Donors%20&%20Power%20Networks/Super%20PACs/Citizens%20for%20Responsible%20Energy%20Solutions%20Inc..md) |
| 73 | Clean Up Congress | Political Committees | 0 | [md](content/Donors%20&%20Power%20Networks/Super%20PACs/Clean%20Up%20Congress.md) |
| 74 | Clear Voice Minnesota | Political Committees | 0 | [md](content/Donors%20&%20Power%20Networks/Super%20PACs/Clear%20Voice%20Minnesota.md) |
| 75 | Climate Hawks Vote | Political Committees | 0 | [md](content/Donors%20&%20Power%20Networks/Super%20PACs/Climate%20Hawks%20Vote.md) |
| 76 | Club for Growth INC PAC | Political Committees | 0 | [md](content/Donors%20&%20Power%20Networks/Super%20PACs/Club%20for%20Growth%20INC%20PAC.md) |
| 77 | Coalition to Grow San Francisco - Grow Sf PAC | Political Committees | 0 | [md](content/Donors%20&%20Power%20Networks/Super%20PACs/Coalition%20to%20Grow%20San%20Francisco%20-%20Grow%20Sf%20PAC.md) |
| 78 | Committee for Defending American Values | Political Committees | 0 | [md](content/Donors%20&%20Power%20Networks/Super%20PACs/Committee%20for%20Defending%20American%20Values.md) |
| 79 | Common Sense for America PAC | Political Committees | 0 | [md](content/Donors%20&%20Power%20Networks/Super%20PACs/Common%20Sense%20for%20America%20PAC.md) |
| 80 | Common Sense for Connecticut | Political Committees | 0 | [md](content/Donors%20&%20Power%20Networks/Super%20PACs/Common%20Sense%20for%20Connecticut.md) |
| 81 | Commonwealth Communications | Political Committees | 0 | [md](content/Donors%20&%20Power%20Networks/Super%20PACs/Commonwealth%20Communications.md) |
| 82 | Commonwealth Unity Fund | Political Committees | 0 | [md](content/Donors%20&%20Power%20Networks/Super%20PACs/Commonwealth%20Unity%20Fund.md) |
| 83 | Congressional Progressive Caucus PAC | Political Committees | 0 | [md](content/Donors%20&%20Power%20Networks/Super%20PACs/Congressional%20Progressive%20Caucus%20PAC.md) |
| 84 | Connecticut Taxpayers Alliance | Political Committees | 0 | [md](content/Donors%20&%20Power%20Networks/Super%20PACs/Connecticut%20Taxpayers%20Alliance.md) |
| 85 | Cooperative of American Physicians Independent Expenditure Committee | Political Committees | 0 | [md](content/Donors%20&%20Power%20Networks/Super%20PACs/Cooperative%20of%20American%20Physicians%20Independent%20Expenditure%20Committee.md) |
| 86 | Cops Voter Guide Inc. | Political Committees | 0 | [md](content/Donors%20&%20Power%20Networks/Super%20PACs/Cops%20Voter%20Guide%20Inc..md) |
| 87 | Council for American Job Growth | Political Committees | 0 | [md](content/Donors%20&%20Power%20Networks/Super%20PACs/Council%20for%20American%20Job%20Growth.md) |
| 88 | CT Working Families Federal PAC D/b/a Take Back Congress CT | Political Committees | 0 | [md](content/Donors%20&%20Power%20Networks/Super%20PACs/CT%20Working%20Families%20Federal%20PAC%20D-b-a%20Take%20Back%20Congress%20CT.md) |
| 89 | Defending Main Street Superpac INC | Political Committees | 0 | [md](content/Donors%20&%20Power%20Networks/Super%20PACs/Defending%20Main%20Street%20Superpac%20INC.md) |
| 90 | Delivering for California | Political Committees | 0 | [md](content/Donors%20&%20Power%20Networks/Super%20PACs/Delivering%20for%20California.md) |
| 91 | Democratic Alliance for Action | Political Committees | 0 | [md](content/Donors%20&%20Power%20Networks/Super%20PACs/Democratic%20Alliance%20for%20Action.md) |
| 92 | Democratic Party of Virginia | Political Committees | 0 | [md](content/Donors%20&%20Power%20Networks/Super%20PACs/Democratic%20Party%20of%20Virginia.md) |
| 93 | Direct Selling Empowers Americans | Political Committees | 0 | [md](content/Donors%20&%20Power%20Networks/Super%20PACs/Direct%20Selling%20Empowers%20Americans.md) |
| 94 | Dolores Huerta Action Fund | Political Committees | 0 | [md](content/Donors%20&%20Power%20Networks/Super%20PACs/Dolores%20Huerta%20Action%20Fund.md) |
| 95 | Drain the DC Swamp PAC | Political Committees | 0 | [md](content/Donors%20&%20Power%20Networks/Super%20PACs/Drain%20the%20DC%20Swamp%20PAC.md) |
| 96 | Dream United | Political Committees | 0 | [md](content/Donors%20&%20Power%20Networks/Super%20PACs/Dream%20United.md) |
| 97 | Elbert Guillory's America | Political Committees | 0 | [md](content/Donors%20&%20Power%20Networks/Super%20PACs/Elbert%20Guillory's%20America.md) |
| 98 | Emgage Federal Political Action Committee | Political Committees | 0 | [md](content/Donors%20&%20Power%20Networks/Super%20PACs/Emgage%20Federal%20Political%20Action%20Committee.md) |
| 99 | Emily's List | Political Committees | 0 | [md](content/Donors%20&%20Power%20Networks/Super%20PACs/Emily's%20List.md) |
| 100 | End the Gridlock | Political Committees | 0 | [md](content/Donors%20&%20Power%20Networks/Super%20PACs/End%20the%20Gridlock.md) |
| 101 | English Language Political Action Committee | Political Committees | 0 | [md](content/Donors%20&%20Power%20Networks/Super%20PACs/English%20Language%20Political%20Action%20Committee.md) |
| 102 | Environment America INC | Political Committees | 0 | [md](content/Donors%20&%20Power%20Networks/Super%20PACs/Environment%20America%20INC.md) |
| 103 | Equality Project PAC | Political Committees | 0 | [md](content/Donors%20&%20Power%20Networks/Super%20PACs/Equality%20Project%20PAC.md) |
| 104 | Everytown for Gun Safety Victory Fund | Political Committees | 0 | [md](content/Donors%20&%20Power%20Networks/Super%20PACs/Everytown%20for%20Gun%20Safety%20Victory%20Fund.md) |
| 105 | Family Research Council Action Political Action Committee | Political Committees | 0 | [md](content/Donors%20&%20Power%20Networks/Super%20PACs/Family%20Research%20Council%20Action%20Political%20Action%20Committee.md) |
| 106 | Fight Corporate Monopolies | Political Committees | 0 | [md](content/Donors%20&%20Power%20Networks/Super%20PACs/Fight%20Corporate%20Monopolies.md) |
| 107 | First Amendment Alliance | Political Committees | 0 | [md](content/Donors%20&%20Power%20Networks/Super%20PACs/First%20Amendment%20Alliance.md) |
| 108 | Florida Conservative Fund | Political Committees | 0 | [md](content/Donors%20&%20Power%20Networks/Super%20PACs/Florida%20Conservative%20Fund.md) |
| 109 | Focus on the Family Action | Political Committees | 0 | [md](content/Donors%20&%20Power%20Networks/Super%20PACs/Focus%20on%20the%20Family%20Action.md) |
| 110 | Foundation for Economic Prosperity Inc. | Political Committees | 0 | [md](content/Donors%20&%20Power%20Networks/Super%20PACs/Foundation%20for%20Economic%20Prosperity%20Inc..md) |
| 111 | Freedom Club Federal PAC | Political Committees | 0 | [md](content/Donors%20&%20Power%20Networks/Super%20PACs/Freedom%20Club%20Federal%20PAC.md) |
| 112 | Freedom Partners Action Fund Inc | Political Committees | 0 | [md](content/Donors%20&%20Power%20Networks/Super%20PACs/Freedom%20Partners%20Action%20Fund%20Inc.md) |
| 113 | Freedom Vote | Political Committees | 0 | [md](content/Donors%20&%20Power%20Networks/Super%20PACs/Freedom%20Vote.md) |
| 114 | Freedom's Defense Fund | Political Committees | 0 | [md](content/Donors%20&%20Power%20Networks/Super%20PACs/Freedom's%20Defense%20Fund.md) |
| 115 | Freethought Equality Super PAC | Political Committees | 0 | [md](content/Donors%20&%20Power%20Networks/Super%20PACs/Freethought%20Equality%20Super%20PAC.md) |
| 116 | Friends of the Earth (action) INC | Political Committees | 0 | [md](content/Donors%20&%20Power%20Networks/Super%20PACs/Friends%20of%20the%20Earth%20%28action%29%20INC.md) |
| 117 | Future45 | Political Committees | 0 | [md](content/Donors%20&%20Power%20Networks/Super%20PACs/Future45.md) |
| 118 | Giffords PAC | Political Committees | 0 | [md](content/Donors%20&%20Power%20Networks/Super%20PACs/Giffords%20PAC.md) |
| 119 | Good Jobs and Strong Communities PAC | Political Committees | 0 | [md](content/Donors%20&%20Power%20Networks/Super%20PACs/Good%20Jobs%20and%20Strong%20Communities%20PAC.md) |
| 120 | He's Gotta Go PAC | Political Committees | 0 | [md](content/Donors%20&%20Power%20Networks/Super%20PACs/He's%20Gotta%20Go%20PAC.md) |
| 121 | Health Justice for All | Political Committees | 0 | [md](content/Donors%20&%20Power%20Networks/Super%20PACs/Health%20Justice%20for%20All.md) |
| 122 | House Liberty Project | Political Committees | 0 | [md](content/Donors%20&%20Power%20Networks/Super%20PACs/House%20Liberty%20Project.md) |
| 123 | Human Rights Campaign Equality Votes | Political Committees | 0 | [md](content/Donors%20&%20Power%20Networks/Super%20PACs/Human%20Rights%20Campaign%20Equality%20Votes.md) |
| 124 | Humane Society Legislative Fund | Political Committees | 0 | [md](content/Donors%20&%20Power%20Networks/Super%20PACs/Humane%20Society%20Legislative%20Fund.md) |
| 125 | Independent Leadership for New Hampshire PAC | Political Committees | 0 | [md](content/Donors%20&%20Power%20Networks/Super%20PACs/Independent%20Leadership%20for%20New%20Hampshire%20PAC.md) |
| 126 | Indivisible Action | Political Committees | 0 | [md](content/Donors%20&%20Power%20Networks/Super%20PACs/Indivisible%20Action.md) |
| 127 | International Association of Firefighters Interested in Registration and Education PAC | Political Committees | 0 | [md](content/Donors%20&%20Power%20Networks/Super%20PACs/International%20Association%20of%20Firefighters%20Interested%20in%20Registration%20and%20Education%20PAC.md) |
| 128 | International Brotherhood of Electrical Workers Local 98 Committee on Political Education | Political Committees | 0 | [md](content/Donors%20&%20Power%20Networks/Super%20PACs/International%20Brotherhood%20of%20Electrical%20Workers%20Local%2098%20Committee%20on%20Political%20Education.md) |
| 129 | International Longshore and Warehouse Union -- Political Action Fund | Political Committees | 0 | [md](content/Donors%20&%20Power%20Networks/Super%20PACs/International%20Longshore%20and%20Warehouse%20Union%20--%20Political%20Action%20Fund.md) |
| 130 | Kansans for Life Political Action Committee | Political Committees | 0 | [md](content/Donors%20&%20Power%20Networks/Super%20PACs/Kansans%20for%20Life%20Political%20Action%20Committee.md) |
| 131 | Kansas Ag Communities Coalition | Political Committees | 0 | [md](content/Donors%20&%20Power%20Networks/Super%20PACs/Kansas%20Ag%20Communities%20Coalition.md) |
| 132 | Kansas Farmers Fund | Political Committees | 0 | [md](content/Donors%20&%20Power%20Networks/Super%20PACs/Kansas%20Farmers%20Fund.md) |
| 133 | Kucinich Action PAC | Political Committees | 0 | [md](content/Donors%20&%20Power%20Networks/Super%20PACs/Kucinich%20Action%20PAC.md) |
| 134 | Laborers' Political League-Laborers' International Union of N.a. | Political Committees | 0 | [md](content/Donors%20&%20Power%20Networks/Super%20PACs/Laborers'%20Political%20League-Laborers'%20International%20Union%20of%20N.a..md) |
| 135 | Leadership Now | Political Committees | 0 | [md](content/Donors%20&%20Power%20Networks/Super%20PACs/Leadership%20Now.md) |
| 136 | Let America Vote PAC | Political Committees | 0 | [md](content/Donors%20&%20Power%20Networks/Super%20PACs/Let%20America%20Vote%20PAC.md) |
| 137 | Let Freedom Ring INC | Political Committees | 0 | [md](content/Donors%20&%20Power%20Networks/Super%20PACs/Let%20Freedom%20Ring%20INC.md) |
| 138 | Liberty Champions | Political Committees | 0 | [md](content/Donors%20&%20Power%20Networks/Super%20PACs/Liberty%20Champions.md) |
| 139 | Living United for Change in Arizona | Political Committees | 0 | [md](content/Donors%20&%20Power%20Networks/Super%20PACs/Living%20United%20for%20Change%20in%20Arizona.md) |
| 140 | Los Angeles County Democratic Central Committee | Political Committees | 0 | [md](content/Donors%20&%20Power%20Networks/Super%20PACs/Los%20Angeles%20County%20Democratic%20Central%20Committee.md) |
| 141 | Mad Dog PAC | Political Committees | 0 | [md](content/Donors%20&%20Power%20Networks/Super%20PACs/Mad%20Dog%20PAC.md) |
| 142 | Madison Project Inc. | Political Committees | 0 | [md](content/Donors%20&%20Power%20Networks/Super%20PACs/Madison%20Project%20Inc..md) |
| 143 | Majority PAC | Political Committees | 0 | [md](content/Donors%20&%20Power%20Networks/Super%20PACs/Majority%20PAC.md) |
| 144 | Michigan Republican Party | Political Committees | 0 | [md](content/Donors%20&%20Power%20Networks/Super%20PACs/Michigan%20Republican%20Party.md) |
| 145 | Mid-America Conservative Political Action Committee | Political Committees | 0 | [md](content/Donors%20&%20Power%20Networks/Super%20PACs/Mid-America%20Conservative%20Political%20Action%20Committee.md) |
| 146 | Midwest Growth PAC | Political Committees | 0 | [md](content/Donors%20&%20Power%20Networks/Super%20PACs/Midwest%20Growth%20PAC.md) |
| 147 | Minnesota Democratic-Farmer-Labor Party | Political Committees | 0 | [md](content/Donors%20&%20Power%20Networks/Super%20PACs/Minnesota%20Democratic-Farmer-Labor%20Party.md) |
| 148 | Mislove, Alan Edward | Political Committees | 0 | [md](content/Donors%20&%20Power%20Networks/Super%20PACs/Mislove,%20Alan%20Edward.md) |
| 149 | Mississippi Republican Party | Political Committees | 0 | [md](content/Donors%20&%20Power%20Networks/Super%20PACs/Mississippi%20Republican%20Party.md) |
| 150 | National Committee to Preserve Social Security & Medicare PAC | Political Committees | 0 | [md](content/Donors%20&%20Power%20Networks/Super%20PACs/National%20Committee%20to%20Preserve%20Social%20Security%20&%20Medicare%20PAC.md) |
| 151 | National Committee to Preserve Social Security PAC | Political Committees | 0 | [md](content/Donors%20&%20Power%20Networks/Super%20PACs/National%20Committee%20to%20Preserve%20Social%20Security%20PAC.md) |
| 152 | National Nurses United for Patient Protection | Political Committees | 0 | [md](content/Donors%20&%20Power%20Networks/Super%20PACs/National%20Nurses%20United%20for%20Patient%20Protection.md) |
| 153 | National Victory Action Fund | Political Committees | 0 | [md](content/Donors%20&%20Power%20Networks/Super%20PACs/National%20Victory%20Action%20Fund.md) |
| 154 | National Wildlife Federation Action Fund | Political Committees | 0 | [md](content/Donors%20&%20Power%20Networks/Super%20PACs/National%20Wildlife%20Federation%20Action%20Fund.md) |
| 155 | NEA Fund for Children and Public Education | Political Committees | 0 | [md](content/Donors%20&%20Power%20Networks/Super%20PACs/NEA%20Fund%20for%20Children%20and%20Public%20Education.md) |
| 156 | New House PAC | Political Committees | 0 | [md](content/Donors%20&%20Power%20Networks/Super%20PACs/New%20House%20PAC.md) |
| 157 | New Jersey Family First INC | Political Committees | 0 | [md](content/Donors%20&%20Power%20Networks/Super%20PACs/New%20Jersey%20Family%20First%20INC.md) |
| 158 | New Prosperity Foundation; the | Political Committees | 0 | [md](content/Donors%20&%20Power%20Networks/Super%20PACs/New%20Prosperity%20Foundation;%20the.md) |
| 159 | New York 2014 | Political Committees | 0 | [md](content/Donors%20&%20Power%20Networks/Super%20PACs/New%20York%202014.md) |
| 160 | No Labels Action, Inc. | Political Committees | 0 | [md](content/Donors%20&%20Power%20Networks/Super%20PACs/No%20Labels%20Action,%20Inc..md) |
| 161 | North Dakota Strong INC | Political Committees | 0 | [md](content/Donors%20&%20Power%20Networks/Super%20PACs/North%20Dakota%20Strong%20INC.md) |
| 162 | North Star Dawn PAC | Political Committees | 0 | [md](content/Donors%20&%20Power%20Networks/Super%20PACs/North%20Star%20Dawn%20PAC.md) |
| 163 | Now Or Never PAC | Political Committees | 0 | [md](content/Donors%20&%20Power%20Networks/Super%20PACs/Now%20Or%20Never%20PAC.md) |
| 164 | Ohlone Area United Democratic Campaign | Political Committees | 0 | [md](content/Donors%20&%20Power%20Networks/Super%20PACs/Ohlone%20Area%20United%20Democratic%20Campaign.md) |
| 165 | Oklahomans for a Conservative Future INC | Political Committees | 0 | [md](content/Donors%20&%20Power%20Networks/Super%20PACs/Oklahomans%20for%20a%20Conservative%20Future%20INC.md) |
| 166 | One Nation United | Political Committees | 0 | [md](content/Donors%20&%20Power%20Networks/Super%20PACs/One%20Nation%20United.md) |
| 167 | Oneamerica Votes | Political Committees | 0 | [md](content/Donors%20&%20Power%20Networks/Super%20PACs/Oneamerica%20Votes.md) |
| 168 | Opportunity for All Action Fund | Political Committees | 0 | [md](content/Donors%20&%20Power%20Networks/Super%20PACs/Opportunity%20for%20All%20Action%20Fund.md) |
| 169 | Patriot Voices PAC | Political Committees | 0 | [md](content/Donors%20&%20Power%20Networks/Super%20PACs/Patriot%20Voices%20PAC.md) |
| 170 | Pennsylvania Pro-Life Federation PAC | Political Committees | 0 | [md](content/Donors%20&%20Power%20Networks/Super%20PACs/Pennsylvania%20Pro-Life%20Federation%20PAC.md) |
| 171 | People's Majority | Political Committees | 0 | [md](content/Donors%20&%20Power%20Networks/Super%20PACs/People's%20Majority.md) |
| 172 | Performance Racing Inc. | Political Committees | 0 | [md](content/Donors%20&%20Power%20Networks/Super%20PACs/Performance%20Racing%20Inc..md) |
| 173 | Planned Parenthood Action Fund INC | Political Committees | 0 | [md](content/Donors%20&%20Power%20Networks/Super%20PACs/Planned%20Parenthood%20Action%20Fund%20INC.md) |
| 174 | Planned Parenthood Action Fund of the Pacific Southwest PAC | Political Committees | 0 | [md](content/Donors%20&%20Power%20Networks/Super%20PACs/Planned%20Parenthood%20Action%20Fund%20of%20the%20Pacific%20Southwest%20PAC.md) |
| 175 | Planned Parenthood Advocates of Kansas | Political Committees | 0 | [md](content/Donors%20&%20Power%20Networks/Super%20PACs/Planned%20Parenthood%20Advocates%20of%20Kansas.md) |
| 176 | Planned Parenthood Nw Action PAC | Political Committees | 0 | [md](content/Donors%20&%20Power%20Networks/Super%20PACs/Planned%20Parenthood%20Nw%20Action%20PAC.md) |
| 177 | Planned Parenthood of KS & Mid-MO | Political Committees | 0 | [md](content/Donors%20&%20Power%20Networks/Super%20PACs/Planned%20Parenthood%20of%20KS%20&%20Mid-MO.md) |
| 178 | Planned Parenthood of Minnesota Political Action Fund | Political Committees | 0 | [md](content/Donors%20&%20Power%20Networks/Super%20PACs/Planned%20Parenthood%20of%20Minnesota%20Political%20Action%20Fund.md) |
| 179 | Planned Parenthood Votes Northwest | Political Committees | 0 | [md](content/Donors%20&%20Power%20Networks/Super%20PACs/Planned%20Parenthood%20Votes%20Northwest.md) |
| 180 | Political Action Committee of the American Association of Orthopaedic Surgeons | Political Committees | 0 | [md](content/Donors%20&%20Power%20Networks/Super%20PACs/Political%20Action%20Committee%20of%20the%20American%20Association%20of%20Orthopaedic%20Surgeons.md) |
| 181 | Political Action for Lasting Security | Political Committees | 0 | [md](content/Donors%20&%20Power%20Networks/Super%20PACs/Political%20Action%20for%20Lasting%20Security.md) |
| 182 | Powerpacplus | Political Committees | 0 | [md](content/Donors%20&%20Power%20Networks/Super%20PACs/Powerpacplus.md) |
| 183 | Progressive Turnout Project | Political Committees | 0 | [md](content/Donors%20&%20Power%20Networks/Super%20PACs/Progressive%20Turnout%20Project.md) |
| 184 | Protect Freedom Political Action Committee | Political Committees | 0 | [md](content/Donors%20&%20Power%20Networks/Super%20PACs/Protect%20Freedom%20Political%20Action%20Committee.md) |
| 185 | Protect Our Future PAC | Political Committees | 0 | [md](content/Donors%20&%20Power%20Networks/Super%20PACs/Protect%20Our%20Future%20PAC.md) |
| 186 | Puget Sound Energy INC PAC for Good Government | Political Committees | 0 | [md](content/Donors%20&%20Power%20Networks/Super%20PACs/Puget%20Sound%20Energy%20INC%20PAC%20for%20Good%20Government.md) |
| 187 | Putting People First Political Action Committee | Political Committees | 0 | [md](content/Donors%20&%20Power%20Networks/Super%20PACs/Putting%20People%20First%20Political%20Action%20Committee.md) |
| 188 | Republican Campaign Committee of New Mexico | Political Committees | 0 | [md](content/Donors%20&%20Power%20Networks/Super%20PACs/Republican%20Campaign%20Committee%20of%20New%20Mexico.md) |
| 189 | Resolute Courage PAC | Political Committees | 0 | [md](content/Donors%20&%20Power%20Networks/Super%20PACs/Resolute%20Courage%20PAC.md) |
| 190 | Restoring Our Community | Political Committees | 0 | [md](content/Donors%20&%20Power%20Networks/Super%20PACs/Restoring%20Our%20Community.md) |
| 191 | Revere America | Political Committees | 0 | [md](content/Donors%20&%20Power%20Networks/Super%20PACs/Revere%20America.md) |
| 192 | Right to Life of Michigan Political Action Committee | Political Committees | 0 | [md](content/Donors%20&%20Power%20Networks/Super%20PACs/Right%20to%20Life%20of%20Michigan%20Political%20Action%20Committee.md) |
| 193 | San Benito County Democratic Central Committee | Political Committees | 0 | [md](content/Donors%20&%20Power%20Networks/Super%20PACs/San%20Benito%20County%20Democratic%20Central%20Committee.md) |
| 194 | Sandre Swanson for Assembly 2010 | Political Committees | 0 | [md](content/Donors%20&%20Power%20Networks/Super%20PACs/Sandre%20Swanson%20for%20Assembly%202010.md) |
| 195 | Save Our Country | Political Committees | 0 | [md](content/Donors%20&%20Power%20Networks/Super%20PACs/Save%20Our%20Country.md) |
| 196 | Senate Conservatives Fund | Political Committees | 0 | [md](content/Donors%20&%20Power%20Networks/Super%20PACs/Senate%20Conservatives%20Fund.md) |
| 197 | Senior Political Action Committee | Political Committees | 0 | [md](content/Donors%20&%20Power%20Networks/Super%20PACs/Senior%20Political%20Action%20Committee.md) |
| 198 | Sierra Club Political Committee | Political Committees | 0 | [md](content/Donors%20&%20Power%20Networks/Super%20PACs/Sierra%20Club%20Political%20Committee.md) |
| 199 | South Carolina Patriots PAC | Political Committees | 0 | [md](content/Donors%20&%20Power%20Networks/Super%20PACs/South%20Carolina%20Patriots%20PAC.md) |
| 200 | Southern States Police Benevolent Assoc PAC Fund | Political Committees | 0 | [md](content/Donors%20&%20Power%20Networks/Super%20PACs/Southern%20States%20Police%20Benevolent%20Assoc%20PAC%20Fund.md) |
| 201 | Stars and Stripes Forever PAC | Political Committees | 0 | [md](content/Donors%20&%20Power%20Networks/Super%20PACs/Stars%20and%20Stripes%20Forever%20PAC.md) |
| 202 | Texas Forever | Political Committees | 0 | [md](content/Donors%20&%20Power%20Networks/Super%20PACs/Texas%20Forever.md) |
| 203 | Texas Forward | Political Committees | 0 | [md](content/Donors%20&%20Power%20Networks/Super%20PACs/Texas%20Forward.md) |
| 204 | The 60 Plus Association | Political Committees | 0 | [md](content/Donors%20&%20Power%20Networks/Super%20PACs/The%2060%20Plus%20Association.md) |
| 205 | The Democratic Action PAC | Political Committees | 0 | [md](content/Donors%20&%20Power%20Networks/Super%20PACs/The%20Democratic%20Action%20PAC.md) |
| 206 | The Disabled Veterans Coalition PAC | Political Committees | 0 | [md](content/Donors%20&%20Power%20Networks/Super%20PACs/The%20Disabled%20Veterans%20Coalition%20PAC.md) |
| 207 | The Mobilization Project | Political Committees | 0 | [md](content/Donors%20&%20Power%20Networks/Super%20PACs/The%20Mobilization%20Project.md) |
| 208 | The National Republican Trust PAC | Political Committees | 0 | [md](content/Donors%20&%20Power%20Networks/Super%20PACs/The%20National%20Republican%20Trust%20PAC.md) |
| 209 | The Tea Party Leadership Fund | Political Committees | 0 | [md](content/Donors%20&%20Power%20Networks/Super%20PACs/The%20Tea%20Party%20Leadership%20Fund.md) |
| 210 | Together for Progress PAC | Political Committees | 0 | [md](content/Donors%20&%20Power%20Networks/Super%20PACs/Together%20for%20Progress%20PAC.md) |
| 211 | Together We Thrive | Political Committees | 0 | [md](content/Donors%20&%20Power%20Networks/Super%20PACs/Together%20We%20Thrive.md) |
| 212 | Trinity PAC | Political Committees | 0 | [md](content/Donors%20&%20Power%20Networks/Super%20PACs/Trinity%20PAC.md) |
| 213 | Tzedek PAC | Political Committees | 0 | [md](content/Donors%20&%20Power%20Networks/Super%20PACs/Tzedek%20PAC.md) |
| 214 | Unite Here Tip Campaign Committee | Political Committees | 0 | [md](content/Donors%20&%20Power%20Networks/Super%20PACs/Unite%20Here%20Tip%20Campaign%20Committee.md) |
| 215 | United Food and Commercial Workers International Union Active Ballot Club | Political Committees | 0 | [md](content/Donors%20&%20Power%20Networks/Super%20PACs/United%20Food%20and%20Commercial%20Workers%20International%20Union%20Active%20Ballot%20Club.md) |
| 216 | United We Win Super PAC | Political Committees | 0 | [md](content/Donors%20&%20Power%20Networks/Super%20PACs/United%20We%20Win%20Super%20PAC.md) |
| 217 | Victory for Schaumburg | Political Committees | 0 | [md](content/Donors%20&%20Power%20Networks/Super%20PACs/Victory%20for%20Schaumburg.md) |
| 218 | VIGOP | Political Committees | 0 | [md](content/Donors%20&%20Power%20Networks/Super%20PACs/VIGOP.md) |
| 219 | Voter Protection Project | Political Committees | 0 | [md](content/Donors%20&%20Power%20Networks/Super%20PACs/Voter%20Protection%20Project.md) |
| 220 | Washington Citizens for Colin Powell | Political Committees | 0 | [md](content/Donors%20&%20Power%20Networks/Super%20PACs/Washington%20Citizens%20for%20Colin%20Powell.md) |
| 221 | Wfw Action Fund, Inc. | Political Committees | 0 | [md](content/Donors%20&%20Power%20Networks/Super%20PACs/Wfw%20Action%20Fund,%20Inc..md) |
| 222 | Winning Right PAC | Political Committees | 0 | [md](content/Donors%20&%20Power%20Networks/Super%20PACs/Winning%20Right%20PAC.md) |
| 223 | Working Families Party PAC | Political Committees | 0 | [md](content/Donors%20&%20Power%20Networks/Super%20PACs/Working%20Families%20Party%20PAC.md) |
| 224 | Working for US Political Action Committee INC | Political Committees | 0 | [md](content/Donors%20&%20Power%20Networks/Super%20PACs/Working%20for%20US%20Political%20Action%20Committee%20INC.md) |
