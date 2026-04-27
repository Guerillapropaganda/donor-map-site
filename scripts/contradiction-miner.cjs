#!/usr/bin/env node
/**
 * contradiction-miner.cjs — scan the vault for donor/politician
 * contradictions worth turning into stories
 *
 * The highest-leverage automation in the vault. Static data becomes
 * story seeds automatically:
 *   "Donor X gave $Y to politicians on both sides of bill Z"
 *   "Same entity funds AND opposes the same politician"
 *   "Donor's stated position contradicts their funding pattern"
 *
 * Pattern types mined:
 *
 *   1. BOTH-SIDES (same entity in a profile's donors AND opposes)
 *      Already detected by the janitor as both-sides-flag, but we
 *      surface it as a story seed with context and suggested angle.
 *
 *   2. CROSS-PARTY-DONOR (a donor who gave to both major parties
 *      simultaneously in the same cycle — signals transactional, not
 *      ideological, giving)
 *
 *   3. ISSUE-CONTRADICTION (a politician with donors from opposing
 *      sides of a specific issue tag — e.g., both climate advocates
 *      and fossil fuel firms)
 *
 *   4. FAMILY-NETWORK (entities sharing a surname appearing in both
 *      donors: and opposes: across the vault — signals donor families
 *      playing both sides via separate LLCs)
 *
 *   5. SECTOR-HYPOCRISY (a politician loudly critical of an industry
 *      in body text who takes money from that industry per FEC data)
 *
 * Every finding becomes:
 *   (a) An Attention Queue entry in the "deciding" bucket
 *   (b) A story seed file at content/Story Seeds/<slug>.md
 *
 * The seed file is pre-written like a story kernel — title, claim,
 * evidence, suggested angle — so Research Claude can pick it up and
 * expand it without starting from scratch.
 *
 * Usage:
 *   node scripts/contradiction-miner.cjs
 *   node scripts/contradiction-miner.cjs --min-confidence=3
 */
const fs = require('fs');
const path = require('path');
const { walkDir, parseFrontmatter } = require('./lib/shared.cjs');
const { addEntries, clearSource } = require('./lib/attention-queue.cjs');
const { getRejectedPatterns } = require('./lib/false-positive-log.cjs');
const { detectBothSidesEntities, normalizeEntityList, normalizeEntityName } = require('./lib/checklist-helpers.cjs');
const { addOrFindStory } = require('./lib/stories-store.cjs');

const CONTENT_DIR = process.env.CONTENT_DIR || path.join(__dirname, '..', 'content');
const SOURCE_NAME = 'contradiction-miner';
const SEEDS_DIR = path.join(CONTENT_DIR, 'Story Seeds');

const MIN_CONF_ARG = process.argv.find(a => a.startsWith('--min-confidence='));
const MIN_CONFIDENCE = MIN_CONF_ARG ? parseInt(MIN_CONF_ARG.split('=')[1]) : 3;

