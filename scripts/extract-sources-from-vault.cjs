#!/usr/bin/env node
/**
 * extract-sources-from-vault.cjs — Phase 1 / Source Registry
 *
 * Walks content/**\/*.md, pulls every external markdown link, and registers
 * each one in data/sources.jsonl via sources-store.addOrFindSource().
 *
 * Fast pass (Option B from the planning discussion):
 *   - does NOT fetch URLs
 *   - does NOT compute content hashes
 *   - just discovers + registers links with status='unverified'
 *
 * A separate script (sources-fingerprint.cjs, next) will fetch and populate
 * title, content_hash, final_host, expected_strings, and transition status.
 *
 * Usage:
 *   node scripts/extract-sources-from-vault.cjs               # full vault
 *   node scripts/extract-sources-from-vault.cjs --dry-run     # no writes
 *   node scripts/extract-sources-from-vault.cjs --dir "content/Donors & Power Networks/Agriculture"
 *   node scripts/extract-sources-from-vault.cjs --verbose     # per-file logging
 *
 * Safety:
 *   - Swallows directory-read errors (Windows illegal-char dirs)
 *   - Tolerates malformed markdown links
 *   - Logs suspicious links but never crashes
 *   - Stats reported at end: files scanned, links found, new / existing / skipped
 */

const fs = require('fs');
const path = require('path');
const store = require('./lib/sources-store.cjs');

// ─── CLI args ───────────────────────────────────────────────────────────

const argv = process.argv.slice(2);
const DRY_RUN = argv.includes('--dry-run');
const VERBOSE = argv.includes('--verbose');
const dirFlag = argv.indexOf('--dir');
const TARGET_DIR =
  dirFlag !== -1 && argv[dirFlag + 1]
    ? argv[dirFlag + 1]
    : path.join(__dirname, '..', 'content');

// ─── Source type / tier heuristics ──────────────────────────────────────

