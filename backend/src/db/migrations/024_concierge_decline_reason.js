/**
 * @param {import('knex').Knex} knex
 */
exports.up = async (knex) => {
  await knex.schema.alterTable('concierge_requests', (table) => {
    table.text('decline_reason').nullable();
  });
};

/**
 * @param {import('knex').Knex} knex
 */
exports.down = async (knex) => {
  await knex.schema.alterTable('concierge_requests', (table) => {
    table.dropColumn('decline_reason');
  });
};
