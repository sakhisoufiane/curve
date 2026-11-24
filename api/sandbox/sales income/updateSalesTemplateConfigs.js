require('dotenv').config();
require('../models/db');
const SalesTemplate = require('../models/salesTemplate');
const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const async = require ('async');
const border = "==========================";
const salesTemplateIds = ['60b66cd8b517da5570b62608', '5f512af7a8799c001b14329f'];
const clientId = "5dd41401956f537fd8a0e91c";

const updateSalesTemplateConfigs = async () => {
  for (const salesTemplateId of salesTemplateIds) {

    const configNames = [
      { original: 'OnDemandStream', newName: 'Premium On-Demand Stream' },
      { original: 'LimitedInteractiveStream', newName: 'Radio' },
      { original: 'NonInteractiveStream', newName: 'Radio' },
      { original: 'PinnedTrackStream', newName: 'Radio' },
      { original: 'PremiumAccessStream', newName: 'Ad-Funded On-Demand Stream' },
      { original: 'PremiumIntroStream', newName: 'Ad-Funded On-Demand Stream' },
    ];

    for (const { original, newName } of configNames) {
      await SalesTemplate.findOneAndUpdate(
        { _id: salesTemplateId, "configurations.map": original, clientId },
        { $set: { "configurations.$.name" : newName } },
        { timestamps: false }
      )
      .then(result => {
        if (result) {
          logger.info(`${border} Sales Template ${salesTemplateId} Configuration '${original}' has been successfully updated to '${newName}'. ${border}`);
        } else {
          logger.info(`${border} Sales Template ${salesTemplateId} does not have Configuration '${original}' for update. ${border}`);
        }
      })
      .catch(err => {
        logger.error(`${border} ERROR: ${err} ${border}`);
        process.exit(1);
      });
    }
  }
  process.exit(0);
}

updateSalesTemplateConfigs();
