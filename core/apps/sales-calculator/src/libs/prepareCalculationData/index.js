/* eslint-disable @typescript-eslint/no-require-imports */
/* eslint-disable max-len */
/* eslint-disable @typescript-eslint/no-this-alias */
/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable no-async-promise-executor */
const { logger, databaseUtils, BigQuery } = require('@curveroyaltysystems/platform-shared-utils');
const { MongoClient } = require('mongodb');
const { eachLimit } = require('async');
const moment = require('moment');
const appRootDir = require('app-root-dir').get();
const fs = require('fs/promises');
// Local lightweight key/value database for getting the mechanical amounts for releases
const { Level } = require('level')
const TrackMechanicalAmount = require('../mechanicalAmount/track/mechanicalAmount');
const ReleaseMechanicalAmount = require('../mechanicalAmount/release/mechanicalAmount');
const GoogleStorage = require('../googleStorage');

const Client = require('../../models/client');
const TerritoryGroup = require('../../models/territoryGroup');

const PrepareCalculationData = this;

PrepareCalculationData.shipCatalogue = async ({ periodId, clientId,  BQDataset}) => {
  // Key/value database for getting the mechanical amounts for releases
  const databasePath = `${appRootDir}/tmp/${clientId}_${periodId}_${moment().format('x')}`;
  const levelDB = new Level(databasePath, { valueEncoding: 'json' })
  // Get client
  const client = await Client.findById(clientId).exec();
  if (!client) { throw new Error(`Client ${clientId} not found`); }

  logger.info(`${periodId} - Shipping catalogue for client ${client.name}`);
  const mongoClient = await MongoClient.connect(databaseUtils.getMongoUrl('auth'), databaseUtils.getMongoConnectOpts());
  const db = mongoClient.db(databaseUtils.getMongoDBName());

  // BigQuery Instance to hold catalogue rights
  const catalogueRightsBigQuery = new BigQuery({ datasetName: BQDataset });
  await new Promise((resolve) => { catalogueRightsBigQuery.setupFile(() => { resolve(); }); });
  const catalogueRightsSchema = [
    { name: 'trackId', type: 'STRING' },
    { name: 'releaseId', type: 'STRING' },
    { name: 'workId', type: 'STRING' },
    { name: 'contractId', type: 'STRING' },
    { name: 'percentage', type: 'FLOAT' },
    { name: 'distributionChannel', type: 'STRING' },
    { name: 'source', type: 'STRING' },
    { name: 'territory', type: 'STRING' },
    { name: 'rightType', type: 'STRING' },
    { name: 'catalogueType', type: 'STRING' },
  ];
  const catalogueRightsTable = `${clientId}_${periodId}_catalogue_rights_${moment().format('x')}`;

  // ================================================================================================================================

  // Ship Catalogue
  const catalogueBigQuery = new BigQuery({ datasetName: BQDataset });
  await new Promise((resolve) => { catalogueBigQuery.setupFile(() => { resolve(); }); });
  const catalogueSchema = [
    { name: 'title', type: 'STRING' },
    { name: 'releaseId', type: 'STRING' },
    { name: 'trackId', type: 'STRING' },
    { name: 'workId', type: 'STRING' },
    { name: 'dealerPrice', type: 'FLOAT' },
    { name: 'priceCategoryDealerPrices', type: 'STRING' },
    { name: 'mechanicalAmount', type: 'STRING' },
    { name: 'type', type: 'STRING' },
    { name: 'version', type: 'STRING' },
    { name: 'artist', type: 'STRING' },
    { name: 'label', type: 'STRING' },
    { name: 'catNo', type: 'STRING' },
    { name: 'foreignId', type: 'STRING' },
    { name: 'barcode', type: 'STRING' },
    { name: 'isrc', type: 'STRING' },
    { name: 'defaultReleaseId', type: 'STRING' },
    { name: 'releaseSpecificForeignIds', type: 'STRING' },
    { name: 'composer', type: 'STRING' },
    { name: 'identifier', type: 'STRING' },
    { name: 'iswc', type: 'STRING' },
    { name: 'tunecode', type: 'STRING' },
  ];
  const catalogueTable = `${clientId}_${periodId}_catalogue_${moment().format('x')}`;


  //   Ship Tracks as we need to also store them in a local database for the release mechanical amount calculation
  const totalTracks = await db.collection('tracks').countDocuments({ clientId });
  logger.info(`${periodId} - Shipping tracks to BQ (${totalTracks} tracks)`);
  let processedTracks = 0;
  const tracksCursor = db.collection('tracks').find({ clientId }, {
    batchSize: 1000,
    projection: {
      _id: 1,
      title: 1,
      version: 1,
      artist: 1,
      label: 1,
      isrc: 1,
      foreignId: 1,
      defaultReleaseId: 1,
      releaseSpecificForeignIds: 1,
      salesReturnsRights: 1,
      releaseSpecificSalesReturnsRights: 1,
      duration: 1,
      mechanicalCalculationBasis: 1,
      reportMechanicals: 1,
      mechanicalLicenses: 1,
      statutoryRate: 1,
      canadianStatutoryRate: 1,
    },
  });

  for await (const track of tracksCursor) {
    // Store the track in the local database
    await levelDB.put(track._id.toString(), track);

    // Ship the track to BigQuery
    await new Promise(async (resolve, reject) => {
      catalogueBigQuery.writeToFile([{
        title: track.title,
        trackId: track._id.toString(),
        mechanicalAmount: JSON.stringify(await new Promise((resolve, reject) => { TrackMechanicalAmount.get(track, (err, mechanical) => { if (err) { reject(err); } else { resolve(mechanical); } }); })),
        type: 'track',
        version: track.version,
        artist: track.artist,
        label: track.label,
        isrc: track.isrc,
        foreignId: track.foreignId,
        defaultReleaseId: track.defaultReleaseId,
        releaseSpecificForeignIds: JSON.stringify(track.releaseSpecificForeignIds || {}),
      }], (err) => { if (err) { reject(err); } else { resolve(); } });
    });

    for await (const right of track.salesReturnsRights || []) {
      if (right.contractId) {
        await new Promise((resolve, reject) => {
          catalogueRightsBigQuery.writeToFile([{
            trackId: track._id.toString(),
            contractId: right.contractId.toString(),
            percentage: right.percentage,
            rightType: 'sales',
            catalogueType: 'track',
          }], (err) => { if (err) { reject(err); } else { resolve(); } });
        });
      }
    }

    for await (const right of track.releaseSpecificSalesReturnsRights || []) {
      if (right.contractId) {
        await new Promise((resolve, reject) => {
          catalogueRightsBigQuery.writeToFile([{
            trackId: track._id.toString(),
            contractId: right.contractId.toString(),
            releaseId: right.releaseId.toString(),
            percentage: right.percentage,
            rightType: 'release_specific',
            catalogueType: 'track',
          }], (err) => { if (err) { reject(err); } else { resolve(); } });
        });
      }
    }

    processedTracks+= 1;
    if (processedTracks % 1000 === 0) {
      logger.info(`${periodId} - Processed ${((processedTracks/totalTracks)*100).toFixed(2)}% - (${processedTracks}/${totalTracks}) tracks`);
    }
  }


  // Ship Releases
  const totalReleases = await db.collection('releases').countDocuments({ clientId });
  logger.info(`${periodId} - Shipping releases to BQ (${totalReleases} releases)`);
  let processedReleases = 0;
  const releasesCursor = db.collection('releases').find({ clientId }, {
    batchSize: 1000,
    projection: {
      _id: 1,
      title: 1,
      dealerPrice: 1,
      priceCategoryDealerPrices: 1,
      version: 1,
      artist: 1,
      label: 1,
      catNo: 1,
      foreignId: 1,
      barcode: 1,
      salesReturnsRights: 1,
      trackIds: 1,
      controlledCompositionClause: 1,
      mechanicalLicenses: 1,
      mechanicalBasisPercentage: 1,
      mechanicalTrackCap: 1,
    },
  });

  // Run releases in batches as mechanical amount calculation takes a while
  const CONCURRENCY_LIMIT = 1000;
  let releaseBatch = [];
  for await (const release of releasesCursor) {
    releaseBatch.push(processRelease({client, catalogueBigQuery, catalogueRightsBigQuery, release, levelDB}));

    if (releaseBatch.length >= CONCURRENCY_LIMIT) {
      await Promise.all(releaseBatch);
      releaseBatch = [];
    }

    processedReleases+= 1;
    if (processedReleases % 1000 === 0) {
      logger.info(`${periodId} - Processed ${((processedReleases/totalReleases)*100).toFixed(2)}% - (${processedReleases}/${totalReleases}) releases`);
    }
  }
  // Final flush for leftover releases
  if (releaseBatch.length > 0) {
    await Promise.all(releaseBatch);
  }

  // Ship Works
  // Get client's territory groups
  const territoryGroups = await TerritoryGroup.find({ clientId }).exec();
  // Organise into object for mapping
  const territoryGroupMappings = {};
  territoryGroups.forEach((territoryGroup) => { territoryGroupMappings[territoryGroup._id.toString()] = territoryGroup.territories; });

  const totalWorks = await db.collection('works').countDocuments({ clientId });
  logger.info(`${periodId} - Shipping works to BQ (${totalWorks} works)`);
  let processedWorks = 0;
  const worksCursor = db.collection('works').find({ clientId }, {
    batchSize: 1000,
    projection: {
      _id: 1,
      title: 1,
      composer: 1,
      identifier: 1,
      foreignId: 1,
      iswc: 1,
      tunecode: 1,
      salesReturnsRights: 1,
      channelSpecificSalesReturnsRights: 1,
    },
  });

  for await (const work of worksCursor) {
    await new Promise(async (resolve, reject) => {
      catalogueBigQuery.writeToFile([{
        title: work.title,
        workId: work._id.toString(),
        composer: work.composer,
        identifier: work.identifier,
        foreignId: work.foreignId,
        iswc: work.iswc,
        tunecode: work.tunecode,
        type: 'work',
      }], (err) => { if (err) { reject(err); } else { resolve(); } });
    });

    for await (const right of work.salesReturnsRights || []) {
      if (right.contractId) {
        await new Promise((resolve, reject) => {
          catalogueRightsBigQuery.writeToFile([{
            workId: work._id.toString(),
            contractId: right.contractId.toString(),
            percentage: right.percentage,
            rightType: 'sales',
            catalogueType: 'work',
          }], (err) => { if (err) { reject(err); } else { resolve(); } });
        });
      }
    }

    // Channel specific sales returns rights can contains an array of territories (when using a continent or territory group)
    // We need to load all the territories and create a new right for each territory

    for await (const right of work.channelSpecificSalesReturnsRights || []) {
        // Only add a specific right if the contract is also in the main sales rights. This logic should be removed when we align works channel specific rights with tracks releses specific sales rights.
        const contractExistsOnMainSalesRights = work.salesReturnsRights && work.salesReturnsRights.some((salesRight) => salesRight.contractId === right.contractId);
      if (right.contractId && contractExistsOnMainSalesRights) {
        let territories = right.territory;
        // If the territory is a territory group, we need to get the territories from the group
        if (territoryGroupMappings[right.territory]) {
          territories = territoryGroupMappings[right.territory];
        }
        // If territory is a continent, we need to convert it to an array of territories
        territories = continentToTerritories(territories);

        // Loop through each territory and create a new right
        for await (const territory of territories) {
          await new Promise((resolve, reject) => {
            catalogueRightsBigQuery.writeToFile([{
              workId: work._id.toString(),
              contractId: right.contractId.toString(),
              percentage: right.percentage,
              distributionChannel: right.distributionChannel || null,
              source: right.source || null,
              territory: territory || null,
              rightType: 'channel_specific',
              catalogueType: 'work',
            }], (err) => { if (err) { reject(err); } else { resolve(); } });
          });
        }
      }
    }

    processedWorks+= 1;
    if (processedWorks % 1000 === 0) {
      logger.info(`${periodId} - Processed ${((processedWorks/totalWorks)*100).toFixed(2)}% - (${processedWorks}/${totalWorks}) works`);
    }
  }

  // Create Catalogue Table
  const createCatalogueTableOptions = {schema: catalogueSchema, expirationTime: Date.now() + 3 * 24 * 60 * 60 * 1000 }; // Expires in 3 days
  await catalogueBigQuery.client.dataset(BQDataset).createTable(catalogueTable, createCatalogueTableOptions);

  //   Write to DB
  await new Promise((resolve, reject) => { catalogueBigQuery.writeFileToDb(catalogueTable, (err) => { if (err) { reject(err); } else { resolve(); } }); });

  logger.info(`${periodId} - Shipped catalogue to BigQuery table ${catalogueTable}`);

  // ================================================================================================================================
  //   Write catalogue rights to DB
  const createcatalogueRightsTableOptions = {schema: catalogueRightsSchema, expirationTime: Date.now() + 3 * 24 * 60 * 60 * 1000 }; // Expires in 3 days
  await catalogueBigQuery.client.dataset(BQDataset).createTable(catalogueRightsTable, createcatalogueRightsTableOptions);

  await new Promise((resolve, reject) => { catalogueRightsBigQuery.writeFileToDb(catalogueRightsTable, (err) => { if (err) { reject(err); } else { resolve(); } }); });

  logger.info(`${periodId} - Shipped catalogue rights to BigQuery table ${catalogueRightsTable}`);

  // ================================================================================================================================

  // Close Mongo Client
  await mongoClient.close();

  // Delete the local database
  deleteLevelDB({levelDB, databasePath}).catch((err) => { logger.error(`${periodId} - Error deleting local database: ${err}`); });

  return {
    catalogueTable,
    catalogueRightsTable,
  };
};

