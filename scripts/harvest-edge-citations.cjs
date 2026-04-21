#!/usr/bin/env node
/**
 * harvest-edge-citations.cjs — ADR-0017 Session J
 *
 * Companion to harvest-profile-sources.cjs (Session D). Session D emitted
 * Tier 1 citations for profiles WITH canonical IDs (bioguide, FEC, EIN).
 * This script handles the other half: profiles with canonical EDGES in
 * the FEC / IRS monetary stores but no direct ID.
 *
 * Uses FEC parameterized search URLs keyed by contributor/recipient name.
 * These are Tier 1 (fec.gov primary source) and deterministic — the URL
 * embeds the profile title as a search parameter, no URL hunting.
 *
 * Eligibility (ALL must hold):
 *   - profile is a publishable type
 *   - no existing Sources content (H2/H3/H4)
 *   - no (Tier 1) / {{src:}} signals anywhere
 *   - no blocking flags
 *   - profile title matches ≥1 edge `from` or `to` in a monetary store
 *
 * Emissions are wrapped in <!-- auto:harvested-edge-citations start/end -->
 * for idempotent re-runs. Distinct marker from Session D so the two
 * harvesters don't step on each other.
 *
 * Usage:
 *   node scripts/harvest-edge-citations.cjs           # dry-run
 *   node scripts/harvest-edge-citations.cjs --write
 */

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const ROOT = path.join(__dirname, '..');
const CONTENT_DIR = path.join(ROOT, 'content');
const WRITE = process.argv.includes('--write');
const VERBOSE = process.argv.includes('--verbose');
const LIMIT_IDX = process.argv.indexOf('--limit');
const LIMIT = LIMIT_IDX >= 0 ? parseInt(process.argv[LIMIT_IDX + 1], 10) : Infinity;

const PUBLISHABLE_TYPES = new Set([
  'politician', 'state-politician', 'local-politician',
  'donor', 'corporation', 'pac', 'think-tank', 'lobbying-firm',
]);

const BLOCK_START = '<!-- auto:harvested-edge-citations start -->';
const BLOCK_END = '<!-- auto:harvested-edge-citations end -->';

// Edge stores with their source label + a URL template for the entity
// in question. `{name}` is replaced with the URL-encoded profile title.
// The search URLs are Tier 1 per content/Vault Rules.md § 2 (fec.gov,
// irs.gov are government primary sources). Parameterized search URLs
// are deterministic — no URL hunting, per rule 13.
const STORES = [
  {
    file: 'data/derived/fec-pas2.jsonl',
    label: 'FEC committee-to-candidate contributions (PAS2 bulk)',
    fromUrl: (name) => `https://www.fec.gov/data/disbursements/?committee_name=${encodeURIComponent(name)}`,
    toUrl: (name) => `https://www.fec.gov/data/receipts/?contributor_name=${encodeURIComponent(name)}`,
  },
  {
    file: 'data/derived/fec-bulk.jsonl',
    label: 'FEC PAC summary filings',
    fromUrl: (name) => `https://www.fec.gov/data/committees/?name=${encodeURIComponent(name)}`,
    toUrl: (name) => `https://www.fec.gov/data/candidates/?q=${encodeURIComponent(name)}`,
  },
  {
    file: 'data/derived/fec-individual-bulk.jsonl',
    label: 'FEC individual contributions',
    fromUrl: (name) => `https://www.fec.gov/data/receipts/individual-contributions/?contributor_name=${encodeURIComponent(name)}`,
    toUrl: null,
  },
  {
    file: 'data/derived/irs-990-bulk.jsonl',
    label: 'IRS Form 990 grant flow',
    fromUrl: (name) => `https://projects.propublica.org/nonprofits/search?q=${encodeURIComponent(name)}`,
    toUrl: (name) => `https://projects.propublica.org/nonprofits/search?q=${encodeURIComponent(name)}`,
  },
];

