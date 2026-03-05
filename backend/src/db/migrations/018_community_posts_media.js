/**
 * @param {import('knex').Knex} knex
 */
exports.up = async (knex) => {
  await knex.schema.alterTable('community_posts', (table) => {
    table.renameColumn('image_url', 'media_url');
  });
  await knex.schema.alterTable('community_posts', (table) => {
    table.string('media_type', 20); // 'image' or 'video'
  });
};

/**
 * @param {import('knex').Knex} knex
 */
exports.down = async (knex) => {
  await knex.schema.alterTable('community_posts', (table) => {
    table.dropColumn('media_type');
  });
  await knex.schema.alterTable('community_posts', (table) => {
    table.renameColumn('media_url', 'image_url');
  });
};
