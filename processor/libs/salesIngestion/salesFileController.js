/**
 * @module SalesFileController
 */

const { logger, BigQuery, TemplateMatcher, databaseUtils } = require('@curveroyaltysystems/platform-shared-utils');
const async = require('async');
const fs = require('fs');
const moment = require('moment');

const SalesFile = require('../../models/salesFile');
const Client = require('../../models/client');
const SalesTemplate = require('../../models/salesTemplate');
const UnmappedWork = require('../../models/unmappedWork');
const UnmappedTrack = require('../../models/unmappedTrack');
const UnmappedRelease = require('../../models/unmappedRelease');

const ingestSalesFile = require('./ingestSalesFile');
const { formatString } = require('./salesIngestionUtils');
const revalidateSalesFile = require('./revalidateSalesFile');

// TODO: we should move the below into taskmanager perhaps?
// create tmp folder if it does not exist already
const dir = `${__dirname}/../../tmp/`;
if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir);
}

module.exports = {
  /**
   * The Sales File ingestion process
   *
   * * Calls `callback()` if successful
   * * Calls `callback(err)` with an `err` message if an error occurs
   *
   * @param {object} salesFile - The sales file document
   * @param {String} curveUserId - Id to set against last ingested object
   * @param {function(string)} callback - A callback that handles the response
   */
  ingest(salesFile, curveUserId, callback) {
    // Set sales file status
    salesFile.status = 'Ingesting';
    salesFile.error = null;
    logger.info(`${salesFile._id} Ingesting Sales File: ${JSON.stringify(salesFile)}`);
    salesFile.save()
      .then(() => {
        // Load Client
        logger.info(`${salesFile._id} Getting client from DB: ${salesFile.clientId}`);
        Client.findById(salesFile.clientId)
          .then((client) => {
            // Set up BigQuery
            logger.info(`${salesFile._id} Set up BigQuery`);
            const bigQuery = new BigQuery(databaseUtils.getBigQueryOpts(client));

            async.waterfall([
              function (cb) {
                // Delete any associated Unmapped Works
                logger.info(`${salesFile._id} Delete any associated Unmapped Works`);
                UnmappedWork.deleteMany({ clientId: salesFile.clientId, salesFileId: salesFile._id.toString() })
                  .then(() => {
                    logger.info(`${salesFile._id} Deleted unmapped works`);
                    cb();
                  })
                  .catch((deleteUnmappedErr) => {
                    logger.error(`${salesFile._id} Error removing unmapped works`, deleteUnmappedErr);
                    cb(new Error('Removing unmapped works has errored. Please try again or contact support.'));
                  });
              },
              function (cb) {
                // Delete any associated Unmapped Tracks
                logger.info(`${salesFile._id} Delete any associated Unmapped Tracks`);
                UnmappedTrack.deleteMany({ clientId: salesFile.clientId, salesFileId: salesFile._id.toString() })
                  .then(() => {
                    logger.info(`${salesFile._id} Deleted unmapped tracks`);
                    cb();
                  })
                  .catch((deleteUnmappedErr) => {
                    logger.error(`${salesFile._id} Error removing unmapped tracks`, deleteUnmappedErr);
                    cb(new Error('Removing unmapped tracks has errored. Please try again or contact support.'));
                  });
              },
              function (cb) {
                // Delete any associated Unmapped Releases
                logger.info(`${salesFile._id} Delete any associated Unmapped Releases`);
                UnmappedRelease.deleteMany({ clientId: salesFile.clientId, salesFileId: salesFile._id.toString() })
                  .then(() => {
                    logger.info(`${salesFile._id} Deleted unmapped releases`);
                    cb();
                  })
                  .catch((deleteUnmappedErr) => {
                    logger.error(`${salesFile._id} Error removing unmapped releases`, deleteUnmappedErr);
                    cb(new Error('Removing unmapped releases has errored. Please try again or contact support.'));
                  });
              },
              function (cb) {
                // Call ingestion script
                logger.info(`${salesFile._id} Calling Ingestion Script`);
                const data = {
                  bigQuery,
                  salesFile,
                };
                ingestSalesFile.ingest(data, cb);
              },
              function (output, identification, cb) {
                const templateMatcher = new TemplateMatcher({ SalesTemplate }); // NOTE: moved inline to allow this to be rewired
                logger.info(`${salesFile._id} Calling templateMatcher.addIdentificationToTemplate`);
                templateMatcher.addIdentificationToTemplate(salesFile.salesTemplateId, identification, (addIdentErr) => {
                  if (addIdentErr) {
                    logger.error(`${salesFile._id} Error calling templateMatcher.addIdentificationToTemplate`, addIdentErr);
                    cb(addIdentErr);
                  } else {
                    cb(null, output);
                  }
                });
              },
              function (output, cb) {
                // Add track to unmapped tracks
                // Get unique tracks
                output.tracks = output.tracks.filter((track, index, self) => self.indexOf(track) === index);
                // Loop through each track
                logger.info(`Sales File ID: ${salesFile._id.toString()} | Creating Unmapped Tracks: ${output.tracks?.length}`);
                async.eachLimit(output.tracks, 5, (track, trackCb) => {
                  // Add specific values for the sales file
                  track.clientId = salesFile.clientId;
                  track.salesFileId = salesFile._id.toString();
                  // Set up UnmappedTrack
                  const unmappedTrack = new UnmappedTrack(track);
                  // Save
                  unmappedTrack.save().then(() => trackCb()).catch(trackCb);
                }, (eachErr1) => {
                  // @TOM: should we handle the error here? Can't see a reason not to error when unmappedTrack.save errors
                  if (eachErr1) {
                    logger.error(`${salesFile._id} Errored saving unmappedTrack`, eachErr1);
                  }
                  logger.info(`${salesFile._id} unmappedTrack complete`);
                  cb(null, output);
                });
              },
              function (output, cb) {
                // Add release to unmapped releases
                // Get unique releases
                output.releases = output.releases.filter((release, index, self) => self.indexOf(release) === index);
                // Loop through each release
                logger.info(`Sales File ID: ${salesFile._id.toString()} | Creating Unmapped Releases: ${output.releases?.length}`);
                async.eachLimit(output.releases, 5, (release, releaseCb) => {
                  // Add specific values for the sales file
                  release.clientId = salesFile.clientId;
                  release.salesFileId = salesFile._id.toString();
                  // Set up UnmappedRelease
                  const unmappedRelease = new UnmappedRelease(release);
                  // Save
                  unmappedRelease.save().then(() => releaseCb()).catch(releaseCb);
                }, (eachErr1) => {
                  // @TOM: should we handle the error here? Can't see a reason not to error when unmappedRelease.save errors
                  if (eachErr1) {
                    logger.error(`${salesFile._id} Errored saving unmappedRelease`, eachErr1);
                  }
                  logger.info(`${salesFile._id} unmappedRelease complete`);
                  cb(null, output);
                });
              },
              function (output, cb) {
                // Set values and save
                // @TOM: I can't see the errorMessage queried below being passed from anywhere in process_period. Can we remove this?
                if (output.errorMessage) {
                  salesFile.status = 'Errored';
                  salesFile.error = output.errorMessage;
                  logger.info(`${salesFile._id} Saving Sales File`);
                  salesFile.save().then(() => cb()).catch((saveErr2) => {
                    logger.error(`${salesFile._id} Error saving Sales File`, saveErr2);
                    cb(saveErr2);
                  });
                } else {
                  // TODO: can we refactor the below? Seems to be used in revalidate method too
                  logger.info(`${salesFile._id} Get Sales Template from DB ${salesFile.salesTemplateId}`);
                  SalesTemplate.findById(salesFile.salesTemplateId)
                    .then((salesTemplate) => {
                      salesFile.units = output.units;
                      salesFile.validationUnits = output.validationUnits;
                      salesFile.netAmount = output.netAmount;
                      salesFile.validationNetAmount = output.validationNetAmount;
                      salesFile.homeCurrencyNetAmount = output.homeCurrencyNetAmount;
                      salesFile.lines = output.lines;
                      salesFile.validationLines = output.validationLines;
                      salesFile.invalidLines = output.invalidLines;
                      salesFile.valid = !output.invalidLines;
                      salesFile.grossAmount = output.grossAmount;
                      salesFile.homeCurrencyGrossAmount = output.homeCurrencyGrossAmount;
                      if (salesTemplate) {
                        const mappedSources = salesTemplate.sources.map((source) => source.name);
                        const mappedSubSources = salesTemplate.subSources.map((subSource) => subSource.name);
                        output.sources = output.sources.filter((source) => !mappedSources.includes(source));
                        output.subSources = output.subSources.filter((subSource) => !mappedSubSources.includes(subSource));
                      }
                      // Set invalid fields to sales file
                      salesFile.invalidFields = {
                        distributionChannels: output.distributionChannels,
                        configurations: output.configurations,
                        priceCategories: output.priceCategories,
                        territories: output.territories,
                        sources: output.sources,
                        subSources: output.subSources,
                        currencies: output.currencies,
                        currencyCodes: output.currencyCodes,
                        contracts: output.contracts,
                        saleDate: output.invalidFields.saleDate,
                        transactionDate: output.invalidFields.transactionDate,
                        customAdditionalFile: output.invalidFields.customAdditionalFile,
                      };
                      // Add works to unmapped works
                      // Get unique works
                      output.works = output.works.filter((work, index, self) => self.indexOf(work) === index);
                      // Loop through each work
                      logger.info(`Sales File ID: ${salesFile._id.toString()} | Creating Unmapped Works: ${output.works?.length}`);
                      async.eachLimit(output.works, 5, (work, workCb) => {
                      // Add specific values for the sales file
                        work.clientId = salesFile.clientId;
                        work.salesFileId = salesFile._id.toString();
                        work.source = salesFile.salesAccountName;

                        // Big Query Config
                        const selectCols = [
                          { column: 'originalIdentifier', isSelector: true, isGroupBy: true },
                          { column: 'originalWorkTitle', isSelector: true, isGroupBy: true },
                        ];
                        const sumCols = [{ column: 'homeCurrencyNetAmount', displayAs: 'homeCurrencyNetAmount' }];
                        const options = { orderBy: 'originalIdentifier', orderDir: 'ASC', limit: 1000 };
                        const filter = { salesFileId: work.salesFileId };

                        if (work.identifier) { filter.originalIdentifier = work.identifier; }
                        if (work.iswc) { filter.iswc = work.iswc; }
                        if (work.tunecode) { filter.tunecode = work.tunecode; }
                        if (work.songcode) { filter.songCode = work.songcode; }

                        if (work.party1) { filter.party1 = formatString(work.party1); }
                        if (work.party2) { filter.party2 = formatString(work.party2); }
                        if (work.party3) { filter.party3 = formatString(work.party3); }
                        if (work.party4) { filter.party4 = formatString(work.party4); }
                        if (work.party5) { filter.party5 = formatString(work.party5); }

                        if (work.title && !work.identifier && !work.iswc && !work.tunecode && !work.songcode) { filter.originalWorkTitle = formatString(work.title); }

                        bigQuery.getAggregate(bigQuery.inputTable, selectCols, sumCols, 'lines', filter, options, (getAggregateErr, salesData) => {
                          if (getAggregateErr) { logger.error(getAggregateErr); }

                          // Set up UnmappedWork
                          const unmappedWork = new UnmappedWork(work);
                          unmappedWork.netAmount = parseFloat(salesData?.[0]?.homeCurrencyNetAmount?.toFixed(4) ?? 0);
                          // Save
                          unmappedWork.save().then(() => workCb()).catch(workCb);
                        });
                      }, (eachErr1) => {
                      // @TOM: should we handle the error here? Can't see a reason not to error when unmappedWork.save errors
                        if (eachErr1) {
                          logger.error(`${salesFile._id} Errored saving UnmappedWork`, eachErr1);
                        }
                        salesFile.save().then(() => cb()).catch((saveErr3) => {
                          logger.error(`${salesFile._id} Error saving sales file`, saveErr3);
                          cb(saveErr3);
                        });
                      });
                    })
                    .catch(cb);
                }
              },
            ], (waterfallErr1) => {
              if (waterfallErr1) {
                // @TOM: how do we deal with non-user facing error messages here? The waterfall could be returning Mongoose errors etc. We could handle all these above or use 'showToUSer' property as in API perhaps to flag if an error should be sent to the user (e.g. added to the sales file as error)
                const errorMessage = waterfallErr1 && waterfallErr1.message ? waterfallErr1.message : waterfallErr1;
                // @TOM: as we are calling SalesFile.update() below, we could just assign this to a new error variable
                salesFile.status = (errorMessage === 'No matching template found') ? 'Unrecognised' : 'Errored';
                // @TOM: as we are calling SalesFile.update() below, we do not need the line below. salesFile.error is set to errorMessage in SalesFile.update() call
                salesFile.error = waterfallErr1;
                logger.error(`${salesFile._id}`, waterfallErr1);
                SalesFile.updateOne({ _id: salesFile._id }, { $set: { status: salesFile.status, error: errorMessage } }).then(() => callback()).catch(callback);
              } else {
                logger.info(`${salesFile._id} - Ingestion Complete`);
                salesFile.reportedStatus = 'Unreported';
                salesFile.status = 'Complete';
                salesFile.lastIngested = { date: moment().format(), user: curveUserId };
                salesFile.save().then(() => callback()).catch(callback);
              }
            });
          })
          .catch((findErr1) => {
            logger.error(`${salesFile._id} Error getting client from DB`, findErr1);
            callback(findErr1);
          });
      })
      .catch((saveErr1) => {
        logger.error(`${salesFile._id} Error saving sales file`, saveErr1);
        callback(saveErr1);
      });
  },

  /**
   * Runs the revalidation process (via revalidate method)
   *
   * * Calls `callback()` if successful
   * * Calls `callback(err)` with an `err` message if an error occurs
   *
   * @param {object} salesFile - The sales file document
   * @param {String} curveUserId - Id to set against last revalidated object
   * @param {function(string)} callback - A callback that handles the response
   */
  runRevalidation(salesFile, curveUserId, callback) {
    const SalesFileController = this;
    salesFile.status = 'Revalidating';
    logger.info(`${salesFile._id} runRevalidation: Saving Sales File`);
    salesFile.save()
      .then(() => {
        logger.info(`${salesFile._id} runRevalidation: Calling SalesFileController.revalidate`);
        SalesFileController.revalidate(salesFile, (revalidateErr) => {
          if (revalidateErr) {
            logger.error(`${salesFile._id} runRevalidation: Error in revalidation process`, revalidateErr);
            salesFile.status = 'Errored';
            salesFile.error = revalidateErr;
          } else {
            logger.info(`${salesFile._id} runRevalidation: Revalidation Complete`);
            salesFile.status = 'Complete';
          }
          logger.info(`${salesFile._id} runRevalidation: Saving Sales File`);
          salesFile.lastRevalidated = { date: moment().format(), user: curveUserId };
          salesFile.save()
            .then((savedSalesFile) => {
              callback(null, savedSalesFile);
            })
            .catch((err) => {
              logger.error(`${salesFile._id} runRevalidation: Error saving Sales File`, err);
              callback(err);
            });
        });
      })
      .catch((saveErr5) => {
        logger.error(`${salesFile._id} runRevalidation: Error saving Sales File`, saveErr5);
        callback(saveErr5);
      });
  },

  /**
   * Revalidates this Sales File
   *
   * * Calls `callback()` if successful
   * * Calls `callback(err)` with an `err` message if an error occurs
   *
   * @param {object} salesFile - The sales file document
   * @param {function(string)} callback - A callback that handles the response
   */
  revalidate(salesFile, callback) {
    // Get client
    logger.info(`${salesFile._id} Getting client ${salesFile.clientId}`);
    Client.findById(salesFile.clientId)
      .then((client) => {
        // Set up BigQuery
        logger.info(`${salesFile._id} Set up BigQuery`);
        const bigQuery = new BigQuery(databaseUtils.getBigQueryOpts(client));
        async.waterfall([
          function (cb) { // Delete any associated Unmapped Works
            logger.info(`${salesFile._id} Delete any associated Unmapped Works`);
            UnmappedWork.deleteMany({ clientId: salesFile.clientId, salesFileId: salesFile._id.toString() })
              .then(() => {
                logger.info(`${salesFile._id} Deleted unmapped works`);
                cb();
              })
              .catch((delErr) => {
                logger.error(`${salesFile._id} Error removing unmapped works`, delErr);
                cb(new Error('Removing unmapped works has errored. Please try again or contact support.'));
              });
          },
          function (cb) { // Delete any associated Unmapped Tracks
            logger.info(`${salesFile._id} Delete any associated Unmapped Tracks`);
            UnmappedTrack.deleteMany({ clientId: salesFile.clientId, salesFileId: salesFile._id.toString() })
              .then(() => {
                logger.info(`${salesFile._id} Deleted unmapped tracks`);
                cb();
              })
              .catch((delErr) => {
                logger.error(`${salesFile._id} Error removing unmapped tracks`, delErr);
                cb(new Error('Removing unmapped tracks has errored. Please try again or contact support.'));
              });
          },
          function (cb) { // Delete any associated Unmapped Releases
            logger.info(`${salesFile._id} Delete any associated Unmapped Releases`);
            UnmappedRelease.deleteMany({ clientId: salesFile.clientId, salesFileId: salesFile._id.toString() })
              .then(() => {
                logger.info(`${salesFile._id} Deleted unmapped releases`);
                cb();
              })
              .catch((delErr) => {
                logger.error(`${salesFile._id} Error removing unmapped releases`, delErr);
                cb(new Error('Removing unmapped releases has errored. Please try again or contact support.'));
              });
          },
          function (cb) {
            logger.info(`${salesFile._id} Calling ingestion process data`);
            ingestSalesFile.ingestionProcessData(salesFile, false, shouldUseDB(client), cb);
          },
          function (data, cb) {
          // Call ingestion script
            logger.info(`${salesFile._id} Calling Revalidation Script`);
            data.bigQuery = bigQuery;
            revalidateSalesFile(data, cb);
          },
          function (output, cb) {
          // Add track to unmapped tracks
          // Get unique tracks
            output.tracks = output.tracks.filter((track, index, self) => self.indexOf(track) === index);
            // Loop through each track
            async.eachLimit(output.tracks, 5, (track, trackCb) => {
            // Add specific values for the sales file
              track.clientId = salesFile.clientId;
              track.salesFileId = salesFile._id.toString();
              // Set up UnmappedTrack
              const unmappedTrack = new UnmappedTrack(track);
              // Save
              unmappedTrack.save().then(() => trackCb()).catch(trackCb);
            }, (eachErr1) => {
            // @TOM: should we handle the error here? Can't see a reason not to error when unmappedTrack.save errors
              if (eachErr1) {
                logger.error(`${salesFile._id} Errored saving unmappedTrack`, eachErr1);
              }
              logger.info(`${salesFile._id} unmappedTrack complete`);
              cb(null, output);
            });
          },
          function (output, cb) {
          // Add release to unmapped releases
          // Get unique releases
            output.releases = output.releases.filter((release, index, self) => self.indexOf(release) === index);
            // Loop through each release
            async.eachLimit(output.releases, 5, (release, releaseCb) => {
            // Add specific values for the sales file
              release.clientId = salesFile.clientId;
              release.salesFileId = salesFile._id.toString();
              // Set up UnmappedRelease
              const unmappedRelease = new UnmappedRelease(release);
              // Save
              unmappedRelease.save().then(() => releaseCb()).catch(releaseCb);
            }, (eachErr1) => {
            // @TOM: should we handle the error here? Can't see a reason not to error when unmappedRelease.save errors
              if (eachErr1) {
                logger.error(`${salesFile._id} Errored saving unmappedRelease`, eachErr1);
              }
              logger.info(`${salesFile._id} unmappedRelease complete`);
              cb(null, output);
            });
          },
          function (output, cb) {
          /* @tom: I can't see the errorMessage queried below being passed from anywhere in process_period.
            runRevalidation seems to deal with this.
            Can we remove this?
          */
            // Set values and save
            if (output.errorMessage) {
              salesFile.status = 'Errored';
              salesFile.error = output.errorMessage;
              logger.info(`${salesFile._id} Saving Sales File with error message set to '${output.errorMessage}'`);
              salesFile.save()
                .then(() => {
                  cb();
                })
                .catch((saveErr6) => {
                  logger.error(`${salesFile._id} Error saving Sales File`, saveErr6);
                  cb(saveErr6);
                });
            } else {
              logger.info(`${salesFile._id} Get Sales Template from DB ${salesFile.salesTemplateId}`);
              SalesTemplate.findById(salesFile.salesTemplateId)
                .then((salesTemplate) => {
                  salesFile.units = output.units;
                  salesFile.netAmount = output.netAmount;
                  salesFile.homeCurrencyNetAmount = output.homeCurrencyNetAmount;
                  salesFile.lines = output.lines;
                  salesFile.invalidLines = output.invalidLines;
                  salesFile.grossAmount = output.grossAmount;
                  salesFile.homeCurrencyGrossAmount = output.homeCurrencyGrossAmount;
                  salesFile.valid = output.valid;
                  if (salesTemplate) {
                    const mappedSources = salesTemplate.sources.map((source) => source.name);
                    const mappedSubSources = salesTemplate.subSources.map((subSource) => subSource.name);
                    output.sources = output.sources.filter((source) => !mappedSources.includes(source));
                    output.subSources = output.subSources.filter((subSource) => !mappedSubSources.includes(subSource));
                  }
                  // Set invalid fields to sales file
                  salesFile.invalidFields = {
                    distributionChannels: output.distributionChannels,
                    configurations: output.configurations,
                    priceCategories: output.priceCategories,
                    territories: output.territories,
                    sources: output.sources,
                    subSources: output.subSources,
                    currencies: output.currencies,
                    currencyCodes: output.currencyCodes,
                    contracts: output.contracts,
                    saleDate: output.saleDate,
                    transactionDate: output.transactionDate,
                  };
                  // Add works to unmapped works
                  // Get unique works
                  output.works = output.works.filter((work, index, self) => self.indexOf(work) === index);
                  // Loop through each work
                  async.eachLimit(output.works, 5, (work, workCb) => {
                    // Add specific values for the sales file
                    // @tom: should this be modifying `work` here or only add these params to the work to be saved as UnmappedWork? E.g. assign work to a new var here
                    work.clientId = salesFile.clientId;
                    work.salesFileId = salesFile._id.toString();
                    work.source = salesFile.salesAccountName;
                    // Big Query Config
                    const selectCols = [
                      { column: 'originalIdentifier', isSelector: true, isGroupBy: true },
                      { column: 'originalWorkTitle', isSelector: true, isGroupBy: true },
                    ];
                    const sumCols = [{ column: 'homeCurrencyNetAmount', displayAs: 'homeCurrencyNetAmount' }];
                    const options = { orderBy: 'originalIdentifier', orderDir: 'ASC', limit: 1000 };
                    const filter = { salesFileId: work.salesFileId };

                    if (work.identifier) { filter.originalIdentifier = work.identifier; }
                    if (work.iswc) { filter.iswc = work.iswc; }
                    if (work.tunecode) { filter.tunecode = work.tunecode; }
                    if (work.songCode) { filter.songCode = work.songCode; }

                    if (work.party1) { filter.party1 = formatString(work.party1); }
                    if (work.party2) { filter.party2 = formatString(work.party2); }
                    if (work.party3) { filter.party3 = formatString(work.party3); }
                    if (work.party4) { filter.party4 = formatString(work.party4); }
                    if (work.party5) { filter.party5 = formatString(work.party5); }

                    if (work.title && !work.identifier && !work.iswc && !work.tunecode && !work.songCode) { filter.originalWorkTitle = formatString(work.title); }
                    bigQuery.getAggregate(bigQuery.inputTable, selectCols, sumCols, 'lines', filter, options, (getAggregateErr, salesData) => {
                      if (getAggregateErr) { logger.error(getAggregateErr); }

                      // Set up UnmappedWork
                      const unmappedWork = new UnmappedWork(work);
                      unmappedWork.netAmount = parseFloat(salesData?.[0]?.homeCurrencyNetAmount?.toFixed(4) ?? 0);
                      // Save
                      unmappedWork.save().then(() => workCb()).catch(workCb);
                    });
                  }, (workErr) => {
                    if (workErr) {
                      // @TOM: should we be dealing with this error here? Logging it for now.
                      logger.error(`${salesFile._id} Errored setting up UnmappedWork`, workErr);
                    }
                    salesFile.save()
                      .then(() => {
                        cb();
                      })
                      .catch((saveErr7) => {
                        logger.error(`${salesFile._id} Errored setting sales ingestion data`, saveErr7);
                        cb(new Error('There was an error in saving the sales file. This is most likely due to incorrect values in the template. Check the template and sales file and try again.'));
                      });
                  });
                })
                .catch((err) => {
                  logger.error(`${salesFile._id} Error getting Sales Template from DB`, err);
                  cb(new Error('There was an error in getting the sales template from the database. Please try again or contact support.'));
                });
            }
          },
        ], (wfErr) => {
          if (wfErr) {
          // @TOM: We don't need to set salesFile.status and salesFile.error as we are using SalesFile.update below to update these. Or do we?
            salesFile.status = 'Errored';
            salesFile.error = wfErr;
            logger.error(`${salesFile._id}`, wfErr);
            const errorMessage = wfErr && wfErr.message ? wfErr.message : wfErr;
            // @TOM: should we use errorMessage below instead of err.message?
            SalesFile.updateOne({ _id: salesFile._id }, { $set: { status: 'Errored', error: wfErr.message } }).then(() => {
              callback();
            })
              .catch((saveErr6) => {
                logger.error(`${salesFile._id} Error saving Sales File`, saveErr6);
                callback(saveErr6);
              });
          } else {
            logger.info(`${salesFile._id} Revalidation Process Complete`);
            salesFile.status = 'Complete';
            salesFile.save().then(() => {
              callback();
            })
              .catch((saveErr6) => {
                logger.error(`${salesFile._id} Error saving Sales File`, saveErr6);
                callback(saveErr6);
              });
          }
        });
      })
      .catch((findErr4) => {
        // Handle client not found errors
        logger.error(`${salesFile._id} Error getting client`, findErr4);
        callback(new Error('There was an error loading the client for ingesting sales. Please try again or contact support.'));
      });
  },

  /**
   * Updates the Sales Files' reportedStatus to either "Complete", "Partially Complete", "Unreported" depending on inputs and outputs.
   * Sets `salesFile.reportedLines` to the number of output items
   *
   * * Calls `callback(err, salesFile)` with `salesFile` containing this Sales File document returned by salesFile.save()
   * * Calls `callback(err, salesFile)` with an `err` message if an error occurs
   *
   * @param {object} salesFile - The sales file document
   * @param {function(string, object)} callback - A callback that handles the response
   */
  updateReportedStatus(salesFile, callback) {
    // Get client
    logger.info(`${salesFile._id} updateReportedStatus - Getting client ${salesFile.clientId}`);
    Client.findById(salesFile.clientId)
      .then((client) => {
      // Set up BigQuery
        logger.info(`${salesFile._id} updateReportedStatus - Set up BigQuery`);
        const bigQuery = new BigQuery(databaseUtils.getBigQueryOpts(client));
        async.parallel({
          inputIds(cb) {
          // Get no on unique sales line ids
            bigQuery.getDistinctCount(bigQuery.inputTable, 'id', { salesFileId: salesFile._id.toString(), partitionNo: salesFile.partitionNo }, cb);
          },
          outputIds(cb) {
          // Get no of unique report sales line ids
            bigQuery.getDistinctCount(bigQuery.outputTable, 'salesLineId', { salesFileId: salesFile._id.toString() }, cb);
          },
        }, (paraErr, result) => {
          if (paraErr) {
            logger.error(`${salesFile._id} updateReportedStatus - Error getting distinct lines`, paraErr);
            callback(new Error('There was an error updating the reported status of the Sales File. Please try again or contact support.'));
          } else {
          // Log these values so we can investigate issue where this does not behave as expected
            const unreportedFlag = (result.outputIds.count !== result.inputIds.count) ? ' : Contains Unreported Lines' : '';
            logger.info(`${salesFile._id} updateReportedStatus - Reported Lines ${result.outputIds.count} / ${result.inputIds.count} ${unreportedFlag}`);
            // Set no of reported lines
            const update = {
              reportedLines: result.outputIds.count,
            };
            if (result.outputIds.count === result.inputIds.count) {
            // When everything is reported
              update.reportedStatus = 'Complete';
            } else if (result.outputIds.count > 0) {
            // When some lines are reported
              update.reportedStatus = 'Partially Complete';
            } else {
            // When no lines are reported
              update.reportedStatus = 'Unreported';
            }

            SalesFile.findByIdAndUpdate(salesFile._id, { $set: update }, { timestamps: false })
              .then((savedSalesFile) => {
                callback(null, savedSalesFile);
              })
              .catch(callback);
          }
        });
      })
      .catch((findErr5) => {
        // Handle no client error
        logger.error(`${salesFile._id} updateReportedStatus - Error getting client`, findErr5);
        callback(new Error('There was an error loading the client for updating the reported status of the sales file. Please try again or contact support.'));
      });
  },
};

/**
 * Checks to see if we should use a database for catalogue overwriting data when ingesting sales
 * @param client The client we are running the ingestion for
 */
const shouldUseDB = (client) => {
  if (!client) throw new Error('Client must be specified');
  return client.features?.largeCatalogueHandling;
};