PrepareCalculationData.joinSalesDataToCatalogueData = async ({ periodId, clientId, query, contractIds, catalogueTable, catalogueRightsTable, BQDataset, bucketName, folderName, isMCPS = false }) => {
  // Get client
  const client = await Client.findById(clientId).exec();
  if (!client) { throw new Error(`Client ${clientId} not found`); }

  const combinedSalesOutputTable = `${clientId}_${periodId}_combined_sales_${moment().format('x')}`;

  // Join catalogue data to sales data
  logger.info(`${periodId} - Joining catalogue data to sales data`);
  const metadataTablesSelectFields = [
    // Release data we usually get from OverwritingData
    { field: 'CASE WHEN sales.eligible_for_release_metadata THEN release_catalogue.title ELSE NULL END', as: 'overwrite_data_catalogueReleaseTitle' },
    { field: 'CASE WHEN sales.eligible_for_release_metadata THEN release_catalogue.version ELSE NULL END', as: 'overwrite_data_catalogueReleaseVersion' },
    { field: 'CASE WHEN sales.eligible_for_release_metadata THEN release_catalogue.artist ELSE NULL END', as: 'overwrite_data_catalogueReleaseArtist' },
    { field: 'CASE WHEN sales.eligible_for_release_metadata THEN release_catalogue.label ELSE NULL END', as: 'overwrite_data_catalogueReleaseLabel' },
    { field: 'CASE WHEN sales.eligible_for_release_metadata THEN release_catalogue.catNo ELSE NULL END', as: 'overwrite_data_catalogueCatNo' },
    { field: 'CASE WHEN sales.eligible_for_release_metadata THEN release_catalogue.foreignId ELSE NULL END', as: 'overwrite_data_catalogueReleaseForeignId' },
    { field: 'CASE WHEN sales.eligible_for_release_metadata THEN release_catalogue.barcode ELSE NULL END', as: 'overwrite_data_catalogueBarcode' },
    { field: 'CASE WHEN sales.eligible_for_release_metadata THEN release_catalogue.dealerPrice ELSE NULL END', as: 'shipped_catalogue_dealerPrice' },
    { field: 'CASE WHEN sales.eligible_for_release_metadata THEN release_catalogue.priceCategoryDealerPrices ELSE NULL END', as: 'shipped_catalogue_priceCategoryDealerPrices' },
    { field: 'CASE WHEN sales.eligible_for_release_metadata THEN release_catalogue.mechanicalAmount ELSE NULL END', as: 'shipped_catalogue_releaseMechanicalAmount' },
    // Track data we usually get from OverwritingData
    { field: 'track_catalogue.title', as: 'overwrite_data_catalogueTrackTitle' },
    { field: 'track_catalogue.version', as: 'overwrite_data_catalogueTrackVersion' },
    { field: 'track_catalogue.artist', as: 'overwrite_data_catalogueTrackArtist' },
    { field: 'track_catalogue.label', as: 'overwrite_data_catalogueTrackLabel' },
    { field: 'track_catalogue.isrc', as: 'overwrite_data_catalogueIsrc' },
    { field: 'track_catalogue.foreignId', as: 'overwrite_data_catalogueTrackForeignId' },
    { field: 'track_catalogue.defaultReleaseId', as: 'overwrite_data_defaultReleaseId' },
    { field: 'track_catalogue.releaseSpecificForeignIds', as: 'overwrite_data_releaseSpecificForeignIds' },
    { field: 'track_catalogue.mechanicalAmount', as: 'shipped_catalogue_trackMechanicalAmount' },
    // Work data we usually get from OverwritingData
    { field: 'work_catalogue.title', as: 'overwrite_data_catalogueWorkTitle' },
    { field: 'work_catalogue.composer', as: 'overwrite_data_catalogueWorkComposer' },
    { field: 'work_catalogue.identifier', as: 'overwrite_data_catalogueIdentifier' },
    { field: 'work_catalogue.foreignId', as: 'overwrite_data_catalogueWorkForeignId' },
    { field: 'work_catalogue.iswc', as: 'overwrite_data_catalogueIswc' },
    { field: 'work_catalogue.tunecode', as: 'overwrite_data_catalogueTunecode' },
  ];

  const populatedRightsSelectFields = [
    { field: 'rights.trackId', as: 'shipped_rights_trackId' },
    { field: 'rights.releaseId', as: 'shipped_rights_releaseId' },
    { field: 'rights.workId', as: 'shipped_rights_workId' },
    { field: 'rights.contractId', as: 'shipped_rights_contractId' },
    { field: 'rights.percentage', as: 'shipped_rights_percentage' },
    { field: 'rights.distributionChannel', as: 'shipped_rights_distributionChannel' },
    { field: 'rights.source', as: 'shipped_rights_source' },
    { field: 'rights.territory', as: 'shipped_rights_territory' },
    { field: 'rights.rightType', as: 'shipped_rights_rightType' },
    { field: 'rights.catalogueType', as: 'shipped_rights_catalogueType' },
  ];

  // Sales lines of cat Type 'Contract' will not have any catalogue data, so we need to populate the catalogue data with NULLs
  const populatedContractSelectFields = [
    // Rights data
    { field: 'CAST(NULL AS STRING)', as: 'shipped_rights_trackId' },
    { field: 'CAST(NULL AS STRING)', as: 'shipped_rights_releaseId' },
    { field: 'CAST(NULL AS STRING)', as: 'shipped_rights_workId' },
    { field: 'sales.contractId', as: 'shipped_rights_contractId' },
    { field: 'NULL', as: 'shipped_rights_percentage' },
    { field: 'CAST(NULL AS STRING)', as: 'shipped_rights_distributionChannel' },
    { field: 'CAST(NULL AS STRING)', as: 'shipped_rights_source' },
    { field: 'CAST(NULL AS STRING)', as: 'shipped_rights_territory' },
    { field: 'CAST(NULL AS STRING)', as: 'shipped_rights_rightType' },
    { field: 'CAST(NULL AS STRING)', as: 'shipped_rights_catalogueType' },
  ];

  await new Promise((resolve, reject) => {
    const joinQuery = generateCatalogueToSalesJoinQuery({client, BQDataset, query, combinedSalesOutputTable, isMCPS, metadataTablesSelectFields, catalogueTable, populatedRightsSelectFields, catalogueRightsTable, populatedContractSelectFields});

      // Move shipped_rights_contractId to query params to avoid BQ query size limit
    const joinQueryWithParams = { query: joinQuery, params: { contractIds } }

    logger.info(`${periodId} - Joining catalogue data to sales data`);
    logger.debug(joinQuery);
    new BigQuery({ datasetName: BQDataset }).query(joinQueryWithParams, (err) => { if (err) { reject(err); } else { resolve(); } });
  });

  // Split Data into chunks of 3,000,000 lines by contractId
  // Each 1 million lines is about 2.5GB in size for the input file and 2.5 GB for the output file
  // 3 million lines leaves us below the 20GB size of the fargate task.
  // Files are not loaded in memory, so lines count is note important.
  const splitTableSize = 3_000_000;
  logger.info(`${periodId} - Splitting data into chunks of ${splitTableSize} lines by contractId`);
  const splitSalesTable = `${combinedSalesOutputTable}_split_${moment().format('x')}`;
  await new Promise((resolve, reject) => {
    new BigQuery({ datasetName: BQDataset }).query(`
        CREATE OR REPLACE TABLE \`${BQDataset}.${splitSalesTable}\` OPTIONS (expiration_timestamp = TIMESTAMP_ADD(CURRENT_TIMESTAMP(), INTERVAL 3 DAY)) AS
            SELECT *,
            FLOOR((ROW_NUMBER() OVER (PARTITION BY shipped_rights_contractId ORDER BY id)) / ${splitTableSize}) AS chunk_id
            FROM \`${BQDataset}.${combinedSalesOutputTable}\`
      `, (err) => { if (err) { reject(err); } else { resolve(); } });
  });

  // Write each chunk to a separate table
  logger.info(`${periodId} - Writing each chunk to a separate table`);
  const chunks = await new Promise((resolve, reject) => {
    new BigQuery({ datasetName: BQDataset }).query(`
        SELECT DISTINCT shipped_rights_contractId, chunk_id
        FROM \`${BQDataset}.${splitSalesTable}\` 
        ORDER BY shipped_rights_contractId, chunk_id;
    `, (err, result) => { if (err) { reject(err); } else { resolve(result); } });
  });

  logger.info(`${periodId} - Creating ${chunks.length} chunks`);

  // Write each chunk to a separate file
  const contractIdMappings = [];
  let processedChunks = 0;
  await eachLimit(chunks, 50, async (chunk) => {
    let retryCount = 0;
    while (retryCount < 5) {
      try {
        const bucketFileName = `${splitSalesTable}_contract_${chunk.shipped_rights_contractId}_chunk_${chunk.chunk_id}_${generateRandomString()}`;
        const googleStoragePath = `gs://${bucketName}/${folderName}/${bucketFileName}*`;
        logger.info(`${periodId} - Exporting chunk ${chunk.chunk_id} for contract ${chunk.shipped_rights_contractId} to ${googleStoragePath}`);
        const query = `
          SELECT * FROM \`${BQDataset}.${splitSalesTable}\`
          WHERE shipped_rights_contractId = '${chunk.shipped_rights_contractId}' AND chunk_id = ${chunk.chunk_id}
          LIMIT ${splitTableSize}
        `;
        const exportQuery = `EXPORT DATA OPTIONS(uri='${googleStoragePath}', overwrite=true, format='JSON') AS ${query}`;
        await new Promise((resolve, reject) => {
          new BigQuery({ datasetName: BQDataset }).query(exportQuery, (err) => { if (err) { reject(err); } else { resolve(); } });
        });
        // Keep track of the contractId and bucketFileName for each chunk as we need it when creating the batch tasks
        contractIdMappings.push({ contractId: chunk.shipped_rights_contractId, bucketFileName });
        
        processedChunks+= 1;
        logger.info(`${periodId} - Processed chunk ${chunk.chunk_id} for contract ${chunk.shipped_rights_contractId} - ${((processedChunks/chunks.length)*100).toFixed(2)}% - (${processedChunks}/${chunks.length}) chunks`);
        break;
      } catch (err) {
        retryCount += 1;
        logger.error(`${periodId} - Error exporting chunk ${chunk.chunk_id} for contract ${chunk.shipped_rights_contractId} - ${err.message} - Retrying...`);
        await new Promise((resolve) => {setTimeout(resolve, 1000)});
        if (retryCount === 5) {
          logger.error(`${periodId} - Failed to export chunk ${chunk.chunk_id} for contract ${chunk.shipped_rights_contractId} after 5 retries`);
          throw err;
        }
      }
    }
  
  });

  // Get the files from Google Storage
  const googleStorage = new GoogleStorage(bucketName);
  const files = await googleStorage.getFilesByFolder({ folderName });
  logger.info(`${periodId} - Found ${files.length} files in Google Storage`);
  const chunkFiles = files.map((file) => ({ name: file.name, bucket: bucketName, contractId: contractIdMappings.find((mapping) => file.name.includes(mapping.bucketFileName))?.contractId }));
  logger.info(`${periodId} - Chunk files: ${JSON.stringify(chunkFiles)}`);

  // Return the files to be picked up by batch workers
  logger.info(`${periodId} - Returning the files to be picked up by cloud functions`);
  return { chunkFiles };
};

