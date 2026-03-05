/**
 * @param {import('knex').Knex} knex
 */
exports.up = async (knex) => {
  await knex.schema.alterTable('card_requests', (table) => {
    table.integer('points_deducted').nullable();
    table.decimal('credit_amount', 10, 2).nullable();
    table.string('voucher_code', 20).nullable();
  });
};

/**
 * @param {import('knex').Knex} knex
 */
exports.down = async (knex) => {
  await knex.schema.alterTable('card_requests', (table) => {
    table.dropColumn('points_deducted');
    table.dropColumn('credit_amount');
    table.dropColumn('voucher_code');
  });
};
