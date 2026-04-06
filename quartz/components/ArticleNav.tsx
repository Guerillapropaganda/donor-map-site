import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"
import { resolveRelative, simplifySlug } from "../util/path"

const ArticleNav: QuartzComponent = ({ fileData, allFiles }: QuartzComponentProps) => {
  const currentSlug = fileData.slug ?? ""
  const currentSimple = simplifySlug(currentSlug)

  // Find the parent folder of this page
  const lastSlash = currentSlug.lastIndexOf("/")
  if (lastSlash < 0) return null // root-level pages don't get prev/next
  const parentFolder = currentSlug.substring(0, lastSlash + 1).toLowerCase()

  // Get siblings in the same folder, sorted by title
  const siblings = allFiles
    .filter((f) => {
      const slug = (f.slug ?? "").toLowerCase()
      const fLastSlash = slug.lastIndexOf("/")
      if (fLastSlash < 0) return false
      const fParent = slug.substring(0, fLastSlash + 1)
      return fParent === parentFolder && slug !== "index" && !slug.endsWith("/index")
    })
    .sort((a, b) => {
      const aTitle = (a.frontmatter?.title ?? a.slug ?? "").toLowerCase()
      const bTitle = (b.frontmatter?.title ?? b.slug ?? "").toLowerCase()
      return aTitle.localeCompare(bTitle)
    })

  if (siblings.length <= 1) return null

  const currentIndex = siblings.findIndex(
    (f) => simplifySlug(f.slug!) === currentSimple,
  )
  if (currentIndex < 0) return null

  const prev = currentIndex > 0 ? siblings[currentIndex - 1] : null
  const next = currentIndex < siblings.length - 1 ? siblings[currentIndex + 1] : null

  if (!prev && !next) return null

  return (
    <nav class="article-nav">
      {prev ? (
        <a href={resolveRelative(fileData.slug!, prev.slug!)} class="article-nav-link article-nav-prev">
          <span class="article-nav-direction">Previous</span>
          <span class="article-nav-title">{prev.frontmatter?.title ?? prev.slug}</span>
        </a>
      ) : (
        <div class="article-nav-spacer" />
      )}
      {next ? (
        <a href={resolveRelative(fileData.slug!, next.slug!)} class="article-nav-link article-nav-next">
          <span class="article-nav-direction">Next</span>
          <span class="article-nav-title">{next.frontmatter?.title ?? next.slug}</span>
        </a>
      ) : (
        <div class="article-nav-spacer" />
      )}
    </nav>
  )
}

ArticleNav.css = `
.article-nav {
  display: flex;
  gap: 12px;
  margin-top: 40px;
  padding-top: 20px;
  border-top: 1px solid #1e1e28;
}

.article-nav-spacer {
  flex: 1;
}

.article-nav-link {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 14px 16px;
  border-radius: 6px;
  border: 1px solid #1e1e28;
  background: #0e0e14;
  text-decoration: none !important;
  transition: border-color 0.15s, background 0.15s;
}

.article-nav-link:hover {
  border-color: rgba(91, 141, 206, 0.3);
  background: rgba(91, 141, 206, 0.04);
}

.article-nav-prev {
  align-items: flex-start;
}

.article-nav-next {
  align-items: flex-end;
  text-align: right;
}

.article-nav-direction {
  font-family: 'Space Mono', monospace;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 1.5px;
  text-transform: uppercase;
  color: #5b8dce;
}

.article-nav-title {
  font-size: 13px;
  color: #b4b4bc;
  line-height: 1.3;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

@media (max-width: 800px) {
  .article-nav {
    flex-direction: column;
    gap: 8px;
    margin-top: 24px;
    padding-bottom: 20px;
  }

  .article-nav-next {
    align-items: flex-start;
    text-align: left;
  }
}
`

export default (() => ArticleNav) satisfies QuartzComponentConstructor
