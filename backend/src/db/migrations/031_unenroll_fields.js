/**
 * @param {import('knex').Knex} knex
 */
exports.up = async (knex) => {
  await knex.schema.alterTable('clients', (table) => {
    table.timestamp('unenrolled_at').nullable();
    table.text('unenroll_reason').nullable();
  });
};

exports.down = async (knex) => {
  await knex.schema.alterTable('clients', (table) => {
    table.dropColumn('unenrolled_at');
    table.dropColumn('unenroll_reason');
  });
};
