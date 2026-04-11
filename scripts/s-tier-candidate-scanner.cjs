#!/usr/bin/env node
/**
 * s-tier-candidate-scanner.cjs — Surface profiles that are ripe for S-tier
 *
 * An S-tier profile needs: angle field, 3+ damning exclusive-connections,
 * original-finding field, plus both janitor audit + David narrative sign-off.
 *
 * This script SCORES every verified (A+) profile on S-tier readiness and
 * outputs a ranked list of candidates with specific missing pieces, so
 * Research Claude (or David) can start with the highest-leverage targets.
 *
 * Scoring heuristics (each profile gets 0-100):
 *   +20 has 3+ contradiction callouts in body (> [!contradiction])
 *   +15 has donation-to-policy timeline
 *   +15 has documented dark-money chain in body
 *   +10 has revolving-door or family-network section
 *   +10 has 4+ Tier 1 source types (exceeds A+ floor)
 *   +10 has cross-vault-triangulation-count >= 5 (super-connector)
 *   +10 has central-thesis already written
 *   +10 has story-grade: investigation
 *
 * Profiles with score >= 60 are strong candidates. 40-60 are worth looking at.
 * Below 40 need more foundational work before considering S-tier.
 *
 * Usage: node scripts/s-tier-candidate-scanner.cjs
 *        node scripts/s-tier-candidate-scanner.cjs --min=40
 */
const fs = require('fs');
const path = require('path');
const { walkDir, parseFrontmatter } = require('./lib/shared.cjs');
const {
  hasCallout,
  hasDonationPolicyTimeline,
  hasDarkMoneyTrace,
  hasRevolvingDoor,
} = require('./lib/checklist-helpers.cjs');

const CONTENT_DIR = process.env.CONTENT_DIR || path.join(__dirname, '..', 'content');
const MIN_ARG = process.argv.find(a => a.startsWith('--min='));
const MIN_SCORE = MIN_ARG ? parseInt(MIN_ARG.split('=')[1]) : 40;
const REPORT_PATH = path.join(CONTENT_DIR, 'Admin Notes', 's-tier-candidates.md');

function countContradictions(body) {
  const matches = body.match(/>\s*\[!contradiction\]/gi) || [];
  return matches.length;
}

function scoreProfile(data, body) {
  const reasons = [];
  let score = 0;

  const contradictionCount = countContradictions(body);
  if (contradictionCount >= 3) {
    score += 20;
    reasons.push(`${contradictionCount} contradiction callouts`);
  } else if (contradictionCount >= 1) {
    score += 10;
    reasons.push(`${contradictionCount} contradiction callout(s) (need 3+ for full credit)`);
  }

  if (hasDonationPolicyTimeline(body)) {
    score += 15;
    reasons.push('donation-to-policy timeline present');
  }

  if (hasDarkMoneyTrace(body)) {
    score += 15;
    reasons.push('dark money chain documented');
  }

  if (hasRevolvingDoor(body)) {
    score += 10;
    reasons.push('revolving door / family network mapped');
  }

  const sourceTypes = (data['source-types'] || []).length;
  if (sourceTypes >= 4) {
    score += 10;
    reasons.push(`${sourceTypes} Tier 1 source types`);
  }

  const triangulation = data['cross-vault-triangulation-count'] || 0;
  if (triangulation >= 5) {
    score += 10;
    reasons.push(`super-connector (${triangulation} triangulations)`);
  } else if (triangulation >= 3) {
    score += 5;
    reasons.push(`${triangulation} triangulations`);
  }

  if (data['central-thesis']) {
    score += 10;
    reasons.push('central-thesis written');
  }

  if (data['story-grade'] === 'investigation') {
    score += 10;
    reasons.push('story-grade: investigation');
  }

  return { score, reasons };
}

function missingPieces(data) {
  const missing = [];
  if (!data.angle) missing.push('angle field (THE forcing function)');
  if ((data['exclusive-connections'] || []).length < 3) {
    missing.push(`exclusive-connections (${(data['exclusive-connections'] || []).length}/3)`);
  }
  if (!data['original-finding']) missing.push('original-finding');
  if (!data['audit-s-tier-passed']) missing.push('audit-s-tier-passed (run janitor --tier=s)');
  if (!data['editorial-signoff-narrative']) missing.push('editorial-signoff-narrative (David)');
  return missing;
}

function main() {
  const files = walkDir(CONTENT_DIR, '.md');
  const candidates = [];

  for (const f of files) {
    let content;
    try { content = fs.readFileSync(f, 'utf-8'); } catch { continue; }
    const { data, body } = parseFrontmatter(content);
    if (!data || !data.title) continue;

    // Only consider profiles already at verified OR with A+ audit passed
    const eligible = data['content-readiness'] === 'verified'
      || !!data['audit-a-plus-passed'];
    if (!eligible) continue;

    const { score, reasons } = scoreProfile(data, body);
    if (score < MIN_SCORE) continue;

    const missing = missingPieces(data);
    candidates.push({
      filePath: f,
      title: data.title,
      type: data.type,
      score,
      reasons,
      missing,
    });
  }

  candidates.sort((a, b) => b.score - a.score);

  const lines = [];
  lines.push('---');
  lines.push('title: "S-Tier Candidate Rankings"');
  lines.push('type: admin-note');
  lines.push('note-type: research');
  lines.push('priority: normal');
  lines.push('status: open');
  lines.push(`last-updated: '${new Date().toISOString().slice(0, 10)}'`);
  lines.push('generated-by: scripts/s-tier-candidate-scanner.cjs');
  lines.push('---');
  lines.push('');
  lines.push('# S-Tier Candidate Rankings');
  lines.push('');
  lines.push(`Generated: ${new Date().toISOString()}`);
  lines.push('');
  lines.push(`Min score: ${MIN_SCORE}/100. Candidates: **${candidates.length}**.`);
  lines.push('');
  lines.push('## Scoring heuristic');
  lines.push('');
  lines.push('- **Strong (60+):** Ripe for S-tier. Research Claude should write the `angle:` and `exclusive-connections:` fields now.');
  lines.push('- **Promising (40-59):** Worth investigating. Usually missing a contradiction count or a dark-money trace.');
  lines.push('- **Below 40:** Not shown by default. These need more foundational investigation work first.');
  lines.push('');
  lines.push('## Candidates');
  lines.push('');

  for (const c of candidates) {
    lines.push(`### ${c.title}  _[${c.score}/100]_`);
    lines.push('');
    lines.push(`- **Type:** ${c.type}`);
    lines.push(`- **Path:** \`${path.relative(CONTENT_DIR, c.filePath).split(path.sep).join('/')}\``);
    lines.push(`- **Strengths:**`);
    c.reasons.forEach(r => lines.push(`  - ${r}`));
    lines.push(`- **Missing for S-tier:**`);
    c.missing.forEach(m => lines.push(`  - ${m}`));
    lines.push('');
  }

  if (candidates.length === 0) {
    lines.push('_No candidates meet the minimum score. Lower the threshold with `--min=30` or do more A+ audit passes first._');
  }

  fs.mkdirSync(path.dirname(REPORT_PATH), { recursive: true });
  fs.writeFileSync(REPORT_PATH, lines.join('\n'), 'utf-8');
  console.log(`S-tier candidate report: ${path.relative(process.cwd(), REPORT_PATH)}`);
  console.log(`Candidates (score >= ${MIN_SCORE}): ${candidates.length}`);
}

main();
