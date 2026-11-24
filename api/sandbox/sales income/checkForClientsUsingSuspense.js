require('../../models/db');
const { logger, BigQuery, databaseUtils } = require('@curveroyaltysystems/platform-shared-utils');
const { makeTmpDir } = require('@curveroyaltysystems/platform-shared-utils/libs/testUtils');
const appRootDir = require('app-root-dir').get();
const fs = require('fs');
const Client = require('../../models/client');

async function run() {
  const clients = await Client.find().select({ _id: 1, name: 1, bigQueryDataset: 1, bigQuerySalesTable: 1, }).lean();
  logger.info(`\nChecking for sales lines with status 'Suspense' in a total of ${clients.length} clients\n`);
  const suspenseClients = [
    'Client Name\tClient ID\tTotal Suspense Lines\tSales File IDs'
  ];
  let count = 0;
  for (const client of clients) {
    count += 1;
    const bigQuery = new BigQuery(databaseUtils.getBigQueryOpts(client));
    const query = `SELECT COUNT(*) AS suspenseLines, salesFileId
      FROM \`${bigQuery.datasetName}.${bigQuery.inputTable}\` 
      WHERE status = "Suspense" GROUP BY salesFileId`;
    const result = await bigQuery.client.query(query).catch((_err) => {
      logger.info(`- no sales data for client '${client.name}'`)
    });
    if (result?.[0].length) {
      logger.info(`>> adding client '${client.name}'`);
      const rows = result[0];
      const allSalesFileIds = rows.map(row => row.salesFileId).join(', ');
      const totalSuspenseLines = rows.reduce((acc, row) => acc + row.suspenseLines, 0);
      suspenseClients.push(`${client.name}\t${client._id.toString()}\t${totalSuspenseLines}\t${allSalesFileIds}`);
    } else {
      logger.info(`- no suspense sales lines for client '${client.name}'`)
    }
  }
  makeTmpDir(`${appRootDir}/tmp`);
  fs.writeFileSync(`${appRootDir}/tmp/suspense-clients.txt`, suspenseClients.join('\n'));
  logger.info(`\nProcessed ${count} of ${clients.length} clients`);
  logger.info(`\nSuspense clients written to ${appRootDir}/tmp/suspense-clients.txt`);
  process.exit();
}

run();