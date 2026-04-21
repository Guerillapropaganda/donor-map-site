#!/usr/bin/env node
// One-shot: normalize vault_profile paths in data/fec-committee-registry.json
// to repo-relative forward-slash form. Drops stale worktree prefixes like
// C:\Users\third\donor-map-site\.claude\worktrees\bold-clarke\ that no
// longer exist. Run once after noticing worktree moves.
const fs = require('fs');
const reg = JSON.parse(fs.readFileSync('data/fec-committee-registry.json', 'utf-8'));
let fixed = 0, orphan = 0, already = 0;
for (const id of Object.keys(reg)) {
  const r = reg[id];
  if (!r.vault_profile) continue;
  // Find 'content/...' substring; any prefix is stripped.
  const m = r.vault_profile.match(/[\\/]?content[\\/].+/);
  if (!m) { orphan++; continue; }
  const clean = m[0].replace(/^[\\/]+/, '').replace(/\\/g, '/');
  if (clean === r.vault_profile) { already++; continue; }
  // Verify the normalized path actually exists in this worktree.
  if (fs.existsSync(clean)) { r.vault_profile = clean; fixed++; }
  else orphan++;
}
fs.writeFileSync('data/fec-committee-registry.json', JSON.stringify(reg, null, 2));
console.log('fixed:', fixed, 'already-clean:', already, 'orphan/missing file:', orphan);
