/**
 * @param {import('knex').Knex} knex
 */
exports.up = async (knex) => {
  await knex.schema.alterTable('clients', (table) => {
    table.string('address_street', 255).nullable();
    table.string('address_apt', 100).nullable();
    table.string('address_city', 100).nullable();
    table.string('address_state', 50).nullable();
    table.string('address_zip', 20).nullable();
  });
  await knex.schema.alterTable('gift_claims', (table) => {
    table.string('shipping_street', 255).nullable();
    table.string('shipping_apt', 100).nullable();
    table.string('shipping_city', 100).nullable();
    table.string('shipping_state', 50).nullable();
    table.string('shipping_zip', 20).nullable();
  });
};

/**
 * @param {import('knex').Knex} knex
 */
exports.down = async (knex) => {
  await knex.schema.alterTable('clients', (table) => {
    table.dropColumn('address_street');
    table.dropColumn('address_apt');
    table.dropColumn('address_city');
    table.dropColumn('address_state');
    table.dropColumn('address_zip');
  });
  await knex.schema.alterTable('gift_claims', (table) => {
    table.dropColumn('shipping_street');
    table.dropColumn('shipping_apt');
    table.dropColumn('shipping_city');
    table.dropColumn('shipping_state');
    table.dropColumn('shipping_zip');
  });
};
