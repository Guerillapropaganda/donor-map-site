import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"
import { classNames } from "../util/lang"

// PartySplitMeter — "bias meter" for donor profiles.
//
// Shows a horizontal bar with Dem % / Rep % of a donor's political giving.
// Primary data source: fec-party-split frontmatter (written by the FEC
// enrichment pipeline, e.g. "68% Dem / 32% Rep"). When that isn't
// available, falls back to computing the split from politicians-funded
// by cross-referencing each name against politician profiles in allFiles.
//
// Renders nothing when neither source yields data.

const PartySplitMeter: QuartzComponent = ({
  fileData,
  allFiles,
}: QuartzComponentProps) => {
  const fm = fileData.frontmatter
  if (!fm) return null
  const type = String(fm?.type ?? "")
  if (type !== "donor" && type !== "corporation") return null

  // ── Primary source: FEC party split ──
  let demPct: number | null = null
  let repPct: number | null = null
  let sourceLabel = ""
  let sampleLabel = ""

  const fecPartySplit = String(fm?.["fec-party-split"] ?? "")
  if (fecPartySplit) {
    const demMatch = fecPartySplit.match(/(\d+)%\s*Dem/i)
    const repMatch = fecPartySplit.match(/(\d+)%\s*Rep/i)
    if (demMatch) demPct = parseInt(demMatch[1])
    if (repMatch) repPct = parseInt(repMatch[1])
    if (demPct !== null && repPct !== null) {
      sourceLabel = "FEC filings (Tier 1)"
      const spend = String(fm?.["total-political-spend"] ?? "")
      if (spend && spend !== "undefined") sampleLabel = `Based on ${spend} reported federal giving`
    }
  }

  // ── Fallback: infer from politicians-funded ──
  let inferredPolCount = 0
  if (demPct === null || repPct === null) {
    const polFunded = Array.isArray(fm?.["politicians-funded"])
      ? (fm["politicians-funded"] as string[])
      : []
    if (polFunded.length === 0) return null

    // Build a name → party map from politician profiles.
    const polParty = new Map<string, string>()
    for (const f of allFiles) {
      const ffm = f.frontmatter
      if (!ffm) continue
      if (String(ffm.type ?? "") !== "politician") continue
      const title = String(ffm.title ?? "")
        .replace(/^_/, "")
        .replace(/\s*Master Profile.*/, "")
        .trim()
      if (!title) continue
      const party = String(ffm.party ?? "")
      if (party) polParty.set(title, party)
    }

    let dems = 0, reps = 0, inds = 0
    for (const name of polFunded) {
      const p = polParty.get(name)
      if (p === "Democrat") dems++
      else if (p === "Republican") reps++
      else if (p === "Independent") inds++
    }
    const total = dems + reps + inds
    if (total === 0) return null

    // Round to nearest % and make them sum to 100 (bias the largest bucket).
    const rawDem = (dems / total) * 100
    const rawRep = (reps / total) * 100
    demPct = Math.round(rawDem)
    repPct = Math.round(rawRep)
    const diff = 100 - demPct - repPct
    if (Math.abs(diff) > 0) {
      // Push drift into whichever side is larger.
      if (demPct >= repPct) demPct += diff
      else repPct += diff
    }
    inferredPolCount = total
    sourceLabel = "Inferred from funded candidates"
    sampleLabel = `Based on ${total} tracked politician${total === 1 ? "" : "s"} this donor has funded`
  }

  if (demPct === null || repPct === null) return null

  // ── Interpretation ──
  const spread = Math.abs(demPct - repPct)
  let verdict = ""
  let verdictClass = "psm-verdict-split"
  if (spread <= 25) {
    verdict = "BOTH SIDES"
    verdictClass = "psm-verdict-split"
  } else if (demPct > repPct) {
    verdict = spread >= 70 ? "STRONG LEFT" : "LEANS LEFT"
    verdictClass = "psm-verdict-left"
  } else {
    verdict = spread >= 70 ? "STRONG RIGHT" : "LEANS RIGHT"
    verdictClass = "psm-verdict-right"
  }

  return (
    <div class={classNames(undefined, "psm-meter")}>
      <div class="psm-header">
        <span class="psm-title">POLITICAL GIVING</span>
        <span class={`psm-verdict ${verdictClass}`}>{verdict}</span>
      </div>
      <div class="psm-bar">
        <div class="psm-bar-dem" style={`width: ${demPct}%`}>
          {demPct >= 12 && <span class="psm-pct">{demPct}%</span>}
        </div>
        <div class="psm-bar-rep" style={`width: ${repPct}%`}>
          {repPct >= 12 && <span class="psm-pct">{repPct}%</span>}
        </div>
      </div>
      <div class="psm-legend">
        <span class="psm-legend-left">DEMOCRATS</span>
        <span class="psm-legend-right">REPUBLICANS</span>
      </div>
      {(sampleLabel || sourceLabel) && (
        <div class="psm-footer">
          {sampleLabel && <span class="psm-sample">{sampleLabel}</span>}
          {sourceLabel && <span class="psm-source">{sourceLabel}</span>}
        </div>
      )}
    </div>
  )
}

