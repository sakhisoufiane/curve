const { ObjectId } = require('mongodb');
const _ = require('lodash');

const getDuplicates = async (type, clientId, queryParams) => {
  const Composer = require('../../models/composer');
  const Publisher = require('../../models/publisher');
  const Work = require('../../models/work');

  const catalogueModel = type === 'composer' ? Composer : Publisher;

  const { page = 1, limit = 25, orderBy = 'potentialDuplicatesCount', orderDir = 'desc', search } = queryParams;
  const sortDirection = orderDir === 'desc' ? -1 : 1;
  const params = {};

  if (search) {
    const regex = new RegExp(_.escapeRegExp(search), 'i');
    const orConditions = [
      { name: { $regex: regex } },
      { interestedPartyId: { $regex: regex } },
      { caeWithoutLeadingZeros: { $regex: regex } },
      { cae: { $regex: regex } },
    ];

    if (search.length === 24 && ObjectId.isValid(search)) {
      orConditions.push({ _id: new ObjectId(search) });
    }

    // Find documents matching by cae or caeWithoutLeadingZeros
    const matchingDocs = await catalogueModel
      .find({ clientId, $or: orConditions })
      .select('_id');

    if (matchingDocs?.length) {
      const matchingIds = matchingDocs.map((doc) => doc._id);
      const field = `potentialDuplicates.${type === 'composer' ? 'composerId' : 'publisherId'}`;
      orConditions.push({ [field]: { $in: matchingIds } });
    }

    params.$or = orConditions;
  }

  const sort = { [orderBy]: sortDirection };
  if (orderBy !== 'name') sort.name = 1;

  // Get data where there's duplicates flagged
  const catalogueData = await catalogueModel.paginate({
    clientId,
    potentialDuplicatesCount: { $exists: true, $gt: 0 },
    ...params,
  }, {
    page,
    limit,
    lean: true,
    sort,
    select: '_id name cae clientId potentialDuplicates potentialDuplicatesCount mainPro mainProIdentifier',
  });

  if (!catalogueData.totalDocs) {
    return {
      meta: { total: 0, currentPage: page, totalPages: 0 },
      duplicates: [],
    };
  }

  const usedIdsField = type === 'composer' ? 'usedComposerIds' : 'usedPublisherIds';
  const idField = [`${type}Id`];

  // Collect all of the composerIds within the duplicates array
  const catalogueIds = new Set();
  catalogueData.docs.forEach((data) => data.potentialDuplicates.forEach((dup) => catalogueIds.add(dup[idField].toString())));
  const dataIdArray = Array.from(catalogueIds);

  // Get the composer data and works data
  const duplicateCatalogueData = await catalogueModel
    .find({ _id: { $in: dataIdArray }, clientId })
    .select({
      _id: 1,
      name: 1,
      cae: 1,
      mainPro: 1,
      mainProIdentifier: 1,
    })
    .lean();
  const works = await Work
    .find({ clientId, [usedIdsField]: { $in: dataIdArray } })
    .select(`_id ${usedIdsField}`)
    .lean();

  // Build object to store how many works are associated with the composerId
  const worksCatalogueCount = {};
  works.forEach((work) => {
    work[usedIdsField]?.forEach((catalogueId) => {
      if (!catalogueIds.has(catalogueId)) return;
      worksCatalogueCount[catalogueId] = (worksCatalogueCount[catalogueId] || 0) + 1;
    });
  });

  // Then just build out the data to be returned
  const processedData = catalogueData.docs.map((data) => {
    const potentialDuplicates = data.potentialDuplicates.map((pd) => {
      const catalogueFound = duplicateCatalogueData.find((dc) => dc._id.toString() === pd[idField].toString());
      if (!catalogueFound) return null;

      return {
        [idField]: pd[idField],
        name: catalogueFound.name || null,
        cae: catalogueFound.cae || null,
        score: pd.score,
        worksCount: worksCatalogueCount[pd[idField].toString()] || 0,
        mainPro: catalogueFound?.mainPro ?? null,
        mainProIdentifier: catalogueFound?.mainProIdentifier ?? null,
      };
    }).filter((pd) => pd);

    data.potentialDuplicates = potentialDuplicates.sort((a, b) => b.score - a.score);

    return data;
  });

  return {
    meta: {
      total: catalogueData.totalDocs,
      currentPage: catalogueData.page,
      totalPages: catalogueData.pages,
    },
    duplicates: processedData,
  };
};

module.exports = getDuplicates;
