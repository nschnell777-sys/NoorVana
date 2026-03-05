/**
 * Creates table for password reset tokens.
 * @param {import('knex').Knex} knex
 */
exports.up = async (knex) => {
  const isSQLite = knex.client.config.client === 'better-sqlite3';

  await knex.schema.createTable('password_reset_tokens', (table) => {
    if (isSQLite) {
      table.text('id').primary().defaultTo(knex.raw("(lower(hex(randomblob(16))))"));
    } else {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    }
    table.text('client_id').notNullable().references('id').inTable('clients').onDelete('CASCADE');
    table.text('token_hash').notNullable();
    table.timestamp('expires_at').notNullable();
    table.boolean('used').notNullable().defaultTo(false);
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
  });
};

exports.down = async (knex) => {
  await knex.schema.dropTableIfExists('password_reset_tokens');
};
