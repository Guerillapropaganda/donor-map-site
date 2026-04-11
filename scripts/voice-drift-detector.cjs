#!/usr/bin/env node
/**
 * voice-drift-detector.cjs — keep profile voice aligned with David's
 *
 * How it works:
 *
 *   Step 1: build a voice baseline
 *     - Looks for content/Admin Notes/voice-sample.md first (hand-written
 *       500-word sample, the gold-standard target).
 *     - Falls back to auto-extraction from recent David-authored admin
 *       notes if no sample exists.
 *
 *   Step 2: compute a voice signature
 *     - avg sentence length
 *     - ratio of hedging words ("arguably", "seemingly", "perhaps",
 *       "somewhat", "likely", "possibly")
 *     - ratio of passive-voice constructions
 *     - em dash density (target: zero)
 *     - ratio of specific numbers (dollar amounts, percentages, counts)
 *     - banned AI vocabulary ("delve", "moreover", "tapestry", etc.)
 *
 *   Step 3: for each ready/verified/s-tier profile, compute the same
 *     signature for its body (excluding auto-blocks, tables, and
 *     blockquotes).
 *
 *   Step 4: compare. Profiles with a drift score above a threshold get
 *     flagged in the Attention Queue.
 *
 * Hard rules (blocking, independent of baseline):
 *   - Any em dash in body content → blocking
 *   - Any banned AI vocabulary → blocking
 *
 * These rules fire even if no baseline exists.
 *
 * Output: Attention Queue entries in the "blocking" or "deciding" buckets.
 *
 * Usage:
 *   node scripts/voice-drift-detector.cjs
 */
const fs = require('fs');
const path = require('path');
const { walkDir, parseFrontmatter } = require('./lib/shared.cjs');
const { addEntries, clearSource } = require('./lib/attention-queue.cjs');
const { getRejectedPatterns } = require('./lib/false-positive-log.cjs');

const CONTENT_DIR = process.env.CONTENT_DIR || path.join(__dirname, '..', 'content');
const SOURCE_NAME = 'voice-drift-detector';
const VOICE_SAMPLE_PATH = path.join(CONTENT_DIR, 'Admin Notes', 'voice-sample.md');

const HEDGING = /\b(arguably|seemingly|perhaps|somewhat|likely|possibly|it could be argued|it is worth noting|it should be noted|in some sense|in a way)\b/gi;
const BANNED_AI = [
  /\bdelve(s|d|ing)?\b/gi,
  /\bmoreover\b/gi,
  /\bfurthermore\b/gi,
  /\bit is important to note\b/gi,
  /\bplethora\b/gi,
  /\btapestry\b/gi,
  /\btestament to\b/gi,
  /\bnavigating the complexities\b/gi,
  /\bin the realm of\b/gi,
  /\bin the ever-evolving landscape\b/gi,
];
const BANNED_AI_LABELS = [
  '"delve" variants',
  '"moreover"',
  '"furthermore"',
  '"it is important to note"',
  '"plethora"',
  '"tapestry"',
  '"testament to"',
  '"navigating the complexities"',
  '"in the realm of"',
  '"ever-evolving landscape"',
];

function stripNonProse(body) {
  // Remove frontmatter (shouldn't be here but safe), auto-blocks, tables, and blockquotes
  let text = body;
  // Remove auto-blocks
  text = text.replace(/<!--\s*auto:[\w-]+\s*start[\s\S]*?<!--\s*auto:[\w-]+\s*end\s*-->/g, '');
  // Remove tables (lines starting with |)
  text = text.split(/\r?\n/).filter(l => !/^\s*\|/.test(l)).join('\n');
  // Remove blockquotes (lines starting with >)
  text = text.split(/\r?\n/).filter(l => !/^\s*>/.test(l)).join('\n');
  // Remove headings (they're not prose)
  text = text.split(/\r?\n/).filter(l => !/^\s*#+\s/.test(l)).join('\n');
  // Remove code fences
  text = text.replace(/```[\s\S]*?```/g, '');
  // Remove wikilinks and markdown links but keep display text
  text = text.replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (_, a, b) => b || a);
  text = text.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
  return text.trim();
}

