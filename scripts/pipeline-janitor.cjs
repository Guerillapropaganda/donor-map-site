/**
 * pipeline-janitor.cjs — Pipeline Data Health Audit
 *
 * SCOPE (strict): pipeline data integrity only.
 * This script does NOT check URLs, wikilinks, class analysis, source tiers,
 * or anything outside the pipeline's responsibility.
 *
 * What it catches (the "zombie profile" problem):
 *   - Profile has a pipeline frontmatter key set (e.g. fec-candidate-id)
 *     but the corresponding <!-- auto:X --> body block is missing.
 *     This happens when data is stripped during cleanup but the
 *     frontmatter flag is never cleared, making the profile
 *     permanently invisible to the pipeline's skip-logic.
 *
 *   - Profile is at `ready` but known-gaps / internal-notes explicitly
 *     say it needs a fresh pipeline run.
 *
 *   - Profile is at `ready` but last-enriched > 90 days (stale).
 *
 *   - Politician/donor at `ready` missing expected auto-blocks for its type.
 *
 * Output: a report at content/Admin Notes/pipeline-janitor-report.md
 *
 * Usage:
 *   node scripts/pipeline-janitor.cjs                    # dry run (report only)
 *   node scripts/pipeline-janitor.cjs --write            # apply: demote to draft,
 *                                                         set needs-reenrichment: true
 *   node scripts/pipeline-janitor.cjs --zombies-only     # only flag zombie-block issues
 *                                                         (frontmatter key set but body
 *                                                          block missing — clearest cases)
 *   node scripts/pipeline-janitor.cjs --verbose          # include PASSING profiles
 *
 * EXEMPT profile types (never checked — no pipeline data expected):
 *   media-profile, think-tank, story, event, sub-note, daily-update,
 *   reference, methodology, system, page, index, digest
 */

const fs = require('fs');
const path = require('path');
const { walkDir, parseFrontmatter } = require('./lib/shared.cjs');
// Shared check helpers — see also ops/src/lib/checklist-helpers.ts
const {
  hasAutoBlock,
  hasAnyAutoBlock,
  countTier1InBody,
  isEnrichedWithin,
  runLegalReviewCheck,
  detectBothSidesEntities,
} = require('./lib/checklist-helpers.cjs');
const { getRequiredPipelinesForCommittees, getRequirementReasons } = require('./lib/committee-pipeline-map.cjs');
// Phase 2a Part 2 wiring: consult the rulebook for which types are
// exempt from federal-pipeline audits. Only the rulebook-knowable
// exemptions are pulled here; the legacy state-politician /
// local-politician exemptions are preserved inline because they're about
// federal-pipeline scope, not top-level scan eligibility.
let rulebookExemptTypes = new Set();
try {
  const rb = require('./lib/profile-type-rulebook.cjs');
  for (const t of rb.listAllTypes()) {
    const entry = rb.getTypeRulebook(t);
    // Types whose verified promotion gate is "none" never get federal
    // audit coverage (event, meta, their sub-categories).
    const gate = entry['base-rulebook']?.['promotion-gate']?.verified;
    if (gate === 'none') {
      rulebookExemptTypes.add(t);
      for (const sub of Object.keys(entry['sub-categories'] || {})) {
        rulebookExemptTypes.add(sub);
      }
    }
  }
  // Story type is promotable but does NOT use federal pipeline blocks —
  // it's editorial narrative content. Keep it exempt from federal audits.
  rulebookExemptTypes.add('story');
  const storyEntry = rb.getTypeRulebook('story');
  for (const sub of Object.keys(storyEntry['sub-categories'] || {})) {
    rulebookExemptTypes.add(sub);
  }
} catch (e) {
  // Rulebook unavailable — fall through to the legacy hardcoded set.
}

// ─── Config ────────────────────────────────────────────────────

const CONTENT_DIR = process.env.CONTENT_DIR || path.join(__dirname, '..', 'content');
const REPORT_PATH = path.join(CONTENT_DIR, 'Admin Notes', 'pipeline-janitor-report.md');
const WRITE = process.argv.includes('--write');

// Per ADR-0025 (carve-out from CLAUDE.md Rule 9 / ADR-0021):
// pipeline-janitor `--write` is authorized to demote a profile iff
// that profile has at least one MECHANICAL issue from this closed set.
// Advisory `a-plus-*` issues are NOT demote-triggers — they surface
// on /attention for editorial action; reclassify-readiness.cjs retains
// sole authority over readiness changes driven by editorial quality.
//
// When adding a new mechanical-issue kind to validateProfile, add it
// here in the same commit or it silently becomes advisory-only.
const MECHANICAL_DEMOTE_KINDS = new Set([
  'zombie-block',
  'missing-block',
  'never-enriched',
  'stale',
  'known-gap-pipeline',
  'internal-notes-pipeline',
]);

function hasMechanicalIssue(issues) {
  return issues.some((i) => MECHANICAL_DEMOTE_KINDS.has(i.kind));
}
const VERBOSE = process.argv.includes('--verbose');
const ZOMBIES_ONLY = process.argv.includes('--zombies-only');
const TYPE_FILTER = (process.argv.find(a => a.startsWith('--type=')) || '').split('=')[1] || null;
// --tier=a-plus adds the A+ audit layer on top of the zombie/missing-block
// checks. Plan Step 5 enables --write for the audit-a-plus-passed stamp.
const TIER_FILTER = (process.argv.find(a => a.startsWith('--tier=')) || '').split('=')[1] || null;
const RUN_A_PLUS_AUDIT = TIER_FILTER === 'a-plus' || TIER_FILTER === 's';
// --cohort adds whole-vault comparative checks (anomaly detection,
// cross-vault triangulation). Adds ~20-30s to a run but produces the
// uniqueness signals Tier D needs.
const RUN_COHORT_CHECKS = process.argv.includes('--cohort');

