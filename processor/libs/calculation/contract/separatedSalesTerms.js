const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const async = require('async');

const Release = require('../../../models/release');
const Track = require('../../../models/track');
const Work = require('../../../models/work');
const TerritoryGroup = require('../../../models/territoryGroup');
const ContractTermGroup = require('../../../models/contractTermGroup');

const SeparatedSalesTerms = {
  get: (contract, callback) => {
    const terms = [];

    async.eachSeries(contract.salesTerms, (obj, cb) => {
      if (obj) {
        obj = obj.toObject();
        // Set reserve basis
        obj.reserveBasis = contract.reserveBasis;
        async.waterfall([
          function (waterfallCb) {
            // Releases
            if (obj.catalogueGroup) {
              Release.find({ clientId: contract.clientId, catalogueGroups: obj.catalogueGroup }, { _id: 1 })
                .then((releases) => {
                  if (releases) {
                    obj.releaseIds = releases.map((release) => release._id.toString());
                    waterfallCb();
                  } else {
                    waterfallCb();
                  }
                })
                .catch((err) => {
                  logger.error(err);
                  waterfallCb(err);
                });
            } else {
              waterfallCb();
            }
          },
          function (waterfallCb) {
            // Tracks
            if (obj.catalogueGroup) {
              Track.find({ clientId: contract.clientId, catalogueGroups: obj.catalogueGroup }, { _id: 1 })
                .then((tracks) => {
                  if (tracks) {
                    obj.trackIds = tracks.map((track) => track._id.toString());
                    waterfallCb();
                  } else {
                    waterfallCb();
                  }
                })
                .catch((err) => {
                  logger.error(err);
                  waterfallCb(err);
                });
            } else {
              waterfallCb();
            }
          },
          function (waterfallCb) {
            // Works
            if (obj.catalogueGroup) {
              Work.find({ clientId: contract.clientId, catalogueGroups: obj.catalogueGroup }, { _id: 1 })
                .then((works) => {
                  if (works) {
                    obj.workIds = works.map((work) => work._id.toString());
                    waterfallCb();
                  } else {
                    waterfallCb();
                  }
                })
                .catch((err) => {
                  logger.error(err);
                  waterfallCb(err);
                });
            } else {
              waterfallCb();
            }
          },
          function (waterfallCb) {
            if (obj && obj.territory && obj.territory.length == 24) {
              TerritoryGroup.findById(obj.territory)
                .then((territoryGroup) => {
                  if (territoryGroup) {
                    obj.territory = territoryGroup.territories;
                    waterfallCb();
                  } else {
                    waterfallCb();
                  }
                })
                .catch((err) => {
                  logger.error(err);
                  waterfallCb(err);
                });
            } else {
              waterfallCb();
            }
          },
          function (waterfallCb) {
            if (obj && obj.channel && obj.channel.length == 24) {
              ContractTermGroup.findById(obj.channel)
                .then((contractTermGroup) => {
                  if (contractTermGroup) {
                    obj.channel = contractTermGroup.items.filter(Boolean);
                    waterfallCb();
                  } else {
                    waterfallCb();
                  }
                })
                .catch((err) => {
                  logger.error(err);
                  waterfallCb(err);
                });
            } else {
              waterfallCb();
            }
          },
          function (waterfallCb) {
            if (obj && obj.configuration && obj.configuration.length == 24) {
              ContractTermGroup.findById(obj.configuration)
                .then((contractTermGroup) => {
                  if (contractTermGroup) {
                    obj.configuration = contractTermGroup.items.filter(Boolean);
                    waterfallCb();
                  } else {
                    waterfallCb();
                  }
                })
                .catch((err) => {
                  logger.error(err);
                  waterfallCb(err);
                });
            } else {
              waterfallCb();
            }
          },
          function (waterfallCb) {
            if (obj && obj.priceCategory && obj.priceCategory.length == 24) {
              ContractTermGroup.findById(obj.priceCategory)
                .then((contractTermGroup) => {
                  if (contractTermGroup) {
                    obj.priceCategory = contractTermGroup.items.filter(Boolean);
                    waterfallCb();
                  } else {
                    waterfallCb();
                  }
                })
                .catch((err) => {
                  logger.error(err);
                  waterfallCb(err);
                });
            } else {
              waterfallCb();
            }
          },
          function (waterfallCb) {
            if (obj && obj.source && obj.source.length == 24) {
              ContractTermGroup.findById(obj.source)
                .then((contractTermGroup) => {
                  if (contractTermGroup) {
                    obj.source = contractTermGroup.items.filter(Boolean);
                    waterfallCb();
                  } else {
                    waterfallCb();
                  }
                })
                .catch((err) => {
                  logger.error(err);
                  waterfallCb(err);
                });
            } else {
              waterfallCb();
            }
          },
        ], (err) => {
          if (obj.catalogueGroup && obj.catalogueGroup !== 'All'
            && (!obj.releaseIds || (obj.releaseIds && obj.releaseIds.length === 0))
            && (!obj.trackIds || (obj.trackIds && obj.trackIds.length === 0))
            && (!obj.workIds || (obj.workIds && obj.workIds.length === 0))
          ) {
            // Don't add terms when object group exists but doesn't have any catalogue
            logger.info(`Not adding term due to no catalogue associated with group: ${JSON.stringify(obj)}`);
          } else {
            terms.push(obj);
          }

          cb();
        });
      } else {
        cb();
      }
    }, (err) => {
      callback(err, terms);
    });
  },
};

module.exports = SeparatedSalesTerms;
