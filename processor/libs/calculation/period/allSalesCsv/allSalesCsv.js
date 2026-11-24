/* eslint-disable no-loop-func */
/* eslint-disable no-promise-executor-return */
/* eslint-disable no-await-in-loop */
/* eslint-disable no-plusplus */
const { logger, BigQuery, fileManager, databaseUtils } = require('@curveroyaltysystems/platform-shared-utils');
const moment = require('moment');
const fs = require('fs');
const fsPromise = require('node:fs/promises');
const archiver = require('archiver');
const appRootDir = require('app-root-dir').get();

const Client = require('../../../../models/client');
const Period = require('../../../../models/period');
const Statement = require('../../../../models/statement');
const collectData = require('../../../writeCsv/collectDataNoAggregation');
const config = require('../../../../config.json');
const GoogleStorage = require('../../../../controllers/googleStorage');
const { sendBulkExportNotification } = require('../../../exportNotification/exportNotification');
const CsvExports = require('../../../exports/csv');
const { getExportBucketName } = require('./props');

// For large exports, this is the threshold that must be reached to generate multiple ZIPs instead of a single CSV file
// Each zipped CSV file will contain this many sales lines
const LINES_PER_FILE = 10_000_000;

async function create(periodId, email, linesPerFile = LINES_PER_FILE) {
  if (!periodId || !email) throw new Error('Missing required periodId and email for creating All Sales Export');
  const logKey = `${periodId} | All Sales CSV |`;

  try {
    const period = await Period.findById(periodId);
    if (!period) throw new Error(`No Period found with ID ${periodId}`);

    logger.info(logKey, 'Fetching client:', period.clientId);
    const { client, bigQuery, table, template, statementPartitionNos } = await getExportDetails(period);

    const filter = { contractPartitionNo: { $in: statementPartitionNos }, periodId: period._id.toString() };
    const date = moment().format('YYYYMMDDHHmmSSssss');
    const writeKey = `periods/${period._id.toString()}/${period.name} All Calculated Sales Export ${date}`;

    // Get row count of sales data so we know how many files will be needed (for large clients)
    const rowCount = await getTableCount(bigQuery, table, filter);
    const fileCount = Math.ceil(rowCount / linesPerFile);
    const fileKeys = createFileKeys(writeKey, fileCount);
    const isSingleFile = fileCount === 1;
    logger.info(logKey, 'Total sales lines to export:', rowCount);
    logger.info(logKey, 'Total output files:', fileCount);

    const bucketName = await getExportBucketName();
    const bucketFileName = `${table}-${period._id.toString()}-${moment().format('x')}-export-`;
    const googleStoragePath = `gs://${bucketName}/${bucketFileName}*.json`;

    const columns = collectData.getSelectAndSumColumnArray(template, filter);
    const headers = template.map((col) => col.header);

    const query = bigQuery.getDataQuery(table, columns.selectCols, filter);

    // Run the BigQuery export query
    logger.info(logKey, 'Running Query on BigQuery');
    console.time(logKey, 'Query Time');
    await runExportQuery({ bigQuery, googleStoragePath, query })
      .catch((err) => {
        logger.error(logKey, 'Error running query:', err);
        throw err;
      });
    logger.info(logKey, 'Query ran successfully');
    console.timeEnd(logKey, 'Query Time');

    // Download the export files and stream into the CSV writer
    console.time(logKey, 'Download Export Files');
    await downloadQueryExportFiles({
      bucketName,
      bucketFileName,
      template,
      fileKeys,
      headers,
      logKey,
      linesPerFile,
      onFileReady: async ({ fileKey, fileLocation }) => {
        // Upload the zipped file (or single CSV file) to S3
        const uploadWriteKey = isSingleFile ? fileKey.csv : fileKey.zip;
        logger.info(logKey, 'Uploading file to S3');
        await new Promise((resolve, reject) => {
          fileManager.uploadToS3(uploadWriteKey, fileLocation, (err, response) => {
            if (err) reject(err);
            else resolve(response);
          });
        });
      },
    })
      .catch((err) => {
        logger.error(logKey, 'Error exporting query data to output file:', err);
        throw err;
      });
    console.timeEnd(logKey, 'Download Export Files');

    // Generate public URLs for downloading files
    const s3FileKeys = fileKeys.map((fk) => (isSingleFile ? fk.csv : fk.zip));
    const urls = await getSignedS3Urls(s3FileKeys);

    // Save files keys on the period
    logger.info(logKey, 'Saving S3 file keys on Period');
    await saveFileKeys(period._id, period.clientId, s3FileKeys, urls.map(({ url }) => url));

    // Notify user that the download is ready
    await sendBulkExportNotification({
      exportName: 'All Sales',
      periodName: period.name,
      exportScope: 'period',
      urls,
      client,
      email,
      identifier: 'salesExportZips',
    });
  } catch (err) {
    logger.error(logKey, 'Failed to create Sales Export', err);
    throw err;
  }
}

