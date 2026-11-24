const _ = require('lodash');
const { eachLimit } = require('async');
const { logger, TaskHelpers } = require('@curveroyaltysystems/platform-shared-utils');
const { applyDateFilters } = require('../../libs/dateFilters');

const Work = require('../../models/work');
const UnmappedWork = require('../../models/unmappedWork');
const User = require('../../models/user');
const Client = require('../../models/client');
const Task = require('../../models/task');

const UnmappedWorkController = this;

/**
 * Aggregates all unmappedWorks associated with client
 *
 * @param {Object} paginationParams - Params used to page the results (page, limit)
 * @param {Object} req - Contains vairous params to filter on works
 * @returns {Object} - Returns aggregated works and page meta data
 */
UnmappedWorkController.getAggregateUnmappedWorks = async ({ paginationParams, req }) => {
  // Params
  const { page, limit } = paginationParams;
  const { curveUser, query } = req;
  const orderDir = query.orderDir === 'asc' ? -1 : 1;

  const filter = UnmappedWorkController.paramsToFilterField(query, curveUser);
  if (!Object.keys(filter)?.length) throw new Error('Forbidden');

  // Aggregate Query
  const aggregation = [
    { $match: filter },
    { $group:
      // Keeping each doc unique via identifier and source
      // { _id: { identifier: '$identifier', source: '$source' },
      { _id: { identifier: '$identifier', iswc: '$iswc', tunecode: '$tunecode', songcode: '$songcode', source: '$source', title: '$title' },
        // There could be instances where the title and or part is different, we want to just display the first doc fields
        title: { $first: '$title' },
        ids: { $push: '$_id' },
        iswc: { $push: '$iswc' },
        tunecode: { $push: '$tunecode' },
        songcode: { $push: '$songcode' },
        party1: { $push: '$party1' },
        party2: { $push: '$party2' },
        party3: { $push: '$party3' },
        workId: { $push: '$workId' },
        netValue: { $sum: '$netAmount' },
        salesFileId: { $first: '$salesFileId' },
        createdAt: { $first: '$createdAt' },
        updatedAt: { $first: '$updatedAt' },
      },
    },
    { $sort: { [query.orderBy]: orderDir } },
    {
      $facet: {
        unmappedWorks: [{ $skip: (page - 1 < 0 ? 0 : page - 1) * limit }, { $limit: limit }],
        total: [{ $count: 'count' }],
      },
    },
  ];

  const unmappedWorksAggregation = await UnmappedWork.aggregate(aggregation).catch(logger.error);

  if (!unmappedWorksAggregation || unmappedWorksAggregation?.length === 0) throw new Error('No UnmappedWorks found');

  // Setup Pages
  const total = unmappedWorksAggregation[0]?.total?.[0]?.count || 0;
  const pagination = {
    unmappedWorks: unmappedWorksAggregation[0]?.unmappedWorks || [],
    pages: Math.ceil(total / limit),
    total,
  };

  const formattedDocs = UnmappedWorkController.formatDocs(unmappedWorksAggregation[0].unmappedWorks);

  return { unmappedWorks: formattedDocs, meta: { currentPage: page, totalPages: pagination.pages, total: pagination.total } };
};

/**
 * Updated aggregate work and associated unmappedWorks with new mapping from user;
 *
 * @param {Object} aggregateUnmappedWork - Aggregate Unmapped Work getting updated by user.
 * @param {Array} unmappedWorks - List of associated unmappedWorks that hold the same Identifier and Source as the aggregateUnmappedWork
 * @returns {Object} - Return updated aggregateUnmappedWork with completion status
 */
UnmappedWorkController.updateUnmappedWorks = async ({ aggregateUnmappedWork, unmappedWorks }) => {
  // Check if unmappedWorks are already completed
  const completedUnmappedWorks = unmappedWorks.filter((unmappedWork) => unmappedWork.complete);

  if (completedUnmappedWorks.length > 0) {
    logger.debug('Clearing previous aliases');
    await UnmappedWorkController.clearPreviousAliases({ aggregateUnmappedWork, completedUnmappedWorks });
  }

  logger.debug('Mapping alias to work');
  const updatedAggregateUnmappedWork = await UnmappedWorkController.mapWork({ aggregateUnmappedWork, unmappedWorks });

  return updatedAggregateUnmappedWork;
};

/**
 * Updates work aliases from aggregateUnmappedWork
 *
 * @param {Object} aggregateUnmappedWork - Aggregate Unmapped Work getting updated by user.
 * @param {Array} unmappedWorks - List of associated unmappedWorks that hold the same Identifier and Source as the aggregateUnmappedWork
 * @returns {Object} - Return updated aggregateUnmappedWork with completion status
 */
