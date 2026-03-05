const sqliteUuid = `(lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-a' || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6))))`;

/**
 * @param {import('knex').Knex} knex
 */
exports.up = async (knex) => {
  const isPg = knex.client.config.client === 'pg';

  await knex.schema.createTable('sync_logs', (table) => {
    if (isPg) {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    } else {
      table.uuid('id').primary().defaultTo(knex.raw(sqliteUuid));
    }
    table.text('sync_type').notNullable();
    table.text('status').notNullable().defaultTo('running');
    table.timestamp('started_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('completed_at');
    table.integer('records_processed').defaultTo(0);
    table.integer('records_created').defaultTo(0);
    table.integer('records_updated').defaultTo(0);
    table.integer('records_failed').defaultTo(0);
    table.text('error_message');
    table.text('details');
    table.uuid('triggered_by');
    table.text('axiscare_client_id');
    table.text('date_from');
    table.text('date_to');
  });

  await knex.schema.raw('CREATE INDEX idx_sync_logs_type ON sync_logs(sync_type)');
  await knex.schema.raw('CREATE INDEX idx_sync_logs_status ON sync_logs(status)');
  await knex.schema.raw('CREATE INDEX idx_sync_logs_started ON sync_logs(started_at)');
};

/**
 * @param {import('knex').Knex} knex
 */
exports.down = async (knex) => {
  await knex.schema.dropTableIfExists('sync_logs');
};
