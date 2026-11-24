/* eslint-disable no-continue */
const { escapeRegExp } = require('lodash');
const mongoose = require('@curveroyaltysystems/models/mongoose');
const { logger, BigQuery, databaseUtils } = require('@curveroyaltysystems/platform-shared-utils');

const { ObjectId } = require('mongodb');
const Work = require('../../models/work');
const Client = require('../../models/client');
const SalesFile = require('../../models/salesFile');
const RemovedDuplicateWork = require('../../models/removedDuplicateWork');
const DeliveredWork = require('../../models/deliveredWork');
const IswcDeliveredWork = require('../../models/iswcDeliveredWork');
const CwrDelivery = require('../../models/cwrDelivery');

/**
 * Retrieves duplicate works based on the provided client ID and query parameters.
 * @param {Object} params - The parameters for retrieving duplicate works.
 * @param {string} params.clientId - The ID of the client to filter works.
 * @param {Object} [params.query={}] - The query parameters for filtering and sorting works.
 * @returns {Promise<Object>} An object containing the duplicate works and metadata.
 */
async function getDuplicateWorks({ clientId, query = {} }) {
  const { page = 1, limit = 25, orderBy = 'potentialDuplicatesCount', orderDir = 'desc', search } = query;
  const sortDirection = orderDir === 'desc' ? -1 : 1;
  const params = {};

  if (search) {
    const regex = escapeRegExp(search);
    const orConditions = [
      { title: { $regex: regex, $options: 'i' } },
      { foreignId: { $regex: regex, $options: 'i' } },
      { composer: { $regex: regex, $options: 'i' } },
    ];

    if (search.length === 24 && mongoose.Types.ObjectId.isValid(search)) {
      orConditions.push({ _id: new mongoose.Types.ObjectId(search) });
    }

    // Find documents matching by title, foreignId, or composer (for nested duplicates)
    const matchingDocs = await Work
      .find({ clientId, $or: orConditions })
      .select('_id');

    if (matchingDocs?.length) {
      const matchingIds = matchingDocs.map((doc) => doc._id);
      orConditions.push({ 'potentialDuplicates.workId': { $in: matchingIds } });
    }

    params.$or = orConditions;
  }

  const sort = { [orderBy]: sortDirection };
  if (orderBy !== 'title') sort.title = 1;

  const works = await Work.paginate(
    {
      clientId,
      potentialDuplicatesCount: { $exists: true, $gt: 0 },
      ...params,
    },
    {
      page,
      limit,
      lean: true,
      sort,
      select: '_id title composer foreignId clientId potentialDuplicates potentialDuplicatesCount',
    },
  );

  if (!works.totalDocs) {
    return {
      meta: { total: 0, currentPage: page, totalPages: 0 },
      duplicates: [],
    };
  }

  const catalogueIds = new Set();
  works.docs.forEach((data) => data.potentialDuplicates.forEach((dup) => catalogueIds.add(dup.workId)));
  const workIdArray = Array.from(catalogueIds);

  // Get Works found within duplicates
  const duplicateWorks = await Work
    .find({ _id: { $in: workIdArray }, clientId })
    .select({
      _id: 1,
      title: 1,
      foreignId: 1,
      composer: 1,
    })
    .lean();

  const worksWithDuplicates = works.docs.map((work) => {
    const potentialDuplicates = work.potentialDuplicates.map((pd) => {
      const duplicateWork = duplicateWorks.find((dc) => dc._id.toString() === pd.workId.toString());
      if (!duplicateWork) return null;

      return {
        workId: pd.workId.toString(),
        title: duplicateWork.title ?? null,
        foreignId: duplicateWork.foreignId ?? null,
        composer: duplicateWork.composer ?? null,
      };
    }).filter((pd) => pd);

    work.potentialDuplicates = potentialDuplicates;
    return work;
  });

  return {
    meta: {
      total: works.totalDocs,
      currentPage: works.page,
      totalPages: works.totalPages,
    },
    duplicates: worksWithDuplicates,
  };
}

