require('dotenv').config();
const { MongoClient } = require('mongodb');
const { ObjectId } = require('mongodb');
const async = require('async');

const { databaseUtils, encryption } = require('@curveroyaltysystems/platform-shared-utils');

async.waterfall([
  (waterfallCb) => {
    const databaseUrl = databaseUtils.getMongoUrl('auth');
    MongoClient.connect(databaseUrl, databaseUtils.getMongoConnectOpts(), waterfallCb);
  },
  (mongoClient, waterfallCb) => {

    // Select mongo db
    const db = mongoClient.db(databaseUtils.getMongoDBName());
    const clientsCollection = db.collection('clients');
    clientsCollection.find({}, { projection: { name: 1, encryptionKey: 1 }, sort: { name: 1 } }, (err, clients) => {
      if (err) {
        console.error(err);
        process.exit(-1);
      } else if (clients) {
        async.eachLimit(clients, 10, (client, cb) => {
          if (client.encryptionKey) {
            console.log(`\x1b[32m\x1b[1m${client.name}\x1b[0m already has an encryption key set, skipping`);
            cb();
          } else {
            console.log(`Adding encryption key to \x1b[31m\x1b[1m${client.name}\x1b[0m`);
            const key = encryption.encryptionUtils.createKey();
            const encryptionKey = encryption.encryptionUtils.encryptKey(key);
            clientsCollection.findOneAndUpdate({ _id: ObjectId(client._id) }, { $set: { encryptionKey: encryptionKey } }, cb);
          }
        }, waterfallCb);
      }
    });    
  }
], (err) => {
  if (err) {
    console.error(err);
  } else {
    console.log('---- done ----')
  }
  process.exit(-1);
});
