import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"
import * as fs from "fs"
import * as path from "path"

interface Trade {
  politician: string
  chamber: string
  party: string
  state: string
  district: string
  ticker: string | null
  asset: string
  type: string // Purchase or Sale
  amount: { min: number; max: number; text: string }
  owner: string
  transactionDate: string
  filingDate: string
  filingDelay: number
  sourceUrl: string
}

const CapitolTrades: QuartzComponent = ({ fileData }: QuartzComponentProps) => {
  const slug = String(fileData.slug ?? "").toLowerCase()
  if (!slug.includes("interactive/capitol-trades")) return null

  // Read financial disclosures data at build time
  let trades: Trade[] = []
  try {
    const dataPath = path.join(process.cwd(), "data", "financial-disclosures.json")
    if (fs.existsSync(dataPath)) {
      const raw = JSON.parse(fs.readFileSync(dataPath, "utf-8"))
      for (const filing of raw.filings || []) {
        for (const tx of filing.transactions || []) {
          const filingDate = filing.filing?.date || ""
          const txDate = tx.transactionDate || ""
          let delay = 0
          if (filingDate && txDate) {
            const fd = new Date(filingDate)
            const td = new Date(txDate)
            if (!isNaN(fd.getTime()) && !isNaN(td.getTime())) {
              delay = Math.round((fd.getTime() - td.getTime()) / (1000 * 60 * 60 * 24))
            }
          }

          // Infer party from name matching (basic heuristic from vault data)
          // This will be enriched later with actual party data from profiles
          trades.push({
            politician: filing.filer?.name?.replace(/^Hon\.\s*/, "") || "Unknown",
            chamber: filing.chamber || "Unknown",
            party: "", // Will be filled client-side or via enrichment
            state: filing.filer?.state || "",
            district: filing.filer?.district || "",
            ticker: tx.ticker || null,
            asset: tx.assetDescription?.slice(0, 100) || "",
            type: tx.transactionType || "Unknown",
            amount: tx.amount || { min: 0, max: 0, text: "Unknown" },
            owner: tx.owner || "Self",
            transactionDate: txDate,
            filingDate: filingDate,
            filingDelay: Math.max(0, delay),
            sourceUrl: filing.filing?.sourceUrl || "",
          })
        }
      }
    }
  } catch (e) {
    // Data file not available yet
  }

  // Sort by transaction date descending
  trades.sort((a, b) => {
    const da = new Date(a.transactionDate)
    const db = new Date(b.transactionDate)
    return db.getTime() - da.getTime()
  })

  const dataJson = JSON.stringify(trades)

  return (
    <div class="ct-container">
      <div id="ct-data" data-trades={dataJson} style="display:none" />

      {/* Controls */}
      <div class="ct-controls">
        <input type="text" id="ct-search" class="ct-search" placeholder="Search politician or ticker..." />
        <div class="ct-filter-row">
          <select id="ct-chamber">
            <option value="">All Chambers</option>
            <option value="House">House</option>
            <option value="Senate">Senate</option>
          </select>
          <select id="ct-type">
            <option value="">All Types</option>
            <option value="Purchase">Buys</option>
            <option value="Sale">Sales</option>
          </select>
          <select id="ct-owner">
            <option value="">All Filers</option>
            <option value="Self">Self</option>
            <option value="Spouse">Spouse</option>
            <option value="Joint">Joint</option>
            <option value="Dependent Child">Child</option>
          </select>
        </div>
      </div>

      {/* Stats bar */}
      <div class="ct-stats" id="ct-stats"></div>

      {/* Tab toggle */}
      <div class="ct-tabs">
        <button class="ct-tab ct-tab-active" data-tab="table">RECENT TRADES</button>
        <button class="ct-tab" data-tab="flow">STOCK FLOW</button>
        <button class="ct-tab" data-tab="trail">MONEY TRAIL</button>
      </div>

      {/* Table view */}
      <div id="ct-table-view" class="ct-view">
        <table class="ct-table">
          <thead>
            <tr>
              <th class="ct-sortable" data-sort="politician">Politician</th>
              <th class="ct-sortable" data-sort="ticker">Ticker</th>
              <th class="ct-sortable" data-sort="type">Type</th>
              <th>Owner</th>
              <th class="ct-sortable" data-sort="date">Date</th>
              <th class="ct-sortable" data-sort="delay">Filed After</th>
              <th class="ct-sortable" data-sort="amount">Amount</th>
            </tr>
          </thead>
          <tbody id="ct-tbody"></tbody>
        </table>
        <div class="ct-pagination" id="ct-pagination"></div>
      </div>

      {/* Stock flow view */}
      <div id="ct-flow-view" class="ct-view" style="display:none">
        <div class="ct-flow-controls">
          <input type="text" id="ct-flow-ticker" class="ct-search" placeholder="Enter ticker (e.g. AAPL, TSLA, MSFT)..." />
        </div>
        <div id="ct-flow-chart" class="ct-flow-chart"></div>
        <div id="ct-flow-details" class="ct-flow-details"></div>
      </div>

      {/* Money Trail view */}
      <div id="ct-trail-view" class="ct-view" style="display:none">
        <div class="ct-trail-controls">
          <label class="ct-trail-label">Min trades per flow:</label>
          <input type="range" id="ct-trail-min" min="1" max="20" value="3" class="ct-trail-slider" />
          <span id="ct-trail-min-val" class="ct-trail-val">3</span>
        </div>
        <div class="ct-trail-legend">
          <span class="ct-flow-leg-buy">BUY FLOW</span>
          <span class="ct-flow-leg-sell">SELL FLOW</span>
          <span class="ct-trail-hint">Line thickness = trade volume</span>
        </div>
        <div id="ct-trail-graph" class="ct-trail-graph"></div>
      </div>

      {trades.length === 0 && (
        <div class="ct-empty">
          <p>No trading data available yet. Run the financial disclosures pipeline to populate.</p>
          <code>node scripts/financial-disclosures-pipeline.cjs</code>
        </div>
      )}
    </div>
  )
}

