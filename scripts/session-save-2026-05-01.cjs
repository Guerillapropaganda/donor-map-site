#!/usr/bin/env node
// One-shot script to update Session State.md with the 2026-05-01 handoff block.
const fs = require('fs');
const path = require('path');

const HANDOFF_FILE = path.join(__dirname, 'session-save-2026-05-01-handoff.md');
const STATE_FILE = 'content/Session State.md';

const newHandoff = fs.readFileSync(HANDOFF_FILE, 'utf-8');

let t = fs.readFileSync(STATE_FILE, 'utf-8');

// Update frontmatter last-updated
t = t.replace(/^last-updated: 2026-04-30$/m, 'last-updated: 2026-05-01');

// Insert new handoff before the previous one
const insertPoint = t.indexOf('## HANDOFF — 2026-04-30 PM');
if (insertPoint < 0) { console.error('Could not find insert point'); process.exit(1); }

t = t.slice(0, insertPoint) + newHandoff + '\n' + t.slice(insertPoint);

fs.writeFileSync(STATE_FILE, t, 'utf-8');
console.log('Updated Session State.md (' + t.length + ' bytes)');

// Clean up the temp handoff file
fs.unlinkSync(HANDOFF_FILE);
console.log('Cleaned up temp handoff file');
