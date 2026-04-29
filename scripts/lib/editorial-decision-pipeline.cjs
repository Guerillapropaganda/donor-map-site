/**
 * editorial-decision-pipeline.cjs
 *
 * Reusable abstraction for editorial-decision queues per ADR-0029.
 *
 * Generalizes the librarian-gap-decisions / frontmatter-orphan-candidates
 * pattern: every queue of "Claude or David must decide on candidates" plugs
 * in here. The library handles:
 *
 *   - Class registration with validation (Rule 16 enforcement)
 *   - Canonical record shape with required fields
 *   - State machine validity
 *   - decided_by / decided_at / auto_revert_eligible provenance
 *   - Calibration-fixture coverage check (Tier 1 cannot register without it)
 *   - Tier 1 predicate evaluation + auto-apply with provenance
 *   - Tier 2 review-list surface for batch approval
 *   - Auto-revert hook (called by calibration drift handler in Phase 2)
 *   - Cross-class stats for the audit-decisions ops page
 *
 * Class-specific behavior (writers, surface-from-source, blast-radius
 * mapping) is supplied by each class's registration object. The library
 * does not know how to write to entities.jsonl or frontmatter — that's
 * the class's job. The library DOES know that every decision must carry
 * provenance, every Tier 1 class must have fixture coverage, and every
 * applied decision is one auto-revert away from being undone.
 *
 * USAGE — class side (e.g. librarian-gap-aliases):
 *
 *   const pipeline = require('./editorial-decision-pipeline.cjs');
 *   const store = require('./librarian-gap-decisions-store.cjs');
 *
 *   pipeline.register({
 *     name: 'librarian-gap-aliases',
 *     description: 'Wikilinks the librarian cannot resolve.',
 *     store: store,                  // exports loadAll/persistAll/setState
 *     valid_states: store.VALID_STATES,
 *     terminal_states: ['resolved', 'rejected'],
 *     tier1_predicate: (rec) =>
 *       rec.similar?.length === 1 &&
 *       rec.similar[0].distance <= 2 &&
 *       rec.appearances >= 10,
 *     calibration_coverage: [
 *       'Pfizer Inc.', 'ADM - Archer Daniels Midland', 'Alexandria Ocasio-Cortez',
 *     ],
 *     approve_state: 'approved-alias',     // state set when David approves
 *     apply_decision: async (rec, store, records) => { ... },
 *     auto_apply_target: (rec) => rec.similar[0].name,   // for tier-1 path
 *     blast_radius: (fixture, recentClaudeAutoDecisions) => [...],
 *   });
 *
 * USAGE — caller side (a script wanting to do work):
 *
 *   const pipeline = require('./lib/editorial-decision-pipeline.cjs');
 *   require('./classes/librarian-gap-aliases.cjs');   // self-registers
 *   const stats = pipeline.stats('librarian-gap-aliases');
 *   await pipeline.runTier1(className);               // auto-apply
 *   await pipeline.applyApproved(className);          // apply Tier 2 approvals
 *   await pipeline.autoRevert(className, fixtures);   // calibration-drift
 *
 * All write paths record provenance (decided_by, decided_at). All write
 * paths leave a `change_log[]` entry on the record so an Ops audit page
 * can reconstruct what happened.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const CALIBRATION_FIXTURE = path.join(ROOT, 'data', 'calibration-fixture.jsonl');

// ─── module-level registry ─────────────────────────────────────────

const REGISTRY = new Map();

const REQUIRED_REGISTRATION_FIELDS = [
  'name',
  'description',
  'store',
  'valid_states',
  'approve_state',
  'apply_decision',
];

const RESERVED_PROVENANCE_FIELDS = [
  'decided_by',
  'decided_at',
  'auto_revert_eligible',
  'reverted_reason',
  'change_log',
];

const VALID_DECIDED_BY = new Set(['david', 'claude-auto', 'claude-batch-approved']);

// ─── helpers ───────────────────────────────────────────────────────

function loadCalibrationFixtureProfiles() {
  if (!fs.existsSync(CALIBRATION_FIXTURE)) return new Set();
  const profiles = new Set();
  for (const line of fs.readFileSync(CALIBRATION_FIXTURE, 'utf-8').split(/\r?\n/)) {
    if (!line.trim() || line.startsWith('#')) continue;
    try {
      const f = JSON.parse(line);
      if (f.profile) profiles.add(f.profile);
    } catch { /* skip malformed */ }
  }
  return profiles;
}

