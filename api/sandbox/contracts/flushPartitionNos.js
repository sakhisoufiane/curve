require('dotenv').config();
require('../models/db');
const async = require('async');
const { logger, BigQuery, databaseUtils } = require('@curveroyaltysystems/platform-shared-utils');
const Client = require('../models/client');
const Contract = require('../models/contract');
const Statement = require('../models/statement');

const clientId = '5d2d9f169d1f4f26150c6b6b';
Client.findById(clientId, (err, client) => {
  const bigQuery = new BigQuery(databaseUtils.getBigQueryOpts(client));
  Contract.find({ clientId }, (err, contracts) => {
    const partitionGroups = {};
    // Group contract IDs by code
    contracts.forEach((contract) => {
      partitionGroups[contract.partitionNo] = partitionGroups[contract.partitionNo] || [];
      partitionGroups[contract.partitionNo].push(contract._id.toString());
    });
    async.waterfall([
      (waterfallCb) => {
        // Flush statement partition nos
        async.eachSeries(Object.keys(partitionGroups), (partitionNo, cb) => {
          Statement.find({ clientId, contractId: { $in: partitionGroups[partitionNo] } }, 'partitionNo', (err, statements) => {
            console.log(`PartitionNo: ${partitionNo} - ${statements.length}`);
            async.eachLimit(statements, 5, (statement, statementCb) => {
              statement.partitionNo = partitionNo;
              statement.save(statementCb);
            }, cb);
          });
        }, waterfallCb);
      },
      (waterfallCb) => {
        // Update BigQuery
        async.eachSeries(Object.keys(partitionGroups), (partitionNo, cb) => {
          // FYI - setting something to 0 is being skipped by the bigQuery library at time of writing
          if (partitionNo !== '00') {
            bigQuery.updateData(bigQuery.outputTable, { contractId: { $in: partitionGroups[partitionNo] } }, { contractPartitionNo: parseInt(partitionNo) }, (err) => {
              if (err) {
                console.error(err);
                cb(err);
              } else {
                console.log(`Updated Partition No: ${partitionNo}`);
                cb();
              }
            });
          } else {
            cb();
          }
        }, waterfallCb);
      }
    ])

  });
});
