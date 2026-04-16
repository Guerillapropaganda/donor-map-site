const pdf = require('pdf-parse');
const fs = require('fs');

const data = fs.readFileSync('C:/Users/third/OneDrive/Desktop/Images/Guerilla Propaganda/PAC3a_2025_6m.pdf');

pdf(data).then(d => {
  const lines = d.text.split('\n').map(l => l.trim()).filter(Boolean);
  const committees = {};

  for (const line of lines) {
    // Match: C00123456NAME ... or C00123456 NAME ...
    const m = line.match(/^(C\d{8})\s*([A-Z][A-Z ,.'&()-]{3,})/);
    if (m) {
      const id = m[1];
      // Strip trailing dollar amounts
      const name = m[2].replace(/\s+\$[\d,]+.*$/, '').trim();
      committees[id] = name;
    }
  }

  console.log('Total extracted:', Object.keys(committees).length);

  // Cross-reference against unmatched list
  const unmatched = fs.readFileSync('content/Admin Notes/fec-unmatched-committees.md', 'utf8');
  const unmatchedRows = unmatched.split('\n').filter(l => l.startsWith('|') && !l.startsWith('| Committee') && !l.startsWith('|---'));
  const unmatchedNames = unmatchedRows.map(r => r.split('|')[1]?.trim().toUpperCase()).filter(Boolean);

  const byName = {};
  for (const [id, name] of Object.entries(committees)) byName[name.toUpperCase()] = id;

  console.log('\n=== MATCHES FOUND ===');
  let hits = 0;
  for (const name of unmatchedNames) {
    if (byName[name]) {
      console.log(byName[name] + ' | ' + name);
      hits++;
      continue;
    }
    // fuzzy: strip trailing period/comma
    const clean = name.replace(/[.,]+$/, '').trim();
    if (byName[clean]) {
      console.log(byName[clean] + ' | ' + name + ' (fuzzy)');
      hits++;
    }
  }
  console.log('\nTotal hits:', hits, '/', unmatchedNames.length, 'unmatched');
});
