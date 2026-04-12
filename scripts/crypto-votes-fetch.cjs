#!/usr/bin/env node
/**
 * crypto-votes-fetch.cjs — Fetch crypto-related bill votes from GovTrack
 *
 * Builds data/crypto-votes.json with:
 * - Known crypto bills (FIT21, GENIUS Act, CBDC, stablecoin, etc.)
 * - Roll call votes on those bills
 * - Individual member votes (yea/nay)
 *
 * Usage:
 *   node scripts/crypto-votes-fetch.cjs
 *   node scripts/crypto-votes-fetch.cjs --refresh   # re-fetch all
 */
const fs = require('fs');
const path = require('path');
const https = require('https');

const ROOT = path.join(__dirname, '..');
const OUTPUT = path.join(ROOT, 'data', 'crypto-votes.json');

const GOVTRACK_BASE = 'https://www.govtrack.us/api/v2';

// Rate limit: 15 req/sec, we'll do ~5/sec to be safe
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

// ─── Known crypto bills ──────────────────────────────────────

// We search GovTrack for these and also hardcode known bill numbers
const CRYPTO_SEARCH_TERMS = [
  'cryptocurrency', 'digital asset', 'stablecoin', 'bitcoin',
  'blockchain', 'virtual currency', 'crypto', 'CBDC',
  'central bank digital currency',
];

// Known major crypto bills by congress/type/number
const KNOWN_CRYPTO_BILLS = [
  // 118th Congress (2023-2025)
  { congress: 118, type: 'house_bill', number: 4763, name: 'FIT21 (Financial Innovation and Technology for the 21st Century Act)' },
  { congress: 118, type: 'house_bill', number: 5403, name: 'CBDC Anti-Surveillance State Act' },
  { congress: 118, type: 'senate_bill', number: 4766, name: 'Lummis-Gillibrand Responsible Financial Innovation Act' },
  { congress: 118, type: 'house_bill', number: 4841, name: 'Clarity for Payment Stablecoins Act' },
  { congress: 118, type: 'house_bill', number: 1747, name: 'Blockchain Regulatory Certainty Act' },
  { congress: 118, type: 'senate_bill', number: 2281, name: 'Digital Asset Anti-Money Laundering Act' },
  // 119th Congress (2025-2027)
  { congress: 119, type: 'senate_bill', number: 1582, name: 'GENIUS Act (Guiding and Establishing National Innovation for U.S. Stablecoins)' },
  { congress: 119, type: 'house_bill', number: 2392, name: 'STABLE Act' },
  { congress: 119, type: 'house_bill', number: 148, name: 'CBDC Anti-Surveillance State Act (119th)' },
];

// ─── Fetch logic ─────────────────────────────────────────────

async function searchBills(term, congress) {
  await throttle();
  const url = `${GOVTRACK_BASE}/bill?q=${encodeURIComponent(term)}&congress=${congress}&limit=20`;
  try {
    const data = await httpGet(url);
    return (data.objects || []).map(b => ({
      id: parseInt(String(b.link || '').match(/(\d+)$/)?.[1] || '0'),
      congress: b.congress,
      type: b.bill_type,
      number: b.number,
      title: b.title_without_number || b.title || '',
      displayNumber: b.display_number || '',
      introduced: b.introduced_date || '',
      status: b.current_status_label || b.current_status || '',
      isAlive: b.is_alive || false,
      sponsor: b.sponsor ? {
        name: b.sponsor.name || '',
        party: b.sponsor.party || '',
        state: b.sponsor.state || '',
        govtrackId: parseInt(String(b.sponsor.link || '').match(/(\d+)$/)?.[1] || '0'),
        bioguideid: b.sponsor.bioguideid || '',
      } : null,
      link: b.link || '',
    }));
  } catch (err) {
    console.error(`  Search failed for "${term}" congress=${congress}: ${err.message}`);
    return [];
  }
}

async function fetchBillByNumber(congress, billType, number) {
  await throttle();
  const url = `${GOVTRACK_BASE}/bill?congress=${congress}&bill_type=${billType}&number=${number}&limit=5`;
  try {
    const data = await httpGet(url);
    const b = (data.objects || [])[0];
    if (!b) return null;
    return {
      id: parseInt(String(b.link || '').match(/(\d+)$/)?.[1] || '0'),
      congress: b.congress,
      type: b.bill_type,
      number: b.number,
      title: b.title_without_number || b.title || '',
      displayNumber: b.display_number || '',
      introduced: b.introduced_date || '',
      status: b.current_status_label || b.current_status || '',
      isAlive: b.is_alive || false,
      sponsor: b.sponsor ? {
        name: b.sponsor.name || '',
        party: b.sponsor.party || '',
        state: b.sponsor.state || '',
        govtrackId: parseInt(String(b.sponsor.link || '').match(/(\d+)$/)?.[1] || '0'),
        bioguideid: b.sponsor.bioguideid || '',
      } : null,
      link: b.link || '',
    };
  } catch (err) {
    console.error(`  Fetch bill ${billType} ${number} (${congress}th): ${err.message}`);
    return null;
  }
}

