import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"
// @ts-ignore
import script from "./scripts/networkGraph.inline"
import style from "./styles/networkGraph.scss"

const NetworkGraph: QuartzComponent = ({ fileData }: QuartzComponentProps) => {
  const slug = String(fileData.slug ?? "").toLowerCase()

  // Only render on the network graph page
  if (!slug.includes("interactive/network-graph")) return null

  return (
    <div id="dm-network-graph" class="dm-ng-container">
      {/* Controls bar */}
      <div class="dm-ng-controls">
        <div class="dm-ng-search-wrap">
          <input
            type="text"
            class="dm-ng-search"
            placeholder="Search profiles..."
            autocomplete="off"
          />
        </div>
        <div class="dm-ng-filters">
          <button class="dm-ng-filter dm-ng-filter-active" data-filter="all">All</button>
          <button class="dm-ng-filter" data-filter="Democrat">D</button>
          <button class="dm-ng-filter" data-filter="Republican">R</button>
          <button class="dm-ng-filter" data-filter="donor">Donors</button>
        </div>
        <div class="dm-ng-node-count">
          <span class="dm-ng-count-label">Nodes:</span>
          <input type="range" class="dm-ng-count-slider" min="50" max="500" value="150" />
          <span class="dm-ng-count-value">150</span>
        </div>
      </div>

      {/* Graph viewport */}
      <div class="dm-ng-viewport">
        <svg class="dm-ng-svg"></svg>
      </div>

      {/* Tooltip */}
      <div class="dm-ng-tooltip" style="display:none"></div>

      {/* Legend */}
      <div class="dm-ng-legend">
        <div class="dm-ng-legend-section">
          <div class="dm-ng-legend-item">
            <svg width="14" height="14" viewBox="-7 -7 14 14">
              <polygon points="0,-6 5.2,-3 5.2,3 0,6 -5.2,3 -5.2,-3" fill="#3b82f6" opacity="0.8" />
            </svg>
            <span>Democrat</span>
          </div>
          <div class="dm-ng-legend-item">
            <svg width="14" height="14" viewBox="-7 -7 14 14">
              <polygon points="0,-6 5.2,-3 5.2,3 0,6 -5.2,3 -5.2,-3" fill="#e63946" opacity="0.8" />
            </svg>
            <span>Republican</span>
          </div>
          <div class="dm-ng-legend-item">
            <svg width="14" height="14" viewBox="-7 -7 14 14">
              <rect x="-6" y="-4.5" width="12" height="9" rx="2" fill="#16a34a" opacity="0.8" />
            </svg>
            <span>Donor / Corp</span>
          </div>
          <div class="dm-ng-legend-item">
            <svg width="14" height="14" viewBox="-7 -7 14 14">
              <polygon points="0,-6 6,0 0,6 -6,0" fill="#fbbf24" opacity="0.8" />
            </svg>
            <span>Think Tank</span>
          </div>
          <div class="dm-ng-legend-item">
            <svg width="14" height="14" viewBox="-7 -7 14 14">
              <polygon points="0,-6 5.2,-3 5.2,3 0,6 -5.2,3 -5.2,-3" fill="#0a0a0a" opacity="0.8" />
            </svg>
            <span>K Street</span>
          </div>
          <div class="dm-ng-legend-item">
            <svg width="14" height="14" viewBox="-7 -7 14 14">
              <circle cx="0" cy="0" r="5" fill="#a855f7" opacity="0.8" />
            </svg>
            <span>Media</span>
          </div>
        </div>
        <div class="dm-ng-legend-divider"></div>
        <div class="dm-ng-legend-section">
          <div class="dm-ng-legend-item">
            <svg width="20" height="14" viewBox="0 0 20 14">
              <line x1="1" y1="7" x2="19" y2="7" stroke="#999" stroke-width="1.2" stroke-opacity="0.6" />
            </svg>
            <span>Allied</span>
          </div>
          <div class="dm-ng-legend-item">
            <svg width="20" height="14" viewBox="0 0 20 14">
              <line x1="1" y1="7" x2="19" y2="7" stroke="#e63946" stroke-width="1.2" stroke-dasharray="4,3" stroke-opacity="0.8" />
            </svg>
            <span>Opposition</span>
          </div>
        </div>
      </div>
    </div>
  )
}

NetworkGraph.css = style
NetworkGraph.afterDOMLoaded = script

export default (() => NetworkGraph) satisfies QuartzComponentConstructor
