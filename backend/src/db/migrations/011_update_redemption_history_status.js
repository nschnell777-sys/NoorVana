/**
 * Add admin workflow columns to redemption_history.
 * @param {import('knex').Knex} knex
 */
exports.up = async (knex) => {
  await knex.schema.alterTable('redemption_history', (table) => {
    table.string('status', 50).defaultTo('pending'); // pending, processing, fulfilled, denied
    table.text('admin_notes');
    table.text('fulfillment_details');
    table.uuid('processed_by');
    table.timestamp('processed_at');
    table.timestamp('fulfilled_at');
    table.text('denied_reason');
  });
};

/**
 * @param {import('knex').Knex} knex
 */
exports.down = async (knex) => {
  await knex.schema.alterTable('redemption_history', (table) => {
    table.dropColumn('status');
    table.dropColumn('admin_notes');
    table.dropColumn('fulfillment_details');
    table.dropColumn('processed_by');
    table.dropColumn('processed_at');
    table.dropColumn('fulfilled_at');
    table.dropColumn('denied_reason');
  });
};
