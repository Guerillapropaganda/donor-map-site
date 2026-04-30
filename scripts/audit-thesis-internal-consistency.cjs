#!/usr/bin/env node
/**
 * audit-thesis-internal-consistency.cjs
 *
 * Round 2 audit (cc_p3_207). No external fetches — checks internal
 * referential integrity across the canonical stores we just shipped:
 *
 *   1. Sponsorship-edge → bills.jsonl
 *      Every sponsorship edge's `to` field is a bill_id ("HR.1-119").
 *      Verify every such bill_id exists in bills.jsonl. Dangling = bug.
 *
 *   2. legislator-positions → votes.jsonl
 *      Every position record has a vote_id. Verify every distinct
 *      vote_id appears in votes.jsonl. Orphan positions are invisible
 *      to votingDivergence (since the query joins on vote_id).
 *
 *   3. Missing bioguides triage
 *      For each sponsor_bioguide in bills.jsonl that isn't in
 *      entities.jsonl signals.bioguide_id, count how many bills they
 *      sponsored. The top entries are real legislators we need to
 *      create entity records for (David's lane — Tier 3 editorial).
 *
 * Output:
 *   - stdout summary
 *   - content/Admin Notes/thesis-internal-consistency-{date}.md
 *
 * No mutations — read-only audit.
 *
 * Usage:
 *   node scripts/audit-thesis-internal-consistency.cjs
 */
const fs = require('fs');
const path = require('path');
const readline = require('readline');

const ROOT = path.resolve(__dirname, '..');
const REPORT = path.join(ROOT, 'content', 'Admin Notes', `thesis-internal-consistency-${new Date().toISOString().slice(0, 10)}.md`);

async function streamLines(file, onRec) {
  const rl = readline.createInterface({ input: fs.createReadStream(file) });
  for await (const line of rl) {
    if (!line.trim()) continue;
    try { onRec(JSON.parse(line)); } catch { /* skip */ }
  }
}

async function audit1_sponsorshipBillIntegrity() {
  console.log('[1] sponsorship → bills.jsonl integrity');
  const billIds = new Set();
  await streamLines(path.join(ROOT, 'data', 'bills.jsonl'), (b) => { if (b.id) billIds.add(b.id); });
  console.log(`    bills indexed: ${billIds.size.toLocaleString()}`);

  let edgesScanned = 0, dangling = 0;
  const samplesDangling = [];
  await streamLines(path.join(ROOT, 'data', 'derived', 'govinfo-bill-status.jsonl'), (e) => {
    if (e.type !== 'sponsorship') return;
    edgesScanned++;
    if (!billIds.has(e.to)) {
      dangling++;
      if (samplesDangling.length < 5) samplesDangling.push({ from: e.from, to: e.to, role: e.role });
    }
  });
  console.log(`    sponsorship edges: ${edgesScanned.toLocaleString()}`);
  console.log(`    dangling (target bill missing): ${dangling.toLocaleString()} (${(dangling * 100 / edgesScanned).toFixed(2)}%)`);
  if (samplesDangling.length > 0) console.log(`    samples: ${samplesDangling.map((s) => `${s.from}→${s.to}`).join(', ')}`);
  return { edgesScanned, dangling, samples: samplesDangling };
}

async function audit2_positionVoteIntegrity() {
  console.log('\n[2] legislator-positions → votes.jsonl integrity');
  const voteIds = new Set();
  await streamLines(path.join(ROOT, 'data', 'votes.jsonl'), (v) => { if (v.vote_id) voteIds.add(v.vote_id); });
  console.log(`    votes indexed: ${voteIds.size.toLocaleString()}`);

  const positionsDir = path.join(ROOT, 'data', 'legislator-positions');
  if (!fs.existsSync(positionsDir)) {
    console.log('    no legislator-positions/ dir — skipping');
    return { positionsScanned: 0, orphan: 0, distinctOrphanVotes: 0 };
  }

  let positionsScanned = 0, orphan = 0;
  const orphanVoteIds = new Set();
  for (const f of fs.readdirSync(positionsDir).filter((f) => /^\d+\.jsonl$/.test(f)).sort()) {
    await streamLines(path.join(positionsDir, f), (p) => {
      positionsScanned++;
      if (!voteIds.has(p.vote_id)) {
        orphan++;
        orphanVoteIds.add(p.vote_id);
      }
    });
  }
  console.log(`    positions scanned: ${positionsScanned.toLocaleString()}`);
  console.log(`    orphan positions (vote_id missing from votes.jsonl): ${orphan.toLocaleString()} (${(orphan * 100 / positionsScanned).toFixed(2)}%)`);
  console.log(`    distinct orphan vote_ids: ${orphanVoteIds.size.toLocaleString()}`);
  return { positionsScanned, orphan, distinctOrphanVotes: orphanVoteIds.size, samples: [...orphanVoteIds].slice(0, 10) };
}

