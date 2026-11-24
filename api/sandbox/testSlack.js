const HyperCare = require('../controllers/hypercare');
const Client = require('../models/client');
const Period = require('../models/period');

require('../models/db');

const run = async () => {
  const period = await Period.findById('6790f3ffaf1fbe593580f742');
  const client = await Client.findById(period.clientId);

  await HyperCare.notifyPeriodRun({ client, period });
};

run().then(() => {
  console.log('Done');
  process.exit(0);
}).catch((error) => {
  console.error(error);
  process.exit(1);
});