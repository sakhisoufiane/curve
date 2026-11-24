/* eslint-disable no-await-in-loop */

const { BigQuery, databaseUtils, logger } = require('@curveroyaltysystems/platform-shared-utils');
const { ObjectId } = require('mongodb');
const _ = require('lodash');
const async = require('async');
const { salesHelpers } = require('../salesHelpers');
const Client = require('../../../models/client');
const SalesGroup = require('../../../models/salesGroup');
const SalesGroupLines = require('../../../models/salesGroupLines');
const Period = require('../../../models/period');

const SALES_GROUP_LINES_MAX_LINES = 10_000;
const SALES_LINE_IDS_LIMIT_PER_QUERY = 10_000;
const logKey = 'Sales Groups';

const salesGroupHelpers = {
  addSalesLinesByIds: async ({ salesLineIds, salesGroup }) => {
    logger.info(`${salesGroup.clientId} ${logKey} - adding SalesLines to SalesGroup ${salesGroup._id} of type '${salesGroup.type}' by ids`);
    if (salesLineIds?.length) {
      const filter = { id: { $in: salesLineIds } };
      return salesGroupHelpers.addSalesLinesByFilter({ filter, salesGroup });
    }
    throw new Error('No sales lines selected');
  },

  addSalesLinesByFilter: async ({ filter, salesGroup }) => {
    logger.info(`${salesGroup.clientId} ${logKey} - adding SalesLines to SalesGroup ${salesGroup._id} of type '${salesGroup.type}' by filter`);
    const client = await Client.findById(salesGroup.clientId);
    if (!client) {
      throw new Error('Client not found');
    }
    const bigQuery = new BigQuery(databaseUtils.getBigQueryOpts(client));
    const clientId = client._id.toString();
    const { filter: bqFilter, filterParams } = await salesHelpers.getBigQueryFilter({ filter, bigQuery, clientName: client.name, clientId });
    let salesLines = await salesHelpers.getSales({ bigQuery, select: ['id', 'salesFileId'], bqFilter, filterParams, options: {}, clientId });
    if (salesLines?.length) {
      const salesFileIds = [...new Set(salesLines.map((line) => line.salesFileId))];
      logger.info(`${clientId} ${logKey} - adding a total of ${salesLines.length?.toLocaleString()} SalesLines to SalesGroup ${salesGroup._id}`);
      if (salesGroup.type === 'resolved') {
        if (!await salesGroupHelpers.areAllSalesLinesInSuspense({ salesLines, salesFileIds, clientId })) {
          throw new Error('All sales lines must be in suspense to be resolved');
        }
      } else if (salesGroup.type === 'suspense') {
        salesLines = await salesGroupHelpers.filterOutIdsAlreadyOnSalesGroup({ salesGroup, salesLines, salesFileIds });
      }
      const salesLinesGrouped = salesLines.reduce((acc, line) => {
        if (!acc[line.salesFileId]) { acc[line.salesFileId] = []; }
        acc[line.salesFileId].push(line.id);
        return acc;
      }, {});
      await async.eachLimit(Object.entries(salesLinesGrouped), 5, async (item) => {
        const [salesFileId, salesLineIds] = item;
        await salesGroupHelpers.addSalesLinesBySalesFileId({ salesLineIds, salesFileId, salesGroup });
      });

      await salesGroupHelpers.removeSalesLinesFromOtherSalesGroups({ salesLines, salesFileIds, salesGroup });

      // Update the Sales Group to ensure it is included in recalculations and update totalSalesLines
      await salesGroup.save();
      return { totalAdded: salesLines.length };
    }
    throw new Error('No filtered sales lines to add to a Group');
  },

  addSalesLinesBySalesFileId: async ({ salesLineIds, salesFileId, salesGroup }) => {
    const { clientId, type } = salesGroup;
    const salesGroupId = salesGroup._id;
    const idsToAdd = [...salesLineIds];
    logger.info(`${clientId} ${logKey} - adding SalesLines to SalesGroup ${salesGroupId} by salesFileId ${salesFileId}`);
    await SalesGroupLines.findOne({ clientId, type, salesGroupId, salesFileId }, { salesLineIds: 1 }).sort({ createdAt: -1 }).lean().then(async (salesGroupLines) => {
      if (salesGroupLines) {
        const availableSalesLineCount = SALES_GROUP_LINES_MAX_LINES - salesGroupLines.salesLineIds.length;
        const salesLinesToAdd = idsToAdd.splice(0, availableSalesLineCount);
        await SalesGroupLines.findByIdAndUpdate(salesGroupLines._id, { $push: { salesLineIds: salesLinesToAdd } });
      }
      if (idsToAdd.length) {
        const chunkedIds = _.chunk(idsToAdd, SALES_LINE_IDS_LIMIT_PER_QUERY);
        await async.eachLimit(chunkedIds, 10, async (chunk) => {
          const newSalesGroupLines = new SalesGroupLines({
            clientId,
            type,
            salesGroupId,
            salesFileId,
            salesLineIds: chunk,
          });
          await newSalesGroupLines.save();
        });
      }
    });
  },
  removeSalesLinesFromOtherSalesGroups: async ({ salesLines, salesFileIds, salesGroup }) => {
    const { _id: salesGroupId, clientId } = salesGroup;
    logger.info(`${clientId} ${logKey} - removing SalesLines from other SalesGroups to salesGroupId ${salesGroupId}`);
    const idsToRemove = new Set([...salesLines.map((line) => line.id)]);
    const salesGroupsToUpdate = new Set();
    const allOtherSalesGroupLines = await SalesGroupLines.find({
      clientId,
      salesGroupId: { $ne: salesGroupId },
      salesFileId: { $in: salesFileIds },
    }, { _id: 1 }).lean();
    const allOtherSalesGroupLinesIds = allOtherSalesGroupLines.map((line) => line._id);

    logger.info(`${clientId} ${logKey} - removing SalesLines from other SalesGroups - updating salesGroupLines to remove salesLineIds`);
    await async.eachLimit(allOtherSalesGroupLinesIds, 10, async (id) => {
      // if there are no more ids to remove we can skip the remaining salesGroupLines documents
      if (idsToRemove.size === 0) {
        return;
      }
      const salesGroupLines = await SalesGroupLines.findById(id, { salesLineIds: 1, salesGroupId: 1 }).lean();
      const updatedSalesLineIds = salesGroupLines.salesLineIds.filter((lineId) => {
        if (idsToRemove.has(lineId)) {
          // remove matching id from the set to remove, so we can skip checking other salesGroupLines documents once there are no more ids to remove
          idsToRemove.delete(lineId);
          return false;
        }
        return true;
      });
      // no need to update if the salesLineIds are the same after filtering out the ids to remove
      if (updatedSalesLineIds.length && updatedSalesLineIds.length === salesGroupLines.salesLineIds.length) {
        return;
      }
      salesGroupsToUpdate.add(salesGroupLines.salesGroupId.toString());
      // empty salesLineIds means we can delete the SalesGroupLines document
      if (updatedSalesLineIds.length === 0) {
        await SalesGroupLines.findByIdAndDelete(id);
        return;
      }
      // otherwise we update it with the remaining salesLineIds
      await SalesGroupLines.findByIdAndUpdate(id, { salesLineIds: updatedSalesLineIds });
    });

    // Update the Sales Groups to ensure they are included in recalculations and update totalSalesLines
    logger.info(`${clientId} ${logKey} - removing SalesLines from other SalesGroups - updating salesGroups: ${JSON.stringify([...salesGroupsToUpdate])}`);
    await async.eachLimit(salesGroupsToUpdate, 10, async (salesGroupId) => {
      const salesGroupToUpdate = await SalesGroup.findById(salesGroupId);
      if (salesGroupToUpdate) {
        await salesGroupToUpdate.save();
      }
    });
  },

  areAllSalesLinesInSuspense: async ({ salesLines, salesFileIds, clientId }) => {
    logger.info(`${clientId} ${logKey} - checking if all sales lines are in suspense`);
    const ids = [...salesLines.map((line) => line.id)];
    const data = await SalesGroupLines.find({
      clientId,
      type: 'suspense',
      salesFileId: { $in: salesFileIds },
    }, { salesLineIds: 1 }).lean();
    const foundSalesLineIdsSet = new Set(data.flatMap((item) => item.salesLineIds));
    const allFound = ids.every((id) => foundSalesLineIdsSet.has(id));
    if (!allFound) {
      return false;
    }
    return true;
  },

  filterOutIdsAlreadyOnSalesGroup: async ({ salesGroup, salesLines, salesFileIds }) => {
    const { _id: salesGroupId, type, clientId } = salesGroup;
    logger.info(`${clientId} ${logKey} - filtering out ids already on SalesGroup ${salesGroupId}`);
    const data = await SalesGroupLines.find({
      clientId,
      salesGroupId,
      type,
      salesFileId: { $in: salesFileIds },
    }, { salesLineIds: 1 }).lean();
    const foundSalesLineIdsSet = new Set(data.flatMap((item) => item.salesLineIds));
    const filteredSalesLines = salesLines.filter((salesLine) => !foundSalesLineIdsSet.has(salesLine.id));
    return filteredSalesLines;
  },

  paramsToFilterField: (inputParams, user) => {
    const params = {};
    if (user.clientId) {
      params.clientId = user.clientId;
    }
    if (inputParams?.type) {
      params.type = inputParams.type;
    }
    if (inputParams?.text) {
      const regex = new RegExp(_.escapeRegExp(inputParams.text), 'i');
      params.$or = [
        { name: { $regex: regex } },
      ];
      if (inputParams.text.length === 24 && ObjectId.isValid(inputParams.text)) {
        params.$or.push({ _id: inputParams.text });
      }
    }
    if (inputParams.createdAfter || inputParams.createdBefore) { params.createdAt = {}; }
    if (inputParams.createdAfter) { params.createdAt.$gte = inputParams.createdAfter; }
    if (inputParams.createdBefore) { params.createdAt.$lte = inputParams.createdBefore; }
    if (inputParams?.notInclude?.length) {
      params._id = {
        $nin: inputParams.notInclude.map((val) => new ObjectId(val)),
      };
    }
    return params;
  },

  deleteSalesGroups: async ({ curveUser, ids }) => {
    const { clientId } = curveUser;
    let deletedCount = 0;

    const filter = {
      clientId,
      _id: { $in: ids },
    };
    const salesGroups = await SalesGroup.find(filter, { name: 1, type: 1 }).lean();
    const associations = await salesGroupHelpers.checkSalesGroupsAssociations({ clientId, salesGroups });
    if (associations.length) {
      return ({
        code: 409,
        message: 'Some or all of the selected groups cannot be deleted as they contain lines that have been included in one or more locked periods',
        associations,
      });
    }
    await async.eachLimit(salesGroups, 10, async (salesGroup) => {
      await salesGroupHelpers.deleteSalesGroup({ clientId, salesGroupId: salesGroup._id });
      deletedCount += 1;
    });
    return ({
      deletedCount,
      code: 200,
    });
  },

  deleteSalesGroup: async ({ clientId, salesGroupId }) => {
    if (!clientId || !salesGroupId) {
      throw new Error('clientId and salesGroupId are required to delete a Sales Group');
    }
    logger.info(`${clientId} ${logKey} - deleting SalesGroup ${salesGroupId} and associated SalesGroupLines`);
    await SalesGroupLines.deleteMany({ clientId, salesGroupId });
    await SalesGroup.findByIdAndDelete(salesGroupId);
  },

  checkSalesGroupsAssociations: async ({ clientId, salesGroups }) => {
    const resolvedGroups = salesGroups.filter((group) => group.type === 'resolved');
    if (resolvedGroups.length === 0) {
      return [];
    }
    const lockedPeriods = await Period.find({
      locked: true,
      clientId,
      resolvedGroupIds: { $in: resolvedGroups.map((group) => group._id) },
    }, { name: 1, resolvedGroupIds: 1 }).lean();
    if (lockedPeriods.length === 0) {
      return [];
    }
    const associations = [];
    resolvedGroups.forEach((group) => {
      const periodsAssociatedToGroup = lockedPeriods.filter((period) => period.resolvedGroupIds.map((id) => id.toString()).includes(group._id.toString()));
      if (periodsAssociatedToGroup.length) {
        associations.push({
          id: group._id.toString(),
          name: group.name,
          lockedPeriods: periodsAssociatedToGroup.map((period) => ({
            id: period._id.toString(),
            name: period.name,
          })),
        });
      }
    });
    return associations;
  },

};

module.exports = salesGroupHelpers;