/**
 * Retrieves an overview of works to be merged, including unique field values.
 * @param {Object} params - The parameters for retrieving the merge overview.
 * @param {string} params.clientId - The ID of the client to filter works.
 * @param {string} params.primaryWorkId - The ID of the primary work to merge.
 * @param {Array} params.duplicateWorks - An array of duplicate works to be merged.
 * @returns {Promise<Object>} An object containing unique field values and works to be merged.
 */
async function getMergeOverview({ clientId, primaryWorkId, duplicateWorks }) {
  if (!primaryWorkId || !ObjectId.isValid(primaryWorkId)) {
    const error = new Error('No valid primary work id provided');
    error.code = 400;
    throw error;
  }

  if (!duplicateWorks || !Array.isArray(duplicateWorks) || duplicateWorks.length === 0) {
    const error = new Error('No duplicate works specified');
    error.code = 400;
    throw error;
  }

  const primaryWork = await Work.findOne({ clientId, _id: primaryWorkId });
  if (!primaryWork) {
    const error = new Error('Primary work not found');
    error.code = 400;
    throw error;
  }

  const workIds = duplicateWorks.map((work) => work.id);
  const works = await Work.find({ clientId, _id: { $in: workIds } });

  if (works.length !== workIds.length) {
    const missingWorks = workIds.filter(
      (id) => !works.some((work) => work._id.toString() === id),
    );
    const error = new Error(`The following Work IDs do not exist: ${missingWorks.join(', ')}`);
    error.code = 400;
    throw error;
  }

  const selectedWorks = works.filter(({ _id }) => {
    const work = duplicateWorks.find(({ id, selected }) => id === _id.toString() && selected);
    return work;
  })
  // Ensure the Primary Work is always first in this list so the default values are based on the users selection
    .sort((a, b) => {
      if (a._id.toString() === primaryWorkId) return -1;
      if (b._id.toString() === primaryWorkId) return 1;
      return 0;
    });

  const optionsWithData = getUniqueFieldValues(selectedWorks, primaryWork);
  const transformedWorks = works.map((work) => work.toObject());
  return {
    options: optionsWithData,
    works: transformedWorks,
  };
}

/**
 * Extracts unique field values from works for duplicate detection.
 * This function processes both simple fields and complex fields (arrays of objects) to ensure unique values
 * are captured for duplicate matching.
 * @param {Array} works - An array of work objects to extract unique field values from.
 * @returns {Object} An object containing unique field values for each specified field.
 */
