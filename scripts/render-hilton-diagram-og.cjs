#!/usr/bin/env node
/**
 * render-hilton-diagram-og.cjs — render the household → Sierra diagram
 * from /hilton as a 1200x630 OG card. Uses sharp's SVG rasterizer with
 * Inter embedded as a base64 @font-face so output matches the on-page
 * diagram regardless of what fonts the rasterizer can find on disk.
 *
 *   node scripts/render-hilton-diagram-og.cjs
 *
 * Output: quartz/static/share/hilton.png (overwrites typography card).
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const FONT_DIR = path.join(__dirname, 'lib', '.fonts');
const OUT = path.join(ROOT, 'quartz', 'static', 'share', 'hilton.png');

const interBlackB64 = fs.readFileSync(path.join(FONT_DIR, 'Inter-Black.woff')).toString('base64');
const interRegularB64 = fs.readFileSync(path.join(FONT_DIR, 'Inter-Regular.woff')).toString('base64');

const W = 1200;
const H = 630;

// The /hilton diagram, lifted from content/hilton/index.html (lines 351-400),
// re-coordinated to fit a 1200x630 OG canvas with brand chrome.
//
// Inter only — Space Mono and Instrument Serif fall back gracefully to the
// system serif/mono in the rasterizer; that's fine for monospace receipt
// chrome and italic captions and avoids embedding three font files.
const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <style type="text/css"><![CDATA[
      @font-face {
        font-family: 'Inter';
        font-weight: 900;
        font-style: normal;
        src: url(data:font/woff;base64,${interBlackB64}) format('woff');
      }
      @font-face {
        font-family: 'Inter';
        font-weight: 400;
        font-style: normal;
        src: url(data:font/woff;base64,${interRegularB64}) format('woff');
      }
    ]]></style>
    <marker id="h-arrow-rd" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
      <path d="M 0 0 L 10 5 L 0 10 z" fill="#e63946"/>
    </marker>
    <marker id="h-arrow-yl" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
      <path d="M 0 0 L 10 5 L 0 10 z" fill="#fbbf24"/>
    </marker>
  </defs>

  <!-- Cream background -->
  <rect width="${W}" height="${H}" fill="#f5f0eb"/>

  <!-- Top red stripe -->
  <rect x="0" y="0" width="${W}" height="14" fill="#e63946"/>

  <!-- Header bar -->
  <text x="60" y="60" font-family="Inter, sans-serif" font-size="18" font-weight="900" letter-spacing="3" fill="#0a0a0a">THE DONOR MAP</text>
  <text x="${W - 60}" y="60" text-anchor="end" font-family="Inter, sans-serif" font-size="18" font-weight="900" letter-spacing="3" fill="#666">THEDONORMAP.ORG/HILTON</text>

  <!-- Section label -->
  <text x="${W / 2}" y="115" text-anchor="middle" font-family="Inter, sans-serif" font-size="16" font-weight="900" letter-spacing="6" fill="#666">THE HILTON HOUSEHOLD &#183; SIERRA</text>

  <!-- ─── Diagram (scaled from 720x380 source, centered, anchored at y=150) ─── -->
  <g transform="translate(150, 155) scale(1.25)">
    <!-- Top-left: Hilton -->
    <rect x="40" y="30" width="220" height="68" fill="#0a0a0a"/>
    <text x="150" y="58" text-anchor="middle" font-family="Inter, sans-serif" font-size="18" font-weight="900" letter-spacing="-0.5" fill="#fff">STEVE HILTON</text>
    <text x="150" y="76" text-anchor="middle" font-family="Inter, sans-serif" font-size="9" font-weight="900" letter-spacing="1.5" fill="#fbbf24">CA GOV CANDIDATE (R)</text>
    <text x="150" y="90" text-anchor="middle" font-family="Inter, sans-serif" font-size="9" font-weight="900" letter-spacing="1.5" fill="#aaa">HOLDS SIERRA STOCK</text>

    <!-- Top-right: Whetstone -->
    <rect x="460" y="30" width="220" height="68" fill="#0a0a0a"/>
    <text x="570" y="58" text-anchor="middle" font-family="Inter, sans-serif" font-size="18" font-weight="900" letter-spacing="-0.5" fill="#fff">RACHEL WHETSTONE</text>
    <text x="570" y="76" text-anchor="middle" font-family="Inter, sans-serif" font-size="9" font-weight="900" letter-spacing="1.5" fill="#fbbf24">SPOUSE &#183; COMMS HEAD</text>
    <text x="570" y="90" text-anchor="middle" font-family="Inter, sans-serif" font-size="9" font-weight="900" letter-spacing="1.5" fill="#aaa">$100,000+ FROM SIERRA</text>

    <!-- Marriage line connector -->
    <line x1="260" y1="64" x2="460" y2="64" stroke="#666" stroke-width="1.5" stroke-dasharray="4,3"/>
    <text x="360" y="58" text-anchor="middle" font-family="Inter, sans-serif" font-size="13" font-weight="400" font-style="italic" fill="#666">married &#183; the household</text>

    <!-- Hilton arrow down to Sierra -->
    <line x1="150" y1="98" x2="280" y2="180" stroke="#e63946" stroke-width="3" marker-end="url(#h-arrow-rd)"/>
    <text x="80" y="143" font-family="Inter, sans-serif" font-size="11" font-weight="900" fill="#e63946">OWNS STOCK</text>
    <text x="80" y="159" font-family="Inter, sans-serif" font-size="9" font-weight="400" fill="#e63946">Form 700, Schedule A-1</text>

    <!-- Whetstone arrow down to Sierra -->
    <line x1="570" y1="98" x2="440" y2="180" stroke="#fbbf24" stroke-width="3" marker-end="url(#h-arrow-yl)"/>
    <text x="540" y="143" font-family="Inter, sans-serif" font-size="11" font-weight="900" fill="#0a0a0a">DRAWS INCOME</text>
    <text x="540" y="159" font-family="Inter, sans-serif" font-size="9" font-weight="400" fill="#666">Form 700, Schedule C</text>

    <!-- Sierra: center node -->
    <rect x="240" y="185" width="240" height="100" fill="#fff" stroke="#0a0a0a" stroke-width="3"/>
    <text x="360" y="218" text-anchor="middle" font-family="Inter, sans-serif" font-size="26" font-weight="900" letter-spacing="-0.5" fill="#0a0a0a">SIERRA</text>
    <text x="360" y="238" text-anchor="middle" font-family="Inter, sans-serif" font-size="10" font-weight="900" letter-spacing="1.5" fill="#666">PRIVATE AI &#183; SAN FRANCISCO</text>
    <text x="360" y="258" text-anchor="middle" font-family="Inter, sans-serif" font-size="16" font-weight="900" fill="#0a0a0a">$10 BILLION VALUATION</text>
    <text x="360" y="274" text-anchor="middle" font-family="Inter, sans-serif" font-size="9" font-weight="400" fill="#666">$635M raised across 3 rounds</text>

    <!-- Sierra to Bret Taylor: small footnote -->
    <text x="360" y="312" text-anchor="middle" font-family="Inter, sans-serif" font-size="10" font-weight="900" letter-spacing="1.5" fill="#666">CHAIRED BY BRET TAYLOR</text>
    <text x="360" y="328" text-anchor="middle" font-family="Inter, sans-serif" font-size="13" font-weight="400" font-style="italic" fill="#666">also chairs OpenAI's board</text>

    <!-- Bottom annotation -->
    <text x="360" y="362" text-anchor="middle" font-family="Inter, sans-serif" font-size="14" font-weight="400" font-style="italic" fill="#0a0a0a">Two arrows from one household into the same AI company.</text>
  </g>
</svg>`;

(async () => {
  const sharp = require('sharp');
  const png = await sharp(Buffer.from(svg)).png().toBuffer();
  fs.writeFileSync(OUT, png);
  console.log(`hilton diagram OG -> ${path.relative(ROOT, OUT)}  (${(png.length / 1024).toFixed(0)}KB)`);
})();
