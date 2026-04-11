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
const {
  resolveChecks,
  getPromotionGate,
  resolveTopLevelType,
} = require('./lib/profile-type-rulebook.cjs');
const { runCheck } = require('./lib/checklist-helpers.cjs');

const CONTENT_DIR = process.env.CONTENT_DIR || path.join(__dirname, '..', 'content');
const SOURCE_NAME = 'promotion-candidate-queue';

// Per-check effort estimates (minutes). Unknown checks default to 5 min.
// These are editorial time estimates, not pipeline time estimates.
const EFFORT_BY_CHECK = {
  'class-analysis-heading': 15,
  'central-thesis-present': 5,
  'legal-review-if-defamation': 5,
  'tier1-source-count-gte-3': 10,
  'tier1-source-count-gte-2': 7,
  'story-grade-set': 2,
  'editorial-signoff-present': 3,
  'audit-a-plus-passed-stamp': 2,
  'last-enriched-within-90-days': 1,
  'last-enriched-within-180-days': 1,
};

function assessProfile(data, body) {
  // If the janitor already stamped audit-a-plus-passed AND we're just waiting
  // on editorial sign-off, this is the cheapest path to A+. Report that
  // specifically so the UI can surface "ready for your review" items.
  if (data['audit-a-plus-passed'] && data['last-verified-by'] !== 'editorial') {
    return {
      missing: [`David's sign-off (janitor stamped ${data['audit-a-plus-passed']})`],
      effort: 2,
      signoffOnly: true,
    };
  }

  // Otherwise, consult the rulebook for this profile's type + category.
  // Use the top-level type so flat values like "corporation" (a sub-category
  // of entity) resolve correctly. resolveChecks applies sub-category
  // overrides (adds/removes/replaces) so e.g. a president's rulebook adds
  // executive-orders-documented and removes voting-record, while a media
  // figure uses tier1-source-count-gte-2.
  const topLevel = resolveTopLevelType(data.type) || data.type;
  // If the flat type IS a sub-category (e.g. corporation → entity), pass
  // the flat type as the category so its overrides apply.
  let category;
  if (topLevel !== data.type) {
    category = data.type; // flat type is the sub-category
  } else {
    category = Array.isArray(data.category) ? data.category[0] : data.category;
  }
  const resolved = resolveChecks(topLevel, category, 'verified');

  const missing = [];
  let totalEffortMin = 0;
  for (const checkId of resolved.required) {
    const result = runCheck(checkId, data, body, {
      type: topLevel,
      category,
      tier: 'verified',
    });
    if (result.passed || result.na) continue;
    // Skip reasons from stubbed checks — they always pass so they won't
    // reach here, but be defensive.
    if (result.reason && result.reason.startsWith('[stub:')) continue;
    missing.push(`${checkId}: ${result.reason || 'failed'}`);
    totalEffortMin += EFFORT_BY_CHECK[checkId] || 5;
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
    // Skip types whose verified promotion gate is "none" in the rulebook
    // (event, meta and all meta sub-categories). They don't promote.
    // Note: `story` IS promotable now — stories have a verified tier.
    // resolveTopLevelType handles flat type values like "corporation"
    // which are sub-categories of the top-level `entity` type.
    const topLevel = resolveTopLevelType(data.type);
    if (!topLevel) continue; // unknown type, skip
    const verifiedGate = getPromotionGate(topLevel, 'verified');
    if (verifiedGate === 'none' || verifiedGate === null) continue;

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
