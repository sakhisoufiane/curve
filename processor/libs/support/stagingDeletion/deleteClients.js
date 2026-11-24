/* eslint-disable no-await-in-loop */
const { eachLimit } = require('async');
const { MongoClient } = require('mongodb');
const { logger, databaseUtils, fileManager, BigQuery } = require('@curveroyaltysystems/platform-shared-utils');

require('../../../models/db');
const Client = require('../../../models/client');

const deleteClientSchema = require('./deleteClientsSchema.json');

const DeleteClient = this;

const logKey = 'Staging-Delete-Client'; // Add this to all logs

DeleteClient.connectToDb = async () => {
  const dbConnection = await MongoClient.connect(databaseUtils.getMongoUrl('auth'), databaseUtils.getMongoConnectOpts());
  return dbConnection.db('curve-production');
};

const deleteDataset = ({ bigQuery, client }) => new Promise((resolve, reject) => {
  bigQuery.deleteDataset(client.bigQueryDataset, (err) => {
    if (err) { reject(err); } else { resolve(); }
  });
});

DeleteClient.run = async (clientIds) => {
  // Init Log
  logger.info(`${logKey} | Deleting clients - ${clientIds.join(', ')}`);

  // Connect to the database
  const db = await DeleteClient.connectToDb();

  for (const clientId of clientIds) {
    const client = await Client.findById(clientId).catch(logger.error);
    if (!client) throw new Error(`${logKey} | Client not found - ${clientId}`);

    // Delete collections
    await eachLimit(deleteClientSchema, 10, async (schema) => {
      const model = db.collection(schema.name);
      await deleteCollection({ schema, model, clientId });
    });

    logger.info(`${logKey} | Deleting BigQuery Tables for - ${clientId}`);

    // Delete Big Query Dataset
    if (client.bigQueryDataset) {
      logger.info(`${logKey} | ${client._id} : Deleting BigQuery Dataset... ${client.bigQueryDataset}`);
      const bigQuery = new BigQuery(databaseUtils.getBigQueryOpts(client));

      await deleteDataset({ bigQuery, client }).catch(logger.error);
    }

    // Delete Client
    logger.info(`${logKey} | Deleting client - ${client._id}`);
    await Client.findOneAndDelete({ _id: client._id }).catch(logger.error);
    logger.info(`${logKey} | ${client._id} : Client deletion complete ${client.name}`);
  }
};

const deleteFiles = async ({ schema, documents }) => {
  logger.info(`${logKey} | Deleting files for ${schema.name}`);

  await eachLimit(documents, 100, async (document) => {
    for (const file of schema.files) {
      const documentField = document[file];

      if (documentField) {
        await fileManager.deleteFromS3async(documentField).catch(logger.error);
      }
    }
  });
};

const deleteCollection = async ({ schema, model, clientId }) => {
  let count = 0;
  let lastId;
  let documents;

  // Query
  const limit = 1000;

  do {
    logger.info(`${logKey} | Deleting ${schema.name} for ${clientId} | Count: ${count}`);

    // Load Docs
    const query = { clientId };
    if (lastId) query._id = { $gt: lastId };

    documents = await model.find(query).sort({ _id: 1 }).limit(limit).toArray();
    if (!documents?.length) break;

    // If schema has files, delete them
    if (schema.files?.length) {
      await deleteFiles({ schema, documents });
    }

    // Delete Documents From Mongo
    const documentIds = documents.map((document) => document._id);
    await model.deleteMany({ clientId, _id: { $in: documentIds } });

    count += documents.length;
    lastId = documents[documents.length - 1]._id;
  } while (documents.length >= limit);
};

module.exports = DeleteClient;
