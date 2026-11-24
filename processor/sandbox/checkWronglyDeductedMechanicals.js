require('../models/db');
const { BigQuery, logger } = require('@curveroyaltysystems/platform-shared-utils');
const { eachLimit } = require('async');
const Period = require('../models/period');
const Track = require('../models/track');
const Client = require('../models/client');
const { Storage } = require('@google-cloud/storage');
const { open } = require('node:fs/promises');
const appRootDir = require('app-root-dir').get();
const moment = require('moment');
const fs = require('fs');

(async () => {
    const clientsToExlude = ['5f57b8c40662c50025152e2c'];
    const clients = await Client.find({ _id: {$nin: clientsToExlude }});
    console.log(`${clients.length} to process..`);
    fs.appendFileSync('mechanicalDeductionsReport.csv', 'clientId, periodId, contractId, contractName, trackId, distributionChannel, configuration, priceCategory, territory, saleDate, transactionDate, source, subSource, units, homeCurrencyGrossAmount, homeCurrencyNetAmount, catalogueCatNo, mechanicalBasisPercentage, catalogueIsrc, objectPercentage, royaltyRate, reductionRate, deduction, deductionUnitRate, deductionRate, deductionCalculationType, deductionType, mechanicalAmount, mechanicalDeduction, mechanicalPercentage, mechanicalType, mechanicalDeductionType, mechanicalCurrency, contractCurrency, contractCurrencyCalculationInput, contractCurrencyDeduction, contractCurrencyDeductionUnitRate, contractCurrencyMechanicalDeduction, contractCurrencyCalculationOutput\n');
    await eachLimit(clients, 10, async (client) => {
        console.log(`Processing client ${clients.indexOf(client)}/${clients.length}`);
        const clientId = client._id.toString();
        const bigQuery = new BigQuery({ datasetName: client.bigQueryDataset, inputTable: client.bigQuerySalesTable, outputTable: client.bigQueryPeriodSales, costsTable: client.bigQueryPeriodCosts, accountingTable: client.bigQueryAccountingPeriodSales });
        const periods = await Period.find({clientId, createdAt: {$gte: '2023-07-10T07:20:24.136+00:00'}}).select('createdAt')
        const tracks = await Track.find({clientId, reportMechanicals: false}).select('_id')
        
        const jsonQuery = {
          periodId: {$in: periods.map(period => period._id.toString())}, 
          trackId: {$in: tracks.map(track => track._id.toString())},
          mechanicalDeduction: {$ne: 0},
          catType: 'Track',
        }
        
        let query = ` SELECT periodId, contractId, contractName, trackId, distributionChannel, configuration, priceCategory, territory, saleDate, transactionDate, source, subSource, units, homeCurrencyGrossAmount, homeCurrencyNetAmount, catalogueCatNo, mechanicalBasisPercentage, catalogueIsrc, objectPercentage, royaltyRate, reductionRate, deduction, deductionUnitRate, deductionRate, deductionCalculationType, deductionType, mechanicalAmount, mechanicalDeduction, mechanicalPercentage, mechanicalType, mechanicalDeductionType, mechanicalCurrency, contractCurrency, contractCurrencyCalculationInput, contractCurrencyDeduction, contractCurrencyDeductionUnitRate, contractCurrencyMechanicalDeduction, contractCurrencyCalculationOutput        FROM \`${client.bigQueryDataset}.${client.bigQueryPeriodSales}\`
        WHERE ${bigQuery.filterFromObject(jsonQuery)}
        LIMIT 100000000`;
      
        query = bigQuery.catalogueIdsToParams(query, 'trackId IN ', 'trackIds');
        const bucketName = process.env.GCS_OUTPUT_SALES_EXPORT ?? 'output-sales-exports';
        const filename = `${clientId}-${moment().format('x')}-export-`;
        const gsPath = `gs://${bucketName}/${filename}*.json`;
        query.query = `EXPORT DATA OPTIONS( uri='${gsPath}', overwrite=true, format='JSON') AS ${query.query}`
        await new Promise((resolve, reject) => {
          try {
            console.log('Processing client ', client._id.toString())
            bigQuery.query(query, async (err) => {
                if (err) {
                  logger.error(err);
                  callback(err);
                } else {
                  // Process files
                  const authOptions = { credentials: { client_email: process.env.BQ_client_email, private_key: (process.env.BQ_private_key) ? process.env.BQ_private_key.replace(/\\n/g, '\n') : '' } };
                  const storage = new Storage(authOptions);
                  // List all files on the bucket - files get deleted after 24h so shouldn't be an issue.
                  const [files] = await storage.bucket(bucketName).getFiles();
                  // Get files all wildcard files for this query
                  const filesToProcess = files.filter((file) => file.name.includes(filename));
                  logger.debug(`${filesToProcess.length} files to process`);
                  // Loop through each file and add lines to the CSV
                  for (const file of filesToProcess) {
                    const destination = `${appRootDir}/tmp/mechanicals/${client._id.toString()}`;
                    const options = { destination };
                    await storage.bucket(bucketName).file(`${file.name}`).download(options);
                    // Process file line by line
                    const data = await open(destination);
                    for await (const line of data.readLines()) {
                      const row = JSON.parse(line);
                      const csvLine = `${clientId},${row.periodId},${row.contractId},${row.contractName}.replaceAll(',', ' '),${row.trackId},${row.distributionChannel},${row.configuration},${row.priceCategory},${row.territory},${row.saleDate},${row.transactionDate},${row.source},${row.subSource},${row.units},${row.homeCurrencyGrossAmount},${row.homeCurrencyNetAmount},${row.catalogueCatNo},${row.mechanicalBasisPercentage},${row.catalogueIsrc},${row.objectPercentage},${row.royaltyRate},${row.reductionRate},${row.deduction},${row.deductionUnitRate},${row.deductionRate},${row.deductionCalculationType},${row.deductionType},${row.mechanicalAmount},${row.mechanicalDeduction},${row.mechanicalPercentage},${row.mechanicalType},${row.mechanicalDeductionType},${row.mechanicalCurrency},${row.contractCurrency},${row.contractCurrencyCalculationInput},${row.contractCurrencyDeduction},${row.contractCurrencyDeductionUnitRate},${row.contractCurrencyMechanicalDeduction},${row.contractCurrencyCalculationOutput}\n`
                      fs.appendFileSync('mechanicalDeductionsReport.csv', csvLine);
                    }
                  }
                  resolve();
                }
              });
          } catch (e) {
            resolve();
          }
        });
        console.log('Exported client ', client.name)
        
    })
    console.log('Done')

})();