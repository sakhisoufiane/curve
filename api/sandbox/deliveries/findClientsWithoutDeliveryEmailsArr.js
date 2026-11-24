require("dotenv").config();
require("../models/db");
const async = require('async');
const Client = require("../models/client");
const { logger } = require("@curveroyaltysystems/platform-shared-utils");
let processedCount = 0;
let batchNumber = 0;

async function findClientsWithoutDeliveryEmailsArr(lastId) {
  const clientsLimit = 100;
  
  /*
  * Configure section
  *
  */ 
  let query = { deliveryEmails: { $exists: false } };
  // configure end

  if (lastId !== null) {
    query._id = { $gt: lastId };
  }
  batchNumber++;
  logger.info(`*******************Processing batch number ${batchNumber}*******************`);
  const pubClientsWithoutDeliveryEmails = await Client.find(query).sort({ _id: 1 }).limit(clientsLimit).exec();

  await new Promise((resolve, reject) => {
    async.eachLimit(pubClientsWithoutDeliveryEmails, 10, async (client) => {
      processedCount++;
      await Client.findByIdAndUpdate(client._id, { $set: { deliveryEmails: [] } }, { timestamps: false })
      logger.info(`*******************Delivery Emails field added to ${client.name}*******************`);
    }, (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      }
    );
  });
  if (pubClientsWithoutDeliveryEmails && pubClientsWithoutDeliveryEmails.length === clientsLimit) {
    const lastClient = pubClientsWithoutDeliveryEmails[pubClientsWithoutDeliveryEmails.length - 1];
    findClientsWithoutDeliveryEmailsArr(lastClient._id);
  } else {
    logger.info(`*******************Processed ${processedCount} Clients*******************`);
    process.exit();
  }
}

findClientsWithoutDeliveryEmailsArr(null).catch((err) => {
  logger.error("*******************ERROR*******************", err);
});
