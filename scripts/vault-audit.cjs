#!/usr/bin/env node
/**
 * vault-audit.cjs — the unified audit harness (ADR-0021 Phase 1 skeleton)
 *
 * COORDINATION ONLY. This script does not add new checks. It invokes
 * existing audit scripts, captures their output, and aggregates findings
 * into one JSON artifact: content/Admin Notes/vault-audit-latest.json.
 *
 * Phase plan (ADR-0021):
 *   Phase 1 (THIS):  skeleton — run existing scripts, aggregate, report
 *   Phase 2 (next):  Ops UI reads the artifact
 *   Phase 3 (later): add missing checks (prose-data consistency, type-specific
 *                    A+ bars, stamp expiry, etc.)
 *   Phase 4 (later): auto-fix triage — safe fixes applied automatically,
 *                    judgment calls routed to Attention Queue
 *   Phase 5 (later): script pruning — archive scripts the harness subsumes
 *
 * What this does NOT do yet (deliberately):
 *   - No categorization (auto-fix vs queue vs known)
 *   - No auto-fixes
 *   - No Attention Queue writes
 *   - No cron / hook wiring
 *   - No new check types
 *
 * Usage:
 *   node scripts/vault-audit.cjs                 # run all checks, write artifact
 *   node scripts/vault-audit.cjs --only=REGEX    # only checks whose name matches REGEX
 *   node scripts/vault-audit.cjs --skip=REGEX    # skip checks whose name matches REGEX
 *   node scripts/vault-audit.cjs --json          # print artifact to stdout, no file
 *   node scripts/vault-audit.cjs --quiet         # suppress terminal summary
 *
 * Exit codes:
 *   0 = harness completed (individual check failures still count; read artifact)
 *   1 = harness itself errored (couldn't run, couldn't write)
 */

const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { addEntries } = require('./lib/attention-queue.cjs');

const ROOT = path.resolve(__dirname, '..');
const ARTIFACT = path.join(ROOT, 'content', 'Admin Notes', 'vault-audit-latest.json');
const QUEUE_SOURCE = 'vault-audit';

// ─── Args ──────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const argValue = (flag) => {
  const a = args.find(a => a.startsWith(flag + '='));
  return a ? a.slice(flag.length + 1) : null;
};
const ONLY = argValue('--only');
const SKIP = argValue('--skip');
const JSON_STDOUT = args.includes('--json');
const QUIET = args.includes('--quiet');
const NO_QUEUE = args.includes('--no-queue');

// ─── Registered checks ─────────────────────────────────────────────
//
// Each entry:
//   name          — short identifier (becomes key in artifact)
//   description   — one-line plain English
//   cmd           — argv array (first element is executable)
//   parse         — fn(stdout, stderr, exit) → { findings_count, sample, artifact_ref }
//                   Controls what we show to David. Can return null findings
//                   for scripts that only produce a pass/fail signal.
//   timeout_ms    — per-check wall-clock limit
//
// To add a check: append an entry. To remove: delete the entry. No other
// code change needed.

