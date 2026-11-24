require('dotenv').config();
require('../models/db');
const async = require('async');
const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const appRootDir = require('app-root-dir').get();
const WriteCsv = require('../libs/writeCsv');
const { ObjectId } = require('mongodb');
const Work = require('../models/work');
const Publisher = require('../models/publisher');
const TerritoryGroup = require('../models/territoryGroup');
const Composer = require('../models/composer');
const Client = require('../models/client')

const limit = 1000;
let allIpDataFromOtherClient = [];
let count = 0;

function runWork(client, lastId, total, save, clientPublishers, clientComposers, clientTerritoryGroups, callback) {
  const filter = { clientId: client._id };
  if (lastId) {
    // if processing another batch, ensure you start after the last work in previous batch.
    filter._id = { $gt: lastId };
  }
  // query all elements from Works and sort by _id - Should we include projection?
  Work.find(filter).sort({ _id: 1 }).limit(limit).exec((err, works) => {
    async.eachLimit(works, 100, (work, cb) => {
      count += 1;
      const replacePublisherIds = [];
      const replaceComposerIds = [];
      const replaceTerritoryIds = [];
      process.stdout.write(`\r${work._id} - ${work.title}`);
      async.parallel([
        function(parallelCallback) {
          const invalidPublisherIds = work.usedPublisherIds.filter(id => !clientPublishers.some(publisher => publisher._id.toString() === id));

          if (invalidPublisherIds.length > 0) {
            console.log(`${work.title} Invalid publisher IDs found:`, invalidPublisherIds);
            async.eachLimit(invalidPublisherIds, 5, (publisherId, eachLimitCb) => {
              Publisher.findById(publisherId, 'clientId name cae foreignId', (err, publisher) => {
                if (publisher) {
                  if (publisher.clientId !== client._id.toString()) {
                    const query = { $or: [] };
                    if (publisher.cae && publisher.cae !== '' && publisher.cae !== '0') {
                      query.$or.push({ clientId: client._id, cae: publisher.cae });
                    } else {
                      query.$or.push({ clientId: client._id, name: publisher.name });
                    }
                    if (publisher.foreignId && publisher.foreignId !== '') {
                      query.$or.push({ clientId: client._id, foreignId: publisher.foreignId });
                    }
                    Publisher.findOne(query, '_id name', (err, existingPublisher) => {
                      if (existingPublisher) {
                        replacePublisherIds.push({ clientId: client._id, targetPublisherId: publisherId, replacementPublisherId: existingPublisher._id.toString() });
                        allIpDataFromOtherClient.push({ client: client.name, type: 'Publisher',  work: work.title, name: publisher.name, from: publisher.clientId, existing: existingPublisher.name});
                      } else {
                        allIpDataFromOtherClient.push({ client: client.name, type: 'Publisher',  work: work.title, name: publisher.name, from: publisher.clientId, existing: 'Not Found'});
                      }
                      eachLimitCb();
                    });
                  } else {
                    eachLimitCb();
                  }
                } else {
                  eachLimitCb();
                }
              });
            }, parallelCallback);
          } else {
            parallelCallback();
          }
          
        },
        function(parallelCallback) {
          const invalidComposerIds = work.usedComposerIds.filter(id => !clientComposers.some(composer => composer._id.toString() === id));

          if (invalidComposerIds.length > 0) {
            console.log(`${work.title} Invalid composer IDs found:`, invalidComposerIds);
            async.eachLimit(invalidComposerIds, 5, (composerId, eachLimitCb) => {
              Composer.findById(composerId, 'clientId name cae foreignId', (err, composer) => {
                if (composer) {
                  if (composer.clientId !== client._id.toString()) {
                    const query = { $or: [] };
                    if (composer.cae && composer.cae !== '' && composer.cae !== '0') {
                      query.$or.push({ clientId: client._id, cae: composer.cae });
                    } else {
                      query.$or.push({ clientId: client._id, name: composer.name });
                    }
                    if (composer.foreignId && composer.foreignId !== '') {
                      query.$or.push({ clientId: client._id, foreignId: composer.foreignId });
                    }
                    Composer.findOne(query, '_id name', (err, existingComposer) => {
                      if (existingComposer) {
                        replaceComposerIds.push({ clientId: client._id, targetComposerId: composerId, replacementComposerId: existingComposer._id.toString() });
                        allIpDataFromOtherClient.push({ client: client.name, type: 'Composer',  work: work.title, name: composer.name, from: composer.clientId, existing: existingComposer.name});
                      } else {
                        allIpDataFromOtherClient.push({ client: client.name, type: 'Composer',  work: work.title, name: composer.name, from: composer.clientId, existing: 'No Found'});
                      }
                      eachLimitCb();
                    });
                  } else {
                    eachLimitCb();
                  }
                } else {
                  eachLimitCb();
                }
              });
            }, parallelCallback);
          } else {
            parallelCallback();
          }
        },
        function(parallelCallback) {
          const invalidTerritories = work.rightsChain.filter(chain => {
            if (chain?.territory && ObjectId.isValid(chain.territory)) {
              return !clientTerritoryGroups.some(territory => territory._id.toString() === chain.territory);
            }
            return false;
          });
          
          if (invalidTerritories.length > 0) {
            console.log(`${work.title} Invalid territories found:`);
            async.eachLimit(invalidTerritories, 5, (right, eachLimitCb) => {
              if (ObjectId.isValid(right.territory)) {
                TerritoryGroup.findById(right.territory, 'clientId name territories', (err, territoryGroup) => {
                  if (territoryGroup) {
                    if (territoryGroup.clientId !== client._id.toString()) {
                      TerritoryGroup.findOne({ clientId: client._id, name: territoryGroup.name }, '_id name', (err, existingTerritoryGroup) => {
                        if (existingTerritoryGroup) {
                          // should be match territorries as well as name?
                          replaceTerritoryIds.push({ clientId: client._id, targetTerritoryId: right.territory, replacementTerritoryId: existingTerritoryGroup._id.toString() });
                          allIpDataFromOtherClient.push({ client: client.name, type: 'Territory',  work: work.title, name: territoryGroup.name, from: territoryGroup.clientId, existing: existingTerritoryGroup.name});
                        } else {
                          allIpDataFromOtherClient.push({ client: client.name, type: 'Territory',  work: work.title, name: territoryGroup.name, from: territoryGroup.clientId, existing: 'Not Found'});
                        }
                        eachLimitCb();
                      });
                    } else {
                      eachLimitCb();
                    }
                  } else {
                    eachLimitCb();
                  }
                });
              } else {
                eachLimitCb();
              }
            }, parallelCallback);
          } else {
            parallelCallback();
          }
        }
      ], () => {
        if (replacePublisherIds.length > 0) {
          const uniqueReplacePublisherIds = getUniquePublisherObjects(replacePublisherIds);
          for (const uniqueReplacePublisherId of uniqueReplacePublisherIds) {
            // work.rightsChain.map(chain => findAndReplacePublisherId(chain, uniqueReplacePublisherId.targetPublisherId, uniqueReplacePublisherId.replacementPublisherId));
            const modifiedRightsChain = work.rightsChain.map(chain => findAndReplacePublisherId(chain, uniqueReplacePublisherId.targetPublisherId, uniqueReplacePublisherId.replacementPublisherId));
            work.rightsChain = modifiedRightsChain;
          }
        }
        if (replaceComposerIds.length > 0) {
          const uniqueReplaceComposerIds = getUniqueComposerObjects(replaceComposerIds);
          for (const uniqueReplaceComposerId of uniqueReplaceComposerIds) {
            // work.rightsChain.map(chain => findAndReplaceComposerId(chain, uniqueReplaceComposerId.targetComposerId, uniqueReplaceComposerId.replacementComposerId));
            const modifiedRightsChain = work.rightsChain.map(chain => findAndReplaceComposerId(chain, uniqueReplaceComposerId.targetComposerId, uniqueReplaceComposerId.replacementComposerId));
            work.rightsChain = modifiedRightsChain;
          }
        }
        if (replaceTerritoryIds.length > 0) {
          for (const replaceTerritoryId of replaceTerritoryIds) {
            // updateTerritory(work.rightsChain, replaceTerritoryId.targetTerritoryId, replaceTerritoryId.replacementTerritoryId);
            const modifiedRightsChain = updateTerritory(work.rightsChain, replaceTerritoryId.targetTerritoryId, replaceTerritoryId.replacementTerritoryId);
            work.rightsChain = modifiedRightsChain;
          }
        }
        lastId = work._id;
        if (replacePublisherIds.length > 0 || replaceComposerIds.length > 0 || replaceTerritoryIds.length > 0) {
          const composerIds = [];
          const publisherIds = [];
          if (work.rightsChain && work.rightsChain.length > 0) {
            async.eachSeries(work.rightsChain, (chain, cb) => {
              getIDs(chain, composerIds, publisherIds,  cb);
            }, () => {
              work.usedComposerIds = composerIds;
              work.usedPublisherIds = publisherIds;
              if (save && save === 'true') {
                Work.findByIdAndUpdate(work._id, { $set: { rightsChain: work.rightsChain, usedPublisherIds: work.usedPublisherIds, usedComposerIds: work.usedComposerIds } }, { timestamps: false }, (err) => {
                  if (err) {
                    logger.error(`Work Failed To Update: ${work.title} - ${work.identifier} - ${err}`);
                  } else {
                    logger.debug(`Work Updated: ${work.title} - ${work.identifier}`);
                  }
                  cb();
                });
              } else {
                cb();
              }
            });
          }
        } else {
          cb();
        }
      });
    }, (err) => {
      // should we go get the next 'limit' documents
      if (works && works.length === limit) {
        runWork(client, lastId, total + limit, save, clientPublishers, clientComposers, clientTerritoryGroups, callback);
      } else {
        callback();
      }
    });
  });
}

