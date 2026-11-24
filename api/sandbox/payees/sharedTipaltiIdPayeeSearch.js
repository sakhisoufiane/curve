require('dotenv').config();
require('../models/db');
const fs = require('fs');
const Payee = require('../models/payee');
const Client = require('../models/client');

/*
This script is searching for all payees which 
share the same tipalti id
then those are saved to csv
*/

const findProblematicTipaltiPayees = async () => {
  const aggregation = [
    { $unwind: '$paymentProviders' },
    { $unwind: '$paymentProviders.tipalti' },
    { $unwind: '$paymentProviders.tipalti.payeeId' },
    { $group: {
      _id: '$paymentProviders.tipalti.payeeId',
      count: { $sum: 1 },
    } },
    { $match: { count: { $gt: 1 } } },
    { $sort: { count: -1 } },
  ];
  const results = await Payee.aggregate(aggregation);

  const aggregationPayees = [
    { $unwind: '$paymentProviders' },
    { $unwind: '$paymentProviders.tipalti' },
    { $unwind: '$paymentProviders.tipalti.payeeId' },
    { $match: { 'paymentProviders.tipalti.payeeId': { $in: results.map((item) => item._id) } } },
  ];
  const payees = await Payee.aggregate(aggregationPayees);

  console.log(`Found payees that share the same tipalti id: ${payees.length}`);

  return payees;
};

const main = async () => {
  const payees = await findProblematicTipaltiPayees();

  const filePath = './payees.csv';
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
  
  fs.appendFileSync(filePath, 'payee_id,payee_name,tipalti_payee_id,client_using_tipalti' + '\n');
  payees.map(async (payee) => {
    const client = await Client.findById(payee.clientId);
    const clientUsingTipalti = String(!!client?.paymentProviders?.tipalti?.apiKey);
    const line = `${payee._id},${payee?.name || ''},${payee?.paymentProviders?.tipalti?.payeeId || ''},${clientUsingTipalti || ''}\n`;
    fs.appendFileSync(filePath, line);
  });

  console.log('Saved csv file');
};

main();
