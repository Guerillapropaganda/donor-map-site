#!/usr/bin/env node
/**
 * morning-briefing.cjs — Overnight summary for coffee-time reading
 *
 * Generates a markdown report summarizing what happened in the vault
 * since the last briefing. Intended to run as a cron (6am daily) but
 * safe to run on-demand anytime.
 *
 * What it reports:
 *   - Git commits from the last 24h (site repo)
 *   - Profiles currently waiting on David's A+ sign-off (audit-a-plus-passed)
 *   - Profiles flagged with needs-reenrichment
 *   - New anomaly-flagged profiles
 *   - Stale data warnings (last-enriched > 90 days)
 *   - S-tier candidates (have angle + exclusive-connections but not signed off)
 *   - Top cross-vault-triangulation profiles (the super-connectors)
 *   - Readiness distribution
 *
 * Output: content/Admin Notes/daily-briefing-YYYY-MM-DD.md
 *
 * Usage: node scripts/morning-briefing.cjs           # writes the briefing
 *        node scripts/morning-briefing.cjs --stdout  # prints to stdout only
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { walkDir, parseFrontmatter } = require('./lib/shared.cjs');

const STDOUT_ONLY = process.argv.includes('--stdout');
const CONTENT_DIR = process.env.CONTENT_DIR || path.join(__dirname, '..', 'content');
const OUT_DIR = path.join(CONTENT_DIR, 'Admin Notes');

function today() {
  return new Date().toISOString().slice(0, 10);
}

function gitCommitsLast24h() {
  try {
    const out = execSync(
      `git log --since="24 hours ago" --pretty=format:"%h|%an|%ar|%s" --no-merges`,
      { cwd: path.join(__dirname, '..'), encoding: 'utf-8' }
    );
    if (!out.trim()) return [];
    return out.trim().split('\n').map(line => {
      const [hash, author, ago, ...rest] = line.split('|');
      return { hash, author, ago, subject: rest.join('|').slice(0, 100) };
    });
  } catch {
    return [];
  }
}

function loadAllProfiles() {
  const files = walkDir(CONTENT_DIR, '.md');
  const profiles = [];
  for (const f of files) {
    try {
      const content = fs.readFileSync(f, 'utf-8');
      const { data } = parseFrontmatter(content);
      if (data && data.title) profiles.push({ filePath: f, data });
    } catch {}
  }
  return profiles;
}

function daysSince(dateStr) {
  if (!dateStr) return Infinity;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return Infinity;
  return Math.floor((Date.now() - d.getTime()) / 86400000);
}

function rel(filePath) {
  return path.relative(CONTENT_DIR, filePath).split(path.sep).join('/');
}

function main() {
  const profiles = loadAllProfiles();
  const commits = gitCommitsLast24h();

  // Buckets
  const signoffQueue = profiles.filter(p => !!p.data['audit-a-plus-passed']);
  const needsReenrichment = profiles.filter(p => p.data['needs-reenrichment'] === true);
  const anomalyFlagged = profiles.filter(p => (p.data['anomaly-flags'] || []).length > 0);
  const stale = profiles.filter(p => {
    const ds = daysSince(p.data['last-enriched']);
    return ds > 90 && ds !== Infinity && p.data['content-readiness'] === 'verified';
  });
  const sTierCandidates = profiles.filter(p => !!p.data.angle && !!p.data['original-finding'] && !p.data['editorial-signoff-narrative']);
  const superConnectors = profiles
    .filter(p => (p.data['cross-vault-triangulation-count'] || 0) >= 3)
    .sort((a, b) => (b.data['cross-vault-triangulation-count'] || 0) - (a.data['cross-vault-triangulation-count'] || 0))
    .slice(0, 10);
  const bothSidesProfiles = profiles.filter(p => p.data['both-sides-flag'] === true);

  // Readiness distribution
  const readiness = {};
  for (const p of profiles) {
    const r = p.data['content-readiness'] || 'other';
    readiness[r] = (readiness[r] || 0) + 1;
  }

  const d = today();
  const lines = [];
  lines.push('---');
  lines.push('title: "Morning Briefing ' + d + '"');
  lines.push('type: admin-note');
  lines.push('note-type: data');
  lines.push('priority: normal');
  lines.push('status: open');
  lines.push(`last-updated: '${d}'`);
  lines.push('generated-by: scripts/morning-briefing.cjs');
  lines.push('---');
  lines.push('');
  lines.push(`# Morning Briefing — ${d}`);
  lines.push('');
  lines.push(`Generated: ${new Date().toISOString()}`);
  lines.push('');

  // Queue for David
  lines.push('## 🎯 Sign-off queue — mechanically ready for A+');
  lines.push('');
  lines.push(`**${signoffQueue.length} profiles** passed every automated A+ check and are waiting only on your manual editorial sign-off.`);
  lines.push('');
  if (signoffQueue.length > 0) {
    lines.push('Top 10 oldest (by stamp date):');
    lines.push('');
    signoffQueue
      .sort((a, b) => (a.data['audit-a-plus-passed'] || '').localeCompare(b.data['audit-a-plus-passed'] || ''))
      .slice(0, 10)
      .forEach(p => {
        lines.push(`- \`${p.data['audit-a-plus-passed']}\` **${p.data.title}** (${p.data.type}) — \`${rel(p.filePath)}\``);
      });
  }
  lines.push('');

  // S-tier candidates
  lines.push('## 💎 S-tier candidates — have angle + original-finding, no narrative sign-off');
  lines.push('');
  if (sTierCandidates.length === 0) {
    lines.push('_None yet. S-tier candidates need: `angle`, 3+ `exclusive-connections`, `original-finding`._');
  } else {
    lines.push(`**${sTierCandidates.length} profiles** have an angle written but haven't received your narrative sign-off.`);
    lines.push('');
    sTierCandidates.slice(0, 10).forEach(p => {
      const excl = (p.data['exclusive-connections'] || []).length;
      lines.push(`- **${p.data.title}** (${p.data.type}) — ${excl}/3 exclusive connections — \`${rel(p.filePath)}\``);
    });
  }
  lines.push('');

  // Super connectors
  lines.push('## 🕸 Super-connectors — top cross-vault triangulation');
  lines.push('');
  if (superConnectors.length === 0) {
    lines.push('_Run `node scripts/pipeline-janitor.cjs --cohort --write` to populate._');
  } else {
    lines.push('These profiles have connections that appear across many unrelated vault profiles — likely strong S-tier candidates:');
    lines.push('');
    superConnectors.forEach(p => {
      lines.push(`- **${p.data.title}** (${p.data.type}) — ${p.data['cross-vault-triangulation-count']} triangulations`);
    });
  }
  lines.push('');

  // Anomaly flags
  lines.push('## ⚠️ Anomaly-flagged profiles');
  lines.push('');
  if (anomalyFlagged.length === 0) {
    lines.push('_No anomaly flags in the vault._');
  } else {
    lines.push(`**${anomalyFlagged.length} profiles** have anomaly flags stamped by the cohort analyzer:`);
    lines.push('');
    anomalyFlagged.slice(0, 10).forEach(p => {
      const flags = (p.data['anomaly-flags'] || []).join(', ');
      lines.push(`- **${p.data.title}** — ${flags}`);
    });
  }
  lines.push('');

  // Both-sides
  lines.push('## 🔀 Both-sides conflicts');
  lines.push('');
  if (bothSidesProfiles.length === 0) {
    lines.push('_No both-sides conflicts flagged._');
  } else {
    lines.push(`**${bothSidesProfiles.length} profiles** have the same entity in both \`donors:\` and \`opposes:\`:`);
    lines.push('');
    bothSidesProfiles.slice(0, 10).forEach(p => {
      lines.push(`- **${p.data.title}** — \`${rel(p.filePath)}\``);
    });
  }
  lines.push('');

  // Stale verified
  lines.push('## 📅 Stale A+ profiles (enriched > 90 days ago)');
  lines.push('');
  if (stale.length === 0) {
    lines.push('_No verified profiles are stale right now._');
  } else {
    lines.push(`**${stale.length} verified profiles** are more than 90 days stale and at risk of demotion:`);
    lines.push('');
    stale.slice(0, 10).forEach(p => {
      lines.push(`- **${p.data.title}** — last enriched ${daysSince(p.data['last-enriched'])} days ago`);
    });
  }
  lines.push('');

  // Needs re-enrichment queue
  lines.push('## 🔁 Queued for re-enrichment');
  lines.push('');
  lines.push(`**${needsReenrichment.length} profiles** have \`needs-reenrichment: true\`. The next scheduled pipeline run will process them first.`);
  lines.push('');

  // Readiness distribution
  lines.push('## 📊 Vault state');
  lines.push('');
  lines.push('| Tier | Count |');
  lines.push('|------|------:|');
  const order = ['raw', 'draft', 'ready', 'verified', 's-tier'];
  for (const r of order) if (readiness[r]) lines.push(`| ${r} | ${readiness[r]} |`);
  for (const [r, c] of Object.entries(readiness)) if (!order.includes(r)) lines.push(`| ${r} | ${c} |`);
  lines.push('');

  // Last 24h commits
  lines.push('## 🔨 Commits in the last 24 hours');
  lines.push('');
  if (commits.length === 0) {
    lines.push('_No commits._');
  } else {
    lines.push(`${commits.length} commits:`);
    lines.push('');
    commits.slice(0, 20).forEach(c => {
      lines.push(`- \`${c.hash}\` ${c.subject} _(${c.author}, ${c.ago})_`);
    });
  }
  lines.push('');

  lines.push('---');
  lines.push('');
  lines.push('_Run `node scripts/morning-briefing.cjs` anytime to refresh this report._');

  const out = lines.join('\n');

  if (STDOUT_ONLY) {
    console.log(out);
    return;
  }

  const outPath = path.join(OUT_DIR, `daily-briefing-${d}.md`);
  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(outPath, out, 'utf-8');
  console.log(`Morning briefing written: ${path.relative(process.cwd(), outPath)}`);
  console.log(`  Sign-off queue: ${signoffQueue.length}`);
  console.log(`  S-tier candidates: ${sTierCandidates.length}`);
  console.log(`  Super-connectors: ${superConnectors.length}`);
  console.log(`  Anomaly-flagged: ${anomalyFlagged.length}`);
  console.log(`  Both-sides: ${bothSidesProfiles.length}`);
  console.log(`  Stale A+: ${stale.length}`);
}

main();
