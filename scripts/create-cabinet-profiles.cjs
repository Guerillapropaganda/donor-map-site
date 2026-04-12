#!/usr/bin/env node
/**
 * create-cabinet-profiles.cjs
 * Creates raw stub profiles for Biden Cabinet and Obama Cabinet members
 * who don't already exist in the vault.
 */

const fs = require('fs');
const path = require('path');

const CONTENT = path.resolve(__dirname, '..', 'content', 'Politicians');
const TODAY = new Date().toISOString().slice(0, 10);
const DRY_RUN = process.argv.includes('--dry-run');

// ── Cabinet member definitions ───────────────────────────────────────────

const BIDEN_CABINET = [
  // Already exist: Kamala Harris, Pete Buttigieg
  { name: 'Antony Blinken', position: 'Secretary of State', party: 'Democrat' },
  { name: 'Janet Yellen', position: 'Secretary of the Treasury', party: 'Democrat' },
  { name: 'Lloyd Austin', position: 'Secretary of Defense', party: 'Independent' },
  { name: 'Merrick Garland', position: 'Attorney General', party: 'Independent' },
  { name: 'Deb Haaland', position: 'Secretary of the Interior', party: 'Democrat' },
  { name: 'Tom Vilsack', position: 'Secretary of Agriculture', party: 'Democrat' },
  { name: 'Gina Raimondo', position: 'Secretary of Commerce', party: 'Democrat' },
  { name: 'Marty Walsh', position: 'Secretary of Labor (2021-2023)', party: 'Democrat' },
  { name: 'Julie Su', position: 'Acting Secretary of Labor (2023-2025)', party: 'Democrat' },
  { name: 'Xavier Becerra', position: 'Secretary of HHS', party: 'Democrat' },
  { name: 'Marcia Fudge', position: 'Secretary of HUD (2021-2024)', party: 'Democrat' },
  { name: 'Jennifer Granholm', position: 'Secretary of Energy', party: 'Democrat' },
  { name: 'Miguel Cardona', position: 'Secretary of Education', party: 'Democrat' },
  { name: 'Denis McDonough', position: 'Secretary of Veterans Affairs', party: 'Democrat' },
  { name: 'Alejandro Mayorkas', position: 'Secretary of Homeland Security', party: 'Democrat' },
  { name: 'Avril Haines', position: 'Director of National Intelligence', party: 'Independent' },
  { name: 'William Burns', position: 'CIA Director', party: 'Independent' },
  { name: 'Katherine Tai', position: 'U.S. Trade Representative', party: 'Democrat' },
  { name: 'Linda Thomas-Greenfield', position: 'UN Ambassador', party: 'Democrat' },
  { name: 'Isabel Guzman', position: 'SBA Administrator', party: 'Democrat' },
  { name: 'Michael Regan', position: 'EPA Administrator', party: 'Democrat' },
  { name: 'Shalanda Young', position: 'OMB Director', party: 'Democrat' },
];

