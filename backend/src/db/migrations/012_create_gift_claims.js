const sqliteUuid = `(lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-a' || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6))))`;

/**
 * @param {import('knex').Knex} knex
 */
exports.up = async (knex) => {
  const isPg = knex.client.config.client === 'pg';

  await knex.schema.createTable('gift_claims', (table) => {
    if (isPg) {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    } else {
      table.uuid('id').primary().defaultTo(knex.raw(sqliteUuid));
    }
    table.uuid('client_id').notNullable().references('id').inTable('clients');
    table.string('tier', 50).notNullable();
    table.string('gift_name', 255).notNullable();
    table.string('status', 50).notNullable().defaultTo('claimed'); // claimed, processing, shipped, delivered
    table.string('tracking_number', 255);
    table.text('admin_notes');
    table.timestamp('claimed_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('processed_at');
    table.timestamp('shipped_at');
    table.timestamp('delivered_at');
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
  });

  await knex.schema.raw('CREATE INDEX idx_gift_claims_client ON gift_claims(client_id)');
  await knex.schema.raw('CREATE INDEX idx_gift_claims_status ON gift_claims(status)');
};

/**
 * @param {import('knex').Knex} knex
 */
exports.down = async (knex) => {
  await knex.schema.dropTableIfExists('gift_claims');
};
