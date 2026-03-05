const sqliteUuid = `(lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-a' || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6))))`;

/**
 * @param {import('knex').Knex} knex
 */
exports.up = async (knex) => {
  const isPg = knex.client.config.client === 'pg';

  await knex.schema.createTable('concierge_requests', (table) => {
    if (isPg) {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    } else {
      table.uuid('id').primary().defaultTo(knex.raw(sqliteUuid));
    }
    table.uuid('client_id').notNullable().references('id').inTable('clients');
    table.string('tier', 50).notNullable();
    table.string('request_type', 50).notNullable(); // elder_law, financial, real_estate, other
    table.string('preferred_date', 50);
    table.string('preferred_time', 50); // morning, afternoon, evening
    table.text('details');
    table.decimal('hours_allocated', 4, 1).defaultTo(0);
    table.string('status', 50).notNullable().defaultTo('new'); // new, scheduled, completed
    table.string('appointment_date', 100);
    table.text('admin_notes');
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());
  });

  await knex.schema.raw('CREATE INDEX idx_concierge_requests_client ON concierge_requests(client_id)');
  await knex.schema.raw('CREATE INDEX idx_concierge_requests_status ON concierge_requests(status)');
};

/**
 * @param {import('knex').Knex} knex
 */
exports.down = async (knex) => {
  await knex.schema.dropTableIfExists('concierge_requests');
};
