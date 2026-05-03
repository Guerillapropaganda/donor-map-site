#!/usr/bin/env node
/**
 * render-og-images.cjs — generate per-beat 1200x630 share cards (Open
 * Graph / Twitter Card) for the published beats + a Donor Map site
 * default. Run from main repo so node_modules resolves.
 *
 *   node scripts/render-og-images.cjs
 *
 * Output: quartz/static/share/<slug>.png (1200x630, brutalist cream/yellow)
 * Plus replaces quartz/static/og-image.png with the site default.
 *
 * Fonts: Inter Black + Inter Regular fetched once, cached at
 * scripts/lib/.fonts/ (gitignored).
 *
 * Each beat gets a deck-line and headline. To add a beat: append to CARDS.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const FONT_DIR = path.join(__dirname, 'lib', '.fonts');
const SHARE_DIR = path.join(ROOT, 'quartz', 'static', 'share');
const DEFAULT_OG_PATH = path.join(ROOT, 'quartz', 'static', 'og-image.png');

if (!fs.existsSync(FONT_DIR)) fs.mkdirSync(FONT_DIR, { recursive: true });
if (!fs.existsSync(SHARE_DIR)) fs.mkdirSync(SHARE_DIR, { recursive: true });

async function ensureFonts() {
  // @fontsource/inter ships latin .woff (no .ttf). Satori 0.10+ accepts
  // .woff directly. We resolve from node_modules so the script is offline-
  // capable once `npm install @fontsource/inter` has run once. Caller is
  // responsible for ensuring the package is installed (script run from
  // main repo where node_modules is available).
  const sources = [
    {
      target: path.join(FONT_DIR, 'Inter-Black.woff'),
      from: 'inter-latin-900-normal.woff',
    },
    {
      target: path.join(FONT_DIR, 'Inter-Regular.woff'),
      from: 'inter-latin-400-normal.woff',
    },
  ];
  // Resolve @fontsource/inter from any node_modules ancestor.
  let pkgRoot;
  try {
    const pkgJsonPath = require.resolve('@fontsource/inter/package.json');
    pkgRoot = path.dirname(pkgJsonPath);
  } catch (_e) {
    throw new Error(
      '@fontsource/inter not installed. Run from main repo (worktrees have no node_modules), or `npm install --no-save @fontsource/inter` first.'
    );
  }
  for (const s of sources) {
    if (fs.existsSync(s.target) && fs.statSync(s.target).size > 10000) continue;
    const src = path.join(pkgRoot, 'files', s.from);
    if (!fs.existsSync(src)) throw new Error(`Source font not found: ${src}`);
    fs.copyFileSync(src, s.target);
    console.log(`  copied ${path.basename(s.target)} (${(fs.statSync(s.target).size / 1024).toFixed(0)}KB)`);
  }
}

// Card definitions. Each card is a 1200x630 brutalist composition.
const CARDS = [
  {
    slug: 'og-default',
    out: DEFAULT_OG_PATH,
    headline: 'THE DONOR MAP',
    deck: 'Political donor intelligence. Open-source. Primary-source verified.',
    accent: '#fbbf24',
    headlineSize: 96,
    headlineFont: 'Inter-Black',
  },
  {
    slug: 'three-becerras',
    out: path.join(SHARE_DIR, 'three-becerras.png'),
    headline: 'Three audiences. Three Becerras.',
    deck: 'Six weeks in 2026. The hardest answer was reserved for the doctors lobby.',
    accent: '#e63946',
    headlineSize: 76,
    headlineFont: 'Inter-Black',
  },
  {
    slug: 'class-traitor',
    out: path.join(SHARE_DIR, 'class-traitor.png'),
    headline: '$31 million to bury a class traitor.',
    deck: 'Utility. Realtors. Chamber. Developers. Prison guards. The donor class organized against him.',
    accent: '#fbbf24',
    headlineSize: 78,
    headlineFont: 'Inter-Black',
  },
  {
    slug: 'not-the-bad-guy',
    out: path.join(SHARE_DIR, 'not-the-bad-guy.png'),
    headline: 'He took the check. Then he defended it.',
    deck: '$39,200 from Chevron. Ten months later: "not the bad guy."',
    accent: '#e63946',
    headlineSize: 72,
    headlineFont: 'Inter-Black',
  },
  {
    slug: 'donors-becerra-2026',
    out: path.join(SHARE_DIR, 'donors-becerra-2026.png'),
    headline: 'Becerra for Governor 2026',
    deck: 'Top donors. Cal-Access primary-source verified.',
    accent: '#fbbf24',
    headlineSize: 84,
    headlineFont: 'Inter-Black',
  },
];

function buildCard(card, fonts) {
  const interBlack = fonts.find((f) => f.name === 'Inter-Black').data;
  const interRegular = fonts.find((f) => f.name === 'Inter-Regular').data;

  return {
    type: 'div',
    props: {
      style: {
        width: '1200px',
        height: '630px',
        background: '#f5f0eb',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        fontFamily: 'Inter',
      },
      children: [
        // Top yellow stripe
        {
          type: 'div',
          props: {
            style: {
              width: '100%',
              height: '14px',
              background: card.accent,
              display: 'flex',
            },
          },
        },
        // Header bar
        {
          type: 'div',
          props: {
            style: {
              padding: '40px 60px 0 60px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              fontSize: '18px',
              fontWeight: 700,
              letterSpacing: '3px',
              color: '#0a0a0a',
              textTransform: 'uppercase',
            },
            children: [
              { type: 'div', props: { children: 'THE DONOR MAP' } },
              {
                type: 'div',
                props: {
                  style: { color: '#666', fontSize: '14px', letterSpacing: '2px' },
                  children: 'thedonormap.org',
                },
              },
            ],
          },
        },
        // Spacer
        { type: 'div', props: { style: { flexGrow: 1 } } },
        // Headline + deck block
        {
          type: 'div',
          props: {
            style: {
              padding: '0 60px 60px 60px',
              display: 'flex',
              flexDirection: 'column',
            },
            children: [
              {
                type: 'div',
                props: {
                  style: {
                    fontSize: `${card.headlineSize}px`,
                    fontWeight: 900,
                    lineHeight: 1.05,
                    letterSpacing: '-2px',
                    color: '#0a0a0a',
                    marginBottom: '24px',
                  },
                  children: card.headline,
                },
              },
              {
                type: 'div',
                props: {
                  style: {
                    fontSize: '24px',
                    fontWeight: 400,
                    lineHeight: 1.35,
                    color: '#1a1a1a',
                    maxWidth: '1000px',
                  },
                  children: card.deck,
                },
              },
            ],
          },
        },
      ],
    },
  };
}

async function main() {
  console.log('[render-og-images] Ensuring fonts...');
  await ensureFonts();

  const satori = (await import('satori')).default;
  const sharp = require('sharp');

  const interBlack = fs.readFileSync(path.join(FONT_DIR, 'Inter-Black.woff'));
  const interRegular = fs.readFileSync(path.join(FONT_DIR, 'Inter-Regular.woff'));

  const fontConfig = [
    { name: 'Inter', data: interRegular, weight: 400, style: 'normal' },
    { name: 'Inter', data: interBlack, weight: 900, style: 'normal' },
  ];

  console.log(`[render-og-images] Rendering ${CARDS.length} cards...`);
  for (const card of CARDS) {
    const tree = buildCard(card, fontConfig.map((f) => ({ name: f.name + (f.weight === 900 ? '-Black' : '-Regular'), data: f.data })));
    const svg = await satori(tree, {
      width: 1200,
      height: 630,
      fonts: fontConfig,
    });
    const png = await sharp(Buffer.from(svg)).png().toBuffer();
    fs.writeFileSync(card.out, png);
    const kb = (png.length / 1024).toFixed(0);
    console.log(`  ${card.slug.padEnd(24)} -> ${path.relative(ROOT, card.out)}  (${kb}KB)`);
  }

  console.log('[render-og-images] DONE');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