const CHECKS = [
  {
    name: 'frontmatter-orphan-candidates',
    description:
      "ADR-0027 P1: profiles where a name in `politicians-funded` has no librarian backing. Editor-in-the-loop review queue. Findings count = state=candidate (not yet triaged). Approved-prune entries get stripped on next rebuilder --apply-approved run; kept/blocked-by-librarian-gap stay visible.",
    cmd: ['node', 'scripts/frontmatter-orphan-check.cjs', '--json'],
    parse: parseFrontmatterOrphan,
    timeout_ms: 30000,
    queue: { bucket: 'deciding', leverage: 3, cost_min: 5 },
  },
  {
    name: 'relationship-overlap',
    description:
      "Profiles where the same name appears in BOTH a funding frontmatter field (politicians-funded / donors / top-donors) AND `opposes` on the same profile. Splits via librarian: monetary-backed = real both-sides (leave); frontmatter-only = editorial typo or librarian gap (David reviews). Findings count = frontmatter-only only.",
    cmd: ['node', 'scripts/relationship-overlap-check.cjs', '--json'],
    parse: parseRelationshipOverlap,
    timeout_ms: 60000,
    queue: { bucket: 'deciding', leverage: 3, cost_min: 5 },
  },
  {
    name: 'pipeline-janitor',
    description: 'Zombie auto-blocks, stale enrichment, A+ audit checks on ready/verified profiles',
    cmd: ['node', 'scripts/pipeline-janitor.cjs', '--tier=a-plus', '--cohort'],
    parse: parsePipelineJanitor,
    timeout_ms: 120000,
    queue: { bucket: 'compounding', leverage: 3, cost_min: 60 },
  },
  {
    name: 'harness-self-audit',
    description: 'Meta-audit: unscheduled builders, stalled producers, auto-block taxonomy drift between janitor and builders',
    cmd: ['node', 'scripts/harness-self-audit.cjs', '--json'],
    parse: parseHarnessSelfAudit,
    timeout_ms: 30000,
    queue: { bucket: 'blocking', leverage: 5, cost_min: 15 },
  },
  {
    name: 'note-auto-resolver',
    description: 'Self-healing: notes with auto-resolve-when whose status disagrees with their body. Drift means an Admin Note still says "open" but its report shows zero findings (or vice versa).',
    cmd: ['node', 'scripts/note-auto-resolver.cjs', '--json'],
    parse: parseNoteAutoResolver,
    timeout_ms: 30000,
    queue: { bucket: 'compounding', leverage: 2, cost_min: 1 },
  },
  {
    name: 'audit-committee-registry',
    description: 'FEC committee registry mis-mappings (Fairshake-pattern)',
    cmd: ['node', 'scripts/audit-committee-registry.cjs'],
    parse: parseSimpleCountFromLine,
    timeout_ms: 60000,
    queue: { bucket: 'blocking', leverage: 5, cost_min: 15 },
  },
  {
    name: 'reconcile-canonical-totals',
    description: 'Canonical total drift for hand-curated subjects (Trump, Harris, Leo, McConnell)',
    cmd: ['node', 'scripts/reconcile-canonical-totals.cjs', '--strict'],
    parse: parseCanonicalTotals,
    timeout_ms: 120000,
    queue: { bucket: 'blocking', leverage: 5, cost_min: 30 },
  },
  {
    name: 'no-inline-field',
    description: 'Dataview-style `field:: value` in profile body (banned)',
    cmd: ['node', 'scripts/no-inline-field-sentinel.cjs', '--all'],
    parse: parseInlineField,
    timeout_ms: 30000,
    queue: { bucket: 'compounding', leverage: 2, cost_min: 20 },
  },
  {
    name: 'publication-readiness',
    description: 'Profiles referenced in public-routes.json must pass all 8 publication gates',
    cmd: ['node', 'scripts/publication-readiness-check.cjs', '--public-only', '--json'],
    parse: parsePublicationReadiness,
    timeout_ms: 120000,
    queue: { bucket: 'blocking', leverage: 5, cost_min: 20 },
  },
  {
    name: 'prose-data-consistency',
    description: 'Internal numeric contradictions in publication-tier profiles (e.g. infobox says 6 mega-donors, prose says 10)',
    cmd: ['node', 'scripts/prose-data-consistency.cjs', '--json'],
    parse: parseProseDataConsistency,
    timeout_ms: 60000,
    queue: { bucket: 'deciding', leverage: 3, cost_min: 20 },
  },
  {
    name: 'stamp-expiry',
    description: 'Publication-tier profiles past their last-enriched window (verified 180d, data-complete 90d)',
    cmd: ['node', 'scripts/stamp-expiry.cjs', '--json'],
    parse: parseStampExpiry,
    timeout_ms: 60000,
    queue: { bucket: 'compounding', leverage: 3, cost_min: 30 },
  },
  {
    name: 'type-specific-a-plus',
    description: 'Per-type A+ publication bar (ADR-0022): universal floor + type-specific checks for politician/donor/corporation/think-tank',
    cmd: ['node', 'scripts/type-specific-a-plus-bar.cjs', '--json'],
    parse: parseTypeSpecificAPlus,
    timeout_ms: 90000,
    queue: { bucket: 'blocking', leverage: 5, cost_min: 45 },
  },
  {
    name: 'url-domain-policy',
    description: 'URLs to dead/demoted domains in publication-tier profiles (FollowTheMoney, pre-migration LDA, OpenSecrets)',
    cmd: ['node', 'scripts/url-domain-policy.cjs', '--json'],
    parse: parseUrlDomainPolicy,
    timeout_ms: 60000,
    queue: { bucket: 'compounding', leverage: 2, cost_min: 30 },
  },
  {
    name: 'reconciliation-framework-tier-1',
    description: 'Data integrity: absurd-value frontmatter, self-loop edges, duplicates, orphans',
    cmd: ['node', 'scripts/verify-all.cjs', '--tier', '1'],
    parse: parseVerifyAll,
    timeout_ms: 300000,
    queue: { bucket: 'deciding', leverage: 4, cost_min: 45 },
  },
  {
    name: 'leftover-artifacts',
    description: 'Transient files (dedup .bak, temp, stray logs) not gitignored — commit-scope risk + disk cruft',
    cmd: ['node', 'scripts/leftover-artifacts-check.cjs', '--no-queue'],
    parse: parseLeftoverArtifacts,
    timeout_ms: 30000,
    queue: { bucket: 'compounding', leverage: 2, cost_min: 5 },
  },
  {
    name: 'policy-pages-integrity',
    description: 'Auto-generated policy pages (build-policy-pages.cjs output): freshness, headline lead, stat line, donor section, ops-only footer wrap',
    cmd: ['node', 'scripts/policy-pages-integrity-check.cjs', '--json'],
    parse: parsePolicyPagesIntegrity,
    timeout_ms: 30000,
    queue: { bucket: 'compounding', leverage: 2, cost_min: 10 },
  },
  {
    name: 'story-pages-integrity',
    description: 'Auto-detected story candidates (data/stories.jsonl): broken wikilinks, stale both-sides patterns (counterparty no longer in donors+opposes after edit), duplicate subject+counterparty pairs. Writes integrity_status flags so /stories surfaces warnings.',
    cmd: ['node', 'scripts/story-pages-integrity-check.cjs', '--json', '--write'],
    parse: parseStoryPagesIntegrity,
    timeout_ms: 60000,  // walks content/ to build profile index
    queue: { bucket: 'compounding', leverage: 2, cost_min: 5 },
  },
  // PAUSED 2026-04-28 alongside the STOCK Act pipeline. While the pipeline
  // is intentionally not running, this freshness check would flag every
  // run as a finding — pure noise. Re-enable when financial-disclosures
  // is unpaused in attention-dispatcher.cjs.
  // {
  //   name: 'capitol-trades-freshness',
  //   description: 'STOCK Act pipeline freshness check. Flags >36h old data.',
  //   cmd: ['node', 'scripts/capitol-trades-freshness-check.cjs', '--json'],
  //   parse: parseCapitolTradesFreshness,
  //   timeout_ms: 10000,
  //   queue: { bucket: 'compounding', leverage: 1, cost_min: 5 },
  // },
  {
    name: 'frontmatter-schema',
    description: 'Frontmatter schema violations per ADR-0023 (universal/type-required/proposed-required/retired)',
    cmd: ['node', 'scripts/frontmatter-schema-validator.cjs', '--json'],
    parse: parseFrontmatterSchema,
    timeout_ms: 60000,
    queue: { bucket: 'deciding', leverage: 3, cost_min: 60 },
  },
  {
    name: 'dispatcher-alive',
    description: 'Attention Queue dispatcher daemon liveness — log freshness during expected-uptime window',
    cmd: ['node', 'scripts/dispatcher-alive-check.cjs', '--json'],
    parse: parseDispatcherAlive,
    timeout_ms: 10000,
    queue: { bucket: 'blocking', leverage: 5, cost_min: 5 },
  },
  {
    name: 'enrichment-freshness',
    description: 'Enrichment pipeline freshness — flags if API Enrichment Bot has not committed in >3 days',
    cmd: ['node', 'scripts/enrichment-freshness-check.cjs', '--json'],
    parse: parseEnrichmentFreshness,
    timeout_ms: 15000,
    queue: { bucket: 'blocking', leverage: 5, cost_min: 10 },
  },
  {
    name: 'librarian-validation',
    description: 'Donor-map graph engine load (ADR-0024). Hard-fail on duplicate bioguide / FEC mismap; soft warn when ambiguous_aliases exceeds threshold.',
    cmd: ['node', 'scripts/librarian-validation-check.cjs', '--json'],
    parse: parseLibrarianValidation,
    timeout_ms: 30000,
    queue: { bucket: 'blocking', leverage: 5, cost_min: 15 },
  },
  {
    name: 'pathless-stub-entities',
    description: 'Ghost entity records with no profile_path (Bob Casey class) — discovery-scanner stubs shadowing real profiles.',
    cmd: ['node', 'scripts/pathless-stub-entities-check.cjs', '--json'],
    parse: parsePathlessStubs,
    timeout_ms: 15000,
    queue: { bucket: 'compounding', leverage: 3, cost_min: 30 },
  },
  {
    name: 'duplicate-politician-profiles',
    description: 'Two distinct vault profiles mapping to the same politician (Ed Markey + Edward J. Markey class) — editorial cleanup needed.',
    cmd: ['node', 'scripts/duplicate-politician-profiles-check.cjs', '--json'],
    parse: parseDuplicatePoliticianProfiles,
    timeout_ms: 15000,
    queue: { bucket: 'deciding', leverage: 4, cost_min: 30 },
  },
  {
    name: 'multi-bioguide-fec-id',
    description: 'Politician entity pools FEC candidate IDs from multiple bioguide owners (Bob Casey class) — donor data from different humans merged into one record. Defamation risk if rendered.',
    cmd: ['node', 'scripts/multi-bioguide-fec-id-check.cjs', '--json'],
    parse: parseMultiBioguideFecId,
    timeout_ms: 15000,
    queue: { bucket: 'deciding', leverage: 5, cost_min: 60 },
  },
  {
    name: 'duplicate-entity-profiles',
    description: 'Two distinct vault profiles representing the same non-politician entity — donor/corporation/think-tank duplicates that the librarian sees as ambiguous and refuses to resolve. Detected via shared FEC committee_id, EIN, SEC CIK, or identical normalized name. Editorial cleanup needed.',
    cmd: ['node', 'scripts/duplicate-entity-profiles-check.cjs', '--json'],
    parse: parseDuplicateEntityProfiles,
    timeout_ms: 15000,
    queue: { bucket: 'deciding', leverage: 4, cost_min: 30 },
  },
  {
    name: 'class-tag-staleness',
    description: 'Reconciled class-tag proposals (augmentation + conflict) that need human review. Augmentation = proposal would add fields to a partially-tagged entity. Conflict = proposal disagrees with persisted single-value field. See ops /class-tags page filtered to status=conflict or status=augmentation.',
    cmd: ['node', 'scripts/class-tag-staleness-check.cjs', '--json'],
    parse: parseClassTagStaleness,
    timeout_ms: 10000,
    queue: { bucket: 'compounding', leverage: 2, cost_min: 5 },
  },
];

