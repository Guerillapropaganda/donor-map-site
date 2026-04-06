import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"

const MobileNav: QuartzComponent = ({ cfg }: QuartzComponentProps) => {
  const baseUrl = cfg.baseUrl ?? ""
  const slashIdx = baseUrl.indexOf("/")
  const basePath = slashIdx >= 0 ? "/" + baseUrl.substring(slashIdx + 1) : ""

  const navItems = [
    { label: "Home", icon: "H", href: `${basePath}/` },
    { label: "Politicians", icon: "P", href: `${basePath}/Politicians` },
    { label: "Donors", icon: "D", href: `${basePath}/Donors--and--Power-Networks` },
    { label: "Stories", icon: "S", href: `${basePath}/Stories` },
    { label: "News", icon: "N", href: `${basePath}/Events` },
  ]

  return (
    <nav class="mobile-bottom-nav">
      {navItems.map((item) => (
        <a href={item.href} class="mobile-nav-item">
          <span class="mobile-nav-icon">{item.icon}</span>
          <span class="mobile-nav-label">{item.label}</span>
        </a>
      ))}
    </nav>
  )
}

MobileNav.css = `
/* Mobile bottom nav — only visible on phones */
.mobile-bottom-nav {
  display: none;
}

@media (max-width: 800px) {
  .mobile-bottom-nav {
    display: flex;
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    width: 100%;
    box-sizing: border-box;
    z-index: 999;
    background: rgba(12, 12, 15, 0.95);
    backdrop-filter: blur(12px);
    border-top: 1px solid #1e1e28;
    padding: 6px 0;
    padding-bottom: calc(6px + env(safe-area-inset-bottom));
    justify-content: space-around;
    align-items: center;
  }

  .mobile-nav-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
    text-decoration: none !important;
    border: none !important;
    padding: 4px 8px;
    min-width: 56px;
    transition: color 0.15s;
  }

  .mobile-nav-icon {
    font-family: 'Space Mono', monospace;
    font-size: 16px;
    font-weight: 700;
    color: #5b8dce;
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 6px;
    background: rgba(91, 141, 206, 0.1);
  }

  .mobile-nav-label {
    font-family: 'Space Mono', monospace;
    font-size: 10px;
    letter-spacing: 0.5px;
    color: #8a8a96;
  }

  .mobile-nav-item:hover .mobile-nav-icon,
  .mobile-nav-item:active .mobile-nav-icon {
    background: rgba(91, 141, 206, 0.2);
    color: #8bb5e8;
  }

  /* Add bottom padding to page content so it doesn't get hidden behind nav */
  footer {
    padding-bottom: 70px !important;
  }
}
`

export default (() => MobileNav) satisfies QuartzComponentConstructor
