/**
 * fix-fec-ids.cjs — FEC Candidate ID Validator & Fixer
 *
 * Scans all politician .md files, validates FEC candidate IDs against
 * chamber/state metadata, queries the FEC API for corrections, and
 * optionally writes fixes in place.
 *
 * Usage:
 *   node scripts/fix-fec-ids.cjs                # dry run report (queries FEC API)
 *   node scripts/fix-fec-ids.cjs --skip-api     # dry run, local validation only
 *   node scripts/fix-fec-ids.cjs --write        # apply fixes
 *   node scripts/fix-fec-ids.cjs --bioguide     # also flag missing bioguide IDs
 *
 * Set FEC_API_KEY env var for higher rate limits (DEMO_KEY is very restricted).
 */

const fs = require('fs');
const path = require('path');
const { walkDir, parseFrontmatter, fetchJSON, RateLimiter, log, logError } = require('./lib/shared.cjs');

const CONTENT_DIR = path.join(__dirname, '..', 'content', 'Politicians');
const WRITE_MODE = process.argv.includes('--write');
const CHECK_BIOGUIDE = process.argv.includes('--bioguide');
const FEC_API_KEY = process.env.FEC_API_KEY || 'DEMO_KEY';
const FEC_BASE = 'https://api.open.fec.gov/v1';

// DEMO_KEY: very aggressive rate limits. Be very conservative.
// With a real API key, bump to 120/min.
const rateLimiter = new RateLimiter(FEC_API_KEY === 'DEMO_KEY' ? 8 : 60, 60000);
const SKIP_API = process.argv.includes('--skip-api');

// ─── State Code Mapping ────────────────────────────────────────

const STATE_ABBR_MAP = {
  'AL': 'AL', 'AK': 'AK', 'AZ': 'AZ', 'AR': 'AR', 'CA': 'CA',
  'CO': 'CO', 'CT': 'CT', 'DE': 'DE', 'FL': 'FL', 'GA': 'GA',
  'HI': 'HI', 'ID': 'ID', 'IL': 'IL', 'IN': 'IN', 'IA': 'IA',
  'KS': 'KS', 'KY': 'KY', 'LA': 'LA', 'ME': 'ME', 'MD': 'MD',
  'MA': 'MA', 'MI': 'MI', 'MN': 'MN', 'MS': 'MS', 'MO': 'MO',
  'MT': 'MT', 'NE': 'NE', 'NV': 'NV', 'NH': 'NH', 'NJ': 'NJ',
  'NM': 'NM', 'NY': 'NY', 'NC': 'NC', 'ND': 'ND', 'OH': 'OH',
  'OK': 'OK', 'OR': 'OR', 'PA': 'PA', 'RI': 'RI', 'SC': 'SC',
  'SD': 'SD', 'TN': 'TN', 'TX': 'TX', 'UT': 'UT', 'VT': 'VT',
  'VA': 'VA', 'WA': 'WA', 'WV': 'WV', 'WI': 'WI', 'WY': 'WY',
  'DC': 'DC', 'PR': 'PR', 'GU': 'GU', 'VI': 'VI', 'AS': 'AS',
  'MP': 'MP',
};

// ─── Helpers ───────────────────────────────────────────────────

function extractLastName(title) {
  if (!title) return '';
  // Handle prefixes and suffixes
  const cleaned = title
    .replace(/\s+(Jr\.|Sr\.|III|II|IV)$/i, '')
    .replace(/^(Dr\.|Rev\.|Sen\.|Rep\.)\s+/i, '');
  const parts = cleaned.split(/\s+/);
  // Return last part (handles "Ocasio-Cortez", "Diaz-Balart", etc.)
  return parts[parts.length - 1] || '';
}

function getFecIdPrefix(chamber) {
  const ch = (chamber || '').toLowerCase();
  if (ch === 'senate') return 'S';
  if (ch === 'house') return 'H';
  return null;
}

function getFecOfficeCode(chamber) {
  const ch = (chamber || '').toLowerCase();
  if (ch === 'senate') return 'S';
  if (ch === 'house') return 'H';
  return null;
}

/**
 * Extract state code from FEC candidate ID.
 * Format: H2OH13033 => state at positions 2-3 (for H/S prefix)
 *         P00009423 => no state (presidential)
 * Actually FEC format: [office char][cycle digit][state 2 chars][district 2 chars for House][sequence]
 * Senate: S[cycle][state][sequence] e.g. S6OH00163
 * House:  H[cycle][state][district][sequence] e.g. H2OH13033
 */
