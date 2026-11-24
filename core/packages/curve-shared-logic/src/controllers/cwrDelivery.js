/* eslint-disable no-continue */
/* eslint-disable no-param-reassign */
const { ObjectId } = require('mongodb');
const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const { isValidObjectId } = require('mongoose');

const { isUserForbidden } = require('../libs/userAccess');
const CwrUtils = require('../libs/cwr/utils');
const territoryHelper = require('../libs/territoryHelper');
const IpChainUtils = require('../libs/cwr/ipChain');
const DeliveredWorkController = require('./deliveredWork');

const CwrDeliveryController = this;

const paramsToFilterField = (inputParams, user) => {
  const params = {};
  if (user.clientId) {
    params.clientId = user.clientId;
  }
  if (inputParams.status) {
    params.status = inputParams.status;
  }
  if (inputParams.filterType) {
    params.filterType = inputParams.filterType;
  }
  return params;
};

CwrDeliveryController.updateWorkIds = async ({ Payee, id, workIds, curveUser, CwrDelivery }) => {
  const foundCwrDelivery = await CwrDelivery.findById(id).catch((err) => {
    logger.error(err);
    return { status: 500, data: { message: 'Internal error, please try again' } };
  });
  if (!foundCwrDelivery) {
    return { status: 404, data: { message: `Could not find Delivery with ID ${id}` } };
  }

  if (
    await isUserForbidden({
      Payee,
      user: curveUser,
      operation: 'write',
      type: 'catalogue',
      document: foundCwrDelivery,
      clientOnly: true,
    })
  )
    throw Error('Forbidden');

  let updateWorkIds = workIds;
  if (foundCwrDelivery?.filter?.workIds?.length > 0) {
    const mergedIds = foundCwrDelivery.filter.workIds
      .concat(workIds) // concatenate the arrays
      .filter((value, index, self) => self.indexOf(value) === index) // remove duplicates
      .reduce((acc, currentId) => [...acc, currentId], []);
    updateWorkIds = mergedIds;
  }
  const cwrDelivery = await CwrDelivery.findByIdAndUpdate(id, { $set: { 'filter.workIds': updateWorkIds } }).catch(
    (err) => {
      logger.error(err);
      return { status: 500, data: { message: 'Internal error, please try again' } };
    }
  );
  return { status: 200, data: { cwrDelivery } };
};

CwrDeliveryController.getSpecificDeliveries = async ({ req, CwrDelivery }) => {
  let specificDeliveries = [];
  specificDeliveries = await CwrDelivery.find(paramsToFilterField(req.query, req.curveUser));
  return { specificDeliveries };
};

/**
 * Analyses Delivery Partner territory and returns an array of ISO codes
 *
 * @param {Object} params.deliveryPartner - Delivery Partner from requesting Delivery containing { _id, territory };
 * @returns {Array} - Array of ISO codes associated with Delivery Partner territory
 */
CwrDeliveryController.getPartnerTerritories = async ({ DeliveryPartner, TerritoryGroup, deliveryPartnerId }) => {
  let partnerTerritories = [];
  const deliveryPartner = await DeliveryPartner.findById(deliveryPartnerId);
  if (deliveryPartner) {
    partnerTerritories = Array.isArray(deliveryPartner.territory)
      ? deliveryPartner.territory
      : [deliveryPartner.territory];
    if (ObjectId.isValid(deliveryPartner.territory)) {
      const territoryGroup = await TerritoryGroup.findById(deliveryPartner.territory, 'territories').catch(
        logger.error
      );
      partnerTerritories = territoryGroup?.territories?.length ? territoryGroup.territories : [];
    }

    if (deliveryPartner.territory === 'Americas') {
      partnerTerritories = territoryHelper.americas;
    }
    if (deliveryPartner.territory === 'Europe') {
      partnerTerritories = territoryHelper.europe;
    }
    if (deliveryPartner.territory === 'Asia') {
      partnerTerritories = territoryHelper.asia;
    }
    if (deliveryPartner.territory === 'Oceania') {
      partnerTerritories = territoryHelper.oceania;
    }
    if (deliveryPartner.territory === 'Africa') {
      partnerTerritories = territoryHelper.africa;
    }
    if (deliveryPartner.territory === 'WW') {
      partnerTerritories = territoryHelper.allTerritories;
    }
  }
  return partnerTerritories;
};

