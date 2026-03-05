const sqliteUuid = `(lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-a' || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6))))`;

/**
 * @param {import('knex').Knex} knex
 */
exports.up = async (knex) => {
  const isPg = knex.client.config.client === 'pg';

  await knex.schema.createTable('redemption_history', (table) => {
    if (isPg) {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    } else {
      table.uuid('id').primary().defaultTo(knex.raw(sqliteUuid));
    }
    table.uuid('client_id').notNullable().references('id').inTable('clients');
    table.integer('points_redeemed').notNullable();
    table.decimal('credit_amount', 10, 2).notNullable();
    table.string('voucher_code', 20).unique().notNullable();
    table.timestamp('redeemed_at').notNullable().defaultTo(knex.fn.now());
    table.string('applied_to_invoice', 100);
    table.timestamp('applied_at');
  });

  await knex.schema.raw('CREATE INDEX idx_redemption_history_client ON redemption_history(client_id)');
  await knex.schema.raw('CREATE INDEX idx_redemption_history_voucher ON redemption_history(voucher_code)');
};

/**
 * @param {import('knex').Knex} knex
 */
exports.down = async (knex) => {
  await knex.schema.dropTableIfExists('redemption_history');
};
