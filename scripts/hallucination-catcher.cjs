#!/usr/bin/env node
/**
 * hallucination-catcher.cjs — finds unsupported factual claims
 *
 * Walks every profile body and looks for specific factual claims
 * (dollar amounts, vote totals, dates, bill numbers, percentages).
 * For each claim, checks whether the enclosing paragraph has at least
 * one source link. Unsourced claims get flagged.
 *
 * Rules:
 *   - "$N million/billion" — dollar claims need citation in the same paragraph
 *   - "Nx more" — comparative claims need citation
 *   - "N% of" — statistical claims need citation
 *   - A specific year (2016, 2020, 2024) paired with an action verb
 *     (voted, gave, received, donated) — needs citation
 *   - A "Roll Call X-Y-Z" or "H.R. NNNN" reference — needs citation
 *
 * Exemptions:
 *   - Claims inside blockquotes (primary-source quotes are self-citing)
 *   - Claims inside auto-blocks (<!-- auto:X -->)
 *   - Claims inside the `## Sources` or `## Class Analysis` sections
 *     (class analysis is interpretive; sources is where citations live)
 *
 * Output: contributes entries to the Attention Queue
 *   Blocking: unsupported claims in verified or s-tier profiles
 *   Deciding: unsupported claims in ready profiles
 *   (draft profiles are not audited — they're work-in-progress)
 *
 * Integration: the self-review-mirror pre-commit hook can call this
 * on staged files to block ship of fresh unsupported claims.
 *
 * Usage:
 *   node scripts/hallucination-catcher.cjs
 *   node scripts/hallucination-catcher.cjs --write    # stamp flags into frontmatter
 */
const fs = require('fs');
const path = require('path');
const { walkDir, parseFrontmatter } = require('./lib/shared.cjs');
const { addEntries, clearSource } = require('./lib/attention-queue.cjs');
const { getRejectedPatterns } = require('./lib/false-positive-log.cjs');
const { isHallucinationScanned } = require('./lib/profile-type-rulebook.cjs');

const CONTENT_DIR = process.env.CONTENT_DIR || path.join(__dirname, '..', 'content');
const WRITE = process.argv.includes('--write');
const SOURCE_NAME = 'hallucination-catcher';

// Verbs that turn a number into an actual claim needing a citation.
// "Koch gave $500 million" is a claim. "The $500 million threshold" is not.
const CLAIM_VERBS =
  '(paid|spent|donated|gave|contributed|received|raised|funneled|committed|pledged|bundled|wrote|invested|channel(ed|led)?|routed|transferred|funded|bankrolled|poured|backed|sank|deposited|laundered|concealed|reported|disclosed|earned|collected|lost)';
const CLAIM_VERB_RE = new RegExp(`\\b${CLAIM_VERBS}\\b`, 'i');

// Patterns that signal a factual claim. Each one MUST be paired with a
// verb or a contextual noun to count — bare numbers are not flagged.
const CLAIM_PATTERNS = [
  {
    name: 'dollar-amount',
    // "$500 million" / "$2.3B" etc. — Only flagged if a claim verb appears
    // within 80 chars of the match (checked post-hoc in scanParagraph).
    regex: /\$\s*\d[\d,.]*\s*(million|billion|thousand|m\b|b\b|k\b)/gi,
    severity: 'high',
    requiresVerbNearby: true,
  },
  {
    name: 'percentage',
    // "80% of voters" / "a 12% increase" — the percentage MUST be followed
    // by "of <word>" or preceded by a contextual noun. Bare "80%" is ignored.
    regex: /\b\d+(\.\d+)?\s*%\s+(of|increase|decrease|growth|decline|margin|share|drop|rise|jump|cut|gain|loss)\b/gi,
    severity: 'medium',
    requiresVerbNearby: false,
  },
  {
    name: 'year-action',
    // Year 2010-2030 paired with an action verb within 80 characters.
    regex: /\b(201\d|202\d|203\d)[^.]{0,80}\b(voted|gave|received|donated|contributed|spent|raised|passed|blocked|sponsored|introduced|signed|vetoed)\b/gi,
    severity: 'medium',
    requiresVerbNearby: false,
  },
  {
    name: 'multiplier',
    // "3x more" / "twice as much"
    regex: /\b\d+(\.\d+)?\s*(x|times|fold)\s+(more|higher|greater|less|fewer)/gi,
    severity: 'medium',
    requiresVerbNearby: false,
  },
];
// Note: bill-reference ("H.R. 3755") was dropped — bill numbers are self-
// citing and don't need a separate source link.

