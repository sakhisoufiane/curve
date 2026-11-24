/* eslint-disable no-await-in-loop */

const { logger, BigQuery, databaseUtils } = require('@curveroyaltysystems/platform-shared-utils');
const _ = require('lodash');
const async = require('async');
const moment = require('moment');
const helpers = require('../helpers');
const SalesFile = require('../../../models/salesFile');
const SalesGroupLines = require('../../../models/salesGroupLines');
const SalesGroup = require('../../../models/salesGroup');
const Period = require('../../../models/period');
const Client = require('../../../models/client');

// Threshold for when to move ID lists to temp tables in BigQuery. Performance of using params degrades around 25_000 IDs compared to used temp tables.
// Additionally, temp tables are reused for identical ID lists within a 30 minute window to avoid unnecessary table creation and improve performance of subsequent filtering and updates
const TEMP_TABLE_THRESHOLD = 25_000;

const processUpdates = async (client, filter, data) => {
  // Need to update the modified date for affected salesfiles to ensure these are picked up in recalculation
  // - Alternatively we could select and return the salesFileId on the initial get and pass it through however stuck with this as
  // - it reduces the volume of data returned in the get and only creates extra work when updates are actually saved
  const bigQuery = new BigQuery(databaseUtils.getBigQueryOpts(client));
  const clientId = client._id.toString();
  try {
    const { filter: bqFilter, filterParams } = await salesHelpers.getBigQueryFilter({ filter, bigQuery, clientName: client.name, clientId });
    const query = `SELECT DISTINCT salesFileId FROM \`${bigQuery.datasetName}.${bigQuery.inputTable}\` WHERE ${bqFilter}`;

    const result = await bigQuery.queryJobPromise({ query: { query, params: filterParams }, labels: { client_id: clientId ?? '', job_type: 'api_sales_query_distinct' } });
    const salesFileIds = result?.map((row) => row.salesFileId);

    const salesLines = await salesHelpers.getSales({ bigQuery, select: ['id'], bqFilter, filterParams, options: {}, clientId });

    if (!salesLines?.length) {
      logger.info(`${clientId}: Filter returned no sales lines to update: ${JSON.stringify(filter)}`);
      return ({ status: 304, message: 'Filter returned no sales lines to update' });
    }

    if (salesFileIds?.length) {
      logger.debug({ salesFileIds });
      // Update the sales file first - if this errors we should not proceed as recalculation could be compromised
      // If this succeeds but the BQ update fails -  worst case we rerun a sales file we didn't need to on a recalc (likely user will redo update anyway)
      await SalesFile.updateMany({ clientId, _id: { $in: salesFileIds } }, { $set: { updatedAt: new Date() } });

      // update Sales Groups containing the updated Sales Lines
      await salesHelpers.updateSalesGroupsFromSalesLineIds({ salesLines, salesFileIds, clientId });

      await salesHelpers.updateSales({ bigQuery, update: data, bqFilter, filterParams, clientId });
      return ({ status: 200, message: 'Successfully updated' });
    }
    logger.error(new Error(`${clientId}: Failed to update salesFile updated dates for affected sales lines: ${JSON.stringify(filter)}`));
    return ({ status: 500, message: 'Internal error, please try again' });
  } catch (err) {
    logger.error(new Error(`${clientId}: Failed to process updates to sales lines: ${JSON.stringify(filter)}`), err);
    return ({ status: 500, message: 'Internal error, please try again' });
  }
};

const escapeCharacters = (value) => {
  if (typeof value === 'string') {
    return value.replace(/'/g, "\\'").replace(/"/g, '\\"');
  }
  return value;
};

