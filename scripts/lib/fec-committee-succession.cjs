/**
 * scripts/lib/fec-committee-succession.cjs
 *
 * Maps legacy/predecessor FEC committee IDs to their current canonical ID
 * per ADR-0013 + ADR-0014. When a party committee or PAC reorganizes, it
 * gets a new CMTE_ID from FEC. Without this mapping, historical activity
 * splits across IDs and our aggregations split too.
 *
 * Structure: every entry in `SUCCESSION` maps a predecessor (or historical
 * variant) to the current canonical ID. Consumers use `canonicalizeCmteId`
 * which returns the current ID if known, or the input ID unchanged.
 *
 * Known cases below. Expand as David identifies more from the anomaly
 * review queue. Each case should document its source (usually an FEC
 * committee-history page or a specific filing). Changes require an ADR.
 */

const SUCCESSION = [
  // DCCC pre-FECA / legacy registration
  // { predecessor: 'C00000935', canonical: 'C00003418', name: 'DCCC',
  //   note: 'Pre-1974 DCCC registration; flagged in pas2-anomalies as 17K txns / $81M miscoded. TODO verify via FEC committee history.' },

  // Add entries as David reviews the anomaly queue.
  // DO NOT guess — only add entries when the predecessor→canonical link
  // is confirmed via FEC committee-history filing.
];

const predToCanonical = new Map();
const canonicalToPreds = new Map();
for (const s of SUCCESSION) {
  predToCanonical.set(s.predecessor, s.canonical);
  if (!canonicalToPreds.has(s.canonical)) canonicalToPreds.set(s.canonical, []);
  canonicalToPreds.get(s.canonical).push(s.predecessor);
}

function canonicalizeCmteId(id) {
  return predToCanonical.get(id) || id;
}

function getPredecessors(canonicalId) {
  return canonicalToPreds.get(canonicalId) || [];
}

module.exports = {
  SUCCESSION,
  canonicalizeCmteId,
  getPredecessors,
};
