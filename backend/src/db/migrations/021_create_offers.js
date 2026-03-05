const sqliteUuid = `(lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-a' || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6))))`;

/**
 * @param {import('knex').Knex} knex
 */
exports.up = async (knex) => {
  const isPg = knex.client.config.client === 'pg';

  await knex.schema.createTable('offers', (table) => {
    if (isPg) {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    } else {
      table.uuid('id').primary().defaultTo(knex.raw(sqliteUuid));
    }
    table.text('type').notNullable(); // deal, experience, giveaway
    table.text('title').notNullable();
    table.text('description');
    table.text('image_url');
    table.text('min_tier').notNullable().defaultTo('silver');
    table.timestamp('start_date').notNullable();
    table.timestamp('end_date').notNullable();
    table.text('status').notNullable().defaultTo('draft');

    // Deal-specific
    table.uuid('reward_id').references('id').inTable('rewards_catalog').onDelete('SET NULL');
    table.integer('original_points');
    table.integer('deal_points');
    table.decimal('deal_bonus_value', 10, 2);
    table.integer('deal_quantity_limit');
    table.integer('deal_quantity_claimed').defaultTo(0);

    // Experience-specific
    table.text('claim_type'); // first_come, rsvp
    table.integer('spots_available');
    table.integer('spots_claimed').defaultTo(0);
    table.text('prize_details');

    // Giveaway/Sweepstakes-specific
    table.integer('sweepstakes_entries_allowed').defaultTo(1);
    table.integer('sweepstakes_winners_count').defaultTo(1);
    table.boolean('sweepstakes_drawn').defaultTo(false);
    table.timestamp('sweepstakes_draw_date');

    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());
  });

  await knex.schema.raw('CREATE INDEX idx_offers_status ON offers(status)');
  await knex.schema.raw('CREATE INDEX idx_offers_type ON offers(type)');
  await knex.schema.raw('CREATE INDEX idx_offers_dates ON offers(start_date, end_date)');
};

/**
 * @param {import('knex').Knex} knex
 */
exports.down = async (knex) => {
  await knex.schema.dropTableIfExists('offers');
};
