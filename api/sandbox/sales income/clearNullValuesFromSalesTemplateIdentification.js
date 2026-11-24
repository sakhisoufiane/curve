require('dotenv').config();
require('../../models/db');
const Client = require('../../models/client');
const SalesTemplate = require('../../models/salesTemplate');

const run = async () => {
  if (!process.argv[2]) {
    throw 'Please provide a client id, or use --all to flush through ALl clients';
  } else {
    let filter;
    if (process.argv[2] === '--all') {
      console.log('------ processing ALL clients ------');
      filter = {};
    } else {
      filter = { _id: process.argv[2] };
    }
    // Get clients
    const clients = await Client.find(filter, { name: 1 }).sort({ name: 1 });
    for (client of clients) {
      console.log(`---- processing client: ${client.name} ----`);
      const salesTemplates = await SalesTemplate.find({ clientId: client._id.toString() });
      for (salesTemplate of salesTemplates) {
        const identifcationWithoutNullValues = salesTemplate.identification.filter((tpl) => (tpl !== null));
        if (identifcationWithoutNullValues.length !== salesTemplate.identification.length) {
          console.log(`clearing null values from template ${salesTemplate._id} ${salesTemplate.name}`);
          await SalesTemplate.findByIdAndUpdate(salesTemplate._id, { $set: { identification: identifcationWithoutNullValues } }, { timestamps: false });
        }
      }
    }
  }
}

run().then(() => {
  console.log('... Processing complete');
  process.exit(-1);
}).catch((err) => {
  console.error(err);
  process.exit(-1);
});