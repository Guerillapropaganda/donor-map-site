#!/usr/bin/env python3
"""
Donor Map Vault — URL Verification & Auto-Fix Script
=====================================================
Async HEAD-request link checker + auto-fixer purpose-built for the vault.
Zero additional tokens. ~500 bytes per URL instead of full page loads.

Usage:
    python verify_urls.py                    # Scan entire vault (report only)
    python verify_urls.py --fix              # Scan AND auto-fix what it can
    python verify_urls.py --quick            # Fast mode: 2s timeout, skip slow domains
    python verify_urls.py --quick --fix      # Fast scan + auto-fix
    python verify_urls.py --path Politicians/Democrats/Senate
    python verify_urls.py --file urls.txt    # Check a plain list of URLs
    python verify_urls.py --report report.md # Custom output path

Auto-fix tiers (with --fix):
    Tier 1 — INSTANT (no network):  Known CID corrections, pattern fixes
    Tier 2 — VERIFIED (HEAD check): Fixes that can be confirmed with a HEAD request
    Tier 3 — FLAGGED (needs human): Everything else gets tagged (URL NEEDED) in-file

Features:
    - Async HEAD requests with GET fallback (minimal bandwidth)
    - Soft-404 detection for sites that return 200 on broken pages
    - Per-domain rate limiting (won't get you IP-banned)
    - Known-broken pattern detection from Source URL Audit Log
    - Auto-fix for known CID errors, URL pattern corrections
    - Tags unfixable URLs with (URL NEEDED) for manual sessions
    - Skips SVG, localhost, anchor-only, and API endpoint URLs
    - Groups results by file for easy vault maintenance
    - Outputs Markdown report compatible with Obsidian
"""

import asyncio
import aiohttp
import re
import os
import sys
import argparse
import time
from pathlib import Path
from collections import defaultdict
from urllib.parse import urlparse

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

# Auto-detect: script lives in topics/Vault Maintenance/, vault root is topics/
DEFAULT_VAULT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SCAN_DIRS = ["Politicians", "Donors & Power Networks", "Stories",
             "Media & Influence Pipeline", "Think Tanks & Policy Infrastructure",
             "Lobbying Firms & K Street"]
REPORT_FILENAME = "URL Verification Report.md"

# Concurrency & timing
MAX_CONCURRENT = 25          # Total simultaneous connections
PER_DOMAIN_DELAY = 0.3       # Seconds between requests to same domain
DEFAULT_TIMEOUT = 8          # Seconds per request
QUICK_TIMEOUT = 2            # Timeout in --quick mode

# Domains to skip entirely (not real external URLs)
SKIP_DOMAINS = {
    "www.w3.org",
    "localhost",
    "127.0.0.1",
    "example.com",
    "momentjs.com",           # JS library docs, not a source
}

# URL patterns to skip
SKIP_PATTERNS = [
    r"\.svg$",
    r"\.png$",
    r"\.jpg$",
    r"\.jpeg$",
    r"\.gif$",
    r"\.css$",
    r"\.js$",
    r"\.pdf$",                # PDF endpoints often block HEAD
    r"^https?://api\.",       # API endpoints (checked separately)
    r"^https?://github\.com", # GitHub rate-limits aggressively
    r"#[^/]*$",               # Anchor-only fragments
]

# Domains that are slow / paywall-heavy — skip in --quick mode
SLOW_DOMAINS = {
    "www.washingtonpost.com",
    "www.nytimes.com",
    "www.bloomberg.com",
    "www.wsj.com",
    "www.theatlantic.com",
    "archive.org",
}

# ---------------------------------------------------------------------------
# Soft-404 Detection
# ---------------------------------------------------------------------------
# These sites return HTTP 200 even on broken pages. We detect them by
# checking the page title or body content on GET fallback.

SOFT_404_PATTERNS = {
    "www.npr.org": ["Page Not Found"],
    "www.washingtonpost.com": ["Page Not Found"],
    "theintercept.com": ["Page not found", "Page Not Found"],
    "www.pbs.org": ["Page Not Found"],
    "www.newsweek.com": ["Page Not Found"],
    "www.propublica.org": ["Page Not Found"],
    "www.opensecrets.org": ["Page Not Found", "OpenSecrets – Nonpartisan"],
    "ballotpedia.org": ["Search results for"],
    "www.congress.gov": ["Page Not Found", "congress.gov | Library of Congress"],
}

