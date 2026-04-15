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

---

## Stub profile candidates (top 298 by $ volume)

Enriched via FEC OpenFEC API on 2026-04-15. These committees have been confirmed to exist in the FEC database. Each is a candidate for a stub profile in `content/Donors & Power Networks/Super PACs/` or similar. Build stubs in the order of dollar volume to maximize vault coverage efficiency.

| Committee (as in FEC body data) | FEC ID | Canonical name | Designation | Support $ | Oppose $ | Candidates / Connected org |
|---|---|---|---|---|---|---|
| FOOD AND WATER ACTION | [C00801910](https://www.fec.gov/data/committee/C00801910/) | FOOD AND WATER ACTION PAC | Unauthorized | $1,026,511,866 | $0 | — |
| WINSENATE | [C00865444](https://www.fec.gov/data/committee/C00865444/) | WINSENATE | Unauthorized | $12,170,854 | $145,576,184 | — |
| SFA FUND, INC | [C00828061](https://www.fec.gov/data/committee/C00828061/) | SFA FUND, INC | Unauthorized | $65,502,351 | $46,974,966 | — |
| DEFEND AMERICAN JOBS | [C00836221](https://www.fec.gov/data/committee/C00836221/) | DEFEND AMERICAN JOBS | Unauthorized | $81,072,918 | $0 | — |
| RESTORATION PAC | [C00571588](https://www.fec.gov/data/committee/C00571588/) | RESTORATION OF AMERICA PAC | Unauthorized | $0 | $47,848,182 | — |
| RESTORE OUR FUTURE, INC. | [C00490045](https://www.fec.gov/data/committee/C00490045/) | RESTORE OUR FUTURE, INC. | Lobbyist/Registrant PAC | $47,498,530 | $0 | — |
| BEST OF AMERICA PAC | [C00842344](https://www.fec.gov/data/committee/C00842344/) | BEST OF AMERICA PAC | Unauthorized | $37,448,046 | $0 | — |
| AMERICA LEADS | [C00573055](https://www.fec.gov/data/committee/C00573055/) | AMERICA LEADS | Unauthorized | $35,391,631 | $0 | — |
| WINNING OUR FUTURE | [C00507525](https://www.fec.gov/data/committee/C00507525/) | WINNING OUR FUTURE | Unauthorized | $4,344,542 | $30,837,440 | — |
| RBG PAC | [C00891291](https://www.fec.gov/data/committee/C00891291/) | RBG PAC | Unauthorized | $34,600,000 | $0 | — |
| AB PAC | [C00492140](https://www.fec.gov/data/committee/C00492140/) | AB PAC | Unauthorized | $0 | $33,935,549 | — |
| RETIRE CAREER POLITICIANS | [C00876482](https://www.fec.gov/data/committee/C00876482/) | RETIRE CAREER POLITICIANS | Unauthorized | $15,753,725 | $13,725,456 | — |
| CROSSROADS GRASSROOTS POLICY STRATEGIES | [C30001655](https://www.fec.gov/data/committee/C30001655/) | CROSSROADS GRASSROOTS POLICY STRATEGIES | Unauthorized | $0 | $24,760,798 | — |
| AMERICANS FOR RESPONSIBLE LEADERSHIP | [C00615088](https://www.fec.gov/data/committee/C00615088/) | AMERICANS UNITED FOR RESPONSIBLE LEADERSHIP | Unauthorized | $19,267,130 | $0 | — |
| FIGHT RIGHT INC | [C00857011](https://www.fec.gov/data/committee/C00857011/) | FIGHT RIGHT INC | Unauthorized | $0 | $18,881,648 | — |
| BUCKEYE VALUES PAC | [C00834630](https://www.fec.gov/data/committee/C00834630/) | BUCKEYE VALUES PAC | Unauthorized | $0 | $12,774,928 | — |
| HMP | [C00495028](https://www.fec.gov/data/committee/C00495028/) | HMP | Unauthorized | $0 | $11,742,125 | — |
| TEXAS CONSERVATIVES FUND | [C00510941](https://www.fec.gov/data/committee/C00510941/) | TEXAS CONSERVATIVES FUND | Unauthorized | $0 | $11,020,000 | — |
| THE SENTINEL ACTION FUND | [C00811166](https://www.fec.gov/data/committee/C00811166/) | THE SENTINEL ACTION FUND | Unauthorized | $0 | $10,655,338 | — |
| VOTEVETS | [C00418897](https://www.fec.gov/data/committee/C00418897/) | VOTEVETS | Unauthorized | $10,488,111 | $0 | — |
| ESAFUND | [C00489856](https://www.fec.gov/data/committee/C00489856/) | ESAFUND | Unauthorized | $1,618,867 | $8,374,056 | — |
| AMERICANS FOR TOMORROW'S FUTURE | [C00741009](https://www.fec.gov/data/committee/C00741009/) | AMERICANS FOR TOMORROW'S FUTURE | Unauthorized | $0 | $9,934,794 | — |
| TEXANS FOR A CONSERVATIVE MAJORITY | [C00542217](https://www.fec.gov/data/committee/C00542217/) | TEXANS FOR A CONSERVATIVE MAJORITY | Unauthorized | $9,787,637 | $0 | — |
| PUT UTAH FIRST PAC | [C00792259](https://www.fec.gov/data/committee/C00792259/) | PUT UTAH FIRST PAC | Unauthorized | $0 | $8,940,890 | — |
| EVERGREEN PRINCIPLES PAC | [C00819664](https://www.fec.gov/data/committee/C00819664/) | EVERGREEN PRINCIPLES PAC | Unauthorized | $0 | $8,581,846 | — |
| ALABAMA CHRISTIAN CONSERVATIVES | [C00782656](https://www.fec.gov/data/committee/C00782656/) | ALABAMA CHRISTIAN CONSERVATIVES (ACC) | Unauthorized | $7,601,554 | $0 | — |
| CONSERVATIVE SOLUTIONS PAC | [C00541292](https://www.fec.gov/data/committee/C00541292/) | CONSERVATIVE SOLUTIONS PAC | Unauthorized | $0 | $6,643,036 | — |
| TRUTH AND COURAGE PAC | [C00796045](https://www.fec.gov/data/committee/C00796045/) | TRUTH AND COURAGE PAC | Unauthorized | $6,598,631 | $0 | — |
| BUCKEYE LEADERSHIP FUND, INC. | [C00790923](https://www.fec.gov/data/committee/C00790923/) | BUCKEYE LEADERSHIP FUND, INC. | Unauthorized | $0 | $6,577,836 | — |
| ALABAMA CONSERVATIVES FUND | [C00786152](https://www.fec.gov/data/committee/C00786152/) | ALABAMA CONSERVATIVES FUND | Unauthorized | $6,460,099 | $0 | — |
| TELL IT LIKE IT IS PAC | [C00841593](https://www.fec.gov/data/committee/C00841593/) | TELL IT LIKE IT IS PAC | Unauthorized | $5,854,979 | $0 | — |
| 314 ACTION FUND | [C00633248](https://www.fec.gov/data/committee/C00633248/) | 314 ACTION FUND | Unauthorized | $0 | $5,775,346 | — |
| CONNECTICUT PATRIOTS PAC | [C00804773](https://www.fec.gov/data/committee/C00804773/) | CONNECTICUT PATRIOTS PAC | Unauthorized | $0 | $5,702,166 | — |
| MAJORITY PAC | [C00428052](https://www.fec.gov/data/committee/C00428052/) | MAJORITY COMMITTEE PAC--MC PAC | Leadership PAC | $0 | $5,478,958 | — |
| SOUTH CAROLINA PATRIOTS PAC | [C00872085](https://www.fec.gov/data/committee/C00872085/) | SOUTH CAROLINA PATRIOTS PAC | Unauthorized | $0 | $4,988,211 | — |
| 1820 PAC | [C00698126](https://www.fec.gov/data/committee/C00698126/) | 1820 PAC | Unauthorized | $4,805,828 | $0 | — |
| TEXAS FOREVER | [C00689919](https://www.fec.gov/data/committee/C00689919/) | TEXAS FOREVER | Unauthorized | $0 | $4,600,814 | — |
| AMERICA FIRST POLICIES INC. | [C30002778](https://www.fec.gov/data/committee/C30002778/) | AMERICA FIRST POLICIES INC. | Unauthorized | $0 | $4,339,970 | — |
| FLORIDA PATRIOTS PAC | [C00881474](https://www.fec.gov/data/committee/C00881474/) | FLORIDA PATRIOTS PAC | Unauthorized | $0 | $4,243,279 | — |
| MAINSTREAM DEMOCRATS PAC | [C00804823](https://www.fec.gov/data/committee/C00804823/) | MAINSTREAM DEMOCRATS PAC | Unauthorized | $2,927,408 | $1,295,393 | — |
| PROTECT FREEDOM POLITICAL ACTION COMMITTEE | [C00657866](https://www.fec.gov/data/committee/C00657866/) | PROTECT FREEDOM POLITICAL ACTION COMMITTEE | Unauthorized | $1,730,000 | $2,301,252 | — |
| NOW OR NEVER PAC | [C00513432](https://www.fec.gov/data/committee/C00513432/) | NOW OR NEVER PAC | Unauthorized | $0 | $3,992,413 | — |
| FUTURE45 | [C00574533](https://www.fec.gov/data/committee/C00574533/) | FUTURE45 | Unauthorized | $0 | $3,825,473 | — |
| HEARTLAND RESURGENCE | [C00544551](https://www.fec.gov/data/committee/C00544551/) | HEARTLAND RESURGENCE | Unauthorized | $0 | $3,787,060 | — |
| FREEDOMWORKS FOR AMERICA | [C00499020](https://www.fec.gov/data/committee/C00499020/) | FREEDOMWORKS FOR AMERICA | Unauthorized | $30,511 | $3,649,440 | — |
| NATIONAL VICTORY ACTION FUND | [C00760124](https://www.fec.gov/data/committee/C00760124/) | NATIONAL VICTORY ACTION FUND | Unauthorized | $3,515,000 | $0 | — |
| UNITED DEMOCRACY PROJECT (UDP) | [C00799031](https://www.fec.gov/data/committee/C00799031/) | UNITED DEMOCRACY PROJECT ('UDP') | Unauthorized | $223,200 | $3,205,379 | — |
| WORKING FAMILIES PARTY PAC | [C00606962](https://www.fec.gov/data/committee/C00606962/) | WORKING FAMILIES PARTY PAC | Unauthorized | $1,610,370 | $1,741,195 | — |
| AMERICAN DREAM FEDERAL ACTION | [C00809020](https://www.fec.gov/data/committee/C00809020/) | AMERICAN DREAM FEDERAL ACTION | Unauthorized | $3,310,471 | $0 | — |
| LIBERTY CHAMPIONS | [C00777334](https://www.fec.gov/data/committee/C00777334/) | LIBERTY CHAMPIONS | Unauthorized | $3,213,782 | $0 | — |
| END THE GRIDLOCK | [C00519595](https://www.fec.gov/data/committee/C00519595/) | END THE GRIDLOCK | Unauthorized | $0 | $3,197,722 | — |
| AMERICANS FOR COMMON SENSE (AFCS) | [C00562413](https://www.fec.gov/data/committee/C00562413/) | AMERICANS FOR COMMON SENSE | Unauthorized | $0 | $3,160,436 | — |
| SAVE OUR COUNTRY | [C00877787](https://www.fec.gov/data/committee/C00877787/) | SAVE OUR COUNTRY | Unauthorized | $3,100,000 | $0 | — |
| PROTECT OUR FUTURE PAC | [C00801514](https://www.fec.gov/data/committee/C00801514/) | PROTECT OUR FUTURE PAC | Unauthorized | $3,031,156 | $0 | — |
| PATRIOT MAJORITY PAC | [C00469890](https://www.fec.gov/data/committee/C00469890/) | PATRIOT MAJORITY PAC | Unauthorized | $2,736,988 | $0 | — |
| TEXAS FORWARD | [C00731794](https://www.fec.gov/data/committee/C00731794/) | TEXAS FORWARD | Unauthorized | $0 | $2,373,536 | — |
| CONSERVATIVE OUTSIDER PAC INC | [C00748475](https://www.fec.gov/data/committee/C00748475/) | CONSERVATIVE OUTSIDER PAC INC | Unauthorized | $0 | $2,272,673 | — |
| SEIU COPE (SERVICE EMPLOYEES INTERNATIONAL UNION COMMITTEE ON POLITICAL EDUCATION) | [C00004036](https://www.fec.gov/data/committee/C00004036/) | SEIU COPE (SERVICE EMPLOYEES INTERNATIONAL UNION COMMITTEE ON POLITICAL EDUCATION) | Lobbyist/Registrant PAC | $2,132,995 | $106,057 | — |
| FREEDOM PARTNERS ACTION FUND INC | [C00564765](https://www.fec.gov/data/committee/C00564765/) | FREEDOM PARTNERS ACTION FUND, INC. | Unauthorized | $0 | $2,028,031 | — |
| CONSERVATIVE OUTSIDER PAC | [C00748475](https://www.fec.gov/data/committee/C00748475/) | CONSERVATIVE OUTSIDER PAC INC | Unauthorized | $0 | $1,936,000 | — |
| HIGH PLAINS PAC | [C00875039](https://www.fec.gov/data/committee/C00875039/) | HIGH PLAINS PAC | Unauthorized | $1,894,880 | $0 | — |
| UNITED WE WIN SUPER PAC | [C00726208](https://www.fec.gov/data/committee/C00726208/) | UNITED WE WIN SUPER PAC | Unauthorized | $1,873,487 | $0 | — |
| AMERICA 360 COMMITTEE | [C00520411](https://www.fec.gov/data/committee/C00520411/) | AMERICA 360 COMMITTEE | Unauthorized | $0 | $1,693,306 | — |
| INDEPENDENT LEADERSHIP FOR NEW HAMPSHIRE PAC | [C00562405](https://www.fec.gov/data/committee/C00562405/) | INDEPENDENT LEADERSHIP FOR NEW HAMPSHIRE PAC | Unauthorized | $0 | $1,656,880 | — |
| AMERICAS PAC | [C00559906](https://www.fec.gov/data/committee/C00559906/) | AMERICAS PAC | Unauthorized | $0 | $1,573,351 | — |
| CENTER FORWARD COMMITTEE | [C00568444](https://www.fec.gov/data/committee/C00568444/) | CENTER FORWARD COMMITTEE | Lobbyist/Registrant PAC | $1,564,500 | $0 | — |
| RAILROADERS FOR PUBLIC SAFETY | [C00854893](https://www.fec.gov/data/committee/C00854893/) | RAILROADERS FOR PUBLIC SAFETY | Unauthorized | $1,520,000 | $0 | — |
| INDEPENDENCE USA PAC | [C00532705](https://www.fec.gov/data/committee/C00532705/) | INDEPENDENCE USA PAC | Unauthorized | $1,465,072 | $0 | — |
| COUNCIL FOR AMERICAN JOB GROWTH | [C90015090](https://www.fec.gov/data/committee/C90015090/) | COUNCIL FOR AMERICAN JOB GROWTH | Unauthorized | $1,401,341 | $0 | — |
| BUILDING A BETTER PA | [C00559781](https://www.fec.gov/data/committee/C00559781/) | BUILDING A BETTER PA | Unauthorized | $1,392,138 | $0 | — |
| SERVICE EMPLOYEES INTERNATIONAL UNION COMMITTEE ON POLITICAL EDUCATION (SEIU COPE) | [C00004036](https://www.fec.gov/data/committee/C00004036/) | SEIU COPE (SERVICE EMPLOYEES INTERNATIONAL UNION COMMITTEE ON POLITICAL EDUCATION) | Lobbyist/Registrant PAC | $1,378,458 | $0 | — |
| LIVING UNITED FOR CHANGE IN ARIZONA | [C90018169](https://www.fec.gov/data/committee/C90018169/) | LIVING UNITED FOR CHANGE IN ARIZONA | Unauthorized | $1,214,021 | $135,590 | — |
| MINNESOTA DEMOCRATIC-FARMER-LABOR PARTY | [C00025254](https://www.fec.gov/data/committee/C00025254/) | MINNESOTA DEMOCRATIC-FARMER-LABOR PARTY | Unauthorized | $1,293,926 | $0 | — |
| VIGOP (VIRGIN ISLANDS REPUBLICAN PARTY) | [C00553560](https://www.fec.gov/data/committee/C00553560/) | VIGOP (VIRGIN ISLANDS REPUBLICAN PARTY) | Unauthorized | $9,090 | $1,210,936 | — |
| EVERYTOWN FOR GUN SAFETY VICTORY FUND (EVERYTOWN VICTORY FUND) | [C00688655](https://www.fec.gov/data/committee/C00688655/) | EVERYTOWN FOR GUN SAFETY VICTORY FUND (EVERYTOWN VICTORY FUND) | Unauthorized | $0 | $1,098,954 | — |
| SOUTH FLORIDA RESIDENTS FIRST | [C00733402](https://www.fec.gov/data/committee/C00733402/) | SOUTH FLORIDA RESIDENTS FIRST | Unauthorized | $1,071,310 | $0 | — |
| THE MOBILIZATION PROJECT | [C00546911](https://www.fec.gov/data/committee/C00546911/) | THE MOBILIZATION PROJECT | Unauthorized | $1,064,894 | $0 | — |
| THE DEMOCRATIC ACTION PAC | [C00764977](https://www.fec.gov/data/committee/C00764977/) | THE DEMOCRATIC ACTION PAC | Unauthorized | $465,000 | $545,000 | — |
| WFP IE COMMITTEE | [C00626861](https://www.fec.gov/data/committee/C00626861/) | WFP IE COMMITTEE | Unauthorized | $992,581 | $0 | — |
| AMERICAN HOSPITAL ASSOCIATION PAC | [C00106146](https://www.fec.gov/data/committee/C00106146/) | AMERICAN HOSPITAL ASSOCIATION PAC | Lobbyist/Registrant PAC | $957,290 | $0 | — |
| REPUBLICAN CAMPAIGN COMMITTEE OF NEW MEXICO | [C00020818](https://www.fec.gov/data/committee/C00020818/) | REPUBLICAN CAMPAIGN COMMITTEE OF NEW MEXICO | Unauthorized | $0 | $930,000 | — |
| SLF PAC | [C00571703](https://www.fec.gov/data/committee/C00571703/) | SLF PAC | Unauthorized | $911,323 | $0 | — |
| FIRST AMENDMENT ALLIANCE | [C30001432](https://www.fec.gov/data/committee/C30001432/) | FIRST AMENDMENT ALLIANCE INC | Unauthorized | $0 | $902,690 | — |
| NORTH FLORIDA NEIGHBORS | [C00582312](https://www.fec.gov/data/committee/C00582312/) | NORTH FLORIDA NEIGHBORS | Unauthorized | $869,566 | $0 | — |
| EDF ACTION VOTES | [C00707844](https://www.fec.gov/data/committee/C00707844/) | EDF ACTION VOTES | Unauthorized | $0 | $795,808 | — |
| COMMONWEALTH UNITY FUND | [C00875856](https://www.fec.gov/data/committee/C00875856/) | COMMONWEALTH UNITY FUND | Unauthorized | $0 | $785,000 | — |
| NO LABELS ACTION, INC. | [C00680983](https://www.fec.gov/data/committee/C00680983/) | NO LABELS ACTION, INC. | Unauthorized | $773,284 | $0 | — |
| OKLAHOMANS FOR A CONSERVATIVE FUTURE INC | [C90014739](https://www.fec.gov/data/committee/C90014739/) | OKLAHOMANS FOR A CONSERVATIVE FUTURE INC | Unauthorized | $0 | $766,330 | — |
| TAKEACTION MN FEDERAL FUND | [C00738815](https://www.fec.gov/data/committee/C00738815/) | TAKEACTION MN FEDERAL FUND | Unauthorized | $751,218 | $0 | — |
| CALIFORNIANS FOR INNOVATION | [C00566679](https://www.fec.gov/data/committee/C00566679/) | CALIFORNIANS FOR INNOVATION | Unauthorized | $745,467 | $0 | — |
| NEW YORK 2014 | [C00563171](https://www.fec.gov/data/committee/C00563171/) | NEW YORK 2014 | Unauthorized | $744,532 | $0 | — |
| PROTECT PROGRESS | [C00848440](https://www.fec.gov/data/committee/C00848440/) | PROTECT PROGRESS | Unauthorized | $739,093 | $0 | — |
| EQUALITY PROJECT PAC | [C00785899](https://www.fec.gov/data/committee/C00785899/) | EQUALITY PROJECT PAC | Unauthorized | $736,517 | $0 | — |
| COLORADO UNITED PAC | [C00826412](https://www.fec.gov/data/committee/C00826412/) | COLORADO UNITED PAC | Unauthorized | $0 | $720,000 | — |
| FIGHT CORPORATE MONOPOLIES | [C00825836](https://www.fec.gov/data/committee/C00825836/) | FIGHT CORPORATE MONOPOLIES PAC | Unauthorized | $0 | $650,000 | — |
| THE TEA PARTY LEADERSHIP FUND | [C00520825](https://www.fec.gov/data/committee/C00520825/) | THE TEA PARTY LEADERSHIP FUND | Unauthorized | $0 | $553,540 | — |
| AMERICAN FEDERATION OF STATE COUNTY & MUNICIPAL EMPLOYEES  P E O P L E | [C00011114](https://www.fec.gov/data/committee/C00011114/) | AMERICAN FEDERATION OF STATE COUNTY & MUNICIPAL EMPLOYEES  P E O P L E | Lobbyist/Registrant PAC | $0 | $518,043 | — |
| NEW PROSPERITY FOUNDATION; THE | [C00488494](https://www.fec.gov/data/committee/C00488494/) | NEW PROSPERITY FOUNDATION; THE | Unauthorized | $0 | $517,710 | — |
| AMERICAN PRINCIPLES FUND | [C00527804](https://www.fec.gov/data/committee/C00527804/) | AMERICAN PRINCIPLES FUND | Unauthorized | $0 | $511,500 | — |
| PLANNED PARENTHOOD ACTION FUND INC | [C00314617](https://www.fec.gov/data/committee/C00314617/) | PLANNED PARENTHOOD ACTION FUND INC PAC, DBA PLANNED PARENTHOOD FEDERAL PAC | Lobbyist/Registrant PAC | $495,427 | $6 | — |
| AMERICAN COLLEGE OF RADIOLOGY ASSOCIATION PAC | [C00343459](https://www.fec.gov/data/committee/C00343459/) | AMERICAN COLLEGE OF RADIOLOGY ASSOCIATION PAC | Lobbyist/Registrant PAC | $482,794 | $0 | — |
| HOUSE LIBERTY PROJECT | [C00620369](https://www.fec.gov/data/committee/C00620369/) | HOUSE LIBERTY PROJECT | Unauthorized | $0 | $479,599 | — |
| CITIZENS FOR RESPONSIBLE ENERGY SOLUTIONS INC. | [C00553974](https://www.fec.gov/data/committee/C00553974/) | CITIZENS FOR RESPONSIBLE ENERGY SOLUTIONS INC PAC (CRES PAC) | Lobbyist/Registrant PAC | $459,847 | $0 | — |
| LEADERSHIP NOW | [C00807321](https://www.fec.gov/data/committee/C00807321/) | LEADERSHIP NOW PAC | Unauthorized | $0 | $446,250 | — |
| CONGRESSIONAL PROGRESSIVE CAUCUS PAC | [C00513176](https://www.fec.gov/data/committee/C00513176/) | CONGRESSIONAL PROGRESSIVE CAUCUS PAC | Unauthorized | $437,462 | $0 | — |
| CLEARPATH ACTION FUND, INC. | [C00608943](https://www.fec.gov/data/committee/C00608943/) | CLEARPATH ACTION FUND, INC. | Unauthorized | $437,125 | $0 | — |
| GIFFORDS PAC | [C00540443](https://www.fec.gov/data/committee/C00540443/) | GIFFORDS PAC | Unauthorized | $0 | $415,200 | — |
| VOTER PROTECTION PROJECT | [C00767632](https://www.fec.gov/data/committee/C00767632/) | AMERICAN VOTER PROTECTION PROJECT | Unauthorized | $414,621 | $0 | — |
| HUMAN RIGHTS CAMPAIGN EQUALITY VOTES | [C00508440](https://www.fec.gov/data/committee/C00508440/) | HUMAN RIGHTS CAMPAIGN EQUALITY VOTES PAC | Unauthorized | $412,621 | $0 | — |
| NATIONAL NURSES UNITED FOR PATIENT PROTECTION | [C00490375](https://www.fec.gov/data/committee/C00490375/) | NATIONAL NURSES UNITED FOR PATIENT PROTECTION | Lobbyist/Registrant PAC | $405,610 | $0 | — |
| KANSAS FARMERS FUND | [C00686246](https://www.fec.gov/data/committee/C00686246/) | KANSAS FARMERS FUND | Unauthorized | $0 | $374,565 | — |
| AMERICAN COMMITMENT ACTION FUND | [C00547265](https://www.fec.gov/data/committee/C00547265/) | AMERICAN COMMITMENT ACTION FUND | Unauthorized | $0 | $371,600 | — |
| PEOPLE'S MAJORITY | [C00486878](https://www.fec.gov/data/committee/C00486878/) | PEOPLE'S MAJORITY | Unauthorized | $0 | $366,331 | — |
| CLUB FOR GROWTH INC PAC | [C00346536](https://www.fec.gov/data/committee/C00346536/) | CITIZENS CLUB FOR GROWTH INC PAC | Unauthorized | $365,646 | $0 | — |
| CENTRAL COAST VALUES PAC | [C00870204](https://www.fec.gov/data/committee/C00870204/) | CENTRAL COAST VALUES PAC | Unauthorized | $349,671 | $0 | — |
| FREEDOM VOTE | [C00756684](https://www.fec.gov/data/committee/C00756684/) | USA VOTE FOR FREEDOM ORGANIZATION SUPER PAC, INC | Unauthorized | $342,178 | $0 | — |
| CHC BOLD PAC | [C00365536](https://www.fec.gov/data/committee/C00365536/) | CHC BOLD PAC | Unauthorized | $336,876 | $0 | — |
| AMERICAN FUTURE FUND POLITICAL ACTION | [C00449926](https://www.fec.gov/data/committee/C00449926/) | AMERICAN FUTURE FUND POLITICAL ACTION | Unauthorized | $0 | $330,000 | — |
| CLEARPATH ACTION, INC. | [C00608943](https://www.fec.gov/data/committee/C00608943/) | CLEARPATH ACTION FUND, INC. | Unauthorized | $322,299 | $0 | — |
| NORTH DAKOTA STRONG INC | [C00826271](https://www.fec.gov/data/committee/C00826271/) | NORTH DAKOTA STRONG INC | Unauthorized | $320,600 | $0 | — |
| AMERICAN ENERGY ACTION FUND | [C00760082](https://www.fec.gov/data/committee/C00760082/) | AMERICAN ENERGY ACTION FUND | Unauthorized | $308,000 | $0 | — |
| COMMON SENSE FOR AMERICA PAC | [C00634774](https://www.fec.gov/data/committee/C00634774/) | COMMON SENSE FOR AMERICA PAC | Leadership PAC | $303,194 | $0 | — |
| INDIVISIBLE ACTION | [C00678839](https://www.fec.gov/data/committee/C00678839/) | INDIVISIBLE ACTION | Unauthorized | $0 | $302,147 | — |
| ENVIRONMENT AMERICA INC | [C00442020](https://www.fec.gov/data/committee/C00442020/) | ENVIRONMENT AMERICA INC. VOTER ACTION (ABBV. 'ENVIRONMENT AMERICA VOTER ACTION') | Unauthorized | $289,614 | $0 | — |
| SENATE CONSERVATIVES FUND | [C00448696](https://www.fec.gov/data/committee/C00448696/) | SENATE CONSERVATIVES FUND | Unauthorized | $287,181 | $0 | — |
| AMERICA'S RENEWAL PAC, INC. | [C00902106](https://www.fec.gov/data/committee/C00902106/) | AMERICA'S RENEWAL PAC, INC. | Unauthorized | $0 | $266,000 | — |
| RESTORING OUR COMMUNITY | [C00520130](https://www.fec.gov/data/committee/C00520130/) | RESTORING OUR COMMUNITY | Unauthorized | $264,208 | $0 | — |
| DEFEND OKLAHOMA VALUES | [C00784876](https://www.fec.gov/data/committee/C00784876/) | DEFEND OKLAHOMA VALUES | Unauthorized | $246,000 | $0 | — |
| WORKING FAMILIES FOR HAWAII | [C00490193](https://www.fec.gov/data/committee/C00490193/) | WORKING FAMILIES FOR HAWAII | Unauthorized | $241,841 | $0 | — |
| ARIZONANS FOR AFFORDABLE ELECTRICITY | [C90018292](https://www.fec.gov/data/committee/C90018292/) | ARIZONANS FOR AFFORDABLE ELECTRICITY | Unauthorized | $0 | $241,764 | — |
| STANDING WITH CONSERVATIVES | [C00750505](https://www.fec.gov/data/committee/C00750505/) | STANDING WITH CONSERVATIVES | Unauthorized | $234,485 | $0 | — |
| STARS AND STRIPES FOREVER PAC | [C00635243](https://www.fec.gov/data/committee/C00635243/) | STARS AND STRIPES FOREVER PAC | Unauthorized | $0 | $218,270 | — |
| FOUNDATION FOR ECONOMIC PROSPERITY INC. | [C90014879](https://www.fec.gov/data/committee/C90014879/) | FOUNDATION FOR ECONOMIC PROSPERITY INC. | Unauthorized | $216,623 | $0 | — |
| LATINO VOTE FOR AMERICA PAC | [C00742130](https://www.fec.gov/data/committee/C00742130/) | LATINO VOTE FOR AMERICA PAC | Unauthorized | $214,840 | $0 | — |
| AMERICAN PRINCIPLES PROJECT PAC | [C00544387](https://www.fec.gov/data/committee/C00544387/) | AMERICAN PRINCIPLES PROJECT PAC | Unauthorized | $0 | $205,000 | — |
| KANSAS AG COMMUNITIES COALITION | [C00569582](https://www.fec.gov/data/committee/C00569582/) | KANSAS AG COMMUNITIES COALITION | Unauthorized | $204,877 | $0 | — |
| SIERRA CLUB POLITICAL COMMITTEE | [C00135368](https://www.fec.gov/data/committee/C00135368/) | SIERRA CLUB POLITICAL COMMITTEE | Lobbyist/Registrant PAC | $84,305 | $119,221 | — |
| EMGAGE FEDERAL POLITICAL ACTION COMMITTEE | [C00453704](https://www.fec.gov/data/committee/C00453704/) | EMGAGE FEDERAL POLITICAL ACTION COMMITTEE | Unauthorized | $0 | $200,000 | — |
| CHANGE NOW | [C00683599](https://www.fec.gov/data/committee/C00683599/) | CHANGE NOW | Unauthorized | $0 | $197,825 | — |
| WORKING FOR US POLITICAL ACTION COMMITTEE INC | [C00430876](https://www.fec.gov/data/committee/C00430876/) | WORKING FOR US POLITICAL ACTION COMMITTEE INC | Unauthorized | $0 | $167,557 | — |
| ROOSEVELT SOCIETY ACTION | [C00889246](https://www.fec.gov/data/committee/C00889246/) | ROOSEVELT SOCIETY ACTION | Unauthorized | $0 | $159,783 | — |
| HUMANE SOCIETY LEGISLATIVE FUND | [C90009358](https://www.fec.gov/data/committee/C90009358/) | HUMANE SOCIETY LEGISLATIVE FUND | Unauthorized | $159,553 | $0 | — |
| DELIVERING FOR CALIFORNIA | [C00672386](https://www.fec.gov/data/committee/C00672386/) | DELIVERING FOR CALIFORNIA | Unauthorized | $150,000 | $0 | — |
| PROTECTING OUR VOTE PAC | [C00509463](https://www.fec.gov/data/committee/C00509463/) | PROTECTING OUR VOTE PAC | Lobbyist/Registrant PAC | $145,280 | $0 | — |
| CALIFORNIANS FOR SACRED SITES PROTECTION | [C00532929](https://www.fec.gov/data/committee/C00532929/) | CALIFORNIANS FOR SACRED SITES PROTECTION | Unauthorized | $144,114 | $0 | — |
| AMERICAN CHEMISTRY COUNCIL, INC | [C30002430](https://www.fec.gov/data/committee/C30002430/) | AMERICAN CHEMISTRY COUNCIL INC | Unauthorized | $133,204 | $0 | — |
| EMILY'S LIST | [C00591073](https://www.fec.gov/data/committee/C00591073/) | PRIORITIES USA ACTION AND EMILY'S LIST WOMEN VOTE! JOINT FUNDRAISING COMMITTEE | Joint fundraising committee | $133,005 | $0 | — |
| WINNING RIGHT PAC | [C00930495](https://www.fec.gov/data/committee/C00930495/) | WINNING RIGHT PAC | Unauthorized | $130,000 | $0 | — |
| NARAL | [C00337451](https://www.fec.gov/data/committee/C00337451/) | NEW YORK STATE NARAL INC WOMEN'S HEALTH POLITICAL ACTION COMMITTEE | Unauthorized | $0 | $128,130 | — |
| HONORING AMERICAN LAW ENFORCEMENT PAC | [C00710178](https://www.fec.gov/data/committee/C00710178/) | HONORING AMERICAN LAW ENFORCEMENT PAC | Unauthorized | $0 | $127,500 | — |
| LAW ENFORCEMENT FOR A SAFER AMERICA PAC | [C00681825](https://www.fec.gov/data/committee/C00681825/) | LAW ENFORCEMENT FOR A SAFER AMERICA PAC | Unauthorized | $0 | $127,500 | — |
| THE DISABLED VETERANS COALITION PAC | [C00759332](https://www.fec.gov/data/committee/C00759332/) | THE DISABLED VETERANS COALITION PAC | Unauthorized | $125,262 | $0 | — |
| FLORIDA CONSERVATIVE FUND | [C00671388](https://www.fec.gov/data/committee/C00671388/) | FLORIDA CONSERVATIVE FUND | Unauthorized | $121,542 | $0 | — |
| DRAIN THE DC SWAMP PAC | [C00662072](https://www.fec.gov/data/committee/C00662072/) | DRAIN THE DC SWAMP PAC | Unauthorized | $73,333 | $48,200 | — |
| FREEDOM'S DEFENSE FUND | [C00401786](https://www.fec.gov/data/committee/C00401786/) | FREEDOM'S DEFENSE FUND | Unauthorized | $0 | $119,500 | — |
| BLUEGREEN ALLIANCE | [C30001739](https://www.fec.gov/data/committee/C30001739/) | BLUEGREEN ALLIANCE | Unauthorized | $108,805 | $0 | — |
| POLITICAL ACTION COMMITTEE OF THE AMERICAN ASSOCIATION OF ORTHOPAEDIC SURGEONS | [C00343137](https://www.fec.gov/data/committee/C00343137/) | POLITICAL ACTION COMMITTEE OF THE AMERICAN ASSOCIATION OF ORTHOPAEDIC SURGEONS--PAC OF AAOS | Lobbyist/Registrant PAC | $103,800 | $0 | — |
| NATIONAL COMMITTEE TO PRESERVE SOCIAL SECURITY & MEDICARE PAC | [C00172296](https://www.fec.gov/data/committee/C00172296/) | NATIONAL COMMITTEE TO PRESERVE SOCIAL SECURITY & MEDICARE PAC | Lobbyist/Registrant PAC | $102,121 | $0 | — |
| NATIONAL WILDLIFE FEDERATION ACTION FUND | [C00476697](https://www.fec.gov/data/committee/C00476697/) | NATIONAL WILDLIFE FEDERATION ACTION FUND POLITICAL ACTION COMMITTEE | Unauthorized | $100,000 | $0 | — |
| UNITE HERE TIP CAMPAIGN COMMITTEE | [C00004861](https://www.fec.gov/data/committee/C00004861/) | UNITE HERE TIP CAMPAIGN COMMITTEE | Lobbyist/Registrant PAC | $98,252 | $0 | — |
| DEFENDING MAIN STREET SUPERPAC INC | [C00540203](https://www.fec.gov/data/committee/C00540203/) | DEFENDING MAIN STREET SUPERPAC INC. | Unauthorized | $98,000 | $0 | — |
| CLEAR VOICE MINNESOTA | [C00912477](https://www.fec.gov/data/committee/C00912477/) | CLEAR VOICE MINNESOTA | Unauthorized | $0 | $96,000 | — |
| UNITED FOOD AND COMMERCIAL WORKERS INTERNATIONAL UNION ACTIVE BALLOT CLUB | [C00002766](https://www.fec.gov/data/committee/C00002766/) | UNITED FOOD AND COMMERCIAL WORKERS INTERNATIONAL UNION ACTIVE BALLOT CLUB | Lobbyist/Registrant PAC | $94,608 | $0 | — |
| CITIZENS AGAINST AIPAC CORRUPTION | [C00879080](https://www.fec.gov/data/committee/C00879080/) | CITIZENS AGAINST AIPAC CORRUPTION | Unauthorized | $0 | $90,816 | — |
| UNITED FOR COMMON SENSE | [C00846428](https://www.fec.gov/data/committee/C00846428/) | UNITED FOR COMMON SENSE | Unauthorized | $0 | $88,500 | — |
| PROGRESSIVE TURNOUT PROJECT | [C00580068](https://www.fec.gov/data/committee/C00580068/) | PROGRESSIVE TURNOUT PROJECT | Unauthorized | $87,327 | $0 | — |
| POWERPACPLUS | [C00516500](https://www.fec.gov/data/committee/C00516500/) | POWERPACPLUS | Unauthorized | $81,401 | $0 | — |
| WFW ACTION FUND, INC. | [C00698936](https://www.fec.gov/data/committee/C00698936/) | WFW ACTION FUND INC | Unauthorized | $79,662 | $0 | — |
| FREETHOUGHT EQUALITY SUPER PAC | [C00575845](https://www.fec.gov/data/committee/C00575845/) | FREETHOUGHT EQUALITY SUPER PAC | Unauthorized | $72,200 | $0 | — |
| PLANNED PARENTHOOD OF MINNESOTA POLITICAL ACTION FUND | [C00684530](https://www.fec.gov/data/committee/C00684530/) | PLANNED PARENTHOOD OF MINNESOTA POLITICAL ACTION FUND | Unauthorized | $70,488 | $0 | — |
| AMERICAN CONSERVATIVE UNION | [C00505792](https://www.fec.gov/data/committee/C00505792/) | AMERICAN CONSERVATIVE UNION SUPER PAC | Unauthorized | $68,465 | $0 | — |
| INTERNATIONAL BROTHERHOOD OF ELECTRICAL WORKERS LOCAL 98 COMMITTEE ON POLITICAL EDUCATION | [C00162818](https://www.fec.gov/data/committee/C00162818/) | INTERNATIONAL BROTHERHOOD OF ELECTRICAL WORKERS LOCAL 98 COMMITTEE ON POLITICAL EDUCATION | Unauthorized | $68,350 | $0 | — |
| FREEDOM CLUB FEDERAL PAC | [C00307777](https://www.fec.gov/data/committee/C00307777/) | FREEDOM CLUB FEDERAL PAC | Unauthorized | $0 | $66,000 | — |
| OPPORTUNITY FOR ALL ACTION FUND | [C90021353](https://www.fec.gov/data/committee/C90021353/) | OPPORTUNITY FOR ALL ACTION FUND | Unauthorized | $64,370 | $0 | — |
| TRINITY PAC | [C00528919](https://www.fec.gov/data/committee/C00528919/) | TRINITY PAC | Unauthorized | $0 | $64,118 | — |
| LOS ANGELES COUNTY DEMOCRATIC CENTRAL COMMITTEE | [C00300731](https://www.fec.gov/data/committee/C00300731/) | LOS ANGELES COUNTY DEMOCRATIC CENTRAL COMMITTEE | Unauthorized | $62,562 | $0 | — |
| UNITED BREAST CANCER SUPPORT PAC | [C00824821](https://www.fec.gov/data/committee/C00824821/) | UNITED BREAST CANCER SUPPORT PAC | Unauthorized | $57,125 | $0 | — |
| FAMILY RESEARCH COUNCIL ACTION POLITICAL ACTION COMMITTEE | [C00452383](https://www.fec.gov/data/committee/C00452383/) | FAMILY RESEARCH COUNCIL ACTION POLITICAL ACTION COMMITTEE | Lobbyist/Registrant PAC | $0 | $54,500 | — |
| TZEDEK PAC | [C00770511](https://www.fec.gov/data/committee/C00770511/) | TZEDEK PAC | Unauthorized | $52,000 | $0 | — |
| BLUE MAJORITY PROJECT | [C00897363](https://www.fec.gov/data/committee/C00897363/) | BLUE MAJORITY PROJECT | Unauthorized | $50,853 | $0 | — |
| COPS VOTER GUIDE INC. | [C90017625](https://www.fec.gov/data/committee/C90017625/) | COPS VOTER GUIDE INC. | Unauthorized | $50,000 | $0 | — |
| ENGLISH LANGUAGE POLITICAL ACTION COMMITTEE | [C00199802](https://www.fec.gov/data/committee/C00199802/) | ENGLISH LANGUAGE POLITICAL ACTION COMMITTEE | Unauthorized | $0 | $47,994 | — |
| NEW HOUSE PAC | [C00383232](https://www.fec.gov/data/committee/C00383232/) | NEW HOUSE PAC | Unauthorized | $47,072 | $0 | — |
| RESOLUTE COURAGE PAC | [C00866640](https://www.fec.gov/data/committee/C00866640/) | RESOLUTE COURAGE PAC | Unauthorized | $46,152 | $0 | — |
| COOPERATIVE OF AMERICAN PHYSICIANS INDEPENDENT EXPENDITURE COMMITTEE | [C00492116](https://www.fec.gov/data/committee/C00492116/) | COOPERATIVE OF AMERICAN PHYSICIANS INDEPENDENT EXPENDITURE COMMITTEE | Unauthorized | $45,992 | $0 | — |
| CITIZEN SUPER PAC | [C00496927](https://www.fec.gov/data/committee/C00496927/) | CITIZENS SUPER PAC FOR AMERICA (CSPAC) | Unauthorized | $0 | $44,721 | — |
| 27TH CONGRESSIONAL DISTRICT DEMOCRATIC CLUB | [C00343756](https://www.fec.gov/data/committee/C00343756/) | 27TH CONGRESSIONAL DISTRICT DEMOCRATIC CLUB | Unauthorized | $0 | $44,171 | — |
| COMMONWEALTH COMMUNICATIONS | [C90019670](https://www.fec.gov/data/committee/C90019670/) | COMMONWEALTH COMMUNICATIONS | Unauthorized | $44,016 | $0 | — |
| NARAL Pro-Choice America | [C70002761](https://www.fec.gov/data/committee/C70002761/) | NARAL PRO-CHOICE AMERICA | Unauthorized | $44,000 | $0 | — |
| EQUALITY CALIFORNIA VOTES | [C00701797](https://www.fec.gov/data/committee/C00701797/) | EQUALITY CALIFORNIA VOTES | Unauthorized | $43,609 | $0 | — |
| FRIENDS OF THE EARTH (ACTION) INC | [C70005897](https://www.fec.gov/data/committee/C70005897/) | FRIENDS OF THE EARTH (ACTION) INC | Unauthorized | $40,939 | $0 | — |
| CONNECTICUT TAXPAYERS ALLIANCE | [C00563627](https://www.fec.gov/data/committee/C00563627/) | CONNECTICUT TAXPAYERS ALLIANCE | Unauthorized | $0 | $40,000 | — |
| MIDWEST GROWTH PAC | [C00617779](https://www.fec.gov/data/committee/C00617779/) | MIDWEST GROWTH PAC | Unauthorized | $39,950 | $0 | — |
| COMMON SENSE FOR CONNECTICUT | [C00820084](https://www.fec.gov/data/committee/C00820084/) | COMMON SENSE FOR CONNECTICUT | Unauthorized | $0 | $39,058 | — |
| NORTH STAR DAWN PAC | [C00935973](https://www.fec.gov/data/committee/C00935973/) | NORTH STAR DAWN PAC | Unauthorized | $37,500 | $0 | — |
| RURALVOTE.ORG | [C00754754](https://www.fec.gov/data/committee/C00754754/) | RURALVOTE.ORG | Unauthorized | $36,907 | $357 | — |
| AFSCME WORKING FAMILIES FUND | [C90011172](https://www.fec.gov/data/committee/C90011172/) | AFSCME WORKING FAMILIES FUND | Unauthorized | $36,702 | $0 | — |
| NATIONAL COMMITTEE TO PRESERVE SOCIAL SECURITY PAC | [C00172296](https://www.fec.gov/data/committee/C00172296/) | NATIONAL COMMITTEE TO PRESERVE SOCIAL SECURITY & MEDICARE PAC | Lobbyist/Registrant PAC | $0 | $31,971 | — |
| ONE NATION UNITED | [C00624718](https://www.fec.gov/data/committee/C00624718/) | ONE NATION UNITED | Unauthorized | $26,400 | $0 | — |
| ASSOCIATED GENERAL CONTRACTORS OF AMERICA POLITICAL ACTION COMMITTEE | [C00082917](https://www.fec.gov/data/committee/C00082917/) | ASSOCIATED GENERAL CONTRACTORS OF AMERICA POLITICAL ACTION COMMITTEE | Lobbyist/Registrant PAC | $21,628 | $0 | — |
| LABORERS' POLITICAL LEAGUE-LABORERS' INTERNATIONAL UNION OF N.A. | [C00429175](https://www.fec.gov/data/committee/C00429175/) | MID-ATLANTIC LABORERS' POLITICAL LEAGUE/LABORERS' INTERNATIONAL UNION OF NORTH AMERICA | Unauthorized | $20,000 | $0 | — |
| MISSISSIPPI REPUBLICAN PARTY | [C00084368](https://www.fec.gov/data/committee/C00084368/) | MISSISSIPPI REPUBLICAN PARTY | Unauthorized | $19,442 | $0 | — |
| BLUE AMERICA PAC | [C00427617](https://www.fec.gov/data/committee/C00427617/) | BLUE AMERICA PAC | Unauthorized | $0 | $19,200 | — |
| PLANNED PARENTHOOD VOTES NORTHWEST | [C90014119](https://www.fec.gov/data/committee/C90014119/) | PLANNED PARENTHOOD VOTES NORTHWEST | Unauthorized | $19,132 | $0 | — |
| DIRECT SELLING EMPOWERS AMERICANS | [C00564997](https://www.fec.gov/data/committee/C00564997/) | DIRECT SELLING EMPOWERS AMERICANS | Unauthorized | $18,941 | $0 | — |
| CONSERVATION OHIO | [C00672139](https://www.fec.gov/data/committee/C00672139/) | CONSERVATION OHIO | Unauthorized | $18,062 | $0 | — |
| ELBERT GUILLORY'S AMERICA | [C00607374](https://www.fec.gov/data/committee/C00607374/) | ELBERT GUILLORY'S AMERICA | Unauthorized | $9,724 | $8,292 | cand: H6LA04112 |
| DREAM UNITED | [C00754671](https://www.fec.gov/data/committee/C00754671/) | UNITED WE DREAM ACTION PAC | Unauthorized | $17,667 | $0 | — |
| CARE ACTION | [C00006080](https://www.fec.gov/data/committee/C00006080/) | AMERICAN HEALTH CARE ASSOCIATION POLITICAL ACTION COMMITTEE | Lobbyist/Registrant PAC | $17,538 | $0 | — |
| LET FREEDOM RING INC | [C90007998](https://www.fec.gov/data/committee/C90007998/) | LET FREEDOM RING INC | Unauthorized | $0 | $14,018 | — |
| OHLONE AREA UNITED DEMOCRATIC CAMPAIGN | [C00382283](https://www.fec.gov/data/committee/C00382283/) | OHLONE AREA UNITED DEMOCRATIC CAMPAIGN | Unauthorized | $13,246 | $0 | — |
| CARE ACTION NOW INC. | [C90021973](https://www.fec.gov/data/committee/C90021973/) | CARE ACTION NOW INC. | Unauthorized | $11,861 | $0 | — |
| PLANNED PARENTHOOD ACTION FUND OF THE PACIFIC SOUTHWEST PAC | [C00688432](https://www.fec.gov/data/committee/C00688432/) | PLANNED PARENTHOOD ACTION FUND OF THE PACIFIC SOUTHWEST PAC | Unauthorized | $11,245 | $0 | — |
| KUCINICH ACTION PAC | [C00325704](https://www.fec.gov/data/committee/C00325704/) | KUCINICH ACTION PAC | Unauthorized | $11,046 | $0 | cand: H6OH23033 |
| COALITION TO GROW SAN FRANCISCO - GROW SF PAC | [C90021387](https://www.fec.gov/data/committee/C90021387/) | COALITION TO GROW SAN FRANCISCO - GROW SF PAC | Unauthorized | $10,432 | $0 | — |
| GOOD JOBS AND STRONG COMMUNITIES PAC | [C00586610](https://www.fec.gov/data/committee/C00586610/) | GOOD JOBS AND STRONG COMMUNITIES PAC | Unauthorized | $10,000 | $0 | — |
| NEA FUND FOR CHILDREN AND PUBLIC EDUCATION | [C00003251](https://www.fec.gov/data/committee/C00003251/) | NEA FUND FOR CHILDREN AND PUBLIC EDUCATION | Lobbyist/Registrant PAC | $10,000 | $0 | — |
| MADISON PROJECT INC. | [C00298000](https://www.fec.gov/data/committee/C00298000/) | MADISON PROJECT INC. | Unauthorized | $10,000 | $0 | — |
| ONEAMERICA VOTES | [C00690255](https://www.fec.gov/data/committee/C00690255/) | ONEAMERICA VOTES JUSTICE FOR ALL FUND | Unauthorized | $9,956 | $0 | — |
| CLEAN UP CONGRESS | [C00245456](https://www.fec.gov/data/committee/C00245456/) | CLEAN UP CONGRESS | Unauthorized | $0 | $9,464 | cand: H8OR05024 |
| WOMEN SPEAK OUT PAC | [C00530766](https://www.fec.gov/data/committee/C00530766/) | WOMEN SPEAK OUT PAC | Unauthorized | $0 | $9,200 | — |
| LET AMERICA VOTE PAC | [C00632398](https://www.fec.gov/data/committee/C00632398/) | LET AMERICA VOTE PAC | Unauthorized | $8,884 | $0 | — |
| PATRIOT VOICES PAC | [C00528307](https://www.fec.gov/data/committee/C00528307/) | PATRIOT VOICES PAC | Unauthorized | $0 | $8,232 | — |
| TOGETHER FOR PROGRESS PAC | [C00688994](https://www.fec.gov/data/committee/C00688994/) | TOGETHER FOR PROGRESS PAC | Unauthorized | $8,180 | $0 | — |
| WASHINGTON CITIZENS FOR COLIN POWELL | [C00306977](https://www.fec.gov/data/committee/C00306977/) | WASHINGTON CITIZENS FOR COLIN POWELL | Unauthorized | $0 | $8,098 | cand: P60003050 |
| NEW JERSEY FAMILY FIRST INC | [C90012352](https://www.fec.gov/data/committee/C90012352/) | NEW JERSEY FAMILY FIRST INC | Unauthorized | $0 | $7,681 | — |
| FOCUS ON THE FAMILY ACTION | [C30000673](https://www.fec.gov/data/committee/C30000673/) | FOCUS ON THE FAMILY ACTION | Unauthorized | $0 | $7,681 | — |
| AMERICAN WORKER INC, THE | [C00488759](https://www.fec.gov/data/committee/C00488759/) | THE AMERICAN WORKER, INC | Unauthorized | $7,540 | $0 | — |
| MAD DOG PAC | [C00663211](https://www.fec.gov/data/committee/C00663211/) | MAD DOG PAC | Unauthorized | $0 | $7,527 | — |
| DREAM DEFENDERS FIGHT PAC | [C00728352](https://www.fec.gov/data/committee/C00728352/) | DREAM DEFENDERS FIGHT PAC | Unauthorized | $0 | $7,032 | — |
| NARAL PRO-CHOICE AMERICA | [C70002761](https://www.fec.gov/data/committee/C70002761/) | NARAL PRO-CHOICE AMERICA | Unauthorized | $6,760 | $0 | — |
| COURAGE CALIFORNIA SUPER PAC | [C00523498](https://www.fec.gov/data/committee/C00523498/) | COURAGE CALIFORNIA SUPER PAC | Unauthorized | $6,677 | $0 | — |
| THE NATIONAL REPUBLICAN TRUST PAC | [C00455378](https://www.fec.gov/data/committee/C00455378/) | THE NATIONAL REPUBLICAN TRUST PAC | Unauthorized | $0 | $6,615 | — |
| PUGET SOUND ENERGY INC PAC FOR GOOD GOVERNMENT | [C00101592](https://www.fec.gov/data/committee/C00101592/) | PUGET SOUND ENERGY INC. PAC FOR GOOD GOVERNMENT | Lobbyist/Registrant PAC | $6,577 | $0 | — |
| SIERRA CLUB INDEPENDENT ACTION | [C00483693](https://www.fec.gov/data/committee/C00483693/) | SIERRA CLUB INDEPENDENT ACTION | Lobbyist/Registrant PAC | $6,515 | $0 | — |
| HE'S GOTTA GO PAC | [C00755496](https://www.fec.gov/data/committee/C00755496/) | HE'S GOTTA GO PAC | Unauthorized | $1,750 | $4,715 | — |
| VICTORY FOR SCHAUMBURG | [C00815977](https://www.fec.gov/data/committee/C00815977/) | VICTORY FOR SCHAUMBURG | Unauthorized | $0 | $6,171 | — |
| THE 60 PLUS ASSOCIATION | [C30001671](https://www.fec.gov/data/committee/C30001671/) | THE 60 PLUS ASSOCIATION | Unauthorized | $0 | $6,122 | — |
| CT WORKING FAMILIES FEDERAL PAC D/B/A TAKE BACK CONGRESS CT | [C00428649](https://www.fec.gov/data/committee/C00428649/) | CT WORKING FAMILIES FEDERAL PAC D/B/A TAKE BACK CONGRESS CT | Unauthorized | $5,075 | $0 | — |
| PROTECT THE VOTE | [C00756056](https://www.fec.gov/data/committee/C00756056/) | PROTECT THE VOTE | Unauthorized | $5,000 | $0 | — |
| REALLY AMERICAN PAC | [C00748582](https://www.fec.gov/data/committee/C00748582/) | REALLY AMERICAN PAC | Unauthorized | $0 | $5,000 | — |
| UNITED WE CAN | [C00523621](https://www.fec.gov/data/committee/C00523621/) | UNITED WE CAN | Unauthorized | $4,631 | $0 | — |
| DEMOCRATIC PARTY OF VIRGINIA | [C00155952](https://www.fec.gov/data/committee/C00155952/) | DEMOCRATIC PARTY OF VIRGINIA | Unauthorized | $4,606 | $0 | — |
| TOGETHER WE THRIVE | [C00522458](https://www.fec.gov/data/committee/C00522458/) | TOGETHER WE THRIVE | Unauthorized | $3,750 | $750 | — |
| MID-AMERICA CONSERVATIVE POLITICAL ACTION COMMITTEE | [C00139972](https://www.fec.gov/data/committee/C00139972/) | MID-AMERICA CONSERVATIVE POLITICAL ACTION COMMITTEE | Unauthorized | $0 | $4,496 | — |
| INTERNATIONAL LONGSHORE AND WAREHOUSE UNION -- POLITICAL ACTION FUND | [C00176214](https://www.fec.gov/data/committee/C00176214/) | INTERNATIONAL LONGSHORE AND WAREHOUSE UNION -- POLITICAL ACTION FUND | Lobbyist/Registrant PAC | $4,463 | $0 | — |
| ACTIVATE AMERICA | [C00640300](https://www.fec.gov/data/committee/C00640300/) | ACTIVATE AMERICA | Unauthorized | $0 | $4,333 | — |
| REVERE AMERICA | [C90011701](https://www.fec.gov/data/committee/C90011701/) | REVERE AMERICA | Unauthorized | $4,298 | $0 | — |
| ALHAMBRA DEMOCRATIC CLUB | [C00302711](https://www.fec.gov/data/committee/C00302711/) | ALHAMBRA DEMOCRATIC CLUB - FED | Unauthorized | $0 | $3,577 | — |
| AMERICANS FOR JOB SECURITY | [C30001135](https://www.fec.gov/data/committee/C30001135/) | AMERICANS FOR JOB SECURITY | Unauthorized | $3,227 | $0 | — |
| ALICE B. TOKLAS LGBTQ DEMOCRATIC CLUB FEDERAL PAC | [C00705277](https://www.fec.gov/data/committee/C00705277/) | ALICE B. TOKLAS LGBTQ DEMOCRATIC CLUB FEDERAL PAC | Unauthorized | $3,129 | $0 | — |
| PLANNED PARENTHOOD NW ACTION PAC | [C00687475](https://www.fec.gov/data/committee/C00687475/) | PLANNED PARENTHOOD NW ACTION PAC | Unauthorized | $2,799 | $0 | — |
| NATIONAL RIGHT TO LIFE VICTORY FUND | [C00509893](https://www.fec.gov/data/committee/C00509893/) | NATIONAL RIGHT TO LIFE VICTORY FUND | Unauthorized | $2,502 | $0 | — |
| SANDRE SWANSON FOR ASSEMBLY 2010 | [C90012618](https://www.fec.gov/data/committee/C90012618/) | SANDRE SWANSON FOR ASSEMBLY 2010 | Unauthorized | $2,488 | $0 | — |
| HEALTH JUSTICE FOR ALL | [C00695619](https://www.fec.gov/data/committee/C00695619/) | HEALTH JUSTICE FOR ALL | Unauthorized | $2,417 | $0 | — |
| HUNTER ACTION FUND (HAF) | [C00541433](https://www.fec.gov/data/committee/C00541433/) | HUNTER ACTION FUND (HAF) | Lobbyist/Registrant PAC | $1,857 | $0 | — |
| SAN BENITO COUNTY DEMOCRATIC CENTRAL COMMITTEE | [C00496521](https://www.fec.gov/data/committee/C00496521/) | SAN BENITO COUNTY DEMOCRATIC CENTRAL COMMITTEE | Unauthorized | $1,795 | $0 | — |
| OPPORTUNITY PAC - A COALITION OF TEACHERS HEALTH CARE GIVERS FACULTY MEMBERS SCHOOL EMPLOYEES AND PUBLIC AND PR | [C90016841](https://www.fec.gov/data/committee/C90016841/) | OPPORTUNITY PAC - A COALITION OF TEACHERS HEALTH CARE GIVERS FACULTY MEMBERS SCHOOL EMPLOYEES AND PUBLIC AND PR | Unauthorized | $1,772 | $0 | — |
| COMMITTEE FOR DEFENDING AMERICAN VALUES | [C00759142](https://www.fec.gov/data/committee/C00759142/) | COMMITTEE FOR DEFENDING AMERICAN VALUES | Unauthorized | $1,715 | $0 | — |
| PENNSYLVANIA PRO-LIFE FEDERATION PAC | [C00172361](https://www.fec.gov/data/committee/C00172361/) | PENNSYLVANIA PRO-LIFE FEDERATION PAC | Unauthorized | $1,635 | $0 | — |
| DEMOCRATIC ALLIANCE FOR ACTION | [C00407262](https://www.fec.gov/data/committee/C00407262/) | DEMOCRATIC ALLIANCE FOR ACTION | Unauthorized | $1,550 | $0 | — |
| CLIMATE HAWKS VOTE | [C00548461](https://www.fec.gov/data/committee/C00548461/) | CLIMATE HAWKS VOTE POLITICAL ACTION | Unauthorized | $1,500 | $0 | — |
| DOLORES HUERTA ACTION FUND | [C90021577](https://www.fec.gov/data/committee/C90021577/) | DOLORES HUERTA ACTION FUND | Unauthorized | $1,449 | $0 | — |
| MISLOVE, ALAN EDWARD | [C90018862](https://www.fec.gov/data/committee/C90018862/) | MISLOVE, ALAN EDWARD | Unauthorized | $1,117 | $0 | — |
| SOUTHERN STATES POLICE BENEVOLENT ASSOC PAC FUND | [C00265546](https://www.fec.gov/data/committee/C00265546/) | SOUTHERN STATES POLICE BENEVOLENT ASSOC PAC FUND | Lobbyist/Registrant PAC | $984 | $0 | — |
| PLANNED PARENTHOOD VOTES | [C00489799](https://www.fec.gov/data/committee/C00489799/) | PLANNED PARENTHOOD VOTES | Unauthorized | $762 | $0 | — |
| SENIOR POLITICAL ACTION COMMITTEE  (WASH D.C.) | [C00142521](https://www.fec.gov/data/committee/C00142521/) | SENIOR POLITICAL ACTION COMMITTEE (WASH D.C.) | Unauthorized | $0 | $679 | — |
| MICHIGAN REPUBLICAN PARTY | [C00041160](https://www.fec.gov/data/committee/C00041160/) | MICHIGAN REPUBLICAN PARTY | Unauthorized | $0 | $597 | — |
| PERFORMANCE RACING INC. | [C00389403](https://www.fec.gov/data/committee/C00389403/) | SPECIALTY EQUIPMENT MARKET ASSOCIATION & PERFORMANCE RACING, INC. PAC (SEMA & PRI PAC) | Unauthorized | $500 | $0 | — |
| KANSANS FOR LIFE POLITICAL ACTION COMMITTEE | [C00175521](https://www.fec.gov/data/committee/C00175521/) | KANSANS FOR LIFE FEDERAL POLITICAL ACTION COMMITTEE | Unauthorized | $0 | $223 | — |
| RIGHT TO LIFE OF MICHIGAN POLITICAL ACTION COMMITTEE | [C00101212](https://www.fec.gov/data/committee/C00101212/) | RIGHT TO LIFE OF MICHIGAN POLITICAL ACTION COMMITTEE | Unauthorized | $0 | $174 | — |
| PLANNED PARENTHOOD ADVOCATES OF KANSAS | [C90006719](https://www.fec.gov/data/committee/C90006719/) | PLANNED PARENTHOOD ADVOCATES OF KANSAS | Unauthorized | $0 | $120 | — |
| POLITICAL ACTION FOR LASTING SECURITY | [C00174748](https://www.fec.gov/data/committee/C00174748/) | POLITICAL ACTION FOR LASTING SECURITY | Unauthorized | $0 | $80 | — |
| ALLIANCE COAL, LLC PAC | [C00330233](https://www.fec.gov/data/committee/C00330233/) | ALLIANCE COAL, LLC PAC | Unauthorized | $69 | $0 | — |
| CAMPAIGN FOR WORKING FAMILIES | [C00325076](https://www.fec.gov/data/committee/C00325076/) | CAMPAIGN FOR WORKING FAMILIES | Unauthorized | $0 | $66 | — |
| INTERNATIONAL ASSOCIATION OF FIREFIGHTERS INTERESTED IN REGISTRATION AND EDUCATION PAC | [C00029447](https://www.fec.gov/data/committee/C00029447/) | INTERNATIONAL ASSOCIATION OF FIREFIGHTERS INTERESTED IN REGISTRATION AND EDUCATION PAC | Lobbyist/Registrant PAC | $0 | $21 | — |
| PLANNED PARENTHOOD OF KS & MID-MO | [C90006032](https://www.fec.gov/data/committee/C90006032/) | PLANNED PARENTHOOD OF KS & MID-MO | Unauthorized | $0 | $7 | — |
| PUTTING PEOPLE FIRST POLITICAL ACTION COMMITTEE | [C00243584](https://www.fec.gov/data/committee/C00243584/) | PUTTING PEOPLE FIRST POLITICAL ACTION COMMITTEE | Unauthorized | $0 | $5 | — |