// Map host substring → { source_type, tier }
// Order matters — most specific first.
const HOST_RULES = [
  // Government primary (Tier 1)
  { match: 'fec.gov', type: 'government_primary', tier: 1 },
  { match: 'congress.gov', type: 'government_primary', tier: 1 },
  { match: 'sec.gov', type: 'government_primary', tier: 1 },
  { match: 'lda.gov', type: 'government_primary', tier: 1 },
  { match: 'lda.senate.gov', type: 'government_primary', tier: 1 },
  { match: 'gao.gov', type: 'government_primary', tier: 1 },
  { match: 'govinfo.gov', type: 'government_primary', tier: 1 },
  { match: 'usaspending.gov', type: 'government_primary', tier: 1 },
  { match: 'sam.gov', type: 'government_primary', tier: 1 },
  { match: 'treasury.gov', type: 'government_primary', tier: 1 },
  { match: 'supremecourt.gov', type: 'court_record', tier: 1 },
  { match: 'irs.gov', type: 'government_primary', tier: 1 },
  { match: 'nlrb.gov', type: 'government_primary', tier: 1 },
  { match: 'doj.gov', type: 'government_primary', tier: 1 },
  { match: 'justice.gov', type: 'government_primary', tier: 1 },
  { match: 'house.gov', type: 'government_primary', tier: 1 },
  { match: 'senate.gov', type: 'government_primary', tier: 1 },
  { match: 'whitehouse.gov', type: 'government_primary', tier: 1 },
  { match: 'nhtsa.gov', type: 'government_primary', tier: 1 },
  { match: 'epa.gov', type: 'government_primary', tier: 1 },
  // Government secondary
  { match: 'govtrack.us', type: 'government_secondary', tier: 2 },
  { match: 'projects.propublica.org/nonprofits', type: 'government_secondary', tier: 1 },
  // Court records
  { match: 'courtlistener.com', type: 'court_record', tier: 1 },
  { match: 'pacer.gov', type: 'court_record', tier: 1 },
  // News major
  { match: 'nytimes.com', type: 'news_major', tier: 2 },
  { match: 'washingtonpost.com', type: 'news_major', tier: 2 },
  { match: 'wsj.com', type: 'news_major', tier: 2 },
  { match: 'reuters.com', type: 'news_major', tier: 2 },
  { match: 'apnews.com', type: 'news_major', tier: 2 },
  { match: 'bloomberg.com', type: 'news_major', tier: 2 },
  { match: 'theguardian.com', type: 'news_major', tier: 2 },
  { match: 'cnn.com', type: 'news_major', tier: 2 },
  { match: 'nbcnews.com', type: 'news_major', tier: 2 },
  { match: 'cbsnews.com', type: 'news_major', tier: 2 },
  { match: 'abcnews.go.com', type: 'news_major', tier: 2 },
  { match: 'npr.org', type: 'news_major', tier: 2 },
  { match: 'politico.com', type: 'news_major', tier: 2 },
  { match: 'axios.com', type: 'news_major', tier: 2 },
  // Investigative
  { match: 'propublica.org', type: 'investigative', tier: 2 },
  { match: 'icij.org', type: 'investigative', tier: 2 },
  { match: 'citizensforethics.org', type: 'investigative', tier: 2 },
  { match: 'opensecrets.org', type: 'aggregator', tier: 3 },
  { match: 'followthemoney.org', type: 'aggregator', tier: 3 },
  { match: 'votesmart.org', type: 'aggregator', tier: 3 },
  // Archive
  { match: 'web.archive.org', type: 'archive', tier: null },
  { match: 'archive.org', type: 'archive', tier: null },
  { match: 'archive.today', type: 'archive', tier: null },
  { match: 'archive.ph', type: 'archive', tier: null },
  // Social
  { match: 'twitter.com', type: 'social', tier: 4 },
  { match: 'x.com', type: 'social', tier: 4 },
  { match: 'facebook.com', type: 'social', tier: 4 },
  { match: 'linkedin.com', type: 'social', tier: 4 },
  { match: 'youtube.com', type: 'social', tier: 3 },
  // Wikis / reference
  { match: 'wikipedia.org', type: 'aggregator', tier: 3 },
  { match: 'wikidata.org', type: 'aggregator', tier: 3 },
  { match: 'wikimedia.org', type: 'aggregator', tier: 3 },
  { match: 'ballotpedia.org', type: 'aggregator', tier: 3 },
  // Aggregators / trackers
  { match: 'legistorm.com', type: 'aggregator', tier: 3 },
  { match: 'influencewatch.org', type: 'aggregator', tier: 3 },
  { match: 'sourcewatch.org', type: 'aggregator', tier: 3 },
  { match: 'gleif.org', type: 'government_secondary', tier: 2 },
  // Advocacy / think tanks / labor policy
  { match: 'epi.org', type: 'advocacy', tier: 2 },
  { match: 'ucs.org', type: 'advocacy', tier: 2 },
  { match: 'ucsusa.org', type: 'advocacy', tier: 2 },
  { match: 'iatp.org', type: 'advocacy', tier: 2 },
  { match: 'ewg.org', type: 'advocacy', tier: 2 },
  { match: 'nrdc.org', type: 'advocacy', tier: 2 },
  { match: 'sierraclub.org', type: 'advocacy', tier: 2 },
  { match: 'aclu.org', type: 'advocacy', tier: 2 },
  { match: 'splcenter.org', type: 'advocacy', tier: 2 },
  { match: 'brennancenter.org', type: 'advocacy', tier: 2 },
  { match: 'commondreams.org', type: 'advocacy', tier: 3 },
  // News — regional / trade / investigative
  { match: 'calmatters.org', type: 'news_regional', tier: 2 },
  { match: 'texastribune.org', type: 'news_regional', tier: 2 },
  { match: 'missouriindependent.com', type: 'news_regional', tier: 2 },
  { match: 'wlrn.org', type: 'news_regional', tier: 2 },
  { match: 'investigatemidwest.org', type: 'investigative', tier: 2 },
  { match: 'civileats.com', type: 'trade_press', tier: 2 },
  { match: 'insideclimatenews.org', type: 'investigative', tier: 2 },
  { match: 'motherjones.com', type: 'investigative', tier: 2 },
  { match: 'thenation.com', type: 'news_major', tier: 2 },
  { match: 'jacobin.com', type: 'news_major', tier: 2 },
  { match: 'theintercept.com', type: 'investigative', tier: 2 },
  { match: 'mronline.org', type: 'news_major', tier: 3 },
  { match: 'fortune.com', type: 'news_major', tier: 2 },
  { match: 'forbes.com', type: 'news_major', tier: 2 },
  { match: 'businessinsider.com', type: 'news_major', tier: 2 },
  { match: 'yahoo.com', type: 'news_major', tier: 3 },
  { match: 'thehill.com', type: 'news_major', tier: 2 },
  { match: 'vox.com', type: 'news_major', tier: 2 },
  { match: 'theatlantic.com', type: 'news_major', tier: 2 },
  { match: 'newyorker.com', type: 'news_major', tier: 2 },
  { match: 'newsweek.com', type: 'news_major', tier: 2 },
  { match: 'time.com', type: 'news_major', tier: 2 },
  { match: 'usatoday.com', type: 'news_major', tier: 2 },
  { match: 'latimes.com', type: 'news_major', tier: 2 },
  { match: 'bostonglobe.com', type: 'news_major', tier: 2 },
  { match: 'sfchronicle.com', type: 'news_regional', tier: 2 },
  { match: 'chicagotribune.com', type: 'news_regional', tier: 2 },
  { match: 'houstonchronicle.com', type: 'news_regional', tier: 2 },
  { match: 'miamiherald.com', type: 'news_regional', tier: 2 },
  { match: 'latino.com', type: 'news_regional', tier: 3 },
  // Academic
  { match: '.edu', type: 'academic', tier: 2 },
  // EWG Farm subsidy DB (primary-ish via FOIA)
  { match: 'farm.ewg.org', type: 'government_secondary', tier: 2 },
];

