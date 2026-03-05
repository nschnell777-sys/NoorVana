/**
 * @param {import('knex').Knex} knex
 */
exports.up = async (knex) => {
  await knex.schema.alterTable('offers', (table) => {
    table.text('preview_text');
  });
};

/**
 * @param {import('knex').Knex} knex
 */
exports.down = async (knex) => {
  await knex.schema.alterTable('offers', (table) => {
    table.dropColumn('preview_text');
  });
};