// Types that don't require federal pipeline enrichment — never audit these
// for missing Congress.gov / GovTrack / Committee auto-blocks.
//
// Two sources:
//   1. The rulebook (via rulebookExemptTypes above) contributes all types
//      whose verified promotion gate is "none" (event + meta + meta
//      sub-categories) plus story + story sub-categories (editorial
//      narrative content doesn't use federal pipelines).
//   2. Legacy hardcoded exemptions below for types the rulebook can't yet
//      distinguish: state-politician and local-politician (federal
//      pipelines legitimately don't apply), media-profile and think-tank
//      (these used to be top-level types before the media/entity taxonomy
//      lock — kept for backward compat until migration).
//
// The federal-pipeline-specific exemptions live here rather than in the
// rulebook because they're about pipeline scope, not about whether the
// type is promotable at all.
const EXEMPT_TYPES = new Set([
  'media-profile', 'think-tank',
  'state-politician', 'local-politician',
  'system', // legacy type value used by some early vault metadata files
  ...rulebookExemptTypes,
]);

// Expected pipeline auto-blocks by profile type.
// A profile at `ready` SHOULD have at least one from each group.
// Missing = pipeline data is incomplete = should be draft.
//
// Pattern lists accept BOTH live (CSV-bulk era) and legacy (API-pipeline era)
// block names so transition-period profiles still pass. Live names emit from
// `scripts/build-*-panels.cjs`; legacy names were emitted by the API pipelines
// paused 2026-04-24 (see `data/enrichment-state.json`).
const EXPECTED_BLOCKS = {
  politician: [
    { group: 'fec', patterns: ['auto:fec-lifetime', 'auto:fec-politician', 'auto:fec-fundraising'], key: 'fec-candidate-id' },
    { group: 'voting', patterns: ['auto:voting-record', 'auto:govtrack'], key: 'govtrack-id' },
    { group: 'congress', patterns: ['auto:congress-bills', 'auto:sponsored-bills', 'auto:congress', 'auto:committee-assignments', 'auto:committee'], key: 'bioguide-id' },
  ],
  donor: [
    { group: 'fec', patterns: ['auto:fec-lifetime', 'auto:fec-donor', 'auto:fec'], key: 'fec-committee-id' },
  ],
  corporation: [
    { group: 'lda', patterns: ['auto:lda-lobbying'], key: null },
  ],
  'lobbying-firm': [
    { group: 'lda', patterns: ['auto:lda-lobbying'], key: null },
  ],
  pac: [
    { group: 'fec', patterns: ['auto:fec-lifetime', 'auto:fec'], key: null },
  ],
};

// Auto-blocks that builders emit but profiles are NOT required to have. The
// janitor knows about them (so the harness-self-audit `block-name-drift`
// check is satisfied) but their absence never demotes a profile.
//
// Why each is optional rather than required:
//   auto:executive-actions — only presidents & governors issue exec orders.
//     Requiring on all politicians would falsely demote every member of Congress.
//   auto:irs-990 — only 501(c) nonprofits file 990s. think-tank is in
//     EXEMPT_TYPES today; promoting to required would re-audit those.
//   auto:offshore-records — ICIJ leak matches are rare. Most profiles have
//     no offshore exposure; absence is the norm, not a defect.
//   auto:data-panel — eligible for future promotion to required for politician
//     + donor, but not all profiles have been re-built yet (rollout pending).
//     Promotion needs an ADR + a sweep to confirm coverage first.
const KNOWN_OPTIONAL_BLOCKS = new Set([
  'auto:executive-actions',
  'auto:irs-990',
  'auto:offshore-records',
  'auto:data-panel',
  // Cal-Access state-level campaign finance auto-block. Emitted by
  // build-cal-access-panels.cjs onto CA-Gov-2026 candidate profiles
  // and any other politician with cal-access-bulk edges. Optional
  // because most non-CA politicians don't have CA state-level activity;
  // absence is the norm. Surfaced 2026-04-30 by harness-self-audit
  // block-name-drift check.
  'auto:cal-access',
]);

// ─── Pipeline-status awareness ──────────────────────────────────
// Source of truth: data/enrichment-state.json (CLAUDE.md Rule 3).
// During the CSV-only freeze, "run X pipeline" advice is split between
// pipelines with a local CSV-bulk equivalent (truly fixable now) and
// pipelines that depend on paused GitHub Actions workflows (defer or
// resume Actions). The janitor must speak both languages.

function loadPipelineStatus() {
  try {
    const raw = fs.readFileSync(path.join(__dirname, '..', 'data', 'enrichment-state.json'), 'utf-8');
    const state = JSON.parse(raw);
    return {
      paused: !!state.paused,
      since: state.paused_since || null,
      pausedWorkflows: state.paused_workflows || [],
    };
  } catch {
    return { paused: false, since: null, pausedWorkflows: [] };
  }
}

const PIPELINE_STATUS = loadPipelineStatus();

// Maps each pipeline name the janitor recommends to:
//   csvBulk: shell command(s) that actually populate the missing auto-block
//            during the CSV-only freeze (null = no local fallback)
//   label:   human-readable name for status messages
//   note:    optional caveat (e.g. domain broken until $date)
const PIPELINE_FIX_MAP = {
  fec: {
    csvBulk: 'node scripts/ingest-fec-pas2-bulk.cjs && node scripts/build-fec-lifetime-panels.cjs',
    label: 'FEC',
  },
  voting: {
    csvBulk: 'node scripts/ingest-voteview-bulk.cjs && node scripts/build-voting-record-panels.cjs',
    label: 'voting record',
  },
  congress: {
    csvBulk: 'node scripts/ingest-congress-bills-bulk.cjs && node scripts/build-sponsored-bills-panel.cjs',
    label: 'Congress',
  },
  usaspending: {
    csvBulk: 'node scripts/ingest-usaspending-bulk.cjs',
    label: 'USASpending',
  },
  // No CSV-bulk fallback — these were API pipelines paused 2026-04-24
  occ:               { csvBulk: null, label: 'OCC' },
  'sec-edgar':       { csvBulk: null, label: 'SEC EDGAR' },
  fda:               { csvBulk: null, label: 'FDA' },
  fara:              { csvBulk: null, label: 'FARA' },
  opensanctions:     { csvBulk: null, label: 'OpenSanctions' },
  ftc:               { csvBulk: null, label: 'FTC' },
  'federal-register':{ csvBulk: null, label: 'Federal Register' },
  courtlistener:     { csvBulk: null, label: 'CourtListener' },
  'doj-press':       { csvBulk: null, label: 'DOJ Press' },
  lda:               { csvBulk: null, label: 'LDA', note: 'lda.gov auth broken until June 2026' },
};

