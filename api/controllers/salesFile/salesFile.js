/* eslint-disable no-await-in-loop */
/* eslint-disable no-continue */
const { logger, fileManager, fileOpener, CurveError } = require('@curveroyaltysystems/platform-shared-utils');
const { Page, UserAccess } = require('@curveroyaltysystems/curve-shared-logic');

const _ = require('lodash');
const { eachLimit } = require('async');
const { ObjectId } = require('mongodb');
const { applyDateFilters } = require('../../libs/dateFilters');

const User = require('../../models/user');
const SalesFile = require('../../models/salesFile');
const UnmappedWork = require('../../models/unmappedWork');
const UnmappedTrack = require('../../models/unmappedTrack');
const UnmappedRelease = require('../../models/unmappedRelease');
const UnmappedPublisher = require('../../models/unmappedPublisher');
const Client = require('../../models/client');
const Payee = require('../../models/payee');
const HyperCare = require('../hypercare');

const S3_BUCKET = process.env.S3_bucket;
const INTERNAL_ERROR = 'Internal error, please try again';

const SalesFileController = this;

async function getUserEmail(userId) {
  const user = await User.findById(userId).catch(logger.error);
  return user?.email || null;
}

async function populateUnmappedCatalogue({ Model, clientId, salesFile, tab }) {
  const limit = 1000;

  const result = { warning: {} };

  const query = { clientId, salesFileId: salesFile._id.toString(), complete: { $ne: true } };

  const unmappedCount = await Model.countDocuments(query);
  const unmappedCatalogue = await Model.find(query).sort({ _id: 1 }).limit(limit);

  result.docs = unmappedCatalogue;

  if (unmappedCount > 1000) {
    const formattedCount = unmappedCount.toLocaleString('en-US');
    // eslint-disable-next-line max-len
    result.warning.message = `There are currently ${formattedCount} items that require mapping, of which only 1,000 have been loaded on the present page. Kindly utilise the Unmapped Page feature to facilitate the mapping process for all items comprehensively.`;
    result.warning.url = `/#/sales/unmapped?salesFile=${salesFile._id.toString()}&activeTab=${tab}`;
  }

  return result;
}

SalesFileController.getSalesFile = async ({ params, curveUser }) => {
  const salesFile = await SalesFile.findById(params.id).catch(logger.error);

  if (!salesFile.viewed && salesFile.status === 'Complete') { await SalesFile.findByIdAndUpdate(salesFile._id, { $set: { viewed: true } }); }

  // Add user email to lastIngested or lastRevalidated object
  if (ObjectId.isValid(salesFile.lastIngested?.user)) {
    salesFile.lastIngested.user = await getUserEmail(salesFile.lastIngested?.user);
  }

  if (ObjectId.isValid(salesFile.lastRevalidated?.user)) {
    salesFile.lastRevalidated.user = await getUserEmail(salesFile.lastRevalidated.user);
  }

  // Populate Unmapped Catalogue
  const unmappedWorks = await populateUnmappedCatalogue({ Model: UnmappedWork, clientId: curveUser.clientId, salesFile, tab: 'works' });
  if (!_.isEmpty(unmappedWorks.warning)) { salesFile.invalidFields.worksWarning = unmappedWorks.warning; }
  salesFile.invalidFields.works = unmappedWorks.docs;

  const unmappedTracks = await populateUnmappedCatalogue({ Model: UnmappedTrack, clientId: curveUser.clientId, salesFile, tab: 'tracks' });
  if (!_.isEmpty(unmappedTracks.warning)) { salesFile.invalidFields.tracksWarning = unmappedTracks.warning; }
  salesFile.invalidFields.tracks = unmappedTracks.docs;

  const unmappedReleases = await populateUnmappedCatalogue({ Model: UnmappedRelease, clientId: curveUser.clientId, salesFile, tab: 'releases' });
  if (!_.isEmpty(unmappedReleases.warning)) { salesFile.invalidFields.releasesWarning = unmappedReleases.warning; }
  salesFile.invalidFields.releases = unmappedReleases.docs;

  const unmappedPublishers = await populateUnmappedCatalogue({ Model: UnmappedPublisher, clientId: curveUser.clientId, salesFile, tab: 'publishers' });
  salesFile.invalidFields.publishers = unmappedPublishers.docs;

  if (!salesFile.duplicateSalesFileId) {
    const duplicateSalesFile = await SalesFile.findOne({ duplicateSalesFileId: salesFile._id.toString() }, '_id');
    if (duplicateSalesFile) { salesFile.duplicateSalesFileId = duplicateSalesFile._id.toString(); }
  }

  if (salesFile.duplicateSalesFileId && salesFile.duplicateSalesFileId !== 'No ID Found') {
    const duplicateSalesFile = await SalesFile.findOne({ _id: salesFile.duplicateSalesFileId }).catch(logger.error);
    if (!duplicateSalesFile) { salesFile.duplicateSalesFileId = 'No ID Found'; }
  }

  return salesFile;
};