function nowIso() { return new Date().toISOString(); }

function ensureChangeLog(rec) {
  if (!Array.isArray(rec.change_log)) rec.change_log = [];
  return rec.change_log;
}

function logTransition(rec, transition) {
  ensureChangeLog(rec).push({
    at: nowIso(),
    ...transition,
  });
}

// ─── registration ──────────────────────────────────────────────────

/**
 * Register a decision class with the pipeline. Validates that the class
 * has everything it needs, including (per Rule 16 / ADR-0029) calibration
 * fixture coverage if it claims a Tier 1 predicate.
 *
 * Throws on validation failure — registration is fail-fast so a misconfigured
 * class can never accidentally write decisions.
 */
function register(spec) {
  // Required fields
  for (const f of REQUIRED_REGISTRATION_FIELDS) {
    if (spec[f] === undefined || spec[f] === null) {
      throw new Error(
        `[editorial-decision-pipeline] register: missing required field "${f}" for class "${spec.name || '(unnamed)'}"`
      );
    }
  }

  // Name uniqueness
  if (REGISTRY.has(spec.name)) {
    throw new Error(`[editorial-decision-pipeline] class "${spec.name}" already registered`);
  }

  // Store has the right shape
  const requiredStoreMethods = ['loadAll', 'persistAll'];
  for (const m of requiredStoreMethods) {
    if (typeof spec.store[m] !== 'function') {
      throw new Error(
        `[editorial-decision-pipeline] store for "${spec.name}" missing method ${m}()`
      );
    }
  }

  // Valid states is iterable
  const validStates = spec.valid_states instanceof Set
    ? spec.valid_states
    : new Set(spec.valid_states);
  if (validStates.size === 0) {
    throw new Error(`[editorial-decision-pipeline] "${spec.name}" valid_states is empty`);
  }
  if (!validStates.has('candidate')) {
    throw new Error(`[editorial-decision-pipeline] "${spec.name}" valid_states must include "candidate"`);
  }
  if (!validStates.has(spec.approve_state)) {
    throw new Error(
      `[editorial-decision-pipeline] "${spec.name}" approve_state "${spec.approve_state}" not in valid_states`
    );
  }
  if (!validStates.has('resolved')) {
    throw new Error(`[editorial-decision-pipeline] "${spec.name}" valid_states must include "resolved"`);
  }

  // Tier 1 predicate validation (Rule 16 enforcement)
  if (spec.tier1_predicate) {
    if (typeof spec.tier1_predicate !== 'function') {
      throw new Error(`[editorial-decision-pipeline] "${spec.name}" tier1_predicate must be a function`);
    }
    if (typeof spec.auto_apply_target !== 'function') {
      throw new Error(
        `[editorial-decision-pipeline] "${spec.name}" has tier1_predicate but no auto_apply_target — ` +
        `Tier 1 needs to know what target to write the decision against`
      );
    }
    if (!Array.isArray(spec.calibration_coverage) || spec.calibration_coverage.length === 0) {
      throw new Error(
        `[editorial-decision-pipeline] "${spec.name}" registered Tier 1 predicate but has no ` +
        `calibration_coverage[]. Per ADR-0029 Rule 16, Tier 1 auto-apply requires fixture coverage. ` +
        `Add at least one fixture profile name to calibration_coverage that protects this class's blast radius.`
      );
    }
    const knownProfiles = loadCalibrationFixtureProfiles();
    const missing = spec.calibration_coverage.filter((p) => !knownProfiles.has(p));
    if (missing.length > 0) {
      throw new Error(
        `[editorial-decision-pipeline] "${spec.name}" calibration_coverage references profile(s) ` +
        `not in data/calibration-fixture.jsonl: ${missing.join(', ')}. ` +
        `Add fixtures or remove from calibration_coverage.`
      );
    }
  }

  REGISTRY.set(spec.name, {
    ...spec,
    valid_states: validStates,
    has_tier1: !!spec.tier1_predicate,
    registered_at: nowIso(),
  });
}

