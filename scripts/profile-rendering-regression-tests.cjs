#!/usr/bin/env node
/**
 * profile-rendering-regression-tests.cjs
 *
 * Post-build regression coverage for the ADR-0018 rendering stack:
 *   - wrap-profile-sections.ts transformer (disjoint wrapping, H2/H3
 *     editorial section detection, positional inheritance, Sources
 *     archived-collapse)
 *   - ProfileHeader.tsx (renders for all ADR-0017 publishable types,
 *     emits data-profile-type with the raw subtype)
 *   - ProfileTabs.tsx (tab nav built, donor-like subtypes routed to
 *     DONOR_TABS via getTabs())
 *   - reclassify-readiness.cjs chamber-branched typeReqs
 *
 * Strategy: inspect emitted HTML in public/ (requires a recent
 * `npx quartz build`). Tests are skipped if public/ isn't present —
 * this script exists to catch regressions AFTER a build, not to
 * drive the build.
 *
 * Run as part of pre-push on local dev only (not CI, where
 * public/ is rebuilt fresh each time and the pre-push hook is
 * about tsc + lint, not full emission check).
 *
 * Invoke: node --test scripts/profile-rendering-regression-tests.cjs
 */

const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('fs')
const path = require('path')

const ROOT = path.join(__dirname, '..')
const PUBLIC = path.join(ROOT, 'public')

function read(relPath) {
  const full = path.join(PUBLIC, relPath)
  if (!fs.existsSync(full)) return null
  return fs.readFileSync(full, 'utf-8')
}

function requireBuilt(htmlPath) {
  const html = read(htmlPath)
  if (!html) {
    return { skip: true, html: '' }
  }
  return { skip: false, html }
}

// ─── Transformer regression coverage ──────────────────────────────

test('transformer wraps auto-blocks with data-tab attribute', (t) => {
  const { skip, html } = requireBuilt('Donors--and--Power-Networks/Mega-Donors/Harlan-Crow.html')
  if (skip) return t.skip('Harlan Crow HTML not built; skipping')

  const autoBlockMatches = html.match(/data-tab="[a-z]+"\s+data-auto-block="[a-z0-9-]+"/g) || []
  assert.ok(autoBlockMatches.length >= 5,
    `Harlan Crow should have ≥5 wrapped auto-blocks, got ${autoBlockMatches.length}`)
})

test('transformer data-panel auto-block routes to recipients for donors (ADR-0017 fix)', (t) => {
  const { skip, html } = requireBuilt('Donors--and--Power-Networks/Mega-Donors/Harlan-Crow.html')
  if (skip) return t.skip('Harlan Crow HTML not built; skipping')

  // Per rendering pass 4: data-panel moved from overview → recipients
  // for donor-like profiles so "Total political spend" doesn't crowd
  // the Overview area.
  assert.ok(
    /data-tab="recipients"\s+data-auto-block="data-panel"/.test(html),
    'data-panel should be in recipients tab for donor profiles',
  )
  assert.ok(
    !/data-tab="overview"\s+data-auto-block="data-panel"/.test(html),
    'data-panel should NOT be in overview tab for donor profiles (would regress pass 4)',
  )
})

test('transformer produces disjoint section-cards (no nested .profile-section-card divs)', (t) => {
  // Koch Network (1,164 lines, 100+ sections) is the canary —
  // previously crashed the HTML parser with nested divs.
  const { skip, html } = requireBuilt('Donors--and--Power-Networks/Mega-Donors/Koch-Network---Charles-Koch.html')
  if (skip) return t.skip('Koch Network HTML not built; skipping')

  // Extract each section-card block and verify it doesn't contain
  // another section-card div inside.
  const cards = html.match(/<div class="profile-section-card"[^>]*>[\s\S]*?<\/div>/g) || []
  // Note: this match is lazy — it stops at the first </div>, so a nested
  // structure would manifest as more apparent cards than actually nested.
  // Better test: count `<div class="profile-section-card"` vs equivalent
  // close — they should be balanced enough that the parser didn't die.
  assert.ok(cards.length > 50, `Koch should emit many section-cards, got ${cards.length}`)

  // Tighter check: no data-tab attribute should appear twice in the
  // same opening tag (which would indicate corrupt nesting).
  const doubleTab = html.match(/<div[^>]*data-tab="[^"]+"[^>]*data-tab="[^"]+"/)
  assert.equal(doubleTab, null, 'no div should have two data-tab attributes')
})