SalesFileController.getSalesFiles = async ({ curveUser, query }) => {
  const paginationParams = {
    page: Page.valueOrDefault(query.page, 1),
    limit: Page.valueOrDefault(query.limit, 25),
    sort: `${Page.sortOrDefault(query.orderBy || 'createdAt', query.orderDir)}`,
    select: '_id clientId name invoiceNo targetPeriod salesAccountName salesTemplateName salesTemplateId status file publicLink units validationUnits netAmount'
      + ' validationNetAmount homeCurrencyGrossAmount homeCurrencyNetAmount lines validationLines valid invalidLines reportedStatus reportedLines archived viewed locked duplicateSalesFileId foreignId createdAt updatedAt',
  };

  const baseFilter = SalesFile.paramsToFilterField(query, curveUser);
  const filter = applyDateFilters(query || {}, baseFilter);
  const result = await SalesFile.paginate(filter, paginationParams);

  let salesFiles = result?.docs;

  if (result?.docs?.length) {
    const formattedSalesFiles = [];

    await eachLimit(result.docs, 10, async (salesFile) => {
      if (salesFile.duplicateSalesFileId && salesFile.duplicateSalesFileId !== 'No ID Found') {
        const duplicateSalesFile = await SalesFile.findOne({ _id: salesFile.duplicateSalesFileId }).catch(logger.error);
        if (!duplicateSalesFile) { salesFile.duplicateSalesFileId = 'No ID Found'; }
      }

      formattedSalesFiles.push(salesFile);
    });

    salesFiles = formattedSalesFiles;
  }

  return { salesFiles, meta: { currentPage: paginationParams.page, totalPages: result.totalPages, total: result.totalDocs } };
};

SalesFileController.getBulkEditData = async ({ curveUser, query }) => {
  const fields = '_id name exchangeRates targetPeriod invalidFields.currencies salesAccountName customAdditionalFile';
  const ids = query.ids.map((id) => new ObjectId(id));
  const files = await SalesFile.find({ _id: ids, clientId: curveUser.clientId }, fields);

  const salesFiles = files.map((file) => ({ id: file._id, name: file.name, platform: file.salesAccountName ?? null }));

  // Check missing exchange rates for other platform files (everything excluding Apple)
  const otherSalesFiles = files.filter((file) => file.salesAccountName !== 'Apple');
  const otherExchangeRates = getExchangeRates(otherSalesFiles);

  // Check missing exchange rates for Apple
  const appleSalesFiles = files.filter((file) => file.salesAccountName === 'Apple');
  const appleExchangeRates = getExchangeRates(appleSalesFiles);

  const salesFilePlatforms = files.map((file) => file.salesAccountName);
  const includesOtherFiles = salesFilePlatforms.filter((dsp) => dsp !== 'Apple').length > 0;
  const includesAppleFiles = salesFilePlatforms.includes('Apple');

  const appleSalesFileIds = appleSalesFiles.map((file) => file._id);
  const hasFinancialFile = appleSalesFiles.filter((file) => file.customAdditionalFile).length > 0;

  const data = {
    salesFiles,
    platform: {
      default: {
        isValid: includesOtherFiles,
        exchangeRates: otherExchangeRates,
      },
      apple: {
        salesFileIds: appleSalesFileIds,
        isValid: includesAppleFiles,
        exchangeRates: appleExchangeRates,
        hasFinancialFile,
      },
    },
  };

  return data;
};

function getExchangeRates(salesFiles) {
  const exchangeRates = { invalid: [], existing: [] };
  if (!salesFiles || salesFiles.length === 0) return exchangeRates;
  for (const file of salesFiles) {
    if (typeof file.invalidFields !== 'undefined' && file.invalidFields.currencies.length > 0) {
      // Remove null entries, sometimes happens in the case of bad files/corrupted data
      const currencies = file.invalidFields.currencies.filter((currency) => currency);
      for (const currencyCode of currencies) {
        if (currencyCode.length > 3) continue;
        const existingInvalidEntry = exchangeRates.invalid.find((er) => er.currencyCode === currencyCode);
        if (existingInvalidEntry) existingInvalidEntry.salesFileIds.push(file._id.toString());
        else {
          exchangeRates.invalid.push({
            salesFileIds: [file._id.toString()],
            currencyCode,
            rate: null,
          });
        }
      }
    }
    if (typeof file.exchangeRates !== 'undefined' && file.exchangeRates.length > 0) {
      for (const existingRate of file.exchangeRates) {
        // Ignore empty exchange rows (bad data)
        if (typeof existingRate === 'undefined' || !existingRate.from || existingRate?.from?.length > 3) continue;
        const existingEntry = exchangeRates.existing.find((er) => er.currencyCode === existingRate.from);
        if (existingEntry) existingEntry.salesFileIds.push(file._id.toString());
        else {
          exchangeRates.existing.push({
            salesFileIds: [file._id.toString()],
            currencyCode: existingRate.from,
            rate: null,
          });
        }
      }
    }
  }
  return exchangeRates;
}

