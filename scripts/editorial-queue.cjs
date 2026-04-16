#!/usr/bin/env node
/**
 * editorial-queue.cjs
 *
 * Generates a prioritized list of vault profiles needing editorial work.
 * Research Claude runs this at the start of a batch editorial session.
 *
 * Usage:
 *   node scripts/editorial-queue.cjs               # top 20
 *   node scripts/editorial-queue.cjs --limit 50    # top N
 *   node scripts/editorial-queue.cjs --type donor  # donors only
 *   node scripts/editorial-queue.cjs --type politician
 *   node scripts/editorial-queue.cjs --csv         # CSV output for spreadsheet
 */

'use strict';

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const args = process.argv.slice(2);
const limit = (() => {
  const i = args.indexOf('--limit');
  return i !== -1 ? parseInt(args[i + 1], 10) : 20;
})();
const filterType = (() => {
  const i = args.indexOf('--type');
  return i !== -1 ? args[i + 1] : null;
})();
const csvMode = args.includes('--csv');

const CONTENT_DIRS = [
  'content/Politicians',
  'content/Donors & Power Networks',
];

const SKIP_READINESS = new Set(['verified', 's-tier']);

// Profiles to skip — pipeline data known stale or incomplete
function toStr(val) {
  if (!val) return '';
  if (Array.isArray(val)) return val.join(' ');
  return String(val);
}

function shouldSkip(fm, body) {
  if (fm['needs-reenrichment']) return 'needs-reenrichment flag set';
  const gaps = toStr(fm['known-gaps']).toLowerCase();
  if (/needs.*pipeline|awaits pipeline|not yet enriched|needs fresh/.test(gaps)) {
    return 'known-gaps references missing pipeline data';
  }
  const notes = toStr(fm['internal-notes']).toLowerCase();
  if (/data.*stripped|needs repopulation|pipeline.*failed/.test(notes)) {
    return 'internal-notes indicates data stripped/failed';
  }
  return null;
}

function scoreProfile(fm, body, filePath) {
  let score = 0;
  const readiness = fm['content-readiness'] || 'raw';

  // Data richness — more data = more to work with editorially
  const hasFEC = !!(fm['fec-candidate-id'] || fm['total-raised'] || fm['total-received']);
  const hasRelationships = !!(fm['top-donors'] || fm['politicians-funded'] || fm['donors']);
  const hasCommittees = Array.isArray(fm['committees']) && fm['committees'].length > 0;
  const hasBills = !!(fm['bills-sponsored'] || fm['bills-enacted']);
  const hasContracts = !!(fm['federal-contracts'] || fm['government-contract-edges']);

  if (hasFEC) score += 30;
  if (hasRelationships) score += 20;
  if (hasCommittees) score += 10;
  if (hasBills) score += 10;
  if (hasContracts) score += 10;

  // Editorial gaps — missing sections are editorial opportunities
  const hasClassAnalysis = body.includes('## Class Analysis');
  const hasCoreContradiction = body.includes('[!contradiction]');
  const hasTimeline = body.includes('Donation-to-Policy Timeline') || body.includes('| Date |');
  const hasCentralThesis = !!fm['central-thesis'];
  const hasDonorClassMap = body.includes('## Donor Class Map') || body.includes('## Who They Fund');

  if (!hasClassAnalysis) score += 30;       // Hard gate for ready — big opportunity
  if (!hasCoreContradiction) score += 15;
  if (!hasCentralThesis) score += 15;
  if (!hasDonorClassMap) score += 10;
  if (!hasTimeline) score += 10;

  // Readiness — profiles close to promotion are worth more
  if (readiness === 'ready') score += 15;   // One step from David's sign-off
  if (readiness === 'draft') score += 5;

  // Body length penalty — if already rich, less marginal value
  const bodyLength = body.length;
  if (bodyLength > 5000) score -= 15;
  if (bodyLength > 10000) score -= 10;

  // Sector bonuses — high-profile sectors worth prioritizing
  const sector = (fm.sector || '').toLowerCase();
  const issues = JSON.stringify(fm.issues || '').toLowerCase();
  if (/defense|military|weapons/.test(sector + issues)) score += 5;
  if (/finance|banking|investment/.test(sector + issues)) score += 5;
  if (/fossil|oil|gas|coal|energy/.test(sector + issues)) score += 5;

  // Financial scale bonus — bigger donors/fundraisers are higher-impact editorials
  const totalRaised = parseFloat(String(fm['total-raised'] || fm['total-received'] || '0').replace(/[$,]/g, ''));
  if (totalRaised > 10_000_000) score += 15;
  else if (totalRaised > 1_000_000) score += 10;
  else if (totalRaised > 100_000) score += 5;

  // Chamber bonus — Senate > House (longer tenure, more donor influence)
  if (fm.chamber === 'Senate') score += 8;

  // Leadership role bonus
  if (Array.isArray(fm['leadership-roles']) && fm['leadership-roles'].length > 0) score += 10;
  if (fm['leadership-roles'] && String(fm['leadership-roles']).toLowerCase().includes('chair')) score += 5;

  return {
    score,
    hasFEC,
    hasRelationships,
    hasClassAnalysis,
    hasCoreContradiction,
    hasCentralThesis,
    hasTimeline,
    readiness,
    bodyLength,
  };
}

