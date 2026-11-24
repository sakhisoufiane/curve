require('../models/db');
const Client = require('../models/client');
const AccountingPeriod = require('../models/accountingPeriod');
const netsuiteCogs = require('../libs/accounting/netsuiteCogs');
const ObjectId = require('mongodb').ObjectId;
const { BigQuery, databaseUtils, logger } = require('@curveroyaltysystems/platform-shared-utils');

AccountingPeriod.findById('614205803b361f070cbea024', (err, accountingPeriod) => {
  Client.findById(accountingPeriod.clientId, (err, client) => {
    const bigQuery = new BigQuery(databaseUtils.getBigQueryOpts(client));
    // netsuiteCogs.catalogueMappings(client, (err, mappings) => {
    //   logger.info(mappings);
    // });
    netsuiteCogs.createReport(accountingPeriod, bigQuery, client, (err, s3Key) => {
      if (err) {
        logger.error(`${accountingPeriod._id} Errored In Creating Accounting Period Report`);
        AccountingPeriod.findByIdAndUpdate(accountingPeriod._id, { $set: { calculationStatus: 'Errored In Creating Accounting Period Report' } }).exec(() => {
          
        });
      } else {
        logger.info(`${accountingPeriod._id} Sucessfully Completed Creating Accounting Period Report`);
        AccountingPeriod.findByIdAndUpdate(accountingPeriod._id, { $set: { reportCsv: s3Key } }).exec((err) => {
          logger.info('Complete');
        });
      }
    });
  });
});