function computeSignature(text) {
  const proseLen = text.length || 1;
  const sentences = text.split(/[.!?]+\s/).filter(s => s.trim().length > 5);
  const words = text.match(/\b[a-zA-Z']+\b/g) || [];
  const wordCount = words.length || 1;
  const avgSentenceLength = sentences.length > 0 ? wordCount / sentences.length : 0;

  const emDashCount = (text.match(/—/g) || []).length;
  const hedgingCount = (text.match(HEDGING) || []).length;
  const hedgingPer100Words = (hedgingCount / wordCount) * 100;

  // Passive voice: "was/were/is/are/been/being X-ed" — rough but useful
  const passive = text.match(/\b(was|were|is|are|been|being|be)\s+\w+(ed|en)\b/gi) || [];
  const passivePer100Words = (passive.length / wordCount) * 100;

  // Specific numbers: dollar amounts, percentages, raw counts with units
  const numberMatches = text.match(/(\$\d[\d,.]*|\d+(\.\d+)?%|\d{1,3}(,\d{3})+|\b\d+\s+(members?|states?|years?|days?|votes?))/g) || [];
  const numbersPer100Words = (numberMatches.length / wordCount) * 100;

  // Banned AI vocabulary counts
  const bannedHits = BANNED_AI.map((re, i) => ({
    label: BANNED_AI_LABELS[i],
    count: (text.match(re) || []).length,
  })).filter(h => h.count > 0);

  return {
    wordCount,
    avgSentenceLength,
    emDashCount,
    hedgingPer100Words,
    passivePer100Words,
    numbersPer100Words,
    bannedHits,
  };
}

function loadBaseline() {
  // Option B: hand-written voice sample
  if (fs.existsSync(VOICE_SAMPLE_PATH)) {
    const content = fs.readFileSync(VOICE_SAMPLE_PATH, 'utf-8');
    const { body } = parseFrontmatter(content);
    const prose = stripNonProse(body || content);
    if (prose.length >= 500) {
      return { source: 'voice-sample.md', signature: computeSignature(prose) };
    }
  }

  // Option A: auto-extract from admin notes (recent David-authored text)
  const adminDir = path.join(CONTENT_DIR, 'Admin Notes');
  if (!fs.existsSync(adminDir)) return null;
  const adminFiles = fs.readdirSync(adminDir).filter(f => f.endsWith('.md') && !f.startsWith('.'));
  const corpus = [];
  for (const f of adminFiles) {
    try {
      const c = fs.readFileSync(path.join(adminDir, f), 'utf-8');
      const { data, body } = parseFrontmatter(c);
      // Skip script-generated files (they're not David's voice)
      if (data && data['generated-by']) continue;
      const prose = stripNonProse(body || c);
      if (prose.length >= 200) corpus.push(prose);
      if (corpus.reduce((n, p) => n + p.length, 0) > 4000) break;
    } catch {}
  }
  if (corpus.length === 0) return null;
  return { source: 'auto-extracted from admin notes', signature: computeSignature(corpus.join('\n\n')) };
}

function scoreDrift(baseline, profile) {
  if (!baseline) return { drift: 0, reasons: [] };
  const reasons = [];
  let drift = 0;

  // Avg sentence length: acceptable range ± 40%
  if (baseline.avgSentenceLength > 0) {
    const delta = Math.abs(profile.avgSentenceLength - baseline.avgSentenceLength) / baseline.avgSentenceLength;
    if (delta > 0.4) {
      drift += 1;
      reasons.push(`avg sentence length ${profile.avgSentenceLength.toFixed(0)} words (target ~${baseline.avgSentenceLength.toFixed(0)})`);
    }
  }

  // Hedging: shouldn't exceed baseline by more than 2x
  if (profile.hedgingPer100Words > baseline.hedgingPer100Words * 2 + 0.5) {
    drift += 1;
    reasons.push(`hedging language usage ${profile.hedgingPer100Words.toFixed(1)}/100 words (target < ${(baseline.hedgingPer100Words * 2).toFixed(1)})`);
  }

  // Passive voice: shouldn't exceed baseline by more than 2x
  if (profile.passivePer100Words > baseline.passivePer100Words * 2 + 1) {
    drift += 1;
    reasons.push(`passive voice ${profile.passivePer100Words.toFixed(1)}/100 words (target < ${(baseline.passivePer100Words * 2).toFixed(1)})`);
  }

  // Numbers: profile should have AT LEAST as many specific numbers per word as baseline (context: class analysis benefits from specifics)
  if (profile.numbersPer100Words < baseline.numbersPer100Words * 0.3 && baseline.numbersPer100Words > 0.3) {
    drift += 1;
    reasons.push(`low specific-number density ${profile.numbersPer100Words.toFixed(1)}/100 words (target ~${baseline.numbersPer100Words.toFixed(1)})`);
  }

  return { drift, reasons };
}

function main() {
  const baseline = loadBaseline();
  if (baseline) {
    console.log(`Voice baseline source: ${baseline.source}`);
    console.log(`  Word count: ${baseline.signature.wordCount}`);
    console.log(`  Avg sentence length: ${baseline.signature.avgSentenceLength.toFixed(1)} words`);
    console.log(`  Hedging / 100 words: ${baseline.signature.hedgingPer100Words.toFixed(2)}`);
    console.log(`  Numbers / 100 words: ${baseline.signature.numbersPer100Words.toFixed(2)}`);
    console.log('');
  } else {
    console.log('No voice baseline found (no voice-sample.md and no admin notes to extract from).');
    console.log('Only hard rules (em dash + banned AI) will be enforced.');
    console.log('');
  }

  const files = walkDir(CONTENT_DIR, '.md');
  const rejected = getRejectedPatterns(SOURCE_NAME);
  const findings = [];

  for (const f of files) {
    let content;
    try { content = fs.readFileSync(f, 'utf-8'); } catch { continue; }
    const { data, body } = parseFrontmatter(content);
    if (!data || !data.title) continue;

    // Skip non-editorial types
    const skipTypes = ['admin-note', 'daily-update', 'digest', 'reference', 'methodology', 'system', 'page', 'index'];
    if (skipTypes.includes(data.type)) continue;

    // Only audit ready / verified / s-tier profiles
    const readiness = data['content-readiness'];
    if (!['ready', 'verified', 's-tier'].includes(readiness)) continue;

    const prose = stripNonProse(body);
    if (prose.length < 200) continue; // too short to meaningfully measure

    const sig = computeSignature(prose);
    const patternKey = `${data.title}:voice`;
    if (rejected.has(patternKey)) continue;

    const hardFails = [];
    if (sig.emDashCount > 0) {
      hardFails.push(`${sig.emDashCount} em dash${sig.emDashCount === 1 ? '' : 'es'} in body`);
    }
    if (sig.bannedHits.length > 0) {
      hardFails.push(...sig.bannedHits.map(h => `${h.count}x ${h.label}`));
    }

    const { drift, reasons } = scoreDrift(baseline?.signature, sig);

    if (hardFails.length > 0 || drift >= 2) {
      findings.push({
        file: f,
        title: data.title,
        type: data.type,
        readiness,
        hardFails,
        drift,
        reasons,
        patternKey,
      });
    }
  }

  findings.sort((a, b) => {
    // Hard fails + verified rank first
    const aScore = a.hardFails.length * 10 + (a.readiness === 'verified' || a.readiness === 's-tier' ? 5 : 0) + a.drift;
    const bScore = b.hardFails.length * 10 + (b.readiness === 'verified' || b.readiness === 's-tier' ? 5 : 0) + b.drift;
    return bScore - aScore;
  });

  const entries = [];
  for (const f of findings.slice(0, 30)) {
    const isVerified = f.readiness === 'verified' || f.readiness === 's-tier';
    const hasHardFail = f.hardFails.length > 0;
    // Hard fails on any profile → blocking. Drift on verified → blocking. Drift on ready → deciding.
    const bucket = hasHardFail || isVerified ? 'blocking' : 'deciding';
    const rel = path.relative(CONTENT_DIR, f.file).split(path.sep).join('/');

    const issueList = [...f.hardFails, ...f.reasons].slice(0, 3).join(', ');
    const what = hasHardFail
      ? `${f.title}: voice rule violations`
      : `${f.title}: voice drift from baseline`;
    const why = hasHardFail
      ? `${isVerified ? 'Verified profile' : 'Ready profile'} contains ${issueList}. These hard rules block ship — em dashes and AI vocabulary must be removed before this profile renders on the public site.`
      : `Profile body drifted from your baseline voice on ${f.drift} dimensions: ${issueList}. Review the rewrite history and realign if appropriate.`;

    entries.push({
      bucket,
      what,
      why,
      where: `content/${rel}`,
      cost_min: hasHardFail ? 3 : 8,
      leverage: hasHardFail ? 5 : 3,
      metadata: { hardFails: f.hardFails, drift: f.drift },
    });
  }

  if (entries.length === 0) {
    clearSource(SOURCE_NAME);
    console.log(`✓ Voice Drift Detector: all ${findings.length === 0 ? 'audited' : 'flagged'} profiles pass.`);
    return;
  }

  const count = addEntries(SOURCE_NAME, entries);
  console.log(`Voice Drift Detector flagged ${count} profile${count === 1 ? '' : 's'}.`);
  console.log(`  Hard fails: ${entries.filter(e => (e.metadata?.hardFails || []).length > 0).length}`);
  console.log(`  Drift only: ${entries.filter(e => (e.metadata?.hardFails || []).length === 0).length}`);
}

main();
