import fs from "node:fs"
import path from "node:path"
import Link from "next/link"
import { PageHeader } from "@/components/PageHeader"
import { memesByBeat } from "@/lib/memes-catalog"
import { ensureSeeded, type VerificationSeed } from "@/lib/beat-verifications"
import { VerificationRow } from "./VerificationRow"

/**
 * Active Beat workspace · /active-beat
 *
 * The pinned editorial dashboard for whichever beat is currently in
 * active editing. For v1 hardcoded to three-becerras since that is the
 * active beat. Later versions can parameterize by reading a config file
 * or letting David pin a beat from the Beats list.
 *
 * Sections:
 *   1. Beat metadata + artifacts (links to prototype, dossier, donors page, memes)
 *   2. Open verifications (the actionable backlog)
 *   3. Perplexity research (round status + result file links)
 *   4. Audit findings (applied + open)
 *   5. Pre-publication checklist (what gates flipping public-routes)
 *
 * Per the 2026-05-02 IA reorganization, this lives under EDITORIAL.
 *
 * Server component: reads files at request time, no client-side state.
 * v1 is read-only display; v2 could add inline editable status flags
 * by pulling state into a small JSONL.
 */

interface ChecklistItem {
  label: string
  detail: string
  status: "done" | "pending" | "blocked"
}

const ACTIVE_BEAT = {
  slug: "three-becerras",
  title: "Three Becerras",
  deck:
    "Xavier Becerra cosponsored single-payer bills seven times across four Congresses. On March 23 he said he was ready to deliver single-payer health care. Six weeks later he told the doctors lobby he was not supportive at this point. The donor list explains who is acceptable to whom.",
  prototypeUrl: "http://localhost:8096/three-becerras",
  donorListUrl: "http://localhost:8096/donors-becerra-2026",
  dossierPath: "content/Admin Notes/ca-gov-2026-dossiers/becerra.md",
  publicSlug: "three-becerras",
}