UnmappedWorkController.mapWork = async ({ aggregateUnmappedWork, unmappedWorks }) => {
  const updatedAggregateUnmappedWork = { ...aggregateUnmappedWork, _id: { ...aggregateUnmappedWork._id } };

  // No need to update works if no workId is present
  if (!aggregateUnmappedWork.workId) {
    // Mark unmappedWorks as incomplete (unmapping)
    logger.debug(`Updating ${unmappedWorks.length} unmappedWork status to false and clearing workId`);
    await eachLimit(unmappedWorks, 5, async (unmappedWork) => {
      unmappedWork.complete = false;
      unmappedWork.workId = aggregateUnmappedWork.workId;
      await unmappedWork.save();
    });
    updatedAggregateUnmappedWork.complete = false; // Setting this to false for UI tick purpose
    return updatedAggregateUnmappedWork;
  }

  // Save the society identifier to the work FIRST — if this throws, unmappedWorks are not
  // yet marked complete, so the identifier will remain visible in the unmapped list.
  logger.debug(`Setting new alias to work: ${aggregateUnmappedWork.workId}`);
  const work = await Work.findById(aggregateUnmappedWork.workId).catch(logger.error);
  if (!work) throw new Error(`Could not find work to update: ${aggregateUnmappedWork.workId}`);

  const update = { society: aggregateUnmappedWork._id.source, identifier: UnmappedWorkController.foundIdentifier(aggregateUnmappedWork) };

  if (Array.isArray(work.societyIdentifiers)) {
    work.societyIdentifiers.push(update);
  } else {
    work.societyIdentifiers = [update];
  }

  await work.save();

  // Only mark unmappedWorks as complete after the work has been saved successfully
  logger.debug(`Updating ${unmappedWorks.length} unmappedWork status to true and setting workId: ${aggregateUnmappedWork.workId}`);
  await eachLimit(unmappedWorks, 5, async (unmappedWork) => {
    unmappedWork.complete = true;
    unmappedWork.workId = aggregateUnmappedWork.workId;
    await unmappedWork.save();
  });

  updatedAggregateUnmappedWork.complete = true;
  return updatedAggregateUnmappedWork;
};

/**
 * If aggregateWork was previously mapped, this function will clear any pre-existing aliases.
 *
 * @param {Object} aggregateUnmappedWork - Aggregate Unmapped Work getting updated by user.
 * @param {Array} completedUnmappedWorks - List of associated unmappedWorks that hold the same Identifier and Source as the aggregateUnmappedWork, with the complete status set to true.
 */
UnmappedWorkController.clearPreviousAliases = async ({ aggregateUnmappedWork, completedUnmappedWorks }) => {
  const workIds = new Set(completedUnmappedWorks.map(({ workId }) => workId).filter(Boolean));
  logger.debug(`Attempting to remove aliases from ${workIds.size} works`);
  // Remove previous aliases from workIds
  await eachLimit(workIds, 5, async (workId) => {
    const work = await Work.findById(workId).catch(logger.error);

    if (!work) { logger.error(`Could not find workId: ${workId}`); return; }
    if (!Array.isArray(work.societyIdentifiers)) { logger.error(`No societyIdentifiers to update: ${work._id}`); return; }

    const aggregatedIdentifier = UnmappedWorkController.foundIdentifier(aggregateUnmappedWork);

    const filteredSocietyIdentifiers = work.societyIdentifiers.filter((societyIdentifier) => {
      const aggregateUnmappedWorkID = `${aggregateUnmappedWork._id.source}${aggregatedIdentifier}`;
      const societyIdentifierID = `${societyIdentifier.society}${societyIdentifier.identifier}`;

      if (aggregateUnmappedWorkID !== societyIdentifierID) { return societyIdentifier; }
    });

    work.societyIdentifiers = filteredSocietyIdentifiers;
    await work.save();

    logger.debug(`Updated Work Society Identifiers: ${work._id}`);
  });
};

/**
 * Updates Work Society Identifier's with UnmappedWorks from a sales file
 *
 * @param {Object} aliases - Dictionary Object of UnmappedWorks with workId as index.
 * @param {Object} curveUser - Curve User object from request
 */
UnmappedWorkController.addBulkAliases = async ({ aliases, curveUser }) => {
  // Get work IDs from passed aliases
  const workIds = Object.keys(aliases);
  // Find UnmappedWorks
  const works = await Work.find({ clientId: curveUser.clientId, _id: { $in: workIds } }).catch(logger.error);
  if (works?.length === 0) throw new Error('Could not find Ummapped Works');

  await eachLimit(works, 10, async (work) => {
    if (!aliases[work._id.toString()]) {
      logger.debug(`No Aliases associated with ${work._id}`);
      return;
    }

    const societyIdentifiers = [];
    await eachLimit(aliases[work._id.toString()], 10, async (alias) => {
      const foundUnmappedWork = await UnmappedWork.findById(alias._id);
      societyIdentifiers.push({ society: alias.source, identifier: UnmappedWorkController.foundIdentifier(foundUnmappedWork) });

      const update = { workId: work._id.toString(), complete: true };
      await UnmappedWork.findByIdAndUpdate(alias._id, update);
    });

    work.societyIdentifiers = Array.isArray(work.societyIdentifiers) ? work.societyIdentifiers.concat(societyIdentifiers) : societyIdentifiers;
    work.lastModifiedBy = curveUser.id;
    await work.save().catch(logger.error);
  });
};