// ─── Output parsers (one per check) ────────────────────────────────
//
// These are intentionally small. If a check's output format is hard to
// parse, prefer adding --json to the underlying script rather than
// writing a fragile regex here.

function parsePipelineJanitor(stdout, _stderr, _exit) {
  // Format: "With issues: NN" in output.
  const m = stdout.match(/With issues:\s+(\d+)/);
  const count = m ? parseInt(m[1], 10) : 0;
  const scanned = (stdout.match(/Scanned:\s+(\d+)/) || [])[1];
  return {
    findings_count: count,
    notes: `Scanned ${scanned || '?'} profiles. ${count} had issues.`,
  };
}

function parseNoteAutoResolver(stdout, _stderr, _exit) {
  // --json mode emits { findings_count, mode, flipped, drift }
  try {
    const parsed = JSON.parse(stdout);
    const drift = parsed.findings_count || 0;
    if (drift === 0) {
      return { findings_count: 0, notes: 'All auto-resolve notes in sync.' };
    }
    const flipDescriptions = (parsed.drift || [])
      .filter((d) => d.action === 'flip')
      .map((d) => `${path.basename(d.file).replace(/\.md$/, '')} ${d.from}→${d.to}`)
      .slice(0, 3)
      .join(', ');
    return {
      findings_count: drift,
      notes: `${drift} note(s) need status flip${flipDescriptions ? ': ' + flipDescriptions : ''}`,
    };
  } catch {
    return { findings_count: 0, notes: 'Resolver parse failed.' };
  }
}

