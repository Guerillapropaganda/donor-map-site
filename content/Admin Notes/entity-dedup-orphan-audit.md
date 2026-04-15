---
title: "Entity Dedup + Orphan Audit"
type: admin-note
note-type: data
status: open
last-updated: 2026-04-15
generator: scripts/entity-dedup-orphan-audit.cjs
---

# Entity Dedup + Orphan Audit

Three-way audit of `data/entities.jsonl`: (1) probable duplicate records after name normalization, (2) orphan entities with no inbound wikilinks, (3) entities whose `profile_path` points at a missing file.

## Summary

- **Total entities:** 1167
- **Probable duplicate groups:** 2 (2 records would merge)
- **Name mismatches:** 53 (entity findable via a variant but primary name drifts)
- **True orphans:** 439
  - **Redirect/placeholder:** 0 (expected)
  - **Genuine:** 439 (worth investigating)
- **Missing profile files:** 0

## Probable duplicates (2 groups)

Name normalization strips corporate suffixes (Inc/LLC/Corp/etc.), parenthetical notes, and punctuation. These groups share the same normalized key. False positives happen — review each group before merging. The **dedup action** is: pick a canonical entity, update all inbound wikilinks + relationship edges to reference its name, then delete the redundant records.

| Normalized key | Count | IDs + names |
|---|---:|---|
| `blackstone` | 2 | ent_000008:Blackstone Group / ent_000161:Blackstone (Redirect) |
| `raytheon` | 2 | ent_000202:Raytheon (Redirect) / ent_000360:Raytheon (RTX Corporation) |

## Name mismatches (53)

Entity's `name` field in `data/entities.jsonl` doesn't match how the rest of the vault refers to it via `[[wikilinks]]`, but a name variant (stripping 'Master Profile', 'Profile', or using the file basename) does match. **These break the class-tag lookup pipeline** — scripts looking up by `e.name` will miss these entities even though they're the right entity.

**Fix:** update `entities.jsonl` to set `name` to the variant that matches wikilinks. A migration script should batch this.

| ID | Current name | Matched variant |
|---|---|---|
| `ent_000001` | Jeff Yass (Redirect) | jeff yass |
| `ent_000059` | Meta - Facebook Political Operation (Redirect) | meta - facebook political operation |
| `ent_000091` | Fairshake PAC - Crypto Super PAC (Redirect) | fairshake pac - crypto super pac |
| `ent_000161` | Blackstone (Redirect) | blackstone |
| `ent_000167` | David Sacks Political Operation (Redirect) | david sacks political operation |
| `ent_000174` | Google / Alphabet Inc. (Redirect) | google |
| `ent_000192` | Meta (Redirect) | meta |
| `ent_000202` | Raytheon (Redirect) | raytheon |
| `ent_000311` | Drummond Co. | drummond co |
| `ent_000353` | Honeywell International | honeywell |
| `ent_000471` | Sonny Perdue Master Profile | sonny perdue |
| `ent_000485` | Mark Esper Master Profile | mark esper |
| `ent_000508` | Todd Young Master Profile | todd young |
| `ent_000555` | Dan Sullivan Master Profile | dan sullivan |
| `ent_000572` | Ken Calvert Master Profile | ken calvert |
| `ent_000575` | Young Kim Master Profile | young kim |
| `ent_000581` | Vince Fong Master Profile | vince fong |
| `ent_000588` | Tracey Mann Master Profile | tracey mann |
| `ent_000596` | Tim Moore Master Profile | tim moore |
| `ent_000605` | Scott Perry Master Profile | scott perry |
| `ent_000622` | Riley M. Moore Master Profile | riley m. moore |
| `ent_000626` | Richard Hudson Master Profile | richard hudson |
| `ent_000643` | Nathaniel Moran Master Profile | nathaniel moran |
| `ent_000654` | Mike Carey Master Profile | mike carey |
| `ent_000690` | Julia Letlow Master Profile | julia letlow |
| `ent_000718` | Harold Rogers Master Profile | harold rogers |
| `ent_000742` | David G. Valadao Master Profile | david g. valadao |
| `ent_000743` | Darrell Issa Master Profile | darrell issa |
| `ent_000772` | Brad Finstad Master Profile | brad finstad |
| `ent_000773` | Blake D. Moore Master Profile | blake d. moore |
| `ent_000777` | Barry Moore Master Profile | barry moore |
| `ent_000781` | August Pfluger Master Profile | august pfluger |
| `ent_000784` | Andy Harris Master Profile | andy harris |
| `ent_000793` | Aaron Bean Master Profile | aaron bean |
| `ent_000868` | Chris Coons Master Profile | chris coons |
| `ent_000873` | Andy Kim Master Profile | andy kim |
| `ent_000892` | Leon Panetta Master Profile | leon panetta |
| `ent_000901` | Gina McCarthy Master Profile | gina mccarthy |
| `ent_000942` | Seth Moulton Master Profile | seth moulton |
| `ent_000951` | Salud O. Carbajal Master Profile | salud o. carbajal |
| `ent_000955` | Robert Menendez Master Profile | robert menendez |
| `ent_000978` | Mike Thompson Master Profile | mike thompson |
| `ent_001002` | Linda T. Sanchez Master Profile | linda t. sanchez |
| `ent_001031` | Jimmy Panetta Master Profile | jimmy panetta |
| `ent_001035` | Jim Costa Master Profile | jim costa |
| `ent_001039` | Jerrold Nadler Master Profile | jerrold nadler |
| `ent_001043` | Jared Moskowitz Master Profile | jared moskowitz |
| `ent_001045` | Jared F. Golden Master Profile | jared f. golden |
| `ent_001051` | James E. Clyburn Master Profile | james e. clyburn |
| `ent_001056` | J. Luis Correa Master Profile | j. luis correa |
| `ent_001064` | Gwen Moore Master Profile | gwen moore |
| `ent_001148` | Shalanda Young Master Profile | shalanda young |
| `ent_001155` | Lloyd Austin Master Profile | lloyd austin |

