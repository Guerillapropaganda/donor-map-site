#!/usr/bin/env node
/**
 * setup-bulk-junction.cjs
 *
 * Creates a Windows directory junction from <repo>/data/bulk/ to the external
 * persistent store at C:\donor-map-data\bulk\ so bulk downloads survive worktree
 * cleanup and are shared across all worktrees + the main repo.
 *
 * Safe to run in any checkout (main repo or worktree). If data/bulk/ is already
 * a junction pointing to the right place, this is a no-op. If it's a regular
 * directory with content, the content is moved into the external store first.
 *
 * Usage:
 *   node scripts/setup-bulk-junction.cjs
 *   node scripts/setup-bulk-junction.cjs --dry-run
 *
 * The external store path is hardcoded to C:\donor-map-data\bulk\ per current
 * setup. If that ever changes, edit TARGET below and write an ADR.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const LINK = path.join(ROOT, 'data', 'bulk');
const TARGET = 'C:\\donor-map-data\\bulk';
const DRY_RUN = process.argv.includes('--dry-run');

function log(msg) { console.log(`[setup-bulk-junction] ${msg}`); }

function isJunction(p) {
  if (!fs.existsSync(p)) return false;
  try {
    const out = execSync(`powershell -NoProfile -Command "(Get-Item '${p.replace(/\\/g, '/')}').LinkType"`, { encoding: 'utf-8' }).trim();
    return out === 'Junction' || out === 'SymbolicLink';
  } catch {
    return false;
  }
}

function junctionTarget(p) {
  try {
    const out = execSync(`powershell -NoProfile -Command "(Get-Item '${p.replace(/\\/g, '/')}').Target"`, { encoding: 'utf-8' }).trim();
    return out.replace(/\{|\}/g, '');
  } catch {
    return null;
  }
}

function walkDir(dir) {
  const out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...walkDir(full));
    else out.push(full);
  }
  return out;
}

function main() {
  log(`link:   ${LINK}`);
  log(`target: ${TARGET}`);

  // Ensure external target exists
  if (!fs.existsSync(TARGET)) {
    if (DRY_RUN) { log(`[dry-run] would mkdir ${TARGET}`); }
    else { fs.mkdirSync(TARGET, { recursive: true }); log(`created external store: ${TARGET}`); }
  }

  // Case A: LINK doesn't exist — just create the junction
  if (!fs.existsSync(LINK)) {
    log('data/bulk does not exist. Creating junction.');
    if (DRY_RUN) { log('[dry-run] would create junction'); return; }
    execSync(`cmd.exe /c mklink /J "${LINK}" "${TARGET}"`);
    log('done.');
    return;
  }

  // Case B: LINK is already a junction
  if (isJunction(LINK)) {
    const t = junctionTarget(LINK);
    if (t && path.resolve(t).toLowerCase() === path.resolve(TARGET).toLowerCase()) {
      log(`already a junction pointing to ${TARGET}. No-op.`);
      return;
    }
    log(`data/bulk is a junction but points to ${t}. Re-linking to ${TARGET}.`);
    if (DRY_RUN) return;
    fs.rmSync(LINK, { force: true });
    execSync(`cmd.exe /c mklink /J "${LINK}" "${TARGET}"`);
    log('relinked.');
    return;
  }

  // Case C: LINK is a regular directory — move contents to external, then replace with junction
  log('data/bulk is a regular directory. Moving contents into external store.');
  const entries = fs.readdirSync(LINK, { withFileTypes: true });
  for (const e of entries) {
    const src = path.join(LINK, e.name);
    const dst = path.join(TARGET, e.name);
    if (fs.existsSync(dst)) {
      log(`  [skip] ${e.name} already exists in external store (manual merge needed)`);
      continue;
    }
    if (DRY_RUN) { log(`  [dry-run] would move ${src} -> ${dst}`); continue; }
    fs.renameSync(src, dst);
    log(`  moved ${e.name}`);
  }
  if (DRY_RUN) { log('[dry-run] would rmdir data/bulk and create junction'); return; }

  // Remove now-empty dir and create junction
  const remaining = fs.readdirSync(LINK);
  if (remaining.length > 0) {
    log(`[abort] data/bulk still has ${remaining.length} entries after move. Resolve manually.`);
    process.exit(1);
  }
  fs.rmdirSync(LINK);
  execSync(`cmd.exe /c mklink /J "${LINK}" "${TARGET}"`);
  log('junction created.');
}

main();
