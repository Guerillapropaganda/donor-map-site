import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"

const InteractiveGraphs: QuartzComponent = ({ fileData }: QuartzComponentProps) => {
  const slug = String(fileData.slug ?? "").toLowerCase()

  // Homepage — render tabbed container for all three tools
  if (slug === "index") {
    return null // Homepage tools render via the markdown div + afterDOMLoaded
  }

  // Standalone interactive pages
  if (slug.includes("interactive/money-flow")) {
    return <div id="dm-money-flow" class="dm-interactive-container" />
  }
  if (slug.includes("interactive/roi-calculator")) {
    return <div id="dm-roi-calc" class="dm-interactive-container" />
  }
  if (slug.includes("interactive/both-sides")) {
    return <div id="dm-both-sides" class="dm-interactive-container" />
  }
  if (slug.includes("interactive/donor-networks")) {
    return <div id="dm-donor-network" class="dm-interactive-container" />
  }
  if (slug.includes("interactive/contradictions")) {
    return <div id="dm-contradictions" class="dm-interactive-container" />
  }
  if (slug.includes("interactive/sector-spending")) {
    return <div id="dm-sector" class="dm-interactive-container" />
  }
  if (slug.includes("interactive/policy-costs")) {
    return <div id="dm-policy-costs" class="dm-interactive-container" />
  }

  return null
}

