#!/usr/bin/env node
/**
 * committee-assignments-fetch.cjs — Fetch current committee assignments from GovTrack
 *
 * Builds data/committee-assignments.json with:
 * - All current committees (House, Senate, Joint)
 * - Current member assignments with roles (chair, ranking, member)
 * - Mapped to sectors for trade conflict detection
 *
 * Usage:
 *   node scripts/committee-assignments-fetch.cjs
 */
const fs = require('fs');
const path = require('path');
const https = require('https');

const ROOT = path.join(__dirname, '..');
const OUTPUT = path.join(ROOT, 'data', 'committee-assignments.json');

const GOVTRACK_BASE = 'https://www.govtrack.us/api/v2';

let lastReq = 0;
async function throttle() {
  const now = Date.now();
  const wait = Math.max(0, 200 - (now - lastReq));
  if (wait > 0) await new Promise(r => setTimeout(r, wait));
  lastReq = Date.now();
}

function httpGet(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'TheDonorMap/1.0 (thedonormap.org)' } }, (res) => {
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => {
        const body = Buffer.concat(chunks).toString('utf-8');
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try { resolve(JSON.parse(body)); }
          catch { reject(new Error(`JSON parse error from ${url}`)); }
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${url}`));
        }
      });
    }).on('error', reject);
  });
}

// ─── Committee-to-Sector mapping ─────────────────────────────
// Maps committee codes to stock sectors they oversee
// This is the core of the conflict detection

const COMMITTEE_SECTOR_MAP = {
  // House committees
  HSAG: { name: 'Agriculture', sectors: ['agriculture', 'food', 'commodities'] },
  HSAP: { name: 'Appropriations', sectors: ['government', 'defense', 'healthcare'] },
  HSAS: { name: 'Armed Services', sectors: ['defense', 'aerospace', 'cybersecurity'] },
  HSBA: { name: 'Financial Services', sectors: ['banking', 'finance', 'insurance', 'crypto', 'fintech'] },
  HSBU: { name: 'Budget', sectors: ['government', 'finance'] },
  HSED: { name: 'Education and the Workforce', sectors: ['education', 'labor'] },
  HSIF: { name: 'Energy and Commerce', sectors: ['energy', 'oil', 'utilities', 'pharma', 'healthcare', 'telecom', 'tech'] },
  HSFA: { name: 'Foreign Affairs', sectors: ['defense', 'foreign'] },
  HSHA: { name: 'Homeland Security', sectors: ['defense', 'cybersecurity', 'security'] },
  HSII: { name: 'Natural Resources', sectors: ['energy', 'oil', 'mining', 'utilities'] },
  HSJU: { name: 'Judiciary', sectors: ['tech', 'telecom', 'media'] },
  HSPW: { name: 'Transportation and Infrastructure', sectors: ['transport', 'construction', 'infrastructure'] },
  HSSM: { name: 'Small Business', sectors: ['fintech', 'finance'] },
  HSSY: { name: 'Science, Space, and Technology', sectors: ['tech', 'aerospace', 'biotech'] },
  HSVR: { name: 'Veterans\' Affairs', sectors: ['healthcare', 'defense'] },
  HSWM: { name: 'Ways and Means', sectors: ['finance', 'insurance', 'healthcare', 'energy'] },

  // Senate committees
  SSAF: { name: 'Agriculture, Nutrition, and Forestry', sectors: ['agriculture', 'food', 'commodities'] },
  SSAP: { name: 'Appropriations', sectors: ['government', 'defense', 'healthcare'] },
  SSAS: { name: 'Armed Services', sectors: ['defense', 'aerospace', 'cybersecurity'] },
  SSBK: { name: 'Banking, Housing, and Urban Affairs', sectors: ['banking', 'finance', 'insurance', 'crypto', 'fintech', 'real-estate'] },
  SSBU: { name: 'Budget', sectors: ['government', 'finance'] },
  SSCM: { name: 'Commerce, Science, and Transportation', sectors: ['tech', 'telecom', 'transport', 'aerospace', 'media'] },
  SSEG: { name: 'Energy and Natural Resources', sectors: ['energy', 'oil', 'mining', 'utilities'] },
  SSEV: { name: 'Environment and Public Works', sectors: ['energy', 'construction', 'utilities'] },
  SSFI: { name: 'Finance', sectors: ['finance', 'insurance', 'healthcare', 'energy', 'pharma'] },
  SSFR: { name: 'Foreign Relations', sectors: ['defense', 'foreign'] },
  SSGA: { name: 'Homeland Security and Governmental Affairs', sectors: ['defense', 'cybersecurity', 'security', 'government'] },
  SSHR: { name: 'Health, Education, Labor, and Pensions', sectors: ['healthcare', 'pharma', 'biotech', 'education'] },
  SSJU: { name: 'Judiciary', sectors: ['tech', 'telecom', 'media'] },
  SSSB: { name: 'Small Business and Entrepreneurship', sectors: ['fintech', 'finance'] },

  // Joint committees
  JSTX: { name: 'Joint Committee on Taxation', sectors: ['finance', 'insurance'] },
  JSEC: { name: 'Joint Economic Committee', sectors: ['finance', 'banking'] },
};

// ─── Ticker-to-Sector mapping ────────────────────────────────
// Major tickers mapped to sectors for conflict matching

const TICKER_SECTORS = {
  // Defense & Aerospace
  LMT: 'defense', RTX: 'defense', NOC: 'defense', GD: 'defense', BA: 'defense',
  HII: 'defense', LHX: 'defense', LDOS: 'defense', BAH: 'defense',
  PLTR: 'defense', PANW: 'cybersecurity', CRWD: 'cybersecurity',

  // Energy & Oil
  XOM: 'energy', CVX: 'energy', COP: 'energy', EOG: 'energy', SLB: 'energy',
  MPC: 'energy', VLO: 'energy', PSX: 'energy', HES: 'energy', OXY: 'energy',
  HAL: 'energy', DVN: 'energy', FANG: 'energy', APA: 'energy',
  NEE: 'utilities', DUK: 'utilities', SO: 'utilities', D: 'utilities',
  AEP: 'utilities', EXC: 'utilities', SRE: 'utilities', PCG: 'utilities',

  // Banking & Finance
  JPM: 'banking', BAC: 'banking', WFC: 'banking', C: 'banking', GS: 'banking',
  MS: 'banking', USB: 'banking', PNC: 'banking', TFC: 'banking', COF: 'banking',
  SCHW: 'finance', BLK: 'finance', BX: 'finance', KKR: 'finance', APO: 'finance',
  ICE: 'finance', CME: 'finance', NDAQ: 'finance', SPGI: 'finance',
  V: 'fintech', MA: 'fintech', AXP: 'fintech', PYPL: 'fintech', SQ: 'fintech',

  // Insurance
  BRK: 'insurance', 'BRK.B': 'insurance', 'BRK.A': 'insurance',
  UNH: 'insurance', CI: 'insurance', ELV: 'insurance', HUM: 'insurance',
  MET: 'insurance', PRU: 'insurance', AIG: 'insurance', ALL: 'insurance',

  // Healthcare & Pharma
  JNJ: 'healthcare', PFE: 'pharma', MRK: 'pharma', ABBV: 'pharma',
  LLY: 'pharma', BMY: 'pharma', AMGN: 'pharma', GILD: 'pharma',
  BIIB: 'biotech', MRNA: 'biotech', REGN: 'biotech', VRTX: 'biotech',
  TMO: 'healthcare', ABT: 'healthcare', DHR: 'healthcare', MDT: 'healthcare',
  HCA: 'healthcare', CVS: 'healthcare', MCK: 'healthcare', CAH: 'healthcare',
  NVO: 'pharma',

  // Tech
  AAPL: 'tech', MSFT: 'tech', GOOGL: 'tech', GOOG: 'tech', META: 'tech',
  AMZN: 'tech', NVDA: 'tech', TSLA: 'tech', AMD: 'tech', INTC: 'tech',
  CRM: 'tech', ORCL: 'tech', ADBE: 'tech', NFLX: 'tech', SNOW: 'tech',
  NOW: 'tech', SHOP: 'tech', UBER: 'tech', LYFT: 'tech', ABNB: 'tech',
  COIN: 'crypto', MARA: 'crypto', RIOT: 'crypto', MSTR: 'crypto',

  // Telecom & Media
  T: 'telecom', VZ: 'telecom', TMUS: 'telecom', CMCSA: 'telecom',
  DIS: 'media', WBD: 'media', PARA: 'media', NWSA: 'media', FOX: 'media',

  // Transport
  UNP: 'transport', CSX: 'transport', NSC: 'transport', UAL: 'transport',
  DAL: 'transport', LUV: 'transport', AAL: 'transport', FDX: 'transport',
  UPS: 'transport',

  // Agriculture & Food
  ADM: 'agriculture', BG: 'agriculture', DE: 'agriculture', CAT: 'agriculture',
  TSN: 'food', KO: 'food', PEP: 'food', GIS: 'food', K: 'food',
  MCD: 'food', SBUX: 'food', YUM: 'food',

  // Real Estate
  AMT: 'real-estate', PLD: 'real-estate', CCI: 'real-estate', SPG: 'real-estate',
  O: 'real-estate', WELL: 'real-estate', DLR: 'real-estate',

  // Mining
  NEM: 'mining', FCX: 'mining', ALB: 'mining',

  // Construction & Infrastructure
  VMC: 'construction', MLM: 'construction', SHW: 'construction',
};

// ─── Fetch logic ─────────────────────────────────────────────

async function fetchCommittees() {
  const committees = [];
  let offset = 0;
  const limit = 100;

  while (true) {
    await throttle();
    const url = `${GOVTRACK_BASE}/committee?obsolete=false&limit=${limit}&offset=${offset}`;
    const data = await httpGet(url);
    const objs = data.objects || [];

    for (const c of objs) {
      const code = c.code || '';
      const sectorInfo = COMMITTEE_SECTOR_MAP[code];
      committees.push({
        code,
        name: c.name || '',
        type: c.committee_type || '',
        url: c.url || '',
        jurisdiction: c.jurisdiction || '',
        sectors: sectorInfo ? sectorInfo.sectors : [],
        sectorName: sectorInfo ? sectorInfo.name : c.name || '',
      });
    }

    if (objs.length < limit) break;
    offset += limit;
  }

  return committees;
}

async function fetchAllCommitteeMembers() {
  // Fetch ALL committee_member records at once (paginated)
  // Then group by committee code client-side
  const allMembers = [];
  let offset = 0;
  const limit = 100;

  while (true) {
    await throttle();
    const url = `${GOVTRACK_BASE}/committee_member?limit=${limit}&offset=${offset}`;
    try {
      const data = await httpGet(url);
      const objs = data.objects || [];
      const total = data.meta?.total_count || 0;

      for (const m of objs) {
        const person = m.person || {};
        const committee = m.committee || {};
        allMembers.push({
          name: `${person.firstname || ''} ${person.lastname || ''}`.trim() || person.name || '',
          fullName: person.name || '',
          govtrackId: parseInt(String(person.link || '').match(/(\d+)$/)?.[1] || '0'),
          bioguideid: person.bioguideid || '',
          role: m.role || 'member',
          committeeCode: committee.code || '',
          committeeName: committee.name || '',
        });
      }

      console.log(`    Fetched ${offset + objs.length}/${total} assignments...`);
      if (objs.length < limit) break;
      offset += limit;
    } catch (err) {
      console.error(`  Error at offset ${offset}: ${err.message}`);
      break;
    }
  }

  return allMembers;
}

// ─── Main ────────────────────────────────────────────────────

async function main() {
  const startTime = Date.now();
  console.log('═══════════════════════════════════════════════');
  console.log('  Committee Assignments Fetch — GovTrack API');
  console.log('═══════════════════════════════════════════════\n');

  // 1. Fetch all active committees
  console.log('Step 1: Fetching committees...');
  const committees = await fetchCommittees();
  console.log(`  Found ${committees.length} active committees`);

  // 2. Fetch member assignments (GovTrack limits offset to 1000)
  // This gets all Senate committee assignments (~1000 records)
  // House committees would need a different approach
  console.log('\nStep 2: Fetching member assignments (Senate + partial House)...');
  const allMembers = await fetchAllCommitteeMembers();
  console.log(`  Total assignments: ${allMembers.length}`);

  // Group by committee
  const mappedCommittees = committees.filter(c => c.sectors.length > 0);
  console.log(`  ${mappedCommittees.length} committees have sector mappings`);

  let totalMembers = 0;
  for (const committee of mappedCommittees) {
    committee.members = allMembers
      .filter(m => m.committeeCode === committee.code)
      .map(m => ({ name: m.name, fullName: m.fullName, govtrackId: m.govtrackId, bioguideid: m.bioguideid, role: m.role }));
    totalMembers += committee.members.length;
    if (committee.members.length > 0) {
      console.log(`  ${committee.code} (${committee.sectorName}): ${committee.members.length} members [${committee.sectors.join(', ')}]`);
    }
  }

  // 3. Build politician -> committees lookup
  // Index by both full name and first+last for matching
  const polCommittees = {};
  for (const committee of mappedCommittees) {
    for (const member of committee.members || []) {
      // Use simplified name (first last) as key for matching against trade data
      const key = member.name.toLowerCase();
      if (!polCommittees[key]) polCommittees[key] = { name: member.name, committees: [], sectors: new Set() };
      polCommittees[key].committees.push({
        code: committee.code,
        name: committee.sectorName,
        role: member.role,
        sectors: committee.sectors,
      });
      for (const s of committee.sectors) polCommittees[key].sectors.add(s);
    }
  }

  // Serialize sets
  for (const pol of Object.values(polCommittees)) {
    pol.sectors = [...pol.sectors];
  }

  // 4. Save
  const output = {
    lastUpdated: new Date().toISOString(),
    runtime: `${((Date.now() - startTime) / 1000).toFixed(1)}s`,
    stats: {
      totalCommittees: committees.length,
      mappedCommittees: mappedCommittees.length,
      totalMemberAssignments: totalMembers,
      uniqueMembers: Object.keys(polCommittees).length,
    },
    tickerSectors: TICKER_SECTORS,
    committeeSectorMap: COMMITTEE_SECTOR_MAP,
    committees: mappedCommittees,
    politicianCommittees: polCommittees,
  };

  fs.writeFileSync(OUTPUT, JSON.stringify(output, null, 2));

  console.log('\n═══════════════════════════════════════════════');
  console.log(`  DONE`);
  console.log(`  Committees with sector mapping: ${mappedCommittees.length}`);
  console.log(`  Total member assignments: ${totalMembers}`);
  console.log(`  Unique members: ${Object.keys(polCommittees).length}`);
  console.log(`  Runtime: ${output.runtime}`);
  console.log(`  Output: ${OUTPUT}`);
  console.log('═══════════════════════════════════════════════\n');
}

main().catch(err => {
  console.error(`Fatal: ${err.message}`);
  process.exit(1);
});
