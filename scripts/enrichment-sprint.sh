#!/usr/bin/env bash
# enrichment-sprint.sh — Session L
#
# Re-runs every local bulk ingest + canonical rebuild + backfill in
# sequence so profiles that weren't at data-complete get another pass
# with fresh canonical data. One failure does NOT kill the chain;
# results are logged to /tmp/enrichment-$(timestamp).log for review.
#
# Usage:  bash scripts/enrichment-sprint.sh
#
# Runtime: expect 2-4 hours. The FEC individual bulk + IRS 990 bulk
# are the two slow ones (20+ GB of input each).

set +e  # continue on failure
LOG="/tmp/enrichment-$(date +%Y%m%d-%H%M%S).log"
STATUS_LOG="/tmp/enrichment-status.log"
cd "$(dirname "$0")/.." || exit 1

echo "=== Enrichment sprint starting $(date) ===" | tee "$LOG"
echo "Log: $LOG"
echo "Status: $STATUS_LOG"

run_step() {
  local label="$1"
  shift
  local start=$(date +%s)
  echo "" | tee -a "$LOG"
  echo "[$(date +%H:%M:%S)] START: $label" | tee -a "$LOG" | tee -a "$STATUS_LOG"
  if "$@" >>"$LOG" 2>&1; then
    local elapsed=$(($(date +%s) - start))
    echo "[$(date +%H:%M:%S)] OK    ($(printf %4ds $elapsed)): $label" | tee -a "$STATUS_LOG"
  else
    local elapsed=$(($(date +%s) - start))
    echo "[$(date +%H:%M:%S)] FAIL  ($(printf %4ds $elapsed)): $label (see $LOG)" | tee -a "$STATUS_LOG"
  fi
}

# ─── Phase A: Bulk ingest (1-2 hours) ─────────────────────────────────
run_step "ingest-fec-weball-summary"     node scripts/ingest-fec-weball-summary.cjs
run_step "ingest-fec-masters-bulk"       node scripts/ingest-fec-masters-bulk.cjs
run_step "ingest-fec-pac-summary"        node scripts/ingest-fec-pac-summary.cjs
run_step "ingest-fec-bulk (pas2 cycles)" node scripts/ingest-fec-bulk.cjs
run_step "ingest-fec-pas2-bulk"          node scripts/ingest-fec-pas2-bulk.cjs
run_step "ingest-fec-oppexp-bulk"        node scripts/ingest-fec-oppexp-bulk.cjs
run_step "ingest-fec-oth-bulk"           node scripts/ingest-fec-oth-bulk.cjs
run_step "ingest-fec-indiv-aggregate"    node scripts/ingest-fec-indiv-aggregate.cjs
run_step "ingest-irs-990-bulk"           node scripts/ingest-irs-990-bulk.cjs
run_step "ingest-990-grants-to-edges"    node scripts/ingest-990-grants-to-edges.cjs
run_step "ingest-plaw-bulk"              node scripts/ingest-plaw-bulk.cjs
run_step "ingest-usaspending-bulk"       node scripts/ingest-usaspending-bulk.cjs
run_step "ingest-usaspending-grants"     node scripts/ingest-usaspending-grants-bulk.cjs
run_step "ingest-federal-register-eos"   node scripts/ingest-federal-register-eos.cjs
run_step "ingest-bill-status-bulk"       node scripts/ingest-bill-status-bulk.cjs
run_step "ingest-voteview-bulk"          node scripts/ingest-voteview-bulk.cjs

# ─── Phase B: Aggregate + rebuild caches (~15 min) ─────────────────────
run_step "aggregate-pas2-to-edges"       node scripts/aggregate-pas2-to-edges.cjs
run_step "aggregate-indiv-to-edges"      node scripts/aggregate-indiv-to-edges.cjs
run_step "rebuild-relationship-caches"   node scripts/rebuild-relationship-caches.cjs --write
run_step "build-profile-data-panels"     node scripts/build-profile-data-panels.cjs --write

# ─── Phase C: Run today's backfill scripts against the fresher data ────
run_step "backfill-last-enriched"        node scripts/backfill-last-enriched.cjs --write
run_step "backfill-committee-assignments" node scripts/backfill-committee-assignments.cjs --write
run_step "backfill-fec-candidate-totals" node scripts/backfill-fec-candidate-totals.cjs --write
run_step "backfill-bills-sponsored"      node scripts/backfill-bills-sponsored.cjs --write
run_step "backfill-donor-spend-totals"   node scripts/backfill-donor-spend-totals.cjs --write
run_step "harvest-profile-sources"       node scripts/harvest-profile-sources.cjs --write
run_step "harvest-edge-citations"        node scripts/harvest-edge-citations.cjs --write

# ─── Phase D: Reclassify ───────────────────────────────────────────────
run_step "reclassify-readiness"          node scripts/reclassify-readiness.cjs --diagnose --write

echo "" | tee -a "$LOG" | tee -a "$STATUS_LOG"
echo "=== Enrichment sprint complete $(date) ===" | tee -a "$LOG" | tee -a "$STATUS_LOG"
echo ""
echo "Status summary:"
tail -30 "$STATUS_LOG"
