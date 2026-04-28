#!/usr/bin/env node
/**
 * strip-related-noise-from-relationships-cache.cjs
 *
 * One-shot vault cleanup: removes editorial system-page wikilinks from
 * the `related:` frontmatter field across all profiles. These are vault
 * meta-pages (`_Media Pipeline Framework`, `_VAULT_INDEX`, etc.) that
 * have no entity record by design — they're navigation / framework
 * pages. They surfaced as `unresolvable` in the librarian-gap-audit
 * because editors mistakenly wikilinked them as relations.
 *
 * Stripping them from `related:` aligns the cache with intent: `related:`
 * holds entity-to-entity adjacency, not page-navigation pointers.
 *
 * Per ADR-0024 + canonical-store-sentinel: `related:` is a guarded
 * frontmatter field. This script is in the sentinel's allowlist (matches
 * `scripts/.*relationship.*\.cjs`), so commits that stage it alongside
 * profile edits pass the gate.
 *
 * Run with --write to actually persist; default is dry-run.
 *
 *   node scripts/strip-related-noise-from-relationships-cache.cjs            # dry-run
 *   node scripts/strip-related-noise-from-relationships-cache.cjs --write    # persist
 */

const fs = require("fs");
const path = require("path");
const yaml = require("js-yaml");

const ROOT = path.resolve(__dirname, "..");
const CONTENT_DIR = path.join(ROOT, "content");
const WRITE = process.argv.includes("--write");

// Locked set of noise wikilinks to strip. Keep narrow — adding here is
// editorial drift; stay surgical until/unless an ADR widens the rule.
const NOISE_WIKILINKS = new Set(
  [
    "_Media Pipeline Framework",
    "_Lobbying Firms Framework",
    "_Think Tank Framework",
    "_Think Tank Index",
    "_VAULT_INDEX",
  ].map((s) => s.toLowerCase()),
);

function* walk(dir) {
  let entries;
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name.startsWith(".") || e.name === "node_modules") continue;
      yield* walk(full);
    } else if (e.name.endsWith(".md")) {
      yield full;
    }
  }
}

function extractWikilinkPairs(field) {
  // Returns array of { raw, name } — `raw` is the text inside [[...]]
  // (which may include `|alias`), `name` is the unaliased target.
  if (!field) return [];
  const s = Array.isArray(field) ? field.join(" · ") : String(field);
  const out = [];
  const re = /\[\[([^\]]+?)\]\]/g;
  let m;
  while ((m = re.exec(s))) {
    const raw = m[1];
    const name = raw.split("|")[0].trim();
    out.push({ raw, name });
  }
  return out;
}

function stripNoise(field) {
  if (!field) return { changed: false, value: field, removed: [] };
  const original = Array.isArray(field) ? field.join(" · ") : String(field);
  const pairs = extractWikilinkPairs(field);
  const removed = [];
  let result = original;
  for (const p of pairs) {
    if (NOISE_WIKILINKS.has(p.name.toLowerCase())) {
      removed.push(p.name);
      // Remove the [[...]] occurrence and any leading/trailing separator
      const escaped = p.raw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      result = result.replace(
        new RegExp(`\\s*[·,;|]?\\s*\\[\\[${escaped}\\]\\]\\s*[·,;|]?\\s*`, "g"),
        " · ",
      );
    }
  }
  if (removed.length === 0) return { changed: false, value: field, removed };
  // Clean up doubled separators / leading-trailing separators
  result = result
    .replace(/\s+/g, " ")
    .replace(/(?:\s*·\s*)+/g, " · ")
    .replace(/^\s*·\s*|\s*·\s*$/g, "")
    .trim();
  return { changed: true, value: result, removed };
}

function replaceFrontmatter(content, newFm) {
  const serialized = yaml.dump(newFm, { lineWidth: -1, noRefs: true, quotingType: '"' });
  return content.replace(/^---\r?\n[\s\S]*?\r?\n---/, `---\n${serialized}---`);
}

function main() {
  console.log("=== strip-related-noise-from-relationships-cache ===");
  console.log(`  mode: ${WRITE ? "WRITE" : "DRY RUN"}`);
  console.log(`  guarded noise wikilinks: ${[...NOISE_WIKILINKS].length}`);
  console.log();

  let inspected = 0;
  let modified = 0;
  const removalCounts = {};

  for (const file of walk(CONTENT_DIR)) {
    let text;
    try { text = fs.readFileSync(file, "utf-8"); } catch { continue; }
    const fmm = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
    if (!fmm) continue;
    let fm;
    try { fm = yaml.load(fmm[1]); } catch { continue; }
    if (!fm || typeof fm !== "object") continue;
    inspected++;

    const result = stripNoise(fm.related);
    if (!result.changed) continue;

    const newFm = { ...fm, related: result.value || null };
    if (!result.value) delete newFm.related;
    if (WRITE) {
      const newContent = replaceFrontmatter(text, newFm);
      fs.writeFileSync(file, newContent, "utf-8");
    }
    modified++;
    for (const r of result.removed) removalCounts[r] = (removalCounts[r] || 0) + 1;
    if (process.argv.includes("--verbose")) {
      console.log(`  ${WRITE ? "✓" : "·"} ${path.relative(ROOT, file)}`);
      for (const r of result.removed) console.log(`      − [[${r}]]`);
    }
  }

  console.log(`  inspected: ${inspected}`);
  console.log(`  ${WRITE ? "modified" : "would modify"}: ${modified}`);
  console.log("  removals by name:");
  for (const [n, c] of Object.entries(removalCounts).sort((a, b) => b[1] - a[1])) {
    console.log(`    ${c}x  ${n}`);
  }
  if (!WRITE) console.log("\n  DRY RUN — re-run with --write to apply.");
}

main();