function slugify(str) {
  return String(str)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

function loadAllProfiles() {
  const files = walkDir(CONTENT_DIR, '.md');
  const profiles = [];
  for (const f of files) {
    let content;
    try { content = fs.readFileSync(f, 'utf-8'); } catch { continue; }
    const { data, body } = parseFrontmatter(content);
    if (!data || !data.title) continue;
    profiles.push({ filePath: f, data, body });
  }
  return profiles;
}

/**
 * PATTERN 1 — Both-sides entities. For each profile, detect entities
 * that appear in BOTH donors/related/top-donors AND opposes.
 * Confidence 5/5 because the match is structural, not inferential.
 */
function mineBothSides(profiles) {
  const findings = [];
  for (const p of profiles) {
    const overlap = detectBothSidesEntities({
      donors: p.data.donors,
      opposes: p.data.opposes,
    });
    if (overlap.length === 0) continue;
    for (const entity of overlap) {
      findings.push({
        type: 'both-sides',
        confidence: 5,
        profile: p,
        entity,
        headline: `${p.data.title} has ${entity} in both donors and opposes`,
        angle: `${entity} appears as both a funder and an adversary of ${p.data.title}. Investigate whether this is a transactional both-sides play (LLC layering, PAC vs entity distinction, timing arbitrage) or a genuine contradiction. Either way it's a story — the vault has the connection, nobody else does.`,
      });
    }
  }
  return findings;
}

/**
 * PATTERN 2 — Cross-party donors. A donor profile whose politicians-funded
 * or top-donors list includes politicians from both Democrats and Republicans
 * in the same cycle. Signals transactional giving.
 * Confidence 4/5 — structural match but "same cycle" is approximated.
 */
function mineCrossPartyDonors(profiles) {
  // Build politician party index
  const partyOf = new Map();
  for (const p of profiles) {
    if (p.data.type === 'politician' && p.data.party) {
      partyOf.set(normalizeEntityName(p.data.title), String(p.data.party).toLowerCase());
    }
  }

  const findings = [];
  for (const p of profiles) {
    if (p.data.type !== 'donor' && p.data.type !== 'corporation' && p.data.type !== 'pac') continue;
    const funded = normalizeEntityList(p.data['politicians-funded'] || p.data.related);
    if (funded.length < 2) continue;
    const parties = new Set();
    for (const name of funded) {
      const party = partyOf.get(normalizeEntityName(name));
      if (party) parties.add(party);
    }
    if (parties.has('democrat') && parties.has('republican')) {
      findings.push({
        type: 'cross-party',
        confidence: 4,
        profile: p,
        headline: `${p.data.title} funds both major parties`,
        angle: `${p.data.title} appears in the politicians-funded / related lists of both Democratic AND Republican politicians in this vault. That is the classic transactional-donor pattern: influence flows to whoever wins, not to any ideology. Document the specific cycle splits (FEC data) and the bills each funded politician voted on that benefited ${p.data.title}'s sector.`,
      });
    }
  }
  return findings;
}

/**
 * PATTERN 3 — Issue contradictions. A politician with issues that
 * typically oppose each other (e.g., "climate" and "oil & gas") whose
 * donor list spans both sides.
 * Confidence 3/5 — inferential; requires manual review to confirm angle.
 */
const ISSUE_OPPOSING_PAIRS = [
  { a: /climate|environment|green/i, b: /oil|gas|fossil/i, label: 'climate vs. fossil fuels' },
  { a: /gun\s*(safety|control)/i, b: /gun\s*rights|second\s*amendment/i, label: 'gun safety vs. gun rights' },
  { a: /labor|worker|union/i, b: /chamber|corporate|business\s*roundtable/i, label: 'labor vs. corporate' },
  { a: /healthcare|medicare/i, b: /pharma|insurance/i, label: 'healthcare reform vs. health industry' },
];

function mineIssueContradictions(profiles) {
  const findings = [];
  for (const p of profiles) {
    if (p.data.type !== 'politician') continue;
    const donors = normalizeEntityList(p.data.donors || p.data['top-donors']);
    if (donors.length < 3) continue;
    const issuesField = p.data.issues;
    const issueList = Array.isArray(issuesField) ? issuesField : typeof issuesField === 'string' ? [issuesField] : [];
    for (const pair of ISSUE_OPPOSING_PAIRS) {
      const hasIssueA = issueList.some(i => pair.a.test(String(i)));
      if (!hasIssueA) continue;
      // Check donor names against pattern B
      const opposingDonors = donors.filter(d => pair.b.test(d));
      if (opposingDonors.length > 0) {
        findings.push({
          type: 'issue-contradiction',
          confidence: 3,
          profile: p,
          issue: pair.label,
          opposingDonors,
          headline: `${p.data.title}: ${pair.label} contradiction`,
          angle: `${p.data.title} lists "${issueList.find(i => pair.a.test(String(i)))}" as a tracked issue, but their donor list includes ${opposingDonors.slice(0, 3).join(', ')}${opposingDonors.length > 3 ? ` and ${opposingDonors.length - 3} more` : ''}. Document the dollar amounts and the dates of their public stance vs. the dates of the donations. The contradiction is the story.`,
        });
      }
    }
  }
  return findings;
}

/**
 * PATTERN 4 — The "Same Donor, Many Politicians on One Committee" pattern.
 * If 3+ politicians on the same committee all share a common donor, that's
 * a coordinated capture signal worth writing about.
 * Confidence 4/5 — structural match, widely applicable.
 */
function mineCommitteeCaptures(profiles) {
  // Index: committee name → [politician profiles]
  const byCommittee = new Map();
  for (const p of profiles) {
    if (p.data.type !== 'politician') continue;
    const committeesStr = Array.isArray(p.data.committees)
      ? p.data.committees.join(' ')
      : String(p.data.committees || '');
    // Canonicalize known committees to a few buckets
    const buckets = [];
    if (/banking|financial services/i.test(committeesStr)) buckets.push('Banking/Financial Services');
    if (/judiciary/i.test(committeesStr)) buckets.push('Judiciary');
    if (/armed services/i.test(committeesStr)) buckets.push('Armed Services');
    if (/energy/i.test(committeesStr)) buckets.push('Energy');
    if (/intelligence|foreign/i.test(committeesStr)) buckets.push('Intelligence/Foreign');
    if (/agriculture|help\b/i.test(committeesStr)) buckets.push('Agriculture/HELP');
    for (const b of buckets) {
      if (!byCommittee.has(b)) byCommittee.set(b, []);
      byCommittee.get(b).push(p);
    }
  }

  const findings = [];
  for (const [committee, members] of byCommittee) {
    if (members.length < 3) continue;
    // Count donor occurrences across members
    const donorCounts = new Map();
    for (const m of members) {
      const donors = normalizeEntityList(m.data.donors || m.data['top-donors']);
      for (const d of donors) {
        const norm = normalizeEntityName(d);
        if (!donorCounts.has(norm)) donorCounts.set(norm, { display: d, members: [] });
        donorCounts.get(norm).members.push(m.data.title);
      }
    }
    for (const [norm, info] of donorCounts) {
      if (info.members.length < 3) continue;
      findings.push({
        type: 'committee-capture',
        confidence: 4,
        committee,
        donor: info.display,
        memberCount: info.members.length,
        members: info.members,
        headline: `${info.display} funds ${info.members.length} ${committee} committee members`,
        angle: `${info.display} shows up in the donor lists of ${info.members.length} different ${committee} committee members: ${info.members.slice(0, 5).join(', ')}${info.members.length > 5 ? ` and ${info.members.length - 5} more` : ''}. That's coordinated capture of an entire regulatory body. Pull FEC totals per member, cross-reference committee votes on bills affecting ${info.display}'s sector, and write the capture narrative.`,
      });
    }
  }
  return findings;
}

function ensureSeedsDir() {
  fs.mkdirSync(SEEDS_DIR, { recursive: true });
  const readmePath = path.join(SEEDS_DIR, 'README.md');
  if (!fs.existsSync(readmePath)) {
    const readme = `---
title: "Story Seeds"
type: system
last-updated: '${new Date().toISOString().slice(0, 10)}'
---

# Story Seeds

Auto-generated story ideas surfaced by \`scripts/contradiction-miner.cjs\` and related scripts. Each file here is a pre-written "kernel" of a potential story — a headline, the evidence, and a suggested angle — so Research Claude (or David) can pick one up and expand it into a full piece without starting from scratch.

## Rules

- **Seed files are disposable.** If a seed isn't worth developing, delete the file and add a rejection to the false-positive log (which prevents the same pattern from re-surfacing).
- **When a seed becomes a real profile or sub-note**, move the seed content into that profile and delete the seed file.
- **Seed files don't ship publicly.** They live here as research prompts. Don't add them to the public site navigation.

## Categories

- \`both-sides-*\` — same entity in donors AND opposes (structural contradiction)
- \`cross-party-*\` — donors who fund both major parties simultaneously
- \`issue-contradiction-*\` — politicians whose issue tags contradict their donor list
- \`committee-capture-*\` — donors funding 3+ members of the same committee
`;
    fs.writeFileSync(readmePath, readme, 'utf-8');
  }
}

/**
 * Build the linked_entities array from a raw finding object.
 * Each finding type has different fields carrying the subject/counterparty.
 */
function buildLinkedEntities(f) {
  const entities = [];
  const profileTitle = f.profile && f.profile.data && f.profile.data.title;
  if (f.type === 'both-sides') {
    if (profileTitle) entities.push({ ref: `[[${profileTitle}]]`, role: 'subject' });
    if (f.entity) entities.push({ ref: f.entity, role: 'counterparty' });
  } else if (f.type === 'cross-party') {
    if (profileTitle) entities.push({ ref: `[[${profileTitle}]]`, role: 'subject' });
  } else if (f.type === 'issue-contradiction') {
    if (profileTitle) entities.push({ ref: `[[${profileTitle}]]`, role: 'subject' });
    for (const d of (f.opposingDonors || []).slice(0, 3)) {
      entities.push({ ref: d, role: 'counterparty' });
    }
  } else if (f.type === 'committee-capture') {
    if (f.donor) entities.push({ ref: f.donor, role: 'subject' });
    for (const m of (f.members || []).slice(0, 5)) {
      entities.push({ ref: `[[${m}]]`, role: 'mentioned' });
    }
  } else if (f.type === 'offshore-exposure') {
    if (f.vaultName) entities.push({ ref: `[[${f.vaultName}]]`, role: 'subject' });
  } else if (f.type === 'policy-capture-sponsorship') {
    if (profileTitle) entities.push({ ref: `[[${profileTitle}]]`, role: 'subject' });
  }
  return entities;
}

function writeSeedFile(finding) {
  ensureSeedsDir();
  const slug = slugify(`${finding.type}-${finding.headline}`);
  const filePath = path.join(SEEDS_DIR, `${slug}.md`);
  // Don't overwrite seeds that a human has edited
  if (fs.existsSync(filePath)) {
    const existing = fs.readFileSync(filePath, 'utf-8');
    if (!/auto-generated/.test(existing)) return filePath; // skip human-edited seeds
  }

  const stars = '★'.repeat(finding.confidence) + '☆'.repeat(5 - finding.confidence);
  const today = new Date().toISOString().slice(0, 10);
  const lines = [];
  lines.push('---');
  lines.push(`title: "${finding.headline.replace(/"/g, "'")}"`);
  lines.push('type: story-seed');
  lines.push(`seed-type: ${finding.type}`);
  lines.push(`confidence: ${finding.confidence}`);
  lines.push(`last-updated: '${today}'`);
  lines.push(`auto-generated: true`);
  lines.push('status: unclaimed');
  lines.push('---');
  lines.push('');
  lines.push(`# ${finding.headline}`);
  lines.push('');
  lines.push(`_Confidence: ${stars} · Surfaced by contradiction-miner on ${today}_`);
  lines.push('');
  lines.push('## The angle');
  lines.push('');
  lines.push(finding.angle);
  lines.push('');
  lines.push('## Evidence from the vault');
  lines.push('');
  if (finding.type === 'both-sides') {
    lines.push(`- **Profile:** [[${finding.profile.data.title}]]`);
    lines.push(`- **Entity appearing in both donors and opposes:** ${finding.entity}`);
  } else if (finding.type === 'cross-party') {
    lines.push(`- **Donor:** [[${finding.profile.data.title}]]`);
    lines.push(`- **Pattern:** appears in politicians-funded lists across both parties`);
  } else if (finding.type === 'issue-contradiction') {
    lines.push(`- **Politician:** [[${finding.profile.data.title}]]`);
    lines.push(`- **Stated issue:** ${finding.issue}`);
    lines.push(`- **Contradicting donors:** ${finding.opposingDonors.join(', ')}`);
  } else if (finding.type === 'committee-capture') {
    lines.push(`- **Committee:** ${finding.committee}`);
    lines.push(`- **Donor:** ${finding.donor}`);
    lines.push(`- **Member count:** ${finding.memberCount}`);
    lines.push(`- **Members:** ${finding.members.map(m => `[[${m}]]`).join(', ')}`);
  }
  lines.push('');
  lines.push('## Next steps');
  lines.push('');
  lines.push('- Verify the pattern against primary FEC / Congress.gov data (not just the vault frontmatter)');
  lines.push('- Pull exact dollar amounts and dates');
  lines.push('- Identify any public statements from the subject that contradict their funding pattern');
  lines.push('- Decide: story, report, or investigation (by URL count)');
  lines.push('- If pursuing, move this content into the master profile and delete this seed');
  lines.push('- If rejecting, delete this file and the false-positive logger will prevent re-surfacing');
  lines.push('');
  lines.push('## How to reject this seed');
  lines.push('');
  lines.push(`If this isn't worth pursuing, delete this file AND run:`);
  lines.push('');
  lines.push('```bash');
  lines.push(`node -e "require('./scripts/lib/false-positive-log.cjs').recordRejection('contradiction-miner', '${slug}', 'story seed ${finding.type}', 'REASON_HERE')"`);
  lines.push('```');

  fs.writeFileSync(filePath, lines.join('\n'), 'utf-8');
  return filePath;
}

// ─── Phase 2 additions: new dimensions (offshore + bill sponsorship) ───

const OFFSHORE_FILE = path.join(__dirname, '..', 'data', 'offshore-entities.jsonl');
const BILLS_FILE = path.join(__dirname, '..', 'data', 'bills.jsonl');
const ENTITIES_FILE = path.join(__dirname, '..', 'data', 'entities.jsonl');

function loadJsonl(filePath) {
  if (!fs.existsSync(filePath)) return [];
  const out = [];
  for (const l of fs.readFileSync(filePath, 'utf-8').split(/\r?\n/)) {
    if (!l.trim()) continue;
    try { out.push(JSON.parse(l)); } catch {}
  }
  return out;
}

/**
 * PATTERN 6 — OFFSHORE EXPOSURE. Any vault entity appearing in the
 * ICIJ Offshore Leaks Database is a story seed, especially when cross-
 * referenced with their donation / contract / grant footprint. The
 * journalism angle: "Entity X appears in [Paradise Papers] for a
 * [Bermuda] shell while donating $Y to [legislators on Z committee]."
 * Confidence 3/5 — presence in leaks is factual but implications vary.
 */
function mineOffshoreFlags(profiles) {
  const findings = [];
  const offshore = loadJsonl(OFFSHORE_FILE);
  if (offshore.length === 0) return findings;

  const byLinked = new Map();
  for (const rec of offshore) {
    for (const v of rec.linked_vault_entities || []) {
      if (!byLinked.has(v)) byLinked.set(v, []);
      byLinked.get(v).push(rec);
    }
  }
  const profByTitle = new Map(profiles.map((p) => [p.data.title, p]));
  for (const [vaultName, recs] of byLinked) {
    const p = profByTitle.get(vaultName);
    if (!p) continue;
    // Only flag vault entities that ALSO have political exposure
    // (donations, contracts, opposition edges — i.e. are politically
    // relevant to our analysis). Everyone else is just noise.
    const hasPoliticalFootprint = !!(p.data.donors?.length || p.data['top-donors']?.length || p.data['politicians-funded']?.length || p.data.opposes?.length);
    if (!hasPoliticalFootprint) continue;

    const leakSet = new Set(recs.map((r) => r.sourceID).filter(Boolean));
    const jurisdictions = [...new Set(recs.map((r) => r.jurisdiction).filter(Boolean))];
    const leakList = [...leakSet].slice(0, 3).join(', ');
    findings.push({
      type: 'offshore-exposure',
      confidence: 3,
      profile: p,
      entity: vaultName,
      headline: `${vaultName} appears in ICIJ Offshore Leaks (${recs.length} records, ${[...leakSet].length} leaks)`,
      angle: `${vaultName} is a politically-active vault entity that ALSO appears in the ICIJ Offshore Leaks Database across: ${leakList || 'unattributed leaks'}. ${jurisdictions.length > 0 ? `Linked jurisdictions: ${jurisdictions.slice(0, 3).join(', ')}.` : ''} Appearing in these files does not imply wrongdoing — but the combination of political spending + offshore footprint warrants a closer look. Query Ask with \`subject: offshore_entities, linked_vault_entity: ${vaultName}\` for the full list and cross-reference with their political donations in the same period.`,
    });
  }
  return findings;
}

/**
 * PATTERN 7 — POLICY CAPTURE BY SPONSORSHIP. A politician who both
 * (a) received major donations from an industry AND
 * (b) sponsored 5+ bills in that industry's policy area
 * signals a legislator acting as a direct channel for donor interests.
 *
 * This is a keyword-based heuristic — it surfaces the pattern for
 * editorial review, not as a verdict. Confidence 3/5.
 */
function minePolicyCaptureBySponsorship(profiles) {
  const findings = [];
  const bills = loadJsonl(BILLS_FILE);
  const entities = loadJsonl(ENTITIES_FILE);
  if (bills.length === 0 || entities.length === 0) return findings;

  // Policy area → donor-sector keyword matches. Broad intentional
  // overlaps (healthcare → Pharma, Insurance, Health Services).
  const POLICY_TO_SECTOR = {
    'Health': ['pharma', 'insurance', 'health', 'medical'],
    'Armed Forces and National Security': ['defense', 'military', 'intelligence'],
    'Energy': ['oil', 'gas', 'energy', 'coal', 'utility', 'utilities'],
    'Environmental Protection': ['oil', 'gas', 'energy', 'fossil', 'coal'],
    'Taxation': ['wall street', 'finance', 'hedge fund', 'private equity', 'crypto'],
    'Finance and Financial Sector': ['wall street', 'bank', 'hedge fund', 'private equity', 'finance'],
    'Agriculture and Food': ['agriculture', 'agribusiness', 'food', 'dairy'],
    'Labor and Employment': ['anti-union', 'chamber of commerce'],
    'Science, Technology, Communications': ['tech', 'crypto', 'silicon valley', 'telecom'],
    'Transportation and Public Works': ['airline', 'railroad', 'trucking'],
    'Housing and Community Development': ['real estate', 'housing', 'development'],
  };

  // Build politician bioguide → top-donor sectors from entities.jsonl
  // signals.top_donors (populated by populate-top-politicians-2hop.cjs)
  const entByTitle = new Map(entities.map((e) => [e.name, e]));

  // Build bioguide → sponsored bills (by policy_area counts)
  const sponsoredByBioguide = new Map();
  for (const b of bills) {
    for (const bg of b.sponsor_bioguides || []) {
      if (!sponsoredByBioguide.has(bg)) sponsoredByBioguide.set(bg, new Map());
      const cur = sponsoredByBioguide.get(bg);
      if (b.policy_area) cur.set(b.policy_area, (cur.get(b.policy_area) || 0) + 1);
    }
  }

  for (const p of profiles) {
    if (p.data.type !== 'politician') continue;
    const bio = p.data['bioguide-id'] || p.data['bioguide'];
    if (!bio) continue;
    const policies = sponsoredByBioguide.get(bio);
    if (!policies || policies.size === 0) continue;
    const ent = entByTitle.get(p.data.title);
    const topDonors = ent?.signals?.top_donors || [];
    if (topDonors.length === 0) continue;

    // For each policy area the legislator sponsored 5+ bills in,
    // check if any top donor's sector-keyword matches.
    for (const [policy, count] of policies) {
      if (count < 5) continue;
      const keywords = POLICY_TO_SECTOR[policy];
      if (!keywords) continue;
      const matchingDonors = [];
      for (const d of topDonors) {
        const donorEnt = entByTitle.get(d.name);
        const sector = (donorEnt?.signals?.sector || '').toLowerCase();
        if (!sector) continue;
        if (keywords.some((kw) => sector.includes(kw))) matchingDonors.push({ name: d.name, sector: donorEnt.signals.sector, amount: d.amount });
      }
      if (matchingDonors.length === 0) continue;
      const donorList = matchingDonors.slice(0, 3).map((d) => `${d.name} (${d.sector})`).join(', ');
      findings.push({
        type: 'policy-capture-sponsorship',
        confidence: 3,
        profile: p,
        entity: policy,
        headline: `${p.data.title} sponsored ${count} "${policy}" bills; top donors include ${matchingDonors.length} from matching sector`,
        angle: `${p.data.title} has sponsored ${count} bills in the "${policy}" policy area. Their top donors include: ${donorList}. This is the classic policy-capture-by-money pattern — legislator acts as a direct channel for donor industry interests. Pull the bill list (query Ask with \`subject: bills, sponsor_bioguide: ${bio}, policy_area: ${policy}\`) and cross-reference with donor industry positions on those specific bills.`,
      });
    }
  }
  return findings;
}

function main() {
  const profiles = loadAllProfiles();
  const rejected = getRejectedPatterns(SOURCE_NAME);

  const bothSides = mineBothSides(profiles);
  const crossParty = mineCrossPartyDonors(profiles);
  const issue = mineIssueContradictions(profiles);
  const cmteCap = mineCommitteeCaptures(profiles);
  const offshore = mineOffshoreFlags(profiles);
  const policyCap = minePolicyCaptureBySponsorship(profiles);
  console.log(`[miner debug] both-sides=${bothSides.length}, cross-party=${crossParty.length}, issue=${issue.length}, cmte-capture=${cmteCap.length}, offshore=${offshore.length}, policy-capture=${policyCap.length}`);
  const allFindings = [...bothSides, ...crossParty, ...issue, ...cmteCap, ...offshore, ...policyCap];

  // Filter rejected + below min confidence
  const filtered = allFindings.filter(f => {
    if (f.confidence < MIN_CONFIDENCE) return false;
    const key = slugify(`${f.type}-${f.headline}`);
    return !rejected.has(key);
  });

  // Sort: highest confidence first
  filtered.sort((a, b) => b.confidence - a.confidence);

  // Category diversity: before writing seed files, ensure each pattern
  // type is represented even if lower-confidence patterns would be
  // pushed out by the global cap. Take top-N per type, then top-N
  // overall, dedup.
  const perTypeCap = 20;
  const globalCap = 100;
  const byType = {};
  for (const f of filtered) {
    byType[f.type] = byType[f.type] || [];
    if (byType[f.type].length < perTypeCap) byType[f.type].push(f);
  }
  const balanced = [];
  const seen = new Set();
  // Interleave: take 1 from each category round-robin until we hit globalCap.
  const typeList = Object.keys(byType);
  let round = 0;
  while (balanced.length < globalCap) {
    let added = 0;
    for (const t of typeList) {
      const f = byType[t][round];
      if (!f) continue;
      const key = slugify(`${f.type}-${f.headline}`);
      if (seen.has(key)) continue;
      seen.add(key);
      balanced.push(f);
      added++;
      if (balanced.length >= globalCap) break;
    }
    if (added === 0) break;
    round++;
  }

  // Write to the canonical stories store (data/stories.jsonl).
  // Idempotent: addOrFindStory skips records whose slug already exists.
  const written = [];
  for (const f of balanced) {
    try {
      const rec = addOrFindStory({
        headline: f.headline,
        detector: SOURCE_NAME,
        detector_type: f.type,
        confidence: f.confidence,
        state: 'candidate',
        linked_entities: buildLinkedEntities(f),
        summary: f.angle || '',
        first_detected: new Date().toISOString(),
      });
      written.push({ ...f, storyId: rec.id });
    } catch (e) {
      console.error(`  stories-store write failed for "${f.headline}": ${e.message}`);
    }
  }

  // Contribute to attention queue — top 15 (we don't want to flood)
  const entries = written.slice(0, 15).map(f => ({
    bucket: 'deciding',
    what: f.headline,
    why: (f.angle || '').slice(0, 350),
    where: `ops/stories`,
    cost_min: 25,
    leverage: f.confidence,
    metadata: { type: f.type, confidence: f.confidence, story_id: f.storyId },
  }));

  if (entries.length === 0) {
    clearSource(SOURCE_NAME);
    console.log('Contradiction Miner: no new stories surfaced.');
    console.log(`  (${allFindings.length} total findings, ${allFindings.length - filtered.length} filtered out)`);
    return;
  }

  const count = addEntries(SOURCE_NAME, entries);
  console.log(`Contradiction Miner wrote ${written.length} story candidate${written.length === 1 ? '' : 's'} to data/stories.jsonl.`);
  console.log(`  Attention Queue: ${count} top findings added to the deciding bucket.`);
  console.log(`  Category breakdown:`);
  const byTypeReport = {};
  for (const f of written) byTypeReport[f.type] = (byTypeReport[f.type] || 0) + 1;
  for (const [type, n] of Object.entries(byTypeReport)) {
    console.log(`    ${type.padEnd(25)} ${n}`);
  }
  console.log(`  Store: data/stories.jsonl`);
}

main();