function extractStateFromFecId(fecId) {
  if (!fecId || fecId.length < 4) return null;
  const prefix = fecId[0];
  if (prefix === 'P') return null; // Presidential
  // Positions 2-3 (0-indexed) are state
  return fecId.substring(2, 4);
}

// ─── FEC API Query ─────────────────────────────────────────────

async function searchFecCandidate(lastName, state, office) {
  await rateLimiter.wait();
  const params = new URLSearchParams({
    api_key: FEC_API_KEY,
    name: lastName,
    state: state,
    office: office, // S or H
    sort: '-election_year',
    per_page: '5',
  });
  const url = `${FEC_BASE}/candidates/search/?${params}`;
  try {
    const data = await fetchJSON(url);
    return (data.results || []);
  } catch (err) {
    logError(`FEC API error for ${lastName} (${state}/${office}): ${err.message}`);
    return [];
  }
}

// ─── Load & Validate ───────────────────────────────────────────

function loadProfiles() {
  const files = walkDir(CONTENT_DIR);
  const profiles = [];

  for (const filePath of files) {
    const content = fs.readFileSync(filePath, 'utf8');
    const { data } = parseFrontmatter(content);
    if (data.type !== 'politician') continue;

    const fecId = data['fec-candidate-id'];
    const chamber = data.chamber;
    const stateAbbr = data['state-abbr'];
    const title = data.title;
    const bioguideId = data['bioguide-id'];

    profiles.push({
      filePath,
      title,
      party: data.party,
      chamber,
      state: data.state,
      stateAbbr,
      district: data.district,
      fecId,
      bioguideId,
      content,
    });
  }

  return profiles;
}

function validateProfiles(profiles) {
  const issues = [];
  const fecIdMap = new Map(); // fecId -> [profiles]

  for (const p of profiles) {
    if (!p.fecId) continue;

    // Track duplicates
    if (!fecIdMap.has(p.fecId)) fecIdMap.set(p.fecId, []);
    fecIdMap.get(p.fecId).push(p);

    const prefix = p.fecId[0];
    const expectedPrefix = getFecIdPrefix(p.chamber);

    // Skip validation for non-House/Senate (Governors, Cabinet, Races with P-prefix, etc.)
    if (!expectedPrefix) continue;

    // Check prefix mismatch
    if (prefix === 'P') {
      // Presidential ID on a House/Senate member
      issues.push({
        type: 'prefix-mismatch',
        profile: p,
        detail: `Presidential FEC ID "${p.fecId}" on ${p.chamber} member`,
        currentId: p.fecId,
      });
      continue;
    }

    if (prefix !== expectedPrefix) {
      issues.push({
        type: 'prefix-mismatch',
        profile: p,
        detail: `${p.chamber} member has ${prefix}-prefix ID "${p.fecId}" (expected ${expectedPrefix})`,
        currentId: p.fecId,
      });
    }

    // Check state code in FEC ID vs profile state-abbr
    if (p.stateAbbr) {
      const fecState = extractStateFromFecId(p.fecId);
      if (fecState && fecState !== p.stateAbbr) {
        issues.push({
          type: 'state-mismatch',
          profile: p,
          detail: `FEC ID "${p.fecId}" has state ${fecState}, profile says ${p.stateAbbr}`,
          currentId: p.fecId,
        });
      }
    }
  }

  // Check for duplicate FEC IDs
  for (const [fecId, profs] of fecIdMap) {
    if (profs.length > 1) {
      issues.push({
        type: 'duplicate',
        profiles: profs,
        detail: `FEC ID "${fecId}" shared by: ${profs.map(p => p.title).join(', ')}`,
        currentId: fecId,
      });
    }
  }

  return issues;
}

// ─── FEC API Lookup for Corrections ────────────────────────────

