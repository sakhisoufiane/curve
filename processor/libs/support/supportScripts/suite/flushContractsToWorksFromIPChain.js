require('dotenv').config();
require('../../../../models/db');
const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const async = require('async');
const Work = require('../../../../models/work');
const Composer = require('../../../../models/composer');
const Publisher = require('../../../../models/publisher');
const Client = require('../../../../models/client');
const Task = require('../../../../models/task');
const { notifyUser } = require('../../helpers/notifyUser');

function getDataFromChildren(item, composers, publishers, callback) {
  if (item) {
    if (item.type === 'Composer') {
      composers.push(item);
    } else if (item.type === 'Publisher') {
      publishers.push(item);
    }
    if (item.children) {
      async.eachSeries(item.children, (child, cb) => {
        getDataFromChildren(child, composers, publishers, cb);
      }, callback);
    } else {
      callback();
    }
  } else {
    callback();
  }
}

const flushContractToWorksFromIpChains = (clientId, filter, callback) => {
  const query = Array.isArray(filter?.ids) ? { clientId, _id: { $in: filter.ids } } : filter;
  Work.find(query)
    .then((works) => {
      let count = 0;
      logger.debug(`COUNT: ${works.length}`);
      async.eachLimit(works, 5, (work, cb) => {
        count += 1;
        logger.debug(count);
        work.salesReturnsRights = [];
        work.salesReturnsRightsDisplay = [];
        if (work.rightsChain[0]) {
          const composers = [];
          const publishers = [];
          // Pull all composers
          async.each(work.rightsChain[0].children, (item, itemCb) => {
            getDataFromChildren(item, composers, publishers, itemCb);
          }, (err) => {
            // Get total controlled percentage
            let controlledComposerPercentage = 0;
            composers.forEach((composer) => {
              if (composer.controlled) {
                controlledComposerPercentage += parseFloat(composer.performanceOwnership);
              }
            });
            let controlledPublisherPercentage = 0;
            publishers.forEach((publisher) => {
              if (publisher.controlled) {
                controlledPublisherPercentage += parseFloat(publisher.performanceOwnership);
              }
            });

            async.waterfall([
              function (waterfallCb) {
                // Loop through composers
                const composersJoined = {};
                composers.forEach((comp) => {
                  if (comp.controlled) {
                    if (composersJoined[comp.composerId]) {
                      composersJoined[comp.composerId].performanceOwnership += parseFloat(comp.performanceOwnership);
                    } else {
                      composersJoined[comp.composerId] = comp;
                    }
                  }
                });
                async.each(Object.values(composersJoined), (composer, composerCb) => {
                  Composer.findById(composer.composerId)
                    .then((comp) => {
                      if (comp?.linkedContracts?.length) {
                        const multiplier = controlledComposerPercentage !== 0 ? 100 / controlledComposerPercentage : 0;
                        comp.linkedContracts.forEach((contract) => {
                          const percentage = parseFloat(composer.performanceOwnership) * multiplier;
                          if (percentage > 0) {
                            work.salesReturnsRights.push({ contractId: contract.contractId, percentage });
                            work.salesReturnsRightsDisplay.push({ contractId: contract.contractId, percentage });
                          }
                        });
                      }
                      composerCb();
                    })
                    .catch((findErr) => {
                      logger.error(`Error finding composer ${composer.composerId}:`, findErr);
                      composerCb(findErr);
                    });
                }, waterfallCb);
              },
              function (waterfallCb) {
                // Loop through composers
                const publishersJoined = {};
                publishers.forEach((comp) => {
                  if (comp.controlled) {
                    if (publishersJoined[comp.publisherId]) {
                      publishersJoined[comp.publisherId].performanceOwnership += parseFloat(comp.performanceOwnership);
                    } else {
                      publishersJoined[comp.publisherId] = comp;
                    }
                  }
                });
                async.each(Object.values(publishersJoined), (publisher, publisherCb) => {
                  Publisher.findById(publisher.publisherId)
                    .then((comp) => {
                      if (comp?.linkedContracts?.length) {
                        const multiplier = controlledPublisherPercentage !== 0 ? 100 / controlledPublisherPercentage : 0;
                        comp.linkedContracts.forEach((contract) => {
                          const percentage = parseFloat(publisher.performanceOwnership) * multiplier;
                          if (percentage > 0) {
                            work.salesReturnsRights.push({ contractId: contract.contractId, percentage });
                            work.salesReturnsRightsDisplay.push({ contractId: contract.contractId, percentage });
                          }
                        });
                      }
                      publisherCb();
                    })
                    .catch((findErr) => {
                      logger.error(`Error finding publisher ${publisher.publisherId}:`, findErr);
                      publisherCb(findErr);
                    });
                }, waterfallCb);
              },
            ], (err) => {
              logger.debug(work.title);
              const salesReturnsRights = {};
              work.salesReturnsRights.forEach((right) => {
                if (salesReturnsRights[right.contractId]) {
                  salesReturnsRights[right.contractId].percentage += right.percentage;
                } else {
                  salesReturnsRights[right.contractId] = right;
                }
              });
              work.salesReturnsRights = Object.values(salesReturnsRights);
              const salesReturnsRightsDisplay = {};
              work.salesReturnsRightsDisplay.forEach((right) => {
                right.percentage = parseFloat(right.percentage.toFixed(4));
                if (salesReturnsRightsDisplay[right.contractId]) {
                  salesReturnsRightsDisplay[right.contractId].percentage += right.percentage;
                } else {
                  salesReturnsRightsDisplay[right.contractId] = right;
                }
              });
              work.salesReturnsRightsDisplay = Object.values(salesReturnsRightsDisplay);
              // Calculate total participation for work
              work.calculateTotalParticipation();
              Work.findByIdAndUpdate(work._id, { $set: { salesReturnsRights: work.salesReturnsRights, salesReturnsRightsDisplay: work.salesReturnsRightsDisplay, totalParticipation: work.totalParticipation } })
                .then((foundWork) => {
                  cb(null, foundWork);
                })
                .catch((updateErr) => {
                  logger.error(`Error updating work ${work._id} with sales returns rights:`, updateErr);
                  cb(updateErr);
                });
            });
          });
        } else {
          cb();
        }
      }, (err) => {
        if (err) {
          logger.error(err);
          return callback(err);
        }
        logger.info(`Flushing contracts to works completed: ${works.length} works processed - ${clientId}`);
        callback();
      });
    })
    .catch((err) => {
      logger.error('Error flushing contracts to works from IP chains:', err);
      callback(err);
    });
};

