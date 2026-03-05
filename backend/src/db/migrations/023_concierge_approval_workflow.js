/**
 * @param {import('knex').Knex} knex
 */
exports.up = async (knex) => {
  await knex.schema.alterTable('concierge_requests', (table) => {
    table.decimal('quoted_hours', 4, 1).nullable();
    table.string('client_response', 20).nullable();
    table.timestamp('client_response_at').nullable();
  });
};

/**
 * @param {import('knex').Knex} knex
 */
exports.down = async (knex) => {
  await knex.schema.alterTable('concierge_requests', (table) => {
    table.dropColumn('quoted_hours');
    table.dropColumn('client_response');
    table.dropColumn('client_response_at');
  });
};