const paramsToFilterField = async (clientId, inputParams, client) => {
  const params = {};
  if (inputParams.csv) {
    if (inputParams.releaseIds) { params['Input.releaseId'] = { $in: inputParams.releaseIds }; }
    if (inputParams.trackIds) { params['Input.trackId'] = { $in: inputParams.trackIds }; }
    if (inputParams.workIds) { params['Input.workId'] = { $in: inputParams.workIds }; }
    if (inputParams.contractId) { params['Input.contractId'] = { $in: inputParams.contractId }; }
  } else {
    if (inputParams.releaseIds) { params.releaseId = { $in: inputParams.releaseIds }; }
    if (inputParams.trackIds) { params.trackId = { $in: inputParams.trackIds }; }
    if (inputParams.workIds) { params.workId = { $in: inputParams.workIds }; }
    if (inputParams.contractId) { params.contractId = { $in: inputParams.contractId }; }
  }
  if (inputParams.catType) { params.catType = inputParams.catType; }
  if (inputParams.partitionNo) { params.partitionNo = parseInt(inputParams.partitionNo); }
  if (inputParams.trackTitle) { params.originalTrackTitle = escapeCharacters(inputParams.trackTitle); }
  if (inputParams.originalTrackTitle) { params.originalTrackTitle = escapeCharacters(inputParams.originalTrackTitle); }
  if (inputParams.trackArtist) { params.originalTrackArtist = escapeCharacters(inputParams.trackArtist); }
  if (inputParams.originalTrackArtist) { params.originalTrackArtist = escapeCharacters(inputParams.originalTrackArtist); }
  if (inputParams.releaseArtist) { params.originalReleaseArtist = escapeCharacters(inputParams.releaseArtist); }
  if (inputParams.originalReleaseArtist) { params.originalReleaseArtist = escapeCharacters(inputParams.originalReleaseArtist); }
  if (inputParams.releaseTitle) { params.originalReleaseTitle = escapeCharacters(inputParams.releaseTitle); }
  if (inputParams.originalReleaseTitle) { params.originalReleaseTitle = escapeCharacters(inputParams.originalReleaseTitle); }
  if (inputParams.barcode) { params.barcode = escapeCharacters(inputParams.barcode); }
  if (inputParams.catNo) { params.catNo = escapeCharacters(inputParams.catNo); }
  if (inputParams.isrc) { params.isrc = escapeCharacters(inputParams.isrc); }
  if (inputParams.territory) { params.territory = escapeCharacters(inputParams.territory); }
  if (inputParams.distributionChannel) { params.distributionChannel = escapeCharacters(inputParams.distributionChannel); }
  if (inputParams.configuration) { params.configuration = escapeCharacters(inputParams.configuration); }
  if (inputParams.source) { params.source = escapeCharacters(inputParams.source); }
  if (inputParams.subSource) { params.subSource = escapeCharacters(inputParams.subSource); }
  if (inputParams.status) { params.status = inputParams.status; }
  if (inputParams.originalIdentifier) { params.originalIdentifier = escapeCharacters(inputParams.originalIdentifier); }
  if (inputParams.originalWorkTitle) { params.originalWorkTitle = escapeCharacters(inputParams.originalWorkTitle); }
  if (inputParams.originalComposers) { params.originalComposers = escapeCharacters(inputParams.originalComposers); }
  if (inputParams.iswc) { params.iswc = escapeCharacters(inputParams.iswc); }
  if (inputParams.tunecode) { params.tunecode = escapeCharacters(inputParams.tunecode); }
  if (inputParams.salesFileId) { params.salesFileId = inputParams.salesFileId; }
  if (inputParams.salesFileIds) { params.salesFileId = { $in: inputParams.salesFileIds }; }
  if (inputParams.alternativeId) { params.alternativeId = inputParams.alternativeId; }
  // Pass all FilterType keys automatically
  Object.keys(inputParams).forEach((key) => {
    if (key.endsWith('FilterType')) {
      // retain the original FilterType key value for bigQuery filter
      params[key] = inputParams[key];
      // for csv exports we need to prefix the key with Input. to match the input table alias used in the join query
      if (inputParams.csv) {
        params[`Input.${key}`] = inputParams[key];
      }
    }
  });
  if (!params.salesFileId && !inputParams.targetPeriod && !inputParams.periodIds) {
    const salesFiles = await SalesFile.find({ clientId }, { _id: 1 }).lean();
    const salesFileIds = salesFiles.map((salesFile) => salesFile._id.toString());
    params.salesFileId = { $in: salesFileIds };
  }
  if (inputParams.targetPeriod) {
    const targetPeriods = inputParams.targetPeriod.reduce((rest, targetPeriod) => {
      if (targetPeriod === 'unassigned') return [...rest, null, ''];
      return [...rest, targetPeriod];
    }, []);
    const filter = { clientId, targetPeriod: { $in: targetPeriods } };
    const targetPeriodSalesFiles = await SalesFile.find(filter, { _id: 1 }).lean();
    const targetPeriodSalesFileIds = targetPeriodSalesFiles.map(({ _id }) => _id.toString());
    params.$and = [{ salesFileId: { $in: targetPeriodSalesFileIds } }];
  }
  if (inputParams.periodIds) {
    if (!client?.features) {
      client = await Client.findById(clientId).select('features.suspense').lean();
    }
    const suspenseIsActive = client?.features?.suspense;
    const periodProjection = { salesFilesIds: 1, _id: 0 };
    if (suspenseIsActive) periodProjection.resolvedGroupIds = 1;

    const periods = await Period.find({ _id: { $in: inputParams.periodIds } }, periodProjection).lean();
    const allSalesFilesIds = [...new Set(periods.flatMap((p) => p.salesFilesIds || []))];
    const allResolvedGroupIds = [...new Set(periods.flatMap((p) => p.resolvedGroupIds || []))];

    let allResolvedGroupLines = [];
    if (allResolvedGroupIds.length) {
      const resolvedFilter = {
        clientId,
        type: 'resolved',
        salesGroupId: { $in: allResolvedGroupIds },
        salesFileIds: { $nin: allSalesFilesIds },
      };
      const resolvedGroupLines = await SalesGroupLines.find(resolvedFilter, { salesLineIds: 1, _id: 0 }).lean();
      allResolvedGroupLines = resolvedGroupLines?.flatMap((line) => line.salesLineIds);
    }
    params.$or = [
      { id: allResolvedGroupLines.length ? { $in: allResolvedGroupLines } : null },
      { salesFileId: allSalesFilesIds.length ? { $in: allSalesFilesIds } : null },
    ];
  }
  if (inputParams.suspenseGroupIds?.length || inputParams.resolvedGroupIds?.length) {
    const filter = {
      clientId,
      salesGroupId: { $in: inputParams.suspenseGroupIds?.length ? inputParams.suspenseGroupIds : inputParams.resolvedGroupIds },
      type: inputParams.suspenseGroupIds?.length ? 'suspense' : 'resolved',
    };
    const salesGroupLines = await SalesGroupLines.find(filter, { salesLineIds: 1 }).lean();
    const allSalesLineIds = salesGroupLines?.flatMap((line) => line.salesLineIds);
    params.id = allSalesLineIds.length ? { $in: allSalesLineIds } : null;
  }
  return params;
};