function getClass(name) {
  const cls = REGISTRY.get(name);
  if (!cls) {
    throw new Error(
      `[editorial-decision-pipeline] class "${name}" not registered. ` +
      `Registered: ${[...REGISTRY.keys()].join(', ') || '(none)'}`
    );
  }
  return cls;
}

function listClasses() {
  return [...REGISTRY.entries()].map(([name, cls]) => ({
    name,
    description: cls.description,
    has_tier1: cls.has_tier1,
    calibration_coverage: cls.calibration_coverage || [],
    valid_states: [...cls.valid_states],
  }));
}

// ─── provenance writers ────────────────────────────────────────────

/**
 * Set state with provenance. THIS is the only authorized way to mutate
 * state on a decision record. Direct setState calls on the underlying
 * store should be avoided in favor of pipeline.transition() so provenance
 * + change_log are guaranteed.
 */
function transition(className, records, recordId, newState, options = {}) {
  const cls = getClass(className);
  if (!cls.valid_states.has(newState)) {
    throw new Error(
      `[editorial-decision-pipeline] "${className}" invalid state "${newState}". ` +
      `Valid: ${[...cls.valid_states].join(', ')}`
    );
  }
  const rec = records.find((r) => r.id === recordId);
  if (!rec) throw new Error(`record ${recordId} not in store for "${className}"`);

  const decidedBy = options.decided_by;
  if (!decidedBy) {
    throw new Error(
      `[editorial-decision-pipeline] transition() called without decided_by. ` +
      `Required: 'david' | 'claude-auto' | 'claude-batch-approved'`
    );
  }
  if (!VALID_DECIDED_BY.has(decidedBy)) {
    throw new Error(
      `[editorial-decision-pipeline] invalid decided_by "${decidedBy}". ` +
      `Valid: ${[...VALID_DECIDED_BY].join(', ')}`
    );
  }

  const fromState = rec.state;
  rec.state = newState;
  rec.decided_by = decidedBy;
  rec.decided_at = nowIso();

  // auto_revert_eligible defaults to true for claude-auto applied at Tier 1.
  // claude-batch-approved + david are NOT auto-revert eligible — those went
  // through human review and shouldn't be silently undone.
  if (decidedBy === 'claude-auto' && newState === cls.approve_state) {
    rec.auto_revert_eligible = true;
  } else if (newState !== 'candidate') {
    rec.auto_revert_eligible = rec.auto_revert_eligible || false;
  }

  // Class-specific decision payload (e.g. approved_alias_target)
  if (options.payload) {
    Object.assign(rec, options.payload);
  }

  if (newState === 'resolved') {
    rec.resolved_at = nowIso();
  }

  logTransition(rec, {
    from: fromState,
    to: newState,
    decided_by: decidedBy,
    payload_keys: options.payload ? Object.keys(options.payload) : [],
    note: options.note || null,
  });

  return rec;
}

// ─── Tier 1 auto-apply ─────────────────────────────────────────────

/**
 * Run the class's Tier 1 predicate over candidate records, advance matching
 * records to the approve state with decided_by=claude-auto, then apply the
 * approved decisions through the class's apply_decision.
 *
 * Idempotent: re-runs do not re-apply already-resolved records.
 *
 * Returns counts for the caller's logging.
 */