const VERIFICATION_SEEDS: VerificationSeed[] = [
  {
    id: "becerra-kqed-url",
    beat: "three-becerras",
    label: "URL pass: KQED article",
    detail:
      "The editorially load-bearing third-audience source. Per Rule 13 every cited URL passes editor verification before public exposure.",
    lane: "Editor",
    url: "https://www.kqed.org/news/12082059/xavier-becerra-backpedals-on-single-payer-as-he-woos-powerful-doctors-lobby",
  },
  {
    id: "becerra-laist-url",
    beat: "three-becerras",
    label: "URL pass: LAist transcript",
    detail:
      "LAist 2026 transcript citing the federal-feasibility hedge quote. Code Claude can fetch via ADR-0030 §11; URL acceptance for the published page is Editor lane.",
    lane: "Editor",
    url: "https://laist.com/news/politics/2026-election-california-primary-xavier-becerra-california-governor-transcript",
  },
  {
    id: "becerra-senate-finance-url",
    beat: "three-becerras",
    label: "URL pass: Senate Finance transcript PDF",
    detail: "Senate Finance 473022.pdf for the 2021 confirmation hearing testimony.",
    lane: "Editor",
    url: "https://www.finance.senate.gov/imo/media/doc/473022.pdf",
  },
  {
    id: "becerra-campaign-healthcare-url",
    beat: "three-becerras",
    label: "URL pass: Becerra campaign healthcare page",
    detail: "xavierbecerra2026.com/priorities/health-care/ for the 'building toward CalCare' direct quote.",
    lane: "Editor",
    url: "https://www.xavierbecerra2026.com/priorities/health-care/",
  },
  {
    id: "becerra-govtrack-103-hr1200",
    beat: "three-becerras",
    label: "URL pass: GovTrack HR 1200 (American Health Security Act 1993)",
    detail: "Becerra cosponsorship 1993-03-03.",
    lane: "Editor",
    url: "https://www.govtrack.us/congress/bills/103/hr1200",
  },
  {
    id: "becerra-govtrack-103-hr3960",
    beat: "three-becerras",
    label: "URL pass: GovTrack HR 3960 (American Health Security Act 1994)",
    detail: "Becerra cosponsorship 1994-03-03.",
    lane: "Editor",
    url: "https://www.govtrack.us/congress/bills/103/hr3960",
  },
  {
    id: "becerra-govtrack-104-hr1200",
    beat: "three-becerras",
    label: "URL pass: GovTrack HR 1200 (American Health Security Act 1995)",
    detail: "Becerra cosponsorship 1995-03-09.",
    lane: "Editor",
    url: "https://www.govtrack.us/congress/bills/104/hr1200",
  },
  {
    id: "becerra-govtrack-109-hr676",
    beat: "three-becerras",
    label: "URL pass: GovTrack HR 676 (109th Congress)",
    detail: "Becerra cosponsorship 2005-11-17.",
    lane: "Editor",
    url: "https://www.govtrack.us/congress/bills/109/hr676",
  },
  {
    id: "becerra-govtrack-110-hr676",
    beat: "three-becerras",
    label: "URL pass: GovTrack HR 676 (110th Congress)",
    detail: "Becerra cosponsorship 2007-06-13.",
    lane: "Editor",
    url: "https://www.govtrack.us/congress/bills/110/hr676",
  },
  {
    id: "becerra-govtrack-111-hr676",
    beat: "three-becerras",
    label: "URL pass: GovTrack HR 676 (111th Congress)",
    detail: "Becerra cosponsorship 2009-03-17.",
    lane: "Editor",
    url: "https://www.govtrack.us/congress/bills/111/hr676",
  },
  {
    id: "becerra-govtrack-112-hr676",
    beat: "three-becerras",
    label: "URL pass: GovTrack HR 676 (112th Congress)",
    detail: "Becerra cosponsorship 2011-05-13.",
    lane: "Editor",
    url: "https://www.govtrack.us/congress/bills/112/hr676",
  },
  {
    id: "becerra-cal-access-1480025",
    beat: "three-becerras",
    label: "URL pass: Cal-Access committee 1480025 (Becerra for Governor 2026)",
    detail: "Primary-source committee page for all donor amounts cited on the page.",
    lane: "Editor",
    url: "https://cal-access.sos.ca.gov/Campaign/Committees/Detail.aspx?id=1480025",
  },
  {
    id: "becerra-march23-x-post",
    beat: "three-becerras",
    label: "URL pass: March 23 X post (verified primary)",
    detail: "Status 2036208139507298516 at 6:27 PM. The verified March 23 wording.",
    lane: "Editor",
    url: "https://x.com/XavierBecerra/status/2036208139507298516",
  },
  {
    id: "becerra-cpca-endorsement",
    beat: "three-becerras",
    label: "URL pass: CPCA Advocates endorsement of Becerra (2025-11-10)",
    detail: "Org's own endorsement page; the first gubernatorial endorsement in the org's history.",
    lane: "Editor",
    url: "https://cpcaadvocates.org/CPCAAdvocates/ABOUT/MEDIA/CPCAAdvocates/MEDIA/News_Articles.aspx",
  },
  {
    id: "becerra-fed-register-dhr-2022",
    beat: "three-becerras",
    label: "URL pass: Federal Register DHR Brownsville expansion approval (2022-12-20)",
    detail: "The direct-influence finding. Federal Register notice; CMS approval over FAH+AHA opposition.",
    lane: "Editor",
    url: "https://www.federalregister.gov/documents/2022/12/20/2022-27566/medicare-program-approval-of-request-for-an-exception-to-the-prohibition-on-expansion-of-facility",
  },
  {
    id: "becerra-fah-dhr-reaction",
    beat: "three-becerras",
    label: "URL pass: FAH reaction to DHR approval",
    detail: "FAH characterization of approval as 'unfortunate precedent' weakening the law banning new physician-owned hospitals.",
    lane: "Editor",
    url: "https://fah.org/sets-an-unfortunate-precedent-fah-reacts-to-cms-decision-allowing-a-physician-owned-hospital-to-expand/",
  },
  {
    id: "becerra-iepac-watch",
    beat: "three-becerras",
    label: "Cal-Access F496 watch: Working Families for Healthy Communities IE PAC",
    detail:
      "FPPC 1490885 formed April 30. Politico CA Playbook 4/29 named CPCA Advocates + Laborers as seed funders. Cal-Access bulk does not yet contain the committee's filings; F460/F496 disclosures will appear over the next 30 days. Not blocking publication; will tighten the CPCA-circuit dollar amount when filings land.",
    lane: "Time-based",
  },
  {
    id: "becerra-govinfo-1994",
    beat: "three-becerras",
    label: "GovInfo 1994 hearing primary transcript",
    detail:
      "The 1994 hearing quote ('I do, as I said before, join my colleagues who support the single-payer plan') is currently sourced via KFF Health News and PolitiFact. GovInfo search interface is JS-locked; wssearch backend requires POST which our audit fetcher does not yet support. Quote remains attributed at Tier 2.",
    lane: "Code Claude",
  },
  {
    id: "becerra-martinian",
    beat: "three-becerras",
    label: "Tigran Martinian industry classification",
    detail:
      "$45,600 to FPPC committee 1480025 across 5 receipts. The remaining [UNVERIFIED] individual donor on the top-15 list. Perplexity round drafted.",
    lane: "Perplexity",
  },
]