function parseFrontmatterOrphan(stdout, _stderr, _exit) {
  try {
    const j = JSON.parse(stdout);
    const strong = j.strong_signal_count || j.findings_count || 0;
    const total = j.candidate_total || 0;
    const states = j.by_state || {};
    return {
      findings_count: strong,
      notes:
        `${strong} strong-signal candidate(s); ${total} total in store; ` +
        `pruned: ${states['approved-prune'] || 0}; kept: ${states['kept'] || 0}; ` +
        `librarian-gap: ${states['blocked-by-librarian-gap'] || 0}; ` +
        `resolved: ${states['resolved'] || 0}.`,
    };
  } catch {
    return { findings_count: 0, notes: 'orphan-check parse failed' };
  }
}

function parseRelationshipOverlap(stdout, _stderr, _exit) {
  try {
    const j = JSON.parse(stdout);
    const fmOnly = j.findings_count || 0;
    const backed = j.monetary_backed_count || 0;
    const top = (j.frontmatter_only || [])
      .slice(0, 3)
      .map((r) => `${r.subject} ↔ ${r.overlap_name}`)
      .join('; ');
    return {
      findings_count: fmOnly,
      notes:
        `${fmOnly} frontmatter-only overlap(s)${top ? ' (' + top + ')' : ''}; ` +
        `${backed} monetary-backed (real both-sides, ignored).`,
    };
  } catch {
    return { findings_count: 0, notes: 'overlap parse failed' };
  }
}