/**
 * Get total number of works that are not included in a delivery due to controlled territories
 *
 * @param {Object} params.clientId - Requesting ClientID
 * @param {Array} params.partnerTerritories - Array of ISO codes associated with Delivery Partner territory
 * @param {Object} params.query - Requesting Query to count for any works not included
 * @returns {Int} - Number of works not included
 */
const getDifference = async ({ Work, clientId, deliveryPartnerTerritories, query }) => {
  const filter = { ...query, clientId, territories: { $nin: deliveryPartnerTerritories }, approvalStatus: 'Approved' };

  delete filter.orderBy;
  delete filter.orderDir;

  const uncontrolledWorks = await Work.find(filter, { _id: 1, title: 1 });
  return uncontrolledWorks;
};

/**
 * Filters any works that are not controlled under Delivery Partners territory
 *
 * @param {Object} params.cwrDelivery - Requesting CWR Delivery (Mongo Object)
 * @param {Array} params.works - Requesting CWR Delivery (Mongo Object)
 * @param {Object} params.query - Requesting Query to count for any works not included
 */
CwrDeliveryController.getUncontrolledWorks = async ({
  Work,
  DeliveryPartner,
  TerritoryGroup,
  DeliverySchedule,
  CwrDelivery,
  cwrDelivery,
  query,
}) => {
  const deliveryPartner = await DeliveryPartner.findById(cwrDelivery.deliveryPartnerId, 'territory').catch(
    logger.error
  );

  if (!deliveryPartner) {
    logger.info(`${cwrDelivery._id} | No Delivery Partner found with ID: ${cwrDelivery.deliveryPartnerId}`);
    return [];
  }

  // for custom smart filter, don't show any uncontrolled works before user has actually added some params
  if (cwrDelivery.filterType === 'custom' && objectIsEmpty(cwrDelivery.filter)) {
    return [];
  }
  // only get the filter if filter type is not newAndUpdated, as getWorksMatchingFilter returns specific workIds in $in operator and for newAndUpdated, we need a broader view of excluded Works
  if (cwrDelivery.filterType !== 'newAndUpdated') {
    query = await CwrUtils.getWorksMatchingFilter({
      Work,
      DeliverySchedule,
      CwrDelivery,
      DeliveryPartner,
      TerritoryGroup,
      clientId: cwrDelivery.clientId,
      deliveryPartnerId: cwrDelivery.deliveryPartnerId,
      filterType: cwrDelivery.filterType,
      deliveryFilter: cwrDelivery.filter,
      paginationParams: null,
      workIds: null,
      onlyReturnFilter: true,
    });
  }

  let deliveryPartnerTerritories = await CwrDeliveryController.getPartnerTerritories({
    DeliveryPartner,
    TerritoryGroup,
    deliveryPartnerId: deliveryPartner._id,
  });
  deliveryPartnerTerritories = Object.values(deliveryPartnerTerritories);
  const uncontrolledWorks = await getDifference({
    Work,
    clientId: cwrDelivery.clientId,
    deliveryPartnerTerritories,
    query,
  });
  return uncontrolledWorks;
};

const objectIsEmpty = (filter) => {
  delete filter.orderBy;
  delete filter.orderDir;
  for (const field in filter) {
    // eslint-disable-next-line no-prototype-builtins
    if (filter.hasOwnProperty(field)) {
      return false;
    }
  }
  return true;
};

const createAndQuery = (query) => {
  const andQuery = { $and: [] };
  for (const key in query) {
    if (key) {
      const obj = {};
      obj[key] = query[key];
      andQuery.$and.push(obj);
    }
  }
  return andQuery;
};

/**
 * Recursively traverses a rights chain's children array, adding every publisher and
 * composer ID to the provided Sets. Called by collectWorkIds before any DB queries run
 * so that all required IDs can be gathered in a single pass and fetched in bulk.
 *
 * @param {Object[]|null} children - Rights chain child nodes
 * @param {Set<string>} publisherIds - Accumulates publisher IDs found in the tree
 * @param {Set<string>} composerIds - Accumulates composer IDs found in the tree
 */
