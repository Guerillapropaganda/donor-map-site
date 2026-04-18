/**
 * scripts/lib/fec-txn-types.cjs
 *
 * SINGLE SOURCE OF TRUTH for FEC transaction-type classification,
 * committee-type validation, and conduit identification.
 *
 * Every script that touches pas2 / indiv FEC data MUST import from here.
 * Do not re-implement the classification logic in individual scripts.
 * Doing so caused the 2010 NRLC-Pelosi $413K miscoded-as-donation anomaly
 * that ADR-0013 closes.
 *
 * Authoritative references:
 *   - FEC pas2 file description: https://www.fec.gov/campaign-finance-data/contributions-committees-candidates-file-description/
 *   - FEC committee type codes: https://www.fec.gov/campaign-finance-data/committee-type-code-descriptions/
 *
 * Changes to this taxonomy require an ADR superseding ADR-0013.
 */

// ─── Transaction types ──────────────────────────────────────────────
// The pas2 TRANSACTION_TP column. Only 24K + (24N from party committees)
// represent money flowing TO the candidate as a direct donation.
// IE (24A, 24E) are separate: they are not donations, they are third-party
// spending for or against. They must be surfaced in dedicated sections,
// never as "donors."

const TXN_TYPES = {
  // Direct PAC → candidate contribution. This IS a donation.
  '24K': { label: 'Direct PAC contribution', category: 'direct-contribution' },

  // In-kind from a party committee (DNC/RNC/DCCC/NRCC/state parties).
  // Only valid when source is on PARTY_COMMITTEE_IDS whitelist.
  // A non-party committee using 24N is a MISCODE — flag as anomaly.
  '24N': { label: 'In-kind from party committee', category: 'party-inkind-conditional' },

  // Coordinated party expenditure on behalf of nominee. Party committees only.
  '24C': { label: 'Coordinated party expenditure', category: 'party-coord-conditional' },
  '24P': { label: 'In-kind party coordinated expenditure', category: 'party-coord-conditional' },

  // Independent expenditure SUPPORTING the candidate. NOT a donation legally,
  // but represents third-party spending on behalf of the candidate.
  // Route to "Super-PAC IE support" section, never to "donors."
  '24E': { label: 'Independent expenditure supporting', category: 'ie-support' },

  // Independent expenditure OPPOSING the candidate. Never a donation.
  // Route to "IE spent against" section on the target candidate's profile.
  '24A': { label: 'Independent expenditure opposing', category: 'ie-oppose' },

  // Communication cost — corporate/union communications to members about
  // candidates. Small, usually internal. Low editorial value.
  '24F': { label: 'Communication cost', category: 'comm-cost' },

  // Electioneering communication — ambiguous ads that name candidates but
  // stop short of explicit advocacy. Route to review queue.
  '24R': { label: 'Electioneering communication', category: 'electioneering' },

  // In-kind contribution — accept as direct contribution if source is a
  // normal PAC. If source is IE-only super-PAC, flag.
  '24Z': { label: 'In-kind contribution', category: 'inkind-conditional' },
};

// ─── Committee ID prefixes ──────────────────────────────────────────
// FEC CMTE_ID first two chars indicate committee class.
//   C0 = traditional PAC / principal campaign committee / party committee
//   C4, C5 = state/local party
//   C7 = IE-only super-PAC (Citizens United SpeechNow creation)
//   C8, C9 = delegate / nonprofit connected
//
// A C7 committee using 24K / 24N / 24Z is by definition miscoded —
// super-PACs legally cannot contribute to candidates. Flag as anomaly.

const SUPER_PAC_PREFIXES = new Set(['C7']);
const NONPROFIT_CONNECTED_PREFIXES = new Set(['C9']);

function committeeClass(cmteId) {
  if (!cmteId || cmteId.length < 2) return 'unknown';
  const prefix = cmteId.slice(0, 2).toUpperCase();
  if (SUPER_PAC_PREFIXES.has(prefix)) return 'super-pac';
  if (NONPROFIT_CONNECTED_PREFIXES.has(prefix)) return 'nonprofit-connected';
  if (prefix === 'C4' || prefix === 'C5') return 'state-local-party';
  return 'pac';
}

