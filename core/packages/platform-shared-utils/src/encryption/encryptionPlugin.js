const _ = require('lodash');

const logger = require('../logger');
const encryptionUtils = require('./encryptionUtils');

/**
 * Encryption plugin for use with mongoose models
 * @module encryptionPlugin
 *
 * @param {object}   schema - The schema
 * @param {object}   options - Plugin options
 * @param {string[]} [options.encryptedFields] - A list of fields to encrypt. Default is to encrypt all fields.
 * @param {boolean}  [options.decryptPostSave=true] - Whether to automatically decrypt documents in the application after saving them (faster if false)
 * @param {object}   [options.Client] - Client model
 */
const encryptionPlugin = function (schema, options) {
  let encryptedFields;
  const { Client } = options;

  _.defaults(options, {
    decryptPostSave: true, // allow for skipping the decryption after save for improved performance
  });

  /** Encryption Options */
  if (Array.isArray(options.encryptedFields) && options.encryptedFields.length > 0) {
    ({ encryptedFields } = options);
  } else {
    throw new Error('At least one field needs to be included in encrypted fields list');
  }

  /** Ensure plugin only added once per schema */
  if (schema.statics._mongooseEncryptionInstalled) {
    throw new Error('Mongoose encryption plugin can only be added once per schema.');
  } else {
    schema.statics._mongooseEncryptionInstalled = true;
  }

  /** Middleware */
  const preFindMiddleware = async function () {
    // logger.debug('**** preFindMiddleware ****');
    const query = this;
    // get fields from database which are required for decryption, only if projection was used with query. Without projection all fields will be included by default.
    if (query._fields) {
      const queryFieldsNoChildren = Object.keys(query._fields).map((field) => field.split('.')[0]);
      // only add fields required for encryption if query fields contain any encrypted fields
      if (encryptedFields.some((encField) => queryFieldsNoChildren.includes(encField.split('.')[0]))) {
        query._fields.clientId = 1;
        query._fields.encryptionKey = 1;
      }
    }
    // logger.debug('query._fields: ', query._fields);
  };

  const postFindOneMiddleware = async function (doc) {
    // logger.debug('**** postFindOneMiddleware ****');
    return processDoc(doc, this._userProvidedFields)
  };

  const processDoc = async (doc, userFields) => {
    // only get the encryption key and encrypt if doc includes any encrypted fields
    if (encryptionUtils.containsEncryptedFields(doc, encryptedFields)) {
      const encryptionKey = await encryptionUtils.getEncryptionKey(doc, Client).catch((err) => {
        logger.error(`Error while getting encryption key within postFindOneMiddleware: ${err}`);
      });
      const docDecrypted = encryptionUtils.decryptObject(doc, encryptionKey, encryptedFields);
      return clearAddedFieldsIfNotRequested(docDecrypted, userFields);
    }
    return clearAddedFieldsIfNotRequested(doc, userFields);
  };

  const postFindManyMiddleware = async function (docs) {
    // logger.debug('**** postFindManyMiddleware ****');
    const userFields = this._userProvidedFields;

    if (Array.isArray(docs)) {
      await Promise.all(docs.map(async (d, i) => { docs[i] = await processDoc(d, userFields); }));
    }
  };

  const preFindOneAndUpdateMiddleware = async function () {
    // logger.debug('**** preFindOneAndUpdateMiddleware ****');
    const query = this;
    const update = query.getUpdate();
    const set = update?.$set;
    // if $set contains encrypted fields
    if (encryptionUtils.containsEncryptedFields(set, encryptedFields)) {
      // get the document to obtain it's clientId or encryptionKey
      const doc = await this.model.findOne(this.getQuery(), { clientId: 1, encryptionKey: 1 });
      // @TODO: We could use query._original instead of another DB query but not sure if this is safe to do
      if (doc) {
        // get the encryption key
        const encryptionKey = await encryptionUtils.getEncryptionKey(doc, Client).catch((err) => {
          logger.error(`Error while getting encryption key within preFindOneAndUpdateMiddleware: ${err}`);
          const error = new Error('No encryption key found. Please try again, or contact the support team.');
          error.showToUser = true;
          throw error;
        });
        // encrypt any encrypted fields contained in set and assign to $set property of the update
        update.$set = encryptionUtils.encryptObject(set, encryptionKey, encryptedFields);
        // then assign the update back to the query
        query.setUpdate(update);
      }
    }
  };

  const preSaveMiddleware = async function () {
    // logger.debug('**** preSaveMiddleware ****');
    let doc = this;
    // only get the encryption key and encrypt if doc includes any encrypted fields
    if (encryptionUtils.containsEncryptedFields(doc, encryptedFields)) {
      const encryptionKey = await encryptionUtils.getEncryptionKey(doc, Client).catch((err) => {
        logger.error(`Error while getting encryption key within preSaveMiddleware: ${err}`);
        const error = new Error('No encryption key found. Please try again, or contact the support team.');
        error.showToUser = true;
        throw error;
      });
      doc = encryptionUtils.encryptObject(doc, encryptionKey, encryptedFields);
    }
  };

  // using the same function for findOne and find queries
  schema.pre(['findOne', 'find'], preFindMiddleware);

  schema.post('findOne', postFindOneMiddleware);
  schema.post('find', postFindManyMiddleware);

  schema.pre('findOneAndUpdate', preFindOneAndUpdateMiddleware);

  schema.pre('save', preSaveMiddleware);

  if (options.decryptPostSave) {
    // true by default
    schema.post(['save', 'findOneAndUpdate'], async function (doc) {
      // logger.debug('**** decryptPostSaveOrUpdate ****');
      // only get the encryption key and decrypt if doc includes any encrypted fields
      if (encryptionUtils.containsEncryptedFields(doc, encryptedFields)) {
        const encryptionKey = await encryptionUtils.getEncryptionKey(doc, Client).catch((err) => {
          logger.error(`Error while getting encryption key within decryptPostSaveOrUpdate: ${err}`);
        });
        const docDecrypted = encryptionUtils.decryptObject(doc, encryptionKey, encryptedFields);
        return clearAddedFieldsIfNotRequested(docDecrypted, this._userProvidedFields);
      }
      return clearAddedFieldsIfNotRequested(doc, this._userProvidedFields);
    });
  }

  /**
   * Clears clientId and / or encryptionKey from the provided object if projection / select was used as part of query and these were not requested to be returned
   * @param {object} doc - the document to process
   * @param {object} userProvidedFields - list of fields selected to be returned, formatted as { field1: 1, field2: 1, ...}
   * @returns {object} the modified document
   */
  const clearAddedFieldsIfNotRequested = function (doc, userProvidedFields) {
    const document = doc;
    if (userProvidedFields && document) {
      const fieldNames = Object.keys(userProvidedFields);
      if (document.clientId && !fieldNames.includes('clientId')) {
        document.clientId = undefined;
      }
      if (document.encryptionKey && !fieldNames.includes('encryptionKey')) {
        document.encryptionKey = undefined;
      }
    }
    return document;
  };
};

module.exports = encryptionPlugin;
