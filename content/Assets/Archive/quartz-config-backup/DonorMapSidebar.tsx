import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"
import { classNames } from "../util/lang"
import { pathToRoot } from "../util/path"

const DonorMapSidebar: QuartzComponent = ({
  fileData,
  cfg,
  displayClass,
  allFiles,
}: QuartzComponentProps) => {
  const baseDir = pathToRoot(fileData.slug!)

  // Key politicians with tracked amounts
  const politicians = [
    { name: "Nancy Pelosi", amount: "$14.2M", slug: "Politicians/Democrats/House/Nancy-Pelosi/_Nancy-Pelosi-Master-Profile" },
    { name: "Mitch McConnell", amount: "$11.8M", slug: "Politicians/Republicans/Senate/Mitch-McConnell/_Mitch-McConnell-Master-Profile" },
    { name: "Ted Cruz", amount: "$9.4M", slug: "Politicians/Republicans/Senate/Ted-Cruz/_Ted-Cruz-Master-Profile" },
    { name: "Chuck Schumer", amount: "$8.7M", slug: "Politicians/Democrats/Senate/Chuck-Schumer/_Chuck-Schumer-Master-Profile" },
    { name: "Donald Trump", amount: "$7.2M", slug: "Politicians/Republicans/Presidential/Donald-Trump/_Donald-Trump-Master-Profile" },
  ]

  // Key donors
  const donors = [
    { name: "Goldman Sachs", slug: "Donors-&-Power-Networks/Wall-Street-&-Finance/Goldman-Sachs" },
    { name: "AIPAC", slug: "Donors-&-Power-Networks/Israel-Lobby/AIPAC" },
    { name: "Koch Network", slug: "Donors-&-Power-Networks/Koch-Network" },
    { name: "Lockheed Martin", slug: "Donors-&-Power-Networks/Defense-&-Intelligence/Lockheed-Martin" },
  ]

  // Key contradictions
  const contradictions = [
    { name: "Drug Pricing Theater", slug: "Stories/Contradictions/Contradiction-01" },
    { name: "Defense Budget Bloat", slug: "Stories/Contradictions/Contradiction-02" },
    { name: "Carried Interest Scam", slug: "Stories/Contradictions/Contradiction-03" },
  ]

  return (
    <div class={classNames(displayClass, "donor-map-sidebar")}>
      <div class="dm-logo">
        <a href={baseDir}>
          <span class="dm-logo-text">DONOR MAP<span class="dm-cursor">_</span></span>
        </a>
        <div class="dm-subtitle">FOLLOW THE MONEY</div>
      </div>

      <nav class="dm-nav">
        <div class="dm-section">
          <div class="dm-section-label">POLITICIANS</div>
          <ul class="dm-list">
            {politicians.map((p) => (
              <li class="dm-list-item">
                <a href={`${baseDir}/${p.slug}`} class="dm-link">
                  <span class="dm-name">{p.name}</span>
                  <span class="dm-amount">{p.amount}</span>
                </a>
              </li>
            ))}
          </ul>
        </div>

        <div class="dm-section">
          <div class="dm-section-label">DONORS</div>
          <ul class="dm-list">
            {donors.map((d) => (
              <li class="dm-list-item">
                <a href={`${baseDir}/${d.slug}`} class="dm-link">
                  <span class="dm-name">{d.name}</span>
                </a>
              </li>
            ))}
          </ul>
        </div>

        <div class="dm-section">
          <div class="dm-section-label">CONTRADICTIONS</div>
          <ul class="dm-list">
            {contradictions.map((c) => (
              <li class="dm-list-item">
                <a href={`${baseDir}/${c.slug}`} class="dm-link">
                  <span class="dm-name">{c.name}</span>
                </a>
              </li>
            ))}
          </ul>
        </div>

        <div class="dm-section">
          <div class="dm-section-label">TOOLS</div>
          <ul class="dm-list">
            <li class="dm-list-item">
              <a href={`${baseDir}/Assets/donor-money-flow`} class="dm-link dm-tool-link">
                Money Flow <span class="dm-arrow">→</span>
              </a>
            </li>
            <li class="dm-list-item">
              <a href={`${baseDir}/Assets/roi-calculator`} class="dm-link dm-tool-link">
                ROI Calculator <span class="dm-arrow">→</span>
              </a>
            </li>
            <li class="dm-list-item">
              <a href={`${baseDir}/Assets/both-sides-machine`} class="dm-link dm-tool-link">
                Both-Sides Machine <span class="dm-arrow">→</span>
              </a>
            </li>
          </ul>
        </div>
      </nav>
    </div>
  )
}

DonorMapSidebar.css = `
.donor-map-sidebar {
  display: flex;
  flex-direction: column;
  gap: 0;
  padding: 0;
  position: sticky;
  top: 2rem;
}

/* Logo */
.dm-logo {
  margin-bottom: 2rem;
}

.dm-logo a {
  text-decoration: none !important;
}

.dm-logo-text {
  font-family: 'Space Mono', monospace;
  font-size: 22px;
  font-weight: 700;
  color: #ef4444;
  letter-spacing: 2px;
}

.dm-cursor {
  color: #22c55e;
  animation: blink 1.2s step-end infinite;
}

@keyframes blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0; }
}

.dm-subtitle {
  font-family: 'Space Mono', monospace;
  font-size: 10px;
  letter-spacing: 3px;
  color: #63636e;
  margin-top: 4px;
}

/* Navigation */
.dm-nav {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.dm-section-label {
  font-family: 'Space Mono', monospace;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 3px;
  color: #63636e;
  margin-bottom: 8px;
  padding-bottom: 4px;
  border-bottom: 1px solid #1e1e28;
}

.dm-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.dm-list-item {
  margin: 0;
  padding: 0;
}

.dm-link {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 8px;
  border-radius: 4px;
  text-decoration: none !important;
  transition: background 0.15s;
  font-size: 14px;
  color: #d4d4dc !important;
  background: none !important;
  border: none !important;
}

.dm-link:hover {
  background: rgba(239, 68, 68, 0.08) !important;
  color: #ffffff !important;
}

.dm-name {
  font-weight: 500;
}

.dm-amount {
  font-family: 'Space Mono', monospace;
  font-size: 13px;
  font-weight: 700;
  color: #22c55e;
}

.dm-tool-link {
  color: #a1a1aa !important;
  font-size: 13px;
}

.dm-tool-link:hover {
  color: #ef4444 !important;
}

.dm-arrow {
  color: #ef4444;
  font-weight: 700;
  transition: transform 0.15s;
}

.dm-link:hover .dm-arrow {
  transform: translateX(3px);
}

/* Hide on mobile */
@media (max-width: 800px) {
  .donor-map-sidebar {
    display: none;
  }
}
`

export default (() => DonorMapSidebar) satisfies QuartzComponentConstructor
