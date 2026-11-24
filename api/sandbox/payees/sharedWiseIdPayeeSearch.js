require('dotenv').config();
require('../models/db');
const fs = require('fs');
const Payee = require('../models/payee');

/*
This script is searching for all payees which 
share the same wise id and belong to the same client
then those are saved to csv
*/

const findProblematicWisePayees = async () => {
  const aggregation = [
    { $unwind: '$paymentProviders' },
    { $unwind: '$paymentProviders.wise' },
    { $unwind: '$paymentProviders.wise.recipientId' },
    { $group: {
      _id: '$paymentProviders.wise.recipientId',
      count: { $sum: 1 },
    } },
    { $match: { count: { $gt: 1 } } },
    { $sort: { count: -1 } },
  ];
  const results = await Payee.aggregate(aggregation);

  const aggregationPayees = [
    { $unwind: '$paymentProviders' },
    { $unwind: '$paymentProviders.wise' },
    { $unwind: '$paymentProviders.wise.recipientId' },
    { $match: { 'paymentProviders.wise.recipientId': { $in: results.map((item) => item._id) } } },
  ];
  const payeesWithSameWiseId = await Payee.aggregate(aggregationPayees);

  const problematicPayees = payeesWithSameWiseId.filter((payee, index) => {
    const foundPayee = payeesWithSameWiseId.find((payeeSearch, indexSearch) => payeeSearch.clientId === payee.clientId
      && payeeSearch.paymentProviders.wise.recipientId === payee.paymentProviders.wise.recipientId
      && indexSearch !== index);
    if (foundPayee) {
      return true;
    }
    return false;
  });

  console.log(`Found payees that share the same wise id and belong to the same client: ${problematicPayees.length}`);

  return problematicPayees;
};


const main = async () => {
  const payees = await findProblematicWisePayees();

  const filePath = './payees.csv';
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
  
  fs.appendFileSync(filePath, 'payee_id,payee_name,client_id,wise_recipient_id' + '\n');
  payees.map(payee => {
    const line = `${payee._id},${payee?.name || ''},${payee.clientId},${payee?.paymentProviders?.wise?.recipientId || ''}\n`;
    fs.appendFileSync(filePath, line);
  });

  console.log('Saved csv file');
};

main();