CapitolTrades.afterDOMLoaded = `
(function() {
  var container = document.querySelector('.ct-container');
  if (!container) return;
  var dataEl = document.getElementById('ct-data');
  if (!dataEl) return;

  var trades = [];
  try { trades = JSON.parse(dataEl.dataset.trades || '[]'); } catch(e) {}
  if (!trades.length) return;

  // ── State ──
  var PAGE_SIZE = 25;
  var currentPage = 0;
  var sortField = 'date';
  var sortDir = -1; // -1 = descending
  var filtered = trades.slice();

  // ── Formatting ──
  function fmtAmount(a) {
    if (!a || !a.text || a.text === 'Unknown') return '?';
    return a.text;
  }
  function fmtAmountShort(a) {
    if (!a) return '?';
    var max = a.max || a.min || 0;
    if (max >= 1000000) return '$' + (max/1000000).toFixed(0) + 'M';
    if (max >= 1000) return '$' + (max/1000).toFixed(0) + 'K';
    return '$' + max;
  }
  function fmtDate(d) {
    if (!d) return '';
    var parts = d.split('/');
    if (parts.length === 3) return parts[0] + '/' + parts[1] + '/' + parts[2];
    return d;
  }
  function chamberBadge(ch) {
    var c = ch === 'Senate' ? 'ct-senate' : 'ct-house';
    return '<span class="ct-badge ' + c + '">' + (ch === 'Senate' ? 'SEN' : 'HSE') + '</span>';
  }
  function typeBadge(t) {
    var cls = t === 'Purchase' ? 'ct-buy' : t === 'Sale' ? 'ct-sell' : 'ct-other';
    var label = t === 'Purchase' ? 'BUY' : t === 'Sale' ? 'SELL' : t.toUpperCase();
    return '<span class="ct-type-badge ' + cls + '">' + label + '</span>';
  }

  // ── Stats ──
  function updateStats() {
    var el = document.getElementById('ct-stats');
    if (!el) return;
    var buys = 0, sells = 0, total = filtered.length;
    for (var i = 0; i < filtered.length; i++) {
      if (filtered[i].type === 'Purchase') buys++;
      else if (filtered[i].type === 'Sale') sells++;
    }
    el.innerHTML =
      '<span class="ct-stat">' + total + ' trades</span>' +
      '<span class="ct-stat ct-stat-buy">' + buys + ' buys</span>' +
      '<span class="ct-stat ct-stat-sell">' + sells + ' sells</span>';
  }

  // ── Filter ──
  function applyFilters() {
    var search = (document.getElementById('ct-search').value || '').toLowerCase();
    var chamber = document.getElementById('ct-chamber').value;
    var type = document.getElementById('ct-type').value;
    var owner = document.getElementById('ct-owner').value;

    filtered = trades.filter(function(t) {
      if (chamber && t.chamber !== chamber) return false;
      if (type && t.type !== type) return false;
      if (owner && t.owner !== owner) return false;
      if (search) {
        var hay = (t.politician + ' ' + (t.ticker || '') + ' ' + t.asset + ' ' + t.state).toLowerCase();
        if (hay.indexOf(search) === -1) return false;
      }
      return true;
    });
    applySort();
    currentPage = 0;
    renderTable();
    updateStats();
  }

  // ── Sort ──
  function applySort() {
    filtered.sort(function(a, b) {
      var va, vb;
      switch (sortField) {
        case 'politician': va = a.politician; vb = b.politician; break;
        case 'ticker': va = a.ticker || 'zzz'; vb = b.ticker || 'zzz'; break;
        case 'type': va = a.type; vb = b.type; break;
        case 'date': va = new Date(a.transactionDate).getTime() || 0; vb = new Date(b.transactionDate).getTime() || 0; break;
        case 'delay': va = a.filingDelay; vb = b.filingDelay; break;
        case 'amount': va = a.amount ? a.amount.max || a.amount.min : 0; vb = b.amount ? b.amount.max || b.amount.min : 0; break;
        default: va = 0; vb = 0;
      }
      if (typeof va === 'string') {
        return sortDir * va.localeCompare(vb);
      }
      return sortDir * (va - vb);
    });
  }

  // ── Render table ──
  function renderTable() {
    var tbody = document.getElementById('ct-tbody');
    if (!tbody) return;
    var start = currentPage * PAGE_SIZE;
    var page = filtered.slice(start, start + PAGE_SIZE);

    var html = '';
    for (var i = 0; i < page.length; i++) {
      var t = page[i];
      html += '<tr class="ct-row">' +
        '<td class="ct-cell-politician">' +
          '<div class="ct-pol-name">' + t.politician + '</div>' +
          '<div class="ct-pol-meta">' + chamberBadge(t.chamber) + ' ' + t.state + (t.district ? '-' + t.district : '') + '</div>' +
        '</td>' +
        '<td class="ct-cell-ticker">' + (t.ticker ? '<span class="ct-ticker">' + t.ticker + '</span>' : '<span class="ct-ticker-na">N/A</span>') + '</td>' +
        '<td>' + typeBadge(t.type) + '</td>' +
        '<td class="ct-cell-owner">' + t.owner + '</td>' +
        '<td class="ct-cell-date">' + fmtDate(t.transactionDate) + '</td>' +
        '<td class="ct-cell-delay">' + (t.filingDelay > 0 ? t.filingDelay + ' days' : '-') + '</td>' +
        '<td class="ct-cell-amount">' + fmtAmountShort(t.amount) + '</td>' +
      '</tr>';
    }
    tbody.innerHTML = html;

    // Pagination
    var pag = document.getElementById('ct-pagination');
    if (!pag) return;
    var totalPages = Math.ceil(filtered.length / PAGE_SIZE);
    if (totalPages <= 1) { pag.innerHTML = ''; return; }
    var pagHtml = '<span class="ct-page-info">Page ' + (currentPage + 1) + ' of ' + totalPages + '</span>';
    if (currentPage > 0) pagHtml = '<button class="ct-page-btn" data-page="' + (currentPage - 1) + '">Previous</button>' + pagHtml;
    if (currentPage < totalPages - 1) pagHtml += '<button class="ct-page-btn" data-page="' + (currentPage + 1) + '">Next</button>';
    pag.innerHTML = pagHtml;
    pag.querySelectorAll('.ct-page-btn').forEach(function(btn) {
      btn.addEventListener('click', function() {
        currentPage = parseInt(this.dataset.page);
        renderTable();
        container.scrollIntoView({ behavior: 'smooth' });
      });
    });
  }

  // ── Stock flow chart ──
  function renderStockFlow(ticker) {
    var chart = document.getElementById('ct-flow-chart');
    var details = document.getElementById('ct-flow-details');
    if (!chart || !details) return;

    if (!ticker) {
      chart.innerHTML = '<div class="ct-flow-empty">Enter a ticker symbol above to see who is buying and selling</div>';
      details.innerHTML = '';
      return;
    }

    ticker = ticker.toUpperCase();
    var tickerTrades = trades.filter(function(t) { return t.ticker && t.ticker.toUpperCase() === ticker; });

    if (tickerTrades.length === 0) {
      chart.innerHTML = '<div class="ct-flow-empty">No trades found for ' + ticker + '</div>';
      details.innerHTML = '';
      return;
    }

    // Group by politician
    var byPol = {};
    for (var i = 0; i < tickerTrades.length; i++) {
      var t = tickerTrades[i];
      if (!byPol[t.politician]) byPol[t.politician] = { buys: 0, sells: 0, buyAmt: 0, sellAmt: 0, trades: [] };
      var p = byPol[t.politician];
      if (t.type === 'Purchase') { p.buys++; p.buyAmt += t.amount.max || t.amount.min || 0; }
      else if (t.type === 'Sale') { p.sells++; p.sellAmt += t.amount.max || t.amount.min || 0; }
      p.trades.push(t);
    }

    // Sort politicians by total volume
    var pols = Object.keys(byPol).sort(function(a, b) {
      var va = byPol[a].buyAmt + byPol[a].sellAmt;
      var vb = byPol[b].buyAmt + byPol[b].sellAmt;
      return vb - va;
    });

    // Find max for scaling
    var maxAmt = 0;
    for (var k = 0; k < pols.length; k++) {
      var e = byPol[pols[k]];
      maxAmt = Math.max(maxAmt, e.buyAmt, e.sellAmt);
    }

    // Render flow bars
    var totalBuys = 0, totalSells = 0;
    var html = '<div class="ct-flow-header">' +
      '<span class="ct-flow-ticker-label">' + ticker + '</span>' +
      '<span class="ct-flow-count">' + tickerTrades.length + ' trades by ' + pols.length + ' members</span>' +
    '</div>';

    html += '<div class="ct-flow-legend">' +
      '<span class="ct-flow-leg-buy">BUY</span>' +
      '<span class="ct-flow-leg-sell">SELL</span>' +
    '</div>';

    for (var j = 0; j < pols.length; j++) {
      var pol = pols[j];
      var entry = byPol[pol];
      var buyW = maxAmt > 0 ? (entry.buyAmt / maxAmt * 100) : 0;
      var sellW = maxAmt > 0 ? (entry.sellAmt / maxAmt * 100) : 0;
      totalBuys += entry.buyAmt;
      totalSells += entry.sellAmt;

      html += '<div class="ct-flow-row">' +
        '<div class="ct-flow-pol">' + pol + '</div>' +
        '<div class="ct-flow-bars">' +
          (buyW > 0 ? '<div class="ct-flow-bar ct-flow-bar-buy" style="width:' + Math.max(buyW, 3) + '%"><span>' + fmtK(entry.buyAmt) + '</span></div>' : '') +
          (sellW > 0 ? '<div class="ct-flow-bar ct-flow-bar-sell" style="width:' + Math.max(sellW, 3) + '%"><span>' + fmtK(entry.sellAmt) + '</span></div>' : '') +
        '</div>' +
      '</div>';
    }

    chart.innerHTML = html;

    // Summary
    details.innerHTML = '<div class="ct-flow-summary">' +
      '<div class="ct-flow-sum-item ct-flow-sum-buy"><div class="ct-flow-sum-label">Total Bought</div><div class="ct-flow-sum-val">' + fmtK(totalBuys) + '</div></div>' +
      '<div class="ct-flow-sum-item ct-flow-sum-sell"><div class="ct-flow-sum-label">Total Sold</div><div class="ct-flow-sum-val">' + fmtK(totalSells) + '</div></div>' +
      '<div class="ct-flow-sum-item"><div class="ct-flow-sum-label">Net Flow</div><div class="ct-flow-sum-val ' + (totalBuys > totalSells ? 'ct-green' : 'ct-red') + '">' + (totalBuys > totalSells ? '+' : '') + fmtK(totalBuys - totalSells) + '</div></div>' +
    '</div>';
  }

  function fmtK(n) {
    if (Math.abs(n) >= 1000000) return '$' + (n/1000000).toFixed(1) + 'M';
    if (Math.abs(n) >= 1000) return '$' + (n/1000).toFixed(0) + 'K';
    return '$' + n;
  }

  // ── Event listeners ──
  document.getElementById('ct-search').addEventListener('input', applyFilters);
  document.getElementById('ct-chamber').addEventListener('change', applyFilters);
  document.getElementById('ct-type').addEventListener('change', applyFilters);
  document.getElementById('ct-owner').addEventListener('change', applyFilters);

  // Sort headers
  document.querySelectorAll('.ct-sortable').forEach(function(th) {
    th.addEventListener('click', function() {
      var field = this.dataset.sort;
      if (sortField === field) sortDir *= -1;
      else { sortField = field; sortDir = -1; }
      document.querySelectorAll('.ct-sortable').forEach(function(h) { h.classList.remove('ct-sort-asc', 'ct-sort-desc'); });
      this.classList.add(sortDir === 1 ? 'ct-sort-asc' : 'ct-sort-desc');
      applySort();
      currentPage = 0;
      renderTable();
    });
  });

  // Tab switching
  document.querySelectorAll('.ct-tab').forEach(function(tab) {
    tab.addEventListener('click', function() {
      document.querySelectorAll('.ct-tab').forEach(function(t) { t.classList.remove('ct-tab-active'); });
      this.classList.add('ct-tab-active');
      var target = this.dataset.tab;
      document.getElementById('ct-table-view').style.display = target === 'table' ? '' : 'none';
      document.getElementById('ct-flow-view').style.display = target === 'flow' ? '' : 'none';
      document.getElementById('ct-trail-view').style.display = target === 'trail' ? '' : 'none';
      if (target === 'trail') renderMoneyTrail(parseInt(document.getElementById('ct-trail-min').value || '3'));
    });
  });

  // Money trail slider
  var trailSlider = document.getElementById('ct-trail-min');
  if (trailSlider) {
    trailSlider.addEventListener('input', function() {
      document.getElementById('ct-trail-min-val').textContent = this.value;
      renderMoneyTrail(parseInt(this.value));
    });
  }

  // ── Money Trail SVG renderer ──
  function renderMoneyTrail(minTrades) {
    var graph = document.getElementById('ct-trail-graph');
    if (!graph) return;

    // Aggregate flows: politician → ticker
    var flows = {};
    for (var i = 0; i < trades.length; i++) {
      var t = trades[i];
      if (!t.ticker) continue;
      var key = t.politician + '|' + t.ticker;
      if (!flows[key]) flows[key] = { pol: t.politician, ticker: t.ticker, buyAmt: 0, sellAmt: 0, buys: 0, sells: 0 };
      var f = flows[key];
      if (t.type === 'Purchase') { f.buyAmt += t.amount.max || t.amount.min || 0; f.buys++; }
      else if (t.type === 'Sale') { f.sellAmt += t.amount.max || t.amount.min || 0; f.sells++; }
    }

    // Filter
    var allFlows = Object.values(flows).filter(function(f) { return (f.buys + f.sells) >= minTrades; });
    if (allFlows.length === 0) {
      graph.innerHTML = '<div class="ct-flow-empty">No flows with ' + minTrades + '+ trades. Try lowering the minimum.</div>';
      return;
    }

    // Get unique pols/tickers sorted by volume
    var polVol = {}, tickerVol = {};
    for (var j = 0; j < allFlows.length; j++) {
      var fl = allFlows[j];
      polVol[fl.pol] = (polVol[fl.pol] || 0) + fl.buyAmt + fl.sellAmt;
      tickerVol[fl.ticker] = (tickerVol[fl.ticker] || 0) + fl.buyAmt + fl.sellAmt;
    }
    var pols = Object.keys(polVol).sort(function(a,b) { return polVol[b] - polVol[a]; });
    var tickers = Object.keys(tickerVol).sort(function(a,b) { return tickerVol[b] - tickerVol[a]; });

    var W = 860, LEFT_X = 170, RIGHT_X = W - 90, NODE_W = 6;
    var H = Math.max(pols.length * 26 + 40, tickers.length * 22 + 40, 300);

    var polY = {}, tickerY = {};
    var pSpacing = H / (pols.length + 1);
    for (var pi = 0; pi < pols.length; pi++) polY[pols[pi]] = pSpacing * (pi + 1);
    var tSpacing = H / (tickers.length + 1);
    for (var ti = 0; ti < tickers.length; ti++) tickerY[tickers[ti]] = tSpacing * (ti + 1);

    var maxVol = 1;
    for (var mi = 0; mi < allFlows.length; mi++) maxVol = Math.max(maxVol, allFlows[mi].buyAmt + allFlows[mi].sellAmt);

    var svg = '<svg width="' + W + '" height="' + (H + 10) + '" xmlns="http://www.w3.org/2000/svg">';

    // Flow lines
    for (var fi = 0; fi < allFlows.length; fi++) {
      var fl2 = allFlows[fi];
      var y1 = polY[fl2.pol], y2 = tickerY[fl2.ticker];
      var cx = (LEFT_X + RIGHT_X) / 2;
      if (fl2.buyAmt > 0) {
        var bw = Math.max(0.5, (fl2.buyAmt / maxVol) * 10);
        svg += '<path d="M' + (LEFT_X+NODE_W) + ',' + y1 + ' C' + cx + ',' + y1 + ' ' + cx + ',' + (y2-2) + ' ' + RIGHT_X + ',' + (y2-2) + '" fill="none" stroke="#16a34a" stroke-width="' + bw + '" opacity="0.3"/>';
      }
      if (fl2.sellAmt > 0) {
        var sw = Math.max(0.5, (fl2.sellAmt / maxVol) * 10);
        svg += '<path d="M' + (LEFT_X+NODE_W) + ',' + y1 + ' C' + cx + ',' + y1 + ' ' + cx + ',' + (y2+2) + ' ' + RIGHT_X + ',' + (y2+2) + '" fill="none" stroke="#e63946" stroke-width="' + sw + '" opacity="0.3"/>';
      }
    }

    // Politician nodes
    for (var pn = 0; pn < pols.length; pn++) {
      var py = polY[pols[pn]];
      var pName = pols[pn].length > 22 ? pols[pn].slice(0,20) + '...' : pols[pn];
      svg += '<rect x="' + LEFT_X + '" y="' + (py-7) + '" width="' + NODE_W + '" height="14" fill="#888"/>';
      svg += '<text x="' + (LEFT_X-6) + '" y="' + (py+3) + '" text-anchor="end" font-size="10" fill="#666" font-family="Space Mono,monospace">' + pName + '</text>';
    }

    // Ticker nodes
    for (var tn = 0; tn < tickers.length; tn++) {
      var ty = tickerY[tickers[tn]];
      svg += '<rect x="' + RIGHT_X + '" y="' + (ty-7) + '" width="' + NODE_W + '" height="14" fill="#888"/>';
      svg += '<text x="' + (RIGHT_X+NODE_W+6) + '" y="' + (ty+4) + '" font-size="11" fill="#0a0a0a" font-weight="700" font-family="Space Mono,monospace">' + tickers[tn] + '</text>';
    }

    svg += '</svg>';

    // Info line
    svg += '<div class="ct-trail-info">' + pols.length + ' politicians → ' + tickers.length + ' stocks · ' + allFlows.length + ' flows</div>';
    graph.innerHTML = svg;
  }

  // Stock flow ticker input
  var flowInput = document.getElementById('ct-flow-ticker');
  if (flowInput) {
    var debounce;
    flowInput.addEventListener('input', function() {
      clearTimeout(debounce);
      var val = this.value.trim();
      debounce = setTimeout(function() { renderStockFlow(val); }, 300);
    });
  }

  // Initial render
  applyFilters();
  renderStockFlow('');
})();
`

