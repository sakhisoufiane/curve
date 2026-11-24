require('dotenv').config();
require('../models/db');
const fs = require('fs');
const Payee = require('../models/payee');
const Client = require('../models/client');

/*
This script is searching for all payees which 
payment provider tipalti has assigned different id then payee id
then fixes those that are not in use
*/

const main = async () => {
  const payees = await Payee.find(
    { 'paymentProviders.tipalti.payeeId': { $exists: true },
      $where: 'this._id != this.paymentProviders.tipalti.payeeId' },
  );

  console.log(`Found payees where tipalti id doesnt match payee id: ${payees.length}`);

  payees.map(async (payee) => {
    const client = await Client.findById(payee.clientId);
    const clientUsingTipalti = !!client?.paymentProviders?.tipalti?.apiKey;

    if (!clientUsingTipalti) {
      console.log(`Updating payee - ${payee._id}`);
      await Payee.updateOne({ _id: payee._id }, { $set: { 'paymentProviders.tipalti.payeeId': payee._id?.toString() } }, { timestamps: false });
    }
  });

  console.log('Payees fixed');
};

main();
