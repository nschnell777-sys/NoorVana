/**
 * @param {import('knex').Knex} knex
 */
exports.up = async (knex) => {
  await knex.schema.alterTable('offers', (table) => {
    table.timestamp('event_date');
  });
};

/**
 * @param {import('knex').Knex} knex
 */
exports.down = async (knex) => {
  await knex.schema.alterTable('offers', (table) => {
    table.dropColumn('event_date');
  });
};
