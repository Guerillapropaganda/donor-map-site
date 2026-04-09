/**
 * editorial-priority.cjs — A+ Editorial Review Priority Queue
 *
 * Ranks ready (B) profiles by how close they are to A+ promotion.
 * Research Claude uses this to decide which profiles to review first.
 *
 * Score formula (0-100):
 *   connections (25%) + source_density (30%) + corroboration (20%)
 *   + body_length (10%) - gap_penalty (15%)
 *
 * Usage:
 *   node scripts/editorial-priority.cjs                    # all batches
 *   node scripts/editorial-priority.cjs --batch=congress    # Congress only
 *   node scripts/editorial-priority.cjs --batch=donors      # Donors only
 *   node scripts/editorial-priority.cjs --top=20            # top 20 across all
 *   node scripts/editorial-priority.cjs --json              # JSON output
 */

const fs = require('fs');
const path = require('path');
const { walkDir, parseFrontmatter, writeReport } = require('./lib/shared.cjs');

const CONTENT_DIR = process.env.CONTENT_DIR || path.join(__dirname, '..', 'content');
const BATCH_FLAG = process.argv.find(a => a.startsWith('--batch='));
const BATCH_FILTER = BATCH_FLAG ? BATCH_FLAG.split('=')[1].toLowerCase() : null;
const TOP_FLAG = process.argv.find(a => a.startsWith('--top='));
const TOP_N = TOP_FLAG ? parseInt(TOP_FLAG.split('=')[1]) : null;
const JSON_OUTPUT = process.argv.includes('--json');

// ─── Batch Classification ─────────────────────────────────────

function getBatch(profile) {
  const type = profile.type;
  const chamber = (profile.chamber || '').toLowerCase();

  if (type === 'politician') {
    if (chamber === 'house' || chamber === 'senate') return 'congress';
    if (chamber === 'presidential' || chamber === 'governor' || chamber === 'cabinet' || chamber === 'scotus') return 'executive';
    return 'congress'; // default politicians to congress batch
  }
  if (type === 'donor') return 'donors';
  if (type === 'corporation') return 'corporations';
  if (type === 'think-tank' || type === 'pac') return 'think-tanks-pacs';
  if (type === 'lobbying-firm' || type === 'media-profile') return 'lobbying-media';
  return 'other';
}

const BATCH_ORDER = ['congress', 'executive', 'donors', 'corporations', 'think-tanks-pacs', 'lobbying-media', 'other'];

// ─── Count Wikilinks ──────────────────────────────────────────

function countWikilinks(value) {
  if (!value || typeof value !== 'string') return 0;
  const matches = value.match(/\[\[([^\]]+)\]\]/g);
  return matches ? matches.length : 0;
}

// ─── Priority Score ───────────────────────────────────────────

function computeScore(profile) {
  // Connections: related + donors + opposes wikilink count
  const connectionCount =
    countWikilinks(profile.related) +
    countWikilinks(profile.donors) +
    countWikilinks(profile.opposes);
  const connectionScore = Math.min(connectionCount / 10, 1.0) * 100;

  // Source density: Tier 1 source types count
  const sourceTypes = Array.isArray(profile.sourceTypes) ? profile.sourceTypes : [];
  const sourceDensityScore = Math.min(sourceTypes.length / 4, 1.0) * 100;

  // Corroboration count
  const corrobCount = parseInt(profile.corroborationCount) || 0;
  const corroborationScore = Math.min(corrobCount / 3, 1.0) * 100;

  // Body length
  const bodyLen = (profile.body || '').length;
  const bodyScore = Math.min(bodyLen / 5000, 1.0) * 100;

  // Gap penalty: fewer gaps = higher score
  const knownGaps = Array.isArray(profile.knownGaps) ? profile.knownGaps : [];
  const gapPenalty = Math.max(0, 1 - knownGaps.length / 5) * 100;

  const score =
    connectionScore * 0.25 +
    sourceDensityScore * 0.30 +
    corroborationScore * 0.20 +
    bodyScore * 0.10 +
    gapPenalty * 0.15;

  return {
    score: Math.round(score * 10) / 10,
    breakdown: {
      connections: Math.round(connectionScore),
      sourceDensity: Math.round(sourceDensityScore),
      corroboration: Math.round(corroborationScore),
      bodyLength: Math.round(bodyScore),
      gapPenalty: Math.round(gapPenalty),
    },
    raw: { connectionCount, sourceTypeCount: sourceTypes.length, corrobCount, bodyLen, gapCount: knownGaps.length },
  };
}

// ─── Load & Score ─────────────────────────────────────────────

function loadAndScore() {
  const files = walkDir(CONTENT_DIR);
  const scored = [];

  for (const filePath of files) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const { data, body } = parseFrontmatter(content);

      // Only ready (B) profiles
      if (data['content-readiness'] !== 'ready') continue;

      const title = data.title || path.basename(filePath, '.md');
      const relPath = path.relative(CONTENT_DIR, filePath).replace(/\\/g, '/');

      const profile = {
        title,
        relPath,
        type: data.type || 'unknown',
        chamber: data.chamber,
        party: data.party,
        state: data.state || data['state-abbr'],
        related: data.related,
        donors: data.donors,
        opposes: data.opposes,
        sourceTypes: data['source-types'],
        corroborationCount: data['corroboration-count'],
        knownGaps: data['known-gaps'],
        lastEnriched: data['last-enriched'],
        editorialResult: data['editorial-result'],
        body,
      };

      const batch = getBatch(profile);
      const { score, breakdown, raw } = computeScore(profile);

      scored.push({
        title,
        path: relPath,
        type: profile.type,
        chamber: profile.chamber,
        party: profile.party,
        batch,
        score,
        breakdown,
        raw,
        lastEnriched: profile.lastEnriched,
        editorialResult: profile.editorialResult,
        sourceTypes: profile.sourceTypes || [],
        knownGaps: profile.knownGaps || [],
      });
    } catch { /* skip */ }
  }

  // Sort by score descending, tiebreak by lastEnriched (recent first)
  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    const aDate = a.lastEnriched || '1970-01-01';
    const bDate = b.lastEnriched || '1970-01-01';
    return bDate.localeCompare(aDate);
  });

  return scored;
}

