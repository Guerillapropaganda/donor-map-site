#!/usr/bin/env node
/**
 * bulk-create-politicians.cjs
 * Fetches all current Congress members from Congress.gov API and creates
 * raw stub profiles for any not already in the vault.
 *
 * Usage:
 *   node scripts/bulk-create-politicians.cjs --dry-run   # preview only
 *   node scripts/bulk-create-politicians.cjs              # create profiles
 *
 * Env: CONGRESSAPI or CONGRESS_API_KEY (falls back to DEMO_KEY)
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

const CONTENT = path.resolve(__dirname, '..', 'content');
const POLITICIANS = path.join(CONTENT, 'Politicians');
const DRY_RUN = process.argv.includes('--dry-run');
const API_KEY = process.env.CONGRESSAPI || process.env.CONGRESS_API_KEY || 'DEMO_KEY';
const TODAY = new Date().toISOString().slice(0, 10);

// ── Helpers ──────────────────────────────────────────────────────────────

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function fetchJSON(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { Accept: 'application/json' } }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode !== 200) {
          reject(new Error(`HTTP ${res.statusCode}: ${data.slice(0, 200)}`));
          return;
        }
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(new Error(`JSON parse error: ${e.message}`)); }
      });
      res.on('error', reject);
    }).on('error', reject);
  });
}

function normalizeName(name) {
  return name
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z ]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// Strip middle names/initials for fuzzy matching: "Susan M Collins" -> "Susan Collins"
function normalizeNameNoMiddle(name) {
  const parts = normalizeName(name).split(' ');
  if (parts.length <= 2) return normalizeName(name);
  // Keep first and last name only
  return `${parts[0]} ${parts[parts.length - 1]}`;
}

// Additional variants for dedup matching
function nameVariants(name) {
  const norm = normalizeName(name);
  const noMiddle = normalizeNameNoMiddle(name);
  const variants = [norm, noMiddle];
  // Handle suffixes like "Jr", "Sr", "III", "IV"
  const noSuffix = norm.replace(/\b(jr|sr|ii|iii|iv)\b/g, '').replace(/\s+/g, ' ').trim();
  if (noSuffix !== norm) variants.push(noSuffix);
  const noMiddleNoSuffix = noMiddle.replace(/\b(jr|sr|ii|iii|iv)\b/g, '').replace(/\s+/g, ' ').trim();
  if (noMiddleNoSuffix !== noMiddle) variants.push(noMiddleNoSuffix);
  return variants;
}

function mapParty(partyName) {
  const p = (partyName || '').toLowerCase().trim();
  if (p === 'democrat' || p === 'democratic') return 'Democrat';
  if (p === 'republican') return 'Republican';
  if (p === 'independent' || p === 'libertarian') return 'Independent';
  return 'Independent';
}

function mapPartyFolder(party) {
  if (party === 'Democrat') return 'Democrats';
  if (party === 'Republican') return 'Republicans';
  return 'Independent';
}

function mapChamber(chamberName) {
  const c = (chamberName || '').toLowerCase();
  if (c.includes('house')) return 'House';
  if (c.includes('senate')) return 'Senate';
  return 'House'; // delegates default to House
}

// ── Scan existing vault ──────────────────────────────────────────────────

function scanExistingProfiles() {
  const existing = new Map(); // normalized name variant -> { path, name }
  const bioguideSet = new Set();

  function addName(name, info) {
    for (const v of nameVariants(name)) {
      existing.set(v, info);
    }
  }

  function walkDir(dir) {
    let entries;
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); }
    catch { return; }
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        // Also index the folder name itself as a potential profile name
        if (!['Democrats', 'Republicans', 'Independent', 'SCOTUS', 'International',
              'House', 'Senate', 'Governors', 'Presidential', 'Vice Presidential',
              'Biden Cabinet', 'Trump Cabinet', 'Bush Cabinet', 'Obama Cabinet', 'Former'].includes(entry.name)) {
          addName(entry.name, { path: full, name: entry.name });
        }
        walkDir(full);
      } else if (entry.name.endsWith('.md')) {
        const text = fs.readFileSync(full, 'utf-8');
        const fm = text.match(/^---\n([\s\S]*?)\n---/);
        if (!fm) continue;
        const titleMatch = fm[1].match(/^title:\s*"?(.+?)"?\s*$/m);
        const typeMatch = fm[1].match(/^type:\s*(.+?)\s*$/m);
        const bioguideMatch = fm[1].match(/^bioguide-id:\s*"?(.+?)"?\s*$/m);
        if (!typeMatch || typeMatch[1] !== 'politician') continue;
        if (titleMatch) {
          const name = titleMatch[1].replace(/ Master Profile$/, '');
          addName(name, { path: full, name });
        }
        if (bioguideMatch) {
          bioguideSet.add(bioguideMatch[1].toUpperCase());
        }
      }
    }
  }

  walkDir(POLITICIANS);
  return { existing, bioguideSet };
}

// ── Fetch all current members from Congress.gov ──────────────────────────

const CACHE_FILE = path.resolve(__dirname, '..', '.congress-members-cache.json');
const YAML_URL = 'https://raw.githubusercontent.com/unitedstates/congress-legislators/refs/heads/main/legislators-current.yaml';

async function fetchAllMembers() {
  // Check for cached data (valid for 24 hours)
  if (fs.existsSync(CACHE_FILE)) {
    const stat = fs.statSync(CACHE_FILE);
    const ageHours = (Date.now() - stat.mtimeMs) / (1000 * 60 * 60);
    if (ageHours < 24) {
      const cached = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf-8'));
      console.log(`Using cached data (${cached.length} members, ${ageHours.toFixed(1)}h old)`);
      return cached;
    }
  }

  console.log('Fetching current legislators from unitedstates/congress-legislators...');
  const yaml = require('js-yaml');
  const rawYaml = await new Promise((resolve, reject) => {
    https.get(YAML_URL, res => {
      if (res.statusCode !== 200) { reject(new Error(`HTTP ${res.statusCode}`)); return; }
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => resolve(d));
      res.on('error', reject);
    }).on('error', reject);
  });

  const legislators = yaml.load(rawYaml);
  console.log(`Parsed ${legislators.length} current legislators from YAML`);

  // Transform to our standard format
  const members = legislators.map(leg => {
    const name = leg.name || {};
    const bio = leg.bio || {};
    const ids = leg.id || {};
    const terms = leg.terms || [];
    const current = terms[terms.length - 1] || {};

    return {
      bioguideId: ids.bioguide || '',
      govtrackId: ids.govtrack || null,
      wikidataId: ids.wikidata || '',
      name: `${name.last || ''}, ${name.first || ''}`,
      directOrderName: name.official_full || `${name.first || ''} ${name.last || ''}`,
      firstName: name.first || '',
      lastName: name.last || '',
      partyName: current.party || '',
      state: current.state || '',
      district: current.district != null ? current.district : undefined,
      birthday: bio.birthday || '',
      gender: bio.gender || '',
      terms: { item: terms.map(t => ({ chamber: t.type === 'sen' ? 'Senate' : 'House of Representatives', startYear: parseInt((t.start || '').slice(0, 4)) })) },
      url: current.url || '',
      phone: current.phone || '',
    };
  });

  // Cache results
  fs.writeFileSync(CACHE_FILE, JSON.stringify(members, null, 2));
  console.log(`Cached ${members.length} members to .congress-members-cache.json`);
  return members;
}

// ── Create profile ───────────────────────────────────────────────────────

function buildProfile(member) {
  const firstName = member.firstName || '';
  const lastName = member.lastName || '';
  const directName = member.directOrderName || member.name || `${firstName} ${lastName}`;
  // Clean up name: "LASTNAME, Firstname" -> "Firstname Lastname"
  let name = directName.trim();
  if (name.includes(',') && !name.includes('(')) {
    const parts = name.split(',').map(s => s.trim());
    name = `${parts[1]} ${parts[0]}`;
  }
  // Remove prefix Jr./Sr./III/IV from the start of the name
  name = name.replace(/^(Jr\.?|Sr\.?|III|IV)\s+/i, '');
  // Move suffix Jr./Sr./III/IV/II from middle to end or remove
  name = name.replace(/\s+(Jr\.?|Sr\.?|III|IV|II)$/i, '');
  name = name.replace(/\s+(Jr\.?|Sr\.?|III|IV|II)\s+/i, ' ');
  // Title case — work on word boundaries carefully
  name = name.split(' ').map(w => {
    if (['of', 'the', 'and', 'de', 'la', 'del'].includes(w.toLowerCase())) return w.toLowerCase();
    if (w.toLowerCase() === 'van') return 'van';
    if (w.toLowerCase() === 'von') return 'von';
    // Handle quoted nicknames like "Chuy" or "Hank"
    if (w.startsWith('"') || w.startsWith("'")) {
      const quote = w[0];
      const inner = w.slice(1).replace(/["']$/, '');
      const end = w.endsWith('"') || w.endsWith("'") ? w[w.length-1] : '';
      return quote + inner.charAt(0).toUpperCase() + inner.slice(1).toLowerCase() + end;
    }
    // Preserve existing capitalization for short words or already-mixed-case
    if (w.length <= 2) return w.charAt(0).toUpperCase() + w.slice(1);
    return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
  }).join(' ');
  // Handle hyphenated names: capitalize after hyphen
  name = name.replace(/-(\w)/g, (_, c) => '-' + c.toUpperCase());
  // Fix Mc/Mac/O' patterns
  name = name.replace(/\bMc(\w)/g, (_, c) => 'Mc' + c.toUpperCase());
  name = name.replace(/\bO'(\w)/g, (_, c) => "O'" + c.toUpperCase());
  name = name.replace(/\bDelauro\b/gi, 'DeLauro');
  name = name.replace(/\bDesaulnier\b/gi, 'DeSaulnier');
  // Fix accented name patterns from API
  name = name.replace(/Hernández/gi, 'Hernandez');
  name = name.replace(/Barragán/gi, 'Barragan');
  name = name.replace(/Velázquez/gi, 'Velazquez');
  name = name.replace(/Sánchez/gi, 'Sanchez');
  name = name.replace(/Luján/gi, 'Lujan');
  name = name.replace(/García/gi, 'Garcia');
  // Strip remaining accents for folder names
  name = name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').normalize('NFC');

  const bioguideId = member.bioguideId || '';
  const state = member.state || '';
  const district = member.district != null ? String(member.district) : '';

  // Party overrides for known API misclassifications
  const PARTY_OVERRIDES = {
    'K000401': 'Republican', // Kevin Kiley — CA-3, registered Republican
  };
  const party = PARTY_OVERRIDES[bioguideId] || mapParty(member.partyName || '');

  // Get chamber from terms (most recent term item)
  let chamber = 'House';
  const termsItems = member.terms && member.terms.item ? member.terms.item : (Array.isArray(member.terms) ? member.terms : []);
  if (termsItems.length > 0) {
    const latest = termsItems[termsItems.length - 1];
    chamber = mapChamber(latest.chamber || '');
  } else if (member.district == null) {
    // No district = likely a senator
    chamber = 'Senate';
  }

  // State: could be abbreviation (from YAML) or full name (from API)
  const stateAbbr = state.length === 2 ? state : getStateAbbr(state);
  const stateFull = state.length === 2 ? getStateName(state) : state;

  const partyFolder = mapPartyFolder(party);
  // Strip quotes from folder/file names (Windows doesn't allow " in paths)
  const safeName = name.replace(/"/g, '').replace(/\s+/g, ' ').trim();
  const folderPath = path.join(POLITICIANS, partyFolder, chamber, safeName);
  const filePath = path.join(folderPath, `_${safeName} Master Profile.md`);

  const frontmatter = [
    '---',
    `title: "${safeName} Master Profile"`,
    'type: politician',
    'content-readiness: raw',
    `last-updated: ${TODAY}`,
    'source-tier: 1',
    `party: "${party}"`,
    `chamber: "${chamber}"`,
    `state: "${stateFull}"`,
    `state-abbr: "${stateAbbr}"`,
  ];

  if (chamber === 'House' && district) {
    frontmatter.push(`district: "${district}"`);
  }

  if (bioguideId) {
    frontmatter.push(`bioguide-id: "${bioguideId}"`);
  }

  if (member.govtrackId) {
    frontmatter.push(`govtrack-id: ${member.govtrackId}`);
  }

  if (member.birthday) {
    frontmatter.push(`born: "${member.birthday}"`);
  }

  if (member.wikidataId) {
    frontmatter.push(`wikidata-id: "${member.wikidataId}"`);
  }

  if (member.url) {
    frontmatter.push(`website: "${member.url}"`);
  }

  if (member.phone) {
    frontmatter.push(`phone: "${member.phone}"`);
  }

  frontmatter.push('source-types:');
  frontmatter.push('  - Congress');
  frontmatter.push('known-gaps:');
  frontmatter.push('  - "No FEC contribution data"');
  frontmatter.push('  - "No legislative record"');
  frontmatter.push('  - "No voting record"');
  frontmatter.push('  - "No mapped relationships"');
  frontmatter.push('---');
  frontmatter.push('');
  frontmatter.push(`# ${safeName}`);
  frontmatter.push('');
  frontmatter.push('Profile pending enrichment from FEC, Congress.gov, and GovTrack pipelines.');
  frontmatter.push('');

  return { name: safeName, bioguideId, party, chamber, state: stateFull, stateAbbr, district, folderPath, filePath, content: frontmatter.join('\n') };
}

function getStateName(abbr) {
  const map = {
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
    'WI': 'Wisconsin', 'WY': 'Wyoming', 'DC': 'District of Columbia',
    'AS': 'American Samoa', 'GU': 'Guam', 'MP': 'Northern Mariana Islands',
    'PR': 'Puerto Rico', 'VI': 'U.S. Virgin Islands',
  };
  return map[abbr] || abbr;
}

function getStateAbbr(state) {
  const map = {
    'Alabama': 'AL', 'Alaska': 'AK', 'Arizona': 'AZ', 'Arkansas': 'AR',
    'California': 'CA', 'Colorado': 'CO', 'Connecticut': 'CT', 'Delaware': 'DE',
    'Florida': 'FL', 'Georgia': 'GA', 'Hawaii': 'HI', 'Idaho': 'ID',
    'Illinois': 'IL', 'Indiana': 'IN', 'Iowa': 'IA', 'Kansas': 'KS',
    'Kentucky': 'KY', 'Louisiana': 'LA', 'Maine': 'ME', 'Maryland': 'MD',
    'Massachusetts': 'MA', 'Michigan': 'MI', 'Minnesota': 'MN', 'Mississippi': 'MS',
    'Missouri': 'MO', 'Montana': 'MT', 'Nebraska': 'NE', 'Nevada': 'NV',
    'New Hampshire': 'NH', 'New Jersey': 'NJ', 'New Mexico': 'NM', 'New York': 'NY',
    'North Carolina': 'NC', 'North Dakota': 'ND', 'Ohio': 'OH', 'Oklahoma': 'OK',
    'Oregon': 'OR', 'Pennsylvania': 'PA', 'Rhode Island': 'RI', 'South Carolina': 'SC',
    'South Dakota': 'SD', 'Tennessee': 'TN', 'Texas': 'TX', 'Utah': 'UT',
    'Vermont': 'VT', 'Virginia': 'VA', 'Washington': 'WA', 'West Virginia': 'WV',
    'Wisconsin': 'WI', 'Wyoming': 'WY', 'District of Columbia': 'DC',
    'American Samoa': 'AS', 'Guam': 'GU', 'Northern Mariana Islands': 'MP',
    'Puerto Rico': 'PR', 'U.S. Virgin Islands': 'VI',
  };
  return map[state] || '';
}

// ── Main ─────────────────────────────────────────────────────────────────

async function main() {
  console.log(`\n=== Bulk Create Politicians ===`);
  console.log(`Mode: ${DRY_RUN ? 'DRY RUN (no files created)' : 'LIVE (creating files)'}`);
  console.log(`Date: ${TODAY}\n`);

  // Step 1: Scan existing
  console.log('Scanning existing vault profiles...');
  const { existing, bioguideSet } = scanExistingProfiles();
  console.log(`Found ${existing.size} existing politician profiles, ${bioguideSet.size} bioguide IDs\n`);

  // Step 2: Fetch from Congress.gov
  const members = await fetchAllMembers();

  // Step 3: Dedup and create
  let created = 0, skipped = 0, errors = 0;
  const createdList = [];
  const skippedList = [];

  for (const member of members) {
    try {
      const profile = buildProfile(member);

      // Dedup check: by name variants (full name, first+last, no suffix)
      const variants = nameVariants(profile.name);
      let dupFound = false;
      for (const v of variants) {
        if (existing.has(v)) {
          skippedList.push(`${profile.name} (name match: "${v}" -> ${existing.get(v).name})`);
          skipped++;
          dupFound = true;
          break;
        }
      }
      if (dupFound) continue;

      // Dedup check: by bioguide ID
      if (profile.bioguideId && bioguideSet.has(profile.bioguideId.toUpperCase())) {
        skippedList.push(`${profile.name} (bioguide match: ${profile.bioguideId})`);
        skipped++;
        continue;
      }

      if (!DRY_RUN) {
        fs.mkdirSync(profile.folderPath, { recursive: true });
        fs.writeFileSync(profile.filePath, profile.content, 'utf-8');
      }

      createdList.push(`${profile.party}/${profile.chamber}/${profile.name} (${profile.stateAbbr}${profile.district ? '-' + profile.district : ''}) [${profile.bioguideId}]`);
      created++;

      // Add to sets so we don't create dupes within this run
      for (const v of variants) {
        existing.set(v, { path: profile.filePath, name: profile.name });
      }
      if (profile.bioguideId) bioguideSet.add(profile.bioguideId.toUpperCase());

    } catch (e) {
      console.error(`ERROR processing member:`, member.name || member.directOrderName, e.message);
      errors++;
    }
  }

  // Report
  console.log(`\n=== Results ===`);
  console.log(`Created: ${created}`);
  console.log(`Skipped (duplicates): ${skipped}`);
  console.log(`Errors: ${errors}`);

  if (createdList.length > 0) {
    console.log(`\n--- New profiles ${DRY_RUN ? '(would create)' : '(created)'} ---`);
    // Group by party/chamber
    const groups = {};
    for (const entry of createdList) {
      const key = entry.split('/').slice(0, 2).join('/');
      if (!groups[key]) groups[key] = [];
      groups[key].push(entry);
    }
    for (const [group, entries] of Object.entries(groups).sort()) {
      console.log(`\n${group} (${entries.length}):`);
      for (const e of entries) {
        console.log(`  ${e.split('/').pop()}`);
      }
    }
  }

  if (skippedList.length > 0 && process.argv.includes('--verbose')) {
    console.log(`\n--- Skipped ---`);
    for (const s of skippedList) console.log(`  ${s}`);
  }

  console.log(`\nTotal vault politician profiles: ${existing.size}`);
}

main().catch(e => {
  console.error('Fatal error:', e);
  process.exit(1);
});
