---
title: Orphan Citations Report
type: admin-note
note-type: data
priority: normal
status: open
last-updated: 2026-04-14
generator: scripts/sources-orphan-report.cjs
note-kind: report
---

# Orphan Citations Report

Sources in the registry flagged as problematic by the fingerprint pass. Triage in Ops `/sources` or fix directly in profile bodies.

## Summary

- Total sources in registry: **14681**
- Dead (fetch failed or HTTP 4xx/5xx): **539**
- Generic orphan (200 OK but landed on homepage/search): **42**
- Needs review (ambiguous title/path combo): **1041**
- Total flagged: **1622**  (11.0% of registry)

## Triage order

1. **Dead** — hard failures. Fix URL, archive (strikethrough), or replace.
2. **Generic orphan** — the link "works" but the citation is gone. Usually means the site reorganized and the specific page moved. Look for the current URL or archive.
3. **Needs review** — generic title but non-shallow path. Could be a genuine page with a bad title tag, or a soft 404. Eyeball check.

## Flagged sources, grouped by entity

Showing 784 entities with flagged citations, sorted by count.

### media-influence-operations-dossier (59)

- [dead] `src_000062` https://ir.newsmax.com/news/news-details/2025/Newsmax-Announces-Closing-of-75-Million-Initial-Public-Offering/default.aspx "Just a moment..."
- [dead] `src_000063` https://ir.newsmax.com/news/news-details/2024/Newsmax-Files-with-SEC-for-Initial-Public-Offering/default.aspx "Just a moment..."
- [dead] `src_000064` https://ir.newsmax.com/news/news-details/2025/Newsmax-Begins-Initial-Public-Offering-Plans-to-List-on-NYSE/default.aspx "Just a moment..."
- [dead] `src_000067` https://www.forbes.com/sites/giacomotognini/2025/03/31/newsmax-founder-chris-ruddy-is-a-billionaire-thanks-to-stock-surge/ "forbes.com"
- [dead] `src_000070` https://www.sourcewatch.org/index.php?title=SourceWatch?title=SourceWatchindex.php/Richard_Mellon_Scaife "Just a moment..."
- [dead] `src_000072` https://www.investopedia.com/conservative-media-outlet-newsmax-files-for-ipo-8707000 "Simple Page"
- [dead] `src_000075` https://www.moneycontrol.com/world/newsmax-soars-in-meme-stock-frenzy-making-founder-christopher-ruddy-a-multibillionaire-article-12982638.html "Access Denied"
- [dead] `src_000080` https://www.investing.com/equities/newsmax-ownership "Just a moment..."
- [dead] `src_000090` https://www.bloomberg.com/news/articles/2025-02-26/white-house-limits-newswires-in-press-pool-takeover "Bloomberg - Are you a robot?"
- [dead] `src_000091` https://www.axios.com/2025/10/14/pentagon-press-restrictions-trump-journalists-news-outlets "Just a moment..."
- [dead] `src_000092` https://www.newsmax.com/us/directv-censorship-house/2023/01/31/id/1106745/ "Newsmax self-reporting"
- [dead] `src_000093` https://www.politico.com/news/2025/11/28/a-conservative-media-war-erupts-with-both-sides-hoping-trump-is-in-their-corner-00669920 "Just a moment..."
- [dead] `src_000095` https://www.npr.org/2024/09/26/nx-s1-5130183/newsmax-smartmatic-settlement-defamation-election-lawsuit "NPR: "Newsmax, Smartmatic settle 2020 election defamation lawsuit""
- [dead] `src_000096` https://www.reuters.com/business/media-telecom/newsmax-agreed-pay-40-million-settle-defamation-suit-over-2020-false-election-2025-03-13/ "reuters.com"
- [dead] `src_000098` https://www.politico.com/news/2025/08/18/newsmax-dominion-voting-defamation-settlement-00513458 "Just a moment..."
- [dead] `src_000104` https://www.nytimes.com/2020/11/29/business/media/newsmax-chris-ruddy-trump.html "nytimes.com"
- [dead] `src_000106` https://www.bloomberg.com/news/articles/2025-04-01/newsmax-becomes-a-meme-stock-with-1-160-post-ipo-surge "Bloomberg - Are you a robot?"
- [dead] `src_000112` https://www.forbes.com/sites/markjoyella/2022/04/14/newsmax-ceo-chris-ruddy-we-dont-want-to-be-known-as-the-trump-channel/ "forbes.com"
- [dead] `src_000116` https://www.reuters.com/markets/funds/video-platform-rumble-go-public-via-21-bln-spac-deal-2021-12-02/ "reuters.com"
- [dead] `src_000122` https://www.gurufocus.com/insider/222244/christopher-pavlovski "Attention Required! | Cloudflare"
- [dead] `src_000123` https://www.forbes.com/sites/kylemullins/2025/02/25/former-secret-service-agent-turned-deputy-fbi-director-is-already-very-rich/ "forbes.com"
- [dead] `src_000124` https://www.wsj.com/tech/peter-thiel-j-d-vance-invest-in-rumble-video-platform-popular-on-political-right-11621447661 "wsj.com"
- [dead] `src_000134` https://www.forbes.com/sites/kylemullins/2024/12/20/the-jd-vance-backed-youtube-clone-rumble-is-finally-relevant-but-its-running-out-of-cash/ "forbes.com"
- [dead] `src_000143` https://thehill.com/homenews/media/585838-trump-media-company-inks-deal-with-video-platform-rumble/ "Access to this page has been denied"
- [dead] `src_000150` https://www.nasdaq.com/press-release/rumble-announces-livestream-contributions-for-u.s.-federal-political-campaigns-2024 "Nasdaq: Rumble Announces Livestream Contributions for U.S. Federal Political Cam"
- [dead] `src_000153` https://www.forbes.com/sites/kylemullins/2025/01/06/why-the-founder-of-the-right-wing-video-platform-rumble-is-now-a-billionaire/ "forbes.com"
- [dead] `src_000156` https://en.wikipedia.org/wiki/Rumble_(company "Rumble (company - Wikipedia"
- [dead] `src_000159` https://www.padems.org/new-mccormick-refuses-to-pull-investments-from-website-that-platforms-holocaust-denial-and-anti-semitic-hate/ "Attention Required! | Cloudflare"
- [dead] `src_000161` https://www.reuters.com/business/truth-social-host-rumble-weighs-near-12-billion-deal-northern-data-2025-08-11/ "reuters.com"
- [dead] `src_000164` https://www.bloomberg.com/news/articles/2022-07-30/infowars-parent-free-speech-systems-files-for-bankruptcy "Bloomberg - Are you a robot?"
- [dead] `src_000168` https://qz.com/1010684/all-the-wellness-products-american-love-to-buy-are-sold-on-both-infowars-and-goop "Attention Required! | Cloudflare"
- [dead] `src_000173` https://www.nytimes.com/2020/09/22/us/politics/russia-disinformation-election-trump.html "nytimes.com"
- [dead] `src_000176` https://www.npr.org/2022/10/13/1128860654/alex-jones-sandy-hook-families-money-trial "NPR: "Alex Jones has been ordered to pay $1 billion""
- [dead] `src_000177` https://www.npr.org/2022/08/06/1115936712/how-alex-jones-helped-mainstream-conspiracy-theories-into-american-life "NPR: "How Alex Jones helped mainstream conspiracy theories""
- [dead] `src_000187` https://www.nytimes.com/2017/02/19/business/media/alex-jones-conspiracy-theories-donald-trump.html "nytimes.com"
- [dead] `src_000198` https://www.npr.org/2024/11/14/nx-s1-5189399/alex-jones-auction-infowars-bankruptcy-sandy-hook "NPR: "Alex Jones' Infowars sold to The Onion at auction""
- [dead] `src_000200` https://www.nytimes.com/2025/08/14/us/infowars-sale-alex-jones-sandy-hook.html "nytimes.com"
- [dead] `src_000201` https://www.npr.org/2025/08/13/nx-s1-5501648/alex-jones-infowars-receiver "NPR: "Infowars conspiracist Alex Jones loses another legal battle""
- [dead] `src_000203` https://www.nytimes.com/2024/11/14/business/media/alex-jones-infowars-the-onion.html "nytimes.com"
- [dead] `src_000205` https://www.courthousenews.com/infowars-alex-jones-sued-by-conspiracy-theorist-corsi/ "Attention Required! | Cloudflare"
- [dead] `src_000206` https://www.nytimes.com/2018/09/04/technology/alex-jones-infowars-bans-traffic.html "nytimes.com"
- [dead] `src_000212` https://www.washingtonpost.com/nation/2018/12/18/roger-stone-admits-he-pushed-false-statements-infowars/ "U.S. District Court for the Southern District of Florida"
- [dead] `src_000214` https://www.nytimes.com/2022/05/20/us/politics/roger-stone-jan-6.html "nytimes.com"
- [dead] `src_000218` https://www.nytimes.com/2016/11/17/us/politics/alex-jones-trump-call.html "nytimes.com"
- [dead] `src_000220` https://www.axios.com/2017/12/15/alex-jones-claims-hes-in-regular-contact-with-trump-1513300668 "Just a moment..."
- [dead] `src_000226` https://en.wikisource.org/wiki/Deposition_of_Caroline_Wren,_(Dec._17,_2021 "Deposition of Caroline Wren, (Dec. 17, 2021 - Wikisource, the free online librar"
- [dead] `src_000227` https://www.wsj.com/politics/policy/jan-6-rally-funded-by-top-trump-donor-helped-by-alex-jones-organizers-say-11612012063 "wsj.com"
- [dead] `src_000228` https://www.nytimes.com/2022/03/07/us/politics/alex-jones-jan-6-trump.html "nytimes.com"
- [dead] `src_000229` https://www.washingtonpost.com/dc-md-va/2023/03/07/proud-boys-alex-jones-jan-6/ "Washington Post (March 7, 2023)"
- [dead] `src_000231` https://www.usnews.com/news/national-news/articles/2022-08-08/jan-6-committee-receives-infowars-alex-jones-cell-records-after-lawyer-flub "U.S. News (August 2022)"
- [dead] `src_000238` https://www.politico.com/news/2022/04/18/oath-keepers-security-trump-jan6-00026157 "Just a moment..."
- [dead] `src_000242` https://thehill.com/blogs/blog-briefing-room/3606082-alex-jones-backs-a-possible-2024-desantis-bid-over-potential-trump-bid/ "Access to this page has been denied"
- [dead] `src_000251` https://www.cbc.ca/news/investigates/russian-influence-election-tenet-media-chen-southern-1.7314976 "CBC investigation"
- [dead] `src_000253` https://www.reuters.com/technology/youtube-terminating-tenet-media-channel-after-us-indictment-2024-09-06/ "reuters.com"
- [dead] `src_000258` https://www.reuters.com/world/us/social-media-platforms-leave-alleged-russian-influence-network-largely-untouched-2024-09-06/ "reuters.com"
- [dead] `src_000263` https://www.forbes.com/sites/maryroeloffs/2024/09/05/who-are-tim-pool-and-benny-johnson-what-to-know-about-the-six-right-wing-commentators-doj-alleges-were-funded-by-russia/ "forbes.com"
- [dead] `src_000273` https://www.forbes.com/sites/tylerroush/2024/09/06/who-is-lauren-chen-what-to-know-about-the-influencer-behind-alleged-russia-funded-outlet/ "forbes.com"
- [dead] `src_000276` https://asamnews.com/2024/11/07/lauren-chen-tenet-media-committee/ "Just a moment..."
- [dead] `src_000279` https://www.cbc.ca/news/politics/russia-disinformation-tenet-putin-1.7319469 "CBC deep dive"

### Sources Master Node (17)

- [dead] `src_000298` https://api.open.fec.gov/v1/
- [dead] `src_000299` https://api.usaspending.gov/api/v2/ "Not Found"
- [dead] `src_000303` https://www.fppc.ca.gov/ "fppc.ca.gov"
- [dead] `src_000304` https://api.congress.gov/v3/
- [dead] `src_000305` https://www.congress.gov → https://www.congress.gov/ "Just a moment..."
- [dead] `src_000314` https://calmatters.org/search "Page not found - CalMatters"
- [dead] `src_000316` https://www.washingtonpost.com/search "washingtonpost.com"
- [dead] `src_000317` https://www.npr.org/search "npr.org"
- [dead] `src_000319` https://thehill.com/ "Access to this page has been denied"
- [dead] `src_000321` https://www.politico.com/search "Just a moment..."
- [dead] `src_000334` https://www.opensecrets.org/revolving/ "Just a moment..."
- [dead] `src_000337` https://sunlightfoundation.com/ "sunlightfoundation.com"
- [dead] `src_000340` https://www.congress.gov/search?q=Jim%20Jordan&searchResultViewType=expanded "Just a moment..."
- [generic_orphan] `src_000302` https://www.followthemoney.org/ "Home - FollowTheMoney.org"
- [generic_orphan] `src_000307` https://www.house.gov → https://www.house.gov/ "Homepage | house.gov"
- [generic_orphan] `src_000318` https://www.cnn.com/search "Search | CNN"
- [generic_orphan] `src_000338` https://littlesis.org/ "Home - Little Sis"

### Google - Alphabet (12)

- [dead] `src_009335` https://www.npr.org/2024/08/05/nx-s1-5064624/google-justice-department-antitrust-search "NPR: Google loses antitrust case"
- [dead] `src_009336` https://www.npr.org/2025/09/02/nx-s1-5478625/google-chrome-doj-antitrust-ruling "NPR: Judge lets Google keep Chrome (Sept 2025)"
- [needs_review] `src_009323` https://www.opensecrets.org/orgs/alphabet-inc/summary?id=D000067823 "Just a moment..."
- [needs_review] `src_009329` https://www.opensecrets.org/orgs/alphabet-inc/recipients?id=D000067823 "Just a moment..."
- [needs_review] `src_009330` https://www.opensecrets.org/political-action-committees-pacs/google-inc/C00428623/summary/2024 "Just a moment..."
- [needs_review] `src_009331` https://www.opensecrets.org/political-action-committees-pacs/google-inc/C00428623/candidate-recipients/2022 "Just a moment..."
- [needs_review] `src_009339` https://bipartisanpolicy.org/article/gonzalez-v-google/ "Just a moment..."
- [needs_review] `src_009347` https://www.opensecrets.org/political-action-committees-pacs/google-inc/C00428623/summary/2022 "Just a moment..."
- [needs_review] `src_009348` https://www.opensecrets.org/political-action-committees-pacs/google-inc/C00428623/summary/2020 "Just a moment..."
- [needs_review] `src_009349` https://www.opensecrets.org/political-action-committees-pacs/google-inc/C00428623/summary/2018 "Just a moment..."
- [needs_review] `src_009350` https://www.opensecrets.org/political-action-committees-pacs/google-inc/C00428623/summary/2016 "Just a moment..."
- [needs_review] `src_009354` https://www.nhtsa.gov/recalls?manufacturer=Google%20-%20Alphabet "Access Denied"

### GEO Group - Private Prison Industrial Complex (11)

- [dead] `src_014325` https://investors.geogroup.com/news-releases/news-release-details/geo-group-reports-fourth-quarter-and-full-year-2025-results "GEO Group Q4 and Full Year 2025 Results"
- [dead] `src_014357` https://www.npr.org/sections/codeswitch/2014/03/13/289000532/why-for-profit-prisons-house-more-inmates-of-color "NPR: Why for-profit prisons house more inmates of color"
- [dead] `src_014362` https://investors.geogroup.com/news-releases/news-release-details/geo-group-awarded-contract-us-immigration-and-customs-1 "GEO Group: BI awarded skip tracing contract"
- [needs_review] `src_014330` https://www.opensecrets.org/political-action-committees-pacs/C00382150/summary/2024 "Just a moment..."
- [needs_review] `src_014331` https://www.opensecrets.org/orgs/geo-group/recipients?id=D000022003 "Just a moment..."
- [needs_review] `src_014332` https://www.opensecrets.org/orgs/geo-group/totals?id=D000022003 "Just a moment..."
- [needs_review] `src_014336` https://www.americanprogress.org/article/trumps-executive-order-rewards-private-prison-campaign-donors/ "Just a moment..."
- [needs_review] `src_014337` https://www.opensecrets.org/orgs/geo-group/lobbying?id=D000022003 "Just a moment..."
- [needs_review] `src_014345` https://www.americanprogress.org/article/congressional-republicans-one-big-beautiful-bill-act-creates-an-unaccountable-slush-fund-for-the-trump-administrations-deportation-force/ "Just a moment..."
- [needs_review] `src_014350` https://www.opensecrets.org/news/2021/02/biden-phases-out-private-prisons/ "Just a moment..."
- [needs_review] `src_014365` https://www.nhtsa.gov/recalls?manufacturer=GEO%20Group%20-%20Private%20Prison%20Industrial%20Complex "Access Denied"

### Pfizer Inc. (10)

- [dead] `src_010439` https://www.npr.org/sections/health-shots/2020/11/24/938591815/pfizers-coronavirus-vaccine-supply-contract-excludes-many-taxpayer-protections "NPR: Pfizer's Warp Speed Vaccine Supply Contract"
- [dead] `src_010440` https://www.npr.org/2025/08/05/nx-s1-5493550/rfk-jr-funding-mrna-vaccine-development "NPR: RFK Jr. Pulls $500M in mRNA Vaccine Contracts"
- [needs_review] `src_010433` https://www.opensecrets.org/orgs/pfizer-inc/summary?id=D000000138 "Just a moment..."
- [needs_review] `src_010434` https://www.opensecrets.org/political-action-committees-pacs/pfizer-inc/C00016683/summary/2024 "Just a moment..."
- [needs_review] `src_010435` https://www.opensecrets.org/political-action-committees-pacs/pfizer-inc/C00016683/candidate-recipients/2024 "Just a moment..."
- [needs_review] `src_010436` https://www.hhs.gov/sites/default/files/pfizer-inc-covid-19-vaccine-contract.pdf "Access Denied"
- [needs_review] `src_010437` https://www.hhs.gov/press-room/hhs-winds-down-mrna-development-under-barda.html "Access Denied"
- [needs_review] `src_010442` https://www.opensecrets.org/news/2023/02/despite-record-federal-lobbying-spending-the-pharmaceutical-and-health-product-industry-lost-their-biggest-legislative-bet-in-2022/ "Just a moment..."
- [needs_review] `src_010447` https://qz.com/1656529/yet-another-fda-commissioner-joins-the-pharmaceutical-industry "Attention Required! | Cloudflare"
- [needs_review] `src_010467` https://www.nhtsa.gov/recalls?manufacturer=Pfizer%20Inc "Access Denied"

### General Motors (10)

- [dead] `src_012259` https://www.federalregister.gov/documents/2026/03/16/2026-05029/daimler-coaches-north-america-llc-denial-of-petition-for-decision-of-inconsequential-noncompliance "Daimler Coaches North America, LLC, Denial of Petition for Decision of Inconsequ"
- [dead] `src_012262` https://www.federalregister.gov/documents/search?conditions%5Bterm%5D=%22General%20Motors%22 "Source: Federal Register"
- [needs_review] `src_012247` https://www.opensecrets.org/orgs/general-motors/summary?id=D000000155 "Just a moment..."
- [needs_review] `src_012263` https://www.nhtsa.gov/recalls?nhtsaId=26V213000 "Access Denied"
- [needs_review] `src_012264` https://www.nhtsa.gov/recalls?nhtsaId=26V212000 "Access Denied"
- [needs_review] `src_012265` https://www.nhtsa.gov/recalls?nhtsaId=26V166000 "Access Denied"
- [needs_review] `src_012266` https://www.nhtsa.gov/recalls?nhtsaId=26V129000 "Access Denied"
- [needs_review] `src_012267` https://www.nhtsa.gov/recalls?nhtsaId=26V127000 "Access Denied"
- [needs_review] `src_012268` https://www.nhtsa.gov/recalls?nhtsaId=26V114000 "Access Denied"
- [needs_review] `src_012269` https://www.nhtsa.gov/recalls?manufacturer=General%20Motors "Access Denied"

### Defense-Pharma-Carceral-Labor-Wexner Cross-Reference: Five Donors, One System (10)

- [needs_review] `src_001452` https://www.opensecrets.org/orgs/rtx-corp/summary?id=D000072615 "Just a moment..."
- [needs_review] `src_001453` https://www.opensecrets.org/political-action-committees-pacs/rtx-corp/C00097568/candidate-recipients/2024 "Just a moment..."
- [needs_review] `src_001454` https://www.opensecrets.org/orgs/pharmaceutical-research-manufacturers-of-america/summary?id=D000000504 "Just a moment..."
- [needs_review] `src_001455` https://www.opensecrets.org/orgs/pharmaceutical-research-manufacturers-of-america/recipients?id=D000000504 "Just a moment..."
- [needs_review] `src_001456` https://www.opensecrets.org/orgs/geo-group/summary?id=D000022003 "Just a moment..."
- [needs_review] `src_001457` https://www.opensecrets.org/orgs/united-auto-workers/summary?id=d000000070 "Just a moment..."
- [needs_review] `src_001458` https://www.opensecrets.org/news/2023/01/defense-sector-contributed-heavily-to-45-senators-who-secured-1-8-billion-in-military-construction-earmarks "Just a moment..."
- [needs_review] `src_001459` https://www.opensecrets.org/news/2022/08/victorias-secret-founder-donates-big-to-gop/ "Just a moment..."
- [needs_review] `src_001472` https://www.pogo.org/investigates/ice-inc-the-top-companies-profiting-from-trumps-immigration-crackdown "Attention Required! | Cloudflare"
- [needs_review] `src_001473` https://www.americanprogress.org/article/private-prisons-profiting-trump-administration/ "Just a moment..."

### Geographic Donor Clustering - Where the Money Actually Comes From (9)

- [dead] `src_001214` https://www.fec.gov/data/candidate/S0GA00559/ "FEC Candidate: Raphael Warnock Campaign Finance Summary"
- [dead] `src_001215` https://www.fec.gov/data/candidate/H8GA06195/ "FEC Candidate: Jon Ossoff Campaign Finance Summary"
- [dead] `src_001218` https://www.fec.gov/data/candidate/S2AL00145/ "FEC Candidate: Katie Britt Campaign Finance Summary"
- [needs_review] `src_001208` https://www.opensecrets.org/news/reports/out-of-state-donations "Just a moment..."
- [needs_review] `src_001209` https://www.opensecrets.org/elections-overview/in-state-vs-out-of-state "Just a moment..."
- [needs_review] `src_001213` https://missouriindependent.com/2023/10/23/hawley-kunce-draw-heavily-on-donors-outside-missouri-to-fuel-u-s-senate-campaigns/ "Just a moment..."
- [needs_review] `src_001223` https://www.opensecrets.org/news/reports/outside-money-inside-influence "Just a moment..."
- [needs_review] `src_001224` https://www.opensecrets.org/news/2025/05/special-report-how-national-donors-shaped-the-2024-congressional-elections "Just a moment..."
- [needs_review] `src_001227` https://www.opensecrets.org/elections-overview "Just a moment..."

### Ford Motor Company (9)

- [dead] `src_012244` https://www.federalregister.gov/documents/search?conditions%5Bterm%5D=%22Ford%20Motor%20Company%22 "Source: Federal Register"
- [needs_review] `src_012220` https://www.opensecrets.org/orgs/ford-motor-co/summary?id=D000000093 "Just a moment..."
- [needs_review] `src_012225` https://www.nhtsa.gov/recalls?manufacturer=Ford%20Motor%20Company "Access Denied"
- [needs_review] `src_012226` https://www.nhtsa.gov/recalls?nhtsaId=26V205000 "Access Denied"
- [needs_review] `src_012227` https://www.nhtsa.gov/recalls?nhtsaId=26V204000 "Access Denied"
- [needs_review] `src_012228` https://www.nhtsa.gov/recalls?nhtsaId=26V202000 "Access Denied"
- [needs_review] `src_012229` https://www.nhtsa.gov/recalls?nhtsaId=26V201000 "Access Denied"
- [needs_review] `src_012230` https://www.nhtsa.gov/recalls?nhtsaId=26V165000 "Access Denied"
- [needs_review] `src_012231` https://www.nhtsa.gov/recalls?nhtsaId=26V159000 "Access Denied"

### Fanjul Family - Florida Crystals (9)

- [dead] `src_014515` https://www.npr.org/2022/11/29/1139765236/u-s-bans-dominican-sugar-company-over-forced-labor "NPR: US Bans Dominican Sugar Company Over Forced Labor"
- [dead] `src_014517` https://www.npr.org/2013/10/10/230952946/what-ever-happened-to-the-deal-to-save-the-everglades "NPR: Whatever Happened to the Deal to Save the Everglades?"
- [dead] `src_014533` https://misiones.cubaminrex.cu/en/articulo/biden-signed-law-preventing-renewal-havana-club-brand-us "Cubaminrex: Biden signed a law preventing renewal of Havana Club brand in US"
- [needs_review] `src_014507` https://www.opensecrets.org/orgs/fanjul-corp/recipients?id=D000066714 "Just a moment..."
- [needs_review] `src_014508` https://www.opensecrets.org/political-action-committees-pacs/florida-sugar-cane-league/C00012328/summary/2024 "Just a moment..."
- [needs_review] `src_014509` https://www.gao.gov/products/gao-24-106144 "Access Denied"
- [needs_review] `src_014511` https://www.congress.gov/crs-product/IF11336 "Just a moment..."
- [needs_review] `src_014525` https://www.tandfonline.com/doi/full/10.1080/13439006.2025.2513207 "Just a moment..."
- [needs_review] `src_014542` https://encyclopedia.pub/entry/34575 "Access Denied"

### American Farm Bureau Federation (8)

- [dead] `src_014419` https://www.usda.gov/about-usda/news/press-releases/2025/12/08/trump-administration-announces-12-billion-farmer-bridge-payments-american-farmers-impacted-unfair "USDA: Farmer Bridge Assistance Announcement (Dec 2025)"
- [dead] `src_014424` https://www.npr.org/2018/07/24/631953880/trump-administration-to-provide-farmers-12-billion-to-offset-tariffs "NPR: Trump Administration Announcing $12 Billion in Farm Payments"
- [needs_review] `src_014416` https://projects.propublica.org/nonprofits/download-filing?path=IRS%2F360725160_202311_990O_2024121122947525.pdf "Security Check — ProPublica"
- [needs_review] `src_014417` https://www.opensecrets.org/orgs/american-farm-bureau/summary?id=D000021832 "Just a moment..."
- [needs_review] `src_014418` https://www.opensecrets.org/political-action-committees-pacs/industry-detail/A6500/2022 "Just a moment..."
- [needs_review] `src_014422` https://civileats.com/2020/11/02/how-four-years-of-trump-reshaped-food-and-farming/
- [needs_review] `src_014428` https://missouriindependent.com/2022/02/15/american-farm-bureau-federation-claims-its-the-voice-of-agriculture-others-beg-to-differ/ "Just a moment..."
- [needs_review] `src_014439` https://www.courtlistener.com/?q=%22American%20Farm%20Bureau%20Federation%22&type=r "ERROR: The request could not be satisfied"

### Contradiction 20 — Tech Monopolies Buy Antitrust Protection From Both Parties (8)

- [needs_review] `src_001841` https://www.axios.com/pro/tech-policy/2024/01/23/2023-tech-lobbying-in-review "Just a moment..."
- [needs_review] `src_001843` https://www.opensecrets.org/news/2022/12/big-tech-lobbying-push-helped-block-bipartisan-bills-that-aimed-to-curb-alleged-anti-competitive-behavior/ "Just a moment..."
- [needs_review] `src_001855` https://www.opensecrets.org/orgs/alphabet-inc/totals?id=d000067823 "Just a moment..."
- [needs_review] `src_001856` https://www.opensecrets.org/political-action-committees-pacs/google-inc/C00428623/candidate-recipients/2024 "Just a moment..."
- [needs_review] `src_001857` https://www.opensecrets.org/political-action-committees-pacs/C00360354/candidate-recipients/2024 "Just a moment..."
- [needs_review] `src_001858` https://www.opensecrets.org/political-action-committees-pacs/microsoft-corp/C00227546/candidate-recipients/2024 "Just a moment..."
- [needs_review] `src_001859` https://www.opensecrets.org/political-action-committees-pacs/facebook-inc/C00502906/candidate-recipients/2024 "Just a moment..."
- [needs_review] `src_001863` https://www.politico.com/news/2022/05/26/vulnerable-senate-democrats-back-off-big-tech-bill-00035307 "Just a moment..."

### Session History Archive (7)

- [dead] `src_000284` https://www.npr.org/search?query=david+sacks+ai+advisor+investment+conflicts "NPR: David Sacks AI advisor investment conflicts"
- [dead] `src_000286` https://www.npr.org/search?query=tulsi+gabbard+confirmed+dni+intelligence+senate "NPR: Tulsi Gabbard confirmed DNI"
- [dead] `src_000287` https://www.exposedbycmd.org/2023/07/25/alecs-funding-revealed/ "Just a moment..."
- [dead] `src_000288` https://www.exposedbycmd.org/2021/08/20/bradley-foundation-bankrolls-controversial-alec-voter-software "Just a moment..."
- [dead] `src_000292` https://www.opensecrets.org/political-action-committees-pacs/justice-democrats/C00630665/summary/2024 "Just a moment..."
- [dead] `src_000293` https://www.opensecrets.org/political-action-committees-pacs/our-revolution-pac/C00676684/donors/2024 "Just a moment..."
- [dead] `src_000294` https://thehill.com/elections/4785224-harris-campaign-fundraising-actblue/ "Access to this page has been denied"

### Fairshake PAC (7)

- [dead] `src_009273` https://www.nasdaq.com/articles/trump-nominates-paul-atkins-replace-gensler-sec-chair "Nasdaq: Trump nominates Paul Atkins"
- [needs_review] `src_009225` https://www.opensecrets.org/political-action-committees-pacs/defend-american-jobs/C00836221/summary/2024 "Just a moment..."
- [needs_review] `src_009226` https://www.opensecrets.org/political-action-committees-pacs/protect-progress/C00848440/summary/2024 "Just a moment..."
- [needs_review] `src_009227` https://www.opensecrets.org/races/outside-spending?cycle=2024&id=OHS1 "Just a moment..."
- [needs_review] `src_009231` https://www.politico.com/live-updates/2026/01/28/congress/crypto-super-pac-war-chest-00752834 "Just a moment..."
- [needs_review] `src_009234` https://www.axios.com/2025/03/14/david-sacks-crypto-assets "Just a moment..."
- [needs_review] `src_009254` https://dailycoin.com/ripples-25m-bet-on-pro-crypto-politics-shakes-up-dc/ "Just a moment..."

### ExxonMobil (7)

- [dead] `src_012635` https://www.federalregister.gov/documents/search?conditions%5Bterm%5D=%22ExxonMobil%22 "Source: Federal Register"
- [needs_review] `src_012595` https://www.opensecrets.org/orgs/exxon-mobil/summary?id=D000000129 "Just a moment..."
- [needs_review] `src_012596` https://www.opensecrets.org/political-action-committees-pacs/C00121368/summary/2024 "Just a moment..."
- [needs_review] `src_012597` https://www.opensecrets.org/orgs/exxon-mobil/totals?id=D000000129 "Just a moment..."
- [needs_review] `src_012598` https://www.opensecrets.org/orgs/exxon-mobil/recipients?id=D000000129 "Just a moment..."
- [needs_review] `src_012603` https://www.americanprogress.org/article/2011-was-very-good-to-exxonmobil/ "Just a moment..."
- [needs_review] `src_012628` https://www.nhtsa.gov/recalls?manufacturer=ExxonMobil "Access Denied"

### Leidos (7)

- [dead] `src_013305` https://investors.leidos.com/news-releases/news-release-details/leidos-receives-three-disa-awards-launch-next-phase-it "Leidos Investor Relations: Three DISA awards for DoDNet modernization"
- [dead] `src_013333` https://www.federalregister.gov/documents/search?conditions%5Bterm%5D=%22Leidos%22 "Source: Federal Register"
- [needs_review] `src_013300` https://www.opensecrets.org/orgs/leidos-inc/summary?id=D000000369 "Just a moment..."
- [needs_review] `src_013301` https://www.opensecrets.org/orgs/leidos-inc/lobbying?id=D000000369 "Just a moment..."
- [needs_review] `src_013302` https://www.opensecrets.org/political-action-committees-pacs/leidos-inc/C00546234/candidate-recipients/2024 "Just a moment..."
- [needs_review] `src_013309` https://www.pogo.org/analyses/from-battlefield-to-boardroom-facilitating-dod-revolving-door "Attention Required! | Cloudflare"
- [needs_review] `src_013327` https://www.nhtsa.gov/recalls?manufacturer=Leidos "Access Denied"

### Economic Policy Institute (6)

- [dead] `src_000484` https://www.epi.org/publication/the-workers-think-tank-a-history-of-the-economic-policy-institute/ "Attention Required! | Cloudflare"
- [dead] `src_000486` https://www.epi.org/publication/raising-the-federal-minimum-wage-to-15-by-2025-would-lift-the-pay-of-32-million-workers/ "Attention Required! | Cloudflare"
- [dead] `src_000490` https://www.npr.org/2021/05/10/995542715/longtime-afl-cio-official-takes-up-key-labor-post-in-biden-administration "NPR: Longtime AFL-CIO official takes up key labor post in Biden administration ("
- [dead] `src_000492` https://www.opensecrets.org/orgs/economic-policy-institute/summary?id=D000077354 "Just a moment..."
- [dead] `src_000494` https://www.epi.org/publication/unprecedented-the-trump-nlrbs-attack-on-workers-rights/ "Attention Required! | Cloudflare"
- [dead] `src_000496` https://www.epi.org/policywatch/ "Attention Required! | Cloudflare"

### American Enterprise Institute (6)

- [dead] `src_000611` https://www.washingtonpost.com/news/wonk/wp/2014/02/24/exclusive-one-of-washingtons-wealthiest-is-giving-20-million-to-a-top-conservative-think-tank/ "Washington Post: Carlyle Group co-founder gives $20 million to AEI (Feb 2014)"
- [dead] `src_000617` https://www.washingtonpost.com/archive/politics/2007/02/05/aei-critiques-of-warming-questioned-span-classbankheadthink-tank-defends-money-offers-to-challenge-climate-reportspan/b839bc0d-f562-4a20-bd23-623ee7b58532/ "Washington Post: AEI critiques of warming questioned (Feb 2007)"
- [dead] `src_000642` https://taxpolicycenter.org/taxvox/will-corporate-tax-cuts-really-increase-worker-incomes-4000 "Attention Required! | Cloudflare"
- [dead] `src_000643` https://www.epi.org/blog/the-trump-administration-doubles-down-on-why-trickle-down-really-does-work-in-the-wall-street-journal/ "Attention Required! | Cloudflare"
- [dead] `src_000651` https://www.newsmax.com/us/american-enterprise-institute-carlyle-group-daniel-daniello/2014/02/25/id/554626/ "Newsmax: Carlyle's D'Aniello $20M gift to AEI (2014)"
- [dead] `src_000656` https://www.opensecrets.org/news/2023/04/harlan-and-kathy-crow-ramped-up-political-contributions-over-the-decades-since-meeting-u-s-supreme-court-justice-clarence-thomas/ "Just a moment..."

### Federalist Society (6)

- [dead] `src_000737` https://www.opensecrets.org/orgs/federalist-society/summary?id=D000080363 "Just a moment..."
- [dead] `src_000738` https://fedsoc.org/commentary/fedsoc-blog/sheldon-gilbert-to-become-next-federalist-society-president-and-ceo "Just a moment..."
- [dead] `src_000755` https://www.courthousenews.com/house-gop-slam-d-c-attorney-general-investigating-leonard-leo-nonprofits/ "Attention Required! | Cloudflare"
- [dead] `src_013869` https://www.npr.org/2025/12/22/nx-s1-5651990/heritage-foundation-mike-pence "NPR: Heritage Foundation Staff Walkout"
- [needs_review] `src_013859` https://www.opensecrets.org/orgs/federalist-society/totals?id=D000080363 "Just a moment..."
- [needs_review] `src_013863` https://19thnews.org/2025/01/trump-judges-federal-judiciary/ "Attention Required! | Cloudflare"

### Crypto Industry Buys Both Parties in One Cycle (6)

- [dead] `src_001629` https://www.npr.org/2025/07/17/nx-s1-5451413/crypto-week-stablecoin-genius-act-trump "NPR: "A 'Crypto Week' Win: Congress Passes 1st Major Crypto Legislation in the U"
- [needs_review] `src_001613` https://www.opensecrets.org/political-action-committees-pacs/fairshake-pac/C00835959/expenditures/2024 "Just a moment..."
- [needs_review] `src_001614` https://www.opensecrets.org/political-action-committees-pacs/fairshake-pac/C00835959/summary/2024 "Just a moment..."
- [needs_review] `src_001617` https://www.opensecrets.org/news/2024/11/the-crypto-trio-how-the-cryptocurrency-industry-has-made-its-mark-on-2024-elections/ "Just a moment..."
- [needs_review] `src_001618` https://www.axios.com/2024/08/22/crypto-election-spending-2024-pac-public-citizen "Just a moment..."
- [needs_review] `src_001624` https://www.axios.com/2024/02/28/fairshake-crypto-pac-katie-porter-ads-california-senate "Just a moment..."

### 2026-03-27 Story Discovery (6)

