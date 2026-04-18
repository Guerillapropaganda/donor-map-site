#!/usr/bin/env node
/**
 * tag-conduits.cjs
 *
 * Tags WinRed / ActBlue / JFCs as conduits in entities.jsonl per ADR-0013.
 * Conduits are platform aggregators, not political actors — they pass through
 * millions of small-dollar individual donations and should never appear as
 * a mega-donor in profile Mega-Donors sections.
 *
 * Adds `signals.is_conduit: true` and `signals.conduit_type` to entities
 * with names matching the conduit list. Idempotent.
 */

const { loadEntities, updateEntity, findByName } = require('./lib/entities-store.cjs');

const CONDUITS = [
  { name: 'WinRed', type: 'small-dollar-platform-republican' },
  { name: 'ActBlue', type: 'small-dollar-platform-democrat' },
  { name: 'Small Dollar Donors - ActBlue', type: 'small-dollar-platform-democrat' },
];

console.log('[tag-conduits] applying conduit flags per ADR-0013...');
let tagged = 0;
for (const c of CONDUITS) {
  const e = findByName(c.name);
  if (!e) {
    console.log(`  [miss] ${c.name}: no entity found`);
    continue;
  }
  const updated = updateEntity(e.id, {
    signals: { is_conduit: true, conduit_type: c.type },
  });
  if (updated) {
    console.log(`  [tag]  ${e.id} ${c.name} → is_conduit=true (${c.type})`);
    tagged++;
  }
}
console.log(`\n[done] ${tagged} entity/entities tagged as conduits.`);
