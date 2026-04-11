/**
 * contradiction-scanner.cjs — Shared-Donor Contradiction Scanner
 *
 * Finds politicians on opposing sides who share the same donors.
 * These are the money stories: a donor funds both a progressive and
 * a conservative — what do they actually want?
 *
 * Checks:
 *   1. Shared-donor contradictions — same donor funds politicians who oppose each other
 *   2. Both-sides donors — donors funding politicians across party lines
 *   3. Cross-reference mismatches — A lists B as donor, B doesn't list A
 *   4. Opposition gaps — adversarial connections miscategorized as related
 *
 * As of Phase 3 Part 2b (2026-04-11), checks 1 and 2 read from the
 * canonical JSONL edge store at data/relationships.jsonl via
 * scripts/lib/relationships-store.cjs instead of walking profile
 * frontmatter. This is a QUERY over existing typed edges, not a producer —
 * the scanner doesn't create new edges. Bothsides detection becomes:
 *
 *   queryEdges({ type: 'monetary' })
 *     group by from (donor)
 *     for each donor, look up recipient party (via quick politician walk)
 *     if donor's recipients include both Dem and Rep → bothsides result
 *
 * Checks 3 and 4 still walk profile frontmatter because they're
 * FRONTMATTER INTEGRITY linters — they catch the exact kind of bidirectional
 * drift that the JSONL store solves by construction. Once all consumers are
 * rewired in Phase 3 Parts 3-4, checks 3 and 4 become deprecated — they'll
 * never fire because every new edge goes through the canonical store.
 *
 * Usage:
 *   node scripts/contradiction-scanner.cjs                        # full scan
 *   node scripts/contradiction-scanner.cjs --check=shared-donors  # just shared donors
 *   node scripts/contradiction-scanner.cjs --check=both-sides     # just both-sides
 *   node scripts/contradiction-scanner.cjs --check=crossref       # just cross-ref (frontmatter)
 *   node scripts/contradiction-scanner.cjs --check=opposition     # just opposition gaps (frontmatter)
 */

const fs = require('fs');
const path = require('path');
const { walkDir, parseFrontmatter, writeReport } = require('./lib/shared.cjs');
const relationshipsStore = require('./lib/relationships-store.cjs');
const { normalizeTitle } = require('./lib/relationship-edge-validator.cjs');

const CONTENT_DIR = process.env.CONTENT_DIR || path.join(__dirname, '..', 'content');
const CHECK_FLAG = process.argv.find(a => a.startsWith('--check='));
const CHECK = CHECK_FLAG ? CHECK_FLAG.split('=')[1] : 'all';

// ─── Parse Wikilinks ──────────────────────────────────────────

function parseWikilinks(value) {
  if (!value || typeof value !== 'string') return [];
  const matches = value.match(/\[\[([^\]]+)\]\]/g) || [];
  return matches.map(m => {
    const inner = m.replace('[[', '').replace(']]', '');
    const display = inner.split('|').pop() || inner;
    const target = inner.split('|')[0];
    return { display: display.trim(), target: target.trim() };
  });
}

// ─── Load Vault ───────────────────────────────────────────────

function loadVault() {
  const files = walkDir(CONTENT_DIR);
  const profiles = [];
  const titleToProfile = new Map();
  const cleanTitleToProfile = new Map();

  for (const filePath of files) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const { data, body } = parseFrontmatter(content);
      const title = data.title || path.basename(filePath, '.md');
      const relPath = path.relative(CONTENT_DIR, filePath).replace(/\\/g, '/');

      const profile = {
        filePath, relPath, title, data, body,
        type: data.type || 'unknown',
        party: data.party || null,
        chamber: data.chamber || null,
        state: data.state || null,
        issues: Array.isArray(data.issues) ? data.issues : (data.issues ? [data.issues] : []),
        donors: parseWikilinks(data.donors),
        related: parseWikilinks(data.related),
        opposes: parseWikilinks(data.opposes),
        topDonors: Array.isArray(data['top-donors']) ? data['top-donors'] : [],
        politiciansFunded: data['politicians-funded'] ? parseWikilinks(data['politicians-funded']) : [],
      };

      profiles.push(profile);
      titleToProfile.set(title, profile);
      const cleanTitle = title.replace(/^_/, '').replace(/\s+Master\s+Profile$/i, '').trim();
      cleanTitleToProfile.set(cleanTitle, profile);
    } catch { /* skip */ }
  }

  return { profiles, titleToProfile, cleanTitleToProfile };
}

