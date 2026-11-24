require('../../../models/db');
const SalesFile = require('../../../models/salesFile');
const SalesTemplates = require('../../../models/salesTemplate');
const UnmappedRelease = require('../../../models/unmappedRelease');
const UnmappedTrack = require('../../../models/unmappedTrack');
const UnmappedWork = require('../../../models/unmappedWork');
const Client = require('../../../models/client');
const { sleep } = require('ssh2-sftp-client/src/utils');
const axios = require('axios').default;
const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const { existsSync, writeFileSync, readFileSync } = require('node:fs');
const { mkdir } = require('node:fs/promises');

async function run() {
  await createDirs();
  await generateTemplateAndSalesFiles();
  await createInitialResults();
  await createFinalResults();
  compareResults();
}

async function createDirs() {
  if (!rootDir) return;
  await mkdir(rootDir, { recursive: true });
}

async function generateTemplateAndSalesFiles() {
  if (existsSync(rootDir + 'template-and-sales-files.json')) return;

  // Create a list of sales templates
  const templates = await SalesTemplates.find({ clientId });

  // Find the latest sale file for each template
  const templateAndSalesFile = await Promise.all(
    templates.map(async (template) => {
      const salesFile = await SalesFile.findOne(
        {
          clientId,
          salesTemplateId: template._id.toString()
        },
        null,
        { sort: { createdAt: -1 } }
      );

      // Mark any found sales file as not locked or archived (if it currently is)
      if (salesFile && (salesFile.locked || salesFile.archived)) {
        salesFile.locked = false;
        salesFile.archived = false;
        await salesFile.save();
      }

      return {
        template,
        salesFile
      };
    })
  );

  logger.debug(`Found templates and sales files:`);
  templateAndSalesFile.forEach(({
    template,
    salesFile
  }) => {
    logger.debug(`Template ID: ${template._id.toString()}, Sales File ID: ${salesFile?._id?.toString()}`);
  });

  writeFileSync(
    rootDir + 'template-and-sales-files.json',
    JSON.stringify(templateAndSalesFile)
  );
}

async function createInitialResults() {
  if (existsSync(rootDir + 'initial-results.json')) return;

  // Gather the files and templates to ingest from the previously stored file
  const templateAndSalesFile = JSON.parse(
    readFileSync(rootDir + 'template-and-sales-files.json', { encoding: 'utf-8' })
  );

  // Ingest the files and gather the results
  const results = await ingestFiles(templateAndSalesFile, false);

  // Write the results to disk
  logger.debug('Initial Results collected');
  writeFileSync(
    rootDir + 'initial-results.json',
    JSON.stringify(results)
  );
}

async function createFinalResults() {
  if (existsSync(rootDir + 'final-results.json')) return;

  // Gather the files and templates to ingest from the previously stored file
  const templateAndSalesFile = JSON.parse(
    readFileSync(rootDir + 'template-and-sales-files.json', { encoding: 'utf-8' })
  );

  // Ingest the files and gather the results
  const results = await ingestFiles(templateAndSalesFile, true);

  // Write the results to disk
  logger.debug('Final Results collected');
  writeFileSync(
    rootDir + 'final-results.json',
    JSON.stringify(results)
  );
}

/**
 * @typedef IngestionResult
 * @property {SalesTemplate} template
 * @property {SalesFile} [salesFile]
 * @property {string} status
 * @property {Number} [grossAmount]
 * @property {Number} [netAmount]
 * @property {Number} [lines]
 * @property {Number} [units]
 * @property {boolean} [valid]
 * @property {Number} [invalidLines]
 * @property {Number} [homeCurrencyGrossAmount]
 * @property {Number} [homeCurrencyNetAmount]
 * @property {Number} [unmappedWorksCount]
 * @property {Number} [unmappedTracksCount]
 * @property {Number} [unmappedReleasesCount]
 * @property {Array<string>} [invalidFields.distributionChannels]
 * @property {Array<string>} [invalidFields.configurations]
 * @property {Array<string>} [invalidFields.priceCategories]
 * @property {Array<string>} [invalidFields.territories]
 * @property {Array<string>} [invalidFields.sources]
 * @property {Array<string>} [invalidFields.subSources]
 * @property {Array<string>} [invalidFields.currencies]
 * @property {Array<string>} [invalidFields.currencyCodes]
 * @property {Array<string>} [invalidFields.contracts]
 * @property {boolean} [invalidFields.saleDate]
 * @property {boolean} [invalidFields.transactionDate]
 * @property {boolean} [invalidFields.customAdditionalFile]
 * @property {Array<string>} [invalidFields.saleTypes]
 */
