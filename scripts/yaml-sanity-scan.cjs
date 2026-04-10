#!/usr/bin/env node
/**
 * yaml-sanity-scan.cjs — Validate every profile's frontmatter YAML
 *
 * Parses every .md file under content/ and reports any with broken
 * frontmatter. Catches corruption like the scalar+list hybrid that
 * broke Whitehouse's profile on 2026-04-10 and blocked the deploy.
 *
 * Usage: node scripts/yaml-sanity-scan.cjs
 */
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === '.git' || entry.name === '.obsidian') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, files);
    else if (entry.name.endsWith('.md')) files.push(full);
  }
  return files;
}

const bad = [];
const files = walk('content');

for (const f of files) {
  const content = fs.readFileSync(f, 'utf-8');
  const m = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!m) continue;
  try {
    yaml.load(m[1]);
  } catch (e) {
    bad.push({
      file: path.relative(process.cwd(), f).replace(/\\/g, '/'),
      error: e.message.split('\n')[0],
    });
  }
}

console.log(`Scanned ${files.length} profiles`);
console.log(`Broken YAML: ${bad.length}`);

if (bad.length > 0) {
  console.log('\n--- BROKEN PROFILES ---');
  for (const b of bad) {
    console.log(`  ${b.file}`);
    console.log(`    -> ${b.error}`);
  }
  process.exit(1);
}
