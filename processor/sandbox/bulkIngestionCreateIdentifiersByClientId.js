require('dotenv').config();
require('../models/db');
const { logger, TemplateMatcher, fileOpener, fileManager } = require('@curveroyaltysystems/platform-shared-utils');
const async = require('async');
const fs = require('fs');
const SalesFile = require('../models/salesFile');
const SalesTemplate = require('../models/salesTemplate');
const LibraryTemplate = require('../models/libraryTemplate');
const Client = require('../models/client');

const templateMatcher = new TemplateMatcher({ SalesTemplate, LibraryTemplate });

// Helper functions

Client.find({ bulkTemplatesComplete: { $ne: true } }, (err, clients) => {
  logger.debug('Total Clients Found:', clients.length);
  async.eachSeries(clients, (client, clientCb) => {
    console.time(`Add sales file identifiers to sales templates for client: ${client.name}`);
    // Set all sales files new param
    SalesFile.updateMany({ clientId: client._id.toString() }, { $set: { viewed: true } }, (err, res) => {
      logger.debug(res);
      // get all sales files attached to client
      SalesFile.find({ clientId: client._id.toString() }, (err, salesFiles) => {
        async.eachSeries(salesFiles, (salesFile, cb) => {
          logger.info(`processing salesFile: ${salesFile._id} ${salesFile.name}`);
          if (salesFile.salesTemplateId) {
            fileManager.getFileSize(salesFile.file, (err, size) => {
              if (err) {
                // Skip any erroring files
                cb();
              } else if (size < 10000000) {
                async.waterfall([
                  function (waterfallCb) {
                    // Download sales file
                    if (!salesFile.file) {
                      waterfallCb(new Error('No file is attached, please upload a file'));
                    } else {
                      const bucket = process.env.S3_bucket;
                      fileManager.downloadFromS3(salesFile.file, bucket, waterfallCb);
                    }
                  },
                  function (localFile, waterfallCb) {
                    // extract identifiers for all tabs
                    try {
                      fileOpener.extractIdentifiers(localFile, (err, identifiers) => {
                        fs.unlink(localFile, () => {
                          waterfallCb(null, identifiers);
                        });
                      });
                    } catch (e) {
                      fs.unlink(localFile, () => {
                        waterfallCb(null, null);
                      });
                    }
                  },
                  function (identifiers, waterfallCb) {
                    if (identifiers) {
                      // get sales template set for sales file
                      SalesTemplate.findById(salesFile.salesTemplateId, (err, salesTemplate) => {
                        if (salesTemplate) {
                          logger.debug('attempting to add identification to template with id: ', salesFile.salesTemplateId);
                          // select identification for tab set in sales template
                          const identification = identifiers[salesTemplate.tabIndex()];
                          templateMatcher.addIdentificationToTemplate(salesFile.salesTemplateId, identification, (err) => {
                            if (err) waterfallCb(err);
                            else {
                              waterfallCb(null);
                            }
                          });
                        } else {
                          logger.error(`Template NOT FOUND: ${salesFile.salesTemplateId}`);
                          waterfallCb(null);
                        }
                      });
                    } else {
                      waterfallCb();
                    }
                  },
                ], (err) => {
                  if (err) {
                    cb();
                  } else {
                    cb();
                  }
                });
              } else {
                cb();
              }
            });
          } else {
            logger.debug(`No template attached to sales file: ${salesFile._id}`);
            cb(null);
          }
        },
        () => {
          logger.debug('\n-------');
          console.timeEnd(`Add sales file identifiers to sales templates for client: ${client.name}`);
          client.bulkTemplatesComplete = true;
          client.save(clientCb);
        });
      });
    });
  }, (err) => {
    if (err) {
      logger.error(err);
    }
    logger.debug('Complete');
  });
});
