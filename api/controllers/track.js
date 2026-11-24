/* eslint-disable no-unused-expressions */
/* eslint-disable no-await-in-loop */
const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const { UserAccess, Utils, Page, Projection } = require('@curveroyaltysystems/curve-shared-logic');
const async = require('async');
const _ = require('lodash');
const { ObjectId } = require('mongodb');
const Track = require('../models/track');
const UnmappedTrack = require('../models/unmappedTrack');
const Payee = require('../models/payee');
const Contract = require('../models/contract');
const { getPayeesFromReturnsRights } = require('../libs/payees/payees');
const { applyDateFilters } = require('../libs/dateFilters');

const TrackController = this;

TrackController.searchTracks = async function ({ query, curveUser, usePagination = true, selectFields = null }) {
  assertSearchConstraints(query);

  if (shouldSearchByPayeeIds(query)) {
    await addPayeeContractsToQuery(query, curveUser.clientId);
  }

  // In the front-end the default sort value is title
  const orderBy = query.orderBy || 'title';

  if (query?.text) {
    // Create contractIds from companyIds and add to contractIds
    query.contractIds = await Utils.combineContractAndCompanyIds({ Contract, inputParams: query, clientId: curveUser.clientId });
    // Run using Atlas Search
    logger.debug('Running track query using Atlas Search');

    const searchParams = {
      searchIndex: 'trackSearch',
      page: usePagination ? Page.valueOrDefault(query.page, 1) : 1,
      limit: usePagination ? Page.valueOrDefault(query.limit, 25) : 1000000,
      sortBy: orderBy,
      sortOrder: query.orderDir,
      project: selectFields || {
        ...(query.includePayees === 'true' && { salesReturnsRights: true }),
        ...Projection.getFields('track', 'indexPage'),
        payeesCount: { $size: '$salesReturnsRights' },
      },
      filterItems: [
        { name: 'catalogueGroups', field: 'catalogueGroups', type: 'text' },
        { name: 'contractIds', field: 'salesReturnsRights.contractId', type: 'text' },
        { name: 'createdAfter', field: 'createdAt', type: 'after' },
        { name: 'createdBefore', field: 'createdAt', type: 'before' },
        { name: 'participation', field: 'totalParticipation', type: 'equalLessGreaterThan' },
        { name: 'ids', field: '_id', type: 'objectIds' },
        { name: 'valid', field: 'valid', type: 'boolean' },
        { name: 'label', field: 'label', type: 'wildcard' },
        { name: 'artist', field: 'artist', type: 'wildcard' },
        { name: 'mechanicalContractIds', field: 'mechanicalContractIds', type: 'text' },
        { name: 'tags', field: 'tags', type: 'text' },
        { name: 'excludeTags', field: 'tags', type: 'excludeText' },
        { name: 'noSplits', field: 'salesReturnsRights', type: 'emptyList' },
      ],
      payeeFilterFields: ['salesReturnsRights.contractId'],
      textSearchFields: ['title', 'version', 'artist', 'isrc', 'label', 'aliases', 'foreignId', 'projectId'],
    };
    const result = await Utils.atlasSearch({ Payee, Model: Track, query, user: curveUser, params: searchParams });
    result.currentPage = searchParams.page;

    if (query.includePayees === 'true' && usePagination) {
      await addPayees(result.docs);
    }

    return result;
  }

  // Run using usual filters
  logger.debug('Running track query using usual filters');

  const sortParams = Page.sortOrDefault(orderBy, query.orderDir);

  const selectParams = selectFields || {
    ...(query.includePayees === 'true' && { salesReturnsRights: true }),
    ...Projection.getFields('track', 'indexPage'),
    payeesCount: { $size: '$salesReturnsRights' },
  };

  const filters = await this.paramsToFilterField(query, curveUser);

  if (usePagination) {
    const params = {
      sort: sortParams,
      select: selectParams,
      page: Page.valueOrDefault(query.page, 1),
      limit: Page.valueOrDefault(query.limit, 25),
    };

    const result = await Track.paginate(filters, params);
    result.currentPage = params.page;
    result.total = result.totalDocs;

    if (query.includePayees === 'true') {
      await addPayees(result.docs);
    }

    return result;
  }

  const docs = await Track.find(filters).select(selectParams).sort(sortParams);

  return {
    docs,
    total: docs.length,
  };
};

