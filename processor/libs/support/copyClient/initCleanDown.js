require('dotenv').config();
require('../../../models/db');

const _ = require('lodash');
const { logger, databaseUtils } = require('@curveroyaltysystems/platform-shared-utils');
const { MongoClient, ObjectId } = require('mongodb');
const { waterfall } = require('async');
const { copyFromConfig, copyToConfig } = require('./config');

const prodConfig = copyFromConfig;
const stagingConfig = copyToConfig;
let prodDB;
let stagingDB;

const compareEnvClientModule = (callback) => {
  let dupeCount = 0;
  let deleteCount = 0;

  waterfall([
    // Connect to DB
    (cb) => {
      const mongoConnectOpts = databaseUtils.getMongoConnectOpts();

      MongoClient.connect(
        // Define from Db
        prodConfig.dbUri,
        mongoConnectOpts,
        (prodDBErr, prodMongoClient) => {
          if (prodDBErr) {
            logger.error(`Failed to connect to FROM db: ${prodConfig.dbUri}`);
            logger.error(prodDBErr);
            return cb(prodDBErr);
          }
          prodDB = prodMongoClient.db('curve-production');
          // Connect to Staging DB
          MongoClient.connect(
            // Define to DB
            stagingConfig.dbUri,
            mongoConnectOpts,
            (stagingDBErr, stagingMongoClient) => {
              if (stagingDBErr) {
                logger.error(`Failed to connect to TO db: ${stagingConfig.dbUri}`);
                logger.error(stagingDBErr);
                callback(stagingDBErr);
              } else {
                stagingDB = stagingMongoClient.db('curve-production');
                logger.info('Connected to both DBs');
                logger.debug(`Copy client FROM : ${prodConfig.dbUri}`);
                logger.debug(`Copy client TO   : ${stagingConfig.dbUri}`);
                cb();
              }
            },
          );
        },
      );
    },
    //  (cb) => {
    // return cb()
    // const filter = {
    //   _id: { $nin: [
    //     ObjectId('61e19e681fdeb5001e83bf74'),
    //     ObjectId('617fbaa426d00d002445118d'),
    //     ObjectId('6228c60de17e7700279c6601'),
    //     ObjectId('619b9a02afb5a60026daba5f'),
    //     ObjectId('6033962f73f953000f5a0623'),
    //     ObjectId('61fc066a0a334b00268561e7'),
    //     ObjectId('6202a3cd7f0aca0027a15ec5'),
    //     ObjectId('621f0b95fa73b800413c5d40'),
    //     ObjectId('621f0baafa73b800413c5d4f'),
    //     ObjectId('6244160cde663d00262bb238'),
    //     ObjectId('62d5013cdc26722969f51346'),
    //     ObjectId('60d3120daa4fbb0012c74589'),
    //     ObjectId('62569eaab68ad100211d480d'),
    //     ObjectId('62569f40cb5af60024dfc23a'),
    //     ObjectId('6076f9b07b256100d9601bfd'),
    //     ObjectId('607c705711199f00209d4f98'),
    //     ObjectId('60b93c46c9d4de0018bcd694'),
    //     ObjectId('62e79370280d37784eb60d36'),
    //   ] },
    // };
    // // Load all Staging Clients
    // stagingDB.collection('clients').find(filter, { bigQueryDataset: 1 }).toArray((err, stagingClients) => {
    // // Load all Production Clients
    //   prodDB.collection('clients').find({}, { bigQueryDataset: 1 }).toArray((err, prodClients) => {
    //     prodClients.forEach((prodClient) => {
    //       const stagingClient = _.find(stagingClients, { _id: prodClient._id });
    //       const stagingClientBigQueryDataset = stagingClient?.bigQueryDataset;
    //       const prodClientBigQueryDataset = prodClient?.bigQueryDataset;

    //       if (stagingClientBigQueryDataset === prodClientBigQueryDataset) {
    //         dupeCount += 1;
    //         logger.info({
    //           stagingClientBigQueryDataset,
    //           prodClientBigQueryDataset,
    //         });
    //       } else if (stagingClientBigQueryDataset) {
    //         deleteCount += 1;
    //         logger.info(stagingClientBigQueryDataset);
    //       }
    //     });
    //     logger.info(`${dupeCount} Clients with same BQ table for Production and Staging.\n${deleteCount} staging datasets to remove`);
    //     cb();
    //   });
    // });
    //  },
    (cb) => {
      const filter = {
        _id: { $nin: [
          ObjectId('61e19e681fdeb5001e83bf74'),
          ObjectId('617fbaa426d00d002445118d'),
          ObjectId('6228c60de17e7700279c6601'),
          ObjectId('619b9a02afb5a60026daba5f'),
          ObjectId('6033962f73f953000f5a0623'),
          ObjectId('61fc066a0a334b00268561e7'),
          ObjectId('6202a3cd7f0aca0027a15ec5'),
          ObjectId('621f0b95fa73b800413c5d40'),
          ObjectId('621f0baafa73b800413c5d4f'),
          ObjectId('6244160cde663d00262bb238'),
          ObjectId('62d5013cdc26722969f51346'),
          ObjectId('60d3120daa4fbb0012c74589'),
          ObjectId('62569eaab68ad100211d480d'),
          ObjectId('62569f40cb5af60024dfc23a'),
          ObjectId('6076f9b07b256100d9601bfd'),
          ObjectId('607c705711199f00209d4f98'),
          ObjectId('60b93c46c9d4de0018bcd694'),
          ObjectId('62e79370280d37784eb60d36'),
        ] },
      };
      // Load all Staging Clients
      stagingDB.collection('clients').find(filter, { bigQueryDataset: 1 }).toArray((err, stagingClients) => {
      // Load all Production Clients
        prodDB.collection('clients').find({}, { bigQueryDataset: 1 }).toArray((err, prodClients) => {
          stagingClients.forEach((stagingClient) => {
            const prodClient = _.find(prodClients, { bigQueryDataset: stagingClient.bigQueryDataset });
            const stagingClientBigQueryDataset = stagingClient?.bigQueryDataset;
            const prodClientBigQueryDataset = prodClient?.bigQueryDataset;
            const prodClientName = prodClient?.name;
            const prodClientId = prodClient?._id;

            if (stagingClientBigQueryDataset === prodClientBigQueryDataset) {
              dupeCount += 1;
              logger.info({
                prodClientId,
                prodClientName,
                stagingClientBigQueryDataset,
                prodClientBigQueryDataset,
              });
            } else if (stagingClientBigQueryDataset) {
              deleteCount += 1;
              logger.info(stagingClientBigQueryDataset);
            }
          });
          logger.info(`${dupeCount} Clients with same BQ table for Production and Staging.\n${deleteCount} staging datasets to remove`);
          cb();
        });
      });
    },
  ], (err) => {
    callback(err);
  });
};

compareEnvClientModule((err) => {
  if (err) { logger.error(err); }
  process.exit(0);
});