function resolveProfile(name, titleToProfile, cleanTitleToProfile) {
  const clean = name.replace(/^_/, '').replace(/\s+Master\s+Profile$/i, '').trim();
  return titleToProfile.get(name) || cleanTitleToProfile.get(clean) || cleanTitleToProfile.get(name) || null;
}

// ─── Politician metadata loader (for edge-based checks) ──────

/**
 * Build a map from normalized politician title → { party, state, chamber, path }.
 * Used by the JSONL-driven bothsides / shared-donor checks — they query
 * monetary edges from the canonical store but need party metadata to
 * classify donors as "both sides" or not. Party isn't denormalized on
 * the edge schema because it's profile-level metadata, not relationship
 * metadata.
 *
 * This is a quick walk (~250 politician profiles out of 1,832 total),
 * so it's cheap compared to the O(N) frontmatter parse the old scanner
 * did. It only reads politician files.
 */
function loadPoliticianMetadata() {
  const files = walkDir(CONTENT_DIR, '.md');
  const byTitle = new Map();
  for (const filePath of files) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const { data } = parseFrontmatter(content);
      if (!data || data.type !== 'politician') continue;
      const rawTitle = data.title;
      if (!rawTitle) continue;
      const title = normalizeTitle(rawTitle);
      if (!title) continue;
      byTitle.set(title, {
        title,
        party: data.party || null,
        state: data.state || null,
        chamber: data.chamber || null,
        path: path.relative(CONTENT_DIR, filePath).replace(/\\/g, '/'),
        type: 'politician',
      });
    } catch {
      /* skip */
    }
  }
  return byTitle;
}

/**
 * Build a map from normalized donor/entity title → { type, path } so
 * the bothsides report can tag each donor with its profile type
 * (donor vs corporation vs pac vs lobbying-firm etc).
 */
function loadDonorEntityMetadata() {
  const files = walkDir(CONTENT_DIR, '.md');
  const byTitle = new Map();
  const DONOR_LIKE = new Set([
    'donor',
    'corporation',
    'pac',
    'lobbying-firm',
    'think-tank',
    'media-profile',
    'entity',
  ]);
  for (const filePath of files) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const { data } = parseFrontmatter(content);
      if (!data || !data.type) continue;
      if (!DONOR_LIKE.has(data.type)) continue;
      const rawTitle = data.title;
      if (!rawTitle) continue;
      const title = normalizeTitle(rawTitle);
      if (!title) continue;
      byTitle.set(title, {
        title,
        type: data.type,
        sector: data.sector || null,
        path: path.relative(CONTENT_DIR, filePath).replace(/\\/g, '/'),
      });
    } catch {
      /* skip */
    }
  }
  return byTitle;
}

// ─── 1. Shared-Donor Contradictions (Phase 3 Part 2b — reads JSONL) ─

/**
 * Find donors whose monetary edges touch politicians that are connected
 * by a political-opposition edge. Fully driven by data/relationships.jsonl:
 *
 *   1. Group all monetary edges by `from` (donor).
 *   2. For each donor with 2+ recipients, enumerate pairs.
 *   3. For each pair (A, B), check the store for a political-opposition
 *      edge between A and B (in either direction).
 *   4. If yes, emit an opposition-funded contradiction.
 *
 * This replaces the old walk-frontmatter-and-parse-wikilinks approach.
 * The old version had to build its own donor→politicians map from
 * `donors:` / `top-donors:` fields; the new version reads the canonical
 * edge store where every monetary edge is already typed and indexed.
 */
