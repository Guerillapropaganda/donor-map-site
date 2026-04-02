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

  return null
}

InteractiveGraphs.afterDOMLoaded = `
// ═══════════════════════════════════════════════
// THE DONOR MAP — Interactive Visualizations
// D3.js loaded from CDN, only on interactive pages
// ═══════════════════════════════════════════════

const DM_COLORS = {
  purple: '#818cf8',
  purpleLight: '#a5b4fc',
  purpleDim: 'rgba(99, 102, 241, 0.15)',
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
    // AIPAC flows
    { from: 'aipac', to: 'pelosi', amount: 3200000, toPol: true },
    { from: 'aipac', to: 'schumer', amount: 4100000, toPol: true },
    { from: 'aipac', to: 'mcconnell', amount: 2800000, toPol: true },
    { from: 'aipac', to: 'cruz', amount: 1900000, toPol: true },
    { from: 'aipac', to: 'rubio', amount: 2400000, toPol: true },
    { from: 'aipac', to: 'menendez', amount: 2100000, toPol: true },
    { from: 'pelosi', to: 'israel_aid', amount: 1, toPol: false },
    { from: 'schumer', to: 'israel_aid', amount: 1, toPol: false },
    { from: 'mcconnell', to: 'israel_aid', amount: 1, toPol: false },
    { from: 'rubio', to: 'israel_aid', amount: 1, toPol: false },
    { from: 'menendez', to: 'israel_aid', amount: 1, toPol: false },
    // Goldman flows
    { from: 'goldman', to: 'pelosi', amount: 2100000, toPol: true },
    { from: 'goldman', to: 'schumer', amount: 1800000, toPol: true },
    { from: 'goldman', to: 'mcconnell', amount: 1500000, toPol: true },
    { from: 'goldman', to: 'cruz', amount: 1200000, toPol: true },
    { from: 'pelosi', to: 'carried_interest', amount: 1, toPol: false },
    { from: 'schumer', to: 'carried_interest', amount: 1, toPol: false },
    { from: 'cruz', to: 'tax_cuts', amount: 1, toPol: false },
    { from: 'mcconnell', to: 'tax_cuts', amount: 1, toPol: false },
    // Lockheed flows
    { from: 'lockheed', to: 'graham', amount: 1800000, toPol: true },
    { from: 'lockheed', to: 'cruz', amount: 1400000, toPol: true },
    { from: 'lockheed', to: 'mcconnell', amount: 1100000, toPol: true },
    { from: 'lockheed', to: 'pelosi', amount: 900000, toPol: true },
    { from: 'graham', to: 'defense_budget', amount: 1, toPol: false },
    { from: 'cruz', to: 'defense_budget', amount: 1, toPol: false },
    { from: 'mcconnell', to: 'defense_budget', amount: 1, toPol: false },
    // Koch flows
    { from: 'koch', to: 'cruz', amount: 3800000, toPol: true },
    { from: 'koch', to: 'mcconnell', amount: 2900000, toPol: true },
    { from: 'koch', to: 'graham', amount: 1800000, toPol: true },
    { from: 'koch', to: 'trump', amount: 2100000, toPol: true },
    { from: 'cruz', to: 'tax_cuts', amount: 1, toPol: false },
    { from: 'trump', to: 'tax_cuts', amount: 1, toPol: false },
    // PhRMA flows
    { from: 'pharma', to: 'menendez', amount: 1600000, toPol: true },
    { from: 'pharma', to: 'pelosi', amount: 1900000, toPol: true },
    { from: 'pharma', to: 'mcconnell', amount: 2100000, toPol: true },
    { from: 'pharma', to: 'cruz', amount: 1300000, toPol: true },
    { from: 'menendez', to: 'drug_pricing', amount: 1, toPol: false },
    { from: 'mcconnell', to: 'drug_pricing', amount: 1, toPol: false },
    // Fanjul flows
    { from: 'fanjul', to: 'rubio', amount: 1200000, toPol: true },
    { from: 'fanjul', to: 'trump', amount: 950000, toPol: true },
    { from: 'fanjul', to: 'menendez', amount: 400000, toPol: true },
    { from: 'rubio', to: 'cuba_sanctions', amount: 1, toPol: false },
    { from: 'trump', to: 'cuba_sanctions', amount: 1, toPol: false },
    // NRA flows
    { from: 'nra', to: 'cruz', amount: 1800000, toPol: true },
    { from: 'nra', to: 'graham', amount: 1200000, toPol: true },
    { from: 'nra', to: 'mcconnell', amount: 1100000, toPol: true },
    { from: 'nra', to: 'trump', amount: 1500000, toPol: true },
    { from: 'cruz', to: 'gun_reform_blocked', amount: 1, toPol: false },
    { from: 'graham', to: 'gun_reform_blocked', amount: 1, toPol: false },
    { from: 'trump', to: 'gun_reform_blocked', amount: 1, toPol: false },
    // Realtors flows
    { from: 'realtors', to: 'pelosi', amount: 1800000, toPol: true },
    { from: 'realtors', to: 'schumer', amount: 1600000, toPol: true },
    { from: 'realtors', to: 'mcconnell', amount: 1400000, toPol: true },
    { from: 'realtors', to: 'trump', amount: 1200000, toPol: true },
    { from: 'pelosi', to: 'housing_deregulation', amount: 1, toPol: false },
    { from: 'schumer', to: 'housing_deregulation', amount: 1, toPol: false },
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

      var opacity = highlighted ? (isHighlighted ? 0.6 : 0.04) : 0.2;
      var strokeW = f.toPol ? Math.max(1.5, Math.min(6, f.amount / 1000000)) : 1.5;

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
      drawNode(n, DM_COLORS.purple, n.name, fmt(n.total));
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
}

initInteractive();
document.addEventListener('nav', function() {
  setTimeout(initInteractive, 100);
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
  border-color: rgba(99, 102, 241, 0.3);
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
  color: #818cf8;
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
  background: #818cf8;
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
  border-color: rgba(99, 102, 241, 0.3);
}

.dm-bs-donor-header {
  margin-bottom: 16px;
}

.dm-bs-donor-name {
  font-size: 18px;
  font-weight: 700;
  color: #818cf8;
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
  background: rgba(99, 102, 241, 0.04);
}

.dm-hp-tab-active {
  color: #818cf8 !important;
  border-bottom-color: #818cf8 !important;
  background: rgba(99, 102, 241, 0.06) !important;
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
`

export default (() => InteractiveGraphs) satisfies QuartzComponentConstructor
