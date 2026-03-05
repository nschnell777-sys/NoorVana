/**
 * Add deal_discount_percentage to offers table.
 * Replaces the original_points + deal_points model with a percentage discount.
 * Client chooses dollar amount ($50-$500) at claim time.
 *
 * @param {import('knex').Knex} knex
 */
exports.up = async (knex) => {
  await knex.schema.alterTable('offers', (table) => {
    table.integer('deal_discount_percentage'); // e.g. 20 for 20% off
  });
};

exports.down = async (knex) => {
  await knex.schema.alterTable('offers', (table) => {
    table.dropColumn('deal_discount_percentage');
  });
};
