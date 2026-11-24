/* eslint-disable no-continue */
/* eslint-disable no-await-in-loop */
/* eslint-disable no-param-reassign */
const { ObjectId } = require('mongodb');
const { logger, promisify, fileManager } = require('@curveroyaltysystems/platform-shared-utils');
const async = require('async');
const { isValidObjectId } = require('mongoose');

const { isUserForbidden } = require('../libs/userAccess');
const CwrUtils = require('../libs/cwr/utils');
const territoryHelper = require('../libs/territoryHelper');
const IpChainUtils = require('../libs/cwr/ipChain');
const DeliveredWorkController = require('./deliveredWork');

const CwrDeliveryController = this;

const paramsToFilterField = (inputParams, user) => {
  const params = {};
  if (user.clientId) { params.clientId = user.clientId; }
  if (inputParams.status) { params.status = inputParams.status; }
  if (inputParams.filterType) { params.filterType = inputParams.filterType; }
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

  if (await isUserForbidden({ Payee, user: curveUser, operation: 'write', type: 'catalogue', document: foundCwrDelivery, clientOnly: true })) throw Error('Forbidden');

  let updateWorkIds = workIds;
  if (foundCwrDelivery?.filter?.workIds?.length > 0) {
    const mergedIds = foundCwrDelivery.filter.workIds
      .concat(workIds) // concatenate the arrays
      .filter((value, index, self) => self.indexOf(value) === index) // remove duplicates
      .reduce((acc, currentId) => [...acc, currentId], []);
    updateWorkIds = mergedIds;
  }
  const cwrDelivery = await CwrDelivery.findByIdAndUpdate(id, { $set: { 'filter.workIds': updateWorkIds } }).catch((err) => {
    logger.error(err);
    return { status: 500, data: { message: 'Internal error, please try again' } };
  });
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
    partnerTerritories = Array.isArray(deliveryPartner.territory) ? deliveryPartner.territory : [deliveryPartner.territory];
    if (ObjectId.isValid(deliveryPartner.territory)) {
      const territoryGroup = await TerritoryGroup.findById(deliveryPartner.territory, 'territories').catch(logger.error);
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
CwrDeliveryController.getUncontrolledWorks = async ({ Work, DeliveryPartner, TerritoryGroup, DeliverySchedule, CwrDelivery, cwrDelivery, query }) => {
  const deliveryPartner = await DeliveryPartner.findById(cwrDelivery.deliveryPartnerId, 'territory').catch(logger.error);

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

  const deliveryPartnerTerritories = await CwrDeliveryController.getPartnerTerritories({ DeliveryPartner, TerritoryGroup, deliveryPartnerId: deliveryPartner._id });
  const uncontrolledWorks = await getDifference({ Work, clientId: cwrDelivery.clientId, deliveryPartnerTerritories, query });
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

CwrDeliveryController.export = async ({ delivery, curveUser, markWorksAsDelivered, DeliveryPartner, Client, Notification }) => {
  try {
    logger.info(`CWR Delivery: ${delivery._id} - Starting export`);

    // Refactored to check delivery partner exists and the settings before doing any heavy lifting
    logger.info(`CWR Delivery: ${delivery._id} - Getting delivery partners`);
    const deliveryPartner = await DeliveryPartner.findById(delivery.deliveryPartnerId);

    if (markWorksAsDelivered) {
      logger.info(`CWR Delivery: ${delivery._id} - Marking works as delivered`);
      await new Promise((resolve, reject) => {
        delivery.deliverWorks((err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    }

    logger.info(`CWR Delivery: ${delivery._id} - Preparing delivery`);
    const key = await new Promise((resolve, reject) => {
      delivery.prepareDelivery(deliveryPartner, curveUser, (err, deliveryKey) => {
        if (err) reject(err);
        else resolve(deliveryKey);
      });
    });

    logger.info(`CWR Delivery: ${delivery._id} - Getting public link for S3 file`);
    const [link] = await promisify(fileManager.publicLink24Hours, key);

    logger.info(`CWR Delivery: ${delivery._id} - Sending download ready message`);
    const client = await Client.findById(curveUser.clientId);
    const subject = `Your ${delivery.outputFormat} Export for ${client.name} is Ready to Download`;
    const generateOptions = {
      identifier: 'exportDownload',
      curveUser,
      client,
      subject,
      link,
    };
    await promisify(Notification.generate, `${delivery.outputFormat} Export Ready`, subject, link, curveUser, generateOptions);

    // Save delivery after file name is attached
    await delivery.save();

    if (markWorksAsDelivered) {
      delivery.status = 'Delivered';
      delivery.errorMessage = null;
    }
  } catch (err) {
    if (markWorksAsDelivered) {
      delivery.status = 'Errored';
      delivery.errorMessage = err.message;
      logger.error(`CWR Delivery: ${delivery._id.toString()} Delivery Export Error:`, err);
    }
  } finally {
    if (markWorksAsDelivered) {
      await delivery.save()
        .catch((err) => {
          logger.error(`CWR Delivery: ${delivery._id.toString()} | Could not save delivery |`, err);
        });
    }
  }
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
 *
 * @param {Object} params
 * @param {Delivery} params.delivery Delivery model instance
 * @param {DeliveryPartner} params.deliveryPartner DeliveryPartner model instance
 * @param {string} params.territory Territory code or id referencing TerritoryGroup
 * @param {{ partnerChainsEnabled: boolean, lastId?: string }} params.options
 * @param {number?} params.limit Limit number of works to query
 * @param {Work} params.Work Work model
 * @param {TerritoryGroup} params.TerritoryGroup TerritoryGroup model
 * @param {Track} params.Track Track model
 * @param {Release} params.Release Release model
 * @param {Publisher} params.Publisher Publisher model
 * @param {Composer} params.Composer Composer model
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

  const works = await Work.find(filter, null, { limit, sort: { _id: 1 } });
  logger.info(logKey, `No of Works for Delivery: ${works.length}`);

  if (isValidObjectId(delivery.territory)) {
    logger.info(logKey, 'Fetching TerritoryGroup');
    const territoryGroup = await TerritoryGroup.findById(delivery.territory);
    if (territoryGroup) {
      territory = territoryGroup.territories;
    }
  }

  logger.info(logKey, 'Getting delivery data for works');
  const worksWithDeliveryData = await async.mapLimit(works, 10, async (work) => {
    const workWithDeliveryData = await CwrDeliveryController.getWorkDeliveryData({
      work,
      territory,
      deliveryPartner,
      isCatShipment: delivery.outputFormat === 'Catalogue Shipment',
      partnerChainsEnabled: options.partnerChainsEnabled,
      Track,
      Release,
      TerritoryGroup,
      Publisher,
      Composer,
    })
      .catch((err) => {
        logger.error(logKey, `Error while getting delivery data for work ${work?._id}:`, err);
        throw err;
      });
    return workWithDeliveryData;
  });

  return {
    works: worksWithDeliveryData.filter(Boolean),
    territory,
  };
};

/**
 *
 * @param {Object} params
 * @param {Work} params.work Work model instance
 * @param {string} params.territory Territory code or id referencing TerritoryGroup
 * @param {DeliveryPartner} params.deliveryPartner DeliveryPartner model instance
 * @param {boolean} params.isCatShipment
 * @param {booleab} params.partnerChainsEnabled
 * @param {Track} params.Track Track model
 * @param {Release} params.Release Release model
 * @param {TerritoryGroup} params.TerritoryGroup TerritoryGroup model
 * @param {Publisher} params.Publisher Publisher model
 * @param {Composer} params.Composer Composer model
 */
CwrDeliveryController.getWorkDeliveryData = async ({
  work,
  territory,
  deliveryPartner,
  isCatShipment,
  partnerChainsEnabled,
  Track,
  Release,
  TerritoryGroup,
  Publisher,
  Composer,
}) => {
  if (!work) return null;

  if (partnerChainsEnabled && Array.isArray(work.partnerRightsChains)) {
    const partnerChain = work.partnerRightsChains.find(
      (chain) => chain.deliveryPartnerId === deliveryPartner?._id?.toString(),
    );
    if (partnerChain) {
      work.rightsChain = partnerChain.rightsChain;
    }
  }

  if (!Array.isArray(work.rightsChain)) {
    return null;
  }

  // Process each rightsChain
  await async.mapLimit(work.rightsChain, 5, async (chain) => {
    // Resolve territory
    if (chain.territory === 'specific') {
      chain.territory = chain.territoryCodes?.codes || [];
    } else if (isValidObjectId(chain.territory)) {
      const group = await TerritoryGroup.findById(chain.territory);
      if (group) {
        chain.territory = group.territories;
        chain.isTerritoryGroup = true;
      }
    }

    // Process children
    chain.children = await CwrDeliveryController.getDataForChildren({
      children: chain.children || [],
      Publisher,
      Composer,
    });

    // Delivery partner insertion
    if (deliveryPartner?.insertion?.publisherId) {
      const publisher = await Publisher.findById(deliveryPartner.insertion.publisherId);
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
          const ids = deliveryPartner.extraPartners.map((p) => p.publisherId).filter(Boolean);
          const extraPubs = await Publisher.find({ _id: { $in: ids } });

          insertionItem.extraPartners = deliveryPartner.extraPartners.map((extra) => {
            const match = extraPubs.find((p) => p._id.toString() === extra.publisherId);
            if (!match) return null;

            if (extra.mechanicalPro) match.mechanicalPro = extra.mechanicalPro;
            if (extra.performancePro) match.performancePro = extra.performancePro;
            if (Array.isArray(extra.territories)) match.territories = extra.territories;

            return {
              ...extra,
              publisher: match,
              contractType: deliveryPartner.insertion.category,
            };
          }).filter(Boolean);
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
  });

  // Track data
  if (Array.isArray(work.trackIds) && work.trackIds.length > 0) {
    const validTrackIds = work.trackIds.filter(Boolean).map((id) => new ObjectId(id));
    const tracks = await Track.find({ _id: { $in: validTrackIds } });

    work.recordings = [];
    for (const track of tracks) {
      const trackData = await CwrDeliveryController.getTrackDeliveryData({ track, Release });

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
 *
 * @param {Object} params
 * @param {Track} params.track Track model instance
 * @param {Release} params.Release Release model
 */
CwrDeliveryController.getTrackDeliveryData = async ({ track, Release }) => {
  const result = {
    title: track.title,
    version: track.version,
    artist: track.artist,
    isrc: track.isrc,
    duration: track.duration,
    trackLabel: track.label,
  };
  const release = await Release
    .findOne({ clientId: track.clientId, trackIds: track._id.toString() })
    .sort('createdAt')
    .exec();
  if (release) {
    result.releaseTitle = release.title;
    result.label = release.label;
    result.catNo = release.catNo;
    result.barcode = release.barcode;
  }
  return result;
};

/**
 * @param {Object} params
 * @param {Object[]} params.children Array of rights chain children (composers, publishers)
 * @param {Publisher} params.Publisher Publisher model
 * @param {Composer} params.Composer Composer model
 */
CwrDeliveryController.getDataForChildren = async ({ children, Publisher, Composer }) => {
  if (!Array.isArray(children) || children.length === 0) return [];
  const processed = [];

  for (const child of children) {
    if (!child) continue;
    if (child.type === 'Publisher' && !child.publisherId) continue;
    if (child.type === 'Composer' && !child.composerId) continue;

    if (child.publisherId) {
      const publisher = await Publisher.findById(child.publisherId);
      if (!publisher) continue;
      child.publisher = publisher;
      child.name = publisher.name;
      child.caeNumber = publisher.cae;
    }

    if (child.composerId) {
      const composer = await Composer.findById(child.composerId);
      if (!composer) continue;
      child.composer = composer;
      child.name = composer.name;
      child.caeNumber = composer.cae;
    }

    if (Array.isArray(child.children) && child.children.length > 0) {
      child.children = await CwrDeliveryController.getDataForChildren({
        children: child.children,
        Publisher,
        Composer,
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
    const workIdsByStatus = await DeliveredWorkController.getWorkIdsByStatus({ DeliveredWork, clientId: delivery.clientId, cwrDeliveryId: delivery._id, status });
    if (!filter._id?.$in) { filter._id = { $in: [] }; }
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
      onlyReturnFilter: true });
  }

  return filter;
};

module.exports = CwrDeliveryController;
