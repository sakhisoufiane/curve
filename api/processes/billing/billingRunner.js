require('../../models/db');
require('dotenv').config();
const cron = require('node-cron');
const { chargeClients, emailExpiringClients, notifyAboutSoonToBeDeleted, deleteBillingClients } = require('./index');

const devMode = (process.env.environmentName.toLowerCase() === 'development');

if (devMode) {
  chargeClients();
  emailExpiringClients();
  notifyAboutSoonToBeDeleted();
  // deleteBillingClients();
} else {
  // Cron job for charging clients: Runs daily at 12.05
  cron.schedule('5 0 * * *', () => chargeClients());
  // Cron job for emailing clients: Runs daily at 2.00 am
  cron.schedule('0 2 * * *', () => emailExpiringClients());
  // Cron job for checking clients due for deletion: Runs every Monday at 1 am
  cron.schedule('0 1 * * 1', () => notifyAboutSoonToBeDeleted());
  // Cron job for deleting clients: Runs daily at 3.00 am
  // Temprarily deacvtivated whilst investigation on operational use vs internal logic tales place
  // cron.schedule('0 3 * * *', () => deleteBillingClients());
}