const PERPLEXITY_ROUNDS = [
  { name: "Anti-Steyer verification (Steyer beat)", status: "applied", date: "2026-05-01" },
  { name: "Becerra donor verification (Phase 5g)", status: "applied", date: "2026-05-01" },
  { name: "Polling firms + funders", status: "applied (with correction)", date: "2026-05-02" },
  { name: "Becerra single-payer record (Phase 5h)", status: "applied", date: "2026-05-02" },
  { name: "CPCA Advocates funder map (Phase 5i)", status: "applied", date: "2026-05-02" },
  { name: "Eleni Kounalakis status", status: "applied", date: "2026-05-02" },
  { name: "Steyer polling apparatus (correction round)", status: "applied", date: "2026-05-02" },
  { name: "Ballot certification + debate calendar", status: "applied", date: "2026-05-02" },
  { name: "Tigran Martinian identification", status: "drafted, pending run", date: "pending" },
  { name: "CPCA Advocates historical baseline (Round A)", status: "applied", date: "2026-05-02" },
  { name: "CMA parallel actions for Becerra (Round B)", status: "applied", date: "2026-05-02" },
  { name: "Becerra single-payer March 23 to April window (Round C)", status: "applied", date: "2026-05-02" },
  { name: "Newsom 2018 single-payer retreat parallel (Round D)", status: "applied", date: "2026-05-02" },
  { name: "Becerra HHS-era specific donor actions (Round E)", status: "applied", date: "2026-05-02" },
]

