/*
Description: Add paymentSetup and Curve Pay API Key to all clients with payments disabled
Time To Run: 00:00:56s (Development x 346 Clients, Production x 3322 Clients = ? 00:09:00s ?)
Ticket No: CUR-4232
Category: Payments/Clients
Author: Matt Robins
*/

require('../../models/db');
require('dotenv').config();

const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const axios = require('axios').default;
const Client = require('../../models/client');

let clientsUpdated = 0;
let clientsFailed = 0;

/*
  Generate API key for each client using Curve Pay API
*/
const getPaymentsApiKey = async ({ id, name }) => {
  const getPaymentsApiKeyBody = {
    "referrer_client_id": id,
    "referrer_client_name": name,
    "referrer_id": "curve",
    "payment_provider_id": "currency-cloud"
  }
  const url = `${process.env.PAYMENTS_APP_URL}/api/v1/client`;
  const headers = {
    'Content-Type': 'application/json',
    'x-api-key': process.env.PAYMENTS_API_KEY,
  };
  const response = await axios.post(url, getPaymentsApiKeyBody, { headers },);

  if (response.status !== 200) {
    logger.error(`Error generating API Key: ${id} - ${name}: ${response.statusText}`);
    clientsFailed += 1;
    return null;
  }

  return response.data.api_key
};

/*
  Update client with new API key and enable payments
*/
const updateClient = async ({ id, apiKey }) => {
  await Client.updateOne({ _id: id }, {
    $set: {
      'paymentProviders.curvePay.apiKey': apiKey,
      'paymentProviders.selectedPaymentProvider': 'Curve Pay',
      'features.paymentSetup': true,
    }
  });

  clientsUpdated += 1;
};

/*
  Main Process
*/
const addPaymentsToAllClients = async () => {
  try {
    if (!process.env.PAYMENTS_APP_URL || !process.env.PAYMENTS_API_KEY) {
      throw new Error('Payments API URL or API Key not set in environment variables');
    }

    // Get list of clients with no payments functionality enabled and not currently using Tipalti or Wise
    const clients = await Client.find(
      {
        $and: [
          { $or: [{ "features.payments": false }, { "features.payments": { $exists: false } }] },
          { $or: [{ "features.paymentSetup": false }, { "features.paymentSetup": { $exists: false } }] },
          { "paymentProviders.selectedPaymentProvider": { $nin: ["Tipalti", "Wise"] } },
          { $or: [{ "paymentProviders.curvePay.apiKey": { $exists: false } }, { "paymentProviders.curvePay.apiKey": "" }] }
        ]
      },
      '_id name'
    );
    logger.info(`${clients.length} Clients found with payments disabled`);

    for (const client of clients) {
      logger.info(`Client: ${client._id} - ${client.name}`);

      try {
        const apiKey = await getPaymentsApiKey({ id: client._id.toString(), name: client.name });
        if (!apiKey) continue;

        await updateClient({ id: client._id, apiKey });
      } catch (error) {
        clientsFailed += 1;
        logger.error(`${client._id} - ${client.name}: ${error.response?.data?.message || error.message} ${error.response?.data?.code || error.code}`);
      }
    };

    logger.info(`Update Complete, ${clientsUpdated} Clients updated, ${clientsFailed} Clients failed`);
    process.exit(0);
  } catch (error) {
    logger.error('Error updating clients', error);
    process.exit(-1);
  }
};

addPaymentsToAllClients();
