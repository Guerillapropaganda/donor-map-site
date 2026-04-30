#!/usr/bin/env node
/**
 * build-cal-access-panels.cjs — Cal-Access auto-block injection
 *
 * For each candidate in data/cal-access-filer-overrides.json, build a
 * markdown panel summarizing their CA state-level campaign finance:
 *   - Top 25 donors (direct controlled-committee receipts, all cycles)
 *   - IE-supporting committees + each PAC's top donors
 *   - IE-opposing committees + each PAC's top donors
 *   - Per-cycle dollar totals
 *
 * Inserts/updates the auto-block:
 *   <!-- auto:cal-access start -->
 *   ...
 *   <!-- auto:cal-access end -->
 *
 * Idempotent. Same convention as build-profile-data-panels.cjs +
 * the FEC lifetime auto-block. Block placement: after the existing
 * fec-lifetime block if present, otherwise after data-panel, else
 * immediately after the frontmatter closing `---`.
 *
 * Source: data/derived/cal-access-bulk.jsonl (edges) + the override
 * map (candidate → committees). Reads via the relationships-store
 * library so it picks up any cross-source dedup.
 *
 * Usage:
 *   node scripts/build-cal-access-panels.cjs              # dry-run
 *   node scripts/build-cal-access-panels.cjs --write
 *   node scripts/build-cal-access-panels.cjs --write --candidate "Tom Steyer"
 *   node scripts/build-cal-access-panels.cjs --write --verbose
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const OVERRIDES = path.join(ROOT, 'data', 'cal-access-filer-overrides.json');
const EDGE_FILE = path.join(ROOT, 'data', 'derived', 'cal-access-bulk.jsonl');
const CONTENT_DIR = path.join(ROOT, 'content');

const args = process.argv.slice(2);
const WRITE = args.includes('--write');
const VERBOSE = args.includes('--verbose');
const CAND_IDX = args.indexOf('--candidate');
const ONLY = CAND_IDX >= 0 ? args[CAND_IDX + 1] : null;
const TOP_N_DONORS = 25;
const TOP_N_PAC_DONORS = 10;

const BLOCK_START = '<!-- auto:cal-access start -->';
const BLOCK_END = '<!-- auto:cal-access end -->';

function fmtMoney(n) {
  if (!n) return '$0';
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  return `$${n.toFixed(0)}`;
}

function loadEdges() {
  if (!fs.existsSync(EDGE_FILE)) {
    throw new Error(`Cal-Access edges missing: ${EDGE_FILE}\nRun: node scripts/ingest-cal-access-bulk.cjs`);
  }
  const edges = [];
  for (const line of fs.readFileSync(EDGE_FILE, 'utf-8').split('\n')) {
    if (!line.trim()) continue;
    try { edges.push(JSON.parse(line)); } catch { /* skip */ }
  }
  return edges;
}

function findProfile(candidate) {
  // Both common shapes: subdir-style (_<Name> Master Profile.md) or
  // flat <Name>.md. Search content/ recursively for the canonical
  // profile path.
  const subdir = path.join(
    CONTENT_DIR,
    'Politicians',
    'Races',
    'CA Governor 2026',
    candidate,
    `_${candidate} Master Profile.md`,
  );
  if (fs.existsSync(subdir)) return subdir;
  const flat = path.join(
    CONTENT_DIR,
    'Politicians',
    'Races',
    'CA Governor 2026',
    `${candidate}.md`,
  );
  if (fs.existsSync(flat)) return flat;
  return null;
}

