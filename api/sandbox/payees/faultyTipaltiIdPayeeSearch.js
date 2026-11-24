require('dotenv').config();
require('../models/db');
const fs = require('fs');
const Payee = require('../models/payee');
const Client = require('../models/client');

/*
This script is searching for all payees which 
payment provider tipalti has assigned different id then payee id
then those are saved to csv
*/

const main = async () => {
  const payees = await Payee.find(
    { 'paymentProviders.tipalti.payeeId': { $exists: true },
      $where: 'this._id != this.paymentProviders.tipalti.payeeId' },
  );

  console.log(`Found payees where tipalti id doesnt match payee id: ${payees.length}`);

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
