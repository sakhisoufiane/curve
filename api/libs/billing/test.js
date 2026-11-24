// const { logger } = require('@curveroyaltysystems/platform-shared-utils');
// const Invoice = require('./invoice');

// const event = {
//   s3WriteKey: 'invoice/5ab52d4a1e878f0b3cf1c780/test_invoice.pdf',
//   accessKey: process.env.S3_access_key,
//   secretAccessKey: process.env.S3_secret_key,
//   region: process.env.S3_region,
//   bucket: process.env.S3_bucket,
//   name: 'Invoice 09/2021',
//   billingInfo: {
//     dayOfMonth: 1,
//     billingType: 'Card',
//     address1: 'Address 1',
//     address2: 'Address 2',
//     city: 'Marrakech',
//     postcode: '40000',
//     country: 'FR',
//     vatNo: '12212FDA',
//     companyName: 'Simple Client',
//     stripeCustomerId: 'cus_KHjWAQ4YsJCX5B',
//     stripePaymentMethod: 'pm_1JdA96GEdIguBfryTGUdf9YC',
//     currency: 'USD',
//   },
//   usage: {
//     amount: 125,
//     vat: 0,
//     contracts: 6,
//     catalogue: 20,
//     nextBillingDate: '2021-07-07T11:50:53+01:00',
//   },
//   amount: 125,
//   vatAmount: 0,
// };

// Invoice(event, (fileLocation) => {
//   logger.debug(fileLocation);
// });

require('dotenv').config();
require('../../models/db');
const moment = require('moment');
const Billing = require('./index');
const Client = require('../../models/client');

Client.findById('60d3120daa4fbb0012c74589').then((client) => {
  client.billing.lastPaymentDate = moment().subtract(2, 'months').format();
  Billing.chargeClient(client);
});