TrackController.createManyTracks = async function (req) {
  const { curveUser, body } = req;
  const { clientId, id: createdBy, id: lastModifiedBy } = req.curveUser;
  const { tracks } = body;
  const created = [];
  const failed = [];

  if (!Array.isArray(tracks)) {
    return { status: 500, response: { message: 'Unfortunately we couldn\'t complete your request. Please try again, or contact the support team.' } };
  }
  await async.eachSeries(tracks, async (track) => {
    // Instantiate the new track
    const newTrack = new Track({
      title: track.title,
      artist: track.artist,
      isrc: track.isrc,
      clientId,
      createdBy,
      lastModifiedBy,
    });
    if (!await UserAccess.isUserForbidden({ Payee, user: curveUser, operation: 'write', type: 'catalogue', document: newTrack, clientOnly: true })) {
      try {
        await newTrack.save();
        created.push(track.index);

        if (track.unmappedTrackId) {
          const unmappedTrack = await UnmappedTrack.findById(track.unmappedTrackId).catch(logger.error);
          if (unmappedTrack) {
            unmappedTrack.trackId = newTrack._id.toString();
            unmappedTrack.complete = true;
            await unmappedTrack.save().catch(logger.error);
          }
        }
      } catch (saveErr) {
        failed.push(track.index);
      }
    } else {
      failed.push(track.index);
    }
  });
  const response = { created, failed };
  return { status: 200, response };
};

TrackController.addBulkAliases = async function (req) {
  const { curveUser, body } = req;
  const failed = [];
  const succeeded = [];

  if (!body.aliases) { return { status: 400, response: { message: 'Aliases are required to be passed' } }; }

  // Get track IDs from passed aliases
  const trackIds = Object.keys(body.aliases).map((id) => new ObjectId(id));
  // Find tracks
  const foundTracks = await Track.find({ clientId: curveUser.clientId, _id: { $in: trackIds } });

  if (!foundTracks) {
    return { status: 400, response: { message: `Could not find Track(s) with ${trackIds}` } };
  }

  await async.eachSeries(foundTracks, async (track) => {
    // When passed an array, concat it with the current values
    if (body.aliases[track._id.toString()] && Array.isArray(body.aliases[track._id.toString()])) {
      track.aliases = track.aliases.concat(body.aliases[track._id.toString()]);
    } else if (body.aliases[track._id.toString()]) {
      // When just a string, add it to the aliases
      track.aliases.push(body.aliases[track._id.toString()]);
      // Update last modified by
      track.lastModifiedBy = curveUser.id;
    }
    if (!await UserAccess.isUserForbidden({ Payee, user: curveUser, operation: 'write', type: 'catalogue', document: track, clientOnly: true })) {
      // Save track
      try {
        const savedTrack = await track.save();
        succeeded.push(savedTrack._id);
      } catch (saveErr) {
        logger.error(saveErr);
        failed.push(track._id);
      }
    }
  });
  const response = { succeeded, failed };

  return { status: 200, response };
};

TrackController.paramsToFilterField = async (inputParams, user) => {
  let params = {};
  if (user.payeeId && user.contractIds && user.contractIds.length > 0) {
    params['salesReturnsRights.contractId'] = { $in: user.contractIds };
  } else if (user.payeeId) {
    params['salesReturnsRights.contractId'] = { $in: [] };
  } else if (user.clientId) {
    params = { clientId: user.clientId };
  }
  if (inputParams.ids) {
    inputParams.ids = inputParams.ids.map((id) => new ObjectId(id));
    params._id = { $in: inputParams.ids };
  }
  if (typeof inputParams.tags === 'string') {
    params.tags = { $in: [inputParams.tags] };
  }
  if (typeof inputParams.excludeTags === 'string') {
    params.tags = { $nin: [inputParams.excludeTags] };
  }
  // Regex
  if (inputParams && inputParams.text) {
    const regex = new RegExp(_.escapeRegExp(inputParams.text), 'i');
    params.$or = [
      { title: { $regex: regex } },
      { version: { $regex: regex } },
      { artist: { $regex: regex } },
      { isrc: { $regex: regex } },
      { label: { $regex: regex } },
      { aliases: { $regex: regex } },
      { foreignId: { $regex: regex } },
      { projectId: { $regex: regex } },
    ];
    if (inputParams.text.length === 24 && ObjectId.isValid(inputParams.text)) {
      params.$or.push({ _id: inputParams.text });
    }
  }
  // Create contractIds from companyIds and add to contractIds
  inputParams.contractIds = await Utils.combineContractAndCompanyIds({ Contract, inputParams, clientId: user.clientId });
  if (inputParams.catalogueGroups?.length > 0) { params.catalogueGroups = { $in: inputParams.catalogueGroups }; }
  if (inputParams.contractIds?.length > 0) { params['salesReturnsRights.contractId'] = { $in: inputParams.contractIds }; }
  if (inputParams.mechanicalContractIds?.length > 0) { params.mechanicalContractIds = { $in: inputParams.mechanicalContractIds }; }
  params = applyDateFilters(inputParams, params);
  if (inputParams.valid === 'true' || inputParams.valid) { params.valid = true; }
  if (inputParams.valid === 'false' || inputParams.valid === false) { params.valid = false; }
  if (inputParams.label) {
    const regex = new RegExp(_.escapeRegExp(inputParams.label), 'i');
    params.label = { $regex: regex };
  }
  if (inputParams.artist) {
    const regex = new RegExp(_.escapeRegExp(inputParams.artist), 'i');
    params.artist = { $regex: regex };
  }

  // @tom: I can not see this being used anywhere. Seems to be used for Costs and SalesFile only. If it is used for tracks I will need to add to Atlas Search.
  if (inputParams.notInclude) {
    params._id = {
      $nin: inputParams.notInclude.map((val) => new ObjectId(val)),
    };
  }

  // Filtering by empty or existing salesReturnsRights also means track has/does not have splits assigned
  if (inputParams.noSplits === 'true') {
    params['salesReturnsRights.0'] = { $exists: false };
  } else if (inputParams.noSplits === 'false') {
    params['salesReturnsRights.0'] = { $exists: true };
  }

  params = Utils.paramsToFilterParticipation(inputParams, params);
  return params;
};