function collectChildrenIds(children, publisherIds, composerIds) {
  if (!Array.isArray(children)) return;
  for (const child of children) {
    if (!child) continue;
    if (child.publisherId) publisherIds.add(child.publisherId.toString());
    if (child.composerId) composerIds.add(child.composerId.toString());
    collectChildrenIds(child.children, publisherIds, composerIds);
  }
}

/**
 * Scans a batch of works and the delivery partner config to collect every unique ID
 * that will be needed during per-work enrichment (territory groups, publishers, composers,
 * tracks). Both the primary rightsChain and any partnerRightsChains are included so that
 * partner-chain lookups are also covered.
 *
 * Returns Sets so duplicates are deduplicated automatically — a publisher referenced
 * by 500 works in the batch still only produces one DB fetch.
 *
 * @param {Object[]} works - Work documents for the current batch
 * @param {Object|null} deliveryPartner - DeliveryPartner document (may define insertion/extraPartners publishers)
 * @returns {{ territoryGroupIds: Set<string>, publisherIds: Set<string>, composerIds: Set<string>, trackIds: Set<string> }}
 */
function collectWorkIds(works, deliveryPartner) {
  const territoryGroupIds = new Set();
  const publisherIds = new Set();
  const composerIds = new Set();
  const trackIds = new Set();

  for (const work of works) {
    const chains = [
      ...(Array.isArray(work.rightsChain) ? work.rightsChain : []),
      ...(Array.isArray(work.partnerRightsChains)
        ? work.partnerRightsChains.flatMap((pc) => (Array.isArray(pc.rightsChain) ? pc.rightsChain : []))
        : []),
    ];
    for (const chain of chains) {
      if (chain && isValidObjectId(chain.territory)) territoryGroupIds.add(chain.territory.toString());
      collectChildrenIds(chain?.children, publisherIds, composerIds);
    }
    if (Array.isArray(work.trackIds)) {
      for (const id of work.trackIds) {
        if (id) trackIds.add(id.toString());
      }
    }
  }

  if (deliveryPartner?.insertion?.publisherId) {
    publisherIds.add(deliveryPartner.insertion.publisherId.toString());
  }
  if (Array.isArray(deliveryPartner?.extraPartners)) {
    for (const ep of deliveryPartner.extraPartners) {
      if (ep.publisherId) publisherIds.add(ep.publisherId.toString());
    }
  }

  return { territoryGroupIds, publisherIds, composerIds, trackIds };
}

/**
 * Fetches all documents referenced by the collected ID sets in 5 parallel queries,
 * then returns them as Maps keyed by string ID for O(1) lookup during per-work enrichment.
 *
 * This replaces the previous pattern of one DB call per work per referenced document
 * (~30 calls/work). For a 10,000-work batch that was ~300,000 DB round trips per batch;
 * this reduces it to 5 regardless of batch size.
 *
 * .select() projections on Track and Release limit document size — these queries can
 * return thousands of records and only a small subset of fields are used downstream.
 *
 * Releases are sorted by createdAt ascending so the first entry per track in
 * releaseByTrackMap is always the oldest release for that track.
 *
 * @param {Object} params
 * @param {string} params.clientId - Client scope for the Release query
 * @param {Set<string>} params.territoryGroupIds
 * @param {Set<string>} params.publisherIds
 * @param {Set<string>} params.composerIds
 * @param {Set<string>} params.trackIds
 * @param {Object} params.TerritoryGroup - Mongoose model
 * @param {Object} params.Publisher - Mongoose model
 * @param {Object} params.Composer - Mongoose model
 * @param {Object} params.Track - Mongoose model
 * @param {Object} params.Release - Mongoose model
 * @returns {{ territoryGroupMap: Map, publisherMap: Map, composerMap: Map, trackMap: Map, releaseByTrackMap: Map }}
 */
