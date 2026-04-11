/**
 * profile-type-rulebook.cjs — reader for config/profile-type-rulebook.json
 *
 * Single source of truth for what each profile type requires at each
 * readiness tier. Consumed by every Attention Queue producer, the
 * hallucination-catcher, the voice-drift-detector, the promotion queue,
 * the pipeline janitor, and the pre-commit self-review-mirror.
 *
 * The TypeScript mirror lives at ops/src/lib/profile-type-rulebook.ts
 * and must stay in sync. Any schema change here requires the same edit
 * in the TS mirror.
 *
 * Public API:
 *   loadRulebook()                              — raw JSON
 *   listAllTypes()                              — string[]
 *   listAllSubCategories(type)                  — string[]
 *   getTypeRulebook(type)                       — type entry or null
 *   getSubCategoryOverrides(type, category)     — override entry or null
 *   getTierRequirements(type, category, tier)   — { required, recommended }
 *   getTypeVisual(type)                         — { color-light, color-dark, icon }
 *   getPromotionGate(type, tier)                — "auto" | "manual" | "none" | null
 *   isVoiceScanned(type)                        — boolean (default true)
 *   isHallucinationScanned(type)                — boolean (default true)
 *   resolveChecks(type, category, tier)         — resolved check id list, after applying adds/removes/replaces
 *
 * CLI:
 *   node scripts/lib/profile-type-rulebook.cjs --validate
 *     → validates the JSON against a minimal shape and cross-references
 *       every check id against scripts/lib/checklist-helpers.cjs exports.
 *       Exits 0 on success, 1 on any mismatch.
 */
const fs = require('fs');
const path = require('path');

const RULEBOOK_PATH = path.join(__dirname, '..', '..', 'config', 'profile-type-rulebook.json');

let _cache = null;

function loadRulebook() {
  if (_cache) return _cache;
  const raw = fs.readFileSync(RULEBOOK_PATH, 'utf-8');
  _cache = JSON.parse(raw);
  return _cache;
}

function listAllTypes() {
  const r = loadRulebook();
  return Object.keys(r.types || {});
}

function listAllSubCategories(type) {
  const entry = getTypeRulebook(type);
  if (!entry) return [];
  return Object.keys(entry['sub-categories'] || {});
}

function getTypeRulebook(type) {
  const r = loadRulebook();
  return (r.types && r.types[type]) || null;
}

function getSubCategoryOverrides(type, category) {
  const entry = getTypeRulebook(type);
  if (!entry || !category) return null;
  const subs = entry['sub-categories'] || {};
  return subs[category] || null;
}

function getTierRequirements(type, category, tier) {
  const entry = getTypeRulebook(type);
  if (!entry) return { required: [], recommended: [] };
  const tiers = (entry['base-rulebook'] && entry['base-rulebook'].tiers) || {};
  const base = tiers[tier] || {};
  return {
    required: (base.required || []).slice(),
    recommended: (base.recommended || []).slice(),
  };
}

function getTypeVisual(type) {
  const entry = getTypeRulebook(type);
  return entry ? entry.visual || null : null;
}

function getPromotionGate(type, tier) {
  const entry = getTypeRulebook(type);
  if (!entry) return null;
  const gates =
    (entry['base-rulebook'] && entry['base-rulebook']['promotion-gate']) || {};
  return gates[tier] || null;
}

function isVoiceScanned(type) {
  const entry = getTypeRulebook(type);
  if (!entry) return false;
  return entry['voice-scanned'] !== false;
}

function isHallucinationScanned(type) {
  const entry = getTypeRulebook(type);
  if (!entry) return false;
  return entry['hallucination-scanned'] !== false;
}

/**
 * Compose the effective check list for (type, category, tier) by applying
 * sub-category overrides onto the base rulebook.
 *
 * Override semantics:
 *   - adds:     { tier: [check-ids] }     → append to that tier's required list
 *   - removes:  [check-ids]                → mark these checks N/A (strip from all tiers)
 *   - replaces: { oldId: newId }           → substitute an id wherever it appears
 *
 * Returns { required, recommended, removed } — removed lists the check ids
 * that were stripped by the override (so consumers can show "N/A" state).
 */
function resolveChecks(type, category, tier) {
  const base = getTierRequirements(type, category, tier);
  const overrides = category ? getSubCategoryOverrides(type, category) : null;
  if (!overrides || !overrides.overrides) {
    return { required: base.required, recommended: base.recommended, removed: [] };
  }
  const o = overrides.overrides;
  let required = base.required.slice();
  let recommended = base.recommended.slice();
  const removed = [];

  // Apply adds
  if (o.adds && o.adds[tier]) {
    required = required.concat(o.adds[tier]);
  }

  // Apply removes
  if (Array.isArray(o.removes)) {
    required = required.filter((id) => {
      if (o.removes.includes(id)) {
        removed.push(id);
        return false;
      }
      return true;
    });
    recommended = recommended.filter((id) => !o.removes.includes(id));
  }

  // Apply replaces
  if (o.replaces && typeof o.replaces === 'object') {
    required = required.map((id) => o.replaces[id] || id);
    recommended = recommended.map((id) => o.replaces[id] || id);
  }

  return { required, recommended, removed };
}

/**
 * Validate the rulebook JSON against a minimal schema. Returns
 * { ok: bool, errors: string[] }.
 */
