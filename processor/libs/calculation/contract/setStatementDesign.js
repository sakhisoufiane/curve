const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const async = require('async');
const { ObjectId } = require('mongodb');

const Client = require('../../../models/client');
const Company = require('../../../models/company');
const Contract = require('../../../models/contract');

module.exports = (contract, callback) => {
  async.waterfall([
    function (cb) {
      // Get Client
      Client.findById(contract.clientId)
        .then((client) => {
          // Check for Company
          if (ObjectId.isValid(contract.companyId)) {
            // Get Company
            Company.findById(contract.companyId)
              .then((company) => {
                // If it exists and has a statement design
                if (company && company.statementDesign) {
                  contract.statementDesign = company.statementDesign;
                } else {
                  // Else fallback to client statement design
                  contract.statementDesign = client.statementDesign;
                }
                cb();
              })
              .catch((err) => {
                logger.error(err);
                cb(err);
              });
          } else {
            // No company, use client statement design
            contract.statementDesign = client.statementDesign;
            cb();
          }
        })
        .catch((err) => {
          logger.error(err);
          cb(err);
        });
    },
    function (cb) {
      // Save contract
      Contract.updateOne({ _id: contract._id }, { $set: { statementDesign: contract.statementDesign } }, { timestamps: false })
        .then((res) => {
          cb(null, res);
        })
        .catch((err) => {
          logger.error(err);
          cb(err);
        });
    },
  ], (err) => {
    if (err) {
      logger.error(err);
    }
    callback(err);
  });
};
