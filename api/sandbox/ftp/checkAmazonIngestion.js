// Description: Find all clients with an active Amazon FTP sales ingestion setup
// Time to run (staging): 2.5 seconds
// Ticket No: CUR-3653
// Category: FTP Ingestion
// Author: Louis Bluhm

require('../../models/db');
const appRootDir = require('app-root-dir').get();
const { WriteCsv } = require('@curveroyaltysystems/curve-shared-logic');
const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const Client = require('../../models/client');

async function main() {
  logger.info('Searching for clients with active Amazon FTP sales ingestions...');
  const clients = await Client.find({
    salesFtpIngestions: {
      $ne: [],
    },
  }, '_id name salesFtpIngestions');

  const validClients = clients.filter((client) => {
    const ftps = client.salesFtpIngestions.filter((ftp) => ftp.dsp === 'amazon' && ftp.active);
    return ftps.length > 0;
  });
  if (validClients.length === 0) {
    logger.info('No valid clients found');
    return process.exit();
  }

  const data = validClients.map((client) => ([client._id, client.name, client.salesFtpIngestions.length]));

  const filePath = `${appRootDir}/tmp/activeAmazonFtpIngestionClients.csv`;
  const writer = new WriteCsv({
    headers: ['Client ID', 'Client Name', 'Active Amazon FTP Sales Ingestion Servers'],
    outputLocation: filePath,
  });

  const outputPath = await new Promise((resolve, reject) => {
    writer.addData(data, () => {
      writer.write((err, location) => {
        if (err) reject(err);
        resolve(location);
      });
    });
  })
    .catch((err) => {
      logger.info('Error writing output file:', err.message);
      throw err;
    });

  logger.info(`${validClients.length} total client(s) with active Amazon FTP sales ingestions`);
  logger.info(`Output file written to: ${outputPath}`);
  process.exit();
}

main();