/**
 * Sets the platformSalesIngestion flag to the given setting, and runs an ingestion
 * @param {{template: SalesTemplate, salesFile: SalesFile}[]} templateAndSalesFiles
 * @param {boolean} platform
 * @return {Promise<IngestionResult[]>}
 */
async function ingestFiles(templateAndSalesFiles, platform) {
  const fileName = platform ? 'final-status.json' : 'initial-status.json';
  if (!existsSync(rootDir + fileName)) {
    // Set the platformSalesIngestion feature flag to the given value
    const client = await Client.findById(clientId);
    if (!client) throw new Error('Client not found');

    client.features.platformSalesIngestion = platform;
    await client.save();

    // Start the ingestion process
    const token = await authenticate();
    await Promise.all(
      templateAndSalesFiles.map(async ({
        template,
        salesFile
      }) => {
        if (salesFile) {
          try {
            await invokeApi(token, salesFile._id.toString());
          } catch (e) {
            logger.error(`Failed to start ingestion for Sales File ID: ${salesFile._id.toString()}`, e);
          }
        }
      })
    )

    writeFileSync(rootDir + fileName, JSON.stringify({
      startTime: Date.now(),
    }));
  }

  // Set up a list of results - This will contain the template, sales file, whether the ingestion completed or failed
  // and any validation data
  const results = templateAndSalesFiles.map(({
    template,
    salesFile
  }) => {
    if (salesFile) {
      return {
        template,
        salesFile,
        status: 'In Progress'
      };
    } else {
      return {
        template,
        status: 'Not Found'
      };
    }
  });

  // Poll to check if the ingestion is complete, and collect the results
  while (results.some((result) => result.status === 'In Progress')) {
    await sleep(1000 * 60);

    for (const result of results) {
      if (result.status !== 'In Progress') continue;

      // Check the database for the current status of all sales files that have not completed
      const newSalesFile = await SalesFile.findById(result.salesFile._id);

      if (newSalesFile.status === 'Errored') {
        // If they have errored, then mark it as such
        result.status = 'Errored';
      } else if (newSalesFile.status === 'Complete') {
        // If they are complete, then mark it as such, and copy over all the validation fields
        result.status = 'Complete';
        result.details = {
          grossAmount: newSalesFile.grossAmount,
          netAmount: newSalesFile.netAmount,
          lines: newSalesFile.lines,
          units: newSalesFile.units,
          valid: newSalesFile.valid,
          invalidLines: newSalesFile.invalidLines,
          homeCurrencyGrossAmount: newSalesFile.homeCurrencyGrossAmount,
          homeCurrencyNetAmount: newSalesFile.homeCurrencyNetAmount,
          invalidFields: newSalesFile.invalidFields,
          unmappedWorks: await UnmappedWork.find({ clientId, salesFileId: newSalesFile._id.toString() }),
          unmappedTracks: await UnmappedTrack.find({ clientId, salesFileId: newSalesFile._id.toString() }),
          unmappedReleases: await UnmappedRelease.find({ clientId, salesFileId: newSalesFile._id.toString() }),
        };
      } else {
        logger.debug(`Waiting for Sales File ID: ${result.salesFile._id.toString()} to finish ingesting. Status: ${newSalesFile.status}`);
      }
    }
  }

  return results;
}

async function authenticate() {
  const response = await axios.post(
    `https://dev-api.curveroyaltysystems.com/authenticate`,
    {
      apiKey,
      apiSecretKey,
    },
    {
      headers: {
        'applicationToken': 'DrLmNC2q9t',
      }
    });

  return response.data.token;
}

async function invokeApi(token, salesFileId) {
  const response = await axios.post(
    `https://dev-api.curveroyaltysystems.com/salesFiles/${salesFileId}/ingest`,
    null,
    {
      headers: {
        'applicationToken': 'DrLmNC2q9t',
        'token': token,
      }
    }
  );

  if (response.status < 200 || response.status >= 300) {
    throw new Error('Failed to start ingestion for Sales File ID: ' + salesFileId, { cause: e });
  }
}