async function findCorrections(issues) {
  const corrections = [];

  for (const issue of issues) {
    if (issue.type === 'duplicate') {
      corrections.push({
        ...issue,
        suggestion: 'MANUAL REVIEW NEEDED - duplicate IDs',
        candidates: [],
      });
      continue;
    }

    const p = issue.profile;
    const lastName = extractLastName(p.title);
    const office = getFecOfficeCode(p.chamber);

    if (!lastName || !p.stateAbbr || !office) {
      corrections.push({
        ...issue,
        suggestion: 'Cannot auto-lookup (missing name/state/office)',
        candidates: [],
      });
      continue;
    }

    log(`  Querying FEC API: ${lastName}, ${p.stateAbbr}, ${office}...`);
    const results = await searchFecCandidate(lastName, p.stateAbbr, office);

    if (results.length === 0) {
      corrections.push({
        ...issue,
        suggestion: 'No FEC match found',
        candidates: [],
      });
      continue;
    }

    // Try to find best match by name similarity
    const nameNorm = p.title.toLowerCase().replace(/[^a-z\s]/g, '');
    let bestMatch = null;
    for (const r of results) {
      const rName = (r.name || '').toLowerCase().replace(/[^a-z\s]/g, '');
      // FEC names are "LASTNAME, FIRSTNAME" format
      const rParts = rName.split(',').map(s => s.trim());
      const profileParts = nameNorm.split(/\s+/);
      const lastNameMatch = rParts[0] && profileParts.some(part => rParts[0].includes(part) || part.includes(rParts[0]));
      const firstNameMatch = rParts[1] && profileParts.some(part => rParts[1].includes(part) || part.includes(rParts[1]));

      if (lastNameMatch && firstNameMatch) {
        bestMatch = r;
        break;
      }
      if (lastNameMatch && !bestMatch) {
        bestMatch = r;
      }
    }

    corrections.push({
      ...issue,
      suggestion: bestMatch ? bestMatch.candidate_id : 'No confident match',
      suggestedName: bestMatch ? bestMatch.name : null,
      suggestedOffice: bestMatch ? bestMatch.office_full : null,
      suggestedState: bestMatch ? bestMatch.state : null,
      candidates: results.map(r => ({
        id: r.candidate_id,
        name: r.name,
        office: r.office_full,
        state: r.state,
        party: r.party_full,
        cycles: r.election_years,
      })),
    });
  }

  return corrections;
}

// ─── Write Fixes ───────────────────────────────────────────────

function applyFix(filePath, oldId, newId) {
  let content = fs.readFileSync(filePath, 'utf8');
  // Replace in frontmatter only
  const fmRegex = /^(---\r?\n[\s\S]*?\r?\n---)/;
  const match = content.match(fmRegex);
  if (!match) return false;

  const fm = match[1];
  const updated = fm.replace(
    new RegExp(`fec-candidate-id:\\s*["']?${oldId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}["']?`),
    `fec-candidate-id: "${newId}"`
  );

  if (updated === fm) return false;
  content = content.replace(fm, updated);
  fs.writeFileSync(filePath, content, 'utf8');
  return true;
}

// ─── Bioguide Check ────────────────────────────────────────────

function findMissingBioguides(profiles) {
  const missing = [];
  for (const p of profiles) {
    // Only check House/Senate members (not governors, cabinet, etc.)
    const ch = (p.chamber || '').toLowerCase();
    if (ch !== 'house' && ch !== 'senate') continue;
    if (!p.bioguideId) {
      missing.push({
        title: p.title,
        chamber: p.chamber,
        state: p.stateAbbr,
        filePath: p.filePath,
      });
    }
  }
  return missing;
}

// ─── Report ────────────────────────────────────────────────────

function printReport(corrections, missingBioguides) {
  console.log('\n═══════════════════════════════════════════════════════');
  console.log('  FEC CANDIDATE ID VALIDATION REPORT');
  console.log('═══════════════════════════════════════════════════════\n');

  if (corrections.length === 0) {
    console.log('  No FEC ID issues found.\n');
  } else {
    console.log(`  Found ${corrections.length} issue(s):\n`);

    // Group by type
    const prefixIssues = corrections.filter(c => c.type === 'prefix-mismatch');
    const stateIssues = corrections.filter(c => c.type === 'state-mismatch');
    const dupeIssues = corrections.filter(c => c.type === 'duplicate');

    if (prefixIssues.length > 0) {
      console.log('  --- PREFIX MISMATCHES (wrong chamber) ---\n');
      for (const c of prefixIssues) {
        const p = c.profile;
        console.log(`  ${p.title} (${p.party}, ${p.chamber}, ${p.stateAbbr})`);
        console.log(`    Current:   ${c.currentId}`);
        console.log(`    Problem:   ${c.detail}`);
        if (c.suggestion && c.suggestion !== 'No FEC match found' && c.suggestion !== 'No confident match') {
          console.log(`    Suggested: ${c.suggestion} (${c.suggestedName || '?'})`);
        } else {
          console.log(`    Suggested: ${c.suggestion}`);
        }
        if (c.candidates.length > 0) {
          console.log(`    All FEC matches:`);
          for (const cand of c.candidates) {
            console.log(`      - ${cand.id}: ${cand.name} (${cand.office}, ${cand.state})`);
          }
        }
        console.log();
      }
    }

    if (stateIssues.length > 0) {
      console.log('  --- STATE MISMATCHES ---\n');
      for (const c of stateIssues) {
        const p = c.profile;
        console.log(`  ${p.title} (${p.party}, ${p.chamber}, ${p.stateAbbr})`);
        console.log(`    Current:   ${c.currentId}`);
        console.log(`    Problem:   ${c.detail}`);
        if (c.suggestion && c.suggestion !== 'No FEC match found' && c.suggestion !== 'No confident match') {
          console.log(`    Suggested: ${c.suggestion} (${c.suggestedName || '?'})`);
        } else {
          console.log(`    Suggested: ${c.suggestion}`);
        }
        if (c.candidates.length > 0) {
          console.log(`    All FEC matches:`);
          for (const cand of c.candidates) {
            console.log(`      - ${cand.id}: ${cand.name} (${cand.office}, ${cand.state})`);
          }
        }
        console.log();
      }
    }

    if (dupeIssues.length > 0) {
      console.log('  --- DUPLICATE FEC IDs ---\n');
      for (const c of dupeIssues) {
        console.log(`  ${c.detail}`);
        console.log();
      }
    }
  }

  // Summary of fixable
  const fixable = corrections.filter(c =>
    c.suggestion && c.suggestion !== 'No FEC match found' &&
    c.suggestion !== 'No confident match' &&
    c.suggestion !== 'Cannot auto-lookup (missing name/state/office)' &&
    c.suggestion !== 'MANUAL REVIEW NEEDED - duplicate IDs' &&
    c.type !== 'duplicate'
  );
  console.log(`  Fixable with --write: ${fixable.length} / ${corrections.length}`);
  console.log(`  Manual review needed: ${corrections.length - fixable.length}`);

  if (CHECK_BIOGUIDE && missingBioguides.length > 0) {
    console.log('\n  --- MISSING BIOGUIDE IDs ---\n');
    console.log(`  ${missingBioguides.length} House/Senate members without bioguide-id:\n`);
    for (const m of missingBioguides) {
      console.log(`    ${m.title} (${m.chamber}, ${m.state})`);
    }
  }

  console.log('\n═══════════════════════════════════════════════════════\n');
}

