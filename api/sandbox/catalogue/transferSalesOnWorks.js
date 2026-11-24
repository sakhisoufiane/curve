require('dotenv').config();
require('../models/db');
const async = require('async');
const { logger, BigQuery } = require('@curveroyaltysystems/platform-shared-utils');
const Work = require('../models/work');
const Client = require('../models/client');

const data = [
  ['6049ee5edd5673000f81b65e', '0092468'],
  ['6042282e049f5100254328e0', '0086494'],
  ['6042282e049f5100254328b5', '0086485'],
  ['6049ee5edd5673000f81b64e', '0092469'],
  ['6049eebfdd5673000f81c61f', '0093318'],
  ['6049eebddd5673000f81c5d7', '0093282'],
  ['6049ee59dd5673000f81b548', '0086918'],
  ['6049eebddd5673000f81c5cf', '0093278'],
  ['6049ee5edd5673000f81b648', '0092473'],
  ['60422850049f510025433787', '0083006'],
  ['60422850049f510025433768', '0085159'],
  ['6049eebddd5673000f81c5dd', '0093285'],
  ['60422850049f510025433796', '0083011'],
  ['6049eebbdd5673000f81c57f', '0093238'],
  ['6049eeb3dd5673000f81c442', '0078570'],
  ['6049ee5edd5673000f81b654', '0078572'],
  ['6049ef6095e3e2004bd3a47c', '0087037'],
  ['604a261f642ec9001545f60c', '0078688'],
  ['60422850049f510025433793', '0083010'],
  ['6042282e049f5100254328d3', '0083013'],
];

Client.findById('5f8ef7fd6d763b001524c783', (err, client) => {
  const bigQuery = new BigQuery({
    datasetName: client.bigQueryDataset,
    inputTable: client.bigQuerySalesTable,
    outputTable: client.bigQueryPeriodSales,
    costsTable: client.bigQueryPeriodCosts,
  });

  async.eachSeries(data, (item, cb) => {
    Work.findOne({ clientId: '5f8ef7fd6d763b001524c783', identifier: item[1] }, (err, work) => {
      if (work) {
        bigQuery.updateData(bigQuery.inputTable, { workId: item[0] }, { workId: work._id.toString() }, (err, response) => {
          console.log(response);
          cb();
        });
      } else {
        cb();
      }
    });
  }, (err) => {
    console.log(err);
    console.log('Complete');
  });
});