// Returns a fix string honest about whether the pipeline can actually be
// run right now (CSV bulk available) or is blocked on paused Actions.
function getFixCommand(pipelineName, verb /* 'run' | 're-run' */) {
  const meta = PIPELINE_FIX_MAP[pipelineName];
  const v = verb === 're-run' ? 're-run' : 'run';
  if (!meta) return `${v} ${pipelineName} pipeline`;
  if (meta.csvBulk) return `${v} CSV bulk: \`${meta.csvBulk}\``;
  if (PIPELINE_STATUS.paused) {
    const note = meta.note ? ` (${meta.note})` : '';
    const since = PIPELINE_STATUS.since ? ` since ${PIPELINE_STATUS.since}` : '';
    return `BLOCKED: ${meta.label} API pipeline paused${since}${note} — defer or resume GitHub Actions`;
  }
  return `${v} ${meta.label} pipeline`;
}

// Categorize a fix into one of three buckets for report grouping.
function getFixCategory(pipelineName) {
  const meta = PIPELINE_FIX_MAP[pipelineName];
  if (meta && meta.csvBulk) return 'fixable-now';
  if (meta && !meta.csvBulk && PIPELINE_STATUS.paused) return 'blocked-paused';
  return 'fixable-now';
}

// Categorize an issue object after auditProfile populates it.
function categorizeIssue(issue) {
  if (issue.kind && issue.kind.startsWith('a-plus-')) return 'editorial-advisory';
  if (issue.category) return issue.category;
  // known-gap / internal-notes / stale / never-enriched: demote-only, no pipeline command
  if (['known-gap-pipeline', 'internal-notes-pipeline', 'stale', 'never-enriched'].includes(issue.kind)) {
    return 'fixable-now'; // demote is the fix and that's a real action
  }
  return 'fixable-now';
}

// Phrases in known-gaps / internal-notes that signal "still needs pipeline work"
const NEEDS_PIPELINE_PHRASES = [
  /needs? fresh pipeline/i,
  /awaits? pipeline/i,
  /awaits? (next|fresh) (run|enrichment)/i,
  /pipeline run pending/i,
  /not yet enriched/i,
  /cache (refresh|invalidation) pending/i,
  /auto.?blocks? stripped/i,
  /needs (re-?)?enrichment/i,
  /stripped in.*cleanup/i,
  /contaminated.*needs.*run/i,
];

// ─── Helpers ────────────────────────────────────────────────────

function daysSince(dateStr) {
  if (!dateStr) return Infinity;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return Infinity;
  return (Date.now() - d.getTime()) / 86400000;
}

function hasAnyBlock(body, patterns) {
  for (const p of patterns) {
    if (body.includes(`<!-- ${p} start`) || body.includes(`<!-- ${p}-start`)) return true;
  }
  return false;
}

function checkNeedsPipelinePhrase(text) {
  if (!text) return null;
  const str = Array.isArray(text) ? text.join(' \n ') : String(text);
  for (const re of NEEDS_PIPELINE_PHRASES) {
    const m = str.match(re);
    if (m) return m[0];
  }
  return null;
}

// ─── Main Audit ─────────────────────────────────────────────────

