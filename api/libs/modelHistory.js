const { logger, encryption } = require('@curveroyaltysystems/platform-shared-utils');
const { Schema } = require('@curveroyaltysystems/models/mongoose');
const assert = require('assert');
const jsonpatch = require('fast-json-patch');
const humps = require('humps');
const Promise = require('bluebird');
const _join = require('bluebird').join;
const _ = require('lodash');

const RollbackError = function (message, extra) {
  Error.captureStackTrace(this, this.constructor);
  this.name = 'RollbackError';
  this.message = message;
};

/**
 * Filters out operations that target excluded paths (/deliveredTo, /inFutureDelivery).
 *
 * @param {Object} params
 * @param {Array<{op: string, path: string, value: *}>} params.ops - JSON Patch operations to evaluate
 * @returns {Array<{op: string, path: string, value: *}>} Operations that do not target excluded paths
 */
const filterExclusions = ({ ops }) => {
  const EXCLUSIONS = ['/deliveredTo', '/inFutureDelivery'];

  return ops.filter((op) => !EXCLUSIONS.some((exclusion) => op.path.startsWith(exclusion)));
};

require('util').inherits(RollbackError, Error);

const createPatchModel = (options) => {
  const def = {
    timestamp: { type: Date, default: Date.now },
    author: { type: Schema.Types.ObjectId, ref: 'User' },
    clientId: { type: Schema.Types.ObjectId },
    ops: { type: [], required: true },
    ref: { type: options._idType, required: true, index: true },
  };

  _.each(options.includes, (type, name) => {
    def[name] = _.omit(type, 'from');
  });

  const PatchSchema = new Schema(def);

  return options.mongoose.model(
    options.transforms[0](`${options.name}`),
    PatchSchema,
    options.transforms[1](`${options.name}`),
  );
};

const defaultOptions = {
  includes: {},
  excludes: [],
  removePatches: true,
  useArchive: false,
  transforms: [humps.pascalize, humps.decamelize],
  trackOriginalValue: true,
  trackAuthor: true,
  trackClient: true,
};

const ARRAY_INDEX_WILDCARD = '*';

/**
 * Splits a json-patch-path of form `/path/to/object` to an array `['path', 'to', 'object']`.
 * Note: `/` is returned as `[]`
 *
 * @param {string} path Path to split
 */