function classifyUrl(url) {
  let host = '';
  try {
    host = new URL(url).hostname.toLowerCase().replace(/^www\./, '');
  } catch (_) {
    return { source_type: 'other', tier: null };
  }
  for (const rule of HOST_RULES) {
    if (host.includes(rule.match) || url.toLowerCase().includes(rule.match)) {
      return { source_type: rule.type, tier: rule.tier };
    }
  }
  // .gov fallback → government_primary Tier 1
  if (host.endsWith('.gov')) return { source_type: 'government_primary', tier: 1 };
  return { source_type: 'other', tier: null };
}

// ─── Walker ─────────────────────────────────────────────────────────────

function walkMarkdownFiles(rootDir, onFile) {
  let stack = [rootDir];
  while (stack.length) {
    const dir = stack.pop();
    let entries;
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch (e) {
      // Windows illegal-char dirs, permission errors, etc. Log and skip.
      if (VERBOSE) console.warn(`  ! skip unreadable dir: ${dir} (${e.code || e.message})`);
      continue;
    }
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        stack.push(full);
      } else if (entry.isFile() && entry.name.toLowerCase().endsWith('.md')) {
        try {
          onFile(full);
        } catch (e) {
          console.warn(`  ! error in ${full}: ${e.message}`);
        }
      }
    }
  }
}

// ─── Link extraction ────────────────────────────────────────────────────

// Match [text](url) — conservative. Does not match bare URLs or wikilinks.
// Allows balanced parens inside url (Wikipedia-style) with a non-greedy +
// lookahead fallback.
const MARKDOWN_LINK_RE = /\[([^\]]+)\]\((https?:\/\/[^\s)]+(?:\([^\s)]*\)[^\s)]*)*)\)/g;

// Strikethrough markdown: ~~[text](url)~~ — already-archived, still register
// but mark entity_ref so the future status update can flag it.
const STRIKETHROUGH_WRAP_RE = /~~.*?~~/;

function extractLinksFromMarkdown(text) {
  const out = [];
  const seen = new Set(); // dedupe within a single file
  let m;
  MARKDOWN_LINK_RE.lastIndex = 0;
  while ((m = MARKDOWN_LINK_RE.exec(text)) !== null) {
    const rawText = m[1];
    const rawUrl = m[2].replace(/[).,;!?]+$/, ''); // strip common trailing punctuation
    if (!rawUrl || seen.has(rawUrl)) continue;
    seen.add(rawUrl);

    // Context around the match to detect strikethrough wrapping
    const start = Math.max(0, m.index - 3);
    const end = Math.min(text.length, m.index + m[0].length + 3);
    const ctx = text.slice(start, end);
    const strikethrough = ctx.includes('~~');

    out.push({ text: rawText, url: rawUrl, strikethrough });
  }
  return out;
}

