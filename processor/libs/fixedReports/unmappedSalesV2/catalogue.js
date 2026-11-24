/* eslint-disable no-await-in-loop */
const { logger } = require('@curveroyaltysystems/platform-shared-utils');

const Work = require('../../../models/work');
const Release = require('../../../models/release');
const Track = require('../../../models/track');
const Contract = require('../../../models/contract');

// Global
const Models = {
  works: Work,
  tracks: Track,
  releases: Release,
};

/**
 * @typedef {Object} SalesReturnRightsObject
 * @property {string} _id - The unique identifier for the object.
 * @property {string[]} salesReturnRights - An array of strings representing sales return rights.
 */

/**
 * @typedef {Object.<string, SalesReturnRightsObject>} CatalogueObject
 */

/** @type {CatalogueObject} */
const Works = {};

/** @type {CatalogueObject} */
const Tracks = {};

/** @type {CatalogueObject} */
const Releases = {};

const Contracts = {};

const Catalogue = this;

/**
 * Loads MongoDB catalogue data into memory
 * @param {Object} params - The parameters to load the catalogue
 * @param {clientId} params.clientId - The client id
 * @param {('tracks'|'works'|'releases')} params.collection - The collection of the catalogue mongo collections
 * @param {string[]} params.contractIds - The contract ids
 * @param {Boolean} params.periodFile - The period file flag for creating unreported period file or fixed report unreported sales
 *
 * @throws {Error} Throws an error if the collection is invalid
 * @returns {Promise<void>}
 */
Catalogue.get = async ({ clientId, collection, contractIds, lastId, logKey, periodFile }) => {
  /** @type {import('mongoose').PaginateModel} */
  const Model = Models[collection];
  if (!Model) throw new Error('Invalid collection');

  const limit = 1000;

  const query = periodFile
    ? {
      // If periodFile is true, we need to check if the sales returns rights are empty
      // This is because sales lines against these catalogue items will never be reported, thus no contractIds will be present
      $or: [
        {
          clientId: clientId.toString(),
          salesReturnsRights: {
            $elemMatch: { contractId: { $in: contractIds } },
          },
        },
        {
          clientId: clientId.toString(),
          'salesReturnsRights.0': { $exists: false },
        },
      ],
    }
    // This is for the Fixed Report Unreported Sales
    // We're only targeting contract specific catalogue items
    : {
      clientId: clientId.toString(),
      salesReturnsRights: {
        $elemMatch: { contractId: { $in: contractIds } },
      },
    };

  if (lastId) query._id = { $gt: lastId };

  const projection = collection === 'tracks' ? '_id salesReturnsRights releaseSpecificSalesReturnsRights' : '_id salesReturnsRights';

  const documents = await Model
    .find(query)
    .select(projection)
    .sort({ _id: 1 })
    .limit(limit)
    .lean()
    .catch(logger.error);
  if (!documents?.length) return;

  logger.info(`${logKey} | Loaded ${collection}: ${documents.length}`);

  for (const document of documents) {
    const salesReturnsRights = document.salesReturnsRights?.map(({ contractId }) => contractId);
    const catalogueObject = { ...document, salesReturnsRights };

    if (collection === 'works') {
      Works[document._id] = catalogueObject;
    } else if (collection === 'tracks') {
      const releaseSpecificSalesReturnsRights = document.releaseSpecificSalesReturnsRights?.map(({ contractId, releaseId }) => ({ contractId, releaseId }));

      Tracks[document._id.toString()] = { ...catalogueObject, releaseSpecificSalesReturnsRights };
    } else if (collection === 'releases') {
      Releases[document._id] = catalogueObject;
    }
  }

  if (documents.length === limit) {
    await Catalogue.get({
      logKey,
      clientId,
      collection,
      contractIds,
      lastId: documents[documents.length - 1]._id,
      periodFile,
    });
  }
};

/**
 * Loads contract documents into memory
 * @param {Object} param - The parameters to load the contracts
 * @param {string} param.clientId - The client id
 * @param {Object} param.period - The period
 * @param {number} param.count - The count
 * @param {Boolean} param.periodFile - The period file flag for creating unreported period file or fixed report unreported sales, this determines what we load
 *
 * @throws {Error} Throws an error if the clientId is missing
 * @returns {Promise<void>}
 */
Catalogue.loadContracts = async ({ clientId, period, lastId, periodFile, count = 0 }) => {
  logger.debug(`Loaded Contracts: ${count}`);

  const query = {
    clientId,
    accountingPeriod: period.accountingPeriodType,
  };

  if (!periodFile) { query.active = true; }

  if (lastId) query._id = { $gt: lastId };

  const limit = 1000;
  const contracts = await Contract
    .find(query)
    .select('_id clientId name')
    .sort({ _id: 1 })
    .limit(limit)
    .lean()
    .catch(logger.error);
  if (!contracts?.length) return;

  for (const contract of contracts) {
    Contracts[contract._id.toString()] = contract;
  }

  if (contracts.length === limit) {
    await Catalogue.loadContracts({
      clientId,
      period,
      count: count += limit,
      lastId: contracts[contracts.length - 1]._id,
      periodFile,
    });
  }
};

/**
 * Loads catalogue data from MongoDb into memory
 *
 * @param {Object} param - The parameters to load the catalogue
 * @param {string} param.clientId - The client id
 * @param {string} param.period - The period
 * @param {Boolean} param.periodFile - The period file flag for creating unreported period file or fixed report unreported sales
 * @throws {Error} Throws an error if the clientId is missing
 * @returns {Promise<void>}
 */
Catalogue.loadCatalogue = async ({ logKey, clientId, period, periodFile }) => {
  const collections = ['works', 'releases', 'tracks'];

  logger.info(`${logKey} | Loading catalogue for clientId: ${clientId}`);
  await Catalogue.loadContracts({ period, clientId, periodFile });
  const contractIds = Object.keys(Contracts);

  logger.info(`${logKey} | Loading Catalogue for clientId: ${clientId}`);
  for (const collection of collections) {
    logger.info(`${logKey} | Loading ${collection} for clientId: ${clientId}`);
    await Catalogue.get({ clientId, collection, contractIds, logKey, periodFile });
  }

  return { catalogue: { Works, Releases, Tracks }, contracts: Contracts };
};

module.exports = Catalogue;
