require('dotenv').config();
require('../../models/db');
const { BigQuery } = require('@google-cloud/bigquery');
const { ObjectId } = require('mongodb');
const _ = require('lodash');
const async = require('async');
const moment = require('moment');
const Client = require('../../models/client');

const privateKey = (process.env.BQ_private_key) ? process.env.BQ_private_key.replace(/\\n/g, '\n') : '';
const bgClientOptions = { projectId: process.env.BQ_project_id, credentials: { client_email: process.env.BQ_client_email, private_key: privateKey,},};
let bigQueryClient = new BigQuery(bgClientOptions);
let missingDataset = 0;
let missingTable = 0;
let columnExists = 0;
let schemaUpdated = 0;
let noFields = 0;
let errored = 0;

Client.find({}).sort({ createdAt: 1 }).exec((err, clients) => { //   _id: {$nin: []}   _id: ObjectId('6076f9b07b256100d9601bfd')
  async.eachSeries(clients, (client, cb) => {
    console.log('\n===', client._id, '---', moment(client.createdAt).format('DD/MM/YYYY'), '---', client.name, '---', client.bigQueryDataset, '>', client.bigQueryPeriodCosts);
    updateSchema(client.bigQueryDataset, client.bigQueryPeriodCosts, costsSchema, cb)
  }, (err) => {
    if (err) { console.log(err); }
    console.log({ missingDataset, missingTable, columnExists, schemaUpdated, noFields, errored });
    console.log('Complete');
    process.exit(0);
  });
});


const updateSchema = async function (dataset, tableName, schema, callback) {
  try {
    // Check if dataset exists
    const [datasetExists] = await bigQueryClient.dataset(dataset).exists();
    if (!datasetExists) {
      console.log('=========== dataset does not exist');
      missingDataset += 1;
      return callback();
    }

    // Check if table exists
    const [tableExists] = await bigQueryClient.dataset(dataset).table(tableName).exists();
    if (!tableExists) {
      console.log('=========== table does not exist');
      missingTable += 1;
      return callback();
    }

    // Get original metadata
    const [metadata] = await bigQueryClient.dataset(dataset).table(tableName).getMetadata();
    const existingFields = metadata?.schema?.fields;
    // console.log('metadata'); // console.log(JSON.stringify(metadata, null, 4)); // console.log(JSON.stringify(metadata?.schema, null, 4));// console.log(schema);

    if (existingFields && _.isArray(existingFields)) {
      const test = _.find(existingFields, { name: 'contractCurrency' });
      if (test) {
        console.log('=========== contractCurrency exists in schema');
        columnExists += 1;
        return callback();
      } else {
        // Set schema against metadata
        metadata.schema = schema;
        // Set metadata to table
        const [result] = await bigQueryClient.dataset(dataset).table(tableName).setMetadata(metadata); // COMMENTED FOR DRY RUN   
        schemaUpdated += 1;
        console.log('=========== Updated Schema');
        return callback(null);
      }
    } else {
      console.log('=========== No fields in schema');
      noFields += 1;
      return callback();
    }
  } catch (err) {
    console.log('errored', err?.errors[0]?.message);
    errored += 1;
    callback();
  }
};

// Note mode=Required removed from periodId and contractId to allow run in staging where schema has drifted from data
// Sanity check before running in production please Tom
const costsSchema = [
  { name: 'periodId', type: 'STRING'},
  { name: 'contractId', type: 'STRING' },
  { name: 'costId', type: 'STRING' },
  { name: 'releaseId', type: 'STRING' },
  { name: 'trackId', type: 'STRING' },
  { name: 'contractName', type: 'STRING' },
  { name: 'type', type: 'STRING' },
  { name: 'name', type: 'STRING' },
  { name: 'invoiceNo', type: 'STRING' },
  { name: 'description', type: 'STRING' },
  { name: 'date', type: 'DATE' },
  { name: 'amount', type: 'FLOAT' },
  { name: 'territory', type: 'STRING' },
  { name: 'objectPercentage', type: 'FLOAT' },
  { name: 'rechargeRate', type: 'FLOAT' },
  { name: 'calculationInput', type: 'FLOAT' },
  { name: 'calculationOutput', type: 'FLOAT' },
  // Contract Currency
  { name: 'contractCurrency', type: 'STRING', mode: 'NULLABLE' },
  { name: 'contractCurrencyAmount', type: 'FLOAT' },
  { name: 'contractCurrencyCalculationInput', type: 'FLOAT' },
  { name: 'contractCurrencyCalculationOutput', type: 'FLOAT' },
  // Catalogue Values
  { name: 'catalogueReleaseTitle', type: 'STRING' },
  { name: 'catalogueReleaseVersion', type: 'STRING' },
  { name: 'catalogueReleaseArtist', type: 'STRING' },
  { name: 'catalogueReleaseLabel', type: 'STRING' },
  { name: 'catalogueLabel', type: 'STRING' },
  { name: 'catalogueCatNo', type: 'STRING' },
  { name: 'catalogueReleaseForeignId', type: 'STRING' },
  { name: 'catalogueBarcode', type: 'STRING' },
  { name: 'catalogueTrackTitle', type: 'STRING' },
  { name: 'catalogueTrackVersion', type: 'STRING' },
  { name: 'catalogueTrackArtist', type: 'STRING' },
  { name: 'catalogueTrackLabel', type: 'STRING' },
  { name: 'catalogueIsrc', type: 'STRING' },
  { name: 'catalogueTrackForeignId', type: 'STRING' },
];