function getIDs(chain, composerIds, publisherIds, callback) {
  if (chain && chain.type === 'Composer') {
    if (composerIds.indexOf(chain.composerId) === -1) {
      composerIds.push(chain.composerId);
    }
  } else if (chain && chain.type === 'Publisher') {
    if (publisherIds.indexOf(chain.publisherId) === -1) {
      publisherIds.push(chain.publisherId);
    }
  }

  if (chain && chain.children) {
    async.eachSeries(chain.children, (child, cb) => {
      getIDs(child, composerIds, publisherIds, cb);
    }, callback);
  } else {
    callback();
  }
}

function updateTerritory(rights, targetTerritoryId, replacementTerritoryId) {
  return rights.map(chain => {
    const clonedChain = JSON.parse(JSON.stringify(chain)); // Perform a deep clone
    if (clonedChain.territory === targetTerritoryId) {
      clonedChain.territory = replacementTerritoryId;
    }
    return clonedChain;
  });
}

function findAndReplacePublisherId(chain, targetPublisherId, replacementPublisherId) {
  const obj = JSON.parse(JSON.stringify(chain));

  if (obj.publisherId === targetPublisherId) {
    obj.publisherId = replacementPublisherId;
  }

  if (obj.children && obj.children.length > 0) {
    obj.children = obj.children.map(child =>
      findAndReplacePublisherId(child, targetPublisherId, replacementPublisherId)
    );
  }

  return obj;
}