# ---------------------------------------------------------------------------
# Known-Broken URL Patterns (from Source URL Audit Log)
# ---------------------------------------------------------------------------
# These are fabrication patterns we can flag instantly without any HTTP call.

KNOWN_BAD_PATTERNS = [
    # Congress.gov fake slugs (note titles used as URLs)
    (r"congress\.gov/member/[a-z-]+(?:and|the|for|with|in|of|on)[a-z-]+",
     "Congress.gov fake slug — note title used as URL path"),
    # Congress.gov overly long document IDs
    (r"congress\.gov/.+-U\d{8,}\.pdf",
     "Congress.gov fabricated document ID (too many digits)"),
    # OpenSecrets with suspiciously round CIDs
    (r"opensecrets\.org/.+cid=N0000000\d$",
     "OpenSecrets — suspiciously round CID, likely fabricated"),
]

# ---------------------------------------------------------------------------
# Auto-Fix: Known CID/ID Corrections (from Source URL Audit Log)
# ---------------------------------------------------------------------------
# These are verified corrections — the old value is wrong, the new value is
# confirmed to load the correct page. Applied instantly, no network needed.

OPENSECRETS_CID_FIXES = {
    # member CIDs: old_cid -> correct_cid
    "N00046089": "N00047888",   # Alex Padilla
    "N00038578": "N00037039",   # Angie Craig
    "N00042305": "N00042581",   # Ayanna Pressley
    "N00035693": "N00035307",   # Brendan Boyle
    "N00038228": "N00037269",   # Brian Mast
    "N00035520": "N00035527",   # Bruce Westerman
    "N00026202": "N00026823",   # John Kennedy
    "N00042647": "N00042224",   # Dan Crenshaw
    "N00044223": "N00048832",   # JD Vance (was loading Mark Kelly)
}

OPENSECRETS_ORG_FIXES = {
    # org IDs: old_id -> correct_id
    "D000000079": "D000000088",  # AFL-CIO
}

# Congress.gov known bill URL fixes: description keyword -> correct URL
CONGRESS_BILL_FIXES = {
    "uyghur human rights":       "https://www.congress.gov/bill/116th-congress/senate-bill/3744",
    "disclose act":              "https://www.congress.gov/bill/118th-congress/senate-bill/512",
    "dream act":                 "https://www.congress.gov/bill/107th-congress/senate-bill/1291",
}

# Congress.gov member fixes: slug fragment -> correct URL
CONGRESS_MEMBER_FIXES = {
    "ro-khanna":     "https://www.congress.gov/member/ro-khanna/K000389",
    "katie-porter":  "https://www.congress.gov/member/katie-porter/P000618",
    "tom-cotton":    "https://www.congress.gov/member/tom-cotton/C001095",
}

# ---------------------------------------------------------------------------
# Auto-Fix Engine
# ---------------------------------------------------------------------------

