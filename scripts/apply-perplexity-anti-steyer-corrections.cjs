#!/usr/bin/env node
/**
 * Applies David's Perplexity-verified corrections to the anti-Steyer
 * memes + Steyer dossier.
 *
 * Source: C:\Users\third\Downloads\Anti_Steyer_Verification_Report.md
 *
 * Major corrections:
 *   1. PG&E+IBEW total = $10,050,000 (not $10,025,000) — IBEW gave $25K
 *      additional on 4/20/2026 missed in original trace
 *   2. Committee 1489677 first F410 was 3/27/2026 (not 4/1/2026)
 *   3. Compliance firms — TWO firms, tiered:
 *        - Nielsen Merksamer (San Rafael): 1490270 + Mahan IE PACs
 *        - Deane & Company (Sacramento): 1489677 + CAR-adjacent FAIRPAC
 *   4. The $21,025,000 figure is "contributions raised to oppose" — actual
 *      IE expenditures through 4/17 = $13,892,448.41 per Schedule D
 *   5. CARFE third sponsor confirmed: California Electric Utility
 *      Industry Labor-Management Cooperation Committee (in-kind only,
 *      $4,110 PAC admin services)
 */
const fs = require('fs');

// ── Update prototype/memes-may-1.html ──
{
  const fp = 'prototype/memes-may-1.html';
  let text = fs.readFileSync(fp, 'utf-8');

  // Fix 1: $10,025,000 → $10,050,000 (everywhere it appears)
  text = text.replace(/\$10,025,000/g, '$10,050,000');
  text = text.replace(/\$10\.025M/g, '$10.05M');
  text = text.replace(/~\$10 million/g, '~$10 million');  // This stays as approximate

  // Fix 2: IBEW $50,000 single line → both contributions
  text = text.replace(
    '<div class="row"><span class="name">IBEW Local 1245 (PG&amp;E utility workers)</span> <span class="val">$50,000</span></div>',
    '<div class="row"><span class="name">IBEW Local 1245 (4/10)</span> <span class="val">$50,000</span></div>\n      <div class="row"><span class="name">IBEW Local 1245 (4/20)</span> <span class="val">$25,000</span></div>'
  );
  // Fix the receipt-list total line
  text = text.replace(
    '<div class="row total"><span class="name">VERIFIED TOTAL</span> <span class="val">$10,025,000</span></div>',
    '<div class="row total"><span class="name">VERIFIED TOTAL</span> <span class="val">$10,050,000</span></div>'
  );

  // Fix 3: same compliance shop framing → two-firm tiered structure
  text = text.replace(
    'same compliance shop (Nielsen Merksamer) as 1490270',
    'separate compliance shop (Deane &amp; Company, Sacramento) — Nielsen Merksamer files for 1490270, Deane &amp; Company files for 1489677'
  );

  // Fix in detail page section: "Both committees use the same compliance firm"
  text = text.replace(
    'Both anti-Steyer committees use the same compliance firm — Nielsen Merksamer LLP, San Rafael — which is also the operator behind both pro-Mahan IE PACs.',
    'The two anti-Steyer committees use TWO different compliance firms in a tiered structure: <strong>Nielsen Merksamer</strong> (San Rafael) files for 1490270 (the PG&amp;E funnel) and both pro-Mahan IE PACs (1487425, 1488176). <strong>Deane &amp; Company</strong> (Sacramento) files for 1489677 (the actual anti-Steyer spending committee) and CAR-adjacent vehicles like FAIRPAC. The compliance work is divided: NM handles utility/employer-coalition adjacencies; D&amp;C handles Realtor / anti-Steyer-spending adjacencies.'
  );

  // Fix in tweet/meme footers that mention "same compliance shop"
  text = text.replace(
    'same compliance shop (Nielsen Merksamer) as 1490270 ·',
    'compliance firm Deane &amp; Company (Sacramento, separate from PG&amp;E committee\'s Nielsen Merksamer) ·'
  );

  // Fix the deck on detail page about three forces
  text = text.replace(
    /Three forces are tipping the scales in the most expensive non-presidential primary in California history\. The Camp Fire utility is one of them\. So is a coalition of Silicon Valley billionaires\. And the crypto industry is hedging across all three lanes\./,
    'A California business establishment coalition — utility + Realtors + Chamber of Commerce + Building Industry + prison guards — has put $21 million into a single committee to defeat Tom Steyer. Plus a coalition of Silicon Valley billionaires funding Matt Mahan. Plus the crypto industry hedging across all three lanes.'
  );

  // Fix: refine the $21M framing to be accurate (raised vs spent)
  text = text.replace(
    'A second anti-Steyer committee just spent another $21M.',
    'A second anti-Steyer committee has raised another $21M (and spent ~$14M of it through April 17).'
  );

  // Update the registration date claim
  text = text.replace(
    'committee 1489677, registered 4/1/2026 as',
    'committee 1489677 (first F410 filed 3/27/2026, amendment 4/1/2026)'
  );

  // Fix the polling claim wording — Schedule D vs Schedule E dates
  text = text.replace(
    'paid <strong style="background: none; font-weight: 700;">David Binder Research, Inc.</strong> $30,000 on April 2, 2026.',
    'incurred a $30,000 expenditure to <strong style="background: none; font-weight: 700;">David Binder Research, Inc.</strong> on March 31, 2026 (paid April 2).'
  );

  fs.writeFileSync(fp, text, 'utf-8');
  console.log('Updated memes-may-1.html');
}

