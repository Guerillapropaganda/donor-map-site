#!/usr/bin/env node
/**
 * type-specific-a-plus-bar.cjs
 *
 * Implementation of ADR-0022. Applies the A+ publication bar to every
 * publication-tier profile (content-readiness: data-complete or verified),
 * using a bar appropriate to the profile's type.
 *
 * Universal floor (all types): source floor ≥3 Tier 1, legal-review pass,
 * central-thesis populated, story-grade populated.
 *
 * Type-specific layers grounded in the ADR-0022 field coverage survey.
 *
 * Usage:
 *   node scripts/type-specific-a-plus-bar.cjs               # summary
 *   node scripts/type-specific-a-plus-bar.cjs --json        # machine-readable
 *   node scripts/type-specific-a-plus-bar.cjs --verbose     # per-profile detail
 *   node scripts/type-specific-a-plus-bar.cjs --type=donor  # filter by type
 */

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const { runLegalReviewCheck } = require('./lib/checklist-helpers.cjs');

const ROOT = path.resolve(__dirname, '..');
const CONTENT = path.join(ROOT, 'content');

const argValue = (flag) => {
  const a = process.argv.find(x => x.startsWith(flag + '='));
  return a ? a.slice(flag.length + 1) : null;
};
const JSON_OUT = process.argv.includes('--json');
const VERBOSE = process.argv.includes('--verbose');
const TYPE_FILTER = argValue('--type');

// ─── Helpers ──────────────────────────────────────────────────────────

function nonEmpty(v) {
  if (v === null || v === undefined) return false;
  if (typeof v === 'string') return v.trim().length > 0;
  if (Array.isArray(v)) return v.length > 0;
  if (typeof v === 'object') return Object.keys(v).length > 0;
  return true;
}

function arrLen(v) {
  if (Array.isArray(v)) return v.length;
  if (typeof v === 'string') {
    const s = v.trim();
    if (!s) return 0;
    // Many vault fields serialise as comma-joined [[wikilinks]] rather
    // than YAML arrays. Count wikilinks first; fall back to comma split;
    // final fallback is "one non-empty value".
    const wl = s.match(/\[\[[^\]]+\]\]/g);
    if (wl) return wl.length;
    const parts = s.split(',').map(p => p.trim()).filter(Boolean);
    return parts.length || 1;
  }
  return 0;
}

function countTier1InBody(body) {
  // simple heuristic: count distinct Tier 1 domains linked in the body.
  // matches pipeline-janitor's approach for consistency.
  const TIER1_DOMAINS = [
    'fec.gov', 'congress.gov', 'govtrack.us', 'sec.gov', 'usaspending.gov',
    'irs.gov', 'disclosures-clerk.house.gov', 'efdsearch.senate.gov',
    'lda.gov', 'lda.senate.gov', 'efile.fara.gov', 'propublica.org/nonprofits',
    'courtlistener.com', 'federalregister.gov',
  ];
  const hits = new Set();
  for (const d of TIER1_DOMAINS) {
    if (body.includes(d)) hits.add(d);
  }
  return hits.size;
}

// ─── Universal floor ──────────────────────────────────────────────────

function checkUniversal(fm, body) {
  const failures = [];

  const srcCount = Math.max(arrLen(fm['source-types']), countTier1InBody(body));
  if (srcCount < 3) {
    failures.push({ kind: 'universal-source-floor', detail: `only ${srcCount} Tier 1 source types (need 3)` });
  }

  const legal = runLegalReviewCheck(
    { legalReviewDate: fm['legal-review-date'], legalReviewResult: fm['legal-review-result'] },
    body
  );
  if (!legal.passed) {
    failures.push({ kind: 'universal-legal-review', detail: `${(legal.hits || []).length} defamation-prone phrase(s) outside blockquotes, no legal-review-result: pass` });
  }

  if (!nonEmpty(fm['central-thesis'])) {
    failures.push({ kind: 'universal-missing-thesis', detail: 'central-thesis field not populated' });
  }

  if (!nonEmpty(fm['story-grade'])) {
    failures.push({ kind: 'universal-missing-story-grade', detail: 'story-grade field not populated' });
  }

  return failures;
}

// ─── Politician bar ───────────────────────────────────────────────────

