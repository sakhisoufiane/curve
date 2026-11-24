const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const { S3Client, GetObjectCommand } = require('@aws-sdk/client-s3');
const { eachLimit } = require('async');
const csv = require('csv-parser');
const fs = require('fs');
const appRootDir = require('app-root-dir').get();
const path = require('path');

const Client = require('../../models/client');
const Track = require('../../models/track');

const bucketName = process.env.environmentName === 'Production' ? 'curve-sftp' : 'curve-sftp-dev';

const ingestFile = async (fileKey, clientId) => {
  logger.info(`Fuga Youtube: Ingesting file: ${fileKey} with ClientId: ${clientId}`);
  // Find client by ID
  const client = await Client.findById(clientId);
  if (!client) {
    logger.error(`Fuga Youtube: Client with ID ${clientId} not found - abandoning file ingestion for file ${fileKey}`);
    return;
  }
  // Download file from S3
  const file = await downloadFileFromS3(fileKey);
  const { totalLines } = await processFile(file, client);
  logger.info(`Fuga Youtube: Ingested File ${fileKey} into Client: ${client.name} with total lines: ${totalLines}`);
};

const processFile = async (localFile, client) => {
  const currentCatalogue = await prepareCurrentCatalogue(client);
  const lines = [];
  let totalLines = 0;
  // Open CSV file and capture all data into an array - using eachLimit later on to limit DB access
  try {
    await new Promise((resolve, reject) => {
      fs.createReadStream(localFile).pipe(csv({ strict: true })).on('data', (data) => { lines.push(data); }).on('end', resolve)
        .on('error', reject);
    });
  } catch (error) {
    logger.error(`Fuga Youtube: Error parsing csv file ${localFile}: ${error.message}`);
    return { totalLines: 0 };
  }
  logger.debug(lines);
  await eachLimit(lines, 5, async (data) => {
    // Process each row
    const result = await processRow(data, client, currentCatalogue).catch((error) => { logger.error(`Fuga Youtube: Error processing file ${localFile}: ${error.message}`); });
    if (result) { totalLines += 1; }
  });

  logger.info(`Fuga Youtube: Processed file ${localFile} with total ingested lines: ${totalLines}`);
  return { totalLines };
};

const prepareCurrentCatalogue = async (client) => {
  // Find all tracks for client
  const tracks = await Track.find({ clientId: client._id }, { _id: 1, isrc: 1, tags: 1 });
  // Create a map of ISRCs for quick lookup
  const currentCatalogue = {};
  tracks.forEach((track) => { currentCatalogue[track.isrc] = { _id: track._id, tags: track.tags }; });
  return currentCatalogue;
};

const processRow = async (data, client, currenctCatalogue) => {
  const missingFields = ['title', 'isrc', 'artist'].filter((field) => !data[field]);
  if (missingFields.length) {
    logger.error(`Fuga Youtube: Error processing row: ${JSON.stringify(data)}, Missing fields: ${missingFields.join(', ')}`);
    return false;
  }
  // Merge tags from the data with the existing tags
  let dataTags = [];
  if (data.tags) { dataTags = data.tags.split(',').map((tag) => tag.trim()); }
  // Check if track is already in the catalogue, and update if it does exist
  if (currenctCatalogue[data.isrc]) {
    logger.info(`Fuga Youtube: Updating track with ISRC ${data.isrc} for client ${client.name}`);
    // Update track with new data
    logger.debug(`Fuga Youtube: Updating track with ISRC ${data.isrc} with new data:`, data);
    // Merge tags
    const tagsSet = new Set([...currenctCatalogue[data.isrc].tags, ...dataTags]);
    const tags = Array.from(tagsSet);
    return Track.findByIdAndUpdate(currenctCatalogue[data.isrc]._id, { $set: {
      title: data.title,
      version: data.version,
      artist: data.artist,
      duration: data.duration,
      tags,
    } });
  }
  // Else create track from row data
  const newTrack = new Track({
    clientId: client._id.toString(),
    title: data.title,
    version: data.version,
    artist: data.artist,
    isrc: data.isrc,
    duration: data.duration,
    tags: dataTags,
  });
  logger.debug(`Fuga Youtube: Creating new track with ISRC ${data.isrc} for client ${client.name}`);
  return newTrack.save();
};

const downloadFileFromS3 = async (key) => {
  if (!key) {
    throw new Error('Fuga Youtube: Key is required to download file from S3');
  }
  const params = {
    Bucket: bucketName,
    Key: key,
  };

  try {
    // Initialize the S3 client
    const s3Client = new S3Client({
      credentials: {
        accessKeyId: process.env.S3_access_key,
        secretAccessKey: process.env.S3_secret_key,
      },
      region: process.env.S3_region,
    });
    const command = new GetObjectCommand(params);
    const response = await s3Client.send(command);

    // Set downloadPath to store the file within tmp directory
    const downloadPath = `${appRootDir}/tmp/${path.basename(key)}`;
    // Create a write stream to save the file locally
    const fileStream = fs.createWriteStream(downloadPath);

    // Pipe the S3 object data to the file stream
    response.Body.pipe(fileStream);

    // Return a promise that resolves when the file is fully written
    return new Promise((resolve, reject) => {
      fileStream.on('close', () => {
        logger.info(`Fuga Youtube: File downloaded successfully to ${downloadPath}`);
        resolve(downloadPath);
      });

      fileStream.on('error', (err) => {
        logger.error('Fuga Youtube: Error writing file:', err);
        reject(err);
      });
    });
  } catch (err) {
    logger.error('Fuga Youtube: Error downloading file from S3:', err);
    throw err;
  }
};

module.exports = ingestFile;