function compareResults() {
  const templateAndSalesFiles = JSON.parse(readFileSync(rootDir + 'template-and-sales-files.json', { encoding: 'utf-8' }));
  const nonPlatformResults = JSON.parse(readFileSync(rootDir + 'initial-results.json', { encoding: 'utf-8' }));
  const platformResults = JSON.parse(readFileSync(rootDir + 'final-results.json', { encoding: 'utf-8' }));

  templateAndSalesFiles.forEach(({ template }) => {
    const initialResult = nonPlatformResults.find((res) => template._id.toString() === res.template._id.toString());
    const finalResult = platformResults.find((res) => template._id.toString() === res.template._id.toString());

    logger.info('\n------\n');
    compareResult(initialResult, finalResult);
  });
}

/**
 *
 * @param {IngestionResult} initialResult
 * @param {IngestionResult} finalResult
 */
function compareResult(initialResult, finalResult) {
  const templateId = initialResult.template._id.toString();
  const salesFileId = initialResult.salesFile?._id?.toString();
  logger.info(`For template ID: ${templateId}. Sales File ID: ${salesFileId}`);
  if (initialResult.status === 'Not Found' || initialResult.status) {
    logger.info(`For Status of initial run (non-platform): ${initialResult.status}`);
  } else {
    logger.error(`For Status of initial run (non-platform): ${initialResult.status}`);
  }
  if (initialResult.status === 'Not Found' || initialResult.status) {
    logger.info(`Status of final run (platform): ${finalResult.status}`);
  } else {
    logger.error(`Status of final run (platform): ${finalResult.status}`);
  }

  if (initialResult.status === 'Complete' && finalResult.status === 'Complete') {
    let res = true;
    res &= compareValue('grossAmount', initialResult.details.grossAmount, finalResult.details.grossAmount);
    res &= compareValue('netAmount', initialResult.details.netAmount, finalResult.details.netAmount);
    res &= compareValue('lines', initialResult.details.lines, finalResult.details.lines);
    res &= compareValue('units', initialResult.details.units, finalResult.details.units);
    res &= compareValue('valid', initialResult.details.valid, finalResult.details.valid);
    res &= compareValue('invalidLines', initialResult.details.invalidLines, finalResult.details.invalidLines);
    res &= compareValue('homeCurrencyGrossAmount', initialResult.details.homeCurrencyGrossAmount, finalResult.details.homeCurrencyGrossAmount);
    res &= compareValue('homeCurrencyNetAmount', initialResult.details.homeCurrencyNetAmount, finalResult.details.homeCurrencyNetAmount);
    res &= compareUnmappedWorks(initialResult.details.unmappedWorks, finalResult.details.unmappedWorks);
    res &= compareValue('unmappedTracks', initialResult.details.unmappedTracks, finalResult.details.unmappedTracks);
    res &= compareValue('unmappedReleases', initialResult.details.unmappedReleases, finalResult.details.unmappedReleases);

    res &= compareValue('distributionChannels', initialResult.details.invalidFields.distributionChannels, finalResult.details.invalidFields.distributionChannels);
    res &= compareValue('configurations', initialResult.details.invalidFields.configurations, finalResult.details.invalidFields.configurations);
    res &= compareValue('priceCategories', initialResult.details.invalidFields.priceCategories, finalResult.details.invalidFields.priceCategories);
    res &= compareValue('territories', initialResult.details.invalidFields.territories, finalResult.details.invalidFields.territories);
    res &= compareValue('sources', initialResult.details.invalidFields.sources, finalResult.details.invalidFields.sources);
    res &= compareValue('subSources', initialResult.details.invalidFields.subSources, finalResult.details.invalidFields.subSources);
    res &= compareValue('currencies', initialResult.details.invalidFields.currencies, finalResult.details.invalidFields.currencies);
    res &= compareValue('currencyCodes', initialResult.details.invalidFields.currencyCodes, finalResult.details.invalidFields.currencyCodes);
    res &= compareValue('contracts', initialResult.details.invalidFields.contracts, finalResult.details.invalidFields.contracts);
    res &= compareValue('saleDate', initialResult.details.invalidFields.saleDate, finalResult.details.invalidFields.saleDate);
    res &= compareValue('transactionDate', initialResult.details.invalidFields.transactionDate, finalResult.details.invalidFields.transactionDate);
    res &= compareValue('customAdditionalFile', initialResult.details.invalidFields.customAdditionalFile, finalResult.details.invalidFields.customAdditionalFile);
    res &= compareValue('saleTypes', initialResult.details.invalidFields.saleTypes, finalResult.details.invalidFields.saleTypes);

    if (!res) {
      logger.error(`Template: ${templateId} failed validation`);
    } else {
      logger.info(`Template: ${templateId} succeeded validation`)
    }
  }

  logger.info('\n------\n');
}

