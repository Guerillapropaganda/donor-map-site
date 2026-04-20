/**
 * verifiers/_framework.cjs — shared interface for reconciliation checkers.
 *
 * Two tiers:
 *   tier 1 (internal)  — does our data agree with itself? fast, local only.
 *   tier 2 (external)  — does our data match authoritative raw source? slow.
 *
 * Every checker exports:
 *   {
 *     name:      string,         // stable slug for reporting
 *     tier:      1 | 2,
 *     description: string,
 *     run:       (opts) => Promise<Finding[]>
 *   }
 *
 * A Finding describes ONE discrepancy:
 *   {
 *     checker:    string,            // filled by orchestrator
 *     severity:   'error' | 'warn' | 'info',
 *     entity:     string | null,     // vault entity name if applicable
 *     metric:     string,             // e.g. "receipts-2024", "subawards-issued"
 *     internal:   number | string,   // what our data says
 *     external:   number | string,   // what authoritative source says (null for tier 1)
 *     delta_pct:  number | null,     // internal vs external percent drift
 *     cause:      string,             // short machine-readable tag
 *     detail:     string,             // human-readable one-liner
 *   }
 *
 * Checkers should never edit data. They only read and report.
 * Fixes are proposed in the Finding's `detail`, applied by separate scripts.
 */

function pct(internal, external) {
  if (external === null || external === undefined || external === 0) return null;
  return ((internal - external) / external) * 100;
}

function fmtMoney(n) {
  if (n === null || n === undefined) return '—';
  const abs = Math.abs(n);
  if (abs >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (abs >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
  if (abs >= 1e3) return `$${(n / 1e3).toFixed(1)}K`;
  return `$${n.toFixed(0)}`;
}

function finding({
  severity = 'warn',
  entity = null,
  metric,
  internal,
  external = null,
  cause,
  detail,
}) {
  return {
    severity,
    entity,
    metric,
    internal,
    external,
    delta_pct: typeof internal === 'number' && typeof external === 'number' ? pct(internal, external) : null,
    cause,
    detail,
  };
}

module.exports = { pct, fmtMoney, finding };
