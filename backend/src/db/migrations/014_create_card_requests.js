const sqliteUuid = `(lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-a' || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6))))`;

/**
 * @param {import('knex').Knex} knex
 */
exports.up = async (knex) => {
  const isPg = knex.client.config.client === 'pg';

  await knex.schema.createTable('card_requests', (table) => {
    if (isPg) {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    } else {
      table.uuid('id').primary().defaultTo(knex.raw(sqliteUuid));
    }
    table.uuid('client_id').notNullable().references('id').inTable('clients');
    table.string('brand_name', 255).notNullable();
    table.string('category', 50); // online_store, retail, dining, grocery
    table.string('preferred_amount', 50);
    table.text('notes');
    table.string('status', 50).notNullable().defaultTo('new'); // new, reviewed, added, declined
    table.text('admin_notes');
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
  });

  await knex.schema.raw('CREATE INDEX idx_card_requests_client ON card_requests(client_id)');
  await knex.schema.raw('CREATE INDEX idx_card_requests_status ON card_requests(status)');
};

/**
 * @param {import('knex').Knex} knex
 */
exports.down = async (knex) => {
  await knex.schema.dropTableIfExists('card_requests');
};
