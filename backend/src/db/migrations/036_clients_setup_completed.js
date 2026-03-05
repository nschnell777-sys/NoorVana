/**
 * @param {import('knex').Knex} knex
 */
exports.up = async (knex) => {
  await knex.schema.alterTable('clients', (table) => {
    table.boolean('setup_completed').notNullable().defaultTo(false);
  });
  // Mark existing clients that already have password_hash as setup_completed
  await knex('clients').whereNotNull('password_hash').update({ setup_completed: true });
};

/**
 * @param {import('knex').Knex} knex
 */
exports.down = async (knex) => {
  await knex.schema.alterTable('clients', (table) => {
    table.dropColumn('setup_completed');
  });
};