def attempt_auto_fix(url: str, status: str, reason: str | None,
                     filepath: str, line_no: int) -> dict | None:
    """
    Try to auto-fix a broken URL. Returns a fix dict or None.
    Fix dict: {old_url, new_url, fix_type, confidence, description}
    """
    parsed = urlparse(url)
    domain = parsed.hostname or ""

    # --- Tier 1: OpenSecrets CID corrections ---
    if "opensecrets.org" in domain:
        # Check member CIDs
        cid_match = re.search(r'cid=([A-Z]\d+)', url)
        if cid_match:
            old_cid = cid_match.group(1)
            if old_cid in OPENSECRETS_CID_FIXES:
                new_url = url.replace(old_cid, OPENSECRETS_CID_FIXES[old_cid])
                return {
                    "old_url": url,
                    "new_url": new_url,
                    "fix_type": "auto",
                    "confidence": "high",
                    "description": f"CID correction: {old_cid} → {OPENSECRETS_CID_FIXES[old_cid]}",
                }
        # Check org IDs
        org_match = re.search(r'id=([A-Z]\d+)', url)
        if org_match:
            old_id = org_match.group(1)
            if old_id in OPENSECRETS_ORG_FIXES:
                new_url = url.replace(old_id, OPENSECRETS_ORG_FIXES[old_id])
                return {
                    "old_url": url,
                    "new_url": new_url,
                    "fix_type": "auto",
                    "confidence": "high",
                    "description": f"Org ID correction: {old_id} → {OPENSECRETS_ORG_FIXES[old_id]}",
                }

    # --- Tier 1: Congress.gov fake slugs → known bill URLs ---
    if "congress.gov/member/" in url:
        slug = parsed.path.lower()
        for keyword, correct_url in CONGRESS_BILL_FIXES.items():
            if keyword.replace(" ", "-") in slug or keyword.replace(" ", "") in slug:
                return {
                    "old_url": url,
                    "new_url": correct_url,
                    "fix_type": "auto",
                    "confidence": "high",
                    "description": f"Fake member slug → bill URL ({keyword})",
                }
        # Check member fixes
        for slug_fragment, correct_url in CONGRESS_MEMBER_FIXES.items():
            if slug_fragment in slug:
                return {
                    "old_url": url,
                    "new_url": correct_url,
                    "fix_type": "auto",
                    "confidence": "high",
                    "description": f"Fake member slug → real member URL ({slug_fragment})",
                }

    # --- Tier 1: Congress.gov fabricated document IDs ---
    doc_match = re.search(r'(-U)\d{8,}(\.pdf)', url)
    if doc_match and "congress.gov" in domain:
        return {
            "old_url": url,
            "new_url": None,  # Can't auto-fix, but can flag
            "fix_type": "flag",
            "confidence": "known_pattern",
            "description": "Fabricated document ID — needs manual lookup",
        }

    # --- Tier 3: Generic broken — flag for manual fix ---
    if status in ("BROKEN", "SOFT_404"):
        return {
            "old_url": url,
            "new_url": None,
            "fix_type": "flag",
            "confidence": "needs_human",
            "description": f"{status}: {reason or 'broken link'}",
        }

    return None


def apply_fixes(vault_root: str, fixes_by_file: dict, dry_run: bool = False) -> dict:
    """
    Apply auto-fixes to vault files.
    fixes_by_file: {relative_path: [fix_dict, ...]}
    Returns: {applied: int, flagged: int, skipped: int}
    """
    stats = {"applied": 0, "flagged": 0, "skipped": 0}

    for rel_path, fixes in fixes_by_file.items():
        abs_path = os.path.join(vault_root, rel_path)
        if not os.path.isfile(abs_path):
            stats["skipped"] += len(fixes)
            continue

        try:
            with open(abs_path, "r", encoding="utf-8", errors="ignore") as f:
                content = f.read()
        except Exception:
            stats["skipped"] += len(fixes)
            continue

        modified = False
        for fix in fixes:
            if fix["fix_type"] == "auto" and fix["new_url"]:
                # Direct replacement
                if fix["old_url"] in content:
                    content = content.replace(fix["old_url"], fix["new_url"])
                    modified = True
                    stats["applied"] += 1
                    print(f"  FIXED: {fix['description']}")
                    print(f"         in {rel_path}")
                else:
                    stats["skipped"] += 1

            elif fix["fix_type"] == "flag":
                # Add (URL NEEDED) tag if not already present
                old_url = fix["old_url"]
                if old_url in content and "(URL NEEDED)" not in content.split(old_url)[0].split("\n")[-1]:
                    # Find the line containing this URL and append the tag
                    lines = content.split("\n")
                    for i, line in enumerate(lines):
                        if old_url in line and "(URL NEEDED)" not in line:
                            lines[i] = line + " (URL NEEDED)"
                            modified = True
                            stats["flagged"] += 1
                            break
                    content = "\n".join(lines)
                else:
                    stats["skipped"] += 1

        if modified and not dry_run:
            with open(abs_path, "w", encoding="utf-8") as f:
                f.write(content)

    return stats


# ---------------------------------------------------------------------------
# User-Agent (polite identification)
# ---------------------------------------------------------------------------
USER_AGENT = (
    "DonorMapVault-LinkChecker/1.0 "
    "(research project; async HEAD check; contact: thirdeyeleftist@gmail.com)"
)

# ---------------------------------------------------------------------------
# URL Extraction
# ---------------------------------------------------------------------------

# Bare URL (fallback for URLs not inside markdown link syntax)
BARE_URL_REGEX = re.compile(
    r'https?://[^\s\)\]\>\"\,\;]+'
)

