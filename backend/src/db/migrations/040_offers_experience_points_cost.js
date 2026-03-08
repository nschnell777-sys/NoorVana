/**
 * @param {import('knex').Knex} knex
 */
exports.up = (knex) => knex.schema.alterTable('offers', (t) => {
  t.integer('experience_points_cost').nullable();
});

/**
 * @param {import('knex').Knex} knex
 */
exports.down = (knex) => knex.schema.alterTable('offers', (t) => {
  t.dropColumn('experience_points_cost');
});
