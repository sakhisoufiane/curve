require('../models/db');

const { MongoClient } = require('mongodb');
const { ObjectId } = require('mongodb');
const async = require('async');
const _ = require('lodash');

const { databaseUtils, encryption, configShared } = require('@curveroyaltysystems/platform-shared-utils');
const { encryptionUtils } = encryption;
const Client = require('../models/client');

const encryptedFields = configShared.encryptedFields.payee;

let clientsCollection; let payeesCollection;

const limit = 1000;
let count = 0;

function runPayee(client, lastId, total, callback) {
  const filter = { clientId: client._id.toString() };
  if (lastId) {
    filter._id = { $gt: lastId };
  }
  async.waterfall([
    (cb) => {
      payeesCollection.find(filter).sort({ _id: 1 }).limit(limit).toArray(cb);
    },
    (payees, cb) => {
      async.eachLimit(payees, 50, async (payee) => {
        count += 1;
        process.stdout.write(`\r${count}/${payees.length+total} - ${payee._id}`);
        lastId = payee._id;
        // only get the encryption key and encrypt if doc includes any encrypted fields
        if (encryptionUtils.containsEncryptedFields(payee, encryptedFields)) {
          const encryptionKey = await encryptionUtils.getClientEncryptionKey(payee.clientId, Client);
          const { objEncrypted, fieldsUpdated } = encrypt(payee, encryptionKey);
          if (fieldsUpdated.length > 0) {
            const set = {};
            encryptedFields.forEach((encField) => {
              const firstItem = encField.split('.')[0];
              if (fieldsUpdated.includes(encField) && objEncrypted[firstItem]) {
                set[firstItem] = objEncrypted[firstItem];
              }
            });
            await payeesCollection.findOneAndUpdate({ _id: ObjectId(payee._id) }, { $set: set }, { timestamps: false });
            console.log(`\nPayee ${payee._id}, updated fields: ${fieldsUpdated.join(', ')}`);
          }
        }
      }, (err) => {
        if (err) {
          cb(err);
        } else if (payees && payees.length === limit) {
          runPayee(client, lastId, total + limit, callback);
        } else {
          console.log();
          cb();
        }        
      });
    },
  ], callback);
}

const encrypt = function (obj, encryptionKey) {
  let fieldsUpdated = [];
  for (const field of encryptedFields) {
    const fieldVal = _.get(obj, field);
    const parts = field.split('.');
    const firstItem = obj[parts[0]];
    // if the field string contains dot notation and the first item in the field string points to an array of objects (e.g. arrayOfObjects.valToEncrypt)
    if (parts.length > 1 && Array.isArray(firstItem)) {
      let updated = false;
      for (const row of firstItem) {
        const fieldDecrypted = encryptionUtils.decryptField(_.get(row, parts[1]), encryptionKey);
        // only update the field if it is not already encrypted (will decrypt successfully if already encrypted)
        if (!fieldDecrypted) {
          // encrypt field in row and assign value back to the row
          _.set(row, parts[1], encryptionUtils.encryptField(_.get(row, parts[1]), encryptionKey));
          updated = true;
        }
      }
      // if any fields in rows were updated add the field name to the updated fields array
      if (updated) {
        fieldsUpdated.push(field);
      }
    } else if (fieldVal) {
      const fieldDecrypted = encryptionUtils.decryptField(_.get(obj, field), encryptionKey);
        // only update the field if it is not already encrypted (will decrypt successfully if already encrypted)
        if (!fieldDecrypted) {
          // encrypt field of obj and assign value back to obj
          _.set(obj, field, encryptionUtils.encryptField(fieldVal, encryptionKey));
          // add the field name to the updated fields array
          fieldsUpdated.push(field);
        }
    }
  }
  return { objEncrypted: obj, fieldsUpdated };
};

async.waterfall([
  (waterfallCb) => {
    const databaseUrl = databaseUtils.getMongoUrl('auth');
    MongoClient.connect(databaseUrl, databaseUtils.getMongoConnectOpts(), waterfallCb);
  },
  (mongoClient, waterfallCb) => {
    // Select mongo db
    const db = mongoClient.db(databaseUtils.getMongoDBName());
    clientsCollection = db.collection('clients');
    payeesCollection = db.collection('payees');
    if (process.argv[2]) {
      if (process.argv[2] === '--all') {
        console.log('------ processing ALL clients ------');
        const filter = {};
        waterfallCb(null, filter);
      } else {
        waterfallCb(null, { _id: ObjectId(process.argv[2]) });
      }
    } else {
      waterfallCb('Please provide a client id, or use --all to flush through ALl works')
    }
  },
  (clientFilter, waterfallCb) => {
    clientsCollection.find(clientFilter, { projection: { name: 1 }, sort: { name: 1 } }, waterfallCb);
  },
  (clients, waterfallCb) => {
    async.eachSeries(clients, (client, eachCb) => {
      console.log(`---- processing client: ${client.name} ----`);
      async.waterfall([
        (cb) => {
          runPayee(client, null, 0, cb);
        },
      ], eachCb);
    }, waterfallCb);
  },
], (err) => {
  if (err) { console.log(err); }
  else { console.log('Complete'); }
  process.exit(-1);
});
