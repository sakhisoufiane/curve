const { BigQuery, databaseUtils } = require('@curveroyaltysystems/platform-shared-utils');
const { Storage } = require('@google-cloud/storage');
const appRootDir = require('app-root-dir').get();
const moment = require('moment');
const { readFile } = require('node:fs/promises');
const Client = require('../models/client');
const knex = require('../db');
const { eachLimit } = require('async');
const fs = require('fs');

async function syncInputSales() {
  console.log('Syncing sales');
  const client = await Client.findOne({ _id: process.env.CURVE_CLIENT });
  const bigQuery = new BigQuery(databaseUtils.getBigQueryOpts(client));
  const count = await getCount(bigQuery, client);

  await syncData(bigQuery, client, count);
  
  console.log('Done syncing sales');
}


const getCount = async (bigQuery, client) => {
  const [result] = await new Promise((resolve, reject) => {
    bigQuery.query(
      `SELECT COUNT(*) as count
      FROM ${client.bigQueryDataset}.${client.bigQuerySalesTable}
      `
      , (err, result) => {
      err ? reject(err) : resolve(result);
    });
  });

  return result.count;
};

const syncData = async (bigQuery, client, count) => {
  const query= `SELECT * FROM ${client.bigQueryDataset}.${client.bigQuerySalesTable}`
  // const query= `SELECT * FROM SoufianeEscalationsClientStaging.SoufianeEscalationsClientStagingSales`

  const bucketName = 'output-sales-exports';
  const filename = `${client.bigQuerySalesTable}-${moment().format('x')}-export-`;
  const gsPath = `gs://${bucketName}/${filename}*.json`;
  const exportQuery = `EXPORT DATA OPTIONS( uri='${gsPath}', overwrite=true, format='JSON') AS ${query}`;
  const dateFields = ['saleDate', 'transactionDate', 'dateFrom', 'dateTo'];
  let processedLines = 0;

  await new Promise((resolve, reject) => {
    bigQuery.query(exportQuery, async (err) => {
      if (err) {
        reject(err);
      } else {
        // Process files
        const authOptions = { credentials: { client_email: process.env.BQ_client_email, private_key: (process.env.BQ_private_key) ? process.env.BQ_private_key.replace(/\\n/g, '\n') : '' } };
        const storage = new Storage(authOptions);
        // List all files on the bucket - files get deleted after 24h so shouldn't be an issue.
        const [files] = await storage.bucket(bucketName).getFiles();
        // Get files all wildcard files for this query
        const filesToProcess = files.filter((file) => file.name.includes(filename));
        console.log(`${filesToProcess.length} files to process`);
        // Loop through each file and add lines to the CSV
        await eachLimit(filesToProcess, 1, async (file) => {
          const destination = `${appRootDir}/tmp/${file.name}`;
          const options = { destination };
          await storage.bucket(bucketName).file(`${file.name}`).download(options);
          // Process file
          const fileData = await readFile(destination, 'utf8');
          const rawlines = fileData.split('\n').filter(Boolean); // remove any empty lines
          const lines = rawlines.map(line => JSON.parse(line));

          await eachLimit(lines, 10000, async (line) => {
            const cleanedLine = {};
            for (const key in line) {
              if (dateFields.includes(key)) {
                cleanedLine[key] = parseDate(line[key]);
              } else {
                cleanedLine[key] = sanitise(line[key]);
              }
            }
            cleanedLine.sales_line_id = cleanedLine.id;
            delete cleanedLine.id;
            await knex('input_sales').insert(cleanedLine);

            processedLines += 1;
            process.stdout.write(`\rProcessed ${processedLines}/${count} - ${((processedLines/count)*100).toFixed(2)}%`);
          })
          
          // Remove file.
          fs.unlinkSync(destination);
        });

        resolve();
      }
    });
  })
}

const sanitise = val => (val === undefined || val === null ? null : String(val));

const parseDate = val => {
  if (!val || val === '') return null;
  const d = new Date(val);
  return isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10); // 'YYYY-MM-DD'
};



module.exports = syncInputSales;
