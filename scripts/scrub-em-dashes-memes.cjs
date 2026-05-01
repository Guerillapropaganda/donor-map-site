#!/usr/bin/env node
// One-shot scrub of em dashes from prototype/memes-may-1.html
// Per editorial standard: no em dashes in published prose.

const fs = require('fs');
const fp = 'prototype/memes-may-1.html';
let t = fs.readFileSync(fp, 'utf-8');

const replacements = [
  // Title
  ['<title>The Donor Map — May 1 2026 Memes</title>',
   '<title>The Donor Map · May 1 2026 Memes</title>'],

  // Page header h1 (visible)
  ['<h1>California Governor 2026 — <em>screenshot kit</em></h1>',
   '<h1>California Governor 2026 · <em>screenshot kit</em></h1>'],

  // Instructions text (visible)
  ['Source citations are baked in — feel free to drop straight into a post.',
   'Source citations are baked in. Feel free to drop straight into a post.'],

  // HTML comments (not visible to readers but cleaning anyway)
  ['STORY 1 — PG&E + opposition apparatus vs Steyer',
   'STORY 1 · PG&E + opposition apparatus vs Steyer'],
  ['MEME 1 — combined $10M + Camp Fire + explanation',
   'MEME 1 · combined $10M + Camp Fire + explanation'],
  ['MEME 2 — corrected polling claim',
   'MEME 2 · corrected polling claim'],
  ['MEME 3 — receipt ledger',
   'MEME 3 · receipt ledger'],
  ['STORY 2 — Becerra surge + Anthem coalition',
   'STORY 2 · Becerra surge + Anthem coalition'],
  ['MEME 4 — surge + polling',
   'MEME 4 · surge + polling'],
  ['MEME 5 — combined: regulated Anthem + Anthem founder + top donors + receipts',
   'MEME 5 · combined: regulated Anthem + Anthem founder + top donors + receipts'],
  ['STORY 3 — Crypto industry hedges all three lanes (1 combined meme)',
   'STORY 3 · Crypto industry hedges all three lanes (1 combined meme)'],
  ['MEME 6 — combined: Larsen dual party + Coinbase + framing',
   'MEME 6 · combined: Larsen dual party + Coinbase + framing'],

  // Meme 1 body — Camp Fire frame (visible prose)
  ['The utility behind the Camp Fire — which pleaded guilty to <strong style="font-style: normal; font-weight: 900;">84 counts of involuntary manslaughter</strong> in 2020 — is funding the campaign against the only major candidate running on utility-and-climate accountability.',
   'The utility behind the Camp Fire is funding the campaign against the only major candidate running on utility-and-climate accountability. PG&amp;E pleaded guilty to <strong style="font-style: normal; font-weight: 900;">84 counts of involuntary manslaughter</strong> in 2020.'],

  // Meme 2 footer — compliance shop framing (visible)
  ['Cal-Access EXPN_CD filing 3138008 · CVR filer = 1489677 · separate compliance shop (Deane &amp; Company, Sacramento) — Nielsen Merksamer files for 1490270, Deane &amp; Company files for 1489677 · primary-source verified 2026-05-01 · thedonormap.org',
   'Cal-Access EXPN_CD filing 3138008 · CVR filer = 1489677 · Deane &amp; Company files for 1489677 · Nielsen Merksamer files for 1490270 · primary-source verified 2026-05-01 · thedonormap.org'],

  // Meme 3 desc (visible)
  ['FPPC committee 1490270 — verified Q2 2026 receipts',
   'FPPC committee 1490270 · verified Q2 2026 receipts'],

  // Meme 3 body explain (visible)
  ['<strong>Plus a separate anti-Steyer committee</strong> — <span style="font-family: \'Space Mono\', monospace; font-size: 14px;">1489677</span> ("California Is Not For Sale") — paid David Binder Research $30,000 for opposition polling. Different compliance firm (Deane &amp; Co), same target. Two committees, one coalition.',
   '<strong>Plus a separate anti-Steyer committee.</strong> Filer <span style="font-family: \'Space Mono\', monospace; font-size: 14px;">1489677</span> ("California Is Not For Sale") paid David Binder Research $30,000 for opposition polling. Different compliance firm (Deane &amp; Co), same target. Two committees, one coalition.'],

  // Meme 5 closing (visible)
  ['Construction labor + healthcare insurance + fossil capital + tribal gaming. Becerra was Secretary of Health and Human Services 2021-2025 — direct regulatory authority over Anthem.',
   'Construction labor + healthcare insurance + fossil capital + tribal gaming. Becerra was Secretary of Health and Human Services 2021-2025. He had direct regulatory authority over Anthem.'],

  // Meme 5 footer (visible)
  ['Leonard Schaeffer (Santa Monica) — founder &amp; former CEO of WellPoint / Anthem — gave $39,200 (CA legal max) to Becerra for Governor 2026 on 4/15/2025 · Cal-Access RCPT_CD filing 3071361 · CVR filer = 1480025 · thedonormap.org',
   'Leonard Schaeffer (Santa Monica), founder &amp; former CEO of WellPoint / Anthem, gave $39,200 (CA legal max) to Becerra for Governor 2026 on 4/15/2025 · Cal-Access RCPT_CD filing 3071361 · CVR filer = 1480025 · thedonormap.org'],

  // Meme 6 body explain (visible)
  ['The crypto industry isn\'t picking sides. It\'s owning <strong style="background: var(--red); color: #fff; padding: 0 4px;">all three lanes</strong> — Republican (Hilton), institutional Democrat (via the Mahan IE PAC), and the small-dollar populist (Porter, hedged).',
   'The crypto industry isn\'t picking sides. It\'s owning <strong style="background: var(--red); color: #fff; padding: 0 4px;">all three lanes</strong>. Republican (Hilton), institutional Democrat (via the Mahan IE PAC), and the small-dollar populist (Porter, hedged).'],

  // Meme 6 footer (visible)
  ['Christian "Chris" Larsen, executive chairman of Ripple Labs — same individual contributing to both candidates · Cal-Access RCPT_CD filings traced via CVR filer trace to 1479597 + 1480425 · Coinbase Mahan IE PAC contribution via S497_CD · thedonormap.org · 2026-05-01',
   'Christian "Chris" Larsen, executive chairman of Ripple Labs · same individual contributing to both candidates · Cal-Access RCPT_CD filings traced via CVR filer trace to 1479597 + 1480425 · Coinbase Mahan IE PAC contribution via S497_CD · thedonormap.org · 2026-05-01'],

  // Detail page deck (visible)
  ['<p class="deck">A California business establishment coalition — utility + Realtors + Chamber of Commerce + Building Industry + prison guards — has put $21 million into a single committee to defeat Tom Steyer. Plus a coalition of Silicon Valley billionaires funding Matt Mahan. Plus the crypto industry hedging across all three lanes.</p>',
   '<p class="deck">A California business establishment coalition has put $21 million into a single committee to defeat Tom Steyer. The members: utility, Realtors, Chamber of Commerce, Building Industry, prison guards. Plus a coalition of Silicon Valley billionaires funding Matt Mahan. Plus the crypto industry hedging across all three lanes.</p>'],

  // Detail page h2 Force 1
  ['<h2>Force #1 — PG&amp;E spent ~$10M to defeat Tom Steyer</h2>',
   '<h2>Force #1 · PG&amp;E spent ~$10M to defeat Tom Steyer</h2>'],

  // Detail page contributions phrase
  ['All contributions flowed into FPPC committee <strong>1490270</strong> ("Californians for Resilient and Affordable Energy, NO ON Steyer for Governor 2026") — the FPPC\'s required disclosure for committees primarily formed against a candidate.',
   'All contributions flowed into FPPC committee <strong>1490270</strong> ("Californians for Resilient and Affordable Energy, NO ON Steyer for Governor 2026"). The "NO ON" suffix is the FPPC\'s required disclosure for committees primarily formed against a candidate.'],

  // Detail page Force 2 h2
  ['<h2>Force #2 — A second anti-Steyer committee paid for opposition polling</h2>',
   '<h2>Force #2 · A second anti-Steyer committee paid for opposition polling</h2>'],

  // Detail page note on attribution
  ['<p><strong>Note on attribution.</strong> The polling that\'s driving the public narrative — Gudelunas Strategies for Mike Madrid — has a separate commissioner that has not been confirmed from primary FPPC records. The David Binder Research $30K is verified anti-Steyer polling. Don\'t conflate the two.</p>',
   '<p><strong>Note on attribution.</strong> The polling that\'s driving the public narrative (Gudelunas Strategies for Mike Madrid) has a separate commissioner that has not been confirmed from primary FPPC records. The David Binder Research $30K is verified anti-Steyer polling. The two are separate filings.</p>'],

  // Detail page Force 3 h2
  ['<h2>Force #3 — Silicon Valley billionaires, $8M+ for Matt Mahan</h2>',
   '<h2>Force #3 · Silicon Valley billionaires, $8M+ for Matt Mahan</h2>'],

  // Detail page Singerman line
  ['<li><strong>Brian Singerman</strong> (Founders Fund — Peter Thiel\'s firm): $250,000</li>',
   '<li><strong>Brian Singerman</strong> (Founders Fund, Peter Thiel\'s firm): $250,000</li>'],

  // Detail page Becerra HHS line
  ['Becerra was Secretary of Health and Human Services 2021-2025 — direct regulatory authority over Anthem\'s markets, ACA implementation, Medicare Advantage, Medicaid managed-care contracts.',
   'Becerra was Secretary of Health and Human Services 2021-2025. He had direct regulatory authority over Anthem\'s markets, ACA implementation, Medicare Advantage, and Medicaid managed-care contracts.'],

  // Detail page Ripple section h2
  ['<h2>The Ripple hedge — crypto industry across all three lanes</h2>',
   '<h2>The Ripple hedge · crypto industry across all three lanes</h2>'],

  // Detail page Larsen line
  ['<li><strong>Christian "Chris" Larsen</strong>, executive chairman of Ripple, gave $39,200 to Porter (D) and $39,200 to Hilton (R) — same person, opposite parties, same race.</li>',
   '<li><strong>Christian "Chris" Larsen</strong>, executive chairman of Ripple, gave $39,200 to Porter (D) and $39,200 to Hilton (R). Same person, opposite parties, same race.</li>'],

  // Detail page Steyer self-fund context
  ['The polling shows him flat at 15% — the opposition is winning the narrative even though Steyer is winning the dollar count.',
   'The polling shows him flat at 15%. The opposition is winning the narrative even though Steyer is winning the dollar count.'],
];

let applied = 0;
const notFound = [];
for (const [oldStr, newStr] of replacements) {
  if (t.includes(oldStr)) {
    t = t.replace(oldStr, newStr);
    applied++;
  } else {
    notFound.push(oldStr.slice(0, 90));
  }
}
fs.writeFileSync(fp, t, 'utf-8');
const remaining = (t.match(/—/g) || []).length;
console.log('Applied:', applied, '/', replacements.length);
if (notFound.length > 0) {
  console.log('NOT FOUND:');
  for (const n of notFound) console.log('  ' + n);
}
console.log('Remaining em dashes in memes-may-1.html:', remaining);
