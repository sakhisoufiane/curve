require('dotenv').config();
require('../../models/db');
const async = require('async');
const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const XMLIngestion = require('./index');
const Client = require('../../models/client');

const generalIngestionFTPDetails = [
  {
    ftpHost: process.env.GENERAL_INGESTION_FTP_HOST,
    ftpUsername: process.env.GENERAL_INGESTION_FTP_USERNAME,
    ftpPassword: process.env.GENERAL_INGESTION_FTP_PASSWORD,
  },
];

// Run for Client Specific feeds
function clientSpecificFeeds(clientId, callback) {
  const query = { ftpHost: { $exists: true } };
  if (clientId) query._id = clientId;
  // Find clients with FTP ingestion host set
  Client.find(query)
    .then((clients) => {
      // Loop through each client
      async.eachLimit(clients, 3, (client, cb) => {
        // Get client labels
        client.contractLabels((err, labelMappings) => {
          logger.info(`DDEX Ingestion: Running for ${client.name} - ${client._id.toString()}`);
          if (client.ftpHost && client.ftpUsername && client.ftpPassword) {
            // Set root if not set
            if (!client.ftpRootDir) { client.ftpRootDir = '/'; }
            // Remove mappings if client should not be mapped
            if (!client.matchContractOnImport) { labelMappings = {}; }
            // Call ingestion with params
            XMLIngestion.ingest(
              {
                protocol: client.ftpProtocol || 'FTP',
                host: client.ftpHost,
                username: client.ftpUsername,
                password: client.ftpPassword,
                port: client.ftpPort || 21,
                authenticationType: client.ftpAuthenticationType,
                privateKey: client.ftpFileKey,
              },
              client._id,
              client.ftpRootDir,
              client.ftpNoDdexBatches,
              client.ftpImportDefaultDistributionChannel,
              labelMappings,
              client.setDefaultReleaseIdOnImport,
              client.ingestForeignIds,
              client.useBarcodeAsCatNoOnImport,
              null,
              client.howToIngestOtherIdsOnImport,
              client.ddexDoNotUpdateExistingLabel,
              (err) => {
                if (err) {
                  logger.error(`DDEX Ingestion: Error: ${client.name} - ${client._id.toString()} : ${err}`);
                } else {
                  logger.info(`DDEX Ingestion: Completed for ${client.name} - ${client._id.toString()}`);
                }
                cb();
              },
            );
          } else {
            cb();
          }
        });
      }, callback);
    })
    .catch((err) => {
      logger.error(err);
      callback(err);
    });
}

// Run for general ingestion feeds
function generalIngestionFeeds(callback) {
  // Load client mappings - only clients with distributorFeedDdex set to true and ddexIngestionClientId
  const clientMappings = {};
  Client.find({ 'features.distributorFeedDdex': true, ddexIngestionClientId: { $exists: true } })
    .then((clients) => {
      clients.forEach((client) => {
        clientMappings[client.ddexIngestionClientId] = client._id.toString();
      });
      // Loop through each FTP
      async.eachLimit(generalIngestionFTPDetails, 3, (ftpDetails, cb) => {
        // Call ingestion with params
        XMLIngestion.ingest({
          host: ftpDetails.ftpHost,
          username: ftpDetails.ftpUsername,
          password: ftpDetails.ftpPassword,
          port: 21,
        }, null, '/', null, null, {}, false, false, false, clientMappings, null, false, (err) => {
          if (err) {
            logger.error(`DDEX Ingestion: Error: ${ftpDetails.ftpHost} - ${clientMappings[ftpDetails.ftpHost]} : ${err}`);
          } else {
            logger.info(`DDEX Ingestion: Completed for ${ftpDetails.ftpHost} - ${clientMappings[ftpDetails.ftpHost]}`);
          }
          cb();
        });
      }, (err) => {
        logger.info('DDEX Ingestion: Complete');
        callback();
      });
    })
    .catch((err) => {
      logger.error(err);
      callback(err);
    });
}

module.exports = {
  clientSpecificFeeds,
  generalIngestionFeeds,
};