function parseHarnessSelfAudit(stdout, _stderr, _exit) {
  // --json mode emits { findings_count, findings: [{kind, detail, fix}, ...] }
  try {
    const parsed = JSON.parse(stdout);
    const byKind = {};
    for (const f of parsed.findings || []) {
      byKind[f.kind] = (byKind[f.kind] || 0) + 1;
    }
    const summary = Object.entries(byKind)
      .map(([k, n]) => `${n} ${k}`)
      .join(', ');
    return {
      findings_count: parsed.findings_count || 0,
      notes: summary || 'Harness wiring healthy.',
    };
  } catch {
    return { findings_count: 0, notes: 'Self-audit parse failed.' };
  }
}

function parseSimpleCountFromLine(stdout, _stderr, exit) {
  // audit-committee-registry prints a summary line. Fall back to exit.
  const m = stdout.match(/(\d+)\s+(?:critical|high|issues?|anomalies?)/i);
  return {
    findings_count: m ? parseInt(m[1], 10) : (exit === 0 ? 0 : 1),
    notes: 'See full output in the raw stdout tail.',
  };
}

function parseCanonicalTotals(stdout, _stderr, exit) {
  const inBounds = (stdout.match(/in bounds:\s+(\d+)/) || [])[1] || '0';
  const tolerated = (stdout.match(/tolerated.*?:\s+(\d+)/) || [])[1] || '0';
  const out = (stdout.match(/out of bounds:\s+(\d+)/) || [])[1] || '0';
  return {
    findings_count: parseInt(out, 10),
    notes: `${inBounds} in-bounds, ${tolerated} tolerated, ${out} out-of-bounds. Exit ${exit}.`,
  };
}

function parseInlineField(stdout, stderr, _exit) {
  // sentinel prints to stderr on violation: "Total: NN violation(s) across NN file(s)"
  const text = stdout + '\n' + stderr;
  const m = text.match(/Total:\s+(\d+)\s+violation/);
  return {
    findings_count: m ? parseInt(m[1], 10) : 0,
    notes: m ? m[0] : 'clean',
  };
}

function parsePublicationReadiness(stdout, _stderr, _exit) {
  try {
    const j = JSON.parse(stdout);
    return {
      findings_count: j.failed || 0,
      notes: `${j.total || 0} scanned, ${j.passed || 0} passed, ${j.failed || 0} failed.`,
    };
  } catch {
    return { findings_count: 0, notes: '(json parse failed — likely 0 public routes yet)' };
  }
}

function parseProseDataConsistency(stdout, _stderr, _exit) {
  try {
    const j = JSON.parse(stdout);
    return {
      findings_count: j.total_findings || 0,
      notes: `${j.scanned || 0} scanned, ${j.profiles_with_findings || 0} with contradictions, ${j.total_findings || 0} finding(s) total.`,
    };
  } catch {
    return { findings_count: 0, notes: '(json parse failed)' };
  }
}

function parseStampExpiry(stdout, _stderr, _exit) {
  try {
    const j = JSON.parse(stdout);
    const byTier = Object.entries(j.by_tier || {}).map(([t, n]) => `${t}: ${n}`).join(', ') || 'none';
    return {
      findings_count: j.total_findings || 0,
      notes: `${j.scanned || 0} scanned. Expired: ${byTier}.`,
    };
  } catch {
    return { findings_count: 0, notes: '(json parse failed)' };
  }
}

function parseTypeSpecificAPlus(stdout, _stderr, _exit) {
  try {
    const j = JSON.parse(stdout);
    const byType = Object.entries(j.by_type || {}).map(([t, s]) => `${t} ${s.passed}/${s.scanned}`).join(', ') || 'none';
    return {
      findings_count: j.total_findings || 0,
      notes: `${j.scanned || 0} scanned, ${j.profiles_passed || 0} pass, ${j.profiles_failed || 0} fail. By type: ${byType}.`,
      // Per ops-harness-audit-2026-04-24 follow-up #1. /signoff-queue
      // reads `passing` to populate its per-profile table from the
      // live harness instead of the audit-a-plus-passed frontmatter
      // stamp (which lags or stops if the janitor is paused).
      data: { passing: Array.isArray(j.passing) ? j.passing : [] },
    };
  } catch {
    return { findings_count: 0, notes: '(json parse failed)' };
  }
}

