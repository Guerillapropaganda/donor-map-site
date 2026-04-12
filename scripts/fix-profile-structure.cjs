#!/usr/bin/env node
/**
 * fix-profile-structure.cjs — Fix common structural issues across politician profiles
 *
 * Issues fixed:
 * 1. Missing party/chamber/state frontmatter (inferred from folder path)
 * 2. Wrong heading levels (### for major sections -> ##)
 * 3. Broken callouts (missing > prefix on [!money] etc.)
 * 4. Legacy inline donors:: lines in body (removed)
 *
 * Usage:
 *   node scripts/fix-profile-structure.cjs --dry-run
 *   node scripts/fix-profile-structure.cjs --write
 */

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const CONTENT = path.resolve(__dirname, '..', 'content');
const DRY_RUN = !process.argv.includes('--write');

const PARTY_MAP = {
  'Democrats': 'Democrat',
  'Republicans': 'Republican',
  'Independent': 'Independent',
};

const CHAMBER_MAP = {
  'House': 'House',
  'Senate': 'Senate',
  'Presidential': 'Presidential',
  'Vice Presidential': 'Vice Presidential',
  'Governors': 'Governor',
  'Biden Cabinet': 'Biden Cabinet',
  'Obama Cabinet': 'Obama Cabinet',
  'Trump Cabinet': 'Trump Cabinet',
  'Bush Cabinet': 'Bush Cabinet',
  'SCOTUS': 'SCOTUS',
  'Former': 'Former',
};

const STATE_ABBR_TO_NAME = {
  'AL': 'Alabama', 'AK': 'Alaska', 'AZ': 'Arizona', 'AR': 'Arkansas',
  'CA': 'California', 'CO': 'Colorado', 'CT': 'Connecticut', 'DE': 'Delaware',
  'FL': 'Florida', 'GA': 'Georgia', 'HI': 'Hawaii', 'ID': 'Idaho',
  'IL': 'Illinois', 'IN': 'Indiana', 'IA': 'Iowa', 'KS': 'Kansas',
  'KY': 'Kentucky', 'LA': 'Louisiana', 'ME': 'Maine', 'MD': 'Maryland',
  'MA': 'Massachusetts', 'MI': 'Michigan', 'MN': 'Minnesota', 'MS': 'Mississippi',
  'MO': 'Missouri', 'MT': 'Montana', 'NE': 'Nebraska', 'NV': 'Nevada',
  'NH': 'New Hampshire', 'NJ': 'New Jersey', 'NM': 'New Mexico', 'NY': 'New York',
  'NC': 'North Carolina', 'ND': 'North Dakota', 'OH': 'Ohio', 'OK': 'Oklahoma',
  'OR': 'Oregon', 'PA': 'Pennsylvania', 'RI': 'Rhode Island', 'SC': 'South Carolina',
  'SD': 'South Dakota', 'TN': 'Tennessee', 'TX': 'Texas', 'UT': 'Utah',
  'VT': 'Vermont', 'VA': 'Virginia', 'WA': 'Washington', 'WV': 'West Virginia',
  'WI': 'Wisconsin', 'WY': 'Wyoming',
};

let fixed = 0;
const fixes = { party: 0, chamber: 0, state: 0, headings: 0, callouts: 0, donors: 0 };

function inferFromPath(filePath) {
  // content/Politicians/{Party}/{Chamber}/{Name}/...
  const rel = filePath.replace(/.*Politicians[\/\\]/, '');
  const parts = rel.split(/[\/\\]/);
  const partyFolder = parts[0] || '';
  const chamberFolder = parts[1] || '';
  return {
    party: PARTY_MAP[partyFolder] || null,
    chamber: CHAMBER_MAP[chamberFolder] || null,
  };
}

