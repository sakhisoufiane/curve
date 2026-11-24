/* eslint-disable guard-for-in */
/* eslint-disable no-await-in-loop */
const moment = require('moment');
const { eachSeries } = require('async');
const appRootDir = require('app-root-dir').get();
const { MongoClient, ObjectId } = require('mongodb');
const { logger, databaseUtils } = require('@curveroyaltysystems/platform-shared-utils');

const User = require('../../../models/user');
const WriteCsv = require('../../writeCsv/writeCsvObject');

const filedsToIgnore = ['lastModifiedBy', 'createdBy', 'valid', 'status', 'clientId', 'partitionNo', 'validationErrors', 'setupStage', 'platoon/files', 'contactEmail', 'paymentEmail', 'publicLink', 'reportedLines', 'reportedStatus'];

const AuditReport = this;

/**
 * Generates a report of all the changes made to every model in between the two specific dates
 * @param {Object} reportId, clientId, startDate, endDate - Parameters
 */
// eslint-disable-next-line no-async-promise-executor
AuditReport.generateReport = async ({ reportId, clientId, startDate, endDate }) => {
  // Connect to mongodb through basic mongodb connection
  const client = new MongoClient(databaseUtils.getMongoUrl('auth'), databaseUtils.getMongoConnectOpts());
  const mongoClient = await client.connect();
  logger.info('Connected to MongoDB');
  const db = mongoClient.db(databaseUtils.getMongoDBName());

  // Setup CSV headers
  const headers = ['User', 'Model', 'ID', 'Action', 'Field', 'Old Value', 'New Value', 'Date'];
  // Create CSV Writer
  const fileName = `audit-report-${reportId}-${moment().format('YYYYMMDDHHmmSSsss')}.csv`;
  const outputLocation = `${appRootDir}/tmp/${fileName}`;
  const writeCsv = new WriteCsv({ headers, outputLocation });

  const userMappings = {};

  // Load each of the model
  const collections = ['track_patches', 'release_patches', 'work_patches', 'payee_patches', 'contract_patches', 'period_patches', 'statement_patches', 'sales_file_patches', 'sales_template_patches', 'company_patches', 'composer_patches', 'publisher_patches', 'contract_term_group_patches', 'territory_group_patches', 'cost_patches', 'cwr_delivery_patches', 'delivery_partner_patches', 'delivery_schedule_patches', 'payment_group_patches', 'payment_patches', 'report_patches', 'user_patches'];
  // Map to the correct format
  await eachSeries(collections, async (collection) => {
    // Load the collection
    const Model = db.collection(collection);
    // Load all the changes
    const filter = {
      clientId: new ObjectId(clientId),
    };
    // Add timestamp to filter if they exist
    if (startDate || endDate) {
      filter.timestamp = {};
    }
    if (startDate) {
      filter.timestamp.$gte = new Date(startDate);
    }
    if (endDate) {
      const structuredEndDate = new Date(endDate);
      structuredEndDate.setHours(23, 59, 59, 999);
      filter.timestamp.$lte = structuredEndDate;
    }

    const count = await Model.countDocuments(filter);
    logger.debug(`${collection} Count: ${count}`);

    await queryData({ Model, collection, filter, userMappings, count, offset: 0, writeCsv });
  });

  await new Promise((resolve) => { writeCsv.write(() => { resolve(); }); });

  logger.info(`Finished writing to ${outputLocation}`);

  return fileName;
};

