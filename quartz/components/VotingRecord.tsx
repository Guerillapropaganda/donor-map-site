import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"
import { classNames } from "../util/lang"

const VotingRecord: QuartzComponent = ({
  fileData,
  displayClass,
}: QuartzComponentProps) => {
  const fm = fileData.frontmatter
  if (!fm) return null

  const type = String(fm.type ?? "").toLowerCase()
  if (type !== "politician") return null

  const votesWithParty = fm["votes-with-party"] ? String(fm["votes-with-party"]) : null
  const missedVotesPct = fm["missed-votes-pct"] ? String(fm["missed-votes-pct"]) : null
  const ideologyScore = fm["ideology-score"] ? String(fm["ideology-score"]) : null
  const leadershipScore = fm["leadership-score"] ? String(fm["leadership-score"]) : null
  const party = String(fm.party ?? "")

  // Only render if we have voting data
  if (!votesWithParty && !missedVotesPct && !ideologyScore) return null

  const partyPct = votesWithParty ? parseFloat(votesWithParty) : null
  const missedPct = missedVotesPct ? parseFloat(missedVotesPct) : null
  const ideology = ideologyScore ? parseFloat(ideologyScore) : null
  const leadership = leadershipScore ? parseFloat(leadershipScore) : null

  // Ideology label
  const ideologyLabel = ideology !== null
    ? ideology < 0.25 ? "Very Liberal"
    : ideology < 0.45 ? "Liberal"
    : ideology < 0.55 ? "Moderate"
    : ideology < 0.75 ? "Conservative"
    : "Very Conservative"
    : null

  const partyColor = party.toLowerCase().startsWith("democrat") ? "#3b82f6" : "#ef4444"
  const govtrackId = fm["govtrack-id"] ? String(fm["govtrack-id"]) : null
  const title = String(fm.title ?? "").replace(/^_/, "").replace(/\s*Master Profile.*/, "")

  return (
    <div class={classNames(displayClass, "vr-container")}>
      <div class="vr-header">
        <span class="vr-title">VOTING RECORD</span>
        <span class="vr-source">Congress.gov + GovTrack</span>
      </div>

      <div class="vr-stats">
        {/* Party Loyalty */}
        {partyPct !== null && (
          <div class="vr-stat-card">
            <div class="vr-stat-ring" data-pct={partyPct} data-color={partyColor}>
              <svg viewBox="0 0 36 36" class="vr-ring-svg">
                <circle cx="18" cy="18" r="15.9" fill="none" stroke="rgba(255,255,255,0.06)" stroke-width="2.5" />
                <circle cx="18" cy="18" r="15.9" fill="none" stroke={partyColor}
                  stroke-width="2.5" stroke-linecap="round"
                  stroke-dasharray={`${partyPct} ${100 - partyPct}`}
                  stroke-dashoffset="25"
                  class="vr-ring-progress" />
              </svg>
              <span class="vr-ring-value" style={{ color: partyColor }}>{partyPct.toFixed(0)}%</span>
            </div>
            <span class="vr-stat-label">Votes with Party</span>
          </div>
        )}

        {/* Missed Votes */}
        {missedPct !== null && (
          <div class="vr-stat-card">
            <div class="vr-stat-ring" data-pct={missedPct} data-color={missedPct > 10 ? "#ef4444" : missedPct > 5 ? "#f59e0b" : "#22c55e"}>
              <svg viewBox="0 0 36 36" class="vr-ring-svg">
                <circle cx="18" cy="18" r="15.9" fill="none" stroke="rgba(255,255,255,0.06)" stroke-width="2.5" />
                <circle cx="18" cy="18" r="15.9" fill="none"
                  stroke={missedPct > 10 ? "#ef4444" : missedPct > 5 ? "#f59e0b" : "#22c55e"}
                  stroke-width="2.5" stroke-linecap="round"
                  stroke-dasharray={`${missedPct} ${100 - missedPct}`}
                  stroke-dashoffset="25"
                  class="vr-ring-progress" />
              </svg>
              <span class="vr-ring-value" style={{ color: missedPct > 10 ? "#ef4444" : missedPct > 5 ? "#f59e0b" : "#22c55e" }}>
                {missedPct.toFixed(1)}%
              </span>
            </div>
            <span class="vr-stat-label">Missed Votes</span>
          </div>
        )}

        {/* Ideology */}
        {ideology !== null && (
          <div class="vr-stat-card vr-ideology">
            <div class="vr-ideology-bar">
              <div class="vr-ideology-track">
                <div class="vr-ideology-marker" style={{ left: `${ideology * 100}%` }}>
                  <div class="vr-ideology-dot" />
                </div>
                <span class="vr-ideology-left">Liberal</span>
                <span class="vr-ideology-right">Conservative</span>
              </div>
            </div>
            <span class="vr-stat-label">{ideologyLabel} ({ideology.toFixed(2)})</span>
          </div>
        )}

        {/* Leadership */}
        {leadership !== null && (
          <div class="vr-stat-card">
            <div class="vr-leadership-value" style={{ color: leadership > 0.5 ? "#22c55e" : "#5b8dce" }}>
              {leadership.toFixed(2)}
            </div>
            <span class="vr-stat-label">Leadership Score</span>
          </div>
        )}
      </div>

      {/* Source links */}
      <div class="vr-sources">
        {govtrackId && (
          <a href={`https://www.govtrack.us/congress/members/${govtrackId}`} target="_blank" rel="noopener noreferrer" class="vr-source-link">
            GovTrack Profile →
          </a>
        )}
        <a href={`https://www.congress.gov/search?q=${encodeURIComponent(title)}`} target="_blank" rel="noopener noreferrer" class="vr-source-link">
          Congress.gov →
        </a>
      </div>
    </div>
  )
}

