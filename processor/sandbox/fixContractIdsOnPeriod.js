/* eslint-disable max-len */
require('../models/db');
const { logger, databaseUtils } = require('@curveroyaltysystems/platform-shared-utils');
const { MongoClient } = require('mongodb');
const async = require('async');

MongoClient.connect(databaseUtils.getMongoUrl('auth'), (err, mongoClient) => {
  const db = mongoClient.db(databaseUtils.getMongoDBName());
  logger.info('Connected to database');
  const periodSalesCollection = db.collection('CookingVinyl LtdPeriodSales');
  const salesCollection = db.collection('CookingVinyl LtdSales');
  let count = 0;
  const limit = 100000;
  periodSalesCollection.count({ periodId: '5b2a8824155600404358a3a6' }, (err, periodLinesCount) => {
    logger.info('periodLinesCount:', periodLinesCount);
    const rounds = listFromNumber(Math.floor(periodLinesCount / limit));
    async.eachSeries(rounds, (round, loopCb) => {
      logger.info('Round:', round);
      periodSalesCollection.find({ periodId: '5b2a8824155600404358a3a6' }).limit(limit).skip(round * limit).toArray((err, periodSales) => {
        logger.info(periodSales.length);
        async.each(periodSales, (periodSale, cb) => {
          logger.info(count);
          count += 1;
          salesCollection.findOne({ _id: periodSale.salesLineId }, (err, salesLine) => {
            if (salesLine && (!Array.isArray(salesLine.calculationContractIds) || (Array.isArray(salesLine.calculationContractIds) && !salesLine.calculationContractIds.includes(periodSale.contractId)))) {
              logger.info('Fixing Sales Line');
              logger.info(salesLine);
              salesCollection.update({ _id: periodSale.salesLineId }, { $push: { calculationContractIds: periodSale.contractId, periodIds: periodSale.periodId } }, { multi: true }, cb);
            } else {
              cb();
            }
          });
        }, loopCb);
      });
    }, (err) => {
      logger.error(err);
      db.close();
      logger.info('Complete');
    });
  });
});

function listFromNumber(number) {
  const list = [];
  for (let i = 0; i <= number; i += 1) { list.push(i); }
  return list;
}
