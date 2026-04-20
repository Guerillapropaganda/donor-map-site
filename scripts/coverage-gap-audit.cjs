#!/usr/bin/env node
/**
 * coverage-gap-audit.cjs
 *
 * Vault-wide data-coverage audit. Answers: which entities are missing
 * structured data we should have? Grew out of a specific finding — Bernie
 * Sanders showed only $52K of donors because his ONLY mapped FEC
 * committee is his upcoming 2030 Senate re-election committee, leaving
 * his 2006/2012/2018 Senate runs, 1998 House run, and 2016/2020/2024
 * presidential runs all unlinked.
 *
 * For each entity, compute:
 *   - coverage tier (OK / THIN / EMPTY / MISMATCHED)
 *   - missing-identifier flags (no FEC candidate ID, no FEC cmte, no EIN)
 *   - edge count + source-diversity
 *   - specific red flags (politician with fec_candidate_id but no
 *     fec_committee_id, dark-money vehicle with no IRS-990 grants, etc.)
 *
 * Output: structured JSON + summary table. Writes to
 * content/Admin Notes/coverage-gap-audit.json and logs top problems.
 *
 * Run: node scripts/coverage-gap-audit.cjs
 *       node scripts/coverage-gap-audit.cjs --type politician
 *       node scripts/coverage-gap-audit.cjs --json report.json
 *       node scripts/coverage-gap-audit.cjs --top 50
 */
const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { loadEntities } = require('./lib/entities-store.cjs');
const { loadEdges } = require('./lib/relationships-store.cjs');

const ROOT = path.resolve(__dirname, '..');
const FEC_ROOT = 'C:/donor-map-data/fec';
const OUT_FILE = path.join(ROOT, 'content', 'Admin Notes', 'coverage-gap-audit.json');

const args = process.argv.slice(2);
function argVal(flag, fallback) {
  const i = args.indexOf(flag);
  return i === -1 ? fallback : args[i + 1];
}
const TYPE_FILTER = argVal('--type', null);
const JSON_OUT = argVal('--json', null);
const TOP_N = parseInt(argVal('--top', '50'), 10);

// ─── Load candidate-master to cross-check politician FEC coverage ───
async function loadCandidateMasterIndex() {
  // For each name (LAST, FIRST), list all candidate records across cycles/offices.
  // This is what lets us say "Bernie has 4 candidate records but we only
  // mapped 1 of them."
  const byNameKey = new Map();
  const file = path.join(FEC_ROOT, 'candidate-master.jsonl');
  if (!fs.existsSync(file)) return byNameKey;
  const rl = readline.createInterface({ input: fs.createReadStream(file) });
  for await (const line of rl) {
    if (!line.trim()) continue;
    try {
      const r = JSON.parse(line);
      if (!r.name) continue;
      // Normalize "SANDERS, BERNARD" → "sanders bernard"
      const key = r.name.toLowerCase().replace(/[^a-z ]+/g, ' ').replace(/\s+/g, ' ').trim();
      if (!byNameKey.has(key)) byNameKey.set(key, []);
      byNameKey.get(key).push({ id: r.id, office: r.office, state: r.state, cycle: r.cycle || r.election_year, pc: r.principal_cmte_id });
    } catch {}
  }
  return byNameKey;
}

// Turn "Bernie Sanders" into candidate-master-shaped "sanders bernie"
// lookup keys. Try a couple of variants since FEC uses LAST, FIRST and
// sometimes LAST, FULL-FIRST-MIDDLE.
function candidateMasterKeys(name) {
  const parts = name.trim().split(/\s+/);
  if (parts.length < 2) return [];
  const last = parts[parts.length - 1].toLowerCase();
  const first = parts[0].toLowerCase();
  const keys = [`${last} ${first}`];
  // Many FEC rows use full legal first name. "Bernie" → "bernard".
  const NICKMAP = {
    bernie: 'bernard', bob: 'robert', bill: 'william', mitch: 'mitchell',
    rob: 'robert', dick: 'richard', jim: 'james', tom: 'thomas', joe: 'joseph',
    mike: 'michael', nick: 'nicholas', dave: 'david', chris: 'christopher',
    chuck: 'charles', rick: 'richard', teddy: 'theodore',
  };
  if (NICKMAP[first]) keys.push(`${last} ${NICKMAP[first]}`);
  return keys;
}

