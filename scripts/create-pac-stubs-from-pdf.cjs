const pdf = require('pdf-parse');
const fs = require('fs');
const path = require('path');

const data = fs.readFileSync('C:/Users/third/OneDrive/Desktop/Images/Guerilla Propaganda/PAC3a_2025_6m.pdf');

pdf(data).then(d => {
  const lines = d.text.split('\n').map(l => l.trim()).filter(Boolean);
  const pdfCommittees = {};

  for (const line of lines) {
    const m = line.match(/^(C\d{8})\s*([A-Z][A-Z ,.'&()-]{3,})/);
    if (m) {
      const id = m[1];
      const name = m[2].replace(/\s+\$[\d,]+.*$/, '').trim();
      pdfCommittees[name.toUpperCase()] = { id, pdfName: name };
    }
  }

  // Cross-reference against unmatched list
  const unmatched = fs.readFileSync('content/Admin Notes/fec-unmatched-committees.md', 'utf8');
  const unmatchedRows = unmatched.split('\n').filter(l => l.startsWith('|') && !l.startsWith('| Committee') && !l.startsWith('|---'));

  function toTitleCase(str) {
    const LOWER = new Set(['a','an','the','and','but','or','for','nor','on','at','to','by','in','of','up']);
    return str.toLowerCase().split(' ').map((w, i) => {
      if (i === 0 || !LOWER.has(w)) return w.charAt(0).toUpperCase() + w.slice(1);
      return w;
    }).join(' ');
  }

  function toSlug(str) {
    return str.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').trim();
  }

  const outDir = 'content/Donors & Power Networks/Dark Money';
  const reg = JSON.parse(fs.readFileSync('data/fec-committee-registry.json', 'utf8'));

  let created = 0, skipped = 0;
  const registryUpdates = {};

  for (const row of unmatchedRows) {
    const cols = row.split('|').map(c => c.trim()).filter(Boolean);
    if (!cols[0]) continue;
    const fecName = cols[0].toUpperCase();
    const support = parseInt((cols[2] || '').replace(/[\$,]/g, '')) || 0;
    const oppose = parseInt((cols[3] || '').replace(/[\$,]/g, '')) || 0;

    let match = pdfCommittees[fecName];
    if (!match) {
      const clean = fecName.replace(/[.,]+$/, '').trim();
      match = pdfCommittees[clean];
    }
    if (!match) continue;

    const { id, pdfName } = match;
    const title = toTitleCase(pdfName);
    const fileName = title + '.md';
    const filePath = path.join(outDir, fileName);

    if (fs.existsSync(filePath)) { skipped++; continue; }

    const supportStr = support > 0 ? `"$${support.toLocaleString()}"` : 'null';
    const opposeStr = oppose > 0 ? `"$${oppose.toLocaleString()}"` : 'null';
    const aliases = fecName !== pdfName.toUpperCase()
      ? `\naliases:\n  - "${cols[0]}"` : '';

    const frontmatter = `---
title: "${title}"
type: donor
content-readiness: raw
sector: "Dark Money"
entity-type: "Super PAC"
committee-id: "${id}"
fec-url: "https://www.fec.gov/data/committee/${id}/"
last-updated: "2026-04-15"
source-tier: 1
fec-ie-support: ${supportStr}
fec-ie-oppose: ${opposeStr}${aliases}
---
`;

    fs.writeFileSync(filePath, frontmatter);
    console.log('CREATED:', fileName, '| ID:', id);
    created++;

    // Update registry if entry exists
    if (reg[id]) {
      registryUpdates[id] = {
        vault_profile: `content/Donors & Power Networks/Dark Money/${fileName}`,
        vault_slug: toSlug(title),
        status: 'mapped',
        updated: new Date().toISOString(),
      };
    } else {
      // Add new entry
      reg[id] = {
        committee_id: id,
        fec_name: pdfName,
        aliases: fecName !== pdfName.toUpperCase() ? [fecName] : [],
        vault_profile: `content/Donors & Power Networks/Dark Money/${fileName}`,
        vault_slug: toSlug(title),
        status: 'mapped',
        source: 'fec-pdf-pac3a-2025',
        added: new Date().toISOString(),
        updated: new Date().toISOString(),
      };
      registryUpdates[id] = reg[id];
    }
  }

  if (Object.keys(registryUpdates).length > 0) {
    for (const [id, updates] of Object.entries(registryUpdates)) {
      Object.assign(reg[id], updates);
    }
    fs.writeFileSync('data/fec-committee-registry.json', JSON.stringify(reg, null, 2));
    console.log('\nRegistry updated:', Object.keys(registryUpdates).length, 'entries');
  }

  console.log(`\nDone. Created: ${created} | Skipped (exists): ${skipped}`);
});
