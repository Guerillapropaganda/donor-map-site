#!/usr/bin/env node
const fs = require("fs");
const path = require("path");

const WORDS = [
  "significantly", "ultimately", "notably", "additionally", "importantly",
  "crucially", "moreover", "furthermore", "plethora", "tapestry",
  "testament to", "multifaceted", "delve", "delves", "delving",
];

const samples = {};
WORDS.forEach(w => samples[w] = []);
const perFile = {};

function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const f = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (/Vault Maintenance$/.test(f) || /Admin Notes$/.test(f)) continue;
      walk(f);
      continue;
    }
    if (!e.name.endsWith(".md")) continue;
    const text = fs.readFileSync(f, "utf-8");
    const fmEnd = text.indexOf("\n---\n");
    const body = fmEnd >= 0 ? text.slice(fmEnd + 5) : text;
    const lines = body.split("\n");
    let inCode = false, inAuto = false;
    for (const line of lines) {
      if (line.trim().startsWith("```")) inCode = !inCode;
      if (line.includes("<!-- auto:")) inAuto = true;
      if (line.includes("<!-- /auto:")) inAuto = false;
      if (inCode || inAuto) continue;
      if (line.trimStart().startsWith(">")) continue;
      for (const w of WORDS) {
        const re = new RegExp("\\b" + w + "\\b", "i");
        if (re.test(line)) {
          if (!perFile[f]) perFile[f] = {};
          perFile[f][w] = (perFile[f][w] || 0) + 1;
          if (samples[w].length < 3) samples[w].push(line.slice(0, 140));
        }
      }
    }
  }
}

walk("content");

console.log("=== Banned vocabulary samples ===");
for (const w of WORDS) {
  if (samples[w].length === 0) continue;
  console.log(w + ":");
  samples[w].forEach(s => console.log("  " + s));
}

console.log("\n=== Top files ===");
const sorted = Object.entries(perFile)
  .map(([f, counts]) => [f, Object.values(counts).reduce((a, b) => a + b, 0), counts])
  .sort((a, b) => b[1] - a[1]);
sorted.slice(0, 20).forEach(([f, total, counts]) => {
  console.log(`  ${total}  ${f.replace(/.*content/, "content")}  ${JSON.stringify(counts)}`);
});
console.log(`\n${sorted.length} profiles contain banned vocab`);
