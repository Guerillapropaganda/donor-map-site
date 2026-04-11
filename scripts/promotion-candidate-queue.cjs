#!/usr/bin/env node
/**
 * promotion-candidate-queue.cjs — rank ready profiles by cheapest
 * path to A+ (verified)
 *
 * The daily "what should I work on" answer. Walks every ready-tier
 * profile, scores how far it is from A+, and ranks by effort. Top of
 * the list is the cheapest win.
 *
 * Scoring:
 *   - profile has audit-a-plus-passed stamp → only waiting on David's sign-off
 *     (cheapest possible — ~2 min of review)
 *   - profile has all pipeline data but is missing central-thesis or
 *     story-grade → small Research Claude task (~8 min)
 *   - profile is missing pipeline data → bigger effort (~20 min)
 *   - profile has failing hard checks (no class analysis, legal review) →
 *     biggest effort (~30 min)
 *
 * Output: Attention Queue entries in the "deciding" bucket. Top 10.
 *
 * Usage:
 *   node scripts/promotion-candidate-queue.cjs
 */
const fs = require('fs');
const path = require('path');
const { walkDir, parseFrontmatter } = require('./lib/shared.cjs');
const { addEntries, clearSource } = require('./lib/attention-queue.cjs');
const { getRejectedPatterns } = require('./lib/false-positive-log.cjs');

const CONTENT_DIR = process.env.CONTENT_DIR || path.join(__dirname, '..', 'content');
const SOURCE_NAME = 'promotion-candidate-queue';

function assessProfile(data, body) {
  const missing = [];
  let totalEffortMin = 0;

  // Pipeline data present?
  const hasFec = /^fec-(candidate|committee)-id:/m.test(body) ? false : !!data['fec-candidate-id'] || !!data['fec-committee-id'];
  const hasSourceTypes3Plus = Array.isArray(data['source-types']) && data['source-types'].length >= 3;
  if (!hasSourceTypes3Plus) {
    missing.push(`needs 3+ Tier 1 source types (has ${(data['source-types'] || []).length})`);
    totalEffortMin += 10;
  }

  // Narrative required fields
  if (!data['central-thesis']) {
    missing.push('no central-thesis field');
    totalEffortMin += 5;
  }
  if (!data['story-grade']) {
    missing.push('no story-grade field');
    totalEffortMin += 2;
  }

  // Class analysis section
  const hasClassAnalysis = /^##\s+Class Analysis/m.test(body);
  if (!hasClassAnalysis) {
    missing.push('no ## Class Analysis section');
    totalEffortMin += 15;
  }

  // Legal review
  if (!data['legal-review-result'] || data['legal-review-result'] !== 'pass') {
    // Check if body has any defamation-prone words outside blockquotes
    const lines = body.split(/\r?\n/);
    let hasRiskyWord = false;
    for (const line of lines) {
      if (/^\s*>/.test(line)) continue;
      if (/\b(fraud|criminal|corrupt|scheme|conspired|bribed|embezzled|kickback)\b/i.test(line)) {
        hasRiskyWord = true;
        break;
      }
    }
    if (hasRiskyWord) {
      missing.push('legal review needed (risky language present)');
      totalEffortMin += 5;
    }
  }

  // Editorial sign-off
  if (data['last-verified-by'] !== 'editorial') {
    missing.push("David's sign-off");
    totalEffortMin += 3;
  }

  // Bonus: janitor already stamped it? Reduce the effort estimate
  if (data['audit-a-plus-passed'] && data['last-verified-by'] !== 'editorial') {
    // Only waiting on sign-off — the janitor already validated everything else
    return { missing: [`David's sign-off (janitor stamped ${data['audit-a-plus-passed']})`], effort: 2, signoffOnly: true };
  }

  return { missing, effort: totalEffortMin, signoffOnly: false };
}

function main() {
  const files = walkDir(CONTENT_DIR, '.md');
  const rejected = getRejectedPatterns(SOURCE_NAME);
  const candidates = [];

  for (const f of files) {
    let content;
    try { content = fs.readFileSync(f, 'utf-8'); } catch { continue; }
    const { data, body } = parseFrontmatter(content);
    if (!data || !data.title) continue;

    // Only look at ready profiles
    if (data['content-readiness'] !== 'ready') continue;
    // Skip non-editorial types
    const skipTypes = ['admin-note', 'sub-note', 'story', 'event', 'daily-update', 'digest', 'reference', 'methodology', 'system', 'page', 'index'];
    if (skipTypes.includes(data.type)) continue;

    const { missing, effort, signoffOnly } = assessProfile(data, body);
    const patternKey = `${data.title}:promo`;
    if (rejected.has(patternKey)) continue;

    candidates.push({
      file: f,
      title: data.title,
      type: data.type,
      missing,
      effort,
      signoffOnly,
    });
  }

  // Sort: sign-off-only first (cheapest wins), then by effort ascending
  candidates.sort((a, b) => {
    if (a.signoffOnly !== b.signoffOnly) return a.signoffOnly ? -1 : 1;
    return a.effort - b.effort;
  });

  const entries = candidates.slice(0, 10).map(c => {
    const rel = path.relative(CONTENT_DIR, c.file).split(path.sep).join('/');
    if (c.signoffOnly) {
      return {
        bucket: 'deciding',
        what: `${c.title}: ready for A+ sign-off`,
        why: `This profile passed every automated A+ check. Only ${c.missing[0]} remains. Open it, glance at the narrative, flip last-verified-by: editorial, done.`,
        where: `content/${rel}`,
        cost_min: c.effort,
        leverage: 5,
        metadata: { signoffOnly: true, type: c.type },
      };
    }
    return {
      bucket: 'deciding',
      what: `${c.title}: needs ${c.missing.length} fix${c.missing.length === 1 ? '' : 'es'} for A+`,
      why: `Closest ready profile to verified. Missing: ${c.missing.slice(0, 3).join('; ')}${c.missing.length > 3 ? `; and ${c.missing.length - 3} more` : ''}. Total estimated effort: ${c.effort} min.`,
      where: `content/${rel}`,
      cost_min: c.effort,
      leverage: Math.max(2, 5 - Math.floor(c.effort / 10)),
      metadata: { missing: c.missing, type: c.type },
    };
  });

  if (entries.length === 0) {
    clearSource(SOURCE_NAME);
    console.log('Promotion Candidate Queue: no ready profiles are close to A+.');
    console.log(`  (${candidates.length} ready profiles audited)`);
    return;
  }

  const count = addEntries(SOURCE_NAME, entries);
  console.log(`Promotion Candidate Queue: ${count} profiles ranked.`);
  console.log(`  Top of list: ${candidates[0].title} (${candidates[0].effort} min)`);
  const signoffOnly = candidates.filter(c => c.signoffOnly).length;
  if (signoffOnly > 0) {
    console.log(`  Sign-off only: ${signoffOnly} profiles (janitor already stamped A+)`);
  }
}

main();
