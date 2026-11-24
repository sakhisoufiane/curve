require('dotenv').config();
const { MongoClient } = require('mongodb');
const { logger } = require('@curveroyaltysystems/platform-shared-utils');

/**
 * Script to copy indexes from one MongoDB Atlas cluster to another
 * 
 * Usage:
 * 1. Set SOURCE_MONGO_URI and TARGET_MONGO_URI in your .env file, OR
 * 2. Pass them as command line arguments:
 *    node copyMongoIndex.js <sourceUri> <targetUri> [database]
 * 
 * Example:
 *    node copyMongoIndex.js "mongodb+srv://user:pass@source.mongodb.net" "mongodb+srv://user:pass@target.mongodb.net" "myDatabase"
 */

// Configuration
const config = {
  sourceUri: 'mongodb+srv://stagingapps0525:9l4kgVGdONBJyF3F@curvestaging.xseuw.mongodb.net/?retryWrites=true&w=majority&appName=CurveStaging',
  targetUri: 'mongodb+srv://opsdb:WEoQPtUistlcQNxj@beta.q5buls.mongodb.net/?retryWrites=true&w=majority&appName=Beta',
  databaseName: 'curve-production',
  // Collections to exclude from index copying (system collections)
  excludeCollections: ['system.profile', 'system.users', 'system.roles'],
};

/**
 * Validates the configuration
 */
function validateConfig() {
  if (!config.sourceUri) {
    throw new Error('SOURCE_MONGO_URI is required. Set it in .env or pass as first argument.');
  }
  if (!config.targetUri) {
    throw new Error('TARGET_MONGO_URI is required. Set it in .env or pass as second argument.');
  }
  if (!config.databaseName) {
    throw new Error('MONGO_DATABASE_NAME is required. Set it in .env or pass as third argument.');
  }
}

/**
 * Connects to MongoDB cluster
 * @param {string} uri - MongoDB connection URI
 * @param {string} label - Label for logging (source/target)
 * @returns {Promise<MongoClient>} MongoDB client
 */
async function connectToMongo(uri, label) {
  logger.info(`Connecting to ${label} MongoDB cluster...`);
  const client = new MongoClient(uri, {
    maxPoolSize: 10,
    minPoolSize: 5,
    serverSelectionTimeoutMS: 30000,
  });
  
  await client.connect();
  logger.info(`Successfully connected to ${label} MongoDB cluster`);
  return client;
}

/**
 * Gets all collections from a database
 * @param {Db} database - MongoDB database instance
 * @returns {Promise<string[]>} Array of collection names
 */
async function getCollections(database) {
  const collections = await database.listCollections().toArray();
  return collections
    .map((col) => col.name)
    .filter((name) => !config.excludeCollections.includes(name));
}

/**
 * Gets all indexes for a collection
 * @param {Collection} collection - MongoDB collection
 * @returns {Promise<Array>} Array of index specifications
 */
async function getIndexes(collection) {
  const indexes = await collection.indexes();
  // Filter out the default _id index as it's created automatically
  return indexes.filter((index) => index.name !== '_id_');
}

/**
 * Creates an index on a collection
 * @param {Collection} collection - MongoDB collection
 * @param {Object} indexSpec - Index specification
 * @returns {Promise<string>} Name of the created index
 */
async function createIndex(collection, indexSpec) {
  const { key, name, ...options } = indexSpec;
  
  // Remove internal MongoDB fields
  delete options.v;
  delete options.ns;
  
  // Create the index with the same name and options
  const indexName = await collection.createIndex(key, { ...options, name });
  return indexName;
}

/**
 * Copies indexes from source collection to target collection
 * @param {Collection} sourceCollection - Source MongoDB collection
 * @param {Collection} targetCollection - Target MongoDB collection
 * @param {string} collectionName - Name of the collection
 * @returns {Promise<Object>} Summary of the operation
 */