TrackController.importSeperateTracksFromReleases = async ({ releases }) => {
  const tracks = releases.map((release, index) => ({
    line_index: index,
    releaseId: release._id,
    releaseCatNo: release.catNo,
    releaseBarcode: release.barcode,
    releaseDistributionChannel: release.distributionChannel,
    _id: release.track_id,
    title: release.track_title,
    version: release.track_version,
    artist: release.track_artist,
    foreignId: release.track_foreignId,
    projectId: release.track_projectId,
    isrc: release.track_isrc,
    label: release.track_label,
    pLine: release.track_pLine,
    duration: release.track_duration,
    mechanicalCalculationBasis: release.track_mechanicalCalculationBasis,
    statutoryRate: release.track_statutoryRate,
    canadianStatutoryRate: release.track_canadianStatutoryRate,
    reportMechanicals: release.track_reportMechanicals,
    catalogueGroups: release.track_catalogueGroups,
    defaultReleaseDistributionChannel: release.track_defaultReleaseDistributionChannel,
    defaultReleaseCatNo: release.track_defaultReleaseCatNo,
    aliases: release.track_aliases,
    salesReturnsRightsContractName: release.track_salesReturnsRightsContractName,
    salesReturnsRightsPercentage: release.track_salesReturnsRightsPercentage,
    costsRightsContractName: release.track_costsRightsContractName,
    costsRightsPercentage: release.track_costsRightsPercentage,
  }));

  return tracks;
};

const addPayees = async (tracks) => {
  if (!tracks || tracks.length === 0) {
    return;
  }

  const isMongooseDoc = tracks[0] instanceof Track;

  const payeeData = await async.mapLimit(
    tracks,
    10,
    async (track) => getPayeesFromReturnsRights(track.salesReturnsRights),
  );

  tracks.forEach((track, idx) => {
    if (isMongooseDoc) {
      track.set('payees', payeeData[idx], { strict: false });
      track.set('salesReturnsRights', undefined, { strict: false });
    } else {
      // Plain object from Atlas Search - directly assign properties
      track.payees = payeeData[idx];
      delete track.salesReturnsRights;
    }
  });
};

const assertSearchConstraints = (query) => {
  const payeeIds = normalizeArrayParam(query.payeeIds);
  const companyIds = normalizeArrayParam(query.companyIds);

  if (payeeIds.length > 0 && companyIds.length > 0) {
    throw new Error('Filtering by payeeIds and companyIds is mutually exclusive. Please provide only one.');
  }
};

const addPayeeContractsToQuery = async (query, clientId) => {
  logger.info('Adding payee contract ids to query.');
  const contractIds = await getContractIdsFromPayeeIds({
    clientId,
    payeeIds: query.payeeIds,
  });

  if (contractIds.length === 0) {
    logger.info(`No contracts found for payeeIds: ${query.payeeIds}`);
  }

  delete query.payeeIds;

  query.contractIds = query.contractIds
    ? [...new Set([...normalizeArrayParam(query.contractIds), ...contractIds])]
    : contractIds;
};

const getContractIdsFromPayeeIds = async ({ clientId, payeeIds }) => {
  try {
    const contracts = await Contract.find({
      clientId,
      'payees.payeeId': { $in: payeeIds },
    }, { _id: 1 });

    return contracts.map((contract) => contract._id.toString());
  } catch (error) {
    throw new Error(`Error retrieving contracts for payees: ${error.message}`);
  }
};

const shouldSearchByPayeeIds = (query) => normalizeArrayParam(query.payeeIds).length > 0;

function normalizeArrayParam(value) {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

module.exports = TrackController;