const AUDIT_PASSES = [
  { name: "Forensic audit round 1 (10 critique classes)", date: "2026-05-02", status: "applied" },
  {
    name: "Audit round 2 real-time critiques (4 from David)",
    date: "2026-05-02",
    status: "applied: comparative baseline added, silence-as-info-gap reframed, Kaiser/FQHC nuance, Bravo direct-quote restoration",
  },
  {
    name: "KQED quote verification + March 23 commitment surfaced",
    date: "2026-05-02",
    status: "applied: lede rewritten, six-week-window timeline locked",
  },
  {
    name: "Round E (HHS donor actions): DHR Brownsville approval surfaced as direct-influence finding",
    date: "2026-05-02",
    status: "applied: new 'Direct influence: one finding, named' section with the Dec 20, 2022 CMS approval over FAH+AHA opposition; Anthem framing corrected (OIG audited Anthem during Becerra's tenure, no preferential treatment found)",
  },
  {
    name: "Round C (March-April window): trajectory locked",
    date: "2026-05-02",
    status: "applied: March 23 X+Facebook posts verified; KQED 'deliver single-payer' wording flagged as Tier 2 pending platform confirmation; CalCare death April 21 + April 22/28 debates + April 29 CMA-endorsement-post added to timeline",
  },
  {
    name: "Round B (CMA parallel actions): negative finding folded in",
    date: "2026-05-02",
    status: "applied: CMA endorses (one channel) but does NOT commission polls, does NOT contribute via CALPAC, does NOT fund the IE PAC. CPCA structural claim stays focused on CPCA only. Added non-claim paragraph to 'What this page does not claim'",
  },
  {
    name: "Round A (CPCA historical baseline): comparative-baseline gap CLOSED",
    date: "2026-05-02",
    status: "applied: every CPCA channel deployed for Becerra is a first in the org's history. First gubernatorial endorsement, first commissioned poll, first candidate IE committee, first statewide-office direct contribution. All four channels simultaneously for the first time. Against a 5x revenue increase. Plus AltaMed's continuous board presence FY2019 through FY2025. Plus the IE PAC co-seeded by California State Council of Laborers (Becerra's #1 donor) with Bearstar (Newsom's firm) leading media. The 'honest limit' caveat removed from the page; the unprecedented-at-every-dimension finding takes its place",
  },
  {
    name: "Round D (Newsom 2018 retreat parallel): documented California pattern surfaced",
    date: "2026-05-02",
    status: "applied: new section 'The Newsom precedent' establishing that Becerra's 2026 trajectory follows a documented California Democratic gubernatorial pattern. Newsom's 'firm and absolute commitment' campaign pledge, Day-One executive orders, commission, AB 1400 non-endorsement, CalCare death without his support, SB 770 'complete betrayal' (CNA's words). Plus Blue Shield's $971K through pro-Newsom IE in 2018, $100K to inaugural fund, $20M to Project Homekey, $15M no-bid vaccine contract. KQED itself draws the parallel in the Becerra article. Page no longer makes the case as if Becerra is uniquely cynical; the case is the recurring California pattern",
  },
]

const PRE_PUBLICATION_CHECKLIST: ChecklistItem[] = [
  {
    label: "Forensic audit applied",
    detail: "Page revised against the 10-class audit + David's 4 real-time critiques + KQED-fetch findings.",
    status: "done",
  },
  {
    label: "Tier 1 quote verifications",
    detail: "GovTrack cosponsorships verified. Senate Finance transcript verified. Cal-Access donor amounts verified.",
    status: "done",
  },
  {
    label: "Tier 2 quote verifications via fetch",
    detail: "KQED article fetched and quoted material confirmed (ADR-0030 §11). LAist transcript fetch pending.",
    status: "pending",
  },
  {
    label: "URL pass on every cited source (Rule 13)",
    detail: "Editor lane. KQED, LAist, Senate Finance PDF, campaign website, 7 GovTrack URLs, Cal-Access committee pages.",
    status: "pending",
  },
  {
    label: "Open verifications closed or flagged",
    detail:
      "1994 hearing transcript flagged as Tier 2; IE PAC dollar amount flagged as time-based pending; Martinian flagged as drafted Perplexity round.",
    status: "done",
  },
  {
    label: "Companion donor-list page exists",
    detail: "/donors-becerra-2026 prototype with top-15 + healthcare slice cross-reference table.",
    status: "done",
  },
  {
    label: "Meme kit drafted",
    detail:
      "10 memes across 5 stories in prototype/memes-may-1.html. Five tagged for three-becerras beat. Captions pre-written and queued via /memes ops surface.",
    status: "done",
  },
  {
    label: "data/public-routes.json includes the slug",
    detail: "Currently locked to ['index'] only. Flip to include 'three-becerras' once URL pass closes.",
    status: "blocked",
  },
]