async function copyCollectionIndexes(sourceCollection, targetCollection, collectionName) {
  const summary = {
    collectionName,
    totalIndexes: 0,
    copiedIndexes: 0,
    skippedIndexes: 0,
    errors: [],
  };

  try {
    // Get indexes from source
    const sourceIndexes = await getIndexes(sourceCollection);
    summary.totalIndexes = sourceIndexes.length;

    if (sourceIndexes.length === 0) {
      logger.info(`  No custom indexes found for collection: ${collectionName}`);
      return summary;
    }

    logger.info(`  Found ${sourceIndexes.length} custom index(es) for collection: ${collectionName}`);

    // Get existing indexes on target
    const targetIndexes = await targetCollection.indexes();
    const existingIndexNames = new Set(targetIndexes.map((idx) => idx.name));

    // Copy each index
    for (const indexSpec of sourceIndexes) {
      try {
        // Check if index already exists
        if (existingIndexNames.has(indexSpec.name)) {
          logger.info(`    Index "${indexSpec.name}" already exists, skipping...`);
          summary.skippedIndexes += 1;
          continue;
        }

        // Create the index
        await createIndex(targetCollection, indexSpec);
        logger.info(`    ✓ Created index: ${indexSpec.name}`);
        summary.copiedIndexes += 1;
      } catch (error) {
        const errorMsg = `Failed to create index "${indexSpec.name}": ${error.message}`;
        logger.error(`    ✗ ${errorMsg}`);
        summary.errors.push(errorMsg);
      }
    }
  } catch (error) {
    const errorMsg = `Failed to process collection "${collectionName}": ${error.message}`;
    logger.error(`  ✗ ${errorMsg}`);
    summary.errors.push(errorMsg);
  }

  return summary;
}

/**
 * Main function to copy all indexes from source to target
 */
async function copyIndexes() {
  let sourceClient;
  let targetClient;

  try {
    // Validate configuration
    validateConfig();

    logger.info('='.repeat(80));
    logger.info('MongoDB Index Copy Script');
    logger.info('='.repeat(80));
    logger.info(`Database: ${config.databaseName}`);
    logger.info('');

    // Connect to both clusters
    sourceClient = await connectToMongo(config.sourceUri, 'SOURCE');
    targetClient = await connectToMongo(config.targetUri, 'TARGET');

    // Get databases
    const sourceDb = sourceClient.db(config.databaseName);
    const targetDb = targetClient.db(config.databaseName);

    // Get all collections
    logger.info('');
    logger.info('Retrieving collections...');
    const collectionNames = await getCollections(sourceDb);
    logger.info(`Found ${collectionNames.length} collection(s) to process`);
    logger.info('');

    // Copy indexes for each collection
    const results = [];
    for (const collectionName of collectionNames) {
      logger.info(`Processing collection: ${collectionName}`);
      const sourceCollection = sourceDb.collection(collectionName);
      const targetCollection = targetDb.collection(collectionName);
      
      const result = await copyCollectionIndexes(sourceCollection, targetCollection, collectionName);
      results.push(result);
      logger.info('');
    }

    // Print summary
    logger.info('='.repeat(80));
    logger.info('SUMMARY');
    logger.info('='.repeat(80));
    
    let totalIndexes = 0;
    let totalCopied = 0;
    let totalSkipped = 0;
    let totalErrors = 0;

    results.forEach((result) => {
      totalIndexes += result.totalIndexes;
      totalCopied += result.copiedIndexes;
      totalSkipped += result.skippedIndexes;
      totalErrors += result.errors.length;

      if (result.totalIndexes > 0) {
        logger.info(`${result.collectionName}:`);
        logger.info(`  Total: ${result.totalIndexes}, Copied: ${result.copiedIndexes}, Skipped: ${result.skippedIndexes}, Errors: ${result.errors.length}`);
      }
    });

    logger.info('');
    logger.info(`Total collections processed: ${collectionNames.length}`);
    logger.info(`Total indexes found: ${totalIndexes}`);
    logger.info(`Total indexes copied: ${totalCopied}`);
    logger.info(`Total indexes skipped: ${totalSkipped}`);
    logger.info(`Total errors: ${totalErrors}`);
    logger.info('='.repeat(80));

    if (totalErrors > 0) {
      logger.info('Some indexes failed to copy. Check the logs above for details.');
    } else {
      logger.info('✓ All indexes copied successfully!');
    }
  } catch (error) {
    logger.error('Fatal error:', error);
    throw error;
  } finally {
    // Close connections
    if (sourceClient) {
      await sourceClient.close();
      logger.info('Closed source connection');
    }
    if (targetClient) {
      await targetClient.close();
      logger.info('Closed target connection');
    }
  }
}

/**
 * Run the script
 */
const runScript = async () => {
  await copyIndexes()
    .then(() => {
      logger.info('Index copy completed successfully.');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('Index copy failed:', error);
      process.exit(1);
    });
};

runScript();

