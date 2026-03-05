const { v4: uuidv4 } = require('uuid');

/**
 * SQLite-compatible UUID default expression.
 */
const sqliteUuid = `(lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-a' || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6))))`;

/**
 * @param {import('knex').Knex} knex
 */
exports.up = async (knex) => {
  const isPg = knex.client.config.client === 'pg';

  if (isPg) {
    await knex.raw('CREATE EXTENSION IF NOT EXISTS "pgcrypto"');
  }

  await knex.schema.createTable('clients', (table) => {
    if (isPg) {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    } else {
      table.uuid('id').primary().defaultTo(knex.raw(sqliteUuid));
    }
    table.string('axiscare_client_id', 100).unique();
    table.string('name', 255).notNullable();
    table.string('email', 255).unique().notNullable();
    table.string('care_package', 50).notNullable();
    table.string('current_tier', 50).notNullable().defaultTo('bronze');
    table.integer('lifetime_points').notNullable().defaultTo(0);
    table.integer('redeemable_points').notNullable().defaultTo(0);
    table.timestamp('tier_upgraded_at');
    table.boolean('is_active').notNullable().defaultTo(true);
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());
  });

  await knex.schema.raw('CREATE INDEX idx_clients_email ON clients(email)');
  await knex.schema.raw('CREATE INDEX idx_clients_tier ON clients(current_tier)');
  await knex.schema.raw('CREATE INDEX idx_clients_axiscare ON clients(axiscare_client_id)');
};

/**
 * @param {import('knex').Knex} knex
 */
exports.down = async (knex) => {
  await knex.schema.dropTableIfExists('clients');
};
