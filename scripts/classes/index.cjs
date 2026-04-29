/**
 * classes/index.cjs
 *
 * Single entry point that registers every editorial-decision class with
 * the pipeline. Importing this triggers all class registrations.
 *
 * Order of imports does not matter — each class registers independently
 * via a side effect at require-time. The pipeline rejects duplicate
 * registrations so there's no risk of silent override.
 *
 * To add a new class:
 *   1. Create scripts/classes/<your-class>.cjs that calls pipeline.register
 *   2. Add a require line below
 *   3. (If Tier 1) ensure data/calibration-fixture.jsonl has matching coverage
 */

'use strict';

require('./librarian-gap-aliases.cjs');
require('./frontmatter-orphan-prunes.cjs');
require('./duplicate-entity-merges.cjs');
require('./pathless-stub-aliases.cjs');
require('./mechanical-readiness-promotion.cjs');
require('./data-complete-promotion.cjs');
require('./class-tag-path-b-application.cjs');

module.exports = {};
