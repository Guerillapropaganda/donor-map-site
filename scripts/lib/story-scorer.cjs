/**
 * story-scorer.cjs — Phase 5 Story Score formula
 *
 * Implements the formula from ADR-0003 Phase 5 spec:
 *
 *   score = log(money_amount)
 *         + (30 / days_to_event)
 *         + cross_party_bonus
 *         + rhetoric_contradiction_bonus
 *         + (5 - press_coverage_count)
 *         + source_tier_weight
 *         × recency_decay(age_days)
 *         × news_cycle_relevance
 *
 * All inputs are optional — the formula gracefully handles missing
 * data by contributing 0 for that term. This matters because our
 * underlying data is incomplete (missing amounts on most edges,
 * missing dates, missing press_coverage_count) and we don't want
 * the scorer to blow up.
 *
 * Calibration is a Phase 5 deliverable that David runs manually:
 * hand-score 20 past stories, run the formula, tune weights until
 * top 5 match. Not automated here.
 *
 * Public API:
 *   scoreCandidate(inputs)      → { score, breakdown, tier }
 *   scoreCandidates(array)      → sorted candidate[] with scores
 *
 * Inputs (all optional):
 *   money_amount             number — dollars involved
 *   days_to_event            number — timing proximity, smaller = more suspicious
 *   is_cross_party           bool   — donor funded both parties on this fight
 *   rhetoric_contradiction   bool   — stated position ≠ voting record
 *   press_coverage_count     number — how many outlets covered this already
 *   source_tier_weight       number — aggregate tier quality of backing sources
 *   age_days                 number — how old is the signal
 *   news_cycle_relevance     number — hot-issues weight multiplier (default 1.0)
 */

// ─── Formula constants (calibration targets) ──────────────────────────

const WEIGHTS = {
  money_log_base: 10,
  timing_scale: 30, // score contribution = timing_scale / days_to_event
  cross_party_bonus: 5.0,
  contradiction_bonus: 3.0,
  press_scarcity_max: 5.0, // score contribution = press_scarcity_max - min(press_count, 5)
  source_tier_cap: 4.0, // maximum contribution from source quality
}

// Tier thresholds (score → "high" / "medium" / "low")
// Calibrated after hand-scoring 20 known stories.
const TIER_THRESHOLDS = {
  high: 18,
  medium: 10,
}

// ─── Decay functions ─────────────────────────────────────────────────

function recencyDecay(ageDays) {
  // 1.0 at day 0, 0.5 at day 30, 0.2 at day 90, 0.1 at day 180, floor 0.1
  if (typeof ageDays !== "number" || ageDays < 0) return 1.0
  if (ageDays <= 0) return 1.0
  if (ageDays <= 30) return 1.0 - (ageDays / 30) * 0.5
  if (ageDays <= 90) return 0.5 - ((ageDays - 30) / 60) * 0.3
  if (ageDays <= 180) return 0.2 - ((ageDays - 90) / 90) * 0.1
  return 0.1
}

// ─── Individual score terms ──────────────────────────────────────────

function moneyTerm(amount) {
  if (typeof amount !== "number" || amount <= 0) return 0
  return Math.log(amount) / Math.log(WEIGHTS.money_log_base)
}

function timingTerm(daysToEvent) {
  if (typeof daysToEvent !== "number") return 0
  if (daysToEvent <= 0) return WEIGHTS.timing_scale // same day = max score
  return WEIGHTS.timing_scale / Math.max(1, Math.abs(daysToEvent))
}

function crossPartyTerm(isCrossParty) {
  return isCrossParty ? WEIGHTS.cross_party_bonus : 0
}

function contradictionTerm(rhetoricContradiction) {
  return rhetoricContradiction ? WEIGHTS.contradiction_bonus : 0
}

function pressScarcityTerm(pressCount) {
  if (typeof pressCount !== "number") return 0
  return Math.max(0, WEIGHTS.press_scarcity_max - Math.min(pressCount, 5))
}

function sourceTierTerm(tierWeight) {
  if (typeof tierWeight !== "number") return 0
  return Math.min(tierWeight, WEIGHTS.source_tier_cap)
}

// ─── Main scoring ────────────────────────────────────────────────────

function scoreCandidate(inputs = {}) {
  const terms = {
    money: moneyTerm(inputs.money_amount),
    timing: timingTerm(inputs.days_to_event),
    cross_party: crossPartyTerm(inputs.is_cross_party),
    contradiction: contradictionTerm(inputs.rhetoric_contradiction),
    press_scarcity: pressScarcityTerm(inputs.press_coverage_count),
    source_tier: sourceTierTerm(inputs.source_tier_weight),
  }

  const additive = Object.values(terms).reduce((sum, v) => sum + v, 0)
  const decay = recencyDecay(inputs.age_days ?? 0)
  const newsMultiplier =
    typeof inputs.news_cycle_relevance === "number" && inputs.news_cycle_relevance > 0
      ? inputs.news_cycle_relevance
      : 1.0

  const raw = additive * decay * newsMultiplier

  let tier = "low"
  if (raw >= TIER_THRESHOLDS.high) tier = "high"
  else if (raw >= TIER_THRESHOLDS.medium) tier = "medium"

  return {
    score: Math.round(raw * 100) / 100,
    additive: Math.round(additive * 100) / 100,
    decay: Math.round(decay * 100) / 100,
    news_multiplier: newsMultiplier,
    tier,
    breakdown: {
      money: Math.round(terms.money * 100) / 100,
      timing: Math.round(terms.timing * 100) / 100,
      cross_party: terms.cross_party,
      contradiction: terms.contradiction,
      press_scarcity: Math.round(terms.press_scarcity * 100) / 100,
      source_tier: Math.round(terms.source_tier * 100) / 100,
    },
  }
}

function scoreCandidates(candidates) {
  return candidates
    .map((c) => ({ ...c, ...scoreCandidate(c.inputs || c) }))
    .sort((a, b) => b.score - a.score)
}

module.exports = {
  WEIGHTS,
  TIER_THRESHOLDS,
  recencyDecay,
  scoreCandidate,
  scoreCandidates,
}
