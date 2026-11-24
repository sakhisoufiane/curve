const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const { ObjectId } = require('mongodb');

const SalesGroupLines = require('../../../models/salesGroupLines');

const buildSalesLinesFilterTableName = async ({ client, period, statement, processType }) => {
  if (!period || (statement && !statement._id)) {
    throw (new Error('missing required parameters in buildSalesLinesFilterTableName'));
  }
  const alphaNumericName = (client.name + process.env.environmentName).replace(/[^0-9a-z]/gi, '');
  const statementString = statement ? `Statement_${statement._id.toString()}_` : '';
  const processTypeString = processType ? `__${processType}` : '';
  const salesLinesFilterTableName = `${alphaNumericName}TempSalesLinesFilterTableForPeriod_${period._id.toString()}_${statementString}${period.year}${period.accountingPeriod}${processTypeString}`;
  return salesLinesFilterTableName;
};

const createSalesLinesFilterTable = async ({ client, period, statement, bigQuery, processType }) => {
  if (!period || !bigQuery) {
    throw (new Error('period & bigQuery parameters are required in createSalesLinesFilterTable'));
  }
  if (!client.features?.suspense || period.contractType === 'MCPS') {
    return;
  }
  const clientId = client._id.toString();

  logger.info(`${period._id} Creating Sales Lines Filter Table`);

  const TABLE_EXPIRATION_TIMESTAMP = 'TIMESTAMP_ADD(CURRENT_TIMESTAMP(), INTERVAL 96 HOUR)'; // Default to 4 Days

  const salesLinesFilterTableName = await buildSalesLinesFilterTableName({ client, period, statement, processType });

  const query = `
      CREATE OR REPLACE TABLE \`${bigQuery.datasetName}.${salesLinesFilterTableName}\` (
        id STRING NOT NULL,
        salesGroupId STRING NOT NULL,
        calculate BOOLEAN NOT NULL,
      )
      OPTIONS(expiration_timestamp = ${TABLE_EXPIRATION_TIMESTAMP})
    `;
  await bigQuery.queryJobPromise({
    query,
    labels: {
      period_id: period._id.toString(),
      type: 'temp_sales_lines_filter_table',
    },
  });

  await new Promise((resolve, reject) => {
    bigQuery.setupFile((errSetup) => {
      if (errSetup) {
        return reject(errSetup);
      }
      resolve();
    });
  });

  // Suspense TODO (after MVP): we actually need to see if we can do a partial on modified Resolved Groups here instead.

  // get all salesGroupLines docs that match period.resolvedGroupIds
  if (period.resolvedGroupIds?.length) {
    const resolvedCursor = await SalesGroupLines.find(
      {
        clientId,
        salesGroupId: { $in: period.resolvedGroupIds.map((id) => new ObjectId(id)) },
      },
    ).cursor({ batchSize: 1000 });

    // write all lines to temp table, with flag `calculate`: true
    for await (const doc of resolvedCursor) {
      const rows = doc.salesLineIds?.map((line) => ({
        id: line,
        salesGroupId: doc.salesGroupId,
        calculate: true,
      }));
      await new Promise((resolve, reject) => {
        bigQuery.writeToFile(rows, (errWriteToFile) => {
          if (errWriteToFile) {
            return reject(errWriteToFile);
          }
          resolve();
        });
      });
    }
  }

  // get all salesGroupLines docs that match period.salesFileIds, but do not match salesGroupId within period.resolvedSalesGroupIds
  const suspenseCursor = await SalesGroupLines.find(
    {
      // not using type: 'suspense' here as we don't want resolved group lines that are not included in the period
      clientId,
      salesFileId: { $in: period.salesFilesIds },
      salesGroupId: { $nin: period.resolvedGroupIds },
    },
  ).cursor({ batchSize: 1000 });

  // write all lines to temp table, with flag: calculate: false
  for await (const doc of suspenseCursor) {
    const rows = doc.salesLineIds?.map((line) => ({
      id: line,
      salesGroupId: doc.salesGroupId,
      calculate: false,
    }));
    await new Promise((resolve, reject) => {
      bigQuery.writeToFile(rows, (errWriteToFile) => {
        if (errWriteToFile) {
          return reject(errWriteToFile);
        }
        resolve();
      });
    });
  }

  // write data file to Temp Table
  await new Promise((resolve, reject) => {
    bigQuery.writeFileToDb(salesLinesFilterTableName, (errWfToDb) => {
      if (errWfToDb) {
        return reject(errWfToDb);
      }
      resolve();
    });
  });
};

const deleteSalesLinesFilterTable = async ({ client, period, statement, processType, bigQuery }) => {
  if (!period || !bigQuery) {
    throw (new Error('period & bigQuery parameters are required in deleteSalesLinesFilterTable'));
  }
  if (!client.features?.suspense || period.contractType === 'MCPS') {
    return;
  }

  const salesLinesFilterTableName = await buildSalesLinesFilterTableName({ client, period, statement, processType });

  logger.info(`${period._id} Deleting Sales Lines Filter Table: ${salesLinesFilterTableName}`);
  await new Promise((resolve, reject) => {
    bigQuery.deleteTable(salesLinesFilterTableName, (err) => {
      if (err) reject(err);
      resolve();
    });
  });
};

module.exports = {
  buildSalesLinesFilterTableName,
  createSalesLinesFilterTable,
  deleteSalesLinesFilterTable,
};
