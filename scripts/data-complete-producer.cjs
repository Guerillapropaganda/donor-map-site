#!/usr/bin/env node
/**
 * data-complete-producer.cjs
 *
 * Phase 2D of ADR-0029. Walks every profile at `content-readiness: ready`,
 * evaluates the ADR-0017 data-complete gates, and:
 *
 *   - PASSES all gates → upsert candidate (state=candidate). David's
 *     batch-approval queue on /audit-claude-decisions picks it up.
 *
 *   - Fails 1-2 gates → upsert candidate at state=stuck with gap_reasons.
 *     Surfaces "X is one source-freshness refresh away from publishing"
 *     to the attention queue (mirrors Phase 2C's stuck pattern).
 *
 *   - Fails 3+ gates → record stuck (so re-runs are idempotent + the
 *     audit page can show the long tail) but skip the attention queue
 *     (too far from done to nag David about).
 *
 *   - Profile not at `ready` → skip entirely. raw/draft promotions are
 *     Phase 2C's job; data-complete/verified promotions are David-only.
 *
 * **Tier 2 only.** No runTier1() at the end of this run. Apply path is
 * David clicking approve on /audit-claude-decisions, which calls
 * pipeline.applyApproved('data-complete-promotion').
 *
 * Wired into the dispatcher every 30 min.
 *
 * Usage:
 *   node scripts/data-complete-producer.cjs            # apply
 *   node scripts/data-complete-producer.cjs --dry-run  # preview
 *   node scripts/data-complete-producer.cjs --json     # machine
 *   node scripts/data-complete-producer.cjs --limit 50 # cap scan
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

const args = process.argv.slice(2);
const DRY = args.includes('--dry-run');
const AS_JSON = args.includes('--json');
const limitIdx = args.indexOf('--limit');
const LIMIT = limitIdx >= 0 ? parseInt(args[limitIdx + 1] || '0', 10) : 0;

// ─── frontmatter helper ────────────────────────────────────────────

function parseFrontmatter(text) {
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/);
  if (!m) return null;
  const fm = m[1];
  // Minimal-pass extraction. We DO want a structural parse for nested
  // fields (politicians-funded, donors, etc.) so use js-yaml.
  let data;
  try {
    data = require('js-yaml').load(fm) || {};
  } catch {
    return null;
  }
  data.__rawFm = fm;
  return data;
}

// ─── ADR-0017 gate predicates (mirrored from reclassify-readiness.cjs) ──
//
// The single source of truth for this logic is reclassify-readiness.cjs.
// Drift between that classifier and this producer would mean profiles
// pass one but not the other. Risk is partly mitigated by the producer
// only writing to a candidate queue (no apply path); David's approve
// click is what makes it real.
//
// If reclassify-readiness's data-complete gates change, this file MUST
// change in lockstep. Add a calibration fixture for any edge case.

const PUBLISHABLE_TYPES = new Set([
  'politician', 'state-politician', 'local-politician',
  'donor', 'corporation', 'pac', 'think-tank', 'lobbying-firm',
]);

const LEGISLATOR_REQUIREMENTS = [
  { id: 'voting-records', check: (d, c) => c.includes('<!-- auto:govtrack') || c.includes('<!-- auto:voting-record') },
  { id: 'committees', check: (d) => !!d.committees || !!d['committee-assignments'] },
  { id: 'bills', check: (d) => parseInt(d['bills-sponsored'] || 0) > 0 || parseInt(d['bills-cosponsored'] || 0) > 0 },
  { id: 'fec-data', check: (d, c) => !!d['total-raised'] || c.includes('<!-- auto:fec') },
];

const EXECUTIVE_REQUIREMENTS = [
  { id: 'connections', check: (d) => !!(d.related || d.donors || d.opposes) },
];

const PRESIDENTIAL_REQUIREMENTS = [
  { id: 'fec-data', check: (d, c) => !!d['total-raised'] || c.includes('<!-- auto:fec') },
  { id: 'connections', check: (d) => !!(d.related || d.donors || d.opposes) },
];

function getPoliticianRequirements(fm) {
  const chamber = String(fm?.chamber || '').trim();
  if (chamber === 'House' || chamber === 'Senate') return LEGISLATOR_REQUIREMENTS;
  if (chamber === 'Presidential' || chamber === 'Vice Presidential') return PRESIDENTIAL_REQUIREMENTS;
  if (chamber === 'Cabinet' || chamber === 'Governor' || chamber === 'SCOTUS') return EXECUTIVE_REQUIREMENTS;
  if (/Secretary|Director|Ambassador|Administrator|Justice|Attorney|SCOTUS|Governor|Chair/i.test(chamber)) {
    return EXECUTIVE_REQUIREMENTS;
  }
  return LEGISLATOR_REQUIREMENTS;
}

const TYPE_REQUIREMENTS = {
  politician: LEGISLATOR_REQUIREMENTS,
  'state-politician': [
    { id: 'connections', check: (d) => !!(d.related || d.donors || d.opposes) },
  ],
  'local-politician': [
    { id: 'connections', check: (d) => !!(d.related || d.donors || d.opposes) },
  ],
  donor: [
    { id: 'politicians-funded', check: (d) => !!d['politicians-funded'] },
    { id: 'contribution-amounts', check: (d) => !!d['total-political-spend'] || !!d['total-raised'] },
    { id: 'sector', check: (d) => !!d.sector },
  ],
  corporation: [
    { id: 'pac-contributions', check: (d, c) => !!d['politicians-funded'] || c.includes('<!-- auto:fec') },
    { id: 'lobbying', check: (d, c) => !!d['lobbying-spend'] || c.includes('<!-- auto:lda') },
    { id: 'contracts', check: (d, c) => c.includes('<!-- auto:usaspending') || c.includes('<!-- auto:sam') },
  ],
  'think-tank': [
    { id: 'funders', check: (d) => !!d.donors || !!d.related },
    { id: '990-data', check: (d, c) => !!d.ein || !!d['total-revenue'] || c.includes('<!-- auto:nonprofit-990') },
  ],
  'lobbying-firm': [
    { id: 'lobbying-spend', check: (d) => !!d['lobbying-spend'] },
    { id: 'client-list', check: (d, c) => c.includes('<!-- auto:lda') },
  ],
  pac: [
    { id: 'fec-data', check: (d, c) => c.includes('<!-- auto:fec') },
    { id: 'donors-mapped', check: (d) => !!d.donors },
  ],
};

const BLOCKING_FLAGS = [
  /\(URL NEEDED\)/,
  /\(UNVERIFIED\)/,
  /\(NEEDS REVIEW\)/,
  /defamation-sanitized/i,
];

function hasBlockingFlag(content) {
  const visible = content.split(/^##+\s*Archived/im)[0] || content;
  for (const re of BLOCKING_FLAGS) {
    if (re.test(visible)) return re.toString();
  }
  return null;
}

function countTier1Sources(content) {
  const sourceSection = content.split('## Sources')[1] || '';
  return (sourceSection.match(/\(Tier 1\)/g) || []).length;
}

/**
 * Evaluate ADR-0017 data-complete gates for a profile already at
 * `content-readiness: ready`. Returns:
 *   { passes: bool, gap_reasons: [], gates_passing: [] }
 */