function auditProfile(filePath, content) {
  const { data, body } = parseFrontmatter(content);
  const issues = [];

  const readiness = data['content-readiness'];
  const type = data.type;

  // Only audit profiles that claim to be `ready` (or `verified`)
  // Drafts and raws are expected to have gaps.
  if (readiness !== 'ready' && readiness !== 'verified') {
    return { skipped: true };
  }

  // Exempt types that don't require pipeline enrichment
  if (EXEMPT_TYPES.has(type)) {
    return { skipped: true };
  }

  // Optional --type=X filter
  if (TYPE_FILTER && type !== TYPE_FILTER) {
    return { skipped: true };
  }

  // Respect pre-existing N/A markers — if David marked pipeline checks as N/A
  // in the Ops app, he's declared that check doesn't apply to this profile.
  const checklistNa = data['checklist-na'] || [];
  const naSet = new Set(Array.isArray(checklistNa) ? checklistNa.map(s => String(s).split(':')[0].trim()) : []);

  // ─── Check 1: known-gaps / internal-notes mention pipeline work ──
  const gapPhrase = checkNeedsPipelinePhrase(data['known-gaps']);
  if (gapPhrase) {
    issues.push({
      kind: 'known-gap-pipeline',
      detail: `known-gaps mentions "${gapPhrase.slice(0, 60)}" — should be draft`,
      fix: 'demote to draft',
    });
  }

  const notesPhrase = checkNeedsPipelinePhrase(data['internal-notes']);
  if (notesPhrase) {
    issues.push({
      kind: 'internal-notes-pipeline',
      detail: `internal-notes mentions "${notesPhrase.slice(0, 60)}"`,
      fix: 'demote to draft',
    });
  }

  // ─── Check 2: zombie auto-blocks (frontmatter key set, body missing block) ──
  const expected = EXPECTED_BLOCKS[type];
  if (expected) {
    for (const group of expected) {
      const hasBlock = hasAnyBlock(body, group.patterns);
      const hasKey = group.key ? !!data[group.key] : false;

      // Zombie: key is set but block is missing
      if (hasKey && !hasBlock) {
        issues.push({
          kind: 'zombie-block',
          detail: `${group.key}=${data[group.key]} but no <!-- ${group.patterns[0]} --> block in body`,
          fix: getFixCommand(group.group, 're-run'),
          category: getFixCategory(group.group),
        });
      }

      // Ready profile missing expected block entirely (no key, no block)
      // Only flag if readiness is `ready` (not verified — those may have custom content)
      //
      // IMPORTANT: when there's no key, the bulk ingest can't help — the
      // builder joins data to profiles via the ID. The real fix is either
      // (a) resolve the ID upstream (entity-resolution work) or (b) demote.
      // We surface that honestly rather than recommending a futile pipeline run.
      if (!hasBlock && !hasKey && readiness === 'ready') {
        const meta = PIPELINE_FIX_MAP[group.group];
        const label = (meta && meta.label) || group.group;
        const idField = group.key || `${group.group} ID`;
        issues.push({
          kind: 'missing-block',
          detail: `no ${group.group} pipeline data (no ${idField}, no block)`,
          fix: `no ${idField} resolved for this profile — either resolve ID upstream then run \`node scripts/ingest-${group.group === 'fec' ? 'fec-pas2-bulk' : group.group}-bulk.cjs\`, or demote to draft (admits no ${label} coverage)`,
          category: 'fixable-now', // demote IS the fix
          subkind: 'no-key',
        });
      }
    }
  }

  // ─── Check 3: staleness (last-enriched > 90 days old) ──
  const staleDays = daysSince(data['last-enriched']);
  if (staleDays > 90 && staleDays !== Infinity) {
    issues.push({
      kind: 'stale',
      detail: `last-enriched is ${Math.round(staleDays)} days old`,
      fix: 're-run pipelines',
    });
  } else if (staleDays === Infinity && expected) {
    issues.push({
      kind: 'never-enriched',
      detail: 'no last-enriched date set',
      fix: 'run pipelines',
    });
  }

  // ─── A+ audit checks (Step 3, dry-run only) ──────────────────────
  // These only fire when --tier=a-plus or --tier=s is passed. They layer
  // on top of the existing zombie/missing-block checks and produce
  // advisory issues (kind: "a-plus-*") that don't demote anything yet.
  // Write-mode for A+ audit stamps comes in plan Step 4.
  if (RUN_A_PLUS_AUDIT) {
    // A+ Tier A: committee-relevant regulatory cross-ref — politician-only.
    // Uses data.committees which is politician-specific.
    if (type === 'politician') {
      const requiredPipelines = getRequiredPipelinesForCommittees(data.committees);
      if (requiredPipelines.length > 0) {
        const missing = requiredPipelines.filter(p => !hasAutoBlock(body, p));
        if (missing.length > 0) {
          const reasons = getRequirementReasons(data.committees);
          const reasonText = reasons.map(r => r.reason).join(' ');
          const fixParts = missing.map(p => `${p}: ${getFixCommand(p, 'run')}`);
          issues.push({
            kind: 'a-plus-committee-cross-ref',
            detail: `missing committee-relevant pipelines: ${missing.join(', ')}. ${reasonText}`,
            fix: fixParts.join(' | '),
          });
        }
      }
    }

    // ADR-0022 follow-up (2026-04-23): drop the politician-only gate on
    // universal checks below. source-floor, legal-review, central-thesis,
    // and story-grade apply to every type per ADR-0022's type-specific A+
    // bars. The gate was a leftover from the politician-only era before
    // ADR-0022 introduced the universal floor.

    // A+ Tier A: source-type floor raised from 2 to 3 for verified
    const srcCount = Math.max((data['source-types'] || []).length, countTier1InBody(body));
    if (srcCount < 3) {
      issues.push({
        kind: 'a-plus-source-floor',
        detail: `only ${srcCount} Tier 1 source types (A+ requires 3+)`,
        fix: 'add more Tier 1 sources or run more cross-ref pipelines',
      });
    }

    // A+ Tier C: automated legal-review pass
    const legalCheck = runLegalReviewCheck(
      {
        legalReviewDate: data['legal-review-date'],
        legalReviewResult: data['legal-review-result'],
      },
      body
    );
    if (!legalCheck.passed) {
      issues.push({
        kind: 'a-plus-legal-review',
        detail: `${legalCheck.hits.length} defamation-prone phrases outside blockquotes: ${legalCheck.hits.slice(0, 2).map(h => h.slice(0, 80)).join(' | ')}`,
        fix: 'David must legal-review and set legal-review-result: pass, OR rewrite the flagged phrases',
      });
    }

    // A+ Tier D: both-sides detection (same entity in donors + opposes)
    const bothSides = detectBothSidesEntities({ donors: data.donors, opposes: data.opposes });
    if (bothSides.length > 0) {
      issues.push({
        kind: 'a-plus-both-sides',
        detail: `entities appear in both donors: and opposes: — ${bothSides.slice(0, 3).join(', ')}`,
        fix: 'Research Claude should reconcile or document the both-sides pattern',
      });
    }

    // A+ Tier C: required frontmatter fields
    if (!data['central-thesis']) {
      issues.push({
        kind: 'a-plus-missing-thesis',
        detail: 'central-thesis field not populated',
        fix: 'add central-thesis: "<one sentence>" to frontmatter',
      });
    }
    if (!data['story-grade']) {
      issues.push({
        kind: 'a-plus-missing-story-grade',
        detail: 'story-grade field not populated',
        fix: 'add story-grade: story|report|investigation',
      });
    }
  }

  return { issues, readiness, type };
}

// ─── Write-back (demote + flag) ─────────────────────────────────