async function getExportDetails(period) {
  const [
    client,
    statements,
  ] = await Promise.all([
    Client.findById(period.clientId),
    Statement.find({ clientId: period.clientId, periodId: period._id.toString() }, 'partitionNo').lean(),
  ]);
  const bigQuery = new BigQuery(databaseUtils.getBigQueryOpts(client));
  const statementPartitionNos = [...new Set(statements.map((statement) => statement.partitionNo))];

  let template = config.exportTemplates.sales;
  if (client.clientType === 'Publisher') template = config.exportTemplates.salesPublishing;
  if (period.contractType === 'Mechanical') template = config.exportTemplates.mechanicals;

  const table = client.bigQueryPeriodSales;
  return {
    client,
    bigQuery,
    template,
    table,
    statementPartitionNos,
  };
}

async function getTableCount(bigQuery, table, filter) {
  const [{ count }] = await new Promise((resolve, reject) => {
    bigQuery.getCount(table, 'count', filter, (err, count) => {
      if (err) reject(err);
      else resolve(count);
    });
  });
  return count;
}

function createCsvStream(fileKey) {
  const min = 100000;
  const max = 999999;
  const id = Math.floor(Math.random() * (max - min + 1)) + min;

  const fileName = `${id}-${fileKey.split('/').pop()}`;
  const fileLocation = `${appRootDir}/tmp/${fileName}`;
  if (!fs.existsSync(`${appRootDir}/tmp`)) fs.mkdirSync(`${appRootDir}/tmp`);

  const csvStream = fs.createWriteStream(fileLocation);
  return { csvStream, fileLocation, fileName };
}

function createZipStream(fileKey) {
  const min = 100000;
  const max = 999999;
  const id = Math.floor(Math.random() * (max - min + 1)) + min;

  const fileName = fileKey.split('/').pop();
  const fileLocation = `${appRootDir}/tmp/${id}-${fileName}`;

  const outputStream = fs.createWriteStream(fileLocation);
  const zipStream = archiver('zip', { zlib: { level: 9 } });
  zipStream.pipe(outputStream);

  return { outputStream, zipStream, fileLocation };
}

function createFileKeys(fileKey, fileCount) {
  if (fileCount === 1) return [{ csv: `${fileKey}.csv`, zip: `${fileKey}.zip` }];
  const fileKeys = [];
  for (let i = 0; i < fileCount; i++) {
    const fileIndex = (i + 1).toString().padStart(fileCount.toString().length + 1, '0');
    const fileName = `${fileKey} - ${fileIndex}`;
    fileKeys.push({ csv: `${fileName}.csv`, zip: `${fileName}.zip` });
  }
  return fileKeys;
}

async function runExportQuery({ bigQuery, googleStoragePath, query }) {
  const exportQuery = `EXPORT DATA OPTIONS(uri='${googleStoragePath}', overwrite=true, format='JSON') AS ${query}`;
  await new Promise((resolve, reject) => {
    bigQuery.query(exportQuery, (err, res) => {
      if (err) reject(err);
      else resolve(res);
    });
  });
}