async function audit3_missingBioguides() {
  console.log('\n[3] missing bioguide triage');
  // Resolver builds a node for every bioguide in EITHER entities.jsonl
  // signals.bioguide_id OR legislator-registry.jsonl bioguide. Both
  // count toward "known" for the purpose of librarian visibility.
  const knownBioguides = new Set();
  await streamLines(path.join(ROOT, 'data', 'entities.jsonl'), (e) => {
    const bg = e.signals?.bioguide_id;
    if (bg) knownBioguides.add(bg);
  });
  const fromEntities = knownBioguides.size;
  await streamLines(path.join(ROOT, 'data', 'legislator-registry.jsonl'), (r) => {
    if (r.bioguide) knownBioguides.add(r.bioguide);
  });
  console.log(`    entities w/ bioguide: ${fromEntities.toLocaleString()}, +legislator-registry: ${(knownBioguides.size - fromEntities).toLocaleString()} = ${knownBioguides.size.toLocaleString()} total`);

  // Tally bills per missing bioguide
  const missingCounts = new Map(); // bg → count
  let total = 0, withSponsor = 0;
  await streamLines(path.join(ROOT, 'data', 'bills.jsonl'), (b) => {
    total++;
    const sponsors = Array.isArray(b.sponsor_bioguides) ? b.sponsor_bioguides : [];
    if (sponsors.length === 0) return;
    withSponsor++;
    for (const bg of sponsors) {
      if (!knownBioguides.has(bg)) {
        missingCounts.set(bg, (missingCounts.get(bg) || 0) + 1);
      }
    }
  });

  const totalMissingBills = [...missingCounts.values()].reduce((a, b) => a + b, 0);
  console.log(`    bills with sponsor: ${withSponsor.toLocaleString()}`);
  console.log(`    sponsor-bioguides not in entities: ${missingCounts.size.toLocaleString()} unique`);
  console.log(`    bills sponsored by missing bioguides: ${totalMissingBills.toLocaleString()} (${(totalMissingBills * 100 / withSponsor).toFixed(1)}% of sponsored bills invisible to thesis queries)`);

  const top = [...missingCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 30);
  console.log('    top 10:');
  for (const [bg, n] of top.slice(0, 10)) console.log(`      ${bg}: ${n} bills`);
  return { uniqueMissing: missingCounts.size, totalMissingBills, top, withSponsor };
}

function writeReport(a1, a2, a3) {
  const lines = [];
  lines.push('---');
  lines.push('title: "Thesis Internal Consistency Audit"');
  lines.push(`date: ${new Date().toISOString().slice(0, 10)}`);
  lines.push('lane: code');
  lines.push('status: open');
  lines.push('---');
  lines.push('');
  lines.push('# Thesis Internal Consistency Audit');
  lines.push('');
  lines.push(`**Generated:** ${new Date().toISOString()}`);
  lines.push(`**Script:** \`scripts/audit-thesis-internal-consistency.cjs\``);
  lines.push('');

  lines.push('## Audit 1 — Sponsorship-edge target bill integrity');
  lines.push('');
  lines.push(`- Sponsorship edges scanned: **${a1.edgesScanned.toLocaleString()}**`);
  lines.push(`- Dangling edges (target bill missing from bills.jsonl): **${a1.dangling.toLocaleString()} (${(a1.dangling * 100 / a1.edgesScanned).toFixed(2)}%)**`);
  if (a1.samples.length > 0) {
    lines.push('');
    lines.push('Sample dangling edges:');
    for (const s of a1.samples) lines.push(`- \`${s.from}\` → \`${s.to}\``);
  }
  lines.push('');

  lines.push('## Audit 2 — Position → vote integrity');
  lines.push('');
  lines.push(`- Position records scanned: **${a2.positionsScanned.toLocaleString()}**`);
  lines.push(`- Orphan positions (vote_id missing from votes.jsonl): **${a2.orphan.toLocaleString()} (${(a2.orphan * 100 / a2.positionsScanned).toFixed(2)}%)**`);
  lines.push(`- Distinct orphan vote_ids: **${a2.distinctOrphanVotes.toLocaleString()}**`);
  if (a2.samples && a2.samples.length > 0) {
    lines.push('');
    lines.push('Sample orphan vote_ids:');
    for (const s of a2.samples) lines.push(`- \`${s}\``);
  }
  lines.push('');
  lines.push('**Why this matters:** votingDivergence joins position records to vote outcomes via `vote_id`. Orphan positions are silently invisible — the legislator voted, but the query can\'t see it.');
  lines.push('');

  lines.push('## Audit 3 — Missing bioguide triage');
  lines.push('');
  lines.push(`- Unique sponsor bioguides not in entities.jsonl: **${a3.uniqueMissing.toLocaleString()}**`);
  lines.push(`- Bills sponsored by missing bioguides: **${a3.totalMissingBills.toLocaleString()} (${(a3.totalMissingBills * 100 / a3.withSponsor).toFixed(1)}% of sponsored bills)**`);
  lines.push('');
  lines.push('**Top 30 missing bioguides** (David\'s lane — Tier 3 editorial: each is a real legislator we need an entity record for so their sponsorships surface in thesis queries):');
  lines.push('');
  lines.push('| Bioguide | Bills sponsored |');
  lines.push('|---|---|');
  for (const [bg, n] of a3.top) lines.push(`| \`${bg}\` | ${n} |`);
  lines.push('');
  lines.push('Resolution path: David creates Politician profiles for any of these missing legislators that are still active or historically relevant. Once a profile lands with `signals.bioguide_id` set, the librarian auto-picks up their sponsorships on next graph reload.');
  lines.push('');

  fs.writeFileSync(REPORT, lines.join('\n'));
  console.log(`\n  report: ${REPORT}`);
}

(async () => {
  const a1 = await audit1_sponsorshipBillIntegrity();
  const a2 = await audit2_positionVoteIntegrity();
  const a3 = await audit3_missingBioguides();
  writeReport(a1, a2, a3);
})().catch((err) => { console.error('audit failed:', err); process.exit(1); });