async function runTier1(className, options = {}) {
  const cls = getClass(className);
  if (!cls.has_tier1) {
    return { skipped: 'no tier1_predicate' };
  }
  const dryRun = !!options.dry_run;

  const records = cls.store.loadAll();
  const candidates = records.filter((r) => r.state === 'candidate');

  let matched = 0;
  let applied = 0;
  let errors = 0;

  for (const rec of candidates) {
    let isMatch;
    try {
      isMatch = !!cls.tier1_predicate(rec);
    } catch (err) {
      console.warn(`  ⚠ tier1_predicate threw on ${rec.id}: ${err.message}`);
      errors++;
      continue;
    }
    if (!isMatch) continue;
    matched++;

    if (dryRun) continue;

    let target;
    try {
      target = cls.auto_apply_target(rec);
    } catch (err) {
      console.warn(`  ⚠ auto_apply_target threw on ${rec.id}: ${err.message}`);
      errors++;
      continue;
    }
    if (!target) {
      console.warn(`  ⚠ auto_apply_target returned falsy for ${rec.id}`);
      errors++;
      continue;
    }

    transition(className, records, rec.id, cls.approve_state, {
      decided_by: 'claude-auto',
      payload: { [`approved_${cls.approve_state.replace(/^approved-/, '')}_target`]: target },
      note: 'tier1_predicate matched',
    });
    applied++;
  }

  if (!dryRun && applied > 0) {
    cls.store.persistAll(records);
  }

  // Now actually apply the decisions through the class writer
  let writerApplied = 0;
  let writerSkipped = 0;
  if (!dryRun && applied > 0) {
    const result = await applyApproved(className);
    writerApplied = result.applied;
    writerSkipped = result.skipped;
  }

  return {
    candidates_seen: candidates.length,
    matched,
    transitioned_to_approve: applied,
    writer_applied: writerApplied,
    writer_skipped: writerSkipped,
    errors,
    dry_run: dryRun,
  };
}

// ─── apply Tier 2 (David-approved) decisions ───────────────────────

async function applyApproved(className) {
  const cls = getClass(className);
  let records = cls.store.loadAll();
  const approveState = cls.approve_state;

  // Find all records in the approve state that haven't been resolved yet.
  // The class's apply_decision moves them to resolved.
  const pending = records.filter((r) => r.state === approveState);

  let applied = 0;
  let skipped = 0;
  const errors = [];

  for (const rec of pending) {
    try {
      const result = await cls.apply_decision(rec, cls.store, records);
      if (result === false) {
        skipped++;
      } else {
        // The class writer is expected to call back into the store to update
        // the record state to 'resolved'. We confirm here.
        const after = records.find((r) => r.id === rec.id);
        if (after && after.state !== 'resolved') {
          // Class writer didn't transition; do it ourselves so we never
          // leave a record stuck in approve_state after a successful apply.
          transition(className, records, rec.id, 'resolved', {
            decided_by: rec.decided_by || 'david',
            note: 'finalized by pipeline.applyApproved',
          });
        }
        applied++;
      }
    } catch (err) {
      errors.push({ id: rec.id, error: err.message });
    }
  }

  if (applied > 0) cls.store.persistAll(records);

  return { applied, skipped, errors, pending_total: pending.length };
}

// ─── auto-revert (called by calibration drift hook in Phase 2) ─────

/**
 * Called when calibration drift fires. Identifies recent claude-auto
 * decisions in the affected blast radius and reverts them to candidate
 * with reverted_reason set. The class is responsible (via its
 * apply_decision and corresponding revert path) for undoing the actual
 * write to entities.jsonl / frontmatter — but since auto_revert_eligible
 * decisions are tracked, the class can be conservative here.
 *
 * Phase 2 will wire this to the calibration check's findings. Phase 1
 * defines the surface and a no-op default.
 */