function validate() {
  const errors = [];
  let rulebook;
  try {
    rulebook = loadRulebook();
  } catch (e) {
    return { ok: false, errors: [`Failed to parse JSON: ${e.message}`] };
  }

  // Top-level shape
  if (!rulebook.version) errors.push('Missing top-level "version"');
  if (!rulebook['tier-order']) errors.push('Missing top-level "tier-order"');
  if (!rulebook.types || typeof rulebook.types !== 'object') {
    errors.push('Missing or invalid top-level "types" object');
    return { ok: false, errors };
  }

  // Collect every check id referenced
  const referencedCheckIds = new Set();

  for (const [typeName, typeEntry] of Object.entries(rulebook.types)) {
    const ctx = `types.${typeName}`;

    if (!typeEntry.label) errors.push(`${ctx}: missing label`);
    if (!typeEntry.visual) errors.push(`${ctx}: missing visual`);
    if (typeEntry.visual) {
      if (!typeEntry.visual['color-light'])
        errors.push(`${ctx}.visual: missing color-light`);
      if (!typeEntry.visual['color-dark'])
        errors.push(`${ctx}.visual: missing color-dark`);
      if (!typeEntry.visual.icon) errors.push(`${ctx}.visual: missing icon`);
      if (
        typeEntry.visual['color-light'] &&
        !/^#[0-9a-f]{3,6}$/i.test(typeEntry.visual['color-light'])
      ) {
        errors.push(
          `${ctx}.visual.color-light: invalid hex "${typeEntry.visual['color-light']}"`
        );
      }
      if (
        typeEntry.visual['color-dark'] &&
        !/^#[0-9a-f]{3,6}$/i.test(typeEntry.visual['color-dark'])
      ) {
        errors.push(
          `${ctx}.visual.color-dark: invalid hex "${typeEntry.visual['color-dark']}"`
        );
      }
    }

    const baseTiers = typeEntry['base-rulebook'] && typeEntry['base-rulebook'].tiers;
    if (!baseTiers) {
      errors.push(`${ctx}: missing base-rulebook.tiers`);
      continue;
    }

    // Collect check ids from base tiers
    for (const [tierName, tierEntry] of Object.entries(baseTiers)) {
      if (tierEntry.required) {
        for (const id of tierEntry.required) referencedCheckIds.add(id);
      }
      if (tierEntry.recommended) {
        for (const id of tierEntry.recommended) referencedCheckIds.add(id);
      }
    }

    // Collect from sub-category overrides
    const subs = typeEntry['sub-categories'] || {};
    for (const [subName, subEntry] of Object.entries(subs)) {
      const subCtx = `${ctx}.sub-categories.${subName}`;
      if (!subEntry.label) errors.push(`${subCtx}: missing label`);
      if (!subEntry.overrides) continue;
      const o = subEntry.overrides;
      if (o.adds) {
        for (const [tierName, ids] of Object.entries(o.adds)) {
          if (!Array.isArray(ids)) {
            errors.push(`${subCtx}.overrides.adds.${tierName}: not an array`);
            continue;
          }
          for (const id of ids) referencedCheckIds.add(id);
        }
      }
      if (o.removes) {
        if (!Array.isArray(o.removes)) {
          errors.push(`${subCtx}.overrides.removes: not an array`);
        } else {
          for (const id of o.removes) referencedCheckIds.add(id);
        }
      }
      if (o.replaces) {
        if (typeof o.replaces !== 'object') {
          errors.push(`${subCtx}.overrides.replaces: not an object`);
        } else {
          for (const [oldId, newId] of Object.entries(o.replaces)) {
            referencedCheckIds.add(oldId);
            referencedCheckIds.add(newId);
          }
        }
      }
    }
  }

  // Cross-reference against checklist-helpers.cjs exports
  try {
    const helpers = require('./checklist-helpers.cjs');
    const exportedChecks = new Set(
      (helpers.CHECK_IDS && helpers.CHECK_IDS()) || Object.keys(helpers.CHECKS || {})
    );
    const missing = [];
    for (const id of referencedCheckIds) {
      if (!exportedChecks.has(id)) missing.push(id);
    }
    if (missing.length > 0) {
      errors.push(
        `Rulebook references ${missing.length} check id(s) not defined in checklist-helpers.cjs:`
      );
      for (const id of missing.sort()) errors.push(`  - ${id}`);
    }
  } catch (e) {
    errors.push(
      `Could not load checklist-helpers.cjs for cross-reference: ${e.message}`
    );
  }

  return { ok: errors.length === 0, errors, referencedCheckCount: referencedCheckIds.size };
}

module.exports = {
  loadRulebook,
  listAllTypes,
  listAllSubCategories,
  getTypeRulebook,
  getSubCategoryOverrides,
  getTierRequirements,
  getTypeVisual,
  getPromotionGate,
  isVoiceScanned,
  isHallucinationScanned,
  resolveChecks,
  validate,
};

// CLI
if (require.main === module) {
  if (process.argv.includes('--validate')) {
    const result = validate();
    if (result.ok) {
      console.log('✓ Rulebook valid.');
      console.log(`  Types: ${listAllTypes().length}`);
      console.log(`  Check ids referenced: ${result.referencedCheckCount}`);
      process.exit(0);
    } else {
      console.error('✗ Rulebook validation failed:');
      for (const err of result.errors) console.error(`  ${err}`);
      process.exit(1);
    }
  } else if (process.argv.includes('--list-types')) {
    console.log(listAllTypes().join('\n'));
  } else {
    console.log('Usage:');
    console.log('  node scripts/lib/profile-type-rulebook.cjs --validate');
    console.log('  node scripts/lib/profile-type-rulebook.cjs --list-types');
  }
}
