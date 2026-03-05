/**
 * Add delivery_code column and update old 'new' status records to 'pending'
 * @param {import('knex').Knex} knex
 */
exports.up = async (knex) => {
  await knex.schema.alterTable('card_requests', (table) => {
    table.text('delivery_code').nullable();
  });

  // Update any old records with status 'new' to 'pending' so admin UI can process them
  await knex('card_requests').where('status', 'new').update({ status: 'pending' });
};

/**
 * @param {import('knex').Knex} knex
 */
exports.down = async (knex) => {
  await knex.schema.alterTable('card_requests', (table) => {
    table.dropColumn('delivery_code');
  });
};
