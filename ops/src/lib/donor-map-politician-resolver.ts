/**
 * Politician name resolution for STOCK Act / PTR data sources.
 *
 * Per ADR-0024: when a STOCK Act endpoint sees a filer name like
 * "Hon. Nancy Pelosi" or "William F Hagerty, IV", we want to resolve
 * it to the canonical entity ("Nancy Pelosi" / "Bill Hagerty") so
 * downstream display and profile-link logic stays consistent across
 * the site. The librarian already carries every plausible name form
 * for every politician in legislator-registry — that's its whole point.
 *
 * Resolution order:
 *   1. Strip "Hon. " prefix.
 *   2. Try the librarian by name (this catches every legislator-registry
 *      name form: name_official, first+last, nickname+last, etc.).
 *   3. If unresolvable, fall back to the local hand-curated overrides
 *      and the normalizer for typo-y / OCR'd PTR strings.
 *
 * The override table is intentionally narrow — only entries where the
 * PTR filing name diverges so far from the canonical that the librarian
 * can't bridge it (e.g. "Felix Barry Moore" → "Barry Moore"). Most
 * common forms ("RICHARD BLUMENTHAL", "William F Hagerty, IV") are
 * already librarian aliases via the registry.
 */
import { getGraph } from "./donor-map-singleton"

// ─── Local-only fallbacks (kept narrow) ────────────────────────────────
//
// Only entries where the PTR string diverges enough from the canonical
// that registry name forms can't bridge it. New entries here represent
// either a registry gap or a genuinely-unmappable PTR transcription.

const NAME_OVERRIDES: Record<string, string> = {
  "Barbara J Honorable Comstock": "Barbara Comstock",
  "Barbara J. Comstock": "Barbara Comstock",
  "Carlos Mr Curbelo": "Carlos Curbelo",
  "Scott Scott Franklin": "Scott Franklin",
  "Scott Mr Franklin": "Scott Franklin",
  "Mark Dr Green": "Mark Green",
  "Kim Dr Schrier": "Kim Schrier",
  "Marjorie Taylor Mrs Greene": "Marjorie Taylor Greene",
  "Neal Patrick MD, Facs Dunn": "Neal Dunn",
  "Neal Patrick MD, FACS Dunn": "Neal Dunn",
  "Neal P. Dunn": "Neal Dunn",
  "James E Hon Banks": "James Banks",
  "James E. Banks": "James Banks",
  "Nicholas Van Taylor": "Van Taylor",
  "Nicholas V. Taylor": "Van Taylor",
  "Donald Sternoff Beyer Jr": "Don Beyer",
  "Donald Sternoff Honorable Beyer Jr": "Don Beyer",
  "Donald Sternoff Beyer Jr.": "Don Beyer",
  'Robert C. "Bobby" Scott': "Bobby Scott",
  "John J. Duncan Jr.": "John Duncan Jr",
  "John J. Duncan Jr": "John Duncan Jr",
  "Thomas H. Kean Jr.": "Tom Kean Jr",
  "Thomas H. Kean Jr": "Tom Kean Jr",
  "Thomas H. Kean": "Tom Kean",
  "Harley E. Rouda Jr.": "Harley Rouda",
  "Harley E. Rouda Jr": "Harley Rouda",
  "W. Greg Steube": "Greg Steube",
  "Thomas C MacArthur": "Tom MacArthur",
  "Deborah A MacArthur": "Tom MacArthur", // spouse filings under same account
  "Rudy C. Yakym III": "Rudy Yakym",
  "Rudy Yakym III": "Rudy Yakym",
  "Joseph P. Kennedy III": "Joe Kennedy",
  "Curtis J. Clawson": "Curt Clawson",
  "K. Michael Conaway": "Mike Conaway",
  "David Cheston Rouzer": "David Rouzer",
  "Rodney Leland Blum": "Rod Blum",
  "Michael A. Collins Jr": "Mike Collins",
  "Michael A. Collins": "Mike Collins",
  "Thomas R. Suozzi": "Tom Suozzi",
  "Thomas Suozzi": "Tom Suozzi",
  "Patrick Erin Murphy": "Patrick Murphy",
  "John Thomas Graves Jr.": "Tom Graves",
  "Tom Thomas Graves Jr.": "Tom Graves",
  "Felix Barry Moore": "Barry Moore",
  "Christopher L. Jacobs": "Chris Jacobs",
  "Deborah K. Ross": "Deborah Ross",
  "Alan Mark Grayson": "Alan Grayson",
  "David A. Trott": "Dave Trott",
  "RICHARD BLUMENTHAL": "Richard Blumenthal",
  "William F Hagerty, IV": "Bill Hagerty",
  "Markwayne Mullin": "Markwayne Mullin",
  "Thomas H Tuberville": "Tommy Tuberville",
  "Shelley M Capito": "Shelley Moore Capito",
}

