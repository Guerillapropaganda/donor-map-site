#!/usr/bin/env node
/**
 * fec-committee-stub-audit.cjs
 *
 * Diagnostic. Walks every FEC-derived edge file, finds committee_ids
 * referenced on edges that are NOT mapped in
 * `data/fec-committee-registry.json`, and attempts to resolve each via
 * exact-name match against entities.jsonl (name + aliases).
 *
 * Output buckets:
 *   resolved-by-exact-name  — fec_name on the edge matches an entity
 *                             name or alias. Safe to add a registry
 *                             entry mapping committee_id → vault_profile.
 *   needs-editorial-review  — fec_name doesn't match any entity. Needs
 *                             a human call (rename / alias / new entity).
 *
 * Per the existing scope doc (content/Admin Notes/
 * fec-committee-stub-resolution.md), this audit is the prereq to the
 * resolver work. As of 2026-04-28 PM, 371 stubs surfaced — 368 resolved
 * by exact-name, 3 by manual mapping. After the auto-resolve sweep, this
 * script should report 0 stubs.
 *
 * USAGE:
 *   node scripts/fec-committee-stub-audit.cjs              # text output
 *   node scripts/fec-committee-stub-audit.cjs --json
 *   node scripts/fec-committee-stub-audit.cjs --apply      # actually
 *                                                          # add registry
 *                                                          # entries for
 *                                                          # exact-match
 *                                                          # cases
 */

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const REGISTRY_FILE = path.join(ROOT, "data", "fec-committee-registry.json");
const ENTITIES_FILE = path.join(ROOT, "data", "entities.jsonl");
const DERIVED_DIR = path.join(ROOT, "data", "derived");

const ARGS = process.argv.slice(2);
const JSON_MODE = ARGS.includes("--json");
const APPLY = ARGS.includes("--apply");

// ─── Edge scanners ─────────────────────────────────────────────────────

const FEC_FILES = [
  { file: "fec-pas2.jsonl", id_field: "src_cmte_id" },
  { file: "fec-oppexp.jsonl", id_field: "cmte_id" },
  { file: "fec-bulk.jsonl", id_field: "cmte_id" },
  { file: "fec-individual-bulk.jsonl", id_field: "cmte_id" },
  { file: "fec-api.jsonl", id_field: "cmte_id" },
];

function scanEdges(file, idField, regIds, stubInfo) {
  const full = path.join(DERIVED_DIR, file);
  if (!fs.existsSync(full)) return;
  const fd = fs.openSync(full, "r");
  try {
    const size = fs.fstatSync(fd).size;
    const CHUNK = 64 * 1024 * 1024;
    let off = 0;
    let carry = "";
    while (off < size) {
      const len = Math.min(CHUNK, size - off);
      const buf = Buffer.alloc(len);
      fs.readSync(fd, buf, 0, len, off);
      off += len;
      const lines = (carry + buf.toString("utf-8")).split(/\r?\n/);
      carry = lines.pop() ?? "";
      for (const l of lines) {
        if (!l.trim()) continue;
        let e;
        try { e = JSON.parse(l); } catch { continue; }
        const md = e.metadata || {};
        const cid = md[idField] || md.cmte_id || md.src_cmte_id;
        if (!cid || regIds.has(cid)) continue;
        let slot = stubInfo.get(cid);
        if (!slot) {
          slot = { fec_name: e.from || md.fec_name || "???", edge_count: 0 };
          stubInfo.set(cid, slot);
        }
        slot.edge_count++;
      }
    }
  } finally {
    fs.closeSync(fd);
  }
}

// ─── Entity index ──────────────────────────────────────────────────────

function loadEntityIndex() {
  const lines = fs.readFileSync(ENTITIES_FILE, "utf-8").split(/\r?\n/).filter(Boolean);
  const byName = new Map();
  for (const l of lines) {
    let r;
    try { r = JSON.parse(l); } catch { continue; }
    if (!r || !r.name) continue;
    byName.set(String(r.name).toLowerCase(), r);
    if (Array.isArray(r.aliases)) {
      for (const a of r.aliases) byName.set(String(a).toLowerCase(), r);
    }
  }
  return byName;
}

// ─── Main ──────────────────────────────────────────────────────────────

function main() {
  const reg = JSON.parse(fs.readFileSync(REGISTRY_FILE, "utf-8"));
  const regIds = new Set(Object.keys(reg));
  const stubInfo = new Map();
  for (const f of FEC_FILES) scanEdges(f.file, f.id_field, regIds, stubInfo);

  const byEntityName = loadEntityIndex();

  const resolved = [];
  const unresolved = [];
  for (const [cid, info] of stubInfo) {
    const ent = byEntityName.get(String(info.fec_name || "").toLowerCase());
    if (ent) {
      resolved.push({ cid, fec_name: info.fec_name, edge_count: info.edge_count, entity_name: ent.name, entity_id: ent.id, profile_path: ent.profile_path });
    } else {
      unresolved.push({ cid, fec_name: info.fec_name, edge_count: info.edge_count });
    }
  }
  resolved.sort((a, b) => b.edge_count - a.edge_count);
  unresolved.sort((a, b) => b.edge_count - a.edge_count);

  let applied = 0;
  if (APPLY && resolved.length > 0) {
    for (const r of resolved) {
      reg[r.cid] = {
        committee_id: r.cid,
        fec_name: r.fec_name,
        committee_type: null,
        committee_type_full: null,
        designation: null,
        designation_full: null,
        organization_type: null,
        connected_organization_name: null,
        candidate_ids: [],
        cycles: [],
        vault_profile: r.profile_path || null,
        mapping_reason: "auto-resolved via exact-name match against entity name/aliases",
        mapped: true,
        aliases: [r.fec_name],
      };
      applied++;
    }
    fs.writeFileSync(REGISTRY_FILE, JSON.stringify(reg, null, 2));
  }

  const result = {
    findings_count: unresolved.length,
    total_stubs: stubInfo.size,
    resolved_by_exact_name: resolved.length,
    needs_editorial_review: unresolved.length,
    total_edges_in_stubs: [...stubInfo.values()].reduce((a, s) => a + s.edge_count, 0),
    applied,
    summary:
      `${stubInfo.size} unregistered committee_id(s) in FEC edges; ` +
      `${resolved.length} resolvable via exact-name match (${
        applied > 0 ? applied + ' applied to registry' : 'use --apply to write'
      }); ${unresolved.length} need editorial review.`,
    top_resolved: resolved.slice(0, 25),
    top_unresolved: unresolved.slice(0, 25),
  };

  if (JSON_MODE) {
    process.stdout.write(JSON.stringify(result, null, 2));
    return;
  }

  console.log("=== fec-committee-stub-audit ===");
  console.log(result.summary);
  console.log();
  if (unresolved.length > 0) {
    console.log("Needs editorial review:");
    for (const u of result.top_unresolved) {
      console.log(`  ${String(u.edge_count).padStart(6)}  ${u.cid}  ${u.fec_name}`);
    }
    if (unresolved.length > result.top_unresolved.length) {
      console.log(`  ... and ${unresolved.length - result.top_unresolved.length} more`);
    }
  }
  if (resolved.length > 0 && !APPLY) {
    console.log();
    console.log(`Top ${Math.min(10, resolved.length)} resolvable (re-run with --apply to populate registry):`);
    for (const r of result.top_resolved.slice(0, 10)) {
      console.log(`  ${String(r.edge_count).padStart(6)}  ${r.cid}  ${r.fec_name} → ${r.entity_name}`);
    }
  }
}

main();