// ─── Entity ref (profile title) extraction ──────────────────────────────

function getEntityRef(filePath, fileText) {
  // Try frontmatter title first
  const m = fileText.match(/^---\s*\n([\s\S]*?)\n---/);
  if (m) {
    const titleMatch = m[1].match(/^title:\s*["']?(.+?)["']?\s*$/m);
    if (titleMatch) return titleMatch[1].trim();
  }
  // Fallback: filename without extension
  return path.basename(filePath, '.md');
}

// ─── Main ───────────────────────────────────────────────────────────────

function main() {
  console.log('');
  console.log('═══ extract-sources-from-vault ═══');
  console.log(`  target:   ${TARGET_DIR}`);
  console.log(`  dry-run:  ${DRY_RUN}`);
  console.log(`  verbose:  ${VERBOSE}`);
  console.log('');

  if (!fs.existsSync(TARGET_DIR)) {
    console.error(`ERROR: target directory does not exist: ${TARGET_DIR}`);
    process.exit(1);
  }

  const stats = {
    filesScanned: 0,
    filesWithLinks: 0,
    linksFound: 0,
    newRegistered: 0,
    alreadyRegistered: 0,
    malformed: 0,
    strikethrough: 0,
    byType: {},
    byTier: {},
  };

  store.loadSources();
  const startingCount = store.countSources();

  walkMarkdownFiles(TARGET_DIR, (filePath) => {
    stats.filesScanned += 1;
    let text;
    try {
      text = fs.readFileSync(filePath, 'utf-8');
    } catch (e) {
      if (VERBOSE) console.warn(`  ! unreadable: ${filePath}`);
      return;
    }

    const links = extractLinksFromMarkdown(text);
    if (!links.length) return;
    stats.filesWithLinks += 1;

    const entityRef = getEntityRef(filePath, text);

    for (const link of links) {
      stats.linksFound += 1;
      if (link.strikethrough) stats.strikethrough += 1;

      const { source_type, tier } = classifyUrl(link.url);
      stats.byType[source_type] = (stats.byType[source_type] || 0) + 1;
      const tierKey = tier === null ? 'null' : String(tier);
      stats.byTier[tierKey] = (stats.byTier[tierKey] || 0) + 1;

      if (DRY_RUN) continue;

      try {
        const existing = store.findByUrl(link.url);
        if (existing) {
          stats.alreadyRegistered += 1;
          continue;
        }
        store.addOrFindSource({
          url: link.url,
          tier,
          source_type,
          entity_ref: entityRef,
          status: link.strikethrough ? 'archived' : 'unverified',
          title: link.text.length > 0 && link.text.length < 200 ? link.text : null,
        });
        stats.newRegistered += 1;
      } catch (e) {
        stats.malformed += 1;
        if (VERBOSE) console.warn(`  ! ${filePath}: ${e.message}`);
      }
    }
  });

  const endingCount = store.countSources();

  console.log('');
  console.log('═══ results ═══');
  console.log(`  files scanned:       ${stats.filesScanned}`);
  console.log(`  files with links:    ${stats.filesWithLinks}`);
  console.log(`  links found:         ${stats.linksFound}`);
  console.log(`  ├─ new registered:   ${stats.newRegistered}`);
  console.log(`  ├─ already in store: ${stats.alreadyRegistered}`);
  console.log(`  ├─ strikethrough:    ${stats.strikethrough}`);
  console.log(`  └─ malformed/errors: ${stats.malformed}`);
  console.log('');
  console.log('  by source_type:');
  const typeEntries = Object.entries(stats.byType).sort((a, b) => b[1] - a[1]);
  for (const [k, v] of typeEntries) console.log(`    ${k.padEnd(22)} ${v}`);
  console.log('');
  console.log('  by tier:');
  const tierEntries = Object.entries(stats.byTier).sort((a, b) => b[1] - a[1]);
  for (const [k, v] of tierEntries) console.log(`    tier ${k.padEnd(18)} ${v}`);
  console.log('');
  console.log(`  store size: ${startingCount} → ${endingCount}  (Δ ${endingCount - startingCount})`);
  console.log('');

  if (DRY_RUN) {
    console.log('  DRY RUN — no writes persisted');
    console.log('');
  }
}

main();