CapitolTrades.css = `
.ct-container {
  max-width: 1000px;
  margin: 0 auto;
  font-family: 'Inter', sans-serif;
}

.ct-controls {
  margin-bottom: 16px;
}

.ct-search {
  width: 100%;
  padding: 10px 14px;
  border: 2px solid #0a0a0a;
  background: #fff;
  font-family: 'Space Mono', monospace;
  font-size: 13px;
  margin-bottom: 8px;
}
.ct-search:focus { outline: none; border-color: #fbbf24; }

.ct-filter-row {
  display: flex;
  gap: 8px;
}
.ct-filter-row select {
  flex: 1;
  padding: 8px 10px;
  border: 2px solid #0a0a0a;
  background: #fff;
  font-family: 'Space Mono', monospace;
  font-size: 12px;
  cursor: pointer;
}

/* Stats */
.ct-stats {
  display: flex;
  gap: 16px;
  margin-bottom: 16px;
  font-family: 'Space Mono', monospace;
  font-size: 13px;
}
.ct-stat { color: #666; }
.ct-stat-buy { color: #16a34a; }
.ct-stat-sell { color: #e63946; }

/* Tabs */
.ct-tabs {
  display: flex;
  border-bottom: 2px solid #0a0a0a;
  margin-bottom: 0;
}
.ct-tab {
  padding: 10px 24px;
  border: none;
  background: none;
  font-family: 'Space Mono', monospace;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.05em;
  cursor: pointer;
  color: #999;
  border-bottom: 3px solid transparent;
  margin-bottom: -2px;
}
.ct-tab:hover { color: #0a0a0a; }
.ct-tab-active {
  color: #0a0a0a;
  border-bottom-color: #fbbf24;
}

/* Table */
.ct-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}
.ct-table thead {
  border-bottom: 2px solid #0a0a0a;
}
.ct-table th {
  padding: 12px 8px;
  text-align: left;
  font-family: 'Space Mono', monospace;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: #666;
  white-space: nowrap;
}
.ct-sortable { cursor: pointer; }
.ct-sortable:hover { color: #0a0a0a; }
.ct-sort-asc::after { content: ' \\25B2'; font-size: 9px; }
.ct-sort-desc::after { content: ' \\25BC'; font-size: 9px; }

.ct-row {
  border-bottom: 1px solid #e5e0da;
}
.ct-row:hover {
  background: rgba(251, 191, 36, 0.06);
}
.ct-row td {
  padding: 10px 8px;
  vertical-align: middle;
}

.ct-cell-politician { min-width: 160px; }
.ct-pol-name {
  font-weight: 600;
  font-size: 13px;
  color: #0a0a0a;
}
.ct-pol-meta {
  font-size: 11px;
  color: #888;
  margin-top: 2px;
  display: flex;
  align-items: center;
  gap: 4px;
}

.ct-badge {
  display: inline-block;
  padding: 1px 5px;
  font-family: 'Space Mono', monospace;
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.05em;
}
.ct-house { background: #1d4ed8; color: #fff; }
.ct-senate { background: #0a0a0a; color: #fff; }

.ct-ticker {
  font-family: 'Space Mono', monospace;
  font-weight: 700;
  font-size: 13px;
  color: #0a0a0a;
}
.ct-ticker-na {
  font-family: 'Space Mono', monospace;
  font-size: 11px;
  color: #bbb;
}

.ct-type-badge {
  display: inline-block;
  padding: 3px 8px;
  font-family: 'Space Mono', monospace;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.05em;
}
.ct-buy { background: rgba(22, 163, 74, 0.12); color: #16a34a; }
.ct-sell { background: rgba(230, 57, 70, 0.12); color: #e63946; }
.ct-other { background: rgba(0,0,0,0.06); color: #666; }

.ct-cell-date, .ct-cell-delay, .ct-cell-amount, .ct-cell-owner {
  font-family: 'Space Mono', monospace;
  font-size: 12px;
  color: #555;
  white-space: nowrap;
}
.ct-cell-amount { font-weight: 600; color: #0a0a0a; }

/* Pagination */
.ct-pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 16px 0;
  font-family: 'Space Mono', monospace;
  font-size: 12px;
}
.ct-page-btn {
  padding: 6px 16px;
  border: 2px solid #0a0a0a;
  background: none;
  font-family: 'Space Mono', monospace;
  font-size: 11px;
  font-weight: 700;
  cursor: pointer;
}
.ct-page-btn:hover { background: #fbbf24; }
.ct-page-info { color: #888; }

/* ── Stock Flow ── */
.ct-flow-chart { margin-top: 16px; }
.ct-flow-empty {
  text-align: center;
  padding: 60px 20px;
  color: #999;
  font-family: 'Space Mono', monospace;
  font-size: 13px;
}

.ct-flow-header {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin-bottom: 16px;
  padding-bottom: 8px;
  border-bottom: 2px solid #0a0a0a;
}
.ct-flow-ticker-label {
  font-family: 'Space Mono', monospace;
  font-size: 24px;
  font-weight: 700;
}
.ct-flow-count {
  font-family: 'Space Mono', monospace;
  font-size: 12px;
  color: #888;
}

.ct-flow-legend {
  display: flex;
  gap: 16px;
  margin-bottom: 12px;
  font-family: 'Space Mono', monospace;
  font-size: 11px;
  font-weight: 700;
}
.ct-flow-leg-buy { color: #16a34a; }
.ct-flow-leg-buy::before { content: '\\25A0 '; }
.ct-flow-leg-sell { color: #e63946; }
.ct-flow-leg-sell::before { content: '\\25A0 '; }

.ct-flow-row {
  display: flex;
  align-items: center;
  margin-bottom: 6px;
  gap: 12px;
}
.ct-flow-pol {
  width: 180px;
  min-width: 180px;
  font-size: 12px;
  font-weight: 600;
  text-align: right;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.ct-flow-bars {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.ct-flow-bar {
  height: 22px;
  display: flex;
  align-items: center;
  padding: 0 8px;
  font-family: 'Space Mono', monospace;
  font-size: 10px;
  font-weight: 700;
  color: #fff;
  min-width: 40px;
}
.ct-flow-bar span { white-space: nowrap; }
.ct-flow-bar-buy { background: #16a34a; }
.ct-flow-bar-sell { background: #e63946; }

.ct-flow-summary {
  display: flex;
  gap: 24px;
  margin-top: 24px;
  padding-top: 16px;
  border-top: 2px solid #0a0a0a;
}
.ct-flow-sum-item { flex: 1; }
.ct-flow-sum-label {
  font-family: 'Space Mono', monospace;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: #888;
  margin-bottom: 4px;
}
.ct-flow-sum-val {
  font-family: 'Space Mono', monospace;
  font-size: 20px;
  font-weight: 700;
}
.ct-flow-sum-buy .ct-flow-sum-val { color: #16a34a; }
.ct-flow-sum-sell .ct-flow-sum-val { color: #e63946; }
.ct-green { color: #16a34a; }
.ct-red { color: #e63946; }

/* ── Money Trail ── */
.ct-trail-controls {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}
.ct-trail-label {
  font-family: 'Space Mono', monospace;
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #888;
}
.ct-trail-slider { width: 120px; }
.ct-trail-val {
  font-family: 'Space Mono', monospace;
  font-size: 13px;
  font-weight: 700;
}
.ct-trail-hint {
  font-family: 'Space Mono', monospace;
  font-size: 10px;
  color: #aaa;
  margin-left: 8px;
}
.ct-trail-graph {
  border: 2px solid #0a0a0a;
  background: #fff;
  overflow-x: auto;
  padding: 8px 0;
}
.ct-trail-graph svg { display: block; }
.ct-trail-info {
  font-family: 'Space Mono', monospace;
  font-size: 10px;
  color: #888;
  text-align: right;
  padding: 8px 12px 0;
}

/* Empty state */
.ct-empty {
  text-align: center;
  padding: 40px;
  color: #999;
  font-family: 'Space Mono', monospace;
}
.ct-empty code {
  display: block;
  margin-top: 8px;
  padding: 8px;
  background: #0a0a0a;
  color: #fbbf24;
  font-size: 12px;
}

/* Responsive */
@media (max-width: 768px) {
  .ct-filter-row { flex-wrap: wrap; }
  .ct-filter-row select { min-width: 120px; }
  .ct-flow-pol { width: 100px; min-width: 100px; font-size: 11px; }
  .ct-flow-summary { flex-direction: column; gap: 12px; }
  .ct-table { font-size: 12px; }
  .ct-cell-owner { display: none; }
}
`

export default (() => CapitolTrades) satisfies QuartzComponentConstructor