function getUniqueFieldValues(works, primaryWork) {
  // Simple fields that are single text values or single string arrays, and require simple duplicate matching
  const fields = [
    'title',
    'composer',
    'foreignId',
    'projectId',
    'identifier',
    'iswc',
    'tunecode',
    'copyrightDate',
    'labelCopy',
    'catalogueGroups',
    'performers',
    'trackIds',
    'aliases',
  ];

  // Complex fields that are arrays of objects, and require smarter duplicate matching
  const arrayObjectFields = [
    'alternateTitles',
    'territories',
    'rightsChain',
    'partnerRightsChains',
    'salesReturnsRights', // Participation Rates
    'channelSpecificSalesReturnsRights', // Specific Participation Rates
    'societyIdentifiers',
  ];

  const uniqueFieldValues = {};
  const fieldSets = Object.fromEntries(fields.map((field) => [field, new Set()]));

  const altTitleMap = new Map();
  const territoriesMap = new Map();
  const rightsChainMap = new Map();
  const partnerRightsChains = new Map();
  const participationRates = new Map();
  const specificParticipationRates = new Map();
  const societyIdentifiers = new Map();

  for (const work of works) {
    // Single text fields
    if (work.title) fieldSets.title.add(work.title);
    if (work.composer) fieldSets.composer.add(work.composer);
    if (work.foreignId) fieldSets.foreignId.add(work.foreignId);
    if (work.projectId) fieldSets.projectId.add(work.projectId);
    if (work.identifier) fieldSets.identifier.add(work.identifier);
    if (work.iswc) fieldSets.iswc.add(work.iswc);
    if (work.tunecode) fieldSets.tunecode.add(work.tunecode);
    if (work.copyrightDate) fieldSets.copyrightDate.add(work.copyrightDate);
    if (work.labelCopy) fieldSets.labelCopy.add(work.labelCopy);

    // Single string array fields
    if (work.catalogueGroups && Array.isArray(work.catalogueGroups) && work.catalogueGroups.length > 0) {
      work.catalogueGroups.forEach((group) => fieldSets.catalogueGroups.add(group));
    }
    if (work.performers && Array.isArray(work.performers) && work.performers.length > 0) {
      work.performers.forEach((performer) => fieldSets.performers.add(performer));
    }
    if (work.trackIds && Array.isArray(work.trackIds) && work.trackIds.length > 0) {
      work.trackIds.forEach((trackId) => fieldSets.trackIds.add(trackId));
    }
    if (work.aliases && Array.isArray(work.aliases) && work.aliases.length > 0) {
      work.aliases.forEach((alias) => fieldSets.aliases.add(alias));
    }

    // Object array (multi-select) fields
    // -- Alternate Titles
    if (work.alternateTitles && Array.isArray(work.alternateTitles) && work.alternateTitles.length > 0) {
      for (const alt of work.alternateTitles) {
        const key = `${alt.title}:${alt.language}`;
        if (!altTitleMap.has(key)) {
          altTitleMap.set(key, {
            title: alt.title,
            language: alt.language,
            workId: work._id.toString(),
            workTitle: work.title,
            fromDuplicateTitle: false,
          });
        }
      }
    }
    // -- Alternate Titles from duplicates (duplicate Works should be pre-populated as alternate titles)
    // Only when not already added AND the title is different from the primary Work
    if (work._id.toString() !== primaryWork._id.toString() && work.title !== primaryWork.title) {
      const key = `${work.title}:`;
      if (!altTitleMap.has(key)) {
        altTitleMap.set(key, {
          title: work.title,
          language: '',
          workId: work._id.toString(),
          workTitle: work.title,
          fromDuplicateTitle: true,
        });
      }
    }

    // -- Territories
    if (work.territories && Array.isArray(work.territories) && work.territories.length > 0) {
      const key = JSON.stringify(work.territories);
      if (!territoriesMap.has(key)) {
        territoriesMap.set(key, { workId: work._id.toString(), workTitle: work.title, value: work.territories });
      }
    }
    // -- Default Rights Chain
    if (work.rightsChain && Array.isArray(work.rightsChain) && work.rightsChain.length > 0) {
      const key = JSON.stringify(work.rightsChain);
      if (!rightsChainMap.has(key)) {
        rightsChainMap.set(key, { workId: work._id.toString(), workTitle: work.title, value: work.rightsChain });
      }
    }
    // -- Partner Rights Chains
    if (work.partnerRightsChains && Array.isArray(work.partnerRightsChains) && work.partnerRightsChains.length > 0) {
      const partnerChainsKey = JSON.stringify(work.partnerRightsChains);
      if (!partnerRightsChains.has(partnerChainsKey)) {
        partnerRightsChains.set(partnerChainsKey, {
          workId: work._id.toString(),
          workTitle: work.title,
          value: work.partnerRightsChains,
        });
      }
    }
    // -- Participation Rates
    if (work.salesReturnsRights && Array.isArray(work.salesReturnsRights) && work.salesReturnsRights.length > 0) {
      for (const rate of work.salesReturnsRights) {
        const key = `${rate.contractId}:${rate.percentage}`;
        if (!participationRates.has(key)) {
          participationRates.set(key, {
            workId: work._id.toString(),
            workTitle: work.title,
            contractId: rate.contractId,
            percentage: rate.percentage,
          });
        }
      }
    }
    // -- Specific Participation Rates
    if (work.channelSpecificSalesReturnsRights && Array.isArray(work.channelSpecificSalesReturnsRights) && work.channelSpecificSalesReturnsRights.length > 0) {
      for (const contract of work.channelSpecificSalesReturnsRights) {
        const key = `${contract.contractId}:${contract.percentage}:${contract.distributionChannel}:${contract.source}:${contract.territory}`;
        if (!specificParticipationRates.has(key)) {
          specificParticipationRates.set(key, {
            workId: work._id.toString(),
            workTitle: work.title,
            contractId: contract.contractId,
            percentage: contract.percentage,
            distributionChannel: contract.distributionChannel,
            source: contract.source,
            territory: contract.territory,
          });
        }
      }
    }
    // -- Society Identifiers
    if (work.societyIdentifiers && Array.isArray(work.societyIdentifiers) && work.societyIdentifiers.length > 0) {
      for (const identifier of work.societyIdentifiers) {
        const key = `${identifier.society}:${identifier.identifier}`;
        if (!societyIdentifiers.has(key)) {
          societyIdentifiers.set(key, {
            society: identifier.society,
            identifier: identifier.identifier,
            workId: work._id.toString(),
            workTitle: work.title,
          });
        }
      }
    }

    uniqueFieldValues.alternateTitles = Array.from(altTitleMap.values());
    uniqueFieldValues.territories = Array.from(territoriesMap.values());
    uniqueFieldValues.rightsChain = Array.from(rightsChainMap.values());
    uniqueFieldValues.partnerRightsChains = Array.from(partnerRightsChains.values());
    uniqueFieldValues.salesReturnsRights = Array.from(participationRates.values());
    uniqueFieldValues.channelSpecificSalesReturnsRights = Array.from(specificParticipationRates.values());
    uniqueFieldValues.societyIdentifiers = Array.from(societyIdentifiers.values());

    for (const field in fieldSets) {
      if (field in fieldSets) {
        if (arrayObjectFields.includes(field)) continue;
        uniqueFieldValues[field] = [...fieldSets[field]];

        // Some fields need to be in object format so that the frontend can update the state correctly
        // This is an issue with Angular, and possibly can be removed when using a newer framework
        if (['trackIds', 'performers', 'aliases'].includes(field)) {
          uniqueFieldValues[field] = uniqueFieldValues[field].map((value) => ({ value }));
        }
      }
    }
  }

  return uniqueFieldValues;
}

