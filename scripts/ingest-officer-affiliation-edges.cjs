#!/usr/bin/env node
/**
 * ingest-officer-affiliation-edges.cjs
 *
 * Matches officers from the IRS 990 filings against vault person profiles
 * (politicians + named individual donors + named people) and emits
 * `affiliation` edges person -> organization via the canonical store.
 *
 * Matching strategy:
 *   Normalize officer name and vault profile name the same way (uppercase,
 *   collapse whitespace, strip punctuation + suffixes like JR / SR / III).
 *   Exact normalized match only — no fuzzy matching because false positives
 *   pollute the edge store and are expensive to unwind.
 *
 * When a match is found, emit one affiliation edge per (person, org) with
 * date_range derived from the filing years and role = the titles recorded
 * in the 990 (space-joined if multiple).
 *
 * Separately, every politician-on-a-nonprofit-board match is highlighted
 * in content/Admin Notes/politicians-on-boards-report.md as an editorial
 * follow-up candidate.
 *
 * Inputs:
 *   data/officer-registry.jsonl        (produced by build-officer-registry)
 *   data/entities.jsonl                (for vault person lookup)
 *
 * Usage:
 *   node scripts/ingest-officer-affiliation-edges.cjs             # dry-run
 *   node scripts/ingest-officer-affiliation-edges.cjs --write     # apply
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { upsertEdges } = require('./lib/relationships-store.cjs');

const ROOT = path.resolve(__dirname, '..');
const OFFICER_REG = path.join(ROOT, 'data', 'officer-registry.jsonl');
const ENTITIES = path.join(ROOT, 'data', 'entities.jsonl');
const REPORT_OUT = path.join(ROOT, 'content', 'Admin Notes', 'politicians-on-boards-report.md');

const args = process.argv.slice(2);
const WRITE = args.includes('--write');

function normPerson(s) {
  return String(s || '')
    .trim()
    .toUpperCase()
    .replace(/[.,]/g, '')
    .replace(/\s+(JR|SR|II|III|IV|ESQ|MD|PHD|DDS)$/i, '')
    .replace(/\s+/g, ' ');
}

function profilePathToTitle(p) {
  if (!p) return null;
  return path.basename(p, '.md');
}

(function main() {
  console.log(`[ingest-officer-affiliation-edges] ${WRITE ? 'WRITE' : 'DRY-RUN'}\n`);

  // Load vault persons: entity_type = politician OR entity_type = donor with a
  // plausible person name (has space + not all-caps-like-org).
  const entByNorm = new Map();
  for (const line of fs.readFileSync(ENTITIES, 'utf-8').split('\n')) {
    if (!line.trim()) continue;
    try {
      const r = JSON.parse(line);
      if (!r.name || !r.profile_path) continue;
      const norm = normPerson(r.name);
      if (!norm) continue;
      // Heuristic: "person" names have a space, aren't typical org endings
      if (!norm.includes(' ')) continue;
      const hasOrgTail = /\b(INC|CORP|LLC|LLP|FOUNDATION|FUND|PAC|COMMITTEE|ASSOCIATION|UNION|COALITION|GROUP|COUNCIL|SOCIETY|ALLIANCE|TRUST|COMPANY|PROJECT)\b/.test(norm);
      if (hasOrgTail) continue;
      entByNorm.set(norm, {
        name: r.name,
        profile_path: r.profile_path,
        entity_type: r.entity_type,
        title: profilePathToTitle(r.profile_path),
      });
    } catch {}
  }
  console.log(`  vault person candidates: ${entByNorm.size}`);

  // Load officer registry, match by normalized name
  const rows = fs.readFileSync(OFFICER_REG, 'utf-8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
  console.log(`  officer rows: ${rows.length.toLocaleString()}`);

  // Aggregate by (normalized officer, org)
  const edgeAgg = new Map();
  const politiciansOnBoards = [];
  let matches = 0;
  for (const r of rows) {
    const norm = normPerson(r.officer_name);
    const person = entByNorm.get(norm);
    if (!person) continue;
    if (!r.vault_org_name || !r.vault_entity_id) continue;
    matches++;
    const orgName = r.vault_org_name;
    const k = `${person.title}|${orgName}`;
    if (!edgeAgg.has(k)) {
      edgeAgg.set(k, {
        from: person.title,
        to: orgName,
        from_type: person.entity_type,
        titles: new Set(),
        years: new Set(),
      });
    }
    const a = edgeAgg.get(k);
    (r.titles || []).forEach((t) => a.titles.add(t));
    (r.years || []).forEach((y) => a.years.add(y));

    if (person.entity_type === 'politician') {
      politiciansOnBoards.push({
        politician: person.name,
        org: orgName,
        titles: r.titles || [],
        years: r.years || [],
      });
    }
  }
  console.log(`  matched officer <-> vault-person rows: ${matches}`);
  console.log(`  unique edges: ${edgeAgg.size}`);
  console.log(`  politicians on nonprofit boards: ${politiciansOnBoards.length}`);

  // Build edges
  const now = new Date().toISOString();
  const edges = [];
  for (const row of edgeAgg.values()) {
    const years = [...row.years].filter(Boolean).sort();
    const dateRange = years.length
      ? (years.length === 1 ? `${years[0]}-01-01/${years[0]}-12-31` : `${years[0]}-01-01/${years[years.length - 1]}-12-31`)
      : null;
    const roleBase = [...row.titles][0] || 'Officer';
    const role = roleBase.length > 60 ? roleBase.slice(0, 60) : roleBase;

    const type = 'affiliation';
    // Id: hash(from, to, type, role, start) per validator convention
    const start = dateRange ? dateRange.split('/')[0] : '';
    const parts = [row.from, row.to, type, role, start];
    const id = crypto.createHash('sha1').update(parts.join('|'), 'utf8').digest('hex').slice(0, 16);

    edges.push({
      id,
      from: row.from,
      to: row.to,
      from_type: row.from_type,
      to_type: 'donor', // will be overwritten by rebuild-denorm if different
      type,
      direction: 'directed',
      role,
      date_range: dateRange,
      confidence: 0.9,
      source: 'irs-990-bulk',
      source_url: 'https://www.irs.gov/charities-non-profits/form-990-series-downloads',
      first_seen: now,
      last_verified: now,
      status: 'active',
      evidence: [`IRS 990 officer entry (${[...row.titles].join(' / ')}) on ${[...row.years].sort().join(', ')} filings`],
    });
  }

  // Report: politicians-on-boards
  const reportLines = [];
  reportLines.push('---');
  reportLines.push('title: "Politicians on Nonprofit Boards (IRS 990)"');
  reportLines.push('status: reference');
  reportLines.push(`last-updated: ${new Date().toISOString().slice(0, 10)}`);
  reportLines.push('generated-by: scripts/ingest-officer-affiliation-edges.cjs');
  reportLines.push('---');
  reportLines.push('');
  reportLines.push('# Politicians on Nonprofit Boards');
  reportLines.push('');
  reportLines.push('Rows where a vault politician profile name matches an officer listed on a 501(c)(x) IRS 990 filing for a vault-tracked org. Editorial follow-up candidates.');
  reportLines.push('');
  if (politiciansOnBoards.length === 0) {
    reportLines.push('*No matches surfaced in current data.*');
  } else {
    reportLines.push('| Politician | Organization | Titles | Years |');
    reportLines.push('|---|---|---|---|');
    for (const p of politiciansOnBoards) {
      reportLines.push(`| [[${p.politician}]] | [[${p.org}]] | ${p.titles.join(' / ')} | ${p.years.sort().join(', ')} |`);
    }
  }
  reportLines.push('');

  if (!WRITE) {
    console.log('\n[dry-run] no writes. Use --write to apply edges + report.');
    if (politiciansOnBoards.length > 0) {
      console.log('\n  Politicians found on boards:');
      for (const p of politiciansOnBoards.slice(0, 10)) console.log('   ', p.politician, '->', p.org);
    }
    return;
  }

  fs.writeFileSync(REPORT_OUT, reportLines.join('\n'));
  console.log(`  wrote ${REPORT_OUT}`);

  if (edges.length === 0) {
    console.log('  no edges to upsert');
    return;
  }
  console.log(`\nUpserting ${edges.length} affiliation edges...`);
  const result = upsertEdges(edges);
  console.log(`  added: ${result.added}`);
  console.log(`  updated: ${result.updated}`);
  console.log(`  skipped: ${result.skipped}`);
  console.log(`  invalid: ${result.invalid}`);
  if (result.errors && result.errors.length) {
    console.log('\n  First invalid edges:');
    for (const e of result.errors.slice(0, 5)) console.log('   ', e);
  }
})();
