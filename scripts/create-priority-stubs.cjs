#!/usr/bin/env node
/**
 * create-priority-stubs.cjs
 *
 * One-shot script to generate stub profiles for the highest-leverage
 * missing recipients surfaced by discover-990-gaps.cjs. Commercial DAFs
 * and dark-money c4 pass-throughs — politically relevant infrastructure
 * that was previously un-profiled in the vault.
 *
 * Each stub gets:
 *   - frontmatter: title, type, sector, EIN, nonprofit-status, source-tier
 *   - a short Quick Facts block
 *   - Sources pointing at IRS + ProPublica Nonprofit Explorer
 *   - content-readiness: raw (narrative pending Research Claude pass)
 *
 * Idempotent: skips any target whose profile_path already exists.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

const STUBS = [
  { title: 'Silicon Valley Community Foundation', ein: '205205488', sector: 'Wall Street', status: '501(c)(3)', kind: 'Donor-Advised Fund', folder: 'Wall Street', note: 'Largest community foundation in the US; operates as one of the largest donor-advised fund sponsors, channeling tech-sector wealth. Observed inflow of $843M from Fidelity Investments Charitable Gift Fund in 2022.' },
  { title: 'Goldman Sachs Philanthropy Fund', ein: '311774905', sector: 'Wall Street', status: '501(c)(3)', kind: 'Donor-Advised Fund', folder: 'Wall Street', note: 'Commercial DAF sponsor affiliated with Goldman Sachs; channels Wall Street wealth into grants without donor disclosure requirements.' },
  { title: 'Vanguard Charitable Endowment Program', ein: '232888152', sector: 'Wall Street', status: '501(c)(3)', kind: 'Donor-Advised Fund', folder: 'Wall Street', note: 'Commercial DAF sponsor affiliated with Vanguard. One of the three largest commercial DAFs by assets under management.' },
  { title: 'Morgan Stanley Global Impact Funding Trust', ein: '527082731', sector: 'Wall Street', status: '501(c)(3)', kind: 'Donor-Advised Fund', folder: 'Wall Street', note: 'Morgan Stanley DAF sponsor. Multiple associated EINs in 990 records (527082731 primary).' },
  { title: 'American Endowment Foundation', ein: '341747398', sector: 'Wall Street', status: '501(c)(3)', kind: 'Donor-Advised Fund', folder: 'Wall Street', note: 'Independent DAF sponsor, one of the largest non-commercial DAFs serving high-net-worth donors.' },
  { title: 'Renaissance Charitable Foundation', ein: '352129262', sector: 'Wall Street', status: '501(c)(3)', kind: 'Donor-Advised Fund', folder: 'Wall Street', note: 'Independent DAF sponsor. $357M+ received in ingested period per Schedule I records.' },
  { title: 'ImpactAssets', ein: '262048480', sector: 'Wall Street', status: '501(c)(3)', kind: 'Donor-Advised Fund', folder: 'Wall Street', note: 'Independent DAF with an impact-investing focus; channels values-aligned giving from institutional donors.' },
  { title: 'Greater Horizons', ein: '200849590', sector: 'Wall Street', status: '501(c)(3)', kind: 'Donor-Advised Fund', folder: 'Wall Street', note: 'DAF sponsor operated by the Greater Kansas City Community Foundation. Significant pass-through volume.' },
  { title: 'Hopewell Fund', ein: '473681860', sector: 'Dark Money', status: '501(c)(3)', kind: '501(c)(3)', folder: 'Dark Money', note: 'Arabella Advisors-managed 501(c)(3) pass-through fiscal sponsor. Part of the Arabella dark-money infrastructure (New Venture Fund / Sixteen Thirty Fund / Hopewell / North Fund / The 1630 Fund).' },
  { title: 'Rockefeller Philanthropy Advisors', ein: '133615533', sector: 'Dark Money', status: '501(c)(3)', kind: '501(c)(3)', folder: 'Dark Money', note: 'Fiscal-sponsor / philanthropic-services intermediary. Channels institutional philanthropy and dark-money-adjacent giving through project fiscal sponsorship.' },
  { title: 'Planned Parenthood Federation of America', ein: '131644147', sector: 'Dark Money', status: '501(c)(3)', kind: '501(c)(3)', folder: 'Dark Money', note: 'Reproductive-health umbrella organization; $237M+ in Schedule I grants received in ingested period. Separate from Planned Parenthood Action Fund (PAC/c4 side, already in vault).' },
  { title: 'ACLU Foundation', ein: '136213516', sector: 'Dark Money', status: '501(c)(3)', kind: '501(c)(3)', folder: 'Dark Money', note: 'American Civil Liberties Union Foundation; the 501(c)(3) litigation arm of the ACLU (separate from the ACLU 501(c)(4) that does lobbying). $177M+ received in ingested period.' },
  { title: 'FF PAC', ein: '830791921', sector: 'Super PACs', status: '527', kind: 'Super PAC', folder: 'Super PACs', note: 'Future Forward super PAC (527 committee). 501(c)(4) sibling Future Forward USA Action already in vault. $251M transferred from Future Forward USA Action in 2024.' },
  { title: 'Vital Strategies', ein: '223419667', sector: 'Dark Money', status: '501(c)(3)', kind: '501(c)(3)', folder: 'Dark Money', note: 'Public-health 501(c)(3). Funded heavily by Bloomberg Philanthropies; operates global tobacco/nutrition/road-safety policy programs that shape domestic regulatory politics.' },
  { title: 'Co Impact Philanthropic Funds', ein: '882408684', sector: 'Wall Street', status: '501(c)(3)', kind: 'Donor-Collaborative', folder: 'Wall Street', note: 'Collaborative philanthropy vehicle pooling large-donor capital for gender/health/education programs. $266M+ in Schedule I grants received.' },
  // Second batch 2026-04-18
  { title: 'The Seminar Network', ein: '463508366', sector: 'Dark Money', status: '501(c)(4)', kind: '501(c)(4)', folder: 'Dark Money', note: 'Koch-network donor summit infrastructure. Rebranded form of Freedom Partners / Americans for Prosperity parent coordination. Part of Stand Together umbrella.' },
  { title: 'Stand Together Foundation', ein: '273197768', sector: 'Dark Money', status: '501(c)(3)', kind: '501(c)(3)', folder: 'Dark Money', note: 'Koch-network 501(c)(3) foundation, distinct corporate entity from Stand Together 501(c)(4) (EIN 912166417). Funds poverty and justice-system reform programs branded as libertarian civil-society.' },
  { title: 'Bank of America Charitable Gift Fund', ein: '046010342', sector: 'Wall Street', status: '501(c)(3)', kind: 'Donor-Advised Fund', folder: 'Wall Street', note: 'Bank of America DAF sponsor. Completes the Big Four commercial DAFs (Fidelity, Schwab, Vanguard, Morgan Stanley, BofA) that account for the majority of commercial DAF assets.' },
  { title: 'ClimateWorks Foundation', ein: '262303250', sector: 'Dark Money', status: '501(c)(3)', kind: '501(c)(3)', folder: 'Dark Money', note: 'Climate-philanthropy pooled fund; regrants donor capital into climate policy advocacy and mitigation. Major recipient from Hewlett, Packard, Bloomberg philanthropies.' },
  { title: 'Blue Meridian Partners', ein: '815086187', sector: 'Wall Street', status: '501(c)(3)', kind: 'Donor-Collaborative', folder: 'Wall Street', note: 'High-dollar collaborative philanthropy vehicle aggregating large-donor commitments for poverty-and-mobility programs. Anchored at Edna McConnell Clark Foundation.' },
  { title: 'The Barack Obama Foundation', ein: '464950751', sector: 'Dark Money', status: '501(c)(3)', kind: 'Presidential Foundation', folder: 'Dark Money', note: 'Obama Presidential Foundation. Funds the Obama Presidential Center on Chicago\'s South Side plus the Obama Leaders global fellowship programs.' },
  { title: 'Robin Hood Foundation', ein: '133441066', sector: 'Wall Street', status: '501(c)(3)', kind: 'Donor-Collaborative', folder: 'Wall Street', note: 'NYC-focused anti-poverty foundation funded heavily by Wall Street hedge fund capital. Board historically dominated by finance-industry leadership.' },
];

function makeStub(s) {
  const sourceSlug = s.ein;
  return `---
title: "${s.title}"
type: donor
content-readiness: raw
last-updated: 2026-04-18
sector: "${s.sector}"
entity-type: "${s.kind}"
ein: "${s.ein}"
nonprofit-status: "${s.status}"
source-tier: 1
internal-notes: "Stub profile auto-created 2026-04-18 from discover-990-gaps top-recipient list. ${s.note} Narrative pending Research Claude editorial pass."
---

# ${s.title}

*Stub profile. Narrative pending Research Claude editorial pass.*

## Quick facts

- **EIN:** ${s.ein}
- **Type:** ${s.status}, ${s.kind}
- **Note:** ${s.note}

## Sources

- [IRS Exempt Organization 990 records](https://www.irs.gov/charities-non-profits/form-990-series-downloads)
- [ProPublica Nonprofit Explorer (EIN ${sourceSlug.slice(0, 2)}-${sourceSlug.slice(2)})](https://projects.propublica.org/nonprofits/organizations/${sourceSlug})
`;
}

(function main() {
  let created = 0, skipped = 0;
  for (const s of STUBS) {
    const safeName = s.title.replace(/[\/:*?"<>|]/g, '');
    const dir = path.join(ROOT, 'content', 'Donors & Power Networks', s.folder);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const filePath = path.join(dir, `${safeName}.md`);
    if (fs.existsSync(filePath)) {
      console.log(`  [skip] ${s.title} — already exists at ${path.relative(ROOT, filePath)}`);
      skipped++;
      continue;
    }
    fs.writeFileSync(filePath, makeStub(s));
    console.log(`  [created] ${s.title}`);
    created++;
  }
  console.log(`\n${created} created, ${skipped} skipped.`);
})();
