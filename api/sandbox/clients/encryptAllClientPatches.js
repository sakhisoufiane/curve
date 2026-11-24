require('../models/db');

const { MongoClient } = require('mongodb');
const { ObjectId } = require('mongodb');
const async = require('async');
const _ = require('lodash');

const { databaseUtils, encryption, configShared, logger } = require('@curveroyaltysystems/platform-shared-utils');
const { encryptionUtils } = encryption;
const Client = require('../models/client');

const encryptedFields = configShared.encryptedFields.client;

// disable logger errors to stop them polluting console output
logger.error = () => {};

let clientPatchesCollection;

const limit = 1000;
let count = 0;

async function runClientPatches(lastId, total) {
  const filter = {};
  if (lastId) {
    filter._id = { $gt: lastId };
  }
  const clientPatches = await clientPatchesCollection.find(filter).sort({ _id: 1 }).limit(limit).toArray();
  
  let logDisplayed;
  for (const clientPatch of clientPatches) {
    logDisplayed = false;
    process.stdout.write(`\r${count += 1}/${clientPatches.length+total} - ${clientPatch._id}`);
    lastId = clientPatch._id;

    let clientId = clientPatch.ref;
    if (!clientId) {
      console.log(`${(!logDisplayed) ? '\n' : ''}\x1b[41m Missing clientId ${clientPatch.ref}, clientPatch ${clientPatch._id} \x1b[0m`);
      logDisplayed = true;
    }
    let encryptionKey;
    if (clientId) {
      encryptionKey = await encryptionUtils.getClientEncryptionKey(clientId, Client).catch((keyErr) => {
        console.log(`${(!logDisplayed) ? '\n' : ''}\x1b[46m Error getting key (client doesn't exist) for client ${clientPatch.ref}, clientPatch ${clientPatch._id} \x1b[0m`);
        logDisplayed = true;
      });
    }
    
    for (const entry of clientPatch.ops) {
      if (entry.op === 'deleted') {
        if (encryptionKey) {
          // encrypt entire document stored if it is a 'deleted' entry
          const { objEncrypted, fieldsUpdated } = encrypt(entry.value, encryptionKey2);
          entry.value = objEncrypted;
          console.log(`${(!logDisplayed) ? '\n' : ''}\x1b[33m Encrypted Deleted entry for clientPatch ${clientPatch._id}, updated fields: ${fieldsUpdated.join(', ')} \x1b[0m`);
          logDisplayed = true;
        } else {
          const obj = entry.value;
          const maskedFields = [];
          for (const field of encryptedFields) {
            const fieldVal = _.get(obj, field);
            const parts = field.split('.');
            const firstItem = obj[parts[0]];
            // if the field string contains dot notation and the first item in the field string points to an array of objects (e.g. arrayOfObjects.valToEncrypt)
            if (parts.length > 1 && Array.isArray(firstItem)) {
              for (const row of firstItem) {
                // mask value
                _.set(row, parts[1], '********');
                maskedFields.push(parts[1]);
              }
            } else if (fieldVal) {
              // mask value
              _.set(obj, field, '********');
              maskedFields.push(field);
            }
          }
          console.log(`${(!logDisplayed) ? '\n' : ''}\x1b[31m 'delete entry' masked ******** clientPatch ${clientPatch._id}, fields: ${maskedFields.join(', ')} \x1b[0m` );
        }
      } else {
        const pathDotNotation = entry.path?.substring(1).replaceAll('/', '.');
        const matches = encryptedFields.filter((field) => {
          // if the path contains the path of an encrypted field, we need to encrypt
          if (pathDotNotation.indexOf(field) === 0) {
            return true;
          }
          // if the encrypted field path contains the entry path, we need to check if value of this is an object and if the remainder of the encrypted field path is contained, and also encrypt
          if (field.indexOf(pathDotNotation) === 0) {
            const subPath = field.substring(pathDotNotation.length + 1);
            const val = encryption.encryptionUtils.decryptField(entry.value, encryptionKey);
            if (val) {
              const contained = _.get(val, subPath);
              return contained;
            } else {
              const contained = _.get(entry.value, subPath);
              return contained;
            }
          }
        });
        if (matches.length > 0) {
          if (encryptionKey) {
            // only update value if it is not already encrypted (will decrypt successfully if already encrypted)                
            const valueDecrypted = encryptionUtils.decryptField(entry.value, encryptionKey);
            if (!valueDecrypted) {
              // console.log(`${(!logDisplayed) ? '\n' : ''}\x1b[42m !valueDecrypted - ${entry.value} \x1b[0m`);
              logDisplayed = true;
              // encrypt field and assign back to value
              entry.value = encryption.encryptionUtils.encryptField(entry.value, encryptionKey);
              console.log(`${(!logDisplayed) ? '\n' : ''}\x1b[36m encrypted clientPatch ${clientPatch._id} ${entry.path}, value: ${entry.value} \x1b[0m`);
              logDisplayed = true;
            }

            // only update originalValue if it is not already encrypted (will decrypt successfully if already encrypted)
            const originalValueDecrypted = encryptionUtils.decryptField(entry.originalValue, encryptionKey);
            if (!originalValueDecrypted) {
              // console.log(`${(!logDisplayed) ? '\n' : ''}\x1b[42m !originalValueDecrypted  - ${entry.originalValue} \x1b[0m`);
              logDisplayed = true;
              // encrypt field and assign back
              entry.originalValue = encryption.encryptionUtils.encryptField(entry.originalValue, encryptionKey);
              console.log(`${(!logDisplayed) ? '\n' : ''}\x1b[36m encrypted clientPatch ${clientPatch._id} ${entry.path}, originalValue: ${entry.originalValue} \x1b[0m`);
              logDisplayed = true;
            }
          } else {
            if (entry.value) {
              entry.value = '********';
              console.log(`${(!logDisplayed) ? '\n' : ''}\x1b[31m entry.value masked ******** clientPatch ${clientPatch._id} ${entry.path} \x1b[0m` );
              logDisplayed = true;
            }
            if (entry.originalValue) {
              entry.originalValue = '********';
              console.log(`${(!logDisplayed) ? '\n' : ''}\x1b[31m entry.originalValue masked ******** clientPatch ${clientPatch._id} ${entry.path} \x1b[0m` );
              logDisplayed = true;
            }
          }
        }
      }
    };
    // console.log('clientPatch: ', JSON.stringify(clientPatch, null, 2));
    const clientUpdate = { ...clientPatch };
    delete clientUpdate._id;
    delete clientUpdate.__v;
    delete clientUpdate.timestamp;
    delete clientUpdate.author;
    delete clientUpdate.ref;
    await clientPatchesCollection.findOneAndUpdate({ _id: ObjectId(clientPatch._id) }, { $set: clientUpdate }, { timestamps: false });
  }
  
  console.log('clientPatches.length: ', clientPatches.length, limit);
  if (clientPatches && clientPatches.length === limit) {
    await runClientPatches(lastId, total + limit);
  }
  console.log();
  return;
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
          console.log(`${(!logDisplayed) ? '\n' : ''}\x1b[42m !fieldDecrypted \x1b[0m`);
          logDisplayed = true;
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
          console.log(`${(!logDisplayed) ? '\n' : ''}\x1b[42m !fieldDecrypted 2 \x1b[0m`);
          logDisplayed = true;
          // encrypt field of obj and assign value back to obj
          _.set(obj, field, encryptionUtils.encryptField(fieldVal, encryptionKey));
          // add the field name to the updated fields array
          fieldsUpdated.push(field);
        }
    }
  }
  return { objEncrypted: obj, fieldsUpdated };
};

async function run() {
  const databaseUrl = await databaseUtils.getMongoUrl('auth');
  const mongoClient = await MongoClient.connect(databaseUrl, databaseUtils.getMongoConnectOpts());
  // Select mongo db
  const db = mongoClient.db(databaseUtils.getMongoDBName());
  clientPatchesCollection = db.collection('client_patches');
  const count = await clientPatchesCollection.countDocuments();
  console.log('Total Client Patches: ', count);
  await runClientPatches(null, 0).catch((err) => {
    if (err) { console.log(err); }
  });
  process.exit(-1);
}

run();