/**
 * Merges works by updating the primary work with data from duplicate works and deleting the duplicates.
 * @param {Object} params - The parameters for merging works.
 * @param {string} params.clientId - The ID of the client to filter works.
 * @param {string} params.userId - The ID of the user performing the merge.
 * @param {string} params.primaryWorkId - The ID of the primary work to merge.
 * @param {Object} params.mergeData - The data to merge into the primary work.
 * @param {Array} params.deleteWorkIds - An array of work IDs to delete after merging.
 * @param {Array} params.blacklistedDuplicateIds - An array of work IDs to exclude from merging.
 * @returns {Promise<void>}
 */
async function mergeWorks({ clientId, userId, primaryWorkId, mergeData, deleteWorkIds, blacklistedDuplicateIds }) {
  if (!primaryWorkId || !ObjectId.isValid(primaryWorkId)) {
    const error = new Error('No valid primary Work ID provided');
    error.code = 400;
    throw error;
  }

  if (!mergeData || typeof mergeData !== 'object') {
    const error = new Error('No valid merge data provided');
    error.code = 400;
    throw error;
  }

  const primaryWork = await Work.findOne({ clientId, _id: primaryWorkId });
  if (!primaryWork) {
    const error = new Error(`Primary Work not found with ID ${primaryWorkId}`);
    error.code = 400;
    throw error;
  }

  const updatedPotentialDuplicates = primaryWork.potentialDuplicates.filter(({ workId }) => !blacklistedDuplicateIds.includes(workId.toString()) && !deleteWorkIds.includes(workId.toString()));

  const updatedIgnoreIds = [...new Set([...primaryWork.blacklistedDuplicateIds, ...blacklistedDuplicateIds])];

  // Display version of Participation Rates need building here as this is required in the app
  if (mergeData.salesReturnsRights?.length > 0) {
    const buildDisplayRate = (participationRate) => {
      const newRate = { contractId: participationRate.contractId, percentage: participationRate.percentage };
      if (participationRate.children) newRate.children = participationRate.children.map(buildDisplayRate);
      return newRate;
    };
    mergeData.salesReturnsRightsDisplay = mergeData.salesReturnsRights.map(buildDisplayRate);
  }

  const updatedPrimaryWork = {
    ...primaryWork.toObject(),
    ...mergeData,
    potentialDuplicates: updatedPotentialDuplicates,
    potentialDuplicatesCount: updatedPotentialDuplicates.length,
    blacklistedDuplicateIds: updatedIgnoreIds,
  };

  // Required so that Mongoose detects changes to nested array/object fields
  primaryWork.set(updatedPrimaryWork);

  logger.debug('Updating primary work:', primaryWork._id.toString());
  primaryWork._excludeIdsForValidation = deleteWorkIds;
  await primaryWork.save();

  if (deleteWorkIds && deleteWorkIds.length > 0) {
    // Update existing duplicate Work IDs to the new primary Work ID
    await Promise.all([
      // Sales Files
      updateWorkSalesFiles({ clientId, deleteWorkIds, primaryWork }),
      // Delivered Works
      updateDeliveredWorks({ clientId, deleteWorkIds, primaryWork }),
      // ISWC Delivered Works
      updateIswcDeliveredWorks({ clientId, deleteWorkIds, primaryWork }),
      // CWR Deliveries
      updateCwrDeliveries({ clientId, deleteWorkIds, primaryWork }),
    ]);

    // Update sales lines (only input table) in BigQuery
    await updateSalesInputTable({ clientId, deleteWorkIds, primaryWork });

    // Save copies of the merged works for Delivery history
    logger.debug('Saving merged works for delivery history...');
    await logMergedWorks({ clientId, userId, deleteWorkIds, primaryWorkId: primaryWork._id });

    // Delete the duplicate works
    logger.debug('Deleting duplicate works:', deleteWorkIds);
    await Work.deleteMany({ clientId, _id: { $in: deleteWorkIds } });
  }
}