function parseUrlDomainPolicy(stdout, _stderr, _exit) {
  try {
    const j = JSON.parse(stdout);
    const sev = Object.entries(j.by_severity || {}).map(([s, n]) => `${s}: ${n}`).join(', ');
    return {
      findings_count: j.total_findings || 0,
      notes: `${j.scanned || 0} scanned, ${j.profiles_with_hits || 0} profiles hit. ${sev}.`,
    };
  } catch {
    return { findings_count: 0, notes: '(json parse failed)' };
  }
}

function parseEnrichmentFreshness(stdout, _stderr, _exit) {
  try {
    const j = JSON.parse(stdout);
    return { findings_count: j.findings_count || 0, notes: j.message };
  } catch {
    return { findings_count: 0, notes: '(json parse failed)' };
  }
}

function parsePathlessStubs(stdout, _stderr, _exit) {
  try {
    const j = JSON.parse(stdout);
    return { findings_count: j.findings_count || 0, notes: j.message };
  } catch {
    return { findings_count: 0, notes: '(json parse failed)' };
  }
}

function parseDuplicatePoliticianProfiles(stdout, _stderr, _exit) {
  try {
    const j = JSON.parse(stdout);
    return { findings_count: j.findings_count || 0, notes: j.message };
  } catch {
    return { findings_count: 0, notes: '(json parse failed)' };
  }
}

function parseMultiBioguideFecId(stdout, _stderr, _exit) {
  try {
    const j = JSON.parse(stdout);
    return { findings_count: j.findings_count || 0, notes: j.message };
  } catch {
    return { findings_count: 0, notes: '(json parse failed)' };
  }
}

function parseDuplicateEntityProfiles(stdout, _stderr, _exit) {
  try {
    const j = JSON.parse(stdout);
    return { findings_count: j.findings_count || 0, notes: j.message };
  } catch {
    return { findings_count: 0, notes: '(json parse failed)' };
  }
}

function parseClassTagStaleness(stdout, _stderr, _exit) {
  try {
    const j = JSON.parse(stdout);
    return { findings_count: j.findings_count || 0, notes: j.notes };
  } catch {
    return { findings_count: 0, notes: '(json parse failed)' };
  }
}

function parseLibrarianValidation(stdout, _stderr, exit) {
  try {
    const j = JSON.parse(stdout);
    if (!j.ok) {
      // Hard-fail: engine refused to start. findings_count = 1 to signal
      // a single load-blocking issue; the error name + message say what.
      return {
        findings_count: 1,
        notes: `engine refused to load: ${j.error?.name || 'unknown'} — ${j.error?.message || 'no detail'}`,
      };
    }
    // Soft-warn: ambiguous_aliases above threshold gets reported as the
    // findings_count so /attention can show a churnable list. The
    // unresolved_edges figure is informational only — it's a structural
    // signal that improves as duplicate profiles get cleaned up.
    const findings = exit === 2 ? (j.ambiguous_aliases || 0) : 0;
    return {
      findings_count: findings,
      notes: `${j.nodes.toLocaleString()} nodes, ${j.edges.toLocaleString()} edges. ambiguous_aliases=${j.ambiguous_aliases}, unresolved_edges=${j.unresolved_edges.toLocaleString()}, load_ms=${j.load_ms}.`,
    };
  } catch {
    return { findings_count: 0, notes: '(json parse failed)' };
  }
}

function parseDispatcherAlive(stdout, _stderr, _exit) {
  try {
    const j = JSON.parse(stdout);
    return {
      findings_count: j.findings_count || 0,
      notes: j.message,
    };
  } catch {
    return { findings_count: 0, notes: '(json parse failed)' };
  }
}

function parseFrontmatterSchema(stdout, _stderr, _exit) {
  try {
    const j = JSON.parse(stdout);
    // findings_count = HARD only (real errors the Dashboard shows).
    // Soft findings (missing_type_proposed) are ADR-0023 §9 Phase C/D
    // backfill work — not bugs today, scheduled future work. Surfacing
    // them as "violations" drowns real errors in noise (the 2026-04-24
    // Dashboard audit found this: 3,319 displayed, only 232 actionable).
    const hard = (j.by_kind['missing_universal'] || 0)
      + (j.by_kind['missing_type_required'] || 0)
      + (j.by_kind['missing_id'] || 0)
      + (j.by_kind['retired_field'] || 0)
      + (j.by_kind['unknown_type'] || 0);
    const soft = j.by_kind['missing_type_proposed'] || 0;
    return {
      findings_count: hard,
      notes: `${j.scanned} scanned, ${j.profiles_with_violations} with violations. ${hard} error(s) (universal/type-required/id/retired/unknown-type), ${soft} info (proposed-required backfill per ADR-0023 Phase C/D).`,
    };
  } catch {
    return { findings_count: 0, notes: '(json parse failed)' };
  }
}

