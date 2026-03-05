/**
 * @param {import('knex').Knex} knex
 */
exports.up = async (knex) => {
  await knex.schema.alterTable('gift_claims', (table) => {
    table.text('shipping_address').nullable();
  });
};

/**
 * @param {import('knex').Knex} knex
 */
exports.down = async (knex) => {
  await knex.schema.alterTable('gift_claims', (table) => {
    table.dropColumn('shipping_address');
  });
};
