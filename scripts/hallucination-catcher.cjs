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

const CONTENT_DIR = process.env.CONTENT_DIR || path.join(__dirname, '..', 'content');
const WRITE = process.argv.includes('--write');
const SOURCE_NAME = 'hallucination-catcher';

// Patterns that signal a factual claim
const CLAIM_PATTERNS = [
  {
    name: 'dollar-amount',
    regex: /\$\s*\d[\d,.]*\s*(million|billion|thousand|m\b|b\b|k\b)/gi,
    severity: 'high',
  },
  {
    name: 'percentage',
    regex: /\b\d+(\.\d+)?\s*%/g,
    severity: 'medium',
  },
  {
    name: 'year-action',
    // Year 2010-2030 paired with an action verb within 30 characters
    regex: /\b(201\d|202\d|203\d)[^.]{0,80}\b(voted|gave|received|donated|contributed|spent|raised|passed|blocked|sponsored)\b/gi,
    severity: 'medium',
  },
  {
    name: 'bill-reference',
    regex: /\b(H\.?R\.?|S\.?)\s*\d{1,5}\b/g,
    severity: 'low',
  },
  {
    name: 'multiplier',
    regex: /\b\d+(\.\d+)?\s*(x|times|fold)\s+(more|higher|greater|less|fewer)/gi,
    severity: 'medium',
  },
];

function hasLinkInParagraph(paragraph) {
  return /\[[^\]]+\]\(https?:\/\/[^)]+\)/.test(paragraph);
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
  const exemptSections = [/^Sources/i, /^Class Analysis/i, /^Related/i];
  if (exemptSections.some((re) => re.test(paragraph.section))) return [];
  // Exempt tables (they're usually citation lists themselves, not prose claims)
  if (paragraph.text.trim().startsWith('|')) return [];
  if (hasLinkInParagraph(paragraph.text)) return [];

  const findings = [];
  for (const pattern of CLAIM_PATTERNS) {
    const matches = paragraph.text.matchAll(pattern.regex);
    for (const m of matches) {
      findings.push({
        pattern: pattern.name,
        severity: pattern.severity,
        claim: m[0],
        context: paragraph.text.slice(Math.max(0, m.index - 40), (m.index || 0) + m[0].length + 60).replace(/\s+/g, ' '),
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

    // Skip admin notes, sub-notes, stories, events
    const skipTypes = ['admin-note', 'sub-note', 'story', 'event', 'daily-update', 'digest', 'reference', 'methodology', 'system', 'page', 'index'];
    if (skipTypes.includes(data.type)) continue;

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