(async function main() {
  console.log('[coverage-gap-audit]\n');
  console.log('  loading candidate-master...');
  const candByName = await loadCandidateMasterIndex();
  console.log(`  candidate-master entries: ${candByName.size} unique name keys`);

  const ents = loadEntities();
  const edges = loadEdges();

  // Pre-index edges per entity name for speed
  const inEdgesByName = new Map();
  const outEdgesByName = new Map();
  for (const e of edges) {
    if (e.type !== 'monetary') continue;
    if (e.status === 'deprecated') continue;
    if (!e.amount) continue;
    if (e.to) {
      if (!inEdgesByName.has(e.to)) inEdgesByName.set(e.to, []);
      inEdgesByName.get(e.to).push(e);
    }
    if (e.from) {
      if (!outEdgesByName.has(e.from)) outEdgesByName.set(e.from, []);
      outEdgesByName.get(e.from).push(e);
    }
  }

  const findings = [];
  for (const ent of ents) {
    if (TYPE_FILTER && ent.entity_type !== TYPE_FILTER) continue;
    const signals = ent.signals || {};
    const inEdges = inEdgesByName.get(ent.name) || [];
    const outEdges = outEdgesByName.get(ent.name) || [];
    const inTotal = inEdges.reduce((s, e) => s + (e.amount || 0), 0);
    const outTotal = outEdges.reduce((s, e) => s + (e.amount || 0), 0);
    const sources = new Set();
    for (const e of inEdges) sources.add(e.source);
    for (const e of outEdges) sources.add(e.source);
    const cycles = new Set();
    for (const e of inEdges) if (e.cycle) cycles.add(String(e.cycle));

    const flags = [];
    let tier = 'OK';

    // Type-specific coverage checks
    if (ent.entity_type === 'politician') {
      // SCOTUS justices and appointees don't run campaigns — exclude from
      // noise by tagging them separately.
      const isJudicial = /(Justice|Judge|Roberts|Alito|Thomas|Sotomayor|Kagan|Gorsuch|Kavanaugh|Barrett|Jackson)/.test(ent.name);

      const hasCandidateId = !!signals.fec_candidate_id;
      const hasCommitteeId = !!(signals.fec_committee_id || (signals.fec_committee_ids && signals.fec_committee_ids.length));
      // Summary receipts (from weball all-candidates ingest) are a
      // first-class coverage signal — they give a real total raised
      // number even when itemized donor data is thin by design (small-
      // dollar campaigns like Bernie). Treat a politician with
      // populated fec_receipts_lifetime as having legitimate coverage
      // regardless of whether their stub edges exist.
      const hasSummaryReceipts = typeof signals.fec_receipts_lifetime === 'number' && signals.fec_receipts_lifetime > 0;

      // Pool committee-stub edges up to the politician. My historical-
      // coverage backfill created donor-type committee stubs with
      // signals.controlled_by pointing back to politician names; the
      // aggregators correctly emit edges to those stubs rather than the
      // politician entity. The audit walks that link to count stub
      // inbound edges as the politician's coverage.
      const stubsControlledByPolitician = ents.filter((x) =>
        Array.isArray(x.signals?.controlled_by) &&
        x.signals.controlled_by.includes(ent.name) &&
        x.entity_type !== 'politician'
      );
      let pooledInEdgeCount = inEdges.length;
      let pooledInTotal = inTotal;
      const pooledCycles = new Set(cycles);
      for (const stub of stubsControlledByPolitician) {
        const stubIn = inEdgesByName.get(stub.name) || [];
        pooledInEdgeCount += stubIn.length;
        for (const e of stubIn) {
          pooledInTotal += e.amount || 0;
          if (e.cycle) pooledCycles.add(String(e.cycle));
        }
      }

      if (!hasCandidateId && !hasCommitteeId && !isJudicial) {
        flags.push('no-fec-identifier');
        tier = 'EMPTY';
      } else if (hasCandidateId && !hasCommitteeId && !hasSummaryReceipts) {
        flags.push('candidate-id-but-no-committee-id');
        if (tier === 'OK') tier = 'THIN';
      }

      // Cross-check candidate-master for untracked historical runs.
      const keys = candidateMasterKeys(ent.name);
      let matchedRecords = [];
      for (const k of keys) if (candByName.has(k)) matchedRecords = matchedRecords.concat(candByName.get(k));
      if (matchedRecords.length > 0 && !isJudicial) {
        const knownIds = new Set([
          signals.fec_candidate_id,
          ...(signals.fec_candidate_ids || []),
        ].filter(Boolean));
        const missing = matchedRecords.filter((m) => !knownIds.has(m.id));
        if (missing.length > 0) {
          flags.push(`missing-${missing.length}-candidate-cycles`);
          if (tier === 'OK') tier = 'THIN';
        }
      }

      // Empty / thin detection now uses pooled (stub-inclusive) counts,
      // AND accepts fec_receipts_lifetime as evidence even when edge
      // coverage is sparse.
      if (pooledInEdgeCount === 0 && !isJudicial && !hasSummaryReceipts) {
        flags.push('zero-inbound-edges-and-no-summary');
        tier = 'EMPTY';
      } else if (pooledInEdgeCount < 5 && !isJudicial && !hasSummaryReceipts) {
        flags.push(`thin-inbound-edges-${pooledInEdgeCount}-and-no-summary`);
        if (tier === 'OK') tier = 'THIN';
      }

      if (pooledCycles.size === 1 && !isJudicial && !hasSummaryReceipts) {
        flags.push(`single-cycle-coverage-${[...pooledCycles][0]}`);
        if (tier === 'OK') tier = 'THIN';
      }

      if (isJudicial) flags.push('judicial-no-campaign-expected');

      // Surface the pooled stub coverage as a positive signal so future
      // audits can tell pooling was applied. Also a diagnostic aid.
      if (stubsControlledByPolitician.length > 0) {
        flags.push(`pooled-${stubsControlledByPolitician.length}-committee-stubs`);
      }
      if (hasSummaryReceipts) {
        const lifeM = (signals.fec_receipts_lifetime / 1e6).toFixed(0);
        flags.push(`summary-receipts-$${lifeM}M-lifetime`);
      }
    } else if (ent.entity_type === 'donor' || ent.entity_type === 'nonprofit') {
      const sector = String(signals.sector || '').toLowerCase();
      const isDarkMoney = sector.includes('dark money') || (ent.ideological_function || []).some((f) => f.includes('dark-money'));
      const hasEin = !!signals.ein;
      const hasFecId = !!(signals.fec_committee_id || (signals.fec_committee_ids && signals.fec_committee_ids.length));

      if (isDarkMoney) {
        if (!hasEin) {
          flags.push('dark-money-no-ein');
          if (tier === 'OK') tier = 'THIN';
        }
        if (outEdges.length === 0) {
          flags.push('dark-money-no-grants-out');
          tier = 'EMPTY';
        }
      } else {
        // Super PACs, mega-donors, etc.
        if (!hasFecId && !hasEin) {
          flags.push('no-fec-and-no-ein');
          if (tier === 'OK') tier = 'THIN';
        }
        if (inEdges.length === 0 && outEdges.length === 0) {
          flags.push('zero-edges-both-sides');
          tier = 'EMPTY';
        }
      }
    } else if (ent.entity_type === 'corporation') {
      // Corporations: could be a lobbying firm, a contractor, or a donor.
      // Check for any federal identifier.
      const hasEin = !!signals.ein;
      const hasUei = !!signals.uei;
      const hasFecId = !!(signals.fec_committee_id || (signals.fec_committee_ids && signals.fec_committee_ids.length));
      if (!hasEin && !hasUei && !hasFecId) {
        flags.push('no-federal-identifier');
        if (tier === 'OK') tier = 'THIN';
      }
      if (inEdges.length === 0 && outEdges.length === 0) {
        flags.push('zero-edges-both-sides');
        tier = 'EMPTY';
      }
    } else if (ent.entity_type === 'media-profile') {
      // Media personalities — these are narratively important but may
      // legitimately have few edges (they're subjects of analysis, not
      // donors). Flag only if zero and stub was auto-registered.
      if (inEdges.length === 0 && outEdges.length === 0) {
        flags.push('media-profile-no-edges');
        if (tier === 'OK') tier = 'THIN';
      }
    }

    // Universal MISMATCHED check — edges exist but source is one legacy
    // feed we deprecated (e.g. only fec-bulk / fec-api old data).
    if (inEdges.length > 0 && sources.size === 1) {
      const only = [...sources][0];
      if (['fec-bulk', 'fec-api'].includes(only)) {
        flags.push(`only-legacy-source-${only}`);
        if (tier === 'OK') tier = 'THIN';
      }
    }

    if (flags.length === 0) tier = 'OK';

    findings.push({
      entity: ent.name,
      entity_type: ent.entity_type,
      sector: signals.sector || null,
      profile_path: ent.profile_path || null,
      tier,
      flags,
      in_edges: inEdges.length,
      out_edges: outEdges.length,
      in_total: inTotal,
      out_total: outTotal,
      sources: [...sources],
      cycles: [...cycles].sort(),
    });
  }

  // ─── Summary ────────────────────────────────────────────────────
  const byType = new Map();
  for (const f of findings) {
    if (!byType.has(f.entity_type)) byType.set(f.entity_type, { OK: 0, THIN: 0, EMPTY: 0, MISMATCHED: 0, total: 0 });
    const b = byType.get(f.entity_type);
    b[f.tier] = (b[f.tier] || 0) + 1;
    b.total++;
  }

  console.log('\n=== Coverage summary by entity type ===\n');
  console.log('  type'.padEnd(18), 'total  ', '  OK  ', ' THIN  ', 'EMPTY  ');
  console.log('  ' + '─'.repeat(55));
  for (const [t, b] of [...byType.entries()].sort((a, b) => b[1].total - a[1].total)) {
    console.log(
      '  ' + String(t).padEnd(18),
      String(b.total).padStart(4),
      '  ',
      String(b.OK || 0).padStart(4),
      '  ',
      String(b.THIN || 0).padStart(4),
      '  ',
      String(b.EMPTY || 0).padStart(4),
    );
  }

  // ─── Top problems per type ──────────────────────────────────────
  console.log('\n=== Top problems by type ===');
  const types = [...new Set(findings.map((f) => f.entity_type))];
  for (const t of types) {
    const subset = findings.filter((f) => f.entity_type === t && f.tier !== 'OK');
    if (subset.length === 0) continue;
    // Sort by severity (EMPTY first), then by whether they have flags
    const severity = { EMPTY: 0, MISMATCHED: 1, THIN: 2 };
    subset.sort((a, b) => (severity[a.tier] || 9) - (severity[b.tier] || 9) || b.in_total - a.in_total);
    console.log(`\n--- ${t} (${subset.length} with issues) ---`);
    for (const f of subset.slice(0, Math.min(TOP_N, 15))) {
      console.log(`  [${f.tier}] ${f.entity.padEnd(48)} flags=${f.flags.join(',')}`);
    }
    if (subset.length > 15) console.log(`  … and ${subset.length - 15} more`);
  }

  // ─── Write JSON ─────────────────────────────────────────────────
  const outPath = JSON_OUT || OUT_FILE;
  fs.writeFileSync(outPath, JSON.stringify({
    generated: new Date().toISOString(),
    totals: Object.fromEntries(byType),
    findings,
  }, null, 2));
  console.log(`\nreport written → ${path.relative(ROOT, outPath)}`);
})();
