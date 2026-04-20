/**
 * amount-sanity.cjs — tier 1 checker.
 *
 * Flags numeric fields that are outside plausible real-world bounds.
 * Catches the class of bug where a UUID, row index, or wrong column
 * gets parsed into an amount field.
 *
 * Real-world upper bound for any single political/philanthropic money
 * field: roughly $3B (Bloomberg's 2020 self-funding, MFT's Seid
 * donation). We set the ceiling at $1e10 ($10B) — anything above that
 * is either cumulative-multi-entity noise or a bug. Total lifetime
 * aggregates can exceed this legitimately (e.g. a sector rollup);
 * those are flagged as 'warn' not 'error'.
 *
 * Lower bounds: no negative amounts on fields that can't be negative
 * (total_assets, total_revenue). Refunds and net-transfers can be
 * negative.
 */
const fs = require('fs');
const path = require('path');
const { loadEntities } = require('../lib/entities-store.cjs');
const { loadEdges } = require('../lib/relationships-store.cjs');
const { finding, fmtMoney } = require('./_framework.cjs');

const ROOT = path.resolve(__dirname, '..', '..');

// Bounds by field type.
const HARD_CAP = 1e10;            // $10B — anything above is definitely bogus
const SINGLE_EDGE_CAP = 2e9;      // $2B — no single transaction should exceed this (Seid donation was $1.6B)
const FRONTMATTER_SINGLE_CAP = 5e9; // $5B — single frontmatter field
const CUMULATIVE_WARN = 1e11;     // $100B — only flag as warn above this

function numeric(x) {
  return typeof x === 'number' && isFinite(x);
}

async function run(opts = {}) {
  const findings = [];
  const entityFilter = opts.entities ? new Set(opts.entities) : null;

  // 1. Scan entities.jsonl signals for absurd values.
  const ents = loadEntities();
  for (const e of ents) {
    if (entityFilter && !entityFilter.has(e.name)) continue;
    if (!e.signals) continue;
    for (const [k, v] of Object.entries(e.signals)) {
      if (!numeric(v)) continue;
      if (v > HARD_CAP) {
        findings.push(finding({
          severity: 'error',
          entity: e.name,
          metric: `entities.jsonl:signals.${k}`,
          internal: v,
          cause: 'absurd-value',
          detail: `entity signal ${k}=${fmtMoney(v)} exceeds $10B hard cap — near-certainly a parse bug (UUID as amount, wrong column, unit error)`,
        }));
      } else if (v < 0 && /assets|revenue|cash/i.test(k)) {
        findings.push(finding({
          severity: 'error',
          entity: e.name,
          metric: `entities.jsonl:signals.${k}`,
          internal: v,
          cause: 'negative-nonrefundable',
          detail: `entity signal ${k}=${fmtMoney(v)} is negative; this field should never be negative`,
        }));
      }
    }
  }

  // 2. Scan frontmatter numeric fields across the vault.
  const frontmatterFiles = walkMd(path.join(ROOT, 'content'));
  for (const file of frontmatterFiles) {
    const text = fs.readFileSync(file, 'utf-8');
    const m = text.match(/^---\n([\s\S]*?)\n---/);
    if (!m) continue;
    const fm = m[1];
    // crude numeric field scan — looks for "key: <integer>" patterns
    const re = /^([a-z0-9_\-]+):\s+(-?\d{8,})\b/gim;
    let hit;
    while ((hit = re.exec(fm)) !== null) {
      const key = hit[1];
      const val = Number(hit[2]);
      if (!numeric(val)) continue;
      // Skip known-legitimate non-money numeric fields.
      if (/^(ein|bioguide|fec_?id|committee_?id|lei|cik|uei|duns|phone|zip|year|last_updated|cross_vault_triangulation_count|sec_filings|data_freshness_days|last_enriched)$/i.test(key)) continue;
      const profileName = relProfile(file);
      if (entityFilter && !entityFilter.has(profileName)) continue;
      // Fields that can legitimately reach hundreds of billions for top
      // defense contractors (Lockheed $127B), mega-foundations (Gates
      // $78B assets), and financial giants (Fidelity $66B assets). The
      // Leo-class bug is $1e18 — raising this ceiling to $500B still
      // catches the real bug pattern by 5 orders of magnitude.
      const LARGE_VALUE_FIELDS = /^(federal-awards-total|subawards-issued-amount|subawards-received-amount|contracts-total|lobbying-total-lifetime|sec-filings-total-value|total-revenue|total-assets|total-expenses|net-assets)$/i;
      const cap = LARGE_VALUE_FIELDS.test(key) ? 5e11 : FRONTMATTER_SINGLE_CAP;
      if (val > cap) {
        findings.push(finding({
          severity: 'error',
          entity: profileName,
          metric: `frontmatter:${key}`,
          internal: val,
          cause: 'absurd-value',
          detail: `frontmatter ${key}=${fmtMoney(val)} in ${path.relative(ROOT, file)} — above $5B single-field cap`,
        }));
      }
    }
  }

  // 3. Scan edge store for any single edge amount above SINGLE_EDGE_CAP.
  const edges = loadEdges();
  for (const e of edges) {
    if (e.type !== 'monetary') continue;
    if (!numeric(e.amount)) continue;
    if (entityFilter && !entityFilter.has(e.to) && !entityFilter.has(e.from)) continue;
    if (Math.abs(e.amount) > SINGLE_EDGE_CAP) {
      findings.push(finding({
        severity: Math.abs(e.amount) > HARD_CAP ? 'error' : 'warn',
        entity: e.to,
        metric: `edge:${e.id}`,
        internal: e.amount,
        cause: 'absurd-edge-amount',
        detail: `edge ${e.id} ${e.from} → ${e.to} amount=${fmtMoney(e.amount)} (cycle ${e.cycle}, source ${e.source}) — exceeds $2B single-edge soft cap`,
      }));
    }
  }

  return findings;
}

// helpers
function walkMd(dir) {
  const out = [];
  if (!fs.existsSync(dir)) return out;
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) out.push(...walkMd(full));
    else if (ent.name.endsWith('.md')) out.push(full);
  }
  return out;
}
function relProfile(file) {
  // vault profile title = filename stem minus leading underscore
  return path.basename(file, '.md').replace(/^_/, '');
}

module.exports = {
  name: 'amount-sanity',
  tier: 1,
  description: 'Bounds-check numeric fields across entities, edges, and frontmatter',
  run,
};
