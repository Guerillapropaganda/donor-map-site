#!/usr/bin/env node
/**
 * apply-type-reclassification.cjs — Bulk type field rewrites
 *
 * Applied 2026-04-11 night session to clean up 32 mis-typed files
 * under content/Politicians/:
 *   - 27 topical sub-notes (Trump policy deep-dives, Chad Bianco
 *     sheriff-era stories) that were accidentally typed as `politician`
 *     instead of `sub-note`
 *   - 5 state politicians (Kathy Hochul, Brian Kemp, Ash Kalra,
 *     Anthony Rendon, Buffy Wicks) that needed the new
 *     state-politician type from today's taxonomy expansion
 *
 * Usage:
 *   node scripts/apply-type-reclassification.cjs           # dry
 *   node scripts/apply-type-reclassification.cjs --write   # apply
 */
const fs = require('fs');
const path = require('path');

const WRITE = process.argv.includes('--write');
const today = new Date().toISOString().slice(0, 10);

// path → new type
const RECLASSIFY = {
  // 27 sub-notes — all topical stories, nested under a parent politician dir
  'content/Politicians/Races/CA Governor 2026/Chad Bianco/2026 Governor Race/The Gubernatorial Pivot - From Sheriff to Culture War Candidate.md': 'sub-note',
  'content/Politicians/Races/CA Governor 2026/Chad Bianco/COVID/COVID Mandate Refusal - The Brand-Building Moment.md': 'sub-note',
  'content/Politicians/Races/CA Governor 2026/Chad Bianco/Far-Right Affiliations/CSPOA - The Anti-Government Sheriff Network.md': 'sub-note',
  'content/Politicians/Races/CA Governor 2026/Chad Bianco/Far-Right Affiliations/Oath Keepers Membership and the Constitutional Sheriff Movement.md': 'sub-note',
  'content/Politicians/Races/CA Governor 2026/Chad Bianco/Jail Deaths and Use of Force/CA DOJ Investigation - Pattern and Practice.md': 'sub-note',
  'content/Politicians/Races/CA Governor 2026/Chad Bianco/Jail Deaths and Use of Force/Deputy Misconduct and the Whistleblower Firing.md': 'sub-note',
  'content/Politicians/Republicans/Presidential/Donald Trump/Agriculture/Farm Subsidies, SNAP Cuts, and the Tariff Bailout - Who Actually Got Paid.md': 'sub-note',
  'content/Politicians/Republicans/Presidential/Donald Trump/Criminal Justice & DOJ/The Pardon Machine - Who Got Clemency and Who Funded It.md': 'sub-note',
  'content/Politicians/Republicans/Presidential/Donald Trump/Crypto/Trump Crypto - The President as Personal Profiteer.md': 'sub-note',
  'content/Politicians/Republicans/Presidential/Donald Trump/DOGE/DOGE - The Billionaires Government.md': 'sub-note',
  'content/Politicians/Republicans/Presidential/Donald Trump/DOGE/The Contractor Beneficiaries - Who Replaced the Civil Servants.md': 'sub-note',
  'content/Politicians/Republicans/Presidential/Donald Trump/DOGE/The Federal Workforce Gutting - 320,000 Jobs and the Services That Disappeared.md': 'sub-note',
  'content/Politicians/Republicans/Presidential/Donald Trump/DOGE/The Ramaswamy 32 Days - DOGE Co-Lead to Ohio Governor Candidate.md': 'sub-note',
  'content/Politicians/Republicans/Presidential/Donald Trump/Governance/Project 2025 - The Blueprint They Followed.md': 'sub-note',
  'content/Politicians/Republicans/Presidential/Donald Trump/Governance/Schedule F and the Deep State Purge - Replacing Civil Servants with Loyalists.md': 'sub-note',
  'content/Politicians/Republicans/Presidential/Donald Trump/Governance/The Billionaire Cabinet - Wealthiest Administration in History.md': 'sub-note',
  'content/Politicians/Republicans/Presidential/Donald Trump/Guns/The NRA Investment and the Second Amendment Theater.md': 'sub-note',
  'content/Politicians/Republicans/Presidential/Donald Trump/Israel & Foreign Policy/Israel and Foreign Policy - Donors and Backers.md': 'sub-note',
  'content/Politicians/Republicans/Presidential/Donald Trump/Israel & Foreign Policy/The Adelson Pipeline - Embassy, Abraham Accords, and Iran.md': 'sub-note',
  'content/Politicians/Republicans/Presidential/Donald Trump/Israel & Foreign Policy/The Iran War Money Trail - From Adelson to Airstrikes.md': 'sub-note',
  'content/Politicians/Republicans/Presidential/Donald Trump/Judicial/Three Justices in Four Years - The Leonard Leo Investment and Its Returns.md': 'sub-note',
  'content/Politicians/Republicans/Presidential/Donald Trump/Media & Propaganda/Media and Propaganda - Donors and Backers.md': 'sub-note',
  'content/Politicians/Republicans/Presidential/Donald Trump/Media & Propaganda/The Fox News Pipeline - How Media Money Shaped the MAGA Machine.md': 'sub-note',
  'content/Politicians/Republicans/Presidential/Donald Trump/Surveillance/Section 702 - The Warrantless Surveillance Expansion.md': 'sub-note',
  'content/Politicians/Republicans/Presidential/Donald Trump/Surveillance/Signalgate - The Yemen Strike Chat and the Security Theater.md': 'sub-note',
  'content/Politicians/Republicans/Presidential/Donald Trump/Surveillance/The Palantir State - Surveillance as Policy.md': 'sub-note',
  'content/Politicians/Republicans/Presidential/Donald Trump/Trade & Tariffs/Tariff Wars - The Working Class Tax Disguised as Trade Policy.md': 'sub-note',

  // 5 state politicians
  'content/Politicians/Democrats/Governors/Kathy Hochul.md': 'state-politician',
  'content/Politicians/Democrats/House/Anthony Rendon.md': 'state-politician',
  'content/Politicians/Democrats/House/Ash Kalra.md': 'state-politician',
  'content/Politicians/Democrats/House/Buffy Wicks.md': 'state-politician',
  'content/Politicians/Republicans/Governors/Brian Kemp.md': 'state-politician',
};