- [dead] `src_002512` https://www.epw.senate.gov/public/public/index.cfm/press-releases-democratic?ID=0645B6F7-8B1A-4831-8E23-ABF90E0A57A2 "404"
- [dead] `src_002518` https://www.npr.org/2026/02/04/nx-s1-5698264/trump-wyden-van-hollen-tariffs-politically-connected-companies "NPR: Trump grants tariff breaks to 'politically connected' companies, Senate Dem"
- [dead] `src_002527` https://www.npr.org/2026/01/16/nx-s1-5678915/trumprx-pharma-drug-price-deals-list-prices "NPR: Trump struck deals with 16 drug companies. But they're still raising prices"
- [needs_review] `src_002514` https://coloradonewsline.com/2026/01/15/trump-donor-benefits-from-policy-changes/ "Just a moment..."
- [needs_review] `src_002517` https://www.opensecrets.org/trump/2025-inauguration-donors "Just a moment..."
- [needs_review] `src_002521` https://www.theblock.co/post/383241/crypto-regulation-2026-sec-ambitious-agenda-empowered-cftc "Attention Required! | Cloudflare"

### Operation Southern Spear and the Cuba Fuel Blockade (6)

- [dead] `src_002868` https://www.npr.org/2026/03/16/nx-s1-5749457/cuba-blackout-sanctions-oil "NPR: Cuba hit by island-wide blackout as energy crisis deepens"
- [dead] `src_002871` https://www.npr.org/2026/03/30/nx-s1-5765971/trump-allows-russia-oil-tanker-relief-cuba-blockade "NPR: Trump says he has 'no problem' with Russian oil tanker bringing relief to C"
- [needs_review] `src_002866` https://www.southcom.mil/News/PressReleases/Article/4444436/lethal-kinetic-strike-march-25-2026/ "Access Denied"
- [needs_review] `src_002867` https://www.southcom.mil/News/PressReleases/Article/4406922/lethal-kinetic-strike-feb-13-2026/ "Access Denied"
- [needs_review] `src_002879` https://www.opensecrets.org/orgs/fanjul-corp/summary?id=D000066714 "Just a moment..."
- [needs_review] `src_002882` https://idahocapitalsun.com/2026/03/25/idaho-budget-committee-co-chairmans-pac-accepts-200000-contribution/ "Just a moment..."

### The Billion-Dollar Campaign - 2024 Finance (6)

- [dead] `src_005027` https://www.fec.gov/data/committee/C00703975/ "FEC. Fight for the People PAC committee overview"
- [needs_review] `src_005013` https://www.opensecrets.org/2024-presidential-race/kamala-harris/candidate?id=N00036915 "Just a moment..."
- [needs_review] `src_005016` https://www.opensecrets.org/2024-presidential-race/kamala-harris/contributors?id=N00036915 "Just a moment..."
- [needs_review] `src_005017` https://www.opensecrets.org/2024-presidential-race/kamala-harris/industries?id=N00036915 "Just a moment..."
- [needs_review] `src_005020` https://www.opensecrets.org/political-action-committees-pacs/future-forward-usa/C00669259/summary/2024 "Just a moment..."
- [needs_review] `src_005021` https://www.opensecrets.org/outside-spending/detail/2024?cmte=Future+Forward+USA "Just a moment..."

### Tucker Carlson (6)

- [dead] `src_007347` https://www.npr.org/2023/04/24/1171641969/fox-news-fires-tucker-carlson-in-stunning-move-a-week-after-787-million-settleme "NPR: Tucker Carlson ousted at Fox News amid Dominion lawsuit"
- [dead] `src_007354` https://www.npr.org/2023/04/25/1171800317/how-tucker-carlsons-extremist-narratives-shaped-fox-news-and-conservative-politi "NPR: How Tucker Carlson mainstreamed fringe conspiracy theories"
- [dead] `src_007355` https://www.npr.org/2022/05/12/1098488908/has-tucker-carlson-created-the-most-racist-show-in-the-history-of-cable-news "NPR: Has Tucker Carlson created the most racist show in the history of cable new"
- [dead] `src_007357` https://www.npr.org/2024/02/08/1230024588/tucker-carlson-putin-interview-video "NPR: Tucker Carlson's two-hour interview of Vladimir Putin"
- [dead] `src_007359` https://www.nasdaq.com/press-release/tucker-carlson-introduces-alp-revolutionary-new-nicotine-pouch-company-2024-11-14 "Nasdaq: Tucker Carlson Introduces ALP, A Revolutionary New Nicotine Pouch Compan"
- [needs_review] `src_007352` https://www.axios.com/2023/07/17/tucker-carlson-ad-deal-new-media-company "Just a moment..."

### JPMorgan Chase (6)

- [dead] `src_008891` https://www.npr.org/sections/thetwo-way/2013/11/19/246143595/j-p-morgan-chase-will-pay-13-billion-in-record-settlement "NPR: JPMorgan Chase Will Pay $13 Billion In Record Settlement"
- [dead] `src_008894` https://www.npr.org/2011/01/06/132713962/Obama-Taps-William-Daley-As-Chief-Of-Staff "NPR: Obama Taps William Daley As Chief Of Staff"
- [needs_review] `src_008887` https://www.opensecrets.org/orgs/jpmorgan-chase-co/summary?id=d000000103 "Just a moment..."
- [needs_review] `src_008888` https://www.opensecrets.org/orgs/jpmorgan-chase-co/lobbying?id=D000000103 "Just a moment..."
- [needs_review] `src_008889` https://www.opensecrets.org/political-action-committees-pacs/jpmorgan-chase-co/C00104299/summary/2024 "Just a moment..."
- [needs_review] `src_008911` https://www.nhtsa.gov/recalls?manufacturer=JPMorgan%20Chase "Access Denied"

### Amazon (6)

- [dead] `src_009084` https://www.npr.org/2021/04/09/982139494/its-a-no-amazon-warehouse-workers-vote-against-unionizing-in-historic-election "NPR: Amazon Union. Third Election Ordered at Bessemer"
- [needs_review] `src_009077` https://www.opensecrets.org/orgs/amazon-com/summary?id=D000023883 "Just a moment..."
- [needs_review] `src_009078` https://www.opensecrets.org/political-action-committees-pacs/amazon-com/C00360354/summary/2024 "Just a moment..."
- [needs_review] `src_009079` https://www.opensecrets.org/political-action-committees-pacs/amazon-com/C00360354/candidate-recipients/2024 "Just a moment..."
- [needs_review] `src_009094` https://www.datacenterdynamics.com/en/news/report-cia-gives-amazon-us600m-cloud-contract/ "Just a moment..."
- [needs_review] `src_009106` https://www.nhtsa.gov/recalls?manufacturer=Amazon "Access Denied"

### Real Estate Board of New York (6)

- [dead] `src_010148` https://www.federalregister.gov/documents/2023/09/14/2023-18660/private-fund-advisers-documentation-of-registered-investment-adviser-compliance-reviews "Private Fund Advisers; Documentation of Registered Investment Adviser Compliance"
- [dead] `src_010149` https://www.federalregister.gov/documents/2023/08/03/2023-15124/money-market-fund-reforms-form-pf-reporting-requirements-for-large-liquidity-fund-advisers-technical "Money Market Fund Reforms; Form PF Reporting Requirements for Large Liquidity Fu"
- [dead] `src_010150` https://www.federalregister.gov/documents/2023/06/12/2023-09775/form-pf-event-reporting-for-large-hedge-fund-advisers-and-private-equity-fund-advisers-requirements "Form PF; Event Reporting for Large Hedge Fund Advisers and Private Equity Fund A"
- [dead] `src_010151` https://www.federalregister.gov/documents/1998/06/03/98-14736/lead-identification-of-dangerous-levels-of-lead "Lead; Identification of Dangerous Levels of Lead"
- [dead] `src_010152` https://www.federalregister.gov/documents/search?conditions%5Bterm%5D=%22Real%20Estate%20Board%20of%20New%20York%22 "Source: Federal Register"
- [generic_orphan] `src_010146` https://www.rebny.com/ "Home | Rebny"

### Alabama Power (6)

- [dead] `src_012352` https://www.federalregister.gov/documents/2026/03/26/2026-05887/combined-notice-of-filings-1 "Combined Notice of Filings #1"
- [dead] `src_012353` https://www.federalregister.gov/documents/2026/03/24/2026-05702/combined-notice-of-filings-1 "Combined Notice of Filings #1"
- [dead] `src_012357` https://www.federalregister.gov/documents/2026/02/20/2026-03360/alabama-power-company-notice-of-application-accepted-for-filing-and-soliciting-comments-motions-to "Alabama Power Company; Notice of Application Accepted for Filing and Soliciting "
- [dead] `src_012358` https://www.federalregister.gov/documents/search?conditions%5Bterm%5D=%22Alabama%20Power%22 "Source: Federal Register"
- [needs_review] `src_012345` https://alabamareflector.com/2025/11/04/how-alabama-power-kept-bills-up-and-foes-out-to-become-one-of-the-nations-most-powerful-utitilies/ "Just a moment..."
- [needs_review] `src_012347` https://www.nhtsa.gov/recalls?manufacturer=Alabama%20Power "Access Denied"

### Marathon Petroleum (6)

- [dead] `src_012769` https://www.federalregister.gov/documents/search?conditions%5Bterm%5D=%22Marathon%20Petroleum%22 "Source: Federal Register"
- [needs_review] `src_012740` https://www.opensecrets.org/orgs/marathon-petroleum/totals?id=D000023121 "Just a moment..."
- [needs_review] `src_012741` https://www.opensecrets.org/federal-lobbying/top-spenders?cache=1775433157?cycle=2024&id=D000023121 "Just a moment..."
- [needs_review] `src_012742` https://www.opensecrets.org/orgs/marathon-petroleum/recipients?id=D000023121 "Just a moment..."
- [needs_review] `src_012743` https://www.opensecrets.org/political-action-committees-pacs/marathon-petroleum/C00496307/summary/2024 "Just a moment..."
- [needs_review] `src_012754` https://www.nhtsa.gov/recalls?manufacturer=Marathon%20Petroleum "Access Denied"

### Valero Energy (6)

- [dead] `src_012866` https://www.federalregister.gov/documents/2026/03/10/2026-04671/foreign-trade-zone-ftz-116-authorization-of-production-activity-the-premcor-refining-group-inc "Federal Register :: Something went wrong."
- [dead] `src_012871` https://www.federalregister.gov/documents/search?conditions%5Bterm%5D=%22Valero%20Energy%22 "Source: Federal Register"
- [needs_review] `src_012856` https://www.opensecrets.org/orgs/valero-energy/summary?id=D000022303 "Just a moment..."
- [needs_review] `src_012857` https://www.opensecrets.org/political-action-committees-pacs/valero-energy/C00109546/summary/2024 "Just a moment..."
- [needs_review] `src_012858` https://www.opensecrets.org/political-action-committees-pacs/valero-energy/C00109546/candidate-recipients/2024 "Just a moment..."
- [needs_review] `src_012874` https://www.nhtsa.gov/recalls?manufacturer=Valero%20Energy "Access Denied"

### General Dynamics (6)

- [dead] `src_013216` https://www.federalregister.gov/documents/2026/02/23/2026-03544/notice-pursuant-to-the-national-cooperative-research-and-production-act-of-1993-undersea-technology "Notice Pursuant to the National Cooperative Research and Production Act of 1993-"
- [dead] `src_013219` https://www.federalregister.gov/documents/search?conditions%5Bterm%5D=%22General%20Dynamics%22 "Source: Federal Register"
- [needs_review] `src_013204` https://www.opensecrets.org/orgs/general-dynamics/summary?id=D000000165 "Just a moment..."
- [needs_review] `src_013205` https://www.opensecrets.org/orgs/general-dynamics/lobbying?id=D000000165 "Just a moment..."
- [needs_review] `src_013206` https://www.navy.mil/Resources/Fact-Files/Display-FactFiles/Article/2169795/columbia-class-submarine/ "Access Denied"
- [needs_review] `src_013213` https://www.nhtsa.gov/recalls?manufacturer=General%20Dynamics "Access Denied"

### Nucor Corporation (6)

- [dead] `src_013417` https://www.federalregister.gov/documents/2026/04/10/2026-07008/certain-hot-rolled-steel-flat-products-from-japan-preliminary-results-and-rescission-in-part-of "Federal Register :: Something went wrong."
- [needs_review] `src_013404` https://www.opensecrets.org/political-action-committees-pacs/nucor-corp/C00379628/summary/2024 "Just a moment..."
- [needs_review] `src_013405` https://www.opensecrets.org/orgs/nucor-corp/summary?id=D000028057 "Just a moment..."
- [needs_review] `src_013406` https://investors.nucor.com/financials/annual-reports/default.aspx "Just a moment..."
- [needs_review] `src_013411` https://violationtracker.goodjobsfirst.org/parent/nucor "Just a moment..."
- [needs_review] `src_013414` https://www.nhtsa.gov/recalls?manufacturer=Nucor%20Corporation "Access Denied"

### Heritage Foundation (6)

- [needs_review] `src_000820` https://www.politico.com/news/magazine/2021/05/22/health-care-individual-mandate-policy-conservative-idea-history-489956 "Just a moment..."
- [needs_review] `src_000821` https://www.politico.com/news/2022/11/16/two-anonymous-425-million-donations-gives-dark-money-conservative-group-a-massive-haul-00067493 "Just a moment..."
- [needs_review] `src_000822` https://www.politico.com/story/2013/10/koch-brothers-heritage-action-donation-098054 "Just a moment..."
- [needs_review] `src_013945` https://www.opensecrets.org/orgs/heritage-foundation/lobbying?id=D000034435 "Just a moment..."
- [needs_review] `src_013947` https://www.opensecrets.org/political-action-committees-pacs/C90013525/independent-expenditures/2018 "Just a moment..."
- [needs_review] `src_013952` https://www.afge.org/article/new-trump-administration-packed-with-project-2025-architects/ "Just a moment..."

### Private Equity Buys Regulatory Immunity Across the Aisle (6)

- [needs_review] `src_001774` https://www.opensecrets.org/cong-cmtes/contributors?cmte=SFIN&cmtename=Finance&cong=118&cycle=2024 "Just a moment..."
- [needs_review] `src_001778` https://www.opensecrets.org/orgs/kkr-co/recipients?id=D000000358 "Just a moment..."
- [needs_review] `src_001780` https://www.opensecrets.org/orgs/blackstone-group/totals?id=D000021873 "Just a moment..."
- [needs_review] `src_001781` https://www.opensecrets.org/orgs/apollo-global-management/totals?id=D000021845 "Just a moment..."
- [needs_review] `src_001782` https://www.opensecrets.org/orgs/carlyle-group/totals?id=D000000810 "Just a moment..."
- [needs_review] `src_001783` https://www.opensecrets.org/orgs/kkr-co/totals?id=D000000358 "Just a moment..."

### Contradiction 19 — Student Loan Industry Buys Bipartisan Protection for the Creditor Class (6)

- [needs_review] `src_001819` https://www.opensecrets.org/orgs/navient-corp/totals?id=D000068171 "Just a moment..."
- [needs_review] `src_001820` https://www.opensecrets.org/news/2021/08/student-loan-companies-spend-millions-lobbying-amid-extended-moratorium/ "Just a moment..."
- [needs_review] `src_001821` https://www.opensecrets.org/political-action-committees-pacs/navient-corp/C00331835/candidate-recipients/2024 "Just a moment..."
- [needs_review] `src_001822` https://www.opensecrets.org/news/issues/for-profit-education "Just a moment..."
- [needs_review] `src_001827` https://www.nasfaa.org/news-item/23471/Bill_Extending_Bankruptcy_Protections_to_Student_Loan_Borrowers_Advanced_by_House_Democrats "Attention Required! | Cloudflare"
- [needs_review] `src_001834` https://www.opensecrets.org/orgs/slm-corp/totals?id=D000022253 "Just a moment..."

### ConocoPhillips (6)

- [needs_review] `src_012457` https://www.opensecrets.org/orgs/conocophillips/summary?id=D000000438 "Just a moment..."
- [needs_review] `src_012458` https://www.opensecrets.org/orgs/conocophillips/totals?id=D000000303 "Just a moment..."
- [needs_review] `src_012460` https://www.opensecrets.org/news/2022/05/conocophillips-lobbying-fight-alaskan-oil-project/ "Just a moment..."
- [needs_review] `src_012461` https://www.opensecrets.org/news/2023/02/oil-and-gas-industry-spent-124-4-million-on-federal-lobbying-amid-record-profits-in-2022/ "Just a moment..."
- [needs_review] `src_012467` https://www.opensecrets.org/political-action-committees-pacs/conocophillips/C00112896/summary/2024 "Just a moment..."
- [needs_review] `src_012477` https://www.nhtsa.gov/recalls?manufacturer=ConocoPhillips "Access Denied"

### Koch Industries (6)

- [needs_review] `src_012703` https://www.politico.com/story/2019/02/04/former-koch-official-runs-epa-chemical-research-1136230 "Just a moment..."
- [needs_review] `src_012705` https://www.opensecrets.org/political-action-committees-pacs/koch-inc/C00236489/summary/2024 "Just a moment..."
- [needs_review] `src_012706` https://www.opensecrets.org/political-action-committees-pacs/C00236489/candidate-recipients/2024 "Just a moment..."
- [needs_review] `src_012707` https://www.opensecrets.org/orgs/summary?id=d000000186&cycle=2014 "Just a moment..."
- [needs_review] `src_012724` https://www.opensecrets.org/orgs/koch-industries/lobbying?id=D000000186 "Just a moment..."
- [needs_review] `src_012726` https://www.opensecrets.org/news/2022/07/supreme-court-curbs-epa-regulatory-power-after-koch-tied-groups-push/ "Just a moment..."

### Center on Budget and Policy Priorities (5)

- [dead] `src_000460` https://www.cbpp.org/about/finances "Attention Required! | Cloudflare"
- [dead] `src_000464` https://www.opensecrets.org/orgs/center-on-budget-policy-priorities/summary?id=D000044495 "Just a moment..."
- [dead] `src_000465` https://www.cbpp.org/press/press-releases/cbpp-announces-sharon-parrott-as-new-president "Attention Required! | Cloudflare"
- [dead] `src_000466` https://www.usda.gov/about-usda/news/press-releases/2022/05/13/statement-agriculture-secretary-tom-vilsack-intent-nominate-stacy-dean-serve-under-secretary-food "USDA: Statement on Intent to Nominate Stacy Dean as Under Secretary for Food, Nu"
- [dead] `src_000470` https://www.cbpp.org/the-state-priorities-partnership "Attention Required! | Cloudflare"

### Virginia 2026 Senate Race (5)

- [dead] `src_002029` https://www.fec.gov/data/candidate/P80003023/ "Source: OpenSecrets: Mark Warner campaign finance summary"
- [needs_review] `src_002033` https://virginiamercury.com/2026/03/16/warner-files-for-reelection-launching-bid-for-fourth-u-s-senate-term/ "Just a moment..."
- [needs_review] `src_002034` https://www.vpm.org/news/2025-09-25/us-senator-2026-mark-warner-jason-reynolds-bryce-reeves-kim-farington "Just a moment..."
- [needs_review] `src_002035` https://virginiamercury.com/2025/09/24/gop-state-sen-reeves-launches-2026-us-senate-bid-aims-to-unseat-warner/ "Just a moment..."
- [needs_review] `src_002037` https://www.cookpolitical.com/senate/race/488691 "Just a moment..."

### 2026-03-22 Policy Research (5)

- [dead] `src_002241` https://www.npr.org/2026/03/19/nx-s1-5750510/state-save-acts-florida "NPR: The SAVE Act faces long odds in the Senate"
- [dead] `src_002245` https://www.npr.org/2026/03/19/nx-s1-5753520/iran-israel-gas-field-attacks "NPR: Pentagon wants extra $200B for Iran war"
- [dead] `src_002262` https://www.npr.org/2026/03/04/nx-s1-5717031/ice-dhs-immigrants-surveillance-confrontation-deportation-mobile-fortify "NPR: ICE surveillance web"
- [needs_review] `src_002252` https://www.epi.org/blog/a-coalition-of-hundreds-of-employers-is-asking-the-trump-administration-to-override-the-nlrb-and-dictate-labor-law/ "Attention Required! | Cloudflare"
- [needs_review] `src_002253` https://www.americanprogress.org/article/nlrb-overseen-union-elections-fell-in-2025-amid-trump-administration-attacks/ "Just a moment..."

### Donald Trump Master Profile (5)

- [dead] `src_003734` https://www.npr.org/2025/09/03/nx-s1-5527047/trump-crypto-family-world-liberty-financial "NPR: World Liberty Financial"
- [dead] `src_003739` https://www.usnews.com/news/politics/articles/2026-01-02/trump-aligned-maga-inc-super-pac-enters-2026-with-300-million-stockpile "US News — Trump-Aligned MAGA Inc Super PAC enters 2026 with $300 million stockpi"
- [needs_review] `src_003704` https://www.opensecrets.org/news/2025/03/elon-musk-tops-list-of-2024-political-donors-but-six-others-gave-more-than-100-million "Just a moment..."
- [needs_review] `src_003730` https://www.opensecrets.org/2024-presidential-race?id=N00023864 "Just a moment..."
- [needs_review] `src_003733` https://taxpolicycenter.org/briefing-book/how-did-tcja-affect-federal-budget-outlook "Attention Required! | Cloudflare"

### The Transportation Record - Infrastructure Money and Industry Relationships (5)

- [dead] `src_006887` https://www.npr.org/2024/11/15/nx-s1-5192915/infrastructure-law-biden-no-political-benefit "NPR: Infrastructure law yields big money but little political benefit"
- [needs_review] `src_006878` https://www.flightrights.gov/?q=The%20Transportation%20Record "Access Denied"
- [needs_review] `src_006879` https://www.transportation.gov/briefing-room/us-department-transportation-accomplishments-overview-january-2021-january-2025 "Access Denied"
- [needs_review] `src_006880` https://www.transportation.gov/briefing-room/secretary-buttigieg-delivers-remarks-washington-national-airport-announce-major "Access Denied"
- [needs_review] `src_006890` https://www.washingtontimes.com/news/2024/nov/21/airline-executives-transportation-secretary-buttig/ "Just a moment..."

### National Rifle Association (5)

- [dead] `src_009741` https://www.npr.org/2024/02/23/1232229060/nra-wayne-lapierre-corruption-trial-verdict-new-york "NPR: NRA Wayne LaPierre Corruption Trial Verdict"
- [dead] `src_009742` https://www.npr.org/2019/09/27/764879242/nra-was-foreign-asset-to-russia-ahead-of-2016-new-senate-report-reveals "NPR: NRA Was 'Foreign Asset' to Russia Ahead of 2016"
- [needs_review] `src_009735` https://www.opensecrets.org/orgs/national-rifle-assn/summary?id=D000000082 "Just a moment..."
- [needs_review] `src_009736` https://www.opensecrets.org/orgs/national-rifle-assn/recipients?id=D000000082 "Just a moment..."
- [needs_review] `src_009749` https://www.americanprogress.org/article/frequently-asked-questions-gun-industry-immunity/ "Just a moment..."

### Lennar Corporation (5)

- [dead] `src_010097` https://www.federalregister.gov/documents/search?conditions%5Bterm%5D=%22Lennar%20Corporation%22 "Source: Federal Register"
- [needs_review] `src_010074` https://www.opensecrets.org/orgs/lennar-corp/summary?id=D000053016 "Just a moment..."
- [needs_review] `src_010077` https://www.opensecrets.org/orgs/lennar-corp/recipients?id=D000053016 "Just a moment..."
- [needs_review] `src_010078` https://www.opensecrets.org/orgs/lennar-corp/lobbying?id=D000053016 "Just a moment..."
- [needs_review] `src_010080` https://www.opensecrets.org/orgs/national-assn-of-home-builders/summary?id=D000000086 "Just a moment..."

### National Association of Realtors (5)

- [dead] `src_010140` https://www.federalregister.gov/documents/2024/04/26/2024-08793/final-determination-adoption-of-energy-efficiency-standards-for-new-construction-of-hud--and "Final Determination: Adoption of Energy Efficiency Standards for New Constructio"
- [needs_review] `src_010109` https://www.opensecrets.org/orgs/national-assn-of-realtors/summary?id=D000000062 "Just a moment..."
- [needs_review] `src_010114` https://www.opensecrets.org/political-action-committees-pacs/national-assn-of-realtors/C00030718/candidate-recipients/2024 "Just a moment..."
- [needs_review] `src_010115` https://www.opensecrets.org/political-action-committees-pacs/national-assn-of-realtors/C00030718/expenditures/2024 "Just a moment..."
- [needs_review] `src_010128` https://www.nhtsa.gov/recalls?manufacturer=National%20Association%20of%20Realtors "Access Denied"

### Centene Corporation (5)

- [dead] `src_010244` https://www.federalregister.gov/documents/2021/02/18/2021-03183/granting-of-requests-for-early-termination-of-the-waiting-period-under-the-premerger-notification "Granting of Requests for Early Termination of the Waiting Period Under the Preme"
- [dead] `src_010246` https://www.federalregister.gov/documents/2018/04/13/2018-07697/granting-of-requests-for-early-termination-of-the-waiting-period-under-the-premerger-notification "Granting of Requests for Early Termination of the Waiting Period Under the Preme"
- [dead] `src_010247` https://www.federalregister.gov/documents/2017/11/14/2017-24589/granting-of-requests-for-early-termination-of-the-waiting-period-under-the-premerger-notification "Granting of Requests for Early Termination of the Waiting Period Under the Preme"
- [dead] `src_010248` https://www.federalregister.gov/documents/search?conditions%5Bterm%5D=%22Centene%20Corporation%22 "Source: Federal Register"
- [needs_review] `src_010259` https://www.nhtsa.gov/recalls?manufacturer=Centene%20Corporation "Access Denied"

### Eli Lilly (5)

- [dead] `src_010264` https://www.npr.org/2023/03/01/1160339792/eli-lilly-insulin-price "NPR: Eli Lilly cuts insulin price, caps at $35/month (March 2023)"
- [dead] `src_010268` https://investor.lilly.com/news-releases/news-release-details/lilly-reports-fourth-quarter-2025-financial-results-and-provides "Eli Lilly: Q4 2025 financial results, $58-61B 2025 guidance"
- [needs_review] `src_010260` https://www.opensecrets.org/political-action-committees-pacs/eli-lilly-co/C00082792/summary/2024 "Just a moment..."
- [needs_review] `src_010262` https://www.opensecrets.org/orgs/eli-lilly-co/summary?id=d000000166 "Just a moment..."
- [needs_review] `src_010289` https://www.nhtsa.gov/recalls?manufacturer=Eli%20Lilly "Access Denied"

### UAW - United Auto Workers (5)

- [dead] `src_011755` https://www.npr.org/2024/01/24/1226590769/biden-uaw-autoworkers "NPR: UAW Endorses Biden"
- [needs_review] `src_011741` https://www.opensecrets.org/political-action-committees-pacs/united-auto-workers/C00002840/summary/2024 "Just a moment..."
- [needs_review] `src_011742` https://www.opensecrets.org/orgs/united-auto-workers/totals?cycle=A&id=d000000070 "Just a moment..."
- [needs_review] `src_011743` https://www.opensecrets.org/political-action-committees-pacs/united-auto-workers/C00002840/summary/2020 "Just a moment..."
- [needs_review] `src_011760` https://www.politico.com/news/2024/01/24/biden-gets-uaw-endorsement-after-noticeable-delay-00137610 "Just a moment..."

### American Petroleum Institute (5)

- [dead] `src_012428` https://www.federalregister.gov/documents/2026/02/03/2026-02104/circular-welded-carbon-quality-steel-pipe-from-the-peoples-republic-of-china-final-affirmative "Circular Welded Carbon Quality Steel Pipe From the People's Republic of China: F"
- [dead] `src_012430` https://www.federalregister.gov/documents/search?conditions%5Bterm%5D=%22American%20Petroleum%20Institute%22 "Source: Federal Register"
- [needs_review] `src_012380` https://www.opensecrets.org/orgs/american-petroleum-institute/totals?cycle=A&id=D000031493 "Just a moment..."
- [needs_review] `src_012391` https://www.opensecrets.org/news/2024/07/american-petroleum-institute-recycled-same-arguments-for-decades-lobbying-on-climate-policy/ "Just a moment..."
- [needs_review] `src_012403` https://www.opensecrets.org/orgs/american-petroleum-institute/summary?id=D000031493 "Just a moment..."

### Devon Energy (5)

- [dead] `src_012513` https://www.federalregister.gov/documents/2024/04/10/2024-07599/combined-notice-of-filings-1 "Combined Notice of Filings #1"
- [dead] `src_012514` https://www.federalregister.gov/documents/2024/02/12/2024-02817/combined-notice-of-filings-1 "Combined Notice of Filings #1"
- [dead] `src_012515` https://www.federalregister.gov/documents/2023/11/20/2023-25589/devon-energy-production-company-lp-supplemental-notice-that-initial-market-based-rate-filing "Devon Energy Production Company, LP; Supplemental Notice That Initial Market-Bas"
- [dead] `src_012516` https://www.federalregister.gov/documents/search?conditions%5Bterm%5D=%22Devon%20Energy%22 "Source: Federal Register"
- [needs_review] `src_012509` https://www.nhtsa.gov/recalls?manufacturer=Devon%20Energy "Access Denied"

### Boeing Defense (5)

- [dead] `src_013087` https://www.npr.org/2024/05/14/1251477809/boeing-justice-department-charges "NPR: Justice Department may prosecute Boeing for 737 Max crashes"
- [needs_review] `src_013081` https://www.opensecrets.org/orgs/boeing-co/summary?id=D000000100 "Just a moment..."
- [needs_review] `src_013082` https://www.opensecrets.org/orgs/boeing-co/lobbying?id=D000000100 "Just a moment..."
- [needs_review] `src_013083` https://www.opensecrets.org/political-action-committees-pacs/boeing-co/C00142711/candidate-recipients/2024 "Just a moment..."
- [needs_review] `src_013092` https://www.nhtsa.gov/recalls?manufacturer=Boeing%20Defense "Access Denied"

### Boeing (5)

- [dead] `src_013096` https://www.npr.org/2024/05/02/1248693512/boeing-whistleblower-josh-dean-dead "NPR: Whistleblower Joshua Dean, who raised concerns about Boeing jets, dies at 4"
- [dead] `src_013097` https://www.npr.org/2024/03/12/1238033573/boeing-whistleblower-john-barnett-dead "NPR: Whistleblower John Barnett's family files wrongful death suit against Boein"
- [needs_review] `src_013094` https://www.opensecrets.org/political-action-committees-pacs/boeing-co/C00142711/summary/2024 "Just a moment..."
- [needs_review] `src_013095` https://www.opensecrets.org/orgs/boeing-co/recipients?id=D000000100 "Just a moment..."
- [needs_review] `src_013124` https://www.nhtsa.gov/recalls?manufacturer=Boeing "Access Denied"

### ALEC - American Legislative Exchange Council (5)

- [dead] `src_013482` https://www.npr.org/sections/thetwo-way/2012/05/31/154077536/wal-mart-pulls-out-of-group-that-advocates-stand-your-ground-laws "NPR: Walmart Pulls Out of ALEC Over Stand Your Ground"
- [dead] `src_013515` https://www.npr.org/2011/10/06/141078608/the-multimillionaire-helping-republicans-win-n-c "NPR/Jane Mayer: Multimillionaire Helping Republicans Win North Carolina (2011)"
- [needs_review] `src_013486` https://wisconsinexaminer.com/2021/07/27/is-alec-helping-republicans-campaign-in-violation-of-its-tax-status/ "Just a moment..."
- [needs_review] `src_013502` https://www.nrdc.org/bio/aliya-haq/alec-and-polluters-release-new-uninspired-schemes-block-climate-action "Just a moment..."
- [needs_review] `src_013516` https://www.epi.org/blog/corporate-power-in-state-legislatures-produces-a-gerrymandered-congress/ "Attention Required! | Cloudflare"

### Schumer-McConnell Senate Leadership Mirror - Same Money, Different Caucuses (5)

- [needs_review] `src_001505` https://www.opensecrets.org/members-of-congress/summary?cid=N00001093&cycle=Career "Just a moment..."
- [needs_review] `src_001506` https://www.opensecrets.org/members-of-congress/summary?cid=N00003389 "Just a moment..."
- [needs_review] `src_001507` https://www.opensecrets.org/orgs/goldman-sachs/summary?id=d000000085 "Just a moment..."
- [needs_review] `src_001508` https://www.opensecrets.org/political-action-committees-pacs/lockheed-martin/C00303024/candidate-recipients/2024 "Just a moment..."
- [needs_review] `src_001509` https://www.opensecrets.org/orgs/senate-leadership-fund/summary?id=D000068516 "Just a moment..."

### Telecom Buys Net Neutrality's Death From Both Sides (5)

- [needs_review] `src_001753` https://www.opensecrets.org/orgs/at-t-inc/totals?id=d000000076 "Just a moment..."
- [needs_review] `src_001754` https://www.opensecrets.org/orgs/comcast-corp/totals?id=D000000461 "Just a moment..."
- [needs_review] `src_001755` https://www.opensecrets.org/orgs/verizon-communications/totals?id=D000000079 "Just a moment..."
- [needs_review] `src_001756` https://www.opensecrets.org/orgs/charter-communications/totals?id=D000000672 "Just a moment..."
- [needs_review] `src_001762` https://www.benton.org/headlines/ex-fcc-chair-ajit-pai-now-wireless-lobbyist%E2%80%94and-enemy-cable-companies "Attention Required! | Cloudflare"

### Ballard Partners (5)

- [needs_review] `src_007961` https://www.opensecrets.org/fara/results?foreign-principal=&location=&order=desc&page=1&query=&registrant=Ballard+Partners&sort=stamped "Just a moment..."
- [needs_review] `src_007962` https://www.opensecrets.org/news/2019/01/ballard-partners-revolving-door-white-house/ "Just a moment..."
- [needs_review] `src_007963` https://www.opensecrets.org/news/2025/08/the-rise-of-ballard-partners-now-the-top-lobbying-firm-in-the-country "Just a moment..."
- [needs_review] `src_007974` https://www.opensecrets.org/news/2025/07/pharma-industry-and-ballard-partners-dominate-the-lobbying-space-in-second-quarter-of-2025/ "Just a moment..."
- [needs_review] `src_013610` https://www.opensecrets.org/orgs/ballard-partners/summary?id=D000037635 "Just a moment..."

### National Rental Home Council (5)

- [needs_review] `src_010002` https://www.opensecrets.org/federal-lobbying/top-spenders?cache=1775433157?id=F292993 "Just a moment..."
- [needs_review] `src_010003` https://www.opensecrets.org/political-action-committees-pacs/national-rental-home-council/C00763847/summary/2022 "Just a moment..."
- [needs_review] `src_010004` https://www.opensecrets.org/political-action-committees-pacs/national-rental-home-council/C00763847/donors/2022 "Just a moment..."
- [needs_review] `src_010005` https://www.opensecrets.org/political-action-committees-pacs/national-rental-home-council/C00763847/expenditures/2022 "Just a moment..."
- [needs_review] `src_010010` https://www.nhtsa.gov/recalls?manufacturer=National%20Rental%20Home%20Council "Access Denied"

### American Federation for Children (5)

- [needs_review] `src_012922` https://www.opensecrets.org/orgs/american-federation-for-children/summary?id=D000067130 "Just a moment..."
- [needs_review] `src_012923` https://www.opensecrets.org/news/2024/03/school-choice-group-spends-millions-to-oust-recalcitrant-republicans/ "Just a moment..."
- [needs_review] `src_012924` https://www.opensecrets.org/news/2024/03/school-choice-super-pac-targets-texas-gop-incumbents/ "Just a moment..."
- [needs_review] `src_012931` https://www.epi.org/publication/school-vouchers-are-not-a-proven-strategy-for-improving-student-achievement/ "Attention Required! | Cloudflare"
- [needs_review] `src_012936` https://www.cbpp.org/research/state-budget-and-tax/state-policymakers-should-reject-k-12-school-voucher-plans "Attention Required! | Cloudflare"

### Northrop Grumman (5)

- [needs_review] `src_013363` https://www.opensecrets.org/political-action-committees-pacs/northrop-grumman/C00088591/summary/2024 "Just a moment..."
- [needs_review] `src_013364` https://www.opensecrets.org/political-action-committees-pacs/northrop-grumman/C00088591/candidate-recipients/2024 "Just a moment..."
- [needs_review] `src_013365` https://www.opensecrets.org/federal-lobbying/top-spenders?cache=1775433157?id=D000000170 "Just a moment..."
- [needs_review] `src_013368` https://media.defense.gov/2018/Aug/29/2001959973/-1/-1/1/H04L94024201-ROCHE.PDF "Access Denied"
- [needs_review] `src_013372` https://www.pogo.org/analyses/northrop-grumman-uses-b-21-program-to-push-unproven-inflation-bailout "Attention Required! | Cloudflare"

### Insurance Industry Writes Its Own Regulation Through Both Parties (4)

- [dead] `src_001802` https://www.fec.gov/data/candidate/S6NE00095/ "FEC Candidate: Ben Nelson Summary"
- [dead] `src_001805` https://www.npr.org/2012/03/31/149767150/in-1993-republicans-proposed-a-mandate-first "NPR: In 1993 Republicans Proposed a Mandate First"
- [needs_review] `src_001798` https://www.opensecrets.org/news/2010/02/federal-lobbying-soars-in-2009/ "Just a moment..."
- [needs_review] `src_001809` https://www.opensecrets.org/news/2019/03/big-pharma-insurers-hospitals-team-up-to-kill-medicare-for-all/ "Just a moment..."

### 2026-03-22 News Scan (4)

