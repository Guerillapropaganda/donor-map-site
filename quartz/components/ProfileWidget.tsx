import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"
import { classNames } from "../util/lang"

// ─── Per-politician curated data ─────────────
// Keyed by the politician ID that appears in their master profile slug
// e.g. slug "politicians/democrats/house/nancy-pelosi/_nancy-pelosi-master-profile"
// → we match on "pelosi"

interface DonorFlow {
  donor: string
  amount: number
  sector: string
}

interface ROIEntry {
  donor: string
  donated: number
  policyValue: number
  policy: string
  roi: number | null
}

interface BothSidesEntry {
  donor: string
  alsoFunds: { name: string; party: string; amount: number }[]
  policy: string
}

interface PoliticianData {
  name: string
  party: "D" | "R"
  donors: DonorFlow[]
  roi: ROIEntry[]
  bothSides: BothSidesEntry[]
}

const POLITICIAN_DATA: Record<string, PoliticianData> = {
  pelosi: {
    name: "Nancy Pelosi",
    party: "D",
    donors: [
      { donor: "AIPAC", amount: 3200000, sector: "Israel Lobby" },
      { donor: "Goldman Sachs", amount: 2100000, sector: "Wall Street" },
      { donor: "PhRMA", amount: 1900000, sector: "Pharma" },
      { donor: "Natl Assn of Realtors", amount: 1800000, sector: "Real Estate" },
      { donor: "Lockheed Martin", amount: 900000, sector: "Defense" },
    ],
    roi: [
      { donor: "Goldman Sachs", donated: 2100000, policyValue: 18000000000, policy: "Carried Interest Loophole Preserved", roi: 8571 },
      { donor: "AIPAC", donated: 3200000, policyValue: 3800000000, policy: "Israel Aid Package ($3.8B/yr)", roi: 1188 },
      { donor: "Natl Assn of Realtors", donated: 1800000, policyValue: 12000000000, policy: "Housing Deregulation", roi: 6667 },
    ],
    bothSides: [
      { donor: "AIPAC", alsoFunds: [{ name: "McConnell", party: "R", amount: 2800000 }, { name: "Cruz", party: "R", amount: 1900000 }, { name: "Rubio", party: "R", amount: 2400000 }], policy: "Israel Aid — bipartisan 97-3" },
      { donor: "Goldman Sachs", alsoFunds: [{ name: "McConnell", party: "R", amount: 1500000 }, { name: "Cruz", party: "R", amount: 1200000 }], policy: "Carried Interest survived 30+ yrs" },
      { donor: "Lockheed Martin", alsoFunds: [{ name: "Graham", party: "R", amount: 1800000 }, { name: "Cruz", party: "R", amount: 1400000 }], policy: "Defense budget $886B" },
    ],
  },
  mcconnell: {
    name: "Mitch McConnell",
    party: "R",
    donors: [
      { donor: "Koch Network", amount: 2900000, sector: "Energy/Dark Money" },
      { donor: "AIPAC", amount: 2800000, sector: "Israel Lobby" },
      { donor: "PhRMA", amount: 2100000, sector: "Pharma" },
      { donor: "Goldman Sachs", amount: 1500000, sector: "Wall Street" },
      { donor: "Natl Assn of Realtors", amount: 1400000, sector: "Real Estate" },
      { donor: "Lockheed Martin", amount: 1100000, sector: "Defense" },
      { donor: "NRA", amount: 1100000, sector: "Guns" },
    ],
    roi: [
      { donor: "PhRMA", donated: 2100000, policyValue: 450000000000, policy: "Drug Pricing Negotiation Killed", roi: 214286 },
      { donor: "Koch Network", donated: 2900000, policyValue: 1900000000000, policy: "2017 Tax Cuts ($1.9T)", roi: 655172 },
      { donor: "AIPAC", donated: 2800000, policyValue: 3800000000, policy: "Israel Aid Package ($3.8B/yr)", roi: 1357 },
    ],
    bothSides: [
      { donor: "AIPAC", alsoFunds: [{ name: "Pelosi", party: "D", amount: 3200000 }, { name: "Schumer", party: "D", amount: 4100000 }], policy: "Israel Aid — bipartisan 97-3" },
      { donor: "Goldman Sachs", alsoFunds: [{ name: "Pelosi", party: "D", amount: 2100000 }, { name: "Schumer", party: "D", amount: 1800000 }], policy: "Carried Interest survived 30+ yrs" },
      { donor: "PhRMA", alsoFunds: [{ name: "Pelosi", party: "D", amount: 1900000 }, { name: "Menendez", party: "D", amount: 1600000 }], policy: "Drug pricing killed from both sides" },
    ],
  },
  cruz: {
    name: "Ted Cruz",
    party: "R",
    donors: [
      { donor: "Koch Network", amount: 3800000, sector: "Energy/Dark Money" },
      { donor: "AIPAC", amount: 1900000, sector: "Israel Lobby" },
      { donor: "NRA", amount: 1800000, sector: "Guns" },
      { donor: "Lockheed Martin", amount: 1400000, sector: "Defense" },
      { donor: "PhRMA", amount: 1300000, sector: "Pharma" },
      { donor: "Goldman Sachs", amount: 1200000, sector: "Wall Street" },
    ],
    roi: [
      { donor: "Koch Network", donated: 3800000, policyValue: 1900000000000, policy: "2017 Tax Cuts ($1.9T)", roi: 50000 },
      { donor: "NRA", donated: 1800000, policyValue: 0, policy: "Gun Reform Legislation Blocked", roi: null },
      { donor: "Lockheed Martin", donated: 1400000, policyValue: 886000000000, policy: "Defense Budget Increase to $886B", roi: 632857 },
    ],
    bothSides: [
      { donor: "AIPAC", alsoFunds: [{ name: "Schumer", party: "D", amount: 4100000 }, { name: "Pelosi", party: "D", amount: 3200000 }], policy: "Israel Aid — bipartisan 97-3" },
      { donor: "Goldman Sachs", alsoFunds: [{ name: "Pelosi", party: "D", amount: 2100000 }, { name: "Schumer", party: "D", amount: 1800000 }], policy: "Carried Interest survived 30+ yrs" },
      { donor: "PhRMA", alsoFunds: [{ name: "Pelosi", party: "D", amount: 1900000 }, { name: "Menendez", party: "D", amount: 1600000 }], policy: "Drug pricing killed from both sides" },
    ],
  },
  schumer: {
    name: "Chuck Schumer",
    party: "D",
    donors: [
      { donor: "AIPAC", amount: 4100000, sector: "Israel Lobby" },
      { donor: "Goldman Sachs", amount: 1800000, sector: "Wall Street" },
      { donor: "Natl Assn of Realtors", amount: 1600000, sector: "Real Estate" },
    ],
    roi: [
      { donor: "AIPAC", donated: 4100000, policyValue: 3800000000, policy: "Israel Aid Package ($3.8B/yr)", roi: 927 },
      { donor: "Goldman Sachs", donated: 1800000, policyValue: 18000000000, policy: "Carried Interest Loophole Preserved", roi: 10000 },
      { donor: "Natl Assn of Realtors", donated: 1600000, policyValue: 12000000000, policy: "Housing Deregulation", roi: 7500 },
    ],
    bothSides: [
      { donor: "AIPAC", alsoFunds: [{ name: "McConnell", party: "R", amount: 2800000 }, { name: "Cruz", party: "R", amount: 1900000 }], policy: "Israel Aid — bipartisan 97-3" },
      { donor: "Goldman Sachs", alsoFunds: [{ name: "McConnell", party: "R", amount: 1500000 }, { name: "Cruz", party: "R", amount: 1200000 }], policy: "Carried Interest survived 30+ yrs" },
      { donor: "Natl Assn of Realtors", alsoFunds: [{ name: "McConnell", party: "R", amount: 1400000 }, { name: "Trump", party: "R", amount: 1200000 }], policy: "Housing deregulation — bipartisan" },
    ],
  },
  trump: {
    name: "Donald Trump",
    party: "R",
    donors: [
      { donor: "Koch Network", amount: 2100000, sector: "Energy/Dark Money" },
      { donor: "NRA", amount: 1500000, sector: "Guns" },
      { donor: "Natl Assn of Realtors", amount: 1200000, sector: "Real Estate" },
      { donor: "Fanjul Family", amount: 950000, sector: "Agriculture" },
    ],
    roi: [
      { donor: "Koch Network", donated: 2100000, policyValue: 1900000000000, policy: "2017 Tax Cuts ($1.9T)", roi: 904762 },
      { donor: "Fanjul Family", donated: 950000, policyValue: 1500000000, policy: "Cuba Sanctions / Sugar Tariffs", roi: 1579 },
      { donor: "NRA", donated: 1500000, policyValue: 0, policy: "Gun Reform Blocked", roi: null },
    ],
    bothSides: [
      { donor: "Fanjul Family", alsoFunds: [{ name: "Menendez", party: "D", amount: 400000 }], policy: "Cuba sanctions — cross-party" },
      { donor: "Natl Assn of Realtors", alsoFunds: [{ name: "Pelosi", party: "D", amount: 1800000 }, { name: "Schumer", party: "D", amount: 1600000 }], policy: "Housing deregulation — bipartisan" },
    ],
  },
}