async function batchFetchLookups({
  clientId,
  territoryGroupIds,
  publisherIds,
  composerIds,
  trackIds,
  TerritoryGroup,
  Publisher,
  Composer,
  Track,
  Release,
}) {
  const [territoryGroups, publishers, composers, tracks, releases] = await Promise.all([
    territoryGroupIds.size > 0 && TerritoryGroup
      ? TerritoryGroup.find({ _id: { $in: [...territoryGroupIds] } }).select('territories').lean()
      : [],
    publisherIds.size > 0 && Publisher
      ? Publisher.find({ _id: { $in: [...publisherIds] }, clientId }).lean()
      : [],
    composerIds.size > 0 && Composer
      ? Composer.find({ _id: { $in: [...composerIds] }, clientId }).lean()
      : [],
    trackIds.size > 0 && Track
      ? Track.find({ _id: { $in: [...trackIds] } })
          .select('title version artist isrc duration label')
          .lean()
      : [],
    trackIds.size > 0 && Release
      ? Release.find({ clientId, trackIds: { $in: [...trackIds] } })
          .select('title label catNo barcode trackIds')
          .sort('createdAt')
          .lean()
      : [],
  ]);

  const territoryGroupMap = new Map(territoryGroups.map((tg) => [tg._id.toString(), tg]));
  const publisherMap = new Map(publishers.map((p) => [p._id.toString(), p]));
  const composerMap = new Map(composers.map((c) => [c._id.toString(), c]));
  const trackMap = new Map(tracks.map((t) => [t._id.toString(), t]));

  // Sorted ascending by createdAt — first entry per track is the oldest release
  const releaseByTrackMap = new Map();
  for (const release of releases) {
    for (const trackId of release.trackIds || []) {
      const key = trackId.toString();
      if (!releaseByTrackMap.has(key)) releaseByTrackMap.set(key, release);
    }
  }

  return { territoryGroupMap, publisherMap, composerMap, trackMap, releaseByTrackMap };
}

/**
 * Fetches a batch of works matching the given filter, enriches each one with delivery
 * data (territory resolution, publisher/composer lookup, track/release data), and
 * returns the works ready for CWR record generation.
 *
 * All referenced documents (publishers, composers, tracks, releases, territory groups)
 * are fetched in 5 parallel bulk queries before per-work processing begins, replacing
 * the previous pattern of ~30 individual DB calls per work.
 *
 * If options.lastId is set the filter is extended with a $gt cursor condition so that
 * batches can be paginated. In practice the caller in the api repo pre-fetches all IDs
 * and passes exact $in chunks, so lastId is no longer used for CWR deliveries.
 *
 * @param {Object} params
 * @param {Object} params.delivery - CwrDelivery document
 * @param {Object} params.deliveryPartner - DeliveryPartner document
 * @param {Object} params.filter - Mongoose filter for this batch (typically { _id: { $in: chunkIds } })
 * @param {{ partnerChainsEnabled: boolean, lastId?: string }} params.options
 * @param {number} [params.limit=10000] - Maximum works to fetch per call
 * @param {string|string[]} params.territory - Territory code, continent, or TerritoryGroup ObjectId
 * @param {Object} params.Work - Mongoose model
 * @param {Object} params.TerritoryGroup - Mongoose model
 * @param {Object} params.Track - Mongoose model
 * @param {Object} params.Release - Mongoose model
 * @param {Object} params.Publisher - Mongoose model
 * @param {Object} params.Composer - Mongoose model
 * @returns {{ works: Object[], territory: string|string[] }}
 */