const formatSelectFields = (selectFields) => selectFields.map((field) => `${field.field} AS ${field.as}`).join(', ');

const continentToTerritories = function (territory) {
  const AFRICA = ['DZ', 'AO', 'BJ', 'BW', 'BF', 'BI', 'CM', 'CV', 'CF', 'TD', 'KM', 'CG', 'CD', 'CI', 'DJ', 'EG', 'GQ', 'ER', 'ET', 'GA', 'GM', 'GH', 'GN', 'GW', 'KE', 'LS', 'LR', 'LY', 'MG', 'MW', 'ML', 'MR', 'MU', 'YT', 'MA', 'MZ', 'NA', 'NE', 'NG', 'RE', 'RW', 'SH', 'ST', 'SN', 'SC', 'SL', 'SO', 'ZA', 'SS', 'SD', 'SZ', 'TZ', 'TG', 'TN', 'UG', 'EH', 'ZM', 'ZW'];
  const AMERICAS = ['AW', 'CW', 'AI', 'AG', 'AR', 'BS', 'BB', 'BZ', 'BM', 'BO', 'BQ', 'BR', 'VG', 'CA', 'KY', 'CL', 'CO', 'CR', 'CU', 'CW', 'DM', 'DO', 'EC', 'SV', 'FK', 'GF', 'GL', 'GD', 'GP', 'GT', 'GY', 'HT', 'HN', 'JM', 'MQ', 'MX', 'MS', 'AN', 'NI', 'PA', 'PY', 'PE', 'PR', 'BL', 'KN', 'LC', 'MF', 'PM', 'VC', 'SR', 'TT', 'TC', 'US', 'UY', 'VE', 'VI', 'SX'];
  const ASIA = ['AF', 'AM', 'AZ', 'BH', 'BD', 'BT', 'BN', 'KH', 'CN', 'GE', 'HK', 'IN', 'ID', 'IR', 'IQ', 'IL', 'JP', 'JO', 'KZ', 'KP', 'KR', 'KW', 'KG', 'LA', 'LB', 'MO', 'MY', 'MV', 'MN', 'MM', 'NP', 'OM', 'PK', 'PS', 'PH', 'QA', 'SA', 'SG', 'LK', 'SY', 'TW', 'TJ', 'TH', 'TL', 'TR', 'TM', 'AE', 'UZ', 'VN', 'YE'];
  const EUROPE = ['AL', 'AD', 'AT', 'BY', 'BE', 'BA', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FO', 'FI', 'FR', 'DE', 'GI', 'GR', 'GG', 'VA', 'HU', 'IS', 'IE', 'IM', 'IT', 'JE', 'LV', 'LI', 'LT', 'LU', 'MK', 'MT', 'MD', 'MC', 'ME', 'XK', 'NL', 'NO', 'PL', 'PT', 'RO', 'RU', 'SM', 'RS', 'SK', 'SI', 'ES', 'SJ', 'SE', 'CH', 'UA', 'GB', 'AX'];
  const OCEANIA = ['AS', 'AQ', 'AU', 'BV', 'IO', 'CX', 'CC', 'CK', 'FJ', 'PF', 'TF', 'GU', 'HM', 'KI', 'MH', 'FM', 'NR', 'NC', 'NZ', 'NU', 'NF', 'MP', 'PW', 'PG', 'PN', 'SB', 'GS', 'TK', 'TO', 'TV', 'UM', 'VU', 'WF', 'WS'];
  
  if (territory === 'WW') { return ['WW', ...AFRICA, ...AMERICAS, ...ASIA, ...EUROPE, ...OCEANIA]; }

  if (territory === 'Africa') { return AFRICA; }
  
  if (territory === 'Americas') { return AMERICAS; }
  
  if (territory === 'Asia') { return ASIA; }
  
  if (territory === 'Europe') { return EUROPE; }
  
  if (territory === 'Oceania') { return OCEANIA; }
  
  if (Array.isArray(territory)) { return territory; }

  return [territory];
};

const processRelease = async ({client, catalogueBigQuery, catalogueRightsBigQuery, release, levelDB}) => {
  await new Promise(async (resolve, reject) => {
    catalogueBigQuery.writeToFile([{
      title: release.title,
      releaseId: release._id.toString(),
      dealerPrice: release.dealerPrice,
      priceCategoryDealerPrices: JSON.stringify(release.priceCategoryDealerPrices),
      mechanicalAmount: JSON.stringify(await new Promise((resolve, reject) => { ReleaseMechanicalAmount.get(release, client, levelDB, (err, mechanicalAmount) => { if (err) { reject(err); } else { resolve(mechanicalAmount); } }); })),
      version: release.version,
      artist: release.artist,
      label: release.label,
      catNo: release.catNo,
      foreignId: release.foreignId,
      barcode: release.barcode,
      type: 'release',
    }], (err) => { if (err) { reject(err); } else { resolve(); } });
  });
  
  for await (const right of release.salesReturnsRights || []) {
    if (right.contractId) {
      await new Promise((resolve, reject) => {
        catalogueRightsBigQuery.writeToFile([{
          releaseId: release._id.toString(),
          contractId: right.contractId.toString(),
          percentage: right.percentage,
          rightType: 'sales',
          catalogueType: 'release',
        }], (err) => { if (err) { reject(err); } else { resolve(); } });
      });
    }
  }
}

const deleteLevelDB = async ({levelDB, databasePath}) => {
  await levelDB.close();
  await fs.rm(databasePath, { recursive: true, force: true });
}

const getInputSalesReportedStatusJoinQuery = ({isMCPS, client, query}) => {
  const bigQuery = new BigQuery({ datasetName: client.bigQueryDataset, inputTable: client.bigQuerySalesTable, outputTable: client.bigQueryPeriodSales });

  // MCPS BQ Fields
  const selectFieldsMCPS = ['id', 'contractId', 'salesFileId', 'catType', 'releaseId', 'trackId', 'workId', 'distributionChannel', 'configuration', 'priceCategory', 'territory', 'saleDate', 'transactionDate', 'source', 'subSource', 'description', 'units', 'sharePercentage', 'returnUnits', 'originalCurrency', 'exchangeRate', 'grossAmount', 'netAmount', 'homeCurrencyGrossAmount', 'homeCurrencyNetAmount', 'perUnitRate', 'homeCurrencyPerUnitRate', 'retailPrice', 'homeCurrencyRetailPrice', 'salePrice', 'homeCurrencySalePrice', 'duration', 'production', 'episode', 'dateFrom', 'dateTo', 'catNo', 'barcode', 'catalogueReleaseTitle', 'catalogueReleaseVersion', 'catalogueReleaseArtist', 'catalogueReleaseLabel', 'catalogueCatNo', 'catalogueReleaseForeignId', 'catalogueBarcode', 'ppd', 'proRataAmount', 'catalogueFormat', 'mechanicalBasisPercentage', 'totalMechanicalAmount', 'catalogueTrackTitle', 'catalogueTrackVersion', 'catalogueTrackArtist', 'catalogueTrackLabel', 'catalogueIsrc', 'catalogueTrackForeignId', 'mechanicalRate', 'catalogueWorkTitle', 'catalogueWorkComposer', 'catalogueIdentifier', 'catalogueWorkForeignId', 'catalogueIswc', 'catalogueTunecode', 'status'];
  const distinctFieldsMCPS = ['id', 'contractId', 'salesFileId', 'catType', 'releaseId', 'trackId', 'workId', 'distributionChannel', 'configuration', 'priceCategory', 'territory', 'saleDate', 'transactionDate', 'source', 'subSource', 'description', 'units', 'sharePercentage', 'returnUnits', 'originalCurrency', 'exchangeRate', 'grossAmount', 'netAmount', 'homeCurrencyGrossAmount', 'homeCurrencyNetAmount', 'perUnitRate', 'homeCurrencyPerUnitRate', 'retailPrice', 'homeCurrencyRetailPrice', 'salePrice', 'homeCurrencySalePrice', 'duration', 'production', 'episode', 'dateFrom', 'dateTo', 'catNo', 'barcode', 'catalogueReleaseTitle', 'catalogueReleaseVersion', 'catalogueReleaseArtist', 'catalogueReleaseLabel', 'catalogueCatNo', 'catalogueReleaseForeignId', 'catalogueBarcode', 'ppd', 'proRataAmount', 'catalogueFormat', 'mechanicalBasisPercentage', 'totalMechanicalAmount', 'catalogueTrackTitle', 'catalogueTrackVersion', 'catalogueTrackArtist', 'catalogueTrackLabel', 'catalogueIsrc', 'catalogueTrackForeignId', 'mechanicalRate', 'catalogueWorkTitle', 'catalogueWorkComposer', 'catalogueIdentifier', 'catalogueWorkForeignId', 'catalogueIswc', 'catalogueTunecode', 'status'];

  // Standard BQ Fields
  const selectFieldsStandard = ['id', 'contractId', 'salesFileId', 'catType', 'releaseId', 'trackId', 'workId', 'distributionChannel', 'configuration', 'priceCategory', 'territory', 'saleDate', 'transactionDate', 'source', 'subSource', 'description', 'units', 'sharePercentage', 'returnUnits', 'originalCurrency', 'exchangeRate', 'grossAmount', 'netAmount', 'homeCurrencyGrossAmount', 'homeCurrencyNetAmount', 'perUnitRate', 'homeCurrencyPerUnitRate', 'retailPrice', 'homeCurrencyRetailPrice', 'salePrice', 'homeCurrencySalePrice', 'duration', 'production', 'episode', 'dateFrom', 'dateTo', 'catNo', 'barcode', 'catalogueReleaseTitle', 'catalogueReleaseVersion', 'catalogueReleaseArtist', 'catalogueReleaseLabel', 'catalogueCatNo', 'catalogueReleaseForeignId', 'catalogueBarcode', 'ppd', 'proRataAmount', 'catalogueFormat', 'mechanicalBasisPercentage', 'totalMechanicalAmount', 'catalogueTrackTitle', 'catalogueTrackVersion', 'catalogueTrackArtist', 'catalogueTrackLabel', 'catalogueIsrc', 'catalogueTrackForeignId', 'mechanicalRate', 'catalogueWorkTitle', 'catalogueWorkComposer', 'catalogueIdentifier', 'catalogueWorkForeignId', 'catalogueIswc', 'catalogueTunecode', 'status', 'currency2GrossAmount', 'currency2NetAmount', 'currency2PerUnitRate', 'currency2RetailPrice', 'currency2SalePrice', 'currency3GrossAmount', 'currency3NetAmount', 'currency3PerUnitRate', 'currency3RetailPrice', 'currency3SalePrice', 'currency4GrossAmount', 'currency4NetAmount', 'currency4PerUnitRate', 'currency4RetailPrice', 'currency4SalePrice', 'partitionNo'];
  const distinctFieldsStandard = ['id', 'contractId', 'salesFileId', 'catType', 'releaseId', 'trackId', 'workId', 'distributionChannel', 'configuration', 'priceCategory', 'territory', 'saleDate', 'transactionDate', 'source', 'subSource', 'description', 'units', 'sharePercentage', 'returnUnits', 'originalCurrency', 'exchangeRate', 'grossAmount', 'netAmount', 'homeCurrencyGrossAmount', 'homeCurrencyNetAmount', 'perUnitRate', 'homeCurrencyPerUnitRate', 'retailPrice', 'homeCurrencyRetailPrice', 'salePrice', 'homeCurrencySalePrice', 'duration', 'production', 'episode', 'dateFrom', 'dateTo', 'catNo', 'barcode', 'catalogueReleaseTitle', 'catalogueReleaseVersion', 'catalogueReleaseArtist', 'catalogueReleaseLabel', 'catalogueCatNo', 'catalogueReleaseForeignId', 'catalogueBarcode', 'ppd', 'proRataAmount', 'catalogueFormat', 'mechanicalBasisPercentage', 'totalMechanicalAmount', 'catalogueTrackTitle', 'catalogueTrackVersion', 'catalogueTrackArtist', 'catalogueTrackLabel', 'catalogueIsrc', 'catalogueTrackForeignId', 'mechanicalRate', 'catalogueWorkTitle', 'catalogueWorkComposer', 'catalogueIdentifier', 'catalogueWorkForeignId', 'catalogueIswc', 'catalogueTunecode', 'status', 'currency2GrossAmount', 'currency2NetAmount', 'currency2PerUnitRate', 'currency2RetailPrice', 'currency2SalePrice', 'currency3GrossAmount', 'currency3NetAmount', 'currency3PerUnitRate', 'currency3RetailPrice', 'currency3SalePrice', 'currency4GrossAmount', 'currency4NetAmount', 'currency4PerUnitRate', 'currency4RetailPrice', 'currency4SalePrice', 'partitionNo'];

  const selectFields = isMCPS ? selectFieldsMCPS : selectFieldsStandard;
  const distinctFields = isMCPS ? distinctFieldsMCPS : distinctFieldsStandard;

  // Set timestamp
  const timestamp = moment().format('YYYYMMDDHHmmSSssss');
  const options = { uniqueValue: timestamp };
  
  const joinQuery = bigQuery.joinSalesCalculationFilterQueryObject(selectFields, distinctFields, query, options);
  return joinQuery;
}

const generateRandomString = () => Math.random().toString(36).substring(2, 10) + Math.random().toString(36).substring(2, 10)

const generateCatalogueToSalesJoinQuery = ({client, BQDataset, query, combinedSalesOutputTable, isMCPS, metadataTablesSelectFields, catalogueTable, populatedRightsSelectFields, catalogueRightsTable, populatedContractSelectFields}) => {
  /**
   * When it's a Label client: Calculate releases, release specific tracks, tracks and contract sales
   * When it's a Publisher client: Calculate works, channel specific works and contract sales
   */
  const labelQuery = `
        CREATE OR REPLACE TABLE \`${BQDataset}.${combinedSalesOutputTable}\` OPTIONS (expiration_timestamp = TIMESTAMP_ADD(CURRENT_TIMESTAMP(), INTERVAL 3 DAY)) AS
          WITH period_sales AS (
                -- Get the input sales data with the reported contracts and catalogue items by joining with the output table
                ${getInputSalesReportedStatusJoinQuery({isMCPS, client, query})}
            ),
            -- Add rights to Release sales
            release_sales_with_rights AS (
                SELECT sales.*, ${formatSelectFields(populatedRightsSelectFields)}
                FROM period_sales sales
                JOIN \`${BQDataset}.${catalogueRightsTable}\` rights
                ON sales.releaseId = rights.releaseId AND rights.catalogueType = 'release' AND sales.catType = 'Release'
            ),
            -- Add rights to release specific Track sales
            track_sales_with_release_specific_rights AS (
                SELECT sales.*, ${formatSelectFields(populatedRightsSelectFields)}
                FROM period_sales sales
                JOIN \`${BQDataset}.${catalogueRightsTable}\` rights
                ON sales.trackId = rights.trackId AND sales.releaseId = rights.releaseId AND rights.rightType = 'release_specific' AND rights.catalogueType = 'track' AND sales.catType = 'Track'
            ),
            -- Add rights to Track sales where no release_specific right exists
            track_sales_with_sales_rights AS (
                SELECT sales.*, ${formatSelectFields(populatedRightsSelectFields)}
                FROM period_sales sales
                JOIN \`${BQDataset}.${catalogueRightsTable}\` rights
                ON sales.trackId = rights.trackId AND rights.rightType = 'sales' AND rights.catalogueType = 'track' AND sales.catType = 'Track'
                WHERE
                    -- Fallback only if no release specific match exists for this sales line
                    NOT EXISTS (
                      SELECT 1
                      FROM \`${BQDataset}.${catalogueRightsTable}\` sub_rights
                      WHERE sub_rights.trackId = sales.trackId
                      AND sub_rights.releaseId = sales.releaseId
                      AND sub_rights.rightType = 'release_specific'
                      AND sub_rights.catalogueType = 'track'
                      AND sales.catType = 'Track'
                    )
            ),
            -- Contract sales
            contract_sales AS (
                SELECT sales.*, ${formatSelectFields(populatedContractSelectFields)}
                FROM period_sales sales
                WHERE sales.contractId IS NOT NULL AND sales.contractId IN UNNEST(@contractIds)
            ),
            -- Combine sales
            combined_sales AS (
                SELECT * FROM release_sales_with_rights WHERE shipped_rights_contractId IN UNNEST(@contractIds) AND (contractId IS NULL OR (contractId IS NOT NULL AND shipped_rights_contractId != contractId))
                UNION ALL
                SELECT * FROM track_sales_with_release_specific_rights WHERE shipped_rights_contractId IN UNNEST(@contractIds) AND (contractId IS NULL OR (contractId IS NOT NULL AND shipped_rights_contractId != contractId))
                UNION ALL
                SELECT * FROM track_sales_with_sales_rights WHERE shipped_rights_contractId IN UNNEST(@contractIds) AND (contractId IS NULL OR (contractId IS NOT NULL AND shipped_rights_contractId != contractId))
                UNION ALL
                SELECT * FROM contract_sales WHERE shipped_rights_contractId IN UNNEST(@contractIds)
            ),
            sales_with_default_release AS (
            -- When a track has no releaseId, we use the defaultReleaseId from the track catalogue if it exists
              SELECT
                  sales.*,
                  CASE
                      WHEN sales.releaseId IS NULL AND sales.trackId IS NOT NULL THEN catalogue.defaultReleaseId
                      ELSE sales.releaseId
                  END AS resolvedReleaseId
              FROM combined_sales sales
              LEFT JOIN \`${BQDataset}.${catalogueTable}\` catalogue
              ON sales.trackId = catalogue.trackId
            ),
            sales_with_release_metadata_eligibility_flag AS (
              -- We need this step first as when a line has a trackId and a releaseId, we should only populate the release metadata if the release is linked to the same contract as the track
              SELECT
                  sales.*,
                  (
                  sales.trackId IS NULL
                  OR EXISTS (
                      SELECT 1
                      FROM \`${BQDataset}.${catalogueRightsTable}\` rights
                      WHERE rights.releaseId = sales.resolvedReleaseId
                      AND rights.contractId = sales.shipped_rights_contractId
                      AND rights.rightType = 'sales'
                      AND rights.catalogueType = 'release'
                  )
                  ) AS eligible_for_release_metadata
              FROM sales_with_default_release sales
            ),
            -- Populate Catalogue Metadata
            populated_metadata_sales AS (
                SELECT sales.*, ${formatSelectFields(metadataTablesSelectFields)}
                FROM sales_with_release_metadata_eligibility_flag sales
                
                -- Add track metadata
                LEFT JOIN \`${BQDataset}.${catalogueTable}\` release_catalogue
                ON sales.resolvedReleaseId = release_catalogue.releaseId AND sales.catType IN ('Release', 'Track', 'Work')
                -- Add track metadata
                LEFT JOIN \`${BQDataset}.${catalogueTable}\` track_catalogue
                ON sales.trackId = track_catalogue.trackId AND sales.catType IN ('Release', 'Track', 'Work')
                -- Add works metadata
                LEFT JOIN \`${BQDataset}.${catalogueTable}\` work_catalogue
                ON sales.workId = work_catalogue.workId AND sales.catType IN ('Release', 'Track', 'Work')
            )
            
            SELECT * FROM populated_metadata_sales
      `;
  
      const publisherQuery = `
        CREATE OR REPLACE TABLE \`${BQDataset}.${combinedSalesOutputTable}\` OPTIONS (expiration_timestamp = TIMESTAMP_ADD(CURRENT_TIMESTAMP(), INTERVAL 3 DAY)) AS
          WITH period_sales AS (
                -- Get the input sales data with the reported contracts and catalogue items by joining with the output table
                ${getInputSalesReportedStatusJoinQuery({isMCPS, client, query})}
            ),
            -- Add rights to channel specific Work sales
            work_sales_with_channel_specific_rights AS (
                SELECT sales.*, ${formatSelectFields(populatedRightsSelectFields)}
                FROM period_sales sales
                JOIN \`${BQDataset}.${catalogueRightsTable}\` rights
                ON sales.workId = rights.workId 
                AND rights.rightType = 'channel_specific' 
                AND rights.catalogueType = 'work' 
                AND sales.catType = 'Work'
                AND (rights.distributionChannel IS NULL OR rights.distributionChannel = sales.distributionChannel)
                AND (rights.source IS NULL OR rights.source = sales.source)
                AND (rights.territory IS NULL OR rights.territory = sales.territory)
                -- This is to ensure that we only get the most specific right for each sales line
                QUALIFY
                ROW_NUMBER() OVER (
                  PARTITION BY
                    sales.id,
                    sales.workId,
                    sales.distributionChannel,
                    sales.source,
                    sales.territory,
                    rights.contractId
                  ORDER BY
                    (IF(rights.distributionChannel IS NOT NULL, 1, 0) +
                    IF(rights.source IS NOT NULL, 1, 0) +
                    IF(rights.territory IS NOT NULL, 1, 0)) DESC,
                    rights.contractId
                ) = 1
            ),
            -- Add rights to Work sales where no channel specific right exists
            work_sales_with_sales_rights AS (
                SELECT sales.*, ${formatSelectFields(populatedRightsSelectFields)}
                FROM period_sales sales
                JOIN \`${BQDataset}.${catalogueRightsTable}\` rights
                ON sales.workId = rights.workId AND rights.rightType = 'sales' AND rights.catalogueType = 'work' AND sales.catType = 'Work'
                WHERE
                    -- Fallback only if no channel specific match exists for this sales line
                    NOT EXISTS (
                      SELECT 1
                      FROM \`${BQDataset}.${catalogueRightsTable}\` sub_rights
                      WHERE sub_rights.workId = sales.workId 
                        AND sub_rights.rightType = 'channel_specific' 
                        AND sub_rights.catalogueType = 'work' 
                        AND sales.catType = 'Work'
                        AND sub_rights.contractId = rights.contractId
                        AND (sub_rights.distributionChannel IS NULL OR sub_rights.distributionChannel = sales.distributionChannel)
                        AND (sub_rights.source IS NULL OR sub_rights.source = sales.source)
                        AND (sub_rights.territory IS NULL OR sub_rights.territory = sales.territory)
                        )
                    -- This is to ensure that we only get the most specific right for each sales line
                    QUALIFY
                        ROW_NUMBER() OVER (
                        PARTITION BY
                            sales.id,
                            sales.workId,
                            sales.distributionChannel,
                            sales.source,
                            sales.territory,
                            rights.contractId
                        ORDER BY
                            (IF(rights.distributionChannel IS NOT NULL, 1, 0) +
                            IF(rights.source IS NOT NULL, 1, 0) +
                            IF(rights.territory IS NOT NULL, 1, 0)) DESC,
                            rights.contractId
                        ) = 1
            ),
            -- Contract sales
            contract_sales AS (
                SELECT sales.*, ${formatSelectFields(populatedContractSelectFields)}
                FROM period_sales sales
                WHERE sales.contractId IS NOT NULL AND sales.contractId IN UNNEST(@contractIds)
            ),
            -- Combine the sales
            combined_sales AS (
                SELECT * FROM work_sales_with_channel_specific_rights WHERE shipped_rights_contractId IN UNNEST(@contractIds) AND (contractId IS NULL OR (contractId IS NOT NULL AND shipped_rights_contractId != contractId))
                UNION ALL
                SELECT * FROM work_sales_with_sales_rights WHERE shipped_rights_contractId IN UNNEST(@contractIds) AND (contractId IS NULL OR (contractId IS NOT NULL AND shipped_rights_contractId != contractId))
                UNION ALL
                SELECT * FROM contract_sales WHERE shipped_rights_contractId IN UNNEST(@contractIds)
            ),
            sales_with_default_release AS (
            -- When a track has no releaseId, we use the defaultReleaseId from the track catalogue if it exists
              SELECT
                  sales.*,
                  CASE
                      WHEN sales.releaseId IS NULL AND sales.trackId IS NOT NULL THEN catalogue.defaultReleaseId
                      ELSE sales.releaseId
                  END AS resolvedReleaseId
              FROM combined_sales sales
              LEFT JOIN \`${BQDataset}.${catalogueTable}\` catalogue
              ON sales.trackId = catalogue.trackId
            ),
            sales_with_release_metadata_eligibility_flag AS (
              -- We need this step first as when a line has a trackId and a releaseId, we should only populate the release metadata if the release is linked to the same contract as the track
              SELECT
                  sales.*,
                  (
                  sales.trackId IS NULL
                  OR EXISTS (
                      SELECT 1
                      FROM \`${BQDataset}.${catalogueRightsTable}\` rights
                      WHERE rights.releaseId = sales.resolvedReleaseId
                      AND rights.contractId = sales.shipped_rights_contractId
                      AND rights.rightType = 'sales'
                      AND rights.catalogueType = 'release'
                  )
                  ) AS eligible_for_release_metadata
              FROM sales_with_default_release sales
            ),
            -- Populate Catalogue Metadata
            populated_metadata_sales AS (
                SELECT sales.*, ${formatSelectFields(metadataTablesSelectFields)}
                FROM sales_with_release_metadata_eligibility_flag sales
                
                -- Add track metadata
                LEFT JOIN \`${BQDataset}.${catalogueTable}\` release_catalogue
                ON sales.resolvedReleaseId = release_catalogue.releaseId AND sales.catType IN ('Release', 'Track', 'Work')
                -- Add track metadata
                LEFT JOIN \`${BQDataset}.${catalogueTable}\` track_catalogue
                ON sales.trackId = track_catalogue.trackId AND sales.catType IN ('Release', 'Track', 'Work')
                -- Add works metadata
                LEFT JOIN \`${BQDataset}.${catalogueTable}\` work_catalogue
                ON sales.workId = work_catalogue.workId AND sales.catType IN ('Release', 'Track', 'Work')
            )
            
            SELECT * FROM populated_metadata_sales
      `;

      return client.clientType !== 'Publisher' ? labelQuery : publisherQuery;
}

module.exports = PrepareCalculationData;
