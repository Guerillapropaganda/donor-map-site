#!/usr/bin/env node
/**
 * self-fund-integration-check.cjs — harness check for self-funding
 * data integration into dossier / profile views.
 *
 * What it detects:
 *   The cal-access-bulk ingester correctly partitions candidate-self
 *   contributions into data/cal-access-self-funding.jsonl (graph-
 *   integrity choice — keeps self-loops out of the relationship graph).
 *   But that file is consumed only by specific auto-block builders. If
 *   a profile or dossier-extraction reads only data/relationships.jsonl
 *   or data/derived/cal-access-bulk.jsonl, it MISSES the dominant fact
 *   about a self-funded candidate (Steyer's $134M shows as $14M).
 *
 *   Detection: for each candidate with a self-fund entry in
 *   cal-access-self-funding.jsonl, check that:
 *     (a) The candidate has a vault profile
 *     (b) The profile's auto-block content (or frontmatter) reflects
 *         self-fund total
 *     (c) Cross-reference what the librarian-derived bulk says for
 *         "candidate raised X" vs. what self-fund file says for "self
 *         contributed Y" — if they're wildly inconsistent, flag.
 *
 * Why this check exists:
 *   Surfaced 2026-05-01 in CA Gov 2026 dossier work. Tom Steyer's
 *   self-fund was captured by the pipeline ($133.8M correctly in
 *   self-funding.jsonl) but the dossier-extraction script read only
 *   the librarian's $14M from cal-access-bulk.jsonl, undercounting
 *   his fundraising by 90%+. Future dossier work needs to surface
 *   self-fund records.
 *
 * Usage:
 *   node scripts/self-fund-integration-check.cjs --json
 */

'use strict';
const fs = require('fs');
const path = require('path');
const readline = require('readline');

const ROOT = path.join(__dirname, '..');
const SELF_FUND_FILE = path.join(ROOT, 'data', 'cal-access-self-funding.jsonl');
const BULK_JSONL = path.join(ROOT, 'data', 'derived', 'cal-access-bulk.jsonl');
const POLITICIANS_DIR = path.join(ROOT, 'content', 'Politicians');

const args = process.argv.slice(2);
const JSON_MODE = args.includes('--json');

