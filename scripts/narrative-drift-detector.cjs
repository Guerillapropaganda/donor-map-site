#!/usr/bin/env node
/**
 * narrative-drift-detector.cjs — Attention Queue producer (Option B)
 *
 * Hand-written narrative sections drift from reality fast. Example: Trump's
 * "Connections to Existing Vault" says Chad Bianco has Trump's endorsement,
 * but Trump endorsed Steve Hilton and snubbed Bianco a week later. Nothing
 * flags that sentence as stale — structured data rebuilds nightly, prose
 * doesn't.
 *
 * This script does event-driven invalidation: when a new event in
 * `data/events.jsonl` names an entity that appears in a verified profile's
 * narrative prose, flag the profile for a re-read. Entry points you at the
 * specific paragraph so you're not rereading entire profiles.
 *
 * Scope:
 *   - Only inspects profiles at content-readiness: verified OR ready
 *     (ignores draft/raw — those are expected to drift)
 *   - Only considers events from the last 30 days
 *   - Only considers narrative sections (not frontmatter, not auto-generated
 *     data panels, not tables, not code blocks)
 *   - Ignores entities with <3 characters (catches "US", "a", etc.)
 *   - Doesn't double-flag the profile the event is primarily about (e.g.
 *     a Trump endorsement event doesn't flag Trump's own profile, it flags
 *     the profile of the endorsed politician)
 *
 * Usage:
 *   node scripts/narrative-drift-detector.cjs                 # write + report
 *   node scripts/narrative-drift-detector.cjs --dry-run       # scan, print, no queue write
 *   node scripts/narrative-drift-detector.cjs --since=60      # look back 60 days instead of 30
 *
 * Registered in attention-dispatcher.cjs to run every 4 hours.
 */

const fs = require('fs');
const path = require('path');
const { addEntries } = require('./lib/attention-queue.cjs');

const ROOT = path.join(__dirname, '..');
const CONTENT_DIR = path.join(ROOT, 'content');
const EVENTS_FILE = path.join(ROOT, 'data', 'events.jsonl');
const ENTITIES_FILE = path.join(ROOT, 'data', 'entities.jsonl');
const SOURCE_NAME = 'narrative-drift-detector';

const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const SINCE_DAYS = (() => {
  const m = args.find((a) => a.startsWith('--since='));
  if (!m) return 30;
  const n = parseInt(m.split('=')[1], 10);
  return Number.isFinite(n) && n > 0 ? n : 30;
})();

// ─────────────────────────────────────────────────────────
// Load events in the recent window.
// ─────────────────────────────────────────────────────────
function loadRecentEvents() {
  if (!fs.existsSync(EVENTS_FILE)) return [];
  const cutoffMs = Date.now() - SINCE_DAYS * 24 * 60 * 60 * 1000;
  const events = [];
  for (const line of fs.readFileSync(EVENTS_FILE, 'utf-8').split('\n')) {
    if (!line.trim()) continue;
    let e;
    try {
      e = JSON.parse(line);
    } catch {
      continue;
    }
    const dateStr = e.date || e.first_seen || e.last_updated;
    if (!dateStr) continue;
    const t = Date.parse(dateStr);
    if (!Number.isFinite(t)) continue;
    if (t < cutoffMs) continue;
    events.push({
      id: e.id,
      title: e.title || '',
      date: dateStr.slice(0, 10),
      stakeholders: Array.isArray(e.stakeholders) ? e.stakeholders : [],
      sponsors: Array.isArray(e.sponsors) ? e.sponsors : [],
      source_url: e.source_url || '',
      type: e.type || '',
    });
  }
  return events;
}

// ─────────────────────────────────────────────────────────
// Load canonical entity names (people, orgs, PACs, etc.) so we can
// match entity mentions in profile prose without false positives on
// common English words.
// ─────────────────────────────────────────────────────────
function loadEntityNames() {
  if (!fs.existsSync(ENTITIES_FILE)) return [];
  const names = new Set();
  for (const line of fs.readFileSync(ENTITIES_FILE, 'utf-8').split('\n')) {
    if (!line.trim()) continue;
    try {
      const e = JSON.parse(line);
      if (e.name && e.name.length >= 3) names.add(String(e.name));
    } catch {}
  }
  return [...names];
}

// ─────────────────────────────────────────────────────────
// Walk all verified/ready profiles.
// ─────────────────────────────────────────────────────────
function listProfiles() {
  const out = [];
  function walk(dir) {
    let entries;
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const ent of entries) {
      const full = path.join(dir, ent.name);
      if (ent.isDirectory()) {
        // Skip archive / drafts / admin
        if (ent.name === 'Vault Maintenance' || ent.name === 'Drafts' || ent.name === 'Archive') continue;
        if (ent.name === '_archive' || ent.name === 'Admin Notes' || ent.name === 'Checklists') continue;
        walk(full);
        continue;
      }
      if (!ent.name.endsWith('.md')) continue;
      out.push(full);
    }
  }
  walk(CONTENT_DIR);
  return out;
}

