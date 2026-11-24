/*
Description: Updates Deliveries with the 'type' field from associated Delivery Partner for FE display
Time To Run: 00:00:14s (Staging)
Ticket No: CUR-2772
Category: Publishing, Deliveries
Author: Joe Osborne
*/
require('dotenv').config();
require('../models/db');
const appRootDir = require('app-root-dir').get();
const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const async = require('async');
const fs = require('fs');

const cwrDelivery = require('../models/cwrDelivery');
const DeliveryPartner = require('../models/deliveryPartner');

const border = '********';
const log = (message) => { logger.info(`${border} ${message} ${border}`); };
const logErr = (message) => { logger.error(`${border} ${message} ${border}`); };

const outputLocation = `${appRootDir}/tmp/updatedDeliveriesReport.csv`;
const deliveriesFindBatchSize = 1000;
let count = 0;
let batchRun = 0;

const updateDeliveryTypeField = async (lastId) => {
  batchRun++;
  const query = {};

  if (lastId) {
    query._id = { $gt: lastId };
  }

  const deliveries = await cwrDelivery.find(query, { _id: 1, deliveryPartnerId: 1, clientId: 1 }).sort({ _id: 1 }).limit(deliveriesFindBatchSize);
  lastId = deliveries[deliveries.length - 1]?._id;

  log(`Processing batch number ${batchRun} containing ${deliveries.length} Deliveries`);

  await async.eachLimit(deliveries, 100, async (delivery) => {
    const reportData = await updateDelivery(delivery);
    await addDataToReport(reportData);
  });

  if (deliveries && deliveries.length === deliveriesFindBatchSize) {
    await updateDeliveryTypeField(lastId);
  } else {
    log(`${count} deliveries processed. Report written: ${outputLocation}`);
    process.exit(0);
  }
};

const updateDelivery = async (delivery) => {
  count++;
  const reportData = [];
  if (!delivery.deliveryPartnerId) {
    reportData.push({ clientId: delivery.clientId, ID: delivery._id, succeeded: 'false', reason: 'No Delivery Partner ID'});
  } else {
    const deliveryPartner = await DeliveryPartner.findOne({ _id: delivery.deliveryPartnerId }, { type: 1 });
    if (!deliveryPartner) {
      reportData.push({ clientId: delivery.clientId, ID: delivery._id, succeeded: 'false', reason: `Error retrieving Delivery Partner ${delivery.deliveryPartnerId}` });
    } else {
      const updatedDelivery = await cwrDelivery.updateOne({ _id: delivery._id }, { $set: { deliveryPartnerType: deliveryPartner.type } }, { timestamps: false });
      if (!updatedDelivery) {
        reportData.push({ clientId: delivery.clientId, ID: delivery._id, succeeded: 'false', reason: 'Unknown error'});
      } else {
        reportData.push({ clientId: delivery.clientId, ID: delivery._id, succeeded: 'true', reason: ''});
      }
    }
  }
  return reportData;
};

const addDataToReport = (reportData) => {
  return new Promise ((resolve, reject) => {
    if (reportData.length > 0) {
      if (!fs.existsSync(outputLocation)) {
        fs.writeFileSync(outputLocation, 'CLIENT ID,DELIVERY ID,SUCCESSFULLY UPDATED,REASON\n');
      }
      const outputData = reportData.map((line) => [line.clientId, line.ID, line.succeeded, line.reason].join(',') + '\n').join('');
      try {
        fs.appendFileSync(outputLocation, outputData);
        resolve();
      } catch (err) {
        logErr(`Error Writing Data: ${err}`);
        reject(err);
      }
    } 
  });
};

updateDeliveryTypeField(null);
