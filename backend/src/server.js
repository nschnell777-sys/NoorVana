const app = require('./app');
const logger = require('./utils/logger');
const db = require('./db');

const PORT = process.env.PORT || 3000;

db.migrate.latest()
  .then(() => {
    logger.info('Database migrations up to date');
    app.listen(PORT, () => {
      logger.info(`NoorVana Loyalty API running on port ${PORT}`, {
        environment: process.env.NODE_ENV || 'development',
        apiDocs: `http://localhost:${PORT}/api-docs`
      });
    });
  })
  .catch((err) => {
    logger.error('Failed to run database migrations', { error: err.message });
    process.exit(1);
  });
