/**
 * Update rewards_catalog: add logo_url column, rename subcategory values.
 * @param {import('knex').Knex} knex
 */
exports.up = async (knex) => {
  const hasLogo = await knex.schema.hasColumn('rewards_catalog', 'logo_url');
  if (!hasLogo) {
    await knex.schema.alterTable('rewards_catalog', (table) => {
      table.string('logo_url', 500);
    });
  }

  // Rename subcategories: online→online_store, restaurant→dining
  await knex('rewards_catalog').where('subcategory', 'online').update({ subcategory: 'online_store' });
  await knex('rewards_catalog').where('subcategory', 'restaurant').update({ subcategory: 'dining' });
};

/**
 * @param {import('knex').Knex} knex
 */
exports.down = async (knex) => {
  await knex('rewards_catalog').where('subcategory', 'online_store').update({ subcategory: 'online' });
  await knex('rewards_catalog').where('subcategory', 'dining').update({ subcategory: 'restaurant' });
};