function evaluateDataCompleteGates(data, content) {
  const reasons = [];
  const passing = [];

  // 1. typeReqs
  const typeReqs = data.type === 'politician'
    ? getPoliticianRequirements(data)
    : (TYPE_REQUIREMENTS[data.type] || []);
  const naItems = data['checklist-na'] || [];
  const isNa = (id) => naItems.some((n) => typeof n === 'string' && n.startsWith(`${id}:`));
  let typeReqsMet = true;
  for (const req of typeReqs) {
    if (isNa(req.id)) continue;
    if (!req.check(data, content)) {
      reasons.push(`typeReqs:${req.id}`);
      typeReqsMet = false;
    }
  }
  if (typeReqsMet) passing.push('typeReqs');

  // 2. ≥1 Tier 1 source
  const tier1Count = countTier1Sources(content);
  if (tier1Count < 1) reasons.push('noTier1');
  else passing.push('tier1Source');

  // 3. Connections (frontmatter cache check — fast path; canonical
  //    truth is reclassify-readiness's job. The cache is rebuilt every
  //    6h via the bidirectional-normalizer + rebuild-relationship-caches,
  //    so a missing cache here means either real disconnection or a
  //    transient rebuild lag we tolerate.)
  if (!(data.related || data.donors || data.opposes)) {
    reasons.push('noConnections');
  } else {
    passing.push('connections');
  }

  // 4. Freshness (≤90d)
  const lastEnriched = data['last-enriched'];
  if (!lastEnriched) {
    reasons.push('stale:never-enriched');
  } else {
    const days = Math.floor((Date.now() - new Date(lastEnriched).getTime()) / (24 * 60 * 60 * 1000));
    if (days > 90) reasons.push(`stale:${days}d`);
    else passing.push('fresh');
  }

  // 5. No blocking flags
  const flag = hasBlockingFlag(content);
  if (flag) {
    // Convert regex toString to a stable token
    if (/URL NEEDED/.test(flag)) reasons.push('blocked:URL-NEEDED');
    else if (/UNVERIFIED/.test(flag)) reasons.push('blocked:UNVERIFIED');
    else if (/NEEDS REVIEW/.test(flag)) reasons.push('blocked:NEEDS-REVIEW');
    else if (/defamation/.test(flag)) reasons.push('blocked:defamation-sanitized');
    else reasons.push('blocked:unknown');
  } else {
    passing.push('noBlockingFlags');
  }

  return {
    passes: reasons.length === 0,
    gap_reasons: reasons,
    gates_passing: passing,
  };
}

// ─── walk + main ───────────────────────────────────────────────────