/**
 * Creates a suitable identifier based on the data from the aggregateUnmappedWork
 *
 * @param {Object} unmappedWork
 * @returns {String} identifier
 */
UnmappedWorkController.foundIdentifier = (unmappedWork) => {
  if (unmappedWork._id.identifier) {
    return unmappedWork._id.identifier;
  } if (unmappedWork.identifier) {
    return unmappedWork.identifier;
  } if (unmappedWork.tunecode) {
    return unmappedWork.tunecode;
  } if (unmappedWork.iswc) {
    return unmappedWork.iswc;
  } if (unmappedWork.songcode) {
    return unmappedWork.songcode;
  } if (unmappedWork.title) {
    let string = unmappedWork.title;
    if (unmappedWork.party1) { string += ` - ${unmappedWork.party1}`; }
    if (unmappedWork.party2) { string += ` - ${unmappedWork.party2}`; }
    if (unmappedWork.party3) { string += ` - ${unmappedWork.party3}`; }
    return string.replace(/[^0-9a-zA-Z- (),_'"]/gi, '');
  }
};

/**
 * Formats aggregate docs by removing the array from non-grouped fields
 *
 * @param {Object} aggregateUnmappedWorks - Raw Aggregate unmappedWorks
 * @returns {Array} - Returns formatted aggregate docs, with all fields in appropriate data structure
 */
UnmappedWorkController.formatDocs = (aggregateUnmappedWorks) => {
  const formattedDocs = [];

  aggregateUnmappedWorks.forEach((aggregateUnmappedWork) => {
    const iswcs = aggregateUnmappedWork.iswc.filter(Boolean);
    const tunecodes = aggregateUnmappedWork.tunecode.filter(Boolean);
    const songcodes = aggregateUnmappedWork.songcode.filter(Boolean);
    const party1s = aggregateUnmappedWork.party1.filter(Boolean);
    const party2s = aggregateUnmappedWork.party2.filter(Boolean);
    const party3s = aggregateUnmappedWork.party3.filter(Boolean);
    const workIds = aggregateUnmappedWork.workId.filter(Boolean);

    aggregateUnmappedWork.iswc = iswcs[0];
    aggregateUnmappedWork.tunecode = tunecodes[0];
    aggregateUnmappedWork.songcode = songcodes[0];
    aggregateUnmappedWork.party1 = party1s[0];
    aggregateUnmappedWork.party2 = party2s[0];
    aggregateUnmappedWork.party3 = party3s[0];
    aggregateUnmappedWork.workId = workIds[0];
    aggregateUnmappedWork.netValue = parseFloat(aggregateUnmappedWork.netValue.toFixed(2));
    formattedDocs.push(aggregateUnmappedWork);
  });

  return formattedDocs;
};

/**
 * Creates a mongo filter from user request
 *
 * @param {Object} inputParams
 * @returns {Object} Mongo Filter
 */
UnmappedWorkController.paramsToFilterField = (inputParams, user) => {
  const params = {};
  if (user.clientId) { params.clientId = user.clientId; }
  if (inputParams.salesFileIds) { params.salesFileId = { $in: inputParams.salesFileIds }; }
  if (inputParams.source) { params.source = inputParams.source; }
  if (inputParams.parties) { params.$or = [{ party1: inputParams.parties }, { party2: inputParams.parties }, { party3: inputParams.parties }, { party4: inputParams.parties }, { party5: inputParams.parties }]; }
  if (String(inputParams.complete) === 'true') {
    params.complete = true;
  } else {
    params.complete = { $ne: true };
  }
  if (inputParams.text) {
    const regex = new RegExp(_.escapeRegExp(inputParams.text), 'i');
    // eslint-disable-next-line max-len
    params.$or = [{ title: { $regex: regex } }, { tunecode: { $regex: regex } }, { iswc: { $regex: regex } }, { identifier: { $regex: regex } }, { party1: { $regex: regex } }, { party2: { $regex: regex } }, { party3: { $regex: regex } }, { party4: { $regex: regex } }, { party5: { $regex: regex } }];
  }
  const paramsWithDateFilters = applyDateFilters(inputParams, params);
  return paramsWithDateFilters;
};

UnmappedWorkController.exportUnmappedWorks = async ({ curveUser, body }) => {
  const user = await User.findById(curveUser.id, 'email').lean().exec();
  if (!user) throw new Error(`Could not find user with ${curveUser.id}`);
  const client = await Client.findById(curveUser.clientId, '_id name').lean().exec();
  if (!client) throw new Error(`Could not find client with ${curveUser.clientId}`);
  await TaskHelpers.createTaskAndSendMessage(Task, {
    name: 'Export Unmapped CSV',
    clientId: client._id,
    clientName: client.name,
    email: user.email,
    value: {
      type: 'work',
      clientId: curveUser.clientId,
      ids: body?.workIds,
      filter: !body?.workIds?.length && UnmappedWorkController.paramsToFilterField({ ...body.filter }, curveUser),
    },
  });
};

module.exports = UnmappedWorkController;
