require('../models/db');
const async = require('async');

const ingestSalesFile = require('./ingestSalesFile');

const SalesFile = require('../models/salesFile');
const Task = require('../models/task');

SalesFile.find({ clientId: '5eb2af3b4c4783034bd3f9a2' }).skip(34).exec((err, salesFiles) => {
  setInterval(() => {
    Task.count({ status: 'In Progress', clientId: '5eb2af3b4c4783034bd3f9a2' }, (err, count) => {
      if (count < 6) {
        const salesFile = salesFiles.shift();
        ingestSalesFile.createIngestTask(salesFile, 2, (err) => {
          if (err) {
            console.error(err);
          } else {
            console.log('Created Task');
          }
        });
      }
    });
  }, 2000);
});
