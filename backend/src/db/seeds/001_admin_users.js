const bcrypt = require('bcryptjs');

/**
 * @param {import('knex').Knex} knex
 */
exports.seed = async (knex) => {
  await knex('admin_users').del();

  const passwordHash = await bcrypt.hash('AdminPassword123!', 12);

  await knex('admin_users').insert([
    {
      name: 'System Admin',
      email: 'admin@noorvana.com',
      password_hash: passwordHash,
      role: 'admin'
    },
    {
      name: 'Customer Service Rep',
      email: 'cs@noorvana.com',
      password_hash: passwordHash,
      role: 'customer_service'
    },
    {
      name: 'Manager',
      email: 'manager@noorvana.com',
      password_hash: passwordHash,
      role: 'manager'
    }
  ]);
};