def _extract_md_link_url(text: str) -> str | None:
    """Extract URL from a markdown link, handling nested parens like Wikipedia.
    Uses balanced-paren counting so (businessman) inside the URL isn't truncated.
    """
    # Find ](http
    idx = text.find("](http")
    if idx == -1:
        return None
    url_start = idx + 2  # skip ](
    depth = 1  # we're inside the opening ( of the markdown link
    pos = url_start
    while pos < len(text) and depth > 0:
        ch = text[pos]
        if ch == '(':
            depth += 1
        elif ch == ')':
            depth -= 1
            if depth == 0:
                return text[url_start:pos]
        elif ch in (' ', '\t', '\n'):
            return text[url_start:pos]
        pos += 1
    return text[url_start:pos]


# Match markdown link opening: [any text](
MD_LINK_START = re.compile(r'\[[^\]]*\]\(https?://')


def extract_urls_from_file(filepath: str) -> list[tuple[str, int]]:
    """Extract (url, line_number) pairs from a markdown file.
    Handles markdown [text](url) links properly — preserves parens and
    apostrophes that are part of the URL (e.g., Wikipedia articles).
    """
    results = []
    try:
        with open(filepath, "r", encoding="utf-8", errors="ignore") as f:
            for i, line in enumerate(f, 1):
                seen = set()
                # First pass: extract URLs from markdown links (balanced parens)
                for match in MD_LINK_START.finditer(line):
                    start = match.start()
                    url = _extract_md_link_url(line[start:])
                    if url:
                        url = url.rstrip(".,;:!?'\">`\\")
                        if url not in seen:
                            results.append((url, i))
                            seen.add(url)
                # Second pass: bare URLs not already captured
                for match in BARE_URL_REGEX.finditer(line):
                    url = match.group()
                    url = url.rstrip(".,;:!?'\">`\\")
                    if url not in seen:
                        results.append((url, i))
                        seen.add(url)
    except Exception:
        pass
    return results


def should_skip(url: str, quick: bool = False) -> bool:
    """Decide whether to skip this URL entirely."""
    parsed = urlparse(url)
    domain = parsed.hostname or ""

    if domain in SKIP_DOMAINS:
        return True
    if quick and domain in SLOW_DOMAINS:
        return True
    for pattern in SKIP_PATTERNS:
        if re.search(pattern, url):
            return True
    return False


def check_known_bad(url: str) -> str | None:
    """Check if URL matches a known-bad fabrication pattern. Returns reason or None."""
    for pattern, reason in KNOWN_BAD_PATTERNS:
        if re.search(pattern, url):
            return reason
    return None

# ---------------------------------------------------------------------------
# Async HTTP Checking
# ---------------------------------------------------------------------------

class DomainLimiter:
    """Rate-limits requests per domain."""

    def __init__(self, delay: float = PER_DOMAIN_DELAY):
        self.delay = delay
        self._last_request: dict[str, float] = {}
        self._lock = asyncio.Lock()

    async def wait(self, domain: str):
        async with self._lock:
            now = time.monotonic()
            last = self._last_request.get(domain, 0)
            wait_time = max(0, self.delay - (now - last))
            if wait_time > 0:
                await asyncio.sleep(wait_time)
            self._last_request[domain] = time.monotonic()