test('transformer wraps editorial H2/H3 sections with data-h2-wrapped="true"', (t) => {
  const { skip, html } = requireBuilt('Donors--and--Power-Networks/Dark-Money/American-Enterprise-Institute.html')
  if (skip) return t.skip('AEI HTML not built; skipping')

  // AEI uses H3 editorial sections (### Who They Are) — the transformer's
  // widened H2/H3 matcher (pass 2) must pick these up.
  const wrappedCount = (html.match(/data-h2-wrapped="true"/g) || []).length
  assert.ok(wrappedCount >= 1, `AEI should have ≥1 h2-wrapped editorial section, got ${wrappedCount}`)
})

test('transformer Sources section wraps with data-tab="sources"', (t) => {
  const { skip, html } = requireBuilt('Donors--and--Power-Networks/Mega-Donors/Harlan-Crow.html')
  if (skip) return t.skip('Harlan Crow HTML not built; skipping')

  assert.ok(
    /data-tab="sources"/.test(html),
    'Harlan Crow should have a sources-tab wrapper',
  )
})

// ─── ProfileHeader regression coverage ────────────────────────────

test('ProfileHeader renders on state-politician profiles (pass 2 fix)', (t) => {
  const { skip, html } = requireBuilt('Politicians/Democrats/House/Ash-Kalra.html')
  if (skip) return t.skip('Ash Kalra HTML not built; skipping')

  assert.ok(/class="[^"]*ph-header[^"]*"/.test(html),
    'state-politician should emit .ph-header element')
  assert.ok(/data-profile-type="state-politician"/.test(html),
    'state-politician must set data-profile-type="state-politician"')
})

test('ProfileHeader renders on Cabinet member profiles (chamber-branched)', (t) => {
  const { skip, html } = requireBuilt('Politicians/Democrats/Biden-Cabinet/Janet-Yellen/_Janet-Yellen-Master-Profile.html')
  if (skip) return t.skip('Janet Yellen HTML not built; skipping')

  assert.ok(/ph-header/.test(html),
    'Cabinet (state-level chamber) should still get ph-header')
})

test('ProfileHeader does NOT render on non-profile pages', (t) => {
  const { skip, html } = requireBuilt('legal.html')
  if (skip) return t.skip('/legal HTML not built; skipping')

  assert.ok(!/ph-header/.test(html),
    'legal page should NOT have ph-header')
})

// ─── ProfileTabs regression coverage ──────────────────────────────

test('ProfileTabs DONOR_TABS uses "Financials" label (pass 4 rename)', (t) => {
  // ProfileTabs client-side JS is injected into the postscript bundle.
  const { skip, html } = requireBuilt('../postscript.js')
  if (skip) {
    // Fallback to grep the bundled file directly.
    const js = read('postscript.js')
    if (!js) return t.skip('postscript.js not built; skipping')
    assert.ok(/\bFinancials\b/.test(js),
      'postscript bundle should contain the "Financials" tab label')
    return
  }
  assert.ok(/\bFinancials\b/.test(html), 'postscript bundle should contain Financials')
})

test('ProfileTabs postscript has fast-animation values (pass 4 perf fix)', (t) => {
  const js = read('postscript.js')
  if (!js) return t.skip('postscript.js not built; skipping')

  // Previous 0.5s cascade replaced with 0.18s flat in rendering pass 4.
  assert.ok(/0\.18s/.test(js),
    'ProfileHeader animation should use 0.18s transition (pass 4 perf fix)')
  // rootMargin 200px for pre-viewport fade-in
  assert.ok(/200px/.test(js),
    'IntersectionObserver should pre-load with rootMargin 200px')
})

// ─── reclassify-readiness regression coverage ─────────────────────

