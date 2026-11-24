/* eslint-disable @typescript-eslint/no-var-requires */
// @ts-nocheck

const { resolve } = require('path');
require('dotenv').config({ path: resolve(__dirname, '../.env') });

const { logger, databaseUtils } = require('@curveroyaltysystems/platform-shared-utils');
const mongoose = require('@curveroyaltysystems/models/mongoose');

const NON_CLIENT_ID_COLLECTIONS = ['users', 'exchangerates'];

mongoose.Promise = global.Promise;
const dbOpts = databaseUtils.getMongoConnectOpts();

let dbURL;

if (process.env.NODE_ENV === 'test') {
  dbURL = 'mongodb://localhost/tests';
  mongoose.connect(dbURL, dbOpts).catch((err) => {
    logger.error(err);
  });
} else {
  const { user, pass } = databaseUtils.getMongoCredentials();
  dbURL = databaseUtils.getMongoUrl();
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

mongoose.set('debug', (collection, method, filter) => {
  if (process.env.NODE_ENV === 'test') return;

  const collectionsToIgnore = ['appsettings', 'parents', 'clients'];
  if (collectionsToIgnore.includes(collection)) return;

  const hasNoClientId = !filter.clientId && !filter._id && method !== 'createIndex' && method !== 'distinct';
  let hasNoNestedClientId = true;

  if (filter.$and) {
    filter.$and.forEach((query) => {
      if (query.clientId) hasNoNestedClientId = false;
    });
  } else if (filter.$or) {
    let allQueriesHaveClientId = true;
    filter.$or.forEach((query) => {
      if (!query.clientId) allQueriesHaveClientId = false;
    });
    hasNoNestedClientId = !allQueriesHaveClientId;
  }

  if (method === 'bulkWrite' && Array.isArray(filter)) {
    let allQueriesHaveClientId = true;
    for (const filterItem of filter) {
      const [filterValue] = Object.values(filterItem);
      if (filterValue && !filterValue?.filter?.clientId) {
        allQueriesHaveClientId = false;
        break;
      }
    }
    hasNoNestedClientId = !allQueriesHaveClientId;
  }

  if (hasNoClientId && hasNoNestedClientId && !NON_CLIENT_ID_COLLECTIONS.includes(collection)) {
    logger.debug(`\x1b[41m \x1b[33m Query should use clientId: ${collection}.${method}(${JSON.stringify(filter)})\x1b[0m`);
  }
});

mongoose.connection.on('connected', () => logger.info(`Mongoose default connection open to ${dbURL}`));
mongoose.connection.on('error', (err) => { logger.error(`Mongoose default connection error: ${err}`); process.exit(0); });
mongoose.connection.on('disconnected', () => logger.info('Mongoose default connection disconnected'));
process.on('SIGINT', () => {
  mongoose.connection.close(() => {
    logger.info('Mongoose default connection disconnected through app termination');
    process.exit(0);
  });
});