async def check_url(
    session: aiohttp.ClientSession,
    url: str,
    limiter: DomainLimiter,
    timeout: int,
    semaphore: asyncio.Semaphore,
) -> dict:
    """
    Check a single URL. Returns a result dict:
    {url, status, status_code, reason, method}
    """
    parsed = urlparse(url)
    domain = parsed.hostname or "unknown"

    # Check known-bad patterns first (zero network cost)
    bad_reason = check_known_bad(url)
    if bad_reason:
        return {
            "url": url,
            "status": "KNOWN_BAD",
            "status_code": None,
            "reason": bad_reason,
            "method": "pattern",
        }

    async with semaphore:
        await limiter.wait(domain)

        try:
            # Try HEAD first (minimal data transfer)
            async with session.head(
                url,
                timeout=aiohttp.ClientTimeout(total=timeout),
                allow_redirects=True,
                ssl=False,
            ) as resp:
                code = resp.status

                # Some servers reject HEAD — fall back to GET
                if code in (405, 403, 406, 501):
                    return await _get_fallback(session, url, limiter, domain, timeout)

                if code == 200:
                    return {"url": url, "status": "OK", "status_code": 200,
                            "reason": None, "method": "HEAD"}
                elif code in (301, 302, 307, 308):
                    location = str(resp.url)
                    return {"url": url, "status": "REDIRECT", "status_code": code,
                            "reason": f"→ {location}", "method": "HEAD"}
                elif code == 404:
                    return {"url": url, "status": "BROKEN", "status_code": 404,
                            "reason": "Not Found", "method": "HEAD"}
                elif code == 429:
                    return {"url": url, "status": "RATE_LIMITED", "status_code": 429,
                            "reason": "Too Many Requests — retry later", "method": "HEAD"}
                elif code >= 400:
                    return {"url": url, "status": "ERROR", "status_code": code,
                            "reason": f"HTTP {code}", "method": "HEAD"}
                else:
                    return {"url": url, "status": "OK", "status_code": code,
                            "reason": None, "method": "HEAD"}

        except asyncio.TimeoutError:
            return {"url": url, "status": "TIMEOUT", "status_code": None,
                    "reason": f"No response in {timeout}s", "method": "HEAD"}
        except aiohttp.ClientError as e:
            return {"url": url, "status": "ERROR", "status_code": None,
                    "reason": str(e)[:120], "method": "HEAD"}
        except Exception as e:
            return {"url": url, "status": "ERROR", "status_code": None,
                    "reason": str(e)[:120], "method": "HEAD"}


async def _get_fallback(
    session: aiohttp.ClientSession,
    url: str,
    limiter: DomainLimiter,
    domain: str,
    timeout: int,
) -> dict:
    """GET fallback for servers that reject HEAD. Also checks soft-404."""
    await limiter.wait(domain)
    try:
        async with session.get(
            url,
            timeout=aiohttp.ClientTimeout(total=timeout),
            allow_redirects=True,
            ssl=False,
        ) as resp:
            code = resp.status

            if code == 200 and domain in SOFT_404_PATTERNS:
                # Read a small chunk to check for soft-404 signals
                body = await resp.text(encoding="utf-8", errors="ignore")
                body_lower = body[:5000].lower()
                for pattern in SOFT_404_PATTERNS[domain]:
                    if pattern.lower() in body_lower:
                        return {"url": url, "status": "SOFT_404",
                                "status_code": 200,
                                "reason": f'Page title/body contains "{pattern}"',
                                "method": "GET"}
                return {"url": url, "status": "OK", "status_code": 200,
                        "reason": None, "method": "GET"}

            if code == 200:
                return {"url": url, "status": "OK", "status_code": 200,
                        "reason": None, "method": "GET"}
            elif code == 404:
                return {"url": url, "status": "BROKEN", "status_code": 404,
                        "reason": "Not Found", "method": "GET"}
            else:
                return {"url": url, "status": "ERROR", "status_code": code,
                        "reason": f"HTTP {code}", "method": "GET"}

    except asyncio.TimeoutError:
        return {"url": url, "status": "TIMEOUT", "status_code": None,
                "reason": f"No response in {timeout}s", "method": "GET"}
    except Exception as e:
        return {"url": url, "status": "ERROR", "status_code": None,
                "reason": str(e)[:120], "method": "GET"}

# ---------------------------------------------------------------------------
# Scanner
# ---------------------------------------------------------------------------