function findAndReplaceComposerId(chain, targetComposerId, replacementComposerId) {
  const obj = JSON.parse(JSON.stringify(chain));

  if (obj.composerId === targetComposerId) {
    obj.composerId = replacementComposerId;
  }

  if (obj.children && obj.children.length > 0) {
    obj.children = obj.children.map(child =>
      findAndReplaceComposerId(child, targetComposerId, replacementComposerId)
    );
  }

  return obj;
}

function areTerritoriesEqual(territory1, territory2) {
  if (territory1.length !== territory2.length) {
    return false;
  }
  const sortedArray1 = territory1.sort();
  const sortedArray2 = territory2.sort();
  for (let i = 0; i < sortedArray1.length; i++) {
    if (sortedArray1[i] !== sortedArray2[i]) {
      return false;
    }
  }
  return true;
}

function getUniquePublisherObjects(arr) {
  return arr.reduce((unique, current) => {
    const existingObject = unique.find(obj =>
      obj.clientId === current.clientId &&
      obj.targetPublisherId === current.targetPublisherId &&
      obj.replacementPublisherId === current.replacementPublisherId
    );

    if (!existingObject) {
      unique.push(current);
    }

    return unique;
  }, []);
}

function getUniqueComposerObjects(arr) {
  return arr.reduce((unique, current) => {
    const existingObject = unique.find(obj =>
      obj.clientId === current.clientId &&
      obj.targetComposerId === current.targetComposerId &&
      obj.replacementComposerId === current.replacementComposerId
    );

    if (!existingObject) {
      unique.push(current);
    }

    return unique;
  }, []);
}

