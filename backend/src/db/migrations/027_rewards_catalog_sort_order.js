exports.up = async (knex) => {
  await knex.schema.alterTable('rewards_catalog', (table) => {
    table.integer('sort_order').defaultTo(0);
  });
};

exports.down = async (knex) => {
  await knex.schema.alterTable('rewards_catalog', (table) => {
    table.dropColumn('sort_order');
  });
};
