import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"
import { classNames } from "../util/lang"
import { simplifySlug } from "../util/path"
import { QuartzPluginData } from "../plugins/vfile"
import { isConstructionMode } from "../constructionMode"

// ─── Helpers ────────────────────────────────────────────────────────
function findPage(allFiles: QuartzPluginData[], searchTerm: string): QuartzPluginData | undefined {
  const lower = searchTerm.toLowerCase()
  return allFiles.find((f) => {
    const slug = (f.slug ?? "").toLowerCase()
    return slug.endsWith(lower) || slug === lower
  })
}

// ─── Curated split-card data ────────────────────────────────────────
interface SplitCard {
  name: string
  quote: string
  donors: { name: string; amount: string }[]
  verdict: string
}

const splitCards: SplitCard[] = [
  {
    name: "Sen. Cory Booker (D-NJ)",
    quote: '"We need to make prescription drugs affordable for every American."',
    donors: [
      { name: "PhRMA", amount: "$415K" },
      { name: "Pfizer", amount: "$198K" },
      { name: "Johnson & Johnson", amount: "$167K" },
    ],
    verdict: "VOTED AGAINST drug importation from Canada (2017) — the bill that would have lowered prices",
  },
  {
    name: "Sen. Ted Cruz (R-TX)",
    quote: '"I will always fight for free speech and against Big Tech censorship."',
    donors: [
      { name: "Google / Alphabet", amount: "$226K" },
      { name: "Amazon", amount: "$173K" },
      { name: "AT&T", amount: "$152K" },
    ],
    verdict: "VOTED FOR Section 230 protections that shield the same platforms he publicly attacks",
  },
]

