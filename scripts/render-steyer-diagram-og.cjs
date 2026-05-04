#!/usr/bin/env node
/**
 * render-steyer-diagram-og.cjs — render the closed-loop diagram from
 * /steyer as a 1200x630 OG card. Mirrors render-hilton-diagram-og.cjs
 * pattern: sharp's SVG rasterizer with Inter embedded as base64
 * @font-face so output is rasterizer-agnostic.
 *
 *   node scripts/render-steyer-diagram-og.cjs
 *
 * Output: quartz/static/share/steyer.png (overwrites typography card).
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const FONT_DIR = path.join(__dirname, 'lib', '.fonts');
const OUT = path.join(ROOT, 'quartz', 'static', 'share', 'steyer.png');

const interBlackB64 = fs.readFileSync(path.join(FONT_DIR, 'Inter-Black.woff')).toString('base64');
const interRegularB64 = fs.readFileSync(path.join(FONT_DIR, 'Inter-Regular.woff')).toString('base64');

const W = 1200;
const H = 630;

// The /steyer closed-loop diagram, re-coordinated to fit a 1200x630 OG
// canvas with brand chrome. Vertical chain: Tom Steyer → $5M family
// donations → Common Sense Media → drafts → CA AI Bills → lands on →
// Governor's Desk. Red dashed loopback arrow on the right side returns
// to Tom Steyer with "SAME PERSON" badge in a clear paper-bordered box.
//
// Inter only · Space Mono and Instrument Serif fall back gracefully.
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
    <marker id="og-arr-bk" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
      <path d="M 0 0 L 10 5 L 0 10 z" fill="#0a0a0a"/>
    </marker>
    <marker id="og-arr-rd" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
      <path d="M 0 0 L 10 5 L 0 10 z" fill="#e63946"/>
    </marker>
  </defs>

  <!-- Cream background -->
  <rect width="${W}" height="${H}" fill="#f5f0eb"/>

  <!-- Top blue stripe (Democrat side) -->
  <rect x="0" y="0" width="${W}" height="14" fill="#1d4ed8"/>

  <!-- Header bar -->
  <text x="60" y="60" font-family="Inter, sans-serif" font-size="18" font-weight="900" letter-spacing="3" fill="#0a0a0a">THE DONOR MAP</text>
  <text x="${W - 60}" y="60" text-anchor="end" font-family="Inter, sans-serif" font-size="18" font-weight="900" letter-spacing="3" fill="#666">THEDONORMAP.ORG/STEYER</text>

  <!-- Section label -->
  <text x="${W / 2}" y="100" text-anchor="middle" font-family="Inter, sans-serif" font-size="14" font-weight="900" letter-spacing="6" fill="#666">THE CLOSED LOOP</text>

  <!-- ─── Vertical chain · centered horizontally ─── -->

  <!-- TOP: Tom Steyer -->
  <rect x="440" y="118" width="320" height="58" fill="#0a0a0a"/>
  <text x="600" y="146" text-anchor="middle" font-family="Inter, sans-serif" font-size="22" font-weight="900" letter-spacing="-0.5" fill="#fff">TOM STEYER</text>
  <text x="600" y="166" text-anchor="middle" font-family="Inter, sans-serif" font-size="11" font-weight="900" letter-spacing="2" fill="#3b82f6">DEMOCRAT FOR GOVERNOR &#183; 2026</text>

  <!-- Arrow + label -->
  <line x1="600" y1="176" x2="600" y2="208" stroke="#0a0a0a" stroke-width="3" marker-end="url(#og-arr-bk)"/>
  <text x="616" y="198" font-family="Inter, sans-serif" font-size="13" font-weight="900" letter-spacing="1.5" fill="#0a0a0a">$5M+ FAMILY DONATIONS</text>

  <!-- MIDDLE: Common Sense Media -->
  <rect x="380" y="216" width="440" height="68" fill="#fff" stroke="#0a0a0a" stroke-width="3"/>
  <text x="600" y="244" text-anchor="middle" font-family="Inter, sans-serif" font-size="22" font-weight="900" letter-spacing="-0.5" fill="#0a0a0a">COMMON SENSE MEDIA</text>
  <text x="600" y="266" text-anchor="middle" font-family="Inter, sans-serif" font-size="13" font-weight="900" letter-spacing="2" fill="#0a0a0a">RUN BY JIM STEYER &#183; 23 YEARS</text>
  <text x="600" y="280" text-anchor="middle" font-family="Inter, sans-serif" font-size="11" font-weight="400" font-style="italic" fill="#666">Tom's brother</text>

  <!-- Arrow + label -->
  <line x1="600" y1="284" x2="600" y2="316" stroke="#0a0a0a" stroke-width="3" marker-end="url(#og-arr-bk)"/>
  <text x="616" y="306" font-family="Inter, sans-serif" font-size="13" font-weight="900" letter-spacing="1.5" fill="#0a0a0a">DRAFTS &amp; ADVOCATES FOR</text>

  <!-- THIRD: AI Bills (yellow band) -->
  <rect x="380" y="324" width="440" height="76" fill="#fbbf24" stroke="#0a0a0a" stroke-width="3"/>
  <text x="600" y="352" text-anchor="middle" font-family="Inter, sans-serif" font-size="20" font-weight="900" letter-spacing="-0.3" fill="#0a0a0a">CALIFORNIA AI BILLS &#183; 2025-26</text>
  <text x="450" y="378" text-anchor="middle" font-family="Inter, sans-serif" font-size="14" font-weight="900" fill="#e63946">AB-1064</text>
  <text x="450" y="392" text-anchor="middle" font-family="Inter, sans-serif" font-size="9" font-weight="900" letter-spacing="1" fill="#0a0a0a">VETOED</text>
  <text x="600" y="378" text-anchor="middle" font-family="Inter, sans-serif" font-size="14" font-weight="900" fill="#1d4ed8">AB-1709</text>
  <text x="600" y="392" text-anchor="middle" font-family="Inter, sans-serif" font-size="9" font-weight="900" letter-spacing="1" fill="#0a0a0a">PENDING</text>
  <text x="750" y="378" text-anchor="middle" font-family="Inter, sans-serif" font-size="14" font-weight="900" fill="#1d4ed8">AB-2023</text>
  <text x="750" y="392" text-anchor="middle" font-family="Inter, sans-serif" font-size="9" font-weight="900" letter-spacing="1" fill="#0a0a0a">PENDING</text>

  <!-- Arrow + label -->
  <line x1="600" y1="400" x2="600" y2="432" stroke="#0a0a0a" stroke-width="3" marker-end="url(#og-arr-bk)"/>
  <text x="616" y="422" font-family="Inter, sans-serif" font-size="13" font-weight="900" letter-spacing="1.5" fill="#0a0a0a">LANDS ON</text>

  <!-- BOTTOM: Governor's Desk -->
  <rect x="440" y="440" width="320" height="60" fill="#0a0a0a"/>
  <text x="600" y="468" text-anchor="middle" font-family="Inter, sans-serif" font-size="22" font-weight="900" letter-spacing="-0.5" fill="#fff">GOVERNOR'S DESK</text>
  <text x="600" y="490" text-anchor="middle" font-family="Inter, sans-serif" font-size="12" font-weight="900" letter-spacing="2" fill="#fbbf24">= TOM STEYER, IF ELECTED</text>

  <!-- Loop-closing dashed arrow on the right side, bottom to top -->
  <path d="M 760 470 C 940 470, 980 290, 980 220 C 980 150, 880 130, 760 147" fill="none" stroke="#e63946" stroke-width="3" stroke-dasharray="6,4" marker-end="url(#og-arr-rd)"/>

  <!-- SAME PERSON badge in a clear cream-bordered box -->
  <rect x="900" y="240" width="160" height="40" fill="#f5f0eb" stroke="#e63946" stroke-width="2.5"/>
  <text x="980" y="266" text-anchor="middle" font-family="Inter, sans-serif" font-size="14" font-weight="900" letter-spacing="2.5" fill="#e63946">SAME PERSON</text>

  <!-- Bottom annotation · italic gloss -->
  <text x="${W / 2}" y="540" text-anchor="middle" font-family="Inter, sans-serif" font-size="14" font-weight="400" font-style="italic" fill="#0a0a0a">The candidate is also the family that funds the bills he would sign.</text>

  <!-- Bottom-left: red bottom stripe accent for visual closure -->
  <rect x="0" y="${H - 6}" width="${W}" height="6" fill="#e63946"/>
</svg>`;

(async () => {
  const sharp = require('sharp');
  const png = await sharp(Buffer.from(svg)).png().toBuffer();
  fs.writeFileSync(OUT, png);
  console.log(`steyer diagram OG -> ${path.relative(ROOT, OUT)}  (${(png.length / 1024).toFixed(0)}KB)`);
})();