const updateParams = (inputParams) => {
  const params = {};
  if (inputParams.catType) { params.catType = inputParams.catType; }
  if (inputParams.distributionChannel) { params.distributionChannel = escapeCharacters(inputParams.distributionChannel); }
  if (inputParams.configuration) { params.configuration = escapeCharacters(inputParams.configuration); }
  if (inputParams.priceCategory) { params.priceCategory = escapeCharacters(inputParams.priceCategory); }
  if (inputParams.source) { params.source = escapeCharacters(inputParams.source); }
  if (inputParams.subSource) { params.subSource = escapeCharacters(inputParams.subSource); }
  if (inputParams.originalTrackTitle) { params.originalTrackTitle = escapeCharacters(inputParams.originalTrackTitle); }
  if (inputParams.originalTrackArtist) { params.originalTrackArtist = escapeCharacters(inputParams.originalTrackArtist); }
  if (inputParams.originalReleaseArtist) { params.originalReleaseArtist = escapeCharacters(inputParams.originalReleaseArtist); }
  if (inputParams.originalReleaseTitle) { params.originalReleaseTitle = escapeCharacters(inputParams.originalReleaseTitle); }
  if (inputParams.barcode) { params.barcode = escapeCharacters(inputParams.barcode); }
  if (inputParams.catNo) { params.catNo = escapeCharacters(inputParams.catNo); }
  if (inputParams.isrc) { params.isrc = escapeCharacters(inputParams.isrc); }
  if (inputParams.identifier) { params.identifier = escapeCharacters(inputParams.identifier); }
  if (inputParams.territory) { params.territory = escapeCharacters(inputParams.territory); }
  if (inputParams.currency) { params.originalCurrency = inputParams.currency; }
  if (inputParams.exchangeRate || inputParams.exchangeRate === 0) { params.exchangeRate = parseFloat(inputParams.exchangeRate); }
  if (inputParams.saleDate) { params.saleDate = moment(inputParams.saleDate).format('YYYY-MM-DD'); }
  if (inputParams.transactionDate) { params.transactionDate = moment(inputParams.transactionDate).format('YYYY-MM-DD'); }
  if (inputParams.releaseId) { params.releaseId = inputParams.releaseId; }
  if (inputParams.trackId) { params.trackId = inputParams.trackId; }
  if (inputParams.workId) { params.workId = inputParams.workId; }
  if (inputParams.contractId) { params.contractId = inputParams.contractId; }
  if (inputParams.status) { params.status = inputParams.status; }
  logger.debug(params);
  return params;
};