// A claim is considered cited if any of these appear within 150 chars of the
// match: an inline markdown link `](http`, a footnote ref `[^N]`, or a named
// citation like `[cite]`. Same-paragraph is no longer enough — proximity is.
const CITATION_PROXIMITY = 150;
function isCitedNear(paragraphText, matchIndex, matchLength) {
  const start = Math.max(0, matchIndex - CITATION_PROXIMITY);
  const end = Math.min(paragraphText.length, matchIndex + matchLength + CITATION_PROXIMITY);
  const window = paragraphText.slice(start, end);
  if (/\]\(https?:\/\//.test(window)) return true;
  if (/\[\^\w[\w-]*\]/.test(window)) return true;
  if (/\[cite[^\]]*\]/i.test(window)) return true;
  return false;
}

function hasVerbNear(paragraphText, matchIndex, matchLength) {
  const start = Math.max(0, matchIndex - 80);
  const end = Math.min(paragraphText.length, matchIndex + matchLength + 80);
  return CLAIM_VERB_RE.test(paragraphText.slice(start, end));
}

function splitIntoParagraphs(body) {
  // Split on blank lines but preserve relative position so we can ignore
  // blockquotes, auto-blocks, and section headers.
  const lines = body.split(/\r?\n/);
  const paragraphs = [];
  let current = { text: '', section: '', inBlockquote: false, inAutoBlock: false };
  let section = '';
  let inAutoBlock = false;

  function flush() {
    if (current.text.trim()) {
      paragraphs.push({ ...current, section });
    }
    current = { text: '', section: '', inBlockquote: false, inAutoBlock };
  }

  for (const line of lines) {
    // Track section headers
    const headerMatch = line.match(/^##\s+(.+)$/);
    if (headerMatch) {
      flush();
      section = headerMatch[1].trim();
      continue;
    }
    // Track auto-block boundaries
    if (/<!--\s*auto:[\w-]+\s*start/.test(line)) {
      flush();
      inAutoBlock = true;
      continue;
    }
    if (/<!--\s*auto:[\w-]+\s*end/.test(line)) {
      inAutoBlock = false;
      flush();
      continue;
    }
    if (inAutoBlock) continue;

    // Blank line = paragraph break
    if (!line.trim()) {
      flush();
      continue;
    }
    // Track blockquotes
    const isBlockquote = /^\s*>/.test(line);
    if (isBlockquote) current.inBlockquote = true;
    current.text += (current.text ? '\n' : '') + line;
  }
  flush();
  return paragraphs;
}

function scanParagraph(paragraph) {
  if (paragraph.inBlockquote) return [];
  // Exempt sections: Class Analysis is interpretive, Sources is where citations live
  const exemptSections = [
    /^Sources/i,
    /^Class Analysis/i,
    /^Related/i,
    /^References/i,
    /^Citations/i,
    /^Notes/i,
  ];
  if (exemptSections.some((re) => re.test(paragraph.section))) return [];
  // Exempt tables — they're reference structures, not prose claims
  if (paragraph.text.trim().startsWith('|')) return [];
  // Exempt bullet lists — usually structured data, not narrative claims
  if (/^\s*[-*]\s/.test(paragraph.text.trim())) return [];

  const findings = [];
  for (const pattern of CLAIM_PATTERNS) {
    const matches = Array.from(paragraph.text.matchAll(pattern.regex));
    for (const m of matches) {
      const matchIdx = m.index || 0;
      const matchLen = m[0].length;
      // Per-claim citation check (proximity, not whole-paragraph)
      if (isCitedNear(paragraph.text, matchIdx, matchLen)) continue;
      // Verb-nearby check when the pattern requires it
      if (pattern.requiresVerbNearby && !hasVerbNear(paragraph.text, matchIdx, matchLen)) {
        continue;
      }
      findings.push({
        pattern: pattern.name,
        severity: pattern.severity,
        claim: m[0],
        context: paragraph.text
          .slice(Math.max(0, matchIdx - 40), matchIdx + matchLen + 60)
          .replace(/\s+/g, ' '),
        section: paragraph.section || '(no section)',
      });
    }
  }
  return findings;
}

function main() {
  const files = walkDir(CONTENT_DIR, '.md');
  const rejected = getRejectedPatterns(SOURCE_NAME);
  const findings = [];

  for (const f of files) {
    let content;
    try {
      content = fs.readFileSync(f, 'utf-8');
    } catch {
      continue;
    }
    const { data, body } = parseFrontmatter(content);
    if (!data || !data.title) continue;

    // Skip drafts and raw — they're not ready for this level of scrutiny
    const readiness = data['content-readiness'];
    if (readiness !== 'ready' && readiness !== 'verified' && readiness !== 's-tier') continue;

    // Rulebook-driven: skip types marked hallucination-scanned:false in the
    // rulebook (event, meta and all meta sub-categories). IMPORTANT CHANGE
    // from the old hardcoded skipTypes: `story` was previously excluded here
    // and is NOW INCLUDED by the rulebook. Stories are supposed to be the
    // hallucination-catcher's primary target because the "every-claim-sourced"
    // check is the hard gate for story verification.
    if (!isHallucinationScanned(data.type)) continue;

    // Editor-vouched escape hatch. Profiles with `editor-vouched: true` in
    // their frontmatter are skipped — the author is explicitly vouching that
    // every claim is supported by the aggregated Sources section at the
    // bottom, even though no claim has an inline citation within the 150-char
    // proximity window. This exists for:
    //   - Editorial long-form stories that cite sources at the end (standard
    //     magazine format) rather than scattering [links](inline) throughout
    //   - Synthesis profiles that summarize already-cited Master Profiles
    //     and link to them via wikilinks
    //   - Opinion / analytical framings that reference the underlying data
    //     profiles by wikilink rather than duplicating every URL
    // DO NOT set this flag on a profile with unsupported original claims —
    // the pre-commit self-review-mirror and manual review should still catch
    // anything genuinely fabricated. The flag means "these claims are
    // sourced; the proximity heuristic is wrong about this file", not "these
    // claims don't need sources."
    // shared.cjs's parseFrontmatter returns strings for YAML scalars, so a
    // YAML `true` comes through as the string "true". Check both forms.
    const vouched = data['editor-vouched'];
    if (vouched === true || String(vouched).toLowerCase() === 'true') continue;

    const paragraphs = splitIntoParagraphs(body);
    const unsupported = [];
    for (const p of paragraphs) {
      const hits = scanParagraph(p);
      for (const h of hits) {
        // Pattern key for false-positive log dedup: profile + claim prefix
        const patternKey = `${data.title}:${h.claim.slice(0, 40)}`;
        if (rejected.has(patternKey)) continue;
        unsupported.push({ ...h, patternKey });
      }
    }

    if (unsupported.length > 0) {
      findings.push({
        file: f,
        title: data.title,
        type: data.type,
        readiness,
        unsupported,
      });
    }
  }

  // Sort: verified/s-tier profiles first, then by # of unsupported claims
  findings.sort((a, b) => {
    const aVerified = a.readiness === 'verified' || a.readiness === 's-tier';
    const bVerified = b.readiness === 'verified' || b.readiness === 's-tier';
    if (aVerified !== bVerified) return aVerified ? -1 : 1;
    return b.unsupported.length - a.unsupported.length;
  });

  // Build Attention Queue entries
  const entries = [];
  for (const f of findings.slice(0, 25)) {
    const isVerified = f.readiness === 'verified' || f.readiness === 's-tier';
    const bucket = isVerified ? 'blocking' : 'deciding';
    const rel = path.relative(CONTENT_DIR, f.file).split(path.sep).join('/');
    const firstClaim = f.unsupported[0];
    entries.push({
      bucket,
      what: `${f.title}: ${f.unsupported.length} unsupported claim${f.unsupported.length > 1 ? 's' : ''}`,
      why: `${isVerified ? 'Verified profile' : 'Ready profile'} has "${firstClaim.claim}" in the ${firstClaim.section} section with no source link in the same paragraph. ${isVerified ? 'This is a credibility risk — verified content needs every factual claim sourced.' : 'Needs a citation before promotion to A+.'}`,
      where: `content/${rel}`,
      cost_min: Math.min(15, 2 + f.unsupported.length),
      leverage: isVerified ? 5 : 3,
      source: SOURCE_NAME,
      metadata: { claimCount: f.unsupported.length, readiness: f.readiness },
    });
  }

  if (entries.length === 0) {
    clearSource(SOURCE_NAME);
    console.log('✓ Hallucination Catcher: no unsupported claims in verified/ready profiles.');
    console.log(`  Scanned ${files.length} files, ${findings.length} profiles had findings (all below ready threshold).`);
    return;
  }

  const count = addEntries(SOURCE_NAME, entries);
  console.log(`Hallucination Catcher flagged ${count} profile${count === 1 ? '' : 's'} with unsupported claims.`);
  console.log(`  Top result: ${findings[0].title} (${findings[0].unsupported.length} claims)`);
  console.log(`  Output: Attention Queue (${entries.filter(e => e.bucket === 'blocking').length} blocking, ${entries.filter(e => e.bucket === 'deciding').length} deciding)`);
}

main();