// ─── Component ──────────────────────────────────────────────────────
const LandingPage: QuartzComponent = ({
  cfg,
  allFiles,
  displayClass,
}: QuartzComponentProps) => {
  const baseUrl = cfg.baseUrl ?? ""
  const slashIdx = baseUrl.indexOf("/")
  const basePath = slashIdx >= 0 ? "/" + baseUrl.substring(slashIdx + 1) : ""

  function absHref(targetSlug: string): string {
    return `${basePath}/${targetSlug}`
  }

  function getHref(search: string): string {
    const page = findPage(allFiles, search)
    if (page?.slug) return absHref(simplifySlug(page.slug))
    return "#"
  }

  // Dynamic counts
  const ENTITY_TYPES = ["politician", "donor", "corporation", "pac", "think-tank", "lobbying-firm", "media-profile"]
  const isEntityProfile = (f: typeof allFiles[0]) =>
    ENTITY_TYPES.includes(String(f.frontmatter?.type ?? ""))

  const totalProfiles = allFiles.filter(isEntityProfile).length
  const politicianCount = allFiles.filter((f) =>
    (f.slug ?? "").toLowerCase().startsWith("politicians/"),
  ).length
  const donorCount = allFiles.filter((f) =>
    (f.slug ?? "").toLowerCase().startsWith("donors--and--power-networks/"),
  ).length
  const storyCount = allFiles.filter((f) =>
    (f.slug ?? "").toLowerCase().startsWith("stories/"),
  ).length
  const lobbyCount = allFiles.filter((f) => {
    const slug = (f.slug ?? "").toLowerCase()
    return slug.startsWith("lobbying-firms") || slug.startsWith("think-tanks")
  }).length

  const verifiedCount = allFiles.filter((f) => {
    if (!isEntityProfile(f)) return false
    const r = String(f.frontmatter?.["content-readiness"] ?? "")
    return r === "ready" || r === "publication-ready"
  }).length

  // Build state lookup data for client-side JS
  const stateData: Record<string, { n: string; p: string; d: string }[]> = {}
  const US_STATES = ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"]

  // Collect senators by state from frontmatter
  allFiles.forEach((f) => {
    const fm = f.frontmatter
    if (!fm) return
    if (String(fm.type) !== "politician") return
    if (String(fm.chamber) !== "Senate") return
    const stateAbbr = String(fm["state-abbr"] ?? "")
    if (!stateAbbr || !US_STATES.includes(stateAbbr)) return
    const party = String(fm.party ?? "").toLowerCase()
    const title = String(fm.title ?? "")
    // Get top donors from frontmatter
    const topDonors = Array.isArray(fm["top-donors"])
      ? (fm["top-donors"] as string[]).slice(0, 3).join(", ")
      : ""
    if (!stateData[stateAbbr]) stateData[stateAbbr] = []
    stateData[stateAbbr].push({
      n: title,
      p: party.startsWith("dem") ? "dem" : party.startsWith("rep") ? "rep" : "ind",
      d: topDonors || "Data loading...",
    })
  })

  const stateDataJson = JSON.stringify(stateData)

  // ─── Construction mode ──────────────────────────────────────────────
  if (isConstructionMode) {
    return (
      <div class={classNames(displayClass, "lp-landing lp-construction")}>
        <div class="construct">
          <div class="construct-topbar">
            <span class="construct-logo">The Donor Map<span class="construct-dollar">$</span></span>
            <span class="construct-status-pill">Building</span>
          </div>
          <div class="construct-hero">
            <div class="construct-meta">OPEN-SOURCE DONOR INTELLIGENCE / {totalProfiles.toLocaleString()} NODES AND COUNTING</div>
            <h1 class="construct-title">
              Follow the<br />
              <span class="construct-highlight">Money.</span>
            </h1>
            <p class="construct-desc">
              A sourced, navigable database tracking how money controls American politics.
              Every profile starts with one question:{" "}
              <strong>who funds this person, and what did the funders get in return?</strong>
            </p>
          </div>
          <div class="construct-stats">
            <div class="construct-stat">
              <span class="construct-stat-num">{totalProfiles.toLocaleString()}</span>
              <span class="construct-stat-label">Profiles</span>
            </div>
            <div class="construct-stat-divider" />
            <div class="construct-stat">
              <span class="construct-stat-num">{politicianCount.toLocaleString()}</span>
              <span class="construct-stat-label">Politicians</span>
            </div>
            <div class="construct-stat-divider" />
            <div class="construct-stat">
              <span class="construct-stat-num construct-stat-accent">{donorCount.toLocaleString()}</span>
              <span class="construct-stat-label">Donors Tracked</span>
            </div>
            <div class="construct-stat-divider" />
            <div class="construct-stat">
              <span class="construct-stat-num construct-stat-accent">{verifiedCount.toLocaleString()}</span>
              <span class="construct-stat-label">Verified</span>
            </div>
          </div>
          <div class="construct-teaser">
            <div class="construct-teaser-tag">PREVIEW</div>
            <div class="construct-teaser-content">
              <div class="construct-teaser-stat">655,172x</div>
              <div class="construct-teaser-context">
                Koch Network donated <strong>$2.9M</strong> to McConnell.
                Return: <strong>$1.9 trillion</strong> in tax cuts.
                That's the highest ROI we've found. There are hundreds more.
              </div>
            </div>
          </div>
          <div class="construct-launch">
            <div class="construct-launch-text">Launching Soon</div>
            <div class="construct-contact">guerillapropaganda@proton.me</div>
          </div>
        </div>
      </div>
    )
  }

  // ─── Main landing page (brutalist v3) ─────────────────────────────
  return (
    <div class={classNames(displayClass, "lp-landing lp-v3")}>

      {/* ═══ TOP BAR ═══ */}
      <nav class="v3-topbar">
        <span class="v3-logo">The Donor Map<span class="v3-dollar">$</span></span>
        <div class="v3-nav-links">
          <a href={absHref("Politicians")}>Politicians</a>
          <a href={absHref("Donors--and--Power-Networks")}>Donors</a>
          <a href={absHref("Stories")}>Stories</a>
          <a href={absHref("Interactive")}>Interactive</a>
        </div>
      </nav>

      {/* ═══ HERO ═══ */}
      <section class="v3-hero">
        <div class="v3-hero-meta">OPEN-SOURCE DONOR INTELLIGENCE / {totalProfiles.toLocaleString()} NODES TRACKED / UPDATED DAILY</div>
        <h1 class="v3-hero-title">
          Follow the<br />
          <span class="v3-highlight-block">Money.</span>
        </h1>
        <p class="v3-hero-aside">
          A sourced database tracking how money controls American politics.
          Every profile starts with one question:{" "}
          <strong>who funds them, and what did they get?</strong>
        </p>
        <div class="v3-ticker">
          <div class="v3-tick">
            <span class="v3-tick-val" id="v3-t-profiles">0</span>
            <span class="v3-tick-label">Profiles</span>
          </div>
          <div class="v3-tick">
            <span class="v3-tick-val" id="v3-t-donations">$0</span>
            <span class="v3-tick-label">Traced</span>
          </div>
          <div class="v3-tick">
            <span class="v3-tick-val" id="v3-t-donors">0</span>
            <span class="v3-tick-label">Donors</span>
          </div>
          <div class="v3-tick">
            <span class="v3-tick-val v3-tick-red" id="v3-t-roi">0x</span>
            <span class="v3-tick-label">Highest ROI</span>
          </div>
        </div>
        <div class="v3-hero-cta">
          <a href={getHref("cross-politician-contradiction-map---the-both-sides-illusion-with-receipts")} class="v3-btn-bold">Start here</a>
          <a href={absHref("Politicians")} class="v3-btn-text">Explore the database</a>
        </div>
        {/* Hidden data attributes for JS ticker targets */}
        <span id="v3-data-profiles" data-val={totalProfiles} style={{ display: "none" }} />
        <span id="v3-data-donors" data-val={donorCount} style={{ display: "none" }} />
      </section>

      {/* ═══ RECEIPT ═══ */}
      <section class="v3-receipt">
        <div class="v3-receipt-inner">
          <div class="v3-section-tag">THE RETURN ON INVESTMENT</div>
          <div class="v3-receipt-comparison" data-scroll-reveal>
            <div class="v3-receipt-left">
              <div class="v3-receipt-num">$2.9M</div>
              <div class="v3-receipt-context"><strong>Koch Network</strong> donated to McConnell's campaigns and PACs</div>
            </div>
            <div class="v3-receipt-mid">→</div>
            <div class="v3-receipt-right">
              <div class="v3-receipt-num">$1.9T</div>
              <div class="v3-receipt-context">in tax cuts via the <strong>2017 Tax Cuts and Jobs Act</strong></div>
            </div>
          </div>
          <div class="v3-receipt-roi" data-scroll-reveal>
            <div class="v3-roi-number">655,172x</div>
            <div class="v3-roi-label">Return on political investment</div>
            <div class="v3-roi-compare">
              The S&amp;P 500 averages <strong>10% annually</strong>.
              Koch's return: <strong>65,517,200%</strong>.
            </div>
          </div>
        </div>
      </section>

      {/* ═══ THE WEB ═══ */}
      <section class="v3-web">
        <div class="v3-web-inner">
          <div class="v3-section-tag v3-tag-red">IT'S ALL CONNECTED</div>
          <h2 class="v3-web-headline">
            Same donors.<br />
            <span class="v3-dim">Both parties.</span><br />
            Same <span class="v3-red">outcomes.</span>
          </h2>
          <div class="v3-board" id="v3-board">
            <svg class="v3-board-svg" id="v3-lines"></svg>
            <div class="v3-node v3-node-donor" style={{ top: "30px", left: "50%", transform: "translateX(-50%)" }} data-n="aipac">AIPAC<span class="v3-node-amt">$100M+ deployed</span></div>
            <div class="v3-node v3-node-donor" style={{ top: "180px", left: "10%" }} data-n="goldman">Goldman Sachs<span class="v3-node-amt">$48M+ political</span></div>
            <div class="v3-node v3-node-donor" style={{ top: "180px", right: "10%", left: "auto" }} data-n="pharma">PhRMA<span class="v3-node-amt">$32M+ lobbying</span></div>
            <div class="v3-node v3-node-dem" style={{ bottom: "100px", left: "5%" }} data-n="pelosi">Pelosi (D)<span class="v3-node-amt">$3.2M from AIPAC</span></div>
            <div class="v3-node v3-node-dem" style={{ bottom: "30px", left: "25%" }} data-n="schumer">Schumer (D)<span class="v3-node-amt">$5.1M from AIPAC</span></div>
            <div class="v3-node v3-node-rep" style={{ bottom: "100px", right: "5%", left: "auto" }} data-n="cruz">Cruz (R)<span class="v3-node-amt">$1.9M from AIPAC</span></div>
            <div class="v3-node v3-node-rep" style={{ bottom: "30px", right: "25%", left: "auto" }} data-n="mcconnell">McConnell (R)<span class="v3-node-amt">$2.9M from Koch</span></div>
          </div>
          <div class="v3-pullquote" id="v3-pullquote">
            <strong>The pattern:</strong> The same donors fund politicians in both parties. Different jerseys, identical policy outcomes. The voting record proves it.
          </div>
        </div>
      </section>

      {/* ═══ THE SPLIT ═══ */}
      <section class="v3-split">
        <div class="v3-split-inner">
          <div class="v3-section-tag v3-tag-red">WHAT THEY SAY VS. WHO PAYS THEM</div>
          {splitCards.map((card) => (
            <div class="v3-split-card" data-scroll-reveal>
              <div class="v3-split-says">
                <div class="v3-split-col-label v3-label-red">WHAT THEY SAY</div>
                <div class="v3-split-name">{card.name}</div>
                <div class="v3-split-quote">{card.quote}</div>
              </div>
              <div class="v3-split-pays">
                <div class="v3-split-col-label v3-label-blue">WHO PAYS THEM</div>
                <div class="v3-split-name">Top Donors</div>
                {card.donors.map((d) => (
                  <div class="v3-donor-row">
                    <span>{d.name}</span>
                    <span class="v3-donor-amt">{d.amount}</span>
                  </div>
                ))}
              </div>
              <div class="v3-split-verdict">{card.verdict}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ═══ STATE LOOKUP ═══ */}
      <section class="v3-lookup">
        <div class="v3-lookup-inner">
          <h2 class="v3-lookup-title">Who owns <span class="v3-lookup-your">your</span> representative?</h2>
          <div class="v3-lookup-sub">PICK YOUR STATE. SEE WHO'S PAYING.</div>
          <div class="v3-states" id="v3-state-grid"></div>
          <div class="v3-result" id="v3-result">
            <div class="v3-result-tag" id="v3-result-tag">YOUR SENATORS</div>
            <div id="v3-result-senators"></div>
            <div class="v3-result-cta">
              <a href={absHref("Interactive/who-funds-your-rep")}>VIEW FULL PROFILES →</a>
            </div>
          </div>
        </div>
        {/* State data for client-side JS */}
        <script id="v3-state-data" type="application/json" dangerouslySetInnerHTML={{ __html: stateDataJson }} />
      </section>

      {/* ═══ EXPLORE ═══ */}
      <section class="v3-explore">
        <div class="v3-explore-inner">
          <div class="v3-section-tag">GO DEEPER</div>
          <div class="v3-explore-grid">
            <a href={absHref("Politicians")} class="v3-explore-cell">
              <div class="v3-explore-count v3-count-red">{politicianCount.toLocaleString()}</div>
              <div class="v3-explore-name">Politicians</div>
              <div class="v3-explore-desc">Every profile analyzed through one lens: who funds them, what the funders want, and what they got.</div>
              <span class="v3-explore-arrow">→</span>
            </a>
            <a href={absHref("Donors--and--Power-Networks")} class="v3-explore-cell">
              <div class="v3-explore-count v3-count-blue">{donorCount.toLocaleString()}</div>
              <div class="v3-explore-name">Donors & Networks</div>
              <div class="v3-explore-desc">Mega-donors, PACs, dark money networks, and the corporations that fund both parties.</div>
              <span class="v3-explore-arrow">→</span>
            </a>
            <a href={absHref("Stories")} class="v3-explore-cell">
              <div class="v3-explore-count">{storyCount.toLocaleString()}</div>
              <div class="v3-explore-name">Investigations</div>
              <div class="v3-explore-desc">Analytical deep dives tracing money across party lines.</div>
              <span class="v3-explore-arrow">→</span>
            </a>
            <a href={absHref("Lobbying-Firms--and--K-Street")} class="v3-explore-cell">
              <div class="v3-explore-count v3-count-grey">{lobbyCount.toLocaleString()}</div>
              <div class="v3-explore-name">Lobbyists & Think Tanks</div>
              <div class="v3-explore-desc">The intermediaries who deliver the ask and write the talking points.</div>
              <span class="v3-explore-arrow">→</span>
            </a>
          </div>
        </div>
      </section>

      {/* ═══ FOOTER ═══ */}
      <footer class="v3-footer">
        <span class="v3-footer-left">The Donor Map<span class="v3-dollar">$</span> — Open-source political donor intelligence</span>
        <div class="v3-footer-right">
          <a href="https://github.com/Guerillapropaganda/donor-map-site">GitHub</a>
          <a href={absHref("Interactive/about")}>About</a>
          <a href="mailto:guerillapropaganda@proton.me">Contact</a>
        </div>
      </footer>
    </div>
  )
}

// ─── Client-side JS (runs globally, slug-guarded) ──────────────────
LandingPage.afterDOMLoaded = `
(function() {
  // Only run on the index page
  var path = window.location.pathname.replace(/\\/$/,'');
  if (path !== '' && path !== '/' && path !== '/index') return;
  // Don't run on construction page
  if (document.querySelector('.lp-construction')) return;

  // ─── Ticker animation ───
  function animateVal(el, end, dur, prefix, suffix) {
    prefix = prefix || ''; suffix = suffix || '';
    var t0 = performance.now();
    function tick(now) {
      var p = Math.min((now - t0) / dur, 1);
      var e = 1 - Math.pow(1 - p, 3);
      var v = Math.floor(end * e);
      if (prefix === '$') {
        el.textContent = v >= 1e9 ? '$' + (v/1e9).toFixed(1) + 'B' : v >= 1e6 ? '$' + (v/1e6).toFixed(1) + 'M' : '$' + v.toLocaleString();
      } else {
        el.textContent = prefix + v.toLocaleString() + suffix;
      }
      if (p < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  var profilesEl = document.getElementById('v3-t-profiles');
  var donationsEl = document.getElementById('v3-t-donations');
  var donorsEl = document.getElementById('v3-t-donors');
  var roiEl = document.getElementById('v3-t-roi');
  var profilesData = document.getElementById('v3-data-profiles');
  var donorsData = document.getElementById('v3-data-donors');

  if (profilesEl && donationsEl && donorsEl && roiEl) {
    var pCount = profilesData ? parseInt(profilesData.getAttribute('data-val')) || 857 : 857;
    var dCount = donorsData ? parseInt(donorsData.getAttribute('data-val')) || 441 : 441;
    setTimeout(function() {
      animateVal(profilesEl, pCount, 2000);
      animateVal(donationsEl, 2400000000, 2500, '$');
      animateVal(donorsEl, dCount, 2000);
      animateVal(roiEl, 655172, 3000, '', 'x');
    }, 800);
  }

  // ─── Scroll reveals ───
  var revealEls = document.querySelectorAll('[data-scroll-reveal]');
  if (revealEls.length) {
    var obs = new IntersectionObserver(function(entries) {
      entries.forEach(function(e) {
        if (e.isIntersecting) {
          e.target.style.opacity = '1';
          e.target.style.transform = 'none';
        }
      });
    }, { threshold: 0.15 });
    revealEls.forEach(function(el) {
      el.style.opacity = '0';
      el.style.transform = 'translateY(16px)';
      el.style.transition = 'all 0.6s ease';
      obs.observe(el);
    });
  }

  // ─── Connection board ───
  var board = document.getElementById('v3-board');
  if (board) {
    var boardObs = new IntersectionObserver(function(entries) {
      entries.forEach(function(e) {
        if (e.isIntersecting) { revealBoard(); boardObs.unobserve(e.target); }
      });
    }, { threshold: 0.25 });
    boardObs.observe(board);
  }

  function revealBoard() {
    var nodes = document.querySelectorAll('.v3-node');
    nodes.forEach(function(n, i) {
      setTimeout(function() { n.classList.add('v3-node-visible'); }, i * 180);
    });
    setTimeout(function() {
      drawLines();
      var pq = document.getElementById('v3-pullquote');
      if (pq) setTimeout(function() { pq.classList.add('v3-pullquote-visible'); }, 600);
    }, nodes.length * 180 + 200);
  }

  function drawLines() {
    var board = document.getElementById('v3-board');
    var svg = document.getElementById('v3-lines');
    if (!board || !svg) return;
    var r = board.getBoundingClientRect();
    var conns = [['aipac','pelosi'],['aipac','schumer'],['aipac','cruz'],['goldman','schumer'],['goldman','mcconnell'],['pharma','pelosi'],['pharma','cruz']];
    svg.innerHTML = '';
    conns.forEach(function(pair, i) {
      var ea = document.querySelector('[data-n="'+pair[0]+'"]');
      var eb = document.querySelector('[data-n="'+pair[1]+'"]');
      if (!ea || !eb) return;
      var ra = ea.getBoundingClientRect(), rb = eb.getBoundingClientRect();
      var l = document.createElementNS('http://www.w3.org/2000/svg','line');
      l.setAttribute('x1', ra.left + ra.width/2 - r.left);
      l.setAttribute('y1', ra.top + ra.height/2 - r.top);
      l.setAttribute('x2', rb.left + rb.width/2 - r.left);
      l.setAttribute('y2', rb.top + rb.height/2 - r.top);
      svg.appendChild(l);
      setTimeout(function() { l.classList.add('v3-line-visible'); }, i * 120);
    });
  }

  // ─── State lookup ───
  var stateDataEl = document.getElementById('v3-state-data');
  var stateGrid = document.getElementById('v3-state-grid');
  var stateData = {};
  if (stateDataEl) {
    try { stateData = JSON.parse(stateDataEl.textContent); } catch(e) {}
  }

  var states = ['AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY'];
  var activeSt = null;

  if (stateGrid) {
    states.forEach(function(s) {
      var b = document.createElement('button');
      b.className = 'v3-st';
      b.textContent = s;
      b.onclick = function() {
        if (activeSt) activeSt.classList.remove('v3-st-active');
        b.classList.add('v3-st-active');
        activeSt = b;
        showState(s);
      };
      stateGrid.appendChild(b);
    });
  }

  function showState(s) {
    var res = document.getElementById('v3-result');
    var tag = document.getElementById('v3-result-tag');
    var sen = document.getElementById('v3-result-senators');
    if (!res || !tag || !sen) return;
    var d = stateData[s];
    tag.textContent = s + ' SENATORS';
    if (!d || !d.length) {
      sen.innerHTML = '<div class="v3-senator-row"><span style="color:#999">No senator data available for this state yet.</span></div>';
    } else {
      sen.innerHTML = d.map(function(x) {
        return '<div class="v3-senator-row"><span class="v3-senator-name v3-senator-'+x.p+'">'+x.n+'</span><span class="v3-senator-donors">'+x.d+'</span></div>';
      }).join('');
    }
    res.className = 'v3-result v3-result-active';
  }
})();
`

// Styles are in quartz/styles/custom.scss (component CSS doesn't propagate through ConditionalRender)

export default (() => LandingPage) satisfies QuartzComponentConstructor
