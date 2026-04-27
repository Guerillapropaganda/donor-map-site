import { NextRequest, NextResponse } from "next/server"
import path from "path"
import { spawnSync } from "child_process"
import { requireAdmin } from "@/lib/auth"

// /api/relationships/orphan-candidates — light-version diagnostic for the
// "No Connections" panel on /relationships. Established 2026-04-27.
//
// Plain English: when a profile shows zero connections in the librarian
// (e.g. Wilks Brothers, Jump Crypto, Tisch Family — all real-world
// political donors with massive spend), the cause is almost always that
// the relevant edges in relationships.jsonl + derived files use a
// different name form than the profile title. This endpoint finds those
// candidate edges so the user can SEE what's missing — does the data
// exist under a different name (alias gap, easy fix), or is the data
// genuinely absent (ingest gap)?
//
// Light-scope: read-only. Returns up to 50 candidate edges where the
// `from` or `to` endpoint contains at least one meaningful word from the
// profile title. Caller surfaces these to David. No alias-merge action
// in this version (Medium scope, separate session).
//
// Query params:
//   title=...   — profile title to find candidate edges for
//
// Response:
//   {
//     query: string,
//     tokens: string[],     — tokens used for matching
//     scanned: number,      — total edges scanned (informational)
//     matched: number,      — total candidate edges found
//     candidates: Array<{
//       from: string,
//       from_type: string,
//       to: string,
//       to_type: string,
//       type: string,
//       amount: number | null,
//       cycle: string | null,
//       source: string,
//       matched_endpoint: "from" | "to",
//       relevance: number,  — token match score
//     }>,
//   }

// Stopwords drop generic tokens that would match thousands of unrelated
// edges. Distinct from a normal English stopword list — also drops
// entity-shape words ("family", "fund", "foundation", "industry",
// "association", "bloc", "donor", "donors", "network") because in
// political-donor naming those are extremely common across distinct
// entities. Without this filter, "Tisch Family" matches 1,724 edges
// (most about AFSCME Working Families Fund / Focus on the Family /
// Fanjul Family / etc. — none about Tisch).
const STOPWORDS = new Set([
  "and",
  "the",
  "for",
  "inc",
  "llc",
  "lp",
  "pac",
  "corp",
  "co",
  "company",
  "of",
  "to",
  "an",
  "a",
  "or",
  "with",
  "by",
  // Generic entity-shape words
  "family",
  "fund",
  "foundation",
  "industry",
  "association",
  "bloc",
  "donor",
  "donors",
  "network",
  "networks",
  "group",
  "groups",
  "committee",
  "committees",
  "society",
  "council",
  "alliance",
])

function tokenize(title: string): string[] {
  return title
    .toLowerCase()
    .replace(/[—\-]/g, " ")
    .replace(/[^\w\s&]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 3 && !STOPWORDS.has(w))
}

interface Edge {
  from?: string
  from_type?: string
  to?: string
  to_type?: string
  type?: string
  amount?: number | null
  cycle?: string | null
  source?: string
}

export async function GET(req: NextRequest) {
  const gate = await requireAdmin(req)
  if (!gate.ok) return gate.response!

  const { searchParams } = new URL(req.url)
  const title = (searchParams.get("title") || "").trim()
  if (!title) {
    return NextResponse.json({ error: "title query param required" }, { status: 400 })
  }

  const tokens = tokenize(title)
  if (tokens.length === 0) {
    return NextResponse.json({
      query: title,
      tokens: [],
      scanned: 0,
      matched: 0,
      candidates: [],
      note: "no meaningful tokens after stopword/length filtering",
    })
  }

  // Run a Node helper as a subprocess that reads the edge store via the
  // CJS librarian helper (avoids cross-runtime import friction in Next.js
  // edge runtime). The subprocess returns JSON to stdout.
  const repoRoot = path.resolve(process.cwd(), "..")
  const result = spawnSync(
    "node",
    [
      "-e",
      `
      const edges = require('./scripts/lib/relationships-store.cjs').loadEdges();
      const tokens = ${JSON.stringify(tokens)};
      const titleLower = ${JSON.stringify(title.toLowerCase())};
      // Relevance threshold: 1-2 tokens require all to match (full
      // identity). 3+ tokens (long titles like "Wilks Brothers - Dan
      // and Farris Wilks") require at least 2. This catches the
      // single-rare-name case ("Tisch") with no false positives AND
      // the multi-name-form case ("Wilks Brothers ," variants where
      // only the first 2 tokens match) without inflating to the
      // half-of-tokens threshold which was too aggressive (5 tokens
      // would need 3 matches and miss legitimate "wilks brothers"
      // entries that only matched 2).
      const minRelevance = tokens.length <= 2 ? tokens.length : 2;
      const candidates = [];
      let scanned = 0;
      for (const e of edges) {
        scanned++;
        const fromLower = (e.from || '').toLowerCase();
        const toLower = (e.to || '').toLowerCase();
        // Skip edges where the profile title matches one endpoint exactly
        // — those would already have resolved through the librarian.
        if (fromLower === titleLower || toLower === titleLower) continue;
        let bestRelevance = 0;
        let matchedEndpoint = null;
        for (const endpoint of ['from', 'to']) {
          const lower = endpoint === 'from' ? fromLower : toLower;
          if (!lower) continue;
          let score = 0;
          for (const t of tokens) if (lower.includes(t)) score++;
          if (score > bestRelevance) {
            bestRelevance = score;
            matchedEndpoint = endpoint;
          }
        }
        if (bestRelevance >= minRelevance) {
          candidates.push({
            from: e.from || '',
            from_type: e.from_type || '',
            to: e.to || '',
            to_type: e.to_type || '',
            type: e.type || '',
            amount: e.amount ?? null,
            cycle: e.cycle ?? null,
            source: e.source || '',
            matched_endpoint: matchedEndpoint,
            relevance: bestRelevance,
          });
        }
      }
      // Sort: relevance desc, then amount desc (bigger $ = more useful)
      candidates.sort((a, b) => (b.relevance - a.relevance) || ((b.amount || 0) - (a.amount || 0)));
      console.log(JSON.stringify({ scanned, matched: candidates.length, candidates: candidates.slice(0, 50) }));
      `,
    ],
    { cwd: repoRoot, encoding: "utf-8", maxBuffer: 50_000_000, timeout: 30_000 },
  )

  if (result.status !== 0) {
    return NextResponse.json(
      { error: "edge scan failed", stderr: result.stderr?.slice(-500) || null },
      { status: 500 },
    )
  }

  let parsed: { scanned: number; matched: number; candidates: Edge[] }
  try {
    parsed = JSON.parse(result.stdout)
  } catch (e: any) {
    return NextResponse.json(
      { error: "edge scan output not parseable", detail: e?.message },
      { status: 500 },
    )
  }

  return NextResponse.json({
    query: title,
    tokens,
    scanned: parsed.scanned,
    matched: parsed.matched,
    candidates: parsed.candidates,
  })
}