function buildPanel(candidate, candData, edges) {
  const ctrlNames = new Set((candData.controlled || []).map((c) => c.name));
  const ieSupNames = new Set((candData.ie_supporting || []).map((c) => c.name));
  const ieOppNames = new Set((candData.ie_opposing || []).map((c) => c.name));

  // Direct = donor → candidate (controlled committees collapsed)
  const directEdges = edges.filter((e) => e.type === 'monetary' && e.to === candidate);

  // IE-PAC receipts = donor → IE PAC committee. We aggregate per-PAC.
  const ieSupEdges = edges.filter((e) => e.type === 'monetary' && ieSupNames.has(e.to));
  const ieOppEdges = edges.filter((e) => e.type === 'monetary' && ieOppNames.has(e.to));

  // Direct top donors
  const directByDonor = new Map();
  for (const e of directEdges) {
    const cur = directByDonor.get(e.from) || { name: e.from, total: 0, cycles: new Set(), txns: 0 };
    cur.total += e.amount || 0;
    if (e.cycle) cur.cycles.add(String(e.cycle));
    cur.txns += 1;
    directByDonor.set(e.from, cur);
  }
  const topDirect = [...directByDonor.values()].sort((a, b) => b.total - a.total).slice(0, TOP_N_DONORS);
  const directTotal = directEdges.reduce((s, e) => s + (e.amount || 0), 0);

  // Cycle breakdown for direct
  const directByCycle = new Map();
  for (const e of directEdges) {
    if (!e.cycle) continue;
    directByCycle.set(String(e.cycle), (directByCycle.get(String(e.cycle)) || 0) + (e.amount || 0));
  }

  // Per-PAC summaries (IE)
  function summarizePAC(pacName, pacEdges) {
    const byDonor = new Map();
    for (const e of pacEdges) {
      const cur = byDonor.get(e.from) || { name: e.from, total: 0 };
      cur.total += e.amount || 0;
      byDonor.set(e.from, cur);
    }
    const top = [...byDonor.values()].sort((a, b) => b.total - a.total).slice(0, TOP_N_PAC_DONORS);
    const total = pacEdges.reduce((s, e) => s + (e.amount || 0), 0);
    return { name: pacName, total, top, edge_count: pacEdges.length };
  }

  const ieSupPACs = [...ieSupNames]
    .map((n) => summarizePAC(n, ieSupEdges.filter((e) => e.to === n)))
    .filter((p) => p.total > 0)
    .sort((a, b) => b.total - a.total);
  const ieOppPACs = [...ieOppNames]
    .map((n) => summarizePAC(n, ieOppEdges.filter((e) => e.to === n)))
    .filter((p) => p.total > 0)
    .sort((a, b) => b.total - a.total);

  const ieSupTotal = ieSupPACs.reduce((s, p) => s + p.total, 0);
  const ieOppTotal = ieOppPACs.reduce((s, p) => s + p.total, 0);

  // Find filer IDs of controlled committees (for source link)
  const controlledIds = (candData.controlled || []).map((c) => c.filer_id).slice(0, 3);
  const ctrlListing = (candData.controlled || [])
    .map((c) => `${c.name} \`${c.filer_id}\``)
    .slice(0, 6)
    .join(' · ');

  // ── Render panel
  const lines = [];
  lines.push(BLOCK_START);
  lines.push('<!-- Generated by scripts/build-cal-access-panels.cjs - do not edit by hand -->');
  lines.push('<!-- tier: paid -->');
  lines.push('');
  lines.push('### California Cal-Access — state-level campaign finance');
  lines.push('');
  lines.push(`**Direct contributions** (donor → candidate-controlled committees): **${fmtMoney(directTotal)}** across ${directEdges.length} edges, ${directByDonor.size} unique donors.`);
  if (ieSupTotal > 0) lines.push(`**IE supporting** (donor → independent expenditure PAC backing this candidate): **${fmtMoney(ieSupTotal)}** across ${ieSupPACs.length} PAC(s).`);
  if (ieOppTotal > 0) lines.push(`**IE opposing** (donor → IE PAC running against): **${fmtMoney(ieOppTotal)}** across ${ieOppPACs.length} PAC(s).`);
  if (ctrlListing) {
    lines.push('');
    lines.push(`**Controlled committees:** ${ctrlListing}${(candData.controlled || []).length > 6 ? ` _+${candData.controlled.length - 6} more_` : ''}`);
  }
  lines.push('');

  // Top direct donors table
  if (topDirect.length > 0) {
    lines.push('#### Top direct donors (lifetime)');
    lines.push('');
    lines.push('| Donor | Total | Cycles | Txns |');
    lines.push('|---|---:|---:|---:|');
    for (const d of topDirect) {
      const cycles = [...d.cycles].sort().join(', ');
      lines.push(`| ${d.name} | ${fmtMoney(d.total)} | ${cycles} | ${d.txns} |`);
    }
    if (directByDonor.size > TOP_N_DONORS) {
      lines.push(`| _+${directByDonor.size - TOP_N_DONORS} more donors_ | _${fmtMoney(directTotal - topDirect.reduce((s, d) => s + d.total, 0))}_ | | |`);
    }
    lines.push('');
  }

  // Cycle breakdown
  if (directByCycle.size > 1) {
    lines.push('#### Direct contributions by cycle');
    lines.push('');
    lines.push('| Cycle | Direct $ |');
    lines.push('|---|---:|');
    for (const cycle of [...directByCycle.keys()].sort()) {
      lines.push(`| ${cycle} | ${fmtMoney(directByCycle.get(cycle))} |`);
    }
    lines.push('');
  }

  // IE-supporting PACs
  if (ieSupPACs.length > 0) {
    lines.push('#### Independent expenditure PACs supporting this candidate');
    lines.push('');
    for (const pac of ieSupPACs) {
      lines.push(`**${pac.name}** — ${fmtMoney(pac.total)} from ${pac.edge_count} edges`);
      lines.push('');
      if (pac.top.length > 0) {
        lines.push('| Donor | Amount |');
        lines.push('|---|---:|');
        for (const d of pac.top) lines.push(`| ${d.name} | ${fmtMoney(d.total)} |`);
        lines.push('');
      }
    }
  }

  // IE-opposing PACs
  if (ieOppPACs.length > 0) {
    lines.push('#### Independent expenditure PACs opposing this candidate');
    lines.push('');
    for (const pac of ieOppPACs) {
      lines.push(`**${pac.name}** — ${fmtMoney(pac.total)} from ${pac.edge_count} edges`);
      lines.push('');
      if (pac.top.length > 0) {
        lines.push('| Donor | Amount |');
        lines.push('|---|---:|');
        for (const d of pac.top) lines.push(`| ${d.name} | ${fmtMoney(d.total)} |`);
        lines.push('');
      }
    }
  }

  // Footer + source links
  lines.push('---');
  lines.push('');
  const sourceUrls = controlledIds
    .map((id) => `[${id}](https://cal-access.sos.ca.gov/Campaign/Committees/Detail.aspx?id=${id})`)
    .join(' · ');
  lines.push(`*Source: California Cal-Access bulk RCPT_CD via \`scripts/ingest-cal-access-bulk.cjs\`. Committees: ${sourceUrls || '(none)'}. Refresh: download fresh dump, run discovery + ingest.*`);
  lines.push('');
  lines.push(BLOCK_END);
  return lines.join('\n');
}