SalesFileController.bulkUpdate = async ({ curveUser, updates }) => {
  const { clientId } = curveUser;

  if (updates.ids.length === 0) throw new Error('No sales file ids specified');

  // If the option is not specified, make sure it's set to true so we don't overwrite existing fields by accident
  if (typeof updates.onlyUpdateMissing === 'undefined') updates.onlyUpdateMissing = true;

  const salesFiles = await SalesFile.find({
    _id: updates.ids,
    clientId,
  }, 'targetPeriod exchangeRates invalidFields overwriteFields');

  const updatedSalesFiles = salesFiles.map((salesFile) => {
    const salesFileId = salesFile._id.toString();
    const updatedRates = updates.exchangeRates
      .filter((rate) => rate.salesFileIds.includes(salesFileId))
      .map((existingRate) => ({
        rate: existingRate.rate,
        from: existingRate.currencyCode,
        to: 'Home Currency',
      }));

    // Remove non-number (null & undefined) exchange rates (from bad data or exchange rate api errors)
    salesFile.exchangeRates = salesFile.exchangeRates.filter((rate) => typeof rate.rate === 'number');

    const existingRates = salesFile.exchangeRates.map((rate) => rate.from);

    if (updates.onlyUpdateMissing) {
      // Target Period
      if (updates.targetPeriod && !salesFile.targetPeriod) salesFile.targetPeriod = updates.targetPeriod;
      // Sale Date
      if (updates.saleDate && !salesFile?.overwriteFields?.saleDate) {
        salesFile.overwriteFields.saleDate = updates.saleDate;
        salesFile.invalidFields.saleDate = false;
      }
      // Transaction Date
      if (updates.transactionDate && !salesFile?.overwriteFields?.transactionDate) {
        salesFile.overwriteFields.transactionDate = updates.transactionDate;
        salesFile.invalidFields.transactionDate = false;
      }
      // Exchange Rates
      for (const updatedRate of updatedRates) {
        if (!existingRates.includes(updatedRate.from)) {
          salesFile.exchangeRates.push(updatedRate);
        }
      }
    } else {
      // Target Period
      if (updates.targetPeriod) salesFile.targetPeriod = updates.targetPeriod;
      // Sale Date
      if (updates.saleDate) {
        salesFile.overwriteFields.saleDate = updates.saleDate;
        salesFile.invalidFields.saleDate = false;
      }
      // Transaction Date
      if (updates.transactionDate) {
        salesFile.overwriteFields.transactionDate = updates.transactionDate;
        salesFile.invalidFields.transactionDate = false;
      }
      // Exchange Rates
      for (const updatedRate of updatedRates) {
        if (!existingRates.includes(updatedRate.from)) {
          salesFile.exchangeRates.push(updatedRate);
          continue;
        }
        for (const existingRate of salesFile.exchangeRates) {
          if (existingRate.from === updatedRate.from) {
            existingRate.rate = updatedRate.rate;
          }
        }
      }
    }
    // Financial File
    if (updates.appleSpecific.withFinancialFile && updates.appleSpecific.ids.includes(salesFileId)) {
      salesFile.invalidFields.customAdditionalFile = false;
    }

    return salesFile;
  });

  const queries = updatedSalesFiles.map((updatedSalesFile) => ({
    updateOne: {
      filter: {
        _id: updatedSalesFile._id,
        clientId,
      },
      update: {
        $set: {
          targetPeriod: updatedSalesFile.targetPeriod,
          exchangeRates: updatedSalesFile.exchangeRates,
          overwriteFields: updatedSalesFile.overwriteFields,
          invalidFields: updatedSalesFile.invalidFields,
        },
      },
    },
  }));

  const dbQueryBatches = _.chunk(queries, 5);
  for (const batch of dbQueryBatches) {
    try {
      await SalesFile.bulkWrite(batch);
    } catch (err) {
      logger.error('Error updating batched Sales File fields in db', err);
      throw err;
    }
  }
};

