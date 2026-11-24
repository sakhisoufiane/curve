require('dotenv').config();
require('../models/db');
const async = require('async');
const Client = require('../models/client');
const SalesTemplate = require('../models/salesTemplate');
const fileManager = require('../libs/fileManager');

const clientIds = ['5d2d9f169d1f4f26150c6b6b', '5b8d5f1aebe3190f018da121', '5d07759340fd0951e9f622bf', '5ee9f433af529d28c43388c5'];
async.eachSeries(clientIds, (clientId, clientCb) => {
  SalesTemplate.find({ clientId, identification: { $exists: false } }, (err, salesTemplates) => {
    let count = 0;
    async.eachSeries(salesTemplates, (salesTemplate, cb) => {
      count += 1;
      console.log(count, '/', salesTemplates.length);
      fileManager.getFileSize(salesTemplate.file, (err, size) => {
        console.log(size);
        if (size < 10000000) {
          salesTemplate.extractExamplesLinesAndIdentifiers((err) => {
            cb();
          });
        } else {
          cb();
        }
      });
    }, clientCb);
  });
}, (err) => {
  console.log(err);
  console.log('Complete');
});