InteractiveGraphs.afterDOMLoaded = `
// ═══════════════════════════════════════════════
// THE DONOR MAP — Interactive Visualizations
// D3.js loaded from CDN, only on interactive pages
// ═══════════════════════════════════════════════

const DM_COLORS = {
  steel: '#5b8dce',
  steelLight: '#8bb5e8',
  steelDim: 'rgba(91, 141, 206, 0.15)',
  green: '#22c55e',
  greenDim: 'rgba(34, 197, 94, 0.08)',
  red: '#ef4444',
  redDim: 'rgba(239, 68, 68, 0.08)',
  amber: '#f59e0b',
  amberDim: 'rgba(245, 158, 11, 0.08)',
  blue: '#3b82f6',
  blueDim: 'rgba(59, 130, 246, 0.15)',
  bg: '#0c0c0f',
  surface: '#13131a',
  border: '#1e1e28',
  textPrimary: '#e4e4e7',
  textSecondary: '#b4b4bc',
  textMuted: '#63636e',
  dem: '#3b82f6',
  rep: '#ef4444',
};

// ─── DATA ────────────────────────────────────

const MONEY_FLOW_DATA = {
  donors: [
    { id: 'aipac', name: 'AIPAC', total: 21200000, sector: 'Israel Lobby' },
    { id: 'goldman', name: 'Goldman Sachs', total: 8700000, sector: 'Wall Street' },
    { id: 'lockheed', name: 'Lockheed Martin', total: 6400000, sector: 'Defense' },
    { id: 'koch', name: 'Koch Network', total: 12300000, sector: 'Energy/Dark Money' },
    { id: 'pharma', name: 'PhRMA', total: 9800000, sector: 'Pharma' },
    { id: 'fanjul', name: 'Fanjul Family', total: 2900000, sector: 'Agriculture' },
    { id: 'nra', name: 'NRA', total: 5200000, sector: 'Guns' },
    { id: 'realtors', name: 'Natl Assn of Realtors', total: 7100000, sector: 'Real Estate' },
  ],
  politicians: [
    { id: 'pelosi', name: 'Nancy Pelosi', party: 'D', total: 14200000 },
    { id: 'mcconnell', name: 'Mitch McConnell', party: 'R', total: 11800000 },
    { id: 'cruz', name: 'Ted Cruz', party: 'R', total: 9400000 },
    { id: 'schumer', name: 'Chuck Schumer', party: 'D', total: 8700000 },
    { id: 'rubio', name: 'Marco Rubio', party: 'R', total: 7600000 },
    { id: 'menendez', name: 'Bob Menendez', party: 'D', total: 6100000 },
    { id: 'graham', name: 'Lindsey Graham', party: 'R', total: 5900000 },
    { id: 'trump', name: 'Donald Trump', party: 'R', total: 7200000 },
  ],
  policies: [
    { id: 'israel_aid', name: 'Israel Aid Package', value: '$3.8B/yr' },
    { id: 'tax_cuts', name: '2017 Tax Cuts', value: '$1.9T' },
    { id: 'defense_budget', name: 'Defense Budget +7%', value: '$886B' },
    { id: 'drug_pricing', name: 'Drug Pricing Killed', value: '$450B saved for pharma' },
    { id: 'cuba_sanctions', name: 'Cuba Max Pressure', value: 'Market access' },
    { id: 'carried_interest', name: 'Carried Interest Kept', value: '$18B/yr' },
    { id: 'gun_reform_blocked', name: 'Gun Reform Blocked', value: 'Status quo' },
    { id: 'housing_deregulation', name: 'Housing Deregulation', value: '$12B/yr' },
  ],
  flows: [
    // AIPAC flows — donates to virtually everyone in Congress
    { from: 'aipac', to: 'schumer', amount: 4100000, toPol: true },
    { from: 'aipac', to: 'pelosi', amount: 3200000, toPol: true },
    { from: 'aipac', to: 'mcconnell', amount: 2800000, toPol: true },
    { from: 'aipac', to: 'rubio', amount: 2400000, toPol: true },
    { from: 'aipac', to: 'menendez', amount: 2100000, toPol: true },
    { from: 'aipac', to: 'cruz', amount: 1900000, toPol: true },
    { from: 'aipac', to: 'graham', amount: 1400000, toPol: true },
    { from: 'aipac', to: 'trump', amount: 800000, toPol: true },
    { from: 'pelosi', to: 'israel_aid', amount: 1, toPol: false },
    { from: 'schumer', to: 'israel_aid', amount: 1, toPol: false },
    { from: 'mcconnell', to: 'israel_aid', amount: 1, toPol: false },
    { from: 'rubio', to: 'israel_aid', amount: 1, toPol: false },
    { from: 'menendez', to: 'israel_aid', amount: 1, toPol: false },
    { from: 'graham', to: 'israel_aid', amount: 1, toPol: false },
    // Goldman Sachs — Wall Street hedges all bets
    { from: 'goldman', to: 'pelosi', amount: 2100000, toPol: true },
    { from: 'goldman', to: 'schumer', amount: 1800000, toPol: true },
    { from: 'goldman', to: 'mcconnell', amount: 1500000, toPol: true },
    { from: 'goldman', to: 'cruz', amount: 1200000, toPol: true },
    { from: 'goldman', to: 'rubio', amount: 800000, toPol: true },
    { from: 'goldman', to: 'graham', amount: 600000, toPol: true },
    { from: 'goldman', to: 'menendez', amount: 500000, toPol: true },
    { from: 'goldman', to: 'trump', amount: 400000, toPol: true },
    { from: 'pelosi', to: 'carried_interest', amount: 1, toPol: false },
    { from: 'schumer', to: 'carried_interest', amount: 1, toPol: false },
    { from: 'cruz', to: 'tax_cuts', amount: 1, toPol: false },
    { from: 'mcconnell', to: 'tax_cuts', amount: 1, toPol: false },
    // Lockheed Martin — defense contractors fund both parties
    { from: 'lockheed', to: 'graham', amount: 1800000, toPol: true },
    { from: 'lockheed', to: 'cruz', amount: 1400000, toPol: true },
    { from: 'lockheed', to: 'mcconnell', amount: 1100000, toPol: true },
    { from: 'lockheed', to: 'pelosi', amount: 900000, toPol: true },
    { from: 'lockheed', to: 'rubio', amount: 700000, toPol: true },
    { from: 'lockheed', to: 'schumer', amount: 600000, toPol: true },
    { from: 'lockheed', to: 'menendez', amount: 400000, toPol: true },
    { from: 'lockheed', to: 'trump', amount: 350000, toPol: true },
    { from: 'graham', to: 'defense_budget', amount: 1, toPol: false },
    { from: 'cruz', to: 'defense_budget', amount: 1, toPol: false },
    { from: 'mcconnell', to: 'defense_budget', amount: 1, toPol: false },
    { from: 'rubio', to: 'defense_budget', amount: 1, toPol: false },
    // Koch Network — primarily Republican but hedges
    { from: 'koch', to: 'cruz', amount: 3800000, toPol: true },
    { from: 'koch', to: 'mcconnell', amount: 2900000, toPol: true },
    { from: 'koch', to: 'trump', amount: 2100000, toPol: true },
    { from: 'koch', to: 'graham', amount: 1800000, toPol: true },
    { from: 'koch', to: 'rubio', amount: 1200000, toPol: true },
    { from: 'koch', to: 'pelosi', amount: 200000, toPol: true },
    { from: 'koch', to: 'schumer', amount: 150000, toPol: true },
    { from: 'koch', to: 'menendez', amount: 100000, toPol: true },
    { from: 'cruz', to: 'tax_cuts', amount: 1, toPol: false },
    { from: 'trump', to: 'tax_cuts', amount: 1, toPol: false },
    { from: 'mcconnell', to: 'tax_cuts', amount: 1, toPol: false },
    // PhRMA — buys protection from both parties
    { from: 'pharma', to: 'mcconnell', amount: 2100000, toPol: true },
    { from: 'pharma', to: 'pelosi', amount: 1900000, toPol: true },
    { from: 'pharma', to: 'menendez', amount: 1600000, toPol: true },
    { from: 'pharma', to: 'cruz', amount: 1300000, toPol: true },
    { from: 'pharma', to: 'schumer', amount: 1100000, toPol: true },
    { from: 'pharma', to: 'graham', amount: 800000, toPol: true },
    { from: 'pharma', to: 'rubio', amount: 600000, toPol: true },
    { from: 'pharma', to: 'trump', amount: 400000, toPol: true },
    { from: 'menendez', to: 'drug_pricing', amount: 1, toPol: false },
    { from: 'mcconnell', to: 'drug_pricing', amount: 1, toPol: false },
    { from: 'pelosi', to: 'drug_pricing', amount: 1, toPol: false },
    // Fanjul Family — sugar dynasty, both parties
    { from: 'fanjul', to: 'rubio', amount: 1200000, toPol: true },
    { from: 'fanjul', to: 'trump', amount: 950000, toPol: true },
    { from: 'fanjul', to: 'menendez', amount: 400000, toPol: true },
    { from: 'fanjul', to: 'pelosi', amount: 200000, toPol: true },
    { from: 'fanjul', to: 'schumer', amount: 150000, toPol: true },
    { from: 'rubio', to: 'cuba_sanctions', amount: 1, toPol: false },
    { from: 'trump', to: 'cuba_sanctions', amount: 1, toPol: false },
    { from: 'menendez', to: 'cuba_sanctions', amount: 1, toPol: false },
    // NRA — primarily Republican but some Dems
    { from: 'nra', to: 'cruz', amount: 1800000, toPol: true },
    { from: 'nra', to: 'trump', amount: 1500000, toPol: true },
    { from: 'nra', to: 'graham', amount: 1200000, toPol: true },
    { from: 'nra', to: 'mcconnell', amount: 1100000, toPol: true },
    { from: 'nra', to: 'rubio', amount: 800000, toPol: true },
    { from: 'nra', to: 'menendez', amount: 200000, toPol: true },
    { from: 'cruz', to: 'gun_reform_blocked', amount: 1, toPol: false },
    { from: 'graham', to: 'gun_reform_blocked', amount: 1, toPol: false },
    { from: 'trump', to: 'gun_reform_blocked', amount: 1, toPol: false },
    { from: 'mcconnell', to: 'gun_reform_blocked', amount: 1, toPol: false },
    // Realtors — biggest PAC in America, funds everyone
    { from: 'realtors', to: 'pelosi', amount: 1800000, toPol: true },
    { from: 'realtors', to: 'schumer', amount: 1600000, toPol: true },
    { from: 'realtors', to: 'mcconnell', amount: 1400000, toPol: true },
    { from: 'realtors', to: 'trump', amount: 1200000, toPol: true },
    { from: 'realtors', to: 'cruz', amount: 900000, toPol: true },
    { from: 'realtors', to: 'rubio', amount: 700000, toPol: true },
    { from: 'realtors', to: 'graham', amount: 500000, toPol: true },
    { from: 'realtors', to: 'menendez', amount: 400000, toPol: true },
    { from: 'pelosi', to: 'housing_deregulation', amount: 1, toPol: false },
    { from: 'schumer', to: 'housing_deregulation', amount: 1, toPol: false },
    { from: 'trump', to: 'housing_deregulation', amount: 1, toPol: false },
  ],
};

const ROI_DATA = [
  { donor: 'AIPAC', politician: 'Chuck Schumer', party: 'D', donated: 4100000, policyValue: 3800000000, policy: 'Israel Aid Package ($3.8B/yr)', roi: 927 },
  { donor: 'Koch Network', politician: 'Ted Cruz', party: 'R', donated: 3800000, policyValue: 1900000000000, policy: '2017 Tax Cuts ($1.9T over 10yr)', roi: 50000 },
  { donor: 'PhRMA', politician: 'Mitch McConnell', party: 'R', donated: 2100000, policyValue: 450000000000, policy: 'Drug Pricing Negotiation Killed', roi: 214286 },
  { donor: 'Lockheed Martin', politician: 'Lindsey Graham', party: 'R', donated: 1800000, policyValue: 886000000000, policy: 'Defense Budget Increase to $886B', roi: 492222 },
  { donor: 'Goldman Sachs', politician: 'Nancy Pelosi', party: 'D', donated: 2100000, policyValue: 18000000000, policy: 'Carried Interest Loophole Preserved', roi: 8571 },
  { donor: 'Fanjul Family', politician: 'Marco Rubio', party: 'R', donated: 1200000, policyValue: 1500000000, policy: 'Cuba Sanctions / Sugar Tariff Protection', roi: 1250 },
  { donor: 'NRA', politician: 'Ted Cruz', party: 'R', donated: 1800000, policyValue: 0, policy: 'Gun Reform Legislation Blocked', roi: null },
  { donor: 'Natl Assn of Realtors', politician: 'Nancy Pelosi', party: 'D', donated: 1800000, policyValue: 12000000000, policy: 'Housing Deregulation', roi: 6667 },
];

const BOTH_SIDES_DATA = [
  {
    donor: 'AIPAC',
    sector: 'Israel Lobby',
    total: 21200000,
    dems: [
      { name: 'Chuck Schumer', amount: 4100000 },
      { name: 'Nancy Pelosi', amount: 3200000 },
      { name: 'Bob Menendez', amount: 2100000 },
    ],
    reps: [
      { name: 'Mitch McConnell', amount: 2800000 },
      { name: 'Marco Rubio', amount: 2400000 },
      { name: 'Ted Cruz', amount: 1900000 },
    ],
    demTotal: 9400000,
    repTotal: 7100000,
    policy: 'Israel Aid Package — bipartisan 97-3 vote',
  },
  {
    donor: 'Goldman Sachs',
    sector: 'Wall Street',
    total: 8700000,
    dems: [
      { name: 'Nancy Pelosi', amount: 2100000 },
      { name: 'Chuck Schumer', amount: 1800000 },
    ],
    reps: [
      { name: 'Mitch McConnell', amount: 1500000 },
      { name: 'Ted Cruz', amount: 1200000 },
    ],
    demTotal: 3900000,
    repTotal: 2700000,
    policy: 'Carried Interest loophole survived 30+ years of "reform"',
  },
  {
    donor: 'PhRMA',
    sector: 'Pharma & Healthcare',
    total: 9800000,
    dems: [
      { name: 'Nancy Pelosi', amount: 1900000 },
      { name: 'Bob Menendez', amount: 1600000 },
    ],
    reps: [
      { name: 'Mitch McConnell', amount: 2100000 },
      { name: 'Ted Cruz', amount: 1300000 },
    ],
    demTotal: 3500000,
    repTotal: 3400000,
    policy: 'Drug pricing negotiation killed — both sides took the money',
  },
  {
    donor: 'Lockheed Martin',
    sector: 'Defense & Intelligence',
    total: 6400000,
    dems: [
      { name: 'Nancy Pelosi', amount: 900000 },
    ],
    reps: [
      { name: 'Lindsey Graham', amount: 1800000 },
      { name: 'Ted Cruz', amount: 1400000 },
      { name: 'Mitch McConnell', amount: 1100000 },
    ],
    demTotal: 900000,
    repTotal: 4300000,
    policy: 'Defense budget approved at $886B — bipartisan support',
  },
  {
    donor: 'Natl Assn of Realtors',
    sector: 'Real Estate',
    total: 7100000,
    dems: [
      { name: 'Nancy Pelosi', amount: 1800000 },
      { name: 'Chuck Schumer', amount: 1600000 },
    ],
    reps: [
      { name: 'Mitch McConnell', amount: 1400000 },
      { name: 'Donald Trump', amount: 1200000 },
    ],
    demTotal: 3400000,
    repTotal: 2600000,
    policy: 'Housing deregulation benefits passed with bipartisan support',
  },
  {
    donor: 'Fanjul Family',
    sector: 'Agriculture / Sugar',
    total: 2900000,
    dems: [
      { name: 'Bob Menendez', amount: 400000 },
    ],
    reps: [
      { name: 'Marco Rubio', amount: 1200000 },
      { name: 'Donald Trump', amount: 950000 },
    ],
    demTotal: 400000,
    repTotal: 2150000,
    policy: 'Cuba sanctions + sugar tariff protections',
  },
];

// ─── HELPERS ─────────────────────────────────

function fmt(n) {
  if (n >= 1e12) return '$' + (n / 1e12).toFixed(1) + 'T';
  if (n >= 1e9) return '$' + (n / 1e9).toFixed(1) + 'B';
  if (n >= 1e6) return '$' + (n / 1e6).toFixed(1) + 'M';
  if (n >= 1e3) return '$' + (n / 1e3).toFixed(0) + 'K';
  return '$' + n;
}

function partyColor(party) {
  return party === 'D' ? DM_COLORS.dem : DM_COLORS.rep;
}

// ─── MONEY FLOW (Sankey-style) ───────────────

function renderMoneyFlow(container) {
  container.innerHTML = '';

  const width = container.clientWidth || 800;
  const height = 600;
  const pad = { top: 40, right: 20, bottom: 20, left: 20 };
  const colW = 160;
  const cols = [pad.left, (width - colW) / 2, width - colW - pad.right];

  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 ' + width + ' ' + height);
  svg.setAttribute('width', '100%');
  svg.style.maxWidth = width + 'px';

  // Column headers
  const headers = ['DONORS', 'POLITICIANS', 'POLICY OUTCOMES'];
  headers.forEach(function(h, i) {
    const t = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    t.setAttribute('x', cols[i] + colW / 2);
    t.setAttribute('y', 20);
    t.setAttribute('text-anchor', 'middle');
    t.setAttribute('fill', DM_COLORS.textMuted);
    t.setAttribute('font-family', "'Space Mono', monospace");
    t.setAttribute('font-size', '10');
    t.setAttribute('letter-spacing', '2');
    t.textContent = h;
    svg.appendChild(t);
  });

  // Compute node positions
  var data = MONEY_FLOW_DATA;
  var nodeH = 50;
  var gap = 8;

  var donorNodes = data.donors.map(function(d, i) {
    return { ...d, x: cols[0], y: pad.top + 20 + i * (nodeH + gap), w: colW, h: nodeH, col: 0 };
  });
  var polNodes = data.politicians.map(function(p, i) {
    return { ...p, x: cols[1], y: pad.top + 10 + i * (nodeH + gap), w: colW, h: nodeH, col: 1 };
  });
  var policyNodes = data.policies.map(function(p, i) {
    return { ...p, x: cols[2], y: pad.top + 20 + i * (nodeH + gap), w: colW, h: nodeH, col: 2 };
  });

  var allNodes = {};
  donorNodes.forEach(function(n) { allNodes[n.id] = n; });
  polNodes.forEach(function(n) { allNodes[n.id] = n; });
  policyNodes.forEach(function(n) { allNodes[n.id] = n; });

  // State
  var highlighted = null;

  function draw() {
    // Clear old
    while (svg.childNodes.length > 3) svg.removeChild(svg.lastChild);

    // Draw flows (curves)
    data.flows.forEach(function(f) {
      var src = allNodes[f.from];
      var dst = allNodes[f.to];
      if (!src || !dst) return;

      var isHighlighted = !highlighted ||
        highlighted === f.from || highlighted === f.to ||
        (highlighted === src.id) || (highlighted === dst.id);

      // Primary flows (>$1M) are bright, secondary flows are dim
      var isPrimary = !f.toPol || f.amount >= 1000000;
      var baseOpacity = isPrimary ? 0.25 : 0.08;
      var opacity = highlighted ? (isHighlighted ? 0.7 : 0.03) : baseOpacity;
      var strokeW = f.toPol ? Math.max(0.8, Math.min(6, f.amount / 1000000)) : 1.5;

      var x1 = src.x + src.w;
      var y1 = src.y + src.h / 2;
      var x2 = dst.x;
      var y2 = dst.y + dst.h / 2;
      var mx = (x1 + x2) / 2;

      var path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('d', 'M ' + x1 + ' ' + y1 + ' C ' + mx + ' ' + y1 + ' ' + mx + ' ' + y2 + ' ' + x2 + ' ' + y2);
      path.setAttribute('fill', 'none');
      path.setAttribute('stroke', f.toPol ? DM_COLORS.green : DM_COLORS.amber);
      path.setAttribute('stroke-width', strokeW);
      path.setAttribute('opacity', opacity);
      svg.appendChild(path);
    });

    // Draw nodes
    function drawNode(n, fillColor, label, sublabel) {
      var isHl = !highlighted || highlighted === n.id;
      var op = highlighted ? (isHl ? 1 : 0.2) : 1;

      var g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      g.style.cursor = 'pointer';
      g.style.opacity = op;

      var rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      rect.setAttribute('x', n.x);
      rect.setAttribute('y', n.y);
      rect.setAttribute('width', n.w);
      rect.setAttribute('height', n.h);
      rect.setAttribute('rx', 6);
      rect.setAttribute('fill', DM_COLORS.surface);
      rect.setAttribute('stroke', isHl && highlighted ? fillColor : DM_COLORS.border);
      rect.setAttribute('stroke-width', isHl && highlighted ? 2 : 1);
      g.appendChild(rect);

      var t = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      t.setAttribute('x', n.x + 12);
      t.setAttribute('y', n.y + 22);
      t.setAttribute('fill', DM_COLORS.textPrimary);
      t.setAttribute('font-size', '12');
      t.setAttribute('font-weight', '600');
      t.setAttribute('font-family', "'Space Grotesk', sans-serif");
      t.textContent = label.length > 18 ? label.substring(0, 16) + '...' : label;
      g.appendChild(t);

      if (sublabel) {
        var s = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        s.setAttribute('x', n.x + 12);
        s.setAttribute('y', n.y + 38);
        s.setAttribute('fill', fillColor);
        s.setAttribute('font-size', '11');
        s.setAttribute('font-weight', '700');
        s.setAttribute('font-family', "'Space Mono', monospace");
        s.textContent = sublabel;
        g.appendChild(s);
      }

      g.addEventListener('click', function() {
        highlighted = highlighted === n.id ? null : n.id;
        draw();
      });
      svg.appendChild(g);
    }

    donorNodes.forEach(function(n) {
      drawNode(n, DM_COLORS.steel, n.name, fmt(n.total));
    });
    polNodes.forEach(function(n) {
      drawNode(n, partyColor(n.party), n.name, n.party + ' — ' + fmt(n.total));
    });
    policyNodes.forEach(function(n) {
      drawNode(n, DM_COLORS.amber, n.name, n.value);
    });
  }

  draw();

  // Instructions
  var hint = document.createElement('div');
  hint.className = 'dm-graph-hint';
  hint.textContent = 'Click any node to trace its connections. Click again to reset.';

  container.appendChild(svg);
  container.appendChild(hint);
}

// ─── ROI CALCULATOR ──────────────────────────

function renderROICalc(container) {
  container.innerHTML = '';

  // Sort by ROI descending, nulls last
  var sorted = ROI_DATA.slice().sort(function(a, b) {
    if (a.roi === null) return 1;
    if (b.roi === null) return -1;
    return b.roi - a.roi;
  });

  // Header
  var header = document.createElement('div');
  header.className = 'dm-roi-header';
  header.innerHTML = '<span class="dm-roi-header-label">RETURN ON POLITICAL INVESTMENT</span>' +
    '<span class="dm-roi-header-sub">Donation vs. estimated policy value — sorted by ROI</span>';
  container.appendChild(header);

  sorted.forEach(function(row) {
    var card = document.createElement('div');
    card.className = 'dm-roi-card';

    // Top row: donor → politician
    var top = document.createElement('div');
    top.className = 'dm-roi-top';
    top.innerHTML =
      '<span class="dm-roi-donor">' + row.donor + '</span>' +
      '<span class="dm-roi-arrow">&#8594;</span>' +
      '<span class="dm-roi-politician" style="color:' + partyColor(row.party) + '">' +
        row.politician + ' (' + row.party + ')' +
      '</span>';
    card.appendChild(top);

    // Policy
    var policy = document.createElement('div');
    policy.className = 'dm-roi-policy';
    policy.textContent = row.policy;
    card.appendChild(policy);

    // Bar comparison
    var bars = document.createElement('div');
    bars.className = 'dm-roi-bars';

    var maxVal = Math.max(row.donated, row.policyValue || row.donated);
    var donatedPct = (row.donated / maxVal) * 100;
    var valuePct = row.policyValue ? (row.policyValue / maxVal) * 100 : 0;

    bars.innerHTML =
      '<div class="dm-roi-bar-row">' +
        '<span class="dm-roi-bar-label">DONATED</span>' +
        '<div class="dm-roi-bar-track">' +
          '<div class="dm-roi-bar-fill dm-roi-bar-donated" style="width:' + Math.max(donatedPct, 0.5) + '%"></div>' +
        '</div>' +
        '<span class="dm-roi-bar-value">' + fmt(row.donated) + '</span>' +
      '</div>' +
      '<div class="dm-roi-bar-row">' +
        '<span class="dm-roi-bar-label">POLICY VALUE</span>' +
        '<div class="dm-roi-bar-track">' +
          '<div class="dm-roi-bar-fill dm-roi-bar-value-fill" style="width:' + Math.max(valuePct, 0.5) + '%"></div>' +
        '</div>' +
        '<span class="dm-roi-bar-value" style="color:' + DM_COLORS.green + '">' +
          (row.policyValue ? fmt(row.policyValue) : 'N/A') +
        '</span>' +
      '</div>';
    card.appendChild(bars);

    // ROI badge
    if (row.roi !== null) {
      var badge = document.createElement('div');
      badge.className = 'dm-roi-badge';
      badge.innerHTML = '<span class="dm-roi-badge-label">ROI</span>' +
        '<span class="dm-roi-badge-value">' + row.roi.toLocaleString() + 'x</span>';
      card.appendChild(badge);
    } else {
      var badge = document.createElement('div');
      badge.className = 'dm-roi-badge dm-roi-badge-na';
      badge.innerHTML = '<span class="dm-roi-badge-label">ROI</span>' +
        '<span class="dm-roi-badge-value">Priceless</span>';
      card.appendChild(badge);
    }

    container.appendChild(card);
  });
}

// ─── BOTH SIDES ──────────────────────────────

function renderBothSides(container) {
  container.innerHTML = '';

  var header = document.createElement('div');
  header.className = 'dm-bs-header';
  header.innerHTML = '<span class="dm-bs-header-label">DONORS WHO FUND BOTH PARTIES</span>' +
    '<span class="dm-bs-header-sub">Same money, both sides of the aisle</span>';
  container.appendChild(header);

  BOTH_SIDES_DATA.forEach(function(row) {
    var card = document.createElement('div');
    card.className = 'dm-bs-card';

    // Donor header
    var dh = document.createElement('div');
    dh.className = 'dm-bs-donor-header';
    dh.innerHTML =
      '<div class="dm-bs-donor-name">' + row.donor + '</div>' +
      '<div class="dm-bs-donor-meta">' +
        '<span class="dm-bs-sector">' + row.sector + '</span>' +
        '<span class="dm-bs-total">' + fmt(row.total) + ' total</span>' +
      '</div>';
    card.appendChild(dh);

    // Split visualization
    var split = document.createElement('div');
    split.className = 'dm-bs-split';

    var totalSides = row.demTotal + row.repTotal;
    var demPct = (row.demTotal / totalSides) * 100;
    var repPct = (row.repTotal / totalSides) * 100;

    // Dem side
    var demSide = document.createElement('div');
    demSide.className = 'dm-bs-side dm-bs-dem';
    var demLabel = '<div class="dm-bs-side-header" style="color:' + DM_COLORS.dem + '">DEMOCRATS — ' + fmt(row.demTotal) + '</div>';
    var demList = row.dems.map(function(d) {
      return '<div class="dm-bs-recipient"><span class="dm-bs-recip-name">' + d.name + '</span><span class="dm-bs-recip-amount">' + fmt(d.amount) + '</span></div>';
    }).join('');
    demSide.innerHTML = demLabel + demList;

    // Rep side
    var repSide = document.createElement('div');
    repSide.className = 'dm-bs-side dm-bs-rep';
    var repLabel = '<div class="dm-bs-side-header" style="color:' + DM_COLORS.rep + '">REPUBLICANS — ' + fmt(row.repTotal) + '</div>';
    var repList = row.reps.map(function(r) {
      return '<div class="dm-bs-recipient"><span class="dm-bs-recip-name">' + r.name + '</span><span class="dm-bs-recip-amount">' + fmt(r.amount) + '</span></div>';
    }).join('');
    repSide.innerHTML = repLabel + repList;

    split.appendChild(demSide);

    // Center bar
    var center = document.createElement('div');
    center.className = 'dm-bs-center';
    center.innerHTML =
      '<div class="dm-bs-bar">' +
        '<div class="dm-bs-bar-dem" style="width:' + demPct + '%"></div>' +
        '<div class="dm-bs-bar-rep" style="width:' + repPct + '%"></div>' +
      '</div>' +
      '<div class="dm-bs-pct">' +
        '<span style="color:' + DM_COLORS.dem + '">' + Math.round(demPct) + '%</span>' +
        '<span style="color:' + DM_COLORS.rep + '">' + Math.round(repPct) + '%</span>' +
      '</div>';
    split.appendChild(center);
    split.appendChild(repSide);

    card.appendChild(split);

    // Policy outcome
    var policy = document.createElement('div');
    policy.className = 'dm-bs-policy';
    policy.innerHTML = '<span class="dm-bs-policy-label">RESULT:</span> ' + row.policy;
    card.appendChild(policy);

    container.appendChild(card);
  });
}

// ─── HOMEPAGE TABBED CONTAINER ───────────────

function renderHomepageTools(container) {
  container.innerHTML = '';

  // Build tabbed interface
  var wrapper = document.createElement('div');
  wrapper.className = 'dm-hp-tools';

  // Tabs
  var tabs = document.createElement('div');
  tabs.className = 'dm-hp-tabs';
  var tabData = [
    { id: 'flow', label: 'Money Flow', icon: '\u{1F4CA}' },
    { id: 'roi', label: 'ROI Calculator', icon: '\u{1F4B0}' },
    { id: 'both', label: 'Both Sides', icon: '\u{1F504}' },
  ];
  tabData.forEach(function(t, i) {
    var btn = document.createElement('button');
    btn.className = 'dm-hp-tab' + (i === 0 ? ' dm-hp-tab-active' : '');
    btn.setAttribute('data-tab', t.id);
    btn.innerHTML = '<span class="dm-hp-tab-icon">' + t.icon + '</span> ' + t.label;
    btn.addEventListener('click', function() {
      tabs.querySelectorAll('.dm-hp-tab').forEach(function(b) { b.classList.remove('dm-hp-tab-active'); });
      btn.classList.add('dm-hp-tab-active');
      wrapper.querySelectorAll('.dm-hp-panel').forEach(function(p) { p.classList.remove('dm-hp-panel-active'); });
      var panel = wrapper.querySelector('[data-panel="' + t.id + '"]');
      if (panel) panel.classList.add('dm-hp-panel-active');
    });
    tabs.appendChild(btn);
  });
  wrapper.appendChild(tabs);

  // Panels
  tabData.forEach(function(t, i) {
    var panel = document.createElement('div');
    panel.className = 'dm-hp-panel' + (i === 0 ? ' dm-hp-panel-active' : '');
    panel.setAttribute('data-panel', t.id);
    wrapper.appendChild(panel);
  });

  container.appendChild(wrapper);

  // Render into panels
  var flowPanel = wrapper.querySelector('[data-panel="flow"]');
  var roiPanel = wrapper.querySelector('[data-panel="roi"]');
  var bothPanel = wrapper.querySelector('[data-panel="both"]');

  if (flowPanel) renderMoneyFlow(flowPanel);
  if (roiPanel) renderROICalc(roiPanel);
  if (bothPanel) renderBothSides(bothPanel);
}

// ─── DONOR NETWORK EXPLORER ────────────────

var NETWORK_DATA = {
  koch: {
    name: 'Koch Network',
    sub: '$578M raised in 2024 cycle',
    color: '#ef4444',
    orgs: [
      { name: 'Americans for Prosperity', tag: 'PAC', amt: 72000000 },
      { name: 'DonorsTrust', tag: 'DARK MONEY', amt: 124000000 },
      { name: 'Heritage Foundation', tag: 'THINK TANK', amt: 45000000 },
      { name: 'Cato Institute', tag: 'THINK TANK', amt: 38000000 },
      { name: 'Federalist Society', tag: 'LEGAL', amt: 28000000 },
      { name: 'FreedomWorks', tag: 'PAC', amt: 31000000 },
    ],
    pols: [
      { name: 'Ted Cruz', p: 'R', amt: 3800000 },
      { name: 'Mitch McConnell', p: 'R', amt: 2900000 },
      { name: 'Ron Johnson', p: 'R', amt: 2100000 },
      { name: 'Marco Rubio', p: 'R', amt: 1800000 },
      { name: 'Lindsey Graham', p: 'R', amt: 1800000 },
    ],
    results: [
      { name: '2017 Tax Cuts', val: '$1.9T over 10yr' },
      { name: 'EPA Deregulation', val: '100+ rules rolled back' },
      { name: 'Janus v. AFSCME', val: 'Union dues collapse' },
      { name: 'Right-to-Work Laws', val: '27 states' },
    ]
  },
  musk: {
    name: 'Elon Musk',
    sub: '$292M spent in 2024 cycle',
    color: '#22c55e',
    orgs: [
      { name: 'America PAC', tag: 'SUPER PAC', amt: 118600000 },
      { name: 'SpaceX', tag: 'CONTRACTOR', amt: 15000000 },
      { name: 'Tesla', tag: 'LOBBYING', amt: 8000000 },
      { name: 'Boring Company', tag: 'CONTRACTOR', amt: 3000000 },
      { name: 'Starlink', tag: 'DEFENSE', amt: 5000000 },
    ],
    pols: [
      { name: 'Donald Trump', p: 'R', amt: 118600000 },
      { name: 'GOP House Fund', p: 'R', amt: 24000000 },
      { name: 'Various R Senate', p: 'R', amt: 18000000 },
    ],
    results: [
      { name: 'DOGE Appointment', val: 'Gov efficiency czar' },
      { name: 'Federal Contracts', val: '$38B+ cumulative' },
      { name: 'EV Credit Changes', val: 'Tesla advantage' },
      { name: 'Starshield DoD', val: 'Classified contracts' },
    ]
  },
  fairshake: {
    name: 'Fairshake PAC',
    sub: '$358M raised across 3 PACs',
    color: '#5b8dce',
    orgs: [
      { name: 'Coinbase', tag: 'CORPORATE', amt: 131500000 },
      { name: 'Ripple', tag: 'CORPORATE', amt: 48500000 },
      { name: 'Andreessen Horowitz', tag: 'VC', amt: 44000000 },
      { name: 'Jump Crypto', tag: 'TRADING', amt: 18000000 },
      { name: 'Protect Progress', tag: 'SUB-PAC', amt: 86250000 },
    ],
    pols: [
      { name: 'Ritchie Torres', p: 'D', amt: 1200000 },
      { name: 'Patrick McHenry', p: 'R', amt: 890000 },
      { name: 'Josh Gottheimer', p: 'D', amt: 750000 },
      { name: '55 other races', p: 'B', amt: 289000000 },
    ],
    results: [
      { name: 'FIT21 Act', val: 'Crypto legal framework' },
      { name: 'SEC Retreat', val: 'Enforcement pullback' },
      { name: 'Porter Defeated', val: '$10M opposition' },
      { name: '91% Win Rate', val: '54 of 59 races' },
    ]
  }
};

function renderDonorNetwork(container) {
  container.innerHTML = '';
  var currentKey = 'koch';
  var highlighted = null;

  var sel = document.createElement('div');
  sel.className = 'dm-net-selector';
  Object.keys(NETWORK_DATA).forEach(function(key) {
    var btn = document.createElement('button');
    btn.className = 'dm-net-btn' + (key === currentKey ? ' active' : '');
    btn.textContent = NETWORK_DATA[key].name;
    btn.addEventListener('click', function() {
      currentKey = key;
      highlighted = null;
      sel.querySelectorAll('.dm-net-btn').forEach(function(b) { b.classList.remove('active'); });
      btn.classList.add('active');
      buildNet();
    });
    sel.appendChild(btn);
  });
  container.appendChild(sel);

  var vizArea = document.createElement('div');
  vizArea.className = 'dm-net-area';
  container.appendChild(vizArea);

  function buildNet() {
    vizArea.innerHTML = '';
    var net = NETWORK_DATA[currentKey];
    var w = Math.min(vizArea.clientWidth || 800, 920);
    var h = Math.max(400, 50 + Math.max(net.orgs.length, net.pols.length, net.results.length) * 75);
    var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 ' + w + ' ' + h);
    svg.setAttribute('width', '100%');
    svg.style.minWidth = '700px';

    var cols = [w * 0.08, w * 0.32, w * 0.58, w * 0.84];
    var headers = ['FUNDER', 'ORGANIZATIONS', 'RECIPIENTS', 'OUTCOMES'];
    headers.forEach(function(hd, i) {
      var t = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      t.setAttribute('x', cols[i]);
      t.setAttribute('y', 18);
      t.setAttribute('text-anchor', 'middle');
      t.setAttribute('fill', DM_COLORS.textMuted);
      t.setAttribute('font-family', "'Space Mono', monospace");
      t.setAttribute('font-size', '9');
      t.setAttribute('letter-spacing', '2');
      t.textContent = hd;
      svg.appendChild(t);
    });

    var topPad = 45;
    var centerY = h / 2;
    function yPos(i, count) { return topPad + ((h - topPad - 20) / (count + 1)) * (i + 1); }

    // Connections layer
    var connG = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    svg.appendChild(connG);

    function curve(x1, y1, x2, y2, color, w2, op) {
      var p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      var mx = (x1 + x2) / 2;
      p.setAttribute('d', 'M' + x1 + ',' + y1 + ' C' + mx + ',' + y1 + ' ' + mx + ',' + y2 + ' ' + x2 + ',' + y2);
      p.setAttribute('fill', 'none');
      p.setAttribute('stroke', color);
      p.setAttribute('stroke-width', w2);
      p.setAttribute('opacity', op);
      connG.appendChild(p);
    }

    function drawConns() {
      connG.innerHTML = '';
      net.orgs.forEach(function(o, oi) {
        var hl = !highlighted || highlighted === 'center' || highlighted === ('o' + oi);
        curve(cols[0] + 55, centerY, cols[1] - 65, yPos(oi, net.orgs.length),
          net.color, Math.max(1, Math.min(4, o.amt / 30000000)), highlighted ? (hl ? 0.5 : 0.04) : 0.2);
      });
      net.orgs.forEach(function(o, oi) {
        net.pols.forEach(function(p, pi) {
          var hl = !highlighted || highlighted === ('o' + oi) || highlighted === ('p' + pi);
          curve(cols[1] + 65, yPos(oi, net.orgs.length), cols[2] - 55, yPos(pi, net.pols.length),
            DM_COLORS.green, 1, highlighted ? (hl ? 0.35 : 0.02) : 0.07);
        });
      });
      net.pols.forEach(function(p, pi) {
        net.results.forEach(function(r, ri) {
          var hl = !highlighted || highlighted === ('p' + pi) || highlighted === ('r' + ri);
          curve(cols[2] + 55, yPos(pi, net.pols.length), cols[3] - 70, yPos(ri, net.results.length),
            DM_COLORS.amber, 1, highlighted ? (hl ? 0.35 : 0.02) : 0.07);
        });
      });
    }
    drawConns();

    function mkNode(x, y, nw, nh, label, sub, color, id) {
      var isHl = !highlighted || highlighted === id;
      var g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      g.style.cursor = 'pointer';
      g.style.opacity = highlighted ? (isHl ? '1' : '0.2') : '1';
      var rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      rect.setAttribute('x', x - nw / 2); rect.setAttribute('y', y - nh / 2);
      rect.setAttribute('width', nw); rect.setAttribute('height', nh);
      rect.setAttribute('rx', 6);
      rect.setAttribute('fill', DM_COLORS.surface);
      rect.setAttribute('stroke', isHl && highlighted ? color : DM_COLORS.border);
      rect.setAttribute('stroke-width', isHl && highlighted ? 2 : 1);
      g.appendChild(rect);
      var t1 = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      t1.setAttribute('x', x); t1.setAttribute('y', y - (sub ? 3 : 2));
      t1.setAttribute('text-anchor', 'middle');
      t1.setAttribute('fill', DM_COLORS.textPrimary);
      t1.setAttribute('font-size', '11'); t1.setAttribute('font-weight', '600');
      t1.setAttribute('font-family', "'Space Grotesk', sans-serif");
      var maxC = Math.floor(nw / 7);
      t1.textContent = label.length > maxC ? label.substring(0, maxC - 2) + '..' : label;
      g.appendChild(t1);
      if (sub) {
        var t2 = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        t2.setAttribute('x', x); t2.setAttribute('y', y + 12);
        t2.setAttribute('text-anchor', 'middle');
        t2.setAttribute('fill', color);
        t2.setAttribute('font-size', '10'); t2.setAttribute('font-weight', '700');
        t2.setAttribute('font-family', "'Space Mono', monospace");
        t2.textContent = sub;
        g.appendChild(t2);
      }
      g.addEventListener('click', function() {
        highlighted = highlighted === id ? null : id;
        buildNet();
      });
      svg.appendChild(g);
    }

    mkNode(cols[0], centerY, 110, 50, net.name, net.sub.split(' ')[0], net.color, 'center');
    net.orgs.forEach(function(o, i) {
      mkNode(cols[1], yPos(i, net.orgs.length), 130, 42, o.name, fmt(o.amt), net.color, 'o' + i);
    });
    net.pols.forEach(function(p, i) {
      var c = p.p === 'D' ? DM_COLORS.dem : (p.p === 'B' ? DM_COLORS.steel : DM_COLORS.rep);
      mkNode(cols[2], yPos(i, net.pols.length), 110, 42, p.name, fmt(p.amt), c, 'p' + i);
    });
    net.results.forEach(function(r, i) {
      mkNode(cols[3], yPos(i, net.results.length), 140, 42, r.name, r.val, DM_COLORS.amber, 'r' + i);
    });

    vizArea.appendChild(svg);
  }

  buildNet();
  var hint = document.createElement('div');
  hint.className = 'dm-graph-hint';
  hint.textContent = 'Click any node to trace connections. Switch networks above.';
  container.appendChild(hint);
}

// ─── CONTRADICTION EXPLORER ────────────────

var CONTRADICTION_DATA = [
  { name: 'Nancy Pelosi', party: 'D',
    says: 'Champions affordable healthcare and consumer protection',
    pays: 'PhRMA: $1.9M | Goldman Sachs: $2.1M | Realtors: $1.8M',
    result: 'Drug pricing killed. Carried interest loophole preserved.',
    sector: 'Pharma + Wall Street' },
  { name: 'Ted Cruz', party: 'R',
    says: 'Drain the swamp, fight for working families',
    pays: 'Koch Network: $3.8M | NRA: $1.8M | Lockheed: $1.4M',
    result: '$1.9T tax cuts for corporations. Gun reform blocked.',
    sector: 'Dark Money + Defense' },
  { name: 'Chuck Schumer', party: 'D',
    says: 'Wall Street accountability and consumer protection',
    pays: 'AIPAC: $4.1M | Goldman Sachs: $1.8M | Realtors: $1.6M',
    result: 'Carried interest survived 30+ years of reform.',
    sector: 'Israel Lobby + Wall Street' },
  { name: 'Mitch McConnell', party: 'R',
    says: 'Fiscal conservative, limited government',
    pays: 'Koch: $2.9M | AIPAC: $2.8M | PhRMA: $2.1M',
    result: '$886B defense budget. Drug pricing killed. $1.9T tax cuts.',
    sector: 'Defense + Pharma' },
  { name: 'Donald Trump', party: 'R',
    says: 'Working-class champion, drain the swamp',
    pays: 'Musk: $118.6M | Koch: $2.1M | NRA: $1.5M',
    result: 'Billionaire cabinet. DOGE led by biggest donor.',
    sector: 'Mega-Donors + Energy' },
  { name: 'Marco Rubio', party: 'R',
    says: 'American families first, strong national defense',
    pays: 'AIPAC: $2.4M | Koch: $1.8M | Fanjul: $1.2M',
    result: 'Cuba sanctions protect sugar monopoly. Israel aid $3.8B/yr.',
    sector: 'Israel Lobby + Agriculture' },
  { name: 'Lindsey Graham', party: 'R',
    says: 'National security hawk, military strength',
    pays: 'Lockheed: $1.8M | Koch: $1.8M | NRA: $1.2M',
    result: 'Defense budget $886B. Gun reform blocked.',
    sector: 'Defense + Guns' },
  { name: 'Bob Menendez', party: 'D',
    says: 'Community advocate, healthcare access champion',
    pays: 'AIPAC: $2.1M | PhRMA: $1.6M | Fanjul: $400K',
    result: 'Drug pricing killed. Cuba sanctions maintained. Indicted.',
    sector: 'Pharma + Agriculture' },
];

function renderContradictions(container) {
  container.innerHTML = '';

  var header = document.createElement('div');
  header.className = 'dm-contra-header';
  header.innerHTML = '<span class="dm-contra-title">SAY VS PAY</span>' +
    '<span class="dm-contra-sub">What they promise vs. who pays them \u2014 and what actually happens</span>';
  container.appendChild(header);

  var filters = document.createElement('div');
  filters.className = 'dm-contra-filters';
  var currentFilter = 'ALL';
  ['ALL', 'D', 'R'].forEach(function(f) {
    var btn = document.createElement('button');
    btn.className = 'dm-contra-filter-btn' + (f === currentFilter ? ' active' : '');
    btn.textContent = f === 'ALL' ? 'ALL' : (f === 'D' ? 'DEMOCRATS' : 'REPUBLICANS');
    btn.style.color = f === 'D' ? DM_COLORS.dem : (f === 'R' ? DM_COLORS.rep : DM_COLORS.textSecondary);
    btn.addEventListener('click', function() {
      currentFilter = f;
      filters.querySelectorAll('.dm-contra-filter-btn').forEach(function(b) { b.classList.remove('active'); });
      btn.classList.add('active');
      renderCards();
    });
    filters.appendChild(btn);
  });
  container.appendChild(filters);

  var grid = document.createElement('div');
  grid.className = 'dm-contra-grid';
  container.appendChild(grid);

  function renderCards() {
    grid.innerHTML = '';
    CONTRADICTION_DATA.filter(function(d) {
      return currentFilter === 'ALL' || d.party === currentFilter;
    }).forEach(function(d) {
      var card = document.createElement('div');
      card.className = 'dm-contra-card';
      card.innerHTML =
        '<div class="dm-contra-card-top">' +
          '<span class="dm-contra-party" style="background:' + (d.party === 'D' ? DM_COLORS.dem : DM_COLORS.rep) + '">' + d.party + '</span>' +
          '<span class="dm-contra-name">' + d.name + '</span>' +
          '<span class="dm-contra-sector">' + d.sector + '</span>' +
        '</div>' +
        '<div class="dm-contra-says">' +
          '<div class="dm-contra-label">SAYS</div>' +
          '<div class="dm-contra-text">\u201C' + d.says + '\u201D</div>' +
        '</div>' +
        '<div class="dm-contra-pays">' +
          '<div class="dm-contra-label">PAYS</div>' +
          '<div class="dm-contra-text">' + d.pays + '</div>' +
        '</div>' +
        '<div class="dm-contra-result">' +
          '<div class="dm-contra-label">RESULT</div>' +
          '<div class="dm-contra-text">' + d.result + '</div>' +
        '</div>';
      grid.appendChild(card);
    });
  }
  renderCards();
}

// ─── SECTOR SPENDING DASHBOARD ─────────────

var SECTOR_DATA = [
  { name: 'Energy / Dark Money', org: 'Koch Network', spent: 12300000, returned: 1900000000000, policy: '2017 Tax Cuts ($1.9T)', color: '#ef4444' },
  { name: 'Defense', org: 'Lockheed Martin', spent: 6400000, returned: 886000000000, policy: 'Defense Budget $886B', color: '#f59e0b' },
  { name: 'Pharma', org: 'PhRMA', spent: 9800000, returned: 450000000000, policy: 'Drug Pricing Killed', color: '#22c55e' },
  { name: 'Israel Lobby', org: 'AIPAC', spent: 21200000, returned: 3800000000, policy: 'Israel Aid $3.8B/yr', color: '#5b8dce' },
  { name: 'Wall Street', org: 'Goldman Sachs', spent: 8700000, returned: 18000000000, policy: 'Carried Interest Kept', color: '#a855f7' },
  { name: 'Real Estate', org: 'Realtors Assn', spent: 7100000, returned: 12000000000, policy: 'Housing Deregulation', color: '#06b6d4' },
  { name: 'Agriculture', org: 'Fanjul Family', spent: 2900000, returned: 1500000000, policy: 'Sugar Tariffs + Cuba Sanctions', color: '#84cc16' },
  { name: 'Guns', org: 'NRA', spent: 5200000, returned: 0, policy: 'Gun Reform Blocked', color: '#78716c' },
];

function renderSectorDashboard(container) {
  container.innerHTML = '';

  var header = document.createElement('div');
  header.className = 'dm-sector-header';
  header.innerHTML = '<span class="dm-sector-title">SECTOR SPENDING vs POLICY RETURNS</span>' +
    '<span class="dm-sector-sub">How much each industry spends on politics \u2014 and what they get back</span>';
  container.appendChild(header);

  var sorted = SECTOR_DATA.slice().sort(function(a, b) {
    if (a.returned === 0) return 1;
    if (b.returned === 0) return -1;
    return (b.returned / b.spent) - (a.returned / a.spent);
  });

  var maxSpent = Math.max.apply(null, sorted.map(function(d) { return d.spent; }));
  var maxRet = Math.max.apply(null, sorted.filter(function(d) { return d.returned > 0; }).map(function(d) { return d.returned; }));

  sorted.forEach(function(row) {
    var card = document.createElement('div');
    card.className = 'dm-sector-card';
    card.style.borderLeftColor = row.color;
    var roi = row.returned > 0 ? Math.round(row.returned / row.spent) : 0;
    card.innerHTML =
      '<div class="dm-sector-top">' +
        '<div class="dm-sector-name">' + row.name + '</div>' +
        '<div class="dm-sector-org">' + row.org + '</div>' +
      '</div>' +
      '<div class="dm-sector-bars">' +
        '<div class="dm-sector-bar-row">' +
          '<span class="dm-sector-bar-label">SPENT</span>' +
          '<div class="dm-sector-bar-track">' +
            '<div class="dm-sector-bar-fill" style="width:' + ((row.spent / maxSpent) * 100) + '%;background:' + row.color + '"></div>' +
          '</div>' +
          '<span class="dm-sector-bar-val">' + fmt(row.spent) + '</span>' +
        '</div>' +
        '<div class="dm-sector-bar-row">' +
          '<span class="dm-sector-bar-label">RETURN</span>' +
          '<div class="dm-sector-bar-track">' +
            '<div class="dm-sector-bar-fill" style="width:' + (row.returned > 0 ? ((row.returned / maxRet) * 100) : 0) + '%;background:' + DM_COLORS.green + '"></div>' +
          '</div>' +
          '<span class="dm-sector-bar-val" style="color:' + (row.returned > 0 ? DM_COLORS.green : DM_COLORS.textMuted) + '">' + (row.returned > 0 ? fmt(row.returned) : 'N/A') + '</span>' +
        '</div>' +
      '</div>' +
      '<div class="dm-sector-bottom">' +
        '<span class="dm-sector-policy">' + row.policy + '</span>' +
        '<span class="dm-sector-roi" style="color:' + (roi > 0 ? DM_COLORS.green : DM_COLORS.amber) + '">' +
          'ROI: ' + (roi > 0 ? roi.toLocaleString() + 'x' : 'Blocked') +
        '</span>' +
      '</div>';
    container.appendChild(card);
  });
}

// ─── POLICY COST COMPARISON ────────────────

var POLICY_COST_DATA = [
  { name: 'Medicare for All (10yr)', cost: 32000000000000, category: 'healthcare', note: 'Replaces $45T in current spending; net savings ~$2T', color: '#22c55e', sources: 'Lancet, CBO, PERI' },
  { name: 'Current US Healthcare (10yr)', cost: 45000000000000, category: 'healthcare', note: 'What we already spend — premiums, copays, deductibles, uninsured', color: '#ef4444', sources: 'CMS National Health Expenditure Data' },
  { name: 'Iraq War (total)', cost: 3000000000000, category: 'war', note: '2003-2021 including veteran care, interest on borrowing', color: '#f59e0b', sources: 'Watson Institute, Brown University' },
  { name: 'Afghanistan War (total)', cost: 2300000000000, category: 'war', note: '2001-2021 including reconstruction, veteran care', color: '#f59e0b', sources: 'Watson Institute, Brown University' },
  { name: '2017 Tax Cuts (10yr)', cost: 1900000000000, category: 'tax', note: 'Exposed $1.9T deficit; top 1% received 83% of benefits by 2027', color: '#a855f7', sources: 'CBO, Tax Policy Center' },
  { name: 'Defense Budget (1yr)', cost: 886000000000, category: 'war', note: 'FY2024 — more than next 10 countries combined', color: '#f59e0b', sources: 'DoD Budget Request' },
  { name: 'Student Loan Debt (total)', cost: 1700000000000, category: 'education', note: '43 million borrowers; avg $37,574 per person', color: '#06b6d4', sources: 'Federal Reserve, Dept of Education' },
  { name: 'Free Public College (10yr)', cost: 800000000000, category: 'education', note: 'Tuition-free public universities for all Americans', color: '#22c55e', sources: 'Dept of Education estimates' },
  { name: 'PhRMA Lobbying vs Savings', cost: 450000000000, category: 'pharma', note: '$9.8M in donations killed drug pricing reform — saved industry $450B', color: '#ef4444', sources: 'OpenSecrets, CBO' },
  { name: 'Israel Aid (10yr)', cost: 38000000000, category: 'foreign', note: '$3.8B/year in military aid; bipartisan 97-3 vote', color: '#5b8dce', sources: 'State Dept, CRS' },
  { name: 'AIPAC + UDP Spending (2024)', cost: 121200000, category: 'lobbying', note: 'AIPAC PAC ($21.2M) + United Democracy Project Super PAC ($100M) in 2024 cycle alone', color: '#5b8dce', sources: 'OpenSecrets, FEC' },
  { name: 'Flint Water Fix', cost: 600000000, category: 'infrastructure', note: 'Total cost to replace all lead pipes in Flint, MI', color: '#06b6d4', sources: 'EPA, State of Michigan' },
  { name: 'Koch Tax Cut Donations', cost: 12300000, category: 'lobbying', note: 'What Koch spent to get $1.9T in tax cuts — 154,472x return', color: '#a855f7', sources: 'OpenSecrets' },
];

var COST_COMPARISONS = [
  {
    title: 'Medicare for All vs. What We Already Pay',
    left: { name: 'Medicare for All (10yr)', cost: 32000000000000, color: '#22c55e' },
    right: { name: 'Current System (10yr)', cost: 45000000000000, color: '#ef4444' },
    verdict: 'Medicare for All would SAVE $13 trillion over 10 years and cover everyone. The "too expensive" argument costs us more.',
  },
  {
    title: 'Wars We Funded vs. Healthcare We Refuse To',
    left: { name: 'Iraq + Afghanistan Wars', cost: 5300000000000, color: '#f59e0b' },
    right: { name: 'Medicare for All (10yr)', cost: 32000000000000, color: '#22c55e' },
    verdict: 'We found $5.3 trillion for two wars with no debate. Healthcare for everyone is "too expensive" — but would replace a $45T system and save $13T.',
  },
  {
    title: 'Free College vs. Tax Cuts for the Rich',
    left: { name: 'Free Public College (10yr)', cost: 800000000000, color: '#06b6d4' },
    right: { name: '2017 Tax Cuts (10yr)', cost: 1900000000000, color: '#a855f7' },
    verdict: 'The tax cuts cost 2.4x more than free college for every American — and 83% of the benefits went to the top 1%.',
  },
  {
    title: 'Fixing Flint vs. AIPAC Spending',
    left: { name: 'Fix Flint Water Crisis', cost: 600000000, color: '#06b6d4' },
    right: { name: 'AIPAC + UDP (2024 cycle)', cost: 121200000, color: '#5b8dce' },
    verdict: 'AIPAC and its Super PAC spent $121M in one election cycle to secure $38 BILLION in aid. We could fix Flint 5x over for what they spend in one cycle.',
  },
  {
    title: 'What Lobbying Buys',
    left: { name: 'Koch Donations', cost: 12300000, color: '#a855f7' },
    right: { name: 'Tax Cuts They Got', cost: 1900000000000, color: '#ef4444' },
    verdict: '$12.3M in donations bought $1.9 TRILLION in tax cuts. Return on investment: 154,472x.',
  },
  {
    title: 'PhRMA: The $9.8M That Cost Americans $450B',
    left: { name: 'PhRMA Donations', cost: 9800000, color: '#22c55e' },
    right: { name: 'Drug Pricing Reform Killed', cost: 450000000000, color: '#ef4444' },
    verdict: '$9.8M in donations to both parties killed drug pricing negotiation — costing Americans $450 billion.',
  },
];

function renderPolicyCosts(container) {
  container.innerHTML = '';

  var header = document.createElement('div');
  header.className = 'dm-costs-header';
  header.innerHTML = '<span class="dm-costs-title">WHAT IT ACTUALLY COSTS</span>' +
    '<span class="dm-costs-sub">Policy price tags vs. what we choose to spend — the numbers they hope you never compare</span>';
  container.appendChild(header);

  // View toggle
  var viewToggle = document.createElement('div');
  viewToggle.className = 'dm-costs-toggle';
  var currentView = 'compare';
  ['compare', 'scale'].forEach(function(v) {
    var btn = document.createElement('button');
    btn.className = 'dm-costs-toggle-btn' + (v === currentView ? ' active' : '');
    btn.textContent = v === 'compare' ? 'Side-by-Side' : 'Full Scale';
    btn.addEventListener('click', function() {
      currentView = v;
      viewToggle.querySelectorAll('.dm-costs-toggle-btn').forEach(function(b) { b.classList.remove('active'); });
      btn.classList.add('active');
      renderView();
    });
    viewToggle.appendChild(btn);
  });
  container.appendChild(viewToggle);

  var viewArea = document.createElement('div');
  viewArea.className = 'dm-costs-area';
  container.appendChild(viewArea);

  function renderView() {
    viewArea.innerHTML = '';
    if (currentView === 'compare') renderCompare();
    else renderScale();
  }

  function renderCompare() {
    COST_COMPARISONS.forEach(function(comp) {
      var card = document.createElement('div');
      card.className = 'dm-costs-compare-card';

      var maxCost = Math.max(comp.left.cost, comp.right.cost);
      var leftPct = (comp.left.cost / maxCost) * 100;
      var rightPct = (comp.right.cost / maxCost) * 100;

      // When ratio is extreme (>50x), use log scale so small bar is still visible
      var ratio = maxCost / Math.min(comp.left.cost, comp.right.cost);
      if (ratio > 50) {
        var logMax = Math.log10(maxCost);
        var logLeft = Math.log10(comp.left.cost);
        var logRight = Math.log10(comp.right.cost);
        var logMin = Math.min(logLeft, logRight) - 0.5;
        leftPct = ((logLeft - logMin) / (logMax - logMin)) * 100;
        rightPct = ((logRight - logMin) / (logMax - logMin)) * 100;
      }

      // Always ensure minimum visible bar
      leftPct = Math.max(3, leftPct);
      rightPct = Math.max(3, rightPct);

      // Show ratio badge when difference is significant
      var ratioLabel = '';
      if (ratio >= 2) {
        var ratioStr = ratio >= 1000 ? Math.round(ratio).toLocaleString() + 'x' : ratio.toFixed(1) + 'x';
        ratioLabel = '<span class="dm-costs-ratio">' + ratioStr + ' difference</span>';
      }

      card.innerHTML =
        '<div class="dm-costs-compare-title">' + comp.title + ratioLabel + '</div>' +
        '<div class="dm-costs-compare-bars">' +
          '<div class="dm-costs-compare-row">' +
            '<span class="dm-costs-compare-label">' + comp.left.name + '</span>' +
            '<div class="dm-costs-compare-track">' +
              '<div class="dm-costs-compare-fill" style="width:' + leftPct + '%;background:' + comp.left.color + '"></div>' +
            '</div>' +
            '<span class="dm-costs-compare-val" style="color:' + comp.left.color + '">' + fmt(comp.left.cost) + '</span>' +
          '</div>' +
          '<div class="dm-costs-compare-row">' +
            '<span class="dm-costs-compare-label">' + comp.right.name + '</span>' +
            '<div class="dm-costs-compare-track">' +
              '<div class="dm-costs-compare-fill" style="width:' + rightPct + '%;background:' + comp.right.color + '"></div>' +
            '</div>' +
            '<span class="dm-costs-compare-val" style="color:' + comp.right.color + '">' + fmt(comp.right.cost) + '</span>' +
          '</div>' +
        '</div>' +
        '<div class="dm-costs-verdict">' + comp.verdict + '</div>';
      viewArea.appendChild(card);
    });
  }

  function renderScale() {
    // Sort by cost descending
    var sorted = POLICY_COST_DATA.slice().sort(function(a, b) { return b.cost - a.cost; });
    var maxCost = sorted[0].cost;

    // Use log scale since values span 6 orders of magnitude
    var logMax = Math.log10(maxCost);
    var logMin = Math.log10(Math.max(1, sorted[sorted.length - 1].cost));

    sorted.forEach(function(row) {
      var card = document.createElement('div');
      card.className = 'dm-costs-scale-card';

      var logVal = Math.log10(Math.max(1, row.cost));
      var pct = ((logVal - logMin) / (logMax - logMin)) * 100;
      pct = Math.max(2, pct);

      var catIcon = row.category === 'healthcare' ? '\u{1F3E5}' :
                    row.category === 'war' ? '\u{1F4A3}' :
                    row.category === 'tax' ? '\u{1F4B0}' :
                    row.category === 'education' ? '\u{1F393}' :
                    row.category === 'lobbying' ? '\u{1F4B5}' :
                    row.category === 'pharma' ? '\u{1F48A}' :
                    row.category === 'infrastructure' ? '\u{1F527}' :
                    '\u{1F3DB}';

      card.innerHTML =
        '<div class="dm-costs-scale-top">' +
          '<span class="dm-costs-scale-icon">' + catIcon + '</span>' +
          '<span class="dm-costs-scale-name">' + row.name + '</span>' +
          '<span class="dm-costs-scale-amount" style="color:' + row.color + '">' + fmt(row.cost) + '</span>' +
        '</div>' +
        '<div class="dm-costs-scale-bar-track">' +
          '<div class="dm-costs-scale-bar-fill" style="width:' + pct + '%;background:' + row.color + '"></div>' +
        '</div>' +
        '<div class="dm-costs-scale-note">' + row.note + '</div>';
      viewArea.appendChild(card);
    });
  }

  renderView();
}

// ─── INLINE: Contradiction section markers ──

function enhanceContradictions() {
  var article = document.querySelector('article');
  if (!article) return;
  var headings = article.querySelectorAll('h2, h3');
  for (var i = 0; i < headings.length; i++) {
    var h = headings[i];
    if (h.dataset.contraMarked) continue;
    var text = (h.textContent || '').toLowerCase();
    if (text.indexOf('contradiction') !== -1) {
      h.dataset.contraMarked = 'true';
      var marker = document.createElement('div');
      marker.className = 'dm-contra-marker';
      marker.innerHTML = '<span class="dm-contra-marker-dot"></span> CONTRADICTION DETECTED';
      h.parentNode.insertBefore(marker, h);
    }
  }
}

// ─── INLINE: Profile interactive tools ──────

function injectProfileTools() {
  var slug = (document.body.getAttribute('data-slug') || '').toLowerCase();
  // Only master profiles
  if (slug.indexOf('master-profile') === -1 && slug.charAt(slug.lastIndexOf('/') + 1) !== '_') return;
  var article = document.querySelector('article');
  if (!article) return;
  // Don't double-inject
  if (document.getElementById('dm-profile-tools')) return;

  // Find the politician name from the page title
  var titleEl = document.querySelector('.article-title');
  var pageName = (titleEl ? titleEl.textContent : '').replace(/^[_$]/, '').replace(' Master Profile', '').trim().toLowerCase();

  // --- 1. Personalized Say vs Pay card ---
  var match = null;
  for (var i = 0; i < CONTRADICTION_DATA.length; i++) {
    if (pageName.indexOf(CONTRADICTION_DATA[i].name.toLowerCase()) !== -1 ||
        CONTRADICTION_DATA[i].name.toLowerCase().indexOf(pageName) !== -1) {
      match = CONTRADICTION_DATA[i];
      break;
    }
  }

  if (match) {
    // Find the contradiction heading and inject card after its parent container
    var headings = article.querySelectorAll('h2, h3');
    for (var j = 0; j < headings.length; j++) {
      var hText = (headings[j].textContent || '').toLowerCase();
      if (hText.indexOf('contradiction') !== -1) {
        var svpCard = document.createElement('div');
        svpCard.className = 'dm-profile-svp';
        svpCard.innerHTML =
          '<div class="dm-profile-svp-header">' +
            '<span class="dm-contra-marker-dot"></span>' +
            '<span class="dm-profile-svp-title">SAY VS PAY: ' + match.name.toUpperCase() + '</span>' +
          '</div>' +
          '<div class="dm-contra-says">' +
            '<div class="dm-contra-label">SAYS</div>' +
            '<div class="dm-contra-text">\u201C' + match.says + '\u201D</div>' +
          '</div>' +
          '<div class="dm-contra-pays">' +
            '<div class="dm-contra-label">PAYS</div>' +
            '<div class="dm-contra-text">' + match.pays + '</div>' +
          '</div>' +
          '<div class="dm-contra-result">' +
            '<div class="dm-contra-label">RESULT</div>' +
            '<div class="dm-contra-text">' + match.result + '</div>' +
          '</div>';
        // Insert after the heading's closest article-level parent
        var parent = headings[j];
        while (parent.parentNode && parent.parentNode !== article) {
          parent = parent.parentNode;
        }
        if (parent.nextSibling) {
          article.insertBefore(svpCard, parent.nextSibling);
        } else {
          article.appendChild(svpCard);
        }
        break;
      }
    }
  }

  // --- 2. Tabbed interactive tools at bottom of article ---
  var toolsWrap = document.createElement('div');
  toolsWrap.id = 'dm-profile-tools';
  toolsWrap.className = 'dm-profile-tools';

  var toolsHeader = document.createElement('div');
  toolsHeader.className = 'dm-profile-tools-header';
  toolsHeader.innerHTML = '<span class="dm-profile-tools-label">INTERACTIVE TOOLS</span>' +
    '<span class="dm-profile-tools-sub">Explore the money behind the politics</span>';
  toolsWrap.appendChild(toolsHeader);

  // Tabs
  var tabs = document.createElement('div');
  tabs.className = 'dm-hp-tabs';
  var tabData = [
    { id: 'flow', label: 'Money Flow' },
    { id: 'roi', label: 'ROI Calculator' },
    { id: 'both', label: 'Both Sides' },
    { id: 'contra', label: 'Say vs Pay' },
    { id: 'sector', label: 'Sector ROI' },
    { id: 'costs', label: 'Policy Costs' },
  ];
  tabData.forEach(function(t, i) {
    var btn = document.createElement('button');
    btn.className = 'dm-hp-tab' + (i === 0 ? ' dm-hp-tab-active' : '');
    btn.setAttribute('data-tab', t.id);
    btn.textContent = t.label;
    btn.addEventListener('click', function() {
      tabs.querySelectorAll('.dm-hp-tab').forEach(function(b) { b.classList.remove('dm-hp-tab-active'); });
      btn.classList.add('dm-hp-tab-active');
      toolsWrap.querySelectorAll('.dm-hp-panel').forEach(function(p) { p.classList.remove('dm-hp-panel-active'); });
      var panel = toolsWrap.querySelector('[data-panel="' + t.id + '"]');
      if (panel) {
        panel.classList.add('dm-hp-panel-active');
        // Lazy render on first show
        if (!panel.dataset.rendered) {
          panel.dataset.rendered = 'true';
          if (t.id === 'flow') renderMoneyFlow(panel);
          if (t.id === 'roi') renderROICalc(panel);
          if (t.id === 'both') renderBothSides(panel);
          if (t.id === 'contra') renderContradictions(panel);
          if (t.id === 'sector') renderSectorDashboard(panel);
          if (t.id === 'costs') renderPolicyCosts(panel);
        }
      }
    });
    tabs.appendChild(btn);
  });
  toolsWrap.appendChild(tabs);

  // Panels
  tabData.forEach(function(t, i) {
    var panel = document.createElement('div');
    panel.className = 'dm-hp-panel' + (i === 0 ? ' dm-hp-panel-active' : '');
    panel.setAttribute('data-panel', t.id);
    toolsWrap.appendChild(panel);
  });

  article.appendChild(toolsWrap);

  // Render first tab immediately
  var firstPanel = toolsWrap.querySelector('[data-panel="flow"]');
  if (firstPanel) {
    firstPanel.dataset.rendered = 'true';
    renderMoneyFlow(firstPanel);
  }
}

// ─── INIT ────────────────────────────────────

function initInteractive() {
  // Homepage tabbed tools
  var hp = document.getElementById('dm-homepage-tools');
  if (hp) renderHomepageTools(hp);

  // Standalone pages
  var mf = document.getElementById('dm-money-flow');
  if (mf) renderMoneyFlow(mf);

  var roi = document.getElementById('dm-roi-calc');
  if (roi) renderROICalc(roi);

  var bs = document.getElementById('dm-both-sides');
  if (bs) renderBothSides(bs);

  var dn = document.getElementById('dm-donor-network');
  if (dn) renderDonorNetwork(dn);

  var ct = document.getElementById('dm-contradictions');
  if (ct) renderContradictions(ct);

  var sc = document.getElementById('dm-sector');
  if (sc) renderSectorDashboard(sc);

  var pc = document.getElementById('dm-policy-costs');
  if (pc) renderPolicyCosts(pc);
}

// Replace em dashes with semicolons in article text
function replaceEmDashes() {
  var article = document.querySelector('article');
  if (!article) return;
  var em = String.fromCharCode(8212);
  var walker = document.createTreeWalker(article, NodeFilter.SHOW_TEXT);
  var node;
  while (node = walker.nextNode()) {
    if (node.nodeValue && node.nodeValue.indexOf(em) !== -1) {
      node.nodeValue = node.nodeValue.split(em).join('; ');
    }
  }
}

// Clean up folder page titles: "Folder: Lobbying-Firms--and--K-Street" → "Lobbying Firms & K Street"
function cleanFolderTitle() {
  var title = document.querySelector('.article-title');
  if (!title) return;
  var text = title.textContent || '';
  if (text.indexOf('Folder:') !== 0) return;
  text = text.replace('Folder: ', '');
  text = text.replace(/--and--/g, ' & ');
  text = text.replace(/-/g, ' ');
  title.textContent = text;
}

// Replace leading underscores with $ in folder listings
function cleanListingNames() {
  var links = document.querySelectorAll('.section-li .desc a');
  for (var i = 0; i < links.length; i++) {
    var t = links[i].textContent || '';
    if (t.charAt(0) === '_') {
      links[i].textContent = '$' + t.substring(1);
    }
  }
}

// Hide dataview inline fields (key:: value) on all pages
function hideDataviewFields() {
  var article = document.querySelector('article');
  if (!article) return;
  var ps = article.querySelectorAll('p');
  for (var i = 0; i < ps.length; i++) {
    var t = (ps[i].textContent || '').trim();
    if (t.match(/[a-z-]+::\s/)) {
      ps[i].style.display = 'none';
    }
  }
}

// Smart table enhancement — detect content types and style cells accordingly
function enhanceTables() {
  var tables = document.querySelectorAll('article table');
  for (var t = 0; t < tables.length; t++) {
    var table = tables[t];
    // Skip already-enhanced tables
    if (table.dataset.enhanced) continue;
    table.dataset.enhanced = 'true';

    // Wrap table in scroll container for mobile
    if (!table.parentElement.classList.contains('table-scroll-wrap')) {
      var wrap = document.createElement('div');
      wrap.className = 'table-scroll-wrap';
      table.parentNode.insertBefore(wrap, table);
      wrap.appendChild(table);
    }

    // Scan all cells for content-based styling
    var cells = table.querySelectorAll('td');
    for (var c = 0; c < cells.length; c++) {
      var cell = cells[c];
      var text = (cell.textContent || '').trim();

      // Money detection: $1.2M, $450B, $3,200, etc.
      if (text.match(/^\$[\d,.]+[KkMmBbTt]?$/)) {
        cell.classList.add('cell-money');
      }

      // Date detection: 2014, 2014-2017, Jan 2020, March 16 2026, etc.
      if (text.match(/^(19|20)\d{2}/) || text.match(/^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)/i)) {
        cell.classList.add('cell-date');
      }

      // Time gap detection: "Same week", "3 days", "2 months", "48 hours"
      if (text.match(/same\s+(day|week|month)/i) || text.match(/^\d+\s+(day|week|hour|month)/i) || text.match(/immediate/i)) {
        cell.classList.add('cell-gap-fast');
      }
    }
  }
}

// Add type badges to folder listing items based on their href
function enhanceListings() {
  var items = document.querySelectorAll('.section-li .section');
  for (var i = 0; i < items.length; i++) {
    var item = items[i];
    if (item.dataset.badged) continue;
    item.dataset.badged = 'true';
    var link = item.querySelector('a');
    if (!link) continue;
    var href = (link.getAttribute('href') || '').toLowerCase();
    var badge = null;
    if (href.indexOf('/politicians/') !== -1) {
      badge = 'POL';
      var cls = 'listing-badge-pol';
    } else if (href.indexOf('/donors') !== -1) {
      badge = 'DONOR';
      var cls = 'listing-badge-donor';
    } else if (href.indexOf('/stories/') !== -1) {
      badge = 'STORY';
      var cls = 'listing-badge-story';
    } else if (href.indexOf('/lobbying') !== -1 || href.indexOf('/k-street') !== -1) {
      badge = 'K ST';
      var cls = 'listing-badge-lobby';
    } else if (href.indexOf('/media') !== -1) {
      badge = 'MEDIA';
      var cls = 'listing-badge-media';
    } else if (href.indexOf('/think') !== -1) {
      badge = 'THINK';
      var cls = 'listing-badge-think';
    }
    if (badge) {
      var span = document.createElement('span');
      span.className = 'listing-badge ' + cls;
      span.textContent = badge;
      item.insertBefore(span, item.firstChild);
    }
  }
}

// Global utilities (run on all pages)
replaceEmDashes();
cleanFolderTitle();
cleanListingNames();
hideDataviewFields();
enhanceTables();
// enhanceListings() replaced by server-side rendering in PageList.tsx
enhanceContradictions();

// Interactive tools only on interactive/* pages — NOT on profile pages
var dmSlug = (document.body.getAttribute('data-slug') || '').toLowerCase();
if (dmSlug.indexOf('interactive/') !== -1 || dmSlug === 'index') {
  initInteractive();
}

document.addEventListener('nav', function() {
  setTimeout(function() {
    replaceEmDashes();
    cleanFolderTitle();
    cleanListingNames();
    hideDataviewFields();
    enhanceTables();
    enhanceContradictions();
    var s = (document.body.getAttribute('data-slug') || '').toLowerCase();
    if (s.indexOf('interactive/') !== -1 || s === 'index') {
      initInteractive();
    }
  }, 100);
});
`