function checkPolitician(fm, _body) {
  const failures = [];

  if (!nonEmpty(fm['fec-candidate-id']) && !nonEmpty(fm['bioguide-id'])) {
    failures.push({ kind: 'politician-missing-id', detail: 'no fec-candidate-id or bioguide-id' });
  }

  // both-sides — same entity in donors + opposes
  const donors = Array.isArray(fm.donors) ? fm.donors.map(d => (typeof d === 'string' ? d : d.name || '').toLowerCase()) : [];
  const opposes = Array.isArray(fm.opposes) ? fm.opposes.map(d => (typeof d === 'string' ? d : d.name || '').toLowerCase()) : [];
  const bothSides = donors.filter(d => d && opposes.includes(d));
  if (bothSides.length > 0) {
    failures.push({ kind: 'politician-both-sides', detail: `same entity in donors + opposes: ${bothSides.slice(0, 3).join(', ')}` });
  }

  // committee cross-ref is handled by pipeline-janitor proper; don't duplicate here.

  return failures;
}

// ─── State/local politician bar ───────────────────────────────────────

function checkStateOrLocalPolitician(fm, body) {
  // Politician bar, but allow state-candidate-id as ID substitute.
  const failures = [];
  if (
    !nonEmpty(fm['fec-candidate-id']) &&
    !nonEmpty(fm['bioguide-id']) &&
    !nonEmpty(fm['state-candidate-id'])
  ) {
    failures.push({ kind: 'politician-missing-id', detail: 'no fec-candidate-id, bioguide-id, or state-candidate-id' });
  }
  // skip both-sides for state/local (data model less consistent)
  return failures;
}

// ─── Donor bar ────────────────────────────────────────────────────────

function checkDonor(fm, _body) {
  const failures = [];

  const pf = arrLen(fm['politicians-funded']);
  if (pf < 3) {
    failures.push({ kind: 'donor-politicians-funded', detail: `politicians-funded has ${pf} entries (need 3)` });
  }

  // Wealth or spend provenance — at least one of three paths
  const hasSpendWithSource = nonEmpty(fm['total-spent']) && nonEmpty(fm['spend-source']);
  const hasPacId = nonEmpty(fm['fec-committee-id']);
  const hasIndivContrib = nonEmpty(fm['individual-contributions']);
  if (!hasSpendWithSource && !hasPacId && !hasIndivContrib) {
    failures.push({
      kind: 'donor-no-provenance',
      detail: 'no traceable dollar figure: need (total-spent + spend-source) OR fec-committee-id OR individual-contributions',
    });
  }

  if (!nonEmpty(fm.sector)) {
    failures.push({ kind: 'donor-missing-sector', detail: 'sector field not populated' });
  }
  if (!nonEmpty(fm['entity-type'])) {
    failures.push({ kind: 'donor-missing-entity-type', detail: 'entity-type field not populated' });
  }

  return failures;
}

// ─── Corporation bar ──────────────────────────────────────────────────

function checkCorporation(fm, _body) {
  const failures = [];

  const pf = arrLen(fm['politicians-funded']);
  if (pf > 0) {
    const hasPacId = nonEmpty(fm['fec-committee-id']);
    const hasEmpContrib = nonEmpty(fm['employee-contributions']) || nonEmpty(fm['employee-contributions-total']);
    if (!hasPacId && !hasEmpContrib) {
      failures.push({
        kind: 'corporation-pac-traceability',
        detail: `politicians-funded has ${pf} entries but no fec-committee-id or employee-contributions`,
      });
    }
  }

  if (!nonEmpty(fm['lobbying-spend']) && !nonEmpty(fm['lobbying-filings'])) {
    failures.push({ kind: 'corporation-lobbying', detail: 'no lobbying-spend or lobbying-filings' });
  }

  const regulatoryFields = [
    'federal-contracts', 'federal-awards-total', 'nhtsa-recalls', 'nhtsa-complaints',
    'osha-findings', 'epa-violations', 'sec-filings', 'fara-filings',
  ];
  const hasRegulatory = regulatoryFields.some(f => nonEmpty(fm[f]));
  if (!hasRegulatory) {
    failures.push({
      kind: 'corporation-no-regulatory-footprint',
      detail: `no populated regulatory pipeline (${regulatoryFields.join(', ')})`,
    });
  }

  return failures;
}

// ─── Think-tank bar ───────────────────────────────────────────────────

function checkThinkTank(fm, _body) {
  const failures = [];

  if (!nonEmpty(fm.ein)) {
    failures.push({ kind: 'think-tank-missing-ein', detail: 'EIN not populated' });
  }

  if (!nonEmpty(fm['total-revenue']) || !nonEmpty(fm['total-assets'])) {
    failures.push({
      kind: 'think-tank-missing-990',
      detail: '990 data incomplete (need total-revenue + total-assets)',
    });
  }

  const hasDonors = nonEmpty(fm['top-donors']);
  const darkMoneyNoted = typeof fm['known-gaps'] === 'string'
    ? /dark.?money|donor.?anonymous|unknown.?donors/i.test(fm['known-gaps'])
    : false;
  if (!hasDonors && !darkMoneyNoted) {
    failures.push({
      kind: 'think-tank-no-donor-provenance',
      detail: 'no top-donors and no dark-money note in known-gaps',
    });
  }

  return failures;
}