CwrDeliveryController.getWorksForDelivery = async ({
  delivery,
  deliveryPartner,
  territory,
  filter,
  options,
  limit = 10_000,
  Work,
  TerritoryGroup,
  Track,
  Release,
  Publisher,
  Composer,
}) => {
  const logKey = `CWR Delivery: ${delivery._id} -`;
  logger.info(logKey, 'Getting all works for filter');
  if (options.lastId) {
    filter = createAndQuery(filter);
    filter.$and.push({ _id: { $gt: options.lastId } });
  }
  logger.debug('Works filter:', JSON.stringify(filter, null, 2));

  const works = await Work.find(filter, null, { limit, sort: { _id: 1 } }).lean();
  logger.info(logKey, `No of Works for Delivery: ${works.length}`);

  if (isValidObjectId(delivery.territory)) {
    logger.info(logKey, 'Fetching TerritoryGroup');
    const territoryGroup = await TerritoryGroup.findById(delivery.territory).select('territories').lean();
    if (territoryGroup) {
      territory = territoryGroup.territories;
    }
  }

  logger.info(logKey, 'Pre-fetching lookup data for works');
  const { territoryGroupIds, publisherIds, composerIds, trackIds } = collectWorkIds(works, deliveryPartner);
  logger.info(
    logKey,
    `Lookup IDs: ${territoryGroupIds.size} territoryGroups, ${publisherIds.size} publishers, ${composerIds.size} composers, ${trackIds.size} tracks`
  );
  const lookups = await batchFetchLookups({
    clientId: delivery.clientId,
    territoryGroupIds,
    publisherIds,
    composerIds,
    trackIds,
    TerritoryGroup,
    Publisher,
    Composer,
    Track,
    Release,
  });
  logger.info(logKey, 'Pre-fetch complete');

  logger.info(logKey, 'Getting delivery data for works');
  const deliveryDataStart = Date.now();
  const worksWithDeliveryData = [];
  for (const work of works) {
    worksWithDeliveryData.push(CwrDeliveryController.getWorkDeliveryData({
      work,
      territory,
      deliveryPartner,
      isCatShipment: delivery.outputFormat === 'Catalogue Shipment',
      partnerChainsEnabled: options.partnerChainsEnabled,
      lookups,
    }));
  }

  const elapsed = ((Date.now() - deliveryDataStart) / 1000).toFixed(1);
  const rate = Math.round(works.length / (elapsed || 1));
  logger.info(logKey, `Getting delivery data: ${works.length} works in ${elapsed}s (${rate}/s)`);

  return {
    works: worksWithDeliveryData.filter(Boolean),
    territory,
  };
};

/**
 * Enriches a single work document with all data needed for CWR record generation:
 * resolves territory codes, attaches publisher/composer data to the rights chain,
 * inserts delivery partner publisher entries, and attaches recording/release data.
 *
 * All DB lookups are performed via the pre-fetched Maps in `lookups` — no DB calls
 * are made inside this function.
 *
 * Returns null if the work has no rights chain (filtered out by the caller).
 *
 * @param {Object} params
 * @param {Object} params.work - Work document
 * @param {string|string[]} params.territory - Delivery territory (code, continent, or TerritoryGroup ID)
 * @param {Object} params.deliveryPartner - DeliveryPartner document
 * @param {boolean} params.isCatShipment - True for Catalogue Shipment output format (skips territory filtering)
 * @param {boolean} params.partnerChainsEnabled - If true, replace rightsChain with partner-specific chain when available
 * @param {{ territoryGroupMap: Map, publisherMap: Map, composerMap: Map, trackMap: Map, releaseByTrackMap: Map }} params.lookups
 * @returns {Object|null} Enriched work, or null if the work should be excluded
 */