function walkContent(callback) {
  const stack = [path.join(ROOT, 'content')];
  while (stack.length) {
    const dir = stack.pop();
    let entries;
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); }
    catch { continue; }
    for (const e of entries) {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) {
        if (e.name === 'Archive' || e.name === 'Drafts') continue;
        stack.push(full);
      } else if (e.name.endsWith('.md')) {
        callback(full);
      }
    }
  }
}

const pipeline = require('./lib/editorial-decision-pipeline.cjs');
require('./classes/index.cjs');

const cls = pipeline.getClass('data-complete-promotion');
const records = cls.store.loadAll();

const summary = {
  scanned_total: 0,
  scanned_ready: 0,
  passing: 0,
  stuck_close: 0,    // 1-2 gaps
  stuck_far: 0,      // 3+ gaps
  errors: 0,
  per_gap_reason: {},
  examples_passing: [],
  examples_stuck_close: [],
};

const stuckEntries = [];

walkContent((full) => {
  if (LIMIT && summary.scanned_total >= LIMIT) return;
  let text;
  try { text = fs.readFileSync(full, 'utf-8'); }
  catch { summary.errors++; return; }

  const fm = parseFrontmatter(text);
  if (!fm || !fm.type) return;
  if (!PUBLISHABLE_TYPES.has(fm.type)) return;

  summary.scanned_total++;

  // Phase 2D scope: ONLY profiles currently at 'ready'.
  if (fm['content-readiness'] !== 'ready') return;
  summary.scanned_ready++;

  const result = evaluateDataCompleteGates(fm, text);

  const relPath = path.relative(ROOT, full).replace(/\\/g, '/');
  const candidate = {
    profile_path: relPath,
    profile_title: fm.title,
    profile_type: fm.type,
    from_state: 'ready',
    gap_reasons: result.gap_reasons,
    gates_passing: result.gates_passing,
  };

  for (const r of result.gap_reasons) {
    summary.per_gap_reason[r] = (summary.per_gap_reason[r] || 0) + 1;
  }

  if (result.passes) {
    summary.passing++;
    if (summary.examples_passing.length < 5) {
      summary.examples_passing.push({ title: fm.title, type: fm.type });
    }
  } else if (result.gap_reasons.length <= 2) {
    summary.stuck_close++;
    if (summary.examples_stuck_close.length < 5) {
      summary.examples_stuck_close.push({
        title: fm.title,
        gap_reasons: result.gap_reasons,
      });
    }
    stuckEntries.push({
      bucket: 'compounding',
      what: `${fm.title}: ${result.gap_reasons.length === 1 ? 'one gap' : `${result.gap_reasons.length} gaps`} from publishing (${result.gap_reasons.join(', ')})`,
      why: `Mechanical data-complete promotion blocked by: ${result.gap_reasons.join(', ')}. Closing the gap surfaces this profile in /audit-claude-decisions for David's approve click.`,
      where: relPath,
      cost_min: 5,
      leverage: result.gap_reasons.length === 1 ? 4 : 2,
      source: 'data-complete-promotion',
      created: new Date().toISOString().slice(0, 10),
      metadata: { from_state: 'ready', to_state: 'data-complete', gap_reasons: result.gap_reasons },
    });
  } else {
    summary.stuck_far++;
  }

  if (!DRY) {
    cls.store.upsertCandidate(records, candidate);
  }
});

if (!DRY) {
  cls.store.persistAll(records);
  if (stuckEntries.length > 0) {
    const queue = require('./lib/attention-queue.cjs');
    queue.addEntries('data-complete-stuck', stuckEntries);
  }
}

summary.attention_queue_entries = DRY ? 0 : stuckEntries.length;

if (AS_JSON) console.log(JSON.stringify(summary));
else printHuman(summary);

function printHuman(s) {
  console.log(`data-complete-producer (${DRY ? 'DRY-RUN' : 'APPLY'})`);
  console.log(`  scanned: ${s.scanned_total} profile(s) total, ${s.scanned_ready} at 'ready'`);
  console.log(`  passing all gates (Tier 2 candidates for David): ${s.passing}`);
  if (s.examples_passing.length) {
    for (const e of s.examples_passing) console.log(`    ✓ ${e.title} (${e.type})`);
  }
  console.log(`  stuck (1-2 gaps from publishing): ${s.stuck_close}`);
  if (s.examples_stuck_close.length) {
    for (const e of s.examples_stuck_close) console.log(`    ⏸ ${e.title} — [${e.gap_reasons.join(', ')}]`);
  }
  console.log(`  stuck-far (3+ gaps): ${s.stuck_far}`);
  if (Object.keys(s.per_gap_reason).length) {
    console.log(`  gap-reason histogram:`);
    const sorted = Object.entries(s.per_gap_reason).sort((a, b) => b[1] - a[1]);
    for (const [reason, count] of sorted.slice(0, 10)) {
      console.log(`    ${count}× ${reason}`);
    }
    if (sorted.length > 10) console.log(`    (... ${sorted.length - 10} more reasons)`);
  }
  console.log(`  attention queue entries: ${s.attention_queue_entries}`);
  if (s.errors) console.log(`  errors: ${s.errors}`);
}