VotingRecord.css = `
.vr-container {
  background: #13131a;
  border: 1px solid #1e1e28;
  border-radius: 8px;
  padding: 16px;
  margin: 16px 0;
}

.vr-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  padding-bottom: 8px;
  border-bottom: 1px solid #1e1e28;
}

.vr-title {
  font-size: 9px;
  letter-spacing: 0.15em;
  font-weight: 700;
  color: #5b8dce;
  text-transform: uppercase;
}

.vr-source {
  font-size: 8px;
  color: #7a7a86;
  letter-spacing: 0.1em;
}

.vr-stats {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
  align-items: flex-start;
}

.vr-stat-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  flex: 1;
  min-width: 70px;
}

.vr-stat-ring {
  position: relative;
  width: 64px;
  height: 64px;
}

.vr-ring-svg {
  width: 100%;
  height: 100%;
  transform: rotate(-90deg);
}

.vr-ring-progress {
  transition: stroke-dasharray 1s ease;
}

.vr-ring-value {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: 700;
  font-family: 'Space Mono', monospace;
}

.vr-stat-label {
  font-size: 8px;
  color: #7a7a86;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  text-align: center;
}

.vr-ideology {
  flex: 2;
  min-width: 140px;
}

.vr-ideology-bar {
  width: 100%;
  padding: 8px 0;
}

.vr-ideology-track {
  position: relative;
  height: 6px;
  background: linear-gradient(to right, #3b82f6, #8b5cf6, #ef4444);
  border-radius: 3px;
  margin: 12px 0 20px;
}

.vr-ideology-marker {
  position: absolute;
  top: 50%;
  transform: translate(-50%, -50%);
}

.vr-ideology-dot {
  width: 14px;
  height: 14px;
  background: #e4e4e7;
  border: 2px solid #0c0c0f;
  border-radius: 50%;
  box-shadow: 0 0 8px rgba(228, 228, 231, 0.4);
}

.vr-ideology-left {
  position: absolute;
  left: 0;
  top: 14px;
  font-size: 7px;
  color: #3b82f6;
  letter-spacing: 0.1em;
}

.vr-ideology-right {
  position: absolute;
  right: 0;
  top: 14px;
  font-size: 7px;
  color: #ef4444;
  letter-spacing: 0.1em;
}

.vr-leadership-value {
  font-size: 24px;
  font-weight: 700;
  font-family: 'Space Mono', monospace;
  line-height: 1;
  padding: 12px 0;
}

.vr-sources {
  display: flex;
  gap: 12px;
  margin-top: 12px;
  padding-top: 8px;
  border-top: 1px solid #1e1e28;
}

.vr-source-link {
  font-size: 9px;
  color: #5b8dce;
  text-decoration: none;
  opacity: 0.7;
  transition: opacity 0.2s;
}

.vr-source-link:hover {
  opacity: 1;
  text-decoration: underline;
}

@media (max-width: 640px) {
  .vr-stats {
    flex-direction: column;
    align-items: center;
  }
  .vr-ideology {
    width: 100%;
  }
}
`

VotingRecord.afterDOMLoaded = ``

export default (() => VotingRecord) satisfies QuartzComponentConstructor