function loadEdgeAggregates() {
  // Two maps keyed by lowercased name:
  //   outgoing: profile appears as `from` — had outflows
  //   incoming: profile appears as `to` — received
  // Each value: Map(storeFile → { edges, cycles:Set, totalAmt })
  const outgoing = new Map();
  const incoming = new Map();

  for (const store of STORES) {
    const full = path.join(ROOT, store.file);
    if (!fs.existsSync(full)) continue;
    for (const line of fs.readFileSync(full, 'utf-8').split(/\r?\n/)) {
      if (!line) continue;
      try {
        const e = JSON.parse(line);
        if (e.status && e.status !== 'active') continue;
        const amt = Number(e.amount) || 0;
        const cycle = e.cycle ? String(e.cycle) : null;
        if (e.from) {
          const k = String(e.from).trim().toLowerCase();
          if (!outgoing.has(k)) outgoing.set(k, new Map());
          const byStore = outgoing.get(k);
          const prev = byStore.get(store.file) || { edges: 0, totalAmt: 0, cycles: new Set() };
          prev.edges++;
          prev.totalAmt += amt;
          if (cycle) prev.cycles.add(cycle);
          byStore.set(store.file, prev);
        }
        if (e.to) {
          const k = String(e.to).trim().toLowerCase();
          if (!incoming.has(k)) incoming.set(k, new Map());
          const byStore = incoming.get(k);
          const prev = byStore.get(store.file) || { edges: 0, totalAmt: 0, cycles: new Set() };
          prev.edges++;
          prev.totalAmt += amt;
          if (cycle) prev.cycles.add(cycle);
          byStore.set(store.file, prev);
        }
      } catch {
        // skip
      }
    }
  }
  return { outgoing, incoming };
}

function buildCitations(title, outgoing, incoming) {
  const key = String(title || '').trim().toLowerCase();
  const lines = [];
  const outStores = outgoing.get(key);
  const inStores = incoming.get(key);

  if (outStores) {
    for (const store of STORES) {
      const rec = outStores.get(store.file);
      if (!rec || !store.fromUrl) continue;
      const cycles = [...rec.cycles].sort();
      const cycleStr = cycles.length ? ` (cycles ${cycles[0]}–${cycles[cycles.length - 1]})` : '';
      lines.push(`- [${store.label} — as contributor: ${rec.edges} records${cycleStr}](${store.fromUrl(title)}) (Tier 1)`);
    }
  }
  if (inStores) {
    for (const store of STORES) {
      const rec = inStores.get(store.file);
      if (!rec || !store.toUrl) continue;
      const cycles = [...rec.cycles].sort();
      const cycleStr = cycles.length ? ` (cycles ${cycles[0]}–${cycles[cycles.length - 1]})` : '';
      lines.push(`- [${store.label} — as recipient: ${rec.edges} records${cycleStr}](${store.toUrl(title)}) (Tier 1)`);
    }
  }
  return lines;
}

function hasBlockingFlags(body) {
  return /\(URL NEEDED\)|\(UNVERIFIED\)|\(NEEDS REVIEW\)|defamation-sanitized/i.test(body);
}

function hasExistingSignal(body) {
  const section = body.match(/^#{2,4}\s+Sources\b[\s\S]*?(?=^#{1,4}\s|$)/im);
  if (section) {
    const stripped = section[0].replace(/<!--[\s\S]*?-->/g, '').replace(/\s+/g, '');
    if (stripped.length > 50) return true;
  }
  if (/\(Tier\s*1\)/i.test(body)) return true;
  if (/\{\{src:[a-z0-9_-]+\}\}/i.test(body)) return true;
  return false;
}

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name.startsWith('.') || entry.name === 'Assets') continue;
      walk(full, out);
    } else if (entry.name.endsWith('.md')) {
      out.push(full);
    }
  }
  return out;
}

function parseFrontmatter(raw) {
  const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!m) return null;
  try {
    return { fm: yaml.load(m[1]) || {}, body: raw.slice(m[0].length) };
  } catch {
    return null;
  }
}

