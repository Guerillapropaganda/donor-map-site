"use client"

import { useState } from "react"

interface AutoBlock {
  type: string
  label: string
  content: string
}

const BLOCK_LABELS: Record<string, string> = {
  "govtrack-votes": "Voting Record",
  "voting-record": "Voting Record",
  "committee-assignments": "Committee Assignments",
  "congress-legislation": "Bills & Legislation",
  "fec-fundraising": "FEC Fundraising",
  "fec-politician": "FEC Candidate Data",
  "fec-donor": "FEC Contributions",
  "lda-lobbying": "Lobbying Disclosures (LDA)",
  "lobbyview-networks": "Lobbying Networks (LobbyView)",
  "fara-foreign-agents": "Foreign Agent Registrations (FARA)",
  "usaspending": "Federal Contracts (USASpending)",
  "usaspending-subawards": "Federal Subawards",
  "sam-contracts": "SAM.gov Registration",
  "sec-edgar": "SEC Filings",
  "sec-enforcement": "SEC Enforcement Actions",
  "courtlistener-cases": "Court Cases",
  "doj-press": "DOJ Press Releases",
  "epa-echo": "EPA Environmental Record",
  "osha-safety": "OSHA Workplace Safety",
  "cpsc-recalls": "Consumer Product Recalls",
  "nhtsa-recalls": "Vehicle Recalls",
  "fcc-political-files": "FCC Political Files",
  "stock-trades": "Congressional Stock Trades",
  "ofac-sdn": "OFAC Sanctions Screening",
  "gleif-lei": "Legal Entity Identifier",
  "opensanctions": "Sanctions/PEP Screening",
  "nonprofit-990": "IRS 990 Tax Filings",
  "propublica-990": "Nonprofit Tax Data",
  "wikipedia": "Wikipedia/Wikidata",
  "federal-register": "Federal Register (Executive Orders, Rules)",
  "influence-cross-ref": "Influence Cross-Reference",
}

const BLOCK_COLORS: Record<string, string> = {
  "govtrack-votes": "#22c55e",
  "voting-record": "#22c55e",
  "committee-assignments": "#5b8dce",
  "congress-legislation": "#5b8dce",
  "fec-fundraising": "#10b981",
  "fec-politician": "#10b981",
  "fec-donor": "#10b981",
  "federal-register": "#fbbf24",
  "lda-lobbying": "#f59e0b",
  "sec-edgar": "#a855f7",
  "usaspending": "#06b6d4",
}

function extractAutoBlocks(raw: string): AutoBlock[] {
  const blocks: AutoBlock[] = []
  const regex = /<!-- auto:(\S+) start -->([\s\S]*?)<!-- auto:\1 end -->/g
  let match
  while ((match = regex.exec(raw)) !== null) {
    blocks.push({
      type: match[1],
      label: BLOCK_LABELS[match[1]] || match[1].replace(/-/g, " "),
      content: match[2].trim(),
    })
  }
  return blocks
}

export function PipelineDataViewer({ raw, profileType }: { raw: string; profileType: string }) {
  const blocks = extractAutoBlocks(raw)
  const [expanded, setExpanded] = useState<string | null>(null)

  if (blocks.length === 0) {
    return (
      <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-lg p-4">
        <h3 className="text-[10px] uppercase tracking-wider text-[var(--color-text-dim)] mb-2">Pipeline Data</h3>
        <p className="text-[10px] text-[var(--color-text-dim)]">No pipeline data blocks found. Run enrichment pipelines to populate.</p>
      </div>
    )
  }

  // Priority order based on profile type
  const priorityOrder: Record<string, string[]> = {
    politician: ["govtrack-votes", "voting-record", "committee-assignments", "congress-legislation", "fec-fundraising", "fec-politician", "federal-register", "stock-trades"],
    donor: ["fec-donor", "lda-lobbying", "fara-foreign-agents", "influence-cross-ref"],
    corporation: ["fec-donor", "lda-lobbying", "usaspending", "sec-edgar", "sec-enforcement", "epa-echo", "osha-safety"],
    "think-tank": ["nonprofit-990", "propublica-990", "fec-donor", "influence-cross-ref"],
    "lobbying-firm": ["lda-lobbying", "fara-foreign-agents", "sec-edgar", "courtlistener-cases"],
    "media-profile": ["fec-donor", "influence-cross-ref"],
    pac: ["fec-fundraising", "fec-donor", "influence-cross-ref"],
  }

  const order = priorityOrder[profileType] || []
  const sorted = [...blocks].sort((a, b) => {
    const ai = order.indexOf(a.type)
    const bi = order.indexOf(b.type)
    if (ai === -1 && bi === -1) return 0
    if (ai === -1) return 1
    if (bi === -1) return -1
    return ai - bi
  })

  return (
    <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-[10px] uppercase tracking-wider text-[var(--color-text-dim)]">
          Pipeline Data ({blocks.length} blocks)
        </h3>
        <span className="text-[8px] text-[var(--color-text-dim)]">Click to expand. Read-only — data from government APIs.</span>
      </div>

      <div className="space-y-1">
        {sorted.map((block) => {
          const isExpanded = expanded === block.type
          const color = BLOCK_COLORS[block.type] || "var(--color-text-dim)"

          return (
            <div key={block.type}>
              <button
                onClick={() => setExpanded(isExpanded ? null : block.type)}
                className="w-full flex items-center gap-2 p-2 rounded hover:bg-[var(--color-bg-hover)] transition-colors text-left"
              >
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                <span className="text-[10px] font-bold flex-1" style={{ color }}>{block.label}</span>
                <span className="text-[8px] text-[var(--color-text-dim)]">
                  {block.content.split("\n").length} lines
                </span>
                <svg className={`w-3 h-3 text-[var(--color-text-dim)] transition-transform ${isExpanded ? "rotate-180" : ""}`}
                  fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {isExpanded && (
                <div className="ml-4 mb-2 p-3 bg-[var(--color-bg)] rounded border border-[var(--color-border)] max-h-64 overflow-y-auto">
                  <pre className="text-[10px] text-[var(--color-text)] whitespace-pre-wrap font-mono leading-relaxed">
                    {block.content}
                  </pre>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