async function downloadQueryExportFiles({
  bucketName,
  bucketFileName,
  template,
  fileKeys,
  headers,
  onFileReady,
  linesPerFile = LINES_PER_FILE,
  logKey,
}) {
  // Retrieve all files from the storage bucket
  const storage = new GoogleStorage(bucketName);
  const files = await storage.listAllFiles();
  if (!files.length) {
    logger.error(logKey, `No export files in bucket ${bucketName}`);
    throw new Error(`No export files found in bucket ${bucketName}`);
  }

  // Find files matching the previously ran export query
  const filesToDownload = files.filter((file) => file.name.includes(bucketFileName));
  if (!filesToDownload.length) {
    logger.error(logKey, `No export files found matching bucket filename ${bucketFileName}`);
    throw new Error(`No export files found matching bucket filename ${bucketFileName}`);
  }
  logger.info(logKey, 'Export files to download:', filesToDownload.length);

  let linesWritten = 0;
  let fileIndex = 0;
  const filesWritten = [];

  const finalizeCsvToZip = async ({ fileKey, csvFileLocation, csvFileName, csvStream }) => {
    await CsvExports.closeStream(csvStream);
    logger.info(logKey, 'Adding CSV to ZIP file:', csvFileLocation);

    const { fileLocation: zipFileLocation } = await zipFile({
      zipFileKey: fileKey.zip,
      fileToZipLocation: csvFileLocation,
      fileToZipName: csvFileName,
    });

    filesWritten.push({ fileKey, fileLocation: zipFileLocation });

    fs.unlinkSync(csvFileLocation);
    await onFileReady({ fileKey, fileLocation: zipFileLocation });
  };

  const startNewCsvStream = (fileKey) => {
    const { csvStream, fileLocation, fileName } = createCsvStream(fileKey.csv);
    CsvExports.writeCsvLine(csvStream, headers, { bom: true });
    logger.info(logKey, 'Created new CSV file stream:', fileLocation);
    return { csvStream, csvFileLocation: fileLocation, csvFileName: fileName };
  };

  let { csvStream, csvFileLocation, csvFileName } = startNewCsvStream(fileKeys[fileIndex]);

  for (let i = 0; i < filesToDownload.length; i++) {
    const file = filesToDownload[i];
    logger.info(logKey, `Downloading query export file (${i + 1}/${filesToDownload.length}): ${file.name}`);
    const localFile = `${appRootDir}/tmp/${file.name}`;
    await storage.downloadFile({ file: file.name, destination: localFile });

    const data = await fsPromise.open(localFile);
    for await (const line of data.readLines()) {
      if (linesWritten % 100_000 === 0 && linesWritten > 0) {
        logger.debug(logKey, 'Lines written to CSV file:', linesWritten);
      }

      if (linesWritten >= linesPerFile) {
        await finalizeCsvToZip({ fileKey: fileKeys[fileIndex], csvFileLocation, csvFileName, csvStream });
        fileIndex += 1;
        ({ csvStream, csvFileLocation, csvFileName } = startNewCsvStream(fileKeys[fileIndex]));
        linesWritten = 0;
      }

      const row = JSON.parse(line);
      const templateRow = collectData.lineToTemplate(row, template);
      CsvExports.writeCsvLine(csvStream, templateRow);
      linesWritten += 1;
    }

    // Delete the export file now it's no longer needed
    fs.unlinkSync(localFile);
  }

  if (filesWritten.length === 0) {
    logger.info(logKey, 'Single file export, closing CSV stream');
    await CsvExports.closeStream(csvStream);
    const fileKey = fileKeys[fileIndex];
    filesWritten.push({ fileKey, fileLocation: csvFileLocation });
    await onFileReady({ fileKey, fileLocation: csvFileLocation });
  } else {
    logger.info(logKey, 'Closing final ZIP file');
    await finalizeCsvToZip({ fileKey: fileKeys[fileIndex], csvFileLocation, csvFileName, csvStream });
  }

  return filesWritten;
}

async function zipFile({ zipFileKey, fileToZipLocation, fileToZipName }) {
  const { outputStream, zipStream, fileLocation: zipFileLocation } = createZipStream(zipFileKey);

  zipStream.append(fs.createReadStream(fileToZipLocation), { name: fileToZipName });
  await zipStream.finalize();

  const zipFinished = new Promise((resolve, reject) => {
    const onFinish = () => {
      outputStream.removeListener('error', onError);
      resolve();
    };
    const onError = (err) => {
      outputStream.removeListener('finish', onFinish);
      reject(err);
    };
    outputStream.once('finish', onFinish);
    outputStream.once('error', onError);
  });
  outputStream.end();
  await zipFinished;

  return { fileLocation: zipFileLocation };
}

async function saveFileKeys(periodId, clientId, fileKeys, publicUrls) {
  const filter = { _id: periodId, clientId };
  const query = {
    salesExportFileKeys: fileKeys,
    salesExportZipsPublicLinks: publicUrls,
  };
  await Period.updateOne(filter, query);
}

async function getSignedS3Urls(fileKeys) {
  const urls = [];
  for (const fileKey of fileKeys) {
    const signedUrl = await new Promise((resolve, reject) => {
      fileManager.publicLink7Days(fileKey, (err, signedUrl) => {
        if (err) reject(err);
        else resolve(signedUrl);
      });
    });
    urls.push({ name: fileKey.split('/').pop(), url: signedUrl });
  }
  return urls;
}

module.exports = {
  create,
  getTableCount,
  createFileKeys,
  getSignedS3Urls,
  saveFileKeys,
  createCsvStream,
  createZipStream,
  runExportQuery,
  downloadQueryExportFiles,
  zipFile,
  getExportDetails,
};
