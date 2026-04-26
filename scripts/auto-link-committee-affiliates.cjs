#!/usr/bin/env node
/**
 * auto-link-committee-affiliates.cjs
 *
 * Systematic pass finding parent-affiliate committee pairs and wiring
 * them into entity signals + MANUAL_VEHICLE_MAP suggestions.
 *
 * SEMANTIC RULE (post-2026-04-25 architecture fix):
 *   `signals.fec_committee_ids` denotes committees that ARE the entity —
 *   different cycle / state / building-fund accounts that share the
 *   entity's legal identity. Money attributed to any ID in this array
 *   counts as money to/from the entity.
 *
 *   It does NOT denote committees that merely declare the entity as
 *   their `connected_org` in FEC committee-master. FEC's connected_org
 *   field is overloaded — it's used by genuine subsidiaries AND by
 *   committees that just share a treasurer/fundraising vendor with the
 *   parent (Resolute Courage PAC declared Equality Project PAC as its
 *   connected_org despite being a separate PAC). Treating connected_org
 *   matches as identity-merge contaminated 39 entities and inflated
 *   their money totals with funds that legally belong to other PACs.
 *
 * Two signals used:
 *
 *   1. Name-stem match — "X Action Fund", "X Victory Fund",
 *      "X Political Committee" are near-universal conventions for the
 *      super-PAC or c4 arm of a parent org. STRONG identity signal —
 *      writes to fec_committee_ids.
 *
 *   2. FEC committee-master.connected_org — declares affiliation but
 *      does NOT prove identity. WEAK signal — reported only, never
 *      written to entity records. Surfaced in the MANUAL_VEHICLE_MAP
 *      output for /ask vehicle-pooling at QUERY time, where the user
 *      can opt in to "show me all money flowing through anything
 *      affiliated with this org."
 *
 * Output:
 *   - Updates entities.jsonl (signals.fec_committee_ids) — name-stem only
 *   - Prints MANUAL_VEHICLE_MAP deltas — both signals
 *   - Prints AFFILIATE-ONLY report — connected_org-only matches
 *
 * Usage:
 *   node scripts/auto-link-committee-affiliates.cjs             # dry-run
 *   node scripts/auto-link-committee-affiliates.cjs --write     # apply entity updates
 *   node scripts/auto-link-committee-affiliates.cjs --report    # full report
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { loadEntities, updateEntity, addOrFindEntity } = require('./lib/entities-store.cjs');

const ROOT = path.resolve(__dirname, '..');
const FEC_ROOT = 'C:/donor-map-data/fec';
const args = process.argv.slice(2);
const WRITE = args.includes('--write');
const REPORT = args.includes('--report');

// Normalize a name for fuzzy matching. Strips common PAC suffixes so
// "NRA PVF" and "National Rifle Association" collapse onto the same
// stem. Case-folds, removes punctuation, collapses whitespace.
// Iteratively strips trailing suffixes so "PFIZER INC. PAC" → "PFIZER"
// (collapses both INC and PAC, not just one).
function normalize(s) {
  if (!s) return '';
  let out = s
    .toUpperCase()
    .replace(/[.,'()]/g, ' ')
    .replace(/\s+POLITICAL\s+ACTION\s+COMMITTEE\b/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  const SUFFIX = /\s+(PAC|PVF|ACTION\s+FUND|VICTORY\s+FUND|ACTION\s+COMMITTEE|ACTION|FUND|SUPER\s+PAC|C4|C5|INC|LLC|CORP|CORPORATION|CO|COMPANY|GROUP|GROUP\s+INC)\s*$/;
  let prev;
  do {
    prev = out;
    out = out.replace(SUFFIX, '').replace(/\s+/g, ' ').trim();
  } while (out !== prev && out.length > 0);
  return out;
}

(async function main() {
  console.log(`[auto-link-committee-affiliates] ${WRITE ? 'WRITE' : 'DRY-RUN'}\n`);

  const ents = loadEntities();
  // Index entity names (and their normalized form) for fuzzy lookup.
  // Exclude politicians — their committees are already linked via
  // sync-campaign-committees.
  const entByNormName = new Map();
  for (const e of ents) {
    if (e.entity_type === 'politician') continue;
    const norm = normalize(e.name);
    if (!norm) continue;
    // If multiple entities normalize the same way, prefer the one
    // without a PAC/fund suffix (i.e. the "parent").
    if (!entByNormName.has(norm) || e.name.length < entByNormName.get(norm).name.length) {
      entByNormName.set(norm, e);
    }
  }
  console.log(`  entities indexed by normalized name: ${entByNormName.size}`);

  // Already-linked committee IDs (don't double-link)
  const alreadyLinked = new Set();
  for (const e of ents) {
    if (e.signals?.fec_committee_id) alreadyLinked.add(e.signals.fec_committee_id);
    if (Array.isArray(e.signals?.fec_committee_ids)) {
      for (const cid of e.signals.fec_committee_ids) alreadyLinked.add(cid);
    }
  }

  // Stream committee-master, look for parent matches
  console.log('  streaming committee-master...');
  const recommendations = []; // { cmte_id, cmte_name, parent_entity, via }
  const byParent = new Map(); // entity_name → [{cmte_id, cmte_name}] (strong: name-stem)
  const byParentAffiliate = new Map(); // entity_name → [{cmte_id, cmte_name}] (weak: connected_org-only)
  const rl = readline.createInterface({ input: fs.createReadStream(path.join(FEC_ROOT, 'committee-master.jsonl')) });
  for await (const line of rl) {
    if (!line.trim()) continue;
    let r;
    try { r = JSON.parse(line); } catch { continue; }
    if (!r.id || !r.name) continue;
    if (alreadyLinked.has(r.id)) continue;
    // Skip candidate-authorized committees — their "connected_org" is
    // often a conduit (ActBlue, WinRed) or vendor rather than a real
    // parent affiliation. These are already handled by sync-campaign-
    // committees via candidate-committee linkage.
    if (r.designation === 'P' || r.designation === 'A') continue;

    // Compute BOTH signals independently so we can distinguish strong
    // (name-stem = identity) from weak (connected_org = affiliation).
    let nameStemHit = null;
    let connectedOrgHit = null;

    // Signal A: name-stem match (e.g. "Sierra Club Political Committee"
    // → "Sierra Club"). Only match if the stem is at least 6 chars
    // (avoid "NRA" matching all N-R-A-prefixed committees) and the
    // candidate committee name is LONGER than the entity name.
    {
      const normCmte = normalize(r.name);
      if (normCmte.length >= 6 && normCmte !== r.name.toUpperCase().replace(/\s+/g, ' ').trim()) {
        const hit = entByNormName.get(normCmte);
        if (hit && r.name.length > hit.name.length) nameStemHit = hit;
      }
    }

    // Signal B: connected_org match
    if (r.connected_org) {
      const normConn = normalize(r.connected_org);
      const hit = entByNormName.get(normConn);
      if (hit) connectedOrgHit = hit;
    }

    // Decide via. Strong (writes to fec_committee_ids):
    //   - name-stem match (with or without connected_org corroboration)
    // Weak (affiliate-only — reported, NOT written to fec_committee_ids):
    //   - connected_org match with NO name-stem match
    let parent = null;
    let via = null;
    if (nameStemHit) {
      parent = nameStemHit;
      via = connectedOrgHit && connectedOrgHit.id === nameStemHit.id
        ? 'name-stem+connected_org'
        : 'name-stem';
    } else if (connectedOrgHit) {
      parent = connectedOrgHit;
      via = 'connected_org-only';
    }

    if (!parent) continue;

    recommendations.push({
      cmte_id: r.id,
      cmte_name: r.name,
      connected_org: r.connected_org,
      parent_entity: parent.name,
      parent_id: parent.id,
      committee_type: r.type,
      designation: r.designation,
      via,
    });
    if (via === 'connected_org-only') {
      if (!byParentAffiliate.has(parent.name)) byParentAffiliate.set(parent.name, []);
      byParentAffiliate.get(parent.name).push(r);
      continue;
    }
    if (!byParent.has(parent.name)) byParent.set(parent.name, []);
    byParent.get(parent.name).push(r);
  }

  // Sort parents by number of affiliates found
  const parentsSorted = [...byParent.entries()].sort((a, b) => b[1].length - a[1].length);

  const affiliatesSorted = [...byParentAffiliate.entries()].sort((a, b) => b[1].length - a[1].length);
  const strongCount = recommendations.filter((r) => r.via !== 'connected_org-only').length;
  const weakCount = recommendations.filter((r) => r.via === 'connected_org-only').length;

  console.log(`\nFound ${recommendations.length} new committee→parent mappings`);
  console.log(`  STRONG (name-stem, will write to fec_committee_ids): ${strongCount} across ${parentsSorted.length} parents`);
  console.log(`  WEAK   (connected_org-only, REPORT only):            ${weakCount} across ${affiliatesSorted.length} parents`);
  console.log();
  console.log(`Top 30 STRONG parents (writes to fec_committee_ids):`);
  for (const [parentName, cmtes] of parentsSorted.slice(0, 30)) {
    console.log(`  ${cmtes.length.toString().padStart(3)}  ${parentName}`);
    if (REPORT) {
      for (const c of cmtes.slice(0, 8)) {
        const via = recommendations.find((r) => r.cmte_id === c.id)?.via;
        console.log(`       ${c.id}  ${c.name}  [${via}]`);
      }
    }
  }
  if (affiliatesSorted.length) {
    console.log(`\nTop 30 WEAK parents (connected_org-only — affiliate, NOT identity):`);
    for (const [parentName, cmtes] of affiliatesSorted.slice(0, 30)) {
      console.log(`  ${cmtes.length.toString().padStart(3)}  ${parentName}`);
      if (REPORT) {
        for (const c of cmtes.slice(0, 8)) console.log(`       ${c.id}  ${c.name}`);
      }
    }
  }

  if (!WRITE) {
    console.log(`\n[dry-run] no writes. Use --write to apply entity updates.`);
    console.log(`Use --report for full per-committee listing.`);
    return;
  }

  // Apply: update each parent entity's signals with affiliated committee IDs
  console.log('\nApplying updates...');
  let updated = 0;
  for (const [parentName, cmtes] of byParent) {
    const parent = entByNormName.get(normalize(parentName));
    if (!parent) continue;
    const existingIds = new Set(parent.signals?.fec_committee_ids || []);
    for (const c of cmtes) existingIds.add(c.id);
    const newSignals = {
      fec_committee_ids: [...existingIds],
    };
    // If there's exactly one main committee AND the parent doesn't already
    // have fec_committee_id, promote the most-principal one.
    if (!parent.signals?.fec_committee_id && cmtes.length > 0) {
      // Prefer designation='P' or 'A', type='O' (super PAC) or 'Q' (PAC)
      const principal = cmtes.find((c) => c.designation === 'P' || c.designation === 'A') || cmtes[0];
      newSignals.fec_committee_id = principal.id;
    }
    try {
      updateEntity(parent.id, { signals: newSignals });
      updated++;
    } catch (err) {
      console.error(`  FAILED ${parentName}: ${err.message}`);
    }
  }
  console.log(`  parents updated: ${updated}`);

  // Also print a MANUAL_VEHICLE_MAP snippet suggestion for the route.ts
  // — David can paste this in to enable vehicle pooling on /ask.
  console.log(`\nSuggested MANUAL_VEHICLE_MAP additions for route.ts:`);
  for (const [parentName, cmtes] of parentsSorted.slice(0, 20)) {
    if (cmtes.length < 2) continue;
    const vehicleNames = cmtes.map((c) => c.name).slice(0, 5);
    console.log(`  "${parentName}": ${JSON.stringify(vehicleNames)},`);
  }
})();