- [dead] `src_002190` https://www.npr.org/2026/03/21/nx-s1-5755539/iran-war-fourth-week "NPR: Iran war enters its fourth week with no clear end in sight"
- [needs_review] `src_002195` https://www.washingtontimes.com/news/2026/mar/21/musk-offers-pay-tsa-salaries-dhs-shutdown-stretches-fifth-week/ "Just a moment..."
- [needs_review] `src_002225` https://www.axios.com/2026/03/22/dhs-markwayne-mulling-senate-vote-advance-kristi-noem "Just a moment..."
- [needs_review] `src_002235` https://www.fiercehealthcare.com/providers/rfk-jr-defends-proposed-hhs-budget-democrats-slam-cuts-cdc-acip-shakeup "Just a moment..."

### Steve Scalise (4)

- [dead] `src_004181` https://www.fec.gov/data/candidate/H0LA01087/ "FEC Candidate: Steve Scalise campaign finance summary"
- [dead] `src_004188` https://www.npr.org/2023/10/12/1205346289/scalise-says-hes-a-unifier-the-current-state-of-the-gop-will-test-that-skill "NPR: Scalise says he's a unifier — the state of the GOP will test that"
- [needs_review] `src_004182` https://www.opensecrets.org/joint-fundraising-committees-jfcs/team-scalise/C00750521/2024/donors "Just a moment..."
- [needs_review] `src_004190` https://www.opensecrets.org/news/2023/10/kevin-mccarthys-historic-ouster-spurs-big-money-race-for-house-leadership/ "Just a moment..."

### Ron DeSantis Master Profile (4)

- [dead] `src_004620` https://www.flgov.com/eog/sites/default/files/executive-orders/2026/EO%2026-68.pdf "Link"
- [generic_orphan] `src_004643` https://www.opensanctions.org/search/?q=Ron%20DeSantis "Search - OpenSanctions"
- [needs_review] `src_004637` https://www.opensecrets.org/2024-presidential-race/ron-desantis/candidate?id=N00034746 "Just a moment..."
- [needs_review] `src_004638` https://www.opensecrets.org/2024-presidential-race/ron-desantis/contributors?id=N00034746 "Just a moment..."

### Bobby Scott (4)

- [dead] `src_006321` https://www.npr.org/2018/11/28/671675847/pension-plans-for-millions-of-americans-are-on-the-brink-of-collapse "NPR: $90 Billion Pension Rescue in American Rescue Plan (2021)"
- [dead] `src_006322` https://www.npr.org/2021/03/09/975259434/house-democrats-pass-bill-that-would-protect-worker-organizing-efforts "NPR: PRO Act Passes House, Stalls in Senate (2021)"
- [generic_orphan] `src_006329` https://www.opensanctions.org/search/?q=Bobby%20Scott "Search - OpenSanctions"
- [needs_review] `src_006319` https://www.congress.gov/bill/117th-congress/house-bill/842 "Just a moment..."

### The COVID Tenure and the Political Fallout (4)

- [dead] `src_006795` https://www.npr.org/2020/08/06/899679894/public-health-officials-discuss-why-they-quit-during-the-covid-19-pandemic "(Tier 2: NPR reporting on her resignation)"
- [needs_review] `src_006792` https://ohiocapitaljournal.com/tag/larry-householder/ "Just a moment..."
- [needs_review] `src_006794` https://ohiocapitaljournal.com/2020/05/20/ohio-senate-votes-against-bill-to-limit-state-health-directors-power/ "Just a moment..."
- [needs_review] `src_006804` https://ohiocapitaljournal.com/2024/02/12/ex-first-energy-executives-ohio-utility-regulator-charged-by-state-in-bailout-and-bribery-scandal/ "Just a moment..."

### Jordan Peterson (4)

- [dead] `src_007244` https://www.cbc.ca/news/canada/jordan-peterson-treatment-russia-1.5456939 "CBC News: "Jordan Peterson seeks 'emergency' drug detox treatment in Russia" (Fe"
- [dead] `src_007245` https://www.cbc.ca/news/canada/toronto/jordan-peterson-court-case-decision-1.6943845 "CBC News: "Ontario court rules against Jordan Peterson, upholds social media tra"
- [dead] `src_007246` https://www.cbc.ca/news/canada/toronto/jordan-peterson-court-challenge-rejection-1.7086681 "CBC News: "Court dismisses Jordan Peterson's request to challenge order he under"
- [needs_review] `src_007239` https://thevarsity.ca/2022/01/23/jordan-peterson-resigns-u-of-t/ "Blocked"

### Real Estate Industry (4)

- [dead] `src_010174` https://www.federalregister.gov/documents/2026/01/21/2026-01009/united-states-of-america-et-al-v-realpage-inc-et-al-proposed-final-judgment-and-competitive-impact "United States of America et al. v. RealPage, Inc. et al. Proposed Final Judgment"
- [dead] `src_010175` https://www.federalregister.gov/documents/2025/12/05/2025-21966/united-states-of-america-et-al-v-realpage-inc-et-al-proposed-final-judgment-and-competitive-impact "United States of America et al. v. RealPage, Inc. et al.; Proposed Final Judgmen"
- [dead] `src_010176` https://www.federalregister.gov/documents/2025/09/23/2025-18379/changes-in-mortgage-insurance-premiums-applicable-to-fha-multifamily-insurance-programs "Changes in Mortgage Insurance Premiums Applicable to FHA Multifamily Insurance P"
- [dead] `src_010177` https://www.federalregister.gov/documents/2025/09/05/2025-17086/united-states-of-america-et-al-v-realpage-inc-et-al-proposed-final-judgment-and-competitive-impact "United States of America et al. v. RealPage, Inc. et al. Proposed Final Judgment"

### AbbVie (4)

- [dead] `src_010230` https://www.federalregister.gov/documents/2026/03/09/2026-04546/aspen-global-inc-co-lachman-consultant-services-inc-et-al-withdrawal-of-approval-of-46-new-drug "Aspen Global Inc. c/o Lachman Consultant Services, Inc., et al.; Withdrawal of A"
- [dead] `src_010232` https://www.federalregister.gov/documents/2025/12/22/2025-23515/certain-antibody-drug-conjugates-and-components-thereof-and-products-containing-the-same-institution "Federal Register :: Something went wrong."
- [dead] `src_010235` https://www.federalregister.gov/documents/search?conditions%5Bterm%5D=%22AbbVie%22 "Source: Federal Register"
- [needs_review] `src_010219` https://www.nhtsa.gov/recalls?manufacturer=AbbVie "Access Denied"

### Sheldon & Miriam Adelson (4)

- [dead] `src_011275` https://www.npr.org/2021/01/12/693679109/sheldon-adelson-conservative-donor-and-casino-titan-dies-at-87 "NPR: Sheldon Adelson Obituary"
- [needs_review] `src_011270` https://www.opensecrets.org/outside-spending/donor_detail/2020?id=U0000000310&name=Adelson,+Sheldon+G.&super=N&type=I "Just a moment..."
- [needs_review] `src_011271` https://www.opensecrets.org/orgs/las-vegas-sands/summary?id=D000032023 "Just a moment..."
- [needs_review] `src_011272` https://www.opensecrets.org/news/2018/07/sheldon-adelson-donates-30-million-for-house-republicans "Just a moment..."

### AFL-CIO (4)

- [dead] `src_011620` https://www.fec.gov/data/committee/C00003806/ "FEC: AFL-CIO COPE Political Contributions Committee (C00003806)"
- [needs_review] `src_011619` https://www.opensecrets.org/orgs/afl-cio/summary?id=d000000088 "Just a moment..."
- [needs_review] `src_011621` https://www.congress.gov/bill/118th-congress/house-bill/20 "Just a moment..."
- [needs_review] `src_011623` https://www.epi.org/publication/unions-raise-wages-tariffs-dont-why-trumps-trade-policy-wont-help-u-s-workers/ "Attention Required! | Cloudflare"

### United Farm Workers (4)

- [dead] `src_011812` https://www.federalregister.gov/documents/2026/03/27/2026-06027/reducing-bureaucracy-and-burden-for-refugee-resettlement-programs "Reducing Bureaucracy and Burden for Refugee Resettlement Programs"
- [dead] `src_011815` https://www.federalregister.gov/documents/2025/12/19/2025-23452/covid-19-mitigation-policy-requirement-in-head-start-programs-recission "COVID-19 Mitigation Policy Requirement in Head Start Programs; Recission"
- [dead] `src_011817` https://www.federalregister.gov/documents/2025/01/17/2025-01082/energy-conservation-program-commercial-warm-air-furnaces-final-determination "Energy Conservation Program: Commercial Warm Air Furnaces; Final Determination"
- [needs_review] `src_011810` https://www.opensecrets.org/orgs/united-farm-workers/summary?id=D000057925 "Just a moment..."

### Anthem - Elevance Health (4)

- [dead] `src_011972` https://www.fec.gov/data/committee/C00197228/ "FEC: Elevance Health PAC filings"
- [needs_review] `src_011970` https://www.opensecrets.org/political-action-committees-pacs/elevance-health/C00197228/summary/2024 "Just a moment..."
- [needs_review] `src_011971` https://www.opensecrets.org/orgs/elevance-health/lobbying?id=D000023159 "Just a moment..."
- [needs_review] `src_011973` https://www.fiercehealthcare.com/payers/elevance-health-beats-profit-misses-revenue-mixed-q4 "Just a moment..."

### Insurance Industry (4)

- [dead] `src_012093` https://www.npr.org/sections/health-shots/2022/12/12/1141926550/medicare-advantage-plans-overcharged-taxpayers-dodged-auditors "NPR: Medicare Advantage plans overcharged taxpayers, dodged auditors"
- [needs_review] `src_012086` https://www.opensecrets.org/orgs/america-s-health-insurance-plans/summary?id=D000021819 "Just a moment..."
- [needs_review] `src_012087` https://www.opensecrets.org/orgs/unitedhealth-group/summary?id=D000000348 "Just a moment..."
- [needs_review] `src_012088` https://www.opensecrets.org/news/2021/06/costly-battle-obamacare-over/ "Just a moment..."

### Uber (4)

- [dead] `src_012301` https://www.federalregister.gov/documents/2026/02/24/2026-03619/performance-appraisal-for-general-schedule-prevailing-rate-and-certain-other-employees "Performance Appraisal for General Schedule, Prevailing Rate, and Certain Other E"
- [dead] `src_012302` https://www.federalregister.gov/documents/2026/02/24/2026-03610/managing-senior-professional-performance "Managing Senior Professional Performance"
- [dead] `src_012305` https://www.federalregister.gov/documents/search?conditions%5Bterm%5D=%22Uber%22 "Source: Federal Register"
- [needs_review] `src_012299` https://www.nhtsa.gov/recalls?manufacturer=Uber "Access Denied"

### Duke Energy (4)

- [dead] `src_012546` https://www.federalregister.gov/documents/2026/04/07/2026-06702/combined-notice-of-filings-1 "Combined Notice of Filings #1"
- [dead] `src_012549` https://www.federalregister.gov/documents/2026/03/24/2026-05658/duke-energy-progress-llc-hb-robinson-steam-electric-plant-unit-no-2-exemption "Duke Energy Progress, LLC; H.B. Robinson Steam Electric Plant, Unit No. 2; Exemp"
- [needs_review] `src_012531` https://www.opensecrets.org/orgs/duke-energy/summary?id=D000000477 "Just a moment..."
- [needs_review] `src_012537` https://www.nhtsa.gov/recalls?manufacturer=Duke%20Energy "Access Denied"

### Halliburton (4)

- [dead] `src_012671` https://www.federalregister.gov/documents/2024/12/19/2024-29991/publication-of-venezuela-sanctions-regulations-web-general-licenses-5q-and-8o "Federal Register :: Something went wrong."
- [dead] `src_012672` https://www.federalregister.gov/documents/search?conditions%5Bterm%5D=%22Halliburton%22 "Source: Federal Register"
- [needs_review] `src_012647` https://www.opensecrets.org/orgs/halliburton-co/summary?id=D000000281 "Just a moment..."
- [needs_review] `src_012652` https://www.nhtsa.gov/recalls?manufacturer=Halliburton "Access Denied"

### PG&E - Pacific Gas and Electric (4)

- [dead] `src_012826` https://www.federalregister.gov/documents/1996/05/10/96-10694/promoting-wholesale-competition-through-open-access-non--discriminatory-transmission-services-by "Promoting Wholesale Competition Through Open Access Non- Discriminatory Transmis"
- [dead] `src_012827` https://www.federalregister.gov/documents/1995/10/10/95-25043/central-valley-project-notice-of-rate-order-no-wapa-72 "Central Valley Project Notice of Rate Order No. WAPA-72"
- [dead] `src_012829` https://www.federalregister.gov/documents/1995/07/20/95-17625/energy-conservation-program-for-consumer-products-proposed-rulemaking-regarding-energy-conservation "Energy Conservation Program for Consumer Products: Proposed Rulemaking Regarding"
- [needs_review] `src_012816` https://www.opensecrets.org/orgs/pg-e-corp/summary?id=D000000150 "Just a moment..."

### DeVos Family (4)

- [dead] `src_012964` https://www.npr.org/2017/02/07/513836576/pence-becomes-first-vp-to-break-senate-tie-over-cabinet-nomination "NPR: Pence Becomes First VP to Break Senate Tie Over Cabinet Nomination"
- [dead] `src_012965` https://www.npr.org/transcripts/936225974 "NPR: The Legacy of Education Secretary Betsy DeVos"
- [dead] `src_012966` https://www.npr.org/2019/12/11/786367598/betsy-devos-overruled-education-dept-findings-on-defrauded-student-borrowers "NPR: DeVos Overruled Education Dept. Findings on Defrauded Student Borrowers"
- [needs_review] `src_012958` https://www.opensecrets.org/news/2016/12/betsy-devos-big-giving-relatives-family-qualifies-gop-royalty/ "Just a moment..."

### BAE Systems (4)

- [dead] `src_013069` https://www.federalregister.gov/documents/2026/03/26/2026-05925/notice-pursuant-to-the-national-cooperative-research-and-production-act-of-1993-the-national "Notice Pursuant to the National Cooperative Research and Production Act of 1993-"
- [dead] `src_013071` https://www.federalregister.gov/documents/2026/03/06/2026-04422/arms-sales-notification "Arms Sales Notification"
- [dead] `src_013074` https://www.federalregister.gov/documents/search?conditions%5Bterm%5D=%22BAE%20Systems%22 "Source: Federal Register"
- [needs_review] `src_013060` https://www.nhtsa.gov/recalls?manufacturer=BAE%20Systems "Access Denied"

### Meta - Facebook (4)

- [generic_orphan] `src_009370` https://www.sullcrom.com/ "Home | Sullivan & Cromwell LLP"
- [generic_orphan] `src_009378` https://issueone.org/ "Home - Issue One"
- [needs_review] `src_009366` https://www.opensecrets.org/orgs/meta-platforms/summary?id=D000033563 "Just a moment..."
- [needs_review] `src_009367` https://www.opensecrets.org/political-action-committees-pacs/meta/C00502906/summary/2024 "Just a moment..."

### League of Conservation Voters (4)

- [generic_orphan] `src_009670` https://www.lcv.org → https://www.lcv.org/ "Home - League of Conservation Voters - Our Earth is Worth Fighting For"
- [needs_review] `src_009677` https://www.opensecrets.org/orgs/league-of-conservation-voters/recipients?id=D000000288 "Just a moment..."
- [needs_review] `src_009678` https://www.opensecrets.org/orgs/league-of-conservation-voters/summary?id=d000000288 "Just a moment..."
- [needs_review] `src_009679` https://www.opensecrets.org/orgs/league-of-conservation-voters/totals?id=d000000288 "Just a moment..."

### Bipartisan Policy Center (4)

- [needs_review] `src_001018` https://www.opensecrets.org/orgs/bipartisan-policy-center/summary?id=D000047798 "Just a moment..."
- [needs_review] `src_001019` https://bipartisanpolicy.org/support-bpc/faq/ "Just a moment..."
- [needs_review] `src_001024` https://bipartisanpolicy.org/support-bpc/corporate-council/ "Just a moment..."
- [needs_review] `src_001025` https://www.ethics.harvard.edu/sites/g/files/omnuum9911/files/lab_dispatches_vol3.pdf "Access Denied"

### Intra-Republican Contradiction Map (4)

- [needs_review] `src_001255` https://www.opensecrets.org/news/2024/08/koch-network-flagship-super-pac-pours-big-money-into-2024-elections/ "Just a moment..."
- [needs_review] `src_001257` https://www.axios.com/2023/01/22/club-for-growth-republicans-conservatives-2024 "Just a moment..."
- [needs_review] `src_001262` https://www.opensecrets.org/outside-spending/donor_detail/2024?id=U0000003690&name=Uihlein,+Richard+&+Elizabeth=&super_only=S&type=I "Just a moment..."
- [needs_review] `src_001266` https://www.opensecrets.org/political-action-committees-pacs/maga-inc/C00892471/summary/2024 "Just a moment..."

### PhRMA Kills Drug Negotiation From Both Sides (4)

- [needs_review] `src_001568` https://www.gao.gov/products/gao-25-106996 "Access Denied"
- [needs_review] `src_001571` https://www.opensecrets.org/news/2017/01/a-senate-vote-on-prescription-drug-price/ "Just a moment..."
- [needs_review] `src_001573` https://kentuckylantern.com/2025/10/27/pac-donations-flow-to-new-committee-chairs-especially-us-rep-brett-guthrie-of-kentucky/ "Just a moment..."
- [needs_review] `src_001575` https://www.fiercepharma.com/pharma/peddling-influence-d-c-cost-pharma-industry-a-record-92m-first-quarter "Just a moment..."

### Lockheed Martin Buys Defense Hawks in Both Parties (4)

- [needs_review] `src_001579` https://www.opensecrets.org/orgs/lockheed-martin/summary?id=D000000104 "Just a moment..."
- [needs_review] `src_001580` https://www.opensecrets.org/political-action-committees-pacs/lockheed-martin/C00303024/summary/2024 "Just a moment..."
- [needs_review] `src_001582` https://www.opensecrets.org/members-of-congress/summary?cycle=Career&type=I&cid=N00008799&newMem=N "Just a moment..."
- [needs_review] `src_001586` https://www.gao.gov/blog/f-35-will-now-exceed-2-trillion-military-plans-fly-it-less "Access Denied"

### The Small-Dollar Model and the Anti-Donor Experiment (4)

- [needs_review] `src_006385` https://www.opensecrets.org/members-of-congress/industries?cycle=2024&type=C "Just a moment..."
- [needs_review] `src_006387` https://www.opensecrets.org/news/2018/07/alexandria-ocasio-cortez-boosted-by-out-of-state-donors-after-primary-win/ "Just a moment..."
- [needs_review] `src_006388` https://www.opensecrets.org/news/2018/12/ocasio-cortez-enters-the-house-as-most-popular-member-with-small-donors/ "Just a moment..."
- [needs_review] `src_006389` https://www.opensecrets.org/news/2025/10/congressional-profile-alexandria-ocasio-cortez/ "Just a moment..."

### The Shared Sponsor Map — Corporate Advertisers Funding Both Left and Right Political Media (4)

- [needs_review] `src_007042` https://www.mmm-online.com/news/pharma-tv-ad-spend-topped-7b-in-2025/ "Attention Required! | Cloudflare"
- [needs_review] `src_007045` https://www.spglobal.com/market-intelligence/en/news-insights/articles/2025/3/progressives-advertising-expenditure-hits-record-high-in-2024-88020488 "Access Denied"
- [needs_review] `src_007050` https://www.opensecrets.org/political-action-committees-pacs/google-inc/C00428623/pac-to-pac/2024 "Just a moment..."
- [needs_review] `src_007053` https://www.politico.com/news/2026/02/02/meta-drops-65-million-into-super-pacs-to-boost-tech-friendly-state-candidates-00759567 "Just a moment..."

### Carlyle Group (4)

- [needs_review] `src_008741` https://www.opensecrets.org/orgs/carlyle-group/summary?id=D000000810 "Just a moment..."
- [needs_review] `src_008742` https://www.opensecrets.org/orgs/carlyle-group/lobbying?id=D000000810 "Just a moment..."
- [needs_review] `src_008749` https://www.carlyle.com/media-room/news-release-archive/carlyle-acquire-mantech-all-cash-transaction-valued-approximately-4-2-billion "Attention Required! | Cloudflare"
- [needs_review] `src_008752` https://www.nhtsa.gov/recalls?manufacturer=Carlyle%20Group "Access Denied"

### Reclaim America PAC (4)

- [needs_review] `src_009817` https://www.opensecrets.org/political-action-committees-pacs/reclaim-america-pac/C00500025/summary/2024 "Just a moment..."
- [needs_review] `src_009818` https://www.opensecrets.org/political-action-committees-pacs/reclaim-america-pac/C00500025/candidate-recipients/2024 "Just a moment..."
- [needs_review] `src_009819` https://www.opensecrets.org/political-action-committees-pacs/reclaim-america-pac/C00500025/donors/2024 "Just a moment..."
- [needs_review] `src_009820` https://www.opensecrets.org/political-action-committees-pacs/reclaim-america-pac/C00500025/pac-to-pac/2024 "Just a moment..."

### Centene Corporation PAC (4)

- [needs_review] `src_010613` https://www.opensecrets.org/orgs/centene-corp/summary?id=D000024670 "Just a moment..."
- [needs_review] `src_010614` https://www.opensecrets.org/orgs/centene-corp/recipients?id=D000024670 "Just a moment..."
- [needs_review] `src_010618` https://missouriindependent.com/2022/11/04/centene-showers-politicians-with-millions-as-it-courts-contracts-settles-overbilling-allegations/ "Just a moment..."
- [needs_review] `src_010620` https://www.fiercehealthcare.com/payers/elevance-health-centene-donated-trump-inaugural-fund "Just a moment..."

### Jeffrey Yass (4)

- [needs_review] `src_010861` https://www.opensecrets.org/political-action-committees-pacs/club-for-growth-action/C00487470/donors/2024 "Just a moment..."
- [needs_review] `src_010862` https://www.opensecrets.org/political-action-committees-pacs/club-for-growth-action/C00487470/donors/2022 "Just a moment..."
- [needs_review] `src_010863` https://www.opensecrets.org/political-action-committees-pacs/club-for-growth-action/C00487470/donors/2020 "Just a moment..."
- [needs_review] `src_010889` https://qz.com/jeff-yass-trump-tiktok-truth-social-1851367927 "Attention Required! | Cloudflare"

### Tenet Healthcare (4)

- [needs_review] `src_012124` https://www.opensecrets.org/orgs/tenet-healthcare/summary?id=D000000751 "Just a moment..."
- [needs_review] `src_012125` https://www.opensecrets.org/orgs/tenet-healthcare/lobbying?id=D000000751 "Just a moment..."
- [needs_review] `src_012133` https://investor.tenethealth.com/governance/disclosure-of-political-expenditures/default.aspx "Just a moment..."
- [needs_review] `src_012155` https://www.nhtsa.gov/recalls?manufacturer=Tenet%20Healthcare "Access Denied"

### American Gaming Association (4)

- [needs_review] `src_012180` https://www.opensecrets.org/orgs/american-gaming-assn/summary?id=D000023966 "Just a moment..."
- [needs_review] `src_012181` https://www.opensecrets.org/political-action-committees-pacs/american-gaming-assn/C00309146/summary/2024 "Just a moment..."
- [needs_review] `src_012183` https://www.americangaming.org/2024-commercial-gaming-revenue-reaches-71-9b-marking-fourth-straight-year-of-record-revenue/ "Just a moment..."
- [needs_review] `src_012192` https://www.americangaming.org/staff/bill-miller/ "Just a moment..."

### American Iron and Steel Institute (4)

- [needs_review] `src_013007` https://www.commerce.gov/issues/trade-enforcement/section-232-steel "Just a moment..."
- [needs_review] `src_013009` https://www.opensecrets.org/political-action-committees-pacs/american-iron-steel-institute/C00295097/summary/2022 "Just a moment..."
- [needs_review] `src_013011` https://www.usitc.gov/press_room/news_release/2023/er0315_63679.htm "Access Denied"
- [needs_review] `src_013017` https://www.opensecrets.org/news/2021/11/steel-producers-eyeing-new-infrastructure-investment-spend-big-on-lobbying/ "Just a moment..."

### Democratic Donor Network (4)

- [needs_review] `src_013788` https://www.opensecrets.org/outside-spending/by_group "Just a moment..."
- [needs_review] `src_013789` https://www.opensecrets.org/outside-spending/top_donors "Just a moment..."
- [needs_review] `src_013790` https://www.opensecrets.org/political-action-committees-pacs/actblue/C00401224/summary/2024 "Just a moment..."
- [needs_review] `src_013791` https://www.opensecrets.org/outside-spending/detail/2024?cmte=C00401224&tab=expenditures "Just a moment..."

### Ohio Federation of Teachers (4)

- [needs_review] `src_014089` https://www.opensecrets.org/orgs/american-federation-of-teachers/summary?id=d000000083 "Just a moment..."
- [needs_review] `src_014090` https://ohiocapitaljournal.com/2025/10/20/ohio-spent-more-than-a-billion-dollars-on-private-school-vouchers-in-fiscal-year-2025/ "Just a moment..."
- [needs_review] `src_014091` https://ohiocapitaljournal.com/2024/10/10/education-advocates-say-ohio-issue-1-could-significantly-impact-state-lawmakers-priorities/ "Just a moment..."
- [needs_review] `src_014092` https://ohiocapitaljournal.com/2024/01/03/ohio-public-education-supporters-look-to-2024-lawsuit-to-hold-private-voucher-system-accountable/ "Just a moment..."

### National Cattlemen's Beef Association (4)

- [needs_review] `src_014591` https://www.opensecrets.org/orgs/national-cattlemen-s-beef-assn/summary?id=D000000252 "Just a moment..."
- [needs_review] `src_014593` https://www.congress.gov/crs-product/RS22955 "Just a moment..."
- [needs_review] `src_014596` https://www.opensecrets.org/political-action-committees-pacs/national-cattlemen-s-beef-assn/C00028787/summary/2024 "Just a moment..."
- [needs_review] `src_014604` https://www.courtlistener.com/?q=%22National%20Cattlemen's%20Beef%20Association%22&type=r → https://www.courtlistener.com/?q=%22National%20Cattlemen%27s%20Beef%20Association%22&type=r "ERROR: The request could not be satisfied"

### Pipeline Guide (3)

- [dead] `src_000025` https://www.opensecrets.org/dark-money "Just a moment..."
- [dead] `src_000054` https://www.nhtsa.gov/nhtsa-datasets-and-apis "Access Denied"
- [generic_orphan] `src_000013` https://sam.gov → https://sam.gov/ "Home | SAM.gov"

### Center for American Progress (3)

- [dead] `src_000431` https://www.opensecrets.org/orgs/center-for-american-progress/summary?id=D000032441 "Just a moment..."
- [dead] `src_000435` https://www.americanprogress.org/c3-our-supporters/ "Just a moment..."
- [dead] `src_000439` https://www.politico.com/news/2021/06/30/center-for-american-progress-new-leader-497167 "Just a moment..."

### Cato Institute (3)

- [dead] `src_000671` https://www.opensecrets.org/orgs/cato-institute/summary?id=D000060583 "Just a moment..."
- [dead] `src_000708` https://rtp.fedsoc.org/podcast/deep-dive-ep-133/ "Just a moment..."
- [dead] `src_000711` https://www.federalregister.gov/documents/2024/06/11/2024-10872/building-for-the-future-through-electric-regional-transmission-planning-and-cost-allocation "Federal Register :: Something went wrong."

### Council on Foreign Relations (3)

- [dead] `src_001125` https://www.federalregister.gov/documents/2025/09/08/2025-17087/termination-of-the-2021-designation-of-venezuela-for-temporary-protected-status "Termination of the 2021 Designation of Venezuela for Temporary Protected Status"
- [dead] `src_001126` https://www.federalregister.gov/documents/search?conditions%5Bterm%5D=%22Council%20on%20Foreign%20Relations%22 "Source: Federal Register"
- [needs_review] `src_001100` https://www.opensecrets.org/orgs/council-on-foreign-relations/summary?id=D000032904 "Just a moment..."

### Third Way (3)

- [dead] `src_001172` https://www.federalregister.gov/documents/search?conditions%5Bterm%5D=%22Third%20Way%22 "Source: Federal Register"
- [needs_review] `src_001150` https://www.opensecrets.org/orgs/third-way/summary?id=D000092397 "Just a moment..."
- [needs_review] `src_001154` https://www.defense.gov/About/Biographies/Biography/article/2505290/mieke-eoyang/ "Access Denied"

### Pelosi-McCarthy House Leadership Mirror - Same Corporate Apparatus, Different Brand (3)

- [dead] `src_001497` https://www.npr.org/2020/12/08/944263124/house-approves-defense-bill-by-veto-proof-margin-despite-president-trumps-threat "NPR: House Approves Defense Bill by Veto-Proof Margin, Despite President Trump's"
- [dead] `src_001500` https://www.fec.gov/data/candidate/H6CA22125/ "FEC Candidate: Kevin McCarthy Campaign Finance Summary"
- [dead] `src_001502` https://www.fec.gov/data/committee/C00504530/ "FEC: Congressional Leadership Fund SuperPAC filings"

### AIPAC Locks Bipartisan Israel Policy While Politicians Fight on Everything Else (3)

- [dead] `src_001537` https://www.npr.org/2024/08/07/nx-s1-5066702/why-pro-israel-pacs-are-helping-oust-democrats-in-their-primaries "NPR: "Why Pro-Israel PACs are helping oust Democrats in their primaries""
- [needs_review] `src_001532` https://www.opensecrets.org/orgs/american-israel-public-affairs-cmte/summary?id=D000046963 "Just a moment..."
- [needs_review] `src_001559` https://www.axios.com/2025/07/31/israel-weapons-sales-democrats-vote-fail "Just a moment..."

### Schwarzman and Singer Fund Every Republican Faction (3)

- [dead] `src_001639` https://en.mercopress.com/2016/03/04/paul-singer-will-have-made-a-2.4bn-profit-with-the-argentine-defaulted-bonds "MercoPress: Paul Singer will have made a $2.4bn profit with the Argentine defaul"
- [needs_review] `src_001638` https://www.opensecrets.org/news/2015/11/heres-why-paul-singers-endorsement-of-rubio-matters "Just a moment..."
- [needs_review] `src_001643` https://www.axios.com/2022/11/16/trump-stephen-schwarzman-2024-presidential-race "Just a moment..."

### Tech Billionaires Switch Parties on Regulatory Self-Interest (3)

- [dead] `src_001700` https://www.npr.org/2019/03/11/702102576/democratic-candidates-target-tech-giants-who-are-major-party-donors "NPR: There's a presidential campaign donor battle going on in Silicon Valley"
- [needs_review] `src_001685` https://www.axios.com/2024/05/15/david-sacks-axios-bfd "Just a moment..."
- [needs_review] `src_001692` https://factually.co/fact-checks/politics/top-10-democratic-donors-2024-amounts-6e8b40 "Just a moment..."

### 2026-03-23 News Scan (3)

- [dead] `src_002275` https://www.npr.org/2026/03/22/nx-s1-5756308/trump-threatens-obliterate-irans-power-plants-iran-strikes-2-israeli-cities "NPR: Trump threatens to obliterate Iran's power plants"
- [generic_orphan] `src_002300` https://www.scotusblog.com/?q=2026-03-23%20News%20Scan "Homepage - SCOTUSblog"
- [needs_review] `src_002298` https://montco.today/2026/02/susquehanna-international-group-us-tiktok/ "Just a moment..."

### 2026-03-26 Story Discovery (3)

- [dead] `src_002480` https://www.npr.org/2026/03/12/nx-s1-5742566/senate-bipartisan-housing-bill-investors-ban "NPR: Senate passes bipartisan housing bill targeting large investors and easing "
- [needs_review] `src_002476` https://www.congress.gov/bill/119th-congress/senate-bill/394/text "Just a moment..."
- [needs_review] `src_002478` https://www.pharmacytimes.com/view/pbm-reform-within-2026-appropriations-bill-signed-into-law "Attention Required! | Cloudflare"

### Stephen Miller Master Profile (3)

- [dead] `src_002758` https://www.npr.org/2024/11/11/g-s1-33741/trump-stephen-miller-deputy-chief-of-staff-immigration-policy-deportations "NPR: Stephen Miller Deputy Chief of Staff appointment"
- [needs_review] `src_002753` https://www.axios.com/2025/05/28/immigration-ice-deportations-stephen-miller "Just a moment..."
- [needs_review] `src_002762` https://www.opensecrets.org/news/2022/12/tax-returns-reveal-finances-of-former-trump-aides-dark-money-group-bankrolling-divisive-ads-ahead-of-2022-midterms/ "Just a moment..."

### The Military Promotion Blockade and the Culture War as Donor Cover (3)

- [dead] `src_003106` https://www.npr.org/2023/12/19/1220492250/tuberville-drops-blockade-military-promotions "NPR: Tuberville drops remaining holds on military promotions"
- [dead] `src_003107` https://www.npr.org/2023/07/15/1187530846/tuberville-senate-rules-abortion-military "NPR: How Tuberville is holding up military promotions over abortion policy"
- [needs_review] `src_003111` https://alabamareflector.com/2023/12/05/tuberville-relents-on-months-long-blockade-of-most-military-nominees-blaming-democrats/ "Just a moment..."

### The 2024 Race - Most Expensive Senate Campaign in History (3)

- [dead] `src_003188` https://www.fec.gov/data/committee/C00822775/?tab=filings "FEC: Bitcoin Freedom PAC filings"
- [dead] `src_003191` https://www.npr.org/2017/05/26/530181660/robert-mercer-is-a-force-to-be-reckoned-with-in-finance-and-conservative-politic "NPR: Robert Mercer political donations and influence"
- [needs_review] `src_003190` https://www.axios.com/2026/01/25/cruz-trump-vance-secret-tapes "Just a moment..."

### Jon Husted Master Profile (3)

- [dead] `src_003491` https://www.fec.gov/data/committee/C00896019/ "FEC.gov: Committee "Husted for Senate" (C00896019)"
- [generic_orphan] `src_003490` https://www.husted.senate.gov/ "Home - Senator Jon Husted"
- [needs_review] `src_003488` https://ohiocapitaljournal.com/2026/01/16/husted-took-thousands-from-company-that-paid-ohio-88-million-to-settle-medicaid-fraud-allegations/ "Just a moment..."

### The Palantir State - Surveillance as Policy (3)

- [dead] `src_003791` https://www.npr.org/2025/05/01/nx-s1-5372776/palantir-tech-contracts-trump "NPR: How Palantir is rising in the Trump era"
- [needs_review] `src_003785` https://www.war.gov/News/Contracts/Search/palantir/ "Access Denied"
- [needs_review] `src_003786` https://www.opensecrets.org/donor-lookup/results?name=peter+thiel "Just a moment..."

### The NLRB Gutting and the Biggest Union Bust in American History (3)

- [dead] `src_003846` https://www.npr.org/2025/05/22/nx-s1-5366714/supreme-court-nlrb-mspb "NPR. Supreme Court Allows Trump to Fire Members of Independent Agency Boards (Ma"
- [dead] `src_003847` https://www.npr.org/2025/01/28/nx-s1-5277103/nlrb-trump-wilcox-abruzzo-democrats-labor "NPR. Trump Fires EEOC and Labor Board Officials (January 28, 2025)"
- [needs_review] `src_003849` https://www.americanprogress.org/article/the-trump-administration-is-quietly-gutting-minimum-wage-protections-for-millions-of-workers/ "Just a moment..."

### Immigration Enforcement - The Detention Economy (3)

- [dead] `src_003900` https://investors.geogroup.com/news-events-reports/sec-filings "GEO Group, Inc.: SEC Filings and 10-K Annual Reports"
- [dead] `src_003901` https://ir.corecivic.com/financial-information/sec-filings "CoreCivic, Inc.: SEC Filings and 10-K Annual Reports"
- [dead] `src_003902` https://www.npr.org/2026/01/21/nx-s1-5674887/ice-budget-funding-congress-trump "NPR: How ICE Became the Highest-Funded U.S. Law Enforcement Agency, January 2026"

### The Real Estate President and the Fair Housing Demolition (3)

- [dead] `src_003924` https://www.npr.org/2019/04/03/709529287/bipartisan-disapproval-over-trump-administrations-housing-program-cuts "NPR. Trump Budget Housing Rental Aid Cuts (May 2025)"
- [needs_review] `src_003922` https://bipartisanpolicy.org/article/president-trumps-executive-order-on-homelessness-a-shift-in-federal-policy/ "Just a moment..."
- [needs_review] `src_003925` https://www.opensecrets.org/orgs/national-assn-of-realtors/lobbying?id=D000000062 "Just a moment..."

### RFK Jr and the HHS Demolition - Make America Healthy Again Meets Pharma Deregulation (3)

- [dead] `src_003938` https://www.npr.org/2024/12/03/nx-s1-5198506/rfk-jr-anti-vaccine-chd-lawsuits "NPR: Inside RFK Jr.'s Nonprofit's Legal Battles"
- [needs_review] `src_003929` https://www.hhs.gov/press-room/eo-maha.html "Access Denied"
- [needs_review] `src_003954` https://www.fiercehealthcare.com/regulatory/medical-and-public-health-leaders-demand-rfk-jrs-resignation-hhs-employees-also-join "Just a moment..."

### Schedule F and the Deep State Purge - Replacing Civil Servants with Loyalists (3)