const OBAMA_CABINET = [
  // Already exist: Joe Biden (VP), Hillary Clinton (Senate folder)
  // Note: Tom Vilsack and Denis McDonough served in both — will be in Biden Cabinet folder
  { name: 'John Kerry', position: 'Secretary of State (2013-2017)', party: 'Democrat' },
  { name: 'Timothy Geithner', position: 'Secretary of the Treasury (2009-2013)', party: 'Independent' },
  { name: 'Jack Lew', position: 'Secretary of the Treasury (2013-2017)', party: 'Democrat' },
  { name: 'Robert Gates', position: 'Secretary of Defense (2006-2011)', party: 'Republican' },
  { name: 'Leon Panetta', position: 'Secretary of Defense (2011-2013)', party: 'Democrat' },
  { name: 'Chuck Hagel', position: 'Secretary of Defense (2013-2015)', party: 'Republican' },
  { name: 'Ash Carter', position: 'Secretary of Defense (2015-2017)', party: 'Independent' },
  { name: 'Eric Holder', position: 'Attorney General (2009-2015)', party: 'Democrat' },
  { name: 'Loretta Lynch', position: 'Attorney General (2015-2017)', party: 'Democrat' },
  { name: 'Ken Salazar', position: 'Secretary of the Interior (2009-2013)', party: 'Democrat' },
  { name: 'Sally Jewell', position: 'Secretary of the Interior (2013-2017)', party: 'Democrat' },
  { name: 'Gary Locke', position: 'Secretary of Commerce (2009-2011)', party: 'Democrat' },
  { name: 'Penny Pritzker', position: 'Secretary of Commerce (2013-2017)', party: 'Democrat' },
  { name: 'Hilda Solis', position: 'Secretary of Labor (2009-2013)', party: 'Democrat' },
  { name: 'Tom Perez', position: 'Secretary of Labor (2013-2017)', party: 'Democrat' },
  { name: 'Kathleen Sebelius', position: 'Secretary of HHS (2009-2014)', party: 'Democrat' },
  { name: 'Sylvia Mathews Burwell', position: 'Secretary of HHS (2014-2017)', party: 'Democrat' },
  { name: 'Shaun Donovan', position: 'Secretary of HUD (2009-2014)', party: 'Democrat' },
  { name: 'Julian Castro', position: 'Secretary of HUD (2014-2017)', party: 'Democrat' },
  { name: 'Ray LaHood', position: 'Secretary of Transportation (2009-2013)', party: 'Republican' },
  { name: 'Anthony Foxx', position: 'Secretary of Transportation (2013-2017)', party: 'Democrat' },
  { name: 'Steven Chu', position: 'Secretary of Energy (2009-2013)', party: 'Democrat' },
  { name: 'Ernest Moniz', position: 'Secretary of Energy (2013-2017)', party: 'Democrat' },
  { name: 'Arne Duncan', position: 'Secretary of Education (2009-2016)', party: 'Democrat' },
  { name: 'Eric Shinseki', position: 'Secretary of Veterans Affairs (2009-2014)', party: 'Independent' },
  { name: 'Janet Napolitano', position: 'Secretary of Homeland Security (2009-2013)', party: 'Democrat' },
  { name: 'Jeh Johnson', position: 'Secretary of Homeland Security (2013-2017)', party: 'Democrat' },
  { name: 'Susan Rice', position: 'UN Ambassador (2009-2013), National Security Advisor (2013-2017)', party: 'Democrat' },
  { name: 'Samantha Power', position: 'UN Ambassador (2013-2017)', party: 'Democrat' },
  { name: 'Lisa Jackson', position: 'EPA Administrator (2009-2013)', party: 'Democrat' },
  { name: 'Gina McCarthy', position: 'EPA Administrator (2013-2017)', party: 'Democrat' },
  { name: 'Rahm Emanuel', position: 'Chief of Staff (2009-2010)', party: 'Democrat' },
];

// Trump Cabinet additions (missing from current vault)
const TRUMP_CABINET_ADDITIONS = [
  { name: 'Robert Lighthizer', position: 'U.S. Trade Representative', party: 'Republican', cabinet: 'Trump Cabinet' },
  { name: 'Ben Carson', position: 'Secretary of HUD', party: 'Republican', cabinet: 'Trump Cabinet' },
  { name: 'Jeff Sessions', position: 'Attorney General (2017-2018)', party: 'Republican', cabinet: 'Trump Cabinet' },
  { name: 'William Barr', position: 'Attorney General (2019-2020)', party: 'Republican', cabinet: 'Trump Cabinet' },
  { name: 'Betsy DeVos', position: 'Secretary of Education', party: 'Republican', cabinet: 'Trump Cabinet' },
  { name: 'Ryan Zinke', position: 'Secretary of the Interior (2017-2019)', party: 'Republican', cabinet: 'Trump Cabinet' },
  { name: 'Steven Mnuchin', position: 'Secretary of the Treasury', party: 'Republican', cabinet: 'Trump Cabinet' },
  { name: 'Wilbur Ross', position: 'Secretary of Commerce', party: 'Republican', cabinet: 'Trump Cabinet' },
  { name: 'Rick Perry', position: 'Secretary of Energy', party: 'Republican', cabinet: 'Trump Cabinet' },
  { name: 'Sonny Perdue', position: 'Secretary of Agriculture', party: 'Republican', cabinet: 'Trump Cabinet' },
  { name: 'Nikki Haley', position: 'UN Ambassador', party: 'Republican', cabinet: 'Trump Cabinet' },
  { name: 'Mark Esper', position: 'Secretary of Defense (2019-2020)', party: 'Republican', cabinet: 'Trump Cabinet' },
  { name: 'James Mattis', position: 'Secretary of Defense (2017-2019)', party: 'Independent', cabinet: 'Trump Cabinet' },
  { name: 'John Kelly', position: 'Secretary of Homeland Security / Chief of Staff', party: 'Independent', cabinet: 'Trump Cabinet' },
  { name: 'Elaine Chao', position: 'Secretary of Transportation', party: 'Republican', cabinet: 'Trump Cabinet' },
  { name: 'Robert Wilkie', position: 'Secretary of Veterans Affairs (2018-2021)', party: 'Republican', cabinet: 'Trump Cabinet' },
  { name: 'Alex Azar', position: 'Secretary of HHS (2018-2021)', party: 'Republican', cabinet: 'Trump Cabinet' },
  { name: 'Gina Haspel', position: 'CIA Director (2018-2021)', party: 'Independent', cabinet: 'Trump Cabinet' },
  { name: 'Dan Coats', position: 'Director of National Intelligence (2017-2019)', party: 'Republican', cabinet: 'Trump Cabinet' },
];

