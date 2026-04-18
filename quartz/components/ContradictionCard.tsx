import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"
import { classNames } from "../util/lang"

interface SvpDonor {
  name: string
  amount: string
}

interface SayVsPay {
  passed?: string[]
  blocked?: string[]
  "top-donors"?: SvpDonor[]
  "gap-stat"?: string
}

const ContradictionCard: QuartzComponent = ({
  fileData,
  displayClass,
}: QuartzComponentProps) => {
  const fm = fileData.frontmatter
  if (!fm) return null

  const type = String(fm?.type ?? "")
  if (type !== "politician" && type !== "donor") return null

  // Parse say-vs-pay data
  const svpRaw = fm?.["say-vs-pay"] as SayVsPay | undefined
  if (!svpRaw) return null

  const passed = Array.isArray(svpRaw.passed) ? svpRaw.passed : []
  const blocked = Array.isArray(svpRaw.blocked) ? svpRaw.blocked : []
  const topDonors = Array.isArray(svpRaw["top-donors"]) ? svpRaw["top-donors"] : []
  const gapStat = String(svpRaw["gap-stat"] ?? "")

  // Need at least some data to render
  if (passed.length === 0 && blocked.length === 0 && topDonors.length === 0) return null

  return (
    <div class={classNames(displayClass, "contra-wrap", "profile-section-card")} data-tab="contradiction">
      <div class="contra-label">THE CONTRADICTION</div>
      <div class="contra-card">
        {/* Left: The Public Record */}
        <div class="contra-says">
          {passed.length > 0 && (
            <>
              <div class="contra-col-label contra-label-green">WHAT PASSED</div>
              {passed.map((item) => (
                <div class="contra-item contra-pass">+ {item}</div>
              ))}
            </>
          )}
          {blocked.length > 0 && (
            <>
              <div class="contra-col-label contra-label-red">WHAT DIDN'T</div>
              {blocked.map((item) => (
                <div class="contra-item contra-block">- {item}</div>
              ))}
            </>
          )}
        </div>

        {/* Right: The Money Trail */}
        <div class="contra-pays">
          <div class="contra-col-label contra-label-blue">THE MONEY TRAIL</div>
          {topDonors.map((d) => (
            <div class="contra-donor">
              <span class="contra-donor-name">{d.name}</span>
              <span class="contra-donor-amount">{d.amount}</span>
            </div>
          ))}
        </div>

        {/* Verdict */}
        {gapStat && (
          <div class="contra-verdict">{gapStat}</div>
        )}
      </div>
    </div>
  )
}

ContradictionCard.css = `
/* ═══════════════════════════════════════════════
   CONTRADICTION CARD — The AHA moment
   ═══════════════════════════════════════════════ */

.contra-wrap {
  margin-bottom: 24px;
}

.contra-label {
  font-family: 'Space Mono', monospace;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 3px;
  color: #e63946;
  margin-bottom: 12px;
}

.contra-card {
  display: grid;
  grid-template-columns: 1fr 1fr;
  border: 2px solid #0a0a0a;
}

.contra-says {
  padding: 24px;
  border-right: 2px solid #0a0a0a;
}

.contra-pays {
  padding: 24px;
  background: #ece6dd;
}

.contra-col-label {
  font-family: 'Space Mono', monospace;
  font-size: 9px;
  letter-spacing: 2px;
  text-transform: uppercase;
  margin-bottom: 12px;
  font-weight: 700;
}

.contra-label-green { color: #16a34a; }
.contra-label-red { color: #e63946; margin-top: 16px; }
.contra-label-blue { color: #1d4ed8; }

.contra-item {
  font-size: 14px;
  line-height: 1.6;
  padding: 4px 0;
  color: #333;
}

.contra-pass {
  color: #16a34a;
}

.contra-block {
  color: #e63946;
}

.contra-donor {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
  border-bottom: 1px solid #ddd;
  font-size: 14px;
}

.contra-donor:last-child {
  border-bottom: none;
}

.contra-donor-name {
  color: #0a0a0a;
  font-weight: 700;
}

.contra-donor-amount {
  font-family: 'Space Mono', monospace;
  font-weight: 700;
  color: #e63946;
}

.contra-verdict {
  grid-column: 1 / -1;
  padding: 14px 24px;
  background: #0a0a0a;
  color: #fbbf24;
  font-family: 'Space Mono', monospace;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 1px;
}

@media (max-width: 768px) {
  .contra-card {
    grid-template-columns: 1fr;
  }

  .contra-says {
    border-right: none;
    border-bottom: 2px solid #0a0a0a;
  }
}
`

export default (() => ContradictionCard) satisfies QuartzComponentConstructor