- [dead] `src_003972` https://www.npr.org/2020/10/31/929597578/a-huge-attack-critics-decry-trump-order-that-makes-firing-federal-workers-easier "NPR: Trump Removes Civil Service Protections with Schedule F Plan"
- [dead] `src_003981` https://www.oxfamamerica.org/press/trump-and-musks-proposed-irs-cuts-would-allow-ultra-rich-tax-cheats-to-steal-30-million-per-day-through-unlawful-tax-evasion/ "| Oxfam"
- [needs_review] `src_003976` https://www.americanprogress.org/article/project-2025-would-destroy-the-u-s-system-of-checks-and-balances-and-create-an-imperial-presidency/ "Just a moment..."

### The DeVos to McMahon Pipeline - Public Schools as Private Profit (3)

- [dead] `src_004030` https://www.npr.org/2025/03/03/nx-s1-5307078/trump-cabinet-linda-mcmahon-confirmed-education "NPR. Linda McMahon Confirmed as Education Secretary (March 3, 2025)"
- [dead] `src_004033` https://www.npr.org/2025/07/01/nx-s1-5453457/trump-school-funding-grants "NPR. Trump Admin Withholding Over $6 Billion in Education Grants (July 1, 2025)"
- [needs_review] `src_004034` https://www.americanprogress.org/article/inside-the-financial-holdings-of-billionaire-betsy-devos/ "Just a moment..."

### Scott Wiener (3)

- [dead] `src_005155` https://www.fec.gov/data/committee/C00909283/ "FEC: Wiener congressional campaign"
- [needs_review] `src_005156` https://www.opensecrets.org/officeholders/scott-wiener/contributors?cycle=2024&id=32203683 "Just a moment..."
- [needs_review] `src_005157` https://www.opensecrets.org/officeholders/scott-wiener/contributors?cycle=2017&id=32203683 "Just a moment..."

### Graham Platner Master Profile (3)

- [dead] `src_005411` https://www.npr.org/2025/10/10/nx-s1-5565245/oyster-farmer-and-veteran-graham-platner-hopes-his-message-lands-with-maine-voters "Oyster farmer and veteran Graham Platner hopes his message lands with Maine vote"
- [needs_review] `src_005400` https://www.washingtontimes.com/news/2026/mar/19/elizabeth-warren-endorses-platner-maine-senate-primary-mills-rips/ "Just a moment..."
- [needs_review] `src_005405` https://mainemorningstar.com/2025/08/28/the-oysterman-trying-to-oust-susan-collins-raised-1-million-in-nine-days/ "Just a moment..."

### Rashida Tlaib (3)

- [dead] `src_005926` https://www.npr.org/2023/11/07/1211315549/tlaib-censure-house-israel-gaza "NPR: House votes to censure Rep. Rashida Tlaib"
- [generic_orphan] `src_005938` https://tlaib.house.gov/ "Home"
- [needs_review] `src_005934` https://www.dsausa.org/statements/democratic-socialists-of-america-condemn-the-censure-of-congresswoman-rashida-tlaib/ "Just a moment..."

### The AIPAC Primary Machine and Foreign Affairs Removal (3)

- [dead] `src_006160` https://www.npr.org/2023/02/02/1153472237/ilhan-omar-foreign-affairs-committee-vote-republicans-remove "NPR: House GOP removes Ilhan Omar from Foreign Affairs Committee"
- [dead] `src_006161` https://www.npr.org/2024/08/14/nx-s1-5073957/democratic-rep-ilhan-omar-wins-primary-despite-spending-from-pro-israel-group "NPR: Pro-Israel group sits out Ilhan Omar's 2024 primary"
- [needs_review] `src_006159` https://www.opensecrets.org/races/summary?cycle=2022&id=MN05 "Just a moment..."

### Newsom 2028 - The Donor Class Presidential Campaign (3)

- [dead] `src_006522` https://www.npr.org/2023/11/07/1209090515/2023-results-key-kentucky-elections "NPR: Kentucky election results: Gov. Andy Beshear wins reelection"
- [needs_review] `src_006523` https://www.opensecrets.org/political-action-committees-pacs/campaign-for-democracy-pac/C00836320/summary/2024 "Just a moment..."
- [needs_review] `src_006532` https://www.opensecrets.org/news/2026/01/democratic-presidential-contenders-test-the-waters-during-midterm-shadow-campaign/ "Just a moment..."

### Fierce Government Relations (3)

- [dead] `src_008106` https://www.npr.org/2026/02/24/nx-s1-5725327/pentagon-anthropic-hegseth-safety "NPR: Hegseth threatens to blacklist Anthropic over 'woke AI' concerns (February "
- [needs_review] `src_008101` https://www.opensecrets.org/revolving-door?id=D000021982 "Just a moment..."
- [needs_review] `src_008108` https://www.opensecrets.org/news/2026/03/anthropics-ai-safety-stance-clashes-with-pentagon-and-reshapes-spending-on-primaries/ "Just a moment..."

### Charles Schwab (3)

- [dead] `src_008774` https://www.federalregister.gov/documents/2025/09/23/2025-18380/self-regulatory-organizations-investors-exchange-llc-order-approving-a-proposed-rule-change-as "Federal Register :: Something went wrong."
- [needs_review] `src_008765` https://www.opensecrets.org/orgs/charles-schwab-corp/summary?id=D000000414 "Just a moment..."
- [needs_review] `src_008784` https://www.nhtsa.gov/recalls?manufacturer=Charles%20Schwab "Access Denied"

### Elliott Management (3)

- [dead] `src_008827` https://www.npr.org/2023/06/21/1183456911/justice-alito-propublica-singer "NPR: Justice Alito disputes ProPublica report"
- [needs_review] `src_008819` https://www.opensecrets.org/donor-lookup/results?name=paul+singer&order=desc&sort=D "Just a moment..."
- [needs_review] `src_008821` https://www.opensecrets.org/outside-spending/donor_detail/2024?id=U0000000066&name=Singer,+Paul&super_only=S&type=I "Just a moment..."

### Morgan Stanley (3)

- [dead] `src_008971` https://www.federalregister.gov/documents/2026/04/01/2026-06234/deregistration-under-section-8f-of-the-investment-company-act-of-1940 "Federal Register :: Something went wrong."
- [needs_review] `src_008958` https://www.opensecrets.org/orgs/morgan-stanley/summary?id=D000000106 "Just a moment..."
- [needs_review] `src_008959` https://www.opensecrets.org/orgs/morgan-stanley/lobbying?id=D000000106 "Just a moment..."

### Save America PAC (3)

- [dead] `src_009826` https://www.npr.org/2022/12/19/1144230127/jan-6-committee-votes-on-criminal-referrals-against-trump "Source: [NPR: January 6 Panel — Trump Campaign Misled Donors"
- [dead] `src_009834` https://www.fec.gov/data/committee/C00867937/ "FEC: Trump 47 Committee"
- [needs_review] `src_009825` https://www.opensecrets.org/political-action-committees-pacs/save-america/C00762591/summary/2024 "Just a moment..."

### Pharmaceutical Industry (3)

- [dead] `src_010490` https://www.federalregister.gov/documents/search?conditions%5Bterm%5D=%22Pharmaceutical%20Industry%22 "Source: Federal Register"
- [needs_review] `src_010477` https://www.congress.gov/crs-product/R47872 "Just a moment..."
- [needs_review] `src_010478` https://www.fiercepharma.com/pharma/big-pharma-greets-hundreds-ex-federal-workers-at-revolving-door "Just a moment..."

### Purdue Pharma - Sackler Family (3)

- [dead] `src_010534` https://www.npr.org/2019/09/09/758927743/sacklers-reject-demand-they-surrender-personal-wealth-to-settle-opioid-claims "NPR: Sackler family's 'personal wealth' offered in opioid deal"
- [needs_review] `src_010527` https://www.opensecrets.org/news/2019/04/purdue-pharma-and-the-sackler-family-under-scrutiny-for-role-in-opioid-crisis-are-big-political-spenders/ "Just a moment..."
- [needs_review] `src_010537` https://www.nhtsa.gov/recalls?manufacturer=Purdue%20Pharma%20-%20Sackler%20Family "Access Denied"

### Sinclair Broadcasting Group (3)

- [dead] `src_011491` https://www.npr.org/2018/04/02/598916366/sinclair-broadcast-group-forces-nearly-200-station-anchors-to-read-same-script "NPR: Sinclair Broadcast Group Forces Nearly 200 Station Anchors To Read Same Scr"
- [dead] `src_011492` https://www.fcc.gov/document/sinclair-broadcast-group-approval "FCC: Broadcast station ownership limits and Sinclair compliance"
- [dead] `src_011502` https://www.federalregister.gov/documents/2000/03/23/00-7130/review-of-the-commissions-rules-and-policies-affecting-the-conversion-to-digital-television "Federal Register :: Something went wrong."

### Verizon (3)

- [dead] `src_011521` https://www.fcc.gov/auction-results "FCC: Spectrum auction results"
- [needs_review] `src_011520` https://www.opensecrets.org/orgs/verizon-communications/summary?id=D000000079 "Just a moment..."
- [needs_review] `src_011524` https://www.nhtsa.gov/recalls?manufacturer=Verizon "Access Denied"

### Airbnb (3)

- [dead] `src_012178` https://www.federalregister.gov/documents/search?conditions%5Bterm%5D=%22Airbnb%22 "Source: Federal Register"
- [needs_review] `src_012169` https://www.opensecrets.org/orgs/airbnb-inc/summary?id=D000067232 "Just a moment..."
- [needs_review] `src_012171` https://www.nhtsa.gov/recalls?manufacturer=Airbnb "Access Denied"

### Instacart (3)

- [dead] `src_012274` https://www.federalregister.gov/documents/search?conditions%5Bterm%5D=%22Instacart%22 "Source: Federal Register"
- [needs_review] `src_012270` https://www.opensecrets.org/orgs/instacart/summary?id=D000074851 "Just a moment..."
- [needs_review] `src_012275` https://www.nhtsa.gov/recalls?manufacturer=Instacart "Access Denied"

### NextEra Energy (3)

- [dead] `src_012787` https://www.federalregister.gov/documents/2026/04/02/2026-06381/combined-notice-of-filings "Combined Notice of Filings"
- [dead] `src_012788` https://www.federalregister.gov/documents/2026/03/31/2026-06239/review-of-the-commissions-rules-governing-the-896-901935-940-mhz-band "Review of the Commission's Rules Governing the 896-901/935-940 MHz Band"
- [dead] `src_012789` https://www.federalregister.gov/documents/2026/03/17/2026-05121/monthly-notice-applications-and-amendments-to-facility-operating-licenses-and-combined-licenses "Monthly Notice; Applications and Amendments to Facility Operating Licenses and C"

### Southern Company (3)

- [dead] `src_012844` https://www.federalregister.gov/documents/2025/12/31/2025-24102/effluent-limitations-guidelines-and-standards-for-the-steam-electric-power-generating-point-source "Effluent Limitations Guidelines and Standards for the Steam Electric Power Gener"
- [dead] `src_012847` https://www.federalregister.gov/documents/2025/08/22/2025-16088/accelerating-wireline-broadband-deployment-by-removing-barriers-to-infrastructure-investment "Accelerating Wireline Broadband Deployment by Removing Barriers to Infrastructur"
- [dead] `src_012848` https://www.federalregister.gov/documents/search?conditions%5Bterm%5D=%22Southern%20Company%22 "Source: Federal Register"

### Western States Petroleum Association (3)

- [dead] `src_012878` https://www.federalregister.gov/documents/2023/10/20/2023-23261/california-state-nonroad-engine-pollution-control-standards-ocean-going-vessels-at-berth-notice-of "California State Nonroad Engine Pollution Control Standards; Ocean-Going Vessels"
- [dead] `src_012882` https://www.federalregister.gov/documents/2016/07/15/2016-16266/water-quality-standards-establishment-of-revised-numeric-criteria-for-selenium-for-the-san-francisco "Water Quality Standards; Establishment of Revised Numeric Criteria for Selenium "
- [dead] `src_012883` https://www.federalregister.gov/documents/2012/12/20/2012-30696/notice-of-availability-of-proposed-national-pollutant-discharge-elimination-system-npdes-general

### Williams Companies (3)

- [dead] `src_012914` https://www.federalregister.gov/documents/search?conditions%5Bterm%5D=%22Williams%20Companies%22 "Source: Federal Register"
- [needs_review] `src_012896` https://www.opensecrets.org/political-action-committees-pacs/williams-companies/C00040394/candidate-recipients/2024 "Just a moment..."
- [needs_review] `src_012909` https://www.nhtsa.gov/recalls?manufacturer=Williams%20Companies "Access Denied"

### Anduril Industries (3)

- [dead] `src_013050` https://www.federalregister.gov/documents/2025/02/24/2025-02971/hazardous-materials-notice-of-applications-for-modification-to-special-permits "Hazardous Materials: Notice of Applications for Modification to Special Permits"
- [dead] `src_013051` https://www.federalregister.gov/documents/search?conditions%5Bterm%5D=%22Anduril%20Industries%22 "Source: Federal Register"
- [needs_review] `src_013043` https://www.nhtsa.gov/recalls?manufacturer=Anduril%20Industries "Access Denied"

### Honeywell International (3)

- [dead] `src_013237` https://www.federalregister.gov/documents/2025/06/23/2025-11486/in-the-matter-of-honeywell-international-inc-direct-and-indirect-transfers-of-license "In the Matter of Honeywell International, Inc.; Direct and Indirect Transfers of"
- [dead] `src_013239` https://www.federalregister.gov/documents/search?conditions%5Bterm%5D=%22Honeywell%20International%22 "Source: Federal Register"
- [needs_review] `src_013233` https://www.opensecrets.org/orgs/honeywell-international/summary?id=D000000334 "Just a moment..."

### Business Roundtable (3)

- [dead] `src_013687` https://www.federalregister.gov/documents/2024/08/05/2024-17221/solicitation-of-nominations-for-appointment-to-the-advisory-committee-on-veterans-employment "Solicitation of Nominations for Appointment to the Advisory Committee on Veteran"
- [needs_review] `src_013671` https://www.opensecrets.org/orgs/business-roundtable/lobbying?id=D000032202 "Just a moment..."
- [needs_review] `src_013676` https://www.opensecrets.org/orgs/business-roundtable/totals?id=D000032202 "Just a moment..."

### Entertainment and Hollywood Donors (3)

- [dead] `src_013842` https://www.npr.org/2023/10/21/1207783685/celebrities-letter-ceasefire-israel-gaza-biden "NPR: Celebrities sign letter to Biden urging cease-fire in Gaza"
- [needs_review] `src_013832` https://www.opensecrets.org/orgs/motion-picture-assn/summary?id=D000027729 "Just a moment..."
- [needs_review] `src_013837` https://www.axios.com/2024/08/01/kamala-harris-campaign-hollywood-support "Just a moment..."

### Monsanto - Bayer (3)

- [dead] `src_014584` https://www.npr.org/sections/thesalt/2013/03/21/174973235/did-congress-just-give-gmos-a-free-pass-in-the-courts "NPR: The "Monsanto Protection Act" explained"
- [needs_review] `src_014581` https://www.opensecrets.org/orgs/monsanto-co/summary?id=D000000055 "Just a moment..."
- [needs_review] `src_014582` https://supreme.justia.com/cases/federal/us/569/278/ "Just a moment..."

### Western Growers Association (3)

- [dead] `src_014660` https://www.fec.gov/data/committee/C00193979/ "FEC: Western Growers Political Action Committee"
- [needs_review] `src_014663` https://projects.propublica.org/nonprofits/download-filing?path=IRS%2F751972150_202312_990O_2024061722526159.pdf "Security Check — ProPublica"
- [needs_review] `src_014664` https://www.opensecrets.org/orgs/western-growers-assn/summary?id=D000029824 "Just a moment..."

### TikTok - ByteDance (3)

- [generic_orphan] `src_009522` https://www.supremecourt.gov/search.aspx?Search=TikTok%20-%20ByteDance "Search - Supreme Court of the United States"
- [needs_review] `src_009520` https://www.opensecrets.org/orgs/bytedance-inc/summary?id=D000073174 "Just a moment..."
- [needs_review] `src_009524` https://www.nhtsa.gov/recalls?manufacturer=TikTok%20-%20ByteDance "Access Denied"

### Palantir Technologies (3)

- [generic_orphan] `src_011137` https://www.palantir.com/ "Home | Palantir"
- [needs_review] `src_011117` https://www.opensecrets.org/political-action-committees-pacs/palantir-technologies/C00498691/candidate-recipients/2024 "Just a moment..."
- [needs_review] `src_011127` https://www.nhtsa.gov/recalls?manufacturer=Palantir%20Technologies "Access Denied"

### NORPAC (3)

- [generic_orphan] `src_011920` https://norpac.net → https://norpac.net/ "Home - NORPAC"
- [needs_review] `src_011924` https://www.opensecrets.org/political-action-committees-pacs/norpac/C00247403/summary/2024 "Just a moment..."
- [needs_review] `src_011925` https://www.opensecrets.org/political-action-committees-pacs/norpac/C00247403/candidate-recipients/2024 "Just a moment..."

### Aspen Institute (3)

- [needs_review] `src_000970` https://www.opensecrets.org/orgs/aspen-institute/summary?id=D000044180 "Just a moment..."
- [needs_review] `src_000972` https://www.aspeninstitute.org/programs/congressional-program/ "Just a moment..."
- [needs_review] `src_000977` https://www.cpr.org/2024/09/24/congress-members-and-family-travel-paid-by-private-interest-groups/ "Just a moment..."

### Ohio 2026 Special Senate Election (3)

- [needs_review] `src_001994` https://ohiocapitaljournal.com/2026/02/04/democrat-sherrod-brown-leads-ohio-republican-u-s-sen-jon-husted-in-quarterly-fundraising/ "Just a moment..."
- [needs_review] `src_001998` https://www.axios.com/2025/10/15/senate-brown-husted-ohio-unions "Just a moment..."
- [needs_review] `src_001999` https://ohiocapitaljournal.com/2026/03/18/poll-shows-the-ohio-us-senate-race-is-statistically-tied-and-that-health-insurance-is-a-big-concern/ "Just a moment..."

### 2026-03-26 Finance Research (3)

- [needs_review] `src_002109` https://www.opensecrets.org/news/2025/04/private-prison-companies-positioned-to-benefit-from-increased-deportations/ "Just a moment..."
- [needs_review] `src_002111` https://www.opensecrets.org/orgs/raytheon-technologies/summary?id=D000072615 "Just a moment..."
- [needs_review] `src_002112` https://www.opensecrets.org/donor-lookup/results?name=David+Sacks&state=CA&cycle=2024&order=desc&sort=D "Just a moment..."

### Tim Scott (3)

- [needs_review] `src_003145` https://www.opensecrets.org/2024-presidential-race?id=N00031782 "Just a moment..."
- [needs_review] `src_003146` https://www.congress.gov/bill/115th-congress/house-bill/1/text "Just a moment..."
- [needs_review] `src_003155` https://www.bostonreview.net/articles/the-false-promise-of-opportunity-zones/ "Attention Required! | Cloudflare"

### The Libertarian Brand and the Koch Network Reality (3)

- [needs_review] `src_003287` https://www.opensecrets.org/members-of-congress/contributors?cid=N00030836&cycle=CAREER "Just a moment..."
- [needs_review] `src_003288` https://www.opensecrets.org/orgs/koch-industries/recipients?id=D000000186 "Just a moment..."
- [needs_review] `src_003293` https://www.opensecrets.org/orgs/koch-industries/summary?id=D000000186 "Just a moment..."

### Mike Crapo (3)

- [needs_review] `src_003337` https://www.opensecrets.org/members-of-congress/summary?cid=N00006267 "Just a moment..."
- [needs_review] `src_003343` https://idahocapitalsun.com/2025/08/22/sen-crapo-lauds-big-beautiful-bill-and-support-of-group-founded-by-koch-brothers-at-private-event/ "Just a moment..."
- [needs_review] `src_003345` https://www.pwc.com/us/en/services/tax/library/chairman-crapo-releases-substitute-house-passed-tax-package.html "Access Denied"

### Mike Collins Master Profile (3)

- [needs_review] `src_003354` https://georgiarecorder.com/briefs/u-s-senate-gop-hopefuls-say-they-raised-nearly-2m-each-in-fight-for-georgia-seat/ "Just a moment..."
- [needs_review] `src_003355` https://georgiarecorder.com/briefs/ossoff-raises-another-12-million-as-he-fights-for-reelection-in-closely-watched-2026-senate-race/ "Just a moment..."
- [needs_review] `src_003358` https://georgiarecorder.com/briefs/more-details-released-about-ethics-investigation-into-congressman-mike-collins-and-former-top-aide/ "Just a moment..."

### The Impeachment Vote and the Petrochemical Protection (3)

- [needs_review] `src_003653` https://www.cookpolitical.com/analysis/senate/louisiana-senate/bayou-battle-looms-cassidy-tries-repent-trump-impeachment-vote "Just a moment..."
- [needs_review] `src_003654` https://lailluminator.com/2021/02/05/despite-sen-cassidys-critiques-louisianans-have-lamented-cancer-alley-since-the-80s/ "Just a moment..."
- [needs_review] `src_003657` https://19thnews.org/2026/01/louisiana-senate-2026-cassidy-letlow/ "Attention Required! | Cloudflare"

### Doug Collins (3)

- [needs_review] `src_003745` https://www.opensecrets.org/members-of-congress/summary?cid=N00033518 "Just a moment..."
- [needs_review] `src_003746` https://www.opensecrets.org/news/2025/04/trump-administration-profile-doug-collins/ "Just a moment..."
- [needs_review] `src_003747` https://www.opensecrets.org/news/2025/12/how-money-is-driving-the-push-to-privatize-veterans-health-care/ "Just a moment..."

### Cori Bush (3)

- [needs_review] `src_006282` https://www.congress.gov/bill/118th-congress/house-resolution/786 "Just a moment..."
- [needs_review] `src_006290` https://www.politico.com/live-updates/2025/10/03/congress/cori-bushs-comeback-00592723 "Just a moment..."
- [needs_review] `src_006295` https://www.congress.gov/member/cori-bush/B001224 "Just a moment..."

### The Both-Sides Illusion (Media Edition) — Shared Infrastructure Behind Opposing Voices (3)

- [needs_review] `src_006925` https://www.investopedia.com/rumble-stock-soars-after-video-platform-gets-usd775m-investment-from-tether-8765696 "Simple Page"
- [needs_review] `src_006935` https://qz.com/david-sacks-donald-trump-fundraiser-silicon-valley-tech-1851525573 "Attention Required! | Cloudflare"
- [needs_review] `src_006956` https://www.benton.org/headlines/yes-sinclair-broadcast-group-does-cut-local-news-increase-national-news-and-tilt-its "Attention Required! | Cloudflare"

### BGR Group (3)

- [needs_review] `src_007978` https://www.opensecrets.org/revolving-door/duffy-sean-p/summary?id=82248 "Just a moment..."
- [needs_review] `src_007979` https://www.opensecrets.org/news/2025/11/as-lobbying-revenue-grows-at-record-pace-trump-aligned-firms-reap-the-biggest-rewards "Just a moment..."
- [needs_review] `src_007980` https://www.opensecrets.org/news/2023/12/top-firms-rake-in-millions-lobbying-for-foreign-nations-on-us-defense-budget/ "Just a moment..."

### Walmart (3)

- [needs_review] `src_009016` https://www.opensecrets.org/orgs/walmart-inc/summary?id=D000000367 "Just a moment..."
- [needs_review] `src_009018` https://www.opensecrets.org/political-action-committees-pacs/walmart-inc/C00093054/candidate-recipients/2024 "Just a moment..."
- [needs_review] `src_009019` https://www.opensecrets.org/orgs/walmart-inc/lobbying?id=D000000367 "Just a moment..."

### FTX - Sam Bankman-Fried (3)

- [needs_review] `src_009307` https://www.congress.gov/bill/117th-congress/senate-bill/4760 "Just a moment..."
- [needs_review] `src_009308` https://www.opensecrets.org/political-action-committees-pacs/protect-our-future-pac/C00801514/summary/2022 "Just a moment..."
- [needs_review] `src_009320` https://www.courthousenews.com/former-ftx-executive-ryan-salame-sentenced-to-7-5-years-for-election-donor-scheme-with-sam-bankman-fried/ "Attention Required! | Cloudflare"

### Microsoft (3)

- [needs_review] `src_009385` https://www.opensecrets.org/orgs/microsoft-corp/summary?id=D000000115 "Just a moment..."
- [needs_review] `src_009386` https://www.opensecrets.org/orgs/microsoft-corp/lobbying?id=D000000115 "Just a moment..."
- [needs_review] `src_009387` https://www.defense.gov/News/Releases/Release/Article/3239378/ "Access Denied"

### DSCC - Democratic Senatorial Campaign Committee (3)

- [needs_review] `src_009621` https://www.opensecrets.org/political-parties/DSCC/2024/summary?name=democratic-senatorial-campaign-cmte "Just a moment..."
- [needs_review] `src_009622` https://www.opensecrets.org/political-parties/DSCC/2024/contributors?name=democratic-senatorial-campaign-cmte "Just a moment..."
- [needs_review] `src_009623` https://www.opensecrets.org/political-parties/DSCC/2024/expenditures?name=democratic-senatorial-campaign-cmte "Just a moment..."

### MAGA Small Dollar Base (3)

- [needs_review] `src_009710` https://www.opensecrets.org/2024-presidential-race/small-donors "Just a moment..."
- [needs_review] `src_009711` https://www.opensecrets.org/political-action-committees-pacs/winred/C00694323/summary/2024 "Just a moment..."
- [needs_review] `src_009718` https://www.opensecrets.org/news/2024/11/big-money-big-stakes-5-things-everyone-should-know-about-money-in-2024-election/ "Just a moment..."

### Priorities USA Action (3)

- [needs_review] `src_009807` https://www.opensecrets.org/political-action-committees-pacs/C00495861/summary/2024 "Just a moment..."
- [needs_review] `src_009808` https://www.opensecrets.org/political-action-committees-pacs/priorities-usa-action/C00495861/independent-expenditures/2020 "Just a moment..."
- [needs_review] `src_009809` https://www.opensecrets.org/orgs/priorities-usa-priorities-usa-action/summary?id=D000065503 "Just a moment..."

### PhRMA - Pharmaceutical Research and Manufacturers of America (3)

- [needs_review] `src_010498` https://www.fiercepharma.com/pharma/appeals-court-resurrects-phrmas-lawsuit-challenging-drug-pricing-provisions-ira "Just a moment..."
- [needs_review] `src_010507` https://www.commonwealthfund.org/publications/issue-briefs/2020/apr/lower-drug-costs-now-act-hr3-how-it-would-work "Just a moment..."
- [needs_review] `src_010525` https://www.nhtsa.gov/recalls?manufacturer=PhRMA%20-%20Pharmaceutical%20Research%20and%20Manufacturers%20of%20America "Access Denied"

### Adelson Family (3)

- [needs_review] `src_010539` https://www.politico.com/news/2021/01/12/adelson-super-pac-gop-458380 "Just a moment..."
- [needs_review] `src_010540` https://www.opensecrets.org/donor-lookup/results?name=adelson "Just a moment..."
- [needs_review] `src_010541` https://www.opensecrets.org/outside-spending/donor_detail/2024?id=U0000000310&name=Adelson,+Miriam+O.&super_only=N&type=I "Just a moment..."

### UPS (3)

- [needs_review] `src_011357` https://www.opensecrets.org/orgs/united-parcel-service/summary?id=D000000081 "Just a moment..."
- [needs_review] `src_011359` https://www.opensecrets.org/political-action-committees-pacs/united-parcel-service/C00064766/candidate-recipients/2024 "Just a moment..."
- [needs_review] `src_011371` https://www.nhtsa.gov/recalls?manufacturer=UPS "Access Denied"

### AIPAC - American Israel Public Affairs Committee (3)

- [needs_review] `src_011823` https://www.politico.com/news/2024/06/09/aipac-republican-donors-democratic-primaries-00162404 "Just a moment..."
- [needs_review] `src_011824` https://www.politico.com/news/2024/10/30/israel-aipac-funded-congress-travel-00185167 "Just a moment..."
- [needs_review] `src_011845` https://ncnewsline.com/2026/02/27/outsiders-spent-nearly-4-2m-in-nc-04-primary-most-expensive-in-state-history/ "Just a moment..."

### Cigna Group (3)

- [needs_review] `src_012012` https://www.opensecrets.org/orgs/cigna-group/summary?id=D000025719 "Just a moment..."
- [needs_review] `src_012013` https://www.opensecrets.org/orgs/cigna-group/lobbying?id=D000025719 "Just a moment..."
- [needs_review] `src_012018` https://www.nhtsa.gov/recalls?manufacturer=Cigna%20Group "Access Denied"

### Gulf State Money - Saudi Arabia, UAE, Qatar (3)

- [needs_review] `src_012316` https://www.opensecrets.org/fara/countries/1 "Just a moment..."
- [needs_review] `src_012317` https://www.opensecrets.org/fara/countries/143 "Just a moment..."
- [needs_review] `src_012325` https://www.fdd.org/analysis/2025/11/21/inside-qatars-225-million-effort-to-court-us-policymakers-and-press/ "Attention Required! | Cloudflare"

### American Fuel and Petrochemical Manufacturers (3)

- [needs_review] `src_012365` https://www.opensecrets.org/orgs/american-fuel-petrochemical-manufacturers/summary?id=D000000481 "Just a moment..."
- [needs_review] `src_012366` https://www.opensecrets.org/orgs/american-fuel-petrochem-manufacturers/summary?id=D000027874 "Just a moment..."
- [needs_review] `src_012370` https://www.nhtsa.gov/recalls?manufacturer=American%20Fuel%20and%20Petrochemical%20Manufacturers "Access Denied"

### Raytheon (RTX Corporation) (3)

- [needs_review] `src_013432` https://www.opensecrets.org/news/reports/capitalizing-on-conflict/yemen-case-study "Just a moment..."
- [needs_review] `src_013447` https://news.usni.org/2026/02/04/raytheon-to-bolster-tomahawk-and-sm-6-production-in-critical-munition-deal "Just a moment..."
- [needs_review] `src_013451` https://www.nhtsa.gov/recalls?manufacturer=Raytheon%20(RTX%20Corporation "Access Denied"

### House Freedom Caucus (3)

- [needs_review] `src_013881` https://www.opensecrets.org/orgs/house-freedom-fund/summary?id=D000068902 "Just a moment..."
- [needs_review] `src_013882` https://www.opensecrets.org/political-action-committees-pacs/house-freedom-fund/C00552851/summary/2024 "Just a moment..."
- [needs_review] `src_013888` https://www.axios.com/2025/09/01/house-freedom-caucus-losing-clout-influence "Just a moment..."

### John Deere (3)

- [needs_review] `src_014549` https://www.opensecrets.org/orgs/deere-co/summary?id=D000000504 "Just a moment..."
- [needs_review] `src_014555` https://projects.propublica.org/nonprofits/download-filing?path=IRS%2F366051024_202310_990PF_2024110422794422.pdf "Security Check — ProPublica"
- [needs_review] `src_014556` https://www.nhtsa.gov/recalls?manufacturer=John%20Deere "Access Denied"

### Cross-Think-Tank Donor Map — The Both-Sides Illusion With Receipts (2)

- [dead] `src_000365` https://www.opensecrets.org/orgs/heritage-foundation/summary?id=D000034435 "Just a moment..."
- [dead] `src_000366` https://www.opensecrets.org/orgs/brookings-institution/summary?id=D000032148 "Just a moment..."

### The Idea Laundering Pipeline — How Think Tank Research Becomes Law (2)

- [dead] `src_000387` https://www.npr.org/transcripts/138537515 "NPR: How ALEC Shapes States' Legislation Behind The Scenes"
- [dead] `src_000388` https://www.epi.org/publication/why-america-needs-a-15-minimum-wage/ "Attention Required! | Cloudflare"

### Brennan Center for Justice (2)

- [dead] `src_000425` https://www.federalregister.gov/documents/2022/04/29/2022-09162/community-advantage-pilot-program "Federal Register :: Something went wrong."
- [dead] `src_000427` https://www.federalregister.gov/documents/2016/03/11/2016-05616/sunshine-act-meeting-notice "Federal Register :: Something went wrong."

### New America (2)

- [dead] `src_000539` https://www.npr.org/2017/08/31/547491063/google-funded-think-tank-fires-scholar-who-criticized-tech-giant "NPR: Google-Funded Think Tank Fires Scholar Who Criticized Tech Giant (2017)"
- [generic_orphan] `src_000542` https://www.gleif.org/ → https://www.gleif.org/en "Home – GLEIF"

### Urban Institute (2)

- [dead] `src_000585` https://www.urban.org/research/data-methods/data-analysis/quantitative-data-analysis/microsimulation/transfer-income-model-trim "Just a moment..."
- [dead] `src_000591` https://www.urban.org/research/publication/how-government-funding-disruptions-affected-nonprofits-early-2025 "Just a moment..."

### Ohio 2026 - The Donor Pipeline Comparison - Acton vs Ramaswamy (2)

- [dead] `src_001273` https://www.fec.gov/data/committee/C00892471/ "FEC: MAGA Inc. January 2025 donations (January 17 Yass $1M)"
- [needs_review] `src_001275` https://www.opensecrets.org/2024-presidential-race "Just a moment..."

### Sports Gambling Industry State Capture (2)

- [dead] `src_001395` https://www.npr.org/2023/04/06/1168349259/the-story-behind-the-sports-betting-boom "NPR: The Story Behind the Sports Betting Boom"
- [needs_review] `src_001393` https://www.americangaming.org/?q=Sports%20Gambling%20Industry%20State%20Capture "Just a moment..."

### Booker-Scott Donor Class Mirror - Two Black Senators, One Donor Class (2)

- [dead] `src_001447` https://www.npr.org/2021/09/22/1039718450/congressional-negotiators-have-failed-to-reach-a-deal-on-police-reform "NPR: Congressional Negotiators Have Failed to Reach a Deal on Police Reform"
- [needs_review] `src_001444` https://www.congress.gov/bill/115th-congress/senate-bill/3649 "Just a moment..."

### How Money Captures Media — The Donor Map Media Pipeline (2)

- [dead] `src_001492` https://www.fec.gov/data/committee/C00814152/ "FEC: TURNING POINT PAC INC. committee overview"
- [dead] `src_001493` https://www.fec.gov/data/committee/C00835587/ "FEC: VOTE SAVE AMERICA, committee overview (C00835587)"

### Goldman Sachs Funds Both Sides of Financial Regulation (2)

- [dead] `src_001515` https://www.npr.org/2016/01/14/463093708/the-ted-cruz-goldman-sachs-loan-explained "NPR: The Ted Cruz Goldman Sachs Loan, Explained"
- [needs_review] `src_001524` https://www.opensecrets.org/news/2017/03/revolving-door-goldman-sachs/ "Just a moment..."

### Koch vs Soros Mirror Image Dark Money Machines (2)

- [dead] `src_001665` https://www.npr.org/2016/01/19/463551038/dark-money-delves-into-how-koch-brothers-donations-push-their-political-agenda "'Dark Money': Koch Brothers' Donations Push Their Political Agenda. NPR"
- [needs_review] `src_001646` https://www.opensecrets.org/orgs/americans-for-prosperity/summary?id=D000024046 "Just a moment..."

### Jeff Yass Follows TikTok Money Across Every Candidate (2)

- [dead] `src_001707` https://www.alleyesonyass.com/statements/aug-5-2025 "The Intercept / Sludge: "How Jeff Yass Bought Trump's TikTok Flip-Flop""
- [generic_orphan] `src_001704` https://www.supremecourt.gov/search.aspx?Search=Contradiction%2010%20-%20Jeff%20Yass%20Follows%20TikTok%20Money%20Across%20Every%20Candidate "Search - Supreme Court of the United States"

### Timothy Mellon Funds Trump and RFK Jr Simultaneously (2)

- [dead] `src_001721` https://www.npr.org/2024/08/23/nx-s1-5086838/robert-kennedy-future-plans-trump "RFK Jr. suspends his independent presidential campaign and backs Trump"
- [needs_review] `src_001716` https://www.opensecrets.org/news/2024/08/heir-to-andrew-mellons-fortune-spends-over-165-million-to-support-trumps-reelection/ "Just a moment..."

### Prison Telecom Monopoly Profits From Bipartisan Neglect (2)

- [dead] `src_001874` https://www.fcc.gov/document/fcc-caps-rates-incarcerated-peoples-communications "FCC: Martha Wright-Reed Implementation Order (July 2024)"
- [dead] `src_001875` https://www.fcc.gov/document/fcc-updates-incarcerated-peoples-communications-rules "FCC: October 2025 Rollback Order"

### Florida 2026 Special Senate Election (2)

- [dead] `src_001926` https://www.fec.gov/data/committee/C00234120/ "FEC: United States Sugar Corporation PAC"
- [dead] `src_001928` https://www.fec.gov/data/committee/C00030718/ "FEC: National Association of Realtors PAC"

### Kentucky 2026 Senate Race (2)

- [dead] `src_001949` https://www.fec.gov/data/candidate/H0KY06104/ "FEC Candidate: Andy Barr Career Industries"
- [dead] `src_001953` https://www.kentucky.com/news/politics-government/article314530709.html "Kentucky.com: Donor Analysis"

### 2026-03-18 News Scan (2)

- [dead] `src_002151` https://www.npr.org/2026/02/11/nx-s1-5678273/trump-epa-climate-change-endangerment "NPR"
- [needs_review] `src_002115` https://www.washingtontimes.com/news/2026/mar/18/free-speech-faces-new-pressure-trumps-fcc-targets-media-coverage/ "Just a moment..."

### 2026-03-24 News Scan (2)