/**
 * Updates sales files to replace deleted work IDs with the primary work ID.
 * @param {Object} params - The parameters for updating sales files.
 * @param {string} params.clientId - The ID of the client to filter sales files.
 * @param {Array} params.deleteWorkIds - An array of work IDs to be deleted.
 * @param {Object} params.primaryWork - The primary work object to which duplicates are merged.
 * @returns {Promise<void>}
 */
async function updateWorkSalesFiles({ clientId, deleteWorkIds, primaryWork }) {
  const salesFiles = await SalesFile.find({ clientId, usedWorkIds: { $in: deleteWorkIds } }, { _id: 1, usedWorkIds: 1 });
  logger.debug('Sales Files to be updated:', salesFiles.length);
  if (salesFiles.length > 0) {
    const updatedSalesFiles = salesFiles.map((salesFile) => {
      salesFile.usedWorkIds = salesFile.usedWorkIds.filter((workId) => !deleteWorkIds.includes(workId.toString()));
      salesFile.usedWorkIds.push(primaryWork._id.toString());
      return salesFile;
    });
    await SalesFile.bulkWrite(
      updatedSalesFiles.map((salesFile) => ({
        updateOne: {
          filter: { _id: salesFile._id },
          update: { usedWorkIds: salesFile.usedWorkIds },
        },
      })),
    );
  }
}