const updateSaleObjectWithParams = (sale, inputParams) => {
  if (inputParams.catType) { sale.catType = inputParams.catType; }
  if (inputParams.distributionChannel) { sale.distributionChannel = escapeCharacters(inputParams.distributionChannel); }
  if (inputParams.configuration) { sale.configuration = escapeCharacters(inputParams.configuration); }
  if (inputParams.priceCategory) { sale.priceCategory = escapeCharacters(inputParams.priceCategory); }
  if (inputParams.source) { sale.source = escapeCharacters(inputParams.source); }
  if (inputParams.subSource) { sale.subSource = escapeCharacters(inputParams.subSource); }
  if (inputParams.originalTrackTitle) { sale.originalTrackTitle = escapeCharacters(inputParams.originalTrackTitle); }
  if (inputParams.originalTrackArtist) { sale.originalTrackArtist = escapeCharacters(inputParams.originalTrackArtist); }
  if (inputParams.originalReleaseArtist) { sale.originalReleaseArtist = escapeCharacters(inputParams.originalReleaseArtist); }
  if (inputParams.originalReleaseTitle) { sale.originalReleaseTitle = escapeCharacters(inputParams.originalReleaseTitle); }
  if (inputParams.barcode) { sale.barcode = escapeCharacters(inputParams.barcode); }
  if (inputParams.catNo) { sale.catNo = escapeCharacters(inputParams.catNo); }
  if (inputParams.isrc) { sale.isrc = escapeCharacters(inputParams.isrc); }
  if (inputParams.identifier) { sale.identifier = escapeCharacters(inputParams.identifier); }
  if (inputParams.territory) { sale.territory = escapeCharacters(inputParams.territory); }
  if (inputParams.exchangeRate) { sale.exchangeRate = escapeCharacters(inputParams.exchangeRate); }
  if (inputParams.saleDate) { sale.saleDate = moment(inputParams.saleDate).format('YYYY-MM-DD'); }
  if (inputParams.transactionDate) { sale.transactionDate = moment(inputParams.transactionDate).format('YYYY-MM-DD'); }
  if (inputParams.releaseId) { sale.releaseId = inputParams.releaseId; }
  if (inputParams.trackId) { sale.trackId = inputParams.trackId; }
  if (inputParams.workId) { sale.workId = inputParams.workId; }
  if (inputParams.contractId) { sale.contractId = inputParams.contractId; }
  if (inputParams.status) { sale.status = inputParams.status; }
  return sale;
};

const getBigQueryFilter = async ({ filter, bigQuery, clientName, clientId }) => {
  const filterStr = bigQuery.filterFromObject(filter);
  const { filterStr: filterOut, filterParams, idsTotal } = salesHelpers.convertAllIdsToParams(filterStr);
  if (idsTotal > TEMP_TABLE_THRESHOLD) {
    const filterWithTempTables = await salesHelpers.moveIdsToTempTables({ filterStr: filterOut, filterParams, bigQuery, clientName, clientId });
    return { filter: filterWithTempTables };
  }
  return {
    filter: filterOut,
    filterParams,
  };
};