- [dead] `src_002345` https://www.usnews.com/news/top-news/articles/2026-03-23/us-judge-blocks-trump-administration-from-detaining-thousands-of-refugees "US News: Judge blocks Trump refugee detention policy"
- [needs_review] `src_002335` https://news.wttw.com/2026/03/18/aipac-claims-credit-miller-bean-victories-and-abughazaleh-amiwala-defeats "Just a moment..."

### 2026-03-25 News Scan (2)

- [dead] `src_002368` https://www.npr.org/2026/03/25/g-s1-115106/dhs-funding-tsa-congress-stalled "NPR: DHS funding deal on shaky ground"
- [dead] `src_002371` https://www.usnews.com/news/world/articles/2026-03-25/pentagon-says-it-will-ramp-up-war-supplies-with-defense-companies "US News: Pentagon reaches deals with defense firms to expand munitions productio"

### 2026-03-26 Story Discovery Run 6 (2)

- [dead] `src_002449` https://www.usnews.com/news/top-news/articles/2026-02-06/pentagon-poised-to-curb-some-defense-contractors-payouts-under-trump-order "US News: Pentagon Poised to Curb Some Defense Contractors' Payouts Under Trump O"
- [needs_review] `src_002444` https://www.fiercehealthcare.com/regulatory/expanded-price-negotiation-exemption-orphan-drugs-cost-medicare-88b-over-10-years-cbo "Just a moment..."

### The Stolen Seat and the McConnell-Leo Pipeline (2)

- [dead] `src_002594` https://www.npr.org/2018/06/29/624467256/what-happened-with-merrick-garland-in-2016-and-why-it-matters-now "NPR: What Happened With Merrick Garland In 2016 And Why It Matters Now"
- [needs_review] `src_002597` https://www.opensecrets.org/news/2019/05/dark-money-group-funded-by-17million-mystery-donor-before-kavanaugh/ "Just a moment..."

### John Roberts Master Profile (2)

- [dead] `src_002620` https://www.npr.org/2017/04/12/523495201/how-one-man-brought-justices-roberts-alito-and-gorsuch-to-the-supreme-court "NPR: How One Man Brought Justices Roberts, Alito and Gorsuch to the Supreme Cour"
- [dead] `src_002621` https://www.npr.org/2023/06/28/1183337280/supreme-court-ethics-financial-disclosures-possible-conflicts-of-interest "NPR: Supreme Court Justices' Disclosures Reveal Details of Their Wealth"

### The 22 Million Dollar Confirmation and the McConnell Precedent Reversal (2)

- [dead] `src_002662` https://www.npr.org/2019/05/29/727842244/mcconnell-would-fill-potential-supreme-court-vacancy-in-2020-reversal-of-2016-st "NPR: McConnell Would Fill Potential Supreme Court Vacancy In 2020, Reversal Of 2"
- [dead] `src_002663` https://www.npr.org/2020/10/26/927640619/senate-confirms-amy-coney-barrett-to-the-supreme-court "NPR: Amy Coney Barrett Confirmed To Supreme Court, Takes Constitutional Oath"

### The 2024 Tech Billionaire Network (2)

- [dead] `src_002696` https://www.npr.org/2024/07/17/g-s1-11654/five-things-to-know-about-jd-vances-connections-to-tech-billionaires "NPR: Five things to know about J.D. Vance's ties to tech billionaires"
- [needs_review] `src_002698` https://www.opensecrets.org/news/2024/07/tech-billionaires-signal-support-for-trump-vice-president-jd-vance/ "Just a moment..."

### Pam Bondi Master Profile (2)

- [dead] `src_002837` https://www.npr.org/2025/02/04/nx-s1-5287011/pam-bondi-attorney-general-confirmation "NPR: Senate confirms Bondi as AG"
- [needs_review] `src_002839` https://www.opensecrets.org/revolving-door/bondi-pam/summary?id=82269 "Just a moment..."

### Linda McMahon Master Profile (2)

- [dead] `src_002916` https://www.fec.gov/data/candidate/S0CT00151/ "Source: FEC.gov"
- [needs_review] `src_002911` https://www.opensecrets.org/news/2025/01/trump-administration-profile-linda-mcmahon/ "Just a moment..."

### Mitt Romney (2)

- [dead] `src_003307` https://www.fec.gov/data/candidate/P80003353/ "FEC Candidate: Mitt Romney donor profile"
- [generic_orphan] `src_003308` https://www.fec.gov → https://www.fec.gov/ "Home | FEC"

### Lisa Murkowski (2)

- [dead] `src_003402` https://www.npr.org/2021/01/06/953718234/major-oil-companies-take-a-pass-on-controversial-lease-sale-in-arctic-refuge "NPR: Biden ends ANWR drilling as Willow moves forward"
- [needs_review] `src_003394` https://www.opensecrets.org/news/2015/02/murkowski-backed-by-oil-industry-is-getting-the-fight-shes-been-pining-for-on-tuesday "Just a moment..."

### The McCain-to-Trump Transformation and Donor Base Shift (2)

- [dead] `src_003413` https://www.npr.org/2020/10/18/924466869/lindsey-graham-warmed-to-trump-and-some-republican-voters-feel-left-in-the-cold "NPR: Lindsey Graham Warmed To Trump, And Some Voters Feel Left In The Cold"
- [needs_review] `src_003409` https://www.opensecrets.org/news/2020/11/lindsey-graham-gets-more-from-lacking-disclosure-than-anyone "Just a moment..."

### The Veterans Affairs and Iowa Agriculture (2)

- [dead] `src_003472` https://www.npr.org/2022/08/02/1115325176/pact-act-veterans-burn-pits-toxins-passes-senate "NPR: PACT Act passes Senate, aiding veterans exposed to burn pits and other toxi"
- [needs_review] `src_003471` https://iowacapitaldispatch.com/2022/07/28/these-people-dont-care-u-s-senate-gop-stalls-bill-for-veterans-exposed-to-burn-pits/ "Just a moment..."

### George W. Bush (2)

- [dead] `src_003682` https://www.fec.gov/data/candidate/P00003335/ "Source: FEC.gov"
- [needs_review] `src_003681` https://www.gao.gov → https://www.gao.gov/ "Access Denied"

### Media and Propaganda - Donors and Backers (2)

- [dead] `src_003831` https://www.npr.org/2024/10/22/nx-s1-5156184/elon-musk-trump-election-x-twitter "NPR: Elon Musk turned X into a pro-Trump echo chamber"
- [dead] `src_003838` https://www.npr.org/2024/10/28/nx-s1-5168416/washington-post-bezos-endorsement-president-cancellations-resignations "NPR: Jeff Bezos revamps Washington Post"

### The Wall Contractor Money - Who Got Paid to Build What (2)

- [dead] `src_003904` https://www.npr.org/2020/10/14/922153898/his-private-border-wall-enraged-neighbors-then-he-landed-2b-to-build-walls-for-t "NPR. His Private Border Wall Enraged Neighbors. Then He Got $2B to Build Walls f"
- [dead] `src_003907` https://www.npr.org/2020/02/13/805796618/trump-administration-diverts-3-8-billion-in-pentagon-funding-to-border-wall "NPR. Trump Administration Diverts $3.8 Billion In Pentagon Funding To Border Wal"

### Frank Lucas Master Profile (2)

- [dead] `src_004098` https://www.fec.gov/data/committee/C00287912/ "FEC: Frank Lucas for Congress Committee filings"
- [dead] `src_004101` https://www.usda.gov/farmbill/ "USDA: Commodity subsidy distribution data"

### The Education Committee and Michigan Manufacturing (2)

- [dead] `src_004171` https://www.fec.gov/data/candidate/H4MI07103/ "FEC Candidate: Tim Walberg campaign finance summary"
- [needs_review] `src_004170` https://www.congress.gov/member/tim-walberg/W000798 "Just a moment..."

### The McCarthy Ouster and the Politics of Institutional Destruction (2)

- [dead] `src_004317` https://www.npr.org/2023/10/06/1204098129/gop-rep-matt-gaetz-made-history-by-engineering-house-speaker-kevin-mccarthys-ous "NPR: Gaetz engineered McCarthy's historic ouster"
- [dead] `src_004323` https://www.npr.org/2024/11/21/nx-s1-5201398/with-gaetz-out-trump-picks-former-florida-ag-pam-bondi-for-attorney-general "NPR: Gaetz withdraws as Trump's AG pick"

### The Outrage Fundraising Machine - How Controversy Becomes Cash (2)

- [dead] `src_004351` https://www.fec.gov/data/candidate/H0GA06192/ "FEC Candidate: MTG campaign finance summary"
- [needs_review] `src_004352` https://www.opensecrets.org/news/2025/12/marjorie-taylor-greene-heads-for-the-exit-having-blazed-a-controversy-fueled-fundraising-trail/ "Just a moment..."

### The Ways and Means Chair and TCJA Extension (2)

- [dead] `src_004426` https://www.fec.gov/data/candidate/P20005559/ "FEC Candidate: Jason Smith campaign finance summary"
- [needs_review] `src_004425` https://www.congress.gov/member/jason-smith/S001195 "Just a moment..."

### The Agriculture Committee and Farm Subsidy Pipeline (2)

- [dead] `src_004463` https://www.fec.gov/data/candidate/H8PA05071/ "FEC Candidate: Glenn Thompson campaign finance summary"
- [needs_review] `src_004462` https://www.congress.gov/member/glenn-thompson/T000467 "Just a moment..."

### The $150 Million Collapse - When Donor Money Can't Buy a Primary (2)

- [dead] `src_004605` https://www.npr.org/2023/11/28/1215562976/nikki-haley-koch-brothers-iowa-new-hampshire-gop-primary "NPR: Nikki Haley Koch Brothers Iowa New Hampshire GOP primary"
- [needs_review] `src_004604` https://www.opensecrets.org/2024-presidential-race/ron-desantis/expenditures?id=N00034746 "Just a moment..."

### From Senate to K Street - The Revolving Door (2)

- [dead] `src_004955` https://www.npr.org/2022/12/09/1141827943/sinema-leaves-democratic-party-independent "NPR: Kyrsten Sinema leaves Democratic Party, registers as independent"
- [needs_review] `src_004953` https://www.hoganlovells.com/en/news/hogan-lovells-welcomes-senator-kyrsten-sinema "Attention Required! | Cloudflare"

### Dianne Feinstein (2)

- [dead] `src_005073` https://www.foundsf.org/Main_Page?title=Richard_C._Blum_and_Dianne_Feinstein:_The_Power_Couple_of_California "FoundSF: Richard C. Blum and Dianne Feinstein"
- [needs_review] `src_005078` https://epic.org/documents/epic-v-cia-cia-spying-on-congress/ "Attention Required! | Cloudflare"

### The Dark Money Crusade and Judicial Reform (2)

- [dead] `src_005132` https://www.fec.gov/data/candidate/S6RI00221/ "FEC Candidate: Sheldon Whitehouse donor profile"
- [needs_review] `src_005133` https://www.congress.gov/bill/118th-congress/senate-bill/512 "Just a moment..."

### Richard Blumenthal (2)

- [dead] `src_005208` https://www.npr.org/sections/politicaljunkie/2010/05/17/126896148/report-blumenthal "New York Times: Blumenthal misrepresented Vietnam service (via NPR)"
- [needs_review] `src_005201` https://www.opensecrets.org/personal-finances/richard-blumenthal/net-worth?cid=N00031685 "Just a moment..."

### Debbie Stabenow Master Profile (2)

- [dead] `src_005494` https://sunlightfoundation.com/2013/06/10/senators-who-write-farm-bill/ "Sunlight Foundation: Senators Who Write Farm Bill Fine Print Reap Agribusiness C"
- [needs_review] `src_005492` https://www.opensecrets.org/members-of-congress/industries?cycle=Career&cid=N00004118 "Just a moment..."

### Bill Clinton (2)

- [dead] `src_005674` https://prospect.org/2001/12/19/dlc/ "The American Prospect: How the DLC Does It"
- [needs_review] `src_005668` https://www.congress.gov/bill/104th-congress/house-bill/3734 "Just a moment..."

### The Silicon Valley Presidency - Google Surveillance and Market Dominance (2)

- [dead] `src_005732` https://www.npr.org/2013/01/03/168564147/ftc-closes-google-anti-trust-investigation-without-penalties "NPR: FTC Closes Google Antitrust Investigation Without Penalties"
- [needs_review] `src_005739` https://www.opensecrets.org/pres08/industries?id=N00009638 "Just a moment..."

### Jamie Raskin (2)

- [dead] `src_006123` https://www.npr.org/2021/01/27/960768286/amid-grief-rep-jamie-raskin-leads-trump-impeachment-effort-in-senate "NPR: Amid grief, Raskin leads Trump impeachment effort"
- [dead] `src_006125` https://www.npr.org/2022/12/20/1144311577/jan-6-trump-criminal-referrals-jamie-raskin "NPR: Raskin discusses Jan 6 referrals for Trump"

### The Budget Committee and Philadelphia Labor (2)

- [dead] `src_006302` https://www.fec.gov/data/candidate/H4PA13199/ "FEC Candidate: Brendan Boyle campaign finance summary"
- [needs_review] `src_006301` https://www.congress.gov/member/brendan-boyle/B001296 "Just a moment..."

### Fox News - Murdoch Media Empire (2)

- [dead] `src_006905` https://www.npr.org/2023/04/18/1170339114/fox-news-settles-blockbuster-defamation-lawsuit-with-dominion-voting-systems "NPR: Fox News settles blockbuster defamation lawsuit"
- [needs_review] `src_006899` https://www.opensecrets.org/orgs/news-corp/summary?id=D000000227 "Just a moment..."

### The Platform Dependency Spectrum — Revenue Vulnerability Across Political Media (2)

- [dead] `src_006979` https://www.npr.org/2022/09/16/1123249309/alex-jones-defamation-trials-show-the-limits-of-deplatforming-for-a-select-few "NPR: Alex Jones Revenue Post-Deplatforming"
- [needs_review] `src_006973` https://www.goldmansachs.com/insights/articles/the-creator-economy-could-approach-half-a-trillion-dollars-by-2027 "Access Denied"

### The Revolving Door (Media) — Government-to-Media Personnel Pipeline (2)

- [dead] `src_007024` https://www.cbc.ca/news/entertainment/george-stephanopoulos-sorry-for-not-disclosing-clinton-foundation-donations-1.3075259 "CBC: Stephanopoulos Clinton Foundation apology 2015"
- [needs_review] `src_007035` https://www.article19.org/resources/requiring-media-register-foreign-agents-poses-threat-free-speech/ "Just a moment..."

### Charlie Kirk (2)

- [dead] `src_007116` https://www.npr.org/2025/09/10/nx-s1-5537068/charlie-kirk-shot-utah-university-campus "NPR: Right-wing activist Charlie Kirk fatally shot at speaking event in Utah"
- [needs_review] `src_007121` https://www.opensecrets.org/political-action-committees-pacs/turning-point-pac/C00814152/summary/2024 "Just a moment..."

### Dave Rubin (2)

- [dead] `src_007164` https://www.miamiherald.com/news/politics-government/article291976560.html "Miami Herald: "Dave Rubin says he was a 'victim' of Russian election scheme" (Se"
- [needs_review] `src_007166` https://www.datasociety.net/library/alternative-influence/ "Just a moment..."

### Laura Ingraham (2)

- [dead] `src_007255` https://www.npr.org/sections/thetwo-way/2018/03/30/598194392/advertisers-ditch-laura-ingraham-after-she-mocks-parkland-activist "NPR: "Advertisers Ditch Laura Ingraham After She Mocks Parkland Activist""
- [needs_review] `src_007264` https://fedsoc.org/bio/laura-ingraham "Just a moment..."

### Bari Weiss (2)

- [dead] `src_007694` https://www.npr.org/2025/10/06/nx-s1-5563786/bari-weiss-cbs-news-free-press "NPR: "Who Is Bari Weiss? CBS News' New Editor-in-Chief Is a Vocal Critic of Lega"
- [needs_review] `src_007698` https://pitchbook.com/news/articles/the-free-press-news-outfit-backed-by-top-vcs-acquired-by-paramount-skydance-for-150m "Just a moment..."

### Bill Maher (2)

- [dead] `src_007707` https://www.npr.org/2012/03/28/149512215/bill-mahers-obama-superpac-donation-causes-stir "NPR: Bill Maher's Obama SuperPAC Donation Causing Stir"
- [needs_review] `src_007706` https://www.opensecrets.org/orgs/bill-maher-productions/summary?id=D000071834 "Just a moment..."

### Chris Cuomo (2)

- [dead] `src_007734` https://www.npr.org/2021/12/05/1061639233/chris-cuomo-newly-fired-from-cnn-faces-an-allegation-of-sexual-misconduct "NPR: "Chris Cuomo, Newly Fired from CNN, Faces an Allegation of Sexual Misconduc"
- [dead] `src_007735` https://www.npr.org/2022/03/17/1087167551/chris-cuomo-cnn-125-million "NPR: "Chris Cuomo Seeks $125 Million After Being Fired from CNN" (Mar 17, 2022)"

### Chris Wallace (2)

- [dead] `src_007743` https://www.npr.org/2021/12/12/1063521670/chris-wallace-announces-abrupt-departure-from-fox-news-to-join-cnn-streaming-ser "NPR: Fox News loses Chris Wallace to new CNN streaming service"
- [dead] `src_007745` https://www.npr.org/2021/11/21/1052837157/fox-resignations-tucker-carlson-patriot-purge-documentary "NPR: 2 Fox News commentators resign over Tucker Carlson's Patriot Purge document"

### K&L Gates (2)

- [dead] `src_008187` https://www.npr.org/2025/12/18/nx-s1-5648844/tiktok-deal-oracle-trump "NPR: TikTok signs deal to give U.S. operations to Oracle-led investor group"
- [dead] `src_008188` https://www.npr.org/2026/03/18/nx-s1-5751854/gas-prices-trump-jones-act-iran "NPR: Trump temporarily waives the Jones Act to try to lower gasoline prices"

### Bank of America (2)

- [dead] `src_008628` https://www.fec.gov/data/committee/C00040998/ "FEC: Bank of America PAC filings"
- [needs_review] `src_008627` https://www.opensecrets.org/orgs/bank-of-america/summary?id=D000000090 "Just a moment..."

### Cryptocurrency Industry (2)

- [dead] `src_009199` https://www.federalregister.gov/documents/search?conditions%5Bterm%5D=%22Cryptocurrency%20Industry%22 "Source: Federal Register"
- [needs_review] `src_009189` https://www.opensecrets.org/outside-spending/detail/2024?cmte=C00835959&tab=targeted_candidates "Just a moment..."

### Club for Growth (2)

- [dead] `src_009558` https://www.fec.gov/data/committee/C00487470/ "FEC: Club for Growth Action committee filings (C00487470)"
- [needs_review] `src_009557` https://www.opensecrets.org/political-action-committees-pacs/club-for-growth-action/C00487470/summary/2024 "Just a moment..."

### MAGA Inc (2)

- [dead] `src_009709` https://en.wikipedia.org/wiki/Make_America_Great_Again_Inc "Make America Great Again Inc - Wikipedia"
- [generic_orphan] `src_009708` https://www.magapac.com/ "Home | MAGA Inc"

### Real Estate Roundtable (2)

- [dead] `src_010198` https://www.npr.org/2019/07/08/736546264/white-house-touts-help-for-poor-areas-but-questions-endure-over-wholl-benefit "NPR: Opportunity Zones Touted By White House May Benefit Investors Most"
- [needs_review] `src_010193` https://www.opensecrets.org/orgs/real-estate-roundtable/summary?id=D000054983 "Just a moment..."

### Bernard Marcus (2)

- [dead] `src_010589` https://www.npr.org/2019/07/10/740173176/home-depot-responds-to-calls-for-boycott-over-co-founders-support-for-trump "Home Depot Responds To Calls For Boycott Over Co-Founder's Support For Trump - N"
- [needs_review] `src_010581` https://www.opensecrets.org/orgs/bernard-marcus-family-foundation/summary?id=D000035605 "Just a moment..."

### JB Pritzker (2)

- [dead] `src_010825` https://www.npr.org/2018/10/25/660403482/pritzker-breaks-campaign-finance-record-annoys-illinois-with-80-million-of-ads "NPR: Pritzker breaks campaign finance record with $80M in ads"
- [needs_review] `src_010822` https://www.opensecrets.org/officeholders/j-b-pritzker/summary?cycle=2022&id=157615 "Just a moment..."

### Larry Ellison (2)

- [dead] `src_011007` https://www.npr.org/2025/01/25/g-s1-44779/tiktok-ban-deal-trump-oracle "NPR: TikTok Oracle-led ownership deal structure"
- [needs_review] `src_011008` https://www.opensecrets.org/news/2025/09/oracle-invested-millions-in-government-influence-before-winning-a-major-stake-in-tiktok/ "Just a moment..."

### Laurene Powell Jobs (2)

- [dead] `src_011024` https://www.npr.org/2017/07/28/540006091/laurene-powell-jobs-to-buy-stake-in-the-atlantic "NPR — Powell Jobs to buy stake in The Atlantic"
- [needs_review] `src_011025` https://www.axios.com/2017/12/15/laurene-powell-jobs-buys-majority-stake-in-the-atlantic-1513304509 "Just a moment..."

### Peter Thiel (2)

- [dead] `src_011167` https://www.npr.org/sections/thetwo-way/2016/11/02/500389355/hulk-hogan-reaches-settlement-with-gawker-worth-over-31-million "NPR: Gawker settlement"
- [dead] `src_011172` https://www.federalregister.gov/documents/search?conditions%5Bterm%5D=%22Peter%20Thiel%22 "Source: Federal Register"

### Rupert Murdoch (2)

- [dead] `src_011250` https://www.npr.org/2025/01/10/nx-s1-5256432/smartmatic-fox-news-trial-defamation-election-2020-trump "NPR: Fox News headed for trial over Smartmatic election fraud claims"
- [dead] `src_011259` https://www.federalregister.gov/documents/2002/08/28/02-21972/granting-of-request-for-early-termination-of-the-waiting-period-under-the-premerger-notification "Federal Register :: Something went wrong."

### Sinclair Broadcast Group (2)

- [dead] `src_011463` https://www.fcc.gov/media/television/tv-station-profiles "FCC: Station ownership filings"
- [needs_review] `src_011469` https://www.nhtsa.gov/recalls?manufacturer=Sinclair%20Broadcast%20Group "Access Denied"

### AFSCME - American Federation of State County and Municipal Employees (2)

- [dead] `src_011642` https://www.federalregister.gov/documents/search?conditions%5Bterm%5D=%22AFSCME%20-%20American%20Federation%20of%20State%20County%20and%20Municipal%20Employees%22 "Source: Federal Register"
- [needs_review] `src_011638` https://www.opensecrets.org/orgs/american-fedn-of-st-cnty-munic-employees/summary?id=D000000061 "Just a moment..."

### Teamsters - International Brotherhood of Teamsters (2)

- [dead] `src_011737` https://www.npr.org/2024/11/06/nx-s1-5182290/2024-election-results-where-things-stand "NPR: 2024 Teamsters non-endorsement"
- [needs_review] `src_011735` https://www.opensecrets.org/orgs/teamsters-union/summary?id=D000000066 "Just a moment..."

### Humana (2)

- [dead] `src_012073` https://www.federalregister.gov/documents/2025/04/28/2025-07258/tricare-tricare-competitive-plans-demonstration-cpd "Federal Register :: Something went wrong."
- [needs_review] `src_012062` https://www.opensecrets.org/orgs/humana-inc/summary?id=D000000652 "Just a moment..."

### UnitedHealth Group - Optum (2)

- [dead] `src_012166` https://www.federalregister.gov/documents/search?conditions%5Bterm%5D=%22UnitedHealth%20Group%20-%20Optum%22 "Source: Federal Register"
- [needs_review] `src_012167` https://www.nhtsa.gov/recalls?manufacturer=UnitedHealth%20Group%20-%20Optum "Access Denied"

### Enterprise Products Partners (2)

- [dead] `src_012568` https://ir.enterpriseproducts.com/news-releases/news-release-details/enterprise-reports-fourth-quarter-2025-earnings "Enterprise IR: Q4 2025 Earnings Release"
- [dead] `src_012569` https://ir.enterpriseproducts.com/news-releases/news-release-details/enterprise-elects-hanley-chief-commercial-officer "Enterprise IR: Hanley appointed CCO"

### Fossil Fuel Bloc (2)

- [dead] `src_012642` https://www.npr.org/2025/10/24/nx-s1-5584883/trump-alaska-wildlife-refuge-oil-gas-drilling "NPR: Trump Alaska wildlife refuge oil gas drilling"
- [dead] `src_012643` https://www.npr.org/2025/01/21/nx-s1-5266207/trump-paris-agreement-biden-climate-change "NPR: Trump Paris Agreement withdrawal"

### Hawaiian Electric Company (2)

- [dead] `src_012694` https://www.federalregister.gov/documents/2018/05/25/2018-11333/pipeline-safety-request-for-special-permit-hawaiian-electric-company-inc "Federal Register :: Something went wrong."
- [needs_review] `src_012681` https://www.nhtsa.gov/recalls?manufacturer=Hawaiian%20Electric%20Company "Access Denied"

### National Education Association (2)

- [dead] `src_012997` https://www.federalregister.gov/documents/search?conditions%5Bterm%5D=%22National%20Education%20Association%22 "Source: Federal Register"
- [needs_review] `src_012988` https://www.opensecrets.org/orgs/national-education-assn/summary?id=D000000064 "Just a moment..."

### Defense Industry (2)

- [dead] `src_013195` https://www.federalregister.gov/documents/search?conditions%5Bterm%5D=%22Defense%20Industry%22 "Source: Federal Register"
- [needs_review] `src_013187` https://comptroller.defense.gov/Budget-Materials/ "Access Denied"

### L3 Technologies (2)

- [dead] `src_013261` https://www.federalregister.gov/documents/search?conditions%5Bterm%5D=%22L3%20Technologies%22 "Source: Federal Register"
- [needs_review] `src_013263` https://www.nhtsa.gov/recalls?manufacturer=L3%20Technologies "Access Denied"

### L3Harris Technologies (2)

- [dead] `src_013271` https://www.fec.gov/data/committee/C00100321/ "FEC: L3Harris Technologies Inc PAC Committee Overview"
- [needs_review] `src_013272` https://www.opensecrets.org/political-action-committees-pacs/l3harris-technologies/C00100321/summary/2024 "Just a moment..."

### Lockheed Martin (2)

- [dead] `src_013352` https://www.federalregister.gov/documents/2026/03/17/2026-05140/arms-sales-notification "Arms Sales Notification"
- [needs_review] `src_013338` https://www.opensecrets.org/federal-lobbying/top-spenders?cache=1775433157?id=D000000104 "Just a moment..."

### Demand Justice (2)

- [dead] `src_013769` https://www.npr.org/2024/11/24/nx-s1-5199049/federalist-society-conservative-supreme-court "NPR: Leonard Leo and The Federalist Society"
- [needs_review] `src_013770` https://www.opensecrets.org/orgs/sixteen-thirty-fund/summary?id=D000070975 "Just a moment..."

### Democracy Alliance (2)

- [dead] `src_013784` https://www.npr.org/2019/05/07/720050070/democrats-want-to-end-dark-money-but-first-they-want-to-use-it "NPR: How Liberal Donors Are Organizing"
- [needs_review] `src_013782` https://carnegieendowment.org/articles/democracy-alliance-progressives-koch-network "Page not Found | Carnegie Endowment for International Peace"

### Gun Owners of America (2)

- [dead] `src_013916` https://www.federalregister.gov/documents/1995/12/07/95-29852/reestablishment-of-visitor-restrictions-for-designated-recreation-sites-special-recreation "Federal Register :: Something went wrong."
- [needs_review] `src_013911` https://www.opensecrets.org/orgs/gun-owners-of-america/lobbying?id=D000026353 "Just a moment..."

### Securus Technologies - Aventiv (2)

- [dead] `src_014372` https://www.fcc.gov/wireline-competition/commission-action-prior-martha-wright-reed-act "FCC: Martha Wright-Reed Act implementation and rate cap orders"
- [needs_review] `src_014375` https://www.nhtsa.gov/recalls?manufacturer=Securus%20Technologies%20-%20Aventiv "Access Denied"

### Agricultural Labor Vulnerability Donors (2)

- [dead] `src_014404` https://www.uscis.gov/working-in-the-united-states/temporary-workers/h-2a-temporary-agricultural-workers "USCIS: H-2A Temporary Agricultural Workers Program Overview"
- [needs_review] `src_014406` https://www.epi.org/policywatch/department-of-labor-halts-enforcement-of-expanded-labor-protections-for-migrant-farmworkers-on-h-2a-temporary-visas/ "Attention Required! | Cloudflare"

### Defense Contractor 450000 Percent ROI (2)

- [generic_orphan] `src_001358` https://responsiblestatecraft.org/?q=Defense%20Contractor%20450000%20Percent%20ROI "Home - Responsible Statecraft"
- [needs_review] `src_001359` https://www.opensecrets.org/orgs/northrop-grumman/summary?id=D000000170 "Just a moment..."

### Sheldon Whitehouse (2)

- [generic_orphan] `src_005150` https://www.opensanctions.org/search/?q=Sheldon%20Whitehouse "Search - OpenSanctions"
- [needs_review] `src_005142` https://www.nationalreview.com/news/watchdog-flags-sheldon-whitehouse-for-potential-ethics-violation-in-backing-bill-that-enriched-wifes-employer/ "Just a moment..."

### Novo Nordisk (2)

- [generic_orphan] `src_010430` https://www.opensanctions.org/search/?q=Novo%20Nordisk "Search - OpenSanctions"
- [needs_review] `src_010420` https://www.nhtsa.gov/recalls?manufacturer=Novo%20Nordisk "Access Denied"

### Hudson Institute (2)

- [needs_review] `src_000851` https://www.opensecrets.org/orgs/hudson-institute/summary?id=D000026653 "Just a moment..."
- [needs_review] `src_000858` https://www.philanthropyroundtable.org/magazine/the-history-of-kahnsciousness/ "Just a moment..."

### Mercatus Center (2)

- [needs_review] `src_000901` https://www.chronicle.com/article/why-george-masons-agreements-with-the-koch-foundation-raised-red-flags/ "Just a moment..."
- [needs_review] `src_000911` https://violationtracker.goodjobsfirst.org/parent/koch-industries "Just a moment..."

### Intra-Democratic Contradiction Map - The Progressive vs Moderate Illusion (2)

- [needs_review] `src_001237` https://www.opensecrets.org/political-action-committees-pacs/goldman-sachs/C00350744/candidate-recipients/2024 "Just a moment..."
- [needs_review] `src_001241` https://www.opensecrets.org/news/2023/12/pro-israel-pacs-poised-to-spend-big-to-unseat-progressive-members-of-congress-in-2024-election-cycle/ "Just a moment..."

### The Carried Interest Loophole - 30 Years of Survival (2)

- [needs_review] `src_001290` https://www.opensecrets.org/orgs/american-investment-council/summary?id=D000067336 "Just a moment..."
- [needs_review] `src_001291` https://www.congress.gov/bill/117th-congress/house-bill/5376 "Just a moment..."

### Big Agriculture Subsidies Feed the Same Corporate Farms From Both Sides (2)

- [needs_review] `src_001787` https://www.opensecrets.org/political-action-committees-pacs/industry-detail/A/2024 "Just a moment..."
- [needs_review] `src_001793` https://www.politico.com/story/2013/07/republicans-who-got-farm-subsidies-targeted-094532 "Just a moment..."

### Iowa 2026 Senate Race (2)

- [needs_review] `src_001942` https://iowacapitaldispatch.com/2026/03/11/u-s-senate-candidates-ashley-hinson-zach-wahls-submit-petitions-for-iowa-primary-ballot/ "Just a moment..."
- [needs_review] `src_001944` https://iowacapitaldispatch.com/2025/11/18/democratic-u-s-senate-candidates-zach-wahls-josh-turek-tout-new-endorsements/ "Just a moment..."

### Michigan 2026 Senate Race (2)

- [needs_review] `src_001958` https://michiganadvance.com/2026/01/05/rogers-stevens-lead-michigan-u-s-senate-fundraising-with-wealthy-and-corporate-donors/ "Just a moment..."
- [needs_review] `src_001961` https://michiganadvance.com/2026/02/03/rogers-stevens-lead-fundraising-in-crowded-michigan-u-s-senate-race-enter-year-flush-with-cash/ "Just a moment..."

### Minnesota 2026 Senate Race (2)

- [needs_review] `src_001964` https://minnesotareformer.com/briefs/craig-more-than-doubles-flanagans-q3-fundraising/ "Just a moment..."
- [needs_review] `src_001967` https://19thnews.org/2025/07/minnesota-senate-primary-2026/ "Attention Required! | Cloudflare"

### South Carolina 2026 Senate Race (2)

- [needs_review] `src_002008` https://www.opensecrets.org/members-of-congress/summary?cid=N00009975 "Just a moment..."
- [needs_review] `src_002011` https://www.opensecrets.org/races/outside-spending?cycle=2026&id=SCS1 "Just a moment..."

### 2026 House Money Map (2)

- [needs_review] `src_002040` https://www.opensecrets.org/news/2026/01/political-ad-spending-is-projected-to-reach-a-new-high-in-2026-midterms "Just a moment..."
- [needs_review] `src_002041` https://www.opensecrets.org/political-action-committees-pacs/united-democracy-project/C00799031/summary/2024 "Just a moment..."

### 2026-03-26 Story Discovery Run 7 (2)

- [needs_review] `src_002454` https://www.theblock.co/post/389633/clock-is-ticking-crypto-bills-2026-fate-hinges-on-trump-stablecoin-yields "Attention Required! | Cloudflare"
- [needs_review] `src_002458` https://www.opensecrets.org/federal-lobbying/trends-in-spending "Just a moment..."

### Citizens United and the Architecture of Unlimited Political Money (2)

- [needs_review] `src_002601` https://www.opensecrets.org/news/reports/a-decade-under-citizens-united "Just a moment..."
- [needs_review] `src_002603` https://www.opensecrets.org/news/2023/01/dark-money-groups-have-poured-billions-into-federal-elections-since-the-supreme-courts-2010-citizens-united-decision "Just a moment..."

### The Thiel Pipeline - From Yale to VP (2)

- [needs_review] `src_002701` https://www.opensecrets.org/news/2022/02/peter-thiel-tied-dark-money-group-helping-bankroll-super-pac-spending-on-2022-election/ "Just a moment..."
- [needs_review] `src_002702` https://www.opensecrets.org/donor-lookup/results?name=peter+thiel&order=desc&sort=D "Just a moment..."

### Ted Cruz Master Profile (2)

- [needs_review] `src_003194` https://qz.com/594425/wall-street-critic-ted-cruz-funded-his-senate-campaign-with-a-loan-from-goldman-sachs "Attention Required! | Cloudflare"
- [needs_review] `src_003195` https://www.opensecrets.org/news/2018/03/before-trump-cambridge-analytica-was-on-team-cruz/ "Just a moment..."

### The Iran War - Defense Donors and the DOGE Readiness Gap (2)

- [needs_review] `src_003696` https://www.axios.com/2026/03/12/oil-prices-iran-strait-of-hormuz "Just a moment..."
- [needs_review] `src_003701` https://www.opensecrets.org/political-action-committees-pacs/industry-detail/E01/2024 "Just a moment..."

### Labor - Donors and Backers (2)

- [needs_review] `src_003845` https://www.opensecrets.org/members-of-congress/summary?name=Labor "Just a moment..."
- [needs_review] `src_006566` https://www.opensecrets.org/states/CA "Just a moment..."

### Israel and Foreign Policy - Donors and Backers (2)

- [needs_review] `src_003873` https://www.opensecrets.org/news/2020/10/adelsons-set-new-donation-record/ "Just a moment..."
- [needs_review] `src_003874` https://www.opensecrets.org/political-action-committees-pacs/aipac/C00797670/summary/2024 "Just a moment..."

### Healthcare - Donors and Backers (2)

- [needs_review] `src_003928` https://www.opensecrets.org/members-of-congress/summary?name=Healthcare "Just a moment..."
- [needs_review] `src_006660` https://www.fiercehealthcare.com/payers/payer-roundup-minnesota-providers-drops-humana-ma-plans-new-no-surprises-act-bill-introduced "Just a moment..."

### The ACA Repeal That Never Came and the Pharma Donors Who Paid Either Way (2)

- [needs_review] `src_003957` https://www.gao.gov/products/gao-21-319 "Access Denied"
- [needs_review] `src_003960` https://www.opensecrets.org/members-of-congress/summary?name=ACA%20Repeal%20That%20Never%20Came%20and%20the%20Pharma%20Donors%20Who%20Paid%20Either%20Way "Just a moment..."

### 2017 Tax Cuts - The $1.5 Trillion Receipt (2)

- [needs_review] `src_004038` https://www.jct.gov/publications/2017/jcx-67-17/ "Attention Required! | Cloudflare"
- [needs_review] `src_004039` https://www.congress.gov/crs-product/IF12641 "Just a moment..."

### DOGE - The Billionaires Government (2)

- [needs_review] `src_004045` https://www.gao.gov/assets/gao-26-108673.pdf "Access Denied"
- [needs_review] `src_004048` https://www.war.gov/Portals/1/Spotlight/2025/Guidance_For_Federal_Policies/Implementing_DOGE_Workforce_Optimization/Implementing_DOGE_Workforce_Optimization_OPM_Guidance.pdf "Access Denied"

### Mike Rogers (2)