function normalizePoliticianName(raw: string): string {
  let name = raw.trim()
  name = name.replace(/^(Hon\.|Mr\.|Mrs\.|Ms\.|Dr\.|Rep\.|Sen\.)\s*/i, "")
  name = name.replace(/\s+(Honorable|Hon|Mr|Mrs|Dr|MD|FACS)\s*/gi, " ")
  name = name.replace(/,?\s*(Jr\.?|Sr\.?|III|IV|II)$/i, (_, suf) => " " + suf.replace(".", ""))
  name = name.replace(/\s+[A-Z]\.\s+/g, " ")
  name = name.replace(/^[A-Z]\.\s+/, "")
  name = name.replace(/\s+/g, " ").trim()
  return name
}

// ─── Public API ────────────────────────────────────────────────────────

export interface ResolvedPolitician {
  /** Canonical display name. Always set. */
  canonical: string
  /** Profile path if the politician has a vault profile, else null. */
  profile_path: string | null
  /** Where the canonical name came from. Useful for debugging diffs. */
  resolved_via: "librarian" | "override" | "normalizer-fallback"
}

/**
 * Resolve a PTR filer name to a canonical politician identity.
 *
 * Never throws — falls back to the local normalizer for unknown names
 * so STOCK Act endpoints keep producing rows even for filer names the
 * librarian doesn't recognize (typos, OCR artifacts, etc.).
 */
export function resolvePoliticianName(raw: string): ResolvedPolitician {
  if (!raw) return { canonical: "Unknown", profile_path: null, resolved_via: "normalizer-fallback" }
  const stripped = raw.replace(/^Hon\.\s*/, "")

  // 1. Hand-curated overrides (kept narrow — registry-gap workarounds)
  const override = NAME_OVERRIDES[raw] ?? NAME_OVERRIDES[stripped]
  if (override) {
    // Also try to attach a profile_path via librarian on the override target.
    const g = getGraph()
    const node = g ? g.resolver.tryResolve({ kind: "name", value: override }) : null
    return { canonical: override, profile_path: node?.profile_path ?? null, resolved_via: "override" }
  }

  // 2. Librarian — covers the bulk of registry name forms (name_official,
  //    nickname+last, first+last, first+middle+last) for every active +
  //    historical legislator.
  const g = getGraph()
  if (g) {
    const node = g.resolver.tryResolve({ kind: "name", value: stripped })
    if (node && (node.type === "politician" || node.type === "entity" || node.profile_path)) {
      return { canonical: node.name, profile_path: node.profile_path, resolved_via: "librarian" }
    }
  }

  // 3. Normalizer fallback — last resort for unrecognized strings
  return { canonical: normalizePoliticianName(stripped), profile_path: null, resolved_via: "normalizer-fallback" }
}

/** Convenience: just the canonical name. */
export function canonicalPoliticianName(raw: string): string {
  return resolvePoliticianName(raw).canonical
}