function autoRevert(className, options = {}) {
  const cls = getClass(className);
  const records = cls.store.loadAll();
  const fixtureName = options.fixture || '(unspecified)';
  const sinceMs = options.since_ms || 24 * 60 * 60 * 1000; // 24h default
  const sinceTime = Date.now() - sinceMs;

  // Find resolved-via-claude-auto records updated within the window
  const eligible = records.filter((r) =>
    r.auto_revert_eligible &&
    r.decided_by === 'claude-auto' &&
    (r.state === 'resolved' || r.state === cls.approve_state) &&
    r.decided_at &&
    new Date(r.decided_at).getTime() >= sinceTime
  );

  // If the class supplied a blast_radius mapper, narrow further.
  const inBlastRadius = cls.blast_radius
    ? cls.blast_radius(options.fixture_record, eligible)
    : eligible;

  let reverted = 0;
  for (const rec of inBlastRadius) {
    transition(className, records, rec.id, 'candidate', {
      decided_by: 'claude-auto',  // we're noting the revert, the prior decision was claude-auto
      note: `auto-reverted by calibration drift on fixture=${fixtureName}`,
    });
    rec.reverted_reason = `calibration-drift:${fixtureName}`;
    reverted++;
  }

  if (reverted > 0) cls.store.persistAll(records);

  // NOTE: we do NOT undo the underlying entities.jsonl / frontmatter write
  // here. That's the class's responsibility via a class-specific revert
  // helper. The pipeline only manages the decision record state. This is
  // intentional in Phase 1 — surface the fact that the decision needs
  // re-review rather than silently reverting external state.

  return {
    fixture: fixtureName,
    eligible_window_size: eligible.length,
    in_blast_radius: inBlastRadius.length,
    reverted,
  };
}

// ─── stats ─────────────────────────────────────────────────────────

function stats(className) {
  const cls = getClass(className);
  const records = cls.store.loadAll();
  const byState = {};
  const byProvenance = {};
  for (const r of records) {
    byState[r.state] = (byState[r.state] || 0) + 1;
    if (r.decided_by) byProvenance[r.decided_by] = (byProvenance[r.decided_by] || 0) + 1;
  }
  return {
    class: className,
    total: records.length,
    by_state: byState,
    by_provenance: byProvenance,
    has_tier1: cls.has_tier1,
    calibration_coverage: cls.calibration_coverage || [],
  };
}

function statsAll() {
  const out = {};
  for (const name of REGISTRY.keys()) out[name] = stats(name);
  return out;
}

// ─── sample for ops audit page ─────────────────────────────────────

/**
 * Return up to N random tier-1 auto-applied decisions from the last `since_ms`
 * window. Used by ops/audit-claude-decisions.
 */
function sampleTier1Decisions(options = {}) {
  const limit = options.limit || 20;
  const sinceMs = options.since_ms || 7 * 24 * 60 * 60 * 1000; // 7d
  const sinceTime = Date.now() - sinceMs;

  const out = [];
  for (const [className, cls] of REGISTRY.entries()) {
    if (!cls.has_tier1) continue;
    const records = cls.store.loadAll();
    for (const r of records) {
      if (r.decided_by !== 'claude-auto') continue;
      if (!r.decided_at) continue;
      if (new Date(r.decided_at).getTime() < sinceTime) continue;
      out.push({ class: className, ...r });
    }
  }

  // Shuffle + cap. (Math.random sample is fine — this is a spot-check
  // surface, not a statistical sample.)
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out.slice(0, limit);
}

module.exports = {
  register,
  listClasses,
  getClass,
  transition,
  runTier1,
  applyApproved,
  autoRevert,
  stats,
  statsAll,
  sampleTier1Decisions,
  // exposed for tests + introspection
  _registry: REGISTRY,
  _loadCalibrationFixtureProfiles: loadCalibrationFixtureProfiles,
};
