const data = require('../reports/url-check.json');
const fs = require('fs');
const path = require('path');

const dead = data.dead_urls.filter(d => d.httpStatus === 404 || d.httpStatus === 410);
const batchSize = 50;

console.log(`Total dead URLs (404/410): ${dead.length}`);
console.log(`Generating ${Math.ceil(dead.length / batchSize)} batch files...\n`);

for (let i = 0; i < dead.length; i += batchSize) {
  const batch = dead.slice(i, i + batchSize);
  const batchNum = Math.floor(i / batchSize) + 1;
  let out = `BATCH ${batchNum} (${batch.length} URLs)\n\n`;
  out += `| # | dead_url | found_in_file |\n|---|---|---|\n`;
  batch.forEach((d, j) => {
    const file = d.files[0].split('\\').join('/');
    out += `| ${i + j + 1} | ${d.url} | ${file} |\n`;
  });
  const outPath = path.join(__dirname, '..', 'reports', `perplexity-batch-${batchNum}.md`);
  fs.writeFileSync(outPath, out);
  console.log(`  Wrote batch ${batchNum}: ${batch.length} URLs`);
}

console.log(`\nDone. Paste each batch into Perplexity after the prompt.`);
