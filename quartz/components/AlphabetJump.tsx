import { QuartzComponent, QuartzComponentConstructor } from "./types"

const AlphabetJump: QuartzComponent = () => {
  return (
    <nav class="alphabet-jump" aria-label="Jump to letter" hidden>
      <div class="alphabet-jump-inner" />
    </nav>
  )
}

AlphabetJump.afterDOMLoaded = `
(function() {
  const nav = document.querySelector(".alphabet-jump")
  if (!nav) return
  const list = document.querySelector("ul.section-ul")
  if (!list) return

  const items = Array.from(list.querySelectorAll(":scope > li.section-li"))
  if (items.length < 8) return // skip for tiny lists

  // Map first-letter -> first matching item
  const letterMap = new Map()
  items.forEach((li) => {
    const titleEl = li.querySelector("h3 a") || li.querySelector("h3")
    if (!titleEl) return
    const title = (titleEl.textContent || "").trim()
    if (!title) return
    // Strip leading articles and non-alpha chars
    const clean = title.replace(/^(The |A |An |_+)/i, "").trim()
    const firstChar = clean.charAt(0).toUpperCase()
    const letter = /[A-Z]/.test(firstChar) ? firstChar : "#"
    if (!letterMap.has(letter)) {
      letterMap.set(letter, li)
    }
  })

  // Build nav buttons
  const inner = nav.querySelector(".alphabet-jump-inner")
  const letters = ["#", ...Array.from({ length: 26 }, (_, i) => String.fromCharCode(65 + i))]
  letters.forEach((l) => {
    const btn = document.createElement("button")
    btn.type = "button"
    btn.textContent = l
    btn.className = "alphabet-jump-btn"
    if (letterMap.has(l)) {
      btn.addEventListener("click", () => {
        const target = letterMap.get(l)
        if (target) {
          target.scrollIntoView({ behavior: "smooth", block: "start" })
        }
      })
    } else {
      btn.disabled = true
    }
    inner.appendChild(btn)
  })

  nav.hidden = false
})()
`

AlphabetJump.css = `
.alphabet-jump {
  margin: 0 0 1.2rem 0;
  padding: 0.5rem 0;
  border-top: 1px solid #ddd;
  border-bottom: 1px solid #ddd;
}
.alphabet-jump-inner {
  display: flex;
  flex-wrap: wrap;
  gap: 2px;
  justify-content: flex-start;
}
.alphabet-jump-btn {
  background: transparent;
  border: none;
  color: #999;
  font-family: "Space Mono", monospace;
  font-size: 12px;
  padding: 4px 8px;
  cursor: pointer;
  border-radius: 0;
  min-width: 24px;
  transition: background 0.12s, color 0.12s;
}
.alphabet-jump-btn:hover:not(:disabled) {
  background: #ddd;
  color: #0a0a0a;
}
.alphabet-jump-btn:disabled {
  color: #999;
  cursor: default;
}
@media (max-width: 800px) {
  .alphabet-jump-btn {
    font-size: 11px;
    padding: 3px 6px;
    min-width: 20px;
  }
}
`

export default (() => AlphabetJump) satisfies QuartzComponentConstructor