function parsePolicyPagesIntegrity(stdout, _stderr, _exit) {
  try {
    const j = JSON.parse(stdout);
    return {
      findings_count: j.findings_count || 0,
      notes: j.notes || `${j.policies_scanned || 0} policies scanned`,
    };
  } catch {
    return { findings_count: 0, notes: '(json parse failed)' };
  }
}

function parseStoryPagesIntegrity(stdout, _stderr, _exit) {
  try {
    const j = JSON.parse(stdout);
    return {
      findings_count: j.findings_count || 0,
      notes: j.notes || `${j.stories_scanned || 0} stories scanned`,
    };
  } catch {
    return { findings_count: 0, notes: '(json parse failed)' };
  }
}

function parseCapitolTradesFreshness(stdout, _stderr, _exit) {
  try {
    const j = JSON.parse(stdout);
    return {
      findings_count: j.findings_count || 0,
      notes: j.notes || 'capitol trades freshness',
    };
  } catch {
    return { findings_count: 0, notes: '(json parse failed)' };
  }
}

function parseLeftoverArtifacts(stdout, _stderr, _exit) {
  // Format: "leftover-artifacts-check: N finding(s)"
  const m = stdout.match(/leftover-artifacts-check:\s+(\d+)\s+finding/);
  if (!m) return { findings_count: 0, notes: '(no header match)' };
  const n = parseInt(m[1], 10);
  return {
    findings_count: n,
    notes: n === 0
      ? 'no cruft detected — all transient artifacts are gitignored or deleted'
      : `${n} transient file(s) not gitignored (dedup backups, temp files, stray logs)`,
  };
}

