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
    name: 'role-empty-monetary-edges',
    description:
      "Continuous regression detection for the Bowman/Fairshake bug class. Monetary edges should always have an explicit role (direct-contribution / ie-support / ie-oppose / etc.). Empty role lets consumers silently miscount IE-oppose as donations. findings_count stable/dropping = healthy; rising = an ingester regressed.",
    cmd: ['node', 'scripts/role-empty-monetary-check.cjs', '--json'],
    parse: parseRoleEmptyMonetary,
    timeout_ms: 60000,
    queue: { bucket: 'blocking', leverage: 5, cost_min: 5 },
  },
  {
    name: 'fec-committee-stub-audit',
    description:
      "FEC committee_ids referenced on edges that aren't mapped in fec-committee-registry.json. Resolved 2026-04-28 PM (371 → 0). This check stays at 0 going forward; if a future FEC ingest introduces new stubs, findings_count > 0 and they need a registry entry. Run audit with --apply to auto-resolve exact-name matches.",
    cmd: ['node', 'scripts/fec-committee-stub-audit.cjs', '--json'],
    parse: parseFecCommitteeStubAudit,
    timeout_ms: 90000,
    queue: { bucket: 'blocking', leverage: 5, cost_min: 5 },
  },
  {
    name: 'librarian-gap-audit',
    description:
      "Diagnostic: classify every guarded-field wikilink against the librarian. Reports counts per gap class (unresolvable / node-isolated / fec-committee-suspect / alias-candidate / ok). Read-only — gives editorial + infra a priority queue ranked by appearance leverage.",
    cmd: ['node', 'scripts/librarian-gap-audit.cjs', '--json'],
    parse: parseLibrarianGapAudit,
    timeout_ms: 120000,
    queue: { bucket: 'compounding', leverage: 4, cost_min: 30 },
  },
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
    name: 'frontmatter-prune-pending',
    description:
      "ADR-0027 P3: records stuck in state=approved-prune. Steady state is 0 — under normal flow the rebuilder runs synchronously on David's approve click. Findings count = records aged >1h in approved-prune (likely silent failure of the apply path). Investigate any positive count.",
    cmd: ['node', 'scripts/frontmatter-prune-pending-check.cjs', '--json'],
    parse: parseFrontmatterPrunePending,
    timeout_ms: 30000,
    queue: { bucket: 'compounding', leverage: 4, cost_min: 10 },
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
  // ─── Phase 5 librarian-data-quality checks (added 2026-05-01) ─────
  // Surfaced from CA Gov 2026 dossier work where bulk-derived edges
  // produced multiple wrong findings (Steyer self-fund undercount,
  // PG&E duplicate-count, opposition-committee direction misattribution,
  // amended-filing cycle misattribution). Each check audits one
  // failure mode in the cal-access-bulk ingestion or the dossier-
  // extraction layer that consumes it.
  {
    name: 'cycle-divergence',
    description: 'Cal-Access RCPT records where RCPT_DATE (filing date) and DATE_THRU (transaction date) diverge by >1 cycle. Pre-fix librarian misattributed cycle on these. Re-ingest with cycleAttribution() helper to fix.',
    cmd: ['node', 'scripts/cycle-divergence-check.cjs', '--json'],
    parse: parseGenericFindings,
    timeout_ms: 600000,  // scans full 19M-row RCPT_CD bulk
    queue: { bucket: 'compounding', leverage: 2, cost_min: 10 },
  },
  {
    name: 'opposition-committee-direction',
    description: 'FPPC opposition committees ("NO ON [CANDIDATE]") audited against override-file role classification + librarian edge consistency. Detects pipeline-side override gaps + librarian-side direction-flow leaks.',
    cmd: ['node', 'scripts/opposition-committee-direction-check.cjs', '--json'],
    parse: parseGenericFindings,
    timeout_ms: 60000,
    queue: { bucket: 'compounding', leverage: 2, cost_min: 10 },
  },
  {
    name: 'donor-name-clustering',
    description: 'Donor names in cal-access-bulk that cluster to the same normalized form across ≥2 raw variants but are NOT in the alias map. Each finding suggests a missed alias-merge that produces duplicate counting in dossier extracts.',
    cmd: ['node', 'scripts/donor-name-clustering-check.cjs', '--json'],
    parse: parseGenericFindings,
    timeout_ms: 60000,
    queue: { bucket: 'compounding', leverage: 2, cost_min: 10 },
  },
  {
    name: 'self-fund-integration',
    description: 'Candidates with self-fund records in cal-access-self-funding.jsonl whose profile auto-blocks may not surface the self-fund total. Reading librarian-derived bulk only would undercount fundraising for these candidates.',
    cmd: ['node', 'scripts/self-fund-integration-check.cjs', '--json'],
    parse: parseGenericFindings,
    timeout_ms: 60000,
    queue: { bucket: 'compounding', leverage: 2, cost_min: 10 },
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
    name: 'worktree-data-mirror',
    description: 'Detects silent data divergence between worktree and main repo data/derived/. Catches the class of bug found 2026-04-29 where detectors ran on incomplete data without warning.',
    cmd: ['node', 'scripts/worktree-data-mirror-check.cjs', '--json'],
    parse: parseWorktreeDataMirror,
    timeout_ms: 10000,
    queue: { bucket: 'compounding', leverage: 4, cost_min: 5 },
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
  {
    name: 'calibration-drift',
    description: "Semantic regression detector. Loads data/calibration-fixture.jsonl (curated top-N facts: 'Pfizer top-15 must include Clyburn, McCarthy, Hoyer') and verifies the current data/relationships-per-profile.json artifact still satisfies them. Fires within the dispatcher cycle when any fixture's must_include names drop out of the actual top-N. Catches the structural class of bug behind the 2026-04-28 cascade (stale artifact -> bad data-panels) regardless of upstream cause: role-tag drift, propagation gap, classifier change, librarian rewiring all surface the same way. Add fixtures by appending JSONL lines.",
    cmd: ['node', 'scripts/calibration-drift-check.cjs', '--json'],
    parse: parseCalibrationDrift,
    timeout_ms: 30000,
    queue: { bucket: 'blocking', leverage: 5, cost_min: 5 },
  },
  {
    name: 'librarian-gap-decisions',
    description: 'Editorial review queue for librarian-gap candidates (wikilinks the librarian cannot resolve — usually missing aliases). Findings count = state=candidate awaiting David triage. Refresh candidates: node scripts/librarian-gap-propose.cjs --report. Review: --review-list. Apply: --apply-decisions then --apply-approved. Approved aliases land in entities.jsonl.',
    cmd: ['node', 'scripts/librarian-gap-decisions-check.cjs', '--json'],
    parse: parseLibrarianGapDecisions,
    timeout_ms: 15000,
    queue: { bucket: 'compounding', leverage: 4, cost_min: 5 },
  },
  {
    name: 'editorial-decision-provenance',
    description: 'ADR-0029 Rule 16 enforcement. Verifies every editorial-decision record in non-candidate state has decided_by + decided_at provenance, and that auto_revert_eligible is consistent with decided_by. Without provenance the weekly sample-audit cant tell what Claude did vs David did, and the safety net degrades silently. Hard-fails: missing decided_by, invalid decided_by, missing decided_at, inconsistent auto_revert flag. Findings count > 0 means a writer is bypassing the pipeline.',
    cmd: ['node', 'scripts/editorial-decision-provenance-check.cjs', '--json'],
    parse: parseEditorialDecisionProvenance,
    timeout_ms: 30000,
    queue: { bucket: 'blocking', leverage: 5, cost_min: 5 },
  },
  {
    name: 'tier1-fixture-coverage',
    description: 'ADR-0029 Rule 16 enforcement at runtime. Verifies every registered Tier 1 decision class has matching fixture coverage in data/calibration-fixture.jsonl. Pipeline.register() enforces this at startup, but a fixture being deleted AFTER registration would leave auto-apply authority without a corresponding semantic safety net. Findings > 0 = stop-the-world: Claude has authority it shouldnt have, restore the fixture or remove the Tier 1 predicate.',
    cmd: ['node', 'scripts/tier1-fixture-coverage-check.cjs', '--json'],
    parse: parseTier1FixtureCoverage,
    timeout_ms: 15000,
    queue: { bucket: 'blocking', leverage: 5, cost_min: 5 },
  },
  {
    name: 'claude-decision-volume',
    description: 'ADR-0029 rate-limit watchdog. Counts decided_by=claude-auto records across all classes in the last hour. Soft alarm at 50/hr (review the calibration check + recent decision sample). Hard alarm at 200/hr (likely runaway predicate or feedback loop — Phase 2 will auto-freeze). Phase 1 just observes. Steady-state expected near 0 once the initial alias backlog drains.',
    cmd: ['node', 'scripts/claude-decision-volume-check.cjs', '--json'],
    parse: parseClaudeDecisionVolume,
    timeout_ms: 15000,
    queue: { bucket: 'blocking', leverage: 4, cost_min: 5 },
  },
  {
    name: 'auto-revert-pending',
    description: 'ADR-0029 visibility for calibration-driven reverts. Records in candidate state with reverted_reason set are decisions Claude made, the calibration disagreed with, and a human needs to re-review. Findings count = pending re-reviews. Phase 2 wires the auto-revert mechanism; Phase 1 just instruments the surface. Until Phase 2 ships, count is always 0.',
    cmd: ['node', 'scripts/auto-revert-pending-check.cjs', '--json'],
    parse: parseAutoRevertPending,
    timeout_ms: 15000,
    queue: { bucket: 'compounding', leverage: 3, cost_min: 5 },
  },
  {
    name: 'code-audit-fetch-discrepancy',
    description: 'ADR-0030 §9 — surfaces unaddressed code-audit-fetch outcomes. Reads data/code-audit-fetches.jsonl. Findings = (a) fetches in inconclusive state with non-ok status (caller forgot to recordResult), or (b) fetches resulting in discrepancy that have not yet been linked to a bug-queue entry. Steady state = 0. Continuous monitoring of pipeline self-audit health under the Rule 13 carve-out.',
    cmd: ['node', 'scripts/code-audit-fetch-discrepancy-check.cjs', '--json'],
    parse: parseCodeAuditFetchDiscrepancy,
    timeout_ms: 15000,
    queue: { bucket: 'compounding', leverage: 3, cost_min: 5 },
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

// Generic parser for checks that emit { check, findings_count, interpretation, ... }
// in --json mode. Used by Phase 5 librarian-data-quality checks (cycle-
// divergence, opposition-committee-direction, donor-name-clustering,
// self-fund-integration).
function parseGenericFindings(stdout, _stderr, _exit) {
  try {
    const j = JSON.parse(stdout);
    const total = j.findings_count || 0;
    return {
      findings_count: total,
      notes: j.interpretation || (total === 0 ? 'Clean.' : `${total} finding(s).`),
    };
  } catch {
    return { findings_count: 0, notes: 'generic check parse failed' };
  }
}

function parseRoleEmptyMonetary(stdout, _stderr, _exit) {
  try {
    const j = JSON.parse(stdout);
    const total = j.findings_count || 0;
    const bySrc = j.by_source || {};
    const sources = Object.entries(bySrc)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([k, n]) => `${k}:${n}`)
      .join(', ');
    return {
      findings_count: total,
      notes:
        total === 0
          ? 'Clean — every monetary edge has an explicit role.'
          : `${total} role-empty monetary edge(s)${sources ? ' (' + sources + ')' : ''}. Layer 3 skips at consumer; rising count = ingester regressed.`,
    };
  } catch {
    return { findings_count: 0, notes: 'role-empty-monetary parse failed' };
  }
}

function parseFecCommitteeStubAudit(stdout, _stderr, _exit) {
  try {
    const j = JSON.parse(stdout);
    const stubs = j.findings_count || 0;
    const total = j.total_stubs || 0;
    const resolvable = j.resolved_by_exact_name || 0;
    return {
      findings_count: stubs,
      notes:
        stubs === 0
          ? 'Clean — all FEC committee_ids in edges have registry mappings.'
          : `${stubs} unregistered committee_id(s); ${resolvable} resolvable by exact name (run --apply); ${total} total.`,
    };
  } catch {
    return { findings_count: 0, notes: 'fec-stub-audit parse failed' };
  }
}

function parseLibrarianGapAudit(stdout, _stderr, _exit) {
  try {
    const j = JSON.parse(stdout);
    const c = j.by_class || {};
    const high = j.high_leverage_count || 0;
    const totalGaps = j.total_gap_count || 0;
    const u = c.unresolvable?.count || 0;
    const ni = c['node-isolated']?.count || 0;
    const fec = c['fec-committee-suspect']?.count || 0;
    const ali = c['alias-candidate']?.count || 0;
    return {
      findings_count: high,
      notes:
        `${high} high-leverage gap(s) (≥${j.high_leverage_threshold || 10} appearances) — ${totalGaps} total: ` +
        `${u} unresolvable, ${ni} node-isolated, ${fec} fec-committee-suspect, ${ali} alias-candidate. ` +
        `See content/Admin Notes/librarian-gap-audit.md.`,
    };
  } catch {
    return { findings_count: 0, notes: 'gap-audit parse failed' };
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

function parseFrontmatterPrunePending(stdout, _stderr, _exit) {
  try {
    const j = JSON.parse(stdout);
    const overOneHour = j.over_one_hour || 0;
    const total = j.pending_total || 0;
    const overOneDay = j.over_one_day || 0;
    if (total === 0) {
      return { findings_count: 0, notes: 'no records in approved-prune (steady state).' };
    }
    return {
      findings_count: overOneHour,
      notes: `${total} approved-prune record(s); ${overOneHour} over 1h, ${overOneDay} over 24h. Apply path likely failed for the aged ones.`,
    };
  } catch {
    return { findings_count: 0, notes: 'prune-pending check parse failed' };
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

function parseCalibrationDrift(stdout, _stderr, _exit) {
  try {
    const j = JSON.parse(stdout);
    const failed = j.findings || [];
    const note = `${j.fixtures_passed || 0}/${j.fixtures_total || 0} fixtures pass${failed.length ? '. Failing: ' + failed.slice(0, 3).map((f) => `${f.profile}/${f.bucket}`).join(', ') + (failed.length > 3 ? ` +${failed.length - 3} more` : '') : ''}`;
    return { findings_count: j.findings_count || 0, notes: note };
  } catch {
    return { findings_count: 0, notes: '(json parse failed)' };
  }
}

function parseLibrarianGapDecisions(stdout, _stderr, _exit) {
  try {
    const j = JSON.parse(stdout);
    const top = (j.top || []).slice(0, 3).map((t) => `${t.name} (${t.appearances}x)`).join(', ');
    const stateNote = Object.entries(j.by_state || {}).map(([k, v]) => `${k}=${v}`).join(' ');
    return {
      findings_count: j.findings_count || 0,
      notes: `${stateNote}${top ? '. Top: ' + top : ''}`,
    };
  } catch {
    return { findings_count: 0, notes: '(json parse failed)' };
  }
}

function parseEditorialDecisionProvenance(stdout, _stderr, _exit) {
  try {
    const j = JSON.parse(stdout);
    const kindCounts = {};
    for (const f of j.findings || []) kindCounts[f.kind] = (kindCounts[f.kind] || 0) + 1;
    const note = Object.keys(kindCounts).length === 0
      ? `${j.classes_inspected || 0} class(es) clean`
      : Object.entries(kindCounts).map(([k, v]) => `${k}=${v}`).join(' ');
    return { findings_count: j.findings_count || 0, notes: note };
  } catch { return { findings_count: 0, notes: '(json parse failed)' }; }
}

function parseTier1FixtureCoverage(stdout, _stderr, _exit) {
  try {
    const j = JSON.parse(stdout);
    const note = `${j.classes_with_tier1 || 0} tier1 class(es), ${j.fixture_profiles_total || 0} fixture profile(s)`;
    return { findings_count: j.findings_count || 0, notes: note };
  } catch { return { findings_count: 0, notes: '(json parse failed)' }; }
}

function parseClaudeDecisionVolume(stdout, _stderr, _exit) {
  try {
    const j = JSON.parse(stdout);
    const note = `${j.total_in_window || 0}/hr (soft=${j.soft_limit}, hard=${j.hard_limit})`;
    return { findings_count: j.findings_count || 0, notes: note };
  } catch { return { findings_count: 0, notes: '(json parse failed)' }; }
}

function parseAutoRevertPending(stdout, _stderr, _exit) {
  try {
    const j = JSON.parse(stdout);
    const note = j.findings_count === 0 ? 'no pending reverts' : `${j.findings_count} record(s) need re-review`;
    return { findings_count: j.findings_count || 0, notes: note };
  } catch { return { findings_count: 0, notes: '(json parse failed)' }; }
}

function parseCodeAuditFetchDiscrepancy(stdout, _stderr, _exit) {
  try {
    const j = JSON.parse(stdout);
    const note = j.findings_count === 0
      ? `clean (${j.log_size || 0} fetches in log)`
      : `${j.findings_count} unaddressed (of ${j.log_size || 0} total fetches)`;
    return { findings_count: j.findings_count || 0, notes: note };
  } catch { return { findings_count: 0, notes: '(json parse failed)' }; }
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

function parseWorktreeDataMirror(stdout, _stderr, _exit) {
  try {
    const j = JSON.parse(stdout);
    if (j.status === 'main-repo' || j.status === 'skipped' || j.status === 'no-main-derived-dir') {
      return { findings_count: 0, notes: j.message || j.status };
    }
    if (j.status === 'in-sync') {
      return { findings_count: 0, notes: `worktree mirrors main repo (${j.main_file_count} file(s))` };
    }
    const missing = (j.findings || []).filter((f) => f.kind === 'missing').length;
    const drift = (j.findings || []).filter((f) => f.kind === 'size-mismatch').length;
    return {
      findings_count: j.findings_count || 0,
      notes: `${missing} missing, ${drift} size-mismatched. Remediate: node scripts/bootstrap-worktree-data.cjs`,
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