// ─── Dispatch by type ─────────────────────────────────────────────────

const TYPE_BAR = {
  politician: checkPolitician,
  'state-politician': checkStateOrLocalPolitician,
  'local-politician': checkStateOrLocalPolitician,
  donor: checkDonor,
  corporation: checkCorporation,
  'think-tank': checkThinkTank,
};

// ─── Walk ─────────────────────────────────────────────────────────────

function walk(dir, out) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (entry.name.endsWith('.md')) out.push(full);
  }
}

// ─── Main ─────────────────────────────────────────────────────────────

(function main() {
  const files = [];
  walk(CONTENT, files);

  let scanned = 0;
  const perProfile = [];
  const passingProfiles = []; // Per ops-harness-audit-2026-04-24 follow-up #1.
                              // /signoff-queue reads this list as the live source
                              // of A+ pass-state instead of the per-profile
                              // audit-a-plus-passed frontmatter stamp (which
                              // depends on a background script that may be paused).
  const byType = {};
  const byKind = {};
  const unknownTypes = new Set();

  for (const f of files) {
    const text = fs.readFileSync(f, 'utf-8');
    const m = text.match(/^---\n([\s\S]*?)\n---/);
    if (!m) continue;
    let fm;
    try { fm = yaml.load(m[1]); } catch { continue; }
    if (!fm || typeof fm !== 'object') continue;

    const tier = fm['content-readiness'];
    if (tier !== 'verified' && tier !== 'data-complete') continue;

    const type = (fm.type || 'unknown').toString();
    if (TYPE_FILTER && type !== TYPE_FILTER) continue;
    scanned++;

    const body = text.slice(m[0].length);
    const failures = checkUniversal(fm, body);

    const typeCheck = TYPE_BAR[type];
    if (typeCheck) {
      failures.push(...typeCheck(fm, body));
    } else {
      unknownTypes.add(type);
      failures.push({ kind: 'unknown-type', detail: `type="${type}" has no defined A+ bar (ADR-0022)` });
    }

    if (!byType[type]) byType[type] = { scanned: 0, failed: 0, passed: 0 };
    byType[type].scanned++;

    const relPath = path.relative(ROOT, f).replace(/\\/g, '/');
    if (failures.length === 0) {
      byType[type].passed++;
      passingProfiles.push({
        file: relPath,
        title: fm.title || path.basename(f, '.md'),
        type,
        tier,
      });
    } else {
      byType[type].failed++;
      for (const fail of failures) {
        byKind[fail.kind] = (byKind[fail.kind] || 0) + 1;
      }
      perProfile.push({
        file: relPath,
        title: fm.title || path.basename(f, '.md'),
        type,
        tier,
        failures,
      });
    }
  }

  const totalFailed = perProfile.length;
  const totalFindings = perProfile.reduce((s, p) => s + p.failures.length, 0);

  const artifact = {
    scanned,
    profiles_failed: totalFailed,
    profiles_passed: scanned - totalFailed,
    total_findings: totalFindings,
    by_type: byType,
    by_failure_kind: byKind,
    unknown_types: [...unknownTypes],
    findings: perProfile,
    passing: passingProfiles,
  };

  if (JSON_OUT) {
    process.stdout.write(JSON.stringify(artifact, null, 2));
    process.stdout.write('\n');
    process.exit(0);
  }

  console.log(`type-specific-a-plus-bar: scanned ${scanned} publication-tier profile(s)`);
  console.log(`  ${artifact.profiles_passed} pass / ${totalFailed} fail / ${totalFindings} findings total`);
  console.log('');
  console.log('  By type:');
  for (const [t, s] of Object.entries(byType).sort((a, b) => b[1].scanned - a[1].scanned)) {
    console.log(`    ${t}: ${s.passed}/${s.scanned} pass (${s.failed} fail)`);
  }
  console.log('');
  console.log('  By failure kind:');
  for (const [k, n] of Object.entries(byKind).sort((a, b) => b[1] - a[1])) {
    console.log(`    ${n}\t${k}`);
  }
  if (unknownTypes.size > 0) {
    console.log('');
    console.log(`  Unknown types (no bar defined): ${[...unknownTypes].join(', ')}`);
  }

  if (VERBOSE && perProfile.length > 0) {
    console.log('');
    for (const p of perProfile.slice(0, 30)) {
      console.log(`  [${p.type}] ${p.file}`);
      for (const f of p.failures) console.log(`    • ${f.kind}: ${f.detail}`);
    }
    if (perProfile.length > 30) console.log(`  ... and ${perProfile.length - 30} more profile(s)`);
  }

  process.exit(0);
})();