// Translate a technical issue into a plain-English explanation David can read
// at a glance without knowing what an "auto-block" is.
function laymanNote(issues) {
  const notes = [];
  const today = new Date().toISOString().slice(0, 10);
  notes.push(`[JANITOR ${today}] Demoted ready→draft by pipeline-janitor.cjs because:`);
  for (const i of issues) {
    if (i.kind === 'zombie-block') {
      // "fec-candidate-id=H0NY16143 but no <!-- auto:fec-politician --> block in body"
      const keyMatch = i.detail.match(/^([a-z-]+)=/);
      const rawKey = keyMatch ? keyMatch[1] : '';
      const sourceMap = {
        'fec-candidate-id': 'FEC',
        'fec-committee-id': 'FEC',
        'bioguide-id': 'Congress.gov',
        'govtrack-id': 'GovTrack',
      };
      const source = sourceMap[rawKey] || rawKey.replace(/-id$/, '').toUpperCase();
      notes.push(`  • ${source} data was stripped from this profile but the frontmatter still says it was enriched. The pipeline thinks it's already done and won't refresh it. Needs a re-run.`);
    } else if (i.kind === 'missing-block') {
      const grp = (i.detail.match(/no (\w+) pipeline data/) || [])[1] || 'pipeline';
      notes.push(`  • ${grp.toUpperCase()} data is missing entirely. This profile was promoted to ready without ever having ${grp} enrichment run on it.`);
    } else if (i.kind === 'never-enriched') {
      notes.push(`  • No last-enriched date is set. The pipelines have never touched this file.`);
    } else if (i.kind === 'stale') {
      notes.push(`  • Last enrichment was over 90 days ago. Data is stale.`);
    } else if (i.kind === 'known-gap-pipeline') {
      notes.push(`  • The profile's own known-gaps field says it needs a fresh pipeline run.`);
    } else if (i.kind === 'internal-notes-pipeline') {
      notes.push(`  • Internal notes say pipeline data was damaged or needs repopulation.`);
    } else if (i.kind === 'a-plus-committee-cross-ref') {
      notes.push(`  • A+ FAIL: ${i.detail}. The committee this politician sits on has regulatory overlap that wasn't cross-referenced.`);
    } else if (i.kind === 'a-plus-source-floor') {
      notes.push(`  • A+ FAIL: ${i.detail}. Verified profiles need at least 3 Tier 1 source types; this has fewer.`);
    } else if (i.kind === 'a-plus-legal-review') {
      notes.push(`  • A+ FAIL (legal): defamation-prone words appear outside blockquotes. David must legal-review and set legal-review-result: pass, OR the phrases must be rewritten.`);
    } else if (i.kind === 'a-plus-both-sides') {
      notes.push(`  • A+ FAIL: ${i.detail}. Same entity appears in both donors: and opposes: — needs Research Claude to reconcile.`);
    } else if (i.kind === 'a-plus-missing-thesis') {
      notes.push(`  • A+ FAIL: central-thesis field is empty. Research Claude must write a one-sentence thesis for the profile.`);
    } else if (i.kind === 'a-plus-missing-story-grade') {
      notes.push(`  • A+ FAIL: story-grade field is empty. Must be one of story/report/investigation based on URL count.`);
    }
  }
  notes.push(`The needs-reenrichment flag has been set. The next scheduled pipeline run will pick it up automatically.`);
  return notes.join('\n');
}

// Clear needs-reenrichment flag from a profile that has healed (all expected
// blocks are now present). Leaves readiness alone — David or Research Claude
// decides when to re-promote.
function clearReenrichFlag(filePath, content) {
  const match = content.match(/^(---\r?\n)([\s\S]*?)(\r?\n---)/);
  if (!match) return { changed: false };
  let yaml = match[2];
  if (!/^needs-reenrichment:/m.test(yaml)) return { changed: false };
  yaml = yaml.replace(/^needs-reenrichment:.*\r?\n?/m, '');
  yaml = yaml.replace(/^reenrich-reason:.*\r?\n?/m, '');
  const newContent = match[1] + yaml + match[3] + content.slice(match[0].length);
  fs.writeFileSync(filePath, newContent, 'utf-8');
  return { changed: true };
}