// Descriptive current-office additions for the state politicians
const CURRENT_OFFICE = {
  'Kathy Hochul.md': 'Governor of New York (2021–present)',
  'Anthony Rendon.md': 'Former Speaker of the California State Assembly (2016–2023)',
  'Ash Kalra.md': 'California State Assembly Member, District 25 (2016–present)',
  'Buffy Wicks.md': 'California State Assembly Member, District 14 (2018–present)',
  'Brian Kemp.md': 'Governor of Georgia (2019–present)',
};

let fixed = 0, skipped = 0;

for (const [rel, newType] of Object.entries(RECLASSIFY)) {
  if (!fs.existsSync(rel)) {
    console.log(`  SKIP (not found): ${rel}`);
    skipped++;
    continue;
  }
  let content = fs.readFileSync(rel, 'utf-8');
  const typeLineRe = /^type:\s*"?([^"\n]+?)"?\s*$/m;
  const m = content.match(typeLineRe);
  if (!m) {
    console.log(`  SKIP (no type line): ${rel}`);
    skipped++;
    continue;
  }
  if (m[1].trim() === newType) {
    console.log(`  SKIP (already ${newType}): ${path.basename(rel)}`);
    skipped++;
    continue;
  }

  // Replace type
  content = content.replace(typeLineRe, `type: ${newType}`);

  // For state politicians, add current-office field if missing
  const baseName = path.basename(rel);
  if (newType === 'state-politician' && CURRENT_OFFICE[baseName]) {
    if (!/^current-office:/m.test(content)) {
      content = content.replace(/^type:\s*state-politician\s*$/m, `type: state-politician\ncurrent-office: "${CURRENT_OFFICE[baseName]}"`);
    }
  }

  // For sub-notes, add parent reference comment if possible (purely informational)
  // Skip — sub-notes can figure out their parent from the directory structure

  if (WRITE) {
    fs.writeFileSync(rel, content, 'utf-8');
  }
  const old = m[1].trim();
  console.log(`  ${WRITE ? 'FIXED' : 'WOULD FIX'}: ${path.basename(rel)} (${old} → ${newType})`);
  fixed++;
}

console.log(`\n  ${WRITE ? 'Fixed' : 'Would fix'}: ${fixed}`);
console.log(`  Skipped: ${skipped}`);
if (!WRITE) console.log('\n  Dry run. Add --write to apply.');
