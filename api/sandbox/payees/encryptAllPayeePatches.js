require('../models/db');

const { MongoClient } = require('mongodb');
const { ObjectId } = require('mongodb');
const async = require('async');
const _ = require('lodash');

const { databaseUtils, encryption, configShared, logger } = require('@curveroyaltysystems/platform-shared-utils');
const { encryptionUtils } = encryption;
const Client = require('../models/client');
const Payee = require('../models/payee');

const encryptedFields = configShared.encryptedFields.payee;

// disable logger errors to stop them polluting console output
logger.error = () => {};

let payeePatchesCollection;

const limit = 1000;
let count = 0;

async function runPayeePatches(lastId, total) {
  const filter = {};
  if (lastId) {
    filter._id = { $gt: lastId };
  }
  const payeePatches = await payeePatchesCollection.find(filter).sort({ _id: 1 }).limit(limit).toArray();
  
  let logDisplayed;
  for (const payeePatch of payeePatches) {
    logDisplayed = false;
    process.stdout.write(`\r${count += 1}/${payeePatches.length+total} - ${payeePatch._id}`);
    lastId = payeePatch._id;

    let clientId = payeePatch.clientId;
    if (!clientId) {
      const payee = await Payee.findById(payeePatch.ref, { clientId: 1 });
      if (!payee) {
        console.log(`${(!logDisplayed) ? '\n' : ''}\x1b[41m Missing payee ${payeePatch.ref}, payeePatch ${payeePatch._id} \x1b[0m`);
        logDisplayed = true;
      } else if (!payee.clientId) {
        console.log(`${(!logDisplayed) ? '\n' : ''}\x1b[45m Missing clientId for payee ${payee._id}, payeePatch ${payeePatch._id} \x1b[0m`);
        logDisplayed = true;
      } else {
        console.log(`${(!logDisplayed) ? '\n' : ''}\x1b[32m getting clientId from payee ${payee._id}, payeePatch ${payeePatch._id} \x1b[0m`);
        logDisplayed = true;
        clientId = payee.clientId;
      }
    }
    let encryptionKey;
    if (clientId) {
      encryptionKey = await encryptionUtils.getClientEncryptionKey(clientId, Client).catch((keyErr) => {
        console.log(`${(!logDisplayed) ? '\n' : ''}\x1b[46m Error getting key (client doesn't exist) for client ${clientId}, payee ${payeePatch.ref}, payeePatch ${payeePatch._id} \x1b[0m`);
        logDisplayed = true;
      });
    }
    
    for (const entry of payeePatch.ops) {
      if (entry.op === 'deleted') {
        const encryptionKey2 = await encryptionUtils.getClientEncryptionKey(entry.value.clientId, Client).catch((keyErr) => {
          // console.log(`${(!logDisplayed) ? '\n' : ''}\x1b[45m Error getting key from deleted for client ${entry.value.clientId}, payee ${payeePatch.ref}, payeePatch ${payeePatch._id} \x1b[0m`);
          // logDisplayed = true;
        });
        if (encryptionKey2) {
          // encrypt entire document stored if it is a 'deleted' entry
          const { objEncrypted, fieldsUpdated } = encrypt(entry.value, encryptionKey2);
          entry.value = objEncrypted;
          console.log(`${(!logDisplayed) ? '\n' : ''}\x1b[33m Encrypted Deleted entry for payeePatch ${payeePatch._id}, updated fields: ${fieldsUpdated.join(', ')} \x1b[0m`);
          logDisplayed = true;
        } else {
          console.log(`${(!logDisplayed) ? '\n' : ''}\x1b[45m Error getting key from deleted for client ${entry.value.clientId}, payee ${payeePatch.ref}, payeePatch ${payeePatch._id} \x1b[0m`);
          logDisplayed = true;
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
          console.log(`${(!logDisplayed) ? '\n' : ''}\x1b[31m 'delete entry' masked ******** payeePatch ${payeePatch._id}, fields: ${maskedFields.join(', ')} \x1b[0m` );
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
              // encrypt field and assign back to value
              entry.value = encryption.encryptionUtils.encryptField(entry.value, encryptionKey);
              console.log(`${(!logDisplayed) ? '\n' : ''}\x1b[36m encrypted payeePatch ${payeePatch._id} ${entry.path} - value: ${entry.value}\x1b[0m`);
              logDisplayed = true;
            }

            // only update originalValue if it is not already encrypted (will decrypt successfully if already encrypted)
            const originalValueDecrypted = encryptionUtils.decryptField(entry.originalValue, encryptionKey);
            if (!originalValueDecrypted) {
              // encrypt field and assign back
              entry.originalValue = encryption.encryptionUtils.encryptField(entry.originalValue, encryptionKey);
              console.log(`${(!logDisplayed) ? '\n' : ''}\x1b[36m encrypted payeePatch ${payeePatch._id} ${entry.path} - originalValue: ${entry.originalValue} \x1b[0m`);
              logDisplayed = true;
            }
          } else {
            if (entry.value) {
              entry.value = '********';
              console.log(`${(!logDisplayed) ? '\n' : ''}\x1b[31m entry.value masked ******** payeePatch ${payeePatch._id} ${entry.path} \x1b[0m` );
              logDisplayed = true;
            }
            if (entry.originalValue) {
              entry.originalValue = '********';
              console.log(`${(!logDisplayed) ? '\n' : ''}\x1b[31m entry.originalValue masked ******** payeePatch ${payeePatch._id} ${entry.path} \x1b[0m` );
              logDisplayed = true;
            }
          }
        }
      }
    };
    // console.log('payeePatch: ', JSON.stringify(payeePatch, null, 2));
    const payeeUpdate = { ...payeePatch };
    delete payeeUpdate._id;
    delete payeeUpdate.__v;
    delete payeeUpdate.timestamp;
    delete payeeUpdate.author;
    delete payeeUpdate.ref;
    await payeePatchesCollection.findOneAndUpdate({ _id: ObjectId(payeePatch._id) }, { $set: payeeUpdate }, { timestamps: false });
  }
  
  console.log('payeePatches.length: ', payeePatches.length, limit);
  if (payeePatches && payeePatches.length === limit) {
    await runPayeePatches(lastId, total + limit);
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

async function run() {
  const databaseUrl = await databaseUtils.getMongoUrl('auth');
  const mongoClient = await MongoClient.connect(databaseUrl, databaseUtils.getMongoConnectOpts());
  // Select mongo db
  const db = mongoClient.db(databaseUtils.getMongoDBName());
  payeePatchesCollection = db.collection('payee_patches');
  const count = await payeePatchesCollection.countDocuments();
  console.log('Total Payee Patches: ', count);
  await runPayeePatches(null, 0).catch((err) => {
    if (err) { console.log(err); }
  });
  process.exit(-1);
}

run();