// ─── Known party committees (national-level) ────────────────────────
// Whitelist of committee IDs permitted to use 24N / 24C / 24P.
// State parties add significantly more — expand on demand.

const PARTY_COMMITTEE_IDS = new Set([
  'C00003418', // DCCC — Democratic Congressional Campaign Committee
  'C00075820', // NRCC — National Republican Congressional Committee
  'C00010603', // DNC — Democratic National Committee
  'C00003533', // RNC — Republican National Committee
  'C00042366', // DSCC — Democratic Senatorial Campaign Committee
  'C00027466', // NRSC — National Republican Senatorial Committee
]);

// ─── Conduits: platform aggregators, not political actors ───────────
// These committees pass through small-dollar contributions from
// millions of individuals. They are not mega-donors and must not be
// framed as such. Editorial rendering should show them as
// "small-dollar aggregated via [platform]" with the individual count
// if available, NEVER as a top mega-donor.

const CONDUIT_IDS = new Set([
  'C00401224', // ActBlue
  'C00694323', // WinRed
]);

// JFCs (joint fundraising committees) are harder — they vary per cycle.
// Flag any committee with name containing "JOINT FUNDRAISING" or "JFC"
// for manual review rather than hardcoding IDs.
function looksLikeJFC(committeeName) {
  if (!committeeName) return false;
  return /\bjoint fundraising\b/i.test(committeeName) || /\bjfc\b/i.test(committeeName);
}

// ─── Classification result ──────────────────────────────────────────
// Given a raw pas2 row (already parsed), return the editorial bucket
// plus any anomaly flags.

function classifyTransaction(row) {
  // row expected fields: srcCmte, txnTp, amount, candId
  const { srcCmte, txnTp, amount, candId } = row;
  const txn = TXN_TYPES[txnTp] || { label: `Unknown type ${txnTp}`, category: 'unknown' };
  const cmteClass = committeeClass(srcCmte);
  const anomalies = [];

  let bucket = null;

  switch (txn.category) {
    case 'direct-contribution':
      // 24K is always a direct contribution unless C7 source (flag)
      if (cmteClass === 'super-pac') {
        anomalies.push('24K from C7 super-PAC — super-PACs cannot legally give to candidates (miscoded)');
        bucket = 'anomaly';
      } else if (CONDUIT_IDS.has(srcCmte)) {
        bucket = 'conduit-aggregation';
      } else {
        bucket = 'direct-donor';
      }
      break;

    case 'party-inkind-conditional':
    case 'party-coord-conditional':
      // 24N / 24C / 24P only valid from party committees
      if (PARTY_COMMITTEE_IDS.has(srcCmte)) {
        bucket = 'party-support';
      } else {
        anomalies.push(`${txnTp} from non-party committee ${srcCmte} (${cmteClass}) — miscoded (should be 24A or 24E)`);
        bucket = 'anomaly';
      }
      break;

    case 'ie-support':
      bucket = 'ie-support';
      break;

    case 'ie-oppose':
      bucket = 'ie-oppose';
      break;

    case 'comm-cost':
      bucket = 'comm-cost';
      break;

    case 'electioneering':
      bucket = 'electioneering';
      anomalies.push('Electioneering communication — review ad content for attribution');
      break;

    case 'inkind-conditional':
      if (cmteClass === 'super-pac') {
        anomalies.push('24Z from C7 super-PAC — likely miscoded');
        bucket = 'anomaly';
      } else {
        bucket = 'direct-donor';
      }
      break;

    default:
      bucket = 'unknown';
      anomalies.push(`Unknown transaction type: ${txnTp}`);
  }

  return {
    bucket,
    label: txn.label,
    committeeClass: cmteClass,
    isConduit: CONDUIT_IDS.has(srcCmte),
    anomalies,
  };
}

module.exports = {
  TXN_TYPES,
  SUPER_PAC_PREFIXES,
  PARTY_COMMITTEE_IDS,
  CONDUIT_IDS,
  committeeClass,
  looksLikeJFC,
  classifyTransaction,
};