async function fetchVotesForBill(billId) {
  if (!billId) return [];
  await throttle();
  const url = `${GOVTRACK_BASE}/vote?related_bill=${billId}&limit=20`;
  try {
    const data = await httpGet(url);
    return (data.objects || []).map(v => ({
      id: parseInt(String(v.link || '').match(/(\d+)$/)?.[1] || '0'),
      congress: v.congress,
      chamber: v.chamber_label || v.chamber || '',
      session: v.session,
      number: v.number,
      date: v.created || '',
      question: v.question || '',
      result: v.result || '',
      passed: v.passed || false,
      yeas: v.total_plus || 0,
      nays: v.total_minus || 0,
      notVoting: v.total_other || 0,
      link: v.link || '',
    }));
  } catch (err) {
    console.error(`  Fetch votes for bill ${billId}: ${err.message}`);
    return [];
  }
}

async function fetchVoters(voteId) {
  if (!voteId) return [];
  const voters = [];
  let offset = 0;
  const limit = 100;

  while (true) {
    await throttle();
    const url = `${GOVTRACK_BASE}/vote_voter?vote=${voteId}&limit=${limit}&offset=${offset}`;
    try {
      const data = await httpGet(url);
      const objs = data.objects || [];
      for (const vv of objs) {
        const person = vv.person || {};
        voters.push({
          name: person.name || '',
          party: (vv.person_role || {}).party || '',
          state: (vv.person_role || {}).state || '',
          govtrackId: parseInt(String(person.link || '').match(/(\d+)$/)?.[1] || '0'),
          bioguideid: person.bioguideid || '',
          vote: vv.option?.key || '?', // + = yea, - = nay, 0 = not voting
          voteLabel: vv.option?.value || 'Unknown',
        });
      }
      if (objs.length < limit) break;
      offset += limit;
    } catch (err) {
      console.error(`  Fetch voters for vote ${voteId} offset=${offset}: ${err.message}`);
      break;
    }
  }

  return voters;
}

// ─── Main ────────────────────────────────────────────────────

async function main() {
  const startTime = Date.now();
  console.log('═══════════════════════════════════════════════');
  console.log('  Crypto Votes Fetch — GovTrack API');
  console.log('═══════════════════════════════════════════════\n');

  const allBills = new Map(); // billId -> bill object

  // 1. Fetch known bills by number
  console.log('Step 1: Fetching known crypto bills...');
  for (const kb of KNOWN_CRYPTO_BILLS) {
    const bill = await fetchBillByNumber(kb.congress, kb.type, kb.number);
    if (bill && bill.id) {
      bill.knownName = kb.name;
      allBills.set(bill.id, bill);
      console.log(`  ✓ ${kb.name}: ${bill.displayNumber} — ${bill.status}`);
    } else {
      console.log(`  ✗ ${kb.name}: not found`);
    }
  }

  // 2. Search for more crypto bills
  console.log('\nStep 2: Searching for additional crypto bills...');
  for (const congress of [118, 119]) {
    for (const term of CRYPTO_SEARCH_TERMS) {
      const results = await searchBills(term, congress);
      for (const bill of results) {
        if (bill.id && !allBills.has(bill.id)) {
          allBills.set(bill.id, bill);
        }
      }
    }
  }
  console.log(`  Found ${allBills.size} total crypto-related bills`);

  // 3. Fetch roll call votes for each bill
  console.log('\nStep 3: Fetching roll call votes...');
  const billsWithVotes = [];
  let totalVotes = 0;

  for (const [billId, bill] of allBills) {
    const votes = await fetchVotesForBill(billId);
    if (votes.length > 0) {
      totalVotes += votes.length;
      console.log(`  ${bill.displayNumber || bill.knownName}: ${votes.length} vote(s)`);

      // Fetch individual member votes for each roll call
      for (const vote of votes) {
        console.log(`    Fetching ${vote.chamber} vote #${vote.number} (${vote.date})...`);
        vote.voters = await fetchVoters(vote.id);
        console.log(`      ${vote.voters.length} member votes (${vote.yeas}Y-${vote.nays}N)`);
      }

      billsWithVotes.push({ ...bill, votes });
    }
  }

  // 4. Also include bills without roll call votes (committee votes, etc.)
  const billsWithoutVotes = [];
  for (const [billId, bill] of allBills) {
    if (!billsWithVotes.find(b => b.id === billId)) {
      billsWithoutVotes.push(bill);
    }
  }

  // 5. Save
  const output = {
    lastUpdated: new Date().toISOString(),
    runtime: `${((Date.now() - startTime) / 1000).toFixed(1)}s`,
    stats: {
      totalBills: allBills.size,
      billsWithVotes: billsWithVotes.length,
      totalRollCallVotes: totalVotes,
      totalMemberVotes: billsWithVotes.reduce((s, b) => s + b.votes.reduce((vs, v) => vs + (v.voters?.length || 0), 0), 0),
    },
    billsWithVotes,
    billsWithoutVotes,
  };

  fs.writeFileSync(OUTPUT, JSON.stringify(output, null, 2));

  console.log('\n═══════════════════════════════════════════════');
  console.log(`  DONE`);
  console.log(`  Bills found: ${allBills.size}`);
  console.log(`  Bills with roll call votes: ${billsWithVotes.length}`);
  console.log(`  Total roll call votes: ${totalVotes}`);
  console.log(`  Total member votes: ${output.stats.totalMemberVotes}`);
  console.log(`  Runtime: ${output.runtime}`);
  console.log(`  Output: ${OUTPUT}`);
  console.log('═══════════════════════════════════════════════\n');
}

main().catch(err => {
  console.error(`Fatal: ${err.message}`);
  process.exit(1);
});