- [needs_review] `src_004269` https://www.opensecrets.org/news/2022/12/incoming-gop-house-armed-services-and-defense-appropriations-chairs-top-recipients-of-defense-sector-contributions "Just a moment..."
- [needs_review] `src_004270` https://www.opensecrets.org/news/2022/07/defense-sector-donors-contributed-3-4-million-to-house-armed-services-committee-members-in-the-2022-election-cycle/ "Just a moment..."

### Lauren Boebert (2)

- [needs_review] `src_004378` https://www.cpr.org/2021/02/07/what-we-know-about-lauren-boeberts-campaign-payments-to-herself-for-driving-38000-miles/ "Just a moment..."
- [needs_review] `src_004380` https://coloradonewsline.com/2024/10/16/grassroots-super-pac-funding-colorado-2024-congressional/ "Just a moment..."

### Brian Babin (2)

- [needs_review] `src_004565` https://www.opensecrets.org/members-of-congress/summary?cid=N00005736 "Just a moment..."
- [needs_review] `src_004571` https://www.americanprogress.org/article/climate-deniers-of-the-119th-congress-and-the-second-trump-administration/ "Just a moment..."

### The Disney War and the Limits of Culture War Governance (2)

- [needs_review] `src_004609` https://floridaphoenix.com/2024/03/27/disney-settles-lawsuit-with-desantis-administration-over-new-governing-board/ "Just a moment..."
- [needs_review] `src_004610` https://blogmickey.com/2024/12/reedy-creek-improvement-district-broke-no-laws/ "Just a moment..."

### The Defense Industry Pipeline and South Carolina's Military Economy (2)

- [needs_review] `src_004646` https://www.opensecrets.org/news/2023/02/nikki-haley-launches-2024-presidential-campaign-after-years-of-raising-big-money/ "Just a moment..."
- [needs_review] `src_004648` https://scdailygazette.com/2023/12/07/nikki-haleys-rivals-call-her-wall-streets-candidate-why-and-does-it-matter/ "Just a moment..."

### The Education Culture War as Electoral Strategy (2)

- [needs_review] `src_004683` https://www.vpm.org/news/2021-08-10/politifact-va-youngkins-crt-claims-rated-false "Just a moment..."
- [needs_review] `src_004688` https://virginiamercury.com/2021/12/20/can-youngkin-really-ban-critical-race-theory-in-virginia-schools/ "Just a moment..."

### Dick Cheney (2)

- [needs_review] `src_004699` https://www.opensecrets.org/personal-finances/dick-cheney/net-worth?cid=N00006237&year=2008 "Just a moment..."
- [needs_review] `src_004700` https://www.opensecrets.org/revolving-door/cheney-dick/summary?id=78755 "Just a moment..."

### Senate Record and 2020 Primary (2)

- [needs_review] `src_005011` https://www.opensecrets.org/races/summary?cycle=2016&id=CAS1 "Just a moment..."
- [needs_review] `src_005012` https://www.opensecrets.org/2020-presidential-race/kamala-harris/candidate?id=N00036915 "Just a moment..."

### VP Labor Record - What Unions Got and Didn't Get (2)

- [needs_review] `src_005040` https://www.congress.gov/nomination/117th-congress/126 "Just a moment..."
- [needs_review] `src_005044` https://www.americanprogress.org/article/proven-state-and-local-strategies-to-create-good-jobs-with-iija-infrastructure-funds/ "Just a moment..."

### Adam Schiff (2)

- [needs_review] `src_005052` https://www.opensecrets.org/members-of-congress/summary?cid=N00009585&cycle=CAREER "Just a moment..."
- [needs_review] `src_005057` https://www.opensecrets.org/news/2023/05/adam-schiff-heads-into-californias-2024-u-s-senate-race-with-a-sizable-cash-advantage "Just a moment..."

### Bob Menendez (2)

- [needs_review] `src_005579` https://www.opensecrets.org/news/2024/07/menendez-used-donor-cash-for-legal-costs-ahead-of-conviction/ "Just a moment..."
- [needs_review] `src_005581` https://www.fbi.gov/contact-us/field-offices/newark/news/press-releases/senator-robert-menendez-and-dr.-salomon-melgen-indicted-for-conspiracy-bribery-and-honest-services-fraud "Just a moment..."

### Amy Klobuchar (2)

- [needs_review] `src_005593` https://www.congress.gov/member/amy-klobuchar/K000367 "Just a moment..."
- [needs_review] `src_005595` https://www.congress.gov/bill/117th-congress/senate-bill/228 "Just a moment..."

### The Bank Bailout and the Prosecution That Never Came (2)

- [needs_review] `src_005706` https://www.politico.com/story/2009/01/wall-street-invested-heavily-in-obama-017643 "Just a moment..."
- [needs_review] `src_005708` https://www.gao.gov/products/gao-11-696 "Access Denied"

### The Post-Presidency Capitalization - From Hope and Change to Martha's Vineyard (2)

- [needs_review] `src_005713` https://www.opensecrets.org/obama/organizing-for-action-committee "Just a moment..."
- [needs_review] `src_005729` https://www.opensecrets.org/orgs/goldman-sachs/recipients?id=D000000085&cycle=2008&type=P "Just a moment..."

### Gregory Meeks (2)

- [needs_review] `src_006214` https://www.opensecrets.org/joint-fundraising-committees-jfcs/meeks-victory-fund-2024/C00833319/2024/summary "Just a moment..."
- [needs_review] `src_006223` https://www.washingtontimes.com/news/2013/mar/8/lawmaker-corrupt-ties-chavez-represents-us-funeral/ "Just a moment..."

### Gerry Connolly (2)

- [needs_review] `src_006234` https://www.opensecrets.org/members-of-congress/industries?cid=N00029891&cycle=CAREER "Just a moment..."
- [needs_review] `src_006240` https://www.afge.org/article/afge-mourns-passing-of-rep-gerry-connolly-defender-of-federal-workers-rights/ "Just a moment..."

### Wes Moore Master Profile (2)

- [needs_review] `src_006442` https://marylandmatters.org/2024/01/18/moores-brisk-fundraising-pace-continues-in-office-but-he-also-spends-liberally/ "Just a moment..."
- [needs_review] `src_006443` https://marylandmatters.org/2024/09/06/moore-says-he-was-attacked-over-bronze-star-claim/ "Just a moment..."

### Pro-Israel Donor Network Deep Dive (2)

- [needs_review] `src_006593` https://www.opensecrets.org/donor-lookup/results?name=haim+saban "Just a moment..."
- [needs_review] `src_006594` https://www.opensecrets.org/donor-lookup/results?name=larry+ellison "Just a moment..."

### The Business Pragmatist Donor Coalition (2)

- [needs_review] `src_006787` https://kentuckylantern.com/2025/08/01/real-estate-developer-and-gambling-company-are-among-top-donors-to-beshear-super-pac/ "Just a moment..."
- [needs_review] `src_006788` https://kentuckylantern.com/2026/02/02/kentucky-democrat-andy-beshears-super-pac-steps-up-fundraising-in-its-second-year/ "Just a moment..."

### Amy Acton Master Profile (2)

- [needs_review] `src_006825` https://ohiocapitaljournal.com/2025/01/07/dr-amy-acton-is-running-for-ohio-governor/ "Just a moment..."
- [needs_review] `src_006827` https://ohiocapitaljournal.com/2026/02/04/ohio-governors-race-set-to-become-most-expensive-in-state-history/ "Just a moment..."

### Hasan Piker (2)

- [needs_review] `src_007487` https://dotesports.com/streaming/news/how-much-money-does-hasan-make-on-twitch "Attention Required! | Cloudflare"
- [needs_review] `src_007496` https://michiganadvance.com/2026/03/25/michigans-el-sayed-unfazed-by-backlash-against-upcoming-campaign-event-with-hasan-piker/ "Just a moment..."

### Akin Gump Strauss Hauer & Feld (2)

- [needs_review] `src_007914` https://www.opensecrets.org/news/2019/01/retired-reps-find-new-lobbying-jobs-with-former-campaign-contributor/ "Just a moment..."
- [needs_review] `src_007918` https://www.opensecrets.org/revolving-door?id=D000000162 "Just a moment..."

### Invariant (2)

- [needs_review] `src_008156` https://www.opensecrets.org/revolving-door/summary?id=84071 "Just a moment..."
- [needs_review] `src_008157` https://www.opensecrets.org/news/2023/05/revolving-door-lobbyists-help-defense-contractors-get-off-to-strong-start-in-2023/ "Just a moment..."

### Mercury Public Affairs (2)

- [needs_review] `src_008210` https://www.opensecrets.org/fara/registrants/D000071638 "Just a moment..."
- [needs_review] `src_008217` https://euromaidanpress.com/2025/12/12/ex-trump-campaign-adviser-now-consulting-for-sanctioned-russian-oil-giant-seeking-buyer-for-global-assets/ "Just a moment..."

### SKDK (SKDKnickerbocker) (2)

- [needs_review] `src_008269` https://www.opensecrets.org/orgs/skdknickerbocker/summary?id=D000066684 "Just a moment..."
- [needs_review] `src_008270` https://www.opensecrets.org/campaign-expenditures/vendor?vendor=SKDKnickerbocker "Just a moment..."

### Blackstone Group (2)

- [needs_review] `src_008678` https://www.opensecrets.org/orgs/blackstone-group/summary?id=D000021873 "Just a moment..."
- [needs_review] `src_008682` https://www.opensecrets.org/orgs/blackstone-group/recipients?id=D000021873 "Just a moment..."

### Citigroup (2)

- [needs_review] `src_008802` https://www.opensecrets.org/orgs/citigroup-inc/summary?id=D000000071 "Just a moment..."
- [needs_review] `src_008810` https://www.nhtsa.gov/recalls?manufacturer=Citigroup "Access Denied"

### Fidelity Investments (2)

- [needs_review] `src_008834` https://www.opensecrets.org/orgs/fidelity-investments/summary?id=D000000328 "Just a moment..."
- [needs_review] `src_008849` https://www.nhtsa.gov/recalls?manufacturer=Fidelity%20Investments "Access Denied"

### Goldman Sachs (2)

- [needs_review] `src_008861` https://www.opensecrets.org/political-action-committees-pacs/goldman-sachs/c00350744/donors/2024 "Just a moment..."
- [needs_review] `src_008862` https://www.sciencedirect.com/science/article/abs/pii/S1572308922000808 "ScienceDirect"

### Wells Fargo (2)

- [needs_review] `src_009047` https://www.opensecrets.org/orgs/wells-fargo/summary?id=D000019743 "Just a moment..."
- [needs_review] `src_009053` https://www.nhtsa.gov/recalls?manufacturer=Wells%20Fargo "Access Denied"

### Apple (2)

- [needs_review] `src_009126` https://www.opensecrets.org/orgs/apple-inc/summary?id=D000021754 "Just a moment..."
- [needs_review] `src_009127` https://www.opensecrets.org/orgs/apple-inc/lobbying?id=D000021754 "Just a moment..."

### Coinbase (2)

- [needs_review] `src_009162` https://www.opensecrets.org/orgs/coinbase-global/summary?id=D000075712 "Just a moment..."
- [needs_review] `src_009169` https://www.nhtsa.gov/recalls?manufacturer=Coinbase "Access Denied"

### Craft Ventures (2)

- [needs_review] `src_009174` https://www.opensecrets.org/orgs/craft-ventures/summary?id=D000096541 "Just a moment..."
- [needs_review] `src_009175` https://www.nhtsa.gov/recalls?manufacturer=Craft%20Ventures "Access Denied"

### Eric Schmidt (2)

- [needs_review] `src_009207` https://epic.org/documents/epic-v-ai-commission/ "Attention Required! | Cloudflare"
- [needs_review] `src_009215` https://epic.org/playing-both-sides-ai-policy/ "Attention Required! | Cloudflare"

### OpenAI (2)

- [needs_review] `src_009427` https://www.opensecrets.org/orgs/openai/summary?id=D000084252 "Just a moment..."
- [needs_review] `src_009429` https://www.nhtsa.gov/recalls?manufacturer=OpenAI "Access Denied"

### Oracle (2)

- [needs_review] `src_009442` https://www.opensecrets.org/orgs/oracle-corp/summary?id=D000000461 "Just a moment..."
- [needs_review] `src_009443` https://www.opensecrets.org/orgs/oracle-corp/lobbying?id=D000000461 "Just a moment..."

### SpaceX (2)

- [needs_review] `src_009484` https://www.defense.gov/News/Contracts/ "Access Denied"
- [needs_review] `src_009485` https://www.faa.gov/space/licenses "Access Denied"

### Tesla - Elon Musk Political Operation (2)

- [needs_review] `src_009513` https://www.opensecrets.org/donor-lookup/results?name=elon+musk "Just a moment..."
- [needs_review] `src_009517` https://www.nhtsa.gov/recalls?manufacturer=Tesla%20-%20Elon%20Musk%20Political%20Operation "Access Denied"

### Congressional Leadership Fund (2)

- [needs_review] `src_009567` https://www.opensecrets.org/political-action-committees-pacs/C00504530/summary/2024 "Just a moment..."
- [needs_review] `src_009573` https://www.opensecrets.org/political-action-committees-pacs/congressional-leadership-fund/C00504530/donors/2024 "Just a moment..."

### Great Lakes Conservatives Fund (2)

- [needs_review] `src_009651` https://www.opensecrets.org/political-action-committees-pacs/great-lakes-conservatives-fund/C00853861/summary/2024 "Just a moment..."
- [needs_review] `src_009656` https://michiganadvance.com/2025/08/05/pro-rogers-super-pac-funded-by-ardent-christian-nationalist/ "Just a moment..."

### National Republican Senatorial Committee (2)

- [needs_review] `src_009724` https://www.opensecrets.org/political-parties/NRSC/2024/summary?name=national-republican-senatorial-cmte "Just a moment..."
- [needs_review] `src_009725` https://www.opensecrets.org/political-parties/NRSC/2024/contributors?name=national-republican-senatorial-cmte "Just a moment..."

### United Democracy Project - UDP (2)

- [needs_review] `src_009893` https://www.opensecrets.org/political-action-committees-pacs/united-democracy-project/C00799031/donors/2024 "Just a moment..."
- [needs_review] `src_009895` https://www.opensecrets.org/political-action-committees-pacs/united-democracy-project/C00799031/expenditures/2024 "Just a moment..."

### Winning for Women PAC (2)

- [needs_review] `src_009899` https://www.opensecrets.org/political-action-committees-pacs/winning-for-women/C00646703/summary/2024 "Just a moment..."
- [needs_review] `src_009902` https://www.opensecrets.org/orgs/winning-for-women/summary?id=D000070512 "Just a moment..."

### California Restaurant Association (2)

- [needs_review] `src_009917` https://www.opensecrets.org/orgs/national-restaurant-assn/summary?id=D000000150 "Just a moment..."
- [needs_review] `src_009918` https://www.nhtsa.gov/recalls?manufacturer=California%20Restaurant%20Association "Access Denied"

### McDonalds Corporation (2)

- [needs_review] `src_009926` https://www.opensecrets.org/orgs/mcdonalds-corp/summary?id=D000000373 "Just a moment..."
- [needs_review] `src_009936` https://www.nhtsa.gov/recalls?manufacturer=McDonalds%20Corporation "Access Denied"

### National Multifamily Housing Council (2)

- [needs_review] `src_009992` https://www.opensecrets.org/orgs/national-multifamily-housing-council/summary?id=D000000755 "Just a moment..."
- [needs_review] `src_009993` https://www.opensecrets.org/political-action-committees-pacs/national-multifamily-housing-council/C00130773/summary/2022 "Just a moment..."

### Blackstone Real Estate (2)

- [needs_review] `src_010019` https://www.businesswire.com/news/home/20260218809149/en/Invitation-Homes-Reports-Fourth-Quarter-and-Full-Year-2025-Results "Access Denied"
- [needs_review] `src_010026` https://www.novoco.com/notes-from-novogradac/tax-teams-series-highlighting-the-impact-of-the-opportunity-zones-incentive "Just a moment..."

### MasTec - Mas Canosa Family (2)

- [needs_review] `src_010101` https://www.opensecrets.org/orgs/mastec-inc/summary?id=D000035672 "Just a moment..."
- [needs_review] `src_010102` https://www.nhtsa.gov/recalls?manufacturer=MasTec%20-%20Mas%20Canosa%20Family "Access Denied"

### Real Estate Development Industry Bloc (2)

- [needs_review] `src_010160` https://www.opensecrets.org/political-action-committees-pacs/national-assn-of-realtors/C00030718/summary/2024 "Just a moment..."
- [needs_review] `src_010167` https://www.nhtsa.gov/recalls?manufacturer=Real%20Estate%20Development%20Industry%20Bloc "Access Denied"

### Gilead Sciences (2)

- [needs_review] `src_010290` https://www.opensecrets.org/orgs/gilead-sciences/summary?id=D000000540 "Just a moment..."
- [needs_review] `src_010302` https://www.nhtsa.gov/recalls?manufacturer=Gilead%20Sciences "Access Denied"

### Meatpacking Corporations (2)

- [needs_review] `src_010352` https://missouriindependent.com/2024/06/06/meat-industry-increases-political-spending-lobbying-as-usda-updates-crucial-regulations/ "Just a moment..."
- [needs_review] `src_010357` https://www.opensecrets.org/political-action-committees-pacs/industry-detail/G2300/2024 "Just a moment..."

### Merck (2)

- [needs_review] `src_010363` https://www.opensecrets.org/orgs/merck-co/summary?id=D000000275 "Just a moment..."
- [needs_review] `src_010394` https://www.nhtsa.gov/recalls?manufacturer=Merck "Access Denied"

### Moderna (2)

- [needs_review] `src_010396` https://www.opensecrets.org/orgs/moderna-inc/summary?id=D000073555 "Just a moment..."
- [needs_review] `src_010400` https://www.nhtsa.gov/recalls?manufacturer=Moderna "Access Denied"

### Elon Musk (2)

- [needs_review] `src_010696` https://www.faa.gov/newsroom/new-record-faa-licensed-commercial-space-operations-aerospace-rulemaking-committee "Access Denied"
- [needs_review] `src_010699` https://www.politico.com/news/2025/05/29/musk-tesla-blast-gop-end-clean-energy-tax-credits-00374074 "Just a moment..."

### AT&T (2)

- [needs_review] `src_011398` https://www.opensecrets.org/orgs/at-t-inc/summary?id=D000000076 "Just a moment..."
- [needs_review] `src_011408` https://www.nhtsa.gov/recalls?manufacturer=AT%26T "Access Denied"

### Walt Disney Company (2)

- [needs_review] `src_011543` https://www.opensecrets.org/orgs/walt-disney-co/summary?id=D000000128 "Just a moment..."
- [needs_review] `src_011544` https://www.opensecrets.org/orgs/walt-disney-co/lobbying?id=D000000128 "Just a moment..."

### SEIU - Service Employees International Union (2)

- [needs_review] `src_011725` https://www.opensecrets.org/orgs/service-employees-international-union/totals?id=D000000077 "Just a moment..."
- [needs_review] `src_011728` https://www.opensecrets.org/orgs/service-employees-international-union/summary?id=D000000077 "Just a moment..."

### Blue Cross Blue Shield Association (2)

- [needs_review] `src_011983` https://www.opensecrets.org/orgs/blue-cross-blue-shield/summary?id=D000000109 "Just a moment..."
- [needs_review] `src_011990` https://www.nhtsa.gov/recalls?manufacturer=Blue%20Cross%20Blue%20Shield%20Association "Access Denied"

### Hospital Corporation of America - HCA (2)

- [needs_review] `src_012051` https://www.opensecrets.org/orgs/hca-healthcare/summary?id=D000000458 "Just a moment..."
- [needs_review] `src_012054` https://www.nhtsa.gov/recalls?manufacturer=Hospital%20Corporation%20of%20America%20-%20HCA "Access Denied"

### Kaiser Permanente (2)

- [needs_review] `src_012112` https://www.opensecrets.org/orgs/kaiser-permanente/summary?id=D000034986 "Just a moment..."
- [needs_review] `src_012117` https://www.nhtsa.gov/recalls?manufacturer=Kaiser%20Permanente "Access Denied"

### DoorDash (2)

- [needs_review] `src_012209` https://www.opensecrets.org/orgs/doordash-inc/summary?id=D000072628 "Just a moment..."
- [needs_review] `src_012212` https://www.nhtsa.gov/recalls?manufacturer=DoorDash "Access Denied"

### Lyft (2)

- [needs_review] `src_012277` https://www.opensecrets.org/orgs/lyft-inc/summary?id=D000067782 "Just a moment..."
- [needs_review] `src_012278` https://www.nhtsa.gov/recalls?manufacturer=Lyft "Access Denied"

### Chevron (2)

- [needs_review] `src_012432` https://www.opensecrets.org/orgs/chevron/recipients?id=D000000015 "Just a moment..."
- [needs_review] `src_012442` https://www.nhtsa.gov/recalls?manufacturer=Chevron "Access Denied"

### Defense Contractors Bloc (2)

- [needs_review] `src_013160` https://www.opensecrets.org/news/reports/capitalizing-on-conflict/defense-contractors "Just a moment..."
- [needs_review] `src_013161` https://www.opensecrets.org/news/2023/10/defense-contractors-spent-70-million-lobbying-ahead-of-annual-defense-budget-bill-ndaa/ "Just a moment..."

### American Action Network (2)

- [needs_review] `src_013566` https://www.opensecrets.org/orgs/american-action-network/totals?id=D000060058 "Just a moment..."
- [needs_review] `src_013567` https://www.opensecrets.org/news/2021/03/one-billion-dark-money-2020-electioncycle/ "Just a moment..."

### Freedom Partners Chamber of Commerce (2)

- [needs_review] `src_013897` https://www.politico.com/story/2014/10/koch-donors-111846 "Just a moment..."
- [needs_review] `src_013899` https://www.opensecrets.org/political-action-committees-pacs/freedom-partners-chamber-of-commerce/C90016692/summary/2018 "Just a moment..."

### HBW Resources (2)

- [needs_review] `src_013932` https://www.opensecrets.org/orgs/hbw-resources/summary?id=D000073431 "Just a moment..."
- [needs_review] `src_013940` https://www.nhtsa.gov/recalls?manufacturer=HBW%20Resources "Access Denied"

### National Association of Manufacturers (2)

- [needs_review] `src_014011` https://www.opensecrets.org/orgs/national-assn-of-manufacturers/lobbying?id=D000054156 "Just a moment..."
- [needs_review] `src_014012` https://www.opensecrets.org/orgs/national-assn-of-manufacturers/summary?id=D000054156 "Just a moment..."

### Ocean Conservancy (2)

- [needs_review] `src_014050` https://www.opensecrets.org/orgs/ocean-conservancy/lobbying?id=D000064969 "Just a moment..."
- [needs_review] `src_014051` https://www.opensecrets.org/orgs/ocean-conservancy/summary?id=D000064969 "Just a moment..."

### Ohio Democratic Party (2)

- [needs_review] `src_014071` https://www.opensecrets.org/political-action-committees-pacs/democratic-party-of-ohio/C00016899/summary/2024 "Just a moment..."
- [needs_review] `src_014073` https://www.opensecrets.org/races/summary?cycle=2024&id=OHS1 "Just a moment..."

### Trump Donor Coalition (2)

- [needs_review] `src_014204` https://www.opensecrets.org/political-action-committees-pacs/make-america-great-again-inc/C00825851/summary/2024 "Just a moment..."
- [needs_review] `src_014205` https://www.opensecrets.org/outside-spending/detail/2024?cmte=C00825851&tab=donors "Just a moment..."

### US Chamber of Commerce (2)

- [needs_review] `src_014216` https://www.opensecrets.org/orgs/us-chamber-of-commerce/summary?id=D000019798 "Just a moment..."
- [needs_review] `src_014218` https://www.opensecrets.org/orgs/us-chamber-of-commerce/lobbying?id=D000019798 "Just a moment..."

### Aramark (2)

- [needs_review] `src_014251` https://www.opensecrets.org/orgs/aramark-corp/summary?id=D000024107 "Just a moment..."
- [needs_review] `src_014270` https://www.nhtsa.gov/recalls?manufacturer=Aramark "Access Denied"

### CoreCivic - Private Prisons (2)

- [needs_review] `src_014294` https://tennesseelookout.com/2025/11/06/private-prison-operator-corecivic-saw-55-increase-in-immigration-detainee-contracts/ "Just a moment..."
- [needs_review] `src_014297` https://www.nhtsa.gov/recalls?manufacturer=CoreCivic%20-%20Private%20Prisons "Access Denied"

### ViaPath Technologies - GTL (2)

- [needs_review] `src_014377` https://www.opensecrets.org/federal-lobbying/ "Just a moment..."
- [needs_review] `src_014380` https://www.nhtsa.gov/recalls?manufacturer=ViaPath%20Technologies%20-%20GTL "Access Denied"

### Tyson Foods (2)

- [needs_review] `src_014627` https://www.opensecrets.org/orgs/tyson-foods/summary?id=D000000443 "Just a moment..."
- [needs_review] `src_014643` https://www.nhtsa.gov/recalls?manufacturer=Tyson%20Foods "Access Denied"

### Diff Log (1)

- [dead] `src_000061` https://www.just` "DOJ: $13 billion settlement press release"

### Quality Standards — The Donor Map Database (1)

- [dead] `src_000283` https://url "Source Name: Description"

### Pipeline Report: url-check (1)

- [dead] `src_000343` https://bush.house.gov/about "bush.house.gov: About"

### Vault Standards and Agent Instructions (1)

- [dead] `src_000344` https://actual-working-url "Source Name: Description"

### InfluenceMap (1)

- [dead] `src_000525` https://www.nhtsa.gov/recalls?manufacturer=InfluenceMap "Access Denied"

### Roosevelt Institute (1)

- [dead] `src_000563` https://www.npr.org/2022/05/10/1098105334/lisa-cook-federal-reserve "NPR: Senate Approves Lisa Cook as First Black Woman on Federal Reserve Board of "

### Claremont Institute (1)

- [dead] `src_000735` https://www.politico.com/news/2026/01/05/how-the-claremont-institute-became-a-power-center-in-trumps-washington-00700147 "Just a moment..."

### Brookings Institution (1)

- [dead] `src_001048` https://www.npr.org/2022/06/07/1103629580/fbi-seizes-retired-generals-data-related-to-qatar-lobbying "NPR: FBI Seizes Retired General's Data Related to Qatar Lobbying (June 2022)"

### The Manchin-Sinema Donor-Class Veto - How Two Senators Killed a Majority (1)

- [dead] `src_001307` https://www.npr.org/2022/01/22/1075088298/kyrsten-sinema-censure-arizona-democrats-filibuster-vote "NPR: Kyrsten Sinema censured by Arizona Democratic Party"

### Alaska 2026 Senate Race (1)

- [dead] `src_001903` https://www.fec.gov/data/candidate/S4AK00214/ "Dan Sullivan 2020 campaign finances | FEC"

### New Hampshire 2026 Senate Race (1)

- [dead] `src_001979` https://www.fec.gov/data/candidate/S6NH00166/ "Scott Brown political action committee activity | FEC"

### Texas 2026 Senate Race (1)

- [dead] `src_002025` https://www.npr.org/2024/03/05/1236052104/texas-senate-election-democrats-cruz "NPR: Trump teases GOP endorsement in Texas Senate race"

### AIPAC Illinois Shell PAC Operation (1)

- [dead] `src_002054` https://cyberdriveillinois.com/departments/index/register/home.html "Illinois Results: March 2026 - Illinois Secretary of State"

### 2026-03-21 News Scan (1)

- [dead] `src_002153` https://www.npr.org/2026/03/20/nx-s1-5754550/israel-strikes-tehran-iran-attacks-gulf "NPR: Trump mulls winding down Iran war"

### 2026-03-23 Policy Research (1)

- [dead] `src_002312` https://www.npr.org/2026/03/23/g-s1-114107/ices-growing-detention-footprint-and-the-communities-fighting-back "NPR: ICE's growing detention footprint and the communities fighting back"

### 2026-03-24 Finance Research (1)

- [dead] `src_002323` https://the-decoder.com/meta-pours-65-million-into-state-elections-to-back-ai-friendly-politicians/ "The Decoder"

### 2026-03-27 Story Discovery Run 2 (1)

- [dead] `src_002493` https://www.npr.org/2026/01/12/nx-s1-5675151/trump-credit-card-interest-rate-cap "NPR: Trump calls for a 10% cap on credit card interest rates"

### Fossil Fuel Investments and the Recusal Pattern (1)

- [dead] `src_002564` https://www.npr.org/2024/06/05/nx-s1-4993790/alito-neighbor-flag-wife-recuse-insurrection-jan-6 "NPR. Alito Neighbor Gives Detailed Account of Dispute (June 5 2024)"

### The Leo Pipeline and Operation Higher Court (1)

- [dead] `src_002572` https://www.npr.org/2022/12/08/1141546218/supreme-court-leaks-reverend-rob-schenk-dobbs-hobby-lobby "NPR. A High Profile Leak Has Heightened Questions Around the Supreme Court (Dece"

### Samuel Alito Master Profile (1)

- [dead] `src_002579` https://www.supremecourt.gov/errors/PageNotFound.aspx?aspxerrorpath=/about/justices-associate-justices.aspx "404 - Page Not Found"

### Ginni Thomas - The Political Arm and Financial Conflicts (1)

- [dead] `src_002627` https://www.npr.org/2022/03/25/1088720571/ginni-thomas-tex-messages-mark-meadows-2020-election "NPR. Ginni Thomas Texted Mark Meadows to Try to Overturn the 2020 Election (Marc"

### The Executive Power Portfolio and the Donor-Class Rulings (1)

- [dead] `src_002654` https://www.npr.org/2018/08/17/639670928/brett-kavanaughs-role-in-the-starr-investigation-and-how-it-shaped-him "NPR: Brett Kavanaugh's Role In the Starr Investigation And How It Shaped Him"

### Hillbilly Elegy and the Class Fraud (1)

- [dead] `src_002682` https://www.npr.org/2024/07/17/1196981016/nprs-book-of-the-day-jd-vance-hillbilly-elegy "NPR: Hillbilly Elegy is back in the spotlight - Appalachian responses"

### The Anti-Establishment Brand and the Foreign Influence Questions (1)

- [dead] `src_002709` https://www.npr.org/2025/02/12/nx-s1-5294635/tulsi-gabbard-confirmed-dni-intelligence-senate "NPR: Gabbard confirmed as DNI"

### Tulsi Gabbard Master Profile (1)

- [dead] `src_002715` https://www.npr.org/sections/thetwo-way/2016/02/28/468457319/vice-chair-of-dnc-resigns-to-support-bernie-sanders "NPR: Vice Chair of DNC Tulsi Gabbard resigns to support Bernie Sanders (February"

### Steve Witkoff (1)

- [dead] `src_002720` https://www.npr.org/2025/04/25/nx-s1-5364884/trump-witkoff-russia-iran-middle-east "NPR: Meet Steve Witkoff, Trump's negotiator"

### The Mercer Investment and the Construction of Populist Infrastructure (1)

- [dead] `src_002734` https://www.npr.org/2017/11/02/561634551/billionaire-investor-robert-mercer-to-step-down-from-firm-selling-stake-in-breit "NPR: Billionaire investor Robert Mercer to step down from firm, selling stake in"

### Steve Bannon Master Profile (1)

- [dead] `src_002737` https://www.npr.org/2017/03/22/521083950/inside-the-wealthy-family-that-has-been-funding-steve-bannon-s-plan-for-years "NPR: Inside the wealthy family funding Bannon"

### Scott Bessent Master Profile (1)

- [dead] `src_002778` https://www.npr.org/transcripts/1216966368 "NPR: Soros connection (Planet Money - Black Wednesday)"

### Pete Hegseth Master Profile (1)

- [dead] `src_002807` https://www.npr.org/2025/01/24/nx-s1-5272854/trump-cabinet-picks-pete-hegseth-senate-confirmation-vote "NPR: Pete Hegseth Senate Confirmation"

### The Nunes Pipeline and the Loyalty Promotion System (1)

- [dead] `src_002946` https://www.npr.org/2025/11/19/nx-s1-5613347/how-kash-patel-is-roiling-the-departme-and-changing-the-mission-of-the-fbi "NPR: How Kash Patel is roiling the DOJ and changing the mission of the FBI"

### John Ratcliffe Master Profile (1)

- [dead] `src_002965` https://www.npr.org/2025/01/23/g-s1-44389/john-ratcliffe-cia-director "NPR: CIA Director confirmation"

### Jared Kushner Master Profile (1)

- [dead] `src_002985` https://www.npr.org/2025/10/23/nx-s1-5582806/jared-kushner-mideast-business-ceasefire "NPR: Kushner business ties and Middle East policy"

### Elise Stefanik (1)

- [dead] `src_003008` https://www.npr.org/2024/11/11/nx-s1-5186927/trump-taps-rep-elise-stefanik-to-be-u-s-ambassador-to-the-united-nations "NPR: 4 things to know about Elise Stefanik"

### The AI-Crypto Czar and the Portfolio Conflict (1)

- [dead] `src_003026` https://www.npr.org/2025/12/12/nx-s1-5631823/david-sacks-ai-advisor-investment-conflicts "NPR: Sacks ethics disclosure failed to classify Palantir as AI company"

### The Epstein Plea Deal and Labor Secretary Appointment (1)

- [dead] `src_003070` https://www.miamiherald.com/topics/jeffrey-epstein "Miami Herald: Perversion of Justice investigation"

### Alexander Acosta Master Profile (1)

- [dead] `src_003075` https://www.npr.org/2019/07/12/739881163/alexander-acosta-steps-down-as-labor-secretary-amid-epstein-controversy "Source: [NPR: Acosta steps down amid Epstein controversy"

### The Neoconservative Billionaire Pipeline and the Iran Letter (1)

- [dead] `src_003134` https://www.npr.org/2015/03/13/392845709/tom-cotton-the-freshman-senator-behind-the-iran-letter "NPR: Tom Cotton: The Freshman Senator Behind The Iran Letter"

### Roger Wicker (1)

- [dead] `src_003249` https://www.wicker.senate.gov/2018/9/wicker-hyde-smith-palazzo-praise-multi-year-contract-award-for-ingalls-shipbuilding "Wicker.senate.gov: Multi-Year Contract Award for Ingalls Shipbuilding"

### Columbia-HCA and the Largest Medicare Fraud in History (1)

- [dead] `src_003269` https://www.npr.org/sections/health-shots/2010/11/03/131044677/florida-governor-rick-scott-columbia-hca-fraud-justice-department "NPR: Once Scrutinized By The Government, Rick Scott Soon Will Govern"

### The Libertarian Brand and Donor Class Service (1)

- [dead] `src_003284` https://www.fec.gov/data/candidate/H4OH19044/ "FEC Candidate: Rand Paul donor profile"

### Kentucky Inc - Coal Tobacco Bourbon and Pharma (1)

- [dead] `src_003312` https://www.npr.org/2019/06/17/730496066/tobaccos-special-friend-what-internal-documents-say-about-mitch-mcconnell "NPR: Tobacco's 'Special Friend': What Internal Documents Say About Mitch McConne"

### Markwayne Mullin (1)

- [dead] `src_003379` https://www.npr.org/2026/03/23/g-s1-114813/markwayne-mullin-confirmed-homeland-security "NPR: Mullin confirmed as DHS secretary"

### The Energy Committee and Alaska Oil Dependency (1)

- [dead] `src_003391` https://www.fec.gov/data/candidate/S4AK00099/ "FEC Candidate: Lisa Murkowski campaign finance summary"

### The McConnell Succession and the Majority Leader Fundraising Machine (1)

- [dead] `src_003499` https://www.npr.org/2024/11/13/nx-s1-5188585/house-senate-republican-leadership "NPR: Republican leadership elections: John Thune, Mike Johnson picked by their p"

### John Thune Master Profile (1)

- [dead] `src_003504` https://www.npr.org/2024/11/14/nx-s1-5186649/newly-elected-senate-majority-leader-john-thune-has-his-work-cut-out-for-him "NPR: Thune-Trump relationship evolution"

### John Kennedy Master Profile (1)

- [dead] `src_003519` https://www.npr.org/2024/04/09/1243778467/for-communities-near-chemical-plants-epas-new-air-pollution-rule-spells-relief "NPR: EPA rule aims to cut cancer-causing air pollution from chemical plants (202"

### James Lankford (1)

- [dead] `src_003610` https://www.npr.org/2024/11/14/nx-s1-5191708/gaetz-nomination-republicans-ethics-probe "NPR: Senate Republicans cast doubt on bipartisan border bill"

### Chuck Grassley (1)

- [dead] `src_003641` https://www.npr.org/sections/thetwo-way/2016/03/16/470643431/-i-ve-made-my-decision-on-supreme-court-nominee-president-obama-says "NPR: The 293-Day Blockade of Merrick Garland"

### E15 Ethanol and Agricultural Subsidy Advocacy (1)

- [dead] `src_003662` https://www.brownfieldagnews.com/news/farm-bill-extension-likely-rep-hinson-says/ "Farm bill extension likely, Rep. Hinson says - Brownfield Ag News"

### Ashley Hinson Master Profile (1)

- [dead] `src_003675` https://www.fec.gov/data/candidate/H0IA01174/ "Rep. Ashley Hinson - Campaign Finance Summary | OpenSecrets"

### Section 702 - The Warrantless Surveillance Expansion (1)

- [dead] `src_003772` https://www.npr.org/2024/04/20/1246076114/senate-passes-reauthorization-surveillance-program-fisa "NPR. House votes to renew FISA spying tool after earlier Republican revolt (Apri"