// ─── Report ───────────────────────────────────────────────────

function main() {
  console.log('Editorial Priority Queue — The Donor Map');
  console.log(`Content: ${CONTENT_DIR}`);
  if (BATCH_FILTER) console.log(`Batch filter: ${BATCH_FILTER}`);
  if (TOP_N) console.log(`Top: ${TOP_N}`);
  console.log('');

  let scored = loadAndScore();
  console.log(`Total ready (B) profiles: ${scored.length}`);

  // Filter by batch
  if (BATCH_FILTER) {
    scored = scored.filter(s => s.batch === BATCH_FILTER);
    console.log(`Filtered to ${BATCH_FILTER}: ${scored.length}`);
  }

  // Skip already-passed profiles
  const deferred = scored.filter(s => s.editorialResult === 'defer');
  const blocked = scored.filter(s => s.editorialResult === 'block');
  const passed = scored.filter(s => s.editorialResult === 'pass');
  const unreviewed = scored.filter(s => !s.editorialResult);

  console.log(`\nReview status: ${unreviewed.length} unreviewed, ${blocked.length} blocked, ${deferred.length} deferred, ${passed.length} passed`);

  // Batch summary
  console.log('\n═══ Batch Summary ═══');
  for (const batch of BATCH_ORDER) {
    const batchProfiles = scored.filter(s => s.batch === batch);
    if (batchProfiles.length === 0) continue;
    const avgScore = Math.round(batchProfiles.reduce((sum, p) => sum + p.score, 0) / batchProfiles.length * 10) / 10;
    const topScore = batchProfiles[0]?.score || 0;
    console.log(`  ${batch}: ${batchProfiles.length} profiles (avg ${avgScore}, top ${topScore})`);
  }

  // Top profiles
  let display = TOP_N ? scored.slice(0, TOP_N) : scored;
  if (!TOP_N && !BATCH_FILTER) display = scored.slice(0, 30); // default top 30

  console.log(`\n═══ Priority Queue (${display.length} shown) ═══\n`);
  console.log('Rank | Score | Batch        | Profile                              | Sources | Gaps | Connections');
  console.log('-----|-------|--------------|--------------------------------------|---------|------|------------');

  for (let i = 0; i < display.length; i++) {
    const p = display[i];
    const name = p.title.replace(/ Master Profile$/, '').replace(/^_/, '').slice(0, 36).padEnd(36);
    const batch = p.batch.slice(0, 12).padEnd(12);
    const sources = (p.sourceTypes.join(',') || 'none').slice(0, 7).padEnd(7);
    const gaps = String(p.raw.gapCount).padEnd(4);
    const conns = String(p.raw.connectionCount);
    const status = p.editorialResult ? ` [${p.editorialResult}]` : '';
    console.log(`${String(i + 1).padStart(4)} | ${String(p.score).padStart(5)} | ${batch} | ${name} | ${sources} | ${gaps} | ${conns}${status}`);
  }

  // JSON output
  if (JSON_OUTPUT) {
    const jsonData = {
      generated: new Date().toISOString(),
      totalReady: scored.length,
      batches: {},
      profiles: scored,
    };
    for (const batch of BATCH_ORDER) {
      jsonData.batches[batch] = scored.filter(s => s.batch === batch).length;
    }
    const outPath = path.join(__dirname, '..', 'reports', 'editorial-priority.json');
    const dir = path.dirname(outPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(outPath, JSON.stringify(jsonData, null, 2));
    console.log(`\nJSON written: ${outPath}`);
  }

  // Markdown report
  const mdLines = [
    '# Editorial Priority Queue',
    `_Generated: ${new Date().toISOString().split('T')[0]}_`,
    '',
    `**${scored.length} ready (B) profiles** queued for A+ review`,
    '',
    '## Batch Summary',
    '| Batch | Count | Avg Score | Top Score |',
    '|-------|-------|-----------|-----------|',
  ];

  for (const batch of BATCH_ORDER) {
    const bp = scored.filter(s => s.batch === batch);
    if (bp.length === 0) continue;
    const avg = Math.round(bp.reduce((s, p) => s + p.score, 0) / bp.length * 10) / 10;
    mdLines.push(`| ${batch} | ${bp.length} | ${avg} | ${bp[0]?.score || 0} |`);
  }

  mdLines.push('', '## Top 30 Profiles', '| Rank | Score | Profile | Type | Sources | Gaps |', '|------|-------|---------|------|---------|------|');
  for (let i = 0; i < Math.min(30, scored.length); i++) {
    const p = scored[i];
    const name = p.title.replace(/ Master Profile$/, '').replace(/^_/, '');
    mdLines.push(`| ${i + 1} | ${p.score} | ${name} | ${p.type} (${p.batch}) | ${(p.sourceTypes || []).join(', ') || 'none'} | ${p.raw.gapCount} |`);
  }

  writeReport('editorial-priority', { profiles: scored.slice(0, 100), batches: {} }, mdLines.join('\n'));
}

main();