function parseFrontmatter(src) {
  const m = src.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!m) return { fm: {}, body: src };
  const fm = {};
  for (const line of m[1].split('\n')) {
    const km = line.match(/^(\w[\w-]*)\s*:\s*(.*)$/);
    if (km) fm[km[1]] = km[2].replace(/^["']|["']$/g, '').trim();
  }
  return { fm, body: m[2] };
}

// Walk body line-by-line; yield narrative lines alongside their
// "current H2 heading" context. Skips fenced code, auto-generated
// data blocks, markdown tables, and source list URLs.
function* narrativeLines(body) {
  const lines = body.split('\n');
  let inCodeBlock = false;
  let inAutoBlock = false;
  let currentHeading = 'Opening';
  for (const line of lines) {
    const trimmed = line.trim();

    // Track current H2 heading regardless of block state
    const h2 = trimmed.match(/^##\s+(.+)/);
    if (h2) {
      currentHeading = h2[1].trim();
      continue;
    }

    if (/^```/.test(trimmed) || /^~~~/.test(trimmed)) {
      inCodeBlock = !inCodeBlock;
      continue;
    }
    if (inCodeBlock) continue;

    if (/<!--\s*auto-block:start/i.test(line) || /<!--\s*Build:/i.test(line) || /<!--\s*Auto-generated/i.test(line)) {
      inAutoBlock = true;
    }
    if (/<!--\s*auto-block:end/i.test(line)) {
      inAutoBlock = false;
      continue;
    }
    if (inAutoBlock) continue;

    if (/^\s*\|.*\|\s*$/.test(line)) continue;
    if (/^\s*-\s*\[.*\]\(http/i.test(line)) continue;

    yield { line, heading: currentHeading };
  }
}

// ─────────────────────────────────────────────────────────
// Main scan
// ─────────────────────────────────────────────────────────
function main() {
  const events = loadRecentEvents();
  if (events.length === 0) {
    console.log(`[narrative-drift-detector] No events in last ${SINCE_DAYS} days. Nothing to check.`);
    if (!DRY_RUN) addEntries(SOURCE_NAME, []);
    return;
  }

  const entityNames = loadEntityNames();
  const profiles = listProfiles();

  // Build event -> mentioned entity names. Prefer stakeholders/sponsors
  // since those are already structured; fall back to substring-matching
  // known entity names in the title.
  const eventMentions = events.map((ev) => {
    const mentioned = new Set();
    for (const s of ev.stakeholders) mentioned.add(s);
    for (const s of ev.sponsors) mentioned.add(s);
    if (mentioned.size === 0 && ev.title) {
      // Cheap entity-name lookup in the title string
      for (const name of entityNames) {
        if (name.length < 4) continue;
        if (ev.title.includes(name)) mentioned.add(name);
      }
    }
    return { event: ev, mentioned: [...mentioned] };
  });

  const entries = [];
  let scanned = 0;
  let flagged = 0;

  for (const filePath of profiles) {
    const relPath = path.relative(ROOT, filePath).replace(/\\/g, '/');
    let src;
    try {
      src = fs.readFileSync(filePath, 'utf-8');
    } catch {
      continue;
    }
    const { fm, body } = parseFrontmatter(src);

    const readiness = String(fm['content-readiness'] || '').toLowerCase();
    if (readiness !== 'verified' && readiness !== 'ready' && readiness !== 'publication-ready') continue;

    const profileTitle = String(fm.title || path.basename(filePath, '.md').replace(/^_/, '').replace(/\s*Master Profile.*/i, ''));
    scanned++;

    const flaggedForThisProfile = [];
    // Pass 1: for each narrative line + its heading, check every event-mentioned entity.
    for (const { line, heading } of narrativeLines(body)) {
      if (!line.trim()) continue;
      for (const { event, mentioned } of eventMentions) {
        for (const name of mentioned) {
          if (!name || name.length < 3) continue;
          if (profileTitle.includes(name) || name.includes(profileTitle)) continue;
          if (!line.includes(name)) continue;
          flaggedForThisProfile.push({
            eventTitle: event.title,
            eventDate: event.date,
            eventType: event.type,
            mentionedName: name,
            profileHeading: heading,
          });
        }
      }
    }

    if (flaggedForThisProfile.length === 0) continue;

    // Collapse multi-flags into one queue entry per profile — otherwise
    // David gets drowned. Each entry mentions the first hit + total count.
    const top = flaggedForThisProfile[0];
    const additionalCount = flaggedForThisProfile.length - 1;
    const why =
      `New event (${top.eventDate}) "${top.eventTitle.slice(0, 80)}" mentions ${top.mentionedName}. ` +
      `Profile narrative in "${top.profileHeading}" references ${top.mentionedName}.` +
      (additionalCount > 0 ? ` +${additionalCount} more event(s) name entities in this profile.` : '');

    entries.push({
      bucket: 'deciding',
      what: `Re-read ${profileTitle} › ${top.profileHeading}`,
      why: why.slice(0, 390),
      where: relPath,
      cost_min: 3,
      leverage: 4,
      metadata: {
        profile: profileTitle,
        events: flaggedForThisProfile.slice(0, 5).map((f) => ({
          date: f.eventDate,
          title: f.eventTitle,
          entity: f.mentionedName,
          heading: f.profileHeading,
        })),
      },
    });
    flagged++;
  }

  console.log(`[narrative-drift-detector] Scanned ${scanned} verified/ready profiles, flagged ${flagged} for re-read.`);
  console.log(`[narrative-drift-detector] Window: last ${SINCE_DAYS} days, ${events.length} events considered.`);

  if (DRY_RUN) {
    for (const e of entries.slice(0, 10)) {
      console.log(`  - ${e.what}  (${e.why.slice(0, 100)}...)`);
    }
    if (entries.length > 10) console.log(`  ... +${entries.length - 10} more`);
  } else {
    addEntries(SOURCE_NAME, entries);
    console.log(`[narrative-drift-detector] Wrote ${entries.length} entries to the Attention Queue.`);
  }
}

try {
  main();
} catch (err) {
  console.error('[narrative-drift-detector] FATAL:', err.message);
  process.exit(1);
}
