require('dotenv').config();
const cron = require('node-cron');
const cleanUpStagingDb = require('./index');

const devMode = (process.env.environmentName.toLowerCase() === 'development');

if (devMode) {
  cleanUpStagingDb();
} else {
  // Cron job for clearing copied clients in staging db: Runs daily at 03:30
  cron.schedule('30 3 * * *', () => cleanUpStagingDb());
}
