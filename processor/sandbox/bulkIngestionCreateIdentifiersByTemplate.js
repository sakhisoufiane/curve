require('dotenv').config();
require('../models/db');
const { logger, TemplateMatcher, fileOpener, fileManager } = require('@curveroyaltysystems/platform-shared-utils');
const async = require('async');
const fs = require('fs');
const SalesTemplate = require('../models/salesTemplate');
const LibraryTemplate = require('../models/libraryTemplate');
const Client = require('../models/client');

const templateMatcher = new TemplateMatcher({ SalesTemplate, LibraryTemplate });

Client.find({ name: { $ne: 'Mad Decent Protocol, LLC' } }, (err, clients) => {
  async.eachSeries(clients, (client, clientCb) => {
    logger.debug('------');
    logger.debug(client.name);
    SalesTemplate.find({ clientId: client._id.toString() }, (err, salesTemplates) => {
      let count = 0;
      async.eachSeries(salesTemplates, (salesTemplate, templateCb) => {
        count += 1;
        logger.debug(`${client.name} : ${count} / ${salesTemplates.length} id:${salesTemplate._id}`);
        console.time(`${client.name} : ${count} / ${salesTemplates.length} id:${salesTemplate._id}`);
        if (!salesTemplate.identification || salesTemplate.identification.length == 0) {
          // Check file exists
          fileManager.getFileSize(salesTemplate.file, (err) => {
            if (err) {
              logger.error(`>>>${err}`);
              templateCb();
            } else {
              fileManager.downloadFromS3(salesTemplate.file, process.env.S3_bucket, (err, localFile) => {
                if (err) {
                  logger.error(`>>>${err}`);
                  templateCb();
                } else {
                  try {
                    if (fs.existsSync(localFile)) {
                      async.waterfall([
                        function (cb) {
                          fileOpener.detectExtension(localFile, cb);
                        },
                        function (type, cb) {
                          const options = { returnAllTabs: true, maxRows: 20, encoding: salesTemplate.encoding };
                          fileOpener.readData(localFile, type, options, cb);
                        },
                      ], (err, totalTabs, tabs, tabNames) => {
                        if (err) {
                          logger.error(`>>>${err}`);
                          templateCb();
                        } else {
                          let identifiers = [];
                          if (tabs) {
                            identifiers = tabs.map((rows) => templateMatcher.buildIdentification(totalTabs, rows));
                          }
                          if (identifiers) {
                            fs.unlinkSync(localFile);
                            logger.debug(`attempting to add identification to template with id: ${salesTemplate._id}`);
                            // select identification for tab set in sales template
                            const identification = identifiers[salesTemplate.tabIndex()];
                            templateMatcher.addIdentificationToTemplate(salesTemplate._id, identification, (err) => {
                              if (err) logger.error(`>>>${err}`);
                              console.timeEnd(`${client.name} : ${count} / ${salesTemplates.length} id:${salesTemplate._id}`);
                              templateCb();
                            });
                          } else {
                            templateCb();
                          }
                        }
                      });
                    } else {
                      logger.error('>>>Local file is missing in fileOpener.extractIdentifiers');
                      templateCb();
                    }
                  } catch (e) {
                    logger.error(`>>>${e}`);
                    templateCb();
                  }
                }
              });
            }
          });
        } else {
          templateCb();
        }
      }, clientCb);
    });
  }, (err) => {
    logger.error(err);
    logger.debug('Complete');
  });
});