(async function main() {
  if (!fs.existsSync(SELF_FUND_FILE)) {
    const out = { check: 'self-fund-integration', status: 'skipped', reason: 'self-funding.jsonl not present', findings_count: 0 };
    if (JSON_MODE) console.log(JSON.stringify(out));
    else console.log(`SKIPPED: ${out.reason}`);
    process.exit(0);
  }

  // Load self-fund records, aggregated by candidate
  const selfFundByCandidate = new Map(); // candidate → { total, records[] }
  const lines = fs.readFileSync(SELF_FUND_FILE, 'utf-8').split('\n');
  for (const line of lines) {
    if (!line.trim()) continue;
    let r;
    try { r = JSON.parse(line); } catch { continue; }
    const c = r.candidate;
    if (!c) continue;
    const prev = selfFundByCandidate.get(c) || { total: 0, records: [] };
    prev.total += +r.amount || 0;
    prev.records.push(r);
    selfFundByCandidate.set(c, prev);
  }

  // For each candidate with self-fund, also look up their librarian total
  // (sum of monetary edges where to=candidate, source=cal-access-bulk)
  const librarianTotalByCandidate = new Map();
  if (fs.existsSync(BULK_JSONL)) {
    const stream = fs.createReadStream(BULK_JSONL, { encoding: 'utf-8' });
    const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });
    for await (const line of rl) {
      if (!line.trim()) continue;
      let r;
      try { r = JSON.parse(line); } catch { continue; }
      if (r.type !== 'monetary') continue;
      if (!r.to) continue;
      if (selfFundByCandidate.has(r.to)) {
        const prev = librarianTotalByCandidate.get(r.to) || 0;
        librarianTotalByCandidate.set(r.to, prev + (+r.amount || 0));
      }
    }
  }

  // Find each candidate's vault profile and check whether self-fund is mentioned
  function findProfile(candidate) {
    // Crude search — most CA Gov 2026 candidates live under content/Politicians/Races/CA Governor 2026/{Name}/
    const possible = [
      path.join(POLITICIANS_DIR, 'Races', 'CA Governor 2026', candidate, `_${candidate} Master Profile.md`),
      path.join(POLITICIANS_DIR, 'Races', 'CA Governor 2026', `${candidate}.md`),
    ];
    for (const p of possible) {
      if (fs.existsSync(p)) return p;
    }
    return null;
  }

  const findings = [];
  for (const [candidate, info] of selfFundByCandidate.entries()) {
    const librarianTotal = librarianTotalByCandidate.get(candidate) || 0;
    const ratio = librarianTotal > 0 ? +(info.total / librarianTotal).toFixed(2) : null;
    const profile = findProfile(candidate);
    let profileMentionsSelfFund = false;
    if (profile) {
      // Quick heuristic — does the profile mention the self-fund amount?
      const text = fs.readFileSync(profile, 'utf-8').toLowerCase();
      const amtMillions = info.total / 1_000_000;
      profileMentionsSelfFund = text.includes('self-fund') || text.includes('self fund') ||
        (amtMillions >= 1 && text.includes(`$${Math.round(amtMillions)}m`)) ||
        text.includes(`$${Math.round(amtMillions)} million`);
    }

    findings.push({
      candidate,
      self_fund_total: Math.round(info.total),
      librarian_canonical_total: Math.round(librarianTotal),
      ratio_self_to_canonical: ratio,
      txn_count: info.records.length,
      cycles: [...new Set(info.records.map(r => r.cycle))].sort(),
      profile_path: profile ? path.relative(ROOT, profile) : null,
      profile_mentions_self_fund: profileMentionsSelfFund,
      gap: profile && !profileMentionsSelfFund && info.total >= 100000,
    });
  }

  const gaps = findings.filter(f => f.gap);

  const result = {
    check: 'self-fund-integration',
    status: 'ok',
    description: 'Candidates with self-fund records in cal-access-self-funding.jsonl whose profile auto-blocks may not surface the self-fund total. Reading librarian-derived bulk only would undercount fundraising for these candidates.',
    findings_count: gaps.length,
    breakdown: {
      total_self_fund_candidates: findings.length,
      candidates_with_profile_gap: gaps.length,
      total_self_fund_dollars_at_risk: Math.round(gaps.reduce((s, f) => s + f.self_fund_total, 0)),
    },
    findings: findings.sort((a, b) => b.self_fund_total - a.self_fund_total),
    interpretation: gaps.length === 0
      ? 'All self-fund candidates have their self-fund mentioned in profile.'
      : `${gaps.length} candidates with self-fund totals not mentioned in their profile body. Total $${(gaps.reduce((s, f) => s + f.self_fund_total, 0) / 1_000_000).toFixed(1)}M of self-fund money invisible if reader only consumes profile.`,
    fix: 'Update profile auto-block builders (or per-candidate dossiers) to read data/cal-access-self-funding.jsonl and surface self-fund totals.',
    generated_at: new Date().toISOString(),
  };

  if (JSON_MODE) console.log(JSON.stringify(result));
  else {
    console.log(`Self-fund integration check: ${gaps.length} profile gaps`);
    findings.forEach(f => {
      const flag = f.gap ? ' ⚠️ GAP' : '';
      console.log(`  ${f.candidate}: self-fund $${(f.self_fund_total/1_000_000).toFixed(2)}M | librarian-canonical $${(f.librarian_canonical_total/1_000_000).toFixed(2)}M | ratio=${f.ratio_self_to_canonical}${flag}`);
    });
  }
})().catch(e => { console.error('FATAL:', e.message); process.exit(2); });