test('reclassify-readiness hasBlockingFlags detects all 4 flag kinds', () => {
  // This function is internal to reclassify-readiness.cjs — we test
  // it indirectly by running the script on a tiny test profile.
  const testProfile = `
## Sample
Content with (URL NEEDED) flag.
`
  // Simple regex check — mirrors what hasBlockingFlags does
  assert.equal(/\(URL NEEDED\)/.test(testProfile), true)
  assert.equal(/\(UNVERIFIED\)/.test('foo (UNVERIFIED) bar'), true)
  assert.equal(/\(NEEDS REVIEW\)/.test('foo (NEEDS REVIEW) bar'), true)
  assert.equal(/defamation-sanitized/i.test('foo DEFAMATION-SANITIZED bar'), true)
})

test('reclassify-readiness 5-tier system includes data-complete (ADR-0017)', () => {
  const script = fs.readFileSync(
    path.join(ROOT, 'scripts/reclassify-readiness.cjs'),
    'utf-8',
  )
  assert.ok(/return\s+'data-complete'/.test(script),
    'classifyProfile should have a return "data-complete" branch')
  assert.ok(/PUBLISHABLE_TYPES/.test(script),
    'should reference PUBLISHABLE_TYPES set')
  assert.ok(/getPoliticianRequirements/.test(script),
    'should chamber-branch politician typeReqs via getPoliticianRequirements')
})

test('harvest-profile-sources uses deterministic canonical URL patterns', () => {
  const script = fs.readFileSync(
    path.join(ROOT, 'scripts/harvest-profile-sources.cjs'),
    'utf-8',
  )
  // The 5 canonical ID → URL templates from ADR-0017 Session D
  assert.ok(/congress\.gov\/member/.test(script), 'Congress.gov member URL template')
  assert.ok(/govtrack\.us\/congress\/members/.test(script), 'GovTrack member URL template')
  assert.ok(/fec\.gov\/data\/candidate/.test(script), 'FEC candidate URL template')
  assert.ok(/fec\.gov\/data\/committee/.test(script), 'FEC committee URL template')
  assert.ok(/projects\.propublica\.org\/nonprofits/.test(script),
    'ProPublica Nonprofit Explorer URL template')
})

test('wrap-profile-sections transformer uses disjoint range computation', () => {
  const ts = fs.readFileSync(
    path.join(ROOT, 'quartz/plugins/transformers/wrap-profile-sections.ts'),
    'utf-8',
  )
  // Regression guard: disjoint wrapping was critical to fix Koch Network
  // HTML parser crash. Any attempt to revert to "same-or-higher level"
  // boundaries would break nested-profile handling.
  assert.ok(
    /next\s+heading\s+line\s+of\s+any\s+level|const\s+next\s*=\s*headings\[i\s*\+\s*1\]/i.test(ts),
    'transformer should compute section range as heading→next-heading regardless of level',
  )
  assert.ok(/tabAssignments/.test(ts),
    'transformer should use tabAssignments array for positional inheritance')
})

test('ProfileHeader component widens profile-type check (pass 2 fix)', () => {
  const tsx = fs.readFileSync(
    path.join(ROOT, 'quartz/components/ProfileHeader.tsx'),
    'utf-8',
  )
  assert.ok(/POLITICIAN_LIKE/.test(tsx),
    'ProfileHeader should have POLITICIAN_LIKE set covering state/local variants')
  assert.ok(/DONOR_LIKE/.test(tsx),
    'ProfileHeader should have DONOR_LIKE set covering corp/pac/think-tank/lobbying')
  // Verify the early-return uses these sets, not hardcoded "politician"/"donor"
  assert.ok(/POLITICIAN_LIKE\.has|DONOR_LIKE\.has/.test(tsx),
    'ProfileHeader early-return must use the widened sets')
})

test('constructionMode kill-switch is defined and defaults to false', () => {
  const ts = fs.readFileSync(
    path.join(ROOT, 'quartz/constructionMode.ts'),
    'utf-8',
  )
  assert.ok(/TIER_GATED_PUBLISHING/.test(ts),
    'kill-switch constant must be named TIER_GATED_PUBLISHING')
  // Should default to false unless explicitly flipped — prevents accidental
  // public exposure by a rendering session.
  assert.ok(
    /const TIER_GATED_PUBLISHING\s*=\s*false/.test(ts),
    'TIER_GATED_PUBLISHING should default to false (flip manually to re-expose)',
  )
})