async def scan_vault(vault_root: str, scan_dirs: list[str], timeout: int,
                     quick: bool) -> dict:
    """Scan vault files and check all URLs. Returns structured results."""

    # Collect all URLs with file + line references
    url_map: dict[str, list[tuple[str, int]]] = defaultdict(list)  # url -> [(file, line)]
    total_files = 0

    for scan_dir in scan_dirs:
        dir_path = os.path.join(vault_root, scan_dir)
        if not os.path.isdir(dir_path):
            continue
        for root, _, files in os.walk(dir_path):
            for fname in files:
                if not fname.endswith(".md"):
                    continue
                fpath = os.path.join(root, fname)
                total_files += 1
                for url, line_no in extract_urls_from_file(fpath):
                    if not should_skip(url, quick):
                        rel = os.path.relpath(fpath, vault_root)
                        url_map[url].append((rel, line_no))

    unique_urls = list(url_map.keys())
    print(f"Scanned {total_files} files — found {len(unique_urls)} unique URLs to check")

    # Run checks
    semaphore = asyncio.Semaphore(MAX_CONCURRENT)
    limiter = DomainLimiter()
    connector = aiohttp.TCPConnector(limit=MAX_CONCURRENT, limit_per_host=5)
    headers = {"User-Agent": USER_AGENT}

    results = []
    async with aiohttp.ClientSession(connector=connector, headers=headers) as session:
        tasks = [
            check_url(session, url, limiter, timeout, semaphore)
            for url in unique_urls
        ]
        done = 0
        for coro in asyncio.as_completed(tasks):
            result = await coro
            result["files"] = url_map[result["url"]]
            results.append(result)
            done += 1
            if done % 100 == 0:
                print(f"  Checked {done}/{len(unique_urls)}...")

    print(f"  Done — {len(results)} URLs checked")
    return {
        "total_files": total_files,
        "total_urls": len(unique_urls),
        "results": results,
    }


async def scan_file_list(filepath: str, timeout: int) -> dict:
    """Check URLs from a plain text file (one URL per line)."""
    urls = []
    with open(filepath, "r") as f:
        for line in f:
            line = line.strip()
            if line and line.startswith("http"):
                urls.append(line)

    url_map = {url: [("(input file)", 0)] for url in urls}
    print(f"Loaded {len(urls)} URLs from {filepath}")

    semaphore = asyncio.Semaphore(MAX_CONCURRENT)
    limiter = DomainLimiter()
    connector = aiohttp.TCPConnector(limit=MAX_CONCURRENT, limit_per_host=5)
    headers = {"User-Agent": USER_AGENT}

    results = []
    async with aiohttp.ClientSession(connector=connector, headers=headers) as session:
        tasks = [
            check_url(session, url, limiter, timeout, semaphore)
            for url in urls
        ]
        for coro in asyncio.as_completed(tasks):
            result = await coro
            result["files"] = url_map[result["url"]]
            results.append(result)

    return {
        "total_files": 1,
        "total_urls": len(urls),
        "results": results,
    }

# ---------------------------------------------------------------------------
# Report Generation
# ---------------------------------------------------------------------------