function findSharedDonorContradictions(politicianMeta) {
  console.log('\n═══ Shared-Donor Contradictions (via JSONL) ═══');
  const contradictions = [];

  // Load edges once — cached in module scope by relationships-store.cjs
  const monetary = relationshipsStore.queryEdges({ type: 'monetary' });
  const opposition = relationshipsStore.queryEdges({ type: 'political-opposition' });

  // Build fast lookup: for each unordered pair {A, B}, does an opposition edge exist?
  const oppositionPairs = new Set();
  for (const e of opposition) {
    const a = e.from;
    const b = e.to;
    if (!a || !b) continue;
    const key = a < b ? `${a}||${b}` : `${b}||${a}`;
    oppositionPairs.add(key);
  }

  // Group monetary edges by donor (`from`)
  const donorToRecipients = new Map();
  for (const e of monetary) {
    if (!e.from || !e.to) continue;
    // Only count edges whose recipient is a politician with known party
    const meta = politicianMeta.get(e.to);
    if (!meta || !meta.party) continue;
    if (!donorToRecipients.has(e.from)) donorToRecipients.set(e.from, []);
    donorToRecipients.get(e.from).push(meta);
  }

  for (const [donorName, recipients] of donorToRecipients) {
    if (recipients.length < 2) continue;
    for (let i = 0; i < recipients.length; i++) {
      for (let j = i + 1; j < recipients.length; j++) {
        const a = recipients[i];
        const b = recipients[j];
        if (a.title === b.title) continue;
        const key = a.title < b.title ? `${a.title}||${b.title}` : `${b.title}||${a.title}`;
        if (oppositionPairs.has(key)) {
          contradictions.push({
            type: 'opposition-funded',
            donor: donorName,
            politician1: { title: a.title, party: a.party, path: a.path },
            politician2: { title: b.title, party: b.party, path: b.path },
            direction: 'opposition-edge-exists',
          });
        }
      }
    }
  }

  console.log(`  Monetary edges loaded: ${monetary.length}`);
  console.log(`  Opposition edges loaded: ${opposition.length}`);
  console.log(`  Donors with 2+ politician recipients: ${[...donorToRecipients.values()].filter(r => r.length >= 2).length}`);
  console.log(`  Found ${contradictions.length} opposition-funded contradictions`);
  return contradictions;
}

// ─── 2. Both-Sides Donors (Phase 3 Part 2b — reads JSONL) ────

/**
 * Find donors whose monetary edges span both Democrat and Republican
 * recipients. Fully driven by data/relationships.jsonl + the politician
 * metadata map (for party lookup).
 *
 * Story potential heuristic is unchanged from the old version:
 *   - high:   ≥2 Dems AND ≥2 Reps
 *   - medium: ≥1 Dem AND ≥1 Rep
 */
