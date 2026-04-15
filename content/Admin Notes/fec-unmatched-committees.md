---
title: "FEC Unmatched Committees"
type: admin-note
note-type: data
status: active
last-updated: 2026-04-15
authority: Pillar 2b migration
---

# FEC Unmatched Committees

Committees found in `auto:fec-politician` body tables that could not be resolved to a vault profile via title, alias, or simple suffix strip. Total: **298** unique committees / **418** rows.

**Fix**: add an `aliases:` entry to the parent profile's frontmatter (the `buildTitleIndex` walker reads it), or create a stub profile for the committee. Re-run `migrate-fec-body-tables-to-edges.cjs --write` to pick up the new mapping.

Sorted by total dollar volume (support + oppose).

| Committee | Count | Support $ | Oppose $ | Example politicians |
|-----------|-------|-----------|----------|---------------------|
| FOOD AND WATER ACTION | 1 | $1,026,511,866 | $0 | Kamala Harris |
| WINSENATE | 3 | $12,170,854 | $145,576,184 | Sherrod Brown, Bernie Moreno, Ted Cruz |
| SFA FUND, INC | 2 | $65,502,351 | $46,974,966 | Nikki Haley, Ron DeSantis |
| DEFEND AMERICAN JOBS | 2 | $81,072,918 | $0 | French Hill, Bernie Moreno |
| RESTORATION PAC | 2 | $0 | $47,848,182 | Richard Blumenthal, Kamala Harris |
| RESTORE OUR FUTURE, INC. | 2 | $47,498,530 | $0 | Paul Ryan, Mitt Romney |
| BEST OF AMERICA PAC | 1 | $37,448,046 | $0 | Doug Burgum |
| AMERICA LEADS | 1 | $35,391,631 | $0 | Chris Christie |
| WINNING OUR FUTURE | 2 | $4,344,542 | $30,837,440 | Paul Ryan, Mitt Romney |
| RBG PAC | 1 | $34,600,000 | $0 | Donald Trump |
| AB PAC | 1 | $0 | $33,935,549 | Donald Trump |
| RETIRE CAREER POLITICIANS | 2 | $15,753,725 | $13,725,456 | Dan Osborn, Deb Fischer |
| CROSSROADS GRASSROOTS POLICY STRATEGIES | 4 | $0 | $24,760,798 | Sherrod Brown, Elizabeth Warren, Harry Reid |
| AMERICANS FOR RESPONSIBLE LEADERSHIP | 2 | $19,267,130 | $0 | Paul Ryan, Mitt Romney |
| FIGHT RIGHT INC | 1 | $0 | $18,881,648 | Nikki Haley |
| BUCKEYE VALUES PAC | 1 | $0 | $12,774,928 | Sherrod Brown |
| HMP | 2 | $0 | $11,742,125 | Bryan Steil, Ken Calvert |
| TEXAS CONSERVATIVES FUND | 1 | $0 | $11,020,000 | Ted Cruz |
| THE SENTINEL ACTION FUND | 1 | $0 | $10,655,338 | Mark Kelly |
| VOTEVETS | 2 | $10,488,111 | $0 | Pete Buttigieg, Tammy Baldwin |
| ESAFUND | 5 | $1,618,867 | $8,374,056 | John Hickenlooper, Patty Murray, Dan Osborn |
| AMERICANS FOR TOMORROW'S FUTURE | 2 | $0 | $9,934,794 | Ilhan Omar, Ilhan Omar |
| TEXANS FOR A CONSERVATIVE MAJORITY | 1 | $9,787,637 | $0 | John Cornyn |
| ENDING SPENDING ACTION FUND | 2 | $1,651,703 | $7,523,339 | Jeanne Shaheen, Deb Fischer |
| PUT UTAH FIRST PAC | 1 | $0 | $8,940,890 | Mike Lee |
| EVERGREEN PRINCIPLES PAC | 1 | $0 | $8,581,846 | Patty Murray |
| ALABAMA CHRISTIAN CONSERVATIVES | 1 | $7,601,554 | $0 | Katie Britt |
| CONSERVATIVE SOLUTIONS PAC | 1 | $0 | $6,643,036 | Chris Christie |
| TRUTH AND COURAGE PAC | 1 | $6,598,631 | $0 | Ted Cruz |
| BUCKEYE LEADERSHIP FUND, INC. | 1 | $0 | $6,577,836 | Bernie Moreno |
| ALABAMA CONSERVATIVES FUND | 1 | $6,460,099 | $0 | Katie Britt |
| TELL IT LIKE IT IS PAC | 1 | $5,854,979 | $0 | Chris Christie |
| 314 ACTION FUND | 2 | $0 | $5,775,346 | Nancy Mace, Lee Zeldin |
| CONNECTICUT PATRIOTS PAC | 1 | $0 | $5,702,166 | Richard Blumenthal |
| MAJORITY PAC | 1 | $0 | $5,478,958 | Linda McMahon |
| SOUTH CAROLINA PATRIOTS PAC | 1 | $0 | $4,988,211 | Nancy Mace |
| 1820 PAC | 1 | $4,805,828 | $0 | Susan Collins |
| TEXAS FOREVER | 1 | $0 | $4,600,814 | Ted Cruz |
| AMERICA FIRST POLICIES INC. | 1 | $0 | $4,339,970 | Jon Ossoff |
| FLORIDA PATRIOTS PAC | 1 | $0 | $4,243,279 | Matt Gaetz |
| MAINSTREAM DEMOCRATS PAC | 5 | $2,927,408 | $1,295,393 | Cori Bush, Dan Goldman, Henry Cuellar |
| PROTECT FREEDOM POLITICAL ACTION COMMITTEE | 3 | $1,730,000 | $2,301,252 | Matt Gaetz, Kay Granger, Mike Lee |
| NOW OR NEVER PAC | 2 | $0 | $3,992,413 | Tammy Duckworth, James Lankford |
| FUTURE45 | 3 | $0 | $3,825,473 | Maxine Waters, Nancy Pelosi, Elizabeth Warren |
| HEARTLAND RESURGENCE | 1 | $0 | $3,787,060 | Dan Osborn |
| FREEDOMWORKS FOR AMERICA | 1 | $30,511 | $3,649,440 | Tammy Duckworth |
| NATIONAL VICTORY ACTION FUND | 3 | $3,515,000 | $0 | Bill Hagerty, John Barrasso, Elise Stefanik |
| UNITED DEMOCRACY PROJECT (UDP) | 2 | $223,200 | $3,205,379 | Shontel Brown, Summer Lee |
| WORKING FAMILIES PARTY PAC | 5 | $1,610,370 | $1,741,195 | Cori Bush, George Latimer, Raul Grijalva |
| AMERICAN DREAM FEDERAL ACTION | 1 | $3,310,471 | $0 | Katie Britt |
| LIBERTY CHAMPIONS | 1 | $3,213,782 | $0 | Mike Lee |
| END THE GRIDLOCK | 1 | $0 | $3,197,722 | Deb Fischer |
| AMERICANS FOR COMMON SENSE (AFCS) | 1 | $0 | $3,160,436 | Lee Zeldin |
| SAVE OUR COUNTRY | 1 | $3,100,000 | $0 | Ted Cruz |
| PROTECT OUR FUTURE PAC | 1 | $3,031,156 | $0 | Shontel Brown |
| PATRIOT MAJORITY PAC | 3 | $2,736,988 | $0 | Debbie Wasserman Schultz, Debbie Wasserman Schultz, Josh Gottheimer |
| TEXAS FORWARD | 1 | $0 | $2,373,536 | Henry Cuellar |
| CONSERVATIVE OUTSIDER PAC INC | 1 | $0 | $2,272,673 | Katie Britt |
| SEIU COPE (SERVICE EMPLOYEES INTERNATIONAL UNION COMMITTEE ON POLITICAL EDUCATION) | 3 | $2,132,995 | $106,057 | Raja Krishnamoorthi, Joe Biden, John Boehner |
| FREEDOM PARTNERS ACTION FUND INC | 1 | $0 | $2,028,031 | Jeff Merkley |
| CONSERVATIVE OUTSIDER PAC | 1 | $0 | $1,936,000 | Bill Hagerty |
| HIGH PLAINS PAC | 1 | $1,894,880 | $0 | John Barrasso |
| UNITED WE WIN SUPER PAC | 1 | $1,873,487 | $0 | Cory Booker |
| WFP NATIONAL PAC | 1 | $1,872,561 | $0 | Summer Lee |
| ENDING SPENDING FUND | 1 | $0 | $1,724,864 | Harry Reid |
| AMERICA 360 COMMITTEE | 1 | $0 | $1,693,306 | Elizabeth Warren |
| INDEPENDENT LEADERSHIP FOR NEW HAMPSHIRE PAC | 1 | $0 | $1,656,880 | Jeanne Shaheen |
| AMERICAS PAC | 1 | $0 | $1,573,351 | Joe Biden |
| CENTER FORWARD COMMITTEE | 2 | $1,564,500 | $0 | Angie Craig, Josh Gottheimer |
| RAILROADERS FOR PUBLIC SAFETY | 1 | $1,520,000 | $0 | Dan Osborn |
| INDEPENDENCE USA PAC | 1 | $1,465,072 | $0 | Cory Booker |
| COUNCIL FOR AMERICAN JOB GROWTH | 1 | $1,401,341 | $0 | Jeanne Shaheen |
| BUILDING A BETTER PA | 2 | $1,392,138 | $0 | Brendan Boyle, Brendan Boyle |
| SERVICE EMPLOYEES INTERNATIONAL UNION COMMITTEE ON POLITICAL EDUCATION (SEIU COPE) | 2 | $1,378,458 | $0 | Tim Walz, Jeff Merkley |
| LIVING UNITED FOR CHANGE IN ARIZONA | 1 | $1,214,021 | $135,590 | Joe Biden |
| MINNESOTA DEMOCRATIC-FARMER-LABOR PARTY | 2 | $1,293,926 | $0 | Ilhan Omar, Ilhan Omar |
| VIGOP (VIRGIN ISLANDS REPUBLICAN PARTY) | 2 | $9,090 | $1,210,936 | Maxine Waters, Nancy Pelosi |
| EVERYTOWN FOR GUN SAFETY VICTORY FUND (EVERYTOWN VICTORY FUND) | 1 | $0 | $1,098,954 | Ken Calvert |
| SOUTH FLORIDA RESIDENTS FIRST | 1 | $1,071,310 | $0 | Carlos Gimenez |
| THE MOBILIZATION PROJECT | 1 | $1,064,894 | $0 | Cory Booker |
| THE DEMOCRATIC ACTION PAC | 2 | $465,000 | $545,000 | Nina Turner, Shontel Brown |
| WFP IE COMMITTEE | 5 | $992,581 | $0 | Ilhan Omar, Ilhan Omar, Nina Turner |
| AMERICAN HOSPITAL ASSOCIATION PAC | 3 | $957,290 | $0 | Richard Neal, Rosa DeLauro, Cathy McMorris Rodgers |
| REPUBLICAN CAMPAIGN COMMITTEE OF NEW MEXICO | 1 | $0 | $930,000 | Martin Heinrich |
| SLF PAC | 1 | $911,323 | $0 | Michael Whatley |
| FIRST AMENDMENT ALLIANCE | 2 | $0 | $902,690 | Chris Coons, Harry Reid |
| NORTH FLORIDA NEIGHBORS | 1 | $869,566 | $0 | Matt Gaetz |
| EDF ACTION VOTES | 1 | $0 | $795,808 | Ken Calvert |
| COMMONWEALTH UNITY FUND | 1 | $0 | $785,000 | Elizabeth Warren |
| NO LABELS ACTION, INC. | 1 | $773,284 | $0 | Josh Gottheimer |
| OKLAHOMANS FOR A CONSERVATIVE FUTURE INC | 1 | $0 | $766,330 | James Lankford |
| TAKEACTION MN FEDERAL FUND | 2 | $751,218 | $0 | Ilhan Omar, Ilhan Omar |
| CALIFORNIANS FOR INNOVATION | 1 | $745,467 | $0 | Ro Khanna |
| NEW YORK 2014 | 1 | $744,532 | $0 | Elise Stefanik |
| PROTECT PROGRESS | 3 | $739,093 | $0 | Dan Goldman, Ritchie Torres, Ro Khanna |
| EQUALITY PROJECT PAC | 2 | $736,517 | $0 | Mark Takano, Ritchie Torres |
| COLORADO UNITED PAC | 1 | $0 | $720,000 | Lauren Boebert |
| FIGHT CORPORATE MONOPOLIES | 1 | $0 | $650,000 | Richard Neal |
| THE TEA PARTY LEADERSHIP FUND | 1 | $0 | $553,540 | John Boehner |
| AMERICAN FEDERATION OF STATE COUNTY & MUNICIPAL EMPLOYEES  P E O P L E | 1 | $0 | $518,043 | Linda McMahon |
| NEW PROSPERITY FOUNDATION; THE | 1 | $0 | $517,710 | Tammy Duckworth |
| AMERICAN PRINCIPLES FUND | 1 | $0 | $511,500 | Cory Booker |
| PLANNED PARENTHOOD ACTION FUND INC | 4 | $495,427 | $6 | Jon Ossoff, Jerry Moran, John Boozman |
| AMERICAN COLLEGE OF RADIOLOGY ASSOCIATION PAC | 4 | $482,794 | $0 | Debbie Wasserman Schultz, Debbie Wasserman Schultz, Frank Pallone |
| HOUSE LIBERTY PROJECT | 1 | $0 | $479,599 | Roger Marshall |
| CITIZENS FOR RESPONSIBLE ENERGY SOLUTIONS INC. | 3 | $459,847 | $0 | Bruce Westerman, Glenn Thompson, Elise Stefanik |
| LEADERSHIP NOW | 1 | $0 | $446,250 | Richard Blumenthal |
| CONGRESSIONAL PROGRESSIVE CAUCUS PAC | 1 | $437,462 | $0 | Summer Lee |
| CLEARPATH ACTION FUND, INC. | 3 | $437,125 | $0 | Cathy McMorris Rodgers, John Barrasso, John Hoeven |
| GIFFORDS PAC | 1 | $0 | $415,200 | Mario Diaz-Balart |
| VOTER PROTECTION PROJECT | 1 | $414,621 | $0 | Ritchie Torres |
| HUMAN RIGHTS CAMPAIGN EQUALITY VOTES | 1 | $412,621 | $0 | Tammy Baldwin |
| NATIONAL NURSES UNITED FOR PATIENT PROTECTION | 4 | $405,610 | $0 | Ilhan Omar, Ilhan Omar, Mark Takano |
| KANSAS FARMERS FUND | 1 | $0 | $374,565 | Roger Marshall |
| AMERICAN COMMITMENT ACTION FUND | 1 | $0 | $371,600 | Cory Booker |
| PEOPLE'S MAJORITY | 1 | $0 | $366,331 | Sheldon Whitehouse |
| CLUB FOR GROWTH INC PAC | 2 | $365,646 | $0 | Patrick McHenry, John Thune |
| CENTRAL COAST VALUES PAC | 1 | $349,671 | $0 | Zoe Lofgren |
| CULAC THE PAC OF CREDIT UNION NATIONAL ASSOCIATION | 1 | $346,842 | $0 | Pete Aguilar |
| FREEDOM VOTE | 1 | $342,178 | $0 | John Boehner |
| CHC BOLD PAC | 1 | $336,876 | $0 | Ritchie Torres |
| AMERICAN FUTURE FUND POLITICAL ACTION | 1 | $0 | $330,000 | Jeff Merkley |
| CLEARPATH ACTION, INC. | 1 | $322,299 | $0 | Elise Stefanik |
| NORTH DAKOTA STRONG INC | 1 | $320,600 | $0 | John Hoeven |
| LEAGUE OF CONSERVATION VOTERS VICTORY FUND | 1 | $319,383 | $0 | Pete Aguilar |
| AMERICAN ENERGY ACTION FUND | 2 | $308,000 | $0 | James Lankford, John Hoeven |
| COMMON SENSE FOR AMERICA PAC | 1 | $303,194 | $0 | Deb Fischer |
| INDIVISIBLE ACTION | 1 | $0 | $302,147 | Richard Neal |
| ENVIRONMENT AMERICA INC | 2 | $289,614 | $0 | Jack Reed, Martin Heinrich |
| SENATE CONSERVATIVES FUND | 2 | $287,181 | $0 | Bill Hagerty, John Ratcliffe |
| AMERICA'S RENEWAL PAC, INC. | 2 | $0 | $266,000 | Debbie Wasserman Schultz, Debbie Wasserman Schultz |
| RESTORING OUR COMMUNITY | 1 | $264,208 | $0 | Pete Aguilar |
| DEFEND OKLAHOMA VALUES | 1 | $246,000 | $0 | James Lankford |
| WORKING FAMILIES FOR HAWAII | 1 | $241,841 | $0 | Brian Schatz |
| ARIZONANS FOR AFFORDABLE ELECTRICITY | 1 | $0 | $241,764 | Nancy Pelosi |
| STANDING WITH CONSERVATIVES | 1 | $234,485 | $0 | Bill Hagerty |
| NEA FUND FOR CHILDREN AND PUBLIC EDUCATION; THE (FKA NEAPAC) | 1 | $0 | $221,568 | Rick Larsen |
| STARS AND STRIPES FOREVER PAC | 2 | $0 | $218,270 | Sherrod Brown, Maxine Waters |
| FOUNDATION FOR ECONOMIC PROSPERITY INC. | 1 | $216,623 | $0 | James Lankford |
| LATINO VOTE FOR AMERICA PAC | 1 | $214,840 | $0 | Maria Elvira Salazar |
| AMERICAN PRINCIPLES PROJECT PAC | 1 | $0 | $205,000 | Tammy Baldwin |
| KANSAS AG COMMUNITIES COALITION | 1 | $204,877 | $0 | Roger Marshall |
| SIERRA CLUB POLITICAL COMMITTEE | 4 | $84,305 | $119,221 | Gregory Meeks, Debbie Stabenow, Ed Markey |
| EMGAGE FEDERAL POLITICAL ACTION COMMITTEE | 1 | $0 | $200,000 | George Latimer |
| CHANGE NOW | 1 | $0 | $197,825 | Mario Diaz-Balart |
| WORKING FOR US POLITICAL ACTION COMMITTEE INC | 1 | $0 | $167,557 | Ro Khanna |
| ROOSEVELT SOCIETY ACTION | 1 | $0 | $159,783 | Sheldon Whitehouse |
| HUMANE SOCIETY LEGISLATIVE FUND | 1 | $159,553 | $0 | Dianne Feinstein |
| DELIVERING FOR CALIFORNIA | 1 | $150,000 | $0 | Dianne Feinstein |
| PROTECTING OUR VOTE PAC | 1 | $145,280 | $0 | Shontel Brown |
| CALIFORNIANS FOR SACRED SITES PROTECTION | 1 | $144,114 | $0 | Mark Takano |
| AMERICAN CHEMISTRY COUNCIL, INC | 1 | $133,204 | $0 | John Barrasso |
| EMILY'S LIST | 1 | $133,005 | $0 | Amy Klobuchar |
| WINNING RIGHT PAC | 1 | $130,000 | $0 | Bill Hagerty |
| NARAL | 3 | $0 | $128,130 | Adam Smith, Rick Larsen, Adam Schiff |
| HONORING AMERICAN LAW ENFORCEMENT PAC | 1 | $0 | $127,500 | Rashida Tlaib |
| LAW ENFORCEMENT FOR A SAFER AMERICA PAC | 1 | $0 | $127,500 | Rashida Tlaib |
| THE DISABLED VETERANS COALITION PAC | 1 | $125,262 | $0 | Bruce Westerman |
| FLORIDA CONSERVATIVE FUND | 1 | $121,542 | $0 | Matt Gaetz |
| DRAIN THE DC SWAMP PAC | 2 | $73,333 | $48,200 | Pete Buttigieg, Marjorie Taylor Greene |
| FREEDOM'S DEFENSE FUND | 1 | $0 | $119,500 | Frank Pallone |
| BLUEGREEN ALLIANCE | 1 | $108,805 | $0 | Tim Walz |
| POLITICAL ACTION COMMITTEE OF THE AMERICAN ASSOCIATION OF ORTHOPAEDIC SURGEONS | 2 | $103,800 | $0 | Brett Guthrie, John Barrasso |
| NATIONAL COMMITTEE TO PRESERVE SOCIAL SECURITY & MEDICARE PAC | 1 | $102,121 | $0 | Richard Blumenthal |
| POLICE OFFICERS DEFENSE ALLIANCE LLC | 1 | $0 | $100,000 | Nancy Pelosi |
| NATIONAL WILDLIFE FEDERATION ACTION FUND | 1 | $100,000 | $0 | John Hoeven |
| UNITE HERE TIP CAMPAIGN COMMITTEE | 2 | $98,252 | $0 | Bennie Thompson, Bennie Thompson |
| DEFENDING MAIN STREET SUPERPAC INC | 1 | $98,000 | $0 | Shelley Moore Capito |
| CLEAR VOICE MINNESOTA | 1 | $0 | $96,000 | Angie Craig |
| UNITED FOOD AND COMMERCIAL WORKERS INTERNATIONAL UNION ACTIVE BALLOT CLUB | 1 | $94,608 | $0 | Pramila Jayapal |
| CITIZENS AGAINST AIPAC CORRUPTION | 2 | $0 | $90,816 | Debbie Wasserman Schultz, Debbie Wasserman Schultz |
| UNITED FOR COMMON SENSE | 2 | $0 | $88,500 | Debbie Wasserman Schultz, Debbie Wasserman Schultz |
| PROGRESSIVE TURNOUT PROJECT | 1 | $87,327 | $0 | Amy Klobuchar |
| POWERPACPLUS | 1 | $81,401 | $0 | Cory Booker |
| DEMOCRATIC CONGRESSIONAL CAMPAIGN COMMITTEE - EXPENDITURES | 2 | $0 | $80,164 | Rick Larsen, Adam Schiff |
| WFW ACTION FUND, INC. | 1 | $79,662 | $0 | Kay Granger |
| FREETHOUGHT EQUALITY SUPER PAC | 1 | $72,200 | $0 | Jamie Raskin |
| PLANNED PARENTHOOD OF MINNESOTA POLITICAL ACTION FUND | 1 | $70,488 | $0 | Amy Klobuchar |
| AMERICAN CONSERVATIVE UNION | 1 | $68,465 | $0 | Bruce Westerman |
| INTERNATIONAL BROTHERHOOD OF ELECTRICAL WORKERS LOCAL 98 COMMITTEE ON POLITICAL EDUCATION | 2 | $68,350 | $0 | Brendan Boyle, Brendan Boyle |
| FREEDOM CLUB FEDERAL PAC | 1 | $0 | $66,000 | Tim Walz |
| OPPORTUNITY FOR ALL ACTION FUND | 1 | $64,370 | $0 | Joseph Morelle |
| TRINITY PAC | 1 | $0 | $64,118 | Jim Himes |
| LOS ANGELES COUNTY DEMOCRATIC CENTRAL COMMITTEE | 1 | $62,562 | $0 | Maxine Waters |
| UNITED BREAST CANCER SUPPORT PAC | 1 | $57,125 | $0 | Amy Klobuchar |
| FAMILY RESEARCH COUNCIL ACTION POLITICAL ACTION COMMITTEE | 1 | $0 | $54,500 | Frank Pallone |
| TZEDEK PAC | 1 | $52,000 | $0 | Dan Goldman |
| BLUE MAJORITY PROJECT | 1 | $50,853 | $0 | Angie Craig |
| COPS VOTER GUIDE INC. | 1 | $50,000 | $0 | Dianne Feinstein |
| ENGLISH LANGUAGE POLITICAL ACTION COMMITTEE | 1 | $0 | $47,994 | Dianne Feinstein |
| NEW HOUSE PAC | 1 | $47,072 | $0 | Melissa Bean |
| RESOLUTE COURAGE PAC | 1 | $46,152 | $0 | Zoe Lofgren |
| COOPERATIVE OF AMERICAN PHYSICIANS INDEPENDENT EXPENDITURE COMMITTEE | 1 | $45,992 | $0 | Pete Aguilar |
| CITIZEN SUPER PAC | 1 | $0 | $44,721 | Matt Gaetz |
| 27TH CONGRESSIONAL DISTRICT DEMOCRATIC CLUB | 1 | $0 | $44,171 | Adam Schiff |
| COMMONWEALTH COMMUNICATIONS | 2 | $44,016 | $0 | Brendan Boyle, Brendan Boyle |
| NARAL Pro-Choice America | 2 | $44,000 | $0 | Brendan Boyle, Brendan Boyle |
| EQUALITY CALIFORNIA VOTES | 1 | $43,609 | $0 | Pete Buttigieg |
| FRIENDS OF THE EARTH (ACTION) INC | 1 | $40,939 | $0 | Rashida Tlaib |
| CONNECTICUT TAXPAYERS ALLIANCE | 1 | $0 | $40,000 | Jim Himes |
| MIDWEST GROWTH PAC | 1 | $39,950 | $0 | Bryan Steil |
| COMMON SENSE FOR CONNECTICUT | 1 | $0 | $39,058 | Jim Himes |
| NORTH STAR DAWN PAC | 1 | $37,500 | $0 | Angie Craig |
| RURALVOTE.ORG | 2 | $36,907 | $357 | Sherrod Brown, Doug Burgum |
| AFSCME WORKING FAMILIES FUND | 1 | $36,702 | $0 | Amy Klobuchar |
| NATIONAL REPUBLICAN CONGRESSIONAL COMMITTEE EXPENDITURES | 1 | $0 | $35,076 | John Boozman |
| NATIONAL COMMITTEE TO PRESERVE SOCIAL SECURITY PAC | 3 | $0 | $31,971 | Bobby Scott, Ed Markey, Ron Wyden |
| ONE NATION UNITED | 1 | $26,400 | $0 | Dianne Feinstein |
| ASSOCIATED GENERAL CONTRACTORS OF AMERICA POLITICAL ACTION COMMITTEE | 1 | $21,628 | $0 | Sam Graves |
| AMERICAN FEDERATION OF STATE COUNTY & MUNICIPAL EMPLOYEES - P E O P L E, QUALIFIED | 2 | $20,000 | $0 | Bennie Thompson, Bennie Thompson |
| LABORERS' POLITICAL LEAGUE-LABORERS' INTERNATIONAL UNION OF N.A. | 2 | $20,000 | $0 | Bennie Thompson, Bennie Thompson |
| MISSISSIPPI REPUBLICAN PARTY | 1 | $19,442 | $0 | Roger Wicker |
| BLUE AMERICA PAC | 1 | $0 | $19,200 | John Boehner |
| PLANNED PARENTHOOD VOTES NORTHWEST | 1 | $19,132 | $0 | Pramila Jayapal |
| DIRECT SELLING EMPOWERS AMERICANS | 1 | $18,941 | $0 | Gregory Meeks |
| CONSERVATION OHIO | 1 | $18,062 | $0 | Sherrod Brown |
| ELBERT GUILLORY'S AMERICA | 1 | $9,724 | $8,292 | Maxine Waters |
| DREAM UNITED | 1 | $17,667 | $0 | Cory Booker |
| CARE ACTION | 2 | $17,538 | $0 | Barbara Lee, Barbara Lee |
| LET FREEDOM RING INC | 1 | $0 | $14,018 | Chris Coons |
| OHLONE AREA UNITED DEMOCRATIC CAMPAIGN | 1 | $13,246 | $0 | Ro Khanna |
| CARE ACTION NOW INC. | 2 | $11,861 | $0 | Gregory Meeks, Alex Padilla |
| PLANNED PARENTHOOD ACTION FUND OF THE PACIFIC SOUTHWEST PAC | 1 | $11,245 | $0 | Mark Takano |
| KUCINICH ACTION PAC | 2 | $11,046 | $0 | Barbara Lee, Barbara Lee |
| COALITION TO GROW SAN FRANCISCO - GROW SF PAC | 1 | $10,432 | $0 | Alex Padilla |
| PLANNED PARENTHOOD LA ADVOCACY PROJECT | 1 | $0 | $10,023 | Adam Schiff |
| GOOD JOBS AND STRONG COMMUNITIES PAC | 1 | $10,000 | $0 | Sherrod Brown |
| NEA FUND FOR CHILDREN AND PUBLIC EDUCATION | 1 | $10,000 | $0 | Jamie Raskin |
| MADISON PROJECT INC. | 1 | $10,000 | $0 | John Ratcliffe |
| ONEAMERICA VOTES | 1 | $9,956 | $0 | Pramila Jayapal |
| CLEAN UP CONGRESS | 1 | $0 | $9,464 | Rosa DeLauro |
| WOMEN SPEAK OUT PAC | 1 | $0 | $9,200 | Pete Buttigieg |
| MASSACHUSETTS FREEZE VOTER '84 | 1 | $0 | $9,015 | Ed Markey |
| LET AMERICA VOTE PAC | 1 | $8,884 | $0 | Tammy Baldwin |
| PATRIOT VOICES PAC | 1 | $0 | $8,232 | Jack Reed |
| TOGETHER FOR PROGRESS PAC | 2 | $8,180 | $0 | Adam Smith, Maria Cantwell |
| WASHINGTON CITIZENS FOR COLIN POWELL | 1 | $0 | $8,098 | Colin Powell |
| MAYDAY PAC | 1 | $7,717 | $0 | Jamie Raskin |
| NEW JERSEY FAMILY FIRST INC | 1 | $0 | $7,681 | Frank Pallone |
| FOCUS ON THE FAMILY ACTION | 1 | $0 | $7,681 | Frank Pallone |
| AMERICAN WORKER INC, THE | 1 | $7,540 | $0 | Chris Coons |
| MAD DOG PAC | 1 | $0 | $7,527 | Steve Scalise |
| LABORERS' POLITICAL LEAGUE-LABORERS' INTERNATIONAL UNION OF NA | 1 | $0 | $7,500 | Debbie Stabenow |
| DREAM DEFENDERS FIGHT PAC | 2 | $0 | $7,032 | Pete Buttigieg, Cory Booker |
| NARAL PRO-CHOICE AMERICA | 2 | $6,760 | $0 | Bennie Thompson, Bennie Thompson |
| COURAGE CALIFORNIA SUPER PAC | 3 | $6,677 | $0 | Barbara Lee, Barbara Lee, Zoe Lofgren |
| THE NATIONAL REPUBLICAN TRUST PAC | 1 | $0 | $6,615 | Chris Coons |
| PUGET SOUND ENERGY INC PAC FOR GOOD GOVERNMENT | 1 | $6,577 | $0 | Adam Smith |
| SIERRA CLUB INDEPENDENT ACTION | 3 | $6,515 | $0 | Bobby Scott, Dan Goldman, Ed Markey |
| HE'S GOTTA GO PAC | 1 | $1,750 | $4,715 | Ro Khanna |
| VICTORY FOR SCHAUMBURG | 1 | $0 | $6,171 | Raja Krishnamoorthi |
| THE 60 PLUS ASSOCIATION | 1 | $0 | $6,122 | Adam Smith |
| CT WORKING FAMILIES FEDERAL PAC D/B/A TAKE BACK CONGRESS CT | 1 | $5,075 | $0 | Rosa DeLauro |
| PROTECT THE VOTE | 1 | $5,000 | $0 | Tammy Baldwin |
| REALLY AMERICAN PAC | 1 | $0 | $5,000 | Ron Johnson |
| THE COMMITTEE TO DEFEND THE PRESIDENT | 1 | $5,000 | $0 | John Ratcliffe |
| UNITED WE CAN | 1 | $4,631 | $0 | Bobby Scott |
| DEMOCRATIC PARTY OF VIRGINIA | 1 | $4,606 | $0 | Bobby Scott |
| TOGETHER WE THRIVE | 6 | $3,750 | $750 | Barbara Lee, Barbara Lee, Bobby Scott |
| MID-AMERICA CONSERVATIVE POLITICAL ACTION COMMITTEE | 1 | $0 | $4,496 | Rosa DeLauro |
| INTERNATIONAL LONGSHORE AND WAREHOUSE UNION -- POLITICAL ACTION FUND | 2 | $4,463 | $0 | Brian Schatz, Bernie Sanders |
| ACTIVATE AMERICA | 1 | $0 | $4,333 | Roger Williams |
| FLIP THE WEST | 1 | $0 | $4,333 | Roger Williams |
| REVERE AMERICA | 1 | $4,298 | $0 | Rick Crawford |
| ALHAMBRA DEMOCRATIC CLUB | 1 | $0 | $3,577 | Adam Schiff |
| AMERICANS FOR JOB SECURITY | 1 | $3,227 | $0 | Rick Crawford |
| ALICE B. TOKLAS LGBTQ DEMOCRATIC CLUB FEDERAL PAC | 1 | $3,129 | $0 | Alex Padilla |
| HUMANEUSA POLITICAL ACTION COMMITTEE | 1 | $0 | $2,799 | Maria Cantwell |
| PLANNED PARENTHOOD NW ACTION PAC | 1 | $2,799 | $0 | Maria Cantwell |
| NATIONAL RIGHT TO LIFE VICTORY FUND | 2 | $2,502 | $0 | Mark Green, John Thune |
| SANDRE SWANSON FOR ASSEMBLY 2010 | 2 | $2,488 | $0 | Barbara Lee, Barbara Lee |
| HEALTH JUSTICE FOR ALL | 1 | $2,417 | $0 | Mark Warner |
| HUNTER ACTION FUND (HAF) | 1 | $1,857 | $0 | Steve Scalise |
| SAN BENITO COUNTY DEMOCRATIC CENTRAL COMMITTEE | 1 | $1,795 | $0 | Zoe Lofgren |
| OPPORTUNITY PAC - A COALITION OF TEACHERS HEALTH CARE GIVERS FACULTY MEMBERS SCHOOL EMPLOYEES AND PUBLIC AND PR | 1 | $1,772 | $0 | Zoe Lofgren |
| COMMITTEE FOR DEFENDING AMERICAN VALUES | 1 | $1,715 | $0 | Roger Williams |
| PENNSYLVANIA PRO-LIFE FEDERATION PAC | 1 | $1,635 | $0 | Glenn Thompson |
| DEMOCRATIC ALLIANCE FOR ACTION | 1 | $1,550 | $0 | Alex Padilla |
| CLIMATE HAWKS VOTE | 1 | $1,500 | $0 | Brian Schatz |
| DOLORES HUERTA ACTION FUND | 1 | $1,449 | $0 | Alex Padilla |
| KNIGHT, MARILYN | 1 | $0 | $1,232 | Maria Cantwell |
| MISLOVE, ALAN EDWARD | 2 | $1,117 | $0 | Michael Bennet, Tom Steyer |
| ZB, N.A. DBA AMEGY BANK PAC | 1 | $1,000 | $0 | Roger Williams |
| SOUTHERN STATES POLICE BENEVOLENT ASSOC PAC FUND | 1 | $984 | $0 | Bobby Scott |
| PLANNED PARENTHOOD VOTES | 5 | $762 | $0 | Gregory Meeks, Jamie Raskin, Joseph Morelle |
| SENIOR POLITICAL ACTION COMMITTEE  (WASH D.C.) | 1 | $0 | $679 | Ron Wyden |
| MICHIGAN REPUBLICAN PARTY | 1 | $0 | $597 | Bill Clinton |
| PERFORMANCE RACING INC. | 1 | $500 | $0 | Markwayne Mullin |
| KANSANS FOR LIFE POLITICAL ACTION COMMITTEE | 1 | $0 | $223 | Jerry Moran |
| RIGHT TO LIFE OF MICHIGAN POLITICAL ACTION COMMITTEE | 1 | $0 | $174 | Debbie Stabenow |
| PLANNED PARENTHOOD ADVOCATES OF KANSAS | 1 | $0 | $120 | Jerry Moran |
| POLITICAL ACTION FOR LASTING SECURITY | 1 | $0 | $80 | Ron Wyden |
| TRANSPORTATION POLITICAL EDUCATION LEAGUE | 2 | $0 | $77 | Maria Cantwell, Bernie Sanders |
| ALLIANCE COAL, LLC PAC | 1 | $69 | $0 | James Comer |
| CAMPAIGN FOR WORKING FAMILIES | 1 | $0 | $66 | Jack Reed |
| INTERNATIONAL ASSOCIATION OF FIREFIGHTERS INTERESTED IN REGISTRATION AND EDUCATION PAC | 1 | $0 | $21 | Bernie Sanders |
| PLANNED PARENTHOOD OF KS & MID-MO | 1 | $0 | $7 | Jerry Moran |
| PUTTING PEOPLE FIRST POLITICAL ACTION COMMITTEE | 1 | $0 | $5 | Bernie Sanders |
