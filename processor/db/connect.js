require('dotenv').config();

const { mongoose } = require('@curveroyaltysystems/models/mongoose');
const { logger, databaseUtils } = require('@curveroyaltysystems/platform-shared-utils');

const connectToDb = async () => {
  const { user, pass } = databaseUtils.getMongoCredentials();

  const dbOpts = {
    ...databaseUtils.getMongoConnectOpts(),
    serverSelectionTimeoutMS: 180000,
    user,
    pass,
  };

  const dbURL = databaseUtils.getMongoUrl();
  await mongoose.connect(dbURL, dbOpts);
  logger.info(`Connected to MongoDB via Mongoose: ${dbURL}`);
};

module.exports = { connectToDb };