InteractiveGraphs.css = `
/* ═══════════════════════════════════════════════
   INTERACTIVE GRAPHS — Shared Styles
   ═══════════════════════════════════════════════ */

.dm-interactive-container {
  width: 100%;
  margin: 24px 0;
  overflow-x: auto;
}

.dm-interactive-container svg {
  display: block;
  margin: 0 auto;
}

.dm-graph-hint {
  font-family: 'Space Mono', monospace;
  font-size: 11px;
  color: #63636e;
  text-align: center;
  margin-top: 12px;
  letter-spacing: 0.5px;
}

/* ─── ROI Calculator ─────────────────────── */

.dm-roi-header, .dm-bs-header {
  margin-bottom: 24px;
}

.dm-roi-header-label, .dm-bs-header-label {
  display: block;
  font-family: 'Space Mono', monospace;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 2px;
  color: #63636e;
  margin-bottom: 4px;
}

.dm-roi-header-sub, .dm-bs-header-sub {
  font-size: 13px;
  color: #a1a1aa;
}

.dm-roi-card {
  background: #13131a;
  border: 1px solid #1e1e28;
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 16px;
  transition: border-color 0.2s;
}

.dm-roi-card:hover {
  border-color: rgba(91, 141, 206, 0.3);
}

.dm-roi-top {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 8px;
  flex-wrap: wrap;
}

.dm-roi-donor {
  font-weight: 700;
  color: #5b8dce;
  font-size: 15px;
}

.dm-roi-arrow {
  color: #63636e;
  font-size: 14px;
}

.dm-roi-politician {
  font-weight: 600;
  font-size: 15px;
}

.dm-roi-policy {
  font-size: 13px;
  color: #a1a1aa;
  margin-bottom: 16px;
  padding-left: 2px;
}

.dm-roi-bars {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 12px;
}

.dm-roi-bar-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.dm-roi-bar-label {
  font-family: 'Space Mono', monospace;
  font-size: 9px;
  letter-spacing: 1.5px;
  color: #63636e;
  width: 90px;
  flex-shrink: 0;
}

.dm-roi-bar-track {
  flex: 1;
  height: 8px;
  background: #1a1a22;
  border-radius: 4px;
  overflow: hidden;
}

.dm-roi-bar-fill {
  height: 100%;
  border-radius: 4px;
  transition: width 0.6s ease;
}

.dm-roi-bar-donated {
  background: #5b8dce;
}

.dm-roi-bar-value-fill {
  background: #22c55e;
}

.dm-roi-bar-value {
  font-family: 'Space Mono', monospace;
  font-size: 12px;
  font-weight: 700;
  color: #b4b4bc;
  width: 60px;
  text-align: right;
  flex-shrink: 0;
}

.dm-roi-badge {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 14px;
  background: rgba(34, 197, 94, 0.08);
  border: 1px solid rgba(34, 197, 94, 0.15);
  border-radius: 6px;
  width: fit-content;
}

.dm-roi-badge-na {
  background: rgba(245, 158, 11, 0.08);
  border-color: rgba(245, 158, 11, 0.15);
}

.dm-roi-badge-label {
  font-family: 'Space Mono', monospace;
  font-size: 10px;
  letter-spacing: 2px;
  color: #63636e;
}

.dm-roi-badge-value {
  font-family: 'Space Mono', monospace;
  font-size: 18px;
  font-weight: 700;
  color: #22c55e;
}

.dm-roi-badge-na .dm-roi-badge-value {
  color: #f59e0b;
  font-size: 14px;
}

/* ─── Both Sides ─────────────────────────── */

.dm-bs-card {
  background: #13131a;
  border: 1px solid #1e1e28;
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 20px;
  transition: border-color 0.2s;
}

.dm-bs-card:hover {
  border-color: rgba(91, 141, 206, 0.3);
}

.dm-bs-donor-header {
  margin-bottom: 16px;
}

.dm-bs-donor-name {
  font-size: 18px;
  font-weight: 700;
  color: #5b8dce;
  margin-bottom: 4px;
}

.dm-bs-donor-meta {
  display: flex;
  gap: 16px;
  align-items: center;
}

.dm-bs-sector {
  font-family: 'Space Mono', monospace;
  font-size: 10px;
  letter-spacing: 1px;
  color: #63636e;
  background: #1a1a22;
  padding: 2px 8px;
  border-radius: 3px;
}

.dm-bs-total {
  font-family: 'Space Mono', monospace;
  font-size: 12px;
  font-weight: 700;
  color: #22c55e;
}

.dm-bs-split {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  gap: 16px;
  align-items: start;
  margin-bottom: 16px;
}

.dm-bs-side {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.dm-bs-side-header {
  font-family: 'Space Mono', monospace;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 1.5px;
  margin-bottom: 6px;
}

.dm-bs-recipient {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 10px;
  background: rgba(255, 255, 255, 0.02);
  border-radius: 4px;
}

.dm-bs-recip-name {
  font-size: 13px;
  color: #b4b4bc;
  font-weight: 500;
}

.dm-bs-recip-amount {
  font-family: 'Space Mono', monospace;
  font-size: 11px;
  font-weight: 700;
  color: #22c55e;
}

.dm-bs-center {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding-top: 28px;
  min-width: 80px;
}

.dm-bs-bar {
  display: flex;
  width: 80px;
  height: 6px;
  border-radius: 3px;
  overflow: hidden;
}

.dm-bs-bar-dem {
  background: #3b82f6;
  height: 100%;
}

.dm-bs-bar-rep {
  background: #ef4444;
  height: 100%;
}

.dm-bs-pct {
  display: flex;
  justify-content: space-between;
  width: 80px;
  font-family: 'Space Mono', monospace;
  font-size: 10px;
  font-weight: 700;
}

.dm-bs-policy {
  font-size: 13px;
  color: #a1a1aa;
  padding: 10px 14px;
  background: rgba(245, 158, 11, 0.06);
  border-left: 3px solid #f59e0b;
  border-radius: 0 6px 6px 0;
}

.dm-bs-policy-label {
  font-family: 'Space Mono', monospace;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 1px;
  color: #f59e0b;
}

/* ─── Mobile responsive ──────────────────── */

@media (max-width: 800px) {
  .dm-bs-split {
    grid-template-columns: 1fr;
    gap: 12px;
  }

  .dm-bs-center {
    padding-top: 0;
    width: 100%;
    min-width: unset;
  }

  .dm-bs-bar {
    width: 100%;
  }

  .dm-bs-pct {
    width: 100%;
  }

  .dm-roi-bar-label {
    width: 70px;
    font-size: 8px;
  }

  .dm-roi-bar-value {
    width: 50px;
    font-size: 10px;
  }

  .dm-roi-top {
    flex-direction: column;
    align-items: flex-start;
    gap: 4px;
  }

  .dm-roi-arrow {
    display: none;
  }
}

/* ═══════════════════════════════════════════════
   HOMEPAGE TABBED TOOLS
   ═══════════════════════════════════════════════ */

.dm-hp-tools {
  background: #13131a;
  border: 1px solid #1e1e28;
  border-radius: 10px;
  overflow: hidden;
}

.dm-hp-tabs {
  display: flex;
  border-bottom: 1px solid #1e1e28;
  background: #0e0e14;
}

.dm-hp-tab {
  flex: 1;
  padding: 14px 12px;
  border: none;
  background: none;
  color: #63636e;
  font-family: 'Space Grotesk', sans-serif;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s;
  text-align: center;
  border-bottom: 2px solid transparent;
}

.dm-hp-tab:hover {
  color: #a1a1aa;
  background: rgba(91, 141, 206, 0.04);
}

.dm-hp-tab-active {
  color: #5b8dce !important;
  border-bottom-color: #5b8dce !important;
  background: rgba(91, 141, 206, 0.06) !important;
}

.dm-hp-tab-icon {
  margin-right: 4px;
}

.dm-hp-panel {
  display: none;
  padding: 24px;
}

.dm-hp-panel-active {
  display: block;
}

@media (max-width: 800px) {
  .dm-hp-tab {
    font-size: 12px;
    padding: 10px 6px;
  }

  .dm-hp-tab-icon {
    display: none;
  }

  .dm-hp-panel {
    padding: 16px 12px;
  }
}

/* ═══════════════════════════════════════════════
   DONOR NETWORK EXPLORER
   ═══════════════════════════════════════════════ */

.dm-net-selector {
  display: flex;
  gap: 8px;
  margin-bottom: 20px;
  flex-wrap: wrap;
}

.dm-net-btn {
  padding: 8px 18px;
  border: 1px solid #1e1e28;
  border-radius: 6px;
  background: #13131a;
  color: #b4b4bc;
  font-family: 'Space Grotesk', sans-serif;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s;
}

.dm-net-btn:hover {
  border-color: rgba(91, 141, 206, 0.3);
  color: #e4e4e7;
}

.dm-net-btn.active {
  border-color: #5b8dce;
  color: #5b8dce;
  background: rgba(91, 141, 206, 0.08);
}

.dm-net-area {
  width: 100%;
  overflow-x: auto;
  margin-bottom: 12px;
}

.dm-net-area svg {
  display: block;
}

/* ═══════════════════════════════════════════════
   CONTRADICTION EXPLORER
   ═══════════════════════════════════════════════ */

.dm-contra-header, .dm-sector-header {
  margin-bottom: 20px;
}

.dm-contra-title {
  display: block;
  font-family: 'Space Mono', monospace;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 2px;
  color: #ef4444;
  margin-bottom: 4px;
}

.dm-sector-title {
  display: block;
  font-family: 'Space Mono', monospace;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 2px;
  color: #63636e;
  margin-bottom: 4px;
}

.dm-contra-sub, .dm-sector-sub {
  font-size: 13px;
  color: #a1a1aa;
}

.dm-contra-filters {
  display: flex;
  gap: 8px;
  margin-bottom: 20px;
}

.dm-contra-filter-btn {
  padding: 6px 16px;
  border: 1px solid #1e1e28;
  border-radius: 4px;
  background: #13131a;
  font-family: 'Space Mono', monospace;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 1px;
  cursor: pointer;
  transition: all 0.15s;
}

.dm-contra-filter-btn:hover {
  border-color: rgba(91, 141, 206, 0.3);
}

.dm-contra-filter-btn.active {
  border-color: currentColor;
  background: rgba(255, 255, 255, 0.03);
}

.dm-contra-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
  gap: 16px;
}

.dm-contra-card {
  background: #13131a;
  border: 1px solid #1e1e28;
  border-radius: 8px;
  padding: 20px;
  transition: border-color 0.2s;
}

.dm-contra-card:hover {
  border-color: rgba(239, 68, 68, 0.3);
}

.dm-contra-card-top {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 16px;
  flex-wrap: wrap;
}

.dm-contra-party {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  font-family: 'Space Mono', monospace;
  font-size: 11px;
  font-weight: 700;
  color: white;
  flex-shrink: 0;
}

.dm-contra-name {
  font-size: 16px;
  font-weight: 700;
  color: #e4e4e7;
}

.dm-contra-sector {
  font-family: 'Space Mono', monospace;
  font-size: 10px;
  color: #63636e;
  letter-spacing: 0.5px;
  margin-left: auto;
}

.dm-contra-says, .dm-contra-pays, .dm-contra-result {
  padding: 10px 12px;
  border-radius: 6px;
  margin-bottom: 8px;
}

.dm-contra-says {
  background: rgba(91, 141, 206, 0.06);
  border-left: 3px solid #5b8dce;
}

.dm-contra-pays {
  background: rgba(34, 197, 94, 0.06);
  border-left: 3px solid #22c55e;
}

.dm-contra-result {
  background: rgba(239, 68, 68, 0.06);
  border-left: 3px solid #ef4444;
}

.dm-contra-label {
  font-family: 'Space Mono', monospace;
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 2px;
  color: #63636e;
  margin-bottom: 4px;
}

.dm-contra-text {
  font-size: 13px;
  color: #b4b4bc;
  line-height: 1.5;
}

/* ═══════════════════════════════════════════════
   SECTOR SPENDING DASHBOARD
   ═══════════════════════════════════════════════ */

.dm-sector-card {
  background: #13131a;
  border: 1px solid #1e1e28;
  border-left: 3px solid;
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 12px;
  transition: border-color 0.2s;
}

.dm-sector-card:hover {
  border-right-color: rgba(91, 141, 206, 0.3);
}

.dm-sector-top {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin-bottom: 14px;
  flex-wrap: wrap;
  gap: 8px;
}

.dm-sector-name {
  font-size: 16px;
  font-weight: 700;
  color: #e4e4e7;
}

.dm-sector-org {
  font-family: 'Space Mono', monospace;
  font-size: 11px;
  color: #63636e;
}

.dm-sector-bars {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 14px;
}

.dm-sector-bar-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.dm-sector-bar-label {
  font-family: 'Space Mono', monospace;
  font-size: 9px;
  letter-spacing: 1.5px;
  color: #63636e;
  width: 60px;
  flex-shrink: 0;
}

.dm-sector-bar-track {
  flex: 1;
  height: 8px;
  background: #1a1a22;
  border-radius: 4px;
  overflow: hidden;
}

.dm-sector-bar-fill {
  height: 100%;
  border-radius: 4px;
  transition: width 0.8s ease;
}

.dm-sector-bar-val {
  font-family: 'Space Mono', monospace;
  font-size: 12px;
  font-weight: 700;
  color: #b4b4bc;
  width: 70px;
  text-align: right;
  flex-shrink: 0;
}

.dm-sector-bottom {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}

.dm-sector-policy {
  font-size: 12px;
  color: #a1a1aa;
}

.dm-sector-roi {
  font-family: 'Space Mono', monospace;
  font-size: 14px;
  font-weight: 700;
}

/* ═══════════════════════════════════════════════
   INLINE CONTRADICTION MARKER
   ═══════════════════════════════════════════════ */

.dm-contra-marker {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-family: 'Space Mono', monospace;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 2px;
  color: #ef4444;
  background: rgba(239, 68, 68, 0.08);
  border: 1px solid rgba(239, 68, 68, 0.2);
  border-radius: 4px;
  padding: 4px 12px;
  margin-bottom: 8px;
}

.dm-contra-marker-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #ef4444;
  animation: dm-contra-pulse 2s ease-in-out infinite;
}

@keyframes dm-contra-pulse {
  0%, 100% { opacity: 1; box-shadow: 0 0 4px rgba(239, 68, 68, 0.6); }
  50% { opacity: 0.3; box-shadow: 0 0 1px rgba(239, 68, 68, 0.2); }
}

/* ═══════════════════════════════════════════════
   PROFILE-EMBEDDED INTERACTIVE TOOLS
   ═══════════════════════════════════════════════ */

.dm-profile-tools {
  margin-top: 40px;
  background: #0e0e14;
  border: 1px solid #1e1e28;
  border-radius: 10px;
  overflow: hidden;
}

.dm-profile-tools-header {
  padding: 20px 24px 12px;
}

.dm-profile-tools-label {
  display: block;
  font-family: 'Space Mono', monospace;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 2px;
  color: #5b8dce;
  margin-bottom: 4px;
}

.dm-profile-tools-sub {
  font-size: 13px;
  color: #a1a1aa;
}

.dm-profile-svp {
  background: #13131a;
  border: 1px solid rgba(239, 68, 68, 0.25);
  border-left: 3px solid #ef4444;
  border-radius: 8px;
  padding: 20px;
  margin: 16px 0 24px;
}

.dm-profile-svp-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 16px;
}

.dm-profile-svp-title {
  font-family: 'Space Mono', monospace;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 2px;
  color: #ef4444;
}

/* ═══════════════════════════════════════════════
   POLICY COST COMPARISON
   ═══════════════════════════════════════════════ */

.dm-costs-header {
  margin-bottom: 20px;
}

.dm-costs-title {
  display: block;
  font-family: 'Space Mono', monospace;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 2px;
  color: #ef4444;
  margin-bottom: 4px;
}

.dm-costs-sub {
  font-size: 13px;
  color: #a1a1aa;
}

.dm-costs-toggle {
  display: flex;
  gap: 8px;
  margin-bottom: 20px;
}

.dm-costs-toggle-btn {
  padding: 6px 16px;
  border: 1px solid #1e1e28;
  border-radius: 4px;
  background: #13131a;
  color: #b4b4bc;
  font-family: 'Space Mono', monospace;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 1px;
  cursor: pointer;
  transition: all 0.15s;
}

.dm-costs-toggle-btn:hover {
  border-color: rgba(91, 141, 206, 0.3);
}

.dm-costs-toggle-btn.active {
  border-color: #5b8dce;
  color: #5b8dce;
  background: rgba(91, 141, 206, 0.08);
}

/* Side-by-side comparison cards */

.dm-costs-compare-card {
  background: #13131a;
  border: 1px solid #1e1e28;
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 16px;
  transition: border-color 0.2s;
}

.dm-costs-compare-card:hover {
  border-color: rgba(91, 141, 206, 0.3);
}

.dm-costs-compare-title {
  font-size: 15px;
  font-weight: 700;
  color: #e4e4e7;
  margin-bottom: 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.dm-costs-ratio {
  font-size: 11px;
  font-weight: 600;
  color: #f59e0b;
  background: rgba(245, 158, 11, 0.12);
  padding: 2px 8px;
  border-radius: 4px;
  white-space: nowrap;
}

.dm-costs-compare-bars {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 14px;
}

.dm-costs-compare-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.dm-costs-compare-label {
  font-size: 12px;
  color: #b4b4bc;
  width: 180px;
  flex-shrink: 0;
}

.dm-costs-compare-track {
  flex: 1;
  height: 14px;
  background: #1a1a22;
  border-radius: 4px;
  overflow: hidden;
}

.dm-costs-compare-fill {
  height: 100%;
  border-radius: 4px;
  transition: width 0.8s ease;
}

.dm-costs-compare-val {
  font-family: 'Space Mono', monospace;
  font-size: 13px;
  font-weight: 700;
  width: 60px;
  text-align: right;
  flex-shrink: 0;
}

.dm-costs-verdict {
  font-size: 13px;
  color: #e4e4e7;
  padding: 12px 14px;
  background: rgba(239, 68, 68, 0.06);
  border-left: 3px solid #ef4444;
  border-radius: 0 6px 6px 0;
  line-height: 1.5;
  font-weight: 500;
}

/* Full scale view */

.dm-costs-scale-card {
  background: #13131a;
  border: 1px solid #1e1e28;
  border-radius: 8px;
  padding: 16px 20px;
  margin-bottom: 8px;
  transition: border-color 0.2s;
}

.dm-costs-scale-card:hover {
  border-color: rgba(91, 141, 206, 0.3);
}

.dm-costs-scale-top {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 8px;
}

.dm-costs-scale-icon {
  font-size: 16px;
  flex-shrink: 0;
}

.dm-costs-scale-name {
  font-size: 14px;
  font-weight: 600;
  color: #e4e4e7;
  flex: 1;
}

.dm-costs-scale-amount {
  font-family: 'Space Mono', monospace;
  font-size: 14px;
  font-weight: 700;
  flex-shrink: 0;
}

.dm-costs-scale-bar-track {
  height: 8px;
  background: #1a1a22;
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 6px;
}

.dm-costs-scale-bar-fill {
  height: 100%;
  border-radius: 4px;
  transition: width 0.8s ease;
}

.dm-costs-scale-note {
  font-size: 12px;
  color: #63636e;
  line-height: 1.4;
}

/* ─── Mobile responsive for new interactives ── */

@media (max-width: 800px) {
  .dm-contra-grid {
    grid-template-columns: 1fr;
  }

  .dm-contra-sector {
    margin-left: 0;
  }

  .dm-sector-bar-val {
    width: 55px;
    font-size: 10px;
  }

  .dm-net-btn {
    padding: 6px 12px;
    font-size: 12px;
  }

  .dm-costs-compare-label {
    width: 120px;
    font-size: 11px;
  }

  .dm-costs-compare-val {
    width: 50px;
    font-size: 11px;
  }
}
`

export default (() => InteractiveGraphs) satisfies QuartzComponentConstructor