const runFlushContractToWorksFromIpChain = (taskId, email, clientId, filter, callback) => {
  async.waterfall([
    (cb) => {
      if (!taskId) {
        logger.debug('No Task to update');
        return cb();
      }
      Task.findByIdAndUpdate(taskId, { $set: { status: 'In Progress' } })
        .then((task) => {
          logger.debug(`Task updated ${task}`);
          cb();
        })
        .catch((taskErr) => {
          logger.error(`Error updating task ${taskId}:`, taskErr);
          cb(taskErr);
        });
    },
    (cb) => {
      logger.debug('Starting to flush clients works');
      flushContractToWorksFromIpChains(clientId, filter, (flushErr) => {
        if (flushErr) { return cb(flushErr); }

        cb();
      });
    },
  ], (waterfallErr) => {
    Client.findById(clientId)
      .then((client) => {
        logger.debug('Creating notification for user');
        if (waterfallErr) {
          logger.error(waterfallErr);

          const subject = 'Flushing Contracts to works has errored. Please try again or contact support';
          const generateOptions = {
            identifier: 'genericError',
            client,
            subject,
            email,
          };
          notifyUser('Flushing Contracts to Works', subject, null, generateOptions);
        } else {
          logger.info(`Flushing contracts to works from ip chains completed for - ${clientId}`);

          const subject = 'Flushing Contracts to works has completed';
          const generateOptions = {
            identifier: 'genericComplete',
            client,
            subject,
            email,
          };
          notifyUser('Flushing Contracts to Works', subject, null, generateOptions);
        }
        callback();
      })
      .catch((clientFindErr) => {
        logger.error(`Error finding client ${clientId}:`, clientFindErr);
        callback(clientFindErr);
      });
  });
};

module.exports = { runFlushContractToWorksFromIpChain };
