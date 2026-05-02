// Export Guerilla Prop Patreon assets to pixel-perfect PNGs.
// Usage: node prototype/export-patreon.cjs

const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const HTML = path.resolve(__dirname, 'patreon-guerilla-prop.html');
const OUT = path.resolve(__dirname, 'exports');

async function main() {
  if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });

  const browser = await chromium.launch();

  // Each render builds an isolated page sized to the asset, eliminating
  // any cropping or scrollbar weirdness from the master prototype layout.
  const renders = [
    {
      name: 'banner.png',
      width: 2500,
      height: 1000,
      bodyClass: 'banner-only',
      pickSelector: '.banner',
    },
    {
      name: 'avatar.png',
      width: 1024,
      height: 1024,
      bodyClass: 'avatar-only',
      pickSelector: '.avatar',
    },
  ];

  for (const r of renders) {
    const context = await browser.newContext({
      viewport: { width: r.width, height: r.height },
      deviceScaleFactor: 2, // retina-quality output
    });
    const page = await context.newPage();
    await page.goto('file:///' + HTML.replace(/\\/g, '/'));

    // Wait for fonts to load before screenshotting.
    await page.evaluate(() => document.fonts.ready);

    const el = await page.$(r.pickSelector);
    if (!el) throw new Error('selector not found: ' + r.pickSelector);

    const outPath = path.join(OUT, r.name);
    await el.screenshot({ path: outPath, omitBackground: false });
    console.log('wrote ' + outPath + '  (' + r.width + 'x' + r.height + ' @2x)');
    await context.close();
  }

  await browser.close();
}

main().catch(e => { console.error(e); process.exit(1); });
