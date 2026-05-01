#!/usr/bin/env node
/**
 * generate-ca-gov-2026-dossier-data.cjs
 *
 * Phase 3 (data-side) of CA Gov 2026 dossier plan (2026-05-01).
 *
 * Reads the Phase 2-B + 2-D extracts and generates the structured
 * data-side of each per-candidate dossier as markdown. Editorial angle
 * sections are stubbed with a TODO marker — Claude fills those in
 * by hand using judgment, not by template.
 *
 * Output: content/Admin Notes/ca-gov-2026-dossiers/{slug}.md (8 files)
 *         content/Admin Notes/ca-gov-2026-dossiers/_summary.md
 *
 * Stays private. Not in public-routes.json. Not auto-published.
 */

const fs = require('fs');
const path = require('path');

const CANDIDATES = [
  { slug: 'becerra',      name: 'Xavier Becerra',     archetype: 'Institutional Democrat / former Cabinet',   tier: 'deep' },
  { slug: 'porter',       name: 'Katie Porter',       archetype: 'Anti-corporate brand / small-dollar (D)',   tier: 'deep' },
  { slug: 'steyer',       name: 'Tom Steyer',         archetype: 'Billionaire self-fund (D)',                 tier: 'deep' },
  { slug: 'hilton',       name: 'Steve Hilton',       archetype: 'Fox media / outsider populist (R)',         tier: 'deep' },
  { slug: 'bianco',       name: 'Chad Bianco',        archetype: 'Constitutional sheriff / MAGA law-enforcement (R)', tier: 'deep' },
  { slug: 'villaraigosa', name: 'Antonio Villaraigosa', archetype: 'Real-estate / labor coalition (D)',       tier: 'deep' },
  { slug: 'mahan',        name: 'Matt Mahan',         archetype: 'Silicon Valley tech billionaire (D)',       tier: 'deep' },
  { slug: 'thurmond',     name: 'Tony Thurmond',      archetype: 'Education establishment (D)',               tier: 'portrait' },
];

const ROOT = path.join('content', 'Admin Notes', 'ca-gov-2026-dossiers');
fs.mkdirSync(ROOT, { recursive: true });

const fmt = (n) => n >= 1_000_000 ? '$' + (n/1_000_000).toFixed(2) + 'M'
                : n >= 1_000     ? '$' + (n/1_000).toFixed(0)   + 'K'
                : '$' + n;

function readJson(p) {
  if (!fs.existsSync(p)) return null;
  return JSON.parse(fs.readFileSync(p, 'utf-8'));
}

// Extract a small slice of frontmatter (just the fields we need) without
// loading the whole master profile (some are 270k+ tokens).
function readFrontmatter(file) {
  if (!fs.existsSync(file)) return null;
  const buf = fs.readFileSync(file, 'utf-8');
  const m = buf.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!m) return null;
  const out = {};
  for (const line of m[1].split('\n')) {
    const kv = line.match(/^([\w-]+):\s*(.*)$/);
    if (kv) out[kv[1]] = kv[2].trim().replace(/^["']|["']$/g, '');
  }
  return out;
}

function listSubpages(dir) {
  if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) return [];
  const out = [];
  function walk(d, depth) {
    if (depth > 3) return;
    for (const entry of fs.readdirSync(d, { withFileTypes: true })) {
      const full = path.join(d, entry.name);
      if (entry.isDirectory()) walk(full, depth + 1);
      else if (entry.name.endsWith('.md') && !entry.name.startsWith('_')) {
        out.push(path.relative(dir, full).replace(/\\/g, '/'));
      }
    }
  }
  walk(dir, 0);
  return out.slice(0, 20);
}

const SUMMARY_ROWS = [];

