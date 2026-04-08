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
 * Usage:
 *   node scripts/contradiction-scanner.cjs                        # full scan
 *   node scripts/contradiction-scanner.cjs --check=shared-donors  # just shared donors
 *   node scripts/contradiction-scanner.cjs --check=both-sides     # just both-sides
 *   node scripts/contradiction-scanner.cjs --check=crossref       # just cross-ref
 *   node scripts/contradiction-scanner.cjs --check=opposition     # just opposition gaps
 */

const fs = require('fs');
const path = require('path');
const { walkDir, parseFrontmatter, writeReport } = require('./lib/shared.cjs');

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

// ─── 1. Shared-Donor Contradictions ───────────────────────────

function findSharedDonorContradictions(profiles, titleToProfile, cleanTitleToProfile) {
  console.log('\n═══ Shared-Donor Contradictions ═══');
  const contradictions = [];

  // Build donor → politicians map
  const donorToPoliticians = new Map();
  const politicians = profiles.filter(p => p.type === 'politician');

  for (const pol of politicians) {
    const allDonorNames = new Set();
    // From donors: frontmatter
    for (const d of pol.donors) allDonorNames.add(d.target);
    // From top-donors: frontmatter
    for (const d of pol.topDonors) allDonorNames.add(d);

    for (const donorName of allDonorNames) {
      if (!donorToPoliticians.has(donorName)) donorToPoliticians.set(donorName, []);
      donorToPoliticians.get(donorName).push(pol);
    }
  }

  // Find donors who fund politicians that oppose each other
  for (const [donorName, pols] of donorToPoliticians) {
    if (pols.length < 2) continue;

    for (let i = 0; i < pols.length; i++) {
      for (let j = i + 1; j < pols.length; j++) {
        const a = pols[i];
        const b = pols[j];

        // Check if they directly oppose each other
        const aOpposesB = a.opposes.some(o => {
          const resolved = resolveProfile(o.target, titleToProfile, cleanTitleToProfile);
          return resolved && resolved.title === b.title;
        });
        const bOpposesA = b.opposes.some(o => {
          const resolved = resolveProfile(o.target, titleToProfile, cleanTitleToProfile);
          return resolved && resolved.title === a.title;
        });

        if (aOpposesB || bOpposesA) {
          contradictions.push({
            type: 'opposition-funded',
            donor: donorName,
            politician1: { title: a.title, party: a.party, path: a.relPath },
            politician2: { title: b.title, party: b.party, path: b.relPath },
            direction: aOpposesB && bOpposesA ? 'mutual' : aOpposesB ? `${a.title} opposes ${b.title}` : `${b.title} opposes ${a.title}`,
          });
        }
      }
    }
  }

  console.log(`  Found ${contradictions.length} opposition-funded contradictions`);
  return contradictions;
}

// ─── 2. Both-Sides Donors ─────────────────────────────────────

function findBothSidesDonors(profiles, titleToProfile, cleanTitleToProfile) {
  console.log('\n═══ Both-Sides Donors ═══');
  const results = [];

  // Build donor → politicians with party
  const donorToPartyPols = new Map();
  const politicians = profiles.filter(p => p.type === 'politician' && p.party);

  for (const pol of politicians) {
    const allDonorNames = new Set();
    for (const d of pol.donors) allDonorNames.add(d.target);
    for (const d of pol.topDonors) allDonorNames.add(d);

    for (const donorName of allDonorNames) {
      if (!donorToPartyPols.has(donorName)) donorToPartyPols.set(donorName, { Democrat: [], Republican: [], Independent: [] });
      const bucket = donorToPartyPols.get(donorName);
      if (bucket[pol.party]) bucket[pol.party].push(pol);
    }
  }

  for (const [donorName, parties] of donorToPartyPols) {
    const dems = parties.Democrat || [];
    const reps = parties.Republican || [];
    if (dems.length > 0 && reps.length > 0) {
      const donorProfile = resolveProfile(donorName, titleToProfile, cleanTitleToProfile);
      results.push({
        donor: donorName,
        donorType: donorProfile ? donorProfile.type : 'unknown',
        donorPath: donorProfile ? donorProfile.relPath : null,
        democrats: dems.map(p => ({ title: p.title, state: p.state, chamber: p.chamber, path: p.relPath })),
        republicans: reps.map(p => ({ title: p.title, state: p.state, chamber: p.chamber, path: p.relPath })),
        totalFunded: dems.length + reps.length,
        storyPotential: dems.length >= 2 && reps.length >= 2 ? 'high' : dems.length >= 1 && reps.length >= 1 ? 'medium' : 'low',
      });
    }
  }

  // Sort by total funded descending
  results.sort((a, b) => b.totalFunded - a.totalFunded);

  console.log(`  Found ${results.length} both-sides donors`);
  console.log(`  High story potential: ${results.filter(r => r.storyPotential === 'high').length}`);
  console.log(`  Medium story potential: ${results.filter(r => r.storyPotential === 'medium').length}`);
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

  const { profiles, titleToProfile, cleanTitleToProfile } = loadVault();
  console.log(`Loaded ${profiles.length} profiles`);

  let contradictions = [];
  let bothSides = [];
  let mismatches = [];
  let gaps = [];

  if (CHECK === 'all' || CHECK === 'shared-donors') {
    contradictions = findSharedDonorContradictions(profiles, titleToProfile, cleanTitleToProfile);
  }
  if (CHECK === 'all' || CHECK === 'both-sides') {
    bothSides = findBothSidesDonors(profiles, titleToProfile, cleanTitleToProfile);
  }
  if (CHECK === 'all' || CHECK === 'crossref') {
    mismatches = findCrossRefMismatches(profiles, titleToProfile, cleanTitleToProfile);
  }
  if (CHECK === 'all' || CHECK === 'opposition') {
    gaps = findOppositionGaps(profiles, titleToProfile, cleanTitleToProfile);
  }

  const jsonData = { contradictions, bothSides, mismatches, gaps, scannedAt: new Date().toISOString(), profileCount: profiles.length };
  const markdown = generateReport(contradictions, bothSides, mismatches, gaps);

  const { jsonPath, mdPath } = writeReport('contradiction-scanner', jsonData, markdown);
  console.log(`\nReport: ${mdPath}`);
  console.log(`JSON:   ${jsonPath}`);
}

main();