## Genuine orphans (439)

Entities in the registry that no vault file wikilinks to. Either the entity should be deleted, the profile file should be wikilinked from other profiles, or there's a name mismatch between the entity record and the wikilink text.

| Entity | ID | Profile path |
|---|---|---|
| README - Donors and Power Networks | `ent_000004` | content/Donors & Power Networks/_README.md |
| ALEC - Comprehensive Donor/Dark Money Profile Research | `ent_000363` | content/Donors & Power Networks/Dark Money/ALEC - Comprehensive Donor Profile Research.md |
| Sonia Sotomayor Master Profile | `ent_000454` | content/Politicians/SCOTUS/Sonia Sotomayor/_Sonia Sotomayor Master Profile.md |
| Ketanji Brown Jackson Master Profile | `ent_000457` | content/Politicians/SCOTUS/Ketanji Brown Jackson/_Ketanji Brown Jackson Master Profile.md |
| Elena Kagan Master Profile | `ent_000459` | content/Politicians/SCOTUS/Elena Kagan/_Elena Kagan Master Profile.md |
| William Barr Master Profile | `ent_000464` | content/Politicians/Republicans/Trump Cabinet/William Barr/_William Barr Master Profile.md |
| Wilbur Ross Master Profile | `ent_000465` | content/Politicians/Republicans/Trump Cabinet/Wilbur Ross/_Wilbur Ross Master Profile.md |
| Steven Mnuchin Master Profile | `ent_000467` | content/Politicians/Republicans/Trump Cabinet/Steven Mnuchin/_Steven Mnuchin Master Profile.md |
| Ryan Zinke Master Profile | `ent_000473` | content/Politicians/Republicans/Trump Cabinet/Ryan Zinke/_Ryan Zinke Master Profile.md |
| Robert Wilkie Master Profile | `ent_000475` | content/Politicians/Republicans/Trump Cabinet/Robert Wilkie/_Robert Wilkie Master Profile.md |
| Robert Lighthizer Master Profile | `ent_000476` | content/Politicians/Republicans/Trump Cabinet/Robert Lighthizer/_Robert Lighthizer Master Profile.md |
| Rick Perry Master Profile | `ent_000477` | content/Politicians/Republicans/Trump Cabinet/Rick Perry/_Rick Perry Master Profile.md |
| Jeff Sessions Master Profile | `ent_000492` | content/Politicians/Republicans/Trump Cabinet/Jeff Sessions/_Jeff Sessions Master Profile.md |
| Elaine Chao Master Profile | `ent_000496` | content/Politicians/Republicans/Trump Cabinet/Elaine Chao/_Elaine Chao Master Profile.md |
| Dan Coats Master Profile | `ent_000499` | content/Politicians/Republicans/Trump Cabinet/Dan Coats/_Dan Coats Master Profile.md |
| Betsy DeVos Master Profile | `ent_000502` | content/Politicians/Republicans/Trump Cabinet/Betsy DeVos/_Betsy DeVos Master Profile.md |
| Ben Carson Master Profile | `ent_000503` | content/Politicians/Republicans/Trump Cabinet/Ben Carson/_Ben Carson Master Profile.md |
| Alex Azar Master Profile | `ent_000505` | content/Politicians/Republicans/Trump Cabinet/Alex Azar/_Alex Azar Master Profile.md |
| Tim Sheehy Master Profile | `ent_000509` | content/Politicians/Republicans/Senate/Tim Sheehy/_Tim Sheehy Master Profile.md |
| Ted Budd Master Profile | `ent_000513` | content/Politicians/Republicans/Senate/Ted Budd/_Ted Budd Master Profile.md |
| Steve Daines Master Profile | `ent_000515` | content/Politicians/Republicans/Senate/Steve Daines/_Steve Daines Master Profile.md |
| Pete Ricketts Master Profile | `ent_000522` | content/Politicians/Republicans/Senate/Pete Ricketts/_Pete Ricketts Master Profile.md |
| Mike Rounds Master Profile | `ent_000525` | content/Politicians/Republicans/Senate/Mike Rounds/_Mike Rounds Master Profile.md |
| Marsha Blackburn Master Profile | `ent_000530` | content/Politicians/Republicans/Senate/Marsha Blackburn/_Marsha Blackburn Master Profile.md |
| Kevin Cramer Master Profile | `ent_000534` | content/Politicians/Republicans/Senate/Kevin Cramer/_Kevin Cramer Master Profile.md |
| John R. Curtis Master Profile | `ent_000539` | content/Politicians/Republicans/Senate/John R. Curtis/_John R. Curtis Master Profile.md |
| Jim Banks Master Profile | `ent_000548` | content/Politicians/Republicans/Senate/Jim Banks/_Jim Banks Master Profile.md |
| James C. Justice Master Profile | `ent_000551` | content/Politicians/Republicans/Senate/James C. Justice/_James C. Justice Master Profile.md |
| Eric Schmitt Master Profile | `ent_000552` | content/Politicians/Republicans/Senate/Eric Schmitt/_Eric Schmitt Master Profile.md |
| David McCormick Master Profile | `ent_000554` | content/Politicians/Republicans/Senate/David McCormick/_David McCormick Master Profile.md |
| Cynthia M. Lummis Master Profile | `ent_000556` | content/Politicians/Republicans/Senate/Cynthia M. Lummis/_Cynthia M. Lummis Master Profile.md |
| Cindy Hyde-Smith Master Profile | `ent_000557` | content/Politicians/Republicans/Senate/Cindy Hyde-Smith/_Cindy Hyde-Smith Master Profile.md |
| Ashley Moody Master Profile | `ent_000560` | content/Politicians/Republicans/Senate/Ashley Moody/_Ashley Moody Master Profile.md |
| Alan Armstrong Master Profile | `ent_000562` | content/Politicians/Republicans/Senate/Alan Armstrong/_Alan Armstrong Master Profile.md |
| Robert Gates Master Profile | `ent_000565` | content/Politicians/Republicans/Obama Cabinet/Robert Gates/_Robert Gates Master Profile.md |
| Ray LaHood Master Profile | `ent_000566` | content/Politicians/Republicans/Obama Cabinet/Ray LaHood/_Ray LaHood Master Profile.md |
| Chuck Hagel Master Profile | `ent_000567` | content/Politicians/Republicans/Obama Cabinet/Chuck Hagel/_Chuck Hagel Master Profile.md |
| Zachary Nunn Master Profile | `ent_000574` | content/Politicians/Republicans/House/Zachary Nunn/_Zachary Nunn Master Profile.md |
| William R. Timmons Master Profile | `ent_000576` | content/Politicians/Republicans/House/William R. Timmons/_William R. Timmons Master Profile.md |
| Wesley Hunt Master Profile | `ent_000577` | content/Politicians/Republicans/House/Wesley Hunt/_Wesley Hunt Master Profile.md |
| Warren Davidson Master Profile | `ent_000578` | content/Politicians/Republicans/House/Warren Davidson/_Warren Davidson Master Profile.md |
| W. Gregory Steube Master Profile | `ent_000579` | content/Politicians/Republicans/House/W. Gregory Steube/_W. Gregory Steube Master Profile.md |
| Victoria Spartz Master Profile | `ent_000582` | content/Politicians/Republicans/House/Victoria Spartz/_Victoria Spartz Master Profile.md |
| Vern Buchanan Master Profile | `ent_000583` | content/Politicians/Republicans/House/Vern Buchanan/_Vern Buchanan Master Profile.md |
| Troy E. Nehls Master Profile | `ent_000584` | content/Politicians/Republicans/House/Troy E. Nehls/_Troy E. Nehls Master Profile.md |
| Troy Downing Master Profile | `ent_000585` | content/Politicians/Republicans/House/Troy Downing/_Troy Downing Master Profile.md |
| Troy Balderson Master Profile | `ent_000586` | content/Politicians/Republicans/House/Troy Balderson/_Troy Balderson Master Profile.md |
| Trent Kelly Master Profile | `ent_000587` | content/Politicians/Republicans/House/Trent Kelly/_Trent Kelly Master Profile.md |
| Tony Wied Master Profile | `ent_000589` | content/Politicians/Republicans/House/Tony Wied/_Tony Wied Master Profile.md |
| Tom McClintock Master Profile | `ent_000591` | content/Politicians/Republicans/House/Tom McClintock/_Tom McClintock Master Profile.md |
| Tom Emmer Master Profile | `ent_000592` | content/Politicians/Republicans/House/Tom Emmer/_Tom Emmer Master Profile.md |
| Tom Barrett Master Profile | `ent_000594` | content/Politicians/Republicans/House/Tom Barrett/_Tom Barrett Master Profile.md |
| Tim Burchett Master Profile | `ent_000597` | content/Politicians/Republicans/House/Tim Burchett/_Tim Burchett Master Profile.md |
| Thomas P. Tiffany Master Profile | `ent_000598` | content/Politicians/Republicans/House/Thomas P. Tiffany/_Thomas P. Tiffany Master Profile.md |
| Thomas Massie Master Profile | `ent_000599` | content/Politicians/Republicans/House/Thomas Massie/_Thomas Massie Master Profile.md |
| Thomas H. Kean Master Profile | `ent_000600` | content/Politicians/Republicans/House/Thomas H. Kean/_Thomas H. Kean Master Profile.md |
| Steve Womack Master Profile | `ent_000601` | content/Politicians/Republicans/House/Steve Womack/_Steve Womack Master Profile.md |
| Stephanie I. Bice Master Profile | `ent_000603` | content/Politicians/Republicans/House/Stephanie I. Bice/_Stephanie I. Bice Master Profile.md |
| Sheri Biggs Master Profile | `ent_000604` | content/Politicians/Republicans/House/Sheri Biggs/_Sheri Biggs Master Profile.md |
| Scott Franklin Master Profile | `ent_000606` | content/Politicians/Republicans/House/Scott Franklin/_Scott Franklin Master Profile.md |
| Scott Fitzgerald Master Profile | `ent_000607` | content/Politicians/Republicans/House/Scott Fitzgerald/_Scott Fitzgerald Master Profile.md |
| Scott Desjarlais Master Profile | `ent_000608` | content/Politicians/Republicans/House/Scott Desjarlais/_Scott Desjarlais Master Profile.md |
| Sam Graves | `ent_000609` | content/Politicians/Republicans/House/Sam Graves/_Sam Graves Master Profile.md |
| Ryan Mackenzie Master Profile | `ent_000610` | content/Politicians/Republicans/House/Ryan Mackenzie/_Ryan Mackenzie Master Profile.md |
| Russell Fry Master Profile | `ent_000611` | content/Politicians/Republicans/House/Russell Fry/_Russell Fry Master Profile.md |
| Russ Fulcher Master Profile | `ent_000612` | content/Politicians/Republicans/House/Russ Fulcher/_Russ Fulcher Master Profile.md |
| Rudy Yakym Master Profile | `ent_000613` | content/Politicians/Republicans/House/Rudy Yakym/_Rudy Yakym Master Profile.md |
| Ronny Jackson Master Profile | `ent_000614` | content/Politicians/Republicans/House/Ronny Jackson/_Ronny Jackson Master Profile.md |
| Ron Estes Master Profile | `ent_000615` | content/Politicians/Republicans/House/Ron Estes/_Ron Estes Master Profile.md |
| Roger Williams | `ent_000616` | content/Politicians/Republicans/House/Roger Williams/_Roger Williams Master Profile.md |
| Robert P. Bresnahan Master Profile | `ent_000617` | content/Politicians/Republicans/House/Robert P. Bresnahan/_Robert P. Bresnahan Master Profile.md |
| Robert J. Wittman Master Profile | `ent_000618` | content/Politicians/Republicans/House/Robert J. Wittman/_Robert J. Wittman Master Profile.md |
| Robert F. Onder Master Profile | `ent_000619` | content/Politicians/Republicans/House/Robert F. Onder/_Robert F. Onder Master Profile.md |
| Robert E. Latta Master Profile | `ent_000620` | content/Politicians/Republicans/House/Robert E. Latta/_Robert E. Latta Master Profile.md |
| Robert B. Aderholt Master Profile | `ent_000621` | content/Politicians/Republicans/House/Robert B. Aderholt/_Robert B. Aderholt Master Profile.md |
| Rick W. Allen Master Profile | `ent_000623` | content/Politicians/Republicans/House/Rick W. Allen/_Rick W. Allen Master Profile.md |
| Rick Crawford | `ent_000624` | content/Politicians/Republicans/House/Rick Crawford/_Rick Crawford Master Profile.md |
| Richard McCormick Master Profile | `ent_000625` | content/Politicians/Republicans/House/Richard McCormick/_Richard McCormick Master Profile.md |
| Randy K. Weber Master Profile | `ent_000627` | content/Politicians/Republicans/House/Randy K. Weber/_Randy K. Weber Master Profile.md |
| Randy Fine Master Profile | `ent_000628` | content/Politicians/Republicans/House/Randy Fine/_Randy Fine Master Profile.md |
| Randy Feenstra Master Profile | `ent_000629` | content/Politicians/Republicans/House/Randy Feenstra/_Randy Feenstra Master Profile.md |
| Ralph Norman Master Profile | `ent_000630` | content/Politicians/Republicans/House/Ralph Norman/_Ralph Norman Master Profile.md |
| Pete Stauber Master Profile | `ent_000631` | content/Politicians/Republicans/House/Pete Stauber/_Pete Stauber Master Profile.md |
| Pete Sessions Master Profile | `ent_000632` | content/Politicians/Republicans/House/Pete Sessions/_Pete Sessions Master Profile.md |
| Paul A. Gosar Master Profile | `ent_000634` | content/Politicians/Republicans/House/Paul A. Gosar/_Paul A. Gosar Master Profile.md |
| Pat Harrigan Master Profile | `ent_000636` | content/Politicians/Republicans/House/Pat Harrigan/_Pat Harrigan Master Profile.md |
| Pat Fallon Master Profile | `ent_000637` | content/Politicians/Republicans/House/Pat Fallon/_Pat Fallon Master Profile.md |
| Nicole Malliotakis Master Profile | `ent_000638` | content/Politicians/Republicans/House/Nicole Malliotakis/_Nicole Malliotakis Master Profile.md |
| Nick Lalota Master Profile | `ent_000639` | content/Politicians/Republicans/House/Nick Lalota/_Nick Lalota Master Profile.md |
| Nicholas J. Begich Master Profile | `ent_000640` | content/Politicians/Republicans/House/Nicholas J. Begich/_Nicholas J. Begich Master Profile.md |
| Nicholas A. Langworthy Master Profile | `ent_000641` | content/Politicians/Republicans/House/Nicholas A. Langworthy/_Nicholas A. Langworthy Master Profile.md |
| Neal P. Dunn Master Profile | `ent_000642` | content/Politicians/Republicans/House/Neal P. Dunn/_Neal P. Dunn Master Profile.md |
| Morgan Luttrell Master Profile | `ent_000644` | content/Politicians/Republicans/House/Morgan Luttrell/_Morgan Luttrell Master Profile.md |
| Monica de la Cruz Master Profile | `ent_000645` | content/Politicians/Republicans/House/Monica de la Cruz/_Monica de la Cruz Master Profile.md |
| Mike Kennedy Master Profile | `ent_000648` | content/Politicians/Republicans/House/Mike Kennedy/_Mike Kennedy Master Profile.md |
| Mike Kelly Master Profile | `ent_000649` | content/Politicians/Republicans/House/Mike Kelly/_Mike Kelly Master Profile.md |
| Mike Haridopolos Master Profile | `ent_000651` | content/Politicians/Republicans/House/Mike Haridopolos/_Mike Haridopolos Master Profile.md |
| Mike Flood Master Profile | `ent_000652` | content/Politicians/Republicans/House/Mike Flood/_Mike Flood Master Profile.md |
| Mike Ezell Master Profile | `ent_000653` | content/Politicians/Republicans/House/Mike Ezell/_Mike Ezell Master Profile.md |
| Michelle Fischbach Master Profile | `ent_000656` | content/Politicians/Republicans/House/Michelle Fischbach/_Michelle Fischbach Master Profile.md |
| … +339 more | | |

---

*Regenerate: `node scripts/entity-dedup-orphan-audit.cjs --write`. Re-run after each cleanup batch to see progress.*
