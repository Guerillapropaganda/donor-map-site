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
const EXPECTED_BLOCKS = {
  politician: [
    { group: 'fec', patterns: ['auto:fec-politician', 'auto:fec-fundraising'], key: 'fec-candidate-id' },
    { group: 'voting',  patterns: ['auto:govtrack', 'auto:voting-record'],      key: 'govtrack-id' },
    { group: 'congress', patterns: ['auto:congress', 'auto:committee-assignments', 'auto:committee'], key: 'bioguide-id' },
  ],
  donor: [
    { group: 'fec', patterns: ['auto:fec-donor', 'auto:fec'], key: 'fec-committee-id' },
  ],
  corporation: [
    { group: 'lda', patterns: ['auto:lda-lobbying'], key: null },
  ],
  'lobbying-firm': [
    { group: 'lda', patterns: ['auto:lda-lobbying'], key: null },
  ],
  pac: [
    { group: 'fec', patterns: ['auto:fec'], key: null },
  ],
};

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
          fix: `re-run ${group.group} pipeline`,
        });
      }

      // Ready profile missing expected block entirely (no key, no block)
      // Only flag if readiness is `ready` (not verified — those may have custom content)
      if (!hasBlock && !hasKey && readiness === 'ready') {
        issues.push({
          kind: 'missing-block',
          detail: `no ${group.group} pipeline data (no key, no block)`,
          fix: `run ${group.group} pipeline`,
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
  if (RUN_A_PLUS_AUDIT && type === 'politician') {
    // A+ Tier A: committee-relevant regulatory cross-ref
    const requiredPipelines = getRequiredPipelinesForCommittees(data.committees);
    if (requiredPipelines.length > 0) {
      const missing = requiredPipelines.filter(p => !hasAutoBlock(body, p));
      if (missing.length > 0) {
        const reasons = getRequirementReasons(data.committees);
        const reasonText = reasons.map(r => r.reason).join(' ');
        issues.push({
          kind: 'a-plus-committee-cross-ref',
          detail: `missing committee-relevant pipelines: ${missing.join(', ')}. ${reasonText}`,
          fix: `run pipelines: ${missing.join(', ')}`,
        });
      }
    }

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
  lines.push('## Summary');
  lines.push('');
  lines.push(`- Profiles scanned: ${totals.scanned}`);
  lines.push(`- Profiles at ready/verified audited: ${totals.audited}`);
  lines.push(`- Profiles with issues: **${findings.length}**`);
  lines.push(`- Total issues: ${findings.reduce((s, f) => s + f.issues.length, 0)}`);
  lines.push('');
  lines.push('### By issue kind');
  lines.push('');
  const byKind = {};
  for (const f of findings) {
    for (const i of f.issues) {
      byKind[i.kind] = (byKind[i.kind] || 0) + 1;
    }
  }
  for (const [kind, count] of Object.entries(byKind).sort((a, b) => b[1] - a[1])) {
    lines.push(`- \`${kind}\`: ${count}`);
  }
  lines.push('');
  lines.push('## Findings');
  lines.push('');
  for (const f of findings.sort((a, b) => b.issues.length - a.issues.length)) {
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
      findings.push({
        filePath,
        title: data.title || path.basename(filePath, '.md'),
        readiness: result.readiness,
        type: result.type,
        issues,
      });

      if (WRITE) {
        const { changed } = applyFix(filePath, content, issues);
        if (changed) totals.fixed++;
      }
    }
  }

  console.log(`  Scanned: ${totals.scanned} profiles`);
  console.log(`  Audited (ready/verified): ${totals.audited}`);
  console.log(`  With issues: ${findings.length}`);
  if (WRITE) console.log(`  Demoted: ${totals.fixed}`);
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
