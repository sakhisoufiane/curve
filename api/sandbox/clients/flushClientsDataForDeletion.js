require('dotenv').config();
require('../models/db');
const moment = require('moment');
const { eachLimit } = require('async');
const Client = require('../models/client');

const run = async () => {
  // Get total clients
  const clients = await Client.find({});
  const total = clients.length; let count = 0;
  // Update clients data
  await eachLimit(clients, 10, async (client) => {
    // Increment count and set lastId
    count += 1;
    const update = {};
    // 1. Set prevent deletion to true
    update.preventDeletion = true;
    // 2. Set billing type
    update['billing.billingType'] = 'Invoice';
    // 3. Set billing amount
    if (client.monthlyPrice) { update['billing.amount'] = client.monthlyPrice }
    // 4. Accept T&Cs
    update.tsAndCsAcceptedDate = moment().format();
    // Update client
    await Client.findByIdAndUpdate(client._id, { $set: update }, { timestamps: false });
    process.stdout.write(`\rProcessed Client: ${client._id.toString()} (${count}/${total})`);
  })
}

run().then(() => { console.log('... Processing complete'); process.exit(-1); }).catch(console.log);