### Family Separation - Zero Tolerance and Who Profited (1)

- [dead] `src_003896` https://www.npr.org/2022/08/11/1116917364/how-the-trump-white-house-misled-the-world-about-its-family-separation-policy "NPR. How the Trump White House misled the world about its family separation poli"

### Visa Programs - Anti-Immigration Rhetoric Meets Tech Donor Needs (1)

- [dead] `src_003913` https://www.npr.org/2025/09/20/nx-s1-5548568/h1b-visa-fee-trump-tech "NPR. Trump's new $100K fee on H-1B visas will hurt the tech companies trying to "

### The Billionaire Cabinet - Wealthiest Administration in History (1)

- [dead] `src_003990` https://www.nasdaq.com/articles/inside-financial-profiles-trumps-cabinet-members-worth-almost-12-billion "Nasdaq: Inside the Financial Profiles of Trump's Cabinet Members (Worth Almost $"

### Emoluments and Self Dealing - Donors and Backers (1)

- [dead] `src_004008` https://www.npr.org/2022/11/14/1136682162/foreign-officials-750-000-dollars-trump-hotel-dc "NPR: Receipts show foreign officials spent more than $750,000 at Trump's D.C. ho"

### The Grift Machine - How Trump Monetized the Presidency (1)

- [dead] `src_004022` https://www.npr.org/2024/01/04/1222896035/foreign-governments-paid-millions-to-trumps-companies-while-he-was-president "ProPublica Congress: Foreign governments paid millions to Trump's companies whil"

### Farm Subsidies, SNAP Cuts, and the Tariff Bailout - Who Actually Got Paid (1)

- [dead] `src_004075` https://www.usda.gov/farming-and-ranching/farm-bill "USDA. Farm Bill Overview"

### Nancy Mace (1)

- [dead] `src_004081` https://www.npr.org/2024/11/19/nx-s1-5196116/capitol-transgender-bathroom-ban-nancy-mace-sarah-mcbride "NPR: Nancy Mace launches Capitol bathroom rule before trans colleague's arrival"

### The Small Business Committee and Texas Oil-Auto Pipeline (1)

- [dead] `src_004212` https://www.fec.gov/data/candidate/H2TX33040/ "FEC Candidate: Roger Williams campaign finance and personal finances"

### The Homeland Security Committee and Tennessee Defense (1)

- [dead] `src_004331` https://www.fec.gov/data/candidate/H0CT05150/ "FEC Candidate: Mark Green campaign finance summary"

### The Culture War Economy and Small Dollar Fundraising (1)

- [dead] `src_004373` https://www.fec.gov/data/candidate/H0CO03165/ "FEC Candidate: Lauren Boebert fundraising analysis"

### January 6 Communications and the Weaponization Subcommittee Hypocrisy (1)

- [dead] `src_004414` https://www.npr.org/2023/02/09/1155459408/house-panel-on-weaponization-of-the-federal-government-will-hold-its-first-heari "NPR: What is the Subcommittee on Weaponization of the Federal Government?"

### Jason Smith (1)

- [dead] `src_004428` https://www.fec.gov/data/committee/C00541862/ "FEC: Jason Smith for Congress Committee (C00541862)"

### The Oversight Chair and the Investigation Theater (1)

- [dead] `src_004442` https://www.fec.gov/data/candidate/H6KY01110/ "FEC Candidate: James Comer campaign finance summary"

### James Comer (1)

- [dead] `src_004447` https://www.npr.org/2024/02/20/1232789953/alexander-smirnov-fbi-informant-biden-hunter-ukraine "NPR: FBI Informant Smirnov Charged with Lying About Bidens"

### The Energy Committee and Houston Petrochemical Pipeline (1)

- [dead] `src_004487` https://www.fec.gov/data/candidate/H8TX02166/ "FEC Candidate: Dan Crenshaw career industry breakdown"

### Carlos Gimenez (1)

- [dead] `src_004514` https://www.fec.gov/data/candidate/H0FL26036/ "FEC Candidate: Carlos Gimenez campaign finance summary"

### The Foreign Affairs Committee and Florida Defense (1)

- [dead] `src_004544` https://www.fec.gov/data/candidate/H6FL18097/ "FEC Candidate: Brian Mast campaign finance summary"

### The Warren Pipeline - Consumer Protection to Governor (1)

- [dead] `src_004799` https://www.npr.org/2023/04/11/1169318377/rep-katie-porter-is-standing-up-to-corporate-america-one-whiteboard-at-a-time "NPR: Rep. Katie Porter is standing up to corporate America — one whiteboard at a"

### Chad Bianco Master Profile (1)

- [dead] `src_004819` https://www.npr.org/2021/10/06/1043651361/oath-keepers-california-sheriff-chad-bianco-january-6-us-capitol "NPR: Oath Keepers / Bianco"

### The BBB Kill and IRA Fossil Fuel Concessions (1)

- [dead] `src_004987` https://www.npr.org/2021/12/19/1065665886/manchin-says-build-back-betters-climate-measures-are-risky-thats-not-true "NPR: Manchin says BBB climate measures are risky. That's not true."

### The HELP Committee and Prescription Drug Pricing (1)

- [dead] `src_005123` https://www.npr.org/sections/health-shots/2024/02/08/1230174586/high-us-drug-prices "NPR: Drug company CEOs grilled about high U.S. drug prices (Feb 8, 2024)"

### The Medicare for All Retreat - Two Audiences and One Calculation (1)

- [dead] `src_005443` https://www.npr.org/2019/11/01/775339519/heres-how-warren-finds-20-5-trillion-to-pay-for-medicare-for-all "NPR: Here's How Warren Finds $20.5 Trillion To Pay For Medicare For All"

### Dick Durbin (1)

- [dead] `src_005485` https://www.npr.org/2025/04/23/nx-s1-5340683/dick-durbin-retire-senate "NPR: Sen. Dick Durbin says he will not seek reelection"

### The Bankruptcy Bill and MBNA - The Credit Card Senator's Defining Vote (1)

- [dead] `src_005630` https://www.npr.org/2008/08/25/93954519/bidens-link-to-credit-card-firm-questioned "NPR: Biden's Link To Credit-Card Firm Questioned"

### The Student Loan Gambit - Promise Block and Political Credit (1)

- [dead] `src_005650` https://studentaid.gov/manage-loans/repayment/plans/income-driven/save "Department of Education: SAVE Plan enrollment and impact"

### Zoe Lofgren (1)

- [dead] `src_005817` https://prospect.org/2021/07/01/zoe-lofgren-democratic-holdout-big-tech-legislation/ "American Prospect: Zoe Lofgren — The Democratic Holdout on Big Tech Legislation"

### Wesley Bell Master Profile (1)

- [dead] `src_005828` https://www.fec.gov/data/candidate/H4MO01134/ "Source: FEC.gov"

### Legislative Record as Speaker (1)

- [dead] `src_005990` https://www.npr.org/2022/08/07/1116190180/democrats-are-set-to-pass-a-major-climate-health-and-tax-bill-heres-whats-in-it "NPR: What is in the Inflation Reduction Act?"

### Maxine Waters (1)

- [dead] `src_006039` https://www.npr.org/sections/thetwo-way/2012/09/21/161538755/rep-maxine-waters-cleared-by-house-ethics-committee "NPR: Waters Cleared by House Ethics Committee"

### Mark Takano (1)

- [dead] `src_006054` https://www.npr.org/2022/06/07/1103591879/a-big-32-hour-workweek-test-is-underway-supporters-think-it-could-help-productiv "NPR: Mark Takano and the four-day work week"

### Jim Himes (1)

- [dead] `src_006101` https://www.npr.org/2023/03/15/1163617407/some-in-washington-blame-the-bank-failures-on-a-rollback-of-landmark-banking-rul "NPR: Silicon Valley Bank and the Regulatory Rollback (2023)"

### Bennie Thompson (1)

- [dead] `src_006339` https://www.npr.org/2022/06/08/1102909009/jan-6-committee-members-capitol-attack-thompson "NPR: Bennie Thompson — From Civil Rights to January 6th"

### The Fracking Alliance and the Energy Contradiction (1)

- [dead] `src_006466` https://whyy.org/articles/first-year-pennsylvania-governor-josh-shapiro-forged-alliances-with-natural-gas-industry/ "WHYY: Shapiro's fossil fuel alliances"

### The Maui Wildfire Response and the Rebuilding Money Trail (1)

- [dead] `src_006470` https://www.npr.org/2023/08/17/1194351587/hawaii-governor-vows-to-block-land-grabs-as-fire-ravaged-maui-rebuilds "NPR: Hawaii governor vows to block land grabs as fire-ravaged Maui rebuilds"

### Offshore Trusts Toilet Schemes and the Tax Avoidance Architecture (1)

- [dead] `src_006477` https://www.npr.org/2018/10/03/654201077/illinois-gov-candidate-removed-mansions-toilets-to-dodge-taxes-report-finds "NPR: Toilet removal property tax scheme"

### The Hyatt Fortune and the Labor Contradiction (1)

- [dead] `src_006483` https://inthesetimes.com/article/hyatt-workers-stage-national-actions-against-billionaire-pritzkers "In These Times: Hyatt workers stage national actions against Pritzkers"

### AB5 - Gig Worker Classification (1)

- [dead] `src_006553` https://www.npr.org/2019/09/18/762108954/california-governor-signs-law-protecting-gig-economy-workers "NPR: Prop 22 passes; gig workers remain independent contractors"

### 3.5 Million Units - Broken Promise (1)

- [dead] `src_006625` https://dailycallernewsfoundation.org/2025/11/27/california-housing-crisis-gavin-newsom/ "Daily Caller News Foundation: housing crisis data under Newsom (Nov 2025)"

### Single-Payer Broken Promise (1)

- [dead] `src_006682` https://www.npr.org/2022/01/31/1077155345/california-universal-health-care-bill-dies-without-a-vote "NPR: AB 1400 dies without vote"

### PG&E - The Utility Donor and the Wildfire Cover (1)

- [dead] `src_006705` https://www.sfchronicle.com/california-wildfires/article/PG-E-pleads-guilty-to-84-counts-of-involuntary-15331371.php "Page Not Found"

### The Healthcare Platform and the Insurance Industry Question (1)

- [dead] `src_006811` https://www.npr.org/sections/health-shots/2019/04/11/711902886/as-sanders-calls-for-medicare-for-all-a-twist-on-that-plan-gains-traction "NPR: As Sanders Calls for Medicare for All, a Twist on That Plan Gains Traction"

### Laphonza Butler (1)

- [dead] `src_006832` https://www.npr.org/2022/02/25/1083180736/biden-picks-ketanji-brown-jackson-as-supreme-court-nominee "NPR: Feinstein's Successor Laphonza Butler Takes Office as California's New Sena"

### The McKinsey Years and the Consulting-to-Politics Pipeline (1)

- [dead] `src_006870` https://www.npr.org/2019/12/10/786912801/facing-scrutiny-pete-buttigieg-releases-list-of-mckinsey-clients "NPR: Facing scrutiny, Buttigieg releases list of McKinsey clients"

### Candace Owens (1)

- [dead] `src_007105` https://www.npr.org/2025/07/24/nx-s1-5477430/french-president-and-first-lady-sue-candace-owens-for-defamation "NPR: "French President and First Lady Sue Candace Owens for Defamation" (Jul 24,"

### Dan Bongino (1)

- [dead] `src_007156` https://www.npr.org/2022/01/06/1070924133/how-dan-bongino-is-building-a-right-wing-media-infrastructure-in-time-for-2024 "NPR Fresh Air: "How Dan Bongino Is Building a Right-Wing Media Infrastructure in"

### Greg Gutfeld (1)

- [dead] `src_007183` https://www.npr.org/2025/12/02/nx-s1-5627506/fox-news-smartmatic-lawsuit-election-claims-trial "NPR: Judge to decide whether Fox News will face Smartmatic at trial (Watters-Gut"

### Jesse Watters (1)

- [dead] `src_007220` https://www.npr.org/2021/12/22/1066956407/anthony-fauci-jesse-watters-fox-news-kill-shot-ambush-interviews "NPR: Fauci calls for Fox News to fire Jesse Watters over 'kill shot' comments"

### Sean Hannity (1)

- [dead] `src_007309` https://www.npr.org/2018/04/24/605176125/sean-hannitys-real-estate-portfolio-raises-journalism-ethics-questions "NPR: Sean Hannity's Real Estate Portfolio Raises Journalism Ethics Questions"

### Tenet Media (1)

- [dead] `src_007328` https://www.npr.org/2024/09/05/nx-s1-5100829/russia-election-influencers-youtube "NPR: How Russian operatives covertly hired U.S. influencers to create viral vide"

### George Galloway (1)

- [dead] `src_007482` https://www.itv.com/news/granada/2024-07-05/george-galloway-fails-to-show-up-as-loses-seat "ITV News Granada: George Galloway loses Rochdale seat at general election (July "

### Joy Reid (1)

- [dead] `src_007525` https://www.npr.org/2025/02/25/g-s1-50551/joy-reid-msnbc-fired "NPR: MSNBC fires host Joy Reid amid network shakeup"

### Ezra Klein (1)

- [dead] `src_007764` https://corporate.comcast.com/news-information/news-feed/nbcuniversal-announces-strategic-investment-in-vox-media "Comcast: "NBCUniversal Announces Strategic Investment in Vox Media" (2015)"

### Joe Rogan (1)

- [dead] `src_007806` https://www.npr.org/2022/01/31/1076891070/joe-rogan-responds-spotify-podcast-covid-misinformation "NPR: Joe Rogan responds to protests over his Spotify podcast"

### Megyn Kelly (1)

- [dead] `src_007853` https://www.npr.org/2018/10/25/660644000/megyn-kelly-out-at-nbc-after-blackface-remarks "NPR: Megyn Kelly Out At NBC's 'Today' Show"

### Squire Patton Boggs (1)

- [dead] `src_008294` https://www.npr.org/sections/itsallpolitics/2014/09/15/348775527/tommy-boggs-influential-lobbyist-dies-at-73 "NPR: Tommy Boggs, Influential Lobbyist, Dies At 73"

### Brian Armstrong (1)

- [dead] `src_009159` https://www.federalregister.gov/documents/search?conditions%5Bterm%5D=%22Brian%20Armstrong%22 "Source: Federal Register"

### Mithril Capital (1)

- [dead] `src_009410` https://investors.adagiotx.com/news-releases/news-release-details/invivyd-appoints-ajay-royan-founder-mithril-capital-its-board/ "Invivyd Appoints Ajay Royan, Founder of Mithril Capital, to its Board of Directo"

### Trump Victory (1)

- [dead] `src_009883` https://www.npr.org/2019/01/04/681987077/rnc-members-want-to-block-a-primary-challenge-to-trump-but-the-rules-may-stop-th "NPR: RNC Member Introduces Resolution to Prevent Trump Legal Bill Payments"

### Kelcy Warren (1)

- [dead] `src_010921` https://www.npr.org/2025/02/24/nx-s1-5292463/greenpeace-lawsuit-energy-transfer-dakota-access "NPR: Greenpeace Faces $300 Million Lawsuit After Dakota Access Pipeline Protests"

### Mark Zuckerberg (1)

- [dead] `src_011071` https://www.npr.org/2025/01/07/nx-s1-5251151/meta-fact-checking-mark-zuckerberg-trump "NPR: Meta ends fact-checking program"

### Reid Hoffman (1)

- [dead] `src_011218` https://www.federalregister.gov/documents/search?conditions%5Bterm%5D=%22Reid%20Hoffman%22 "Source: Federal Register"

### Sam Bankman-Fried (1)

- [dead] `src_011267` https://www.federalregister.gov/documents/2023/11/21/2023-24774/investment-of-customer-funds-by-futures-commission-merchants-and-derivatives-clearing-organizations "Investment of Customer Funds by Futures Commission Merchants and Derivatives Cle"

### Stephen Schwarzman (1)

- [dead] `src_011295` https://www.federalregister.gov/documents/2022/07/01/2022-13469/one-time-informational-reports-on-extreme-weather-vulnerability-assessments-climate-change-extreme "One-Time Informational Reports on Extreme Weather Vulnerability Assessments; Cli"

### Susquehanna International Group (1)

- [dead] `src_011310` https://www.federalregister.gov/documents/search?conditions%5Bterm%5D=%22Susquehanna%20International%20Group%22 "Source: Federal Register"

### iHeartMedia (1)

- [dead] `src_011452` https://www.fcc.gov/media/radio/radio-station-ownership "FCC: Radio station ownership data"

### Telecom Industry (1)

- [dead] `src_011507` https://www.fcc.gov/auction "FCC: Spectrum auction records"

### IBEW - International Brotherhood of Electrical Workers (1)

- [dead] `src_011688` https://www.federalregister.gov/documents/search?conditions%5Bterm%5D=%22IBEW%20-%20International%20Brotherhood%20of%20Electrical%20Workers%22 "Source: Federal Register"

### National Nurses United (1)

- [dead] `src_011718` https://www.federalregister.gov/documents/search?conditions%5Bterm%5D=%22National%20Nurses%20United%22 "Source: Federal Register"

### Flex Association (1)

- [dead] `src_012216` https://www.federalregister.gov/documents/search?conditions%5Bterm%5D=%22Flex%20Association%22 "Source: Federal Register"

### Consumer Energy Alliance (1)

- [dead] `src_012496` https://www.federalregister.gov/documents/2024/12/26/2024-30369/energy-conservation-program-energy-conservation-standards-for-consumer-gas-fired-instantaneous-water "Energy Conservation Program: Energy Conservation Standards for Consumer Gas-fire"

### Occidental Petroleum (1)

- [dead] `src_012807` https://www.federalregister.gov/documents/2025/03/31/2025-05498/petition-of-encap-investments-lp-et-al-to-reopen-and-modify-order "Petition of EnCap Investments L.P., et al., To Reopen and Modify Order"

### Student Loan Servicer Industry (1)

- [dead] `src_012998` https://studentaid.gov/manage-loans/repayment/servicers "Federal Student Aid: Loan servicer information"

### ActBlue (1)

- [dead] `src_013466` https://www.federalregister.gov/documents/search?conditions%5Bterm%5D=%22ActBlue%22 "Source: Federal Register"

### America Votes (1)

- [dead] `src_013563` https://www.federalregister.gov/documents/search?conditions%5Bterm%5D=%22America%20Votes%22 "Source: Federal Register"

### CREW - Citizens for Responsibility and Ethics in Washington (1)

- [dead] `src_013753` https://www.npr.org/2025/04/29/nx-s1-5380783/trump-doge-lawsuit-federal-workers-cities "NPR: New lawsuit takes aim at Trump and DOGE's government overhaul"

### Fox News Pipeline to Power (1)

- [dead] `src_013879` https://www.fcc.gov/document/fox-television-stations-inc-16 "FCC: Fox Television Stations, Inc. License Records"

### LARA Fund - Mauricio Claver-Carone (1)

- [dead] `src_013980` https://larafund.com/about-us/ "This Page Does Not Exist"

### The SCOTUS Capture - From Bork to Barrett (1)

- [generic_orphan] `src_001313` https://www.supremecourt.gov/search.aspx?Search=The%20SCOTUS%20Capture%20-%20From%20Bork%20to%20Barrett "Search - Supreme Court of the United States"

### 666 Fifth Avenue and Financial Desperation (1)

- [generic_orphan] `src_002969` https://democrats.house.gov/?q=666%20Fifth%20Avenue%20and%20Financial%20Desperation "Home | House Democrats"

### The Finance Committee and Tax Industry Alignment (1)

- [generic_orphan] `src_003335` https://www.finance.senate.gov/ "Home | The United States Senate Committee on Finance"

### Brian Mast (1)

- [generic_orphan] `src_004557` https://www.opensanctions.org/search/?q=Brian%20Mast "Search - OpenSanctions"

### Katie Porter Master Profile (1)

- [generic_orphan] `src_004809` https://www.opensanctions.org/search/?q=Katie%20Porter "Search - OpenSanctions"

### John Hickenlooper (1)

- [generic_orphan] `src_005334` https://www.opensanctions.org/search/?q=John%20Hickenlooper "Search - OpenSanctions"

### Jim McGovern (1)

- [generic_orphan] `src_006091` https://www.opensanctions.org/search/?q=Jim%20McGovern "Search - OpenSanctions"

### Hakeem Jeffries Master Profile (1)

- [generic_orphan] `src_006203` https://www.opensanctions.org/search/?q=Hakeem%20Jeffries "Search - OpenSanctions"

### The Endorsement Economy - Courage to Change PAC (1)

- [generic_orphan] `src_006374` https://www.cityandstateny.com/ "Home | City &amp; State New York"

### Alexandria Ocasio-Cortez Master Profile (1)

- [generic_orphan] `src_006404` https://www.opensanctions.org/search/?q=Alexandria%20Ocasio-Cortez "Search - OpenSanctions"

### Homelessness Spending and Encampments (1)

- [generic_orphan] `src_006632` https://www.supremecourt.gov/search.aspx?Search=Homelessness%20Spending%20and%20Encampments "Search - Supreme Court of the United States"

### Supply-Side Framework - Who It Helps (1)

- [generic_orphan] `src_006649` https://ternercenter.berkeley.edu/ "Home - Terner Center"

### Sherrod Brown (1)

- [generic_orphan] `src_006849` https://www.opensanctions.org/search/?q=Sherrod%20Brown "Search - OpenSanctions"

### Andrew Cuomo (1)

- [generic_orphan] `src_006869` https://www.opensanctions.org/search/?q=Andrew%20Cuomo "Search - OpenSanctions"

### David Pakman (1)

- [generic_orphan] `src_007440` https://davidpakman.com/ "Home - David Pakman"

### Max Blumenthal (1)

- [generic_orphan] `src_007567` https://www.isdglobal.org/ "Home - Institute for Strategic Dialogue"

### California Nurses Association (1)

- [generic_orphan] `src_011660` https://www.nationalnursesunited.org/ "Home | National Nurses United"

### Alliance Defending Freedom (1)

- [generic_orphan] `src_013527` https://www.supremecourt.gov/search.aspx?Search=Alliance%20Defending%20Freedom "Search - Supreme Court of the United States"

### Hoover Institution (1)

- [needs_review] `src_000838` https://www.philanthropyroundtable.org/almanac/hoover-institution/ "Just a moment..."

### State Policy Network (1)

- [needs_review] `src_000961` https://www.nhtsa.gov/recalls?manufacturer=State%20Policy%20Network "Access Denied"

### RAND Corporation (1)

- [needs_review] `src_001135` https://www.opensecrets.org/orgs/rand-corp/summary?id=D000036957 "Just a moment..."

### The Defense Spending Bipartisan Consensus (1)

- [needs_review] `src_001293` https://comptroller.defense.gov/ODCFO/audit.aspx "Access Denied"

### The Farm Bill - The Bipartisan Subsidy Machine (1)

- [needs_review] `src_001297` https://www.congress.gov/crs-product/RS22131 "Just a moment..."

### Voting Record Layer - When Donors Vote Through Their Politicians (1)

- [needs_review] `src_001325` https://www.opensecrets.org/news/2017/03/vote-correlation-internet-privacy-res/ "Just a moment..."

### Foreign Money in State Ballot Initiatives (1)

- [needs_review] `src_001364` https://campaignlegal.org/?q=Foreign%20Money%20in%20State%20Ballot%20Initiatives "Just a moment..."

### Payday Lending Regulatory Capture (1)

- [needs_review] `src_001379` https://www.opensecrets.org/news/2022/02/members-of-congress-overseeing-payday-lending-have-taken-over-3-4-million-from-the-industry/ "Just a moment..."

### The Nuestra América Convoy — How the Donor Class Attacked a Humanitarian Mission (1)

- [needs_review] `src_001403` https://www.opensecrets.org/orgs/us-cuba-democracy-pac/summary?id=D000022302 "Just a moment..."

### The Revolving Door Explosion of 2025 (1)

- [needs_review] `src_001424` https://www.opensecrets.org/revolving-door/ "Just a moment..."

### Kenneth Griffin Hedges the Republican Primary (1)

- [needs_review] `src_001598` https://www.opensecrets.org/news/2022/03/florida-gov-ron-desantis-breaks-funding-record-in-2021-citadel-ceo-contributes-millions/ "Just a moment..."

### AIPAC Buys Progressive Cover for Bipartisan Israel Policy (1)

- [needs_review] `src_001733` https://factually.co/fact-checks/politics/largest-aipac-udp-donations-congressional-candidates-2024-by-state-c64777 "Just a moment..."

### Water Privatization: Both Parties Sell Public Infrastructure to Donors (1)

- [needs_review] `src_001866` https://www.opensecrets.org/political-action-committees-pacs/american-water-works-co/C00377846/candidate-recipients/2024 "Just a moment..."

### 2028 Presidential Landscape (1)

- [needs_review] `src_001891` https://www.theblock.co/post/362685/crypto-focused-pac-fairshake-amasses-141-million-war-chest-ahead-of-2026-elections "Attention Required! | Cloudflare"

### Georgia 2026 Senate Race (1)

- [needs_review] `src_001933` https://beincrypto.com/crypto-lobby-and-aipac-targets-georgia-senate/ "Just a moment..."

### Nebraska 2026 Senate Race (1)

- [needs_review] `src_001973` https://nebraskaexaminer.com/2025/10/02/dan-osborn-raises-more-than-1-million-for-second-nebraska-u-s-senate-race-against-ricketts/ "Just a moment..."

### North Carolina 2026 Senate Race (1)

- [needs_review] `src_001987` https://ncnewsline.com/2026/02/02/cooper-reports-sizable-lead-in-fundraising-for-2026-u-s-senate-race/ "Just a moment..."

### 2026-03-25 Finance Research (1)

- [needs_review] `src_002100` https://www.opensecrets.org/news/2026/01/lobbying-firms-took-in-a-record-5-billion-in-2025/ "Just a moment..."

### 2026-03-22 Finance Research (1)

- [needs_review] `src_002175` https://www.opensecrets.org/news/category/campaign-finance/ "Just a moment..."

### 2026-03-25 Story Discovery Run 2 (1)

- [needs_review] `src_002381` https://www.congress.gov/crs-product/IN12551 "Just a moment..."

### 2026-03-25 Story Discovery Run 3 (1)

- [needs_review] `src_002387` https://www.opensecrets.org/news/2026/01/trump-ballroom-donors-poised-to-benefit-from-ai-plan-they-helped-shape/ "Just a moment..."

### 2026-03-25 Story Discovery (1)

- [needs_review] `src_002399` https://www.cryptopolitan.com/crypto-exchanges-pour-21m-into-pac/ "Just a moment..."

### 2026-03-26 Story Discovery Run 3 (1)

- [needs_review] `src_002423` https://tennesseelookout.com/2026/03/19/cvs-blankets-tennessee-airwaves-enlists-mass-texts-to-fight-pharmacy-benefit-manager-bill/ "Just a moment..."

### 2026-03-26 Story Discovery Run 5 (1)

- [needs_review] `src_002443` https://www.congress.gov/bill/119th-congress/house-bill/2498/all-info "Just a moment..."

### 2026-03-27 Story Discovery Run 3 (1)

- [needs_review] `src_002498` https://www.opensecrets.org/news/2026/03/some-major-trump-donors-are-now-reaping-billions-in-ice-contracts "Just a moment..."

### 2026-03-31 Story Discovery (1)

- [needs_review] `src_002532` https://www.axios.com/2026/02/23/ai-defense-department-deal-musk-xai-grok "Just a moment..."

### 2026-04-01 Story Discovery (1)

- [needs_review] `src_002545` https://www.axios.com/2026/02/27/ai-influence-power-players "Just a moment..."

### Shelby County and the Donor-Class Voter Suppression Strategy (1)

- [needs_review] `src_002609` https://constitutioncenter.org/the-constitution/supreme-court-case-library/shelby-county-v-holder "403 Forbidden"

### Clarence Thomas Master Profile (1)

- [needs_review] `src_002643` https://www.opensecrets.org/news/ "Just a moment..."

### Brett Kavanaugh Master Profile (1)

- [needs_review] `src_002655` https://www.opensecrets.org/news/2017/11/web-of-secret-money-hides-one-mega-donor-funding-conservative-court/ "Just a moment..."

### People of Praise and the Federalist Society as Parallel Selection Pipelines (1)

- [needs_review] `src_002658` https://fedsoc.org/justices/amy-coney-barrett "Just a moment..."

### America First Legal and the Dark Money Architecture (1)

- [needs_review] `src_002743` https://www.opensecrets.org/members-of-congress/summary?name=America%20First%20Legal%20and%20the%20Dark%20Money%20Architecture "Just a moment..."

### Wall Street Deregulation and the 3-3-3 Agenda (1)

- [needs_review] `src_002774` https://www.americanprogress.org/article/scott-bessents-3-percent-deficit-target-would-require-massive-cuts-to-anti-poverty-programs-and-middle-class-tax-increases/ "Just a moment..."

### Russell Vought Master Profile (1)

- [needs_review] `src_002793` https://www.congress.gov/search?q=Search&searchResultViewType=expanded "Just a moment..."

### The Koch Network and Concerned Veterans for America (1)

- [needs_review] `src_002806` https://www.opensecrets.org/members-of-congress/summary?name=Koch%20Network%20and%20Concerned%20Veterans%20for%20America "Just a moment..."

### Mike Waltz (1)

- [needs_review] `src_002842` https://www.opensecrets.org/news/2025/03/trump-administration-profile-mike-waltz "Just a moment..."

### The Koch Pipeline - From Kansas to Foggy Bottom to the Boardroom (1)

- [needs_review] `src_002848` https://qz.com/1227882/secretary-of-state-nominee-mike-pompeo-owes-his-political-career-to-the-koch-brothers "Attention Required! | Cloudflare"

### The Secretary of State and Sugar-Defense-Israel Donor Triangle (1)

- [needs_review] `src_002897` https://www.congress.gov/member/marco-rubio/R000595 "Just a moment..."

### The 50 Million Dollar Pipeline from WWE to the Cabinet (1)

- [needs_review] `src_002908` https://www.opensecrets.org/members-of-congress/summary?name=50%20Million%20Dollar%20Pipeline%20from%20WWE%20to%20the%20Cabinet "Just a moment..."

### WWE Labor Exploitation and the Donor Class Anti-Worker Model (1)

- [needs_review] `src_002910` https://qz.com/work/1584785/john-oliver-explains-the-wwes-glaring-workers-rights-problem "Attention Required! | Cloudflare"

### The Fossil Fuel Op-Ed Pipeline and the Donor-to-Deregulation Map (1)

- [needs_review] `src_002923` https://www.opensecrets.org/members-of-congress/summary?name=Fossil%20Fuel%20Op-Ed%20Pipeline%20and%20the%20Donor-to-Deregulation%20Map "Just a moment..."

### The Defense Contractor Revolving Door and the Consulting Pipeline (1)

- [needs_review] `src_002956` https://www.opensecrets.org/members-of-congress/summary?name=Defense%20Contractor%20Revolving%20Door%20and%20the%20Consulting%20Pipeline "Just a moment..."

### The Transition Pipeline and the 21 Million Dollar Buy-In (1)

- [needs_review] `src_002989` https://www.opensecrets.org/members-of-congress/summary?name=Transition%20Pipeline%20and%20the%2021%20Million%20Dollar%20Buy-In "Just a moment..."

### Howard Lutnick Master Profile (1)

- [needs_review] `src_002991` https://www.opensecrets.org/news/2025/03/trump-administration-profile-howard-lutnick/ "Just a moment..."

### The 20 Dollar Gift Card Campaign and the Self-Funding Architecture (1)

- [needs_review] `src_003014` https://www.opensecrets.org/members-of-congress/summary?name=20%20Dollar%20Gift%20Card%20Campaign%20and%20the%20Self-Funding%20Architecture "Just a moment..."

### Doug Burgum Master Profile (1)

- [needs_review] `src_003019` https://www.opensecrets.org/2024-presidential-race?id=N00052955 "Just a moment..."

### The 445 Million Dollar Oil Investment and Wrights Buy-In (1)

- [needs_review] `src_003051` https://www.opensecrets.org/members-of-congress/summary?name=445%20Million%20Dollar%20Oil%20Investment%20and%20Wrights%20Buy-In "Just a moment..."

### Bill Pulte (1)

- [needs_review] `src_003067` https://www.axios.com/2025/12/04/pulte-trump-gao-probe-mortgage-fraud "Just a moment..."

### Bill Hagerty (1)

- [needs_review] `src_003098` https://tennesseelookout.com/2020/05/08/tenn-senate-campaign-lures-cash-from-gop-politicos-megadonors/ "Just a moment..."

### The Intellectual Property and Banking Donor Pipeline (1)

- [needs_review] `src_003158` https://www.opensecrets.org/news/2023/01/wall-street-ally-sen-thom-tillis-tapped-to-join-gop-leadership/ "Just a moment..."

### Goldman Sachs and the Heidi Cruz Connection (1)

- [needs_review] `src_003182` https://www.opensecrets.org/personal-finances/ted-cruz/net-worth?cid=N00033085 "Just a moment..."

### The Kavanaugh Vote and the Donor Realignment (1)

- [needs_review] `src_003204` https://www.opensecrets.org/news/2019/06/big-bucks-to-maine-susan-collins-reelect2020/ "Just a moment..."

### Ron Johnson (1)

- [needs_review] `src_003228` https://www.congress.gov/member/ron-johnson/J000293/committees "Just a moment..."

### The Self-Funded Billionaire Model and Florida Inc (1)

- [needs_review] `src_003280` https://floridaphoenix.com/2024/09/12/rick-scotts-super-pac-funded-in-part-by-big-sugar-interests/ "Just a moment..."

### Ukraine Aid Obstruction and the Isolationist Donor Network (1)

- [needs_review] `src_003300` https://www.opensecrets.org/members-of-congress/summary?cid=N00030836 "Just a moment..."

### Mitch McConnell Master Profile (1)

- [needs_review] `src_003320` https://kentuckylantern.com/2024/10/24/mcconnells-fundraising-total-the-lowest-in-years/ "Just a moment..."

### Mike Lee (1)

- [needs_review] `src_003332` https://fedsoc.org/bio/mike-lee "Just a moment..."

### Michael Whatley Oil and Gas Lobbying History (1)

- [needs_review] `src_003364` https://www.opensecrets.org/revolving-door/whatley-michael-d/summary?id=71168 "Just a moment..."

### Dark Money and the 2018 Missouri Machine (1)

- [needs_review] `src_003426` https://www.opensecrets.org/races/outside-spending?cycle=2018&id=MOS2 "Just a moment..."

### January 6 Fist Pump and the Donor Paradox (1)

- [needs_review] `src_003430` https://www.opensecrets.org/news/2021/01/corporate-pac-contibutions-paused-to-josh-hawley-and-others/ "Just a moment..."

### Ernst Campaign Finance Research - Verified Dates and Amounts (1)

- [needs_review] `src_003458` https://www.opensecrets.org/news/2020/10/ernst-outraised-by-greenfield-1020/ "Just a moment..."

### The Folksy Populist Brand and Petrochemical Reality (1)

- [needs_review] `src_003510` https://www.congress.gov/member/john-kennedy/K000393 "Just a moment..."

### John Hoeven (1)

- [needs_review] `src_003531` https://www.opensecrets.org/personal-finances/john-hoeven/net-worth?cid=N00031688 "Just a moment..."

### The Agriculture-Appropriations Pipeline and Arkansas Defense (1)

- [needs_review] `src_003545` https://www.congress.gov/member/john-boozman/B001236 "Just a moment..."

### John Boozman (1)

- [needs_review] `src_003550` https://arkansasadvocate.com/2025/01/16/new-senate-agriculture-committee-leadership-has-extensive-ties-to-industry-heavyweights/ "Just a moment..."

### Jim Risch (1)

- [needs_review] `src_003575` https://idahocapitalsun.com/2025/05/01/why-has-idahos-u-s-sen-jim-risch-suddenly-gone-silent-on-supporting-nato-and-ukraine/ "Just a moment..."

### Jim Inhofe (1)

- [needs_review] `src_003581` https://www.opensecrets.org/members-of-congress/summary?cid=N00005582 "Just a moment..."

### Deb Fischer (1)

- [needs_review] `src_003618` https://www.opensecrets.org/members-of-congress/summary?cid=N00033443 "Just a moment..."

### Tariff Wars - The Working Class Tax Disguised as Trade Policy (1)

- [needs_review] `src_003769` https://www.usitc.gov/publications/332/pub4889.pdf "Access Denied"

### Trade and Tariffs - Donors and Backers (1)

- [needs_review] `src_003771` https://www.opensecrets.org/members-of-congress/summary?name=Trade%20and%20Tariffs "Just a moment..."

### Social Policy and Culture War - Donors and Backers (1)

- [needs_review] `src_003799` https://www.opensecrets.org/orgs/concerned-women-for-america/summary?id=D000025077 "Just a moment..."

### Three Justices in Four Years - The Leonard Leo Investment and Its Returns (1)

- [needs_review] `src_003853` https://www.courthousenews.com/trump-flips-another-circuit-to-majority-gop-appointees/ "Attention Required! | Cloudflare"

### January 6th and Election Denial - Donors and Backers (1)

- [needs_review] `src_003860` https://www.opensecrets.org/news/2023/09/billionaire-megadonor-couple-funding-election-denial-with-extensive-influence-machine-dark-money-network-uihlein/ "Just a moment..."

### The Insurrection Investment - Who Funded January 6th and What They Got (1)

- [needs_review] `src_003869` https://www.opensecrets.org/members-of-congress/summary?name=Insurrection%20Investment "Just a moment..."

### The Adelson Pipeline - Embassy, Abraham Accords, and Iran (1)

