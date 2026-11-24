const { logger, BigQuery, fileManager, databaseUtils } = require('@curveroyaltysystems/platform-shared-utils');
const { MongoClient } = require('mongodb');
const moment = require('moment');

const Client = require('../../../models/client');
const Notification = require('../../../models/notification');

const writeCsv = require('../../writeCsv');

const config = require('../../../config.json');

const AllCostsCsv = {
  create: (period, email, callback) => {
    MongoClient.connect(databaseUtils.getMongoUrl('auth'), databaseUtils.getMongoConnectOpts())
      .then((mongoClient) => {
        const db = mongoClient.db(databaseUtils.getMongoDBName());
        Client.findById(period.clientId)
          .then((client) => {
            const bigQuery = new BigQuery(databaseUtils.getBigQueryOpts(client));
            const object = {
              logKey: `${period._id.toString()} | All Costs CSV Export`,
              db,
              bigQuery,
              databaseTable: client.bigQueryPeriodCosts,
              filter: { periodId: period._id.toString() },
              template: config.exportTemplates.costs,
              noConsolidation: true,
              s3WriteKey: `periods/${period._id.toString()}/${period.name} All Calculated Costs Export ${moment().format('YYYYMMDDHHmmSSssss')}.csv`,
              s3AccessKey: process.env.S3_access_key,
              s3SecretKey: process.env.S3_secret_key,
              s3Region: process.env.S3_region,
              s3Bucket: process.env.S3_bucket,
            };
            writeCsv(object, (err, s3Key) => {
              mongoClient.close();
              if (err) {
                callback(err);
              } else {
                fileManager.publicLink24Hours(s3Key, (err, publicKey) => {
                  const subject = `Your All Costs Export for ${period.name} is Ready for Download`;
                  const generateOptions = {
                    identifier: 'reportDownload',
                    client,
                    subject,
                    email,
                    link: publicKey,
                  };
                  Notification.generate('All Costs Export Ready', subject, publicKey, generateOptions, callback);
                });
              }
            });
          })
          .catch((err) => {
            logger.error(err);
            // Project Bongo: if the client is not found, we should close the mongoClient, not done currently
            // Leaving it as is for now, but it should be fixed in the future
            // mongoClient.close();
            callback(err);
          });
      })
      .catch((connErr) => {
        logger.error(`${period._id} Error connecting to database`, connErr);
        callback(connErr);
      });
  },
};

module.exports = AllCostsCsv;
