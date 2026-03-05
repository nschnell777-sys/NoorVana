const sqliteUuid = `(lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-a' || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6))))`;

/**
 * @param {import('knex').Knex} knex
 */
exports.up = async (knex) => {
  const isPg = knex.client.config.client === 'pg';

  await knex.schema.createTable('points_transactions', (table) => {
    if (isPg) {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    } else {
      table.uuid('id').primary().defaultTo(knex.raw(sqliteUuid));
    }
    table.uuid('client_id').notNullable().references('id').inTable('clients');
    table.string('transaction_type', 20).notNullable();
    table.string('source', 50).defaultTo('manual');
    table.string('invoice_id', 100);
    table.decimal('invoice_amount', 10, 2);
    table.integer('lifetime_points_change').notNullable();
    table.integer('redeemable_points_change').notNullable();
    table.string('tier_at_transaction', 50).notNullable();
    table.decimal('multiplier_applied', 3, 1);
    table.text('description');
    table.uuid('created_by');
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
  });

  await knex.schema.raw('CREATE INDEX idx_points_transactions_client ON points_transactions(client_id)');
  await knex.schema.raw('CREATE INDEX idx_points_transactions_type ON points_transactions(transaction_type)');
  await knex.schema.raw('CREATE INDEX idx_points_transactions_source ON points_transactions(source)');
  await knex.schema.raw('CREATE INDEX idx_points_transactions_invoice ON points_transactions(invoice_id)');
  await knex.schema.raw('CREATE INDEX idx_points_transactions_date ON points_transactions(created_at)');
};

/**
 * @param {import('knex').Knex} knex
 */
exports.down = async (knex) => {
  await knex.schema.dropTableIfExists('points_transactions');
};
