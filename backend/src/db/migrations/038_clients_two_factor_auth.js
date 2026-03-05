/**
 * Adds TOTP two-factor authentication fields to clients table.
 * @param {import('knex').Knex} knex
 */
exports.up = async (knex) => {
  await knex.schema.alterTable('clients', (table) => {
    table.boolean('two_factor_enabled').notNullable().defaultTo(false);
    table.text('two_factor_secret').nullable();
    table.text('two_factor_recovery_codes').nullable();
    table.timestamp('two_factor_enabled_at').nullable();
  });
};

exports.down = async (knex) => {
  await knex.schema.alterTable('clients', (table) => {
    table.dropColumn('two_factor_enabled');
    table.dropColumn('two_factor_secret');
    table.dropColumn('two_factor_recovery_codes');
    table.dropColumn('two_factor_enabled_at');
  });
};