function walk(dir, results) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch (e) {
    return; // skip unreadable dirs (worktree symlink issues)
  }

  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full, results);
    } else if (entry.name.endsWith('.md') && entry.name.startsWith('_')) {
      // Only master profiles (prefixed with _)
      processFile(full, results);
    }
  }
}

function processFile(filePath, results) {
  let text;
  try {
    text = fs.readFileSync(filePath, 'utf-8');
  } catch (e) {
    return;
  }

  const m = text.match(/^---\n([\s\S]*?)\n---/);
  if (!m) return;

  let fm;
  try {
    fm = yaml.load(m[1]);
  } catch (e) {
    return; // broken YAML — preflight should have caught it
  }

  if (!fm || typeof fm !== 'object') return;

  const readiness = fm['content-readiness'] || 'raw';
  if (SKIP_READINESS.has(readiness)) return;

  const type = fm.type || 'unknown';
  if (filterType && !type.includes(filterType)) return;

  const skipReason = shouldSkip(fm, text);

  // Body = everything after the closing ---
  const closingFm = text.indexOf('---', 3);
  const body = closingFm !== -1 ? text.slice(closingFm + 3) : '';

  const scored = scoreProfile(fm, body, filePath);

  results.push({
    filePath,
    title: fm.title || path.basename(filePath, '.md'),
    type,
    party: fm.party || '',
    sector: fm.sector || '',
    skipReason,
    ...scored,
  });
}

// Main
const queue = [];
for (const dir of CONTENT_DIRS) {
  walk(dir, queue);
}

// Separate skippable from actionable
const actionable = queue.filter(p => !p.skipReason);
const skipped = queue.filter(p => p.skipReason);

actionable.sort((a, b) => b.score - a.score);

const top = actionable.slice(0, limit);

if (csvMode) {
  // CSV output
  const headers = ['Score','Title','Type','Party/Sector','Readiness','Has CA','Has $','Has Thesis','Has Timeline','Body Chars','Skip Reason','File'];
  console.log(headers.join(','));
  for (const p of top) {
    const row = [
      p.score,
      `"${p.title.replace(/"/g, '')}"`,
      p.type,
      p.party || p.sector,
      p.readiness,
      p.hasClassAnalysis ? 'Y' : 'N',
      p.hasFEC ? 'Y' : 'N',
      p.hasCentralThesis ? 'Y' : 'N',
      p.hasTimeline ? 'Y' : 'N',
      p.bodyLength,
      '',
      `"${p.filePath}"`,
    ];
    console.log(row.join(','));
  }
} else {
  // Human-readable output
  console.log(`\nEditorial Queue — Top ${top.length} profiles\n`);
  console.log('Score | Readiness | Type        | CA | $  | Thesis | Title');
  console.log('------|-----------|-------------|----|----|--------|------');

  for (const p of top) {
    const ca = p.hasClassAnalysis ? 'Y' : 'N';
    const fec = p.hasFEC ? 'Y' : 'N';
    const thesis = p.hasCentralThesis ? 'Y' : 'N';
    const typeStr = p.type.padEnd(11);
    const readStr = p.readiness.padEnd(9);
    console.log(`  ${p.score.toString().padStart(3)} | ${readStr} | ${typeStr} | ${ca}  | ${fec}  | ${thesis}      | ${p.title}`);
    console.log(`      |           | File: ${p.filePath}`);
  }

  console.log(`\nTotal actionable: ${actionable.length} | Skipped (stale/incomplete): ${skipped.length}`);
  console.log('\nMissing Class Analysis (top opportunity):');
  const noCA = actionable.filter(p => !p.hasClassAnalysis && p.hasFEC).slice(0, 5);
  for (const p of noCA) {
    console.log(`  ${p.title} (${p.readiness}, score ${p.score})`);
    console.log(`    ${p.filePath}`);
  }
}