CwrDeliveryController.getWorkDeliveryData = ({
  work,
  territory,
  deliveryPartner,
  isCatShipment,
  partnerChainsEnabled,
  lookups = {
    territoryGroupMap: new Map(),
    publisherMap: new Map(),
    composerMap: new Map(),
    trackMap: new Map(),
    releaseByTrackMap: new Map(),
  },
}) => {
  if (!work) return null;

  if (partnerChainsEnabled && Array.isArray(work.partnerRightsChains)) {
    const partnerChain = work.partnerRightsChains.find(
      (chain) => chain.deliveryPartnerId === deliveryPartner?._id?.toString()
    );
    if (partnerChain) {
      work.rightsChain = partnerChain.rightsChain;
    }
  }

  if (!Array.isArray(work.rightsChain)) {
    return null;
  }

  const { territoryGroupMap, publisherMap, releaseByTrackMap, trackMap } = lookups;

  // Process each rightsChain
  for (const chain of work.rightsChain) {
    // Resolve territory
    if (chain.territory === 'specific') {
      chain.territory = chain.territoryCodes?.codes || [];
    } else if (isValidObjectId(chain.territory)) {
      const group = territoryGroupMap.get(chain.territory.toString());
      if (group) {
        chain.territory = group.territories;
        chain.isTerritoryGroup = true;
      }
    }

    // Process children
    chain.children = CwrDeliveryController.getDataForChildren({
      children: chain.children || [],
      publisherMap: lookups.publisherMap,
      composerMap: lookups.composerMap,
    });

    // Delivery partner insertion
    if (deliveryPartner?.insertion?.publisherId) {
      const publisher = publisherMap.get(deliveryPartner.insertion.publisherId.toString());
      if (publisher) {
        const insertionItem = {
          publisher,
          publisherId: publisher._id.toString(),
          type: 'Publisher',
          contractType: deliveryPartner.insertion.category,
          controlled: true,
          mechanicalOwnership: 0,
          performanceOwnership: 0,
          mechanicalCollection: 0,
          performanceCollection: 0,
          children: [],
        };

        // Extra partners
        if (Array.isArray(deliveryPartner.extraPartners) && publisher.territories?.length) {
          insertionItem.extraPartners = deliveryPartner.extraPartners
            .map((extra) => {
              if (!extra.publisherId) return null;
              const baseMatch = publisherMap.get(extra.publisherId.toString());
              if (!baseMatch) return null;
              // Shallow copy to avoid mutating the shared map entry across works
              const match = { ...baseMatch };

              if (extra.mechanicalPro) match.mechanicalPro = extra.mechanicalPro;
              if (extra.performancePro) match.performancePro = extra.performancePro;
              if (Array.isArray(extra.territories)) match.territories = extra.territories;

              return {
                ...extra,
                publisher: match,
                contractType: deliveryPartner.insertion.category,
              };
            })
            .filter(Boolean);
        }

        // Rebuild controlled children
        chain.children = chain.children.map((child) => {
          if (!child.controlled || child.publisherId === publisher._id.toString()) {
            return child;
          }

          const newItem = JSON.parse(JSON.stringify(insertionItem));
          newItem.mechanicalCollection = child.mechanicalCollection;
          newItem.performanceCollection = child.performanceCollection;

          if (newItem.extraPartners) {
            newItem.extraPartners = newItem.extraPartners.map((ep) => ({
              ...ep,
              mechanicalCollection: child.mechanicalCollection,
              performanceCollection: child.performanceCollection,
            }));
          }

          child.mechanicalCollection = 0;
          child.performanceCollection = 0;
          newItem.children.push(child);
          return newItem;
        });
      }
    }
  }

  // Track data
  if (Array.isArray(work.trackIds) && work.trackIds.length > 0) {
    work.recordings = [];
    for (const trackId of work.trackIds) {
      if (!trackId) continue;
      const track = trackMap.get(trackId.toString());
      if (!track) continue;
      const trackData = CwrDeliveryController.getTrackDeliveryData({ track, releaseByTrackMap });
      if (trackData.duration) {
        work.duration = trackData.duration;
      }
      work.recordings.push(trackData);
    }
  }

  // Normalize territory
  let finalTerritory = Array.isArray(territory) ? territory : [territory];

  // Convert continents
  if (['Africa', 'Americas', 'Asia', 'Europe', 'Oceania'].includes(finalTerritory[0])) {
    finalTerritory = territoryHelper.continentToTerritoryCodes(finalTerritory[0]);
  }

  // Filter rightsChain
  if (isCatShipment || finalTerritory.includes('WW') || finalTerritory.includes('World')) {
    return work;
  }
  const scored = IpChainUtils.getScoredTerritories(work.rightsChain, finalTerritory);
  if (scored.length > 0) {
    work.rightsChain = scored;
  }

  // Availability check
  const isAvailable = finalTerritory.some((t) => work.territories.includes(t));
  if (finalTerritory.includes('WW') || finalTerritory.includes('World') || isAvailable) {
    return work;
  }

  return work;
};

/**
 * Extracts the fields needed for a CWR recording record from a track document,
 * and attaches release metadata if a matching release exists in the pre-fetched map.
 *
 * Synchronous — all lookups are Map gets against data fetched by batchFetchLookups.
 *
 * @param {Object} params
 * @param {Object} params.track - Track document (projected to: title, version, artist, isrc, duration, label)
 * @param {Map<string, Object>} [params.releaseByTrackMap] - Pre-fetched Map of trackId → oldest release
 * @returns {Object} Recording data shaped for cwr.addWorks
 */
CwrDeliveryController.getTrackDeliveryData = ({ track, releaseByTrackMap = new Map() }) => {
  const result = {
    title: track.title,
    version: track.version,
    artist: track.artist,
    isrc: track.isrc,
    duration: track.duration,
    trackLabel: track.label,
  };
  const release = releaseByTrackMap.get(track._id.toString());
  if (release) {
    result.releaseTitle = release.title;
    result.label = release.label;
    result.catNo = release.catNo;
    result.barcode = release.barcode;
  }
  return result;
};