- [needs_review] `src_003877` https://www.opensecrets.org/donor-lookup/ "Just a moment..."

### Guns - Donors and Backers (1)

- [needs_review] `src_003962` https://www.opensecrets.org/members-of-congress/summary?name=Guns "Just a moment..."

### The NRA Investment and the Second Amendment Theater (1)

- [needs_review] `src_003963` https://www.opensecrets.org/orgs/national-rifle-assn/totals?id=D000000082 "Just a moment..."

### Environment - Donors and Backers (1)

- [needs_review] `src_003991` https://www.opensecrets.org/members-of-congress/summary?name=Environment "Just a moment..."

### Crypto and Tech - Donors and Backers (1)

- [needs_review] `src_004055` https://www.opensecrets.org/members-of-congress/summary?name=Crypto%20and%20Tech "Just a moment..."

### Criminal Justice and DOJ - Donors and Backers (1)

- [needs_review] `src_004060` https://www.opensecrets.org/members-of-congress/summary?name=Criminal%20Justice%20and%20DOJ "Just a moment..."

### Brett Guthrie Master Profile (1)

- [needs_review] `src_004086` https://www.opensecrets.org/orgs/pharmaceuticals-health-products/summary?id=D000000149 "Just a moment..."

### Sam Graves (1)

- [needs_review] `src_004203` https://www.opensecrets.org/personal-finances/sam-graves/net-worth?cid=N00013323 "Just a moment..."

### Roger Williams (1)

- [needs_review] `src_004214` https://www.opensecrets.org/personal-finances/roger-williams/net-worth?cid=N00030602 "Just a moment..."

### Rick Crawford (1)

- [needs_review] `src_004230` https://www.opensecrets.org/members-of-congress/summary?cid=N00030770 "Just a moment..."

### Patrick McHenry Master Profile (1)

- [needs_review] `src_004256` https://www.opensecrets.org/members-of-congress/summary?cid=N00026354 "Just a moment..."

### The Veterans Affairs Committee and Southern Illinois Defense (1)

- [needs_review] `src_004300` https://www.congress.gov/member/mike-bost/B001295 "Just a moment..."

### Matt Gaetz Master Profile (1)

- [needs_review] `src_004325` https://www.opensecrets.org/members-of-congress/summary?cid=N00027894 "Just a moment..."

### Glenn Thompson (1)

- [needs_review] `src_004470` https://penncapital-star.com/agriculture-pa-farms/qa-congressman-glenn-thompson-talks-tariffs-snap-and-immigrations-impact-on-agriculture/ "Just a moment..."

### The FEC to Congress Pipeline and Election Law (1)

- [needs_review] `src_004519` https://www.congress.gov/member/bryan-steil/S001213 "Just a moment..."

### Bryan Steil (1)

- [needs_review] `src_004528` https://www.washingtontimes.com/news/2026/feb/24/bryan-steil-wants-dramatic-election-overhaul-partys-popular-voter-id/ "Just a moment..."

### Bruce Westerman (1)

- [needs_review] `src_004538` https://stateline.org/2026/03/09/republicans-target-public-lands-protections-in-a-new-way/ "Just a moment..."

### The LEARNS Act and the Education Privatization Donor Network (1)

- [needs_review] `src_004586` https://arkansasadvocate.com/2024/04/02/arkansas-governor-marks-start-of-year-two-for-voucher-applications/ "Just a moment..."

### Greg Abbott Master Profile (1)

- [needs_review] `src_004671` https://www.opensecrets.org/officeholders/greg-abbott/summary?cycle=2022&id=11281947 "Just a moment..."

### Glenn Youngkin Master Profile (1)

- [needs_review] `src_004690` https://www.congress.gov/search?q=G&searchResultViewType=expanded "Just a moment..."

### The Ohio Governor Race and the Billionaire Super PAC (1)

- [needs_review] `src_004722` https://www.opensecrets.org/members-of-congress/summary?name=Ohio%20Governor%20Race%20and%20the%20Billionaire%20Super%20PAC "Just a moment..."

### The HHS Record and the Healthcare Industry Question (1)

- [needs_review] `src_004748` https://www.fiercepharma.com/pharma/biden-to-tap-california-attorney-general-xavier-becerra-who-have-fought-pharmas-for-top-hhs "Just a moment..."

### NextGen America and the Climate-to-Politics Pipeline (1)

- [needs_review] `src_004766` https://www.opensecrets.org/donor-lookup/results?name=tom+steyer&order=desc&sort=D "Just a moment..."

### The Thiel-Adjacent Tech Pipeline (1)

- [needs_review] `src_004788` https://www.opensecrets.org/donor-lookup/results?name=joe+lonsdale&order=desc&sort=D "Just a moment..."

### Matt Mahan Master Profile (1)

- [needs_review] `src_004790` https://www.opensecrets.org/members-of-congress/summary?displayname=Matt%20Mahan "Just a moment..."

### The Whiteboard Brand and the Corporate Accountability Record (1)

- [needs_review] `src_004803` https://www.opensecrets.org/political-action-committees-pacs/truth-to-power/C00747766/summary/2020 "Just a moment..."

### The Whiteboard Populism and Legislative Limits (1)

- [needs_review] `src_004804` https://www.congress.gov/member/katie-porter/P000618 "Just a moment..."

### The Controller Record and the Fiscal Accountability Question (1)

- [needs_review] `src_004900` https://www.nakedcapitalism.com/2016/02/calpers-calstrs-board-member-betty-yee-asks-the-sec-to-rescue-public-pension-funds-from-themselves.html "Attention Required! | Cloudflare"

### Antonio Villaraigosa Master Profile (1)

- [needs_review] `src_004909` https://www.congress.gov/search?q=Villaraigosa&searchResultViewType=expanded "Just a moment..."

### Volodymyr Zelenskyy (1)

- [needs_review] `src_004929` https://www.president.gov.ua/en/news/prezident-ukrayini-zustrivsya-z-kerivnikami-oboronnih-kompan-87685 "Access Denied"

### Chris Christie (1)

- [needs_review] `src_004938` https://www.opensecrets.org/2024-presidential-race?id=N00037008 "Just a moment..."

### Medicare for All - The Policy That Broke the Party (1)

- [needs_review] `src_004947` https://www.opensecrets.org/members-of-congress/summary?name=Medicare%20for%20All "Just a moment..."

### The Anti-Donor Model - Two Presidential Campaigns (1)

- [needs_review] `src_004949` https://www.opensecrets.org/pres16/candidate?id=n00000528 "Just a moment..."

### Enersystems and the Personal Coal Fortune (1)

- [needs_review] `src_004972` https://www.opensecrets.org/news/2021/10/joe-manchins-net-worth-spurs-questions-energy-policy-position/ "Just a moment..."

### The Bresch-EpiPen Scandal and Family Enrichment (1)

- [needs_review] `src_004994` https://www.opensecrets.org/news/2021/09/manchin-large-campaign-contributions-epipen-scandal/ "Just a moment..."

### Joe Manchin Master Profile (1)

- [needs_review] `src_004995` https://www.opensecrets.org/members-of-congress/summary?displayname=Joe%20Manchin "Just a moment..."

### Catherine Cortez Masto (1)

- [needs_review] `src_005065` https://nevadacurrent.com/2020/09/08/battle-for-senate-control-pits-cortez-masto-against-sands-station/ "Just a moment..."

### Mark Kelly (1)

- [needs_review] `src_005082` https://www.opensecrets.org/news/2023/03/armed-services-committee-members-received-5-8-million-from-defense-sector-during-2022-election-cycle "Just a moment..."

### Tammy Baldwin Master Profile (1)

- [needs_review] `src_005126` https://www.opensecrets.org/races/summary?cycle=2024&id=WIS1&special=N "Just a moment..."

### The Finance Committee and Tech Privacy Advocacy (1)

- [needs_review] `src_005184` https://www.congress.gov/bill/104th-congress/senate-bill/652 "Just a moment..."

### Ron Wyden (1)

- [needs_review] `src_005194` https://taxpolicycenter.org/taxvox/wydens-billionaire-income-tax-ambitious-problematic "Attention Required! | Cloudflare"

### The Appropriations Vice Chair and Defense-Healthcare Axis (1)

- [needs_review] `src_005223` https://www.congress.gov/member/patty-murray/M001111 "Just a moment..."

### The Venture Capital Senator - Tech Wealth in the Senate (1)

- [needs_review] `src_005247` https://www.congress.gov/bill/118th-congress/senate-bill/686 "Just a moment..."

### The Commerce Committee and Big Tech Jurisdiction (1)

- [needs_review] `src_005257` https://www.congress.gov/member/maria-cantwell/C000127 "Just a moment..."

### Maria Cantwell (1)

- [needs_review] `src_005260` https://www.opensecrets.org/personal-finances/maria-cantwell/net-worth?cid=N00007836 "Just a moment..."

### The $30 Million Special Election and the National Donor Flood (1)

- [needs_review] `src_005308` https://www.opensecrets.org/races/summary?cycle=2017&id=GA06&spec=N "Just a moment..."

### Jon Ossoff Master Profile (1)

- [needs_review] `src_005317` https://georgiarecorder.com/2026/02/03/ossoffs-dominance-in-the-u-s-senate-money-race-continues/ "Just a moment..."

### The Housing Progressive and Wall Street Tension (1)

- [needs_review] `src_005348` https://www.congress.gov/member/jeff-merkley/M001176 "Just a moment..."

### The Progressive Outsider and Housing Finance (1)

- [needs_review] `src_005352` https://www.congress.gov/crs-product/IF10923 "Just a moment..."

### Gary Peters Master Profile (1)

- [needs_review] `src_005418` https://www.dscc.org/article/following-historic-victories-sen-gary-peters-to-return-as-dscc-chair-for-2024-cycle/ "Attention Required! | Cloudflare"

### The 2020 Campaign and the Donor Class Consolidation (1)

- [needs_review] `src_005426` https://www.opensecrets.org/2020-presidential-race?id=N00033492 "Just a moment..."

### The CFPB and the Limits of Reform Within the System (1)

- [needs_review] `src_005435` https://www.opensecrets.org/members-of-congress/summary?cid=N00009497&cycle=Career "Just a moment..."

### Cory Booker (1)

- [needs_review] `src_005510` https://thehill.com/policy/healthcare/340303-cory-booker-to-pause-fundraising-from-pharma-companies/ "Access to this page has been denied"

### AIPAC and the Israel Donor Network (1)

- [needs_review] `src_005518` https://factually.co/fact-checks/politics/aipac-pac-contributions-chuck-schumer-by-year-7106d4 "Just a moment..."

### The Wall Street-Schumer Funding Axis (1)

- [needs_review] `src_005525` https://www.opensecrets.org/news/2010/04/goldman-sachs-congressional-inquisi.html "Just a moment..."

### Chris Murphy Master Profile (1)

- [needs_review] `src_005542` https://www.opensecrets.org/members-of-congress/contributors?cid=N00027566&cycle=CAREER "Just a moment..."

### Chris Coons Master Profile (1)

- [needs_review] `src_005552` https://www.opensecrets.org/news/2020/09/chris-coons-2020-progressive-challenger/ "Just a moment..."

### The Climate and Commerce Committee Jurisdiction (1)

- [needs_review] `src_005562` https://www.congress.gov/member/brian-schatz/S001194 "Just a moment..."

### The Antitrust Crusade and Legislative Stalling (1)

- [needs_review] `src_005586` https://www.opensecrets.org/news/2023/10/google-ramped-up-federal-lobbying-ahead-of-doj-antitrust-showdown/ "Just a moment..."

### The Pharmaceutical Deal and the IRA - Ten Drugs Out of Twelve Thousand (1)

- [needs_review] `src_005641` https://www.opensecrets.org/2020-presidential-race?id=N00001669 "Just a moment..."

### Barack Obama Master Profile (1)

- [needs_review] `src_005744` https://medium.com/@OpenSecretsDC/obama-tied-operatives-and-biden-supporters-launch-60-million-dark-money-group-a21197faf3cf "Just a moment..."

### Ritchie Torres (1)

- [needs_review] `src_005798` https://www.census.gov/quickfacts/fact/table/bronxcountynewyork/PST045223 "Attention Required! | Cloudflare"

### Josh Gottheimer Master Profile (1)

- [needs_review] `src_005802` https://www.opensecrets.org/orgs/palantir-technologies/summary?id=D000055177 "Just a moment..."

### Saikat Chakrabarti Master Profile (1)

- [needs_review] `src_005849` https://www.politico.com/news/magazine/2025/10/30/saikat-chakrabarti-nancy-pelosi-democratic-party-00624012 "Just a moment..."

### Rosa DeLauro (1)

- [needs_review] `src_005861` https://www.opensecrets.org/personal-finances/rosa-delauro/net-worth?cid=N00000615 "Just a moment..."

### The Silicon Valley Progressive and Tech Industry Alignment (1)

- [needs_review] `src_005870` https://www.congress.gov/member/ro-khanna/K000389 "Just a moment..."

### The Transportation Committee and Boeing Washington (1)

- [needs_review] `src_005887` https://www.congress.gov/member/rick-larsen/L000560 "Just a moment..."

### The Ways and Means Gavel and Corporate Tax Architecture (1)

- [needs_review] `src_005903` https://www.opensecrets.org/cong-cmtes/industries?cmte=HWYS&congno=118&cycle=2024 "Just a moment..."

### Richard Neal Master Profile (1)

- [needs_review] `src_005905` https://www.opensecrets.org/members-of-congress/summary?cid=N00007222 "Just a moment..."

### Raul Grijalva (1)

- [needs_review] `src_005916` https://environmentamerica.org/articles/environment-america-action-fund-endorses-re-election-of-u-s-rep-raul-grijalva-in-az-07/ "Attention Required! | Cloudflare"

### The Oversight Committee and Environmental Justice in Detroit (1)

- [needs_review] `src_005922` https://www.michigan.gov/egle "Access Denied"

### The Progressive Caucus and the Squad's Institutional Wing (1)

- [needs_review] `src_005956` https://www.congress.gov/bill/118th-congress/house-bill/3421/cosponsors "Just a moment..."

### Pramila Jayapal (1)

- [needs_review] `src_005958` https://www.congress.gov/member/pramila-jayapal/J000298 "Just a moment..."

### The Biden Exit and Harris Installation (1)

- [needs_review] `src_005997` https://www.opensecrets.org/news/2024/07/kamala-harris-drives-record-fundraising-after-biden-exit/ "Just a moment..."

### The House Administration Committee and Election Infrastructure (1)

- [needs_review] `src_006056` https://www.congress.gov/member/joseph-morelle/M001206 "Just a moment..."

### Joseph Morelle Master Profile (1)

- [needs_review] `src_006059` https://www.opensecrets.org/members-of-congress/summary?cid=N00043207 "Just a moment..."

### Jerry Nadler (1)

- [needs_review] `src_006107` https://www.opensecrets.org/members-of-congress/contributors?cid=N00000939&cycle=CAREER "Just a moment..."

### Ilhan Omar Master Profile (1)

- [needs_review] `src_006169` https://minnesotareformer.com/2024/07/16/samuels-undeterred-by-omars-massive-cash-advantage-in-minnesota-congressional-race/ "Just a moment..."

### Henry Cuellar Master Profile (1)

- [needs_review] `src_006187` https://www.opensecrets.org/members-of-congress/summary?cid=N00000840 "Just a moment..."

### The Corporate Democrat Leadership Model - From Pelosi to Jeffries (1)

- [needs_review] `src_006192` https://www.opensecrets.org/news/2023/08/party-aligned-groups-funnel-millions-in-dark-money-to-closely-tied-super-pacs-ahead-of-2024-election/ "Just a moment..."

### The Real Estate Money and Brooklyn's Gentrification Politics (1)

- [needs_review] `src_006197` https://www.opensecrets.org/personal-finances/hakeem-jeffries/net-worth?cid=N00033640 "Just a moment..."

### The Foreign Affairs Committee and Wall Street-Queens Axis (1)

- [needs_review] `src_006211` https://www.congress.gov/member/gregory-meeks/M001137 "Just a moment..."

### Frank Pallone (1)

- [needs_review] `src_006252` https://www.fiercepharma.com/pharma/top-3-house-democrat-leaders-have-pocketed-millions-from-pharma "Just a moment..."

### The Narrative Factory and Its Cracks (1)

- [needs_review] `src_006427` https://marylandmatters.org/briefs/moore-finally-gets-his-bronze-star-years-after-his-service-in-afghanistan/ "Just a moment..."

### The Corporate-Democratic Donor Coalition and AIPAC Connection (1)

- [needs_review] `src_006462` https://www.opensecrets.org/officeholders/josh-shapiro/summary?cycle=2023&id=6454796 "Just a moment..."

### Josh Green Master Profile (1)

- [needs_review] `src_006474` https://www.opensecrets.org/members-of-congress/ "Just a moment..."

### The 2028 Positioning and the Donor-Class Audition (1)

- [needs_review] `src_006502` https://www.axios.com/2025/11/24/whitmer-retreat-campaign-president-2028 "Just a moment..."

### The Auto Industry Alliance and EV Manufacturing Subsidies (1)

- [needs_review] `src_006518` https://www.americanprogress.org/article/gm-ev-and-battery-investment-in-michigan/ "Just a moment..."

### Gavin Newsom Master Profile (1)

- [needs_review] `src_006534` https://www.opensecrets.org/officeholders/gavin-newsom/summary?cycle=2021&id=312332 "Just a moment..."

### Trump Resistance and the 2028 Play (1)

- [needs_review] `src_006617` https://www.migrationpolicy.org/article/biden-deportation-record "Attention Required! | Cloudflare"

### Housing - Donors and Backers (1)

- [needs_review] `src_006635` https://www.opensecrets.org/political-action-committees-pacs/C00836353/donors/2024 "Just a moment..."

### Corporate Subsidies and the Business Climate Argument (1)

- [needs_review] `src_006734` https://goodjobsfirst.org/?s=Corporate%20Subsidies%20and%20the%20Business%20Climate%20Argument "Just a moment..."

### Economic Policy - Donors and Backers (1)

- [needs_review] `src_006738` https://www.opensecrets.org/members-of-congress/summary?name=Economic%20Policy "Just a moment..."

### Criminal Justice - Donors and Backers (1)

- [needs_review] `src_006761` https://law.justia.com/cases/california/supreme-court/2021/s247278.html "Just a moment..."

### Andy Beshear Master Profile (1)

- [needs_review] `src_006791` https://www.opensecrets.org/news/2023/11/kentucky-gubernatorial-race-breaks-fundraising-records-exceeds-44-million "Just a moment..."

### The Labor Coalition and What Unions Expect (1)

- [needs_review] `src_006817` https://www.afge.org/article/afge-endorses-amy-acton-for-ohio-governor/ "Just a moment..."

### Pete Buttigieg Master Profile (1)

- [needs_review] `src_006892` https://www.opensecrets.org/2020-presidential-race/candidate?id=N00044183 "Just a moment..."

### Dinesh D'Souza (1)

- [needs_review] `src_007173` https://www.businesswire.com/news/home/20250403021482/en/Salem-Media-Group-Announces-Landmark-Deal-with-Donald-Trump-Jr.-and-Lara-Trump-Signaling-a-Bold-New-Era-in-Conservative-Media "Access Denied"

### Abby Martin (1)

- [needs_review] `src_007371` https://liberationnews.org/u-s-sanctions-shut-down-the-empire-files-with-abby-martin/ "Attention Required! | Cloudflare"

### Briahna Joy Gray (1)

- [needs_review] `src_007384` https://www.washingtontimes.com/news/2024/jun/7/progressive-commentator-fired-from-hill-after-dism/ "Just a moment..."

### Katie Halper (1)

- [needs_review] `src_007536` https://electronicintifada.net/blogs/nora-barrows-friedman/podcast-ep-67-katie-halper-fired-over-israel-criticism "Just a moment..."

### Kyle Kulinski (1)

- [needs_review] `src_007540` https://www.opensecrets.org/political-action-committees-pacs/justice-democrats/C00630665/summary/2018 "Just a moment..."

### Marianne Williamson (1)

- [needs_review] `src_007563` https://www.opensecrets.org/2024-presidential-race?id=N00035565 "Just a moment..."

### Pod Save America (1)

- [needs_review] `src_007591` https://www.opensecrets.org/political-action-committees-pacs/vote-save-america/C00835587/summary/2024 "Just a moment..."

### Joe Scarborough (1)

- [needs_review] `src_007818` https://www.politico.com/news/2024/06/28/biden-debate-democrats-00165722 "Just a moment..."

### Matt Taibbi (1)

- [needs_review] `src_007837` https://www.congress.gov/event/118th-congress/house-event/115442/text "Just a moment..."

### Alpine Group (1)

- [needs_review] `src_007940` https://www.opensecrets.org/orgs/alpine-group/lobbying?id=D000021816 "Just a moment..."

### Brownstein Hyatt Farber Schreck (1)

- [needs_review] `src_007996` https://www.opensecrets.org/fara/registrants/D000000724 "Just a moment..."

### Cornerstone Government Affairs (1)

- [needs_review] `src_008055` https://www.opensecrets.org/revolving-door/search_result?priv=Cornerstone+Government+Affairs "Just a moment..."

### Prime Policy Group (1)

- [needs_review] `src_008254` https://www.wpp.com/en/news/2024/01/wpp-unites-bcw-and-hill-knowlton-to-create-burson "Just a moment..."

### Thorn Run Partners (1)

- [needs_review] `src_008313` https://www.opensecrets.org/revolving-door/search_result?priv=Thorn+Run+Partners "Just a moment..."

### Trump administration profile Markwayne Mullin (1)

- [needs_review] `src_008330` https://www.opensecrets.org/news/2026/03/trump-administration-profile-markwayne-mullin "Just a moment..."

### FanDuel and DraftKings shift focus to D.C. amid federal efforts to legislate spo (1)

- [needs_review] `src_008335` https://www.opensecrets.org/news/2026/03/fanduel-and-draftkings-shift-focus-to-d-c-amid-federal-efforts-to-legislate-sports-betting "Just a moment..."

### Leonard Leo (1)

- [needs_review] `src_008598` https://www.americanprogress.org/article/pipelines-power-encouraging-professional-diversity-federal-appellate-bench/ "Just a moment..."

### Apollo Global Management (1)

- [needs_review] `src_008603` https://www.opensecrets.org/orgs/apollo-global-management/summary?id=D000067184 "Just a moment..."

### BlackRock (1)

- [needs_review] `src_008661` https://www.opensecrets.org/orgs/blackrock-inc/summary?id=D000067266 "Just a moment..."

### Blackstone Real Estate Political Operation (1)

- [needs_review] `src_008705` https://www.opensecrets.org/donor-lookup/results?name=schwarzman "Just a moment..."

### CalPERS (1)

- [needs_review] `src_008718` https://www.nakedcapitalism.com/2025/07/calpers-retiree-group-launches-gofundme-for-investigation-on-private-equity-fees.html "Attention Required! | Cloudflare"

### CalSTRS - California State Teachers' Retirement System (1)

- [needs_review] `src_008738` https://www.ppic.org/publication/public-pensions-in-california/ "Just a moment..."

### Goldman Sachs — The Government Sachs Alumni Network (1)

- [needs_review] `src_008856` https://www.opensecrets.org/orgs/goldman-sachs/totals?id=D000000085 "Just a moment..."

### Lawrence Summers (1)

- [needs_review] `src_008926` https://www.opensecrets.org/revolving-door/lawrence-summers/summary?id=70864 "Just a moment..."

### MassMutual (1)

- [needs_review] `src_008932` https://www.opensecrets.org/orgs/massachusetts-mutual-life-insurance/summary?id=D000000198 "Just a moment..."

### MBNA Corporation (1)

- [needs_review] `src_008952` https://www.nhtsa.gov/recalls?manufacturer=MBNA%20Corporation "Access Denied"

### Private Equity Industry Bloc (1)

- [needs_review] `src_008985` https://www.opensecrets.org/orgs/american-investment-council/lobbying?id=D000036835 "Just a moment..."

### Trump Organization (1)

- [needs_review] `src_009009` https://www.opensecrets.org/orgs/trump-organization/summary?id=D000030559 "Just a moment..."

### Wall Street Finance Networks (1)

- [needs_review] `src_009015` https://www.opensecrets.org/elections-overview/biggest-donors?cycle=2024 "Just a moment..."

### Crypto Industry Bloc (1)

- [needs_review] `src_009188` https://www.nhtsa.gov/recalls?manufacturer=Crypto%20Industry%20Bloc "Access Denied"

### Founders Fund (1)

- [needs_review] `src_009290` https://www.opensecrets.org/outside-spending/donor_detail/2022?id=U0000004022&name=Thiel,+Peter&super=N&type=I "Just a moment..."

### Jump Crypto (1)

- [needs_review] `src_009358` https://www.nhtsa.gov/recalls?manufacturer=Jump%20Crypto "Access Denied"

### Marc Andreessen & Horowitz (1)

- [needs_review] `src_009362` https://www.opensecrets.org/orgs/andreessen-horowitz/summary?id=D000047147 "Just a moment..."

### Ripple (1)

- [needs_review] `src_009458` https://www.opensecrets.org/orgs/ripple/summary?id=D000071522 "Just a moment..."

### Silicon Valley Democratic Donor Network (1)

- [needs_review] `src_009464` https://www.opensecrets.org/donor-lookup/results?name=Dustin+Moskovitz "Just a moment..."

### Silicon Valley Donors (1)

- [needs_review] `src_009472` https://www.opensecrets.org/news/2025/02/federal-lobbying-set-new-record-in-2024/ "Just a moment..."

### Tech and Media Donors (1)

- [needs_review] `src_009498` https://www.opensecrets.org/industries/ "Just a moment..."

### Valinor Enterprises (1)

- [needs_review] `src_009531` https://www.nhtsa.gov/recalls?manufacturer=Valinor%20Enterprises "Access Denied"

### World Liberty Financial (1)

- [needs_review] `src_009539` https://www.nhtsa.gov/recalls?manufacturer=World%20Liberty%20Financial "Access Denied"

### Affordable Chicago Now PAC (1)

- [needs_review] `src_009543` https://www.opensecrets.org/news/2022/11/american-israel-public-affairs-committee-backed-candidates-won-midterm-races-following-big-spending-by-groups-super-pac/ "Just a moment..."

### Americans for Prosperity (1)

- [needs_review] `src_009546` https://www.opensecrets.org/political-action-committees-pacs/americans-for-prosperity/C00687103/summary/2024 "Just a moment..."

### DonorsTrust (1)

- [needs_review] `src_009616` https://www.opensecrets.org/news/2021/12/conservative-dark-money-group-raised-record-50m-in-2020-after-election-rebranding/ "Just a moment..."

### Future Forward USA Action (1)

- [needs_review] `src_009642` https://www.opensecrets.org/news/2024/11/outside-spending-on-2024-elections-shatters-records-fueled-by-billion-dollar-dark-money-infusion/ "Just a moment..."

### House Majority PAC (1)

- [needs_review] `src_009659` https://www.opensecrets.org/political-action-committees-pacs/house-majority-pac/C00495028/summary/2024 "Just a moment..."

### Marble Freedom Trust (1)

- [needs_review] `src_009720` https://fedsoc.org/about-us "Just a moment..."

### One Nation (1)

- [needs_review] `src_009773` https://www.opensecrets.org/orgs/one-nation-pac/summary?id=D000046014 "Just a moment..."

### Senate Leadership Fund (1)

- [needs_review] `src_009840` https://www.opensecrets.org/political-action-committees-pacs/C00571703/summary/2024 "Just a moment..."

### Sentinel Action Fund (1)

- [needs_review] `src_009862` https://www.opensecrets.org/political-action-committees-pacs/sentinel-action-fund/c00811166/summary/2022 "Just a moment..."

### Starbucks (1)

- [needs_review] `src_009967` https://www.nhtsa.gov/recalls?manufacturer=Starbucks "Access Denied"

### California Apartment Association (1)

- [needs_review] `src_009982` https://www.nhtsa.gov/recalls?manufacturer=California%20Apartment%20Association "Access Denied"

### CBRE Group (1)

- [needs_review] `src_010033` https://www.opensecrets.org/orgs/cbre-group/summary?id=D000046887 "Just a moment..."

### Invitation Homes - Institutional Landlords (1)

- [needs_review] `src_010050` https://nationalmortgageprofessional.com/news/housing-shake-hud-and-fhfa-slash-staff-close-offices "Just a moment..."

### Las Vegas Sands (1)

- [needs_review] `src_010073` https://www.nhtsa.gov/recalls?manufacturer=Las%20Vegas%20Sands "Access Denied"

### Johnson & Johnson (1)

- [needs_review] `src_010336` https://www.nhtsa.gov/recalls?manufacturer=Johnson%20%26%20Johnson "Access Denied"

### David Sacks (1)

- [needs_review] `src_010666` https://www.axios.com/2024/05/24/trump-jd-vance-tech-fundraiser-david-sacks "Just a moment..."

### Harlan Crow (1)

- [needs_review] `src_010767` https://www.opensecrets.org/orgs/crow-holdings/summary?id=D000021943 "Just a moment..."

### Koch Network - Charles Koch (1)

- [needs_review] `src_010991` https://www.politico.com/news/2024/02/25/koch-afp-nikki-haley-00143212 "Just a moment..."

### Les Wexner - Wexner Family Enterprises (1)

- [needs_review] `src_011061` https://www.opensecrets.org/elections-overview/biggest-donors?cycle=2018&view=hi "Just a moment..."

### Narya Capital (1)

- [needs_review] `src_011106` https://www.axios.com/2024/07/16/jd-vance-venture-capital-career "Just a moment..."

### Palantir Technologies Political Operation (1)

- [needs_review] `src_011116` https://www.nhtsa.gov/recalls?manufacturer=Palantir%20Technologies%20Political%20Operation "Access Denied"

### Richard and Elizabeth Uihlein (1)

- [needs_review] `src_011225` https://news.wttw.com/2024/07/15/uihleins-prominent-business-owners-who-are-illinois-biggest-republican-donors "Just a moment..."

### Robert Mercer (1)

- [needs_review] `src_011228` https://www.opensecrets.org/news/2018/04/exclusive-robert-mercer-backed-a-secretive-group-that-worked-with-facebook-google-to-target-anti-muslim-ads-at-swing-voters/ "Just a moment..."

### Walmart - Walton Family (1)

- [needs_review] `src_011378` https://www.gao.gov/products/gao-21-45 "Access Denied"

### Winklevoss Twins (1)

- [needs_review] `src_011394` https://www.opensecrets.org/donor-lookup/results?name=winklevoss "Just a moment..."

### Comcast - NBCUniversal (1)

- [needs_review] `src_011422` https://www.opensecrets.org/orgs/comcast-corp/summary?id=D000000461 "Just a moment..."

### Hollywood Democratic Donor Network (1)

- [needs_review] `src_011450` https://www.nhtsa.gov/recalls?manufacturer=Hollywood%20Democratic%20Donor%20Network "Access Denied"

### Fraternal Order of Police (1)

- [needs_review] `src_011556` https://www.opensecrets.org/orgs/fraternal-order-of-police/summary?id=D000031728 "Just a moment..."

### PORAC - Peace Officers Research Association of California (1)

- [needs_review] `src_011587` https://couragecaliforniainstitute.org/investing-in-public-safety-the-influence-of-police-unions-and-associations/ "Just a moment..."

### AFGE - American Federation of Government Employees (1)

- [needs_review] `src_011611` https://www.afge.org/about-afge/ "Just a moment..."

### California Labor Federation (1)

- [needs_review] `src_011652` https://www.opensecrets.org/political-action-committees-pacs/afl-cio-committee-on-political-education/C00000935/summary/2024 "Just a moment..."

### CNA - California Nurses Association (1)

- [needs_review] `src_011668` https://www.opensecrets.org/orgs/national-nurses-united/summary?id=D000062602 "Just a moment..."

### IBEW Local 440 - Riverside (1)

- [needs_review] `src_011702` https://www.opensecrets.org/political-action-committees-pacs/international-brotherhood-of-electrical-workers/C00027342/summary/2024 "Just a moment..."

### UFCW - United Food and Commercial Workers (1)

- [needs_review] `src_011791` https://www.opensecrets.org/orgs/united-food-commercial-workers-union/summary?id=D000000072 "Just a moment..."

### Christians United for Israel (1)

- [needs_review] `src_011864` https://www.opensecrets.org/orgs/christians-united-for-israel/summary?id=D000073926 "Just a moment..."

### Jewish Democratic Council of America (1)

- [needs_review] `src_011903` https://www.opensecrets.org/orgs/jewish-democratic-council-of-america/summary?id=D000071271 "Just a moment..."

### Republican Jewish Coalition (1)

- [needs_review] `src_011944` https://www.opensecrets.org/orgs/republican-jewish-coalition/summary?id=D000028612 "Just a moment..."

### PBM Industry Bloc - OptumRx, CVS Caremark, Express Scripts (1)

- [needs_review] `src_011958` https://www.nhtsa.gov/recalls?manufacturer=PBM%20Industry%20Bloc%20-%20OptumRx%2C%20CVS%20Caremark%2C%20Express%20Scripts "Access Denied"

### Anthem - Elevance Health Political Operation (1)

- [needs_review] `src_011963` https://www.nhtsa.gov/recalls?manufacturer=Anthem%20-%20Elevance%20Health%20Political%20Operation "Access Denied"

### Civica Rx (1)

- [needs_review] `src_012035` https://www.nhtsa.gov/recalls?manufacturer=Civica%20Rx "Access Denied"

### CVS Health - Aetna (1)

- [needs_review] `src_012043` https://www.nhtsa.gov/recalls?manufacturer=CVS%20Health%20-%20Aetna "Access Denied"

### AIPAC Super PAC Spending Map (1)

- [needs_review] `src_012311` https://www.opensecrets.org/political-action-committees-pacs/aipac/C00104638/summary/2024 "Just a moment..."

### Saudi Arabia - Kingdom Investment (1)

- [needs_review] `src_012338` https://www.opensecrets.org/fara "Just a moment..."

### Turkey - Erdogan Lobbying Operation (1)

- [needs_review] `src_012341` https://www.congress.gov/bill/116th-congress/house-resolution/296 "Just a moment..."

### CTA - California Teachers Association (1)

- [needs_review] `src_012956` https://www.nhtsa.gov/recalls?manufacturer=CTA%20-%20California%20Teachers%20Association "Access Denied"

### Eli Broad Foundation (1)

- [needs_review] `src_012986` https://www.nhtsa.gov/recalls?manufacturer=Eli%20Broad%20Foundation "Access Denied"

### Bechtel Corporation (1)

- [needs_review] `src_013079` https://www.nhtsa.gov/recalls?manufacturer=Bechtel%20Corporation "Access Denied"

### Booz Allen Hamilton (1)

- [needs_review] `src_013145` https://www.opensecrets.org/orgs/booz-allen-hamilton/summary?id=D000036824 "Just a moment..."

### Americans for Tax Reform - Grover Norquist (1)

- [needs_review] `src_013595` https://www.opensecrets.org/orgs/americans-for-tax-reform/summary?id=D000029588 "Just a moment..."

### Arabella Advisors (1)

- [needs_review] `src_013602` https://www.tabletmag.com/sections/news/articles/for-profit-dc-firm-staging-americas-grassroots-movements-arabella-advisors "Just a moment..."

### Bradley Foundation (1)

- [needs_review] `src_013618` https://wisconsinexaminer.com/2023/09/05/how-anti-government-ideologues-targeted-wisconsin-public-schools/ "Just a moment..."

### Concerned Veterans for America (1)

- [needs_review] `src_013716` https://www.afge.org/article/report-koch-funded-concerned-veterans-for-america-wants-to-dismantle-va-cut-veterans-benefits/ "Just a moment..."

### Healthcare Sector (1)

- [needs_review] `src_013941` https://www.axios.com/pro/health-care-policy/2025/01/22/health-lobbying-spending-2024 "Just a moment..."

### Judicial Crisis Network (1)

- [needs_review] `src_013965` https://www.opensecrets.org/orgs/judicial-crisis-network/summary?id=D000026924 "Just a moment..."

### Organizing for Action (1)

- [needs_review] `src_014116` https://www.opensecrets.org/orgs/organizing-for-action/summary?id=D000078907 "Just a moment..."

### Trial Lawyers Fund (1)

- [needs_review] `src_014188` https://www.opensecrets.org/orgs/american-assn-for-justice/summary?id=D000000065 "Just a moment..."

### Trump 2024 Campaign (1)

- [needs_review] `src_014199` https://qz.com/donald-trump-campaign-donors-elon-musk-timothy-mellon-1851706388 "Attention Required! | Cloudflare"

### CCPOA - California Correctional Peace Officers Association (1)

- [needs_review] `src_014289` https://www.nhtsa.gov/recalls?manufacturer=CCPOA%20-%20California%20Correctional%20Peace%20Officers%20Association "Access Denied"

### CoreCivic (1)

- [needs_review] `src_014311` https://www.nhtsa.gov/recalls?manufacturer=CoreCivic "Access Denied"

### ADM - Archer Daniels Midland (1)

- [needs_review] `src_014381` https://www.opensecrets.org/orgs/archer-daniels-midland/summary?id=D000000132 "Just a moment..."

### California Farm Bureau Federation (1)

- [needs_review] `src_014454` https://www.opensecrets.org/orgs/california-farm-bureau/summary?id=D000070197 "Just a moment..."

### Cargill (1)

- [needs_review] `src_014477` https://projects.propublica.org/nonprofits/download-filing?path=IRS%2F416020221_202312_990PF_2025010222978691.pdf "Security Check — ProPublica"

---

*Regenerate: `node scripts/sources-orphan-report.cjs`*
