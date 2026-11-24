// File not functional to to non existent lmabda library

require('../models/db');
const { logger, databaseUtils } = require('@curveroyaltysystems/platform-shared-utils');
const async = require('async');
const { MongoClient } = require('mongodb');
const SalesFile = require('../models/salesFile');
const Client = require('../models/client');
const Work = require('../models/work');
const lambda = require('../libs/lambda');

const limit = 500;

const clientId = '5b8d5f1aebe3190f018da121';
MongoClient.connect(databaseUtils.getMongoUrl('auth'), (err, mongoClient) => {
  const db = mongoClient.db(databaseUtils.getMongoDBName());
  Client.findById(clientId, (err, client) => {
    SalesFile.find({ clientId }, { _id: 1 }, (err, salesFiles) => {
      const salesFileIds = salesFiles.map((salesFile) => salesFile._id.toString());
      const results = [];
      const object = {
        salesDatabaseTable: client.salesDatabaseTable,
        salesFilesIds: salesFileIds,
        costIds: [],
        releases: [],
        tracks: [],
        works: [],
      };
      let worksCount = 0;
      async.waterfall([
        function (cb) {
          Work.count({ clientId }, (err, count) => {
            worksCount = count;
            cb();
          });
        },
        function (cb) {
        // Get Works
          const rounds = listFromNumber(Math.floor(worksCount / limit));
          async.eachSeries(rounds, (round, loopCb) => {
            const newObject = JSON.parse(JSON.stringify(object));
            Work.find({ clientId }, '_id title composer identifier iswc tunecode salesReturnsRights').limit(limit).skip(round * limit).exec((err, foundWorks) => {
              newObject.works = foundWorks;
              results.push(newObject);
              loopCb(err);
            });
          }, cb);
        },
      ], (err) => {
        logger.info('Results length:', results.length);
        let counter = 1;
        async.eachSeries(results, (set, cb) => {
          set.db = db;
          lambda.setCatalogueValuesToSales(set, (err) => {
            logger.info('Completed set', counter);
            counter += 1;
            cb(err);
          });
        }, (err) => {
          logger.error(err);
          logger.info('Complete');
        });
      });
    });
  });
});

function listFromNumber(number) {
  const list = [];
  for (let i = 0; i <= number; i += 1) { list.push(i); }
  return list;
}