// eslint-disable-next-line no-async-promise-executor
const queryData = async ({ Model, collection, filter, userMappings, count, offset, writeCsv }) => {
  const limit = 10000;
  logger.debug(`Querying ${collection} | Offset: ${offset} | Count: ${count}`);
  const changes = await Model.find(filter).sort('_id').limit(limit).skip(offset)
    .toArray();
  // Map to the correct format
  const model = collection.split('_')[0];
  const mappedChanges = [];

  for (const change of changes) {
    if (change?.ops && change?.author) {
      const changedArrays = {};
      if (!userMappings[change.author.toString()]) {
        const user = await User.findById(change.author).lean();
        if (user) {
          userMappings[user._id.toString()] = { email: user.email, internal: user.internal };
        } else {
          userMappings[change.author.toString()] = { email: change.author, internal: false };
        }
      }

      const isCreate = checkIfCreate(change);
      if (isCreate && !userMappings[change.author.toString()]?.internal) {
        let outputObject = constructOutputObject(change);
        outputObject = removeCommasFromValue(outputObject);
        // Output as a single update
        const mappedChange = [
          userMappings[change.author.toString()] ? userMappings[change.author.toString()].email : change.author,
          model,
          change.ref,
          'create',
          '',
          '',
          JSON.stringify(outputObject),
          moment(change.timestamp).format('YYYY-MM-DD HH:mm:ss'),
        ];
        mappedChanges.push(mappedChange);
      } else {
        for (const op of change.ops) {
          // remove the first '/' from the field name
          const field = op.path.replace('/', '');
          let { value, originalValue } = op;
          // Check if value is an object
          if (typeof value === 'object') { value = JSON.stringify(value); }
          if (typeof originalValue === 'object') { originalValue = JSON.stringify(originalValue); }
          if (
            !filedsToIgnore.includes(field)
            && !field.includes('validation')
            && !field.toLowerCase().includes('publiclink')
            && !userMappings[change.author.toString()]?.internal
            && (model !== 'sales' || (model === 'sales' && field !== 'locked'))
          ) {
            // if there's a second '/', then it's an array. Let's get all the changes to the array to then display them in one line
            if (field.includes('/')) {
              const [arrayField, arrayIndex, arrayObjectProperty] = field.split('/');
              if (!changedArrays[arrayField]) { changedArrays[arrayField] = { from: [], to: [] }; }
              if (arrayObjectProperty) {
                if (originalValue) {
                  changedArrays[arrayField].from.push(`${arrayField}#${arrayIndex + 1}: ${arrayObjectProperty}: ${originalValue}`);
                }
                if (value) {
                  changedArrays[arrayField].to.push(`${arrayField}#${arrayIndex + 1}: ${arrayObjectProperty}: ${value}`);
                }
              } else {
                if (originalValue) {
                  changedArrays[arrayField].from.push(originalValue);
                }
                if (value) {
                  changedArrays[arrayField].to.push(value);
                }
              }
            } else {
              const mappedChange = [userMappings[change.author.toString()] ? userMappings[change.author.toString()].email : change.author, model, change.ref, op.op, field, originalValue, value, moment(change.timestamp).format('YYYY-MM-DD HH:mm:ss')];
              mappedChanges.push(mappedChange);
            }
          }
        }
        // Add the changes arrays ops
        for (const array in changedArrays) {
          const mappedChange = [userMappings[change.author.toString()] ? userMappings[change.author.toString()].email : change.author, model, change.ref, 'replace', array, changedArrays[array].from, changedArrays[array].to, moment(change.timestamp).format('YYYY-MM-DD HH:mm:ss')];
          mappedChanges.push(mappedChange);
        }
      }
    }
  }

  if (mappedChanges.length > 0) {
    // Add to CSV
    await new Promise((resolve) => { writeCsv.addData(mappedChanges, async () => { resolve(); }); });
    // Call function if there number of returned objects is equal to the limit
    if (changes.length === limit) {
      await queryData({ Model, collection, filter, userMappings, count, offset: offset + limit, writeCsv });
    }
  }
};

const checkIfCreate = (change) => {
  // Check if all ops.op are equal to 'add'
  const allOpsAreAdd = change.ops.every((op) => op.op === 'add');
  // Check if there is one item within ops.op.path that is equal to '/clientId'
  const clientIdExists = change.ops.some((op) => op.path === '/clientId');
  return allOpsAreAdd && clientIdExists;
};

const constructOutputObject = (change) => {
  const outputObject = {};
  if (change.ops) {
    change.ops.forEach((op) => {
      outputObject[op.path.replace('/', '')] = op.value;
    });
  }
  return outputObject;
};

const removeCommasFromValue = (value) => {
  // Check if value is an object
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return value;
  }
  const outputValue = {};
  Object.keys(value).forEach((key) => {
    let newValue = value[key];
    if (typeof newValue === 'string') {
      newValue = newValue.replace(/,/g, '');
    }
    outputValue[key] = newValue;
  });
  return outputValue;
};

/**
 * Generates a report of all the changes made to every model in between the two specific dates
 * @param {Object} Report - Parameters
 */
const auditReport = {
  run: async (report) => {
    const { filters } = report;
    // Only use first filter from array
    const filter = filters[0];
    const outputReport = await AuditReport.generateReport({ reportId: report._id.toString(), clientId: report.clientId, startDate: filter?.saleDateStart, endDate: filter?.saleDateEnd });
    return outputReport;
  },
};

module.exports = auditReport;
