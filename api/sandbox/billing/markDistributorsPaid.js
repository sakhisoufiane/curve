require('dotenv').config();
require('../../models/db');
const moment = require('moment');
const Client = require('../../models/client');

async function main() {
  // All clients of the broken Lite > Distributor plan
  const query = {
    clientType: 'Distributor',
    paymentTier: 'Lite',
    'billing.billingType': 'Card',
  };

  const clients = await Client.find(query);

  const lastPaidAt = moment().format();
  console.log(`Marking the following clients as last paid at ${lastPaidAt}`, clients.map((c) => c.name));

  await Client.updateMany(query, { $set: {
    'billing.lastPaymentDate': lastPaidAt,
  } });

  console.log('done');
}

main();
