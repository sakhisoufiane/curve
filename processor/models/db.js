// Get environment variables
require('dotenv').config();

const { logger, databaseUtils } = require('@curveroyaltysystems/platform-shared-utils');
const mongoose = require('@curveroyaltysystems/models/mongoose');
const config = require('../config.json');

// Initialise Mongoose promise
mongoose.Promise = global.Promise;
// Define connection options
const dbOpts = databaseUtils.getMongoConnectOpts();

// Build the connection string
let dbURL;

if (process.env.NODE_ENV === 'test') {
  // Set the test DB url
  dbURL = `${config.databaseUrl.test}/${config.databaseName.test}`;
  // Create the database connection
  mongoose.connect(dbURL, dbOpts).catch((err) => {
    logger.error(err);
  });
} else {
  // Set application DB url
  const { user, pass } = databaseUtils.getMongoCredentials();
  dbURL = databaseUtils.getMongoUrl();
  // Create the database connection
  mongoose.connect(dbURL, {
    ...dbOpts,
    user,
    pass,
  }).catch((err) => {
    logger.error(err);
  });
}

// mongoose.set('debug', true)

// CONNECTION EVENTS

// When successfully connected
mongoose.connection.on('connected', () => {
  if (process.env.environmentName === 'Development' && dbURL.indexOf('production.curve') > -1) {
    logger.info('PRODUCTION DB HOOK UP - HERE BE DRAGONS');
  }
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
  mongoose.connection.close()
    .then(() => {
      logger.info('Mongoose default connection disconnected through app termination');
      process.exit(0);
    })
    .catch((err) => {
      logger.error(`Mongoose default connection error: ${err}`);
      process.exit(0);
    });
});
