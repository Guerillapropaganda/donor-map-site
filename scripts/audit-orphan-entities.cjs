#!/usr/bin/env node
/**
 * audit-orphan-entities.cjs
 *
 * Scans every edge file, finds names that appear as from/to but have no
 * corresponding row in data/entities.jsonl, classifies them, and writes
 * the editorially-interesting ones to content/Admin Notes/orphan-
 * entities-queue.md for David's review.
 *
 * Writes a RANKED queue of orphans worth promoting to profiles. Not a
 * dumb dump of every unmatched string — classifies out:
 *   • federal agencies (DoD, HHS, VA, GSA, EPA, etc.) — contextual
 *   • individual-person donor names (from FEC indiv, "LAST, FIRST" or
 *     "First Last" patterns with no org signals)
 *   • committee boilerplate ("X FOR CONGRESS", "FRIENDS OF X", etc.)
 *   • story-page narrative wikilinks (multi-word, no business-entity
 *     markers)
 *
 * What's left: organizational orphans — nonprofits, PACs, corps,
 * lobbying firms, media vendors — the ones that SHOULD have profiles
 * (or at minimum entity records) for money trails to trace through.
 *
 * Output format: one markdown table per category, sorted by total flow.
 * David triages from the Ops /attention surface (orphan queue will be
 * wired in as a separate producer once this is stable).
 *
 * Usage: node scripts/audit-orphan-entities.cjs
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const ENT_FILE = path.join(ROOT, 'data', 'entities.jsonl');
const REL_FILE = path.join(ROOT, 'data', 'relationships.jsonl');
const DERIVED_DIR = path.join(ROOT, 'data', 'derived');
const OUT_FILE = path.join(ROOT, 'content', 'Admin Notes', 'orphan-entities-queue.md');

// Federal agencies — exclude from profile candidates (contextual only)
const FEDERAL_AGENCY_PATTERNS = [
  /^Department of /i,
  /^U\.S\. Department of /i,
  /^(National|Federal) /i,
  /^(Social Security Administration|General Services Administration|Environmental Protection Agency|Small Business Administration|Securities and Exchange Commission|Office of Personnel Management|Centers for)/i,
  /(Agency|Administration|Bureau|Office|Commission)$/,
];

// Committee boilerplate — FEC-style committee names that belong to
// politician entities already (profile exists under the politician name)
const COMMITTEE_NAME_PATTERNS = [
  /\b(FOR CONGRESS|FOR SENATE|FOR PRESIDENT|FOR (THE )?(HOUSE|PEOPLE|SENATE))$/i,
  /^FRIENDS OF /i,
  /^COMMITTEE TO (ELECT|RE-?ELECT) /i,
  /\b(VICTORY COMMITTEE|LEADERSHIP (PAC|FUND))$/i,
];

// Payroll / HR / fundraising-platform vendors — NOT political actors.
// They get paid by political committees (hence huge fec-oppexp flow)
// but don't donate, run IEs, or sit in the political network. Filtering
// these out of the promote bucket prevents them cluttering editorial
// review. Currently the big offenders:
//   Paychex $97M · Gusto $95M · ADP $82M · Insperity $62M · Zenefits
//   $55M · Payroll Data Processing $50M — all payroll SaaS vendors.
//   WinRed (Rep donation platform) + ActBlue (Dem donation platform)
//   are conduits, not donors themselves — treat as platforms.
const PAYROLL_PLATFORM_PATTERNS = [
  /^(paychex|gusto|adp|insperity|zenefits|trinet|oasis outsourcing|bambee|rippling|justworks|paylocity|ceridian|dayforce)$/i,
  /\bpayroll (data |services )?processing\b/i,
  /^(winred|actblue|anedot|ngp van|numero)$/i,
  /\b(stripe|square|paypal)( payments)?( inc)?$/i,
  /^amazon web services$/i,
  /^(google|meta|facebook|microsoft|apple)\b.*\b(advertising|ads|marketing)?$/i,
];

// Individual-person heuristics — "LAST, FIRST" FEC shape or bare
// "First Last" with no business markers
function looksLikePerson(name) {
  if (/^[A-Z]+,\s+[A-Z]+/.test(name)) return true;                   // "SMITH, JOHN"
  if (/^[A-Z][a-z]+\s+[A-Z][a-z]+$/.test(name)) return true;         // "John Smith" — bare two-token
  if (/^(Mr|Ms|Mrs|Dr|Hon|Rev)\.\s/i.test(name)) return true;
  return false;
}

function looksLikeNarrative(name) {
  // Story-page wikilinks — vault narrative titles accidentally edged
  if (name.length < 12) return false;
  // Long descriptive titles with connective words
  if (/^\d{4}-\d{2}-\d{2}/.test(name)) return true;                  // dated filenames
  if (/\b(Index|Archive|Pipeline|Deep Dive|Map|History)$/.test(name)) return true;
  if (/\b(and|of|for|in|the) the\b/.test(name)) return true;        // "The Politics of ..."
  if (/:/.test(name) && name.length > 40) return true;              // "X: Y and Z" long story titles
  return false;
}

function looksLikeFederalAgency(name) {
  return FEDERAL_AGENCY_PATTERNS.some((rx) => rx.test(name));
}

function looksLikeCommittee(name) {
  return COMMITTEE_NAME_PATTERNS.some((rx) => rx.test(name));
}

function looksLikePayrollPlatform(name) {
  return PAYROLL_PLATFORM_PATTERNS.some((rx) => rx.test(name));
}

function loadEntities() {
  const set = new Set();
  if (!fs.existsSync(ENT_FILE)) return set;
  for (const line of fs.readFileSync(ENT_FILE, 'utf-8').split('\n')) {
    if (!line.trim()) continue;
    try { const e = JSON.parse(line); if (e.name) set.add(e.name); } catch {}
  }
  return set;
}

function main() {
  const entitySet = loadEntities();
  console.log(`Loaded ${entitySet.size} existing entities.`);

  // Aggregate orphan flow
  const orphan = new Map(); // name → { edges, total, asFrom, asTo, sources }
  const edgeFiles = [REL_FILE];
  if (fs.existsSync(DERIVED_DIR)) {
    for (const f of fs.readdirSync(DERIVED_DIR)) {
      if (f.endsWith('.jsonl')) edgeFiles.push(path.join(DERIVED_DIR, f));
    }
  }
  // Streaming read — fec-indiv-by-committee.jsonl is 1.7GB after the
  // $1K re-ingest, which exceeds V8's max string length. Read in chunks.
  function streamEdges(file, onEdge) {
    const CHUNK = 64 * 1024 * 1024;
    const fd = fs.openSync(file, 'r');
    const size = fs.fstatSync(fd).size;
    let offset = 0, carry = '';
    try {
      while (offset < size) {
        const len = Math.min(CHUNK, size - offset);
        const buf = Buffer.alloc(len);
        fs.readSync(fd, buf, 0, len, offset);
        offset += len;
        const chunk = carry + buf.toString('utf-8');
        const lines = chunk.split('\n');
        carry = lines.pop();
        for (const line of lines) {
          if (!line.trim()) continue;
          try { onEdge(JSON.parse(line)); } catch {}
        }
      }
      if (carry.trim()) { try { onEdge(JSON.parse(carry)); } catch {} }
    } finally {
      fs.closeSync(fd);
    }
  }
  let scanned = 0;
  for (const f of edgeFiles) {
    if (!fs.existsSync(f)) continue;
    streamEdges(f, (e) => {
      scanned++;
      for (const [side, sideKey] of [[e.from, 'asFrom'], [e.to, 'asTo']]) {
        if (!side || entitySet.has(side)) continue;
        const rec = orphan.get(side) || { edges: 0, total: 0, asFrom: 0, asTo: 0, sources: new Set() };
        rec.edges++;
        rec.total += Number(e.amount) || 0;
        rec[sideKey] += Number(e.amount) || 0;
        if (e.source) rec.sources.add(e.source);
        orphan.set(side, rec);
      }
    });
  }
  console.log(`Scanned ${scanned.toLocaleString()} edges; ${orphan.size.toLocaleString()} orphan names.`);

  // Classify
  const buckets = {
    promote: [],       // editorial candidates — orgs with real flow
    federal: [],       // context-only
    committee: [],     // already tied to politician
    platform: [],      // payroll / fundraising platforms — conduits, not actors
    person: [],        // individual donors
    narrative: [],     // vault story pages leaking into graph
    lowflow: [],       // <$1M and <5 edges — probably not editorial
  };
  for (const [name, rec] of orphan) {
    const row = {
      name,
      edges: rec.edges,
      total: rec.total,
      asFrom: rec.asFrom,
      asTo: rec.asTo,
      sources: [...rec.sources],
    };
    if (looksLikeFederalAgency(name)) { buckets.federal.push(row); continue; }
    if (looksLikeCommittee(name)) { buckets.committee.push(row); continue; }
    if (looksLikePayrollPlatform(name)) { buckets.platform.push(row); continue; }
    if (looksLikePerson(name)) { buckets.person.push(row); continue; }
    if (looksLikeNarrative(name)) { buckets.narrative.push(row); continue; }
    if (row.total < 1_000_000 && row.edges < 5) { buckets.lowflow.push(row); continue; }
    buckets.promote.push(row);
  }
  for (const k of Object.keys(buckets)) buckets[k].sort((a, b) => b.total - a.total);

  console.log('\nClassification:');
  for (const [k, arr] of Object.entries(buckets)) console.log(`  ${k}: ${arr.length.toLocaleString()}`);

  // Write markdown
  const fmtUsd = (n) => {
    if (!n) return '—';
    if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
    if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
    if (n >= 1e3) return `$${(n / 1e3).toFixed(0)}K`;
    return `$${n.toFixed(0)}`;
  };
  const tableRow = (r) => `| ${r.name} | ${r.edges} | ${fmtUsd(r.total)} | ${fmtUsd(r.asFrom)} / ${fmtUsd(r.asTo)} | ${r.sources.join(', ')} |`;
  const lines = [];
  const today = new Date().toISOString().slice(0, 10);
  lines.push(`---`);
  lines.push(`title: Orphan Entities Queue`);
  lines.push(`type: admin-note`);
  lines.push(`note-type: data`);
  lines.push(`status: open`);
  lines.push(`priority: normal`);
  lines.push(`last-updated: '${today}'`);
  lines.push(`---`);
  lines.push('');
  lines.push(`# Orphan Entities Queue`);
  lines.push('');
  lines.push(`Names that appear as edge from/to in our ingested data but have no entity record in \`data/entities.jsonl\`. Classified by heuristic. Review the **Promote candidates** table and promote editorially-interesting orgs to real profiles — that closes money-trail dead-ends.`);
  lines.push('');
  lines.push(`_Regenerate: \`node scripts/audit-orphan-entities.cjs\` — last run ${today}._`);
  lines.push('');
  lines.push(`## Summary`);
  lines.push('');
  lines.push(`| Bucket | Count | Meaning |`);
  lines.push(`|---|---:|---|`);
  lines.push(`| **promote** | ${buckets.promote.length} | Editorially-interesting orgs (≥$1M flow or ≥5 edges). **These are the ones to review.** |`);
  lines.push(`| federal | ${buckets.federal.length} | Federal agencies as USAspending contract counterparties. Contextual, not editorial subjects. |`);
  lines.push(`| committee | ${buckets.committee.length} | FEC committee names already tied to their politician (e.g. "X FOR CONGRESS"). Already covered via politician profile. |`);
  lines.push(`| platform | ${buckets.platform.length} | Payroll SaaS / fundraising platforms (Paychex, Gusto, ADP, WinRed, ActBlue). Conduits, not political actors. |`);
  lines.push(`| person | ${buckets.person.length} | Individual donor names from FEC itemization. Not profile-worthy unless they're significant. |`);
  lines.push(`| narrative | ${buckets.narrative.length} | Vault story-page wikilinks that leaked into the graph as edge targets. Fix at ingest; don't promote. |`);
  lines.push(`| lowflow | ${buckets.lowflow.length} | Orgs with <$1M and <5 edges — below the editorial threshold. |`);
  lines.push('');
  lines.push(`**Total orphan names**: ${orphan.size.toLocaleString()}`);
  lines.push('');
  lines.push(`---`);
  lines.push('');
  lines.push(`## Promote candidates (top 100 by flow)`);
  lines.push('');
  lines.push(`| Name | Edges | Total flow | Out / In | Sources |`);
  lines.push(`|---|---:|---:|---:|---|`);
  for (const r of buckets.promote.slice(0, 100)) lines.push(tableRow(r));
  lines.push('');
  if (buckets.promote.length > 100) lines.push(`_(${buckets.promote.length - 100} more below threshold; re-run with a cutoff to see more)_`);
  lines.push('');
  lines.push(`---`);
  lines.push('');
  lines.push(`## Federal agencies (contextual — do not promote)`);
  lines.push('');
  lines.push(`| Name | Edges | Total flow |`);
  lines.push(`|---|---:|---:|`);
  for (const r of buckets.federal.slice(0, 30)) lines.push(`| ${r.name} | ${r.edges} | ${fmtUsd(r.total)} |`);
  lines.push('');
  lines.push(`---`);
  lines.push('');
  lines.push(`## Narrative-page leaks (fix at ingest)`);
  lines.push('');
  lines.push(`These are vault story-page titles that ended up as edge from/to values. Likely a bulk-ingest script is mis-parsing a wikilink target. Top 20 by edges:`);
  lines.push('');
  lines.push(`| Name | Edges | Sources |`);
  lines.push(`|---|---:|---|`);
  for (const r of buckets.narrative.sort((a, b) => b.edges - a.edges).slice(0, 20)) lines.push(`| ${r.name} | ${r.edges} | ${r.sources.join(', ')} |`);
  lines.push('');

  fs.mkdirSync(path.dirname(OUT_FILE), { recursive: true });
  fs.writeFileSync(OUT_FILE, lines.join('\n') + '\n');
  console.log(`\nWrote ${OUT_FILE}`);
  console.log(`  ${buckets.promote.length} promote candidates, ${buckets.federal.length} federal, ${buckets.narrative.length} narrative, ${buckets.person.length} persons, ${buckets.committee.length} committees, ${buckets.platform.length} platforms, ${buckets.lowflow.length} lowflow.`);
}

main();
