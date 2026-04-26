---
title: "Relationship Cache Drift Audit"
type: admin-note
note-type: data
status: open
last-updated: 2026-04-15
generator: scripts/relationship-cache-drift-audit.cjs
note-kind: report
---

# Relationship Cache Drift Audit

CLAUDE.md Rule 10 says `data/relationships.jsonl` is canonical; frontmatter fields (`related`, `donors`, `top-donors`, `politicians-funded`, `politicians-opposed`, `opposes`, `stories`) are READ-CACHES. This audit compares each profile's frontmatter to the canonical store and reports drift.

## Summary

- **Canonical edges loaded:** 31746
- **Profiles with guarded frontmatter fields:** 1777
- **Fully aligned (no drift):** 301
- **Drifted profiles:** 1476
- **In frontmatter but NOT in canonical:** 11252
- **In canonical but NOT in frontmatter cache:** 7183

## Top drifted profiles

Ranked by total drift count (stale + missing). **Fix:** run `scripts/rebuild-relationship-caches.cjs` (or the equivalent rebuilder) to regenerate frontmatter from `data/relationships.jsonl`. That eliminates the drift in one pass. Manual-edit drift is usually a hint the canonical-store-sentinel pre-commit hook was bypassed at some point.

| Profile | Stale in frontmatter | Missing from cache |
|---|---:|---:|
| [Donald Trump](/content/Politicians/Republicans/Presidential/Donald Trump/_Donald Trump Master Profile.md) | 27 | 355 |
| [Koch Network - Charles Koch](/content/Donors & Power Networks/Mega-Donors/Koch Network - Charles Koch.md) | 19 | 167 |
| [AIPAC - American Israel Public Affairs Committee](/content/Donors & Power Networks/Israel Lobby/AIPAC - American Israel Public Affairs Committee.md) | 8 | 144 |
| [Gavin Newsom](/content/Politicians/Democrats/Governors/Gavin Newsom/_Gavin Newsom Master Profile.md) | 0 | 120 |
| [Bernie Sanders](/content/Politicians/Independent/Senate/Bernie Sanders/_Bernie Sanders Master Profile.md) | 15 | 76 |
| [Fairshake PAC](/content/Donors & Power Networks/Tech & Crypto/Fairshake PAC.md) | 1 | 88 |
| [Kamala Harris](/content/Politicians/Democrats/Vice Presidential/Kamala Harris/_Kamala Harris Master Profile.md) | 15 | 71 |
| [SEIU - Service Employees International Union](/content/Donors & Power Networks/Labor Unions/SEIU - Service Employees International Union.md) | 1 | 81 |
| [Goldman Sachs](/content/Donors & Power Networks/Wall Street/Goldman Sachs.md) | 8 | 71 |
| [Chuck Schumer](/content/Politicians/Democrats/Senate/Chuck Schumer/_Chuck Schumer Master Profile.md) | 5 | 74 |
| [Tim Scott](/content/Politicians/Republicans/Senate/Tim Scott/_Tim Scott Master Profile.md) | 3 | 76 |
| [Lockheed Martin](/content/Donors & Power Networks/Defense & Intelligence/Lockheed Martin.md) | 4 | 70 |
| [John Cornyn](/content/Politicians/Republicans/Senate/John Cornyn/_John Cornyn Master Profile.md) | 9 | 61 |
| [Elizabeth Warren](/content/Politicians/Democrats/Senate/Elizabeth Warren/_Elizabeth Warren Master Profile.md) | 7 | 62 |
| [Nancy Pelosi](/content/Politicians/Democrats/House/Nancy Pelosi/_Nancy Pelosi Master Profile.md) | 12 | 53 |
| [Joe Biden](/content/Politicians/Democrats/Presidential/Joe Biden/_Joe Biden Master Profile.md) | 24 | 35 |
| [Federalist Society](/content/Think Tanks & Policy Infrastructure/Conservative/Federalist Society.md) | 0 | 59 |
| [Barack Obama](/content/Politicians/Democrats/Presidential/Barack Obama/_Barack Obama Master Profile.md) | 20 | 38 |
| [Heritage Foundation](/content/Think Tanks & Policy Infrastructure/Conservative/Heritage Foundation.md) | 0 | 58 |
| [Fossil Fuel Bloc](/content/Donors & Power Networks/Energy & Utilities/Fossil Fuel Bloc.md) | 7 | 50 |
| [Elon Musk](/content/Donors & Power Networks/Mega-Donors/Elon Musk.md) | 10 | 46 |
| ["Newsom 2028 - The Donor Class Presidential Campaign"](/content/Politicians/Democrats/Governors/Gavin Newsom/Newsom 2028 - The Donor Class Presidential Campaign.md) | 56 | 0 |
| [Lindsey Graham](/content/Politicians/Republicans/Senate/Lindsey Graham/_Lindsey Graham Master Profile.md) | 8 | 47 |
| [MAGA Inc](/content/Donors & Power Networks/Super PACs/MAGA Inc.md) | 0 | 53 |
| [Marco Rubio](/content/Politicians/Republicans/Trump Cabinet/Marco Rubio/_Marco Rubio Master Profile.md) | 7 | 46 |
| [Peter Thiel](/content/Donors & Power Networks/Mega-Donors/Peter Thiel.md) | 6 | 46 |
| [Mike Rogers](/content/Politicians/Republicans/House/Mike Rogers/_Mike Rogers Master Profile.md) | 4 | 48 |
| [Ted Cruz](/content/Politicians/Republicans/Senate/Ted Cruz/_Ted Cruz Master Profile.md) | 9 | 43 |
| [UnitedHealth Group - Optum](/content/Donors & Power Networks/Healthcare/UnitedHealth Group - Optum.md) | 7 | 44 |
| [Ron DeSantis](/content/Politicians/Republicans/Governors/Ron DeSantis/_Ron DeSantis Master Profile.md) | 1 | 49 |
| ["Rumble"](/content/Media & Influence Pipeline/Right/Rumble.md) | 48 | 0 |
| [American Enterprise Institute](/content/Think Tanks & Policy Infrastructure/Conservative/American Enterprise Institute.md) | 0 | 48 |
| [United Democracy Project - UDP](/content/Donors & Power Networks/Super PACs/United Democracy Project - UDP.md) | 0 | 47 |
| ["The Daily Wire"](/content/Media & Influence Pipeline/Right/Daily Wire.md) | 47 | 0 |
| [Gregory Meeks](/content/Politicians/Democrats/House/Gregory Meeks/_Gregory Meeks Master Profile.md) | 6 | 41 |
| [US Chamber of Commerce](/content/Donors & Power Networks/Dark Money/US Chamber of Commerce.md) | 0 | 46 |
| [Mike Johnson](/content/Politicians/Republicans/House/Mike Johnson/_Mike Johnson Master Profile.md) | 8 | 38 |
| ["Charlie Kirk"](/content/Media & Influence Pipeline/Right/Charlie Kirk.md) | 45 | 0 |
| ["Dave Rubin"](/content/Media & Influence Pipeline/Right/Dave Rubin.md) | 45 | 0 |
| [Sherrod Brown](/content/Politicians/Democrats/Former/Sherrod Brown.md) | 13 | 32 |
| [Jim Jordan](/content/Politicians/Republicans/House/Jim Jordan/_Jim Jordan Master Profile.md) | 5 | 40 |
| [Lee Zeldin](/content/Politicians/Republicans/Trump Cabinet/Lee Zeldin/_Lee Zeldin Master Profile.md) | 7 | 38 |
| [Leonard Leo](/content/Donors & Power Networks/Leonard Leo.md) | 11 | 33 |
| ["Lex Fridman"](/content/Media & Influence Pipeline/Centrist/Lex Fridman.md) | 44 | 0 |
| ["David Pakman"](/content/Media & Influence Pipeline/Left/David Pakman.md) | 44 | 0 |
| ["The Platform Dependency Spectrum , Revenue Vulnerability Across Political Media"](/content/Media & Influence Pipeline/The Platform Dependency Spectrum — Revenue Vulnerability Across Political Media.md) | 44 | 0 |
| ["Bari Weiss"](/content/Media & Influence Pipeline/Centrist/Bari Weiss.md) | 43 | 0 |
| ["Andrew Klavan"](/content/Media & Influence Pipeline/Right/Andrew Klavan.md) | 43 | 0 |
| ["Candace Owens"](/content/Media & Influence Pipeline/Right/Candace Owens.md) | 43 | 0 |
| ["Dan Bongino"](/content/Media & Influence Pipeline/Right/Dan Bongino.md) | 43 | 0 |
| ["Jordan Peterson"](/content/Media & Influence Pipeline/Right/Jordan Peterson.md) | 43 | 0 |
| ["Matt Walsh"](/content/Media & Influence Pipeline/Right/Matt Walsh.md) | 43 | 0 |
| ["Breaking Points with Krystal and Saagar"](/content/Media & Influence Pipeline/Centrist/Breaking Points.md) | 42 | 0 |
| ["Glenn Greenwald"](/content/Media & Influence Pipeline/Centrist/Glenn Greenwald.md) | 42 | 0 |
| ["Nate Silver"](/content/Media & Influence Pipeline/Centrist/Nate Silver.md) | 42 | 0 |
| ["Russell Brand"](/content/Media & Influence Pipeline/Centrist/Russell Brand.md) | 42 | 0 |
| ["Briahna Joy Gray"](/content/Media & Influence Pipeline/Left/Briahna Joy Gray.md) | 42 | 0 |
| ["Kyle Kulinski"](/content/Media & Influence Pipeline/Left/Kyle Kulinski.md) | 42 | 0 |
| ["Sam Seder"](/content/Media & Influence Pipeline/Left/Sam Seder.md) | 42 | 0 |
| ["Tenet Media"](/content/Media & Influence Pipeline/Right/Tenet Media.md) | 42 | 0 |
| [House Majority PAC](/content/Donors & Power Networks/Super PACs/House Majority PAC.md) | 0 | 41 |
| ["Chris Cuomo"](/content/Media & Influence Pipeline/Centrist/Chris Cuomo.md) | 41 | 0 |
| ["Joe Rogan"](/content/Media & Influence Pipeline/Centrist/Joe Rogan.md) | 41 | 0 |
| ["John Oliver"](/content/Media & Influence Pipeline/Left/John Oliver.md) | 41 | 0 |
| ["TYT Network - The Young Turks"](/content/Media & Influence Pipeline/Left/TYT Network - The Young Turks.md) | 41 | 0 |
| ["Ben Shapiro"](/content/Media & Influence Pipeline/Right/Ben Shapiro.md) | 41 | 0 |
| ["Christopher Rufo"](/content/Media & Influence Pipeline/Right/Christopher Rufo.md) | 41 | 0 |
| ["Jesse Watters"](/content/Media & Influence Pipeline/Right/Jesse Watters.md) | 41 | 0 |
| [Amy Klobuchar](/content/Politicians/Democrats/Senate/Amy Klobuchar/_Amy Klobuchar Master Profile.md) | 9 | 32 |
| [Nikki Haley](/content/Politicians/Republicans/Governors/Nikki Haley/_Nikki Haley Master Profile.md) | 9 | 32 |
| [Rand Paul](/content/Politicians/Republicans/Senate/Rand Paul/_Rand Paul Master Profile.md) | 5 | 36 |
| [Federalist Society](/content/Donors & Power Networks/Dark Money/Federalist Society.md) | 3 | 37 |
| [Boeing](/content/Donors & Power Networks/Defense & Intelligence/Boeing.md) | 3 | 37 |
| ["Senate Leadership Fund"](/content/Donors & Power Networks/Super PACs/Senate Leadership Fund.md) | 40 | 0 |
| ["Ezra Klein"](/content/Media & Influence Pipeline/Centrist/Ezra Klein.md) | 40 | 0 |
| ["Matt Taibbi"](/content/Media & Influence Pipeline/Centrist/Matt Taibbi.md) | 40 | 0 |
| ["Fox News - Murdoch Media Empire"](/content/Media & Influence Pipeline/Fox News - Murdoch Media Empire.md) | 40 | 0 |
| ["James O'Keefe"](/content/Media & Influence Pipeline/Right/James O'Keefe.md) | 40 | 0 |
| ["Tim Pool"](/content/Media & Influence Pipeline/Right/Tim Pool.md) | 40 | 0 |
| [Cory Booker](/content/Politicians/Democrats/Senate/Cory Booker/_Cory Booker Master Profile.md) | 14 | 26 |
| [Benjamin Netanyahu](/content/Politicians/International/Benjamin Netanyahu/_Benjamin Netanyahu Master Profile.md) | 3 | 37 |
| [DMFI - Democratic Majority for Israel](/content/Donors & Power Networks/Israel Lobby/DMFI - Democratic Majority for Israel.md) | 1 | 38 |
| ["Rachel Maddow"](/content/Media & Influence Pipeline/Left/Rachel Maddow.md) | 39 | 0 |
| ["Sean Hannity"](/content/Media & Influence Pipeline/Right/Sean Hannity.md) | 39 | 0 |
| ["Steven Crowder"](/content/Media & Influence Pipeline/Right/Steven Crowder.md) | 39 | 0 |
| ["Joe Scarborough"](/content/Media & Influence Pipeline/Centrist/Joe Scarborough.md) | 38 | 0 |
| ["Nicolle Wallace"](/content/Media & Influence Pipeline/Centrist/Nicolle Wallace.md) | 38 | 0 |
| ["Crooked Media"](/content/Media & Influence Pipeline/Left/Crooked Media.md) | 38 | 0 |
| ["Pod Save America"](/content/Media & Influence Pipeline/Left/Pod Save America.md) | 38 | 0 |
| ["Patrick Bet-David"](/content/Media & Influence Pipeline/Right/Patrick Bet-David.md) | 38 | 0 |
| [John Thune](/content/Politicians/Republicans/Senate/John Thune/_John Thune Master Profile.md) | 8 | 30 |
| [Mike Lee](/content/Politicians/Republicans/Senate/Mike Lee/_Mike Lee Master Profile.md) | 9 | 29 |
| [Doug Burgum](/content/Politicians/Republicans/Trump Cabinet/Doug Burgum/_Doug Burgum Master Profile.md) | 6 | 32 |
| [Adam Smith](/content/Politicians/Democrats/House/Adam Smith/_Adam Smith Master Profile.md) | 8 | 29 |
| [Thom Tillis](/content/Politicians/Republicans/Senate/Thom Tillis/_Thom Tillis Master Profile.md) | 3 | 34 |
| [Walton Family Foundation](/content/Donors & Power Networks/Education/Walton Family Foundation.md) | 1 | 35 |
| ["Jake Tapper"](/content/Media & Influence Pipeline/Centrist/Jake Tapper.md) | 36 | 0 |
| ["The Free Press"](/content/Media & Influence Pipeline/Centrist/The Free Press.md) | 36 | 0 |
| ["Cenk Uygur"](/content/Media & Influence Pipeline/Left/Cenk Uygur.md) | 36 | 0 |
| ["Greg Gutfeld"](/content/Media & Influence Pipeline/Right/Greg Gutfeld.md) | 36 | 0 |
| … +1376 more drifted profiles | | |

---

*Regenerate: `node scripts/relationship-cache-drift-audit.cjs --write`. Re-run after every cache rebuild to confirm drift closes to zero.*
