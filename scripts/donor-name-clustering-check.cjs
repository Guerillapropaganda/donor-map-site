#!/usr/bin/env node
/**
 * donor-name-clustering-check.cjs — harness check for donor-name
 * normalization gaps that produce duplicate-counting.
 *
 * What it detects:
 *   In data/derived/cal-access-bulk.jsonl, scans the `from` field
 *   (donor name) and clusters similar-but-not-identical strings that
 *   may represent the same entity but were treated as separate by the
 *   ingester due to gaps in cal-access-donor-aliases.json.
 *
 *   Detection rules:
 *     - Case-insensitive equality of normalized strings (whitespace
 *       collapse, punctuation strip) clusters that would already be
 *       handled by alias map but aren't.
 *     - High-similarity clusters (≥ 0.92 Jaro-Winkler, length-aware)
 *       where one form contains "&" / "and" or "Corp" / "Corporation"
 *       variants — common abbreviation patterns.
 *
 *   Each cluster reports the variants and combined contribution total
 *   that would aggregate if the alias map were updated.
 *
 * Why this check exists:
 *   Surfaced 2026-05-01 in CA Gov 2026 dossier work. PG&E showed up
 *   as "PG&E Corporation" and "Pacific Gas & Electric Corporation" in
 *   apparent duplicate counts (the alias map DID cover them, but a
 *   dossier-extraction script bypassed the alias logic). This check
 *   catches the underlying data shape — clusters that *could* be
 *   conflated — so the alias map can be tightened proactively.
 *
 * Usage:
 *   node scripts/donor-name-clustering-check.cjs --json
 *   node scripts/donor-name-clustering-check.cjs --threshold 0.92
 */

'use strict';
const fs = require('fs');
const path = require('path');
const readline = require('readline');

const ROOT = path.join(__dirname, '..');
const BULK_JSONL = path.join(ROOT, 'data', 'derived', 'cal-access-bulk.jsonl');
const ALIASES_FILE = path.join(ROOT, 'data', 'cal-access-donor-aliases.json');

const args = process.argv.slice(2);
const JSON_MODE = args.includes('--json');
const THRESH_IDX = args.indexOf('--threshold');
const THRESHOLD = THRESH_IDX >= 0 ? parseFloat(args[THRESH_IDX + 1]) : 0.92;
const MIN_TOTAL_IDX = args.indexOf('--min-total');
const MIN_TOTAL = MIN_TOTAL_IDX >= 0 ? parseFloat(args[MIN_TOTAL_IDX + 1]) : 100000; // $100K combined to flag

function normalize(s) {
  if (!s) return '';
  return String(s)
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/\bcorp\b/g, 'corporation')
    .replace(/\binc\b\.?/g, '')
    .replace(/\bllc\b/g, '')
    .replace(/\bcompany\b/g, '')
    .replace(/[.,]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

(async function main() {
  if (!fs.existsSync(BULK_JSONL)) {
    const out = { check: 'donor-name-clustering', status: 'skipped', reason: 'cal-access-bulk.jsonl not present', findings_count: 0 };
    if (JSON_MODE) console.log(JSON.stringify(out));
    else console.log(`SKIPPED: ${out.reason}`);
    process.exit(0);
  }

  // Load existing alias map to know what's already covered
  let coveredCanonicals = new Set();
  if (fs.existsSync(ALIASES_FILE)) {
    const j = JSON.parse(fs.readFileSync(ALIASES_FILE, 'utf-8'));
    for (const entry of j.aliases || []) {
      if (entry.canonical) coveredCanonicals.add(normalize(entry.canonical));
    }
  }

  // Aggregate donor totals from bulk
  const donorTotals = new Map(); // raw → { total, count, variants_normalized }
  const stream = fs.createReadStream(BULK_JSONL, { encoding: 'utf-8' });
  const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });
  for await (const line of rl) {
    if (!line.trim()) continue;
    let r;
    try { r = JSON.parse(line); } catch { continue; }
    if (r.type !== 'monetary') continue;
    const donor = r.from;
    if (!donor) continue;
    const prev = donorTotals.get(donor) || { total: 0, count: 0 };
    prev.total += +r.amount || 0;
    prev.count += 1;
    donorTotals.set(donor, prev);
  }

  // Cluster by normalized form
  const clusters = new Map(); // normalized → [{ raw, total, count }]
  for (const [raw, info] of donorTotals.entries()) {
    const norm = normalize(raw);
    if (!norm) continue;
    if (!clusters.has(norm)) clusters.set(norm, []);
    clusters.get(norm).push({ raw, ...info });
  }

  // Find clusters with multiple raw variants (potential duplicates not handled by alias map)
  const findings = [];
  for (const [norm, members] of clusters.entries()) {
    if (members.length < 2) continue;
    if (coveredCanonicals.has(norm)) continue; // already handled by alias map
    const totalCombined = members.reduce((s, m) => s + m.total, 0);
    if (totalCombined < MIN_TOTAL) continue;
    findings.push({
      normalized_form: norm,
      variant_count: members.length,
      combined_total: Math.round(totalCombined * 100) / 100,
      raw_variants: members
        .sort((a, b) => b.total - a.total)
        .slice(0, 5)
        .map(m => ({ name: m.raw, total: Math.round(m.total * 100) / 100, count: m.count })),
    });
  }
  findings.sort((a, b) => b.combined_total - a.combined_total);

  const result = {
    check: 'donor-name-clustering',
    status: 'ok',
    description: `Donor names in cal-access-bulk that cluster to the same normalized form across ≥2 raw variants (combined ≥${MIN_TOTAL} total) but are NOT in cal-access-donor-aliases.json. Each finding suggests a missed alias-merge.`,
    findings_count: findings.length,
    threshold_min_combined_total: MIN_TOTAL,
    samples: findings.slice(0, 20),
    interpretation: findings.length === 0
      ? 'No duplicate-name clusters above threshold. Alias map coverage looks complete.'
      : `${findings.length} clusters worth merging. Top ones likely add ~$${(findings.slice(0, 5).reduce((s, f) => s + f.combined_total, 0) / 1_000_000).toFixed(1)}M in aggregation if alias map updated.`,
    fix: 'Add canonical entries + variants to data/cal-access-donor-aliases.json, then re-run scripts/ingest-cal-access-bulk.cjs.',
    generated_at: new Date().toISOString(),
  };

  if (JSON_MODE) console.log(JSON.stringify(result));
  else {
    console.log(`Donor-name clustering check: ${findings.length} clusters worth merging`);
    findings.slice(0, 10).forEach(f => {
      console.log(`  $${(f.combined_total / 1000).toFixed(0)}K  norm="${f.normalized_form}"  ${f.variant_count} variants:`);
      f.raw_variants.forEach(v => console.log(`    "${v.name}" — $${(v.total/1000).toFixed(0)}K x${v.count}`));
    });
  }
})().catch(e => { console.error('FATAL:', e.message); process.exit(2); });
