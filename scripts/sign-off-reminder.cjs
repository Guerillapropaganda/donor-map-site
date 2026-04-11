#!/usr/bin/env node
/**
 * sign-off-reminder.cjs — Nag David when the A+ queue is piling up
 *
 * The janitor stamps `audit-a-plus-passed: YYYY-MM-DD` on profiles
 * that pass every automated A+ check. These profiles are waiting ONLY
 * on David's manual editorial sign-off to become verified.
 *
 * If too many profiles sit in that queue for too long, the bottleneck
 * is David. This script:
 *   - Counts profiles with audit-a-plus-passed but no last-verified-by
 *   - Flags the queue if count > threshold OR oldest > threshold days
 *   - Writes a reminder note to Admin Notes if so
 *
 * Intended to run daily as a cron. On-demand is fine too.
 *
 * Usage: node scripts/sign-off-reminder.cjs
 *        node scripts/sign-off-reminder.cjs --threshold=50 --age-days=7
 */
const fs = require('fs');
const path = require('path');
const { walkDir, parseFrontmatter } = require('./lib/shared.cjs');

const CONTENT_DIR = process.env.CONTENT_DIR || path.join(__dirname, '..', 'content');

const THRESHOLD_ARG = process.argv.find(a => a.startsWith('--threshold='));
const AGE_ARG = process.argv.find(a => a.startsWith('--age-days='));
const QUEUE_THRESHOLD = THRESHOLD_ARG ? parseInt(THRESHOLD_ARG.split('=')[1]) : 50;
const AGE_THRESHOLD_DAYS = AGE_ARG ? parseInt(AGE_ARG.split('=')[1]) : 7;

function daysSince(dateStr) {
  if (!dateStr) return Infinity;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return Infinity;
  return Math.floor((Date.now() - d.getTime()) / 86400000);
}

function main() {
  const files = walkDir(CONTENT_DIR, '.md');
  const queue = [];
  for (const f of files) {
    let content;
    try { content = fs.readFileSync(f, 'utf-8'); } catch { continue; }
    const { data } = parseFrontmatter(content);
    if (!data) continue;
    if (!data['audit-a-plus-passed']) continue;
    if (data['last-verified-by'] === 'editorial') continue;  // already signed off
    queue.push({
      filePath: f,
      title: data.title,
      type: data.type,
      stampedAt: data['audit-a-plus-passed'],
      daysOld: daysSince(data['audit-a-plus-passed']),
    });
  }

  queue.sort((a, b) => b.daysOld - a.daysOld);

  const oldestDays = queue.length > 0 ? queue[0].daysOld : 0;
  const shouldNag = queue.length > QUEUE_THRESHOLD || oldestDays > AGE_THRESHOLD_DAYS;

  console.log('═══════════════════════════════════════════');
  console.log('  Sign-off Queue Reminder');
  console.log('═══════════════════════════════════════════');
  console.log(`  Queue size: ${queue.length} (threshold: ${QUEUE_THRESHOLD})`);
  console.log(`  Oldest in queue: ${oldestDays} days (threshold: ${AGE_THRESHOLD_DAYS})`);
  console.log(`  Status: ${shouldNag ? '🚨 NEEDS ATTENTION' : '✓ OK'}`);
  console.log('');

  if (!shouldNag) return;

  // Write a reminder note
  const today = new Date().toISOString().slice(0, 10);
  const reminderPath = path.join(CONTENT_DIR, 'Admin Notes', `signoff-reminder-${today}.md`);

  const lines = [];
  lines.push('---');
  lines.push(`title: "Sign-off reminder — ${today}"`);
  lines.push('type: admin-note');
  lines.push('note-type: data');
  lines.push('priority: urgent');
  lines.push('status: open');
  lines.push(`last-updated: '${today}'`);
  lines.push('generated-by: scripts/sign-off-reminder.cjs');
  lines.push('---');
  lines.push('');
  lines.push(`# 🚨 Sign-off queue needs attention`);
  lines.push('');
  lines.push(`**${queue.length} profiles** are mechanically ready for A+ (janitor stamped \`audit-a-plus-passed\`) but waiting for your manual editorial sign-off.`);
  lines.push('');
  lines.push(`The oldest has been waiting **${oldestDays} days**.`);
  lines.push('');
  lines.push('## How to clear the queue');
  lines.push('');
  lines.push('1. Open the ops app at http://localhost:3333/signoff-queue (or the dashboard "Ready for David" card)');
  lines.push('2. Walk through each profile. Verify:');
  lines.push('   - Narrative reads cleanly');
  lines.push('   - Class analysis is present and framed correctly');
  lines.push('   - No defamation-prone phrases that need legal review');
  lines.push('   - Factual claims are sourced');
  lines.push('3. If good: set `last-verified-by: editorial` (or click the sign-off button)');
  lines.push('4. If bad: demote to draft and document blocker in `editorial-notes`');
  lines.push('');
  lines.push('## Top 20 oldest in queue');
  lines.push('');
  queue.slice(0, 20).forEach(p => {
    const rel = path.relative(CONTENT_DIR, p.filePath).split(path.sep).join('/');
    lines.push(`- \`${p.daysOld}d\` **${p.title}** (${p.type}) — \`${rel}\``);
  });
  if (queue.length > 20) lines.push(`- _...and ${queue.length - 20} more_`);

  fs.writeFileSync(reminderPath, lines.join('\n'), 'utf-8');
  console.log(`Reminder note written: ${path.relative(process.cwd(), reminderPath)}`);
}

main();
