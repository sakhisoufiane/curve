const { logger, fileManager } = require('@curveroyaltysystems/platform-shared-utils');
const { ObjectId } = require('mongodb');
const async = require('async');
const fs = require('fs');
const _ = require('lodash');
const config = require('../config.json');
const Release = require('../models/release');
const Track = require('../models/track');
const Work = require('../models/work');
const Composer = require('../models/composer');
const Publisher = require('../models/publisher');
const SalesFile = require('../models/salesFile');
const Cost = require('../models/cost');
const Notification = require('../models/notification');
const Client = require('../models/client');
const ImportXlsx = require('./importXlsx');

const output = {
  exportStatement: (statement, targetClient, curveUser, withCatalogue, callback) => {
    const userId = curveUser.id.toString();
    const targetClientId = targetClient._id.toString();
    const { clientId } = statement;
    logger.info(`Exporting statement ${statement._id} to client ${targetClientId}`);
    output.catalogue = {
      tracks: {},
      releases: {},
      works: {},
      composers: {},
      publishers: {},
    };
    output.usedComposerIds = [];
    output.usedPublisherIds = [];
    async.waterfall([
      // +--- Copy all Catalogue data from statement to client ---+
      // Get Releases, Tracks and Works included on statement
      function (waterfallCb) {
        if (withCatalogue) {
          output.getCatalogue(statement, clientId, waterfallCb);
        } else {
          waterfallCb();
        }
      },
      // Copy Tracks to target client
      function (waterfallCb) {
        if (withCatalogue) {
          output.createTracks(targetClientId, userId, waterfallCb);
        } else {
          waterfallCb();
        }
      },
      // Copy Tracks to Works for Mechanical Statements if Target Client is a Publisher
      function (waterfallCb) {
        if (withCatalogue) {
          if (targetClient.clientType === 'Publisher' && statement.periodType === 'Mechanical') {
            output.createWorksFromTracks(targetClientId, userId, waterfallCb);
          } else {
            waterfallCb();
          }
        } else {
          waterfallCb();
        }
      },
      // Copy Releases to target client
      function (waterfallCb) {
        if (withCatalogue) {
          output.createReleases(targetClientId, userId, waterfallCb);
        } else {
          waterfallCb();
        }
      },
      // Get all Composers and Publishers used in works IP chains
      function (waterfallCb) {
        if (withCatalogue) {
          output.getUsedComposersAndPublishers(waterfallCb);
        } else {
          waterfallCb();
        }
      },
      // Get Publishers from database
      function (waterfallCb) {
        if (withCatalogue) {
          output.getPublishers(clientId, waterfallCb);
        } else {
          waterfallCb();
        }
      },
      // Get Composers from database
      function (waterfallCb) {
        if (withCatalogue) {
          output.getComposers(clientId, waterfallCb);
        } else {
          waterfallCb();
        }
      },
      // Copy Publishers to client
      function (waterfallCb) {
        if (withCatalogue) {
          output.createPublishers(targetClientId, userId, waterfallCb);
        } else {
          waterfallCb();
        }
      },
      // Copy Composers to client
      function (waterfallCb) {
        if (withCatalogue) {
          output.createComposers(targetClientId, userId, waterfallCb);
        } else {
          waterfallCb();
        }
      },
      // Copy Works to target client
      function (waterfallCb) {
        if (withCatalogue) {
          output.createWorks(targetClientId, userId, waterfallCb);
        } else {
          waterfallCb();
        }
      },
      // +--- Create Sales File on target client and send off for ingestion ---+
      function (waterfallCb) {
        output.copySalesFile(statement, targetClientId, userId, waterfallCb);
      },
      // +--- Parse Costs and add to target client ---+
      function (waterfallCb) {
        output.copyCosts(statement, targetClientId, userId, waterfallCb);
      },
    ], (waterfallErr) => {
      logger.error(waterfallErr);
      Client.findById(curveUser.clientId)
        .then((client) => {
          if (waterfallErr) {
            logger.error(`Statement ${statement._id} export into client ${targetClientId} errored`, waterfallErr.message);
            // generate options for completion notification
            const generateOptions = {
              identifier: 'genericError',
              curveUser,
              client,
              subject: 'Your Statement Export Has Errored',
              mainText: `Statement ${statement.name} export into client ${targetClient.name} has errored`,
              error: '',
              closingText: '',
            };
            // send notification to user
            Notification.generate(generateOptions.subject, generateOptions.mainText, null, curveUser, generateOptions);
            callback(waterfallErr);
          } else {
            logger.info(`Statement ${statement._id} exported into client ${targetClientId}`);
            // generate options for completion notification
            const generateOptions = {
              identifier: 'genericComplete',
              curveUser,
              client,
              subject: 'Your Statement Export Has Completed',
              mainText: `Statement ${statement.name} has been exported into client ${targetClient.name}`,
            };
            // send notification to user
            Notification.generate(generateOptions.subject, generateOptions.mainText, null, curveUser, generateOptions);
            callback();
          }
        })
        .catch((err) => {
          logger.error(err);
          callback(err);
        });
    });
  },
  getCatalogue: (statement, clientId, callback) => {
    async.parallel([
      function (cb) {
        Track.find({ clientId, $or: [{ 'salesReturnsRights.contractId': statement.contractId }, { 'costsRights.contractId': statement.contractId }, { mechanicalContractIds: statement.contractId }] }, {
          title: 1,
          version: 1,
          artist: 1,
          foreignId: 1,
          isrc: 1,
          label: 1,
          pLine: 1,
          aliases: 1,
          duration: 1,
          contractValidation: 1,
        }).then((tracks) => {
          tracks.forEach((track) => {
            const trackObj = track.toObject();
            trackObj._id = trackObj._id.toString();
            output.catalogue.tracks[trackObj._id] = trackObj;
          });
          cb();
        })
          .catch((err) => {
            logger.error(err);
            cb(err);
          });
      },
      function (cb) {
        Release.find({ clientId, $or: [{ 'salesReturnsRights.contractId': statement.contractId }, { 'costsRights.contractId': statement.contractId }, { mechanicalContractIds: statement.contractId }] }, {
          title: 1,
          version: 1,
          artist: 1,
          foreignId: 1,
          catNo: 1,
          barcode: 1,
          label: 1,
          releaseDate: 1,
          distributionChannel: 1,
          format: 1,
          dealerPrice: 1,
          aliases: 1,
          trackIds: 1, // to be recreated
        }).then((releases) => {
          releases.forEach((release) => {
            const releaseObj = release.toObject();
            releaseObj._id = releaseObj._id.toString();
            output.catalogue.releases[releaseObj._id] = releaseObj;
          });
          cb();
        })
          .catch((err) => {
            logger.error(err);
            cb(err);
          });
      },
      function (cb) {
        Work.find({ clientId, $or: [{ 'salesReturnsRights.contractId': statement.contractId }, { 'costsRights.contractId': statement.contractId }] }, {
          title: 1,
          alternateTitles: 1,
          composer: 1,
          foreignId: 1,
          identifier: 1,
          partyNo: 1,
          tunecode: 1,
          iswc: 1,
          notes: 1,
          aliases: 1,
          societyIdentifiers: 1,
          productionLibrary: 1,
          territories: 1,
          totalCollection: 1,
          compositeType: 1,
          compositeCount: 1,
          performers: 1,
          workDescriptionCategory: 1,
          versionType: 1,
          arrangementType: 1,
          lyricAdaptionType: 1,
          workLanguage: 1,
          priority: 1,
          grandRights: 1,
          duration: 1,
          rightsChain: 1, // to be recreated
          usedComposerIds: 1, // to be recreated
          usedPublisherIds: 1, // to be recreated
          trackIds: 1, // to be recreated
        }).then((works) => {
          works.forEach((work) => {
            const workObj = work.toObject();
            workObj._id = workObj._id.toString();
            output.catalogue.works[workObj._id] = workObj;
          });
          cb();
        })
          .catch((err) => {
            logger.error(err);
            cb(err);
          });
      },
    ], (err) => {
      callback(err);
    });
  },
  createTracks: (targetClientId, userId, callback) => {
    async.eachLimit(Object.keys(output.catalogue.tracks), 10, (trackId, eachCb) => {
      const copy = { ...output.catalogue.tracks[trackId] };
      delete copy._id;
      copy.clientId = targetClientId;
      copy.createdBy = userId;
      copy.lastModifiedBy = userId;
      const newTrack = new Track(copy);
      newTrack.save()
        .then((newTrackReturned) => {
          output.catalogue.tracks[trackId]._idNew = newTrackReturned._id.toString();
          eachCb();
        })
        .catch((err) => {
          if (err && (err.message.includes('matches the ISRC on track') || err.message.includes('matches an existing alias on track'))) {
            logger.info(`Track "${copy.isrc}" already exists on target client`);
            // If Track fails to save, see if it exists on target client already
            Track.findOne({ clientId: targetClientId, isrc: copy.isrc }, '_id')
              .then((foundTrack) => {
                if (!foundTrack) {
                  eachCb();
                } else {
                  output.catalogue.tracks[trackId]._idNew = foundTrack._id.toString();
                  eachCb();
                }
              })
              .catch((err) => {
                logger.error(err);
                eachCb();
              });
          } else {
            eachCb(err);
          }
        });
    }, callback);
  },
  createWorksFromTracks: (targetClientId, userId, callback) => {
    // only process tracks which have either been created or found. This should usually be the case unless an expected error occurs.
    const tracksWithNewId = Object.values(output.catalogue.tracks).filter((track) => track._idNew);
    async.eachLimit(tracksWithNewId, 10, (track, eachCb) => {
      Work.findOne({ clientId: targetClientId, title: track.title }, '_id')
        .then((foundWork) => {
          if (foundWork) {
            logger.info(`Work "${track.title}" already exists on target client`);
            eachCb();
          } else {
            const work = {
              clientId: targetClientId,
              createdBy: userId,
              lastModifiedBy: userId,
              title: track.title,
              aliases: [track.isrc],
              performers: [track.artist],
              trackIds: [track._idNew.toString()],
            };
            const newWork = new Work(work);
            newWork.save()
              .then(() => {
                eachCb();
              })
              .catch((err) => {
                logger.error(err);
                eachCb(err);
              });
          }
        })
        .catch((err) => {
          logger.error(err);
          eachCb();
        });
    }, (err) => {
      callback(err);
    });
  },
  createReleases: (targetClientId, userId, callback) => {
    async.eachLimit(Object.keys(output.catalogue.releases), 10, (releaseId, eachCb) => {
      const copy = { ...output.catalogue.releases[releaseId] };
      delete copy._id;
      copy.clientId = targetClientId;
      copy.createdBy = userId;
      copy.lastModifiedBy = userId;
      copy.trackIds = copy.trackIds.map((trackId) => {
        if (output.catalogue.tracks[trackId] && output.catalogue.tracks[trackId]._idNew) {
          return output.catalogue.tracks[trackId]._idNew;
        }
        return false;
      }).filter(Boolean);
      const newRelease = new Release(copy);
      newRelease.save()
        .then(() => {
          eachCb();
        })
        .catch((err) => {
          if (err && (err.message.includes('Cat No is required to be unique under each Distribution Channel') || err.message.includes('Barcode is required to be unique under each Distribution Channel') || err.message.includes('Aliases are required to be unique under each Distribution Channel'))) {
            logger.info(`Release "${copy.catNo}" already exists on target client`);
            // If Release fails to save, see if it exists on target client already
            Release.findOne({ clientId: targetClientId, catNo: copy.catNo, distributionChannel: copy.distributionChannel }, '_id')
              .then((foundRelease) => {
                if (!foundRelease) {
                  eachCb();
                } else {
                  output.catalogue.releases[releaseId]._idNew = foundRelease._id.toString();
                  eachCb();
                }
              })
              .catch((err) => {
                logger.error(err);
                eachCb(err);
              });
          } else {
            eachCb(err);
          }
        });
    }, callback);
  },
  getUsedComposersAndPublishers: (callback) => {
    let composerIds = [];
    let publisherIds = [];
    Object.values(output.catalogue.works).forEach((work) => {
      if (Array.isArray(work.usedComposerIds)) {
        composerIds = _.union(composerIds, work.usedComposerIds);
      }
      if (Array.isArray(work.usedPublisherIds)) {
        publisherIds = _.union(publisherIds, work.usedPublisherIds);
      }
    });
    output.usedComposerIds = composerIds;
    output.usedPublisherIds = publisherIds;
    callback();
  },
  getPublishers: (clientId, callback) => {
    // Filter out any blank composerIds
    const publisherIds = output.usedPublisherIds.filter(Boolean);
    Publisher.find({ clientId, _id: { $in: publisherIds } }, {
      foreignId: 1,
      name: 1,
      cae: 1,
      mainPro: 1,
      mechanicalPro: 1,
      performancePro: 1,
      syncPro: 1,
      mainProIdentifier: 1,
      mechanicalProIdentifier: 1,
      performanceProIdentifier: 1,
      syncProIdentifier: 1,
      controlled: 1,
      notes: 1,
      societies: 1,
    })
      .then((publishers) => {
        publishers.forEach((publisher) => {
          const publisherObj = publisher.toObject();
          publisherObj._id = publisherObj._id.toString();
          output.catalogue.publishers[publisherObj._id] = publisherObj;
        });
        callback();
      })
      .catch((err) => {
        logger.error(err);
        callback(err);
      });
  },
  getComposers: (clientId, callback) => {
    // Filter out any blank composerIds
    const composerIds = output.usedComposerIds.filter(Boolean);
    Composer.find({ clientId, _id: { $in: composerIds } }, {
      foreignId: 1,
      societies: 1,
      name: 1,
      firstName: 1,
      middleNames: 1,
      surname: 1,
      cae: 1,
      controlled: 1,
      notes: 1,
      mainPro: 1,
      mainProIdentifier: 1,
      mechanicalPro: 1,
      mechanicalProIdentifier: 1,
      performancePro: 1,
      performanceProIdentifier: 1,
      syncPro: 1,
      syncProIdentifier: 1,
    })
      .then((composers) => {
        composers.forEach((composer) => {
          const composerObj = composer.toObject();
          composerObj._id = composerObj._id.toString();
          output.catalogue.composers[composerObj._id] = composerObj;
        });
        callback();
      })
      .catch((err) => {
        logger.error(err);
        callback(err);
      });
  },
  createPublishers: (targetClientId, userId, callback) => {
    async.eachLimit(Object.keys(output.catalogue.publishers), 10, (publisherId, eachCb) => {
      const copy = { ...output.catalogue.publishers[publisherId] };
      delete copy._id;
      copy.clientId = targetClientId;
      copy.createdBy = userId;
      copy.lastModifiedBy = userId;
      const newPublisher = new Publisher(copy);
      newPublisher.save()
        .then((newPublisherReturned) => {
          output.catalogue.publishers[publisherId]._idNew = newPublisherReturned._id.toString();
          eachCb();
        })
        .catch((err) => {
          if (err && err.message === 'Name is required to be unique') {
            logger.info(`Publisher [${copy.name}] already exists on target client`);
            // If Publisher fails to save, see if it exists on target client already
            Publisher.findOne({ clientId: targetClientId, name: copy.name }, '_id')
              .then((foundPublisher) => {
                if (!foundPublisher) {
                  logger.error(`Did not find Publisher: ${copy.name}`);
                  eachCb();
                } else {
                  output.catalogue.publishers[publisherId]._idNew = foundPublisher._id.toString();
                  eachCb();
                }
              })
              .catch((err) => {
                logger.error(err);
                eachCb();
              });
          } else {
            eachCb(err);
          }
        });
    }, (err) => {
      callback(err);
    });
  },
  createComposers: (targetClientId, userId, callback) => {
    async.eachLimit(Object.keys(output.catalogue.composers), 10, (composerId, eachCb) => {
      const copy = { ...output.catalogue.composers[composerId] };
      delete copy._id;
      copy.clientId = targetClientId;
      copy.createdBy = userId;
      copy.lastModifiedBy = userId;
      const newComposer = new Composer(copy);
      newComposer.save()
        .then((newComposerReturned) => {
          output.catalogue.composers[composerId]._idNew = newComposerReturned._id.toString();
          eachCb();
        })
        .catch((err) => {
          if (err && err.message === 'Name is required to be unique') {
            logger.info(`Composer [${copy.name}] already exists on target client`);
            // If Composer fails to save, see if it exists on target client already
            Composer.findOne({ clientId: targetClientId, name: copy.name }, '_id')
              .then((foundComposer) => {
                if (!foundComposer) {
                  eachCb();
                } else {
                  output.catalogue.composers[composerId]._idNew = foundComposer._id.toString();
                  eachCb();
                }
              })
              .catch((err) => {
                logger.error(err);
                eachCb();
              });
          } else if (err) {
            eachCb(err);
          }
        });
    }, (err) => {
      callback(err);
    });
  },
  createWorks: (targetClientId, userId, callback) => {
    async.eachLimit(Object.keys(output.catalogue.works), 10, (workId, eachCb) => {
      const copy = { ...output.catalogue.works[workId] };
      delete copy._id;
      copy.clientId = targetClientId;
      copy.createdBy = userId;
      copy.lastModifiedBy = userId;
      copy.trackIds = copy.trackIds.map((trackId) => {
        if (output.catalogue.tracks[trackId] && output.catalogue.tracks[trackId]._idNew) {
          return output.catalogue.tracks[trackId]._idNew;
        }
        return false;
      }).filter(Boolean);
      // Recreate the IP Chain
      copy.rightsChain = output.replaceComposerAndPublisherInChain(copy.rightsChain);
      const newWork = new Work(copy);
      // Update usedComposerIds and usedPublisherIds
      newWork.getComposerIDs();
      newWork.save()
        .then(() => {
          eachCb();
        })
        .catch((err) => {
          if (err && (err.message.includes('Identifier is required to be unique') || err.message.includes('Tunecode is required to be unique') || err.message.includes('ISWC is required to be unique'))) {
            logger.info(`Work [${copy.identifier}] already exists on target client`);
            eachCb();
          } else {
            eachCb(err);
          }
        });
    }, (err) => {
      callback(err);
    });
  },
  copySalesFile: (statement, targetClientId, userId, callback) => {
    // Create Sales File on target client
    if (statement.salesCsv) {
      const sourceKey = statement.salesCsv;
      const fileName = sourceKey.substr(sourceKey.lastIndexOf('/') + 1);
      const name = fileName.substr(0, fileName.lastIndexOf('.'));
      // When statement is profit share, it should add the profit share percentage as the multiplier
      let multiplier = 0;
      if (statement.contractType === 'Profit Share') {
        multiplier = statement.profitShareRate / 100;
      }
      const salesFile = new SalesFile({
        name,
        createdBy: userId,
        lastModifiedBy: userId,
        clientId: targetClientId,
      });
      if (multiplier) {
        salesFile.overwriteFields.multiplier = multiplier;
      }
      // copy salesCsv file to salesFiles path
      const salesFileId = salesFile._id.toString();
      const destKey = `salesFiles/${salesFileId}/${fileName}`;
      const options = {};
      fileManager.copyS3File(sourceKey, destKey, options, (err) => {
        if (err) {
          callback(err);
        } else {
          salesFile.file = destKey;
          salesFile.save()
            .then(() => {
              // Send Sales File off for ingestion
              salesFile.createIngestTask(2, { internal: true }, callback);
            })
            .catch((err) => {
              logger.error(err);
              callback(err);
            });
        }
      });
    } else {
      callback();
    }
  },
  copyCosts: async (statement, targetClientId, userId, callback) => {
    if (statement.costsCsv) {
      const client = await Client.findById(statement.clientId);

      // Download costsCsv from S3
      const s3Bucket = process.env.S3_bucket;
      fileManager.downloadFromS3(statement.costsCsv, s3Bucket, (err, localCostsCsv) => {
        // @TODO: We should add error handling here

        // Import Costs from sheet using config template
        ImportXlsx.getDataByTemplate(localCostsCsv, config.importTemplates.statementCosts, 0, 1, '', (err, costsData) => {
          fs.unlinkSync(localCostsCsv);
          // Process extracted Costs data
          if (costsData) {
            async.eachLimit(costsData, 10, (costRow, cb) => {
              if (costRow && costRow.name && costRow.type) {
                let releaseIds;
                let trackIds;
                if (costRow.catNo) {
                  const release = _.filter(output.catalogue.releases, (release) => release.catNo === costRow.catNo);
                  releaseIds = release[0] ? [new ObjectId(release[0]._idNew)] : [];
                }
                if (costRow.isrc) {
                  const track = _.filter(output.catalogue.tracks, (track) => track.isrc === costRow.isrc);
                  trackIds = track[0] ? [new ObjectId(track[0]._idNew)] : [];
                }
                // When statement is profit share, amount is multiplied by profit share percentage
                let amount = costRow.netAmount;
                if (statement.contractType === 'Profit Share') {
                  amount *= (statement.profitShareRate / 100);
                }

                const cost = new Cost({
                  name: costRow.name,
                  type: costRow.type,
                  date: costRow.date, // this is read as a string rather than type Date, as ImportXlsx doesn't support format YYYY-MM-DD
                  territory: costRow.territory,
                  description: costRow.description,
                  amount,
                  releaseIds,
                  trackIds,
                  clientId: targetClientId,
                  createdBy: userId,
                  lastModifiedBy: userId,
                  currency: costRow.currency === 'Home Currency' ? client?.homeCurrency : costRow.currency,
                });
                cost.save()
                  .then(() => {
                    cb();
                  })
                  .catch((err) => {
                    logger.error(err);
                    cb(err);
                  });
              } else {
                cb();
              }
            }, callback);
          } else {
            callback();
          }
        });
      });
    } else {
      callback();
    }
  },
  replaceComposerAndPublisherInChain: (chain) => {
    chain.forEach((element) => {
      if (element.publisherId) {
        element.publisherId = output.catalogue.publishers[element.publisherId]._idNew;
      }
      if (element.composerId) {
        element.composerId = output.catalogue.composers[element.composerId]._idNew;
      }
      if (element.children) {
        element.children = output.replaceComposerAndPublisherInChain(element.children);
      }
    });
    return chain;
  },
};

module.exports = output;
