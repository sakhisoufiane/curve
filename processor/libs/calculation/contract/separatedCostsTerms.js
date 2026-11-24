const async = require('async');

const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const TerritoryGroup = require('../../../models/territoryGroup');
const ContractTermGroup = require('../../../models/contractTermGroup');

const SeparatedCostsTerms = {
  get: (contract, callback) => {
    const terms = [];

    async.eachSeries(contract.costsTerms, (obj, cb) => {
      if (obj) {
        obj = obj.toObject();
        async.parallel([
          function (waterfallCb) {
            if (obj && obj.territory && obj.territory.length === 24) {
              TerritoryGroup.findOne({ _id: obj.territory })
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
            if (obj && obj.type && obj.type.length === 24) {
              ContractTermGroup.findById(obj.type)
                .then((contractTermGroup) => {
                  if (contractTermGroup) {
                    obj.type = contractTermGroup.items.filter(Boolean);
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
          terms.push(obj);
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

module.exports = SeparatedCostsTerms;