// Detect politician from slug
function getPoliticianKey(slug: string): string | null {
  const lower = slug.toLowerCase()
  // Match master profile pages: slug ends with _[name]-master-profile
  if (!lower.includes("master-profile")) return null
  for (const key of Object.keys(POLITICIAN_DATA)) {
    if (lower.includes(key)) return key
  }
  return null
}

const ProfileWidget: QuartzComponent = ({
  fileData,
  displayClass,
}: QuartzComponentProps) => {
  const slug = String(fileData.slug ?? "")
  const polKey = getPoliticianKey(slug)

  // Only render on politician master profile pages with data
  if (!polKey) return null
  const pol = POLITICIAN_DATA[polKey]

  return (
    <div class={classNames(displayClass, "pw-widget")} data-politician={polKey}>
      {/* Tabs */}
      <div class="pw-tabs">
        <button class="pw-tab pw-tab-active" data-tab="flow">Flow</button>
        <button class="pw-tab" data-tab="roi">ROI</button>
        <button class="pw-tab" data-tab="both">Both Sides</button>
      </div>

      {/* Tab: Flow */}
      <div class="pw-panel pw-panel-active" data-panel="flow">
        <div class="pw-section-label">TOP DONORS</div>
        {pol.donors.map((d) => (
          <div class="pw-flow-row">
            <div class="pw-flow-info">
              <span class="pw-flow-donor">{d.donor}</span>
              <span class="pw-flow-sector">{d.sector}</span>
            </div>
            <span class="pw-flow-amount">
              {"$" + (d.amount >= 1000000
                ? (d.amount / 1000000).toFixed(1) + "M"
                : (d.amount / 1000).toFixed(0) + "K")}
            </span>
          </div>
        ))}
      </div>

      {/* Tab: ROI */}
      <div class="pw-panel" data-panel="roi">
        <div class="pw-section-label">RETURN ON INVESTMENT</div>
        {pol.roi.map((r) => (
          <div class="pw-roi-row">
            <div class="pw-roi-top-row">
              <span class="pw-roi-donor">{r.donor}</span>
              <span class={`pw-roi-multiplier ${r.roi === null ? "pw-roi-na" : ""}`}>
                {r.roi !== null ? r.roi.toLocaleString() + "x" : "N/A"}
              </span>
            </div>
            <div class="pw-roi-policy">{r.policy}</div>
            <div class="pw-roi-amounts">
              <span class="pw-roi-donated">
                {"$" + (r.donated / 1000000).toFixed(1) + "M donated"}
              </span>
              <span class="pw-roi-arrow">→</span>
              <span class="pw-roi-value">
                {r.policyValue > 0
                  ? "$" + (r.policyValue >= 1e12
                      ? (r.policyValue / 1e12).toFixed(1) + "T"
                      : r.policyValue >= 1e9
                        ? (r.policyValue / 1e9).toFixed(1) + "B"
                        : (r.policyValue / 1e6).toFixed(0) + "M") + " value"
                  : "Priceless"}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Tab: Both Sides */}
      <div class="pw-panel" data-panel="both">
        <div class="pw-section-label">
          {"ALSO FUNDS " + (pol.party === "D" ? "REPUBLICANS" : "DEMOCRATS")}
        </div>
        {pol.bothSides.map((b) => (
          <div class="pw-bs-row">
            <div class="pw-bs-donor">{b.donor}</div>
            <div class="pw-bs-recipients">
              {b.alsoFunds.map((r) => (
                <div class="pw-bs-recip">
                  <span class={`pw-bs-party ${r.party === "D" ? "pw-dem" : "pw-rep"}`}>
                    {r.party}
                  </span>
                  <span class="pw-bs-name">{r.name}</span>
                  <span class="pw-bs-amt">
                    {"$" + (r.amount / 1000000).toFixed(1) + "M"}
                  </span>
                </div>
              ))}
            </div>
            <div class="pw-bs-policy">{b.policy}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

ProfileWidget.afterDOMLoaded = `
function initProfileWidget() {
  var widget = document.querySelector('.pw-widget');
  if (!widget) return;

  var tabs = widget.querySelectorAll('.pw-tab');
  var panels = widget.querySelectorAll('.pw-panel');

  tabs.forEach(function(tab) {
    tab.addEventListener('click', function() {
      var target = tab.getAttribute('data-tab');

      tabs.forEach(function(t) { t.classList.remove('pw-tab-active'); });
      panels.forEach(function(p) { p.classList.remove('pw-panel-active'); });

      tab.classList.add('pw-tab-active');
      var panel = widget.querySelector('[data-panel="' + target + '"]');
      if (panel) panel.classList.add('pw-panel-active');
    });
  });
}

initProfileWidget();
document.addEventListener('nav', function() {
  setTimeout(initProfileWidget, 100);
});
`

ProfileWidget.css = `
/* ═══════════════════════════════════════════════
   PROFILE WIDGET — Right sidebar sticky widget
   ═══════════════════════════════════════════════ */

.pw-widget {
  background: #13131a;
  border: 1px solid #1e1e28;
  border-radius: 8px;
  padding: 0;
  margin-top: 16px;
  overflow: visible;
}

/* Tabs */
.pw-tabs {
  display: flex;
  border-bottom: 1px solid #1e1e28;
  background: #0e0e14;
}

.pw-tab {
  flex: 1;
  padding: 10px 4px;
  border: none;
  background: none;
  color: #63636e;
  font-family: 'Space Mono', monospace;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 1px;
  cursor: pointer;
  transition: all 0.15s;
  text-align: center;
  border-bottom: 2px solid transparent;
}

.pw-tab:hover {
  color: #a1a1aa;
  background: rgba(99, 102, 241, 0.04);
}

.pw-tab-active {
  color: #818cf8 !important;
  border-bottom-color: #818cf8 !important;
  background: rgba(99, 102, 241, 0.06) !important;
}

/* Panels */
.pw-panel {
  display: none;
  padding: 14px;
  max-height: 400px;
  overflow-y: auto;
}

.pw-panel-active {
  display: block;
}

/* Scrollbar for panels */
.pw-panel::-webkit-scrollbar {
  width: 3px;
}

.pw-panel::-webkit-scrollbar-track {
  background: transparent;
}

.pw-panel::-webkit-scrollbar-thumb {
  background: #1e1e28;
  border-radius: 2px;
}

.pw-panel::-webkit-scrollbar-thumb:hover {
  background: #2a2a36;
}

.pw-section-label {
  font-family: 'Space Mono', monospace;
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 2px;
  color: #63636e;
  margin-bottom: 10px;
}

/* ─── Flow tab ───────────────────────────── */

.pw-flow-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 10px;
  border-radius: 4px;
  margin-bottom: 2px;
  transition: background 0.15s;
}

.pw-flow-row:hover {
  background: rgba(99, 102, 241, 0.06);
}

.pw-flow-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.pw-flow-donor {
  font-size: 12px;
  font-weight: 600;
  color: #b4b4bc;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.pw-flow-sector {
  font-family: 'Space Mono', monospace;
  font-size: 9px;
  color: #63636e;
  letter-spacing: 0.5px;
}

.pw-flow-amount {
  font-family: 'Space Mono', monospace;
  font-size: 12px;
  font-weight: 700;
  color: #22c55e;
  flex-shrink: 0;
  margin-left: 8px;
}

/* ─── ROI tab ────────────────────────────── */

.pw-roi-row {
  padding: 10px;
  background: rgba(255, 255, 255, 0.015);
  border-radius: 6px;
  margin-bottom: 8px;
  border: 1px solid #1e1e28;
}

.pw-roi-row:hover {
  border-color: rgba(99, 102, 241, 0.2);
}

.pw-roi-top-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
}

.pw-roi-donor {
  font-size: 12px;
  font-weight: 600;
  color: #818cf8;
}

.pw-roi-multiplier {
  font-family: 'Space Mono', monospace;
  font-size: 14px;
  font-weight: 700;
  color: #22c55e;
}

.pw-roi-na {
  color: #f59e0b !important;
  font-size: 11px !important;
}

.pw-roi-policy {
  font-size: 11px;
  color: #a1a1aa;
  margin-bottom: 6px;
  line-height: 1.4;
}

.pw-roi-amounts {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}

.pw-roi-donated {
  font-family: 'Space Mono', monospace;
  font-size: 10px;
  color: #818cf8;
}

.pw-roi-arrow {
  color: #63636e;
  font-size: 10px;
}

.pw-roi-value {
  font-family: 'Space Mono', monospace;
  font-size: 10px;
  color: #22c55e;
  font-weight: 700;
}

/* ─── Both Sides tab ─────────────────────── */

.pw-bs-row {
  padding: 10px;
  background: rgba(255, 255, 255, 0.015);
  border-radius: 6px;
  margin-bottom: 8px;
  border: 1px solid #1e1e28;
}

.pw-bs-row:hover {
  border-color: rgba(99, 102, 241, 0.2);
}

.pw-bs-donor {
  font-size: 12px;
  font-weight: 700;
  color: #818cf8;
  margin-bottom: 6px;
}

.pw-bs-recipients {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-bottom: 6px;
}

.pw-bs-recip {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
}

.pw-bs-party {
  font-family: 'Space Mono', monospace;
  font-size: 9px;
  font-weight: 700;
  width: 16px;
  height: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 3px;
  flex-shrink: 0;
}

.pw-dem {
  color: #3b82f6;
  background: rgba(59, 130, 246, 0.15);
}

.pw-rep {
  color: #ef4444;
  background: rgba(239, 68, 68, 0.15);
}

.pw-bs-name {
  color: #b4b4bc;
  font-weight: 500;
  flex: 1;
}

.pw-bs-amt {
  font-family: 'Space Mono', monospace;
  font-size: 10px;
  font-weight: 700;
  color: #22c55e;
  flex-shrink: 0;
}

.pw-bs-policy {
  font-size: 10px;
  color: #a1a1aa;
  padding: 6px 8px;
  background: rgba(245, 158, 11, 0.06);
  border-left: 2px solid #f59e0b;
  border-radius: 0 4px 4px 0;
  line-height: 1.4;
}

/* ─── Hide on mobile (right sidebar hides) ─── */
@media (max-width: 800px) {
  .pw-widget {
    display: none;
  }
}
`

export default (() => ProfileWidget) satisfies QuartzComponentConstructor