for (const c of CANDIDATES) {
  const data = readJson(path.join('data', 'derived', 'ca-gov-2026', `${c.slug}.json`));
  const fec  = readJson(path.join('data', 'derived', 'ca-gov-2026', `${c.slug}-fec.json`));
  const profileDir = path.join('content', 'Politicians', 'Races', 'CA Governor 2026', c.name);
  const profileFile = c.slug === 'hilton'
    ? path.join('content', 'Politicians', 'Races', 'CA Governor 2026', 'Steve Hilton.md')
    : path.join(profileDir, `_${c.name} Master Profile.md`);
  const fm = readFrontmatter(profileFile);
  const subpages = c.slug === 'hilton' ? [] : listSubpages(profileDir);

  if (!data) {
    console.error(`MISSING data for ${c.slug}`);
    continue;
  }

  const lines = [];
  lines.push('---');
  lines.push(`title: "CA Gov 2026 Dossier — ${c.name}"`);
  lines.push('type: admin-note');
  lines.push(`tags: ["ca-gov-2026", "dossier", "${c.slug}"]`);
  lines.push(`candidate: ${JSON.stringify(c.name)}`);
  lines.push(`archetype: ${JSON.stringify(c.archetype)}`);
  lines.push(`tier: ${c.tier}`);
  lines.push(`fppc-committee-id: ${JSON.stringify(fm?.['fppc-committee-id'] || '')}`);
  lines.push('created: 2026-05-01');
  lines.push('status: draft');
  lines.push('audience: code-claude / david');
  lines.push('---');
  lines.push('');
  lines.push(`# CA Gov 2026 Dossier — ${c.name}`);
  lines.push('');
  lines.push(`**Archetype:** ${c.archetype}`);
  lines.push(`**Profile:** [${path.basename(profileFile)}](../../${profileFile.replace(/\\/g, '/')})`);
  lines.push(`**FPPC committee:** \`${fm?.['fppc-committee-id'] || '—'}\` ${fm?.['fppc-committee-name'] ? '· ' + fm['fppc-committee-name'] : ''}`);
  lines.push('');

  // ─── State-level (Cal-Access) ──────────────────────────────────────
  lines.push('## State-level money (Cal-Access)');
  lines.push('');
  const c2026 = data.cycle_2026;
  const cAll = data.lifetime;
  const avg2026 = c2026.unique_donors ? Math.round(c2026.total_raised / c2026.unique_donors) : 0;
  lines.push(`**2026 cycle:** raised ${fmt(c2026.total_raised)} from ${c2026.unique_donors.toLocaleString()} donors (avg ${fmt(avg2026)}/donor) · spent ${fmt(c2026.total_spent)}`);
  if (cAll.total_raised !== c2026.total_raised) {
    lines.push(`**Lifetime state-level:** raised ${fmt(cAll.total_raised)} from ${cAll.unique_donors.toLocaleString()} donors across cycles ${data.cycles_active.join(', ')}`);
  }
  lines.push(`**Committees referenced:** ${data.committees_referenced.length} FPPC IDs (${data.committees_referenced.slice(0, 8).join(', ')}${data.committees_referenced.length > 8 ? ', ...' : ''})`);
  lines.push('');

  lines.push('### Top 15 donors — 2026 cycle');
  lines.push('');
  lines.push('| Rank | Donor | $ | # contributions | Note |');
  lines.push('|---:|---|---:|---:|---|');
  c2026.top_50_donors.slice(0, 15).forEach((d, i) => {
    const note = d.evidence?.[0] ? d.evidence[0].slice(0, 80).replace(/\|/g, '\\|') + '…' : '';
    lines.push(`| ${i+1} | ${d.name.replace(/\|/g, '\\|')} | ${fmt(d.total)} | ${d.count} | ${note} |`);
  });
  if (c2026.top_50_donors.length === 0) {
    lines.push('| — | *(no 2026 cycle donors found in Cal-Access bulk)* | — | — | — |');
  }
  lines.push('');

  if (cAll.total_raised !== c2026.total_raised) {
    lines.push('### Top 10 donors — lifetime state-level');
    lines.push('');
    lines.push('| Rank | Donor | $ | # contributions |');
    lines.push('|---:|---|---:|---:|');
    cAll.top_50_donors.slice(0, 10).forEach((d, i) => {
      lines.push(`| ${i+1} | ${d.name.replace(/\|/g, '\\|')} | ${fmt(d.total)} | ${d.count} |`);
    });
    lines.push('');
  }

  // ─── Federal-level (FEC) ───────────────────────────────────────────
  if (fec) {
    lines.push('## Federal-level money (FEC)');
    lines.push('');
    lines.push(`**FEC IDs:** ${fec.fec_ids.join(', ')}`);
    lines.push(`**Federal raised:** ${fmt(fec.total_raised_federal)} (${fec.unique_donors.toLocaleString()} donors)`);
    lines.push(`**Federal outgoing:** ${fmt(fec.total_outgoing_federal)} (${fec.unique_recipients.toLocaleString()} recipients)`);
    lines.push(`**Cycles active:** ${fec.cycles_active.join(', ')}`);
    lines.push(`**Sources:** ${fec.sources_seen.join(', ')}`);
    lines.push('');
    if (fec.top_50_donors.length > 0) {
      lines.push('### Top 10 federal donors');
      lines.push('');
      lines.push('| Donor | $ | # contributions |');
      lines.push('|---|---:|---:|');
      fec.top_50_donors.slice(0, 10).forEach(d => {
        lines.push(`| ${d.name.replace(/\|/g, '\\|')} | ${fmt(d.total)} | ${d.count} |`);
      });
      lines.push('');
    }
    if (fec.top_25_recipients.length > 0) {
      lines.push('### Top 10 federal-level recipients (where their money/influence flowed)');
      lines.push('');
      lines.push('| Recipient | $ | # contributions |');
      lines.push('|---|---:|---:|');
      fec.top_25_recipients.slice(0, 10).forEach(d => {
        lines.push(`| ${d.name.replace(/\|/g, '\\|')} | ${fmt(d.total)} | ${d.count} |`);
      });
      lines.push('');
    }
  }

  // ─── Vault state ───────────────────────────────────────────────────
  lines.push('## Vault state');
  lines.push('');
  lines.push(`- **content-readiness:** ${fm?.['content-readiness'] || '?'}`);
  lines.push(`- **central-thesis:** ${fm?.['central-thesis']?.slice(0, 200) || '—'}${fm?.['central-thesis']?.length > 200 ? '…' : ''}`);
  lines.push(`- **last-updated:** ${fm?.['last-updated'] || '?'}`);
  if (subpages.length > 0) {
    lines.push(`- **${subpages.length} sub-pages:**`);
    subpages.forEach(s => lines.push(`  - \`${s}\``));
  } else {
    lines.push('- **Sub-pages:** none');
  }
  lines.push('');

  // ─── Editorial angle (TODO) ────────────────────────────────────────
  lines.push('## Editorial angle');
  lines.push('');
  lines.push('<!-- TODO[claude]: 1-2 paragraphs synthesizing the data above into the story shape. -->');
  lines.push('<!-- What does the donor pattern reveal? What\'s the biggest contradiction? -->');
  lines.push('<!-- What\'s the screenshot-bait fact? -->');
  lines.push('');
  lines.push('## Open questions for David');
  lines.push('');
  lines.push('<!-- TODO[claude]: list 2-4 things that need verification before publishing. -->');
  lines.push('');

  // ─── Confidence flags ──────────────────────────────────────────────
  lines.push('## Confidence flags');
  lines.push('');
  lines.push(`- **Cal-Access bulk:** Tier 1, FPPC-disclosed primary source. ${c2026.unique_donors > 0 ? 'CYCLE 2026 data present.' : '⚠️ NO 2026 CYCLE DATA — candidate may not have filed yet, or filings are post-bulk-snapshot.'}`);
  if (fec) lines.push(`- **FEC bulk:** Tier 1. ${fec.cycles_active.length > 0 ? 'Federal cycles ' + fec.cycles_active.join('/') + ' present.' : '⚠️ no federal data resolved'}`);
  lines.push(`- **Vault narrative:** ${fm?.['content-readiness'] === 'data-complete' || fm?.['content-readiness'] === 'verified' ? 'editorially developed' : 'draft / needs work'}`);
  lines.push('- **Living-people surface:** All factual claims must trace to primary source URL. Editorial verdicts are David\'s lane (Rule 13).');
  lines.push('');

  fs.writeFileSync(path.join(ROOT, `${c.slug}.md`), lines.join('\n'), 'utf-8');
  console.log(`wrote ${c.slug}.md`);

  SUMMARY_ROWS.push({
    slug: c.slug,
    name: c.name,
    archetype: c.archetype,
    raised_2026: c2026.total_raised,
    donors_2026: c2026.unique_donors,
    avg_2026: avg2026,
    fec_outgoing: fec?.total_outgoing_federal || 0,
    profile_size: fm ? 'present' : 'missing',
    subpages: subpages.length,
    readiness: fm?.['content-readiness'] || '?',
  });
}