function applyFix(filePath, content, issues) {
  const match = content.match(/^(---\r?\n)([\s\S]*?)(\r?\n---)/);
  if (!match) return { changed: false };
  let yaml = match[2];

  // Demote to draft
  yaml = yaml.replace(/^content-readiness:\s*ready\s*$/m, 'content-readiness: draft');
  yaml = yaml.replace(/^content-readiness:\s*verified\s*$/m, 'content-readiness: draft');

  // Set needs-reenrichment: true (insert after last-enriched if present, else at end)
  if (!/^needs-reenrichment:/m.test(yaml)) {
    const reasons = [...new Set(issues.map(i => i.fix))].join('; ');
    const flag = `needs-reenrichment: true\nreenrich-reason: "${reasons.replace(/"/g, "'")}"`;
    if (/^last-enriched:/m.test(yaml)) {
      yaml = yaml.replace(/^(last-enriched:.*)$/m, `$1\n${flag}`);
    } else {
      yaml = yaml.trimEnd() + '\n' + flag;
    }
  }

  // Prepend a layman-English janitor-note to internal-notes so David sees it
  // when he opens the profile. Stack with existing internal-notes if present.
  const note = laymanNote(issues);
  if (/^internal-notes:/m.test(yaml)) {
    // Prepend to existing string value
    yaml = yaml.replace(/^internal-notes:\s*"([\s\S]*?)"(?=\r?\n[a-z-]+:|\r?\n*$)/m, (m, prev) => {
      const combined = `${note}\n\n${prev}`.replace(/"/g, "'");
      return `internal-notes: "${combined}"`;
    });
    // If not a string-quoted value, fall through (rare edge case)
  } else {
    const quoted = note.replace(/"/g, "'");
    yaml = yaml.trimEnd() + `\ninternal-notes: "${quoted}"`;
  }

  const newContent = match[1] + yaml + match[3] + content.slice(match[0].length);
  fs.writeFileSync(filePath, newContent, 'utf-8');
  return { changed: true };
}

// ─── Report Writer ──────────────────────────────────────────────

function writeReport(findings, totals) {
  const lines = [];
  lines.push('---');
  lines.push('title: Pipeline Janitor Report');
  lines.push('type: admin-note');
  lines.push('note-type: data');
  lines.push('priority: normal');
  lines.push('status: open');
  lines.push(`last-updated: '${new Date().toISOString().slice(0, 10)}'`);
  lines.push('generated-by: scripts/pipeline-janitor.cjs');
  lines.push('---');
  lines.push('');
  lines.push('# Pipeline Janitor Report');
  lines.push('');
  lines.push(`Generated: ${new Date().toISOString()}`);
  lines.push(`Mode: ${WRITE ? '**WRITE** (applied fixes)' : 'DRY RUN (report only)'}`);
  lines.push('');

  // ─── Pipeline Status Banner ───────────────────────────────────
  if (PIPELINE_STATUS.paused) {
    lines.push('## Pipeline Status');
    lines.push('');
    lines.push(`**API pipelines paused since ${PIPELINE_STATUS.since}** (${PIPELINE_STATUS.pausedWorkflows.length} workflows disabled — see \`data/enrichment-state.json\`).`);
    lines.push('');
    lines.push('Findings below are split into three buckets:');
    lines.push('- **Fixable now** — CSV-bulk fallback exists, run the listed command');
    lines.push('- **Blocked on paused pipeline** — no local fallback; defer or resume Actions');
    lines.push('- **Editorial / advisory** — A+ findings that require David or Research Claude (never auto-demote per ADR-0025)');
    lines.push('');
  }

  lines.push('## Summary');
  lines.push('');
  lines.push(`- Profiles scanned: ${totals.scanned}`);
  lines.push(`- Profiles at ready/verified audited: ${totals.audited}`);
  lines.push(`- Profiles with issues: **${findings.length}**`);
  lines.push(`- Total issues: ${findings.reduce((s, f) => s + f.issues.length, 0)}`);
  lines.push('');

  // Tally by category and by kind-within-category
  const byCategory = { 'fixable-now': 0, 'blocked-paused': 0, 'editorial-advisory': 0 };
  const byKindCategory = {}; // kind -> { fixable-now, blocked-paused, editorial-advisory }
  for (const f of findings) {
    for (const i of f.issues) {
      const cat = categorizeIssue(i);
      byCategory[cat] = (byCategory[cat] || 0) + 1;
      if (!byKindCategory[i.kind]) byKindCategory[i.kind] = { 'fixable-now': 0, 'blocked-paused': 0, 'editorial-advisory': 0 };
      byKindCategory[i.kind][cat]++;
    }
  }

  lines.push('### By category');
  lines.push('');
  lines.push(`- Fixable now (CSV bulk or demote): **${byCategory['fixable-now']}**`);
  lines.push(`- Blocked on paused pipeline: **${byCategory['blocked-paused']}**`);
  lines.push(`- Editorial / advisory (no auto-fix): **${byCategory['editorial-advisory']}**`);
  lines.push('');

  lines.push('### By issue kind');
  lines.push('');
  const kindTotals = Object.entries(byKindCategory)
    .map(([k, v]) => [k, v['fixable-now'] + v['blocked-paused'] + v['editorial-advisory'], v])
    .sort((a, b) => b[1] - a[1]);
  for (const [kind, total, breakdown] of kindTotals) {
    const bd = [];
    if (breakdown['fixable-now']) bd.push(`${breakdown['fixable-now']} fixable-now`);
    if (breakdown['blocked-paused']) bd.push(`${breakdown['blocked-paused']} blocked`);
    if (breakdown['editorial-advisory']) bd.push(`${breakdown['editorial-advisory']} advisory`);
    lines.push(`- \`${kind}\`: ${total} (${bd.join(', ')})`);
  }
  lines.push('');

  // ─── Findings, grouped by category ─────────────────────────────
  // Profiles can have issues across multiple categories. Sort each profile
  // into its highest-priority category: fixable-now > blocked-paused > advisory.
  // (Higher priority = more actionable; David sees what to do first.)
  function profileCategory(f) {
    const cats = new Set(f.issues.map(categorizeIssue));
    if (cats.has('fixable-now')) return 'fixable-now';
    if (cats.has('blocked-paused')) return 'blocked-paused';
    return 'editorial-advisory';
  }

  const groups = {
    'fixable-now': [],
    'blocked-paused': [],
    'editorial-advisory': [],
  };
  for (const f of findings) groups[profileCategory(f)].push(f);

  const groupHeaders = {
    'fixable-now': '## Findings — Fixable Now',
    'blocked-paused': '## Findings — Blocked on Paused Pipeline',
    'editorial-advisory': '## Findings — Editorial / Advisory',
  };
  const groupBlurbs = {
    'fixable-now': 'Each issue lists the exact command. Run them, then re-run `node scripts/pipeline-janitor.cjs` to clear.',
    'blocked-paused': 'These can\'t be auto-fixed during the CSV-only freeze. Either resume the relevant GitHub Actions workflow, or accept a demote via `--write`.',
    'editorial-advisory': 'A+ findings — David or Research Claude action required. Never auto-demoted (ADR-0025).',
  };

  for (const cat of ['fixable-now', 'blocked-paused', 'editorial-advisory']) {
    if (groups[cat].length === 0) continue;
    lines.push(groupHeaders[cat]);
    lines.push('');
    lines.push(`_${groupBlurbs[cat]}_`);
    lines.push('');
    for (const f of groups[cat].sort((a, b) => b.issues.length - a.issues.length)) {
      const rel = path.relative(CONTENT_DIR, f.filePath).replace(/\\/g, '/');
      lines.push(`### ${f.title}`);
      lines.push('');
      lines.push(`- **Path:** \`${rel}\``);
      lines.push(`- **Current readiness:** \`${f.readiness}\``);
      lines.push(`- **Type:** \`${f.type}\``);
      lines.push(`- **Issues (${f.issues.length}):**`);
      for (const i of f.issues) {
        lines.push(`  - \`${i.kind}\` — ${i.detail} → **${i.fix}**`);
      }
      lines.push('');
    }
  }

  fs.mkdirSync(path.dirname(REPORT_PATH), { recursive: true });
  fs.writeFileSync(REPORT_PATH, lines.join('\n'), 'utf-8');
  console.log(`\nReport written: ${path.relative(process.cwd(), REPORT_PATH)}`);
}

// ─── Main ───────────────────────────────────────────────────────

// ─── Cohort analysis (plan Step 5) ────────────────────────────────
// Runs when --cohort is passed. Computes two whole-vault signals that
// can't be calculated from a single profile in isolation:
//   1. anomaly-flags — outliers vs type/chamber cohort median
//   2. cross-vault-triangulation-count — connections that also appear
//      in 2+ other unrelated vault profiles
//
// These get stamped into frontmatter (with --write) so the VaultGrid
// can read them cheaply without running the cohort scan per card.

function loadAllProfiles(files) {
  const all = [];
  for (const f of files) {
    try {
      const content = fs.readFileSync(f, 'utf-8');
      const { data } = parseFrontmatter(content);
      if (data && data.title) {
        all.push({ filePath: f, data, content });
      }
    } catch {}
  }
  return all;
}

function computeAnomalyFlags(profile, cohort) {
  const flags = [];
  const parseAmount = (s) => {
    if (!s) return 0;
    const n = parseFloat(String(s).replace(/[^0-9.]/g, ''));
    return isNaN(n) ? 0 : n;
  };
  const myTotal = parseAmount(profile.data['total-received'] || profile.data['total-raised']);
  if (myTotal > 0 && cohort.length >= 5) {
    const cohortTotals = cohort
      .map(p => parseAmount(p.data['total-received'] || p.data['total-raised']))
      .filter(n => n > 0)
      .sort((a, b) => a - b);
    if (cohortTotals.length >= 3) {
      const median = cohortTotals[Math.floor(cohortTotals.length / 2)];
      if (median > 0 && myTotal >= 3 * median) {
        flags.push(`total-received-${Math.round(myTotal / median)}x-cohort-median`);
      }
    }
  }
  // Unusual committee count
  const committees = profile.data.committees;
  const committeeCount = Array.isArray(committees) ? committees.length : (committees ? 1 : 0);
  if (committeeCount >= 5) flags.push(`unusually-many-committees-${committeeCount}`);
  return flags;
}

function computeTriangulationCount(profile, allProfiles, byEntity) {
  const related = profile.data.related;
  if (!related) return 0;
  const entities = normalizeRelatedList(related);
  let count = 0;
  for (const e of entities) {
    const key = e.toLowerCase().trim();
    const profilesReferencing = byEntity.get(key);
    // Triangulation: entity is referenced by 2+ OTHER unrelated profiles
    if (profilesReferencing && profilesReferencing.size >= 3) count++;
  }
  return count;
}

function normalizeRelatedList(field) {
  if (!field) return [];
  if (Array.isArray(field)) return field.map(String);
  if (typeof field !== 'string') return [];
  const matches = field.match(/\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g);
  if (matches) {
    return matches.map(m => m.replace(/^\[\[/, '').replace(/\]\]$/, '').split('|')[0]);
  }
  return [];
}

// Build entity→profilePaths index for triangulation scoring
function buildEntityIndex(allProfiles) {
  const byEntity = new Map();
  for (const p of allProfiles) {
    const related = p.data.related;
    const entities = normalizeRelatedList(related);
    for (const e of entities) {
      const key = e.toLowerCase().trim();
      if (!byEntity.has(key)) byEntity.set(key, new Set());
      byEntity.get(key).add(p.filePath);
    }
  }
  return byEntity;
}

// Stamp A+ audit passed + cohort metrics into frontmatter
function stampAuditFields(filePath, content, updates) {
  const match = content.match(/^(---\r?\n)([\s\S]*?)(\r?\n---)/);
  if (!match) return { changed: false };
  let yaml = match[2];
  for (const [key, value] of Object.entries(updates)) {
    if (value === null || value === undefined) continue;
    const line = Array.isArray(value)
      ? `${key}:\n${value.map(v => `  - "${v}"`).join('\n')}`
      : typeof value === 'boolean' || typeof value === 'number'
        ? `${key}: ${value}`
        : `${key}: "${value}"`;
    const re = new RegExp(`^${key}:.*(?:\\r?\\n[ \\t]{2,}[^\\n]*)*`, 'm');
    if (re.test(yaml)) {
      yaml = yaml.replace(re, line);
    } else {
      yaml = yaml.trimEnd() + '\n' + line;
    }
  }
  const newContent = match[1] + yaml + match[3] + content.slice(match[0].length);
  fs.writeFileSync(filePath, newContent, 'utf-8');
  return { changed: true };
}

function main() {
  console.log('═══════════════════════════════════════════════════');
  console.log('  Pipeline Janitor — Data Integrity Audit');
  console.log('═══════════════════════════════════════════════════');
  console.log(`  Mode: ${WRITE ? 'WRITE' : 'DRY RUN'}`);
  console.log(`  Scope: pipeline data only (no URLs, no wikilinks)`);
  if (RUN_A_PLUS_AUDIT) console.log(`  A+ audit: ENABLED (--tier=${TIER_FILTER})`);
  if (RUN_COHORT_CHECKS) console.log(`  Cohort checks: ENABLED (--cohort)`);
  console.log('');

  const files = walkDir(CONTENT_DIR, '.md');
  const findings = [];
  const totals = { scanned: 0, audited: 0, fixed: 0, stamped: 0, cohortFlagged: 0 };

  // Pre-load all profiles for cohort analysis (only if --cohort is set)
  let allProfiles = null;
  let entityIndex = null;
  let cohortsByType = null;
  if (RUN_COHORT_CHECKS) {
    console.log('  Loading all profiles for cohort analysis...');
    allProfiles = loadAllProfiles(files);
    entityIndex = buildEntityIndex(allProfiles);
    // Bucket by type+chamber for median calculations
    cohortsByType = new Map();
    for (const p of allProfiles) {
      const key = `${p.data.type || 'unknown'}:${p.data.chamber || 'none'}`;
      if (!cohortsByType.has(key)) cohortsByType.set(key, []);
      cohortsByType.get(key).push(p);
    }
    console.log(`  Loaded ${allProfiles.length} profiles, ${entityIndex.size} unique entities`);
    console.log('');
  }

  for (const filePath of files) {
    totals.scanned++;
    let content;
    try { content = fs.readFileSync(filePath, 'utf-8'); } catch { continue; }

    const result = auditProfile(filePath, content);
    if (result.skipped) continue;
    totals.audited++;

    // Filter to zombies only if requested — the clearest, safest cases
    let issues = result.issues || [];
    if (ZOMBIES_ONLY) {
      issues = issues.filter(i => i.kind === 'zombie-block' || i.kind === 'known-gap-pipeline' || i.kind === 'internal-notes-pipeline');
    }

    const { data: preData } = parseFrontmatter(content);

    // Cohort stamping (runs before self-healing so cohort metrics are always fresh)
    if (RUN_COHORT_CHECKS && allProfiles) {
      const key = `${preData.type || 'unknown'}:${preData.chamber || 'none'}`;
      const cohort = (cohortsByType.get(key) || []).filter(p => p.filePath !== filePath);
      const anomalyFlags = computeAnomalyFlags({ filePath, data: preData }, cohort);
      const triangulationCount = computeTriangulationCount({ filePath, data: preData }, allProfiles, entityIndex);
      if (WRITE) {
        const stampUpdates = {
          'cross-vault-triangulation-count': triangulationCount,
        };
        if (anomalyFlags.length > 0) stampUpdates['anomaly-flags'] = anomalyFlags;
        stampAuditFields(filePath, content, stampUpdates);
        content = fs.readFileSync(filePath, 'utf-8'); // reload for subsequent writes
        if (anomalyFlags.length > 0) totals.cohortFlagged++;
      }
    }

    // A+ audit stamp: if --tier=a-plus and profile has NO A+ failures, stamp the passed date
    if (RUN_A_PLUS_AUDIT && WRITE) {
      const aPlusFailures = issues.filter(i => i.kind && i.kind.startsWith('a-plus-'));
      const hasOtherBlockers = issues.filter(i => i.kind === 'zombie-block' || i.kind === 'missing-block' || i.kind === 'never-enriched').length > 0;
      if (aPlusFailures.length === 0 && !hasOtherBlockers && preData['content-readiness'] === 'ready') {
        const today = new Date().toISOString().slice(0, 10);
        stampAuditFields(filePath, content, { 'audit-a-plus-passed': today });
        content = fs.readFileSync(filePath, 'utf-8');
        totals.stamped++;
      }
    }

    // Self-healing pass: if a previously-flagged profile has no issues anymore,
    // clear the flag so the pipeline stops reprocessing it. This runs regardless
    // of --zombies-only because flag-clearing is always safe.
    if (issues.length === 0 && preData['needs-reenrichment'] === true) {
      if (WRITE) clearReenrichFlag(filePath, content);
      totals.cleared = (totals.cleared || 0) + 1;
    }

    if (issues.length > 0) {
      const { data } = parseFrontmatter(content);
      const mechanicalOnly = issues.filter((i) => MECHANICAL_DEMOTE_KINDS.has(i.kind));
      const advisoryOnly = issues.filter((i) => !MECHANICAL_DEMOTE_KINDS.has(i.kind));
      findings.push({
        filePath,
        title: data.title || path.basename(filePath, '.md'),
        readiness: result.readiness,
        type: result.type,
        issues,
        mechanical_count: mechanicalOnly.length,
        advisory_count: advisoryOnly.length,
      });

      // Per ADR-0025: only demote on mechanical issues. Advisory
      // (a-plus-*) issues surface for editorial review but don't
      // trigger automatic demotion.
      if (WRITE && mechanicalOnly.length > 0) {
        const { changed } = applyFix(filePath, content, mechanicalOnly);
        if (changed) totals.fixed++;
      } else if (WRITE && advisoryOnly.length > 0) {
        totals.advisorySkipped = (totals.advisorySkipped || 0) + 1;
      }
    }
  }

  const mechanicalFindings = findings.filter((f) => f.mechanical_count > 0).length;
  const advisoryFindings = findings.filter((f) => f.mechanical_count === 0 && f.advisory_count > 0).length;
  console.log(`  Scanned: ${totals.scanned} profiles`);
  console.log(`  Audited (ready/verified): ${totals.audited}`);
  console.log(`  With issues: ${findings.length}  (mechanical: ${mechanicalFindings}, advisory-only: ${advisoryFindings})`);
  if (WRITE) console.log(`  Demoted (mechanical issues): ${totals.fixed}`);
  if (WRITE && totals.advisorySkipped) console.log(`  Skipped demote (advisory-only, per ADR-0025): ${totals.advisorySkipped}`);
  if (WRITE && totals.stamped) console.log(`  Stamped audit-a-plus-passed: ${totals.stamped}`);
  if (WRITE && totals.cohortFlagged) console.log(`  Cohort anomaly-flagged: ${totals.cohortFlagged}`);
  if (WRITE && totals.cleared) console.log(`  Self-healed (cleared reenrich flag): ${totals.cleared}`);
  console.log('');

  if (findings.length > 0) {
    const byKind = {};
    for (const f of findings) {
      for (const i of f.issues) byKind[i.kind] = (byKind[i.kind] || 0) + 1;
    }
    console.log('  By issue kind:');
    for (const [k, v] of Object.entries(byKind).sort((a, b) => b[1] - a[1])) {
      console.log(`    ${k.padEnd(26)} ${v}`);
    }
  }

  writeReport(findings, totals);

  if (!WRITE && findings.length > 0) {
    console.log('\n  Dry run complete. Run with --write to apply fixes.');
  }
}

main();
