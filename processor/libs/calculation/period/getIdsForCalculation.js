const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const { ObjectId } = require('mongodb');

const SalesFile = require('../../../models/salesFile');
const Cost = require('../../../models/cost');

const GetIdsForCalculation = {
  getSalesFileIds: async (period) => {
    // Set filter for sales file IDs in calculation
    const salesFilesIds = period.salesFilesIds.map((id) => new ObjectId(id));
    const filter = { clientId: period.clientId, _id: { $in: salesFilesIds } };
    const salesFiles = await SalesFile.find(filter, { _id: 1 });
    // Set ids to string
    const ids = salesFiles.map((salesFile) => salesFile._id.toString());
    // Add to period
    period.salesFilesIds = ids;
    logger.info(`${period._id} Setting Sales File IDs: ${ids.join(', ')}`);
    // Save period and return
    await period.save();
  },
  getCostIds: async (period) => {
    const costIds = period.costIds.map((id) => ObjectId.createFromHexString(id));

    // Set filter for cost IDs in calculation
    const filter = { clientId: period.clientId, _id: { $in: costIds } };
    const costs = await Cost.find(filter, { _id: 1 });

    // Set ids to string
    const ids = costs.map((cost) => cost._id.toString());
    logger.info(`${period._id} Setting Cost IDs: ${ids.join(', ')}`);
    // Update reference
    period.costIds = ids;
    // Don't overwrite recalculation logistics
    // These don't seem to be doing anything, these fields aren't deleted from the model.
    delete period.processStartTime;
    delete period.processEndTime;
    delete period.runNo;
    // Save period and return
    await period.save();
  },
};

module.exports = GetIdsForCalculation;
