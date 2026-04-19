#!/usr/bin/env node
/**
 * sync-campaign-committees.cjs
 *
 * Wires the FEC candidate→committee graph into our entity store. Two
 * outputs per politician profile:
 *
 *   1. Updates entities.jsonl signals with:
 *        signals.fec_candidate_id
 *        signals.fec_committee_ids   // [C00..., C00...]
 *        signals.principal_cmte_id
 *
 *   2. Creates entity records for each principal campaign committee
 *      (CMTE_DSGN=P, primary or A, authorized) so that edges TO those
 *      committees resolve to a real entity with controlled_by back-ref
 *      to the politician. Enables /ask "who funds Donald Trump" to pool
 *      Donald J Trump for President 2024 and MAGA Inc flows into Trump's
 *      pooled total.
 *
 * Matching strategy: exact last-name-first-name match between FEC
 * candidate-master.jsonl "LASTNAME, FIRSTNAME" form and politician
 * frontmatter title. Also requires office code to match chamber (H/S/P).
 *
 * Safe to re-run. Committees created with force:false via addOrFindEntity.
 *
 * Usage:
 *   node scripts/sync-campaign-committees.cjs              # dry-run
 *   node scripts/sync-campaign-committees.cjs --write      # apply
 *   node scripts/sync-campaign-committees.cjs --verbose    # per-match log
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');
const yaml = require('js-yaml');
const { addOrFindEntity, loadEntities, updateEntity } = require('./lib/entities-store.cjs');

const ROOT = path.resolve(__dirname, '..');
const POLITICIANS_DIR = path.join(ROOT, 'content', 'Politicians');
const FEC_ROOT = 'C:/donor-map-data/fec';
const CAND_MASTER = path.join(FEC_ROOT, 'candidate-master.jsonl');
const CAND_CMTE = path.join(FEC_ROOT, 'candidate-committees.jsonl');
const CMTE_MASTER = path.join(FEC_ROOT, 'committee-master.jsonl');

const WRITE = process.argv.includes('--write');
const VERBOSE = process.argv.includes('--verbose');

// ─── helpers ────────────────────────────────────────────────────────
function normalizeName(s) {
  return (s || '').toUpperCase().replace(/[.,]/g, '').replace(/\s+/g, ' ').trim();
}

function titleToFecKey(title) {
  // Vault: "Donald Trump" → FEC: "TRUMP, DONALD" (or "TRUMP, DONALD J").
  // Match both orders so we don't over-constrain.
  const parts = title.split(/\s+/).filter(Boolean);
  if (parts.length < 2) return null;
  const last = normalizeName(parts[parts.length - 1]);
  const first = normalizeName(parts[0]);
  return { last, first, full: normalizeName(title) };
}

function chamberToOffice(chamber) {
  const c = (chamber || '').toLowerCase();
  if (c.startsWith('pres')) return 'P';
  if (c.startsWith('sen')) return 'S';
  if (c.startsWith('hous') || c === 'h') return 'H';
  return null;
}

async function streamJsonl(file, onRow) {
  const rl = readline.createInterface({ input: fs.createReadStream(file) });
  for await (const line of rl) {
    if (!line.trim()) continue;
    try { onRow(JSON.parse(line)); } catch {}
  }
}

// ─── main ───────────────────────────────────────────────────────────
(async function main() {
  console.log(`[sync-campaign-committees] ${WRITE ? 'WRITE' : 'DRY-RUN'}\n`);

  // Walk politicians master profiles
  const politicians = [];
  const stack = [POLITICIANS_DIR];
  while (stack.length) {
    const dir = stack.pop();
    let entries;
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { continue; }
    for (const ent of entries) {
      if (ent.name.startsWith('.')) continue;
      const full = path.join(dir, ent.name);
      if (ent.isDirectory()) stack.push(full);
      else if (/^_.+ Master Profile\.md$/i.test(ent.name)) {
        try {
          const text = fs.readFileSync(full, 'utf-8');
          const m = text.match(/^---\n([\s\S]*?)\n---/);
          if (!m) continue;
          const fm = yaml.load(m[1]) || {};
          if (!fm.title) continue;
          politicians.push({
            title: fm.title,
            chamber: fm.chamber,
            party: fm.party,
            state: fm.state,
            path: full.replace(ROOT + path.sep, '').replace(/\\/g, '/'),
          });
        } catch {}
      }
    }
  }
  console.log(`  politicians scanned: ${politicians.length}`);

  // Load candidate-master, index by (last, first, office)
  console.log('  loading candidate-master...');
  const byNameOffice = new Map();
  await streamJsonl(CAND_MASTER, (r) => {
    if (!r.name || !r.id) return;
    const key = `${normalizeName(r.name)}|${r.office}`;
    if (!byNameOffice.has(key)) byNameOffice.set(key, []);
    byNameOffice.get(key).push(r);
  });
  console.log(`  candidate-master indexed: ${byNameOffice.size} unique (name|office) keys`);

  // Match each politician to FEC candidate records
  const politicianToCandidates = new Map(); // title → [cand_id, ...]
  let matched = 0, unmatched = 0;
  for (const p of politicians) {
    const office = chamberToOffice(p.chamber);
    if (!office) { unmatched++; continue; }
    const key = titleToFecKey(p.title);
    if (!key) { unmatched++; continue; }
    // Try multiple variations of FEC "LAST, FIRST" form
    const variants = [
      `${key.last}, ${key.first}|${office}`,
      `${key.last} ${key.first}|${office}`,
      `${key.full}|${office}`,
    ];
    let hit = null;
    for (const v of variants) {
      if (byNameOffice.has(v)) { hit = byNameOffice.get(v); break; }
    }
    if (!hit) {
      // Fuzzier: any FEC record whose name starts with "LAST, FIRST" prefix
      for (const [k, v] of byNameOffice) {
        if (k.startsWith(`${key.last}, ${key.first}`) && k.endsWith(`|${office}`)) {
          hit = v;
          break;
        }
      }
    }
    if (hit) {
      matched++;
      politicianToCandidates.set(p.title, hit.map((r) => r.id));
      if (VERBOSE) console.log(`  ✓ ${p.title} → ${hit.map((r) => r.id).join(', ')}`);
    } else {
      unmatched++;
      if (VERBOSE) console.log(`  ✗ ${p.title} (${p.chamber}) — no FEC match`);
    }
  }
  console.log(`\n  matched: ${matched}, unmatched: ${unmatched}`);

  // Load candidate-committees.jsonl, filter by matched cand_ids
  const matchedCands = new Set([...politicianToCandidates.values()].flat());
  console.log(`  filtering candidate-committees for ${matchedCands.size} cand_ids...`);
  const candToCmtes = new Map();
  await streamJsonl(CAND_CMTE, (r) => {
    if (!matchedCands.has(r.cand_id)) return;
    if (!candToCmtes.has(r.cand_id)) candToCmtes.set(r.cand_id, []);
    candToCmtes.get(r.cand_id).push(r);
  });
  console.log(`  committee linkages: ${[...candToCmtes.values()].flat().length}`);

  // Load committee-master, index by id (only the ones we need)
  const neededCmteIds = new Set();
  for (const [, links] of candToCmtes) for (const l of links) neededCmteIds.add(l.cmte_id);
  console.log(`  loading committee-master for ${neededCmteIds.size} committees...`);
  const cmteDetails = new Map();
  await streamJsonl(CMTE_MASTER, (r) => {
    if (neededCmteIds.has(r.id)) cmteDetails.set(r.id, r);
  });

  // Pass 1: update politician entities with FEC signals
  const existingEntities = loadEntities();
  const entitiesByName = new Map(existingEntities.map((e) => [e.name, e]));
  let politUpdated = 0;
  let cmteCreated = 0;
  let cmteSkipped = 0;

  for (const [politTitle, candIds] of politicianToCandidates) {
    const politEntity = entitiesByName.get(politTitle);
    if (!politEntity) {
      if (VERBOSE) console.log(`  (no entity record for ${politTitle}, skipping)`);
      continue;
    }
    const allCmtes = new Set();
    for (const candId of candIds) {
      for (const link of candToCmtes.get(candId) || []) allCmtes.add(link.cmte_id);
    }
    // Principal (designation=P or A) committees are the main campaign ones
    const principals = [];
    for (const cmteId of allCmtes) {
      const cm = cmteDetails.get(cmteId);
      if (!cm) continue;
      if (cm.designation === 'P' || cm.designation === 'A') principals.push(cm);
    }
    const patch = {
      signals: {
        fec_candidate_ids: candIds,
        fec_committee_ids: [...allCmtes],
        principal_committee_ids: principals.map((c) => c.id),
      },
    };
    if (WRITE) updateEntity(politEntity.id, patch);
    politUpdated++;
  }
  console.log(`\n  politician entities with FEC signals ${WRITE ? 'updated' : 'would update'}: ${politUpdated}`);

  // Pass 2: create entity stubs ONLY for principal (P) and authorized (A)
  // designation committees — the ones that actually raise campaign funds
  // directly from donors. J (joint fundraising) and U (unauthorized)
  // committees would inflate the entity registry with 500+ records that
  // don't carry first-party donor data.
  for (const [politTitle, candIds] of politicianToCandidates) {
    const politEntity = entitiesByName.get(politTitle);
    if (!politEntity) continue;
    const allCmteIds = new Set();
    for (const candId of candIds) {
      for (const link of candToCmtes.get(candId) || []) allCmteIds.add(link.cmte_id);
    }
    for (const cmteId of allCmteIds) {
      const cm = cmteDetails.get(cmteId);
      if (!cm || !cm.name) continue;
      if (cm.designation !== 'P' && cm.designation !== 'A') continue;
      // Skip if an entity with this name already exists (case-insensitive)
      const normalized = cm.name.trim();
      const existing = entitiesByName.get(normalized) || [...entitiesByName.values()].find((e) => e.name.toUpperCase() === normalized.toUpperCase());
      if (existing) {
        // Add FEC committee ID signal to the existing entity if missing
        if (!existing.signals || !existing.signals.fec_committee_id) {
          if (WRITE) updateEntity(existing.id, {
            signals: {
              fec_committee_id: cm.id,
              controlled_by: politTitle,
              committee_type: cm.type,
              designation: cm.designation,
            },
          });
        }
        cmteSkipped++;
        continue;
      }
      // Create a stub
      if (WRITE) {
        try {
          addOrFindEntity({
            name: normalized,
            entity_type: 'donor',
            signals: {
              sector: 'Campaign Committees',
              fec_committee_id: cm.id,
              controlled_by: politTitle,
              committee_type: cm.type,
              designation: cm.designation,
              connected_org: cm.connected_org || null,
              content_readiness: 'raw',
              stub_reason: 'FEC committee linked to ' + politTitle + ' via candidate-committees.jsonl',
            },
          });
          cmteCreated++;
          entitiesByName.set(normalized, { name: normalized }); // mark seen
        } catch (err) {
          console.error(`  FAILED create ${normalized}: ${err.message}`);
        }
      } else {
        cmteCreated++;
      }
    }
  }
  console.log(`  campaign committees ${WRITE ? 'created' : 'would create'}: ${cmteCreated}`);
  console.log(`  committees already in registry (signals ${WRITE ? 'updated' : 'would update'}): ${cmteSkipped}`);

  if (!WRITE) console.log('\n[dry-run] no writes. Use --write to apply.');
})();
