import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"
// @ts-ignore
import script from "./scripts/networkGraph.inline"
import style from "./styles/networkGraph.scss"

const NetworkGraph: QuartzComponent = ({ fileData, displayClass }: QuartzComponentProps) => {
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
        <div class="dm-ng-legend-item">
          <svg width="14" height="14" viewBox="-7 -7 14 14">
            <polygon points="0,-6 5.2,-3 5.2,3 0,6 -5.2,3 -5.2,-3" fill="#3b82f6" opacity="0.8" />
          </svg>
          <span>Democrat</span>
        </div>
        <div class="dm-ng-legend-item">
          <svg width="14" height="14" viewBox="-7 -7 14 14">
            <polygon points="0,-6 5.2,-3 5.2,3 0,6 -5.2,3 -5.2,-3" fill="#ef4444" opacity="0.8" />
          </svg>
          <span>Republican</span>
        </div>
        <div class="dm-ng-legend-item">
          <svg width="14" height="14" viewBox="-7 -7 14 14">
            <rect x="-5" y="-5" width="10" height="10" rx="2" fill="#f59e0b" opacity="0.8" />
          </svg>
          <span>Donor / Corp</span>
        </div>
      </div>
    </div>
  )
}

NetworkGraph.css = style
NetworkGraph.afterDOMLoaded = script

export default (() => NetworkGraph) satisfies QuartzComponentConstructor
