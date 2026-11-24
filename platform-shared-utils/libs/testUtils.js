/* eslint-disable no-param-reassign */
/* eslint-disable consistent-return */
const { ObjectId } = require('mongodb');
const async = require('async');
const sinon = require('sinon');
const fs = require('fs');
const fsPromises = require('fs/promises');
const appRootDir = require('app-root-dir').get();

const BigQuery = require('./bigQuery');
const logger = require('./logger');

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
        return String.fromCharCode(
          randomNumber + (randomNumber > 26 ? 71 : 65),
        ); // add 65 for upper case, 71 (97 - 26) for lower case letters
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
    const d = new Date(
      start.getTime() + Math.random() * (end.getTime() - start.getTime()),
    );
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
  bigQueryParams: (callback) => {
    if (!callback) {
      return {
        datasetName: 'IntegrationTestsDataset',
        inputTable: process.env.TEST_INPUT_TABLE,
        outputTable: process.env.TEST_OUTPUT_TABLE,
        costsTable: process.env.TEST_COSTS_TABLE,
      };
    }

    const bigQuery = new BigQuery({ datasetName: 'IntegrationTestsDataset' });
    const params = {
      datasetName: 'IntegrationTestsDataset',
      inputTable: helpers.randomString(),
      outputTable: helpers.randomString(),
      costsTable: helpers.randomString(),
    };

    async.parallel(
      [
        // Create Input Table
        (cb) => {
          bigQuery.createTable(
            params.inputTable,
            bigQuery.inputSchema,
            null,
            cb,
          );
        },
        // Create Output Table
        (cb) => {
          bigQuery.createTable(
            params.outputTable,
            bigQuery.outputSchema,
            null,
            cb,
          );
        },
        // Create Costs Table
        (cb) => {
          bigQuery.createTable(
            params.costsTable,
            bigQuery.costsSchema,
            null,
            cb,
          );
        },
      ],
      (err) => {
        if (err) {
          logger.error(err);
          callback(err);
        } else {
          logger.debug('Tables created.');
          callback(err, params);
        }
      },
    );
  },
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
  cleanUp: (clientId, callback) => {
    if (!callback) {
      callback = clientId;
      clientId = null;
    }
    // Restore all the stubs.
    sinon.restore();
    // Clean up the DB
    const models = `${appRootDir}/models`;
    if (fs.existsSync(models)) {
      async.each(
        fs.readdirSync(models),
        (file, cb) => {
          if (file === 'signup.js' && clientId) cb();
          else if (file !== 'db.js') {
            const model = require(`${models}/${file}`); // eslint-disable-line global-require, import/no-dynamic-require
            const filter = {};
            if (clientId) {
              if (file === 'client.js') {
                filter._id = clientId;
              } else {
                filter.clientId = clientId;
              }
            }
            model.deleteMany(filter, cb);
          } else {
            cb();
          }
        },
        callback,
      );
    } else {
      callback();
    }
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
        }),
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
          equal = module.exports.areArraysOfObjectsEqual(
            object[key],
            array2[index][key],
          );
        } else if (
          !array2[index]
          || array2[index][key] === null
          || array2[index][key].toString() !== object[key].toString()
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
};

module.exports = helpers;