// ── Helpers ──────────────────────────────────────────────────────────────

function normalizeName(name) {
  return name.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/[^a-z ]/g, '').replace(/\s+/g, ' ').trim();
}

function scanExisting() {
  const names = new Set();
  function walk(dir) {
    try {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          // Index folder names as potential profile names
          names.add(normalizeName(entry.name));
          walk(full);
        }
      }
    } catch {}
  }
  walk(CONTENT);
  return names;
}

function createProfile(name, position, party, folder) {
  const partyFolder = party === 'Republican' ? 'Republicans' : 'Democrats';
  const folderPath = path.join(CONTENT, partyFolder, folder, name);
  const filePath = path.join(folderPath, `_${name} Master Profile.md`);

  const content = `---
title: "${name} Master Profile"
type: politician
content-readiness: raw
last-updated: ${TODAY}
source-tier: 1
party: "${party}"
chamber: "${position}"
known-gaps:
  - "No mapped relationships"
  - "No donor network analysis"
source-types:
  - Congress
---

# ${name}

${position}. Profile pending enrichment.
`;

  return { folderPath, filePath, content };
}

// ── Main ─────────────────────────────────────────────────────────────────

const existing = scanExisting();
console.log(`Found ${existing.size} existing profile names`);
console.log(`Mode: ${DRY_RUN ? 'DRY RUN' : 'LIVE'}\n`);

let created = 0, skipped = 0;

function processGroup(label, members, folder) {
  console.log(`\n--- ${label} ---`);
  for (const m of members) {
    const cabinetFolder = m.cabinet || folder;
    const norm = normalizeName(m.name);
    if (existing.has(norm)) {
      console.log(`  SKIP: ${m.name} (already exists)`);
      skipped++;
      continue;
    }

    // Also check first+last only
    const parts = norm.split(' ');
    const firstLast = parts.length > 2 ? `${parts[0]} ${parts[parts.length-1]}` : norm;
    if (existing.has(firstLast) && firstLast !== norm) {
      console.log(`  SKIP: ${m.name} (name match: ${firstLast})`);
      skipped++;
      continue;
    }

    const profile = createProfile(m.name, m.position, m.party === 'Independent' ? 'Democrat' : m.party, cabinetFolder);
    if (!DRY_RUN) {
      fs.mkdirSync(profile.folderPath, { recursive: true });
      fs.writeFileSync(profile.filePath, profile.content, 'utf-8');
    }
    console.log(`  CREATE: ${m.name} -> ${cabinetFolder}`);
    existing.add(norm);
    if (firstLast !== norm) existing.add(firstLast);
    created++;
  }
}

processGroup('Biden Cabinet', BIDEN_CABINET, 'Biden Cabinet');
processGroup('Obama Cabinet', OBAMA_CABINET, 'Obama Cabinet');
processGroup('Trump Cabinet (additions)', TRUMP_CABINET_ADDITIONS, 'Trump Cabinet');

console.log(`\n=== Results ===`);
console.log(`Created: ${created}`);
console.log(`Skipped: ${skipped}`);