const convertAllIdsToParams = (filterStr) => {
  const filterParams = {};
  let idsTotal = 0;
  const regex = /(id IN|id NOT IN) \(([^)]+)\)/g;
  const matches = [...filterStr.matchAll(regex)];

  for (const [index, [match, operator, ids]] of matches.entries()) {
    const idList = ids.split(',').map((id) => id.trim().replace(/['"]/g, ''));
    const paramName = `ids${index}`;
    filterStr = filterStr.replace(match, `${operator} UNNEST(@${paramName})`);
    filterParams[paramName] = idList;
    idsTotal += idList.length;
  }
  return { filterStr, filterParams, idsTotal };
};

const moveIdsToTempTables = async ({ filterStr, filterParams, bigQuery, clientName, clientId }) => {
  const tempTableNames = {};
  for (const [paramName, ids] of Object.entries(filterParams)) {
    const schema = [
      {
        name: 'id',
        type: 'STRING',
        mode: 'REQUIRED',
      },
    ];
    const expirationTime = Date.now() + 30 * 60 * 1000; // 30 minute expiry
    const alphaNumericName = (clientName + process.env.environmentName).replace(/[^0-9a-z]/gi, '');
    const hashFromIds = helpers.hashArrayOfStrings(ids);
    const tempTableName = `${alphaNumericName}TempSalesLinesApi_${hashFromIds}`;
    const [tableExists] = await bigQuery.client.dataset(bigQuery.datasetName).table(tempTableName).exists();
    if (!tableExists) {
      const tempTable = await bigQuery.createTempTable({ tableName: tempTableName, schema, partitionColumn: null, expirationTime, randomizeName: false });
      logger.info(`${clientId} - Creating temp table ${tempTableName} for filter with ${ids.length.toLocaleString()} ids`);
      const data = ids.map((id) => ({ id }));
      await new Promise((resolve, reject) => {
        bigQuery.setupFile((errSetup) => {
          if (errSetup) {
            return reject(errSetup);
          }
          bigQuery.writeToFile(data, (errWriteToFile) => {
            if (errWriteToFile) {
              return reject(errWriteToFile);
            }
            bigQuery.writeFileToDb(tempTable.id, (errWfToDb) => {
              if (errWfToDb) {
                return reject(errWfToDb);
              }
              resolve();
            });
          });
        });
      });
    } else {
      logger.info(`${clientId} - Reusing existing temp table ${tempTableName} for filter with ${ids.length.toLocaleString()} ids`);
      const [existingTable] = await bigQuery.client.dataset(bigQuery.datasetName).table(tempTableName).get();
      if (parseInt(existingTable.metadata.expirationTime, 10) < (expirationTime - 10 * 60 * 1000)) {
        logger.info(`${clientId} - Extending expiry of temp table ${tempTableName}`);
        await existingTable.setMetadata({ expirationTime });
      }
    }
    tempTableNames[paramName] = tempTableName;
  }

  let updatedFilterStr = filterStr;
  for (const paramName of Object.keys(tempTableNames)) {
    const regexMatch = updatedFilterStr.match(new RegExp(`(id IN|id NOT IN) UNNEST\\(@${paramName}\\)`));
    if (!regexMatch?.length > 1) {
      throw new Error(`${clientId} - Failed to find match for param ${paramName} in filter string after moving ids to temp table`);
    }
    const [match, operator] = regexMatch;
    updatedFilterStr = updatedFilterStr.replace(match, `${operator} ( SELECT id FROM \`${bigQuery.datasetName}.${tempTableNames[paramName]}\` )`);
  }
  return updatedFilterStr;
};

const getSales = ({ bigQuery, select, bqFilter, filterParams, options, clientId }) => {
  const salesQuery = bigQuery.getDataQuery(bigQuery.inputTable, select, bqFilter, options);
  return bigQuery.queryJobPromise({ query: { query: salesQuery, params: filterParams }, labels: { client_id: clientId ?? '', job_type: 'api_sales_query' } });
};

const getCount = async ({ bigQuery, bqFilter, filterParams, clientId }) => {
  const countQuery = `SELECT SUM(1) AS count FROM \`${bigQuery.datasetName}.${bigQuery.inputTable}\` WHERE ${bqFilter}`;
  const countResult = await bigQuery.queryJobPromise({ query: { query: countQuery, params: filterParams }, labels: { client_id: clientId ?? '', job_type: 'api_sales_query_count' } });
  return countResult[0]?.count;
};

const updateSales = async ({ bigQuery, update, bqFilter, filterParams, clientId }) => {
  if (!update || Object.keys(update).length === 0) {
    return;
  }
  let query = `UPDATE \`${bigQuery.datasetName}.${bigQuery.inputTable}\` SET `;
  if (typeof update === 'object') {
    query += Object.keys(update).filter((key) => update[key]).map((key) => (`${key} = "${update[key]}"`)).join(', ');
  } else {
    query += update;
  }
  // Add filter
  query += ` WHERE ${bqFilter}`;
  await bigQuery.queryJobPromise({ query: { query, params: filterParams }, labels: { client_id: clientId ?? '', job_type: 'api_sales_update' } });
};

const updateSalesGroupsFromSalesLineIds = async ({ salesLines, salesFileIds, clientId }) => {
  if (!salesLines) {
    return;
  }
  const ids = salesLines.map((line) => line.id);
  const BATCH_SIZE = 10_000;
  let salesGroupsToUpdate = [];
  if (ids.length > BATCH_SIZE * 10) {
    const idsSet = new Set(ids);
    const cursor = SalesGroupLines.find({
      clientId,
      salesFileId: { $in: salesFileIds },
    }, { salesLineIds: 1, salesGroupId: 1 }).lean().cursor({ batchSize: 1000 });
    for await (const doc of cursor) {
      if (doc.salesLineIds.some((id) => idsSet.has(id))) {
        salesGroupsToUpdate = new Set([...salesGroupsToUpdate, doc.salesGroupId.toString()]);
      }
    }
  } else {
    const chunkedIds = _.chunk(ids, BATCH_SIZE);
    await async.eachLimit(chunkedIds, 1, async (chunk) => {
      const filter = {
        clientId,
        salesLineIds: { $in: chunk },
      };
      const salesGroupIds = await SalesGroupLines.distinct(
        'salesGroupId',
        filter,
      );
      salesGroupsToUpdate = new Set([...salesGroupsToUpdate, ...salesGroupIds.map((id) => id.toString())]);
    });
  }

  await async.eachLimit(salesGroupsToUpdate, 5, async (salesGroupId) => {
    const salesGroup = await SalesGroup.findById(salesGroupId);
    logger.debug('updating sales group :', salesGroup?.name);
    await salesGroup.save();
  });
};

const addGroupInfoToSales = async ({ clientId, sales }) => {
  if (!clientId || !sales || !sales.length) {
    return sales;
  }
  const salesGroupLines = await SalesGroupLines.find(
    { clientId, salesLineIds: { $in: sales.map((sale) => sale.id) } },
    { salesLineIds: 1, salesGroupId: 1, type: 1 },
  ).lean();
  const salesGroupIds = [...new Set(salesGroupLines.map((line) => (line.salesGroupId)))];
  const salesGroups = await SalesGroup.find({ _id: { $in: salesGroupIds } }, { name: 1 }).lean();
  const salesWithGroups = sales.map((sale) => {
    const groupLine = salesGroupLines.find((line) => line.salesLineIds.includes(sale.id));
    if (groupLine) {
      const groupName = salesGroups.find((group) => group._id.toString() === groupLine.salesGroupId.toString())?.name;
      return {
        ...sale,
        groupId: groupLine.salesGroupId.toString(),
        groupName,
        groupType: groupLine.type,
      };
    }
    return sale;
  });
  return salesWithGroups;
};

const salesHelpers = {
  processUpdates,
  escapeCharacters,
  paramsToFilterField,
  updateParams,
  updateSaleObjectWithParams,
  getBigQueryFilter,
  getSales,
  getCount,
  updateSales,
  updateSalesGroupsFromSalesLineIds,
  addGroupInfoToSales,
  convertAllIdsToParams,
  moveIdsToTempTables,
};

module.exports = salesHelpers;
