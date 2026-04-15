---
title: "Relationship Cache Drift Audit"
type: admin-note
note-type: data
status: open
last-updated: 2026-04-15
generator: scripts/relationship-cache-drift-audit.cjs
---

# Relationship Cache Drift Audit

CLAUDE.md Rule 10 says `data/relationships.jsonl` is canonical; frontmatter fields (`related`, `donors`, `top-donors`, `politicians-funded`, `politicians-opposed`, `opposes`, `stories`) are READ-CACHES. This audit compares each profile's frontmatter to the canonical store and reports drift.

## Summary

- **Canonical edges loaded:** 30214
- **Profiles with guarded frontmatter fields:** 1415
- **Fully aligned (no drift):** 6
- **Drifted profiles:** 1409
- **In frontmatter but NOT in canonical:** 14399
- **In canonical but NOT in frontmatter cache:** 2348

## Finding: canonical store has coverage gaps (not drift)

Stale-in-frontmatter (14399) is 6× larger than missing-from-cache (2348). This pattern means **the canonical store `data/relationships.jsonl` is sparser than the frontmatter caches** — not that the caches are drifting. Frontmatter was populated by years of prior pipeline runs and manual edits; the canonical store was populated more recently via migration and is still catching up.

**Implications:**

- Queries against `data/relationships.jsonl` will **under-report** relationships for most entities.
- The query-engine composers (`top_opposition_donors`, `cross_party_donors`, `timing_proximity`) will miss edges that exist in profiles but not in the canonical store.
- Running `scripts/rebuild-relationship-caches.cjs` right now would REDUCE the data in frontmatter rather than reconciling it — a regression.

**Recommended fix path (next session):**

1. Run a new migration pass: `scripts/migrate-frontmatter-to-canonical.cjs` (to be built) that walks every profile, extracts wikilinks from guarded frontmatter fields, and appends missing edges to `data/relationships.jsonl` via `relationships-store.cjs`.
2. Verify with `data/relationships.jsonl` edge count climbing from current 27,504 toward ~42,000 (27,504 + 15,023 missing - some overlap).
3. Re-run this audit. `stale_in_frontmatter` should drop dramatically once canonical catches up.
4. Only after step 3 shows alignment should `rebuild-relationship-caches.cjs` be run.

## Top drifted profiles (by gap count)