// ─── Main ──────────────────────────────────────────────────────

async function main() {
  console.log('Loading politician profiles...');
  const profiles = loadProfiles();
  const withFecId = profiles.filter(p => p.fecId);
  console.log(`  Found ${profiles.length} politician profiles, ${withFecId.length} with FEC IDs`);

  console.log('Validating FEC IDs...');
  const issues = validateProfiles(profiles);
  console.log(`  Found ${issues.length} issue(s)`);

  let corrections = [];
  if (issues.length > 0) {
    // Deduplicate: don't query FEC for the same profile twice
    const seen = new Set();
    const deduped = [];
    for (const iss of issues) {
      if (iss.type === 'duplicate') {
        deduped.push(iss);
        continue;
      }
      const key = iss.profile.filePath;
      if (seen.has(key)) continue;
      seen.add(key);
      deduped.push(iss);
    }

    if (SKIP_API) {
      console.log('Skipping FEC API lookups (--skip-api flag)');
      corrections = deduped.map(iss => ({
        ...iss,
        suggestion: iss.type === 'duplicate' ? 'MANUAL REVIEW NEEDED - duplicate IDs' : 'API lookup skipped',
        candidates: [],
      }));
    } else {
      console.log('Querying FEC API for corrections...');
      corrections = await findCorrections(deduped);
    }
  }

  let missingBioguides = [];
  if (CHECK_BIOGUIDE) {
    missingBioguides = findMissingBioguides(profiles);
  }

  printReport(corrections, missingBioguides);

  if (WRITE_MODE) {
    const fixable = corrections.filter(c =>
      c.suggestion && c.suggestion !== 'No FEC match found' &&
      c.suggestion !== 'No confident match' &&
      c.suggestion !== 'Cannot auto-lookup (missing name/state/office)' &&
      c.suggestion !== 'MANUAL REVIEW NEEDED - duplicate IDs' &&
      c.type !== 'duplicate'
    );

    if (fixable.length === 0) {
      console.log('Nothing to fix.');
      return;
    }

    console.log(`Applying ${fixable.length} fix(es)...`);
    for (const c of fixable) {
      const ok = applyFix(c.profile.filePath, c.currentId, c.suggestion);
      if (ok) {
        console.log(`  FIXED: ${c.profile.title}: ${c.currentId} -> ${c.suggestion}`);
      } else {
        console.log(`  FAILED: ${c.profile.title} (could not replace in frontmatter)`);
      }
    }
    console.log('Done. Review changes with git diff.');
  } else {
    if (corrections.some(c => c.suggestion && c.suggestion !== 'No FEC match found' && c.suggestion !== 'No confident match')) {
      console.log('Dry run complete. Use --write to apply fixes.\n');
    }
  }
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