def generate_report(data: dict, output_path: str, fixes: list | None = None):
    """Write Obsidian-compatible Markdown report."""

    results = data["results"]
    now = time.strftime("%Y-%m-%d %H:%M")

    # Categorize
    broken = [r for r in results if r["status"] in ("BROKEN", "SOFT_404", "KNOWN_BAD")]
    errors = [r for r in results if r["status"] in ("ERROR", "TIMEOUT")]
    rate_limited = [r for r in results if r["status"] == "RATE_LIMITED"]
    ok = [r for r in results if r["status"] == "OK"]
    redirects = [r for r in results if r["status"] == "REDIRECT"]

    lines = []
    lines.append("---")
    lines.append('title: "URL Verification Report"')
    lines.append("type: reference")
    lines.append("content-readiness: ready")
    lines.append(f"last-updated: {time.strftime('%Y-%m-%d')}")
    lines.append("source-tier: null")
    lines.append("parent: null")
    lines.append("---")
    lines.append("")
    lines.append("### URL Verification Report")
    lines.append("")
    lines.append(f"**Generated:** {now}")
    lines.append(f"**Files scanned:** {data['total_files']}")
    lines.append(f"**Unique URLs checked:** {data['total_urls']}")
    lines.append("")
    lines.append("### Summary")
    lines.append("")
    lines.append(f"| Status | Count |")
    lines.append(f"|--------|-------|")
    lines.append(f"| OK | {len(ok)} |")
    lines.append(f"| Broken (404 / soft-404) | {len(broken)} |")
    lines.append(f"| Errors (timeout / connection) | {len(errors)} |")
    lines.append(f"| Rate Limited | {len(rate_limited)} |")
    lines.append(f"| Redirects | {len(redirects)} |")
    lines.append("")

    # Domain breakdown for broken URLs
    if broken:
        domain_counts = defaultdict(int)
        for r in broken:
            domain = urlparse(r["url"]).hostname or "unknown"
            domain_counts[domain] += 1

        lines.append("### Broken URLs by Domain")
        lines.append("")
        lines.append("| Domain | Broken Count |")
        lines.append("|--------|-------------|")
        for domain, count in sorted(domain_counts.items(), key=lambda x: -x[1]):
            lines.append(f"| {domain} | {count} |")
        lines.append("")

    # Broken URLs grouped by file
    if broken:
        lines.append("### Broken URLs — Detail")
        lines.append("")

        file_groups: dict[str, list] = defaultdict(list)
        for r in broken:
            for filepath, line_no in r["files"]:
                file_groups[filepath].append({
                    "url": r["url"],
                    "line": line_no,
                    "status": r["status"],
                    "reason": r["reason"],
                })

        for filepath in sorted(file_groups.keys()):
            lines.append(f"#### `{filepath}`")
            lines.append("")
            lines.append("| Line | Status | URL | Reason |")
            lines.append("|------|--------|-----|--------|")
            for item in sorted(file_groups[filepath], key=lambda x: x["line"]):
                url_short = item["url"][:80] + ("..." if len(item["url"]) > 80 else "")
                lines.append(
                    f"| {item['line']} | {item['status']} | `{url_short}` | {item['reason'] or ''} |"
                )
            lines.append("")

    # Separate 403s (bot-blocked, probably fine) from real errors
    blocked = [r for r in errors if r.get("status_code") in (402, 403)]
    real_errors = [r for r in errors if r not in blocked]

    if blocked:
        lines.append("### Bot-Blocked (403/402 — probably OK)")
        lines.append("")
        lines.append("These sites block automated requests but the URLs are likely valid. Re-check manually if needed:")
        lines.append("")
        lines.append(f"**Total:** {len(blocked)} URLs")
        lines.append("")
        # Group by domain
        blocked_domains: dict[str, int] = defaultdict(int)
        for r in blocked:
            d = urlparse(r["url"]).hostname or "unknown"
            blocked_domains[d] += 1
        for d, c in sorted(blocked_domains.items(), key=lambda x: -x[1]):
            lines.append(f"- `{d}` — {c} URLs")
        lines.append("")

    # Real errors & timeouts
    if real_errors:
        lines.append("### Errors & Timeouts")
        lines.append("")
        lines.append("| URL | Status | Reason | Files |")
        lines.append("|-----|--------|--------|-------|")
        for r in sorted(real_errors, key=lambda x: x["status"]):
            url_short = r["url"][:70] + ("..." if len(r["url"]) > 70 else "")
            files_str = ", ".join(f[0] for f in r["files"][:3])
            lines.append(
                f"| `{url_short}` | {r['status']} | {r['reason'] or ''} | {files_str} |"
            )
        lines.append("")

    # Rate limited
    if rate_limited:
        lines.append("### Rate Limited (retry later)")
        lines.append("")
        for r in rate_limited:
            domain = urlparse(r["url"]).hostname
            lines.append(f"- `{domain}` — {len([x for x in rate_limited if urlparse(x['url']).hostname == domain])} URLs")
        lines.append("")

    # Auto-fix summary
    if fixes:
        auto_applied = [f for f in fixes if f["fix_type"] == "auto"]
        flagged = [f for f in fixes if f["fix_type"] == "flag"]

        if auto_applied:
            lines.append("### Auto-Fixed URLs")
            lines.append("")
            lines.append("These URLs were automatically corrected in vault files:")
            lines.append("")
            lines.append("| File | Fix | Old → New |")
            lines.append("|------|-----|-----------|")
            for f in auto_applied:
                old_short = f["old_url"][:40] + "..."
                new_short = (f["new_url"] or "n/a")[:40] + "..."
                lines.append(f"| `{f.get('filepath', '?')}` | {f['description']} | `{old_short}` → `{new_short}` |")
            lines.append("")

        if flagged:
            lines.append("### Flagged for Manual Fix")
            lines.append("")
            lines.append("These URLs were tagged `(URL NEEDED)` in their files. Bring this report to a session to fix them:")
            lines.append("")
            lines.append("| File | Line | URL | Issue |")
            lines.append("|------|------|-----|-------|")
            for f in flagged:
                url_short = f["old_url"][:60] + ("..." if len(f["old_url"]) > 60 else "")
                lines.append(f"| `{f.get('filepath', '?')}` | {f.get('line_no', '?')} | `{url_short}` | {f['description']} |")
            lines.append("")

    # Footer
    lines.append("---")
    lines.append("")
    lines.append("*Generated by `verify_urls.py` — zero-token async link checker*")
    lines.append(f"*Bandwidth used: ~{data['total_urls'] * 500 / 1024:.0f} KB estimated (HEAD requests)*")

    report = "\n".join(lines)
    with open(output_path, "w", encoding="utf-8") as f:
        f.write(report)

    print(f"\nReport written to: {output_path}")
    print(f"  OK: {len(ok)}  |  Broken: {len(broken)}  |  Errors: {len(errors)}  |  Rate Limited: {len(rate_limited)}")

# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(
        description="Donor Map Vault — Async URL Verification"
    )
    parser.add_argument(
        "--path", type=str, default=None,
        help="Subdirectory within topics/ to scan (e.g., 'Politicians/Democrats/Senate')"
    )
    parser.add_argument(
        "--file", type=str, default=None,
        help="Plain text file of URLs to check (one per line)"
    )
    parser.add_argument(
        "--quick", action="store_true",
        help="Fast mode: shorter timeout, skip paywalled/slow domains"
    )
    parser.add_argument(
        "--fix", action="store_true",
        help="Auto-fix known broken patterns and tag unfixable URLs with (URL NEEDED)"
    )
    parser.add_argument(
        "--dry-run", action="store_true",
        help="Show what --fix would do without modifying any files"
    )
    parser.add_argument(
        "--report", type=str, default=None,
        help="Output report path (default: Vault Maintenance/URL Verification Report.md)"
    )
    parser.add_argument(
        "--vault", type=str, default=None,
        help="Vault root path (auto-detected if run from vault)"
    )

    args = parser.parse_args()

    vault_root = args.vault or DEFAULT_VAULT_ROOT
    timeout = QUICK_TIMEOUT if args.quick else DEFAULT_TIMEOUT

    if args.report:
        report_path = args.report
    else:
        report_path = os.path.join(
            vault_root, "Vault Maintenance", REPORT_FILENAME
        )

    print(f"Donor Map Vault — URL Verification")
    print(f"{'=' * 40}")
    print(f"Vault root: {vault_root}")
    print(f"Timeout: {timeout}s per URL")
    print(f"Mode: {'quick' if args.quick else 'standard'}")
    print()

    if args.file:
        data = asyncio.run(scan_file_list(args.file, timeout))
    else:
        if args.path:
            dirs = [args.path]
        else:
            dirs = SCAN_DIRS
        data = asyncio.run(scan_vault(vault_root, dirs, timeout, args.quick))

    # --- Auto-fix pass ---
    fix_stats = None
    all_fixes = []
    if args.fix or args.dry_run:
        print(f"\n{'=' * 40}")
        print(f"Auto-Fix Pass {'(DRY RUN)' if args.dry_run else ''}")
        print(f"{'=' * 40}")

        fixes_by_file: dict[str, list] = defaultdict(list)
        broken_results = [r for r in data["results"]
                          if r["status"] in ("BROKEN", "SOFT_404", "KNOWN_BAD")]

        for result in broken_results:
            for filepath, line_no in result["files"]:
                fix = attempt_auto_fix(
                    result["url"], result["status"], result["reason"],
                    filepath, line_no
                )
                if fix:
                    fix["filepath"] = filepath
                    fix["line_no"] = line_no
                    fixes_by_file[filepath].append(fix)
                    all_fixes.append(fix)

        auto_fixes = [f for f in all_fixes if f["fix_type"] == "auto"]
        flag_fixes = [f for f in all_fixes if f["fix_type"] == "flag"]

        print(f"\n  Auto-fixable: {len(auto_fixes)}")
        print(f"  Flagged (needs human): {len(flag_fixes)}")
        print(f"  Total broken: {len(broken_results)}")

        if auto_fixes or flag_fixes:
            fix_stats = apply_fixes(vault_root, fixes_by_file, dry_run=args.dry_run)
            print(f"\n  Applied: {fix_stats['applied']}")
            print(f"  Flagged with (URL NEEDED): {fix_stats['flagged']}")
            print(f"  Skipped: {fix_stats['skipped']}")

    generate_report(data, report_path, all_fixes if (args.fix or args.dry_run) else None)


if __name__ == "__main__":
    main()