function emitBlock(lines) {
  return [
    BLOCK_START,
    ...lines,
    '',
    '*Auto-generated from canonical FEC/IRS edge data for this entity. URLs are parameterized searches on government primary sources — deterministic, not URL-hunted. See Vault Rules § 2 on Tier 1 source classification.*',
    BLOCK_END,
  ].join('\n');
}

function insertSources(raw, body, lines) {
  const sourcesMatch = body.match(/^(#{2,4}\s+Sources\s*\r?\n)/im);
  const block = emitBlock(lines);
  if (sourcesMatch) {
    const existing = body.match(new RegExp(`${BLOCK_START}[\\s\\S]*?${BLOCK_END}`));
    if (existing) return raw.replace(existing[0], block);
    const idx = body.indexOf(sourcesMatch[0]);
    const insertAt = idx + sourcesMatch[0].length;
    const newBody = body.slice(0, insertAt) + block + '\n\n' + body.slice(insertAt);
    return raw.replace(body, newBody);
  }
  const appended = body.replace(/\s*$/, '') + '\n\n## Sources\n\n' + block + '\n';
  return raw.replace(body, appended);
}

function main() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('  harvest-edge-citations — ADR-0017 Session J');
  console.log(`  Mode: ${WRITE ? 'WRITE' : 'DRY RUN'}${LIMIT < Infinity ? ` (limit ${LIMIT})` : ''}`);
  console.log('═══════════════════════════════════════════════════════════\n');

  const { outgoing, incoming } = loadEdgeAggregates();
  console.log(`  ${outgoing.size} entities with outgoing edges`);
  console.log(`  ${incoming.size} entities with incoming edges\n`);

  const files = walk(CONTENT_DIR);
  const stats = {
    totalPublishable: 0,
    skippedHasContent: 0,
    skippedFlags: 0,
    skippedNoEdges: 0,
    eligible: 0,
    written: 0,
  };
  const samples = [];

  for (const filePath of files) {
    const raw = fs.readFileSync(filePath, 'utf-8');
    const parsed = parseFrontmatter(raw);
    if (!parsed) continue;
    const { fm, body } = parsed;
    if (!fm.type || !PUBLISHABLE_TYPES.has(fm.type)) continue;
    stats.totalPublishable++;

    if (hasBlockingFlags(body)) {
      stats.skippedFlags++;
      continue;
    }
    if (hasExistingSignal(body)) {
      stats.skippedHasContent++;
      continue;
    }

    const lines = buildCitations(fm.title, outgoing, incoming);
    if (lines.length === 0) {
      stats.skippedNoEdges++;
      continue;
    }
    stats.eligible++;

    if (samples.length < 3) {
      samples.push({ path: path.relative(ROOT, filePath), title: fm.title, count: lines.length });
    }

    if (stats.written >= LIMIT) continue;

    if (VERBOSE) {
      console.log(`  ${path.relative(ROOT, filePath)}: +${lines.length} citation(s)`);
    }

    if (WRITE) {
      const updated = insertSources(raw, body, lines);
      fs.writeFileSync(filePath, updated, 'utf-8');
      stats.written++;
    } else {
      stats.written++;
    }
  }

  console.log('\n═══ RESULTS ═══════════════════════════════════════════════\n');
  console.log(`  Total publishable profiles scanned: ${stats.totalPublishable}`);
  console.log(`  Skipped (Sources already populated): ${stats.skippedHasContent}`);
  console.log(`  Skipped (blocking flags):            ${stats.skippedFlags}`);
  console.log(`  Skipped (no matching edges):         ${stats.skippedNoEdges}`);
  console.log(`  Eligible / Written:                  ${stats.eligible} / ${WRITE ? stats.written : '(dry-run)'}\n`);

  if (samples.length) {
    console.log('  Samples:');
    for (const s of samples) console.log(`    ${s.path}: ${s.count} citations`);
  }

  if (!WRITE) {
    console.log('\n  ⚠ DRY RUN — re-run with --write to apply.\n');
  } else {
    console.log('\n  ✓ Next: node scripts/reclassify-readiness.cjs --diagnose --write\n');
  }
}

main();