function findBothSidesDonors(politicianMeta, donorEntityMeta) {
  console.log('\n═══ Both-Sides Donors (via JSONL) ═══');
  const results = [];

  const monetary = relationshipsStore.queryEdges({ type: 'monetary' });

  // Group by donor → { Democrat: [...], Republican: [...], Independent: [...] }
  const donorToPartyPols = new Map();
  for (const e of monetary) {
    if (!e.from || !e.to) continue;
    const meta = politicianMeta.get(e.to);
    if (!meta || !meta.party) continue;
    if (!donorToPartyPols.has(e.from)) {
      donorToPartyPols.set(e.from, { Democrat: [], Republican: [], Independent: [] });
    }
    const bucket = donorToPartyPols.get(e.from);
    if (bucket[meta.party]) bucket[meta.party].push(meta);
  }

  for (const [donorName, parties] of donorToPartyPols) {
    const dems = parties.Democrat || [];
    const reps = parties.Republican || [];
    if (dems.length === 0 || reps.length === 0) continue;

    // Dedupe recipients per party — a donor may have multiple monetary
    // edges to the same politician (different cycles), but for
    // storytelling we want one row per recipient.
    const uniqueDems = [...new Map(dems.map((p) => [p.title, p])).values()];
    const uniqueReps = [...new Map(reps.map((p) => [p.title, p])).values()];

    const donorProfile = donorEntityMeta.get(donorName) || null;
    results.push({
      donor: donorName,
      donorType: donorProfile ? donorProfile.type : 'unknown',
      donorPath: donorProfile ? donorProfile.path : null,
      democrats: uniqueDems.map((p) => ({ title: p.title, state: p.state, chamber: p.chamber, path: p.path })),
      republicans: uniqueReps.map((p) => ({ title: p.title, state: p.state, chamber: p.chamber, path: p.path })),
      totalFunded: uniqueDems.length + uniqueReps.length,
      storyPotential:
        uniqueDems.length >= 2 && uniqueReps.length >= 2
          ? 'high'
          : uniqueDems.length >= 1 && uniqueReps.length >= 1
          ? 'medium'
          : 'low',
    });
  }

  results.sort((a, b) => b.totalFunded - a.totalFunded);

  console.log(`  Monetary edges loaded: ${monetary.length}`);
  console.log(`  Donors with ≥1 recipient: ${donorToPartyPols.size}`);
  console.log(`  Found ${results.length} both-sides donors`);
  console.log(`  High story potential: ${results.filter((r) => r.storyPotential === 'high').length}`);
  console.log(`  Medium story potential: ${results.filter((r) => r.storyPotential === 'medium').length}`);
  return results;
}

// ─── 3. Cross-Reference Mismatches ────────────────────────────

function findCrossRefMismatches(profiles, titleToProfile, cleanTitleToProfile) {
  console.log('\n═══ Cross-Reference Mismatches ═══');
  const mismatches = [];

  for (const profile of profiles) {
    // Check donors: if A says B is a donor, does B's profile mention A?
    for (const donor of profile.donors) {
      const donorProfile = resolveProfile(donor.target, titleToProfile, cleanTitleToProfile);
      if (!donorProfile) continue;

      // Check if the donor lists this profile in politicians-funded or related
      const donorMentionsProfile =
        donorProfile.politiciansFunded.some(p => {
          const resolved = resolveProfile(p.target, titleToProfile, cleanTitleToProfile);
          return resolved && resolved.title === profile.title;
        }) ||
        donorProfile.related.some(r => {
          const resolved = resolveProfile(r.target, titleToProfile, cleanTitleToProfile);
          return resolved && resolved.title === profile.title;
        }) ||
        (donorProfile.body && donorProfile.body.includes(profile.title));

      if (!donorMentionsProfile) {
        mismatches.push({
          type: 'donor-not-reciprocated',
          profile: { title: profile.title, path: profile.relPath },
          donor: { title: donorProfile.title, path: donorProfile.relPath },
          detail: `${profile.title} lists ${donorProfile.title} as donor, but ${donorProfile.title} doesn't reference ${profile.title}`,
        });
      }
    }
  }

  console.log(`  Found ${mismatches.length} cross-reference mismatches`);
  return mismatches;
}

// ─── 4. Opposition Gaps ───────────────────────────────────────

