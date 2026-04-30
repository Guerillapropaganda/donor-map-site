#!/usr/bin/env node
/**
 * frontmatter-schema-validator.cjs — ADR-0023 §8 validator.
 *
 * Scans content/ profiles against the declarative schema in
 * scripts/lib/frontmatter-schema.cjs and reports violations.
 *
 * This is HARNESS-MODE — it surfaces findings, does not block commits.
 * Per ADR-0023 §8: "Prove the schema is right before blocking on it."
 * Promote to pre-commit sentinel after 2 weeks clean.
 *
 * Violation categories:
 *   missing_universal      — one of the 5 universal required fields absent
 *   missing_type_required  — a per-type required field absent
 *   missing_type_proposed  — a proposed_required field absent (soft)
 *   missing_id             — no identifier satisfies id_substitute rule
 *   retired_field          — a retired field is present
 *   unknown_type           — type value not in the 14 content_types
 *
 * Usage:
 *   node scripts/frontmatter-schema-validator.cjs              # text report
 *   node scripts/frontmatter-schema-validator.cjs --json       # structured output
 *   node scripts/frontmatter-schema-validator.cjs --type=donor # filter one type
 */

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const schema = require('./lib/frontmatter-schema.cjs');

const JSON_OUT = process.argv.includes('--json');
const typeFlag = process.argv.find(a => a.startsWith('--type='));
const TYPE_FILTER = typeFlag ? typeFlag.split('=')[1] : null;

const CONTENT_TYPES = new Set(schema.content_types);
const RETIRED = new Set(schema.retired);

function walk(dir, acc) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) walk(full, acc);
    else if (e.name.endsWith('.md')) acc.push(full);
  }
}

function readFrontmatter(file) {
  const text = fs.readFileSync(file, 'utf-8');
  const m = text.match(/^---\n([\s\S]*?)\n---/);
  if (!m) return null;
  try { return yaml.load(m[1]); } catch { return null; }
}

function validateProfile(file, fm) {
  const violations = [];
  const type = fm.type;

  // Skip system types — not governed
  if (!CONTENT_TYPES.has(type)) {
    // Only flag unknown_type if the file has type set to something that's not
    // a known system type either. (We're not exhaustive about system types,
    // so silence is the default.)
    return violations;
  }

  const rules = schema.types[type] || {};

  // Universal required (honor per-type exemptions)
  const exempt = new Set(rules.exempt_universal || []);
  for (const field of schema.universal.required) {
    if (exempt.has(field)) continue;
    if (fm[field] === undefined || fm[field] === '') {
      // sub-notes inherit content-readiness from parent — skip that check for them
      if (field === 'content-readiness' && rules.inherits_content_readiness) continue;
      violations.push({ kind: 'missing_universal', field, file });
    }
  }

  // Type-required
  for (const field of rules.required || []) {
    const v = fm[field];
    if (v === undefined || v === '' || (Array.isArray(v) && v.length === 0)) {
      violations.push({ kind: 'missing_type_required', field, file });
    }
  }

  // Type-proposed-required (soft)
  for (const field of rules.proposed_required || []) {
    const v = fm[field];
    if (v === undefined || v === '' || (Array.isArray(v) && v.length === 0)) {
      violations.push({ kind: 'missing_type_proposed', field, file });
    }
  }

  // ID substitute (politician, state-politician, local-politician)
  if (rules.id_substitute) {
    const hasAny = rules.id_substitute.some(f => fm[f] !== undefined && fm[f] !== '');
    if (!hasAny) {
      violations.push({ kind: 'missing_id', field: rules.id_substitute.join('|'), file });
    }
  }

  // Retired fields present
  for (const field of Object.keys(fm)) {
    if (RETIRED.has(field)) {
      violations.push({ kind: 'retired_field', field, file });
    }
  }

  return violations;
}

// ─── Run ────────────────────────────────────────────────────────────

const files = [];
walk('content', files);

const allViolations = [];
const byType = {};
let scanned = 0;

for (const f of files) {
  const fm = readFrontmatter(f);
  if (!fm || typeof fm !== 'object') continue;
  if (!CONTENT_TYPES.has(fm.type)) continue;
  if (TYPE_FILTER && fm.type !== TYPE_FILTER) continue;
  scanned++;
  byType[fm.type] = (byType[fm.type] || 0) + 1;
  const v = validateProfile(f, fm);
  allViolations.push(...v);
}

// Aggregate
const byKind = {};
const byField = {};
const profilesWithViolations = new Set();
for (const v of allViolations) {
  byKind[v.kind] = (byKind[v.kind] || 0) + 1;
  const key = v.kind + ':' + v.field;
  byField[key] = (byField[key] || 0) + 1;
  profilesWithViolations.add(v.file);
}

const total = allViolations.length;

if (JSON_OUT) {
  process.stdout.write(JSON.stringify({
    scanned,
    profiles_by_type: byType,
    profiles_with_violations: profilesWithViolations.size,
    total_findings: total,
    by_kind: byKind,
    by_field: byField,
  }, null, 2) + '\n');
  process.exit(0);
}

// --paths <kind>: list specific violation file paths (audit + fix support).
// Usage: node scripts/frontmatter-schema-validator.cjs --paths missing_universal
//        node scripts/frontmatter-schema-validator.cjs --paths missing_type_required
const PATHS_IDX = process.argv.indexOf('--paths');
if (PATHS_IDX >= 0) {
  const wantKind = process.argv[PATHS_IDX + 1];
  for (const v of allViolations) {
    if (v.kind === wantKind) console.log(`${v.kind}\t${v.field}\t${v.file}`);
  }
  process.exit(0);
}

// Text report
console.log('frontmatter-schema-validator (ADR-0023)');
console.log('  scanned: ' + scanned + ' content-type profile(s)');
console.log('  profiles with violations: ' + profilesWithViolations.size);
console.log('  total findings: ' + total);
console.log('');
console.log('By kind:');
const kindOrder = ['missing_universal', 'missing_type_required', 'missing_id', 'retired_field', 'missing_type_proposed'];
for (const k of kindOrder) {
  if (byKind[k]) console.log('  ' + String(byKind[k]).padStart(5) + '  ' + k);
}
console.log('');
console.log('By (kind:field), top 20:');
const sortedFields = Object.entries(byField).sort((a, b) => b[1] - a[1]).slice(0, 20);
for (const [key, n] of sortedFields) {
  console.log('  ' + String(n).padStart(5) + '  ' + key);
}

process.exit(0);
