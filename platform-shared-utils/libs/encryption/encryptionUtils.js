/**
 * @module encryptionUtils
 */

const crypto = require('crypto');
const mpath = require('mpath');
const _ = require('lodash');
// Get environment variables
require('dotenv').config();

const logger = require('../logger');

/* ---------- Encryption settings --------- */
const ENCRYPTION_ALGORITHM = 'aes-256-cbc';
const IV_LENGTH = 16;

const { MASTER_ENCRYPTION_KEY } = process.env;

module.exports = {
  /**
   * Gets and decrypts client encryption key
   *
   * @param {string} clientId - The client id
   * @param {object} Client - The client model
   * @returns {buffer} decrypted client encryption key Buffer
   */
  async getClientEncryptionKey(clientId, Client) {
    const client = await Client.findById(clientId, 'encryptionKey');
    if (client?.encryptionKey) {
      const key = this.decryptKey(client.encryptionKey);
      return key;
    }
    throw new Error(`No encryption key found for client ${clientId}`);
  },

  /**
   * Decrypts a key using the MASTER_ENCRYPTION_KEY
   *
   * @param {string} encryptedKey - the encrypted key in hex format
   * @returns {buffer} decrypted key Buffer
   */
  async decryptKey(encryptedKey) {
    try {
      const encryptionKeyBuffer = Buffer.from(encryptedKey, 'hex');
      const iv = encryptionKeyBuffer.slice(0, IV_LENGTH);
      const encryptionKey = encryptionKeyBuffer.slice(IV_LENGTH);
      const decipher = crypto.createDecipheriv(ENCRYPTION_ALGORITHM, MASTER_ENCRYPTION_KEY, iv);
      const decryptedKey = Buffer.concat([decipher.update(encryptionKey), decipher.final()]);
      return decryptedKey;
    } catch (err) {
      logger.error(`Error decrypting key: ${err}`);
      const error = new Error('Error obtaining encryption key. Please try again, or contact the support team.');
      error.showToUser = true;
      throw error;
    }
  },

  /**
   * Encrypts a key using the MASTER_ENCRYPTION_KEY
   *
   * @param {buffer} key - the key Buffer to encrypt
   * @returns {string} the encrypted key in hex format
   */
  encryptKey(key) {
    let encryptedKey;
    if (key && MASTER_ENCRYPTION_KEY) {
      const iv = crypto.randomBytes(IV_LENGTH);
      const cipher = crypto.createCipheriv(ENCRYPTION_ALGORITHM, MASTER_ENCRYPTION_KEY, iv);
      encryptedKey = Buffer.concat([iv, cipher.update(key), cipher.final()]).toString('hex');
    }
    return encryptedKey;
  },

  /**
   * Creates a random key with a byte length of 32
   * @returns {buffer} random key Buffer
   */
  createKey() {
    const randomKey = crypto.randomBytes(32);
    return randomKey;
  },

  /**
   * Deletes encrypted fields included in the obj if the user is not authorised to update them
   *
   * @param {object} obj - The object to be checked and masked
   * @param {array} encryptedFields - a list of encrypted fields names
   * @param {object} [user] - Curve user
   * @returns {object} the object provided, with encrypted fields deleted, if user not authorised to see encrypted fields
   */
  deleteEncryptedFields(obj, encryptedFields, user) {
    const encryptionUtils = this;
    // if user is provided and user is not an admin user or is an internal user
    if (obj && encryptedFields && !encryptionUtils.isClientAdminUser(user)) {
      for (const field of encryptedFields) {
        const parts = field.split('.');
        const firstItem = obj[parts[0]];
        // if the field string contains dot notation and the first item in the field string points to an array of objects (e.g. arrayOfObjects.valToEncrypt)
        if (parts.length > 1 && Array.isArray(firstItem)) {
          for (const row of firstItem) {
            // delete the encrypted field from row
            _.unset(row, parts[1]);
          }
        } else {
          // delete the encrypt field from obj
          _.unset(obj, field);
        }
      }
    }
    return obj;
  },

  /**
   * Clears encrypted fields included in the obj if the user is not authorised to update them.
   * Use this for Mongoose documents as the values can not be deleted if defined in the Schema
   *
   * @param {object} obj - The object to be checked and masked
   * @param {array} encryptedFields - a list of encrypted fields names
   * @param {object} [user] - Curve user
   * @returns {object} the object provided, with encrypted fields set to `undefined`, if user not authorised to see encrypted fields
   */
  clearEncryptedFields(obj, encryptedFields, user) {
    const encryptionUtils = this;
    // if user is provided and user is not an admin user or is an internal user
    if (obj && encryptedFields && !encryptionUtils.isClientAdminUser(user)) {
      for (const field of encryptedFields) {
        const parts = field.split('.');
        const objectJS = encryptionUtils.getObjectOrDocument(obj);
        const firstItem = objectJS[parts[0]];
        // if the field string contains dot notation and the first item in the field string points to an array of objects (e.g. arrayOfObjects.valToEncrypt)
        if (parts.length > 1 && Array.isArray(firstItem)) {
          for (let idx = 0; idx < firstItem.length; idx += 1) {
            const row = firstItem[idx];
            const rowObj = obj[parts[0]][idx];
            // set the encrypted field to undefined
            if (_.has(row, parts[1])) {
              _.set(rowObj, parts[1], undefined);
            }
          }
        } else if (_.has(objectJS, field)) {
          // delete the encrypt field from obj
          _.set(obj, field, undefined);
        }
      }
    }
    return obj;
  },

  /**
   * Returns true if user is a client admin user
   * @param {object} user - Curve user
   * @returns {boolean} `true` if user is client admin
   */
  isClientAdminUser(user) {
    const clientAdminUser = (user?.adminType === 'Admin');
    return clientAdminUser;
  },

  /**
   * Returns the keys of either an object or Mongoose document object
   *
   * @param {object} objOrDocument - either a JavaScript object or Mongoose document object
   * @returns {object} either original object supplied or for a Mongoose document, the object derived using `.toObject()`
   */
  getObjectOrDocument(objOrDocument) {
    // if the provided object is a Mongoose document, get a JS object using .toObject()
    const object = (objOrDocument?.constructor?.name === 'model') ? objOrDocument.toObject() : objOrDocument;
    return object;
  },

  /**
   * Checks if an object contains any properties referred to in encrypted fields list
   *
   * @param {object} doc - object to process
   * @param {array} encryptedFields - list of field paths to encrypt
   * @returns {boolean} `true` if `doc` contains any properties in paths in `encryptedFields`
   */
  containsEncryptedFields(doc, encryptedFields) {
    if (doc && encryptedFields) {
      return (Array.isArray(encryptedFields) && encryptedFields.some((field) => mpath.get(field, doc)));
    }
    return false;
  },

  /* ---------- Encryption methods --------- */

  /**
   * Encrypt any object fields contained in the list of fields to encrypt
   *
   * @param {object} obj - object to process
   * @param {string} encryptionKey - encryption key to use for encryption
   * @param {array} encryptedFields - list of fields to encrypt
   * @returns {object} the object with the applicable fields having been encrypted
   */
  encryptObject(obj, encryptionKey, encryptedFields) {
    const encryptionUtils = this;
    for (const field of encryptedFields) {
      const fieldVal = _.get(obj, field);
      const parts = field.split('.');
      const firstItem = obj[parts[0]];
      // if the field string contains dot notation and the first item in the field string points to an array of objects (e.g. arrayOfObjects.valToEncrypt)
      if (parts.length > 1 && Array.isArray(firstItem)) {
        for (const row of firstItem) {
          // encrypt each row and assign value back to the row
          _.set(row, parts[1], encryptionUtils.encryptField(_.get(row, parts[1]), encryptionKey));
        }
      } else if (fieldVal) {
        // encrypt field of obj and assign value back to obj
        _.set(obj, field, encryptionUtils.encryptField(fieldVal, encryptionKey));
      }
    }
    return obj;
  },

  /**
   * Encrypt the provided value using the encryption key
   *
   * @param {string|object|array} value - the value to encrypt
   * @param {string} encryptionKey - encryption key to use for encryption
   * @returns {string} the encrypted string
   */
  encryptField(value, encryptionKey) {
    try {
      if (value) {
        // create JSON string from field data
        const jsonToEncrypt = JSON.stringify(value);
        // generate random iv
        const iv = crypto.randomBytes(IV_LENGTH);
        // set up cipher
        const cipher = crypto.createCipheriv(ENCRYPTION_ALGORITHM, encryptionKey, iv);
        // encrypt the JSON string
        const encrypted = cipher.update(jsonToEncrypt, 'utf8', 'hex') + cipher.final('hex');
        // assign the encrypted hex string back to the document field
        return iv.toString('hex') + encrypted;
      }
      return value;
    } catch (err) {
      logger.error(`Error while encrypting: ${err}`);
      const error = new Error('Error while encrypting data. Please try again, or contact the support team.');
      error.showToUser = true;
      throw error;
    }
  },

  /* ---------- Decryption methods --------- */

  /**
   * Decrypt any object fields contained in the list of fields to decrypt
   *
   * @param {object} obj - object to process
   * @param {string} encryptionKey - encryption key to use for encryption
   * @param {array} encryptedFields - list of fields to encrypt
   * @returns {object} the object with the applicable fields having been decrypted
   */
  decryptObject(obj, encryptionKey, encryptedFields) {
    const encryptionUtils = this;
    for (const field of encryptedFields) {
      const fieldVal = _.get(obj, field);
      const parts = field.split('.');
      const firstItem = obj[parts[0]];
      if (parts.length > 1 && Array.isArray(firstItem)) {
        for (const row of firstItem) {
          // decrypt each row and assign value back to the row
          // assign value back to the document field
          _.set(row, parts[1], encryptionUtils.decryptField(_.get(row, parts[1]), encryptionKey));
        }
      } else if (fieldVal) {
        // decrypt field of obj and assign value back to obj
        _.set(obj, field, encryptionUtils.decryptField(fieldVal, encryptionKey));
      }
    }
    return obj;
  },

  /**
   * Decrypt the provided value using the encryption key
   *
   * @param {string} value - the string to decrypt
   * @param {string} encryptionKey - encryption key to use for encryption
   * @returns {string|object|array} the decrypted value
   */
  decryptField(fieldVal, encryptionKey) {
    // skip decryption if empty object, undefined or empty string
    if (_.isEmpty(fieldVal) || fieldVal === undefined || fieldVal === '') {
      return fieldVal;
    }
    // if the field is defined as an array, the encrypted value will be stored in the first row of the array
    const cipherVal = (Array.isArray(fieldVal)) ? fieldVal[0] : fieldVal;
    if (cipherVal) {
      try {
        // create Buffer from hex string
        const objectBufferToDecrypt = Buffer.from(cipherVal, 'hex');
        // get the iv from the start of the buffer
        const iv = objectBufferToDecrypt.slice(0, IV_LENGTH);
        // get the encrypted data string from the remainder of the buffer
        const encrypted = objectBufferToDecrypt.slice(IV_LENGTH);
        // set up decipher
        const decipher = crypto.createDecipheriv(ENCRYPTION_ALGORITHM, encryptionKey, iv);
        // get the JSON string from the encrypted hex string
        const decryptedObjectJSON = decipher.update(encrypted, 'hex', 'utf8') + decipher.final('utf8');
        // parse the JSON string
        const decryptedObject = JSON.parse(decryptedObjectJSON);
        return decryptedObject;
      } catch (decipherErr) {
        logger.error(`Error while decrypting: ${decipherErr}`);
      }
    }
    // Not throwing an error but returning a blank value instead
    return undefined;
  },

  /**
   * Gets the encryption key from the document, either by looking at doc.clientId or doc.encryptionKey (for client documents)
   *
   * @param {object} doc - the document to get the key from
   * @param {object} Client - the Client model passed in
   * @returns {string} the encryption key
   */
  async getEncryptionKey(doc, Client) {
    const encryptionUtils = this;
    if (doc) {
      if (doc.clientId) {
        return encryptionUtils.getClientEncryptionKey(doc.clientId, Client);
      }
      if (doc.encryptionKey) {
        return encryptionUtils.decryptKey(doc.encryptionKey);
      }
    }
    throw new Error('Could not obtain encryption key');
  },
};