function compareUnmappedWorks(initialValue, finalValue) {
  if (!Array.isArray(initialValue) || !Array.isArray(finalValue)) {
    logger.error('unmappedWorks must be an array')
    return false;
  }

  initialValue = initialValue.map((element) => {
    // Remove any IDs, since they'll be inconsistent between runs
    normalizeUnmappedWork(element);
    return JSON.stringify(element, null, 2)
  }).sort();
  finalValue = finalValue.map((element) => {
    // Remove any IDs, since they'll be inconsistent between runs
    normalizeUnmappedWork(element);
    return JSON.stringify(element, null, 2)
  }).sort();

  if (arrayEquals(initialValue, finalValue)) {
    return true;
  }
  logger.error(`unmappedWorks does not equal. Initial value: ${initialValue}, Final value: ${finalValue}`);
  return false;
}

function compareValue(valueName, initialValue, finalValue) {
  if (initialValue === undefined || initialValue === null) {
    logger.error(`${valueName} not set on initial value`);
    return false;
  }
  if (finalValue === undefined || finalValue === null) {
    logger.error(`${valueName} not set on final value`);
    return false;
  }

  if (Array.isArray(initialValue) && Array.isArray(finalValue)) {
    if (initialValue.length === 0 && finalValue.length === 0) {
      return true;
    }

    if (typeof initialValue[0] === 'object') {
      // Check if have arrays of objects (for unmapped works etc.). If we do, stringify the objects so they are sortable and comparable
      initialValue = initialValue.map((element) => {
        // Remove any IDs, since they'll be inconsistent between runs
        normalizeDocument(element);
        return JSON.stringify(element, null, 2)
      }).sort();
      finalValue = finalValue.map((element) => {
        // Remove any IDs, since they'll be inconsistent between runs
        normalizeDocument(element);
        return JSON.stringify(element, null, 2)
      }).sort();
      if (arrayEquals(initialValue, finalValue)) {
        return true;
      }
      logger.error(`${valueName} does not equal. Initial value: ${initialValue}, Final value: ${finalValue}`);
      return false;
    }

    if (arrayEquals(initialValue.sort(), finalValue.sort())) {
      return true;
    }
  }

  if (Number.isFinite(initialValue) && Number.isFinite(finalValue)) {
    if ((Math.round(initialValue * 100) / 100) === (Math.round(finalValue * 100) / 100)) {
      return true;
    } else {
      logger.error(`${valueName} does not equal. Initial value: ${initialValue}, Final value: ${finalValue}`);
      return false;
    }
  }

  if (initialValue !== finalValue) {
    logger.error(`${valueName} does not equal. Initial value: ${initialValue}, Final value: ${finalValue}`);
    return false;
  }

  return true;
}

/**
 * Strip out any fields in a Mongo Document that will typically not be consistent across runs
 * @param doc
 */
function normalizeDocument(doc) {
  if (doc?._id) delete doc._id;
  if (doc?.createdAt) delete doc.createdAt;
  if (doc?.updatedAt) delete doc.updatedAt;
  if (doc?.__v) delete doc.__v;

  // Remove any null or empty values (so it's consistently undefined)
  if (doc) {
    Object.entries(doc).forEach(([key, value]) => {
      if (value === null || value === '') delete doc[key];
    });
  }
}

/**
 * Normalize an Unmapped Work to fix issues that will typically not be consistent across runs
 * @param doc
 */
function normalizeUnmappedWork(doc) {
  normalizeDocument(doc)
  doc.netAmount = doc?.netAmount?.toFixed(4);
}

function arrayEquals(a, b) {
  return a.length === b.length &&
    a.every((val, index) => val === b[index]);
}

const clientId = process.argv[2]
const apiKey = process.argv[3]
const apiSecretKey = process.argv[4]
const rootDir = process.argv[5];

if (!clientId || !apiKey || !apiSecretKey || !rootDir) {
  throw new Error("This tool must be passed 4 arguments: The ID of a client, an API Key for a user registered to that client, the API Secret Key, and a root directory to store state in")
}

run()
  .then((_) => process.exit())
  .catch((e) => {
    logger.error(e);
    process.exit(1);
  });