SalesFileController.getFilterOptions = async ({ clientId }) => {
  const salesFiles = await SalesFile.find({
    clientId,
    $or: [
      { foreignId: { $exists: true, $ne: '' } },
      { targetPeriod: { $exists: true, $ne: '' } },
    ],
  }).select('targetPeriod foreignId').lean();
  const targetPeriods = _.uniq(salesFiles?.map((salesFile) => salesFile.targetPeriod).filter((tp) => tp));
  const foreignIds = _.uniq(salesFiles?.map((salesFile) => salesFile.foreignId).filter((fi) => fi));
  return {
    targetPeriods,
    foreignIds,
  };
};

SalesFileController.processFinancialFile = async ({ clientId, salesFileId, financialFileKey }) => {
  if (!clientId) throw new Error('Client ID required to retrieve home currency');
  const { homeCurrency } = await Client.findById(clientId, 'homeCurrency');

  const localFile = await new Promise((resolve, reject) => {
    fileManager.downloadFromS3(financialFileKey, S3_BUCKET, (err, localFile) => (err ? reject(err) : resolve(localFile)));
  })
    .catch((err) => {
      logger.error('Error downloading Financial File from S3:', err);
      throw err;
    });

  const fileData = await new Promise((resolve, reject) => {
    fileOpener.extractData(localFile, { tab: 0, delimiter: null, encoding: null }, (err, totalTabs, data) => {
      if (err) reject(err);
      else resolve(data);
    });
  })
    .catch((err) => {
      logger.error('Error extracting data from local Financial File:', err);
      throw err;
    });

  if (!fileData || fileData?.length === 0) {
    const error = new Error('No data found in Financial File. Please check the file is valid.');
    logger.error(error);
    throw error;
  }

  const headerRow = fileData?.[2];
  if (!headerRow) {
    const error = new Error('No header row found in Financial File. Please check the file is valid.');
    logger.error(error);
    throw error;
  }

  try {
    const currencyColumnText = 'Bank Account Currency';
    const bankAccountCurrencyIndex = headerRow.indexOf(currencyColumnText);
    const uniqueCurrencyCodes = new Set();

    for (let i = 0; i < fileData.length; i += 1) {
      const row = fileData[i];
      if (row[bankAccountCurrencyIndex] && row[bankAccountCurrencyIndex] !== currencyColumnText) {
        // If the value is >3 chars it's probably not a currency code, so we can ignore it
        if (row[bankAccountCurrencyIndex].length > 3) continue;
        uniqueCurrencyCodes.add(row[bankAccountCurrencyIndex]);
      }
    }

    const currencyCodes = Array.from(uniqueCurrencyCodes).filter((code) => code !== homeCurrency);

    return {
      salesFileId,
      currencyCodes,
    };
  } catch (err) {
    logger.error('Failed to parse currency codes in Financial File:', err);
    throw err;
  }
};

/**
 * Create a Sales Ingestion task and send it to the processor.
 * @param {User} curveUser The user making the request
 * @param {string} id The ID of the Sales File to ingest
 * @return {Promise<void>} A promise. Once it is resolved, then the ingestion process has started
 */
SalesFileController.runIngestion = async (curveUser, id) => {
  const salesFile = await SalesFile.findById(id);

  if (!salesFile) {
    throw new CurveError({ message: `Could not find SalesFile with ID ${id}`, statusCode: '404' });
  } else if (await UserAccess.isUserForbidden({ Payee, user: curveUser, operation: 'write', type: 'sales', document: salesFile, clientOnly: true })) {
    throw new CurveError({ message: 'Forbidden', statusCode: '403' });
  } else {
    await new Promise((resolve, reject) => {
      // Careful here - createIngestTask is async and can throw errors, as well as return errors through the callback
      salesFile.createIngestTask(1, curveUser, (errSalesFileTask) => {
        if (errSalesFileTask) {
          if (errSalesFileTask.message === 'This sales file cannot be reingested as it is already in progress') {
            reject(new CurveError({ message: errSalesFileTask.message, statusCode: '201' }));
          } else {
            logger.error(errSalesFileTask);
            reject(new CurveError({
              message: errSalesFileTask.message,
              statusCode: '500',
              userMessage: INTERNAL_ERROR,
              cause: errSalesFileTask,
            }));
          }
        } else {
          resolve();
        }
      })
        .catch(reject);
    });

    // Send Slack Notification
    const client = await Client.findById(curveUser.clientId);
    if (client?.operations?.hypercare) {
      await HyperCare.notifyIngestion({ client, salesFile });
    }
  }
};

module.exports = SalesFileController;
