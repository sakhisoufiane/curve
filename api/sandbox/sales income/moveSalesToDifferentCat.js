require('dotenv').config();
require('../models/db');
const { ObjectId } = require('mongodb');
const async = require('async');
const Client = require('../models/client');
const Release = require('../models/release');
const BigQuery = require('../libs/bigQuery');

const data = [['600b3d906bcf2300786b0274', '600b3d906bcf2300786b0256'],
  ['600b3d906bcf2300786b01a9', '600b3d916bcf2300786b0329'],
  ['600b3d906bcf2300786b01f1', '600b3d906bcf2300786b0200'],
  ['600b3d906bcf2300786b023d', '600b3d906bcf2300786b022c'],
  ['600b3d906bcf2300786b01e8', '600b3d906bcf2300786b01cf'],
  ['600b3d906bcf2300786b0293', '600b3d906bcf2300786b0284'],
  ['600b3d906bcf2300786b01dd', '600b3d906bcf2300786b01cf'],
  ['600b3d906bcf2300786b024a', '600b3d906bcf2300786b022c'],
  ['600b3d916bcf2300786b03be', '600b3d916bcf2300786b03b3'],
  ['6006ff2d56841c01c19cd9a4', '600b3d936bcf2300786b05c5'],
  ['600b3d916bcf2300786b0417', '600b3d916bcf2300786b0416'],
  ['600b3d926bcf2300786b0429', '600b3d926bcf2300786b0423'],
  ['600b3d926bcf2300786b042a', '600b3d926bcf2300786b0435'],
  ['600b3d926bcf2300786b0419', '600b3d926bcf2300786b0422'],
  ['600b3d916bcf2300786b03e3', '600b3d916bcf2300786b03d9'],
  ['600b3d916bcf2300786b02d5', '600b3d906bcf2300786b02c8'],
  ['600b3d926bcf2300786b0459', '600b3d926bcf2300786b0452'],
  ['600b3d916bcf2300786b03c9', '600b3d916bcf2300786b03b3'],
  ['600b3d926bcf2300786b045f', '600b3d926bcf2300786b045a'],
  ['600b3d926bcf2300786b04fb', '600b3d936bcf2300786b0652'],
  ['600b3d926bcf2300786b0534', '600b3d926bcf2300786b0533'],
  ['600b3d926bcf2300786b0536', '600b3d926bcf2300786b0533'],
  ['600b3d926bcf2300786b0535', '600b3d926bcf2300786b0533'],
  ['600b3d926bcf2300786b0537', '600b3d926bcf2300786b0533'],
  ['600b3d936bcf2300786b064c', '600b3d936bcf2300786b0652'],
  ['600b3d936bcf2300786b0627', '600b3d8f6bcf2300786b00f2'],
  ['6018838108313d0016600424', '6018838108313d0016600423'],
  ['6018838108313d0016600425', '6018838108313d0016600423'],
  ['600b3d936bcf2300786b0666', '600b3d936bcf2300786b0653'],
  ['602d514baa42db001be41007', '600b3d926bcf2300786b0460'],
  ['602d7abb593d600015d86b8c', '600b3d906bcf2300786b0200'],
  ['6018837f08313d0016600314', '6018837e08313d0016600285']];

// Client.findById("5dea74537838047851a21d99", function(err, client) {
// let bigQuery = new BigQuery({ datasetName: client.bigQueryDataset, inputTable: client.bigQuerySalesTable, outputTable: client.bigQueryPeriodSales, costsTable: client.bigQueryPeriodCosts });
// async.eachSeries(data, function(line, cb) {
// let query = "UPDATE `curve-1578825897852.AnthemEntertainmentProduction.AnthemEntertainmentProductionSales2` SET releaseId = '" + line[1] + "' WHERE releaseId = '" + line[0] + "'";
// bigQuery.query(query, function(err, res) {
// console.log(res);
// cb();
// });
// }, function(err) {
// console.log("Complete");
// });
// });

const releaseIds = ['600b3d906bcf2300786b0274',
  '600b3d906bcf2300786b01a9',
  '600b3d906bcf2300786b01f1',
  '600b3d906bcf2300786b023d',
  '600b3d906bcf2300786b01e8',
  '600b3d906bcf2300786b0293',
  '600b3d906bcf2300786b01dd',
  '600b3d906bcf2300786b024a',
  '600b3d916bcf2300786b03be',
  '6006ff2d56841c01c19cd9a4',
  '600b3d916bcf2300786b0417',
  '600b3d926bcf2300786b0429',
  '600b3d926bcf2300786b042a',
  '600b3d926bcf2300786b0419',
  '600b3d916bcf2300786b03e3',
  '600b3d916bcf2300786b02d5',
  '600b3d926bcf2300786b0459',
  '600b3d916bcf2300786b03c9',
  '600b3d926bcf2300786b045f',
  '600b3d926bcf2300786b04fb',
  '600b3d926bcf2300786b0534',
  '600b3d926bcf2300786b0536',
  '600b3d926bcf2300786b0535',
  '600b3d926bcf2300786b0537',
  '600b3d936bcf2300786b064c',
  '600b3d936bcf2300786b0627',
  '6018838108313d0016600424',
  '6018838108313d0016600425',
  '600b3d936bcf2300786b0666',
  '602d514baa42db001be41007',
  '602d7abb593d600015d86b8c',
  '6018837f08313d0016600314'];

Release.deleteOne({ _id: { $in: releaseIds.map((id) => ObjectId(id)) } }, (err, res) => {
  console.log(res);
});
