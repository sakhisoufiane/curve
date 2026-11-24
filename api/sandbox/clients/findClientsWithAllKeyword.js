require('dotenv').config();
require('../models/db');
const fs = require('fs');
const Client = require('../models/client');
const appRootDir = require('app-root-dir').get();

const main = async () => {
  const fields = ['configurations', 'distributionChannels', 'priceCategories', 'costTypes', 'catalogueGroups'];
  const values = ['All', 'all', 'ALL'];

  const orConditions = fields.flatMap(field => 
    values.map(value => ({ [field]: value }))
  );

  const clients = await Client.find({ $or: orConditions });

  // delete file if exists
  const filePath = `${appRootDir}/clientsWithAllKeyWord.csv`;
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }

  fs.appendFileSync(filePath, 'client_id,client_name\n');
  clients.forEach(client => {
    const line = `${client._id},${client?.name}\n`;
    fs.appendFileSync(filePath, line);
  });

  console.log('script complete:', filePath);
};

main();
