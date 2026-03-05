const sqliteUuid = `(lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-a' || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6))))`;

/**
 * @param {import('knex').Knex} knex
 */
exports.up = async (knex) => {
  const isPg = knex.client.config.client === 'pg';

  await knex.schema.createTable('messages', (table) => {
    if (isPg) {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    } else {
      table.uuid('id').primary().defaultTo(knex.raw(sqliteUuid));
    }
    table.uuid('client_id').notNullable().references('id').inTable('clients');
    table.string('sender_type', 20).notNullable(); // 'admin' or 'client'
    table.uuid('sender_id').notNullable();
    table.string('sender_name', 255).notNullable();
    table.text('body').notNullable();
    table.boolean('is_read').notNullable().defaultTo(false);
    table.timestamp('read_at');
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
  });

  await knex.schema.raw('CREATE INDEX idx_messages_client ON messages(client_id)');
  await knex.schema.raw('CREATE INDEX idx_messages_is_read ON messages(is_read)');
  await knex.schema.raw('CREATE INDEX idx_messages_created ON messages(created_at)');
};

/**
 * @param {import('knex').Knex} knex
 */
exports.down = async (knex) => {
  await knex.schema.dropTableIfExists('messages');
};