function readDossierFrontmatter(): { lastUpdated: string | null; status: string | null; bytes: number } {
  try {
    const p = path.join(process.cwd(), "..", ACTIVE_BEAT.dossierPath)
    const text = fs.readFileSync(p, "utf-8")
    const fm = text.match(/^---\n([\s\S]*?)\n---/)
    if (!fm) return { lastUpdated: null, status: null, bytes: text.length }
    const lastUpdated = fm[1].match(/last-updated:\s*(\S+)/)?.[1] || null
    const status = fm[1].match(/^status:\s*(\S+)/m)?.[1] || null
    return { lastUpdated, status, bytes: text.length }
  } catch {
    return { lastUpdated: null, status: null, bytes: 0 }
  }
}

function readPublicRoutes(): string[] {
  try {
    const p = path.join(process.cwd(), "..", "data", "public-routes.json")
    return JSON.parse(fs.readFileSync(p, "utf-8"))
  } catch {
    return []
  }
}

export default function ActiveBeatPage() {
  const dossier = readDossierFrontmatter()
  const publicRoutes = readPublicRoutes()
  const isLive = publicRoutes.includes(ACTIVE_BEAT.publicSlug)
  const memes = memesByBeat("three-becerras")

  // Seed-merge: hardcoded VERIFICATION_SEEDS on first load, then preserve
  // status across reloads from data/beat-verifications.jsonl.
  const verifications = ensureSeeded(VERIFICATION_SEEDS).filter((v) => v.beat === "three-becerras")
  const openCount = verifications.filter((v) => v.status === "open").length
  const verifiedCount = verifications.filter((v) => v.status === "verified").length
  const otherCount = verifications.length - openCount - verifiedCount
  const verifiedRatio = `${verifiedCount} / ${verifications.length}`

  return (
    <div>
      <PageHeader
        title={`Active Beat: ${ACTIVE_BEAT.title}`}
        whatThisDoes="The pinned editorial workspace for the currently-active beat. All artifacts in one place: prototype URL, dossier, donor list page, memes, audit findings, open verifications, pre-publication checklist."
        rightNow={
          <span>
            {verifiedRatio} verified · {openCount} open · {otherCount} other · dossier{" "}
            {dossier.status || "(unknown status)"} · {dossier.lastUpdated ? `updated ${dossier.lastUpdated}` : "no last-updated stamp"} ·{" "}
            <strong style={{ color: isLive ? "#16a34a" : "#fbbf24" }}>{isLive ? "LIVE" : "NOT LIVE"}</strong>
          </span>
        }
        action="Click ✓ Verify on each open URL after the editor URL pass to mark it good for publication. Verification state persists in data/beat-verifications.jsonl. When all Editor-lane URLs are verified the page is ready to ship."
      />

      {/* ─── Section 1: Artifacts ─────────────────────────────────── */}
      <Section title="Artifacts">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "12px" }}>
          <ArtifactCard
            label="Beat page"
            sub="prototype/beat-three-becerras.html"
            href={ACTIVE_BEAT.prototypeUrl}
            external
          />
          <ArtifactCard
            label="Donor list (companion)"
            sub="prototype/donors-becerra-2026.html"
            href={ACTIVE_BEAT.donorListUrl}
            external
          />
          <ArtifactCard
            label="Dossier"
            sub={`content/Admin Notes/ca-gov-2026-dossiers/becerra.md · ${(dossier.bytes / 1024).toFixed(1)} KB`}
            href={`/profile?slug=${encodeURIComponent("Admin Notes/ca-gov-2026-dossiers/becerra")}`}
          />
          <ArtifactCard
            label={`Memes (${memes.length})`}
            sub="five tagged for this beat in /memes catalog"
            href="/memes/three-becerras"
          />
          <ArtifactCard
            label="Site Preview"
            sub="all routes for this beat at a glance"
            href="/site-preview"
          />
          <ArtifactCard
            label="Race dossier folder"
            sub="ca-gov-2026-dossiers · all candidates + timeline"
            href="/races/ca-gov-2026"
          />
        </div>
      </Section>

      {/* ─── Section 2: Verifications (interactive) ──────────────── */}
      <Section title={`Verifications (${verifications.length})`}>
        <div style={{ display: "grid", gap: "8px" }}>
          {verifications.map((v) => (
            <VerificationRow key={v.id} entry={v} />
          ))}
        </div>
      </Section>

      {/* ─── Section 3: Perplexity rounds ──────────────────────────── */}
      <Section title={`Perplexity rounds (${PERPLEXITY_ROUNDS.length})`}>
        <div style={{ overflow: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid #1f2937" }}>
                <th style={th}>Round</th>
                <th style={{ ...th, width: "200px" }}>Status</th>
                <th style={{ ...th, width: "100px" }}>Date</th>
              </tr>
            </thead>
            <tbody>
              {PERPLEXITY_ROUNDS.map((r, i) => (
                <tr key={i} style={{ borderBottom: "1px solid #1f2937" }}>
                  <td style={td}>{r.name}</td>
                  <td style={td}>
                    <span
                      style={{
                        background: r.status.startsWith("applied") ? "#16a34a" : "#fbbf24",
                        color: r.status.startsWith("applied") ? "#fff" : "#0a0a0a",
                        padding: "2px 8px",
                        fontSize: "10px",
                        fontWeight: 700,
                        letterSpacing: "1px",
                        textTransform: "uppercase",
                      }}
                    >
                      {r.status}
                    </span>
                  </td>
                  <td style={{ ...td, fontFamily: "var(--font-mono, monospace)", color: "var(--color-text-dim)" }}>
                    {r.date}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      {/* ─── Section 4: Audit findings ─────────────────────────────── */}
      <Section title="Audit findings applied">
        <div style={{ display: "grid", gap: "8px" }}>
          {AUDIT_PASSES.map((a, i) => (
            <div
              key={i}
              style={{
                padding: "12px 16px",
                background: "rgba(22, 163, 74, 0.08)",
                border: "1px solid rgba(22, 163, 74, 0.3)",
                borderRadius: "4px",
              }}
            >
              <div
                style={{
                  fontFamily: "var(--font-mono, monospace)",
                  fontSize: "10px",
                  letterSpacing: "1.5px",
                  color: "#16a34a",
                  textTransform: "uppercase",
                  marginBottom: "4px",
                }}
              >
                {a.date} · APPLIED
              </div>
              <div style={{ fontSize: "13px", fontWeight: 700, color: "var(--color-text)", marginBottom: "4px" }}>
                {a.name}
              </div>
              <div style={{ fontSize: "12px", color: "var(--color-text-dim)", lineHeight: 1.5 }}>{a.status}</div>
            </div>
          ))}
        </div>
      </Section>

      {/* ─── Section 5: Pre-publication checklist ──────────────────── */}
      <Section title="Pre-publication checklist">
        <div style={{ display: "grid", gap: "8px" }}>
          {PRE_PUBLICATION_CHECKLIST.map((c, i) => (
            <ChecklistRow key={i} item={c} />
          ))}
        </div>
        <div
          style={{
            marginTop: "16px",
            padding: "12px 16px",
            background: isLive ? "rgba(22, 163, 74, 0.08)" : "rgba(251, 191, 36, 0.08)",
            border: `1px solid ${isLive ? "rgba(22, 163, 74, 0.3)" : "rgba(251, 191, 36, 0.3)"}`,
            borderRadius: "4px",
            fontSize: "12px",
            color: "var(--color-text-dim)",
            lineHeight: 1.6,
          }}
        >
          <strong style={{ color: "var(--color-text)" }}>Public exposure status:</strong>{" "}
          {isLive ? (
            <>
              <code style={{ color: "#16a34a" }}>{ACTIVE_BEAT.publicSlug}</code> is in data/public-routes.json. The beat
              is live at thedonormap.org/{ACTIVE_BEAT.publicSlug}.
            </>
          ) : (
            <>
              <code style={{ color: "#fbbf24" }}>{ACTIVE_BEAT.publicSlug}</code> is NOT in data/public-routes.json.
              Currently routed to <code>{publicRoutes.join(", ") || "(empty)"}</code> only. To flip live, complete the
              checklist above, then add the slug to <code>data/public-routes.json</code> and merge to v4.
            </>
          )}
        </div>
      </Section>
    </div>
  )
}

// ─── Reusable components ─────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: "32px" }}>
      <div style={{ borderBottom: "2px solid var(--color-text)", paddingBottom: "8px", marginBottom: "12px" }}>
        <h2
          style={{
            fontSize: "16px",
            fontWeight: 800,
            letterSpacing: "-0.5px",
            color: "var(--color-text)",
            margin: 0,
          }}
        >
          {title}
        </h2>
      </div>
      {children}
    </section>
  )
}

function ArtifactCard({
  label,
  sub,
  href,
  external,
}: {
  label: string
  sub: string
  href: string
  external?: boolean
}) {
  const Comp = external ? "a" : (Link as React.ElementType)
  const props = external ? { href, target: "_blank", rel: "noopener noreferrer" } : { href }
  return (
    <Comp
      {...props}
      style={{
        display: "block",
        padding: "12px 16px",
        background: "rgba(31, 41, 55, 0.4)",
        border: "1px solid #1f2937",
        borderRadius: "4px",
        textDecoration: "none",
        color: "var(--color-text)",
      }}
    >
      <div style={{ fontSize: "13px", fontWeight: 700, marginBottom: "4px" }}>
        {label} {external ? "↗" : "→"}
      </div>
      <div
        style={{
          fontSize: "11px",
          color: "var(--color-text-dim)",
          fontFamily: "var(--font-mono, monospace)",
          letterSpacing: "0.5px",
          wordBreak: "break-all",
        }}
      >
        {sub}
      </div>
    </Comp>
  )
}

// VerificationRow lives in ./VerificationRow as an interactive client component.

function ChecklistRow({ item }: { item: ChecklistItem }) {
  const checkbox =
    item.status === "done" ? "☑" : item.status === "blocked" ? "▣" : "☐"
  const color = item.status === "done" ? "#16a34a" : item.status === "blocked" ? "#fbbf24" : "var(--color-text-dim)"
  return (
    <div
      style={{
        padding: "10px 14px",
        background: "rgba(31, 41, 55, 0.4)",
        border: "1px solid #1f2937",
        borderRadius: "4px",
        display: "flex",
        gap: "12px",
        alignItems: "start",
      }}
    >
      <span style={{ fontSize: "16px", color, flexShrink: 0, fontFamily: "var(--font-mono, monospace)" }}>
        {checkbox}
      </span>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: "13px", fontWeight: 700, color: "var(--color-text)", marginBottom: "2px" }}>
          {item.label}
        </div>
        <div style={{ fontSize: "11px", color: "var(--color-text-dim)", lineHeight: 1.5 }}>{item.detail}</div>
      </div>
    </div>
  )
}

const th: React.CSSProperties = {
  padding: "8px 0",
  textAlign: "left",
  fontFamily: "var(--font-mono, monospace)",
  fontSize: "10px",
  fontWeight: 700,
  letterSpacing: "1.5px",
  color: "var(--color-text-dim)",
  textTransform: "uppercase",
}

const td: React.CSSProperties = {
  padding: "8px 12px 8px 0",
  fontSize: "12px",
  color: "var(--color-text)",
  verticalAlign: "top",
}