| Profile | Stale in frontmatter | Missing from cache |
|---|---:|---:|
| [Donald Trump](/content/Politicians/Republicans/Presidential/Donald Trump/_Donald Trump Master Profile.md) | 0 | 446 |
| [Gavin Newsom](/content/Politicians/Democrats/Governors/Gavin Newsom/_Gavin Newsom Master Profile.md) | 0 | 170 |
| [Fairshake PAC](/content/Donors & Power Networks/Tech & Crypto/Fairshake PAC.md) | 1 | 90 |
| [SEIU - Service Employees International Union](/content/Donors & Power Networks/Labor Unions/SEIU - Service Employees International Union.md) | 0 | 86 |
| [Elizabeth Warren](/content/Politicians/Democrats/Senate/Elizabeth Warren/_Elizabeth Warren Master Profile.md) | 0 | 69 |
| [Federalist Society](/content/Think Tanks & Policy Infrastructure/Conservative/Federalist Society.md) | 0 | 64 |
| [Peter Thiel](/content/Donors & Power Networks/Mega-Donors/Peter Thiel.md) | 6 | 56 |
| [Heritage Foundation](/content/Think Tanks & Policy Infrastructure/Conservative/Heritage Foundation.md) | 0 | 62 |
| [Ron DeSantis](/content/Politicians/Republicans/Governors/Ron DeSantis/_Ron DeSantis Master Profile.md) | 0 | 58 |
| ["Koch Network - Charles Koch"](/content/Donors & Power Networks/Mega-Donors/Koch Network - Charles Koch.md) | 55 | 0 |
| [MAGA Inc](/content/Donors & Power Networks/Super PACs/MAGA Inc.md) | 0 | 55 |
| ["Newsom 2028 - The Donor Class Presidential Campaign"](/content/Politicians/Democrats/Governors/Gavin Newsom/Newsom 2028 - The Donor Class Presidential Campaign.md) | 54 | 0 |
| [Barack Obama](/content/Politicians/Democrats/Presidential/Barack Obama/_Barack Obama Master Profile.md) | 2 | 52 |
| ["Fanjul Family - Florida Crystals"](/content/Donors & Power Networks/Agriculture/Fanjul Family - Florida Crystals.md) | 52 | 0 |
| [American Enterprise Institute](/content/Think Tanks & Policy Infrastructure/Conservative/American Enterprise Institute.md) | 0 | 52 |
| [US Chamber of Commerce](/content/Donors & Power Networks/Dark Money/US Chamber of Commerce.md) | 0 | 51 |
| ["AIPAC - American Israel Public Affairs Committee"](/content/Donors & Power Networks/Israel Lobby/AIPAC - American Israel Public Affairs Committee.md) | 51 | 0 |
| [United Democracy Project - UDP](/content/Donors & Power Networks/Super PACs/United Democracy Project - UDP.md) | 0 | 50 |
| ["Koch Industries"](/content/Donors & Power Networks/Energy & Utilities/Koch Industries.md) | 49 | 0 |
| [Ted Cruz](/content/Politicians/Republicans/Senate/Ted Cruz/_Ted Cruz Master Profile.md) | 0 | 48 |
| ["Elon Musk"](/content/Donors & Power Networks/Mega-Donors/Elon Musk.md) | 47 | 0 |
| ["Rumble"](/content/Media & Influence Pipeline/Right/Rumble.md) | 46 | 0 |
| ["ExxonMobil"](/content/Donors & Power Networks/Energy & Utilities/ExxonMobil.md) | 45 | 0 |
| ["Crypto Industry Bloc"](/content/Donors & Power Networks/Tech & Crypto/Crypto Industry Bloc.md) | 45 | 0 |
| ["The Daily Wire"](/content/Media & Influence Pipeline/Right/Daily Wire.md) | 45 | 0 |
| ["Leonard Leo"](/content/Donors & Power Networks/Leonard Leo.md) | 44 | 0 |
| ["Miriam Adelson"](/content/Donors & Power Networks/Mega-Donors/Miriam Adelson.md) | 44 | 0 |
| ["Northrop Grumman"](/content/Donors & Power Networks/Defense & Intelligence/Northrop Grumman.md) | 43 | 0 |
| ["Charlie Kirk"](/content/Media & Influence Pipeline/Right/Charlie Kirk.md) | 43 | 0 |
| ["Dave Rubin"](/content/Media & Influence Pipeline/Right/Dave Rubin.md) | 43 | 0 |
| ["Google - Alphabet"](/content/Donors & Power Networks/Tech & Crypto/Google - Alphabet.md) | 42 | 0 |
| ["Lex Fridman"](/content/Media & Influence Pipeline/Centrist/Lex Fridman.md) | 42 | 0 |
| ["David Pakman"](/content/Media & Influence Pipeline/Left/David Pakman.md) | 42 | 0 |
| ["The Platform Dependency Spectrum , Revenue Vulnerability Across Political Media"](/content/Media & Influence Pipeline/The Platform Dependency Spectrum — Revenue Vulnerability Across Political Media.md) | 42 | 0 |
| ["Boeing"](/content/Donors & Power Networks/Defense & Intelligence/Boeing.md) | 41 | 0 |
| ["Lockheed Martin"](/content/Donors & Power Networks/Defense & Intelligence/Lockheed Martin.md) | 41 | 0 |
| ["Fossil Fuel Bloc"](/content/Donors & Power Networks/Energy & Utilities/Fossil Fuel Bloc.md) | 41 | 0 |
| [DMFI - Democratic Majority for Israel](/content/Donors & Power Networks/Israel Lobby/DMFI - Democratic Majority for Israel.md) | 1 | 40 |
| ["Bari Weiss"](/content/Media & Influence Pipeline/Centrist/Bari Weiss.md) | 41 | 0 |
| ["Andrew Klavan"](/content/Media & Influence Pipeline/Right/Andrew Klavan.md) | 41 | 0 |
| ["Candace Owens"](/content/Media & Influence Pipeline/Right/Candace Owens.md) | 41 | 0 |
| ["Dan Bongino"](/content/Media & Influence Pipeline/Right/Dan Bongino.md) | 41 | 0 |
| ["Jordan Peterson"](/content/Media & Influence Pipeline/Right/Jordan Peterson.md) | 41 | 0 |
| ["Matt Walsh"](/content/Media & Influence Pipeline/Right/Matt Walsh.md) | 41 | 0 |
| [Sherrod Brown](/content/Politicians/Democrats/Former/Sherrod Brown.md) | 0 | 41 |
| ["JPMorgan Chase"](/content/Donors & Power Networks/Wall Street/JPMorgan.md) | 40 | 0 |
| ["Breaking Points with Krystal and Saagar"](/content/Media & Influence Pipeline/Centrist/Breaking Points.md) | 40 | 0 |
| ["Glenn Greenwald"](/content/Media & Influence Pipeline/Centrist/Glenn Greenwald.md) | 40 | 0 |
| ["Nate Silver"](/content/Media & Influence Pipeline/Centrist/Nate Silver.md) | 40 | 0 |
| ["Russell Brand"](/content/Media & Influence Pipeline/Centrist/Russell Brand.md) | 40 | 0 |
| ["Briahna Joy Gray"](/content/Media & Influence Pipeline/Left/Briahna Joy Gray.md) | 40 | 0 |
| ["Kyle Kulinski"](/content/Media & Influence Pipeline/Left/Kyle Kulinski.md) | 40 | 0 |
| ["Sam Seder"](/content/Media & Influence Pipeline/Left/Sam Seder.md) | 40 | 0 |
| ["Tenet Media"](/content/Media & Influence Pipeline/Right/Tenet Media.md) | 40 | 0 |
| ["Chris Cuomo"](/content/Media & Influence Pipeline/Centrist/Chris Cuomo.md) | 39 | 0 |
| ["Joe Rogan"](/content/Media & Influence Pipeline/Centrist/Joe Rogan.md) | 39 | 0 |
| ["John Oliver"](/content/Media & Influence Pipeline/Left/John Oliver.md) | 39 | 0 |
| ["TYT Network - The Young Turks"](/content/Media & Influence Pipeline/Left/TYT Network - The Young Turks.md) | 39 | 0 |
| ["Ben Shapiro"](/content/Media & Influence Pipeline/Right/Ben Shapiro.md) | 39 | 0 |
| ["Christopher Rufo"](/content/Media & Influence Pipeline/Right/Christopher Rufo.md) | 39 | 0 |
| ["Jesse Watters"](/content/Media & Influence Pipeline/Right/Jesse Watters.md) | 39 | 0 |
| [Center for American Progress](/content/Think Tanks & Policy Infrastructure/Liberal/Center for American Progress.md) | 0 | 39 |
| ["Chevron"](/content/Donors & Power Networks/Energy & Utilities/Chevron.md) | 38 | 0 |
| ["Koch network"](/content/Donors & Power Networks/Mega-Donors/Koch network.md) | 38 | 0 |
| ["Senate Leadership Fund"](/content/Donors & Power Networks/Super PACs/Senate Leadership Fund.md) | 38 | 0 |
| ["Ezra Klein"](/content/Media & Influence Pipeline/Centrist/Ezra Klein.md) | 38 | 0 |
| ["Matt Taibbi"](/content/Media & Influence Pipeline/Centrist/Matt Taibbi.md) | 38 | 0 |
| ["Fox News - Murdoch Media Empire"](/content/Media & Influence Pipeline/Fox News - Murdoch Media Empire.md) | 38 | 0 |
| ["James O'Keefe"](/content/Media & Influence Pipeline/Right/James O'Keefe.md) | 38 | 0 |
| ["Tim Pool"](/content/Media & Influence Pipeline/Right/Tim Pool.md) | 38 | 0 |
| ["Blue Shield of California"](/content/Donors & Power Networks/Healthcare/Blue Shield of California.md) | 37 | 0 |
| ["UnitedHealth Group - Optum"](/content/Donors & Power Networks/Healthcare/UnitedHealth Group - Optum.md) | 37 | 0 |
| ["Palantir Technologies"](/content/Donors & Power Networks/Mega-Donors/Palantir.md) | 37 | 0 |
| ["Goldman Sachs"](/content/Donors & Power Networks/Wall Street/Goldman Sachs.md) | 37 | 0 |
| ["Rachel Maddow"](/content/Media & Influence Pipeline/Left/Rachel Maddow.md) | 37 | 0 |
| ["Sean Hannity"](/content/Media & Influence Pipeline/Right/Sean Hannity.md) | 37 | 0 |
| ["Steven Crowder"](/content/Media & Influence Pipeline/Right/Steven Crowder.md) | 37 | 0 |
| ["Haim Saban"](/content/Donors & Power Networks/Israel Lobby/Haim Saban.md) | 36 | 0 |
| ["Joe Scarborough"](/content/Media & Influence Pipeline/Centrist/Joe Scarborough.md) | 36 | 0 |
| ["Nicolle Wallace"](/content/Media & Influence Pipeline/Centrist/Nicolle Wallace.md) | 36 | 0 |
| ["Crooked Media"](/content/Media & Influence Pipeline/Left/Crooked Media.md) | 36 | 0 |
| ["Pod Save America"](/content/Media & Influence Pipeline/Left/Pod Save America.md) | 36 | 0 |
| ["Patrick Bet-David"](/content/Media & Influence Pipeline/Right/Patrick Bet-David.md) | 36 | 0 |
| ["American Petroleum Institute"](/content/Donors & Power Networks/Energy & Utilities/American Petroleum Institute.md) | 35 | 0 |
| [Thom Tillis](/content/Politicians/Republicans/Senate/Thom Tillis/_Thom Tillis Master Profile.md) | 1 | 34 |
| ["DonorsTrust"](/content/Donors & Power Networks/Super PACs/DonorsTrust.md) | 34 | 0 |
| [House Majority PAC](/content/Donors & Power Networks/Super PACs/House Majority PAC.md) | 0 | 34 |
| ["Jake Tapper"](/content/Media & Influence Pipeline/Centrist/Jake Tapper.md) | 34 | 0 |
| ["The Free Press"](/content/Media & Influence Pipeline/Centrist/The Free Press.md) | 34 | 0 |
| ["Cenk Uygur"](/content/Media & Influence Pipeline/Left/Cenk Uygur.md) | 34 | 0 |
| ["Greg Gutfeld"](/content/Media & Influence Pipeline/Right/Greg Gutfeld.md) | 34 | 0 |
| ["Mark Levin"](/content/Media & Influence Pipeline/Right/Mark Levin.md) | 34 | 0 |
| ["Labor - Donors and Backers"](/content/Politicians/Republicans/Presidential/Donald Trump/Labor/Labor - Donors and Backers.md) | 34 | 0 |
| ["Cross-Politician Contradiction Map - The Both-Sides Illusion With Receipts"](/content/Stories/Published/Cross-Politician Contradiction Map - The Both-Sides Illusion With Receipts.md) | 34 | 0 |
| ["ActBlue"](/content/Donors & Power Networks/Dark Money/ActBlue.md) | 33 | 0 |
| ["ConocoPhillips"](/content/Donors & Power Networks/Energy & Utilities/ConocoPhillips.md) | 33 | 0 |
| ["Club for Growth"](/content/Donors & Power Networks/Super PACs/Club for Growth.md) | 33 | 0 |
| ["Ana Kasparian"](/content/Media & Influence Pipeline/Centrist/Ana Kasparian.md) | 33 | 0 |
| [Josh Hawley](/content/Politicians/Republicans/Senate/Josh Hawley/_Josh Hawley Master Profile.md) | 1 | 32 |
| ["Bradley Foundation"](/content/Donors & Power Networks/Dark Money/Bradley Foundation.md) | 32 | 0 |
| … +1309 more drifted profiles | | |

---

*Regenerate: `node scripts/relationship-cache-drift-audit.cjs --write`. Re-run after every cache rebuild to confirm drift closes to zero.*
