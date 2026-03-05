const sqliteUuid = `(lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-a' || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6))))`;

/**
 * @param {import('knex').Knex} knex
 */
exports.up = async (knex) => {
  const isPg = knex.client.config.client === 'pg';

  await knex.schema.createTable('rewards_catalog', (table) => {
    if (isPg) {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    } else {
      table.uuid('id').primary().defaultTo(knex.raw(sqliteUuid));
    }
    table.string('name', 255).notNullable();
    table.string('brand', 255);
    table.string('category', 50).notNullable(); // service_credit, gift_card, product_credit
    table.string('subcategory', 50); // online, retail, grocery, restaurant, or null
    table.integer('points_cost'); // null for variable-amount items like service credits
    table.decimal('dollar_value', 10, 2); // null for variable
    table.string('delivery_method', 100);
    table.string('delivery_timeline', 100);
    table.string('min_tier', 50).notNullable().defaultTo('silver');
    table.string('image_url', 500);
    table.boolean('is_active').notNullable().defaultTo(true);
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());
  });

  await knex.schema.raw('CREATE INDEX idx_rewards_catalog_category ON rewards_catalog(category)');
  await knex.schema.raw('CREATE INDEX idx_rewards_catalog_active ON rewards_catalog(is_active)');
};

/**
 * @param {import('knex').Knex} knex
 */
exports.down = async (knex) => {
  await knex.schema.dropTableIfExists('rewards_catalog');
};
