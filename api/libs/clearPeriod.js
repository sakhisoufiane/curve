const { logger, databaseUtils } = require('@curveroyaltysystems/platform-shared-utils');
const { MongoClient } = require('mongodb');
const async = require('async');

function sales(event, callback) {
  logger.debug('Clearing Output');
  // Delete anything that has the period ID from period calculated sales
  const filter = event.type === 'Statement' ? { periodId: event.periodId, contractId: { $in: event.contractIds } } : { periodId: event.periodId };
  event.bigQuery.deleteData(event.bigQuery.outputTable, filter, (err) => {
    logger.debug('Completed Clearing Output');
    callback(err);
  });
}

function inputCosts(event, callback) {
  async.waterfall([
    function (cb) {
      // Check for connection, or connect
      if (!event.db) {
        MongoClient.connect(event.costsDatabaseUrl, databaseUtils.getMongoConnectOpts())
          .then((mongoClient) => {
            const db = mongoClient.db(event.costsDatabaseName);
            cb(null, db);
          })
          .catch(cb);
      } else {
        cb(null, event.db);
      }
    },
    function (db, cb) {
      const inputCollection = db.collection(event.costsDatabaseTable);
      const filter = event.type === 'Statement' ? { periodIds: { $in: [event.periodId] }, calculationContractIds: { $in: event.contractIds } } : { periodIds: { $in: [event.periodId] } };
      const pullQuery = event.type === 'Statement' ? { $pull: { calculationContractIds: { $in: event.contractIds } } } : { $pull: { periodIds: event.periodId, calculationContractIds: { $in: event.contractIds } } };
      inputCollection.updateMany(filter, pullQuery, { multi: true })
        .then(() => {
          if (!event.db) { db.close(); }
          cb();
        })
        .catch((err) => {
          cb(err);
        });
    },
  ], (err) => {
    callback(err);
  });
}

function outputCosts(event, callback) {
  const filter = event.type === 'Statement' ? { periodId: event.periodId, contractId: { $in: event.contractIds } } : { periodId: event.periodId };
  event.bigQuery.deleteData(event.bigQuery.costsTable, filter, (err) => {
    callback(err);
  });
}

function mcpsRetentions(event, callback) {
  async.waterfall([
    function (cb) {
      // Check for connection, or connect
      if (!event.db) {
        MongoClient.connect(event.costsDatabaseUrl, databaseUtils.getMongoConnectOpts())
          .then((mongoClient) => {
            const db = mongoClient.db(event.costsDatabaseName);
            cb(null, db);
          })
          .catch(cb);
      } else {
        cb(null, event.db);
      }
    },
    function (db, cb) {
      if (event.type !== 'Statement') {
        const inputCollection = db.collection('mcpsretentions');
        inputCollection.deleteMany({ periodId: event.periodId })
          .then(() => {
            if (!event.db) { db.close(); }
            cb();
          })
          .catch(cb);
      } else {
        cb();
      }
    },
  ], callback);
}

function mcpsNegatives(event, callback) {
  async.waterfall([
    function (cb) {
      // Check for connection, or connect
      if (!event.db) {
        MongoClient.connect(event.costsDatabaseUrl, databaseUtils.getMongoConnectOpts())
          .then((mongoClient) => {
            const db = mongoClient.db(event.costsDatabaseName);
            cb(null, db);
          })
          .catch(cb);
      } else {
        cb(null, event.db);
      }
    },
    function (db, cb) {
      if (event.type !== 'Statement') {
        const inputCollection = db.collection('mcpsnegatives');
        inputCollection.deleteMany({ periodId: event.periodId })
          .then(() => {
            if (!event.db) { db.close(); }
            cb();
          })
          .catch(cb);
      } else {
        cb();
      }
    },
  ], callback);
}

module.exports = function (event, callback) {
  /* event = {
    salesDatabaseUrl: "mongo://user:pass@database",
    salesDatabaseTable: "someSales",
    writeSalesDatabaseTable: "somePeriodSales",
    costsDatabaseUrl: "mongo://user:pass@database",
    costsDatabaseTable: "someSales",
    writeCostsDatabaseUrl: "mongo://user:pass@database",
    writeCostsDatabaseTable: "somePeriodSales",
    contractIds: [],
    periodId: "12345"
  }
  */
  async.series([
    function (cb) {
      sales(event, cb);
    },
    function (cb) {
      inputCosts(event, cb);
    },
    function (cb) {
      outputCosts(event, cb);
    },
    function (cb) {
      mcpsRetentions(event, cb);
    },
    function (cb) {
      mcpsNegatives(event, cb);
    },
  ], (err) => {
    callback(err);
  });
};