async.waterfall([
  (waterfallCb) => {
    if (process.argv[2]) {
      if (process.argv[2] === '--all') {
        console.log('------ processing ALL clients ------');
        console.log();
        const filter = { clientType: 'Publishing' };
        waterfallCb(null, filter);
      } else if (process.argv[2] === '--altafonte') {
        console.log('------ processing altafonte clients ------');
        console.log();
        const ids = ['5f8ef7fd6d763b001524c783',
          '619640cbf270aa0028e3baf0',
          '61963e4ba35e8600219eeeb8',
          '61963e7f7296d30021e717d3',
          '61963fc17296d30021e7189e',
          '61964046c75c8108d2318c9a',
          '61963ef4150d05001db13e76',
          '61963d674f0ad8002863cf25'];
        const filter = {_id: { $in: ids.map((id) => new ObjectId(id)) } };
        waterfallCb(null, filter);
      } else {
        waterfallCb(null, { _id: process.argv[2] });
      }
    } else {
      waterfallCb('Please provide a client id, or use --all to flush through All Work validations')
    }
  },
  (clientFilter, waterfallCb) => {
    Client.find(clientFilter, { name: 1 }).sort({ name: 1 }).exec(waterfallCb);
  },
  (clients, waterfallCb) => {
    let clientsCount = 0;
    async.eachLimit(clients, 5, (client, eachCb) => {
      const save = (process.argv[3]) ? process.argv[3] : 'false';
      async.parallel({
        publishers: function(parallelCallback) {
          Publisher.find({ clientId: client._id }, 'name', parallelCallback);
        },
        composers: function(parallelCallback) {
          Composer.find({ clientId: client._id }, 'name', parallelCallback);
        },
        territoryGroups: function(parallelCallback) {
          TerritoryGroup.find({ clientId: client._id }, 'name', parallelCallback);
        }  
      }, (err, clientData) => {
        async.waterfall([
          (cb) => {
            count = 0;
            runWork(client, null, 0, save, clientData.publishers, clientData.composers, clientData.territoryGroups, cb);
          },
        ], (err) => {
          clientsCount += 1;
          process.stdout.write(`\rProcessed client ${clientsCount}/${clients.length}`);
          eachCb(err);
        });
      });
    }, waterfallCb);
  },
], (err) => {
  if (err) { 
    console.log(err);
    process.exit(-1);
  } else {
    const outputLocation = `${appRootDir}/tmp/ipDataFromOtherClient.csv`;
    const writer = new WriteCsv({ headers: ['client', 'type', 'work', 'name', 'from', 'existing'], outputLocation });
    const outputData = allIpDataFromOtherClient.map((line) => [line.client, line.type, line.work, line.name, line.from, line.existing]);
    writer.addData(outputData, () => {
      writer.write((err, location) => {
        console.log(location);
        console.log('Complete');
        process.exit(-1); 
      });
    });
  }
});
