#!/usr/bin/env node
/**
 * diff-relationships-cache — compare the two cache files side-by-side.
 *
 * Compares data/relationships-per-profile.json (current builder, raw-edge-name keys)
 * against   data/relationships-per-profile.via-librarian.json (ADR-0024 candidate).
 *
 * Reports per-field (donors, politicians-funded, related, opposes, stories,
 * ie-supported-by, ie-opposed-by) at the per-profile level. Buckets profiles
 * by the agree/disagree distribution and lists the biggest movers in each
 * direction.
 *
 * Profiles that exist in only one file are reported separately:
 *   - cache-only  → "lost" buckets (vault meta-pages, ghost FEC names...)
 *   - librarian-only → entities the librarian found that the cache missed
 *
 * Usage:
 *   node scripts/diff-relationships-cache.cjs
 *   node scripts/diff-relationships-cache.cjs --top=20
 *   node scripts/diff-relationships-cache.cjs --field=donors
 *   node scripts/diff-relationships-cache.cjs --out=diff-report.json
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const CACHE_OLD = path.join(ROOT, 'data', 'relationships-per-profile.json');
const CACHE_NEW = path.join(ROOT, 'data', 'relationships-per-profile.via-librarian.json');

function parseArg(name, def) {
  const arg = process.argv.find((a) => a.startsWith(`--${name}=`));
  return arg ? arg.slice(name.length + 3) : def;
}

const TOP = parseInt(parseArg('top', '15'), 10);
const FIELD_FILTER = parseArg('field', null);
const OUT = parseArg('out', null);

const FIELDS = [
  'donors',
  'politicians-funded',
  'related',
  'opposes',
  'stories',
  'ie-opposed-by',
  'ie-opposition-targets',
  'ie-supported-by',
  'ie-support-targets',
  'government-contracts',
];

function loadJson(p) {
  if (!fs.existsSync(p)) {
    console.error(`MISSING: ${p}`);
    console.error('Run scripts/build-relationships-per-profile-via-librarian.cjs first.');
    process.exit(1);
  }
  return JSON.parse(fs.readFileSync(p, 'utf-8'));
}

console.log('Loading both cache files...');
const oldCache = loadJson(CACHE_OLD);
const newCache = loadJson(CACHE_NEW);
console.log(`  old (current):  ${Object.keys(oldCache).length.toLocaleString()} buckets`);
console.log(`  new (librarian): ${Object.keys(newCache).length.toLocaleString()} buckets`);
console.log('');

// Build the union of all keys
const allKeys = new Set([...Object.keys(oldCache), ...Object.keys(newCache)]);
const cacheOnly = [];
const librarianOnly = [];
const both = [];
for (const k of allKeys) {
  const inOld = k in oldCache;
  const inNew = k in newCache;
  if (inOld && inNew) both.push(k);
  else if (inOld) cacheOnly.push(k);
  else librarianOnly.push(k);
}

// ─── Buckets-only-in-cache: characterize what we lose ──────────────────
function bucketSize(bundle) {
  let n = 0;
  for (const f of FIELDS) n += Array.isArray(bundle?.[f]) ? bundle[f].length : 0;
  return n;
}

const cacheOnlyByLoss = cacheOnly
  .map((k) => ({ key: k, lost: bucketSize(oldCache[k]) }))
  .sort((a, b) => b.lost - a.lost);

console.log('─── BUCKETS LOST (in old cache, NOT in librarian) ───');
console.log(`Total: ${cacheOnly.length.toLocaleString()} buckets`);
const totalLostRows = cacheOnlyByLoss.reduce((s, r) => s + r.lost, 0);
const emptyLost = cacheOnlyByLoss.filter((r) => r.lost === 0).length;
console.log(`Empty (no rows lost):   ${emptyLost.toLocaleString()}`);
console.log(`Non-empty (rows lost):  ${(cacheOnly.length - emptyLost).toLocaleString()}`);
console.log(`Total rows in lost buckets: ${totalLostRows.toLocaleString()}`);
console.log(`Top ${TOP} lost buckets by total rows:`);
for (const r of cacheOnlyByLoss.slice(0, TOP)) {
  if (r.lost === 0) break;
  const b = oldCache[r.key];
  const breakdown = FIELDS
    .filter((f) => Array.isArray(b?.[f]) && b[f].length > 0)
    .map((f) => `${f}=${b[f].length}`)
    .join(' ');
  console.log(`  ${String(r.lost).padStart(5)}  ${r.key}`);
  console.log(`         ${breakdown}`);
}
console.log('');

// ─── Buckets-only-in-librarian: rare; entities cache builder missed ────
console.log('─── BUCKETS GAINED (in librarian, NOT in old cache) ───');
console.log(`Total: ${librarianOnly.length.toLocaleString()} buckets`);
const librarianOnlyByGain = librarianOnly
  .map((k) => ({ key: k, gain: bucketSize(newCache[k]) }))
  .sort((a, b) => b.gain - a.gain);
const totalGainedRows = librarianOnlyByGain.reduce((s, r) => s + r.gain, 0);
console.log(`Total rows in gained buckets: ${totalGainedRows.toLocaleString()}`);
console.log(`Top ${TOP} gained buckets by total rows:`);
for (const r of librarianOnlyByGain.slice(0, TOP)) {
  if (r.gain === 0) break;
  const b = newCache[r.key];
  const breakdown = FIELDS
    .filter((f) => Array.isArray(b?.[f]) && b[f].length > 0)
    .map((f) => `${f}=${b[f].length}`)
    .join(' ');
  console.log(`  ${String(r.gain).padStart(5)}  ${r.key}`);
  console.log(`         ${breakdown}`);
}
console.log('');

// ─── Per-field diff for buckets that exist in both ─────────────────────
function diffArrays(oldArr, newArr) {
  const oSet = new Set(oldArr || []);
  const nSet = new Set(newArr || []);
  const onlyOld = [...oSet].filter((x) => !nSet.has(x));
  const onlyNew = [...nSet].filter((x) => !oSet.has(x));
  return { oldN: oSet.size, newN: nSet.size, onlyOld, onlyNew, agree: onlyOld.length === 0 && onlyNew.length === 0 };
}

const fieldsToReport = FIELD_FILTER ? [FIELD_FILTER] : FIELDS;
const perFieldReport = {};
for (const field of fieldsToReport) {
  const rows = [];
  for (const k of both) {
    const d = diffArrays(oldCache[k]?.[field], newCache[k]?.[field]);
    rows.push({ key: k, ...d });
  }
  const agree = rows.filter((r) => r.agree).length;
  const disagree = rows.length - agree;
  const totalAdds = rows.reduce((s, r) => s + r.onlyNew.length, 0);
  const totalRemoves = rows.reduce((s, r) => s + r.onlyOld.length, 0);

  console.log(`─── FIELD: ${field} ───`);
  console.log(`  agree:    ${agree.toLocaleString().padStart(7)} (${((agree / rows.length) * 100).toFixed(1)}%)`);
  console.log(`  disagree: ${disagree.toLocaleString().padStart(7)} (${((disagree / rows.length) * 100).toFixed(1)}%)`);
  console.log(`  rows added by librarian:   ${totalAdds.toLocaleString()}`);
  console.log(`  rows removed by librarian: ${totalRemoves.toLocaleString()}`);

  // Top adds (librarian found more)
  const topAdds = rows
    .filter((r) => r.onlyNew.length > 0)
    .sort((a, b) => b.onlyNew.length - a.onlyNew.length)
    .slice(0, TOP);
  if (topAdds.length > 0) {
    console.log(`  top ${Math.min(TOP, topAdds.length)} buckets where librarian ADDS rows:`);
    for (const r of topAdds) {
      console.log(`    +${String(r.onlyNew.length).padStart(4)}  ${r.key}  (old=${r.oldN} new=${r.newN})`);
    }
  }
  // Top removes (librarian found fewer)
  const topRemoves = rows
    .filter((r) => r.onlyOld.length > 0)
    .sort((a, b) => b.onlyOld.length - a.onlyOld.length)
    .slice(0, TOP);
  if (topRemoves.length > 0) {
    console.log(`  top ${Math.min(TOP, topRemoves.length)} buckets where librarian REMOVES rows:`);
    for (const r of topRemoves) {
      console.log(`    -${String(r.onlyOld.length).padStart(4)}  ${r.key}  (old=${r.oldN} new=${r.newN})`);
    }
  }
  console.log('');

  perFieldReport[field] = {
    agree, disagree, totalAdds, totalRemoves,
    topAdds: topAdds.map((r) => ({ key: r.key, oldN: r.oldN, newN: r.newN, only_in_lib: r.onlyNew })),
    topRemoves: topRemoves.map((r) => ({ key: r.key, oldN: r.oldN, newN: r.newN, only_in_cache: r.onlyOld })),
  };
}

if (OUT) {
  fs.writeFileSync(OUT, JSON.stringify({
    summary: {
      old_buckets: Object.keys(oldCache).length,
      new_buckets: Object.keys(newCache).length,
      both: both.length,
      cache_only: cacheOnly.length,
      librarian_only: librarianOnly.length,
      total_rows_lost: totalLostRows,
      total_rows_gained: totalGainedRows,
    },
    cache_only_top: cacheOnlyByLoss.slice(0, 100),
    librarian_only_top: librarianOnlyByGain.slice(0, 100),
    per_field: perFieldReport,
  }, null, 2));
  console.log(`Wrote diff report → ${OUT}`);
}