function findOppositionGaps(profiles, titleToProfile, cleanTitleToProfile) {
  console.log('\n═══ Opposition Gaps ═══');
  const gaps = [];

  for (const profile of profiles) {
    // Check related: connections — are any actually adversarial?
    for (const rel of profile.related) {
      const relProfile = resolveProfile(rel.target, titleToProfile, cleanTitleToProfile);
      if (!relProfile) continue;

      // If the related profile opposes this one, it's miscategorized
      const relOpposesThis = relProfile.opposes.some(o => {
        const resolved = resolveProfile(o.target, titleToProfile, cleanTitleToProfile);
        return resolved && resolved.title === profile.title;
      });

      if (relOpposesThis) {
        gaps.push({
          type: 'should-be-opposes',
          profile: { title: profile.title, path: profile.relPath },
          target: { title: relProfile.title, path: relProfile.relPath },
          detail: `${profile.title} has ${relProfile.title} in "related:" but ${relProfile.title} has ${profile.title} in "opposes:"`,
        });
      }

      // Cross-party politicians in related: might be opposition gaps
      if (profile.type === 'politician' && relProfile.type === 'politician' &&
          profile.party && relProfile.party && profile.party !== relProfile.party) {
        // Flag as potential — needs human review
        gaps.push({
          type: 'cross-party-in-related',
          profile: { title: profile.title, party: profile.party, path: profile.relPath },
          target: { title: relProfile.title, party: relProfile.party, path: relProfile.relPath },
          detail: `${profile.title} (${profile.party}) has ${relProfile.title} (${relProfile.party}) in "related:" — verify this isn't adversarial`,
        });
      }
    }
  }

  console.log(`  Found ${gaps.filter(g => g.type === 'should-be-opposes').length} definite miscategorizations`);
  console.log(`  Found ${gaps.filter(g => g.type === 'cross-party-in-related').length} cross-party connections to review`);
  return gaps;
}

// ─── Report ───────────────────────────────────────────────────

function generateReport(contradictions, bothSides, mismatches, gaps) {
  const lines = [
    '# Contradiction Scanner Report',
    `_Generated: ${new Date().toISOString().split('T')[0]}_`,
    '',
  ];

  // Summary
  lines.push('## Summary');
  lines.push(`| Check | Count |`);
  lines.push(`|-------|-------|`);
  lines.push(`| Opposition-funded contradictions | ${contradictions.length} |`);
  lines.push(`| Both-sides donors | ${bothSides.length} |`);
  lines.push(`| Cross-reference mismatches | ${mismatches.length} |`);
  lines.push(`| Opposition gaps | ${gaps.length} |`);
  lines.push('');

  // Both-sides donors (most story-worthy)
  if (bothSides.length > 0) {
    lines.push('## Both-Sides Donors (Story Opportunities)');
    lines.push('');
    const high = bothSides.filter(r => r.storyPotential === 'high');
    const medium = bothSides.filter(r => r.storyPotential === 'medium');

    if (high.length > 0) {
      lines.push('### High Story Potential');
      for (const d of high.slice(0, 20)) {
        lines.push(`\n**${d.donor}** (${d.donorType}) — funds ${d.totalFunded} politicians`);
        lines.push(`- Democrats: ${d.democrats.map(p => p.title).join(', ')}`);
        lines.push(`- Republicans: ${d.republicans.map(p => p.title).join(', ')}`);
      }
      lines.push('');
    }

    if (medium.length > 0) {
      lines.push('### Medium Story Potential');
      for (const d of medium.slice(0, 20)) {
        lines.push(`- **${d.donor}**: ${d.democrats.map(p => p.title).join(', ')} (D) + ${d.republicans.map(p => p.title).join(', ')} (R)`);
      }
      lines.push('');
    }
  }

  // Opposition-funded
  if (contradictions.length > 0) {
    lines.push('## Opposition-Funded Contradictions');
    lines.push('_Same donor funds politicians who directly oppose each other_');
    lines.push('');
    for (const c of contradictions) {
      lines.push(`- **${c.donor}** funds both ${c.politician1.title} (${c.politician1.party}) and ${c.politician2.title} (${c.politician2.party}) — ${c.direction}`);
    }
    lines.push('');
  }

  // Cross-ref mismatches
  if (mismatches.length > 0) {
    lines.push('## Cross-Reference Mismatches');
    lines.push('_Profile A says B is a donor, but B has no mention of A_');
    lines.push('');
    for (const m of mismatches.slice(0, 50)) {
      lines.push(`- ${m.detail}`);
    }
    if (mismatches.length > 50) lines.push(`- _... and ${mismatches.length - 50} more_`);
    lines.push('');
  }

  // Opposition gaps
  if (gaps.length > 0) {
    const definite = gaps.filter(g => g.type === 'should-be-opposes');
    const crossParty = gaps.filter(g => g.type === 'cross-party-in-related');

    if (definite.length > 0) {
      lines.push('## Definite Miscategorizations (should be opposes:)');
      for (const g of definite) {
        lines.push(`- ${g.detail}`);
      }
      lines.push('');
    }

    if (crossParty.length > 0) {
      lines.push('## Cross-Party Connections to Review');
      for (const g of crossParty.slice(0, 30)) {
        lines.push(`- ${g.detail}`);
      }
      if (crossParty.length > 30) lines.push(`- _... and ${crossParty.length - 30} more_`);
      lines.push('');
    }
  }

  return lines.join('\n');
}

