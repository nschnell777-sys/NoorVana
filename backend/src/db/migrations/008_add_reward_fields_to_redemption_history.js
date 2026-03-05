/**
 * @param {import('knex').Knex} knex
 */
exports.up = async (knex) => {
  await knex.schema.alterTable('redemption_history', (table) => {
    table.uuid('reward_id');
    table.string('reward_name', 255);
    table.string('reward_category', 50);
    table.string('delivery_method', 100);
    table.string('delivery_status', 50).defaultTo('pending'); // pending, processing, delivered
  });
};

/**
 * @param {import('knex').Knex} knex
 */
exports.down = async (knex) => {
  await knex.schema.alterTable('redemption_history', (table) => {
    table.dropColumn('reward_id');
    table.dropColumn('reward_name');
    table.dropColumn('reward_category');
    table.dropColumn('delivery_method');
    table.dropColumn('delivery_status');
  });
};
