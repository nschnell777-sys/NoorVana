const sqliteUuid = `(lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-a' || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6))))`;

/**
 * @param {import('knex').Knex} knex
 */
exports.up = async (knex) => {
  const isPg = knex.client.config.client === 'pg';

  await knex.schema.createTable('admin_users', (table) => {
    if (isPg) {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    } else {
      table.uuid('id').primary().defaultTo(knex.raw(sqliteUuid));
    }
    table.string('name', 255).notNullable();
    table.string('email', 255).unique().notNullable();
    table.string('password_hash', 255).notNullable();
    table.string('role', 50).notNullable();
    table.boolean('is_active').notNullable().defaultTo(true);
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('last_login');
  });

  await knex.schema.raw('CREATE INDEX idx_admin_users_email ON admin_users(email)');
};

/**
 * @param {import('knex').Knex} knex
 */
exports.down = async (knex) => {
  await knex.schema.dropTableIfExists('admin_users');
};