function injectPanel(content, panel) {
  // Replace existing block if present
  const startIdx = content.indexOf(BLOCK_START);
  const endIdx = content.indexOf(BLOCK_END);
  if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
    return content.slice(0, startIdx) + panel + content.slice(endIdx + BLOCK_END.length);
  }
  // Find a good insertion point. Priority:
  //   1. After <!-- auto:fec-lifetime end -->
  //   2. After <!-- auto:data-panel end -->
  //   3. After frontmatter ---
  for (const marker of ['<!-- auto:fec-lifetime end -->', '<!-- auto:data-panel end -->']) {
    const idx = content.indexOf(marker);
    if (idx !== -1) {
      const cut = idx + marker.length;
      return content.slice(0, cut) + '\n\n' + panel + content.slice(cut);
    }
  }
  // Fallback: after frontmatter
  const fmEnd = content.indexOf('\n---\n', 4);
  if (fmEnd !== -1) {
    const cut = fmEnd + 5;
    return content.slice(0, cut) + '\n' + panel + '\n' + content.slice(cut);
  }
  // No frontmatter — prepend
  return panel + '\n\n' + content;
}

(function main() {
  console.log(`[build-cal-access-panels] mode=${WRITE ? 'WRITE' : 'DRY RUN'}  candidate=${ONLY || 'all'}`);
  const overrides = JSON.parse(fs.readFileSync(OVERRIDES, 'utf-8'));
  const edges = loadEdges();
  console.log(`  loaded ${edges.length} edges from ${EDGE_FILE}`);

  let updated = 0;
  let skipped = 0;
  let missingProfile = 0;

  for (const [candidate, candData] of Object.entries(overrides.candidates)) {
    if (ONLY && candidate !== ONLY) continue;
    const profile = findProfile(candidate);
    if (!profile) {
      console.log(`  ⚠ ${candidate}: no profile file found`);
      missingProfile++;
      continue;
    }
    const panel = buildPanel(candidate, candData, edges);
    const before = fs.readFileSync(profile, 'utf-8');
    const after = injectPanel(before, panel);
    if (before === after) {
      skipped++;
      if (VERBOSE) console.log(`  · ${candidate}: no change`);
      continue;
    }
    if (WRITE) {
      fs.writeFileSync(profile, after, 'utf-8');
      updated++;
      console.log(`  ✓ ${candidate}: panel written (${(after.length - before.length).toLocaleString()} bytes added)`);
    } else {
      updated++;
      console.log(`  + ${candidate}: would update (${(after.length - before.length).toLocaleString()} bytes diff)`);
    }
  }

  console.log(`\n  ${updated} ${WRITE ? 'updated' : 'would update'}, ${skipped} unchanged, ${missingProfile} missing profile`);
  if (!WRITE) console.log('  Re-run with --write to apply.');
})();
