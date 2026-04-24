#!/usr/bin/env node
/**
 * normalize-entity-sectors.cjs
 *
 * Pattern B-1 fix. Rewrites `signals.sector` in data/entities.jsonl so
 * every donor-network entity's sector matches its folder bucket under
 * content/Donors & Power Networks/<bucket>/. Closes 239 folder-vs-
 * entity naming drifts surfaced by scripts/audit-entity-classification.cjs.
 *
 * Examples being fixed:
 *   folder "Foreign"              → entity.sector was "Foreign Influence"
 *   folder "Healthcare Industry"  → entity.sector was "Healthcare"
 *   folder "Real Estate & Housing"→ entity.sector was "Real Estate"
 *   folder "Super PACs"           → entity.sector was "Political Committees"
 *   folder "Labor Unions"         → entity.sector was "Political Committees"
 *
 * The folder bucket is the source of truth here because:
 *   (a) the folder is what David organizes and curates
 *   (b) the build-profile-data-panels pipeline writes entity.sector
 *       from folder anyway — drift only appeared when older entities
 *       were created under a different heuristic
 *   (c) downstream panels (compare, leaderboard) display entity.sector
 *       as the entity's category, so consistency matters for UX
 *
 * This does NOT fix Pattern B-3 (entities correctly filed per folder
 * but wrong folder — e.g. Marble Freedom Trust filed under Super PACs
 * when it's actually a 501(c)(4) dark-money vehicle). That requires
 * an editorial pass with EIN/structural-role ground truth.
 *
 * Dry-run by default. --apply to write.
 */
const fs = require('fs');
const path = require('path');

const APPLY = process.argv.includes('--apply');
const ROOT = path.join(__dirname, '..');
const ENT_FILE = path.join(ROOT, 'data', 'entities.jsonl');

function extractFolderBucket(profilePath) {
  if (!profilePath) return null;
  const m = profilePath.match(/Donors & Power Networks[\\/]([^\\/]+)/);
  if (!m) return null;
  const bucket = m[1];
  // Ignore profiles whose "bucket" is actually the filename (top-level
  // .md files like "Leonard Leo.md"). Those get reported but skipped.
  if (bucket.endsWith('.md')) return null;
  return bucket;
}

function main() {
  console.log(`mode: ${APPLY ? 'APPLY' : 'DRY-RUN'}\n`);
  const lines = fs.readFileSync(ENT_FILE, 'utf-8').split('\n');
  const out = [];
  let scanned = 0, updated = 0, skippedNoPath = 0, skippedToplevel = 0;
  const changes = [];
  for (const line of lines) {
    if (!line.trim()) { out.push(line); continue; }
    let ent;
    try { ent = JSON.parse(line); } catch { out.push(line); continue; }
    scanned++;
    const profilePath = ent?.signals?.profile_path || ent?.profile_path;
    if (!profilePath || !/Donors & Power Networks/.test(profilePath)) {
      out.push(line);
      skippedNoPath++;
      continue;
    }
    const bucket = extractFolderBucket(profilePath);
    if (!bucket) { skippedToplevel++; out.push(line); continue; }
    const current = ent?.signals?.sector || null;
    if (current !== bucket) {
      if (ent.signals) ent.signals.sector = bucket;
      else ent.signals = { sector: bucket };
      updated++;
      changes.push({ name: ent.name, from: current, to: bucket, path: profilePath });
    }
    out.push(JSON.stringify(ent));
  }
  console.log(`scanned:             ${scanned}`);
  console.log(`skipped (no path):   ${skippedNoPath}`);
  console.log(`skipped (toplevel):  ${skippedToplevel}`);
  console.log(`updates to apply:    ${updated}\n`);
  console.log(`First 15 changes:`);
  for (const c of changes.slice(0, 15)) {
    console.log(`  ${(c.from || '(null)').padEnd(24)} → ${c.to.padEnd(24)}   ${c.name}`);
  }
  if (!APPLY) { console.log('\n(dry-run — no write)'); return; }
  fs.writeFileSync(ENT_FILE, out.join('\n'));
  console.log(`\nwrote ${updated} updates to ${ENT_FILE}`);
}

main();
