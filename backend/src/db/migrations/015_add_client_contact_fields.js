/**
 * @param {import('knex').Knex} knex
 */
exports.up = async (knex) => {
  await knex.schema.alterTable('clients', (table) => {
    table.string('phone', 50).nullable();
    table.text('address').nullable();
  });
};

/**
 * @param {import('knex').Knex} knex
 */
exports.down = async (knex) => {
  await knex.schema.alterTable('clients', (table) => {
    table.dropColumn('phone');
    table.dropColumn('address');
  });
};
