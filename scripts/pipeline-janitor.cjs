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

// ─── Config ────────────────────────────────────────────────────

const CONTENT_DIR = process.env.CONTENT_DIR || path.join(__dirname, '..', 'content');
const REPORT_PATH = path.join(CONTENT_DIR, 'Admin Notes', 'pipeline-janitor-report.md');
const WRITE = process.argv.includes('--write');
const VERBOSE = process.argv.includes('--verbose');
const ZOMBIES_ONLY = process.argv.includes('--zombies-only');
const TYPE_FILTER = (process.argv.find(a => a.startsWith('--type=')) || '').split('=')[1] || null;
// --tier=a-plus adds the A+ audit layer on top of the zombie/missing-block
// checks. Dry-run only for now (plan Step 3). Writes will come in Step 4.
const TIER_FILTER = (process.argv.find(a => a.startsWith('--tier=')) || '').split('=')[1] || null;
const RUN_A_PLUS_AUDIT = TIER_FILTER === 'a-plus' || TIER_FILTER === 's';

// Types that don't require federal pipeline enrichment — never audit these
// for missing Congress.gov / GovTrack / Committee auto-blocks. A media figure
// who was once a politician is still rare enough to handle manually via the
// N/A buttons in the Ops app.
//
// state-politician and local-politician are exempt because the federal
// pipelines (Congress.gov, GovTrack, Committee) legitimately don't apply to
// state governors, state legislators, mayors, etc. They may still have
// fec-candidate-id if they've filed for federal office — that's fine, FEC
// pipeline runs on them normally. See Vault Rules § "Politician type
// taxonomy" for the full three-tier rule (added 2026-04-11).
const EXEMPT_TYPES = new Set([
  'media-profile', 'think-tank', 'story', 'event', 'sub-note',
  'daily-update', 'reference', 'methodology', 'system', 'page',
  'index', 'digest', 'admin-note',
  'state-politician', 'local-politician',
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

function main() {
  console.log('═══════════════════════════════════════════════════');
  console.log('  Pipeline Janitor — Data Integrity Audit');
  console.log('═══════════════════════════════════════════════════');
  console.log(`  Mode: ${WRITE ? 'WRITE' : 'DRY RUN'}`);
  console.log(`  Scope: pipeline data only (no URLs, no wikilinks)`);
  console.log('');

  const files = walkDir(CONTENT_DIR, '.md');
  const findings = [];
  const totals = { scanned: 0, audited: 0, fixed: 0 };

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

    // Self-healing pass: if a previously-flagged profile has no issues anymore,
    // clear the flag so the pipeline stops reprocessing it. This runs regardless
    // of --zombies-only because flag-clearing is always safe.
    const { data: preData } = parseFrontmatter(content);
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
