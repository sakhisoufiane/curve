/* eslint-disable no-param-reassign */
/* eslint-disable consistent-return */
const { ObjectId } = require('mongodb');
const async = require('async');
const sinon = require('sinon');
const fs = require('fs');
const fsPromises = require('fs/promises');
const appRootDir = require('app-root-dir').get();

const path = require('path');
const rimraf = require('rimraf');
const logger = require('./logger');

function isTestFile(fileName) {
  return fileName.toLowerCase().includes('.test.');
}

function collectModelFiles(dir) {
  const out = new Set();

  if (!fs.existsSync(dir)) {
    return [...out];
  }

  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const entryPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      collectModelFiles(entryPath).forEach((p) => out.add(p));
    } else if (entry.isFile()) {
      // only .js files, skip db.js and tests
      if (entry.name.endsWith('.js') && entry.name !== 'db.js' && !isTestFile(entry.name)) {
        out.add(entryPath);
      }
    }
  }

  return [...out];
}

const helpers = {
  /**
   * Returns a random string of mix of a mix of characters from a-zA-Z
   *
   * @param {number} [stringLength] - sets the length of the string - optional
   * @returns {string} - random string of mix of characters a-zA-Z
   */
  randomString: (stringLength) => {
    const length = stringLength || Math.floor(Math.random() * 11) + 10; // default to string length of 10 - 20 characters
    const randomString = new Array(length)
      .fill()
      .map(() => {
        const randomNumber = Math.random() * 52; // 2 * 26 chars
        return String.fromCharCode(randomNumber + (randomNumber > 26 ? 71 : 65)); // add 65 for upper case, 71 (97 - 26) for lower case letters
      })
      .join('');
    return randomString;
  },
  randomFloat: () => Math.random(),
  randomInt: () => Math.floor(Math.random() * 100) + 1,
  randomId: () => new ObjectId().toString(),
  randomBoolean: () => Math.random() < 0.5,
  randomISWC: () => {
    const randomBody = Math.floor(Math.random() * 1000000000);
    const randomNumber = Math.floor(Math.random() * 9);
    return `T-${randomBody}-${randomNumber}`;
  },
  randomWorkVersionType: () => {
    const workVersionTypes = ['Original Work', 'Modification', ''];
    return workVersionTypes[Math.floor(Math.random() * 3)];
  },
  randomArray: (arrayLength) => {
    const length = arrayLength || Math.floor(Math.random() * 11) + 10; // default to random number of items (between 10 - 20)
    const array = Array(length).fill();
    return array.map(() => helpers.randomString());
  },
  randomDate: () => {
    const start = new Date('2000-01-01');
    const end = new Date('2025-01-01');
    const d = new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
    let month = `${d.getMonth() + 1}`;
    let day = `${d.getDate()}`;
    const year = d.getFullYear();
    if (month.length < 2) {
      month = `0${month}`;
    }
    if (day.length < 2) {
      day = `0${day}`;
    }
    return [year, month, day].join('-');
  },
  randomJsDate: () => new Date(helpers.randomDate()),
  randomError: () => new Error(helpers.randomString()),
  bigQueryRandomParams: () => ({
    datasetName: helpers.randomString(),
    inputTable: helpers.randomString(),
    outputTable: helpers.randomString(),
    costsTable: helpers.randomString(),
  }),
  randomMappingsArray: (arrayLength) => {
    const length = arrayLength || Math.floor(Math.random() * 11) + 10; // default to random number of items (between 10 - 20)
    const mappingsArray = new Array(length).fill();
    return mappingsArray.map(() => ({
      name: helpers.randomString(),
      map: helpers.randomString(),
    }));
  },
  /**
   * Cleans up test data and stubs after test execution.
   *
   * This function performs two main cleanup operations:
   * 1. Restores all Sinon stubs that were created during testing
   * 2. Deletes test data from database models based on the provided clientId filter
   *
   * @param {string|null} [clientId] - Optional client ID to filter deletion. If provided,
   *   only records associated with this client will be deleted. If null/undefined,
   *   all records in the models will be deleted.
   * @param {Function} [callback] - Callback function called when cleanup is complete.
   *   If not provided, clientId parameter is treated as the callback and clientId is set to null.
   *
   * @example
   * // Clean up all test data
   * cleanUp(() => {
   *   console.log('Cleanup complete');
   * });
   *
   * @example
   * // Clean up data for specific client
   * cleanUp('client123', (err) => {
   *   if (err) console.error('Cleanup failed:', err);
   *   else console.log('Cleanup complete for client123');
   * });
   */
  cleanUp: (clientId, callback) => {
    if (!callback) {
      callback = clientId;
      clientId = null;
    }
    // Restore all the stubs.
    sinon.restore();
    // Clean up the DB
    const modelsDir = `${appRootDir}/models`;

    if (!fs.existsSync(modelsDir)) return callback();

    const files = collectModelFiles(modelsDir);

    async.each(
      files,
      (filePath, cb) => {
        // If clientId is passed we don't want it to delete anything from signup since it doesn't have a clientId
        if (clientId && path.basename(filePath) === 'signup.js') return cb();

        // dynamical require
        const model = require(filePath); // eslint-disable-line global-require, import/no-dynamic-require

        // only act on mongoose models (heuristic: has deleteMany function)
        if (!model || typeof model.deleteMany !== 'function') return cb();

        const filter = {};
        if (clientId) {
          if (path.basename(filePath) === 'client.js') filter._id = clientId;
          else filter.clientId = clientId;
        }

        model.deleteMany(filter)
          .then(() => cb())
          .catch((err) => {
            logger.error(`Error while deleting model with filter ${JSON.stringify(filter)} `, err);
            cb(err);
          });
      },
      callback
    );
  },
  cleanUpAsync: async (clientId) => {
    const modelsDir = `${appRootDir}/models`;
    try {
      const files = await fsPromises.readdir(modelsDir);
      await Promise.all(
        files.map((file) => {
          if (file === 'db.js') return;

          // If clientId is passed we don't want it to delete anything from signup since it doesn't have a clientId
          if (file === 'signup.js' && clientId) return;

          if (isTestFile(file)) return;

          const model = require(`${modelsDir}/${file}`); // eslint-disable-line global-require, import/no-dynamic-require
          const filter = {};
          if (clientId) {
            if (file === 'client.js') {
              filter._id = clientId;
            } else {
              filter.clientId = clientId;
            }
          }
          return model.deleteMany(filter);
        })
      );
    } catch (e) {
      logger.error(e);
    }
  },
  // This used to compare array of objects after they're saved in the DB
  // Usually some extra fields are added to the saved one, making the comparison tricky
  // array1 should be the pre save one
  // array2 should be the post save one
  areArraysOfObjectsEqual: (array1, array2) => {
    let equal = true;
    array1.map((object, index) => {
      for (const key in object) {
        if (Array.isArray(object[key])) {
          equal = module.exports.areArraysOfObjectsEqual(object[key], array2[index][key]);
        } else if (
          !array2[index] ||
          array2[index][key] === null ||
          array2[index][key].toString() !== object[key].toString()
        ) {
          equal = false;
        }
      }
    });
    return equal;
  },

  makeTmpDir: (tmpDir) => {
    if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir);
  },

  emptyTmpDir: (tmpDir) => rimraf.sync(path.join(tmpDir, '*'))
};

module.exports = helpers;