/**
 * Updates delivered works to reference the primary work ID for previously delivered works.
 * @param {Object} params - The parameters for updating delivered works.
 * @param {string} params.clientId - The ID of the client to filter delivered works.
 * @param {Array} params.deleteWorkIds - An array of work IDs to be deleted.
 * @param {Object} params.primaryWork - The primary work object to which duplicates are merged.
 * @returns {Promise<void>}
 */
async function updateDeliveredWorks({ clientId, deleteWorkIds, primaryWork }) {
  const deliveredWorks = await DeliveredWork.find({ clientId, workId: { $in: deleteWorkIds } }, { _id: 1 });
  logger.debug('Delivered Works to be updated:', deliveredWorks.length);
  if (deliveredWorks.length > 0) {
    const updatedDeliveredWorks = deliveredWorks.map((deliveredWork) => {
      deliveredWork.mergedIntoWorkId = primaryWork._id;
      return deliveredWork;
    });
    await DeliveredWork.bulkWrite(
      updatedDeliveredWorks.map((deliveredWork) => ({
        updateOne: {
          filter: { _id: deliveredWork._id },
          update: { mergedIntoWorkId: deliveredWork.mergedIntoWorkId },
        },
      })),
    );
  }
}

/**
 * Updates ISWC Delivered Works to reference the primary work ID for previously delivered works.
 * @param {Object} params - The parameters for updating ISWC delivered works.
 * @param {string} params.clientId - The ID of the client to filter ISWC delivered works.
 * @param {Array} params.deleteWorkIds - An array of work IDs to be deleted.
 * @param {Object} params.primaryWork - The primary work object to which duplicates are merged.
 * @returns {Promise<void>}
 */
async function updateIswcDeliveredWorks({ clientId, deleteWorkIds, primaryWork }) {
  const iswcDeliveredWorks = await IswcDeliveredWork.find({ clientId, workId: { $in: deleteWorkIds } }, { _id: 1 });
  logger.debug('ISWC Delivered Works to be updated:', iswcDeliveredWorks.length);
  if (iswcDeliveredWorks.length > 0) {
    const updatedIswcDeliveredWorks = iswcDeliveredWorks.map((iswcDeliveredWork) => {
      iswcDeliveredWork.mergedIntoWorkId = primaryWork._id;
      return iswcDeliveredWork;
    });
    await IswcDeliveredWork.bulkWrite(
      updatedIswcDeliveredWorks.map((iswcDeliveredWork) => ({
        updateOne: {
          filter: { _id: iswcDeliveredWork._id },
          update: { mergedIntoWorkId: iswcDeliveredWork.mergedIntoWorkId },
        },
      })),
    );
  }
}

/**
 * Updates CWR deliveries to replace deleted work IDs with the primary work ID.
 * @param {Object} params - The parameters for updating CWR deliveries.
 * @param {string} params.clientId - The ID of the client to filter CWR deliveries.
 * @param {Array} params.deleteWorkIds - An array of work IDs to be deleted.
 * @param {Object} params.primaryWork - The primary work object to which duplicates are merged.
 * @returns {Promise<void>}
 */
async function updateCwrDeliveries({ clientId, deleteWorkIds, primaryWork }) {
  const cwrDeliveries = await CwrDelivery.find(
    {
      clientId,
      'filter.workIds': { $in: deleteWorkIds },
    },
    { _id: 1, filter: 1 },
  );
  logger.debug('CWR Deliveries to be updated:', cwrDeliveries.length);
  if (cwrDeliveries.length > 0) {
    const updatedCwrDeliveries = cwrDeliveries.map((cwrDelivery) => {
      const updatedWorkIds = cwrDelivery.filter.workIds.map((id) => (deleteWorkIds.includes(id) ? primaryWork._id.toString() : id));
      cwrDelivery.filter.workIds = [...new Set(updatedWorkIds)];
      return cwrDelivery;
    });
    await CwrDelivery.bulkWrite(
      updatedCwrDeliveries.map((cwrDelivery) => ({
        updateOne: {
          filter: { _id: cwrDelivery._id },
          update: { 'filter.workIds': cwrDelivery.filter.workIds },
        },
      })),
    );
  }
}

