/* eslint-disable max-len */
require('../models/db');
const { logger, databaseUtils } = require('@curveroyaltysystems/platform-shared-utils');
const { MongoClient } = require('mongodb');
const async = require('async');
const Period = require('../models/period');
const Client = require('../models/client');
const Contract = require('../models/contract');
const Release = require('../models/release');
const Track = require('../models/track');
const Work = require('../models/work');

MongoClient.connect(databaseUtils.getMongoUrl('auth'), (err, mongoClient) => {
  const db = mongoClient.db(databaseUtils.getMongoDBName());
  logger.info('Connected to database');
  const periodSalesCollection = db.collection('CookingVinyl LtdPeriodSales');
  const salesCollection = db.collection('CookingVinyl LtdSales');
  let count = 0;
  const limit = 10000;
  getFilter((err, filter) => {
    logger.info('Filter:');
    logger.info(filter);
    salesCollection.count(filter, (err, linesCount) => {
      const rounds = listFromNumber(Math.floor(linesCount / limit));
      async.eachSeries(rounds, (round, loopCb) => {
        logger.info('Round:', round);
        salesCollection.find(filter).limit(limit).skip(round * limit).toArray((err, lines) => {
          logger.info('Total Lines:', lines.length);
          async.eachSeries(lines, (line, cb) => {
            count += 1;
            logger.info(count, '/', lines.length);
            processLine(salesCollection, periodSalesCollection, line, cb);
          }, loopCb);
        });
      }, (err) => {
        logger.error(err);
        logger.info('Complete');
      });
    });
  });
});

function getFilter(callback) {
  Period.findById('5b2a8824155600404358a3a6', (err, period) => {
    Client.findById(period.clientId, (err, client) => {
      client.save();
      // Get Contracts that aren't associated with this period
      let contractIds; let releaseIds; let trackIds; let workIds; let
        includedContractIds;
      async.waterfall([
        function (cb) {
          Contract.distinct('_id', { clientId: client._id.toString(), accountingPeriod: { $ne: period.accountingPeriodType } }, cb);
        },
        function (foundContractIds, cb) {
          contractIds = foundContractIds.map((id) => id.toString());
          Release.distinct('_id', { clientId: client._id.toString(), salesReturnsRights: { $elemMatch: { contractId: { $in: contractIds } } } }, (err, releases) => {
            if (err) {
              cb(err);
            } else {
              releaseIds = releases.map((id) => id.toString());
              cb();
            }
          });
        },
        function (cb) {
          Track.distinct('_id', { clientId: client._id.toString(), salesReturnsRights: { $elemMatch: { contractId: { $in: contractIds } } } }, (err, tracks) => {
            if (err) {
              cb(err);
            } else {
              trackIds = tracks.map((id) => id.toString());
              cb();
            }
          });
        },
        function (cb) {
          Work.distinct('_id', { clientId: client._id.toString(), salesReturnsRights: { $elemMatch: { contractId: { $in: contractIds } } } }, (err, works) => {
            if (err) {
              cb(err);
            } else {
              workIds = works.map((id) => id.toString());
              cb();
            }
          });
        },
        function (cb) {
          Contract.distinct('_id', { clientId: client._id.toString(), accountingPeriod: period.accountingPeriodType }, (err, inContractIds) => {
            includedContractIds = inContractIds.map((id) => id.toString());
            cb();
          });
        },
      ], (err) => {
        logger.info(releaseIds);
        logger.info(trackIds);
        logger.info(workIds);
        if (err) {
          callback(err);
        } else {
          const filter = {
            salesFileId: { $in: period.salesFilesIds }, status: 'Complete', calculationContractIds: { $nin: includedContractIds }, releaseId: { $nin: releaseIds }, trackId: { $nin: trackIds }, workId: { $nin: workIds },
          };
          callback(null, filter);
        }
      });
    });
  });
}

// function getLines(collection, filter, callback) {
//   collection.find(filter).toArray(callback);
// }

function processLine(inputCollection, outputCollection, line, callback) {
  outputCollection.findOne({ salesLineId: line._id }, (err, periodLine) => {
    if (periodLine) {
      if (!line.calculationContractIds || (Array.isArray(line.calculationContractIds) && !line.calculationContractIds.includes(periodLine.contractId))) {
        inputCollection.update({ _id: line._id }, { $push: { calculationContractIds: periodLine.contractId, periodIds: periodLine.periodId } }, { multi: true }, (err) => {
          logger.info('Updated Line:', line);
          callback();
        });
      }
    } else {
      callback();
    }
  });
}

function listFromNumber(number) {
  const list = [];
  for (let i = 0; i <= number; i += 1) { list.push(i); }
  return list;
}