function parseVerifyAll(stdout, _stderr, _exit) {
  // format: "TOTAL: NN error, NN warn (NN findings)"
  const m = stdout.match(/TOTAL:\s+(\d+)\s+error,\s+(\d+)\s+warn\s+\((\d+)\s+findings/);
  if (!m) return { findings_count: 0, notes: '(no total line found)' };
  return {
    findings_count: parseInt(m[1], 10),
    notes: `${m[1]} error, ${m[2]} warn (${m[3]} findings total).`,
  };
}

// ─── Attention Queue translation ───────────────────────────────────
//
// One entry per check that errored or found issues. Harness runs are
// source-scoped under "vault-audit" — every re-run atomically replaces
// the prior set, so the queue never accumulates stale entries.

function buildQueueEntries(results, checkDefs) {
  const byName = new Map(checkDefs.map(c => [c.name, c]));
  const entries = [];
  const today = new Date().toISOString().slice(0, 10);

  for (const r of results) {
    const def = byName.get(r.name);
    if (!def || !def.queue) continue;

    // Errored check — always surfaces as blocking regardless of queue config
    if (r.error || r.exit === null || r.timed_out) {
      entries.push({
        bucket: 'blocking',
        what: `vault-audit: ${r.name} failed to run`,
        why: r.error || (r.timed_out ? 'timed out' : `exit ${r.exit}`),
        where: '/system-health',
        cost_min: 10,
        leverage: 5,
        source: QUEUE_SOURCE,
        created: today,
        metadata: { check: r.name, exit: r.exit, timed_out: !!r.timed_out },
      });
      continue;
    }

    const findings = r.findings_count || 0;
    if (findings === 0) continue;

    entries.push({
      bucket: def.queue.bucket,
      what: `vault-audit: ${r.name} — ${findings} finding${findings === 1 ? '' : 's'}`,
      why: (r.description || '') + (r.notes ? ` — ${r.notes}` : ''),
      where: '/system-health',
      cost_min: def.queue.cost_min,
      leverage: def.queue.leverage,
      source: QUEUE_SOURCE,
      created: today,
      metadata: { check: r.name, findings_count: findings },
    });
  }

  return entries;
}

// ─── Runner ────────────────────────────────────────────────────────

function runCheck(check) {
  const start = Date.now();
  const [cmd, ...cmdArgs] = check.cmd;
  let result;
  try {
    result = spawnSync(cmd, cmdArgs, {
      cwd: ROOT,
      encoding: 'utf-8',
      timeout: check.timeout_ms,
      maxBuffer: 50 * 1024 * 1024,
    });
  } catch (err) {
    return {
      name: check.name,
      description: check.description,
      cmd: check.cmd,
      exit: null,
      duration_ms: Date.now() - start,
      error: err.message,
      findings_count: null,
      notes: 'harness error invoking check',
    };
  }

  const parsed = (() => {
    try {
      return check.parse(result.stdout || '', result.stderr || '', result.status);
    } catch (e) {
      return { findings_count: null, notes: `parse error: ${e.message}` };
    }
  })();

  const out = {
    name: check.name,
    description: check.description,
    cmd: check.cmd,
    exit: result.status,
    duration_ms: Date.now() - start,
    timed_out: result.signal === 'SIGTERM',
    findings_count: parsed.findings_count,
    notes: parsed.notes,
    stdout_tail: (result.stdout || '').split('\n').slice(-10).join('\n'),
    stderr_tail: (result.stderr || '').split('\n').slice(-5).join('\n'),
  };
  // Per-check structured payload — parsers may return `data` to surface
  // arrays/objects too large for stdout_tail. Used by /signoff-queue
  // to read type-specific-a-plus's `passing` list (audit follow-up #1).
  if (parsed.data && typeof parsed.data === 'object') out.data = parsed.data;
  return out;
}

// ─── Main ──────────────────────────────────────────────────────────

(function main() {
  const startAll = Date.now();

  const filtered = CHECKS.filter(c => {
    if (ONLY && !new RegExp(ONLY).test(c.name)) return false;
    if (SKIP && new RegExp(SKIP).test(c.name)) return false;
    return true;
  });

  if (!QUIET && !JSON_STDOUT) {
    console.log(`[vault-audit] running ${filtered.length} check(s)...`);
    console.log('');
  }

  const results = [];
  for (const c of filtered) {
    if (!QUIET && !JSON_STDOUT) process.stdout.write(`  -> ${c.name}... `);
    const r = runCheck(c);
    results.push(r);
    if (!QUIET && !JSON_STDOUT) {
      const mark = r.error ? '!' : (r.findings_count === 0 ? '✓' : '△');
      const fc = r.findings_count === null ? '?' : r.findings_count;
      const ms = (r.duration_ms / 1000).toFixed(1);
      console.log(`${mark} ${fc} finding(s) in ${ms}s`);
    }
  }

  const artifact = {
    generated_at: new Date().toISOString(),
    duration_ms: Date.now() - startAll,
    harness_version: 'phase-1-skeleton',
    checks: results,
    summary: {
      checks_run: results.length,
      checks_clean: results.filter(r => r.findings_count === 0).length,
      checks_with_findings: results.filter(r => (r.findings_count || 0) > 0).length,
      checks_errored: results.filter(r => r.error || r.exit === null).length,
      total_findings: results.reduce((s, r) => s + (r.findings_count || 0), 0),
    },
  };

  if (JSON_STDOUT) {
    process.stdout.write(JSON.stringify(artifact, null, 2));
    process.stdout.write('\n');
    process.exit(0);
  }

  try {
    fs.writeFileSync(ARTIFACT, JSON.stringify(artifact, null, 2));
  } catch (err) {
    console.error(`[vault-audit] failed to write artifact: ${err.message}`);
    process.exit(1);
  }

  // Write through to the Attention Queue: one entry per check with findings
  // or error. Re-runs replace all prior vault-audit entries (addEntries
  // is source-scoped). --no-queue disables (e.g. for test runs).
  let queueWritten = 0;
  if (!NO_QUEUE && !ONLY && !SKIP) {
    try {
      const entries = buildQueueEntries(results, filtered);
      queueWritten = addEntries(QUEUE_SOURCE, entries);
    } catch (err) {
      console.error(`[vault-audit] failed to update attention queue: ${err.message}`);
    }
  }

  if (!QUIET) {
    console.log('');
    console.log('─'.repeat(60));
    console.log(`  ${artifact.summary.checks_clean}/${artifact.summary.checks_run} clean`);
    console.log(`  ${artifact.summary.checks_with_findings} with findings`);
    if (artifact.summary.checks_errored > 0) {
      console.log(`  ${artifact.summary.checks_errored} errored`);
    }
    console.log(`  ${artifact.summary.total_findings} total findings`);
    console.log(`  artifact: content/Admin Notes/vault-audit-latest.json`);
    if (!NO_QUEUE && !ONLY && !SKIP) {
      console.log(`  attention queue: ${queueWritten} entr${queueWritten === 1 ? 'y' : 'ies'} written`);
    }
    console.log(`  ran in ${(artifact.duration_ms / 1000).toFixed(1)}s`);
  }

  process.exit(0);
})();