function processFile(filePath) {
  const text = fs.readFileSync(filePath, 'utf-8');
  const fmMatch = text.match(/^(---\n)([\s\S]*?)(\n---\n)([\s\S]*)$/);
  if (!fmMatch) return false;

  let fmText = fmMatch[2];
  let body = fmMatch[4];
  let changed = false;

  // Skip raw profiles
  const readiness = fmText.match(/content-readiness:\s*(\w+)/);
  if (!readiness || readiness[1] === 'raw') return false;

  // Only process politicians
  if (!fmText.match(/type:\s*politician/)) return false;

  const { party, chamber } = inferFromPath(filePath);

  // Fix missing party
  if (!fmText.match(/^party:/m) && party) {
    fmText = fmText.replace(/(type:\s*.+)/, `$1\nparty: "${party}"`);
    fixes.party++;
    changed = true;
  }

  // Fix missing chamber
  if (!fmText.match(/^chamber:/m) && chamber) {
    fmText = fmText.replace(/(type:\s*.+)/, `$1\nchamber: "${chamber}"`);
    fixes.chamber++;
    changed = true;
  }

  // Fix missing state (try to infer from state-abbr)
  if (!fmText.match(/^state:/m)) {
    const abbrMatch = fmText.match(/state-abbr:\s*"?(\w{2})"?/);
    if (abbrMatch && STATE_ABBR_TO_NAME[abbrMatch[1]]) {
      fmText = fmText.replace(/(state-abbr:.+)/, `state: "${STATE_ABBR_TO_NAME[abbrMatch[1]]}"\n$1`);
      fixes.state++;
      changed = true;
    }
  }

  // Fix wrong heading levels: ### Who -> ## Who, ### Central Thesis -> ## Central Thesis, etc.
  const majorSections = [
    'Who They Are', 'Who He Is', 'Who She Is', 'Who She Was', 'Who He Was',
    'The Central Thesis', 'Central Thesis',
    'The Core Contradiction', 'Core Contradiction',
    'Donor Class Map', 'The Donor Class Map',
    'Donation-to-Policy Timeline',
    'Class Analysis',
    'Analytical Patterns',
    'Rhetorical Signature Moves',
  ];
  for (const section of majorSections) {
    const pattern = new RegExp(`^### ${section.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\$&')}`, 'gm');
    if (pattern.test(body)) {
      body = body.replace(pattern, `## ${section}`);
      fixes.headings++;
      changed = true;
    }
  }

  // Fix broken callouts: [!money] -> > [!money] (lines not starting with >)
  body = body.replace(/^(\s*)\[!(money|contradiction|warning|info)\]/gm, (match, indent, type) => {
    fixes.callouts++;
    changed = true;
    return `> [!${type}]`;
  });

  // Remove legacy inline donors:: lines
  if (/^donors::/m.test(body)) {
    body = body.replace(/^donors::.*$/gm, '');
    body = body.replace(/\n{3,}/g, '\n\n');
    fixes.donors++;
    changed = true;
  }

  if (changed) {
    fixed++;
    if (!DRY_RUN) {
      fs.writeFileSync(filePath, fmMatch[1] + fmText + fmMatch[3] + body, 'utf-8');
    }
  }

  return changed;
}

console.log(`Mode: ${DRY_RUN ? 'DRY RUN' : 'WRITE'}`);
console.log('Scanning politician profiles...\n');

function walk(dir) {
  try {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) walk(full);
      else if (e.name.endsWith('.md')) processFile(full);
    }
  } catch {}
}

walk(path.join(CONTENT, 'Politicians'));

console.log(`\n=== Results ===`);
console.log(`Profiles fixed: ${fixed}`);
console.log(`  Missing party added: ${fixes.party}`);
console.log(`  Missing chamber added: ${fixes.chamber}`);
console.log(`  Missing state added: ${fixes.state}`);
console.log(`  Wrong heading levels: ${fixes.headings}`);
console.log(`  Broken callouts: ${fixes.callouts}`);
console.log(`  Legacy donors:: removed: ${fixes.donors}`);