// ─── Summary doc ──────────────────────────────────────────────────────
const sum = [];
sum.push('---');
sum.push('title: "CA Gov 2026 Dossier — Master Summary"');
sum.push('type: admin-note');
sum.push('tags: ["ca-gov-2026", "dossier", "summary"]');
sum.push('created: 2026-05-01');
sum.push('status: draft');
sum.push('---');
sum.push('');
sum.push('# CA Gov 2026 Dossier — Master Summary');
sum.push('');
sum.push('Cross-candidate comparison table. Per-candidate detail: [becerra](becerra.md) · [porter](porter.md) · [steyer](steyer.md) · [hilton](hilton.md) · [bianco](bianco.md) · [villaraigosa](villaraigosa.md) · [mahan](mahan.md) · [thurmond](thurmond.md) · [ware (structural)](../ca-gov-2026-ware-structural-2026-05-01.md)');
sum.push('');
sum.push('## 2026 cycle fundraising — Cal-Access bulk');
sum.push('');
sum.push('| Candidate | Archetype | 2026 raised | 2026 donors | Avg / donor | Federal outgoing (lifetime FEC) | Vault tier | Sub-pages |');
sum.push('|---|---|---:|---:|---:|---:|---|---:|');
SUMMARY_ROWS.sort((a, b) => b.raised_2026 - a.raised_2026);
SUMMARY_ROWS.forEach(r => {
  sum.push(`| **${r.name}** | ${r.archetype} | ${fmt(r.raised_2026)} | ${r.donors_2026.toLocaleString()} | ${fmt(r.avg_2026)} | ${fmt(r.fec_outgoing)} | ${r.readiness} | ${r.subpages} |`);
});
sum.push('');
sum.push('## Headline patterns from the data');
sum.push('');
sum.push('<!-- TODO[claude]: cross-cutting observations. Where the screenshot-bait stories live. -->');
sum.push('');
fs.writeFileSync(path.join(ROOT, '_summary.md'), sum.join('\n'), 'utf-8');
console.log('wrote _summary.md');

console.log(`\nDone. ${CANDIDATES.length + 1} files in ${ROOT}/`);