/**
 * Enriches a rights chain's children array with publisher/composer documents,
 * recursing into nested children. Skips any child whose referenced document is
 * not in the pre-fetched maps (would have been excluded from the bulk fetch).
 *
 * All lookups are Map gets — no DB calls.
 *
 * @param {Object} params
 * @param {Object[]} params.children - Rights chain child nodes (publishers and composers)
 * @param {Map<string, Object>} [params.publisherMap] - Pre-fetched Map of publisherId → publisher
 * @param {Map<string, Object>} [params.composerMap] - Pre-fetched Map of composerId → composer
 * @returns {Object[]} Enriched children array (children missing from maps are filtered out)
 */
CwrDeliveryController.getDataForChildren = ({ children, publisherMap = new Map(), composerMap = new Map() }) => {
  if (!Array.isArray(children) || children.length === 0) return [];
  const processed = [];

  for (const child of children) {
    if (!child) continue;
    if (child.type === 'Publisher' && !child.publisherId) continue;
    if (child.type === 'Composer' && !child.composerId) continue;

    if (child.publisherId) {
      const publisher = publisherMap.get(child.publisherId.toString());
      if (!publisher) continue;
      // Shallow copy to avoid mutating the shared map entry across works
      child.publisher = { ...publisher };
      child.name = publisher.name;
      child.caeNumber = publisher.cae;
    }

    if (child.composerId) {
      const composer = composerMap.get(child.composerId.toString());
      if (!composer) continue;
      // Shallow copy to avoid mutating the shared map entry across works
      child.composer = { ...composer };
      child.name = composer.name;
      child.caeNumber = composer.cae;
    }

    if (Array.isArray(child.children) && child.children.length > 0) {
      child.children = CwrDeliveryController.getDataForChildren({
        children: child.children,
        publisherMap,
        composerMap,
      });
    }
    processed.push(child);
  }

  return processed;
};

/**
 *
 * @param {Object} params
 * @param {string} params.status
 * @param {Delivery} params.delivery delivery model instance
 * @param {DeliveryPartner} params.DeliveryPartner DeliveryPartner model
 * @param {Work} params.Work Work model
 * @param {DeliverySchedule} params.DeliverySchedule DeliverySchedule model
 * @param {CwrDelivery} params.CwrDelivery CwrDelivery model
 * @param {TerritoryGroup} params.TerritoryGroup TerritoryGroup model
 * @param {DeliveredWork} params.DeliveredWork DeliveredWork model
 */
CwrDeliveryController.buildWorksFilter = async ({
  status,
  delivery,
  DeliveryPartner,
  Work,
  DeliverySchedule,
  CwrDelivery,
  TerritoryGroup,
  DeliveredWork,
}) => {
  const { clientId, deliveryPartnerId, filterType } = delivery;
  let filter = { clientId: delivery.clientId, valid: true };

  if (delivery?.workIds?.length > 0) {
    // When workIds exist, only use those, do not refilter
    filter._id = { $in: delivery.workIds.map((id) => new ObjectId(id)) };
  } else if (status && status !== 'All') {
    const workIdsByStatus = await DeliveredWorkController.getWorkIdsByStatus({
      DeliveredWork,
      clientId: delivery.clientId,
      cwrDeliveryId: delivery._id,
      status,
    });
    if (!filter._id?.$in) {
      filter._id = { $in: [] };
    }
    filter._id.$in = filter._id.$in.concat(workIdsByStatus);
  } else {
    filter = await CwrUtils.getWorksMatchingFilter({
      Work,
      DeliverySchedule,
      CwrDelivery,
      DeliveryPartner,
      TerritoryGroup,
      clientId,
      deliveryPartnerId,
      filterType,
      deliveryFilter: delivery.filter,
      onlyReturnFilter: true,
    });
  }

  return filter;
};

CwrDeliveryController.collectChildrenIds = collectChildrenIds;
CwrDeliveryController.collectWorkIds = collectWorkIds;
CwrDeliveryController.batchFetchLookups = batchFetchLookups;

module.exports = CwrDeliveryController;
