/* eslint-disable @typescript-eslint/no-var-requires */
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck

// Get environment variables
const { resolve } = require('path');
require('dotenv').config({ path: resolve(__dirname, '../.env') });

const { logger, databaseUtils } = require('@curveroyaltysystems/platform-shared-utils');
const mongoose = require('@curveroyaltysystems/models/mongoose');

// Collections without clientIds, add here to prevent debug warning message about missing client id
// No need to log users collection, there will never be a SET clientId against user
// User can have many clientIds
// Exchange Rates are client agnostic
const NON_CLIENT_ID_COLLECTIONS = ['users', 'exchangerates'];

// Initialise Mongoose promise
mongoose.Promise = global.Promise;
// Define connection options
const dbOpts = databaseUtils.getMongoConnectOpts();

// Build the connection string
let dbURL;

if (process.env.NODE_ENV === 'test') {
  // Set the test DB url
  dbURL = 'mongodb://localhost/tests';
  // Create the database connection
  mongoose.connect(dbURL, dbOpts).catch((err) => {
    logger.error(err);
  });
} else {
  // Set application DB url
  const { user, pass } = databaseUtils.getMongoCredentials();
  dbURL = databaseUtils.getMongoUrl();
  // Create the database connection
  mongoose
    .connect(dbURL, {
      ...dbOpts,
      user,
      pass,
    })
    .catch((err) => {
      logger.error(err);
    });
}

// Log queries not using clientId or _id
mongoose.set('debug', (collection, method, filter) => {
  // Disable when testing
  if (process.env.NODE_ENV === 'test') {
    return;
  }
  // Check if the collection should be ignored
  const collectionsToIgnore = ['appsettings', 'parents', 'clients'];
  if (collectionsToIgnore.includes(collection)) {
    return;
  }
  // Check for clientId
  const hasNoClientId = !filter.clientId && !filter._id && method !== 'createIndex' && method !== 'distinct';
  let hasNoNestedClientId = true;
  if (filter.$and) {
    filter.$and.forEach((query) => {
      if (query.clientId) {
        hasNoNestedClientId = false;
      }
    });
  } else if (filter.$or) {
    let allQueriesHaveClientId = true;
    filter.$or.forEach((query) => {
      if (!query.clientId) {
        allQueriesHaveClientId = false;
      }
    });
    hasNoNestedClientId = !allQueriesHaveClientId;
  }
  // For some queries, the filter can be an array e.g. bulkWrite([{ updateOne: { filter: { clientId: "", ... }}}])
  if (method === 'bulkWrite' && Array.isArray(filter)) {
    let allQueriesHaveClientId = true;
    for (const filterItem of filter) {
      const [filterValue] = Object.values(filterItem);
      if (filterValue) {
        if (!filterValue?.filter?.clientId) {
          allQueriesHaveClientId = false;
          break;
        }
      }
    }
    hasNoNestedClientId = !allQueriesHaveClientId;
  }
  // Log the query
  if (hasNoClientId && hasNoNestedClientId && !NON_CLIENT_ID_COLLECTIONS.includes(collection)) {
    const query = `${collection}.${method}(${JSON.stringify(filter)})`;
    logger.debug(`\x1b[41m \x1b[33m Query should use clientId: ${query}\x1b[0m`);
  }
});

// CONNECTION EVENTS

// When successfully connected
mongoose.connection.on('connected', () => {
  logger.info(`Mongoose default connection open to ${dbURL}`);
});

// If the connection throws an error
mongoose.connection.on('error', (err) => {
  logger.error(`Mongoose default connection error: ${err}`);
  process.exit(0);
});

// When the connection is disconnected
mongoose.connection.on('disconnected', () => {
  logger.info('Mongoose default connection disconnected');
});

// If the Node process ends, close the Mongoose connection
process.on('SIGINT', () => {
  mongoose.connection.close(() => {
    logger.info('Mongoose default connection disconnected through app termination');
    process.exit(0);
  });
});