// ── Update Steyer dossier ──
{
  const fp = 'content/Admin Notes/ca-gov-2026-dossiers/steyer.md';
  let text = fs.readFileSync(fp, 'utf-8');

  // Add a new "PERPLEXITY-VERIFIED CORRECTIONS" section after Phase 5d
  const anchor = '## Open questions for David';
  if (!text.includes(anchor)) {
    console.error('Anchor not found in steyer.md');
    process.exit(1);
  }

  const insert = `## PERPLEXITY-VERIFIED CORRECTIONS (Phase 5f — 2026-05-01)

David's Perplexity verification pass on the anti-Steyer committee findings (Anti_Steyer_Verification_Report.md, 2026-05-01) confirmed 8 of 8 claims with the following refinements:

### Corrections to apply

**1. PG&E + IBEW total = $10,050,000 (not $10,025,000).** Prior trace missed a second IBEW Local 1245 contribution of $25,000 on 4/20/2026 (filing 3135715, line 2). True totals to committee 1490270:
- PG&E Corporation: $8,000,000 (4/10) + $1,975,000 (4/20) = $9,975,000
- IBEW Local 1245: $50,000 (4/10) + **$25,000 (4/20)** = $75,000
- **Total: $10,050,000**

Independently corroborated by Energy and Policy Institute report ("Both PG&E and IBEW 1245 made subsequent donations on April 20, 2026, of $1.975 million and $25,000 respectively").

**2. Committee 1489677 first F410 was 3/27/2026, not 4/1/2026.** First electronic F410 filing was 3/27/2026 (filing 3129634); the 4/1/2026 effective date in FILERNAME_CD reflects an amendment that added the second name ("Californians for the People..."). The committee predates the 4/1 date by five days.

**3. Compliance-firm framing was WRONG. Two firms, tiered structure.** My earlier "same compliance shop" claim was inaccurate. Verified split:

| Committee | Compliance firm | Treasurer | Email |
|---|---|---|---|
| 1489677 (anti-Steyer spender) | **Deane & Company** (Sacramento) | Laiza Negrete | CASPeople@deaneandcompany.com |
| 1490270 (PG&E funnel) | Nielsen Merksamer (San Rafael) | Evann Whitelam | FORM410@NMGOVLAW.COM |
| 1487425 (Mahan IE — Back to Basics) | Nielsen Merksamer | Steven S. Lucas | FORM410@NMGOVLAW.COM |
| 1488176 (Mahan IE — Deliver for CA) | Nielsen Merksamer | Elli Abdoli | FORM410@NMGOVLAW.COM |

**Editorial significance — the corrected framing is sharper:** Two firms in tiered specialization. Nielsen Merksamer handles upstream "wholesale" donor-collection funnels (the PG&E committee + the Mahan IE PACs collecting from Silicon Valley). **Deane & Company** handles downstream "retail" spending committees (the anti-Steyer-spending 1489677 + CAR-adjacent FAIRPAC). The compliance work is divided along industry alignment: NM = utility/employer coalitions; D&C = Realtors/anti-Steyer spending. **Different firms, coordinated infrastructure pattern.**

**4. The "$21,025,000 IE spending" framing needs terminology refinement.** Per FPPC's own Top 10 Contributors page (which independently confirms the $21,025,000 figure to the dollar), this is **contributions RAISED to oppose Steyer**, not expenditures MADE. Actual Schedule D IE-spending total through 4/17/2026 = **$13,892,448.41**. The remaining ~$7M+ has been raised but not yet appeared as expenditures (will land in subsequent F496 reports as ad buys are made). Don't conflate "raised to oppose" with "spent against."

**5. JOBSPAC $5M — STILL ON BOOKS, not amended.** Filing 3137881 records JOBSPAC contribution dated 4/21/2026, which is outside the F460 reporting window (1/1 - 4/18). Will appear in next F460 (period closes 5/17, filed by 5/22). No amendment filed.

**6. Bonus findings:**
- **Schedule C in-kind from "California Electric Utility Industry Labor-Management Cooperation Committee"** — $4,110 for "PAC Administrative Services" — confirms the third sponsor named in CARFE's full title is providing in-kind labor admin support, not cash.
- **David Binder Research subcontracted:** $9,875 to KGS Research, Inc. (Las Vegas) + $4,200 to Political Data, Inc. (Norwalk).
- **California Real Estate Independent Expenditure Committee = filer 963026** (CAR's IEC vehicle), parent 1069777, LA address ZIP 90020.
- **Treasurer Evann Whitelam** sits on 10 NM-affiliated committees; **Steven S. Lucas** sits on 50+. Useful entity-resolution data for future investigations.

**7. Open question STILL UNRESOLVED:** Principal officer behind "Business Owners and Concerned Citizens" sponsor of 1489677 is **undisclosed at primary-source level**. No F460 cover sheet, F410, or sponsor disclosure names a principal officer. To pierce, would need FPPC public records request or MUR-style enforcement.

### Verification source paths

All corrections sourced from:
- California Cal-Access bulk export, 2026-05-01 08:39 UTC snapshot
- FPPC Top 10 Contributors list — June 2026 Primary Election (independent corroboration)
- Energy and Policy Institute report on Becerra utility funding
- Schedule D / Schedule E line-item analysis on filings 3137638 and 3138008

`;
  text = text.replace(anchor, insert + anchor);
  fs.writeFileSync(fp, text, 'utf-8');
  console.log('Updated steyer.md');
}

console.log('Done.');
