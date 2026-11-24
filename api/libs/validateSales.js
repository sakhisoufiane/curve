const { logger, databaseUtils } = require('@curveroyaltysystems/platform-shared-utils');
const { MongoClient } = require('mongodb');
const async = require('async');

module.exports = {
  line(sale, callback) {
    if (sale !== null && sale !== undefined && Object.getPrototypeOf(sale) === Object.prototype) {
      // eslint-disable-next-line max-len
      if (sale && sale.catType && sale.territory && sale.distributionChannel && sale.configuration && sale.source && sale.originalCurrency && sale.exchangeRate && sale.saleDate && sale.transactionDate && (sale.netAmount || sale.netAmount == 0) && ((sale.catType === 'Contract' && sale.contractId) || (sale.catType === 'Release' && (sale.releaseId || sale.contractId)) || (sale.catType === 'Track' && (sale.trackId || sale.contractId)) || (sale.catType === 'Work' && (sale.workId || sale.contractId)))) {
        sale.status = 'Complete';
      } else {
        sale.status = 'Incomplete';
      }
      callback(null, sale);
    } else {
      callback('An object is required');
    }
  },
  multipleLines(sales, callback) {
    const ValidateSales = this;
    if (sales !== null && sales !== undefined && Object.getPrototypeOf(sales) === Array.prototype) {
      const completeArray = [];
      async.each(sales, (sale, cb) => {
        ValidateSales.line(sale, (err, returnedSale) => {
          completeArray.push(returnedSale);
          cb();
        });
      }, () => {
        callback(null, completeArray);
      });
    } else {
      callback('An array is required');
    }
  },
  byFilter(filter, databaseUrl, databaseName, databaseCollection, callback) {
    const ValidateSales = this;
    if (filter && databaseUrl && databaseCollection) {
      MongoClient.connect(databaseUrl, databaseUtils.getMongoConnectOpts())
        .then((mongoClient) => {
          const db = mongoClient.db(databaseName);
          logger.info(`Connected successfully to data ${databaseUrl}`);
          const collection = db.collection(databaseCollection);
          collection.find(filter)
            .toArray()
            .then((result) => {
              async.each(result, (sale, cb) => {
                const preStatus = sale.status;
                ValidateSales.line(sale, (valErr, updatedLine) => {
                  if (updatedLine.status != preStatus) {
                    collection.updateOne({ _id: sale._id }, { $set: { status: updatedLine.status } }).then(() => cb()).catch(cb);
                  } else {
                    cb(valErr);
                  }
                });
              }, () => {
                // Close DB Connection
                mongoClient.close();
                callback(null, true);
              });
            })
            .catch(callback);
        })
        .catch(callback);
    } else {
      callback('byFilter requires a filter, database url and collection name');
    }
  },
};
