require('dotenv').config();
require('../models/db');
const { logger, BigQuery, databaseUtils } = require('@curveroyaltysystems/platform-shared-utils');
const async = require('async');
const { MongoClient } = require('mongodb');
const Period = require('../models/period');
const Client = require('../models/client');
const Contract = require('../models/contract');
const CalculateSales = require('../libs/calculation/period/calculateSales');
const CalculateContract = require('../libs/calculation/contract/calculateContract');

Period.findById('626b65e2c5addf001d18796d', (err, period) => {
  Client.findById(period.clientId, (err, client) => {
    MongoClient.connect(databaseUtils.getMongoUrl('auth'), databaseUtils.getMongoConnectOpts(), (err, mongoClient) => {
      let generatePayments = false;
      const db = mongoClient.db(databaseUtils.getMongoDBName());
      // Setup BigQuery connection
      const bigQuery = new BigQuery(databaseUtils.getBigQueryOpts(client));
      Contract.find({ name: {$eq: 'Spare Music Ltd.'}, clientId: period.clientId }, (err, contracts) => {
        //CalculateSales.getContractSizes(period, bigQuery, contracts, (err, counts) => {
          // console.log(counts);
          // Get contract sizes
          const oldContractSizes = {};
          async.eachLimit(contracts, 5, (contract, contractCb) => {
            console.log(contract);
            CalculateContract.contractQuery(contract, bigQuery, period, {salesFileId: {$in: period.salesFilesIds}}, null, false, true, (contractErr, newQuery) => {
              console.log(newQuery);
              // if (contractErr) { return contractCb(contractErr); }
              // logger.debug(`${period._id} Getting Sizes:`, newQuery);

              // bigQuery.getSize(bigQuery.inputTable, '*', newQuery, (getSizeErr, data) => {
                
              //   if (data && data[0]) {
              //     oldContractSizes[contract._id.toString()] = data[0].count;
              //   }
              //   contractCb();
              // });
            });
          }, (eachContractErr) => {
            Object.keys(oldContractSizes).forEach((contractId) => {
              if (oldContractSizes[contractId] !== counts[contractId]) {
                console.log(`${contractId} ${oldContractSizes[contractId]} - ${counts[contractId]}`);
              }
            });
          });
        //});
      });
    });
  });
});