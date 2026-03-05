/**
 * Adds reenrolled_at timestamp to clients table.
 * Used to reject invoices from inactive periods — any payment with a date
 * before reenrolled_at is rejected to prevent backfilling points.
 *
 * @param {import('knex').Knex} knex
 */
exports.up = async (knex) => {
  await knex.schema.alterTable('clients', (table) => {
    table.timestamp('reenrolled_at').nullable();
  });
};

/**
 * @param {import('knex').Knex} knex
 */
exports.down = async (knex) => {
  await knex.schema.alterTable('clients', (table) => {
    table.dropColumn('reenrolled_at');
  });
};