const getArrayFromPath = (path) => path.replace(/^\//, '').split('/');

/**
 * Checks the provided `json-patch-operation` on `excludePath`. This check joins the `path` and `value` property of the `operation` and removes any hit.
 *
 * @param {Operation} patch operation to check with `excludePath` - see import('fast-json-patch').Operation
 * @param {String[]} excludePath Path to property to remove from value of `operation`
 *
 * @return `false` if `patch.value` is `{}` or `undefined` after remove, `true` in any other case
 */
const deepRemovePath = (patch, excludePath) => {
  const operationPath = sanitizeEmptyPath(getArrayFromPath(patch.path));

  if (isPathContained(operationPath, excludePath)) {
    let { value } = patch;

    // because the paths overlap start at patchPath.length
    // e.g.: patch: { path:'/object', value:{ property: 'test' } }
    // pathToExclude: '/object/property'
    // need to start at array idx 1, because value starts at idx 0
    for (let i = operationPath.length; i < excludePath.length - 1; i += 1) {
      if (excludePath[i] === ARRAY_INDEX_WILDCARD && Array.isArray(value)) {
        // start over with each array element and make a fresh check
        // Note: it can happen that array elements are rendered to: {}
        //         we need to keep them to keep the order of array elements consistent
        value.forEach((elem) => {
          deepRemovePath({ path: '/', value: elem }, excludePath.slice(i + 1));
        });

        // If the patch value has turned to {} return false so this patch can be filtered out
        if (Object.keys(patch.value).length === 0) return false;
        return true;
      }
      value = value[excludePath[i]];

      if (typeof value === 'undefined') return true;
    }
    if (typeof value[excludePath[excludePath.length - 1]] === 'undefined') return true;

    delete value[excludePath[excludePath.length - 1]];
    // If the patch value has turned to {} return false so this patch can be filtered out
    if (Object.keys(patch.value).length === 0) return false;
  }
  return true;
};

/**
 * Sanitizes a path `['']` to be used with `isPathContained()`
 * @param {String[]} path
 */
const sanitizeEmptyPath = (path) => (path.length === 1 && path[0] === '' ? [] : path);

// Checks if 'fractionPath' is contained in fullPath
// Exp. 1: fractionPath '/path/to',              fullPath '/path/to/object'       => true
// Exp. 2: fractionPath '/arrayPath/*/property', fullPath '/arrayPath/1/property' => true
const isPathContained = (fractionPath, fullPath) => fractionPath.every(
  (entry, idx) => entryIsIdentical(entry, fullPath[idx])
      || matchesArrayWildcard(entry, fullPath[idx]),
);

const entryIsIdentical = (entry1, entry2) => entry1 === entry2;

const matchesArrayWildcard = (entry1, entry2) => isArrayIndexWildcard(entry1) && isIntegerGreaterEqual0(entry2);

const isArrayIndexWildcard = (entry) => entry === ARRAY_INDEX_WILDCARD;

const isIntegerGreaterEqual0 = (entry) => Number.isInteger(Number(entry)) && Number(entry) >= 0;

// used to convert bson to json - especially ObjectID references need
// to be converted to hex strings so that the jsonpatch `compare` method
// works correctly
const toJSON = (obj) => JSON.parse(JSON.stringify(obj));

// helper function to merge query conditions after an update has happened
// usefull if a property which was initially defined in _conditions got overwritten
// with the update
const mergeQueryConditionsWithUpdate = (_conditions, _update) => {
  const update = _update ? _update.$set || _update : _update;
  const conditions = { ..._conditions, ...update };

  // excluding updates other than $set
  Object.keys(conditions).forEach((key) => {
    if (key.includes('$')) delete conditions[key];
  });
  return conditions;
};

const main = function (schema, opts) {
  const options = _.merge({}, defaultOptions, opts);

  // get _id type from schema
  options._idType = schema.tree._id.type;

  // transform excludes option
  options.excludes = options.excludes.map(getArrayFromPath);

  // validate parameters
  assert(options.mongoose, '`mongoose` option must be defined');
  assert(options.name, '`name` option must be defined');
  assert(options._idType, 'schema is missing an `_id` property');

  // used to compare instance data snapshots. depopulates instance,
  // removes version key and object id
  schema.methods.data = function () {
    return this.toObject({
      depopulate: true,
      versionKey: false,
      transform: (doc, ret, options) => {
        delete ret._id;
        // if timestamps option is set on schema, ignore timestamp fields
        if (schema.options.timestamps) {
          delete ret[schema.options.timestamps.createdAt || 'createdAt'];
          delete ret[schema.options.timestamps.updatedAt || 'updatedAt'];
        }
      },
    });
  };

  // @DITE: thinking of removing this, as this may need further encrypt / decrypt work
  // roll the document back to the state of a given patch id()
  schema.methods.rollback = function (patchId, data, save = true) {
    return this.patches
      .find({ ref: this.id })
      .sort({ timestamp: 1 })
      .exec()
      .then(
        (patches) => new Promise((resolve, reject) => {
          // patch doesn't exist
          if (!~_.map(patches, 'id').indexOf(patchId)) {
            return reject(new RollbackError("patch doesn't exist"));
          }

          // get all patches that should be applied
          const apply = _.dropRightWhile(
            patches,
            (patch) => patch.id !== patchId,
          );

          // if the patches that are going to be applied are all existing patches,
          // the rollback attempts to rollback to the latest patch
          if (patches.length === apply.length) {
            return reject(new RollbackError('rollback to latest patch'));
          }

          // apply patches to `state`
          const state = {};
          apply.forEach((patch) => {
            jsonpatch.applyPatch(state, patch.ops, true);
          });

          // set new state
          this.set(_.merge(data, state));

          // in case of save, save it back to the db and resolve
          if (save) {
            this.save().then(resolve).catch(reject);
          } else resolve(this);
        }),
      );
  };

  // create patch model, enable static model access via `Patches` and
  // instance method access through an instances `patches` property
  const Patches = createPatchModel(options);
  schema.statics.Patches = Patches;
  schema.virtual('patches').get(() => Patches);

  // after a document is initialized or saved, fresh snapshots of the
  // documents data are created
  const snapshot = function () {
    this._original = toJSON(this.data());
  };
  schema.post('init', snapshot);
  schema.post('save', snapshot);

  // when a document is removed and `removePatches` is not set to false ,
  // all patch documents from the associated patch collection are also removed
  function deletePatches(document) {
    return document.patches
      .find({ ref: document._id })
      .then((patches) => _join(patches.map((patch) => patch.deleteOne())));
  }

  // schema.post('deleteMany', function (document, next) {
  //   console.log(document._conditions);
  //   next();
  // });

  schema.post('deleteOne', { document: true }, deletionCleanupHandler);
  schema.post('deleteOne', { document: true }, deletionArchiveHandler);

  async function deletionArchiveHandler(document, next) {
    if (!options.useArchive || !document) {
      return next();
    }

    let value;
    if (options.encryptedFields && encryption.encryptionUtils.containsEncryptedFields(document, options.encryptedFields)) {
      const doc = _.cloneDeep(document.toObject());
      // get the encryption key
      const encryptionKey = await encryption.encryptionUtils.getEncryptionKey(doc, options.Client).catch((keyErr) => {
        logger.error(`Error while getting encryption key within modelHistory.deletionArchiveHandler, clientId: ${document.clientId}, document id: ${document._id}`, keyErr);
      });
      // encrypt any encrypted fields contained in doc
      value = encryption.encryptionUtils.encryptObject(doc, encryptionKey, options.encryptedFields);
    } else {
      value = document.toObject();
    }

    const ops = {
      op: 'deleted',
      path: '/',
      value,
    };

    let author = null;
    if (options.trackAuthor) {
      author = document.lastModifiedBy;
    }

    let clientId = null;
    if (options.trackClient) {
      ({ clientId } = document);
    }

    const deletionPatch = {
      ops,
      author,
      clientId,
      ref: document._id,
      timestamp: new Date(),
    };

    document.patches.create(deletionPatch).then(() => next()).catch(next);
  }

  function deletionCleanupHandler() {
    if (!options.removePatches) {
      return;
    }
    return deletePatches(this);
  }

  // when a document is saved, the json patch that reflects the changes is
  // computed. if the patch consists of one or more operations (meaning the
  // document has changed), a new patch document reflecting the changes is
  // added to the associated patch collection
  async function createPatch(document, queryOptions = {}) {
    // get the encryption key if model contains encrypted fields
    if (queryOptions.createPatch !== false) {
      let encryptionKey;
      if (options.encryptedFields) {
        encryptionKey = await encryption.encryptionUtils.getEncryptionKey(document, options.Client).catch((keyErr) => {
          logger.error(`Error while getting encryption key within modelHistory.createPatch, clientId: ${document.clientId}, document id: ${document._id}`, keyErr);
        });
      }

      let original;
      // decrypted the original document if model contains encrypted fields
      if (options.encryptedFields && document._original && encryption.encryptionUtils.containsEncryptedFields(document._original, options.encryptedFields)) {
        const orig = _.cloneDeep(document._original);
        // decrypt any encrypted fields contained in original document
        original = encryption.encryptionUtils.decryptObject(orig, encryptionKey, options.encryptedFields);
      } else {
        // otherwise just get the original document
        original = document._original;
      }

      const { _id: ref } = document;
      let ops = jsonpatch.compare(
        document.isNew ? {} : original || {},
        toJSON(document.data()),
      );
      if (options.excludes.length > 0) {
        ops = ops.filter((op) => {
          const pathArray = getArrayFromPath(op.path);
          return (
            !options.excludes.some((exclude) => isPathContained(exclude, pathArray)) && options.excludes.every((exclude) => deepRemovePath(op, exclude))
          );
        });
      }

      ops = filterExclusions({ ops });

      // don't save a patch when there are no changes to save
      if (!ops.length) {
        return Promise.resolve();
      }

      // track original values if enabled
      if (options.trackOriginalValue) {
        ops.map((entry) => {
          const path = _.tail(entry.path.split('/')).join('.');
          entry.originalValue = _.get(
            document.isNew ? {} : original,
            path,
          );
        });
      }

      // if model contains encrypted fields, check if any are contained in history ops and encrypt where required
      if (options.encryptedFields) {
        ops.map((entry) => {
          const pathDotNotation = entry.path?.substring(1).replaceAll('/', '.');
          const matches = options.encryptedFields.filter((field) => {
            // if the path contains the path of an encrypted field, we need to encrypt
            if (pathDotNotation.indexOf(field) === 0) {
              return true;
            }
            // if the encrypted field path contains the entry path, we need to check if value of this is an object and if the remainder of the encrypted field path is contained, and also encrypt
            if (field.indexOf(pathDotNotation) === 0) {
              const subPath = field.substring(pathDotNotation.length + 1);
              const contained = _.get(entry.value, subPath);
              return contained;
            }
          });
          if (matches.length > 0) {
            entry.value = encryption.encryptionUtils.encryptField(entry.value, encryptionKey);
            if (options.trackOriginalValue) {
              entry.originalValue = encryption.encryptionUtils.encryptField(entry.originalValue, encryptionKey);
            }
          }
        });
      }

      let author = null;
      if (options.trackAuthor && document?.lastModifiedBy) {
        author = document.lastModifiedBy;
      }

      let clientId = null;
      if (options.trackClient && document?.clientId) {
        ({ clientId } = document);
      }

      // assemble patch data
      const data = { ops, ref, author, clientId };
      _.each(options.includes, (type, name) => {
        data[name] = document[type.from || name] || queryOptions[type.from || name];
      });

      return document.patches.create(data);
    }
  }

  schema.pre('save', function (next) {
    createPatch(this)
      .then(() => next())
      .catch(next);
  });

  schema.pre('findOneAndRemove', function (next) {
    if (!options.removePatches) {
      return next();
    }

    this.model
      .findOne(this._conditions)
      .then((original) => deletePatches(original))
      .then(() => next())
      .catch(next);
  });

  schema.pre('findOneAndUpdate', preUpdateOne);

  function preUpdateOne(next) {
    this.model
      .findOne(this._conditions)
      .then((original) => {
        if (original) this._originalId = original._id;
        original = original || new this.model({});
        this._original = toJSON(original.data());
      })
      .then(() => next())
      .catch(next);
  }

  schema.post('findOneAndUpdate', function (doc, next) {
    if (!this.options.new) {
      return postUpdateOne.call(this, {}, next);
    }

    if (this.options.new && this.options.rawResult) {
      doc = doc.value;
    }

    doc._original = this._original;
    createPatch(doc, this.options)
      .then(() => next())
      .catch(next);
  });

  function postUpdateOne(result, next) {
    if (result.nModified === 0) return next();

    let conditions;
    if (this._originalId) conditions = { _id: { $eq: this._originalId } };
    else {
      conditions = mergeQueryConditionsWithUpdate(
        this._conditions,
        this._update,
      );
    }

    this.model
      .findOne(conditions)
      .then((doc) => {
        if (!doc) return next();
        doc._original = this._original;
        return createPatch(doc, this.options);
      })
      .then(() => next())
      .catch(next);
  }

  schema.pre('updateOne', preUpdateOne);
  schema.post('updateOne', postUpdateOne);

  function preUpdateMany(next) {
    this.model
      .find(this._conditions)
      .then((originals) => {
        const originalIds = [];
        const originalData = [];
        for (const original of originals) {
          originalIds.push(original._id);
          originalData.push(toJSON(original.data()));
        }
        this._originalIds = originalIds;
        this._originals = originalData;
      })
      .then(() => next())
      .catch(next);
  }

  function postUpdateMany(result, next) {
    if (result.nModified === 0) return next();

    let conditions;
    if (this._originalIds.length === 0) {
      conditions = mergeQueryConditionsWithUpdate(
        this._conditions,
        this._update,
      );
    } else conditions = { _id: { $in: this._originalIds } };

    this.model
      .find(conditions)
      .then((docs) => Promise.all(
        docs.map((doc, i) => {
          doc._original = this._originals[i];
          return createPatch(doc, this.options);
        }),
      ))
      .then(() => next())
      .catch(next);
  }

  schema.pre('updateMany', preUpdateMany);
  schema.post('updateMany', postUpdateMany);

  schema.pre('update', function (next) {
    if (this.options.multi) {
      preUpdateMany.call(this, next);
    } else {
      preUpdateOne.call(this, next);
    }
  });
  schema.post('update', function (result, next) {
    if (this.options.many) {
      postUpdateMany.call(this, result, next);
    } else {
      postUpdateOne.call(this, result, next);
    }
  });
};

module.exports = main;
