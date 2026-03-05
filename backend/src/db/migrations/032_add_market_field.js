/**
 * @param {import('knex').Knex} knex
 */
exports.up = async (knex) => {
  await knex.schema.alterTable('clients', (table) => {
    table.string('market', 100).nullable();
  });
};

exports.down = async (knex) => {
  await knex.schema.alterTable('clients', (table) => {
    table.dropColumn('market');
  });
};