/**
 * Updates the sales input table in BigQuery to replace deleted work IDs with the primary work ID.
 * @param {Object} params - The parameters for updating the sales input table.
 * @param {string} params.clientId - The ID of the client to filter works.
 * @param {Array} params.deleteWorkIds - An array of work IDs to be deleted.
 * @param {Object} params.primaryWork - The primary work object to which duplicates are merged.
 * @returns {Promise<void>}
 */
async function updateSalesInputTable({ clientId, deleteWorkIds, primaryWork }) {
  const client = await Client.findById(clientId);
  const bq = new BigQuery(databaseUtils.getBigQueryOpts(client));

  const salesInputCount = await getTableAffectedWorksCount(bq, bq.inputTable, deleteWorkIds);
  logger.debug('Sales input lines to be updated:', salesInputCount);
  if (salesInputCount > 0) {
    const salesInputQuery = {
      query: `UPDATE \`${bq.datasetName}.${bq.inputTable}\` SET workId = @primaryWorkId WHERE workId IN UNNEST(@workIds)`,
      params: { primaryWorkId: primaryWork._id.toString(), workIds: deleteWorkIds },
    };
    const labels = {
      job_type: 'merge_catalogue',
      client_id: clientId,
      document_id: primaryWork._id.toString(),
    };
    await bq.queryJobPromise({ query: salesInputQuery, labels });
  }
}

/**
 * Gets the count of works affected in a specific BigQuery table based on work IDs.
 * @param {BigQuery} bigQuery - The BigQuery client instance.
 * @param {string} tableName - The name of the BigQuery table to query.
 * @param {Array} workIds - An array of work IDs to filter the query.
 * @returns {Promise<number>} The count of affected works in the specified table.
 */
async function getTableAffectedWorksCount(bigQuery, tableName, workIds) {
  const [{ count }] = await new Promise((resolve, reject) => {
    bigQuery.getCount(tableName, 'count', { workId: workIds }, (err, size) => {
      if (err) reject(err);
      else resolve(size);
    });
  });
  return count ?? 0;
}

/**
 * Logs the merged works into the RemovedDuplicateWork collection for delivery history.
 * @param {Object} params - The parameters for logging merged works.
 * @param {string} params.clientId - The ID of the client to filter works.
 * @param {string} params.userId - The ID of the user performing the merge.
 * @param {Array} params.deleteWorkIds - An array of work IDs that were deleted.
 * @param {string} params.primaryWorkId - The ID of the primary work into which duplicates were merged.
 * @returns {Promise<void>}
 */
async function logMergedWorks({ clientId, userId, deleteWorkIds, primaryWorkId }) {
  // Fetch Works so data at this point can be saved
  const worksToDelete = await Work.find({ clientId, _id: { $in: deleteWorkIds } });

  // Save copies of the Works to be deleted for Delivery history
  const removedDuplicateWorks = deleteWorkIds.map((workId) => ({
    clientId,
    mergedByUserId: userId,
    mergedIntoWorkId: primaryWorkId,
    mergedWithWorkIds: deleteWorkIds.filter((id) => id !== workId).map((id) => new mongoose.Types.ObjectId(id)),
    originalWorkId: new mongoose.Types.ObjectId(workId),
    originalWork: worksToDelete.find((work) => work._id.toString() === workId.toString()).toObject(),
  }));
  await RemovedDuplicateWork.insertMany(removedDuplicateWorks);
}

module.exports = {
  getDuplicateWorks,
  getMergeOverview,
  getUniqueFieldValues,
  mergeWorks,
};