// ─── Main ─────────────────────────────────────────────────────

function main() {
  console.log('Contradiction Scanner — The Donor Map');
  console.log(`Scanning: ${CONTENT_DIR}`);
  console.log(`Check: ${CHECK}`);

  let contradictions = [];
  let bothSides = [];
  let mismatches = [];
  let gaps = [];

  // Edge-based checks (1 + 2) read from data/relationships.jsonl. Load
  // politician + donor metadata only if we need them for these checks —
  // the frontmatter-based checks (3 + 4) bring their own vault walker.
  const needsEdgeChecks =
    CHECK === 'all' || CHECK === 'shared-donors' || CHECK === 'both-sides';
  let politicianMeta = null;
  let donorEntityMeta = null;
  if (needsEdgeChecks) {
    const edgeCount = relationshipsStore.loadEdges().length;
    console.log(`Loaded ${edgeCount} edges from data/relationships.jsonl`);
    politicianMeta = loadPoliticianMetadata();
    console.log(`  Politician metadata: ${politicianMeta.size} profiles`);
    donorEntityMeta = loadDonorEntityMetadata();
    console.log(`  Donor/entity metadata: ${donorEntityMeta.size} profiles`);
  }

  // Frontmatter-based checks (3 + 4) walk profile frontmatter to catch
  // bidirectional drift. These are linters, not queries.
  const needsFrontmatterWalk =
    CHECK === 'all' || CHECK === 'crossref' || CHECK === 'opposition';
  let vaultBundle = null;
  if (needsFrontmatterWalk) {
    vaultBundle = loadVault();
    console.log(`Loaded ${vaultBundle.profiles.length} profiles for frontmatter linters`);
  }

  if (CHECK === 'all' || CHECK === 'shared-donors') {
    contradictions = findSharedDonorContradictions(politicianMeta);
  }
  if (CHECK === 'all' || CHECK === 'both-sides') {
    bothSides = findBothSidesDonors(politicianMeta, donorEntityMeta);
  }
  if (CHECK === 'all' || CHECK === 'crossref') {
    mismatches = findCrossRefMismatches(
      vaultBundle.profiles,
      vaultBundle.titleToProfile,
      vaultBundle.cleanTitleToProfile
    );
  }
  if (CHECK === 'all' || CHECK === 'opposition') {
    gaps = findOppositionGaps(
      vaultBundle.profiles,
      vaultBundle.titleToProfile,
      vaultBundle.cleanTitleToProfile
    );
  }

  const jsonData = {
    contradictions,
    bothSides,
    mismatches,
    gaps,
    scannedAt: new Date().toISOString(),
    profileCount: vaultBundle ? vaultBundle.profiles.length : null,
    edgeCount: needsEdgeChecks ? relationshipsStore.loadEdges().length : null,
    source: 'phase3-part2b',
  };
  const markdown = generateReport(contradictions, bothSides, mismatches, gaps);

  const { jsonPath, mdPath } = writeReport('contradiction-scanner', jsonData, markdown);
  console.log(`\nReport: ${mdPath}`);
  console.log(`JSON:   ${jsonPath}`);
}

main();