PartySplitMeter.css = `
/* ═══════════════════════════════════════════════
   PARTY SPLIT METER — "Bias meter" for donors
   ═══════════════════════════════════════════════ */

.psm-meter {
  background: #0e0e14;
  border: 1px solid #1e1e28;
  border-left: 3px solid #5b8dce;
  border-radius: 6px;
  padding: 14px 18px;
  margin: 0 0 24px 0;
  font-family: 'Space Mono', monospace;
}

.psm-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.psm-title {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 2px;
  color: #8a8a96;
}

.psm-verdict {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 1.5px;
  padding: 3px 10px;
  border-radius: 3px;
  white-space: nowrap;
}

.psm-verdict-left {
  background: rgba(59, 114, 184, 0.15);
  color: #7aa3dc;
  border: 1px solid rgba(59, 114, 184, 0.4);
}

.psm-verdict-right {
  background: rgba(184, 59, 59, 0.15);
  color: #dc7a7a;
  border: 1px solid rgba(184, 59, 59, 0.4);
}

.psm-verdict-split {
  background: rgba(245, 158, 11, 0.15);
  color: #f5b55a;
  border: 1px solid rgba(245, 158, 11, 0.4);
}

.psm-bar {
  display: flex;
  width: 100%;
  height: 24px;
  border-radius: 4px;
  overflow: hidden;
  background: #1e1e28;
}

.psm-bar-dem {
  background: linear-gradient(90deg, #3b72b8 0%, #5b8dce 100%);
  display: flex;
  align-items: center;
  justify-content: flex-end;
  padding-right: 8px;
  min-width: 2px;
  transition: width 0.3s ease;
}

.psm-bar-rep {
  background: linear-gradient(90deg, #b83b3b 0%, #dc5555 100%);
  display: flex;
  align-items: center;
  justify-content: flex-start;
  padding-left: 8px;
  min-width: 2px;
  transition: width 0.3s ease;
}

.psm-pct {
  font-size: 12px;
  font-weight: 700;
  color: #fff;
  letter-spacing: 0.5px;
}

.psm-legend {
  display: flex;
  justify-content: space-between;
  margin-top: 6px;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 1.5px;
}

.psm-legend-left {
  color: #7aa3dc;
}

.psm-legend-right {
  color: #dc7a7a;
}

.psm-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px solid #1e1e28;
  font-size: 10px;
  color: #8a8a96;
}

.psm-sample {
  flex: 1;
  min-width: 0;
}

.psm-source {
  font-weight: 700;
  letter-spacing: 0.5px;
  color: #7a7a86;
  white-space: nowrap;
}

@media (max-width: 800px) {
  .psm-meter {
    padding: 12px 14px;
  }
  .psm-footer {
    flex-direction: column;
    align-items: flex-start;
    gap: 4px;
  }
}
`

export default (() => PartySplitMeter) satisfies QuartzComponentConstructor
