const app = require('./app');
const logger = require('./utils/logger');

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  logger.info(`NoorVana Loyalty API running on port ${PORT}`, {
    environment: process.env.NODE_ENV || 'development',
    apiDocs: `http://localhost:${PORT}/api-docs`
  });
});
