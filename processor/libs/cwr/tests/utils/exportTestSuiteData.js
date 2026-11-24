/* eslint-disable no-await-in-loop */
const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const { makeTmpDir } = require('@curveroyaltysystems/platform-shared-utils/libs/testUtils');
const appRootDir = require('app-root-dir').get();
const fs = require('fs');
const path = require('path');
const moment = require('moment');

// CWR files have a date value in the header
// This needs to be deterministic when comparing in the test suite
const targetDate = new Date('2025-01-01T00:00:00.000Z');
const offsetInMs = targetDate.getTimezoneOffset() * 60 * 1000;
moment.now = () => targetDate.valueOf() + offsetInMs;

require('../../../../models/db');
const Client = require('../../../../models/client');
const Work = require('../../../../models/work');
const DeliveryPartner = require('../../../../models/deliveryPartner');
const CwrDelivery = require('../../../../models/cwrDelivery');
const TerritoryGroup = require('../../../../models/territoryGroup');
const Publisher = require('../../../../models/publisher');
const Composer = require('../../../../models/composer');
const CwrBuilder = require('../../export/builder');

// Client ID for the regression Client: Regression - CWR Export - DO NOT EDIT
const REGRESSION_CLIENT_ID = '6748b3c59ecebfdd9e2f52c6';

// Delivery IDs to generate regression tests for
const DELIVERIES_TO_TEST = [
  '675830c9a6abd7192837e10d', // DP1 - Correct Works Only
  '6758310fa7ae41ab9c5c4c84', // DP2 - Correct Works Only
  '6758314b5072b2fead30fcda', // DP3 - Correct Works Only
];

const FIXTURES_DIR = `${appRootDir}/libs/cwr/tests/fixtures`;
const FIXTURES_FILEPATH = `${FIXTURES_DIR}/regression-client-data.json`;

async function main() {
  logger.debug('Starting test suite generation');

  const client = await Client.findById(REGRESSION_CLIENT_ID).lean();
  if (!client) {
    throw new Error(`Regression client with ID ${REGRESSION_CLIENT_ID} not found. Did you forget to copy the Client to develop?`);
  }

  logger.debug('Fetching all data required for test suite');
  const [
    works,
    deliveryPartners,
    deliveries,
    territoryGroups,
    publishers,
    composers,
  ] = await Promise.all([
    Work.find({ clientId: client._id.toString() }).lean(),
    DeliveryPartner.find({ clientId: client._id.toString() }).lean(),
    CwrDelivery.find({ clientId: client._id.toString(), _id: { $in: DELIVERIES_TO_TEST } }).lean(),
    TerritoryGroup.find({ clientId: client._id.toString() }).lean(),
    Publisher.find({ clientId: client._id.toString() }).lean(),
    Composer.find({ clientId: client._id.toString() }).lean(),
  ]);

  if (fs.existsSync(FIXTURES_DIR)) fs.rmSync(FIXTURES_DIR, { recursive: true, force: true });
  await makeTmpDir(FIXTURES_DIR);

  const allData = {
    client,
    works,
    deliveryPartners,
    deliveries,
    territoryGroups,
    publishers,
    composers,
  };

  fs.writeFileSync(FIXTURES_FILEPATH, JSON.stringify(allData), 'utf8');
  logger.debug('Client test data written to:', FIXTURES_FILEPATH);

  // Generate expected CWR output files
  for (const deliveryId of DELIVERIES_TO_TEST) {
    logger.debug('Generating expected CWR file for Delivery ID:', deliveryId);

    const delivery = await CwrDelivery.findById(deliveryId);
    const { filePath } = await CwrBuilder.createFile({ logKey: 'generateTestSuite', delivery });

    const fixturesPath = `${FIXTURES_DIR}/${deliveryId}${path.extname(filePath)}`;
    fs.renameSync(filePath, fixturesPath);
    logger.debug('Exported CWR file to:', fixturesPath);
  }

  fs.writeFileSync(`${FIXTURES_DIR}/README.md`, `Data & CWR files exported at: ${new Date().toISOString()}`, 'utf8');

  process.exit();
}

main();
