/* eslint-disable no-continue */
/* eslint-disable no-await-in-loop */
require('dotenv').config();
require('../../models/db');
const { logger, BigQuery, databaseUtils } = require('@curveroyaltysystems/platform-shared-utils');
const _ = require('lodash');
const fs = require('fs');
const appRootDir = require('app-root-dir').get();
const async = require('async');

const Client = require('../../models/client');
const Statement = require('../../models/statement');
const SalesFile = require('../../models/salesFile');

async function main() {
  console.time('findStatementsWithMissingSalesFiles');
  try {
    const clients = await Client.find({}, { _id: 1, name: 1, bigQueryDataset: 1, bigQuerySalesTable: 1 }).lean();
    logger.debug('Clients to check:', clients.length);

    const filePath = `${appRootDir}/tmp/statements-with-missing-sales-files.csv`;
    const stream = fs.createWriteStream(filePath);
    stream.write('Client ID,Client Name,Statement ID,Statement Name,Sales File ID,Sales Lines,Statement Created At, Statement Updated At\n');

    const clientsById = _.keyBy(clients, (c) => c._id.toString());
    const batchedClients = _.chunk(clients, 50);

    for (const clientsBatch of batchedClients) {
      const clientIds = clientsBatch.map((c) => c._id);
      const statementsCount = await Statement.countDocuments(
        { clientId: { $in: clientIds }, salesFileIds: { $exists: true, $ne: [] } },
      ).lean();
      if (statementsCount === 0) {
        logger.debug('No statements found for client batch, skipping...');
        continue;
      }

      logger.debug('Found valid statements to check:', statementsCount);
      const [
        statements,
        salesFiles,
      ] = await Promise.all([
        Statement.find(
          { clientId: { $in: clientIds }, salesFilesIds: { $exists: true, $ne: [] } },
          { _id: 1, clientId: 1, salesFilesIds: 1, name: 1, createdAt: 1, updatedAt: 1 },
        ).lean(),
        SalesFile.find({ clientId: { $in: clientIds } }, { _id: 1 }).lean(),
      ]);

      const salesFilesById = _.keyBy(salesFiles, (sf) => sf._id.toString());
      const missingSalesFiles = [];
      for (const statement of statements) {
        for (const salesFileId of statement.salesFilesIds) {
          if (!salesFilesById[salesFileId.toString()]) {
            missingSalesFiles.push({ ...statement, salesFileId });
          }
        }
      }

      if (missingSalesFiles.length === 0) {
        logger.debug('No missing sales files for client, skipping...');
        continue;
      }
      logger.debug('Statements found with missing sales files:', missingSalesFiles.length);

      const statementsByClient = _.groupBy(missingSalesFiles, (s) => s.clientId);

      await async.eachLimit(Object.keys(statementsByClient), 10, async (clientId) => {
        const client = clientsById[clientId];
        const statements = statementsByClient[clientId];
        logger.debug('Checking if sales lines exist for files in client:', client.name, client._id.toString());

        const bq = new BigQuery(databaseUtils.getBigQueryOpts(client));
        const missingSalesFileIds = _.uniq(statements.map((s) => s.salesFileId.toString()));

        const query = {
          query: `
              SELECT salesFileId, COUNT(*) AS row_count
              FROM \`${bq.datasetName}.${bq.inputTable}\`
              WHERE 
                salesFileId IN UNNEST(@salesFileIds)
              GROUP BY salesFileId
              HAVING row_count > 0
          `,
          params: {
            salesFileIds: missingSalesFileIds,
          },
        };
        const filesWithNoSalesLines = await bq.queryJobPromise({ query });
        const idsWithNoSalesLines = filesWithNoSalesLines.map((r) => r.salesFileId);

        const statementsWithBadIds = statements.filter((s) => idsWithNoSalesLines.includes(s.salesFileId));
        logger.debug('Statements with missing sales lines:', statementsWithBadIds.length);

        for (const statement of statementsWithBadIds) {
          const lineCount = filesWithNoSalesLines.find((r) => r.salesFileId === statement.salesFileId)?.row_count;
          const row = [
            client._id.toString(),
            sanitiseForCsv(client.name),
            statement._id.toString(),
            sanitiseForCsv(statement.name),
            statement.salesFileId.toString(),
            lineCount,
            statement.createdAt?.toString() ?? null,
            statement.updatedAt?.toString() ?? null,
          ].join(',');
          stream.write(`${row}\n`);
        }
      });
    }

    stream.end();
    logger.debug('CSV file written to:', filePath);
  } catch (error) {
    logger.error('Error finding statements with missing sales files:', error);
  } finally {
    console.timeEnd('findStatementsWithMissingSalesFiles');
    process.exit();
  }
}

function sanitiseForCsv(str) {
  if (typeof str !== 'string') str = String(str);
  // Escape double quotes by doubling them
  const escaped = str.replace(/"/g, '""');
  // If the string contains special characters, wrap in quotes
  if (/[",\n\r]/.test(escaped)) return `"${escaped}"`;
  return escaped;
}

main();
