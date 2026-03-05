const sqliteUuid = `(lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-a' || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6))))`;

/**
 * @param {import('knex').Knex} knex
 */
exports.up = async (knex) => {
  const isPg = knex.client.config.client === 'pg';

  await knex.schema.createTable('tier_rewards', (table) => {
    if (isPg) {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    } else {
      table.uuid('id').primary().defaultTo(knex.raw(sqliteUuid));
    }
    table.uuid('client_id').notNullable().references('id').inTable('clients');
    table.string('tier', 50).notNullable();
    table.string('reward_type', 50).notNullable(); // collection_gift, concierge_hours, experience
    table.string('reward_name', 255).notNullable();
    table.string('status', 50).notNullable().defaultTo('available'); // available, claimed, fulfilled
    table.timestamp('claimed_at');
    table.timestamp('fulfilled_at');
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
  });

  await knex.schema.raw('CREATE INDEX idx_tier_rewards_client ON tier_rewards(client_id)');
  await knex.schema.raw('CREATE INDEX idx_tier_rewards_tier ON tier_rewards(tier)');
};

/**
 * @param {import('knex').Knex} knex
 */
exports.down = async (knex) => {
  await knex.schema.dropTableIfExists('tier_rewards');
};
